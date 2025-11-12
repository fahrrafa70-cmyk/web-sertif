"use client";

import { useEffect } from 'react';
import { PWAInstallPrompt, NetworkStatusIndicator } from './pwa-install-prompt';

/**
 * PWA Integration Component
 * Add this to your layout.tsx to enable PWA features
 */
export function PWAIntegration() {
  useEffect(() => {
    // Initialize PWA manager
    if (typeof window !== 'undefined') {
      import('@/lib/pwa/service-worker').then(() => {
        console.log('✅ PWA initialized');
      }).catch((error) => {
        console.error('❌ PWA initialization failed:', error);
      });
    }
  }, []);

  return (
    <>
      <PWAInstallPrompt />
      <NetworkStatusIndicator />
    </>
  );
}

/**
 * PWA Meta Tags Component
 * Use this to get the correct meta tags for your layout
 */
export function getPWAMetaTags() {
  return {
    manifest: "/manifest.json",
    themeColor: "#3b82f6",
    appleWebAppCapable: "yes",
    appleWebAppStatusBarStyle: "default",
    appleWebAppTitle: "E-Certificate",
    appleTouchIcon: "/icon-192x192.png",
    icon: "/icon-192x192.png"
  };
}

/**
 * Example usage in layout.tsx:
 * 
 * import { PWAIntegration, getPWAMetaTags } from '@/components/pwa-layout-integration';
 * 
 * const pwaMetaTags = getPWAMetaTags();
 * 
 * export default function RootLayout({ children }) {
 *   return (
 *     <html>
 *       <head>
 *         <link rel="manifest" href={pwaMetaTags.manifest} />
 *         <meta name="theme-color" content={pwaMetaTags.themeColor} />
 *         <meta name="apple-mobile-web-app-capable" content={pwaMetaTags.appleWebAppCapable} />
 *         <meta name="apple-mobile-web-app-status-bar-style" content={pwaMetaTags.appleWebAppStatusBarStyle} />
 *         <meta name="apple-mobile-web-app-title" content={pwaMetaTags.appleWebAppTitle} />
 *         <link rel="apple-touch-icon" href={pwaMetaTags.appleTouchIcon} />
 *         <link rel="icon" type="image/png" sizes="192x192" href={pwaMetaTags.icon} />
 *       </head>
 *       <body>
 *         {children}
 *         <PWAIntegration />
 *       </body>
 *     </html>
 *   );
 * }
 */
