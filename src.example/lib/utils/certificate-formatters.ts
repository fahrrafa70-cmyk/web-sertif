/**
 * Utility functions for certificate formatting
 * Extracted from src/app/templates/generate/page.tsx
 * Date: October 29, 2025
 */

/**
 * Get predikat (grade label) based on numerical score
 * @param nilai - Score value (0-100)
 * @returns Predikat label (Sangat Baik, Baik, Kurang Baik, Tidak Valid)
 * 
 * @example
 * getPredikat(95) // "Sangat Baik"
 * getPredikat(80) // "Baik"
 * getPredikat(50) // "Kurang Baik"
 */
export function getPredikat(nilai: number): string {
  if (nilai >= 90 && nilai <= 100) return "Sangat Baik";
  if (nilai >= 75 && nilai <= 89) return "Baik";
  if (nilai >= 0 && nilai <= 74) return "Kurang Baik";
  return "Tidak Valid";
}

/**
 * Format nilai prestasi with predikat label
 * @param nilai - Score as string (e.g., "80.5" or "80")
 * @returns Formatted string like "80.5 (Baik)" or empty string if invalid
 * 
 * @example
 * formatNilaiPrestasi("85") // "85 (Baik)"
 * formatNilaiPrestasi("95.5") // "95.5 (Sangat Baik)"
 * formatNilaiPrestasi("") // ""
 */
export function formatNilaiPrestasi(nilai: string): string {
  if (!nilai || nilai.trim() === '') return '';
  
  // Extract numeric value from input (e.g., "80.5" or "80")
  const numericValue = parseFloat(nilai);
  if (isNaN(numericValue)) return nilai;
  
  const predikat = getPredikat(numericValue);
  return `${numericValue} (${predikat})`;
}

/**
 * Format ISO date string to various display formats
 * @param iso - ISO date string (yyyy-mm-dd)
 * @param fmt - Format code (e.g., 'dd-mm-yyyy', 'dd-indonesian-yyyy')
 * @returns Formatted date string
 * 
 * @example
 * formatDateString('2024-01-15', 'dd-mm-yyyy') // "15-01-2024"
 * formatDateString('2024-01-15', 'dd-indonesian-yyyy') // "15 Januari 2024"
 * formatDateString('', 'dd-mm-yyyy') // ""
 */
export function formatDateString(iso: string, fmt: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  const mmm = d.toLocaleString('en-US', { month: 'short' });
  const mmmm = d.toLocaleString('en-US', { month: 'long' });
  
  // Indonesian month names
  const indonesianMonths = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];
  const indonesianMonth = indonesianMonths[d.getMonth()];
  
  switch (fmt) {
    case 'dd-mm-yyyy': return `${dd}-${mm}-${yyyy}`;
    case 'mm-dd-yyyy': return `${mm}-${dd}-${yyyy}`;
    case 'yyyy-mm-dd': return `${yyyy}-${mm}-${dd}`;
    case 'dd-mmm-yyyy': return `${dd} ${mmm} ${yyyy}`;
    case 'dd-mmmm-yyyy': return `${dd} ${mmmm} ${yyyy}`;
    case 'mmm-dd-yyyy': return `${mmm} ${dd}, ${yyyy}`;
    case 'mmmm-dd-yyyy': return `${mmmm} ${dd}, ${yyyy}`;
    case 'dd/mm/yyyy': return `${dd}/${mm}/${yyyy}`;
    case 'mm/dd/yyyy': return `${mm}/${dd}/${yyyy}`;
    case 'yyyy/mm/dd': return `${yyyy}/${mm}/${dd}`;
    case 'dd-indonesian-yyyy': return `${dd} ${indonesianMonth} ${yyyy}`;
    default: return iso;
  }
}

/**
 * Convert Excel date serial number or string to ISO date
 * Excel stores dates as serial numbers (days since 1900-01-01)
 * 
 * @param val - Excel date value (number or string)
 * @returns ISO date string (yyyy-mm-dd) or empty string
 * 
 * @example
 * excelDateToISO(44927) // "2023-01-01"
 * excelDateToISO("2024-01-15") // "2024-01-15"
 * excelDateToISO(null) // ""
 */
export function excelDateToISO(val: unknown): string {
  if (val == null || (typeof val === "string" && val === "")) return "";
  
  if (typeof val === "number") {
    // Excel serial date (days since 1900-01-01, with leap year bug)
    // Subtract 25569 to convert to Unix epoch, then multiply by milliseconds per day
    const d = new Date((val - 25569) * 86400 * 1000);
    return d.toISOString().split("T")[0];
  }
  
  if (typeof val === "string") {
    const parsed = Date.parse(val);
    if (!isNaN(parsed)) {
      return new Date(parsed).toISOString().split("T")[0];
    }
  }
  
  return String(val);
}

