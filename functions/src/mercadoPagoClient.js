// AI-assisted: see docs/AI_LOG.md #37
// Cliente mínimo de la API REST de Mercado Pago (fetch de Node 22).
// El access token llega desde Secret Manager; nunca se registra en logs.
'use strict';

const crypto = require('node:crypto');

const DEFAULT_BASE_URL = 'https://api.mercadopago.com';
const REQUEST_TIMEOUT_MS = 10_000;

class MercadoPagoApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function createMercadoPagoClient({ accessToken, baseUrl = DEFAULT_BASE_URL, fetchFn = fetch }) {
  if (!accessToken) {
    throw new Error('Falta el access token de Mercado Pago (secreto MP_ACCESS_TOKEN).');
  }

  async function request(method, path, body, extraHeaders = {}) {
    const response = await fetchFn(`${baseUrl}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        ...extraHeaders,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      // Solo el código y el mensaje de la API; nunca las cabeceras.
      throw new MercadoPagoApiError(
        response.status,
        `Mercado Pago respondió ${response.status}: ${payload?.message || payload?.error || 'error'}`
      );
    }

    return payload;
  }

  return {
    createPreference(body) {
      return request('POST', '/checkout/preferences', body, {
        'X-Idempotency-Key': crypto.randomUUID(),
      });
    },

    // null si el pago no existe (por ejemplo, notificaciones de prueba).
    async getPayment(paymentId) {
      try {
        return await request('GET', `/v1/payments/${encodeURIComponent(paymentId)}`);
      } catch (error) {
        if (error instanceof MercadoPagoApiError && error.status === 404) return null;
        throw error;
      }
    },
  };
}

module.exports = { MercadoPagoApiError, createMercadoPagoClient };
