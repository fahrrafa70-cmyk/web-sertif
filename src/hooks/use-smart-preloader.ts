import { useEffect, useRef, useCallback } from 'react';
import { Template, getTemplatePreviewUrl } from '@/lib/supabase/templates';

interface UseSmartPreloaderOptions {
  templates: Template[];
  currentPage?: number;
  itemsPerPage?: number;
  preloadDistance?: number; // How many items ahead to preload
  maxConcurrentPreloads?: number;
}

/**
 * Smart preloader hook for template images
 * Preloads images based on scroll position and user behavior
 */
export function useSmartPreloader({
  templates,
  currentPage = 0,
  itemsPerPage = 12,
  preloadDistance = 6,
  maxConcurrentPreloads = 3
}: UseSmartPreloaderOptions) {
  const preloadedUrls = useRef(new Set<string>());
  const preloadQueue = useRef<string[]>([]);
  const activePreloads = useRef(0);

  // Preload image function with concurrency control
  const preloadImage = useCallback(async (url: string): Promise<void> => {
    if (preloadedUrls.current.has(url) || activePreloads.current >= maxConcurrentPreloads) {
      return;
    }

    activePreloads.current++;
    preloadedUrls.current.add(url);

    return new Promise((resolve) => {
      const img = new Image();
      
      const cleanup = () => {
        activePreloads.current--;
        resolve();
        
        // Process next item in queue
        if (preloadQueue.current.length > 0) {
          const nextUrl = preloadQueue.current.shift();
          if (nextUrl) {
            preloadImage(nextUrl);
          }
        }
      };

      img.onload = cleanup;
      img.onerror = cleanup;
      
      // Set src to start loading
      img.src = url;
      
      // Timeout after 10 seconds
      setTimeout(cleanup, 10000);
    });
  }, [maxConcurrentPreloads]);

  // Queue image for preloading
  const queuePreload = useCallback((url: string) => {
    if (preloadedUrls.current.has(url)) return;
    
    if (activePreloads.current < maxConcurrentPreloads) {
      preloadImage(url);
    } else {
      if (!preloadQueue.current.includes(url)) {
        preloadQueue.current.push(url);
      }
    }
  }, [preloadImage, maxConcurrentPreloads]);

  // Preload templates based on current position
  const preloadTemplatesAhead = useCallback((startIndex: number) => {
    const endIndex = Math.min(startIndex + preloadDistance, templates.length);
    
    for (let i = startIndex; i < endIndex; i++) {
      const template = templates[i];
      if (template) {
        const url = getTemplatePreviewUrl(template);
        if (url) {
          queuePreload(url);
        }
      }
    }
  }, [templates, preloadDistance, queuePreload]);

  // Preload next page templates
  const preloadNextPage = useCallback(() => {
    const nextPageStart = (currentPage + 1) * itemsPerPage;
    preloadTemplatesAhead(nextPageStart);
  }, [currentPage, itemsPerPage, preloadTemplatesAhead]);

  // Preload templates when scroll approaches bottom
  const handleScroll = useCallback(() => {
    const scrollPosition = window.scrollY + window.innerHeight;
    const documentHeight = document.documentElement.scrollHeight;
    const scrollPercentage = scrollPosition / documentHeight;

    // Start preloading when 70% scrolled
    if (scrollPercentage > 0.7) {
      preloadNextPage();
    }
  }, [preloadNextPage]);

  // Set up scroll listener
  useEffect(() => {
    const throttledScroll = throttle(handleScroll, 200);
    window.addEventListener('scroll', throttledScroll, { passive: true });
    
    return () => {
      window.removeEventListener('scroll', throttledScroll);
    };
  }, [handleScroll]);

  // Preload initial batch of next templates
  useEffect(() => {
    const currentPageEnd = (currentPage + 1) * itemsPerPage;
    preloadTemplatesAhead(currentPageEnd);
  }, [currentPage, itemsPerPage, preloadTemplatesAhead]);

  // Manual preload function for specific templates
  const preloadTemplate = useCallback((template: Template) => {
    const url = getTemplatePreviewUrl(template);
    if (url) {
      queuePreload(url);
    }
  }, [queuePreload]);

  // Preload templates on hover (for template cards)
  const preloadOnHover = useCallback((template: Template) => {
    preloadTemplate(template);
  }, [preloadTemplate]);

  // Get preload stats
  const getStats = useCallback(() => {
    return {
      preloadedCount: preloadedUrls.current.size,
      queueLength: preloadQueue.current.length,
      activePreloads: activePreloads.current,
      maxConcurrent: maxConcurrentPreloads
    };
  }, [maxConcurrentPreloads]);

  return {
    preloadTemplate,
    preloadOnHover,
    preloadNextPage,
    getStats
  };
}

// Throttle utility function
function throttle<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout | null = null;
  let lastExecTime = 0;
  
  return (...args: Parameters<T>) => {
    const currentTime = Date.now();
    
    if (currentTime - lastExecTime > delay) {
      func(...args);
      lastExecTime = currentTime;
    } else {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        func(...args);
        lastExecTime = Date.now();
      }, delay - (currentTime - lastExecTime));
    }
  };
}
