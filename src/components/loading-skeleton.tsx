/**
 * Loading Skeleton Component
 * Displays a skeleton loading state while components are being loaded
 * Used for code splitting and lazy loading
 */

import { Loading } from './ui/spinner';

export function LoadingSkeleton({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900 ${className}`}>
      <Loading size="xl" text="Loading..." />
    </div>
  );
}

/**
 * Page Loading Skeleton
 * More detailed loading state for full pages
 */
export function PageLoadingSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header skeleton */}
        <div className="space-y-3">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3 animate-pulse"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 animate-pulse"></div>
        </div>
        
        {/* Search/filter skeleton */}
        <div className="flex gap-4">
          <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded flex-1 animate-pulse"></div>
          <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-32 animate-pulse"></div>
        </div>
        
        {/* Content skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-white dark:bg-gray-800 rounded-lg p-4 space-y-3 animate-pulse">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
              <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

