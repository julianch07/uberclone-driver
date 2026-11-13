# Bitácora de uso de inteligencia artificial

**Proyecto:** UberClone Driver  
**Tecnología:** React Native, Expo y JavaScript  
**Repositorio:** https://github.com/julianch07/uberclone-driver  
**Desarrollo:** Trabajo individual

---

### Entrada #1

- **Fecha:** 2026-11-05
- **Integrante:** Julian Cardona
- **Herramienta:** ChatGPT
- **Objetivo:** Inicializar el proyecto UberClone Driver y configurar el entorno de desarrollo para comenzar su implementación.
- **Prompt:** No se conserva el texto literal de la solicitud inicial. La configuración se realizó con acompañamiento de IA.
- **Resumen de la respuesta:** Se proporcionó orientación para inicializar el proyecto con Expo, configurar el entorno de desarrollo y preparar el repositorio para trabajar con Git y GitHub.
- **Qué se usó / modificó / descartó:** Se utilizó la orientación para crear la estructura inicial del proyecto y configurar las herramientas necesarias para su ejecución.
- **Archivos y commit:** Archivos base del proyecto Expo y configuración de Git — `b6ee68e`. Mensaje: `chore: inicializar proyecto Expo y configuración base`.
- **Verificación:** Se ejecutó Expo Doctor y se obtuvieron 20 de 20 comprobaciones satisfactorias. Se verificó la autenticación de GitHub CLI, se realizó el primer commit y se publicó el repositorio. También se cambió la rama inicial `master` por `main`.
- **Aprendizaje:** Se comprendió el proceso de inicialización de un proyecto con Expo y la importancia de configurar correctamente Git y GitHub desde el comienzo.

---

### Entrada #2

- **Fecha:** 2026-11-05
- **Integrante:** Julian Cardona
- **Herramienta:** ChatGPT
- **Objetivo:** Organizar la arquitectura del proyecto mediante una estructura modular que facilite el desarrollo y mantenimiento de la aplicación.
- **Prompt:** No se conserva el texto literal de la solicitud original. Se solicitó orientación para organizar las carpetas y separar las responsabilidades del proyecto.
- **Resumen de la respuesta:** Se propuso una estructura modular para organizar los componentes, pantallas, servicios, configuración y documentación.
- **Qué se usó / modificó / descartó:** Se utilizó la estructura propuesta para organizar las carpetas del proyecto y se creó la bitácora para registrar el uso de inteligencia artificial durante el desarrollo.
- **Archivos y commit:** Carpetas de `src/` y `docs/`, incluyendo `docs/AI_LOG.md` — `49f1cf2`. Mensaje: `chore: establecer arquitectura modular y bitácora de IA`.
- **Verificación:** Se verificó la creación de las carpetas mediante el comando `find src docs -type d`.
- **Aprendizaje:** Se comprendió la importancia de separar las responsabilidades de una aplicación y mantener una estructura organizada para facilitar futuras modificaciones.

---

### Entrada #3

- **Fecha:** 2026-11-05
- **Integrante:** Julian Cardona
- **Herramienta:** ChatGPT
- **Objetivo:** Crear la estructura inicial del asistente de registro del conductor, organizando el proceso en diferentes pasos.
- **Prompt:** No se conserva el texto literal de la solicitud original. Se solicitó ayuda para implementar el flujo inicial de registro.
- **Resumen de la respuesta:** Se proporcionó una implementación inicial de un asistente de registro con dos pasos, un indicador de progreso y navegación entre las pantallas correspondientes.
- **Qué se usó / modificó / descartó:** Se utilizó la implementación como base visual y funcional para representar el proceso de registro del conductor. Los formularios todavía corresponden a una estructura de demostración.
- **Archivos y commit:** `App.js` y archivos relacionados con las pantallas y componentes del registro — `8d0b4ee`. Mensaje: `feat: crear asistente de registro del conductor`.
- **Verificación:** Se ejecutó el proyecto mediante Expo Go y se comprobó visualmente la pantalla de registro y la navegación entre los pasos.
- **Aprendizaje:** Se comprendió cómo dividir una funcionalidad en componentes y pantallas reutilizables para organizar mejor la interfaz de usuario.

---

### Entrada #4

- **Fecha:** 2026-11-05
- **Integrante:** Julian Cardona
- **Herramienta:** ChatGPT
- **Objetivo:** Crear la documentación README para explicar el propósito del proyecto, las tecnologías utilizadas y las instrucciones básicas de instalación y ejecución.
- **Prompt:** "que hago en readme"
- **Resumen de la respuesta:** Se explicó la importancia del archivo README y se propuso una estructura para documentar el proyecto, sus tecnologías, instalación y ejecución.
- **Qué se usó / modificó / descartó:** Se utilizó la orientación para crear el README del repositorio y describir la información principal del proyecto.
- **Archivos y commit:** `README.md` — `7e71e5f`. Mensaje: `docs: documentar el proyecto y registrar uso de IA`.
- **Verificación:** Se revisó el contenido del README y se verificó su inclusión en el repositorio.
- **Aprendizaje:** Se comprendió la importancia de documentar un proyecto para facilitar su instalación, comprensión y presentación a otros desarrolladores.

---

### Entrada #5

- **Fecha:** 2026-11-06
- **Integrante:** Julian Cardona
- **Herramienta:** ChatGPT
- **Objetivo:** Configurar Firebase en UberClone Driver e integrar los servicios iniciales de autenticación anónima y acceso a Firestore, utilizando variables de entorno para proteger la configuración.
- **Prompt:** No existe una única solicitud literal que represente todo el proceso. Se realizaron varias consultas para configurar Firebase, instalar sus dependencias, preparar la persistencia de autenticación y organizar los servicios de conexión.
- **Resumen de la respuesta:** Se proporcionaron instrucciones para crear un proyecto en Firebase, registrar una aplicación web, instalar Firebase SDK y AsyncStorage, configurar las variables de entorno e implementar la inicialización de Firebase, la autenticación y las operaciones básicas de Firestore.
- **Qué se usó / modificó / descartó:** Se utilizó la configuración propuesta para crear el proyecto Firebase `uberclone-driver-8e0bf`, registrar la aplicación web, crear la base de datos Firestore en la región `southamerica-east1`, instalar Firebase SDK versión `13.2.0` y AsyncStorage, configurar las variables de entorno y habilitar la autenticación anónima. También se implementaron los servicios de autenticación y Firestore, y se integraron las pruebas iniciales en `App.js`.
- **Archivos y commit:** `package.json`, `package-lock.json`, `.env.example`, `.gitignore`, `App.js`, `src/config/firebase.js`, `src/services/authService.js` y `src/services/firestoreService.js` — `8c2720d`. Mensaje: `feat: integrar Firebase y autenticación del conductor`. El archivo `.env` se configuró localmente y permanece excluido del repositorio.
- **Verificación:** Se verificó la instalación de Firebase mediante `npm ls firebase`. Se habilitó el proveedor de autenticación anónima desde Firebase Console. Se inició Expo con `npx expo start --clear` y se comprobó desde Expo Go que la aplicación autenticó al conductor anónimamente. En la consola se obtuvo su UID y el mensaje `Conexión con Firestore verificada correctamente.`. También se comprobó la escritura, lectura y eliminación del campo de prueba en Firestore. Se verificó que `.env` permanece excluido de Git.
- **Aprendizaje:** Se comprendió cómo inicializar Firebase en React Native, mantener la sesión de autenticación mediante AsyncStorage, separar los servicios de autenticación y Firestore, proteger las variables de entorno y comprobar las operaciones básicas de una base de datos desde la aplicación.

