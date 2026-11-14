// AI-assisted: see docs/AI_LOG.md #37
// Lógica pura de los pagos con Mercado Pago Checkout Pro. No accede a
// Firestore ni a la red: la usan los manejadores de index.js y las pruebas.
//
// Fuente de verdad de los importes: el desglose que la app guardó al
// finalizar el viaje y que firestore.rules verificó (fare, commission,
// commissionRate, driverEarnings, tip). El backend no recalcula tarifas ni
// confía en el monto que envía la app.
'use strict';

const CURRENCY = 'COP';
const PAYMENT_METHOD_MERCADOPAGO = 'mercadopago';

const TRIP_STATUS = Object.freeze({
  COMPLETED: 'completed',
  PAID: 'paid',
});

// Estado del pago en el viaje (mismos valores que PAYMENT_STATUS de la app).
const PAYMENT_STATUS = Object.freeze({
  APPROVED: 'approved',
  PENDING: 'pending',
  REJECTED: 'rejected',
});

// Asiento del saldo del conductor por un viaje cobrado con la pasarela:
// la plataforma recibió el dinero y le debe al conductor su ganancia neta.
const GATEWAY_LEDGER_TYPE = 'gateway_earning';

// Vigencia de una preferencia de pago.
const PREFERENCE_TTL_MS = 30 * 60 * 1000;

class PaymentError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

function isFiniteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

function hasStoredFareBreakdown(trip) {
  return Boolean(
    trip &&
      Number.isInteger(trip.fare) &&
      trip.fare > 0 &&
      Number.isInteger(trip.tip) &&
      trip.tip >= 0 &&
      isFiniteNumber(trip.commission) &&
      isFiniteNumber(trip.commissionRate) &&
      isFiniteNumber(trip.driverEarnings)
  );
}

// Monto a cobrar al pasajero en pesos enteros: tarifa + propina.
function getChargeAmount(trip) {
  if (!hasStoredFareBreakdown(trip)) {
    throw new PaymentError(
      'failed-precondition',
      'El viaje no tiene el desglose de tarifa guardado.'
    );
  }

  return trip.fare + trip.tip;
}

/**
 * Comprueba que el conductor puede iniciar el cobro con Mercado Pago.
 * Lanza PaymentError con un código de HttpsError si no es así.
 */
function assertCheckoutAllowed(trip, driverId, requestedAmount) {
  if (!trip) {
    throw new PaymentError('not-found', 'El viaje no existe.');
  }
  if (typeof driverId !== 'string' || trip.driverId !== driverId) {
    throw new PaymentError('permission-denied', 'Este viaje no está asignado a tu cuenta.');
  }
  if (trip.paymentMethod !== PAYMENT_METHOD_MERCADOPAGO) {
    throw new PaymentError('failed-precondition', 'Este viaje no se paga con Mercado Pago.');
  }
  if (trip.status === TRIP_STATUS.PAID || trip.paymentStatus === PAYMENT_STATUS.APPROVED) {
    throw new PaymentError('already-exists', 'El pago de este viaje ya fue aprobado.');
  }
  if (trip.status !== TRIP_STATUS.COMPLETED) {
    throw new PaymentError('failed-precondition', 'Solo se puede cobrar un viaje finalizado.');
  }

  const amount = getChargeAmount(trip);

  // El monto lo fija el servidor; el que envía la app solo se compara.
  if (requestedAmount !== undefined && requestedAmount !== amount) {
    throw new PaymentError(
      'invalid-argument',
      'El monto no coincide con la tarifa registrada del viaje.'
    );
  }

  return amount;
}

const CATEGORY_LABELS = Object.freeze({ economy: 'Económico', xl: 'XL', premium: 'Premium' });

/**
 * Cuerpo de POST /checkout/preferences.
 * external_reference = tripId permite asociar el pago al viaje.
 */
function buildPreferenceBody({ tripId, trip, driverId, amount, notificationUrl, returnUrl, now }) {
  const category = CATEGORY_LABELS[trip.category] || 'UberClone';
  const from = new Date(now);
  const to = new Date(now + PREFERENCE_TTL_MS);

  const body = {
    items: [
      {
        id: tripId,
        title: `Viaje UberClone ${category}`,
        description: 'Tarifa del viaje y propina (modo de prueba)',
        quantity: 1,
        currency_id: CURRENCY,
        unit_price: amount,
      },
    ],
    external_reference: tripId,
    metadata: { trip_id: tripId, driver_id: driverId },
    notification_url: notificationUrl,
    expires: true,
    expiration_date_from: from.toISOString(),
    expiration_date_to: to.toISOString(),
  };

  if (returnUrl) {
    body.back_urls = { success: returnUrl, pending: returnUrl, failure: returnUrl };
    body.auto_return = 'approved';
  }

  return body;
}

/**
 * Traduce el estado de un pago de Mercado Pago al estado del viaje.
 * null: estados que este módulo no procesa (reembolsos, contracargos).
 */
