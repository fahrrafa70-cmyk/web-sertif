"use client";

import React, { useState, useEffect, memo } from 'react';
import { cn } from '@/lib/utils';
import { aggressiveImageCache } from '@/lib/cache/aggressive-image-cache';
import { lightweightRenderCache } from '@/lib/cache/lightweight-render-cache';
import { advancedCompressor } from '@/lib/image/advanced-compressor';

interface CompressedThumbnailProps {
  src: string;
  alt: string;
  templateId: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
  priority?: boolean;
  onLoad?: () => void;
  onError?: () => void;
  onHover?: () => void;
}

/**
 * COMPRESSED THUMBNAIL COMPONENT
 * Ultra-lightweight thumbnails with aggressive compression
 * Guaranteed fast loading with minimal bandwidth usage
 */
export const CompressedThumbnail = memo<CompressedThumbnailProps>(({
  src,
  alt,
  templateId,
  size = 'sm',
  className = '',
  priority = false,
  onLoad,
  onError,
  onHover
}) => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [compressionStats, setCompressionStats] = useState<string>('');

  // INSTANT check for cached compressed image
  useEffect(() => {
    const loadCompressedImage = async () => {
      const startTime = Date.now();
      
      try {
        // Check aggressive cache first
        const cachedUrl = aggressiveImageCache.getCachedImageUrl(templateId, size);
        if (cachedUrl) {
          setImageUrl(cachedUrl);
          setIsLoading(false);
          lightweightRenderCache.setRendered(templateId, size);
          onLoad?.();
          console.log(`⚡ INSTANT compressed thumbnail for ${templateId} in ${Date.now() - startTime}ms`);
          return;
        }

        // Check if previously rendered (browser cache)
        if (lightweightRenderCache.isRendered(templateId, size)) {
          // Try browser cache first
          const img = new Image();
          img.onload = () => {
            setImageUrl(src);
            setIsLoading(false);
            onLoad?.();
            console.log(`🚀 Browser cache hit for ${templateId}`);
          };
          img.onerror = () => compressAndCache();
          img.src = src;
        } else {
          await compressAndCache();
        }

        async function compressAndCache() {
          console.log(`🗜️ Compressing thumbnail ${templateId} (${size})`);
          
          try {
            // Compress image aggressively
            const compressedResult = await advancedCompressor.compressThumbnail(src, size);
            
            // Cache compressed image
            await aggressiveImageCache.preloadAndCache(templateId, src, size);
            
            setImageUrl(compressedResult.url);
            setIsLoading(false);
            lightweightRenderCache.setRendered(templateId, size);
            
            // Set compression stats for debugging
            setCompressionStats(`${compressedResult.compressionRatio.toFixed(1)}% saved`);
            
            onLoad?.();
            
            const totalTime = Date.now() - startTime;
            console.log(`✅ Compressed thumbnail ${templateId}: ${compressedResult.compressionRatio.toFixed(1)}% reduction in ${totalTime}ms`);
            
          } catch (error) {
            console.error(`❌ Compression failed for ${templateId}:`, error);
            setHasError(true);
            setIsLoading(false);
            onError?.();
          }
        }

      } catch (error) {
        console.error(`❌ Failed to load compressed thumbnail ${templateId}:`, error);
        setHasError(true);
        setIsLoading(false);
        onError?.();
      }
    };

    loadCompressedImage();
  }, [src, templateId, size, onLoad, onError]);

  // Handle hover for preloading larger sizes
  const handleMouseEnter = () => {
    onHover?.();
    
    // Preload larger size on hover
    if (size !== 'lg') {
      aggressiveImageCache.preloadAndCache(templateId, src, 'lg');
    }
  };

  // Error state
  if (hasError) {
    return (
      <div className={cn(
        "bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center",
        className
      )}>
        <div className="text-gray-400 text-xs text-center">
          <div className="mb-1">⚠️</div>
          <div>Failed</div>
        </div>
      </div>
    );
  }

  // Loading state with compression indicator
  if (isLoading || !imageUrl) {
    return (
      <div className={cn(
        "relative bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 rounded-lg overflow-hidden",
        className
      )}>
        {/* Compression loading animation */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className="w-6 h-6 border-2 border-blue-400 border-t-transparent rounded-full animate-spin mb-2"></div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Compressing...
            </div>
          </div>
        </div>

        {/* Shimmer effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-pulse"></div>
      </div>
    );
  }

  // Compressed image loaded
  return (
    <div 
      className={cn("relative overflow-hidden rounded-lg group", className)}
      onMouseEnter={handleMouseEnter}
    >
      <img
        src={imageUrl}
        alt={alt}
        className="w-full h-full object-contain transition-all duration-200 group-hover:scale-105"
        style={{
          opacity: 1,
          maxWidth: '100%',
          maxHeight: '100%'
        }}
        loading={priority ? 'eager' : 'lazy'}
        onLoad={() => {
          console.log(`🎯 Compressed thumbnail rendered: ${templateId}`);
        }}
        onError={() => {
          console.error(`❌ Compressed thumbnail render failed: ${templateId}`);
          setHasError(true);
          onError?.();
        }}
      />
      
      {/* Compression stats indicator (dev only) */}
      {process.env.NODE_ENV === 'development' && compressionStats && (
        <div className="absolute top-1 right-1 bg-green-500 text-white text-xs px-1 py-0.5 rounded opacity-75">
          {compressionStats}
        </div>
      )}

      {/* Hover effect overlay */}
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors duration-200" />
    </div>
  );
});

CompressedThumbnail.displayName = 'CompressedThumbnail';
