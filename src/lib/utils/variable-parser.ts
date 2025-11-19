/**
 * Dynamic Variable Parser for Certificate Templates
 * Supports plain text and rich text variable replacement
 * Format: {variable_name} will be replaced with actual data
 */

import { RichText, TextSpan } from '@/types/rich-text';

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
 * Preserves original text if no data available
 */
export function replaceVariables(
  text: string, 
  data: Record<string, string | undefined>
): string {
  try {
    return text.replace(/\{(\w+)\}/g, (match, key) => {
      const value = data[key];
      // Only replace if data exists and is not empty
      if (value !== undefined && value !== null && String(value).trim() !== '') {
        return String(value);
      }
      // Keep original variable placeholder if no data
      return match;
    });
  } catch (error) {
    console.error('Variable replacement error:', error);
    return text; // Return original text on error
  }
}

/**
 * Replace variables in rich text while preserving formatting
 * Each variable inherits the formatting of its placeholder
 */
export function replaceVariablesInRichText(
  richText: RichText,
  data: Record<string, string | undefined>
): RichText {
  try {
    // Deep clone to avoid mutating original
    const clonedRichText: RichText = JSON.parse(JSON.stringify(richText));
    
    return clonedRichText.map(span => {
      // Check if span contains variables
      if (!hasVariables(span.text)) {
        return span;
      }
      
      // Replace variables while preserving all formatting
      const newText = replaceVariables(span.text, data);
      
      return {
        ...span,  // Preserve all formatting (color, fontWeight, fontSize, etc.)
        text: newText  // Only replace the text content
      };
    });
  } catch (error) {
    console.error('Rich text variable replacement error:', error);
    return richText; // Return original rich text on error
  }
}

/**
 * Generate sample data for variables (for preview purposes)
 */
export function generateSampleData(variables: string[]): Record<string, string> {
  const sampleData: Record<string, string> = {};
  
  for (const variable of variables) {
    // Generate contextual sample data based on variable name
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
      // Generic sample
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
 * Process text layer with dynamic variables
 * Returns processed text with all variables replaced
 */
export function processTextWithVariables(
  text: string | undefined,
  richText: RichText | undefined,
  data: Record<string, string | undefined>,
  useRichText: boolean = false
): { processedText: string; processedRichText?: RichText } {
  // If no text provided, return empty
  if (!text && (!richText || richText.length === 0)) {
    return { processedText: '' };
  }
  
  // Process based on text type
  if (useRichText && richText && richText.length > 0) {
    // Rich text processing
    const processedRichText = replaceVariablesInRichText(richText, data);
    const processedText = processedRichText.map(span => span.text).join('');
    return { processedText, processedRichText };
  } else if (text) {
    // Plain text processing
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
  
  // Merge in reverse order so first sources have priority
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
 * Checks both defaultText and richText
 */
export function extractVariablesFromLayer(layer: {
  defaultText?: string;
  richText?: RichText;
}): string[] {
  const variables: string[] = [];
  
  // Extract from defaultText
  if (layer.defaultText) {
    const textVars = extractVariables(layer.defaultText);
    for (const v of textVars) {
      if (!variables.includes(v)) {
        variables.push(v);
      }
    }
  }
  
  // Extract from richText
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
