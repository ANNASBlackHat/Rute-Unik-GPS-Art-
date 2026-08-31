'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { MAP_STYLES, type MapStyleKey } from '@/lib/map-style';
import { getKilometerMarks } from '@/lib/geo';
import { ensureMaplibreWorker } from '@/lib/maplibre-worker';
import { Maximize2 } from 'lucide-react';

ensureMaplibreWorker();

const STYLE_STORAGE_KEY = 'rute-unik:map-style';

function getInitialStyle(): MapStyleKey {
  if (typeof window === 'undefined') return 'streets';
  try {
    const saved = window.localStorage.getItem(STYLE_STORAGE_KEY) as MapStyleKey | null;
    return saved === 'satellite' ? 'satellite' : 'streets';
  } catch {
    return 'streets';
  }
}

interface RouteMapProps {
  coordinates: [number, number][]; // [longitude, latitude]
  className?: string;
  interactive?: boolean;
  onMapReady?: (map: maplibregl.Map) => void;
  onWaypointClick?: (km: number) => void;
  onExpandFullscreen?: () => void;
}

export default function RouteMap({
  coordinates,
  className = 'w-full h-80 sm:h-96',
  interactive = true,
  onMapReady,
  onWaypointClick,
  onExpandFullscreen,
}: RouteMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const onMapReadyRef = useRef(onMapReady);
  const onWaypointClickRef = useRef(onWaypointClick);
  const [styleKey, setStyleKey] = useState<MapStyleKey>(getInitialStyle);
  const initialStyleRef = useRef<MapStyleKey>(getInitialStyle());

  useEffect(() => {
    onMapReadyRef.current = onMapReady;
  }, [onMapReady]);

  useEffect(() => {
    onWaypointClickRef.current = onWaypointClick;
  }, [onWaypointClick]);

  const ensureRouteLine = useCallback(
    (map: maplibregl.Map) => {
      if (!map.getSource('route-line')) {
        map.addSource('route-line', {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: {},
            geometry: { type: 'LineString', coordinates },
          },
        });
      }
      if (!map.getLayer('route-line-layer')) {
        map.addLayer({
          id: 'route-line-layer',
          type: 'line',
          source: 'route-line',
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: {
            'line-color': '#1F2A1E',
            'line-width': 4.5,
            'line-width-transition': { duration: 0 },
          },
        });
        if (!map.getLayer('route-line-halo')) {
          try {
            map.addLayer(
              {
                id: 'route-line-halo',
                type: 'line',
                source: 'route-line',
                layout: { 'line-join': 'round', 'line-cap': 'round' },
                paint: { 'line-color': '#F7F5EF', 'line-width': 7, 'line-opacity': 0.9 },
              },
              'route-line-layer'
            );
          } catch {
            // layer order may vary; ignore if insertion fails
          }
        }
      }
    },
    [coordinates]
  );

  useEffect(() => {
    if (!mapContainer.current || coordinates.length === 0) return;

    // Calculate bounds
    let minLon = coordinates[0][0];
    let maxLon = coordinates[0][0];
    let minLat = coordinates[0][1];
    let maxLat = coordinates[0][1];

    for (const [lon, lat] of coordinates) {
      if (lon < minLon) minLon = lon;
      if (lon > maxLon) maxLon = lon;
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
    }

    const bounds: [number, number, number, number] = [
      minLon,
      minLat,
      maxLon,
      maxLat,
    ];

    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: MAP_STYLES[initialStyleRef.current],
      center: [(minLon + maxLon) / 2, (minLat + maxLat) / 2],
      zoom: 13,
      interactive: interactive,
      attributionControl: false,
    });

    mapRef.current = map;
    (window as unknown as { _debugMap?: maplibregl.Map })._debugMap = map;

    if (onMapReadyRef.current) {
      onMapReadyRef.current(map);
    }

    // Add navigation controls if interactive
    if (interactive) {
      map.addControl(
        new maplibregl.NavigationControl({ showCompass: false }),
        'top-right'
      );
    }

    // Add Start Marker (Moss #5C6E4F)
    const startCoord = coordinates[0];
    const startEl = document.createElement('div');
    startEl.className = 'route-marker start-marker';
    startEl.innerHTML = `
      <div style="background-color: #5C6E4F; color: #F7F5EF; width: 26px; height: 26px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-family: monospace; font-size: 11px; font-weight: bold; border: 2px solid #F7F5EF; box-shadow: 0 1px 3px rgba(0,0,0,0.3); z-index: 10;" title="Start">
        S
      </div>
    `;
    new maplibregl.Marker({ element: startEl })
      .setLngLat(startCoord)
      .addTo(map);

    // Add Finish Marker (Trail Orange #E8562C)
    const finishCoord = coordinates[coordinates.length - 1];
    const finishEl = document.createElement('div');
    finishEl.className = 'route-marker finish-marker';
    finishEl.innerHTML = `
      <div style="background-color: #E8562C; color: #F7F5EF; width: 26px; height: 26px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-family: monospace; font-size: 11px; font-weight: bold; border: 2px solid #F7F5EF; box-shadow: 0 1px 3px rgba(0,0,0,0.3); z-index: 10;" title="Finish">
        F
      </div>
    `;
    new maplibregl.Marker({ element: finishEl })
      .setLngLat(finishCoord)
      .addTo(map);

    const setupLayers = () => {
      // Fit to route bounds with padding
      map.fitBounds(bounds, {
        padding: { top: 50, bottom: 50, left: 50, right: 50 },
        maxZoom: 16,
        duration: 0,
      });

      ensureRouteLine(map);

      // Per-kilometer distance markers (with click-to-zoom and hover un-nesting for dense clusters)
      getKilometerMarks(coordinates).forEach(({ km, position }) => {
        const kmEl = document.createElement('div');
        kmEl.className = 'route-marker km-marker';
        kmEl.style.cursor = 'pointer';
        kmEl.style.transition = 'transform 0.15s ease, z-index 0.15s ease';
        kmEl.innerHTML = `
          <div style="background-color: #F7F5EF; color: #1F2A1E; min-width: 26px; height: 20px; padding: 0 4px; border-radius: 13px; display: flex; align-items: center; justify-content: center; font-family: monospace; font-size: 10px; font-weight: bold; border: 2px solid #1F2A1E; box-shadow: 0 1px 3px rgba(0,0,0,0.25); select-none;" title="Km ${km} — Click to inspect">${km}</div>
        `;

        // Click to pan/zoom to waypoint
        kmEl.addEventListener('click', (e) => {
          e.stopPropagation();
          map.flyTo({
            center: position,
            zoom: Math.max(map.getZoom(), 15),
            duration: 600,
          });
          if (onWaypointClickRef.current) {
            onWaypointClickRef.current(km);
          }
        });

        // Hover elevates above dense overlapping neighbors
        kmEl.addEventListener('mouseenter', () => {
          kmEl.style.zIndex = '40';
          kmEl.style.transform = 'scale(1.2)';
        });
        kmEl.addEventListener('mouseleave', () => {
          kmEl.style.zIndex = '5';
          kmEl.style.transform = 'scale(1)';
        });

        new maplibregl.Marker({ element: kmEl, anchor: 'center' })
          .setLngLat(position)
          .addTo(map);
      });

      if (onMapReadyRef.current) {
        onMapReadyRef.current(map);
      }

      map.resize();
    };

    if (map.isStyleLoaded()) {
      setupLayers();
    } else {
      map.once('style.load', setupLayers);
    }

    const handleStyleLoad = () => {
      ensureRouteLine(map);
      map.fitBounds(bounds, {
        padding: { top: 50, bottom: 50, left: 50, right: 50 },
        maxZoom: 16,
        duration: 0,
      });
    };
    map.on('style.load', handleStyleLoad);

    // Resize observer
    const resizeObserver = new ResizeObserver(() => {
      map.resize();
    });
    if (mapContainer.current) {
      resizeObserver.observe(mapContainer.current);
    }

    return () => {
      map.off('style.load', handleStyleLoad);
      resizeObserver.disconnect();
      map.remove();
      mapRef.current = null;
    };
  }, [coordinates, interactive, ensureRouteLine]);

  // Handle style switching without remounting
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const current = (map.getStyle() as unknown as { sources?: Record<string, unknown> })?.sources;
    const isSatellite = !!current?.['satellite-tiles'];
    const wantSatellite = styleKey === 'satellite';
    if (isSatellite === wantSatellite) return;
    map.setStyle(MAP_STYLES[styleKey]);
    try {
      window.localStorage.setItem(STYLE_STORAGE_KEY, styleKey);
    } catch {
      // storage may be unavailable
    }
  }, [styleKey]);

  const switchStreets = () => setStyleKey('streets');
  const switchSatellite = () => setStyleKey('satellite');

  return (
    <div className={`relative overflow-hidden rounded-[8px] border border-contour-tan ${className}`}>
      <div
        ref={mapContainer}
        className="w-full h-full"
        data-testid="maplibre-container"
      />

      {/* Style switcher & Fullscreen Expand button */}
      <div className="absolute top-2 left-2 z-10 inline-flex items-center gap-2">
        <div className="inline-flex rounded-[4px] border border-contour-tan bg-chalk p-0.5 shadow-sm">
          <button
            type="button"
            onClick={switchStreets}
            aria-pressed={styleKey === 'streets'}
            className={`min-h-8 px-2.5 py-1 rounded-[3px] text-xs font-data uppercase tracking-wider transition-colors cursor-pointer ${
              styleKey === 'streets'
                ? 'bg-ink text-chalk font-bold'
                : 'text-ink/70 hover:text-ink hover:bg-paper/60'
            }`}
          >
            Streets
          </button>
          <button
            type="button"
            onClick={switchSatellite}
            aria-pressed={styleKey === 'satellite'}
            className={`min-h-8 px-2.5 py-1 rounded-[3px] text-xs font-data uppercase tracking-wider transition-colors cursor-pointer ${
              styleKey === 'satellite'
                ? 'bg-ink text-chalk font-bold'
                : 'text-ink/70 hover:text-ink hover:bg-paper/60'
            }`}
          >
            Satellite
          </button>
        </div>

        {onExpandFullscreen && (
          <button
            type="button"
            id="btn-expand-map-fullscreen"
            data-testid="btn-expand-map-fullscreen"
            onClick={onExpandFullscreen}
            className="min-h-8 px-2.5 py-1 rounded-[4px] border border-contour-tan bg-chalk text-ink text-xs font-data hover:border-ink transition-colors shadow-sm inline-flex items-center gap-1.5 cursor-pointer select-none"
            title="Expand map to fullscreen"
          >
            <Maximize2 size={13} strokeWidth={2} aria-hidden="true" />
            <span className="hidden sm:inline">Expand</span>
          </button>
        )}
      </div>
    </div>
  );
}
