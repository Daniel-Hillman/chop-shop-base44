import React from 'react';
import { Video, VideoOff, AlertTriangle, RefreshCw, Wifi, WifiOff } from 'lucide-react';
import { Button } from '../ui/button';
import { Alert, AlertDescription } from '../ui/alert';

/**
 * Error boundary for video player failures
 * Handles YouTube player initialization and playback errors
 */
class VideoPlayerErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
      isRetrying: false,
      videoUrl: null
    };
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error, errorInfo) {
    console.error('VideoPlayerErrorBoundary caught an error:', error, errorInfo);
    
    this.setState({
      error,
      errorInfo,
      hasError: true,
      videoUrl: this.props.youtubeUrl || null
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
          videoUrl: null
        });
      }, 100);

    } catch (retryError) {
      console.error('Video player retry failed:', retryError);
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
      videoUrl: null
    });

    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  getErrorType(error) {
    const message = error?.message?.toLowerCase() || '';
    
    if (message.includes('youtube') || message.includes('player')) {
      return 'youtube';
    }
    if (message.includes('network') || message.includes('load') || message.includes('fetch')) {
      return 'network';
    }
    if (message.includes('embed') || message.includes('iframe')) {
      return 'embed';
    }
    if (message.includes('api') || message.includes('script')) {
      return 'api';
    }
    if (message.includes('unavailable') || message.includes('private') || message.includes('restricted')) {
      return 'unavailable';
    }
    
    return 'unknown';
  }

  getErrorDetails(errorType, error, videoUrl) {
    const isOnline = navigator.onLine;
    
    switch (errorType) {
      case 'youtube':
        return {
          icon: VideoOff,
          title: 'YouTube Player Error',
          description: 'The YouTube player failed to initialize or load the video.',
          suggestions: [
            'Check if the YouTube URL is valid',
            'Ensure the video is public and available',
            'Try refreshing the page',
            'Check if YouTube is accessible in your region'
          ],
          canRetry: true,
          severity: 'error',
          showUrl: true
        };
        
      case 'network':
        return {
          icon: isOnline ? Wifi : WifiOff,
          title: 'Network Connection Error',
          description: isOnline 
            ? 'Unable to load the video player. This might be a temporary connection issue.'
            : 'You appear to be offline. Video playback requires an internet connection.',
          suggestions: [
            isOnline ? 'Check your internet connection' : 'Connect to the internet',
            'Try refreshing the page',
            'Check if YouTube is accessible',
            'Wait a moment and try again'
          ],
          canRetry: true,
          severity: 'warning',
          showUrl: false
        };
        
      case 'embed':
        return {
          icon: Video,
          title: 'Video Embed Error',
          description: 'Failed to embed the YouTube video. The video might not allow embedding.',
          suggestions: [
            'Try a different YouTube video',
            'Check if the video allows embedding',
            'Ensure the video is public',
            'Try copying the URL directly from YouTube'
          ],
          canRetry: true,
          severity: 'warning',
          showUrl: true
        };
        
      case 'api':
        return {
          icon: AlertTriangle,
          title: 'YouTube API Error',
          description: 'Failed to load the YouTube player API. This might be due to browser restrictions.',
          suggestions: [
            'Check if JavaScript is enabled',
            'Disable ad blockers temporarily',
            'Try a different browser',
            'Clear browser cache and cookies'
          ],
          canRetry: true,
          severity: 'error',
          showUrl: false
        };
        
      case 'unavailable':
        return {
          icon: VideoOff,
          title: 'Video Unavailable',
          description: 'This video cannot be played. It might be private, deleted, or restricted.',
          suggestions: [
            'Try a different public YouTube video',
            'Check if the video exists and is public',
            'Ensure the video is available in your region',
            'Contact the video owner if it\'s private'
          ],
          canRetry: false,
          severity: 'error',
          showUrl: true
        };
        
      default:
        return {
          icon: AlertTriangle,
          title: 'Video Player Error',
          description: error?.message || 'An unexpected error occurred with the video player.',
          suggestions: [
            'Try refreshing the page',
            'Check your browser compatibility',
            'Clear browser cache',
            'Try a different browser if the issue persists'
          ],
          canRetry: true,
          severity: 'error',
          showUrl: true
        };
    }
  }

  extractVideoId(url) {
    if (!url) return null;
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/);
    return match ? match[1] : null;
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    const errorType = this.getErrorType(this.state.error);
    const errorDetails = this.getErrorDetails(errorType, this.state.error, this.state.videoUrl);
    const IconComponent = errorDetails.icon;
    const videoId = this.extractVideoId(this.state.videoUrl);

    return (
      <div className="bg-black/20 backdrop-blur-lg border border-white/20 rounded-2xl shadow-lg p-6">
        <Alert className={`border-${errorDetails.severity === 'error' ? 'red' : 'yellow'}-400 bg-${errorDetails.severity === 'error' ? 'red' : 'yellow'}-400/10`}>
          <IconComponent className={`h-4 w-4 text-${errorDetails.severity === 'error' ? 'red' : 'yellow'}-400`} />
          <AlertDescription className={`text-${errorDetails.severity === 'error' ? 'red' : 'yellow'}-200`}>
            <div className="space-y-3">
              <div>
                <h4 className="font-semibold">{errorDetails.title}</h4>
                <p className="text-sm mt-1">{errorDetails.description}</p>
              </div>
              
              {errorDetails.showUrl && this.state.videoUrl && (
                <div className="bg-black/20 rounded p-2 text-xs">
                  <span className="text-white/60">Video URL: </span>
                  <span className="text-white/80 break-all">{this.state.videoUrl}</span>
                  {videoId && (
                    <div className="mt-1">
                      <span className="text-white/60">Video ID: </span>
                      <span className="text-white/80">{videoId}</span>
                    </div>
                  )}
                </div>
              )}
              
              {errorDetails.suggestions.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-2">Troubleshooting steps:</p>
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
                        Retry Video {this.state.retryCount > 0 && `(${this.state.retryCount + 1})`}
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
                  Reset Player
                </Button>
                
                {this.state.videoUrl && (
                  <Button
                    onClick={() => window.open(this.state.videoUrl, '_blank')}
                    variant="outline"
                    size="sm"
                    className="border-white/20 text-white/80 hover:bg-white/10"
                  >
                    <Video className="w-3 h-3 mr-1" />
                    Open in YouTube
                  </Button>
                )}
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

export default VideoPlayerErrorBoundary;