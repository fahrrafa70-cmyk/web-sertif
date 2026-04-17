/**
 * Dynamic Variable Parser for Certificate Templates
 * Supports plain text and rich text variable replacement
 * Format: {variable_name} will be replaced with actual data
 */

import { RichText } from '@/types/rich-text';

/**
 * Extract all variable names from text
 * Example: "Name: {name}, Score: {score}" -> ["name", "score"]
 */
export function extractVariables(text: string): string[] {
  const regex = /\{(\w+)\}/g;
  const variables: string[] = [];
  let match;
  
  while ((match = regex.exec(text)) !== null) {
    const varName = match[1];
    if (!variables.includes(varName)) {
      variables.push(varName);
    }
  }
  
  return variables;
}

/**
 * Extract variables from rich text
 */
export function extractVariablesFromRichText(richText: RichText): string[] {
  const allVariables: string[] = [];
  
  for (const span of richText) {
    const spanVariables = extractVariables(span.text);
    for (const variable of spanVariables) {
      if (!allVariables.includes(variable)) {
        allVariables.push(variable);
      }
    }
  }
  
  return allVariables;
}

/**
 * Check if text contains variables
 */
export function hasVariables(text: string): boolean {
  return /\{(\w+)\}/.test(text);
}

/**
 * Check if rich text contains variables
 */
export function richTextHasVariables(richText: RichText): boolean {
  return richText.some(span => hasVariables(span.text));
}

/**
 * Replace variables in plain text with actual data
 * - Case-insensitive key matching (e.g. {NAMA} matches "nama" excel header)
 * - Replaces missing/empty variables with empty string (no raw {VAR} printed on certificate)
 */
export function replaceVariables(
  text: string, 
  data: Record<string, string | undefined>,
  fallback: string = '' // what to put when a variable has no data
): string {
  try {
    // Build a lowercase key map once for efficient case-insensitive lookup
    const normalizedData: Record<string, string> = {};
    for (const [k, v] of Object.entries(data)) {
      normalizedData[k.trim().toLowerCase()] = v?.trim() ?? '';
    }

    return text.replace(/\{(\w+)\}/g, (match, key) => {
      const normalizedKey = key.toLowerCase();
      // Exact match first, then case-insensitive
      const value = data[key] ?? data[key.trim()] ?? normalizedData[normalizedKey];
      if (value !== undefined && value !== null && String(value).trim() !== '') {
        return String(value).trim();
      }
      // Missing data: return fallback (empty string) instead of raw {VARIABLE}
      return fallback;
    });
  } catch {
    return text;
  }
}

/**
 * Replace variables in rich text while preserving formatting.
 * Spans that end up empty after variable replacement are filtered out
 * so no blank bold/italic segments appear on the certificate.
 */
export function replaceVariablesInRichText(
  richText: RichText,
  data: Record<string, string | undefined>
): RichText {
  try {
    const clonedRichText: RichText = JSON.parse(JSON.stringify(richText));
    
    return clonedRichText
      .map(span => {
        if (!hasVariables(span.text)) {
          return span;
        }
        const newText = replaceVariables(span.text, data, '');
        return { ...span, text: newText };
      })
      // Filter out spans that became completely empty after variable replacement
      // This prevents invisible empty <span> elements with bold/italic styling
      .filter(span => span.text.trim().length > 0);
  } catch {
    return richText;
  }
}

/**
 * Generate sample data for variables (for preview purposes)
 */
