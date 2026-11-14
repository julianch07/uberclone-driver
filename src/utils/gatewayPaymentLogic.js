// AI-assisted: see docs/AI_LOG.md #37
// Lógica pura del cobro con Mercado Pago Checkout Pro en la app del
// conductor. No accede a Firestore ni a la red.
//
// El conductor solo inicia el cobro: el backend (functions/) crea la
// preferencia y es el único que confirma el pago con la API de Mercado Pago
// y actualiza el viaje (paymentStatus, paymentId, status "paid").
import { TRIP_STATUS } from './tripLogic';
import { PAYMENT_METHOD } from './tripRequestLogic';
import { hasStoredFareBreakdown, PAYMENT_STATUS } from './cashPaymentLogic';

export const CREATE_PAYMENT_PREFERENCE_FUNCTION = 'createPaymentPreference';

export function isGatewayTrip(trip) {
  return trip?.paymentMethod === PAYMENT_METHOD.MERCADOPAGO;
}

// Monto del cobro (tarifa + propina). El backend lo recalcula y lo compara.
export function getGatewayChargeAmount(trip) {
  return hasStoredFareBreakdown(trip) ? trip.fare + trip.tip : null;
}

// El conductor asignado puede iniciar o reintentar el cobro de un viaje
// finalizado pagado con Mercado Pago que aún no tiene un pago aprobado.
export function canStartGatewayCheckout(trip, driverId) {
  return (
    typeof driverId === 'string' &&
    driverId.length > 0 &&
    trip?.driverId === driverId &&
    trip.status === TRIP_STATUS.COMPLETED &&
    isGatewayTrip(trip) &&
    trip.paymentStatus !== PAYMENT_STATUS.APPROVED &&
    getGatewayChargeAmount(trip) !== null
  );
}

export function isGatewayPaymentApproved(trip) {
  return (
    isGatewayTrip(trip) &&
    trip.status === TRIP_STATUS.PAID &&
    trip.paymentStatus === PAYMENT_STATUS.APPROVED
  );
}

// Estado visible del cobro de un viaje finalizado con Mercado Pago.
export function getGatewayStatusInfo(trip) {
  // AI-assisted: see docs/AI_LOG.md #38
  const suffix = isDemoPayment(trip) ? ' (MODO DEMOSTRACIÓN)' : '';

  if (isGatewayPaymentApproved(trip)) {
    return { label: `Pago aprobado${suffix}`, tone: 'success' };
  }
  if (trip?.paymentStatus === PAYMENT_STATUS.PENDING) {
    return { label: `Pago pendiente de confirmación${suffix}`, tone: 'warning' };
  }
  if (trip?.paymentStatus === PAYMENT_STATUS.REJECTED) {
    return { label: `Pago rechazado: puedes intentarlo de nuevo${suffix}`, tone: 'error' };
  }
  return { label: `Pendiente de cobro${suffix}`, tone: 'neutral' };
}

// La URL del checkout debe ser HTTPS (la entrega el backend).
// AI-assisted: see docs/AI_LOG.md #38
// Excepción: en MODO DEMOSTRACIÓN, el checkout simulado del emulador de
// Functions en la IP local configurada (http://<host>:<puerto>/...).
export function isValidCheckoutUrl(url, demo = null) {
  if (typeof url !== 'string' || /\s/.test(url)) return false;
  if (/^https:\/\/\S+$/.test(url)) return true;

  return Boolean(
    demo?.enabled &&
      demo.host &&
      url.startsWith(`http://${demo.host}:${demo.functionsPort}/`) &&
      url.includes('/demoCheckout?')
  );
}

// AI-assisted: see docs/AI_LOG.md #38
export function isDemoPayment(trip) {
  return trip?.paymentMode === 'demo';
}

// Mensajes para los errores de la función callable (código "functions/...").
export function getGatewayErrorMessage(error) {
  const code = String(error?.code || '').replace(/^functions\//, '');

  switch (code) {
    case 'not-found':
      return error?.message && error.message !== 'not-found' && error.message !== 'NOT FOUND'
        ? error.message
        : 'El servicio de pagos no está disponible todavía. Usa el pago en efectivo o inténtalo más tarde.';
    case 'unauthenticated':
      return 'Tu sesión expiró. Vuelve a abrir la aplicación.';
    case 'permission-denied':
    case 'failed-precondition':
    case 'invalid-argument':
    case 'already-exists':
      return error?.message || 'No se puede cobrar este viaje con Mercado Pago.';
    case 'unavailable':
    case 'deadline-exceeded':
    case 'internal':
      return 'No se pudo conectar con el servicio de pagos. Revisa tu conexión e inténtalo de nuevo.';
    default:
      return error?.message || 'No se pudo iniciar el cobro con Mercado Pago.';
  }
}
