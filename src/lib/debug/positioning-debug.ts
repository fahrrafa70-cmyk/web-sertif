/**
 * Debug utility untuk compare positioning antara preview dan generation
 * Membantu identify root cause certificate number positioning issues
 */

export interface PositioningDebugData {
  layerId: string;
  context: 'preview' | 'generation';
  coordinates: {
    x: number;
    y: number;
    xPercent: number;
    yPercent: number;
  };
  styling: {
    fontSize: number;
    fontFamily: string;
    fontWeight: string;
    textAlign: string | undefined;
    transform?: string;
    textBaseline?: string;
  };
  dimensions: {
    templateWidth: number;
    templateHeight: number;
  };
  calculated: {
    visualX: number;
    visualY: number;
    baselineOffset?: number;
  };
}

export class PositioningDebugger {
  private static debugLog: PositioningDebugData[] = [];

  /**
   * Log positioning data untuk layer tertentu
   */
  static logLayerPositioning(
    layerId: string,
    context: 'preview' | 'generation',
    data: Omit<PositioningDebugData, 'layerId' | 'context'>
  ) {
    const debugEntry: PositioningDebugData = {
      layerId,
      context,
      ...data
    };

    this.debugLog.push(debugEntry);

    // Log khusus untuk certificate_no dan issue_date
    if (layerId === 'certificate_no' || layerId === 'issue_date') {
      console.log(`🔍 [${context.toUpperCase()}] ${layerId} Positioning:`, {
        coordinates: debugEntry.coordinates,
        styling: debugEntry.styling,
        calculated: debugEntry.calculated,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Compare positioning antara preview dan generation untuk layer tertentu
   */
  static comparePositioning(layerId: string): {
    preview?: PositioningDebugData;
    generation?: PositioningDebugData;
    differences: {
      x: number;
      y: number;
      visualX: number;
      visualY: number;
    };
    accuracy: {
      isAccurate: boolean;
      maxOffset: number;
      recommendation: string;
    };
  } {
    const preview = this.debugLog.find(log => log.layerId === layerId && log.context === 'preview');
    const generation = this.debugLog.find(log => log.layerId === layerId && log.context === 'generation');

    if (!preview || !generation) {
      return {
        preview,
        generation,
        differences: { x: 0, y: 0, visualX: 0, visualY: 0 },
        accuracy: {
          isAccurate: false,
          maxOffset: 0,
          recommendation: 'Missing data - ensure both preview and generation are logged'
        }
      };
    }

    const differences = {
      x: Math.abs(preview.calculated.visualX - generation.calculated.visualX),
      y: Math.abs(preview.calculated.visualY - generation.calculated.visualY),
      visualX: preview.calculated.visualX - generation.calculated.visualX,
      visualY: preview.calculated.visualY - generation.calculated.visualY
    };

    const maxOffset = Math.max(differences.x, differences.y);
    const isAccurate = maxOffset <= 2; // Target: 1-2px accuracy

    const result = {
      preview,
      generation,
      differences,
      accuracy: {
        isAccurate,
        maxOffset,
        recommendation: this.getRecommendation(maxOffset, differences)
      }
    };

    // Log comparison hasil
    console.log(`📊 [COMPARISON] ${layerId} Positioning Accuracy:`, {
      maxOffset: `${maxOffset.toFixed(2)}px`,
      isAccurate: isAccurate ? '✅ ACCURATE' : '❌ NEEDS FIX',
      differences: {
        x: `${differences.visualX > 0 ? '+' : ''}${differences.visualX.toFixed(2)}px`,
        y: `${differences.visualY > 0 ? '+' : ''}${differences.visualY.toFixed(2)}px`
      },
      recommendation: result.accuracy.recommendation
    });

    return result;
  }

  /**
   * Generate recommendation berdasarkan positioning differences
   */
  private static getRecommendation(maxOffset: number, differences: any): string {
    if (maxOffset <= 1) {
      return 'Perfect accuracy! No changes needed.';
    } else if (maxOffset <= 2) {
      return 'Good accuracy. Minor tweaks may improve further.';
    } else if (maxOffset <= 5) {
      if (Math.abs(differences.visualY) > Math.abs(differences.visualX)) {
        return 'Y-axis offset detected. Check textBaseline or transform calculations.';
      } else {
        return 'X-axis offset detected. Check textAlign or positioning logic.';
      }
    } else {
      return 'Major positioning issue. Review coordinate system and baseline calculations.';
    }
  }

  /**
   * Clear debug log
   */
  static clearLog() {
    this.debugLog = [];
    console.log('🧹 Positioning debug log cleared');
  }

  /**
   * Export debug data untuk analysis
   */
  static exportDebugData() {
    return {
      logs: this.debugLog,
      summary: this.generateSummary(),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Generate summary dari semua positioning data
   */
  private static generateSummary() {
    const layerIds = [...new Set(this.debugLog.map(log => log.layerId))];
    
    return layerIds.map(layerId => {
      const comparison = this.comparePositioning(layerId);
      return {
        layerId,
        accuracy: comparison.accuracy,
        maxOffset: comparison.accuracy.maxOffset
      };
    });
  }

  /**
   * Utility untuk calculate visual position dari CSS transform
   */
  static calculateVisualPosition(
    x: number, 
    y: number, 
    transform: string, 
    elementWidth: number = 0
  ): { visualX: number; visualY: number } {
    let visualX = x;
    let visualY = y;

    // Parse transform: translate(X%, Y%)
    const transformMatch = transform.match(/translate\(([^,]+),\s*([^)]+)\)/);
    if (transformMatch) {
      const [, xTransform, yTransform] = transformMatch;
      
      // Handle percentage transforms
      if (xTransform.includes('%')) {
        const xPercent = parseFloat(xTransform.replace('%', ''));
        visualX += (elementWidth * xPercent) / 100;
      }
      
      if (yTransform.includes('%')) {
        const yPercent = parseFloat(yTransform.replace('%', ''));
        // For Y transform, we need element height, but for -50% it's typically fontSize/2
        visualY += yPercent < 0 ? yPercent : 0; // Simplified for -50% case
      }
    }

    return { visualX, visualY };
  }
}

/**
 * Helper function untuk log positioning dari configure page
 */
export const logPreviewPositioning = (
  layerId: string,
  layer: any,
  templateDimensions: { width: number; height: number },
  transform: string
) => {
  const visualPosition = PositioningDebugger.calculateVisualPosition(
    layer.x,
    layer.y,
    transform,
    layer.maxWidth || 0
  );

  PositioningDebugger.logLayerPositioning(layerId, 'preview', {
    coordinates: {
      x: layer.x,
      y: layer.y,
      xPercent: layer.xPercent || 0,
      yPercent: layer.yPercent || 0
    },
    styling: {
      fontSize: layer.fontSize,
      fontFamily: layer.fontFamily,
      fontWeight: layer.fontWeight,
      textAlign: layer.textAlign,
      transform
    },
    dimensions: {
      templateWidth: templateDimensions.width,
      templateHeight: templateDimensions.height
    },
    calculated: {
      visualX: visualPosition.visualX,
      visualY: visualPosition.visualY
    }
  });
};

/**
 * Helper function untuk log positioning dari generation
 */
export const logGenerationPositioning = (
  layerId: string,
  layer: any,
  templateDimensions: { width: number; height: number },
  canvasContext: CanvasRenderingContext2D,
  calculatedX: number,
  calculatedY: number
) => {
  PositioningDebugger.logLayerPositioning(layerId, 'generation', {
    coordinates: {
      x: layer.x || 0,
      y: layer.y || 0,
      xPercent: layer.xPercent || 0,
      yPercent: layer.yPercent || 0
    },
    styling: {
      fontSize: layer.fontSize,
      fontFamily: layer.fontFamily,
      fontWeight: layer.fontWeight,
      textAlign: layer.textAlign,
      textBaseline: canvasContext.textBaseline
    },
    dimensions: {
      templateWidth: templateDimensions.width,
      templateHeight: templateDimensions.height
    },
    calculated: {
      visualX: calculatedX,
      visualY: calculatedY,
      baselineOffset: calculatedY - (layer.y || 0)
    }
  });
};
