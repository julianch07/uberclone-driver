// AI-assisted: see docs/AI_LOG.md #37
const { test } = require('node:test');
const assert = require('node:assert/strict');

const logic = require('../src/paymentLogic');

const DRIVER = 'driver-mp';

// Viaje finalizado con el desglose del módulo de tarifas (8,5 km, 22 min).
function completedTrip(overrides = {}) {
  return {
    status: 'completed',
    driverId: DRIVER,
    paymentMethod: 'mercadopago',
    category: 'economy',
    fare: 19200,
    commission: 3840,
    commissionRate: 0.2,
    tip: 1000,
    driverEarnings: 16360,
    ...overrides,
  };
}

test('Monto del cobro: tarifa + propina, calculado en el servidor', () => {
  assert.equal(logic.getChargeAmount(completedTrip()), 20200);
  assert.equal(logic.assertCheckoutAllowed(completedTrip(), DRIVER), 20200);
  assert.equal(logic.assertCheckoutAllowed(completedTrip(), DRIVER, 20200), 20200);
});

test('Solo el conductor asignado puede cobrar un viaje finalizado de Mercado Pago', () => {
  const cases = [
    ['viaje inexistente', null, DRIVER, undefined, 'not-found'],
    ['otro conductor', completedTrip(), 'otro', undefined, 'permission-denied'],
    ['efectivo', completedTrip({ paymentMethod: 'cash' }), DRIVER, undefined, 'failed-precondition'],
    ['stripe', completedTrip({ paymentMethod: 'stripe' }), DRIVER, undefined, 'failed-precondition'],
    ['en curso', completedTrip({ status: 'in_progress' }), DRIVER, undefined, 'failed-precondition'],
    ['ya pagado', completedTrip({ status: 'paid', paymentStatus: 'approved' }), DRIVER, undefined, 'already-exists'],
    ['aprobado sin pasar a paid', completedTrip({ paymentStatus: 'approved' }), DRIVER, undefined, 'already-exists'],
    ['monto alterado por la app', completedTrip(), DRIVER, 1000, 'invalid-argument'],
    ['sin desglose', completedTrip({ fare: undefined }), DRIVER, undefined, 'failed-precondition'],
    ['tarifa con decimales', completedTrip({ fare: 19200.5 }), DRIVER, undefined, 'failed-precondition'],
  ];

  for (const [name, trip, uid, amount, code] of cases) {
    assert.throws(
      () => logic.assertCheckoutAllowed(trip, uid, amount),
      (error) => error instanceof logic.PaymentError && error.code === code,
      name
    );
  }

  // Un pago anterior rechazado o pendiente permite volver a intentarlo.
  assert.equal(logic.assertCheckoutAllowed(completedTrip({ paymentStatus: 'rejected' }), DRIVER), 20200);
  assert.equal(logic.assertCheckoutAllowed(completedTrip({ paymentStatus: 'pending' }), DRIVER), 20200);
});

test('Preferencia: COP, monto entero, external_reference y URLs del backend', () => {
  const now = Date.parse('2026-11-14T10:00:00Z');
  const body = logic.buildPreferenceBody({
    tripId: 'trip-1',
    trip: completedTrip(),
    driverId: DRIVER,
    amount: 20200,
    notificationUrl: 'https://example.test/mercadoPagoWebhook',
    returnUrl: 'https://example.test/paymentReturn',
    now,
  });

  assert.equal(body.items.length, 1);
  assert.deepEqual(
    { quantity: body.items[0].quantity, currency_id: body.items[0].currency_id, unit_price: body.items[0].unit_price },
    { quantity: 1, currency_id: 'COP', unit_price: 20200 }
  );
  assert.ok(Number.isInteger(body.items[0].unit_price));
  assert.equal(body.external_reference, 'trip-1');
  assert.deepEqual(body.metadata, { trip_id: 'trip-1', driver_id: DRIVER });
  assert.equal(body.notification_url, 'https://example.test/mercadoPagoWebhook');
  assert.equal(body.back_urls.success, 'https://example.test/paymentReturn');
  assert.equal(body.auto_return, 'approved');
  assert.equal(body.expires, true);
  assert.equal(Date.parse(body.expiration_date_to) - Date.parse(body.expiration_date_from), logic.PREFERENCE_TTL_MS);
});

test('Correspondencia de estados de Mercado Pago', () => {
  assert.equal(logic.mapPaymentStatus('approved'), 'approved');
  for (const status of ['pending', 'in_process', 'authorized']) {
    assert.equal(logic.mapPaymentStatus(status), 'pending', status);
  }
  for (const status of ['rejected', 'cancelled']) {
    assert.equal(logic.mapPaymentStatus(status), 'rejected', status);
  }
  for (const status of ['refunded', 'charged_back', 'desconocido', undefined]) {
    assert.equal(logic.mapPaymentStatus(status), null, String(status));
  }
});

