/**
 * Global Render State Manager
 * Prevents flickering and maintains render state across navigation
 */

interface RenderState {
  isLoaded: boolean;
  isLoading: boolean;
  hasError: boolean;
  url: string;
  size: string;
  timestamp: number;
  dimensions?: { width: number; height: number };
}

interface GlobalRenderCache {
  [templateId: string]: {
    [size: string]: RenderState;
  };
}

class GlobalRenderStateManager {
  private renderCache: GlobalRenderCache = {};
  private preloadedImages: Map<string, HTMLImageElement> = new Map();
  private readonly STORAGE_KEY = 'template-render-state-v1';
  private readonly CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days

  constructor() {
    this.loadFromStorage();
    this.startCleanupInterval();
    
    // Preload images on idle
    if (typeof window !== 'undefined') {
      this.scheduleIdlePreloading();
    }
  }

  /**
   * Check if template is already rendered and cached
   */
  isRendered(templateId: string, size: string): boolean {
    const state = this.renderCache[templateId]?.[size];
    if (!state) return false;
    
    // Check if cache is still valid
    if (Date.now() - state.timestamp > this.CACHE_TTL) {
      this.invalidate(templateId, size);
      return false;
    }
    
    return state.isLoaded && !state.hasError;
  }

  /**
   * Check if template is currently loading
   */
  isLoading(templateId: string, size: string): boolean {
    return this.renderCache[templateId]?.[size]?.isLoading || false;
  }

  /**
   * Check if template has error
   */
  hasError(templateId: string, size: string): boolean {
    return this.renderCache[templateId]?.[size]?.hasError || false;
  }

  /**
   * Get cached image element if available
   */
  getCachedImage(templateId: string, size: string): HTMLImageElement | null {
    const key = `${templateId}-${size}`;
    return this.preloadedImages.get(key) || null;
  }

  /**
   * Set loading state
   */
  setLoading(templateId: string, size: string, url: string): void {
    if (!this.renderCache[templateId]) {
      this.renderCache[templateId] = {};
    }

    this.renderCache[templateId][size] = {
      isLoaded: false,
      isLoading: true,
      hasError: false,
      url,
      size,
      timestamp: Date.now()
    };

    this.saveToStorage();
  }

  /**
   * Set loaded state with image caching
   */
  setLoaded(templateId: string, size: string, url: string, img?: HTMLImageElement): void {
    if (!this.renderCache[templateId]) {
      this.renderCache[templateId] = {};
    }

    this.renderCache[templateId][size] = {
      isLoaded: true,
      isLoading: false,
      hasError: false,
      url,
      size,
      timestamp: Date.now(),
      dimensions: img ? { width: img.naturalWidth, height: img.naturalHeight } : undefined
    };

    // Cache the actual image element for instant display
    if (img) {
      const key = `${templateId}-${size}`;
      this.preloadedImages.set(key, img);
    }

    this.saveToStorage();
    console.log(`✅ Template ${templateId} (${size}) rendered and cached`);
  }

  /**
   * Set error state
   */
  setError(templateId: string, size: string, url: string): void {
    if (!this.renderCache[templateId]) {
      this.renderCache[templateId] = {};
    }

    this.renderCache[templateId][size] = {
      isLoaded: false,
      isLoading: false,
      hasError: true,
      url,
      size,
      timestamp: Date.now()
    };

    this.saveToStorage();
  }

  /**
   * Preload image and cache it
   */
  async preloadAndCache(templateId: string, size: string, url: string): Promise<HTMLImageElement> {
    const key = `${templateId}-${size}`;
    
    // Return cached image if available
    const cached = this.preloadedImages.get(key);
    if (cached && cached.complete) {
      return cached;
    }

    // Set loading state
    this.setLoading(templateId, size, url);

    try {
      const img = new Image();
      
      // Configure for better caching
      img.crossOrigin = 'anonymous';
      img.decoding = 'async';
      
      await new Promise<void>((resolve, reject) => {
        img.onload = () => {
          this.setLoaded(templateId, size, url, img);
          resolve();
        };
        
        img.onerror = () => {
          this.setError(templateId, size, url);
          reject(new Error(`Failed to load image: ${url}`));
        };
        
        img.src = url;
      });

      // Cache the loaded image
      this.preloadedImages.set(key, img);
      return img;

    } catch (error) {
      this.setError(templateId, size, url);
      throw error;
    }
  }

