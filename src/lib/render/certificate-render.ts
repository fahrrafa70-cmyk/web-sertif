/**
 * Certificate Renderer Utility
 * Renders certificate template + text layers to PNG DataURL
 * Reusable across Generate page and Quick Generate modal
 */

export interface RenderTextLayer {
  id: string;
  text: string;
  x?: number;
  y?: number;
  xPercent?: number;
  yPercent?: number;
  fontSize: number;
  color: string;
  fontWeight?: string;
  fontFamily?: string;
}

export interface RenderCertificateParams {
  templateImageUrl: string;
  textLayers: RenderTextLayer[];
  width: number;
  height: number;
}

/**
 * Load image from URL
 */
function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (error) => reject(new Error(`Failed to load image: ${url}`));
    img.src = url;
  });
}

/**
 * Render certificate to PNG DataURL
 * @param params - Render parameters
 * @returns PNG DataURL
 */
export async function renderCertificateToDataURL(
  params: RenderCertificateParams
): Promise<string> {
  const { templateImageUrl, textLayers, width, height } = params;

  // Load template image
  const img = await loadImage(templateImageUrl);

  // Create offscreen canvas
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  
  if (!ctx) {
    throw new Error('Failed to get canvas context');
  }

  // Draw template background
  ctx.drawImage(img, 0, 0, width, height);

  // Draw text layers
  for (const layer of textLayers) {
    if (!layer.text) continue; // Skip empty text

    // Calculate absolute position
    const x = layer.x !== undefined 
      ? layer.x 
      : Math.round((layer.xPercent || 0) * width);
    const y = layer.y !== undefined 
      ? layer.y 
      : Math.round((layer.yPercent || 0) * height);

    // Set font
    const fontWeight = layer.fontWeight || 'normal';
    const fontSize = Math.max(1, layer.fontSize || 16);
    const fontFamily = layer.fontFamily || 'Arial';
    ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;

    // Set color
    ctx.fillStyle = layer.color || '#000000';

    // Set text baseline and alignment
    ctx.textBaseline = 'top';
    
    // Special handling for name field - right align
    if (layer.id === 'name') {
      ctx.textAlign = 'right';
    } else {
      ctx.textAlign = 'left';
    }

    // Draw text
    ctx.fillText(layer.text, x, y);
  }

  // Convert to PNG DataURL
  return canvas.toDataURL('image/png');
}

/**
 * Save PNG DataURL to public folder (optional, for persistent storage)
 * This is a client-side helper that generates filename
 */
export function generatePNGFilename(prefix: string = 'generated'): string {
  const timestamp = Date.now();
  return `${prefix}_${timestamp}.png`;
}