export async function loadFontsForTextLayers(
  textLayers: { fontFamily?: string; fontWeight?: string; fontSize?: number }[]
): Promise<void> {
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
}
