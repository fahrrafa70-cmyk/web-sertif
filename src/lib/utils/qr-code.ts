/**
 * QR Code Generation Utilities
 * Handles QR code generation for certificates
 */

import QRCode from "qrcode";
import type { QRCodeLayerConfig } from "@/types/template-layout";

/**
 * QR Code generation options
 */
export interface QRCodeGenerationOptions {
  width?: number; // QR code width in pixels
  height?: number; // QR code height in pixels
  errorCorrectionLevel?: "L" | "M" | "Q" | "H";
  margin?: number; // Margin in modules (default: 4)
  color?: {
    dark?: string; // Foreground color
    light?: string; // Background color
  };
}

/**
 * Generate QR code as Data URL
 * @param data - Data to encode in QR code
 * @param options - Generation options
 * @returns Promise<string> - Data URL of generated QR code
 */
export async function generateQRCodeDataURL(
  data: string,
  options: QRCodeGenerationOptions = {},
): Promise<string> {
  try {
    const qrOptions: QRCode.QRCodeToDataURLOptions = {
      errorCorrectionLevel: options.errorCorrectionLevel || "M",
      type: "image/png",
      width: options.width || 300,
      margin: options.margin ?? 4,
      color: {
        dark: options.color?.dark || "#000000",
        light: options.color?.light || "#FFFFFF",
      },
    };

    const dataURL = await QRCode.toDataURL(data, qrOptions);
    return dataURL;
  } catch (error) {
    console.error("Failed to generate QR code:", error);
    throw new Error("Failed to generate QR code");
  }
}

/**
 * Generate QR code as Buffer (for server-side)
 * @param data - Data to encode in QR code
 * @param options - Generation options
 * @returns Promise<Buffer> - Buffer of generated QR code PNG
 */
export async function generateQRCodeBuffer(
  data: string,
  options: QRCodeGenerationOptions = {},
): Promise<Buffer> {
  try {
    const qrOptions: QRCode.QRCodeToBufferOptions = {
      errorCorrectionLevel: options.errorCorrectionLevel || "M",
      type: "png",
      width: options.width || 300,
      margin: options.margin ?? 4,
      color: {
        dark: options.color?.dark || "#000000",
        light: options.color?.light || "#FFFFFF",
      },
    };

    const buffer = await QRCode.toBuffer(data, qrOptions);
    return buffer;
  } catch (error) {
    console.error("Failed to generate QR code buffer:", error);
    throw new Error("Failed to generate QR code buffer");
  }
}

/**
 * Generate QR code for certificate
 * Creates a QR code containing the certificate's public URL
 *
 * @param certificatePublicId - Certificate public ID
 * @param qrLayer - QR layer configuration
 * @returns Promise<string> - Data URL of generated QR code
 */
export async function generateCertificateQRCode(
  certificatePublicId: string,
  qrLayer: QRCodeLayerConfig,
): Promise<string> {
  // Get base URL from environment or window location
  const baseUrl =
    typeof window !== "undefined"
      ? window.location.origin
      : process.env.NEXT_PUBLIC_BASE_URL || "https://your-domain.com";

  // Generate certificate URL
  const certificateUrl = `${baseUrl}/certificate/${certificatePublicId}`;

  // Generate QR code with dynamic sizing based on layer configuration
  // Use layer's actual dimensions but ensure minimum quality
  const minQRSize = 150; // Minimum size for readability
  const maxQRSize = 800; // Maximum size to prevent memory issues
  const layerSize = Math.max(qrLayer.width || 200, qrLayer.height || 200);
  const optimalSize = Math.max(minQRSize, Math.min(maxQRSize, layerSize));

  const dataURL = await generateQRCodeDataURL(certificateUrl, {
    width: optimalSize,
    height: optimalSize,
    errorCorrectionLevel: qrLayer.errorCorrectionLevel || "M",
    margin: qrLayer.margin ?? 4,
  });

  return dataURL;
}

/**
 * Replace QR data placeholder with actual certificate URL
 * Supports {{CERTIFICATE_URL}} placeholder
 *
 * @param qrData - QR data with potential placeholders
 * @param certificatePublicId - Certificate public ID
 * @returns Processed QR data
 */
export function processQRDataPlaceholder(
  qrData: string,
  certificatePublicId: string,
): string {
  const baseUrl =
    typeof window !== "undefined"
      ? window.location.origin
      : process.env.NEXT_PUBLIC_BASE_URL || "https://your-domain.com";

  const certificateUrl = `${baseUrl}/certificate/${certificatePublicId}`;

  // Replace placeholder
  return qrData.replace(/\{\{CERTIFICATE_URL\}\}/g, certificateUrl);
}

/**
 * Validate QR code data
 * @param data - Data to validate
 * @returns boolean - True if valid
 */
export function validateQRData(data: string): boolean {
  if (!data || typeof data !== "string") {
    return false;
  }

  // Check if data is not too long (QR code has limits)
  // Max data capacity varies by error correction level and version
  // For safety, limit to 2000 characters
  if (data.length > 2000) {
    return false;
  }

  return true;
}

/**
 * Get QR code capacity info
 * Returns the approximate maximum data capacity for different error correction levels
 */
export function getQRCodeCapacity() {
  return {
    L: { numeric: 7089, alphanumeric: 4296, binary: 2953 },
    M: { numeric: 5596, alphanumeric: 3391, binary: 2331 },
    Q: { numeric: 3993, alphanumeric: 2420, binary: 1663 },
    H: { numeric: 3057, alphanumeric: 1852, binary: 1273 },
  };
}

/**
 * Calculate optimal QR code size based on template dimensions
 * @param templateWidth - Template width in pixels
 * @param templateHeight - Template height in pixels
 * @param sizePercent - Desired size as percentage of template width (default: 0.1 = 10%)
 * @returns Recommended QR code size in pixels
 */
export function calculateOptimalQRSize(
  templateWidth: number,
  templateHeight: number,
  sizePercent: number = 0.1,
): number {
  // Calculate size based on width
  const size = Math.round(templateWidth * sizePercent);

  // Ensure minimum size of 100px and maximum of 500px
  return Math.max(100, Math.min(500, size));
}
