import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { TurnType, getTurnEmoji } from '@rute-unik/shared';

export interface TurnDirectionIconProps {
  turnType?: TurnType | 'start' | 'finish' | 'off_route' | string;
  size?: number;
  color?: string;
  strokeWidth?: number;
}

export { getTurnEmoji };

/**
 * High-contrast vector directional turn arrows for runners.
 * Renders crisp native vector curves for each maneuver.
 */
export function TurnDirectionIcon({
  turnType = 'straight',
  size = 36,
  color = '#34d399',
  strokeWidth = 3.5,
}: TurnDirectionIconProps) {
  const renderPath = () => {
    switch (turnType) {
      case 'right':
        return (
          // 90-degree sharp turn right
          <Path
            d="M 6 19 L 6 11 C 6 8.5 8 6.5 10.5 6.5 L 18 6.5 M 13.5 2 L 18 6.5 L 13.5 11"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        );

      case 'left':
        return (
          // 90-degree sharp turn left
          <Path
            d="M 18 19 L 18 11 C 18 8.5 16 6.5 13.5 6.5 L 6 6.5 M 10.5 2 L 6 6.5 L 10.5 11"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        );

      case 'slight_right':
        return (
          // Gentle branch to the right (45 deg)
          <Path
            d="M 8 19 L 11.5 11.5 L 17 6 M 11.5 5.5 L 17 6 L 17.5 11.5"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        );

      case 'slight_left':
        return (
          // Gentle branch to the left (45 deg)
          <Path
            d="M 16 19 L 12.5 11.5 L 7 6 M 12.5 5.5 L 7 6 L 6.5 11.5"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        );

      case 'sharp_right':
        return (
          // Hairpin right
          <Path
            d="M 6 19 L 6 9 C 6 5.5 12 5.5 12 9 L 12 17 M 8 13 L 12 17 L 16 13"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        );

      case 'sharp_left':
        return (
          // Hairpin left
          <Path
            d="M 18 19 L 18 9 C 18 5.5 12 5.5 12 9 L 12 17 M 8 13 L 12 17 L 16 13"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        );

      case 'u_turn':
        return (
          // 180-degree U-turn loop
          <Path
            d="M 17 19 L 17 9.5 C 17 5 7 5 7 9.5 L 7 19 M 3 15 L 7 19 L 11 15"
            stroke="#f59e0b"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        );

      case 'finish':
        return (
          // Finish flag
          <Path
            d="M 5 21 L 5 3 M 5 4 L 18 4 L 14 9 L 18 14 L 5 14"
            stroke="#10b981"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        );

      case 'start':
        return (
          // Start arrow
          <Path
            d="M 7 4 L 19 12 L 7 20 Z"
            fill="#10b981"
            stroke="#10b981"
            strokeWidth={1}
            strokeLinejoin="round"
          />
        );

      case 'off_route':
        return (
          // Warning triangle
          <Path
            d="M 12 3 L 21 19 L 3 19 Z M 12 9 L 12 13 M 12 16 L 12 16.5"
            stroke="#ef4444"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        );

      case 'straight':
      default:
        return (
          // Forward straight arrow
          <Path
            d="M 12 20 L 12 4 M 6 10 L 12 4 L 18 10"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        );
    }
  };

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg viewBox="0 0 24 24" width={size} height={size}>
        {renderPath()}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});
