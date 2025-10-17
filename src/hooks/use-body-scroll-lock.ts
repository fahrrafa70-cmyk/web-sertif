"use client";

import { useEffect } from 'react';

/**
 * Visual Scroll Lock Hook
 * 
 * This hook prevents scrolling using visual overlays instead of
 * modifying body scroll behavior, ensuring zero layout shifts.
 */
export function useBodyScrollLock(lock: boolean) {
  useEffect(() => {
    if (lock) {
      // Create a visual overlay to prevent scrolling instead of changing body overflow
      const overlay = document.createElement('div');
      overlay.className = 'visual-scroll-lock-overlay';
      overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        z-index: 9999;
        pointer-events: auto;
        background: transparent;
      `;
      
      // Add overlay to body
      document.body.appendChild(overlay);
      
      // Prevent scroll events on the overlay
      const preventScroll = (e: Event) => {
        e.preventDefault();
        e.stopPropagation();
        return false;
      };
      
      overlay.addEventListener('wheel', preventScroll, { passive: false });
      overlay.addEventListener('touchmove', preventScroll, { passive: false });
      overlay.addEventListener('scroll', preventScroll, { passive: false });
      
      // Cleanup function
      return () => {
        overlay.removeEventListener('wheel', preventScroll);
        overlay.removeEventListener('touchmove', preventScroll);
        overlay.removeEventListener('scroll', preventScroll);
        if (document.body.contains(overlay)) {
          document.body.removeChild(overlay);
        }
      };
    }
  }, [lock]);
}
