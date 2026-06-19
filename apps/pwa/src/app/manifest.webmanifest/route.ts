import { NextResponse } from 'next/server';

/** PWA web app manifest. */
export function GET() {
  return NextResponse.json({
    name: 'VS Remote Chat',
    short_name: 'VS Remote',
    description: 'Drive your VS Code Copilot Chat from your phone — end-to-end encrypted.',
    start_url: '/app',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#06060b',
    theme_color: '#06060b',
    categories: ['developer', 'productivity'],
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    shortcuts: [
      { name: 'New chat', url: '/app?new=1' },
      { name: 'Pair a device', url: '/pair' },
    ],
  });
}
