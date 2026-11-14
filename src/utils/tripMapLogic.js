// AI-assisted: see docs/AI_LOG.md #21
// AI-assisted: see docs/AI_LOG.md #28
import { ACTIVE_TRIP_STATUSES, TRIP_STATUS } from './tripLogic';

function isValidCoordinate(position) {
  return (
    position !== null &&
    typeof position === 'object' &&
    Number.isFinite(position.latitude) &&
    Number.isFinite(position.longitude) &&
    position.latitude >= -90 &&
    position.latitude <= 90 &&
    position.longitude >= -180 &&
    position.longitude <= 180
  );
}

function normalizeCoordinate(position) {
  if (!isValidCoordinate(position)) {
    return null;
  }

  return {
    latitude: position.latitude,
    longitude: position.longitude,
  };
}

export function getTripMapConfiguration(trip, driverPosition) {
  if (!trip || !ACTIVE_TRIP_STATUSES.includes(trip.status)) {
    return null;
  }

  const pickup = normalizeCoordinate(trip.pickup);
  const destination = normalizeCoordinate(trip.destination);
  const driver = normalizeCoordinate(driverPosition);

  if (!pickup || !destination) {
    return null;
  }

  // Hasta que el pasajero sube (in_progress), la ruta va al punto de
  // recogida: estados accepted y driver_arriving.
  const isAccepted = trip.status !== TRIP_STATUS.IN_PROGRESS;

  return {
    status: trip.status,
    driver,
    pickup,
    destination,
    routeStart: driver,
    routeEnd: isAccepted ? pickup : destination,
    routeLabel: isAccepted
      ? 'Ruta hacia el punto de recogida'
      : 'Ruta hacia el destino',
  };
}
