import type { StyleSpecification } from 'maplibre-gl';

/**
 * Basemap styles for Rute Unik — both raster, no API key required.
 * - streets: OpenStreetMap standard (default, paper/topo aesthetic)
 * - satellite: Esri World Imagery (aerial, keeps the same ink route line)
 */
export const MAP_STYLES = {
  streets: {
    version: 8,
    sources: {
      'osm-tiles': {
        type: 'raster',
        tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
        tileSize: 256,
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      },
    },
    layers: [
      {
        id: 'osm-tiles-layer',
        type: 'raster',
        source: 'osm-tiles',
        minzoom: 0,
        maxzoom: 19,
      },
    ],
  } as StyleSpecification,
  satellite: {
    version: 8,
    sources: {
      'satellite-tiles': {
        type: 'raster',
        tiles: [
          'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        ],
        tileSize: 256,
        attribution:
          '&copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community',
      },
      // Optional label overlay so street names remain readable on satellite
      'satellite-labels': {
        type: 'raster',
        tiles: [
          'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
        ],
        tileSize: 256,
      },
    },
    layers: [
      {
        id: 'satellite-tiles-layer',
        type: 'raster',
        source: 'satellite-tiles',
        minzoom: 0,
        maxzoom: 19,
      },
      {
        id: 'satellite-labels-layer',
        type: 'raster',
        source: 'satellite-labels',
        minzoom: 0,
        maxzoom: 19,
      },
    ],
  } as StyleSpecification,
} as const;

export type MapStyleKey = keyof typeof MAP_STYLES;

/** Back-compat default (streets) */
export const MAP_STYLE = MAP_STYLES.streets;
