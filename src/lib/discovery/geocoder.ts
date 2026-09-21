import { Coordinates } from '@/types';

// In-memory cache to prevent redundant external geocoding requests
const geocodeCache = new Map<string, Coordinates | null>();

/**
 * Normalizes query string for cache keys
 */
function normalizeKey(str: string): string {
  return str.toLowerCase().replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * Geocodes an event's venue and address into true geographic coordinates.
 * Cascades from most specific (Venue + Address) down to Neighborhood/City level.
 * Employs an in-memory cache and strict timeouts to protect pipeline latency.
 */
export async function geocodeVenueOrAddress(
  venueName?: string,
  address?: string,
  locationHint?: string
): Promise<Coordinates | null> {
  const cleanVenue = venueName?.trim() || '';
  const cleanAddr = address?.trim() || '';
  const cleanLoc = locationHint?.trim() || '';

  // Generate candidate search queries from most specific to broader
  const candidateQueries: string[] = [];

  if (cleanVenue && cleanAddr && cleanVenue.toLowerCase() !== cleanAddr.toLowerCase()) {
    candidateQueries.push(`${cleanVenue}, ${cleanAddr}, ${cleanLoc}`);
    candidateQueries.push(`${cleanVenue}, ${cleanAddr}`);
    candidateQueries.push(`${cleanAddr}, ${cleanLoc}`);
    candidateQueries.push(`${cleanVenue}, ${cleanLoc}`);
    candidateQueries.push(`${cleanAddr}`);
    candidateQueries.push(`${cleanVenue}`);
  } else if (cleanAddr) {
    candidateQueries.push(`${cleanAddr}, ${cleanLoc}`);
    candidateQueries.push(`${cleanAddr}`);
  } else if (cleanVenue) {
    candidateQueries.push(`${cleanVenue}, ${cleanLoc}`);
    candidateQueries.push(`${cleanVenue}`);
  }

  // Filter out empty, generic, or duplicate queries
  const seenQueries = new Set<string>();
  const validQueries = candidateQueries
    .map((q) => q.replace(/,\s*,/g, ',').trim())
    .filter((q) => {
      if (q.length < 4 || seenQueries.has(q)) return false;
      seenQueries.add(q);
      return true;
    });

  for (const q of validQueries) {
    const key = normalizeKey(q);
    if (geocodeCache.has(key)) {
      const cached = geocodeCache.get(key);
      if (cached) return cached;
      continue;
    }

    try {
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=1&accept-language=en`;
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'SideDoor-Scout/1.0 (contact@sidedoor.app)',
        },
        signal: AbortSignal.timeout(2000),
      });

      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          const lat = parseFloat(data[0].lat);
          const lng = parseFloat(data[0].lon);
          if (!isNaN(lat) && !isNaN(lng) && (lat !== 0 || lng !== 0)) {
            const coords: Coordinates = { lat, lng };
            geocodeCache.set(key, coords);
            return coords;
          }
        }
      }
      geocodeCache.set(key, null);
    } catch {
      geocodeCache.set(key, null);
    }
  }

  // Fallback: Geocode the location hint (e.g. "Brooklyn, New York" or "Berlin, Germany")
  // Anchors the event to the correct city/locality rather than the scout user's coordinates
  if (cleanLoc && cleanLoc.length >= 3) {
    const locKey = normalizeKey(cleanLoc);
    if (geocodeCache.has(locKey)) {
      return geocodeCache.get(locKey) || null;
    }

    try {
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(cleanLoc)}&format=json&limit=1&accept-language=en`;
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'SideDoor-Scout/1.0 (contact@sidedoor.app)',
        },
        signal: AbortSignal.timeout(2000),
      });

      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          const lat = parseFloat(data[0].lat);
          const lng = parseFloat(data[0].lon);
          if (!isNaN(lat) && !isNaN(lng) && (lat !== 0 || lng !== 0)) {
            const coords: Coordinates = { lat, lng };
            geocodeCache.set(locKey, coords);
            return coords;
          }
        }
      }
      geocodeCache.set(locKey, null);
    } catch {
      geocodeCache.set(locKey, null);
    }
  }

  return null;
}
