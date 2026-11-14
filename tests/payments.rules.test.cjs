// AI-assisted: see docs/AI_LOG.md #29
// Reglas de Firestore del cobro en efectivo y el saldo del conductor.
// Las escrituras se hacen directamente (sin el servicio) para comprobar
// qué permitiría un cliente modificado.
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
  count,
  deleteDoc,
  getAggregateFromServer,
  startAfter,
  sum,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} = require('firebase/firestore');

const { loadModule } = require('./helpers/loadModule.cjs');
const { buildCompletionBreakdown } = loadModule('src/utils/fareLogic.js');
const { buildCashCommissionEntry } = loadModule('src/utils/cashPaymentLogic.js');

const PROJECT_ID = 'demo-uberclone-driver-payments';
const DRIVER = 'driver-pay';
const OTHER = 'driver-pay-other';

function completedTrip(overrides = {}) {
  const pricing = { distanceKm: 8.5, durationMin: 22, category: 'economy', tip: 1000, estimatedFare: 19200 };

  return {
    status: 'completed',
    driverId: DRIVER,
    pickup: { address: 'Origen', latitude: 6.25, longitude: -75.56 },
    destination: { address: 'Destino', latitude: 6.26, longitude: -75.59 },
    ...pricing,
    paymentMethod: 'cash',
    createdAt: new Date(),
    completedAt: new Date(),
    ...buildCompletionBreakdown(pricing),
    ...overrides,
  };
}

