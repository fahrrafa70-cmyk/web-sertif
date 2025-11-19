"use client";

import { useState, useEffect, memo, useRef, useCallback } from 'react';
import Image, { ImageProps } from 'next/image';

interface EnhancedImageProps extends Omit<ImageProps, 'onLoad' | 'onError'> {
  fallbackSrc?: string;
  showPlaceholder?: boolean;
  enableIntersectionObserver?: boolean;
  placeholderClassName?: string;
  onLoadComplete?: () => void;
  onError?: (error: string) => void;
}

/**
 * Enhanced Image component with advanced optimizations:
 * - Intersection Observer for true lazy loading
 * - Progressive loading with blur placeholder
 * - Error handling with fallback
 * - Performance monitoring
 * - Memory leak prevention
 */
export const EnhancedImage = memo(function EnhancedImage({
  src,
  alt,
  fallbackSrc,
  showPlaceholder = true,
  enableIntersectionObserver = true,
  placeholderClassName = '',
  className = '',
  onLoadComplete,
  onError,
  ...props
}: EnhancedImageProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [imageSrc, setImageSrc] = useState(src);
  const [shouldLoad, setShouldLoad] = useState(!enableIntersectionObserver);
  const imgRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Intersection Observer for lazy loading
  useEffect(() => {
    if (!enableIntersectionObserver || shouldLoad) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting) {
          setShouldLoad(true);
          observer.disconnect();
        }
      },
      {
        rootMargin: '50px', // Start loading 50px before entering viewport
        threshold: 0.1
      }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
      observerRef.current = observer;
    }

    return () => {
      observer.disconnect();
    };
  }, [enableIntersectionObserver, shouldLoad]);

  // Reset states when src changes
  useEffect(() => {
    setIsLoading(true);
    setHasError(false);
    setImageSrc(src);
  }, [src]);

  // Cleanup observer on unmount
  useEffect(() => {
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, []);

  const handleLoad = useCallback(() => {
    setIsLoading(false);
    onLoadComplete?.();
  }, [onLoadComplete]);

  const handleError = useCallback(() => {
    setHasError(true);
    setIsLoading(false);
    
    if (fallbackSrc && imageSrc !== fallbackSrc) {
      setImageSrc(fallbackSrc);
      setHasError(false);
      setIsLoading(true);
    } else {
      onError?.('Failed to load image');
    }
  }, [fallbackSrc, imageSrc, onError]);

  return (
    <div 
      ref={imgRef}
      className={`relative overflow-hidden ${className}`}
    >
      {/* Placeholder while loading or waiting for intersection */}
      {showPlaceholder && (isLoading || !shouldLoad) && (
        <div 
          className={`absolute inset-0 bg-gray-200 dark:bg-gray-700 animate-pulse ${placeholderClassName}`}
          aria-label="Loading image..."
        />
      )}
      
      {/* Actual image - only render when should load */}
      {shouldLoad && (
        <Image
          {...props}
          src={imageSrc}
          alt={alt}
          onLoad={handleLoad}
          onError={handleError}
          className={`transition-opacity duration-300 ${
            isLoading ? 'opacity-0' : 'opacity-100'
          }`}
          loading="lazy"
          quality={75}
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        />
      )}
      
      {/* Error state */}
      {hasError && !fallbackSrc && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 text-sm">
          <div className="text-center">
            <div className="mb-2">⚠️</div>
            <div>Failed to load image</div>
          </div>
        </div>
      )}
    </div>
  );
});

/**
 * Certificate thumbnail component with optimized loading
 */
interface CertificateThumbnailProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  priority?: boolean;
}

export const CertificateThumbnail = memo(function CertificateThumbnail({
  src,
  alt,
  width = 300,
  height = 200,
  className = '',
  priority = false
}: CertificateThumbnailProps) {
  return (
    <EnhancedImage
      src={src}
      alt={alt}
      width={width}
      height={height}
      className={`cert-thumbnail-wrapper ${className}`}
      enableIntersectionObserver={!priority}
      showPlaceholder={true}
      placeholderClassName="cert-thumbnail-bg"
      priority={priority}
      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 300px"
    />
  );
});

/**
 * Avatar component with enhanced loading
 */
interface AvatarImageProps {
  src?: string;
  alt: string;
  size?: number;
  fallbackInitials?: string;
  className?: string;
}

export const AvatarImage = memo(function AvatarImage({
  src,
  alt,
  size = 40,
  fallbackInitials,
  className = ''
}: AvatarImageProps) {
  const [showFallback, setShowFallback] = useState(!src);

  return (
    <div 
      className={`relative rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700 ${className}`}
      style={{ width: size, height: size }}
    >
      {src && !showFallback ? (
        <EnhancedImage
          src={src}
          alt={alt}
          width={size}
          height={size}
          className="rounded-full"
          onError={() => setShowFallback(true)}
          enableIntersectionObserver={false} // Avatars should load immediately
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-gray-500 dark:text-gray-400 font-medium">
          {fallbackInitials || alt.charAt(0).toUpperCase()}
        </div>
      )}
    </div>
  );
});
