import React, { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import ErrorMessage from './ErrorMessage';
import ErrorRecoveryGuide from './ErrorRecoveryGuide';
import OfflineDetector from './OfflineDetector';
import discoveryErrorService from '../../services/discovery/DiscoveryErrorService';

/**
 * Comprehensive error state manager for the Discovery feature
 * Coordinates error display, recovery, and user experience
 * 
 * Requirements: 7.3, 7.5
 */
const ErrorStateManager = ({
  error,
  onRetry,
  onErrorDismiss,
  showRecoveryGuide = false,
  className = '',
  children
}) => {
  const [currentError, setCurrentError] = useState(error);
  const [errorType, setErrorType] = useState('general');
  const [showGuide, setShowGuide] = useState(showRecoveryGuide);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [retryCount, setRetryCount] = useState(0);
  const [lastRetryTime, setLastRetryTime] = useState(null);

  /**
   * Analyze error and determine type and handling strategy
   */
  const analyzeError = useCallback((errorObj) => {
    if (!errorObj) return { type: 'general', severity: 'error' };

    const errorMessage = typeof errorObj === 'string' ? errorObj : errorObj.message || '';
    const errorCode = errorObj.code || errorObj.status;

    // Network errors
    if (!isOnline || errorMessage.toLowerCase().includes('network') || 
        errorMessage.toLowerCase().includes('connection') ||
        errorMessage.toLowerCase().includes('fetch')) {
      return { type: 'network', severity: isOnline ? 'warning' : 'info' };
    }

    // API errors
    if (errorMessage.toLowerCase().includes('youtube') ||
        errorMessage.toLowerCase().includes('api') ||
        errorMessage.toLowerCase().includes('quota') ||
        errorCode === 403 || errorCode === 429) {
      return { type: 'api', severity: 'warning' };
    }

    // Storage errors
    if (errorMessage.toLowerCase().includes('storage') ||
        errorMessage.toLowerCase().includes('localstorage') ||
        errorMessage.toLowerCase().includes('quota')) {
      return { type: 'storage', severity: 'warning' };
    }

    // Timeout errors
    if (errorMessage.toLowerCase().includes('timeout') ||
        errorCode === 408) {
      return { type: 'timeout', severity: 'warning' };
    }

    // Video errors
    if (errorMessage.toLowerCase().includes('video') ||
        errorMessage.toLowerCase().includes('player') ||
        errorCode === 404) {
      return { type: 'video', severity: 'error' };
    }

    return { type: 'general', severity: 'error' };
  }, [isOnline]);

  /**
   * Update error state when error prop changes
   */
  useEffect(() => {
    if (error !== currentError) {
      setCurrentError(error);
      
      if (error) {
        const analysis = analyzeError(error);
        setErrorType(analysis.type);
        
        // Log the error
        discoveryErrorService.logError('error-state-manager', error, {
          errorType: analysis.type,
          severity: analysis.severity,
          isOnline,
          retryCount
        });
      }
    }
  }, [error, currentError, analyzeError, isOnline, retryCount]);

  /**
   * Handle online/offline status changes
   */
  const handleStatusChange = useCallback((online) => {
    setIsOnline(online);
    
    // If we come back online and have a network error, suggest retry
    if (online && errorType === 'network' && currentError) {
      // Auto-suggest retry after coming back online
      setTimeout(() => {
        if (onRetry) {
          handleRetry();
        }
      }, 1000);
    }
  }, [errorType, currentError, onRetry]);

  /**
   * Handle retry with intelligent backoff and error tracking
   */
  const handleRetry = useCallback(async () => {
    if (!onRetry) return;

    const now = Date.now();
    
    // Prevent rapid retries
    if (lastRetryTime && (now - lastRetryTime) < 2000) {
      return;
    }

    setLastRetryTime(now);
    setRetryCount(prev => prev + 1);

    try {
      await onRetry();
      
      // Success - clear error state
      setCurrentError(null);
      setRetryCount(0);
      setLastRetryTime(null);
      
      // Log successful recovery
      discoveryErrorService.logError('retry-success', null, {
        errorType,
        retryCount: retryCount + 1,
        timeSinceError: now - (lastRetryTime || now)
      });
      
    } catch (retryError) {
      // Retry failed - update error state
      setCurrentError(retryError);
      
      // Log retry failure
      discoveryErrorService.logError('retry-failed', retryError, {
        originalErrorType: errorType,
        retryCount: retryCount + 1,
        timeSinceError: now - (lastRetryTime || now)
      });
    }
  }, [onRetry, lastRetryTime, retryCount, errorType]);

  /**
   * Handle error dismissal
   */
  const handleErrorDismiss = useCallback(() => {
    setCurrentError(null);
    setShowGuide(false);
    setRetryCount(0);
    setLastRetryTime(null);
    
    if (onErrorDismiss) {
      onErrorDismiss();
    }
  }, [onErrorDismiss]);

  /**
   * Toggle recovery guide
   */
  const toggleRecoveryGuide = useCallback(() => {
    setShowGuide(prev => !prev);
  }, []);

  /**
   * Get user-friendly error message
   */
  const getUserFriendlyMessage = useCallback((errorObj, type) => {
    if (!errorObj) return null;

    const friendlyMessages = {
      network: isOnline 
        ? 'Unable to connect to the discovery service. Please check your connection.'
        : 'You\'re currently offline. Some features may be limited.',
      api: 'The sample discovery service is temporarily unavailable. Demo samples are available.',
      storage: 'Unable to save your preferences. Your session data may not persist.',
      timeout: 'The request is taking too long. Please try again.',
      video: 'Unable to load this video. Please try a different sample.',
      general: 'Something went wrong. Please try again.'
    };

    return friendlyMessages[type] || friendlyMessages.general;
  }, [isOnline]);

  /**
   * Determine if retry should be available
   */
  const canRetry = useCallback(() => {
    if (!onRetry) return false;
    
    // Don't allow retry if we've tried too many times recently
    if (retryCount >= 5) return false;
    
    // Don't allow retry for certain error types
    if (errorType === 'storage' && !isOnline) return false;
    
    // Don't allow retry too soon after last attempt
    if (lastRetryTime && (Date.now() - lastRetryTime) < 2000) return false;
    
    return true;
  }, [onRetry, retryCount, errorType, isOnline, lastRetryTime]);

  /**
   * Get retry button text based on context
   */
  const getRetryButtonText = useCallback(() => {
    if (retryCount === 0) return 'Try Again';
    if (retryCount === 1) return 'Retry';
    if (retryCount >= 2) return `Retry (${retryCount + 1})`;
    return 'Try Again';
  }, [retryCount]);

  // Don't render anything if there's no error
  if (!currentError) {
    return (
      <OfflineDetector onStatusChange={handleStatusChange} className={className}>
        {children}
      </OfflineDetector>
    );
  }

  const userFriendlyMessage = getUserFriendlyMessage(currentError, errorType);

  return (
    <OfflineDetector onStatusChange={handleStatusChange} className={className}>
      <div className="error-state-manager">
        {/* Main error message */}
        <ErrorMessage
          error={userFriendlyMessage}
          type={errorType}
          severity="auto"
          showRetry={canRetry()}
          showDismiss={true}
          onRetry={handleRetry}
          onDismiss={handleErrorDismiss}
          className="error-state-manager__message"
        />

        {/* Recovery guide toggle */}
        {currentError && (
          <div className="error-state-manager__guide-toggle">
            <button
              type="button"
              className="error-state-manager__guide-button"
              onClick={toggleRecoveryGuide}
            >
              {showGuide ? 'Hide' : 'Show'} Recovery Guide
            </button>
          </div>
        )}

        {/* Recovery guide */}
        {showGuide && (
          <ErrorRecoveryGuide
            error={currentError}
            errorType={errorType}
            onRetry={canRetry() ? handleRetry : null}
            onDismiss={() => setShowGuide(false)}
            className="error-state-manager__guide"
          />
        )}

        {/* Additional context for repeated failures */}
        {retryCount >= 3 && (
          <div className="error-state-manager__persistent-error">
            <p className="error-state-manager__persistent-message">
              This error has occurred {retryCount} times. You might want to:
            </p>
            <ul className="error-state-manager__persistent-suggestions">
              <li>Try refreshing the entire page</li>
              <li>Check if other websites are working</li>
              <li>Try again later</li>
              {process.env.NODE_ENV === 'development' && (
                <li>Check the browser console for technical details</li>
              )}
            </ul>
          </div>
        )}

        {/* Children with error context */}
        {children && (
          <div className="error-state-manager__content">
            {typeof children === 'function' 
              ? children({ 
                  hasError: !!currentError, 
                  errorType, 
                  isOnline, 
                  retryCount,
                  canRetry: canRetry()
                })
              : children
            }
          </div>
        )}
      </div>
    </OfflineDetector>
  );
};

ErrorStateManager.propTypes = {
  error: PropTypes.oneOfType([PropTypes.string, PropTypes.object]),
  onRetry: PropTypes.func,
  onErrorDismiss: PropTypes.func,
  showRecoveryGuide: PropTypes.bool,
  className: PropTypes.string,
  children: PropTypes.oneOfType([PropTypes.node, PropTypes.func])
};

export default ErrorStateManager;