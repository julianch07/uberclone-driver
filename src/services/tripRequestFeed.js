// AI-assisted: see docs/AI_LOG.md #28
// Controlador de las solicitudes de viaje de un conductor. Combina dos
// suscripciones en tiempo real (viajes pendientes y ofertas del conductor),
// crea la oferta de cada solicitud nueva, actualiza la cuenta regresiva cada
// segundo y persiste el rechazo automático de las ofertas vencidas.
//
// No depende de React: las suscripciones, el reloj y las escrituras se
// inyectan, lo que permite probar la limpieza y el temporizador en Node.
// useTripRequests lo usa dentro de un useEffect.
import {
  getTripIdsNeedingOffer,
  getTripIdsToAutoReject,
  selectVisibleTripRequests,
} from '../utils/tripRequestLogic';
import { REJECTION_REASON } from '../utils/tripRequestTimer';

export const FEED_TICK_MS = 1000;

// Si crear una oferta falla (por ejemplo, sin conexión), se reintenta
// pasado este tiempo mientras la solicitud siga pendiente.
export const OFFER_RETRY_MS = 5000;

export const FEED_ERROR_MESSAGE =
  'No se pudieron consultar las solicitudes de viajes.';

export function createTripRequestFeed({
  subscribePendingTrips,
  subscribeOffers,
  createOffer,
  rejectOffer,
  onChange,
  now = () => Date.now(),
  setIntervalFn = setInterval,
  clearIntervalFn = clearInterval,
  tickMs = FEED_TICK_MS,
}) {
  let running = false;
  let unsubscribeTrips = null;
  let unsubscribeOffers = null;
  let interval = null;

  // null hasta recibir el primer resultado de cada suscripción.
  let pendingTrips = null;
  let offers = null;
  let error = '';

  const offerAttempts = new Map();
  const offersInFlight = new Set();
  const rejectionsInFlight = new Set();

  function isReady() {
    return pendingTrips !== null && offers !== null;
  }

  function emit() {
    if (!running) return;

    const loading = !isReady() && !error;

    onChange({
      loading,
      error,
      requests: isReady()
        ? selectVisibleTripRequests(pendingTrips, offers, now())
        : [],
    });
  }

  function ensureOffers() {
    const current = now();

    for (const tripId of getTripIdsNeedingOffer(pendingTrips, offers)) {
      const lastAttempt = offerAttempts.get(tripId);

      if (
        offersInFlight.has(tripId) ||
        (lastAttempt !== undefined && current - lastAttempt < OFFER_RETRY_MS)
      ) {
        continue;
      }

      offersInFlight.add(tripId);
      offerAttempts.set(tripId, current);

      Promise.resolve()
        .then(() => createOffer(tripId))
        .catch((offerError) => {
          console.warn('No se pudo registrar la oferta del viaje:', offerError);
        })
        .finally(() => {
          offersInFlight.delete(tripId);
        });
    }
  }

  function autoRejectExpiredOffers() {
    for (const tripId of getTripIdsToAutoReject(pendingTrips, offers, now())) {
      if (rejectionsInFlight.has(tripId)) continue;

      rejectionsInFlight.add(tripId);

      // Si falla (por ejemplo, la hora del servidor aún no supera el plazo
      // o no hay conexión), se reintenta en el siguiente segundo.
      Promise.resolve()
        .then(() => rejectOffer(tripId, REJECTION_REASON.EXPIRED))
        .catch((rejectError) => {
          console.warn('No se pudo registrar el rechazo automático:', rejectError);
        })
        .finally(() => {
          rejectionsInFlight.delete(tripId);
        });
    }
  }

  function process() {
    if (!running) return;

    if (isReady()) {
      ensureOffers();
      autoRejectExpiredOffers();
    }

    emit();
  }

  function handleError(subscriptionError) {
    if (!running) return;

    console.error('Error en las solicitudes de viaje:', subscriptionError);
    error = FEED_ERROR_MESSAGE;
    emit();
  }

  return {
    // Iniciar dos veces no duplica las suscripciones.
    start() {
      if (running) return;

      running = true;
      pendingTrips = null;
      offers = null;
      error = '';
      emit();

      unsubscribeTrips = subscribePendingTrips((trips) => {
        if (!running) return;
        pendingTrips = trips;
        error = '';
        process();
      }, handleError);

      unsubscribeOffers = subscribeOffers((nextOffers) => {
        if (!running) return;
        offers = nextOffers;
        process();
      }, handleError);

      interval = setIntervalFn(process, tickMs);
    },

    // Detener es idempotente y libera suscripciones e intervalo.
    stop() {
      if (!running) return;

      running = false;

      if (unsubscribeTrips) unsubscribeTrips();
      if (unsubscribeOffers) unsubscribeOffers();
      if (interval !== null) clearIntervalFn(interval);

      unsubscribeTrips = null;
      unsubscribeOffers = null;
      interval = null;
    },

    // Recalcula de inmediato (por ejemplo, al volver del segundo plano).
    refresh() {
      process();
    },

    isRunning() {
      return running;
    },
  };
}
