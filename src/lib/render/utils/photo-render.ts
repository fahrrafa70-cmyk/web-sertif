import type { RenderPhotoLayer } from "../certificate-render";
import { loadImage } from "./image-loader";

/**
 * Calculate fitted dimensions based on fitMode (like Canva)
 * @param sourceWidth Original image width
 * @param sourceHeight Original image height
 * @param targetWidth Target box width
 * @param targetHeight Target box height
 * @param fitMode How to fit image
 * @returns Dimensions and offsets for drawing
 */
export function calculateFitDimensions(
  sourceWidth: number,
  sourceHeight: number,
  targetWidth: number,
  targetHeight: number,
  fitMode: "contain" | "cover" | "fill" | "none",
): { width: number; height: number; offsetX: number; offsetY: number } {
  if (fitMode === "fill") {
    // Stretch to fill (may distort)
    return { width: targetWidth, height: targetHeight, offsetX: 0, offsetY: 0 };
  }

  if (fitMode === "none") {
    // Original size, centered
    return {
      width: sourceWidth,
      height: sourceHeight,
      offsetX: (targetWidth - sourceWidth) / 2,
      offsetY: (targetHeight - sourceHeight) / 2,
    };
  }

  const sourceAspect = sourceWidth / sourceHeight;
  const targetAspect = targetWidth / targetHeight;

  if (fitMode === "contain") {
    // Fit inside, maintain aspect (letterbox/pillarbox)
    if (sourceAspect > targetAspect) {
      // Source wider than target
      const scaledHeight = targetWidth / sourceAspect;
      return {
        width: targetWidth,
        height: scaledHeight,
        offsetX: 0,
        offsetY: (targetHeight - scaledHeight) / 2,
      };
    } else {
      // Source taller than target
      const scaledWidth = targetHeight * sourceAspect;
      return {
        width: scaledWidth,
        height: targetHeight,
        offsetX: (targetWidth - scaledWidth) / 2,
        offsetY: 0,
      };
    }
  }

  // fitMode === 'cover'
  // Fill box, maintain aspect (crop edges)
  if (sourceAspect > targetAspect) {
    // Source wider - crop sides
    const scaledWidth = targetHeight * sourceAspect;
    return {
      width: scaledWidth,
      height: targetHeight,
      offsetX: (targetWidth - scaledWidth) / 2,
      offsetY: 0,
    };
  } else {
    // Source taller - crop top/bottom
    const scaledHeight = targetWidth / sourceAspect;
    return {
      width: targetWidth,
      height: scaledHeight,
      offsetX: 0,
      offsetY: (targetHeight - scaledHeight) / 2,
    };
  }
}

/**
 * Apply mask to canvas context (circle, ellipse, roundedRect, polygon)
 */
export function applyMask(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  mask: RenderPhotoLayer["mask"],
): void {
  if (!mask || mask.type === "none") return;

  ctx.save();
  ctx.beginPath();

  switch (mask.type) {
    case "circle": {
      const radius = Math.min(width, height) / 2;
      const centerX = x + width / 2;
      const centerY = y + height / 2;
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      break;
    }

    case "ellipse": {
      const centerX = x + width / 2;
      const centerY = y + height / 2;
      ctx.ellipse(centerX, centerY, width / 2, height / 2, 0, 0, Math.PI * 2);
      break;
    }

    case "roundedRect": {
      const radius = mask.borderRadius || 10;
      ctx.moveTo(x + radius, y);
      ctx.lineTo(x + width - radius, y);
      ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
      ctx.lineTo(x + width, y + height - radius);
      ctx.quadraticCurveTo(
        x + width,
        y + height,
        x + width - radius,
        y + height,
      );
      ctx.lineTo(x + radius, y + height);
      ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
      ctx.lineTo(x, y + radius);
      ctx.quadraticCurveTo(x, y, x + radius, y);
      break;
    }

    case "polygon": {
      if (mask.points && mask.points.length >= 3) {
        const firstPoint = mask.points[0];
        ctx.moveTo(x + firstPoint.x * width, y + firstPoint.y * height);
        for (let i = 1; i < mask.points.length; i++) {
          const point = mask.points[i];
          ctx.lineTo(x + point.x * width, y + point.y * height);
        }
        ctx.closePath();
      }
      break;
    }
  }

  ctx.clip();
}

/**
 * Render photo layer with crop, mask, fitMode support
 * Professional rendering like Canva/Picsart
 */
export async function renderPhotoLayer(
  ctx: CanvasRenderingContext2D,
  layer: RenderPhotoLayer,
  canvasWidth: number,
  canvasHeight: number,
  scaleFactor: number,
): Promise<void> {
  // Load image
  const img = await loadImage(layer.src);

  // Calculate position (percentage-first)
  const x =
    layer.xPercent !== undefined && layer.xPercent !== null
      ? Math.round(layer.xPercent * canvasWidth)
      : Math.round((layer.x || 0) * scaleFactor);
  const y =
    layer.yPercent !== undefined && layer.yPercent !== null
      ? Math.round(layer.yPercent * canvasHeight)
      : Math.round((layer.y || 0) * scaleFactor);

  // Calculate size (percentage-first)
  const width =
    layer.widthPercent !== undefined && layer.widthPercent !== null
      ? Math.round(layer.widthPercent * canvasWidth)
      : Math.round((layer.width || img.naturalWidth) * scaleFactor);
  const height =
    layer.heightPercent !== undefined && layer.heightPercent !== null
      ? Math.round(layer.heightPercent * canvasHeight)
      : Math.round((layer.height || img.naturalHeight) * scaleFactor);

  // Save context state
  ctx.save();

  // Apply opacity
  ctx.globalAlpha = layer.opacity;

  // Apply rotation
  if (layer.rotation !== 0) {
    const centerX = x + width / 2;
    const centerY = y + height / 2;
    ctx.translate(centerX, centerY);
    ctx.rotate((layer.rotation * Math.PI) / 180);
    ctx.translate(-centerX, -centerY);
  }

  // Apply mask (clip region)
  if (layer.mask && layer.mask.type !== "none") {
    applyMask(ctx, x, y, width, height, layer.mask);
  }

  // Calculate crop region
  const crop = layer.crop || { x: 0, y: 0, width: 1, height: 1 };
  const sourceX = crop.x * img.naturalWidth;
  const sourceY = crop.y * img.naturalHeight;
  const sourceWidth = crop.width * img.naturalWidth;
  const sourceHeight = crop.height * img.naturalHeight;

  // Calculate fit dimensions
  const fit = calculateFitDimensions(
    sourceWidth,
    sourceHeight,
    width,
    height,
    layer.fitMode,
  );

  // Draw image with crop and fit
  ctx.drawImage(
    img,
    sourceX,
    sourceY,
    sourceWidth,
    sourceHeight,
    x + fit.offsetX,
    y + fit.offsetY,
    fit.width,
    fit.height,
  );

  // Restore context state
  ctx.restore();
}
