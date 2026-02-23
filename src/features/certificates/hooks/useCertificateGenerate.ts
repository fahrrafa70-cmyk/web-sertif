import { useState } from "react";
import { toast } from "sonner";
import {
  Template,
  getTemplateImageUrl,
  getTemplateLayout,
  getTemplatesForTenant,
} from "@/lib/supabase/templates";
import { Member, getMembersForTenant } from "@/lib/supabase/members";
import {
  TemplateDefaults,
  getTemplateDefaults,
  PhotoLayerDefault,
} from "@/lib/storage/template-defaults";
import {
  TemplateLayoutConfig,
  TextLayerConfig,
  PhotoLayerConfig,
  QRCodeLayerConfig,
} from "@/types/template-layout";
import { createCertificate, CreateCertificateData, generateCertificateNumber } from "@/lib/supabase/certificates";
import { supabaseClient } from "@/lib/supabase/client";
import { renderCertificateToDataURL, RenderTextLayer } from "@/lib/render/certificate-render";
import { generateThumbnail } from "@/lib/utils/thumbnail";
import { STANDARD_CANVAS_WIDTH, STANDARD_CANVAS_HEIGHT } from "@/lib/constants/canvas";
import { formatDateString } from "@/lib/utils/certificate-formatters";
import { autoPopulatePrestasi } from "@/lib/utils/score-predicates";
import { replaceVariables, replaceVariablesInRichText } from "@/lib/utils/variable-parser";
import { generatePairedXIDFilenames } from "@/lib/utils/generate-xid";
import { QuickGenerateParams } from "@/components/certificate/QuickGenerateModal";

