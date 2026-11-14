
// AI-assisted: see docs/AI_LOG.md #5
import { initializeApp, getApp, getApps } from 'firebase/app';
import {
  getAuth,
  initializeAuth,
  getReactNativePersistence,
} from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore';
// AI-assisted: see docs/AI_LOG.md #37
import { connectFunctionsEmulator, getFunctions } from 'firebase/functions';
// AI-assisted: see docs/AI_LOG.md #38
import { PAYMENTS_DEMO } from './paymentsDemo';

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

let auth;

try {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
} catch (error) {
  if (error.code === 'auth/already-initialized') {
    auth = getAuth(app);
  } else {
    throw error;
  }
}

const db = getFirestore(app);

// AI-assisted: see docs/AI_LOG.md #37
// Funciones del backend de pagos (functions/index.js), misma región.
const functions = getFunctions(app, 'us-central1');

// AI-assisted: see docs/AI_LOG.md #38
// MODO DEMOSTRACIÓN: Firestore y Functions de los emuladores del Mac. La
// autenticación anónima sigue siendo la real (solo identifica al conductor).
if (PAYMENTS_DEMO.enabled) {
  connectFirestoreEmulator(db, PAYMENTS_DEMO.host, PAYMENTS_DEMO.firestorePort);
  connectFunctionsEmulator(functions, PAYMENTS_DEMO.host, PAYMENTS_DEMO.functionsPort);
  console.warn(
    `MODO DEMOSTRACIÓN: Firestore y Functions en los emuladores de ${PAYMENTS_DEMO.host}. ` +
      'Los pagos son simulados y no se escribe en el Firestore real.'
  );
}

export { app, auth, db, functions };
