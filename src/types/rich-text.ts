/**
 * Rich Text Types and Helper Functions
 * Supports inline formatting like Word/Google Docs
 */

export interface TextSpan {
  text: string;
  fontWeight?: string;
  fontFamily?: string;
  fontSize?: number;
  color?: string;
  textAlign?: 'left' | 'center' | 'right' | 'justify';
}

export type RichText = TextSpan[];

/**
 * Apply style to a range of text in rich text array
 */
export function applyStyleToRange(
  richText: RichText,
  startOffset: number,
  endOffset: number,
  style: Partial<Omit<TextSpan, 'text'>>
): RichText {
  if (startOffset === endOffset) return richText;
  
  const newRichText: RichText = [];
  let currentOffset = 0;
  
  for (const span of richText) {
    const spanStart = currentOffset;
    const spanEnd = currentOffset + span.text.length;
    
    // Span is completely before selection
    if (spanEnd <= startOffset) {
      newRichText.push(span);
      currentOffset = spanEnd;
      continue;
    }
    
    // Span is completely after selection
    if (spanStart >= endOffset) {
      newRichText.push(span);
      currentOffset = spanEnd;
      continue;
    }
    
    // Span overlaps with selection
    const overlapStart = Math.max(spanStart, startOffset);
    const overlapEnd = Math.min(spanEnd, endOffset);
    
    // Before overlap
    if (overlapStart > spanStart) {
      newRichText.push({
        ...span,
        text: span.text.slice(0, overlapStart - spanStart)
      });
    }
    
    // Overlap (apply style)
    newRichText.push({
      ...span,
      ...style,
      text: span.text.slice(overlapStart - spanStart, overlapEnd - spanStart)
    });
    
    // After overlap
    if (overlapEnd < spanEnd) {
      newRichText.push({
        ...span,
        text: span.text.slice(overlapEnd - spanStart)
      });
    }
    
    currentOffset = spanEnd;
  }
  
  return mergeAdjacentSpans(newRichText);
}

/**
 * Merge adjacent spans with identical styles
 */
export function mergeAdjacentSpans(richText: RichText): RichText {
  if (richText.length <= 1) return richText;
  
  const merged: RichText = [richText[0]];
  
  for (let i = 1; i < richText.length; i++) {
    const prev = merged[merged.length - 1];
    const curr = richText[i];
    
    // Check if styles are identical
    const stylesMatch = 
      prev.fontWeight === curr.fontWeight &&
      prev.fontFamily === curr.fontFamily &&
      prev.fontSize === curr.fontSize &&
      prev.color === curr.color &&
      prev.textAlign === curr.textAlign;
    
    if (stylesMatch) {
      // Merge text
      prev.text += curr.text;
    } else {
      merged.push(curr);
    }
  }
  
  return merged;
}

/**
 * Get common style value for a range
 * Returns undefined if values are mixed
 */
export function getCommonStyleValue<K extends keyof Omit<TextSpan, 'text'>>(
  richText: RichText,
  startOffset: number,
  endOffset: number,
  styleKey: K
): TextSpan[K] | 'mixed' | undefined {
  if (startOffset === endOffset) return undefined;
  
  let commonValue: TextSpan[K] | undefined;
  let currentOffset = 0;
  let hasValue = false;
  
  for (const span of richText) {
    const spanStart = currentOffset;
    const spanEnd = currentOffset + span.text.length;
    
    // Skip spans outside selection
    if (spanEnd <= startOffset || spanStart >= endOffset) {
      currentOffset = spanEnd;
      continue;
    }
    
    const value = span[styleKey];
    
    if (!hasValue) {
      commonValue = value;
      hasValue = true;
    } else if (commonValue !== value) {
      return 'mixed';
    }
    
    currentOffset = spanEnd;
  }
  
  return commonValue;
}

/**
 * Convert RichText to plain text
 */
export function richTextToPlainText(richText: RichText): string {
  return richText.map(span => span.text).join('');
}

/**
 * Convert plain text to RichText with base style
 */
export function plainTextToRichText(text: string, baseStyle?: Partial<Omit<TextSpan, 'text'>>): RichText {
  return [{ text, ...baseStyle }];
}

/**
 * Check if entire richText has mixed values for a style property
 * Used for dropdown display when no text is selected
 */
export function hasMixedStyle<K extends keyof Omit<TextSpan, 'text'>>(
  richText: RichText,
  styleKey: K
): boolean {
  if (richText.length <= 1) return false;
  
  // Get all unique values for this style key (excluding undefined)
  const values = new Set(
    richText
      .map(span => span[styleKey])
      .filter(val => val !== undefined)
  );
  
  // Mixed if there are 2 or more different values
  return values.size > 1;
}

/**
 * Get selection offsets from DOM selection
 */
export function getSelectionOffsets(element: HTMLElement): { start: number; end: number } | null {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return null;
  
  const range = selection.getRangeAt(0);
  
  // Check if selection is within the element
  if (!element.contains(range.commonAncestorContainer)) return null;
  
  // Create a range from start of element to start of selection
  const preRange = document.createRange();
  preRange.selectNodeContents(element);
  preRange.setEnd(range.startContainer, range.startOffset);
  const start = preRange.toString().length;
  
  // End offset is start + selected text length
  const end = start + range.toString().length;
  
  return { start, end };
}
