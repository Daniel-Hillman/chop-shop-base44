import React from 'react';
import { Play, Pause, AlertTriangle, RefreshCw, Volume2 } from 'lucide-react';
import { Button } from '../ui/button';
import { Alert, AlertDescription } from '../ui/alert';

/**
 * Error boundary for sample playback failures
 * Handles errors during sample creation and playback
 */
class SamplePlaybackErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
      isRetrying: false,
      lastFailedAction: null
    };
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error, errorInfo) {
    console.error('SamplePlaybackErrorBoundary caught an error:', error, errorInfo);
    
    this.setState({
      error,
      errorInfo,
      hasError: true,
      lastFailedAction: this.props.lastAction || 'unknown'
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
          isRetrying: false,
          lastFailedAction: null
        });
      }, 100);

    } catch (retryError) {
      console.error('Sample playback retry failed:', retryError);
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
      isRetrying: false,
      lastFailedAction: null
    });

    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  getErrorType(error) {
    const message = error?.message?.toLowerCase() || '';
    
    if (message.includes('audiocontext') || message.includes('suspended')) {
      return 'audiocontext';
    }
    if (message.includes('buffer') || message.includes('decode')) {
      return 'buffer';
    }
    if (message.includes('playback') || message.includes('play')) {
      return 'playback';
    }
    if (message.includes('timestamp') || message.includes('time')) {
      return 'timestamp';
    }
    if (message.includes('sample') || message.includes('pad')) {
      return 'sample';
    }
    
    return 'unknown';
  }

  getErrorDetails(errorType, error, lastAction) {
    switch (errorType) {
      case 'audiocontext':
        return {
          icon: Volume2,
          title: 'Audio Context Error',
          description: 'The browser\'s audio system is not responding. This usually happens when audio is blocked or suspended.',
          suggestions: [
            'Click anywhere on the page to activate audio',
            'Check if audio is muted in your browser',
            'Try refreshing the page',
            'Ensure your browser supports Web Audio API'
          ],
          canRetry: true,
          severity: 'warning',
          action: 'Click to activate audio'
        };
        
      case 'buffer':
        return {
          icon: AlertTriangle,
          title: 'Audio Buffer Error',
          description: 'There\'s an issue with the audio data. The audio buffer might be corrupted or invalid.',
          suggestions: [
            'Try reloading the audio',
            'Check if the original video is still available',
            'Clear the audio cache and try again'
          ],
          canRetry: true,
          severity: 'error',
          action: 'Reload audio'
        };
        
      case 'playback':
        return {
          icon: Play,
          title: 'Playback Error',
          description: `Failed to ${lastAction || 'play'} the sample. This might be due to audio system conflicts.`,
          suggestions: [
            'Stop other audio and try again',
            'Check your system audio settings',
            'Try a different sample',
            'Refresh the page if the issue persists'
          ],
          canRetry: true,
          severity: 'warning',
          action: 'Try playback again'
        };
        
      case 'timestamp':
        return {
          icon: AlertTriangle,
          title: 'Timestamp Error',
          description: 'Invalid sample timing. The start or end time might be outside the audio duration.',
          suggestions: [
            'Check that timestamps are within the audio length',
            'Ensure start time is before end time',
            'Try creating the sample again',
            'Reload the audio if timestamps seem correct'
          ],
          canRetry: true,
          severity: 'warning',
          action: 'Fix timestamps'
        };
        
      case 'sample':
        return {
          icon: AlertTriangle,
          title: 'Sample Creation Error',
          description: 'Failed to create or manage the sample. There might be an issue with the sample data.',
          suggestions: [
            'Try creating the sample at a different time',
            'Check if the audio is fully loaded',
            'Clear existing samples and try again',
            'Ensure the video is playing when creating samples'
          ],
          canRetry: true,
          severity: 'error',
          action: 'Create sample again'
        };
        
      default:
        return {
          icon: AlertTriangle,
          title: 'Sample System Error',
          description: error?.message || 'An unexpected error occurred in the sample playback system.',
          suggestions: [
            'Try the action again',
            'Refresh the page',
            'Clear browser cache if the issue persists',
            'Try a different browser'
          ],
          canRetry: true,
          severity: 'error',
          action: 'Try again'
        };
    }
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    const errorType = this.getErrorType(this.state.error);
    const errorDetails = this.getErrorDetails(errorType, this.state.error, this.state.lastFailedAction);
    const IconComponent = errorDetails.icon;

    return (
      <div className="p-4 space-y-3">
        <Alert className={`border-${errorDetails.severity === 'error' ? 'red' : 'yellow'}-400 bg-${errorDetails.severity === 'error' ? 'red' : 'yellow'}-400/10`}>
          <IconComponent className={`h-4 w-4 text-${errorDetails.severity === 'error' ? 'red' : 'yellow'}-400`} />
          <AlertDescription className={`text-${errorDetails.severity === 'error' ? 'red' : 'yellow'}-200`}>
            <div className="space-y-2">
              <div>
                <h4 className="font-semibold text-sm">{errorDetails.title}</h4>
                <p className="text-xs mt-1">{errorDetails.description}</p>
              </div>
              
              {errorDetails.suggestions.length > 0 && (
                <div>
                  <p className="text-xs font-medium mb-1">Quick fixes:</p>
                  <ul className="text-xs space-y-0.5 list-disc list-inside ml-2">
                    {errorDetails.suggestions.slice(0, 2).map((suggestion, index) => (
                      <li key={index}>{suggestion}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              <div className="flex gap-2 pt-1">
                {errorDetails.canRetry && (
                  <Button
                    onClick={this.handleRetry}
                    disabled={this.state.isRetrying}
                    size="sm"
                    className="bg-cyan-500 hover:bg-cyan-600 text-black text-xs h-7"
                  >
                    {this.state.isRetrying ? (
                      <>
                        <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                        Retrying...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-3 h-3 mr-1" />
                        {errorDetails.action}
                      </>
                    )}
                  </Button>
                )}
                
                <Button
                  onClick={this.handleReset}
                  variant="outline"
                  size="sm"
                  className="border-white/20 text-white/80 hover:bg-white/10 text-xs h-7"
                >
                  Dismiss
                </Button>
              </div>
            </div>
          </AlertDescription>
        </Alert>
      </div>
    );
  }
}

export default SamplePlaybackErrorBoundary;