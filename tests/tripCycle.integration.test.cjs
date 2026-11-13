// AI-assisted: see docs/AI_LOG.md #23
// Ciclo completo de viajes con los servicios reales de la aplicación
// (tripService, tripAcceptance, tripLifecycle) contra el emulador de
// Firestore y las reglas locales: aceptar, recuperar el viaje activo,
// iniciar, finalizar, cancelar y consultar historial/ganancias.
const fs = require('node:fs');
const { test } = require('node:test');
const assert = require('node:assert/strict');

const {
  initializeTestEnvironment,
  assertFails,
} = require('@firebase/rules-unit-testing');
const firestore = require('firebase/firestore');
const { loadModule } = require('./helpers/loadModule.cjs');

const { doc, getDoc, setDoc, updateDoc } = firestore;

const {
  acceptTrip,
  findActiveDriverTrip,
  startTrip,
  completeTrip,
  cancelTrip,
  getDriverTripHistory,
} = loadModule('src/services/tripService.js', {
  'firebase/firestore': firestore,
  // Cada llamada recibe la base de datos del emulador como parámetro.
  '../config/firebase': { db: null },
});

// AI-assisted: see docs/AI_LOG.md #27
const { calculateFare, getTripEarnings } = loadModule('src/utils/fareLogic.js');

const DRIVER = 'driver-cycle';
const OTHER_DRIVER = 'driver-cycle-other';

function representativeDriver(overrides = {}) {
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
    ...overrides,
  };
}

function pendingTrip(estimatedFare, extra = {}) {
  return {
    status: 'pending',
    driverId: null,
    pickup: {
      address: 'Centro Comercial Santafé, Medellín',
      latitude: 6.1967,
      longitude: -75.5732,
    },
    destination: {
      address: 'Parque de El Poblado, Medellín',
      latitude: 6.2095,
      longitude: -75.57,
    },
    estimatedFare,
    createdAt: new Date(),
    ...extra,
  };
}

// AI-assisted: see docs/AI_LOG.md #27
// Viaje con datos de recorrido (como los que entregaría Distance Matrix):
// ejemplo de la guía en categoría XL, con propina de 1.000 COP.
const PRICED_INPUTS = { distanceKm: 8.5, durationMin: 22, category: 'xl', tip: 1000 };

