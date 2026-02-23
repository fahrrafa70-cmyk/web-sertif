import { useState, useCallback } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { confirmToast } from "@/lib/ui/confirm";
import { getCertificatesByTemplate } from "@/lib/supabase/certificates";
import { getTemplatePreviewUrl, type Template } from "@/lib/supabase/templates";

export function useTemplatesActions(
  templates: Template[],
  canDelete: boolean,
  deleteTemplate: (id: string) => Promise<void>,
  t: (key: string) => string
) {
  const router = useRouter();
  
  const [previewTemplate, setPreviewTemplate] = useState<Template | null>(null);
  const [deletingTemplateId, setDeletingTemplateId] = useState<string | null>(null);
  const [configuringTemplateId, setConfiguringTemplateId] = useState<string | null>(null);
  const [templateUsageMap, setTemplateUsageMap] = useState<Map<string, number>>(new Map());

  const requestDelete = useCallback(async (id: string) => {
    if (!canDelete) { toast.error(t("templates.deleteNoPermission")); return; }
    const template = templates.find((t) => t.id === id);
    const templateName = template?.name || "this template";
    try {
      const certs = await getCertificatesByTemplate(id);
      if (certs && certs.length > 0) {
        toast.error(t("templates.cannotDeleteInUse").replace("{name}", templateName).replace("{count}", certs.length.toString()));
        return;
      }
    } catch {
      toast.warning(t("templates.cannotVerifyUsage"));
    }
    const ok = await confirmToast(
      t("templates.deleteConfirm").replace("{name}", templateName),
      { confirmText: t("common.delete"), tone: "destructive" }
    );
    if (ok) {
      try {
        setDeletingTemplateId(id);
        await deleteTemplate(id);
        toast.success(t("templates.deleteSuccess").replace("{name}", templateName));
      } catch (e) {
        toast.error(e instanceof Error ? e.message : t("templates.deleteFailed"));
      } finally {
        setDeletingTemplateId(null);
      }
    }
  }, [canDelete, templates, deleteTemplate, t]);

  const handleConfigureClick = useCallback((templateId: string) => {
    setConfiguringTemplateId(templateId);
    setTimeout(() => {
      try {
        router.push(`/templates/configure?template=${templateId}`);
      } catch {
        setConfiguringTemplateId(null);
      }
    }, 0);
  }, [router]);

  const handlePreviewClick = useCallback((template: Template) => {
    setPreviewTemplate(template);
  }, []);

  const getTemplateUrl = useCallback((template: Template): string | null => {
    return getTemplatePreviewUrl(template);
  }, []);

  return {
    deletingTemplateId, requestDelete,
    previewTemplate, setPreviewTemplate, handlePreviewClick,
    configuringTemplateId, handleConfigureClick,
    templateUsageMap, setTemplateUsageMap,
    getTemplateUrl,
  };
}
