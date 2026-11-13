// AI-assisted: see docs/AI_LOG.md #13
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import {
  getCurrentPosition,
  getForegroundPermission,
  hasLocationServicesEnabled,
  requestForegroundPermission,
  watchPosition,
} from '../services/locationService';
import { createLocationPublisher } from '../services/driverLocationService';
import { PERMISSION } from '../utils/locationLogic';

// watchEnabled: el seguimiento GPS local (mapa) debe estar activo.
// publishEnabled: se debe publicar la ubicación en Firestore (conductor
// conectado). Solo funciona si también hay seguimiento activo.
// El seguimiento se detiene al pasar la app a segundo plano y al desmontar.
export default function useDriverLocation({
  uid,
  watchEnabled,
  publishEnabled,
}) {
  const [permission, setPermission] = useState({
    status: PERMISSION.UNDETERMINED,
    canAskAgain: true,
  });
  const [servicesEnabled, setServicesEnabled] = useState(true);
  const [checking, setChecking] = useState(true);
  const [requesting, setRequesting] = useState(false);
  const [position, setPosition] = useState(null);
  const [locationError, setLocationError] = useState('');
  const [publishError, setPublishError] = useState('');
  const [appActive, setAppActive] = useState(
    AppState.currentState === 'active'
  );

  const isMountedRef = useRef(true);
  const publisher = useMemo(() => createLocationPublisher({ uid }), [uid]);

  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const checkStatus = useCallback(async () => {
    try {
      const [nextPermission, enabled] = await Promise.all([
        getForegroundPermission(),
        hasLocationServicesEnabled(),
      ]);

      if (isMountedRef.current) {
        setPermission(nextPermission);
        setServicesEnabled(enabled);
      }
    } catch (error) {
      console.error('Error al consultar los permisos de ubicación:', error);

      if (isMountedRef.current) {
        setLocationError('No se pudo consultar el permiso de ubicación.');
      }
    } finally {
      if (isMountedRef.current) {
        setChecking(false);
      }
    }
  }, []);

  const requestPermission = useCallback(async () => {
    setRequesting(true);

    try {
      const nextPermission = await requestForegroundPermission();

      if (isMountedRef.current) {
        setPermission(nextPermission);
      }

      await checkStatus();
    } catch (error) {
      console.error('Error al solicitar el permiso de ubicación:', error);

      if (isMountedRef.current) {
        setLocationError('No se pudo solicitar el permiso de ubicación.');
      }
    } finally {
      if (isMountedRef.current) {
        setRequesting(false);
      }
    }
  }, [checkStatus]);

  // Estado de la app: al volver de Ajustes se vuelve a comprobar el permiso.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      setAppActive(state === 'active');
    });

    return () => {
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    if (appActive) {
      checkStatus();
    }
  }, [appActive, checkStatus]);

  const canWatch =
    watchEnabled &&
    appActive &&
    permission.status === PERMISSION.GRANTED &&
    servicesEnabled;

  // Seguimiento GPS: se limpia al desactivarse, al pasar a segundo plano o
  // al desmontar.
  useEffect(() => {
    if (!canWatch) {
      return undefined;
    }

    let cancelled = false;
    setLocationError('');

    const stopWatching = watchPosition(
      (nextPosition) => {
        if (!cancelled) {
          setPosition(nextPosition);
        }
      },
      (error) => {
        if (!cancelled) {
          setLocationError(error.message);
        }
      }
    );

    getCurrentPosition()
      .then((nextPosition) => {
        if (!cancelled) {
          setPosition((previous) => previous || nextPosition);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setLocationError(error.message);
        }
      });

    return () => {
      cancelled = true;
      stopWatching();
      // Una posición vieja no debe publicarse al reanudar el seguimiento.
      setPosition(null);
    };
  }, [canWatch]);

  const canPublish = Boolean(publishEnabled && canWatch);

  // Publicación: start() antes de recibir posiciones y stop() al
  // desconectarse, al cambiar el estado o al desmontar.
  useEffect(() => {
    if (!canPublish) {
      return undefined;
    }

    publisher.start();
    setPublishError('');

    return () => {
      publisher.stop();
    };
  }, [canPublish, publisher]);

  useEffect(() => {
    if (!canPublish || !position) {
      return;
    }

    publisher.publish(position).then((result) => {
      if (!isMountedRef.current) {
        return;
      }

      if (result.status === 'error') {
        setPublishError(result.message);
      } else if (result.status === 'published') {
        setPublishError('');
      }
    });
  }, [canPublish, position, publisher]);

  // Elimina la ubicación publicada. Se llama después de desconectarse.
  const clearPublishedLocation = useCallback(
    () => publisher.clear(),
    [publisher]
  );

  return {
    permission,
    servicesEnabled,
    checking,
    requesting,
    position,
    locationError,
    publishError,
    requestPermission,
    recheck: checkStatus,
    clearPublishedLocation,
  };
}
