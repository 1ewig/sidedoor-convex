import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q');
  const lat = searchParams.get('lat');
  const lng = searchParams.get('lng');

  // Case 1: Reverse geocoding (lat + lng -> address label)
  if (lat && lng) {
    const numLat = Number(lat);
    const numLng = Number(lng);

    if (isNaN(numLat) || isNaN(numLng)) {
      return NextResponse.json({ error: 'Invalid coordinates' }, { status: 400 });
    }

    // Normalize coordinates to 4 decimal places (~11 meters precision)
    // This dramatically improves Next.js fetch cache hits and prevents duplicate Nominatim requests
    const normLat = numLat.toFixed(4);
    const normLng = numLng.toFixed(4);

    try {
      const url = `https://nominatim.openstreetmap.org/reverse?lat=${encodeURIComponent(normLat)}&lon=${encodeURIComponent(normLng)}&format=json&accept-language=en`;
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'SideDoor-Scout/1.0 (contact@sidedoor.app)',
        },
        next: { revalidate: 3600 },
      });

      if (res.ok) {
        const data = await res.json();
        const addr = data.address || {};
        const city = addr.city || addr.town || addr.municipality || addr.county;
        const state = addr.state || addr.region || addr.country;
        const neighborhood = addr.neighbourhood || addr.suburb || addr.quarter;

        let label = '';
        if (city && state) {
          label = `${city}, ${state}`;
        } else if (city) {
          label = city;
        } else if (neighborhood && state) {
          label = `${neighborhood}, ${state}`;
        } else if (data.name) {
          label = data.name;
        } else {
          label = `${numLat.toFixed(3)}°N, ${numLng.toFixed(3)}°E`;
        }

        return NextResponse.json({
          label,
          fullAddress: data.display_name,
          coordinates: { lat: numLat, lng: numLng },
        });
      }
    } catch (err) {
      console.error('Reverse geocode error:', err);
    }

    return NextResponse.json({
      label: `${numLat.toFixed(3)}°N, ${numLng.toFixed(3)}°E`,
      coordinates: { lat: numLat, lng: numLng },
    });
  }

  // Case 2: Forward geocoding query search (q -> matching suggestions)
  if (q && q.trim().length >= 2) {
    try {
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q.trim())}&format=json&limit=5&accept-language=en`;
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'SideDoor-Scout/1.0 (contact@sidedoor.app)',
        },
        next: { revalidate: 3600 },
      });

      if (res.ok) {
        const data = await res.json();
        const results = data.map((item: { display_name: string; name: string; lat: string; lon: string }) => {
          // Clean up label: take first 2-3 parts of display_name
          const parts = item.display_name.split(',').map((p) => p.trim());
          const shortLabel = parts.slice(0, 2).join(', ');
          return {
            label: shortLabel || item.name,
            fullAddress: item.display_name,
            coordinates: {
              lat: Number(item.lat),
              lng: Number(item.lon),
            },
          };
        });

        return NextResponse.json({ results });
      }
    } catch (err) {
      console.error('Geocode search error:', err);
    }
  }

  return NextResponse.json({ results: [] });
}
