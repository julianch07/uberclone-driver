// AI-assisted: see docs/AI_LOG.md #21
const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { loadModule } = require('./helpers/loadModule.cjs');

const { getTripMapConfiguration } = loadModule(
  path.join(__dirname, '../src/utils/tripMapLogic.js')
);

const trip = (status = 'accepted', overrides = {}) => ({
  status,
  pickup: {
    latitude: 6.1967,
    longitude: -75.5732,
  },
  destination: {
    latitude: 6.2095,
    longitude: -75.57,
  },
  ...overrides,
});

const driver = {
  latitude: 6.25,
  longitude: -75.56,
};

test('En un viaje aceptado, la ruta termina en la recogida', () => {
  const result = getTripMapConfiguration(trip(), driver);

  assert.deepEqual(result.routeStart, driver);
  assert.deepEqual(result.routeEnd, trip().pickup);
});

test('En un viaje en curso, la ruta termina en el destino', () => {
  const result = getTripMapConfiguration(
    trip('in_progress'),
    driver
  );

  assert.deepEqual(result.routeStart, driver);
  assert.deepEqual(result.routeEnd, trip('in_progress').destination);
});

test('Conserva los marcadores de recogida y destino', () => {
  const result = getTripMapConfiguration(trip(), driver);

  assert.ok(result.pickup);
  assert.ok(result.destination);
});

test('No genera configuración para viajes finalizados', () => {
  assert.equal(
    getTripMapConfiguration(trip('completed'), driver),
    null
  );
});

test('No genera configuración si faltan coordenadas', () => {
  assert.equal(
    getTripMapConfiguration(
      trip('accepted', { destination: null }),
      driver
    ),
    null
  );
});

test('No inventa una posición cuando falta el GPS', () => {
  const result = getTripMapConfiguration(trip(), null);

  assert.equal(result.driver, null);
  assert.equal(result.routeStart, null);
});

test('Rechaza coordenadas fuera de rango', () => {
  assert.equal(
    getTripMapConfiguration(
      trip('accepted', {
        pickup: { latitude: 100, longitude: -75.5 },
      }),
      driver
    ),
    null
  );
});
