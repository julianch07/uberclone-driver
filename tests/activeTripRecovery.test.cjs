// AI-assisted: see docs/AI_LOG.md #19
const assert = require('node:assert/strict');
const test = require('node:test');
const { loadModule } = require('./helpers/loadModule.cjs');

const { isCurrentTripRecovery } = loadModule(
  'src/utils/activeTripRecovery.js'
);

const validRecovery = {
  mounted: true,
  currentKey: 'uberclone:activeTrip:driver-1',
  expectedKey: 'uberclone:activeTrip:driver-1',
  currentVersion: 3,
  expectedVersion: 3,
  selectedTripId: null,
};

test('Permite completar una reconciliación vigente', () => {
  assert.equal(isCurrentTripRecovery(validRecovery), true);
});

test('Rechaza una recuperación de otro conductor', () => {
  assert.equal(
    isCurrentTripRecovery({
      ...validRecovery,
      currentKey: 'uberclone:activeTrip:driver-2',
    }),
    false
  );
});

test('Rechaza una recuperación invalidada por otra operación', () => {
  assert.equal(
    isCurrentTripRecovery({
      ...validRecovery,
      currentVersion: 4,
    }),
    false
  );
});

test('Rechaza una recuperación cuando ya existe otro viaje seleccionado', () => {
  assert.equal(
    isCurrentTripRecovery({
      ...validRecovery,
      selectedTripId: 'viaje-nuevo',
    }),
    false
  );
});

test('Rechaza una recuperación si el contexto está desmontado', () => {
  assert.equal(
    isCurrentTripRecovery({
      ...validRecovery,
      mounted: false,
    }),
    false
  );
});
