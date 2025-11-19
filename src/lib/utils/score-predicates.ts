/**
 * Utility functions for automatically determining score predicates
 */

export interface ScorePredicateConfig {
  minScore: number;
  maxScore: number;
  predicate: string;
}

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
  if (score === null || score === undefined || score === '') {
    return '';
  }

  const numericScore = typeof score === 'string' ? parseFloat(score) : score;

  // Silently return empty for non-numeric values - they're valid text
  if (isNaN(numericScore)) {
    return '';
  }

  for (const range of config) {
    if (numericScore >= range.minScore && numericScore <= range.maxScore) {
      return range.predicate;
    }
  }

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

  // Only process if 'nilai' is actually a numeric field
  if (result.nilai && (!result.prestasi || result.prestasi.trim() === '')) {
    const numericNilai = parseFloat(result.nilai);
    if (!isNaN(numericNilai)) {
      const predicate = getScorePredicate(result.nilai);
      if (predicate) {
        result.prestasi = predicate;
      }
    }
    // Silently ignore non-numeric nilai values
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
