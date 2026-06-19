import type { Metadata, Viewport } from 'next';
import { Toaster } from 'sonner';
import { CookieConsent } from '@/components/cookie-consent';
import { ServiceWorkerRegister } from '@/components/service-worker-register';
import './globals.css';

export const metadata: Metadata = {
  title: 'VS Remote Chat',
  description: 'Drive your VS Code Copilot Chat from your phone — end-to-end encrypted.',
  applicationName: 'VS Remote Chat',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    title: 'VS Remote Chat',
    statusBarStyle: 'black-translucent',
  },
  icons: {
    icon: '/icons/icon-192.png',
    apple: '/icons/icon-192.png',
  },
};

export const viewport: Viewport = {
  themeColor: '#06060b',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        {children}
        <Toaster
          theme="dark"
          position="top-center"
          toastOptions={{
            style: {
              background: 'rgba(20,20,32,0.7)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(140,130,255,0.2)',
              color: '#e7e7ff',
            },
          }}
        />
        <CookieConsent />
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
