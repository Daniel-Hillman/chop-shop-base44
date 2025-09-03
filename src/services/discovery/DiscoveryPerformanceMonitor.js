/**
 * DiscoveryPerformanceMonitor - Tracks key performance metrics for the sample discovery feature
 * 
 * This service monitors:
 * - Page load times
 * - Filter response times
 * - API call performance
 * - Memory usage patterns
 * - User interaction metrics
 * 
 * Provides debugging utilities and performance logging for optimization.
 */

class DiscoveryPerformanceMonitor {
  constructor() {
    this.metrics = new Map();
    this.timers = new Map();
    this.observers = new Map();
    this.isEnabled = process.env.NODE_ENV !== 'production' || 
                    process.env.VITE_ENABLE_PERFORMANCE_MONITORING === 'true';
    
    // Performance thresholds (in milliseconds)
    this.thresholds = {
      pageLoad: 2000,        // 2 seconds max for page load
      filterResponse: 1000,  // 1 second max for filter operations
      apiCall: 5000,         // 5 seconds max for API calls
      memoryWarning: 50 * 1024 * 1024, // 50MB memory warning threshold
    };

    this.initializeObservers();
  }

  /**
   * Initialize performance observers for automatic monitoring
   */
  initializeObservers() {
    if (!this.isEnabled || typeof window === 'undefined') return;

    try {
      // Navigation timing observer for page load metrics
      if ('PerformanceObserver' in window) {
        const navObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach(entry => {
            if (entry.entryType === 'navigation') {
              this.recordPageLoadMetrics(entry);
            }
          });
        });
        
        navObserver.observe({ entryTypes: ['navigation'] });
        this.observers.set('navigation', navObserver);
      }

