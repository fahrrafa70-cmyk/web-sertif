import { supabaseClient } from "@/lib/supabase/client";
import type { Template } from "./types";
import type { TemplateLayoutConfig } from "@/types/template-layout";

// ─── Image upload helpers ────────────────────────────────────────────────────

export async function uploadTemplateImage(file: File): Promise<string> {
  const timestamp = Date.now();
  const randomStr = Math.random().toString(36).substring(2, 8);
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const fileName = `template_${timestamp}_${randomStr}.${ext}`;

  const { error: uploadError } = await supabaseClient.storage
    .from("templates")
    .upload(fileName, file, { cacheControl: "3600", upsert: false });
  if (uploadError) throw new Error(`Failed to upload image: ${uploadError.message}`);

  const { data: urlData } = supabaseClient.storage
    .from("templates")
    .getPublicUrl(fileName);
  return urlData.publicUrl;
}

export async function uploadOriginalImage(
  file: File,
  fileName: string,
): Promise<{ originalUrl: string; thumbnailUrl: string }> {
  const { error: uploadError } = await supabaseClient.storage
    .from("templates")
    .upload(fileName, file, { cacheControl: "3600", upsert: true });
  if (uploadError) throw new Error(`Failed to upload image: ${uploadError.message}`);

  const { data: urlData } = supabaseClient.storage
    .from("templates")
    .getPublicUrl(fileName);
  return { originalUrl: urlData.publicUrl, thumbnailUrl: urlData.publicUrl };
}

// ─── URL helpers ──────────────────────────────────────────────────────────────

export function getTemplateImageUrl(template: Template): string | null {
  if (template.image_path) {
    const { data } = supabaseClient.storage
      .from("templates")
      .getPublicUrl(template.image_path);
    return data?.publicUrl ?? null;
  }
  return template.certificate_image_url ?? null;
}

export function getTemplateImageUrlStatic(template: Template): string | null {
  return getTemplateImageUrl(template);
}

export function getTemplatePreviewUrl(template: Template): string | null {
  if (template.preview_image_path) {
    const { data } = supabaseClient.storage
      .from("templates")
      .getPublicUrl(template.preview_image_path);
    return data?.publicUrl ?? null;
  }
  return getTemplateImageUrl(template);
}

// ─── Layout management ────────────────────────────────────────────────────────

export async function saveTemplateLayout(
  templateId: string,
  layoutConfig: TemplateLayoutConfig,
  userId?: string,
): Promise<void> {
  const updatePayload: Record<string, unknown> = {
    layout_config: layoutConfig,
    is_layout_configured: true,
    layout_config_updated_at: new Date().toISOString(),
  };
  if (userId) updatePayload.layout_config_updated_by = userId;

  const { error } = await supabaseClient
    .from("templates")
    .update(updatePayload)
    .eq("id", templateId);
  if (error) throw new Error(`Failed to save layout: ${error.message}`);
}

export async function clearTemplateLayout(templateId: string): Promise<void> {
  const { error } = await supabaseClient
    .from("templates")
    .update({ layout_config: null, is_layout_configured: false })
    .eq("id", templateId);
  if (error) throw new Error(`Failed to clear layout: ${error.message}`);
}
