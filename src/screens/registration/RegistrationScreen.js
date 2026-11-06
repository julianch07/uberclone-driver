
import { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';

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
];

export default function RegistrationScreen() {
  const [currentStep, setCurrentStep] = useState(0);

  const handleNext = () => {
    if (currentStep < REGISTRATION_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const currentRegistrationStep = REGISTRATION_STEPS[currentStep];

  return (
    <View style={styles.container}>
      <Text style={styles.brand}>UBERCLONE DRIVER</Text>

      <Text style={styles.heading}>Registro de conductor</Text>

      <Text style={styles.subtitle}>
        Completa los siguientes pasos para registrar tu información.
      </Text>

      <View style={styles.progressContainer}>
        {REGISTRATION_STEPS.map((step, index) => (
          <View key={step.id} style={styles.stepContainer}>
            <View
              style={[
                styles.stepCircle,
                index <= currentStep && styles.activeStepCircle,
              ]}
            >
              <Text
                style={[
                  styles.stepNumber,
                  index <= currentStep && styles.activeStepNumber,
                ]}
              >
                {step.id}
              </Text>
            </View>

            <Text
              style={[
                styles.stepTitle,
                index === currentStep && styles.activeStepTitle,
              ]}
            >
              {step.title}
            </Text>
          </View>
        ))}
      </View>

      <View style={styles.card}>
        <Text style={styles.stepLabel}>
          PASO {currentRegistrationStep.id} DE 2
        </Text>

        <Text style={styles.cardTitle}>
          {currentRegistrationStep.title}
        </Text>

        <Text style={styles.cardDescription}>
          {currentRegistrationStep.description}
        </Text>

        <View style={styles.placeholder}>
          <Text style={styles.placeholderText}>
            Aquí construiremos el formulario de esta sección.
          </Text>
        </View>

        <View style={styles.buttonsContainer}>
          {currentStep > 0 && (
            <TouchableOpacity
              style={styles.backButton}
              onPress={handleBack}
            >
              <Text style={styles.backButtonText}>Anterior</Text>
            </TouchableOpacity>
          )}

          {currentStep < REGISTRATION_STEPS.length - 1 && (
            <TouchableOpacity
              style={styles.nextButton}
              onPress={handleNext}
            >
              <Text style={styles.nextButtonText}>Continuar</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F6F8',
    paddingHorizontal: 24,
    paddingTop: 70,
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
    fontSize: 12,
    color: '#888',
    marginTop: 8,
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
  },
  placeholder: {
    minHeight: 150,
    backgroundColor: '#F5F6F8',
    borderRadius: 12,
    marginTop: 24,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    color: '#777',
    textAlign: 'center',
    lineHeight: 21,
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
  },
  nextButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
