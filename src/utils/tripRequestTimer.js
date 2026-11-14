// AI-assisted: see docs/AI_LOG.md #20
// AI-assisted: see docs/AI_LOG.md #28

// La guía exige exactamente 15 segundos para responder una solicitud.
// firestore.rules usa el mismo plazo: duration.value(15, 's').
export const TRIP_REQUEST_TIMEOUT_MS = 15_000;

// El rechazo automático espera un segundo adicional para que la hora del
// servidor (request.time) también haya superado el plazo; si el reloj del
// dispositivo va adelantado, las reglas rechazarían la escritura.
export const AUTO_REJECT_GRACE_MS = 1_000;

// Estado de la oferta de una solicitud a un conductor
// (drivers/{uid}/tripOffers/{tripId}).
export const OFFER_STATUS = Object.freeze({
  OFFERED: 'offered',
  REJECTED: 'rejected',
});

export const REJECTION_REASON = Object.freeze({
  MANUAL: 'manual',
  EXPIRED: 'expired',
});

const TIMEOUT_SECONDS = TRIP_REQUEST_TIMEOUT_MS / 1000;

export function getTripRequestRemainingSeconds(
  firstSeenAt,
  now = Date.now()
) {
  if (
    !Number.isFinite(firstSeenAt) ||
    !Number.isFinite(now)
  ) {
    return 0;
  }

  const remainingMs =
    TRIP_REQUEST_TIMEOUT_MS - (now - firstSeenAt);

  // Con el reloj del dispositivo atrasado respecto al servidor el resultado
  // podría superar el plazo; nunca se muestran más de 15 segundos.
  return Math.min(
    TIMEOUT_SECONDS,
    Math.max(0, Math.ceil(remainingMs / 1000))
  );
}

export function isTripRequestExpired(firstSeenAt, now = Date.now()) {
  return getTripRequestRemainingSeconds(firstSeenAt, now) === 0;
}

// AI-assisted: see docs/AI_LOG.md #28
// Convierte un Timestamp de Firestore (o un objeto { seconds, nanoseconds })
// en milisegundos. Devuelve null si no hay marca del servidor: una escritura
// con serverTimestamp() pendiente de confirmar se lee como null y no se
// trata como hora definitiva.
export function timestampToMillis(value) {
  if (!value) {
    return null;
  }

  if (typeof value.toMillis === 'function') {
    const millis = value.toMillis();
    return Number.isFinite(millis) ? millis : null;
  }

  if (Number.isFinite(value.seconds)) {
    const nanoseconds = Number.isFinite(value.nanoseconds)
      ? value.nanoseconds
      : 0;
    return value.seconds * 1000 + Math.floor(nanoseconds / 1e6);
  }

  if (value instanceof Date && Number.isFinite(value.getTime())) {
    return value.getTime();
  }

  return null;
}

export const OFFER_TIMING_STATE = Object.freeze({
  // La oferta aún no tiene offeredAt confirmado por el servidor.
  WAITING_SERVER: 'waiting_server',
  ACTIVE: 'active',
  EXPIRED: 'expired',
});

// Tiempo restante de una oferta, calculado siempre desde offeredAt
// (hora del servidor, persistida): no se reinicia al volver a renderizar,
// al pasar a segundo plano ni al reabrir la aplicación.
export function getOfferTiming(offer, now = Date.now()) {
  const startMs = timestampToMillis(offer?.offeredAt);

  if (startMs === null) {
    return {
      state: OFFER_TIMING_STATE.WAITING_SERVER,
      remainingSeconds: null,
      deadlineMs: null,
    };
  }

  const remainingSeconds = getTripRequestRemainingSeconds(startMs, now);

  return {
    state:
      remainingSeconds === 0
        ? OFFER_TIMING_STATE.EXPIRED
        : OFFER_TIMING_STATE.ACTIVE,
    remainingSeconds,
    deadlineMs: startMs + TRIP_REQUEST_TIMEOUT_MS,
  };
}

// Indica si ya corresponde persistir el rechazo automático de la oferta.
export function shouldAutoRejectOffer(offer, now = Date.now()) {
  const { deadlineMs } = getOfferTiming(offer, now);

  return (
    offer?.status === OFFER_STATUS.OFFERED &&
    deadlineMs !== null &&
    now >= deadlineMs + AUTO_REJECT_GRACE_MS
  );
}
