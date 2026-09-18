import { NextRequest, NextResponse } from 'next/server';

interface LocateResponse {
  label: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  city?: string;
  region?: string;
  country?: string;
  source: 'ip' | 'default';
}

export async function GET(req: NextRequest) {
  try {
    // 1. Identify client IP from headers
    const forwarded = req.headers.get('x-forwarded-for');
    const realIp = req.headers.get('x-real-ip');
    const cfIp = req.headers.get('cf-connecting-ip');
    
    let clientIp = cfIp || (forwarded ? forwarded.split(',')[0].trim() : realIp) || '';

    // Check if IP is localhost or private (RFC 1918: 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16)
    const isPrivate172 = /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(clientIp);
    const isLocal = !clientIp || 
      clientIp === '::1' || 
      clientIp.startsWith('127.') || 
      clientIp.startsWith('192.168.') || 
      clientIp.startsWith('10.') || 
      isPrivate172;

    // If local, query without IP to let ipwho.is detect the public egress IP
    const url = isLocal ? 'https://ipwho.is/' : `https://ipwho.is/${clientIp}`;

    const res = await fetch(url, {
      headers: {
        'User-Agent': 'SideDoor-Scout/1.0',
      },
      next: { revalidate: 300 }, // Cache for 5 mins
    });

    if (res.ok) {
      const data = await res.json();
      if (data.success !== false && data.latitude && data.longitude) {
        const city = data.city || '';
        const region = data.region || '';
        const country = data.country || '';
        
        let label = city;
        if (city && region) {
          label = `${city}, ${region}`;
        } else if (!city && region) {
          label = `${region}, ${country}`;
        } else if (!city && !region) {
          label = country || 'Unknown Location';
        }

        const response: LocateResponse = {
          label,
          coordinates: {
            lat: Number(data.latitude),
            lng: Number(data.longitude),
          },
          city,
          region,
          country,
          source: 'ip',
        };

        return NextResponse.json(response);
      }
    }

    // Fallback to freeipapi.com
    const fallbackUrl = isLocal ? 'https://freeipapi.com/api/json' : `https://freeipapi.com/api/json/${clientIp}`;
    const res2 = await fetch(fallbackUrl, {
      headers: {
        'User-Agent': 'SideDoor-Scout/1.0',
      },
      next: { revalidate: 300 },
    });

    if (res2.ok) {
      const data2 = await res2.json();
      if (data2.latitude && data2.longitude) {
        const city = data2.cityName || '';
        const region = data2.regionName || '';
        const country = data2.countryName || '';
        const label = city && region ? `${city}, ${region}` : city || country || 'Detected Location';

        return NextResponse.json({
          label,
          coordinates: {
            lat: Number(data2.latitude),
            lng: Number(data2.longitude),
          },
          city,
          region,
          country,
          source: 'ip',
        });
      }
    }
  } catch (error) {
    console.error('Server locate error:', error);
  }

  // Graceful fallback if completely offline or unreachable
  return NextResponse.json(
    {
      label: 'Sialkot, Punjab',
      coordinates: { lat: 32.4927, lng: 74.5313 },
      source: 'default',
    },
    { status: 200 }
  );
}
