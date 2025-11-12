/**
 * PROFESSIONAL TEMPLATE PRELOADER
 * Aggressive preloading strategy for zero-latency experience
 */

import { Template } from '@/lib/supabase/templates';
import { aggressiveImageCache } from '@/lib/cache/aggressive-image-cache';
import { lightweightRenderCache } from '@/lib/cache/lightweight-render-cache';
import { getOptimizedTemplateUrl } from '@/lib/supabase/template-optimization';

class ProfessionalPreloader {
  private preloadQueue: Set<string> = new Set();
  private isPreloading = false;
  private preloadedCount = 0;

  /**
   * AGGRESSIVE preload strategy - preload EVERYTHING
   */
  async preloadAllTemplates(templates: Template[]): Promise<void> {
    if (this.isPreloading) return;
    
    this.isPreloading = true;
    this.preloadedCount = 0;
    
    console.log('🚀 PROFESSIONAL preload started for', templates.length, 'templates');
    const startTime = Date.now();

    try {
      // Phase 1: Critical templates (first 6) - IMMEDIATE
      const criticalTemplates = templates.slice(0, 6);
      await this.preloadCriticalTemplates(criticalTemplates);

      // Phase 2: Remaining templates - BACKGROUND
      const remainingTemplates = templates.slice(6);
      this.preloadBackgroundTemplates(remainingTemplates);

      const totalTime = Date.now() - startTime;
      console.log(`✅ PROFESSIONAL preload completed in ${totalTime}ms`);
      
    } catch (error) {
      console.error('❌ Professional preload failed:', error);
    } finally {
      this.isPreloading = false;
    }
  }

  /**
   * CRITICAL templates - must load immediately
   */
  private async preloadCriticalTemplates(templates: Template[]): Promise<void> {
    const requests = templates.map(template => {
      const url = getOptimizedTemplateUrl(template);
      return url ? { templateId: template.id, url } : null;
    }).filter(Boolean) as Array<{ templateId: string; url: string }>;

    if (requests.length === 0) return;

    console.log('🔥 Preloading CRITICAL templates:', requests.length);
    const criticalImages = requests.map(req => ({ id: req.templateId, url: req.url }));
    await aggressiveImageCache.preloadCriticalImages(criticalImages);
    
    // Mark as rendered
    requests.forEach(req => {
      lightweightRenderCache.setRendered(req.templateId, 'sm');
      lightweightRenderCache.setRendered(req.templateId, 'preview');
    });

    this.preloadedCount += requests.length;
  }

  /**
   * BACKGROUND templates - load when browser is idle
   */
  private preloadBackgroundTemplates(templates: Template[]): void {
    if (templates.length === 0) return;

    const preloadBatch = async (batch: Template[]) => {
      const requests = batch.map(template => {
        const url = getOptimizedTemplateUrl(template);
        return url ? { templateId: template.id, url } : null;
      }).filter(Boolean) as Array<{ templateId: string; url: string }>;

      if (requests.length > 0) {
        await aggressiveImageCache.batchPreload(requests);
        
        // Mark as rendered
        requests.forEach(req => {
          lightweightRenderCache.setRendered(req.templateId, 'sm');
          lightweightRenderCache.setRendered(req.templateId, 'preview');
        });

        this.preloadedCount += requests.length;
        console.log(`📦 Background preloaded batch: ${requests.length} (Total: ${this.preloadedCount})`);
      }
    };

    // Use requestIdleCallback for background preloading
    const schedulePreload = (batch: Template[]) => {
      if ('requestIdleCallback' in window) {
        requestIdleCallback(() => preloadBatch(batch), { timeout: 5000 });
      } else {
        setTimeout(() => preloadBatch(batch), 100);
      }
    };

    // Process in batches of 5
    const batchSize = 5;
    for (let i = 0; i < templates.length; i += batchSize) {
      const batch = templates.slice(i, i + batchSize);
      schedulePreload(batch);
    }
  }

  /**
   * INSTANT preload on hover
   */
  async preloadOnHover(template: Template): Promise<void> {
    const cacheKey = `${template.id}-hover`;
    if (this.preloadQueue.has(cacheKey)) return;

    this.preloadQueue.add(cacheKey);

    try {
      const url = getOptimizedTemplateUrl(template, 'lg');
      if (url && !aggressiveImageCache.isImageCached(template.id, 'lg')) {
        await aggressiveImageCache.preloadAndCache(template.id, url, 'lg');
        lightweightRenderCache.setRendered(template.id, 'lg');
        console.log(`⚡ Hover preload completed for ${template.id}`);
      }
    } catch (error) {
      console.warn(`Hover preload failed for ${template.id}:`, error);
    } finally {
      this.preloadQueue.delete(cacheKey);
    }
  }

  /**
   * FORCE preload specific template for preview
   */
  async forcePreloadForPreview(template: Template): Promise<string | null> {
    const url = getOptimizedTemplateUrl(template);
    if (!url) return null;

    try {
      console.log(`🎯 FORCE preload for preview: ${template.id}`);
      const cachedUrl = await aggressiveImageCache.preloadAndCache(template.id, url, 'preview');
      lightweightRenderCache.setRendered(template.id, 'preview');
      return cachedUrl;
    } catch (error) {
      console.error(`❌ Force preload failed for ${template.id}:`, error);
      return url; // Fallback to original URL
    }
  }

  /**
   * Get preloader statistics
   */
  getStats() {
    return {
      isPreloading: this.isPreloading,
      preloadedCount: this.preloadedCount,
      queueSize: this.preloadQueue.size,
      cacheStats: aggressiveImageCache.getStats()
    };
  }

  /**
   * Reset preloader state
   */
  reset(): void {
    this.preloadQueue.clear();
    this.isPreloading = false;
    this.preloadedCount = 0;
  }
}

// Singleton instance
export const professionalPreloader = new ProfessionalPreloader();

// Export for debugging
if (typeof window !== 'undefined') {
  (window as any).professionalPreloader = professionalPreloader;
}
