// AI-assisted: see docs/AI_LOG.md #22
// AI-assisted: see docs/AI_LOG.md #29
// Pagos y saldo del conductor. Se reemplazaron los textos fijos anteriores
// ("Próximo pago estimado", "Lunes próximo", pagos semanales a Mercado
// Pago), que no tenían implementación, por datos reales de Firestore.
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { getDriverTripHistory } from '../../services/tripService';
// AI-assisted: see docs/AI_LOG.md #27
import { formatCurrency, getTripEarnings } from '../../utils/fareLogic';
import { useDriverBalance } from '../../hooks/useDriverPayments';
import {
  isFinishedTrip,
  LEDGER_ENTRY_STATUS,
} from '../../utils/cashPaymentLogic';
import { timestampToMillis } from '../../utils/tripRequestTimer';

function formatEntryDate(entry) {
  const millis = timestampToMillis(entry.createdAt);
  return millis === null
    ? 'Fecha pendiente'
    : new Date(millis).toLocaleDateString('es-CO');
}

export default function PaymentSummaryScreen({ uid }) {
  const [loading, setLoading] = useState(true);
  const [historyError, setHistoryError] = useState('');
  const [totals, setTotals] = useState({
    totalFare: 0,
    driverEarnings: 0,
    commission: 0,
    tips: 0,
  });

  // AI-assisted: see docs/AI_LOG.md #29
  const {
    entries,
    summary: balance,
    hasMoreEntries,
    loading: balanceLoading,
    error: balanceError,
  } = useDriverBalance(uid);

  useEffect(() => {
    async function loadPayments() {
      try {
        setLoading(true);
        setHistoryError('');
        const history = await getDriverTripHistory(uid);
        // AI-assisted: see docs/AI_LOG.md #29
        // Finalizados: completed y paid (con el cobro registrado).
        const finishedTrips = history.filter(isFinishedTrip);

        let totalFare = 0;
        let driverEarnings = 0;
        let commission = 0;
        let tips = 0;

        // AI-assisted: see docs/AI_LOG.md #27
        finishedTrips.forEach(trip => {
          const breakdown = getTripEarnings(trip);
          totalFare += breakdown.fare;
          driverEarnings += breakdown.driverEarnings;
          commission += breakdown.commission;
          tips += breakdown.tip;
        });

        setTotals({ totalFare, driverEarnings, commission, tips });
      } catch (e) {
        console.error(e);
        setHistoryError('No se pudieron cargar tus ganancias.');
      } finally {
        setLoading(false);
      }
    }

    loadPayments();
  }, [uid]);

  if (loading || balanceLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#276EF1" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Pagos y saldo</Text>

      {/* AI-assisted: see docs/AI_LOG.md #29 */}
      {balanceError ? <Text style={styles.errorText}>{balanceError}</Text> : null}

      {/* Los totales se calculan en el servidor sobre todos los asientos;
          sin ellos no se muestra ningún saldo parcial. */}
      {balance ? (
      <>
      <View style={styles.card}>
        <Text style={styles.cardLabel}>Comisión pendiente con la plataforma</Text>
        <Text style={styles.cardValue}>{formatCurrency(balance.pendingCommission)}</Text>
        <Text style={styles.cardSub}>
          {balance.pendingCommission > 0
            ? `Saldo: ${formatCurrency(balance.balance)} (debes esta comisión por viajes en efectivo)`
            : 'No tienes comisiones pendientes.'}
        </Text>
      </View>

      <Text style={styles.sectionTitle}>Viajes cobrados en efectivo</Text>
      <View style={styles.detailsCard}>
        <DetailRow label="Viajes" value={String(balance.tripCount)} />
        <DetailRow label="Efectivo recibido" value={formatCurrency(balance.cashCollected)} />
        <DetailRow label="Comisiones generadas (20 %)" value={`- ${formatCurrency(balance.commissionTotal)}`} isNegative />
        <DetailRow label="Comisión pendiente de pago" value={formatCurrency(balance.pendingCommission)} />
        <View style={styles.divider} />
        <DetailRow label="Ganancia neta en efectivo" value={formatCurrency(balance.netEarnings)} isTotal />
      </View>
      </>
      ) : null}

      <Text style={styles.sectionTitle}>Ganancias de todos tus viajes</Text>
      {historyError ? <Text style={styles.errorText}>{historyError}</Text> : null}
      <View style={styles.detailsCard}>
        <DetailRow label="Total viajes" value={formatCurrency(totals.totalFare)} />
        <DetailRow label="Comisión UberClone (20%)" value={`- ${formatCurrency(totals.commission)}`} isNegative />
        {/* AI-assisted: see docs/AI_LOG.md #27 */}
        {totals.tips > 0 ? (
          <DetailRow label="Propinas (100 % para ti)" value={`+ ${formatCurrency(totals.tips)}`} />
        ) : null}
        <View style={styles.divider} />
        <DetailRow label="Ganancia neta" value={formatCurrency(totals.driverEarnings)} isTotal />
      </View>

      {/* AI-assisted: see docs/AI_LOG.md #29 */}
      <Text style={styles.sectionTitle}>Comisiones por viaje</Text>
      {hasMoreEntries ? (
        <Text style={styles.emptyText}>
          Se muestran los {entries.length} movimientos más recientes de{' '}
          {balance.tripCount}. Los totales incluyen todos.
        </Text>
      ) : null}
      {entries.length === 0 ? (
        <Text style={styles.emptyText}>
          Aún no tienes viajes cobrados en efectivo.
        </Text>
      ) : (
        <View style={styles.detailsCard}>
          {entries.map((entry) => (
            <View key={entry.id} style={styles.entry}>
              <View>
                <Text style={styles.entryDate}>{formatEntryDate(entry)}</Text>
                <Text style={styles.entryDetail}>
                  Efectivo {formatCurrency(entry.cashAmount)}
                </Text>
              </View>
              <View style={styles.entryRight}>
                <Text style={styles.negativeText}>- {formatCurrency(entry.commission)}</Text>
                <Text style={styles.entryStatus}>
                  {entry.status === LEDGER_ENTRY_STATUS.SETTLED ? 'Liquidada' : 'Pendiente'}
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}

      <View style={styles.infoBox}>
        <Text style={styles.infoTitle}>¿Cómo funciona el saldo?</Text>
        <Text style={styles.infoText}>
          En los viajes en efectivo recibes todo el dinero del pasajero, así
          que la comisión del 20 % queda pendiente a favor de la plataforma.
          Las comisiones se marcan como liquidadas cuando la plataforma
          registra su pago; desde la app no se pueden marcar como pagadas.
          Los pagos digitales se confirmarán con la pasarela de pago.
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
  // AI-assisted: see docs/AI_LOG.md #29
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#161B26',
    marginBottom: 10,
  },
  entry: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  entryRight: {
    alignItems: 'flex-end',
  },
  entryDate: {
    fontSize: 13,
    fontWeight: '700',
    color: '#161B26',
  },
  entryDetail: {
    fontSize: 12,
    color: '#697386',
    marginTop: 2,
  },
  entryStatus: {
    fontSize: 12,
    color: '#697386',
    marginTop: 2,
  },
  emptyText: {
    color: '#697386',
    marginBottom: 20,
  },
  errorText: {
    color: '#B42318',
    marginBottom: 12,
  },
});
