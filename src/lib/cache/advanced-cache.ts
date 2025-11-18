/**
 * Advanced caching strategies for optimal performance
 * Combines browser cache, IndexedDB, and memory cache
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  version: string;
  metadata?: Record<string, unknown>;
}

interface CacheConfig {
  ttl: number; // Time to live in milliseconds
  maxSize: number; // Maximum number of entries
  version: string; // Cache version for invalidation
  persistent: boolean; // Use IndexedDB for persistence
}

class AdvancedCache {
  private memoryCache = new Map<string, CacheEntry<unknown>>();
  private dbName = 'ECertificateCache';
  private dbVersion = 1;
  private db: IDBDatabase | null = null;

  constructor() {
    this.initIndexedDB();
    this.startCleanupInterval();
  }

  /**
   * Initialize IndexedDB for persistent caching
   */
  private async initIndexedDB(): Promise<void> {
    if (typeof window === 'undefined') return;

    try {
      this.db = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open(this.dbName, this.dbVersion);
        
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
        
        request.onupgradeneeded = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;
          
          // Create object stores
          if (!db.objectStoreNames.contains('cache')) {
            const store = db.createObjectStore('cache', { keyPath: 'key' });
            store.createIndex('timestamp', 'timestamp', { unique: false });
            store.createIndex('version', 'version', { unique: false });
          }
          
          if (!db.objectStoreNames.contains('images')) {
            const imageStore = db.createObjectStore('images', { keyPath: 'url' });
            imageStore.createIndex('timestamp', 'timestamp', { unique: false });
          }
        };
      });
      
      console.log('✅ IndexedDB initialized for caching');
    } catch (error) {
      console.error('❌ Failed to initialize IndexedDB:', error);
    }
  }

  /**
   * Set cache entry with advanced options
   */
  async set<T>(
    key: string, 
    data: T, 
    config: Partial<CacheConfig> = {}
  ): Promise<void> {
    const defaultConfig: CacheConfig = {
      ttl: 5 * 60 * 1000, // 5 minutes
      maxSize: 1000,
      version: '1.0',
      persistent: true
    };
    
    const finalConfig = { ...defaultConfig, ...config };
    
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl: finalConfig.ttl,
      version: finalConfig.version,
      metadata: {
        size: this.calculateSize(data),
        compressed: false
      }
    };

    // Store in memory cache
    this.memoryCache.set(key, entry);
    
    // Enforce memory cache size limit
    if (this.memoryCache.size > finalConfig.maxSize) {
      this.evictOldestEntries(finalConfig.maxSize * 0.8); // Keep 80% of max size
    }

    // Store in IndexedDB if persistent
    if (finalConfig.persistent && this.db) {
      try {
        await this.setInIndexedDB(key, entry);
      } catch (error) {
        console.warn('Failed to store in IndexedDB:', error);
      }
    }
  }

  /**
   * Get cache entry with fallback strategies
   */
  async get<T>(key: string): Promise<T | null> {
    // Try memory cache first (fastest)
    const memoryEntry = this.memoryCache.get(key);
    if (memoryEntry && this.isEntryValid(memoryEntry)) {
      return memoryEntry.data as T;
    }

    // Try IndexedDB (persistent)
    if (this.db) {
      try {
        const dbEntry = await this.getFromIndexedDB<T>(key);
        if (dbEntry && this.isEntryValid(dbEntry)) {
          // Restore to memory cache
          this.memoryCache.set(key, dbEntry);
          return dbEntry.data;
        }
      } catch (error) {
        console.warn('Failed to get from IndexedDB:', error);
      }
    }

    return null;
  }

  /**
   * Get or fetch with automatic caching
   */
  async getOrFetch<T>(
    key: string,
    fetchFn: () => Promise<T>,
    config: Partial<CacheConfig> = {}
  ): Promise<T> {
    // Try to get from cache first
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // Fetch and cache
    try {
      const data = await fetchFn();
      await this.set(key, data, config);
      return data;
    } catch (error) {
      // Try to get stale data as fallback
      const staleEntry = this.memoryCache.get(key) || 
                        (this.db ? await this.getFromIndexedDB<T>(key) : null);
      
      if (staleEntry) {
        console.warn('Using stale cache data due to fetch error:', error);
        return staleEntry.data as T;
      }
      
      throw error;
    }
  }

  /**
   * Cache images with blob storage
   */
  async cacheImage(url: string, ttl: number = 24 * 60 * 60 * 1000): Promise<string> {
    if (!this.db) return url;

    try {
      // Check if already cached
      const cached = await this.getImageFromCache(url);
      if (cached) return cached;

      // Fetch and cache image
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Failed to fetch image: ${response.status}`);
      
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      
      // Store in IndexedDB
      await this.storeImageInCache(url, blob, ttl);
      
      return objectUrl;
    } catch (error) {
      console.error('Failed to cache image:', error);
      return url; // Return original URL as fallback
    }
  }

  /**
   * Invalidate cache by pattern or version
   */
  async invalidate(pattern?: string | RegExp, version?: string): Promise<void> {
    // Clear memory cache
    if (pattern) {
      const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;
      for (const [key] of this.memoryCache) {
        if (regex.test(key)) {
          this.memoryCache.delete(key);
        }
      }
    } else if (version) {
      for (const [key, entry] of this.memoryCache) {
        if (entry.version !== version) {
          this.memoryCache.delete(key);
        }
      }
    } else {
      this.memoryCache.clear();
    }

    // Clear IndexedDB
    if (this.db) {
      try {
        await this.clearIndexedDB(pattern, version);
      } catch (error) {
        console.error('Failed to clear IndexedDB:', error);
      }
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    memorySize: number;
    memoryEntries: number;
    hitRate: number;
    totalSize: string;
  } {
    let totalSize = 0;
    let hitCount = 0;
    let totalRequests = 0;

    for (const [, entry] of this.memoryCache) {
      totalSize += (entry.metadata?.size as number) || 0;
      hitCount += (entry.metadata?.hits as number) || 0;
      totalRequests += (entry.metadata?.requests as number) || 0;
    }

    return {
      memorySize: totalSize,
      memoryEntries: this.memoryCache.size,
      hitRate: totalRequests > 0 ? hitCount / totalRequests : 0,
      totalSize: this.formatBytes(totalSize)
    };
  }

  /**
   * Private helper methods
   */
  private isEntryValid(entry: CacheEntry<unknown>): boolean {
    return Date.now() - entry.timestamp < entry.ttl;
  }

  private evictOldestEntries(targetSize: number): void {
    const entries = Array.from(this.memoryCache.entries())
      .sort(([, a], [, b]) => a.timestamp - b.timestamp);
    
    while (this.memoryCache.size > targetSize && entries.length > 0) {
      const [key] = entries.shift()!;
      this.memoryCache.delete(key);
    }
  }

  private async setInIndexedDB<T>(key: string, entry: CacheEntry<T>): Promise<void> {
    if (!this.db) return;

    const transaction = this.db.transaction(['cache'], 'readwrite');
    const store = transaction.objectStore('cache');
    
    await new Promise<void>((resolve, reject) => {
      const request = store.put({ key, ...entry });
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  private async getFromIndexedDB<T>(key: string): Promise<CacheEntry<T> | null> {
    if (!this.db) return null;

    const transaction = this.db.transaction(['cache'], 'readonly');
    const store = transaction.objectStore('cache');
    
    return new Promise<CacheEntry<T> | null>((resolve, reject) => {
      const request = store.get(key);
      request.onsuccess = () => {
        const result = request.result;
        if (result) {
          const { key: _, ...entry } = result;
          resolve(entry as CacheEntry<T>);
        } else {
          resolve(null);
        }
      };
      request.onerror = () => reject(request.error);
    });
  }

  private async getImageFromCache(url: string): Promise<string | null> {
    if (!this.db) return null;

    const transaction = this.db.transaction(['images'], 'readonly');
    const store = transaction.objectStore('images');
    
    return new Promise<string | null>((resolve, reject) => {
      const request = store.get(url);
      request.onsuccess = () => {
        const result = request.result;
        if (result && Date.now() - result.timestamp < result.ttl) {
          const objectUrl = URL.createObjectURL(result.blob);
          resolve(objectUrl);
        } else {
          resolve(null);
        }
      };
      request.onerror = () => reject(request.error);
    });
  }

  private async storeImageInCache(url: string, blob: Blob, ttl: number): Promise<void> {
    if (!this.db) return;

    const transaction = this.db.transaction(['images'], 'readwrite');
    const store = transaction.objectStore('images');
    
    await new Promise<void>((resolve, reject) => {
      const request = store.put({
        url,
        blob,
        timestamp: Date.now(),
        ttl
      });
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  private async clearIndexedDB(pattern?: string | RegExp, version?: string): Promise<void> {
    if (!this.db) return;

    const transaction = this.db.transaction(['cache'], 'readwrite');
    const store = transaction.objectStore('cache');
    
    if (!pattern && !version) {
      await new Promise<void>((resolve, reject) => {
        const request = store.clear();
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
      return;
    }

    // Selective clearing
    const request = store.openCursor();
    await new Promise<void>((resolve, reject) => {
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          const { key, version: entryVersion } = cursor.value;
          let shouldDelete = false;

          if (pattern) {
            const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;
            shouldDelete = regex.test(key);
          } else if (version && entryVersion !== version) {
            shouldDelete = true;
          }

          if (shouldDelete) {
            cursor.delete();
          }
          
          cursor.continue();
        } else {
          resolve();
        }
      };
      request.onerror = () => reject(request.error);
    });
  }

  private calculateSize(data: unknown): number {
    try {
      return new Blob([JSON.stringify(data)]).size;
    } catch {
      return 0;
    }
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  private startCleanupInterval(): void {
    // Clean up expired entries every 5 minutes
    setInterval(() => {
      this.cleanupExpiredEntries();
    }, 5 * 60 * 1000);
  }

  private cleanupExpiredEntries(): void {
    for (const [key, entry] of this.memoryCache) {
      if (!this.isEntryValid(entry)) {
        this.memoryCache.delete(key);
      }
    }
  }
}

// Singleton instance
export const advancedCache = new AdvancedCache();

// Predefined cache configurations
export const cacheConfigs = {
  // Short-term cache for API responses
  api: {
    ttl: 5 * 60 * 1000, // 5 minutes
    maxSize: 500,
    version: '1.0',
    persistent: true
  },
  
  // Medium-term cache for user data
  userData: {
    ttl: 30 * 60 * 1000, // 30 minutes
    maxSize: 100,
    version: '1.0',
    persistent: true
  },
  
  // Long-term cache for static data
  staticData: {
    ttl: 24 * 60 * 60 * 1000, // 24 hours
    maxSize: 200,
    version: '1.0',
    persistent: true
  },
  
  // Image cache
  images: {
    ttl: 7 * 24 * 60 * 60 * 1000, // 7 days
    maxSize: 100,
    version: '1.0',
    persistent: true
  }
};

// React hook for advanced caching
export function useAdvancedCache() {
  return {
    get: advancedCache.get.bind(advancedCache),
    set: advancedCache.set.bind(advancedCache),
    getOrFetch: advancedCache.getOrFetch.bind(advancedCache),
    cacheImage: advancedCache.cacheImage.bind(advancedCache),
    invalidate: advancedCache.invalidate.bind(advancedCache),
    getStats: advancedCache.getStats.bind(advancedCache)
  };
}
