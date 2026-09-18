import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q');
  const lat = searchParams.get('lat');
  const lng = searchParams.get('lng');

  // Case 1: Reverse geocoding (lat + lng -> address label)
  if (lat && lng) {
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lng)}&format=json&accept-language=en`;
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'SideDoor-Scout/1.0 (contact@sidedoor.app)',
        },
        next: { revalidate: 3600 },
      });

      if (res.ok) {
        const data = await res.json();
        const addr = data.address || {};
        const neighborhood = addr.neighbourhood || addr.suburb || addr.quarter || addr.district;
        const city = addr.city || addr.town || addr.village || addr.municipality || addr.county;
        const state = addr.state || addr.region;
        const country = addr.country;

        let label = '';
        if (neighborhood && city) {
          label = `${neighborhood}, ${city}`;
        } else if (city && state) {
          label = `${city}, ${state}`;
        } else if (city) {
          label = `${city}, ${country}`;
        } else if (data.name) {
          label = data.name;
        } else {
          label = `${Number(lat).toFixed(3)}°N, ${Number(lng).toFixed(3)}°E`;
        }

        return NextResponse.json({
          label,
          fullAddress: data.display_name,
          coordinates: { lat: Number(lat), lng: Number(lng) },
        });
      }
    } catch (err) {
      console.error('Reverse geocode error:', err);
    }

    return NextResponse.json({
      label: `${Number(lat).toFixed(3)}°N, ${Number(lng).toFixed(3)}°E`,
      coordinates: { lat: Number(lat), lng: Number(lng) },
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
