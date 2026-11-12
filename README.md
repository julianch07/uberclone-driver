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

Las funcionalidades de operación de viajes, disponibilidad, ubicación, ganancias e historial se encuentran pendientes de desarrollo.


## Uso de IA

Se utiliza inteligencia artificial como herramienta de apoyo para el análisis de requisitos, desarrollo, revisión de código y documentación.

La bitácora registra las solicitudes realizadas, los resultados utilizados, los archivos modificados y las verificaciones correspondientes.

Consulta la [bitácora de uso de inteligencia artificial](docs/AI_LOG.md).

## Repositorio

https://github.com/julianch07/uberclone-driver