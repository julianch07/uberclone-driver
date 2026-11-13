// AI-assisted: see docs/AI_LOG.md #15
const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { loadModule } = require('./helpers/loadModule.cjs');

const modulePath = path.join(
  __dirname, '..', 'src', 'utils', 'tripLogic.js'
);

const {
  isValidTrip,
  canAcceptTrip,
  canStartTrip,
  canCompleteTrip,
  canCancelTrip,
} = loadModule(modulePath);

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
    ...overrides,
  };
}

test('Acepta una solicitud con estructura válida', () => {
  assert.equal(isValidTrip(validTrip()), true);
});

test('Rechaza una solicitud sin origen', () => {
  const trip = validTrip();
  delete trip.pickup;
  assert.equal(isValidTrip(trip), false);
});

test('Rechaza coordenadas fuera de rango', () => {
  const trip = validTrip({
    pickup: { address: 'Origen', latitude: 100, longitude: -75.5 },
  });
  assert.equal(isValidTrip(trip), false);
});

test('Rechaza una tarifa inválida', () => {
  assert.equal(isValidTrip(validTrip({ estimatedFare: -100 })), false);
  assert.equal(isValidTrip(validTrip({ estimatedFare: '15000' })), false);
});

test('Permite aceptar una solicitud pendiente a un conductor habilitado', () => {
  assert.equal(canAcceptTrip(validTrip(), 'driver-1', true), true);
});

test('Impide aceptar si el conductor no está habilitado', () => {
  assert.equal(canAcceptTrip(validTrip(), 'driver-1', false), false);
});

test('Impide aceptar si no existe un identificador de conductor', () => {
  assert.equal(canAcceptTrip(validTrip(), '', true), false);
});

test('Impide aceptar un viaje previamente asignado', () => {
  const trip = validTrip({ status: 'accepted', driverId: 'driver-2' });
  assert.equal(canAcceptTrip(trip, 'driver-1', true), false);
});

test('Permite iniciar un viaje aceptado por su conductor', () => {
  assert.equal(
    canStartTrip(validTrip({ status: 'accepted', driverId: 'driver-1' }), 'driver-1'),
    true
  );
});

test('Impide iniciar un viaje asignado a otro conductor', () => {
  assert.equal(
    canStartTrip(validTrip({ status: 'accepted', driverId: 'driver-2' }), 'driver-1'),
    false
  );
});

test('Permite finalizar un viaje en curso a su conductor', () => {
  assert.equal(
    canCompleteTrip(validTrip({ status: 'in_progress', driverId: 'driver-1' }), 'driver-1'),
    true
  );
});

test('Impide finalizar un viaje que no está en curso', () => {
  assert.equal(
    canCompleteTrip(validTrip({ status: 'accepted', driverId: 'driver-1' }), 'driver-1'),
    false
  );
});

test('Permite cancelar un viaje aceptado por su conductor', () => {
  assert.equal(
    canCancelTrip(validTrip({ status: 'accepted', driverId: 'driver-1' }), 'driver-1'),
    true
  );
});

test('Impide cancelar un viaje en curso', () => {
  assert.equal(
    canCancelTrip(validTrip({ status: 'in_progress', driverId: 'driver-1' }), 'driver-1'),
    false
  );
});

test('Impide cancelar un viaje perteneciente a otro conductor', () => {
  assert.equal(
    canCancelTrip(validTrip({ status: 'accepted', driverId: 'driver-2' }), 'driver-1'),
    false
  );
});
