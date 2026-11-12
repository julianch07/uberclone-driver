
// AI-assisted: see docs/AI_LOG.md
import { useState } from 'react';
import {
  Image,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import FormField from './FormField';

const DOCUMENT_FIELDS = [
  {
    key: 'licensePhoto',
    label: 'Fotografía de la licencia',
    placeholder: 'Selecciona una fotografía de tu licencia.',
  },
  {
    key: 'soatPhoto',
    label: 'Fotografía del SOAT',
    placeholder: 'Selecciona una fotografía del SOAT.',
  },
  {
    key: 'technicalReviewPhoto',
    label: 'Fotografía de la revisión técnico-mecánica',
    placeholder: 'Selecciona una fotografía del certificado.',
  },
];

export default function DocumentsPaymentsForm({
  values,
  errors,
  onChange,
  onError,
}) {
  const [activeDateField, setActiveDateField] = useState(null);

  const minimumExpirationDate = new Date();
  minimumExpirationDate.setHours(0, 0, 0, 0);
  minimumExpirationDate.setDate(minimumExpirationDate.getDate() + 1);

  const handleImageSelection = async (field, source) => {
    try {
      let result;

      if (source === 'camera') {
        const permission =
          await ImagePicker.requestCameraPermissionsAsync();

        if (!permission.granted) {
          onError?.(field, 'Debes permitir el acceso a la cámara.');
          return;
        }

        result = await ImagePicker.launchCameraAsync({
          mediaTypes: ['images'],
          allowsEditing: true,
          quality: 0.8,
        });
      } else {
        const permission =
          await ImagePicker.requestMediaLibraryPermissionsAsync();

        if (!permission.granted) {
          onError?.(field, 'Debes permitir el acceso a la galería.');
          return;
        }

        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          allowsEditing: true,
          quality: 0.8,
        });
      }

      if (!result.canceled && result.assets?.length > 0) {
        onChange(field, result.assets[0].uri);
        onError?.(field, '');
      }
    } catch {
      onError?.(field, 'No fue posible seleccionar la fotografía.');
    }
  };

  const handleDateChange = (event, selectedDate) => {
    const field = activeDateField;

    if (Platform.OS !== 'ios') {
      setActiveDateField(null);
    }

    if (selectedDate && field) {
      onChange(field, selectedDate.toISOString());
    }
  };

  const formatDate = (dateValue) => {
    if (!dateValue) {
      return 'Seleccionar fecha de vencimiento';
    }

    return new Date(dateValue).toLocaleDateString('es-CO');
  };

  const renderDateField = (field, label) => (
    <FormField label={label} error={errors[field]}>
      <TouchableOpacity
        style={styles.input}
        onPress={() => setActiveDateField(field)}
      >
        <Text style={styles.dateText}>
          {formatDate(values[field])}
        </Text>
      </TouchableOpacity>

      {activeDateField === field && (
        <DateTimePicker
          value={values[field] ? new Date(values[field]) : new Date()}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          minimumDate={minimumExpirationDate}
          onChange={handleDateChange}
          onDismiss={() => setActiveDateField(null)}
        />
      )}

      {Platform.OS === 'ios' && activeDateField === field && (
        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => setActiveDateField(null)}
        >
          <Text style={styles.secondaryButtonText}>
            Confirmar fecha
          </Text>
        </TouchableOpacity>
      )}
    </FormField>
  );

  return (
    <View>
      <Text style={styles.sectionTitle}>
        Licencia de conducción
      </Text>

      <FormField
        label="Número de licencia"
        error={errors.licenseNumber}
      >
        <TextInput
          style={styles.input}
          placeholder="Ingresa el número de tu licencia"
          value={values.licenseNumber || ''}
          onChangeText={(value) =>
            onChange('licenseNumber', value.trim().slice(0, 30))
          }
          maxLength={30}
          autoCapitalize="characters"
        />
      </FormField>

      {DOCUMENT_FIELDS.map((document) => (
        <FormField
          key={document.key}
          label={document.label}
          error={errors[document.key]}
        >
          {values[document.key] ? (
            <Image
              source={{ uri: values[document.key] }}
              style={styles.documentImage}
            />
          ) : (
            <View style={styles.imagePlaceholder}>
              <Text style={styles.imagePlaceholderText}>
                {document.placeholder}
              </Text>
            </View>
          )}

          <View style={styles.imageButtons}>
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() =>
                handleImageSelection(document.key, 'camera')
              }
            >
              <Text style={styles.secondaryButtonText}>
                Tomar foto
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() =>
                handleImageSelection(document.key, 'gallery')
              }
            >
              <Text style={styles.secondaryButtonText}>
                Elegir de galería
              </Text>
            </TouchableOpacity>
          </View>
        </FormField>
      ))}

      {renderDateField(
        'licenseExpiration',
        'Vencimiento de la licencia'
      )}

      <Text style={styles.sectionTitle}>
        Vencimientos de documentos
      </Text>

      {renderDateField('soatExpiration', 'Vencimiento del SOAT')}

      <Text style={styles.helperText}>
        La revisión técnico-mecánica debe registrarse cuando corresponda
        según las condiciones y antigüedad del vehículo.
      </Text>

      {renderDateField(
        'technicalReviewExpiration',
        'Vencimiento de la revisión técnico-mecánica (si aplica)'
      )}

      <Text style={styles.sectionTitle}>
        Información de pagos
      </Text>

      <FormField
        label="Correo electrónico de Mercado Pago"
        error={errors.mercadoPagoEmail}
      >
        <TextInput
          style={styles.input}
          placeholder="ejemplo@correo.com"
          value={values.mercadoPagoEmail || ''}
          onChangeText={(value) =>
            onChange('mercadoPagoEmail', value.trim())
          }
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
        />
      </FormField>

      <Text style={styles.sectionTitle}>
        Términos y condiciones
      </Text>

      <Text style={styles.commissionText}>
        La plataforma aplicará una comisión del 20% sobre el valor
        de cada viaje, de acuerdo con las condiciones del proyecto.
      </Text>

      <TouchableOpacity
        style={styles.termsContainer}
        onPress={() =>
          onChange('acceptedTerms', !values.acceptedTerms)
        }
      >
        <View
          style={[
            styles.checkbox,
            values.acceptedTerms && styles.checkboxSelected,
          ]}
        >
          {values.acceptedTerms && (
            <Text style={styles.checkmark}>✓</Text>
          )}
        </View>

        <Text style={styles.termsText}>
          Acepto los términos y condiciones de la plataforma.
        </Text>
      </TouchableOpacity>

      {errors.acceptedTerms ? (
        <Text style={styles.errorText}>
          {errors.acceptedTerms}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#141414',
    marginTop: 12,
    marginBottom: 16,
  },
  input: {
    minHeight: 50,
    borderWidth: 1,
    borderColor: '#DADCE0',
    borderRadius: 10,
    paddingHorizontal: 14,
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    fontSize: 14,
    color: '#222222',
  },
  dateText: {
    fontSize: 14,
    color: '#333333',
  },
  imagePlaceholder: {
    minHeight: 120,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#BFC5CE',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#F5F6F8',
  },
  imagePlaceholderText: {
    color: '#777777',
    fontSize: 13,
    textAlign: 'center',
  },
  documentImage: {
    width: '100%',
    height: 170,
    borderRadius: 12,
    marginBottom: 12,
    resizeMode: 'cover',
  },
  imageButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 12,
  },
  secondaryButton: {
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#276EF1',
    borderRadius: 9,
  },
  secondaryButtonText: {
    color: '#276EF1',
    fontSize: 13,
    fontWeight: '700',
  },
  helperText: {
    color: '#686868',
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 16,
  },
  commissionText: {
    color: '#555555',
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 16,
  },
  termsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderWidth: 1,
    borderColor: '#AAB0B8',
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: {
    backgroundColor: '#276EF1',
    borderColor: '#276EF1',
  },
  checkmark: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  termsText: {
    flex: 1,
    color: '#333333',
    fontSize: 13,
    lineHeight: 19,
  },
  errorText: {
    color: '#D93025',
    fontSize: 12,
    marginTop: 4,
  },
});
