// AI-assisted: see docs/AI_LOG.md #37
// Flujo completo de Mercado Pago en el emulador de Firestore:
//   app (servicios reales, con las reglas) → backend (manejadores reales de
//   functions/ con Admin SDK y una API de Mercado Pago simulada) → app.
// Comprueba que el efectivo sigue funcionando junto a la pasarela.
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const assert = require('node:assert/strict');

const { initializeTestEnvironment } = require('@firebase/rules-unit-testing');
const firestore = require('firebase/firestore');
const { loadModule } = require('./helpers/loadModule.cjs');

const PROJECT_ID = 'demo-uberclone-driver-gateway';
process.env.FIRESTORE_EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080';

// Backend real (functions/) con su propio Admin SDK.
const functionsDir = path.resolve(__dirname, '..', 'functions');
const fromFunctions = (name) => require(require.resolve(name, { paths: [functionsDir] }));
const { initializeApp: initializeAdminApp } = fromFunctions('firebase-admin/app');
const { FieldValue, Timestamp, getFirestore: getAdminFirestore } = fromFunctions('firebase-admin/firestore');
const backend = require(path.join(functionsDir, 'src/handlers.js'));

const services = loadModule('src/services/tripService.js', {
  'firebase/firestore': firestore,
  '../config/firebase': { db: null },
});
const { calculateFare } = loadModule('src/utils/fareLogic.js');

const DRIVER = 'driver-gateway';
const PRICING = { distanceKm: 8.5, durationMin: 22, category: 'xl', tip: 2000 };

function driverProfile() {
  const expiry = new Date();
  expiry.setFullYear(expiry.getFullYear() + 2);
  return {
    personalData: {
      profilePhoto: 'https://example.com/p.jpg', fullName: 'Conductor Pasarela', identityDocument: '1234567',
      phone: '3001234567', birthDate: '1995-01-01T05:00:00.000Z', gender: 'M', email: 'c@example.com', language: 'Español',
    },
    vehicleData: {
      vehiclePhoto: 'https://example.com/v.jpg', category: 'XL', plate: 'MPG123', make: 'Renault',
      model: 'Duster', year: '2023', color: 'Blanco', passengerCapacity: '6',
    },
    documentsData: {
      licenseNumber: '1', licensePhoto: 'https://example.com/l.jpg', licenseExpiration: expiry.toISOString(),
      soatPhoto: 'https://example.com/s.jpg', soatExpiration: expiry.toISOString(),
      mercadoPagoEmail: 'c@example.com', acceptedTerms: true,
    },
    approvalStatus: 'approved',
    registrationCompletedAt: new Date(),
    isOnline: true,
  };
}

function request(paymentMethod) {
  return {
    status: 'pending',
    driverId: null,
    pickup: { address: 'Parque Lleras', latitude: 6.2088, longitude: -75.5675 },
    destination: { address: 'Jardín Botánico', latitude: 6.2708, longitude: -75.564 },
    ...PRICING,
    estimatedFare: calculateFare(PRICING).fare,
    paymentMethod,
    createdAt: new Date(),
  };
}

// onSnapshot puede entregar primero la caché local; se espera al primer
// resultado que cumpla la condición (por defecto, el primero).
function firstSnapshot(subscribe, predicate = () => true, timeoutMs = 5000) {
  return new Promise((resolve, reject) => {
    let unsubscribe = () => {};
    const timer = setTimeout(() => {
      unsubscribe();
      reject(new Error('No llegó el resultado esperado del listener.'));
    }, timeoutMs);
    unsubscribe = subscribe(
      (data) => {
        if (!predicate(data)) return;
        clearTimeout(timer);
        setTimeout(() => unsubscribe(), 0);
        resolve(data);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      }
    );
  });
}