---


### Entrada #6

- **Fecha:** 2026-11-06
- **Integrante:** Julian Cardona
- **Herramienta:** ChatGPT
- **Objetivo:** Implementar los formularios de datos personales y del vehículo del conductor, incorporando campos, selectores, selección de fotografías y validaciones para controlar el avance del proceso de registro.
- **Prompt:** No existe una única solicitud literal que represente todo el proceso. Se realizaron varias consultas para desarrollar los componentes de registro, implementar las reglas de validación y conectar estas funcionalidades con la navegación entre los pasos.
- **Resumen de la respuesta:** Se proporcionó orientación y código para implementar los componentes reutilizables de los formularios, organizar los datos mediante estados de React, seleccionar fotografías desde la cámara o galería y validar la información ingresada antes de permitir avanzar al siguiente paso.
- **Qué se usó / modificó / descartó:** Se utilizaron las implementaciones propuestas para desarrollar los componentes `FormField`, `PersonalDataForm` y `VehicleDataForm`, así como las funciones de validación en `registrationValidation.js`. Se actualizaron las funciones de navegación y manejo de información en `RegistrationScreen.js`. La tercera pestaña de documentos y pagos se conserva como sección pendiente, de acuerdo con el alcance establecido para esta entrega.
- **Archivos y commit:** `src/screens/registration/RegistrationScreen.js`, `src/components/registration/FormField.js`, `src/components/registration/PersonalDataForm.js`, `src/components/registration/VehicleDataForm.js` y `src/utils/registrationValidation.js`. **Commit:** `0e37d23` (`feat: implementar formularios y validaciones del conductor`).
- **Verificación:** Se ejecutó la aplicación mediante Expo Go y se comprobó la navegación entre los pasos. Se probaron las validaciones de datos personales y del vehículo, incluyendo campos obligatorios, formato de placa, año del vehículo y capacidad mínima para la categoría XL. Se comprobó que los mensajes de error aparezcan debajo de los campos y que la aplicación impida avanzar cuando la información no cumple las reglas establecidas.
- **Aprendizaje:** Se comprendió cómo separar los formularios en componentes reutilizables, manejar información mediante `useState`, validar datos antes de avanzar en un asistente de registro y proporcionar mensajes de error para orientar al usuario.

### Entrada #7

- **Fecha:** 2026-11-06
- **Integrante:** Julian Cardona
- **Herramienta:** ChatGPT
- **Objetivo:** Integrar la subida de fotografías del conductor a Cloudinary y la persistencia de los datos personales y del vehículo en Firestore, permitiendo recuperar el registro al volver a abrir la aplicación.
- **Prompt:** No existe una única solicitud literal que represente todo el proceso. Se realizaron consultas para configurar Cloudinary, integrar la autenticación con Firebase, implementar la persistencia del registro y solucionar la incompatibilidad de FormData durante la carga de imágenes en React Native.
- **Resumen de la respuesta:** Se proporcionó orientación y código para implementar el servicio de subida de imágenes a Cloudinary, guardar y recuperar los datos mediante Firestore e integrar estas operaciones en el asistente de registro. Se adaptó el envío de fotografías utilizando la clase File de expo-file-system para resolver el error de compatibilidad de FormData.
- **Qué se usó / modificó / descartó:** Se integraron la autenticación anónima del conductor, la recuperación de información existente, la subida de fotografías a Cloudinary y el almacenamiento de las URL junto con los datos personales y del vehículo en Firestore. Se mantuvo la tercera pestaña de documentos y pagos como sección pendiente, de acuerdo con el alcance de esta entrega. La configuración local de Cloudinary permanece en .env y no se incluye en el repositorio.
- **Archivos y commit:** .env.example, App.js, src/screens/registration/RegistrationScreen.js, src/services/firestoreService.js y src/services/cloudinaryService.js — `d5efb91`. Mensaje: `feat: guardar registro y fotos del conductor`.
- **Verificación:** Se ejecutó npx expo export --platform ios y la compilación final terminó correctamente. Desde Expo Go se comprobó la autenticación anónima, el guardado exitoso del registro y la recuperación de la información y las fotografías después de cerrar y volver a abrir la aplicación.
- **Aprendizaje:** Se comprendió cómo integrar Cloudinary y Firestore en una aplicación React Native, almacenar URL de imágenes en lugar de URI locales, recuperar registros asociados al UID del usuario autenticado y utilizar File de expo-file-system para enviar archivos mediante FormData.

### Entrada #8

- **Fecha:** 2026-11-06
- **Integrante:** Julian Cardona
- **Herramienta:** ChatGPT
- **Objetivo:** Corregir el selector de fecha de nacimiento y aclarar visualmente que la tercera sección del registro está pendiente.
- **Prompt:** Solicitud de revisión y corrección del formulario de datos personales y del indicador de pasos para la primera entrega.
- **Resumen de la respuesta:** Se identificó el uso incorrecto de `onValueChange` en `DateTimePicker` y se indicó reemplazarlo por `onChange`. También se ajustó el texto de la tercera sección para mostrar explícitamente su estado pendiente.
- **Qué se usó / modificó / descartó:** Se cambió el callback del selector de fecha y se modificó la etiqueta de la tercera sección, sin implementar documentos ni pagos porque están fuera del alcance de esta entrega.
- **Archivos y commit:** `src/components/registration/PersonalDataForm.js` y `src/screens/registration/RegistrationScreen.js` — `cb9ac34`. Mensaje: `fix: corregir formulario y pasos del registro`.
- **Verificación:** Cambios revisados mediante `git diff` y `git diff --check`. La prueba funcional y la compilación quedan pendientes.
- **Aprendizaje:** Se reforzó la importancia de utilizar las propiedades correctas de los componentes y comunicar claramente las funcionalidades pendientes.

### Entrada #9

- **Fecha:** 2026-11-11
- **Integrante:** Julian Cardona
- **Herramienta:** ChatGPT
- **Objetivo:** Implementar la tercera sección del registro del conductor, correspondiente a documentos y pagos, e integrar su validación, almacenamiento y navegación con las secciones anteriores.
- **Prompt:** No existe una única solicitud literal que represente todo el proceso. Se realizaron consultas para desarrollar el formulario de documentos y pagos, integrar sus datos con Firestore y Cloudinary, implementar las validaciones y permitir la navegación entre las tres secciones.
- **Resumen de la respuesta:** Se proporcionó orientación y código para crear el componente `DocumentsPaymentsForm`, validar los datos y documentos requeridos, incorporar la aceptación de términos y condiciones, guardar la información del registro y permitir navegar entre las secciones.
- **Qué se usó / modificó / descartó:** Se implementó el formulario de documentos y pagos, incluyendo número y fotografía de licencia de conducción, fechas de vencimiento, fotografías del SOAT y revisión técnico-mecánica, correo de Mercado Pago y aceptación de términos. Se actualizaron las validaciones, el servicio de Firestore y la pantalla principal del registro para integrar los tres pasos y guardar las fotografías en Cloudinary. La revisión técnico-mecánica se maneja según su aplicabilidad.
- **Archivos:** `src/components/registration/DocumentsPaymentsForm.js`, `src/screens/registration/RegistrationScreen.js`, `src/services/firestoreService.js`, `src/utils/registrationValidation.js`, `app.json`, `package.json` y `package-lock.json`.
- **Commit:** `be8ded2` (`feat: implementar sección de documentos y pagos`).
- **Verificación:** Se ejecutó `npx expo export --platform ios` y la exportación terminó correctamente. Desde Expo Go se comprobó la visualización y navegación entre las tres secciones, las validaciones de campos obligatorios, el guardado exitoso del registro y la recuperación de los datos después de cerrar y volver a abrir la aplicación.
- **Aprendizaje:** Se comprendió cómo ampliar un asistente de registro con nuevos componentes, centralizar las validaciones por sección, integrar fotografías y datos adicionales en los servicios de persistencia y controlar la navegación sin perder la información guardada.


