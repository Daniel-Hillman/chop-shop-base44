import React, { useState } from 'react';
import { WaveformErrorBoundary } from './WaveformErrorBoundary';
import { useWaveformErrorRecovery } from '../../hooks/useWaveformErrorRecovery';

/**
 * Demo component showcasing waveform error handling capabilities
 */

// Component that can simulate different error types
const ErrorSimulator = ({ errorType, shouldThrow }) => {
  if (shouldThrow) {
    switch (errorType) {
      case 'canvas':
        throw new Error('Canvas context initialization failed');
      case 'audio':
        throw new Error('Web Audio API access denied');
      case 'memory':
        throw new Error('Insufficient memory for waveform buffer allocation');
      case 'network':
        throw new Error('Network timeout while fetching audio data');
      case 'generic':
        throw new Error('Unexpected waveform processing error');
      default:
        throw new Error('Unknown error occurred');
    }
  }
  
  return (
    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
      <div className="flex items-center space-x-2">
        <div className="w-3 h-3 bg-green-500 rounded-full"></div>
        <span className="text-green-800 font-medium">Waveform Active</span>
      </div>
      <div className="mt-2 text-sm text-green-600">
        Waveform visualization is working normally
      </div>
    </div>
  );
};

// Hook demo component
const ErrorRecoveryHookDemo = () => {
  const {
    error,
    isRecovering,
    retryCount,
    fallbackMode,
    systemHealth,
    handleError,
    retry,
    resetError,
    enableFallbackMode,
    getErrorStats,
    isRecoverable,
    canRetry
  } = useWaveformErrorRecovery({
    maxRetries: 3,
    retryDelay: 1000,
    onError: (error, record) => console.log('Error occurred:', error, record),
    onRecovery: (error, count) => console.log('Recovery successful:', error, count)
  });

  const simulateError = (type) => {
    const errors = {
      canvas: new Error('Canvas rendering failed'),
      audio: new Error('Audio context suspended'),
      memory: new Error('Out of memory'),
      network: new Error('Connection timeout')
    };
    
    handleError(errors[type] || new Error('Generic error'));
  };

  const stats = getErrorStats();

  return (
    <div className="space-y-4">
      <div className="bg-white border rounded-lg p-4">
        <h3 className="text-lg font-semibold mb-3">Error Recovery Hook Demo</h3>
        
        {/* Status Display */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium">System Health:</span>
              <span className={`px-2 py-1 rounded text-xs ${
                systemHealth ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}>
                {systemHealth ? 'Healthy' : 'Degraded'}
              </span>
            </div>
            
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium">Retry Count:</span>
              <span className="text-sm">{retryCount}</span>
            </div>
            
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium">Fallback Mode:</span>
              <span className={`px-2 py-1 rounded text-xs ${
                fallbackMode ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'
              }`}>
                {fallbackMode ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="text-sm">
              <span className="font-medium">Total Errors:</span> {stats.totalErrors || 0}
            </div>
            <div className="text-sm">
              <span className="font-medium">Recent Errors:</span> {stats.recentErrors || 0}
            </div>
            <div className="text-sm">
              <span className="font-medium">Can Retry:</span> {canRetry ? 'Yes' : 'No'}
            </div>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
            <div className="flex items-center space-x-2 mb-2">
              <span className="text-red-800 font-medium">Current Error:</span>
              {isRecovering && (
                <span className="text-blue-600 text-sm">Recovering...</span>
              )}
            </div>
            <div className="text-sm text-red-600">{error.message}</div>
            <div className="text-xs text-red-500 mt-1">
              Recoverable: {isRecoverable() ? 'Yes' : 'No'}
            </div>
          </div>
        )}

        {/* Control Buttons */}
        <div className="space-y-3">
          <div>
            <h4 className="text-sm font-medium mb-2">Simulate Errors:</h4>
            <div className="flex flex-wrap gap-2">
              {['canvas', 'audio', 'memory', 'network'].map(type => (
                <button
                  key={type}
                  onClick={() => simulateError(type)}
                  className="px-3 py-1 bg-red-100 text-red-700 rounded text-sm hover:bg-red-200"
                >
                  {type.charAt(0).toUpperCase() + type.slice(1)} Error
                </button>
              ))}
            </div>
          </div>
          
          <div>
            <h4 className="text-sm font-medium mb-2">Recovery Actions:</h4>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={retry}
                disabled={!canRetry || !error}
                className="px-3 py-1 bg-blue-100 text-blue-700 rounded text-sm hover:bg-blue-200 disabled:opacity-50"
              >
                Retry
              </button>
              <button
                onClick={enableFallbackMode}
                className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded text-sm hover:bg-yellow-200"
              >
                Fallback Mode
              </button>
              <button
                onClick={resetError}
                className="px-3 py-1 bg-gray-100 text-gray-700 rounded text-sm hover:bg-gray-200"
              >
                Reset
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Main demo component
export const WaveformErrorHandlingDemo = () => {
  const [errorType, setErrorType] = useState('');
  const [shouldThrow, setShouldThrow] = useState(false);
  const [fallbackMode, setFallbackMode] = useState(false);

  const triggerError = (type) => {
    setErrorType(type);
    setShouldThrow(true);
    setFallbackMode(false);
  };

  const handleFallbackMode = () => {
    setFallbackMode(true);
    setShouldThrow(false);
  };

  const resetDemo = () => {
    setErrorType('');
    setShouldThrow(false);
    setFallbackMode(false);
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Waveform Error Handling Demo
        </h1>
        <p className="text-gray-600">
          Comprehensive error handling and recovery for waveform visualization
        </p>
      </div>

      {/* Error Boundary Demo */}
      <div className="bg-white border rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Error Boundary Demo</h2>
        
        <div className="mb-4">
          <h3 className="text-sm font-medium mb-2">Trigger Error Types:</h3>
          <div className="flex flex-wrap gap-2 mb-4">
            {[
              { type: 'canvas', label: 'Canvas Error', desc: 'Graphics initialization failure' },
              { type: 'audio', label: 'Audio Error', desc: 'Web Audio API access denied' },
              { type: 'memory', label: 'Memory Error', desc: 'Insufficient memory' },
              { type: 'network', label: 'Network Error', desc: 'Connection timeout' },
              { type: 'generic', label: 'Generic Error', desc: 'Unknown error type' }
            ].map(({ type, label, desc }) => (
              <button
                key={type}
                onClick={() => triggerError(type)}
                className="px-3 py-2 bg-red-100 text-red-700 rounded hover:bg-red-200 text-sm"
                title={desc}
              >
                {label}
              </button>
            ))}
            <button
              onClick={resetDemo}
              className="px-3 py-2 bg-green-100 text-green-700 rounded hover:bg-green-200 text-sm"
            >
              Reset Demo
            </button>
          </div>
        </div>

        {/* Waveform Component with Error Boundary */}
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 min-h-[200px]">
          <WaveformErrorBoundary onFallbackMode={handleFallbackMode}>
            {fallbackMode ? (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                  <span className="text-yellow-800 font-medium">Fallback Mode Active</span>
                </div>
                <div className="mt-2 text-sm text-yellow-600">
                  Using simplified waveform display for maximum compatibility
                </div>
              </div>
            ) : (
              <ErrorSimulator errorType={errorType} shouldThrow={shouldThrow} />
            )}
          </WaveformErrorBoundary>
        </div>
      </div>

      {/* Hook Demo */}
      <ErrorRecoveryHookDemo />

      {/* Feature Overview */}
      <div className="bg-gray-50 rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Error Handling Features</h2>
        
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h3 className="font-medium mb-2">Error Detection & Classification</h3>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Canvas context errors</li>
              <li>• Web Audio API failures</li>
              <li>• Memory allocation issues</li>
              <li>• Network connectivity problems</li>
              <li>• Generic error handling</li>
            </ul>
          </div>
          
          <div>
            <h3 className="font-medium mb-2">Recovery Strategies</h3>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Automatic retry with backoff</li>
              <li>• Context recreation and cleanup</li>
              <li>• Memory management and GC</li>
              <li>• Fallback mode activation</li>
              <li>• User-friendly error messages</li>
            </ul>
          </div>
          
          <div>
            <h3 className="font-medium mb-2">User Experience</h3>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Clear error explanations</li>
              <li>• Suggested recovery actions</li>
              <li>• Technical details on demand</li>
              <li>• Graceful degradation</li>
              <li>• Seamless fallback modes</li>
            </ul>
          </div>
          
          <div>
            <h3 className="font-medium mb-2">System Monitoring</h3>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Error statistics tracking</li>
              <li>• System health monitoring</li>
              <li>• Recovery success rates</li>
              <li>• Performance impact analysis</li>
              <li>• Debugging information</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WaveformErrorHandlingDemo;