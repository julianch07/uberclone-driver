// AI-assisted: see docs/AI_LOG.md #37
// Cobros con Mercado Pago pendientes del conductor: lista en tiempo real,
// apertura del checkout y seguimiento del resultado que confirma el backend.
import { useCallback, useEffect, useRef, useState } from 'react';

import {
  openGatewayCheckout,
  requestGatewayCheckout,
  subscribeToGatewayTrip,
  subscribeToPendingGatewayTrips,
} from '../services/gatewayPaymentService';
import {
  getGatewayErrorMessage,
  getGatewayStatusInfo,
  isGatewayPaymentApproved,
} from '../utils/gatewayPaymentLogic';

export function usePendingGatewayPayments(uid) {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(Boolean(uid));
  const [error, setError] = useState('');
  const [processingId, setProcessingId] = useState(null);
  const [actionError, setActionError] = useState('');
  // Viaje cuyo checkout se abrió: se sigue hasta que el backend confirme.
  const [watchedTrip, setWatchedTrip] = useState(null);
  const [watchedTripId, setWatchedTripId] = useState(null);

  const processingRef = useRef(false);
  const tripsRef = useRef([]);

  useEffect(() => {
    if (!uid) {
      setTrips([]);
      setLoading(false);
      return undefined;
    }

    setLoading(true);
    setError('');

    const unsubscribe = subscribeToPendingGatewayTrips(
      uid,
      (nextTrips) => {
        tripsRef.current = nextTrips;
        setTrips(nextTrips);
        setLoading(false);
      },
      () => {
        setError('No se pudieron consultar los cobros con Mercado Pago.');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [uid]);

  // Resultado del cobro en tiempo real (guía, sección 4, paso 6).
  useEffect(() => {
    if (!watchedTripId) {
      setWatchedTrip(null);
      return undefined;
    }

    const unsubscribe = subscribeToGatewayTrip(watchedTripId, setWatchedTrip);
    return () => unsubscribe();
  }, [watchedTripId]);

  const startCheckout = useCallback(
    async (tripId) => {
      if (!uid || !tripId || processingRef.current) return false;

      const trip = tripsRef.current.find((item) => item.id === tripId);
      if (!trip) {
        setActionError('Este viaje ya no tiene un cobro pendiente.');
        return false;
      }

      processingRef.current = true;
      setProcessingId(tripId);
      setActionError('');

      try {
        const { checkoutUrl } = await requestGatewayCheckout(trip, uid);
        setWatchedTripId(tripId);
        await openGatewayCheckout(checkoutUrl);
        return true;
      } catch (checkoutError) {
        setActionError(getGatewayErrorMessage(checkoutError));
        return false;
      } finally {
        processingRef.current = false;
        setProcessingId(null);
      }
    },
    [uid]
  );

  const dismissResult = useCallback(() => setWatchedTripId(null), []);

  return {
    trips,
    loading,
    error,
    processingId,
    actionError,
    startCheckout,
    watchedTrip,
    watchedStatus: watchedTrip ? getGatewayStatusInfo(watchedTrip) : null,
    watchedApproved: isGatewayPaymentApproved(watchedTrip),
    dismissResult,
  };
}
