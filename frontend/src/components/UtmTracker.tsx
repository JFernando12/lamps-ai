'use client';

import { useEffect } from 'react';
import { captureAttribution } from '@/lib/utm';

/**
 * Silent client component that captures UTM params + fbclid on every page visit.
 * Rendered inside RootLayout so it runs on every route.
 */
export function UtmTracker() {
  useEffect(() => {
    captureAttribution();
  }, []);
  return null;
}
