// AI-assisted: see docs/AI_LOG.md #40
// Mapa del detalle de un viaje del historial: origen, destino y una ruta de
// referencia. Los viajes no guardan la geometría del recorrido, así que la
// ruta se calcula con OSRM (routeService) a partir del origen y el destino
// y se presenta como "ruta de referencia", no como el recorrido exacto.
// No usa la ubicación GPS ni afecta al mapa del viaje activo.
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';

import { getMapProvider } from '../map/DriverMap';
import { getDrivingRoute } from '../../services/routeService';
import { getTripRouteEndpoints } from '../../utils/tripHistoryLogic';

// Región que contiene el origen y el destino, con margen.
function regionFor({ pickup, destination }) {
  const latitudeDelta = Math.max(Math.abs(pickup.latitude - destination.latitude) * 1.8, 0.02);
  const longitudeDelta = Math.max(Math.abs(pickup.longitude - destination.longitude) * 1.8, 0.02);
  return {
    latitude: (pickup.latitude + destination.latitude) / 2,
    longitude: (pickup.longitude + destination.longitude) / 2,
    latitudeDelta,
    longitudeDelta,
  };
}

export default function TripRouteMap({ trip }) {
  const endpoints = useMemo(() => getTripRouteEndpoints(trip), [trip]);
  const [route, setRoute] = useState(null);
  const [routeState, setRouteState] = useState(endpoints ? 'loading' : 'unavailable');

  useEffect(() => {
    if (!endpoints) {
      setRouteState('unavailable');
      return undefined;
    }

    let active = true;
    setRoute(null);
    setRouteState('loading');

    getDrivingRoute(endpoints.pickup, endpoints.destination)
      .then((result) => {
        if (!active) return;
        setRoute(result);
        setRouteState('ready');
      })
      .catch(() => {
        if (active) setRouteState('error');
      });

    return () => {
      active = false;
    };
  }, [endpoints]);

  if (!endpoints) {
    return (
      <View style={styles.placeholder}>
        <Text style={styles.placeholderText}>
          Este viaje no tiene coordenadas de origen y destino para dibujar el mapa.
        </Text>
      </View>
    );
  }

  return (
    <View>
      <View style={styles.mapContainer}>
        <MapView
          style={StyleSheet.absoluteFill}
          provider={getMapProvider()}
          initialRegion={regionFor(endpoints)}
          scrollEnabled={false}
          rotateEnabled={false}
          pitchEnabled={false}
          toolbarEnabled={false}
        >
          <Marker coordinate={endpoints.pickup} title="Origen" pinColor="#16A34A" />
          <Marker coordinate={endpoints.destination} title="Destino" pinColor="#DC2626" />
          {route?.coordinates?.length > 1 ? (
            <Polyline coordinates={route.coordinates} strokeColor="#276EF1" strokeWidth={4} />
          ) : null}
        </MapView>
        {routeState === 'loading' ? (
          <View style={styles.loadingBadge}>
            <ActivityIndicator size="small" color="#276EF1" />
          </View>
        ) : null}
      </View>

      <Text style={styles.note}>
        {routeState === 'ready'
          ? `Ruta de referencia calculada entre el origen y el destino (${(route.distanceMeters / 1000).toFixed(1)} km). Puede no coincidir con el recorrido real.`
          : routeState === 'error'
            ? 'No se pudo calcular la ruta de referencia. Se muestran el origen y el destino.'
            : 'Calculando la ruta de referencia...'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  mapContainer: {
    height: 220,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#E5E7EB',
  },
  loadingBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 6,
  },
  note: {
    color: '#697386',
    fontSize: 12,
    lineHeight: 17,
    marginTop: 8,
  },
  placeholder: {
    height: 120,
    borderRadius: 12,
    backgroundColor: '#F0F2F5',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  placeholderText: {
    color: '#697386',
    textAlign: 'center',
  },
});
