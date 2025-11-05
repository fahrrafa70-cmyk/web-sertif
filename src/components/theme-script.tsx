"use client";

import { useEffect } from "react";

export function ThemeScript() {
  useEffect(() => {
    // This ensures the theme is applied immediately on client-side navigation
    // The blocking script in layout.tsx handles initial page load
    const applyTheme = () => {
      try {
        const theme = localStorage.getItem('ecert-theme');
        const root = document.documentElement;
        let isDark = false;
        
        if (theme === 'light' || theme === 'dark') {
          isDark = theme === 'dark';
          if (!root.classList.contains(theme)) {
            root.classList.remove('light', 'dark');
            root.classList.add(theme);
          }
        } else {
          const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
          isDark = prefersDark;
          const defaultTheme = prefersDark ? 'dark' : 'light';
          if (!root.classList.contains(defaultTheme)) {
            root.classList.remove('light', 'dark');
            root.classList.add(defaultTheme);
          }
        }
        
        // Set inline background color immediately to prevent flash during navigation
        const bgColor = isDark ? 'rgb(17, 24, 39)' : 'rgb(249, 250, 251)';
        root.style.setProperty('background-color', bgColor, 'important');
        root.style.setProperty('color-scheme', isDark ? 'dark' : 'light', 'important');
        if (document.body) {
          document.body.style.setProperty('background-color', bgColor, 'important');
        }
        
        // Inject style tag for extra protection
        let styleEl = document.getElementById('theme-bg-inline-client');
        if (styleEl) styleEl.remove();
        styleEl = document.createElement('style');
        styleEl.id = 'theme-bg-inline-client';
        styleEl.textContent = `body{background-color:${bgColor}!important;}html{background-color:${bgColor}!important;}`;
        if (document.head) {
          document.head.appendChild(styleEl);
        }
      } catch {}
    };
    
    // Apply immediately
    applyTheme();
    
    // Also apply on route change (for Next.js navigation)
    const handleRouteChange = () => {
      setTimeout(applyTheme, 0);
    };
    
    // Listen for route changes
    if (typeof window !== 'undefined') {
      window.addEventListener('popstate', handleRouteChange);
      // Also check periodically during initial load
      const checkInterval = setInterval(() => {
        applyTheme();
        if (document.readyState === 'complete') {
          clearInterval(checkInterval);
        }
      }, 10);
      
      setTimeout(() => clearInterval(checkInterval), 1000);
      
      return () => {
        window.removeEventListener('popstate', handleRouteChange);
        clearInterval(checkInterval);
      };
    }
  }, []);

  return null;
}

