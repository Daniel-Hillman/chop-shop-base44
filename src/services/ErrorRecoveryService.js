/**
 * ErrorRecoveryService - Centralized error recovery and retry logic
 * 
 * Provides automatic retry mechanisms for transient errors and
 * intelligent error classification for better user experience.
 */

class ErrorRecoveryService {
  constructor() {
    this.retryAttempts = new Map();
    this.errorHistory = [];
    this.config = {
      maxRetries: 3,
      baseRetryDelay: 1000, // 1 second
      maxRetryDelay: 10000, // 10 seconds
      transientErrorPatterns: [
        /network/i,
        /timeout/i,
        /fetch/i,
        /connection/i,
        /temporary/i,
        /rate.?limit/i,
        /service.?unavailable/i,
        /internal.?server/i,
        /502|503|504/
      ],
      permanentErrorPatterns: [
        /not.?found/i,
        /unauthorized/i,
        /forbidden/i,
        /invalid.?url/i,
        /malformed/i,
        /unsupported/i,
        /private/i,
        /deleted/i,
        /restricted/i
      ]
    };

    // Bind methods
    this.shouldRetry = this.shouldRetry.bind(this);
    this.executeWithRetry = this.executeWithRetry.bind(this);
    this.classifyError = this.classifyError.bind(this);
  }

  /**
   * Classify error type for appropriate handling
   * @param {Error} error - The error to classify
   * @returns {Object} Error classification
   */
  classifyError(error) {
    const message = error?.message || '';
    const stack = error?.stack || '';
    const fullText = `${message} ${stack}`.toLowerCase();

    // Check for permanent errors first
    const isPermanent = this.config.permanentErrorPatterns.some(pattern => 
      pattern.test(fullText)
    );

    if (isPermanent) {
      return {
        type: 'permanent',
        category: this.getErrorCategory(fullText),
        retryable: false,
        userActionRequired: true,
        severity: 'error'
      };
    }

    // Check for transient errors
    const isTransient = this.config.transientErrorPatterns.some(pattern => 
      pattern.test(fullText)
    );

    if (isTransient) {
      return {
        type: 'transient',
        category: this.getErrorCategory(fullText),
        retryable: true,
        userActionRequired: false,
        severity: 'warning'
      };
    }

    // Unknown errors are treated as potentially transient
    return {
      type: 'unknown',
      category: 'system',
      retryable: true,
      userActionRequired: false,
      severity: 'error'
    };
  }

  /**
   * Get specific error category for targeted messaging
   * @private
   */
  getErrorCategory(errorText) {
    if (/network|connection|fetch|cors/i.test(errorText)) {
      return 'network';
    }
    if (/audio|decode|buffer|context/i.test(errorText)) {
      return 'audio';
    }
    if (/video|youtube|player|embed/i.test(errorText)) {
      return 'video';
    }
    if (/timeout|slow|delay/i.test(errorText)) {
      return 'timeout';
    }
    if (/quota|limit|rate/i.test(errorText)) {
      return 'quota';
    }
    if (/storage|cache|memory/i.test(errorText)) {
      return 'storage';
    }
    if (/permission|unauthorized|forbidden/i.test(errorText)) {
      return 'permission';
    }
    
    return 'system';
  }

  /**
   * Determine if an error should be retried
   * @param {Error} error - The error to check
   * @param {string} operationId - Unique identifier for the operation
   * @returns {boolean} Whether the error should be retried
   */
  shouldRetry(error, operationId) {
    const classification = this.classifyError(error);
    
    if (!classification.retryable) {
      return false;
    }

    const attempts = this.retryAttempts.get(operationId) || 0;
    return attempts < this.config.maxRetries;
  }

  /**
   * Calculate retry delay with exponential backoff and jitter
   * @param {number} attempt - Current attempt number (0-based)
   * @returns {number} Delay in milliseconds
   */
  calculateRetryDelay(attempt) {
    const exponentialDelay = Math.min(
      this.config.baseRetryDelay * Math.pow(2, attempt),
      this.config.maxRetryDelay
    );
    
    // Add jitter to prevent thundering herd
    const jitter = Math.random() * 0.3 * exponentialDelay;
    return Math.floor(exponentialDelay + jitter);
  }

