import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ThemeProvider, useTheme } from '../services/themeContext';

function RootNav() {
  const { theme, mode } = useTheme();

  return (
    <>
      <StatusBar style={mode === 'light' ? 'dark' : 'light'} />
      <Stack
        screenOptions={{
          headerStyle: {
            backgroundColor: theme.paper,
          },
          headerTintColor: theme.ink,
          headerTitleStyle: {
            fontWeight: 'bold',
          },
          contentStyle: {
            backgroundColor: theme.paper,
          },
        }}
      >
        <Stack.Screen
          name="index"
          options={{
            title: 'Rute Unik',
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="route/[id]"
          options={{
            title: 'Detail Rute',
            headerBackTitle: 'Kembali',
          }}
        />
        <Stack.Screen
          name="run/[id]"
          options={{
            title: 'Mode Lari',
            headerShown: false,
            gestureEnabled: false,
          }}
        />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <RootNav />
    </ThemeProvider>
  );
}
