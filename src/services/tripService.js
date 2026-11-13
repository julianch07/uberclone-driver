// AI-assisted: see docs/AI_LOG.md #15
import {
  collection,
  doc,
  getDocs,
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

// AI-assisted: see docs/AI_LOG.md #18
export async function findActiveDriverTrip(driverId, database = db) {
  if (typeof driverId !== 'string' || !driverId.trim()) {
    throw new Error('No se pudo identificar al conductor.');
  }

  const activeTripsQuery = query(
    collection(database, 'trips'),
    where('driverId', '==', driverId),
    where('status', 'in', [
      TRIP_STATUS.ACCEPTED,
      TRIP_STATUS.IN_PROGRESS,
    ]),
    limit(2)
  );

  const snapshot = await getDocs(activeTripsQuery);

  const trips = snapshot.docs.map((tripDocument) => ({
    id: tripDocument.id,
    ...tripDocument.data(),
  }));

  if (trips.length > 1) {
    throw new Error(
      'Se encontraron varios viajes activos para el conductor.'
    );
  }

  return trips[0] ?? null;
}

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

// AI-assisted: see docs/AI_LOG.md #23
// Debe coincidir con el límite de la regla de historial en firestore.rules.
export const MAX_HISTORY_TRIPS = 50;

function finishedAtSeconds(trip) {
  return (trip.completedAt ?? trip.cancelledAt)?.seconds ?? 0;
}

/**
 * Historial de viajes finalizados (completados o cancelados) del conductor.
 * Lo usan las pantallas de historial, ganancias y pagos.
 * @param {string} driverId UID del conductor.
 * @param {number} maxResults Máximo de resultados (1 a MAX_HISTORY_TRIPS).
 * @returns {Promise<Array>} Viajes, del más reciente al más antiguo.
 */
export async function getDriverTripHistory(
  driverId,
  maxResults = MAX_HISTORY_TRIPS,
  database = db
) {
  if (typeof driverId !== 'string' || !driverId.trim()) {
    throw new Error('ID del conductor es obligatorio');
  }

  const historyLimit = Math.min(
    Math.max(Math.trunc(Number(maxResults)) || 1, 1),
    MAX_HISTORY_TRIPS
  );

  const historyQuery = query(
    collection(database, 'trips'),
    where('driverId', '==', driverId),
    where('status', 'in', [TRIP_STATUS.COMPLETED, TRIP_STATUS.CANCELLED]),
    limit(historyLimit)
  );

  const snapshot = await getDocs(historyQuery);

  return snapshot.docs
    .map((tripDocument) => ({
      id: tripDocument.id,
      ...tripDocument.data(),
    }))
    .sort((a, b) => finishedAtSeconds(b) - finishedAtSeconds(a));
}
