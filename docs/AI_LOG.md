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




### Consideraciones generales

La inteligencia artificial se utilizó como herramienta de apoyo durante el desarrollo del proyecto para orientar configuraciones, proponer estructuras, generar fragmentos de código y resolver dudas técnicas.

Las implementaciones fueron revisadas y ejecutadas dentro del proyecto. Las funcionalidades que todavía no han sido integradas o verificadas se registran como pendientes, sin presentarlas como terminadas.