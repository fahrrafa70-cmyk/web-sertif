import { useState, useEffect, useCallback, useRef, useMemo } from 'react';

interface UseVirtualScrollOptions {
  itemHeight: number;
  containerHeight: number;
  overscan?: number; // Number of items to render outside viewport
}

interface VirtualScrollResult<T> {
  virtualItems: T[];
  totalHeight: number;
  offsetY: number;
  startIndex: number;
  endIndex: number;
  scrollToIndex: (index: number) => void;
}

/**
 * Custom hook for virtual scrolling large lists
 * Only renders items visible in viewport + overscan buffer
 * Significantly improves performance for lists with 100+ items
 */
export function useVirtualScroll<T>(
  items: T[],
  options: UseVirtualScrollOptions
): VirtualScrollResult<T> {
  const { itemHeight, containerHeight, overscan = 3 } = options;
  const [scrollTop, setScrollTop] = useState(0);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  // Calculate visible range
  const { startIndex, endIndex, offsetY } = useMemo(() => {
    const start = Math.floor(scrollTop / itemHeight);
    const visibleCount = Math.ceil(containerHeight / itemHeight);
    
    // Add overscan buffer
    const startWithOverscan = Math.max(0, start - overscan);
    const endWithOverscan = Math.min(
      items.length - 1,
      start + visibleCount + overscan
    );

    return {
      startIndex: startWithOverscan,
      endIndex: endWithOverscan,
      offsetY: startWithOverscan * itemHeight,
    };
  }, [scrollTop, itemHeight, containerHeight, items.length, overscan]);

  // Get visible items
  const virtualItems = useMemo(() => {
    return items.slice(startIndex, endIndex + 1);
  }, [items, startIndex, endIndex]);

  // Total height of all items
  const totalHeight = items.length * itemHeight;

  // Scroll to specific index
  const scrollToIndex = useCallback((index: number) => {
    if (scrollRef.current) {
      const targetScrollTop = index * itemHeight;
      scrollRef.current.scrollTop = targetScrollTop;
      setScrollTop(targetScrollTop);
    }
  }, [itemHeight]);

  // Handle scroll event
  const handleScroll = useCallback((e: Event) => {
    const target = e.target as HTMLDivElement;
    setScrollTop(target.scrollTop);
  }, []);

  // Attach scroll listener
  useEffect(() => {
    const container = scrollRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll, { passive: true });
      return () => container.removeEventListener('scroll', handleScroll);
    }
  }, [handleScroll]);

  return {
    virtualItems,
    totalHeight,
    offsetY,
    startIndex,
    endIndex,
    scrollToIndex,
  };
}

/**
 * Helper function to get scroll container ref
 */
export function useVirtualScrollRef() {
  return useRef<HTMLDivElement>(null);
}
