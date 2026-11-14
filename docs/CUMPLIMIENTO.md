# Reporte de cumplimiento — UberClone Driver

Comparación de la guía «UberClone — Versión Conductor» con el código de la rama `feat/pasarela-mercadopago` (14 de noviembre de 2026).

- **Cumplido:** implementado y cubierto por pruebas o verificado en la app.
- **Parcial:** implementado con diferencias o limitaciones documentadas.
- **Pendiente:** no implementado.
- **No verificado en detalle:** existe en el código, pero no se revisó punto por punto en esta revisión final.

Las pruebas automatizadas se ejecutan con `npm run test:all` (ver README, sección Pruebas). La app se probó en un iPhone real con Expo Go (registro, disponibilidad, solicitudes, viaje, finalización y pago en MODO DEMOSTRACIÓN), según el reporte del integrante.

## 2. Registro del conductor

| Requisito | Estado | Evidencia / observación |
|---|---|---|
| Tres secciones (datos personales, vehículo, documentos) con validaciones y errores bajo cada campo | Cumplido | `src/screens/registration/`, `src/components/registration/`, `src/utils/registrationValidation.js` |
| Estado «Pendiente de aprobación»; no puede conectarse hasta ser aprobado | Cumplido | `firestore.rules` (`approvedAndRegistered`, `driverCanAcceptTrip`) |
| Navegación Tab en el registro | No verificado en detalle | Las secciones se presentan dentro de `RegistrationScreen` |
| Sin datos bancarios ni de tarjetas en la app | Cumplido | Solo el correo de Mercado Pago |

## 3. Pantallas, estados y hooks

| Requisito | Estado | Evidencia / observación |
|---|---|---|
| Inicio: mapa y Disponible / No disponible con ubicación en tiempo real y limpieza | Cumplido | `DriverHomeScreen.js`, `useDriverLocation.js`, `expo-location` |
| Solicitud entrante con temporizador de 15 s y rechazo automático | Cumplido | `useTripRequests.js`, `tripRequestFeed.js`, reglas `tripOffers` |
| Viaje en curso con ruta a recogida y destino | Parcial | Ruta con OSRM (`routeService.js`) en lugar de Google Directions |
| Cobro y resumen (tarifa, comisión, ganancia, estado del pago) | Cumplido | `PendingCashPayments.js`, `PendingGatewayPayments.js` |
| Ganancias: totales de hoy, semana y mes | Parcial | `EarningsScreen.js` muestra totales generales, no por periodo |
| Historial | Cumplido | Ver sección 6 |
| Perfil y configuración | Parcial | `ProfileScreen.js` muestra datos y permite editar el registro; sin selector de idioma ni cierre de sesión (autenticación anónima) |
| Estados `requested` (≡ `pending`) → … → `paid` / `cancelled` | Cumplido | `tripLogic.js`, `firestore.rules`; el estado global `rejected` requiere un backend |
| Hooks: `useState`, `useEffect` con limpieza, `useContext`, `useCallback` | Cumplido | `DriverContext.js`, hooks de `src/hooks/` |
| `useMemo` para totales de ganancias y hook `useEarnings` | Pendiente | Los totales se calculan en `useEffect` |
| AsyncStorage solo para sesión y preferencias | Cumplido | Persistencia de Auth y recuperación del viaje activo |
| Navegación Stack + Tabs + Drawer | Parcial | Stack (`AppNavigator.js`) y pestañas propias en `DriverHomeScreen`; sin Drawer |

## 4. Pasarela de pagos

| Requisito | Estado | Evidencia / observación |
|---|---|---|
| Backend que crea la preferencia con la llave secreta | Parcial | `functions/` (`createPaymentPreference`), probado con emuladores; **no desplegado**: requiere plan Blaze |
| Checkout abierto desde la app | Parcial | `expo-web-browser`; el checkout real requiere credenciales de prueba de Mercado Pago |
| Webhook / retorno que actualizan `paymentStatus`, `paymentId` y `status: paid` | Parcial | Implementado con verificación de firma y confirmación por API; probado con API simulada, no con la API real |
| La app escucha el cambio en tiempo real | Cumplido | `subscribeToGatewayTrip` |
| Llave secreta fuera de la app; `.env.example` sin valores | Cumplido | Secret Manager (`defineSecret`); `functions/.env.example` |
| Pago en efectivo con comisión descontada del saldo | Cumplido | `cashPaymentService.js`, reglas `ledgerEntries` |
| Split payments (bonificación) | Pendiente | |

