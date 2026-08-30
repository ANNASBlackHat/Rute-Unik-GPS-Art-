'use client';

import dynamic from 'next/dynamic';
import React from 'react';

const RouteMap = dynamic(() => import('./RouteMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-80 sm:h-96 rounded-[8px] border border-contour-tan bg-chalk flex items-center justify-center animate-pulse">
      <span className="font-data text-xs text-ink/50 uppercase tracking-wider">
        Loading Map...
      </span>
    </div>
  ),
});

interface RouteMapWrapperProps {
  coordinates: [number, number][];
  className?: string;
  interactive?: boolean;
}

export function RouteMapWrapper(props: RouteMapWrapperProps) {
  return <RouteMap {...props} />;
}
