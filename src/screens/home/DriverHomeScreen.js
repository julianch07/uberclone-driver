
 // AI-assisted: see docs/AI_LOG.md #12
// AI-assisted: see docs/AI_LOG.md #13
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import {
  APPROVAL_STATUS_INFO,
  canDriverGoOnline,
  getApprovalStatus,
} from '../../config/driverStatus';

import {
  getDriverRegistration,
  subscribeToDriverRegistration,
} from '../../services/firestoreService';

import { setDriverAvailability } from '../../services/availabilityService';
import { hasCompleteSavedRegistration } from '../../utils/driverRegistration';
import DriverMap from '../../components/map/DriverMap';
import TripRequests from '../../components/trips/TripRequests';
import LocationPermission from '../../components/map/LocationPermission';
import useDriverLocation from '../../hooks/useDriverLocation';
import { PERMISSION } from '../../utils/locationLogic';

const TABS = [
  { key: 'home', label: 'Inicio' },
  { key: 'trips', label: 'Viajes' },
  { key: 'earnings', label: 'Ganancias' },
  { key: 'profile', label: 'Perfil' },
];

export default function DriverHomeScreen({ uid, onEditRegistration }) {
  const [tab, setTab] = useState('home');
  const [registration, setRegistration] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [disconnecting, setDisconnecting] = useState(false);

  // Permite consultar nuevamente el registro de forma manual.
  const refresh = useCallback(async () => {
    setError('');

    try {
      const data = await getDriverRegistration(uid);

      if (!data) {
        throw new Error('No se encontró el registro del conductor.');
      }

      setRegistration(data);
    } catch (e) {
      setError(
        e.message || 'No se pudo actualizar la información del conductor.'
      );
    }
  }, [uid]);

  // Escucha automáticamente los cambios del conductor en Firestore.
  useEffect(() => {
    setLoading(true);
    setError('');
    setRegistration(null);

    const unsubscribe = subscribeToDriverRegistration(
      uid,
      (data) => {
        setRegistration(data);
        setLoading(false);

        if (!data) {
          setError('No se encontró el registro del conductor.');
        } else {
          setError('');
        }
      },
      (subscriptionError) => {
        console.error(
          'Error en la sincronización del conductor:',
          subscriptionError
        );

        setError(
          'No se pudo sincronizar el registro. Revisa tu conexión.'
        );

        setLoading(false);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [uid]);

  const approved = canDriverGoOnline(registration);
  const completeRegistration = hasCompleteSavedRegistration(registration);
  const canConnect = approved && completeRegistration;

  const status = getApprovalStatus(registration);
  const online = Boolean(registration?.isOnline) && canConnect;

  // Seguimiento GPS: mientras se ve el mapa (pestaña Inicio) o mientras el
  // conductor está conectado. La ubicación solo se publica si está conectado
  // y no está en proceso de desconectarse.
  const location = useDriverLocation({
    uid,
    watchEnabled: tab === 'home' || online,
    publishEnabled: online && !disconnecting,
  });

  // Cuando Firestore confirma la desconexión, se vuelve a la normalidad.
  useEffect(() => {
    if (disconnecting && !registration?.isOnline) {
      setDisconnecting(false);
    }
  }, [disconnecting, registration?.isOnline]);

  const name =
    registration?.personalData?.fullName?.trim() || 'Conductor';

  const vehicle = registration?.vehicleData;

  const toggleAvailability = async () => {
    if (busy || loading || !registration) {
      return;
    }

    const next = !registration.isOnline;

    if (next && !canConnect) {
      setError(
        'Necesitas un registro completo, documentos vigentes y aprobación para conectarte.'
      );
      return;
    }

    setBusy(true);
    setError('');
    setMessage('');

    // Se deja de publicar la ubicación antes de pedir la desconexión.
    if (!next) {
      setDisconnecting(true);
    }

    try {
      await setDriverAvailability(uid, next);

      let locationCleared = true;
      if (!next) {
        locationCleared = await location.clearPublishedLocation();
      }

      // onSnapshot actualizará automáticamente el estado real.
      setMessage(
        next
          ? 'Disponibilidad actualizada. Ya puedes recibir viajes cuando el módulo esté habilitado.'
          : 'Te has desconectado correctamente.'
      );
      if (!next && !locationCleared) {
        setError(
          'Te has desconectado, pero no se pudo eliminar la última ubicación guardada. Comprueba tu conexión e inténtalo de nuevo más tarde.'
        );
      }
    } catch (e) {
      // Si la desconexión falló, el conductor sigue conectado: se reanuda
      // la publicación.
      setDisconnecting(false);
      setError(
        e.message || 'No fue posible actualizar tu disponibilidad.'
      );
    } finally {
      setBusy(false);
    }
  };

  const availabilityMessage = !approved
    ? 'Necesitas aprobación para conectarte.'
    : !completeRegistration
      ? 'Tu registro o tus documentos necesitan actualización antes de conectarte.'
      : 'Controla cuándo estás disponible para recibir viajes.';

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.brand}>UBERCLONE DRIVER</Text>

        <Text style={styles.heading}>
          {tab === 'home'
            ? `¡Hola, ${name.split(' ')[0]}!`
            : TABS.find((item) => item.key === tab).label}
        </Text>

        {loading ? (
          <ActivityIndicator size="large" color="#276EF1" />
        ) : null}

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {message ? (
          <Text style={styles.success}>{message}</Text>
        ) : null}

        {!loading && !registration ? (
          <Action label="Reintentar" onPress={refresh} />
        ) : null}

        {!loading && registration && tab === 'home' ? (
          <>
            <View style={styles.card}>
              <Text style={styles.label}>ESTADO DE LA CUENTA</Text>
              <Text style={styles.cardTitle}>
                {APPROVAL_STATUS_INFO[status].label}
              </Text>
              <Text style={styles.muted}>
                {APPROVAL_STATUS_INFO[status].message}
              </Text>
            </View>

            <View style={styles.card}>
              <Text style={styles.label}>DISPONIBILIDAD</Text>
              <Text style={styles.cardTitle}>
                {online ? 'Conectado' : 'Desconectado'}
              </Text>

              <Text style={styles.muted}>
                {availabilityMessage}
              </Text>

              <Action
                label={
                  busy
                    ? 'Actualizando...'
                    : registration.isOnline
                      ? 'Desconectarme'
                      : 'Conectarme'
                }
                onPress={toggleAvailability}
                disabled={
                  busy ||
                  loading ||
                  (!canConnect && !registration.isOnline)
                }
              />

              {!completeRegistration ? (
                <Action
                  label="Actualizar mi registro"
                  onPress={onEditRegistration}
                  disabled={busy}
                />
              ) : null}
            </View>

            <View style={styles.card}>
              <Text style={styles.label}>TU UBICACIÓN</Text>

              {location.checking ? (
                <ActivityIndicator size="small" color="#276EF1" />
              ) : location.permission.status === PERMISSION.GRANTED &&
                location.servicesEnabled ? (
                <>
                  <DriverMap
                    position={location.position}
                    loading
                    error={location.locationError}
                  />

                  {location.publishError ? (
                    <Text style={styles.error}>
                      {location.publishError}
                    </Text>
                  ) : null}

                  <Text style={styles.muted}>
                    {online
                      ? 'Tu ubicación se comparte mientras estás conectado y la app está abierta.'
                      : 'Tu ubicación solo se comparte cuando estás conectado.'}
                  </Text>
                </>
              ) : (
                <LocationPermission
                  permission={location.permission}
                  servicesEnabled={location.servicesEnabled}
                  requesting={location.requesting}
                  onRequestPermission={location.requestPermission}
                  onRecheck={location.recheck}
                />
              )}

              {online && location.permission.status !== PERMISSION.GRANTED ? (
                <Text style={styles.muted}>
                  Estás conectado, pero sin permiso de ubicación no se
                  publica tu posición.
                </Text>
              ) : null}
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Tu actividad</Text>
              <Text style={styles.muted}>
                Las solicitudes de viajes estarán disponibles
                en un próximo módulo.
              </Text>

              <Action
                label="Ver viajes"
                onPress={() => setTab('trips')}
              />

              <Action
                label="Ver ganancias"
                onPress={() => setTab('earnings')}
              />
            </View>
          </>
        ) : null}

        {!loading && registration && tab === 'trips' ? (
          <TripRequests
            uid={uid}
            enabled={online && !disconnecting}
          />
        ) : null}

        {!loading && registration && tab === 'earnings' ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Mis ganancias</Text>
            <Text style={styles.muted}>
              El resumen de ganancias se habilitará cuando
              implementemos los viajes y las tarifas.
            </Text>
          </View>
        ) : null}

        {!loading && registration && tab === 'profile' ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{name}</Text>

            <Text style={styles.muted}>
              Teléfono: {registration.personalData?.phone || 'Sin información'}
            </Text>

            <Text style={styles.muted}>
              Vehículo:{' '}
              {[vehicle?.make, vehicle?.model]
                .filter(Boolean)
                .join(' ') || 'Sin información'}
            </Text>

            <Text style={styles.muted}>
              Placa: {vehicle?.plate || 'Sin información'}
            </Text>

            <Text style={styles.muted}>
              Estado: {APPROVAL_STATUS_INFO[status].label}
            </Text>

            <Action
              label="Editar mi registro"
              onPress={onEditRegistration}
              disabled={busy}
            />
          </View>
        ) : null}
      </ScrollView>

      <View style={styles.tabs}>
        {TABS.map((item) => (
          <TouchableOpacity
            key={item.key}
            accessibilityRole="tab"
            accessibilityState={{
              selected: tab === item.key,
            }}
            style={[
              styles.tab,
              tab === item.key && styles.selectedTab,
            ]}
            onPress={() => {
              setTab(item.key);
              setError('');
              setMessage('');
            }}
          >
            <Text
              style={[
                styles.tabText,
                tab === item.key && styles.selectedText,
              ]}
            >
              {item.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

function Action({ label, onPress, disabled }) {
  return (
    <TouchableOpacity
      accessibilityRole="button"
      style={[
        styles.button,
        disabled && styles.disabled,
      ]}
      onPress={onPress}
      disabled={disabled}
    >
      <Text style={styles.buttonText}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F5F6F8',
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 64,
    paddingBottom: 30,
  },
  brand: {
    color: '#276EF1',
    fontWeight: '800',
    letterSpacing: 1,
    fontSize: 12,
  },
  heading: {
    fontSize: 28,
    fontWeight: '800',
    color: '#161B26',
    marginTop: 10,
    marginBottom: 20,
  },
  card: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 16,
    marginBottom: 14,
  },
  label: {
    color: '#6D7480',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#161B26',
    marginVertical: 8,
  },
  muted: {
    color: '#616B78',
    lineHeight: 21,
    marginBottom: 8,
  },
  button: {
    backgroundColor: '#276EF1',
    borderRadius: 10,
    paddingVertical: 13,
    paddingHorizontal: 15,
    alignItems: 'center',
    marginTop: 10,
  },
  disabled: {
    opacity: 0.45,
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E7EAF0',
    paddingBottom: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
  },
  selectedTab: {
    borderTopWidth: 3,
    borderTopColor: '#276EF1',
  },
  tabText: {
    color: '#697386',
    fontSize: 12,
    fontWeight: '600',
  },
  selectedText: {
    color: '#276EF1',
  },
  error: {
    color: '#B42318',
    marginBottom: 14,
  },
  success: {
    color: '#157347',
    marginBottom: 14,
  },
});
