// AI-assisted: see docs/AI_LOG.md #21

const OSRM_BASE_URL = 'https://router.project-osrm.org/route/v1/driving';

export async function getDrivingRoute(start, end) {
  if (
    !start ||
    !end ||
    !Number.isFinite(start.latitude) ||
    !Number.isFinite(start.longitude) ||
    !Number.isFinite(end.latitude) ||
    !Number.isFinite(end.longitude) ||
    Math.abs(start.latitude) > 90 ||
    Math.abs(end.latitude) > 90 ||
    Math.abs(start.longitude) > 180 ||
    Math.abs(end.longitude) > 180
  ) {
    throw new Error('Las coordenadas de la ruta no son válidas.');
  }

  const coordinates =
    `${start.longitude},${start.latitude};${end.longitude},${end.latitude}`;

  const url =
    `${OSRM_BASE_URL}/${coordinates}?overview=full&geometries=geojson`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error('No se pudo consultar el servicio de rutas.');
  }

  const data = await response.json();

  if (
    data.code !== 'Ok' ||
    !Array.isArray(data.routes) ||
    !data.routes[0]?.geometry?.coordinates
  ) {
    throw new Error('No se encontró una ruta disponible.');
  }

  const route = data.routes[0];

  return {
    coordinates: route.geometry.coordinates.map(
      ([longitude, latitude]) => ({
        latitude,
        longitude,
      })
    ),
    distanceMeters: route.distance,
    durationSeconds: route.duration,
  };
}
