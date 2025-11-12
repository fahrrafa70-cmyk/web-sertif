/**
 * Template Image Optimization Functions
 * Provides optimized image URLs with caching and multiple sizes
 */

import { Template } from './templates';
import { templateImageCache } from '@/lib/cache/template-image-cache';
import { getThumbnailUrl, getWebPThumbnailUrl, THUMBNAIL_SIZES } from '@/lib/image/thumbnail-sizes';

/**
 * Get optimized template image URL with smart caching
 * NO cache-busting parameters to enable browser caching
 */
export function getOptimizedTemplateUrl(
  template: Template, 
  size: keyof typeof THUMBNAIL_SIZES = 'sm'
): string | null {
  // Get base image URL
  const baseUrl = template.preview_thumbnail_path || 
                  template.thumbnail_path || 
                  template.certificate_thumbnail_path ||
                  template.preview_image_path || 
                  template.image_path ||
                  template.certificate_image_url;
  
  if (!baseUrl) return null;

  // Check cache first
  const cachedUrl = templateImageCache.get(template.id, size);
  if (cachedUrl) {
    return cachedUrl;
  }

  // Generate optimized URL
  const optimizedUrl = getWebPThumbnailUrl(baseUrl, size);
  
  // Cache the URL (without loading the image yet)
  templateImageCache.set(template.id, size, optimizedUrl, 'webp');
  
  return optimizedUrl;
}

/**
 * Get fallback image URL (JPEG) if WebP fails
 */
export function getFallbackTemplateUrl(
  template: Template, 
  size: keyof typeof THUMBNAIL_SIZES = 'sm'
): string | null {
  const baseUrl = template.preview_thumbnail_path || 
                  template.thumbnail_path || 
                  template.certificate_thumbnail_path ||
                  template.preview_image_path || 
                  template.image_path ||
                  template.certificate_image_url;
  
  if (!baseUrl) return null;

  return getThumbnailUrl(baseUrl, size);
}

/**
 * Prefetch template images for better performance
 */
export async function prefetchTemplateImages(
  templates: Template[], 
  size: keyof typeof THUMBNAIL_SIZES = 'sm'
): Promise<void> {
  const prefetchRequests = templates
    .slice(0, 10) // Only prefetch first 10 for performance
    .map(template => {
      const url = getOptimizedTemplateUrl(template, size);
      return url ? { templateId: template.id, size, url } : null;
    })
    .filter(Boolean) as Array<{ templateId: string; size: string; url: string }>;

  if (prefetchRequests.length > 0) {
    await templateImageCache.batchPrefetch(prefetchRequests);
  }
}

/**
 * Prefetch on hover for instant preview
 */
export function prefetchOnHover(template: Template): void {
  // Prefetch larger size for preview
  const largeUrl = getOptimizedTemplateUrl(template, 'lg');
  if (largeUrl) {
    templateImageCache.prefetch(template.id, 'lg', largeUrl);
  }
}

/**
 * Get template image with progressive loading sizes
 */
export function getProgressiveTemplateUrls(template: Template): {
  xs: string | null;
  sm: string | null;
  md: string | null;
  lg: string | null;
} {
  return {
    xs: getOptimizedTemplateUrl(template, 'xs'),
    sm: getOptimizedTemplateUrl(template, 'sm'),
    md: getOptimizedTemplateUrl(template, 'md'),
    lg: getOptimizedTemplateUrl(template, 'lg')
  };
}

/**
 * Invalidate cache when template is updated
 */
export function invalidateTemplateCache(templateId: string): void {
  templateImageCache.invalidate(templateId);
}

/**
 * Get cache statistics for debugging
 */
export function getTemplateCacheStats() {
  return templateImageCache.getStats();
}

/**
 * Preload critical templates (first few visible)
 */
export async function preloadCriticalTemplates(templates: Template[]): Promise<void> {
  // Preload first 6 templates (typical above-the-fold count)
  const criticalTemplates = templates.slice(0, 6);
  
  // Preload small size immediately
  await prefetchTemplateImages(criticalTemplates, 'xs');
  
  // Preload medium size with slight delay
  setTimeout(() => {
    prefetchTemplateImages(criticalTemplates, 'sm');
  }, 100);
}

/**
 * Smart image loading strategy
 */
export class TemplateImageLoader {
  private loadingQueue: Set<string> = new Set();
  private loadedImages: Set<string> = new Set();
  private failedImages: Set<string> = new Set();

  async loadImage(template: Template, size: keyof typeof THUMBNAIL_SIZES = 'sm'): Promise<string> {
    const cacheKey = `${template.id}-${size}`;
    
    // Return if already loaded
    if (this.loadedImages.has(cacheKey)) {
      return getOptimizedTemplateUrl(template, size) || '';
    }

    // Return if already failed
    if (this.failedImages.has(cacheKey)) {
      throw new Error('Image previously failed to load');
    }

    // Return if already loading
    if (this.loadingQueue.has(cacheKey)) {
      return new Promise((resolve, reject) => {
        const checkLoaded = () => {
          if (this.loadedImages.has(cacheKey)) {
            resolve(getOptimizedTemplateUrl(template, size) || '');
          } else if (this.failedImages.has(cacheKey)) {
            reject(new Error('Image failed to load'));
          } else {
            setTimeout(checkLoaded, 50);
          }
        };
        checkLoaded();
      });
    }

    // Start loading
    this.loadingQueue.add(cacheKey);

    try {
      const url = getOptimizedTemplateUrl(template, size);
      if (!url) throw new Error('No URL available');

      // Load image
      await new Promise<void>((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve();
        img.onerror = () => {
          // Try fallback URL
          const fallbackUrl = getFallbackTemplateUrl(template, size);
          if (fallbackUrl) {
            const fallbackImg = new Image();
            fallbackImg.onload = () => resolve();
            fallbackImg.onerror = () => reject(new Error('Both WebP and fallback failed'));
            fallbackImg.src = fallbackUrl;
          } else {
            reject(new Error('No fallback available'));
          }
        };
        img.src = url;
      });

      this.loadedImages.add(cacheKey);
      this.loadingQueue.delete(cacheKey);
      return url;

    } catch (error) {
      this.failedImages.add(cacheKey);
      this.loadingQueue.delete(cacheKey);
      throw error;
    }
  }

  isLoaded(templateId: string, size: keyof typeof THUMBNAIL_SIZES = 'sm'): boolean {
    return this.loadedImages.has(`${templateId}-${size}`);
  }

  hasFailed(templateId: string, size: keyof typeof THUMBNAIL_SIZES = 'sm'): boolean {
    return this.failedImages.has(`${templateId}-${size}`);
  }

  isLoading(templateId: string, size: keyof typeof THUMBNAIL_SIZES = 'sm'): boolean {
    return this.loadingQueue.has(`${templateId}-${size}`);
  }

  getStats() {
    return {
      loaded: this.loadedImages.size,
      failed: this.failedImages.size,
      loading: this.loadingQueue.size
    };
  }
}

// Singleton instance
export const templateImageLoader = new TemplateImageLoader();
