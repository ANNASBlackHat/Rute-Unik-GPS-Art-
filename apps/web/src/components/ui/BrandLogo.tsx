import React from 'react';

interface BrandLogoProps {
  size?: number;
  className?: string;
  showText?: boolean;
}

/**
 * Official Brand Logo — Concept A: Continuous GPS Track "R".
 * A single continuous GPS running polyline path forming the letter "R"
 * with green Start waypoint and trail-orange Finish waypoint.
 */
export function BrandLogo({
  size = 28,
  className = '',
  showText = false,
}: BrandLogoProps) {
  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <svg
        viewBox="0 0 100 100"
        width={size}
        height={size}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0 overflow-visible"
        aria-hidden="true"
      >
        {/* Rounded Trail-Marker Container */}
        <rect width="100" height="100" rx="22" fill="#1F2A1E" />
        <rect
          x="2.5"
          y="2.5"
          width="95"
          height="95"
          rx="19.5"
          stroke="#3A4D38"
          strokeWidth="2"
          opacity="0.5"
        />

        {/* Subtle Topographic Contour Backing */}
        <path
          d="M 5,30 Q 30,15 60,35 T 95,25"
          stroke="#2A3A28"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <path
          d="M 5,68 Q 35,50 65,72 T 95,65"
          stroke="#2A3A28"
          strokeWidth="1.8"
          strokeLinecap="round"
        />

        {/* Outer Glow behind the track */}
        <path
          d="M 33,76 L 33,28 C 33,18 49,18 58,25 C 67,32 66,44 56,49 L 33,49 M 52,48 L 68,76"
          stroke="#E8562C"
          strokeWidth="12"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.3"
        />

        {/* Primary Continuous Route Track: Trail Orange */}
        <path
          d="M 33,76 L 33,28 C 33,18 49,18 58,25 C 67,32 66,44 56,49 L 33,49 M 52,48 L 68,76"
          stroke="#E8562C"
          strokeWidth="7.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Center Dash Linework */}
        <path
          d="M 33,76 L 33,28 C 33,18 49,18 58,25 C 67,32 66,44 56,49 L 33,49 M 52,48 L 68,76"
          stroke="#F7F5EF"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray="2.5 3"
          opacity="0.95"
        />

        {/* START Waypoint (Green beacon at bottom-left) */}
        <circle cx="33" cy="76" r="4.8" fill="#10B981" stroke="#F7F5EF" strokeWidth="1.4" />

        {/* WAIST Intersect Waypoint */}
        <circle cx="56" cy="49" r="2.8" fill="#F7F5EF" stroke="#1F2A1E" strokeWidth="0.8" />
        <circle cx="56" cy="49" r="1.2" fill="#E8562C" />

        {/* FINISH Waypoint (Trail Orange beacon at kick leg) */}
        <circle cx="68" cy="76" r="4.8" fill="#E8562C" stroke="#F7F5EF" strokeWidth="1.4" />
      </svg>

      {showText && (
        <span className="font-display text-xl tracking-tight text-ink uppercase">
          RUTE UNIK
        </span>
      )}
    </div>
  );
}
