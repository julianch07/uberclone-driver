// AI-assisted: see docs/AI_LOG.md #20
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(
  path.join(__dirname, '../src/utils/tripRequestTimer.js'),
  'utf8'
);

const transformed = source
  .replace(/export const /g, 'const ')
  .replace(/export function /g, 'function ');

const timer = new Function(
  `${transformed}
  return {
    TRIP_REQUEST_TIMEOUT_MS,
    getTripRequestRemainingSeconds,
    isTripRequestExpired
  };`
)();

test('El contador comienza en 20 segundos', () => {
  assert.equal(timer.getTripRequestRemainingSeconds(1000, 1000), 20);
});

test('El contador disminuye con el tiempo', () => {
  assert.equal(timer.getTripRequestRemainingSeconds(1000, 6000), 15);
});

test('El contador llega a cero después de 20 segundos', () => {
  assert.equal(timer.getTripRequestRemainingSeconds(1000, 21000), 0);
});

test('Una solicitud expira al completar 20 segundos', () => {
  assert.equal(timer.isTripRequestExpired(1000, 20999), false);
  assert.equal(timer.isTripRequestExpired(1000, 21000), true);
});

test('El contador nunca devuelve números negativos', () => {
  assert.equal(timer.getTripRequestRemainingSeconds(1000, 50000), 0);
});
