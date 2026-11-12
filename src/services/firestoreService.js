
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
import { APPROVAL_STATUS } from '../config/driverStatus';

export async function testDriverFirestoreAccess(uid) {
  const driverRef = doc(db, 'drivers', uid);

  await setDoc(
    driverRef,
    { connectionTest: true },
    { merge: true }
  );

  const driverSnapshot = await getDoc(driverRef);

  if (
    !driverSnapshot.exists() ||
    driverSnapshot.data().connectionTest !== true
  ) {
    throw new Error('No se pudo verificar la lectura de Firestore.');
  }

  await updateDoc(driverRef, {
    connectionTest: deleteField(),
  });

  return true;
}

export async function saveDriverRegistration(
  uid,
  personalData,
  vehicleData,
  documentsData
) {
  const driverRef = doc(db, 'drivers', uid);

  // El estado de aprobación solo se escribe cuando el documento aún no lo
  // tiene. Después solo puede cambiarse desde Firebase Console (ver
  // firestore.rules), de modo que guardar de nuevo no lo reinicia.
  const existingSnapshot = await getDoc(driverRef);
  const hasApprovalStatus =
    existingSnapshot.exists() &&
    existingSnapshot.data().approvalStatus !== undefined;

  await setDoc(
    driverRef,
    {
      personalData,
      vehicleData,
      documentsData,
      ...(hasApprovalStatus
        ? {}
        : {
            approvalStatus: APPROVAL_STATUS.PENDING,
            approvalRequestedAt: serverTimestamp(),
          }),
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
