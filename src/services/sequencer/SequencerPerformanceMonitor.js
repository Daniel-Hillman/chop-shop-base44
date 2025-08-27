/**
 * SequencerPerformanceMonitor - Specialized performance monitoring for the drum sequencer
 * 
 * Extends the existing PerformanceMonitor with sequencer-specific metrics including
 * timing accuracy, audio latency, memory usage for patterns and samples, and
 * performance alerts for timing drift or high CPU usage.
 */

import performanceMonitor from '../PerformanceMonitor.js';

class SequencerPerformanceMonitor {
  constructor() {
    this.baseMonitor = performanceMonitor;
    this.sequencerMetrics = new Map();
    this.timingAccuracyHistory = [];
    this.audioLatencyHistory = [];
    this.memoryUsageHistory = [];
    this.alertCallbacks = [];
    
    // Sequencer-specific configuration
    this.config = {
      maxTimingAccuracyHistory: 100,
      maxAudioLatencyHistory: 100,
      maxMemoryUsageHistory: 50,
      timingAccuracyThreshold: 5.0, // 5ms timing drift threshold
      audioLatencyThreshold: 50.0, // 50ms audio latency threshold
      memoryUsageThreshold: 100 * 1024 * 1024, // 100MB memory threshold
      cpuUsageThreshold: 80, // 80% CPU usage threshold
      alertCooldown: 5000 // 5 seconds between alerts
    };
    
    this.lastAlertTime = new Map();
    this.isMonitoring = false;
    this.monitoringInterval = null;
  }

  /**
   * Start sequencer-specific performance monitoring
   */
  startMonitoring() {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    
    // Start base monitoring if not already started
    if (!this.baseMonitor.isMonitoring) {
      this.baseMonitor.startMonitoring();
    }
    
    // Start sequencer-specific monitoring interval
    this.monitoringInterval = setInterval(() => {
      this.collectSequencerMetrics();
      this.checkPerformanceAlerts();
    }, 1000); // Check every second
    
    console.log('SequencerPerformanceMonitor started');
  }

  /**
   * Stop sequencer-specific performance monitoring
   */
  stopMonitoring() {
    if (!this.isMonitoring) return;
    
    this.isMonitoring = false;
    
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    
    console.log('SequencerPerformanceMonitor stopped');
  }

  /**
   * Record timing accuracy measurement
   * @param {number} expectedTime - Expected timing
   * @param {number} actualTime - Actual timing
   * @param {number} stepIndex - Current step index
   */
  recordTimingAccuracy(expectedTime, actualTime, stepIndex) {
    const drift = Math.abs(actualTime - expectedTime) * 1000; // Convert to milliseconds
    const timestamp = Date.now();
    
    const measurement = {
      expectedTime,
      actualTime,
      drift,
      stepIndex,
      timestamp
    };
    
    this.timingAccuracyHistory.push(measurement);
    
    // Limit history size
    if (this.timingAccuracyHistory.length > this.config.maxTimingAccuracyHistory) {
      this.timingAccuracyHistory.shift();
    }
    
    // Record in base monitor
    this.baseMonitor.recordMetric('sequencer_timing_accuracy', drift, {
      stepIndex,
      expectedTime,
      actualTime
    });
    
    // Check for timing drift alert
    if (drift > this.config.timingAccuracyThreshold) {
      this.triggerAlert('timing_drift', {
        drift,
        stepIndex,
        threshold: this.config.timingAccuracyThreshold
      });
    }
  }

