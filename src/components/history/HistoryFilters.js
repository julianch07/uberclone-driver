// AI-assisted: see docs/AI_LOG.md #40
// Filtros del historial: periodo (Todos, Hoy, Semana, Mes, Rango) y método
// de pago. Se combinan entre sí. El rango usa el DateTimePicker ya
// instalado, con el mismo patrón que el registro (diálogo en Android,
// selector y botón "Confirmar fecha" en iOS).
import { useState } from 'react';
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';

import {
  formatHistoryDate,
  HISTORY_PAYMENT_OPTIONS,
  HISTORY_PERIOD,
  HISTORY_PERIOD_OPTIONS,
} from '../../utils/tripHistoryLogic';

function Chip({ label, selected, onPress }) {
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={[styles.chip, selected && styles.chipSelected]}
      onPress={onPress}
    >
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
    </TouchableOpacity>
  );
}

export default function HistoryFilters({ filters, onChange }) {
  const [pickerTarget, setPickerTarget] = useState(null);
  const today = new Date();

  const selectPeriod = (period) => {
    if (period === HISTORY_PERIOD.RANGE && (!filters.rangeStart || !filters.rangeEnd)) {
      // Rango inicial válido: del día 1 del mes actual a hoy.
      onChange({
        ...filters,
        period,
        rangeStart: new Date(today.getFullYear(), today.getMonth(), 1),
        rangeEnd: today,
      });
      return;
    }
    onChange({ ...filters, period });
  };

  const handleDateChange = (event, selectedDate) => {
    const target = pickerTarget;
    if (Platform.OS !== 'ios') setPickerTarget(null);
    if (event?.type === 'dismissed' || !selectedDate || !target) return;

    onChange({
      ...filters,
      [target === 'start' ? 'rangeStart' : 'rangeEnd']: selectedDate,
    });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Periodo</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        {HISTORY_PERIOD_OPTIONS.map((option) => (
          <Chip
            key={option.value}
            label={option.label}
            selected={filters.period === option.value}
            onPress={() => selectPeriod(option.value)}
          />
        ))}
      </ScrollView>

      {filters.period === HISTORY_PERIOD.RANGE ? (
        <View style={styles.rangeRow}>
          <TouchableOpacity
            accessibilityRole="button"
            style={styles.dateButton}
            onPress={() => setPickerTarget('start')}
          >
            <Text style={styles.dateLabel}>Desde</Text>
            <Text style={styles.dateValue}>{formatHistoryDate(filters.rangeStart)}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            accessibilityRole="button"
            style={styles.dateButton}
            onPress={() => setPickerTarget('end')}
          >
            <Text style={styles.dateLabel}>Hasta</Text>
            <Text style={styles.dateValue}>{formatHistoryDate(filters.rangeEnd)}</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {pickerTarget ? (
        <DateTimePicker
          value={(pickerTarget === 'start' ? filters.rangeStart : filters.rangeEnd) || today}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          maximumDate={today}
          minimumDate={pickerTarget === 'end' ? filters.rangeStart || undefined : undefined}
          onChange={handleDateChange}
        />
      ) : null}

      {Platform.OS === 'ios' && pickerTarget ? (
        <TouchableOpacity
          accessibilityRole="button"
          style={styles.confirmButton}
          onPress={() => setPickerTarget(null)}
        >
          <Text style={styles.confirmText}>Confirmar fecha</Text>
        </TouchableOpacity>
      ) : null}

      <Text style={[styles.label, styles.spaced]}>Método de pago</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        {HISTORY_PAYMENT_OPTIONS.map((option) => (
          <Chip
            key={option.value}
            label={option.label}
            selected={filters.paymentMethod === option.value}
            onPress={() => onChange({ ...filters, paymentMethod: option.value })}
          />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: '#697386',
    marginBottom: 8,
  },
  spaced: {
    marginTop: 12,
  },
  chips: {
    gap: 8,
    paddingRight: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D0D5DD',
  },
  chipSelected: {
    backgroundColor: '#276EF1',
    borderColor: '#276EF1',
  },
  chipText: {
    color: '#344054',
    fontWeight: '600',
  },
  chipTextSelected: {
    color: '#FFFFFF',
  },
  rangeRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  dateButton: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#D0D5DD',
    padding: 10,
  },
  dateLabel: {
    fontSize: 11,
    color: '#697386',
    fontWeight: '700',
  },
  dateValue: {
    fontSize: 14,
    color: '#161B26',
    marginTop: 2,
  },
  confirmButton: {
    alignSelf: 'flex-start',
    marginTop: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#E8F0FE',
  },
  confirmText: {
    color: '#276EF1',
    fontWeight: '700',
  },
});
