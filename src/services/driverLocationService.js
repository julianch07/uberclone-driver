// AI-assisted: see docs/AI_LOG.md #13
import {
  deleteDoc,
  doc,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import {
  isValidCoordinates,
  shouldPublishLocation,
} from '../utils/locationLogic';

const COLLECTION = 'driverLocations';

// Escribe el documento completo driverLocations/{uid}. No se usa merge para
// que el documento tenga siempre exactamente estos cuatro campos.
export async function writeDriverLocation(uid, position) {
  await setDoc(doc(db, COLLECTION, uid), {
    latitude: position.latitude,
    longitude: position.longitude,
    accuracy:
      typeof position.accuracy === 'number' ? position.accuracy : null,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteDriverLocation(uid) {
  await deleteDoc(doc(db, COLLECTION, uid));
}

// Controla cuándo se publica la ubicación. Mientras no se llame a start(), o
// después de stop(), publish() no escribe nada: así una posición GPS que
// llega tarde no se publica una vez que el conductor se desconectó.
export function createLocationPublisher({
  uid,
  writer = writeDriverLocation,
  remover = deleteDriverLocation,
  now = Date.now,
  options,
}) {
  let active = false;
  let blocked = false;
  let last = null;
  let inFlight = null;
  let generation = 0;

  return {
    start() {
      active = true;
      blocked = false;
      generation += 1;
    },

    stop() {
      active = false;
      generation += 1;
      last = null;
    },

    isActive() {
      return active;
    },

    async publish(position) {
      if (!active) {
        return { status: 'skipped', reason: 'inactive' };
      }

      if (blocked) {
        return { status: 'skipped', reason: 'blocked' };
      }

      if (!isValidCoordinates(position)) {
        return { status: 'skipped', reason: 'invalid' };
      }

      if (inFlight) {
        return { status: 'skipped', reason: 'busy' };
      }

      const decision = shouldPublishLocation(last, position, now(), options);

      if (!decision.publish) {
        return { status: 'skipped', reason: decision.reason };
      }

      const startedIn = generation;
      const write = writer(uid, position);
      inFlight = write;

      try {
        await write;

        if (generation === startedIn && active) {
          last = {
            latitude: position.latitude,
            longitude: position.longitude,
            at: now(),
          };
        }

        return { status: 'published', reason: decision.reason };
      } catch (error) {
        const code = error && error.code;

        // permission-denied: el servidor ya no considera al conductor
        // conectado; no se reintenta hasta una nueva llamada a start().
        if (code === 'permission-denied') {
          blocked = true;
        }

        return {
          status: 'error',
          code: code || 'unknown',
          message:
            code === 'permission-denied'
              ? 'No se publicó tu ubicación porque tu cuenta no está conectada.'
              : 'No se pudo publicar tu ubicación. Revisa tu conexión.',
        };
      } finally {
        inFlight = null;
      }
    },

    // Deja de publicar, espera la escritura en curso y elimina la ubicación
    // guardada. Devuelve false si no se pudo eliminar.
    async clear() {
      active = false;
      generation += 1;
      last = null;

      const pending = inFlight;

      if (pending) {
        try {
          await pending;
        } catch (error) {
          // El error de esa escritura ya se informó en publish().
        }
      }

      try {
        await remover(uid);
        return true;
      } catch (error) {
        console.error('Error al eliminar la ubicación publicada:', error);
        return false;
      }
    },
  };
}
