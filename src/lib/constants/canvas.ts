/**
 * Canvas and Layout Constants
 * Extracted from src/app/templates/generate/page.tsx
 * Date: October 29, 2025
 */

/**
 * Standard canvas dimensions for consistent positioning
 * Used as reference size for all text layer calculations
 * 
 * IMPORTANT: These should match your template's natural dimensions!
 * Current: A4 Portrait at 300 DPI (1500x2121 pixels)
 * - A4 = 210mm × 297mm
 * - At 300 DPI: (210/25.4)*300 × (297/25.4)*300 = 2480 × 3508 pixels
 * - Scaled down: 1500 × 2121 pixels (maintains aspect ratio)
 * 
 * For different templates, you may want to make this dynamic:
 * - Load template image first
 * - Get naturalWidth × naturalHeight
 * - Use those dimensions for canvas
 */
export const STANDARD_CANVAS_WIDTH = 1500;   // A4 portrait width at 300 DPI (scaled)
export const STANDARD_CANVAS_HEIGHT = 2121;  // A4 portrait height at 300 DPI (scaled)

/**
 * Score template layout configuration
 * All positions are in percentage (0-1) for responsive positioning
 * Calibrated from reference score template image
 */
export const SCORE_LAYOUT = {
  /** Title section positioning */
  title: {
    x: 0.5,      // Centered horizontally
    mainY: 0.15, // DAFTAR NILAI header
    subY: 0.20,  // MAGANG INDUSTRI subtitle
  },
  
  /** Left and right table sections */
  sections: {
    /** Left table: Aspek Non Teknis */
    left: {
      headerX: 0.15,   // I. ASPEK NON TEKNIS header X
      headerY: 0.25,   // Header Y position
      startX: 0.15,    // Table content start X
      valueX: 0.35,    // Score values column X
      startY: 0.30,    // First row Y position
      spacing: 0.045,  // Vertical spacing between rows
    },
    
    /** Right table: Aspek Teknis */
    right: {
      headerX: 0.55,   // II. ASPEK TEKNIS header X
      headerY: 0.25,   // Header Y position
      startX: 0.55,    // Table content start X (competency names)
      valueX: 0.85,    // Score values column X
      startY: 0.30,    // First row Y position
      spacing: 0.045,  // Vertical spacing between rows (matches left)
    },
  },
  
  /** Bottom section: Additional info and signatures */
  bottom: {
    /** Nilai Prestasi section */
    prestasi: {
      x: 0.5,  // Centered
      y: 0.65, // Nilai/Prestasi text position
    },
    
    /** Keterangan section */
    keterangan: {
      x: 0.5,  // Centered
      y: 0.70, // Keterangan text position
    },
    
    /** Date section */
    date: {
      x: 0.15, // Bottom left
      y: 0.80, // Date position
    },
    
    /** Signature section */
    signature: {
      x: 0.80, // Bottom right
      y: 0.80, // Signature position
    },
  },
} as const;

/**
 * Font size normalizer
 * Prevents UI inputs from breaking layout by enforcing min/max constraints
 * 
 * @param size - Font size value from user input
 * @param opts - Min/max constraints
 * @returns Normalized font size within safe range
 */
export function normalizeFontSize(
  size: number | undefined,
  opts?: { min?: number; max?: number }
): number {
  if (!size || Number.isNaN(size)) return opts?.min ?? 14;
  return Math.max(opts?.min ?? 12, Math.min(opts?.max ?? 24, Math.round(size)));
}

