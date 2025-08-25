/**
 * Performance monitoring and graceful degradation for resource-constrained environments
 * Implements adaptive quality settings and performance optimization
 * Requirements: 7.4, 7.5
 */

export class WaveformPerformanceMonitor {
  constructor(options = {}) {
    this.options = {
      targetFPS: options.targetFPS || 60,
      minFPS: options.minFPS || 30,
      performanceWindow: options.performanceWindow || 5000, // 5 seconds
      degradationThreshold: options.degradationThreshold || 0.7, // 70% of target
      recoveryThreshold: options.recoveryThreshold || 0.9, // 90% of target
      maxDegradationLevel: options.maxDegradationLevel || 3,
      ...options
    };
    
    // Performance tracking
    this.metrics = {
      fps: {
        current: 0,
        average: 0,
        min: Infinity,
        max: 0,
        samples: []
      },
      renderTime: {
        current: 0,
        average: 0,
        min: Infinity,
        max: 0,
        samples: []
      },
      memoryUsage: {
        current: 0,
        peak: 0,
        trend: 'stable' // 'increasing', 'decreasing', 'stable'
      },
      cpuUsage: {
        estimated: 0,
        trend: 'stable'
      }
    };
    
    // Performance state
    this.currentQualityLevel = 'high';
    this.degradationLevel = 0;
    this.isMonitoring = false;
    this.adaptiveSettings = this.getDefaultAdaptiveSettings();
    
    // Callbacks for quality changes
    this.qualityChangeCallbacks = new Set();
    this.performanceWarningCallbacks = new Set();
    
    // Monitoring intervals
    this.monitoringInterval = null;
    this.metricsCollectionInterval = null;
    
    // Frame timing
    this.lastFrameTime = 0;
    this.frameCount = 0;
    this.renderStartTime = 0;
    
    // Device capabilities detection
    this.deviceCapabilities = null;
    this.detectDeviceCapabilities();
  }

  /**
   * Start performance monitoring
   */
  startMonitoring() {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    this.lastFrameTime = performance.now();
    
    // Start metrics collection
    this.metricsCollectionInterval = setInterval(() => {
      this.collectMetrics();
    }, 1000); // Collect every second
    
    // Start performance analysis
    this.monitoringInterval = setInterval(() => {
      this.analyzePerformance();
    }, this.options.performanceWindow);
    
    console.log('Performance monitoring started');
  }

  /**
   * Stop performance monitoring
   */
  stopMonitoring() {
    if (!this.isMonitoring) return;
    
    this.isMonitoring = false;
    
    if (this.metricsCollectionInterval) {
      clearInterval(this.metricsCollectionInterval);
      this.metricsCollectionInterval = null;
    }
    
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    
    console.log('Performance monitoring stopped');
  }

  /**
   * Record frame render start
   */
  frameRenderStart() {
    this.renderStartTime = performance.now();
  }

  /**
   * Record frame render end and calculate metrics
   */
  frameRenderEnd() {
    const now = performance.now();
    const renderTime = now - this.renderStartTime;
    const frameTime = now - this.lastFrameTime;
    
    // Calculate FPS
    const fps = frameTime > 0 ? 1000 / frameTime : 0;
    
    // Update metrics
    this.updateFPSMetrics(fps);
    this.updateRenderTimeMetrics(renderTime);
    
    this.lastFrameTime = now;
    this.frameCount++;
    
    // Check for immediate performance issues
    if (fps < this.options.minFPS) {
      this.handleLowPerformance('fps', fps);
    }
    
    if (renderTime > 33) { // More than 2 frames at 60fps
      this.handleLowPerformance('renderTime', renderTime);
    }
  }

