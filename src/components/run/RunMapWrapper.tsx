'use client';

import dynamic from 'next/dynamic';
import React, { ComponentProps } from 'react';
import type RunMap from './RunMap';

const RunMapComponent = dynamic(() => import('./RunMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full min-h-[400px] rounded-[8px] border border-contour-tan bg-chalk flex items-center justify-center animate-pulse">
      <span className="font-data text-xs text-ink/50 uppercase tracking-wider">
        Loading GPS Map...
      </span>
    </div>
  ),
});

export function RunMapWrapper(props: ComponentProps<typeof RunMap>) {
  return <RunMapComponent {...props} />;
}
