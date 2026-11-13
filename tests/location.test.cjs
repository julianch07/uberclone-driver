// AI-assisted: see docs/AI_LOG.md #13
const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { loadModule } = require('./helpers/loadModule.cjs');

const src = (...parts) => path.join(__dirname, '..', 'src', ...parts);

const logic = loadModule(src('utils', 'locationLogic.js'));

// ---------- Lógica pura ----------

test('normalizePermission distingue concedido, denegado, bloqueado y sin decidir', () => {
  assert.deepEqual(
    logic.normalizePermission({ status: 'granted', granted: true, canAskAgain: true }),
    { status: 'granted', canAskAgain: true }
  );
  assert.equal(
    logic.normalizePermission({ status: 'denied', canAskAgain: true }).status,
    'denied'
  );
  assert.equal(
    logic.normalizePermission({ status: 'denied', canAskAgain: false }).status,
    'blocked'
  );
  assert.equal(
    logic.normalizePermission({ status: 'undetermined', canAskAgain: true }).status,
    'undetermined'
  );
  assert.equal(logic.normalizePermission(null).status, 'undetermined');
  assert.equal(logic.normalizePermission(undefined).status, 'undetermined');
});

test('isValidCoordinates acepta rangos válidos y rechaza el resto', () => {
  const valid = [
    { latitude: 0, longitude: 0 },
    { latitude: 90, longitude: 180 },
    { latitude: -90, longitude: -180 },
    { latitude: 6.2442, longitude: -75.5812 },
  ];
  const invalid = [
    null,
    undefined,
    {},
    { latitude: 90.01, longitude: 0 },
    { latitude: -90.01, longitude: 0 },
    { latitude: 0, longitude: 180.01 },
    { latitude: 0, longitude: -180.01 },
    { latitude: NaN, longitude: 0 },
    { latitude: 0, longitude: Infinity },
    { latitude: '6.2', longitude: -75.5 },
    { latitude: 6.2 },
    { longitude: -75.5 },
  ];

  valid.forEach((p) => assert.equal(logic.isValidCoordinates(p), true));
  invalid.forEach((p) => assert.equal(logic.isValidCoordinates(p), false, JSON.stringify(p)));
});

test('normalizePosition extrae coordenadas reales y descarta las inválidas', () => {
  assert.deepEqual(
    logic.normalizePosition({
      coords: { latitude: 6.2, longitude: -75.5, accuracy: 8, altitude: 1500 },
      timestamp: 1700000000000,
    }),
    { latitude: 6.2, longitude: -75.5, accuracy: 8, timestamp: 1700000000000 }
  );
  assert.equal(
    logic.normalizePosition({ coords: { latitude: 6.2, longitude: -75.5, accuracy: -1 } }).accuracy,
    null
  );
  assert.equal(logic.normalizePosition({ coords: { latitude: 999, longitude: 0 } }), null);
  assert.equal(logic.normalizePosition(null), null);
  assert.equal(logic.normalizePosition({}), null);
});

test('distanceMeters da distancias razonables', () => {
  const a = { latitude: 6.2442, longitude: -75.5812 };
  assert.equal(Math.round(logic.distanceMeters(a, a)), 0);
  // 0.001° de latitud ≈ 111 m
  const d = logic.distanceMeters(a, { latitude: 6.2452, longitude: -75.5812 });
  assert.ok(d > 105 && d < 117, `distancia ${d}`);
});

test('shouldPublishLocation evita escrituras redundantes', () => {
  const base = { latitude: 6.2442, longitude: -75.5812 };
  const last = { ...base, at: 1_000_000 };
  const near = { latitude: 6.24421, longitude: -75.5812 }; // ~1 m
  const far = { latitude: 6.2452, longitude: -75.5812 }; // ~111 m

  assert.deepEqual(logic.shouldPublishLocation(null, base, 0), { publish: true, reason: 'first' });
  assert.equal(logic.shouldPublishLocation(last, far, last.at + 3000).reason, 'throttled');
  assert.equal(logic.shouldPublishLocation(last, near, last.at + 20000).reason, 'unchanged');
  assert.deepEqual(logic.shouldPublishLocation(last, far, last.at + 20000), { publish: true, reason: 'moved' });
  assert.deepEqual(logic.shouldPublishLocation(last, near, last.at + 60000), { publish: true, reason: 'heartbeat' });
  assert.equal(logic.shouldPublishLocation(last, { latitude: 200, longitude: 0 }, last.at + 99999).reason, 'invalid');
});

