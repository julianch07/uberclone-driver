#!/usr/bin/env node
// AI-assisted: see docs/AI_LOG.md #33
//
// Crea seis solicitudes de viaje de prueba (2 Económico, 2 XL y 2 Premium)
// en Firestore para verificar la app del conductor. Herramienta de
// desarrollo: está fuera de src/ y la app nunca la importa. No sustituye ni
// modifica el simulador del emulador (simulateTripRequests.cjs).
//
// Autenticación: firestore.rules prohíbe crear viajes desde cualquier
// cliente (match /trips: allow create: if false). En el sistema completo las
// solicitudes las crea la app del pasajero o un backend, no el conductor.
// Este script escribe con la API REST de Firestore y un token OAuth de corta
// duración de una cuenta con permisos IAM sobre el proyecto (por ejemplo, la
// del propietario, obtenido con `gcloud auth print-access-token`). Ese
// acceso no pasa por las reglas, que no se modifican ni se debilitan; por
// eso el script valida cada documento con las mismas condiciones que la app
// y las reglas antes de escribir.
//
// Seguridad:
// - Sin --escribir ni --estado solo muestra la vista previa y no se conecta
//   a Firebase.
// - En el proyecto real exige --proyecto uberclone-driver-8e0bf y escribir
//   el ID del proyecto en una confirmación interactiva.
// - El token se lee de la variable FIRESTORE_ACCESS_TOKEN; no se guarda ni
//   se imprime.
// - IDs deterministas por lote y precondición "el documento no existe": al
//   repetir el comando no se duplica ni se sobrescribe ningún documento, y
//   la escritura de los viajes del lote es atómica (todos o ninguno).
// - Solo crea documentos nuevos: no modifica ni borra documentos existentes.
// - Los documentos llevan testData: true, testBatch y testSource.
//
// Uso:
//   Vista previa (sin conexión):
//     node scripts/dev/seedTestTripRequests.cjs
//   Proyecto real con la sesión de Firebase CLI (#34):
//     npx firebase-tools firestore:indexes --project uberclone-driver-8e0bf >/dev/null && \
//       node scripts/dev/seedTestTripRequests.cjs --proyecto uberclone-driver-8e0bf \
//       --credencial-firebase-cli --escribir
//     (el primer comando es de solo lectura y renueva el access token)
//   Proyecto real con Google Cloud CLI:
//     FIRESTORE_ACCESS_TOKEN="$(gcloud auth print-access-token)" \
//       node scripts/dev/seedTestTripRequests.cjs --proyecto uberclone-driver-8e0bf --escribir
//   Opciones: --lote <id> (por defecto, la fecha de Bogotá AAAAMMDD),
//             --solo <1-6> (crea solo ese viaje del lote),
//             --estado (solo lectura: estado de los viajes del lote).
//   Emulador (proyecto demo-, sin token ni confirmación):
//     node scripts/dev/seedTestTripRequests.cjs --emulador --escribir
//     Variables opcionales: SEED_EMULATOR_PROJECT_ID (por defecto
//     demo-uberclone-driver-seed) y FIRESTORE_EMULATOR_HOST (127.0.0.1:8080).

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const readline = require('node:readline/promises');

const ROOT = path.resolve(__dirname, '..', '..');
process.chdir(ROOT);

const { loadModule } = require(path.join(ROOT, 'tests/helpers/loadModule.cjs'));

const { calculateFare, buildCompletionBreakdown, hasPricingInputs, normalizeCategory } =
  loadModule('src/utils/fareLogic.js');
const { PAYMENT_METHOD, getCategoryLabel, getPaymentMethodLabel } =
  loadModule('src/utils/tripRequestLogic.js');

// Único proyecto real en el que se permite escribir.
const REAL_PROJECT_ID = 'uberclone-driver-8e0bf';
const REAL_API = 'https://firestore.googleapis.com/v1';
const SOURCE = 'scripts/dev/seedTestTripRequests.cjs';
const REQUEST_TIMEOUT_MS = 20_000;

