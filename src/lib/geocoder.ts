export interface Coordinates {
  lat: number;
  lng: number;
}

// Simple in-memory and LocalStorage cache to prevent hitting OSM Nominatim too frequently
const GEOCODE_CACHE_KEY = 'kids-calendar-geocode-cache';

function getCache(): Record<string, Coordinates> {
  if (typeof window === 'undefined') return {};
  try {
    const cached = localStorage.getItem(GEOCODE_CACHE_KEY);
    return cached ? JSON.parse(cached) : {};
  } catch {
    return {};
  }
}

function setCache(cache: Record<string, Coordinates>) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(GEOCODE_CACHE_KEY, JSON.stringify(cache));
  } catch (err) {
    console.error('Failed to write geocode cache:', err);
  }
}

export async function geocodeLocation(locationText: string): Promise<Coordinates | null> {
  if (!locationText || locationText.trim() === "") return null;

  const normalized = locationText.toLowerCase().trim();
  const cache = getCache();

  // Return cached coordinates if present
  if (cache[normalized]) {
    return cache[normalized];
  }

  // Fallback map checks for quick South Bay cities to avoid network latency entirely
  const quickLookup: Record<string, Coordinates> = {
    'san jose': { lat: 37.3387, lng: -121.8853 },
    'santa clara': { lat: 37.3541, lng: -121.9552 },
    'sunnyvale': { lat: 37.3688, lng: -122.0363 },
    'cupertino': { lat: 37.3230, lng: -122.0322 },
    'milpitas': { lat: 37.4323, lng: -121.8996 },
    'campbell': { lat: 37.2872, lng: -121.9500 },
    'los gatos': { lat: 37.2266, lng: -121.9747 },
    'mountain view': { lat: 37.3861, lng: -122.0839 },
    'palo alto': { lat: 37.4419, lng: -122.1430 },
  };

  for (const city of Object.keys(quickLookup)) {
    if (normalized.includes(city)) {
      cache[normalized] = quickLookup[city];
      setCache(cache);
      return quickLookup[city];
    }
  }

  // Call OpenStreetMap Nominatim geocoder API
  try {
    console.log(`Geocoding via Nominatim: ${locationText}`);
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(locationText + ', CA')}&format=json&limit=1`,
      {
        headers: {
          // Nominatim requires a friendly User-Agent to identify the application
          "User-Agent": "KidsActivityCalendarPrototype/1.0"
        }
      }
    );

    if (!res.ok) return null;

    const data = await res.json();
    if (data && data.length > 0) {
      const coords = {
        lat: parseFloat(data[0].lat),
        lng: parseFloat(data[0].lon)
      };

      // Save to cache
      cache[normalized] = coords;
      setCache(cache);
      return coords;
    }
  } catch (err) {
    console.error(`Geocoding failed for: ${locationText}`, err);
  }

  return null;
}
