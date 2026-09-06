import React, { useMemo } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import Svg, { Polyline, Circle } from 'react-native-svg';
import { createRouteProjector } from '@rute-unik/shared';
import { useTheme } from '../services/themeContext';

export interface LiveRouteTrackerProps {
  routeCoords: [number, number][];
  runnerLocation?: [number, number] | null; // [lon, lat]
  closestIndex?: number;
  size?: number; // Concrete pixel dimension (width & height)
  isOffRoute?: boolean;
}

export function LiveRouteTracker({
  routeCoords,
  runnerLocation,
  closestIndex = 0,
  size = 200,
  isOffRoute = false,
}: LiveRouteTrackerProps) {
  const {
    fullPathPoints,
    completedPoints,
    startPos,
    finishPos,
    runnerPos,
    viewBox,
  } = useMemo(() => {
    if (!routeCoords || routeCoords.length < 2) {
      return {
        fullPathPoints: '',
        completedPoints: '',
        startPos: null,
        finishPos: null,
        runnerPos: null,
        viewBox: '0 0 200 200',
      };
    }

    const projector = createRouteProjector(routeCoords, size, 22);

    // 1. Full route path
    const fullProjected = routeCoords.map(projector.project);
    const fullPathPoints = fullProjected
      .map(([x, y]) => `${x},${y}`)
      .join(' ');

    // 2. Start & Finish
    const startPos = fullProjected[0];
    const finishPos = fullProjected[fullProjected.length - 1];

    // 3. Completed path: from coordinate 0 up to closestIndex
    let completedPoints = '';
    if (closestIndex > 0) {
      const traversed = routeCoords.slice(0, closestIndex + 1);
      const projTraversed = traversed.map(projector.project);
      if (runnerLocation) {
        projTraversed.push(projector.project(runnerLocation));
      }
      completedPoints = projTraversed.map(([x, y]) => `${x},${y}`).join(' ');
    }

    // 4. Runner location: projected runner coordinate, falls back to start
    const runnerPos = runnerLocation
      ? projector.project(runnerLocation)
      : startPos;

    return {
      fullPathPoints,
      completedPoints,
      startPos,
      finishPos,
      runnerPos,
      viewBox: projector.viewBox,
    };
  }, [routeCoords, runnerLocation, closestIndex, size]);

  const { theme, mode } = useTheme();

  if (!routeCoords || routeCoords.length < 2) {
    return (
      <View style={[styles.container, { width: size, height: size }]}>
        <Text style={[styles.emptyText, { color: theme.inkMuted }]}>
          Memuat jalur rute...
        </Text>
      </View>
    );
  }

  const uncompletedStroke = theme.uncompletedTrack;
  const completedStroke = mode === 'light' ? theme.ink : theme.routeStroke;

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg viewBox={viewBox} width={size} height={size}>
        {/* Full route silhouette */}
        <Polyline
          points={fullPathPoints}
          fill="none"
          stroke={uncompletedStroke}
          strokeWidth={4}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Completed portion */}
        {completedPoints ? (
          <Polyline
            points={completedPoints}
            fill="none"
            stroke={completedStroke}
            strokeWidth={4.8}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ) : null}

        {/* Start point marker */}
        {startPos ? (
          <Circle
            cx={startPos[0]}
            cy={startPos[1]}
            r={4.5}
            fill="#10b981"
            stroke={theme.chalk}
            strokeWidth={1.5}
          />
        ) : null}

        {/* Finish point marker */}
        {finishPos ? (
          <Circle
            cx={finishPos[0]}
            cy={finishPos[1]}
            r={4.5}
            fill="#ef4444"
            stroke={theme.chalk}
            strokeWidth={1.5}
          />
        ) : null}

        {/* Live Runner Position Indicator */}
        {runnerPos ? (
          <>
            <Circle
              cx={runnerPos[0]}
              cy={runnerPos[1]}
              r={isOffRoute ? 12 : 9}
              fill={isOffRoute ? '#ef4444' : '#38bdf8'}
              fillOpacity={0.35}
            />
            <Circle
              cx={runnerPos[0]}
              cy={runnerPos[1]}
              r={isOffRoute ? 5.5 : 4.5}
              fill={isOffRoute ? '#dc2626' : '#0284c7'}
              stroke="#ffffff"
              strokeWidth={1.8}
            />
          </>
        ) : null}
      </Svg>

      {/* Runner Legend Bar */}
      <View
        style={[
          styles.legendBar,
          {
            backgroundColor:
              mode === 'light'
                ? 'rgba(247, 245, 239, 0.95)'
                : 'rgba(10, 16, 12, 0.85)',
            borderColor: theme.cardBorder,
            borderWidth: 1,
          },
        ]}
      >
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#10b981' }]} />
          <Text
            style={[
              styles.legendText,
              { color: mode === 'light' ? theme.ink : '#d1fae5' },
            ]}
          >
            Start
          </Text>
        </View>
        <View style={styles.legendItem}>
          <View
            style={[
              styles.legendDot,
              { backgroundColor: isOffRoute ? '#ef4444' : '#38bdf8' },
            ]}
          />
          <Text
            style={[
              styles.legendText,
              { color: mode === 'light' ? theme.ink : '#d1fae5' },
            ]}
          >
            {isOffRoute ? 'Keluar Rute' : 'Posisi Anda'}
          </Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#ef4444' }]} />
          <Text
            style={[
              styles.legendText,
              { color: mode === 'light' ? theme.ink : '#d1fae5' },
            ]}
          >
            Finish
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    alignSelf: 'center',
  },
  emptyText: {
    color: '#6b7280',
    fontSize: 12,
  },
  legendBar: {
    position: 'absolute',
    bottom: 2,
    left: 4,
    right: 4,
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(10, 16, 12, 0.85)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  legendText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#d1fae5',
  },
});
