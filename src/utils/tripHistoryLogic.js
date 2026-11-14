// AI-assisted: see docs/AI_LOG.md #40
// Lógica pura del historial de carreras (guía, sección 6): periodos y
// filtros, fecha de referencia, ordenación, deduplicación y datos que se
// muestran en la lista y en el detalle. No accede a Firestore.
//
// Fecha de referencia del viaje: createdAt (solicitud), que tienen todos los
// viajes. La consulta de Firestore filtra y ordena por ese mismo campo, de
// modo que la app y el servidor usan siempre el mismo criterio.
import { getTripEarnings } from './fareLogic';
import { getTripPaymentLabel } from './cashPaymentLogic';
import { getCategoryLabel, getPaymentMethodLabel, PAYMENT_METHOD } from './tripRequestLogic';
import { timestampToMillis } from './tripRequestTimer';
import { TRIP_STATUS } from './tripLogic';

export const HISTORY_PERIOD = Object.freeze({
  ALL: 'all',
  TODAY: 'today',
  WEEK: 'week',
  MONTH: 'month',
  RANGE: 'range',
});

export const HISTORY_PERIOD_OPTIONS = Object.freeze([
  { value: HISTORY_PERIOD.ALL, label: 'Todos' },
  { value: HISTORY_PERIOD.TODAY, label: 'Hoy' },
  { value: HISTORY_PERIOD.WEEK, label: 'Semana' },
  { value: HISTORY_PERIOD.MONTH, label: 'Mes' },
  { value: HISTORY_PERIOD.RANGE, label: 'Rango' },
]);

// 'all' o uno de los métodos de pago de la app.
export const HISTORY_PAYMENT_OPTIONS = Object.freeze([
  { value: 'all', label: 'Todos los pagos' },
  { value: PAYMENT_METHOD.CASH, label: getPaymentMethodLabel(PAYMENT_METHOD.CASH) },
  { value: PAYMENT_METHOD.MERCADOPAGO, label: getPaymentMethodLabel(PAYMENT_METHOD.MERCADOPAGO) },
  { value: PAYMENT_METHOD.STRIPE, label: getPaymentMethodLabel(PAYMENT_METHOD.STRIPE) },
]);

export const FINISHED_TRIP_STATUSES = Object.freeze([
  TRIP_STATUS.COMPLETED,
  TRIP_STATUS.PAID,
  TRIP_STATUS.CANCELLED,
]);

const STATUS_LABELS = Object.freeze({
  [TRIP_STATUS.COMPLETED]: 'Completado',
  [TRIP_STATUS.PAID]: 'Pagado',
  [TRIP_STATUS.CANCELLED]: 'Cancelado',
});

export const DEFAULT_HISTORY_FILTERS = Object.freeze({
  period: HISTORY_PERIOD.ALL,
  paymentMethod: 'all',
  rangeStart: null,
  rangeEnd: null,
});

function startOfDay(date) {
  const result = new Date(date.getTime());
  result.setHours(0, 0, 0, 0);
  return result;
}

function addDays(date, days) {
  const result = new Date(date.getTime());
  result.setDate(result.getDate() + days);
  return result;
}

function isValidDate(value) {
  return value instanceof Date && Number.isFinite(value.getTime());
}

/**
 * Límites del periodo en hora local del dispositivo: [start, end), con end
 * exclusivo. Semana = lunes a domingo de la semana actual; Mes = mes
 * natural actual; Rango = días completos, ambos incluidos.
 * @returns {{start: Date|null, end: Date|null}}
 * @throws {Error} si el rango no es válido.
 */
export function getPeriodBounds(filters, now = new Date()) {
  const period = filters?.period || HISTORY_PERIOD.ALL;
  const today = startOfDay(now);

  switch (period) {
    case HISTORY_PERIOD.ALL:
      return { start: null, end: null };
    case HISTORY_PERIOD.TODAY:
      return { start: today, end: addDays(today, 1) };
    case HISTORY_PERIOD.WEEK: {
      // getDay(): 0 = domingo. La semana empieza el lunes.
      const daysSinceMonday = (today.getDay() + 6) % 7;
      const monday = addDays(today, -daysSinceMonday);
      return { start: monday, end: addDays(monday, 7) };
    }
    case HISTORY_PERIOD.MONTH: {
      const first = new Date(today.getFullYear(), today.getMonth(), 1);
      const next = new Date(today.getFullYear(), today.getMonth() + 1, 1);
      return { start: first, end: next };
    }
    case HISTORY_PERIOD.RANGE: {
      const { rangeStart, rangeEnd } = filters;
      if (!isValidDate(rangeStart) || !isValidDate(rangeEnd)) {
        throw new Error('Selecciona la fecha inicial y la fecha final.');
      }
      const start = startOfDay(rangeStart);
      const endDay = startOfDay(rangeEnd);
      if (start > endDay) {
        throw new Error('La fecha inicial no puede ser posterior a la final.');
      }
      return { start, end: addDays(endDay, 1) };
    }
    default:
      throw new Error('Periodo no válido.');
  }
}

export function isValidPaymentFilter(paymentMethod) {
  return HISTORY_PAYMENT_OPTIONS.some((option) => option.value === paymentMethod);
}

// Fecha de referencia del viaje (ms) o null si no la tiene.
export function getTripHistoryMillis(trip) {
  return timestampToMillis(trip?.createdAt);
}

// Más reciente primero; empate por ID para un orden estable.
export function compareTripsByDateDesc(a, b) {
  const difference = (getTripHistoryMillis(b) ?? -Infinity) - (getTripHistoryMillis(a) ?? -Infinity);
  if (difference !== 0 && Number.isFinite(difference)) return difference;
  if (getTripHistoryMillis(a) === null && getTripHistoryMillis(b) !== null) return 1;
  if (getTripHistoryMillis(b) === null && getTripHistoryMillis(a) !== null) return -1;
  return String(b.id).localeCompare(String(a.id));
}

