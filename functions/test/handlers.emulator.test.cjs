// AI-assisted: see docs/AI_LOG.md #37
// Manejadores de pago contra el emulador de Firestore (Admin SDK) y una API
// de Mercado Pago simulada. Requiere el emulador en 127.0.0.1:8080:
//   npx firebase-tools emulators:start --only firestore
process.env.FIRESTORE_EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');

const { initializeApp } = require('firebase-admin/app');
const { FieldValue, Timestamp, getFirestore } = require('firebase-admin/firestore');

const {
  createCheckoutHandler,
  createDemoCheckoutHandler,
  createReturnHandler,
  createWebhookHandler,
  processPayment,
} = require('../src/handlers');
// AI-assisted: see docs/AI_LOG.md #38
const {
  DEMO_PAYMENT_ID_PATTERN,
  createDemoPayment,
  createDemoPaymentClient,
} = require('../src/demoMode');

const PROJECT_ID = 'demo-uberclone-driver-functions';
const DRIVER = 'driver-mp';
const SECRET = 'clave-webhook-de-prueba';

initializeApp({ projectId: PROJECT_ID });
const db = getFirestore();

function completedTrip(overrides = {}) {
  return {
    status: 'completed',
    driverId: DRIVER,
    paymentMethod: 'mercadopago',
    category: 'xl',
    fare: 26900,
    commission: 5380,
    commissionRate: 0.2,
    tip: 0,
    driverEarnings: 21520,
    fareSource: 'calculated',
    ...overrides,
  };
}

// API de Mercado Pago simulada.
function fakeMercadoPago() {
  const payments = new Map();
  const preferences = [];

  return {
    payments,
    preferences,
    client: {
      async createPreference(body) {
        preferences.push(body);
        const id = `pref-${preferences.length}`;
        return {
          id,
          init_point: `https://checkout.example.test/${id}`,
          sandbox_init_point: `https://sandbox.example.test/${id}`,
        };
      },
      async getPayment(id) {
        return payments.get(String(id)) || null;
      },
    },
  };
}

function payment(id, tripId, status, amount = 26900) {
  return {
    id: Number(id),
    status,
    external_reference: tripId,
    currency_id: 'COP',
    transaction_amount: amount,
    metadata: { trip_id: tripId, driver_id: DRIVER },
  };
}

async function seedTrip(tripId, overrides) {
  await db.collection('trips').doc(tripId).set(completedTrip(overrides));
}

async function readTrip(tripId) {
  return (await db.collection('trips').doc(tripId).get()).data();
}

async function ledgerEntries(tripId) {
  const snapshot = await db.collection('drivers').doc(DRIVER).collection('ledgerEntries').get();
  return snapshot.docs.filter((item) => item.data().tripId === tripId).map((item) => ({ id: item.id, ...item.data() }));
}

function fakeResponse() {
  const response = { statusCode: null, body: null, headers: {} };
  response.status = (code) => {
    response.statusCode = code;
    return response;
  };
  response.json = (body) => {
    response.body = body;
    return response;
  };
  response.send = (body) => {
    response.body = body;
    return response;
  };
  response.set = (name, value) => {
    response.headers[name] = value;
    return response;
  };
  return response;
}

function signedRequest(dataId, { secret = SECRET, requestId = 'req-1', type = 'payment', method = 'POST', sign = true } = {}) {
  const ts = '1763100000';
  const manifest = `id:${dataId};request-id:${requestId};ts:${ts};`;
  const v1 = crypto.createHmac('sha256', secret).update(manifest).digest('hex');
  const headers = { 'x-request-id': requestId, ...(sign ? { 'x-signature': `ts=${ts},v1=${v1}` } : {}) };

  return {
    method,
    query: { 'data.id': String(dataId), type },
    body: { type, action: 'payment.updated', data: { id: String(dataId) } },
    get: (name) => headers[name.toLowerCase()],
  };
}

const quietLogger = { info() {}, warn() {}, error() {} };

