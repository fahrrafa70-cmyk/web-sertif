"use client";

import { useEffect } from 'react';

/**
 * Lightweight performance monitor - only for critical debugging
 */
export function usePerformanceMonitor() {
  useEffect(() => {
    // Only in development and only if needed
    if (process.env.NODE_ENV !== 'development' || typeof window === 'undefined') return;
    
    // Simple LCP logging without heavy observers
    const checkLCP = () => {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1] as PerformanceEntry & { startTime: number };
        console.log('🎯 LCP:', lastEntry.startTime.toFixed(2) + 'ms');
        observer.disconnect(); // Stop after first measurement
      });
      observer.observe({ entryTypes: ['largest-contentful-paint'] });
    };
    
    // Delay to avoid blocking initial render
    setTimeout(checkLCP, 1000);
  }, []);
}

// Removed heavy performance monitoring functions to reduce overhead
