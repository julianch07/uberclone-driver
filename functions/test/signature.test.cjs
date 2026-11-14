// AI-assisted: see docs/AI_LOG.md #37
const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');

const signature = require('../src/signature');

const SECRET = 'clave-de-prueba';

// Firma calculada de forma independiente, como la generaría Mercado Pago.
function sign(manifest, secret = SECRET) {
  return crypto.createHmac('sha256', secret).update(manifest).digest('hex');
}

test('Plantilla del manifiesto (SDK oficial de Node)', () => {
  assert.equal(
    signature.buildManifest({ dataId: '123456', requestId: 'req-1', ts: '1742505638' }),
    'id:123456;request-id:req-1;ts:1742505638;'
  );
  // Las partes ausentes se omiten; ts siempre está.
  assert.equal(signature.buildManifest({ dataId: '', requestId: undefined, ts: '1' }), 'ts:1;');
});

test('Lectura de la cabecera x-signature', () => {
  assert.deepEqual(signature.parseSignatureHeader('ts=1742505638,v1=abc'), { ts: '1742505638', v1: 'abc' });
  assert.deepEqual(signature.parseSignatureHeader(' ts = 1 , v1 = x '), { ts: '1', v1: 'x' });
  assert.deepEqual(signature.parseSignatureHeader(undefined), {});
});

test('Firma válida, alterada, ausente o sin clave', () => {
  const ts = '1742505638';
  const v1 = sign(`id:123456;request-id:req-1;ts:${ts};`);
  const base = { signatureHeader: `ts=${ts},v1=${v1}`, requestId: 'req-1', dataId: '123456', secret: SECRET };

  assert.equal(signature.verifyWebhookSignature(base), 'valid');
  assert.equal(signature.verifyWebhookSignature({ ...base, dataId: '999' }), 'invalid');
  assert.equal(signature.verifyWebhookSignature({ ...base, requestId: 'req-2' }), 'invalid');
  assert.equal(signature.verifyWebhookSignature({ ...base, secret: 'otra' }), 'invalid');
  assert.equal(signature.verifyWebhookSignature({ ...base, signatureHeader: `ts=${ts}` }), 'invalid');
  assert.equal(signature.verifyWebhookSignature({ ...base, signatureHeader: `ts=1,v1=${v1}` }), 'invalid');
  assert.equal(signature.verifyWebhookSignature({ ...base, secret: '' }), 'invalid');
  assert.equal(signature.verifyWebhookSignature({ ...base, signatureHeader: undefined }), 'missing');
});
