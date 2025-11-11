/**
 * Excel Column Mapping Utilities
 * For dual template Excel import with flexible column mapping
 */

import { TextLayerConfig } from "@/types/template-layout";

/**
 * Normalize column name for flexible matching
 * Example: "Nilai Teori" → "nilai_teori"
 */
export function normalizeColumnName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '_')          // spaces → underscore
    .replace(/[^\w]/g, '')         // remove special chars
    .replace(/_+/g, '_')           // multiple underscores → single
    .replace(/^_|_$/g, '');        // trim underscores
}

/**
 * Build column mapping from Excel row
 * Maps normalized column names to original column names
 */
export function buildColumnMapping(excelRow: Record<string, any>): Record<string, string> {
  const mapping: Record<string, string> = {};
  
  Object.keys(excelRow).forEach(columnName => {
    // Skip system columns
    if (columnName.startsWith('__EMPTY')) return;
    
    const normalized = normalizeColumnName(columnName);
    mapping[normalized] = columnName;
  });
  
  return mapping;
}

/**
 * Calculate similarity between two strings (simple Levenshtein-like)
 */
function calculateSimilarity(str1: string, str2: string): number {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;
  
  if (longer.length === 0) return 1.0;
  
  const editDistance = levenshteinDistance(longer, shorter);
  return (longer.length - editDistance) / longer.length;
}

/**
 * Levenshtein distance algorithm
 */
function levenshteinDistance(str1: string, str2: string): number {
  const matrix: number[][] = [];
  
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  
  return matrix[str2.length][str1.length];
}

/**
 * Find similar column name (for typo detection)
 */
export function findSimilarColumn(
  availableColumns: string[],
  targetColumn: string,
  threshold: number = 0.7
): string | null {
  const normalizedTarget = normalizeColumnName(targetColumn);
  let bestMatch: string | null = null;
  let bestScore = 0;
  
  availableColumns.forEach(col => {
    const normalizedCol = normalizeColumnName(col);
    const score = calculateSimilarity(normalizedCol, normalizedTarget);
    
    if (score > threshold && score > bestScore) {
      bestScore = score;
      bestMatch = col;
    }
  });
  
  return bestMatch;
}

/**
 * Detect extra/unknown columns in Excel
 */
export function detectExtraColumns(
  excelRow: Record<string, any>,
  expectedColumns: string[]
): { extra: string[]; similar: Record<string, string> } {
  const excelColumns = Object.keys(excelRow).filter(col => !col.startsWith('__EMPTY'));
  const extra: string[] = [];
  const similar: Record<string, string> = {};
  
  excelColumns.forEach(col => {
    const normalized = normalizeColumnName(col);
    const isExpected = expectedColumns.some(exp => 
      normalizeColumnName(exp) === normalized
    );
    
    if (!isExpected) {
      // Check if similar to any expected column
      const suggestion = findSimilarColumn(expectedColumns, col);
      
      if (suggestion) {
        similar[col] = suggestion;
      } else {
        extra.push(col);
      }
    }
  });
  
  return { extra, similar };
}

/**
 * Match certificate and score rows by identifier with smart matching
 * @param certificateData - Certificate Excel data
 * @param scoreData - Score Excel data
 * @param enableSmartMatching - Enable fuzzy name matching (default: true)
 * @param similarityThreshold - Minimum similarity score for fuzzy matching (default: 0.8)
 */
