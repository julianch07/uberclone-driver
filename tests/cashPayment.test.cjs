// AI-assisted: see docs/AI_LOG.md #29
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { loadModule } = require('./helpers/loadModule.cjs');

const cash = loadModule('src/utils/cashPaymentLogic.js');
const { buildCompletionBreakdown, calculateFare } = loadModule('src/utils/fareLogic.js');

const DRIVER = 'driver-1';

// Viaje finalizado con el desglose que guarda el módulo de tarifas.
function completedTrip(overrides = {}, pricing = { estimatedFare: 20000 }) {
  return {
    status: 'completed',
    driverId: DRIVER,
    paymentMethod: 'cash',
    ...buildCompletionBreakdown(pricing),
    ...overrides,
  };
}

test('Ejemplo del módulo: 20.000 COP en efectivo', () => {
  const entry = cash.buildCashCommissionEntry('trip-1', completedTrip());

  assert.deepEqual(entry, {
    type: 'cash_commission',
    tripId: 'trip-1',
    status: 'pending',
    currency: 'COP',
    fare: 20000,
    tip: 0,
    cashAmount: 20000,
    commission: 4000,
    commissionRate: 0.2,
    driverEarnings: 16000,
    amount: 4000,
  });
});

test('El efectivo recibido no es la ganancia neta', () => {
  const trip = completedTrip({}, {
    distanceKm: 8.5,
    durationMin: 22,
    category: 'xl',
    tip: 1500,
    estimatedFare: 26900,
  });
  const entry = cash.buildCashCommissionEntry('trip-xl', trip);

  // Efectivo físico = tarifa + propina; la comisión solo se aplica a la tarifa.
  assert.equal(entry.cashAmount, 26900 + 1500);
  assert.equal(entry.commission, 5380);
  assert.equal(entry.driverEarnings, 26900 - 5380 + 1500);
  assert.equal(entry.cashAmount - entry.commission, entry.driverEarnings);
  assert.notEqual(entry.cashAmount, entry.driverEarnings);
});

test('Copia los importes guardados sin recalcularlos', () => {
  // Desglose histórico distinto del cálculo actual: se conserva tal cual.
  const historic = completedTrip({
    fare: 15000,
    commission: 3000,
    commissionRate: 0.2,
    driverEarnings: 12000,
    tip: 0,
  });

  const entry = cash.buildCashCommissionEntry('trip-old', historic);
  assert.equal(entry.commission, 3000);
  assert.equal(entry.driverEarnings, 12000);
});

test('Los importes son enteros en COP para todas las categorías', () => {
  for (const category of ['economy', 'xl', 'premium']) {
    for (const distanceKm of [0, 2.3, 8.5, 12.345]) {
      const inputs = { distanceKm, durationMin: 13.7, category, tip: 700 };
      const trip = completedTrip({}, {
        ...inputs,
        estimatedFare: calculateFare(inputs).fare,
      });
      const entry = cash.buildCashCommissionEntry('t', trip);

      for (const field of ['fare', 'tip', 'cashAmount', 'commission', 'driverEarnings', 'amount']) {
        assert.ok(Number.isInteger(entry[field]), `${category} ${distanceKm} ${field}`);
      }
      // Redondeo de la comisión: 20 % de la tarifa, mitad hacia arriba.
      assert.equal(entry.commission, Math.floor(entry.fare * 20 / 100 + 0.5));
    }
  }
});

test('Solo se puede registrar el cobro de un viaje propio, finalizado y en efectivo', () => {
  assert.equal(cash.canRegisterCashPayment(completedTrip(), DRIVER), true);

  const cases = [
    ['otro conductor', completedTrip({ driverId: 'otro' })],
    ['en curso', completedTrip({ status: 'in_progress' })],
    ['ya pagado', completedTrip({ status: 'paid', paymentStatus: 'cash' })],
    ['pago digital', completedTrip({ paymentMethod: 'mercadopago' })],
    ['stripe', completedTrip({ paymentMethod: 'stripe' })],
    ['sin método de pago', completedTrip({ paymentMethod: undefined })],
    ['pago ya informado', completedTrip({ paymentStatus: 'approved' })],
    ['sin desglose (viaje antiguo)', { status: 'completed', driverId: DRIVER, paymentMethod: 'cash', estimatedFare: 15000 }],
  ];

  for (const [name, trip] of cases) {
    assert.equal(cash.canRegisterCashPayment(trip, DRIVER), false, name);
  }
  assert.equal(cash.canRegisterCashPayment(completedTrip(), ''), false);
});

