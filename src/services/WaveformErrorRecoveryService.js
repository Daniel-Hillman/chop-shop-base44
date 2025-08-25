/**
 * Service for handling waveform visualization errors and recovery
 * Provides automatic retry mechanisms and fallback strategies
 */
export class WaveformErrorRecoveryService {
  constructor() {
    this.errorHistory = [];
    this.recoveryStrategies = new Map();
    this.maxErrorHistory = 50;
    
    this.initializeRecoveryStrategies();
  }

  /**
   * Initialize recovery strategies for different error types
   */
  initializeRecoveryStrategies() {
    // Canvas context errors
    this.recoveryStrategies.set('canvas', {
      maxRetries: 2,
      retryDelay: 1000,
      strategy: this.recoverCanvasContext.bind(this)
    });

    // Audio context errors
    this.recoveryStrategies.set('audio', {
      maxRetries: 3,
      retryDelay: 500,
      strategy: this.recoverAudioContext.bind(this)
    });

    // Memory errors
    this.recoveryStrategies.set('memory', {
      maxRetries: 1,
      retryDelay: 2000,
      strategy: this.recoverMemoryIssues.bind(this)
    });

    // Network errors
    this.recoveryStrategies.set('network', {
      maxRetries: 3,
      retryDelay: 2000,
      strategy: this.recoverNetworkIssues.bind(this)
    });

    // Generic fallback
    this.recoveryStrategies.set('generic', {
      maxRetries: 1,
      retryDelay: 1000,
      strategy: this.genericRecovery.bind(this)
    });
  }

  /**
   * Report an error to the recovery service
   */
  reportError(errorData) {
    const errorRecord = {
      ...errorData,
      id: this.generateErrorId(),
      reportedAt: Date.now(),
      errorType: this.classifyError(errorData.error)
    };

    this.errorHistory.push(errorRecord);
    
    // Keep error history manageable
    if (this.errorHistory.length > this.maxErrorHistory) {
      this.errorHistory.shift();
    }

    // Log for debugging
    console.warn('WaveformErrorRecoveryService: Error reported', errorRecord);

    return errorRecord;
  }

  /**
   * Attempt to recover from an error
   */
  async attemptRecovery(error) {
    const errorType = this.classifyError(error);
    const strategy = this.recoveryStrategies.get(errorType) || 
                    this.recoveryStrategies.get('generic');

    console.log(`Attempting recovery for ${errorType} error:`, error.message);

    try {
      await strategy.strategy(error);
      console.log(`Recovery successful for ${errorType} error`);
      return true;
    } catch (recoveryError) {
      console.error(`Recovery failed for ${errorType} error:`, recoveryError);
      throw recoveryError;
    }
  }

  /**
   * Classify error type for appropriate recovery strategy
   */
  classifyError(error) {
    if (!error) return 'generic';

    const message = error.message?.toLowerCase() || '';
    const name = error.name?.toLowerCase() || '';

    if (message.includes('canvas') || name.includes('canvas')) {
      return 'canvas';
    }
    
    if (message.includes('audio') || message.includes('webaudio') || name.includes('audio')) {
      return 'audio';
    }
    
    if (message.includes('memory') || message.includes('allocation') || name.includes('memory')) {
      return 'memory';
    }
    
    if (message.includes('network') || message.includes('fetch') || message.includes('cors')) {
      return 'network';
    }

    return 'generic';
  }

