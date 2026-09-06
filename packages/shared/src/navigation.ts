import { haversineDistance, calculateOffRoute } from './geo';

export type TurnType =
  | 'straight'
  | 'slight_right'
  | 'right'
  | 'sharp_right'
  | 'slight_left'
  | 'left'
  | 'sharp_left'
  | 'u_turn';

export interface LocalizedInstruction {
  en: {
    advance: string;
    action: string;
  };
  id: {
    advance: string;
    action: string;
  };
}

/**
 * Maps turn maneuvers to visual directional glyphs
 */
export function getTurnEmoji(
  turnType?: TurnType | 'start' | 'finish' | 'off_route' | string
): string {
  switch (turnType) {
    case 'right':
      return '➡️';
    case 'left':
      return '⬅️';
    case 'slight_right':
      return '↗️';
    case 'slight_left':
      return '↖️';
    case 'sharp_right':
      return '↪️';
    case 'sharp_left':
      return '↩️';
    case 'u_turn':
      return '🔄';
    case 'straight':
      return '⬆️';
    case 'finish':
      return '🏁';
    case 'start':
      return '🏃‍♂️';
    case 'off_route':
      return '⚠️';
    default:
      return '➡️';
  }
}

export interface TurnCue {
  id: string;
  index: number; // coordinate index in original polyline
  coordinate: [number, number]; // [lon, lat]
  distanceFromStartMeters: number;
  turnType: TurnType;
  turnAngle: number; // in degrees, [-180, +180]
  instructions: LocalizedInstruction;
}

export interface NavigationState {
  lastAdvanceCueId?: string | null;
  lastActionCueId?: string | null;
  lastOffRouteAlertTimestamp?: number | null;
  offRouteConsecutiveTicks: number;
  wasOffRoute: boolean;
  isCompleted: boolean;
}

export interface NavigationCueEvent {
  type:
    | 'advance_turn'
    | 'action_turn'
    | 'off_route'
    | 'back_on_route'
    | 'route_completed';
  messageEn: string;
  messageId: string;
  turnCue?: TurnCue;
  distanceToTurnMeters?: number;
}

export interface NavigationStepResult {
  nextState: NavigationState;
  events: NavigationCueEvent[];
  distanceCoveredMeters: number;
  completionPercent: number;
  closestCoordinateIndex?: number;
  distanceToNextTurnMeters: number | null;
  nextTurnCue: TurnCue | null;
  isOffRoute: boolean;
  offRouteDistanceMeters: number;
}

/**
 * Calculates initial compass bearing in degrees (0..360) from coord1 to coord2.
 * Coordinates are [lon, lat].
 */
export function calculateBearing(
  coord1: [number, number],
  coord2: [number, number]
): number {
  const [lon1, lat1] = coord1;
  const [lon2, lat2] = coord2;

  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x =
    Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);

  const θ = Math.atan2(y, x);
  const degrees = (θ * 180) / Math.PI;

  return (degrees + 360) % 360;
}

/**
 * Normalizes bearing difference to [-180, +180] degrees.
 * Positive = turn right, Negative = turn left.
 */
export function calculateTurnAngle(
  bearingFrom: number,
  bearingTo: number
): number {
  let diff = bearingTo - bearingFrom;
  while (diff > 180) diff -= 360;
  while (diff < -180) diff += 360;
  return Math.round(diff * 10) / 10;
}

/**
 * Classifies an angle delta into a TurnType enum.
 */
export function classifyTurn(angleDelta: number): TurnType {
  const abs = Math.abs(angleDelta);

  if (abs <= 20) {
    return 'straight';
  }

  if (abs >= 160) {
    return 'u_turn';
  }

  if (angleDelta > 0) {
    // Right turns
    if (angleDelta <= 50) return 'slight_right';
    if (angleDelta <= 120) return 'right';
    return 'sharp_right';
  } else {
    // Left turns
    if (angleDelta >= -50) return 'slight_left';
    if (angleDelta >= -120) return 'left';
    return 'sharp_left';
  }
}

