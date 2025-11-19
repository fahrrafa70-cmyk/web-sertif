"use client";

import { useEffect, useRef } from "react";

export function ThemeScript() {
  const isInitialLoad = useRef(true);

  useEffect(() => {
    // This ensures the theme is applied immediately on client-side navigation
    // The blocking script in layout.tsx handles initial page load
    const applyTheme = (isInitial: boolean = false) => {
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
          // Default to light theme (ignore system preference)
          isDark = false;
          const defaultTheme = 'light';
          if (!root.classList.contains(defaultTheme)) {
            root.classList.remove('light', 'dark');
            root.classList.add(defaultTheme);
          }
        }
        
        // Set color-scheme for browser native dark mode support
        root.style.setProperty('color-scheme', isDark ? 'dark' : 'light', 'important');
        
        // Only set inline styles on initial load to prevent FOUC
        // On theme switching, let CSS transition handle the change smoothly
        if (isInitial) {
          // This is initial load, set inline to prevent flash
          const bgColor = isDark ? 'rgb(17, 24, 39)' : 'rgb(249, 250, 251)';
          root.style.setProperty('background-color', bgColor, 'important');
          if (document.body) {
            document.body.style.setProperty('background-color', bgColor, 'important');
          }
          
          // Inject style tag for extra protection on initial load
          let styleEl = document.getElementById('theme-bg-inline-client');
          if (styleEl) styleEl.remove();
          styleEl = document.createElement('style');
          styleEl.id = 'theme-bg-inline-client';
          styleEl.textContent = `body{background-color:${bgColor}!important;}html{background-color:${bgColor}!important;}`;
          if (document.head) {
            document.head.appendChild(styleEl);
          }
        } else {
          // On theme switching, remove inline styles to allow CSS transition
          root.style.removeProperty('background-color');
          if (document.body) {
            document.body.style.removeProperty('background-color');
          }
        }
      } catch {}
    };
    
    // Apply immediately on initial load
    if (isInitialLoad.current) {
      applyTheme(true);
      isInitialLoad.current = false;
    }
    
    // Also apply on route change (for Next.js navigation) - without inline styles
    const handleRouteChange = () => {
      setTimeout(() => applyTheme(false), 0);
    };
    
    // Listen for route changes
    if (typeof window !== 'undefined') {
      window.addEventListener('popstate', handleRouteChange);
      
      return () => {
        window.removeEventListener('popstate', handleRouteChange);
      };
    }
  }, []);

  return null;
}

