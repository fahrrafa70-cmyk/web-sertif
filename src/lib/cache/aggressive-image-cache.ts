/**
 * AGGRESSIVE IMAGE CACHE SYSTEM
 * Professional-grade performance optimization with compression
 * ZERO TOLERANCE for slow loading
 */

import { advancedCompressor } from '@/lib/image/advanced-compressor';

interface CachedImageData {
  blob: Blob;
  url: string;
  timestamp: number;
  size: string;
}

interface ImageCacheEntry {
  [size: string]: CachedImageData;
}

class AggressiveImageCache {
  private cache = new Map<string, ImageCacheEntry>();
  private preloadQueue = new Set<string>();
  private readonly CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours
  private readonly STORAGE_KEY = 'aggressive-image-cache-v1';
  private isInitialized = false;

  constructor() {
    this.initializeCache();
  }

  /**
   * Initialize cache immediately and aggressively
   */
  private async initializeCache(): Promise<void> {
    if (typeof window === 'undefined') return;

    try {
      // Load from IndexedDB for large binary data
      await this.loadFromIndexedDB();
      this.isInitialized = true;
      console.log('🚀 Aggressive cache initialized');
    } catch (error) {
      console.warn('Cache init failed, using memory only:', error);
      this.isInitialized = true;
    }
  }

  /**
   * INSTANT check if image is cached (synchronous)
   */
  isImageCached(templateId: string, size: string = 'preview'): boolean {
    const entry = this.cache.get(templateId);
    if (!entry || !entry[size]) return false;

    // Check TTL
    if (Date.now() - entry[size].timestamp > this.CACHE_TTL) {
      delete entry[size];
      if (Object.keys(entry).length === 0) {
        this.cache.delete(templateId);
      }
      return false;
    }

    return true;
  }

  /**
   * Get cached image URL instantly
   */
  getCachedImageUrl(templateId: string, size: string = 'preview'): string | null {
    if (!this.isImageCached(templateId, size)) return null;
    return this.cache.get(templateId)?.[size]?.url || null;
  }

  /**
   * AGGRESSIVE preload and cache image
   */
  async preloadAndCache(templateId: string, url: string, size: string = 'preview'): Promise<string> {
    const cacheKey = `${templateId}-${size}`;
    
    // Return immediately if already cached
    if (this.isImageCached(templateId, size)) {
      return this.getCachedImageUrl(templateId, size)!;
    }

    // Prevent duplicate preloads
    if (this.preloadQueue.has(cacheKey)) {
      return new Promise((resolve) => {
        const checkInterval = setInterval(() => {
          if (!this.preloadQueue.has(cacheKey)) {
            clearInterval(checkInterval);
            resolve(this.getCachedImageUrl(templateId, size) || url);
          }
        }, 50);
      });
    }

    this.preloadQueue.add(cacheKey);

    try {
      // 🗜️ COMPRESS image for maximum performance
      let compressedResult;
      
      if (size === 'preview') {
        compressedResult = await advancedCompressor.compressPreview(url);
      } else {
        compressedResult = await advancedCompressor.compressThumbnail(url, size as 'xs' | 'sm' | 'md' | 'lg');
      }
      
      const { blob, url: cachedUrl } = compressedResult;
      
      console.log(`🗜️ Compressed ${templateId} (${size}): ${compressedResult.compressionRatio.toFixed(1)}% reduction`);

      // Cache the image
      if (!this.cache.has(templateId)) {
        this.cache.set(templateId, {});
      }

      this.cache.get(templateId)![size] = {
        blob,
        url: cachedUrl,
        timestamp: Date.now(),
        size
      };

      // Save to IndexedDB asynchronously
      this.saveToIndexedDB(templateId, size, blob);

      this.preloadQueue.delete(cacheKey);
      console.log(`⚡ Cached ${templateId} (${size}) in ${Date.now() - Date.now()}ms`);
      
      return cachedUrl;

    } catch (error) {
      this.preloadQueue.delete(cacheKey);
      console.error(`❌ Failed to cache ${templateId}:`, error);
      return url; // Fallback to original URL
    }
  }

