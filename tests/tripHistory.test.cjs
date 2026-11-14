// AI-assisted: see docs/AI_LOG.md #40
// Historial de carreras: periodos, filtros combinados, orden, paginación,
// datos de la lista y del detalle, y la consulta (con Firestore simulado).
// Las fechas se construyen en hora local para que las pruebas no dependan
// de la zona horaria del equipo.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { loadModule } = require('./helpers/loadModule.cjs');

const history = loadModule('src/utils/tripHistoryLogic.js');
const { buildCompletionBreakdown } = loadModule('src/utils/fareLogic.js');

const { HISTORY_PERIOD } = history;
const ts = (date) => ({ seconds: Math.floor(date.getTime() / 1000), nanoseconds: 0, toMillis: () => date.getTime() });
const local = (y, m, d, h = 0, min = 0) => new Date(y, m - 1, d, h, min);

function trip(id, createdAt, overrides = {}) {
  return {
    id,
    status: 'paid',
    paymentMethod: 'cash',
    paymentStatus: 'cash',
    category: 'economy',
    pickup: { address: 'Origen', latitude: 6.25, longitude: -75.56 },
    destination: { address: 'Destino', latitude: 6.26, longitude: -75.59 },
    distanceKm: 8.5,
    durationMin: 22,
    createdAt: createdAt ? ts(createdAt) : undefined,
    ...buildCompletionBreakdown({ distanceKm: 8.5, durationMin: 22, category: 'economy', tip: 0 }),
    ...overrides,
  };
}

test('Periodos: Hoy, Semana (lunes a domingo) y Mes, con fin exclusivo', () => {
  const now = local(2026, 11, 14, 15, 30); // sábado
  const filters = (period) => ({ ...history.DEFAULT_HISTORY_FILTERS, period });

  assert.deepEqual(history.getPeriodBounds(filters(HISTORY_PERIOD.ALL), now), { start: null, end: null });

  const today = history.getPeriodBounds(filters(HISTORY_PERIOD.TODAY), now);
  assert.equal(today.start.getTime(), local(2026, 11, 14).getTime());
  assert.equal(today.end.getTime(), local(2026, 11, 15).getTime());

  const week = history.getPeriodBounds(filters(HISTORY_PERIOD.WEEK), now);
  assert.equal(week.start.getTime(), local(2026, 11, 9).getTime()); // lunes
  assert.equal(week.end.getTime(), local(2026, 11, 16).getTime());

  // Domingo pertenece a la semana que empezó el lunes anterior.
  const sunday = history.getPeriodBounds(filters(HISTORY_PERIOD.WEEK), local(2026, 11, 15, 23, 59));
  assert.equal(sunday.start.getTime(), local(2026, 11, 9).getTime());
  // Lunes empieza una semana nueva.
  const monday = history.getPeriodBounds(filters(HISTORY_PERIOD.WEEK), local(2026, 11, 16, 0, 1));
  assert.equal(monday.start.getTime(), local(2026, 11, 16).getTime());

  const month = history.getPeriodBounds(filters(HISTORY_PERIOD.MONTH), now);
  assert.equal(month.start.getTime(), local(2026, 11, 1).getTime());
  assert.equal(month.end.getTime(), local(2026, 12, 1).getTime());

  // Diciembre → enero del año siguiente; febrero bisiesto.
  const december = history.getPeriodBounds(filters(HISTORY_PERIOD.MONTH), local(2026, 12, 31, 22));
  assert.equal(december.end.getTime(), local(2027, 1, 1).getTime());
  const february = history.getPeriodBounds(filters(HISTORY_PERIOD.MONTH), local(2028, 2, 10));
  assert.equal(february.end.getTime(), local(2028, 3, 1).getTime());
});

test('Rango personalizado: días completos e inclusivos; rangos no válidos', () => {
  const range = (rangeStart, rangeEnd) => ({ period: HISTORY_PERIOD.RANGE, paymentMethod: 'all', rangeStart, rangeEnd });

  const bounds = history.getPeriodBounds(range(local(2026, 11, 3, 18), local(2026, 11, 5, 9)));
  assert.equal(bounds.start.getTime(), local(2026, 11, 3).getTime());
  assert.equal(bounds.end.getTime(), local(2026, 11, 6).getTime());

  // Un solo día.
  const oneDay = history.getPeriodBounds(range(local(2026, 11, 3), local(2026, 11, 3, 23, 59)));
  assert.equal(oneDay.end.getTime() - oneDay.start.getTime(), 24 * 3600 * 1000);

  assert.throws(() => history.getPeriodBounds(range(local(2026, 11, 6), local(2026, 11, 5))), /posterior/);
  assert.throws(() => history.getPeriodBounds(range(null, local(2026, 11, 5))), /Selecciona/);
  assert.throws(() => history.getPeriodBounds(range(new Date('x'), local(2026, 11, 5))), /Selecciona/);
  assert.throws(() => history.getPeriodBounds({ period: 'año' }), /no válido/);
});

