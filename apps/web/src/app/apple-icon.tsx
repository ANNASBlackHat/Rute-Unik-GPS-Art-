import { ImageResponse } from 'next/og';

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          background: '#1F2A1E',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <svg
          viewBox="0 0 100 100"
          width="140"
          height="140"
          fill="none"
        >
          {/* Subtle Topographic Contours */}
          <path
            d="M 5,30 Q 30,15 60,35 T 95,25"
            stroke="#2A3A28"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <path
            d="M 5,68 Q 35,50 65,72 T 95,65"
            stroke="#2A3A28"
            strokeWidth="2.5"
            strokeLinecap="round"
          />

          {/* Route Track Glow */}
          <path
            d="M 33,76 L 33,28 C 33,18 49,18 58,25 C 67,32 66,44 56,49 L 33,49 M 52,48 L 68,76"
            stroke="#E8562C"
            strokeWidth="14"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.25"
          />

          {/* Primary Route Track */}
          <path
            d="M 33,76 L 33,28 C 33,18 49,18 58,25 C 67,32 66,44 56,49 L 33,49 M 52,48 L 68,76"
            stroke="#E8562C"
            strokeWidth="8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Center Dash Linework */}
          <path
            d="M 33,76 L 33,28 C 33,18 49,18 58,25 C 67,32 66,44 56,49 L 33,49 M 52,48 L 68,76"
            stroke="#F7F5EF"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="2.5 3"
          />

          {/* START Waypoint */}
          <circle cx="33" cy="76" r="5" fill="#10B981" stroke="#F7F5EF" strokeWidth="1.6" />

          {/* WAIST Waypoint */}
          <circle cx="56" cy="49" r="3" fill="#F7F5EF" stroke="#1F2A1E" strokeWidth="1" />
          <circle cx="56" cy="49" r="1.4" fill="#E8562C" />

          {/* FINISH Waypoint */}
          <circle cx="68" cy="76" r="5" fill="#E8562C" stroke="#F7F5EF" strokeWidth="1.6" />
        </svg>
      </div>
    ),
    { ...size }
  );
}
