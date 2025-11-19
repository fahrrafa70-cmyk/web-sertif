/**
 * Layer Migration Utilities
 * 
 * Provides functions to migrate existing text layers from pixel-based
 * to percentage-based positioning system.
 */

import { TextLayerConfig } from '@/types/template-layout';
import { migrateLegacyLayer, TemplateDimensions } from './percentage-positioning';

/**
 * Migrate a single text layer to percentage-based positioning
 * Ensures backward compatibility by preserving pixel values
 * 
 * @param layer - Existing text layer
 * @param templateDims - Template dimensions
 * @returns Migrated layer with both pixel and percentage values
 */
export function migrateTextLayer(
  layer: TextLayerConfig,
  templateDims: TemplateDimensions
): TextLayerConfig {
  // If layer already has percentage values, validate and return
  if (
    typeof layer.xPercent === 'number' &&
    typeof layer.yPercent === 'number' &&
    typeof layer.fontSizePercent === 'number'
  ) {
    return layer;
  }
  
  // Calculate percentage values from pixel values
  const percentages = migrateLegacyLayer(
    {
      x: layer.x,
      y: layer.y,
      fontSize: layer.fontSize
    },
    templateDims
  );
  
  // Return layer with both pixel and percentage values
  return {
    ...layer,
    xPercent: percentages.xPercent,
    yPercent: percentages.yPercent,
    fontSizePercent: percentages.fontSizePercent
  };
}

/**
 * Migrate array of text layers
 * 
 * @param layers - Array of existing text layers
 * @param templateDims - Template dimensions
 * @returns Array of migrated layers
 */
export function migrateTextLayers(
  layers: TextLayerConfig[],
  templateDims: TemplateDimensions
): TextLayerConfig[] {
  return layers.map(layer => migrateTextLayer(layer, templateDims));
}

/**
 * Validate migration accuracy
 * Compares pixel values before and after migration
 * 
 * @param originalLayer - Original layer with pixel values
 * @param migratedLayer - Migrated layer with percentage values
 * @param templateDims - Template dimensions
 * @param tolerance - Acceptable difference in pixels (default: 0.1)
 * @returns Validation result
 */
export function validateMigration(
  originalLayer: TextLayerConfig,
  migratedLayer: TextLayerConfig,
  templateDims: TemplateDimensions,
  tolerance: number = 0.1
): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Recalculate pixel values from percentages
  const recalculatedX = (migratedLayer.xPercent / 100) * templateDims.width;
  const recalculatedY = (migratedLayer.yPercent / 100) * templateDims.height;
  const recalculatedFontSize = (migratedLayer.fontSizePercent / 100) * templateDims.height;
  
  // Check X position
  const xDiff = Math.abs(originalLayer.x - recalculatedX);
  if (xDiff > tolerance) {
    errors.push(
      `X position mismatch: original=${originalLayer.x}, recalculated=${recalculatedX}, diff=${xDiff.toFixed(2)}px`
    );
  } else if (xDiff > 0.01) {
    warnings.push(
      `X position minor difference: ${xDiff.toFixed(2)}px (within tolerance)`
    );
  }
  
  // Check Y position
  const yDiff = Math.abs(originalLayer.y - recalculatedY);
  if (yDiff > tolerance) {
    errors.push(
      `Y position mismatch: original=${originalLayer.y}, recalculated=${recalculatedY}, diff=${yDiff.toFixed(2)}px`
    );
  } else if (yDiff > 0.01) {
    warnings.push(
      `Y position minor difference: ${yDiff.toFixed(2)}px (within tolerance)`
    );
  }
  
  // Check font size
  const fontSizeDiff = Math.abs(originalLayer.fontSize - recalculatedFontSize);
  if (fontSizeDiff > tolerance) {
    errors.push(
      `Font size mismatch: original=${originalLayer.fontSize}, recalculated=${recalculatedFontSize}, diff=${fontSizeDiff.toFixed(2)}px`
    );
  } else if (fontSizeDiff > 0.01) {
    warnings.push(
      `Font size minor difference: ${fontSizeDiff.toFixed(2)}px (within tolerance)`
    );
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Dry run migration test
 * Tests migration without modifying data
 * 
 * @param layers - Layers to test
 * @param templateDims - Template dimensions
 * @returns Test results
 */
export function dryRunMigration(
  layers: TextLayerConfig[],
  templateDims: TemplateDimensions
): {
  totalLayers: number;
  alreadyMigrated: number;
  needsMigration: number;
  validationResults: Array<{
    layerId: string;
    valid: boolean;
    errors: string[];
    warnings: string[];
  }>;
} {
  const results = {
    totalLayers: layers.length,
    alreadyMigrated: 0,
    needsMigration: 0,
    validationResults: [] as Array<{
      layerId: string;
      valid: boolean;
      errors: string[];
      warnings: string[];
    }>
  };
  
  layers.forEach(layer => {
    // Check if already migrated
    const hasPercentages = 
      typeof layer.xPercent === 'number' &&
      typeof layer.yPercent === 'number' &&
      typeof layer.fontSizePercent === 'number';
    
    if (hasPercentages) {
      results.alreadyMigrated++;
    } else {
      results.needsMigration++;
    }
    
    // Test migration
    const migratedLayer = migrateTextLayer(layer, templateDims);
    const validation = validateMigration(layer, migratedLayer, templateDims);
    
    results.validationResults.push({
      layerId: layer.id,
      valid: validation.valid,
      errors: validation.errors,
      warnings: validation.warnings
    });
  });
  
  return results;
}

/**
 * Log migration results to console
 * 
 * @param results - Dry run results
 */
export function logMigrationResults(
  results: ReturnType<typeof dryRunMigration>
): void {
  console.group('🔄 Layer Migration Dry Run Results');
  console.log(`Total layers: ${results.totalLayers}`);
  console.log(`Already migrated: ${results.alreadyMigrated}`);
  console.log(`Needs migration: ${results.needsMigration}`);
  console.log('');
  
  results.validationResults.forEach(result => {
    if (result.valid) {
      console.log(`✅ Layer ${result.layerId}: PASSED`);
      if (result.warnings.length > 0) {
        result.warnings.forEach(warning => console.warn(`  ⚠️ ${warning}`));
      }
    } else {
      console.error(`❌ Layer ${result.layerId}: FAILED`);
      result.errors.forEach(error => console.error(`  ❌ ${error}`));
    }
  });
  
  console.groupEnd();
}
