/**
 * Advanced performance monitoring and analytics
 * Tracks Core Web Vitals, user interactions, and optimization effectiveness
 */

import { useState, useEffect, useCallback, useRef } from 'react';

interface PerformanceMetric {
  name: string;
  value: number;
  timestamp: number;
  url: string;
  userAgent: string;
}

interface UserInteraction {
  type: 'click' | 'scroll' | 'navigation' | 'search' | 'export';
  target: string;
  timestamp: number;
  duration?: number;
  metadata?: Record<string, any>;
}

interface OptimizationImpact {
  feature: string;
  beforeMetric: number;
  afterMetric: number;
  improvement: number;
  timestamp: number;
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private interactions: UserInteraction[] = [];
  private optimizationImpacts: OptimizationImpact[] = [];
  private observers: PerformanceObserver[] = [];
  private isMonitoring = false;

  constructor() {
    if (typeof window !== 'undefined') {
      this.startMonitoring();
    }
  }

  /**
   * Start performance monitoring
   */
  startMonitoring(): void {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    console.log('📊 Performance monitoring started');

    // Monitor Core Web Vitals
    this.monitorCoreWebVitals();
    
    // Monitor resource loading
    this.monitorResourceLoading();
    
    // Monitor user interactions
    this.monitorUserInteractions();
    
    // Monitor navigation performance
    this.monitorNavigation();
    
    // Start periodic reporting
    this.startPeriodicReporting();
  }

