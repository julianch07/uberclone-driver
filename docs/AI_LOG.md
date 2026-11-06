# Bitácora de uso de inteligencia artificial

**Proyecto:** UberClone Driver  
**Tecnología:** React Native, Expo y JavaScript  
**Repositorio:** https://github.com/julianch07/uberclone-driver  
**Desarrollador:** Trabajo individual  
**Fecha de inicio:** 5 de noviembre de 2026

---

## Registro 01. Inicialización del proyecto

**Fecha:** 5 de noviembre de 2026  
**Herramienta:** ChatGPT  
**Commit:** `b6ee68e`  
**Mensaje:** `chore: inicializar proyecto Expo y configuración base`

### Solicitud realizada a la IA

Se solicitó acompañamiento para iniciar el proyecto UberClone Driver desde cero, establecer la configuración inicial y organizar el entorno de desarrollo de acuerdo con los requisitos académicos.

**Nota sobre el prompt:** El texto literal de la solicitud original no está disponible en el historial recuperado. Se conserva la descripción documentada inicialmente, sin presentarla como una cita textual.

### Resumen de la respuesta

Se proporcionó orientación para crear el proyecto Expo, configurar JavaScript, preparar las dependencias y establecer el repositorio GitHub.

Se acompañó la configuración del entorno y la verificación inicial del proyecto.

### Trabajo utilizado, modificado o descartado

- Utilizado: configuración inicial del proyecto Expo y recomendaciones de organización.
- Modificado: ajustes de configuración y archivos del proyecto según las necesidades académicas.
- Descartado: ninguna modificación identificada.

### Archivos involucrados

- `package.json`
- `package-lock.json`
- `app.json`
- `.gitignore`

### Verificación

- Expo Doctor: 20 de 20 comprobaciones satisfactorias.
- Autenticación de GitHub CLI verificada.
- Primer commit publicado correctamente.

### Resultado y aprendizaje

Se estableció la base técnica del proyecto y se verificó que el entorno Expo funciona correctamente. También se aprendió a configurar Git, autenticar GitHub CLI y publicar cambios en un repositorio remoto.

### Observación sobre Git

El commit se creó originalmente en la rama `master`. Posteriormente, la rama principal se migró a `main`, conservando el historial de commits.

---

## Registro 02. Organización de la arquitectura del proyecto

**Fecha:** 5 de noviembre de 2026  
**Herramienta:** ChatGPT  
**Commit:** `49f1cf2`  
**Mensaje:** `chore: establecer arquitectura modular y bitácora de IA`

### Solicitud realizada a la IA

Se solicitó organizar la estructura interna del proyecto mediante módulos y responsabilidades separadas, con el propósito de facilitar el desarrollo, mantenimiento y ampliación de la aplicación.

**Nota sobre el prompt:** No se recuperó el texto literal de la solicitud original. Se conserva la descripción registrada durante la creación del proyecto.

### Resumen de la respuesta

Se propuso una arquitectura modular para separar las pantallas, componentes, navegación, servicios y lógica reutilizable.

También se estableció la carpeta de documentación para registrar el uso de inteligencia artificial.

### Trabajo utilizado, modificado o descartado

- Utilizado: organización modular de directorios y separación de responsabilidades.
- Modificado: estructura adaptada a las necesidades del proyecto.
- Descartado: ninguna modificación identificada.

### Archivos involucrados

- `src/components/`
- `src/screens/registration/`
- `src/navigation/`
- `src/services/`
- `src/context/`
- `src/hooks/`
- `src/utils/`
- `src/constants/`
- `src/config/`
- `docs/AI_LOG.md`

### Verificación

Se comprobó la existencia de los directorios mediante:

`find src docs -type d`

### Resultado y aprendizaje

Se estableció una organización modular que permite separar las responsabilidades de la aplicación. Se comprendió la importancia de evitar concentrar toda la lógica y las pantallas en un único archivo.

---

## Registro 03. Creación del asistente de registro

**Fecha:** 5 de noviembre de 2026  
**Herramienta:** ChatGPT  
**Commit:** `8d0b4ee`  
**Mensaje:** `feat: crear asistente de registro del conductor`

### Solicitud realizada a la IA

Se solicitó desarrollar la estructura inicial del asistente de registro del conductor, con dos etapas: datos personales e información del vehículo.

**Nota sobre el prompt:** No se recuperó el texto literal de la solicitud original. Se conserva la descripción registrada durante la creación del proyecto.

### Resumen de la respuesta

Se proporcionó una estructura inicial para el registro del conductor mediante dos etapas y controles de navegación.

Se implementó un indicador visual de progreso y se conectó la pantalla principal con `App.js`.

### Trabajo utilizado, modificado o descartado

- Utilizado: estructura inicial del asistente y navegación entre etapas.
- Modificado: organización de la pantalla según la estructura del proyecto.
- Pendiente: formularios completos, validaciones y persistencia de datos.

### Archivos involucrados

- `App.js`
- `src/screens/registration/RegistrationScreen.js`

### Verificación

- Aplicación ejecutada mediante Expo.
- Pantalla visualizada correctamente en Expo Go.
- Navegación entre las dos etapas comprobada.
- Código revisado.

### Resultado y aprendizaje

Se implementó el contenedor inicial del registro. Se comprendió cómo conectar componentes mediante importaciones y cómo utilizar `useState` para controlar el estado de una pantalla.

---

## Registro 04. Creación de la documentación README

**Fecha:** 5 de noviembre de 2026  
**Herramienta:** ChatGPT  
**Commit:** `7e71e5f`

### Solicitud realizada a la IA

Prompt original:

"que hago en readme"

### Resumen de la respuesta

Se explicó la función del archivo README y se proporcionó una estructura de documentación para el proyecto.

Se elaboró contenido con tecnologías, requisitos previos, instalación, ejecución, estructura de directorios, alcance de desarrollo y uso de inteligencia artificial.

### Trabajo utilizado, modificado o descartado

- Utilizado: estructura y contenido de documentación propuestos.
- Modificado: contenido adaptado a las versiones y tecnologías reales del proyecto.
- Descartado: instrucciones de configuración de funcionalidades que todavía no están implementadas.

### Archivos involucrados

- `README.md`

### Verificación

- Archivo README creado en la raíz del repositorio.
- Contenido revisado mediante la terminal.
- Encabezados y secciones Markdown comprobados.
- Enlace relativo a `docs/AI_LOG.md` incluido.

### Resultado y aprendizaje

Se creó la documentación principal del proyecto para facilitar su comprensión, instalación y ejecución. Se aprendió la importancia de documentar las tecnologías utilizadas, los comandos de ejecución y el proceso de desarrollo.

### Estado

Commit `7e71e5f` publicado correctamente en la rama `feature/registro-datos-personales`.
---

## Consideraciones generales

- Los cambios se desarrollan en ramas de trabajo y se integran a `main` mediante Pull Requests.
- Los commits deben describir únicamente los cambios realmente implementados.
- Las verificaciones deben corresponder a pruebas efectivamente realizadas.
- Los prompts deben registrarse literalmente siempre que estén disponibles.
- No se deben incluir contraseñas, tokens, claves privadas ni datos personales reales.
- La bitácora se actualizará durante el desarrollo del proyecto.

