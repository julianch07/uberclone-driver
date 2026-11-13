// AI-assisted: see docs/AI_LOG.md #15

const fs = require('node:fs');
const { test } = require('node:test');
const assert = require('node:assert/strict');

const {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails,
} = require('@firebase/rules-unit-testing');

const {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  runTransaction,
  where,
  setDoc,
  updateDoc,
  serverTimestamp,
} = require('firebase/firestore');

const PROJECT_ID = 'demo-uberclone-driver';

function validTrip(overrides = {}) {
  return {
    status: 'pending',
    driverId: null,
    pickup: {
      address: 'Parque de Berrío, Medellín',
      latitude: 6.2518,
      longitude: -75.5636,
    },
    destination: {
      address: 'Estadio Atanasio Girardot, Medellín',
      latitude: 6.2565,
      longitude: -75.5905,
    },
    estimatedFare: 15000,
    createdAt: new Date(),
    ...overrides,
  };
}

function validDriver(overrides = {}) {
  const futureDate = new Date();
  futureDate.setFullYear(futureDate.getFullYear() + 5);

  return {
    personalData: {
      profilePhoto: 'https://example.com/profile.jpg',
      fullName: 'Juan Carlos Perez',
      identityDocument: '1234567890',
      phone: '3001234567',
      birthDate: '2000-05-15T00:00:00.000Z',
      gender: 'Masculino',
      email: 'juan@example.com',
      language: 'Español',
    },
    vehicleData: {
      vehiclePhoto: 'https://example.com/vehicle.jpg',
      category: 'Económico',
      plate: 'ABC123',
      make: 'Renault',
      model: 'Logan',
      year: '2022',
      color: 'Blanco',
      passengerCapacity: '4',
    },
    documentsData: {
      licenseNumber: '123456789',
      licensePhoto: 'https://example.com/license.jpg',
      licenseExpiration: futureDate.toISOString(),
      soatPhoto: 'https://example.com/soat.jpg',
      soatExpiration: futureDate.toISOString(),
      technicalReviewPhoto: '',
      technicalReviewExpiration: '',
      mercadoPagoEmail: 'juan@example.com',
      acceptedTerms: true,
    },
    approvalStatus: 'approved',
    registrationCompletedAt: new Date(),
    isOnline: true,
    ...overrides,
  };
}

async function seedDriver(environment, uid, overrides = {}) {
  await environment.withSecurityRulesDisabled(async (context) => {
    const ref = doc(context.firestore(), 'drivers', uid);

    await setDoc(ref, validDriver(overrides));
  });
}

