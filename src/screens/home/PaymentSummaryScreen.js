
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { getDriverTripHistory } from '../../services/tripService';
import { calculateFareBreakdown, formatCurrency } from '../../utils/fareLogic';
import { TRIP_STATUS } from '../../utils/tripLogic';

export default function PaymentSummaryScreen({ uid }) {
  const [loading, setLoading] = useState(true);
  const [totals, setTotals] = useState({
    totalFare: 0,
    driverEarnings: 0,
    commission: 0,
  });

  useEffect(() => {
    async function loadPayments() {
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
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }

    loadPayments();
  }, [uid]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#276EF1" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Estado de Pagos</Text>
      
      <View style={styles.card}>
        <Text style={styles.cardLabel}>Próximo pago estimado</Text>
        <Text style={styles.cardValue}>{formatCurrency(totals.driverEarnings)}</Text>
        <Text style={styles.cardSub}>Fecha: Lunes próximo</Text>
      </View>

      <View style={styles.detailsCard}>
        <DetailRow label="Total viajes" value={formatCurrency(totals.totalFare)} />
        <DetailRow label="Comisión UberClone (20%)" value={`- ${formatCurrency(totals.commission)}`} isNegative />
        <View style={styles.divider} />
        <DetailRow label="Total a transferir" value={formatCurrency(totals.driverEarnings)} isTotal />
      </View>

      <View style={styles.infoBox}>
        <Text style={styles.infoTitle}>¿Cómo funcionan los pagos?</Text>
        <Text style={styles.infoText}>
          Los pagos se procesan semanalmente a tu cuenta de Mercado Pago registrada. 
          La comisión del 20% se descuenta automáticamente del valor total de cada viaje.
        </Text>
      </View>
    </ScrollView>
  );
}

function DetailRow({ label, value, isNegative, isTotal }) {
  return (
    <View style={styles.detailRow}>
      <Text style={[styles.detailLabel, isTotal && styles.totalText]}>{label}</Text>
      <Text style={[
        styles.detailValue, 
        isNegative && styles.negativeText,
        isTotal && styles.totalText
      ]}>
        {value}
      </Text>
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
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#161B26',
    marginBottom: 20,
  },
  card: {
    backgroundColor: '#276EF1',
    padding: 24,
    borderRadius: 16,
    marginBottom: 20,
  },
  cardLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    fontWeight: '600',
  },
  cardValue: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '800',
    marginVertical: 8,
  },
  cardSub: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
  },
  detailsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  detailLabel: {
    fontSize: 14,
    color: '#697386',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#161B26',
  },
  negativeText: {
    color: '#D93025',
  },
  totalText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#161B26',
  },
  divider: {
    height: 1,
    backgroundColor: '#F0F2F5',
    marginBottom: 16,
  },
  infoBox: {
    backgroundColor: '#E7EAF0',
    padding: 20,
    borderRadius: 12,
  },
  infoTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#161B26',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 13,
    color: '#616B78',
    lineHeight: 20,
  },
});
