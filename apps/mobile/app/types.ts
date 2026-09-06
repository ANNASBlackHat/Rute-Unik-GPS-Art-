import React from 'react';

export interface RouteScreenProps {
  routeId: string;
  onNavigateBack: () => void;
  onStartRun: (routeId: string) => void;
}

export interface RunScreenProps {
  routeId: string;
  onExitRun: () => void;
}

export interface DirectoryScreenProps {
  onSelectRoute: (routeId: string) => void;
}
