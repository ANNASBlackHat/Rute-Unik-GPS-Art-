import React, { useMemo } from 'react';
import { View, StyleSheet, StyleProp, ViewStyle, Text } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { generateThumbnailSvg } from '@rute-unik/shared';

export interface RouteShapePreviewProps {
  svgXml?: string | null;
  coordinates?: [number, number][];
  strokeColor?: string;
  strokeWidth?: number;
  width?: number | string;
  height?: number | string;
  style?: StyleProp<ViewStyle>;
  fallbackLabel?: string;
  showEndpoints?: boolean;
}

/**
 * Prepares and colors SVG string for high-contrast mobile dark theme.
 * Replaces dark strokes with vibrant neon mint/emerald and ensures proper viewBox scaling.
 */
export function prepareSvgXml(
  rawXml: string,
  strokeColor = '#34d399',
  strokeWidth = 3
): string {
  if (!rawXml || typeof rawXml !== 'string') return '';

  let xml = rawXml.trim();

  // Normalize <svg> tag attributes for flexible scaling
  xml = xml.replace(/<svg\b([^>]*)>/i, (match, attrs) => {
    let cleanedAttrs = attrs
      .replace(/\bwidth="[^"]*"/gi, '')
      .replace(/\bheight="[^"]*"/gi, '')
      .trim();

    if (!cleanedAttrs.includes('viewBox')) {
      cleanedAttrs += ' viewBox="0 0 200 200"';
    }
    return `<svg ${cleanedAttrs} width="100%" height="100%">`;
  });

  // Replace or inject stroke color
  if (/stroke="[^"]*"/.test(xml)) {
    xml = xml.replace(/stroke="[^"]*"/g, `stroke="${strokeColor}"`);
  } else {
    xml = xml.replace(
      /<(path|polyline|line|polygon)/g,
      `<$1 stroke="${strokeColor}"`
    );
  }

  // Adjust stroke width if requested
  if (strokeWidth) {
    if (/stroke-width="[^"]*"/.test(xml)) {
      xml = xml.replace(
        /stroke-width="[^"]*"/g,
        `stroke-width="${strokeWidth}"`
      );
    } else {
      xml = xml.replace(
        /<(path|polyline|line|polygon)/g,
        `<$1 stroke-width="${strokeWidth}"`
      );
    }
  }

  // Ensure linecap & linejoin are smooth
  if (!xml.includes('stroke-linecap')) {
    xml = xml.replace(
      /<(path|polyline|line)/g,
      '<$1 stroke-linecap="round" stroke-linejoin="round"'
    );
  }

  // Ensure shapes don't fill with solid black/dark background
  xml = xml.replace(/fill="(?!none)[^"]*"/g, 'fill="none"');
  if (!xml.includes('fill=')) {
    xml = xml.replace(/<(path|polyline|polygon)/g, '<$1 fill="none"');
  }

  return xml;
}

export function RouteShapePreview({
  svgXml,
  coordinates,
  strokeColor = '#34d399',
  strokeWidth = 3.5,
  width = '100%',
  height = '100%',
  style,
  fallbackLabel,
  showEndpoints = false,
}: RouteShapePreviewProps) {
  const finalSvgXml = useMemo(() => {
    if (svgXml && svgXml.trim().length > 0) {
      return prepareSvgXml(svgXml, strokeColor, strokeWidth);
    }
    if (coordinates && coordinates.length >= 2) {
      const generated = generateThumbnailSvg(coordinates, {
        strokeColor,
        strokeWidth,
      });
      return prepareSvgXml(generated, strokeColor, strokeWidth);
    }
    return null;
  }, [svgXml, coordinates, strokeColor, strokeWidth]);

  return (
    <View style={[styles.container, style]}>
      {finalSvgXml ? (
        <View style={styles.svgWrapper}>
          <SvgXml xml={finalSvgXml} width={width} height={height} />
        </View>
      ) : (
        <View style={styles.fallbackContainer}>
          <Text style={styles.fallbackIcon}>🗺️</Text>
          {fallbackLabel ? (
            <Text style={styles.fallbackText}>{fallbackLabel}</Text>
          ) : null}
        </View>
      )}

      {showEndpoints ? (
        <View style={styles.endpointsRow}>
          <View style={styles.endpointTag}>
            <View style={[styles.endpointDot, { backgroundColor: '#10b981' }]} />
            <Text style={styles.endpointText}>Start</Text>
          </View>
          <View style={styles.endpointTag}>
            <View style={[styles.endpointDot, { backgroundColor: '#ef4444' }]} />
            <Text style={styles.endpointText}>Finish</Text>
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  svgWrapper: {
    width: '100%',
    height: '100%',
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
    bottom: 8,
    left: 10,
    right: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    pointerEvents: 'none',
  },
  endpointTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(12, 18, 14, 0.75)',
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
