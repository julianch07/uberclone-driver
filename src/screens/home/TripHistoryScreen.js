// AI-assisted: see docs/AI_LOG.md #22
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { getDriverTripHistory } from '../../services/tripService';
import { formatCurrency } from '../../utils/fareLogic';
// AI-assisted: see docs/AI_LOG.md #29
import { getTripPaymentLabel } from '../../utils/cashPaymentLogic';

// AI-assisted: see docs/AI_LOG.md #29
const STATUS_BADGES = {
  completed: { label: 'Completado', style: 'successBadge' },
  paid: { label: 'Pagado', style: 'successBadge' },
  cancelled: { label: 'Cancelado', style: 'errorBadge' },
};

export default function TripHistoryScreen({ uid }) {
  const [loading, setLoading] = useState(true);
  const [trips, setTrips] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadHistory() {
      try {
        setLoading(true);
        const history = await getDriverTripHistory(uid);
        setTrips(history);
      } catch (e) {
        setError('No se pudo cargar el historial.');
        console.error(e);
      } finally {
        setLoading(false);
      }
    }

    loadHistory();
  }, [uid]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#276EF1" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      
      <FlatList
        data={trips}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.tripItem}>
            <View style={styles.header}>
              <Text style={styles.date}>
                {item.completedAt || item.cancelledAt || item.createdAt 
                  ? new Date((item.completedAt || item.cancelledAt || item.createdAt).seconds * 1000).toLocaleString() 
                  : 'Fecha desconocida'}
              </Text>
              {/* AI-assisted: see docs/AI_LOG.md #29 */}
              <View style={[styles.badge, styles[(STATUS_BADGES[item.status] || STATUS_BADGES.cancelled).style]]}>
                <Text style={styles.badgeText}>
                  {(STATUS_BADGES[item.status] || { label: item.status }).label}
                </Text>
              </View>
            </View>
            <Text style={styles.paymentLabel}>{getTripPaymentLabel(item)}</Text>
            
            <View style={styles.body}>
              <View style={styles.location}>
                <View style={styles.dot} />
                <Text style={styles.address} numberOfLines={1}>{item.pickup?.address}</Text>
              </View>
              <View style={[styles.location, { marginTop: 8 }]}>
                <View style={[styles.dot, { backgroundColor: '#276EF1' }]} />
                <Text style={styles.address} numberOfLines={1}>{item.destination?.address}</Text>
              </View>
            </View>
            
            <View style={styles.footer}>
              <Text style={styles.fareLabel}>Tarifa</Text>
              {/* AI-assisted: see docs/AI_LOG.md #27 */}
              {/* Tarifa final guardada al finalizar; si no existe (viaje
                  cancelado o anterior al módulo de tarifas), la estimada. */}
              <Text style={styles.fareValue}>
                {formatCurrency(
                  typeof item.fare === 'number' ? item.fare : item.estimatedFare
                )}
              </Text>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No tienes viajes registrados.</Text>
        }
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F6F8',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 20,
  },
  tripItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  date: {
    fontSize: 12,
    color: '#697386',
    fontWeight: '600',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  // AI-assisted: see docs/AI_LOG.md #29
  paymentLabel: {
    fontSize: 12,
    color: '#697386',
    marginTop: -8,
    marginBottom: 12,
  },
  successBadge: {
    backgroundColor: '#D1FAE5',
  },
  errorBadge: {
    backgroundColor: '#FEE2E2',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  body: {
    marginBottom: 16,
  },
  location: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#AAB0B8',
    marginRight: 10,
  },
  address: {
    fontSize: 14,
    color: '#161B26',
    flex: 1,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F2F5',
  },
  fareLabel: {
    fontSize: 13,
    color: '#697386',
  },
  fareValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#161B26',
  },
  emptyText: {
    textAlign: 'center',
    color: '#697386',
    marginTop: 40,
  },
  error: {
    color: '#B42318',
    margin: 20,
    textAlign: 'center',
  },
});
