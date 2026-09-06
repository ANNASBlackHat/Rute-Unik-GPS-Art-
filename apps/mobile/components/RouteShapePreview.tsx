import React, { useMemo } from 'react';
import { View, StyleSheet, StyleProp, ViewStyle, Text } from 'react-native';
import Svg, { Polyline, Path, Polygon, SvgXml } from 'react-native-svg';
import { generateThumbnailSvg } from '@rute-unik/shared';

import { useTheme } from '../services/themeContext';

export interface RouteShapePreviewProps {
  svgXml?: string | null;
  coordinates?: [number, number][];
  strokeColor?: string;
  strokeWidth?: number;
  size?: number; // Concrete pixel dimension (width & height) for native Canvas rendering
  style?: StyleProp<ViewStyle>;
  fallbackLabel?: string;
  showEndpoints?: boolean;
}

interface ParsedShape {
  type: 'polyline' | 'path' | 'polygon' | 'xml';
  points?: string;
  d?: string;
  xml?: string;
  viewBox: string;
}

/**
 * Extracts vector shape information from SVG markup so it can be rendered
 * using native React Native SVG primitives (Polyline, Path, Polygon) without XML parsing quirks.
 */
export function extractShapeInfo(rawXml: string): ParsedShape | null {
  if (!rawXml || typeof rawXml !== 'string') return null;

  const xml = rawXml.trim();
  const viewBoxMatch = xml.match(/viewBox=["']([^"']+)["']/i);
  const viewBox = viewBoxMatch ? viewBoxMatch[1] : '0 0 200 200';

  // 1. Check for <polyline points="..." />
  const polylineMatch = xml.match(/<polyline\b[^>]*\bpoints=["']([^"']+)["']/i);
  if (polylineMatch) {
    return { type: 'polyline', points: polylineMatch[1].trim(), viewBox };
  }

  // 2. Check for <path d="..." />
  const pathMatch = xml.match(/<path\b[^>]*\bd=["']([^"']+)["']/i);
  if (pathMatch) {
    return { type: 'path', d: pathMatch[1].trim(), viewBox };
  }

  // 3. Check for <polygon points="..." />
  const polygonMatch = xml.match(/<polygon\b[^>]*\bpoints=["']([^"']+)["']/i);
  if (polygonMatch) {
    return { type: 'polygon', points: polygonMatch[1].trim(), viewBox };
  }

  // 4. Fallback to raw XML with normalized viewBox and stroke
  return { type: 'xml', xml, viewBox };
}

export function RouteShapePreview({
  svgXml,
  coordinates,
  strokeColor,
  strokeWidth = 3.5,
  size = 120,
  style,
  fallbackLabel,
  showEndpoints = false,
}: RouteShapePreviewProps) {
  const { theme, mode } = useTheme();
  const effectiveStrokeColor = strokeColor ?? theme.routeStroke;

  const shape = useMemo<ParsedShape | null>(() => {
    if (svgXml && svgXml.trim().length > 0) {
      return extractShapeInfo(svgXml);
    }
    if (coordinates && coordinates.length >= 2) {
      const generated = generateThumbnailSvg(coordinates, {
        strokeColor: effectiveStrokeColor,
        strokeWidth,
      });
      return extractShapeInfo(generated);
    }
    return null;
  }, [svgXml, coordinates, effectiveStrokeColor, strokeWidth]);

  return (
    <View style={[styles.container, style]}>
      {shape ? (
        <View style={[styles.svgWrapper, { width: size, height: size }]}>
          {shape.type === 'polyline' && shape.points ? (
            <Svg viewBox={shape.viewBox} width={size} height={size}>
              <Polyline
                points={shape.points}
                fill="none"
                stroke={effectiveStrokeColor}
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
          ) : shape.type === 'path' && shape.d ? (
            <Svg viewBox={shape.viewBox} width={size} height={size}>
              <Path
                d={shape.d}
                fill="none"
                stroke={effectiveStrokeColor}
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
          ) : shape.type === 'polygon' && shape.points ? (
            <Svg viewBox={shape.viewBox} width={size} height={size}>
              <Polygon
                points={shape.points}
                fill="none"
                stroke={effectiveStrokeColor}
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
          ) : shape.xml ? (
            <SvgXml xml={shape.xml} width={size} height={size} />
          ) : null}
        </View>
      ) : (
        <View style={styles.fallbackContainer}>
          <Text style={styles.fallbackIcon}>🗺️</Text>
          {fallbackLabel ? (
            <Text style={[styles.fallbackText, { color: theme.inkMuted }]}>
              {fallbackLabel}
            </Text>
          ) : null}
        </View>
      )}

      {showEndpoints ? (
        <View style={styles.endpointsRow}>
          <View
            style={[
              styles.endpointTag,
              {
                backgroundColor:
                  mode === 'light' ? 'rgba(247, 245, 239, 0.92)' : 'rgba(12, 18, 14, 0.85)',
                borderColor: theme.cardBorder,
                borderWidth: 1,
              },
            ]}
          >
            <View style={[styles.endpointDot, { backgroundColor: '#10b981' }]} />
            <Text
              style={[
                styles.endpointText,
                { color: mode === 'light' ? theme.ink : '#d1fae5' },
              ]}
            >
              Start
            </Text>
          </View>
          <View
            style={[
              styles.endpointTag,
              {
                backgroundColor:
                  mode === 'light' ? 'rgba(247, 245, 239, 0.92)' : 'rgba(12, 18, 14, 0.85)',
                borderColor: theme.cardBorder,
                borderWidth: 1,
              },
            ]}
          >
            <View style={[styles.endpointDot, { backgroundColor: '#ef4444' }]} />
            <Text
              style={[
                styles.endpointText,
                { color: mode === 'light' ? theme.ink : '#d1fae5' },
              ]}
            >
              Finish
            </Text>
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  svgWrapper: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  fallbackContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 12,
  },
  fallbackIcon: {
    fontSize: 28,
    marginBottom: 4,
  },
  fallbackText: {
    fontSize: 11,
    color: '#6b7280',
    fontWeight: '600',
  },
  endpointsRow: {
    position: 'absolute',
    bottom: 4,
    left: 8,
    right: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    pointerEvents: 'none',
  },
  endpointTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(12, 18, 14, 0.85)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    gap: 5,
  },
  endpointDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  endpointText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#d1fae5',
  },
});
