/**
 * Advanced Template Image Caching System
 * Provides multi-layer caching with smart invalidation
 */

interface CachedImage {
  url: string;
  timestamp: number;
  size: string;
  format: 'webp' | 'jpeg' | 'png';
  loadTime?: number;
}

interface TemplateImageCache {
  [templateId: string]: {
    [size: string]: CachedImage;
  };
}

class TemplateImageCacheManager {
  private cache: TemplateImageCache = {};
  private readonly CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours
  private readonly MAX_CACHE_SIZE = 500; // Max templates to cache
  private readonly STORAGE_KEY = 'template-image-cache-v2';

  constructor() {
    this.loadFromStorage();
    this.startCleanupInterval();
  }

  /**
   * Get cached image URL
   */
  get(templateId: string, size: string): string | null {
    const templateCache = this.cache[templateId];
    if (!templateCache) return null;

    const cachedImage = templateCache[size];
    if (!cachedImage) return null;

    // Check if cache is still valid
    if (Date.now() - cachedImage.timestamp > this.CACHE_TTL) {
      delete templateCache[size];
      if (Object.keys(templateCache).length === 0) {
        delete this.cache[templateId];
      }
      this.saveToStorage();
      return null;
    }

    return cachedImage.url;
  }

  /**
   * Set cached image URL
   */
  set(templateId: string, size: string, url: string, format: 'webp' | 'jpeg' | 'png' = 'webp'): void {
    if (!this.cache[templateId]) {
      this.cache[templateId] = {};
    }

    this.cache[templateId][size] = {
      url,
      timestamp: Date.now(),
      size,
      format
    };

    // Cleanup if cache is too large
    this.enforceMaxSize();
    this.saveToStorage();
  }

  /**
   * Prefetch image and cache it
   */
  async prefetch(templateId: string, size: string, url: string): Promise<void> {
    const startTime = Date.now();
    
    try {
      // Create image element for prefetching
      const img = new Image();
      
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = url;
      });

      const loadTime = Date.now() - startTime;
      
      // Cache the successfully loaded image
      if (!this.cache[templateId]) {
        this.cache[templateId] = {};
      }

      this.cache[templateId][size] = {
        url,
        timestamp: Date.now(),
        size,
        format: url.includes('.webp') ? 'webp' : 'jpeg',
        loadTime
      };

      this.saveToStorage();
      console.log(`✅ Prefetched template ${templateId} (${size}) in ${loadTime}ms`);
      
    } catch (error) {
      console.warn(`❌ Failed to prefetch template ${templateId} (${size}):`, error);
    }
  }

  /**
   * Batch prefetch multiple images
   */
  async batchPrefetch(requests: Array<{ templateId: string; size: string; url: string }>): Promise<void> {
    const promises = requests.map(({ templateId, size, url }) => 
      this.prefetch(templateId, size, url).catch(err => 
        console.warn(`Prefetch failed for ${templateId}:`, err)
      )
    );

    await Promise.allSettled(promises);
  }

  /**
   * Invalidate cache for specific template
   */
  invalidate(templateId: string): void {
    delete this.cache[templateId];
    this.saveToStorage();
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.cache = {};
    this.saveToStorage();
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    totalTemplates: number;
    totalImages: number;
    cacheSize: string;
    oldestEntry: number;
    newestEntry: number;
  } {
    const templates = Object.keys(this.cache);
    let totalImages = 0;
    let oldestTimestamp = Date.now();
    let newestTimestamp = 0;

    templates.forEach(templateId => {
      const sizes = Object.keys(this.cache[templateId]);
      totalImages += sizes.length;
      
      sizes.forEach(size => {
        const timestamp = this.cache[templateId][size].timestamp;
        if (timestamp < oldestTimestamp) oldestTimestamp = timestamp;
        if (timestamp > newestTimestamp) newestTimestamp = timestamp;
      });
    });

    const cacheString = JSON.stringify(this.cache);
    const cacheSize = `${(cacheString.length / 1024).toFixed(2)} KB`;

    return {
      totalTemplates: templates.length,
      totalImages,
      cacheSize,
      oldestEntry: oldestTimestamp,
      newestEntry: newestTimestamp
    };
  }

  /**
   * Load cache from localStorage
   */
  private loadFromStorage(): void {
    if (typeof window === 'undefined') return;

    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        this.cache = JSON.parse(stored);
        console.log('📦 Template image cache loaded from storage');
      }
    } catch (error) {
      console.warn('Failed to load template image cache:', error);
      this.cache = {};
    }
  }

  /**
   * Save cache to localStorage
   */
  private saveToStorage(): void {
    if (typeof window === 'undefined') return;

    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.cache));
    } catch (error) {
      console.warn('Failed to save template image cache:', error);
      // If storage is full, clear old entries and try again
      this.cleanup();
      try {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.cache));
      } catch (retryError) {
        console.error('Failed to save cache after cleanup:', retryError);
      }
    }
  }

  /**
   * Enforce maximum cache size
   */
  private enforceMaxSize(): void {
    const templateIds = Object.keys(this.cache);
    
    if (templateIds.length <= this.MAX_CACHE_SIZE) return;

    // Sort by timestamp (oldest first)
    const sortedTemplates = templateIds
      .map(id => ({
        id,
        timestamp: Math.min(...Object.values(this.cache[id]).map(img => img.timestamp))
      }))
      .sort((a, b) => a.timestamp - b.timestamp);

    // Remove oldest entries
    const toRemove = sortedTemplates.slice(0, templateIds.length - this.MAX_CACHE_SIZE);
    toRemove.forEach(({ id }) => {
      delete this.cache[id];
    });

    console.log(`🧹 Removed ${toRemove.length} old cache entries`);
  }

  /**
   * Cleanup expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    let removedCount = 0;

    Object.keys(this.cache).forEach(templateId => {
      const templateCache = this.cache[templateId];
      
      Object.keys(templateCache).forEach(size => {
        if (now - templateCache[size].timestamp > this.CACHE_TTL) {
          delete templateCache[size];
          removedCount++;
        }
      });

      // Remove template if no sizes left
      if (Object.keys(templateCache).length === 0) {
        delete this.cache[templateId];
      }
    });

    if (removedCount > 0) {
      console.log(`🧹 Cleaned up ${removedCount} expired cache entries`);
      this.saveToStorage();
    }
  }

  /**
   * Start periodic cleanup
   */
  private startCleanupInterval(): void {
    if (typeof window === 'undefined') return;

    // Cleanup every 30 minutes
    setInterval(() => {
      this.cleanup();
    }, 30 * 60 * 1000);
  }
}

// Singleton instance
export const templateImageCache = new TemplateImageCacheManager();

// Export for debugging
if (typeof window !== 'undefined') {
  (window as Window & { templateImageCache?: TemplateImageCacheManager }).templateImageCache = templateImageCache;
}
