import { supabaseClient } from "@/lib/supabase/client";
import type { Template, CreateTemplateData, UpdateTemplateData } from "./types";
import { uploadTemplateImage } from "./service";

// ─── Create ───────────────────────────────────────────────────────────────────

export async function createTemplate(
  templateData: CreateTemplateData,
): Promise<Template> {
  let imagePath: string | undefined;
  let previewImagePath: string | undefined;
  let certificateImagePath: string | undefined;
  let scoreImagePath: string | undefined;

  if (templateData.is_dual_template) {
    if (templateData.certificate_image_file) {
      certificateImagePath = await uploadTemplateImage(templateData.certificate_image_file);
    }
    if (templateData.score_image_file) {
      scoreImagePath = await uploadTemplateImage(templateData.score_image_file);
    }
  } else {
    if (templateData.image_file) {
      imagePath = await uploadTemplateImage(templateData.image_file);
    }
  }
  if (templateData.preview_image_file) {
    previewImagePath = await uploadTemplateImage(templateData.preview_image_file);
  }

  const insertData: Record<string, unknown> = {
    name: templateData.name,
    category: templateData.category,
    orientation: templateData.orientation,
    tenant_id: templateData.tenant_id || null,
    is_dual_template: templateData.is_dual_template || false,
    status: "draft",
  };
  if (imagePath) insertData.image_path = imagePath;
  if (previewImagePath) insertData.preview_image_path = previewImagePath;
  if (certificateImagePath) insertData.certificate_image_url = certificateImagePath;
  if (scoreImagePath) insertData.score_image_url = scoreImagePath;

  const { data, error } = await supabaseClient
    .from("templates")
    .insert([insertData])
    .select("*")
    .single();
  if (error) throw new Error(`Failed to create template: ${error.message}`);
  return data as Template;
}

// ─── Update ───────────────────────────────────────────────────────────────────

export async function updateTemplate(
  id: string,
  templateData: UpdateTemplateData,
): Promise<Template> {
  const updateData: Record<string, unknown> = {};

  if (templateData.name !== undefined) updateData.name = templateData.name;
  if (templateData.category !== undefined) updateData.category = templateData.category;
  if (templateData.orientation !== undefined) updateData.orientation = templateData.orientation;
  if (templateData.is_dual_template !== undefined) updateData.is_dual_template = templateData.is_dual_template;
  if (templateData.status !== undefined) updateData.status = templateData.status;

  if (templateData.image_file) {
    updateData.image_path = await uploadTemplateImage(templateData.image_file);
  }
  if (templateData.preview_image_file) {
    updateData.preview_image_path = await uploadTemplateImage(templateData.preview_image_file);
  }
  if (templateData.certificate_image_file) {
    updateData.certificate_image_url = await uploadTemplateImage(templateData.certificate_image_file);
  }
  if (templateData.score_image_file) {
    updateData.score_image_url = await uploadTemplateImage(templateData.score_image_file);
  }

  updateData.updated_at = new Date().toISOString();

  const { data, error } = await supabaseClient
    .from("templates")
    .update(updateData)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw new Error(`Failed to update template: ${error.message}`);
  return data as Template;
}

// ─── Delete ───────────────────────────────────────────────────────────────────

export async function deleteTemplate(id: string): Promise<void> {
  const { data: template, error: fetchError } = await supabaseClient
    .from("templates")
    .select("*")
    .eq("id", id)
    .single();
  if (fetchError) throw new Error(`Failed to fetch template: ${fetchError.message}`);

  // Delete associated storage files
  const filesToDelete: string[] = [];
  const t = template as Template;
  const extractPath = (url: string | null | undefined) => {
    if (!url) return null;
    const match = url.match(/templates\/([^?]+)/);
    return match?.[1] ?? null;
  };
  [t.image_path, t.preview_image_path, t.certificate_image_url, t.score_image_url]
    .map(extractPath)
    .filter(Boolean)
    .forEach((p) => filesToDelete.push(p!));

  if (filesToDelete.length > 0) {
    await supabaseClient.storage.from("templates").remove(filesToDelete);
  }

  const { error } = await supabaseClient.from("templates").delete().eq("id", id);
  if (error) throw new Error(`Failed to delete template: ${error.message}`);
}
