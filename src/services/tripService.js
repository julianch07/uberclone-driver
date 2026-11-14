// AI-assisted: see docs/AI_LOG.md #15
// AI-assisted: see docs/AI_LOG.md #28
import {
  collection,
  doc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  where,
} from 'firebase/firestore';

import { db } from '../config/firebase';
import { ACTIVE_TRIP_STATUSES, TRIP_STATUS } from '../utils/tripLogic';
import { acceptTripWithDatabase } from './tripAcceptance';
// AI-assisted: see docs/AI_LOG.md #40
import { fetchTripHistoryPage } from './tripHistoryService';
import { DEFAULT_HISTORY_FILTERS } from '../utils/tripHistoryLogic';

// AI-assisted: see docs/AI_LOG.md #17
import {
  startTripWithDatabase,
  completeTripWithDatabase,
  cancelTripWithDatabase,
  markDriverArrivingWithDatabase,
  markArrivedAtPickupWithDatabase,
} from './tripLifecycle';
import {
  createTripOfferWithDatabase,
  rejectTripOfferWithDatabase,
  subscribeToDriverTripOffersWithDatabase,
} from './tripOfferService';
// AI-assisted: see docs/AI_LOG.md #29
import {
  fetchPendingCashTripsWithDatabase,
  getDriverBalanceTotalsWithDatabase,
  registerCashPaymentWithDatabase,
  subscribeToDriverBalanceWithDatabase,
  subscribeToDriverLedgerWithDatabase,
  subscribeToPendingCashTripsWithDatabase,
} from './cashPaymentService';

const MAX_PENDING_TRIPS = 20;

// AI-assisted: see docs/AI_LOG.md #18
export async function findActiveDriverTrip(driverId, database = db) {
  if (typeof driverId !== 'string' || !driverId.trim()) {
    throw new Error('No se pudo identificar al conductor.');
  }

  const activeTripsQuery = query(
    collection(database, 'trips'),
    where('driverId', '==', driverId),
    // AI-assisted: see docs/AI_LOG.md #28
    where('status', 'in', [...ACTIVE_TRIP_STATUSES]),
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

// AI-assisted: see docs/AI_LOG.md #28
// Las solicitudes más recientes primero: las antiguas que siguen en
// pending (vencidas o rechazadas) no ocupan los 20 resultados. Requiere que
// el viaje tenga createdAt de tipo timestamp y el índice compuesto
// (status, createdAt desc) de firestore.indexes.json.
export function subscribeToPendingTrips(onData, onError, database = db) {
  const pendingTripsQuery = query(
    collection(database, 'trips'),
    where('status', '==', TRIP_STATUS.PENDING),
    orderBy('createdAt', 'desc'),
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
// AI-assisted: see docs/AI_LOG.md #28
// "Voy en camino" (accepted → driver_arriving).
export async function markDriverArriving(tripId, driverId, database = db) {
  return markDriverArrivingWithDatabase(database, tripId, driverId);
}

// "Llegué al origen" (registra arrivedAt).
export async function markArrivedAtPickup(tripId, driverId, database = db) {
  return markArrivedAtPickupWithDatabase(database, tripId, driverId);
}

// "Pasajero a bordo" (driver_arriving con arrivedAt → in_progress).
export async function startTrip(tripId, driverId, database = db) {
  return startTripWithDatabase(database, tripId, driverId);
}

export async function completeTrip(tripId, driverId, database = db) {
  return completeTripWithDatabase(database, tripId, driverId);
}

export async function cancelTrip(tripId, driverId, database = db) {
  return cancelTripWithDatabase(database, tripId, driverId);
}

// AI-assisted: see docs/AI_LOG.md #28
// Ofertas de solicitudes del conductor (ver tripOfferService.js).
export function subscribeToDriverTripOffers(
  driverId,
  onData,
  onError,
  database = db
) {
  return subscribeToDriverTripOffersWithDatabase(
    database,
    driverId,
    onData,
    onError
  );
}

export async function createTripOffer(driverId, tripId, database = db) {
  return createTripOfferWithDatabase(database, driverId, tripId);
}

export async function rejectTripOffer(
  driverId,
  tripId,
  reason,
  database = db
) {
  return rejectTripOfferWithDatabase(database, driverId, tripId, reason);
}

// AI-assisted: see docs/AI_LOG.md #22
// AI-assisted: see docs/AI_LOG.md #23
// Historial creado con Gemini CLI (#22) y reescrito con Claude Code (#23).
// Debe coincidir con el límite de la regla de historial en firestore.rules.
export const MAX_HISTORY_TRIPS = 50;

/**
 * Historial de viajes finalizados (completados, pagados o cancelados) del conductor.
 * Lo usan las pantallas de historial, ganancias y pagos.
 * @param {string} driverId UID del conductor.
 * @param {number} maxResults Máximo de resultados (1 a MAX_HISTORY_TRIPS).
 * @returns {Promise<Array>} Viajes, del más reciente al más antiguo.
 */
// AI-assisted: see docs/AI_LOG.md #40
// Antes se pedían hasta 50 viajes sin orden de Firestore y se ordenaban en
// la app, de modo que con más de 50 viajes podían quedar fuera los más
// recientes. Ahora Firestore ordena por createdAt (desc) antes de limitar;
// sin el índice compuesto, se ordena la lectura completa en la app
// (tripHistoryService.js).
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

  const { trips } = await fetchTripHistoryPage(driverId, DEFAULT_HISTORY_FILTERS, {
    pageSize: historyLimit,
    database,
  });

  return trips.slice(0, historyLimit);
}

// AI-assisted: see docs/AI_LOG.md #29
// Cobros en efectivo y saldo del conductor (ver cashPaymentService.js).
export async function registerCashPayment(tripId, driverId, database = db) {
  return registerCashPaymentWithDatabase(database, tripId, driverId);
}

export function subscribeToPendingCashTrips(
  driverId,
  onData,
  onError,
  database = db
) {
  return subscribeToPendingCashTripsWithDatabase(
    database,
    driverId,
    onData,
    onError
  );
}

export function subscribeToDriverLedger(
  driverId,
  onData,
  onError,
  database = db
) {
  return subscribeToDriverLedgerWithDatabase(
    database,
    driverId,
    onData,
    onError
  );
}

// Lista completa (todas las páginas) de cobros en efectivo por confirmar.
export async function fetchPendingCashTrips(driverId, database = db) {
  return fetchPendingCashTripsWithDatabase(database, driverId);
}

// Totales del saldo calculados en el servidor sobre todos los asientos.
export async function getDriverBalanceTotals(driverId, database = db) {
  return getDriverBalanceTotalsWithDatabase(database, driverId);
}

// Asientos recientes y saldo completo en tiempo real.
export function subscribeToDriverBalance(
  driverId,
  onData,
  onError,
  database = db
) {
  return subscribeToDriverBalanceWithDatabase(
    database,
    driverId,
    onData,
    onError
  );
}
