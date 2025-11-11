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
      
      // Get actual computed background color from body (which has bg-background applied)
      // This ensures we get the resolved color value, not the CSS variable
      const isDark = html.classList.contains('dark');
      let bgColor = getComputedStyle(body).backgroundColor;
      
      // FORCE use correct background color for scrollbar
      // Dark mode: Tailwind bg-gray-900 = rgb(17, 24, 39) (biru sangat tua mendekati gelap)
      // Light mode: oklch(1 0 0) = rgb(255, 255, 255) = white
      if (isDark) {
        // ALWAYS use dark blue-gray background RGB for dark mode - matching bg-gray-900
        // Tailwind gray-900 = rgb(17, 24, 39) - ini adalah biru sangat tua, bukan abu-abu
        // Check if computed is white or too light, then force dark blue-gray color
        const rgbMatch = bgColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
        if (rgbMatch) {
          const r = parseInt(rgbMatch[1]);
          const g = parseInt(rgbMatch[2]);
          const b = parseInt(rgbMatch[3]);
          // If it's white or too light (abu-abu), force dark blue-gray background
          if (r > 50 || g > 50 || b > 50) {
            bgColor = 'rgb(17, 24, 39)'; // Tailwind gray-900 - biru sangat tua mendekati gelap
          } else {
            // Use computed value if it's already dark blue-gray
            bgColor = `rgb(${r}, ${g}, ${b})`;
          }
        } else {
          // Fallback to dark blue-gray background
          bgColor = 'rgb(17, 24, 39)'; // Tailwind gray-900
        }
      } else {
        // Light mode: use white
        if (!bgColor || bgColor === 'rgba(0, 0, 0, 0)' || bgColor === 'transparent') {
          bgColor = 'rgb(255, 255, 255)'; // white for light mode
        } else {
          // Ensure it's white or light color
          const rgbMatch = bgColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
          if (rgbMatch) {
            const r = parseInt(rgbMatch[1]);
            const g = parseInt(rgbMatch[2]);
            const b = parseInt(rgbMatch[3]);
            if (r < 200 || g < 200 || b < 200) {
              bgColor = 'rgb(255, 255, 255)';
            } else {
              bgColor = `rgb(${r}, ${g}, ${b})`;
            }
          }
        }
      }
      
      // Set background color to prevent black gaps - use !important via setProperty
      html.style.setProperty('background-color', bgColor, 'important');
      html.style.setProperty('background', bgColor, 'important');
      body.style.setProperty('background-color', bgColor, 'important');
      body.style.setProperty('background', bgColor, 'important');
      
      // Set scrollbar track color to match background exactly
      // Use the same bgColor for scrollbar track to match website background
      const scrollbarThumbColor = isDark 
        ? 'rgb(75, 85, 99)' // gray-600 for dark mode - visible on dark background
        : 'rgb(156, 163, 175)'; // gray-400 for light mode - visible on white background
      const scrollbarThumbHoverColor = isDark
        ? 'rgb(107, 114, 128)' // gray-500 for dark mode hover
        : 'rgb(107, 114, 128)'; // gray-500 for light mode hover
      
      // Set Firefox scrollbar color
      html.style.setProperty('scrollbar-color', `${scrollbarThumbColor} ${bgColor}`, 'important');
      body.style.setProperty('scrollbar-color', `${scrollbarThumbColor} ${bgColor}`, 'important');
      
      // Inject style tag at the very end of head to ensure highest priority
      const styleId = 'scrollbar-override-style';
      let styleElement = document.getElementById(styleId) as HTMLStyleElement;
      if (styleElement) {
        styleElement.remove();
      }
      styleElement = document.createElement('style');
      styleElement.id = styleId;
      styleElement.setAttribute('data-scrollbar-fix', 'true');
      // Inject at the end of head for maximum priority
      document.head.appendChild(styleElement);
      
      // Ensure header border uses CSS variables for smooth transition
      // Don't set inline styles - let CSS transition handle it
      const headerElement = document.querySelector('header');
      if (headerElement) {
        const headerEl = headerElement as HTMLElement;
        // Remove any inline styles that might interfere with CSS transition
        headerEl.style.removeProperty('border');
        headerEl.style.removeProperty('border-bottom');
        headerEl.style.removeProperty('border-top');
        headerEl.style.removeProperty('border-left');
        headerEl.style.removeProperty('border-right');
        headerEl.style.removeProperty('border-width');
        headerEl.style.removeProperty('border-bottom-width');
        headerEl.style.removeProperty('border-color');
        headerEl.style.removeProperty('border-bottom-color');
      }
      
      // Use more aggressive selectors to ensure override - highest priority
      // FORCE use computed RGB color for scrollbar track - don't use CSS variable
      styleElement.textContent = `
        /* Header border uses CSS variables for instant change - NO FLICKER - NO TRANSITION */
        /* Border changes instantly without transition to prevent flicker */
        header {
          border-bottom-color: var(--border) !important;
          /* NO TRANSITION for border - instant change */
          transition-property: background-color, color !important;
          transition-timing-function: linear !important;
          transition-duration: 0.05s !important;
        }
        
        .dark header,
        header.dark {
          border-bottom-color: var(--background) !important;
          /* NO TRANSITION for border - instant change */
          transition-property: background-color, color !important;
          transition-timing-function: linear !important;
          transition-duration: 0.05s !important;
        }
        
        /* Ensure header children transit instantly */
        .dark header *,
        header * {
          transition-property: background-color, color !important;
          transition-timing-function: linear !important;
          transition-duration: 0.05s !important;
        }
        
        /* Force scrollbar track to match background - USE COMPUTED RGB COLOR */
        html::-webkit-scrollbar,
        body::-webkit-scrollbar,
        *::-webkit-scrollbar {
          width: 8px !important;
          height: 8px !important;
          background: ${bgColor} !important;
          background-color: ${bgColor} !important;
        }
        
        html::-webkit-scrollbar-track,
        body::-webkit-scrollbar-track,
        *::-webkit-scrollbar-track {
          background: ${bgColor} !important;
          background-color: ${bgColor} !important;
          -webkit-box-shadow: none !important;
          box-shadow: none !important;
          border: none !important;
        }
        
        html::-webkit-scrollbar-corner,
        body::-webkit-scrollbar-corner,
        *::-webkit-scrollbar-corner {
          background: ${bgColor} !important;
          background-color: ${bgColor} !important;
          border: none !important;
        }
        
        html::-webkit-scrollbar-thumb,
        body::-webkit-scrollbar-thumb,
        *::-webkit-scrollbar-thumb {
          background: ${scrollbarThumbColor} !important;
          background-color: ${scrollbarThumbColor} !important;
          border: none !important;
          border-radius: 4px !important;
        }
        
        html::-webkit-scrollbar-thumb:hover,
        body::-webkit-scrollbar-thumb:hover,
        *::-webkit-scrollbar-thumb:hover {
          background: ${scrollbarThumbHoverColor} !important;
          background-color: ${scrollbarThumbHoverColor} !important;
        }
        
        html::-webkit-scrollbar-button,
        body::-webkit-scrollbar-button,
        *::-webkit-scrollbar-button {
          display: none !important;
          background: ${bgColor} !important;
          background-color: ${bgColor} !important;
        }
        
        /* Also target with space selector for maximum coverage */
        html ::-webkit-scrollbar,
        body ::-webkit-scrollbar,
        * ::-webkit-scrollbar {
          width: 8px !important;
          height: 8px !important;
          background: ${bgColor} !important;
          background-color: ${bgColor} !important;
        }
        
        html ::-webkit-scrollbar-track,
        body ::-webkit-scrollbar-track,
        * ::-webkit-scrollbar-track {
          background: ${bgColor} !important;
          background-color: ${bgColor} !important;
          -webkit-box-shadow: none !important;
          box-shadow: none !important;
          border: none !important;
        }
        
        /* Firefox scrollbar - use computed RGB color */
        html, body, * {
          scrollbar-width: thin !important;
          scrollbar-color: ${scrollbarThumbColor} ${bgColor} !important;
        }
      `;
      
      // Ensure full width and height
      html.style.width = '100%';
      html.style.height = '100%';
      html.style.margin = '0';
      html.style.padding = '0';
      body.style.width = '100%';
      body.style.height = '100%';
      body.style.margin = '0';
      
      // Only body scrolls - prevent double scrollbar
      html.style.overflowY = 'hidden';
      body.style.overflowY = 'auto';
      
      // Prevent any height changes
      html.style.minHeight = '100vh';
      html.style.maxHeight = '100vh';
      body.style.minHeight = '100vh';
      body.style.maxHeight = '100vh';
      
      // Remove scrollbar gutter to prevent white space
      html.style.scrollbarGutter = 'auto';
      body.style.scrollbarGutter = 'auto';
      
      // Override any Radix UI modifications
      html.style.paddingRight = '0px';
      html.style.marginRight = '0px';
      body.style.paddingRight = '0px';
      body.style.marginRight = '0px';
      
      // Prevent any transitions that could cause shifts
      html.style.transition = 'none';
      body.style.transition = 'none';
    };

    // Apply stability immediately and also after a short delay to ensure DOM is ready
    ensureScrollbarStability();
    
    // Apply again after DOM is fully ready
    requestAnimationFrame(() => {
      ensureScrollbarStability();
      setTimeout(() => ensureScrollbarStability(), 100);
    });

    // Monitor for any style mutations and prevent them
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
          const target = mutation.target as HTMLElement;
          if (target === document.documentElement || target === document.body) {
            // Reapply our stability rules if something tries to modify them
            requestAnimationFrame(() => ensureScrollbarStability());
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
    
    // Also monitor theme changes (when dark class is added/removed from html)
    const themeObserver = new MutationObserver(() => {
      requestAnimationFrame(() => {
        ensureScrollbarStability();
        // Don't set inline styles on header border - let CSS transition handle it smoothly
        // This prevents flicker during theme switching
        const headerEl = document.querySelector('header');
        if (headerEl) {
          const el = headerEl as HTMLElement;
          // Remove any inline styles that might interfere with CSS transition
          el.style.removeProperty('border');
          el.style.removeProperty('border-bottom');
          el.style.removeProperty('border-top');
          el.style.removeProperty('border-left');
          el.style.removeProperty('border-right');
          el.style.removeProperty('border-width');
          el.style.removeProperty('border-bottom-width');
          el.style.removeProperty('border-color');
          el.style.removeProperty('border-bottom-color');
        }
      });
    });
    
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    });

    // Reapply on window resize to maintain stability
    const handleResize = () => {
      requestAnimationFrame(() => ensureScrollbarStability());
    };

    window.addEventListener('resize', handleResize);
    
    // Also reapply periodically to catch any missed updates (every 2 seconds)
    const intervalId = setInterval(() => {
      ensureScrollbarStability();
      // Remove any inline styles from header that might interfere with CSS transition
      const headerEl = document.querySelector('header');
      if (headerEl) {
        const el = headerEl as HTMLElement;
        el.style.removeProperty('border');
        el.style.removeProperty('border-bottom');
        el.style.removeProperty('border-top');
        el.style.removeProperty('border-left');
        el.style.removeProperty('border-right');
        el.style.removeProperty('border-width');
        el.style.removeProperty('border-bottom-width');
        el.style.removeProperty('border-color');
        el.style.removeProperty('border-bottom-color');
      }
    }, 2000);

    // Cleanup
    return () => {
      observer.disconnect();
      themeObserver.disconnect();
      window.removeEventListener('resize', handleResize);
      clearInterval(intervalId);
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
