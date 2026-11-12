// AI-assisted: see docs/AI_LOG.md
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import PersonalDataForm from '../../components/registration/PersonalDataForm';
import VehicleDataForm from '../../components/registration/VehicleDataForm';
import DocumentsPaymentsForm from '../../components/registration/DocumentsPaymentsForm';

import { uploadDriverImage } from '../../services/cloudinaryService';
import {
  getDriverRegistration,
  saveDriverRegistration,
} from '../../services/firestoreService';

import {
  APPROVAL_STATUS,
  APPROVAL_STATUS_INFO,
  getApprovalStatus,
} from '../../config/driverStatus';

import {
  validatePersonalData,
  validateVehicleData,
  validateDocumentsPayments,
} from '../../utils/registrationValidation';
import {
  getSectionCompletion,
  resolveStepNavigation,
} from '../../utils/registrationNavigation';

const REGISTRATION_STEPS = [
  {
    id: 1,
    title: 'Datos personales',
    description: 'Información básica del conductor',
  },
  {
    id: 2,
    title: 'Vehículo',
    description: 'Información del vehículo que utilizarás',
  },
  {
    id: 3,
    title: 'Documentos y pagos',
    description: 'Documentación del conductor y configuración de pagos',
  },
];

const INITIAL_PERSONAL_DATA = {
  profilePhoto: '',
  fullName: '',
  identityDocument: '',
  phone: '',
  birthDate: '',
  gender: '',
  email: '',
  language: '',
};

const INITIAL_VEHICLE_DATA = {
  vehiclePhoto: '',
  category: '',
  plate: '',
  make: '',
  model: '',
  year: '',
  color: '',
  passengerCapacity: '',
};

const INITIAL_DOCUMENTS_DATA = {
  licenseNumber: '',
  licensePhoto: '',
  soatPhoto: '',
  technicalReviewPhoto: '',
  licenseExpiration: '',
  soatExpiration: '',
  technicalReviewExpiration: '',
  mercadoPagoEmail: '',
  acceptedTerms: false,
};

