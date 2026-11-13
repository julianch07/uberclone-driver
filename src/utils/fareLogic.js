// AI-assisted: see docs/AI_LOG.md #22
// AI-assisted: see docs/AI_LOG.md #27
// Fare logic for UberClone Driver.
// calculateFare() is the single pure function used to estimate a trip and to
// close it (guide, section 5). firestore.rules mirrors the same formula.
import {
  BASE_FARE,
  CATEGORY_ALIASES,
  CATEGORY_MULTIPLIER_PERCENT,
  COMMISSION_RATE,
  COMMISSION_RATE_PERCENT,
  CURRENCY,
  FARE_ROUNDING_STEP,
  MAX_DISTANCE_KM,
  MAX_DURATION_MIN,
  MINIMUM_FARE,
  PRICE_PER_KM,
  PRICE_PER_MINUTE,
  TIP_DRIVER_SHARE_PERCENT,
} from '../config/pricing';

// Se conserva por compatibilidad con el código anterior (#22).
export const COMMISSIONS = {
  UBERCLONE: COMMISSION_RATE,
  DRIVER: 1 - COMMISSION_RATE,
};

// AI-assisted: see docs/AI_LOG.md #27
// Origen de la tarifa guardada al finalizar un viaje.
export const FARE_SOURCE = Object.freeze({
  // Calculada con calculateFare() a partir de distanceKm, durationMin y
  // category del documento del viaje.
  CALCULATED: 'calculated',
  // Viaje sin datos de recorrido verificados: se conserva estimatedFare.
  ESTIMATED: 'estimated',
});

// Redondeo "mitad hacia arriba" a un entero, idéntico en firestore.rules
// (math.floor(x + 0.5)). Solo se usa con valores no negativos.
function roundHalfUp(value) {
  return Math.floor(value + 0.5);
}

function isNonNegativeNumberUpTo(value, max) {
  return (
    typeof value === 'number' &&
    Number.isFinite(value) &&
    value >= 0 &&
    value <= max
  );
}

function isValidTip(tip) {
  return Number.isInteger(tip) && tip >= 0;
}

/**
 * Devuelve la categoría canónica ('economy', 'xl' o 'premium') o null.
 * @param {string} category Valor del campo category del viaje.
 * @returns {string|null}
 */
export function normalizeCategory(category) {
  if (typeof category !== 'string') {
    return null;
  }

  return Object.prototype.hasOwnProperty.call(CATEGORY_ALIASES, category)
    ? CATEGORY_ALIASES[category]
    : null;
}

/**
 * Comisión de la plataforma sobre una tarifa (sin propina), en COP enteros.
 * @param {number} fare Tarifa en COP.
 * @returns {number}
 */
export function calculateCommission(fare) {
  return roundHalfUp((fare * COMMISSION_RATE_PERCENT) / 100);
}

/**
 * Calcula la tarifa de un viaje (guía, sección 5).
 *
 * tarifa = redondeo a 100 COP de
 *          (base + km × precio/km + min × precio/min) × multiplicador,
 *          con un mínimo de MINIMUM_FARE.
 * comisión = 20 % de la tarifa (la propina no paga comisión).
 * ganancia neta = tarifa − comisión + propina completa.
 *
 * @param {{distanceKm: number, durationMin: number, category: string, tip?: number}} input
 * @returns {{
 *   fare: number, commission: number, commissionRate: number,
 *   tip: number, driverEarnings: number, total: number,
 *   category: string, currency: string,
 *   breakdown: {
 *     baseFare: number, distanceCost: number, timeCost: number,
 *     subtotal: number, multiplier: number, minimumFareApplied: boolean
 *   }
 * }}
 * @throws {TypeError|RangeError} Si algún parámetro no es válido.
 */
export function calculateFare({ distanceKm, durationMin, category, tip = 0 } = {}) {
  if (!isNonNegativeNumberUpTo(distanceKm, MAX_DISTANCE_KM)) {
    throw new RangeError(
      `La distancia debe ser un número entre 0 y ${MAX_DISTANCE_KM} km.`
    );
  }

  if (!isNonNegativeNumberUpTo(durationMin, MAX_DURATION_MIN)) {
    throw new RangeError(
      `La duración debe ser un número entre 0 y ${MAX_DURATION_MIN} minutos.`
    );
  }

  const normalizedCategory = normalizeCategory(category);

  if (!normalizedCategory) {
    throw new TypeError('La categoría del viaje no es válida.');
  }

  if (!isValidTip(tip)) {
    throw new RangeError(
      'La propina debe ser un número entero de pesos mayor o igual a 0.'
    );
  }

  const distanceCost = roundHalfUp(distanceKm * PRICE_PER_KM);
  const timeCost = roundHalfUp(durationMin * PRICE_PER_MINUTE);
  const subtotal = BASE_FARE + distanceCost + timeCost;
  const multiplierPercent = CATEGORY_MULTIPLIER_PERCENT[normalizedCategory];

  // subtotal × multiplicador en centésimas de peso (entero exacto) y
  // redondeo al múltiplo de FARE_ROUNDING_STEP más cercano.
  const scaledFare = subtotal * multiplierPercent;
  const scaledStep = FARE_ROUNDING_STEP * 100;
  const roundedFare =
    Math.floor((scaledFare + scaledStep / 2) / scaledStep) *
    FARE_ROUNDING_STEP;

  const fare = Math.max(roundedFare, MINIMUM_FARE);
  const commission = calculateCommission(fare);
  const driverTip = (tip * TIP_DRIVER_SHARE_PERCENT) / 100;

  return {
    fare,
    commission,
    commissionRate: COMMISSION_RATE,
    tip,
    driverEarnings: fare - commission + driverTip,
    total: fare + tip,
    category: normalizedCategory,
    currency: CURRENCY,
    breakdown: {
      baseFare: BASE_FARE,
      distanceCost,
      timeCost,
      subtotal,
      multiplier: multiplierPercent / 100,
      minimumFareApplied: roundedFare < MINIMUM_FARE,
    },
  };
}

