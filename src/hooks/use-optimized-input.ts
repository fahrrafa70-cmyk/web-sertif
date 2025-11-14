"use client";

import { useCallback, useRef } from 'react';

/**
 * Optimized input handler to reduce INP (Interaction to Next Paint)
 */
export function useOptimizedInput(
  onChange: (value: string) => void,
  debounceMs: number = 100
) {
  const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const lastValueRef = useRef<string>('');

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    
    // Immediate UI update (no debounce for visual feedback)
    if (value !== lastValueRef.current) {
      lastValueRef.current = value;
      
      // Clear previous timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      // Debounce the actual onChange call
      timeoutRef.current = setTimeout(() => {
        onChange(value);
      }, debounceMs);
    }
  }, [onChange, debounceMs]);

  return handleChange;
}

/**
 * Non-blocking input handler that uses requestIdleCallback
 */
export function useNonBlockingInput(
  onChange: (value: string) => void,
  immediate: boolean = false
) {
  const pendingValueRef = useRef<string | null>(null);
  const isProcessingRef = useRef(false);

  const processChange = useCallback(() => {
    if (pendingValueRef.current !== null && !isProcessingRef.current) {
      isProcessingRef.current = true;
      const value = pendingValueRef.current;
      pendingValueRef.current = null;
      
      if (immediate) {
        onChange(value);
        isProcessingRef.current = false;
      } else {
        // Use requestIdleCallback if available, otherwise setTimeout
        if (typeof requestIdleCallback !== 'undefined') {
          requestIdleCallback(() => {
            onChange(value);
            isProcessingRef.current = false;
          });
        } else {
          setTimeout(() => {
            onChange(value);
            isProcessingRef.current = false;
          }, 0);
        }
      }
    }
  }, [onChange, immediate]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    pendingValueRef.current = e.target.value;
    processChange();
  }, [processChange]);

  return handleChange;
}
