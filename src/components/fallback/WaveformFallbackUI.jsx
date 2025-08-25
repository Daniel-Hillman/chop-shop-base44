import React, { useState } from 'react';
import { AlertTriangle, RefreshCw, Settings, Info, Zap } from 'lucide-react';

/**
 * Fallback UI component displayed when waveform visualization fails
 * Provides user-friendly error messages and recovery options
 */
export const WaveformFallbackUI = ({
  error,
  errorInfo,
  retryCount = 0,
  isRecovering = false,
  onRetry,
  onFallbackMode,
  canRetry = true,
  isTransient = false
}) => {
  const [showDetails, setShowDetails] = useState(false);

  const getErrorMessage = () => {
    if (!error) return 'An unknown error occurred';

    const errorMessage = (error.message || error.toString()).toLowerCase();
    
    // Provide user-friendly messages for common errors
    if (errorMessage.includes('canvas')) {
      return 'Unable to initialize waveform display. Your browser may not support the required graphics features.';
    }
    
    if (errorMessage.includes('audio') || errorMessage.includes('web audio')) {
      return 'Cannot access audio for waveform analysis. This may be due to browser security restrictions.';
    }
    
    if (errorMessage.includes('memory') || errorMessage.includes('allocation')) {
      return 'Insufficient memory to generate waveform. Try closing other browser tabs or refreshing the page.';
    }
    
    if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
      return 'Network error while loading audio data. Please check your internet connection.';
    }

    return 'Waveform visualization encountered an unexpected error.';
  };

  const getSuggestedActions = () => {
    const actions = [];
    
    if (isTransient && canRetry) {
      actions.push({
        label: 'Retry',
        action: onRetry,
        icon: RefreshCw,
        primary: true,
        description: 'Attempt to reload the waveform visualization'
      });
    }
    
    actions.push({
      label: 'Use Simple Mode',
      action: onFallbackMode,
      icon: Zap,
      primary: !canRetry,
      description: 'Switch to a simplified waveform display that works on all devices'
    });

    // Add browser-specific suggestions
    if (error?.message?.includes('canvas')) {
      actions.push({
        label: 'Update Browser',
        action: () => window.open('https://browsehappy.com/', '_blank'),
        icon: Settings,
        description: 'Update your browser for better graphics support'
      });
    }

    return actions;
  };

  const getRetryMessage = () => {
    if (retryCount === 0) return '';
    if (retryCount === 1) return 'First retry attempt...';
    if (retryCount === 2) return 'Second retry attempt...';
    return 'Final retry attempt...';
  };

  return (
    <div className="waveform-fallback-container bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-6 text-center min-h-[200px] flex flex-col justify-center">
      <div className="flex flex-col items-center space-y-4">
        {/* Error Icon */}
        <div className="flex items-center justify-center w-16 h-16 bg-orange-100 rounded-full">
          <AlertTriangle className="w-8 h-8 text-orange-600" />
        </div>

        {/* Error Message */}
        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-gray-900">
            Waveform Display Unavailable
          </h3>
          <p className="text-gray-600 max-w-md">
            {getErrorMessage()}
          </p>
          
          {retryCount > 0 && (
            <p className="text-sm text-blue-600">
              {getRetryMessage()}
            </p>
          )}
        </div>

        {/* Recovery Status */}
        {isRecovering && (
          <div className="flex items-center space-x-2 text-blue-600">
            <RefreshCw className="w-4 h-4 animate-spin" />
            <span className="text-sm">Attempting to recover...</span>
          </div>
        )}

        {/* Action Buttons */}
        {!isRecovering && (
          <div className="flex flex-wrap gap-3 justify-center">
            {getSuggestedActions().map((action, index) => (
              <button
                key={index}
                onClick={action.action}
                className={`
                  flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors
                  ${action.primary 
                    ? 'bg-blue-600 text-white hover:bg-blue-700' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }
                `}
                title={action.description}
              >
                <action.icon className="w-4 h-4" />
                <span>{action.label}</span>
              </button>
            ))}
          </div>
        )}

        {/* Error Details Toggle */}
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="flex items-center space-x-1 text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          <Info className="w-4 h-4" />
          <span>{showDetails ? 'Hide' : 'Show'} technical details</span>
        </button>

        {/* Technical Details */}
        {showDetails && (
          <div className="mt-4 p-4 bg-gray-100 rounded-lg text-left max-w-full overflow-auto">
            <div className="space-y-2 text-sm">
              <div>
                <strong>Error:</strong> {error?.name || 'Unknown'}
              </div>
              <div>
                <strong>Message:</strong> {error?.message || 'No message'}
              </div>
              <div>
                <strong>Retry Count:</strong> {retryCount}
              </div>
              {error?.stack && (
                <div>
                  <strong>Stack Trace:</strong>
                  <pre className="mt-1 text-xs bg-white p-2 rounded border overflow-x-auto">
                    {error.stack}
                  </pre>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Help Text */}
        <div className="text-xs text-gray-500 max-w-md">
          <p>
            The waveform visualization helps you see audio patterns and create precise samples. 
            You can still use the sampler without it by clicking on the pads to set timestamps.
          </p>
        </div>
      </div>
    </div>
  );
};

export default WaveformFallbackUI;