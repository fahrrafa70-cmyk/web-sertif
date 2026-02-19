"use client";

/**
 * useCertificateExport
 *
 * Encapsulates all certificate export/sharing logic extracted from hero-section.tsx:
 *  - exportToPDF  – download certificate as PDF via jsPDF
 *  - exportToPNG  – download certificate image as PNG
 *  - generateLink – copy shareable link to clipboard (Supabase Storage URL or /cek/{public_id})
 */

import { useCallback } from "react";
import { toast } from "sonner";
import type { Certificate } from "@/features/certificates/types";

// ─── Shared helper ────────────────────────────────────────────────────────────

/** Normalises a raw image URL to a fully-qualified absolute URL. */
function normalizeImageUrl(rawUrl: string, addCacheBust?: string): string {
  let src = rawUrl;

  // Add leading slash for relative paths (not data: URIs)
  if (src && !/^https?:\/\//i.test(src) && !src.startsWith("/") && !src.startsWith("data:")) {
    src = `/${src}`;
  }

  // Add cache-buster to local paths
  if (addCacheBust && src.startsWith("/")) {
    src = `${src}${addCacheBust}`;
  }

  // Make relative URL absolute using current origin
  if (src.startsWith("/") && typeof window !== "undefined") {
    src = `${window.location.origin}${src}`;
  }

  return src;
}

/** Write text to clipboard, with execCommand fallback for older browsers. */
async function copyToClipboard(text: string): Promise<void> {
  if (navigator.clipboard) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const area = document.createElement("textarea");
  area.value = text;
  area.style.cssText = "position:fixed;opacity:0";
  document.body.appendChild(area);
  area.select();
  document.execCommand("copy");
  document.body.removeChild(area);
}

// ─── Hook ────────────────────────────────────────────────────────────────────

interface UseCertificateExportOptions {
  /** i18n translate function */
  t: (key: string) => string;
}

export function useCertificateExport({ t }: UseCertificateExportOptions) {
  // ── PDF export ─────────────────────────────────────────────────────────────
  const exportToPDF = useCallback(
    async (certificate: Certificate) => {
      try {
        if (!certificate.certificate_image_url) {
          toast.error(t("hero.imageNotAvailable"));
          return;
        }

        const mod = (await import("jspdf").catch(() => null)) as null | typeof import("jspdf");
        if (!mod || !("jsPDF" in mod)) {
          toast.error(t("hero.pdfLibraryMissing"));
          console.error("jspdf not found. Run: npm i jspdf");
          return;
        }
        const { jsPDF } = mod;

        const cacheBust = certificate.updated_at
          ? `?v=${new Date(certificate.updated_at).getTime()}`
          : "";
        const src = normalizeImageUrl(certificate.certificate_image_url, cacheBust);

        const resp = await fetch(src);
        if (!resp.ok) throw new Error(`${t("hero.fetchImageFailed")}: ${resp.status}`);
        const blob = await resp.blob();

        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });

        const imgBitmap = await createImageBitmap(blob);
        const { width: imgW, height: imgH } = imgBitmap;
        imgBitmap.close();

        const orientation = imgW >= imgH ? "l" : "p";
        const doc = new jsPDF({ orientation, unit: "mm", format: "a4" });
        const pageW = doc.internal.pageSize.getWidth();
        const pageH = doc.internal.pageSize.getHeight();

        const margin = 8;
        const scale = Math.min((pageW - margin * 2) / imgW, (pageH - margin * 2) / imgH);
        const drawW = imgW * scale;
        const drawH = imgH * scale;

        doc.addImage(
          dataUrl,
          blob.type.includes("png") ? "PNG" : "JPEG",
          (pageW - drawW) / 2,
          (pageH - drawH) / 2,
          drawW,
          drawH,
          undefined,
          "FAST",
        );
        doc.save(`${certificate.certificate_no || "certificate"}.pdf`);
        toast.success(t("hero.pdfExported"));
      } catch (err) {
        console.error(err);
        toast.error(err instanceof Error ? err.message : t("hero.exportPdfFailed"));
      }
    },
    [t],
  );

  // ── PNG export ─────────────────────────────────────────────────────────────
  const exportToPNG = useCallback(
    async (certificate: Certificate) => {
      try {
        if (!certificate.certificate_image_url) {
          toast.error(t("hero.imageNotAvailable"));
          return;
        }

        const cacheBust = certificate.updated_at
          ? `?v=${new Date(certificate.updated_at).getTime()}`
          : "";
        const src = normalizeImageUrl(certificate.certificate_image_url, cacheBust);

        const resp = await fetch(src);
        if (!resp.ok) throw new Error(`${t("hero.fetchImageFailed")}: ${resp.status}`);
        const blob = await resp.blob();

        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `${certificate.certificate_no || "certificate"}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        toast.success(t("hero.pngDownloaded"));
      } catch (err) {
        console.error(err);
        toast.error(err instanceof Error ? err.message : t("hero.exportPngFailed"));
      }
    },
    [t],
  );

  // ── Link generation ────────────────────────────────────────────────────────
  const generateCertificateLink = useCallback(
    async (certificate: Certificate) => {
      try {
        // Priority 1: direct Supabase Storage URL (accessible without the app)
        if (
          certificate.certificate_image_url &&
          certificate.certificate_image_url.includes("supabase.co/storage")
        ) {
          await copyToClipboard(certificate.certificate_image_url);
          toast.success(t("hero.linkCopied"));
          return;
        }

        // Priority 2: app page link via public_id
        if (!certificate.public_id) {
          toast.error(t("hero.noPublicLink"));
          return;
        }

        let baseUrl = process.env.NEXT_PUBLIC_APP_URL;

        if (!baseUrl && typeof window !== "undefined") {
          baseUrl = window.localStorage.getItem("production-url") || window.location.origin;
        }

        // Warn if still on localhost and no production URL is saved
        if (
          typeof window !== "undefined" &&
          baseUrl &&
          (baseUrl.includes("localhost") || baseUrl.includes("127.0.0.1")) &&
          !window.localStorage.getItem("production-url")
        ) {
          toast.warning("Localhost detected. Set production URL in Certificates page for shareable links.", {
            duration: 5000,
          });
        } else if (typeof window !== "undefined") {
          const saved = window.localStorage.getItem("production-url");
          if (saved) baseUrl = saved;
        }

        if (baseUrl && !baseUrl.match(/^https?:\/\//i)) {
          baseUrl = `https://${baseUrl.replace(/^\/\//, "")}`;
        }

        await copyToClipboard(`${baseUrl}/cek/${certificate.public_id}`);
        toast.success(t("hero.linkCopied"));
      } catch (err) {
        console.error("Failed to generate certificate link:", err);
        toast.error(t("hero.linkGenerateFailed"));
      }
    },
    [t],
  );

  return { exportToPDF, exportToPNG, generateCertificateLink };
}
