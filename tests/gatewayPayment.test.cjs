// AI-assisted: see docs/AI_LOG.md #37
// Cobro con Mercado Pago en la app: lógica pura, servicio (con la función
// callable y el navegador simulados) y saldo combinado con el efectivo.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { loadModule } = require('./helpers/loadModule.cjs');

const gateway = loadModule('src/utils/gatewayPaymentLogic.js');
const cash = loadModule('src/utils/cashPaymentLogic.js');
const { buildCompletionBreakdown } = loadModule('src/utils/fareLogic.js');

const DRIVER = 'driver-1';

function gatewayTrip(overrides = {}) {
  return {
    id: 'trip-mp',
    status: 'completed',
    driverId: DRIVER,
    paymentMethod: 'mercadopago',
    ...buildCompletionBreakdown({ distanceKm: 8.5, durationMin: 22, category: 'xl', tip: 2000, estimatedFare: 26900 }),
    ...overrides,
  };
}

test('Monto del cobro: tarifa + propina del desglose guardado', () => {
  assert.equal(gateway.getGatewayChargeAmount(gatewayTrip()), 26900 + 2000);
  assert.equal(gateway.getGatewayChargeAmount({ estimatedFare: 15000 }), null);
});

test('Solo el conductor asignado puede iniciar el cobro de un viaje finalizado de Mercado Pago', () => {
  assert.equal(gateway.canStartGatewayCheckout(gatewayTrip(), DRIVER), true);
  // Reintento tras un pago rechazado o pendiente.
  assert.equal(gateway.canStartGatewayCheckout(gatewayTrip({ paymentStatus: 'rejected' }), DRIVER), true);
  assert.equal(gateway.canStartGatewayCheckout(gatewayTrip({ paymentStatus: 'pending' }), DRIVER), true);

  for (const [name, trip, uid] of [
    ['otro conductor', gatewayTrip(), 'otro'],
    ['sin sesión', gatewayTrip(), ''],
    ['efectivo', gatewayTrip({ paymentMethod: 'cash' }), DRIVER],
    ['stripe', gatewayTrip({ paymentMethod: 'stripe' }), DRIVER],
    ['en curso', gatewayTrip({ status: 'in_progress' }), DRIVER],
    ['pagado', gatewayTrip({ status: 'paid', paymentStatus: 'approved' }), DRIVER],
    ['aprobado', gatewayTrip({ paymentStatus: 'approved' }), DRIVER],
    ['sin desglose', { ...gatewayTrip(), fare: undefined }, DRIVER],
  ]) {
    assert.equal(gateway.canStartGatewayCheckout(trip, uid), false, name);
  }
});

test('Estados visibles del cobro', () => {
  assert.equal(gateway.getGatewayStatusInfo(gatewayTrip()).label, 'Pendiente de cobro');
  assert.equal(gateway.getGatewayStatusInfo(gatewayTrip({ paymentStatus: 'pending' })).tone, 'warning');
  assert.equal(gateway.getGatewayStatusInfo(gatewayTrip({ paymentStatus: 'rejected' })).tone, 'error');
  const approved = gatewayTrip({ status: 'paid', paymentStatus: 'approved' });
  assert.equal(gateway.isGatewayPaymentApproved(approved), true);
  assert.equal(gateway.getGatewayStatusInfo(approved).label, 'Pago aprobado');
  // Un pago en efectivo nunca se presenta como aprobado por la pasarela.
  assert.equal(gateway.isGatewayPaymentApproved({ status: 'paid', paymentStatus: 'cash', paymentMethod: 'cash' }), false);

  assert.equal(cash.getTripPaymentLabel(gatewayTrip({ paymentStatus: 'pending' })), 'Pago pendiente de confirmación');
  assert.equal(cash.getTripPaymentLabel(gatewayTrip()), 'Pago digital pendiente');
  assert.equal(cash.getTripPaymentLabel(gatewayTrip({ status: 'paid', paymentStatus: 'approved' })), 'Pago aprobado');
});

