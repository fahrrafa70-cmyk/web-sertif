import { supabaseClient } from "@/lib/supabase/client";
import type { Template } from "./types";
import type { TemplateLayoutConfig } from "@/types/template-layout";

// ─── Read queries ─────────────────────────────────────────────────────────────

export async function getTemplates(): Promise<Template[]> {
  const { data, error } = await supabaseClient
    .from("templates")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw new Error(`Failed to fetch templates: ${error.message}`);
  return (data as Template[]) || [];
}

export async function getTemplatesForTenant(tenantId: string): Promise<Template[]> {
  if (!tenantId) return [];
  const { data, error } = await supabaseClient
    .from("templates")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(`Failed to fetch templates for tenant: ${error.message}`);
  return (data as Template[]) || [];
}

export async function getTemplate(id: string): Promise<Template | null> {
  const { data, error } = await supabaseClient
    .from("templates")
    .select("*")
    .eq("id", id)
    .single();
  if (error) {
    if (error.code === "PGRST116") return null;
    throw new Error(`Failed to fetch template: ${error.message}`);
  }
  return data as Template;
}

export async function getTemplateLayout(
  templateId: string,
): Promise<TemplateLayoutConfig | null> {
  const { data, error } = await supabaseClient
    .from("templates")
    .select("layout_config")
    .eq("id", templateId)
    .single();
  if (error) throw new Error(`Failed to get layout: ${error.message}`);
  return data?.layout_config ?? null;
}

export async function isTemplateReadyForQuickGenerate(
  templateId: string,
): Promise<{ ready: boolean; message?: string }> {
  const template = await getTemplate(templateId);
  if (!template) return { ready: false, message: "Template not found" };
  if (!template.layout_config) return { ready: false, message: "Template has no layout configured" };
  if (!template.is_layout_configured) return { ready: false, message: "Layout is not fully configured" };
  return { ready: true };
}
