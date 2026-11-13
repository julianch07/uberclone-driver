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

const { doc, setDoc, updateDoc } = firestore;

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

const { calculateFareBreakdown } = loadModule('src/utils/fareLogic.js');

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

function pendingTrip(estimatedFare) {
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
  };
}

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
    });

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
        [['trip-cancel', 'cancelled'], ['trip-complete', 'completed']]
      );

      // Mismo cálculo que EarningsScreen y PaymentSummaryScreen.
      const earnings = history
        .filter((trip) => trip.status === 'completed')
        .reduce(
          (total, trip) =>
            total + calculateFareBreakdown(trip.estimatedFare).driverEarnings,
          0
        );
      assert.equal(earnings, 16000);
    });

    await t.test('El historial se puede consultar estando desconectado', async () => {
      await updateDoc(doc(database, 'drivers', DRIVER), {
        isOnline: false,
        availabilityUpdatedAt: firestore.serverTimestamp(),
      });

      const history = await getDriverTripHistory(DRIVER, undefined, database);
      assert.equal(history.length, 2);
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
