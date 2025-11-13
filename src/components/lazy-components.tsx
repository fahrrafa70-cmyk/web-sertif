"use client";

import { lazy, Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

// Lazy load large components for better code splitting
export const LazyDataTable = lazy(() => import('@/components/data-table').then(module => ({ default: module.DataTable })));
export const LazyQuickGenerateModal = lazy(() => import('@/components/certificate/QuickGenerateModal').then(module => ({ default: module.QuickGenerateModal })));
export const LazyColumnMappingUI = lazy(() => import('@/components/certificate/ColumnMappingUI').then(module => ({ default: module.ColumnMappingUI })));
export const LazyRichTextEditor = lazy(() => import('@/components/editor/RichTextEditor').then(module => ({ default: module.RichTextEditor })));

// Loading skeletons for different component types
export function TableSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-32" />
        <div className="flex gap-2">
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-8 w-24" />
        </div>
      </div>
      <div className="border rounded-lg">
        <div className="grid grid-cols-6 gap-4 p-4 border-b">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-4 w-full" />
          ))}
        </div>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="grid grid-cols-6 gap-4 p-4 border-b last:border-b-0">
            {Array.from({ length: 6 }).map((_, j) => (
              <Skeleton key={j} className="h-4 w-full" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function ModalSkeleton() {
  return (
    <div className="space-y-4 p-6">
      <Skeleton className="h-6 w-48" />
      <div className="space-y-3">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
      </div>
      <div className="flex gap-2 pt-4">
        <Skeleton className="h-8 w-20" />
        <Skeleton className="h-8 w-20" />
      </div>
    </div>
  );
}

export function EditorSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex gap-2 p-2 border-b">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-8" />
        ))}
      </div>
      <Skeleton className="h-64 w-full" />
    </div>
  );
}

// Wrapper components with Suspense
export function DataTableWithSuspense(props: any) {
  return (
    <Suspense fallback={<TableSkeleton />}>
      <LazyDataTable {...props} />
    </Suspense>
  );
}

export function QuickGenerateModalWithSuspense(props: any) {
  return (
    <Suspense fallback={<ModalSkeleton />}>
      <LazyQuickGenerateModal {...props} />
    </Suspense>
  );
}

export function ColumnMappingUIWithSuspense(props: any) {
  return (
    <Suspense fallback={<ModalSkeleton />}>
      <LazyColumnMappingUI {...props} />
    </Suspense>
  );
}

export function RichTextEditorWithSuspense(props: any) {
  return (
    <Suspense fallback={<EditorSkeleton />}>
      <LazyRichTextEditor {...props} />
    </Suspense>
  );
}
