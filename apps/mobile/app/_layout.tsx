import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

export default function RootLayout() {
  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: {
            backgroundColor: '#0c0f0d',
          },
          headerTintColor: '#e8ece9',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
          contentStyle: {
            backgroundColor: '#0c0f0d',
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
