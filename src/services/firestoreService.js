
// AI-assisted: see docs/AI_LOG.md #7
// AI-assisted: see docs/AI_LOG.md #9
// AI-assisted: see docs/AI_LOG.md #12
import {
  doc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { APPROVAL_STATUS } from '../config/driverStatus';

export async function saveDriverRegistration(
  uid,
  personalData,
  vehicleData,
  documentsData
) {
  const driverRef = doc(db, 'drivers', uid);

  // AI-assisted: see docs/AI_LOG.md #10
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

      // Al guardar o actualizar el registro, el conductor se desconecta.
      // Debe volver a verificar sus requisitos antes de conectarse.
      isOnline: false,
      registrationCompletedAt: serverTimestamp(),

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

export function subscribeToDriverRegistration(uid, onData, onError) {
  const driverRef = doc(db, 'drivers', uid);

  return onSnapshot(
    driverRef,
    (snapshot) => {
      onData(snapshot.exists() ? snapshot.data() : null);
    },
    (error) => {
      console.error('Error al escuchar el registro:', error);
      if (onError) {
        onError(error);
      }
    }
  );
}
