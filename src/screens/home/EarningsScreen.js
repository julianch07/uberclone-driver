
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { getDriverTripHistory } from '../../services/tripService';
import { calculateFareBreakdown, formatCurrency } from '../../utils/fareLogic';
import { TRIP_STATUS } from '../../utils/tripLogic';

export default function EarningsScreen({ uid }) {
  const [loading, setLoading] = useState(true);
  const [trips, setTrips] = useState([]);
  const [totals, setTotals] = useState({
    totalFare: 0,
    driverEarnings: 0,
    commission: 0,
  });
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadEarnings() {
      try {
        setLoading(true);
        const history = await getDriverTripHistory(uid);
        const completedTrips = history.filter(t => t.status === TRIP_STATUS.COMPLETED);
        
        let totalFare = 0;
        let driverEarnings = 0;
        let commission = 0;

        completedTrips.forEach(trip => {
          const breakdown = calculateFareBreakdown(trip.estimatedFare || 0);
          totalFare += breakdown.totalFare;
          driverEarnings += breakdown.driverEarnings;
          commission += breakdown.uberCloneCommission;
        });

        setTotals({ totalFare, driverEarnings, commission });
        setTrips(completedTrips);
      } catch (e) {
        setError('No se pudieron cargar las ganancias.');
        console.error(e);
      } finally {
        setLoading(false);
      }
    }

    loadEarnings();
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
      <View style={styles.summaryCard}>
        <Text style={styles.summaryLabel}>Tus Ganancias (80%)</Text>
        <Text style={styles.summaryValue}>{formatCurrency(totals.driverEarnings)}</Text>
        
        <View style={styles.divider} />
        
        <View style={styles.row}>
          <View style={styles.col}>
            <Text style={styles.miniLabel}>Total Recaudado</Text>
            <Text style={styles.miniValue}>{formatCurrency(totals.totalFare)}</Text>
          </View>
          <View style={styles.col}>
            <Text style={styles.miniLabel}>Comisión UberClone</Text>
            <Text style={styles.miniValue}>{formatCurrency(totals.commission)}</Text>
          </View>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Historial de Ganancias</Text>
      
      {error ? <Text style={styles.error}>{error}</Text> : null}
      
      <FlatList
        data={trips}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          const breakdown = calculateFareBreakdown(item.estimatedFare || 0);
          return (
            <View style={styles.tripItem}>
              <View>
                <Text style={styles.tripDate}>
                  {item.completedAt ? new Date(item.completedAt.seconds * 1000).toLocaleDateString() : 'Fecha desconocida'}
                </Text>
                <Text style={styles.tripAddress} numberOfLines={1}>
                  {item.destination?.address || 'Destino desconocido'}
                </Text>
              </View>
              <View style={styles.tripEarnings}>
                <Text style={styles.earningsText}>
                  {formatCurrency(breakdown.driverEarnings)}
                </Text>
                <Text style={styles.totalText}>
                  Total: {formatCurrency(breakdown.totalFare)}
                </Text>
              </View>
            </View>
          );
        }}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No tienes viajes completados aún.</Text>
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
  summaryCard: {
    backgroundColor: '#161B26',
    margin: 20,
    padding: 24,
    borderRadius: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  summaryLabel: {
    color: '#AAB0B8',
    fontSize: 14,
    fontWeight: '600',
  },
  summaryValue: {
    color: '#FFFFFF',
    fontSize: 36,
    fontWeight: '800',
    marginTop: 8,
  },
  divider: {
    height: 1,
    backgroundColor: '#2D3440',
    marginVertical: 20,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  col: {
    flex: 1,
  },
  miniLabel: {
    color: '#AAB0B8',
    fontSize: 12,
  },
  miniValue: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#161B26',
    marginHorizontal: 20,
    marginBottom: 10,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  tripItem: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  tripDate: {
    fontSize: 12,
    color: '#697386',
    fontWeight: '600',
  },
  tripAddress: {
    fontSize: 14,
    color: '#161B26',
    marginTop: 4,
    width: 180,
  },
  tripEarnings: {
    alignItems: 'flex-end',
  },
  earningsText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#157347',
  },
  totalText: {
    fontSize: 11,
    color: '#697386',
    marginTop: 2,
  },
  emptyText: {
    textAlign: 'center',
    color: '#697386',
    marginTop: 40,
  },
  error: {
    color: '#B42318',
    marginHorizontal: 20,
    marginBottom: 10,
  },
});
