/**
 * Template Layout Configuration Types
 * Defines the structure for storing complete layout configuration in database
 */

import { RichText } from './rich-text';

export interface TextLayerConfig {
  id: string; // e.g., "name", "certificate_no", "issue_date"
  x: number;
  y: number;
  xPercent: number;
  yPercent: number;
  fontSize: number;
  color: string;
  fontWeight: string;
  fontFamily: string;
  textAlign?: 'left' | 'center' | 'right' | 'justify';
  defaultText?: string; // Default text to use in generation (optional)
  useDefaultText?: boolean; // Whether to use defaultText instead of dynamic data
  maxWidth?: number; // Maximum width for text wrapping (in pixels)
  lineHeight?: number; // Line height multiplier (default 1.2)
  // Rich text support (inline formatting)
  richText?: RichText; // Array of text spans with individual styles
  hasInlineFormatting?: boolean; // Whether this layer uses rich text formatting
}

/**
 * Photo/Image Layer Configuration
 * Professional layer system like Canva/Picsart
 * All positions and sizes use PERCENTAGE for resolution independence
 */
export interface PhotoLayerConfig {
  id: string;
  type: 'photo' | 'logo' | 'signature' | 'decoration';
  
  // Source
  src: string; // Supabase Storage URL
  
  // Position (percentage-based 0-1)
  x: number; // Absolute pixel (fallback)
  y: number;
  xPercent: number; // Primary: 0-1 (percentage of canvas width)
  yPercent: number; // Primary: 0-1 (percentage of canvas height)
  
  // Size (percentage-based 0-1)
  width: number; // Absolute pixel (fallback)
  height: number;
  widthPercent: number; // Primary: 0-1 (percentage of canvas width)
  heightPercent: number; // Primary: 0-1 (percentage of canvas height)
  
  // Layer order
  zIndex: number; // Higher = on top (text layers typically 100+)
  
  // Fit mode (how image fits in bounding box)
  fitMode: 'contain' | 'cover' | 'fill' | 'none';
  // - contain: fit inside, maintain aspect (letterbox/pillarbox)
  // - cover: fill box, maintain aspect (crop edges)
  // - fill: stretch to fill (may distort)
  // - none: original size
  
  // Crop (region of source image to display, 0-1)
  crop?: {
    x: number; // Left offset (0-1)
    y: number; // Top offset (0-1)
    width: number; // Width (0-1)
    height: number; // Height (0-1)
  };
  
  // Mask (shape to clip image)
  mask?: {
    type: 'none' | 'circle' | 'ellipse' | 'roundedRect' | 'polygon';
    borderRadius?: number; // For roundedRect (pixels)
    points?: { x: number; y: number }[]; // For polygon (percentage)
  };
  
  // Visual effects
  opacity: number; // 0-1
  rotation: number; // Degrees (-180 to +180)
  
  // Aspect ratio lock (for resize)
  maintainAspectRatio: boolean;
  
  // Original dimensions (for reference)
  originalWidth?: number;
  originalHeight?: number;
  
  // Storage path (for deletion)
  storagePath?: string; // Supabase Storage path
}

/**
 * Legacy support - will be migrated to PhotoLayerConfig
 * @deprecated Use PhotoLayerConfig instead
 */
export interface OverlayImageConfig {
  id: string;
  url: string;
  x: number;
  y: number;
  width: number;
  height: number;
  aspectRatio: number;
}

export interface ScoreFontSettings {
  fontSize: number;
  fontFamily: string;
  color: string;
  fontWeight: 'normal' | 'bold';
  nilai: FontSetting;
  aspekTeknis: FontSetting;
  additionalInfo: FontSetting;
  date: FontSetting;
  issueDate: FontSetting;
}

export interface FontSetting {
  fontSize: number;
  fontFamily: string;
  color: string;
  fontWeight: 'normal' | 'bold';
}

export interface CertificateModeConfig {
  textLayers: TextLayerConfig[];
  photoLayers?: PhotoLayerConfig[]; // New: Professional photo layer system
  overlayImages?: OverlayImageConfig[]; // Legacy support
}

export interface ScoreModeConfig {
  textLayers: TextLayerConfig[];
  photoLayers?: PhotoLayerConfig[]; // New: Professional photo layer system
  overlayImages?: OverlayImageConfig[]; // Legacy support
  fontSettings?: ScoreFontSettings;
}

export interface CanvasConfig {
  width: number;
  height: number;
}

/**
 * Complete template layout configuration
 * This is stored in templates.layout_config JSONB field
 */
export interface TemplateLayoutConfig {
  // Certificate mode layout (required)
  certificate?: CertificateModeConfig;
  
  // Score mode layout (optional, for dual templates)
  score?: ScoreModeConfig;
  
  // Canvas configuration
  canvas: CanvasConfig;
  
  // Metadata
  version: string; // e.g., "1.0"
  lastSavedAt: string; // ISO timestamp
}

/**
 * Validation result for layout configuration
 */
export interface LayoutValidationResult {
  isValid: boolean;
  missingFields: string[];
  errors: string[];
}

/**
 * Required text layer IDs for certificate mode
 */
export const REQUIRED_CERTIFICATE_FIELDS = [
  'name',
  'certificate_no',
  'issue_date'
] as const;

/**
 * Optional text layer IDs for certificate mode
 */
export const OPTIONAL_CERTIFICATE_FIELDS = [
  'description',
  'expired_date',
  'category'
] as const;