test('classifyLocationError mapea los errores de GPS', () => {
  assert.equal(logic.classifyLocationError({ code: 'E_LOCATION_UNAUTHORIZED', message: 'Permission denied' }), 'permission-denied');
  assert.equal(logic.classifyLocationError({ message: 'Location services are disabled' }), 'services-disabled');
  assert.equal(logic.classifyLocationError({ message: 'Location request timed out' }), 'timeout');
  assert.equal(logic.classifyLocationError({ message: 'Location is unavailable' }), 'position-unavailable');
  assert.equal(logic.classifyLocationError(new Error('algo raro')), 'unknown');
  assert.equal(logic.classifyLocationError(null), 'unknown');
});

// ---------- locationService con expo-location simulado ----------

function createLocationMock(overrides = {}) {
  const state = { removed: 0, watchCallbacks: [], resolveWatch: null };

  const mock = {
    Accuracy: { Balanced: 3 },
    getForegroundPermissionsAsync: async () => ({ status: 'undetermined', canAskAgain: true, granted: false }),
    requestForegroundPermissionsAsync: async () => ({ status: 'granted', canAskAgain: true, granted: true }),
    hasServicesEnabledAsync: async () => true,
    getCurrentPositionAsync: async () => ({
      coords: { latitude: 6.2442, longitude: -75.5812, accuracy: 10 },
      timestamp: 1,
    }),
    watchPositionAsync: async (options, callback) => {
      state.watchCallbacks.push(callback);
      return { remove: () => { state.removed += 1; } };
    },
    ...overrides,
  };

  return { mock, state };
}

function loadLocationService(mock) {
  return loadModule(src('services', 'locationService.js'), { 'expo-location': mock });
}

test('locationService: permisos concedidos y denegados', async () => {
  const granted = createLocationMock({
    getForegroundPermissionsAsync: async () => ({ status: 'granted', granted: true, canAskAgain: true }),
  });
  assert.equal((await loadLocationService(granted.mock).getForegroundPermission()).status, 'granted');

  const denied = createLocationMock({
    requestForegroundPermissionsAsync: async () => ({ status: 'denied', granted: false, canAskAgain: true }),
  });
  assert.equal((await loadLocationService(denied.mock).requestForegroundPermission()).status, 'denied');

  const blocked = createLocationMock({
    requestForegroundPermissionsAsync: async () => ({ status: 'denied', granted: false, canAskAgain: false }),
  });
  assert.equal((await loadLocationService(blocked.mock).requestForegroundPermission()).status, 'blocked');
});

test('locationService: obtiene las coordenadas actuales', async () => {
  const { mock } = createLocationMock();
  const position = await loadLocationService(mock).getCurrentPosition();
  assert.deepEqual(position, { latitude: 6.2442, longitude: -75.5812, accuracy: 10, timestamp: 1 });
});

test('locationService: errores de GPS se convierten en LocationError con mensaje en español', async () => {
  const { mock } = createLocationMock({
    getCurrentPositionAsync: async () => { throw new Error('Location services are disabled'); },
  });
  const service = loadLocationService(mock);

  await assert.rejects(service.getCurrentPosition(), (error) => {
    assert.equal(error.name, 'LocationError');
    assert.equal(error.code, 'services-disabled');
    assert.match(error.message, /GPS/);
    return true;
  });

  const invalid = createLocationMock({
    getCurrentPositionAsync: async () => ({ coords: { latitude: 500, longitude: 0 } }),
  });
  await assert.rejects(
    loadLocationService(invalid.mock).getCurrentPosition(),
    (error) => error.code === 'position-unavailable'
  );
});

test('locationService: comprueba si el GPS está activo', async () => {
  const off = createLocationMock({ hasServicesEnabledAsync: async () => false });
  assert.equal(await loadLocationService(off.mock).hasLocationServicesEnabled(), false);
});

