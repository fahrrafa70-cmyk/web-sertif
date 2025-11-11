'use client';

import { ErrorBoundary } from './error-boundary';

/**
 * Client-side Error Boundary Wrapper
 * This is a client component that wraps the Error Boundary
 * to be used in server components (like layout.tsx)
 */
export function ErrorBoundaryWrapper({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary>
      {children}
    </ErrorBoundary>
  );
}

