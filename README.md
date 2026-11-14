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

## Estructura del proyecto

```text
uberclone-driver/
├── assets/
├── docs/
│   └── AI_LOG.md
├── src/
│   ├── components/
│   │   ├── map/
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
- **Ganancias, pagos e historial:** resumen con comisión del 20 % para la plataforma y 80 % para el conductor, e historial de viajes completados y cancelados.
- **Perfil:** datos del conductor, del vehículo y acceso a la edición del registro.

Las reglas de `firestore.rules` restringen cada operación al conductor propietario y validan su estado. Las funcionalidades se verificaron en Expo Go.

Limitaciones conocidas:

- El plazo de 15 segundos cuenta desde que cada conductor recibe la solicitud. Una solicitud que nadie acepta sigue en `pending` en Firestore: marcarla como vencida o rechazada para todos requiere un backend.
- El historial consulta un máximo de 50 viajes finalizados.
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

La ruta del mapa va al punto de recogida hasta que el pasajero sube y después al destino. Los estados `paid` (módulo de pagos) y `rejected` global (requiere un backend) no los escribe esta app. Las reglas impiden al conductor modificar la tarifa, la distancia, la duración, la categoría, la propina, el método o el estado de pago, y cualquier cambio después de finalizar.

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
npm run test:all
```

Para generar solicitudes de prueba en el emulador, ver la sección [Solicitudes de viaje](#solicitudes-de-viaje).

## Uso de IA

Se utiliza inteligencia artificial como herramienta de apoyo para el análisis de requisitos, desarrollo, revisión de código y documentación.

La bitácora registra las solicitudes realizadas, los resultados utilizados, los archivos modificados y las verificaciones correspondientes.

Consulta la [bitácora de uso de inteligencia artificial](docs/AI_LOG.md).

## Repositorio

https://github.com/julianch07/uberclone-driver