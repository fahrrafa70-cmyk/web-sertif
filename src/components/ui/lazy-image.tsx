"use client";

import { useState, useRef, useEffect, memo } from 'react';
import Image, { ImageProps } from 'next/image';

interface LazyImageProps extends Omit<ImageProps, 'onLoad' | 'onError'> {
  fallbackSrc?: string;
  showPlaceholder?: boolean;
  priority?: boolean;
  onImageLoad?: () => void;
  onImageError?: () => void;
  rootMargin?: string;
  threshold?: number;
}

/**
 * High-performance LazyImage component with:
 * - Intersection Observer for true lazy loading
 * - Progressive loading with blur placeholder
 * - Error fallback handling
 * - Priority loading for above-the-fold images
 * - Smooth transitions
 */
export const LazyImage = memo(function LazyImage({
  src,
  alt,
  fallbackSrc,
  showPlaceholder = true,
  priority = false,
  onImageLoad,
  onImageError,
  rootMargin = '50px',
  threshold = 0.1,
  className = '',
  ...props
}: LazyImageProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isInView, setIsInView] = useState(priority); // Priority images load immediately
  const [imageSrc, setImageSrc] = useState(src);
  const imgRef = useRef<HTMLDivElement>(null);

  // Intersection Observer for lazy loading
  useEffect(() => {
    if (priority || isInView) return; // Skip if priority or already in view

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            observer.unobserve(entry.target);
          }
        });
      },
      {
        rootMargin,
        threshold,
      }
    );

    const currentRef = imgRef.current;
    if (currentRef) {
      observer.observe(currentRef);
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, [priority, isInView, rootMargin, threshold]);

  // Reset states when src changes
  useEffect(() => {
    setIsLoading(true);
    setHasError(false);
    setImageSrc(src);
  }, [src]);

  const handleLoad = () => {
    setIsLoading(false);
    onImageLoad?.();
  };

  const handleError = () => {
    setHasError(true);
    setIsLoading(false);
    if (fallbackSrc && imageSrc !== fallbackSrc) {
      setImageSrc(fallbackSrc);
      setHasError(false); // Reset error state for fallback
    } else {
      onImageError?.();
    }
  };

  return (
    <div 
      ref={imgRef} 
      className={`relative overflow-hidden ${className}`}
    >
      {/* Enhanced skeleton placeholder while loading */}
      {showPlaceholder && isLoading && (
        <div className="absolute inset-0 bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-800">
          {/* Template icon skeleton */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-12 h-12 bg-gray-300 dark:bg-gray-600 rounded-lg animate-pulse opacity-60">
              <svg className="w-full h-full p-2 text-gray-400 dark:text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
          {/* Shimmer animation overlay */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
          {/* Loading progress bar */}
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-300 dark:bg-gray-600">
            <div className="h-full bg-blue-500 animate-loading-bar" />
          </div>
        </div>
      )}
      
      {/* Actual image - only render when in view or priority */}
      {(isInView || priority) && (
        <Image
          {...props}
          src={imageSrc}
          alt={alt}
          onLoad={handleLoad}
          onError={handleError}
          className={`transition-all duration-700 ease-out ${
            isLoading ? 'opacity-0 scale-105' : 'opacity-100 scale-100'
          } ${className}`}
          loading={priority ? 'eager' : 'lazy'}
          priority={priority}
          quality={85}
          placeholder="empty"
        />
      )}
      
      {/* Error state */}
      {hasError && !fallbackSrc && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 text-sm">
          <div className="text-center">
            <div className="w-8 h-8 mx-auto mb-2 opacity-50">
              <svg fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
              </svg>
            </div>
            <div>Image failed to load</div>
          </div>
        </div>
      )}
      
      {/* Loading indicator for non-placeholder mode */}
      {!showPlaceholder && isLoading && (isInView || priority) && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-50 dark:bg-gray-900">
          <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
});

// Add enhanced animation styles
const enhancedStyles = `
  @keyframes shimmer {
    0% { transform: translateX(-100%); }
    100% { transform: translateX(100%); }
  }
  @keyframes loading-bar {
    0% { width: 0%; }
    50% { width: 70%; }
    100% { width: 100%; }
  }
  .animate-shimmer {
    animation: shimmer 2s infinite;
  }
  .animate-loading-bar {
    animation: loading-bar 2s ease-in-out infinite;
  }
`;

// Inject styles if not already present
if (typeof document !== 'undefined' && !document.getElementById('lazy-image-styles')) {
  const style = document.createElement('style');
  style.id = 'lazy-image-styles';
  style.textContent = enhancedStyles;
  document.head.appendChild(style);
}
