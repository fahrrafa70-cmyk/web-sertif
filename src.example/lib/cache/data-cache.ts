/**
 * Simple in-memory cache for frequently accessed data
 * Helps reduce unnecessary API calls and improves performance
 * Enhanced with request deduplication support
 */

import { requestDeduplicator } from '@/hooks/use-request-deduplication';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresIn: number; // milliseconds
}

class DataCache {
  private cache = new Map<string, CacheEntry<unknown>>();
  private maxSize = 100; // Maximum cache entries to prevent memory issues

  /**
   * Set cache entry
   */
  set<T>(key: string, data: T, expiresIn: number = 60000): void {
    // If cache is full, remove oldest entry
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      expiresIn,
    });
  }

  /**
   * Get cache entry
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key) as CacheEntry<T> | undefined;
    
    if (!entry) {
      return null;
    }

    const age = Date.now() - entry.timestamp;
    
    if (age > entry.expiresIn) {
      // Expired, remove from cache
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  /**
   * Get or fetch with deduplication
   * If cached, return cached data. If not, fetch with deduplication.
   */
  async getOrFetch<T>(
    key: string,
    fetchFn: () => Promise<T>,
    expiresIn: number = 60000
  ): Promise<T> {
    // Check cache first
    const cached = this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // Use request deduplication to prevent multiple simultaneous requests
    return requestDeduplicator.deduplicate(key, async () => {
      const data = await fetchFn();
      this.set(key, data, expiresIn);
      return data;
    });
  }

  /**
   * Check if key exists and is valid
   */
  has(key: string): boolean {
    return this.get(key) !== null;
  }

  /**
   * Clear specific cache entry
   */
  delete(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Clear expired entries
   */
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      const age = now - entry.timestamp;
      if (age > entry.expiresIn) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Get cache statistics
   */
  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
    };
  }
}

// Singleton instance
export const dataCache = new DataCache();

// Cache keys
export const CACHE_KEYS = {
  MEMBERS: 'members',
  TEMPLATES: 'templates',
  CERTIFICATES: 'certificates',
  CERTIFICATES_CATEGORY: (category: string) => `certificates:category:${category}`,
  CERTIFICATES_TEMPLATE: (templateId: string) => `certificates:template:${templateId}`,
} as const;

// Cleanup expired entries every 5 minutes
if (typeof window !== 'undefined') {
  setInterval(() => {
    dataCache.cleanup();
  }, 5 * 60 * 1000);
}

