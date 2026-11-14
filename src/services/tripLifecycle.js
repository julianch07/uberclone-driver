// AI-assisted: see docs/AI_LOG.md #17
// AI-assisted: see docs/AI_LOG.md #27
// AI-assisted: see docs/AI_LOG.md #28
import {
  doc,
  getDoc,
  runTransaction,
  serverTimestamp,
} from 'firebase/firestore';
import {
  canMarkDriverArriving,
  canMarkArrivedAtPickup,
  canStartTrip,
  canCompleteTrip,
  canCancelTrip,
  TRIP_STATUS,
} from '../utils/tripLogic';
import { buildCompletionBreakdown } from '../utils/fareLogic';

async function changeTripStatusInTransaction(
  database,
  tripId,
  driverId,
  canTransition,
  nextStatus,
  timestampField,
  { buildExtraFields, isAlreadyApplied } = {}
) {
  const tripRef = doc(database, 'trips', tripId);

  return runTransaction(database, async (transaction) => {
    const snapshot = await transaction.get(tripRef);

    if (!snapshot.exists()) {
      throw new Error('El viaje ya no existe.');
    }

    const trip = snapshot.data();

    // AI-assisted: see docs/AI_LOG.md #27
    // Reintento de una operación que ya se aplicó (por ejemplo, la respuesta
    // de la primera escritura se perdió): no se vuelve a escribir.
    if (isAlreadyApplied && isAlreadyApplied(trip, driverId)) {
      return tripId;
    }

    if (!canTransition(trip, driverId)) {
      throw new Error(
        'No tienes permiso para realizar esta acción sobre el viaje.'
      );
    }

    // Campos adicionales calculados con los datos leídos en la transacción.
    const extraFields = buildExtraFields ? buildExtraFields(trip) : {};

    transaction.update(tripRef, {
      ...extraFields,
      status: nextStatus,
      [timestampField]: serverTimestamp(),
    });

    return tripId;
  });
}

async function changeTripStatus(
  database,
  tripId,
  driverId,
  canTransition,
  nextStatus,
  timestampField,
  options = {}
) {
  if (!tripId || !driverId) {
    throw new Error('El viaje y el conductor son obligatorios.');
  }

  try {
    return await changeTripStatusInTransaction(
      database,
      tripId,
      driverId,
      canTransition,
      nextStatus,
      timestampField,
      options
    );
  } catch (error) {
    // AI-assisted: see docs/AI_LOG.md #27
    // Si una operación simultánea del mismo conductor se confirmó primero,
    // las reglas rechazan esta escritura con permission-denied, que el SDK
    // no reintenta. Se comprueba el estado real: si la operación ya quedó
    // aplicada, se considera cumplida. Cualquier otro rechazo se propaga.
    if (error?.code === 'permission-denied' && options.isAlreadyApplied) {
      const snapshot = await getDoc(doc(database, 'trips', tripId));

      if (
        snapshot.exists() &&
        options.isAlreadyApplied(snapshot.data(), driverId)
      ) {
        return tripId;
      }
    }

    throw error;
  }
}

function isAssignedTo(trip, driverId) {
  return typeof driverId === 'string' && trip?.driverId === driverId;
}

// AI-assisted: see docs/AI_LOG.md #28
// Una operación ya aplicada se reconoce porque el viaje está en ese estado o
// en uno posterior del mismo conductor.
export function isDriverArrivingApplied(trip, driverId) {
  return (
    isAssignedTo(trip, driverId) &&
    [
      TRIP_STATUS.DRIVER_ARRIVING,
      TRIP_STATUS.IN_PROGRESS,
      TRIP_STATUS.COMPLETED,
    ].includes(trip.status)
  );
}

export function isArrivedAtPickupApplied(trip, driverId) {
  return (
    isAssignedTo(trip, driverId) &&
    ((trip.status === TRIP_STATUS.DRIVER_ARRIVING && trip.arrivedAt != null) ||
      [TRIP_STATUS.IN_PROGRESS, TRIP_STATUS.COMPLETED].includes(trip.status))
  );
}

export function isTripStartApplied(trip, driverId) {
  return (
    isAssignedTo(trip, driverId) &&
    [TRIP_STATUS.IN_PROGRESS, TRIP_STATUS.COMPLETED].includes(trip.status)
  );
}

export function isTripCancelApplied(trip, driverId) {
  return isAssignedTo(trip, driverId) && trip.status === TRIP_STATUS.CANCELLED;
}

// "Voy en camino": accepted → driver_arriving (arrivingAt).
export function markDriverArrivingWithDatabase(database, tripId, driverId) {
  return changeTripStatus(
    database,
    tripId,
    driverId,
    canMarkDriverArriving,
    TRIP_STATUS.DRIVER_ARRIVING,
    'arrivingAt',
    { isAlreadyApplied: isDriverArrivingApplied }
  );
}

// "Llegué al origen": registra arrivedAt sin cambiar el estado.
export function markArrivedAtPickupWithDatabase(database, tripId, driverId) {
  return changeTripStatus(
    database,
    tripId,
    driverId,
    canMarkArrivedAtPickup,
    TRIP_STATUS.DRIVER_ARRIVING,
    'arrivedAt',
    { isAlreadyApplied: isArrivedAtPickupApplied }
  );
}

// "Pasajero a bordo": driver_arriving con arrivedAt → in_progress.
export function startTripWithDatabase(database, tripId, driverId) {
  return changeTripStatus(
    database,
    tripId,
    driverId,
    canStartTrip,
    TRIP_STATUS.IN_PROGRESS,
    'startedAt',
    { isAlreadyApplied: isTripStartApplied }
  );
}

// AI-assisted: see docs/AI_LOG.md #27
// Al finalizar se guarda el desglose de la tarifa (fare, commission,
// commissionRate, driverEarnings, tip y fareSource). firestore.rules
// recalcula y verifica esos valores. Un reintento sobre un viaje ya
// finalizado por el mismo conductor no escribe de nuevo, de modo que no se
// duplican ganancias.
export function isTripAlreadyCompletedBy(trip, driverId) {
  return (
    trip?.status === TRIP_STATUS.COMPLETED &&
    typeof driverId === 'string' &&
    trip.driverId === driverId
  );
}

export function completeTripWithDatabase(database, tripId, driverId) {
  return changeTripStatus(
    database,
    tripId,
    driverId,
    canCompleteTrip,
    TRIP_STATUS.COMPLETED,
    'completedAt',
    {
      buildExtraFields: buildCompletionBreakdown,
      isAlreadyApplied: isTripAlreadyCompletedBy,
    }
  );
}

export function cancelTripWithDatabase(database, tripId, driverId) {
  return changeTripStatus(
    database,
    tripId,
    driverId,
    canCancelTrip,
    TRIP_STATUS.CANCELLED,
    'cancelledAt',
    { isAlreadyApplied: isTripCancelApplied }
  );
}
