export interface LatLng {
  lat: number;
  lng: number;
}

/**
 * Calculates straight-line distance in miles using the Haversine formula
 */
export function calculateDistanceMiles(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  if (lat1 === lat2 && lon1 === lon2) return 0;

  const R = 3958.8; // Earth radius in miles
  const toRad = (d: number) => (d * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Formats a distance in miles nicely (e.g. "0.4 mi", "12 mi")
 */
export function formatDistanceMiles(miles: number): string {
  if (miles < 10) {
    return `${miles.toFixed(1)} mi`;
  }
  return `${Math.round(miles)} mi`;
}

/**
 * Generates an external link for turn-by-turn directions or maps search
 */
export function getDirectionsUrl(
  location?: string | null,
  coords?: LatLng | null
): string {
  if (coords && !isNaN(coords.lat) && !isNaN(coords.lng)) {
    return `https://www.google.com/maps/dir/?api=1&destination=${coords.lat},${coords.lng}`;
  }
  const query = location?.trim() || 'Bay Area, CA';
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(query)}`;
}

/**
 * Safely extracts valid numeric coordinates or returns null
 */
export function getEffectiveCoords(
  item?: { latitude?: number | null; longitude?: number | null } | null
): LatLng | null {
  if (!item) return null;
  const lat = item.latitude;
  const lng = item.longitude;
  if (
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    !isNaN(lat) &&
    !isNaN(lng)
  ) {
    return { lat, lng };
  }
  return null;
}
