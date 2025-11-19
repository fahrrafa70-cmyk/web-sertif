/**
 * Percentage-Based Positioning Utility Functions
 * 
 * Provides conversion functions between pixel-based and percentage-based positioning
 * for consistent rendering across different screen sizes and devices.
 * 
 * Key Concepts:
 * - All positions stored as percentages (0-100) relative to template dimensions
 * - Template dimensions are the single source of truth (e.g., 1920x1080)
 * - Display dimensions scale based on container size
 * - Font size is percentage of template height for proportional scaling
 */

export interface TemplateDimensions {
  width: number;  // Template width in pixels (e.g., 1920)
  height: number; // Template height in pixels (e.g., 1080)
}

export interface DisplayDimensions {
  width: number;  // Display width in pixels (responsive)
  height: number; // Display height in pixels (responsive)
  scale: number;  // Scale factor (displayWidth / templateWidth)
}

export interface PercentagePosition {
  xPercent: number;        // 0-100
  yPercent: number;        // 0-100
  fontSizePercent: number; // 0-100 (percentage of template height)
}

export interface PixelPosition {
  x: number;        // Absolute pixel position
  y: number;        // Absolute pixel position
  fontSize: number; // Absolute pixel font size
}

/**
 * Convert percentage-based position to absolute pixel position
 * Used for rendering on canvas or generating certificates
 * 
 * @param percentPos - Position in percentages (0-100)
 * @param templateDims - Template dimensions (single source of truth)
 * @returns Absolute pixel position
 */
export function percentToPixel(
  percentPos: PercentagePosition,
  templateDims: TemplateDimensions
): PixelPosition {
  return {
    x: (percentPos.xPercent / 100) * templateDims.width,
    y: (percentPos.yPercent / 100) * templateDims.height,
    fontSize: (percentPos.fontSizePercent / 100) * templateDims.height
  };
}

/**
 * Convert absolute pixel position to percentage-based position
 * Used when saving layer positions to database
 * 
 * @param pixelPos - Absolute pixel position
 * @param templateDims - Template dimensions (single source of truth)
 * @returns Position in percentages (0-100)
 */
export function pixelToPercent(
  pixelPos: PixelPosition,
  templateDims: TemplateDimensions
): PercentagePosition {
  return {
    xPercent: (pixelPos.x / templateDims.width) * 100,
    yPercent: (pixelPos.y / templateDims.height) * 100,
    fontSizePercent: (pixelPos.fontSize / templateDims.height) * 100
  };
}

/**
 * Get display dimensions based on container size
 * Maintains aspect ratio of template
 * 
 * @param containerWidth - Width of container element
 * @param templateDims - Template dimensions
 * @returns Display dimensions with scale factor
 */
export function getDisplayDimensions(
  containerWidth: number,
  templateDims: TemplateDimensions
): DisplayDimensions {
  const aspectRatio = templateDims.height / templateDims.width;
  const displayHeight = containerWidth * aspectRatio;
  const scale = containerWidth / templateDims.width;
  
  return {
    width: containerWidth,
    height: displayHeight,
    scale
  };
}

/**
 * Convert percentage position to screen position for display
 * Used for rendering preview on screen
 * 
 * @param percentPos - Position in percentages (0-100)
 * @param displayDims - Display dimensions (responsive)
 * @returns Screen position in pixels
 */
export function percentToScreen(
  percentPos: PercentagePosition,
  displayDims: DisplayDimensions
): PixelPosition {
  return {
    x: (percentPos.xPercent / 100) * displayDims.width,
    y: (percentPos.yPercent / 100) * displayDims.height,
    fontSize: (percentPos.fontSizePercent / 100) * displayDims.height
  };
}

/**
 * Convert screen position to percentage position
 * Used when dragging layers on screen
 * 
 * @param screenPos - Screen position in pixels
 * @param displayDims - Display dimensions (responsive)
 * @returns Position in percentages (0-100)
 */
export function screenToPercent(
  screenPos: PixelPosition,
  displayDims: DisplayDimensions
): PercentagePosition {
  return {
    xPercent: (screenPos.x / displayDims.width) * 100,
    yPercent: (screenPos.y / displayDims.height) * 100,
    fontSizePercent: (screenPos.fontSize / displayDims.height) * 100
  };
}

/**
 * Clamp percentage value to valid range (0-100)
 * 
 * @param percent - Percentage value
 * @returns Clamped value between 0 and 100
 */
export function clampPercent(percent: number): number {
  return Math.max(0, Math.min(100, percent));
}

/**
 * Validate percentage position
 * 
 * @param percentPos - Position to validate
 * @returns True if all values are within valid range
 */
export function isValidPercentPosition(percentPos: PercentagePosition): boolean {
  return (
    percentPos.xPercent >= 0 && percentPos.xPercent <= 100 &&
    percentPos.yPercent >= 0 && percentPos.yPercent <= 100 &&
    percentPos.fontSizePercent >= 0 && percentPos.fontSizePercent <= 100
  );
}

/**
 * Get actual position for rendering (template coordinates)
 * This is the main function used by rendering engine
 * 
 * @param layer - Text layer with percentage-based position
 * @param templateDims - Template dimensions
 * @returns Actual position in template coordinates
 */
export function getActualPosition(
  layer: { xPercent: number; yPercent: number; fontSizePercent: number },
  templateDims: TemplateDimensions
): PixelPosition {
  return percentToPixel(
    {
      xPercent: layer.xPercent,
      yPercent: layer.yPercent,
      fontSizePercent: layer.fontSizePercent
    },
    templateDims
  );
}

/**
 * Migrate legacy pixel-based layer to percentage-based
 * Used for backward compatibility
 * 
 * @param layer - Legacy layer with pixel positions
 * @param templateDims - Template dimensions
 * @returns Layer with percentage positions
 */
export function migrateLegacyLayer(
  layer: { x: number; y: number; fontSize: number },
  templateDims: TemplateDimensions
): PercentagePosition {
  return pixelToPercent(
    {
      x: layer.x,
      y: layer.y,
      fontSize: layer.fontSize
    },
    templateDims
  );
}
