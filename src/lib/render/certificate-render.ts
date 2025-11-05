/**
 * Certificate Renderer Utility
 * Renders certificate template + text layers to PNG DataURL
 * Reusable across Generate page and Quick Generate modal
 */

import { STANDARD_CANVAS_WIDTH } from "@/lib/constants/canvas";
import { RichText } from "@/types/rich-text";

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
  richText?: RichText; // Rich text with inline formatting
  hasInlineFormatting?: boolean; // Whether layer uses rich text
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

  // CRITICAL: Wait for fonts to load before rendering
  // Font rendering differences between CSS and Canvas can cause positioning issues
  // If fonts are not fully loaded, measureText may return INVALID metrics (NEGATIVE values!)
  // This causes catastrophic calculation errors in visual center positioning
  console.log('⏳ Waiting for fonts to load...');
  
  // CRITICAL FIX: Explicitly load all fonts used in text layers
  // This prevents negative TextMetrics (actualBoundingBoxAscent < 0) which causes text shifting
  const uniqueFonts = new Set<string>();
  textLayers.forEach(layer => {
    const fontFamily = layer.fontFamily || 'Arial';
    const fontWeight = layer.fontWeight || 'normal';
    const fontSize = layer.fontSize || 16;
    uniqueFonts.add(`${fontWeight} ${fontSize}px ${fontFamily}`);
  });
  
  console.log('🔤 Loading fonts explicitly:', Array.from(uniqueFonts));
  
  // Load each unique font
  for (const fontSpec of uniqueFonts) {
    try {
      // Check if font is already loaded
      if (!document.fonts.check(fontSpec)) {
        console.log(`⏳ Loading font: ${fontSpec}`);
        await document.fonts.load(fontSpec);
        console.log(`✅ Font loaded: ${fontSpec}`);
      }
    } catch (error) {
      console.warn(`⚠️ Failed to load font: ${fontSpec}`, error);
    }
  }
  
  // Wait for all fonts to be ready
  await document.fonts.ready;
  
  // CRITICAL FIX: Additional delay to ensure fonts are fully rendered in Canvas context
  // Some browsers need extra time after fonts.ready for TextMetrics to return valid values
  // Without this delay, actualBoundingBoxAscent can be negative, causing all calculations to fail
  await new Promise(resolve => setTimeout(resolve, 200));
  
  console.log('✅ All fonts loaded and ready for accurate TextMetrics');

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
  console.log(`TOTAL TEXT LAYERS TO RENDER: ${textLayers.length}`, 
    textLayers.map(l => ({ id: l.id, hasText: !!l.text, textLength: l.text?.length || 0, textPreview: l.text?.substring(0, 20) }))
  );
  
  for (const layer of textLayers) {
    // CRITICAL: Log ALL layers, including those with empty text, to debug why certificate_no/issue_date might not render
    if (layer.id === 'certificate_no' || layer.id === 'issue_date' || !layer.text) {
      console.log(`🔍 LAYER CHECK [${layer.id}]:`, {
        id: layer.id,
        hasText: !!layer.text,
        textLength: layer.text?.length || 0,
        textValue: layer.text || '(empty)',
        willSkip: !layer.text,
        xPercent: layer.xPercent,
        yPercent: layer.yPercent,
        fontSize: layer.fontSize
      });
    }
    
    if (!layer.text) {
      console.warn(`⚠️ SKIPPING layer "${layer.id}" because text is empty`);
      continue; // Skip empty text
    }

    // Calculate position - CRITICAL: Prioritize absolute x/y coordinates
    // Some layers (especially score layers) may only have absolute coordinates
    // If both exist, prefer absolute for accuracy
    const scaleFactor = width / STANDARD_CANVAS_WIDTH;
    const x = layer.x !== undefined && layer.x !== null 
      ? Math.round(layer.x * scaleFactor) 
      : Math.round((layer.xPercent || 0) * width);
    const y = layer.y !== undefined && layer.y !== null 
      ? Math.round(layer.y * scaleFactor) 
      : Math.round((layer.yPercent || 0) * height);
    
    // CRITICAL: Scale maxWidth based on canvas size
    const scaledMaxWidth = (layer.maxWidth || 300) * scaleFactor;
    
    // CRITICAL: certificate_no and issue_date always use left alignment
    const isCertificateLayer = layer.id === 'certificate_no' || layer.id === 'issue_date';
    
    // Use alignment from layer settings, default to center
    const align = isCertificateLayer 
      ? 'left'  // certificate_no/issue_date always left
      : (layer.textAlign || 'center'); // Other layers (including score): use setting or default center
    
    // Set font - CRITICAL: Scale fontSize based on canvas size!
    const fontWeight = layer.fontWeight === 'bold' ? 'bold' : 'normal';
    const baseFontSize = Math.max(1, layer.fontSize || 16);
    const scaledFontSize = Math.round(baseFontSize * scaleFactor);
    const fontFamily = layer.fontFamily || 'Arial';
    ctx.font = `${fontWeight} ${scaledFontSize}px ${fontFamily}`;
    
    // COMPREHENSIVE DEBUG LOGGING: Compare working (name) vs broken (certificate_no, issue_date)
    if (layer.id === 'name' || layer.id === 'certificate_no' || layer.id === 'issue_date') {
      console.log(`🔍 [${layer.id}] RENDER INPUT DATA:`, {
        layerId: layer.id,
        // Database/Input values
      xPercent: layer.xPercent,
      yPercent: layer.yPercent,
        x: x,
        y: y,
        // Font properties
        fontSize: layer.fontSize,
        fontWeight: layer.fontWeight,
        fontFamily: layer.fontFamily,
        lineHeight: layer.lineHeight || 1.2,
      textAlign: align,
      maxWidth: layer.maxWidth,
        // Calculated values
        scaleFactor,
        scaledFontSize,
      scaledMaxWidth,
        // Text content
        text: layer.text.substring(0, 30),
        textLength: layer.text.length
      });
    }

    // Set color
    ctx.fillStyle = layer.color || '#000000';

    // CRITICAL: Set text baseline to 'top' to match preview behavior
    // Preview uses CSS with top positioning, so we need to match that
    // We'll handle vertical centering manually in drawWrappedText
    ctx.textBaseline = 'top';
    
    // CRITICAL: Log layer ID to verify it's passed correctly
    if (layer.id === 'certificate_no' || layer.id === 'issue_date') {
      console.log(`🔍 VERIFY: Calling drawWrappedText with layerId: "${layer.id}"`);
    }
    
    // Check if layer has rich text formatting
    if (layer.richText && layer.hasInlineFormatting) {
      // Render with rich text (inline formatting)
      drawRichText(
        ctx,
        layer.richText,
        x,
        y,
        scaledMaxWidth,
        scaledFontSize,
        layer.lineHeight || 1.2,
        align
      );
    } else {
      // Regular text rendering
      drawWrappedText(
        ctx, 
        layer.text, 
        x, 
        y, 
        scaledMaxWidth, 
        scaledFontSize, 
        layer.lineHeight || 1.2,
        align,
        layer.id // Pass layer ID for debugging
      );
    }
  }

  // Convert to PNG DataURL
  return canvas.toDataURL('image/png');
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
  textAlign: 'left' | 'center' | 'right' | 'justify',
  layerId?: string // Optional layer ID for debugging
) {
  // CRITICAL: For "name" layer, prevent wrapping - text should shift left instead of wrapping down
  // If text is longer than maxWidth, keep it as single line and adjust x position to shift left
  const isNameLayer = layerId === 'name';
  
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  // Set canvas text baseline and temporarily set to left for measuring
  ctx.textAlign = 'left'; // Always measure with left alignment for consistent width calculation
  ctx.textBaseline = 'top';

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
  }

  // Calculate total text block height matching CSS line-height behavior
  // CSS line-height creates a line-box with height = fontSize * lineHeight for each line
  const lineHeightPx = fontSize * lineHeight;
  const totalTextHeight = lines.length * lineHeightPx;
  
  // CRITICAL FIX: Use TextMetrics to calculate actual visual center
  // CSS and Canvas position text differently, causing visual mismatch especially for small fonts.
  //
  // CSS line-height behavior:
  // - Line-box height = fontSize * lineHeight
  // - Text baseline is positioned within line-box (typically at ~0.8 * fontSize from top)
  // - Line-height space is distributed around baseline (half above, half below)
  // - Visual center is affected by baseline position + space distribution
  //
  // Canvas textBaseline='top' behavior:
  // - Positions from top of em-square
  // - No space above text
  // - Visual center = top + (actual text height / 2)
  //
  // Solution: Calculate the actual visual center using TextMetrics
  // CRITICAL: Ensure font is set and valid before measuring!
  const firstLine = lines[0] || '';
  
  // CRITICAL FIX: Verify font is properly set before measurement
  // If font string is malformed (missing fontWeight), TextMetrics will be invalid
  // Check if font string matches expected format: "weight size family"
  if (!ctx.font || ctx.font === '10px sans-serif' || !ctx.font.includes('px')) {
    console.error(`🚨 [${layerId || 'unknown'}] Canvas font NOT properly set! Current: "${ctx.font}"`);
    // Font should have been set earlier, but re-set as safety
    // Note: We don't have access to fontWeight/fontFamily here, so we can't fix it
    // This should never happen if code path is correct
  }
  
  const firstLineMetrics = ctx.measureText(firstLine);
  
  // CRITICAL: Verify font was applied correctly by checking metrics
  // If width is 0 or very small, font may not be loaded
  if (firstLineMetrics.width === 0 && firstLine.length > 0) {
    console.error(`🚨 [${layerId || 'unknown'}] Font measurement returned 0 width!`, {
      font: ctx.font,
      text: firstLine,
      metrics: firstLineMetrics
    });
  }
  
  // INVESTIGATION: Font rendering differences between CSS and Canvas
  // 
  // Potential issues:
  // 1. Font not fully loaded - measureText may return inaccurate metrics
  // 2. Font fallback - Canvas might use different font than CSS
  // 3. Font metrics differences - actualBoundingBox might differ from CSS computed height
  // 4. Text rendering engine differences - CSS uses system font renderer, Canvas uses its own
  //
  // CRITICAL DISCOVERY: CSS and Canvas use different rendering models for line-height
  //
  // CSS line-height behavior:
  // - Creates a line-box with height = fontSize * lineHeight
  // - Text baseline is positioned within this line-box
  // - Space is distributed around the baseline (not evenly above/below text)
  // - The visual center of text is NOT at the center of line-height box
  // - Visual center = baseline position + half of actual text height
  // - For typical fonts, baseline is at ~80% of fontSize from top of em-square
  // - Within line-height box: visual center shifts depending on space distribution
  //
  // Canvas textBaseline='top' behavior:
  // - We position from top of em-square (where text actually starts rendering)
  // - We add spacing below using lineHeight
  // - Visual center = top + (totalTextHeight / 2) where totalTextHeight = fontSize * lineHeight * lines
  // - This assumes visual center is at center of totalTextHeight
  // - BUT this is WRONG because CSS centers line-height box, not text itself
  //
  // The mismatch: 
  // - CSS visual center accounts for baseline position + line-height space distribution
  // - Canvas visual center assumes text is centered within line-height box
  // - These are NOT the same!
  //
  // CRITICAL FIX: Validate TextMetrics - negative values indicate font not loaded or measurement error
  // Negative actualBoundingBoxAscent is a critical bug that causes all calculations to fail
  // 
  // PROBLEM: TextMetrics masih invalid meskipun sudah ada font loading delay
  // Ini menunjukkan masalah fundamental - font measurement gagal untuk font kecil
  // 
  // ALTERNATIVE APPROACH: Untuk font kecil dengan TextMetrics invalid,
  // kita bisa skip kompleks calculation dan langsung gunakan simple centering + fixed adjustment
  // berdasarkan actual measurement dari console logs
  const hasValidMetrics = firstLineMetrics.actualBoundingBoxAscent > 0 && 
                          firstLineMetrics.actualBoundingBoxDescent > 0 &&
                          !isNaN(firstLineMetrics.actualBoundingBoxAscent) &&
                          !isNaN(firstLineMetrics.actualBoundingBoxDescent) &&
                          isFinite(firstLineMetrics.actualBoundingBoxAscent) &&
                          isFinite(firstLineMetrics.actualBoundingBoxDescent);
  
  if (!hasValidMetrics && layerId) {
    // Changed from console.error to console.debug to reduce noise
    // Fallback metrics work correctly, so this is not a critical error
    console.debug(`📊 [${layerId}] Using fallback metrics (TextMetrics invalid):`, {
      actualBoundingBoxAscent: firstLineMetrics.actualBoundingBoxAscent,
      actualBoundingBoxDescent: firstLineMetrics.actualBoundingBoxDescent,
      width: firstLineMetrics.width,
      fontSize,
      fontFamily: ctx.font,
      message: 'Font not fully loaded, using reliable fallback (80/20 split)'
    });
  }
  
  // CRITICAL FIX: Handle invalid TextMetrics properly
  // When actualBoundingBoxAscent is negative (font not loaded, measurement error, etc),
  // we MUST use reliable fallback values to prevent catastrophic calculation errors
  let actualAscent: number;
  let actualDescent: number;
  let actualTextHeight: number;
  
  if (hasValidMetrics) {
    // Use actual measured metrics
    actualAscent = firstLineMetrics.actualBoundingBoxAscent;
    actualDescent = firstLineMetrics.actualBoundingBoxDescent;
    actualTextHeight = actualAscent + actualDescent;
  } else {
    // CRITICAL: Use reliable fallback when TextMetrics are invalid
    // For Arial and most sans-serif fonts:
    // - Ascent is typically ~80% of fontSize  
    // - Descent is typically ~20% of fontSize
    // These ratios match CSS line-height baseline behavior better than 77/23 split
    actualAscent = fontSize * 0.80;
    actualDescent = fontSize * 0.20;
    actualTextHeight = actualAscent + actualDescent;
    
    // Changed from console.warn to console.debug to reduce noise
    console.debug(`📊 [${layerId || 'unknown'}] Fallback metrics applied:`, {
      fontSize,
      fallbackAscent: actualAscent,
      fallbackDescent: actualDescent,
      fontFamily: ctx.font
    });
  }
  
  // Final safety check: ensure values are positive and reasonable
  if (actualAscent <= 0 || actualDescent <= 0 || actualTextHeight <= 0 || !isFinite(actualAscent) || !isFinite(actualDescent)) {
    console.error(`🚨 [${layerId || 'unknown'}] CRITICAL: Metrics still invalid after fallback! Using fontSize:`, {
      actualAscent,
      actualDescent,
      actualTextHeight,
      fontSize
    });
    // Last resort: use fontSize-based safe values
    actualAscent = fontSize * 0.80;
    actualDescent = fontSize * 0.20;
    actualTextHeight = fontSize;
  }
  
  // Log comprehensive metrics for investigation
  if (layerId === 'certificate_no' || layerId === 'issue_date') {
    console.log(`🔍 [${layerId}] Font metrics investigation (CSS vs Canvas):`, {
      fontSize,
      lineHeight,
      fontFamily: ctx.font,
      fontWeight: ctx.font,
      // Canvas TextMetrics
      actualBoundingBoxAscent: firstLineMetrics.actualBoundingBoxAscent,
      actualBoundingBoxDescent: firstLineMetrics.actualBoundingBoxDescent,
      fontBoundingBoxAscent: firstLineMetrics.fontBoundingBoxAscent,
      fontBoundingBoxDescent: firstLineMetrics.fontBoundingBoxDescent,
      emHeightAscent: firstLineMetrics.emHeightAscent,
      emHeightDescent: firstLineMetrics.emHeightDescent,
      // Calculated values
      hasValidMetrics,
      actualAscent,
      actualDescent,
      actualTextHeight,
      // Ratios (should be ~0.77 for ascent, ~0.23 for descent for typical fonts)
      ascentRatio: actualAscent / fontSize,
      descentRatio: actualDescent / fontSize,
      // Line-height calculations
      lineHeightPx,
      totalTextHeight,
      // Comparison: CSS vs Canvas visual center
      cssLineHeightBoxHeight: lineHeightPx,
      canvasTotalHeight: totalTextHeight,
      // Check if actualTextHeight matches lineHeightPx (they should be different!)
      textVsLineHeightRatio: actualTextHeight / lineHeightPx,
      // Expected: actualTextHeight < lineHeightPx because line-height adds space
      heightDifference: lineHeightPx - actualTextHeight
    });
  }
  
  // CRITICAL: Use appropriate centering method based on layer
  //
  // DISCOVERY from console logs:
  // - Name layer: Works with simple geometric center
  // - certificate_no & issue_date: Still shift with geometric center
  //   Console shows centerDifference: 0 but visual shift still exists
  //
  // ROOT CAUSE:
  // For small fonts (13px) with line-height > 1:
  // - Geometric center (line-height box center) ≠ Visual center (glyphs center)
  // - Line-height space is distributed around baseline, not evenly
  // - Visual center of glyphs = baseline + (actualTextHeight / 2)
  // - Geometric center = (totalTextHeight / 2)
  //
  // Solution:
  // - Name layer (large font): Use simple geometric center (works!)
  // - certificate_no & issue_date (small fonts): Use visual center calculation
  //
  const isProblematicLayer = layerId === 'certificate_no' || layerId === 'issue_date';
  
  let startY: number;
  
  if (isProblematicLayer) {
    // For problematic layers: Calculate visual center to match CSS glyph positioning
    // 
    // CRITICAL DISCOVERY from console logs:
    // - certificate_no (lineHeight 1.2): Works with visual center calculation
    // - issue_date (lineHeight 1.3): Still shifts, needs different calculation
    //
    // CSS line-height behavior:
    // - Line-box height = fontSize * lineHeight
    // - Baseline is positioned within line-box (typically at ~0.8 * fontSize from top)
    // - Line-height space is distributed around baseline (NOT evenly above/below)
    // - Visual center of glyphs = baseline position + (actualTextHeight / 2)
    // - For lineHeight > 1: More space is added, but distribution around baseline matters
    //
    // For lineHeight 1.3 vs 1.2:
    // - More space is added (3.9px vs 2.6px for fontSize 13)
    // - Space distribution around baseline affects visual center position
    // - Need to account for how CSS distributes this extra space
    //
    // Visual center calculation:
    // - Visual center from top = actualAscent + (actualTextHeight / 2)
    // - This represents where the visual center of glyphs is within the line-height box
    // - For lineHeight > 1, space is added around baseline, not evenly distributed
    // - The extra space (lineHeight - 1) * fontSize is distributed around baseline
    //
    // CRITICAL: For lineHeight 1.3 vs 1.2:
    // - More space is added: (1.3 - 1) * 13 = 3.9px vs (1.2 - 1) * 13 = 2.6px
    // - This extra space affects visual center position
    // - CSS distributes this space around baseline, so visual center shifts
    //
    // Better calculation: Account for line-height space distribution
    // Visual center = baseline + (actualTextHeight / 2)
    // Baseline ≈ actualAscent (distance from top to baseline)
    // But with line-height space, the visual center shifts slightly
    //
    // For both certificate_no and issue_date: Use visual center based on actualAscent
    // This matches CSS glyph positioning within the line-height box
    //
    // CRITICAL DISCOVERY from console logs:
    // - certificate_no (lineHeight 1.2): Works correctly with visual center
    // - issue_date (lineHeight 1.3): Still shifts - needs different approach
    //
    // The issue: For single-line text, visualCenterOfBlock = visualCenterFromTop
    // But visualCenterFromTop doesn't account for lineHeight differences!
    //
    // CSS line-height behavior:
    // - Line-box height = fontSize * lineHeight
    // - Baseline position ≈ actualAscent from top
    // - Visual center of glyphs = baseline + (actualTextHeight / 2)
    // - BUT: With lineHeight > 1, extra space is distributed around baseline
    // - This shifts the visual center within the line-height box
    //
    // For different lineHeight values:
    // - lineHeight 1.2: 2.6px extra space (for fontSize 13)
    // - lineHeight 1.3: 3.9px extra space (1.3px more)
    // 
    // The extra space distribution affects where visual center appears
    // We need to account for this in visualCenter calculation
    //
    // Better approach: Use geometric center of line-height box for issue_date
    // This ensures consistency with CSS element box centering
    // CRITICAL: For both certificate_no and issue_date, use geometric center of line-height box
    // This ensures consistency with CSS element box centering
    // CSS centers element box at stored y, and geometric center matches this better than visual center
    // 
    // Why geometric center works better:
    // - CSS element box height = fontSize * lineHeight + padding + border
    // - CSS centers this box at stored y
    // - Canvas text height = fontSize * lineHeight (no padding/border)
    // - Geometric center of line-height box aligns with CSS element box center
    // - Visual center (based on actualAscent) may shift due to baseline position variations
    // CRITICAL: For issue_date, account for CSS padding/border (12px total) that affects visual center
    // CSS element box height = fontSize * lineHeight + 12px (padding 8px + border 4px)
    // Canvas text height = fontSize * lineHeight (no padding/border)
    // 
    // CSS centers element box at stored y using transform: translate(0%, -50%)
    // The stored y represents center of element box (text + padding + border)
    // Since padding/border is symmetric (6px top, 6px bottom), 
    // center of element box = center of text + 6px down (padding/border below text)
    // 
    // However, with geometric center of line-height box, we're centering the text block
    // To match CSS element box center, we need slight adjustment for the padding/border
    //
    // For issue_date specifically: Use geometric center with precise padding/border compensation
    if (layerId === 'issue_date') {
      // Calculate geometric center of line-height box
      const geometricCenterOfLineBox = lineHeightPx / 2;
      const visualCenterOfBlock = geometricCenterOfLineBox + ((lines.length - 1) * lineHeightPx) / 2;
      
      // CRITICAL: User reports text too left and slightly too low (needs to move right and up)
      // Need upward adjustment (Y) and right adjustment (X will be handled separately)
      const paddingBorderAdjustment = 9; // User requested: 9px to move down (increase downward shift)
      
      startY = y - visualCenterOfBlock + paddingBorderAdjustment;
    } else if (layerId === 'certificate_no') {
      // For certificate_no: User reports text still slightly too high
      // Need to move text up slightly (reduce startY) and to the right
      const geometricCenterOfLineBox = lineHeightPx / 2;
      const visualCenterOfBlock = geometricCenterOfLineBox + ((lines.length - 1) * lineHeightPx) / 2;
      
      // Fine-tuning: Move up more (negative adjustment) to avoid collision with "NOMOR"
      const fineTuneAdjustment = -6; // User requested: -6px to move up more
      
      startY = y - visualCenterOfBlock + fineTuneAdjustment;
    } else {
      // For other problematic layers (shouldn't happen, but fallback)
      const visualCenterFromTop = actualAscent + (actualTextHeight / 2);
      const visualCenterOfBlock = visualCenterFromTop + ((lines.length - 1) * lineHeightPx) / 2;
      startY = y - visualCenterOfBlock;
    }
  } else {
    // For all other layers (name, score layers): Use simple geometric center
    startY = y - (totalTextHeight / 2);
  }
  
  // CRITICAL FIX: Calculate x position for each line based on textAlign
  // 
  // COORDINATE SYSTEM MISMATCH:
  // CSS Preview: left: x, transform: translate(TX%, -50%)
  //   - left:   TX = 0%    → x is LEFT edge (no shift)
  //   - center: TX = -50%  → x shifts left by 50% of element width → Visual center at x
  //   - right:  TX = -100% → x shifts left by 100% of element width → Visual right edge at x
  // 
  // Canvas Rendering: ctx.textAlign = align; ctx.fillText(text, x, y)
  //   - left:   x is LEFT edge ✅ MATCHES CSS
  //   - center: x is CENTER point ✅ MATCHES CSS (after transform)
  //   - right:  x is RIGHT edge ✅ MATCHES CSS (after transform)
  // 
  // CONCLUSION: Stored x coordinate already represents the VISUAL position (post-transform)
  // which matches Canvas textAlign expectations. No adjustment needed!
  // Note: Canvas doesn't support 'justify', map it to 'left'
  ctx.textAlign = textAlign === 'justify' ? 'left' : textAlign;
  
  let drawX = x;
  
  // CRITICAL: X position adjustment for alignment conversion
  if (layerId === 'issue_date') {
    // Move more to the right to avoid collision with "Malang" text
    const xAdjustment = 11; // User requested: 11px to move right
    drawX = x + xAdjustment;
  } else if (layerId === 'certificate_no') {
    // Move more to the right to avoid collision with "NOMOR" text
    const xAdjustment = 8; // User requested: 8px to move right
    drawX = x + xAdjustment;
  } else {
    // For all other layers, use stored x coordinate directly
    // CSS transform already accounts for alignment, and Canvas textAlign matches this
    drawX = x;
  }
  
  // COMPREHENSIVE DEBUG LOGGING: Compare working vs broken layers
  if (layerId === 'name' || layerId === 'certificate_no' || layerId === 'issue_date') {
    let calculatedCenter: number;
    let centerDifference: number;
    
    if (isProblematicLayer) {
      // For problematic layers: Calculate center based on method used
      if (layerId === 'issue_date') {
        // issue_date uses geometric center with padding/border adjustment
        const geometricCenterOfLineBox = lineHeightPx / 2;
        const calculatedVisualCenter = geometricCenterOfLineBox + ((lines.length - 1) * lineHeightPx) / 2;
        const paddingBorderAdjustment = 9; // Match the adjustment in startY calculation
        calculatedCenter = startY + calculatedVisualCenter - paddingBorderAdjustment;
        centerDifference = calculatedCenter - y;
      } else if (layerId === 'certificate_no') {
        // certificate_no uses geometric center with fine-tuning adjustment
        const geometricCenterOfLineBox = lineHeightPx / 2;
        const calculatedVisualCenter = geometricCenterOfLineBox + ((lines.length - 1) * lineHeightPx) / 2;
        const fineTuneAdjustment = -6; // Match the adjustment in startY calculation (negative = move up)
        calculatedCenter = startY + calculatedVisualCenter - fineTuneAdjustment;
        centerDifference = calculatedCenter - y;
      } else {
        // Fallback: Use visual center based on actualAscent
        const visualCenterFromTop = actualAscent + (actualTextHeight / 2);
        const visualCenterOfBlock = visualCenterFromTop + ((lines.length - 1) * lineHeightPx) / 2;
        calculatedCenter = startY + visualCenterOfBlock;
        centerDifference = calculatedCenter - y;
      }
    } else {
      // For other layers: Calculate geometric center
      calculatedCenter = startY + (totalTextHeight / 2);
      centerDifference = calculatedCenter - y;
    }
    
    console.log(`🔍 [${layerId}] DRAW_WRAPPED_TEXT CALCULATION:`, {
      layerId,
      // Input
      x,
      y,
      fontSize,
      lineHeight,
      textAlign,
      text: text.substring(0, 20),
      linesCount: lines.length,
      // Text metrics
      hasValidMetrics,
      actualBoundingBoxAscent: firstLineMetrics.actualBoundingBoxAscent,
      actualBoundingBoxDescent: firstLineMetrics.actualBoundingBoxDescent,
      actualAscent,
      actualDescent,
      actualTextHeight,
      // Line height calculations
      lineHeightPx,
      totalTextHeight,
      // Final positioning (simple geometric center - same as name layer that works)
      startY,
      calculatedCenter,
      expectedCenter: y,
      centerDifference,
      // Critical: This shows if we're off
      isOffsetCorrect: Math.abs(centerDifference) < 0.5,
      // Visual shift analysis
      actualShift: centerDifference > 0 ? `${centerDifference.toFixed(2)}px DOWN` : `${Math.abs(centerDifference).toFixed(2)}px UP`,
      // CRITICAL: Method depends on layer
      calculationMethod: isProblematicLayer 
        ? (layerId === 'issue_date'
          ? 'GEOMETRIC_CENTER_LINEBOX_WITH_PADDING_ADJUSTMENT - accounts for CSS padding/border (12px) for perfect alignment'
          : layerId === 'certificate_no'
          ? 'GEOMETRIC_CENTER_LINEBOX - uses geometric center of line-height box'
          : 'VISUAL_CENTER - matches CSS glyph visual center (fallback)')
        : 'GEOMETRIC_CENTER - simple centering (same as name layer that works)',
      // For problematic layers: Show calculation details
      ...(isProblematicLayer ? {
        ...(layerId === 'issue_date' ? {
          // issue_date uses geometric center with padding/border adjustment
          geometricCenterOfLineBox: lineHeightPx / 2,
          visualCenterOfBlock: (lineHeightPx / 2) + ((lines.length - 1) * lineHeightPx) / 2,
          paddingBorderAdjustment: 9, // User requested: 9px to move down
          xAdjustment: 11, // User requested: 11px to move right
          cssElementBoxHeight: lineHeightPx + 12, // text + padding (8px) + border (4px)
          canvasTextHeight: lineHeightPx,
          visualCenterFromTop: actualAscent + (actualTextHeight / 2),
          geometricCenter: startY + (totalTextHeight / 2),
          geometricCenterDifference: (startY + (totalTextHeight / 2)) - y,
          comparison: 'Using geometric center with 9px Y adjustment (down) and 11px X adjustment (right) to avoid collision with "Malang"'
        } : layerId === 'certificate_no' ? {
          // certificate_no uses geometric center with fine-tuning adjustment
          geometricCenterOfLineBox: lineHeightPx / 2,
          visualCenterOfBlock: (lineHeightPx / 2) + ((lines.length - 1) * lineHeightPx) / 2,
          fineTuneAdjustment: -6, // User requested: -6px to move up more
          xAdjustment: 8, // User requested: 8px to move right
          visualCenterFromTop: actualAscent + (actualTextHeight / 2),
          geometricCenter: startY + (totalTextHeight / 2),
          geometricCenterDifference: (startY + (totalTextHeight / 2)) - y,
          comparison: 'Using geometric center with -6px Y adjustment (move up) and 8px X adjustment (right) to avoid collision with "NOMOR"'
        } : {
          // Fallback: Use visual center
          visualCenterFromTop: actualAscent + (actualTextHeight / 2),
          visualCenterOfBlock: (actualAscent + (actualTextHeight / 2)) + ((lines.length - 1) * lineHeightPx) / 2,
          geometricCenter: startY + (totalTextHeight / 2),
          geometricCenterDifference: (startY + (totalTextHeight / 2)) - y
        })
      } : {}),
      // Analysis for debugging
      cssElementBoxHeight: totalTextHeight + 12, // text + padding (8px) + border (4px)
      canvasTextHeight: totalTextHeight,
      paddingBorderHeight: 12,
      // Recommendation
      recommendation: Math.abs(centerDifference) > 0.5
        ? `Geometric center differs by ${Math.abs(centerDifference).toFixed(1)}px ${centerDifference > 0 ? 'DOWN' : 'UP'}. This suggests a fundamental issue with: (1) Y coordinate storage/loading, (2) totalTextHeight calculation, or (3) CSS vs Canvas height mismatch.`
        : 'Geometric center matches layout setting perfectly ✓'
    });
  }

  // CRITICAL: For "name" layer with long text, adjust x to shift left if text exceeds maxWidth
  // This prevents wrapping and keeps text in single line, shifting the text box to the left
  let adjustedDrawX = drawX;
  if (isNameLayer && maxWidth > 0 && lines.length === 1) {
    // Single line text that might exceed maxWidth
    const lineWidth = ctx.measureText(lines[0]).width;
    
    if (lineWidth > maxWidth) {
      // Text exceeds maxWidth - adjust x to shift left based on alignment
      if (textAlign === 'right') {
        // For right-aligned: shift left by the overflow amount
        const overflow = lineWidth - maxWidth;
        adjustedDrawX = drawX - overflow;
      } else if (textAlign === 'center') {
        // For center-aligned: shift left by half the overflow amount
        const overflow = lineWidth - maxWidth;
        adjustedDrawX = drawX - (overflow / 2);
      } else {
        // For left-aligned: shift left to keep text within maxWidth boundary
        // Calculate overflow and shift left to accommodate the full text
        const overflow = lineWidth - maxWidth;
        adjustedDrawX = drawX - overflow;
      }
    }
  }

  // Draw each line
  // Canvas textAlign is set above to handle alignment correctly for each line
  lines.forEach((line, index) => {
    const lineY = startY + (index * lineHeightPx);
    ctx.fillText(line, adjustedDrawX, lineY);
    
    // Log final draw position for critical layers (first line only)
    if (index === 0 && (layerId === 'name' || layerId === 'certificate_no' || layerId === 'issue_date')) {
      console.log(`🔍 [${layerId}] FILLTEXT CALL:`, {
        layerId,
        line: line.substring(0, 20),
        drawX,
        lineY,
        textAlign: ctx.textAlign,
        textBaseline: ctx.textBaseline,
        fontSize,
        font: ctx.font
      });
    }
  });
}