export function useCertificateGenerate({
  selectedTenantId,
  refresh,
  t,
}: {
  selectedTenantId: string;
  refresh: () => Promise<void>;
  t: (key: string) => string;
}) {
  const [quickGenerateOpen, setQuickGenerateOpen] = useState(false);
  const [wizardGenerateOpen, setWizardGenerateOpen] = useState(false);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [, setLoadingQuickGenData] = useState(false);

  async function loadTemplatesAndMembers() {
    if (!selectedTenantId) { toast.error("Pilih tenant terlebih dahulu sebelum generate sertifikat"); return false; }
    const loadingToast = toast.loading("Loading templates and members...");
    try {
      setLoadingQuickGenData(true);
      const [td, md] = await Promise.all([getTemplatesForTenant(selectedTenantId), getMembersForTenant(selectedTenantId)]);
      setTemplates(td.filter((t) => t.status === "ready" || !t.status));
      setMembers(md);
      toast.dismiss(loadingToast);
      return true;
    } catch {
      toast.dismiss(loadingToast);
      toast.error("Failed to load templates and members for this tenant");
      return false;
    } finally { setLoadingQuickGenData(false); }
  }

  const handleOpenQuickGenerate = async () => {
    setQuickGenerateOpen(true);
    await loadTemplatesAndMembers();
  };

  const handleOpenWizardGenerate = async () => {
    setWizardGenerateOpen(true);
    await loadTemplatesAndMembers();
  };

  const generateSingleCertificate = async (
    template: Template,
    member: Member,
    certData: { certificate_no: string; description: string; issue_date: string; expired_date: string },
    defaults: TemplateDefaults,
    dateFormat: string,
    scoreData?: Record<string, string>,
    layoutConfig?: TemplateLayoutConfig | null,
    excelRowData?: Record<string, string>
  ) => {
    if (scoreData) scoreData = autoPopulatePrestasi(scoreData);

    let finalCertificateNo = certData.certificate_no?.trim();
    if (!finalCertificateNo && certData.issue_date) {
      try { finalCertificateNo = await generateCertificateNumber(new Date(certData.issue_date)); }
      catch { finalCertificateNo = `CERT-${Date.now()}`; }
    }
    let finalExpiredDate = certData.expired_date?.trim();
    if (!finalExpiredDate && certData.issue_date) {
      const exp = new Date(certData.issue_date); exp.setFullYear(exp.getFullYear() + 3);
      finalExpiredDate = exp.toISOString().split("T")[0];
    }
    let finalIssueDate = certData.issue_date?.trim();
    if (!finalIssueDate) finalIssueDate = new Date().toISOString().split("T")[0];
    const finalCertData = {
      certificate_no: finalCertificateNo || certData.certificate_no,
      description: certData.description || "",
      issue_date: finalIssueDate,
      expired_date: finalExpiredDate || certData.expired_date,
    };

    const templateImageUrl = await getTemplateImageUrl(template);
    if (!templateImageUrl) throw new Error(`Template image not found for ${template.name}`);

    const certDataMap = certData as unknown as Record<string, string>;
    const nilaiFromCert = certDataMap && Object.prototype.hasOwnProperty.call(certDataMap, "nilai") ? (certDataMap["nilai"] as string | undefined) : undefined;
    const variableData: Record<string, string> = {
      name: member.name || "", nama: member.name || "",
      certificate_no: finalCertData.certificate_no || "",
      description: finalCertData.description || "",
      nilai: nilaiFromCert !== undefined && nilaiFromCert !== null ? String(nilaiFromCert) : "",
      issue_date: formatDateString(finalCertData.issue_date, dateFormat),
      expired_date: finalCertData.expired_date ? formatDateString(finalCertData.expired_date, dateFormat) : "",
      ...certDataMap, ...(excelRowData || {}), ...(scoreData || {}),
    };

    const textLayers: RenderTextLayer[] = defaults.textLayers.filter((l) => l.visible !== false).map((layer) => {
      let text = "";
      let processedRichText = layer.richText;
      const isStdAuto = ["name","certificate_no","description","issue_date","expired_date"].includes(layer.id);
      const hasExcelValue = !!(excelRowData && excelRowData[layer.id] !== undefined && excelRowData[layer.id] !== null && String(excelRowData[layer.id]).trim() !== "");
      const hasScoreValue = !!(scoreData && scoreData[layer.id] !== undefined && scoreData[layer.id] !== null && String(scoreData[layer.id]).trim() !== "");
      const hasCertDataKey = !isStdAuto && !!(certDataMap && Object.prototype.hasOwnProperty.call(certDataMap, layer.id));

      if (hasExcelValue) text = String(excelRowData![layer.id]).trim();
      else if (hasScoreValue) text = String(scoreData![layer.id]).trim();
      else if (hasCertDataKey) { const raw = certDataMap[layer.id]; text = raw === undefined || raw === null ? "" : String(raw); }
      else if (isStdAuto) {
        if (layer.id === "name") text = member.name;
        else if (layer.id === "certificate_no") text = finalCertData.certificate_no || "";
        else if (layer.id === "description") text = finalCertData.description || "";
        else if (layer.id === "issue_date") text = formatDateString(finalCertData.issue_date, dateFormat);
        else if (layer.id === "expired_date") text = finalCertData.expired_date ? formatDateString(finalCertData.expired_date, dateFormat) : "";
      }

      const hasAnyExplicit = hasExcelValue || hasScoreValue || hasCertDataKey || isStdAuto;
      if (hasAnyExplicit && processedRichText && processedRichText.length > 0) {
        if (!processedRichText.some((s) => s.text.includes("{"))) processedRichText = undefined;
      }
      if (!hasAnyExplicit && !isStdAuto && !text && layer.defaultText) {
        text = layer.defaultText;
        if (!layer.hasInlineFormatting) processedRichText = undefined;
      }
      if (processedRichText && processedRichText.length > 0) {
        if (processedRichText.some((s) => s.text.includes("{"))) {
          processedRichText = replaceVariablesInRichText(processedRichText, variableData);
          text = processedRichText.map((s) => s.text).join("");
        }
      } else if (text && text.includes("{")) {
        text = replaceVariables(text, variableData);
      }
      return { id: layer.id, text, x: layer.x, y: layer.y, xPercent: layer.xPercent, yPercent: layer.yPercent, fontSize: layer.fontSize, color: layer.color, fontWeight: layer.fontWeight, fontStyle: layer.fontStyle, fontFamily: layer.fontFamily, textAlign: layer.textAlign, maxWidth: layer.maxWidth, lineHeight: layer.lineHeight, letterSpacing: layer.letterSpacing, richText: processedRichText, hasInlineFormatting: layer.hasInlineFormatting };
    });

    const photoLayersForRender = (defaults.photoLayers || []).map((layer) => ({
      id: layer.id, type: layer.type, src: layer.src, x: layer.x, y: layer.y, xPercent: layer.xPercent, yPercent: layer.yPercent, width: layer.width, height: layer.height, widthPercent: layer.widthPercent, heightPercent: layer.heightPercent, zIndex: layer.zIndex, fitMode: layer.fitMode, opacity: layer.opacity, rotation: layer.rotation, crop: layer.crop, mask: layer.mask,
    }));

    const qrLayersForRender = (layoutConfig?.certificate?.qrLayers || []).map((layer: QRCodeLayerConfig) => ({
      id: layer.id, type: layer.type as "qr_code",
      qrData: layer.qrData.replace("{{CERTIFICATE_URL}}", `${process.env.NEXT_PUBLIC_BASE_URL || window.location.origin}/cek/${finalCertData.certificate_no}`),
      x: layer.x, y: layer.y, xPercent: layer.xPercent, yPercent: layer.yPercent, width: layer.width, height: layer.height, widthPercent: layer.widthPercent, heightPercent: layer.heightPercent, zIndex: layer.zIndex, opacity: layer.opacity, rotation: layer.rotation, foregroundColor: layer.foregroundColor, backgroundColor: layer.backgroundColor, errorCorrectionLevel: layer.errorCorrectionLevel, margin: layer.margin,
    }));

    const { cert: certFileName, xid } = generatePairedXIDFilenames();

    const certImgDataUrl = await renderCertificateToDataURL({ templateImageUrl, textLayers, photoLayers: photoLayersForRender, qrLayers: qrLayersForRender, templateId: template.id, templateName: template.name });
    const certThumb = await generateThumbnail(certImgDataUrl, { format: "webp", quality: 0.85, maxWidth: 1200 });

    async function uploadToStorage(imageData: string, fileName: string) {
      const resp = await fetch("/api/upload-to-storage", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ imageData, fileName, bucketName: "certificates" }) });
      if (!resp.ok) throw new Error(`Failed to upload ${fileName}: ${await resp.text()}`);
      const r = await resp.json();
      if (!r.success) throw new Error(`Upload failed: ${r.error}`);
      return r.url as string;
    }

    const certImgUrl = await uploadToStorage(certImgDataUrl, certFileName);
    const certThumbUrl = await uploadToStorage(certThumb, `preview/${xid}_cert.webp`);

    const certificateDataToSave: CreateCertificateData = {
      certificate_no: finalCertData.certificate_no, name: member.name.trim(),
      description: finalCertData.description.trim() || undefined,
      issue_date: finalCertData.issue_date, expired_date: finalCertData.expired_date || undefined,
      category: template.category || undefined, template_id: template.id,
      member_id: member.id.startsWith("temp-") ? undefined : member.id,
      tenant_id: selectedTenantId || undefined,
      text_layers: textLayers.map((l) => {
        const b = { id: l.id, text: l.text, x: l.x || 0, y: l.y || 0, xPercent: l.xPercent || 0, yPercent: l.yPercent || 0, fontSize: l.fontSize, color: l.color, fontWeight: l.fontWeight || "normal", fontFamily: l.fontFamily || "Arial", maxWidth: l.maxWidth, lineHeight: l.lineHeight, letterSpacing: l.letterSpacing };
        if (l.id !== "certificate_no" && l.id !== "issue_date") return { ...b, textAlign: l.textAlign };
        return b as any;
      }),
      merged_image: certImgUrl, certificate_image_url: certImgUrl, certificate_thumbnail_url: certThumbUrl,
    };

    const savedCertificate = await createCertificate(certificateDataToSave);

    try {
      const xidFromDb = savedCertificate.xid;
      const finalCertImgDataUrl = await renderCertificateToDataURL({ templateImageUrl, textLayers, photoLayers: photoLayersForRender, qrLayers: qrLayersForRender, templateId: template.id, templateName: template.name });
      const finalThumb = await generateThumbnail(finalCertImgDataUrl, { format: "webp", quality: 0.85, maxWidth: 1200 });
      const finalPngUrl = await uploadToStorage(finalCertImgDataUrl, `${xidFromDb}_cert.png`);
      const finalWebpUrl = await uploadToStorage(finalThumb, `${xidFromDb}_cert.webp`);
      await supabaseClient.from("certificates").update({ certificate_image_url: finalPngUrl, certificate_thumbnail_url: finalWebpUrl }).eq("id", savedCertificate.id);
    } catch (e) { console.error("⚠️ Post-save render/upload error:", e); }

    if (template.score_image_url) {
      try {
        const scoreLayout = layoutConfig?.score;
        if (scoreLayout && scoreLayout.textLayers && scoreLayout.textLayers.length > 0) {
          const migratedScoreLayers = scoreLayout.textLayers.filter((l) => l.visible !== false).map((l) => ({
            ...l,
            x: l.x !== undefined ? l.x : (l.xPercent || 0) * STANDARD_CANVAS_WIDTH,
            y: l.y !== undefined ? l.y : (l.yPercent || 0) * STANDARD_CANVAS_HEIGHT,
            xPercent: l.xPercent !== undefined ? l.xPercent : (l.x || 0) / STANDARD_CANVAS_WIDTH,
            yPercent: l.yPercent !== undefined ? l.yPercent : (l.y || 0) / STANDARD_CANVAS_HEIGHT,
            maxWidth: l.maxWidth || 300, lineHeight: l.lineHeight || 1.2,
            fontStyle: l.fontStyle || "normal", fontWeight: l.fontWeight || "normal",
          }));

          const scoreTextLayers: RenderTextLayer[] = migratedScoreLayers.map((layer: TextLayerConfig) => {
            let text = "";
            let processedRichText = layer.richText;
            const isStdAuto = ["name","certificate_no","description","issue_date","expired_date","score_date","expiry_date"].includes(layer.id);
            const hasSV = !!(scoreData && scoreData[layer.id] !== undefined && scoreData[layer.id] !== null && String(scoreData[layer.id]).trim() !== "");
            const hasCdk = !isStdAuto && !!(certDataMap && Object.prototype.hasOwnProperty.call(certDataMap, layer.id));
            if (hasSV) text = String(scoreData![layer.id]).trim();
            else if (hasCdk) { const raw = certDataMap[layer.id]; text = raw === undefined || raw === null ? "" : String(raw); }
            else if (isStdAuto) {
              if (layer.id === "name") text = member.name;
              else if (layer.id === "certificate_no") text = finalCertData.certificate_no || "";
              else if (layer.id === "description") text = finalCertData.description || "";
              else if (layer.id === "issue_date" || layer.id === "score_date") text = formatDateString(finalCertData.issue_date, dateFormat);
              else if (layer.id === "expired_date" || layer.id === "expiry_date") text = finalCertData.expired_date ? formatDateString(finalCertData.expired_date, dateFormat) : "";
            }
            const hasAny = hasSV || hasCdk || isStdAuto;
            if (hasAny && processedRichText && processedRichText.length > 0 && !layer.hasInlineFormatting) {
              if (!processedRichText.some((s) => s.text.includes("{"))) processedRichText = undefined;
            }
            if (!hasAny && !text && layer.defaultText) { text = layer.defaultText; if (!layer.hasInlineFormatting) processedRichText = undefined; }
            const vd: Record<string, string> = { name: member.name || "", nama: member.name || "", certificate_no: finalCertData.certificate_no || "", description: finalCertData.description || "", issue_date: formatDateString(finalCertData.issue_date, dateFormat), expired_date: finalCertData.expired_date ? formatDateString(finalCertData.expired_date, dateFormat) : "", ...certDataMap, ...(excelRowData || {}), ...(scoreData || {}) };
            if (processedRichText && processedRichText.length > 0) {
              if (processedRichText.some((s) => s.text.includes("{"))) { processedRichText = replaceVariablesInRichText(processedRichText, vd); text = processedRichText.map((s) => s.text).join(""); }
            } else if (text && text.includes("{")) { text = replaceVariables(text, vd); }
            const textChanged = text !== layer.defaultText;
            const hasPRT = processedRichText && processedRichText !== layer.richText;
            if (textChanged && layer.richText && !hasPRT) processedRichText = undefined;
            return { id: layer.id, text, x: layer.x, y: layer.y, xPercent: layer.xPercent, yPercent: layer.yPercent, fontSize: layer.fontSize, color: layer.color, fontWeight: layer.fontWeight, fontStyle: layer.fontStyle, fontFamily: layer.fontFamily, textAlign: layer.textAlign, maxWidth: layer.maxWidth, lineHeight: layer.lineHeight, richText: processedRichText, hasInlineFormatting: layer.hasInlineFormatting };
          });

          const scorePhotoLayers = (scoreLayout.photoLayers || []).map((l) => ({ id: l.id, type: l.type, src: l.src, x: l.x, y: l.y, xPercent: l.xPercent, yPercent: l.yPercent, width: l.width, height: l.height, widthPercent: l.widthPercent, heightPercent: l.heightPercent, zIndex: l.zIndex, fitMode: l.fitMode, opacity: l.opacity, rotation: l.rotation, crop: l.crop, mask: l.mask }));
          const scoreQRLayers = (layoutConfig?.score?.qrLayers || []).map((l: QRCodeLayerConfig) => ({ id: l.id, type: l.type as "qr_code", qrData: l.qrData.replace("{{CERTIFICATE_URL}}", `${process.env.NEXT_PUBLIC_BASE_URL || window.location.origin}/cek/${savedCertificate.certificate_no}`), x: l.x, y: l.y, xPercent: l.xPercent, yPercent: l.yPercent, width: l.width, height: l.height, widthPercent: l.widthPercent, heightPercent: l.heightPercent, zIndex: l.zIndex, opacity: l.opacity, rotation: l.rotation, foregroundColor: l.foregroundColor, backgroundColor: l.backgroundColor, errorCorrectionLevel: l.errorCorrectionLevel, margin: l.margin }));

          const scoreImgDataUrl = await renderCertificateToDataURL({ templateImageUrl: template.score_image_url, textLayers: scoreTextLayers, photoLayers: scorePhotoLayers, qrLayers: scoreQRLayers, templateId: template.id, templateName: template.name });
          const scoreThumb = await generateThumbnail(scoreImgDataUrl, { format: "webp", quality: 0.85, maxWidth: 1200 });
          const scorePngUrl = await uploadToStorage(scoreImgDataUrl, `${savedCertificate.xid}_score.png`);
          const scoreWebpUrl = await uploadToStorage(scoreThumb, `preview/${xid}_score.webp`);
          await supabaseClient.from("certificates").update({ score_image_url: scorePngUrl, score_thumbnail_url: scoreWebpUrl }).eq("id", savedCertificate.id);
        } else {
          const scoreImgDataUrl = await renderCertificateToDataURL({ templateImageUrl: template.score_image_url, textLayers: [], photoLayers: [], qrLayers: [], templateId: template.id, templateName: template.name });
          const scoreThumb = await generateThumbnail(scoreImgDataUrl, { format: "webp", quality: 0.85, maxWidth: 1200 });
          const scorePngUrl = await uploadToStorage(scoreImgDataUrl, `${savedCertificate.xid}_score.png`);
          const scoreWebpUrl = await uploadToStorage(scoreThumb, `preview/${xid}_score.webp`);
          await supabaseClient.from("certificates").update({ score_image_url: scorePngUrl, score_thumbnail_url: scoreWebpUrl }).eq("id", savedCertificate.id);
        }
      } catch (err) { console.error("⚠️ Failed to generate score/back image:", err); }
    }

    return savedCertificate;
  };

  const handleQuickGenerate = async (params: QuickGenerateParams) => {
    const loadingToast = toast.loading(t("quickGenerate.generatingCertificates"));
    try {
      const layoutConfig = await getTemplateLayout(params.template.id);
      let defaults: TemplateDefaults | null = null;

      if (layoutConfig && layoutConfig.certificate) {
        const migratedLayers = layoutConfig.certificate.textLayers.map((layer) => ({
          ...layer,
          x: layer.x !== undefined ? layer.x : (layer.xPercent || 0) * STANDARD_CANVAS_WIDTH,
          y: layer.y !== undefined ? layer.y : (layer.yPercent || 0) * STANDARD_CANVAS_HEIGHT,
          xPercent: layer.xPercent !== undefined ? layer.xPercent : (layer.x || 0) / STANDARD_CANVAS_WIDTH,
          yPercent: layer.yPercent !== undefined ? layer.yPercent : (layer.y || 0) / STANDARD_CANVAS_HEIGHT,
          maxWidth: layer.maxWidth || 300, lineHeight: layer.lineHeight || 1.2,
          fontStyle: layer.fontStyle || "normal", fontWeight: layer.fontWeight || "normal",
        }));
        const photoLayersRaw = layoutConfig.certificate.photoLayers || (layoutConfig as unknown as { photoLayers?: PhotoLayerConfig[] }).photoLayers;
        const photoLayersFromConfig: PhotoLayerDefault[] = (photoLayersRaw || []).map((l: PhotoLayerConfig) => ({ id: l.id, type: l.type, src: l.src, x: l.x, y: l.y, xPercent: l.xPercent, yPercent: l.yPercent, width: l.width, height: l.height, widthPercent: l.widthPercent, heightPercent: l.heightPercent, zIndex: l.zIndex, fitMode: l.fitMode, crop: l.crop, mask: l.mask, opacity: l.opacity, rotation: l.rotation, maintainAspectRatio: l.maintainAspectRatio, originalWidth: l.originalWidth, originalHeight: l.originalHeight, storagePath: l.storagePath }));
        defaults = { templateId: params.template.id, templateName: params.template.name, textLayers: migratedLayers, overlayImages: layoutConfig.certificate.overlayImages, photoLayers: photoLayersFromConfig, savedAt: layoutConfig.lastSavedAt };
      } else {
        const tplId = params.template.is_dual_template ? `${params.template.id}_certificate` : params.template.id;
        defaults = getTemplateDefaults(tplId);
      }

      if (!defaults || !defaults.textLayers || defaults.textLayers.length === 0) throw new Error("Template layout not configured. Please configure the template layout first in Templates page.");

      if (params.dataSource === "member") {
        if (params.members && params.members.length > 0 && params.certificateData) {
          const total = params.members.length; let generated = 0;
          for (const member of params.members) {
            try {
              await generateSingleCertificate(params.template, member, params.certificateData, defaults, params.dateFormat, params.scoreDataMap?.[member.id], layoutConfig);
              generated++;
              toast.loading(`${t("quickGenerate.generatingCertificates")} ${generated}/${total}`, { id: loadingToast });
            } catch (e) { console.error(`❌ Failed for ${member.name}:`, e); }
          }
          toast.dismiss(loadingToast);
          toast.success(`${t("quickGenerate.successMultiple")} ${generated}/${total} ${t("quickGenerate.certificatesGenerated")}`, { duration: 3000 });
        } else if (params.member && params.certificateData) {
          let memberScoreData: Record<string, string> | undefined;
          if (params.template.score_image_url && layoutConfig?.score && params.scoreDataMap && params.member.id) {
            memberScoreData = params.scoreDataMap[params.member.id];
          }
          await generateSingleCertificate(params.template, params.member, params.certificateData, defaults, params.dateFormat, memberScoreData, layoutConfig);
          toast.dismiss(loadingToast);
          toast.success(t("quickGenerate.successSingle"), { duration: 2000 });
        } else { throw new Error("No member(s) provided for certificate generation"); }
      } else if (params.dataSource === "excel" && params.excelData) {
        const total = params.excelData.length; let generated = 0;
        for (const row of params.excelData) {
          try {
            const name = String(row.name || row.recipient || "");
            const description = String(row.description || "");
            let issueDate = String(row.issue_date || row.date || "");
            if (!issueDate) issueDate = new Date().toISOString().split("T")[0];
            const certNo = String(row.certificate_no || row.cert_no || "");
            const expiredDate = String(row.expired_date || row.expiry || "");
            const tempMember: Member = { id: `temp-${Date.now()}-${generated}`, name, email: String(row.email || ""), organization: String(row.organization || ""), phone: String(row.phone || ""), job: String(row.job || ""), date_of_birth: null, address: String(row.address || ""), city: String(row.city || ""), notes: "", created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
            const excelRowData: Record<string, string> = {};
            for (const [k, v] of Object.entries(row)) {
              if (!["name","certificate_no","issue_date","expired_date","description","email","organization","phone","job","address","city"].includes(k)) {
                if (v !== undefined && v !== null && v !== "") excelRowData[k] = String(v);
              }
            }
            let excelScoreData: Record<string, string> | undefined;
            if (params.template.score_image_url && layoutConfig?.score) {
              excelScoreData = {};
              for (const layer of (layoutConfig.score.textLayers || [])) {
                if (["name","certificate_no","issue_date","score_date","description"].includes(layer.id)) continue;
                if (row[layer.id] !== undefined && row[layer.id] !== null && row[layer.id] !== "") excelScoreData[layer.id] = String(row[layer.id]);
              }
            }
            await generateSingleCertificate(params.template, tempMember, { certificate_no: certNo, description, issue_date: issueDate, expired_date: expiredDate }, defaults, params.dateFormat, excelScoreData, layoutConfig, excelRowData);
            generated++;
            toast.loading(`${t("quickGenerate.generatingCertificates")} ${generated}/${total}`, { id: loadingToast });
          } catch { /* continue */ }
        }
        toast.dismiss(loadingToast);
        toast.success(`${t("quickGenerate.successMultiple")} ${generated}/${total} ${t("quickGenerate.certificatesGenerated")}`, { duration: 3000 });
      }
      await refresh();
    } catch (error: unknown) {
      toast.dismiss(loadingToast);
      toast.error(error instanceof Error ? error.message : "Failed to generate certificate", { duration: 3000 });
    }
  };

  return {
    quickGenerateOpen, setQuickGenerateOpen, wizardGenerateOpen, setWizardGenerateOpen, templates, members, handleOpenQuickGenerate, handleOpenWizardGenerate, handleQuickGenerate,
  };
}
