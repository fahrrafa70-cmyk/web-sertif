import type { RichText } from "@/types/rich-text";

export function drawWrappedText(
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
export function drawRichText(
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
  _isUbigTemplate: boolean = false, // Currently unused, keeping for future UBIG-specific adjustments
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
      // CRITICAL: fontWeight inheritance works correctly, but fontStyle should not inherit
      // This ensures only selected/formatted text gets italic styling, not the entire layer
      const spanFontWeight = span.fontWeight || layerFontWeight || "normal";
      const spanFontStyle = span.fontStyle || "normal"; // Don't inherit fontStyle from layer
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
export function extractSpansForRange(
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
