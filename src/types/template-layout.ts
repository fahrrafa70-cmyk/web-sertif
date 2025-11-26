import { RichText } from './rich-text';

export interface TextLayerConfig {
  id: string; 
  x: number;
  y: number;
  xPercent: number;
  yPercent: number;
  fontSize: number;
  fontSizePercent?: number; 
  color: string;
  fontWeight: string;
  fontFamily: string;
  textAlign?: 'left' | 'center' | 'right' | 'justify';
  defaultText?: string; 
  useDefaultText?: boolean; 
  maxWidth?: number; 
  lineHeight?: number; 
  visible?: boolean; 
  richText?: RichText; 
  hasInlineFormatting?: boolean; 
  
  // Extended styling properties
  fontStyle?: 'normal' | 'italic' | 'oblique' | 'underline' | 'line-through' | 'overline'; 
  textDecoration?: 'none' | 'underline' | 'line-through' | 'overline'; 
  textShadow?: string;
  letterSpacing?: number; // Letter spacing in pixels (positive = lebih renggang, negative = lebih rapat)
  
  // UI state (not persisted to database)
  isDragging?: boolean; // Temporary state during drag operations
}
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
  
  zIndex: number; // Higher = on top (text layers typically 100+)
  fitMode: 'contain' | 'cover' | 'fill' | 'none';
  crop?: {
    x: number;
    y: number;
    width: number;
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
  
  storagePath?: string; // Supabase Storage path
}
export interface QRCodeLayerConfig {
  id: string;
  type: 'qr_code';
  
  // QR Code specific
  qrData: string; // Data to encode (URL, text, etc.) - use {{CERTIFICATE_URL}} as placeholder
  errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H'; // Error correction: L=7%, M=15%, Q=25%, H=30%
  
  // Position (percentage-based 0-1)
  x: number; // Absolute pixel (fallback)
  y: number;
  xPercent: number; // Primary: 0-1 (percentage of canvas width)
  yPercent: number; // Primary: 0-1 (percentage of canvas height)
  
  // Size (percentage-based 0-1)
  width: number; // Absolute pixel (fallback)
  height: number;
  widthPercent: number;
  heightPercent: number;
  
  // QR Code appearance
  foregroundColor?: string;
  backgroundColor?: string;
  
  // Layer order
  zIndex: number;
  
  // Visual effects
  opacity: number;
  rotation: number;
  
  // Aspect ratio lock (always true for QR codes)
  maintainAspectRatio: boolean;
  
  margin?: number;
  
  visible?: boolean;
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
  fontWeight: string;
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
  fontWeight: string;
}

export interface CertificateModeConfig {
  textLayers: TextLayerConfig[];
  photoLayers?: PhotoLayerConfig[]; // New: Professional photo layer system
  qrLayers?: QRCodeLayerConfig[]; // QR Code layers
  overlayImages?: OverlayImageConfig[]; // Legacy support
}

export interface ScoreModeConfig {
  textLayers: TextLayerConfig[];
  photoLayers?: PhotoLayerConfig[]; // New: Professional photo layer system
  qrLayers?: QRCodeLayerConfig[]; // QR Code layers
  overlayImages?: OverlayImageConfig[]; // Legacy support
  fontSettings?: ScoreFontSettings;
}

export interface CanvasConfig {
  width: number;
  height: number;
}
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

export interface LayoutValidationResult {
  isValid: boolean;
  missingFields: string[];
  errors: string[];
}

export const REQUIRED_CERTIFICATE_FIELDS = [
  'name',
  'certificate_no',
  'issue_date'
] as const;

export const REQUIRED_SCORE_FIELDS = REQUIRED_CERTIFICATE_FIELDS;

export const OPTIONAL_CERTIFICATE_FIELDS = [
  'description',
  'expired_date',
  'category'
] as const;
