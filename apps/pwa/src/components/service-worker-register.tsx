'use client';

import { useEffect } from 'react';

/** Registers the PWA service worker for offline + push. */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        /* ignore registration failures (e.g. dev over http) */
      });
    }
  }, []);
  return null;
}
