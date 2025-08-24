import React from 'react';
import { AlertTriangle, RefreshCw, Wifi, WifiOff, Volume2, VolumeX } from 'lucide-react';
import { Button } from '../ui/button';
import { Alert, AlertDescription } from '../ui/alert';

/**
 * Error boundary specifically for audio processing failures
 * Provides contextual error messages and recovery actions
 */
class AudioErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
      isRetrying: false
    };
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error, errorInfo) {
    console.error('AudioErrorBoundary caught an error:', error, errorInfo);
    
    this.setState({
      error,
      errorInfo,
      hasError: true
    });

    // Report error to monitoring service if available
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

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
          isRetrying: false
        });
      }, 100);

    } catch (retryError) {
      console.error('Retry failed:', retryError);
      this.setState({ 
        isRetrying: false,
        error: retryError 
      });
    }
  };

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
      isRetrying: false
    });

    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  getErrorType(error) {
    const message = error?.message?.toLowerCase() || '';
    
    if (message.includes('network') || message.includes('fetch') || message.includes('cors')) {
      return 'network';
    }
    if (message.includes('decode') || message.includes('audio') || message.includes('context')) {
      return 'audio';
    }
    if (message.includes('timeout') || message.includes('abort')) {
      return 'timeout';
    }
    if (message.includes('quota') || message.includes('limit') || message.includes('rate')) {
      return 'quota';
    }
    if (message.includes('unavailable') || message.includes('private') || message.includes('restricted')) {
      return 'unavailable';
    }
    
    return 'unknown';
  }

  getErrorDetails(errorType, error) {
    const isOnline = navigator.onLine;
    
    switch (errorType) {
      case 'network':
        return {
          icon: isOnline ? Wifi : WifiOff,
          title: 'Network Connection Error',
          description: isOnline 
            ? 'Unable to connect to the audio service. This might be a temporary server issue.'
            : 'You appear to be offline. Please check your internet connection.',
          suggestions: [
            isOnline ? 'Check if the audio service is running' : 'Check your internet connection',
            'Try refreshing the page',
            'Wait a moment and try again'
          ],
          canRetry: true,
          severity: 'warning'
        };
        
      case 'audio':
        return {
          icon: VolumeX,
          title: 'Audio Processing Error',
          description: 'Unable to process the audio from this video. The audio format might not be supported.',
          suggestions: [
            'Try a different YouTube video',
            'Check if the video has audio',
            'Ensure your browser supports Web Audio API'
          ],
          canRetry: true,
          severity: 'error'
        };
        
      case 'timeout':
        return {
          icon: AlertTriangle,
          title: 'Download Timeout',
          description: 'The audio download is taking too long. This might be due to a large file or slow connection.',
          suggestions: [
            'Try a shorter video',
            'Check your internet speed',
            'Wait and try again later'
          ],
          canRetry: true,
          severity: 'warning'
        };
        
      case 'quota':
        return {
          icon: AlertTriangle,
          title: 'Service Limit Reached',
          description: 'The audio service has reached its usage limit. Please try again later.',
          suggestions: [
            'Wait a few minutes and try again',
            'Try during off-peak hours',
            'Contact support if this persists'
          ],
          canRetry: false,
          severity: 'warning'
        };
        
      case 'unavailable':
        return {
          icon: VolumeX,
          title: 'Video Unavailable',
          description: 'This video cannot be processed. It might be private, deleted, or restricted.',
          suggestions: [
            'Try a different public YouTube video',
            'Check if the video exists and is public',
            'Ensure the video has audio content'
          ],
          canRetry: false,
          severity: 'error'
        };
        
      default:
        return {
          icon: AlertTriangle,
          title: 'Audio System Error',
          description: error?.message || 'An unexpected error occurred in the audio system.',
          suggestions: [
            'Try refreshing the page',
            'Clear your browser cache',
            'Try a different browser if the issue persists'
          ],
          canRetry: true,
          severity: 'error'
        };
    }
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    const errorType = this.getErrorType(this.state.error);
    const errorDetails = this.getErrorDetails(errorType, this.state.error);
    const IconComponent = errorDetails.icon;

    return (
      <div className="p-6 space-y-4">
        <Alert className={`border-${errorDetails.severity === 'error' ? 'red' : 'yellow'}-400 bg-${errorDetails.severity === 'error' ? 'red' : 'yellow'}-400/10`}>
          <IconComponent className={`h-4 w-4 text-${errorDetails.severity === 'error' ? 'red' : 'yellow'}-400`} />
          <AlertDescription className={`text-${errorDetails.severity === 'error' ? 'red' : 'yellow'}-200`}>
            <div className="space-y-3">
              <div>
                <h4 className="font-semibold">{errorDetails.title}</h4>
                <p className="text-sm mt-1">{errorDetails.description}</p>
              </div>
              
              {errorDetails.suggestions.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-2">Suggestions:</p>
                  <ul className="text-sm space-y-1 list-disc list-inside ml-2">
                    {errorDetails.suggestions.map((suggestion, index) => (
                      <li key={index}>{suggestion}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              <div className="flex gap-2 pt-2">
                {errorDetails.canRetry && (
                  <Button
                    onClick={this.handleRetry}
                    disabled={this.state.isRetrying}
                    size="sm"
                    className="bg-cyan-500 hover:bg-cyan-600 text-black"
                  >
                    {this.state.isRetrying ? (
                      <>
                        <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                        Retrying...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-3 h-3 mr-1" />
                        Try Again {this.state.retryCount > 0 && `(${this.state.retryCount + 1})`}
                      </>
                    )}
                  </Button>
                )}
                
                <Button
                  onClick={this.handleReset}
                  variant="outline"
                  size="sm"
                  className="border-white/20 text-white/80 hover:bg-white/10"
                >
                  Reset
                </Button>
              </div>
              
              {process.env.NODE_ENV === 'development' && (
                <details className="text-xs text-white/40 mt-4">
                  <summary className="cursor-pointer hover:text-white/60">
                    Technical Details (Development)
                  </summary>
                  <div className="mt-2 space-y-1 pl-4 border-l border-white/10">
                    <div>Error: {this.state.error?.message}</div>
                    <div>Stack: {this.state.error?.stack}</div>
                    <div>Component Stack: {this.state.errorInfo?.componentStack}</div>
                  </div>
                </details>
              )}
            </div>
          </AlertDescription>
        </Alert>
      </div>
    );
  }
}

export default AudioErrorBoundary;