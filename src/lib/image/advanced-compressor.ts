/**
 * ADVANCED IMAGE COMPRESSION ENGINE
 * Professional-grade image optimization for maximum performance
 */

interface CompressionOptions {
  quality: number;
  maxWidth: number;
  maxHeight: number;
  format: 'webp' | 'jpeg' | 'png';
  progressive?: boolean;
}

interface CompressionResult {
  blob: Blob;
  url: string;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
  format: string;
}

export class AdvancedImageCompressor {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  constructor() {
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d')!;
    
    // Optimize canvas for performance
    this.ctx.imageSmoothingEnabled = true;
    this.ctx.imageSmoothingQuality = 'high';
  }

  /**
   * AGGRESSIVE compression for thumbnails
   */
  async compressThumbnail(imageUrl: string, size: 'xs' | 'sm' | 'md' | 'lg' = 'sm'): Promise<CompressionResult> {
    const compressionSettings = {
      xs: { quality: 0.6, maxWidth: 160, maxHeight: 120, format: 'webp' as const },
      sm: { quality: 0.7, maxWidth: 240, maxHeight: 180, format: 'webp' as const },
      md: { quality: 0.75, maxWidth: 320, maxHeight: 240, format: 'webp' as const },
      lg: { quality: 0.8, maxWidth: 480, maxHeight: 360, format: 'webp' as const }
    };

    return this.compressImage(imageUrl, compressionSettings[size]);
  }

  /**
   * HIGH-QUALITY compression for preview
   */
  async compressPreview(imageUrl: string): Promise<CompressionResult> {
    return this.compressImage(imageUrl, {
      quality: 0.85,
      maxWidth: 800,
      maxHeight: 600,
      format: 'webp',
      progressive: true
    });
  }

  /**
   * ULTRA compression for fastest loading
   */
  async compressUltraFast(imageUrl: string): Promise<CompressionResult> {
    return this.compressImage(imageUrl, {
      quality: 0.5,
      maxWidth: 120,
      maxHeight: 90,
      format: 'webp'
    });
  }

  /**
   * Core compression engine
   */
  private async compressImage(imageUrl: string, options: CompressionOptions): Promise<CompressionResult> {
    const startTime = Date.now();
    
    try {
      // Load original image
      const img = await this.loadImage(imageUrl);
      const originalSize = await this.getImageSize(imageUrl);

      // Calculate optimal dimensions
      const { width, height } = this.calculateDimensions(
        img.width, 
        img.height, 
        options.maxWidth, 
        options.maxHeight
      );

      // Setup canvas
      this.canvas.width = width;
      this.canvas.height = height;

      // Clear canvas with white background for better compression
      this.ctx.fillStyle = '#FFFFFF';
      this.ctx.fillRect(0, 0, width, height);

      // Draw and compress image
      this.ctx.drawImage(img, 0, 0, width, height);

      // Convert to blob with compression
      const blob = await this.canvasToBlob(options);
      const url = URL.createObjectURL(blob);

      const compressionTime = Date.now() - startTime;
      const compressionRatio = ((originalSize - blob.size) / originalSize) * 100;

      console.log(`🗜️ Compressed ${width}x${height} in ${compressionTime}ms: ${this.formatBytes(originalSize)} → ${this.formatBytes(blob.size)} (${compressionRatio.toFixed(1)}% reduction)`);

      return {
        blob,
        url,
        originalSize,
        compressedSize: blob.size,
        compressionRatio,
        format: options.format
      };

    } catch (error) {
      console.error('❌ Compression failed:', error);
      throw error;
    }
  }

  /**
   * Load image from URL
   */
  private loadImage(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(`Failed to load image: ${url}`));
      img.src = url;
    });
  }

  /**
   * Get original image file size
   */
  private async getImageSize(url: string): Promise<number> {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      return blob.size;
    } catch {
      return 0; // Fallback if size detection fails
    }
  }

  /**
   * Calculate optimal dimensions maintaining aspect ratio
   */
  private calculateDimensions(
    originalWidth: number, 
    originalHeight: number, 
    maxWidth: number, 
    maxHeight: number
  ): { width: number; height: number } {
    const aspectRatio = originalWidth / originalHeight;

    let width = originalWidth;
    let height = originalHeight;

    // Scale down if too large
    if (width > maxWidth) {
      width = maxWidth;
      height = width / aspectRatio;
    }

    if (height > maxHeight) {
      height = maxHeight;
      width = height * aspectRatio;
    }

    return {
      width: Math.round(width),
      height: Math.round(height)
    };
  }

  /**
   * Convert canvas to compressed blob
   */
  private canvasToBlob(options: CompressionOptions): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const mimeType = `image/${options.format}`;
      
      this.canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to create blob'));
          }
        },
        mimeType,
        options.quality
      );
    });
  }

  /**
   * Format bytes for logging
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  }

  /**
   * Batch compress multiple images
   */
  async batchCompress(
    images: Array<{ url: string; size: 'xs' | 'sm' | 'md' | 'lg' }>,
    onProgress?: (completed: number, total: number) => void
  ): Promise<CompressionResult[]> {
    const results: CompressionResult[] = [];
    
    for (let i = 0; i < images.length; i++) {
      const { url, size } = images[i];
      
      try {
        const result = await this.compressThumbnail(url, size);
        results.push(result);
        onProgress?.(i + 1, images.length);
      } catch (error) {
        console.error(`Failed to compress ${url}:`, error);
      }
    }

    return results;
  }

  /**
   * Get compression statistics
   */
  getCompressionStats(results: CompressionResult[]) {
    const totalOriginal = results.reduce((sum, r) => sum + r.originalSize, 0);
    const totalCompressed = results.reduce((sum, r) => sum + r.compressedSize, 0);
    const avgCompression = results.reduce((sum, r) => sum + r.compressionRatio, 0) / results.length;

    return {
      totalImages: results.length,
      totalOriginalSize: this.formatBytes(totalOriginal),
      totalCompressedSize: this.formatBytes(totalCompressed),
      totalSavings: this.formatBytes(totalOriginal - totalCompressed),
      averageCompression: `${avgCompression.toFixed(1)}%`,
      totalCompressionRatio: `${(((totalOriginal - totalCompressed) / totalOriginal) * 100).toFixed(1)}%`
    };
  }

  /**
   * Cleanup resources
   */
  dispose(): void {
    this.canvas.remove();
  }
}

// Singleton instance
export const advancedCompressor = new AdvancedImageCompressor();

// Export for debugging
if (typeof window !== 'undefined') {
  (window as any).advancedCompressor = advancedCompressor;
}