  /**
   * Update FPS metrics
   */
  updateFPSMetrics(fps) {
    this.metrics.fps.current = fps;
    this.metrics.fps.min = Math.min(this.metrics.fps.min, fps);
    this.metrics.fps.max = Math.max(this.metrics.fps.max, fps);
    
    // Keep sliding window of samples
    this.metrics.fps.samples.push(fps);
    if (this.metrics.fps.samples.length > 60) { // Keep last 60 samples
      this.metrics.fps.samples.shift();
    }
    
    // Calculate average
    this.metrics.fps.average = this.metrics.fps.samples.reduce((sum, sample) => sum + sample, 0) / this.metrics.fps.samples.length;
  }

  /**
   * Update render time metrics
   */
  updateRenderTimeMetrics(renderTime) {
    this.metrics.renderTime.current = renderTime;
    this.metrics.renderTime.min = Math.min(this.metrics.renderTime.min, renderTime);
    this.metrics.renderTime.max = Math.max(this.metrics.renderTime.max, renderTime);
    
    // Keep sliding window of samples
    this.metrics.renderTime.samples.push(renderTime);
    if (this.metrics.renderTime.samples.length > 60) {
      this.metrics.renderTime.samples.shift();
    }
    
    // Calculate average
    this.metrics.renderTime.average = this.metrics.renderTime.samples.reduce((sum, sample) => sum + sample, 0) / this.metrics.renderTime.samples.length;
  }

  /**
   * Collect system metrics
   */
  collectMetrics() {
    // Memory usage
    if (typeof performance !== 'undefined' && performance.memory) {
      const memoryUsage = performance.memory.usedJSHeapSize;
      this.metrics.memoryUsage.current = memoryUsage;
      this.metrics.memoryUsage.peak = Math.max(this.metrics.memoryUsage.peak, memoryUsage);
      
      // Detect memory trend
      this.updateMemoryTrend(memoryUsage);
    }
    
    // Estimate CPU usage based on frame timing
    this.estimateCPUUsage();
  }

  /**
   * Update memory usage trend
   */
  updateMemoryTrend(currentMemory) {
    if (!this.lastMemoryReading) {
      this.lastMemoryReading = currentMemory;
      return;
    }
    
    const change = currentMemory - this.lastMemoryReading;
    const changePercent = Math.abs(change) / this.lastMemoryReading;
    
    if (changePercent > 0.05) { // 5% change threshold
      this.metrics.memoryUsage.trend = change > 0 ? 'increasing' : 'decreasing';
    } else {
      this.metrics.memoryUsage.trend = 'stable';
    }
    
    this.lastMemoryReading = currentMemory;
  }

  /**
   * Estimate CPU usage based on render performance
   */
  estimateCPUUsage() {
    const targetRenderTime = 1000 / this.options.targetFPS;
    const actualRenderTime = this.metrics.renderTime.average;
    
    // Rough estimation: higher render time indicates higher CPU usage
    const estimatedUsage = Math.min(1, actualRenderTime / targetRenderTime);
    this.metrics.cpuUsage.estimated = estimatedUsage;
    
    // Detect CPU trend
    if (!this.lastCPUReading) {
      this.lastCPUReading = estimatedUsage;
      return;
    }
    
    const change = estimatedUsage - this.lastCPUReading;
    if (Math.abs(change) > 0.1) { // 10% change threshold
      this.metrics.cpuUsage.trend = change > 0 ? 'increasing' : 'decreasing';
    } else {
      this.metrics.cpuUsage.trend = 'stable';
    }
    
    this.lastCPUReading = estimatedUsage;
  }

  /**
   * Analyze performance and trigger adaptations
   */
  analyzePerformance() {
    const performanceScore = this.calculatePerformanceScore();
    const shouldDegrade = performanceScore < this.options.degradationThreshold;
    const shouldRecover = performanceScore > this.options.recoveryThreshold;
    
    if (shouldDegrade && this.degradationLevel < this.options.maxDegradationLevel) {
      this.degradeQuality();
    } else if (shouldRecover && this.degradationLevel > 0) {
      this.improveQuality();
    }
    
    // Check for critical performance issues
    this.checkCriticalPerformance();
  }

