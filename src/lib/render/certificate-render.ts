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
  // If fonts are not fully loaded, measureText may return INVALID metrics (NEGATIVE values!)
  // This causes catastrophic calculation errors in visual center positioning

  // CRITICAL FIX: Explicitly load all fonts used in text layers
  // This prevents negative TextMetrics (actualBoundingBoxAscent < 0) which causes text shifting
  const uniqueFonts = new Set<string>();
  textLayers.forEach((layer) => {
    const fontFamily = layer.fontFamily || "Arial";
    const fontWeight = layer.fontWeight || "normal";
    const fontSize = layer.fontSize || 16;
    uniqueFonts.add(`${fontWeight} ${fontSize}px ${fontFamily}`);
  });

  // Load each unique font
  for (const fontSpec of uniqueFonts) {
    try {
      // Check if font is already loaded
      if (!document.fonts.check(fontSpec)) {
        await document.fonts.load(fontSpec);
      }
    } catch {
      // Font may not be available
    }
  }

  // Wait for all fonts to be ready
  await document.fonts.ready;

  // CRITICAL FIX: Additional delay to ensure fonts are fully rendered in Canvas context
  // Some browsers need extra time after fonts.ready for TextMetrics to return valid values
  // Without this delay, actualBoundingBoxAscent can be negative, causing all calculations to fail
  await new Promise((resolve) => setTimeout(resolve, 200));

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
        x += 5; // shift 5px to the right (fine-tuned)
        y -= 2; // shift 2px up
      }

      // SMART LAYER DETECTION & Y-AXIS ADJUSTMENT
      const isScoreLayer = (layer: RenderTextLayer) => {
        // Check by ID first (including "Nilai / Prestasi" with space and slash)
        if (
          layer.id === "nilai" ||
          layer.id === "prestasi" ||
          layer.id === "Nilai / Prestasi"
        ) {
          return true;
        }

        // Check by text content (more reliable for custom layers)
        if (layer.text) {
          const text = layer.text.toLowerCase();
          const scoreKeywords = ["nilai", "prestasi", "score", "skor"];
          const hasScoreKeyword = scoreKeywords.some((keyword) =>
            text.includes(keyword),
          );
          const hasNumbers = /\d+/.test(layer.text);

          // Score layer characteristics:
          // 1. Contains score keywords OR numbers
          // 2. Font size typically 20-30px
          // 3. Not a default layer
          return (
            (hasScoreKeyword || hasNumbers) &&
            layer.fontSize >= 18 &&
            layer.fontSize <= 30 &&
            !["certificate_no", "issue_date", "name"].includes(layer.id)
          );
        }
        return false;
      };

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
          fontStyle, // Pass layer's fontStyle for inheritance
          fontWeight, // Pass layer's fontWeight for inheritance
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

  // Convert to PNG DataURL with maximum quality for master file
  // PNG ensures lossless quality for professional use (download/email/PDF)
  // WebP preview will be generated separately from this PNG master
  return canvas.toDataURL("image/png", 1.0);
}

/**
 * Draw text with word wrapping
 *
 * CRITICAL POSITIONING LOGIC:
 * - The stored y coordinate represents the CENTER of the entire text block (matching configure page behavior)
 * - Configure page uses CSS transform: translate(..., -50%) which centers vertically
 * - We use textBaseline='top' and calculate startY to center the entire text block at y
 *
 * CRITICAL X POSITIONING LOGIC:
 * - For left: x is the LEFT edge of the text block (matching CSS left edge)
 * - For center: x is the CENTER of the text block (matching CSS center)
 * - For right: x is the RIGHT edge of the text block (matching CSS right edge)
 *
 * IMPORTANT: For text with maxWidth, CSS creates a container with width=maxWidth and aligns text inside it.
 * Canvas aligns each line independently. To match CSS behavior:
 * - For center/right with maxWidth: we need to align text within the maxWidth container
 * - The stored x coordinate represents the anchor point of the container, not individual lines
 */
function drawWrappedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  fontSize: number,
  lineHeight: number,
  textAlign: "left" | "center" | "right" | "justify",
  layerId?: string, // Optional layer ID for debugging
  textDecoration?: "underline" | "line-through" | "overline", // Optional text decoration
  isUbigTemplate: boolean = false,
  letterSpacing: number = 0,
) {
  // CRITICAL: For "name" layer, prevent wrapping - text should shift left instead of wrapping down
  // If text is longer than maxWidth, keep it as single line and adjust x position to shift left
  const isNameLayer = layerId === "name";

  const words = text.split(" ");
  const lines: string[] = [];
  let currentLine = "";

  // Set canvas text baseline and temporarily set to left for measuring
  ctx.textAlign = "left"; // Always measure with left alignment for consistent width calculation
  ctx.textBaseline = "top";

  // For name layer: Prevent wrapping, keep as single line
  if (isNameLayer && maxWidth > 0) {
    // Measure full text width
    const fullTextMetrics = ctx.measureText(text);
    const fullTextWidth = fullTextMetrics.width;

    // If text is longer than maxWidth, keep as single line (no wrapping)
    // The x position adjustment will be handled later
    if (fullTextWidth > maxWidth) {
      lines.push(text); // Single line with full text
    } else {
      // Text fits, use normal wrapping logic
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
    }
  } else {
    // Normal wrapping behavior for other layers
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
  }

  // Calculate total text block height matching CSS line-height behavior
  const lineHeightPx = fontSize * lineHeight;
  const totalTextHeight = lines.length * lineHeightPx;

  // TextMetrics-based analysis (kept as-is)
  const firstLine = lines[0] || "";
  if (!ctx.font || ctx.font === "10px sans-serif" || !ctx.font.includes("px")) {
    // Font should have been set earlier
  }
  const firstLineMetrics = ctx.measureText(firstLine);
  const hasValidMetrics =
    firstLineMetrics.actualBoundingBoxAscent > 0 &&
    firstLineMetrics.actualBoundingBoxDescent > 0 &&
    !isNaN(firstLineMetrics.actualBoundingBoxAscent) &&
    !isNaN(firstLineMetrics.actualBoundingBoxDescent) &&
    isFinite(firstLineMetrics.actualBoundingBoxAscent) &&
    isFinite(firstLineMetrics.actualBoundingBoxDescent);

  if (!hasValidMetrics && layerId) {
    const debugInfo = {
      actualBoundingBoxAscent: firstLineMetrics.actualBoundingBoxAscent,
      actualBoundingBoxDescent: firstLineMetrics.actualBoundingBoxDescent,
      width: firstLineMetrics.width,
      fontSize,
      fontFamily: ctx.font,
      message: "Font not fully loaded, using reliable fallback (80/20 split)",
    };
    void debugInfo;
  }

  let actualAscent: number;
  let actualDescent: number;
  let actualTextHeight: number;

  if (hasValidMetrics) {
    actualAscent = firstLineMetrics.actualBoundingBoxAscent;
    actualDescent = firstLineMetrics.actualBoundingBoxDescent;
    actualTextHeight = actualAscent + actualDescent;
  } else {
    actualAscent = fontSize * 0.8;
    actualDescent = fontSize * 0.2;
    actualTextHeight = actualAscent + actualDescent;
    const fallbackInfo = {
      fontSize,
      fallbackAscent: actualAscent,
      fallbackDescent: actualDescent,
      fontFamily: ctx.font,
    };
    void fallbackInfo;
  }

  if (
    actualAscent <= 0 ||
    actualDescent <= 0 ||
    actualTextHeight <= 0 ||
    !isFinite(actualAscent) ||
    !isFinite(actualDescent)
  ) {
    const errorInfo = {
      actualAscent,
      actualDescent,
      actualTextHeight,
      fontSize,
    };
    void errorInfo;
    actualAscent = fontSize * 0.8;
    actualDescent = fontSize * 0.2;
    actualTextHeight = fontSize;
  }

  if (layerId === "certificate_no" || layerId === "issue_date") {
    const metricsInfo = {
      fontSize,
      lineHeight,
      fontFamily: ctx.font,
      fontWeight: ctx.font,
      actualBoundingBoxAscent: firstLineMetrics.actualBoundingBoxAscent,
      actualBoundingBoxDescent: firstLineMetrics.actualBoundingBoxDescent,
      fontBoundingBoxAscent: firstLineMetrics.fontBoundingBoxAscent,
      fontBoundingBoxDescent: firstLineMetrics.fontBoundingBoxDescent,
      emHeightAscent: firstLineMetrics.emHeightAscent,
      emHeightDescent: firstLineMetrics.emHeightDescent,
      hasValidMetrics,
      actualAscent,
      actualDescent,
      actualTextHeight,
      ascentRatio: actualAscent / fontSize,
      descentRatio: actualDescent / fontSize,
      lineHeightPx,
      totalTextHeight,
      cssLineHeightBoxHeight: lineHeightPx,
      canvasTotalHeight: totalTextHeight,
      textVsLineHeightRatio: actualTextHeight / lineHeightPx,
      heightDifference: lineHeightPx - actualTextHeight,
    };
    void metricsInfo;
  }

  const startY = y - totalTextHeight / 2;

  const isScoreLayerForAdjustment =
    layerId &&
    (layerId === "nilai" ||
      layerId === "prestasi" ||
      layerId === "Nilai / Prestasi" ||
      layerId.toLowerCase().includes("nilai") ||
      layerId.toLowerCase().includes("prestasi"));

  let microYAdjustment = 0;
  // UBIG: semua font kecil 16–20px (default + custom) pakai offset yang sama
  if (isScoreLayerForAdjustment) {
    microYAdjustment = fontSize * 0.087;
  } else if (isUbigTemplate && fontSize >= 16 && fontSize <= 20) {
    microYAdjustment = fontSize * 0.1;
  } else if (
    !isUbigTemplate &&
    (layerId === "certificate_no" || layerId === "issue_date")
  ) {
    microYAdjustment = fontSize * 0.1;
  } else if (!isUbigTemplate && fontSize >= 16 && fontSize <= 20) {
    microYAdjustment = fontSize * 0.4;
  }

  // X positioning, decorations, and drawing kept as in previous version
  ctx.textAlign = textAlign === "justify" ? "left" : textAlign;
  let drawX = x;
  drawX = x;

  if (
    layerId === "name" ||
    layerId === "certificate_no" ||
    layerId === "issue_date"
  ) {
    const calculatedCenter = startY + totalTextHeight / 2;
    const centerDifference = calculatedCenter - y;
    const debugInfo = {
      layerId,
      x,
      y,
      fontSize,
      lineHeight,
      textAlign,
      text: text.substring(0, 20),
      linesCount: lines.length,
      lineHeightPx,
      totalTextHeight,
      startY,
      calculatedCenter,
      expectedCenter: y,
      centerDifference,
      isOffsetCorrect: Math.abs(centerDifference) < 0.5,
      actualShift:
        centerDifference > 0
          ? `${centerDifference.toFixed(2)}px DOWN`
          : `${Math.abs(centerDifference).toFixed(2)}px UP`,
      method: "UNIFORM_GEOMETRIC_CENTER - same for all layers",
      recommendation:
        Math.abs(centerDifference) < 0.5
          ? "Perfect center alignment "
          : `Off by ${Math.abs(centerDifference).toFixed(1)}px - check coordinates or CSS`,
    };
    void debugInfo;
  }

  let adjustedDrawX = drawX;
  if (isNameLayer && maxWidth > 0 && lines.length === 1) {
    const lineWidthSingle = ctx.measureText(lines[0]).width;
    if (lineWidthSingle > maxWidth) {
      const overflow = lineWidthSingle - maxWidth;
      if (textAlign === "right") {
        adjustedDrawX = drawX - overflow;
      } else if (textAlign === "center") {
        adjustedDrawX = drawX - overflow / 2;
      } else {
        adjustedDrawX = drawX - overflow;
      }
    }
  }

  lines.forEach((line, index) => {
    const lineY = startY + index * lineHeightPx + microYAdjustment;
    if (!letterSpacing) {
      ctx.fillText(line, adjustedDrawX, lineY);
    } else {
      // Apply manual letter spacing by drawing character by character
      let currentX = adjustedDrawX;
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        ctx.fillText(char, currentX, lineY);
        const charWidth = ctx.measureText(char).width;
        currentX += charWidth + letterSpacing;
      }
    }

    if (textDecoration) {
      let lineWidthLocal = ctx.measureText(line).width;
      if (letterSpacing && line.length > 1) {
        const gaps = line.length - 1;
        lineWidthLocal += gaps * letterSpacing;
      }
      const lineThickness = Math.max(1, fontSize / 16);

      let decorationX = adjustedDrawX;
      if (ctx.textAlign === "center") {
        decorationX = adjustedDrawX - lineWidthLocal / 2;
      } else if (ctx.textAlign === "right") {
        decorationX = adjustedDrawX - lineWidthLocal;
      }

      ctx.fillStyle = ctx.fillStyle;
      if (textDecoration === "underline") {
        const underlineY = lineY + fontSize;
        ctx.fillRect(decorationX, underlineY, lineWidthLocal, lineThickness);
      } else if (textDecoration === "line-through") {
        const strikeY = lineY + fontSize / 2;
        ctx.fillRect(decorationX, strikeY, lineWidthLocal, lineThickness);
      } else if (textDecoration === "overline") {
        const overlineY = lineY - lineThickness;
        ctx.fillRect(decorationX, overlineY, lineWidthLocal, lineThickness);
      }
    }

    if (
      index === 0 &&
      (layerId === "name" ||
        layerId === "certificate_no" ||
        layerId === "issue_date")
    ) {
      const fillTextInfo = {
        layerId,
        line: line.substring(0, 20),
        drawX,
        lineY,
        textAlign: ctx.textAlign,
        textBaseline: ctx.textBaseline,
        fontSize,
        font: ctx.font,
        textDecoration: textDecoration || "none",
      };
      void fillTextInfo;
    }
  });
}