/**
 * Generates bilingual voice cues for turn directions.
 */
export function getTurnInstructions(
  turnType: TurnType,
  distanceMeters = 30
): LocalizedInstruction {
  const roundedDist = Math.max(10, Math.round(distanceMeters / 5) * 5);

  switch (turnType) {
    case 'slight_right':
      return {
        en: {
          advance: `In ${roundedDist} meters, bear slight right.`,
          action: 'Bear slight right.',
        },
        id: {
          advance: `Dalam ${roundedDist} meter, ambil serong kanan.`,
          action: 'Ambil serong kanan.',
        },
      };
    case 'right':
      return {
        en: {
          advance: `In ${roundedDist} meters, turn right.`,
          action: 'Turn right now.',
        },
        id: {
          advance: `Dalam ${roundedDist} meter, belok kanan.`,
          action: 'Belok kanan sekarang.',
        },
      };
    case 'sharp_right':
      return {
        en: {
          advance: `In ${roundedDist} meters, make a sharp right.`,
          action: 'Sharp right now.',
        },
        id: {
          advance: `Dalam ${roundedDist} meter, belok patah ke kanan.`,
          action: 'Belok patah ke kanan.',
        },
      };
    case 'slight_left':
      return {
        en: {
          advance: `In ${roundedDist} meters, bear slight left.`,
          action: 'Bear slight left.',
        },
        id: {
          advance: `Dalam ${roundedDist} meter, ambil serong kiri.`,
          action: 'Ambil serong kiri.',
        },
      };
    case 'left':
      return {
        en: {
          advance: `In ${roundedDist} meters, turn left.`,
          action: 'Turn left now.',
        },
        id: {
          advance: `Dalam ${roundedDist} meter, belok kiri.`,
          action: 'Belok kiri sekarang.',
        },
      };
    case 'sharp_left':
      return {
        en: {
          advance: `In ${roundedDist} meters, make a sharp left.`,
          action: 'Sharp left now.',
        },
        id: {
          advance: `Dalam ${roundedDist} meter, belok patah ke kiri.`,
          action: 'Belok patah ke kiri.',
        },
      };
    case 'u_turn':
      return {
        en: {
          advance: `In ${roundedDist} meters, make a U-turn.`,
          action: 'Make a U-turn now.',
        },
        id: {
          advance: `Dalam ${roundedDist} meter, putar balik.`,
          action: 'Putar balik sekarang.',
        },
      };
    case 'straight':
    default:
      return {
        en: {
          advance: `In ${roundedDist} meters, continue straight.`,
          action: 'Continue straight.',
        },
        id: {
          advance: `Dalam ${roundedDist} meter, lurus terus.`,
          action: 'Lurus terus.',
        },
      };
  }
}

/**
 * Pre-processes polyline coordinates to extract significant turns for voice guidance.
 * Merges micro-segments (< minSegmentMeters) to avoid jitter/noise.
 */
