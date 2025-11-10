/**
 * Performance monitoring utilities
 * Helps track and optimize application performance
 */

interface PerformanceMetrics {
  name: string;
  duration: number;
  timestamp: number;
}

class PerformanceMonitor {
  private metrics: PerformanceMetrics[] = [];
  private maxMetrics = 100; // Keep last 100 metrics

  /**
   * Measure execution time of a function
   */
  async measure<T>(name: string, fn: () => Promise<T> | T): Promise<T> {
    const startTime = performance.now();
    
    try {
      const result = await fn();
      const duration = performance.now() - startTime;
      
      this.recordMetric(name, duration);
      
      // Log slow operations (>1000ms)
      if (duration > 1000) {
        console.warn(`⚠️ Slow operation detected: ${name} took ${duration.toFixed(2)}ms`);
      }
      
      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      this.recordMetric(`${name} (error)`, duration);
      throw error;
    }
  }

  /**
   * Record a performance metric
   */
  private recordMetric(name: string, duration: number): void {
    this.metrics.push({
      name,
      duration,
      timestamp: Date.now(),
    });

    // Keep only last N metrics
    if (this.metrics.length > this.maxMetrics) {
      this.metrics.shift();
    }
  }

  /**
   * Get all metrics
   */
  getMetrics(): PerformanceMetrics[] {
    return [...this.metrics];
  }

  /**
   * Get metrics by name
   */
  getMetricsByName(name: string): PerformanceMetrics[] {
    return this.metrics.filter(m => m.name === name);
  }

  /**
   * Get average duration for a metric
   */
  getAverageDuration(name: string): number {
    const metrics = this.getMetricsByName(name);
    if (metrics.length === 0) return 0;
    
    const total = metrics.reduce((sum, m) => sum + m.duration, 0);
    return total / metrics.length;
  }

  /**
   * Clear all metrics
   */
  clear(): void {
    this.metrics = [];
  }

  /**
   * Get performance summary
   */
  getSummary(): Record<string, { count: number; avg: number; min: number; max: number }> {
    const summary: Record<string, { count: number; avg: number; min: number; max: number }> = {};
    
    for (const metric of this.metrics) {
      if (!summary[metric.name]) {
        summary[metric.name] = {
          count: 0,
          avg: 0,
          min: Infinity,
          max: -Infinity,
        };
      }
      
      const s = summary[metric.name];
      s.count++;
      s.avg = (s.avg * (s.count - 1) + metric.duration) / s.count;
      s.min = Math.min(s.min, metric.duration);
      s.max = Math.max(s.max, metric.duration);
    }
    
    return summary;
  }

  /**
   * Log performance summary to console
   */
  logSummary(): void {
    const summary = this.getSummary();
    console.table(summary);
  }
}

// Singleton instance
export const performanceMonitor = new PerformanceMonitor();

/**
 * Measure component render time
 * Use in useEffect to track render performance
 */
export function measureRenderTime(componentName: string): () => void {
  if (typeof window === 'undefined') return () => {};
  
  const startTime = performance.now();
  
  // Return cleanup function to measure on unmount
  return () => {
    const duration = performance.now() - startTime;
    performanceMonitor.measure(componentName, () => Promise.resolve());
  };
}

/**
 * Decorator for measuring function execution time
 */
export function measurePerformance(name: string) {
  return function <T extends (...args: unknown[]) => unknown>(
    target: unknown,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: unknown[]) {
      return performanceMonitor.measure(
        `${name}.${propertyKey}`,
        () => originalMethod.apply(this, args)
      );
    };

    return descriptor;
  };
}
