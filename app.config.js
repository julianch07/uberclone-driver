// AI-assisted: see docs/AI_LOG.md #13
// Extiende app.json. Se usa app.config.js porque app.json no interpola
// variables de entorno y la clave de Google Maps no debe guardarse en Git.
//
// Variables (archivo .env local, nunca en el repositorio):
//   GOOGLE_MAPS_API_KEY          clave para Android e iOS
//   GOOGLE_MAPS_API_KEY_ANDROID  (opcional) reemplaza la anterior en Android
//   GOOGLE_MAPS_API_KEY_IOS      (opcional) reemplaza la anterior en iOS
// Las claves solo se usan al generar el build nativo; no se incluyen en el
// código JavaScript de la aplicación.
module.exports = ({ config }) => {
  const sharedKey = process.env.GOOGLE_MAPS_API_KEY || undefined;
  const androidGoogleMapsApiKey =
    process.env.GOOGLE_MAPS_API_KEY_ANDROID || sharedKey;
  const iosGoogleMapsApiKey =
    process.env.GOOGLE_MAPS_API_KEY_IOS || sharedKey;

  return {
    ...config,
    plugins: [
      ...(config.plugins || []),
      [
        'expo-location',
        {
          // Solo ubicación en primer plano: no se declaran permisos de
          // ubicación "siempre" ni de actividad física.
          locationAlwaysAndWhenInUsePermission: false,
          locationAlwaysPermission: false,
          motionUsagePermission: false,
          locationWhenInUsePermission:
            'UberClone Driver usa tu ubicación mientras la app está abierta para mostrarte en el mapa y, cuando estás conectado, compartirla.',
        },
      ],
      [
        'react-native-maps',
        { androidGoogleMapsApiKey, iosGoogleMapsApiKey },
      ],
    ],
  };
};