Las implementaciones fueron revisadas y ejecutadas dentro del proyecto. Las funcionalidades que todavía no han sido integradas o verificadas se registran como pendientes, sin presentarlas como terminadas.

### Entrada #10

- **Fecha:** 2026-11-12
- **Integrante:** Julian Cardona
- **Herramienta:** Claude (Anthropic). La auditoría y el plan de módulos se prepararon previamente con ChatGPT y la planificación se revisó con Claude.
- **Objetivo:** Implementar el módulo 1 de la entrega final: estado de aprobación del conductor, de modo que todo registro quede `pending` y solo pueda pasar a `approved` desde Firebase Console.
- **Prompt:** "Comencemos por el módulo 1: estado de aprobación del conductor." Las decisiones previas del propietario (estado inicial `pending`, cambio a `approved` desde Firebase Console, el conductor no puede modificar su propio estado y protección mediante reglas de Firestore) se indicaron en la misma conversación.
- **Resumen de la respuesta:** Se realizó una auditoría del proyecto sin modificar archivos, se acordó el plan y se implementó el módulo 1: constantes y funciones del estado de aprobación, escritura de `approvalStatus: 'pending'` solo cuando el documento no lo tiene, reglas de Firestore que impiden al conductor cambiarlo y un aviso con el estado en la pantalla de registro.
- **Qué se usó / modificó / descartó:** Se creó `src/config/driverStatus.js` (estados `pending`, `approved` y `rejected`, textos en español, `getApprovalStatus` y `canDriverGoOnline`). Se modificó `saveDriverRegistration` para que escriba `approvalStatus` y `approvalRequestedAt` únicamente si el documento aún no tiene estado; así guardar nuevamente no reinicia una aprobación. Se agregó a `RegistrationScreen.js` un aviso con el estado actual y un botón "Actualizar estado". Se creó `firestore.rules`. Un registro sin campo de estado se trata como `pending`. Se descartó migrar a Expo Router y no se agregaron dependencias. Las reglas deben publicarse manualmente en Firebase Console y reemplazan las reglas existentes. Aún no se bloquea la conexión del conductor, porque la pantalla de inicio se implementa en módulos posteriores; este módulo solo deja disponible `canDriverGoOnline`.
- **Archivos y commit:** `src/config/driverStatus.js`, `firestore.rules`, `src/services/firestoreService.js`, `src/screens/registration/RegistrationScreen.js` y `docs/AI_LOG.md`. Commit: `f749800` (`feat: implementar estado de aprobación del conductor`).
- **Verificación:** Se ejecutó una prueba de las funciones de `driverStatus.js` con Node (9 aserciones, todas correctas). En una copia del proyecto se ejecutó `npm ci` y `npx expo export --platform ios`, que terminó correctamente. No se ejecutaron `npx expo-doctor`, la aplicación en Expo Go, las lecturas y escrituras reales en Firestore ni las reglas de Firestore, porque el entorno no dispone de esos recursos. Esas comprobaciones quedan pendientes para el propietario.
- **Aprendizaje:** Se comprendió que un campo de autorización no puede protegerse solo desde la aplicación y que debe validarse en las reglas de Firestore, y que conviene escribir el estado inicial una única vez para no reiniciar aprobaciones al editar el registro.


### Entrada #11

- **Fecha:** 2026-11-12
- **Integrante:** Julian Cardona
- **Herramienta:** Claude (Anthropic)
- **Objetivo:** Permitir que el conductor navegue directamente entre las tres secciones del registro sin perder información, como solicitó el profesor para la entrega final.
- **Prompt:** "Tarea: implementar navegación entre las secciones del registro de UberClone Driver", con los requisitos funcionales, las restricciones técnicas y las verificaciones indicados en la solicitud.
- **Resumen de la respuesta:** Se revisó la arquitectura existente. Los indicadores de sección ya eran pulsables y los datos viven en el estado de `RegistrationScreen`, por lo que se conservaron. Se movió la regla de navegación a una función pura, se agregó el estado "Completa" o "Incompleta" a cada sección y se muestra un mensaje cuando se redirige a una sección incompleta.
- **Qué se usó / modificó / descartó:** Se creó `src/utils/registrationNavigation.js` con `getSectionCompletion` y `resolveStepNavigation`. Reglas: ir a la misma sección o a una anterior siempre es posible y no borra datos; ir a una sección posterior exige que las anteriores estén completas, y si no, se redirige a la primera incompleta con sus errores y un mensaje; la sección 3 incompleta puede abrirse, pero no se puede guardar el registro hasta cumplir sus validaciones. En `RegistrationScreen.js` se reemplazó la lógica de `handleStepPress` y se actualizó el indicador de pasos (verde y ✓ cuando está completa, azul la actual, etiqueta de estado y atributos de accesibilidad). No se modificaron las validaciones, la carga y el guardado en Firestore, la subida a Cloudinary, el estado de aprobación ni las reglas de Firestore, y no se agregaron dependencias. No se agregó guardado automático al cambiar de sección: los datos se conservan en pantalla y se persisten al pulsar "Guardar registro".
- **Archivos y commit:** `src/utils/registrationNavigation.js`, `src/screens/registration/RegistrationScreen.js` y `docs/AI_LOG.md`. Commit: `5748009` (`feat: mejorar navegacion entre secciones del registro`).
- **Verificación:** Se ejecutó con Node una prueba de las funciones de `registrationNavigation.js` contra los validadores reales (completitud, navegación libre con todo completo, retroceso sin validar, redirección a la primera sección incompleta y entrada a la sección 3 incompleta); todas las aserciones pasaron. Se ejecutó `git diff --check` sin observaciones y `npx expo export --platform ios` terminó correctamente. `npx expo-doctor` pasó 18 de 20 comprobaciones; las 2 restantes no pudieron ejecutarse por falta de acceso a la red del entorno (API de Expo). No se probó en Expo Go ni contra Firebase o Cloudinary reales, y no se realizó una prueba automatizada de la interfaz. Esas comprobaciones quedan pendientes para el propietario.
- **Aprendizaje:** Se comprendió que mantener los datos en el componente padre evita perder información al cambiar de sección, y que separar la regla de navegación en una función pura permite probarla sin ejecutar la aplicación.


### Entrada #12

