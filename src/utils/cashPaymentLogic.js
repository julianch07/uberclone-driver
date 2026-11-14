// AI-assisted: see docs/AI_LOG.md #29
// Lógica pura de los cobros en efectivo, la comisión adeudada y el saldo
// del conductor. No accede a Firestore.
//
// Fuente de verdad: el desglose guardado al finalizar el viaje (#27):
// fare, commission (20 % de la tarifa, redondeo a la mitad hacia arriba en
// pesos enteros), commissionRate, driverEarnings y tip. Aquí no se recalcula
// ningún importe: se copian, de modo que el historial no cambia aunque
// cambien los parámetros de tarifa.
import { CURRENCY } from '../config/pricing';
import { TRIP_STATUS } from './tripLogic';
import { PAYMENT_METHOD } from './tripRequestLogic';

// Estado del pago del viaje. 'cash' lo registra el conductor; 'approved',
// 'pending' y 'rejected' quedan reservados para la pasarela digital
// (módulo de Mercado Pago), que los escribirá desde un backend.
export const PAYMENT_STATUS = Object.freeze({
  CASH: 'cash',
  APPROVED: 'approved',
  PENDING: 'pending',
  REJECTED: 'rejected',
});

// Movimientos del saldo del conductor (drivers/{uid}/ledgerEntries).
export const LEDGER_ENTRY_TYPE = Object.freeze({
  // Comisión que el conductor debe a la plataforma por un viaje en efectivo.
  CASH_COMMISSION: 'cash_commission',
  // AI-assisted: see docs/AI_LOG.md #37
  // Ganancia neta que la plataforma debe al conductor por un viaje cobrado
  // con Mercado Pago. Solo la crea el backend al confirmar el pago.
  GATEWAY_EARNING: 'gateway_earning',
});

export const LEDGER_ENTRY_STATUS = Object.freeze({
  PENDING: 'pending',
  // Reservado: solo un backend administrativo podrá marcar una comisión como
  // liquidada. El conductor no puede hacerlo (firestore.rules).
  SETTLED: 'settled',
});

// ID determinista: un viaje solo puede generar un asiento de comisión.
export function cashLedgerEntryId(tripId) {
  return `cash_${tripId}`;
}

function isFiniteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

// El viaje guardó su desglose al finalizar (módulo de tarifas).
export function hasStoredFareBreakdown(trip) {
  return Boolean(
    trip &&
      isFiniteNumber(trip.fare) &&
      isFiniteNumber(trip.commission) &&
      isFiniteNumber(trip.commissionRate) &&
      isFiniteNumber(trip.driverEarnings) &&
      isFiniteNumber(trip.tip)
  );
}

export function isFinishedTrip(trip) {
  return (
    trip?.status === TRIP_STATUS.COMPLETED || trip?.status === TRIP_STATUS.PAID
  );
}

// El conductor puede confirmar el efectivo de un viaje finalizado, propio,
// pagado en efectivo, sin pago registrado y con el desglose guardado.
export function canRegisterCashPayment(trip, driverId) {
  return (
    typeof driverId === 'string' &&
    driverId.length > 0 &&
    trip?.driverId === driverId &&
    trip.status === TRIP_STATUS.COMPLETED &&
    trip.paymentMethod === PAYMENT_METHOD.CASH &&
    trip.paymentStatus == null &&
    hasStoredFareBreakdown(trip)
  );
}

export function isCashPaymentRegistered(trip, driverId) {
  return (
    typeof driverId === 'string' &&
    trip?.driverId === driverId &&
    trip.status === TRIP_STATUS.PAID &&
    trip.paymentStatus === PAYMENT_STATUS.CASH
  );
}

/**
 * Asiento de comisión de un viaje en efectivo.
 * - cashAmount: efectivo recibido del pasajero (tarifa + propina).
 * - commission / amount: lo que el conductor debe a la plataforma.
 * - driverEarnings: ganancia neta del conductor (no es el efectivo recibido).
 * createdAt lo añade el servicio con la hora del servidor.
 */
export function buildCashCommissionEntry(tripId, trip) {
  if (!hasStoredFareBreakdown(trip)) {
    throw new Error(
      'El viaje no tiene el desglose de tarifa guardado; no se puede registrar el cobro.'
    );
  }

  return {
    type: LEDGER_ENTRY_TYPE.CASH_COMMISSION,
    tripId,
    status: LEDGER_ENTRY_STATUS.PENDING,
    currency: CURRENCY,
    fare: trip.fare,
    tip: trip.tip,
    cashAmount: trip.fare + trip.tip,
    commission: trip.commission,
    commissionRate: trip.commissionRate,
    driverEarnings: trip.driverEarnings,
    amount: trip.commission,
  };
}

// Resumen del cobro para la interfaz, a partir del viaje.
export function getCashCollectionSummary(trip) {
  if (!hasStoredFareBreakdown(trip)) {
    return null;
  }

  return {
    cashAmount: trip.fare + trip.tip,
    fare: trip.fare,
    tip: trip.tip,
    commission: trip.commission,
    driverEarnings: trip.driverEarnings,
  };
}

