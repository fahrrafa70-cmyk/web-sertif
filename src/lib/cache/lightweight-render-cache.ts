/**
 * Lightweight Render Cache - Fast & Simple
 * Fixes performance regression from heavy global render state
 */

interface SimpleRenderState {
  [templateId: string]: {
    [size: string]: boolean; // Just track if rendered, nothing else
  };
}

class LightweightRenderCache {
  private cache: SimpleRenderState = {};
  private readonly STORAGE_KEY = 'simple-render-cache';

  constructor() {
    // Load from storage asynchronously to avoid blocking
    this.loadFromStorageAsync();
  }

  /**
   * Check if rendered (super fast, no TTL check)
   */
  isRendered(templateId: string, size: string): boolean {
    return this.cache[templateId]?.[size] || false;
  }

  /**
   * Mark as rendered (super fast)
   */
  setRendered(templateId: string, size: string): void {
    if (!this.cache[templateId]) {
      this.cache[templateId] = {};
    }
    this.cache[templateId][size] = true;
    
    // Save to storage asynchronously (non-blocking)
    this.saveToStorageAsync();
  }

  /**
   * Clear specific template
   */
  clear(templateId: string): void {
    delete this.cache[templateId];
    this.saveToStorageAsync();
  }

  /**
   * Get stats (for debugging)
   */
  getStats() {
    const templates = Object.keys(this.cache);
    let totalRendered = 0;
    templates.forEach(id => {
      totalRendered += Object.keys(this.cache[id]).length;
    });
    return { templates: templates.length, rendered: totalRendered };
  }

  /**
   * Load from storage asynchronously (non-blocking)
   */
  private async loadFromStorageAsync(): Promise<void> {
    if (typeof window === 'undefined') return;

    try {
      // Use setTimeout to make it async and non-blocking
      setTimeout(() => {
        try {
          const stored = localStorage.getItem(this.STORAGE_KEY);
          if (stored) {
            this.cache = JSON.parse(stored);
            console.log('📦 Lightweight render cache loaded');
          }
        } catch (error) {
          console.warn('Failed to load render cache:', error);
        }
      }, 0);
    } catch (error) {
      // Ignore errors to prevent blocking
    }
  }

  /**
   * Save to storage asynchronously (non-blocking)
   */
  private saveToStorageAsync(): void {
    if (typeof window === 'undefined') return;

    // Use setTimeout to make it async and non-blocking
    setTimeout(() => {
      try {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.cache));
      } catch (error) {
        // Ignore storage errors to prevent blocking
        console.warn('Storage save failed (non-critical):', error);
      }
    }, 0);
  }
}

// Singleton instance
export const lightweightRenderCache = new LightweightRenderCache();

// Export for debugging
if (typeof window !== 'undefined') {
  (window as any).lightweightRenderCache = lightweightRenderCache;
}