export function extractTurnCues(
  coordinates: [number, number][],
  options: {
    minSegmentMeters?: number; // default 15m
    minTurnAngleDegrees?: number; // default 25 degrees
  } = {}
): TurnCue[] {
  if (coordinates.length < 3) return [];

  const minSegmentMeters = options.minSegmentMeters ?? 15;
  const minTurnAngle = options.minTurnAngleDegrees ?? 25;

  // 1. Calculate cumulative distance along original polyline
  const cumulativeDist: number[] = [0];
  for (let i = 0; i < coordinates.length - 1; i++) {
    cumulativeDist.push(
      cumulativeDist[i] + haversineDistance(coordinates[i], coordinates[i + 1])
    );
  }

  // 2. Filter nodes to only vertices separated by at least minSegmentMeters
  interface SignificantVertex {
    index: number;
    coord: [number, number];
    distFromStart: number;
  }

  const vertices: SignificantVertex[] = [
    { index: 0, coord: coordinates[0], distFromStart: 0 },
  ];

  for (let i = 1; i < coordinates.length - 1; i++) {
    const last = vertices[vertices.length - 1];
    const distSinceLast = cumulativeDist[i] - last.distFromStart;
    if (distSinceLast >= minSegmentMeters) {
      vertices.push({
        index: i,
        coord: coordinates[i],
        distFromStart: cumulativeDist[i],
      });
    }
  }

  // Always include the last coordinate
  const lastIndex = coordinates.length - 1;
  vertices.push({
    index: lastIndex,
    coord: coordinates[lastIndex],
    distFromStart: cumulativeDist[lastIndex],
  });

  if (vertices.length < 3) return [];

  // 3. Detect turns between significant vertices
  const cues: TurnCue[] = [];

  for (let i = 1; i < vertices.length - 1; i++) {
    const prev = vertices[i - 1];
    const curr = vertices[i];
    const next = vertices[i + 1];

    const bearing1 = calculateBearing(prev.coord, curr.coord);
    const bearing2 = calculateBearing(curr.coord, next.coord);
    const turnAngle = calculateTurnAngle(bearing1, bearing2);

    if (Math.abs(turnAngle) >= minTurnAngle) {
      const turnType = classifyTurn(turnAngle);
      const instructions = getTurnInstructions(turnType, 30);

      cues.push({
        id: `cue-${curr.index}-${Math.round(curr.distFromStart)}`,
        index: curr.index,
        coordinate: curr.coord,
        distanceFromStartMeters: Math.round(curr.distFromStart),
        turnType,
        turnAngle,
        instructions,
      });
    }
  }

  return cues;
}

/**
 * Real-time evaluator for GPS tick events during live running mode.
 * Determines distance, turn announcements, and off-route warnings.
 */
