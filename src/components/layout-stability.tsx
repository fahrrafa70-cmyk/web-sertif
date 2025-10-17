"use client";

import { useEffect } from 'react';

/**
 * Layout Stability Component
 * 
 * This component ensures absolute zero layout shifts by:
 * 1. Preventing any scroll behavior changes
 * 2. Maintaining consistent scrollbar presence
 * 3. Preserving page dimensions and positioning
 * 4. Using visual overlays instead of layout modifications
 * 5. Actively preventing Radix UI modifications
 */
export function LayoutStability() {
  useEffect(() => {
    // Ensure scrollbar is always visible and consistent
    const ensureScrollbarStability = () => {
      const html = document.documentElement;
      const body = document.body;
      
      // Force scrollbar to always be visible
      html.style.overflowY = 'scroll';
      body.style.overflowY = 'scroll';
      
      // Prevent any height changes
      html.style.minHeight = '100vh';
      html.style.maxHeight = '100vh';
      body.style.minHeight = '100vh';
      body.style.maxHeight = '100vh';
      
      // Ensure scrollbar gutter is stable
      html.style.scrollbarGutter = 'stable both-edges';
      body.style.scrollbarGutter = 'stable both-edges';
      
      // Override any Radix UI modifications
      html.style.paddingRight = '0px';
      html.style.marginRight = '0px';
      body.style.paddingRight = '0px';
      body.style.marginRight = '0px';
      
      // Prevent any transitions that could cause shifts
      html.style.transition = 'none';
      body.style.transition = 'none';
    };

    // Apply stability immediately
    ensureScrollbarStability();

    // Monitor for any style mutations and prevent them
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
          const target = mutation.target as HTMLElement;
          if (target === document.documentElement || target === document.body) {
            // Reapply our stability rules if something tries to modify them
            ensureScrollbarStability();
          }
        }
      });
    });

    // Start observing
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['style', 'class']
    });
    
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ['style', 'class']
    });

    // Reapply on window resize to maintain stability
    const handleResize = () => {
      ensureScrollbarStability();
    };

    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return null; // This component doesn't render anything
}

/**
 * Enhanced scroll prevention hook that uses visual overlays
 * instead of modifying body scroll behavior
 */
export function useVisualScrollLock(lock: boolean) {
  useEffect(() => {
    if (lock) {
      // Create a visual overlay to prevent scrolling
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
      
      // Prevent scroll events
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
