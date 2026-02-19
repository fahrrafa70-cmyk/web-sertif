/**
 * @deprecated Barrel re-export — import directly from feature modules:
 *   - Types:     @/features/templates/types
 *   - Queries:   @/features/templates/queries
 *   - Mutations: @/features/templates/mutations
 *   - Service:   @/features/templates/service
 *
 * This file exists only to preserve backwards compatibility.
 */

// Types
export type { Template, CreateTemplateData, UpdateTemplateData } from "@/features/templates/types";

// Queries
export {
  getTemplates,
  getTemplatesForTenant,
  getTemplate,
  getTemplateLayout,
  isTemplateReadyForQuickGenerate,
} from "@/features/templates/queries";

// Mutations
export {
  createTemplate,
  updateTemplate,
  deleteTemplate,
} from "@/features/templates/mutations";

// Service (URL helpers + layout management)
export {
  uploadTemplateImage,
  uploadOriginalImage,
  getTemplateImageUrl,
  getTemplateImageUrlStatic,
  getTemplatePreviewUrl,
  saveTemplateLayout,
  clearTemplateLayout,
} from "@/features/templates/service";

// Connection test (kept inline — rarely used)
export async function testSupabaseConnection(): Promise<boolean> {
  try {
    const { supabaseClient } = await import("./client");
    const { error } = await supabaseClient.from("templates").select("id").limit(1);
    return !error;
  } catch {
    return false;
  }
}