// AI-assisted: see docs/AI_LOG.md #34
// Sesión de Firebase CLI (`npx firebase-tools login`), la misma que se usa
// para desplegar reglas e índices. Con --credencial-firebase-cli se
// reutiliza su access token vigente (dura 1 hora y Firebase CLI lo renueva
// cada vez que ejecuta un comando). Nunca se lee el refresh token ni se
// imprime o copia el access token.
const FIREBASE_CLI_CONFIG = path.join(os.homedir(), '.config', 'configstore', 'firebase-tools.json');
const CLOUD_PLATFORM_SCOPE = 'https://www.googleapis.com/auth/cloud-platform';
const TOKEN_MIN_REMAINING_MS = 5 * 60_000;
const REFRESH_HINT =
  `Renueva la sesión con un comando de solo lectura: npx firebase-tools firestore:indexes --project ${REAL_PROJECT_ID}`;

// Recorridos en Medellín. Las coordenadas son aproximadas; la distancia y la
// duración son valores de prueba fijos (no consultas a Distance Matrix).
const ROUTES = [
  {
    pickup: { address: 'Parque Explora, Medellín', latitude: 6.2706, longitude: -75.5656 },
    destination: { address: 'Pueblito Paisa, Cerro Nutibara, Medellín', latitude: 6.237, longitude: -75.579 },
    distanceKm: 6.2,
    durationMin: 18,
  },
  {
    pickup: { address: 'Universidad Nacional, sede Medellín', latitude: 6.2616, longitude: -75.5776 },
    destination: { address: 'Plaza Botero, Medellín', latitude: 6.2522, longitude: -75.5687 },
    distanceKm: 2.6,
    durationMin: 10,
  },
  {
    pickup: { address: 'Centro Comercial Oviedo, Medellín', latitude: 6.1985, longitude: -75.5745 },
    destination: { address: 'Aeropuerto Olaya Herrera, Medellín', latitude: 6.2199, longitude: -75.5906 },
    distanceKm: 4.3,
    durationMin: 14,
  },
  {
    pickup: { address: 'Parque Lleras, Medellín', latitude: 6.2088, longitude: -75.5675 },
    destination: { address: 'Jardín Botánico de Medellín', latitude: 6.2708, longitude: -75.564 },
    distanceKm: 9.8,
    durationMin: 27,
  },
  {
    pickup: { address: 'Universidad EAFIT, Medellín', latitude: 6.2004, longitude: -75.5784 },
    destination: { address: 'Centro Comercial Unicentro, Medellín', latitude: 6.241, longitude: -75.587 },
    distanceKm: 6.9,
    durationMin: 20,
  },
  {
    pickup: { address: 'Estadio Atanasio Girardot, Medellín', latitude: 6.2565, longitude: -75.5905 },
    destination: { address: 'Centro Comercial El Tesoro, Medellín', latitude: 6.198, longitude: -75.559 },
    distanceKm: 11.5,
    durationMin: 30,
  },
];

// Dos viajes por categoría, con métodos de pago distintos en cada pareja y
// los tres métodos representados. Tres en efectivo para probar el cobro.
const TRIP_PLAN = [
  { category: 'economy', paymentMethod: PAYMENT_METHOD.CASH, tip: 0 },
  { category: 'economy', paymentMethod: PAYMENT_METHOD.MERCADOPAGO, tip: 1000 },
  { category: 'xl', paymentMethod: PAYMENT_METHOD.CASH, tip: 2000 },
  { category: 'xl', paymentMethod: PAYMENT_METHOD.STRIPE, tip: 0 },
  { category: 'premium', paymentMethod: PAYMENT_METHOD.MERCADOPAGO, tip: 0 },
  { category: 'premium', paymentMethod: PAYMENT_METHOD.CASH, tip: 1500 },
];

function fail(message) {
  console.error(`Error: ${message}`);
  process.exit(1);
}

function todayInBogota() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Bogota',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
    .format(new Date())
    .replaceAll('-', '');
}

