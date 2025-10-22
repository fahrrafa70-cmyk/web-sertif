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

export interface TemplateDefaults {
  templateId: string;
  templateName: string;
  textLayers: TextLayerDefault[];
  overlayImages?: OverlayImageDefault[]; // Optional for backward compatibility
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
