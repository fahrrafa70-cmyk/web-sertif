"use client";

import { useEffect } from "react";

/**
 * Component to hide scrollbar when content doesn't exceed viewport height
 * Shows scrollbar only when content actually needs scrolling
 * This applies to all pages automatically
 */
export function ScrollbarVisibility() {
  useEffect(() => {
    const checkScrollbar = () => {
      const body = document.body;
      const html = document.documentElement;
      
      // Get viewport height (visible area)
      const viewportHeight = window.innerHeight;
      
      // Get actual content height (full scrollable content)
      // Use scrollHeight which represents the full scrollable content height
      const contentHeight = Math.max(
        body.scrollHeight,
        html.scrollHeight
      );
      
      // Get client height (visible area without scrollbar)
      const clientHeight = Math.max(
        body.clientHeight,
        html.clientHeight,
        viewportHeight
      );
      
      // Show scrollbar only if scrollable content exceeds visible area
      // Add threshold (5px) to account for rounding errors and padding
      // This ensures scrollbar only appears when content truly exceeds viewport
      const needsScrollbar = contentHeight > clientHeight + 5;
      
      // Apply class to body
      if (needsScrollbar) {
        body.classList.add('show-scrollbar');
        body.classList.remove('hide-scrollbar');
      } else {
        body.classList.add('hide-scrollbar');
        body.classList.remove('show-scrollbar');
      }
    };

    // Check on mount with delay to ensure DOM is ready
    // Use multiple checks to catch all scenarios (including async content loading)
    const timeoutId1 = setTimeout(checkScrollbar, 100);
    const timeoutId2 = setTimeout(checkScrollbar, 500);
    const timeoutId3 = setTimeout(checkScrollbar, 1000);
    const timeoutId4 = setTimeout(checkScrollbar, 2000);
    
    // Check after browser paint using requestAnimationFrame
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        checkScrollbar();
      });
    });
    
    // Check when page is fully loaded (including images and async content)
    if (document.readyState === 'complete') {
      checkScrollbar();
    } else {
      window.addEventListener('load', checkScrollbar);
    }
    
    // Check on resize
    window.addEventListener('resize', checkScrollbar);
    
    // Check on content changes (using MutationObserver)
    let debounceTimer: NodeJS.Timeout | null = null;
    const observer = new MutationObserver(() => {
      // Debounce the check to avoid excessive calls
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(checkScrollbar, 200);
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['style', 'class'],
    });

    // Also check periodically to catch dynamic content changes
    const intervalId = setInterval(checkScrollbar, 2000);

    return () => {
      clearTimeout(timeoutId1);
      clearTimeout(timeoutId2);
      clearTimeout(timeoutId3);
      clearTimeout(timeoutId4);
      if (debounceTimer) clearTimeout(debounceTimer);
      window.removeEventListener('resize', checkScrollbar);
      window.removeEventListener('load', checkScrollbar);
      observer.disconnect();
      clearInterval(intervalId);
    };
  }, []);

  return null;
}

