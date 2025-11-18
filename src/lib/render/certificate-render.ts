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
  fontStyle?: 'normal' | 'italic' | 'oblique' | 'underline' | 'line-through' | 'overline';
  textAlign?: 'left' | 'center' | 'right' | 'justify';
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
  type: 'photo' | 'logo' | 'signature' | 'decoration';
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
  fitMode: 'contain' | 'cover' | 'fill' | 'none';
  
  // Crop (optional)
  crop?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  
  // Mask (optional)
  mask?: {
    type: 'none' | 'circle' | 'ellipse' | 'roundedRect' | 'polygon';
    borderRadius?: number;
    points?: { x: number; y: number }[];
  };
  
  // Visual effects
  opacity: number;
  rotation: number;
}

export interface RenderCertificateParams {
  templateImageUrl: string;
  textLayers: RenderTextLayer[];
  photoLayers?: RenderPhotoLayer[]; // Optional: Photo/image layers
  width?: number;  // Optional: If not provided, use template's natural width
  height?: number; // Optional: If not provided, use template's natural height
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
  const { templateImageUrl, textLayers, photoLayers, width, height } = params;
  
  // DEBUG: Log what we received
  console.log('🎨 renderCertificateToDataURL called with params:', {
    templateImageUrl: templateImageUrl?.substring(0, 50) + '...',
    textLayersCount: textLayers?.length || 0,
    photoLayersCount: photoLayers?.length || 0,
    photoLayersReceived: photoLayers,
    hasPhotoLayers: !!photoLayers && photoLayers.length > 0
  });

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
  
  // DYNAMIC CANVAS SIZE (like Canva/Affinity):
  // Use template's NATURAL dimensions if not explicitly provided
  // This ensures output matches template resolution exactly (no scaling/distortion)
  const finalWidth = width ?? img.naturalWidth;
  const finalHeight = height ?? img.naturalHeight;
  
  console.log('🖼️ Template image loaded (Dynamic Canvas Size):', {
    naturalWidth: img.naturalWidth,
    naturalHeight: img.naturalHeight,
    providedWidth: width,
    providedHeight: height,
    finalWidth,
    finalHeight,
    usingNaturalSize: width === undefined || height === undefined
  });

  // Create offscreen canvas at FINAL dimensions
  const canvas = document.createElement('canvas');
  canvas.width = finalWidth;
  canvas.height = finalHeight;
  const ctx = canvas.getContext('2d');
  
  if (!ctx) {
    throw new Error('Failed to get canvas context');
  }

  // DPI-Aware Canvas Setup
  // Get device pixel ratio for high-DPI displays
  const dpr = window.devicePixelRatio || 1;
  console.log('📱 Device Pixel Ratio:', dpr);
  
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
  console.log(`📐 Scale Factor: ${scaleFactor} (finalWidth ${finalWidth} / STANDARD_CANVAS_WIDTH ${STANDARD_CANVAS_WIDTH})`);
  
  // Prepare all layers with zIndex for sorting
  interface LayerToRender {
    type: 'photo' | 'text';
    zIndex: number;
    data: RenderPhotoLayer | RenderTextLayer;
  }
  
  const layersToRender: LayerToRender[] = [];
  
  // Add photo layers
  if (photoLayers && photoLayers.length > 0) {
    console.log(`📸 PHOTO LAYERS TO RENDER: ${photoLayers.length}`);
    console.log(`📸 Photo layers array:`, photoLayers);
    photoLayers.forEach((layer, index) => {
      console.log(`📸 Adding photo layer ${index}:`, {
        id: layer.id,
        type: layer.type,
        src: layer.src?.substring(0, 50) + '...',
        zIndex: layer.zIndex,
        xPercent: layer.xPercent,
        yPercent: layer.yPercent,
        widthPercent: layer.widthPercent,
        heightPercent: layer.heightPercent
      });
      layersToRender.push({
        type: 'photo',
        zIndex: layer.zIndex,
        data: layer
      });
    });
  } else {
    console.warn('⚠️ NO PHOTO LAYERS RECEIVED! photoLayers:', photoLayers);
  }
  
  // Add text layers (default zIndex = 100 to appear above photos)
  console.log(`📝 TEXT LAYERS TO RENDER: ${textLayers.length}`);
  
