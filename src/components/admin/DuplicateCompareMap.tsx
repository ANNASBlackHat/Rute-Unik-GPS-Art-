'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { MAP_STYLE } from '@/lib/map-style';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useTranslations } from 'next-intl';

export interface DuplicateFlagItem {
  flag_id: string;
  similarity_score: string | number;
  created_at: string;
  route_id: string;
  route_name: string;
  route_status: string;
  route_distance_m: number;
  route_geojson: string;
  route_city: string;
  candidate_id: string;
  candidate_name: string;
  candidate_status: string;
  candidate_distance_m: number;
  candidate_geojson: string;
  candidate_city: string;
}

export function DuplicateCompareMap({
  item,
  onResolve,
}: {
  item: DuplicateFlagItem;
  onResolve: (flagId: string) => void;
}) {
  const t = useTranslations('admin');
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<maplibregl.Map | null>(null);
  const [resolving, setResolving] = useState(false);

  useEffect(() => {
    if (!mapContainer.current) return;

    const route1 = JSON.parse(item.route_geojson);
    const route2 = JSON.parse(item.candidate_geojson);

    // Calculate combined bounds
    const bounds = new maplibregl.LngLatBounds();
    (route1.coordinates || []).forEach((coord: [number, number]) =>
      bounds.extend(coord)
    );
    (route2.coordinates || []).forEach((coord: [number, number]) =>
      bounds.extend(coord)
    );

    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: MAP_STYLE,
      bounds: bounds.isEmpty() ? undefined : bounds,
      fitBoundsOptions: { padding: 40 },
      interactive: true,
      attributionControl: false,
    });

    mapInstance.current = map;

    map.on('load', () => {
      // Existing Route Layer (Ink #1F2A1E)
      map.addSource('candidate-match', {
        type: 'geojson',
        data: route2,
      });

      map.addLayer({
        id: 'candidate-match-line',
        type: 'line',
        source: 'candidate-match',
        layout: {
          'line-join': 'round',
          'line-cap': 'round',
        },
        paint: {
          'line-color': '#1F2A1E',
          'line-width': 4,
          'line-opacity': 0.8,
        },
      });

      // New Submission Route Layer (Trail Orange #E8562C)
      map.addSource('new-route', {
        type: 'geojson',
        data: route1,
      });

      map.addLayer({
        id: 'new-route-line',
        type: 'line',
        source: 'new-route',
        layout: {
          'line-join': 'round',
          'line-cap': 'round',
        },
        paint: {
          'line-color': '#E8562C',
          'line-width': 4,
          'line-dasharray': [2, 1],
        },
      });
    });

    return () => {
      map.remove();
    };
  }, [item]);

  const handleDismiss = async () => {
    setResolving(true);
    try {
      const res = await fetch(`/api/admin/duplicates/${item.flag_id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        onResolve(item.flag_id);
      }
    } finally {
      setResolving(false);
    }
  };

  const similarityMeters = Math.round(Number(item.similarity_score) * 10) / 10;

  return (
    <Card className="p-5 space-y-4">
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-contour-tan pb-3">
        <div>
          <span className="font-data text-[10px] text-ink/60 uppercase tracking-wider block">
            {t('comparisonReview')} · {item.route_city}
          </span>
          <div className="flex items-center gap-2 mt-1">
            <span className="font-display text-base text-ink uppercase">
              {item.route_name}
            </span>
            <span className="text-ink/40 font-data text-xs">vs</span>
            <span className="font-display text-base text-ink/70 uppercase">
              {item.candidate_name}
            </span>
          </div>
        </div>

        <div className="text-right">
          <span className="font-data text-[10px] text-ink/60 uppercase block">
            {t('similarityScore')}
          </span>
          <span
            data-testid="similarity-score-readout"
            className="font-data text-sm font-bold text-trail-orange"
          >
            {similarityMeters} m ({t('frechetDistance')})
          </span>
        </div>
      </div>

      {/* Map */}
      <div className="relative aspect-video sm:aspect-[21/9] w-full rounded-[6px] border border-contour-tan overflow-hidden">
        <div ref={mapContainer} className="w-full h-full" />

        {/* Floating Legend */}
        <div className="absolute bottom-3 left-3 bg-chalk/95 backdrop-blur-sm border border-contour-tan rounded-[4px] p-2.5 space-y-1.5 font-data text-[11px] shadow-sm">
          <div className="flex items-center gap-2">
            <span className="w-4 h-1 bg-trail-orange inline-block rounded-full" />
            <span className="text-ink font-semibold">
              {t('newSubmission')}: {item.route_name}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-4 h-1 bg-ink inline-block rounded-full" />
            <span className="text-ink/80">
              {t('existingMatch')}: {item.candidate_name}
            </span>
          </div>
        </div>
      </div>

      {/* Action Toolbar */}
      <div className="flex items-center justify-between pt-2">
        <span className="font-data text-[11px] text-ink/60">
          {item.route_distance_m}m vs {item.candidate_distance_m}m
        </span>

        <Button
          id={`btn-resolve-flag-${item.flag_id}`}
          variant="secondary"
          disabled={resolving}
          onClick={handleDismiss}
        >
          {resolving ? t('resolving') : t('resolveFlagBtn')}
        </Button>
      </div>
    </Card>
  );
}