test('Filtros combinados, límites y resultados vacíos', () => {
  const now = local(2026, 11, 14, 12);
  const trips = [
    trip('hoy-cash', local(2026, 11, 14, 8)),
    trip('hoy-mp', local(2026, 11, 14, 9), { paymentMethod: 'mercadopago', paymentStatus: 'approved' }),
    trip('inicio-semana', local(2026, 11, 9, 0, 0)),
    trip('antes-semana', local(2026, 11, 8, 23, 59)),
    trip('inicio-mes', local(2026, 11, 1, 0, 0), { paymentMethod: 'mercadopago', paymentStatus: 'approved' }),
    trip('mes-anterior', local(2026, 10, 31, 23, 59)),
    trip('cancelado', local(2026, 11, 13), { status: 'cancelled', paymentStatus: undefined }),
    trip('pendiente', local(2026, 11, 14, 10), { status: 'pending' }),
    trip('sin-fecha', null),
  ];
  const ids = (filters) => history.filterAndSortTrips(trips, { ...history.DEFAULT_HISTORY_FILTERS, ...filters }, now).map((t) => t.id);

  // Todos: ordenados (sin fecha al final); nunca viajes no finalizados.
  assert.deepEqual(ids({}), ['hoy-mp', 'hoy-cash', 'cancelado', 'inicio-semana', 'antes-semana', 'inicio-mes', 'mes-anterior', 'sin-fecha']);
  assert.deepEqual(ids({ period: 'today' }), ['hoy-mp', 'hoy-cash']);
  assert.deepEqual(ids({ period: 'week' }), ['hoy-mp', 'hoy-cash', 'cancelado', 'inicio-semana']);
  assert.deepEqual(ids({ period: 'month' }), ['hoy-mp', 'hoy-cash', 'cancelado', 'inicio-semana', 'antes-semana', 'inicio-mes']);
  // Combinaciones con método de pago.
  assert.deepEqual(ids({ period: 'today', paymentMethod: 'mercadopago' }), ['hoy-mp']);
  assert.deepEqual(ids({ period: 'month', paymentMethod: 'mercadopago' }), ['hoy-mp', 'inicio-mes']);
  assert.deepEqual(ids({ period: 'range', rangeStart: local(2026, 10, 31), rangeEnd: local(2026, 11, 1), paymentMethod: 'cash' }), ['mes-anterior']);
  // Vacíos.
  assert.deepEqual(ids({ paymentMethod: 'stripe' }), []);
  assert.deepEqual(ids({ period: 'range', rangeStart: local(2025, 1, 1), rangeEnd: local(2025, 1, 31) }), []);
  assert.deepEqual(history.filterAndSortTrips([], history.DEFAULT_HISTORY_FILTERS, now), []);
});

test('Orden estable y páginas sin duplicados', () => {
  const same = local(2026, 11, 14, 8);
  const sorted = [trip('a', same), trip('c', same), trip('b', same)].sort(history.compareTripsByDateDesc);
  assert.deepEqual(sorted.map((t) => t.id), ['c', 'b', 'a']);

  const page1 = [{ id: '1' }, { id: '2' }];
  const merged = history.mergeTripPages(page1, [{ id: '2' }, { id: '3' }]);
  assert.deepEqual(merged.map((t) => t.id), ['1', '2', '3']);
  assert.deepEqual(history.mergeTripPages(undefined, [{ id: 'x' }, { id: 'x' }]).map((t) => t.id), ['x']);
});