export default function RegistrationScreen({ uid }) {
  const [currentStep, setCurrentStep] = useState(0);

  const [personalData, setPersonalData] = useState(
    INITIAL_PERSONAL_DATA
  );

  const [vehicleData, setVehicleData] = useState(
    INITIAL_VEHICLE_DATA
  );

  const [documentsData, setDocumentsData] = useState(
    INITIAL_DOCUMENTS_DATA
  );

  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [statusType, setStatusType] = useState('');
  const [approvalStatus, setApprovalStatus] = useState(null);
  const [isRefreshingStatus, setIsRefreshingStatus] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadRegistration = async () => {
      try {
        const registration = await getDriverRegistration(uid);

        if (!isMounted || !registration) {
          return;
        }

        setApprovalStatus(getApprovalStatus(registration));

        setPersonalData({
          ...INITIAL_PERSONAL_DATA,
          ...(registration.personalData || {}),
        });

        setVehicleData({
          ...INITIAL_VEHICLE_DATA,
          ...(registration.vehicleData || {}),
        });

        setDocumentsData({
          ...INITIAL_DOCUMENTS_DATA,
          ...(registration.documentsData || {}),
        });
      } catch (error) {
        console.error('Error al recuperar el registro:', error);

        if (isMounted) {
          setStatusType('error');
          setStatusMessage(
            'No se pudieron recuperar los datos guardados. Puedes continuar con el registro.'
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadRegistration();

    return () => {
      isMounted = false;
    };
  }, [uid]);

  const clearFieldError = (field) => {
    setErrors((previousErrors) => ({
      ...previousErrors,
      [field]: '',
    }));

    setStatusMessage('');
  };

  const handlePersonalDataChange = (field, value) => {
    setPersonalData((previousData) => ({
      ...previousData,
      [field]: value,
    }));

    clearFieldError(field);
  };

  const handleVehicleDataChange = (field, value) => {
    setVehicleData((previousData) => ({
      ...previousData,
      [field]: value,
    }));

    clearFieldError(field);
  };

  const handleDocumentsDataChange = (field, value) => {
    setDocumentsData((previousData) => ({
      ...previousData,
      [field]: value,
    }));

    clearFieldError(field);
  };

  const handleImageError = (message) => {
    setErrors((previousErrors) => ({
      ...previousErrors,
      profilePhoto: message,
    }));
  };

  const handleVehicleImageError = (message) => {
    setErrors((previousErrors) => ({
      ...previousErrors,
      vehiclePhoto: message,
    }));
  };

  const handleDocumentsError = (field, message) => {
    setErrors((previousErrors) => ({
      ...previousErrors,
      [field]: message,
    }));
  };

  const handleNext = () => {
    if (isSaving || currentStep >= 2) {
      return;
    }

    let validationErrors = {};

    if (currentStep === 0) {
      validationErrors = validatePersonalData(personalData);
    } else if (currentStep === 1) {
      validationErrors = validateVehicleData(vehicleData);
    }

    setErrors(validationErrors);
    setStatusMessage('');

    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    setCurrentStep((previousStep) => previousStep + 1);
  };

  const sectionCompletion = useMemo(
    () => getSectionCompletion([personalData, vehicleData, documentsData]),
    [personalData, vehicleData, documentsData]
  );

  const handleStepPress = (targetStep) => {
    if (isSaving || targetStep === currentStep) {
      return;
    }

    const navigation = resolveStepNavigation(currentStep, targetStep, [
      personalData,
      vehicleData,
      documentsData,
    ]);

    setErrors(navigation.errors);
    setCurrentStep(navigation.step);

    if (navigation.blockedStep !== null) {
      setStatusType('error');
      setStatusMessage(
        `Completa la sección "${
          REGISTRATION_STEPS[navigation.blockedStep].title
        }" antes de continuar.`
      );
    } else {
      setStatusMessage('');
    }
  };

  const uploadImageIfNeeded = async (uri, publicId) => {
    if (!uri || /^https?:\/\//i.test(uri)) {
      return uri;
    }

    return uploadDriverImage(uri, publicId);
  };

  const handleSaveRegistration = async () => {
    if (isSaving) {
      return;
    }

    const personalDataErrors = validatePersonalData(personalData);

    if (Object.keys(personalDataErrors).length > 0) {
      setErrors(personalDataErrors);
      setCurrentStep(0);
      setStatusMessage('');
      return;
    }

    const vehicleDataErrors = validateVehicleData(vehicleData);

    if (Object.keys(vehicleDataErrors).length > 0) {
      setErrors(vehicleDataErrors);
      setCurrentStep(1);
      setStatusMessage('');
      return;
    }

    const documentsDataErrors = validateDocumentsPayments(documentsData);

    setErrors(documentsDataErrors);

    if (Object.keys(documentsDataErrors).length > 0) {
      setStatusMessage('');
      return;
    }

    setIsSaving(true);
    setStatusMessage('');
    setStatusType('');

    try {
      const profilePhotoUrl = await uploadImageIfNeeded(
        personalData.profilePhoto,
        `profile-${uid}`
      );

      const vehiclePhotoUrl = await uploadImageIfNeeded(
        vehicleData.vehiclePhoto,
        `vehicle-${uid}`
      );

      const licensePhotoUrl = await uploadImageIfNeeded(
        documentsData.licensePhoto,
        `license-${uid}`
      );

      const soatPhotoUrl = await uploadImageIfNeeded(
        documentsData.soatPhoto,
        `soat-${uid}`
      );

      const technicalReviewPhotoUrl = await uploadImageIfNeeded(
        documentsData.technicalReviewPhoto,
        `technical-review-${uid}`
      );

      const updatedPersonalData = {
        ...personalData,
        profilePhoto: profilePhotoUrl,
      };

      const updatedVehicleData = {
        ...vehicleData,
        vehiclePhoto: vehiclePhotoUrl,
      };

      const updatedDocumentsData = {
        ...documentsData,
        licensePhoto: licensePhotoUrl,
        soatPhoto: soatPhotoUrl,
        technicalReviewPhoto: technicalReviewPhotoUrl,
      };

      await saveDriverRegistration(
        uid,
        updatedPersonalData,
        updatedVehicleData,
        updatedDocumentsData
      );

      setPersonalData(updatedPersonalData);
      setVehicleData(updatedVehicleData);
      setDocumentsData(updatedDocumentsData);

      try {
        const savedRegistration = await getDriverRegistration(uid);
        setApprovalStatus(getApprovalStatus(savedRegistration));
      } catch (statusError) {
        console.error('Error al leer el estado de aprobación:', statusError);
      }

      setStatusType('success');
      setStatusMessage(
        '¡Tu registro se guardó correctamente!'
      );
    } catch (error) {
      console.error('Error al guardar el registro:', error);

      setStatusType('error');
      setStatusMessage(
        error.message ||
          'No fue posible guardar el registro. Inténtalo nuevamente.'
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleRefreshApprovalStatus = async () => {
    if (isRefreshingStatus) {
      return;
    }

    setIsRefreshingStatus(true);

    try {
      const registration = await getDriverRegistration(uid);
      setApprovalStatus(getApprovalStatus(registration));
    } catch (error) {
      console.error('Error al actualizar el estado de aprobación:', error);
      setStatusType('error');
      setStatusMessage('No se pudo actualizar el estado. Inténtalo nuevamente.');
    } finally {
      setIsRefreshingStatus(false);
    }
  };

  const handleBack = () => {
    if (currentStep > 0 && !isSaving) {
      setCurrentStep((previousStep) => previousStep - 1);
      setErrors({});
      setStatusMessage('');
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#276EF1" />
        <Text style={styles.loadingText}>
          Recuperando el registro del conductor...
        </Text>
      </View>
    );
  }

  const currentRegistrationStep = REGISTRATION_STEPS[currentStep];

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.brand}>UBERCLONE DRIVER</Text>

      <Text style={styles.heading}>Registro de conductor</Text>

      <Text style={styles.subtitle}>
        Completa los siguientes pasos para registrar tu información.
      </Text>

      {approvalStatus ? (
        <View
          style={[
            styles.approvalBanner,
            approvalStatus === APPROVAL_STATUS.APPROVED &&
              styles.approvalBannerApproved,
            approvalStatus === APPROVAL_STATUS.REJECTED &&
              styles.approvalBannerRejected,
          ]}
        >
          <Text style={styles.approvalLabel}>
            Estado: {APPROVAL_STATUS_INFO[approvalStatus].label}
          </Text>
          <Text style={styles.approvalMessage}>
            {APPROVAL_STATUS_INFO[approvalStatus].message}
          </Text>
          <TouchableOpacity
            onPress={handleRefreshApprovalStatus}
            disabled={isRefreshingStatus}
            activeOpacity={0.7}
          >
            {isRefreshingStatus ? (
              <ActivityIndicator size="small" color="#276EF1" />
            ) : (
              <Text style={styles.approvalRefresh}>Actualizar estado</Text>
            )}
          </TouchableOpacity>
        </View>
      ) : null}

      <View style={styles.progressContainer}>
        {REGISTRATION_STEPS.map((step, index) => {
          const isCurrent = index === currentStep;
          const isComplete = sectionCompletion[index];

          return (
            <TouchableOpacity
              key={step.id}
              style={styles.stepContainer}
              onPress={() => handleStepPress(index)}
              disabled={isSaving}
              activeOpacity={0.7}
              accessibilityRole="tab"
              accessibilityState={{ selected: isCurrent, disabled: isSaving }}
              accessibilityLabel={`${step.title}, ${
                isComplete ? 'completa' : 'incompleta'
              }`}
            >
              <View
                style={[
                  styles.stepCircle,
                  isComplete && styles.completedStepCircle,
                  isCurrent && styles.activeStepCircle,
                ]}
              >
                <Text
                  style={[
                    styles.stepNumber,
                    (isComplete || isCurrent) && styles.activeStepNumber,
                  ]}
                >
                  {isComplete && !isCurrent ? '✓' : step.id}
                </Text>
              </View>

              <Text
                style={[
                  styles.stepTitle,
                  isCurrent && styles.activeStepTitle,
                ]}
              >
                {step.title}
              </Text>

              <Text
                style={[
                  styles.stepStatus,
                  isComplete && styles.stepStatusComplete,
                ]}
              >
                {isComplete ? 'Completa' : 'Incompleta'}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.card}>
        <Text style={styles.stepLabel}>
          PASO {currentRegistrationStep.id} DE 3
        </Text>

        <Text style={styles.cardTitle}>
          {currentRegistrationStep.title}
        </Text>

        <Text style={styles.cardDescription}>
          {currentRegistrationStep.description}
        </Text>

        {currentStep === 0 && (
          <PersonalDataForm
            values={personalData}
            errors={errors}
            onChange={handlePersonalDataChange}
            onError={handleImageError}
          />
        )}

        {currentStep === 1 && (
          <VehicleDataForm
            values={vehicleData}
            errors={errors}
            onChange={handleVehicleDataChange}
            onError={handleVehicleImageError}
          />
        )}

        {currentStep === 2 && (
          <DocumentsPaymentsForm
            values={documentsData}
            errors={errors}
            onChange={handleDocumentsDataChange}
            onError={handleDocumentsError}
          />
        )}

        {statusMessage ? (
          <Text
            style={[
              styles.statusMessage,
              statusType === 'success'
                ? styles.successMessage
                : styles.errorMessage,
            ]}
          >
            {statusMessage}
          </Text>
        ) : null}

        <View style={styles.buttonsContainer}>
          {currentStep > 0 && (
            <TouchableOpacity
              style={[
                styles.backButton,
                isSaving && styles.disabledButton,
              ]}
              onPress={handleBack}
              disabled={isSaving}
            >
              <Text style={styles.backButtonText}>Anterior</Text>
            </TouchableOpacity>
          )}

          {currentStep < 2 && (
            <TouchableOpacity
              style={[
                styles.nextButton,
                isSaving && styles.disabledButton,
              ]}
              onPress={handleNext}
              disabled={isSaving}
            >
              <Text style={styles.nextButtonText}>Continuar</Text>
            </TouchableOpacity>
          )}

          {currentStep === 2 && (
            <TouchableOpacity
              style={[
                styles.nextButton,
                isSaving && styles.disabledButton,
              ]}
              onPress={handleSaveRegistration}
              disabled={isSaving}
            >
              {isSaving ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.nextButtonText}>
                  Guardar registro
                </Text>
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F5F6F8',
  },
  container: {
    paddingHorizontal: 24,
    paddingTop: 70,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F6F8',
  },
  loadingText: {
    marginTop: 14,
    color: '#686868',
    fontSize: 14,
  },
  brand: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 2,
    color: '#276EF1',
  },
  heading: {
    fontSize: 28,
    fontWeight: '800',
    color: '#141414',
    marginTop: 14,
  },
  subtitle: {
    fontSize: 15,
    color: '#686868',
    lineHeight: 22,
    marginTop: 8,
  },
  approvalBanner: {
    marginTop: 20,
    padding: 14,
    borderRadius: 12,
    backgroundColor: '#FFF4D6',
    borderWidth: 1,
    borderColor: '#F2D27A',
  },
  approvalBannerApproved: {
    backgroundColor: '#E3F6EA',
    borderColor: '#9BD3AE',
  },
  approvalBannerRejected: {
    backgroundColor: '#FDE7E5',
    borderColor: '#F1A9A3',
  },
  approvalLabel: {
    fontSize: 14,
    fontWeight: '800',
    color: '#141414',
  },
  approvalMessage: {
    fontSize: 13,
    color: '#444',
    lineHeight: 19,
    marginTop: 4,
  },
  approvalRefresh: {
    marginTop: 10,
    fontSize: 13,
    fontWeight: '700',
    color: '#276EF1',
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 32,
    marginBottom: 24,
  },
  stepContainer: {
    alignItems: 'center',
    flex: 1,
  },
  stepCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#E0E2E5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  completedStepCircle: {
    backgroundColor: '#16803C',
  },
  activeStepCircle: {
    backgroundColor: '#276EF1',
  },
  stepNumber: {
    fontSize: 15,
    fontWeight: '700',
    color: '#666',
  },
  activeStepNumber: {
    color: '#FFFFFF',
  },
  stepTitle: {
    fontSize: 11,
    color: '#888',
    marginTop: 8,
    textAlign: 'center',
  },
  stepStatus: {
    fontSize: 10,
    color: '#999',
    marginTop: 2,
  },
  stepStatusComplete: {
    color: '#16803C',
    fontWeight: '700',
  },
  activeStepTitle: {
    color: '#141414',
    fontWeight: '700',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 22,
    elevation: 3,
  },
  stepLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#276EF1',
    letterSpacing: 1,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#141414',
    marginTop: 12,
  },
  cardDescription: {
    fontSize: 14,
    color: '#686868',
    marginTop: 8,
    marginBottom: 24,
  },
  buttonsContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 24,
    gap: 12,
  },
  backButton: {
    paddingVertical: 13,
    paddingHorizontal: 22,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#D5D5D5',
  },
  backButtonText: {
    color: '#333',
    fontWeight: '700',
  },
  nextButton: {
    backgroundColor: '#276EF1',
    paddingVertical: 13,
    paddingHorizontal: 24,
    borderRadius: 10,
    minWidth: 140,
    alignItems: 'center',
  },
  nextButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  disabledButton: {
    opacity: 0.6,
  },
  statusMessage: {
    marginTop: 20,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  successMessage: {
    color: '#16803C',
  },
  errorMessage: {
    color: '#D93025',
  },
});
