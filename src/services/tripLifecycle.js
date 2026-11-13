// AI-assisted: see docs/AI_LOG.md #17
import {
  doc,
  runTransaction,
  serverTimestamp,
} from 'firebase/firestore';
import {
  canStartTrip,
  canCompleteTrip,
  canCancelTrip,
  TRIP_STATUS,
} from '../utils/tripLogic';

async function changeTripStatus(
  database,
  tripId,
  driverId,
  canTransition,
  nextStatus,
  timestampField
) {
  if (!tripId || !driverId) {
    throw new Error('El viaje y el conductor son obligatorios.');
  }

  const tripRef = doc(database, 'trips', tripId);

  return runTransaction(database, async (transaction) => {
    const snapshot = await transaction.get(tripRef);

    if (!snapshot.exists()) {
      throw new Error('El viaje ya no existe.');
    }

    const trip = snapshot.data();

    if (!canTransition(trip, driverId)) {
      throw new Error(
        'No tienes permiso para realizar esta acción sobre el viaje.'
      );
    }

    transaction.update(tripRef, {
      status: nextStatus,
      [timestampField]: serverTimestamp(),
    });

    return tripId;
  });
}

export function startTripWithDatabase(database, tripId, driverId) {
  return changeTripStatus(
    database,
    tripId,
    driverId,
    canStartTrip,
    TRIP_STATUS.IN_PROGRESS,
    'startedAt'
  );
}

export function completeTripWithDatabase(database, tripId, driverId) {
  return changeTripStatus(
    database,
    tripId,
    driverId,
    canCompleteTrip,
    TRIP_STATUS.COMPLETED,
    'completedAt'
  );
}

export function cancelTripWithDatabase(database, tripId, driverId) {
  return changeTripStatus(
    database,
    tripId,
    driverId,
    canCancelTrip,
    TRIP_STATUS.CANCELLED,
    'cancelledAt'
  );
}