  /**
   * Calculate overall performance score (0-1)
   */
  calculatePerformanceScore() {
    const fpsScore = Math.min(1, this.metrics.fps.average / this.options.targetFPS);
    const renderTimeScore = Math.min(1, (1000 / this.options.targetFPS) / this.metrics.renderTime.average);
    const memoryScore = this.calculateMemoryScore();
    const cpuScore = 1 - this.metrics.cpuUsage.estimated;
    
    // Weighted average
    return (fpsScore * 0.4 + renderTimeScore * 0.3 + memoryScore * 0.2 + cpuScore * 0.1);
  }

  /**
   * Calculate memory performance score
   */
  calculateMemoryScore() {
    if (!this.deviceCapabilities || !this.deviceCapabilities.memoryLimit) {
      return 1; // Assume good if we can't measure
    }
    
    const memoryUsageRatio = this.metrics.memoryUsage.current / this.deviceCapabilities.memoryLimit;
    return Math.max(0, 1 - memoryUsageRatio);
  }

  /**
   * Degrade quality to improve performance
   */
  degradeQuality() {
    this.degradationLevel++;
    
    const newSettings = this.getAdaptiveSettings(this.degradationLevel);
    this.applyAdaptiveSettings(newSettings);
    
    const qualityLevel = this.getQualityLevelName(this.degradationLevel);
    console.log(`Performance degradation: level ${this.degradationLevel} (${qualityLevel})`);
    
    this.notifyQualityChange(qualityLevel, 'degraded', {
      reason: 'performance',
      score: this.calculatePerformanceScore(),
      level: this.degradationLevel
    });
  }

  /**
   * Improve quality when performance allows
   */
  improveQuality() {
    this.degradationLevel--;
    
    const newSettings = this.getAdaptiveSettings(this.degradationLevel);
    this.applyAdaptiveSettings(newSettings);
    
    const qualityLevel = this.getQualityLevelName(this.degradationLevel);
    console.log(`Performance recovery: level ${this.degradationLevel} (${qualityLevel})`);
    
    this.notifyQualityChange(qualityLevel, 'improved', {
      reason: 'performance-recovery',
      score: this.calculatePerformanceScore(),
      level: this.degradationLevel
    });
  }

  /**
   * Get adaptive settings for degradation level
   */
  getAdaptiveSettings(level) {
    const settings = this.getDefaultAdaptiveSettings();
    
    switch (level) {
      case 0: // High quality
        return settings;
        
      case 1: // Medium-high quality
        return {
          ...settings,
          renderQuality: 'medium',
          waveformResolution: 0.8,
          enableAntialiasing: true,
          maxBatchSize: 800
        };
        
      case 2: // Medium quality
        return {
          ...settings,
          renderQuality: 'medium',
          waveformResolution: 0.6,
          enableAntialiasing: false,
          maxBatchSize: 600,
          enableViewportCulling: true,
          chopRenderingDetail: 'medium'
        };
        
      case 3: // Low quality
        return {
          ...settings,
          renderQuality: 'low',
          waveformResolution: 0.4,
          enableAntialiasing: false,
          maxBatchSize: 400,
          enableViewportCulling: true,
          chopRenderingDetail: 'low',
          disableAnimations: true,
          simplifiedRendering: true
        };
        
      default:
        return settings;
    }
  }

  /**
   * Get default adaptive settings
   */
  getDefaultAdaptiveSettings() {
    return {
      renderQuality: 'high',
      waveformResolution: 1.0,
      enableAntialiasing: true,
      maxBatchSize: 1000,
      enableViewportCulling: true,
      chopRenderingDetail: 'high',
      disableAnimations: false,
      simplifiedRendering: false,
      targetFPS: this.options.targetFPS
    };
  }