test('Reglas de cobros en efectivo y saldo del conductor', async (t) => {
  const environment = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      host: '127.0.0.1',
      port: 8080,
      rules: fs.readFileSync('firestore.rules', 'utf8'),
    },
  });

  async function seedTrip(tripId, overrides = {}) {
    const data = completedTrip(overrides);
    await environment.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), 'trips', tripId), data);
    });
    return data;
  }

  function dbAs(driverId) {
    return environment.authenticatedContext(driverId).firestore();
  }

  // Cobro tal como lo escribe la app: viaje → paid y asiento, juntos.
  function registerCash(tripId, trip, {
    as = DRIVER,
    ledgerOwner = as,
    entryId = `cash_${tripId}`,
    tripChanges = {},
    entryChanges = {},
    skipTrip = false,
    skipEntry = false,
  } = {}) {
    const db = dbAs(as);
    const batch = writeBatch(db);

    if (!skipTrip) {
      batch.update(doc(db, 'trips', tripId), {
        status: 'paid',
        paymentStatus: 'cash',
        paidAt: serverTimestamp(),
        ...tripChanges,
      });
    }

    if (!skipEntry) {
      batch.set(doc(db, 'drivers', ledgerOwner, 'ledgerEntries', entryId), {
        ...buildCashCommissionEntry(tripId, trip),
        createdAt: serverTimestamp(),
        ...entryChanges,
      });
    }

    return batch.commit();
  }

  try {
    await environment.clearFirestore();

    await t.test('Permite registrar el cobro con el asiento en la misma escritura', async () => {
      const trip = await seedTrip('trip-cash-ok');

      await assertSucceeds(registerCash('trip-cash-ok', trip));

      await environment.withSecurityRulesDisabled(async (context) => {
        const db = context.firestore();
        const stored = (await getDoc(doc(db, 'trips', 'trip-cash-ok'))).data();
        const entry = (await getDoc(doc(db, 'drivers', DRIVER, 'ledgerEntries', 'cash_trip-cash-ok'))).data();

        assert.equal(stored.status, 'paid');
        assert.equal(stored.paymentStatus, 'cash');
        assert.equal(stored.fare, 19200);
        assert.equal(entry.cashAmount, 20200);
        assert.equal(entry.commission, 3840);
        assert.equal(entry.driverEarnings, 16360);
        assert.equal(entry.status, 'pending');
      });
    });

    await t.test('Impide pagar el viaje sin crear el asiento, o crear el asiento sin pagar el viaje', async () => {
      const trip = await seedTrip('trip-cash-half');

      await assertFails(registerCash('trip-cash-half', trip, { skipEntry: true }));
      await assertFails(registerCash('trip-cash-half', trip, { skipTrip: true }));
    });

    for (const [name, entryChanges] of [
      ['una comisión menor', { commission: 1000, amount: 1000 }],
      ['un importe adeudado distinto', { amount: 0 }],
      ['más efectivo recibido', { cashAmount: 50000 }],
      ['una ganancia mayor', { driverEarnings: 20200 }],
      ['otra tarifa', { fare: 10000 }],
      ['otra propina', { tip: 0 }],
      ['otro porcentaje', { commissionRate: 0.1 }],
      ['estado liquidado', { status: 'settled' }],
      ['otro tipo de asiento', { type: 'settlement' }],
      ['otra moneda', { currency: 'USD' }],
      ['hora del cliente', { createdAt: new Date() }],
      ['campos adicionales', { approvedBy: 'admin' }],
    ]) {
      await t.test(`Impide un asiento con ${name}`, async () => {
        const tripId = `trip-cash-tamper-${name.replaceAll(' ', '-')}`;
        const trip = await seedTrip(tripId);

        await assertFails(registerCash(tripId, trip, { entryChanges }));
      });
    }

    await t.test('Impide un asiento con un ID distinto del viaje', async () => {
      const trip = await seedTrip('trip-cash-id');

      await assertFails(registerCash('trip-cash-id', trip, { entryId: 'trip-cash-id' }));
      await assertFails(registerCash('trip-cash-id', trip, { entryId: 'cash_otro-viaje' }));
    });

    for (const [name, tripChanges] of [
      ['un estado de pago distinto', { paymentStatus: 'approved' }],
      ['la hora del cliente', { paidAt: new Date() }],
      ['cambios en la tarifa', { fare: 50000 }],
      ['cambios en el método de pago', { paymentMethod: 'mercadopago' }],
    ]) {
      await t.test(`Impide registrar el cobro con ${name}`, async () => {
        const tripId = `trip-cash-tripchange-${name.replaceAll(' ', '-')}`;
        const trip = await seedTrip(tripId);

        await assertFails(registerCash(tripId, trip, { tripChanges }));
      });
    }

    await t.test('Impide registrar efectivo en pagos digitales o sin método de pago', async () => {
      for (const [tripId, paymentMethod] of [
        ['trip-cash-mp', 'mercadopago'],
        ['trip-cash-stripe', 'stripe'],
        ['trip-cash-none', null],
      ]) {
        const trip = await seedTrip(tripId, { paymentMethod });
        await assertFails(registerCash(tripId, trip));
      }
    });

    await t.test('El conductor no puede marcar como pagado un viaje digital', async () => {
      await seedTrip('trip-digital', { paymentMethod: 'mercadopago' });

      await assertFails(
        updateDoc(doc(dbAs(DRIVER), 'trips', 'trip-digital'), {
          status: 'paid',
          paymentStatus: 'approved',
          paidAt: serverTimestamp(),
        })
      );
    });

    await t.test('Impide registrar el cobro de viajes no finalizados', async () => {
      for (const [tripId, status] of [
        ['trip-cash-progress', 'in_progress'],
        ['trip-cash-cancelled', 'cancelled'],
        ['trip-cash-accepted', 'accepted'],
      ]) {
        const trip = await seedTrip(tripId, { status });
        await assertFails(registerCash(tripId, trip));
      }
    });

    await t.test('Impide registrar el cobro de un viaje de otro conductor', async () => {
      const trip = await seedTrip('trip-cash-foreign');

      // En su propio saldo.
      await assertFails(registerCash('trip-cash-foreign', trip, { as: OTHER }));
      // En el saldo del conductor asignado.
      await assertFails(
        registerCash('trip-cash-foreign', trip, { as: OTHER, ledgerOwner: DRIVER })
      );
    });

    await t.test('Un cobro no se puede repetir, modificar ni borrar', async () => {
      const trip = await seedTrip('trip-cash-once');
      await assertSucceeds(registerCash('trip-cash-once', trip));

      // Segundo registro.
      await assertFails(registerCash('trip-cash-once', trip));

      const db = dbAs(DRIVER);
      const entryRef = doc(db, 'drivers', DRIVER, 'ledgerEntries', 'cash_trip-cash-once');

      // El conductor no puede liquidar ni borrar su deuda.
      await assertFails(updateDoc(entryRef, { status: 'settled' }));
      await assertFails(updateDoc(entryRef, { commission: 0, amount: 0 }));
      await assertFails(deleteDoc(entryRef));

      // El viaje pagado es inmutable.
      for (const change of [
        { status: 'completed' },
        { paymentStatus: 'approved' },
        { fare: 1 },
        { driverEarnings: 99999 },
      ]) {
        await assertFails(updateDoc(doc(db, 'trips', 'trip-cash-once'), change));
      }
    });

    await t.test('Solo el conductor lee su saldo', async () => {
      await assertSucceeds(
        getDocs(collection(dbAs(DRIVER), 'drivers', DRIVER, 'ledgerEntries'))
      );
      await assertFails(
        getDocs(collection(dbAs(OTHER), 'drivers', DRIVER, 'ledgerEntries'))
      );
      await assertFails(
        getDocs(collection(environment.unauthenticatedContext().firestore(), 'drivers', DRIVER, 'ledgerEntries'))
      );
    });

    await t.test('El historial incluye los viajes pagados', async () => {
      const snapshot = await assertSucceeds(
        getDocs(query(
          collection(dbAs(DRIVER), 'trips'),
          where('driverId', '==', DRIVER),
          where('status', 'in', ['completed', 'paid', 'cancelled']),
          limit(50)
        ))
      );

      assert.ok(snapshot.docs.some((item) => item.data().status === 'paid'));
    });

    // AI-assisted: see docs/AI_LOG.md #29
    // Consultas de completitud: cobros pendientes paginados y saldo agregado.

    function pendingCashQuery(db, driverId, size, cursor = null) {
      return query(
        collection(db, 'trips'),
        where('driverId', '==', driverId),
        where('status', '==', 'completed'),
        where('paymentMethod', '==', 'cash'),
        ...(cursor ? [startAfter(cursor)] : []),
        limit(size)
      );
    }

    await t.test('La consulta paginada de cobros pendientes respeta las reglas', async () => {
      for (let i = 0; i < 3; i += 1) {
        await seedTrip(`trip-page-${i}`);
      }

      const db = dbAs(DRIVER);
      const first = await assertSucceeds(getDocs(pendingCashQuery(db, DRIVER, 2)));
      assert.equal(first.docs.length, 2);

      const second = await assertSucceeds(
        getDocs(pendingCashQuery(db, DRIVER, 2, first.docs.at(-1)))
      );
      assert.ok(second.docs.length >= 1);

      // Límite máximo de la regla: 50.
      await assertSucceeds(getDocs(pendingCashQuery(db, DRIVER, 50)));
      await assertFails(getDocs(pendingCashQuery(db, DRIVER, 51)));
      // Cobros pendientes de otro conductor.
      await assertFails(getDocs(pendingCashQuery(dbAs(OTHER), DRIVER, 50)));
    });

    await t.test('Las agregaciones del saldo solo las puede pedir el propio conductor', async () => {
      const entries = (db) => query(
        collection(db, 'drivers', DRIVER, 'ledgerEntries'),
        where('type', '==', 'cash_commission')
      );
      const aggregates = { n: count(), pending: sum('commission') };

      const own = await assertSucceeds(getAggregateFromServer(entries(dbAs(DRIVER)), aggregates));
      assert.ok(own.data().n >= 1);

      await assertFails(getAggregateFromServer(entries(dbAs(OTHER)), aggregates));
      await assertFails(
        getAggregateFromServer(entries(environment.unauthenticatedContext().firestore()), aggregates)
      );
    });
  } finally {
    await environment.cleanup();
  }
});
