// AI-assisted: see docs/AI_LOG.md #38
// MODO DEMOSTRACIÓN de pagos: simula la pasarela SOLO en los emuladores
// locales, para presentar el flujo sin credenciales ni plan Blaze.
//
// No es Mercado Pago ni lo imita: la página de checkout se identifica como
// "MODO DEMOSTRACIÓN", los IDs empiezan por DEMO- y el viaje y el asiento
// quedan marcados con paymentMode "demo". El resto del flujo es el real:
// processPayment consulta el pago (aquí, en el emulador), lo valida contra el
// viaje y aplica la misma transacción idempotente.
//
// Protecciones: el modo solo se activa con PAYMENTS_DEMO_MODE=true, dentro
// del emulador de Functions (FUNCTIONS_EMULATOR=true) y con el emulador de
// Firestore activo (FIRESTORE_EMULATOR_HOST). Si se pide fuera de ese
// entorno, index.js no carga (y un despliegue falla).
'use strict';

const crypto = require('node:crypto');

const DEMO_PREFIX = 'DEMO-';
const DEMO_PAYMENT_MODE = 'demo';
const DEMO_PAYMENT_ID_PATTERN = /^DEMO-[0-9A-F]{8,32}$/;
const DEMO_RESULTS = Object.freeze(['approved', 'pending', 'rejected']);

function isDemoRequested(env = process.env) {
  return env.PAYMENTS_DEMO_MODE === 'true';
}

function isEmulatorEnvironment(env = process.env) {
  return env.FUNCTIONS_EMULATOR === 'true' && Boolean(env.FIRESTORE_EMULATOR_HOST);
}

/**
 * Lanza un error si se pide el modo demostración fuera de los emuladores.
 * @returns {boolean} true si el modo demostración está activo.
 */
function resolveDemoMode(env = process.env) {
  if (!isDemoRequested(env)) return false;

  if (!isEmulatorEnvironment(env)) {
    throw new Error(
      'PAYMENTS_DEMO_MODE solo puede usarse en los emuladores locales ' +
        '(FUNCTIONS_EMULATOR y FIRESTORE_EMULATOR_HOST). No se cargan las funciones.'
    );
  }

  return true;
}

function newDemoId() {
  return `${DEMO_PREFIX}${crypto.randomBytes(8).toString('hex').toUpperCase()}`;
}

/**
 * Cliente con la misma interfaz que createMercadoPagoClient, que guarda las
 * preferencias y pagos de demostración en el emulador de Firestore
 * (colecciones demoPreferences y demoPayments). No llama a ninguna API.
 */
function createDemoPaymentClient({ db, FieldValue, checkoutBaseUrl }) {
  if (!checkoutBaseUrl) {
    throw new Error('Falta DEMO_PUBLIC_BASE_URL para el checkout de demostración.');
  }

  return {
    async createPreference(body) {
      const id = newDemoId();
      const item = body.items[0];

      await db.collection('demoPreferences').doc(id).set({
        tripId: body.external_reference,
        amount: item.unit_price,
        currency: item.currency_id,
        metadata: body.metadata || {},
        paymentMode: DEMO_PAYMENT_MODE,
        createdAt: FieldValue.serverTimestamp(),
      });

      const url = `${checkoutBaseUrl.replace(/\/+$/, '')}/demoCheckout?pref=${encodeURIComponent(id)}`;
      return { id, init_point: url, sandbox_init_point: url };
    },

    async getPayment(paymentId) {
      const snapshot = await db.collection('demoPayments').doc(String(paymentId)).get();
      return snapshot.exists ? snapshot.data() : null;
    },
  };
}

/**
 * Registra un pago de demostración para una preferencia. El monto y el viaje
 * salen de la preferencia que creó el servidor, no del navegador.
 */
async function createDemoPayment({ db, FieldValue, preferenceId, result }) {
  if (!DEMO_RESULTS.includes(result)) {
    throw new Error('Resultado de demostración no válido.');
  }

  const preference = await db.collection('demoPreferences').doc(String(preferenceId)).get();
  if (!preference.exists) return null;

  const pref = preference.data();
  const id = newDemoId();
  const payment = {
    id,
    status: result,
    external_reference: pref.tripId,
    currency_id: pref.currency,
    transaction_amount: pref.amount,
    metadata: pref.metadata || {},
    paymentMode: DEMO_PAYMENT_MODE,
    preferenceId: String(preferenceId),
  };

  await db.collection('demoPayments').doc(id).set({ ...payment, createdAt: FieldValue.serverTimestamp() });
  return payment;
}

module.exports = {
  DEMO_PAYMENT_ID_PATTERN,
  DEMO_PAYMENT_MODE,
  DEMO_RESULTS,
  createDemoPayment,
  createDemoPaymentClient,
  isDemoRequested,
  isEmulatorEnvironment,
  resolveDemoMode,
};
