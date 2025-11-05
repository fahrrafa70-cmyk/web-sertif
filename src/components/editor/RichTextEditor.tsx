"use client";

import React, { useRef, useEffect, useState } from 'react';
import { RichText, TextSpan, applyStyleToRange, getSelectionOffsets, richTextToPlainText } from '@/types/rich-text';

interface RichTextEditorProps {
  value: RichText;
  onChange: (richText: RichText) => void;
  onSelectionChange?: (start: number, end: number) => void;
  className?: string;
  style?: React.CSSProperties;
  // Layer-level default styles (used when typing new text)
  defaultStyle?: Partial<Omit<TextSpan, 'text'>>;
}

export function RichTextEditor({
  value,
  onChange,
  onSelectionChange,
  className,
  style,
  defaultStyle
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [isComposing, setIsComposing] = useState(false);
  
  // Render rich text as HTML
  const renderRichText = (richText: RichText) => {
    return richText.map((span, index) => {
      const spanStyle: React.CSSProperties = {
        fontWeight: span.fontWeight,
        fontFamily: span.fontFamily,
        // fontSize: REMOVED - Keep text size constant in editor
        // fontSize setting is still saved in data for preview/PNG rendering
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
    
    // CRITICAL: Save cursor position BEFORE calling onChange
    const selection = window.getSelection();
    const cursorOffset = selection && selection.rangeCount > 0 
      ? getSelectionOffsets(editorRef.current)?.start ?? 0 
      : 0;
    
    const plainText = editorRef.current.innerText;
    
    // Convert to simple rich text using layer-level defaults
    // This ensures font settings from sidebar are applied when typing
    const newRichText: RichText = [{
      text: plainText,
      fontWeight: defaultStyle?.fontWeight || value[0]?.fontWeight,
      fontFamily: defaultStyle?.fontFamily || value[0]?.fontFamily,
      fontSize: defaultStyle?.fontSize || value[0]?.fontSize,
      color: defaultStyle?.color || value[0]?.color,
    }];
    
    onChange(newRichText);
    
    // CRITICAL: Restore cursor position AFTER onChange triggers re-render
    requestAnimationFrame(() => {
      if (!editorRef.current) return;
      
      try {
        // Find the text node where cursor should be placed
        const walker = document.createTreeWalker(
          editorRef.current,
          NodeFilter.SHOW_TEXT,
          null
        );
        
        let textNode: Node | null = null;
        let currentOffset = 0;
        
        while (walker.nextNode()) {
          const node = walker.currentNode;
          const nodeLength = node.textContent?.length ?? 0;
          
          if (currentOffset + nodeLength >= cursorOffset) {
            textNode = node;
            break;
          }
          currentOffset += nodeLength;
        }
        
        // Set cursor position
        if (textNode) {
          const newRange = document.createRange();
          const newSelection = window.getSelection();
          const offset = Math.min(cursorOffset - currentOffset, textNode.textContent?.length ?? 0);
          newRange.setStart(textNode, offset);
          newRange.collapse(true);
          newSelection?.removeAllRanges();
          newSelection?.addRange(newRange);
        }
      } catch (error) {
        // Ignore cursor restoration errors
        console.warn('Failed to restore cursor:', error);
      }
    });
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
        // Find the text node where cursor should be placed
        let textNode: Node | null = null;
        let currentOffset = 0;
        
        // Walk through all text nodes to find the one containing cursor position
        const walker = document.createTreeWalker(
          editorRef.current,
          NodeFilter.SHOW_TEXT,
          null
        );
        
        while (walker.nextNode()) {
          const node = walker.currentNode;
          const nodeLength = node.textContent?.length ?? 0;
          
          if (currentOffset + nodeLength >= cursorOffset) {
            textNode = node;
            break;
          }
          currentOffset += nodeLength;
        }
        
        // Set cursor position
        if (textNode) {
          const newRange = document.createRange();
          const newSelection = window.getSelection();
          const offset = Math.min(cursorOffset - currentOffset, textNode.textContent?.length ?? 0);
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