/**
 * Draw rich text with inline formatting.
 * Supports different font weights and families within the same text layer.
 *
 * @param ctx Canvas rendering context
 * @param richText Rich text to draw
 * @param x X-coordinate of the text
 * @param y Y-coordinate of the text
 * @param maxWidth Maximum width of the text
 * @param baseFontSize Base font size
 * @param lineHeight Line height
 * @param textAlign Text alignment
 * @param scaleFactor Scale factor for font sizes
 * @param layerId Optional layer ID for Y-adjustment
 * @param _textDecoration Optional text decoration (not yet implemented for rich text)
 * @param isUbigTemplate Whether the template is UBIG
 * @param letterSpacing Letter spacing (optional, default: 0)
 * @param layerFontStyle Layer's fontStyle to inherit when span doesn't have its own
 * @param layerFontWeight Layer's fontWeight to inherit when span doesn't have its own
 */
function drawRichText(
  ctx: CanvasRenderingContext2D,
  richText: RichText,
  x: number,
  y: number,
  maxWidth: number,
  baseFontSize: number,
  lineHeight: number,
  textAlign: "left" | "center" | "right" | "justify",
  scaleFactor: number = 1,
  layerId?: string, // Optional layer ID for Y-adjustment
  _textDecoration?: "underline" | "line-through" | "overline", // Optional text decoration (not yet implemented for rich text)
  isUbigTemplate: boolean = false,
  letterSpacing: number = 0,
  layerFontStyle: string = "normal",
  layerFontWeight: string = "normal",
) {
  const lineHeightPx = baseFontSize * lineHeight;

  // Process rich text rendering with scale factor
  const richTextInfo = {
    baseFontSize,
    scaleFactor,
    spanCount: richText.length,
    spans: richText.map((s) => ({
      text: s.text.substring(0, 20),
      fontSize: s.fontSize,
      scaledFontSize: s.fontSize
        ? Math.round(s.fontSize * scaleFactor)
        : baseFontSize,
      fontWeight: s.fontWeight,
    })),
  };
  void richTextInfo;

  // Convert rich text to plain text for wrapping calculation
  const plainText = richText.map((span) => span.text).join("");

  // Calculate wrapping using base font
  ctx.textAlign = "left";
  ctx.textBaseline = "top";

  // Split into words for wrapping
  const words = plainText.split(" ");
  const lines: Array<{ text: string; spans: RichText }> = [];
  let currentLine = "";
  let currentOffset = 0;

  // Build lines with their corresponding spans
  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const metrics = ctx.measureText(testLine);

    if (metrics.width > maxWidth && currentLine) {
      // Line is full, push it
      const lineLength = currentLine.length;
      const spansForLine = extractSpansForRange(
        richText,
        currentOffset,
        currentOffset + lineLength,
      );
      lines.push({ text: currentLine, spans: spansForLine });
      currentOffset += lineLength + 1; // +1 for space
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }

  // Push remaining text as the last line (if any)
  if (currentLine) {
    const spansForLine = extractSpansForRange(
      richText,
      currentOffset,
      currentOffset + currentLine.length,
    );
    lines.push({ text: currentLine, spans: spansForLine });
  }

  // Calculate vertical centering (same as drawWrappedText)
  const totalTextHeight = lines.length * lineHeightPx;
  const startY = y - totalTextHeight / 2;

  // Y-ADJUSTMENT: Apply same adjustment as drawWrappedText
  const isScoreLayerForAdjustment =
    layerId &&
    (layerId === "nilai" ||
      layerId === "prestasi" ||
      layerId === "Nilai / Prestasi" ||
      layerId.toLowerCase().includes("nilai") ||
      layerId.toLowerCase().includes("prestasi"));

  let microYAdjustment = 0;
  if (layerId === "certificate_no" || layerId === "issue_date") {
    microYAdjustment = baseFontSize * 0.1;
  } else if (isScoreLayerForAdjustment) {
    microYAdjustment = baseFontSize * 0.087;
  } else {
    // Generic micro-adjustment for small fonts (e.g. 18px) to better match CSS preview
    // EXPERIMENTAL: Strong offset so effect is clearly visible during testing
    // For baseFontSize ~18px, this gives ~7.2px downward shift (40% of font size)
    if (baseFontSize >= 16 && baseFontSize <= 20) {
      microYAdjustment = baseFontSize * 0.4;
    }
  }

  // Draw each line with its spans
  lines.forEach((line, lineIndex) => {
    const lineY = startY + lineIndex * lineHeightPx + microYAdjustment;
    let currentX = x;
    // ... (rest of the code remains the same)

    // Calculate line width for alignment
    let lineWidth = 0;
    line.spans.forEach((span) => {
      // CRITICAL: Scale span fontSize if provided, otherwise use base (already scaled)
      const spanFontSize = span.fontSize
        ? Math.round(span.fontSize * scaleFactor)
        : baseFontSize;
      const spanFontStyle = span.fontStyle || layerFontStyle || "normal";
      const spanFontWeight = span.fontWeight || layerFontWeight || "normal";
      const spanFont = `${spanFontStyle} ${spanFontWeight} ${spanFontSize}px ${span.fontFamily || "Arial"}`;
      ctx.font = spanFont;
      const baseWidth = ctx.measureText(span.text).width;
      if (letterSpacing) {
        const gaps = Math.max(0, span.text.length - 1);
        lineWidth += baseWidth + gaps * letterSpacing;
      } else {
        lineWidth += baseWidth;
      }
    });

    // Adjust starting X based on alignment
    if (textAlign === "center") {
      currentX = x - lineWidth / 2;
    } else if (textAlign === "right") {
      currentX = x - lineWidth;
    }

    // Draw each span
    line.spans.forEach((span) => {
      const spanFontWeight = span.fontWeight || layerFontWeight || "normal";
      const spanFontStyle = span.fontStyle || layerFontStyle || "normal";
      // CRITICAL: Scale span fontSize if provided, otherwise use base (already scaled)
      const spanFontSize = span.fontSize
        ? Math.round(span.fontSize * scaleFactor)
        : baseFontSize;
      const spanFontFamily = span.fontFamily || "Arial";
      const spanColor = span.color || ctx.fillStyle;

      ctx.font = `${spanFontStyle} ${spanFontWeight} ${spanFontSize}px ${spanFontFamily}`;
      ctx.fillStyle = spanColor;

      if (!letterSpacing) {
        ctx.fillText(span.text, currentX, lineY);
        currentX += ctx.measureText(span.text).width;
      } else {
        for (let i = 0; i < span.text.length; i++) {
          const ch = span.text[i];
          ctx.fillText(ch, currentX, lineY);
          currentX += ctx.measureText(ch).width + letterSpacing;
        }
      }
    });
  });
}