export function generateSampleData(variables: string[]): Record<string, string> {
  const sampleData: Record<string, string> = {};
  
  for (const variable of variables) {
    const lowerVar = variable.toLowerCase();
    
    if (lowerVar.includes('name') || lowerVar.includes('nama')) {
      sampleData[variable] = 'John Doe';
    } else if (lowerVar.includes('score') || lowerVar.includes('nilai')) {
      sampleData[variable] = '85';
    } else if (lowerVar.includes('grade')) {
      sampleData[variable] = 'A';
    } else if (lowerVar.includes('date') || lowerVar.includes('tanggal')) {
      sampleData[variable] = new Date().toLocaleDateString();
    } else if (lowerVar.includes('status')) {
      sampleData[variable] = 'Lulus';
    } else if (lowerVar.includes('disiplin')) {
      sampleData[variable] = 'Baik';
    } else if (lowerVar.includes('kreativ')) {
      sampleData[variable] = 'Sangat Baik';
    } else if (lowerVar.includes('inisiatif')) {
      sampleData[variable] = 'Cukup';
    } else {
      sampleData[variable] = `[${variable}]`;
    }
  }
  
  return sampleData;
}

/**
 * Validate variable name (alphanumeric and underscore only)
 */
export function isValidVariableName(name: string): boolean {
  return /^\w+$/.test(name);
}

/**
 * Validate that all required variables in the template are present in data.
 * Returns a list of variable names that are missing or empty in the data.
 * Useful for warning the user BEFORE generating the certificate so they can
 * fix their Excel file rather than discovering the issue on the final export.
 *
 * Case-insensitive matching mirrors the replaceVariables() behavior.
 */
export function validateVariables(
  text: string,
  data: Record<string, string | undefined>
): string[] {
  const variableNames = extractVariables(text);
  const normalizedKeys = new Set(
    Object.keys(data).map(k => k.trim().toLowerCase())
  );

  return variableNames.filter(varName => {
    const value = data[varName] ?? data[varName.trim()] ?? undefined;
    if (value !== undefined && String(value).trim() !== '') return false;
    // Also check case-insensitive
    if (normalizedKeys.has(varName.toLowerCase())) {
      // It exists but might be empty
      const lowerMatched = Object.entries(data).find(
        ([k]) => k.trim().toLowerCase() === varName.toLowerCase()
      );
      return !lowerMatched || !String(lowerMatched[1] ?? '').trim();
    }
    return true; // Variable is truly missing
  });
}

/**
 * Process text layer with dynamic variables
 * Returns processed text with all variables replaced
 */
export function processTextWithVariables(
  text: string | undefined,
  richText: RichText | undefined,
  data: Record<string, string | undefined>,
  useRichText: boolean = false
): { processedText: string; processedRichText?: RichText } {
  if (!text && (!richText || richText.length === 0)) {
    return { processedText: '' };
  }
  
  if (useRichText && richText && richText.length > 0) {
    const processedRichText = replaceVariablesInRichText(richText, data);
    const processedText = processedRichText.map(span => span.text).join('');
    return { processedText, processedRichText };
  } else if (text) {
    const processedText = replaceVariables(text, data);
    return { processedText };
  }
  
  return { processedText: text || '' };
}

/**
 * Merge multiple data sources for variable replacement
 * Priority: specificData > commonData > fallbackData
 */
export function mergeVariableData(
  ...dataSources: Array<Record<string, string | undefined> | undefined>
): Record<string, string | undefined> {
  const merged: Record<string, string | undefined> = {};
  
  for (let i = dataSources.length - 1; i >= 0; i--) {
    const source = dataSources[i];
    if (source) {
      Object.assign(merged, source);
    }
  }
  
  return merged;
}

/**
 * Extract variables from text layer config
 */
export function extractVariablesFromLayer(layer: {
  defaultText?: string;
  richText?: RichText;
}): string[] {
  const variables: string[] = [];
  
  if (layer.defaultText) {
    const textVars = extractVariables(layer.defaultText);
    for (const v of textVars) {
      if (!variables.includes(v)) {
        variables.push(v);
      }
    }
  }
  
  if (layer.richText) {
    const richVars = extractVariablesFromRichText(layer.richText);
    for (const v of richVars) {
      if (!variables.includes(v)) {
        variables.push(v);
      }
    }
  }
  
  return variables;
}
