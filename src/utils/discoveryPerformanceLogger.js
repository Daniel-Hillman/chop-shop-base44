/**
 * Discovery Performance Logger - Utility for logging and debugging performance metrics
 * 
 * Provides structured logging, performance alerts, and debugging utilities
 * for the sample discovery feature performance monitoring.
 */

/**
 * Performance logger configuration
 */
const LOGGER_CONFIG = {
  // Log levels
  levels: {
    DEBUG: 0,
    INFO: 1,
    WARN: 2,
    ERROR: 3
  },
  
  // Current log level (can be overridden by environment)
  currentLevel: process.env.VITE_LOG_LEVEL === 'debug' ? 0 : 
                process.env.NODE_ENV === 'development' ? 1 : 
                process.env.NODE_ENV === 'test' ? 0 : 2,
  
  // Performance thresholds for different log levels
  thresholds: {
    info: 500,    // Log info for operations > 500ms
    warn: 1000,   // Log warning for operations > 1s
    error: 3000   // Log error for operations > 3s
  },
  
  // Enable/disable different logging features
  features: {
    console: true,
    localStorage: process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test',
    analytics: process.env.NODE_ENV === 'production',
    alerts: true
  }
};

/**
 * Performance Logger Class
 */
class DiscoveryPerformanceLogger {
  constructor(config = LOGGER_CONFIG) {
    this.config = { ...LOGGER_CONFIG, ...config };
    this.logBuffer = [];
    this.maxBufferSize = 100;
    this.alertCallbacks = new Set();
    
    this.initializeLogger();
  }

  /**
   * Initialize the logger
   */
  initializeLogger() {
    // Load existing logs from localStorage if enabled
    if (this.config.features.localStorage && typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('discoveryPerformanceLogs');
        if (stored) {
          this.logBuffer = JSON.parse(stored).slice(-this.maxBufferSize);
        }
      } catch (error) {
        console.warn('Failed to load performance logs from localStorage:', error);
      }
    }

