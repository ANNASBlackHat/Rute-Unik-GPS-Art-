import React from 'react';
import {
  MapPinned,
  Map as MapIcon,
  Download,
  PersonStanding,
  Film,
  AlertTriangle,
  Loader2,
  Search,
  Menu,
  X,
  Play,
  Pause,
  RotateCcw,
  Mountain,
  Timer,
  Ruler,
  Navigation,
  Layers,
  Satellite,
  Upload,
  FileWarning,
} from 'lucide-react';

export const Icons = {
  MapPinned,
  MapIcon,
  Download,
  PersonStanding,
  Film,
  AlertTriangle,
  Loader2,
  Search,
  Menu,
  X,
  Play,
  Pause,
  RotateCcw,
  Mountain,
  Timer,
  Ruler,
  Navigation,
  Layers,
  Satellite,
  Upload,
  FileWarning,
};

export type IconName = keyof typeof Icons;

interface IconProps {
  name: IconName;
  className?: string;
  size?: number;
  strokeWidth?: number;
  ariaHidden?: boolean;
}

export function Icon({ name, className, size = 16, strokeWidth = 1.5, ariaHidden = true }: IconProps) {
  const Cmp = Icons[name];
  if (!Cmp) return null;
  return <Cmp className={className} size={size} strokeWidth={strokeWidth} aria-hidden={ariaHidden} />;
}
