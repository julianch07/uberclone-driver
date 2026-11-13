// AI-assisted: see docs/AI_LOG.md #15
// AI-assisted: see docs/AI_LOG.md #23
import { doc, runTransaction } from 'firebase/firestore';
import { canAcceptTrip, TRIP_STATUS } from '../utils/tripLogic';

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

    if (trip.status !== TRIP_STATUS.PENDING || trip.driverId != null) {
      throw new Error('Este viaje ya fue aceptado por otro conductor.');
    }

    // firestore.rules (validTripAcceptance) rechaza viajes con origen,
    // destino o tarifa inválidos. Se comprueba antes de escribir para
    // mostrar un mensaje claro en lugar de "Missing or insufficient
    // permissions". La habilitación del conductor la verifican las reglas.
    if (!canAcceptTrip(trip, driverId, true)) {
      throw new Error(
        'La solicitud tiene datos incompletos o inválidos y no puede aceptarse.'
      );
    }

    // Solo status y driverId: las reglas exigen que la aceptación no
    // modifique ningún otro campo del viaje.
    transaction.update(tripRef, {
      status: TRIP_STATUS.ACCEPTED,
      driverId,
    });

    return tripId;
  });
}
