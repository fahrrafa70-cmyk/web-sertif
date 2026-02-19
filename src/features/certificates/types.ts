/**
 * Certificate feature – domain types
 *
 * Extracted from lib/supabase/certificates.ts so that types can be imported
 * independently from database query logic.
 */

export interface TextLayer {
  id: string;
  text: string;
  x: number;
  y: number;
  xPercent: number; // Normalized X position (0-1)
  yPercent: number; // Normalized Y position (0-1)
  fontSize: number;
  color: string;
  fontWeight: string;
  fontFamily: string;
  textAlign?: "left" | "center" | "right" | "justify";
  maxWidth?: number;
  lineHeight?: number;
  isEditing?: boolean;
}

export interface Certificate {
  id: string;
  certificate_no: string;
  name: string;
  description: string | null;
  issue_date: string;
  expired_date: string | null;
  category: string | null;
  template_id: string | null;
  member_id: string | null;
  tenant_id?: string | null;
  certificate_image_url: string | null; // PNG master (high quality)
  certificate_thumbnail_url?: string | null; // WebP preview (web optimized)
  score_image_url: string | null; // PNG score master (dual templates)
  score_thumbnail_url?: string | null; // WebP score preview (dual templates)
  text_layers: TextLayer[];
  created_at: string;
  updated_at: string;
  created_by: string | null;
  public_id: string;
  xid?: string | null; // Short XID for compact URLs (/c/{xid})
  check_number?: string | null; // Custom sequential number for /cek/ URLs (e.g., 001, 002)
  is_public: boolean;
  // Optional joined relations
  members?: {
    id?: string;
    name?: string;
    email?: string;
    organization?: string;
    phone?: string | null;
    job?: string | null;
    city?: string | null;
  } | null;
  templates?: {
    id?: string;
    name?: string;
    category?: string | null;
    orientation?: string | null;
  } | null;
}

export interface CreateCertificateData {
  certificate_no?: string; // Optional – auto-generated if not provided
  check_number?: string;   // Optional – auto-generated for templates using custom numbering
  name: string;
  description?: string;
  issue_date: string;
  expired_date?: string;
  category?: string;
  template_id?: string;
  member_id?: string;
  tenant_id?: string;
  certificate_image_url?: string; // PNG master
  certificate_thumbnail_url?: string; // WebP preview
  score_image_url?: string; // PNG score master (dual templates)
  score_thumbnail_url?: string; // WebP score preview (dual templates)
  text_layers?: TextLayer[];
  merged_image?: string; // Support for merged image (data URL)
}

export interface UpdateCertificateData {
  certificate_no?: string;
  check_number?: string;
  name?: string;
  description?: string;
  issue_date?: string;
  expired_date?: string;
  category?: string;
  template_id?: string;
  member_id?: string;
  certificate_image_url?: string;
  certificate_thumbnail_url?: string;
  score_image_url?: string; // For dual templates
  score_thumbnail_url?: string;
  text_layers?: TextLayer[];
}

export interface SearchFilters {
  keyword?: string;
  category?: string;
  startDate?: string;
  endDate?: string;
  tenant_id?: string;
}

// PUBLIC search – for unauthenticated users searching across all tenants (no tenant_id)
export interface PublicSearchFilters {
  keyword?: string;
  category?: string;
  startDate?: string;
  endDate?: string;
}