/**
 * Extract spans for a specific text range
 */
function extractSpansForRange(
  richText: RichText,
  start: number,
  end: number,
): RichText {
  const result: RichText = [];
  let currentOffset = 0;

  for (const span of richText) {
    const spanStart = currentOffset;
    const spanEnd = currentOffset + span.text.length;

    if (spanEnd <= start || spanStart >= end) {
      currentOffset = spanEnd;
      continue;
    }

    const overlapStart = Math.max(spanStart, start);
    const overlapEnd = Math.min(spanEnd, end);

    result.push({
      ...span,
      text: span.text.slice(overlapStart - spanStart, overlapEnd - spanStart),
    });

    currentOffset = spanEnd;
  }

  return result;
}

/**
 * Calculate fitted dimensions based on fitMode (like Canva)
 * @param sourceWidth Original image width
 * @param sourceHeight Original image height
 * @param targetWidth Target box width
 * @param targetHeight Target box height
 * @param fitMode How to fit image
 * @returns Dimensions and offsets for drawing
 */
function calculateFitDimensions(
  sourceWidth: number,
  sourceHeight: number,
  targetWidth: number,
  targetHeight: number,
  fitMode: "contain" | "cover" | "fill" | "none",
): { width: number; height: number; offsetX: number; offsetY: number } {
  if (fitMode === "fill") {
    // Stretch to fill (may distort)
    return { width: targetWidth, height: targetHeight, offsetX: 0, offsetY: 0 };
  }

  if (fitMode === "none") {
    // Original size, centered
    return {
      width: sourceWidth,
      height: sourceHeight,
      offsetX: (targetWidth - sourceWidth) / 2,
      offsetY: (targetHeight - sourceHeight) / 2,
    };
  }

  const sourceAspect = sourceWidth / sourceHeight;
  const targetAspect = targetWidth / targetHeight;

  if (fitMode === "contain") {
    // Fit inside, maintain aspect (letterbox/pillarbox)
    if (sourceAspect > targetAspect) {
      // Source wider than target
      const scaledHeight = targetWidth / sourceAspect;
      return {
        width: targetWidth,
        height: scaledHeight,
        offsetX: 0,
        offsetY: (targetHeight - scaledHeight) / 2,
      };
    } else {
      // Source taller than target
      const scaledWidth = targetHeight * sourceAspect;
      return {
        width: scaledWidth,
        height: targetHeight,
        offsetX: (targetWidth - scaledWidth) / 2,
        offsetY: 0,
      };
    }
  }

  // fitMode === 'cover'
  // Fill box, maintain aspect (crop edges)
  if (sourceAspect > targetAspect) {
    // Source wider - crop sides
    const scaledWidth = targetHeight * sourceAspect;
    return {
      width: scaledWidth,
      height: targetHeight,
      offsetX: (targetWidth - scaledWidth) / 2,
      offsetY: 0,
    };
  } else {
    // Source taller - crop top/bottom
    const scaledHeight = targetWidth / sourceAspect;
    return {
      width: targetWidth,
      height: scaledHeight,
      offsetX: 0,
      offsetY: (targetHeight - scaledHeight) / 2,
    };
  }
}

