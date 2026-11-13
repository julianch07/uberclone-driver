// AI-assisted: see docs/AI_LOG.md #18
const assert = require('node:assert/strict');
const test = require('node:test');
const { loadModule } = require('./helpers/loadModule.cjs');
const { createActiveTripStorage } = loadModule('src/utils/activeTripStorage.js');

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}

test('Una escritura tardía no sobrescribe la selección nueva', async () => {
  const gate = deferred();
  const data = new Map();
  const storage = {
    async getItem(key) { return data.get(key) ?? null; },
    async setItem(key, value) {
      if (value === 'antiguo') await gate.promise;
      data.set(key, value);
    },
    async removeItem(key) { data.delete(key); },
  };
  const coordinator = createActiveTripStorage(storage);
  const first = coordinator.save('key', 'antiguo');
  const second = coordinator.save('key', 'nuevo');
  gate.resolve();
  await Promise.all([first, second]);
  assert.equal(data.get('key'), 'nuevo');
});

test('Una eliminación antigua no borra una selección nueva', async () => {
  const gate = deferred();
  const data = new Map([['key', 'viejo']]);
  const storage = {
    async getItem(key) { return data.get(key) ?? null; },
    async setItem(key, value) { data.set(key, value); },
    async removeItem(key) { await gate.promise; data.delete(key); },
  };
  const coordinator = createActiveTripStorage(storage);
  const remove = coordinator.remove('key');
  const save = coordinator.save('key', 'nuevo');
  gate.resolve();
  await Promise.all([remove, save]);
  assert.equal(data.get('key'), 'nuevo');
});

test('Las operaciones invalidadas no escriben ni eliminan datos', async () => {
  const data = new Map([['key', 'original']]);
  const storage = {
    async getItem(key) { return data.get(key) ?? null; },
    async setItem(key, value) { data.set(key, value); },
    async removeItem(key) { data.delete(key); },
  };
  const coordinator = createActiveTripStorage(storage);
  await coordinator.save('key', 'obsoleto', () => false);
  await coordinator.remove('key', () => false);
  assert.equal(await coordinator.read('key'), 'original');
});

test('Un fallo de almacenamiento no bloquea las operaciones siguientes', async () => {
  let fail = true;
  const data = new Map();
  const coordinator = createActiveTripStorage({
    async getItem(key) { return data.get(key) ?? null; },
    async setItem(key, value) {
      if (fail) { fail = false; throw new Error('storage unavailable'); }
      data.set(key, value);
    },
    async removeItem(key) { data.delete(key); },
  });
  await assert.rejects(coordinator.save('key', 'fallido'));
  await coordinator.save('key', 'recuperado');
  assert.equal(await coordinator.read('key'), 'recuperado');
});