  /**
   * Apply adaptive settings
   */
  applyAdaptiveSettings(settings) {
    this.adaptiveSettings = { ...settings };
    this.currentQualityLevel = this.getQualityLevelName(this.degradationLevel);
  }

  /**
   * Get quality level name
   */
  getQualityLevelName(level) {
    const levels = ['high', 'medium-high', 'medium', 'low'];
    return levels[Math.min(level, levels.length - 1)];
  }

  /**
   * Handle immediate low performance
   */
  handleLowPerformance(metric, value) {
    this.notifyPerformanceWarning({
      metric,
      value,
      threshold: metric === 'fps' ? this.options.minFPS : 33,
      timestamp: Date.now(),
      currentQuality: this.currentQualityLevel,
      degradationLevel: this.degradationLevel
    });
  }

  /**
   * Check for critical performance issues
   */
  checkCriticalPerformance() {
    const criticalIssues = [];
    
    // Critical FPS drop
    if (this.metrics.fps.average < this.options.minFPS * 0.5) {
      criticalIssues.push({
        type: 'critical-fps',
        value: this.metrics.fps.average,
        threshold: this.options.minFPS * 0.5
      });
    }
    
    // Critical memory usage
    if (this.deviceCapabilities && this.deviceCapabilities.memoryLimit) {
      const memoryUsageRatio = this.metrics.memoryUsage.current / this.deviceCapabilities.memoryLimit;
      if (memoryUsageRatio > 0.9) {
        criticalIssues.push({
          type: 'critical-memory',
          value: memoryUsageRatio,
          threshold: 0.9
        });
      }
    }
    
    // Critical render time
    if (this.metrics.renderTime.average > 100) { // More than 6 frames at 60fps
      criticalIssues.push({
        type: 'critical-render-time',
        value: this.metrics.renderTime.average,
        threshold: 100
      });
    }
    
    if (criticalIssues.length > 0) {
      this.handleCriticalPerformance(criticalIssues);
    }
  }

  /**
   * Handle critical performance issues
   */
  handleCriticalPerformance(issues) {
    console.error('Critical performance issues detected:', issues);
    
    // Force maximum degradation
    this.degradationLevel = this.options.maxDegradationLevel;
    const emergencySettings = this.getEmergencySettings();
    this.applyAdaptiveSettings(emergencySettings);
    
    this.notifyPerformanceWarning({
      type: 'critical',
      issues,
      emergencyMode: true,
      timestamp: Date.now()
    });
  }

  /**
   * Get emergency performance settings
   */
  getEmergencySettings() {
    return {
      renderQuality: 'low',
      waveformResolution: 0.2,
      enableAntialiasing: false,
      maxBatchSize: 200,
      enableViewportCulling: true,
      chopRenderingDetail: 'minimal',
      disableAnimations: true,
      simplifiedRendering: true,
      emergencyMode: true,
      targetFPS: Math.max(15, this.options.minFPS * 0.5)
    };
  }

  /**
   * Detect device capabilities
   */
  detectDeviceCapabilities() {
    this.deviceCapabilities = {
      // Memory
      memoryLimit: this.detectMemoryLimit(),
      
      // CPU estimation
      cpuCores: navigator.hardwareConcurrency || 4,
      
      // GPU capabilities
      webglSupport: this.detectWebGLSupport(),
      
      // Browser capabilities
      performanceAPISupport: typeof performance !== 'undefined' && !!performance.memory,
      
      // Device type estimation
      deviceType: this.detectDeviceType(),
      
      // Connection quality
      connectionType: this.detectConnectionType()
    };
    
    console.log('Device capabilities detected:', this.deviceCapabilities);
  }

  /**
   * Detect memory limit
   */
  detectMemoryLimit() {
    if (typeof performance !== 'undefined' && performance.memory) {
      return performance.memory.jsHeapSizeLimit;
    }
    
    // Fallback estimation based on device type
    const deviceType = this.detectDeviceType();
    switch (deviceType) {
      case 'mobile': return 100 * 1024 * 1024; // 100MB
      case 'tablet': return 200 * 1024 * 1024; // 200MB
      case 'desktop': return 500 * 1024 * 1024; // 500MB
      default: return 200 * 1024 * 1024; // 200MB default
    }
  }

