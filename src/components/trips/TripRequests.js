// AI-assisted: see docs/AI_LOG.md #15
// AI-assisted: see docs/AI_LOG.md #16
// AI-assisted: see docs/AI_LOG.md #17
// AI-assisted: see docs/AI_LOG.md #18
// AI-assisted: see docs/AI_LOG.md #20
// AI-assisted: see docs/AI_LOG.md #28
// AI-assisted: see docs/AI_LOG.md #29

import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { useDriverContext } from '../../context/DriverContext';
import useTripRequests, {
  getTripRequestErrorMessage,
} from '../../hooks/useTripRequests';
import { formatCurrency } from '../../utils/fareLogic';
import { getActiveTripStage, TRIP_STAGE } from '../../utils/tripLogic';
import {
  getCategoryLabel,
  getPaymentMethodLabel,
  getTripEstimate,
} from '../../utils/tripRequestLogic';
import { OFFER_TIMING_STATE } from '../../utils/tripRequestTimer';
import PendingCashPayments from '../payments/PendingCashPayments';
// AI-assisted: see docs/AI_LOG.md #37
import PendingGatewayPayments from '../payments/PendingGatewayPayments';

import {
  markDriverArriving,
  markArrivedAtPickup,
  startTrip,
  completeTrip,
  cancelTrip,
} from '../../services/tripService';

// AI-assisted: see docs/AI_LOG.md #28
// Etapas del viaje activo: texto de estado y acción principal.
const STAGE_INFO = {
  [TRIP_STAGE.ACCEPTED]: {
    label: 'Aceptado',
    action: { key: 'arriving', label: 'Voy en camino', busy: 'Actualizando...', run: markDriverArriving },
    canCancel: true,
  },
  [TRIP_STAGE.TO_PICKUP]: {
    label: 'En camino al punto de recogida',
    action: { key: 'arrived', label: 'Llegué al origen', busy: 'Registrando llegada...', run: markArrivedAtPickup },
    canCancel: true,
  },
  [TRIP_STAGE.AT_PICKUP]: {
    label: 'Esperando al pasajero en el origen',
    action: { key: 'start', label: 'Pasajero a bordo', busy: 'Iniciando...', run: startTrip },
    canCancel: true,
  },
  [TRIP_STAGE.TO_DESTINATION]: {
    label: 'En curso hacia el destino',
    action: { key: 'complete', label: 'Finalizar viaje', busy: 'Finalizando...', run: completeTrip },
    canCancel: false,
  },
};

function EstimateRows({ estimate, prefix }) {
  if (!estimate) {
    return (
      <Text style={styles.muted}>Tarifa por confirmar.</Text>
    );
  }

  return (
    <View style={styles.estimate}>
      <View style={styles.estimateRow}>
        <Text style={styles.estimateLabel}>{prefix} tarifa</Text>
        <Text style={styles.estimateValue}>{formatCurrency(estimate.fare)}</Text>
      </View>
      <View style={styles.estimateRow}>
        <Text style={styles.estimateLabel}>Comisión (20 %)</Text>
        <Text style={styles.estimateValue}>- {formatCurrency(estimate.commission)}</Text>
      </View>
      {estimate.tip > 0 ? (
        <View style={styles.estimateRow}>
          <Text style={styles.estimateLabel}>Propina</Text>
          <Text style={styles.estimateValue}>+ {formatCurrency(estimate.tip)}</Text>
        </View>
      ) : null}
      <View style={styles.estimateRow}>
        <Text style={styles.estimateLabelStrong}>Tu ganancia neta</Text>
        <Text style={styles.fare}>{formatCurrency(estimate.driverEarnings)}</Text>
      </View>
    </View>
  );
}

