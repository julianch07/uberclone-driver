// AI-assisted: see docs/AI_LOG.md #37
// Backend de pagos de UberClone Driver: Mercado Pago Checkout Pro en modo de
// prueba (guía, sección 4).
//
// Funciones:
//   - createPaymentPreference (callable): crea la preferencia de pago de un
//     viaje finalizado y devuelve la URL del checkout.
//   - mercadoPagoWebhook (HTTP POST): recibe las notificaciones de pago,
//     verifica la firma y confirma el pago con la API.
//   - paymentReturn (HTTP GET): página de retorno del checkout; también
//     confirma el pago con la API.
//
// Secretos (Secret Manager; nunca en el código ni en el repositorio):
//   MP_ACCESS_TOKEN    access token de PRUEBA de la aplicación de Mercado Pago
//   MP_WEBHOOK_SECRET  clave secreta de la firma de webhooks
// Se cargan con: npx firebase-tools functions:secrets:set MP_ACCESS_TOKEN
// En el emulador se leen de functions/.secret.local (excluido de Git).
'use strict';

const { initializeApp } = require('firebase-admin/app');
const { FieldValue, Timestamp, getFirestore } = require('firebase-admin/firestore');
const { HttpsError, onCall, onRequest } = require('firebase-functions/https');
const { setGlobalOptions } = require('firebase-functions/options');
const { defineSecret, defineString } = require('firebase-functions/params');
const logger = require('firebase-functions/logger');

const { createMercadoPagoClient } = require('./src/mercadoPagoClient');
const {
  createCheckoutHandler,
  createDemoCheckoutHandler,
  createReturnHandler,
  createWebhookHandler,
} = require('./src/handlers');
const { PaymentError } = require('./src/paymentLogic');
// AI-assisted: see docs/AI_LOG.md #38
const {
  DEMO_PAYMENT_ID_PATTERN,
  DEMO_PAYMENT_MODE,
  createDemoPayment,
  createDemoPaymentClient,
  resolveDemoMode,
} = require('./src/demoMode');

const REGION = 'us-central1';

// AI-assisted: see docs/AI_LOG.md #38
// MODO DEMOSTRACIÓN (PAYMENTS_DEMO_MODE=true): solo en los emuladores
// locales. Fuera de ellos resolveDemoMode lanza un error y este archivo no
// carga, de modo que no se puede desplegar con el modo activo.
const DEMO_MODE = resolveDemoMode();

setGlobalOptions({ region: REGION, maxInstances: 3 });
initializeApp();

const MP_ACCESS_TOKEN = defineSecret('MP_ACCESS_TOKEN');
const MP_WEBHOOK_SECRET = defineSecret('MP_WEBHOOK_SECRET');

// Parámetros no secretos (functions/.env, ver functions/.env.example).
const MP_CHECKOUT_URL_FIELD = defineString('MP_CHECKOUT_URL_FIELD', {
  default: 'init_point',
  description: 'Campo de la preferencia con la URL del checkout: init_point o sandbox_init_point.',
});
const MP_WEBHOOK_SIGNATURE_MODE = defineString('MP_WEBHOOK_SIGNATURE_MODE', {
  default: 'enforce',
  description: 'enforce: rechaza firmas no válidas (401). report: solo las registra.',
});
const PUBLIC_FUNCTIONS_BASE_URL = defineString('PUBLIC_FUNCTIONS_BASE_URL', {
  default: '',
  description: 'URL pública base de las funciones. Vacío: https://<región>-<proyecto>.cloudfunctions.net',
});

function functionsBaseUrl() {
  const configured = PUBLIC_FUNCTIONS_BASE_URL.value();
  if (configured) return configured.replace(/\/+$/, '');
  return `https://${REGION}-${process.env.GCLOUD_PROJECT}.cloudfunctions.net`;
}

function getClient() {
  // AI-assisted: see docs/AI_LOG.md #38
  if (DEMO_MODE) {
    return createDemoPaymentClient({
      db: getFirestore(),
      FieldValue,
      checkoutBaseUrl: process.env.DEMO_PUBLIC_BASE_URL,
    });
  }
  return createMercadoPagoClient({ accessToken: MP_ACCESS_TOKEN.value() });
}

exports.createPaymentPreference = onCall(
  // En MODO DEMOSTRACIÓN no se usa ningún secreto.
  { secrets: DEMO_MODE ? [] : [MP_ACCESS_TOKEN] },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Debes iniciar sesión.');
    }

    const handler = createCheckoutHandler({
      db: getFirestore(),
      getClient,
      FieldValue,
      Timestamp,
      notificationUrl: `${functionsBaseUrl()}/mercadoPagoWebhook`,
      returnUrl: `${functionsBaseUrl()}/paymentReturn`,
      checkoutUrlField: MP_CHECKOUT_URL_FIELD.value(),
      // AI-assisted: see docs/AI_LOG.md #38
      extraTripFields: DEMO_MODE ? { paymentMode: DEMO_PAYMENT_MODE } : {},
    });

    try {
      return await handler({
        uid: request.auth.uid,
        tripId: request.data?.tripId,
        amount: request.data?.amount,
      });
    } catch (error) {
      if (error instanceof PaymentError) {
        throw new HttpsError(error.code, error.message);
      }
      logger.error('No se pudo crear la preferencia de pago', { message: error.message });
      throw new HttpsError('unavailable', 'No se pudo iniciar el cobro con Mercado Pago. Inténtalo de nuevo.');
    }
  }
);

if (DEMO_MODE) {
  // AI-assisted: see docs/AI_LOG.md #38
  // Solo en MODO DEMOSTRACIÓN: checkout simulado. No se exportan el webhook
  // ni el retorno reales, que necesitan las credenciales de Mercado Pago.
  exports.demoCheckout = onRequest((req, res) =>
    createDemoCheckoutHandler({
      db: getFirestore(),
      FieldValue,
      getClient,
      createDemoPayment,
      demoPaymentIdPattern: DEMO_PAYMENT_ID_PATTERN,
      logger,
    })(req, res)
  );
} else {
  exports.mercadoPagoWebhook = onRequest(
    { secrets: [MP_ACCESS_TOKEN, MP_WEBHOOK_SECRET] },
    (req, res) =>
      createWebhookHandler({
        db: getFirestore(),
        getClient,
        getSecret: () => MP_WEBHOOK_SECRET.value(),
        FieldValue,
        signatureMode: MP_WEBHOOK_SIGNATURE_MODE.value(),
        logger,
      })(req, res)
  );

  exports.paymentReturn = onRequest(
    { secrets: [MP_ACCESS_TOKEN] },
    (req, res) =>
      createReturnHandler({ db: getFirestore(), getClient, FieldValue, logger })(req, res)
  );
}
