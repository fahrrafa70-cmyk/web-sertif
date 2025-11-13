/**
 * Thumbnail Generation Utilities
 * Convert PNG master files to WebP previews for web optimization
 */

export interface ThumbnailOptions {
  /**
   * Output format (default: 'webp')
   */
  format?: 'webp' | 'jpeg' | 'png';
  
  /**
   * Quality for lossy formats (0.0 - 1.0, default: 0.85)
   */
  quality?: number;
  
  /**
   * Maximum width for resizing (maintains aspect ratio)
   * If not specified, original dimensions are preserved
   */
  maxWidth?: number;
  
  /**
   * Maximum height for resizing (maintains aspect ratio)
   * If not specified, original dimensions are preserved
   */
  maxHeight?: number;
}

/**
 * Generate thumbnail from image data URL
 * 
 * @param imageDataUrl - Original image data URL (typically PNG)
 * @param options - Thumbnail generation options
 * @returns Promise<string> - Thumbnail data URL
 */
export async function generateThumbnail(
  imageDataUrl: string, 
  options: ThumbnailOptions = {}
): Promise<string> {
  const {
    format = 'webp',
    quality = 0.85,
    maxWidth,
    maxHeight
  } = options;

  return new Promise((resolve, reject) => {
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        throw new Error('Could not get canvas context');
      }

      const img = new Image();
      
      img.onload = () => {
        try {
          let { width, height } = img;

          // Calculate new dimensions if max constraints are provided
          if (maxWidth && width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }
          
          if (maxHeight && height > maxHeight) {
            width = (width * maxHeight) / height;
            height = maxHeight;
          }

          // Set canvas dimensions
          canvas.width = Math.round(width);
          canvas.height = Math.round(height);

          // Draw resized image
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

          // Convert to desired format
          let mimeType: string;
          let qualityParam: number | undefined;

          switch (format) {
            case 'webp':
              mimeType = 'image/webp';
              qualityParam = quality;
              break;
            case 'jpeg':
              mimeType = 'image/jpeg';
              qualityParam = quality;
              break;
            case 'png':
              mimeType = 'image/png';
              qualityParam = undefined; // PNG is lossless
              break;
            default:
              throw new Error(`Unsupported format: ${format}`);
          }

          const thumbnailDataUrl = canvas.toDataURL(mimeType, qualityParam);
          resolve(thumbnailDataUrl);
        } catch (error) {
          reject(error);
        }
      };

      img.onerror = () => {
        reject(new Error('Failed to load image for thumbnail generation'));
      };

      img.src = imageDataUrl;
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Generate thumbnail filename from original filename
 * 
 * @param originalFileName - Original filename (e.g., "cert_123_timestamp.png")
 * @param format - Thumbnail format (default: 'webp')
 * @returns string - Thumbnail filename (e.g., "cert_123_timestamp_thumb.webp")
 */
export function generateThumbnailFileName(
  originalFileName: string, 
  format: 'webp' | 'jpeg' | 'png' = 'webp'
): string {
  const lastDotIndex = originalFileName.lastIndexOf('.');
  const baseName = lastDotIndex > 0 
    ? originalFileName.substring(0, lastDotIndex)
    : originalFileName;
  
  return `${baseName}_thumb.${format}`;
}

/**
 * Calculate file size reduction percentage
 * 
 * @param originalSize - Original file size in bytes
 * @param thumbnailSize - Thumbnail file size in bytes
 * @returns string - Reduction percentage (e.g., "75.5%")
 */
export function calculateSizeReduction(originalSize: number, thumbnailSize: number): string {
  if (originalSize === 0) return "0%";
  const reduction = ((originalSize - thumbnailSize) / originalSize) * 100;
  return `${Math.round(reduction * 10) / 10}%`;
}

/**
 * Estimate data URL size in bytes
 * Data URLs are base64 encoded (~4/3 overhead)
 * 
 * @param dataUrl - Data URL string
 * @returns number - Estimated size in bytes
 */
export function estimateDataUrlSize(dataUrl: string): number {
  const base64Data = dataUrl.split(',')[1] || '';
  return Math.round((base64Data.length * 3) / 4);
}
