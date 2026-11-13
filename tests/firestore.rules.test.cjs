
const fs = require('node:fs');
const { test } = require('node:test');
const assert = require('node:assert/strict');

const {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails,
} = require('@firebase/rules-unit-testing');

const {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
} = require('firebase/firestore');

// AI-assisted: see docs/AI_LOG.md #12

const PROJECT_ID = 'demo-uberclone-driver';
let environment;

function validRegistration(status = 'pending') {
  return {
    personalData: {
      profilePhoto: 'https://example.com/profile.jpg',
      fullName: 'Juan Carlos Perez',
      identityDocument: '1234567890',
      phone: '3001234567',
      birthDate: '2000-05-15T00:00:00.000Z',
      gender: 'Masculino',
      email: 'juan@example.com',
      language: 'Español',
    },
    vehicleData: {
      vehiclePhoto: 'https://example.com/vehicle.jpg',
      category: 'Económico',
      plate: 'ABC123',
      make: 'Renault',
      model: 'Logan',
      year: '2022',
      color: 'Blanco',
      passengerCapacity: '4',
    },
    documentsData: {
      licenseNumber: '123456789',
      licensePhoto: 'https://example.com/license.jpg',
      licenseExpiration: '2030-05-15T00:00:00.000Z',
      soatPhoto: 'https://example.com/soat.jpg',
      soatExpiration: '2030-05-15T00:00:00.000Z',
      technicalReviewPhoto: '',
      technicalReviewExpiration: '',
      mercadoPagoEmail: 'juan@example.com',
      acceptedTerms: true,
    },
    approvalStatus: status,
    approvalRequestedAt: new Date(),
    registrationCompletedAt: new Date(),
    updatedAt: new Date(),
    isOnline: false,
  };
}

async function seedDriver(uid, status) {
  await environment.withSecurityRulesDisabled(async (context) => {
    const ref = doc(context.firestore(), 'drivers', uid);
    await setDoc(ref, validRegistration(status));
  });
}

function ownerRef(uid) {
  const context = environment.authenticatedContext(uid);
  return doc(context.firestore(), 'drivers', uid);
}

test('Reglas de seguridad de UberClone Driver', async (t) => {
  environment = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      host: '127.0.0.1',
      port: 8080,
      rules: fs.readFileSync('firestore.rules', 'utf8'),
    },
  });

  try {
    // Clear previous test documents before running the suite.
    await environment.clearFirestore();

    await t.test('Permite crear un registro pendiente', async () => {
      const ref = ownerRef('driver-create');
      const registration = validRegistration('pending');

      await assertSucceeds(setDoc(ref, {
        ...registration,
        approvalRequestedAt: serverTimestamp(),
        registrationCompletedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }));
    });

    await t.test('Rechaza un registro sin nombre', async () => {
      const ref = ownerRef('driver-no-name');
      const registration = validRegistration();
      delete registration.personalData.fullName;

      await assertFails(setDoc(ref, {
        ...registration,
        approvalRequestedAt: serverTimestamp(),
        registrationCompletedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }));
    });

    await t.test('Rechaza un registro sin placa', async () => {
      const ref = ownerRef('driver-no-plate');
      const registration = validRegistration();
      delete registration.vehicleData.plate;

      await assertFails(setDoc(ref, {
        ...registration,
        approvalRequestedAt: serverTimestamp(),
        registrationCompletedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }));
    });

    await t.test('Rechaza un registro sin aceptar términos', async () => {
      const ref = ownerRef('driver-no-terms');
      const registration = validRegistration();
      registration.documentsData.acceptedTerms = false;

      await assertFails(setDoc(ref, {
        ...registration,
        approvalRequestedAt: serverTimestamp(),
        registrationCompletedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }));
    });

    await t.test('Rechaza un registro con placa vacía', async () => {
      const ref = ownerRef('driver-empty-plate');
      const registration = validRegistration();
      registration.vehicleData.plate = '';

      await assertFails(setDoc(ref, {
        ...registration,
        approvalRequestedAt: serverTimestamp(),
        registrationCompletedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }));
    });

    await t.test('Impide conectar a un conductor pendiente', async () => {
      await seedDriver('driver-pending', 'pending');
      const ref = ownerRef('driver-pending');

      await assertFails(updateDoc(ref, {
        isOnline: true,
        availabilityUpdatedAt: serverTimestamp(),
      }));
    });

    await t.test('Permite conectar a un conductor aprobado', async () => {
      await seedDriver('driver-approved', 'approved');
      const ref = ownerRef('driver-approved');

      await assertSucceeds(updateDoc(ref, {
        isOnline: true,
        availabilityUpdatedAt: serverTimestamp(),
      }));
    });

    await t.test('Impide que el conductor se apruebe a sí mismo', async () => {
      await seedDriver('driver-self-approval', 'pending');
      const ref = ownerRef('driver-self-approval');

      await assertFails(updateDoc(ref, {
        approvalStatus: 'approved',
      }));
    });

    await t.test('Impide modificar el registro de otro conductor', async () => {
      await seedDriver('driver-owner', 'approved');

      const ref = doc(
        environment.authenticatedContext('intruder').firestore(),
        'drivers',
        'driver-owner'
      );

      await assertFails(updateDoc(ref, {
        isOnline: true,
        availabilityUpdatedAt: serverTimestamp(),
      }));
    });

    await t.test('Permite desconectar a un conductor aprobado', async () => {
      await seedDriver('driver-disconnect', 'approved');
      const ref = ownerRef('driver-disconnect');

      await assertSucceeds(updateDoc(ref, {
        isOnline: true,
        availabilityUpdatedAt: serverTimestamp(),
      }));

      await assertSucceeds(updateDoc(ref, {
        isOnline: false,
        availabilityUpdatedAt: serverTimestamp(),
      }));

      const snapshot = await getDoc(ref);

      assert.equal(snapshot.data().isOnline, false);
      assert.equal(snapshot.data().approvalStatus, 'approved');
    });

    await t.test('Permite actualizar el registro sin perder la aprobación', async () => {
      await seedDriver('driver-update', 'approved');
      const ref = ownerRef('driver-update');

      await assertSucceeds(updateDoc(ref, {
        personalData: {
          ...validRegistration('approved').personalData,
          profilePhoto: 'https://example.com/new-profile.jpg',
        },
        isOnline: false,
        registrationCompletedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }));

      const snapshot = await getDoc(ref);

      assert.equal(snapshot.exists(), true);

      assert.equal(
        snapshot.data().approvalStatus,
        'approved'
      );

      assert.equal(
        snapshot.data().personalData.profilePhoto,
        'https://example.com/new-profile.jpg'
      );

      assert.equal(snapshot.data().isOnline, false);
    });
  } finally {
    await environment.cleanup();
  }
});