test('Reglas de seguridad de viajes', async (t) => {
  const environment = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      host: '127.0.0.1',
      port: 8080,
      rules: fs.readFileSync('firestore.rules', 'utf8'),
    },
  });

  try {
    await environment.clearFirestore();

    await t.test('Permite consultar viajes pendientes a un conductor habilitado', async () => {
      await seedDriver(environment, 'driver-list-approved');

      await environment.withSecurityRulesDisabled(async (context) => {
        await setDoc(
          doc(context.firestore(), 'trips', 'trip-list-pending'),
          validTrip()
        );
      });

      const context = environment.authenticatedContext('driver-list-approved');

      const pendingTripsQuery = query(
        collection(context.firestore(), 'trips'),
        where('status', '==', 'pending'),
        limit(20)
      );

      const snapshot = await assertSucceeds(getDocs(pendingTripsQuery));

      assert.equal(
        snapshot.docs.some((trip) => trip.id === 'trip-list-pending'),
        true
      );
    });

    await t.test('Impide consultar viajes a un conductor desconectado', async () => {
      await seedDriver(environment, 'driver-list-offline', {
        isOnline: false,
      });

      const context = environment.authenticatedContext('driver-list-offline');

      const pendingTripsQuery = query(
        collection(context.firestore(), 'trips'),
        where('status', '==', 'pending'),
        limit(20)
      );

      await assertFails(getDocs(pendingTripsQuery));
    });

    await t.test('Impide consultar viajes sin filtrar por pendientes', async () => {
      await seedDriver(environment, 'driver-list-unfiltered');

      const context = environment.authenticatedContext('driver-list-unfiltered');

      const unfilteredQuery = query(
        collection(context.firestore(), 'trips'),
        limit(20)
      );

      await assertFails(getDocs(unfilteredQuery));
    });

    await t.test('Impide consultar más de 20 viajes pendientes', async () => {
      await seedDriver(environment, 'driver-list-over-limit');

      const context = environment.authenticatedContext('driver-list-over-limit');

      const oversizedQuery = query(
        collection(context.firestore(), 'trips'),
        where('status', '==', 'pending'),
        limit(21)
      );

      await assertFails(getDocs(oversizedQuery));
    });

    await t.test('Solo un conductor puede aceptar el mismo viaje', async () => {
      await seedDriver(environment, 'driver-race-a');
      await seedDriver(environment, 'driver-race-b');

      await environment.withSecurityRulesDisabled(async (context) => {
        await setDoc(
          doc(context.firestore(), 'trips', 'trip-race'),
          validTrip()
        );
      });

      async function attemptAcceptance(driverId) {
        const context = environment.authenticatedContext(driverId);
        const database = context.firestore();
        const tripRef = doc(database, 'trips', 'trip-race');

        return runTransaction(database, async (transaction) => {
          const snapshot = await transaction.get(tripRef);

          if (!snapshot.exists()) {
            throw new Error('Viaje no disponible');
          }

          const trip = snapshot.data();

          if (trip.status !== 'pending' || trip.driverId != null) {
            throw new Error('Viaje ya aceptado');
          }

          transaction.update(tripRef, {
            status: 'accepted',
            driverId,
          });
        });
      }

      const results = await Promise.allSettled([
        attemptAcceptance('driver-race-a'),
        attemptAcceptance('driver-race-b'),
      ]);

      assert.equal(
        results.filter((result) => result.status === 'fulfilled').length,
        1
      );

      assert.equal(
        results.filter((result) => result.status === 'rejected').length,
        1
      );

      await environment.withSecurityRulesDisabled(async (context) => {
        const snapshot = await getDoc(
          doc(context.firestore(), 'trips', 'trip-race')
        );

        assert.equal(snapshot.exists(), true);
        assert.equal(snapshot.data().status, 'accepted');
        assert.ok(
          ['driver-race-a', 'driver-race-b'].includes(snapshot.data().driverId)
        );
      });
    });

    await t.test('Impide crear viajes desde la aplicación del conductor', async () => {
      const context = environment.authenticatedContext('driver-1');
      const ref = doc(context.firestore(), 'trips', 'trip-1');

      await assertFails(setDoc(ref, validTrip()));
    });

    await t.test('Impide leer viajes sin autenticación', async () => {
      await environment.withSecurityRulesDisabled(async (context) => {
        await setDoc(
          doc(context.firestore(), 'trips', 'trip-2'),
          validTrip()
        );
      });

      const context = environment.unauthenticatedContext();
      const ref = doc(context.firestore(), 'trips', 'trip-2');

      await assertFails(getDoc(ref));
    });

    await t.test('Impide aceptar viajes sin autorización', async () => {
      await environment.withSecurityRulesDisabled(async (context) => {
        await setDoc(
          doc(context.firestore(), 'trips', 'trip-3'),
          validTrip()
        );
      });

      const context = environment.authenticatedContext('driver-1');
      const ref = doc(context.firestore(), 'trips', 'trip-3');

      await assertFails(
        updateDoc(ref, {
          status: 'accepted',
          driverId: 'driver-1',
        })
      );
    });

    await t.test('Permite aceptar un viaje a un conductor habilitado', async () => {
      await seedDriver(environment, 'driver-approved');

      await environment.withSecurityRulesDisabled(async (context) => {
        await setDoc(
          doc(context.firestore(), 'trips', 'trip-approved'),
          validTrip()
        );
      });

      const context = environment.authenticatedContext('driver-approved');
      const ref = doc(context.firestore(), 'trips', 'trip-approved');

      await assertSucceeds(
        updateDoc(ref, {
          status: 'accepted',
          driverId: 'driver-approved',
        })
      );
    });

    await t.test('Impide que otro conductor acepte un viaje asignado', async () => {
      await seedDriver(environment, 'driver-second');

      await environment.withSecurityRulesDisabled(async (context) => {
        await setDoc(
          doc(context.firestore(), 'trips', 'trip-assigned'),
          validTrip({
            status: 'accepted',
            driverId: 'driver-approved',
          })
        );
      });

      const context = environment.authenticatedContext('driver-second');
      const ref = doc(context.firestore(), 'trips', 'trip-assigned');

      await assertFails(
        updateDoc(ref, {
          status: 'accepted',
          driverId: 'driver-second',
        })
      );
    });

    await t.test('Impide aceptar viajes a un conductor desconectado', async () => {
      await seedDriver(environment, 'driver-offline', {
        isOnline: false,
      });

      await environment.withSecurityRulesDisabled(async (context) => {
        await setDoc(
          doc(context.firestore(), 'trips', 'trip-offline'),
          validTrip()
        );
      });

      const context = environment.authenticatedContext('driver-offline');
      const ref = doc(context.firestore(), 'trips', 'trip-offline');

      await assertFails(
        updateDoc(ref, {
          status: 'accepted',
          driverId: 'driver-offline',
        })
      );
    });

    await t.test('Impide aceptar viajes con licencia vencida', async () => {
      const expiredDate = new Date();
      expiredDate.setFullYear(expiredDate.getFullYear() - 1);

      const driver = validDriver();

      await seedDriver(environment, 'driver-expired-license', {
        documentsData: {
          ...driver.documentsData,
          licenseExpiration: expiredDate.toISOString(),
        },
      });

      await environment.withSecurityRulesDisabled(async (context) => {
        await setDoc(
          doc(context.firestore(), 'trips', 'trip-expired-license'),
          validTrip()
        );
      });

      const context = environment.authenticatedContext('driver-expired-license');
      const ref = doc(context.firestore(), 'trips', 'trip-expired-license');

      await assertFails(
        updateDoc(ref, {
          status: 'accepted',
          driverId: 'driver-expired-license',
        })
      );
    });

    await t.test('Impide aceptar viajes con SOAT vencido', async () => {
      const expiredDate = new Date();
      expiredDate.setFullYear(expiredDate.getFullYear() - 1);

      const driver = validDriver();

      await seedDriver(environment, 'driver-expired-soat', {
        documentsData: {
          ...driver.documentsData,
          soatExpiration: expiredDate.toISOString(),
        },
      });

      await environment.withSecurityRulesDisabled(async (context) => {
        await setDoc(
          doc(context.firestore(), 'trips', 'trip-expired-soat'),
          validTrip()
        );
      });

      const context = environment.authenticatedContext('driver-expired-soat');
      const ref = doc(context.firestore(), 'trips', 'trip-expired-soat');

      await assertFails(
        updateDoc(ref, {
          status: 'accepted',
          driverId: 'driver-expired-soat',
        })
      );
    });

    await t.test('Impide modificar la tarifa al aceptar un viaje', async () => {
      await seedDriver(environment, 'driver-fare');

      await environment.withSecurityRulesDisabled(async (context) => {
        await setDoc(
          doc(context.firestore(), 'trips', 'trip-fare'),
          validTrip()
        );
      });

      const context = environment.authenticatedContext('driver-fare');
      const ref = doc(context.firestore(), 'trips', 'trip-fare');

      await assertFails(
        updateDoc(ref, {
          status: 'accepted',
          driverId: 'driver-fare',
          estimatedFare: 150000,
        })
      );
    });

  } finally {
    await environment.cleanup();
  }
});
