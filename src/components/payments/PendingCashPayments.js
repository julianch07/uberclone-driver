// AI-assisted: see docs/AI_LOG.md #29
// Viajes en efectivo finalizados cuyo cobro el conductor debe confirmar.
// Se muestra en la pestaña Viajes, que es donde termina el viaje.
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { usePendingCashPayments } from '../../hooks/useDriverPayments';
import { getCashCollectionSummary } from '../../utils/cashPaymentLogic';
import { formatCurrency } from '../../utils/fareLogic';

function Row({ label, value, strong }) {
  return (
    <View style={styles.row}>
      <Text style={[styles.rowLabel, strong && styles.strong]}>{label}</Text>
      <Text style={[styles.rowValue, strong && styles.strong]}>{value}</Text>
    </View>
  );
}

export default function PendingCashPayments({ uid }) {
  const {
    trips,
    loading,
    error,
    processingId,
    actionError,
    message,
    confirmCashReceived,
  } = usePendingCashPayments(uid);

  if (loading) {
    return null;
  }

  if (!error && !actionError && !message && trips.length === 0) {
    return null;
  }

  return (
    <View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {actionError ? <Text style={styles.error}>{actionError}</Text> : null}
      {message ? <Text style={styles.success}>{message}</Text> : null}

      {trips.map((trip) => {
        const summary = getCashCollectionSummary(trip);
        const processing = processingId === trip.id;
        const busy = processingId !== null;

        return (
          <View key={trip.id} style={styles.card}>
            <Text style={styles.title}>Cobro en efectivo por confirmar</Text>
            <Text style={styles.muted}>
              {trip.destination?.address || 'Viaje finalizado'}
            </Text>

            <Row label="Efectivo a recibir del pasajero" value={formatCurrency(summary.cashAmount)} strong />
            <Row label="Tarifa" value={formatCurrency(summary.fare)} />
            {summary.tip > 0 ? (
              <Row label="Propina" value={formatCurrency(summary.tip)} />
            ) : null}
            <Row label="Comisión que debes a la plataforma (20 %)" value={formatCurrency(summary.commission)} />
            <Row label="Tu ganancia neta" value={formatCurrency(summary.driverEarnings)} strong />

            <Text style={styles.note}>
              Confirma solo cuando hayas recibido el dinero. El registro es tu
              declaración: la app no verifica el pago con un banco.
            </Text>

            <TouchableOpacity
              accessibilityRole="button"
              style={[styles.button, busy && styles.disabled]}
              disabled={busy}
              onPress={() => confirmCashReceived(trip.id)}
            >
              {processing ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.buttonText}>Confirmar efectivo recibido</Text>
              )}
            </TouchableOpacity>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#F5C26B',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#161B26',
    marginBottom: 4,
  },
  muted: {
    color: '#616B78',
    marginBottom: 10,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
    gap: 12,
  },
  rowLabel: {
    color: '#616B78',
    fontSize: 14,
    flex: 1,
  },
  rowValue: {
    color: '#161B26',
    fontSize: 14,
  },
  strong: {
    color: '#161B26',
    fontWeight: '700',
  },
  note: {
    color: '#697386',
    fontSize: 12,
    lineHeight: 17,
    marginTop: 12,
  },
  button: {
    backgroundColor: '#157347',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 14,
  },
  disabled: {
    opacity: 0.45,
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  error: {
    color: '#B42318',
    marginBottom: 12,
  },
  success: {
    color: '#157347',
    marginBottom: 12,
  },
});
