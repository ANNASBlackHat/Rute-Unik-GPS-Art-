'use client';

import React, { useMemo } from 'react';
import { useTranslations } from 'next-intl';

interface ElevationChartProps {
  gpxRaw?: string;
  elevationPoints?: number[];
  distanceMeters?: number;
  className?: string;
}

export function ElevationChart({
  gpxRaw,
  elevationPoints,
  distanceMeters = 5000,
  className = '',
}: ElevationChartProps) {
  const t = useTranslations('routeDetail');

  const points = useMemo(() => {
    if (elevationPoints && elevationPoints.length > 0) {
      return elevationPoints;
    }
    if (gpxRaw) {
      const matches = Array.from(
        gpxRaw.matchAll(/<ele>([\d.-]+)<\/ele>/g)
      ) as RegExpExecArray[];
      const parsed = matches
        .map((m) => parseFloat(m[1]))
        .filter((n) => !isNaN(n));
      if (parsed.length > 0) return parsed;
    }
    return [];
  }, [gpxRaw, elevationPoints]);

  if (points.length === 0) {
    return (
      <div className="p-4 border border-contour-tan rounded-[8px] bg-chalk text-center text-xs font-data text-ink/50">
        {t('noElevationData')}
      </div>
    );
  }

  const minEle = Math.min(...points);
  const maxEle = Math.max(...points);
  const eleSpan = maxEle - minEle || 10; // avoid div by 0

  const width = 500;
  const height = 120;
  const paddingBottom = 20;
  const paddingTop = 15;
  const usableHeight = height - paddingBottom - paddingTop;

  // Generate SVG path coordinates
  const svgCoords = points.map((ele, idx) => {
    const x = (idx / (points.length - 1)) * width;
    const normalizedY = (ele - minEle) / eleSpan;
    const y = height - paddingBottom - normalizedY * usableHeight;
    return [x, y];
  });

  const linePath = svgCoords.reduce(
    (acc, [x, y], idx) => (idx === 0 ? `M ${x},${y}` : `${acc} L ${x},${y}`),
    ''
  );

  const areaPath = `${linePath} L ${width},${height - paddingBottom} L 0,${height - paddingBottom} Z`;

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex items-center justify-between font-data text-[11px] text-ink/70">
        <span className="font-bold uppercase tracking-wider">
          {t('elevationProfile')}
        </span>
        <span>
          {Math.round(minEle)}m — {Math.round(maxEle)}m ({Math.round(eleSpan)}m Δ)
        </span>
      </div>

      <div className="bg-paper/40 p-3 rounded-[8px] border border-contour-tan">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-24 overflow-visible"
        >
          {/* Grid lines */}
          <line
            x1="0"
            y1={paddingTop}
            x2={width}
            y2={paddingTop}
            stroke="#C9BFA6"
            strokeWidth="0.8"
            strokeDasharray="3 3"
          />
          <line
            x1="0"
            y1={height - paddingBottom}
            x2={width}
            y2={height - paddingBottom}
            stroke="#C9BFA6"
            strokeWidth="1"
          />

          {/* Area fill */}
          <path d={areaPath} fill="#5C6E4F" fillOpacity="0.15" />

          {/* Elevation line */}
          <path
            d={linePath}
            fill="none"
            stroke="#5C6E4F"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Start and end dots */}
          {svgCoords.length > 0 && (
            <>
              <circle
                cx={svgCoords[0][0]}
                cy={svgCoords[0][1]}
                r="3.5"
                fill="#5C6E4F"
              />
              <circle
                cx={svgCoords[svgCoords.length - 1][0]}
                cy={svgCoords[svgCoords.length - 1][1]}
                r="3.5"
                fill="#E8562C"
              />
            </>
          )}
        </svg>

        {/* Distance labels */}
        <div className="flex justify-between text-[10px] font-data text-ink/50 pt-1 border-t border-contour-tan/40">
          <span>0.0 km</span>
          <span>{(distanceMeters / 1000).toFixed(1)} km</span>
        </div>
      </div>
    </div>
  );
}
