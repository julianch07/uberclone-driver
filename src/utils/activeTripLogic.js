// AI-assisted: see docs/AI_LOG.md #16
// AI-assisted: see docs/AI_LOG.md #28
import { ACTIVE_TRIP_STATUSES } from './tripLogic';

export function isActiveDriverTrip(trip, uid) {
  if (!trip || !uid || trip.driverId !== uid) {
    return false;
  }

  // Incluye driver_arriving para recuperar el viaje al reabrir la app.
  return ACTIVE_TRIP_STATUSES.includes(trip.status);
}
