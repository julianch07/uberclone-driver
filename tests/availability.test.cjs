// AI-assisted: see docs/AI_LOG.md #14
const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { loadModule } = require('./helpers/loadModule.cjs');

const servicePath = path.join(
  __dirname, '..', 'src', 'services', 'availabilityService.js'
);

function createScenario({
  approved = true,
  complete = true,
  completedAt = null,
  exists = true,
  online = false,
} = {}) {
  const state = {
    approvalStatus: approved ? 'approved' : 'pending',
    registrationCompletedAt: completedAt,
    isOnline: online,
  };

  const writes = [];
  const timestamp = { __serverTimestamp: true };
  const ref = { path: 'drivers/test-driver' };

  const firestore = {
    doc: (_db, collection, uid) => {
      assert.equal(collection, 'drivers');
      assert.equal(uid, 'test-driver');
      return ref;
    },
    serverTimestamp: () => timestamp,
    runTransaction: async (_db, callback) => {
      const updates = [];

      const transaction = {
        get: async () => ({
          exists: () => exists,
          data: () => ({ ...state }),
        }),
        update: (target, changes) => {
          assert.equal(target, ref);
          updates.push(changes);
        },
      };

      const result = await callback(transaction);

      for (const changes of updates) {
        writes.push(changes);
        Object.assign(state, changes);
      }

      return result;
    },
  };

  const service = loadModule(servicePath, {
    'firebase/firestore': firestore,
    '../config/firebase': { db: {} },
    '../config/driverStatus': {
      canDriverGoOnline: (registration) =>
        registration.approvalStatus === 'approved',
    },
    '../utils/driverRegistration': {
      hasCompleteSavedRegistration: () => complete,
    },
  });

  return { service, state, writes, timestamp };
}

test('Regulariza un conductor antiguo aprobado antes de conectarlo', async () => {
  const { service, state, writes, timestamp } = createScenario();

  await service.setDriverAvailability('test-driver', true);

  assert.equal(writes.length, 2);
  assert.deepEqual(writes[0], {
    registrationCompletedAt: timestamp,
  });
  assert.deepEqual(writes[1], {
    isOnline: true,
    availabilityUpdatedAt: timestamp,
  });
  assert.equal(state.approvalStatus, 'approved');
  assert.equal(state.isOnline, true);
});

test('No regulariza nuevamente un registro actualizado', async () => {
  const originalDate = { seconds: 123456 };
  const { service, state, writes } = createScenario({
    completedAt: originalDate,
  });

  await service.setDriverAvailability('test-driver', true);

  assert.equal(writes.length, 1);
  assert.equal(state.registrationCompletedAt, originalDate);
  assert.equal(state.isOnline, true);
});

test('Impide conectar a un conductor pendiente', async () => {
  const { service, writes } = createScenario({ approved: false });

  await assert.rejects(
    service.setDriverAvailability('test-driver', true),
    /registro completo y aprobado/
  );

  assert.equal(writes.length, 0);
});

test('Impide conectar a un conductor incompleto', async () => {
  const { service, writes } = createScenario({ complete: false });

  await assert.rejects(
    service.setDriverAvailability('test-driver', true),
    /registro completo y aprobado/
  );

  assert.equal(writes.length, 0);
});

test('Desconectar no regulariza registros antiguos', async () => {
  const { service, state, writes } = createScenario({
    approved: false,
    online: true,
  });

  await service.setDriverAvailability('test-driver', false);

  assert.equal(writes.length, 1);
  assert.equal(writes[0].isOnline, false);
  assert.equal(state.registrationCompletedAt, null);
});

test('Informa cuando no existe el registro', async () => {
  const { service, writes } = createScenario({ exists: false });

  await assert.rejects(
    service.setDriverAvailability('test-driver', true),
    /No se encontró el registro/
  );

  assert.equal(writes.length, 0);
});
