/**
 * Certificate Renderer Utility
 * Renders certificate template + text layers + QR codes to PNG DataURL
 * Reusable across Generate page and Quick Generate modal
 */

import {
  STANDARD_CANVAS_WIDTH,
  STANDARD_CANVAS_HEIGHT,
} from "@/lib/constants/canvas";
import { RichText } from "@/types/rich-text";
import { generateQRCodeDataURL } from "@/lib/utils/qr-code";

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
  fontStyle?:
    | "normal"
    | "italic"
    | "oblique"
    | "underline"
    | "line-through"
    | "overline";
  textAlign?: "left" | "center" | "right" | "justify";
  maxWidth?: number;
  lineHeight?: number;
  richText?: RichText; // Rich text with inline formatting
  hasInlineFormatting?: boolean; // Whether layer uses rich text
}

/**
 * Photo Layer for Rendering
 * Supports crop, mask, fitMode like Canva/Picsart
 */
export interface RenderPhotoLayer {
  id: string;
  type: "photo" | "logo" | "signature" | "decoration";
  src: string;

  // Position (percentage-based, fallback to absolute)
  x?: number;
  y?: number;
  xPercent?: number;
  yPercent?: number;

  // Size (percentage-based, fallback to absolute)
  width?: number;
  height?: number;
  widthPercent?: number;
  heightPercent?: number;

  // Layer order
  zIndex: number;

  // Fit mode
  fitMode: "contain" | "cover" | "fill" | "none";

  // Crop (optional)
  crop?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };

  // Mask (optional)
  mask?: {
    type: "none" | "circle" | "ellipse" | "roundedRect" | "polygon";
    borderRadius?: number;
    points?: { x: number; y: number }[];
  };

  // Visual effects
  opacity: number;
  rotation: number;
}

/**
 * QR Code Layer for Rendering
 */
export interface RenderQRLayer {
  id: string;
  type: "qr_code";
  qrData: string; // Data to encode (URL placeholder will be replaced)
  displayType?: "qr_code" | "link"; // Display type: 'qr_code' shows QR image, 'link' shows URL text

  // Position (percentage-based, fallback to absolute)
  x?: number;
  y?: number;
  xPercent?: number;
  yPercent?: number;

  // Size (percentage-based, fallback to absolute)
  width?: number;
  height?: number;
  widthPercent?: number;
  heightPercent?: number;

  // Layer order
  zIndex: number;

  // QR Code appearance
  foregroundColor?: string;
  backgroundColor?: string;
  errorCorrectionLevel?: "L" | "M" | "Q" | "H";
  margin?: number;

  // Visual effects
  opacity: number;
  rotation: number;

  // Text styling (for link display type)
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: string;
  textAlign?: "left" | "center" | "right";
}

export interface RenderCertificateParams {
  templateImageUrl: string;
  textLayers: RenderTextLayer[];
  photoLayers?: RenderPhotoLayer[]; // Optional: Photo/image layers
  qrLayers?: RenderQRLayer[]; // Optional: QR code layers
  width?: number; // Optional: If not provided, use template's natural width
  height?: number; // Optional: If not provided, use template's natural height
  templateId?: string; // Optional: Template identifier (for per-template tweaks)
  templateName?: string; // Optional: Template name (for per-template tweaks)
}

/**
 * Load image from URL
 */
function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image: ${url}`));
    img.src = url;
  });
}

/**
 * Render QR code layer
 * Generates QR code and renders it at specified position or as text link
 */
async function renderQRLayer(
  ctx: CanvasRenderingContext2D,
  layer: RenderQRLayer,
  canvasWidth: number,
  canvasHeight: number,
): Promise<void> {
  // Calculate position (percentage-first)
  const x =
    layer.xPercent !== undefined && layer.xPercent !== null
      ? Math.round(layer.xPercent * canvasWidth)
      : layer.x || 0;
  const y =
    layer.yPercent !== undefined && layer.yPercent !== null
      ? Math.round(layer.yPercent * canvasHeight)
      : layer.y || 0;

  // Calculate size (percentage-first)
  const width =
    layer.widthPercent !== undefined && layer.widthPercent !== null
      ? Math.round(layer.widthPercent * canvasWidth)
      : layer.width || 100;
  const height =
    layer.heightPercent !== undefined && layer.heightPercent !== null
      ? Math.round(layer.heightPercent * canvasHeight)
      : layer.height || 100;

  // Save context state
  ctx.save();

  // Apply opacity
  ctx.globalAlpha = layer.opacity;

  // Apply rotation
  if (layer.rotation !== 0) {
    // Move to center of QR code/text
    ctx.translate(x + width / 2, y + height / 2);
    ctx.rotate((layer.rotation * Math.PI) / 180);
    ctx.translate(-(x + width / 2), -(y + height / 2));
  }

  // Check display type
  const displayType = layer.displayType || "qr_code";

  if (displayType === "link") {
    // ===== RENDER AS TEXT LINK =====
    const fontSize = layer.fontSize || Math.min(width, height) * 0.1; // Auto-size based on layer size
    const fontFamily = layer.fontFamily || "Arial";
    const fontWeight = layer.fontWeight || "normal";
    const textAlign = layer.textAlign || "left";

    // Set font
    ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
    ctx.fillStyle = layer.foregroundColor || "#0066CC"; // Default link blue
    ctx.textAlign = textAlign;
    ctx.textBaseline = "top";

    // Word wrap the URL text to fit within the layer bounds
    const urlText = layer.qrData;
    const words = urlText.split(/[\s\/]/); // Split by spaces and slashes
    const lines: string[] = [];
    let currentLine = "";

    for (const word of words) {
      const testLine = currentLine ? `${currentLine}/${word}` : word;
      const metrics = ctx.measureText(testLine);

      if (metrics.width <= width && currentLine) {
        currentLine = testLine;
      } else {
        if (currentLine) {
          lines.push(currentLine);
        }
        currentLine = word;
      }
    }
    if (currentLine) {
      lines.push(currentLine);
    }

    // Draw text lines
    const lineHeight = fontSize * 1.2;
    let textY = y;

    // Center vertically if multiple lines
    if (lines.length > 1) {
      const totalTextHeight = lines.length * lineHeight;
      textY = y + (height - totalTextHeight) / 2;
    }

    lines.forEach((line, index) => {
      let textX = x;
      if (textAlign === "center") {
        textX = x + width / 2;
      } else if (textAlign === "right") {
        textX = x + width;
      }

      ctx.fillText(line, textX, textY + index * lineHeight);
    });
  } else {
    // ===== RENDER AS QR CODE IMAGE (default) =====
    // Generate QR code as data URL
    const qrDataURL = await generateQRCodeDataURL(layer.qrData, {
      width,
      height,
      errorCorrectionLevel: layer.errorCorrectionLevel || "M",
      margin: layer.margin ?? 4,
      color: {
        dark: layer.foregroundColor || "#000000",
        light: layer.backgroundColor || "#FFFFFF",
      },
    });

    // Load QR code image
    const qrImage = await loadImage(qrDataURL);

    // Draw QR code
    ctx.drawImage(qrImage, x, y, width, height);
  }

  // Restore context state
  ctx.restore();
}

/**
 * Save PNG DataURL to public folder (optional, for persistent storage)
 * This is a client-side helper that generates filename
 */
export function generatePNGFilename(prefix: string = "generated"): string {
  const timestamp = Date.now();
  return `${prefix}_${timestamp}.png`;
}

// Export the renderQRLayer function for use in the main render function
export { renderQRLayer };
