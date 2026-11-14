#!/usr/bin/env node
// AI-assisted: see docs/AI_LOG.md #38
//
// MODO DEMOSTRACIÓN de pagos para la presentación (sin credenciales de
// Mercado Pago ni plan Blaze). Todo ocurre en los emuladores locales del Mac;
// nada se escribe en el Firestore real.
//
// Comandos (cada uno en su terminal, desde la raíz del proyecto):
//   node scripts/dev/paymentDemo.cjs emuladores      Firestore + Functions en modo demostración
//   node scripts/dev/paymentDemo.cjs preparar --uid <UID>   perfil del conductor y solicitudes
//   node scripts/dev/paymentDemo.cjs solicitud [--metodo mercadopago|cash] [--completado --uid <UID>]
//   node scripts/dev/paymentDemo.cjs app             Expo con la app conectada a los emuladores
// Opcional: --ip <IP local del Mac> (por defecto se detecta).
//
// Seguridad:
// - Las escrituras usan el token "owner", que solo acepta el emulador (el
//   Firestore real lo rechaza), contra 127.0.0.1:8181.
// - El modo demostración del backend se activa con functions/.env.local,
//   que solo leen los emuladores y que este script borra al terminar.
// - Todos los datos llevan demoData: true.

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');

const ROOT = path.resolve(__dirname, '..', '..');
process.chdir(ROOT);

const { loadModule } = require(path.join(ROOT, 'tests/helpers/loadModule.cjs'));
const { toFields } = require(path.join(ROOT, 'scripts/dev/seedTestTripRequests.cjs'));
const { calculateFare, buildCompletionBreakdown } = loadModule('src/utils/fareLogic.js');

// Proyecto de la app: el emulador de Firestore separa los datos por
// proyecto y la app usa este ID. Los datos quedan solo en el emulador.
const PROJECT_ID = 'uberclone-driver-8e0bf';
const FIRESTORE_PORT = 8181;
const FUNCTIONS_PORT = 5002;
const EMULATOR_API = `http://127.0.0.1:${FIRESTORE_PORT}/v1/projects/${PROJECT_ID}/databases/(default)/documents`;
const ENV_LOCAL = path.join(ROOT, 'functions', '.env.local');

function fail(message) {
  console.error(`Error: ${message}`);
  process.exit(1);
}

function option(args, name) {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
}

function detectLanIp() {
  for (const addresses of Object.values(os.networkInterfaces())) {
    for (const address of addresses || []) {
      if (address.family === 'IPv4' && !address.internal && /^(192\.168|10\.|172\.(1[6-9]|2\d|3[01]))/.test(address.address)) {
        return address.address;
      }
    }
  }
  return null;
}

function resolveIp(args) {
  const ip = option(args, '--ip') || detectLanIp();
  if (!ip || !/^\d{1,3}(\.\d{1,3}){3}$/.test(ip)) {
    fail('No se pudo detectar la IP local del Mac. Indícala con --ip 192.168.x.x');
  }
  return ip;
}

function run(command, commandArgs, env) {
  const child = spawn(command, commandArgs, { stdio: 'inherit', env: { ...process.env, ...env } });
  return new Promise((resolve) => child.on('exit', (code) => resolve(code ?? 0)));
}

// --- emuladores -------------------------------------------------------------

