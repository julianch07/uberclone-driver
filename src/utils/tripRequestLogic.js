// AI-assisted: see docs/AI_LOG.md #28
// Lógica pura de las solicitudes de viaje: datos de la tarjeta y selección
// de las solicitudes visibles para un conductor. No accede a Firestore.
import { buildCompletionBreakdown, normalizeCategory } from './fareLogic';
import { TRIP_STATUS } from './tripLogic';
import {
  getOfferTiming,
  OFFER_STATUS,
  OFFER_TIMING_STATE,
  shouldAutoRejectOffer,
} from './tripRequestTimer';

// Métodos de pago que puede traer una solicitud. Contrato para el módulo de
// pagos: el campo paymentMethod lo fija quien crea el viaje y el conductor no
// puede modificarlo (firestore.rules).
export const PAYMENT_METHOD = Object.freeze({
  CASH: 'cash',
  MERCADOPAGO: 'mercadopago',
  STRIPE: 'stripe',
});

const PAYMENT_METHOD_LABELS = Object.freeze({
  [PAYMENT_METHOD.CASH]: 'Efectivo',
  [PAYMENT_METHOD.MERCADOPAGO]: 'Mercado Pago',
  [PAYMENT_METHOD.STRIPE]: 'Stripe',
});

const CATEGORY_LABELS = Object.freeze({
  economy: 'Económico',
  xl: 'XL',
  premium: 'Premium',
});

const NOT_AVAILABLE = 'No disponible';

function isNonNegativeFinite(value) {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

export function getPaymentMethodLabel(paymentMethod) {
  return PAYMENT_METHOD_LABELS[paymentMethod] || 'No especificado';
}

export function getCategoryLabel(category) {
  const normalized = normalizeCategory(category);
  return normalized ? CATEGORY_LABELS[normalized] : 'No especificada';
}

function formatDistance(distanceKm) {
  return isNonNegativeFinite(distanceKm)
    ? `${distanceKm.toLocaleString('es-CO', { maximumFractionDigits: 1 })} km`
    : NOT_AVAILABLE;
}

function formatDuration(durationMin) {
  return isNonNegativeFinite(durationMin)
    ? `${Math.round(durationMin)} min`
    : NOT_AVAILABLE;
}

// Estimación del desglose: el mismo que se guardará al finalizar
// (buildCompletionBreakdown). null si el viaje no permite calcularlo.
export function getTripEstimate(trip) {
  try {
    return buildCompletionBreakdown(trip);
  } catch {
    return null;
  }
}

/**
 * Datos de la tarjeta de una solicitud. Los documentos antiguos sin
 * distancia, duración, categoría o método de pago se muestran con lo que
 * tengan, sin inventar valores.
 */
export function buildTripRequestCard(trip, offer, now = Date.now()) {
  const estimate = getTripEstimate(trip);
  const timing = offer
    ? getOfferTiming(offer, now)
    : {
        state: OFFER_TIMING_STATE.WAITING_SERVER,
        remainingSeconds: null,
        deadlineMs: null,
      };

  return {
    id: trip.id,
    pickupAddress: trip.pickup?.address || 'Origen no disponible',
    destinationAddress: trip.destination?.address || 'Destino no disponible',
    distanceKm: isNonNegativeFinite(trip.distanceKm) ? trip.distanceKm : null,
    durationMin: isNonNegativeFinite(trip.durationMin) ? trip.durationMin : null,
    distanceLabel: formatDistance(trip.distanceKm),
    durationLabel: formatDuration(trip.durationMin),
    categoryLabel: getCategoryLabel(trip.category),
    paymentMethodLabel: getPaymentMethodLabel(trip.paymentMethod),
    estimate,
    timing,
    canAccept:
      offer?.status === OFFER_STATUS.OFFERED &&
      timing.state === OFFER_TIMING_STATE.ACTIVE &&
      estimate !== null,
  };
}

function isOpenRequest(trip) {
  return (
    trip &&
    typeof trip.id === 'string' &&
    trip.status === TRIP_STATUS.PENDING &&
    trip.driverId == null
  );
}

/**
 * Solicitudes que se muestran al conductor: pendientes, sin conductor
 * asignado, no rechazadas por él y con la oferta sin vencer.
 * @param {Array} pendingTrips Viajes de la consulta en tiempo real.
 * @param {Map<string, object>} offersByTripId Ofertas del conductor.
 */
export function selectVisibleTripRequests(
  pendingTrips,
  offersByTripId,
  now = Date.now()
) {
  return pendingTrips
    .filter(isOpenRequest)
    .map((trip) => buildTripRequestCard(trip, offersByTripId.get(trip.id), now))
    .filter((card) => {
      const offer = offersByTripId.get(card.id);

      if (offer?.status === OFFER_STATUS.REJECTED) return false;
      return card.timing.state !== OFFER_TIMING_STATE.EXPIRED;
    });
}

// Solicitudes abiertas que todavía no tienen oferta para este conductor.
export function getTripIdsNeedingOffer(pendingTrips, offersByTripId) {
  return pendingTrips
    .filter(isOpenRequest)
    .filter((trip) => !offersByTripId.has(trip.id))
    .map((trip) => trip.id);
}

// Ofertas vencidas de solicitudes abiertas cuyo rechazo automático hay que
// persistir.
export function getTripIdsToAutoReject(
  pendingTrips,
  offersByTripId,
  now = Date.now()
) {
  return pendingTrips
    .filter(isOpenRequest)
    .filter((trip) => shouldAutoRejectOffer(offersByTripId.get(trip.id), now))
    .map((trip) => trip.id);
}
