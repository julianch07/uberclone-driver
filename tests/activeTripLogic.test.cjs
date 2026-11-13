// AI-assisted: see docs/AI_LOG.md #16
const assert = require('node:assert/strict');
const test = require('node:test');
const { loadModule } = require('./helpers/loadModule.cjs');

const { isActiveDriverTrip } = loadModule(
  'src/utils/activeTripLogic.js'
);

test('Reconoce un viaje aceptado por el conductor', () => {
  assert.equal(
    isActiveDriverTrip(
      { driverId: 'driver-1', status: 'accepted' },
      'driver-1'
    ),
    true
  );
});

test('Reconoce un viaje en curso del conductor', () => {
  assert.equal(
    isActiveDriverTrip(
      { driverId: 'driver-1', status: 'in_progress' },
      'driver-1'
    ),
    true
  );
});

test('Rechaza viajes asignados a otro conductor', () => {
  assert.equal(
    isActiveDriverTrip(
      { driverId: 'driver-2', status: 'accepted' },
      'driver-1'
    ),
    false
  );
});

test('Rechaza viajes completados o cancelados', () => {
  for (const status of ['completed', 'cancelled']) {
    assert.equal(
      isActiveDriverTrip({ driverId: 'driver-1', status }, 'driver-1'),
      false
    );
  }
});

test('Rechaza viajes inexistentes o sin conductor', () => {
  assert.equal(isActiveDriverTrip(null, 'driver-1'), false);
  assert.equal(
    isActiveDriverTrip(
      { driverId: 'driver-1', status: 'accepted' },
      null
    ),
    false
  );
});