async function startEmulators(args) {
  const ip = resolveIp(args);

  if (!fs.existsSync(path.join(ROOT, 'functions', 'node_modules', 'firebase-functions'))) {
    fail('Faltan las dependencias del backend. Ejecuta: npm --prefix functions install');
  }

  fs.writeFileSync(
    ENV_LOCAL,
    [
      '# Generado por scripts/dev/paymentDemo.cjs. Solo lo leen los emuladores.',
      'PAYMENTS_DEMO_MODE=true',
      `DEMO_PUBLIC_BASE_URL=http://${ip}:${FUNCTIONS_PORT}/${PROJECT_ID}/us-central1`,
      'MP_CHECKOUT_URL_FIELD=init_point',
      'MP_WEBHOOK_SIGNATURE_MODE=enforce',
      'PUBLIC_FUNCTIONS_BASE_URL=',
      '',
    ].join('\n')
  );

  const cleanup = () => {
    try {
      fs.rmSync(ENV_LOCAL, { force: true });
    } catch {
      // sin acción
    }
  };
  process.on('exit', cleanup);

  console.log(`\nMODO DEMOSTRACIÓN — emuladores en ${ip} (Firestore ${FIRESTORE_PORT}, Functions ${FUNCTIONS_PORT}).`);
  console.log('Interfaz de los emuladores: http://127.0.0.1:4001/firestore  (Ctrl+C para detener)\n');

  const child = spawn(
    'npx',
    [
      '--yes', '--package', 'firebase-tools', 'firebase', 'emulators:start',
      '--config', 'firebase.demo.json', '--only', 'firestore,functions', '--project', PROJECT_ID,
    ],
    { stdio: 'inherit' }
  );

  // Ctrl+C o cierre: se reenvía la señal a los emuladores y se espera a que
  // terminen; el archivo del modo demostración se borra siempre.
  for (const signal of ['SIGINT', 'SIGTERM']) {
    process.on(signal, () => {
      cleanup();
      child.kill(signal);
    });
  }

  child.on('exit', (code) => {
    cleanup();
    process.exit(code ?? 0);
  });
}

// --- datos en el emulador ---------------------------------------------------

