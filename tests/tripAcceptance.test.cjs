
// AI-assisted: see docs/AI_LOG.md #15
// AI-assisted: see docs/AI_LOG.md #23
// Ejecuta el servicio real de aceptación contra el emulador con las reglas
// locales. El servicio se carga con loadModule (Babel) porque ahora importa
// también ../utils/tripLogic.
const fs = require('node:fs');
const { test } = require('node:test');
const assert = require('node:assert/strict');

const {
  initializeTestEnvironment,
} = require('@firebase/rules-unit-testing');
const firestore = require('firebase/firestore');
const { loadModule } = require('./helpers/loadModule.cjs');

const { doc, getDoc, setDoc } = firestore;

const { acceptTripWithDatabase } = loadModule(
  'src/services/tripAcceptance.js',
  { 'firebase/firestore': firestore }
);

// Datos representativos de un conductor real registrado desde la app.
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

function pendingTrip(overrides = {}) {
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
    estimatedFare: 15000,
    createdAt: new Date(),
    ...overrides,
  };
}

test('Integración real de aceptación de viajes', async (t) => {
  const environment = await initializeTestEnvironment({
    projectId: 'demo-uberclone-driver-acceptance',
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
      const { driverId, ...tripWithoutDriver } = pendingTrip();

      await setDoc(
        doc(database, 'drivers', 'driver-integration'),
        representativeDriver()
      );
      await setDoc(doc(database, 'trips', 'trip-integration'), pendingTrip());
      await setDoc(
        doc(database, 'trips', 'trip-no-driver-field'),
        tripWithoutDriver
      );
      await setDoc(
        doc(database, 'trips', 'trip-string-fare'),
        pendingTrip({ estimatedFare: '15000' })
      );
    });

    const database = environment
      .authenticatedContext('driver-integration')
      .firestore();

    async function readTrip(tripId) {
      let data;

      await environment.withSecurityRulesDisabled(async (adminContext) => {
        const snapshot = await getDoc(
          doc(adminContext.firestore(), 'trips', tripId)
        );
        data = snapshot.data();
      });

      return data;
    }

    await t.test('Acepta un viaje pendiente con driverId null', async () => {
      const result = await acceptTripWithDatabase(
        database,
        'trip-integration',
        'driver-integration'
      );

      assert.equal(result, 'trip-integration');

      const trip = await readTrip('trip-integration');
      assert.equal(trip.status, 'accepted');
      assert.equal(trip.driverId, 'driver-integration');
    });

    await t.test('Acepta un viaje creado sin el campo driverId', async () => {
      await acceptTripWithDatabase(
        database,
        'trip-no-driver-field',
        'driver-integration'
      );

      const trip = await readTrip('trip-no-driver-field');
      assert.equal(trip.status, 'accepted');
      assert.equal(trip.driverId, 'driver-integration');
    });

    await t.test('Rechaza un viaje mal formado con un mensaje claro', async () => {
      await assert.rejects(
        acceptTripWithDatabase(
          database,
          'trip-string-fare',
          'driver-integration'
        ),
        /datos incompletos o inválidos/
      );

      const trip = await readTrip('trip-string-fare');
      assert.equal(trip.status, 'pending');
      assert.equal(trip.driverId, null);
    });

    await t.test('No vuelve a aceptar un viaje ya asignado', async () => {
      await assert.rejects(
        acceptTripWithDatabase(
          database,
          'trip-integration',
          'driver-integration'
        ),
        /ya fue aceptado/
      );
    });
  } finally {
    await environment.cleanup();
  }
});
