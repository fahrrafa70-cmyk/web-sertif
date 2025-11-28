/**
 * Excel Column Auto-Mapping Utilities
 * Provides fuzzy matching and similarity scoring for automatic column mapping
 */

import { TextLayerConfig } from "@/types/template-layout";

/**
 * Normalize string for comparison
 * Converts to lowercase and removes spaces, underscores, and hyphens
 */
export function normalizeString(str: string): string {
  return str
    .toLowerCase()
    .replace(/[_\s-]/g, "")
    .trim();
}

/**
 * Calculate Levenshtein distance between two strings
 * Returns the minimum number of single-character edits required to change one string into the other
 */
export function levenshteinDistance(str1: string, str2: string): number {
  const len1 = str1.length;
  const len2 = str2.length;

  // Create a 2D array for dynamic programming
  const dp: number[][] = Array(len1 + 1)
    .fill(null)
    .map(() => Array(len2 + 1).fill(0));

  // Initialize base cases
  for (let i = 0; i <= len1; i++) dp[i][0] = i;
  for (let j = 0; j <= len2; j++) dp[0][j] = j;

  // Fill the dp table
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1, // deletion
          dp[i][j - 1] + 1, // insertion
          dp[i - 1][j - 1] + 1, // substitution
        );
      }
    }
  }

  return dp[len1][len2];
}

/**
 * Calculate similarity score between two strings (0 to 1)
 * Uses combination of exact match, substring match, and Levenshtein distance
 */
export function calculateSimilarity(str1: string, str2: string): number {
  const norm1 = normalizeString(str1);
  const norm2 = normalizeString(str2);

  // Exact match
  if (norm1 === norm2) return 1.0;

  // Substring match
  if (norm1.includes(norm2) || norm2.includes(norm1)) {
    // Partial match based on length ratio
    const minLen = Math.min(norm1.length, norm2.length);
    const maxLen = Math.max(norm1.length, norm2.length);
    return 0.85 * (minLen / maxLen);
  }

  // Levenshtein distance similarity
  const maxLen = Math.max(norm1.length, norm2.length);
  if (maxLen === 0) return 0;

  const distance = levenshteinDistance(norm1, norm2);
  return Math.max(0, 1 - distance / maxLen);
}

/**
 * Auto-map Excel columns to text layer IDs
 * Returns a mapping of layerId -> excelColumnName
 */
export function autoMapColumns(
  excelColumns: string[],
  textLayers: TextLayerConfig[],
  threshold: number = 0.6,
): Record<string, string> {
  const mapping: Record<string, string> = {};
  const usedColumns = new Set<string>();

  for (const layer of textLayers) {
    // Skip default layers that shouldn't be mapped
    if (
      layer.useDefaultText ||
      ["issue_date", "expired_date"].includes(layer.id)
    ) {
      continue;
    }

    // Note: certificate_no is now included for Excel mapping
    // This allows certificate numbers to be sourced from Excel columns

    let bestMatch: string | null = null;
    let bestScore = 0;

    // Find best matching column
    for (const col of excelColumns) {
      // Skip already used columns
      if (usedColumns.has(col)) continue;

      const score = calculateSimilarity(layer.id, col);

      if (score > bestScore && score >= threshold) {
        bestScore = score;
        bestMatch = col;
      }
    }

    if (bestMatch) {
      mapping[layer.id] = bestMatch;
      usedColumns.add(bestMatch);
    }
  }

  return mapping;
}

/**
 * Validate that all required fields are mapped
 */
export function validateMapping(
  mapping: Record<string, string>,
  requiredLayers: TextLayerConfig[],
): { valid: boolean; missing: string[] } {
  const missing: string[] = [];

  for (const layer of requiredLayers) {
    // Skip optional or auto-generated fields
    if (
      layer.useDefaultText ||
      ["issue_date", "expired_date"].includes(layer.id)
    ) {
      continue;
    }

    // Note: certificate_no is now included in validation for Excel mapping

    if (!mapping[layer.id] || mapping[layer.id].trim() === "") {
      missing.push(layer.id);
    }
  }

  return {
    valid: missing.length === 0,
    missing,
  };
}

/**
 * Transform Excel row data using column mapping
 */
export function transformExcelRow(
  row: Record<string, unknown>,
  mapping: Record<string, string>,
): Record<string, unknown> {
  const transformed: Record<string, unknown> = { ...row };

  for (const [layerId, excelCol] of Object.entries(mapping)) {
    transformed[layerId] = row[excelCol];
  }

  return transformed;
}

/**
 * Merge two Excel datasets (main + score) by row index
 */
export function mergeExcelData(
  mainData: Array<Record<string, unknown>>,
  scoreData: Array<Record<string, unknown>>,
  mainMapping: Record<string, string>,
  scoreMapping: Record<string, string>,
): Array<Record<string, unknown>> {
  const rowCount = Math.min(mainData.length, scoreData.length);

  return Array.from({ length: rowCount }, (_, idx) => {
    const mainRow = mainData[idx];
    const scoreRow = scoreData[idx];

    // Start with original main row (like non-dual template approach)
    const merged: Record<string, unknown> = { ...mainRow };

    // Map main data
    for (const [layerId, excelCol] of Object.entries(mainMapping)) {
      merged[layerId] = mainRow[excelCol];
    }

    // Map score data
    for (const [layerId, excelCol] of Object.entries(scoreMapping)) {
      merged[layerId] = scoreRow[excelCol];
    }

    return merged;
  });
}

/**
 * Format layer ID to readable label
 * For pure dynamic variables (extracted variables), show with brackets
 * For regular text layers (even if they contain variables), show as title case
 */
export function formatFieldLabel(
  layerId: string,
  field?: { defaultText?: string },
): string {
  // Already has brackets, keep as-is
  if (layerId.includes("{") || layerId.includes("}")) {
    return layerId;
  }

  // Check if this is a PURE dynamic variable field (created by createVariableFields)
  // Pure variable: defaultText is exactly "{varName}" (nothing else)
  // NOT pure variable: defaultText contains text with variables like "Siswa dari {perusahaan}"
  if (field?.defaultText) {
    const trimmed = field.defaultText.trim();
    // Check if defaultText is EXACTLY "{layerId}" - this is a pure variable field
    if (trimmed === `{${layerId}}`) {
      return `{${layerId}}`;
    }
  }

  // Convert to title case for regular text layers
  return layerId
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
