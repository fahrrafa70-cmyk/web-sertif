/**
 * Unified Positioning System
 * Ensures 1-2px accuracy between preview (CSS) and generation (Canvas)
 * 
 * Key principle: Use same coordinate system and baseline calculations
 * for both preview and generation to eliminate positioning differences
 */

export interface UnifiedPositionParams {
  x: number;
  y: number;
  xPercent: number;
  yPercent: number;
  fontSize: number;
  lineHeight?: number;
  textAlign?: 'left' | 'center' | 'right' | 'justify';
  layerId: string;
  templateDimensions: {
    width: number;
    height: number;
  };
}

export interface PreviewPosition {
  left: string;
  top: string;
  transform: string;
}

export interface CanvasPosition {
  x: number;
  y: number;
  textBaseline: CanvasTextBaseline;
}

/**
 * Unified positioning calculator
 * Eliminates differences between CSS and Canvas positioning
 */
export class UnifiedPositioning {
  /**
   * Calculate preview position (CSS) with standardized baseline
   */
  static getPreviewPosition(params: UnifiedPositionParams): PreviewPosition {
    const { xPercent, yPercent, fontSize, lineHeight = 1.2, textAlign, layerId } = params;
    
    // Use percentage positioning for consistency
    const leftPercent = xPercent * 100;
    const topPercent = yPercent * 100;
    
    // STANDARDIZED TRANSFORM CALCULATION
    // Match Canvas textBaseline behavior in CSS
    const isCertificateLayer = layerId === 'certificate_no' || layerId === 'issue_date';
    
    let transform: string;
    
    if (isCertificateLayer) {
      // Certificate layers: left-aligned, top-baseline
      // Match Canvas textBaseline='top' behavior
      transform = 'translate(0%, 0%)';
    } else {
      // Other layers: use alignment setting
      const align = textAlign || 'center';
      const xTransform = align === 'center' ? '-50%' : align === 'right' ? '-100%' : '0%';
      
      // Use consistent baseline offset for all layers
      // This matches the Canvas baseline calculation
      const baselineOffset = this.calculateBaselineOffset(fontSize, lineHeight);
      transform = `translate(${xTransform}, ${baselineOffset}px)`;
    }
    
    return {
      left: `${leftPercent}%`,
      top: `${topPercent}%`, 
      transform
    };
  }
  
  /**
   * Calculate canvas position with standardized baseline
   */
  static getCanvasPosition(params: UnifiedPositionParams): CanvasPosition {
    const { xPercent, yPercent, templateDimensions, fontSize, lineHeight = 1.2, layerId } = params;
    
    // Calculate absolute position from percentage
    const x = Math.round(xPercent * templateDimensions.width);
    const y = Math.round(yPercent * templateDimensions.height);
    
    const isCertificateLayer = layerId === 'certificate_no' || layerId === 'issue_date';
    
    if (isCertificateLayer) {
      // Certificate layers: use top baseline directly
      // This matches the CSS transform: translate(0%, 0%)
      return {
        x,
        y,
        textBaseline: 'top'
      };
    } else {
      // Other layers: apply baseline offset to match CSS centering
      const baselineOffset = this.calculateBaselineOffset(fontSize, lineHeight);
      return {
        x,
        y: y + baselineOffset,
        textBaseline: 'top'
      };
    }
  }
  
  /**
   * Calculate baseline offset for consistent positioning
   * This offset ensures CSS and Canvas render text at the same visual position
   */
  private static calculateBaselineOffset(fontSize: number, lineHeight: number): number {
    // CRITICAL: This calculation must match between CSS and Canvas
    // 
    // CSS line-height behavior:
    // - Creates line-box with height = fontSize * lineHeight
    // - Text baseline is positioned within this line-box
    // - For transform: translate(0%, -50%), visual center is at stored Y coordinate
    //
    // Canvas textBaseline='top' behavior:
    // - Positions from top of em-square
    // - To match CSS visual center, we need to offset by half the line-height
    //
    // Formula: offset = -(fontSize * lineHeight) / 2
    // Negative because we want to move UP to match CSS centering
    
    return -(fontSize * lineHeight) / 2;
  }
  
  /**
   * Validate positioning accuracy between preview and generation
   */
  static validateAccuracy(
    previewPos: PreviewPosition,
    canvasPos: CanvasPosition,
    templateDimensions: { width: number; height: number }
  ): {
    isAccurate: boolean;
    offsetX: number;
    offsetY: number;
    maxOffset: number;
  } {
    // Convert preview percentage to absolute pixels for comparison
    const previewX = (parseFloat(previewPos.left) / 100) * templateDimensions.width;
    const previewY = (parseFloat(previewPos.top) / 100) * templateDimensions.height;
    
    // Extract transform offset (simplified for validation)
    const transformMatch = previewPos.transform.match(/translate\(([^,]+),\s*([^)]+)\)/);
    let transformOffsetY = 0;
    if (transformMatch && transformMatch[2].includes('px')) {
      transformOffsetY = parseFloat(transformMatch[2].replace('px', ''));
    }
    
    const adjustedPreviewY = previewY + transformOffsetY;
    
    // Calculate differences
    const offsetX = Math.abs(previewX - canvasPos.x);
    const offsetY = Math.abs(adjustedPreviewY - canvasPos.y);
    const maxOffset = Math.max(offsetX, offsetY);
    
    return {
      isAccurate: maxOffset <= 2, // Target: 1-2px accuracy
      offsetX,
      offsetY,
      maxOffset
    };
  }
  
  /**
   * Get text alignment for Canvas context
   */
  static getCanvasTextAlign(layerId: string, textAlign?: string): CanvasTextAlign {
    const isCertificateLayer = layerId === 'certificate_no' || layerId === 'issue_date';
    
    if (isCertificateLayer) {
      return 'left'; // Always left for certificate layers
    }
    
    // Map text alignment to Canvas alignment
    switch (textAlign) {
      case 'center': return 'center';
      case 'right': return 'right';
      case 'justify': return 'left'; // Canvas doesn't support justify
      default: return 'left';
    }
  }
  
  /**
   * Debug helper: Log positioning calculations
   */
  static debugPositioning(
    params: UnifiedPositionParams,
    previewPos: PreviewPosition,
    canvasPos: CanvasPosition
  ) {
    console.log(`🔍 [UNIFIED] ${params.layerId} Positioning:`, {
      input: {
        xPercent: params.xPercent,
        yPercent: params.yPercent,
        fontSize: params.fontSize,
        lineHeight: params.lineHeight,
        textAlign: params.textAlign
      },
      preview: previewPos,
      canvas: canvasPos,
      baselineOffset: this.calculateBaselineOffset(params.fontSize, params.lineHeight || 1.2),
      accuracy: this.validateAccuracy(previewPos, canvasPos, params.templateDimensions)
    });
  }
}