  /**
   * Recovery strategy for canvas context errors
   */
  async recoverCanvasContext(error) {
    // Clear any existing canvas contexts
    if (window.waveformCanvasContexts) {
      window.waveformCanvasContexts.forEach(ctx => {
        if (ctx && typeof ctx.clearRect === 'function') {
          try {
            ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
          } catch (e) {
            // Ignore cleanup errors
          }
        }
      });
      window.waveformCanvasContexts = [];
    }

    // Force garbage collection if available
    if (window.gc) {
      window.gc();
    }

    // Wait for browser to stabilize
    await this.delay(500);

    // Try to recreate canvas context with different settings
    const testCanvas = document.createElement('canvas');
    testCanvas.width = 100;
    testCanvas.height = 50;
    
    const ctx = testCanvas.getContext('2d', {
      alpha: false,
      desynchronized: true
    });

    if (!ctx) {
      throw new Error('Cannot create canvas context after recovery attempt');
    }

    // Test basic drawing
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, 10, 10);
  }

  /**
   * Recovery strategy for audio context errors
   */
  async recoverAudioContext(error) {
    // Close existing audio contexts
    if (window.waveformAudioContexts) {
      for (const ctx of window.waveformAudioContexts) {
        if (ctx && ctx.state !== 'closed') {
          try {
            await ctx.close();
          } catch (e) {
            // Ignore cleanup errors
          }
        }
      }
      window.waveformAudioContexts = [];
    }

    await this.delay(1000);

    // Test audio context creation
    try {
      const testContext = new (window.AudioContext || window.webkitAudioContext)();
      if (testContext.state === 'suspended') {
        await testContext.resume();
      }
      await testContext.close();
    } catch (testError) {
      throw new Error('Cannot create audio context after recovery attempt');
    }
  }

  /**
   * Recovery strategy for memory issues
   */
  async recoverMemoryIssues(error) {
    // Clear waveform caches
    if (window.waveformCache) {
      window.waveformCache.clear();
    }

    // Clear any large arrays or buffers
    if (window.waveformBuffers) {
      window.waveformBuffers.forEach(buffer => {
        if (buffer && buffer.length) {
          buffer.fill(0);
        }
      });
      window.waveformBuffers = [];
    }

    // Force garbage collection
    if (window.gc) {
      window.gc();
    }

    // Wait for memory cleanup
    await this.delay(2000);

    // Check available memory (if supported)
    if (navigator.deviceMemory && navigator.deviceMemory < 2) {
      throw new Error('Insufficient device memory for waveform visualization');
    }
  }

  /**
   * Recovery strategy for network issues
   */
  async recoverNetworkIssues(error) {
    // Check network connectivity
    if (!navigator.onLine) {
      throw new Error('No network connection available');
    }

    // Wait for network to stabilize
    await this.delay(1000);

    // Test basic connectivity
    try {
      const response = await fetch('/favicon.ico', { 
        method: 'HEAD',
        cache: 'no-cache'
      });
      
      if (!response.ok) {
        throw new Error('Network connectivity test failed');
      }
    } catch (testError) {
      throw new Error('Network recovery failed: ' + testError.message);
    }
  }

  /**
   * Generic recovery strategy
   */
  async genericRecovery(error) {
    // Clear any global waveform state
    if (window.waveformState) {
      window.waveformState = null;
    }

    // Wait for system to stabilize
    await this.delay(1000);

    // Basic system checks
    if (!document.createElement('canvas').getContext) {
      throw new Error('Canvas support not available');
    }

    if (!window.AudioContext && !window.webkitAudioContext) {
      console.warn('Web Audio API not available, will use fallback methods');
    }
  }

  /**
   * Get error statistics for monitoring
   */
  getErrorStatistics() {
    const now = Date.now();
    const recentErrors = this.errorHistory.filter(
      error => now - error.reportedAt < 300000 // Last 5 minutes
    );

    const errorsByType = {};
    recentErrors.forEach(error => {
      errorsByType[error.errorType] = (errorsByType[error.errorType] || 0) + 1;
    });

    return {
      totalErrors: this.errorHistory.length,
      recentErrors: recentErrors.length,
      errorsByType,
      lastError: this.errorHistory[this.errorHistory.length - 1] || null
    };
  }

  /**
   * Check if system is in a healthy state for waveform operations
   */
  isSystemHealthy() {
    const stats = this.getErrorStatistics();
    
    // Too many recent errors indicates system instability
    if (stats.recentErrors > 5) {
      return false;
    }

    // Check for critical error patterns
    const criticalErrors = ['canvas', 'memory'];
    const hasCriticalErrors = criticalErrors.some(
      type => (stats.errorsByType[type] || 0) > 2
    );

    return !hasCriticalErrors;
  }

  /**
   * Generate unique error ID
   */
  generateErrorId() {
    return `waveform_error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Utility method for delays
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Clear error history (for testing or reset)
   */
  clearErrorHistory() {
    this.errorHistory = [];
  }
}

export default WaveformErrorRecoveryService;