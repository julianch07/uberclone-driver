// AI-assisted: see docs/AI_LOG.md #16
import { TRIP_STATUS } from './tripLogic';

export function isActiveDriverTrip(trip, uid) {
  if (!trip || !uid || trip.driverId !== uid) {
    return false;
  }

  return (
    trip.status === TRIP_STATUS.ACCEPTED ||
    trip.status === TRIP_STATUS.IN_PROGRESS
  );
}
