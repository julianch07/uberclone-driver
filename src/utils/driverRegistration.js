// AI-assisted: see docs/AI_LOG.md #12
import { getSectionCompletion } from './registrationNavigation';

// A saved registration must have valid sections and uploaded required images.
export function hasCompleteSavedRegistration(registration) {
  if (
    !registration?.personalData ||
    !registration?.vehicleData ||
    !registration?.documentsData
  ) {
    return false;
  }

  const sections = [
    registration.personalData,
    registration.vehicleData,
    registration.documentsData,
  ];

  if (!getSectionCompletion(sections).every(Boolean)) {
    return false;
  }

  const requiredImages = [
    registration.personalData.profilePhoto,
    registration.vehicleData.vehiclePhoto,
    registration.documentsData.licensePhoto,
    registration.documentsData.soatPhoto,
  ];

  return requiredImages.every(
    (url) => typeof url === 'string' && /^https:\/\//i.test(url)
  );
}

// A saved registration remains accessible even if a document later expires.
// Current document validity is checked separately before connecting.
export function hasSavedRegistration(registration) {
  if (!registration?.personalData || !registration?.vehicleData || !registration?.documentsData) return false;
  const images = [registration.personalData.profilePhoto, registration.vehicleData.vehiclePhoto, registration.documentsData.licensePhoto, registration.documentsData.soatPhoto];
  if (!images.every(url => typeof url === 'string' && /^https:\/\//i.test(url))) return false;
  return Boolean(registration.registrationCompletedAt) || hasCompleteSavedRegistration(registration);
}
