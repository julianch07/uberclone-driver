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
  markDriverArriving,
  markArrivedAtPickup,
  startTrip,
  completeTrip,
  cancelTrip,
  getDriverTripHistory,
  createTripOffer,
  rejectTripOffer,
  subscribeToPendingTrips,
  subscribeToDriverTripOffers,
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

    // AI-assisted: see docs/AI_LOG.md #28
    // Aceptar exige la oferta del conductor y "Pasajero a bordo" exige
    // haber pasado por "Voy en camino" y "Llegué al origen".
    async function offerAndAccept(tripId, driverId = DRIVER, db = database) {
      await createTripOffer(driverId, tripId, db);
      return acceptTrip(tripId, driverId, db);
    }

    async function pickUpPassenger(tripId, driverId = DRIVER, db = database) {
      await markDriverArriving(tripId, driverId, db);
      await markArrivedAtPickup(tripId, driverId, db);
      return startTrip(tripId, driverId, db);
    }

    await t.test('Acepta, recupera, inicia y finaliza un viaje', async () => {
      await offerAndAccept('trip-complete');

      const active = await findActiveDriverTrip(DRIVER, database);
      assert.equal(active.id, 'trip-complete');
      assert.equal(active.status, 'accepted');

      await pickUpPassenger('trip-complete');
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
      await offerAndAccept('trip-priced');
      await pickUpPassenger('trip-priced');
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
      await offerAndAccept('trip-concurrent');
      await pickUpPassenger('trip-concurrent');

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
      await offerAndAccept('trip-cancel');
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

    // AI-assisted: see docs/AI_LOG.md #28
    // --- Solicitudes y etapas del viaje -------------------------------------

    const STAGES_DRIVER = 'driver-cycle-stages';
    const RIVAL_A = 'driver-cycle-rival-a';
    const RIVAL_B = 'driver-cycle-rival-b';
    const OFFLINE_DRIVER = 'driver-cycle-offline';

    await environment.withSecurityRulesDisabled(async (context) => {
      const admin = context.firestore();

      for (const id of [STAGES_DRIVER, RIVAL_A, RIVAL_B]) {
        await setDoc(doc(admin, 'drivers', id), representativeDriver());
      }
      await setDoc(
        doc(admin, 'drivers', OFFLINE_DRIVER),
        representativeDriver({ isOnline: false })
      );

      for (const id of ['trip-stages', 'trip-race', 'trip-reject', 'trip-expired', 'trip-offline']) {
        await setDoc(
          doc(admin, 'trips', id),
          pendingTrip(calculateFare(PRICED_INPUTS).fare, {
            ...PRICED_INPUTS,
            paymentMethod: 'cash',
          })
        );
      }
    });

    const stagesDb = environment.authenticatedContext(STAGES_DRIVER).firestore();

    await t.test('Ciclo por etapas con recuperación del viaje activo en cada una', async () => {
      await offerAndAccept('trip-stages', STAGES_DRIVER, stagesDb);

      // "Pasajero a bordo" sin haber llegado al origen se rechaza.
      await assert.rejects(startTrip('trip-stages', STAGES_DRIVER, stagesDb), /No tienes permiso/);

      await markDriverArriving('trip-stages', STAGES_DRIVER, stagesDb);
      let active = await findActiveDriverTrip(STAGES_DRIVER, stagesDb);
      assert.equal(active.status, 'driver_arriving');
      assert.ok(active.arrivingAt);
      assert.equal(active.arrivedAt, undefined);

      await markArrivedAtPickup('trip-stages', STAGES_DRIVER, stagesDb);
      active = await findActiveDriverTrip(STAGES_DRIVER, stagesDb);
      assert.equal(active.status, 'driver_arriving');
      assert.ok(active.arrivedAt);

      await startTrip('trip-stages', STAGES_DRIVER, stagesDb);
      assert.equal((await findActiveDriverTrip(STAGES_DRIVER, stagesDb)).status, 'in_progress');

      await completeTrip('trip-stages', STAGES_DRIVER, stagesDb);
      assert.equal(await findActiveDriverTrip(STAGES_DRIVER, stagesDb), null);

      const stored = await readTrip('trip-stages');
      assert.equal(stored.fare, 26900);
      assert.equal(stored.driverEarnings, 22520);
      assert.equal(stored.paymentMethod, 'cash');
      assert.equal(stored.paymentStatus, undefined);
    });

    await t.test('Las operaciones repetidas no vuelven a escribir', async () => {
      const before = await readTrip('trip-stages');

      assert.equal(await markDriverArriving('trip-stages', STAGES_DRIVER, stagesDb), 'trip-stages');
      assert.equal(await markArrivedAtPickup('trip-stages', STAGES_DRIVER, stagesDb), 'trip-stages');
      assert.equal(await startTrip('trip-stages', STAGES_DRIVER, stagesDb), 'trip-stages');
      assert.equal(await completeTrip('trip-stages', STAGES_DRIVER, stagesDb), 'trip-stages');

      assert.deepEqual(await readTrip('trip-stages'), before);

      // Cancelar un viaje finalizado no es posible.
      await assert.rejects(cancelTrip('trip-stages', STAGES_DRIVER, stagesDb), /No tienes permiso/);
    });

    await t.test('Aceptación concurrente: solo un conductor obtiene el viaje', async () => {
      const dbA = environment.authenticatedContext(RIVAL_A).firestore();
      const dbB = environment.authenticatedContext(RIVAL_B).firestore();

      await createTripOffer(RIVAL_A, 'trip-race', dbA);
      await createTripOffer(RIVAL_B, 'trip-race', dbB);

      const results = await Promise.allSettled([
        acceptTrip('trip-race', RIVAL_A, dbA),
        acceptTrip('trip-race', RIVAL_B, dbB),
      ]);

      assert.equal(results.filter((result) => result.status === 'fulfilled').length, 1);
      assert.equal(results.filter((result) => result.status === 'rejected').length, 1);

      const stored = await readTrip('trip-race');
      assert.equal(stored.status, 'accepted');
      assert.ok([RIVAL_A, RIVAL_B].includes(stored.driverId));
    });

    await t.test('Rechazo manual: oculta la solicitud solo para ese conductor', async () => {
      const dbA = environment.authenticatedContext(RIVAL_A).firestore();
      const dbB = environment.authenticatedContext(RIVAL_B).firestore();

      await createTripOffer(RIVAL_A, 'trip-reject', dbA);
      await createTripOffer(RIVAL_B, 'trip-reject', dbB);

      assert.equal(await rejectTripOffer(RIVAL_A, 'trip-reject', 'manual', dbA), true);
      await assert.rejects(acceptTrip('trip-reject', RIVAL_A, dbA), /Ya rechazaste/);

      // El otro conductor todavía puede aceptarla.
      await acceptTrip('trip-reject', RIVAL_B, dbB);
      assert.equal((await readTrip('trip-reject')).driverId, RIVAL_B);
    });

    await t.test('Rechazo automático persistido al vencer el plazo', async () => {
      await environment.withSecurityRulesDisabled(async (context) => {
        await setDoc(
          doc(context.firestore(), 'drivers', STAGES_DRIVER, 'tripOffers', 'trip-expired'),
          { tripId: 'trip-expired', status: 'offered', offeredAt: new Date(Date.now() - 20_000) }
        );
      });

      await assert.rejects(
        acceptTrip('trip-expired', STAGES_DRIVER, stagesDb),
        /tiempo para aceptar/
      );
      assert.equal(await rejectTripOffer(STAGES_DRIVER, 'trip-expired', 'expired', stagesDb), true);

      await environment.withSecurityRulesDisabled(async (context) => {
        const offer = (await getDoc(
          doc(context.firestore(), 'drivers', STAGES_DRIVER, 'tripOffers', 'trip-expired')
        )).data();
        assert.equal(offer.status, 'rejected');
        assert.equal(offer.reason, 'expired');
        assert.ok(offer.respondedAt);
      });
    });

    await t.test('Un conductor desconectado no recibe ni acepta solicitudes', async () => {
      const offlineDb = environment.authenticatedContext(OFFLINE_DRIVER).firestore();

      await assert.rejects(createTripOffer(OFFLINE_DRIVER, 'trip-offline', offlineDb));
      await assert.rejects(acceptTrip('trip-offline', OFFLINE_DRIVER, offlineDb));
    });

    await t.test('Suscripciones reales: solicitudes ordenadas y ofertas en tiempo real', async () => {
      const dbA = environment.authenticatedContext(RIVAL_A).firestore();

      const firstTrips = new Promise((resolve, reject) => {
        const unsubscribe = subscribeToPendingTrips(
          (trips) => { unsubscribe(); resolve(trips); },
          reject,
          dbA
        );
      });
      const pending = await firstTrips;
      assert.ok(pending.every((trip) => trip.status === 'pending'));
      assert.ok(pending.some((trip) => trip.id === 'trip-offline'));

      const offerUpdates = [];
      const unsubscribeOffers = subscribeToDriverTripOffers(
        RIVAL_A,
        (offers) => offerUpdates.push(offers),
        (error) => { throw error; },
        dbA
      );

      await createTripOffer(RIVAL_A, 'trip-offline', dbA);
      await new Promise((resolve) => setTimeout(resolve, 300));
      unsubscribeOffers();

      const latest = offerUpdates.at(-1);
      assert.equal(latest.get('trip-offline').status, 'offered');
      // La marca del servidor llega confirmada (no la hora provisional).
      assert.equal(typeof latest.get('trip-offline').offeredAt.toMillis, 'function');

      // Tras cancelar la suscripción no llegan más actualizaciones.
      const count = offerUpdates.length;
      await rejectTripOffer(RIVAL_A, 'trip-offline', 'manual', dbA);
      await new Promise((resolve) => setTimeout(resolve, 200));
      assert.equal(offerUpdates.length, count);
    });
  } finally {
    await environment.cleanup();
  }
});
