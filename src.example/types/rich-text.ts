/**
 * Rich Text Format untuk inline styling dalam text layers
 * Memungkinkan styling per-kata/karakter seperti Word/Google Docs
 */

/**
 * Satu span/segment text dengan style tertentu
 */
export interface TextSpan {
  text: string;
  fontWeight?: number | string; // 300, 400, 500, 600, 700, 'bold', etc.
  fontFamily?: string; // 'Poppins', 'Inter', etc.
  fontSize?: number; // Override layer fontSize untuk span ini
  color?: string; // Override layer color untuk span ini
  fontStyle?: 'normal' | 'italic'; // Italic support
  textDecoration?: 'none' | 'underline' | 'line-through'; // Underline/strikethrough
}

/**
 * Rich text content - array of styled spans
 */
export type RichText = TextSpan[];

/**
 * Helper: Convert plain text to rich text format
 */
export function plainTextToRichText(text: string): RichText {
  return [{ text }];
}

/**
 * Helper: Convert rich text to plain text (untuk backward compatibility)
 */
export function richTextToPlainText(richText: RichText | string): string {
  if (typeof richText === 'string') return richText;
  return richText.map(span => span.text).join('');
}

/**
 * Helper: Check if all spans have same style property
 * Returns the common value, or 'mixed' if different
 */
export function getCommonStyleValue<K extends keyof TextSpan>(
  richText: RichText,
  property: K
): TextSpan[K] | 'mixed' | undefined {
  if (richText.length === 0) return undefined;
  
  // Get unique values (excluding undefined)
  const values = new Set(richText.map(span => span[property]).filter(v => v !== undefined));
  
  // If all spans have the same value (or all undefined), return that value
  if (values.size === 0) return undefined; // All undefined
  if (values.size === 1) return Array.from(values)[0]; // All same
  
  return 'mixed'; // Different values
}

/**
 * Helper: Apply style to selected text range
 */
export function applyStyleToRange(
  richText: RichText,
  startOffset: number,
  endOffset: number,
  style: Partial<TextSpan>
): RichText {
  const newRichText: RichText = [];
  let currentOffset = 0;

  for (const span of richText) {
    const spanStart = currentOffset;
    const spanEnd = currentOffset + span.text.length;

    if (spanEnd <= startOffset || spanStart >= endOffset) {
      // Span tidak terpengaruh selection
      newRichText.push(span);
    } else if (spanStart >= startOffset && spanEnd <= endOffset) {
      // Span sepenuhnya di dalam selection
      newRichText.push({ ...span, ...style });
    } else {
      // Span partially di dalam selection - perlu split
      if (spanStart < startOffset) {
        // Part sebelum selection
        newRichText.push({
          ...span,
          text: span.text.slice(0, startOffset - spanStart)
        });
      }

      // Part dalam selection
      const selStart = Math.max(0, startOffset - spanStart);
      const selEnd = Math.min(span.text.length, endOffset - spanStart);
      newRichText.push({
        ...span,
        ...style,
        text: span.text.slice(selStart, selEnd)
      });

      if (spanEnd > endOffset) {
        // Part setelah selection
        newRichText.push({
          ...span,
          text: span.text.slice(endOffset - spanStart)
        });
      }
    }

    currentOffset = spanEnd;
  }

  // Merge adjacent spans dengan style yang sama
  return mergeAdjacentSpans(newRichText);
}

/**
 * Helper: Merge adjacent spans dengan style yang sama
 */
export function mergeAdjacentSpans(richText: RichText): RichText {
  if (richText.length <= 1) return richText;

  const merged: RichText = [richText[0]];

  for (let i = 1; i < richText.length; i++) {
    const prev = merged[merged.length - 1];
    const curr = richText[i];

    // Check if styles are identical
    const sameStyle =
      prev.fontWeight === curr.fontWeight &&
      prev.fontFamily === curr.fontFamily &&
      prev.fontSize === curr.fontSize &&
      prev.color === curr.color &&
      prev.fontStyle === curr.fontStyle &&
      prev.textDecoration === curr.textDecoration;

    if (sameStyle) {
      // Merge dengan span sebelumnya
      prev.text += curr.text;
    } else {
      // Tambah sebagai span baru
      merged.push(curr);
    }
  }

  return merged;
}

/**
 * Helper: Get selection info dari DOM selection
 */
export function getSelectionOffsets(element: HTMLElement): {
  start: number;
  end: number;
} | null {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return null;

  const range = selection.getRangeAt(0);
  
  // Check if selection is within our element
  if (!element.contains(range.commonAncestorContainer)) return null;

  // Calculate offsets relative to element text content
  const preRange = range.cloneRange();
  preRange.selectNodeContents(element);
  preRange.setEnd(range.startContainer, range.startOffset);
  const start = preRange.toString().length;

  const end = start + range.toString().length;

  return { start, end };
}