test('Mensajes de error de la función de pagos', () => {
  assert.match(gateway.getGatewayErrorMessage({ code: 'functions/not-found', message: 'not-found' }), /no está disponible/);
  assert.match(gateway.getGatewayErrorMessage({ code: 'functions/internal', message: 'INTERNAL' }), /conexión/);
  assert.equal(
    gateway.getGatewayErrorMessage({ code: 'functions/already-exists', message: 'El pago de este viaje ya fue aprobado.' }),
    'El pago de este viaje ya fue aprobado.'
  );
  assert.match(gateway.getGatewayErrorMessage({ code: 'functions/unauthenticated' }), /sesión/);
  assert.equal(gateway.isValidCheckoutUrl('https://www.mercadopago.com.co/checkout/v1/redirect?pref_id=1'), true);
  assert.equal(gateway.isValidCheckoutUrl('http://inseguro.test'), false);
  assert.equal(gateway.isValidCheckoutUrl('javascript:alert(1)'), false);
});

function loadService({ callableResult, callableError, browser } = {}) {
  const calls = [];
  const service = loadModule('src/services/gatewayPaymentService.js', {
    'firebase/firestore': {},
    'firebase/functions': {
      httpsCallable: (functionsInstance, name) => async (data) => {
        calls.push({ functionsInstance, name, data });
        if (callableError) throw callableError;
        return callableResult;
      },
    },
    'expo-web-browser': browser || { openBrowserAsync: async () => ({ type: 'opened' }) },
    '../config/firebase': { db: null, functions: { region: 'us-central1' } },
  });
  return { service, calls };
}

test('El servicio llama a createPaymentPreference con el viaje y el monto', async () => {
  const { service, calls } = loadService({
    callableResult: { data: { checkoutUrl: 'https://www.mercadopago.com.co/checkout/x', preferenceId: 'p1', amount: 28900, reused: false } },
  });

  const result = await service.requestGatewayCheckout(gatewayTrip(), DRIVER);
  assert.equal(result.preferenceId, 'p1');
  assert.deepEqual(calls[0].name, 'createPaymentPreference');
  assert.deepEqual(calls[0].data, { tripId: 'trip-mp', amount: 28900 });

  // Viaje no cobrable: no se llama al backend.
  await assert.rejects(service.requestGatewayCheckout(gatewayTrip({ paymentMethod: 'cash' }), DRIVER), /no se puede cobrar/);
  assert.equal(calls.length, 1);
});

test('El servicio rechaza URLs de checkout no seguras y propaga errores del backend', async () => {
  const insecure = loadService({ callableResult: { data: { checkoutUrl: 'http://evil.test' } } });
  await assert.rejects(insecure.service.requestGatewayCheckout(gatewayTrip(), DRIVER), /enlace de pago válido/);

  const failing = loadService({ callableError: Object.assign(new Error('not-found'), { code: 'functions/not-found' }) });
  await assert.rejects(failing.service.requestGatewayCheckout(gatewayTrip(), DRIVER), (error) => error.code === 'functions/not-found');

  const opened = [];
  const { service } = loadService({ browser: { openBrowserAsync: async (url) => { opened.push(url); return { type: 'opened' }; } } });
  await service.openGatewayCheckout('https://www.mercadopago.com.co/checkout/x');
  assert.deepEqual(opened, ['https://www.mercadopago.com.co/checkout/x']);
  assert.throws(() => service.openGatewayCheckout('http://evil.test'), /no válido/);
});

test('Saldo: ganancias de la pasarela menos comisiones de efectivo pendientes', () => {
  const cashTrip = { status: 'completed', driverId: DRIVER, paymentMethod: 'cash', ...buildCompletionBreakdown({ estimatedFare: 20000 }) };
  const entries = [
    cash.buildCashCommissionEntry('cash-1', cashTrip),
    {
      type: 'gateway_earning',
      tripId: 'mp-1',
      status: 'pending',
      cashAmount: 0,
      commission: 5380,
      driverEarnings: 23520,
    },
  ];

  const summary = cash.summarizeDriverBalance(entries);
  assert.equal(summary.tripCount, 1);
  assert.equal(summary.pendingCommission, 4000);
  assert.equal(summary.gatewayTripCount, 1);
  assert.equal(summary.gatewayEarnings, 23520);
  assert.equal(summary.balance, 23520 - 4000);
  // El efectivo no cambia por la pasarela.
  assert.equal(summary.cashCollected, 20000);
  assert.equal(summary.netEarnings, 16000);

  const fromTotals = cash.buildBalanceFromTotals({
    tripCount: 1, cashCollected: 20000, commissionTotal: 4000, netEarnings: 16000,
    pendingCommission: 4000, gatewayTripCount: 1, gatewayEarnings: 23520,
  });
  assert.deepEqual(fromTotals, summary);

  // Solo pasarela: saldo positivo; sin nada: 0 (no -0).
  assert.equal(cash.buildBalanceFromTotals({ gatewayEarnings: 1000 }).balance, 1000);
  assert.equal(Object.is(cash.buildBalanceFromTotals({}).balance, 0), true);
});

