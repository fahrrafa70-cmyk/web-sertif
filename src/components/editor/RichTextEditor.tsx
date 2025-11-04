"use client";

import React, { useRef, useEffect, useState } from 'react';
import { RichText, TextSpan, applyStyleToRange, getSelectionOffsets, richTextToPlainText } from '@/types/rich-text';

interface RichTextEditorProps {
  value: RichText;
  onChange: (richText: RichText) => void;
  onSelectionChange?: (start: number, end: number) => void;
  className?: string;
  style?: React.CSSProperties;
}

export function RichTextEditor({
  value,
  onChange,
  onSelectionChange,
  className,
  style
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [isComposing, setIsComposing] = useState(false);
  
  // Render rich text as HTML
  const renderRichText = (richText: RichText) => {
    return richText.map((span, index) => {
      const spanStyle: React.CSSProperties = {
        fontWeight: span.fontWeight,
        fontFamily: span.fontFamily,
        fontSize: span.fontSize ? `${span.fontSize}px` : undefined,
        color: span.color,
      };
      
      return (
        <span key={index} style={spanStyle}>
          {span.text}
        </span>
      );
    });
  };
  
  // Handle selection change
  const handleSelectionChange = () => {
    if (!editorRef.current || !onSelectionChange) return;
    
    const offsets = getSelectionOffsets(editorRef.current);
    if (offsets) {
      onSelectionChange(offsets.start, offsets.end);
    }
  };
  
  // Handle text input
  const handleInput = () => {
    if (isComposing || !editorRef.current) return;
    
    const plainText = editorRef.current.innerText;
    
    // For now, convert to simple rich text (no formatting)
    // This maintains backward compatibility while allowing formatting via selection
    const newRichText: RichText = [{
      text: plainText,
      fontWeight: value[0]?.fontWeight,
      fontFamily: value[0]?.fontFamily,
      fontSize: value[0]?.fontSize,
      color: value[0]?.color,
    }];
    
    onChange(newRichText);
  };
  
  // Update editor content when value changes externally
  useEffect(() => {
    if (!editorRef.current) return;
    
    const currentText = editorRef.current.innerText;
    const newText = richTextToPlainText(value);
    
    // Only update if text actually changed (avoid cursor jumping)
    if (currentText !== newText) {
      // Save cursor position
      const selection = window.getSelection();
      const range = selection && selection.rangeCount > 0 ? selection.getRangeAt(0) : null;
      const cursorOffset = range ? getSelectionOffsets(editorRef.current)?.start ?? 0 : 0;
      
      // Update content
      editorRef.current.innerHTML = '';
      editorRef.current.append(...renderRichText(value).map(element => {
        const span = document.createElement('span');
        if (React.isValidElement(element)) {
          const props = element.props as { style?: React.CSSProperties; children?: string };
          if (props.style) {
            Object.assign(span.style, props.style);
          }
          span.textContent = props.children || '';
        }
        return span;
      }));
      
      // Restore cursor position
      try {
        const textNode = editorRef.current.firstChild;
        if (textNode && textNode.nodeType === Node.TEXT_NODE) {
          const newRange = document.createRange();
          const newSelection = window.getSelection();
          const offset = Math.min(cursorOffset, textNode.textContent?.length ?? 0);
          newRange.setStart(textNode, offset);
          newRange.collapse(true);
          newSelection?.removeAllRanges();
          newSelection?.addRange(newRange);
        }
      } catch {
        // Ignore cursor restoration errors
      }
    }
  }, [value]);
  
  return (
    <div
      ref={editorRef}
      contentEditable
      suppressContentEditableWarning
      onInput={handleInput}
      onSelect={handleSelectionChange}
      onMouseUp={handleSelectionChange}
      onKeyUp={handleSelectionChange}
      onCompositionStart={() => setIsComposing(true)}
      onCompositionEnd={() => {
        setIsComposing(false);
        handleInput();
      }}
      className={className}
      style={{
        outline: 'none',
        minHeight: '24px',
        ...style
      }}
    >
      {renderRichText(value)}
    </div>
  );
}

// Helper hook to apply styles to selection
export function useRichTextSelection(
  richText: RichText,
  onChange: (richText: RichText) => void
) {
  const [selectionRange, setSelectionRange] = useState<{ start: number; end: number }>({ start: 0, end: 0 });
  
  const applyStyle = (style: Partial<Omit<TextSpan, 'text'>>) => {
    const { start, end } = selectionRange;
    
    // If no selection, apply to whole text
    if (start === end) {
      const newRichText = richText.map(span => ({ ...span, ...style }));
      onChange(newRichText);
    } else {
      const newRichText = applyStyleToRange(richText, start, end, style);
      onChange(newRichText);
    }
  };
  
  return {
    selectionRange,
    setSelectionRange,
    applyStyle
  };
}
