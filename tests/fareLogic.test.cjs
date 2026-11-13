// AI-assisted: see docs/AI_LOG.md #27
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { loadModule } = require('./helpers/loadModule.cjs');

const {
  calculateFare,
  calculateCommission,
  calculateFareBreakdown,
  buildCompletionBreakdown,
  getTripEarnings,
  hasPricingInputs,
  normalizeCategory,
  FARE_SOURCE,
} = loadModule('src/utils/fareLogic.js');

const pricing = loadModule('src/config/pricing.js');

// Ejemplo de la guía (sección 5): 8,5 km y 22 minutos, sin propina.
const GUIDE_TRIP = { distanceKm: 8.5, durationMin: 22 };

test('La configuración contiene los valores de la guía', () => {
  assert.equal(pricing.BASE_FARE, 3500);
  assert.equal(pricing.PRICE_PER_KM, 1200);
  assert.equal(pricing.PRICE_PER_MINUTE, 250);
  assert.equal(pricing.MINIMUM_FARE, 6000);
  assert.equal(pricing.FARE_ROUNDING_STEP, 100);
  assert.deepEqual({ ...pricing.CATEGORY_MULTIPLIER_PERCENT }, {
    economy: 100,
    xl: 140,
    premium: 180,
  });
  assert.equal(pricing.COMMISSION_RATE, 0.2);
  assert.equal(pricing.TIP_DRIVER_SHARE_PERCENT, 100);
});

test('Ejemplo de la guía: Económico 19.200 / 3.840 / 15.360', () => {
  const result = calculateFare({ ...GUIDE_TRIP, category: 'economy' });

  assert.equal(result.breakdown.subtotal, 19200);
  assert.equal(result.fare, 19200);
  assert.equal(result.commission, 3840);
  assert.equal(result.driverEarnings, 15360);
  assert.equal(result.commissionRate, 0.2);
  assert.equal(result.tip, 0);
  assert.equal(result.currency, 'COP');
});

test('Ejemplo de la guía: XL 26.880 se redondea a 26.900 / 5.380 / 21.520', () => {
  const result = calculateFare({ ...GUIDE_TRIP, category: 'xl' });

  assert.equal(result.fare, 26900);
  assert.equal(result.commission, 5380);
  assert.equal(result.driverEarnings, 21520);
  assert.equal(result.breakdown.multiplier, 1.4);
});

test('Premium aplica el multiplicador 1,8 (34.560 → 34.600)', () => {
  const result = calculateFare({ ...GUIDE_TRIP, category: 'premium' });

  assert.equal(result.fare, 34600);
  assert.equal(result.commission, 6920);
  assert.equal(result.driverEarnings, 27680);
});

test('Distancia y duración cero: tarifa base con mínimo de 6.000 COP', () => {
  const zero = { distanceKm: 0, durationMin: 0 };

  const economy = calculateFare({ ...zero, category: 'economy' });
  assert.equal(economy.breakdown.subtotal, 3500);
  assert.equal(economy.fare, 6000);
  assert.equal(economy.breakdown.minimumFareApplied, true);

  // 3.500 × 1,4 = 4.900 → mínimo 6.000.
  assert.equal(calculateFare({ ...zero, category: 'xl' }).fare, 6000);

  // 3.500 × 1,8 = 6.300: supera el mínimo.
  const premium = calculateFare({ ...zero, category: 'premium' });
  assert.equal(premium.fare, 6300);
  assert.equal(premium.breakdown.minimumFareApplied, false);
});

test('Tarifa mínima en viajes cortos', () => {
  // 3.500 + 1.200 + 250 = 4.950 → mínimo 6.000.
  const result = calculateFare({ distanceKm: 1, durationMin: 1, category: 'economy' });

  assert.equal(result.breakdown.subtotal, 4950);
  assert.equal(result.fare, 6000);
  assert.equal(result.commission, 1200);
  assert.equal(result.driverEarnings, 4800);
});

