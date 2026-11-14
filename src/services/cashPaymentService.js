// AI-assisted: see docs/AI_LOG.md #29
// Cobros en efectivo y saldo del conductor.
//
// Registrar el efectivo es una declaración del conductor de que recibió el
// dinero del pasajero; no es una verificación bancaria. En una sola
// transacción se escriben:
//   - trips/{tripId}: completed → paid, paymentStatus 'cash', paidAt.
//   - drivers/{uid}/ledgerEntries/cash_{tripId}: comisión adeudada a la
//     plataforma, con los importes copiados del desglose del viaje.
// firestore.rules exige ambas escrituras juntas (existsAfter/getAfter),
// impide repetirlas y no permite modificar ni borrar el asiento.
import {
  collection,
  count,
  doc,
  getAggregateFromServer,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  startAfter,
  sum,
  where,
} from 'firebase/firestore';
import {
  buildBalanceFromTotals,
  buildCashCommissionEntry,
  canRegisterCashPayment,
  cashLedgerEntryId,
  isCashPaymentRegistered,
  LEDGER_ENTRY_STATUS,
  LEDGER_ENTRY_TYPE,
  PAYMENT_STATUS,
} from '../utils/cashPaymentLogic';
import { fetchAllPages } from './firestorePagination';
import { TRIP_STATUS } from '../utils/tripLogic';
import { PAYMENT_METHOD } from '../utils/tripRequestLogic';

// Asientos recientes que se muestran en la lista de comisiones por viaje.
// Es solo una vista: el saldo se calcula con agregaciones sobre todos los
// asientos (getDriverBalanceTotalsWithDatabase).
export const MAX_LEDGER_ENTRIES = 100;

// Tamaño de página de los cobros pendientes: el máximo que permite la regla
// de consultas del historial (request.query.limit <= 50).
export const PENDING_CASH_PAGE_SIZE = 50;

export function ledgerEntryRef(database, driverId, tripId) {
  return doc(
    database,
    'drivers',
    driverId,
    'ledgerEntries',
    cashLedgerEntryId(tripId)
  );
}

function explainCannotRegister(trip, driverId) {
  if (trip.driverId !== driverId) {
    return 'Este viaje no está asignado a tu cuenta.';
  }
  if (trip.status !== TRIP_STATUS.COMPLETED) {
    return 'Solo se puede registrar el cobro de un viaje finalizado.';
  }
  if (trip.paymentMethod !== PAYMENT_METHOD.CASH) {
    return 'Este viaje no se paga en efectivo; su pago lo confirma la pasarela digital.';
  }
  if (trip.paymentStatus != null) {
    return 'El pago de este viaje ya está registrado.';
  }
  return 'El viaje no tiene el desglose de tarifa guardado; no se puede registrar el cobro.';
}

/**
 * Registra que el conductor recibió el efectivo de un viaje finalizado.
 * Es idempotente: si el cobro ya está registrado por este conductor, no
 * vuelve a escribir.
 * @returns {Promise<{tripId: string, alreadyRegistered: boolean}>}
 */
export async function registerCashPaymentWithDatabase(
  database,
  tripId,
  driverId
) {
  if (!tripId || !driverId) {
    throw new Error('El viaje y el conductor son obligatorios.');
  }

  const tripRef = doc(database, 'trips', tripId);
  const entryRef = ledgerEntryRef(database, driverId, tripId);

  try {
    return await runTransaction(database, async (transaction) => {
      const snapshot = await transaction.get(tripRef);

      if (!snapshot.exists()) {
        throw new Error('El viaje ya no existe.');
      }

      const trip = snapshot.data();

      if (isCashPaymentRegistered(trip, driverId)) {
        return { tripId, alreadyRegistered: true };
      }

      if (!canRegisterCashPayment(trip, driverId)) {
        throw new Error(explainCannotRegister(trip, driverId));
      }

      transaction.update(tripRef, {
        status: TRIP_STATUS.PAID,
        paymentStatus: PAYMENT_STATUS.CASH,
        paidAt: serverTimestamp(),
      });

      transaction.set(entryRef, {
        ...buildCashCommissionEntry(tripId, trip),
        createdAt: serverTimestamp(),
      });

      return { tripId, alreadyRegistered: false };
    });
  } catch (error) {
    // Con dos registros simultáneos (doble pulsación), la segunda escritura
    // llega cuando el viaje ya está pagado y las reglas la rechazan con
    // permission-denied, que el SDK no reintenta. Si el cobro ya quedó
    // registrado por este conductor, la operación se considera cumplida.
    if (error?.code === 'permission-denied') {
      const snapshot = await getDoc(tripRef);

      if (
        snapshot.exists() &&
        isCashPaymentRegistered(snapshot.data(), driverId)
      ) {
        return { tripId, alreadyRegistered: true };
      }
    }

    throw error;
  }
}

// Viajes finalizados del conductor pagados en efectivo. El filtro por
// método de pago se hace en el servidor; solo filtros de igualdad, por lo que
// no requiere un índice compuesto adicional.
function pendingCashTripsQuery(database, driverId, cursor, pageSize) {
  return query(
    collection(database, 'trips'),
    where('driverId', '==', driverId),
    where('status', '==', TRIP_STATUS.COMPLETED),
    where('paymentMethod', '==', PAYMENT_METHOD.CASH),
    ...(cursor ? [startAfter(cursor)] : []),
    limit(pageSize)
  );
}

