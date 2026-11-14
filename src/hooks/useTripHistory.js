// AI-assisted: see docs/AI_LOG.md #40
// Historial paginado con filtros. Cambiar un filtro reinicia la lista; las
// respuestas de una consulta anterior se descartan (secuencia), y "cargar
// más" no duplica viajes (mergeTripPages).
import { useCallback, useEffect, useRef, useState } from 'react';

import { fetchTripHistoryPage, HISTORY_SOURCE } from '../services/tripHistoryService';
import { mergeTripPages } from '../utils/tripHistoryLogic';

function getHistoryErrorMessage(error) {
  if (error?.code === 'permission-denied') {
    return 'No tienes permiso para consultar este historial.';
  }
  if (error?.code === 'unavailable' || error?.code === 'deadline-exceeded') {
    return 'Sin conexión con el servidor. Revisa tu conexión e inténtalo de nuevo.';
  }
  // Errores de validación de filtros (mensajes en español de la lógica).
  if (error instanceof Error && !error.code && error.message) {
    return error.message;
  }
  return 'No se pudo cargar el historial. Inténtalo de nuevo.';
}

function filtersKey(filters) {
  return JSON.stringify({
    period: filters.period,
    paymentMethod: filters.paymentMethod,
    rangeStart: filters.rangeStart ? filters.rangeStart.toISOString().slice(0, 10) : null,
    rangeEnd: filters.rangeEnd ? filters.rangeEnd.toISOString().slice(0, 10) : null,
  });
}

export default function useTripHistory(uid, filters) {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [hasMore, setHasMore] = useState(false);
  const [source, setSource] = useState(null);

  const cursorRef = useRef(null);
  const sequenceRef = useRef(0);
  const loadingMoreRef = useRef(false);
  const filtersRef = useRef(filters);
  filtersRef.current = filters;

  const key = filtersKey(filters);

  const reload = useCallback(async () => {
    if (!uid) return;

    const sequence = ++sequenceRef.current;
    cursorRef.current = null;
    loadingMoreRef.current = false;
    setLoading(true);
    setLoadingMore(false);
    setError('');

    try {
      const page = await fetchTripHistoryPage(uid, filtersRef.current);
      if (sequence !== sequenceRef.current) return;
      setTrips(page.trips);
      cursorRef.current = page.cursor;
      setHasMore(page.hasMore);
      setSource(page.source);
    } catch (loadError) {
      if (sequence !== sequenceRef.current) return;
      console.error('Error al cargar el historial:', loadError);
      setTrips([]);
      setHasMore(false);
      setError(getHistoryErrorMessage(loadError));
    } finally {
      if (sequence === sequenceRef.current) setLoading(false);
    }
    // key resume los filtros; filtersRef evita depender del objeto.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid, key]);

  useEffect(() => {
    reload();
  }, [reload]);

  const loadMore = useCallback(async () => {
    if (!uid || loading || !hasMore || !cursorRef.current || loadingMoreRef.current) return;

    const sequence = sequenceRef.current;
    loadingMoreRef.current = true;
    setLoadingMore(true);

    try {
      const page = await fetchTripHistoryPage(uid, filtersRef.current, { cursor: cursorRef.current });
      if (sequence !== sequenceRef.current) return;
      setTrips((current) => mergeTripPages(current, page.trips));
      cursorRef.current = page.cursor;
      setHasMore(page.hasMore);
      setSource(page.source);
    } catch (loadError) {
      if (sequence !== sequenceRef.current) return;
      console.error('Error al cargar más viajes del historial:', loadError);
      setError(getHistoryErrorMessage(loadError));
    } finally {
      if (sequence === sequenceRef.current) {
        loadingMoreRef.current = false;
        setLoadingMore(false);
      }
    }
  }, [uid, loading, hasMore]);

  return {
    trips,
    loading,
    loadingMore,
    error,
    hasMore,
    usingFallback: source === HISTORY_SOURCE.FALLBACK,
    reload,
    loadMore,
  };
}