/**
 * Apply mask to canvas context (circle, ellipse, roundedRect, polygon)
 */
function applyMask(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  mask: RenderPhotoLayer["mask"],
): void {
  if (!mask || mask.type === "none") return;

  ctx.save();
  ctx.beginPath();

  switch (mask.type) {
    case "circle": {
      const radius = Math.min(width, height) / 2;
      const centerX = x + width / 2;
      const centerY = y + height / 2;
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      break;
    }

    case "ellipse": {
      const centerX = x + width / 2;
      const centerY = y + height / 2;
      ctx.ellipse(centerX, centerY, width / 2, height / 2, 0, 0, Math.PI * 2);
      break;
    }

    case "roundedRect": {
      const radius = mask.borderRadius || 10;
      ctx.moveTo(x + radius, y);
      ctx.lineTo(x + width - radius, y);
      ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
      ctx.lineTo(x + width, y + height - radius);
      ctx.quadraticCurveTo(
        x + width,
        y + height,
        x + width - radius,
        y + height,
      );
      ctx.lineTo(x + radius, y + height);
      ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
      ctx.lineTo(x, y + radius);
      ctx.quadraticCurveTo(x, y, x + radius, y);
      break;
    }

    case "polygon": {
      if (mask.points && mask.points.length >= 3) {
        const firstPoint = mask.points[0];
        ctx.moveTo(x + firstPoint.x * width, y + firstPoint.y * height);
        for (let i = 1; i < mask.points.length; i++) {
          const point = mask.points[i];
          ctx.lineTo(x + point.x * width, y + point.y * height);
        }
        ctx.closePath();
      }
      break;
    }
  }

  ctx.clip();
}

