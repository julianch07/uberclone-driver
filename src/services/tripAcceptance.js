// AI-assisted: see docs/AI_LOG.md #15
import { doc, runTransaction } from 'firebase/firestore';

export async function acceptTripWithDatabase(
  database,
  tripId,
  driverId
) {
  if (!tripId || !driverId) {
    throw new Error('El viaje y el conductor son obligatorios.');
  }

  const tripRef = doc(database, 'trips', tripId);

  return runTransaction(database, async (transaction) => {
    const tripSnapshot = await transaction.get(tripRef);

    if (!tripSnapshot.exists()) {
      throw new Error('El viaje ya no está disponible.');
    }

    const trip = tripSnapshot.data();

    if (trip.status !== 'pending' || trip.driverId != null) {
      throw new Error('Este viaje ya fue aceptado por otro conductor.');
    }

    transaction.update(tripRef, {
      status: 'accepted',
      driverId,
    });

    return tripId;
  });
}
