// AI-assisted: see docs/AI_LOG.md #21

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
  if (
    !trip ||
    !['accepted', 'in_progress'].includes(trip.status)
  ) {
    return null;
  }

  const pickup = normalizeCoordinate(trip.pickup);
  const destination = normalizeCoordinate(trip.destination);
  const driver = normalizeCoordinate(driverPosition);

  if (!pickup || !destination) {
    return null;
  }

  const isAccepted = trip.status === 'accepted';

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