test('locationService: watchPosition entrega posiciones y stop() elimina la suscripción', async () => {
  const { mock, state } = createLocationMock();
  const service = loadLocationService(mock);
  const received = [];

  const stop = service.watchPosition((p) => received.push(p), () => {});
  await new Promise((resolve) => setImmediate(resolve));

  state.watchCallbacks[0]({ coords: { latitude: 6.1, longitude: -75.1, accuracy: 5 }, timestamp: 2 });
  state.watchCallbacks[0]({ coords: { latitude: 999, longitude: 0 } }); // inválida: se ignora
  assert.equal(received.length, 1);

  stop();
  assert.equal(state.removed, 1);

  // Después de stop() no se entrega nada más y stop() es idempotente.
  state.watchCallbacks[0]({ coords: { latitude: 6.2, longitude: -75.2 }, timestamp: 3 });
  stop();
  assert.equal(received.length, 1);
  assert.equal(state.removed, 1);
});

test('locationService: stop() antes de que se cree la suscripción la elimina al resolverse', async () => {
  let resolveSubscription;
  let removed = 0;
  const { mock } = createLocationMock({
    watchPositionAsync: () =>
      new Promise((resolve) => {
        resolveSubscription = () => resolve({ remove: () => { removed += 1; } });
      }),
  });
  const service = loadLocationService(mock);

  const stop = service.watchPosition(() => {}, () => {});
  stop(); // el conductor se desconecta antes de que el GPS arranque
  resolveSubscription();
  await new Promise((resolve) => setImmediate(resolve));

  assert.equal(removed, 1);
});

test('locationService: error al iniciar el seguimiento se informa una sola vez', async () => {
  const { mock } = createLocationMock({
    watchPositionAsync: async () => { throw new Error('Location permission denied'); },
  });
  const errors = [];
  loadLocationService(mock).watchPosition(() => {}, (e) => errors.push(e));
  await new Promise((resolve) => setImmediate(resolve));

  assert.equal(errors.length, 1);
  assert.equal(errors[0].code, 'permission-denied');
});

// ---------- driverLocationService (publicador) ----------

function loadPublisherFactory() {
  const mocks = {
    'firebase/firestore': {
      deleteDoc: async () => {},
      doc: () => ({}),
      serverTimestamp: () => 'SERVER_TIMESTAMP',
      setDoc: async () => {},
    },
    '../config/firebase': { db: {} },
  };
  return loadModule(src('services', 'driverLocationService.js'), mocks);
}

const POSITION = { latitude: 6.2442, longitude: -75.5812, accuracy: 10 };

test('publicador: no escribe antes de start() ni después de stop()', async () => {
  const { createLocationPublisher } = loadPublisherFactory();
  const writes = [];
  const publisher = createLocationPublisher({
    uid: 'u1',
    writer: async (uid, p) => { writes.push([uid, p]); },
    remover: async () => {},
  });

  assert.equal((await publisher.publish(POSITION)).reason, 'inactive');

  publisher.start();
  assert.equal((await publisher.publish(POSITION)).status, 'published');
  assert.equal(writes.length, 1);

  publisher.stop();
  assert.equal((await publisher.publish({ latitude: 7, longitude: -75 })).reason, 'inactive');
  assert.equal(writes.length, 1);
});

test('publicador: aplica frecuencia, distancia mínima y rechaza coordenadas inválidas', async () => {
  const { createLocationPublisher } = loadPublisherFactory();
  let clock = 1_000_000;
  const writes = [];
  const publisher = createLocationPublisher({
    uid: 'u1',
    now: () => clock,
    writer: async (uid, p) => { writes.push(p); },
    remover: async () => {},
  });

  publisher.start();
  assert.equal((await publisher.publish(POSITION)).status, 'published');

  clock += 3000;
  assert.equal((await publisher.publish({ latitude: 6.3, longitude: -75.5 })).reason, 'throttled');

  clock += 10000;
  assert.equal((await publisher.publish({ ...POSITION, latitude: 6.24421 })).reason, 'unchanged');
  assert.equal((await publisher.publish({ latitude: 91, longitude: 0 })).reason, 'invalid');
  assert.equal((await publisher.publish({ latitude: 6.26, longitude: -75.5812 })).reason, 'moved');
  assert.equal(writes.length, 2);
});

