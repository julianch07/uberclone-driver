// AI-assisted: see docs/AI_LOG.md #15
import {
  collection,
  limit,
  onSnapshot,
  query,
  where,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { TRIP_STATUS } from '../utils/tripLogic';
import { acceptTripWithDatabase } from './tripAcceptance';

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