  /**
   * Record audio latency measurement
   * @param {number} scheduleTime - When note was scheduled
   * @param {number} actualPlayTime - When note actually played
   * @param {string} trackId - Track identifier
   */
  recordAudioLatency(scheduleTime, actualPlayTime, trackId) {
    const latency = (actualPlayTime - scheduleTime) * 1000; // Convert to milliseconds
    const timestamp = Date.now();
    
    const measurement = {
      scheduleTime,
      actualPlayTime,
      latency,
      trackId,
      timestamp
    };
    
    this.audioLatencyHistory.push(measurement);
    
    // Limit history size
    if (this.audioLatencyHistory.length > this.config.maxAudioLatencyHistory) {
      this.audioLatencyHistory.shift();
    }
    
    // Record in base monitor
    this.baseMonitor.recordMetric('sequencer_audio_latency', latency, {
      trackId,
      scheduleTime,
      actualPlayTime
    });
    
    // Check for high latency alert
    if (latency > this.config.audioLatencyThreshold) {
      this.triggerAlert('high_audio_latency', {
        latency,
        trackId,
        threshold: this.config.audioLatencyThreshold
      });
    }
  }

  /**
   * Record memory usage for patterns and samples
   * @param {Object} memoryUsage - Memory usage breakdown
   */
  recordMemoryUsage(memoryUsage) {
    const timestamp = Date.now();
    const totalUsage = memoryUsage.patterns + memoryUsage.samples + memoryUsage.audioBuffers;
    
    const measurement = {
      ...memoryUsage,
      totalUsage,
      timestamp
    };
    
    this.memoryUsageHistory.push(measurement);
    
    // Limit history size
    if (this.memoryUsageHistory.length > this.config.maxMemoryUsageHistory) {
      this.memoryUsageHistory.shift();
    }
    
    // Record in base monitor
    this.baseMonitor.recordMetric('sequencer_memory_usage', totalUsage, memoryUsage);
    
    // Check for high memory usage alert
    if (totalUsage > this.config.memoryUsageThreshold) {
      this.triggerAlert('high_memory_usage', {
        totalUsage,
        breakdown: memoryUsage,
        threshold: this.config.memoryUsageThreshold
      });
    }
  }

  /**
   * Record CPU usage measurement
   * @param {number} cpuUsage - CPU usage percentage
   * @param {string} operation - Operation causing CPU usage
   */
  recordCPUUsage(cpuUsage, operation) {
    // Record in base monitor
    this.baseMonitor.recordMetric('sequencer_cpu_usage', cpuUsage, { operation });
    
    // Check for high CPU usage alert
    if (cpuUsage > this.config.cpuUsageThreshold) {
      this.triggerAlert('high_cpu_usage', {
        cpuUsage,
        operation,
        threshold: this.config.cpuUsageThreshold
      });
    }
  }

  /**
   * Get timing accuracy statistics
   * @returns {Object} Timing accuracy stats
   */
  getTimingAccuracyStats() {
    if (this.timingAccuracyHistory.length === 0) {
      return {
        count: 0,
        averageDrift: 0,
        maxDrift: 0,
        minDrift: 0,
        recentDrift: 0
      };
    }
    
    const drifts = this.timingAccuracyHistory.map(m => m.drift);
    const recent = this.timingAccuracyHistory.slice(-10);
    const recentDrift = recent.length > 0 ? 
      recent.reduce((sum, m) => sum + m.drift, 0) / recent.length : 0;
    
    return {
      count: this.timingAccuracyHistory.length,
      averageDrift: drifts.reduce((sum, d) => sum + d, 0) / drifts.length,
      maxDrift: Math.max(...drifts),
      minDrift: Math.min(...drifts),
      recentDrift,
      isStable: recentDrift < this.config.timingAccuracyThreshold
    };
  }

  /**
   * Get audio latency statistics
   * @returns {Object} Audio latency stats
   */
  getAudioLatencyStats() {
    if (this.audioLatencyHistory.length === 0) {
      return {
        count: 0,
        averageLatency: 0,
        maxLatency: 0,
        minLatency: 0,
        recentLatency: 0
      };
    }
    
    const latencies = this.audioLatencyHistory.map(m => m.latency);
    const recent = this.audioLatencyHistory.slice(-10);
    const recentLatency = recent.length > 0 ? 
      recent.reduce((sum, m) => sum + m.latency, 0) / recent.length : 0;
    
    return {
      count: this.audioLatencyHistory.length,
      averageLatency: latencies.reduce((sum, l) => sum + l, 0) / latencies.length,
      maxLatency: Math.max(...latencies),
      minLatency: Math.min(...latencies),
      recentLatency,
      isAcceptable: recentLatency < this.config.audioLatencyThreshold
    };
  }

