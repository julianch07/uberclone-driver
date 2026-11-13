
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { getDriverRegistration } from '../../services/firestoreService';
import { APPROVAL_STATUS_INFO, getApprovalStatus } from '../../config/driverStatus';

export default function ProfileScreen({ uid, onEditRegistration }) {
  const [loading, setLoading] = useState(true);
  const [registration, setRegistration] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadProfile() {
      try {
        setLoading(true);
        const data = await getDriverRegistration(uid);
        setRegistration(data);
      } catch (e) {
        setError('No se pudo cargar el perfil.');
        console.error(e);
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
  }, [uid]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#276EF1" />
      </View>
    );
  }

  const status = getApprovalStatus(registration);
  const personal = registration?.personalData;
  const vehicle = registration?.vehicleData;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.header}>
        <View style={styles.photoContainer}>
          {personal?.profilePhoto ? (
            <Image source={{ uri: personal.profilePhoto }} style={styles.photo} />
          ) : (
            <View style={[styles.photo, styles.photoPlaceholder]}>
              <Text style={styles.photoPlaceholderText}>
                {personal?.fullName?.charAt(0) || 'U'}
              </Text>
            </View>
          )}
        </View>
        <Text style={styles.name}>{personal?.fullName || 'Conductor'}</Text>
        <View style={[styles.statusBadge, { backgroundColor: status === 'approved' ? '#D1FAE5' : '#FEF3C7' }]}>
          <Text style={styles.statusText}>
            {APPROVAL_STATUS_INFO[status].label}
          </Text>
        </View>
      </View>

      <Section title="Información Personal">
        <InfoRow label="Documento" value={personal?.identityDocument} />
        <InfoRow label="Celular" value={personal?.phone} />
        <InfoRow label="Correo" value={personal?.email} />
        <InfoRow label="Idioma" value={personal?.language} />
      </Section>

      <Section title="Vehículo">
        <InfoRow label="Marca/Modelo" value={`${vehicle?.make} ${vehicle?.model}`} />
        <InfoRow label="Placa" value={vehicle?.plate} />
        <InfoRow label="Color" value={vehicle?.color} />
        <InfoRow label="Categoría" value={vehicle?.category} />
      </Section>

      <TouchableOpacity style={styles.editButton} onPress={onEditRegistration}>
        <Text style={styles.editButtonText}>Editar Registro</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function Section({ title, children }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function InfoRow({ label, value }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value || 'No disponible'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F6F8',
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  photoContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    overflow: 'hidden',
    backgroundColor: '#E7EAF0',
    marginBottom: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  photoPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoPlaceholderText: {
    fontSize: 40,
    fontWeight: '800',
    color: '#697386',
  },
  name: {
    fontSize: 22,
    fontWeight: '800',
    color: '#161B26',
    marginBottom: 8,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#161B26',
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#161B26',
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F2F5',
    paddingBottom: 8,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  infoLabel: {
    fontSize: 14,
    color: '#697386',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#161B26',
  },
  editButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#276EF1',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 10,
  },
  editButtonText: {
    color: '#276EF1',
    fontWeight: '700',
    fontSize: 16,
  },
  error: {
    color: '#B42318',
    marginBottom: 20,
    textAlign: 'center',
  },
});
