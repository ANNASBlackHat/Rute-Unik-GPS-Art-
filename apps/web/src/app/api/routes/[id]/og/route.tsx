import { ImageResponse } from 'next/og';
import { supabase } from '@/lib/supabase';
import { NextRequest } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const INK = '#1F2A1E';
const PAPER = '#EDE8DC';
const CHALK = '#F7F5EF';
const TRAIL = '#E8562C';

interface RouteOgData {
  name?: string;
  distance_m?: number | null;
  thumbnail_svg?: string | null;
  cities?: { name?: string } | { name?: string }[] | null;
}

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    let route: RouteOgData | null = null;

    if (id) {
      try {
        const { data } = await supabase
          .from('routes')
          .select('name, distance_m, thumbnail_svg, cities(name)')
          .eq('id', id)
          .single();
        if (data) route = data as unknown as RouteOgData;
      } catch {
        // ignore db error, use fallback
      }
    }

    const name = route?.name || 'GPS-art Running Route';
    const cityData = route?.cities;
    const city = Array.isArray(cityData)
      ? cityData[0]?.name || ''
      : cityData?.name || '';
    const distanceKm = route?.distance_m
      ? (Number(route.distance_m) / 1000).toFixed(2)
      : '';
    const thumbnailSvg = route?.thumbnail_svg || '';
    const pointsMatch = thumbnailSvg.match(/points="([^"]+)"/);
    const pointsStr = pointsMatch ? pointsMatch[1] : '';

    return new ImageResponse(
      (
        <div
          style={{
            width: '100%',
            height: '100%',
            background: PAPER,
            color: INK,
            display: 'flex',
            flexDirection: 'row',
            fontFamily: 'sans-serif',
          }}
        >
          {/* Left accent rail */}
          <div
            style={{
              display: 'flex',
              width: 12,
              height: '100%',
              background: TRAIL,
            }}
          />

          {/* Shape preview */}
          <div
            style={{
              width: 520,
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 64,
            }}
          >
            <div
              style={{
                width: 430,
                height: 430,
                background: CHALK,
                border: '3px solid ' + INK,
                borderRadius: 12,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 24,
              }}
            >
              {pointsStr ? (
                <svg
                  viewBox="0 0 200 200"
                  width={380}
                  height={380}
                  style={{ width: 380, height: 380 }}
                >
                  <polyline
                    points={pointsStr}
                    fill="none"
                    stroke={TRAIL}
                    strokeWidth={5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              ) : null}
            </div>
          </div>

          {/* Text panel */}
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              paddingRight: 64,
              gap: 12,
            }}
          >
            <div
              style={{
                display: 'flex',
                fontSize: 22,
                fontWeight: 700,
                color: INK,
                opacity: 0.7,
              }}
            >
              {city || 'Rute Unik'}
            </div>
            <div
              style={{
                display: 'flex',
                fontSize: 56,
                fontWeight: 900,
                lineHeight: 1.1,
              }}
            >
              {name}
            </div>
            {distanceKm ? (
              <div
                style={{
                  marginTop: 8,
                  display: 'flex',
                  flexDirection: 'row',
                  gap: 16,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    color: '#fff',
                    background: INK,
                    padding: '8px 18px',
                    borderRadius: 4,
                    fontSize: 22,
                    fontWeight: 700,
                  }}
                >
                  {`${distanceKm} km`}
                </div>
                <div
                  style={{
                    display: 'flex',
                    color: INK,
                    border: '2px solid ' + INK,
                    padding: '8px 18px',
                    borderRadius: 4,
                    fontSize: 22,
                    fontWeight: 700,
                  }}
                >
                  RUTE UNIK
                </div>
              </div>
            ) : (
              <div
                style={{
                  display: 'flex',
                  color: '#fff',
                  background: INK,
                  padding: '8px 18px',
                  borderRadius: 4,
                  fontSize: 22,
                  fontWeight: 700,
                  alignSelf: 'flex-start',
                }}
              >
                RUTE UNIK
              </div>
            )}
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
        headers: {
          'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
        },
      }
    );
  } catch {
    return new ImageResponse(
      (
        <div
          style={{
            width: '100%',
            height: '100%',
            background: PAPER,
            color: INK,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'sans-serif',
          }}
        >
          <div style={{ display: 'flex', fontSize: 56, fontWeight: 900 }}>
            RUTE UNIK
          </div>
          <div
            style={{
              display: 'flex',
              fontSize: 24,
              marginTop: 12,
              color: TRAIL,
            }}
          >
            GPS-Art Running Routes
          </div>
        </div>
      ),
      { width: 1200, height: 630 }
    );
  }
}
