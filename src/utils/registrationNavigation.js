// AI-assisted: see docs/AI_LOG.md #11
import {
  validatePersonalData,
  validateVehicleData,
  validateDocumentsPayments,
} from './registrationValidation';

const SECTION_VALIDATORS = [
  validatePersonalData,
  validateVehicleData,
  validateDocumentsPayments,
];

function getSectionErrors(sectionIndex, sectionsData) {
  return SECTION_VALIDATORS[sectionIndex](sectionsData[sectionIndex]);
}

// Indica, para cada sección, si cumple todas las validaciones actuales.
// sectionsData = [personalData, vehicleData, documentsData]
export function getSectionCompletion(sectionsData) {
  return SECTION_VALIDATORS.map(
    (_, index) => Object.keys(getSectionErrors(index, sectionsData)).length === 0
  );
}

// Reglas de navegación entre secciones:
// - Ir a la misma sección o a una anterior siempre está permitido y no
//   borra ni valida nada: los datos viven en el estado de la pantalla.
// - Ir a una sección posterior exige que todas las secciones anteriores a
//   la destino estén completas. Si alguna no lo está, se redirige a la
//   primera incompleta y se devuelven sus errores.
// Devuelve { step, errors, blockedStep }; blockedStep es null si no hubo
// redirección.
export function resolveStepNavigation(currentStep, targetStep, sectionsData) {
  if (targetStep <= currentStep) {
    return { step: targetStep, errors: {}, blockedStep: null };
  }

  for (let index = 0; index < targetStep; index += 1) {
    const errors = getSectionErrors(index, sectionsData);

    if (Object.keys(errors).length > 0) {
      return { step: index, errors, blockedStep: index };
    }
  }

  return { step: targetStep, errors: {}, blockedStep: null };
}
