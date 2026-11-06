// AI-assisted: see docs/AI_LOG.md #5
import {
  deleteField,
  doc,
  getDoc,
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