// AI-assisted: see docs/AI_LOG.md #40
// Historial de carreras del conductor (guía, sección 6): consulta ordenada
// por fecha, paginada y con los filtros aplicados en Firestore.
//
// Consulta principal (requiere los índices compuestos de
// firestore.indexes.json):
//   trips where driverId == uid, status in [completed, paid, cancelled],
//   [paymentMethod == x], [createdAt >= inicio, createdAt < fin]
//   orderBy createdAt desc, startAfter(cursor), limit(20)
// Cumple la regla de lectura del historial (viajes finalizados propios,
// limit <= 50) y no necesita cambiar firestore.rules.
//
// Respaldo: si Firestore responde failed-precondition (índice aún no
// desplegado), se leen TODOS los viajes finalizados con la consulta que ya
// funciona (driverId + status, páginas de 50 con cursor, sin índices nuevos)
// y se filtran y ordenan en la app. El historial sigue funcionando y con el
// orden correcto mientras el índice se publica.
import {
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  startAfter,
  where,
} from 'firebase/firestore';

import { db } from '../config/firebase';
import { fetchAllPages } from './firestorePagination';
import {
  DEFAULT_HISTORY_FILTERS,
  filterAndSortTrips,
  FINISHED_TRIP_STATUSES,
  getPeriodBounds,
  isValidPaymentFilter,
} from '../utils/tripHistoryLogic';

export const HISTORY_PAGE_SIZE = 20;
// Máximo por consulta que permite la regla del historial.
export const HISTORY_MAX_QUERY_LIMIT = 50;

export const HISTORY_SOURCE = Object.freeze({
  INDEXED: 'indexed',
  FALLBACK: 'fallback',
});

function toTrip(tripDocument) {
  return { id: tripDocument.id, ...tripDocument.data() };
}

export function isMissingIndexError(error) {
  return error?.code === 'failed-precondition';
}

function requireDriverId(driverId) {
  if (typeof driverId !== 'string' || !driverId.trim()) {
    throw new Error('ID del conductor es obligatorio');
  }
}

function clampPageSize(pageSize) {
  return Math.min(Math.max(Math.trunc(Number(pageSize)) || 1, 1), HISTORY_MAX_QUERY_LIMIT);
}

export function buildOrderedHistoryQuery(database, driverId, { start, end, paymentMethod }, cursor, pageSize) {
  const constraints = [
    where('driverId', '==', driverId),
    where('status', 'in', [...FINISHED_TRIP_STATUSES]),
  ];

  if (paymentMethod && paymentMethod !== 'all') {
    constraints.push(where('paymentMethod', '==', paymentMethod));
  }
  if (start) constraints.push(where('createdAt', '>=', start));
  if (end) constraints.push(where('createdAt', '<', end));

  constraints.push(orderBy('createdAt', 'desc'));
  if (cursor) constraints.push(startAfter(cursor));
  constraints.push(limit(pageSize));

  return query(collection(database, 'trips'), ...constraints);
}

// Todos los viajes finalizados del conductor, en páginas de 50 (respaldo).
async function fetchAllFinishedTrips(database, driverId) {
  const documents = await fetchAllPages(
    async (cursor) =>
      (
        await getDocs(
          query(
            collection(database, 'trips'),
            where('driverId', '==', driverId),
            where('status', 'in', [...FINISHED_TRIP_STATUSES]),
            ...(cursor ? [startAfter(cursor)] : []),
            limit(HISTORY_MAX_QUERY_LIMIT)
          )
        )
      ).docs,
    HISTORY_MAX_QUERY_LIMIT
  );

  return documents.map(toTrip);
}

/**
 * Una página del historial, del más reciente al más antiguo.
 * @param {string} driverId
 * @param {{period, paymentMethod, rangeStart, rangeEnd}} filters
 * @param {{cursor?: object|null, pageSize?: number, now?: Date, database?}} options
 *   cursor: el que devolvió la página anterior.
 * @returns {Promise<{trips: Array, cursor: object|null, hasMore: boolean, source: string}>}
 */
export async function fetchTripHistoryPage(
  driverId,
  filters = DEFAULT_HISTORY_FILTERS,
  { cursor = null, pageSize = HISTORY_PAGE_SIZE, now = new Date(), database = db } = {}
) {
  requireDriverId(driverId);

  const paymentMethod = filters?.paymentMethod || 'all';
  if (!isValidPaymentFilter(paymentMethod)) {
    throw new Error('Método de pago no válido.');
  }

  // Lanza un error legible si el rango de fechas no es válido.
  const { start, end } = getPeriodBounds(filters, now);
  const size = clampPageSize(pageSize);

  try {
    const snapshot = await getDocs(
      buildOrderedHistoryQuery(database, driverId, { start, end, paymentMethod }, cursor, size)
    );
    const documents = snapshot.docs;
    const hasMore = documents.length === size;

    return {
      trips: documents.map(toTrip),
      cursor: hasMore ? documents[documents.length - 1] : null,
      hasMore,
      source: HISTORY_SOURCE.INDEXED,
    };
  } catch (error) {
    if (!isMissingIndexError(error)) throw error;

    console.warn(
      'Historial: falta el índice compuesto en Firestore; se usa la lectura completa ordenada en la app.',
      error.message
    );

    const allTrips = await fetchAllFinishedTrips(database, driverId);
    return {
      trips: filterAndSortTrips(allTrips, { ...filters, paymentMethod }, now),
      cursor: null,
      hasMore: false,
      source: HISTORY_SOURCE.FALLBACK,
    };
  }
}
