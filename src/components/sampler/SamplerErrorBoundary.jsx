/**
 * @fileoverview Sampler Error Boundary Component
 * Specialized error boundary for sampler drum sequencer with recovery mechanisms
 * Requirements: 5.5, 5.6 - Error handling and graceful degradation
 */

import React from 'react';
import { AlertTriangle, RefreshCw, Play, Pause, Volume2, VolumeX, Wifi, WifiOff } from 'lucide-react';
import { useErrorRecovery } from '../../hooks/useErrorRecovery';

/**
 * Error boundary specifically for sampler sequencer failures
 * Provides contextual error messages and recovery actions
 */
class SamplerErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
      isRetrying: false,
      degradedMode: false,
      lastErrorTime: null
    };
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      error,
      lastErrorTime: Date.now()
    };
  }

  componentDidCatch(error, errorInfo) {
    console.error('SamplerErrorBoundary caught an error:', error, errorInfo);
    
    this.setState({
      error,
      errorInfo,
      hasError: true
    });

    // Report error to monitoring service if available
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Attempt automatic recovery for certain error types
    this.attemptAutoRecovery(error);
  }

  attemptAutoRecovery = async (error) => {
    const errorType = this.getErrorType(error);
    
    // Only attempt auto-recovery for transient errors
    if (errorType === 'youtube' || errorType === 'timing' || errorType === 'network') {
      console.log('Attempting automatic recovery for sampler error...');
      
      setTimeout(() => {
        this.handleRetry();
      }, 2000); // Wait 2 seconds before auto-retry
    }
  };

  handleRetry = async () => {
    this.setState({ 
      isRetrying: true,
      retryCount: this.state.retryCount + 1 
    });

    try {
      // Call custom retry logic if provided
      if (this.props.onRetry) {
        await this.props.onRetry();
      }

      // Reset error state after successful retry
      setTimeout(() => {
        this.setState({
          hasError: false,
          error: null,
          errorInfo: null,
          isRetrying: false,
          degradedMode: false
        });
      }, 100);

    } catch (retryError) {
      console.error('Sampler retry failed:', retryError);
      
      // Enable degraded mode if retry fails multiple times
      if (this.state.retryCount >= 2) {
        this.setState({ 
          isRetrying: false,
          degradedMode: true,
          error: retryError 
        });
      } else {
        this.setState({ 
          isRetrying: false,
          error: retryError 
        });
      }
    }
  };

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
      isRetrying: false,
      degradedMode: false,
      lastErrorTime: null
    });

    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  handleDegradedMode = () => {
    this.setState({
      hasError: false,
      degradedMode: true
    });

    if (this.props.onDegradedMode) {
      this.props.onDegradedMode();
    }
  };

  getErrorType(error) {
    const message = error?.message?.toLowerCase() || '';
    const stack = error?.stack?.toLowerCase() || '';
    const fullText = `${message} ${stack}`;
    
    if (fullText.includes('youtube') || fullText.includes('player') || fullText.includes('video')) {
      return 'youtube';
    }
    if (fullText.includes('timing') || fullText.includes('sequencer') || fullText.includes('step')) {
      return 'timing';
    }
    if (fullText.includes('pattern') || fullText.includes('validation') || fullText.includes('data')) {
      return 'pattern';
    }
    if (fullText.includes('chop') || fullText.includes('assignment') || fullText.includes('track')) {
      return 'chop';
    }
    if (fullText.includes('network') || fullText.includes('fetch') || fullText.includes('cors')) {
      return 'network';
    }
    if (fullText.includes('audio') || fullText.includes('context') || fullText.includes('decode')) {
      return 'audio';
    }
    
    return 'unknown';
  }

  getErrorDetails(errorType, error) {
    const isOnline = navigator.onLine;
    
    switch (errorType) {
      case 'youtube':
        return {
          icon: VolumeX,
          title: 'YouTube Player Error',
          description: 'Unable to control YouTube video playback. The video might be unavailable or restricted.',
          suggestions: [
            'Check if the YouTube video is still available',
            'Try refreshing the page',
            'Ensure the video is public and not restricted',
            'Continue in degraded mode (sequencer only, no video control)'
          ],
          canRetry: true,
          canDegrade: true,
          severity: 'warning'
        };
        
      case 'timing':
        return {
          icon: AlertTriangle,
          title: 'Sequencer Timing Error',
          description: 'The sequencer timing engine encountered an issue. This might affect playback accuracy.',
          suggestions: [
            'Try reducing the BPM for better stability',
            'Close other browser tabs to free up resources',
            'Restart the sequencer',
            'Continue with reduced timing precision'
          ],
          canRetry: true,
          canDegrade: true,
          severity: 'warning'
        };
        
      case 'pattern':
        return {
          icon: AlertTriangle,
          title: 'Pattern Data Error',
          description: 'Invalid or corrupted pattern data detected. The pattern might not load correctly.',
          suggestions: [
            'Try creating a new pattern',
            'Clear the current pattern and start over',
            'Check if the pattern data is valid',
            'Reset to default pattern'
          ],
          canRetry: true,
          canDegrade: false,
          severity: 'error'
        };
        
      case 'chop':
        return {
          icon: Volume2,
          title: 'Chop Integration Error',
          description: 'Unable to integrate chops with the sequencer. Some chops might not trigger correctly.',
          suggestions: [
            'Try recreating the affected chops',
            'Refresh the chop assignments',
            'Check if the chops have valid timestamps',
            'Continue with manual chop assignment'
          ],
          canRetry: true,
          canDegrade: true,
          severity: 'warning'
        };
        
      case 'network':
        return {
          icon: isOnline ? Wifi : WifiOff,
          title: 'Network Connection Error',
          description: isOnline 
            ? 'Unable to connect to required services. Some features might not work.'
            : 'You appear to be offline. The sequencer will work in offline mode.',
          suggestions: [
            isOnline ? 'Check your internet connection' : 'Connect to the internet for full functionality',
            'Try refreshing the page',
            'Continue in offline mode (limited functionality)'
          ],
          canRetry: true,
          canDegrade: true,
          severity: 'warning'
        };
        
      case 'audio':
        return {
          icon: VolumeX,
          title: 'Audio System Error',
          description: 'The audio system encountered an error. This might affect sound playback.',
          suggestions: [
            'Check your browser audio permissions',
            'Try refreshing the page',
            'Ensure your browser supports Web Audio API',
            'Continue in silent mode (visual sequencer only)'
          ],
          canRetry: true,
          canDegrade: true,
          severity: 'warning'
        };
        
      default:
        return {
          icon: AlertTriangle,
          title: 'Sequencer System Error',
          description: error?.message || 'An unexpected error occurred in the sampler sequencer.',
          suggestions: [
            'Try refreshing the page',
            'Clear your browser cache',
            'Try a different browser if the issue persists',
            'Continue in safe mode with limited features'
          ],
          canRetry: true,
          canDegrade: true,
          severity: 'error'
        };
    }
  }

  render() {
    if (!this.state.hasError && !this.state.degradedMode) {
      return this.props.children;
    }

    if (this.state.degradedMode) {
      return (
        <div className="relative">
          {/* Degraded mode banner */}
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3 mb-4">
            <div className="flex items-center gap-2 text-yellow-400">
              <AlertTriangle className="w-4 h-4" />
              <span className="text-sm font-medium">
                Running in Safe Mode - Some features may be limited
              </span>
              <button
                onClick={this.handleReset}
                className="ml-auto text-xs px-2 py-1 bg-yellow-500/20 rounded hover:bg-yellow-500/30 transition-colors"
              >
                Try Full Mode
              </button>
            </div>
          </div>
          {this.props.children}
        </div>
      );
    }

    const errorType = this.getErrorType(this.state.error);
    const errorDetails = this.getErrorDetails(errorType, this.state.error);
    const IconComponent = errorDetails.icon;

    return (
      <div className="bg-black/20 backdrop-blur-lg border border-white/20 rounded-2xl p-6">
        <div className={`border border-${errorDetails.severity === 'error' ? 'red' : 'yellow'}-400/20 bg-${errorDetails.severity === 'error' ? 'red' : 'yellow'}-400/10 rounded-xl p-4`}>
          <div className="flex items-start gap-3">
            <IconComponent className={`w-5 h-5 text-${errorDetails.severity === 'error' ? 'red' : 'yellow'}-400 mt-0.5 flex-shrink-0`} />
            
            <div className="flex-1 space-y-3">
              <div>
                <h3 className={`font-semibold text-${errorDetails.severity === 'error' ? 'red' : 'yellow'}-200`}>
                  {errorDetails.title}
                </h3>
                <p className={`text-sm mt-1 text-${errorDetails.severity === 'error' ? 'red' : 'yellow'}-300`}>
                  {errorDetails.description}
                </p>
              </div>
              
              {errorDetails.suggestions.length > 0 && (
                <div>
                  <p className={`text-sm font-medium mb-2 text-${errorDetails.severity === 'error' ? 'red' : 'yellow'}-200`}>
                    What you can do:
                  </p>
                  <ul className={`text-sm space-y-1 list-disc list-inside ml-2 text-${errorDetails.severity === 'error' ? 'red' : 'yellow'}-300`}>
                    {errorDetails.suggestions.map((suggestion, index) => (
                      <li key={index}>{suggestion}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              <div className="flex flex-wrap gap-2 pt-2">
                {errorDetails.canRetry && (
                  <button
                    onClick={this.handleRetry}
                    disabled={this.state.isRetrying}
                    className="flex items-center gap-1 px-3 py-1.5 bg-cyan-500 hover:bg-cyan-600 disabled:bg-cyan-500/50 text-black text-sm rounded transition-colors"
                  >
                    {this.state.isRetrying ? (
                      <>
                        <RefreshCw className="w-3 h-3 animate-spin" />
                        Retrying...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-3 h-3" />
                        Try Again {this.state.retryCount > 0 && `(${this.state.retryCount + 1})`}
                      </>
                    )}
                  </button>
                )}
                
                {errorDetails.canDegrade && (
                  <button
                    onClick={this.handleDegradedMode}
                    className="flex items-center gap-1 px-3 py-1.5 bg-yellow-500/20 hover:bg-yellow-500/30 border border-yellow-500/40 text-yellow-300 text-sm rounded transition-colors"
                  >
                    <Play className="w-3 h-3" />
                    Safe Mode
                  </button>
                )}
                
                <button
                  onClick={this.handleReset}
                  className="flex items-center gap-1 px-3 py-1.5 bg-white/10 hover:bg-white/20 border border-white/20 text-white/80 text-sm rounded transition-colors"
                >
                  Reset
                </button>
              </div>
              
              {/* Error frequency warning */}
              {this.state.retryCount >= 3 && (
                <div className="bg-red-500/10 border border-red-500/20 rounded p-2 mt-3">
                  <p className="text-xs text-red-300">
                    Multiple errors detected. Consider refreshing the page or trying a different video.
                  </p>
                </div>
              )}
              
              {process.env.NODE_ENV === 'development' && (
                <details className="text-xs text-white/40 mt-4">
                  <summary className="cursor-pointer hover:text-white/60">
                    Technical Details (Development)
                  </summary>
                  <div className="mt-2 space-y-1 pl-4 border-l border-white/10">
                    <div><strong>Error:</strong> {this.state.error?.message}</div>
                    <div><strong>Type:</strong> {errorType}</div>
                    <div><strong>Time:</strong> {new Date(this.state.lastErrorTime).toLocaleTimeString()}</div>
                    <div><strong>Stack:</strong> <pre className="text-xs mt-1 whitespace-pre-wrap">{this.state.error?.stack}</pre></div>
                  </div>
                </details>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }
}

/**
 * Hook-based error handler for functional components
 */
export function useSamplerErrorHandler() {
  const errorRecovery = useErrorRecovery('sampler_sequencer');
  
  const handleSamplerError = React.useCallback((error, context = {}) => {
    console.error('Sampler error:', error, context);
    
    // Classify error for appropriate handling
    const classification = errorRecovery.classifyError(error);
    
    // Return error information for UI handling
    return {
      error,
      classification,
      canRetry: classification.retryable,
      userFriendly: errorRecovery.getUserFriendlyError(error),
      context
    };
  }, [errorRecovery]);

  const executeSamplerOperation = React.useCallback(async (operation, options = {}) => {
    try {
      return await errorRecovery.executeWithRetry(operation, {
        ...options,
        context: { type: 'sampler', ...options.context }
      });
    } catch (error) {
      return handleSamplerError(error, options.context);
    }
  }, [errorRecovery, handleSamplerError]);

  return {
    ...errorRecovery,
    handleSamplerError,
    executeSamplerOperation
  };
}

export default SamplerErrorBoundary;