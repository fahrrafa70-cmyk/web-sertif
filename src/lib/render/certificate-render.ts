/**
 * Certificate Renderer Utility
 * Renders certificate template + text layers to PNG DataURL
 * Reusable across Generate page and Quick Generate modal
 */

// Standard canvas dimensions for reference
const STANDARD_CANVAS_WIDTH = 800;
const STANDARD_CANVAS_HEIGHT = 600;

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
  textAlign?: 'left' | 'center' | 'right' | 'justify';
  maxWidth?: number;
  lineHeight?: number;
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
    img.onerror = () => reject(new Error(`Failed to load image: ${url}`));
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

    // CRITICAL: Always use percent for scaling across different canvas sizes
    // xPercent and yPercent are normalized (0-1) coordinates
    const x = Math.round((layer.xPercent || 0) * width);
    const y = Math.round((layer.yPercent || 0) * height);

    // Set font
    const fontWeight = layer.fontWeight || 'normal';
    const fontSize = Math.max(1, layer.fontSize || 16);
    const fontFamily = layer.fontFamily || 'Arial';
    ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;

    // Set color
    ctx.fillStyle = layer.color || '#000000';

    // Set text baseline - use middle for vertical centering
    ctx.textBaseline = 'middle';

    // Draw text with word wrap if maxWidth is set
    if (layer.maxWidth && layer.maxWidth > 0) {
      // For wrapped text, x is anchor point based on alignment
      const align = layer.textAlign || 'left';
      
      // CRITICAL: Scale maxWidth based on canvas size
      // maxWidth is stored in pixels relative to STANDARD_CANVAS_WIDTH
      const scaleFactor = width / STANDARD_CANVAS_WIDTH;
      const scaledMaxWidth = layer.maxWidth * scaleFactor;
      
      drawWrappedText(
        ctx, 
        layer.text, 
        x, 
        y, 
        scaledMaxWidth, 
        fontSize, 
        layer.lineHeight || 1.2,
        align
      );
    } else {
      // For single line text, x,y is the center point
      // Apply alignment
      const align = layer.textAlign === 'justify' ? 'left' : (layer.textAlign || 'left');
      ctx.textAlign = align as CanvasTextAlign;
      ctx.fillText(layer.text, x, y);
    }
  }

  // Convert to PNG DataURL
  return canvas.toDataURL('image/png');
}

/**
 * Draw text with word wrapping
 */
function drawWrappedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  fontSize: number,
  lineHeight: number,
  textAlign: 'left' | 'center' | 'right' | 'justify'
) {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  // Build lines that fit within maxWidth
  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const metrics = ctx.measureText(testLine);
    
    if (metrics.width > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) {
    lines.push(currentLine);
  }

  // Calculate total height for vertical centering
  const lineHeightPx = fontSize * lineHeight;
  const totalHeight = lines.length * lineHeightPx;
  const startY = y - (totalHeight / 2) + (lineHeightPx / 2);

  // Set canvas text alignment
  ctx.textAlign = textAlign === 'center' ? 'center' : (textAlign === 'right' ? 'right' : 'left');

  // Draw each line
  // x is the anchor point based on alignment:
  // - left: x is left edge of textbox
  // - center: x is center of textbox  
  // - right: x is right edge of textbox
  lines.forEach((line, index) => {
    const lineY = startY + (index * lineHeightPx);
    ctx.fillText(line, x, lineY);
  });
}

/**
 * Save PNG DataURL to public folder (optional, for persistent storage)
 * This is a client-side helper that generates filename
 */
export function generatePNGFilename(prefix: string = 'generated'): string {
  const timestamp = Date.now();
  return `${prefix}_${timestamp}.png`;
}