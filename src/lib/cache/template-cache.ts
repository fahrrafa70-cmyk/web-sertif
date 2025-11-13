/**
 * Template Image Cache System
 * Prevents re-rendering of already loaded template thumbnails
 */

interface CachedTemplate {
  id: string;
  url: string;
  loadedAt: number;
  isOptimized: boolean;
}

class TemplateImageCache {
  private cache = new Map<string, CachedTemplate>();
  private readonly CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

  // Check if template image is cached and still valid
  isCached(templateId: string): boolean {
    const cached = this.cache.get(templateId);
    if (!cached) return false;
    
    const now = Date.now();
    const isExpired = now - cached.loadedAt > this.CACHE_DURATION;
    
    if (isExpired) {
      this.cache.delete(templateId);
      return false;
    }
    
    return true;
  }

  // Get cached template URL
  getCachedUrl(templateId: string): string | null {
    const cached = this.cache.get(templateId);
    return cached?.url || null;
  }

  // Cache template image URL
  cacheTemplate(templateId: string, url: string, isOptimized: boolean = false): void {
    this.cache.set(templateId, {
      id: templateId,
      url,
      loadedAt: Date.now(),
      isOptimized
    });
  }

  // Check if template has optimized thumbnail cached
  hasOptimizedThumbnail(templateId: string): boolean {
    const cached = this.cache.get(templateId);
    return cached?.isOptimized || false;
  }

  // Clear cache for specific template (when updated)
  clearTemplate(templateId: string): void {
    this.cache.delete(templateId);
  }

  // Clear all cache
  clearAll(): void {
    this.cache.clear();
  }

  // Get cache stats
  getStats() {
    const now = Date.now();
    const total = this.cache.size;
    const optimized = Array.from(this.cache.values()).filter(c => c.isOptimized).length;
    const expired = Array.from(this.cache.values()).filter(c => 
      now - c.loadedAt > this.CACHE_DURATION
    ).length;

    return {
      total,
      optimized,
      expired,
      hitRate: total > 0 ? Math.round((optimized / total) * 100) : 0
    };
  }

  // Preload template images for better UX
  async preloadImages(templateUrls: string[]): Promise<void> {
    const promises = templateUrls.slice(0, 5).map(url => { // Only preload first 5
      return new Promise<void>((resolve) => {
        const img = new Image();
        img.onload = () => resolve();
        img.onerror = () => resolve(); // Don't fail on error
        img.src = url;
      });
    });

    try {
      await Promise.all(promises);
      console.log(`✅ Preloaded ${promises.length} template images`);
    } catch (error) {
      console.warn('⚠️ Some images failed to preload:', error);
    }
  }
}

// Singleton instance
export const templateImageCache = new TemplateImageCache();

// Browser storage backup for persistence across page reloads
export const persistentCache = {
  save: (templateId: string, url: string, isOptimized: boolean) => {
    try {
      const data = { url, isOptimized, cachedAt: Date.now() };
      localStorage.setItem(`template_cache_${templateId}`, JSON.stringify(data));
    } catch (error) {
      console.warn('Failed to save to localStorage:', error);
    }
  },

  load: (templateId: string): { url: string; isOptimized: boolean } | null => {
    try {
      const stored = localStorage.getItem(`template_cache_${templateId}`);
      if (!stored) return null;

      const data = JSON.parse(stored);
      const age = Date.now() - data.cachedAt;
      const maxAge = 24 * 60 * 60 * 1000; // 24 hours

      if (age > maxAge) {
        localStorage.removeItem(`template_cache_${templateId}`);
        return null;
      }

      return { url: data.url, isOptimized: data.isOptimized };
    } catch (error) {
      console.warn('Failed to load from localStorage:', error);
      return null;
    }
  },

  clear: (templateId?: string) => {
    try {
      if (templateId) {
        localStorage.removeItem(`template_cache_${templateId}`);
      } else {
        // Clear all template cache
        const keys = Object.keys(localStorage).filter(key => 
          key.startsWith('template_cache_')
        );
        keys.forEach(key => localStorage.removeItem(key));
      }
    } catch (error) {
      console.warn('Failed to clear localStorage:', error);
    }
  }
};

// Hook for React components
export const useTemplateImageCache = () => {
  return {
    isCached: templateImageCache.isCached.bind(templateImageCache),
    getCachedUrl: templateImageCache.getCachedUrl.bind(templateImageCache),
    cacheTemplate: templateImageCache.cacheTemplate.bind(templateImageCache),
    hasOptimizedThumbnail: templateImageCache.hasOptimizedThumbnail.bind(templateImageCache),
    clearTemplate: templateImageCache.clearTemplate.bind(templateImageCache),
    getStats: templateImageCache.getStats.bind(templateImageCache),
    preloadImages: templateImageCache.preloadImages.bind(templateImageCache)
  };
};
