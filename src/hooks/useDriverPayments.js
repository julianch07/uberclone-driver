// AI-assisted: see docs/AI_LOG.md #29
// Hooks de cobros en efectivo y saldo del conductor.
import { useCallback, useEffect, useRef, useState } from 'react';

import {
  registerCashPayment,
  subscribeToDriverBalance,
  subscribeToPendingCashTrips,
} from '../services/tripService';

// Mensajes comprensibles para los errores de Firestore al registrar un cobro.
export function getCashPaymentErrorMessage(error) {
  if (error?.code === 'unavailable' || error?.code === 'deadline-exceeded') {
    return 'Sin conexión con el servidor. Revisa tu conexión e inténtalo de nuevo.';
  }

  if (error?.code === 'permission-denied') {
    return 'No tienes permiso para registrar el cobro de este viaje.';
  }

  return error?.message || 'No fue posible registrar el cobro.';
}

/**
 * Viajes en efectivo finalizados cuyo cobro falta confirmar y manejador para
 * registrarlo. Evita pulsaciones repetidas mientras se procesa.
 */
export function usePendingCashPayments(uid) {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(Boolean(uid));
  const [error, setError] = useState('');
  const [processingId, setProcessingId] = useState(null);
  const [actionError, setActionError] = useState('');
  const [message, setMessage] = useState('');
  const processingRef = useRef(false);

  useEffect(() => {
    if (!uid) {
      setTrips([]);
      setLoading(false);
      return undefined;
    }

    setLoading(true);
    setError('');

    let active = true;

    const unsubscribe = subscribeToPendingCashTrips(
      uid,
      (pendingTrips) => {
        if (!active) return;
        setTrips(pendingTrips);
        setLoading(false);
      },
      () => {
        if (!active) return;
        setError('No se pudieron consultar los cobros pendientes.');
        setLoading(false);
      }
    );

    return () => {
      active = false;
      unsubscribe();
    };
  }, [uid]);

  const confirmCashReceived = useCallback(
    async (tripId) => {
      if (!uid || !tripId || processingRef.current) {
        return false;
      }

      processingRef.current = true;
      setProcessingId(tripId);
      setActionError('');
      setMessage('');

      try {
        const result = await registerCashPayment(tripId, uid);

        setMessage(
          result.alreadyRegistered
            ? 'El cobro de este viaje ya estaba registrado.'
            : 'Cobro en efectivo registrado. La comisión quedó pendiente en tu saldo.'
        );
        return true;
      } catch (registerError) {
        setActionError(getCashPaymentErrorMessage(registerError));
        return false;
      } finally {
        processingRef.current = false;
        setProcessingId(null);
      }
    },
    [uid]
  );

  return {
    trips,
    loading,
    error,
    processingId,
    actionError,
    message,
    confirmCashReceived,
  };
}

/**
 * Saldo del conductor con la plataforma y comisiones por viaje.
 * - summary: totales calculados en el servidor sobre todos los asientos;
 *   null si no se pudieron calcular (nunca un subtotal).
 * - entries: solo los asientos más recientes, para la lista.
 * - hasMoreEntries: true si existen más asientos que los mostrados.
 */
export function useDriverBalance(uid) {
  const [entries, setEntries] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(Boolean(uid));
  const [error, setError] = useState('');

  useEffect(() => {
    if (!uid) {
      setEntries([]);
      setSummary(null);
      setLoading(false);
      return undefined;
    }

    setLoading(true);
    setError('');

    let active = true;

    const unsubscribe = subscribeToDriverBalance(
      uid,
      ({ entries: nextEntries, summary: nextSummary }) => {
        if (!active) return;
        setEntries(nextEntries);
        setSummary(nextSummary);
        setError('');
        setLoading(false);
      },
      () => {
        if (!active) return;
        // Sin totales completos no se muestra ningún saldo.
        setSummary(null);
        setError('No se pudo calcular tu saldo. Revisa tu conexión e inténtalo de nuevo.');
        setLoading(false);
      }
    );

    return () => {
      active = false;
      unsubscribe();
    };
  }, [uid]);

  return {
    entries,
    summary,
    hasMoreEntries: Boolean(summary) && summary.tripCount > entries.length,
    loading,
    error,
  };
}
