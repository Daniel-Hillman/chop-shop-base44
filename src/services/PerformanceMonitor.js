/**
 * PerformanceMonitor - Performance metrics and monitoring for audio operations
 * 
 * Provides comprehensive performance monitoring, memory usage tracking,
 * and automatic optimization for the YouTube Audio Sampler system.
 */

class PerformanceMonitor {
  constructor() {
    this.metrics = new Map();
    this.memorySnapshots = [];
    this.performanceObserver = null;
    this.isMonitoring = false;
    
    // Configuration
    this.config = {
      maxMetricsHistory: 100,
      memorySnapshotInterval: 5000, // 5 seconds
      maxMemorySnapshots: 50,
      performanceThresholds: {
        audioDownload: 30000, // 30 seconds max
        audioProcessing: 10000, // 10 seconds max
        waveformGeneration: 5000, // 5 seconds max
        memoryUsage: 500 * 1024 * 1024, // 500MB max
        gcTriggerThreshold: 0.8 // Trigger GC at 80% memory usage
      }
    };

    // Bind methods
    this.startMonitoring = this.startMonitoring.bind(this);
    this.stopMonitoring = this.stopMonitoring.bind(this);
    this.recordMetric = this.recordMetric.bind(this);
    this.getMetrics = this.getMetrics.bind(this);
    this.cleanup = this.cleanup.bind(this);
  }

  /**
   * Start performance monitoring
   */
  startMonitoring() {
    if (this.isMonitoring) return;

    this.isMonitoring = true;
    
    // Start memory monitoring
    this.startMemoryMonitoring();
    
    // Initialize Performance Observer if available
    this.initializePerformanceObserver();
    
    console.log('PerformanceMonitor started');
  }

  /**
   * Stop performance monitoring
   */
  stopMonitoring() {
    if (!this.isMonitoring) return;

    this.isMonitoring = false;
    
    // Stop memory monitoring
    if (this.memoryInterval) {
      clearInterval(this.memoryInterval);
      this.memoryInterval = null;
    }
    
    // Disconnect performance observer
    if (this.performanceObserver) {
      this.performanceObserver.disconnect();
      this.performanceObserver = null;
    }
    
    console.log('PerformanceMonitor stopped');
  }

  /**
   * Record a performance metric
   * @param {string} operation - Operation name
   * @param {number} duration - Duration in milliseconds
   * @param {Object} metadata - Additional metadata
   */
  recordMetric(operation, duration, metadata = {}) {
    const timestamp = Date.now();
    const metric = {
      operation,
      duration,
      timestamp,
      metadata: { ...metadata }
    };

    // Add to metrics history
    if (!this.metrics.has(operation)) {
      this.metrics.set(operation, []);
    }
    
    const operationMetrics = this.metrics.get(operation);
    operationMetrics.push(metric);
    
    // Limit history size
    if (operationMetrics.length > this.config.maxMetricsHistory) {
      operationMetrics.shift();
    }

    // Check performance thresholds
    this.checkPerformanceThresholds(operation, duration, metadata);
    
    return metric;
  }

  /**
   * Start a performance measurement
   * @param {string} operation - Operation name
   * @returns {Function} End measurement function
   */
  startMeasurement(operation) {
    const startTime = performance.now();
    const startMemory = this.getCurrentMemoryUsage();
    
    return (metadata = {}) => {
      const endTime = performance.now();
      const duration = endTime - startTime;
      const endMemory = this.getCurrentMemoryUsage();
      
      const enhancedMetadata = {
        ...metadata,
        startMemory,
        endMemory,
        memoryDelta: endMemory.usedJSHeapSize - startMemory.usedJSHeapSize
      };
      
      return this.recordMetric(operation, duration, enhancedMetadata);
    };
  }

  /**
   * Get performance metrics for an operation
   * @param {string} operation - Operation name
   * @returns {Object} Metrics summary
   */
  getMetrics(operation = null) {
    if (operation) {
      const operationMetrics = this.metrics.get(operation) || [];
      return this.calculateMetricsSummary(operationMetrics, operation);
    }
    
    // Return all metrics
    const allMetrics = {};
    for (const [op, metrics] of this.metrics) {
      allMetrics[op] = this.calculateMetricsSummary(metrics, op);
    }
    
    return {
      operations: allMetrics,
      memory: this.getMemoryMetrics(),
      system: this.getSystemMetrics()
    };
  }

