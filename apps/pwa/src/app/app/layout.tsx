'use client';

import { useEffect } from 'react';

/**
 * The /app route is a fixed-viewport application shell: the page itself never
 * scrolls, only inner regions do. We toggle a class on <html> so marketing pages
 * keep normal scrolling.
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    document.documentElement.classList.add('app-locked');
    return () => document.documentElement.classList.remove('app-locked');
  }, []);
  return <>{children}</>;
}