function mapPaymentStatus(mpStatus) {
  switch (mpStatus) {
    case 'approved':
      return PAYMENT_STATUS.APPROVED;
    case 'pending':
    case 'in_process':
    case 'authorized':
      return PAYMENT_STATUS.PENDING;
    case 'rejected':
    case 'cancelled':
      return PAYMENT_STATUS.REJECTED;
    default:
      return null;
  }
}

// transaction_amount puede llegar como número o como texto ("24.50").
function amountsMatch(paymentAmount, expected) {
  const value = Number(paymentAmount);
  return Number.isFinite(value) && Math.round(value * 100) === expected * 100;
}

/**
 * Valida el pago consultado en la API contra el viaje. Devuelve null si es
 * coherente o el motivo del rechazo.
 */
function getPaymentMismatch(payment, trip, tripId) {
  if (!payment || payment.external_reference !== tripId) return 'external_reference';
  if (!trip) return 'trip_not_found';
  if (trip.paymentMethod !== PAYMENT_METHOD_MERCADOPAGO) return 'payment_method';
  if (payment.currency_id !== CURRENCY) return 'currency';
  if (!hasStoredFareBreakdown(trip)) return 'fare_breakdown';
  if (!amountsMatch(payment.transaction_amount, trip.fare + trip.tip)) return 'amount';
  if (payment.metadata?.driver_id && payment.metadata.driver_id !== trip.driverId) return 'driver';
  return null;
}

function gatewayLedgerEntryId(tripId) {
  return `mp_${tripId}`;
}

/**
 * Asiento del saldo por un viaje cobrado con la pasarela. Misma forma que el
 * asiento de efectivo (cashAmount, commission, driverEarnings) para que la
 * consulta de totales use el mismo índice compuesto; cashAmount es 0 porque
 * el conductor no recibió efectivo. amount = lo que la plataforma le debe.
 * createdAt lo añade quien escribe, con la hora del servidor.
 */
function buildGatewayEarningEntry(tripId, trip, paymentId) {
  return {
    type: GATEWAY_LEDGER_TYPE,
    tripId,
    status: 'pending',
    currency: CURRENCY,
    paymentMethod: PAYMENT_METHOD_MERCADOPAGO,
    paymentId: String(paymentId),
    fare: trip.fare,
    tip: trip.tip,
    cashAmount: 0,
    commission: trip.commission,
    commissionRate: trip.commissionRate,
    driverEarnings: trip.driverEarnings,
    amount: trip.driverEarnings,
  };
}

/**
 * Cambios que hay que aplicar al viaje para un pago ya validado.
 * Idempotente y sin retrocesos: un viaje aprobado nunca vuelve a pendiente
 * ni a rechazado, y un segundo pago aprobado no se aplica.
 * @returns {{action: string, tripUpdate?: object, createLedger?: boolean}}
 */
function planPaymentUpdate(trip, paymentId, mappedStatus) {
  const id = String(paymentId);

  if (mappedStatus === null) {
    return { action: 'ignored_status' };
  }

  if (trip.status === TRIP_STATUS.PAID || trip.paymentStatus === PAYMENT_STATUS.APPROVED) {
    if (String(trip.paymentId) === id) {
      return { action: 'already_applied', createLedger: mappedStatus === PAYMENT_STATUS.APPROVED };
    }
    return { action: mappedStatus === PAYMENT_STATUS.APPROVED ? 'duplicate_payment' : 'ignored_after_approval' };
  }

  if (trip.status !== TRIP_STATUS.COMPLETED) {
    return { action: 'trip_not_completed' };
  }

  if (mappedStatus === PAYMENT_STATUS.APPROVED) {
    return {
      action: 'approved',
      tripUpdate: { status: TRIP_STATUS.PAID, paymentStatus: PAYMENT_STATUS.APPROVED, paymentId: id },
      setPaidAt: true,
      createLedger: true,
    };
  }

  // Pendiente o rechazado: no cambia el estado del viaje (sigue completed,
  // se puede volver a intentar el cobro).
  if (trip.paymentStatus === mappedStatus && String(trip.paymentId) === id) {
    return { action: 'already_applied' };
  }

  return {
    action: mappedStatus,
    tripUpdate: { paymentStatus: mappedStatus, paymentId: id },
  };
}

module.exports = {
  CURRENCY,
  GATEWAY_LEDGER_TYPE,
  PAYMENT_METHOD_MERCADOPAGO,
  PAYMENT_STATUS,
  PREFERENCE_TTL_MS,
  PaymentError,
  TRIP_STATUS,
  amountsMatch,
  assertCheckoutAllowed,
  buildGatewayEarningEntry,
  buildPreferenceBody,
  gatewayLedgerEntryId,
  getChargeAmount,
  getPaymentMismatch,
  mapPaymentStatus,
  planPaymentUpdate,
};
