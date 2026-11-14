// AI-assisted: see docs/AI_LOG.md #28
// Pruebas de la lógica de solicitudes (tarjeta y selección) y del
// controlador createTripRequestFeed con suscripciones y reloj simulados.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { loadModule } = require('./helpers/loadModule.cjs');

const requestLogic = loadModule('src/utils/tripRequestLogic.js');
const { createTripRequestFeed, OFFER_RETRY_MS } = loadModule(
  'src/services/tripRequestFeed.js'
);
const { getTripMapConfiguration } = loadModule('src/utils/tripMapLogic.js');
const { isActiveDriverTrip } = loadModule('src/utils/activeTripLogic.js');

const NOW = 1_000_000;

function timestamp(millis) {
  return { toMillis: () => millis };
}

function pricedTrip(id, overrides = {}) {
  return {
    id,
    status: 'pending',
    driverId: null,
    pickup: { address: 'Parque de Berrío', latitude: 6.2518, longitude: -75.5636 },
    destination: { address: 'Estadio', latitude: 6.2565, longitude: -75.5905 },
    distanceKm: 8.5,
    durationMin: 22,
    category: 'xl',
    paymentMethod: 'cash',
    estimatedFare: 26900,
    ...overrides,
  };
}

function legacyTrip(id) {
  return {
    id,
    status: 'pending',
    driverId: null,
    pickup: { address: 'Origen antiguo', latitude: 6.2, longitude: -75.5 },
    destination: { address: 'Destino antiguo', latitude: 6.3, longitude: -75.6 },
    estimatedFare: 15000,
  };
}

function offer(offeredAtMs, status = 'offered') {
  return { status, offeredAt: offeredAtMs === null ? null : timestamp(offeredAtMs) };
}

// --- Tarjeta --------------------------------------------------------------

test('La tarjeta muestra todos los datos de la solicitud', () => {
  const card = requestLogic.buildTripRequestCard(
    pricedTrip('t1', { tip: 1000 }),
    offer(NOW - 3000),
    NOW
  );

  assert.equal(card.pickupAddress, 'Parque de Berrío');
  assert.equal(card.destinationAddress, 'Estadio');
  assert.equal(card.distanceKm, 8.5);
  assert.equal(card.distanceLabel, '8,5 km');
  assert.equal(card.durationLabel, '22 min');
  assert.equal(card.categoryLabel, 'XL');
  assert.equal(card.paymentMethodLabel, 'Efectivo');
  // Mismos importes que se guardarán al finalizar (módulo de tarifas).
  assert.deepEqual(card.estimate, {
    fare: 26900,
    commission: 5380,
    commissionRate: 0.2,
    driverEarnings: 22520,
    tip: 1000,
    fareSource: 'calculated',
  });
  assert.equal(card.timing.remainingSeconds, 12);
  assert.equal(card.canAccept, true);
});

test('Etiquetas de categorías y métodos de pago', () => {
  assert.equal(requestLogic.getCategoryLabel('economy'), 'Económico');
  assert.equal(requestLogic.getCategoryLabel('Premium'), 'Premium');
  assert.equal(requestLogic.getCategoryLabel(undefined), 'No especificada');
  assert.equal(requestLogic.getPaymentMethodLabel('mercadopago'), 'Mercado Pago');
  assert.equal(requestLogic.getPaymentMethodLabel('stripe'), 'Stripe');
  assert.equal(requestLogic.getPaymentMethodLabel('bitcoin'), 'No especificado');
});

test('Solicitud antigua: muestra lo disponible sin inventar datos', () => {
  const card = requestLogic.buildTripRequestCard(legacyTrip('old'), offer(NOW), NOW);

  assert.equal(card.distanceKm, null);
  assert.equal(card.distanceLabel, 'No disponible');
  assert.equal(card.durationLabel, 'No disponible');
  assert.equal(card.categoryLabel, 'No especificada');
  assert.equal(card.paymentMethodLabel, 'No especificado');
  assert.equal(card.estimate.fare, 15000);
  assert.equal(card.estimate.fareSource, 'estimated');
  assert.equal(card.canAccept, true);
});

test('Sin oferta confirmada o con datos inválidos no se puede aceptar', () => {
  const waiting = requestLogic.buildTripRequestCard(pricedTrip('t1'), offer(null), NOW);
  assert.equal(waiting.timing.state, 'waiting_server');
  assert.equal(waiting.canAccept, false);

  const noOffer = requestLogic.buildTripRequestCard(pricedTrip('t1'), undefined, NOW);
  assert.equal(noOffer.canAccept, false);

  const broken = requestLogic.buildTripRequestCard(
    { ...legacyTrip('bad'), estimatedFare: 'quince mil' },
    offer(NOW),
    NOW
  );
  assert.equal(broken.estimate, null);
  assert.equal(broken.canAccept, false);
});