test('Elemento de la lista: categoría, tarifa, ganancia, estado y pago', () => {
  const item = history.buildHistoryListItem(trip('t1', local(2026, 11, 14, 8)));
  assert.equal(item.categoryLabel, 'Económico');
  assert.equal(item.fare, 19200);
  assert.equal(item.driverEarnings, 15360);
  assert.equal(item.statusLabel, 'Pagado');
  assert.equal(item.paymentMethodLabel, 'Efectivo');
  assert.equal(item.paymentStatusLabel, 'Efectivo recibido');
  assert.match(item.dateLabel, /2026/);

  const cancelled = history.buildHistoryListItem(trip('t2', local(2026, 11, 14), { status: 'cancelled', paymentStatus: undefined }));
  assert.equal(cancelled.cancelled, true);
  assert.equal(cancelled.fare, null);
  assert.equal(cancelled.driverEarnings, null);
  assert.equal(cancelled.paymentStatusLabel, 'Sin cobro');

  const noDate = history.buildHistoryListItem(trip('t3', null));
  assert.equal(noDate.dateLabel, 'Fecha no disponible');
});

test('Detalle: desglose real, 20 %, propina y "Sin calificación" sin inventar datos', () => {
  const withTip = trip('d1', local(2026, 11, 14, 8), {
    ...buildCompletionBreakdown({ distanceKm: 8.5, durationMin: 22, category: 'xl', tip: 2000 }),
    category: 'xl',
    completedAt: ts(local(2026, 11, 14, 8, 40)),
  });
  const detail = history.buildTripDetail(withTip);
  assert.equal(detail.fare, 26900);
  assert.equal(detail.commission, 5380);
  assert.equal(detail.commissionRateLabel, '20 %');
  assert.equal(detail.tip, 2000);
  assert.equal(detail.driverEarnings, 26900 - 5380 + 2000);
  assert.equal(detail.distanceLabel, '8,5 km');
  assert.equal(detail.durationLabel, '22 min');
  assert.equal(detail.ratingLabel, 'Sin calificación');
  assert.equal(detail.finishedTitle, 'Finalizado');

  assert.equal(history.getRatingLabel({ rating: 4.5 }), '4,5 / 5');
  for (const rating of [0, 6, '5', null, NaN]) {
    assert.equal(history.getRatingLabel({ rating }), 'Sin calificación', String(rating));
  }

  const missing = history.buildTripDetail({ id: 'm', status: 'completed', createdAt: ts(local(2026, 11, 1)) });
  assert.equal(missing.distanceLabel, 'No disponible');
  assert.equal(missing.durationLabel, 'No disponible');
  assert.equal(missing.fare, null);
  assert.equal(missing.hasBreakdown, false);
});

test('Coordenadas para el mapa: válidas o null', () => {
  assert.deepEqual(history.getTripRouteEndpoints(trip('m1', local(2026, 11, 1))), {
    pickup: { latitude: 6.25, longitude: -75.56 },
    destination: { latitude: 6.26, longitude: -75.59 },
  });
  assert.equal(history.getTripRouteEndpoints({ pickup: { latitude: 6 }, destination: { latitude: 6, longitude: -75 } }), null);
  assert.equal(history.getTripRouteEndpoints({ pickup: { latitude: 95, longitude: 0 }, destination: { latitude: 6, longitude: -75 } }), null);
  assert.equal(history.getTripRouteEndpoints({}), null);
});

// --- Servicio con Firestore simulado -----------------------------------------

function loadServiceWith(getDocsImpl) {
  const calls = [];
  const firestore = {
    collection: () => 'trips',
    where: (field, op, value) => { calls.push(['where', field, op, value]); return ['where', field]; },
    orderBy: (field, direction) => { calls.push(['orderBy', field, direction]); return 'orderBy'; },
    startAfter: (cursor) => { calls.push(['startAfter', cursor]); return 'startAfter'; },
    limit: (n) => { calls.push(['limit', n]); return 'limit'; },
    query: (...args) => args,
    getDocs: (q) => getDocsImpl(q, calls),
  };
  const service = loadModule('src/services/tripHistoryService.js', {
    'firebase/firestore': firestore,
    '../config/firebase': { db: {} },
  });
  return { service, calls };
}

const asDocs = (trips) => ({ docs: trips.map(({ id, ...data }) => ({ id, data: () => data })) });

