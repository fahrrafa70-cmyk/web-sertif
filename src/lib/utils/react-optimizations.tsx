/**
 * React performance optimization utilities
 * Provides memoization helpers and performance monitoring
 */

import { memo, useCallback, useMemo, useRef, useEffect } from 'react';

/**
 * Enhanced memo with custom comparison function
 */
export function createMemoComponent<T extends Record<string, any>>(
  Component: React.ComponentType<T>,
  propsAreEqual?: (prevProps: T, nextProps: T) => boolean
) {
  const MemoizedComponent = memo(Component, propsAreEqual);
  MemoizedComponent.displayName = `Memo(${Component.displayName || Component.name})`;
  return MemoizedComponent;
}

/**
 * Shallow comparison for props (useful for memo)
 */
export function shallowEqual<T extends Record<string, any>>(
  prevProps: T,
  nextProps: T,
  ignoreKeys: (keyof T)[] = []
): boolean {
  const prevKeys = Object.keys(prevProps) as (keyof T)[];
  const nextKeys = Object.keys(nextProps) as (keyof T)[];

  if (prevKeys.length !== nextKeys.length) {
    return false;
  }

  for (const key of prevKeys) {
    if (ignoreKeys.includes(key)) continue;
    
    if (prevProps[key] !== nextProps[key]) {
      return false;
    }
  }

  return true;
}

/**
 * Deep comparison for complex objects (use sparingly)
 */
export function deepEqual(a: any, b: any): boolean {
  if (a === b) return true;
  
  if (a == null || b == null) return false;
  
  if (typeof a !== typeof b) return false;
  
  if (typeof a !== 'object') return false;
  
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  
  if (keysA.length !== keysB.length) return false;
  
  for (const key of keysA) {
    if (!keysB.includes(key)) return false;
    if (!deepEqual(a[key], b[key])) return false;
  }
  
  return true;
}

/**
 * Stable callback hook - prevents unnecessary re-renders
 */
export function useStableCallback<T extends (...args: any[]) => any>(
  callback: T,
  deps: React.DependencyList
): T {
  const callbackRef = useRef(callback);
  
  useEffect(() => {
    callbackRef.current = callback;
  }, deps);
  
  return useCallback((...args: Parameters<T>) => {
    return callbackRef.current(...args);
  }, []) as T;
}

/**
 * Memoized event handlers factory
 */
export function useEventHandlers<T extends Record<string, (...args: any[]) => any>>(
  handlers: T,
  deps: React.DependencyList
): T {
  return useMemo(() => {
    const memoizedHandlers = {} as any;
    
    for (const [key, handler] of Object.entries(handlers)) {
      memoizedHandlers[key] = useCallback(handler, deps);
    }
    
    return memoizedHandlers as T;
  }, deps);
}

/**
 * Performance monitoring hook
 */
export function useRenderTracker(componentName: string, props?: Record<string, any>) {
  const renderCount = useRef(0);
  const lastRenderTime = useRef(Date.now());
  
  useEffect(() => {
    renderCount.current += 1;
    const now = Date.now();
    const timeSinceLastRender = now - lastRenderTime.current;
    lastRenderTime.current = now;
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`🔄 ${componentName} render #${renderCount.current} (+${timeSinceLastRender}ms)`, props);
    }
  });
  
  return {
    renderCount: renderCount.current,
    lastRenderTime: lastRenderTime.current,
  };
}

/**
 * Optimized list renderer with memoization
 */
interface OptimizedListProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  keyExtractor: (item: T, index: number) => string | number;
  className?: string;
  emptyMessage?: string;
}

export function OptimizedList<T>({
  items,
  renderItem,
  keyExtractor,
  className = '',
  emptyMessage = 'No items'
}: OptimizedListProps<T>) {
  // Memoize the rendered items to prevent unnecessary re-renders
  const renderedItems = useMemo(() => {
    return items.map((item, index) => {
      const key = keyExtractor(item, index);
      return (
        <OptimizedListItem
          key={key}
          item={item}
          index={index}
          renderItem={renderItem}
        />
      );
    });
  }, [items, renderItem, keyExtractor]);

  if (items.length === 0) {
    return (
      <div className={`flex items-center justify-center p-8 text-gray-500 ${className}`}>
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className={className}>
      {renderedItems}
    </div>
  );
}

// Memoized list item component
interface OptimizedListItemProps<T> {
  item: T;
  index: number;
  renderItem: (item: T, index: number) => React.ReactNode;
}

const OptimizedListItem = memo(function OptimizedListItem<T>({
  item,
  index,
  renderItem
}: OptimizedListItemProps<T>) {
  return <>{renderItem(item, index)}</>;
}) as <T>(props: OptimizedListItemProps<T>) => React.ReactElement;

/**
 * Memoized certificate card component
 */
interface CertificateCardProps {
  certificate: {
    id: string;
    certificate_no: string;
    name: string;
    category?: string;
    issue_date: string;
    certificate_image_url?: string;
  };
  onClick?: (certificate: any) => void;
  onExport?: (certificate: any) => void;
  className?: string;
}

export const MemoizedCertificateCard = memo(function CertificateCard({
  certificate,
  onClick,
  onExport,
  className = ''
}: CertificateCardProps) {
  // Memoize event handlers to prevent child re-renders
  const handleClick = useCallback(() => {
    onClick?.(certificate);
  }, [onClick, certificate.id]);

  const handleExport = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onExport?.(certificate);
  }, [onExport, certificate.id]);

  // Memoize formatted date
  const formattedDate = useMemo(() => {
    return new Date(certificate.issue_date).toLocaleDateString();
  }, [certificate.issue_date]);

  return (
    <div 
      className={`p-4 border rounded-lg hover:shadow-md transition-shadow cursor-pointer ${className}`}
      onClick={handleClick}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-1">
            {certificate.name}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
            {certificate.certificate_no}
          </p>
          {certificate.category && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
              {certificate.category}
            </span>
          )}
        </div>
        <div className="flex flex-col items-end">
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {formattedDate}
          </span>
          <button
            onClick={handleExport}
            className="mt-2 text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200"
          >
            Export
          </button>
        </div>
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison - only re-render if certificate data changes
  return (
    prevProps.certificate.id === nextProps.certificate.id &&
    prevProps.certificate.name === nextProps.certificate.name &&
    prevProps.certificate.certificate_no === nextProps.certificate.certificate_no &&
    prevProps.certificate.category === nextProps.certificate.category &&
    prevProps.certificate.issue_date === nextProps.certificate.issue_date &&
    prevProps.onClick === nextProps.onClick &&
    prevProps.onExport === nextProps.onExport
  );
});

/**
 * Memoized search input component
 */
interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit?: () => void;
  placeholder?: string;
  loading?: boolean;
  className?: string;
}

export const MemoizedSearchInput = memo(function SearchInput({
  value,
  onChange,
  onSubmit,
  placeholder = 'Search...',
  loading = false,
  className = ''
}: SearchInputProps) {
  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  }, [onChange]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onSubmit?.();
    }
  }, [onSubmit]);

  return (
    <div className={`relative ${className}`}>
      <input
        type="text"
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={loading}
        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
      />
      {loading && (
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
          <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
        </div>
      )}
    </div>
  );
}, (prevProps, nextProps) => {
  // Only re-render if value, loading state, or callbacks change
  return (
    prevProps.value === nextProps.value &&
    prevProps.loading === nextProps.loading &&
    prevProps.onChange === nextProps.onChange &&
    prevProps.onSubmit === nextProps.onSubmit &&
    prevProps.placeholder === nextProps.placeholder
  );
});