  /**
   * BATCH preload multiple images with compression
   */
  async batchPreload(requests: Array<{ templateId: string; url: string; size?: string }>): Promise<void> {
    const uncachedRequests = requests.filter(req => !this.isImageCached(req.templateId, req.size || 'preview'));
    
    if (uncachedRequests.length === 0) {
      console.log('✅ All images already cached');
      return;
    }

    console.log(`🗜️ Batch compressing ${uncachedRequests.length} images...`);
    const startTime = Date.now();

    const promises = uncachedRequests.map(req => 
      this.preloadAndCache(req.templateId, req.url, req.size || 'preview')
    );

    const results = await Promise.allSettled(promises);
    const successful = results.filter(r => r.status === 'fulfilled').length;
    const totalTime = Date.now() - startTime;

    console.log(`✅ Batch compression completed: ${successful}/${uncachedRequests.length} in ${totalTime}ms`);
  }

  /**
   * INSTANT preload for critical templates
   */
  async preloadCriticalImages(templates: Array<{ id: string; url: string }>): Promise<void> {
    console.log('🔥 AGGRESSIVE preload started for', templates.length, 'templates');
    
    // Preload all sizes for critical templates
    const allRequests = templates.flatMap(template => [
      { templateId: template.id, url: template.url, size: 'sm' },
      { templateId: template.id, url: template.url, size: 'md' },
      { templateId: template.id, url: template.url, size: 'preview' }
    ]);

    await this.batchPreload(allRequests);
    console.log('✅ AGGRESSIVE preload completed');
  }

  /**
   * Save to IndexedDB for persistence
   */
  private async saveToIndexedDB(templateId: string, size: string, blob: Blob): Promise<void> {
    try {
      const dbName = 'TemplateImageCache';
      const request = indexedDB.open(dbName, 1);
      
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains('images')) {
          db.createObjectStore('images', { keyPath: 'id' });
        }
      };

      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction(['images'], 'readwrite');
        const store = transaction.objectStore('images');
        
        store.put({
          id: `${templateId}-${size}`,
          blob,
          timestamp: Date.now()
        });
      };
    } catch (error) {
      // Ignore IndexedDB errors
    }
  }

  /**
   * Load from IndexedDB on init
   */
  private async loadFromIndexedDB(): Promise<void> {
    return new Promise((resolve) => {
      const dbName = 'TemplateImageCache';
      const request = indexedDB.open(dbName, 1);
      
      request.onsuccess = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains('images')) {
          resolve();
          return;
        }

        const transaction = db.transaction(['images'], 'readonly');
        const store = transaction.objectStore('images');
        const getAllRequest = store.getAll();
        
        getAllRequest.onsuccess = () => {
          const results = getAllRequest.result;
          let loadedCount = 0;

          results.forEach((item: any) => {
            const [templateId, size] = item.id.split('-');
            const url = URL.createObjectURL(item.blob);
            
            if (!this.cache.has(templateId)) {
              this.cache.set(templateId, {});
            }
            
            this.cache.get(templateId)![size] = {
              blob: item.blob,
              url,
              timestamp: item.timestamp,
              size
            };
            
            loadedCount++;
          });

          console.log(`📦 Loaded ${loadedCount} cached images from IndexedDB`);
          resolve();
        };
        
        getAllRequest.onerror = () => resolve();
      };
      
      request.onerror = () => resolve();
    });
  }

  /**
   * Get cache statistics
   */
  getStats() {
    let totalImages = 0;
    let totalSize = 0;

    this.cache.forEach((entry) => {
      Object.values(entry).forEach((cached) => {
        totalImages++;
        totalSize += cached.blob.size;
      });
    });

    return {
      templates: this.cache.size,
      images: totalImages,
      totalSize: `${(totalSize / 1024 / 1024).toFixed(2)} MB`,
      isInitialized: this.isInitialized
    };
  }

  /**
   * Clear cache
   */
  clear(): void {
    // Revoke all object URLs to prevent memory leaks
    this.cache.forEach((entry) => {
      Object.values(entry).forEach((cached) => {
        URL.revokeObjectURL(cached.url);
      });
    });
    
    this.cache.clear();
    console.log('🧹 Aggressive cache cleared');
  }
}

// Singleton instance
export const aggressiveImageCache = new AggressiveImageCache();

// Export for debugging
if (typeof window !== 'undefined') {
  (window as any).aggressiveImageCache = aggressiveImageCache;
}
