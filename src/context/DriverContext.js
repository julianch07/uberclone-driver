// AI-assisted: see docs/AI_LOG.md #16
// AI-assisted: see docs/AI_LOG.md #18
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  findActiveDriverTrip,
  subscribeToActiveTrip,
} from '../services/tripService';
import { isActiveDriverTrip } from '../utils/activeTripLogic';
import { createActiveTripStorage } from '../utils/activeTripStorage';
import { isCurrentTripRecovery } from '../utils/activeTripRecovery';

const DriverContext = createContext(null);
const tripStorage = createActiveTripStorage(AsyncStorage);

export function DriverProvider({ children, uid }) {
  const [isOnline, setIsOnline] = useState(false);
  const [activeTripId, setActiveTripId] = useState(null);
  const [activeTrip, setActiveTrip] = useState(null);
  const [activeTripLoading, setActiveTripLoading] = useState(Boolean(uid));
  const [activeTripError, setActiveTripError] = useState('');
  const storageKey = uid ? `uberclone:activeTrip:${uid}` : null;

  // Each selection or recovery invalidates older async callbacks.
  const versionRef = useRef(0);
  const selectedTripRef = useRef(null);
  const identityRef = useRef(storageKey);
  const mountedRef = useRef(false);

  // Update during render so callbacks from an old UID cannot affect a new UID.
  if (identityRef.current !== storageKey) {
    identityRef.current = storageKey;
    versionRef.current += 1;
    selectedTripRef.current = null;
  }

  const isCurrent = useCallback((key, version) =>
    mountedRef.current &&
    identityRef.current === key &&
    versionRef.current === version,
  []);

  useEffect(() => {
    mountedRef.current = true;
    const key = storageKey;
    const version = ++versionRef.current;
    selectedTripRef.current = null;
    const valid = () => isCurrent(key, version);

    setActiveTripId(null);
    setActiveTrip(null);
    setActiveTripError('');
    setActiveTripLoading(Boolean(key));

    if (key) {
      async function restore() {
        try {
          const savedId = await tripStorage.read(key);
          if (!valid()) return;

          if (savedId) {
            selectedTripRef.current = savedId;
            setActiveTripId(savedId);
            return;
          }

          const recovered = await findActiveDriverTrip(uid);
          if (!valid()) return;
          if (!isActiveDriverTrip(recovered, uid)) {
            setActiveTripLoading(false);
            return;
          }

          selectedTripRef.current = recovered.id;
          setActiveTripId(recovered.id);
          try {
            await tripStorage.save(key, recovered.id, valid);
          } catch {
            // An active trip remains selected even if persistence fails.
            if (valid()) {
              setActiveTripError('Viaje recuperado, pero no se pudo guardar localmente.');
            }
          }
        } catch (error) {
          if (!valid()) return;
          console.error('Error al recuperar el viaje activo:', error);
          setActiveTripError('No se pudo recuperar el viaje activo.');
          setActiveTripLoading(false);
        }
      }
      restore();
    }

    return () => {
      versionRef.current += 1;
      mountedRef.current = false;
    };
  }, [uid, storageKey, isCurrent]);

  useEffect(() => {
    if (!uid || !activeTripId) return undefined;

    let cancelled = false;
    const key = storageKey;
    const tripId = activeTripId;
    const validSubscription = () =>
      !cancelled && mountedRef.current &&
      identityRef.current === key && selectedTripRef.current === tripId;

    setActiveTripLoading(true);

    const unsubscribe = subscribeToActiveTrip(
      tripId,
      (trip) => {
        if (!validSubscription()) return;
        if (isActiveDriverTrip(trip, uid)) {
          setActiveTrip(trip);
          setActiveTripError('');
          setActiveTripLoading(false);
          return;
        }

        // The saved reference is stale. Verify Firestore before offering new trips.
        const version = ++versionRef.current;
        selectedTripRef.current = null;
        setActiveTrip(null);
        setActiveTripId(null);
        setActiveTripLoading(true);
        // AI-assisted: see docs/AI_LOG.md #19
        // Reconciliation survives subscription cleanup, but not newer actions.
        const valid = () => isCurrentTripRecovery({
          mounted: mountedRef.current,
          currentKey: identityRef.current,
          expectedKey: key,
          currentVersion: versionRef.current,
          expectedVersion: version,
          selectedTripId: selectedTripRef.current,
        });

        async function reconcile() {
          try {
            // Read/query first; never delete a newer selection's key.
            const recovered = await findActiveDriverTrip(uid);
            if (!valid()) return;

            if (isActiveDriverTrip(recovered, uid)) {
              selectedTripRef.current = recovered.id;
              setActiveTripId(recovered.id);
              try {
                await tripStorage.save(key, recovered.id, () =>
                  isCurrent(key, version) && selectedTripRef.current === recovered.id
                );
              } catch {
                if (isCurrent(key, version)) {
                  setActiveTripError('Viaje recuperado, pero no se pudo guardar localmente.');
                }
              }
              return;
            }

            await tripStorage.remove(key, valid);
            if (valid()) setActiveTripLoading(false);
          } catch (error) {
            if (!valid()) return;
            console.error('Error al verificar otro viaje activo:', error);
            setActiveTripError('No se pudo verificar si tienes otro viaje activo.');
            setActiveTripLoading(false);
          }
        }
        reconcile();
      },
      (error) => {
        if (!validSubscription()) return;
        console.error('Error al sincronizar el viaje activo:', error);
        setActiveTripError('No se pudo sincronizar el viaje activo.');
        setActiveTripLoading(false);
      }
    );

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [uid, activeTripId, storageKey, isCurrent]);

  const rememberAcceptedTrip = useCallback(async (tripId) => {
    if (!storageKey || !tripId || identityRef.current !== storageKey) {
      throw new Error('No se pudo identificar el viaje.');
    }
    const version = ++versionRef.current;
    selectedTripRef.current = tripId;
    setActiveTripId(tripId);
    setActiveTrip(null);
    setActiveTripLoading(true);
    setActiveTripError('');
    try {
      await tripStorage.save(storageKey, tripId, () =>
        isCurrent(storageKey, version) && selectedTripRef.current === tripId
      );
      return true;
    } catch {
      if (isCurrent(storageKey, version)) {
        setActiveTripError('Viaje aceptado, pero no se pudo guardar para recuperarlo al reiniciar.');
      }
      return false;
    }
  }, [storageKey, isCurrent]);

  const clearActiveTrip = useCallback(async () => {
    if (!storageKey || identityRef.current !== storageKey) return;
    const version = ++versionRef.current;
    selectedTripRef.current = null;
    setActiveTrip(null);
    setActiveTripId(null);
    setActiveTripError('');
    setActiveTripLoading(true);
    const valid = () => isCurrent(storageKey, version) && selectedTripRef.current === null;
    try {
      await tripStorage.remove(storageKey, valid);
      if (valid()) setActiveTripLoading(false);
    } catch (error) {
      if (!valid()) return;
      console.error('Error al limpiar la referencia del viaje:', error);
      setActiveTripError('No se pudo limpiar el viaje localmente. Reinicia la aplicación.');
      setActiveTripLoading(false);
    }
  }, [storageKey, isCurrent]);

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
    uid, isOnline, activeTripId, activeTrip, activeTripLoading,
    activeTripError, rememberAcceptedTrip, clearActiveTrip,
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
    throw new Error('useDriverContext debe utilizarse dentro de DriverProvider.');
  }
  return context;
}
