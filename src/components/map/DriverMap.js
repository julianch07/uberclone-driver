// AI-assisted: see docs/AI_LOG.md #21
// AI-assisted: see docs/AI_LOG.md #13
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { getDrivingRoute } from '../../services/routeService';
import { getTripMapConfiguration } from '../../utils/tripMapLogic';

const ZOOM_DELTA = 0.01;

// Android usa Google Maps. En iOS se usa Google Maps solo cuando la app se
// construyó con la clave de iOS y EXPO_PUBLIC_USE_GOOGLE_MAPS_IOS=true;
// Expo Go en iOS no incluye Google Maps y usa Apple Maps.
function getMapProvider() {
  if (Platform.OS === 'android') {
    return PROVIDER_GOOGLE;
  }

  return process.env.EXPO_PUBLIC_USE_GOOGLE_MAPS_IOS === 'true'
    ? PROVIDER_GOOGLE
    : undefined;
}

// position: { latitude, longitude, accuracy } con la ubicación GPS real.
// No se dibuja el mapa hasta tener una posición real: no se inventan
// coordenadas.
export default function DriverMap({ position, loading, error, activeTrip }) {
  const { height } = useWindowDimensions();
  const mapRef = useRef(null);
  const [following, setFollowing] = useState(true);
  const [route, setRoute] = useState(null);
  const [routeError, setRouteError] = useState(null);

  const tripMap = getTripMapConfiguration(activeTrip, position);
  const routeStart = tripMap?.routeStart;
  const routeEnd = tripMap?.routeEnd;

  // Redondeamos la posición para evitar una consulta por cada
  // pequeño cambio del GPS (aproximadamente 100 metros).
  const startKey = routeStart
    ? `${routeStart.latitude.toFixed(3)},${routeStart.longitude.toFixed(3)}`
    : null;

  const endKey = routeEnd
    ? `${routeEnd.latitude},${routeEnd.longitude}`
    : null;

  const routeKey = startKey && endKey
    ? `${activeTrip?.id || activeTrip?.status}:${startKey}:${endKey}`
    : null;

  useEffect(() => {
    let cancelled = false;

    setRoute(null);
    setRouteError(null);

    if (!routeKey || !routeStart || !routeEnd) {
      return () => {
        cancelled = true;
      };
    }

    getDrivingRoute(routeStart, routeEnd)
      .then((result) => {
        if (!cancelled) {
          setRoute({ ...result, routeKey });
        }
      })
      .catch(() => {
        if (!cancelled) {
          setRouteError('No se pudo cargar la ruta por carretera.');
        }
      });

    return () => {
      cancelled = true;
    };
    // routeKey limita los recálculos al cambiar el trayecto.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeKey]);

  const mapHeight = Math.max(220, Math.min(380, Math.round(height * 0.38)));

  const centerOn = useCallback((target) => {
    if (mapRef.current && target) {
      mapRef.current.animateToRegion(
        {
          latitude: target.latitude,
          longitude: target.longitude,
          latitudeDelta: ZOOM_DELTA,
          longitudeDelta: ZOOM_DELTA,
        },
        400
      );
    }
  }, []);

  // El mapa sigue al conductor mientras no lo haya movido manualmente.
  useEffect(() => {
    if (following && position) {
      centerOn(position);
    }
  }, [following, position, centerOn]);

  if (!position) {
    return (
      <View style={[styles.placeholder, { height: mapHeight }]}>
        {error ? (
          <Text style={styles.error}>{error}</Text>
        ) : (
          <>
            {loading ? (
              <ActivityIndicator size="large" color="#276EF1" />
            ) : null}
            <Text style={styles.placeholderText}>
              Obteniendo tu ubicación...
            </Text>
          </>
        )}
      </View>
    );
  }

  return (
    <View style={[styles.container, { height: mapHeight }]}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        provider={getMapProvider()}
        initialRegion={{
          latitude: position.latitude,
          longitude: position.longitude,
          latitudeDelta: ZOOM_DELTA,
          longitudeDelta: ZOOM_DELTA,
        }}
        onPanDrag={() => setFollowing(false)}
        toolbarEnabled={false}
        accessibilityLabel="Mapa con tu ubicación"
      >
        <Marker
          coordinate={{
            latitude: position.latitude,
            longitude: position.longitude,
          }}
          title="Tu ubicación"
        />

        {tripMap ? (
          <>
            <Marker
              coordinate={tripMap.pickup}
              title="Punto de recogida"
              pinColor="#16A34A"
            />
            <Marker
              coordinate={tripMap.destination}
              title="Destino del pasajero"
              pinColor="#DC2626"
            />
          </>
        ) : null}

        {route?.routeKey === routeKey &&
        route?.coordinates?.length > 1 ? (
          <Polyline
            coordinates={route.coordinates}
            strokeColor="#276EF1"
            strokeWidth={5}
          />
        ) : null}
      </MapView>

      {tripMap ? (
        <View style={styles.routeInfo}>
          <Text style={styles.routeInfoTitle}>
            {tripMap.routeLabel}
          </Text>
          {route?.routeKey === routeKey ? (
            <Text style={styles.routeInfoDetail}>
              {(route.distanceMeters / 1000).toFixed(1)} km ·{' '}
              {Math.ceil(route.durationSeconds / 60)} min aprox.
            </Text>
          ) : null}
          {routeError ? (
            <Text style={styles.routeInfoError}>{routeError}</Text>
          ) : null}
        </View>
      ) : null}

      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel="Centrar el mapa en mi ubicación"
        style={styles.recenter}
        onPress={() => {
          setFollowing(true);
          centerOn(position);
        }}
      >
        <Text style={styles.recenterText}>
          {following ? 'Siguiendo' : 'Centrar'}
        </Text>
      </TouchableOpacity>

      {error ? <Text style={styles.overlayError}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#E7EAF0',
  },
  placeholder: {
    width: '100%',
    borderRadius: 12,
    backgroundColor: '#E7EAF0',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  placeholderText: {
    color: '#616B78',
    marginTop: 10,
    textAlign: 'center',
  },
  error: {
    color: '#B42318',
    textAlign: 'center',
    lineHeight: 20,
  },
  routeInfo: {
    position: 'absolute',
    top: 10,
    left: 10,
    right: 10,
    padding: 10,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    elevation: 3,
  },
  routeInfoTitle: {
    color: '#172B4D',
    fontWeight: '700',
    fontSize: 13,
  },
  routeInfoDetail: {
    color: '#276EF1',
    marginTop: 3,
    fontSize: 12,
  },
  routeInfoError: {
    color: '#B42318',
    marginTop: 3,
    fontSize: 12,
  },
  recenter: {
    position: 'absolute',
    right: 10,
    bottom: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    paddingVertical: 9,
    paddingHorizontal: 14,
    elevation: 3,
  },
  recenterText: {
    color: '#276EF1',
    fontWeight: '700',
    fontSize: 13,
  },
  overlayError: {
    position: 'absolute',
    left: 10,
    right: 10,
    top: 10,
    backgroundColor: '#FDECEA',
    color: '#B42318',
    borderRadius: 8,
    padding: 8,
    fontSize: 12,
  },
});
