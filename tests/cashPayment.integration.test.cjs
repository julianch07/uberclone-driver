// AI-assisted: see docs/AI_LOG.md #29
// Cobro en efectivo y saldo del conductor con los servicios reales de la app
// contra el emulador de Firestore y las reglas locales.
const fs = require('node:fs');
const { test } = require('node:test');
const assert = require('node:assert/strict');

const { initializeTestEnvironment } = require('@firebase/rules-unit-testing');
const firestore = require('firebase/firestore');
const { loadModule } = require('./helpers/loadModule.cjs');

const { doc, getDoc, getDocs, collection, setDoc } = firestore;

const services = loadModule('src/services/tripService.js', {
  'firebase/firestore': firestore,
  '../config/firebase': { db: null },
});
const { buildCompletionBreakdown, calculateFare, getTripEarnings } = loadModule('src/utils/fareLogic.js');
const { summarizeDriverBalance } = loadModule('src/utils/cashPaymentLogic.js');

const DRIVER = 'driver-cash';
const OTHER = 'driver-cash-other';
const PRICING = { distanceKm: 8.5, durationMin: 22, category: 'economy', tip: 1000 };

function representativeDriver() {
  return {
    personalData: {
      profilePhoto: 'https://example.com/profile.jpg',
      fullName: 'Paula Andrea Muñoz correa',
      identityDocument: '1234567890',
      phone: '3001234567',
      birthDate: '2005-11-05T05:00:00.000Z',
      gender: 'Femenino',
      email: 'test@example.com',
      language: 'Español',
    },
    vehicleData: {
      vehiclePhoto: 'https://example.com/vehicle.jpg',
      category: 'Premium',
      plate: 'GHC238',
      make: 'Renault',
      model: 'Kwid 2024',
      year: '2025',
      color: 'Amarillo',
      passengerCapacity: '3',
    },
    documentsData: {
      licenseNumber: '123456789',
      licensePhoto: 'https://example.com/license.jpg',
      licenseExpiration: '2028-12-11T22:49:36.000Z',
      soatPhoto: 'https://example.com/soat.jpg',
      soatExpiration: '2029-02-15T22:49:51.000Z',
      technicalReviewPhoto: '',
      technicalReviewExpiration: '',
      mercadoPagoEmail: 'test@example.com',
      acceptedTerms: true,
    },
    approvalStatus: 'approved',
    registrationCompletedAt: new Date('2026-11-12T13:54:40.000Z'),
    isOnline: true,
  };
}

function baseTrip(overrides = {}) {
  return {
    status: 'pending',
    driverId: null,
    pickup: { address: 'Parque de Berrío', latitude: 6.2518, longitude: -75.5636 },
    destination: { address: 'Estadio', latitude: 6.2565, longitude: -75.5905 },
    ...PRICING,
    estimatedFare: calculateFare(PRICING).fare,
    paymentMethod: 'cash',
    createdAt: new Date(),
    ...overrides,
  };
}

// Viaje ya finalizado con el desglose del módulo de tarifas.
function completedTrip(overrides = {}) {
  const trip = baseTrip({ status: 'completed', driverId: DRIVER, completedAt: new Date() });
  return { ...trip, ...buildCompletionBreakdown(trip), ...overrides };
}

