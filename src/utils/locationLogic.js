// AI-assisted: see docs/AI_LOG.md #13

export const PERMISSION = {
  UNDETERMINED: 'undetermined',
  GRANTED: 'granted',
  DENIED: 'denied', // rechazado, todavía se puede volver a preguntar
  BLOCKED: 'blocked', // rechazado de forma permanente: solo desde Ajustes
};

export const LOCATION_ERROR = {
  PERMISSION_DENIED: 'permission-denied',
  SERVICES_DISABLED: 'services-disabled',
  POSITION_UNAVAILABLE: 'position-unavailable',
  TIMEOUT: 'timeout',
  UNKNOWN: 'unknown',
};

const LOCATION_ERROR_MESSAGES = {
  [LOCATION_ERROR.PERMISSION_DENIED]:
    'No tienes permiso para usar la ubicación del dispositivo.',
  [LOCATION_ERROR.SERVICES_DISABLED]:
    'El GPS del dispositivo está desactivado. Actívalo para ver tu ubicación.',
  [LOCATION_ERROR.POSITION_UNAVAILABLE]:
    'No se pudo obtener tu ubicación. Verifica la señal del GPS e inténtalo de nuevo.',
  [LOCATION_ERROR.TIMEOUT]:
    'La ubicación tardó demasiado en responder. Inténtalo de nuevo.',
  [LOCATION_ERROR.UNKNOWN]: 'Ocurrió un error al obtener tu ubicación.',
};

export function getLocationErrorMessage(code) {
  return LOCATION_ERROR_MESSAGES[code] || LOCATION_ERROR_MESSAGES.unknown;
}

// Convierte la respuesta de expo-location en un estado simple.
export function normalizePermission(response) {
  if (!response || typeof response !== 'object') {
    return { status: PERMISSION.UNDETERMINED, canAskAgain: true };
  }

  if (response.granted === true || response.status === 'granted') {
    return { status: PERMISSION.GRANTED, canAskAgain: true };
  }

  if (response.status === 'denied') {
    const canAskAgain = response.canAskAgain !== false;

    return {
      status: canAskAgain ? PERMISSION.DENIED : PERMISSION.BLOCKED,
      canAskAgain,
    };
  }

  return { status: PERMISSION.UNDETERMINED, canAskAgain: true };
}

// Clasifica un error de expo-location según su código o mensaje.
export function classifyLocationError(error) {
  const text = `${(error && error.code) || ''} ${
    (error && error.message) || ''
  }`.toLowerCase();

  if (text.includes('permission') || text.includes('denied')) {
    return LOCATION_ERROR.PERMISSION_DENIED;
  }

  if (
    text.includes('services') ||
    text.includes('disabled') ||
    text.includes('provider')
  ) {
    return LOCATION_ERROR.SERVICES_DISABLED;
  }

  if (text.includes('timeout') || text.includes('timed out')) {
    return LOCATION_ERROR.TIMEOUT;
  }

  if (text.includes('unavailable') || text.includes('location')) {
    return LOCATION_ERROR.POSITION_UNAVAILABLE;
  }

  return LOCATION_ERROR.UNKNOWN;
}

function isFiniteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

// Latitud entre -90 y 90, longitud entre -180 y 180. Rechaza NaN, Infinity,
// textos y valores ausentes.
export function isValidCoordinates(position) {
  return Boolean(
    position &&
      isFiniteNumber(position.latitude) &&
      isFiniteNumber(position.longitude) &&
      position.latitude >= -90 &&
      position.latitude <= 90 &&
      position.longitude >= -180 &&
      position.longitude <= 180
  );
}

// Extrae latitud, longitud, precisión y hora de una respuesta de expo-location.
// Devuelve null si las coordenadas no son válidas.
export function normalizePosition(location) {
  const coords = location && location.coords;

  if (!isValidCoordinates(coords)) {
    return null;
  }

  return {
    latitude: coords.latitude,
    longitude: coords.longitude,
    accuracy: isFiniteNumber(coords.accuracy) && coords.accuracy >= 0
      ? coords.accuracy
      : null,
    timestamp: isFiniteNumber(location.timestamp) ? location.timestamp : null,
  };
}

const EARTH_RADIUS_METERS = 6371000;

export function distanceMeters(from, to) {
  const toRadians = (degrees) => (degrees * Math.PI) / 180;
  const deltaLat = toRadians(to.latitude - from.latitude);
  const deltaLon = toRadians(to.longitude - from.longitude);
  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(toRadians(from.latitude)) *
      Math.cos(toRadians(to.latitude)) *
      Math.sin(deltaLon / 2) ** 2;

  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.min(1, Math.sqrt(a)));
}

export const PUBLISH_DEFAULTS = {
  minIntervalMs: 10000, // no escribir más de una vez cada 10 s
  minDistanceMeters: 15, // ni por desplazamientos menores a 15 m
  heartbeatMs: 60000, // pero sí renovar la fecha cada 60 s
};

// Decide si una nueva posición debe escribirse en Firestore.
// last = { latitude, longitude, at } de la última escritura confirmada.
export function shouldPublishLocation(last, next, nowMs, options = {}) {
  const { minIntervalMs, minDistanceMeters, heartbeatMs } = {
    ...PUBLISH_DEFAULTS,
    ...options,
  };

  if (!isValidCoordinates(next)) {
    return { publish: false, reason: 'invalid' };
  }

  if (!last) {
    return { publish: true, reason: 'first' };
  }

  const elapsed = nowMs - last.at;

  if (elapsed < minIntervalMs) {
    return { publish: false, reason: 'throttled' };
  }

  if (distanceMeters(last, next) >= minDistanceMeters) {
    return { publish: true, reason: 'moved' };
  }

  if (elapsed >= heartbeatMs) {
    return { publish: true, reason: 'heartbeat' };
  }

  return { publish: false, reason: 'unchanged' };
}