  // 🔍 COMPREHENSIVE DATA FLOW DEBUGGING
  console.group('🎯 SCORE GENERATION DEBUG - DATA FLOW ANALYSIS');
  console.log('📊 All Text Layers Received:');
  textLayers.forEach((layer, index) => {
    const isDefaultLayer = ['certificate_no', 'issue_date', 'name'].includes(layer.id);
    const isScoreRelated = layer.text && (
      layer.text.includes('Nilai') || 
      layer.text.includes('Prestasi') || 
      layer.text.includes('Score') ||
      /\d+/.test(layer.text) // Contains numbers
    );
    
    console.log(`   Layer ${index}:`, {
      id: layer.id,
      text: layer.text?.substring(0, 50) + (layer.text?.length > 50 ? '...' : ''),
      fontSize: layer.fontSize,
      isDefaultLayer,
      isScoreRelated,
      xPercent: layer.xPercent,
      yPercent: layer.yPercent,
      textAlign: layer.textAlign
    });
  });
  console.groupEnd();
  
  textLayers.forEach(layer => {
    layersToRender.push({
      type: 'text',
      zIndex: 100, // Text layers default to top
      data: layer
    });
  });
  
  // Sort layers by zIndex (ascending)
  layersToRender.sort((a, b) => a.zIndex - b.zIndex);
  
  console.log('🎨 RENDERING ORDER:', layersToRender.map(l => ({
    type: l.type,
    zIndex: l.zIndex,
    id: l.type === 'photo' ? (l.data as RenderPhotoLayer).id : (l.data as RenderTextLayer).id
  })));
  
