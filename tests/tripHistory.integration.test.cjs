// AI-assisted: see docs/AI_LOG.md #40
// Historial con los servicios reales de la app contra el emulador de
// Firestore y las reglas locales: orden por fecha, paginación sin duplicados,
// filtros combinados y aislamiento entre conductores.
// Nota: el emulador no exige índices compuestos; la consulta ordenada en el
// proyecto real necesita los índices de firestore.indexes.json (pendientes
// de despliegue) y, sin ellos, el servicio usa el respaldo (ver
// tests/tripHistory.test.cjs).
const fs = require('node:fs');
const { test } = require('node:test');
const assert = require('node:assert/strict');

const { initializeTestEnvironment, assertFails, assertSucceeds } = require('@firebase/rules-unit-testing');
const firestore = require('firebase/firestore');
const { loadModule } = require('./helpers/loadModule.cjs');

const services = loadModule('src/services/tripService.js', {
  'firebase/firestore': firestore,
  '../config/firebase': { db: null },
});
const historyService = loadModule('src/services/tripHistoryService.js', {
  'firebase/firestore': firestore,
  '../config/firebase': { db: null },
});
const history = loadModule('src/utils/tripHistoryLogic.js');
const { buildCompletionBreakdown } = loadModule('src/utils/fareLogic.js');

const PROJECT_ID = 'demo-uberclone-driver-history';
const DRIVER = 'driver-history';
const OTHER = 'driver-history-other';
const NOW = new Date(2026, 10, 14, 12, 0); // 14 nov 2026, 12:00 local
const TOTAL = 60;

// t-00 es el más antiguo y t-59 el más reciente: el orden de los IDs es el
// contrario al de las fechas que se pedirían sin orderBy.
function seededTrips() {
  return Array.from({ length: TOTAL }, (_, i) => {
    const createdAt = new Date(NOW.getTime() - (TOTAL - 1 - i) * 12 * 3600 * 1000);
    const status = ['completed', 'paid', 'cancelled'][i % 3];
    const paymentMethod = i % 2 === 0 ? 'cash' : 'mercadopago';
    return {
      id: `t-${String(i).padStart(2, '0')}`,
      data: {
        status,
        driverId: DRIVER,
        paymentMethod,
        category: 'economy',
        distanceKm: 5,
        durationMin: 15,
        estimatedFare: 13100,
        pickup: { address: 'Origen', latitude: 6.25, longitude: -75.56 },
        destination: { address: 'Destino', latitude: 6.26, longitude: -75.59 },
        createdAt,
        ...(status === 'cancelled'
          ? { cancelledAt: createdAt }
          : { completedAt: createdAt, ...buildCompletionBreakdown({ distanceKm: 5, durationMin: 15, category: 'economy', tip: 0 }) }),
      },
    };
  });
}

