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
- **Commit:** Pendiente de revisión y creación por el propietario.
- **Verificación:** Se ejecutaron 20 pruebas de lógica con `node --test tests/location.test.cjs` (permisos concedidos, denegados y bloqueados, coordenadas, errores de GPS, `stop()` antes de que se cree la suscripción, publicador con `start`, `stop` y `clear`, frecuencia, escrituras simultáneas, carrera con la desconexión y errores de conexión); las 20 pasaron. Al desactivar temporalmente dos protecciones del código, las pruebas correspondientes fallaron y luego se restauró el código. Se ejecutó `node --check` sobre los archivos de lógica y de pruebas, `git diff --check` sin observaciones y `npx expo export --platform ios` terminó correctamente. Con una clave falsa y una copia desechable se ejecutó `npx expo prebuild --no-install` y se comprobó que la clave llega a `Info.plist` y a `AndroidManifest.xml`, que solo se declara el permiso de ubicación en primer plano y que no se agregan permisos de ubicación en segundo plano; esa copia se eliminó. `npx expo-doctor` pasó 18 de 20 comprobaciones; las 2 restantes no pudieron ejecutarse por falta de acceso a la red (API de Expo y React Native Directory). Las 22 pruebas nuevas de reglas de Firestore y las 12 existentes no se ejecutaron en el entorno de Claude: el emulador de Firestore no se pudo descargar (respuesta 403 del proxy). Tampoco se ejecutó la aplicación en Expo Go ni en un development build, ni se probó el GPS, el mapa, Firestore real o la clave de Google Maps.
- **Revisión posterior (ChatGPT):** Se corrigió la descripción de alcance en README, se documentó el riesgo de ubicaciones obsoletas tras cierres inesperados y se añadió una advertencia visible cuando la desconexión funciona pero falla la eliminación de la ubicación. Estas correcciones no sustituyen las pruebas pendientes en dispositivo.
- **Verificaciones posteriores (ChatGPT, 2026-11-13):** El propietario ejecutó las pruebas de reglas de seguridad mediante `npx firebase-tools emulators:exec --project demo-uberclone-driver --only firestore "node --test tests/firestore.rules.test.cjs"`. Se obtuvieron **34 pruebas aprobadas y 0 fallidas**, incluyendo los 12 casos existentes y los 22 nuevos del módulo GPS. Inicialmente, 18 pruebas fallaron porque la función `assertDeniedByRule` rechazaba los mensajes que contenían `evaluation error`, aunque Firestore devolvía `permission-denied`. Se ajustó el verificador para comprobar la denegación sin exigir que el mensaje estuviera libre de errores de evaluación. Las pruebas pasaron después de ese cambio, pero los errores de evaluación siguen apareciendo en algunos rechazos y quedan pendientes de investigación. También se ejecutaron `npx expo-doctor` (**20/20 verificaciones aprobadas**), `npx expo export --platform ios` (exportación correcta) y `git diff --check` (sin observaciones). Las pruebas en dispositivo físico, con GPS real, Google Maps y Firestore de producción continúan pendientes.
- **Aprendizaje:** Separar la lógica de ubicación en funciones puras y servicios inyectables permite probar permisos, errores y limpieza de suscripciones sin un dispositivo, y las reglas de Firestore deben comprobar tanto la estructura de los datos como el estado actual del conductor.

### Consideraciones generales

La inteligencia artificial se utilizó como herramienta de apoyo durante el desarrollo del proyecto para orientar configuraciones, proponer estructuras, generar fragmentos de código y resolver dudas técnicas.