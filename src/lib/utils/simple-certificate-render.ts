// Simple certificate render utility to replace the heavy certificate-render system
import { RichText } from '@/types/rich-text';

export interface RenderTextLayer {
  id: string;
  text: string;
  x: number;
  y: number;
  xPercent?: number;
  yPercent?: number;
  fontSize: number;
  fontFamily: string;
  color: string;
  textAlign: 'left' | 'center' | 'right' | 'justify' | undefined;
  fontWeight: 'normal' | 'bold' | string;
  maxWidth?: number;
  lineHeight?: number;
  richText?: RichText;
  hasInlineFormatting?: boolean;
}

export async function renderCertificateToDataURL(
  templateImageUrl: string,
  textLayers: RenderTextLayer[],
  canvasWidth: number = 1200,
  canvasHeight: number = 800
): Promise<string> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      reject(new Error('Could not get canvas context'));
      return;
    }

    canvas.width = canvasWidth;
    canvas.height = canvasHeight;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      try {
        // Draw template image
        ctx.drawImage(img, 0, 0, canvasWidth, canvasHeight);
        
        // Draw text layers
        textLayers.forEach(layer => {
          ctx.font = `${layer.fontWeight} ${layer.fontSize}px ${layer.fontFamily}`;
          ctx.fillStyle = layer.color;
          ctx.textAlign = (layer.textAlign as CanvasTextAlign) || 'left';
          
          const x = layer.x;
          const y = layer.y;
          
          ctx.fillText(layer.text, x, y);
        });
        
        // Convert to data URL
        const dataURL = canvas.toDataURL('image/png', 0.9);
        resolve(dataURL);
      } catch (error) {
        reject(error);
      }
    };
    
    img.onerror = () => {
      reject(new Error('Failed to load template image'));
    };
    
    img.src = templateImageUrl;
  });
}