test('publicador: una escritura en curso no permite una segunda simultánea', async () => {
  const { createLocationPublisher } = loadPublisherFactory();
  let release;
  const writes = [];
  const publisher = createLocationPublisher({
    uid: 'u1',
    writer: (uid, p) => new Promise((resolve) => { writes.push(p); release = resolve; }),
    remover: async () => {},
  });

  publisher.start();
  const first = publisher.publish(POSITION);
  assert.equal((await publisher.publish({ latitude: 6.5, longitude: -75 })).reason, 'busy');
  release();
  assert.equal((await first).status, 'published');
  assert.equal(writes.length, 1);
});

test('publicador: carrera con la desconexión; clear() espera la escritura y borra después', async () => {
  const { createLocationPublisher } = loadPublisherFactory();
  const order = [];
  let release;
  const publisher = createLocationPublisher({
    uid: 'u1',
    writer: () => new Promise((resolve) => { release = () => { order.push('write-done'); resolve(); }; }),
    remover: async () => { order.push('delete'); },
  });

  publisher.start();
  const publishing = publisher.publish(POSITION);

  const clearing = publisher.clear(); // el conductor se desconecta con una escritura en vuelo
  assert.equal(publisher.isActive(), false);

  // Una posición GPS tardía después de desconectarse no se publica.
  assert.equal((await publisher.publish({ latitude: 6.9, longitude: -75 })).reason, 'inactive');

  release();
  await publishing;
  assert.equal(await clearing, true);
  assert.deepEqual(order, ['write-done', 'delete']);
});

test('publicador: clear() informa false si no se pudo borrar y no lanza', async () => {
  const { createLocationPublisher } = loadPublisherFactory();
  const originalError = console.error;
  console.error = () => {};

  try {
    const publisher = createLocationPublisher({
      uid: 'u1',
      writer: async () => {},
      remover: async () => { throw new Error('sin red'); },
    });
    assert.equal(await publisher.clear(), false);
  } finally {
    console.error = originalError;
  }
});

test('publicador: errores de conexión se informan y permission-denied bloquea reintentos', async () => {
  const { createLocationPublisher } = loadPublisherFactory();
  let clock = 0;
  let failWith = { code: 'unavailable' };
  let calls = 0;
  const publisher = createLocationPublisher({
    uid: 'u1',
    now: () => (clock += 100000),
    writer: async () => { calls += 1; throw failWith; },
    remover: async () => {},
  });

  publisher.start();
  let result = await publisher.publish(POSITION);
  assert.equal(result.status, 'error');
  assert.equal(result.code, 'unavailable');
  assert.match(result.message, /conexión/);

  failWith = { code: 'permission-denied' };
  result = await publisher.publish(POSITION);
  assert.equal(result.status, 'error');
  assert.equal(result.code, 'permission-denied');

  // Bloqueado hasta un nuevo start().
  assert.equal((await publisher.publish(POSITION)).reason, 'blocked');
  assert.equal(calls, 2);
});

test('writeDriverLocation guarda solo latitud, longitud, precisión y fecha del servidor', async () => {
  const written = [];
  const service = loadModule(src('services', 'driverLocationService.js'), {
    'firebase/firestore': {
      deleteDoc: async () => {},
      doc: (db, collection, uid) => ({ collection, uid }),
      serverTimestamp: () => 'SERVER_TIMESTAMP',
      setDoc: async (ref, data, options) => { written.push({ ref, data, options }); },
    },
    '../config/firebase': { db: {} },
  });

  await service.writeDriverLocation('abc', { latitude: 1, longitude: 2, accuracy: undefined, extra: 'x' });

  assert.equal(written.length, 1);
  assert.deepEqual(written[0].ref, { collection: 'driverLocations', uid: 'abc' });
  assert.deepEqual(written[0].data, { latitude: 1, longitude: 2, accuracy: null, updatedAt: 'SERVER_TIMESTAMP' });
  assert.equal(written[0].options, undefined); // sin merge
});
