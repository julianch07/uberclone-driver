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

// AI-assisted: see docs/AI_LOG.md #23 (proyecto propio: evita que clearFirestore
// de otro archivo de pruebas ejecutado en paralelo borre estos datos).
const PROJECT_ID = 'demo-uberclone-driver-trips';

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

    // AI-assisted: see docs/AI_LOG.md #18
    await t.test('Permite recuperar viajes activos del conductor', async () => {
      await seedDriver(environment, 'driver-recovery');

      await environment.withSecurityRulesDisabled(async (context) => {
        await setDoc(
          doc(context.firestore(), 'trips', 'trip-recovery'),
          validTrip({
            status: 'accepted',
            driverId: 'driver-recovery',
          })
        );
      });

      const context = environment.authenticatedContext('driver-recovery');

      const activeTripsQuery = query(
        collection(context.firestore(), 'trips'),
        where('driverId', '==', 'driver-recovery'),
        where('status', 'in', ['accepted', 'in_progress']),
        limit(2)
      );

      const snapshot = await assertSucceeds(getDocs(activeTripsQuery));

      assert.equal(snapshot.docs.length, 1);
      assert.equal(snapshot.docs[0].id, 'trip-recovery');
    });

    // AI-assisted: see docs/AI_LOG.md #18
    await t.test('No permite recuperar viajes de otro conductor ni estados finalizados', async () => {
      await seedDriver(environment, 'driver-recovery-other');
      const context = environment.authenticatedContext('driver-recovery-other');
      const trips = collection(context.firestore(), 'trips');

      await assertFails(getDocs(query(
        trips,
        where('driverId', '==', 'driver-recovery'),
        where('status', 'in', ['accepted', 'in_progress']),
        limit(2)
      )));

      // AI-assisted: see docs/AI_LOG.md #23
      // El límite de 50 del historial no puede usarse para leer viajes
      // activos (Firestore evalúa cada valor de `in` por separado).
      await assertFails(getDocs(query(
        trips,
        where('driverId', '==', 'driver-recovery-other'),
        where('status', 'in', ['accepted', 'completed']),
        limit(50)
      )));

      await assertFails(getDocs(query(
        trips,
        where('driverId', '==', 'driver-recovery-other'),
        where('status', 'in', ['accepted', 'in_progress']),
        limit(3)
      )));
    });

    // AI-assisted: see docs/AI_LOG.md #23
    await t.test('Permite consultar el historial propio de viajes finalizados', async () => {
      await seedDriver(environment, 'driver-history', { isOnline: false });

      await environment.withSecurityRulesDisabled(async (context) => {
        const database = context.firestore();

        await setDoc(
          doc(database, 'trips', 'trip-history-completed'),
          validTrip({
            status: 'completed',
            driverId: 'driver-history',
            startedAt: new Date('2026-11-13T10:00:00.000Z'),
            completedAt: new Date('2026-11-13T10:20:00.000Z'),
          })
        );
        await setDoc(
          doc(database, 'trips', 'trip-history-cancelled'),
          validTrip({
            status: 'cancelled',
            driverId: 'driver-history',
            cancelledAt: new Date('2026-11-13T11:00:00.000Z'),
          })
        );
      });

      // El historial debe consultarse aunque el conductor esté desconectado.
      const context = environment.authenticatedContext('driver-history');

      const snapshot = await assertSucceeds(getDocs(query(
        collection(context.firestore(), 'trips'),
        where('driverId', '==', 'driver-history'),
        where('status', 'in', ['completed', 'cancelled']),
        limit(50)
      )));

      assert.deepEqual(
        snapshot.docs.map((trip) => trip.id).sort(),
        ['trip-history-cancelled', 'trip-history-completed']
      );
    });

    // AI-assisted: see docs/AI_LOG.md #23
    await t.test('Impide consultar historial ajeno, sin límite o mayor a 50', async () => {
      await seedDriver(environment, 'driver-history-intruder');

      const context = environment.authenticatedContext('driver-history-intruder');
      const trips = collection(context.firestore(), 'trips');

      // Historial de otro conductor.
      await assertFails(getDocs(query(
        trips,
        where('driverId', '==', 'driver-history'),
        where('status', 'in', ['completed', 'cancelled']),
        limit(50)
      )));

      // Sin límite.
      await assertFails(getDocs(query(
        trips,
        where('driverId', '==', 'driver-history-intruder'),
        where('status', 'in', ['completed', 'cancelled'])
      )));

      // Límite superior al permitido.
      await assertFails(getDocs(query(
        trips,
        where('driverId', '==', 'driver-history-intruder'),
        where('status', 'in', ['completed', 'cancelled']),
        limit(51)
      )));

      // Sin filtrar por conductor.
      await assertFails(getDocs(query(
        trips,
        where('status', 'in', ['completed', 'cancelled']),
        limit(50)
      )));

      // Mezclando estados finalizados con un estado activo.
      await assertFails(getDocs(query(
        trips,
        where('driverId', '==', 'driver-history-intruder'),
        where('status', 'in', ['completed', 'in_progress']),
        limit(50)
      )));
    });

    // AI-assisted: see docs/AI_LOG.md #23
    await t.test('Impide leer un viaje finalizado de otro conductor', async () => {
      const context = environment.authenticatedContext('driver-history-intruder');

      await assertFails(getDoc(
        doc(context.firestore(), 'trips', 'trip-history-completed')
      ));
    });

    // AI-assisted: see docs/AI_LOG.md #23
    // Viajes creados manualmente en Firebase Console sin el campo driverId
    // deben tratarse como no asignados (compatibilidad con datos existentes).
    await t.test('Permite aceptar un viaje pendiente sin campo driverId', async () => {
      await seedDriver(environment, 'driver-legacy-trip');

      await environment.withSecurityRulesDisabled(async (context) => {
        const { driverId, ...tripWithoutDriver } = validTrip();

        await setDoc(
          doc(context.firestore(), 'trips', 'trip-without-driver-field'),
          tripWithoutDriver
        );
      });

      const context = environment.authenticatedContext('driver-legacy-trip');
      const ref = doc(context.firestore(), 'trips', 'trip-without-driver-field');

      await assertSucceeds(
        updateDoc(ref, {
          status: 'accepted',
          driverId: 'driver-legacy-trip',
        })
      );
    });

    // AI-assisted: see docs/AI_LOG.md #23
    await t.test('Impide aceptar un viaje asignándolo a otro conductor', async () => {
      await seedDriver(environment, 'driver-impersonator');

      await environment.withSecurityRulesDisabled(async (context) => {
        await setDoc(
          doc(context.firestore(), 'trips', 'trip-impersonation'),
          validTrip()
        );
      });

      const context = environment.authenticatedContext('driver-impersonator');
      const ref = doc(context.firestore(), 'trips', 'trip-impersonation');

      await assertFails(
        updateDoc(ref, {
          status: 'accepted',
          driverId: 'driver-approved',
        })
      );
    });

    // AI-assisted: see docs/AI_LOG.md #23
    for (const scenario of [
      { name: 'tarifa como texto', overrides: { estimatedFare: '15000' } },
      {
        name: 'coordenadas como texto',
        overrides: {
          pickup: {
            address: 'Parque de Berrío, Medellín',
            latitude: '6.2518',
            longitude: '-75.5636',
          },
        },
      },
      { name: 'sin destino', overrides: { destination: null } },
    ]) {
      await t.test(`Impide aceptar un viaje con ${scenario.name}`, async () => {
        const id = `trip-malformed-${scenario.name.replaceAll(' ', '-')}`;

        await seedDriver(environment, 'driver-malformed');

        await environment.withSecurityRulesDisabled(async (context) => {
          await setDoc(
            doc(context.firestore(), 'trips', id),
            validTrip(scenario.overrides)
          );
        });

        const context = environment.authenticatedContext('driver-malformed');

        await assertFails(
          updateDoc(doc(context.firestore(), 'trips', id), {
            status: 'accepted',
            driverId: 'driver-malformed',
          })
        );
      });
    }

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

    // AI-assisted: see docs/AI_LOG.md #17
    for (const scenario of [
      {
        name: 'sin registro completado',
        overrides: { registrationCompletedAt: null },
      },
      {
        name: 'pendiente de aprobación',
        overrides: { approvalStatus: 'pending' },
      },
      {
        name: 'sin documentos',
        overrides: { documentsData: {} },
      },
      {
        name: 'con datos personales incompletos',
        overrides: {
          personalData: {
            ...validDriver().personalData,
            fullName: '',
          },
        },
      },
      {
        name: 'con placa inválida',
        overrides: {
          vehicleData: {
            ...validDriver().vehicleData,
            plate: '',
          },
        },
      },
      {
        name: 'sin aceptar términos',
        overrides: {
          documentsData: {
            ...validDriver().documentsData,
            acceptedTerms: false,
          },
        },
      },
    ]) {
      await t.test(
        `Impide aceptar viajes a un conductor ${scenario.name}`,
        async () => {
          const id = `driver-invalid-${scenario.name.replaceAll(' ', '-')}`;
          const tripId = `trip-invalid-${scenario.name.replaceAll(' ', '-')}`;

          await seedDriver(environment, id, scenario.overrides);

          await environment.withSecurityRulesDisabled(async (context) => {
            await setDoc(
              doc(context.firestore(), 'trips', tripId),
              validTrip()
            );
          });

          const context = environment.authenticatedContext(id);
          const ref = doc(context.firestore(), 'trips', tripId);

          await assertFails(
            updateDoc(ref, {
              status: 'accepted',
              driverId: id,
            })
          );
        }
      );
    }

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


    // AI-assisted: see docs/AI_LOG.md #17
    await t.test('Permite iniciar un viaje al conductor asignado', async () => {
      await environment.withSecurityRulesDisabled(async (context) => {
        await setDoc(
          doc(context.firestore(), 'trips', 'trip-start'),
          validTrip({
            status: 'accepted',
            driverId: 'driver-lifecycle',
          })
        );
      });

      const context = environment.authenticatedContext('driver-lifecycle');
      const ref = doc(context.firestore(), 'trips', 'trip-start');

      await assertSucceeds(
        updateDoc(ref, {
          status: 'in_progress',
          startedAt: serverTimestamp(),
        })
      );

      const snapshot = await assertSucceeds(getDoc(ref));
      assert.equal(snapshot.data().status, 'in_progress');
      assert.ok(snapshot.data().startedAt);
    });

    await t.test('Permite finalizar un viaje iniciado', async () => {
      await environment.withSecurityRulesDisabled(async (context) => {
        await setDoc(
          doc(context.firestore(), 'trips', 'trip-complete'),
          validTrip({
            status: 'in_progress',
            driverId: 'driver-lifecycle',
          })
        );
      });

      const context = environment.authenticatedContext('driver-lifecycle');
      const ref = doc(context.firestore(), 'trips', 'trip-complete');

      await assertSucceeds(
        updateDoc(ref, {
          status: 'completed',
          completedAt: serverTimestamp(),
        })
      );

      const snapshot = await assertSucceeds(getDoc(ref));
      assert.equal(snapshot.data().status, 'completed');
      assert.ok(snapshot.data().completedAt);
    });

    await t.test('Permite cancelar un viaje aceptado', async () => {
      await environment.withSecurityRulesDisabled(async (context) => {
        await setDoc(
          doc(context.firestore(), 'trips', 'trip-cancel'),
          validTrip({
            status: 'accepted',
            driverId: 'driver-lifecycle',
          })
        );
      });

      const context = environment.authenticatedContext('driver-lifecycle');
      const ref = doc(context.firestore(), 'trips', 'trip-cancel');

      await assertSucceeds(
        updateDoc(ref, {
          status: 'cancelled',
          cancelledAt: serverTimestamp(),
        })
      );

      const snapshot = await assertSucceeds(getDoc(ref));
      assert.equal(snapshot.data().status, 'cancelled');
      assert.ok(snapshot.data().cancelledAt);
    });


    // AI-assisted: see docs/AI_LOG.md #17
    await t.test('Impide iniciar un viaje de otro conductor', async () => {
      await environment.withSecurityRulesDisabled(async (context) => {
        await setDoc(
          doc(context.firestore(), 'trips', 'trip-other-driver'),
          validTrip({
            status: 'accepted',
            driverId: 'driver-owner',
          })
        );
      });

      const context = environment.authenticatedContext('driver-intruder');
      const ref = doc(context.firestore(), 'trips', 'trip-other-driver');

      await assertFails(
        updateDoc(ref, {
          status: 'in_progress',
          startedAt: serverTimestamp(),
        })
      );
    });

    await t.test('Impide finalizar un viaje pendiente', async () => {
      await environment.withSecurityRulesDisabled(async (context) => {
        await setDoc(
          doc(context.firestore(), 'trips', 'trip-invalid-complete'),
          validTrip({
            status: 'pending',
            driverId: null,
          })
        );
      });

      const context = environment.authenticatedContext('driver-lifecycle');
      const ref = doc(context.firestore(), 'trips', 'trip-invalid-complete');

      await assertFails(
        updateDoc(ref, {
          status: 'completed',
          completedAt: serverTimestamp(),
        })
      );
    });

    await t.test('Impide modificar la tarifa al iniciar un viaje', async () => {
      await environment.withSecurityRulesDisabled(async (context) => {
        await setDoc(
          doc(context.firestore(), 'trips', 'trip-start-fare'),
          validTrip({
            status: 'accepted',
            driverId: 'driver-lifecycle',
          })
        );
      });

      const context = environment.authenticatedContext('driver-lifecycle');
      const ref = doc(context.firestore(), 'trips', 'trip-start-fare');

      await assertFails(
        updateDoc(ref, {
          status: 'in_progress',
          startedAt: serverTimestamp(),
          estimatedFare: 150000,
        })
      );
    });

  } finally {
    await environment.cleanup();
  }
});