      // Memory usage observer (if available)
      if ('memory' in performance) {
        this.startMemoryMonitoring();
      }
    } catch (error) {
      console.warn('Performance monitoring initialization failed:', error);
    }
  }

  /**
   * Start timing a performance metric
   * @param {string} metricName - Name of the metric to track
   * @param {Object} context - Additional context for the metric
   */
  startTiming(metricName, context = {}) {
    if (!this.isEnabled) return;

    const startTime = performance.now();
    this.timers.set(metricName, {
      startTime,
      context,
      timestamp: Date.now()
    });
  }

  /**
   * End timing and record the metric
   * @param {string} metricName - Name of the metric being tracked
   * @param {Object} additionalContext - Additional context to merge
   * @returns {number} Duration in milliseconds
   */
  endTiming(metricName, additionalContext = {}) {
    if (!this.isEnabled) return 0;

    const timer = this.timers.get(metricName);
    if (!timer) {
      console.warn(`No timer found for metric: ${metricName}`);
      return 0;
    }

    const endTime = performance.now();
    const duration = endTime - timer.startTime;
    
    const metric = {
      name: metricName,
      duration,
      startTime: timer.startTime,
      endTime,
      timestamp: timer.timestamp,
      context: { ...timer.context, ...additionalContext },
      threshold: this.thresholds[metricName] || null,
      isSlowPerformance: this.thresholds[metricName] ? duration > this.thresholds[metricName] : false
    };

    this.recordMetric(metric);
    this.timers.delete(metricName);

    return duration;
  }

  /**
   * Record a performance metric
   * @param {Object} metric - The metric data to record
   */
  recordMetric(metric) {
    if (!this.isEnabled) return;

    const metricKey = `${metric.name}_${Date.now()}`;
    this.metrics.set(metricKey, metric);

    // Log slow performance
    if (metric.isSlowPerformance) {
      console.warn(`Slow performance detected for ${metric.name}:`, {
        duration: `${metric.duration.toFixed(2)}ms`,
        threshold: `${metric.threshold}ms`,
        context: metric.context
      });
    }

    // Emit custom event for external monitoring
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('discoveryPerformanceMetric', {
        detail: metric
      }));
    }

    // Clean up old metrics (keep last 100)
    if (this.metrics.size > 100) {
      const oldestKey = this.metrics.keys().next().value;
      this.metrics.delete(oldestKey);
    }
  }

  /**
   * Track page load performance
   */
  trackPageLoad() {
    if (!this.isEnabled || typeof window === 'undefined') return;

    // Use Navigation Timing API
    const navigation = performance.getEntriesByType('navigation')[0];
    if (navigation) {
      this.recordPageLoadMetrics(navigation);
    }
  }

  /**
   * Record page load metrics from navigation entry
   * @param {PerformanceNavigationTiming} entry - Navigation timing entry
   */
  recordPageLoadMetrics(entry) {
    const metrics = {
      domContentLoaded: entry.domContentLoadedEventEnd - entry.domContentLoadedEventStart,
      loadComplete: entry.loadEventEnd - entry.loadEventStart,
      totalPageLoad: entry.loadEventEnd - entry.navigationStart,
      dnsLookup: entry.domainLookupEnd - entry.domainLookupStart,
      tcpConnect: entry.connectEnd - entry.connectStart,
      serverResponse: entry.responseEnd - entry.requestStart,
      domProcessing: entry.domComplete - entry.domLoading
    };

    Object.entries(metrics).forEach(([name, duration]) => {
      if (duration > 0) {
        this.recordMetric({
          name: `pageLoad_${name}`,
          duration,
          timestamp: Date.now(),
          context: { type: 'pageLoad' },
          threshold: name === 'totalPageLoad' ? this.thresholds.pageLoad : null,
          isSlowPerformance: name === 'totalPageLoad' && duration > this.thresholds.pageLoad
        });
      }
    });
  }

  /**
   * Track filter response time
   * @param {Object} filterState - Current filter state
   * @param {number} resultCount - Number of results returned
   */
  trackFilterResponse(filterState, resultCount) {
    const metricName = 'filterResponse';
    const context = {
      filterCount: Object.keys(filterState).length,
      resultCount,
      genres: filterState.genres?.length || 0,
      hasYearRange: !!(filterState.yearRange?.start && filterState.yearRange?.end),
      hasAdvancedFilters: !!(filterState.tempoRange || filterState.durationRange)
    };

    // This should be called after endTiming
    const lastMetric = Array.from(this.metrics.values())
      .filter(m => m.name === metricName)
      .sort((a, b) => b.timestamp - a.timestamp)[0];

    if (lastMetric) {
      lastMetric.context = { ...lastMetric.context, ...context };
    }
  }

  /**
   * Track API call performance
   * @param {string} apiName - Name of the API being called
   * @param {boolean} success - Whether the call was successful
   * @param {number} responseSize - Size of response in bytes
   */
  trackAPICall(apiName, success, responseSize = 0) {
    const metricName = `apiCall_${apiName}`;
    const context = {
      success,
      responseSize,
      apiName
    };

    // This should be called after endTiming
    const lastMetric = Array.from(this.metrics.values())
      .filter(m => m.name === metricName)
      .sort((a, b) => b.timestamp - a.timestamp)[0];

    if (lastMetric) {
      lastMetric.context = { ...lastMetric.context, ...context };
    }
  }

  /**
   * Start memory monitoring
   */
  startMemoryMonitoring() {
    if (!this.isEnabled || typeof window === 'undefined' || !('memory' in performance)) return;

    const checkMemory = () => {
      const memory = performance.memory;
      const memoryMetric = {
        name: 'memoryUsage',
        duration: 0, // Not a timing metric
        timestamp: Date.now(),
        context: {
          usedJSHeapSize: memory.usedJSHeapSize,
          totalJSHeapSize: memory.totalJSHeapSize,
          jsHeapSizeLimit: memory.jsHeapSizeLimit,
          usagePercentage: (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100
        },
        threshold: this.thresholds.memoryWarning,
        isSlowPerformance: memory.usedJSHeapSize > this.thresholds.memoryWarning
      };

      this.recordMetric(memoryMetric);
    };

    // Check memory every 30 seconds
    const memoryInterval = setInterval(checkMemory, 30000);
    this.observers.set('memory', { interval: memoryInterval });

    // Initial check
    checkMemory();
  }

  /**
   * Get performance summary
   * @param {string} metricType - Type of metrics to summarize (optional)
   * @returns {Object} Performance summary
   */
  getPerformanceSummary(metricType = null) {
    const metrics = Array.from(this.metrics.values());
    const filteredMetrics = metricType 
      ? metrics.filter(m => m.name.includes(metricType))
      : metrics;

    if (filteredMetrics.length === 0) {
      return { count: 0, averageDuration: 0, slowCount: 0 };
    }

    const durations = filteredMetrics.map(m => m.duration).filter(d => d > 0);
    const slowCount = filteredMetrics.filter(m => m.isSlowPerformance).length;

    return {
      count: filteredMetrics.length,
      averageDuration: durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 0,
      minDuration: durations.length > 0 ? Math.min(...durations) : 0,
      maxDuration: durations.length > 0 ? Math.max(...durations) : 0,
      slowCount,
      slowPercentage: (slowCount / filteredMetrics.length) * 100,
      recentMetrics: filteredMetrics.slice(-10)
    };
  }

  /**
   * Get debugging information
   * @returns {Object} Debug information
   */
  getDebugInfo() {
    return {
      isEnabled: this.isEnabled,
      metricsCount: this.metrics.size,
      activeTimers: this.timers.size,
      observers: Array.from(this.observers.keys()),
      thresholds: this.thresholds,
      recentMetrics: Array.from(this.metrics.values()).slice(-5),
      performanceSummary: {
        pageLoad: this.getPerformanceSummary('pageLoad'),
        filterResponse: this.getPerformanceSummary('filterResponse'),
        apiCall: this.getPerformanceSummary('apiCall'),
        memory: this.getPerformanceSummary('memoryUsage')
      }
    };
  }

  /**
   * Export metrics for external analysis
   * @param {string} format - Export format ('json' or 'csv')
   * @returns {string} Exported data
   */
  exportMetrics(format = 'json') {
    const metrics = Array.from(this.metrics.values());

    if (format === 'csv') {
      const headers = ['name', 'duration', 'timestamp', 'isSlowPerformance', 'context'];
      const csvRows = [headers.join(',')];
      
      metrics.forEach(metric => {
        const row = [
          metric.name,
          metric.duration,
          metric.timestamp,
          metric.isSlowPerformance,
          JSON.stringify(metric.context).replace(/,/g, ';') // Escape commas in JSON
        ];
        csvRows.push(row.join(','));
      });
      
      return csvRows.join('\n');
    }

    return JSON.stringify(metrics, null, 2);
  }

  /**
   * Clear all metrics and reset monitoring
   */
  reset() {
    this.metrics.clear();
    this.timers.clear();
  }

  /**
   * Cleanup observers and intervals
   */
  cleanup() {
    this.observers.forEach((observer, key) => {
      if (observer.disconnect) {
        observer.disconnect();
      } else if (observer.interval) {
        clearInterval(observer.interval);
      }
    });
    this.observers.clear();
    this.reset();
  }
}

export default DiscoveryPerformanceMonitor;