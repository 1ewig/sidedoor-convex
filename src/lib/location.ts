import type { Coordinates } from '@/types';

export interface LocationSuggestion {
  label: string;
  fullAddress: string;
  coordinates: Coordinates;
}

export interface ResolvedLocation {
  label: string;
  coordinates: Coordinates;
  countryCode?: string;
}

interface NominatimResult {
  display_name: string;
  name?: string;
  lat: string;
  lon: string;
  address?: Record<string, string | undefined>;
}

export async function searchLocationSuggestions(query: string): Promise<LocationSuggestion[]> {
  if (query.trim().length < 2) return [];

  try {
    const url = new URL('https://nominatim.openstreetmap.org/search');
    url.search = new URLSearchParams({
      q: query.trim(),
      format: 'json',
      limit: '5',
      'accept-language': 'en',
    }).toString();
    const response = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!response.ok) return [];

    const results = (await response.json()) as NominatimResult[];
    return results.map((item) => {
      const parts = item.display_name.split(',').map((part) => part.trim());
      return {
        label: parts.slice(0, 2).join(', ') || item.name || item.display_name,
        fullAddress: item.display_name,
        coordinates: { lat: Number(item.lat), lng: Number(item.lon) },
      };
    });
  } catch {
    return [];
  }
}

export async function reverseGeocodeLocation(coordinates: Coordinates): Promise<ResolvedLocation | null> {
  try {
    const url = new URL('https://nominatim.openstreetmap.org/reverse');
    url.search = new URLSearchParams({
      lat: coordinates.lat.toFixed(4),
      lon: coordinates.lng.toFixed(4),
      format: 'json',
      'accept-language': 'en',
    }).toString();
    const response = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!response.ok) return null;

    const result = (await response.json()) as NominatimResult;
    const address = result.address || {};
    const city = address.city || address.town || address.municipality || address.county;
    const state = address.state || address.region || address.country;
    const neighborhood = address.neighbourhood || address.suburb || address.quarter;
    const label = city && state
      ? `${city}, ${state}`
      : city || (neighborhood && state ? `${neighborhood}, ${state}` : result.display_name);

    return {
      label,
      coordinates,
      countryCode: address.country_code?.toUpperCase(),
    };
  } catch {
    return null;
  }
}

export async function locateByIp(): Promise<ResolvedLocation | null> {
  try {
    const response = await fetch('https://ipwho.is/', { cache: 'no-store' });
    if (response.ok) {
      const data = (await response.json()) as {
        success?: boolean;
        city?: string;
        region?: string;
        country?: string;
        country_code?: string;
        latitude?: number;
        longitude?: number;
      };
      if (data.success !== false && data.latitude && data.longitude) {
        const label = data.city && data.region
          ? `${data.city}, ${data.region}`
          : data.city || data.region || data.country || 'Detected location';
        return {
          label,
          coordinates: { lat: Number(data.latitude), lng: Number(data.longitude) },
          countryCode: data.country_code?.toUpperCase(),
        };
      }
    }
  } catch {
    // Fall through to the second provider.
  }

  try {
    const response = await fetch('https://freeipapi.com/api/json', { cache: 'no-store' });
    if (!response.ok) return null;
    const data = (await response.json()) as {
      cityName?: string;
      regionName?: string;
      countryName?: string;
      countryCode?: string;
      latitude?: number;
      longitude?: number;
    };
    if (!data.latitude || !data.longitude) return null;
    return {
      label: data.cityName && data.regionName
        ? `${data.cityName}, ${data.regionName}`
        : data.cityName || data.countryName || 'Detected location',
      coordinates: { lat: Number(data.latitude), lng: Number(data.longitude) },
      countryCode: data.countryCode?.toUpperCase(),
    };
  } catch {
    return null;
  }
}
