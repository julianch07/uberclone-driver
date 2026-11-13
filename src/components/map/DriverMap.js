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
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';

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
export default function DriverMap({ position, loading, error }) {
  const { height } = useWindowDimensions();
  const mapRef = useRef(null);
  const [following, setFollowing] = useState(true);

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
      </MapView>

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
