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
  canMarkDriverArriving,
  canMarkArrivedAtPickup,
  canStartTrip,
  canCompleteTrip,
  canCancelTrip,
  getActiveTripStage,
  ACTIVE_TRIP_STATUSES,
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

// AI-assisted: see docs/AI_LOG.md #23
test('Trata un viaje sin campo driverId como no asignado', () => {
  const trip = validTrip();
  delete trip.driverId;
  assert.equal(isValidTrip(trip), true);
  assert.equal(canAcceptTrip(trip, 'driver-1', true), true);
});

test('Impide aceptar un viaje previamente asignado', () => {
  const trip = validTrip({ status: 'accepted', driverId: 'driver-2' });
  assert.equal(canAcceptTrip(trip, 'driver-1', true), false);
});

// AI-assisted: see docs/AI_LOG.md #28
// "Pasajero a bordo" exige haber llegado al origen (driver_arriving + arrivedAt).
const ARRIVED = { seconds: 1, nanoseconds: 0 };

test('Permite iniciar el viaje cuando el conductor llegó al origen', () => {
  assert.equal(
    canStartTrip(
      validTrip({ status: 'driver_arriving', arrivedAt: ARRIVED, driverId: 'driver-1' }),
      'driver-1'
    ),
    true
  );
});

test('Impide iniciar el viaje sin haber llegado al origen', () => {
  assert.equal(
    canStartTrip(validTrip({ status: 'accepted', driverId: 'driver-1' }), 'driver-1'),
    false
  );
  assert.equal(
    canStartTrip(validTrip({ status: 'driver_arriving', driverId: 'driver-1' }), 'driver-1'),
    false
  );
});

test('Impide iniciar un viaje asignado a otro conductor', () => {
  assert.equal(
    canStartTrip(
      validTrip({ status: 'driver_arriving', arrivedAt: ARRIVED, driverId: 'driver-2' }),
      'driver-1'
    ),
    false
  );
});

test('"Voy en camino" solo desde accepted y por el conductor asignado', () => {
  assert.equal(
    canMarkDriverArriving(validTrip({ status: 'accepted', driverId: 'driver-1' }), 'driver-1'),
    true
  );
  assert.equal(
    canMarkDriverArriving(validTrip({ status: 'driver_arriving', driverId: 'driver-1' }), 'driver-1'),
    false
  );
  assert.equal(
    canMarkDriverArriving(validTrip({ status: 'accepted', driverId: 'driver-2' }), 'driver-1'),
    false
  );
});

test('"Llegué al origen" se registra una sola vez', () => {
  assert.equal(
    canMarkArrivedAtPickup(validTrip({ status: 'driver_arriving', driverId: 'driver-1' }), 'driver-1'),
    true
  );
  assert.equal(
    canMarkArrivedAtPickup(
      validTrip({ status: 'driver_arriving', arrivedAt: ARRIVED, driverId: 'driver-1' }),
      'driver-1'
    ),
    false
  );
  assert.equal(
    canMarkArrivedAtPickup(validTrip({ status: 'accepted', driverId: 'driver-1' }), 'driver-1'),
    false
  );
});

test('Etapas del viaje activo', () => {
  assert.deepEqual([...ACTIVE_TRIP_STATUSES], ['accepted', 'driver_arriving', 'in_progress']);
  assert.equal(getActiveTripStage(validTrip({ status: 'accepted' })), 'accepted');
  assert.equal(getActiveTripStage(validTrip({ status: 'driver_arriving' })), 'to_pickup');
  assert.equal(
    getActiveTripStage(validTrip({ status: 'driver_arriving', arrivedAt: ARRIVED })),
    'at_pickup'
  );
  assert.equal(getActiveTripStage(validTrip({ status: 'in_progress' })), 'to_destination');
  assert.equal(getActiveTripStage(validTrip({ status: 'completed' })), null);
  assert.equal(getActiveTripStage(null), null);
});

test('Permite cancelar antes de que el pasajero suba', () => {
  assert.equal(
    canCancelTrip(validTrip({ status: 'driver_arriving', arrivedAt: ARRIVED, driverId: 'driver-1' }), 'driver-1'),
    true
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
