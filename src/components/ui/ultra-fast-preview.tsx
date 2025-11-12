"use client";

import React, { useState, useEffect, memo, useRef } from 'react';
import { cn } from '@/lib/utils';
import { aggressiveImageCache } from '@/lib/cache/aggressive-image-cache';
import { lightweightRenderCache } from '@/lib/cache/lightweight-render-cache';
import { advancedCompressor } from '@/lib/image/advanced-compressor';

interface UltraFastPreviewProps {
  src: string;
  alt: string;
  templateId: string;
  className?: string;
  onLoad?: () => void;
  onError?: () => void;
}

/**
 * ULTRA-FAST PREVIEW COMPONENT
 * Professional-grade performance - ZERO tolerance for slow loading
 * Guaranteed sub-second display for cached images
 */
export const UltraFastPreview = memo<UltraFastPreviewProps>(({
  src,
  alt,
  templateId,
  className = '',
  onLoad,
  onError
}) => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const mountTimeRef = useRef(Date.now());

  // INSTANT check for cached image
  useEffect(() => {
    const startTime = Date.now();
    
    // Check aggressive cache first (instant)
    const cachedUrl = aggressiveImageCache.getCachedImageUrl(templateId, 'preview');
    if (cachedUrl) {
      setImageUrl(cachedUrl);
      setIsLoading(false);
      lightweightRenderCache.setRendered(templateId, 'preview');
      onLoad?.();
      console.log(`⚡ INSTANT display for ${templateId} in ${Date.now() - startTime}ms`);
      return;
    }

    // Check if previously rendered
    if (lightweightRenderCache.isRendered(templateId, 'preview')) {
      // Try to load from browser cache
      const img = new Image();
      img.onload = () => {
        setImageUrl(src);
        setIsLoading(false);
        onLoad?.();
        console.log(`🚀 Browser cache hit for ${templateId} in ${Date.now() - startTime}ms`);
      };
      img.onerror = () => {
        // Fallback to aggressive preload
        loadWithAggressiveCache();
      };
      img.src = src;
    } else {
      // Aggressive preload
      loadWithAggressiveCache();
    }

    async function loadWithAggressiveCache() {
      try {
        console.log(`🗜️ COMPRESSED preview load started for ${templateId}`);
        
        // Compress preview for optimal performance
        const compressedResult = await advancedCompressor.compressPreview(src);
        
        // Cache compressed preview
        await aggressiveImageCache.preloadAndCache(templateId, src, 'preview');
        
        setImageUrl(compressedResult.url);
        setIsLoading(false);
        lightweightRenderCache.setRendered(templateId, 'preview');
        onLoad?.();
        
        const loadTime = Date.now() - startTime;
        console.log(`✅ COMPRESSED preview completed for ${templateId}: ${compressedResult.compressionRatio.toFixed(1)}% reduction in ${loadTime}ms`);
        
      } catch (error) {
        console.error(`❌ COMPRESSED preview failed for ${templateId}:`, error);
        setHasError(true);
        setIsLoading(false);
        onError?.();
      }
    }
  }, [src, templateId, onLoad, onError]);

  // Error state
  if (hasError) {
    return (
      <div className={cn(
        "flex items-center justify-center min-h-[300px] bg-gray-100 dark:bg-gray-800 rounded-lg",
        className
      )}>
        <div className="text-center text-gray-400">
          <div className="text-2xl mb-2">⚠️</div>
          <div className="text-sm font-medium">Failed to load preview</div>
          <div className="text-xs mt-1 opacity-70">Template: {templateId}</div>
        </div>
      </div>
    );
  }

  // Loading state
  if (isLoading || !imageUrl) {
    return (
      <div className={cn(
        "relative min-h-[300px] bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-800 dark:to-gray-900 rounded-lg overflow-hidden",
        className
      )}>
        {/* Professional loading animation */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className="relative">
              <div className="w-12 h-12 border-4 border-blue-200 dark:border-blue-800 rounded-full animate-spin border-t-blue-500 dark:border-t-blue-400"></div>
              <div className="absolute inset-0 w-12 h-12 border-4 border-transparent rounded-full animate-ping border-t-blue-300 dark:border-t-blue-600"></div>
            </div>
            <div className="mt-4 text-sm font-medium text-gray-600 dark:text-gray-300">
              Loading Preview...
            </div>
            <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              {templateId}
            </div>
          </div>
        </div>

        {/* Shimmer effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse"></div>
      </div>
    );
  }

  // Image loaded state
  return (
    <div className={cn("relative overflow-hidden rounded-lg", className)}>
      <img
        ref={imgRef}
        src={imageUrl}
        alt={alt}
        className="w-full h-full object-contain transition-opacity duration-200"
        style={{
          opacity: 1,
          maxWidth: '100%',
          maxHeight: '100%'
        }}
        onLoad={() => {
          const totalTime = Date.now() - mountTimeRef.current;
          console.log(`🎯 Total render time for ${templateId}: ${totalTime}ms`);
        }}
        onError={() => {
          console.error(`❌ Image render failed for ${templateId}`);
          setHasError(true);
          onError?.();
        }}
      />
      
      {/* Performance indicator (dev only) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="absolute top-2 right-2 bg-green-500 text-white text-xs px-2 py-1 rounded opacity-75">
          CACHED
        </div>
      )}
    </div>
  );
});

UltraFastPreview.displayName = 'UltraFastPreview';
