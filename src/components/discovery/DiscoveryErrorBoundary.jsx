import React from 'react';
import { AlertTriangle, RefreshCw, Wifi, WifiOff, Search, Home, RotateCcw } from 'lucide-react';
import { Button } from '../ui/button';
import { Alert, AlertDescription } from '../ui/alert';

/**
 * Top-level error boundary for the entire Sample Discovery feature
 * Catches all discovery-related errors and prevents them from affecting
 * other parts of the application (especially ChopperPage)
 * 
 * Requirements: 7.3, 7.4, 7.5
 */
class DiscoveryErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
      isRetrying: false,
      errorId: null,
      timestamp: null
    };
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      error,
      errorId: `discovery-error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString()
    };
  }

  componentDidCatch(error, errorInfo) {
    const errorContext = {
      error,
      errorInfo,
      errorId: this.state.errorId,
      timestamp: this.state.timestamp,
      component: 'DiscoveryErrorBoundary',
      userAgent: navigator.userAgent,
      url: window.location.href,
      isOnline: navigator.onLine
    };

    console.error('DiscoveryErrorBoundary caught an error:', errorContext);
    
    this.setState({
      error,
      errorInfo,
      hasError: true
    });

    // Log error for monitoring and debugging
    this.logError(errorContext);

    // Report error to monitoring service if available
    if (this.props.onError) {
      this.props.onError(error, errorInfo, 'SampleDiscovery');
    }
  }

  logError = (errorContext) => {
    try {
      // Log to console for development
      if (process.env.NODE_ENV === 'development') {
        console.group('🔍 Discovery Error Details');
        console.error('Error:', errorContext.error);
        console.error('Error Info:', errorContext.errorInfo);
        console.log('Context:', {
          errorId: errorContext.errorId,
          timestamp: errorContext.timestamp,
          userAgent: errorContext.userAgent,
          url: errorContext.url,
          isOnline: errorContext.isOnline
        });
        console.groupEnd();
      }

      // Store error in localStorage for debugging
      const errorLog = {
        ...errorContext,
        error: {
          message: errorContext.error?.message,
          stack: errorContext.error?.stack,
          name: errorContext.error?.name
        }
      };

      const existingLogs = JSON.parse(localStorage.getItem('discoveryErrorLogs') || '[]');
      existingLogs.push(errorLog);
      
      // Keep only last 10 errors
      const recentLogs = existingLogs.slice(-10);
      localStorage.setItem('discoveryErrorLogs', JSON.stringify(recentLogs));

      // Report to external monitoring service if configured
      if (window.discoveryErrorReporter) {
        window.discoveryErrorReporter(errorContext);
      }
    } catch (loggingError) {
      console.error('Failed to log discovery error:', loggingError);
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
          errorId: null,
          timestamp: null
        });
      }, 100);

    } catch (retryError) {
      console.error('Discovery retry failed:', retryError);
      this.setState({ 
        isRetrying: false,
        error: retryError 
      });
      
      // Log retry failure
      this.logError({
        error: retryError,
        errorInfo: { componentStack: 'Retry attempt failed' },
        errorId: `retry-${this.state.errorId}`,
        timestamp: new Date().toISOString(),
        component: 'DiscoveryErrorBoundary-Retry',
        retryCount: this.state.retryCount
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
      errorId: null,
      timestamp: null
    });

    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  handleGoHome = () => {
    // Navigate to home page to ensure user can continue using the app
    window.location.href = '/';
  };

  handleGoToChopper = () => {
    // Navigate to chopper page as a safe fallback
    window.location.href = '/chopper';
  };

  getErrorType(error) {
    const message = error?.message?.toLowerCase() || '';
    const stack = error?.stack?.toLowerCase() || '';
    
    if (message.includes('network') || message.includes('fetch') || message.includes('cors')) {
      return 'network';
    }
    if (message.includes('youtube') || message.includes('api') || message.includes('quota')) {
      return 'api';
    }
    if (message.includes('storage') || message.includes('localstorage') || message.includes('quota')) {
      return 'storage';
    }
    if (message.includes('component') || stack.includes('react') || message.includes('render')) {
      return 'component';
    }
    if (message.includes('discovery') || stack.includes('discovery')) {
      return 'discovery';
    }
    if (message.includes('timeout') || message.includes('abort')) {
      return 'timeout';
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
            ? 'Unable to connect to the sample discovery service. This might be a temporary server issue.'
            : 'You appear to be offline. Sample discovery requires an internet connection.',
          suggestions: [
            isOnline ? 'Check your internet connection' : 'Connect to the internet',
            'Try refreshing the page',
            'Check if the discovery service is available',
            'Wait a moment and try again'
          ],
          canRetry: true,
          severity: 'warning',
          showFallback: true
        };
        
      case 'api':
        return {
          icon: AlertTriangle,
          title: 'Discovery Service Error',
          description: 'The sample discovery service is currently unavailable. This might be due to API limits or service maintenance.',
          suggestions: [
            'Try again in a few minutes',
            'Check if YouTube is accessible',
            'The app will fall back to demo samples',
            'Contact support if this persists'
          ],
          canRetry: true,
          severity: 'warning',
          showFallback: true
        };
        
      case 'storage':
        return {
          icon: AlertTriangle,
          title: 'Storage Error',
          description: 'Unable to save or retrieve your discovery preferences. Your favorites and history might not be saved.',
          suggestions: [
            'Check if you have enough storage space',
            'Clear browser cache if needed',
            'The discovery feature will still work',
            'Your data will be stored temporarily'
          ],
          canRetry: true,
          severity: 'warning',
          showFallback: false
        };
        
      case 'component':
        return {
          icon: AlertTriangle,
          title: 'Discovery Component Error',
          description: 'A component in the sample discovery feature encountered an error. This is isolated and won\'t affect other parts of the app.',
          suggestions: [
            'Try refreshing the discovery page',
            'Clear browser cache',
            'Try a different browser if the issue persists',
            'The main chopper functionality is unaffected'
          ],
          canRetry: true,
          severity: 'error',
          showFallback: false
        };
        
      case 'discovery':
        return {
          icon: Search,
          title: 'Sample Discovery Error',
          description: 'An error occurred while discovering samples. The discovery feature is temporarily unavailable.',
          suggestions: [
            'Try refreshing the page',
            'Check your internet connection',
            'The app will show demo samples instead',
            'Your main chopper workflow is unaffected'
          ],
          canRetry: true,
          severity: 'warning',
          showFallback: true
        };
        
      case 'timeout':
        return {
          icon: AlertTriangle,
          title: 'Discovery Timeout',
          description: 'The sample discovery is taking too long to respond. This might be due to slow connection or high server load.',
          suggestions: [
            'Check your internet speed',
            'Try again in a few moments',
            'The app will show demo samples',
            'Consider using the main chopper feature'
          ],
          canRetry: true,
          severity: 'warning',
          showFallback: true
        };
        
      default:
        return {
          icon: AlertTriangle,
          title: 'Discovery Feature Error',
          description: error?.message || 'An unexpected error occurred in the sample discovery feature.',
          suggestions: [
            'Try refreshing the page',
            'Clear your browser cache',
            'Try a different browser if the issue persists',
            'The main app functionality is unaffected'
          ],
          canRetry: true,
          severity: 'error',
          showFallback: false
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
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center p-4">
        <div className="max-w-2xl w-full">
          <div className="bg-black/20 backdrop-blur-lg border border-white/20 rounded-2xl shadow-lg p-8">
            <Alert className={`border-${errorDetails.severity === 'error' ? 'red' : 'yellow'}-400 bg-${errorDetails.severity === 'error' ? 'red' : 'yellow'}-400/10`}>
              <IconComponent className={`h-6 w-6 text-${errorDetails.severity === 'error' ? 'red' : 'yellow'}-400`} />
              <AlertDescription className={`text-${errorDetails.severity === 'error' ? 'red' : 'yellow'}-200`}>
                <div className="space-y-4">
                  <div>
                    <h2 className="text-xl font-bold mb-2">{errorDetails.title}</h2>
                    <p className="text-base">{errorDetails.description}</p>
                  </div>
                  
                  {errorDetails.showFallback && (
                    <div className="bg-blue-500/10 border border-blue-400/20 rounded-lg p-3">
                      <p className="text-blue-200 text-sm">
                        <strong>Good news:</strong> The app will automatically fall back to demo samples 
                        so you can still explore the discovery feature while we resolve this issue.
                      </p>
                    </div>
                  )}
                  
                  {errorDetails.suggestions.length > 0 && (
                    <div>
                      <p className="font-medium mb-3">What you can do:</p>
                      <ul className="space-y-2 list-disc list-inside ml-2">
                        {errorDetails.suggestions.map((suggestion, index) => (
                          <li key={index} className="text-sm">{suggestion}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  <div className="bg-green-500/10 border border-green-400/20 rounded-lg p-3">
                    <p className="text-green-200 text-sm">
                      <strong>Don't worry:</strong> This error is isolated to the discovery feature. 
                      Your main chopper functionality and all other features are working normally.
                    </p>
                  </div>
                  
                  <div className="flex gap-3 pt-4 flex-wrap">
                    {errorDetails.canRetry && (
                      <Button
                        onClick={this.handleRetry}
                        disabled={this.state.isRetrying}
                        size="lg"
                        className="bg-cyan-500 hover:bg-cyan-600 text-black font-medium"
                      >
                        {this.state.isRetrying ? (
                          <>
                            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                            Retrying...
                          </>
                        ) : (
                          <>
                            <RefreshCw className="w-4 h-4 mr-2" />
                            Try Again {this.state.retryCount > 0 && `(${this.state.retryCount + 1})`}
                          </>
                        )}
                      </Button>
                    )}
                    
                    <Button
                      onClick={this.handleReset}
                      variant="outline"
                      size="lg"
                      className="border-white/20 text-white/80 hover:bg-white/10 font-medium"
                    >
                      <RotateCcw className="w-4 h-4 mr-2" />
                      Reset Discovery
                    </Button>
                    
                    <Button
                      onClick={this.handleGoToChopper}
                      variant="outline"
                      size="lg"
                      className="border-white/20 text-white/80 hover:bg-white/10 font-medium"
                    >
                      <Search className="w-4 h-4 mr-2" />
                      Go to Chopper
                    </Button>
                    
                    <Button
                      onClick={this.handleGoHome}
                      variant="outline"
                      size="lg"
                      className="border-white/20 text-white/80 hover:bg-white/10 font-medium"
                    >
                      <Home className="w-4 h-4 mr-2" />
                      Go Home
                    </Button>
                  </div>
                  
                  {this.state.errorId && (
                    <div className="bg-black/20 rounded p-3 text-xs">
                      <div className="text-white/60 mb-1">Error ID for support:</div>
                      <div className="text-white/80 font-mono break-all">{this.state.errorId}</div>
                      <div className="text-white/60 mt-1">Time: {new Date(this.state.timestamp).toLocaleString()}</div>
                    </div>
                  )}
                  
                  {process.env.NODE_ENV === 'development' && (
                    <details className="text-xs text-white/40 mt-4">
                      <summary className="cursor-pointer hover:text-white/60 font-medium">
                        Technical Details (Development Mode)
                      </summary>
                      <div className="mt-3 space-y-2 pl-4 border-l border-white/10">
                        <div>
                          <span className="text-white/60">Error:</span> {this.state.error?.message}
                        </div>
                        <div>
                          <span className="text-white/60">Type:</span> {errorType}
                        </div>
                        <div>
                          <span className="text-white/60">Stack:</span>
                          <pre className="text-xs mt-1 whitespace-pre-wrap break-all">
                            {this.state.error?.stack}
                          </pre>
                        </div>
                        <div>
                          <span className="text-white/60">Component Stack:</span>
                          <pre className="text-xs mt-1 whitespace-pre-wrap">
                            {this.state.errorInfo?.componentStack}
                          </pre>
                        </div>
                        <div>
                          <span className="text-white/60">Retry Count:</span> {this.state.retryCount}
                        </div>
                        <div>
                          <span className="text-white/60">Online:</span> {navigator.onLine ? 'Yes' : 'No'}
                        </div>
                      </div>
                    </details>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          </div>
        </div>
      </div>
    );
  }
}

export default DiscoveryErrorBoundary;