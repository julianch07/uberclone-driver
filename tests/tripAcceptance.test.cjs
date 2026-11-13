
// AI-assisted: see docs/AI_LOG.md #15
const fs = require('node:fs');
const { test } = require('node:test');
const assert = require('node:assert/strict');

const {
  initializeTestEnvironment,
} = require('@firebase/rules-unit-testing');

let doc;
let getDoc;
let setDoc;

test('Integración real de aceptación de viajes', async () => {
  const { createRequire } = require('node:module');
  const { pathToFileURL } = require('node:url');
  const { resolve } = require('node:path');

  const servicePath = resolve('src/services/tripAcceptance.js');
  const serviceSource = fs.readFileSync(servicePath, 'utf8');

  const compatibleSource = serviceSource.replace(
    "import { doc, runTransaction } from 'firebase/firestore';",
    "const { doc, runTransaction } = require('firebase/firestore');"
  );

  assert.notEqual(compatibleSource, serviceSource);

  const serviceModule = { exports: {} };
  const serviceRequire = createRequire(pathToFileURL(servicePath));

  const serviceFactory = new Function(
    'require',
    'module',
    'exports',
    compatibleSource.replace(
      'export async function acceptTripWithDatabase',
      'async function acceptTripWithDatabase'
    ) + '\nmodule.exports = { acceptTripWithDatabase };'
  );

  serviceFactory(
    serviceRequire,
    serviceModule,
    serviceModule.exports
  );

  const { acceptTripWithDatabase } = serviceModule.exports;

  ({ doc, getDoc, setDoc } = require('firebase/firestore'));

  const environment = await initializeTestEnvironment({
    projectId: 'demo-uberclone-driver',
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

      await setDoc(doc(database, 'drivers', 'driver-integration'), {
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
      });

      await setDoc(doc(database, 'trips', 'trip-integration'), {
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
      });
    });

    const context = environment.authenticatedContext(
      'driver-integration'
    );

    const result = await acceptTripWithDatabase(
      context.firestore(),
      'trip-integration',
      'driver-integration'
    );

    assert.equal(result, 'trip-integration');

    await environment.withSecurityRulesDisabled(async (adminContext) => {
      const snapshot = await getDoc(
        doc(adminContext.firestore(), 'trips', 'trip-integration')
      );

      assert.equal(snapshot.data().status, 'accepted');
      assert.equal(snapshot.data().driverId, 'driver-integration');
    });
  } finally {
    await environment.cleanup();
  }
});
