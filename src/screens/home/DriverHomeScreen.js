
// AI-assisted: see docs/AI_LOG.md #12
// AI-assisted: see docs/AI_LOG.md #13
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  BackHandler,
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
// AI-assisted: see docs/AI_LOG.md #15
import TripRequests from '../../components/trips/TripRequests';
import LocationPermission from '../../components/map/LocationPermission';
import useDriverLocation from '../../hooks/useDriverLocation';
import { PERMISSION } from '../../utils/locationLogic';
// AI-assisted: see docs/AI_LOG.md #16
import { useDriverContext } from '../../context/DriverContext';

// AI-assisted: see docs/AI_LOG.md #22
// New Screens
import EarningsScreen from './EarningsScreen';
import ProfileScreen from './ProfileScreen';
import TripHistoryScreen from './TripHistoryScreen';
import PaymentSummaryScreen from './PaymentSummaryScreen';

const TABS = [
  { key: 'home', label: 'Inicio' },
  { key: 'trips', label: 'Viajes' },
  { key: 'earnings', label: 'Ganancias' },
  { key: 'profile', label: 'Perfil' },
];

export default function DriverHomeScreen({ uid, onEditRegistration }) {
  const { setIsOnline, activeTrip } = useDriverContext();
  const [tab, setTab] = useState('home');
  // AI-assisted: see docs/AI_LOG.md #22
  const [subTab, setSubTab] = useState('summary'); // For earnings/payments
  const [registration, setRegistration] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [disconnecting, setDisconnecting] = useState(false);

  // AI-assisted: see docs/AI_LOG.md #24
  // Botón "atrás" de Android: desde otra pestaña vuelve a Inicio en lugar
  // de cerrar la aplicación.
  useEffect(() => {
    if (tab === 'home') {
      return undefined;
    }

    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        setTab('home');
        return true;
      }
    );

    return () => subscription.remove();
  }, [tab]);

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

  // Synchronize the driver's verified availability with global state.
  useEffect(() => {
    setIsOnline(online);
  }, [online, setIsOnline]);

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

  // AI-assisted: see docs/AI_LOG.md #24
  // Encabezado común a todas las pestañas.
  const header = (
    <>
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
    </>
  );

  // AI-assisted: see docs/AI_LOG.md #24
  // Ganancias/Historial (FlatList) y Pagos/Perfil (ScrollView) gestionan su
  // propio desplazamiento. Se renderizan fuera del ScrollView principal para
  // no anidar listas virtualizadas en un ScrollView vertical
  // ("VirtualizedLists should never be nested inside plain ScrollViews").
  const tabOwnsScroll = tab === 'earnings' || tab === 'profile';

  return (
    <View style={styles.screen}>
      {tabOwnsScroll ? (
        <View style={styles.fill}>
          <View style={styles.fixedHeader}>{header}</View>

          {!loading && registration && tab === 'earnings' ? (
            <View style={styles.fill}>
              {/* AI-assisted: see docs/AI_LOG.md #22 */}
              <View style={[styles.subTabs, styles.subTabsInset]}>
                <TouchableOpacity
                  style={[styles.subTab, subTab === 'summary' && styles.selectedSubTab]}
                  onPress={() => setSubTab('summary')}
                >
                  <Text style={[styles.subTabText, subTab === 'summary' && styles.selectedSubTabText]}>Resumen</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.subTab, subTab === 'payments' && styles.selectedSubTab]}
                  onPress={() => setSubTab('payments')}
                >
                  <Text style={[styles.subTabText, subTab === 'payments' && styles.selectedSubTabText]}>Pagos</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.subTab, subTab === 'history' && styles.selectedSubTab]}
                  onPress={() => setSubTab('history')}
                >
                  <Text style={[styles.subTabText, subTab === 'history' && styles.selectedSubTabText]}>Historial</Text>
                </TouchableOpacity>
              </View>

              {subTab === 'summary' && <EarningsScreen uid={uid} />}
              {subTab === 'payments' && <PaymentSummaryScreen uid={uid} />}
              {subTab === 'history' && <TripHistoryScreen uid={uid} />}
            </View>
          ) : null}

          {!loading && registration && tab === 'profile' ? (
            <View style={styles.fill}>
              <ProfileScreen uid={uid} onEditRegistration={onEditRegistration} />
            </View>
          ) : null}
        </View>
      ) : (
      <ScrollView contentContainerStyle={styles.content}>
        {header}

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
                    activeTrip={activeTrip}
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
              {/* AI-assisted: see docs/AI_LOG.md #24 */}
              <Text style={styles.muted}>
                {activeTrip
                  ? 'Tienes un viaje activo. Consulta su estado y la ruta en Viajes.'
                  : 'Consulta las solicitudes de viaje y tus ganancias.'}
              </Text>

              <Action
                label={activeTrip ? 'Ver viaje activo' : 'Ver viajes'}
                onPress={() => setTab('trips')}
              />

              <Action
                label="Ver ganancias"
                onPress={() => setTab('earnings')}
              />
            </View>
          </>
        ) : null}

        {/* AI-assisted: see docs/AI_LOG.md #21 */}
        {!loading && registration && tab === 'trips' ? (
          <>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Mapa del viaje</Text>

              {location.permission.status === PERMISSION.GRANTED &&
              location.servicesEnabled ? (
                <DriverMap
                  position={location.position}
                  loading
                  error={location.locationError}
                  activeTrip={activeTrip}
                />
              ) : (
                <LocationPermission
                  permission={location.permission}
                  servicesEnabled={location.servicesEnabled}
                  requesting={location.requesting}
                  onRequestPermission={location.requestPermission}
                  onRecheck={location.recheck}
                />
              )}
            </View>

            <TripRequests
              uid={uid}
              enabled={online && !disconnecting}
            />
          </>
        ) : null}

      </ScrollView>
      )}

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
  // AI-assisted: see docs/AI_LOG.md #24
  fill: {
    flex: 1,
  },
  fixedHeader: {
    paddingHorizontal: 20,
    paddingTop: 64,
  },
  subTabsInset: {
    marginHorizontal: 20,
  },
  subTabs: {
    flexDirection: 'row',
    marginBottom: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 4,
  },
  subTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  selectedSubTab: {
    backgroundColor: '#276EF1',
  },
  subTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#697386',
  },
  selectedSubTabText: {
    color: '#FFFFFF',
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
