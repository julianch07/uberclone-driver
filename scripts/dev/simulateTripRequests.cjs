#!/usr/bin/env node
// AI-assisted: see docs/AI_LOG.md #28
// AI-assisted: see docs/AI_LOG.md #29
//
// Simulador de solicitudes de viaje para desarrollo. NO es parte de la
// aplicación: está fuera de src/ y la app nunca lo importa.
//
// Seguridad:
// - Solo funciona contra el emulador local de Firestore (usa
//   @firebase/rules-unit-testing, que no puede conectarse a Firebase real).
// - Exige un projectId que empiece por "demo-", reservado por Firebase para
//   proyectos sin recursos reales.
// - No usa credenciales ni modifica firestore.rules.
//
// Uso (con el emulador en ejecución: npx firebase-tools emulators:start --only firestore):
//   node scripts/dev/simulateTripRequests.cjs create [--category economy|xl|premium|all]
//        [--payment cash|mercadopago|stripe] [--tip 0] [--count 1]
//   node scripts/dev/simulateTripRequests.cjs list
//   node scripts/dev/simulateTripRequests.cjs clear
//   node scripts/dev/simulateTripRequests.cjs demo
//
// Variables opcionales: SIMULATOR_PROJECT_ID (por defecto demo-uberclone-driver-sim)
// y FIRESTORE_EMULATOR_HOST (por defecto 127.0.0.1:8080).

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..', '..');
process.chdir(ROOT);

const { initializeTestEnvironment } = require('@firebase/rules-unit-testing');
const firestore = require('firebase/firestore');
const { loadModule } = require(path.join(ROOT, 'tests/helpers/loadModule.cjs'));

const { calculateFare } = loadModule('src/utils/fareLogic.js');

const PROJECT_ID = process.env.SIMULATOR_PROJECT_ID || 'demo-uberclone-driver-sim';
const [HOST, PORT] = (process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080').split(':');

const CATEGORIES = ['economy', 'xl', 'premium'];
const PAYMENT_METHODS = ['cash', 'mercadopago', 'stripe'];

// Recorridos de ejemplo en Medellín. Distancia y duración son valores de
// prueba fijos (no consultas a Distance Matrix).
const SAMPLE_ROUTES = [
  {
    pickup: { address: 'Parque de Berrío, Medellín', latitude: 6.2518, longitude: -75.5636 },
    destination: { address: 'Estadio Atanasio Girardot, Medellín', latitude: 6.2565, longitude: -75.5905 },
    distanceKm: 8.5,
    durationMin: 22,
  },
  {
    pickup: { address: 'Centro Comercial Santafé, Medellín', latitude: 6.1967, longitude: -75.5732 },
    destination: { address: 'Parque de El Poblado, Medellín', latitude: 6.2095, longitude: -75.57 },
    distanceKm: 2.4,
    durationMin: 9,
  },
  {
    pickup: { address: 'Universidad de Antioquia, Medellín', latitude: 6.2672, longitude: -75.5686 },
    destination: { address: 'Aeropuerto Olaya Herrera, Medellín', latitude: 6.2199, longitude: -75.5906 },
    distanceKm: 7.1,
    durationMin: 19,
  },
];

function fail(message) {
  console.error(`Error: ${message}`);
  process.exit(1);
}

function parseOptions(args) {
  const options = { category: 'all', payment: 'cash', tip: 0, count: 1 };

  for (let index = 0; index < args.length; index += 2) {
    const key = args[index]?.replace(/^--/, '');
    const value = args[index + 1];

    if (!(key in options) || value === undefined) {
      fail(`Opción no reconocida: ${args[index]}`);
    }

    options[key] = ['tip', 'count'].includes(key) ? Number(value) : value;
  }

  if (options.category !== 'all' && !CATEGORIES.includes(options.category)) {
    fail(`Categoría no válida: ${options.category}`);
  }
  if (!PAYMENT_METHODS.includes(options.payment)) {
    fail(`Método de pago no válido: ${options.payment}`);
  }
  if (!Number.isInteger(options.tip) || options.tip < 0) {
    fail('La propina debe ser un entero mayor o igual a 0.');
  }
  if (!Number.isInteger(options.count) || options.count < 1 || options.count > 20) {
    fail('La cantidad debe estar entre 1 y 20.');
  }

  return options;
}

// Documento de solicitud compatible con firestore.rules y la app.
function buildTripRequest({ category, payment, tip, routeIndex }) {
  const route = SAMPLE_ROUTES[routeIndex % SAMPLE_ROUTES.length];
  const { fare } = calculateFare({
    distanceKm: route.distanceKm,
    durationMin: route.durationMin,
    category,
    tip,
  });

  return {
    status: 'pending',
    driverId: null,
    pickup: route.pickup,
    destination: route.destination,
    distanceKm: route.distanceKm,
    durationMin: route.durationMin,
    category,
    paymentMethod: payment,
    estimatedFare: fare,
    tip,
    createdAt: firestore.serverTimestamp(),
    simulated: true,
  };
}

async function openEnvironment() {
  if (!PROJECT_ID.startsWith('demo-')) {
    fail('Por seguridad, SIMULATOR_PROJECT_ID debe empezar por "demo-".');
  }

  try {
    return await initializeTestEnvironment({
      projectId: PROJECT_ID,
      firestore: {
        host: HOST,
        port: Number(PORT),
        rules: fs.readFileSync('firestore.rules', 'utf8'),
      },
    });
  } catch (error) {
    fail(
      `No se pudo conectar con el emulador en ${HOST}:${PORT}. ` +
        'Inícialo con: npx firebase-tools emulators:start --only firestore\n' +
        String(error.message)
    );
  }
}

async function createRequests(environment, options) {
  const categories = options.category === 'all' ? CATEGORIES : [options.category];
  const created = [];

  await environment.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    let routeIndex = 0;

    for (let copy = 0; copy < options.count; copy += 1) {
      for (const category of categories) {
        const data = buildTripRequest({ ...options, category, routeIndex });
        const ref = firestore.doc(firestore.collection(db, 'trips'));
        await firestore.setDoc(ref, data);
        created.push({ id: ref.id, category, estimatedFare: data.estimatedFare });
        routeIndex += 1;
      }
    }
  });

  for (const trip of created) {
    console.log(`Creada ${trip.id}: ${trip.category}, tarifa estimada ${trip.estimatedFare} COP`);
  }
}