  /**
   * Get memory usage statistics
   * @returns {Object} Memory usage stats
   */
  getMemoryUsageStats() {
    if (this.memoryUsageHistory.length === 0) {
      return {
        count: 0,
        currentUsage: 0,
        peakUsage: 0,
        averageUsage: 0,
        breakdown: {}
      };
    }
    
    const latest = this.memoryUsageHistory[this.memoryUsageHistory.length - 1];
    const totalUsages = this.memoryUsageHistory.map(m => m.totalUsage);
    const peakUsage = Math.max(...totalUsages);
    const averageUsage = totalUsages.reduce((sum, u) => sum + u, 0) / totalUsages.length;
    
    return {
      count: this.memoryUsageHistory.length,
      currentUsage: latest.totalUsage,
      peakUsage,
      averageUsage,
      breakdown: {
        patterns: latest.patterns,
        samples: latest.samples,
        audioBuffers: latest.audioBuffers
      },
      isWithinLimits: latest.totalUsage < this.config.memoryUsageThreshold
    };
  }

  /**
   * Get comprehensive sequencer performance report
   * @returns {Object} Complete performance report
   */
  getPerformanceReport() {
    return {
      timestamp: Date.now(),
      isMonitoring: this.isMonitoring,
      timingAccuracy: this.getTimingAccuracyStats(),
      audioLatency: this.getAudioLatencyStats(),
      memoryUsage: this.getMemoryUsageStats(),
      baseMetrics: this.baseMonitor.getMetrics(),
      recommendations: this.getPerformanceRecommendations()
    };
  }

  /**
   * Get performance optimization recommendations
   * @returns {Array} Array of recommendations
   */
  getPerformanceRecommendations() {
    const recommendations = [];
    
    // Timing accuracy recommendations
    const timingStats = this.getTimingAccuracyStats();
    if (!timingStats.isStable) {
      recommendations.push({
        type: 'timing',
        severity: 'high',
        message: `Timing drift detected (${timingStats.recentDrift.toFixed(2)}ms). Consider reducing system load or using a dedicated audio thread.`
      });
    }
    
    // Audio latency recommendations
    const latencyStats = this.getAudioLatencyStats();
    if (!latencyStats.isAcceptable) {
      recommendations.push({
        type: 'latency',
        severity: 'medium',
        message: `High audio latency detected (${latencyStats.recentLatency.toFixed(2)}ms). Check audio buffer size and system audio settings.`
      });
    }
    
    // Memory usage recommendations
    const memoryStats = this.getMemoryUsageStats();
    if (!memoryStats.isWithinLimits) {
      recommendations.push({
        type: 'memory',
        severity: 'high',
        message: `High memory usage detected (${this.formatBytes(memoryStats.currentUsage)}). Consider clearing unused patterns or samples.`
      });
    }
    
    // Add base monitor recommendations
    const baseRecommendations = this.baseMonitor.getPerformanceOptimizationRecommendations();
    baseRecommendations.forEach(rec => {
      recommendations.push({
        type: 'general',
        severity: 'medium',
        message: rec
      });
    });
    
    return recommendations;
  }

  /**
   * Add alert callback
   * @param {Function} callback - Alert callback function
   */
  onAlert(callback) {
    if (typeof callback === 'function') {
      this.alertCallbacks.push(callback);
    }
  }

  /**
   * Remove alert callback
   * @param {Function} callback - Callback to remove
   */
  removeAlertCallback(callback) {
    const index = this.alertCallbacks.indexOf(callback);
    if (index > -1) {
      this.alertCallbacks.splice(index, 1);
    }
  }