- **Fecha:** 2026-11-12
- **Integrante:** Julian Cardona
- **Herramienta:** ChatGPT (OpenAI)
- **Objetivo:** Crear el inicio del conductor, navegación interna y control de disponibilidad basado en aprobación.
- **Prompt:** Implementar módulo 3 desde el ZIP actualizado, con Home, viajes y ganancias provisionales, perfil, acceso a edición del registro y control seguro de conexión.
- **Resumen de la respuesta:** Se implementó una pantalla de inicio con cuatro pestañas, integración con el registro persistido, lectura del estado de aprobación y disponibilidad guardada en Firestore mediante transacción. Se añadieron reglas de seguridad para impedir activar la disponibilidad sin aprobación. En una revisión posterior se separó el acceso al Home de la vigencia documental, se agregó un marcador de guardado exitoso y una confirmación antes de descartar cambios.
- **Qué se usó / modificó / descartó:** Se reutilizó el flujo de autenticación y los validadores; no se incorporó Expo Router ni dependencias adicionales. Las secciones de viajes y ganancias quedan como pantallas provisionales.
- **Archivos:** `App.js`, `src/screens/home/DriverHomeScreen.js`, `src/screens/registration/RegistrationScreen.js`, `src/services/availabilityService.js`, `src/services/firestoreService.js`, `src/utils/driverRegistration.js`, `firestore.rules`, `firebase.json`, `tests/firestore.rules.test.cjs`, `package.json`, `package-lock.json`, `.gitignore` y `docs/AI_LOG.md`.
- **Commit:** `bd26a6b` (`feat: implementar home y disponibilidad del conductor`). Integrado en `main` mediante el Pull Request #9, merge `49ab7ee`.
- **Verificación:** Se probó el módulo Home en Expo Go y se ejecutó `npx expo export --platform ios` correctamente. Se ejecutaron 12 pruebas automatizadas de reglas de Firestore en el emulador, con 12 resultados aprobados y 0 fallidos. Sin embargo, varios rechazos produjeron `evaluation error`, por lo que las validaciones negativas requieren revisión adicional. `git diff --check` terminó sin observaciones. Las reglas todavía no se han desplegado en Firebase Console y no se ha verificado su comportamiento en producción.
- **Aprendizaje:** La autorización para conectarse debe comprobarse en Firestore y no únicamente en la interfaz del dispositivo.


### Entrada #13

- **Fecha:** 2026-11-12
- **Integrante:** Julian Cardona
- **Herramienta:** Claude (Anthropic). El prompt del módulo se preparó con ChatGPT.
- **Objetivo:** Mostrar la ubicación GPS real del conductor en un mapa de Google Maps en la pestaña Inicio y publicarla en Firestore solo mientras está conectado y aprobado.
- **Prompt:** "IMPLEMENTACIÓN DEL MÓDULO 4 — GPS Y GOOGLE MAPS", sobre el ZIP actualizado del repositorio, con arquitectura, reglas de Firestore, configuración de Google Maps, pruebas y verificaciones indicadas en la solicitud.
- **Resumen de la respuesta:** Se implementaron los servicios de ubicación y de publicación, un hook de seguimiento, el componente del mapa y el de permisos, la integración en `DriverHomeScreen`, las reglas de `driverLocations/{uid}`, la configuración nativa mediante `app.config.js` y pruebas de lógica y de reglas.
- **Qué se usó / modificó / descartó:** Se agregaron `expo-location` (~58.0.22) y `react-native-maps` (1.29.11). Los números de versión se tomaron de `node_modules/expo/bundledNativeModules.json` porque `npx expo install` no pudo consultar la API de Expo desde el entorno de trabajo. `locationService.js` consulta permisos y GPS, obtiene la posición y devuelve una función `stop()` que elimina la suscripción incluso si se llama antes de que `watchPositionAsync` termine de resolverse. `driverLocationService.js` escribe el documento completo (latitud, longitud, precisión y fecha del servidor) y decide cuándo publicar: mínimo 10 s entre escrituras, 15 m de desplazamiento o renovación cada 60 s; no publica antes de `start()` ni después de `stop()`, y `clear()` espera la escritura en curso antes de eliminar el documento. En `DriverHomeScreen` el seguimiento está activo en la pestaña Inicio o mientras el conductor está conectado; la publicación se detiene antes de pedir la desconexión y se elimina la ubicación una vez confirmada. El seguimiento se detiene al pasar la app a segundo plano. `DriverMap` no dibuja el mapa hasta recibir una posición real y `LocationPermission` cubre los casos sin solicitar, rechazado, bloqueado y GPS desactivado. Las reglas exigen propietario, `drivers/{uid}` existente, aprobado y con `isOnline == true`, estructura exacta de cuatro campos, rangos válidos y `updatedAt == request.time`; el propietario puede leer y borrar su documento. Se mantuvieron las reglas de registro y disponibilidad. Android usa Google Maps; en iOS se usa Google Maps solo con `EXPO_PUBLIC_USE_GOOGLE_MAPS_IOS=true` en un development build con clave. No se implementó ubicación en segundo plano ni se incluyó ninguna clave real.
- **Archivos:** Creados: `app.config.js`, `src/components/map/DriverMap.js`, `src/components/map/LocationPermission.js`, `src/hooks/useDriverLocation.js`, `src/services/locationService.js`, `src/services/driverLocationService.js`, `src/utils/locationLogic.js`, `tests/location.test.cjs` y `tests/helpers/loadModule.cjs`. Modificados: `src/screens/home/DriverHomeScreen.js`, `firestore.rules`, `tests/firestore.rules.test.cjs`, `package.json`, `package-lock.json`, `.env.example`, `README.md` y `docs/AI_LOG.md`.
- **Commit:** `b67c3fa` (`feat: integrar ubicacion GPS y mapa del conductor`). Integrado en `main` mediante el Pull Request #11, commit de fusión `606bd56`.
- **Verificación:** Se ejecutaron 20 pruebas de lógica con `node --test tests/location.test.cjs` (permisos concedidos, denegados y bloqueados, coordenadas, errores de GPS, `stop()` antes de que se cree la suscripción, publicador con `start`, `stop` y `clear`, frecuencia, escrituras simultáneas, carrera con la desconexión y errores de conexión); las 20 pasaron. Al desactivar temporalmente dos protecciones del código, las pruebas correspondientes fallaron y luego se restauró el código. Se ejecutó `node --check` sobre los archivos de lógica y de pruebas, `git diff --check` sin observaciones y `npx expo export --platform ios` terminó correctamente. Con una clave falsa y una copia desechable se ejecutó `npx expo prebuild --no-install` y se comprobó que la clave llega a `Info.plist` y a `AndroidManifest.xml`, que solo se declara el permiso de ubicación en primer plano y que no se agregan permisos de ubicación en segundo plano; esa copia se eliminó. `npx expo-doctor` pasó 18 de 20 comprobaciones; las 2 restantes no pudieron ejecutarse por falta de acceso a la red (API de Expo y React Native Directory). Las 22 pruebas nuevas de reglas de Firestore y las 12 existentes no se ejecutaron en el entorno de Claude: el emulador de Firestore no se pudo descargar (respuesta 403 del proxy). Tampoco se ejecutó la aplicación en Expo Go ni en un development build, ni se probó el GPS, el mapa, Firestore real o la clave de Google Maps.
- **Revisión posterior (ChatGPT):** Se corrigió la descripción de alcance en README, se documentó el riesgo de ubicaciones obsoletas tras cierres inesperados y se añadió una advertencia visible cuando la desconexión funciona pero falla la eliminación de la ubicación. Estas correcciones no sustituyen las pruebas pendientes en dispositivo.
- **Verificaciones posteriores (ChatGPT, 2026-11-13):** El propietario ejecutó las pruebas de reglas de seguridad mediante `npx firebase-tools emulators:exec --project demo-uberclone-driver --only firestore "node --test tests/firestore.rules.test.cjs"`. Se obtuvieron **34 pruebas aprobadas y 0 fallidas**, incluyendo los 12 casos existentes y los 22 nuevos del módulo GPS. Inicialmente, 18 pruebas fallaron porque la función `assertDeniedByRule` rechazaba los mensajes que contenían `evaluation error`, aunque Firestore devolvía `permission-denied`. Se ajustó el verificador para comprobar la denegación sin exigir que el mensaje estuviera libre de errores de evaluación. Las pruebas pasaron después de ese cambio, pero los errores de evaluación siguen apareciendo en algunos rechazos y quedan pendientes de investigación. También se ejecutaron `npx expo-doctor` (**20/20 verificaciones aprobadas**), `npx expo export --platform ios` (exportación correcta) y `git diff --check` (sin observaciones). Posteriormente, el propietario realizó pruebas en un iPhone físico mediante Expo Go: se visualizó el mapa con la ubicación GPS real, se conectó un conductor aprobado y se confirmó la publicación de sus coordenadas en `driverLocations/{uid}` de Firestore de producción. Al desconectarse, se verificó que el documento de ubicación desapareció. En iOS con Expo Go se utiliza Apple Maps; la integración nativa de Google Maps mediante development build sigue pendiente de comprobar. Durante las pruebas se detectó que un registro antiguo no tenía `registrationCompletedAt`, lo que impedía conectarse bajo las reglas actuales; se añadió manualmente ese campo al registro de prueba. Queda pendiente definir una solución para otros registros antiguos. También quedan por investigar algunos mensajes de evaluación del emulador y una advertencia de transporte de Firestore.
- **Aprendizaje:** Separar la lógica de ubicación en funciones puras y servicios inyectables permite probar permisos, errores y limpieza de suscripciones sin un dispositivo, y las reglas de Firestore deben comprobar tanto la estructura de los datos como el estado actual del conductor.