function parseOptions(args) {
  const options = {
    project: null,
    write: false,
    status: false,
    emulator: false,
    firebaseCliCredential: false,
    batch: todayInBogota(),
    only: null,
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    const takeValue = () => {
      const value = args[index + 1];
      if (value === undefined || value.startsWith('--')) {
        fail(`Falta el valor de ${arg}.`);
      }
      index += 1;
      return value;
    };

    if (arg === '--escribir') options.write = true;
    else if (arg === '--estado') options.status = true;
    else if (arg === '--emulador') options.emulator = true;
    else if (arg === '--credencial-firebase-cli') options.firebaseCliCredential = true;
    else if (arg === '--proyecto') options.project = takeValue();
    else if (arg === '--lote') options.batch = takeValue();
    else if (arg === '--solo') options.only = Number(takeValue());
    else fail(`Opción no reconocida: ${arg}`);
  }

  if (options.write && options.status) {
    fail('Usa --escribir o --estado, no ambos.');
  }
  if (!/^[A-Za-z0-9-]{1,40}$/.test(options.batch)) {
    fail('El lote solo admite letras, números y guiones (máximo 40).');
  }
  if (
    options.only !== null &&
    !(Number.isInteger(options.only) && options.only >= 1 && options.only <= TRIP_PLAN.length)
  ) {
    fail(`--solo debe ser un número entre 1 y ${TRIP_PLAN.length}.`);
  }

  return options;
}

function resolveTarget(options) {
  if (options.emulator) {
    const projectId =
      options.project || process.env.SEED_EMULATOR_PROJECT_ID || 'demo-uberclone-driver-seed';

    if (!projectId.startsWith('demo-')) {
      fail('Con --emulador el proyecto debe empezar por "demo-".');
    }

    const host = process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080';
    // El emulador trata el token "owner" como acceso de administrador.
    return { projectId, api: `http://${host}/v1`, token: 'owner', real: false, label: `emulador ${host}` };
  }

  if (options.project === null) {
    return null;
  }

  if (options.project !== REAL_PROJECT_ID) {
    fail(`Este script solo escribe en ${REAL_PROJECT_ID} o en el emulador (--emulador).`);
  }

  return { projectId: REAL_PROJECT_ID, api: REAL_API, token: null, real: true, label: 'Firebase real' };
}

// AI-assisted: see docs/AI_LOG.md #34
function readFirebaseCliAccessToken() {
  let config;

  try {
    config = JSON.parse(fs.readFileSync(FIREBASE_CLI_CONFIG, 'utf8'));
  } catch {
    fail('No se encontró la sesión de Firebase CLI. Inicia sesión con: npx firebase-tools login');
  }

  const tokens = config?.tokens;
  const scopes = String(tokens?.scope || '').split(' ');

  if (typeof tokens?.access_token !== 'string' || !Number.isFinite(tokens?.expires_at)) {
    fail(`La sesión de Firebase CLI no tiene un access token. ${REFRESH_HINT}`);
  }
  if (!scopes.includes(CLOUD_PLATFORM_SCOPE)) {
    fail('La sesión de Firebase CLI no tiene el permiso cloud-platform necesario para Firestore.');
  }
  if (tokens.expires_at - Date.now() < TOKEN_MIN_REMAINING_MS) {
    fail(`El access token de Firebase CLI venció o está por vencer. ${REFRESH_HINT}`);
  }

  return tokens.access_token;
}

function isValidLocation(location) {
  return (
    location !== null &&
    typeof location === 'object' &&
    typeof location.address === 'string' &&
    location.address.length > 0 &&
    typeof location.latitude === 'number' &&
    Math.abs(location.latitude) <= 90 &&
    typeof location.longitude === 'number' &&
    Math.abs(location.longitude) <= 180
  );
}

