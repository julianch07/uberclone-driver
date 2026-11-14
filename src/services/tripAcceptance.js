// AI-assisted: see docs/AI_LOG.md #15
// AI-assisted: see docs/AI_LOG.md #23
// AI-assisted: see docs/AI_LOG.md #28
import { doc, runTransaction } from 'firebase/firestore';
import { canAcceptTrip, TRIP_STATUS } from '../utils/tripLogic';
import {
  getOfferTiming,
  OFFER_STATUS,
  OFFER_TIMING_STATE,
} from '../utils/tripRequestTimer';
import { tripOfferRef } from './tripOfferService';

export async function acceptTripWithDatabase(
  database,
  tripId,
  driverId
) {
  if (!tripId || !driverId) {
    throw new Error('El viaje y el conductor son obligatorios.');
  }

  const tripRef = doc(database, 'trips', tripId);
  const offerRef = tripOfferRef(database, driverId, tripId);

  return runTransaction(database, async (transaction) => {
    const tripSnapshot = await transaction.get(tripRef);
    // AI-assisted: see docs/AI_LOG.md #28
    const offerSnapshot = await transaction.get(offerRef);

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

    // AI-assisted: see docs/AI_LOG.md #28
    // La oferta del conductor debe existir, no estar rechazada y seguir
    // dentro de los 15 s contados desde offeredAt (hora del servidor).
    // firestore.rules verifica lo mismo con request.time.
    if (!offerSnapshot.exists()) {
      throw new Error(
        'La solicitud todavía no está lista. Inténtalo de nuevo en un momento.'
      );
    }

    const offer = offerSnapshot.data({ serverTimestamps: 'none' });

    if (offer.status === OFFER_STATUS.REJECTED) {
      throw new Error('Ya rechazaste esta solicitud.');
    }

    const timing = getOfferTiming(offer);

    if (timing.state === OFFER_TIMING_STATE.WAITING_SERVER) {
      throw new Error(
        'La solicitud todavía no está lista. Inténtalo de nuevo en un momento.'
      );
    }

    if (timing.state === OFFER_TIMING_STATE.EXPIRED) {
      throw new Error('El tiempo para aceptar esta solicitud terminó.');
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
