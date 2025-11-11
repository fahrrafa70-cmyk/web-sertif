/**
 * Type definitions for Certificate Generator
 * Extracted from src/app/templates/generate/page.tsx
 * Date: October 29, 2025
 */

/**
 * Technical aspect evaluation for internship/training
 */
export interface AspekTeknis {
  no: number;
  standar_kompetensi: string;
  nilai: number;
}

/**
 * Non-technical aspect evaluation for internship/training
 */
export interface AspekNonTeknis {
  no: number;
  aspek: string;
  nilai: number;
}

/**
 * Complete score data for certificate back side
 */
export interface ScoreData {
  aspek_teknis: AspekTeknis[];
  aspek_non_teknis: AspekNonTeknis[];
  nilai_prestasi?: string | null;
  score_date?: string;
  date?: string;
  pembina: {
    nama: string;
    jabatan: string;
  };
  keterangan?: string;
}

/**
 * Certificate data for the front side
 */
export type CertificateData = {
  certificate_no: string;
  name: string;
  description: string;
  issue_date: string;
  expired_date: string;
};

/**
 * Text layer for canvas overlay
 * Supports both absolute (x, y) and percentage-based (xPercent, yPercent) positioning
 */
export type TextLayer = {
  id: string;
  text: string;
  x: number;
  y: number;
  xPercent: number; // Normalized X position (0-1)
  yPercent: number; // Normalized Y position (0-1)
  fontSize: number;
  color: string;
  fontWeight: string;
  fontFamily: string;
  isEditing?: boolean;
};

/**
 * Overlay image for canvas (logos, signatures, decorations)
 */
export type OverlayImage = {
  id: string;
  url: string;
  x: number;
  y: number;
  width: number;
  height: number;
  aspectRatio: number;
};

/**
 * Date format options
 */
export type DateFormat =
  | 'dd-mm-yyyy'
  | 'mm-dd-yyyy'
  | 'yyyy-mm-dd'
  | 'dd-mmm-yyyy'
  | 'dd-mmmm-yyyy'
  | 'mmm-dd-yyyy'
  | 'mmmm-dd-yyyy'
  | 'dd/mm/yyyy'
  | 'mm/dd/yyyy'
  | 'yyyy/mm/dd'
  | 'dd-indonesian-yyyy';

/**
 * Available date formats for display
 */
export const DATE_FORMATS: DateFormat[] = [
  'dd-mm-yyyy',
  'mm-dd-yyyy',
  'yyyy-mm-dd',
  'dd-mmm-yyyy',
  'dd-mmmm-yyyy',
  'mmm-dd-yyyy',
  'mmmm-dd-yyyy',
  'dd/mm/yyyy',
  'mm/dd/yyyy',
  'yyyy/mm/dd',
  'dd-indonesian-yyyy',
];

