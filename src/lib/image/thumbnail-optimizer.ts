/**
 * Thumbnail Optimizer Utility
 * Handles image compression and thumbnail generation for better performance
 */

export interface ThumbnailOptions {
  width?: number;
  height?: number;
  quality?: number;
  format?: 'webp' | 'jpeg' | 'png';
}

export interface OptimizedImage {
  blob: Blob;
  url: string;
  size: number;
  width: number;
  height: number;
}

/**
 * Create optimized thumbnail from File or Blob
 */
export async function createThumbnail(
  file: File | Blob,
  options: ThumbnailOptions = {}
): Promise<OptimizedImage> {
  const {
    width = 320,
    height = 240,
    quality = 0.8,
    format = 'webp'
  } = options;

  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      reject(new Error('Canvas context not available'));
      return;
    }

    img.onload = () => {
      // Calculate aspect ratio and dimensions
      const aspectRatio = img.width / img.height;
      let targetWidth = width;
      let targetHeight = height;

      // Maintain aspect ratio
      if (aspectRatio > width / height) {
        targetHeight = width / aspectRatio;
      } else {
        targetWidth = height * aspectRatio;
      }

      // Set canvas dimensions
      canvas.width = targetWidth;
      canvas.height = targetHeight;

      // Enable image smoothing for better quality
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      // Draw and compress image
      ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

      // Convert to blob with specified format and quality
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Failed to create thumbnail blob'));
            return;
          }

          const url = URL.createObjectURL(blob);
          resolve({
            blob,
            url,
            size: blob.size,
            width: targetWidth,
            height: targetHeight
          });
        },
        `image/${format}`,
        quality
      );
    };

    img.onerror = () => {
      reject(new Error('Failed to load image'));
    };

    // Load image from file/blob
    const url = URL.createObjectURL(file);
    img.src = url;
  });
}

/**
 * Create multiple thumbnail sizes
 */
export async function createMultipleThumbnails(
  file: File | Blob,
  sizes: ThumbnailOptions[] = [
    { width: 160, height: 120, quality: 0.8 }, // Grid thumbnail
    { width: 320, height: 240, quality: 0.85 }, // Preview thumbnail
    { width: 640, height: 480, quality: 0.9 }   // Large preview
  ]
): Promise<OptimizedImage[]> {
  const thumbnails = await Promise.all(
    sizes.map(size => createThumbnail(file, size))
  );
  
  return thumbnails;
}

/**
 * Compress image while maintaining quality
 */
export async function compressImage(
  file: File,
  maxSizeKB: number = 500,
  maxWidth: number = 1920,
  maxHeight: number = 1080
): Promise<OptimizedImage> {
  let quality = 0.9;
  let width = maxWidth;
  let height = maxHeight;
  
  // Try different quality levels until we get under the size limit
  for (let attempt = 0; attempt < 5; attempt++) {
    const compressed = await createThumbnail(file, {
      width,
      height,
      quality,
      format: 'webp'
    });
    
    const sizeKB = compressed.size / 1024;
    
    if (sizeKB <= maxSizeKB || quality <= 0.3) {
      return compressed;
    }
    
    // Reduce quality for next attempt
    quality -= 0.15;
    
    // If still too large, reduce dimensions
    if (attempt >= 2) {
      width = Math.floor(width * 0.8);
      height = Math.floor(height * 0.8);
    }
  }
  
  // Final attempt with lowest settings
  return createThumbnail(file, {
    width: Math.floor(maxWidth * 0.5),
    height: Math.floor(maxHeight * 0.5),
    quality: 0.3,
    format: 'webp'
  });
}

/**
 * Get image dimensions without loading full image
 */
export function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    
    img.onload = () => {
      resolve({
        width: img.width,
        height: img.height
      });
      URL.revokeObjectURL(img.src);
    };
    
    img.onerror = () => {
      reject(new Error('Failed to load image for dimension check'));
    };
    
    img.src = URL.createObjectURL(file);
  });
}

/**
 * Check if browser supports WebP format
 */
export function supportsWebP(): boolean {
  const canvas = document.createElement('canvas');
  canvas.width = 1;
  canvas.height = 1;
  return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
}

/**
 * Get optimal image format based on browser support
 */
export function getOptimalFormat(): 'webp' | 'jpeg' {
  return supportsWebP() ? 'webp' : 'jpeg';
}

/**
 * Clean up object URLs to prevent memory leaks
 */
export function cleanupObjectURL(url: string): void {
  if (url.startsWith('blob:')) {
    URL.revokeObjectURL(url);
  }
}
