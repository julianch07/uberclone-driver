// AI-assisted: see docs/AI_LOG.md #28
// Hook de solicitudes de viaje (guía, sección 3): suscripción en tiempo real,
// temporizador de 15 s, rechazo automático y manejadores de aceptar y
// rechazar con useCallback.
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

import { useDriverContext } from '../context/DriverContext';
import {
  acceptTrip,
  createTripOffer,
  rejectTripOffer,
  subscribeToDriverTripOffers,
  subscribeToPendingTrips,
} from '../services/tripService';
import { createTripRequestFeed } from '../services/tripRequestFeed';
import { REJECTION_REASON } from '../utils/tripRequestTimer';

const IDLE_STATE = Object.freeze({ loading: false, error: '', requests: [] });

// Mensajes comprensibles para los errores de Firestore más habituales.
export function getTripRequestErrorMessage(error, fallback) {
  if (error?.code === 'unavailable' || error?.code === 'deadline-exceeded') {
    return 'Sin conexión con el servidor. Revisa tu conexión e inténtalo de nuevo.';
  }

  if (error?.code === 'permission-denied') {
    return 'La solicitud ya no está disponible o terminó el tiempo para responder.';
  }

  return error?.message || fallback;
}

/**
 * @param {{uid: string, enabled: boolean}} options enabled debe ser false si
 *   el conductor no está conectado, tiene un viaje activo o se está
 *   recuperando su viaje activo.
 */
export default function useTripRequests({ uid, enabled }) {
  const { rememberAcceptedTrip } = useDriverContext();

  const [feedState, setFeedState] = useState(IDLE_STATE);
  const [processing, setProcessing] = useState(null);
  const [actionError, setActionError] = useState('');
  const [message, setMessage] = useState('');

  // Evita pulsaciones repetidas antes de que React vuelva a renderizar.
  const processingRef = useRef(false);
  const requestsRef = useRef([]);

  useEffect(() => {
    if (!enabled || !uid) {
      requestsRef.current = [];
      setFeedState(IDLE_STATE);
      return undefined;
    }

    const feed = createTripRequestFeed({
      subscribePendingTrips: (onData, onError) =>
        subscribeToPendingTrips(onData, onError),
      subscribeOffers: (onData, onError) =>
        subscribeToDriverTripOffers(uid, onData, onError),
      createOffer: (tripId) => createTripOffer(uid, tripId),
      rejectOffer: (tripId, reason) => rejectTripOffer(uid, tripId, reason),
      onChange: (nextState) => {
        requestsRef.current = nextState.requests;
        setFeedState(nextState);
      },
    });

    feed.start();

    // En segundo plano los temporizadores de JavaScript pueden detenerse.
    // Al volver, la cuenta se recalcula desde offeredAt y se registran los
    // rechazos automáticos pendientes.
    const appStateSubscription = AppState.addEventListener(
      'change',
      (nextState) => {
        if (nextState === 'active') {
          feed.refresh();
        }
      }
    );

    return () => {
      appStateSubscription.remove();
      feed.stop();
    };
  }, [enabled, uid]);

  const acceptRequest = useCallback(
    async (tripId) => {
      if (!enabled || !uid || !tripId || processingRef.current) {
        return false;
      }

      const request = requestsRef.current.find((item) => item.id === tripId);

      if (!request?.canAccept) {
        setActionError('Esta solicitud ya no se puede aceptar.');
        return false;
      }

      processingRef.current = true;
      setProcessing({ tripId, action: 'accept' });
      setActionError('');
      setMessage('');

      try {
        await acceptTrip(tripId, uid);

        const saved = await rememberAcceptedTrip(tripId);

        setMessage(
          saved
            ? '¡Viaje aceptado correctamente!'
            : 'Viaje aceptado, pero no se pudo guardar localmente.'
        );
        return true;
      } catch (acceptError) {
        setActionError(
          getTripRequestErrorMessage(
            acceptError,
            'No fue posible aceptar este viaje.'
          )
        );
        return false;
      } finally {
        processingRef.current = false;
        setProcessing(null);
      }
    },
    [enabled, uid, rememberAcceptedTrip]
  );

  const rejectRequest = useCallback(
    async (tripId) => {
      if (!uid || !tripId || processingRef.current) {
        return false;
      }

      processingRef.current = true;
      setProcessing({ tripId, action: 'reject' });
      setActionError('');
      setMessage('');

      try {
        await rejectTripOffer(uid, tripId, REJECTION_REASON.MANUAL);
        setMessage('Solicitud rechazada.');
        return true;
      } catch (rejectError) {
        setActionError(
          getTripRequestErrorMessage(
            rejectError,
            'No fue posible rechazar esta solicitud.'
          )
        );
        return false;
      } finally {
        processingRef.current = false;
        setProcessing(null);
      }
    },
    [uid]
  );

  return {
    requests: feedState.requests,
    loading: feedState.loading,
    error: feedState.error,
    actionError,
    message,
    processing,
    acceptRequest,
    rejectRequest,
  };
}