  /**
   * Monitor Core Web Vitals
   */
  private monitorCoreWebVitals(): void {
    // First Contentful Paint (FCP)
    const fcpObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.name === 'first-contentful-paint') {
          this.recordMetric('FCP', entry.startTime);
        }
      }
    });
    fcpObserver.observe({ entryTypes: ['paint'] });
    this.observers.push(fcpObserver);

    // Largest Contentful Paint (LCP)
    const lcpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1];
      if (lastEntry) {
        this.recordMetric('LCP', lastEntry.startTime);
      }
    });
    lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
    this.observers.push(lcpObserver);

    // Cumulative Layout Shift (CLS)
    let clsValue = 0;
    const clsObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (!(entry as any).hadRecentInput) {
          clsValue += (entry as any).value;
        }
      }
      this.recordMetric('CLS', clsValue);
    });
    clsObserver.observe({ entryTypes: ['layout-shift'] });
    this.observers.push(clsObserver);

    // First Input Delay (FID) / Interaction to Next Paint (INP)
    const fidObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const fid = (entry as any).processingStart - entry.startTime;
        this.recordMetric('FID', fid);
      }
    });
    fidObserver.observe({ entryTypes: ['first-input'] });
    this.observers.push(fidObserver);

    // Time to First Byte (TTFB)
    window.addEventListener('load', () => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      if (navigation) {
        const ttfb = navigation.responseStart - navigation.fetchStart;
        this.recordMetric('TTFB', ttfb);
        
        const domContentLoaded = navigation.domContentLoadedEventEnd - navigation.fetchStart;
        this.recordMetric('DCL', domContentLoaded);
        
        const loadComplete = navigation.loadEventEnd - navigation.fetchStart;
        this.recordMetric('Load', loadComplete);
      }
    });
  }

  /**
   * Monitor resource loading performance
   */
  private monitorResourceLoading(): void {
    const resourceObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const resource = entry as PerformanceResourceTiming;
        
        // Track slow resources (>1s)
        if (resource.duration > 1000) {
          this.recordMetric('SlowResource', resource.duration, {
            url: resource.name,
            type: this.getResourceType(resource.name),
            size: resource.transferSize || 0
          });
        }
        
        // Track failed resources
        if (resource.transferSize === 0 && resource.duration > 0) {
          this.recordMetric('FailedResource', resource.duration, {
            url: resource.name,
            type: this.getResourceType(resource.name)
          });
        }
      }
    });
    resourceObserver.observe({ entryTypes: ['resource'] });
    this.observers.push(resourceObserver);
  }

  /**
   * Monitor user interactions
   */
  private monitorUserInteractions(): void {
    // Click tracking
    document.addEventListener('click', (event) => {
      const target = event.target as HTMLElement;
      this.recordInteraction('click', this.getElementSelector(target), {
        x: event.clientX,
        y: event.clientY,
        button: event.button
      });
    });

    // Scroll tracking (throttled)
    let scrollTimeout: NodeJS.Timeout;
    document.addEventListener('scroll', () => {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        this.recordInteraction('scroll', 'window', {
          scrollY: window.scrollY,
          scrollX: window.scrollX
        });
      }, 100);
    });

    // Search tracking
    document.addEventListener('input', (event) => {
      const target = event.target as HTMLInputElement;
      if (target.type === 'search' || target.placeholder?.toLowerCase().includes('search')) {
        this.recordInteraction('search', this.getElementSelector(target), {
          query: target.value,
          length: target.value.length
        });
      }
    });
  }

  /**
   * Monitor navigation performance
   */
  private monitorNavigation(): void {
    // Page visibility changes
    document.addEventListener('visibilitychange', () => {
      this.recordInteraction('navigation', 'visibility', {
        hidden: document.hidden,
        visibilityState: document.visibilityState
      });
    });

    // Back/forward navigation
    window.addEventListener('popstate', () => {
      this.recordInteraction('navigation', 'popstate', {
        url: window.location.href
      });
    });
  }

  /**
   * Record performance metric
   */
  private recordMetric(name: string, value: number, metadata?: Record<string, any>): void {
    const metric: PerformanceMetric = {
      name,
      value,
      timestamp: Date.now(),
      url: window.location.href,
      userAgent: navigator.userAgent
    };

    this.metrics.push(metric);
    
    // Log significant metrics
    if (['FCP', 'LCP', 'CLS', 'FID', 'TTFB'].includes(name)) {
      console.log(`📊 ${name}: ${value.toFixed(2)}${name === 'CLS' ? '' : 'ms'}`, metadata);
    }

    // Check for performance issues
    this.checkPerformanceThresholds(metric);
  }

  /**
   * Record user interaction
   */
  private recordInteraction(
    type: UserInteraction['type'], 
    target: string, 
    metadata?: Record<string, any>
  ): void {
    const interaction: UserInteraction = {
      type,
      target,
      timestamp: Date.now(),
      metadata
    };

    this.interactions.push(interaction);
    
    // Keep only recent interactions (last 1000)
    if (this.interactions.length > 1000) {
      this.interactions = this.interactions.slice(-1000);
    }
  }

  /**
   * Check performance thresholds and alert if needed
   */
  private checkPerformanceThresholds(metric: PerformanceMetric): void {
    const thresholds = {
      FCP: 1800, // 1.8s
      LCP: 2500, // 2.5s
      FID: 100,  // 100ms
      CLS: 0.1,  // 0.1
      TTFB: 600  // 600ms
    };

    const threshold = thresholds[metric.name as keyof typeof thresholds];
    if (threshold && metric.value > threshold) {
      console.warn(`⚠️ Performance threshold exceeded: ${metric.name} = ${metric.value.toFixed(2)} (threshold: ${threshold})`);
      
      // Send alert to monitoring service
      this.sendPerformanceAlert(metric, threshold);
    }
  }

  /**
   * Send performance alert
   */
  private sendPerformanceAlert(metric: PerformanceMetric, threshold: number): void {
    // In a real app, send to monitoring service like Sentry, DataDog, etc.
    if (typeof window !== 'undefined' && 'gtag' in window) {
      (window as any).gtag('event', 'performance_issue', {
        event_category: 'Performance',
        event_label: metric.name,
        value: Math.round(metric.value),
        custom_map: {
          threshold,
          url: metric.url
        }
      });
    }
  }

  /**
   * Track optimization impact
   */
  trackOptimizationImpact(
    feature: string, 
    beforeMetric: number, 
    afterMetric: number
  ): void {
    const improvement = ((beforeMetric - afterMetric) / beforeMetric) * 100;
    
    const impact: OptimizationImpact = {
      feature,
      beforeMetric,
      afterMetric,
      improvement,
      timestamp: Date.now()
    };

    this.optimizationImpacts.push(impact);
    
    console.log(`🚀 Optimization impact - ${feature}: ${improvement.toFixed(1)}% improvement`);
    
    // Send to analytics
    if (typeof window !== 'undefined' && 'gtag' in window) {
      (window as any).gtag('event', 'optimization_impact', {
        event_category: 'Performance',
        event_label: feature,
        value: Math.round(improvement),
        custom_map: {
          before: beforeMetric,
          after: afterMetric
        }
      });
    }
  }

  /**
   * Get performance summary
   */
  getPerformanceSummary(): {
    metrics: Record<string, number>;
    interactions: Record<string, number>;
    optimizations: OptimizationImpact[];
    score: number;
  } {
    const latestMetrics: Record<string, number> = {};
    
    // Get latest value for each metric
    for (const metric of this.metrics) {
      latestMetrics[metric.name] = metric.value;
    }

    // Count interactions by type
    const interactionCounts: Record<string, number> = {};
    for (const interaction of this.interactions) {
      interactionCounts[interaction.type] = (interactionCounts[interaction.type] || 0) + 1;
    }

    // Calculate performance score (0-100)
    const score = this.calculatePerformanceScore(latestMetrics);

    return {
      metrics: latestMetrics,
      interactions: interactionCounts,
      optimizations: this.optimizationImpacts,
      score
    };
  }

  /**
   * Calculate performance score
   */
  private calculatePerformanceScore(metrics: Record<string, number>): number {
    const weights = {
      FCP: 0.15,
      LCP: 0.25,
      FID: 0.25,
      CLS: 0.25,
      TTFB: 0.10
    };

    const thresholds = {
      FCP: { good: 1800, poor: 3000 },
      LCP: { good: 2500, poor: 4000 },
      FID: { good: 100, poor: 300 },
      CLS: { good: 0.1, poor: 0.25 },
      TTFB: { good: 600, poor: 1500 }
    };

    let totalScore = 0;
    let totalWeight = 0;

    for (const [metric, weight] of Object.entries(weights)) {
      const value = metrics[metric];
      const threshold = thresholds[metric as keyof typeof thresholds];
      
      if (value !== undefined && threshold) {
        let score = 100;
        
        if (value > threshold.poor) {
          score = 0;
        } else if (value > threshold.good) {
          score = 50 - ((value - threshold.good) / (threshold.poor - threshold.good)) * 50;
        }
        
        totalScore += score * weight;
        totalWeight += weight;
      }
    }

    return totalWeight > 0 ? Math.round(totalScore / totalWeight) : 0;
  }

  /**
   * Start periodic reporting
   */
  private startPeriodicReporting(): void {
    // Report every 5 minutes
    setInterval(() => {
      this.sendPerformanceReport();
    }, 5 * 60 * 1000);

    // Report on page unload
    window.addEventListener('beforeunload', () => {
      this.sendPerformanceReport();
    });
  }

  /**
   * Send performance report
   */
  private sendPerformanceReport(): void {
    const summary = this.getPerformanceSummary();
    
    // Send to analytics service
    if (typeof window !== 'undefined' && 'gtag' in window) {
      (window as any).gtag('event', 'performance_report', {
        event_category: 'Performance',
        value: summary.score,
        custom_map: {
          fcp: summary.metrics.FCP,
          lcp: summary.metrics.LCP,
          fid: summary.metrics.FID,
          cls: summary.metrics.CLS,
          ttfb: summary.metrics.TTFB,
          interactions: Object.keys(summary.interactions).length
        }
      });
    }

    console.log('📊 Performance report sent:', summary);
  }

  /**
   * Helper methods
   */
  private getResourceType(url: string): string {
    if (url.includes('.js')) return 'script';
    if (url.includes('.css')) return 'stylesheet';
    if (url.match(/\.(jpg|jpeg|png|gif|webp|svg)$/)) return 'image';
    if (url.includes('/api/')) return 'api';
    return 'other';
  }

  private getElementSelector(element: HTMLElement): string {
    if (element.id) return `#${element.id}`;
    if (element.className) return `.${element.className.split(' ')[0]}`;
    return element.tagName.toLowerCase();
  }

  /**
   * Cleanup
   */
  cleanup(): void {
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
    this.isMonitoring = false;
  }
}

// Singleton instance
export const performanceMonitor = new PerformanceMonitor();

/**
 * React hook for performance monitoring
 */
export function usePerformanceMonitoring() {
  const [summary, setSummary] = useState(performanceMonitor.getPerformanceSummary());

  useEffect(() => {
    const interval = setInterval(() => {
      setSummary(performanceMonitor.getPerformanceSummary());
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  return {
    ...summary,
    trackOptimization: performanceMonitor.trackOptimizationImpact.bind(performanceMonitor)
  };
}

/**
 * Create performance indicator component (to be used in a .tsx file)
 */
export function createPerformanceIndicator() {
  return {
    usePerformanceMonitoring,
    getScoreColor: (score: number) => {
      if (score >= 90) return 'text-green-600';
      if (score >= 50) return 'text-yellow-600';
      return 'text-red-600';
    }
  };
}
