// AI-assisted: see docs/AI_LOG.md #37
// Manejadores del cobro con Mercado Pago. Reciben Firestore (Admin SDK) y el
// cliente de Mercado Pago como dependencias para poder probarlos con el
// emulador y una API simulada.
//
// Flujo:
//   1. createCheckout (callable): el conductor asignado pide cobrar un viaje
//      completed con paymentMethod "mercadopago". El servidor calcula el
//      monto (fare + tip) y crea la preferencia (external_reference = tripId).
//   2. processPayment: ante un webhook o el retorno del checkout, consulta el
//      pago en la API (fuente de verdad), lo valida contra el viaje y aplica
//      el resultado en una transacción idempotente:
//        approved  → trips: status "paid", paymentStatus, paymentId, paidAt
//                    drivers/{uid}/ledgerEntries/mp_{tripId}: ganancia
//        pending   → trips: paymentStatus "pending", paymentId
//        rejected  → trips: paymentStatus "rejected", paymentId
//      paymentEvents/{paymentId}_{estado} guarda la auditoría (solo backend).
'use strict';

const {
  PaymentError,
  PREFERENCE_TTL_MS,
  assertCheckoutAllowed,
  buildGatewayEarningEntry,
  buildPreferenceBody,
  gatewayLedgerEntryId,
  getPaymentMismatch,
  mapPaymentStatus,
  planPaymentUpdate,
} = require('./paymentLogic');
const { verifyWebhookSignature } = require('./signature');

const TRIP_ID_PATTERN = /^[A-Za-z0-9_-]{1,128}$/;
const PAYMENT_ID_PATTERN = /^[0-9]{1,30}$/;
// Una preferencia guardada se reutiliza si le queda al menos este tiempo.
const PREFERENCE_REUSE_MARGIN_MS = 5 * 60 * 1000;

function toMillis(value) {
  if (!value) return null;
  if (typeof value.toMillis === 'function') return value.toMillis();
  if (value instanceof Date) return value.getTime();
  return null;
}

/**
 * @param {{db, getClient: () => object, FieldValue, Timestamp,
 *   notificationUrl: string, returnUrl?: string,
 *   checkoutUrlField?: 'init_point'|'sandbox_init_point', now?: () => number}} deps
 */
function createCheckoutHandler(deps) {
  const { db, getClient, FieldValue, Timestamp, notificationUrl, returnUrl } = deps;
  // AI-assisted: see docs/AI_LOG.md #38
  // Campos adicionales del viaje (en MODO DEMOSTRACIÓN: paymentMode "demo").
  const extraTripFields = deps.extraTripFields || {};
  const checkoutUrlField = deps.checkoutUrlField || 'init_point';
  const now = deps.now || (() => Date.now());

  return async function createCheckout({ uid, tripId, amount }) {
    if (typeof uid !== 'string' || uid.length === 0) {
      throw new PaymentError('unauthenticated', 'Debes iniciar sesión.');
    }
    if (typeof tripId !== 'string' || !TRIP_ID_PATTERN.test(tripId)) {
      throw new PaymentError('invalid-argument', 'Identificador de viaje no válido.');
    }
    if (amount !== undefined && !Number.isInteger(amount)) {
      throw new PaymentError('invalid-argument', 'El monto debe ser un entero en pesos.');
    }

    const tripRef = db.collection('trips').doc(tripId);
    const snapshot = await tripRef.get();
    const trip = snapshot.exists ? snapshot.data() : null;
    const chargeAmount = assertCheckoutAllowed(trip, uid, amount);
    const current = now();

    // Reutiliza la preferencia vigente del mismo monto (evita duplicarlas si
    // el conductor pulsa varias veces).
    const expiresAt = toMillis(trip.paymentPreferenceExpiresAt);
    if (
      trip.paymentCheckoutUrl &&
      trip.paymentPreferenceAmount === chargeAmount &&
      expiresAt !== null &&
      expiresAt - current > PREFERENCE_REUSE_MARGIN_MS
    ) {
      return {
        checkoutUrl: trip.paymentCheckoutUrl,
        preferenceId: trip.paymentPreferenceId,
        amount: chargeAmount,
        reused: true,
      };
    }

    const preference = await getClient().createPreference(
      buildPreferenceBody({
        tripId,
        trip,
        driverId: uid,
        amount: chargeAmount,
        notificationUrl,
        returnUrl,
        now: current,
      })
    );

    const checkoutUrl =
      preference?.[checkoutUrlField] || preference?.init_point || preference?.sandbox_init_point;

    if (!preference?.id || !checkoutUrl) {
      throw new PaymentError('internal', 'Mercado Pago no devolvió la URL del checkout.');
    }

    // Se guarda la preferencia solo si el viaje sigue cobrable.
    await db.runTransaction(async (transaction) => {
      const fresh = await transaction.get(tripRef);
      assertCheckoutAllowed(fresh.exists ? fresh.data() : null, uid, chargeAmount);

      transaction.update(tripRef, {
        ...extraTripFields,
        paymentPreferenceId: String(preference.id),
        paymentCheckoutUrl: checkoutUrl,
        paymentPreferenceAmount: chargeAmount,
        paymentPreferenceExpiresAt: Timestamp.fromMillis(current + PREFERENCE_TTL_MS),
        paymentUpdatedAt: FieldValue.serverTimestamp(),
      });
    });

    return {
      checkoutUrl,
      preferenceId: String(preference.id),
      amount: chargeAmount,
      reused: false,
    };
  };
}

