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
- **Solicitudes de viaje:** lista en tiempo real de viajes pendientes, con un plazo de 20 segundos para aceptarlos.
- **Ciclo del viaje:** aceptar, iniciar, finalizar y cancelar viajes mediante transacciones de Firestore, con recuperación del viaje activo al reiniciar la aplicación.
- **Ruta del viaje:** recorrido hasta el punto de recogida o el destino, calculado con el servicio público OSRM.
- **Ganancias, pagos e historial:** resumen con comisión del 20 % para la plataforma y 80 % para el conductor, e historial de viajes completados y cancelados.
- **Perfil:** datos del conductor, del vehículo y acceso a la edición del registro.

Las reglas de `firestore.rules` restringen cada operación al conductor propietario y validan su estado. Las funcionalidades se verificaron en Expo Go.

Limitaciones conocidas:

- El plazo de 20 segundos se controla en el dispositivo; las solicitudes vencidas siguen pendientes en Firestore.
- El historial consulta un máximo de 50 viajes finalizados.
- El servicio público de OSRM es adecuado para pruebas, pero no garantiza disponibilidad en producción.
- La configuración nativa de Google Maps en un *development build* está pendiente.


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

## Uso de IA

Se utiliza inteligencia artificial como herramienta de apoyo para el análisis de requisitos, desarrollo, revisión de código y documentación.

La bitácora registra las solicitudes realizadas, los resultados utilizados, los archivos modificados y las verificaciones correspondientes.

Consulta la [bitácora de uso de inteligencia artificial](docs/AI_LOG.md).

## Repositorio

https://github.com/julianch07/uberclone-driver