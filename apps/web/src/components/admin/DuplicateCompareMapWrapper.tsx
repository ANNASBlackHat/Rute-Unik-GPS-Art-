'use client';

import dynamic from 'next/dynamic';
import React from 'react';
import type { DuplicateFlagItem } from './DuplicateCompareMap';

const DuplicateCompareMap = dynamic(
  () => import('./DuplicateCompareMap').then((mod) => mod.DuplicateCompareMap),
  {
    ssr: false,
    loading: () => (
      <div className="aspect-video sm:aspect-[21/9] w-full bg-paper border border-contour-tan rounded-[6px] flex items-center justify-center font-data text-xs text-ink/50">
        Loading duplicate comparison map...
      </div>
    ),
  }
);

export function DuplicateCompareMapWrapper({
  item,
  onResolve,
}: {
  item: DuplicateFlagItem;
  onResolve: (flagId: string) => void;
}) {
  return <DuplicateCompareMap item={item} onResolve={onResolve} />;
}
