/**
 * @fileoverview Sample loading indicator component for the sequencer
 * Shows loading progress, errors, and completion status for sample preloading
 */

import React from 'react';

/**
 * Sample loading indicator component
 * @param {Object} props - Component props
 * @param {Object} props.loadingState - Loading state from useSequencerSamplePreloader
 * @param {Object} props.preloadingStats - Preloading statistics
 * @param {Function} props.onRetry - Retry callback for failed loads
 * @param {string} props.className - Additional CSS classes
 * @returns {JSX.Element} Sample loading indicator
 */
export function SampleLoadingIndicator({ 
  loadingState, 
  preloadingStats, 
  onRetry, 
  className = '' 
}) {
  const {
    isLoading,
    progress,
    total,
    loaded,
    failed,
    errors,
    isComplete
  } = loadingState;

  if (!isLoading && !isComplete) {
    return null;
  }

  return (
    <div className={`sample-loading-indicator ${className}`}>
      {/* Loading Progress */}
      {isLoading && (
        <div className="loading-section">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-white">
              Loading Samples...
            </span>
            <span className="text-xs text-gray-400">
              {loaded}/{total}
            </span>
          </div>
          
          {/* Progress Bar */}
          <div className="w-full bg-gray-700 rounded-full h-2 mb-2">
            <div 
              className="bg-cyan-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          
          <div className="text-xs text-gray-400">
            {progress.toFixed(1)}% complete
          </div>
        </div>
      )}

      {/* Completion Status */}
      {isComplete && (
        <div className="completion-section">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-white">
              Sample Loading Complete
            </span>
            <div className="flex items-center space-x-2">
              {loaded > 0 && (
                <span className="text-xs text-green-400">
                  ✓ {loaded} loaded
                </span>
              )}
              {failed > 0 && (
                <span className="text-xs text-yellow-400">
                  ⚠ {failed} fallbacks
                </span>
              )}
            </div>
          </div>

          {/* Statistics */}
          <div className="grid grid-cols-3 gap-2 text-xs text-gray-400">
            <div>
              <div className="font-medium text-white">{preloadingStats.total}</div>
              <div>Total</div>
            </div>
            <div>
              <div className="font-medium text-green-400">{preloadingStats.preloaded}</div>
              <div>Preloaded</div>
            </div>
            <div>
              <div className="font-medium text-yellow-400">{preloadingStats.fallbacks}</div>
              <div>Fallbacks</div>
            </div>
          </div>
        </div>
      )}

      {/* Error Details */}
      {errors.length > 0 && (
        <div className="error-section mt-3">
          <div className="text-xs text-yellow-400 mb-2">
            Some samples failed to load and were replaced with fallbacks:
          </div>
          <div className="max-h-20 overflow-y-auto space-y-1">
            {errors.slice(0, 5).map((error, index) => (
              <div key={index} className="text-xs text-gray-400 truncate">
                • {error.sampleId}: {error.error}
              </div>
            ))}
            {errors.length > 5 && (
              <div className="text-xs text-gray-500">
                ... and {errors.length - 5} more
              </div>
            )}
          </div>
          
          {onRetry && (
            <button
              onClick={onRetry}
              className="mt-2 px-3 py-1 text-xs bg-yellow-600 hover:bg-yellow-700 
                         text-white rounded transition-colors"
            >
              Retry Failed Samples
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Compact sample loading indicator for smaller spaces
 */
export function CompactSampleLoadingIndicator({ loadingState, className = '' }) {
  const { isLoading, progress, failed } = loadingState;

  if (!isLoading && failed === 0) {
    return null;
  }

  return (
    <div className={`compact-loading-indicator flex items-center space-x-2 ${className}`}>
      {isLoading && (
        <>
          <div className="w-4 h-4 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-gray-400">
            Loading samples... {progress.toFixed(0)}%
          </span>
        </>
      )}
      
      {!isLoading && failed > 0 && (
        <>
          <div className="w-2 h-2 bg-yellow-400 rounded-full" />
          <span className="text-xs text-yellow-400">
            {failed} fallback samples
          </span>
        </>
      )}
    </div>
  );
}

export default SampleLoadingIndicator;