// Mismas condiciones que la app (canAcceptTrip, getTripEstimate) y
// firestore.rules (validTripAcceptance, hasPricingInputs y el desglose al
// finalizar). Como este script no pasa por las reglas, valida antes de
// escribir.
function assertValidTripRequest(id, data) {
  const problems = [];
  const fare = calculateFare(data).fare;

  if (data.status !== 'pending') problems.push('status debe ser "pending"');
  if (data.driverId !== null) problems.push('driverId debe ser null');
  if (!isValidLocation(data.pickup)) problems.push('pickup no válido');
  if (!isValidLocation(data.destination)) problems.push('destination no válido');
  if (!hasPricingInputs(data) || normalizeCategory(data.category) !== data.category) {
    problems.push('distancia, duración o categoría no válidas');
  }
  if (!Object.values(PAYMENT_METHOD).includes(data.paymentMethod)) {
    problems.push('paymentMethod no válido');
  }
  if (!Number.isInteger(data.tip) || data.tip < 0) problems.push('tip no válida');
  if (!(Number.isInteger(data.estimatedFare) && data.estimatedFare === fare)) {
    problems.push('estimatedFare no coincide con calculateFare()');
  }
  if (buildCompletionBreakdown(data).fare !== data.estimatedFare) {
    problems.push('el desglose al finalizar no coincidiría con la tarifa estimada');
  }

  if (problems.length > 0) {
    fail(`La solicitud ${id} no es válida: ${problems.join('; ')}.`);
  }
}

function buildTripRequests(batch, only) {
  return TRIP_PLAN.map((plan, index) => {
    const number = index + 1;
    const route = ROUTES[index];
    const result = calculateFare({
      distanceKm: route.distanceKm,
      durationMin: route.durationMin,
      category: plan.category,
      tip: plan.tip,
    });
    const id = `prueba_${batch}_${number}_${plan.category}`;
    // createdAt no se incluye: lo fija el servidor al escribir (REQUEST_TIME).
    const data = {
      status: 'pending',
      driverId: null,
      pickup: route.pickup,
      destination: route.destination,
      distanceKm: route.distanceKm,
      durationMin: route.durationMin,
      category: plan.category,
      paymentMethod: plan.paymentMethod,
      estimatedFare: result.fare,
      tip: plan.tip,
      testData: true,
      testBatch: batch,
      testSource: SOURCE,
    };

    assertValidTripRequest(id, data);
    return { number, id, data, estimate: result };
  }).filter((trip) => only === null || trip.number === only);
}

function printPlan(trips) {
  console.table(
    trips.map(({ number, id, data, estimate }) => ({
      '#': number,
      id,
      categoría: getCategoryLabel(data.category),
      pago: getPaymentMethodLabel(data.paymentMethod),
      km: data.distanceKm,
      min: data.durationMin,
      tarifa: estimate.fare,
      propina: data.tip,
      comisión: estimate.commission,
      ganancia: estimate.driverEarnings,
    }))
  );
  for (const { number, data } of trips) {
    console.log(`  ${number}. ${data.pickup.address} → ${data.destination.address}`);
  }
}

// Conversión al formato de valores de la API REST de Firestore.
function toValue(value) {
  if (value === null) return { nullValue: null };
  if (typeof value === 'boolean') return { booleanValue: value };
  if (typeof value === 'string') return { stringValue: value };
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new Error('Número no finito.');
    return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
  }
  if (typeof value === 'object') return { mapValue: { fields: toFields(value) } };
  throw new Error(`Tipo no soportado: ${typeof value}`);
}

function toFields(object) {
  return Object.fromEntries(Object.entries(object).map(([key, value]) => [key, toValue(value)]));
}

function fromValue(value) {
  if (!value) return undefined;
  if ('nullValue' in value) return null;
  if ('stringValue' in value) return value.stringValue;
  if ('booleanValue' in value) return value.booleanValue;
  if ('integerValue' in value) return Number(value.integerValue);
  if ('doubleValue' in value) return value.doubleValue;
  if ('timestampValue' in value) return value.timestampValue;
  return '(otro)';
}

function documentName(target, id) {
  return `projects/${target.projectId}/databases/(default)/documents/trips/${id}`;
}

