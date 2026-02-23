import type { RenderQRLayer } from "../certificate-render";
import { generateQRCodeDataURL } from "@/lib/utils/qr-code";
import { loadImage } from "./image-loader";

export async function renderQRLayer(
  ctx: CanvasRenderingContext2D,
  layer: RenderQRLayer,
  canvasWidth: number,
  canvasHeight: number,
): Promise<void> {
  // Calculate position (percentage-first)
  const x =
    layer.xPercent !== undefined && layer.xPercent !== null
      ? Math.round(layer.xPercent * canvasWidth)
      : layer.x || 0;
  const y =
    layer.yPercent !== undefined && layer.yPercent !== null
      ? Math.round(layer.yPercent * canvasHeight)
      : layer.y || 0;

  // Calculate size
  // IMPORTANT: Use absolute pixel size from layout configure as primary source.
  // Layout editor always stores the latest QR size in `width`/`height` (pixels),
  // and also maintains widthPercent/heightPercent for reference.
  // If we prioritize percentages here, a stale widthPercent/heightPercent can
  // cause the generated QR code to keep using the OLD size even after the
  // user resizes it in the layout.

  // 1) If width/height are defined, trust them as the single source of truth.
  // 2) Only fall back to percentage when pixel values are missing (old layouts).
  const widthRaw =
    (typeof layer.width === "number" && !Number.isNaN(layer.width))
      ? layer.width
      : layer.widthPercent !== undefined && layer.widthPercent !== null
        ? Math.round(layer.widthPercent * canvasWidth)
        : 100;

  const heightRaw =
    (typeof layer.height === "number" && !Number.isNaN(layer.height))
      ? layer.height
      : layer.heightPercent !== undefined && layer.heightPercent !== null
        ? Math.round(layer.heightPercent * canvasHeight)
        : 100;

  // Enforce a minimum size so QR generator never falls back to its own default
  // when given 0/NaN or extremely small values.
  const minQRSize = 14;
  const width = Math.max(minQRSize, Math.round(widthRaw));
  const height = Math.max(minQRSize, Math.round(heightRaw));

  const maxQRSize = 800;
  const optimalSize = Math.max(
    minQRSize,
    Math.min(maxQRSize, Math.max(width, height)),
  );

  // Generate QR code as data URL at optimal size
  const qrDataURL = await generateQRCodeDataURL(layer.qrData, {
    width: optimalSize,
    height: optimalSize,
    errorCorrectionLevel: layer.errorCorrectionLevel || "M",
    // Force margin 0 so QR code fully occupies the configured box size
    margin: 0,
    color: {
      dark: layer.foregroundColor || "#000000",
      light: layer.backgroundColor || "#FFFFFF",
    },
  });

  // Load QR code image
  const qrImage = await loadImage(qrDataURL);

  // Save context state
  ctx.save();

  // Apply opacity
  ctx.globalAlpha = layer.opacity;

  // Apply rotation
  if (layer.rotation !== 0) {
    // Move to center of QR code
    ctx.translate(x + width / 2, y + height / 2);
    ctx.rotate((layer.rotation * Math.PI) / 180);
    ctx.translate(-(x + width / 2), -(y + height / 2));
  }

  // CRITICAL: Draw QR code scaled to exact size matching preview
  // This ensures the QR code size in generated certificate matches preview exactly
  ctx.drawImage(qrImage, x, y, width, height);

  // Restore context state
  ctx.restore();
}