export default function TripRequests({ uid, enabled }) {
  const {
    activeTrip,
    activeTripId,
    activeTripLoading,
    activeTripError,
  } = useDriverContext();

  const hasActiveTrip = Boolean(activeTripId);

  // AI-assisted: see docs/AI_LOG.md #18
  // Do not offer new trips when active-trip recovery is uncertain.
  const tripRecoveryBlocked =
    activeTripLoading || Boolean(activeTripError);

  // AI-assisted: see docs/AI_LOG.md #28
  const {
    requests,
    loading,
    error,
    actionError,
    message,
    processing,
    acceptRequest,
    rejectRequest,
  } = useTripRequests({
    uid,
    enabled: enabled && !hasActiveTrip && !tripRecoveryBlocked,
  });

  const [tripAction, setTripAction] = useState(null);
  const [tripActionError, setTripActionError] = useState('');

  const handleTripAction = useCallback(
    async (action, operation) => {
      if (
        tripAction ||
        !activeTrip ||
        !activeTripId ||
        activeTripLoading ||
        !uid
      ) {
        return;
      }

      setTripAction(action);
      setTripActionError('');

      try {
        await operation(activeTripId, uid);

        // Firestore onSnapshot synchronizes the trip status.
      } catch (operationError) {
        setTripActionError(
          getTripRequestErrorMessage(
            operationError,
            'No fue posible actualizar el estado del viaje.'
          )
        );
      } finally {
        setTripAction(null);
      }
    },
    [tripAction, activeTrip, activeTripId, activeTripLoading, uid]
  );

  // Show the assigned trip or its recovery state.
  if (hasActiveTrip || activeTripLoading) {
    const stage = getActiveTripStage(activeTrip);
    const stageInfo = stage ? STAGE_INFO[stage] : null;
    const busy = tripAction !== null || activeTripLoading;

    return (
      <View style={styles.card}>
        <Text style={styles.title}>
          {activeTrip
            ? 'Viaje asignado'
            : activeTripError
              ? 'No se pudo consultar el viaje'
              : 'Recuperando viaje activo...'}
        </Text>

        {activeTripLoading ? (
          <ActivityIndicator
            size="large"
            color="#276EF1"
          />
        ) : null}

        {activeTrip ? (
          <>
            <Text style={styles.label}>ESTADO</Text>
            <Text style={styles.value}>
              {stageInfo ? stageInfo.label : activeTrip.status}
            </Text>

            <Text style={styles.label}>ORIGEN</Text>
            <Text style={styles.value}>
              {activeTrip.pickup?.address || 'No disponible'}
            </Text>

            <Text style={styles.label}>DESTINO</Text>
            <Text style={styles.value}>
              {activeTrip.destination?.address || 'No disponible'}
            </Text>

            <Text style={styles.label}>CATEGORÍA · PAGO</Text>
            <Text style={styles.value}>
              {getCategoryLabel(activeTrip.category)} ·{' '}
              {getPaymentMethodLabel(activeTrip.paymentMethod)}
            </Text>

            <Text style={styles.label}>TARIFA ESTIMADA</Text>
            <EstimateRows
              estimate={getTripEstimate(activeTrip)}
              prefix="Tarifa"
            />

            {stageInfo ? (
              <TouchableOpacity
                accessibilityRole="button"
                style={[styles.button, busy && styles.disabled]}
                disabled={busy}
                onPress={() =>
                  handleTripAction(stageInfo.action.key, stageInfo.action.run)
                }
              >
                <Text style={styles.buttonText}>
                  {tripAction === stageInfo.action.key
                    ? stageInfo.action.busy
                    : stageInfo.action.label}
                </Text>
              </TouchableOpacity>
            ) : null}

            {stageInfo?.canCancel ? (
              <TouchableOpacity
                accessibilityRole="button"
                style={[
                  styles.button,
                  styles.cancelButton,
                  busy && styles.disabled,
                ]}
                disabled={busy}
                onPress={() => handleTripAction('cancel', cancelTrip)}
              >
                <Text style={styles.buttonText}>
                  {tripAction === 'cancel'
                    ? 'Cancelando...'
                    : 'Cancelar viaje'}
                </Text>
              </TouchableOpacity>
            ) : null}
          </>
        ) : null}

        {tripActionError ? (
          <Text style={styles.error}>{tripActionError}</Text>
        ) : null}

        {activeTripError ? (
          <Text style={styles.error}>
            {activeTripError}
          </Text>
        ) : null}
      </View>
    );
  }

  // Keep requests blocked if Firestore recovery failed.
  if (activeTripError) {
    return (
      <View style={styles.card}>
        <Text style={styles.title}>
          No se pudo verificar tu viaje activo
        </Text>

        <Text style={styles.error}>
          {activeTripError}
        </Text>

        <Text style={styles.muted}>
          Por seguridad, no puedes aceptar nuevas
          solicitudes hasta que se compruebe si
          tienes un viaje activo. Reinicia la
          aplicación para intentar recuperarlo.
        </Text>
      </View>
    );
  }

  if (!enabled) {
    return (
      <View>
        {/* AI-assisted: see docs/AI_LOG.md #29 */}
        <PendingCashPayments uid={uid} />
        {/* AI-assisted: see docs/AI_LOG.md #37 */}
        <PendingGatewayPayments uid={uid} />
      <View style={styles.card}>
        <Text style={styles.title}>
          Solicitudes de viajes
        </Text>

        <Text style={styles.muted}>
          Debes tener tu registro completo, estar
          aprobado y conectado para recibir
          solicitudes.
        </Text>
      </View>
      </View>
    );
  }

  return (
    <View>
      {/* AI-assisted: see docs/AI_LOG.md #29 */}
      {/* Cobros en efectivo de viajes recién finalizados. */}
      <PendingCashPayments uid={uid} />
      {/* AI-assisted: see docs/AI_LOG.md #37 */}
      {/* Cobros con Mercado Pago (modo de prueba). */}
      <PendingGatewayPayments uid={uid} />

      <Text style={styles.heading}>
        Solicitudes disponibles
      </Text>

      {loading ? (
        <ActivityIndicator
          size="large"
          color="#276EF1"
        />
      ) : null}

      {error ? (
        <Text style={styles.error}>{error}</Text>
      ) : null}

      {actionError ? (
        <Text style={styles.error}>{actionError}</Text>
      ) : null}

      {message ? (
        <Text style={styles.success}>{message}</Text>
      ) : null}

      {!loading && !error && requests.length === 0 ? (
        <View style={styles.card}>
          <Text style={styles.title}>
            Sin solicitudes por ahora
          </Text>

          <Text style={styles.muted}>
            Estás disponible. Las nuevas solicitudes
            aparecerán automáticamente aquí.
          </Text>
        </View>
      ) : null}

      {/* AI-assisted: see docs/AI_LOG.md #28 */}
      {requests.map((request) => {
        const isBusy = processing !== null;
        const waiting =
          request.timing.state === OFFER_TIMING_STATE.WAITING_SERVER;

        return (
          <View
            key={request.id}
            style={styles.card}
          >
            <Text style={styles.timer}>
              {waiting
                ? 'Preparando solicitud...'
                : `Tiempo para responder: ${request.timing.remainingSeconds} s`}
            </Text>

            <Text style={styles.label}>ORIGEN</Text>
            <Text style={styles.value}>{request.pickupAddress}</Text>

            <Text style={styles.label}>DESTINO</Text>
            <Text style={styles.value}>{request.destinationAddress}</Text>

            <View style={styles.detailsRow}>
              <View style={styles.detail}>
                <Text style={styles.label}>DISTANCIA</Text>
                <Text style={styles.value}>{request.distanceLabel}</Text>
              </View>
              <View style={styles.detail}>
                <Text style={styles.label}>DURACIÓN</Text>
                <Text style={styles.value}>{request.durationLabel}</Text>
              </View>
            </View>

            <View style={styles.detailsRow}>
              <View style={styles.detail}>
                <Text style={styles.label}>CATEGORÍA</Text>
                <Text style={styles.value}>{request.categoryLabel}</Text>
              </View>
              <View style={styles.detail}>
                <Text style={styles.label}>PAGO</Text>
                <Text style={styles.value}>{request.paymentMethodLabel}</Text>
              </View>
            </View>

            <Text style={styles.label}>ESTIMACIÓN</Text>
            <EstimateRows estimate={request.estimate} prefix="Tarifa" />

            <View style={styles.actionsRow}>
              <TouchableOpacity
                accessibilityRole="button"
                style={[
                  styles.button,
                  styles.rejectButton,
                  styles.actionButton,
                  (isBusy || waiting) && styles.disabled,
                ]}
                disabled={isBusy || waiting}
                onPress={() => rejectRequest(request.id)}
              >
                <Text style={styles.rejectButtonText}>
                  {processing?.tripId === request.id &&
                  processing.action === 'reject'
                    ? 'Rechazando...'
                    : 'Rechazar'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                accessibilityRole="button"
                style={[
                  styles.button,
                  styles.actionButton,
                  (isBusy || !request.canAccept) && styles.disabled,
                ]}
                disabled={isBusy || !request.canAccept}
                onPress={() => acceptRequest(request.id)}
              >
                <Text style={styles.buttonText}>
                  {processing?.tripId === request.id &&
                  processing.action === 'accept'
                    ? 'Aceptando...'
                    : 'Aceptar'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  heading: {
    fontSize: 20,
    fontWeight: '800',
    color: '#161B26',
    marginBottom: 14,
  },

  card: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 16,
    marginBottom: 14,
  },

  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#161B26',
    marginBottom: 8,
  },

  label: {
    color: '#697386',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 12,
    marginBottom: 4,
  },

  value: {
    color: '#161B26',
    fontSize: 15,
  },

  fare: {
    color: '#157347',
    fontSize: 24,
    fontWeight: '800',
    marginTop: 4,
  },

  muted: {
    color: '#616B78',
    lineHeight: 21,
  },

  button: {
    backgroundColor: '#276EF1',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 18,
  },

  cancelButton: {
    backgroundColor: '#B42318',
  },

  timer: {
    color: '#B42318',
    fontSize: 16,
    fontWeight: '800',
    marginTop: 16,
  },

  disabled: {
    opacity: 0.45,
  },

  // AI-assisted: see docs/AI_LOG.md #28
  rejectButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#B42318',
  },

  rejectButtonText: {
    color: '#B42318',
    fontWeight: '700',
  },

  actionsRow: {
    flexDirection: 'row',
    gap: 12,
  },

  actionButton: {
    flex: 1,
  },

  detailsRow: {
    flexDirection: 'row',
    gap: 12,
  },

  detail: {
    flex: 1,
  },

  estimate: {
    marginTop: 4,
  },

  estimateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },

  estimateLabel: {
    color: '#616B78',
    fontSize: 14,
  },

  estimateLabelStrong: {
    color: '#161B26',
    fontSize: 14,
    fontWeight: '700',
  },

  estimateValue: {
    color: '#161B26',
    fontSize: 14,
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
