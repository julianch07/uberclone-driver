// AI-assisted: see docs/AI_LOG.md #27
// Parámetros de tarifa de la guía (sección 5), en pesos colombianos enteros.
// Valores didácticos, no tarifas reales.
//
// IMPORTANTE: firestore.rules replica estos valores en calculatedTripFare()
// y validCompletionFareBreakdown() para impedir que el conductor altere la
// tarifa al finalizar un viaje. Si se cambia un valor aquí, debe cambiarse
// también allí; las pruebas de reglas comparan ambos cálculos.

export const CURRENCY = 'COP';

export const BASE_FARE = 3500;
export const PRICE_PER_KM = 1200;
export const PRICE_PER_MINUTE = 250;
export const MINIMUM_FARE = 6000;

// La tarifa se redondea al múltiplo de 100 COP más cercano (las mitades
// hacia arriba) antes de calcular la comisión.
export const FARE_ROUNDING_STEP = 100;

// Categorías canónicas (modelo de datos de la guía) y sus multiplicadores
// expresados en porcentaje entero: 1,0 / 1,4 / 1,8. Usar enteros evita
// errores de coma flotante en el redondeo.
export const TRIP_CATEGORY = Object.freeze({
  ECONOMY: 'economy',
  XL: 'xl',
  PREMIUM: 'premium',
});

export const CATEGORY_MULTIPLIER_PERCENT = Object.freeze({
  [TRIP_CATEGORY.ECONOMY]: 100,
  [TRIP_CATEGORY.XL]: 140,
  [TRIP_CATEGORY.PREMIUM]: 180,
});

// Valores aceptados en el campo `category` de un viaje: los canónicos y
// las etiquetas que usa el registro del conductor. No se normalizan
// mayúsculas ni tildes para que el conjunto coincida exactamente con
// firestore.rules.
export const CATEGORY_ALIASES = Object.freeze({
  economy: TRIP_CATEGORY.ECONOMY,
  xl: TRIP_CATEGORY.XL,
  premium: TRIP_CATEGORY.PREMIUM,
  'Económico': TRIP_CATEGORY.ECONOMY,
  XL: TRIP_CATEGORY.XL,
  Premium: TRIP_CATEGORY.PREMIUM,
});

// Comisión de la plataforma: 20 % de la tarifa, sin incluir la propina.
export const COMMISSION_RATE_PERCENT = 20;
export const COMMISSION_RATE = COMMISSION_RATE_PERCENT / 100;

// La propina va completa al conductor.
export const TIP_DRIVER_SHARE_PERCENT = 100;

// Límites de validez de los datos de recorrido. Excluyen valores absurdos
// (e Infinity) y son los mismos que verifica firestore.rules.
export const MAX_DISTANCE_KM = 1000;
export const MAX_DURATION_MIN = 1440;