export function matchExcelRows(
  certificateData: Array<Record<string, any>>,
  scoreData: Array<Record<string, any>>,
  enableSmartMatching: boolean = true,
  similarityThreshold: number = 0.8
): {
  matched: Array<{ cert: Record<string, any>; score: Record<string, any>; matchType: string }>;
  unmatched: Array<Record<string, any>>;
} {
  const matched: Array<{ cert: Record<string, any>; score: Record<string, any>; matchType: string }> = [];
  const unmatched: Array<Record<string, any>> = [];
  
  console.log('🔍 Matching Excel Rows (Smart Matching):', {
    certificateCount: certificateData.length,
    scoreCount: scoreData.length,
    certColumns: Object.keys(certificateData[0] || {}),
    scoreColumns: Object.keys(scoreData[0] || {}),
    smartMatchingEnabled: enableSmartMatching,
    similarityThreshold
  });
  
  const usedScoreIndices = new Set<number>(); // Track used score rows
  
  certificateData.forEach(certRow => {
    const certNo = String(certRow.certificate_no || '').trim();
    const certName = String(certRow.name || '').trim();
    
    // Try exact matching first
    let scoreRowIndex = scoreData.findIndex((s, index) => {
      if (usedScoreIndices.has(index)) return false; // Skip already matched rows
      
      const scoreCertNo = String(s.certificate_no || '').trim();
      const scoreName = String(s.name || '').trim();
      
      // Match by certificate_no (highest priority)
      if (certNo && scoreCertNo && certNo === scoreCertNo) {
        return true;
      }
      
      // Match by exact name (case-insensitive)
      if (certName && scoreName && certName.toLowerCase() === scoreName.toLowerCase()) {
        return true;
      }
      
      return false;
    });
    
    let matchType = 'exact';
    
    // If no exact match and smart matching enabled, try fuzzy matching
    if (scoreRowIndex === -1 && enableSmartMatching && certName) {
      let bestMatchIndex = -1;
      let bestSimilarity = 0;
      
      scoreData.forEach((s, index) => {
        if (usedScoreIndices.has(index)) return; // Skip already matched rows
        
        const scoreName = String(s.name || '').trim();
        if (!scoreName) return;
        
        const similarity = calculateSimilarity(
          certName.toLowerCase(),
          scoreName.toLowerCase()
        );
        
        if (similarity >= similarityThreshold && similarity > bestSimilarity) {
          bestMatchIndex = index;
          bestSimilarity = similarity;
        }
      });
      
      if (bestMatchIndex !== -1) {
        scoreRowIndex = bestMatchIndex;
        matchType = `fuzzy (${(bestSimilarity * 100).toFixed(0)}% match)`;
        console.log(`🎯 Smart match found:`, {
          certificate: certName,
          score: scoreData[bestMatchIndex].name,
          similarity: `${(bestSimilarity * 100).toFixed(1)}%`
        });
      }
    }
    
    if (scoreRowIndex !== -1) {
      const scoreRow = scoreData[scoreRowIndex];
      matched.push({ cert: certRow, score: scoreRow, matchType });
      usedScoreIndices.add(scoreRowIndex); // Mark as used
    } else {
      unmatched.push(certRow);
      // Log unmatched for debugging
      console.warn('⚠️ No score match for:', {
        name: certRow.name,
        certificate_no: certRow.certificate_no,
        availableInScoreExcel: scoreData
          .filter((_, i) => !usedScoreIndices.has(i))
          .map(s => ({ name: s.name, cert_no: s.certificate_no }))
          .slice(0, 5) // Show first 5 available
      });
    }
  });
  
  console.log('✅ Matching Complete (Smart Matching):', {
    matched: matched.length,
    unmatched: unmatched.length,
    exactMatches: matched.filter(m => m.matchType === 'exact').length,
    fuzzyMatches: matched.filter(m => m.matchType.startsWith('fuzzy')).length,
    unmatchedNames: unmatched.map(u => u.name || u.certificate_no)
  });
  
  return { matched, unmatched };
}

/**
 * Extract score data from Excel row using column mapping
 */
export function extractScoreDataWithMapping(
  scoreRow: Record<string, any>,
  columnMapping: Record<string, string>
): Record<string, string> {
  const scoreData: Record<string, string> = {};
  
  Object.entries(columnMapping).forEach(([layerId, excelColumn]) => {
    if (excelColumn && scoreRow[excelColumn] !== undefined && scoreRow[excelColumn] !== null) {
      scoreData[layerId] = String(scoreRow[excelColumn]);
    }
  });
  
  return scoreData;
}

/**
 * Get score text layers that need user input (exclude default text layers)
 */
export function getUserInputScoreLayers(scoreLayers: TextLayerConfig[]): TextLayerConfig[] {
  return scoreLayers.filter(layer => {
    // Skip layers with useDefaultText flag
    if (layer.useDefaultText) return false;
    
    // Skip default certificate layers that shouldn't need input in score mode
    if (layer.id === 'issue_date' || layer.id === 'certificate_no' || layer.id === 'name') {
      return false;
    }
    
    return true;
  });
}
