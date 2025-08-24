import { useState, useCallback, useRef } from 'react';
import errorRecoveryService from '../services/ErrorRecoveryService.js';

/**
 * Hook for managing error recovery and retry logic
 * Integrates with ErrorRecoveryService for intelligent error handling
 */
export function useErrorRecovery(operationId) {
  const [error, setError] = useState(null);
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [lastAttempt, setLastAttempt] = useState(null);
  
  const operationIdRef = useRef(operationId || `operation_${Date.now()}_${Math.random()}`);

  /**
   * Execute an operation with automatic retry logic
   */
  const executeWithRetry = useCallback(async (operation, options = {}) => {
    const {
      maxRetries = 3,
      onProgress = null,
      onRetry = null,
      context = {}
    } = options;

    setError(null);
    setIsRetrying(false);
    setRetryCount(0);
    setLastAttempt(Date.now());

    try {
      const result = await errorRecoveryService.executeWithRetry(
        operation,
        operationIdRef.current,
        {
          maxRetries,
          onProgress: (progressData) => {
            if (progressData.status === 'retrying' || progressData.status === 'waiting_retry') {
              setIsRetrying(true);
              setRetryCount(progressData.attempt - 1);
            } else if (progressData.status === 'starting') {
              setIsRetrying(false);
            }
            
            if (onProgress) {
              onProgress(progressData);
            }
          },
          onRetry: (retryData) => {
            setRetryCount(retryData.attempt - 1);
            setLastAttempt(Date.now());
            
            if (onRetry) {
              onRetry(retryData);
            }
          },
          context
        }
      );

      setIsRetrying(false);
      setError(null);
      return result;

    } catch (error) {
      setIsRetrying(false);
      setError(error);
      throw error;
    }
  }, []);

  /**
   * Manual retry function
   */
  const retry = useCallback(async (operation, options = {}) => {
    if (!operation) {
      throw new Error('Operation function is required for retry');
    }

    return executeWithRetry(operation, options);
  }, [executeWithRetry]);

  /**
   * Reset error state
   */
  const reset = useCallback(() => {
    setError(null);
    setIsRetrying(false);
    setRetryCount(0);
    setLastAttempt(null);
  }, []);

  /**
   * Check if an error should be retried
   */
  const shouldRetry = useCallback((error) => {
    return errorRecoveryService.shouldRetry(error, operationIdRef.current);
  }, []);

  /**
   * Get user-friendly error information
   */
  const getUserFriendlyError = useCallback((error) => {
    return errorRecoveryService.getUserFriendlyError(error || error);
  }, []);

  /**
   * Get error classification
   */
  const classifyError = useCallback((error) => {
    return errorRecoveryService.classifyError(error || error);
  }, []);

  return {
    // State
    error,
    isRetrying,
    retryCount,
    lastAttempt,
    
    // Actions
    executeWithRetry,
    retry,
    reset,
    
    // Utilities
    shouldRetry,
    getUserFriendlyError,
    classifyError,
    
    // Service stats
    getStats: () => errorRecoveryService.getErrorStats()
  };
}

/**
 * Hook for handling audio-specific errors
 */
export function useAudioErrorRecovery() {
  const baseRecovery = useErrorRecovery('audio_processing');
  
  const executeAudioOperation = useCallback(async (operation, options = {}) => {
    return baseRecovery.executeWithRetry(operation, {
      ...options,
      context: { type: 'audio', ...options.context }
    });
  }, [baseRecovery]);

  const getAudioErrorGuidance = useCallback((error) => {
    const friendlyError = baseRecovery.getUserFriendlyError(error);
    const classification = baseRecovery.classifyError(error);
    
    // Add audio-specific guidance
    if (classification.category === 'audio') {
      return {
        ...friendlyError,
        suggestions: [
          'Check if the video has audio content',
          'Try a different YouTube video',
          'Ensure your browser supports Web Audio API',
          ...friendlyError.suggestions
        ]
      };
    }
    
    return friendlyError;
  }, [baseRecovery]);

  return {
    ...baseRecovery,
    executeAudioOperation,
    getAudioErrorGuidance
  };
}

/**
 * Hook for handling video player errors
 */
export function useVideoErrorRecovery() {
  const baseRecovery = useErrorRecovery('video_player');
  
  const executeVideoOperation = useCallback(async (operation, options = {}) => {
    return baseRecovery.executeWithRetry(operation, {
      ...options,
      context: { type: 'video', ...options.context }
    });
  }, [baseRecovery]);

  const getVideoErrorGuidance = useCallback((error) => {
    const friendlyError = baseRecovery.getUserFriendlyError(error);
    const classification = baseRecovery.classifyError(error);
    
    // Add video-specific guidance
    if (classification.category === 'video') {
      return {
        ...friendlyError,
        suggestions: [
          'Check if the YouTube URL is valid',
          'Ensure the video is public and available',
          'Try refreshing the page',
          ...friendlyError.suggestions
        ]
      };
    }
    
    return friendlyError;
  }, [baseRecovery]);

  return {
    ...baseRecovery,
    executeVideoOperation,
    getVideoErrorGuidance
  };
}

/**
 * Hook for handling sample playback errors
 */
export function useSampleErrorRecovery() {
  const baseRecovery = useErrorRecovery('sample_playback');
  
  const executeSampleOperation = useCallback(async (operation, options = {}) => {
    return baseRecovery.executeWithRetry(operation, {
      ...options,
      context: { type: 'sample', ...options.context }
    });
  }, [baseRecovery]);

  const getSampleErrorGuidance = useCallback((error) => {
    const friendlyError = baseRecovery.getUserFriendlyError(error);
    const classification = baseRecovery.classifyError(error);
    
    // Add sample-specific guidance
    const sampleSuggestions = [
      'Try creating the sample at a different timestamp',
      'Ensure the audio is fully loaded before creating samples',
      'Check that the video is playing when creating samples'
    ];
    
    return {
      ...friendlyError,
      suggestions: [...sampleSuggestions, ...friendlyError.suggestions]
    };
  }, [baseRecovery]);

  return {
    ...baseRecovery,
    executeSampleOperation,
    getSampleErrorGuidance
  };
}