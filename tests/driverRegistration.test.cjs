// AI-assisted: see docs/AI_LOG.md #15
const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { loadModule } = require('./helpers/loadModule.cjs');

const modulePath = path.join(
  __dirname, '..', 'src', 'utils', 'driverRegistration.js'
);

function validRegistration() {
  const futureDate = new Date();
  futureDate.setFullYear(futureDate.getFullYear() + 2);
  const validExpiration = futureDate.toISOString();

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
      licenseExpiration: validExpiration,
      soatPhoto: 'https://example.com/soat.jpg',
      soatExpiration: validExpiration,
      mercadoPagoEmail: 'juan@example.com',
      acceptedTerms: true,
    },
  };
}

const { hasCompleteSavedRegistration } = loadModule(modulePath);

test('Acepta un registro completo con documentos vigentes', () => {
  assert.equal(
    hasCompleteSavedRegistration(validRegistration()),
    true
  );
});

test('Rechaza una licencia vencida', () => {
  const registration = validRegistration();
  registration.documentsData.licenseExpiration = '2020-05-15T00:00:00.000Z';

  assert.equal(hasCompleteSavedRegistration(registration), false);
});

test('Rechaza un SOAT vencido', () => {
  const registration = validRegistration();
  registration.documentsData.soatExpiration = '2020-05-15T00:00:00.000Z';

  assert.equal(hasCompleteSavedRegistration(registration), false);
});

test('Rechaza fechas de vencimiento inválidas', () => {
  const registration = validRegistration();
  registration.documentsData.licenseExpiration = 'fecha-invalida';

  assert.equal(hasCompleteSavedRegistration(registration), false);
});

test('Rechaza un registro incompleto', () => {
  const registration = validRegistration();
  delete registration.vehicleData.plate;

  assert.equal(hasCompleteSavedRegistration(registration), false);
});

test('Rechaza fotografías obligatorias ausentes', () => {
  const registration = validRegistration();
  registration.documentsData.soatPhoto = '';

  assert.equal(hasCompleteSavedRegistration(registration), false);
});
