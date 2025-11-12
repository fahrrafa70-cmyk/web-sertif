/**
 * Thumbnail Size Configuration for Template Images
 * Optimized for different use cases and devices
 */

export interface ThumbnailSize {
  width: number;
  height: number;
  quality: number;
  suffix: string;
  description: string;
}

// ✅ OPTIMIZED: Multiple thumbnail sizes for different use cases
export const THUMBNAIL_SIZES: Record<string, ThumbnailSize> = {
  // Ultra-small for grid view (fastest loading)
  xs: {
    width: 160,
    height: 120,
    quality: 0.7,
    suffix: '_xs',
    description: 'Grid thumbnail (160x120)'
  },
  
  // Small for card view (balanced speed/quality)
  sm: {
    width: 240,
    height: 180,
    quality: 0.8,
    suffix: '_sm',
    description: 'Card thumbnail (240x180)'
  },
  
  // Medium for preview (good quality)
  md: {
    width: 320,
    height: 240,
    quality: 0.85,
    suffix: '_md',
    description: 'Preview thumbnail (320x240)'
  },
  
  // Large for detailed view (high quality)
  lg: {
    width: 480,
    height: 360,
    quality: 0.9,
    suffix: '_lg',
    description: 'Large preview (480x360)'
  }
};

// ✅ PERFORMANCE: Default size for initial load (fastest)
export const DEFAULT_THUMBNAIL_SIZE = 'sm';

// ✅ PROGRESSIVE: Size progression for lazy loading
export const PROGRESSIVE_SIZES = ['xs', 'sm', 'md'] as const;

/**
 * Get thumbnail URL with specific size
 */
export function getThumbnailUrl(
  baseUrl: string, 
  size: keyof typeof THUMBNAIL_SIZES = DEFAULT_THUMBNAIL_SIZE
): string {
  if (!baseUrl) return '';
  
  const sizeConfig = THUMBNAIL_SIZES[size];
  if (!sizeConfig) return baseUrl;
  
  // Add size suffix before file extension
  const lastDotIndex = baseUrl.lastIndexOf('.');
  if (lastDotIndex === -1) return baseUrl;
  
  const baseName = baseUrl.substring(0, lastDotIndex);
  const extension = baseUrl.substring(lastDotIndex);
  
  return `${baseName}${sizeConfig.suffix}${extension}`;
}

/**
 * Get WebP version of thumbnail (better compression)
 */
export function getWebPThumbnailUrl(
  baseUrl: string, 
  size: keyof typeof THUMBNAIL_SIZES = DEFAULT_THUMBNAIL_SIZE
): string {
  const thumbnailUrl = getThumbnailUrl(baseUrl, size);
  return thumbnailUrl.replace(/\.(jpg|jpeg|png)$/i, '.webp');
}

/**
 * Get srcSet for responsive images
 */
export function getThumbnailSrcSet(baseUrl: string): string {
  if (!baseUrl) return '';
  
  return Object.entries(THUMBNAIL_SIZES)
    .map(([key, config]) => {
      const url = getThumbnailUrl(baseUrl, key as keyof typeof THUMBNAIL_SIZES);
      return `${url} ${config.width}w`;
    })
    .join(', ');
}

/**
 * Get sizes attribute for responsive images
 */
export function getThumbnailSizes(): string {
  return [
    '(max-width: 640px) 160px',   // Mobile: xs
    '(max-width: 768px) 240px',   // Tablet: sm  
    '(max-width: 1024px) 320px',  // Desktop: md
    '480px'                       // Large: lg
  ].join(', ');
}
