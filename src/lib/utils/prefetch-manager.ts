/**
 * Intelligent prefetching manager for navigation optimization
 * Prefetches likely next pages and data based on user behavior
 */

import { useRouter } from 'next/navigation';
import { useEffect, useCallback, useRef } from 'react';
import { queryClient, prefetchQueries } from '@/lib/react-query/client';

interface PrefetchConfig {
  routes: string[];
  delay?: number;
  priority?: 'high' | 'low';
  condition?: () => boolean;
}

class PrefetchManager {
  private prefetchedRoutes = new Set<string>();
  private prefetchQueue: Array<{ route: string; priority: 'high' | 'low' }> = [];
  private isProcessing = false;

  /**
   * Prefetch a route with Next.js router
   */
  async prefetchRoute(router: any, route: string, priority: 'high' | 'low' = 'low') {
    if (this.prefetchedRoutes.has(route)) return;

    try {
      await router.prefetch(route);
      this.prefetchedRoutes.add(route);
      console.log(`🚀 Prefetched route: ${route}`);
    } catch (error) {
      console.warn(`Failed to prefetch route ${route}:`, error);
    }
  }

  /**
   * Add route to prefetch queue
   */
  queuePrefetch(route: string, priority: 'high' | 'low' = 'low') {
    if (this.prefetchedRoutes.has(route)) return;

    // Remove existing entry for this route
    this.prefetchQueue = this.prefetchQueue.filter(item => item.route !== route);
    
    // Add to queue with priority
    if (priority === 'high') {
      this.prefetchQueue.unshift({ route, priority });
    } else {
      this.prefetchQueue.push({ route, priority });
    }

    this.processQueue();
  }

  /**
   * Process prefetch queue with throttling
   */
  private async processQueue() {
    if (this.isProcessing || this.prefetchQueue.length === 0) return;

    this.isProcessing = true;

    while (this.prefetchQueue.length > 0) {
      const { route } = this.prefetchQueue.shift()!;
      
      // Only prefetch if not already done
      if (!this.prefetchedRoutes.has(route)) {
        try {
          // Use dynamic import to prefetch the page
          await import(/* webpackMode: "lazy" */ `@/app${route}/page`);
          this.prefetchedRoutes.add(route);
          console.log(`📦 Prefetched page: ${route}`);
        } catch (error) {
          // Route might not exist or be dynamic, that's okay
          console.debug(`Could not prefetch ${route}:`, error);
        }
      }

      // Throttle prefetching to avoid overwhelming the browser
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    this.isProcessing = false;
  }

  /**
   * Clear prefetch cache
   */
  clear() {
    this.prefetchedRoutes.clear();
    this.prefetchQueue = [];
  }
}

// Singleton instance
export const prefetchManager = new PrefetchManager();

/**
 * Hook for intelligent route prefetching
 */
export function usePrefetch(config: PrefetchConfig) {
  const router = useRouter();
  const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  const prefetchRoutes = useCallback(() => {
    if (config.condition && !config.condition()) return;

    const delay = config.delay || 0;
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      config.routes.forEach(route => {
        prefetchManager.queuePrefetch(route, config.priority);
        prefetchManager.prefetchRoute(router, route, config.priority);
      });
    }, delay);
  }, [router, config]);

  useEffect(() => {
    prefetchRoutes();
    
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [prefetchRoutes]);

  return {
    prefetchRoute: (route: string) => prefetchManager.prefetchRoute(router, route, 'high'),
    prefetchData: prefetchQueries,
  };
}

/**
 * Hook for hover-based prefetching
 */
export function useHoverPrefetch() {
  const router = useRouter();

  return useCallback((route: string) => {
    return {
      onMouseEnter: () => {
        prefetchManager.prefetchRoute(router, route, 'high');
      },
    };
  }, [router]);
}

/**
 * Smart prefetching based on current page
 */
export function useSmartPrefetch(currentPath: string) {
  const prefetchConfig = getPrefetchConfigForPath(currentPath);
  
  usePrefetch(prefetchConfig);
}

/**
 * Get prefetch configuration based on current path
 */
function getPrefetchConfigForPath(path: string): PrefetchConfig {
  // Homepage - prefetch main sections
  if (path === '/') {
    return {
      routes: ['/search', '/certificates', '/members', '/templates'],
      delay: 2000, // Wait 2 seconds after page load
      priority: 'low',
    };
  }

  // Search page - prefetch certificate details
  if (path.startsWith('/search')) {
    return {
      routes: ['/certificates', '/members'],
      delay: 1000,
      priority: 'low',
    };
  }

  // Certificates page - prefetch related pages
  if (path.startsWith('/certificates')) {
    return {
      routes: ['/members', '/templates', '/search'],
      delay: 1500,
      priority: 'low',
    };
  }

  // Members page - prefetch certificates
  if (path.startsWith('/members')) {
    return {
      routes: ['/certificates', '/templates'],
      delay: 1500,
      priority: 'low',
    };
  }

  // Templates page - prefetch certificates
  if (path.startsWith('/templates')) {
    return {
      routes: ['/certificates', '/members'],
      delay: 1500,
      priority: 'low',
    };
  }

  // Default - no prefetching
  return {
    routes: [],
  };
}

/**
 * Data prefetching strategies
 */
export const dataPrefetchStrategies = {
  /**
   * Prefetch certificate categories (commonly used)
   */
  certificateCategories: () => {
    prefetchQueries.certificates.categories();
  },

  /**
   * Prefetch template categories
   */
  templateCategories: () => {
    prefetchQueries.templates.categories();
  },

  /**
   * Prefetch user's recent certificates
   */
  recentCertificates: (memberId?: string) => {
    if (memberId) {
      queryClient.prefetchQuery({
        queryKey: ['certificates', 'member', memberId, 'recent'],
        queryFn: async () => {
          const { getCertificatesByMember } = await import('@/lib/supabase/certificates');
          const certificates = await getCertificatesByMember(memberId);
          return certificates.slice(0, 10); // Only recent 10
        },
        staleTime: 5 * 60 * 1000,
      });
    }
  },

  /**
   * Prefetch popular templates
   */
  popularTemplates: () => {
    queryClient.prefetchQuery({
      queryKey: ['templates', 'popular'],
      queryFn: async () => {
        // Implement popular templates fetching
        return [];
      },
      staleTime: 30 * 60 * 1000, // 30 minutes
    });
  },
};

/**
 * Initialize prefetching based on user authentication
 */
export function initializePrefetching(user?: { id: string; role: string }) {
  // Always prefetch categories
  dataPrefetchStrategies.certificateCategories();
  dataPrefetchStrategies.templateCategories();

  if (user) {
    // Prefetch user-specific data
    dataPrefetchStrategies.recentCertificates(user.id);
    
    if (user.role === 'admin' || user.role === 'team') {
      // Prefetch admin-specific data
      dataPrefetchStrategies.popularTemplates();
    }
  }
}
