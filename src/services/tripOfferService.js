// AI-assisted: see docs/AI_LOG.md #28
// Ofertas de solicitudes por conductor: drivers/{uid}/tripOffers/{tripId}.
//
// Modelo: las solicitudes pendientes son compartidas entre los conductores
// habilitados; la primera aceptación válida gana (transacción + reglas).
// Cada conductor registra su propia oferta al ver la solicitud, con la hora
// del servidor (offeredAt). El plazo de 15 s se cuenta desde esa marca y su
// rechazo (manual o por vencimiento) solo afecta a ese conductor.
import {
  collection,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
} from 'firebase/firestore';
import { OFFER_STATUS, REJECTION_REASON } from '../utils/tripRequestTimer';

// Ofertas recientes que se siguen en tiempo real; las solicitudes visibles
// son como máximo 20, así que 100 cubren holgadamente las vigentes.
export const MAX_TRACKED_OFFERS = 100;

function requireIds(driverId, tripId) {
  if (typeof driverId !== 'string' || !driverId.trim()) {
    throw new Error('No se pudo identificar al conductor.');
  }

  if (typeof tripId !== 'string' || !tripId.trim()) {
    throw new Error('No se pudo identificar la solicitud.');
  }
}

export function tripOfferRef(database, driverId, tripId) {
  return doc(database, 'drivers', driverId, 'tripOffers', tripId);
}

/**
 * Escucha las ofertas del conductor y entrega un Map tripId → oferta.
 * Una oferta recién creada tiene offeredAt null hasta que el servidor
 * confirma la marca de tiempo.
 */
export function subscribeToDriverTripOffersWithDatabase(
  database,
  driverId,
  onData,
  onError
) {
  const offersQuery = query(
    collection(database, 'drivers', driverId, 'tripOffers'),
    orderBy('offeredAt', 'desc'),
    limit(MAX_TRACKED_OFFERS)
  );

  return onSnapshot(
    offersQuery,
    (snapshot) => {
      const offers = new Map();

      snapshot.docs.forEach((offerDocument) => {
        offers.set(offerDocument.id, {
          id: offerDocument.id,
          ...offerDocument.data({ serverTimestamps: 'none' }),
        });
      });

      onData(offers);
    },
    (error) => {
      console.error('Error al escuchar las ofertas de viaje:', error);

      if (onError) {
        onError(error);
      }
    }
  );
}

/**
 * Registra que el conductor recibió la solicitud. Si la oferta ya existe no
 * la modifica, de modo que el plazo no se reinicia.
 * @returns {Promise<boolean>} true si se creó; false si ya existía.
 */
export async function createTripOfferWithDatabase(database, driverId, tripId) {
  requireIds(driverId, tripId);

  const offerRef = tripOfferRef(database, driverId, tripId);

  return runTransaction(database, async (transaction) => {
    const snapshot = await transaction.get(offerRef);

    if (snapshot.exists()) {
      return false;
    }

    transaction.set(offerRef, {
      tripId,
      status: OFFER_STATUS.OFFERED,
      offeredAt: serverTimestamp(),
    });

    return true;
  });
}

/**
 * Rechaza la solicitud para este conductor (manual o por vencimiento).
 * Repetir el rechazo no vuelve a escribir.
 * @returns {Promise<boolean>} true si se registró; false si ya estaba.
 */
export async function rejectTripOfferWithDatabase(
  database,
  driverId,
  tripId,
  reason
) {
  requireIds(driverId, tripId);

  if (!Object.values(REJECTION_REASON).includes(reason)) {
    throw new Error('El motivo del rechazo no es válido.');
  }

  const offerRef = tripOfferRef(database, driverId, tripId);

  return runTransaction(database, async (transaction) => {
    const snapshot = await transaction.get(offerRef);

    if (!snapshot.exists()) {
      throw new Error('La solicitud no está disponible para rechazar.');
    }

    if (snapshot.data().status === OFFER_STATUS.REJECTED) {
      return false;
    }

    transaction.update(offerRef, {
      status: OFFER_STATUS.REJECTED,
      reason,
      respondedAt: serverTimestamp(),
    });

    return true;
  });
}