/**
 * Render photo layer with crop, mask, fitMode support
 * Professional rendering like Canva/Picsart
 */
async function renderPhotoLayer(
  ctx: CanvasRenderingContext2D,
  layer: RenderPhotoLayer,
  canvasWidth: number,
  canvasHeight: number,
  scaleFactor: number,
): Promise<void> {
  // Load image
  const img = await loadImage(layer.src);

  // Calculate position (percentage-first)
  const x =
    layer.xPercent !== undefined && layer.xPercent !== null
      ? Math.round(layer.xPercent * canvasWidth)
      : Math.round((layer.x || 0) * scaleFactor);
  const y =
    layer.yPercent !== undefined && layer.yPercent !== null
      ? Math.round(layer.yPercent * canvasHeight)
      : Math.round((layer.y || 0) * scaleFactor);

  // Calculate size (percentage-first)
  const width =
    layer.widthPercent !== undefined && layer.widthPercent !== null
      ? Math.round(layer.widthPercent * canvasWidth)
      : Math.round((layer.width || img.naturalWidth) * scaleFactor);
  const height =
    layer.heightPercent !== undefined && layer.heightPercent !== null
      ? Math.round(layer.heightPercent * canvasHeight)
      : Math.round((layer.height || img.naturalHeight) * scaleFactor);

  // Save context state
  ctx.save();

  // Apply opacity
  ctx.globalAlpha = layer.opacity;

  // Apply rotation
  if (layer.rotation !== 0) {
    const centerX = x + width / 2;
    const centerY = y + height / 2;
    ctx.translate(centerX, centerY);
    ctx.rotate((layer.rotation * Math.PI) / 180);
    ctx.translate(-centerX, -centerY);
  }

  // Apply mask (clip region)
  if (layer.mask && layer.mask.type !== "none") {
    applyMask(ctx, x, y, width, height, layer.mask);
  }

  // Calculate crop region
  const crop = layer.crop || { x: 0, y: 0, width: 1, height: 1 };
  const sourceX = crop.x * img.naturalWidth;
  const sourceY = crop.y * img.naturalHeight;
  const sourceWidth = crop.width * img.naturalWidth;
  const sourceHeight = crop.height * img.naturalHeight;

  // Calculate fit dimensions
  const fit = calculateFitDimensions(
    sourceWidth,
    sourceHeight,
    width,
    height,
    layer.fitMode,
  );

  // Draw image with crop and fit
  ctx.drawImage(
    img,
    sourceX,
    sourceY,
    sourceWidth,
    sourceHeight,
    x + fit.offsetX,
    y + fit.offsetY,
    fit.width,
    fit.height,
  );

  // Restore context state
  ctx.restore();
}

/**
 * Render QR code layer
 * Generates QR code and renders it at specified position
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

  // Generate QR code as data URL
  const qrDataURL = await generateQRCodeDataURL(layer.qrData, {
    width,
    height,
    errorCorrectionLevel: layer.errorCorrectionLevel || "M",
    // Use 0 as default margin so QR code fully occupies the configured box size
    margin: layer.margin ?? 0,
    color: {
      dark: layer.foregroundColor || "#000000",
      light: layer.backgroundColor || "#FFFFFF",
    },
  });

  // Load QR code image
  const qrImage = await loadImage(qrDataURL);

  // Save context state
  ctx.save();

  // Apply opacity
  ctx.globalAlpha = layer.opacity;

  // Apply rotation
  if (layer.rotation !== 0) {
    // Move to center of QR code
    ctx.translate(x + width / 2, y + height / 2);
    ctx.rotate((layer.rotation * Math.PI) / 180);
    ctx.translate(-(x + width / 2), -(y + height / 2));
  }

  // Draw QR code
  ctx.drawImage(qrImage, x, y, width, height);

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