  /**
   * Get current memory usage
   * @returns {Object} Memory usage information
   */
  getCurrentMemoryUsage() {
    if ('memory' in performance) {
      return {
        usedJSHeapSize: performance.memory.usedJSHeapSize,
        totalJSHeapSize: performance.memory.totalJSHeapSize,
        jsHeapSizeLimit: performance.memory.jsHeapSizeLimit,
        timestamp: Date.now()
      };
    }
    
    return {
      usedJSHeapSize: 0,
      totalJSHeapSize: 0,
      jsHeapSizeLimit: 0,
      timestamp: Date.now(),
      unavailable: true
    };
  }

  /**
   * Check if garbage collection should be triggered
   * @returns {boolean} True if GC should be triggered
   */
  shouldTriggerGC() {
    const memory = this.getCurrentMemoryUsage();
    
    if (memory.unavailable) return false;
    
    const usageRatio = memory.usedJSHeapSize / memory.jsHeapSizeLimit;
    return usageRatio > this.config.performanceThresholds.gcTriggerThreshold;
  }

  /**
   * Trigger garbage collection if possible
   * @returns {boolean} True if GC was triggered
   */
  triggerGC() {
    // Note: Manual GC is not available in standard browsers
    // This is mainly for development/testing environments
    if (window.gc && typeof window.gc === 'function') {
      try {
        const beforeMemory = this.getCurrentMemoryUsage();
        window.gc();
        const afterMemory = this.getCurrentMemoryUsage();
        
        console.log('Manual GC triggered:', {
          before: this.formatBytes(beforeMemory.usedJSHeapSize),
          after: this.formatBytes(afterMemory.usedJSHeapSize),
          freed: this.formatBytes(beforeMemory.usedJSHeapSize - afterMemory.usedJSHeapSize)
        });
        
        return true;
      } catch (error) {
        console.warn('Failed to trigger manual GC:', error);
      }
    }
    
    return false;
  }

  /**
   * Get memory optimization recommendations
   * @returns {Array} Array of recommendations
   */
  getMemoryOptimizationRecommendations() {
    const recommendations = [];
    const memory = this.getCurrentMemoryUsage();
    
    if (memory.unavailable) {
      return ['Memory monitoring unavailable in this environment'];
    }
    
    const usageRatio = memory.usedJSHeapSize / memory.jsHeapSizeLimit;
    
    if (usageRatio > 0.9) {
      recommendations.push('Critical: Memory usage above 90%. Consider clearing audio cache.');
    } else if (usageRatio > 0.8) {
      recommendations.push('Warning: Memory usage above 80%. Monitor closely.');
    }
    
    // Check for memory leaks
    if (this.memorySnapshots.length >= 10) {
      const recent = this.memorySnapshots.slice(-10);
      const trend = this.calculateMemoryTrend(recent);
      
      if (trend > 0.1) { // 10% increase trend
        recommendations.push('Potential memory leak detected. Consider restarting the application.');
      }
    }
    
    // Check audio cache size
    const audioMetrics = this.metrics.get('audio_processing') || [];
    if (audioMetrics.length > 0) {
      const avgMemoryDelta = audioMetrics.reduce((sum, m) => sum + (m.metadata.memoryDelta || 0), 0) / audioMetrics.length;
      
      if (avgMemoryDelta > 50 * 1024 * 1024) { // 50MB average increase
        recommendations.push('Audio processing consuming significant memory. Consider optimizing buffer management.');
      }
    }
    
    return recommendations;
  }

  /**
   * Get performance optimization recommendations
   * @returns {Array} Array of recommendations
   */
  getPerformanceOptimizationRecommendations() {
    const recommendations = [];
    
    // Check audio download performance
    const downloadMetrics = this.metrics.get('audio_download') || [];
    if (downloadMetrics.length > 0) {
      const avgDuration = downloadMetrics.reduce((sum, m) => sum + m.duration, 0) / downloadMetrics.length;
      
      if (avgDuration > this.config.performanceThresholds.audioDownload) {
        recommendations.push('Audio downloads are slow. Check network connection or server performance.');
      }
    }
    
    // Check waveform generation performance
    const waveformMetrics = this.metrics.get('waveform_generation') || [];
    if (waveformMetrics.length > 0) {
      const avgDuration = waveformMetrics.reduce((sum, m) => sum + m.duration, 0) / waveformMetrics.length;
      
      if (avgDuration > this.config.performanceThresholds.waveformGeneration) {
        recommendations.push('Waveform generation is slow. Consider using Web Workers or reducing sample count.');
      }
    }
    
    return recommendations;
  }

  // Private methods