test('Redondeo al múltiplo de 100 más cercano, mitades hacia arriba', () => {
  // 3.500 + 12.048 = 15.548 → 15.500 (hacia abajo).
  const down = calculateFare({ distanceKm: 10.04, durationMin: 0, category: 'economy' });
  assert.equal(down.breakdown.subtotal, 15548);
  assert.equal(down.fare, 15500);

  // 3.500 + 12.060 = 15.560 → 15.600 (hacia arriba).
  const up = calculateFare({ distanceKm: 10.05, durationMin: 0, category: 'economy' });
  assert.equal(up.breakdown.subtotal, 15560);
  assert.equal(up.fare, 15600);

  // 3.500 + 1.200 + 50 = 4.750 × 1,4 = 6.650 exacto → 6.700.
  const half = calculateFare({ distanceKm: 1, durationMin: 0.2, category: 'xl' });
  assert.equal(half.breakdown.subtotal, 4750);
  assert.equal(half.fare, 6700);
});

test('Los montos son enteros aunque la distancia tenga decimales', () => {
  for (const distanceKm of [0.1, 2.3, 3.33, 7.77, 12.345, 99.99]) {
    for (const category of ['economy', 'xl', 'premium']) {
      const result = calculateFare({ distanceKm, durationMin: 13.7, category });

      assert.ok(Number.isInteger(result.fare));
      assert.equal(result.fare % 100, 0);
      assert.ok(Number.isInteger(result.commission));
      assert.ok(Number.isInteger(result.driverEarnings));
      assert.equal(result.fare - result.commission + result.tip, result.driverEarnings);
    }
  }
});

test('La comisión es el 20 % de la tarifa y excluye la propina', () => {
  const result = calculateFare({ ...GUIDE_TRIP, category: 'economy', tip: 2000 });

  assert.equal(result.fare, 19200);
  assert.equal(result.commission, 3840);
  assert.equal(result.commission, calculateCommission(result.fare));
  assert.equal(result.total, 21200);
});

test('La propina va completa al conductor', () => {
  const withTip = calculateFare({ ...GUIDE_TRIP, category: 'xl', tip: 3000 });
  const withoutTip = calculateFare({ ...GUIDE_TRIP, category: 'xl' });

  assert.equal(withTip.tip, 3000);
  assert.equal(withTip.driverEarnings - withoutTip.driverEarnings, 3000);
  assert.equal(withTip.driverEarnings, 24520);
});

test('Acepta las etiquetas de categoría del registro', () => {
  assert.equal(normalizeCategory('Económico'), 'economy');
  assert.equal(normalizeCategory('XL'), 'xl');
  assert.equal(normalizeCategory('Premium'), 'premium');
  assert.equal(
    calculateFare({ ...GUIDE_TRIP, category: 'XL' }).fare,
    calculateFare({ ...GUIDE_TRIP, category: 'xl' }).fare
  );
  // Sin normalizaciones adicionales: el conjunto coincide con firestore.rules.
  assert.equal(normalizeCategory('ECONOMY'), null);
  assert.equal(normalizeCategory('Economico'), null);
  assert.equal(normalizeCategory(undefined), null);
});

test('Rechaza entradas inválidas', () => {
  const valid = { ...GUIDE_TRIP, category: 'economy' };
  const invalid = [
    [{ ...valid, distanceKm: -1 }, RangeError],
    [{ ...valid, distanceKm: Number.NaN }, RangeError],
    [{ ...valid, distanceKm: Number.POSITIVE_INFINITY }, RangeError],
    [{ ...valid, distanceKm: '8.5' }, RangeError],
    [{ ...valid, distanceKm: 1000.1 }, RangeError],
    [{ ...valid, durationMin: -0.5 }, RangeError],
    [{ ...valid, durationMin: null }, RangeError],
    [{ ...valid, durationMin: 1441 }, RangeError],
    [{ ...valid, category: 'moto' }, TypeError],
    [{ ...valid, category: '' }, TypeError],
    [{ ...valid, tip: -100 }, RangeError],
    [{ ...valid, tip: 500.5 }, RangeError],
    [{ ...valid, tip: '1000' }, RangeError],
  ];

  for (const [input, errorType] of invalid) {
    assert.throws(() => calculateFare(input), errorType, JSON.stringify(input));
  }

  assert.throws(() => calculateFare(), RangeError);
});

