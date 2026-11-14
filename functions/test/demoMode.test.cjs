// AI-assisted: see docs/AI_LOG.md #38
// El MODO DEMOSTRACIÓN solo puede activarse dentro de los emuladores.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const demo = require('../src/demoMode');

test('resolveDemoMode: solo con PAYMENTS_DEMO_MODE, emulador de Functions y de Firestore', () => {
  assert.equal(demo.resolveDemoMode({}), false);
  assert.equal(demo.resolveDemoMode({ PAYMENTS_DEMO_MODE: 'false', FUNCTIONS_EMULATOR: 'true' }), false);
  assert.equal(
    demo.resolveDemoMode({ PAYMENTS_DEMO_MODE: 'true', FUNCTIONS_EMULATOR: 'true', FIRESTORE_EMULATOR_HOST: '127.0.0.1:8181' }),
    true
  );

  for (const env of [
    { PAYMENTS_DEMO_MODE: 'true' },
    { PAYMENTS_DEMO_MODE: 'true', FUNCTIONS_EMULATOR: 'true' },
    { PAYMENTS_DEMO_MODE: 'true', FIRESTORE_EMULATOR_HOST: '127.0.0.1:8181' },
    { PAYMENTS_DEMO_MODE: 'true', FUNCTIONS_EMULATOR: 'false', FIRESTORE_EMULATOR_HOST: '127.0.0.1:8181' },
  ]) {
    assert.throws(() => demo.resolveDemoMode(env), /solo puede usarse en los emuladores/, JSON.stringify(env));
  }
});

function loadIndex(env) {
  return spawnSync(process.execPath, ['-e', 'console.log(Object.keys(require("./index.js")).join(","))'], {
    cwd: path.resolve(__dirname, '..'),
    env: { PATH: process.env.PATH, GCLOUD_PROJECT: 'demo-x', ...env },
    encoding: 'utf8',
  });
}

test('index.js: el modo demostración fuera del emulador impide cargar (y desplegar)', () => {
  const normal = loadIndex({});
  assert.equal(normal.status, 0, normal.stderr);
  assert.equal(normal.stdout.trim(), 'createPaymentPreference,mercadoPagoWebhook,paymentReturn');

  const outside = loadIndex({ PAYMENTS_DEMO_MODE: 'true' });
  assert.notEqual(outside.status, 0);
  assert.match(outside.stderr, /PAYMENTS_DEMO_MODE solo puede usarse en los emuladores/);

  const emulator = loadIndex({ PAYMENTS_DEMO_MODE: 'true', FUNCTIONS_EMULATOR: 'true', FIRESTORE_EMULATOR_HOST: '127.0.0.1:8181' });
  assert.equal(emulator.status, 0, emulator.stderr);
  // En demostración no existen el webhook ni el retorno reales.
  assert.equal(emulator.stdout.trim(), 'createPaymentPreference,demoCheckout');
});

test('IDs de demostración: el patrón real no los acepta', () => {
  assert.equal(demo.DEMO_PAYMENT_ID_PATTERN.test('DEMO-0123456789ABCDEF'), true);
  assert.equal(demo.DEMO_PAYMENT_ID_PATTERN.test('123456'), false);
  assert.equal(/^[0-9]{1,30}$/.test('DEMO-0123456789ABCDEF'), false);
});