test('Ciclo completo de viajes con servicios reales', async (t) => {
  const environment = await initializeTestEnvironment({
    projectId: 'demo-uberclone-driver-cycle',
    firestore: {
      host: '127.0.0.1',
      port: 8080,
      rules: fs.readFileSync('firestore.rules', 'utf8'),
    },
  });

  try {
    await environment.clearFirestore();

    await environment.withSecurityRulesDisabled(async (context) => {
      const database = context.firestore();

      await setDoc(doc(database, 'drivers', DRIVER), representativeDriver());
      await setDoc(
        doc(database, 'drivers', OTHER_DRIVER),
        representativeDriver()
      );
      await setDoc(doc(database, 'trips', 'trip-complete'), pendingTrip(20000));
      await setDoc(doc(database, 'trips', 'trip-cancel'), pendingTrip(12000));
      // AI-assisted: see docs/AI_LOG.md #27
      await setDoc(
        doc(database, 'trips', 'trip-priced'),
        pendingTrip(calculateFare(PRICED_INPUTS).fare, PRICED_INPUTS)
      );
      await setDoc(
        doc(database, 'trips', 'trip-concurrent'),
        pendingTrip(calculateFare(PRICED_INPUTS).fare, PRICED_INPUTS)
      );
      // Viaje finalizado antes del módulo de tarifas: sin desglose guardado.
      await setDoc(
        doc(database, 'trips', 'trip-legacy-completed'),
        pendingTrip(10000, {
          status: 'completed',
          driverId: DRIVER,
          completedAt: new Date('2026-11-12T10:00:00.000Z'),
        })
      );
    });

    async function readTrip(tripId) {
      let data;
      await environment.withSecurityRulesDisabled(async (context) => {
        data = (await getDoc(doc(context.firestore(), 'trips', tripId))).data();
      });
      return data;
    }

    const database = environment.authenticatedContext(DRIVER).firestore();

    await t.test('Acepta, recupera, inicia y finaliza un viaje', async () => {
      await acceptTrip('trip-complete', DRIVER, database);

      const active = await findActiveDriverTrip(DRIVER, database);
      assert.equal(active.id, 'trip-complete');
      assert.equal(active.status, 'accepted');

      await startTrip('trip-complete', DRIVER, database);
      assert.equal(
        (await findActiveDriverTrip(DRIVER, database)).status,
        'in_progress'
      );

      await completeTrip('trip-complete', DRIVER, database);
      assert.equal(await findActiveDriverTrip(DRIVER, database), null);

      // AI-assisted: see docs/AI_LOG.md #27
      // Sin datos de recorrido: se conserva estimatedFare.
      const stored = await readTrip('trip-complete');
      assert.equal(stored.fare, 20000);
      assert.equal(stored.commission, 4000);
      assert.equal(stored.driverEarnings, 16000);
      assert.equal(stored.fareSource, 'estimated');
    });

    // AI-assisted: see docs/AI_LOG.md #27
    await t.test('Finaliza un viaje con datos de recorrido y guarda el desglose', async () => {
      await acceptTrip('trip-priced', DRIVER, database);
      await startTrip('trip-priced', DRIVER, database);
      await completeTrip('trip-priced', DRIVER, database);

      const stored = await readTrip('trip-priced');
      assert.equal(stored.status, 'completed');
      assert.equal(stored.fare, 26900);
      assert.equal(stored.commission, 5380);
      assert.equal(stored.commissionRate, 0.2);
      assert.equal(stored.tip, 1000);
      assert.equal(stored.driverEarnings, 22520);
      assert.equal(stored.fareSource, 'calculated');
    });

    await t.test('Reintentar la finalización no duplica ni altera el desglose', async () => {
      const before = await readTrip('trip-priced');

      assert.equal(await completeTrip('trip-priced', DRIVER, database), 'trip-priced');

      const after = await readTrip('trip-priced');
      assert.deepEqual(after, before);
    });

    await t.test('Dos finalizaciones simultáneas producen un único desglose', async () => {
      await acceptTrip('trip-concurrent', DRIVER, database);
      await startTrip('trip-concurrent', DRIVER, database);

      const results = await Promise.allSettled([
        completeTrip('trip-concurrent', DRIVER, database),
        completeTrip('trip-concurrent', DRIVER, database),
      ]);

      assert.deepEqual(results.map((result) => result.status), ['fulfilled', 'fulfilled']);

      const stored = await readTrip('trip-concurrent');
      assert.equal(stored.status, 'completed');
      assert.equal(stored.driverEarnings, 22520);
    });

    await t.test('Acepta y cancela un viaje', async () => {
      await acceptTrip('trip-cancel', DRIVER, database);
      await cancelTrip('trip-cancel', DRIVER, database);
      assert.equal(await findActiveDriverTrip(DRIVER, database), null);
    });

    await t.test('El historial y las ganancias incluyen los viajes finalizados', async () => {
      const history = await getDriverTripHistory(DRIVER, undefined, database);

      assert.deepEqual(
        history.map((trip) => [trip.id, trip.status]).sort(),
        [
          ['trip-cancel', 'cancelled'],
          ['trip-complete', 'completed'],
          ['trip-concurrent', 'completed'],
          ['trip-legacy-completed', 'completed'],
          ['trip-priced', 'completed'],
        ]
      );

      // AI-assisted: see docs/AI_LOG.md #27
      // Mismo cálculo que EarningsScreen y PaymentSummaryScreen: desglose
      // guardado o, en viajes antiguos, comisión sobre estimatedFare.
      const completed = history.filter((trip) => trip.status === 'completed');
      const earnings = completed.reduce(
        (total, trip) => total + getTripEarnings(trip).driverEarnings,
        0
      );

      // 16.000 (estimado) + 22.520 × 2 (calculados con propina) + 8.000 (antiguo).
      assert.equal(earnings, 16000 + 22520 * 2 + 8000);
      assert.equal(
        getTripEarnings(completed.find((trip) => trip.id === 'trip-legacy-completed')).source,
        'legacy'
      );
    });

    await t.test('El historial se puede consultar estando desconectado', async () => {
      await updateDoc(doc(database, 'drivers', DRIVER), {
        isOnline: false,
        availabilityUpdatedAt: firestore.serverTimestamp(),
      });

      const history = await getDriverTripHistory(DRIVER, undefined, database);
      assert.equal(history.length, 5);
    });

    await t.test('Otro conductor no puede consultar este historial', async () => {
      const otherDatabase = environment
        .authenticatedContext(OTHER_DRIVER)
        .firestore();

      await assertFails(
        getDriverTripHistory(DRIVER, undefined, otherDatabase)
      );
    });
  } finally {
    await environment.cleanup();
  }
});
