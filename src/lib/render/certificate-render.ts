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
  
  console.log('🖼️ Template image loaded:', {
    naturalWidth: img.naturalWidth,
    naturalHeight: img.naturalHeight,
    targetWidth: width,
    targetHeight: height
  });

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

    // Calculate position based on percentage (stored relative to standard canvas size)
    const x = Math.round((layer.xPercent || 0) * width);
    const y = Math.round((layer.yPercent || 0) * height);
    
    // CRITICAL: Scale maxWidth based on canvas size
    const scaleFactor = width / STANDARD_CANVAS_WIDTH;
    const scaledMaxWidth = (layer.maxWidth || 300) * scaleFactor;
    
    // CRITICAL: Adjust x coordinate based on alignment to match preview behavior
    // In preview, we use CSS transform to position the anchor point
    // Here we need to adjust x coordinate manually
    const align = layer.textAlign || 'left';
    if (align === 'center') {
      // Center align: x should be at center of textbox
      // No adjustment needed, x is already the center point
    } else if (align === 'right') {
      // Right align: x should be at right edge of textbox
      // No adjustment needed, x is already the right edge
    } else {
      // Left align: x should be at left edge of textbox
      // No adjustment needed, x is already the left edge
    }
    // x coordinate sudah benar karena xPercent disimpan relatif terhadap anchor point yang sesuai dengan alignment
    
    console.log(`📝 Rendering layer "${layer.id}":`, {
      text: layer.text.substring(0, 30),
      xPercent: layer.xPercent,
      yPercent: layer.yPercent,
      x,
      y,
      textAlign: align,
      maxWidth: layer.maxWidth,
      scaledMaxWidth
    });

    // Set font
    const fontWeight = layer.fontWeight === 'bold' ? 'bold' : 'normal';
    const fontSize = Math.max(1, layer.fontSize || 16);
    const fontFamily = layer.fontFamily || 'Arial';
    ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;

    // Set color
    ctx.fillStyle = layer.color || '#000000';

    // CRITICAL: Set text baseline to 'top' to match preview behavior
    // Preview uses CSS with top positioning, so we need to match that
    // We'll handle vertical centering manually in drawWrappedText
    ctx.textBaseline = 'top';
    
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

  // Calculate line height
  const lineHeightPx = fontSize * lineHeight;
  
  // CRITICAL: Match preview behavior exactly
  // Preview has: border(2px) + padding(4px) + text + padding(4px) + border(2px)
  // CSS transform: translate(0%, -50%) centers the ENTIRE element (including padding/border)
  // Total element height = 2 + 4 + lineHeightPx + 4 + 2 = lineHeightPx + 12
  // Offset from center = (lineHeightPx + 12) / 2
  // With textBaseline='top', we start from top of text, so we need to offset:
  // y - offset + border(2) + padding(4) = y - (lineHeightPx + 12)/2 + 6
  const PREVIEW_PADDING = 4;
  const PREVIEW_BORDER = 2;
  const elementHeight = lineHeightPx + (PREVIEW_PADDING * 2) + (PREVIEW_BORDER * 2);
  const startY = y - (elementHeight / 2) + PREVIEW_BORDER + PREVIEW_PADDING;

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