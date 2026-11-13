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
│   ├── config/
│   ├── constants/
│   ├── context/
│   ├── hooks/
│   ├── navigation/
│   ├── screens/
│   │   └── registration/
│   ├── services/
│   └── utils/
├── App.js
├── app.json
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

La aplicación ya cuenta con control de disponibilidad del conductor y ubicación GPS en primer plano con mapa. La recepción y operación de viajes, el cálculo de ganancias y el historial de viajes siguen pendientes. La configuración nativa de Google Maps y las pruebas en dispositivo también están pendientes.


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

### Pruebas

```bash
npm run test:unit
npx firebase-tools emulators:exec --only firestore "node --test tests/firestore.rules.test.cjs"
```

La primera no necesita el emulador. La segunda ejecuta las reglas de Firestore en el emulador local y requiere Java.

## Uso de IA

Se utiliza inteligencia artificial como herramienta de apoyo para el análisis de requisitos, desarrollo, revisión de código y documentación.

La bitácora registra las solicitudes realizadas, los resultados utilizados, los archivos modificados y las verificaciones correspondientes.

Consulta la [bitácora de uso de inteligencia artificial](docs/AI_LOG.md).

## Repositorio

https://github.com/julianch07/uberclone-driver