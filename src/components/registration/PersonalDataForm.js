
// AI-assisted: see docs/AI_LOG.md #6
// AI-assisted: see docs/AI_LOG.md #8
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
import { Picker } from '@react-native-picker/picker';
import FormField from './FormField';

const GENDER_OPTIONS = [
  { label: 'Masculino', value: 'Masculino' },
  { label: 'Femenino', value: 'Femenino' },
  { label: 'Otro', value: 'Otro' },
];

const LANGUAGE_OPTIONS = [
  { label: 'Español', value: 'Español' },
  { label: 'Inglés', value: 'Inglés' },
];

export default function PersonalDataForm({
  values,
  errors,
  onChange,
  onError,
}) {
  const [showDatePicker, setShowDatePicker] = useState(false);

  const maximumBirthDate = new Date();
  maximumBirthDate.setFullYear(maximumBirthDate.getFullYear() - 18);

  const handleImageSelection = async (source) => {
    try {
      let result;

      if (source === 'camera') {
        const permission =
          await ImagePicker.requestCameraPermissionsAsync();

        if (!permission.granted) {
          onError?.('Debes permitir el acceso a la cámara.');
          return;
        }

        result = await ImagePicker.launchCameraAsync({
          mediaTypes: ['images'],
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.8,
        });
      } else {
        const permission =
          await ImagePicker.requestMediaLibraryPermissionsAsync();

        if (!permission.granted) {
          onError?.('Debes permitir el acceso a la galería.');
          return;
        }

        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.8,
        });
      }

      if (!result.canceled && result.assets?.length > 0) {
        onChange('profilePhoto', result.assets[0].uri);
        onError?.('');
      }
    } catch {
      onError?.('No fue posible seleccionar la fotografía.');
    }
  };

  const handleBirthDateChange = (event, selectedDate) => {
    if (Platform.OS !== 'ios') {
      setShowDatePicker(false);
    }

    if (selectedDate) {
      onChange('birthDate', selectedDate.toISOString());
    }
  };

  const formatDate = (dateValue) => {
    if (!dateValue) {
      return 'Seleccionar fecha de nacimiento';
    }

    return new Date(dateValue).toLocaleDateString('es-CO');
  };

  return (
    <View>
      <FormField label="Fotografía de perfil" error={errors.profilePhoto}>
        {values.profilePhoto ? (
          <Image
            source={{ uri: values.profilePhoto }}
            style={styles.profileImage}
          />
        ) : (
          <View style={styles.imagePlaceholder}>
            <Text style={styles.imagePlaceholderText}>
              No has seleccionado una fotografía
            </Text>
          </View>
        )}

        <View style={styles.imageButtons}>
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => handleImageSelection('camera')}
          >
            <Text style={styles.secondaryButtonText}>Tomar foto</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => handleImageSelection('gallery')}
          >
            <Text style={styles.secondaryButtonText}>Elegir de galería</Text>
          </TouchableOpacity>
        </View>
      </FormField>

      <FormField label="Nombre completo" error={errors.fullName}>
        <TextInput
          style={styles.input}
          placeholder="Ingresa tu nombre completo"
          value={values.fullName || ''}
          onChangeText={(value) =>
            onChange(
              'fullName',
              value.replace(/[^a-zA-ZÀ-ÿ\s]/g, '').slice(0, 50)
            )
          }
          maxLength={50}
          autoCapitalize="words"
        />
      </FormField>

      <FormField
        label="Documento de identidad"
        error={errors.identityDocument}
      >
        <TextInput
          style={styles.input}
          placeholder="Número de documento"
          value={values.identityDocument || ''}
          onChangeText={(value) =>
            onChange('identityDocument', value.replace(/\D/g, '').slice(0, 10))
          }
          keyboardType="numeric"
          maxLength={10}
        />
      </FormField>

      <FormField label="Número de celular" error={errors.phone}>
        <TextInput
          style={styles.input}
          placeholder="Ej. 3001234567"
          value={values.phone || ''}
          onChangeText={(value) =>
            onChange('phone', value.replace(/\D/g, '').slice(0, 10))
          }
          keyboardType="phone-pad"
          maxLength={10}
        />
      </FormField>

      <FormField label="Fecha de nacimiento" error={errors.birthDate}>
        <TouchableOpacity
          style={styles.input}
          onPress={() => setShowDatePicker(true)}
        >
          <Text style={styles.dateText}>
            {formatDate(values.birthDate)}
          </Text>
        </TouchableOpacity>

        {showDatePicker && (
          <DateTimePicker
            value={
              values.birthDate
                ? new Date(values.birthDate)
                : maximumBirthDate
            }
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            maximumDate={maximumBirthDate}
            onChange={handleBirthDateChange}
            onDismiss={() => setShowDatePicker(false)}
          />
        )}

        {Platform.OS === 'ios' && showDatePicker && (
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => setShowDatePicker(false)}
          >
            <Text style={styles.secondaryButtonText}>Confirmar fecha</Text>
          </TouchableOpacity>
        )}
      </FormField>

      <FormField label="Género" error={errors.gender}>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={values.gender || ''}
            onValueChange={(value) => onChange('gender', value)}
          >
            <Picker.Item label="Selecciona tu género" value="" />
            {GENDER_OPTIONS.map((option) => (
              <Picker.Item
                key={option.value}
                label={option.label}
                value={option.value}
              />
            ))}
          </Picker>
        </View>
      </FormField>

      <FormField label="Correo electrónico" error={errors.email}>
        <TextInput
          style={styles.input}
          placeholder="ejemplo@correo.com"
          value={values.email || ''}
          onChangeText={(value) => onChange('email', value.trim())}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
        />
      </FormField>

      <FormField label="Idioma" error={errors.language}>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={values.language || ''}
            onValueChange={(value) => onChange('language', value)}
          >
            <Picker.Item label="Selecciona un idioma" value="" />
            {LANGUAGE_OPTIONS.map((option) => (
              <Picker.Item
                key={option.value}
                label={option.label}
                value={option.value}
              />
            ))}
          </Picker>
        </View>
      </FormField>
    </View>
  );
}

const styles = StyleSheet.create({
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
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#DADCE0',
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
  },
  imagePlaceholder: {
    minHeight: 120,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#BFC5CE',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5F6F8',
  },
  imagePlaceholderText: {
    color: '#777777',
    fontSize: 13,
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignSelf: 'center',
    marginBottom: 12,
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
});
