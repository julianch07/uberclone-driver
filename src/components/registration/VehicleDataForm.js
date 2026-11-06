
 // AI-assisted: see docs/AI_LOG.md #6
import { useState } from 'react';
import {
  Image,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Picker } from '@react-native-picker/picker';
import FormField from './FormField';

const VEHICLE_CATEGORIES = [
  { label: 'Económico', value: 'Económico' },
  { label: 'XL', value: 'XL' },
  { label: 'Premium', value: 'Premium' },
];

const VEHICLE_COLORS = [
  'Blanco',
  'Negro',
  'Gris',
  'Plateado',
  'Rojo',
  'Azul',
  'Verde',
  'Amarillo',
  'Otro',
];

export default function VehicleDataForm({
  values,
  errors,
  onChange,
  onError,
}) {
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
          quality: 0.8,
        });
      }

      if (!result.canceled && result.assets?.length > 0) {
        onChange('vehiclePhoto', result.assets[0].uri);
        onError?.('');
      }
    } catch {
      onError?.('No fue posible seleccionar la fotografía del vehículo.');
    }
  };

  return (
    <View>
      <FormField label="Fotografía del vehículo" error={errors.vehiclePhoto}>
        {values.vehiclePhoto ? (
          <Image
            source={{ uri: values.vehiclePhoto }}
            style={styles.vehicleImage}
          />
        ) : (
          <View style={styles.imagePlaceholder}>
            <Text style={styles.imagePlaceholderText}>
              Selecciona una fotografía donde se vea la placa.
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
            <Text style={styles.secondaryButtonText}>
              Elegir de galería
            </Text>
          </TouchableOpacity>
        </View>
      </FormField>

      <FormField label="Categoría del vehículo" error={errors.category}>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={values.category || ''}
            onValueChange={(value) => onChange('category', value)}
          >
            <Picker.Item label="Selecciona una categoría" value="" />
            {VEHICLE_CATEGORIES.map((category) => (
              <Picker.Item
                key={category.value}
                label={category.label}
                value={category.value}
              />
            ))}
          </Picker>
        </View>
      </FormField>

      <FormField label="Placa" error={errors.plate}>
        <TextInput
          style={styles.input}
          placeholder="Ej. ABC123"
          value={values.plate || ''}
          onChangeText={(value) =>
            onChange(
              'plate',
              value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 6)
            )
          }
          maxLength={6}
          autoCapitalize="characters"
          autoCorrect={false}
        />
      </FormField>

      <FormField label="Marca" error={errors.make}>
        <TextInput
          style={styles.input}
          placeholder="Ej. Chevrolet"
          value={values.make || ''}
          onChangeText={(value) => onChange('make', value.slice(0, 30))}
          maxLength={30}
          autoCapitalize="words"
        />
      </FormField>

      <FormField label="Modelo" error={errors.model}>
        <TextInput
          style={styles.input}
          placeholder="Ej. Onix"
          value={values.model || ''}
          onChangeText={(value) => onChange('model', value.slice(0, 30))}
          maxLength={30}
          autoCapitalize="words"
        />
      </FormField>

      <FormField label="Año del vehículo" error={errors.year}>
        <TextInput
          style={styles.input}
          placeholder="Ej. 2022"
          value={values.year || ''}
          onChangeText={(value) =>
            onChange('year', value.replace(/\D/g, '').slice(0, 4))
          }
          keyboardType="numeric"
          maxLength={4}
        />
      </FormField>

      <FormField label="Color" error={errors.color}>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={values.color || ''}
            onValueChange={(value) => onChange('color', value)}
          >
            <Picker.Item label="Selecciona un color" value="" />
            {VEHICLE_COLORS.map((color) => (
              <Picker.Item key={color} label={color} value={color} />
            ))}
          </Picker>
        </View>
      </FormField>

      <FormField
        label="Capacidad de pasajeros"
        error={errors.passengerCapacity}
      >
        <TextInput
          style={styles.input}
          placeholder="Número de pasajeros"
          value={values.passengerCapacity || ''}
          onChangeText={(value) =>
            onChange(
              'passengerCapacity',
              value.replace(/\D/g, '').slice(0, 2)
            )
          }
          keyboardType="numeric"
          maxLength={2}
        />
        {values.category === 'XL' && (
          <Text style={styles.helperText}>
            Los vehículos XL deben tener capacidad mínima para 6 pasajeros.
          </Text>
        )}
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
    backgroundColor: '#FFFFFF',
    fontSize: 14,
    color: '#222222',
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#DADCE0',
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
  },
  imagePlaceholder: {
    minHeight: 130,
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
    lineHeight: 20,
  },
  vehicleImage: {
    width: '100%',
    height: 190,
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
    marginTop: 8,
    lineHeight: 18,
  },
});
