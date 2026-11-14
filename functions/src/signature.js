// AI-assisted: see docs/AI_LOG.md #37
// Verificación de la firma x-signature de las notificaciones de Mercado Pago.
//
// Plantilla tomada del validador del SDK oficial de Node de Mercado Pago
// (github.com/mercadopago/sdk-nodejs, src/utils/webhook/index.ts):
//   manifest = "id:<data.id>;request-id:<x-request-id>;ts:<ts>;"
// (id y request-id se omiten si faltan), HMAC-SHA256 con la clave secreta
// del webhook, en hexadecimal, comparado con v1 en tiempo constante.
// La documentación pública no publica la plantilla; por eso la firma es una
// defensa adicional: el estado del pago siempre se confirma con la API.
'use strict';

const crypto = require('node:crypto');

function parseSignatureHeader(header) {
  const result = {};

  if (typeof header !== 'string') return result;

  for (const part of header.split(',')) {
    const index = part.indexOf('=');
    if (index > 0) {
      result[part.slice(0, index).trim()] = part.slice(index + 1).trim();
    }
  }

  return result;
}

function buildManifest({ dataId, requestId, ts }) {
  const parts = [];
  if (dataId) parts.push(`id:${dataId}`);
  if (requestId) parts.push(`request-id:${requestId}`);
  parts.push(`ts:${ts}`);
  return `${parts.join(';')};`;
}

function computeSignature(secret, manifest) {
  return crypto.createHmac('sha256', secret).update(manifest).digest('hex');
}

function constantTimeEquals(a, b) {
  const left = Buffer.from(String(a));
  const right = Buffer.from(String(b));
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

/**
 * @returns {'valid'|'invalid'|'missing'} 'missing' si no hay cabecera.
 */
function verifyWebhookSignature({ signatureHeader, requestId, dataId, secret }) {
  if (!signatureHeader) return 'missing';
  if (!secret) return 'invalid';

  const { ts, v1 } = parseSignatureHeader(signatureHeader);
  if (!ts || !v1) return 'invalid';

  const manifest = buildManifest({
    dataId: typeof dataId === 'string' ? dataId.trim() : dataId,
    requestId: typeof requestId === 'string' ? requestId.trim() : requestId,
    ts,
  });

  return constantTimeEquals(computeSignature(secret, manifest), v1) ? 'valid' : 'invalid';
}

module.exports = {
  buildManifest,
  computeSignature,
  parseSignatureHeader,
  verifyWebhookSignature,
};
