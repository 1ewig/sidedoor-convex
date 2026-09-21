/**
 * Pure Geo Utilities & GeoJSON helpers
 */

// Generate a GeoJSON Polygon approximating a circle given center (lng, lat) and radius in km
export function createGeoJSONCircle(center: [number, number], radiusInKm: number, points = 64) {
  const coords: [number, number][] = [];
  const safeRadius = Math.max(0.1, radiusInKm);
  const latRad = (center[1] * Math.PI) / 180;
  const cosLat = Math.cos(latRad);
  // Protect against division by zero near poles
  const safeCosLat = Math.abs(cosLat) < 0.0001 ? 0.0001 : cosLat;

  const distanceX = safeRadius / (111.32 * safeCosLat);
  const distanceY = safeRadius / 110.574;

  for (let i = 0; i < points; i++) {
    const theta = (i / points) * (2 * Math.PI);
    const x = distanceX * Math.cos(theta);
    const y = distanceY * Math.sin(theta);
    coords.push([center[0] + x, center[1] + y]);
  }
  coords.push(coords[0]); // Close polygon ring

  return {
    type: 'Feature' as const,
    geometry: {
      type: 'Polygon' as const,
      coordinates: [coords],
    },
    properties: {},
  };
}

/**
 * Calculate accurate spherical ground distance between two coordinates in kilometers using the Haversine formula
 */
export function calculateHaversineDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  if (
    typeof lat1 !== 'number' ||
    typeof lon1 !== 'number' ||
    typeof lat2 !== 'number' ||
    typeof lon2 !== 'number' ||
    isNaN(lat1) ||
    isNaN(lon1) ||
    isNaN(lat2) ||
    isNaN(lon2)
  ) {
    return 0;
  }

  // Protect against uninitialized (0, 0) Null Island coordinates
  if ((lat1 === 0 && lon1 === 0) || (lat2 === 0 && lon2 === 0)) {
    return 0;
  }

  const R = 6371; // Earth's mean radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;

  // Clamp 'a' to [0, 1] to prevent floating point imprecision causing NaN on antipodal points
  const safeA = Math.min(1, Math.max(0, a));
  const c = 2 * Math.atan2(Math.sqrt(safeA), Math.sqrt(1 - safeA));
  return Number((R * c).toFixed(1));
}

