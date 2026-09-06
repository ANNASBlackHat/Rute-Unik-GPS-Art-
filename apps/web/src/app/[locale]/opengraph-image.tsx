import { ImageResponse } from 'next/og';

export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const alt = 'Rute Unik — GPS-Art Running Routes';

const INK = '#1F2A1E';
const PAPER = '#EDE8DC';
const CHALK = '#F7F5EF';
const TRAIL = '#E8562C';

export default function Image() {
  return new ImageResponse(
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
        gap: 24,
        fontFamily: 'sans-serif',
        padding: 64,
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'row',
          gap: 16,
          alignItems: 'center',
        }}
      >
        <div
          style={{
            width: 96,
            height: 96,
            border: '6px solid ' + TRAIL,
            borderRadius: 48,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 64,
            fontWeight: 900,
            color: TRAIL,
          }}
        >
          R
        </div>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
            color: INK,
          }}
        >
          <div style={{ fontSize: 64, fontWeight: 900, letterSpacing: 2 }}>
            RUTE UNIK
          </div>
          <div style={{ fontSize: 24, color: INK, opacity: 0.7 }}>
            GPS-Art Running Routes Directory
          </div>
        </div>
      </div>
      <div
        style={{
          display: 'flex',
          flexDirection: 'row',
          gap: 0,
          alignItems: 'center',
        }}
      >
        <div style={{ width: 200, height: 6, background: TRAIL }} />
        <div style={{ width: 200, height: 6, background: INK }} />
        <div
          style={{
            width: 200,
            height: 6,
            background: CHALK,
            border: '1px solid ' + INK,
          }}
        />
      </div>
      <div
        style={{
          fontSize: 26,
          color: INK,
          opacity: 0.85,
          textAlign: 'center',
          maxWidth: 780,
        }}
      >
        Discover unique running routes where your GPS trace forms shapes,
        animals, and symbols across city streets.
      </div>
    </div>,
    { ...size }
  );
}
