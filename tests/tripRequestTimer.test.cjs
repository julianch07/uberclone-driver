// AI-assisted: see docs/AI_LOG.md #20
// AI-assisted: see docs/AI_LOG.md #28
// La guía exige 15 segundos (antes 20). El módulo ahora se carga con
// loadModule en lugar de reemplazar texto.
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadModule } = require('./helpers/loadModule.cjs');

const timer = loadModule('src/utils/tripRequestTimer.js');

const SECOND = 1000;

// Timestamp de Firestore simulado (offeredAt confirmado por el servidor).
function serverTimestamp(millis) {
  return { toMillis: () => millis };
}

function offer(offeredAtMs, status = 'offered') {
  return {
    status,
    offeredAt: offeredAtMs === null ? null : serverTimestamp(offeredAtMs),
  };
}

test('El plazo es exactamente de 15 segundos', () => {
  assert.equal(timer.TRIP_REQUEST_TIMEOUT_MS, 15_000);
});

test('El contador comienza en 15 segundos', () => {
  assert.equal(timer.getTripRequestRemainingSeconds(1000, 1000), 15);
});

test('El contador disminuye con el tiempo', () => {
  assert.equal(timer.getTripRequestRemainingSeconds(1000, 6000), 10);
  assert.equal(timer.getTripRequestRemainingSeconds(1000, 1001), 15);
  assert.equal(timer.getTripRequestRemainingSeconds(1000, 15_000), 1);
});

test('Una solicitud expira al completar 15 segundos', () => {
  assert.equal(timer.isTripRequestExpired(1000, 15_999), false);
  assert.equal(timer.isTripRequestExpired(1000, 16_000), true);
  assert.equal(timer.getTripRequestRemainingSeconds(1000, 16_000), 0);
});

test('El contador nunca devuelve números negativos ni supera 15', () => {
  assert.equal(timer.getTripRequestRemainingSeconds(1000, 50_000), 0);
  // Reloj del dispositivo atrasado respecto al servidor.
  assert.equal(timer.getTripRequestRemainingSeconds(10_000, 1000), 15);
  assert.equal(timer.getTripRequestRemainingSeconds(Number.NaN, 1000), 0);
});

test('Convierte timestamps de Firestore y rechaza valores provisionales', () => {
  assert.equal(timer.timestampToMillis(serverTimestamp(5000)), 5000);
  assert.equal(timer.timestampToMillis({ seconds: 5, nanoseconds: 250_000_000 }), 5250);
  assert.equal(timer.timestampToMillis(new Date(7000)), 7000);
  // serverTimestamp() pendiente se lee como null: no es una hora definitiva.
  assert.equal(timer.timestampToMillis(null), null);
  assert.equal(timer.timestampToMillis(undefined), null);
  // Un número del cliente no se acepta como marca del servidor.
  assert.equal(timer.timestampToMillis(5000), null);
});

test('Sin offeredAt confirmado, la oferta espera al servidor', () => {
  const timing = timer.getOfferTiming(offer(null), 10_000);

  assert.equal(timing.state, timer.OFFER_TIMING_STATE.WAITING_SERVER);
  assert.equal(timing.remainingSeconds, null);
  assert.equal(timing.deadlineMs, null);
  assert.equal(timer.shouldAutoRejectOffer(offer(null), 99_999_999), false);
});

test('La cuenta se calcula desde offeredAt: límites exactos', () => {
  const start = 100_000;

  assert.deepEqual(timer.getOfferTiming(offer(start), start), {
    state: 'active',
    remainingSeconds: 15,
    deadlineMs: start + 15_000,
  });
  assert.equal(timer.getOfferTiming(offer(start), start + 14_999).remainingSeconds, 1);
  assert.equal(timer.getOfferTiming(offer(start), start + 14_999).state, 'active');
  assert.equal(timer.getOfferTiming(offer(start), start + 15_000).state, 'expired');
});

test('No se reinicia al volver a calcular ni al reabrir la aplicación', () => {
  const start = 200_000;
  const saved = offer(start);

  // Varias evaluaciones (renders) en el mismo instante dan el mismo valor.
  const first = timer.getOfferTiming(saved, start + 6 * SECOND);
  const second = timer.getOfferTiming(saved, start + 6 * SECOND);
  assert.deepEqual(first, second);
  assert.equal(first.remainingSeconds, 9);

  // Reabrir la app con la misma oferta (mismo offeredAt) no reinicia.
  const reopened = timer.getOfferTiming(
    { ...saved, offeredAt: { seconds: start / 1000, nanoseconds: 0 } },
    start + 6 * SECOND
  );
  assert.equal(reopened.remainingSeconds, 9);
});

test('Al volver del segundo plano refleja el tiempo transcurrido real', () => {
  const start = 300_000;

  // Antes de pasar a segundo plano quedaban 12 s.
  assert.equal(timer.getOfferTiming(offer(start), start + 3 * SECOND).remainingSeconds, 12);

  // Vuelve 5 s después (sin ticks intermedios): quedan 7 s.
  assert.equal(timer.getOfferTiming(offer(start), start + 8 * SECOND).remainingSeconds, 7);

  // Vuelve después del vencimiento: expirada y lista para rechazo automático.
  const late = start + 20 * SECOND;
  assert.equal(timer.getOfferTiming(offer(start), late).state, 'expired');
  assert.equal(timer.shouldAutoRejectOffer(offer(start), late), true);
});

test('El rechazo automático espera el margen tras el vencimiento', () => {
  const start = 400_000;

  assert.equal(timer.AUTO_REJECT_GRACE_MS, 1000);
  assert.equal(timer.shouldAutoRejectOffer(offer(start), start + 15_000), false);
  assert.equal(timer.shouldAutoRejectOffer(offer(start), start + 15_999), false);
  assert.equal(timer.shouldAutoRejectOffer(offer(start), start + 16_000), true);
  // Una oferta ya rechazada no se vuelve a rechazar.
  assert.equal(
    timer.shouldAutoRejectOffer(offer(start, 'rejected'), start + 60_000),
    false
  );
});
