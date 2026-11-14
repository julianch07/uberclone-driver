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
  deleteDoc,
} = require('firebase/firestore');

// AI-assisted: see docs/AI_LOG.md #27
// Las reglas replican calculateFare(); las pruebas usan la función real de la
// aplicación para comprobar que ambos cálculos coinciden.
const { loadModule } = require('./helpers/loadModule.cjs');
const {
  buildCompletionBreakdown,
  calculateFare,
} = loadModule('src/utils/fareLogic.js');

// AI-assisted: see docs/AI_LOG.md #23
// Proyecto propio: evita que clearFirestore de otro archivo de pruebas
// ejecutado en paralelo borre estos datos.
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

  // AI-assisted: see docs/AI_LOG.md #28
  // Desde el módulo de solicitudes, aceptar exige una oferta vigente del
  // conductor (drivers/{uid}/tripOffers/{tripId}).
  async function seedOffer(driverId, tripId, overrides = {}) {
    await environment.withSecurityRulesDisabled(async (context) => {
      await setDoc(
        doc(context.firestore(), 'drivers', driverId, 'tripOffers', tripId),
        { tripId, status: 'offered', offeredAt: new Date(), ...overrides }
      );
    });
  }

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

      await seedOffer('driver-legacy-trip', 'trip-without-driver-field');

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

      await seedOffer('driver-impersonator', 'trip-impersonation');

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

        await seedOffer('driver-malformed', id);

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

      await seedOffer('driver-race-a', 'trip-race');
      await seedOffer('driver-race-b', 'trip-race');

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

      await seedOffer('driver-1', 'trip-3');

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

      await seedOffer('driver-approved', 'trip-approved');

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

          await seedOffer(id, tripId);

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

      await seedOffer('driver-second', 'trip-assigned');

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

      await seedOffer('driver-offline', 'trip-offline');

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

      await seedOffer('driver-expired-license', 'trip-expired-license');

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

      await seedOffer('driver-expired-soat', 'trip-expired-soat');

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

      await seedOffer('driver-fare', 'trip-fare');

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
    // AI-assisted: see docs/AI_LOG.md #28
    // "Pasajero a bordo" exige haber llegado al origen; ya no se permite
    // pasar directamente de accepted a in_progress.
    await t.test('Permite iniciar un viaje al conductor asignado', async () => {
      await environment.withSecurityRulesDisabled(async (context) => {
        await setDoc(
          doc(context.firestore(), 'trips', 'trip-start'),
          validTrip({
            status: 'driver_arriving',
            driverId: 'driver-lifecycle',
            arrivingAt: new Date(),
            arrivedAt: new Date(),
          })
        );
        await setDoc(
          doc(context.firestore(), 'trips', 'trip-start-skip'),
          validTrip({
            status: 'accepted',
            driverId: 'driver-lifecycle',
          })
        );
      });

      const context = environment.authenticatedContext('driver-lifecycle');
      const ref = doc(context.firestore(), 'trips', 'trip-start');

      await assertFails(
        updateDoc(doc(context.firestore(), 'trips', 'trip-start-skip'), {
          status: 'in_progress',
          startedAt: serverTimestamp(),
        })
      );

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

      // AI-assisted: see docs/AI_LOG.md #27
      // Desde el módulo de tarifas, finalizar exige guardar el desglose.
      await assertFails(
        updateDoc(ref, {
          status: 'completed',
          completedAt: serverTimestamp(),
        })
      );

      await assertSucceeds(
        updateDoc(ref, {
          status: 'completed',
          completedAt: serverTimestamp(),
          ...buildCompletionBreakdown(validTrip()),
        })
      );

      const snapshot = await assertSucceeds(getDoc(ref));
      assert.equal(snapshot.data().status, 'completed');
      assert.ok(snapshot.data().completedAt);
      assert.equal(snapshot.data().fare, 15000);
      assert.equal(snapshot.data().fareSource, 'estimated');
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
          // AI-assisted: see docs/AI_LOG.md #28
          validTrip({
            status: 'driver_arriving',
            driverId: 'driver-owner',
            arrivedAt: new Date(),
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
          // AI-assisted: see docs/AI_LOG.md #28
          validTrip({
            status: 'driver_arriving',
            driverId: 'driver-lifecycle',
            arrivedAt: new Date(),
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

    // AI-assisted: see docs/AI_LOG.md #27
    // --- Módulo de tarifas y comisiones -----------------------------------

    async function seedInProgressTrip(tripId, overrides = {}) {
      await environment.withSecurityRulesDisabled(async (context) => {
        await setDoc(
          doc(context.firestore(), 'trips', tripId),
          validTrip({
            status: 'in_progress',
            driverId: 'driver-fare-rules',
            ...overrides,
          })
        );
      });

      return doc(
        environment.authenticatedContext('driver-fare-rules').firestore(),
        'trips',
        tripId
      );
    }

    function completion(fields) {
      return {
        status: 'completed',
        completedAt: serverTimestamp(),
        ...fields,
      };
    }

    const PRICED_TRIP = {
      distanceKm: 8.5,
      durationMin: 22,
      category: 'xl',
      estimatedFare: 26900,
    };

    await t.test('Permite finalizar con la tarifa calculada por la aplicación', async () => {
      const ref = await seedInProgressTrip('trip-fare-ok', PRICED_TRIP);
      const breakdown = buildCompletionBreakdown(validTrip(PRICED_TRIP));

      assert.deepEqual(
        [breakdown.fare, breakdown.commission, breakdown.driverEarnings],
        [26900, 5380, 21520]
      );

      await assertSucceeds(updateDoc(ref, completion(breakdown)));

      const data = (await assertSucceeds(getDoc(ref))).data();
      assert.equal(data.fare, 26900);
      assert.equal(data.commission, 5380);
      assert.equal(data.commissionRate, 0.2);
      assert.equal(data.driverEarnings, 21520);
      assert.equal(data.tip, 0);
      assert.equal(data.fareSource, 'calculated');
    });

    for (const scenario of [
      { name: 'una tarifa mayor', change: (b) => ({ fare: b.fare + 1000 }) },
      { name: 'una comisión menor', change: (b) => ({ commission: b.commission - 1 }) },
      { name: 'una ganancia mayor', change: (b) => ({ driverEarnings: b.driverEarnings + 5000 }) },
      { name: 'otro porcentaje de comisión', change: () => ({ commissionRate: 0.1 }) },
      { name: 'una propina inventada', change: (b) => ({ tip: 5000, driverEarnings: b.driverEarnings + 5000 }) },
      { name: 'la tarifa estimada en lugar de la calculada', change: () => ({ fare: 20000, commission: 4000, driverEarnings: 16000, fareSource: 'estimated' }) },
      { name: 'campos adicionales', change: () => ({ bonus: 1000 }) },
    ]) {
      await t.test(`Impide finalizar con ${scenario.name}`, async () => {
        const id = `trip-fare-${scenario.name.replaceAll(' ', '-')}`;
        const ref = await seedInProgressTrip(id, {
          ...PRICED_TRIP,
          estimatedFare: 20000,
        });
        const breakdown = buildCompletionBreakdown(validTrip(PRICED_TRIP));

        await assertFails(
          updateDoc(ref, completion({ ...breakdown, ...scenario.change(breakdown) }))
        );
      });
    }

    await t.test('Impide finalizar sin parte del desglose', async () => {
      const ref = await seedInProgressTrip('trip-fare-partial', PRICED_TRIP);
      const { driverEarnings, ...withoutEarnings } =
        buildCompletionBreakdown(validTrip(PRICED_TRIP));

      await assertFails(updateDoc(ref, completion(withoutEarnings)));
    });

    await t.test('La propina del viaje va completa al conductor y no puede alterarse', async () => {
      const tripData = { ...PRICED_TRIP, category: 'economy', estimatedFare: 19200, tip: 2000 };
      const ref = await seedInProgressTrip('trip-fare-tip', tripData);
      const breakdown = buildCompletionBreakdown(validTrip(tripData));

      assert.equal(breakdown.commission, 3840);
      assert.equal(breakdown.driverEarnings, 17360);

      await assertFails(
        updateDoc(ref, completion({ ...breakdown, tip: 0, driverEarnings: 15360 }))
      );
      await assertSucceeds(updateDoc(ref, completion(breakdown)));
    });

    await t.test('Viaje antiguo sin datos de recorrido: la tarifa es estimatedFare', async () => {
      const ref = await seedInProgressTrip('trip-fare-legacy', { estimatedFare: 15000 });

      await assertFails(
        updateDoc(ref, completion({
          fare: 18000,
          commission: 3600,
          commissionRate: 0.2,
          driverEarnings: 14400,
          tip: 0,
          fareSource: 'estimated',
        }))
      );
      await assertFails(
        updateDoc(ref, completion({
          ...buildCompletionBreakdown({ estimatedFare: 15000 }),
          fareSource: 'calculated',
        }))
      );
      await assertSucceeds(
        updateDoc(ref, completion(buildCompletionBreakdown({ estimatedFare: 15000 })))
      );
    });

    await t.test('No permite volver a escribir un viaje ya finalizado', async () => {
      const ref = await seedInProgressTrip('trip-fare-retry', PRICED_TRIP);
      const breakdown = buildCompletionBreakdown(validTrip(PRICED_TRIP));

      await assertSucceeds(updateDoc(ref, completion(breakdown)));
      await assertFails(updateDoc(ref, completion(breakdown)));
      await assertFails(
        updateDoc(ref, { driverEarnings: breakdown.driverEarnings + 1000 })
      );
    });

    await t.test('Las reglas calculan la misma tarifa que calculateFare()', async () => {
      const cases = [
        { distanceKm: 0, durationMin: 0, category: 'economy' },
        { distanceKm: 0, durationMin: 0, category: 'xl' },
        { distanceKm: 0, durationMin: 0, category: 'premium' },
        { distanceKm: 1, durationMin: 1, category: 'economy' },
        { distanceKm: 1, durationMin: 0.2, category: 'xl' },
        { distanceKm: 10.04, durationMin: 0, category: 'economy' },
        { distanceKm: 10.05, durationMin: 0, category: 'economy' },
        { distanceKm: 3.33, durationMin: 13.7, category: 'premium' },
        { distanceKm: 12.345, durationMin: 0.002, category: 'xl' },
        { distanceKm: 8.5, durationMin: 22, category: 'Económico' },
        { distanceKm: 8.5, durationMin: 22, category: 'XL' },
        { distanceKm: 8.5, durationMin: 22, category: 'Premium' },
        { distanceKm: 1000, durationMin: 1440, category: 'premium' },
      ];

      for (const [index, inputs] of cases.entries()) {
        const expected = calculateFare(inputs);
        const tripData = { ...inputs, estimatedFare: expected.fare };
        const ref = await seedInProgressTrip(`trip-fare-matrix-${index}`, tripData);

        await assertSucceeds(
          updateDoc(ref, completion(buildCompletionBreakdown(validTrip(tripData))))
        );

        const data = (await getDoc(ref)).data();
        assert.equal(data.fare, expected.fare, JSON.stringify(inputs));
      }
    });

    await t.test('Datos de recorrido inválidos: se exige estimatedFare', async () => {
      for (const [index, overrides] of [
        { distanceKm: -1, durationMin: 10, category: 'xl' },
        { distanceKm: 5, durationMin: 10, category: 'moto' },
        { distanceKm: 5, durationMin: 2000, category: 'xl' },
        { distanceKm: '5', durationMin: 10, category: 'xl' },
      ].entries()) {
        const tripData = { ...overrides, estimatedFare: 12000 };
        const ref = await seedInProgressTrip(`trip-fare-invalid-${index}`, tripData);
        const breakdown = buildCompletionBreakdown(validTrip(tripData));

        assert.equal(breakdown.fareSource, 'estimated');
        assert.equal(breakdown.fare, 12000);
        await assertSucceeds(updateDoc(ref, completion(breakdown)));
      }
    });

    await t.test('Impide finalizar con una propina inválida en el viaje', async () => {
      const ref = await seedInProgressTrip('trip-fare-bad-tip', {
        estimatedFare: 15000,
        tip: -500,
      });

      await assertFails(
        updateDoc(ref, completion({
          fare: 15000,
          commission: 3000,
          commissionRate: 0.2,
          driverEarnings: 11500,
          tip: -500,
          fareSource: 'estimated',
        }))
      );
    });

    // AI-assisted: see docs/AI_LOG.md #28
    // --- Módulo de solicitudes y ciclo completo del viaje ---------------

    const SECONDS = 1000;

    async function seedPendingTrip(tripId, overrides = {}) {
      await environment.withSecurityRulesDisabled(async (context) => {
        await setDoc(doc(context.firestore(), 'trips', tripId), validTrip(overrides));
      });
    }

    function offerRef(driverId, tripId, asDriver = driverId) {
      return doc(
        environment.authenticatedContext(asDriver).firestore(),
        'drivers',
        driverId,
        'tripOffers',
        tripId
      );
    }

    function acceptAs(driverId, tripId) {
      return updateDoc(
        doc(environment.authenticatedContext(driverId).firestore(), 'trips', tripId),
        { status: 'accepted', driverId }
      );
    }

    await t.test('Ofertas: el conductor habilitado registra la suya con la hora del servidor', async () => {
      await seedDriver(environment, 'driver-offer');
      await seedPendingTrip('trip-offer-ok');

      await assertSucceeds(
        setDoc(offerRef('driver-offer', 'trip-offer-ok'), {
          tripId: 'trip-offer-ok',
          status: 'offered',
          offeredAt: serverTimestamp(),
        })
      );

      // No se puede recrear ni cambiar offeredAt para reiniciar el plazo.
      await assertFails(
        setDoc(offerRef('driver-offer', 'trip-offer-ok'), {
          tripId: 'trip-offer-ok',
          status: 'offered',
          offeredAt: serverTimestamp(),
        })
      );
      await assertFails(
        updateDoc(offerRef('driver-offer', 'trip-offer-ok'), {
          offeredAt: serverTimestamp(),
        })
      );
      await assertFails(deleteDoc(offerRef('driver-offer', 'trip-offer-ok')));
    });

    for (const scenario of [
      { name: 'con hora del cliente', data: () => ({ offeredAt: new Date() }) },
      { name: 'con campos adicionales', data: () => ({ estimatedFare: 1 }) },
      { name: 'ya rechazada', data: () => ({ status: 'rejected' }) },
      { name: 'con otro tripId', data: () => ({ tripId: 'otro-viaje' }) },
    ]) {
      await t.test(`Ofertas: impide crearla ${scenario.name}`, async () => {
        const tripId = `trip-offer-bad-${scenario.name.replaceAll(' ', '-')}`;
        await seedDriver(environment, 'driver-offer-bad');
        await seedPendingTrip(tripId);

        await assertFails(
          setDoc(offerRef('driver-offer-bad', tripId), {
            tripId,
            status: 'offered',
            offeredAt: serverTimestamp(),
            ...scenario.data(),
          })
        );
      });
    }

    await t.test('Ofertas: impide crearlas para otros conductores o solicitudes no abiertas', async () => {
      await seedDriver(environment, 'driver-offer-owner');
      await seedDriver(environment, 'driver-offer-intruder');
      await seedDriver(environment, 'driver-offer-offline', { isOnline: false });
      await seedPendingTrip('trip-offer-open');
      await seedPendingTrip('trip-offer-taken', { status: 'accepted', driverId: 'x' });

      const offer = (tripId) => ({ tripId, status: 'offered', offeredAt: serverTimestamp() });

      // En la subcolección de otro conductor.
      await assertFails(
        setDoc(
          offerRef('driver-offer-owner', 'trip-offer-open', 'driver-offer-intruder'),
          offer('trip-offer-open')
        )
      );
      // Solicitud ya asignada o inexistente.
      await assertFails(setDoc(offerRef('driver-offer-owner', 'trip-offer-taken'), offer('trip-offer-taken')));
      await assertFails(setDoc(offerRef('driver-offer-owner', 'trip-ghost'), offer('trip-ghost')));
      // Conductor desconectado.
      await assertFails(
        setDoc(offerRef('driver-offer-offline', 'trip-offer-open'), offer('trip-offer-open'))
      );
      // Lectura de ofertas ajenas.
      await assertFails(
        getDocs(collection(
          environment.authenticatedContext('driver-offer-intruder').firestore(),
          'drivers', 'driver-offer-owner', 'tripOffers'
        ))
      );
    });

    await t.test('Rechazo manual: solo propio, una vez y sin reabrir la oferta', async () => {
      await seedDriver(environment, 'driver-reject');
      await seedPendingTrip('trip-reject');
      await seedOffer('driver-reject', 'trip-reject');

      const reject = (reason, asDriver = 'driver-reject') =>
        updateDoc(offerRef('driver-reject', 'trip-reject', asDriver), {
          status: 'rejected',
          reason,
          respondedAt: serverTimestamp(),
        });

      await assertFails(reject('manual', 'driver-offer-intruder'));
      await assertFails(reject('sin-motivo'));
      await assertSucceeds(reject('manual'));
      await assertFails(reject('manual'));
      await assertFails(
        updateDoc(offerRef('driver-reject', 'trip-reject'), { status: 'offered' })
      );

      // El rechazo no cancela la solicitud para los demás conductores.
      await environment.withSecurityRulesDisabled(async (context) => {
        const trip = (await getDoc(doc(context.firestore(), 'trips', 'trip-reject'))).data();
        assert.equal(trip.status, 'pending');
        assert.equal(trip.driverId, null);
      });

      // Y quien la rechazó ya no puede aceptarla.
      await assertFails(acceptAs('driver-reject', 'trip-reject'));
    });

    await t.test('Rechazo automático: solo después de vencer el plazo', async () => {
      await seedDriver(environment, 'driver-expire');
      await seedPendingTrip('trip-expire-fresh');
      await seedPendingTrip('trip-expire-old');
      await seedOffer('driver-expire', 'trip-expire-fresh');
      await seedOffer('driver-expire', 'trip-expire-old', {
        offeredAt: new Date(Date.now() - 20 * SECONDS),
      });

      const expire = (tripId) =>
        updateDoc(offerRef('driver-expire', tripId), {
          status: 'rejected',
          reason: 'expired',
          respondedAt: serverTimestamp(),
        });

      await assertFails(expire('trip-expire-fresh'));
      await assertSucceeds(expire('trip-expire-old'));
    });

    await t.test('Aceptación: exige una oferta propia, vigente y no rechazada', async () => {
      await seedDriver(environment, 'driver-accept-a');
      await seedDriver(environment, 'driver-accept-b');

      // Sin oferta.
      await seedPendingTrip('trip-accept-no-offer');
      await assertFails(acceptAs('driver-accept-a', 'trip-accept-no-offer'));

      // Oferta vencida (hace 16 s).
      await seedPendingTrip('trip-accept-expired');
      await seedOffer('driver-accept-a', 'trip-accept-expired', {
        offeredAt: new Date(Date.now() - 16 * SECONDS),
      });
      await assertFails(acceptAs('driver-accept-a', 'trip-accept-expired'));

      // Oferta rechazada.
      await seedPendingTrip('trip-accept-rejected');
      await seedOffer('driver-accept-a', 'trip-accept-rejected', { status: 'rejected' });
      await assertFails(acceptAs('driver-accept-a', 'trip-accept-rejected'));

      // offeredAt que no es un timestamp.
      await seedPendingTrip('trip-accept-bad-time');
      await seedOffer('driver-accept-a', 'trip-accept-bad-time', { offeredAt: 'ahora' });
      await assertFails(acceptAs('driver-accept-a', 'trip-accept-bad-time'));

      // La oferta de otro conductor no sirve.
      await seedPendingTrip('trip-accept-other-offer');
      await seedOffer('driver-accept-a', 'trip-accept-other-offer');
      await assertFails(acceptAs('driver-accept-b', 'trip-accept-other-offer'));

      // Oferta vigente: se acepta.
      await assertSucceeds(acceptAs('driver-accept-a', 'trip-accept-other-offer'));
    });

    // Ciclo completo con escrituras del conductor asignado.
    async function seedAssignedTrip(tripId, overrides = {}) {
      await seedPendingTrip(tripId, {
        status: 'accepted',
        driverId: 'driver-cycle-rules',
        distanceKm: 8.5,
        durationMin: 22,
        category: 'xl',
        estimatedFare: 26900,
        paymentMethod: 'cash',
        tip: 1000,
        ...overrides,
      });

      return doc(
        environment.authenticatedContext('driver-cycle-rules').firestore(),
        'trips',
        tripId
      );
    }

    await t.test('Ciclo: en camino → llegada → pasajero a bordo → finalizado', async () => {
      const ref = await seedAssignedTrip('trip-cycle-full');

      await assertSucceeds(updateDoc(ref, { status: 'driver_arriving', arrivingAt: serverTimestamp() }));
      // Sin llegar al origen no puede iniciar.
      await assertFails(updateDoc(ref, { status: 'in_progress', startedAt: serverTimestamp() }));
      await assertSucceeds(updateDoc(ref, { arrivedAt: serverTimestamp() }));
      // La llegada se registra una sola vez.
      await assertFails(updateDoc(ref, { arrivedAt: serverTimestamp() }));
      await assertSucceeds(updateDoc(ref, { status: 'in_progress', startedAt: serverTimestamp() }));
      // Ya no se puede cancelar con el pasajero a bordo.
      await assertFails(updateDoc(ref, { status: 'cancelled', cancelledAt: serverTimestamp() }));

      const data = (await getDoc(ref)).data();
      await assertSucceeds(
        updateDoc(ref, {
          status: 'completed',
          completedAt: serverTimestamp(),
          ...buildCompletionBreakdown(data),
        })
      );

      const completed = (await getDoc(ref)).data();
      assert.equal(completed.fare, 26900);
      assert.equal(completed.driverEarnings, 22520);
      assert.ok(completed.arrivingAt && completed.arrivedAt && completed.startedAt);

      // Nada se modifica después de finalizar, tampoco el estado de pago.
      await assertFails(updateDoc(ref, { status: 'paid' }));
      await assertFails(updateDoc(ref, { paymentStatus: 'approved' }));
    });

    for (const scenario of [
      { name: 'con hora del cliente', from: {}, change: { status: 'driver_arriving', arrivingAt: new Date() } },
      { name: 'saltando a finalizado', from: {}, change: { status: 'completed', completedAt: serverTimestamp() } },
      { name: 'llegada sin estar en camino', from: {}, change: { arrivedAt: serverTimestamp() } },
      { name: 'llegada cambiando el estado', from: { status: 'driver_arriving' }, change: { status: 'in_progress', arrivedAt: serverTimestamp() } },
      { name: 'finalizado desde en camino', from: { status: 'driver_arriving', arrivedAt: new Date() }, change: { status: 'completed', completedAt: serverTimestamp() } },
      { name: 'marcado como pagado', from: { status: 'in_progress' }, change: { status: 'paid' } },
      { name: 'estado rechazado', from: {}, change: { status: 'rejected' } },
      { name: 'devuelto a pendiente', from: {}, change: { status: 'pending', driverId: null } },
    ]) {
      await t.test(`Ciclo: impide una transición ${scenario.name}`, async () => {
        const ref = await seedAssignedTrip(
          `trip-cycle-bad-${scenario.name.replaceAll(' ', '-')}`,
          scenario.from
        );

        await assertFails(updateDoc(ref, scenario.change));
      });
    }

    for (const [field, value] of [
      ['distanceKm', 1],
      ['durationMin', 1],
      ['category', 'economy'],
      ['tip', 50000],
      ['estimatedFare', 99000],
      ['paymentMethod', 'mercadopago'],
      ['paymentStatus', 'approved'],
      ['driverId', 'otro-conductor'],
    ]) {
      await t.test(`Ciclo: impide alterar ${field} al avanzar el viaje`, async () => {
        const ref = await seedAssignedTrip(`trip-cycle-protected-${field}`);

        await assertFails(
          updateDoc(ref, {
            status: 'driver_arriving',
            arrivingAt: serverTimestamp(),
            [field]: value,
          })
        );
      });
    }

    await t.test('Ciclo: otro conductor no puede avanzar ni cancelar el viaje', async () => {
      await seedAssignedTrip('trip-cycle-foreign');
      const foreign = doc(
        environment.authenticatedContext('driver-cycle-intruder').firestore(),
        'trips',
        'trip-cycle-foreign'
      );

      await assertFails(updateDoc(foreign, { status: 'driver_arriving', arrivingAt: serverTimestamp() }));
      await assertFails(updateDoc(foreign, { status: 'cancelled', cancelledAt: serverTimestamp() }));
    });

    await t.test('Ciclo: se puede cancelar en camino al origen', async () => {
      const ref = await seedAssignedTrip('trip-cycle-cancel', {
        status: 'driver_arriving',
        arrivedAt: new Date(),
      });

      await assertSucceeds(updateDoc(ref, { status: 'cancelled', cancelledAt: serverTimestamp() }));
    });

    await t.test('Recuperación: la consulta de viajes activos incluye driver_arriving', async () => {
      // Conductor exclusivo: las pruebas anteriores dejan otros viajes
      // activos de driver-cycle-rules y la consulta limita a 2 resultados.
      await seedAssignedTrip('trip-cycle-recover', {
        status: 'driver_arriving',
        driverId: 'driver-recover-only',
      });

      const snapshot = await assertSucceeds(
        getDocs(query(
          collection(environment.authenticatedContext('driver-recover-only').firestore(), 'trips'),
          where('driverId', '==', 'driver-recover-only'),
          where('status', 'in', ['accepted', 'driver_arriving', 'in_progress']),
          limit(2)
        ))
      );

      assert.ok(snapshot.docs.some((item) => item.id === 'trip-cycle-recover'));
    });

  } finally {
    await environment.cleanup();
  }
});
