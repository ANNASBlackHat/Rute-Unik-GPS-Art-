import React from 'react';

interface ElevationSparklineProps {
  points?: number[];
  className?: string;
}

export function ElevationSparkline({
  points,
  className = '',
}: ElevationSparklineProps) {
  if (!points || points.length < 2) {
    return null;
  }

  const minEle = Math.min(...points);
  const maxEle = Math.max(...points);
  const span = maxEle - minEle || 5;

  const width = 100;
  const height = 20;
  const padding = 2;
  const usableHeight = height - padding * 2;

  // Build SVG path
  const coords = points.map((val, idx) => {
    const x = (idx / (points.length - 1)) * width;
    const norm = (val - minEle) / span;
    const y = height - padding - norm * usableHeight;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  const pathD = `M ${coords.join(' L ')}`;
  const areaD = `${pathD} L ${width},${height} L 0,${height} Z`;

  return (
    <div
      className={`w-full flex items-center gap-1.5 px-2 py-1 bg-paper/40 rounded-[4px] border border-contour-tan/40 ${className}`}
      title={`Elevation profile: ${Math.round(minEle)}m to ${Math.round(maxEle)}m`}
      aria-hidden="true"
    >
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-4 overflow-visible"
        preserveAspectRatio="none"
      >
        <path d={areaD} fill="#5C6E4F" fillOpacity="0.12" />
        <path
          d={pathD}
          fill="none"
          stroke="#5C6E4F"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}
