// AI-assisted: see docs/AI_LOG.md #37
// Cobro de viajes con Mercado Pago Checkout Pro (modo de prueba).
//
// 1. requestGatewayCheckout llama a la función createPaymentPreference
//    (functions/index.js), que valida el viaje, calcula el monto y crea la
//    preferencia con el access token guardado en el backend.
// 2. openGatewayCheckout abre el checkout en el navegador del sistema
//    (expo-web-browser, incluido en Expo Go). El pasajero paga con una
//    tarjeta de prueba.
// 3. El backend confirma el pago con la API (webhook o retorno) y actualiza
//    el viaje; la app lo ve en tiempo real con onSnapshot.
import {
  collection,
  doc,
  limit,
  onSnapshot,
  query,
  where,
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import * as WebBrowser from 'expo-web-browser';

import { db, functions } from '../config/firebase';
// AI-assisted: see docs/AI_LOG.md #38
import { PAYMENTS_DEMO } from '../config/paymentsDemo';
import { TRIP_STATUS } from '../utils/tripLogic';
import { PAYMENT_METHOD } from '../utils/tripRequestLogic';
import {
  canStartGatewayCheckout,
  CREATE_PAYMENT_PREFERENCE_FUNCTION,
  getGatewayChargeAmount,
  isValidCheckoutUrl,
} from '../utils/gatewayPaymentLogic';

// Máximo que permite la regla de consultas del historial (limit <= 50).
export const MAX_PENDING_GATEWAY_TRIPS = 50;

function pendingGatewayTripsQuery(database, driverId) {
  return query(
    collection(database, 'trips'),
    where('driverId', '==', driverId),
    where('status', '==', TRIP_STATUS.COMPLETED),
    where('paymentMethod', '==', PAYMENT_METHOD.MERCADOPAGO),
    limit(MAX_PENDING_GATEWAY_TRIPS)
  );
}

/**
 * Viajes finalizados del conductor pendientes de cobro con Mercado Pago, en
 * tiempo real. Cuando el backend aprueba el pago, el viaje pasa a "paid" y
 * sale de la lista.
 */
export function subscribeToPendingGatewayTrips(driverId, onData, onError, database = db) {
  return onSnapshot(
    pendingGatewayTripsQuery(database, driverId),
    (snapshot) => {
      onData(
        snapshot.docs
          .map((item) => ({ id: item.id, ...item.data() }))
          .filter((trip) => canStartGatewayCheckout(trip, driverId))
      );
    },
    (error) => {
      console.error('Error al consultar cobros con Mercado Pago:', error);
      if (onError) onError(error);
    }
  );
}

// Un viaje concreto en tiempo real (para mostrar el resultado del cobro).
export function subscribeToGatewayTrip(tripId, onData, onError, database = db) {
  return onSnapshot(
    doc(database, 'trips', tripId),
    (snapshot) => onData(snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null),
    (error) => {
      console.error('Error al seguir el cobro del viaje:', error);
      if (onError) onError(error);
    }
  );
}

/**
 * Pide al backend la preferencia de pago del viaje.
 * @returns {Promise<{checkoutUrl: string, preferenceId: string, amount: number, reused: boolean}>}
 */
export async function requestGatewayCheckout(
  trip,
  driverId,
  functionsInstance = functions,
  demo = PAYMENTS_DEMO
) {
  if (!canStartGatewayCheckout(trip, driverId)) {
    throw new Error('Este viaje no se puede cobrar con Mercado Pago.');
  }

  const callable = httpsCallable(functionsInstance, CREATE_PAYMENT_PREFERENCE_FUNCTION);
  const result = await callable({
    tripId: trip.id,
    amount: getGatewayChargeAmount(trip),
  });

  if (!isValidCheckoutUrl(result?.data?.checkoutUrl, demo)) {
    throw new Error('El servicio de pagos no devolvió un enlace de pago válido.');
  }

  return result.data;
}

// Abre el checkout. La app no depende del retorno: el resultado llega por
// Firestore cuando el backend confirma el pago.
export function openGatewayCheckout(checkoutUrl, browser = WebBrowser, demo = PAYMENTS_DEMO) {
  if (!isValidCheckoutUrl(checkoutUrl, demo)) {
    throw new Error('Enlace de pago no válido.');
  }
  return browser.openBrowserAsync(checkoutUrl);
}