test('Cobros en efectivo con servicios reales', async (t) => {
  const environment = await initializeTestEnvironment({
    projectId: 'demo-uberclone-driver-cash',
    firestore: {
      host: '127.0.0.1',
      port: 8080,
      rules: fs.readFileSync('firestore.rules', 'utf8'),
    },
  });

  async function admin(callback) {
    let result;
    await environment.withSecurityRulesDisabled(async (context) => {
      result = await callback(context.firestore());
    });
    return result;
  }

  const readTrip = (tripId) => admin(async (db) => (await getDoc(doc(db, 'trips', tripId))).data());
  const readLedger = (driverId) =>
    admin(async (db) =>
      (await getDocs(collection(db, 'drivers', driverId, 'ledgerEntries'))).docs.map((item) => ({
        id: item.id,
        ...item.data(),
      }))
    );

  // Espera la primera instantánea que cumpla la condición: onSnapshot puede
  // entregar primero los datos de la caché local y luego los del servidor.
  function waitForSnapshot(subscribe, predicate, timeoutMs = 5000) {
    return new Promise((resolve, reject) => {
      let unsubscribe = () => {};
      const timer = setTimeout(() => {
        unsubscribe();
        reject(new Error('No llegó la instantánea esperada.'));
      }, timeoutMs);

      unsubscribe = subscribe(
        (data) => {
          if (!predicate(data)) return;
          clearTimeout(timer);
          unsubscribe();
          resolve(data);
        },
        (error) => {
          clearTimeout(timer);
          reject(error);
        }
      );
    });
  }

  function firstSnapshot(subscribe) {
    return new Promise((resolve, reject) => {
      const unsubscribe = subscribe(
        (data) => {
          unsubscribe();
          resolve(data);
        },
        reject
      );
    });
  }

  try {
    await environment.clearFirestore();

    await admin(async (db) => {
      await setDoc(doc(db, 'drivers', DRIVER), representativeDriver());
      await setDoc(doc(db, 'drivers', OTHER), representativeDriver());
      await setDoc(doc(db, 'trips', 'trip-cycle'), baseTrip());
      await setDoc(doc(db, 'trips', 'trip-double'), completedTrip());
      await setDoc(doc(db, 'trips', 'trip-digital'), completedTrip({ paymentMethod: 'mercadopago' }));
      await setDoc(doc(db, 'trips', 'trip-progress'), completedTrip({ status: 'in_progress', completedAt: null }));
      await setDoc(doc(db, 'trips', 'trip-legacy'), baseTrip({ status: 'completed', driverId: DRIVER }));
    });

    const db = environment.authenticatedContext(DRIVER).firestore();

    await t.test('Ciclo completo hasta el cobro en efectivo', async () => {
      await services.createTripOffer(DRIVER, 'trip-cycle', db);
      await services.acceptTrip('trip-cycle', DRIVER, db);
      await services.markDriverArriving('trip-cycle', DRIVER, db);
      await services.markArrivedAtPickup('trip-cycle', DRIVER, db);
      await services.startTrip('trip-cycle', DRIVER, db);
      await services.completeTrip('trip-cycle', DRIVER, db);

      // Aparece entre los cobros por confirmar.
      const pending = await waitForSnapshot(
        (onData, onError) => services.subscribeToPendingCashTrips(DRIVER, onData, onError, db),
        (trips) => trips.some((trip) => trip.id === 'trip-cycle')
      );
      assert.ok(pending.some((trip) => trip.id === 'trip-double'));
      assert.ok(!pending.some((trip) => trip.id === 'trip-digital'));
      assert.ok(!pending.some((trip) => trip.id === 'trip-legacy'));

      const result = await services.registerCashPayment('trip-cycle', DRIVER, db);
      assert.deepEqual(result, { tripId: 'trip-cycle', alreadyRegistered: false });

      const trip = await readTrip('trip-cycle');
      assert.equal(trip.status, 'paid');
      assert.equal(trip.paymentStatus, 'cash');
      assert.ok(trip.paidAt);

      const [entry] = (await readLedger(DRIVER)).filter((item) => item.tripId === 'trip-cycle');
      assert.equal(entry.id, 'cash_trip-cycle');
      assert.equal(entry.cashAmount, 19200 + 1000);
      assert.equal(entry.commission, 3840);
      assert.equal(entry.driverEarnings, 15360 + 1000);
      assert.equal(entry.status, 'pending');

      // Ya no figura como pendiente de confirmar.
      const after = await waitForSnapshot(
        (onData, onError) => services.subscribeToPendingCashTrips(DRIVER, onData, onError, db),
        (trips) => !trips.some((item) => item.id === 'trip-cycle')
      );
      assert.ok(after.some((item) => item.id === 'trip-double'));
    });

    await t.test('Reintentar el registro no duplica ni modifica nada', async () => {
      const tripBefore = await readTrip('trip-cycle');
      const ledgerBefore = await readLedger(DRIVER);

      const result = await services.registerCashPayment('trip-cycle', DRIVER, db);
      assert.deepEqual(result, { tripId: 'trip-cycle', alreadyRegistered: true });

      assert.deepEqual(await readTrip('trip-cycle'), tripBefore);
      assert.deepEqual(await readLedger(DRIVER), ledgerBefore);
    });

    await t.test('Doble pulsación simultánea: un solo cobro y un solo asiento', async () => {
      const results = await Promise.allSettled([
        services.registerCashPayment('trip-double', DRIVER, db),
        services.registerCashPayment('trip-double', DRIVER, db),
      ]);

      assert.deepEqual(results.map((result) => result.status), ['fulfilled', 'fulfilled']);
      assert.deepEqual(
        results.map((result) => result.value.alreadyRegistered).sort(),
        [false, true]
      );

      const entries = (await readLedger(DRIVER)).filter((item) => item.tripId === 'trip-double');
      assert.equal(entries.length, 1);
    });

    await t.test('Un pago digital no se registra como efectivo ni genera deuda', async () => {
      await assert.rejects(
        services.registerCashPayment('trip-digital', DRIVER, db),
        /no se paga en efectivo/
      );

      assert.equal((await readTrip('trip-digital')).status, 'completed');
      assert.ok(!(await readLedger(DRIVER)).some((item) => item.tripId === 'trip-digital'));
    });

    await t.test('No se registra el cobro de viajes sin finalizar ni de viajes antiguos', async () => {
      await assert.rejects(
        services.registerCashPayment('trip-progress', DRIVER, db),
        /viaje finalizado/
      );
      await assert.rejects(
        services.registerCashPayment('trip-legacy', DRIVER, db),
        /desglose de tarifa/
      );
      // Un viaje inexistente ni siquiera se puede leer: las reglas lo niegan.
      await assert.rejects(
        services.registerCashPayment('trip-ghost', DRIVER, db),
        (error) => error.code === 'permission-denied'
      );
    });

    await t.test('Otro conductor no puede registrar el cobro', async () => {
      await admin((adminDb) => setDoc(doc(adminDb, 'trips', 'trip-foreign'), completedTrip()));

      // Las reglas no le permiten ni leer el viaje ajeno.
      await assert.rejects(
        services.registerCashPayment('trip-foreign', OTHER, environment.authenticatedContext(OTHER).firestore()),
        (error) => error.code === 'permission-denied'
      );
      assert.equal((await readTrip('trip-foreign')).status, 'completed');
    });

    await t.test('Persistencia: el saldo y el historial se recuperan al reabrir la app', async () => {
      // Un nuevo contexto simula reabrir la aplicación.
      const reopened = environment.authenticatedContext(DRIVER).firestore();

      const entries = await firstSnapshot((onData, onError) =>
        services.subscribeToDriverLedger(DRIVER, onData, onError, reopened)
      );
      const balance = summarizeDriverBalance(entries);

      assert.equal(balance.tripCount, 2);
      assert.equal(balance.cashCollected, 2 * 20200);
      assert.equal(balance.commissionTotal, 2 * 3840);
      assert.equal(balance.pendingCommission, 2 * 3840);
      assert.equal(balance.netEarnings, 2 * 16360);
      assert.equal(balance.balance, -2 * 3840);

      // Historial y ganancias usan los mismos importes que el saldo.
      const history = await services.getDriverTripHistory(DRIVER, undefined, reopened);
      const paid = history.filter((trip) => trip.status === 'paid');
      assert.deepEqual(paid.map((trip) => trip.id).sort(), ['trip-cycle', 'trip-double']);

      for (const trip of paid) {
        const entry = entries.find((item) => item.tripId === trip.id);
        assert.equal(getTripEarnings(trip).driverEarnings, entry.driverEarnings);
        assert.equal(getTripEarnings(trip).commission, entry.commission);
      }
    });

    // AI-assisted: see docs/AI_LOG.md #29
    // --- Completitud: más de 100 asientos y más de 50 cobros pendientes -----

    const VOLUME = 'driver-cash-volume';
    const allVolumeEntries = [];

    await admin(async (adminDb) => {
      const batch = firestore.writeBatch(adminDb);
      batch.set(doc(adminDb, 'drivers', VOLUME), representativeDriver());

      for (let i = 0; i < 130; i += 1) {
        const fare = 10000 + i * 100;
        const tip = i % 7 === 0 ? 500 : 0;
        const commission = Math.floor((fare * 20) / 100 + 0.5);
        const entry = {
          type: 'cash_commission',
          tripId: `old-${i}`,
          // Algunas ya liquidadas (solo posible desde un backend).
          status: i % 5 === 0 ? 'settled' : 'pending',
          currency: 'COP',
          fare,
          tip,
          cashAmount: fare + tip,
          commission,
          commissionRate: 0.2,
          driverEarnings: fare - commission + tip,
          amount: commission,
          createdAt: new Date(Date.UTC(2026, 0, 1) + i * 60_000),
        };
        allVolumeEntries.push(entry);
        batch.set(doc(adminDb, 'drivers', VOLUME, 'ledgerEntries', `cash_old-${i}`), entry);
      }

      const volumeTrip = (overrides) => ({
        ...completedTrip({ driverId: VOLUME }),
        ...overrides,
      });

      for (let i = 0; i < 65; i += 1) {
        batch.set(doc(adminDb, 'trips', `vol-cash-${String(i).padStart(2, '0')}`), volumeTrip({}));
      }
      for (let i = 0; i < 30; i += 1) {
        batch.set(doc(adminDb, 'trips', `vol-digital-${i}`), volumeTrip({ paymentMethod: i % 2 ? 'stripe' : 'mercadopago' }));
      }
      for (let i = 0; i < 10; i += 1) {
        batch.set(doc(adminDb, 'trips', `vol-paid-${i}`), volumeTrip({ status: 'paid', paymentStatus: 'cash' }));
      }
      for (let i = 0; i < 3; i += 1) {
        batch.set(
          doc(adminDb, 'trips', `vol-legacy-${i}`),
          baseTrip({ status: 'completed', driverId: VOLUME })
        );
      }

      await batch.commit();
    });

    const volumeDb = environment.authenticatedContext(VOLUME).firestore();

    await t.test('Saldo completo con más de 100 asientos (agregación en el servidor)', async () => {
      const expected = summarizeDriverBalance(allVolumeEntries);
      const totals = await services.getDriverBalanceTotals(VOLUME, volumeDb);

      assert.deepEqual(totals, expected);
      assert.equal(totals.tripCount, 130);

      // Lo que habría mostrado el enfoque anterior: solo los 100 más recientes.
      const recent = allVolumeEntries.slice(-100);
      assert.notEqual(summarizeDriverBalance(recent).pendingCommission, totals.pendingCommission);
    });

    await t.test('El saldo en tiempo real usa los totales completos y una lista limitada', async () => {
      const { entries, summary } = await firstSnapshot((onData, onError) =>
        services.subscribeToDriverBalance(VOLUME, onData, onError, volumeDb)
      );

      assert.equal(entries.length, 100);
      assert.deepEqual(summary, summarizeDriverBalance(allVolumeEntries));
      assert.ok(summary.tripCount > entries.length);
    });

    await t.test('Recupera todos los cobros pendientes (65) sin digitales, pagados ni antiguos', async () => {
      const pending = await services.fetchPendingCashTrips(VOLUME, volumeDb);
      const ids = pending.map((trip) => trip.id).sort();

      assert.equal(pending.length, 65);
      assert.equal(ids[0], 'vol-cash-00');
      assert.equal(ids[64], 'vol-cash-64');
      assert.ok(pending.every((trip) => trip.paymentMethod === 'cash' && trip.status === 'completed'));

      const live = await waitForSnapshot(
        (onData, onError) => services.subscribeToPendingCashTrips(VOLUME, onData, onError, volumeDb),
        (trips) => trips.length === 65
      );
      assert.equal(live.length, 65);
    });

    await t.test('Un cobro nuevo actualiza el saldo completo y la lista de pendientes', async () => {
      await services.registerCashPayment('vol-cash-30', VOLUME, volumeDb);

      const { summary } = await waitForSnapshot(
        (onData, onError) => services.subscribeToDriverBalance(VOLUME, onData, onError, volumeDb),
        (data) => data.summary.tripCount === 131
      );
      assert.equal(
        summary.pendingCommission,
        summarizeDriverBalance(allVolumeEntries).pendingCommission + 3840
      );

      const pending = await waitForSnapshot(
        (onData, onError) => services.subscribeToPendingCashTrips(VOLUME, onData, onError, volumeDb),
        (trips) => trips.length === 64
      );
      assert.ok(!pending.some((trip) => trip.id === 'vol-cash-30'));
    });

    await t.test('Sin permiso de lectura no se entrega ningún saldo ni lista parcial', async () => {
      const intruderDb = environment.authenticatedContext(OTHER).firestore();

      await assert.rejects(
        services.getDriverBalanceTotals(VOLUME, intruderDb),
        (error) => error.code === 'permission-denied'
      );
      await assert.rejects(
        services.fetchPendingCashTrips(VOLUME, intruderDb),
        (error) => error.code === 'permission-denied'
      );

      const received = [];
      const error = await new Promise((resolve) => {
        const unsubscribe = services.subscribeToDriverBalance(
          VOLUME,
          (data) => received.push(data),
          (failure) => {
            unsubscribe();
            resolve(failure);
          },
          intruderDb
        );
      });

      assert.equal(error.code, 'permission-denied');
      assert.deepEqual(received, []);
    });
  } finally {
    await environment.cleanup();
  }
});