  /**
   * Batch preload multiple images
   */
  async batchPreload(requests: Array<{ templateId: string; size: string; url: string }>): Promise<void> {
    const promises = requests.map(({ templateId, size, url }) => 
      this.preloadAndCache(templateId, size, url).catch(err => {
        console.warn(`Preload failed for ${templateId} (${size}):`, err);
        return null;
      })
    );

    await Promise.allSettled(promises);
  }

  /**
   * Get render state for debugging
   */
  getRenderState(templateId: string, size: string): RenderState | null {
    return this.renderCache[templateId]?.[size] || null;
  }

  /**
   * Invalidate specific template/size
   */
  invalidate(templateId: string, size?: string): void {
    if (size) {
      delete this.renderCache[templateId]?.[size];
      const key = `${templateId}-${size}`;
      this.preloadedImages.delete(key);
    } else {
      delete this.renderCache[templateId];
      // Remove all cached images for this template
      for (const [key] of this.preloadedImages) {
        if (key.startsWith(`${templateId}-`)) {
          this.preloadedImages.delete(key);
        }
      }
    }
    this.saveToStorage();
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.renderCache = {};
    this.preloadedImages.clear();
    this.saveToStorage();
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const templates = Object.keys(this.renderCache);
    let totalRendered = 0;
    let totalLoading = 0;
    let totalErrors = 0;

    templates.forEach(templateId => {
      Object.values(this.renderCache[templateId]).forEach(state => {
        if (state.isLoaded) totalRendered++;
        else if (state.isLoading) totalLoading++;
        else if (state.hasError) totalErrors++;
      });
    });

    return {
      totalTemplates: templates.length,
      totalRendered,
      totalLoading,
      totalErrors,
      cachedImages: this.preloadedImages.size,
      memoryUsage: `${(JSON.stringify(this.renderCache).length / 1024).toFixed(2)} KB`
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
        const data = JSON.parse(stored);
        this.renderCache = data;
        console.log('📦 Global render state loaded from storage');
      }
    } catch (error) {
      console.warn('Failed to load render state:', error);
      this.renderCache = {};
    }
  }

  /**
   * Save cache to localStorage
   */
  private saveToStorage(): void {
    if (typeof window === 'undefined') return;

    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.renderCache));
    } catch (error) {
      console.warn('Failed to save render state:', error);
      // If storage is full, cleanup and retry
      this.cleanup();
      try {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.renderCache));
      } catch (retryError) {
        console.error('Failed to save render state after cleanup:', retryError);
      }
    }
  }

  /**
   * Cleanup expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    let cleanedCount = 0;

    Object.keys(this.renderCache).forEach(templateId => {
      const templateStates = this.renderCache[templateId];
      
      Object.keys(templateStates).forEach(size => {
        if (now - templateStates[size].timestamp > this.CACHE_TTL) {
          delete templateStates[size];
          const key = `${templateId}-${size}`;
          this.preloadedImages.delete(key);
          cleanedCount++;
        }
      });

      // Remove template if no sizes left
      if (Object.keys(templateStates).length === 0) {
        delete this.renderCache[templateId];
      }
    });

    if (cleanedCount > 0) {
      console.log(`🧹 Cleaned up ${cleanedCount} expired render states`);
      this.saveToStorage();
    }
  }

  /**
   * Start periodic cleanup
   */
  private startCleanupInterval(): void {
    if (typeof window === 'undefined') return;

    // Cleanup every hour
    setInterval(() => {
      this.cleanup();
    }, 60 * 60 * 1000);
  }

  /**
   * Schedule idle preloading for better UX
   */
  private scheduleIdlePreloading(): void {
    if ('requestIdleCallback' in window) {
      const idlePreload = () => {
        // Preload next batch of images during idle time
        requestIdleCallback(() => {
          // This will be called when browser is idle
          console.log('🎯 Browser idle - ready for background preloading');
        });
      };

      // Schedule idle preloading after initial load
      setTimeout(idlePreload, 2000);
    }
  }
}

// Singleton instance
export const globalRenderState = new GlobalRenderStateManager();

// Export for debugging
if (typeof window !== 'undefined') {
  (window as any).globalRenderState = globalRenderState;
}
