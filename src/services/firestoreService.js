// AI-assisted: see docs/AI_LOG.md #7
import {
  deleteField,
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { db } from '../config/firebase';

export async function testDriverFirestoreAccess(uid) {
  const driverRef = doc(db, 'drivers', uid);

  await setDoc(
    driverRef,
    { connectionTest: true },
    { merge: true }
  );

  const driverSnapshot = await getDoc(driverRef);

  if (!driverSnapshot.exists() || driverSnapshot.data().connectionTest !== true) {
    throw new Error('No se pudo verificar la lectura de Firestore.');
  }

  await updateDoc(driverRef, {
    connectionTest: deleteField(),
  });

  return true;
}

export async function saveDriverRegistration(uid, personalData, vehicleData) {
  const driverRef = doc(db, 'drivers', uid);

  await setDoc(
    driverRef,
    {
      personalData,
      vehicleData,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );

  return true;
}

export async function getDriverRegistration(uid) {
  const driverRef = doc(db, 'drivers', uid);
  const driverSnapshot = await getDoc(driverRef);

  if (!driverSnapshot.exists()) {
    return null;
  }

  return driverSnapshot.data();
}