### Entrada #14

- **Fecha:** 2026-11-13
- **Integrante:** Julian Cardona
- **Herramienta:** ChatGPT (OpenAI)
- **Objetivo:** Corregir la incompatibilidad de registros antiguos de conductores aprobados que no contienen `registrationCompletedAt`, sin alterar su aprobación ni debilitar las reglas de seguridad de Firestore.
- **Prompt:** Solucionar el error `Missing or insufficient permissions` que impedía conectar a conductores antiguos aprobados, evitando modificar manualmente sus documentos en Firebase Console y manteniendo las restricciones de seguridad.
- **Resumen de la respuesta:** Se implementó una regularización automática del campo `registrationCompletedAt` para registros antiguos aprobados y completos. La aplicación realiza una transacción para agregar únicamente el timestamp faltante y posteriormente otra transacción para actualizar la disponibilidad, comprobando nuevamente las condiciones de conexión.
- **Qué se usó / modificó / descartó:** Se agregó `validLegacyCompletionMigration()` a `firestore.rules`, permitiendo exclusivamente al propietario de un registro antiguo, aprobado, completo y desconectado agregar `registrationCompletedAt` con la fecha del servidor. Se modificó `src/services/availabilityService.js` para efectuar la regularización antes de conectarse. Se ampliaron las pruebas de seguridad y se creó `tests/availability.test.cjs` con pruebas del servicio mediante dependencias simuladas. Se descartó volver a guardar los formularios completos o modificar manualmente los documentos de producción como solución general. No se agregaron dependencias.
- **Archivos:** `firestore.rules`, `src/services/availabilityService.js`, `tests/firestore.rules.test.cjs`, `tests/availability.test.cjs` y `docs/AI_LOG.md`.
- **Commit:** Pendiente de crear en la rama `fix/compatibilidad-registros-antiguos`.
- **Verificación:** Se ejecutaron 40 pruebas de reglas de Firestore en el emulador, todas aprobadas; 20 pruebas de lógica GPS y ubicación, todas aprobadas; y 6 pruebas nuevas del servicio de disponibilidad, todas aprobadas. `npx expo-doctor` superó 20 de 20 comprobaciones. `npx expo export --platform ios` generó correctamente el paquete JavaScript de iOS. `git diff --check` terminó sin observaciones. Las pruebas del servicio utilizan Firebase simulado y no sustituyen una prueba real de integración. Las reglas nuevas aún no se han desplegado en Firebase de producción y la regularización automática todavía no se ha verificado en un iPhone físico. Algunos mensajes `evaluation error` del emulador siguen pendientes de investigación.
- **Aprendizaje:** Los cambios de esquema deben considerar registros existentes. Una migración controlada puede preservar la aprobación y los datos del conductor, mientras las reglas limitan los campos modificables y verifican las condiciones de autorización.

### Entrada #15

- **Fecha:** 2026-11-13
- **Integrante:** Julian Cardona
- **Herramienta:** ChatGPT (OpenAI).
- **Objetivo:** Implementar el módulo de solicitudes y aceptación de viajes para conductores aprobados y conectados, incorporando lógica de validación, transacciones de Firestore y reglas de seguridad.
- **Prompt:** Implementar el módulo de viajes de UberClone Driver, integrando solicitudes pendientes en tiempo real, aceptación segura por parte del conductor, validaciones de los datos del viaje y pruebas automatizadas.
- **Resumen de la respuesta:** Se implementó el componente de solicitudes de viajes y se integró en la pestaña Viajes de la pantalla principal. Se desarrollaron servicios para consultar solicitudes pendientes y aceptar viajes mediante transacciones de Firestore. También se incorporaron funciones puras para validar viajes y sus estados, reglas de seguridad específicas y pruebas unitarias, de integración y de autorización.
- **Qué se usó / modificó / descartó:** Se creó `src/components/trips/TripRequests.js`, que presenta solicitudes pendientes, origen, destino, tarifa estimada y permite aceptar viajes. Se crearon `src/services/tripService.js` para escuchar solicitudes en tiempo real y `src/services/tripAcceptance.js` para aceptar viajes mediante transacciones. Se creó `src/utils/tripLogic.js` con los estados `pending`, `accepted`, `in_progress`, `completed` y `cancelled`, además de funciones de validación y transición. Se ampliaron las reglas de `firestore.rules` para validar ubicaciones, tarifa, estado del viaje, identidad del conductor, aprobación, disponibilidad y vigencia documental. Se integró `TripRequests` en `DriverHomeScreen.js`. Se agregaron pruebas para registro, lógica de viajes, aceptación y reglas de seguridad. Se actualizaron los scripts de pruebas de `package.json` y se retiró `firebase-admin` de las dependencias de desarrollo. No se implementaron todavía el mapa de cada solicitud, el temporizador de aceptación ni el ciclo completo del viaje activo.
- **Archivos:** Modificados: `firestore.rules`, `package.json`, `package-lock.json` y `src/screens/home/DriverHomeScreen.js`. Creados: `src/components/trips/TripRequests.js`, `src/services/tripAcceptance.js`, `src/services/tripService.js`, `src/utils/tripLogic.js`, `tests/driverRegistration.test.cjs`, `tests/tripAcceptance.test.cjs`, `tests/tripLogic.test.cjs` y `tests/trips.rules.test.cjs`.
- **Commit:** Pendiente de crear.
- **Verificación:** Se ejecutaron 47 pruebas unitarias, 1 prueba de integración de aceptación de viajes y 55 pruebas de reglas de seguridad de Firestore: 103 aprobadas y 0 fallidas. La prueba de integración utilizó Firestore Emulator. Se ejecutó `npx expo export --platform ios` y se generó correctamente el bundle de iOS con 729 módulos y un tamaño de 3,5 MB. `git diff --check` terminó sin observaciones. Durante algunas pruebas negativas de seguridad aparecieron mensajes `PERMISSION_DENIED` y errores de evaluación de reglas; las pruebas verificaron los rechazos esperados, pero esos mensajes de evaluación quedan pendientes de investigación. No se considera verificado el despliegue de las nuevas reglas en Firebase de producción.
- **Aprendizaje:** Las transacciones permiten evitar que dos conductores acepten simultáneamente una misma solicitud. La seguridad de los viajes debe protegerse en Firestore y no depender exclusivamente de las validaciones de la interfaz. La separación entre componentes, servicios y funciones puras facilita el mantenimiento y las pruebas del módulo.