  /**
   * Detect WebGL support
   */
  detectWebGLSupport() {
    try {
      // Check if we're in a test environment
      if (typeof document === 'undefined' || typeof HTMLCanvasElement === 'undefined') {
        return false;
      }
      
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      return !!gl;
    } catch (error) {
      return false;
    }
  }

  /**
   * Detect device type
   */
  detectDeviceType() {
    const userAgent = navigator.userAgent.toLowerCase();
    
    if (/mobile|android|iphone|ipod|blackberry|iemobile|opera mini/i.test(userAgent)) {
      return 'mobile';
    } else if (/tablet|ipad/i.test(userAgent)) {
      return 'tablet';
    } else {
      return 'desktop';
    }
  }

  /**
   * Detect connection type
   */
  detectConnectionType() {
    if (navigator.connection) {
      return {
        effectiveType: navigator.connection.effectiveType,
        downlink: navigator.connection.downlink,
        rtt: navigator.connection.rtt
      };
    }
    return null;
  }

  /**
   * Add quality change callback
   */
  onQualityChange(callback) {
    this.qualityChangeCallbacks.add(callback);
    return () => this.qualityChangeCallbacks.delete(callback);
  }

  /**
   * Add performance warning callback
   */
  onPerformanceWarning(callback) {
    this.performanceWarningCallbacks.add(callback);
    return () => this.performanceWarningCallbacks.delete(callback);
  }

  /**
   * Notify quality change
   */
  notifyQualityChange(newQuality, changeType, details) {
    const event = {
      newQuality,
      changeType,
      details,
      settings: this.adaptiveSettings,
      timestamp: Date.now()
    };
    
    this.qualityChangeCallbacks.forEach(callback => {
      try {
        callback(event);
      } catch (error) {
        console.error('Quality change callback error:', error);
      }
    });
  }

  /**
   * Notify performance warning
   */
  notifyPerformanceWarning(warning) {
    this.performanceWarningCallbacks.forEach(callback => {
      try {
        callback(warning);
      } catch (error) {
        console.error('Performance warning callback error:', error);
      }
    });
  }

  /**
   * Get current performance metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      performanceScore: this.calculatePerformanceScore(),
      qualityLevel: this.currentQualityLevel,
      degradationLevel: this.degradationLevel,
      adaptiveSettings: this.adaptiveSettings,
      deviceCapabilities: this.deviceCapabilities
    };
  }

  /**
   * Get current adaptive settings
   */
  getAdaptiveSettings() {
    return { ...this.adaptiveSettings };
  }

  /**
   * Force quality level
   */
  forceQualityLevel(level) {
    const levelMap = { 'high': 0, 'medium-high': 1, 'medium': 2, 'low': 3 };
    const degradationLevel = levelMap[level] || 0;
    
    this.degradationLevel = degradationLevel;
    const settings = this.getAdaptiveSettings(degradationLevel);
    this.applyAdaptiveSettings(settings);
    
    this.notifyQualityChange(level, 'forced', {
      reason: 'user-override',
      level: degradationLevel
    });
  }

  /**
   * Reset to default quality
   */
  resetQuality() {
    this.degradationLevel = 0;
    const settings = this.getDefaultAdaptiveSettings();
    this.applyAdaptiveSettings(settings);
    
    this.notifyQualityChange('high', 'reset', {
      reason: 'user-reset'
    });
  }

  /**
   * Destroy performance monitor
   */
  destroy() {
    this.stopMonitoring();
    this.qualityChangeCallbacks.clear();
    this.performanceWarningCallbacks.clear();
  }
}

export default WaveformPerformanceMonitor;