'use client';

import React, { useState } from 'react';
import { DuplicateCompareMapWrapper } from './DuplicateCompareMapWrapper';
import type { DuplicateFlagItem } from './DuplicateCompareMap';
import { Card } from '@/components/ui/Card';

export function DuplicatesList({
  initialDuplicates,
}: {
  initialDuplicates: DuplicateFlagItem[];
}) {
  const [duplicates, setDuplicates] = useState<DuplicateFlagItem[]>(initialDuplicates);

  const handleResolve = (flagId: string) => {
    setDuplicates((prev) => prev.filter((d) => d.flag_id !== flagId));
  };

  if (duplicates.length === 0) {
    return (
      <Card className="p-8 sm:p-12 text-center space-y-3">
        <span className="text-3xl block">✓</span>
        <h2 className="font-display text-base uppercase text-ink">
          Tidak Ada Indikasi Duplikasi
        </h2>
        <p className="font-body text-xs text-ink/70">
          Semua rute yang dikirimkan memiliki bentuk linework yang unik.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {duplicates.map((item) => (
        <DuplicateCompareMapWrapper
          key={item.flag_id}
          item={item}
          onResolve={handleResolve}
        />
      ))}
    </div>
  );
}