**Limitación principal:** la integración con la **API real de Mercado Pago no se probó**, porque no se obtuvieron credenciales y el proyecto está en el plan Spark. La presentación usa el **MODO DEMOSTRACIÓN** (emuladores locales y checkout simulado identificado como tal), que **no es Mercado Pago** ni procesa dinero. Los pasos para habilitar la integración real están en el README.

## 5. Tarifa, comisión y ganancias

| Requisito | Estado | Evidencia / observación |
|---|---|---|
| Función pura `calculateFare` usada en la estimación y al cerrar el viaje | Cumplido | `src/utils/fareLogic.js`, `src/config/pricing.js`; las reglas recalculan la tarifa |
| Comisión del 20 %, propina completa al conductor, pesos enteros | Cumplido | Pruebas con el ejemplo de la guía (19.200 / 26.900 COP) |
| `commissionRate` guardado en cada viaje | Cumplido | `buildCompletionBreakdown` |
| Ganancias por hoy, semana y mes con `useMemo` | Parcial | Ver sección 3 |
| Saldo: ganancias de la pasarela − comisiones de efectivo | Cumplido | `buildBalanceFromTotals`, pantalla Pagos |

## 6. Historial de carreras

| Requisito | Estado | Evidencia / observación |
|---|---|---|
| `FlatList` del más reciente al más antiguo | Cumplido | `TripHistoryScreen.js`; orden en Firestore por `createdAt` (`tripHistoryService.js`) |
| Filtros Hoy, Semana, Mes y Rango de fechas | Cumplido | `HistoryFilters.js`, `getPeriodBounds` |
| Filtro por método de pago | Cumplido | Combinable con el periodo |
| Elemento: fecha y hora, origen → destino, categoría, tarifa, ganancia neta, estado del pago | Cumplido | `buildHistoryListItem` |
| Detalle: ruta en el mapa, duración, distancia, comisión, propina | Parcial | `TripHistoryDetail.js`, `TripRouteMap.js`. La ruta es **de referencia** (OSRM), porque los viajes no guardan el recorrido real |
| Calificación del pasajero | Pendiente | No existe el dato (no hay app del pasajero); se muestra «Sin calificación» |
| Mensaje vacío según el filtro | Cumplido | |
| Paginar o limitar la consulta | Cumplido | 20 por página con cursor; índices pendientes de despliegue, con respaldo automático |
| Modelo de datos | Parcial | `pickup` en lugar de `origin` y `latitude`/`longitude` en lugar de `lat`/`lng`; sin `passengerId` ni `rating`; `paymentId` solo en pagos digitales |

## 7. APIs adicionales

| Servicio | Estado | Observación |
|---|---|---|
| Firebase Cloud Messaging (notificaciones en segundo plano) | Pendiente | Obligatorio en la guía; no implementado |
| Firestore en tiempo real | Cumplido | `onSnapshot` en solicitudes, viaje activo, pagos y saldo |
| Geolocalización continua | Cumplido | `expo-location` (equivalente a la librería sugerida) |
| Mapas (react-native-maps) | Cumplido | Google Maps en Android y Apple Maps en Expo Go iOS |
| Cloudinary | Cumplido | `cloudinaryService.js` |
| Google Directions / Distance Matrix | Parcial | Ruta con OSRM; distancia y duración vienen en el documento de la solicitud |
| Nominatim | Pendiente (opcional) | |

## 8 y 9. Bitácora y entregables

| Requisito | Estado | Observación |
|---|---|---|
| `docs/AI_LOG.md` con entradas, prompts literales y referencias `AI-assisted` | Cumplido | Entradas #1 a #40 |
| Bitácora en PDF | Cumplido | `docs/AI_LOG.pdf`, generado del Markdown |
| Hash de commit en cada entrada | Parcial | Algunas entradas recientes figuran como «Pendiente (lo registra el integrante)» |
| README con instalación, variables de entorno y sección Uso de IA | Cumplido | |
| Ramas, Pull Requests y merge en `main` | En curso | Commits locales en `feat/pasarela-mercadopago`, sin push |
| Video de 5 minutos | Pendiente | Responsabilidad del equipo |