### Entrada #16

- **Fecha:** 2026-11-13
- **Integrante:** Julian Cardona
- **Herramienta:** ChatGPT
- **Objetivo:** Implementar Context API para centralizar el estado del conductor y gestionar la recuperación de viajes activos.
- **Prompt:** Solicité continuar el desarrollo de UberClone Driver mediante la implementación de Context API, integrando el estado de conexión del conductor, los viajes aceptados y su persistencia.
- **Resumen de la respuesta:** Se implementó DriverContext mediante React Context API, con estados para conexión, viaje activo, carga y errores. Se integró AsyncStorage para conservar el identificador del viaje aceptado y una suscripción a Firestore para sincronizar su información. Se conectó el contexto con App.js, DriverHomeScreen y TripRequests. También se incorporó una función para validar que un viaje activo pertenezca al conductor autenticado.
- **Archivos creados:** `src/context/DriverContext.js`, `src/utils/activeTripLogic.js` y `tests/activeTripLogic.test.cjs`.
- **Archivos modificados:** `App.js`, `src/screens/home/DriverHomeScreen.js`, `src/components/trips/TripRequests.js`, `src/services/tripService.js` y `package.json`.
- **Pruebas:** 52 pruebas unitarias aprobadas, incluyendo cinco nuevas para validar viajes activos. También se ejecutaron previamente una prueba de integración y 55 pruebas de reglas de Firestore, todas satisfactorias. La exportación iOS se completó correctamente.
- **Limitaciones:** Queda pendiente verificar manualmente la recuperación del viaje después de reiniciar la aplicación y probar específicamente los fallos de AsyncStorage y de sincronización con Firestore.
- **Commit:** `a439abc` (`feat: implementar contexto global del conductor y persistencia de viajes`).

### Entrada #17

- **Fecha:** 2026-11-13
- **Integrante:** Julian Cardona
- **Herramienta:** ChatGPT (OpenAI).
- **Objetivo:** Implementar el ciclo de vida de los viajes del conductor, permitiendo iniciar, finalizar y cancelar viajes aceptados de manera segura.
- **Prompt:** Continuar el desarrollo de UberClone Driver implementando las transiciones de estado de los viajes, sus servicios, reglas de seguridad, pruebas automatizadas e integración con la interfaz.
- **Resumen de la respuesta:** Se implementaron operaciones transaccionales de Firestore para iniciar, finalizar y cancelar viajes. Se integraron estas operaciones en el servicio principal y se incorporaron botones en el componente de viajes, según el estado actual. Se ampliaron las reglas de seguridad para restringir las transiciones a los conductores asignados y proteger los campos modificables.
- **Qué se usó / modificó / descartó:** Se creó `src/services/tripLifecycle.js` con funciones para gestionar las transiciones mediante `runTransaction` y `serverTimestamp`. Se modificó `src/services/tripService.js` para exponer las operaciones. Se actualizó `src/components/trips/TripRequests.js` para mostrar los botones "Iniciar viaje", "Finalizar viaje" y "Cancelar viaje", bloquear pulsaciones mientras se procesa una operación y presentar errores. Se ampliaron `firestore.rules` y `tests/trips.rules.test.cjs` para comprobar transiciones permitidas y rechazadas. Se optimizó la validación de aceptación para evitar superar el límite de expresiones del emulador de Firestore. Se reutilizaron `DriverContext` y las funciones existentes de `tripLogic.js`, sin crear pantallas nuevas ni agregar dependencias.
- **Archivos:** Creado: `src/services/tripLifecycle.js`. Modificados: `src/services/tripService.js`, `src/components/trips/TripRequests.js`, `firestore.rules`, `tests/trips.rules.test.cjs` y `docs/AI_LOG.md`.
- **Commit:** Pendiente de crear en la rama `feat/ciclo-vida-viajes`.
- **Verificación:** Se ejecutó `npm run test:all` con 52 pruebas unitarias, 1 de integración y 67 de reglas de Firestore: **120 aprobadas y 0 fallidas**. No se detectaron avisos del límite de 1000 expresiones de Firestore. Se ejecutó `npx expo export --platform all`, generando correctamente los paquetes JavaScript de iOS y Android. `git diff --check` terminó sin observaciones antes de la última verificación. Las operaciones todavía no se han probado manualmente en un dispositivo con viajes reales o de prueba, y las reglas modificadas aún no se han verificado en Firebase de producción.
- **Aprendizaje:** Las transiciones de estado deben protegerse tanto en las transacciones del cliente como en las reglas de Firestore. Reutilizar el contexto global permite sincronizar el viaje activo sin duplicar su estado en otros componentes.

### Entrada #18