test('Reconoce un cobro en efectivo ya registrado', () => {
  assert.equal(
    cash.isCashPaymentRegistered(completedTrip({ status: 'paid', paymentStatus: 'cash' }), DRIVER),
    true
  );
  assert.equal(cash.isCashPaymentRegistered(completedTrip(), DRIVER), false);
  assert.equal(
    cash.isCashPaymentRegistered(completedTrip({ status: 'paid', paymentStatus: 'approved' }), DRIVER),
    false
  );
});

test('Un viaje sin desglose no genera asiento', () => {
  assert.throws(
    () => cash.buildCashCommissionEntry('t', { estimatedFare: 15000 }),
    /desglose de tarifa/
  );
  assert.equal(cash.getCashCollectionSummary({ estimatedFare: 15000 }), null);
});

test('El ID del asiento es determinista: una comisión por viaje', () => {
  assert.equal(cash.cashLedgerEntryId('abc'), 'cash_abc');
  assert.equal(cash.cashLedgerEntryId('abc'), cash.cashLedgerEntryId('abc'));
});

test('Saldo: efectivo, comisiones, pendiente, neto y saldo con signo', () => {
  const entries = [
    cash.buildCashCommissionEntry('a', completedTrip()),
    cash.buildCashCommissionEntry('b', completedTrip({}, { estimatedFare: 10000, tip: 500 })),
    { ...cash.buildCashCommissionEntry('c', completedTrip({}, { estimatedFare: 5000 })), status: 'settled' },
  ];

  assert.deepEqual(cash.summarizeDriverBalance(entries), {
    tripCount: 3,
    cashCollected: 20000 + 10500 + 5000,
    commissionTotal: 4000 + 2000 + 1000,
    pendingCommission: 4000 + 2000,
    settledCommission: 1000,
    netEarnings: 16000 + 8500 + 4000,
    balance: -(4000 + 2000),
    currency: 'COP',
  });
});

test('Saldo vacío y asientos inválidos', () => {
  const empty = cash.summarizeDriverBalance([]);
  assert.equal(empty.pendingCommission, 0);
  assert.equal(empty.tripCount, 0);
  assert.equal(empty.balance, 0);
  assert.equal(cash.summarizeDriverBalance(undefined).tripCount, 0);

  const withGarbage = cash.summarizeDriverBalance([
    { type: 'otro', commission: 999 },
    { type: 'cash_commission', commission: 'mil' },
    cash.buildCashCommissionEntry('a', completedTrip()),
  ]);
  assert.equal(withGarbage.tripCount, 1);
  assert.equal(withGarbage.pendingCommission, 4000);
});

test('Etiquetas de pago: efectivo y digital separados', () => {
  assert.equal(cash.getTripPaymentLabel(completedTrip()), 'Efectivo por confirmar');
  assert.equal(
    cash.getTripPaymentLabel(completedTrip({ status: 'paid', paymentStatus: 'cash' })),
    'Efectivo recibido'
  );
  assert.equal(
    cash.getTripPaymentLabel(completedTrip({ paymentMethod: 'mercadopago' })),
    'Pago digital pendiente'
  );
  assert.equal(cash.getTripPaymentLabel({ status: 'cancelled' }), 'Sin cobro');
  assert.equal(cash.getTripPaymentLabel({ status: 'completed' }), 'Pago no registrado');
  assert.equal(cash.isFinishedTrip({ status: 'paid' }), true);
  assert.equal(cash.isFinishedTrip({ status: 'completed' }), true);
  assert.equal(cash.isFinishedTrip({ status: 'cancelled' }), false);
});
