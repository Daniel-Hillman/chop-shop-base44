import React from 'react';
import { WaveformFallbackUI } from '../fallback/WaveformFallbackUI';
import { WaveformErrorRecoveryService } from '../../services/WaveformErrorRecoveryService';

/**
 * Error boundary specifically for waveform visualization components
 * Provides graceful failure handling and recovery options
 */
export class WaveformErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
      isRecovering: false
    };
    
    this.errorRecoveryService = new WaveformErrorRecoveryService();
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({
      error,
      errorInfo
    });

    // Log error for debugging
    console.error('WaveformErrorBoundary caught an error:', error, errorInfo);
    
    // Report error to recovery service
    this.errorRecoveryService.reportError({
      error,
      errorInfo,
      component: 'WaveformVisualization',
      timestamp: Date.now(),
      retryCount: this.state.retryCount
    });

    // Attempt automatic recovery for certain error types (if enabled)
    if (this.props.enableAutoRecovery !== false) {
      this.attemptAutoRecovery(error);
    }
  }

  attemptAutoRecovery = async (error) => {
    const { retryCount } = this.state;
    const maxRetries = 3;

    // Only attempt auto-recovery for transient errors
    if (this.isTransientError(error) && retryCount < maxRetries) {
      this.setState({ isRecovering: true });
      
      try {
        // Wait a bit before attempting recovery
        setTimeout(async () => {
          try {
            await this.errorRecoveryService.attemptRecovery(error);
            
            this.setState({
              hasError: false,
              error: null,
              errorInfo: null,
              retryCount: retryCount + 1,
              isRecovering: false
            });
          } catch (recoveryError) {
            console.error('Auto-recovery failed:', recoveryError);
            this.setState({ isRecovering: false });
          }
        }, 1000);
      } catch (recoveryError) {
        console.error('Auto-recovery failed:', recoveryError);
        this.setState({ isRecovering: false });
      }
    }
  };

  isTransientError = (error) => {
    const transientErrorPatterns = [
      /network/i,
      /timeout/i,
      /temporary/i,
      /canvas.*context/i,
      /audio.*context/i
    ];

    return transientErrorPatterns.some(pattern => 
      pattern.test(error.message) || pattern.test(error.name)
    );
  };

  handleManualRetry = () => {
    // Force a re-render by updating the key
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: this.state.retryCount + 1,
      isRecovering: false
    });
    
    // Force component to re-mount by triggering a re-render
    setTimeout(() => {
      this.forceUpdate();
    }, 0);
  };

  handleFallbackMode = () => {
    // Switch to fallback rendering mode
    if (this.props.onFallbackMode) {
      this.props.onFallbackMode();
    }
    
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
  };

  render() {
    if (this.state.hasError) {
      return (
        <WaveformFallbackUI
          error={this.state.error}
          errorInfo={this.state.errorInfo}
          retryCount={this.state.retryCount}
          isRecovering={this.state.isRecovering}
          onRetry={this.handleManualRetry}
          onFallbackMode={this.handleFallbackMode}
          canRetry={this.state.retryCount < 3}
          isTransient={this.isTransientError(this.state.error)}
        />
      );
    }

    return this.props.children;
  }
}

/**
 * Higher-order component wrapper for easier usage
 */
export const withWaveformErrorBoundary = (Component) => {
  return React.forwardRef((props, ref) => (
    <WaveformErrorBoundary>
      <Component {...props} ref={ref} />
    </WaveformErrorBoundary>
  ));
};

export default WaveformErrorBoundary;