test('Consulta: filtros en Firestore, orden descendente, cursor y límite', async () => {
  const pageTrips = Array.from({ length: 20 }, (_, i) => ({ id: `t${i}`, status: 'paid' }));
  const { service, calls } = loadServiceWith(async () => asDocs(pageTrips));
  const now = local(2026, 11, 14, 12);

  const page = await service.fetchTripHistoryPage('driver-1', { period: 'today', paymentMethod: 'mercadopago' }, { now, database: {} });
  assert.equal(page.trips.length, 20);
  assert.equal(page.hasMore, true);
  assert.equal(page.source, 'indexed');
  assert.equal(page.cursor.id, 't19');

  assert.deepEqual(calls.filter((c) => c[0] === 'where').map((c) => c.slice(1, 3)), [
    ['driverId', '=='], ['status', 'in'], ['paymentMethod', '=='], ['createdAt', '>='], ['createdAt', '<'],
  ]);
  const range = calls.filter((c) => c[1] === 'createdAt');
  assert.equal(range[0][3].getTime(), local(2026, 11, 14).getTime());
  assert.equal(range[1][3].getTime(), local(2026, 11, 15).getTime());
  assert.deepEqual(calls.find((c) => c[0] === 'orderBy'), ['orderBy', 'createdAt', 'desc']);
  assert.deepEqual(calls.find((c) => c[0] === 'limit'), ['limit', 20]);

  calls.length = 0;
  await service.fetchTripHistoryPage('driver-1', history.DEFAULT_HISTORY_FILTERS, { cursor: page.cursor, database: {} });
  assert.deepEqual(calls.find((c) => c[0] === 'startAfter'), ['startAfter', page.cursor]);
  // Sin filtros: solo conductor y estados finalizados.
  assert.deepEqual(calls.filter((c) => c[0] === 'where').map((c) => c[1]), ['driverId', 'status']);

  // Nunca más de 50 por consulta (regla del historial).
  calls.length = 0;
  await service.fetchTripHistoryPage('driver-1', history.DEFAULT_HISTORY_FILTERS, { pageSize: 500, database: {} });
  assert.deepEqual(calls.find((c) => c[0] === 'limit'), ['limit', 50]);
});

test('Consulta: última página, errores y validación de filtros', async () => {
  const { service } = loadServiceWith(async () => asDocs([{ id: 'a' }, { id: 'b' }]));
  const last = await service.fetchTripHistoryPage('driver-1', history.DEFAULT_HISTORY_FILTERS, { database: {} });
  assert.equal(last.hasMore, false);
  assert.equal(last.cursor, null);

  await assert.rejects(service.fetchTripHistoryPage(' ', history.DEFAULT_HISTORY_FILTERS), /obligatorio/);
  await assert.rejects(service.fetchTripHistoryPage('d', { period: 'all', paymentMethod: 'bitcoin' }), /Método de pago/);
  await assert.rejects(
    service.fetchTripHistoryPage('d', { period: 'range', paymentMethod: 'all', rangeStart: local(2026, 11, 5), rangeEnd: local(2026, 11, 1) }),
    /posterior/
  );

  const denied = loadServiceWith(async () => { throw Object.assign(new Error('denied'), { code: 'permission-denied' }); });
  await assert.rejects(denied.service.fetchTripHistoryPage('d', history.DEFAULT_HISTORY_FILTERS, { database: {} }), /denied/);
});

test('Respaldo sin índice: lee todo con la consulta existente, filtra y ordena en la app', async () => {
  const now = local(2026, 11, 14, 12);
  const all = [
    trip('viejo', local(2026, 11, 1), { paymentMethod: 'mercadopago' }),
    trip('nuevo', local(2026, 11, 14, 9), { paymentMethod: 'mercadopago' }),
    trip('cash', local(2026, 11, 14, 10)),
  ];
  let ordered = 0;
  const { service, calls } = loadServiceWith(async (q) => {
    if (q.includes('orderBy')) {
      ordered += 1;
      throw Object.assign(new Error('The query requires an index'), { code: 'failed-precondition' });
    }
    return asDocs(all);
  });

  const page = await service.fetchTripHistoryPage('driver-1', { ...history.DEFAULT_HISTORY_FILTERS, paymentMethod: 'mercadopago' }, { now, database: {} });
  assert.equal(ordered, 1);
  assert.equal(page.source, 'fallback');
  assert.equal(page.hasMore, false);
  assert.deepEqual(page.trips.map((t) => t.id), ['nuevo', 'viejo']);
  // La lectura de respaldo usa la consulta ya indexada (sin orderBy) y límite 50.
  assert.ok(calls.some((c) => c[0] === 'limit' && c[1] === 50));
});
