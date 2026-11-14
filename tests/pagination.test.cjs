// AI-assisted: see docs/AI_LOG.md #29
// Lectura completa paginada: todos los documentos o un error, nunca una
// lista parcial.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { loadModule } = require('./helpers/loadModule.cjs');

const { fetchAllPages } = loadModule('src/services/firestorePagination.js');
const { buildBalanceFromTotals } = loadModule('src/utils/cashPaymentLogic.js');

// Origen de datos simulado: `total` documentos numerados, en páginas.
function source(total, { failOnPage = null } = {}) {
  const calls = [];
  const fetchPage = async (cursor) => {
    calls.push(cursor);
    if (failOnPage !== null && calls.length === failOnPage) {
      throw Object.assign(new Error('sin conexión'), { code: 'unavailable' });
    }
    const start = cursor === null ? 0 : cursor.n + 1;
    return Array.from({ length: Math.max(0, Math.min(50, total - start)) }, (_, i) => ({ n: start + i }));
  };
  return { fetchPage, calls };
}

test('Lee todas las páginas: 123 documentos en páginas de 50', async () => {
  const { fetchPage, calls } = source(123);
  const docs = await fetchAllPages(fetchPage, 50);

  assert.equal(docs.length, 123);
  assert.deepEqual(docs.map((item) => item.n), Array.from({ length: 123 }, (_, i) => i));
  assert.equal(calls.length, 3);
  assert.equal(calls[0], null);
  assert.equal(calls[1].n, 49);
  assert.equal(calls[2].n, 99);
});

test('Un total múltiplo exacto del tamaño de página pide una página final vacía', async () => {
  const { fetchPage, calls } = source(100);
  assert.equal((await fetchAllPages(fetchPage, 50)).length, 100);
  assert.equal(calls.length, 3);
});

test('Sin documentos devuelve una lista vacía', async () => {
  const { fetchPage } = source(0);
  assert.deepEqual(await fetchAllPages(fetchPage, 50), []);
});

test('Si falla una página, no se devuelve una lista parcial', async () => {
  const { fetchPage } = source(140, { failOnPage: 2 });
  await assert.rejects(fetchAllPages(fetchPage, 50), (error) => error.code === 'unavailable');
});

test('Aborta al superar el máximo de páginas en lugar de devolver datos parciales', async () => {
  const { fetchPage } = source(10_000);
  await assert.rejects(fetchAllPages(fetchPage, 50, 3), /máximo de páginas/);
  await assert.rejects(fetchAllPages(fetchPage, 0), /tamaño de página/);
});

test('Saldo a partir de los totales del servidor', () => {
  assert.deepEqual(
    buildBalanceFromTotals({
      tripCount: 130,
      cashCollected: 2_600_000,
      commissionTotal: 520_000,
      netEarnings: 2_080_000,
      pendingCommission: 400_000,
    }),
    {
      tripCount: 130,
      cashCollected: 2_600_000,
      commissionTotal: 520_000,
      pendingCommission: 400_000,
      settledCommission: 120_000,
      netEarnings: 2_080_000,
      balance: -400_000,
      currency: 'COP',
    }
  );

  // Sin asientos, sum() del servidor puede devolver 0 o null.
  const empty = buildBalanceFromTotals({ tripCount: 0, pendingCommission: null });
  assert.equal(empty.pendingCommission, 0);
  assert.equal(Object.is(empty.balance, 0), true);
});
