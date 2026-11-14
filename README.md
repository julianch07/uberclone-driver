# UberClone Driver

Aplicación móvil para conductores, desarrollada como proyecto académico utilizando React Native y Expo.

## Tecnologías

- React Native 0.88.1
- Expo SDK 58
- React 19.3.0
- JavaScript

## Requisitos previos

- Node.js y npm.
- Expo Go en un dispositivo móvil o un emulador compatible.

## Instalación

Clonar el repositorio:

```bash
git clone https://github.com/julianch07/uberclone-driver.git
```

Ingresar al directorio:

```bash
cd uberclone-driver
```

Instalar las dependencias:

```bash
npm install
```

## Ejecución

Iniciar el servidor de desarrollo:

```bash
npx expo start
```

Después, escanear el código QR con Expo Go o ejecutar la aplicación en un emulador compatible.

**En un iPhone con Expo Go** (mismo Wi-Fi que el Mac): `npx expo start -c` y escanear el QR con la cámara. Para presentar el cobro digital sin credenciales, usar el [MODO DEMOSTRACIÓN](#modo-demostración-sin-credenciales-ni-blaze).

## Estructura del proyecto

```text
uberclone-driver/
├── assets/
├── docs/
│   ├── AI_LOG.md
│   ├── AI_LOG.pdf
│   └── CUMPLIMIENTO.md
├── functions/          # backend de pagos (Cloud Functions, Mercado Pago)
│   ├── src/
│   ├── test/
│   ├── .env.example
│   └── index.js
├── src/
│   ├── components/
│   │   ├── history/
│   │   ├── map/
│   │   ├── payments/
│   │   ├── registration/
│   │   └── trips/
│   ├── config/
│   ├── context/
│   ├── hooks/
│   ├── navigation/
│   ├── screens/
│   │   ├── home/
│   │   └── registration/
│   ├── services/
│   └── utils/
├── tests/
├── App.js
├── app.config.js
├── app.json
├── firebase.json
├── firebase.demo.json  # emuladores del MODO DEMOSTRACIÓN de pagos
├── firestore.indexes.json
├── firestore.rules
├── index.js
├── package.json
└── README.md
```

## Alcance de desarrollo

La aplicación implementa un proceso de registro de conductores dividido en tres secciones:

- **Datos personales:** información básica, fotografía, fecha de nacimiento, género e idioma.
- **Vehículo:** fotografía, categoría, placa, marca, modelo, año, color y capacidad de pasajeros.
- **Documentos y pagos:** licencia de conducción, SOAT, revisión técnico-mecánica cuando aplique, correo de Mercado Pago y aceptación de términos y condiciones.

La aplicación utiliza Firebase Authentication con acceso anónimo, Firestore para almacenar y recuperar la información del conductor y Cloudinary para alojar las fotografías.

El registro se asocia al identificador único del conductor autenticado y permite recuperar la información guardada al volver a abrir la aplicación.

Después del registro, la aplicación incluye:

- **Aprobación del conductor:** todo registro queda `pending` y solo puede pasar a `approved` desde Firebase Console.
- **Disponibilidad:** el conductor aprobado y con documentos vigentes puede conectarse y desconectarse.
- **Ubicación GPS y mapa:** seguimiento en primer plano y publicación de la ubicación mientras el conductor está conectado.
- **Solicitudes de viaje:** lista en tiempo real con origen, destino, distancia, duración, categoría, método de pago, tarifa, comisión y ganancia neta estimadas; 15 segundos para aceptar o rechazar, con rechazo automático al vencer.
- **Ciclo del viaje:** aceptar → "Voy en camino" → "Llegué al origen" → "Pasajero a bordo" → finalizar, o cancelar antes de recoger al pasajero, mediante transacciones de Firestore y con recuperación del viaje activo al reiniciar la aplicación.
- **Ruta del viaje:** recorrido hasta el punto de recogida o el destino, calculado con el servicio público OSRM.
- **Ganancias y pagos:** resumen con comisión del 20 % para la plataforma y 80 % para el conductor, y saldo con la plataforma.
- **Historial de carreras:** lista ordenada del viaje más reciente al más antiguo, con filtros (Hoy, Semana, Mes, Rango de fechas y método de pago), carga incremental y detalle de cada viaje con mapa y ruta de referencia (ver [Historial de carreras](#historial-de-carreras)).
- **Pagos en efectivo y saldo:** el conductor confirma el efectivo recibido de cada viaje finalizado; la comisión del 20 % queda registrada como deuda pendiente con la plataforma y la pantalla Pagos muestra su saldo.
- **Pasarela de pagos (modo de prueba):** cobro con Mercado Pago Checkout Pro mediante un backend en Cloud Functions que crea la preferencia, confirma el pago con la API y actualiza el viaje y el saldo (ver [Pasarela de pagos](#pasarela-de-pagos-mercado-pago-checkout-pro)).
- **Perfil:** datos del conductor, del vehículo y acceso a la edición del registro.

Las reglas de `firestore.rules` restringen cada operación al conductor propietario y validan su estado. Las funcionalidades se verificaron en Expo Go.

Limitaciones conocidas:

- El plazo de 15 segundos cuenta desde que cada conductor recibe la solicitud. Una solicitud que nadie acepta sigue en `pending` en Firestore: marcarla como vencida o rechazada para todos requiere un backend.
- Las pantallas Ganancias y Pagos usan los 50 viajes finalizados más recientes; el historial carga todos, de 20 en 20.
- No hay calificación del pasajero (requiere la app del pasajero): el detalle muestra «Sin calificación».
- El registro del efectivo es una declaración del conductor: la app no puede verificar que el pasajero pagó. La liquidación de comisiones requiere un backend administrativo (pendiente).
- El cobro con Mercado Pago (modo de prueba) tiene backend en `functions/`, probado con los emuladores; su despliegue requiere el plan Blaze. Stripe no está integrado.
- La distancia y la duración de cada viaje deben venir en el documento de la solicitud (`distanceKm`, `durationMin`); la consulta a Google Distance Matrix al crear la solicitud no está integrada.
- El servicio público de OSRM es adecuado para pruebas, pero no garantiza disponibilidad en producción.
- La configuración nativa de Google Maps en un *development build* está pendiente.


## Tarifas y comisiones

Los parámetros están centralizados en `src/config/pricing.js` (valores didácticos de la guía, en pesos colombianos enteros):

| Parámetro | Valor |
|---|---|
| Tarifa base | 3.500 COP |
| Valor por kilómetro | 1.200 COP |
| Valor por minuto | 250 COP |
| Tarifa mínima | 6.000 COP |
| Multiplicador Económico / XL / Premium | 1,0 / 1,4 / 1,8 |
| Comisión de la plataforma | 20 % de la tarifa |
| Propina | 100 % para el conductor |

La función pura `calculateFare({ distanceKm, durationMin, category, tip })` de `src/utils/fareLogic.js` calcula `(base + km × 1.200 + min × 250) × multiplicador`, redondea al múltiplo de 100 COP más cercano, aplica la tarifa mínima y devuelve `fare`, `commission`, `driverEarnings` y el detalle del cálculo. Ejemplo de la guía (8,5 km y 22 min): Económico 19.200 / 3.840 / 15.360 COP; XL 26.900 / 5.380 / 21.520 COP.

Al finalizar un viaje se guardan `fare`, `commission`, `commissionRate`, `driverEarnings`, `tip` y `fareSource`:

- `fareSource: "calculated"`: el viaje tiene `distanceKm`, `durationMin` y `category` válidos y la tarifa se calcula con `calculateFare()`.
- `fareSource: "estimated"`: el viaje no tiene esos datos (viajes anteriores a este módulo) y la tarifa es `estimatedFare`, sin recalcular ni inventar recorridos.

`firestore.rules` recalcula la tarifa con la misma fórmula y rechaza cualquier desglose que no coincida, por lo que el conductor no puede alterar su tarifa, la comisión, su ganancia ni la propina. Si se cambia `src/config/pricing.js`, hay que actualizar también las funciones de tarifa de `firestore.rules`.

### Documento de viaje de prueba

No existe aplicación de pasajero: las solicitudes se crean como documentos en la colección `trips` de Firestore.

| Campo | Tipo | Ejemplo |
|---|---|---|
| `status` | string | `pending` |
| `driverId` | null | `null` |
| `pickup` | map | `{ address: "Parque de Berrío", latitude: 6.2518, longitude: -75.5636 }` |
| `destination` | map | `{ address: "Estadio", latitude: 6.2565, longitude: -75.5905 }` |
| `distanceKm` | number | `8.5` |
| `durationMin` | number | `22` |
| `category` | string | `economy`, `xl` o `premium` (también `Económico`, `XL`, `Premium`) |
| `estimatedFare` | number | Resultado de `calculateFare()` para los valores anteriores, por ejemplo `19200` |
| `paymentMethod` | string | `cash`, `mercadopago` o `stripe` |
| `tip` | number (entero, opcional) | `0` |
| `createdAt` | timestamp | Fecha y hora actuales (obligatorio: la lista se ordena por este campo) |

## Solicitudes de viaje

### Modelo

- **Solicitudes compartidas:** cada viaje en `pending` es visible para todos los conductores aprobados y conectados. La primera aceptación válida gana: transacción en la app y reglas de Firestore. `pending` equivale al estado `requested` de la guía.
- **Oferta por conductor:** al ver una solicitud, la app crea `drivers/{uid}/tripOffers/{tripId}` con `status: "offered"` y `offeredAt` con la hora del servidor. Los 15 segundos se cuentan desde `offeredAt`, así que el contador no se reinicia al volver a renderizar, al pasar a segundo plano ni al reabrir la app.
- **Rechazo:** el botón Rechazar, o el vencimiento del plazo, cambia la oferta a `status: "rejected"` con `reason: "manual"` o `"expired"`. Solo afecta a ese conductor: la solicitud sigue disponible para los demás.
- **Reglas:** solo se puede aceptar con una oferta propia, no rechazada y dentro de los 15 s (verificado con `request.time`). No se puede rechazar la oferta de otro conductor ni reiniciar el plazo.

### Estados y transiciones

| Acción del conductor | Estado | Campo que se registra |
|---|---|---|
| Aceptar | `pending` → `accepted` | `driverId` |
| Voy en camino | `accepted` → `driver_arriving` | `arrivingAt` |
| Llegué al origen | `driver_arriving` (sin cambiar de estado) | `arrivedAt` |
| Pasajero a bordo | `driver_arriving` → `in_progress` | `startedAt` |
| Finalizar viaje | `in_progress` → `completed` | `completedAt` y desglose de tarifa |
| Cancelar (antes de que suba el pasajero) | `accepted` o `driver_arriving` → `cancelled` | `cancelledAt` |

La ruta del mapa va al punto de recogida hasta que el pasajero sube y después al destino. El estado `paid` lo escribe el conductor solo al confirmar un cobro en efectivo (ver [Pagos en efectivo y saldo](#pagos-en-efectivo-y-saldo)); el estado `rejected` global (requiere un backend) no los escribe esta app. Las reglas impiden al conductor modificar la tarifa, la distancia, la duración, la categoría, la propina, el método o el estado de pago, y cualquier cambio después de finalizar.

### Cómo probarlo

**Con el emulador (sin datos reales):**

```bash
npx firebase-tools emulators:start --only firestore      # en otra terminal
node scripts/dev/simulateTripRequests.cjs create --category all --payment cash
node scripts/dev/simulateTripRequests.cjs list
node scripts/dev/simulateTripRequests.cjs demo            # acepta, rechaza, deja vencer y finaliza
node scripts/dev/simulateTripRequests.cjs clear
```

El simulador está en `scripts/dev/`, fuera del código de la app. Solo funciona contra el emulador con proyectos `demo-*` y no usa credenciales.

**En Expo Go (Firebase del proyecto):**

1. Publicar antes las reglas y los índices de este módulo. La lista de solicitudes usa el índice compuesto `trips (status, createdAt desc)`.
2. Crear en Firebase Console un documento en `trips` siguiendo `scripts/dev/tripRequestTemplate.json`, con `createdAt` como timestamp de la fecha y hora actuales.
3. Con el conductor aprobado y conectado, abrir la pestaña Viajes: la solicitud aparece con su cuenta regresiva de 15 s.

## Pagos en efectivo y saldo

### Cobro en efectivo

Al finalizar un viaje con `paymentMethod: "cash"`, la pestaña Viajes muestra una tarjeta **Cobro en efectivo por confirmar** con:

| Concepto | Ejemplo (tarifa 20.000 COP, sin propina) |
|---|---|
| Efectivo a recibir del pasajero (tarifa + propina) | 20.000 COP |
| Comisión que el conductor debe a la plataforma (20 % de la tarifa) | 4.000 COP |
| Ganancia neta del conductor | 16.000 COP |

Al pulsar **Confirmar efectivo recibido** se escriben, en una sola transacción:

- `trips/{tripId}`: `status: "paid"`, `paymentStatus: "cash"` y `paidAt` con la hora del servidor.
- `drivers/{uid}/ledgerEntries/cash_{tripId}`: asiento `cash_commission` con estado `pending`, que copia los importes guardados al finalizar (`fare`, `tip`, `commission`, `commissionRate`, `driverEarnings`) y añade `cashAmount` (tarifa + propina) y `amount` (comisión adeudada).

Los importes no se recalculan: son los del desglose del módulo de tarifas, en pesos enteros, con la comisión redondeada a la mitad hacia arriba. Así el historial no cambia aunque cambien las tarifas.

### Saldo del conductor

La pantalla **Ganancias → Pagos** muestra la comisión pendiente con la plataforma, el efectivo recibido, las comisiones generadas, la ganancia neta en efectivo y la comisión de cada viaje. El saldo es negativo mientras haya comisiones pendientes.

- **Totales completos:** Firestore los calcula en el servidor sobre todos los asientos (`count` y `sum`), así que no dependen de cuántos movimientos se muestren. La lista de comisiones muestra los 100 más recientes e indica cuando hay más. Si el cálculo falla, la pantalla muestra un error en lugar de un saldo parcial.
- **Cobros por confirmar:** se consultan en el servidor filtrando por conductor, estado `completed` y método `cash`, y se leen todas las páginas de 50 resultados. Si falla una página, no se muestra una lista incompleta.

### Seguridad e integridad

`firestore.rules` exige que el cambio del viaje a `paid` y el asiento se escriban juntos (`existsAfter` y `getAfter`) y que el asiento tenga exactamente los importes del viaje. Un viaje solo genera un asiento, porque su ID es `cash_{tripId}`. El conductor no puede:

- Repetir el cobro.
- Modificar o borrar el asiento.
- Marcar la comisión como liquidada.
- Registrar efectivo en un viaje digital.
- Modificar un viaje pagado.

Repetir la operación o pulsar dos veces no duplica nada.

### Limitaciones

- La confirmación del efectivo es una declaración del conductor, no una verificación bancaria.
- No existe un backend administrativo. Las comisiones quedan `pending`; su liquidación (estado `settled` y asientos de pago) deberá escribirla un servidor con credenciales de administrador, que las reglas no conceden a la app.
- Los viajes con `mercadopago` se cobran con la pasarela (ver [Pasarela de pagos](#pasarela-de-pagos-mercado-pago-checkout-pro)). Los viajes con `stripe` quedan en `completed` con "Pago digital pendiente": Stripe no está integrado.
- Los viajes finalizados antes del módulo de tarifas, o sin `paymentMethod`, no pueden registrar un cobro.

## Pasarela de pagos (Mercado Pago Checkout Pro)

Cobro de los viajes con `paymentMethod: "mercadopago"` en **modo de prueba** (guía, sección 4). No se procesa dinero real.

### Flujo

1. Al finalizar el viaje, la pestaña Viajes muestra **Cobro con Mercado Pago** con el total (tarifa + propina), la comisión y la ganancia neta.
2. **Cobrar con Mercado Pago** llama a la función `createPaymentPreference` del backend con el `tripId` y el monto. El backend comprueba que el viaje es del conductor, está `completed` y se paga con Mercado Pago, calcula el monto con el desglose guardado (el de la app solo se compara) y crea la preferencia con el access token, que nunca está en la app.
3. La app abre el checkout en el navegador del sistema (`expo-web-browser`, incluido en Expo Go) y el pasajero paga con una tarjeta de prueba.
4. Mercado Pago notifica el pago al webhook `mercadoPagoWebhook` (y el navegador vuelve a `paymentReturn`). En ambos casos el backend **consulta el pago en la API** (`GET /v1/payments/{id}`), comprueba viaje, método, moneda COP y monto, y aplica el resultado en una transacción idempotente:
   - `approved`: `trips/{tripId}` pasa a `status: "paid"`, `paymentStatus: "approved"`, `paymentId` y `paidAt`; se crea `drivers/{uid}/ledgerEntries/mp_{tripId}` (`gateway_earning`) con la ganancia neta a favor del conductor.
   - `pending` / `in_process`: `paymentStatus: "pending"`.
   - `rejected` / `cancelled`: `paymentStatus: "rejected"`; el viaje sigue `completed` y se puede reintentar.
5. La app escucha el viaje en tiempo real y muestra el resumen del cobro. La pantalla **Pagos** muestra el saldo: ganancias cobradas con la pasarela menos comisiones pendientes de viajes en efectivo.

### Seguridad

- `MP_ACCESS_TOKEN` y `MP_WEBHOOK_SECRET` se guardan en Secret Manager (`defineSecret`); no están en el código, en `.env` de la app ni en el repositorio. Solo credenciales de prueba.
- El webhook verifica la firma `x-signature` (HMAC-SHA256 con la plantilla del SDK oficial de Node de Mercado Pago) y responde 401 si no es válida. Aunque la firma faltara, el estado siempre se toma de la API, nunca de la notificación ni de la URL de retorno.
- Un pago aprobado no retrocede, una notificación repetida no duplica la ganancia y un segundo pago aprobado del mismo viaje no se aplica (queda en `paymentEvents` para revisión).
- `firestore.rules` no cambia: el conductor sigue sin poder marcar como pagado un viaje digital ni crear asientos de ganancia; solo el backend (Admin SDK) los escribe. `paymentEvents` no es accesible desde la app.
- El pago en efectivo funciona igual que antes.

### Habilitar el pago de prueba real

Requiere el plan **Blaze** de Firebase (las Cloud Functions no se pueden desplegar en Spark). Pasos:

1. Activar Blaze con una alerta y un límite de presupuesto bajos.
2. En Mercado Pago Developers (Colombia), crear una aplicación de Checkout Pro y copiar el **access token de prueba**.
3. Cargar los secretos (la CLI pide el valor; no se escribe en archivos):
   ```bash
   npx firebase-tools functions:secrets:set MP_ACCESS_TOKEN --project uberclone-driver-8e0bf
   npx firebase-tools functions:secrets:set MP_WEBHOOK_SECRET --project uberclone-driver-8e0bf
   ```
4. Instalar las dependencias del backend y desplegar solo las funciones:
   ```bash
   npm --prefix functions install
   npx firebase-tools deploy --only functions --project uberclone-driver-8e0bf
   ```
5. En Mercado Pago (Tus integraciones → Webhooks), configurar la URL `https://us-central1-uberclone-driver-8e0bf.cloudfunctions.net/mercadoPagoWebhook` con el evento **Pagos**, y copiar la clave secreta de la firma en `MP_WEBHOOK_SECRET` (paso 3) si aún no estaba.
6. Crear un viaje con `paymentMethod: "mercadopago"`, completarlo y pagar con una tarjeta de prueba de Colombia, por ejemplo Visa `4013 5406 8274 6260`, CVV `123`, vencimiento `11/30`. El nombre del titular decide el resultado: `APRO` (aprobado), `CONT` (pendiente), `OTHE` (rechazado).

Parámetros no secretos opcionales en `functions/.env` (ver `functions/.env.example`): `MP_CHECKOUT_URL_FIELD` (`init_point` o `sandbox_init_point`), `MP_WEBHOOK_SIGNATURE_MODE` (`enforce` o `report`) y `PUBLIC_FUNCTIONS_BASE_URL`.

### MODO DEMOSTRACIÓN (sin credenciales ni Blaze)

Para presentar el flujo digital completo desde Expo Go sin credenciales de Mercado Pago. **No es Mercado Pago ni un pago real:** el checkout es una página simulada de UberClone, identificada como «MODO DEMOSTRACIÓN», y nada se escribe en el Firestore real.

- Todo ocurre en los **emuladores locales** del Mac: Firestore en el puerto 8181 y Functions en el 5002 (`firebase.demo.json`). El inicio de sesión anónimo sigue siendo el real, solo para identificar al conductor.
- El backend es el mismo; solo cambia el origen del pago. `createPaymentPreference` crea una preferencia de demostración y el checkout simulado registra el resultado (aprobado, pendiente o rechazado), que `processPayment` valida y aplica igual que un pago real.
- Los viajes, asientos y auditorías llevan `paymentMode: "demo"` y los IDs empiezan por `DEMO-`. La app muestra un aviso fijo «MODO DEMOSTRACIÓN» y etiquetas como «Pago aprobado (MODO DEMOSTRACIÓN)».
- **Protecciones:**
  - El backend solo activa el modo con `PAYMENTS_DEMO_MODE=true`, dentro del emulador de Functions y con el emulador de Firestore. Si se pide en otro entorno, `functions/index.js` no carga, así que no se puede desplegar.
  - En modo demostración no existen el webhook ni el retorno reales, y el webhook real no acepta IDs `DEMO-`.
  - La app solo lo activa en desarrollo (`__DEV__`, Expo Go) con `EXPO_PUBLIC_PAYMENTS_DEMO=true` y una IP local; un build de producción lo ignora.
- El pago en efectivo funciona igual, también dentro de la demostración.

**Iniciar la demostración** (Mac y móvil en la misma red Wi-Fi; tres terminales en la raíz del proyecto):

```bash
# Terminal 1: emuladores en modo demostración (Ctrl+C para detener)
npm --prefix functions install        # solo la primera vez
npm run demo:emuladores

# Terminal 2: app en Expo Go conectada a los emuladores (escanear el QR)
npm run demo:app

# Terminal 3: copiar el UID de Metro ("Conductor autenticado: <UID>") y preparar los datos
npm run demo:preparar -- --uid <UID>
# En Metro pulsar r para recargar la app; en Inicio, conectarse.
npm run demo:solicitud -- --metodo mercadopago   # solicitud nueva (15 s para aceptarla)
npm run demo:solicitud -- --metodo cash          # el efectivo sigue funcionando
npm run demo:solicitud -- --completado --uid <UID>  # atajo: viaje ya finalizado, listo para cobrar
```

En la app: aceptar la solicitud, recorrer el viaje, finalizarlo y pulsar **Abrir checkout de demostración**; en la página simulada, **Aprobar pago de demostración** y volver a la app. Los datos se ven en la interfaz de los emuladores, `http://127.0.0.1:4001/firestore`, no en Firebase Console. Al detener los emuladores, los datos de la demostración se borran.

Si la IP detectada no es la de la Wi-Fi, se puede indicar con `--ip`, por ejemplo `npm run demo:emuladores -- --ip 192.168.1.5`.

## Historial de carreras

Pestaña **Ganancias → Historial** (guía, sección 6).

- **Lista (`FlatList`)**: fecha y hora, origen y destino, categoría, tarifa, ganancia neta, estado del viaje y método y estado del pago. Ordenada del viaje más reciente al más antiguo según `createdAt`.
- **Filtros combinables**: Todos, Hoy, Semana (lunes a domingo), Mes, Rango de fechas (con el `DateTimePicker`, días completos e incluidos) y método de pago. Si no hay viajes, se indica con un mensaje según el filtro.
- **Carga incremental**: 20 viajes por página con cursor de Firestore; «Cargar más» o desplazarse hasta el final; deslizar hacia abajo para actualizar. No se repiten viajes entre páginas.
- **Detalle**: al tocar un viaje se abre una vista con fecha y hora, origen y destino, categoría, distancia, duración, tarifa, comisión aplicada (20 %), propina, ganancia neta, método y estado del pago y calificación («Sin calificación» si no existe). No se inventan datos: lo que falta se muestra como «No disponible».
- **Mapa**: origen, destino y una **ruta de referencia** calculada con OSRM entre ambos puntos. Los viajes no guardan el recorrido real, así que la ruta se identifica como referencia. Si faltan coordenadas o falla el servicio, se indica y el resto del detalle sigue visible.

**Consulta e índices.** El historial consulta en Firestore los viajes finalizados del conductor ordenados por `createdAt` (descendente), con el periodo y el método de pago filtrados en el servidor y `limit(20)`. Las reglas no cambian (viajes finalizados propios, `limit <= 50`). Esta consulta necesita dos índices compuestos declarados en `firestore.indexes.json` y **pendientes de despliegue**:

- `trips`: `driverId`, `status`, `createdAt` (desc).
- `trips`: `driverId`, `paymentMethod`, `status`, `createdAt` (desc).

Mientras no estén publicados, Firestore responde `failed-precondition` y la app usa automáticamente un **respaldo**: lee todos los viajes finalizados con la consulta que ya funciona (páginas de 50) y los filtra y ordena en el dispositivo, con un aviso en pantalla. Para publicarlos (con autorización):

```bash
npx --yes --package firebase-tools firebase deploy --only firestore:indexes --project uberclone-driver-8e0bf
```

Los viajes sin `createdAt` solo aparecen en el respaldo y sin filtro de periodo; todos los viajes creados por las solicitudes y los scripts de la app tienen `createdAt`.

## Ubicación GPS y Google Maps

La pestaña Inicio muestra un mapa con la ubicación real del conductor. Usa `expo-location` (solo primer plano) y `react-native-maps`. Cuando el conductor está conectado y aprobado, su ubicación se publica en `driverLocations/{uid}`, una colección privada que solo puede leer y escribir su propietario. Al desconectarse se detiene la publicación y se elimina el documento. No hay ubicación en segundo plano: el seguimiento se detiene cuando la app pasa a segundo plano. Si la app se cierra inesperadamente mientras el conductor está conectado, `drivers/{uid}.isOnline` puede seguir siendo `true` y la última ubicación puede permanecer almacenada. El futuro módulo de asignación de viajes deberá ignorar ubicaciones antiguas comprobando `updatedAt` y definir un mecanismo de expiración o presencia; `isOnline` por sí solo no garantiza que el conductor esté activo.

La aplicación funciona aunque no se conceda el permiso de ubicación.

### Configuración de la clave de Google Maps (pendiente del propietario)

La clave nunca se guarda en Git. Se lee de `.env` mediante `app.config.js`:

```text
GOOGLE_MAPS_API_KEY=
```

1. Crear o seleccionar un proyecto en Google Cloud.
2. Habilitar *Maps SDK for Android* y *Maps SDK for iOS*.
3. Crear claves restringidas por aplicación (Android: nombre de paquete y huella SHA-1; iOS: bundle identifier). `app.json` todavía no define `ios.bundleIdentifier` ni `android.package`; hay que definirlos antes de restringir las claves. Se pueden usar claves distintas con `GOOGLE_MAPS_API_KEY_ANDROID` y `GOOGLE_MAPS_API_KEY_IOS`.
4. Copiar `.env.example` a `.env` y completar la clave.
5. Generar un nuevo *development build* (la configuración nativa de Maps no cambia en una app ya instalada).
6. Para usar Google Maps en iOS, poner `EXPO_PUBLIC_USE_GOOGLE_MAPS_IOS=true` en `.env`.

### Expo Go y development build

- **Expo Go en Android:** el mapa usa Google Maps.
- **Expo Go en iOS:** Expo Go no incluye Google Maps; el mapa usa Apple Maps. Los permisos y el GPS funcionan igual.
- **Development build:** usa la clave configurada y permite Google Maps en iOS y Android.

## Pruebas

```bash
npm run test:unit
```

Las pruebas unitarias no necesitan el emulador. Las de integración y de reglas de Firestore se ejecutan contra el emulador local, que requiere Java:

```bash
npx firebase-tools emulators:start --only firestore
```

Con el emulador en ejecución, en otra terminal:

```bash
npm --prefix functions install   # una vez: dependencias del backend de pagos
npm run test:all
```

`test:all` incluye las pruebas del backend de Mercado Pago (`npm run test:functions`): lógica, firma del webhook y manejadores contra el emulador con una API de Mercado Pago simulada.

Para generar solicitudes de prueba en el emulador, ver la sección [Solicitudes de viaje](#solicitudes-de-viaje).

## Uso de IA

Se utiliza inteligencia artificial como herramienta de apoyo para el análisis de requisitos, desarrollo, revisión de código y documentación.

La bitácora registra las solicitudes realizadas, los resultados utilizados, los archivos modificados y las verificaciones correspondientes.

Consulta la [bitácora de uso de inteligencia artificial](docs/AI_LOG.md) (también en [PDF](docs/AI_LOG.pdf)) y el [reporte de cumplimiento de la guía](docs/CUMPLIMIENTO.md).

## Repositorio

https://github.com/julianch07/uberclone-driver