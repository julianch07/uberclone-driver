// AI-assisted: see docs/AI_LOG.md #22
// AI-assisted: see docs/AI_LOG.md #40
// Historial de carreras (guía, sección 6): FlatList ordenada del viaje más
// reciente al más antiguo, filtros combinables (periodo y método de pago),
// carga incremental de 20 en 20 y detalle con mapa al tocar un viaje.
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import HistoryFilters from '../../components/history/HistoryFilters';
import TripHistoryDetail from '../../components/history/TripHistoryDetail';
import useTripHistory from '../../hooks/useTripHistory';
import { formatCurrency } from '../../utils/fareLogic';
import {
  buildHistoryListItem,
  DEFAULT_HISTORY_FILTERS,
  HISTORY_PERIOD,
} from '../../utils/tripHistoryLogic';

function TripHistoryItem({ trip, onPress }) {
  const item = buildHistoryListItem(trip);

  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityHint="Abre el detalle del viaje"
      style={styles.tripItem}
      onPress={() => onPress(trip)}
    >
      <View style={styles.header}>
        <Text style={styles.date} numberOfLines={1}>{item.dateLabel}</Text>
        <View style={[styles.badge, item.cancelled ? styles.errorBadge : styles.successBadge]}>
          <Text style={styles.badgeText}>{item.statusLabel}</Text>
        </View>
      </View>

      <View style={styles.location}>
        <View style={styles.dot} />
        <Text style={styles.address} numberOfLines={1}>{item.pickupAddress}</Text>
      </View>
      <View style={[styles.location, styles.locationSpacing]}>
        <View style={[styles.dot, styles.destinationDot]} />
        <Text style={styles.address} numberOfLines={1}>{item.destinationAddress}</Text>
      </View>

      <Text style={styles.meta}>
        {item.categoryLabel} · {item.paymentMethodLabel}
      </Text>
      <Text style={styles.paymentLabel}>{item.paymentStatusLabel}</Text>

      <View style={styles.footer}>
        <View style={styles.amountBlock}>
          <Text style={styles.amountLabel}>Tarifa</Text>
          <Text style={styles.fareValue}>
            {item.fare === null ? 'Sin cobro' : formatCurrency(item.fare)}
          </Text>
        </View>
        <View style={[styles.amountBlock, styles.amountRight]}>
          <Text style={styles.amountLabel}>Ganancia neta</Text>
          <Text style={styles.earningsValue}>
            {item.driverEarnings === null ? '—' : formatCurrency(item.driverEarnings)}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function TripHistoryScreen({ uid }) {
  const [filters, setFilters] = useState(DEFAULT_HISTORY_FILTERS);
  const [selectedTrip, setSelectedTrip] = useState(null);
  const {
    trips,
    loading,
    loadingMore,
    error,
    hasMore,
    usingFallback,
    reload,
    loadMore,
  } = useTripHistory(uid, filters);

  const openDetail = useCallback((trip) => setSelectedTrip(trip), []);
  const closeDetail = useCallback(() => setSelectedTrip(null), []);

  const filtered =
    filters.period !== HISTORY_PERIOD.ALL || filters.paymentMethod !== 'all';

  const header = (
    <View>
      <HistoryFilters filters={filters} onChange={setFilters} />
      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.error}>{error}</Text>
          <TouchableOpacity accessibilityRole="button" onPress={reload}>
            <Text style={styles.retry}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      ) : null}
      {usingFallback ? (
        <Text style={styles.notice}>
          Historial ordenado en el dispositivo mientras se publica el índice de Firestore.
        </Text>
      ) : null}
      {loading ? <ActivityIndicator style={styles.loader} size="large" color="#276EF1" /> : null}
    </View>
  );

  const footer = loadingMore ? (
    <ActivityIndicator style={styles.loader} color="#276EF1" />
  ) : hasMore && !loading ? (
    <TouchableOpacity accessibilityRole="button" style={styles.moreButton} onPress={loadMore}>
      <Text style={styles.moreText}>Cargar más viajes</Text>
    </TouchableOpacity>
  ) : null;

  return (
    <View style={styles.container}>
      <FlatList
        data={loading ? [] : trips}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <TripHistoryItem trip={item} onPress={openDetail} />}
        ListHeaderComponent={header}
        ListFooterComponent={footer}
        ListEmptyComponent={
          loading || error ? null : (
            <Text style={styles.emptyText}>
              {filtered
                ? 'No hay viajes para los filtros seleccionados.'
                : 'No tienes viajes registrados.'}
            </Text>
          )
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.4}
        refreshing={false}
        onRefresh={reload}
        contentContainerStyle={styles.listContent}
      />
      <TripHistoryDetail trip={selectedTrip} onClose={closeDetail} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F6F8',
  },
  listContent: {
    padding: 20,
  },
  loader: {
    marginVertical: 16,
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
    marginBottom: 12,
    gap: 8,
  },
  date: {
    flex: 1,
    fontSize: 12,
    color: '#697386',
    fontWeight: '600',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    flexShrink: 0,
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
  location: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationSpacing: {
    marginTop: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#AAB0B8',
    marginRight: 10,
  },
  destinationDot: {
    backgroundColor: '#276EF1',
  },
  address: {
    fontSize: 14,
    color: '#161B26',
    flex: 1,
  },
  meta: {
    fontSize: 13,
    color: '#344054',
    marginTop: 12,
  },
  paymentLabel: {
    fontSize: 12,
    color: '#697386',
    marginTop: 2,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingTop: 12,
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F2F5',
    gap: 12,
  },
  // Tarifa y ganancia se reparten el ancho: ningún importe empuja al otro.
  amountBlock: {
    flex: 1,
    minWidth: 0,
  },
  amountRight: {
    alignItems: 'flex-end',
  },
  amountLabel: {
    fontSize: 12,
    color: '#697386',
  },
  fareValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#161B26',
  },
  earningsValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#157347',
    textAlign: 'right',
  },
  emptyText: {
    textAlign: 'center',
    color: '#697386',
    marginTop: 24,
  },
  errorBox: {
    backgroundColor: '#FEF3F2',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  error: {
    color: '#B42318',
  },
  retry: {
    color: '#276EF1',
    fontWeight: '700',
    marginTop: 6,
  },
  notice: {
    color: '#697386',
    fontSize: 12,
    marginBottom: 12,
  },
  moreButton: {
    alignSelf: 'center',
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 18,
    backgroundColor: '#E8F0FE',
    marginBottom: 12,
  },
  moreText: {
    color: '#276EF1',
    fontWeight: '700',
  },
});
