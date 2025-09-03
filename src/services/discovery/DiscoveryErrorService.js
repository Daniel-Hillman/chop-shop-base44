/**
 * Discovery Error Service
 * Handles error recovery, logging, and reporting for the Sample Discovery feature
 * 
 * Requirements: 7.1, 7.2, 7.5
 */
class DiscoveryErrorService {
  constructor() {
    this.maxRetries = 3;
    this.baseDelay = 1000; // 1 second
    this.errorLogs = [];
    this.retryAttempts = new Map();
  }

  /**
   * Execute an operation with retry logic and exponential backoff
   * @param {Function} operation - The operation to execute
   * @param {Object} options - Retry options
   * @returns {Promise} - Result of the operation or fallback
   */
  async withRetry(operation, options = {}) {
    const {
      maxRetries = this.maxRetries,
      baseDelay = this.baseDelay,
      fallback = null,
      context = 'unknown'
    } = options;

    const operationId = `${context}-${Date.now()}`;
    let lastError = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const result = await operation();
        
        // Clear retry attempts on success
        this.retryAttempts.delete(operationId);
        
        // Log successful recovery if this was a retry
        if (attempt > 0) {
          this.logRecovery(context, attempt, lastError);
        }
        
        return result;
      } catch (error) {
        lastError = error;
        
        // Log the error attempt
        this.logRetryAttempt(context, attempt, error, maxRetries);
        
        // If this is the last attempt, break out of the loop
        if (attempt === maxRetries) {
          break;
        }
        
        // Calculate delay with exponential backoff and jitter
        const delay = this.calculateDelay(baseDelay, attempt);
        await this.sleep(delay);
      }
    }

    // All retries failed, log final failure and return fallback
    this.logFinalFailure(context, maxRetries, lastError);
    
    if (fallback !== null) {
      if (typeof fallback === 'function') {
        try {
          return await fallback(lastError);
        } catch (fallbackError) {
          this.logError('fallback-execution', fallbackError, { originalError: lastError });
          throw fallbackError;
        }
      }
      return fallback;
    }
    
    throw lastError;
  }

  /**
   * Handle YouTube API specific errors
   * @param {Error} error - The YouTube API error
   * @returns {Object} - Error details and recovery suggestions
   */
  handleYouTubeAPIError(error) {
    const message = error?.message?.toLowerCase() || '';
    const status = error?.status || error?.code;

    if (status === 403 || message.includes('quota') || message.includes('limit')) {
      return {
        type: 'quota_exceeded',
        severity: 'warning',
        canRetry: false,
        fallbackToMock: true,
        userMessage: 'YouTube API quota exceeded. Showing demo samples instead.',
        retryAfter: 3600000 // 1 hour
      };
    }

    if (status === 404 || message.includes('not found') || message.includes('unavailable')) {
      return {
        type: 'video_unavailable',
        severity: 'warning',
        canRetry: false,
        fallbackToMock: false,
        userMessage: 'This video is not available. Try a different sample.',
        retryAfter: null
      };
    }

    if (status === 429 || message.includes('rate limit')) {
      return {
        type: 'rate_limited',
        severity: 'warning',
        canRetry: true,
        fallbackToMock: true,
        userMessage: 'Too many requests. Please wait a moment.',
        retryAfter: 60000 // 1 minute
      };
    }

    if (message.includes('network') || message.includes('timeout')) {
      return {
        type: 'network_error',
        severity: 'warning',
        canRetry: true,
        fallbackToMock: true,
        userMessage: 'Network connection issue. Retrying...',
        retryAfter: 5000 // 5 seconds
      };
    }

    return {
      type: 'unknown_api_error',
      severity: 'error',
      canRetry: true,
      fallbackToMock: true,
      userMessage: 'YouTube service temporarily unavailable.',
      retryAfter: 30000 // 30 seconds
    };
  }

  /**
   * Handle network connectivity errors
   * @param {Error} error - The network error
   * @returns {Object} - Error details and recovery suggestions
   */
  handleNetworkError(error) {
    const isOnline = navigator.onLine;
    const message = error?.message?.toLowerCase() || '';

    if (!isOnline) {
      return {
        type: 'offline',
        severity: 'warning',
        canRetry: false,
        fallbackToMock: true,
        userMessage: 'You are offline. Showing cached samples.',
        retryAfter: null
      };
    }

    if (message.includes('cors') || message.includes('cross-origin')) {
      return {
        type: 'cors_error',
        severity: 'error',
        canRetry: false,
        fallbackToMock: true,
        userMessage: 'Service configuration issue. Using demo samples.',
        retryAfter: null
      };
    }

    if (message.includes('timeout')) {
      return {
        type: 'timeout',
        severity: 'warning',
        canRetry: true,
        fallbackToMock: true,
        userMessage: 'Request timed out. Retrying with demo samples.',
        retryAfter: 10000 // 10 seconds
      };
    }

    return {
      type: 'network_error',
      severity: 'warning',
      canRetry: true,
      fallbackToMock: true,
      userMessage: 'Connection issue. Retrying...',
      retryAfter: 5000 // 5 seconds
    };
  }

  /**
   * Log an error with context
   * @param {string} context - Error context
   * @param {Error} error - The error object
   * @param {Object} metadata - Additional metadata
   */
  logError(context, error, metadata = {}) {
    const errorLog = {
      id: `error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      context,
      error: {
        message: error?.message,
        stack: error?.stack,
        name: error?.name
      },
      metadata: {
        ...metadata,
        userAgent: navigator.userAgent,
        url: window.location.href,
        isOnline: navigator.onLine,
        timestamp: Date.now()
      }
    };

    this.errorLogs.push(errorLog);
    
    // Keep only last 50 errors in memory
    if (this.errorLogs.length > 50) {
      this.errorLogs = this.errorLogs.slice(-50);
    }

    // Store in localStorage for persistence
    try {
      const storedLogs = JSON.parse(localStorage.getItem('discoveryErrorLogs') || '[]');
      storedLogs.push(errorLog);
      
      // Keep only last 20 errors in storage
      const recentLogs = storedLogs.slice(-20);
      localStorage.setItem('discoveryErrorLogs', JSON.stringify(recentLogs));
    } catch (storageError) {
      console.warn('Failed to store error log:', storageError);
    }

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.group(`🔍 Discovery Error: ${context}`);
      console.error('Error:', error);
      console.log('Metadata:', metadata);
      console.log('Error ID:', errorLog.id);
      console.groupEnd();
    }

    // Report to external monitoring if available
    this.reportToMonitoring(errorLog);
  }

  /**
   * Log a retry attempt
   * @param {string} context - Operation context
   * @param {number} attempt - Attempt number
   * @param {Error} error - The error that caused the retry
   * @param {number} maxRetries - Maximum retry attempts
   */
  logRetryAttempt(context, attempt, error, maxRetries) {
    const retryLog = {
      context,
      attempt: attempt + 1,
      maxRetries: maxRetries + 1,
      error: error?.message,
      timestamp: new Date().toISOString()
    };

    if (process.env.NODE_ENV === 'development') {
      console.warn(`🔄 Discovery Retry ${attempt + 1}/${maxRetries + 1} for ${context}:`, error?.message);
    }

    // Track retry attempts
    const key = `${context}-retries`;
    const attempts = this.retryAttempts.get(key) || [];
    attempts.push(retryLog);
    this.retryAttempts.set(key, attempts);
  }

  /**
   * Log successful recovery after retries
   * @param {string} context - Operation context
   * @param {number} attempts - Number of attempts it took
   * @param {Error} lastError - The last error before success
   */
  logRecovery(context, attempts, lastError) {
    const recoveryLog = {
      context,
      attempts,
      lastError: lastError?.message,
      timestamp: new Date().toISOString()
    };

    if (process.env.NODE_ENV === 'development') {
      console.log(`✅ Discovery Recovery: ${context} succeeded after ${attempts} attempts`);
    }

    this.logError('recovery-success', null, recoveryLog);
  }

  /**
   * Log final failure after all retries
   * @param {string} context - Operation context
   * @param {number} maxRetries - Maximum retries attempted
   * @param {Error} finalError - The final error
   */
  logFinalFailure(context, maxRetries, finalError) {
    const failureLog = {
      context,
      maxRetries,
      finalError: finalError?.message,
      timestamp: new Date().toISOString()
    };

    if (process.env.NODE_ENV === 'development') {
      console.error(`❌ Discovery Final Failure: ${context} failed after ${maxRetries + 1} attempts`);
    }

    this.logError('final-failure', finalError, failureLog);
  }

  /**
   * Calculate delay for exponential backoff with jitter
   * @param {number} baseDelay - Base delay in milliseconds
   * @param {number} attempt - Current attempt number
   * @returns {number} - Delay in milliseconds
   */
  calculateDelay(baseDelay, attempt) {
    // Exponential backoff: baseDelay * 2^attempt
    const exponentialDelay = baseDelay * Math.pow(2, attempt);
    
    // Add jitter (random factor between 0.5 and 1.5)
    const jitter = 0.5 + Math.random();
    
    // Cap at 30 seconds
    return Math.min(exponentialDelay * jitter, 30000);
  }

  /**
   * Sleep for specified milliseconds
   * @param {number} ms - Milliseconds to sleep
   * @returns {Promise} - Promise that resolves after delay
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Report error to external monitoring service
   * @param {Object} errorLog - The error log object
   */
  reportToMonitoring(errorLog) {
    try {
      // Report to external monitoring service if configured
      if (window.discoveryErrorReporter && typeof window.discoveryErrorReporter === 'function') {
        window.discoveryErrorReporter(errorLog);
      }

      // Report to Sentry if available
      if (window.Sentry && window.Sentry.captureException) {
        window.Sentry.captureException(new Error(errorLog.error.message), {
          tags: {
            component: 'SampleDiscovery',
            context: errorLog.context
          },
          extra: errorLog.metadata
        });
      }
    } catch (reportingError) {
      console.warn('Failed to report error to monitoring:', reportingError);
    }
  }

  /**
   * Get error statistics for debugging
   * @returns {Object} - Error statistics
   */
  getErrorStats() {
    const now = Date.now();
    const oneHour = 60 * 60 * 1000;
    const recentErrors = this.errorLogs.filter(log => 
      now - new Date(log.timestamp).getTime() < oneHour
    );

    const errorsByContext = {};
    recentErrors.forEach(log => {
      errorsByContext[log.context] = (errorsByContext[log.context] || 0) + 1;
    });

    return {
      totalErrors: this.errorLogs.length,
      recentErrors: recentErrors.length,
      errorsByContext,
      retryAttempts: Object.fromEntries(this.retryAttempts)
    };
  }

  /**
   * Clear error logs (for testing or privacy)
   */
  clearErrorLogs() {
    this.errorLogs = [];
    this.retryAttempts.clear();
    
    try {
      localStorage.removeItem('discoveryErrorLogs');
    } catch (error) {
      console.warn('Failed to clear stored error logs:', error);
    }
  }
}

// Create singleton instance
const discoveryErrorService = new DiscoveryErrorService();

export default discoveryErrorService;