/**
 * Indica si el viaje tiene datos de recorrido válidos para calcular la
 * tarifa. Las mismas condiciones se verifican en firestore.rules
 * (hasPricingInputs).
 * @param {object} trip Documento del viaje.
 * @returns {boolean}
 */
export function hasPricingInputs(trip) {
  return Boolean(
    trip &&
      isNonNegativeNumberUpTo(trip.distanceKm, MAX_DISTANCE_KM) &&
      isNonNegativeNumberUpTo(trip.durationMin, MAX_DURATION_MIN) &&
      normalizeCategory(trip.category)
  );
}

/**
 * Desglose que se guarda al finalizar un viaje.
 *
 * - Con distanceKm, durationMin y category válidos: calculateFare().
 * - Sin esos datos (viajes anteriores a este módulo): la tarifa es
 *   estimatedFare, sin recalcular ni inventar recorridos.
 * La propina se toma del documento del viaje (0 si no existe); el
 * conductor no puede fijarla.
 *
 * @param {object} trip Documento del viaje en estado in_progress.
 * @returns {{fare: number, commission: number, commissionRate: number,
 *   driverEarnings: number, tip: number, fareSource: string}}
 * @throws {Error} Si el viaje no permite calcular una tarifa válida.
 */
export function buildCompletionBreakdown(trip) {
  const tip = trip?.tip == null ? 0 : trip.tip;

  if (!isValidTip(tip)) {
    throw new Error(
      'La propina registrada en el viaje no es válida; no se puede finalizar.'
    );
  }

  if (hasPricingInputs(trip)) {
    const result = calculateFare({
      distanceKm: trip.distanceKm,
      durationMin: trip.durationMin,
      category: trip.category,
      tip,
    });

    return {
      fare: result.fare,
      commission: result.commission,
      commissionRate: result.commissionRate,
      driverEarnings: result.driverEarnings,
      tip,
      fareSource: FARE_SOURCE.CALCULATED,
    };
  }

  const estimatedFare = trip?.estimatedFare;

  if (
    typeof estimatedFare !== 'number' ||
    !Number.isFinite(estimatedFare) ||
    estimatedFare < 0
  ) {
    throw new Error(
      'El viaje no tiene datos suficientes para calcular la tarifa.'
    );
  }

  const commission = calculateCommission(estimatedFare);

  return {
    fare: estimatedFare,
    commission,
    commissionRate: COMMISSION_RATE,
    driverEarnings:
      estimatedFare - commission + (tip * TIP_DRIVER_SHARE_PERCENT) / 100,
    tip,
    fareSource: FARE_SOURCE.ESTIMATED,
  };
}

function isFiniteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

/**
 * Ganancias de un viaje para las pantallas de ganancias e historial.
 *
 * - Si el viaje guardó su desglose al finalizar, se usa tal cual.
 * - Si es un viaje anterior a este módulo (solo estimatedFare), se calcula
 *   la comisión vigente sobre estimatedFare, sin propina (source 'legacy').
 *
 * @param {object} trip Documento del viaje.
 * @returns {{fare: number, commission: number, driverEarnings: number,
 *   tip: number, source: string}}
 */
export function getTripEarnings(trip) {
  if (
    trip &&
    isFiniteNumber(trip.fare) &&
    isFiniteNumber(trip.commission) &&
    isFiniteNumber(trip.driverEarnings)
  ) {
    return {
      fare: trip.fare,
      commission: trip.commission,
      driverEarnings: trip.driverEarnings,
      tip: isFiniteNumber(trip.tip) ? trip.tip : 0,
      source: trip.fareSource || 'stored',
    };
  }

  if (trip && isFiniteNumber(trip.estimatedFare) && trip.estimatedFare >= 0) {
    const commission = calculateCommission(trip.estimatedFare);

    return {
      fare: trip.estimatedFare,
      commission,
      driverEarnings: trip.estimatedFare - commission,
      tip: 0,
      source: 'legacy',
    };
  }

  return {
    fare: 0,
    commission: 0,
    driverEarnings: 0,
    tip: 0,
    source: 'unavailable',
  };
}

/**
 * Calculates the breakdown of a fare.
 * Se conserva por compatibilidad (#22); usa la misma comisión que
 * calculateFare().
 * @param {number} totalFare Total fare in COP.
 * @returns {object} Breakdown of the fare.
 */
export function calculateFareBreakdown(totalFare) {
  const uberCloneCommission = calculateCommission(totalFare);
  const driverEarnings = totalFare - uberCloneCommission;

  return {
    totalFare,
    uberCloneCommission,
    driverEarnings,
    currency: CURRENCY,
  };
}

/**
 * Formats a currency value to COP.
 * @param {number} value Value to format.
 * @returns {string} Formatted currency string.
 */
export function formatCurrency(value) {
  if (typeof value !== 'number') return '$0';
  return `$${Math.round(value).toLocaleString('es-CO')}`;
}
