/**
 * @fileoverview Sampler Error Notifications Component
 * User-friendly error notifications for sampler sequencer
 * Requirements: 5.5, 5.6 - User-friendly error notifications
 */

import React, { useState, useEffect, useCallback } from 'react';
import { 
  AlertTriangle, 
  X, 
  RefreshCw, 
  CheckCircle, 
  Info, 
  AlertCircle,
  Volume2,
  VolumeX,
  Wifi,
  WifiOff
} from 'lucide-react';

/**
 * Toast-style error notifications for sampler sequencer
 */
export function SamplerErrorNotifications({ 
  errors = [], 
  onDismiss, 
  onRetry,
  maxVisible = 3,
  autoHideDelay = 5000 
}) {
  const [visibleErrors, setVisibleErrors] = useState([]);
  const [dismissedIds, setDismissedIds] = useState(new Set());

  // Update visible errors when errors prop changes
  useEffect(() => {
    const newErrors = errors
      .filter(error => !dismissedIds.has(error.id))
      .slice(0, maxVisible)
      .map(error => ({
        ...error,
        timestamp: error.timestamp || Date.now()
      }));

    setVisibleErrors(newErrors);
  }, [errors, dismissedIds, maxVisible]);

  // Auto-hide errors after delay
  useEffect(() => {
    if (autoHideDelay > 0) {
      visibleErrors.forEach(error => {
        if (error.autoHide !== false) {
          const timer = setTimeout(() => {
            handleDismiss(error.id);
          }, autoHideDelay);

          return () => clearTimeout(timer);
        }
      });
    }
  }, [visibleErrors, autoHideDelay]);

  const handleDismiss = useCallback((errorId) => {
    setDismissedIds(prev => new Set([...prev, errorId]));
    if (onDismiss) {
      onDismiss(errorId);
    }
  }, [onDismiss]);

  const handleRetry = useCallback((errorId) => {
    if (onRetry) {
      onRetry(errorId);
    }
    handleDismiss(errorId);
  }, [onRetry, handleDismiss]);

  const getErrorIcon = (type, severity) => {
    switch (type) {
      case 'youtube':
        return severity === 'error' ? VolumeX : Volume2;
      case 'network':
        return navigator.onLine ? Wifi : WifiOff;
      case 'timing':
      case 'pattern':
      case 'chop':
        return AlertTriangle;
      default:
        return severity === 'error' ? AlertCircle : Info;
    }
  };

  const getErrorColors = (severity) => {
    switch (severity) {
      case 'error':
        return {
          bg: 'bg-red-500/10',
          border: 'border-red-500/20',
          text: 'text-red-200',
          icon: 'text-red-400'
        };
      case 'warning':
        return {
          bg: 'bg-yellow-500/10',
          border: 'border-yellow-500/20',
          text: 'text-yellow-200',
          icon: 'text-yellow-400'
        };
      case 'info':
        return {
          bg: 'bg-blue-500/10',
          border: 'border-blue-500/20',
          text: 'text-blue-200',
          icon: 'text-blue-400'
        };
      case 'success':
        return {
          bg: 'bg-green-500/10',
          border: 'border-green-500/20',
          text: 'text-green-200',
          icon: 'text-green-400'
        };
      default:
        return {
          bg: 'bg-gray-500/10',
          border: 'border-gray-500/20',
          text: 'text-gray-200',
          icon: 'text-gray-400'
        };
    }
  };

  if (visibleErrors.length === 0) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-md">
      {visibleErrors.map((error) => {
        const IconComponent = getErrorIcon(error.type, error.severity);
        const colors = getErrorColors(error.severity);
        
        return (
          <div
            key={error.id}
            className={`${colors.bg} ${colors.border} border backdrop-blur-lg rounded-lg p-4 shadow-lg animate-in slide-in-from-right duration-300`}
          >
            <div className="flex items-start gap-3">
              <IconComponent className={`w-5 h-5 ${colors.icon} mt-0.5 flex-shrink-0`} />
              
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <h4 className={`font-medium ${colors.text} text-sm`}>
                      {error.title}
                    </h4>
                    {error.message && (
                      <p className={`text-xs mt-1 ${colors.text} opacity-80`}>
                        {error.message}
                      </p>
                    )}
                  </div>
                  
                  <button
                    onClick={() => handleDismiss(error.id)}
                    className={`${colors.icon} hover:opacity-80 transition-opacity`}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Action buttons */}
                {(error.canRetry || error.actions) && (
                  <div className="flex gap-2 mt-3">
                    {error.canRetry && (
                      <button
                        onClick={() => handleRetry(error.id)}
                        className="flex items-center gap-1 px-2 py-1 bg-white/10 hover:bg-white/20 rounded text-xs transition-colors"
                      >
                        <RefreshCw className="w-3 h-3" />
                        Retry
                      </button>
                    )}
                    
                    {error.actions?.map((action, index) => (
                      <button
                        key={index}
                        onClick={() => {
                          action.handler();
                          if (action.dismissAfter) {
                            handleDismiss(error.id);
                          }
                        }}
                        className="px-2 py-1 bg-white/10 hover:bg-white/20 rounded text-xs transition-colors"
                      >
                        {action.label}
                      </button>
                    ))}
                  </div>
                )}

                {/* Progress indicator for auto-hide */}
                {error.autoHide !== false && autoHideDelay > 0 && (
                  <div className="mt-2 h-1 bg-white/10 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-white/30 rounded-full animate-pulse"
                      style={{
                        animation: `shrink ${autoHideDelay}ms linear forwards`
                      }}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
      
      {/* Show count if there are more errors */}
      {errors.length > maxVisible && (
        <div className="bg-gray-500/10 border border-gray-500/20 backdrop-blur-lg rounded-lg p-2 text-center">
          <span className="text-xs text-gray-300">
            +{errors.length - maxVisible} more error{errors.length - maxVisible !== 1 ? 's' : ''}
          </span>
        </div>
      )}

      <style jsx>{`
        @keyframes shrink {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>
    </div>
  );
}

/**
 * Hook for managing sampler error notifications
 */
export function useSamplerErrorNotifications() {
  const [errors, setErrors] = useState([]);
  const [nextId, setNextId] = useState(1);

  const addError = useCallback((errorData) => {
    const error = {
      id: nextId,
      timestamp: Date.now(),
      severity: 'error',
      autoHide: true,
      canRetry: false,
      ...errorData
    };

    setErrors(prev => [...prev, error]);
    setNextId(prev => prev + 1);

    return error.id;
  }, [nextId]);

  const addWarning = useCallback((warningData) => {
    return addError({
      ...warningData,
      severity: 'warning'
    });
  }, [addError]);

  const addInfo = useCallback((infoData) => {
    return addError({
      ...infoData,
      severity: 'info'
    });
  }, [addError]);

  const addSuccess = useCallback((successData) => {
    return addError({
      ...successData,
      severity: 'success',
      autoHide: true
    });
  }, [addError]);

  const removeError = useCallback((errorId) => {
    setErrors(prev => prev.filter(error => error.id !== errorId));
  }, []);

  const clearAll = useCallback(() => {
    setErrors([]);
  }, []);

  const addYouTubeError = useCallback((message, canRetry = true) => {
    return addError({
      type: 'youtube',
      title: 'YouTube Player Error',
      message,
      canRetry,
      actions: canRetry ? [] : [{
        label: 'Continue in Safe Mode',
        handler: () => {
          // This would trigger degraded mode
          console.log('Entering safe mode due to YouTube error');
        },
        dismissAfter: true
      }]
    });
  }, [addError]);

  const addTimingError = useCallback((message, canRetry = true) => {
    return addWarning({
      type: 'timing',
      title: 'Timing Issue',
      message,
      canRetry
    });
  }, [addWarning]);

  const addPatternError = useCallback((message, canRetry = true) => {
    return addError({
      type: 'pattern',
      title: 'Pattern Data Error',
      message,
      canRetry
    });
  }, [addError]);

  const addChopError = useCallback((message, canRetry = true) => {
    return addWarning({
      type: 'chop',
      title: 'Chop Integration Error',
      message,
      canRetry
    });
  }, [addWarning]);

  const addNetworkError = useCallback((message, canRetry = true) => {
    return addWarning({
      type: 'network',
      title: 'Connection Issue',
      message,
      canRetry
    });
  }, [addWarning]);

  return {
    errors,
    addError,
    addWarning,
    addInfo,
    addSuccess,
    removeError,
    clearAll,
    // Specialized error types
    addYouTubeError,
    addTimingError,
    addPatternError,
    addChopError,
    addNetworkError
  };
}

export default SamplerErrorNotifications;