test('Mercado Pago de extremo a extremo (emulador)', async (t) => {
  const environment = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: { host: '127.0.0.1', port: 8080, rules: fs.readFileSync('firestore.rules', 'utf8') },
  });
  initializeAdminApp({ projectId: PROJECT_ID }, 'gateway-backend');
  const { getApp } = fromFunctions('firebase-admin/app');
  const adminDb = getAdminFirestore(getApp('gateway-backend'));
  const gatewayService = loadModule('src/services/gatewayPaymentService.js', {
    'firebase/firestore': firestore,
    'firebase/functions': { httpsCallable: () => async () => ({ data: {} }) },
    'expo-web-browser': { openBrowserAsync: async () => ({ type: 'opened' }) },
    '../config/firebase': { db: null, functions: null },
  });

  // API de Mercado Pago simulada.
  const preferences = [];
  const payments = new Map();
  const mp = {
    async createPreference(body) {
      preferences.push(body);
      return { id: `pref-${preferences.length}`, init_point: `https://checkout.example.test/${preferences.length}` };
    },
    async getPayment(id) {
      return payments.get(String(id)) || null;
    },
  };

  try {
    await environment.clearFirestore();
    await environment.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore();
      await firestore.setDoc(firestore.doc(db, 'drivers', DRIVER), driverProfile());
      await firestore.setDoc(firestore.doc(db, 'trips', 'trip-mp'), request('mercadopago'));
      await firestore.setDoc(firestore.doc(db, 'trips', 'trip-cash'), request('cash'));
    });

    const db = environment.authenticatedContext(DRIVER).firestore();

    await t.test('La app recorre el ciclo y el viaje queda pendiente de cobro con Mercado Pago', async () => {
      for (const tripId of ['trip-mp', 'trip-cash']) {
        await services.createTripOffer(DRIVER, tripId, db);
        await services.acceptTrip(tripId, DRIVER, db);
        await services.markDriverArriving(tripId, DRIVER, db);
        await services.markArrivedAtPickup(tripId, DRIVER, db);
        await services.startTrip(tripId, DRIVER, db);
        await services.completeTrip(tripId, DRIVER, db);
      }

      const pending = await firstSnapshot((onData, onError) =>
        gatewayService.subscribeToPendingGatewayTrips(DRIVER, onData, onError, db)
      );
      assert.deepEqual(pending.map((trip) => trip.id), ['trip-mp']);
      assert.equal(pending[0].fare + pending[0].tip, 26900 + 2000);

      // El conductor no puede marcar como pagado el viaje digital.
      await assert.rejects(services.registerCashPayment('trip-mp', DRIVER, db));
    });

    await t.test('El backend crea la preferencia con el monto guardado', async () => {
      const createCheckout = backend.createCheckoutHandler({
        db: adminDb, getClient: () => mp, FieldValue, Timestamp,
        notificationUrl: 'https://fn.example.test/mercadoPagoWebhook',
      });
      const checkout = await createCheckout({ uid: DRIVER, tripId: 'trip-mp', amount: 28900 });

      assert.equal(checkout.amount, 28900);
      assert.equal(preferences[0].items[0].unit_price, 28900);
      assert.equal(preferences[0].external_reference, 'trip-mp');
    });

    await t.test('Pago aprobado: la app ve el viaje pagado y el saldo con la ganancia', async () => {
      // Antes: comisión de efectivo pendiente (se registra el cobro en efectivo).
      await services.registerCashPayment('trip-cash', DRIVER, db);

      payments.set('7001', {
        id: 7001,
        status: 'approved',
        external_reference: 'trip-mp',
        currency_id: 'COP',
        transaction_amount: 28900,
        metadata: { driver_id: DRIVER },
      });

      const result = await backend.processPayment({
        db: adminDb, client: mp, FieldValue, paymentId: '7001', source: 'webhook', signature: 'valid',
      });
      assert.equal(result.action, 'approved');

      const trip = await firstSnapshot(
        (onData, onError) => gatewayService.subscribeToGatewayTrip('trip-mp', onData, onError, db),
        (item) => item?.status === 'paid'
      );
      assert.equal(trip.status, 'paid');
      assert.equal(trip.paymentStatus, 'approved');
      assert.equal(trip.paymentId, '7001');

      const stillPending = await firstSnapshot(
        (onData, onError) => gatewayService.subscribeToPendingGatewayTrips(DRIVER, onData, onError, db),
        (items) => items.length === 0
      );
      assert.equal(stillPending.length, 0);

      // Saldo calculado en el servidor, con las reglas del conductor.
      const balance = await services.getDriverBalanceTotals(DRIVER, db);
      const cashTrip = (await firestore.getDoc(firestore.doc(db, 'trips', 'trip-cash'))).data();
      assert.equal(balance.tripCount, 1);
      assert.equal(balance.pendingCommission, cashTrip.commission);
      assert.equal(balance.gatewayTripCount, 1);
      assert.equal(balance.gatewayEarnings, trip.driverEarnings);
      assert.equal(balance.balance, trip.driverEarnings - cashTrip.commission);

      // Historial: ambos viajes pagados, con su etiqueta.
      const history = await services.getDriverTripHistory(DRIVER, undefined, db);
      const statuses = Object.fromEntries(history.map((item) => [item.id, `${item.status}/${item.paymentStatus}`]));
      assert.equal(statuses['trip-mp'], 'paid/approved');
      assert.equal(statuses['trip-cash'], 'paid/cash');
    });
  } finally {
    await environment.cleanup();
  }
});