  /**
   * Execute an operation with automatic retry logic
   * @param {Function} operation - The operation to execute
   * @param {string} operationId - Unique identifier for the operation
   * @param {Object} options - Retry options
   * @returns {Promise} The operation result
   */
  async executeWithRetry(operation, operationId, options = {}) {
    const {
      onProgress = null,
      onRetry = null,
      maxRetries = this.config.maxRetries,
      context = {}
    } = options;

    let lastError = null;
    const startTime = Date.now();

    // Reset retry count for this operation
    this.retryAttempts.set(operationId, 0);

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        if (onProgress) {
          onProgress({
            status: attempt === 0 ? 'starting' : 'retrying',
            attempt: attempt + 1,
            maxAttempts: maxRetries + 1,
            operationId,
            context
          });
        }

        const result = await operation();
        
        // Success - clean up and return
        this.retryAttempts.delete(operationId);
        this.recordSuccess(operationId, attempt, Date.now() - startTime);
        
        return result;

      } catch (error) {
        lastError = error;
        const classification = this.classifyError(error);
        
        this.recordError(operationId, error, attempt, classification);
        
        // Don't retry if it's the last attempt or error is not retryable
        if (attempt >= maxRetries || !classification.retryable) {
          break;
        }

        const delay = this.calculateRetryDelay(attempt);
        this.retryAttempts.set(operationId, attempt + 1);

        if (onRetry) {
          onRetry({
            error,
            attempt: attempt + 1,
            maxAttempts: maxRetries + 1,
            delay,
            classification,
            operationId
          });
        }

        if (onProgress) {
          onProgress({
            status: 'waiting_retry',
            attempt: attempt + 1,
            maxAttempts: maxRetries + 1,
            delay,
            error: error.message,
            operationId,
            context
          });
        }

        await this.sleep(delay);
      }
    }

    // All retries failed
    this.retryAttempts.delete(operationId);
    
    const finalClassification = this.classifyError(lastError);
    const enhancedError = new Error(lastError.message);
    enhancedError.originalError = lastError;
    enhancedError.classification = finalClassification;
    enhancedError.attempts = maxRetries + 1;
    enhancedError.operationId = operationId;
    
    throw enhancedError;
  }

  /**
   * Record error for analytics and debugging
   * @private
   */
  recordError(operationId, error, attempt, classification) {
    const errorRecord = {
      timestamp: Date.now(),
      operationId,
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name
      },
      attempt,
      classification
    };

    this.errorHistory.push(errorRecord);
    
    // Keep only last 100 errors to prevent memory leaks
    if (this.errorHistory.length > 100) {
      this.errorHistory.shift();
    }

    console.warn(`Error in operation ${operationId} (attempt ${attempt + 1}):`, {
      error: error.message,
      classification,
      stack: error.stack
    });
  }

  /**
   * Record successful operation for analytics
   * @private
   */
  recordSuccess(operationId, attempts, duration) {
    console.log(`Operation ${operationId} succeeded after ${attempts + 1} attempts in ${duration}ms`);
  }

  /**
   * Get error statistics for monitoring
   * @returns {Object} Error statistics
   */
  getErrorStats() {
    const now = Date.now();
    const recentErrors = this.errorHistory.filter(e => now - e.timestamp < 300000); // Last 5 minutes
    
    const errorsByCategory = {};
    const errorsByType = {};
    
    recentErrors.forEach(error => {
      const category = error.classification.category;
      const type = error.classification.type;
      
      errorsByCategory[category] = (errorsByCategory[category] || 0) + 1;
      errorsByType[type] = (errorsByType[type] || 0) + 1;
    });

    return {
      totalErrors: this.errorHistory.length,
      recentErrors: recentErrors.length,
      activeRetries: this.retryAttempts.size,
      errorsByCategory,
      errorsByType,
      lastError: this.errorHistory[this.errorHistory.length - 1] || null
    };
  }

  /**
   * Get user-friendly error message and suggestions
   * @param {Error} error - The error to get message for
   * @returns {Object} User-friendly error information
   */
  getUserFriendlyError(error) {
    const classification = error.classification || this.classifyError(error);
    
    const messages = {
      network: {
        title: 'Connection Problem',
        message: 'Unable to connect to the service. Please check your internet connection.',
        suggestions: [
          'Check your internet connection',
          'Try refreshing the page',
          'Wait a moment and try again'
        ]
      },
      audio: {
        title: 'Audio Processing Error',
        message: 'Unable to process the audio from this video.',
        suggestions: [
          'Try a different YouTube video',
          'Check if the video has audio',
          'Ensure your browser supports audio playback'
        ]
      },
      video: {
        title: 'Video Player Error',
        message: 'Unable to load or play the video.',
        suggestions: [
          'Check if the YouTube URL is valid',
          'Ensure the video is public',
          'Try refreshing the page'
        ]
      },
      timeout: {
        title: 'Request Timeout',
        message: 'The operation is taking too long to complete.',
        suggestions: [
          'Check your internet speed',
          'Try a shorter video',
          'Wait and try again later'
        ]
      },
      quota: {
        title: 'Service Limit Reached',
        message: 'The service has reached its usage limit.',
        suggestions: [
          'Wait a few minutes and try again',
          'Try during off-peak hours',
          'Contact support if this persists'
        ]
      },
      storage: {
        title: 'Storage Error',
        message: 'Unable to store or retrieve data locally.',
        suggestions: [
          'Clear your browser cache',
          'Free up storage space',
          'Try using a private/incognito window'
        ]
      },
      permission: {
        title: 'Permission Error',
        message: 'Access to the requested resource is denied.',
        suggestions: [
          'Check if the video is public',
          'Try a different video',
          'Contact the video owner if needed'
        ]
      },
      system: {
        title: 'System Error',
        message: 'An unexpected error occurred.',
        suggestions: [
          'Try refreshing the page',
          'Clear your browser cache',
          'Try a different browser if the issue persists'
        ]
      }
    };

    const errorInfo = messages[classification.category] || messages.system;
    
    return {
      ...errorInfo,
      classification,
      canRetry: classification.retryable && !error.attempts,
      technical: process.env.NODE_ENV === 'development' ? error.message : null
    };
  }

  /**
   * Sleep utility for retry delays
   * @private
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Clear error history and retry attempts
   */
  reset() {
    this.errorHistory.length = 0;
    this.retryAttempts.clear();
    console.log('ErrorRecoveryService reset');
  }

  /**
   * Clean up resources
   */
  cleanup() {
    this.reset();
  }
}

// Create and export singleton instance
const errorRecoveryService = new ErrorRecoveryService();

export default errorRecoveryService;