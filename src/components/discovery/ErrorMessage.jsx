import React from 'react';
import PropTypes from 'prop-types';
import { AlertTriangle, RefreshCw, Wifi, WifiOff, X } from 'lucide-react';

/**
 * Reusable inline error message component for the Discovery feature
 * Provides user-friendly error messages with appropriate actions and offline detection
 * Enhanced with comprehensive error handling and user experience improvements
 * 
 * Requirements: 7.3, 7.5
 */
const ErrorMessage = ({
  error,
  type = 'general',
  severity = 'error',
  showRetry = true,
  showDismiss = true,
  onRetry,
  onDismiss,
  className = '',
  compact = false,
  retryCount = 0,
  showTechnicalDetails = false,
  autoRetryDelay = null,
  contextualHelp = null
}) => {
  const isOnline = navigator.onLine;

  /**
   * Get error type from error message if not explicitly provided
   */
  const getErrorType = (errorMessage) => {
    if (!errorMessage) return 'general';
    
    const message = errorMessage.toLowerCase();
    
    if (message.includes('network') || message.includes('connection') || message.includes('fetch')) {
      return 'network';
    }
    if (message.includes('youtube') || message.includes('api') || message.includes('quota')) {
      return 'api';
    }
    if (message.includes('storage') || message.includes('localstorage')) {
      return 'storage';
    }
    if (message.includes('timeout')) {
      return 'timeout';
    }
    if (message.includes('video') || message.includes('player')) {
      return 'video';
    }
    
    return 'general';
  };

  const errorType = type === 'auto' ? getErrorType(error) : type;

  /**
   * Get error configuration based on type
   */
  const getErrorConfig = () => {
    const configs = {
      network: {
        icon: isOnline ? Wifi : WifiOff,
        title: isOnline ? 'Connection Issue' : 'You\'re Offline',
        message: isOnline 
          ? 'Unable to connect to the discovery service. Please check your connection.'
          : 'You\'re currently offline. Some features may be limited.',
        suggestions: isOnline 
          ? ['Check your internet connection', 'Try refreshing the page']
          : ['Connect to the internet', 'Some cached content may still be available'],
        canRetry: isOnline,
        severity: isOnline ? 'warning' : 'info'
      },
      api: {
        icon: AlertTriangle,
        title: 'Service Unavailable',
        message: 'The sample discovery service is temporarily unavailable.',
        suggestions: ['Try again in a few minutes', 'Demo samples are available'],
        canRetry: true,
        severity: 'warning'
      },
      storage: {
        icon: AlertTriangle,
        title: 'Storage Issue',
        message: 'Unable to save your preferences. Your session data may not persist.',
        suggestions: ['Clear browser cache', 'Free up storage space'],
        canRetry: false,
        severity: 'warning'
      },
      timeout: {
        icon: AlertTriangle,
        title: 'Request Timeout',
        message: 'The request is taking too long to complete.',
        suggestions: ['Check your connection speed', 'Try again with a shorter request'],
        canRetry: true,
        severity: 'warning'
      },
      video: {
        icon: AlertTriangle,
        title: 'Video Error',
        message: 'Unable to load or play the video.',
        suggestions: ['Check if the video is available', 'Try a different sample'],
        canRetry: true,
        severity: 'error'
      },
      general: {
        icon: AlertTriangle,
        title: 'Something Went Wrong',
        message: 'An unexpected error occurred.',
        suggestions: ['Try refreshing the page', 'Contact support if this persists'],
        canRetry: true,
        severity: 'error'
      }
    };

    return configs[errorType] || configs.general;
  };

  const config = getErrorConfig();
  const IconComponent = config.icon;
  const finalSeverity = severity === 'auto' ? config.severity : severity;
  const canRetry = showRetry && config.canRetry && onRetry;

  /**
   * Get CSS classes based on severity
   */
  const getSeverityClasses = () => {
    const baseClasses = 'error-message';
    const severityClasses = {
      error: 'error-message--error',
      warning: 'error-message--warning',
      info: 'error-message--info'
    };
    
    return `${baseClasses} ${severityClasses[finalSeverity] || severityClasses.error}`;
  };

  /**
   * Handle retry with loading state and auto-retry functionality
   */
  const [isRetrying, setIsRetrying] = React.useState(false);
  const [autoRetryCountdown, setAutoRetryCountdown] = React.useState(null);
  
  // Auto-retry countdown effect
  React.useEffect(() => {
    if (autoRetryDelay && onRetry && !isRetrying) {
      setAutoRetryCountdown(Math.ceil(autoRetryDelay / 1000));
      
      const interval = setInterval(() => {
        setAutoRetryCountdown(prev => {
          if (prev <= 1) {
            clearInterval(interval);
            handleRetry();
            return null;
          }
          return prev - 1;
        });
      }, 1000);
      
      return () => clearInterval(interval);
    }
  }, [autoRetryDelay, onRetry, isRetrying]);
  
  const handleRetry = async () => {
    if (!onRetry || isRetrying) return;
    
    setIsRetrying(true);
    setAutoRetryCountdown(null);
    
    try {
      await onRetry();
    } catch (retryError) {
      console.warn('Retry failed:', retryError);
    } finally {
      setIsRetrying(false);
    }
  };

  /**
   * Cancel auto-retry
   */
  const cancelAutoRetry = () => {
    setAutoRetryCountdown(null);
  };

  if (!error && errorType === 'general') {
    return null;
  }

  return (
    <div 
      className={`${getSeverityClasses()} ${compact ? 'error-message--compact' : ''} ${className}`}
      role="alert"
      aria-live="polite"
    >
      <div className="error-message__content">
        <div className="error-message__header">
          <div className="error-message__icon">
            <IconComponent 
              className={`error-message__icon-svg error-message__icon-svg--${finalSeverity}`}
              size={compact ? 16 : 20}
              aria-hidden="true"
            />
          </div>
          
          <div className="error-message__text">
            <h4 className="error-message__title">
              {config.title}
            </h4>
            
            {!compact && (
              <p className="error-message__message">
                {config.message}
              </p>
            )}
          </div>

          {showDismiss && onDismiss && (
            <button
              type="button"
              className="error-message__dismiss"
              onClick={onDismiss}
              aria-label="Dismiss error message"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {!compact && config.suggestions.length > 0 && (
          <div className="error-message__suggestions">
            <p className="error-message__suggestions-title">What you can try:</p>
            <ul className="error-message__suggestions-list">
              {config.suggestions.map((suggestion, index) => (
                <li key={index} className="error-message__suggestion">
                  {suggestion}
                </li>
              ))}
            </ul>
          </div>
        )}

        {(canRetry || (!isOnline && errorType === 'network') || autoRetryCountdown) && (
          <div className="error-message__actions">
            {/* Auto-retry countdown */}
            {autoRetryCountdown && (
              <div className="error-message__auto-retry">
                <div className="error-message__auto-retry-content">
                  <RefreshCw className="error-message__auto-retry-icon" size={14} />
                  <span className="error-message__auto-retry-text">
                    Auto-retrying in {autoRetryCountdown}s...
                  </span>
                  <button
                    type="button"
                    className="error-message__auto-retry-cancel"
                    onClick={cancelAutoRetry}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Manual retry button */}
            {canRetry && !autoRetryCountdown && (
              <button
                type="button"
                className="error-message__action error-message__action--primary"
                onClick={handleRetry}
                disabled={isRetrying}
              >
                {isRetrying ? (
                  <>
                    <RefreshCw className="error-message__action-icon animate-spin" size={14} />
                    Retrying...
                  </>
                ) : retryCount > 0 ? (
                  <>
                    <RefreshCw className="error-message__action-icon" size={14} />
                    Retry ({retryCount + 1})
                  </>
                ) : (
                  <>
                    <RefreshCw className="error-message__action-icon" size={14} />
                    Try Again
                  </>
                )}
              </button>
            )}

            {/* Offline notice */}
            {!isOnline && errorType === 'network' && (
              <div className="error-message__offline-notice">
                <WifiOff size={14} className="error-message__offline-icon" />
                <span className="error-message__offline-text">
                  Offline mode - limited functionality
                </span>
              </div>
            )}
          </div>
        )}

        {/* Contextual help */}
        {contextualHelp && !compact && (
          <div className="error-message__contextual-help">
            <div className="error-message__contextual-help-content">
              {contextualHelp}
            </div>
          </div>
        )}

        {/* Technical details for development or when explicitly requested */}
        {(showTechnicalDetails || process.env.NODE_ENV === 'development') && error && (
          <details className="error-message__technical">
            <summary className="error-message__technical-summary">
              Technical Details {process.env.NODE_ENV === 'development' ? '(Development)' : ''}
            </summary>
            <div className="error-message__technical-content">
              <pre className="error-message__technical-details">
                {typeof error === 'string' ? error : JSON.stringify(error, null, 2)}
              </pre>
              {retryCount > 0 && (
                <div className="error-message__technical-meta">
                  <p><strong>Retry attempts:</strong> {retryCount}</p>
                  <p><strong>Error type:</strong> {errorType}</p>
                  <p><strong>Online status:</strong> {isOnline ? 'Online' : 'Offline'}</p>
                  <p><strong>Timestamp:</strong> {new Date().toISOString()}</p>
                </div>
              )}
            </div>
          </details>
        )}
      </div>
    </div>
  );
};

ErrorMessage.propTypes = {
  error: PropTypes.oneOfType([PropTypes.string, PropTypes.object]),
  type: PropTypes.oneOf(['network', 'api', 'storage', 'timeout', 'video', 'general', 'auto']),
  severity: PropTypes.oneOf(['error', 'warning', 'info', 'auto']),
  showRetry: PropTypes.bool,
  showDismiss: PropTypes.bool,
  onRetry: PropTypes.func,
  onDismiss: PropTypes.func,
  className: PropTypes.string,
  compact: PropTypes.bool,
  retryCount: PropTypes.number,
  showTechnicalDetails: PropTypes.bool,
  autoRetryDelay: PropTypes.number,
  contextualHelp: PropTypes.node
};

export default ErrorMessage;