  /**
   * Start memory monitoring interval
   * @private
   */
  startMemoryMonitoring() {
    this.memoryInterval = setInterval(() => {
      const snapshot = this.getCurrentMemoryUsage();
      this.memorySnapshots.push(snapshot);
      
      // Limit snapshots history
      if (this.memorySnapshots.length > this.config.maxMemorySnapshots) {
        this.memorySnapshots.shift();
      }
      
      // Check if GC should be triggered
      if (this.shouldTriggerGC()) {
        this.triggerGC();
      }
      
    }, this.config.memorySnapshotInterval);
  }

  /**
   * Initialize Performance Observer
   * @private
   */
  initializePerformanceObserver() {
    if ('PerformanceObserver' in window) {
      try {
        this.performanceObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          
          for (const entry of entries) {
            if (entry.entryType === 'measure') {
              this.recordMetric(`browser_${entry.name}`, entry.duration, {
                entryType: entry.entryType,
                startTime: entry.startTime
              });
            }
          }
        });
        
        this.performanceObserver.observe({ entryTypes: ['measure', 'navigation'] });
      } catch (error) {
        console.warn('Failed to initialize PerformanceObserver:', error);
      }
    }
  }

  /**
   * Check performance thresholds and log warnings
   * @private
   */
  checkPerformanceThresholds(operation, duration, metadata) {
    const threshold = this.config.performanceThresholds[operation];
    
    if (threshold && duration > threshold) {
      console.warn(`Performance threshold exceeded for ${operation}:`, {
        duration: `${duration}ms`,
        threshold: `${threshold}ms`,
        metadata
      });
    }
  }

  /**
   * Calculate metrics summary for an operation
   * @private
   */
  calculateMetricsSummary(metrics, operation) {
    if (metrics.length === 0) {
      return {
        operation,
        count: 0,
        avgDuration: 0,
        minDuration: 0,
        maxDuration: 0,
        totalDuration: 0
      };
    }
    
    const durations = metrics.map(m => m.duration);
    const totalDuration = durations.reduce((sum, d) => sum + d, 0);
    
    return {
      operation,
      count: metrics.length,
      avgDuration: Math.round(totalDuration / metrics.length),
      minDuration: Math.min(...durations),
      maxDuration: Math.max(...durations),
      totalDuration: Math.round(totalDuration),
      recentMetrics: metrics.slice(-5) // Last 5 metrics
    };
  }

  /**
   * Get memory metrics summary
   * @private
   */
  getMemoryMetrics() {
    if (this.memorySnapshots.length === 0) {
      return { unavailable: true };
    }
    
    const latest = this.memorySnapshots[this.memorySnapshots.length - 1];
    const trend = this.calculateMemoryTrend(this.memorySnapshots.slice(-10));
    
    return {
      current: {
        used: this.formatBytes(latest.usedJSHeapSize),
        total: this.formatBytes(latest.totalJSHeapSize),
        limit: this.formatBytes(latest.jsHeapSizeLimit),
        usagePercent: Math.round((latest.usedJSHeapSize / latest.jsHeapSizeLimit) * 100)
      },
      trend: {
        direction: trend > 0.05 ? 'increasing' : trend < -0.05 ? 'decreasing' : 'stable',
        percentage: Math.round(trend * 100)
      },
      snapshots: this.memorySnapshots.length
    };
  }

  /**
   * Get system metrics
   * @private
   */
  getSystemMetrics() {
    const metrics = {
      timestamp: Date.now(),
      userAgent: navigator.userAgent,
      hardwareConcurrency: navigator.hardwareConcurrency || 'unknown'
    };
    
    // Add connection information if available
    if ('connection' in navigator) {
      metrics.connection = {
        effectiveType: navigator.connection.effectiveType,
        downlink: navigator.connection.downlink,
        rtt: navigator.connection.rtt
      };
    }
    
    return metrics;
  }

  /**
   * Calculate memory usage trend
   * @private
   */
  calculateMemoryTrend(snapshots) {
    if (snapshots.length < 2) return 0;
    
    const first = snapshots[0].usedJSHeapSize;
    const last = snapshots[snapshots.length - 1].usedJSHeapSize;
    
    return (last - first) / first;
  }

  /**
   * Format bytes to human readable string
   * @private
   */
  formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Clean up resources
   */
  cleanup() {
    this.stopMonitoring();
    this.metrics.clear();
    this.memorySnapshots = [];
    console.log('PerformanceMonitor cleaned up');
  }
}

// Create and export singleton instance
const performanceMonitor = new PerformanceMonitor();

// Auto-start monitoring
performanceMonitor.startMonitoring();

// Clean up on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    performanceMonitor.cleanup();
  });
}

export default performanceMonitor;