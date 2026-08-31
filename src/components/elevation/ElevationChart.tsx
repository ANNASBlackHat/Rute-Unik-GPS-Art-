'use client';

import React, { useMemo, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { Mountain } from 'lucide-react';

interface ElevationChartProps {
  gpxRaw?: string;
  elevationPoints?: number[];
  distanceMeters?: number;
  progress?: number; // 0 to 1
  onScrub?: (progress: number) => void;
  activeWaypointKm?: number | null;
  className?: string;
}

export function ElevationChart({
  gpxRaw,
  elevationPoints,
  distanceMeters = 5000,
  progress,
  onScrub,
  activeWaypointKm,
  className = '',
}: ElevationChartProps) {
  const t = useTranslations('routeDetail');
  const svgRef = useRef<SVGSVGElement | null>(null);

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
      <div className="p-6 border border-contour-tan rounded-[8px] bg-chalk text-center space-y-2">
        <div className="w-8 h-8 mx-auto rounded-[4px] bg-paper border border-contour-tan flex items-center justify-center">
          <Mountain size={16} strokeWidth={1.5} className="text-ink/70" aria-hidden="true" />
        </div>
        <p className="text-xs font-data text-ink font-semibold">{t('noElevationData')}</p>
        <p className="text-xs font-body text-ink/70">This GPX has no elevation tags — distance and pace are still available.</p>
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

  // Dynamic calculations for GhostRunner progress
  const hasProgress = typeof progress === 'number' && !isNaN(progress);
  const clampedProgress = hasProgress ? Math.max(0, Math.min(1, progress)) : 0;
  const currentIdx = Math.min(
    points.length - 1,
    Math.round(clampedProgress * (points.length - 1))
  );
  const currentEle = points[currentIdx];
  const currentKm = ((clampedProgress * distanceMeters) / 1000).toFixed(1);
  const needleX = clampedProgress * width;
  const needleY =
    height - paddingBottom - ((currentEle - minEle) / eleSpan) * usableHeight;

  // Active waypoint needle X position
  const waypointNeedleX =
    activeWaypointKm !== undefined && activeWaypointKm !== null
      ? ((activeWaypointKm * 1000) / distanceMeters) * width
      : null;

  // Pointer scrubbing handler
  const handlePointerAction = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!onScrub) return;
    const rect = e.currentTarget.getBoundingClientRect();
    if (rect.width <= 0) return;
    const clickX = e.clientX - rect.left;
    const tVal = Math.max(0, Math.min(1, clickX / rect.width));
    onScrub(tVal);
  };

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex flex-wrap items-center justify-between gap-2 font-data text-xs text-ink">
        <div className="flex items-center gap-2">
          <span className="font-bold uppercase tracking-wider">
            {t('elevationProfile')}
          </span>
          {/* Live telemetry readout */}
          {hasProgress && clampedProgress > 0 && (
            <span
              id="elevation-live-readout"
              data-testid="elevation-live-readout"
              className="px-2 py-0.5 rounded-[3px] bg-trail-orange text-chalk text-[11px] font-bold uppercase tracking-wider shadow-xs"
            >
              Km {currentKm} · {Math.round(currentEle)}m
            </span>
          )}
        </div>

        <span
          className="text-ink/70"
          aria-label={`Elevation ${Math.round(minEle)} to ${Math.round(maxEle)} meters, gain ${Math.round(eleSpan)}`}
        >
          {Math.round(minEle)}m — {Math.round(maxEle)}m ({Math.round(eleSpan)}m Δ)
        </span>
      </div>

      <div
        className={`bg-paper/40 p-3 rounded-[8px] border border-contour-tan select-none ${
          onScrub ? 'cursor-ew-resize' : ''
        }`}
      >
        <svg
          ref={svgRef}
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-24 overflow-visible touch-none"
          role="img"
          aria-label={`Elevation profile from ${Math.round(minEle)} to ${Math.round(maxEle)} meters over ${(distanceMeters / 1000).toFixed(1)} km`}
          tabIndex={0}
          onPointerDown={(e) => {
            handlePointerAction(e);
            (e.target as Element).setPointerCapture(e.pointerId);
          }}
          onPointerMove={(e) => {
            if (e.buttons === 1) handlePointerAction(e);
          }}
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

          {/* Active Waypoint Highlight Needle */}
          {waypointNeedleX !== null && (
            <>
              <line
                x1={waypointNeedleX}
                y1={paddingTop}
                x2={waypointNeedleX}
                y2={height - paddingBottom}
                stroke="#1F2A1E"
                strokeWidth="1.5"
                strokeDasharray="3 3"
              />
              <text
                x={waypointNeedleX}
                y={paddingTop - 3}
                textAnchor="middle"
                className="font-data text-[9px] fill-ink font-bold"
              >
                {activeWaypointKm}k
              </text>
            </>
          )}

          {/* GhostRunner Synchronized Needle & Moving Dot */}
          {hasProgress && (
            <g id="elevation-scrub-indicator">
              <line
                x1={needleX}
                y1={paddingTop}
                x2={needleX}
                y2={height - paddingBottom}
                stroke="#E8562C"
                strokeWidth="1.5"
                strokeDasharray="2 2"
              />
              <circle
                cx={needleX}
                cy={needleY}
                r="5"
                fill="#E8562C"
                stroke="#F7F5EF"
                strokeWidth="2"
                className="transition-transform duration-75"
              />
            </g>
          )}
        </svg>

        {/* Distance labels with scrubbing hint */}
        <div className="flex justify-between items-center text-xs font-data text-ink/70 pt-1 border-t border-contour-tan/40">
          <span>0.0 km</span>
          {onScrub && (
            <span className="text-[10px] text-ink/50 uppercase tracking-wider">
              Scrub chart to seek
            </span>
          )}
          <span>{(distanceMeters / 1000).toFixed(1)} km</span>
        </div>
      </div>
    </div>
  );
}
