// AI-assisted: see docs/AI_LOG.md #38
// MODO DEMOSTRACIÓN de pagos (presentación sin credenciales ni plan Blaze).
//
// Con el modo activo, la app usa los emuladores locales de Firestore y
// Functions que corren en el Mac (scripts/dev/paymentDemo.cjs) y el cobro
// digital abre un checkout simulado, identificado como MODO DEMOSTRACIÓN.
// Nada se escribe en el Firestore real.
//
// Solo se activa si se cumplen las tres condiciones:
//   - build de desarrollo (__DEV__, Expo Go): un build de producción lo ignora;
//   - EXPO_PUBLIC_PAYMENTS_DEMO=true;
//   - EXPO_PUBLIC_DEMO_EMULATOR_HOST con una IP local o localhost.
export const DEMO_FIRESTORE_PORT = 8181;
export const DEMO_FUNCTIONS_PORT = 5002;

const PRIVATE_HOST_PATTERN =
  /^(localhost|127\.0\.0\.1|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3})$/;

export function getPaymentsDemoConfig({ isDev, flag, host }) {
  const enabled =
    isDev === true &&
    flag === 'true' &&
    typeof host === 'string' &&
    PRIVATE_HOST_PATTERN.test(host);

  return Object.freeze({
    enabled,
    host: enabled ? host : null,
    firestorePort: DEMO_FIRESTORE_PORT,
    functionsPort: DEMO_FUNCTIONS_PORT,
  });
}

export const PAYMENTS_DEMO = getPaymentsDemoConfig({
  isDev: typeof __DEV__ !== 'undefined' && __DEV__ === true,
  flag: process.env.EXPO_PUBLIC_PAYMENTS_DEMO,
  host: process.env.EXPO_PUBLIC_DEMO_EMULATOR_HOST,
});

export const DEMO_LABEL = 'MODO DEMOSTRACIÓN';