// La referencia de la API REST describe batchGet como una respuesta
// "streamed" sin fijar el formato del cuerpo: puede llegar como un arreglo
// JSON (lo que devuelve el emulador), un objeto o una secuencia de objetos
// concatenados o separados por saltos de línea. Se normalizan a una lista de
// mensajes. commit devuelve un único objeto, que queda como lista de uno.
function parseJsonMessages(text) {
  const trimmed = text.trim();

  if (trimmed === '') return [];

  try {
    const parsed = JSON.parse(trimmed);
    return Array.isArray(parsed) ? parsed : [parsed];
  } catch {
    // No es un único valor JSON: se interpreta como secuencia de objetos.
  }

  const messages = [];
  let depth = 0;
  let start = -1;
  let inString = false;
  let escaped = false;

  for (let index = 0; index < trimmed.length; index += 1) {
    const char = trimmed[index];

    if (inString) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === '"') inString = false;
      continue;
    }

    if (char === '"') {
      inString = true;
    } else if (char === '{') {
      if (depth === 0) start = index;
      depth += 1;
    } else if (char === '}') {
      depth -= 1;
      if (depth < 0) throw new Error('Respuesta JSON mal formada.');
      if (depth === 0) messages.push(JSON.parse(trimmed.slice(start, index + 1)));
    } else if (depth === 0 && !/[\s,[\]]/.test(char)) {
      throw new Error('Respuesta JSON mal formada.');
    }
  }

  if (depth !== 0 || inString) {
    throw new Error('Respuesta JSON incompleta.');
  }

  return messages;
}

// Un error puede llegar como objeto { error } con un estado HTTP de error o,
// en una respuesta en streaming, como un mensaje { error } dentro de la
// secuencia aunque el estado HTTP sea 200.
function findApiError(messages) {
  return messages.find((message) => message && typeof message === 'object' && message.error)?.error;
}

async function callFirestore(target, method, body) {
  const headers = {
    Authorization: `Bearer ${target.token}`,
    'Content-Type': 'application/json',
  };
  if (target.real) {
    headers['x-goog-user-project'] = target.projectId;
  }

  let response;
  try {
    response = await fetch(
      `${target.api}/projects/${target.projectId}/databases/(default)/documents:${method}`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      }
    );
  } catch (error) {
    fail(`No se pudo conectar con ${target.label}: ${error.message}`);
  }

  let messages;
  try {
    messages = parseJsonMessages(await response.text());
  } catch (error) {
    if (response.ok) {
      fail(`Respuesta no válida de ${target.label}: ${error.message}`);
    }
    messages = [];
  }

  const apiError = findApiError(messages);

  if (!response.ok || apiError) {
    const status = apiError?.status || response.status;
    const detail = apiError?.message || response.statusText;

    if (
      method === 'commit' &&
      (response.status === 409 || status === 'ALREADY_EXISTS' || status === 'FAILED_PRECONDITION')
    ) {
      fail(
        'Al menos uno de los viajes del lote ya existe. No se escribió ni se modificó nada. ' +
          'Consulta el lote con --estado o usa otro --lote.'
      );
    }
    if (response.status === 401 || status === 'UNAUTHENTICATED') {
      fail('El token no es válido o venció (dura alrededor de 1 hora). Genera uno nuevo.');
    }
    if (response.status === 403 || status === 'PERMISSION_DENIED') {
      fail(`La cuenta del token no tiene permisos sobre el proyecto: ${detail}`);
    }
    fail(`Firestore respondió ${response.status} (${status}): ${detail}`);
  }

  return messages;
}

async function confirmRealWrite(target, trips) {
  if (!process.stdin.isTTY) {
    fail('La escritura en el proyecto real requiere confirmarla en una terminal interactiva.');
  }

  const prompt = readline.createInterface({ input: process.stdin, output: process.stdout });
  const count = trips.length === 1 ? '1 documento NUEVO' : `${trips.length} documentos NUEVOS`;
  const answer = await prompt.question(
    `\nSe creará(n) ${count} en trips de ${target.projectId} ` +
      '(Firebase real). No se modificará ningún documento existente.\n' +
      `Escribe el ID del proyecto (${target.projectId}) para confirmar: `
  );
  prompt.close();

  if (answer.trim() !== target.projectId) {
    fail('Confirmación incorrecta. No se escribió nada.');
  }
}

// Escrituras del commit (API REST v1, Write): update con el documento
// completo, precondición currentDocument.exists = false (el documento no
// debe existir) y updateTransforms con REQUEST_TIME, que fija createdAt a la
// hora del servidor como Timestamp. Todas las escrituras de un commit se
// aplican de forma atómica.
function buildCommitBody(target, trips) {
  return {
    writes: trips.map(({ id, data }) => ({
      update: { name: documentName(target, id), fields: toFields(data) },
      currentDocument: { exists: false },
      updateTransforms: [{ fieldPath: 'createdAt', setToServerValue: 'REQUEST_TIME' }],
    })),
  };
}

