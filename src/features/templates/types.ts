/**
 * Template feature – domain types
 *
 * Extracted from lib/supabase/templates.ts so that types can be imported
 * independently from database query / upload logic.
 */
import type { TemplateLayoutConfig } from "@/types/template-layout";

export interface Template {
  id: string;
  name: string;
  category: string;
  orientation: string;
  created_at: string;
  tenant_id?: string | null;
  image_path?: string; // Legacy single-template image path
  preview_image_path?: string; // Optional preview (thumbnail) image
  // Thumbnail paths for optimised loading
  thumbnail_path?: string;
  preview_thumbnail_path?: string;
  certificate_thumbnail_path?: string;
  score_thumbnail_path?: string;
  // Dual template support
  certificate_image_url?: string; // URL for certificate image (front)
  score_image_url?: string; // URL for score image (back)
  is_dual_template?: boolean;
  // Layout configuration
  layout_config?: TemplateLayoutConfig | null;
  layout_config_updated_at?: string | null;
  layout_config_updated_by?: string | null;
  is_layout_configured?: boolean;
  status?: string; // "ready" | "draft"
  use_check_number?: boolean; // Whether template uses sequential /cek/ numbers
}

export interface CreateTemplateData {
  name: string;
  category: string;
  orientation: string;
  tenant_id?: string;
  image_file?: File;
  preview_image_file?: File;
  // Dual template support
  certificate_image_file?: File;
  score_image_file?: File;
  is_dual_template?: boolean;
}

export interface UpdateTemplateData {
  name?: string;
  category?: string;
  orientation?: string;
  image_file?: File;
  preview_image_file?: File;
  // Dual template support
  certificate_image_file?: File;
  score_image_file?: File;
  is_dual_template?: boolean;
  status?: string; // "ready" | "draft"
}