- **Fecha:** 2026-11-13
- **Integrante:** Julian Cardona
- **Herramienta:** ChatGPT (OpenAI).
- **Objetivo:** Implementar y fortalecer la recuperación automática de viajes activos del conductor después de reiniciar la aplicación, evitando inconsistencias entre Firestore, AsyncStorage y el estado global.
- **Prompt:** Revisar y corregir el módulo de recuperación de viajes activos, incluyendo consultas seguras a Firestore, persistencia local, protección frente a condiciones de carrera, pruebas automatizadas y conservación de las funcionalidades existentes.
- **Resumen de la respuesta:** Se incorporó la búsqueda de viajes activos del conductor en Firestore, utilizando los estados `accepted` e `in_progress`. Se modificó `DriverContext` para recuperar el viaje guardado localmente o consultar Firestore cuando no existe una referencia válida. Se añadieron controles de identidad y versiones para impedir que operaciones asíncronas antiguas sobrescriban selecciones recientes. También se incorporó un módulo que serializa las operaciones de AsyncStorage por clave.
- **Qué se usó / modificó / descartó:** Se reutilizaron Context API, Firebase, AsyncStorage y los servicios existentes. Se reforzó `TripRequests` para impedir la aceptación de nuevas solicitudes mientras se recupera o verifica un viaje activo. Se incorporaron reglas de seguridad para consultar únicamente viajes activos pertenecientes al conductor y un índice compuesto para respaldar la consulta. No se añadieron dependencias ni se reemplazó la arquitectura de navegación.
- **Archivos:** Modificados: `firebase.json`, `firestore.rules`, `package.json`, `src/components/trips/TripRequests.js`, `src/context/DriverContext.js`, `src/services/tripService.js` y `tests/trips.rules.test.cjs`. Creados: `firestore.indexes.json`, `src/utils/activeTripStorage.js`, `tests/activeTripService.test.cjs` y `tests/activeTripStorage.test.cjs`.
- **Commit:** Pendiente de crear en la rama `fix/recuperacion-viaje-activo`.
- **Verificación:** Se ejecutaron 59 pruebas unitarias, 1 prueba de integración y 69 pruebas de reglas de Firestore mediante el emulador: **129 aprobadas y 0 fallidas**. Las pruebas incluyen recuperación de viajes activos, protección de operaciones de almacenamiento y rechazo de consultas no autorizadas. `git diff --check` terminó sin observaciones en los archivos rastreados. Durante algunas pruebas negativas aparecieron mensajes `PERMISSION_DENIED` y errores de evaluación de reglas, que requieren revisión adicional. No se ha verificado todavía la recuperación manual después de reiniciar Expo Go ni el despliegue de las reglas y el índice en Firebase de producción.
- **Aprendizaje:** La recuperación de estado debe combinar persistencia local con una fuente de verdad remota. Las operaciones asíncronas necesitan controles de vigencia e identidad para evitar que resultados antiguos sobrescriban estados recientes. Las reglas de Firestore deben impedir el acceso a viajes de otros conductores.

### Entrada #19

- **Fecha:** 2026-11-13
- **Integrante:** Julian Cardona
- **Herramienta:** ChatGPT (OpenAI).
- **Objetivo:** Corregir el bloqueo de la interfaz en "Recuperando viaje activo..." después de finalizar un viaje.
- **Prompt:** Diagnosticar y corregir el problema que ocurre cuando un conductor finaliza un viaje, Firestore actualiza correctamente su estado a `completed`, pero la aplicación permanece indefinidamente recuperando el viaje activo.
- **Resumen de la respuesta:** Se identificó una condición de carrera en `DriverContext.js`. Al finalizar un viaje, la suscripción de Firestore detectaba que ya no estaba activo e iniciaba una reconciliación. Sin embargo, el cambio de `activeTripId` provocaba la limpieza de la suscripción y marcaba la operación como cancelada, impidiendo finalizar correctamente el estado de carga. Se separó la vigencia de la reconciliación de la cancelación de la suscripción, conservando las protecciones de identidad del conductor, versión de operación y selección de viajes.
- **Qué se usó / modificó / descartó:** Se reutilizaron React Context API, Firestore, AsyncStorage y los mecanismos existentes de recuperación. Se creó una función auxiliar para validar la vigencia de las reconciliaciones y facilitar sus pruebas. No se agregaron dependencias ni se modificaron las reglas de seguridad.
- **Archivos creados:** `src/utils/activeTripRecovery.js` y `tests/activeTripRecovery.test.cjs`.
- **Archivos modificados:** `src/context/DriverContext.js`, `package.json` y `docs/AI_LOG.md`.
- **Commit:** Pendiente de crear en la rama `fix/bloqueo-recuperacion-viaje`.
- **Verificación:** Se ejecutó `npm run test:all` con 64 pruebas unitarias, 1 prueba de integración y 69 pruebas de reglas de Firestore: **134 aprobadas y 0 fallidas**. Las cinco pruebas nuevas verifican la vigencia de las reconciliaciones y su invalidación ante cambios de conductor, operaciones posteriores, selección de otro viaje o desmontaje del contexto. Durante las pruebas negativas de seguridad aparecieron mensajes `PERMISSION_DENIED` y errores de evaluación de reglas, pendientes de investigación. Falta comprobar manualmente en Expo Go que finalizar un viaje permita regresar a la recepción de solicitudes sin bloquear la interfaz.
- **Aprendizaje:** La cancelación de una suscripción no necesariamente debe cancelar las operaciones asíncronas que inició. Separar sus ciclos de vida y validar la identidad y versión de cada operación ayuda a prevenir condiciones de carrera y estados de carga indefinidos.

### Entrada #20

- **Fecha:** 2026-11-13
- **Integrante:** Julian Cardona
- **Herramienta:** ChatGPT (OpenAI).
- **Objetivo:** Implementar un temporizador de 20 segundos para aceptar solicitudes de viaje, evitando que el conductor acepte solicitudes después de agotarse el tiempo.
- **Prompt:** Incorporar una cuenta regresiva de 20 segundos en las solicitudes pendientes de UberClone Driver, mostrar el tiempo restante, ocultar las solicitudes vencidas y evitar que las actualizaciones de Firestore reinicien el contador, conservando la funcionalidad existente.
- **Resumen de la respuesta:** Se implementó una utilidad para calcular el tiempo restante y determinar cuándo expira una solicitud. Se integró un contador visible en `TripRequests.js`, actualizado periódicamente, que oculta las solicitudes al agotarse los 20 segundos. Se incorporó una validación adicional antes de aceptar un viaje y se conservaron los tiempos iniciales de cada solicitud para evitar reinicios por actualizaciones de Firestore.
- **Qué se usó / modificó / descartó:** Se reutilizaron React Hooks, el componente de solicitudes y la suscripción existente a Firestore. La expiración se implementó localmente, sin cancelar ni modificar automáticamente los documentos de viajes pendientes en Firestore. No se añadieron dependencias ni se modificaron las reglas de seguridad.
- **Archivos creados:** `src/utils/tripRequestTimer.js` y `tests/tripRequestTimer.test.cjs`.
- **Archivos modificados:** `src/components/trips/TripRequests.js` y `docs/AI_LOG.md`.
- **Commit:** Pendiente de crear en la rama `feat/temporizador-solicitudes`.
- **Verificación:** Se ejecutaron 139 pruebas automatizadas con `node --test tests/*.test.cjs`, todas aprobadas y ninguna fallida. Las cinco pruebas nuevas verifican el inicio, la disminución, la expiración y los límites del contador. Se ejecutó `npx expo export --platform ios` correctamente, generando el bundle de iOS con 735 módulos. En Expo Go se comprobó manualmente que una solicitud pendiente muestra la cuenta regresiva y desaparece después de 20 segundos.
- **Limitaciones:** El temporizador comienza cuando el dispositivo observa la solicitud y no está sincronizado entre conductores ni respaldado por una fecha de expiración del servidor. Al reiniciar la aplicación, el plazo local puede comenzar nuevamente. Las solicitudes expiradas permanecen pendientes en Firestore hasta que otro proceso cambie su estado.
- **Aprendizaje:** Separar la lógica temporal en funciones puras facilita las pruebas. Conservar la primera aparición de cada solicitud evita que las actualizaciones en tiempo real reinicien el contador. Para una solución de producción, la expiración debe controlarse también desde el servidor.

### Entrada #21

