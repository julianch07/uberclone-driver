// AI-assisted: see docs/AI_LOG.md #17
// AI-assisted: see docs/AI_LOG.md #27
import {
  doc,
  getDoc,
  runTransaction,
  serverTimestamp,
} from 'firebase/firestore';
import {
  canStartTrip,
  canCompleteTrip,
  canCancelTrip,
  TRIP_STATUS,
} from '../utils/tripLogic';
import { buildCompletionBreakdown } from '../utils/fareLogic';

async function changeTripStatus(
  database,
  tripId,
  driverId,
  canTransition,
  nextStatus,
  timestampField,
  { buildExtraFields, isAlreadyApplied } = {}
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

    // AI-assisted: see docs/AI_LOG.md #27
    // Reintento de una operación que ya se aplicó (por ejemplo, la respuesta
    // de la primera finalización se perdió): no se vuelve a escribir.
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

export async function completeTripWithDatabase(database, tripId, driverId) {
  try {
    return await changeTripStatus(
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
  } catch (error) {
    // Si otra finalización simultánea del mismo conductor se confirmó
    // primero, las reglas rechazan esta escritura (el viaje ya no está
    // in_progress) con permission-denied, que el SDK no reintenta. Se
    // comprueba el estado real: si ya quedó finalizado por este conductor,
    // la operación se considera cumplida. Cualquier otro rechazo se propaga.
    if (error?.code === 'permission-denied') {
      const snapshot = await getDoc(doc(database, 'trips', tripId));

      if (
        snapshot.exists() &&
        isTripAlreadyCompletedBy(snapshot.data(), driverId)
      ) {
        return tripId;
      }
    }

    throw error;
  }
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