test('Historial de carreras (emulador y reglas)', async (t) => {
  const environment = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: { host: '127.0.0.1', port: 8080, rules: fs.readFileSync('firestore.rules', 'utf8') },
  });

  const seeded = seededTrips();
  // Verdad de referencia, con las mismas fechas que verá la app.
  const groundTruth = seeded.map(({ id, data }) => ({
    id,
    ...data,
    createdAt: firestore.Timestamp.fromDate(data.createdAt),
  }));

  try {
    await environment.clearFirestore();
    await environment.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore();
      const batch = firestore.writeBatch(db);
      for (const { id, data } of seeded) batch.set(firestore.doc(db, 'trips', id), data);
      // Otros viajes que no deben aparecer.
      batch.set(firestore.doc(db, 'trips', 'other-driver'), { ...seeded[59].data, driverId: OTHER });
      batch.set(firestore.doc(db, 'trips', 'active-own'), { ...seeded[59].data, status: 'accepted' });
      await batch.commit();
    });

    const db = environment.authenticatedContext(DRIVER).firestore();

    await t.test('getDriverTripHistory devuelve los 50 viajes MÁS RECIENTES', async () => {
      const recent = await services.getDriverTripHistory(DRIVER, undefined, db);
      const expected = history.filterAndSortTrips(groundTruth, history.DEFAULT_HISTORY_FILTERS, NOW).slice(0, 50);

      assert.equal(recent.length, 50);
      assert.deepEqual(recent.map((trip) => trip.id), expected.map((trip) => trip.id));
      // Los 10 más recientes (t-50 a t-59) están incluidos; los más antiguos no.
      assert.ok(recent.some((trip) => trip.id === 't-59'));
      assert.ok(!recent.some((trip) => trip.id === 't-00'));
    });

    await t.test('Paginación de 20 en 20: completa, ordenada y sin duplicados', async () => {
      const ids = [];
      let cursor = null;
      let pages = 0;
      do {
        const page = await historyService.fetchTripHistoryPage(DRIVER, history.DEFAULT_HISTORY_FILTERS, { cursor, now: NOW, database: db });
        assert.equal(page.source, 'indexed');
        ids.push(...page.trips.map((trip) => trip.id));
        cursor = page.cursor;
        pages += 1;
        if (!page.hasMore) break;
      } while (pages < 10);

      const expected = history.filterAndSortTrips(groundTruth, history.DEFAULT_HISTORY_FILTERS, NOW).map((trip) => trip.id);
      assert.deepEqual(ids, expected);
      assert.equal(new Set(ids).size, TOTAL);
      assert.ok(!ids.includes('other-driver'));
      assert.ok(!ids.includes('active-own'));
    });

    await t.test('Filtros combinados coinciden con la lógica de la app', async () => {
      const cases = [
        { period: 'today' },
        { period: 'week' },
        { period: 'month' },
        { period: 'month', paymentMethod: 'mercadopago' },
        { period: 'week', paymentMethod: 'cash' },
        { period: 'range', rangeStart: new Date(2026, 10, 3), rangeEnd: new Date(2026, 10, 5) },
        { period: 'range', rangeStart: new Date(2026, 10, 3), rangeEnd: new Date(2026, 10, 5), paymentMethod: 'cash' },
        { paymentMethod: 'stripe' },
        { period: 'range', rangeStart: new Date(2025, 0, 1), rangeEnd: new Date(2025, 0, 31) },
      ];

      for (const partial of cases) {
        const filters = { ...history.DEFAULT_HISTORY_FILTERS, ...partial };
        const ids = [];
        let cursor = null;
        for (let i = 0; i < 10; i += 1) {
          const page = await historyService.fetchTripHistoryPage(DRIVER, filters, { cursor, now: NOW, database: db });
          ids.push(...page.trips.map((trip) => trip.id));
          cursor = page.cursor;
          if (!page.hasMore) break;
        }
        const expected = history.filterAndSortTrips(groundTruth, filters, NOW).map((trip) => trip.id);
        assert.deepEqual(ids, expected, JSON.stringify(partial));
      }
    });

    await t.test('Reglas: el historial de otro conductor no es accesible', async () => {
      const otherDb = environment.authenticatedContext(OTHER).firestore();
      await assertFails(
        firestore.getDocs(historyService.buildOrderedHistoryQuery(otherDb, DRIVER, { paymentMethod: 'all' }, null, 20))
      );
      // Su propio historial sí (aunque esté vacío o sea de un solo viaje).
      await assertSucceeds(
        firestore.getDocs(historyService.buildOrderedHistoryQuery(otherDb, OTHER, { paymentMethod: 'all' }, null, 20))
      );
      // Sin sesión, tampoco.
      await assertFails(
        firestore.getDocs(historyService.buildOrderedHistoryQuery(environment.unauthenticatedContext().firestore(), DRIVER, { paymentMethod: 'all' }, null, 20))
      );
    });
  } finally {
    await environment.cleanup();
  }
});
