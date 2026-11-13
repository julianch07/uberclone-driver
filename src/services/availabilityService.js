// AI-assisted: see docs/AI_LOG.md #12
// AI-assisted: see docs/AI_LOG.md #14
import { doc, runTransaction, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { canDriverGoOnline } from '../config/driverStatus';
import { hasCompleteSavedRegistration } from '../utils/driverRegistration';

export async function setDriverAvailability(uid, online) {
  const ref = doc(db, 'drivers', uid);

  if (online) {
    await runTransaction(db, async (transaction) => {
      const snapshot = await transaction.get(ref);

      if (!snapshot.exists()) {
        throw new Error('No se encontró el registro del conductor.');
      }

      const registration = snapshot.data();

      if (!canDriverGoOnline(registration) || !hasCompleteSavedRegistration(registration)) {
        throw new Error('Debes tener un registro completo y aprobado para conectarte.');
      }

      if (registration.registrationCompletedAt == null) {
        transaction.update(ref, {
          registrationCompletedAt: serverTimestamp(),
        });
      }
    });
  }

  await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(ref);

    if (!snapshot.exists()) {
      throw new Error('No se encontró el registro del conductor.');
    }

    const registration = snapshot.data();

    if (online && (!canDriverGoOnline(registration) || !hasCompleteSavedRegistration(registration))) {
      throw new Error('Debes tener un registro completo y aprobado para conectarte.');
    }

    transaction.update(ref, {
      isOnline: Boolean(online),
      availabilityUpdatedAt: serverTimestamp(),
    });
  });
}
