'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { RichText, getSelectionOffsets } from '@/types/rich-text';

interface RichTextEditorProps {
  richText: RichText;
  onChange: (richText: RichText) => void;
  className?: string;
  style?: React.CSSProperties;
  layerFontFamily: string; // Default fontFamily dari layer
  layerFontWeight: string; // Default fontWeight dari layer
  isSelected?: boolean;
}

/**
 * Rich Text Editor with inline formatting support
 * Memungkinkan user select text dan apply font weight/family yang berbeda
 */
export function RichTextEditor({
  richText,
  onChange,
  className = '',
  style = {},
  layerFontFamily,
  layerFontWeight,
  isSelected = false,
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [, setSelectionRange] = useState<{ start: number; end: number } | null>(null);

  // Render rich text sebagai HTML spans
  const renderRichText = useCallback(() => {
    if (!editorRef.current) return;

    const html = richText.map((span, index) => {
      const spanStyle: React.CSSProperties = {
        fontWeight: span.fontWeight || layerFontWeight,
        fontFamily: span.fontFamily || layerFontFamily,
        fontSize: span.fontSize ? `${span.fontSize}px` : undefined,
        color: span.color || undefined,
        fontStyle: span.fontStyle || 'normal',
        textDecoration: span.textDecoration || 'none',
      };

      return `<span data-span-index="${index}" style="${Object.entries(spanStyle)
        .filter(([, value]) => value !== undefined)
        .map(([key, value]) => `${key.replace(/([A-Z])/g, '-$1').toLowerCase()}: ${value}`)
        .join('; ')}">${escapeHtml(span.text)}</span>`;
    }).join('');

    editorRef.current.innerHTML = html;
  }, [richText, layerFontWeight, layerFontFamily]);

  // Update HTML saat richText berubah
  useEffect(() => {
    renderRichText();
  }, [renderRichText]);

  // Track selection changes
  const handleSelectionChange = useCallback(() => {
    if (!editorRef.current || !isSelected) return;

    const offsets = getSelectionOffsets(editorRef.current);
    setSelectionRange(offsets);
  }, [isSelected]);

  useEffect(() => {
    document.addEventListener('selectionchange', handleSelectionChange);
    return () => document.removeEventListener('selectionchange', handleSelectionChange);
  }, [handleSelectionChange]);

  // Handle content changes (typing)
  const handleInput = useCallback(() => {
    if (!editorRef.current) return;

    const plainText = editorRef.current.textContent || '';
    
    // Update rich text dengan text baru, preserve styles where possible
    // For simplicity, convert ke plain text jika user mengetik
    // (Advanced: preserve styles per span)
    onChange([{ text: plainText }]);
  }, [onChange]);

  // Apply style ke selection (reserved for future use)
  // const applyStyle = useCallback((style: Partial<TextSpan>) => {
  //   if (!selectionRange || selectionRange.start === selectionRange.end) {
  //     // No selection, apply to whole layer
  //     const newRichText = richText.map(span => ({ ...span, ...style }));
  //     onChange(newRichText);
  //   } else {
  //     // Apply to selected range
  //     const newRichText = applyStyleToRange(
  //       richText,
  //       selectionRange.start,
  //       selectionRange.end,
  //       style
  //     );
  //     onChange(newRichText);
  //   }
  // }, [richText, selectionRange, onChange]);

  return (
    <div
      ref={editorRef}
      contentEditable={isSelected}
      suppressContentEditableWarning
      onInput={handleInput}
      className={className}
      style={{
        ...style,
        outline: 'none',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
      }}
    />
  );
}

/**
 * Get current selection info untuk determine "mixed" state
 */
export function useRichTextSelection(editorRef: React.RefObject<HTMLDivElement>) {
  const [selection, setSelection] = useState<{ start: number; end: number } | null>(null);

  useEffect(() => {
    const handleSelectionChange = () => {
      if (!editorRef.current) return;
      const offsets = getSelectionOffsets(editorRef.current);
      setSelection(offsets);
    };

    document.addEventListener('selectionchange', handleSelectionChange);
    return () => document.removeEventListener('selectionchange', handleSelectionChange);
  }, [editorRef]);

  return selection;
}

// Helper: Escape HTML untuk prevent XSS
function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