- **Fecha:** 2026-11-13
- **Integrante:** Julian Cardona
- **Herramienta:** ChatGPT (OpenAI).
- **Objetivo:** Implementar la visualización de mapas y rutas del conductor durante los viajes.
- **Prompt:** Integrar mapas en UberClone Driver, mostrando la ubicación del conductor, los puntos de recogida y destino, las rutas por carretera, la distancia y el tiempo estimado.
- **Resumen de la respuesta:** Se implementó la visualización de rutas mediante un mapa interactivo y el servicio OSRM. Cuando el viaje está aceptado, la ruta conecta al conductor con el punto de recogida. Cuando está en curso, conecta al conductor con el destino. Se incorporaron marcadores y estimaciones de distancia y duración.
- **Archivos creados:** `src/services/routeService.js`, `src/utils/tripMapLogic.js` y `tests/tripMapLogic.test.cjs`.
- **Archivos modificados:** `src/components/map/DriverMap.js` y `src/screens/home/DriverHomeScreen.js`.
- **Verificación:** Las 7 pruebas de lógica del mapa finalizaron correctamente. La exportación de iOS se completó sin errores. Se verificó manualmente la visualización de rutas en Expo Go.
- **Limitaciones:** El servicio público de OSRM es adecuado para pruebas, pero no garantiza disponibilidad para producción. Persiste un error de permisos al aceptar solicitudes en Firebase real que requiere diagnóstico independiente.
- **Aprendizaje:** Separar la lógica de rutas del componente visual facilita las pruebas y permite adaptar el recorrido al estado del viaje.
- **Commit:** Pendiente.


### Consideraciones generales

### Entrada #22

- **Fecha:** 2026-11-13
- **Herramienta:** Gemini CLI
- **Objetivo:** Finalización del proyecto: sistema de tarifas, pantallas de ganancias, historial, perfil, pagos, navegación y corrección de permisos.
- **Resumen de la respuesta:** Se implementó el sistema de tarifas con comisión del 20% en `fareLogic.js`. Se crearon las pantallas de `EarningsScreen`, `TripHistoryScreen`, `ProfileScreen` y `PaymentSummaryScreen`. Se integró `react-navigation` para la gestión de pantallas. Se corrigieron las reglas de Firestore para manejar mejor los formatos de fecha en la aceptación de viajes.
- **Archivos:** `src/utils/fareLogic.js`, `src/screens/home/EarningsScreen.js`, `src/screens/home/TripHistoryScreen.js`, `src/screens/home/ProfileScreen.js`, `src/screens/home/PaymentSummaryScreen.js`, `src/navigation/AppNavigator.js`, `App.js`, `src/screens/home/DriverHomeScreen.js`, `firestore.rules`, `src/services/tripService.js`.
- **Verificación:** Se instalaron las dependencias de navegación. Se actualizaron las reglas de seguridad. Se verificó la exportación de iOS.
- **Aprendizaje:** La integración de navegación profesional mejora la experiencia del usuario. Las reglas de Firestore deben ser extremadamente robustas con los formatos de datos.

### Entrada #23

- **Fecha:** 2026-11-13
- **Integrante:** Julian Cardona
- **Herramienta:** Claude Code (Claude Opus 5.5, Anthropic).
- **Objetivo:** Diagnosticar y corregir los errores `FirebaseError: Missing or insufficient permissions` que impedían completar el ciclo de viajes y consultar historial, ganancias y pagos.
- **Prompt:** Investigar los errores de permisos de Firestore distinguiendo problemas de reglas, consultas, datos y despliegue; corregirlos manteniendo reglas restrictivas y compatibilidad con documentos existentes; añadir pruebas de reglas y de aceptación; no modificar datos reales ni desplegar reglas sin autorización.
- **Resumen de la respuesta:** Se reprodujeron los fallos en el emulador antes de corregirlos. (1) **Reglas/consulta:** `getDriverTripHistory` (usada por `TripHistoryScreen`, `EarningsScreen` y `PaymentSummaryScreen`) consulta `completed`/`cancelled` con límite 50, pero `allow list` solo autorizaba `accepted`/`in_progress` con límite 2; el emulador respondía `false for 'list'`. Se añadió una rama de lista exclusiva para viajes finalizados del propio conductor, con límite máximo de 50 y sin exigir conexión. (2) **Datos:** la regla de aceptación exigía que `driverId` existiera con valor `null`; un viaje creado en la consola sin ese campo pasaba la comprobación del cliente (`driverId != null`) pero era rechazado por las reglas. Ahora el campo ausente se trata como no asignado en reglas y en `tripLogic.js`. (3) **Mensajes:** `tripAcceptance.js` valida origen, destino y tarifa antes de escribir y muestra "La solicitud tiene datos incompletos o inválidos" en lugar del error de permisos. La transacción sigue modificando solo `status` y `driverId`, como exigen las reglas. Con las reglas anteriores y datos bien formados, aceptar, iniciar, finalizar y cancelar funcionaban en el emulador; si la aceptación falla en Firebase real, la causa está en las reglas publicadas o en los datos reales (ver pendientes).
- **Qué se usó / modificó / descartó:** Se mantuvieron todas las validaciones de conductor (aprobación, registro, conexión, documentos vigentes) y de viaje. No se usó `allow read, write: if true`. Se descartó filtrar viajes mal formados de la lista de pendientes para no ocultar problemas de datos. Se descartó ejecutar `npx expo lint` porque el proyecto no tiene ESLint configurado y el comando instalaría dependencias nuevas. Las pruebas de viajes usan proyectos propios del emulador para que `clearFirestore()` de archivos ejecutados en paralelo no borre datos ajenos.
- **Archivos creados:** `tests/tripCycle.integration.test.cjs`.
- **Archivos modificados:** `firestore.rules`, `src/services/tripService.js`, `src/services/tripAcceptance.js`, `src/utils/tripLogic.js`, `tests/trips.rules.test.cjs`, `tests/tripAcceptance.test.cjs`, `tests/tripLogic.test.cjs`, `tests/activeTripService.test.cjs`, `package.json` (scripts de pruebas) y `docs/AI_LOG.md`.
- **Commit:** Pendiente (sin commit por indicación del integrante).
- **Verificación:** `npm run test:all` con el emulador local: 79 pruebas unitarias, 11 de integración y 77 de reglas, **167 aprobadas y 0 fallidas** (línea base antes de los cambios: 134/134, sin cobertura del historial). La prueba de ciclo completo ejecutada contra las reglas anteriores falló en el historial (`false for 'list'`), y pasa con las nuevas. `npx expo export --platform ios` generó el bundle correctamente. `git diff --check` sin observaciones. Con autorización del integrante se ejecutó `npx firebase-tools deploy --only firestore:rules,firestore:indexes --project uberclone-driver-8e0bf` (2026-11-13): reglas compiladas y publicadas e índice de `trips` (`driverId`, `status`) desplegado, sin advertencias ni errores; `firestore:indexes` confirmó que el índice publicado coincide con el archivo local. Pendiente la verificación manual en Expo Go.
- **Limitaciones:** El historial sin `orderBy` devuelve hasta 50 viajes finalizados sin garantía de ser los más recientes; se ordenan en el cliente. Un conductor con más de 50 viajes finalizados verá ganancias parciales.
- **Aprendizaje:** Las reglas de Firestore no filtran resultados: cada consulta nueva necesita una regla que la autorice explícitamente, y conviene acompañarla de una prueba con la misma consulta del servicio. Firestore evalúa cada valor de un filtro `in` como una consulta separada, lo que debe tenerse en cuenta al diseñar pruebas negativas.
