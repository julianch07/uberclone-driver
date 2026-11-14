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
  const { findActiveDriverTrip, getDriverTripHistory } = loadModule('src/services/tripService.js', {
    'firebase/firestore': firestore,
    '../config/firebase': { db: {} },
    './tripAcceptance': { acceptTripWithDatabase: () => {} },
    './tripLifecycle': {
      startTripWithDatabase: () => {},
      completeTripWithDatabase: () => {},
      cancelTripWithDatabase: () => {},
    },
  });
  return { findActiveDriverTrip, getDriverTripHistory, calls };
}

// AI-assisted: see docs/AI_LOG.md #23
test('El historial consulta solo viajes finalizados propios con límite 50', async () => {
  const { getDriverTripHistory, calls } = serviceWithDocs([
    { id: 'old', status: 'completed', completedAt: { seconds: 100 } },
    { id: 'cancel', status: 'cancelled', cancelledAt: { seconds: 300 } },
    { id: 'new', status: 'completed', completedAt: { seconds: 200 } },
  ]);

  const history = await getDriverTripHistory('driver-1');

  assert.deepEqual(history.map((trip) => trip.id), ['cancel', 'new', 'old']);
  assert.deepEqual(calls.filter(x => x[0] === 'where'), [
    ['where', 'driverId', '==', 'driver-1'],
    // AI-assisted: see docs/AI_LOG.md #29
    ['where', 'status', 'in', ['completed', 'paid', 'cancelled']],
  ]);
  assert.ok(calls.some(x => x[0] === 'limit' && x[1] === 50));
});

test('El historial nunca supera el límite permitido por las reglas', async () => {
  const { getDriverTripHistory, calls } = serviceWithDocs([]);

  await getDriverTripHistory('driver-1', 500);
  await getDriverTripHistory('driver-1', 0);

  assert.deepEqual(
    calls.filter(x => x[0] === 'limit').map(x => x[1]),
    [50, 1]
  );
  await assert.rejects(getDriverTripHistory('  '), /obligatorio/);
});

test('Consulta viajes activos solo del conductor y con límite 2', async () => {
  const { findActiveDriverTrip, calls } = serviceWithDocs([
    { id: 'trip-1', driverId: 'driver-1', status: 'accepted' },
  ]);
  assert.deepEqual(await findActiveDriverTrip('driver-1', {}), {
    id: 'trip-1', driverId: 'driver-1', status: 'accepted',
  });
  assert.deepEqual(calls.filter(x => x[0] === 'where'), [
    ['where', 'driverId', '==', 'driver-1'],
    // AI-assisted: see docs/AI_LOG.md #28
    ['where', 'status', 'in', ['accepted', 'driver_arriving', 'in_progress']],
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