  /**
   * Trigger performance alert
   * @private
   * @param {string} alertType - Type of alert
   * @param {Object} data - Alert data
   */
  triggerAlert(alertType, data) {
    const now = Date.now();
    const lastAlert = this.lastAlertTime.get(alertType) || 0;
    
    // Check cooldown period
    if (now - lastAlert < this.config.alertCooldown) {
      return;
    }
    
    this.lastAlertTime.set(alertType, now);
    
    const alert = {
      type: alertType,
      timestamp: now,
      data,
      severity: this.getAlertSeverity(alertType, data)
    };
    
    // Notify alert callbacks
    this.alertCallbacks.forEach(callback => {
      try {
        callback(alert);
      } catch (error) {
        console.error('Error in alert callback:', error);
      }
    });
    
    // Log alert - disabled for performance
    // console.warn(`Sequencer Performance Alert [${alertType}]:`, alert);
  }

  /**
   * Get alert severity level
   * @private
   * @param {string} alertType - Alert type
   * @param {Object} data - Alert data
   * @returns {string} Severity level
   */
  getAlertSeverity(alertType, data) {
    switch (alertType) {
      case 'timing_drift':
        return data.drift > this.config.timingAccuracyThreshold * 2 ? 'critical' : 'high';
      case 'high_audio_latency':
        return data.latency > this.config.audioLatencyThreshold * 2 ? 'high' : 'medium';
      case 'high_memory_usage':
        return data.totalUsage > this.config.memoryUsageThreshold * 1.5 ? 'critical' : 'high';
      case 'high_cpu_usage':
        return data.cpuUsage > 90 ? 'critical' : 'high';
      default:
        return 'medium';
    }
  }

  /**
   * Collect sequencer-specific metrics
   * @private
   */
  collectSequencerMetrics() {
    // This method will be called by the monitoring interval
    // It can collect additional metrics that aren't captured by individual operations
    
    // Collect system memory usage
    const systemMemory = this.baseMonitor.getCurrentMemoryUsage();
    if (!systemMemory.unavailable) {
      this.baseMonitor.recordMetric('sequencer_system_memory', systemMemory.usedJSHeapSize, {
        totalHeapSize: systemMemory.totalJSHeapSize,
        heapSizeLimit: systemMemory.jsHeapSizeLimit
      });
    }
  }

  /**
   * Check for performance alerts
   * @private
   */
  checkPerformanceAlerts() {
    // Check for sustained high memory usage
    if (this.memoryUsageHistory.length >= 5) {
      const recent = this.memoryUsageHistory.slice(-5);
      const avgUsage = recent.reduce((sum, m) => sum + m.totalUsage, 0) / recent.length;
      
      if (avgUsage > this.config.memoryUsageThreshold) {
        this.triggerAlert('sustained_high_memory', {
          averageUsage: avgUsage,
          threshold: this.config.memoryUsageThreshold,
          duration: '5 measurements'
        });
      }
    }
    
    // Check for timing instability
    if (this.timingAccuracyHistory.length >= 10) {
      const recent = this.timingAccuracyHistory.slice(-10);
      const variance = this.calculateVariance(recent.map(m => m.drift));
      
      if (variance > 10) { // High variance in timing
        this.triggerAlert('timing_instability', {
          variance,
          recentMeasurements: recent.length
        });
      }
    }
  }

  /**
   * Calculate variance of an array of numbers
   * @private
   * @param {number[]} values - Array of values
   * @returns {number} Variance
   */
  calculateVariance(values) {
    if (values.length === 0) return 0;
    
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
    return squaredDiffs.reduce((sum, diff) => sum + diff, 0) / values.length;
  }

  /**
   * Format bytes to human readable string
   * @private
   * @param {number} bytes - Bytes to format
   * @returns {string} Formatted string
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
    this.sequencerMetrics.clear();
    this.timingAccuracyHistory = [];
    this.audioLatencyHistory = [];
    this.memoryUsageHistory = [];
    this.alertCallbacks = [];
    this.lastAlertTime.clear();
    
    console.log('SequencerPerformanceMonitor cleaned up');
  }
}

// Create and export singleton instance
const sequencerPerformanceMonitor = new SequencerPerformanceMonitor();

export default sequencerPerformanceMonitor;
export { SequencerPerformanceMonitor };