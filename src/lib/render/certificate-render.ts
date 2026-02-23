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
import { loadFontsForTextLayers } from "./utils/font-loader";
import { loadImage } from "./utils/image-loader";
import { drawWrappedText, drawRichText } from "./utils/text-render";
import { renderPhotoLayer } from "./utils/photo-render";
import { renderQRLayer } from "./utils/qr-render";

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
  letterSpacing?: number; // Optional letterSpacing property
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
 * Render certificate to PNG DataURL
 * @param params - Render parameters
 * @returns PNG DataURL
 */
export async function renderCertificateToDataURL(
  params: RenderCertificateParams,
): Promise<string> {
  const {
    templateImageUrl,
    textLayers,
    photoLayers,
    qrLayers,
    width,
    height,
    templateId,
    templateName,
  } = params;

  // Template-specific behavior: detect Sertifikat Kompetensi UBIG
  const isUbigTemplate =
    templateId === "fcfa7587-5c4e-4a6f-a4c7-04288c0e7031" ||
    (typeof templateName === "string" &&
      templateName.toLowerCase().includes("sertifikat kompetensi ubig"));

  // CRITICAL: Wait for fonts to load before rendering
  // Font rendering differences between CSS and Canvas can cause positioning issues
  await loadFontsForTextLayers(textLayers);

  // Load template image
  const img = await loadImage(templateImageUrl);

  // DYNAMIC CANVAS SIZE (like Canva/Affinity):
  // Use template's NATURAL dimensions if not explicitly provided
  // This ensures output matches template resolution exactly (no scaling/distortion)
  const finalWidth = width ?? img.naturalWidth;
  const finalHeight = height ?? img.naturalHeight;

  // Create offscreen canvas at FINAL dimensions
  const canvas = document.createElement("canvas");
  canvas.width = finalWidth;
  canvas.height = finalHeight;
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error("Failed to get canvas context");
  }

  // DPI-Aware Canvas Setup
  // Get device pixel ratio for high-DPI displays
  const dpr = window.devicePixelRatio || 1;
  void dpr; // DPR is captured for potential future use

  // Note: For certificate generation, we render at native resolution
  // DPR scaling is primarily for preview/display, not export
  // Export always uses template's native resolution for best quality

  // Draw template background
  ctx.drawImage(img, 0, 0, finalWidth, finalHeight);

  // ===== LAYER RENDERING SYSTEM =====
  // Professional layer-based rendering like Canva/Picsart
  // Layers are rendered in order of zIndex (lowest to highest)
  // Default zIndex: photo layers = 50, text layers = 100

  // Calculate scaleFactor once (used by both photo and text layers)
  const scaleFactor = finalWidth / STANDARD_CANVAS_WIDTH;

  // Prepare all layers with zIndex for sorting
  interface LayerToRender {
    type: "photo" | "text" | "qr";
    zIndex: number;
    data: RenderPhotoLayer | RenderTextLayer | RenderQRLayer;
  }

  const layersToRender: LayerToRender[] = [];

  // Add photo layers
  if (photoLayers && photoLayers.length > 0) {
    photoLayers.forEach((layer) => {
      layersToRender.push({
        type: "photo",
        zIndex: layer.zIndex || 0,
        data: layer,
      });
    });
  }

  // Add text layers (default zIndex = 100 to appear above photos)
  textLayers.forEach((layer) => {
    layersToRender.push({
      type: "text",
      zIndex: 100, // Text layers default to top
      data: layer,
    });
  });

  // Add QR code layers
  if (qrLayers && qrLayers.length > 0) {
    qrLayers.forEach((layer) => {
      layersToRender.push({
        type: "qr",
        zIndex: layer.zIndex || 50,
        data: layer,
      });
    });
  }

  // Sort layers by zIndex (ascending)
  layersToRender.sort((a, b) => a.zIndex - b.zIndex);

  // Render all layers in order
  for (const layerWrapper of layersToRender) {
    if (layerWrapper.type === "photo") {
      // ===== RENDER PHOTO LAYER =====
      const photoLayer = layerWrapper.data as RenderPhotoLayer;
      try {
        await renderPhotoLayer(
          ctx,
          photoLayer,
          finalWidth,
          finalHeight,
          scaleFactor,
        );
      } catch {
        // Failed to load photo
      }
    } else if (layerWrapper.type === "qr") {
      // ===== RENDER QR CODE LAYER =====
      const qrLayer = layerWrapper.data as RenderQRLayer;
      try {
        await renderQRLayer(ctx, qrLayer, finalWidth, finalHeight);
      } catch (error) {
        console.error("Failed to render QR code:", error);
        // Continue with other layers even if QR fails
      }
    } else {
      // ===== RENDER TEXT LAYER =====
      const layer = layerWrapper.data as RenderTextLayer;

      // Skip empty text
      if (!layer.text) {
        continue;
      }

      // ✅ CRITICAL FIX: Always use percentage-based positioning for resolution independence
      // This ensures preview and generate match exactly, even when template resolution changes
      // Calculate xPercent/yPercent from absolute x/y if not available (backward compatibility)
      const xPercent =
        layer.xPercent !== undefined && layer.xPercent !== null
          ? layer.xPercent
          : (layer.x || 0) / STANDARD_CANVAS_WIDTH;
      const yPercent =
        layer.yPercent !== undefined && layer.yPercent !== null
          ? layer.yPercent
          : (layer.y || 0) / STANDARD_CANVAS_HEIGHT;

      // Apply percentage to actual template dimensions (resolution-independent)
      let x = Math.round(xPercent * finalWidth);
      let y = Math.round(yPercent * finalHeight);

      // UBIG-only: global vertical micro-adjustment for all text layers
      if (isUbigTemplate) {
        y += 8;
      }

      // UBIG-specific fine-tuning for the `date_new` layer with font size ~19px.
      // The user observed a slight 1px left and 2px down shift in the generated
      // certificate compared to the visual template. To correct this, we apply
      // a precise canvas-only offset here so preview layout remains unchanged.
      if (isUbigTemplate && layer.id === "date_new") {
        x += 4.7; // shift 4.7px to the right (fine-tuned, 0.3px left from original)
        y -= 2; // shift 2px up
      }

      // SMART LAYER DETECTION & Y-AXIS ADJUSTMENT
      // Note: isScoreLayer function defined but not currently used in this context
      // Keeping for potential future Y-axis adjustments

      // Y-adjustment is now applied directly in drawWrappedText() function
      // No adjustment needed here - pure percentage positioning

      // Scale maxWidth based on template resolution
      const baseMaxWidth = layer.maxWidth || 300;
      const scaledMaxWidth = Math.round(baseMaxWidth * scaleFactor);

      // Determine alignment
      const isCertificateLayer =
        layer.id === "certificate_no" || layer.id === "issue_date";
      const align = isCertificateLayer
        ? "left" // certificate_no/issue_date always left
        : layer.textAlign || "center"; // Other layers: use setting or default center

      // Scale fontSize based on template resolution
      const fontWeight = layer.fontWeight || "normal";
      const baseFontSize = Math.max(1, layer.fontSize || 16);
      const scaledFontSizeBase = baseFontSize * scaleFactor;

      // Default: use integer font sizes for consistency
      let scaledFontSize = Math.round(scaledFontSizeBase);

      // UBIG-only: fine-tune font size for `date_new` so generated output
      // matches the configure preview. We use a 0.5px step (slightly smaller
      // than the previous +1px) by adding 0.5 before rounding.
      if (isUbigTemplate && layer.id === "date_new") {
        scaledFontSize = scaledFontSizeBase + 0.5;
      }
      const fontFamily = layer.fontFamily || "Arial";

      // Handle fontStyle: italic/oblique for CSS fontStyle, underline/line-through for textDecoration
      const style = layer.fontStyle || "normal";
      const isDecoration =
        style === "underline" ||
        style === "line-through" ||
        style === "overline";
      const fontStyle = isDecoration ? "normal" : style; // italic/oblique/normal

      ctx.font = `${fontStyle} ${fontWeight} ${scaledFontSize}px ${fontFamily}`;

      // Process critical layers
      if (
        layer.id === "name" ||
        layer.id === "certificate_no" ||
        layer.id === "issue_date"
      ) {
        const renderData = {
          layerId: layer.id,
          xPercent: layer.xPercent,
          yPercent: layer.yPercent,
          xPos: x,
          yPos: y,
          fontSize: baseFontSize,
          scaleFactor,
          scaledFontSize,
          scaledMaxWidth,
          textAlign: align,
        };
        void renderData;
      }

      // Set color and baseline
      ctx.fillStyle = layer.color || "#000000";
      ctx.textBaseline = "top";

      // Scale letter spacing based on template resolution (pixels in final canvas)
      const scaledLetterSpacing = (layer.letterSpacing || 0) * scaleFactor;
      // Render text (rich text or regular)
      if (layer.richText && layer.hasInlineFormatting) {
        // CRITICAL: Pass scaleFactor so span fontSizes can be scaled correctly
        // CRITICAL FIX: Pass layer's fontStyle so spans without their own fontStyle inherit from layer
        drawRichText(
          ctx,
          layer.richText,
          x,
          y,
          scaledMaxWidth,
          scaledFontSize,
          layer.lineHeight || 1.2,
          align,
          scaleFactor,
          layer.id, // Pass layer ID for Y-adjustment
          isDecoration ? style : undefined, // Pass decoration style
          isUbigTemplate,
          scaledLetterSpacing,
          layer.fontStyle || "normal",
          fontWeight, // Pass layer's
        );
      } else {
        drawWrappedText(
          ctx,
          layer.text,
          x,
          y,
          scaledMaxWidth,
          scaledFontSize,
          layer.lineHeight || 1.2,
          align,
          layer.id,
          isDecoration ? style : undefined, // Pass decoration style
          isUbigTemplate,
          scaledLetterSpacing,
        );
      }
    }
  }

  return canvas.toDataURL("image/png", 1.0);
}






/**
 * Save PNG DataURL to public folder (optional, for persistent storage)
 * This is a client-side helper that generates filename
 */
export function generatePNGFilename(prefix: string = "generated"): string {
  const timestamp = Date.now();
  return `${prefix}_${timestamp}.png`;
}
