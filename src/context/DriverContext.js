// AI-assisted: see docs/AI_LOG.md #16
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { subscribeToActiveTrip } from '../services/tripService';
import { isActiveDriverTrip } from '../utils/activeTripLogic';

const DriverContext = createContext(null);

export function DriverProvider({ children, uid }) {
  const [isOnline, setIsOnline] = useState(false);
  const [activeTripId, setActiveTripId] = useState(null);
  const [activeTrip, setActiveTrip] = useState(null);
  const [activeTripLoading, setActiveTripLoading] = useState(Boolean(uid));
  const [activeTripError, setActiveTripError] = useState('');

  const storageKey = uid ? `uberclone:activeTrip:${uid}` : null;

  useEffect(() => {
    let cancelled = false;

    setActiveTripId(null);
    setActiveTrip(null);
    setActiveTripError('');
    setActiveTripLoading(Boolean(storageKey));

    if (!storageKey) return undefined;

    AsyncStorage.getItem(storageKey)
      .then((savedId) => {
        if (cancelled) return;

        if (savedId) {
          setActiveTripId(savedId);
        } else {
          setActiveTripLoading(false);
        }
      })
      .catch(() => {
        if (cancelled) return;

        setActiveTripError(
          'No se pudo recuperar el viaje guardado.'
        );
        setActiveTripLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [storageKey]);

  useEffect(() => {
    if (!uid || !activeTripId) return undefined;

    let cancelled = false;
    setActiveTripLoading(true);

    const unsubscribe = subscribeToActiveTrip(
      activeTripId,
      (trip) => {
        if (cancelled) return;

        if (
          isActiveDriverTrip(trip, uid)
        ) {
          setActiveTrip(trip);
          setActiveTripError('');
        } else {
          setActiveTrip(null);
          setActiveTripId(null);

          if (storageKey) {
            AsyncStorage.removeItem(storageKey).catch(() => {
              if (!cancelled) {
                setActiveTripError(
                  'No se pudo limpiar el viaje guardado.'
                );
              }
            });
          }
        }

        setActiveTripLoading(false);
      },
      () => {
        if (cancelled) return;

        setActiveTripError(
          'No se pudo sincronizar el viaje activo.'
        );
        setActiveTripLoading(false);
      }
    );

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [uid, activeTripId, storageKey]);

  const rememberAcceptedTrip = useCallback(async (tripId) => {
    if (!storageKey || !tripId) {
      throw new Error('No se pudo identificar el viaje.');
    }

    // Keep the trip visible even if local persistence fails.
    setActiveTripId(tripId);
    setActiveTripLoading(true);
    setActiveTripError('');

    try {
      await AsyncStorage.setItem(storageKey, tripId);
      return true;
    } catch {
      setActiveTripError(
        'Viaje aceptado, pero no se pudo guardar para recuperarlo al reiniciar.'
      );
      return false;
    }
  }, [storageKey]);

  const clearActiveTrip = useCallback(async () => {
    if (storageKey) {
      await AsyncStorage.removeItem(storageKey);
    }

    setActiveTrip(null);
    setActiveTripId(null);
    setActiveTripError('');
    setActiveTripLoading(false);
  }, [storageKey]);

  const value = useMemo(() => ({
    driverUid: uid,
    isOnline,
    setIsOnline,
    activeTripId,
    activeTrip,
    activeTripLoading,
    activeTripError,
    rememberAcceptedTrip,
    clearActiveTrip,
  }), [
    uid,
    isOnline,
    activeTripId,
    activeTrip,
    activeTripLoading,
    activeTripError,
    rememberAcceptedTrip,
    clearActiveTrip,
  ]);

  return (
    <DriverContext.Provider value={value}>
      {children}
    </DriverContext.Provider>
  );
}

export function useDriverContext() {
  const context = useContext(DriverContext);

  if (!context) {
    throw new Error(
      'useDriverContext debe utilizarse dentro de DriverProvider.'
    );
  }

  return context;
}