    // Set up periodic log persistence
    if (this.config.features.localStorage) {
      this.persistInterval = setInterval(() => {
        this.persistLogs();
      }, 30000); // Persist every 30 seconds
    }
  }

  /**
   * Log a performance metric
   * @param {Object} metric - Performance metric data
   * @param {string} level - Log level (debug, info, warn, error)
   * @param {string} message - Custom message
   */
  logMetric(metric, level = 'info', message = null) {
    if (!this.shouldLog(level)) return;

    const logEntry = {
      timestamp: Date.now(),
      level: level.toUpperCase(),
      metric,
      message: message || this.generateMessage(metric),
      context: this.getContextInfo()
    };

    this.addToBuffer(logEntry);
    this.outputLog(logEntry);
    this.checkAlerts(logEntry);
  }

  /**
   * Log page load performance
   * @param {Object} pageLoadMetrics - Page load timing data
   */
  logPageLoad(pageLoadMetrics) {
    const totalTime = pageLoadMetrics.totalPageLoad || 0;
    const level = this.getLogLevel(totalTime);
    
    this.logMetric({
      type: 'pageLoad',
      ...pageLoadMetrics
    }, level, `Page loaded in ${totalTime.toFixed(2)}ms`);
  }

  /**
   * Log filter operation performance
   * @param {Object} filterMetrics - Filter operation timing data
   */
  logFilterOperation(filterMetrics) {
    const duration = filterMetrics.duration || 0;
    const level = this.getLogLevel(duration);
    
    this.logMetric({
      type: 'filterOperation',
      ...filterMetrics
    }, level, `Filter operation completed in ${duration.toFixed(2)}ms`);
  }

  /**
   * Log API call performance
   * @param {Object} apiMetrics - API call timing data
   */
  logAPICall(apiMetrics) {
    const duration = apiMetrics.duration || 0;
    const success = apiMetrics.context?.success ?? true;
    const level = success ? this.getLogLevel(duration) : 'error';
    
    const message = success 
      ? `API call (${apiMetrics.context?.apiName}) completed in ${duration.toFixed(2)}ms`
      : `API call (${apiMetrics.context?.apiName}) failed after ${duration.toFixed(2)}ms`;
    
    this.logMetric({
      type: 'apiCall',
      ...apiMetrics
    }, level, message);
  }

  /**
   * Log memory usage
   * @param {Object} memoryMetrics - Memory usage data
   */
  logMemoryUsage(memoryMetrics) {
    const usagePercentage = memoryMetrics.context?.usagePercentage || 0;
    const level = usagePercentage > 80 ? 'error' : usagePercentage > 60 ? 'warn' : 'info';
    
    this.logMetric({
      type: 'memoryUsage',
      ...memoryMetrics
    }, level, `Memory usage: ${usagePercentage.toFixed(1)}%`);
  }

  /**
   * Log performance alert
   * @param {string} alertType - Type of alert
   * @param {Object} data - Alert data
   * @param {string} message - Alert message
   */
  logAlert(alertType, data, message) {
    const alertEntry = {
      timestamp: Date.now(),
      level: 'ALERT',
      alertType,
      data,
      message,
      context: this.getContextInfo()
    };

    this.addToBuffer(alertEntry);
    this.outputLog(alertEntry);
    this.triggerAlerts(alertEntry);
  }

  /**
   * Generate automatic message for metric
   * @param {Object} metric - Metric data
   * @returns {string} Generated message
   */
  generateMessage(metric) {
    const { name, duration, isSlowPerformance } = metric;
    
    if (duration > 0) {
      const performanceNote = isSlowPerformance ? ' (SLOW)' : '';
      return `${name}: ${duration.toFixed(2)}ms${performanceNote}`;
    }
    
    return `${name}: ${JSON.stringify(metric.context || {})}`;
  }

  /**
   * Determine log level based on duration
   * @param {number} duration - Operation duration in ms
   * @returns {string} Log level
   */
  getLogLevel(duration) {
    if (duration > this.config.thresholds.error) return 'error';
    if (duration > this.config.thresholds.warn) return 'warn';
    if (duration > this.config.thresholds.info) return 'info';
    return 'debug';
  }

  /**
   * Check if should log at given level
   * @param {string} level - Log level to check
   * @returns {boolean} Whether to log
   */
  shouldLog(level) {
    const levelValue = this.config.levels[level.toUpperCase()] ?? 1;
    return levelValue >= this.config.currentLevel;
  }

  /**
   * Add entry to log buffer
   * @param {Object} entry - Log entry
   */
  addToBuffer(entry) {
    this.logBuffer.push(entry);
    
    // Maintain buffer size
    if (this.logBuffer.length > this.maxBufferSize) {
      this.logBuffer = this.logBuffer.slice(-this.maxBufferSize);
    }
  }

  /**
   * Output log entry to console
   * @param {Object} entry - Log entry
   */
  outputLog(entry) {
    if (!this.config.features.console) return;

    const { level, message, metric } = entry;
    const timestamp = new Date(entry.timestamp).toISOString();
    const prefix = `[${timestamp}] [DISCOVERY-PERF] [${level}]`;

    switch (level) {
      case 'DEBUG':
        console.debug(`${prefix} ${message}`, metric);
        break;
      case 'INFO':
        console.info(`${prefix} ${message}`, metric);
        break;
      case 'WARN':
        console.warn(`${prefix} ${message}`, metric);
        break;
      case 'ERROR':
      case 'ALERT':
        console.error(`${prefix} ${message}`, metric || entry.data);
        break;
      default:
        console.log(`${prefix} ${message}`, metric);
    }
  }

  /**
   * Check for performance alerts
   * @param {Object} entry - Log entry
   */
  checkAlerts(entry) {
    if (!this.config.features.alerts) return;

    const { metric } = entry;
    
    // Check for slow performance
    if (metric?.isSlowPerformance) {
      this.logAlert('SLOW_PERFORMANCE', metric, 
        `Slow performance detected: ${metric.name} took ${metric.duration}ms (threshold: ${metric.threshold}ms)`);
    }

    // Check for memory warnings
    if (metric?.type === 'memoryUsage' && metric.context?.usagePercentage > 80) {
      this.logAlert('HIGH_MEMORY_USAGE', metric, 
        `High memory usage: ${metric.context.usagePercentage.toFixed(1)}%`);
    }

    // Check for API failures
    if (metric?.type === 'apiCall' && !metric.context?.success) {
      this.logAlert('API_FAILURE', metric, 
        `API call failed: ${metric.context?.apiName}`);
    }
  }

  /**
   * Trigger alert callbacks
   * @param {Object} alertEntry - Alert entry
   */
  triggerAlerts(alertEntry) {
    this.alertCallbacks.forEach(callback => {
      try {
        callback(alertEntry);
      } catch (error) {
        console.error('Alert callback failed:', error);
      }
    });
  }

  /**
   * Add alert callback
   * @param {Function} callback - Alert callback function
   */
  onAlert(callback) {
    this.alertCallbacks.add(callback);
    
    // Return unsubscribe function
    return () => {
      this.alertCallbacks.delete(callback);
    };
  }

  /**
   * Get context information
   * @returns {Object} Context data
   */
  getContextInfo() {
    const context = {
      timestamp: Date.now(),
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
      url: typeof window !== 'undefined' ? window.location.href : 'unknown'
    };

    // Add memory info if available
    if (typeof performance !== 'undefined' && performance.memory) {
      context.memory = {
        used: performance.memory.usedJSHeapSize,
        total: performance.memory.totalJSHeapSize,
        limit: performance.memory.jsHeapSizeLimit
      };
    }

    return context;
  }

  /**
   * Get recent logs
   * @param {number} count - Number of recent logs to return
   * @param {string} level - Filter by log level (optional)
   * @returns {Array} Recent log entries
   */
  getRecentLogs(count = 10, level = null) {
    let logs = [...this.logBuffer];
    
    if (level) {
      logs = logs.filter(entry => entry.level === level.toUpperCase());
    }
    
    return logs.slice(-count);
  }

  /**
   * Get performance summary from logs
   * @returns {Object} Performance summary
   */
  getPerformanceSummary() {
    const metrics = this.logBuffer
      .filter(entry => entry.metric)
      .map(entry => entry.metric);

    const summary = {
      totalLogs: this.logBuffer.length,
      metricsCount: metrics.length,
      alertsCount: this.logBuffer.filter(entry => entry.level === 'ALERT').length,
      slowOperations: metrics.filter(m => m.isSlowPerformance).length,
      averageDuration: 0,
      byType: {}
    };

    // Calculate averages by type
    const typeGroups = {};
    metrics.forEach(metric => {
      const type = metric.type || metric.name?.split('_')[0] || 'unknown';
      if (!typeGroups[type]) {
        typeGroups[type] = [];
      }
      if (metric.duration > 0) {
        typeGroups[type].push(metric.duration);
      }
    });

    Object.entries(typeGroups).forEach(([type, durations]) => {
      if (durations.length > 0) {
        summary.byType[type] = {
          count: durations.length,
          average: durations.reduce((a, b) => a + b, 0) / durations.length,
          min: Math.min(...durations),
          max: Math.max(...durations)
        };
      }
    });

    // Overall average
    const allDurations = Object.values(typeGroups).flat();
    if (allDurations.length > 0) {
      summary.averageDuration = allDurations.reduce((a, b) => a + b, 0) / allDurations.length;
    }

    return summary;
  }

  /**
   * Export logs
   * @param {string} format - Export format ('json' or 'csv')
   * @returns {string} Exported logs
   */
  exportLogs(format = 'json') {
    if (format === 'csv') {
      const headers = ['timestamp', 'level', 'message', 'type', 'duration', 'context'];
      const csvRows = [headers.join(',')];
      
      this.logBuffer.forEach(entry => {
        const row = [
          new Date(entry.timestamp).toISOString(),
          entry.level,
          `"${entry.message?.replace(/"/g, '""') || ''}"`,
          entry.metric?.type || entry.alertType || '',
          entry.metric?.duration || '',
          `"${JSON.stringify(entry.context || {}).replace(/"/g, '""')}"`
        ];
        csvRows.push(row.join(','));
      });
      
      return csvRows.join('\n');
    }

    return JSON.stringify(this.logBuffer, null, 2);
  }

  /**
   * Persist logs to localStorage
   */
  persistLogs() {
    if (!this.config.features.localStorage || typeof window === 'undefined') return;

    try {
      localStorage.setItem('discoveryPerformanceLogs', JSON.stringify(this.logBuffer));
    } catch (error) {
      console.warn('Failed to persist performance logs:', error);
    }
  }

  /**
   * Clear all logs
   */
  clearLogs() {
    this.logBuffer = [];
    
    if (this.config.features.localStorage && typeof window !== 'undefined') {
      try {
        localStorage.removeItem('discoveryPerformanceLogs');
      } catch (error) {
        console.warn('Failed to clear performance logs from localStorage:', error);
      }
    }
  }

  /**
   * Cleanup logger
   */
  cleanup() {
    if (this.persistInterval) {
      clearInterval(this.persistInterval);
    }
    
    this.alertCallbacks.clear();
    this.persistLogs(); // Final persist before cleanup
  }
}

// Create singleton instance
const discoveryPerformanceLogger = new DiscoveryPerformanceLogger();

// Export both class and singleton
export { DiscoveryPerformanceLogger };
export default discoveryPerformanceLogger;