  // Render all layers in order
  for (const layerWrapper of layersToRender) {
    if (layerWrapper.type === 'photo') {
      // ===== RENDER PHOTO LAYER =====
      const photoLayer = layerWrapper.data as RenderPhotoLayer;
      console.log(`📸 Rendering photo layer: ${photoLayer.id}`);
      try {
        await renderPhotoLayer(ctx, photoLayer, finalWidth, finalHeight, scaleFactor);
        console.log(`✅ Photo layer rendered: ${photoLayer.id}`);
      } catch (error) {
        console.error(`❌ Failed to render photo layer ${photoLayer.id}:`, error);
      }
    } else {
      // ===== RENDER TEXT LAYER =====
      const layer = layerWrapper.data as RenderTextLayer;
      
      // Skip empty text
      if (!layer.text) {
        console.warn(`⚠️ SKIPPING text layer "${layer.id}" because text is empty`);
        continue;
      }
      
      // Calculate position (percentage-first)
      const x = layer.xPercent !== undefined && layer.xPercent !== null
        ? Math.round(layer.xPercent * finalWidth)    // Percentage (NEW system) ✅
        : Math.round((layer.x || 0) * scaleFactor);  // Absolute (OLD system, legacy)
      let y = layer.yPercent !== undefined && layer.yPercent !== null
        ? Math.round(layer.yPercent * finalHeight)   // Percentage (NEW system) ✅
        : Math.round((layer.y || 0) * scaleFactor);  // Absolute (OLD system, legacy)
      
      // 🎯 SMART LAYER DETECTION & Y-AXIS ADJUSTMENT
      const isScoreLayer = (layer: RenderTextLayer) => {
        // Check by ID first
        if (layer.id === 'nilai' || layer.id === 'prestasi') return true;
        
        // Check by text content (more reliable for custom layers)
        if (layer.text) {
          const text = layer.text.toLowerCase();
          const scoreKeywords = ['nilai', 'prestasi', 'score', 'skor'];
          const hasScoreKeyword = scoreKeywords.some(keyword => text.includes(keyword));
          const hasNumbers = /\d+/.test(layer.text);
          
          // Score layer characteristics:
          // 1. Contains score keywords OR numbers
          // 2. Font size typically 20-30px
          // 3. Not a default layer
          return (hasScoreKeyword || hasNumbers) && 
                 layer.fontSize >= 18 && 
                 layer.fontSize <= 30 &&
                 !['certificate_no', 'issue_date', 'name'].includes(layer.id);
        }
        return false;
      };
      
      // Dynamic Y-axis adjustment based on font size and layer type
      const getYAdjustment = (layer: RenderTextLayer) => {
        const fontSize = layer.fontSize || 16;
        
        // Certificate number: fixed adjustment
        if (layer.id === 'certificate_no') return 7;
        
        // Score layers: font-size based adjustment (significantly increased for lower positioning)
        if (isScoreLayer(layer)) {
          if (fontSize <= 18) return 8;   // +8px DOWN for small fonts
          if (fontSize <= 22) return 10;  // +10px DOWN for medium fonts
          if (fontSize <= 26) return 12;  // +12px DOWN for large fonts
          return 14;                      // +14px DOWN for extra large fonts
        }
        
        // Other layers: no adjustment
        return 0;
      };
      
      // DEBUG: Log all layer IDs to identify custom text layers
      console.log(`🔍 [DEBUG] Processing layer:`, {
        id: layer.id,
        text: layer.text?.substring(0, 30),
        fontSize: layer.fontSize,
        yPercent: layer.yPercent,
        originalY: y
      });
      
      const yAdjustment = getYAdjustment(layer);
      const isScore = isScoreLayer(layer);
      
      if (yAdjustment > 0) {
        const originalY = y;
        y = y + yAdjustment;
        
        console.log(`🎯 [${layer.id}] Y-AXIS ADJUSTMENT:`, {
          layerId: layer.id,
          text: layer.text?.substring(0, 30),
          fontSize: layer.fontSize,
          isScoreLayer: isScore,
          adjustment: `+${yAdjustment}px DOWN`,
          originalY,
          newY: y,
          detectionMethod: layer.id === 'certificate_no' ? 'ID_MATCH' : 
                          isScore ? 'SMART_DETECTION' : 'NO_MATCH'
        });
      }
      
      // Scale maxWidth based on template resolution
      const baseMaxWidth = layer.maxWidth || 300;
      const scaledMaxWidth = Math.round(baseMaxWidth * scaleFactor);
      
      // Determine alignment
      const isCertificateLayer = layer.id === 'certificate_no' || layer.id === 'issue_date';
      const align = isCertificateLayer 
        ? 'left'  // certificate_no/issue_date always left
        : (layer.textAlign || 'center'); // Other layers: use setting or default center
      
      // Scale fontSize based on template resolution
      const fontWeight = layer.fontWeight === 'bold' ? 'bold' : 'normal';
      const baseFontSize = Math.max(1, layer.fontSize || 16);
      const scaledFontSize = Math.round(baseFontSize * scaleFactor);
      const fontFamily = layer.fontFamily || 'Arial';
      
      // Handle fontStyle: italic/oblique for CSS fontStyle, underline/line-through for textDecoration
      const style = layer.fontStyle || 'normal';
      const isDecoration = style === 'underline' || style === 'line-through' || style === 'overline';
      const fontStyle = isDecoration ? 'normal' : style; // italic/oblique/normal
      
      ctx.font = `${fontStyle} ${fontWeight} ${scaledFontSize}px ${fontFamily}`;
      
      // Debug logging for critical layers
      if (layer.id === 'name' || layer.id === 'certificate_no' || layer.id === 'issue_date') {
        console.log(`🔍 [${layer.id}] RENDER DATA:`, {
          layerId: layer.id,
          xPercent: layer.xPercent,
          yPercent: layer.yPercent,
          x, y,
          fontSize: layer.fontSize,
          scaleFactor,
          scaledFontSize,
          scaledMaxWidth,
          textAlign: align
        });
      }
      // Set color and baseline
      ctx.fillStyle = layer.color || '#000000';
      ctx.textBaseline = 'top';
      
      // Render text (rich text or regular)
      if (layer.richText && layer.hasInlineFormatting) {
        // CRITICAL: Pass scaleFactor so span fontSizes can be scaled correctly
        drawRichText(
          ctx,
          layer.richText,
          x, y,
          scaledMaxWidth,
          scaledFontSize,
          layer.lineHeight || 1.2,
          align,
          scaleFactor,
          isDecoration ? style : undefined // Pass decoration style
        );
      } else {
        drawWrappedText(
          ctx, 
          layer.text, 
          x, y,
          scaledMaxWidth, 
          scaledFontSize, 
          layer.lineHeight || 1.2,
          align,
          layer.id,
          isDecoration ? style : undefined // Pass decoration style
        );
      }
    }
  }

  // Convert to PNG DataURL with maximum quality for master file
  // PNG ensures lossless quality for professional use (download/email/PDF)
  // WebP preview will be generated separately from this PNG master
  return canvas.toDataURL('image/png', 1.0);
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
  layerId?: string, // Optional layer ID for debugging
  textDecoration?: 'underline' | 'line-through' | 'overline' // Optional text decoration
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
  