export function evaluateNavigationStep(
  currentPos: [number, number],
  routeCoords: [number, number][],
  turnCues: TurnCue[],
  currentState: NavigationState,
  options: {
    nowTimestamp?: number;
    offRouteThresholdMeters?: number; // default 30
    offRouteDebounceMs?: number; // default 15000 (15 seconds between alerts)
    advanceTriggerDistanceMeters?: number; // default 35
    actionTriggerDistanceMeters?: number; // default 8
  } = {}
): NavigationStepResult {
  const now = options.nowTimestamp ?? Date.now();
  const offRouteThreshold = options.offRouteThresholdMeters ?? 30;
  const offRouteDebounce = options.offRouteDebounceMs ?? 15000;
  const advanceDist = options.advanceTriggerDistanceMeters ?? 35;
  const actionDist = options.actionTriggerDistanceMeters ?? 8;

  const events: NavigationCueEvent[] = [];
  const nextState: NavigationState = { ...currentState };

  // 1. Off-Route Check
  const offRouteCheck = calculateOffRoute(
    currentPos,
    routeCoords,
    offRouteThreshold
  );
  const isOffRoute = offRouteCheck.isOffRoute;

  if (isOffRoute) {
    nextState.offRouteConsecutiveTicks += 1;
    nextState.wasOffRoute = true;

    // Trigger off-route event only after 2 consecutive ticks (to avoid single GPS jitter spikes)
    // and respected debounce interval
    const canAlert =
      !nextState.lastOffRouteAlertTimestamp ||
      now - nextState.lastOffRouteAlertTimestamp >= offRouteDebounce;

    if (nextState.offRouteConsecutiveTicks >= 2 && canAlert) {
      nextState.lastOffRouteAlertTimestamp = now;
      events.push({
        type: 'off_route',
        messageEn: 'You are off route! Please turn back towards the path.',
        messageId: 'Anda keluar rute! Silakan kembali ke jalur.',
      });
    }
  } else {
    // If was previously off route and now back on track
    if (nextState.wasOffRoute) {
      events.push({
        type: 'back_on_route',
        messageEn: 'Back on route. Continue following the path.',
        messageId: 'Kembali ke jalur. Lanjutkan mengikuti rute.',
      });
    }
    nextState.wasOffRoute = false;
    nextState.offRouteConsecutiveTicks = 0;
  }

  // 2. Find Closest Point & Distance Covered
  let minDistance = Infinity;
  let closestIndex = 0;

  for (let i = 0; i < routeCoords.length; i++) {
    const d = haversineDistance(currentPos, routeCoords[i]);
    if (d < minDistance) {
      minDistance = d;
      closestIndex = i;
    }
  }

  // Calculate total route distance
  let totalRouteDist = 0;
  const cumulativeAtIndices: number[] = [0];
  for (let i = 0; i < routeCoords.length - 1; i++) {
    totalRouteDist += haversineDistance(routeCoords[i], routeCoords[i + 1]);
    cumulativeAtIndices.push(totalRouteDist);
  }

  const coveredMeters = Math.round(
    cumulativeAtIndices[closestIndex] || 0
  );
  const completionPercent =
    totalRouteDist > 0
      ? Math.min(100, Math.round((coveredMeters / totalRouteDist) * 100))
      : 0;

  // 3. Completion Check
  const finishCoord = routeCoords[routeCoords.length - 1];
  const distToFinish = haversineDistance(currentPos, finishCoord);
  if (
    !nextState.isCompleted &&
    ((distToFinish <= 35 && completionPercent >= 80) || completionPercent >= 98)
  ) {
    nextState.isCompleted = true;
    events.push({
      type: 'route_completed',
      messageEn: 'Congratulations! You have completed the route!',
      messageId: 'Selamat! Anda telah menyelesaikan rute ini!',
    });
  }

  // 4. Find Upcoming Turn Cue
  let nextTurnCue: TurnCue | null = null;
  let distanceToNextTurnMeters: number | null = null;

  for (const cue of turnCues) {
    // Look for cues that are at or ahead of the current progress
    if (cue.distanceFromStartMeters >= coveredMeters - 10) {
      const distToCue = haversineDistance(currentPos, cue.coordinate);
      nextTurnCue = cue;
      distanceToNextTurnMeters = Math.round(distToCue);
      break;
    }
  }

  // 5. Trigger Turn Audio Cues
  if (nextTurnCue && distanceToNextTurnMeters !== null && !isOffRoute) {
    // Action trigger (within actionDist, e.g. <= 8m)
    if (
      distanceToNextTurnMeters <= actionDist &&
      nextState.lastActionCueId !== nextTurnCue.id
    ) {
      nextState.lastActionCueId = nextTurnCue.id;
      events.push({
        type: 'action_turn',
        messageEn: nextTurnCue.instructions.en.action,
        messageId: nextTurnCue.instructions.id.action,
        turnCue: nextTurnCue,
        distanceToTurnMeters: distanceToNextTurnMeters,
      });
    }
    // Advance warning trigger (within advanceDist, e.g. <= 35m)
    else if (
      distanceToNextTurnMeters <= advanceDist &&
      distanceToNextTurnMeters > actionDist &&
      nextState.lastAdvanceCueId !== nextTurnCue.id
    ) {
      nextState.lastAdvanceCueId = nextTurnCue.id;
      events.push({
        type: 'advance_turn',
        messageEn: nextTurnCue.instructions.en.advance,
        messageId: nextTurnCue.instructions.id.advance,
        turnCue: nextTurnCue,
        distanceToTurnMeters: distanceToNextTurnMeters,
      });
    }
  }

  return {
    nextState,
    events,
    distanceCoveredMeters: coveredMeters,
    completionPercent,
    closestCoordinateIndex: closestIndex,
    distanceToNextTurnMeters,
    nextTurnCue,
    isOffRoute,
    offRouteDistanceMeters: offRouteCheck.distanceMeters,
  };
}