test('Pagos con Mercado Pago (emulador)', async (t) => {
  // Limpieza del proyecto demo en el emulador.
  await fetch(`http://${process.env.FIRESTORE_EMULATOR_HOST}/emulator/v1/projects/${PROJECT_ID}/databases/(default)/documents`, { method: 'DELETE' });

  await t.test('createCheckout: crea la preferencia con el monto del servidor y la reutiliza', async () => {
    const mp = fakeMercadoPago();
    await seedTrip('trip-checkout', { tip: 1500 });
    const handler = createCheckoutHandler({
      db, getClient: () => mp.client, FieldValue, Timestamp,
      notificationUrl: 'https://fn.example.test/mercadoPagoWebhook',
      returnUrl: 'https://fn.example.test/paymentReturn',
    });

    const first = await handler({ uid: DRIVER, tripId: 'trip-checkout', amount: 28400 });
    assert.equal(first.checkoutUrl, 'https://checkout.example.test/pref-1');
    assert.equal(first.amount, 28400);
    assert.equal(first.reused, false);
    assert.equal(mp.preferences[0].items[0].unit_price, 28400);
    assert.equal(mp.preferences[0].external_reference, 'trip-checkout');

    const stored = await readTrip('trip-checkout');
    assert.equal(stored.paymentPreferenceId, 'pref-1');
    assert.equal(stored.paymentPreferenceAmount, 28400);
    assert.equal(stored.status, 'completed');
    assert.equal(stored.paymentStatus, undefined);

    const second = await handler({ uid: DRIVER, tripId: 'trip-checkout' });
    assert.equal(second.reused, true);
    assert.equal(mp.preferences.length, 1);
  });

  await t.test('createCheckout: rechaza otro conductor, efectivo, monto alterado y viajes pagados', async () => {
    const mp = fakeMercadoPago();
    const handler = createCheckoutHandler({ db, getClient: () => mp.client, FieldValue, Timestamp, notificationUrl: 'https://x' });
    await seedTrip('trip-cash', { paymentMethod: 'cash' });
    await seedTrip('trip-paid', { status: 'paid', paymentStatus: 'approved' });
    await seedTrip('trip-other');

    for (const [args, code] of [
      [{ uid: 'otro', tripId: 'trip-other' }, 'permission-denied'],
      [{ uid: DRIVER, tripId: 'trip-cash' }, 'failed-precondition'],
      [{ uid: DRIVER, tripId: 'trip-other', amount: 1 }, 'invalid-argument'],
      [{ uid: DRIVER, tripId: 'trip-paid' }, 'already-exists'],
      [{ uid: DRIVER, tripId: 'no-existe' }, 'not-found'],
      [{ uid: DRIVER, tripId: '../trips' }, 'invalid-argument'],
      [{ uid: '', tripId: 'trip-other' }, 'unauthenticated'],
    ]) {
      await assert.rejects(handler(args), (error) => error.code === code, JSON.stringify(args));
    }
    assert.equal(mp.preferences.length, 0);
  });

  await t.test('Pago aprobado: viaje pagado, asiento de ganancia y auditoría; repetir no duplica', async () => {
    const mp = fakeMercadoPago();
    await seedTrip('trip-approved');
    mp.payments.set('1001', payment(1001, 'trip-approved', 'approved'));

    const result = await processPayment({ db, client: mp.client, FieldValue, paymentId: '1001', source: 'webhook', signature: 'valid' });
    assert.equal(result.action, 'approved');

    const trip = await readTrip('trip-approved');
    assert.equal(trip.status, 'paid');
    assert.equal(trip.paymentStatus, 'approved');
    assert.equal(trip.paymentId, '1001');
    assert.ok(trip.paidAt instanceof Timestamp);
    // El desglose del viaje no cambia.
    assert.equal(trip.fare, 26900);
    assert.equal(trip.driverEarnings, 21520);

    const entries = await ledgerEntries('trip-approved');
    assert.equal(entries.length, 1);
    assert.equal(entries[0].id, 'mp_trip-approved');
    assert.equal(entries[0].type, 'gateway_earning');
    assert.equal(entries[0].driverEarnings, 21520);
    assert.equal(entries[0].cashAmount, 0);
    assert.ok(entries[0].createdAt instanceof Timestamp);

    const event = (await db.collection('paymentEvents').doc('1001_approved').get()).data();
    assert.equal(event.action, 'approved');
    assert.equal(event.tripId, 'trip-approved');

    const again = await processPayment({ db, client: mp.client, FieldValue, paymentId: '1001', source: 'webhook' });
    assert.equal(again.action, 'already_applied');
    assert.equal((await ledgerEntries('trip-approved')).length, 1);
    assert.equal((await readTrip('trip-approved')).paidAt.toMillis(), trip.paidAt.toMillis());
  });

  await t.test('Notificaciones simultáneas del mismo pago: un solo asiento', async () => {
    const mp = fakeMercadoPago();
    await seedTrip('trip-race');
    mp.payments.set('1002', payment(1002, 'trip-race', 'approved'));

    const results = await Promise.all(
      [1, 2, 3].map(() => processPayment({ db, client: mp.client, FieldValue, paymentId: '1002', source: 'webhook' }))
    );
    assert.equal(results.filter((item) => item.action === 'approved').length, 1);
    assert.equal((await ledgerEntries('trip-race')).length, 1);
  });

  await t.test('Pendiente → aprobado; una notificación atrasada no rebaja el pago', async () => {
    const mp = fakeMercadoPago();
    await seedTrip('trip-pending');
    mp.payments.set('2001', payment(2001, 'trip-pending', 'in_process'));

    assert.equal((await processPayment({ db, client: mp.client, FieldValue, paymentId: '2001', source: 'webhook' })).action, 'pending');
    let trip = await readTrip('trip-pending');
    assert.equal(trip.status, 'completed');
    assert.equal(trip.paymentStatus, 'pending');
    assert.equal((await ledgerEntries('trip-pending')).length, 0);

    mp.payments.set('2001', payment(2001, 'trip-pending', 'approved'));
    assert.equal((await processPayment({ db, client: mp.client, FieldValue, paymentId: '2001', source: 'webhook' })).action, 'approved');

    // Un pago anterior que llega tarde como rechazado no cambia nada.
    mp.payments.set('2000', payment(2000, 'trip-pending', 'rejected'));
    assert.equal((await processPayment({ db, client: mp.client, FieldValue, paymentId: '2000', source: 'webhook' })).action, 'ignored_after_approval');
    trip = await readTrip('trip-pending');
    assert.equal(trip.status, 'paid');
    assert.equal(trip.paymentStatus, 'approved');
    assert.equal(trip.paymentId, '2001');
  });

  await t.test('Rechazado: el viaje sigue finalizado y se puede reintentar', async () => {
    const mp = fakeMercadoPago();
    await seedTrip('trip-rejected');
    mp.payments.set('3001', payment(3001, 'trip-rejected', 'rejected'));

    assert.equal((await processPayment({ db, client: mp.client, FieldValue, paymentId: '3001', source: 'webhook' })).action, 'rejected');
    const trip = await readTrip('trip-rejected');
    assert.equal(trip.status, 'completed');
    assert.equal(trip.paymentStatus, 'rejected');

    const handler = createCheckoutHandler({ db, getClient: () => mp.client, FieldValue, Timestamp, notificationUrl: 'https://x' });
    assert.equal((await handler({ uid: DRIVER, tripId: 'trip-rejected' })).reused, false);
  });

  await t.test('Pagos que no coinciden con el viaje no se aplican', async () => {
    const mp = fakeMercadoPago();
    await seedTrip('trip-mismatch');
    await seedTrip('trip-cash-mp', { paymentMethod: 'cash' });
    mp.payments.set('4001', payment(4001, 'trip-mismatch', 'approved', 100));
    mp.payments.set('4002', payment(4002, 'trip-cash-mp', 'approved'));
    mp.payments.set('4003', payment(4003, 'no-existe', 'approved'));

    assert.deepEqual(
      await processPayment({ db, client: mp.client, FieldValue, paymentId: '4001', source: 'webhook' }),
      { action: 'mismatch', tripId: 'trip-mismatch', reason: 'amount' }
    );
    assert.equal((await processPayment({ db, client: mp.client, FieldValue, paymentId: '4002', source: 'webhook' })).reason, 'payment_method');
    assert.equal((await processPayment({ db, client: mp.client, FieldValue, paymentId: '4003', source: 'webhook' })).reason, 'trip_not_found');
    assert.equal((await processPayment({ db, client: mp.client, FieldValue, paymentId: '999', source: 'webhook' })).action, 'payment_not_found');

    assert.equal((await readTrip('trip-mismatch')).status, 'completed');
    assert.equal((await readTrip('trip-mismatch')).paymentStatus, undefined);
    assert.equal((await readTrip('trip-cash-mp')).status, 'completed');
    assert.equal((await ledgerEntries('trip-mismatch')).length, 0);
  });

  await t.test('Webhook: firma, método, tipo y errores', async () => {
    const mp = fakeMercadoPago();
    await seedTrip('trip-webhook');
    mp.payments.set('5001', payment(5001, 'trip-webhook', 'approved'));
    const webhook = createWebhookHandler({
      db, getClient: () => mp.client, getSecret: () => SECRET, FieldValue, logger: quietLogger,
    });

    let res = fakeResponse();
    await webhook(signedRequest('5001', { secret: 'clave-falsa' }), res);
    assert.equal(res.statusCode, 401);
    assert.equal((await readTrip('trip-webhook')).status, 'completed');

    res = fakeResponse();
    await webhook(signedRequest('5001', { method: 'GET' }), res);
    assert.equal(res.statusCode, 405);

    res = fakeResponse();
    await webhook(signedRequest('5001', { type: 'merchant_order' }), res);
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.action, 'ignored_type');

    res = fakeResponse();
    await webhook(signedRequest('5001'), res);
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.action, 'approved');
    assert.equal((await readTrip('trip-webhook')).status, 'paid');
    assert.equal((await db.collection('paymentEvents').doc('5001_approved').get()).data().signature, 'valid');

    // Error transitorio de la API: 500 para que Mercado Pago reintente.
    const failing = createWebhookHandler({
      db,
      getClient: () => ({ getPayment: async () => { throw new Error('timeout'); } }),
      getSecret: () => SECRET,
      FieldValue,
      logger: quietLogger,
    });
    res = fakeResponse();
    await failing(signedRequest('5002'), res);
    assert.equal(res.statusCode, 500);

    // Modo report: una firma no válida se registra y el pago se confirma con la API.
    await seedTrip('trip-report');
    mp.payments.set('5003', payment(5003, 'trip-report', 'approved'));
    const reporting = createWebhookHandler({
      db, getClient: () => mp.client, getSecret: () => SECRET, FieldValue, signatureMode: 'report', logger: quietLogger,
    });
    res = fakeResponse();
    await reporting(signedRequest('5003', { secret: 'clave-falsa' }), res);
    assert.equal(res.statusCode, 200);
    assert.equal((await db.collection('paymentEvents').doc('5003_approved').get()).data().signature, 'invalid');
  });

  await t.test('Retorno del checkout: confirma con la API, no con la URL', async () => {
    const mp = fakeMercadoPago();
    await seedTrip('trip-return');
    mp.payments.set('6001', payment(6001, 'trip-return', 'approved'));
    const paymentReturn = createReturnHandler({ db, getClient: () => mp.client, FieldValue, logger: quietLogger });

    let res = fakeResponse();
    await paymentReturn({ query: { payment_id: '6001', status: 'approved', external_reference: 'trip-return' } }, res);
    assert.equal(res.statusCode, 200);
    assert.match(res.body, /Pago aprobado/);
    assert.equal((await readTrip('trip-return')).status, 'paid');

    // Parámetros falsificados: un pago inexistente no cambia nada.
    await seedTrip('trip-return-fake');
    res = fakeResponse();
    await paymentReturn({ query: { payment_id: '6999', status: 'approved', external_reference: 'trip-return-fake' } }, res);
    assert.match(res.body, /confirmando/);
    assert.equal((await readTrip('trip-return-fake')).status, 'completed');

    // HTML escapado.
    res = fakeResponse();
    await paymentReturn({ query: { payment_id: '<script>' } }, res);
    assert.doesNotMatch(res.body, /<script>/);
  });

  // AI-assisted: see docs/AI_LOG.md #38
  await t.test('MODO DEMOSTRACIÓN: checkout simulado, aprobación y marcas "demo"', async () => {
    await seedTrip('trip-demo', { tip: 2000 });
    const demoClient = createDemoPaymentClient({
      db, FieldValue, checkoutBaseUrl: 'http://192.168.1.5:5002/proyecto/us-central1',
    });
    const createCheckout = createCheckoutHandler({
      db, getClient: () => demoClient, FieldValue, Timestamp,
      notificationUrl: 'https://x', extraTripFields: { paymentMode: 'demo' },
    });

    const checkout = await createCheckout({ uid: DRIVER, tripId: 'trip-demo', amount: 28900 });
    assert.match(checkout.checkoutUrl, /^http:\/\/192\.168\.1\.5:5002\/proyecto\/us-central1\/demoCheckout\?pref=DEMO-/);
    assert.equal((await readTrip('trip-demo')).paymentMode, 'demo');

    const preferenceId = new URL(checkout.checkoutUrl).searchParams.get('pref');
    const demoCheckout = createDemoCheckoutHandler({
      db, FieldValue, getClient: () => demoClient, createDemoPayment,
      demoPaymentIdPattern: DEMO_PAYMENT_ID_PATTERN, logger: quietLogger,
    });

    let res = fakeResponse();
    await demoCheckout({ method: 'GET', query: { pref: preferenceId } }, res);
    assert.equal(res.statusCode, 200);
    assert.match(res.body, /MODO DEMOSTRACIÓN/);
    assert.match(res.body, /No es Mercado Pago/);
    assert.match(res.body, /28\.900/);

    res = fakeResponse();
    await demoCheckout({ method: 'POST', query: {}, body: { pref: preferenceId, result: 'approved' } }, res);
    assert.equal(res.statusCode, 200);
    assert.match(res.body, /Pago de demostración aprobado/);

    const trip = await readTrip('trip-demo');
    assert.equal(trip.status, 'paid');
    assert.equal(trip.paymentStatus, 'approved');
    assert.equal(trip.paymentMode, 'demo');
    assert.match(trip.paymentId, /^DEMO-/);

    const entries = await ledgerEntries('trip-demo');
    assert.equal(entries.length, 1);
    assert.equal(entries[0].paymentMode, 'demo');
    assert.equal(entries[0].driverEarnings, trip.driverEarnings);

    // Repetir la aprobación no duplica la ganancia.
    res = fakeResponse();
    await demoCheckout({ method: 'POST', query: {}, body: { pref: preferenceId, result: 'approved' } }, res);
    assert.equal((await ledgerEntries('trip-demo')).length, 1);
  });

  await t.test('MODO DEMOSTRACIÓN: el flujo real no acepta pagos DEMO y el checkout valida sus datos', async () => {
    const demoClient = createDemoPaymentClient({ db, FieldValue, checkoutBaseUrl: 'http://127.0.0.1:5002/p/us-central1' });
    await seedTrip('trip-demo-real');
    const payment = await createDemoPayment({
      db, FieldValue,
      preferenceId: (await demoClient.createPreference({
        items: [{ unit_price: 26900, currency_id: 'COP' }], external_reference: 'trip-demo-real', metadata: { driver_id: DRIVER },
      })).id,
      result: 'approved',
    });

    // El webhook real (patrón numérico) no aplica un ID DEMO.
    const result = await processPayment({ db, client: demoClient, FieldValue, paymentId: payment.id, source: 'webhook' });
    assert.equal(result.action, 'invalid_payment_id');
    assert.equal((await readTrip('trip-demo-real')).status, 'completed');

    const demoCheckout = createDemoCheckoutHandler({
      db, FieldValue, getClient: () => demoClient, createDemoPayment,
      demoPaymentIdPattern: DEMO_PAYMENT_ID_PATTERN, logger: quietLogger,
    });
    let res = fakeResponse();
    await demoCheckout({ method: 'GET', query: { pref: '../trips' } }, res);
    assert.equal(res.statusCode, 400);
    res = fakeResponse();
    await demoCheckout({ method: 'GET', query: { pref: 'DEMO-00000000' } }, res);
    assert.equal(res.statusCode, 404);
    await assert.rejects(createDemoPayment({ db, FieldValue, preferenceId: 'x', result: 'approved-falso' }), /no válido/);
  });
});
