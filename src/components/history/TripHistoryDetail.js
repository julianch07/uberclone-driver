// AI-assisted: see docs/AI_LOG.md #40
// Detalle de un viaje del historial (guía, sección 6). Se abre en un Modal
// para no modificar la navegación existente. Muestra solo datos guardados en
// el viaje: lo que no existe aparece como "No disponible" o "Sin
// calificación".
import {
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';

import TripRouteMap from './TripRouteMap';
import { formatCurrency } from '../../utils/fareLogic';
import { buildTripDetail } from '../../utils/tripHistoryLogic';

function Row({ label, value, strong, negative }) {
  return (
    <View style={styles.row}>
      <Text style={[styles.rowLabel, strong && styles.strong]}>{label}</Text>
      <Text style={[styles.rowValue, strong && styles.strong, negative && styles.negative]}>
        {value}
      </Text>
    </View>
  );
}

function Section({ title, children }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function DetailContent({ trip, onClose }) {
  const insets = useSafeAreaInsets();
  const detail = buildTripDetail(trip);
  const money = (value) => (value === null ? 'No disponible' : formatCurrency(value));

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle} numberOfLines={1}>Detalle del viaje</Text>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Cerrar detalle del viaje"
          onPress={onClose}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={styles.close}>Cerrar</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.statusRow}>
          <Text style={[styles.status, detail.cancelled ? styles.statusCancelled : styles.statusOk]}>
            {detail.statusLabel}
          </Text>
          <Text style={styles.paymentStatus}>{detail.paymentStatusLabel}</Text>
        </View>

        <Section title="Recorrido">
          <Text style={styles.label}>ORIGEN</Text>
          <Text style={styles.address}>{detail.pickupAddress}</Text>
          <Text style={[styles.label, styles.spaced]}>DESTINO</Text>
          <Text style={styles.address}>{detail.destinationAddress}</Text>
          <View style={styles.mapSpacing}>
            <TripRouteMap trip={trip} />
          </View>
        </Section>

        <Section title="Viaje">
          <Row label="Solicitado" value={detail.createdLabel} />
          <Row label={detail.finishedTitle} value={detail.finishedLabel} />
          <Row label="Categoría" value={detail.categoryLabel} />
          <Row label="Distancia" value={detail.distanceLabel} />
          <Row label="Duración" value={detail.durationLabel} />
        </Section>

        <Section title="Cobro">
          {detail.cancelled ? (
            <Text style={styles.muted}>Viaje cancelado: no se cobró tarifa.</Text>
          ) : (
            <>
              <Row label="Tarifa" value={money(detail.fare)} />
              <Row
                label={`Comisión de la plataforma (${detail.commissionRateLabel})`}
                value={detail.commission === null ? 'No disponible' : `- ${formatCurrency(detail.commission)}`}
                negative={detail.commission !== null}
              />
              <Row label="Propina (100 % para ti)" value={money(detail.tip)} />
              <View style={styles.divider} />
              <Row label="Ganancia neta" value={money(detail.driverEarnings)} strong />
            </>
          )}
          <Row label="Método de pago" value={detail.paymentMethodLabel} />
          <Row label="Estado del pago" value={detail.paymentStatusLabel} />
        </Section>

        <Section title="Calificación del pasajero">
          <Text style={styles.rating}>{detail.ratingLabel}</Text>
        </Section>
      </ScrollView>
    </View>
  );
}

export default function TripHistoryDetail({ trip, onClose }) {
  return (
    <Modal
      visible={Boolean(trip)}
      animationType="slide"
      presentationStyle={Platform.OS === 'ios' ? 'pageSheet' : 'fullScreen'}
      onRequestClose={onClose}
    >
      <SafeAreaProvider>
        {trip ? <DetailContent trip={trip} onClose={onClose} /> : null}
      </SafeAreaProvider>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F6F8',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '800',
    color: '#161B26',
    marginRight: 12,
  },
  close: {
    color: '#276EF1',
    fontWeight: '700',
    fontSize: 16,
  },
  content: {
    padding: 20,
    paddingBottom: 32,
  },
  statusRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  status: {
    fontWeight: '800',
    fontSize: 12,
    textTransform: 'uppercase',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    overflow: 'hidden',
  },
  statusOk: {
    backgroundColor: '#D1FAE5',
    color: '#065F46',
  },
  statusCancelled: {
    backgroundColor: '#FEE2E2',
    color: '#991B1B',
  },
  paymentStatus: {
    color: '#697386',
    fontSize: 13,
    flexShrink: 1,
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#161B26',
    marginBottom: 10,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: '#697386',
  },
  spaced: {
    marginTop: 10,
  },
  address: {
    fontSize: 15,
    color: '#161B26',
    marginTop: 2,
  },
  mapSpacing: {
    marginTop: 14,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginTop: 8,
    gap: 12,
  },
  rowLabel: {
    flex: 1,
    color: '#616B78',
    fontSize: 14,
  },
  rowValue: {
    flexShrink: 0,
    maxWidth: '60%',
    textAlign: 'right',
    color: '#161B26',
    fontSize: 14,
  },
  strong: {
    color: '#161B26',
    fontWeight: '800',
  },
  negative: {
    color: '#D93025',
  },
  divider: {
    height: 1,
    backgroundColor: '#F0F2F5',
    marginTop: 10,
  },
  muted: {
    color: '#697386',
  },
  rating: {
    fontSize: 15,
    color: '#161B26',
  },
});
