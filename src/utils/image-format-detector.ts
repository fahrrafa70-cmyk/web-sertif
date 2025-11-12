/**
 * Image format detection and optimization utilities
 * Provides WebP support with automatic fallback to original formats
 */

import { useState, useEffect } from 'react';

// Check if browser supports WebP format
export function supportsWebP(): Promise<boolean> {
  return new Promise((resolve) => {
    const webP = new Image();
    webP.onload = webP.onerror = () => {
      resolve(webP.height === 2);
    };
    webP.src = 'data:image/webp;base64,UklGRjoAAABXRUJQVlA4IC4AAACyAgCdASoCAAIALmk0mk0iIiIiIgBoSygABc6WWgAA/veff/0PP8bA//LwYAAA';
  });
}

// Check if browser supports AVIF format
export function supportsAVIF(): Promise<boolean> {
  return new Promise((resolve) => {
    const avif = new Image();
    avif.onload = avif.onerror = () => {
      resolve(avif.height === 2);
    };
    avif.src = 'data:image/avif;base64,AAAAIGZ0eXBhdmlmAAAAAGF2aWZtaWYxbWlhZk1BMUIAAADybWV0YQAAAAAAAAAoaGRscgAAAAAAAAAAcGljdAAAAAAAAAAAAAAAAGxpYmF2aWYAAAAADnBpdG0AAAAAAAEAAAAeaWxvYwAAAABEAAABAAEAAAABAAABGgAAAB0AAAAoaWluZgAAAAAAAQAAABppbmZlAgAAAAABAABhdjAxQ29sb3IAAAAAamlwcnAAAABLaXBjbwAAABRpc3BlAAAAAAAAAAIAAAACAAAAEHBpeGkAAAAAAwgICAAAAAxhdjFDgQ0MAAAAABNjb2xybmNseAACAAIAAYAAAAAXaXBtYQAAAAAAAAABAAEEAQKDBAAAACVtZGF0EgAKCBgABogQEAwgMg8f8D///8WfhwB8+ErK42A=';
  });
}

// Get optimal image format based on browser support
export async function getOptimalImageFormat(): Promise<'avif' | 'webp' | 'original'> {
  if (await supportsAVIF()) {
    return 'avif';
  }
  if (await supportsWebP()) {
    return 'webp';
  }
  return 'original';
}

// Convert image URL to optimal format
export function getOptimalImageUrl(originalUrl: string, format: 'avif' | 'webp' | 'original' = 'original'): string {
  if (format === 'original' || !originalUrl) {
    return originalUrl;
  }

  // For Next.js Image optimization, add format parameter
  const url = new URL(originalUrl, window.location.origin);
  
  // Check if it's already optimized by Next.js
  if (url.pathname.startsWith('/_next/image')) {
    // Already optimized, just update format
    url.searchParams.set('f', format);
    return url.toString();
  }

  // For local images, we can use Next.js image optimization
  if (url.origin === window.location.origin) {
    const optimizedUrl = new URL('/_next/image', window.location.origin);
    optimizedUrl.searchParams.set('url', originalUrl);
    optimizedUrl.searchParams.set('w', '640'); // Default width for templates
    optimizedUrl.searchParams.set('q', '85'); // Quality
    optimizedUrl.searchParams.set('f', format);
    return optimizedUrl.toString();
  }

  // For external images, return original (can't optimize)
  return originalUrl;
}

// Image format cache
class ImageFormatCache {
  private static instance: ImageFormatCache;
  private cache = new Map<string, string>();
  private optimalFormat: 'avif' | 'webp' | 'original' | null = null;

  static getInstance(): ImageFormatCache {
    if (!ImageFormatCache.instance) {
      ImageFormatCache.instance = new ImageFormatCache();
    }
    return ImageFormatCache.instance;
  }

  async getOptimalFormat(): Promise<'avif' | 'webp' | 'original'> {
    if (this.optimalFormat === null) {
      this.optimalFormat = await getOptimalImageFormat();
    }
    return this.optimalFormat;
  }

  async getOptimalUrl(originalUrl: string): Promise<string> {
    if (this.cache.has(originalUrl)) {
      return this.cache.get(originalUrl)!;
    }

    const format = await this.getOptimalFormat();
    const optimizedUrl = getOptimalImageUrl(originalUrl, format);
    
    this.cache.set(originalUrl, optimizedUrl);
    return optimizedUrl;
  }

  clear(): void {
    this.cache.clear();
  }
}

export const imageFormatCache = ImageFormatCache.getInstance();

// React hook for optimal image URLs
export function useOptimalImageUrl(originalUrl: string | null): string | null {
  const [optimizedUrl, setOptimizedUrl] = useState<string | null>(originalUrl);

  useEffect(() => {
    if (!originalUrl) {
      setOptimizedUrl(null);
      return;
    }

    imageFormatCache.getOptimalUrl(originalUrl).then(setOptimizedUrl);
  }, [originalUrl]);

  return optimizedUrl;
}

// Preload image with optimal format
export async function preloadOptimalImage(originalUrl: string): Promise<void> {
  const optimizedUrl = await imageFormatCache.getOptimalUrl(originalUrl);
  
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = reject;
    img.src = optimizedUrl;
  });
}
