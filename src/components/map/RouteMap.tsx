'use client';

import React, { useEffect, useRef } from 'react';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { MAP_STYLE } from '@/lib/map-style';
import { getKilometerMarks } from '@/lib/geo';

interface RouteMapProps {
  coordinates: [number, number][]; // [longitude, latitude]
  className?: string;
  interactive?: boolean;
  onMapReady?: (map: maplibregl.Map) => void;
}

export default function RouteMap({
  coordinates,
  className = 'w-full h-80 sm:h-96',
  interactive = true,
  onMapReady,
}: RouteMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const onMapReadyRef = useRef(onMapReady);

  useEffect(() => {
    onMapReadyRef.current = onMapReady;
  }, [onMapReady]);

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
      style: MAP_STYLE,
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

      if (!map.getSource('route-line')) {
        map.addSource('route-line', {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: {},
            geometry: {
              type: 'LineString',
              coordinates: coordinates,
            },
          },
        });
      }

      if (!map.getLayer('route-line-layer')) {
        map.addLayer({
          id: 'route-line-layer',
          type: 'line',
          source: 'route-line',
          layout: {
            'line-join': 'round',
            'line-cap': 'round',
          },
          paint: {
            'line-color': '#1F2A1E',
            'line-width': 4.5,
          },
        });
      }

      // Per-kilometer distance markers along the route
      getKilometerMarks(coordinates).forEach(({ km, position }) => {
        const kmEl = document.createElement('div');
        kmEl.className = 'route-marker km-marker';
        kmEl.innerHTML = `
          <div style="background-color: #F7F5EF; color: #1F2A1E; min-width: 26px; height: 20px; padding: 0 3px; border-radius: 13px; display: flex; align-items: center; justify-content: center; font-family: monospace; font-size: 10px; font-weight: bold; border: 2px solid #1F2A1E; box-shadow: 0 1px 3px rgba(0,0,0,0.25); z-index: 5;" title="${km} km">${km}</div>
        `;
        new maplibregl.Marker({ element: kmEl, anchor: 'center' })
          .setLngLat(position)
          .addTo(map);
      });

      if (onMapReadyRef.current) {
        onMapReadyRef.current(map);
      }

      map.resize();
    };

    // Draw as soon as the style (not the tile data) is ready. Waiting for the
    // full 'load' event stalls indefinitely when tile requests fail or hang,
    // which previously left the route line and markers undrawn.
    if (map.isStyleLoaded()) {
      setupLayers();
    } else {
      map.once('style.load', setupLayers);
    }

    // Resize observer
    const resizeObserver = new ResizeObserver(() => {
      map.resize();
    });
    if (mapContainer.current) {
      resizeObserver.observe(mapContainer.current);
    }

    return () => {
      resizeObserver.disconnect();
      map.remove();
      mapRef.current = null;
    };
  }, [coordinates, interactive]);

  return (
    <div
      ref={mapContainer}
      className={`relative overflow-hidden rounded-[8px] border border-contour-tan ${className}`}
      data-testid="maplibre-container"
    />
  );
}