// AI-assisted: see docs/AI_LOG.md #38
// MODO DEMOSTRACIÓN: solo en desarrollo, con la variable y una IP local.
const { getPaymentsDemoConfig, PAYMENTS_DEMO } = loadModule('src/config/paymentsDemo.js');

test('MODO DEMOSTRACIÓN: solo se activa en desarrollo, con la variable y una IP local', () => {
  assert.equal(getPaymentsDemoConfig({ isDev: true, flag: 'true', host: '192.168.1.5' }).enabled, true);
  assert.equal(getPaymentsDemoConfig({ isDev: true, flag: 'true', host: 'localhost' }).enabled, true);

  for (const [name, input] of [
    ['build de producción', { isDev: false, flag: 'true', host: '192.168.1.5' }],
    ['sin variable', { isDev: true, flag: undefined, host: '192.168.1.5' }],
    ['variable distinta', { isDev: true, flag: '1', host: '192.168.1.5' }],
    ['sin host', { isDev: true, flag: 'true', host: undefined }],
    ['host público', { isDev: true, flag: 'true', host: '8.8.8.8' }],
    ['dominio', { isDev: true, flag: 'true', host: 'firestore.googleapis.com' }],
  ]) {
    const config = getPaymentsDemoConfig(input);
    assert.equal(config.enabled, false, name);
    assert.equal(config.host, null, name);
  }

  // En Node (pruebas) no hay __DEV__: desactivado.
  assert.equal(PAYMENTS_DEMO.enabled, false);
});

test('MODO DEMOSTRACIÓN: el checkout http solo se admite para el emulador configurado', () => {
  const demo = getPaymentsDemoConfig({ isDev: true, flag: 'true', host: '192.168.1.5' });
  const url = 'http://192.168.1.5:5002/uberclone-driver-8e0bf/us-central1/demoCheckout?pref=DEMO-0123456789ABCDEF';

  assert.equal(gateway.isValidCheckoutUrl(url, demo), true);
  assert.equal(gateway.isValidCheckoutUrl(url), false);
  assert.equal(gateway.isValidCheckoutUrl(url, getPaymentsDemoConfig({ isDev: false, flag: 'true', host: '192.168.1.5' })), false);
  assert.equal(gateway.isValidCheckoutUrl('http://192.168.1.9:5002/p/us-central1/demoCheckout?pref=DEMO-0123456789ABCDEF', demo), false);
  assert.equal(gateway.isValidCheckoutUrl('http://192.168.1.5:5002/p/us-central1/otra?x=1', demo), false);
});

test('MODO DEMOSTRACIÓN: los pagos simulados se identifican siempre', () => {
  const demoPaid = gatewayTrip({ status: 'paid', paymentStatus: 'approved', paymentMode: 'demo' });
  assert.equal(gateway.isDemoPayment(demoPaid), true);
  assert.equal(gateway.getGatewayStatusInfo(demoPaid).label, 'Pago aprobado (MODO DEMOSTRACIÓN)');
  assert.equal(cash.getTripPaymentLabel(demoPaid), 'Pago aprobado (MODO DEMOSTRACIÓN)');
  assert.equal(cash.getTripPaymentLabel(gatewayTrip({ paymentMode: 'demo', paymentStatus: 'rejected' })), 'Pago rechazado (MODO DEMOSTRACIÓN)');
  // Un pago real no lleva la marca.
  assert.equal(cash.getTripPaymentLabel(gatewayTrip({ status: 'paid', paymentStatus: 'approved' })), 'Pago aprobado');
  // El efectivo no cambia.
  assert.equal(cash.getTripPaymentLabel({ status: 'paid', paymentStatus: 'cash', paymentMethod: 'cash' }), 'Efectivo recibido');
});
