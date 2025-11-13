/**
 * Lazy-loaded PDF utilities to reduce initial bundle size
 * These libraries (jsPDF, html2canvas, canvg) are only loaded when needed
 */

import { Certificate } from '@/lib/supabase/certificates';

// Type definitions for lazy-loaded libraries
type JsPDF = any;
type Html2Canvas = any;

/**
 * Lazy load jsPDF library (1.86 MB)
 * Only loads when user actually exports to PDF
 */
async function loadJsPDF(): Promise<{ jsPDF: new (options?: any) => JsPDF }> {
  const module = await import('jspdf');
  return module;
}

/**
 * Lazy load html2canvas library (1.06 MB)
 * Only loads when user needs to convert HTML to canvas
 */
async function loadHtml2Canvas(): Promise<Html2Canvas> {
  const module = await import('html2canvas');
  return module.default;
}

/**
 * Optimized PDF export with lazy loading
 * Reduces initial bundle by ~3MB
 */
export async function exportCertificateToPDF(
  certificate: Certificate,
  t: (key: string) => string
): Promise<void> {
  try {
    if (!certificate.certificate_image_url) {
      throw new Error(t('hero.imageNotAvailable'));
    }

    // Show loading state
    const loadingToast = (await import('sonner')).toast.loading('Loading PDF generator...');

    try {
      // Lazy load jsPDF
      const { jsPDF } = await loadJsPDF();

      // Normalize image URL
      let srcRaw = certificate.certificate_image_url || "";
      if (srcRaw && !/^https?:\/\//i.test(srcRaw) && !srcRaw.startsWith('/') && !srcRaw.startsWith('data:')) {
        srcRaw = `/${srcRaw}`;
      }
      const cacheBust = certificate.updated_at ? `?v=${new Date(certificate.updated_at).getTime()}` : '';
      const localWithBust = srcRaw.startsWith('/') ? `${srcRaw}${cacheBust}` : srcRaw;
      const src = localWithBust.startsWith('/') && typeof window !== 'undefined'
        ? `${window.location.origin}${localWithBust}`
        : localWithBust;

      // Fetch and process image
      const resp = await fetch(src);
      if (!resp.ok) throw new Error(`${t('hero.fetchImageFailed')}: ${resp.status}`);
      
      const blob = await resp.blob();
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });

      // Determine image format and dimensions
      const isPNG = blob.type.includes('png');
      const imgType = isPNG ? 'PNG' : 'JPEG';

      const imgBitmap = await createImageBitmap(blob);
      const imgW = imgBitmap.width;
      const imgH = imgBitmap.height;
      imgBitmap.close();

      // Create PDF with optimal settings
      const orientation = imgW >= imgH ? 'l' : 'p';
      const doc = new jsPDF({ 
        orientation, 
        unit: 'mm', 
        format: 'a4',
        compress: true // Enable compression
      });
      
      const pageW = doc.internal.pageSize.getWidth();
      const pageH = doc.internal.pageSize.getHeight();

      // Calculate optimal image placement
      const margin = 8;
      const maxW = pageW - margin * 2;
      const maxH = pageH - margin * 2;
      const scale = Math.min(maxW / imgW, maxH / imgH);
      const drawW = imgW * scale;
      const drawH = imgH * scale;
      const x = (pageW - drawW) / 2;
      const y = (pageH - drawH) / 2;

      // Add image to PDF with compression
      doc.addImage(dataUrl, imgType, x, y, drawW, drawH, undefined, 'FAST');
      
      // Generate filename and save
      const fileName = `${certificate.certificate_no || 'certificate'}.pdf`;
      doc.save(fileName);

      // Dismiss loading toast and show success
      (await import('sonner')).toast.dismiss(loadingToast);
      (await import('sonner')).toast.success(t('hero.pdfExported'));

    } catch (error) {
      // Dismiss loading toast and show error
      (await import('sonner')).toast.dismiss(loadingToast);
      throw error;
    }

  } catch (err) {
    console.error('PDF export error:', err);
    (await import('sonner')).toast.error(
      err instanceof Error ? err.message : t('hero.exportPdfFailed')
    );
  }
}

/**
 * Optimized PNG export (no additional libraries needed)
 */
export async function exportCertificateToPNG(
  certificate: Certificate,
  t: (key: string) => string
): Promise<void> {
  try {
    if (!certificate.certificate_image_url) {
      throw new Error(t('hero.imageNotAvailable'));
    }

    // Normalize URL
    let srcRaw = certificate.certificate_image_url || "";
    if (srcRaw && !/^https?:\/\//i.test(srcRaw) && !srcRaw.startsWith('/') && !srcRaw.startsWith('data:')) {
      srcRaw = `/${srcRaw}`;
    }
    const cacheBust = certificate.updated_at ? `?v=${new Date(certificate.updated_at).getTime()}` : '';
    const localWithBust = srcRaw.startsWith('/') ? `${srcRaw}${cacheBust}` : srcRaw;
    const src = localWithBust.startsWith('/') && typeof window !== 'undefined'
      ? `${window.location.origin}${localWithBust}`
      : localWithBust;

    // Fetch and download
    const resp = await fetch(src);
    if (!resp.ok) throw new Error(`${t('hero.fetchImageFailed')}: ${resp.status}`);
    
    const blob = await resp.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${certificate.certificate_no || 'certificate'}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    (await import('sonner')).toast.success(t('hero.pngDownloaded'));

  } catch (err) {
    console.error('PNG export error:', err);
    (await import('sonner')).toast.error(
      err instanceof Error ? err.message : t('hero.exportPngFailed')
    );
  }
}

/**
 * Lazy load HTML to Canvas conversion (for advanced use cases)
 */
export async function convertElementToCanvas(element: HTMLElement): Promise<HTMLCanvasElement> {
  const html2canvas = await loadHtml2Canvas();
  return html2canvas(element, {
    useCORS: true,
    allowTaint: false,
    scale: 2, // Higher quality
    backgroundColor: null // Transparent background
  });
}