function hasLedgerAmounts(entry) {
  return (
    isFiniteNumber(entry?.cashAmount) &&
    isFiniteNumber(entry?.commission) &&
    isFiniteNumber(entry?.driverEarnings)
  );
}

function isValidLedgerEntry(entry) {
  return entry?.type === LEDGER_ENTRY_TYPE.CASH_COMMISSION && hasLedgerAmounts(entry);
}

// AI-assisted: see docs/AI_LOG.md #37
function isValidGatewayEntry(entry) {
  return entry?.type === LEDGER_ENTRY_TYPE.GATEWAY_EARNING && hasLedgerAmounts(entry);
}

/**
 * Saldo del conductor con la plataforma a partir de sus asientos.
 * pendingCommission es lo que debe por viajes en efectivo; gatewayEarnings
 * es lo que la plataforma le debe por viajes cobrados con Mercado Pago.
 * balance = gatewayEarnings − pendingCommission (guía, sección 5; negativo =
 * el conductor debe dinero a la plataforma).
 * Solo es un total si recibe TODOS los asientos; la app usa los totales del
 * servidor (buildBalanceFromTotals) y esta función sirve para verificarlos.
 */
export function summarizeDriverBalance(entries) {
  const summary = {
    tripCount: 0,
    cashCollected: 0,
    commissionTotal: 0,
    pendingCommission: 0,
    settledCommission: 0,
    netEarnings: 0,
    gatewayTripCount: 0,
    gatewayEarnings: 0,
    balance: 0,
    currency: CURRENCY,
  };

  for (const entry of entries || []) {
    // AI-assisted: see docs/AI_LOG.md #37
    if (isValidGatewayEntry(entry)) {
      summary.gatewayTripCount += 1;
      summary.gatewayEarnings += entry.driverEarnings;
      continue;
    }

    if (!isValidLedgerEntry(entry)) continue;

    summary.tripCount += 1;
    summary.cashCollected += entry.cashAmount;
    summary.commissionTotal += entry.commission;
    summary.netEarnings += entry.driverEarnings;

    if (entry.status === LEDGER_ENTRY_STATUS.SETTLED) {
      summary.settledCommission += entry.commission;
    } else {
      summary.pendingCommission += entry.commission;
    }
  }

  // 0 - x en lugar de -x: sin comisiones pendientes el saldo es 0, no -0.
  summary.balance = summary.gatewayEarnings - summary.pendingCommission;
  return summary;
}

function toInteger(value) {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

/**
 * Saldo a partir de los totales calculados por Firestore sobre todos los
 * asientos (agregaciones count/sum en el servidor). Mismo formato que
 * summarizeDriverBalance, que solo debe usarse con listas completas.
 * @param {{tripCount, cashCollected, commissionTotal, netEarnings,
 *   pendingCommission, gatewayTripCount, gatewayEarnings}} totals
 */
export function buildBalanceFromTotals(totals) {
  const commissionTotal = toInteger(totals?.commissionTotal);
  const pendingCommission = toInteger(totals?.pendingCommission);
  // AI-assisted: see docs/AI_LOG.md #37
  const gatewayEarnings = toInteger(totals?.gatewayEarnings);

  return {
    tripCount: toInteger(totals?.tripCount),
    cashCollected: toInteger(totals?.cashCollected),
    commissionTotal,
    pendingCommission,
    settledCommission: commissionTotal - pendingCommission,
    netEarnings: toInteger(totals?.netEarnings),
    gatewayTripCount: toInteger(totals?.gatewayTripCount),
    gatewayEarnings,
    balance: gatewayEarnings - pendingCommission,
    currency: CURRENCY,
  };
}

// Texto del estado de pago de un viaje para historial y ganancias.
export function getTripPaymentLabel(trip) {
  if (trip?.status === TRIP_STATUS.CANCELLED) return 'Sin cobro';

  // AI-assisted: see docs/AI_LOG.md #38
  // Pagos simulados del MODO DEMOSTRACIÓN (solo existen en los emuladores).
  if (trip?.paymentMode === 'demo' && trip.paymentStatus) {
    return `${{ approved: 'Pago aprobado', pending: 'Pago pendiente', rejected: 'Pago rechazado' }[trip.paymentStatus] || 'Pago'} (MODO DEMOSTRACIÓN)`;
  }

  if (trip?.paymentStatus === PAYMENT_STATUS.CASH) return 'Efectivo recibido';
  if (trip?.paymentStatus === PAYMENT_STATUS.APPROVED) return 'Pago aprobado';
  if (trip?.paymentStatus === PAYMENT_STATUS.REJECTED) return 'Pago rechazado';
  // AI-assisted: see docs/AI_LOG.md #37
  if (trip?.paymentStatus === PAYMENT_STATUS.PENDING) return 'Pago pendiente de confirmación';

  if (trip?.status === TRIP_STATUS.COMPLETED) {
    if (trip.paymentMethod === PAYMENT_METHOD.CASH) return 'Efectivo por confirmar';
    if (
      trip.paymentMethod === PAYMENT_METHOD.MERCADOPAGO ||
      trip.paymentMethod === PAYMENT_METHOD.STRIPE
    ) {
      return 'Pago digital pendiente';
    }
  }

  return 'Pago no registrado';
}
