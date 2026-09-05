import { ImageResponse } from 'next/og';
import { getRoute } from '@/lib/route-data';

export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const alt = 'GPS-art running route on Rute Unik';

const INK = '#1F2A1E';
const PAPER = '#EDE8DC';
const CHALK = '#F7F5EF';
const TRAIL = '#E8562C';

export default async function Image({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { id } = await params;
  const route = await getRoute(id);

  const name = route?.name ?? 'GPS-art Running Route';
  const city = route?.cities?.name ?? '';
  const distanceKm = route?.distance_m
    ? (Number(route.distance_m) / 1000).toFixed(2)
    : '';
  const thumbnailSvg = route?.thumbnail_svg ?? '';

  return new ImageResponse(
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
      <div style={{ width: 12, height: '100%', background: TRAIL }} />

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
          {thumbnailSvg ? (
            <div
              style={{ width: '100%', height: '100%' }}
              dangerouslySetInnerHTML={{ __html: thumbnailSvg }}
            />
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
          style={{ fontSize: 22, fontWeight: 700, color: INK, opacity: 0.7 }}
        >
          {city || 'Rute Unik'}
        </div>
        <div style={{ fontSize: 56, fontWeight: 900, lineHeight: 1.1 }}>
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
                color: '#fff',
                background: INK,
                padding: '8px 18px',
                borderRadius: 4,
                fontSize: 22,
                fontWeight: 700,
              }}
            >
              {distanceKm} km
            </div>
            <div
              style={{
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
              color: '#fff',
              background: INK,
              padding: '8px 18px',
              borderRadius: 4,
              fontSize: 22,
              fontWeight: 700,
              width: 'fit-content',
            }}
          >
            RUTE UNIK
          </div>
        )}
      </div>
    </div>,
    { ...size }
  );
}
