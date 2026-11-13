
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
  deleteDoc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
} = require('firebase/firestore');

// AI-assisted: see docs/AI_LOG.md #12
// AI-assisted: see docs/AI_LOG.md #13

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

async function seedDriver(uid, status, overrides = {}) {
  await environment.withSecurityRulesDisabled(async (context) => {
    const ref = doc(context.firestore(), 'drivers', uid);
    await setDoc(ref, { ...validRegistration(status), ...overrides });
  });
}

function locationRef(uid, contextUid = uid) {
  const context = contextUid
    ? environment.authenticatedContext(contextUid)
    : environment.unauthenticatedContext();

  return doc(context.firestore(), 'driverLocations', uid);
}

function validLocation(overrides = {}) {
  return {
    latitude: 6.2442,
    longitude: -75.5812,
    accuracy: 12.5,
    updatedAt: serverTimestamp(),
    ...overrides,
  };
}

// Verifica que la operación sea rechazada con permission-denied.
// El emulador también puede incluir errores de evaluación en el mensaje.
// Esta función comprueba la denegación, no la ausencia de esos errores.
async function assertDeniedByRule(operation) {
  let error = null;

  try {
    await operation;
  } catch (caught) {
    error = caught;
  }

  assert.ok(error, 'La operación debía ser rechazada.');
  assert.equal(error.code, 'permission-denied');
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

    // ---- driverLocations/{uid} ----

    await t.test('Ubicación: el conductor aprobado y conectado puede publicarla y actualizarla', async () => {
      await seedDriver('loc-ok', 'approved', { isOnline: true });
      const ref = locationRef('loc-ok');

      await assertSucceeds(setDoc(ref, validLocation()));
      await assertSucceeds(setDoc(ref, validLocation({ latitude: 6.25 })));

      const snapshot = await getDoc(ref);
      assert.equal(snapshot.data().latitude, 6.25);
      assert.deepEqual(
        Object.keys(snapshot.data()).sort(),
        ['accuracy', 'latitude', 'longitude', 'updatedAt']
      );
    });

    await t.test('Ubicación: acepta precisión null', async () => {
      await seedDriver('loc-null-accuracy', 'approved', { isOnline: true });

      await assertSucceeds(
        setDoc(locationRef('loc-null-accuracy'), validLocation({ accuracy: null }))
      );
    });

    await t.test('Ubicación: rechaza publicar si el conductor está desconectado', async () => {
      await seedDriver('loc-offline', 'approved', { isOnline: false });
      await assertDeniedByRule(setDoc(locationRef('loc-offline'), validLocation()));

      // Control positivo: el mismo dato se acepta al conectarse.
      await environment.withSecurityRulesDisabled(async (context) => {
        await updateDoc(doc(context.firestore(), 'drivers', 'loc-offline'), {
          isOnline: true,
        });
      });

      await assertSucceeds(setDoc(locationRef('loc-offline'), validLocation()));
    });

    await t.test('Ubicación: rechaza publicar si el conductor está pendiente aunque figure conectado', async () => {
      await seedDriver('loc-pending', 'pending', { isOnline: true });
      await assertDeniedByRule(setDoc(locationRef('loc-pending'), validLocation()));
    });

    await t.test('Ubicación: rechaza publicar si no existe drivers/{uid}', async () => {
      await assertDeniedByRule(setDoc(locationRef('loc-no-driver'), validLocation()));
    });

    await t.test('Ubicación: tras desconectarse ya no se puede publicar, pero sí borrar', async () => {
      await seedDriver('loc-disconnect', 'approved', { isOnline: true });
      const ref = locationRef('loc-disconnect');

      await assertSucceeds(setDoc(ref, validLocation()));

      await assertSucceeds(updateDoc(ownerRef('loc-disconnect'), {
        isOnline: false,
        availabilityUpdatedAt: serverTimestamp(),
      }));

      await assertDeniedByRule(setDoc(ref, validLocation({ latitude: 6.3 })));
      await assertSucceeds(deleteDoc(ref));
    });

    await t.test('Ubicación: otro usuario no puede leer ni escribir', async () => {
      await seedDriver('loc-owner', 'approved', { isOnline: true });
      await assertSucceeds(setDoc(locationRef('loc-owner'), validLocation()));

      await assertDeniedByRule(getDoc(locationRef('loc-owner', 'intruder')));
      await assertDeniedByRule(setDoc(locationRef('loc-owner', 'intruder'), validLocation()));
      await assertDeniedByRule(deleteDoc(locationRef('loc-owner', 'intruder')));
      await assertSucceeds(getDoc(locationRef('loc-owner')));
    });

    await t.test('Ubicación: un usuario no autenticado no puede leer ni escribir', async () => {
      await seedDriver('loc-anon', 'approved', { isOnline: true });

      await assertDeniedByRule(getDoc(locationRef('loc-anon', null)));
      await assertDeniedByRule(setDoc(locationRef('loc-anon', null), validLocation()));
    });

    const invalidLocations = [
      ['latitud mayor a 90', { latitude: 90.0001 }],
      ['latitud menor a -90', { latitude: -90.0001 }],
      ['longitud mayor a 180', { longitude: 180.0001 }],
      ['longitud menor a -180', { longitude: -180.0001 }],
      ['latitud como texto', { latitude: '6.2' }],
      ['longitud como texto', { longitude: '-75.5' }],
      ['latitud NaN', { latitude: NaN }],
      ['longitud Infinity', { longitude: Infinity }],
      ['precisión negativa', { accuracy: -1 }],
      ['precisión como texto', { accuracy: '10' }],
      ['fecha enviada por el cliente', { updatedAt: new Date() }],
      ['campo adicional', { speed: 10 }],
    ];

    for (const [label, override] of invalidLocations) {
      await t.test(`Ubicación: rechaza ${label}`, async () => {
        const uid = `loc-invalid-${label.replace(/\W+/g, '-')}`;
        await seedDriver(uid, 'approved', { isOnline: true });

        await assertDeniedByRule(setDoc(locationRef(uid), validLocation(override)));

        // Control positivo: sin la anomalía, el mismo documento se acepta.
        await assertSucceeds(setDoc(locationRef(uid), validLocation()));
      });
    }

    await t.test('Ubicación: rechaza un documento sin precisión', async () => {
      await seedDriver('loc-no-accuracy', 'approved', { isOnline: true });
      const data = validLocation();
      delete data.accuracy;

      await assertDeniedByRule(setDoc(locationRef('loc-no-accuracy'), data));
    });

    await t.test('Ubicación: el estado de aprobación sigue sin poder cambiarse', async () => {
      await seedDriver('loc-approval', 'pending', { isOnline: false });

      await assertDeniedByRule(updateDoc(ownerRef('loc-approval'), {
        approvalStatus: 'approved',
      }));
    });
  } finally {
    await environment.cleanup();
  }
});
