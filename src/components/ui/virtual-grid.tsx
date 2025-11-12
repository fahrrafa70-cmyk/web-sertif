"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';

interface VirtualGridProps<T> {
  items: T[];
  itemHeight: number;
  itemWidth: number;
  containerHeight: number;
  gap?: number;
  overscan?: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  className?: string;
}

/**
 * Virtual Grid component for efficient rendering of large lists
 * Only renders visible items to maintain performance with 1000+ templates
 */
export function VirtualGrid<T>({
  items,
  itemHeight,
  itemWidth,
  containerHeight,
  gap = 16,
  overscan = 3,
  renderItem,
  className = ''
}: VirtualGridProps<T>) {
  const [scrollTop, setScrollTop] = useState(0);
  const [containerWidth, setContainerWidth] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Calculate grid dimensions
  const columnsPerRow = useMemo(() => {
    if (containerWidth === 0) return 1;
    return Math.floor((containerWidth + gap) / (itemWidth + gap));
  }, [containerWidth, itemWidth, gap]);

  const totalRows = useMemo(() => {
    return Math.ceil(items.length / columnsPerRow);
  }, [items.length, columnsPerRow]);

  const rowHeight = itemHeight + gap;
  const totalHeight = totalRows * rowHeight;

  // Calculate visible range
  const visibleRange = useMemo(() => {
    const startRow = Math.floor(scrollTop / rowHeight);
    const endRow = Math.min(
      totalRows - 1,
      Math.ceil((scrollTop + containerHeight) / rowHeight)
    );

    // Add overscan
    const startRowWithOverscan = Math.max(0, startRow - overscan);
    const endRowWithOverscan = Math.min(totalRows - 1, endRow + overscan);

    return {
      startRow: startRowWithOverscan,
      endRow: endRowWithOverscan,
      startIndex: startRowWithOverscan * columnsPerRow,
      endIndex: Math.min(items.length - 1, (endRowWithOverscan + 1) * columnsPerRow - 1)
    };
  }, [scrollTop, containerHeight, rowHeight, totalRows, columnsPerRow, overscan, items.length]);

  // Get visible items
  const visibleItems = useMemo(() => {
    return items.slice(visibleRange.startIndex, visibleRange.endIndex + 1);
  }, [items, visibleRange.startIndex, visibleRange.endIndex]);

  // Handle scroll
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  // Handle resize
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.clientWidth);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Update container width when ref changes
  useEffect(() => {
    if (containerRef.current) {
      setContainerWidth(containerRef.current.clientWidth);
    }
  }, []);

  return (
    <div
      ref={containerRef}
      className={`overflow-auto ${className}`}
      style={{ height: containerHeight }}
      onScroll={handleScroll}
    >
      {/* Virtual container with total height */}
      <div style={{ height: totalHeight, position: 'relative' }}>
        {/* Render visible items */}
        {visibleItems.map((item, virtualIndex) => {
          const actualIndex = visibleRange.startIndex + virtualIndex;
          const row = Math.floor(actualIndex / columnsPerRow);
          const col = actualIndex % columnsPerRow;
          
          const x = col * (itemWidth + gap);
          const y = row * rowHeight;

          return (
            <div
              key={actualIndex}
              style={{
                position: 'absolute',
                left: x,
                top: y,
                width: itemWidth,
                height: itemHeight,
              }}
            >
              {renderItem(item, actualIndex)}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Hook for virtual grid with templates
export function useVirtualTemplateGrid(
  templates: any[],
  containerRef: React.RefObject<HTMLElement>
) {
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setContainerSize({
          width: rect.width,
          height: rect.height
        });
      }
    };

    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, [containerRef]);

  // Template card dimensions (based on current design)
  const itemWidth = 400; // Template card width
  const itemHeight = 200; // Template card height
  const gap = 20; // Gap between cards

  const columnsPerRow = Math.floor((containerSize.width + gap) / (itemWidth + gap)) || 1;
  const shouldUseVirtual = templates.length > 50; // Use virtual scrolling for 50+ items

  return {
    containerSize,
    itemWidth,
    itemHeight,
    gap,
    columnsPerRow,
    shouldUseVirtual
  };
}
