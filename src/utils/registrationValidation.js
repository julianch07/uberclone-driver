// AI-assisted: see docs/AI_LOG.md #6

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const PERSONAL_DATA_FIELDS = [
  'profilePhoto',
  'fullName',
  'identityDocument',
  'phone',
  'birthDate',
  'gender',
  'email',
  'language',
];

const VEHICLE_DATA_FIELDS = [
  'vehiclePhoto',
  'category',
  'plate',
  'make',
  'model',
  'year',
  'color',
  'passengerCapacity',
];

export function validatePersonalData(values) {
  const errors = {};

  PERSONAL_DATA_FIELDS.forEach((field) => {
    if (!String(values[field] || '').trim()) {
      errors[field] = 'Este campo es obligatorio.';
    }
  });

  const fullName = (values.fullName || '').trim();

  if (fullName && !/^[a-zA-ZÀ-ÿ\s]+$/.test(fullName)) {
    errors.fullName = 'Ingresa únicamente letras y espacios.';
  } else if (fullName.length > 50) {
    errors.fullName = 'El nombre no puede superar 50 caracteres.';
  }

  const identityDocument = values.identityDocument || '';

  if (identityDocument && !/^\d{6,10}$/.test(identityDocument)) {
    errors.identityDocument =
      'El documento debe contener entre 6 y 10 números.';
  }

  const phone = values.phone || '';

  if (phone && !/^\d{10}$/.test(phone)) {
    errors.phone = 'El celular debe contener exactamente 10 números.';
  }

  if (values.birthDate) {
    const birthDate = new Date(values.birthDate);

    if (Number.isNaN(birthDate.getTime())) {
      errors.birthDate = 'Selecciona una fecha válida.';
    } else {
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();

      const hasHadBirthdayThisYear =
        today.getMonth() > birthDate.getMonth() ||
        (today.getMonth() === birthDate.getMonth() &&
          today.getDate() >= birthDate.getDate());

      if (!hasHadBirthdayThisYear) {
        age -= 1;
      }

      if (age < 18) {
        errors.birthDate = 'Debes tener al menos 18 años.';
      }
    }
  }

  if (values.email && !EMAIL_REGEX.test(values.email.trim())) {
    errors.email = 'Ingresa un correo electrónico válido.';
  }

  return errors;
}

export function validateVehicleData(values) {
  const errors = {};

  VEHICLE_DATA_FIELDS.forEach((field) => {
    if (!String(values[field] || '').trim()) {
      errors[field] = 'Este campo es obligatorio.';
    }
  });

  const plate = (values.plate || '').trim().toUpperCase();

  if (plate && !/^[A-Z]{3}\d{3}$/.test(plate)) {
    errors.plate = 'La placa debe tener el formato ABC123.';
  }

  const make = (values.make || '').trim();

  if (make.length > 30) {
    errors.make = 'La marca no puede superar 30 caracteres.';
  }

  const model = (values.model || '').trim();

  if (model.length > 30) {
    errors.model = 'El modelo no puede superar 30 caracteres.';
  }

  const year = values.year || '';

  if (year) {
    const currentYear = new Date().getFullYear();

    if (!/^\d{4}$/.test(year)) {
      errors.year = 'El año debe contener exactamente 4 números.';
    } else if (Number(year) > currentYear) {
      errors.year = 'El año no puede ser superior al año actual.';
    } else if (Number(year) < 1900) {
      errors.year = 'Ingresa un año válido.';
    }
  }

  const passengerCapacity = values.passengerCapacity || '';

  if (passengerCapacity) {
    if (!/^\d+$/.test(passengerCapacity) || Number(passengerCapacity) < 1) {
      errors.passengerCapacity = 'Ingresa una capacidad válida.';
    } else if (
      values.category === 'XL' &&
      Number(passengerCapacity) < 6
    ) {
      errors.passengerCapacity =
        'Los vehículos XL deben tener capacidad mínima para 6 pasajeros.';
    }
  }

  return errors;
}