test('Selección: oculta rechazadas, vencidas y ya asignadas', () => {
  const trips = [
    pricedTrip('fresh'),
    pricedTrip('rejected'),
    pricedTrip('expired'),
    pricedTrip('taken', { driverId: 'other-driver' }),
    pricedTrip('accepted', { status: 'accepted', driverId: 'other-driver' }),
    pricedTrip('new-without-offer'),
  ];
  const offers = new Map([
    ['fresh', offer(NOW - 2000)],
    ['rejected', offer(NOW - 2000, 'rejected')],
    ['expired', offer(NOW - 15_000)],
    ['taken', offer(NOW)],
    ['accepted', offer(NOW)],
  ]);

  const visible = requestLogic.selectVisibleTripRequests(trips, offers, NOW);

  assert.deepEqual(visible.map((card) => card.id), ['fresh', 'new-without-offer']);
  assert.deepEqual(requestLogic.getTripIdsNeedingOffer(trips, offers), ['new-without-offer']);
});

test('Selección de rechazos automáticos: solo ofertas vencidas y abiertas', () => {
  const trips = [pricedTrip('a'), pricedTrip('b'), pricedTrip('c')];
  const offers = new Map([
    ['a', offer(NOW - 16_000)],
    ['b', offer(NOW - 15_500)],
    ['c', offer(NOW - 30_000, 'rejected')],
  ]);

  assert.deepEqual(requestLogic.getTripIdsToAutoReject(trips, offers, NOW), ['a']);
});

// --- Ciclo y mapa ----------------------------------------------------------

test('El viaje en camino al origen es activo y su ruta va a la recogida', () => {
  const trip = { ...pricedTrip('t'), status: 'driver_arriving', driverId: 'd1' };
  const driver = { latitude: 6.24, longitude: -75.58 };

  assert.equal(isActiveDriverTrip(trip, 'd1'), true);
  assert.equal(
    getTripMapConfiguration(trip, driver).routeEnd.latitude,
    trip.pickup.latitude
  );
  assert.equal(
    getTripMapConfiguration({ ...trip, arrivedAt: timestamp(NOW) }, driver).routeLabel,
    'Ruta hacia el punto de recogida'
  );
  assert.equal(
    getTripMapConfiguration({ ...trip, status: 'in_progress' }, driver).routeEnd.latitude,
    trip.destination.latitude
  );
});

// --- Controlador -----------------------------------------------------------

function createHarness() {
  const harness = {
    now: NOW,
    tripListeners: [],
    offerListeners: [],
    unsubscribed: { trips: 0, offers: 0 },
    intervals: new Map(),
    nextIntervalId: 1,
    createdOffers: [],
    rejections: [],
    states: [],
    failCreateOffer: false,
    failReject: false,
  };

  harness.feed = createTripRequestFeed({
    subscribePendingTrips: (onData, onError) => {
      harness.tripListeners.push({ onData, onError });
      return () => { harness.unsubscribed.trips += 1; };
    },
    subscribeOffers: (onData, onError) => {
      harness.offerListeners.push({ onData, onError });
      return () => { harness.unsubscribed.offers += 1; };
    },
    createOffer: async (tripId) => {
      harness.createdOffers.push(tripId);
      if (harness.failCreateOffer) throw new Error('sin conexión');
    },
    rejectOffer: async (tripId, reason) => {
      harness.rejections.push([tripId, reason]);
      if (harness.failReject) throw new Error('permission-denied');
    },
    onChange: (state) => harness.states.push(state),
    now: () => harness.now,
    setIntervalFn: (callback, ms) => {
      const id = harness.nextIntervalId++;
      harness.intervals.set(id, { callback, ms });
      return id;
    },
    clearIntervalFn: (id) => harness.intervals.delete(id),
  });

  harness.emitTrips = (trips) => harness.tripListeners.at(-1).onData(trips);
  harness.emitOffers = (map) => harness.offerListeners.at(-1).onData(map);
  harness.tick = () => [...harness.intervals.values()].forEach(({ callback }) => callback());
  harness.lastState = () => harness.states.at(-1);

  return harness;
}

const flush = () => new Promise((resolve) => setImmediate(resolve));