/**
 * Draw rich text with inline formatting
 * Supports different font weights and families within the same text layer
 */
function drawRichText(
  ctx: CanvasRenderingContext2D,
  richText: RichText,
  x: number,
  y: number,
  maxWidth: number,
  baseFontSize: number,
  lineHeight: number,
  textAlign: 'left' | 'center' | 'right' | 'justify'
) {
  const lineHeightPx = baseFontSize * lineHeight;
  
  // Convert rich text to plain text for wrapping calculation
  const plainText = richText.map(span => span.text).join('');
  
  // Calculate wrapping using base font
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  
  // Split into words for wrapping
  const words = plainText.split(' ');
  const lines: Array<{ text: string; spans: RichText }> = [];
  let currentLine = '';
  let currentOffset = 0;
  
  // Build lines with their corresponding spans
  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const metrics = ctx.measureText(testLine);
    
    if (metrics.width > maxWidth && currentLine) {
      // Line is full, push it
      const lineLength = currentLine.length;
      const spansForLine = extractSpansForRange(richText, currentOffset, currentOffset + lineLength);
      lines.push({ text: currentLine, spans: spansForLine });
      currentOffset += lineLength + 1; // +1 for space
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }
  
  if (currentLine) {
    const spansForLine = extractSpansForRange(richText, currentOffset, currentOffset + currentLine.length);
    lines.push({ text: currentLine, spans: spansForLine });
  }
  
  // Calculate vertical centering (same as drawWrappedText)
  const totalTextHeight = lines.length * lineHeightPx;
  const startY = y - (totalTextHeight / 2);
  
  // Draw each line with its spans
  lines.forEach((line, lineIndex) => {
    const lineY = startY + (lineIndex * lineHeightPx);
    let currentX = x;
    
    // Calculate line width for alignment
    let lineWidth = 0;
    line.spans.forEach(span => {
      const spanFont = `${span.fontWeight || 'normal'} ${span.fontSize || baseFontSize}px ${span.fontFamily || 'Arial'}`;
      ctx.font = spanFont;
      lineWidth += ctx.measureText(span.text).width;
    });
    
    // Adjust starting X based on alignment
    if (textAlign === 'center') {
      currentX = x - (lineWidth / 2);
    } else if (textAlign === 'right') {
      currentX = x - lineWidth;
    }
    
    // Draw each span
    line.spans.forEach(span => {
      const spanFontWeight = span.fontWeight || 'normal';
      const spanFontSize = span.fontSize || baseFontSize;
      const spanFontFamily = span.fontFamily || 'Arial';
      const spanColor = span.color || ctx.fillStyle;
      
      ctx.font = `${spanFontWeight} ${spanFontSize}px ${spanFontFamily}`;
      ctx.fillStyle = spanColor;
      ctx.fillText(span.text, currentX, lineY);
      
      // Move X position for next span
      currentX += ctx.measureText(span.text).width;
    });
  });
}

/**
 * Extract spans for a specific text range
 */
function extractSpansForRange(richText: RichText, start: number, end: number): RichText {
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
      text: span.text.slice(overlapStart - spanStart, overlapEnd - spanStart)
    });
    
    currentOffset = spanEnd;
  }
  
  return result;
}

/**
 * Save PNG DataURL to public folder (optional, for persistent storage)
 * This is a client-side helper that generates filename
 */
export function generatePNGFilename(prefix: string = 'generated'): string {
  const timestamp = Date.now();
  return `${prefix}_${timestamp}.png`;
}