test('El pago consultado debe coincidir con el viaje', () => {
  const payment = {
    id: 123,
    status: 'approved',
    external_reference: 'trip-1',
    currency_id: 'COP',
    transaction_amount: 20200,
    metadata: { driver_id: DRIVER },
  };

  assert.equal(logic.getPaymentMismatch(payment, completedTrip(), 'trip-1'), null);
  // La API puede devolver el monto como texto.
  assert.equal(logic.getPaymentMismatch({ ...payment, transaction_amount: '20200.00' }, completedTrip(), 'trip-1'), null);

  const cases = [
    ['otro viaje', { ...payment, external_reference: 'trip-2' }, completedTrip(), 'external_reference'],
    ['viaje inexistente', payment, null, 'trip_not_found'],
    ['viaje en efectivo', payment, completedTrip({ paymentMethod: 'cash' }), 'payment_method'],
    ['otra moneda', { ...payment, currency_id: 'USD' }, completedTrip(), 'currency'],
    ['monto menor', { ...payment, transaction_amount: 100 }, completedTrip(), 'amount'],
    ['monto sin propina', { ...payment, transaction_amount: 19200 }, completedTrip(), 'amount'],
    ['otro conductor', { ...payment, metadata: { driver_id: 'otro' } }, completedTrip(), 'driver'],
  ];

  for (const [name, item, trip, reason] of cases) {
    assert.equal(logic.getPaymentMismatch(item, trip, 'trip-1'), reason, name);
  }
});

test('Asiento de ganancia: misma forma que el de efectivo, cashAmount 0', () => {
  const entry = logic.buildGatewayEarningEntry('trip-1', completedTrip(), 123);

  assert.deepEqual(entry, {
    type: 'gateway_earning',
    tripId: 'trip-1',
    status: 'pending',
    currency: 'COP',
    paymentMethod: 'mercadopago',
    paymentId: '123',
    fare: 19200,
    tip: 1000,
    cashAmount: 0,
    commission: 3840,
    commissionRate: 0.2,
    driverEarnings: 16360,
    amount: 16360,
  });
  assert.equal(logic.gatewayLedgerEntryId('trip-1'), 'mp_trip-1');
});

test('Aplicación del pago: idempotente y sin retrocesos', () => {
  const trip = completedTrip();

  const approved = logic.planPaymentUpdate(trip, 1, 'approved');
  assert.equal(approved.action, 'approved');
  assert.deepEqual(approved.tripUpdate, { status: 'paid', paymentStatus: 'approved', paymentId: '1' });
  assert.equal(approved.setPaidAt, true);
  assert.equal(approved.createLedger, true);

  const paid = completedTrip({ status: 'paid', paymentStatus: 'approved', paymentId: '1' });
  // La misma notificación repetida no vuelve a escribir el viaje.
  assert.equal(logic.planPaymentUpdate(paid, 1, 'approved').action, 'already_applied');
  assert.equal(logic.planPaymentUpdate(paid, 1, 'approved').tripUpdate, undefined);
  // Una notificación atrasada no rebaja un pago aprobado.
  assert.equal(logic.planPaymentUpdate(paid, 1, 'pending').tripUpdate, undefined);
  assert.equal(logic.planPaymentUpdate(paid, 2, 'rejected').action, 'ignored_after_approval');
  // Un segundo pago aprobado no se aplica (se registra para revisión).
  assert.equal(logic.planPaymentUpdate(paid, 2, 'approved').action, 'duplicate_payment');

  const pending = logic.planPaymentUpdate(trip, 5, 'pending');
  assert.deepEqual(pending.tripUpdate, { paymentStatus: 'pending', paymentId: '5' });
  const rejected = logic.planPaymentUpdate(trip, 6, 'rejected');
  assert.deepEqual(rejected.tripUpdate, { paymentStatus: 'rejected', paymentId: '6' });
  // Tras un rechazo, un nuevo pago aprobado sí se aplica.
  assert.equal(logic.planPaymentUpdate(completedTrip({ paymentStatus: 'rejected', paymentId: '6' }), 7, 'approved').action, 'approved');

  assert.equal(logic.planPaymentUpdate(completedTrip({ status: 'in_progress' }), 1, 'approved').action, 'trip_not_completed');
  assert.equal(logic.planPaymentUpdate(trip, 1, null).action, 'ignored_status');
});