/**
 * Filtra en la app (modo de respaldo sin índice): estados finalizados,
 * periodo y método de pago, y ordena del más reciente al más antiguo.
 * Un viaje sin fecha solo aparece sin filtro de periodo.
 */
export function filterAndSortTrips(trips, filters, now = new Date()) {
  const { start, end } = getPeriodBounds(filters, now);
  const paymentMethod = filters?.paymentMethod || 'all';

  return (trips || [])
    .filter((trip) => FINISHED_TRIP_STATUSES.includes(trip?.status))
    .filter((trip) => paymentMethod === 'all' || trip.paymentMethod === paymentMethod)
    .filter((trip) => {
      if (!start) return true;
      const millis = getTripHistoryMillis(trip);
      return millis !== null && millis >= start.getTime() && millis < end.getTime();
    })
    .sort(compareTripsByDateDesc);
}

// Añade una página sin duplicar viajes (por ID), conservando el orden.
export function mergeTripPages(current, incoming) {
  const seen = new Set((current || []).map((trip) => trip.id));
  const merged = [...(current || [])];

  for (const trip of incoming || []) {
    if (!seen.has(trip.id)) {
      seen.add(trip.id);
      merged.push(trip);
    }
  }

  return merged;
}

export function formatHistoryDateTime(millis) {
  if (millis === null || millis === undefined) return 'Fecha no disponible';
  return new Date(millis).toLocaleString('es-CO', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatHistoryDate(date) {
  return isValidDate(date)
    ? date.toLocaleDateString('es-CO', { year: 'numeric', month: 'short', day: 'numeric' })
    : 'Seleccionar';
}

function isFiniteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

// Calificación del pasajero: solo un número de 1 a 5 guardado en el viaje.
export function getRatingLabel(trip) {
  const rating = trip?.rating;
  return isFiniteNumber(rating) && rating >= 1 && rating <= 5
    ? `${rating.toLocaleString('es-CO', { maximumFractionDigits: 1 })} / 5`
    : 'Sin calificación';
}

/**
 * Datos de un elemento de la lista. Los importes salen del desglose
 * guardado al finalizar (getTripEarnings); un viaje cancelado no tiene
 * tarifa cobrada ni ganancia.
 */
export function buildHistoryListItem(trip) {
  const cancelled = trip?.status === TRIP_STATUS.CANCELLED;
  const earnings = getTripEarnings(trip);

  return {
    id: trip.id,
    dateLabel: formatHistoryDateTime(getTripHistoryMillis(trip)),
    pickupAddress: trip.pickup?.address || 'Origen no disponible',
    destinationAddress: trip.destination?.address || 'Destino no disponible',
    categoryLabel: getCategoryLabel(trip.category),
    statusLabel: STATUS_LABELS[trip.status] || String(trip.status || 'Desconocido'),
    cancelled,
    fare: cancelled ? null : earnings.fare,
    driverEarnings: cancelled ? null : earnings.driverEarnings,
    paymentMethodLabel: getPaymentMethodLabel(trip.paymentMethod),
    paymentStatusLabel: getTripPaymentLabel(trip),
  };
}

function formatKm(value) {
  return isFiniteNumber(value) && value >= 0
    ? `${value.toLocaleString('es-CO', { maximumFractionDigits: 1 })} km`
    : 'No disponible';
}

function formatMinutes(value) {
  return isFiniteNumber(value) && value >= 0 ? `${Math.round(value)} min` : 'No disponible';
}

/**
 * Datos del detalle. No se inventa nada: si un dato no existe se muestra
 * "No disponible" (o "Sin calificación").
 */
export function buildTripDetail(trip) {
  const item = buildHistoryListItem(trip);
  const earnings = getTripEarnings(trip);
  const hasBreakdown = !item.cancelled && earnings.source !== 'unavailable';
  const rate = isFiniteNumber(trip.commissionRate) ? trip.commissionRate : null;

  return {
    ...item,
    createdLabel: formatHistoryDateTime(getTripHistoryMillis(trip)),
    finishedLabel: formatHistoryDateTime(
      timestampToMillis(trip.completedAt) ?? timestampToMillis(trip.cancelledAt)
    ),
    finishedTitle: item.cancelled ? 'Cancelado' : 'Finalizado',
    distanceLabel: formatKm(trip.distanceKm),
    durationLabel: formatMinutes(trip.durationMin),
    hasBreakdown,
    fare: hasBreakdown ? earnings.fare : null,
    commission: hasBreakdown ? earnings.commission : null,
    commissionRateLabel: rate !== null ? `${Math.round(rate * 100)} %` : '20 %',
    tip: hasBreakdown ? earnings.tip : null,
    driverEarnings: hasBreakdown ? earnings.driverEarnings : null,
    ratingLabel: getRatingLabel(trip),
    pickup: trip.pickup,
    destination: trip.destination,
  };
}

function isValidCoordinate(point) {
  return (
    point &&
    isFiniteNumber(point.latitude) &&
    isFiniteNumber(point.longitude) &&
    Math.abs(point.latitude) <= 90 &&
    Math.abs(point.longitude) <= 180
  );
}

// Origen y destino para el mapa, o null si faltan coordenadas válidas.
export function getTripRouteEndpoints(trip) {
  if (!isValidCoordinate(trip?.pickup) || !isValidCoordinate(trip?.destination)) {
    return null;
  }
  return {
    pickup: { latitude: trip.pickup.latitude, longitude: trip.pickup.longitude },
    destination: { latitude: trip.destination.latitude, longitude: trip.destination.longitude },
  };
}
