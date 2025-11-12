/**
 * Performance tracking utilities for monitoring optimization improvements
 */

interface PerformanceMetrics {
  FCP?: number; // First Contentful Paint
  LCP?: number; // Largest Contentful Paint
  TTI?: number; // Time to Interactive
  TBT?: number; // Total Blocking Time
  CLS?: number; // Cumulative Layout Shift
  bundleSize?: number;
  loadTime?: number;
}

class PerformanceTracker {
  private metrics: PerformanceMetrics = {};
  private observers: PerformanceObserver[] = [];

  constructor() {
    if (typeof window !== 'undefined') {
      this.initializeTracking();
    }
  }

  private initializeTracking() {
    // Track Core Web Vitals
    this.trackWebVitals();
    
    // Track bundle size and load time
    this.trackLoadMetrics();
  }

  private trackWebVitals() {
    try {
      // First Contentful Paint
      const fcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const fcp = entries.find(entry => entry.name === 'first-contentful-paint');
        if (fcp) {
          this.metrics.FCP = fcp.startTime;
          console.log('🎨 First Contentful Paint:', fcp.startTime.toFixed(2), 'ms');
        }
      });
      fcpObserver.observe({ entryTypes: ['paint'] });
      this.observers.push(fcpObserver);

      // Largest Contentful Paint
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        if (lastEntry) {
          this.metrics.LCP = lastEntry.startTime;
          console.log('🖼️ Largest Contentful Paint:', lastEntry.startTime.toFixed(2), 'ms');
        }
      });
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
      this.observers.push(lcpObserver);

      // Cumulative Layout Shift
      const clsObserver = new PerformanceObserver((list) => {
        let clsValue = 0;
        for (const entry of list.getEntries()) {
          if (!(entry as any).hadRecentInput) {
            clsValue += (entry as any).value;
          }
        }
        this.metrics.CLS = clsValue;
        console.log('📐 Cumulative Layout Shift:', clsValue.toFixed(4));
      });
      clsObserver.observe({ entryTypes: ['layout-shift'] });
      this.observers.push(clsObserver);

    } catch (error) {
      console.warn('Performance tracking not supported:', error);
    }
  }

  private trackLoadMetrics() {
    window.addEventListener('load', () => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      
      if (navigation) {
        this.metrics.loadTime = navigation.loadEventEnd - navigation.fetchStart;
        this.metrics.TTI = navigation.domContentLoadedEventEnd - navigation.fetchStart;
        
        console.log('⚡ Page Load Time:', this.metrics.loadTime.toFixed(2), 'ms');
        console.log('🎯 Time to Interactive:', this.metrics.TTI.toFixed(2), 'ms');
      }

      // Track bundle size from resource entries
      const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
      let totalBundleSize = 0;
      
      resources.forEach(resource => {
        if (resource.name.includes('/_next/static/chunks/') && resource.transferSize) {
          totalBundleSize += resource.transferSize;
        }
      });
      
      this.metrics.bundleSize = totalBundleSize;
      console.log('📦 Bundle Size:', (totalBundleSize / 1024).toFixed(2), 'KB');
    });
  }

  getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  logSummary() {
    console.group('📊 Performance Summary');
    console.log('First Contentful Paint:', this.metrics.FCP?.toFixed(2) || 'N/A', 'ms');
    console.log('Largest Contentful Paint:', this.metrics.LCP?.toFixed(2) || 'N/A', 'ms');
    console.log('Time to Interactive:', this.metrics.TTI?.toFixed(2) || 'N/A', 'ms');
    console.log('Cumulative Layout Shift:', this.metrics.CLS?.toFixed(4) || 'N/A');
    console.log('Bundle Size:', this.metrics.bundleSize ? (this.metrics.bundleSize / 1024).toFixed(2) + ' KB' : 'N/A');
    console.log('Load Time:', this.metrics.loadTime?.toFixed(2) || 'N/A', 'ms');
    console.groupEnd();
  }

  // Compare with baseline metrics
  compareWithBaseline(baseline: PerformanceMetrics) {
    console.group('📈 Performance Comparison');
    
    Object.entries(baseline).forEach(([key, baselineValue]) => {
      const currentValue = this.metrics[key as keyof PerformanceMetrics];
      if (currentValue && baselineValue) {
        const improvement = ((baselineValue - currentValue) / baselineValue) * 100;
        const emoji = improvement > 0 ? '✅' : '❌';
        console.log(`${emoji} ${key}: ${improvement.toFixed(1)}% ${improvement > 0 ? 'improvement' : 'regression'}`);
      }
    });
    
    console.groupEnd();
  }

  cleanup() {
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
  }
}

// Singleton instance
export const performanceTracker = new PerformanceTracker();

// Hook for React components
export function usePerformanceTracking() {
  return {
    getMetrics: () => performanceTracker.getMetrics(),
    logSummary: () => performanceTracker.logSummary(),
    compareWithBaseline: (baseline: PerformanceMetrics) => performanceTracker.compareWithBaseline(baseline)
  };
}

// Utility to track component render time
export function trackComponentRender(componentName: string) {
  return function <T extends (...args: any[]) => any>(target: T): T {
    return ((...args: any[]) => {
      const start = performance.now();
      const result = target(...args);
      const end = performance.now();
      console.log(`🔧 ${componentName} render time:`, (end - start).toFixed(2), 'ms');
      return result;
    }) as T;
  };
}
