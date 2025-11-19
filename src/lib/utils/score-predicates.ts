/**
 * Utility functions for automatically determining score predicates
 * Based on score ranges: 90-100 = SANGAT BAIK, 75-89 = BAIK, 0-74 = KURANG BAIK
 */

export interface ScorePredicateConfig {
  minScore: number;
  maxScore: number;
  predicate: string;
}

// Default predicate configuration based on the image
export const DEFAULT_PREDICATE_CONFIG: ScorePredicateConfig[] = [
  { minScore: 90, maxScore: 100, predicate: 'SANGAT BAIK' },
  { minScore: 75, maxScore: 89, predicate: 'BAIK' },
  { minScore: 0, maxScore: 74, predicate: 'KURANG BAIK' }
];

/**
 * Determine predicate based on score value
 * @param score - The score value (can be number or string)
 * @param config - Optional custom predicate configuration
 * @returns The predicate string (SANGAT BAIK, BAIK, or KURANG BAIK)
 */
export function getScorePredicate(
  score: number | string | null | undefined,
  config: ScorePredicateConfig[] = DEFAULT_PREDICATE_CONFIG
): string {
  // Handle null/undefined
  if (score === null || score === undefined || score === '') {
    return '';
  }

  // Convert to number
  const numericScore = typeof score === 'string' ? parseFloat(score) : score;

  // Validate number (silently return empty for non-numeric values - they're valid text)
  if (isNaN(numericScore)) {
    return '';
  }

  // Find matching predicate
  for (const range of config) {
    if (numericScore >= range.minScore && numericScore <= range.maxScore) {
      return range.predicate;
    }
  }

  // If no match found, return empty string
  console.warn(`Score ${numericScore} does not match any predicate range`);
  return '';
}

/**
 * Auto-populate prestasi field based on nilai field
 * This function looks for 'nilai' field in scoreData and automatically
 * sets the 'prestasi' field based on the score
 * 
 * IMPORTANT: Only processes numeric 'nilai' field. Ignores text values from dynamic variables.
 * 
 * @param scoreData - The score data object
 * @returns Updated score data with auto-populated prestasi
 */
export function autoPopulatePrestasi(
  scoreData: Record<string, string> | undefined
): Record<string, string> {
  if (!scoreData) return {};

  const result = { ...scoreData };

  // Check if 'nilai' exists and 'prestasi' is empty or not set
  // Only process if 'nilai' is actually a numeric field
  if (result.nilai && (!result.prestasi || result.prestasi.trim() === '')) {
    // Check if nilai is numeric before processing
    const numericNilai = parseFloat(result.nilai);
    if (!isNaN(numericNilai)) {
      const predicate = getScorePredicate(result.nilai);
      if (predicate) {
        result.prestasi = predicate;
        console.log(`✨ Auto-populated prestasi: ${result.nilai} → ${predicate}`);
      }
    }
    // Silently ignore non-numeric nilai values (they're likely text variables)
  }

  return result;
}

/**
 * Batch process score data for multiple members
 * Auto-populates prestasi for all members based on their nilai
 * 
 * @param scoreDataMap - Map of member_id to score data
 * @returns Updated score data map with auto-populated prestasi
 */
export function batchAutoPopulatePrestasi(
  scoreDataMap: Record<string, Record<string, string>>
): Record<string, Record<string, string>> {
  const result: Record<string, Record<string, string>> = {};

  for (const [memberId, scoreData] of Object.entries(scoreDataMap)) {
    result[memberId] = autoPopulatePrestasi(scoreData);
  }

  return result;
}
