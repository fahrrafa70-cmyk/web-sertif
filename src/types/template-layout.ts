/**
 * Template Layout Configuration Types
 * Defines the structure for storing complete layout configuration in database
 */

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
}

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
  overlayImages?: OverlayImageConfig[];
}

export interface ScoreModeConfig {
  textLayers: TextLayerConfig[];
  overlayImages?: OverlayImageConfig[];
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
