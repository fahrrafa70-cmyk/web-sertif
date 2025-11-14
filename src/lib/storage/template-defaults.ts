/**
 * Template Default Coordinates Storage
 * Menyimpan default koordinat untuk setiap template di localStorage
 */

export interface TextLayerDefault {
  id: string;
  x: number;
  y: number;
  xPercent: number;
  yPercent: number;
  fontSize: number;
  color: string;
  fontWeight: string;
  fontFamily: string;
  textAlign?: 'left' | 'center' | 'right' | 'justify';
  defaultText?: string;
  useDefaultText?: boolean;
  maxWidth?: number;
  lineHeight?: number;
  richText?: Array<{
    text: string;
    fontSize?: number;
    color?: string;
    fontWeight?: string;
    fontFamily?: string;
  }>;
  hasInlineFormatting?: boolean;
}

export interface OverlayImageDefault {
  id: string;
  url: string;
  x: number;
  y: number;
  width: number;
  height: number;
  aspectRatio: number;
}

export interface FontSetting {
  fontSize: number;
  fontFamily: string;
  color: string;
  fontWeight: 'normal' | 'bold';
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

// Default score font settings with requested values
export const DEFAULT_SCORE_FONT_SETTINGS: ScoreFontSettings = {
  // Default sizes per request: values 75, other text 50
  fontSize: 50,
  fontFamily: 'Arial',
  color: '#000000',
  fontWeight: 'normal',
  // Numeric grades (nilai) default to 70
  nilai: {
    fontSize: 70,
    fontFamily: 'Arial',
    color: '#000000',
    fontWeight: 'normal',
  },
  // Other table/text elements (titles, labels, headings, kompetensi, etc.) default to 50
  aspekTeknis: {
    fontSize: 50,
    fontFamily: 'Arial',
    color: '#000000',
    fontWeight: 'normal',
  },
  // Nilai/Prestasi text should also default to 50
  additionalInfo: {
    fontSize: 50,
    fontFamily: 'Arial',
    color: '#000000',
    fontWeight: 'normal',
  },
  issueDate: {
    fontSize: 50,
    fontFamily: 'Arial',
    color: '#000000',
    fontWeight: 'normal',
  },
  date: {
    fontSize: 50,
    fontFamily: 'Arial',
    color: '#000000',
    fontWeight: 'normal',
  },
};

export interface PhotoLayerDefault {
  id: string;
  type: 'photo' | 'logo' | 'signature' | 'decoration';
  src: string;
  x: number;
  y: number;
  xPercent: number;
  yPercent: number;
  width: number;
  height: number;
  widthPercent: number;
  heightPercent: number;
  zIndex: number;
  fitMode: 'contain' | 'cover' | 'fill' | 'none';
  crop?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  mask?: {
    type: 'none' | 'circle' | 'ellipse' | 'roundedRect' | 'polygon';
    borderRadius?: number;
    points?: { x: number; y: number }[];
  };
  opacity: number;
  rotation: number;
  maintainAspectRatio: boolean;
  originalWidth?: number;
  originalHeight?: number;
  storagePath?: string;
}

export interface TemplateDefaults {
  templateId: string;
  templateName: string;
  textLayers: TextLayerDefault[];
  overlayImages?: OverlayImageDefault[]; // Optional for backward compatibility
  photoLayers?: PhotoLayerDefault[]; // New: Photo layer system
  scoreFontSettings?: ScoreFontSettings; // Optional score font settings for score mode
  savedAt: string; // ISO timestamp
}

const STORAGE_KEY = "template_defaults";

/**
 * Get all saved template defaults
 */
export function getAllTemplateDefaults(): TemplateDefaults[] {
  if (typeof window === "undefined") return [];
  
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error("Error loading template defaults:", error);
    return [];
  }
}

/**
 * Get default coordinates for a specific template
 */
export function getTemplateDefaults(templateId: string): TemplateDefaults | null {
  const allDefaults = getAllTemplateDefaults();
  return allDefaults.find(d => d.templateId === templateId) || null;
}

/**
 * Save default coordinates for a template
 */
export function saveTemplateDefaults(defaults: TemplateDefaults): void {
  if (typeof window === "undefined") return;
  
  try {
    const allDefaults = getAllTemplateDefaults();
    
    // Remove existing defaults for this template
    const filtered = allDefaults.filter(d => d.templateId !== defaults.templateId);
    
    // Add new defaults
    filtered.push({
      ...defaults,
      savedAt: new Date().toISOString(),
    });
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error("Error saving template defaults:", error);
    throw error;
  }
}

/**
 * Delete default coordinates for a template
 */
export function deleteTemplateDefaults(templateId: string): void {
  if (typeof window === "undefined") return;
  
  try {
    const allDefaults = getAllTemplateDefaults();
    const filtered = allDefaults.filter(d => d.templateId !== templateId);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error("Error deleting template defaults:", error);
    throw error;
  }
}

/**
 * Check if template has saved defaults
 */
export function hasTemplateDefaults(templateId: string): boolean {
  return getTemplateDefaults(templateId) !== null;
}

/**
 * Clear all template defaults
 */
export function clearAllTemplateDefaults(): void {
  if (typeof window === "undefined") return;
  
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error("Error clearing template defaults:", error);
    throw error;
  }
}