/**
 * Todos los viajes en efectivo del conductor con el cobro por confirmar,
 * leyendo todas las páginas. Si una página falla, lanza el error (no
 * devuelve una lista parcial).
 */
export async function fetchPendingCashTripsWithDatabase(
  database,
  driverId,
  pageSize = PENDING_CASH_PAGE_SIZE
) {
  const documents = await fetchAllPages(
    async (cursor) =>
      (await getDocs(pendingCashTripsQuery(database, driverId, cursor, pageSize))).docs,
    pageSize
  );

  return documents
    .map((tripDocument) => ({ id: tripDocument.id, ...tripDocument.data() }))
    .filter((trip) => canRegisterCashPayment(trip, driverId));
}

/**
 * Cobros por confirmar en tiempo real. La primera página se escucha con
 * onSnapshot para detectar cambios; en cada cambio se leen todas las
 * páginas. Solo se entrega la lista completa más reciente.
 */
export function subscribeToPendingCashTripsWithDatabase(
  database,
  driverId,
  onData,
  onError
) {
  let active = true;
  let sequence = 0;

  function reportError(error) {
    console.error('Error al consultar cobros pendientes:', error);

    if (onError) {
      onError(error);
    }
  }

  const unsubscribe = onSnapshot(
    pendingCashTripsQuery(database, driverId, null, PENDING_CASH_PAGE_SIZE),
    () => {
      const current = ++sequence;

      fetchPendingCashTripsWithDatabase(database, driverId)
        .then((trips) => {
          if (active && current === sequence) onData(trips);
        })
        .catch((error) => {
          if (active && current === sequence) reportError(error);
        });
    },
    (error) => {
      if (active) reportError(error);
    }
  );

  return () => {
    active = false;
    unsubscribe();
  };
}

/**
 * Asientos del saldo del conductor, del más reciente al más antiguo.
 */
export function subscribeToDriverLedgerWithDatabase(
  database,
  driverId,
  onData,
  onError
) {
  const ledgerQuery = query(
    collection(database, 'drivers', driverId, 'ledgerEntries'),
    orderBy('createdAt', 'desc'),
    limit(MAX_LEDGER_ENTRIES)
  );

  return onSnapshot(
    ledgerQuery,
    (snapshot) => {
      onData(
        snapshot.docs.map((entryDocument) => ({
          id: entryDocument.id,
          ...entryDocument.data({ serverTimestamps: 'estimate' }),
        }))
      );
    },
    (error) => {
      console.error('Error al consultar el saldo del conductor:', error);

      if (onError) {
        onError(error);
      }
    }
  );
}

function cashCommissionsQuery(database, driverId) {
  return query(
    collection(database, 'drivers', driverId, 'ledgerEntries'),
    where('type', '==', LEDGER_ENTRY_TYPE.CASH_COMMISSION)
  );
}

/**
 * Totales del saldo calculados por Firestore sobre TODOS los asientos del
 * conductor (agregaciones count/sum en el servidor, sujetas a las reglas).
 * No depende de cuántos asientos se muestren ni de agregados escritos por
 * el cliente.
 */
export async function getDriverBalanceTotalsWithDatabase(database, driverId) {
  const allEntries = cashCommissionsQuery(database, driverId);

  const [totals, pending] = await Promise.all([
    getAggregateFromServer(allEntries, {
      tripCount: count(),
      cashCollected: sum('cashAmount'),
      commissionTotal: sum('commission'),
      netEarnings: sum('driverEarnings'),
    }),
    getAggregateFromServer(
      query(allEntries, where('status', '==', LEDGER_ENTRY_STATUS.PENDING)),
      { pendingCommission: sum('commission') }
    ),
  ]);

  return buildBalanceFromTotals({
    ...totals.data(),
    ...pending.data(),
  });
}

/**
 * Saldo en tiempo real: escucha los asientos recientes (lista visible) y,
 * en cada cambio, recalcula los totales completos en el servidor. Si el
 * cálculo falla, informa el error en lugar de un saldo parcial.
 * onData recibe { entries, summary }.
 */
export function subscribeToDriverBalanceWithDatabase(
  database,
  driverId,
  onData,
  onError
) {
  let active = true;
  let sequence = 0;

  function reportError(error) {
    console.error('Error al consultar el saldo del conductor:', error);

    if (onError) {
      onError(error);
    }
  }

  const unsubscribe = subscribeToDriverLedgerWithDatabase(
    database,
    driverId,
    (entries) => {
      const current = ++sequence;

      getDriverBalanceTotalsWithDatabase(database, driverId)
        .then((summary) => {
          if (active && current === sequence) onData({ entries, summary });
        })
        .catch((error) => {
          if (active && current === sequence) reportError(error);
        });
    },
    (error) => {
      if (active) reportError(error);
    }
  );

  return () => {
    active = false;
    unsubscribe();
  };
}
