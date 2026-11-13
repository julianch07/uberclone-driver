// AI-assisted: see docs/AI_LOG.md #15
import {
  collection,
  doc,
  limit,
  onSnapshot,
  query,
  where,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { TRIP_STATUS } from '../utils/tripLogic';
import { acceptTripWithDatabase } from './tripAcceptance';
// AI-assisted: see docs/AI_LOG.md #17
import {
  startTripWithDatabase,
  completeTripWithDatabase,
  cancelTripWithDatabase,
} from './tripLifecycle';

const MAX_PENDING_TRIPS = 20;

export function subscribeToPendingTrips(onData, onError) {
  const pendingTripsQuery = query(
    collection(db, 'trips'),
    where('status', '==', TRIP_STATUS.PENDING),
    limit(MAX_PENDING_TRIPS)
  );

  return onSnapshot(
    pendingTripsQuery,
    (snapshot) => {
      const trips = snapshot.docs.map((tripDocument) => ({
        id: tripDocument.id,
        ...tripDocument.data(),
      }));

      onData(trips);
    },
    (error) => {
      console.error('Error al escuchar viajes pendientes:', error);

      if (onError) {
        onError(error);
      }
    }
  );
}

export async function acceptTrip(tripId, driverId, database = db) {
  return acceptTripWithDatabase(database, tripId, driverId);
}


// AI-assisted: see docs/AI_LOG.md #16
export function subscribeToActiveTrip(tripId, onData, onError) {
  const tripRef = doc(db, 'trips', tripId);

  return onSnapshot(
    tripRef,
    (snapshot) => {
      onData(
        snapshot.exists()
          ? { id: snapshot.id, ...snapshot.data() }
          : null
      );
    },
    (error) => {
      console.error('Error al sincronizar el viaje activo:', error);

      if (onError) {
        onError(error);
      }
    }
  );
}

// AI-assisted: see docs/AI_LOG.md #17
export async function startTrip(tripId, driverId, database = db) {
  return startTripWithDatabase(database, tripId, driverId);
}

export async function completeTrip(tripId, driverId, database = db) {
  return completeTripWithDatabase(database, tripId, driverId);
}

export async function cancelTrip(tripId, driverId, database = db) {
  return cancelTripWithDatabase(database, tripId, driverId);
}
