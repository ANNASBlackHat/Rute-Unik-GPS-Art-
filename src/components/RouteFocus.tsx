'use client';

import { useEffect } from 'react';
import { usePathname } from '@/i18n/routing';

export function RouteFocus() {
  const pathname = usePathname();
  useEffect(() => {
    const main = document.getElementById('main-content');
    if (main) {
      // move focus for screen readers without scrolling
      main.focus({ preventScroll: true });
    }
  }, [pathname]);
  return null;
}