/**
 * Consulta el pago en la API y aplica el resultado al viaje.
 * @returns {Promise<{action: string, tripId?: string, reason?: string}>}
 */
async function processPayment({
  db,
  client,
  FieldValue,
  paymentId,
  source,
  signature,
  // AI-assisted: see docs/AI_LOG.md #38
  // Solo el MODO DEMOSTRACIÓN cambia estos valores (IDs DEMO- y la marca
  // paymentMode "demo" en el viaje, el asiento y la auditoría).
  paymentIdPattern = PAYMENT_ID_PATTERN,
  paymentMode = null,
}) {
  if (!paymentIdPattern.test(String(paymentId))) {
    return { action: 'invalid_payment_id' };
  }
  const modeFields = paymentMode ? { paymentMode } : {};

  const payment = await client.getPayment(String(paymentId));
  if (!payment) {
    return { action: 'payment_not_found' };
  }

  const tripId = payment.external_reference;
  const mpStatus = String(payment.status || 'unknown');
  const eventRef = db.collection('paymentEvents').doc(`${payment.id}_${mpStatus}`);

  if (typeof tripId !== 'string' || !TRIP_ID_PATTERN.test(tripId)) {
    await eventRef.set({
      paymentId: String(payment.id),
      mpStatus,
      action: 'no_trip_reference',
      source,
      signature: signature || null,
      receivedAt: FieldValue.serverTimestamp(),
    });
    return { action: 'no_trip_reference' };
  }

  const tripRef = db.collection('trips').doc(tripId);

  return db.runTransaction(async (transaction) => {
    const tripSnapshot = await transaction.get(tripRef);
    const trip = tripSnapshot.exists ? tripSnapshot.data() : null;
    const mismatch = getPaymentMismatch(payment, trip, tripId);
    const mappedStatus = mapPaymentStatus(mpStatus);
    const plan = mismatch ? { action: 'mismatch' } : planPaymentUpdate(trip, payment.id, mappedStatus);

    // Lecturas antes de escrituras (requisito de las transacciones).
    let ledgerRef = null;
    let ledgerExists = true;
    if (plan.createLedger && trip?.driverId) {
      ledgerRef = db
        .collection('drivers')
        .doc(trip.driverId)
        .collection('ledgerEntries')
        .doc(gatewayLedgerEntryId(tripId));
      ledgerExists = (await transaction.get(ledgerRef)).exists;
    }

    if (plan.tripUpdate) {
      transaction.update(tripRef, {
        ...plan.tripUpdate,
        ...modeFields,
        ...(plan.setPaidAt ? { paidAt: FieldValue.serverTimestamp() } : {}),
        paymentUpdatedAt: FieldValue.serverTimestamp(),
      });
    }

    if (ledgerRef && !ledgerExists) {
      transaction.create(ledgerRef, {
        ...buildGatewayEarningEntry(tripId, trip, payment.id),
        ...modeFields,
        createdAt: FieldValue.serverTimestamp(),
      });
    }

    transaction.set(
      eventRef,
      {
        ...modeFields,
        paymentId: String(payment.id),
        tripId,
        mpStatus,
        mappedStatus: mappedStatus || null,
        action: plan.action,
        reason: mismatch || null,
        source,
        signature: signature || null,
        receivedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    return { action: plan.action, tripId, ...(mismatch ? { reason: mismatch } : {}) };
  });
}

function readHeader(req, name) {
  return typeof req.get === 'function' ? req.get(name) : req.headers?.[name];
}

/**
 * Webhook de Mercado Pago (POST). Responde 200 cuando la notificación se
 * procesó o se ignora a propósito, 401 si la firma no es válida (modo
 * "enforce") y 500 ante errores transitorios para que Mercado Pago reintente.
 */
function createWebhookHandler({ db, getClient, getSecret, FieldValue, signatureMode = 'enforce', logger = console }) {
  return async function webhook(req, res) {
    if (req.method !== 'POST') {
      res.status(405).send('Method Not Allowed');
      return;
    }

    const query = req.query || {};
    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const type = body.type || query.type || query.topic;

    if (type !== 'payment') {
      res.status(200).json({ action: 'ignored_type' });
      return;
    }

    const queryDataId = query['data.id'];
    const dataId = String(queryDataId ?? body.data?.id ?? '');

    const signature = verifyWebhookSignature({
      signatureHeader: readHeader(req, 'x-signature'),
      requestId: readHeader(req, 'x-request-id'),
      dataId: queryDataId ?? dataId,
      secret: getSecret(),
    });

    if (signature === 'invalid' && signatureMode === 'enforce') {
      logger.warn('Notificación de Mercado Pago con firma no válida', { dataId });
      res.status(401).json({ action: 'invalid_signature' });
      return;
    }

    try {
      const result = await processPayment({
        db,
        client: getClient(),
        FieldValue,
        paymentId: dataId,
        source: 'webhook',
        signature,
      });
      logger.info('Notificación de Mercado Pago procesada', { dataId, ...result, signature });
      res.status(200).json(result);
    } catch (error) {
      logger.error('Error al procesar la notificación de Mercado Pago', { dataId, message: error.message });
      res.status(500).json({ action: 'error' });
    }
  };
}

const RETURN_MESSAGES = {
  approved: 'Pago aprobado. Ya puedes volver a UberClone Driver.',
  pending: 'Tu pago está pendiente de confirmación. Puedes volver a UberClone Driver.',
  rejected: 'El pago fue rechazado. Vuelve a UberClone Driver para intentarlo de nuevo.',
  default: 'Estamos confirmando tu pago. Puedes volver a UberClone Driver.',
};

function escapeHtml(text) {
  return String(text).replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`);
}

/**
 * Página de retorno del checkout (back_urls). No confía en los parámetros
 * de la URL: confirma el pago con la API, igual que el webhook.
 */
function createReturnHandler({ db, getClient, FieldValue, logger = console }) {
  return async function paymentReturn(req, res) {
    const query = req.query || {};
    const paymentId = query.payment_id || query.collection_id;
    let message = RETURN_MESSAGES.default;

    if (paymentId && PAYMENT_ID_PATTERN.test(String(paymentId))) {
      try {
        const result = await processPayment({
          db,
          client: getClient(),
          FieldValue,
          paymentId: String(paymentId),
          source: 'return',
          signature: null,
        });
        const key = ['approved', 'already_applied'].includes(result.action)
          ? 'approved'
          : result.action;
        message = RETURN_MESSAGES[key] || RETURN_MESSAGES.default;
      } catch (error) {
        logger.error('Error al confirmar el pago en el retorno', { message: error.message });
      }
    }

    res
      .status(200)
      .set('Content-Type', 'text/html; charset=utf-8')
      .send(
        '<!doctype html><html lang="es"><head><meta charset="utf-8">' +
          '<meta name="viewport" content="width=device-width, initial-scale=1">' +
          '<title>UberClone Driver</title></head>' +
          '<body style="font-family:system-ui,sans-serif;padding:32px;text-align:center">' +
          `<h1 style="font-size:22px">UberClone Driver</h1><p>${escapeHtml(message)}</p>` +
          '<p style="color:#697386">Modo de prueba: no se procesó dinero real.</p></body></html>'
      );
  };
}

// AI-assisted: see docs/AI_LOG.md #38
// Página del checkout de MODO DEMOSTRACIÓN (solo emuladores). GET muestra el
// importe y tres botones; POST registra el pago de demostración y lo aplica
// con processPayment, igual que una notificación real.
const DEMO_RESULT_LABELS = {
  approved: 'Pago de demostración aprobado.',
  pending: 'Pago de demostración pendiente.',
  rejected: 'Pago de demostración rechazado.',
};

function formatCop(value) {
  return `$${Math.round(Number(value) || 0).toLocaleString('es-CO')} COP`;
}

function demoPage(body) {
  return (
    '<!doctype html><html lang="es"><head><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width, initial-scale=1">' +
    '<title>MODO DEMOSTRACIÓN - Checkout simulado</title></head>' +
    '<body style="font-family:system-ui,sans-serif;margin:0;background:#FFF8E1;color:#3E2723">' +
    '<div style="background:#B26A00;color:#fff;padding:16px;text-align:center;font-weight:800;font-size:20px">' +
    'MODO DEMOSTRACIÓN</div>' +
    '<div style="padding:24px;max-width:480px;margin:auto">' +
    '<p style="font-weight:700">Checkout simulado de UberClone. No es Mercado Pago, no se usa ' +
    'ninguna tarjeta y no se procesa dinero.</p>' +
    body +
    '</div></body></html>'
  );
}

function createDemoCheckoutHandler({ db, FieldValue, getClient, createDemoPayment, demoPaymentIdPattern, logger = console }) {
  return async function demoCheckout(req, res) {
    const query = req.query || {};
    const form = req.body && typeof req.body === 'object' ? req.body : {};
    const preferenceId = String(form.pref || query.pref || '');
    const send = (status, html) =>
      res.status(status).set('Content-Type', 'text/html; charset=utf-8').send(demoPage(html));

    if (!/^DEMO-[0-9A-F]{8,32}$/.test(preferenceId)) {
      send(400, '<p>Enlace de demostración no válido.</p>');
      return;
    }

    const preferenceSnapshot = await db.collection('demoPreferences').doc(preferenceId).get();
    if (!preferenceSnapshot.exists) {
      send(404, '<p>La preferencia de demostración no existe.</p>');
      return;
    }
    const preference = preferenceSnapshot.data();

    if (req.method === 'GET') {
      const button = (result, label, color) =>
        `<button name="result" value="${result}" style="display:block;width:100%;margin:10px 0;` +
        `padding:14px;border:0;border-radius:10px;font-size:16px;font-weight:700;color:#fff;background:${color}">` +
        `${label}</button>`;
      send(
        200,
        `<p>Viaje: <code>${escapeHtml(preference.tripId)}</code></p>` +
          `<p style="font-size:24px;font-weight:800">${escapeHtml(formatCop(preference.amount))}</p>` +
          `<form method="post"><input type="hidden" name="pref" value="${escapeHtml(preferenceId)}">` +
          button('approved', 'Aprobar pago de demostración', '#157347') +
          button('pending', 'Dejar pendiente (demostración)', '#9A6700') +
          button('rejected', 'Rechazar (demostración)', '#B42318') +
          '</form>'
      );
      return;
    }

    if (req.method !== 'POST') {
      send(405, '<p>Método no permitido.</p>');
      return;
    }

    const result = String(form.result || query.result || '');
    try {
      const payment = await createDemoPayment({ db, FieldValue, preferenceId, result });
      if (!payment) {
        send(400, '<p>Resultado de demostración no válido.</p>');
        return;
      }

      const outcome = await processPayment({
        db,
        client: getClient(),
        FieldValue,
        paymentId: payment.id,
        source: 'demo_checkout',
        signature: null,
        paymentIdPattern: demoPaymentIdPattern,
        paymentMode: 'demo',
      });

      const message =
        outcome.action === 'mismatch' || outcome.action === 'trip_not_completed'
          ? 'El pago de demostración no se aplicó: el viaje no coincide o ya no está pendiente de cobro.'
          : DEMO_RESULT_LABELS[result];
      send(
        200,
        `<p style="font-size:20px;font-weight:800">${escapeHtml(message)}</p>` +
          `<p>ID de demostración: <code>${escapeHtml(payment.id)}</code></p>` +
          '<p>Vuelve a UberClone Driver: el viaje se actualiza en tiempo real.</p>'
      );
    } catch (error) {
      logger.error('Error en el checkout de demostración', { message: error.message });
      send(400, `<p>${escapeHtml(error.message)}</p>`);
    }
  };
}

module.exports = {
  createCheckoutHandler,
  createDemoCheckoutHandler,
  createReturnHandler,
  createWebhookHandler,
  processPayment,
};