async function listRequests(environment) {
  await environment.withSecurityRulesDisabled(async (context) => {
    const snapshot = await firestore.getDocs(
      firestore.query(
        firestore.collection(context.firestore(), 'trips'),
        firestore.where('simulated', '==', true)
      )
    );

    if (snapshot.empty) {
      console.log('No hay solicitudes simuladas.');
    }

    snapshot.forEach((item) => {
      const trip = item.data();
      console.log(
        `${item.id}: ${trip.status}, ${trip.category}, ${trip.paymentMethod}, ` +
          `conductor ${trip.driverId ?? '—'}, tarifa ${trip.fare ?? trip.estimatedFare}`
      );
    });
  });
}

async function clearRequests(environment) {
  await environment.withSecurityRulesDisabled(async (context) => {
    const snapshot = await firestore.getDocs(
      firestore.query(
        firestore.collection(context.firestore(), 'trips'),
        firestore.where('simulated', '==', true)
      )
    );

    await Promise.all(snapshot.docs.map((item) => firestore.deleteDoc(item.ref)));
    console.log(`Eliminadas ${snapshot.size} solicitudes simuladas.`);
  });
}

// Recorre aceptación, rechazo, vencimiento y finalización con los servicios
// reales de la app como un conductor de prueba.
async function runDemo(environment) {
  const services = loadModule('src/services/tripService.js', {
    'firebase/firestore': firestore,
    '../config/firebase': { db: null },
  });
  const driverId = 'simulated-driver';
  const expiry = new Date();
  expiry.setFullYear(expiry.getFullYear() + 2);

  const ids = {};

  await environment.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();

    await firestore.setDoc(firestore.doc(db, 'drivers', driverId), {
      personalData: {
        profilePhoto: 'https://example.com/profile.jpg',
        fullName: 'Conductor Simulado',
        identityDocument: '1234567890',
        phone: '3001234567',
        birthDate: '1995-01-01T05:00:00.000Z',
        gender: 'Masculino',
        email: 'simulado@example.com',
        language: 'Español',
      },
      vehicleData: {
        vehiclePhoto: 'https://example.com/vehicle.jpg',
        category: 'XL',
        plate: 'SIM123',
        make: 'Renault',
        model: 'Duster',
        year: '2023',
        color: 'Blanco',
        passengerCapacity: '6',
      },
      documentsData: {
        licenseNumber: '123456789',
        licensePhoto: 'https://example.com/license.jpg',
        licenseExpiration: expiry.toISOString(),
        soatPhoto: 'https://example.com/soat.jpg',
        soatExpiration: expiry.toISOString(),
        technicalReviewPhoto: '',
        technicalReviewExpiration: '',
        mercadoPagoEmail: 'simulado@example.com',
        acceptedTerms: true,
      },
      approvalStatus: 'approved',
      registrationCompletedAt: new Date(),
      isOnline: true,
    });

    for (const [key, category, routeIndex] of [
      ['complete', 'xl', 0],
      ['reject', 'economy', 1],
      ['expire', 'premium', 2],
    ]) {
      const ref = firestore.doc(firestore.collection(db, 'trips'));
      await firestore.setDoc(
        ref,
        buildTripRequest({ category, payment: 'cash', tip: 0, routeIndex })
      );
      ids[key] = ref.id;
    }
  });

  const db = environment.authenticatedContext(driverId).firestore();
  const step = (text) => console.log(`✔ ${text}`);

  await services.createTripOffer(driverId, ids.complete, db);
  await services.acceptTrip(ids.complete, driverId, db);
  step(`Aceptada ${ids.complete}`);
  await services.markDriverArriving(ids.complete, driverId, db);
  step('Conductor en camino al origen');
  await services.markArrivedAtPickup(ids.complete, driverId, db);
  step('Llegada al origen registrada');
  await services.startTrip(ids.complete, driverId, db);
  step('Pasajero a bordo: viaje en curso');
  await services.completeTrip(ids.complete, driverId, db);
  step('Viaje finalizado con desglose de tarifa');
  // AI-assisted: see docs/AI_LOG.md #29
  await services.registerCashPayment(ids.complete, driverId, db);
  step('Cobro en efectivo registrado; comisión pendiente en el saldo');

  await services.createTripOffer(driverId, ids.reject, db);
  await services.rejectTripOffer(driverId, ids.reject, 'manual', db);
  step(`Rechazada manualmente ${ids.reject} (sigue pendiente para otros conductores)`);

  // Vencimiento: se registra una oferta con 20 s de antigüedad.
  await environment.withSecurityRulesDisabled(async (context) => {
    await firestore.setDoc(
      firestore.doc(context.firestore(), 'drivers', driverId, 'tripOffers', ids.expire),
      { tripId: ids.expire, status: 'offered', offeredAt: new Date(Date.now() - 20_000) }
    );
  });

  try {
    await services.acceptTrip(ids.expire, driverId, db);
    fail('Una solicitud vencida no debería poder aceptarse.');
  } catch (error) {
    step(`Aceptación vencida rechazada: ${error.message}`);
  }

  await services.rejectTripOffer(driverId, ids.expire, 'expired', db);
  step(`Rechazo automático persistido para ${ids.expire}`);

  await environment.withSecurityRulesDisabled(async (context) => {
    const trip = (
      await firestore.getDoc(firestore.doc(context.firestore(), 'trips', ids.complete))
    ).data();
    console.log(
      `Desglose guardado: tarifa ${trip.fare}, comisión ${trip.commission}, ` +
        `ganancia ${trip.driverEarnings} (${trip.fareSource})`
    );

    const entry = (
      await firestore.getDoc(
        firestore.doc(context.firestore(), 'drivers', driverId, 'ledgerEntries', `cash_${ids.complete}`)
      )
    ).data();
    console.log(
      `Viaje ${trip.status} (${trip.paymentStatus}). Asiento: efectivo ${entry.cashAmount}, ` +
        `comisión adeudada ${entry.amount}, estado ${entry.status}`
    );
  });
}

async function main() {
  const [command, ...args] = process.argv.slice(2);

  if (!['create', 'list', 'clear', 'demo'].includes(command)) {
    console.log(
      'Uso: node scripts/dev/simulateTripRequests.cjs <create|list|clear|demo> [opciones]\n' +
        'Opciones de create: --category economy|xl|premium|all --payment cash|mercadopago|stripe --tip 0 --count 1'
    );
    process.exit(command ? 1 : 0);
  }

  const environment = await openEnvironment();
  console.log(`Emulador ${HOST}:${PORT}, proyecto ${PROJECT_ID}`);

  try {
    if (command === 'create') await createRequests(environment, parseOptions(args));
    if (command === 'list') await listRequests(environment);
    if (command === 'clear') await clearRequests(environment);
    if (command === 'demo') await runDemo(environment);
  } finally {
    await environment.cleanup();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