test('Controlador: se suscribe una sola vez y limpia todo al detenerse', () => {
  const h = createHarness();

  h.feed.start();
  h.feed.start();

  assert.equal(h.tripListeners.length, 1);
  assert.equal(h.offerListeners.length, 1);
  assert.equal(h.intervals.size, 1);
  assert.equal([...h.intervals.values()][0].ms, 1000);
  assert.deepEqual(h.lastState(), { loading: true, error: '', requests: [] });

  h.feed.stop();
  h.feed.stop();

  assert.deepEqual(h.unsubscribed, { trips: 1, offers: 1 });
  assert.equal(h.intervals.size, 0);
  assert.equal(h.feed.isRunning(), false);

  // Tras detenerse, los datos tardíos no actualizan el estado.
  const statesBefore = h.states.length;
  h.emitTrips([pricedTrip('late')]);
  assert.equal(h.states.length, statesBefore);
});

test('Controlador: crea la oferta de cada solicitud nueva una sola vez', async () => {
  const h = createHarness();
  h.feed.start();

  h.emitOffers(new Map());
  h.emitTrips([pricedTrip('t1'), pricedTrip('t2')]);
  h.tick();
  h.tick();
  await flush();

  assert.deepEqual(h.createdOffers.sort(), ['t1', 't2']);
  assert.equal(h.lastState().loading, false);
  assert.deepEqual(h.lastState().requests.map((card) => card.timing.state), [
    'waiting_server',
    'waiting_server',
  ]);

  // Al llegar las ofertas confirmadas, comienza la cuenta regresiva.
  h.emitOffers(new Map([['t1', offer(NOW)], ['t2', offer(NOW)]]));
  assert.equal(h.lastState().requests[0].timing.remainingSeconds, 15);

  h.now += 4000;
  h.tick();
  assert.equal(h.lastState().requests[0].timing.remainingSeconds, 11);
  assert.equal(h.createdOffers.length, 2);
  h.feed.stop();
});

test('Controlador: reintenta crear la oferta tras un fallo', async () => {
  const h = createHarness();
  h.failCreateOffer = true;
  h.feed.start();

  h.emitOffers(new Map());
  h.emitTrips([pricedTrip('t1')]);
  await flush();
  h.tick();
  await flush();
  assert.equal(h.createdOffers.length, 1);

  h.failCreateOffer = false;
  h.now += OFFER_RETRY_MS;
  h.tick();
  await flush();
  assert.equal(h.createdOffers.length, 2);
  h.feed.stop();
});

test('Controlador: rechazo automático persistido al vencer, sin duplicados', async () => {
  const h = createHarness();
  h.feed.start();

  h.emitOffers(new Map([['t1', offer(NOW)]]));
  h.emitTrips([pricedTrip('t1')]);

  h.now = NOW + 15_000;
  h.tick();
  await flush();
  // Vencida: se oculta, pero aún dentro del margen de 1 s no se rechaza.
  assert.deepEqual(h.lastState().requests, []);
  assert.deepEqual(h.rejections, []);

  h.now = NOW + 16_000;
  h.tick();
  h.tick();
  await flush();
  assert.deepEqual(h.rejections, [['t1', 'expired']]);

  // Cuando la oferta queda rechazada ya no se vuelve a rechazar.
  h.emitOffers(new Map([['t1', offer(NOW, 'rejected')]]));
  h.now += 5000;
  h.tick();
  await flush();
  assert.equal(h.rejections.length, 1);
  h.feed.stop();
});

test('Controlador: si el rechazo automático falla, se reintenta', async () => {
  const h = createHarness();
  h.failReject = true;
  h.feed.start();

  h.emitOffers(new Map([['t1', offer(NOW)]]));
  h.emitTrips([pricedTrip('t1')]);
  h.now = NOW + 17_000;
  h.tick();
  await flush();
  h.tick();
  await flush();

  assert.equal(h.rejections.length, 2);
  h.feed.stop();
});

test('Controlador: al volver del segundo plano recalcula y rechaza lo vencido', async () => {
  const h = createHarness();
  h.feed.start();

  h.emitOffers(new Map([['t1', offer(NOW)], ['t2', offer(NOW + 10_000)]]));
  h.emitTrips([pricedTrip('t1'), pricedTrip('t2')]);
  assert.equal(h.lastState().requests.length, 2);

  // La app estuvo en segundo plano 20 s sin ticks del intervalo.
  h.now = NOW + 20_000;
  h.feed.refresh();
  await flush();

  assert.deepEqual(h.lastState().requests.map((card) => card.id), ['t2']);
  assert.equal(h.lastState().requests[0].timing.remainingSeconds, 5);
  assert.deepEqual(h.rejections, [['t1', 'expired']]);
  h.feed.stop();
});

test('Controlador: informa los errores de suscripción', () => {
  const h = createHarness();
  h.feed.start();

  h.tripListeners[0].onError(new Error('sin conexión'));

  assert.equal(h.lastState().loading, false);
  assert.equal(h.lastState().error, 'No se pudieron consultar las solicitudes de viajes.');
  h.feed.stop();
});