async function emulatorRequest(method, urlPath, body) {
  let response;
  try {
    response = await fetch(`${EMULATOR_API}${urlPath}`, {
      method,
      headers: { Authorization: 'Bearer owner', 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    fail(`No se pudo conectar con el emulador de Firestore en 127.0.0.1:${FIRESTORE_PORT}. Inícialo con: node scripts/dev/paymentDemo.cjs emuladores`);
  }
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    fail(`El emulador respondió ${response.status}: ${payload?.error?.message || ''}`);
  }
  return payload;
}

function setDocument(collectionPath, id, data, serverTimeFields = []) {
  const name = `projects/${PROJECT_ID}/databases/(default)/documents/${collectionPath}/${id}`;
  return emulatorRequest('POST', ':commit', {
    writes: [
      {
        update: { name, fields: toFields(data) },
        ...(serverTimeFields.length
          ? { updateTransforms: serverTimeFields.map((fieldPath) => ({ fieldPath, setToServerValue: 'REQUEST_TIME' })) }
          : {}),
      },
    ],
  });
}

function requireUid(args) {
  const uid = option(args, '--uid');
  if (!uid || !/^[A-Za-z0-9]{10,128}$/.test(uid)) {
    fail('Indica el UID del conductor con --uid. Aparece en Metro como "Conductor autenticado: <UID>".');
  }
  return uid;
}

// Perfil de demostración que cumple las validaciones de firestore.rules.
function demoDriverProfile() {
  const expiry = new Date();
  expiry.setFullYear(expiry.getFullYear() + 2);
  return {
    personalData: {
      profilePhoto: 'https://res.cloudinary.com/demo/image/upload/sample.jpg',
      fullName: 'Conductor de Demostración',
      identityDocument: '1234567890',
      phone: '3000000000',
      birthDate: '1995-01-01T05:00:00.000Z',
      gender: 'Otro',
      email: 'demo@example.com',
      language: 'Español',
    },
    vehicleData: {
      vehiclePhoto: 'https://res.cloudinary.com/demo/image/upload/sample.jpg',
      category: 'XL',
      plate: 'DEM123',
      make: 'Renault',
      model: 'Duster',
      year: '2023',
      color: 'Blanco',
      passengerCapacity: '6',
    },
    documentsData: {
      licenseNumber: '123456789',
      licensePhoto: 'https://res.cloudinary.com/demo/image/upload/sample.jpg',
      licenseExpiration: expiry.toISOString(),
      soatPhoto: 'https://res.cloudinary.com/demo/image/upload/sample.jpg',
      soatExpiration: expiry.toISOString(),
      technicalReviewPhoto: '',
      technicalReviewExpiration: '',
      mercadoPagoEmail: 'demo@example.com',
      acceptedTerms: true,
    },
    approvalStatus: 'approved',
    isOnline: false,
    demoData: true,
  };
}

const ROUTE = {
  pickup: { address: 'Parque Lleras, Medellín', latitude: 6.2088, longitude: -75.5675 },
  destination: { address: 'Jardín Botánico de Medellín', latitude: 6.2708, longitude: -75.564 },
  distanceKm: 9.8,
  durationMin: 27,
};

function demoTrip(paymentMethod, tip) {
  const category = paymentMethod === 'cash' ? 'economy' : 'xl';
  const inputs = { distanceKm: ROUTE.distanceKm, durationMin: ROUTE.durationMin, category, tip };
  return {
    status: 'pending',
    driverId: null,
    pickup: ROUTE.pickup,
    destination: ROUTE.destination,
    distanceKm: ROUTE.distanceKm,
    durationMin: ROUTE.durationMin,
    category,
    paymentMethod,
    estimatedFare: calculateFare(inputs).fare,
    tip,
    demoData: true,
  };
}

function newTripId(prefix) {
  return `demo_${prefix}_${Date.now().toString(36)}`;
}

async function createRequest(paymentMethod) {
  const id = newTripId(paymentMethod);
  await setDocument('trips', id, demoTrip(paymentMethod, paymentMethod === 'cash' ? 0 : 2000), ['createdAt']);
  console.log(`Solicitud de demostración creada: ${id} (${paymentMethod}). Tienes 15 s para aceptarla al verla.`);
}

// Viaje ya finalizado y asignado, listo para cobrar (atajo para la
// presentación si no se quiere recorrer el ciclo).
async function createCompletedTrip(uid) {
  const id = newTripId('mercadopago_completado');
  const trip = { ...demoTrip('mercadopago', 2000), status: 'completed', driverId: uid };
  await setDocument('trips', id, { ...trip, ...buildCompletionBreakdown(trip) }, ['createdAt', 'completedAt']);
  console.log(`Viaje finalizado de demostración creado: ${id}. Aparece en Viajes como cobro pendiente.`);
}

async function prepare(args) {
  const uid = requireUid(args);
  await setDocument('drivers', uid, demoDriverProfile(), ['registrationCompletedAt', 'approvalRequestedAt', 'updatedAt']);
  console.log(`Perfil de demostración del conductor ${uid} creado en el emulador (aprobado, desconectado).`);
  console.log('Recarga la app (tecla r en Metro), conéctate en Inicio y luego crea solicitudes con:');
  console.log('  node scripts/dev/paymentDemo.cjs solicitud --metodo mercadopago');
  console.log('  node scripts/dev/paymentDemo.cjs solicitud --metodo cash');
}

async function request(args) {
  if (args.includes('--completado')) {
    await createCompletedTrip(requireUid(args));
    return;
  }
  const method = option(args, '--metodo') || 'mercadopago';
  if (!['mercadopago', 'cash'].includes(method)) {
    fail('--metodo debe ser mercadopago o cash.');
  }
  await createRequest(method);
}

// --- app ---------------------------------------------------------------------

async function startApp(args) {
  const ip = resolveIp(args);
  console.log(`\nMODO DEMOSTRACIÓN — la app usará los emuladores de ${ip}. Escanea el QR con Expo Go.\n`);
  const code = await run('npx', ['expo', 'start', '-c'], {
    EXPO_PUBLIC_PAYMENTS_DEMO: 'true',
    EXPO_PUBLIC_DEMO_EMULATOR_HOST: ip,
  });
  process.exit(code);
}

async function main() {
  const [command, ...args] = process.argv.slice(2);
  const commands = { emuladores: startEmulators, preparar: prepare, solicitud: request, app: startApp };

  if (!commands[command]) {
    console.log(
      'Uso: node scripts/dev/paymentDemo.cjs <emuladores|preparar|solicitud|app> [opciones]\n' +
        '  emuladores [--ip IP]\n  preparar --uid UID\n' +
        '  solicitud [--metodo mercadopago|cash] | solicitud --completado --uid UID\n  app [--ip IP]'
    );
    process.exit(command ? 1 : 0);
  }

  await commands[command](args);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
