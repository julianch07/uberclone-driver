// AI-assisted: see docs/AI_LOG.md #15
// AI-assisted: see docs/AI_LOG.md #28

// Estados persistidos en el campo status. `pending` equivale al estado
// `requested` de la guía y se conserva para no romper datos ni reglas.
// "Llegué al origen" no es un estado: se registra con la marca de tiempo
// arrivedAt dentro de driver_arriving. `rejected` (decisión global de un
// backend) no lo escribe esta app.
// AI-assisted: see docs/AI_LOG.md #29
// `paid`: el pago quedó registrado. En efectivo lo registra el conductor;
// en pagos digitales lo escribirá el backend de la pasarela.
export const TRIP_STATUS = {
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  DRIVER_ARRIVING: 'driver_arriving',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  PAID: 'paid',
  CANCELLED: 'cancelled',
};

// Estados en los que el viaje está asignado y en curso para el conductor.
export const ACTIVE_TRIP_STATUSES = Object.freeze([
  TRIP_STATUS.ACCEPTED,
  TRIP_STATUS.DRIVER_ARRIVING,
  TRIP_STATUS.IN_PROGRESS,
]);

const VALID_STATUSES = Object.values(TRIP_STATUS);

function isValidLocation(location) {
  return (
    location !== null &&
    typeof location === 'object' &&
    typeof location.address === 'string' &&
    location.address.trim().length > 0 &&
    typeof location.latitude === 'number' &&
    Number.isFinite(location.latitude) &&
    location.latitude >= -90 &&
    location.latitude <= 90 &&
    typeof location.longitude === 'number' &&
    Number.isFinite(location.longitude) &&
    location.longitude >= -180 &&
    location.longitude <= 180
  );
}

export function isValidTrip(trip) {
  if (!trip || typeof trip !== 'object' || Array.isArray(trip)) {
    return false;
  }

  // AI-assisted: see docs/AI_LOG.md #23
  // driverId ausente (viaje creado en la consola) equivale a no asignado,
  // igual que en firestore.rules.
  return (
    VALID_STATUSES.includes(trip.status) &&
    (trip.driverId == null ||
      (typeof trip.driverId === 'string' && trip.driverId.trim().length > 0)) &&
    isValidLocation(trip.pickup) &&
    isValidLocation(trip.destination) &&
    typeof trip.estimatedFare === 'number' &&
    Number.isFinite(trip.estimatedFare) &&
    trip.estimatedFare >= 0
  );
}

export function canAcceptTrip(trip, driverId, driverEligible) {
  return (
    isValidTrip(trip) &&
    trip.status === TRIP_STATUS.PENDING &&
    trip.driverId == null &&
    typeof driverId === 'string' &&
    driverId.trim().length > 0 &&
    driverEligible === true
  );
}

function isAssignedTo(trip, driverId) {
  return (
    typeof driverId === 'string' &&
    driverId.trim().length > 0 &&
    trip.driverId === driverId
  );
}

function hasTimestamp(value) {
  return value != null;
}

// AI-assisted: see docs/AI_LOG.md #28
// Ciclo: accepted → driver_arriving → (arrivedAt) → in_progress → completed.

// "Voy en camino": el conductor sale hacia el punto de recogida.
export function canMarkDriverArriving(trip, driverId) {
  return (
    isValidTrip(trip) &&
    trip.status === TRIP_STATUS.ACCEPTED &&
    isAssignedTo(trip, driverId)
  );
}

// "Llegué al origen": se registra una sola vez dentro de driver_arriving.
export function canMarkArrivedAtPickup(trip, driverId) {
  return (
    isValidTrip(trip) &&
    trip.status === TRIP_STATUS.DRIVER_ARRIVING &&
    !hasTimestamp(trip.arrivedAt) &&
    isAssignedTo(trip, driverId)
  );
}

// "Pasajero a bordo": solo después de llegar al punto de recogida.
export function canStartTrip(trip, driverId) {
  return (
    isValidTrip(trip) &&
    trip.status === TRIP_STATUS.DRIVER_ARRIVING &&
    hasTimestamp(trip.arrivedAt) &&
    isAssignedTo(trip, driverId)
  );
}

export function canCompleteTrip(trip, driverId) {
  return (
    isValidTrip(trip) &&
    trip.status === TRIP_STATUS.IN_PROGRESS &&
    typeof driverId === 'string' &&
    driverId.trim().length > 0 &&
    trip.driverId === driverId
  );
}

// AI-assisted: see docs/AI_LOG.md #28
// La guía permite cancelar antes de in_progress.
export function canCancelTrip(trip, driverId) {
  return (
    isValidTrip(trip) &&
    (trip.status === TRIP_STATUS.ACCEPTED ||
      trip.status === TRIP_STATUS.DRIVER_ARRIVING) &&
    isAssignedTo(trip, driverId)
  );
}

// Etapa del viaje activo para la interfaz y el mapa.
export const TRIP_STAGE = Object.freeze({
  ACCEPTED: 'accepted',
  TO_PICKUP: 'to_pickup',
  AT_PICKUP: 'at_pickup',
  TO_DESTINATION: 'to_destination',
});

export function getActiveTripStage(trip) {
  if (!trip) return null;

  if (trip.status === TRIP_STATUS.ACCEPTED) return TRIP_STAGE.ACCEPTED;

  if (trip.status === TRIP_STATUS.DRIVER_ARRIVING) {
    return hasTimestamp(trip.arrivedAt)
      ? TRIP_STAGE.AT_PICKUP
      : TRIP_STAGE.TO_PICKUP;
  }

  if (trip.status === TRIP_STATUS.IN_PROGRESS) {
    return TRIP_STAGE.TO_DESTINATION;
  }

  return null;
}
