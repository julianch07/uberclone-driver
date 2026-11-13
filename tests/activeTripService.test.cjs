// AI-assisted: see docs/AI_LOG.md #18
const assert = require('node:assert/strict');
const test = require('node:test');
const { loadModule } = require('./helpers/loadModule.cjs');

function serviceWithDocs(docs) {
  const calls = [];
  const firestore = {
    collection: (_db, name) => { calls.push(['collection', name]); return name; },
    where: (field, operator, value) => {
      calls.push(['where', field, operator, value]); return [field, operator, value];
    },
    limit: (amount) => { calls.push(['limit', amount]); return amount; },
    query: (...args) => args,
    getDocs: async () => ({ docs: docs.map(({ id, ...data }) => ({
      id, data: () => data,
    })) }),
  };
  const { findActiveDriverTrip } = loadModule('src/services/tripService.js', {
    'firebase/firestore': firestore,
    '../config/firebase': { db: {} },
    './tripAcceptance': { acceptTripWithDatabase: () => {} },
    './tripLifecycle': {
      startTripWithDatabase: () => {},
      completeTripWithDatabase: () => {},
      cancelTripWithDatabase: () => {},
    },
  });
  return { findActiveDriverTrip, calls };
}

test('Consulta viajes activos solo del conductor y con límite 2', async () => {
  const { findActiveDriverTrip, calls } = serviceWithDocs([
    { id: 'trip-1', driverId: 'driver-1', status: 'accepted' },
  ]);
  assert.deepEqual(await findActiveDriverTrip('driver-1', {}), {
    id: 'trip-1', driverId: 'driver-1', status: 'accepted',
  });
  assert.deepEqual(calls.filter(x => x[0] === 'where'), [
    ['where', 'driverId', '==', 'driver-1'],
    ['where', 'status', 'in', ['accepted', 'in_progress']],
  ]);
  assert.ok(calls.some(x => x[0] === 'limit' && x[1] === 2));
});

test('No acepta dos viajes activos simultáneos en la recuperación', async () => {
  const { findActiveDriverTrip } = serviceWithDocs([
    { id: 'one', driverId: 'driver-1', status: 'accepted' },
    { id: 'two', driverId: 'driver-1', status: 'in_progress' },
  ]);
  await assert.rejects(findActiveDriverTrip('driver-1', {}), /varios viajes activos/);
});

test('Sin viaje activo devuelve null y rechaza un UID vacío', async () => {
  const { findActiveDriverTrip } = serviceWithDocs([]);
  assert.equal(await findActiveDriverTrip('driver-1', {}), null);
  await assert.rejects(findActiveDriverTrip('  ', {}), /identificar al conductor/);
});
