// AI-assisted: see docs/AI_LOG.md #37
// Viajes finalizados que se cobran con Mercado Pago (modo de prueba). Se
// muestra en la pestaña Viajes, junto a los cobros en efectivo.
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { usePendingGatewayPayments } from '../../hooks/useGatewayPayments';
import { formatCurrency } from '../../utils/fareLogic';
import {
  getGatewayChargeAmount,
  getGatewayStatusInfo,
  isDemoPayment,
} from '../../utils/gatewayPaymentLogic';
// AI-assisted: see docs/AI_LOG.md #38
import { DEMO_LABEL, PAYMENTS_DEMO } from '../../config/paymentsDemo';

function Row({ label, value, strong }) {
  return (
    <View style={styles.row}>
      <Text style={[styles.rowLabel, strong && styles.strong]}>{label}</Text>
      <Text style={[styles.rowValue, strong && styles.strong]}>{value}</Text>
    </View>
  );
}

// Resumen del cobro confirmado por el backend (guía, pantalla 4).
function PaymentResult({ trip, status, approved, onDismiss }) {
  // AI-assisted: see docs/AI_LOG.md #38
  const demo = isDemoPayment(trip);
  const title = demo
    ? approved
      ? 'Pago de demostración aprobado (no es Mercado Pago)'
      : 'Cobro simulado'
    : approved
      ? 'Pago aprobado por Mercado Pago'
      : 'Cobro con Mercado Pago';

  return (
    <View style={[styles.card, approved ? styles.approvedCard : null, demo ? styles.demoCard : null]}>
      {demo ? <Text style={styles.demoTag}>{DEMO_LABEL}</Text> : null}
      <Text style={styles.title}>{title}</Text>
      <Text style={[styles.status, styles[status.tone]]}>{status.label}</Text>

      {approved ? (
        <>
          <Row label="Tarifa" value={formatCurrency(trip.fare)} />
          {trip.tip > 0 ? <Row label="Propina" value={formatCurrency(trip.tip)} /> : null}
          <Row label="Comisión de la plataforma (20 %)" value={`- ${formatCurrency(trip.commission)}`} />
          <Row label="Tu ganancia neta" value={formatCurrency(trip.driverEarnings)} strong />
          <Text style={styles.note}>
            La ganancia se suma a tu saldo en la pantalla Pagos.
          </Text>
        </>
      ) : (
        <Text style={styles.note}>
          {demo
            ? 'El estado se actualiza solo cuando el checkout de demostración registra el resultado.'
            : 'El estado se actualiza solo cuando Mercado Pago confirma el pago.'}
        </Text>
      )}

      <TouchableOpacity accessibilityRole="button" onPress={onDismiss}>
        <Text style={styles.link}>Ocultar</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function PendingGatewayPayments({ uid }) {
  const {
    trips,
    loading,
    error,
    processingId,
    actionError,
    startCheckout,
    watchedTrip,
    watchedStatus,
    watchedApproved,
    dismissResult,
  } = usePendingGatewayPayments(uid);

  if (loading) {
    return null;
  }

  const showResult = Boolean(watchedTrip && watchedStatus);

  if (!error && !actionError && !showResult && trips.length === 0) {
    return null;
  }

  return (
    <View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {actionError ? <Text style={styles.error}>{actionError}</Text> : null}

      {showResult ? (
        <PaymentResult
          trip={watchedTrip}
          status={watchedStatus}
          approved={watchedApproved}
          onDismiss={dismissResult}
        />
      ) : null}

      {trips
        .filter((trip) => !(showResult && trip.id === watchedTrip.id && watchedApproved))
        .map((trip) => {
          const status = getGatewayStatusInfo(trip);
          const processing = processingId === trip.id;
          const busy = processingId !== null;

          return (
            <View key={trip.id} style={[styles.card, PAYMENTS_DEMO.enabled ? styles.demoCard : null]}>
              {/* AI-assisted: see docs/AI_LOG.md #38 */}
              {PAYMENTS_DEMO.enabled ? <Text style={styles.demoTag}>{DEMO_LABEL}</Text> : null}
              <Text style={styles.title}>
                {PAYMENTS_DEMO.enabled ? 'Cobro simulado (pasarela de demostración)' : 'Cobro con Mercado Pago'}
              </Text>
              <Text style={styles.muted}>
                {trip.destination?.address || 'Viaje finalizado'}
              </Text>
              <Text style={[styles.status, styles[status.tone]]}>{status.label}</Text>

              <Row label="Total a cobrar al pasajero" value={formatCurrency(getGatewayChargeAmount(trip))} strong />
              <Row label="Comisión de la plataforma (20 %)" value={formatCurrency(trip.commission)} />
              <Row label="Tu ganancia neta" value={formatCurrency(trip.driverEarnings)} strong />

              <Text style={styles.note}>
                {PAYMENTS_DEMO.enabled
                  ? 'Se abrirá un checkout SIMULADO de MODO DEMOSTRACIÓN. No es Mercado Pago: no se usa ninguna tarjeta ni se procesa dinero.'
                  : 'Se abrirá el checkout de Mercado Pago (modo de prueba) para que el pasajero pague con una tarjeta de prueba. No se procesa dinero real.'}
              </Text>

              <TouchableOpacity
                accessibilityRole="button"
                style={[styles.button, busy && styles.disabled]}
                disabled={busy}
                onPress={() => startCheckout(trip.id)}
              >
                {processing ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.buttonText}>
                    {trip.paymentStatus === 'rejected' || trip.paymentStatus === 'pending'
                      ? 'Abrir de nuevo el pago'
                      : PAYMENTS_DEMO.enabled
                        ? 'Abrir checkout de demostración'
                        : 'Cobrar con Mercado Pago'}
                  </Text>
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
    borderColor: '#9EC5FE',
  },
  approvedCard: {
    borderColor: '#75B798',
  },
  // AI-assisted: see docs/AI_LOG.md #38
  demoCard: {
    borderColor: '#B26A00',
    borderWidth: 2,
  },
  demoTag: {
    alignSelf: 'flex-start',
    backgroundColor: '#B26A00',
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginBottom: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#161B26',
    marginBottom: 4,
  },
  muted: {
    color: '#616B78',
    marginBottom: 6,
  },
  status: {
    fontWeight: '600',
    marginBottom: 8,
  },
  neutral: { color: '#616B78' },
  warning: { color: '#9A6700' },
  error: { color: '#B42318', marginBottom: 12 },
  success: { color: '#157347' },
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
    backgroundColor: '#009EE3',
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
  link: {
    color: '#276EF1',
    fontWeight: '600',
    marginTop: 12,
  },
});
