// AI-assisted: see docs/AI_LOG.md #13
import * as Location from 'expo-location';
import {
  LOCATION_ERROR,
  classifyLocationError,
  getLocationErrorMessage,
  normalizePermission,
  normalizePosition,
} from '../utils/locationLogic';

export class LocationError extends Error {
  constructor(code, cause) {
    super(getLocationErrorMessage(code));
    this.name = 'LocationError';
    this.code = code;
    this.cause = cause;
  }
}

function toLocationError(error) {
  if (error instanceof LocationError) {
    return error;
  }

  return new LocationError(classifyLocationError(error), error);
}

// Solo ubicación en primer plano. No se solicita ubicación en segundo plano.
export async function getForegroundPermission() {
  return normalizePermission(await Location.getForegroundPermissionsAsync());
}

export async function requestForegroundPermission() {
  return normalizePermission(await Location.requestForegroundPermissionsAsync());
}

export async function hasLocationServicesEnabled() {
  try {
    return await Location.hasServicesEnabledAsync();
  } catch (error) {
    // Si no se puede comprobar, se intenta obtener la ubicación y se
    // informa el error real.
    return true;
  }
}

export async function getCurrentPosition() {
  try {
    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    const position = normalizePosition(location);

    if (!position) {
      throw new LocationError(LOCATION_ERROR.POSITION_UNAVAILABLE);
    }

    return position;
  } catch (error) {
    throw toLocationError(error);
  }
}

// Inicia el seguimiento y devuelve una función stop() síncrona y segura:
// si se llama antes de que watchPositionAsync termine de resolverse, la
// suscripción se elimina apenas esté disponible, sin dejarla activa.
export function watchPosition(onPosition, onError, options = {}) {
  let stopped = false;
  let subscription = null;

  const watchOptions = {
    accuracy: Location.Accuracy.Balanced,
    timeInterval: 5000,
    distanceInterval: 10,
    ...options,
  };

  Location.watchPositionAsync(watchOptions, (location) => {
    if (stopped) {
      return;
    }

    const position = normalizePosition(location);

    if (position) {
      onPosition(position);
    }
  })
    .then((createdSubscription) => {
      if (stopped) {
        createdSubscription.remove();
        return;
      }

      subscription = createdSubscription;
    })
    .catch((error) => {
      if (!stopped && onError) {
        onError(toLocationError(error));
      }
    });

  return function stop() {
    if (stopped) {
      return;
    }

    stopped = true;

    if (subscription) {
      subscription.remove();
      subscription = null;
    }
  };
}
