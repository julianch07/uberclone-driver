
// AI-assisted: see docs/AI_LOG.md #15
// AI-assisted: see docs/AI_LOG.md #16
// AI-assisted: see docs/AI_LOG.md #17
// AI-assisted: see docs/AI_LOG.md #18

import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { useDriverContext } from '../../context/DriverContext';

import {
  acceptTrip,
  startTrip,
  completeTrip,
  cancelTrip,
  subscribeToPendingTrips,
} from '../../services/tripService';

export default function TripRequests({ uid, enabled }) {
  const {
    activeTrip,
    activeTripId,
    activeTripLoading,
    activeTripError,
    rememberAcceptedTrip,
  } = useDriverContext();

  const hasActiveTrip = Boolean(activeTripId);

  // AI-assisted: see docs/AI_LOG.md #18
  // Do not offer new trips when active-trip recovery is uncertain.
  const tripRecoveryBlocked =
    activeTripLoading || Boolean(activeTripError);

  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(false);
  const [acceptingId, setAcceptingId] = useState(null);
  const [tripAction, setTripAction] = useState(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  // Prevent repeated taps before React updates the component.
  const acceptingRef = useRef(false);

  useEffect(() => {
    if (!enabled || hasActiveTrip || tripRecoveryBlocked) {
      setTrips([]);
      setLoading(false);
      setError('');
      return undefined;
    }

    let cancelled = false;

    setLoading(true);
    setError('');

    const unsubscribe = subscribeToPendingTrips(
      (pendingTrips) => {
        if (cancelled) return;

        setTrips(pendingTrips);
        setLoading(false);
      },
      () => {
        if (cancelled) return;

        setError(
          'No se pudieron consultar las solicitudes de viajes.'
        );
        setLoading(false);
      }
    );

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [enabled, hasActiveTrip, tripRecoveryBlocked]);

  const handleAccept = async (tripId) => {
    if (
      !enabled ||
      !uid ||
      !tripId ||
      acceptingRef.current ||
      hasActiveTrip ||
      tripRecoveryBlocked
    ) {
      return;
    }

    acceptingRef.current = true;

    setAcceptingId(tripId);
    setError('');
    setMessage('');

    try {
      await acceptTrip(tripId, uid);

      const saved = await rememberAcceptedTrip(tripId);

      setMessage(
        saved
          ? '¡Viaje aceptado correctamente!'
          : 'Viaje aceptado, pero no se pudo guardar localmente.'
      );
    } catch (acceptError) {
      setError(
        acceptError?.message ||
          'No fue posible aceptar este viaje.'
      );
    } finally {
      acceptingRef.current = false;
      setAcceptingId(null);
    }
  };

  const handleTripAction = async (action, operation) => {
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
    setError('');
    setMessage('');

    try {
      await operation(activeTripId, uid);

      // Firestore onSnapshot synchronizes the trip status.
    } catch (actionError) {
      setError(
        actionError?.message ||
          'No fue posible actualizar el estado del viaje.'
      );
    } finally {
      setTripAction(null);
    }
  };

  // Show the assigned trip or its recovery state.
  if (hasActiveTrip || activeTripLoading) {
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
              {activeTrip.status === 'accepted'
                ? 'Aceptado'
                : activeTrip.status === 'in_progress'
                  ? 'En curso'
                  : activeTrip.status}
            </Text>

            <Text style={styles.label}>ORIGEN</Text>

            <Text style={styles.value}>
              {activeTrip.pickup?.address ||
                'No disponible'}
            </Text>

            <Text style={styles.label}>DESTINO</Text>

            <Text style={styles.value}>
              {activeTrip.destination?.address ||
                'No disponible'}
            </Text>

            <Text style={styles.label}>
              TARIFA ESTIMADA
            </Text>

            <Text style={styles.fare}>
              {typeof activeTrip.estimatedFare === 'number'
                ? `$${activeTrip.estimatedFare.toLocaleString('es-CO')}`
                : 'Por confirmar'}
            </Text>

            {activeTrip.status === 'accepted' ? (
              <>
                <TouchableOpacity
                  accessibilityRole="button"
                  style={[
                    styles.button,
                    (tripAction !== null ||
                      activeTripLoading) &&
                      styles.disabled,
                  ]}
                  disabled={
                    tripAction !== null ||
                    activeTripLoading
                  }
                  onPress={() =>
                    handleTripAction('start', startTrip)
                  }
                >
                  <Text style={styles.buttonText}>
                    {tripAction === 'start'
                      ? 'Iniciando...'
                      : 'Iniciar viaje'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  accessibilityRole="button"
                  style={[
                    styles.button,
                    styles.cancelButton,
                    (tripAction !== null ||
                      activeTripLoading) &&
                      styles.disabled,
                  ]}
                  disabled={
                    tripAction !== null ||
                    activeTripLoading
                  }
                  onPress={() =>
                    handleTripAction('cancel', cancelTrip)
                  }
                >
                  <Text style={styles.buttonText}>
                    {tripAction === 'cancel'
                      ? 'Cancelando...'
                      : 'Cancelar viaje'}
                  </Text>
                </TouchableOpacity>
              </>
            ) : null}

            {activeTrip.status === 'in_progress' ? (
              <TouchableOpacity
                accessibilityRole="button"
                style={[
                  styles.button,
                  (tripAction !== null ||
                    activeTripLoading) &&
                    styles.disabled,
                ]}
                disabled={
                  tripAction !== null ||
                  activeTripLoading
                }
                onPress={() =>
                  handleTripAction('complete', completeTrip)
                }
              >
                <Text style={styles.buttonText}>
                  {tripAction === 'complete'
                    ? 'Finalizando...'
                    : 'Finalizar viaje'}
                </Text>
              </TouchableOpacity>
            ) : null}
          </>
        ) : null}

        {error ? (
          <Text style={styles.error}>{error}</Text>
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
    );
  }

  return (
    <View>
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

      {message ? (
        <Text style={styles.success}>{message}</Text>
      ) : null}

      {!loading && !error && trips.length === 0 ? (
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

      {trips.map((trip) => (
        <View
          key={trip.id}
          style={styles.card}
        >
          <Text style={styles.label}>ORIGEN</Text>

          <Text style={styles.value}>
            {trip.pickup?.address ||
              'Origen no disponible'}
          </Text>

          <Text style={styles.label}>DESTINO</Text>

          <Text style={styles.value}>
            {trip.destination?.address ||
              'Destino no disponible'}
          </Text>

          <Text style={styles.label}>
            TARIFA ESTIMADA
          </Text>

          <Text style={styles.fare}>
            {typeof trip.estimatedFare === 'number'
              ? `$${trip.estimatedFare.toLocaleString('es-CO')}`
              : 'Por confirmar'}
          </Text>

          <TouchableOpacity
            accessibilityRole="button"
            style={[
              styles.button,
              (acceptingId !== null ||
                tripRecoveryBlocked ||
                hasActiveTrip ||
                !enabled) &&
                styles.disabled,
            ]}
            disabled={
              acceptingId !== null ||
              tripRecoveryBlocked ||
              hasActiveTrip ||
              !enabled
            }
            onPress={() => handleAccept(trip.id)}
          >
            <Text style={styles.buttonText}>
              {acceptingId === trip.id
                ? 'Aceptando...'
                : 'Aceptar viaje'}
            </Text>
          </TouchableOpacity>
        </View>
      ))}
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
