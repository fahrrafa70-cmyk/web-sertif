"use client";

import React, { useState, useRef, useEffect, memo } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { lightweightRenderCache } from '@/lib/cache/lightweight-render-cache';

interface FastPreviewImageProps {
  src: string;
  alt: string;
  templateId: string;
  className?: string;
  onLoad?: () => void;
  onError?: () => void;
}

/**
 * Ultra-Fast Preview Image Component
 * Optimized specifically for template previews in modals
 */
export const FastPreviewImage = memo<FastPreviewImageProps>(({
  src,
  alt,
  templateId,
  className = '',
  onLoad,
  onError
}) => {
  // Check if already rendered for instant display
  const isAlreadyRendered = lightweightRenderCache.isRendered(templateId, 'preview');
  
  const [isLoading, setIsLoading] = useState(!isAlreadyRendered);
  const [hasError, setHasError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(isAlreadyRendered);

  // Preload image immediately for preview
  useEffect(() => {
    if (!isAlreadyRendered && src) {
      const img = new window.Image();
      img.onload = () => {
        lightweightRenderCache.setRendered(templateId, 'preview');
        setIsLoading(false);
        setImageLoaded(true);
        onLoad?.();
      };
      img.onerror = () => {
        setHasError(true);
        setIsLoading(false);
        onError?.();
      };
      img.src = src;
    } else if (isAlreadyRendered) {
      // Already rendered, show immediately
      setIsLoading(false);
      setImageLoaded(true);
      onLoad?.();
    }
  }, [src, templateId, isAlreadyRendered, onLoad, onError]);

  if (hasError) {
    return (
      <div className={cn(
        "bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center min-h-[300px]",
        className
      )}>
        <div className="text-center text-gray-400">
          <div className="text-lg mb-2">⚠️</div>
          <div className="text-sm">Failed to load preview</div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("relative overflow-hidden rounded-lg", className)}>
      {/* Ultra-fast loading for already rendered images */}
      {isLoading && !isAlreadyRendered && (
        <div className="absolute inset-0 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700 animate-pulse" />
      )}

      {/* Optimized image with priority loading */}
      <Image
        src={src}
        alt={alt}
        fill
        priority={true} // Always priority for previews
        quality={95} // High quality for previews
        className={cn(
          "object-contain transition-opacity duration-150",
          imageLoaded ? "opacity-100" : "opacity-0"
        )}
        sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 800px"
        onLoad={() => {
          if (!isAlreadyRendered) {
            lightweightRenderCache.setRendered(templateId, 'preview');
            setIsLoading(false);
            setImageLoaded(true);
            onLoad?.();
          }
        }}
        onError={() => {
          setHasError(true);
          setIsLoading(false);
          onError?.();
        }}
      />

      {/* Fast loading indicator */}
      {isLoading && !isAlreadyRendered && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex items-center space-x-2 text-gray-500">
            <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm">Loading preview...</span>
          </div>
        </div>
      )}
    </div>
  );
});

FastPreviewImage.displayName = 'FastPreviewImage';