async function writeTrips(target, trips) {
  const [result] = await callFirestore(target, 'commit', buildCommitBody(target, trips));
  const writeResults = result?.writeResults;

  // Una escritura por viaje, cada una con el Timestamp de createdAt.
  if (
    !Array.isArray(writeResults) ||
    writeResults.length !== trips.length ||
    !writeResults.every((item) => item?.transformResults?.[0]?.timestampValue)
  ) {
    fail(
      'Firestore confirmó el commit con una respuesta inesperada. ' +
        'Revisa el resultado con --estado antes de repetir.'
    );
  }

  console.log(`\nCreados ${trips.length} viajes en ${target.label} (${target.projectId}).`);
  console.log(`createdAt (hora del servidor): ${writeResults[0].transformResults[0].timestampValue}`);
}

// Clasifica los mensajes de batchGet por ID: encontrado o inexistente. El
// orden de los mensajes no está garantizado; los mensajes sin found ni
// missing (por ejemplo, solo de transacción) se ignoran.
function indexBatchGetResults(messages) {
  const found = new Map();
  const missing = new Set();

  for (const message of messages) {
    if (message?.found?.name) {
      found.set(message.found.name.split('/').pop(), message.found.fields || {});
    } else if (typeof message?.missing === 'string') {
      missing.add(message.missing.split('/').pop());
    }
  }

  return { found, missing };
}

async function printStatus(target, trips) {
  const messages = await callFirestore(target, 'batchGet', {
    documents: trips.map(({ id }) => documentName(target, id)),
  });
  const { found, missing } = indexBatchGetResults(messages);

  console.table(
    trips.map(({ number, id }) => {
      const fields = found.get(id);

      if (fields) {
        return {
          '#': number,
          id,
          status: fromValue(fields.status),
          driverId: fromValue(fields.driverId) ?? '—',
          createdAt: fromValue(fields.createdAt),
        };
      }

      return {
        '#': number,
        id,
        status: missing.has(id) ? '(no existe)' : '(sin respuesta)',
        driverId: '—',
        createdAt: '—',
      };
    })
  );

  const unanswered = trips.filter(({ id }) => !found.has(id) && !missing.has(id));
  if (unanswered.length > 0) {
    fail(`Firestore no informó el estado de ${unanswered.length} viaje(s); vuelve a consultar.`);
  }
}

async function main() {
  const options = parseOptions(process.argv.slice(2));
  const trips = buildTripRequests(options.batch, options.only);
  const target = resolveTarget(options);

  console.log(`Lote ${options.batch}: ${trips.length} solicitud(es) de prueba.`);
  printPlan(trips);

  if (!options.write && !options.status) {
    console.log(
      '\nVista previa: no se escribió nada. Para crear los viajes añade ' +
        `--proyecto ${REAL_PROJECT_ID} --escribir (o --emulador --escribir).`
    );
    return;
  }

  if (!target) {
    fail(`Indica el destino: --proyecto ${REAL_PROJECT_ID} o --emulador.`);
  }

  if (target.real) {
    target.token = options.firebaseCliCredential
      ? readFirebaseCliAccessToken()
      : process.env.FIRESTORE_ACCESS_TOKEN;
    if (!target.token) {
      fail(
        'Falta la credencial. Usa --credencial-firebase-cli (sesión de Firebase CLI) o ' +
          'FIRESTORE_ACCESS_TOKEN="$(gcloud auth print-access-token)".'
      );
    }
  }

  if (options.status) {
    await printStatus(target, trips);
    return;
  }

  if (target.real) {
    await confirmRealWrite(target, trips);
  }

  await writeTrips(target, trips);
}

// Solo se ejecuta como programa. Las funciones puras se exportan para
// poder verificarlas sin conectarse a Firestore.
if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}

module.exports = {
  buildCommitBody,
  buildTripRequests,
  findApiError,
  indexBatchGetResults,
  parseJsonMessages,
  toFields,
};
