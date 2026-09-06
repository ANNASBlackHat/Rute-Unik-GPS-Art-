import React, { createContext, useContext, useState, useMemo } from 'react';

export type ThemeMode = 'light' | 'dark';

export interface ThemeColors {
  mode: ThemeMode;
  paper: string; // Page background
  chalk: string; // Card surface
  chalkSubtle: string; // Inner preview canvas background
  ink: string; // Primary text
  inkMuted: string; // Secondary text / captions
  contourTan: string; // Hairline borders / dividers
  trailOrange: string; // Primary CTA, Official badge
  trailOrangeText: string;
  moss: string; // Secondary, completed state
  routeStroke: string; // SVG route linework color
  uncompletedTrack: string; // Silhouette track during live run
  cardBorder: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  primaryButtonBg: string;
  primaryButtonText: string;
  searchBg: string;
  searchBorder: string;
  chipBg: string;
  chipBorder: string;
  chipActiveBg: string;
  chipActiveBorder: string;
  chipText: string;
  chipTextActive: string;
  turnCardBg: string;
  turnCardBorder: string;
  turnIconBoxBg: string;
  turnIconBoxBorder: string;
  hudCardBg: string;
  hudCardBorder: string;
  modalCardBg: string;
  modalCardBorder: string;
  progressBg: string;
  progressFill: string;
}

export const lightTheme: ThemeColors = {
  mode: 'light',
  paper: '#EDE8DC', // Official spec: --color-paper
  chalk: '#F7F5EF', // Official spec: --color-chalk
  chalkSubtle: '#E4DDD0', // Slightly deeper paper for canvas boxes
  ink: '#1F2A1E', // Official spec: --color-ink
  inkMuted: '#687566', // Muted ink for secondary labels
  contourTan: '#C9BFA6', // Official spec: --color-contour-tan
  trailOrange: '#E8562C', // Official spec: --color-trail-orange
  trailOrangeText: '#F7F5EF', // Spec: text on trail-orange is chalk
  moss: '#5C6E4F', // Official spec: --color-moss
  routeStroke: '#1F2A1E', // Spec: "Route linework itself is always ink, regardless of surrounding color"
  uncompletedTrack: '#C9BFA6', // Contour-tan hairline track for uncompleted parts
  cardBorder: '#C9BFA6',
  badgeBg: '#E3DCCF',
  badgeText: '#1F2A1E',
  badgeBorder: '#C9BFA6',
  primaryButtonBg: '#E8562C', // Trail-orange for primary run CTA
  primaryButtonText: '#F7F5EF',
  searchBg: '#F7F5EF',
  searchBorder: '#C9BFA6',
  chipBg: '#DFD7C7',
  chipBorder: '#C9BFA6',
  chipActiveBg: '#1F2A1E',
  chipActiveBorder: '#1F2A1E',
  chipText: '#687566',
  chipTextActive: '#F7F5EF',
  turnCardBg: '#F7F5EF',
  turnCardBorder: '#C9BFA6',
  turnIconBoxBg: '#EDE8DC',
  turnIconBoxBorder: '#C9BFA6',
  hudCardBg: '#F7F5EF',
  hudCardBorder: '#C9BFA6',
  modalCardBg: '#F7F5EF',
  modalCardBorder: '#C9BFA6',
  progressBg: '#DFD7C7',
  progressFill: '#E8562C',
};

export const darkTheme: ThemeColors = {
  mode: 'dark',
  paper: '#0C100D',
  chalk: '#131A15',
  chalkSubtle: '#090E0A',
  ink: '#F7F5EF',
  inkMuted: '#8A998B',
  contourTan: '#202D23',
  trailOrange: '#E8562C',
  trailOrangeText: '#F7F5EF',
  moss: '#5C6E4F',
  routeStroke: '#34D399', // In dark AMOLED mode, glowing neon emerald
  uncompletedTrack: '#1D3023',
  cardBorder: '#202D23',
  badgeBg: '#1C2820',
  badgeText: '#6EE7B7',
  badgeBorder: '#2D4032',
  primaryButtonBg: '#10B981',
  primaryButtonText: '#062817',
  searchBg: '#151B17',
  searchBorder: '#253329',
  chipBg: '#171E19',
  chipBorder: '#253329',
  chipActiveBg: '#059669',
  chipActiveBorder: '#34D399',
  chipText: '#9CA3AF',
  chipTextActive: '#FFFFFF',
  turnCardBg: '#102216',
  turnCardBorder: '#1F482D',
  turnIconBoxBg: '#162B1D',
  turnIconBoxBorder: '#244830',
  hudCardBg: '#111713',
  hudCardBorder: '#1E2C22',
  modalCardBg: '#111713',
  modalCardBorder: '#243B2B',
  progressBg: '#17221A',
  progressFill: '#10B981',
};

interface ThemeContextValue {
  mode: ThemeMode;
  theme: ThemeColors;
  toggleTheme: () => void;
  setMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  mode: 'light',
  theme: lightTheme,
  toggleTheme: () => {},
  setMode: () => {},
});

export function ThemeProvider({
  children,
  initialMode = 'light',
}: {
  children: React.ReactNode;
  initialMode?: ThemeMode;
}) {
  const [mode, setMode] = useState<ThemeMode>(initialMode);

  const theme = useMemo(
    () => (mode === 'dark' ? darkTheme : lightTheme),
    [mode]
  );

  const toggleTheme = () => {
    setMode((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  return (
    <ThemeContext.Provider value={{ mode, theme, toggleTheme, setMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