test('hasPricingInputs exige distancia, duración y categoría válidas', () => {
  assert.equal(hasPricingInputs({ ...GUIDE_TRIP, category: 'xl' }), true);
  assert.equal(hasPricingInputs({ distanceKm: 0, durationMin: 0, category: 'Premium' }), true);
  assert.equal(hasPricingInputs({ estimatedFare: 15000 }), false);
  assert.equal(hasPricingInputs({ ...GUIDE_TRIP }), false);
  assert.equal(hasPricingInputs({ ...GUIDE_TRIP, category: 'moto' }), false);
  assert.equal(hasPricingInputs({ distanceKm: 8.5, category: 'xl' }), false);
  assert.equal(hasPricingInputs(null), false);
});

test('Desglose al finalizar: viaje con datos de recorrido', () => {
  const breakdown = buildCompletionBreakdown({
    ...GUIDE_TRIP,
    category: 'xl',
    tip: 1000,
    estimatedFare: 26900,
  });

  assert.deepEqual(breakdown, {
    fare: 26900,
    commission: 5380,
    commissionRate: 0.2,
    driverEarnings: 22520,
    tip: 1000,
    fareSource: FARE_SOURCE.CALCULATED,
  });
});

test('Compatibilidad: viaje antiguo sin datos de recorrido usa estimatedFare', () => {
  const breakdown = buildCompletionBreakdown({ estimatedFare: 15000 });

  assert.deepEqual(breakdown, {
    fare: 15000,
    commission: 3000,
    commissionRate: 0.2,
    driverEarnings: 12000,
    tip: 0,
    fareSource: FARE_SOURCE.ESTIMATED,
  });

  // estimatedFare no se redondea ni se ajusta al mínimo: es lo que se ofreció.
  assert.equal(buildCompletionBreakdown({ estimatedFare: 4250 }).fare, 4250);
  // Datos de recorrido incompletos: no se inventa la parte que falta.
  assert.equal(
    buildCompletionBreakdown({ distanceKm: 8.5, estimatedFare: 15000 }).fareSource,
    FARE_SOURCE.ESTIMATED
  );
  // Propina presente en un viaje sin datos de recorrido.
  assert.equal(
    buildCompletionBreakdown({ estimatedFare: 15000, tip: 500 }).driverEarnings,
    12500
  );
});

test('Desglose al finalizar: rechaza datos que no permiten calcular', () => {
  assert.throws(() => buildCompletionBreakdown({}), /datos suficientes/);
  assert.throws(() => buildCompletionBreakdown({ estimatedFare: -1 }), /datos suficientes/);
  assert.throws(
    () => buildCompletionBreakdown({ estimatedFare: 15000, tip: -5 }),
    /propina/
  );
  assert.throws(
    () => buildCompletionBreakdown({ ...GUIDE_TRIP, category: 'xl', tip: 10.5 }),
    /propina/
  );
  // tip null equivale a sin propina.
  assert.equal(buildCompletionBreakdown({ estimatedFare: 15000, tip: null }).tip, 0);
});

test('Ganancias de un viaje: desglose guardado, viaje antiguo y sin datos', () => {
  assert.deepEqual(
    getTripEarnings({
      fare: 26900,
      commission: 5380,
      driverEarnings: 22520,
      tip: 1000,
      fareSource: 'calculated',
      estimatedFare: 20000,
    }),
    { fare: 26900, commission: 5380, driverEarnings: 22520, tip: 1000, source: 'calculated' }
  );

  assert.deepEqual(getTripEarnings({ estimatedFare: 15000 }), {
    fare: 15000,
    commission: 3000,
    driverEarnings: 12000,
    tip: 0,
    source: 'legacy',
  });

  assert.deepEqual(getTripEarnings({}), {
    fare: 0,
    commission: 0,
    driverEarnings: 0,
    tip: 0,
    source: 'unavailable',
  });
});

test('calculateFareBreakdown conserva su resultado anterior', () => {
  assert.deepEqual(calculateFareBreakdown(20000), {
    totalFare: 20000,
    uberCloneCommission: 4000,
    driverEarnings: 16000,
    currency: 'COP',
  });
});