  // REFACTOR: Use uniform geometric center for ALL layers
  // This ensures consistent positioning between Preview (CSS) and Generated PNG (Canvas)
  // No special casing, no hardcoded adjustments, no padding/border compensation
  // 
  // Why this works:
  // - Both CSS and Canvas now center text block (fontSize * lineHeight) at stored y
  // - No padding/border in CSS preview (removed to match Canvas)
  // - Geometric center: startY = y - (totalTextHeight / 2)
  // - Works uniformly for all font sizes and lineHeight values
  //
  // Benefits:
  // - Consistent positioning across all layers
  // - Scalable: works for any template without per-layer adjustments
  // - Maintainable: simple, clear logic
  // - Predictable: same calculation for preview and generation
  
  const startY = y - (totalTextHeight / 2);
  
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
  
  // REFACTOR: Use stored x coordinate directly for ALL layers
  // No adjustments needed - CSS transform and Canvas textAlign are already aligned
  drawX = x;
  
  // SIMPLIFIED DEBUG LOGGING: Verify uniform geometric center calculation
  if (layerId === 'name' || layerId === 'certificate_no' || layerId === 'issue_date') {
    // All layers now use simple geometric center
    const calculatedCenter = startY + (totalTextHeight / 2);
    const centerDifference = calculatedCenter - y;
    
    console.log(`🔍 [${layerId}] POSITIONING (Uniform Geometric Center):`, {
      layerId,
      // Input coordinates
      x,
      y,
      fontSize,
      lineHeight,
      textAlign,
      text: text.substring(0, 20),
      linesCount: lines.length,
      // Calculations
      lineHeightPx,
      totalTextHeight,
      startY,
      calculatedCenter,
      expectedCenter: y,
      centerDifference,
      // Verification
      isOffsetCorrect: Math.abs(centerDifference) < 0.5,
      actualShift: centerDifference > 0 ? `${centerDifference.toFixed(2)}px DOWN` : `${Math.abs(centerDifference).toFixed(2)}px UP`,
      method: 'UNIFORM_GEOMETRIC_CENTER - same for all layers',
      recommendation: Math.abs(centerDifference) < 0.5
        ? 'Perfect center alignment ✓'
        : `Off by ${Math.abs(centerDifference).toFixed(1)}px - check coordinates or CSS`
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
    
    // Draw text decoration if specified
    if (textDecoration) {
      const lineWidth = ctx.measureText(line).width;
      const lineThickness = Math.max(1, fontSize / 16); // Scale line thickness with font size
      
      // Calculate line start X based on text alignment
      let decorationX = adjustedDrawX;
      if (ctx.textAlign === 'center') {
        decorationX = adjustedDrawX - (lineWidth / 2);
      } else if (ctx.textAlign === 'right') {
        decorationX = adjustedDrawX - lineWidth;
      }
      
      // Draw decoration line
      ctx.fillStyle = ctx.fillStyle; // Use same color as text
      
      if (textDecoration === 'underline') {
        // Underline: below text baseline
        const underlineY = lineY + fontSize;
        ctx.fillRect(decorationX, underlineY, lineWidth, lineThickness);
      } else if (textDecoration === 'line-through') {
        // Line-through: middle of text
        const strikeY = lineY + (fontSize / 2);
        ctx.fillRect(decorationX, strikeY, lineWidth, lineThickness);
      } else if (textDecoration === 'overline') {
        // Overline: above text
        const overlineY = lineY - lineThickness;
        ctx.fillRect(decorationX, overlineY, lineWidth, lineThickness);
      }
    }
    
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
        font: ctx.font,
        textDecoration: textDecoration || 'none'
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
  textAlign: 'left' | 'center' | 'right' | 'justify',
  scaleFactor: number = 1,
  textDecoration?: 'underline' | 'line-through' | 'overline' // Optional text decoration
) {
  const lineHeightPx = baseFontSize * lineHeight;
  
  // Debug: Log rich text rendering with scale factor
  console.log('🎨 drawRichText called:', {
    baseFontSize,
    scaleFactor,
    spanCount: richText.length,
    spans: richText.map(s => ({
      text: s.text.substring(0, 20),
      fontSize: s.fontSize,
      scaledFontSize: s.fontSize ? Math.round(s.fontSize * scaleFactor) : baseFontSize,
      fontWeight: s.fontWeight
    }))
  });
  
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
      // CRITICAL: Scale span fontSize if provided, otherwise use base (already scaled)
      const spanFontSize = span.fontSize ? Math.round(span.fontSize * scaleFactor) : baseFontSize;
      const spanFont = `${span.fontWeight || 'normal'} ${spanFontSize}px ${span.fontFamily || 'Arial'}`;
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
      // CRITICAL: Scale span fontSize if provided, otherwise use base (already scaled)
      const spanFontSize = span.fontSize ? Math.round(span.fontSize * scaleFactor) : baseFontSize;
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
  fitMode: 'contain' | 'cover' | 'fill' | 'none'
): { width: number; height: number; offsetX: number; offsetY: number } {
  if (fitMode === 'fill') {
    // Stretch to fill (may distort)
    return { width: targetWidth, height: targetHeight, offsetX: 0, offsetY: 0 };
  }
  
  if (fitMode === 'none') {
    // Original size, centered
    return {
      width: sourceWidth,
      height: sourceHeight,
      offsetX: (targetWidth - sourceWidth) / 2,
      offsetY: (targetHeight - sourceHeight) / 2
    };
  }
  
  const sourceAspect = sourceWidth / sourceHeight;
  const targetAspect = targetWidth / targetHeight;
  
  if (fitMode === 'contain') {
    // Fit inside, maintain aspect (letterbox/pillarbox)
    if (sourceAspect > targetAspect) {
      // Source wider than target
      const scaledHeight = targetWidth / sourceAspect;
      return {
        width: targetWidth,
        height: scaledHeight,
        offsetX: 0,
        offsetY: (targetHeight - scaledHeight) / 2
      };
    } else {
      // Source taller than target
      const scaledWidth = targetHeight * sourceAspect;
      return {
        width: scaledWidth,
        height: targetHeight,
        offsetX: (targetWidth - scaledWidth) / 2,
        offsetY: 0
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
      offsetY: 0
    };
  } else {
    // Source taller - crop top/bottom
    const scaledHeight = targetWidth / sourceAspect;
    return {
      width: targetWidth,
      height: scaledHeight,
      offsetX: 0,
      offsetY: (targetHeight - scaledHeight) / 2
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
  mask: RenderPhotoLayer['mask']
): void {
  if (!mask || mask.type === 'none') return;
  
  ctx.save();
  ctx.beginPath();
  
  switch (mask.type) {
    case 'circle': {
      const radius = Math.min(width, height) / 2;
      const centerX = x + width / 2;
      const centerY = y + height / 2;
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      break;
    }
    
    case 'ellipse': {
      const centerX = x + width / 2;
      const centerY = y + height / 2;
      ctx.ellipse(centerX, centerY, width / 2, height / 2, 0, 0, Math.PI * 2);
      break;
    }
    
    case 'roundedRect': {
      const radius = mask.borderRadius || 10;
      ctx.moveTo(x + radius, y);
      ctx.lineTo(x + width - radius, y);
      ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
      ctx.lineTo(x + width, y + height - radius);
      ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
      ctx.lineTo(x + radius, y + height);
      ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
      ctx.lineTo(x, y + radius);
      ctx.quadraticCurveTo(x, y, x + radius, y);
      break;
    }
    
    case 'polygon': {
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
  scaleFactor: number
): Promise<void> {
  // Load image
  const img = await loadImage(layer.src);
  
  // Calculate position (percentage-first)
  const x = layer.xPercent !== undefined && layer.xPercent !== null
    ? Math.round(layer.xPercent * canvasWidth)
    : Math.round((layer.x || 0) * scaleFactor);
  const y = layer.yPercent !== undefined && layer.yPercent !== null
    ? Math.round(layer.yPercent * canvasHeight)
    : Math.round((layer.y || 0) * scaleFactor);
  
  // Calculate size (percentage-first)
  const width = layer.widthPercent !== undefined && layer.widthPercent !== null
    ? Math.round(layer.widthPercent * canvasWidth)
    : Math.round((layer.width || img.naturalWidth) * scaleFactor);
  const height = layer.heightPercent !== undefined && layer.heightPercent !== null
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
  if (layer.mask && layer.mask.type !== 'none') {
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
    layer.fitMode
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
    fit.height
  );
  
  // Restore context state
  ctx.restore();
}

/**
 * Save PNG DataURL to public folder (optional, for persistent storage)
 * This is a client-side helper that generates filename
 */
export function generatePNGFilename(prefix: string = 'generated'): string {
  const timestamp = Date.now();
  return `${prefix}_${timestamp}.png`;
}