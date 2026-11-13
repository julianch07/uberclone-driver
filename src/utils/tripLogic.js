// AI-assisted: see docs/AI_LOG.md #15

export const TRIP_STATUS = {
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
};

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

export function canStartTrip(trip, driverId) {
  return (
    isValidTrip(trip) &&
    trip.status === TRIP_STATUS.ACCEPTED &&
    typeof driverId === 'string' &&
    driverId.trim().length > 0 &&
    trip.driverId === driverId
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

export function canCancelTrip(trip, driverId) {
  return (
    isValidTrip(trip) &&
    trip.status === TRIP_STATUS.ACCEPTED &&
    typeof driverId === 'string' &&
    driverId.trim().length > 0 &&
    trip.driverId === driverId
  );
}
