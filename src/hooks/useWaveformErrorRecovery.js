import { useState, useEffect, useCallback, useRef } from 'react';
import { WaveformErrorRecoveryService } from '../services/WaveformErrorRecoveryService';

/**
 * Hook for managing waveform error recovery
 * Provides error handling, retry mechanisms, and fallback states
 */
export const useWaveformErrorRecovery = (options = {}) => {
  const {
    maxRetries = 3,
    retryDelay = 1000,
    onError = null,
    onRecovery = null,
    enableAutoRetry = true
  } = options;

  const [error, setError] = useState(null);
  const [isRecovering, setIsRecovering] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [fallbackMode, setFallbackMode] = useState(false);
  const [systemHealth, setSystemHealth] = useState(true);

  const recoveryServiceRef = useRef(null);
  const retryTimeoutRef = useRef(null);

  // Initialize recovery service
  useEffect(() => {
    if (!recoveryServiceRef.current) {
      recoveryServiceRef.current = new WaveformErrorRecoveryService();
    }
  }, []);

  // Monitor system health
  useEffect(() => {
    const checkSystemHealth = () => {
      if (recoveryServiceRef.current) {
        const healthy = recoveryServiceRef.current.isSystemHealthy();
        setSystemHealth(healthy);
      }
    };

    const interval = setInterval(checkSystemHealth, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, []);

  /**
   * Handle error occurrence
   */
  const handleError = useCallback(async (errorData) => {
    const errorRecord = recoveryServiceRef.current?.reportError({
      error: errorData,
      component: 'WaveformVisualization',
      timestamp: Date.now(),
      retryCount
    });

    setError(errorData);
    
    if (onError) {
      onError(errorData, errorRecord);
    }

    // Attempt automatic recovery if enabled
    if (enableAutoRetry && retryCount < maxRetries) {
      await attemptRecovery(errorData);
    }
  }, [retryCount, maxRetries, enableAutoRetry, onError]);

  /**
   * Attempt error recovery
   */
  const attemptRecovery = useCallback(async (errorToRecover = error) => {
    if (!errorToRecover || !recoveryServiceRef.current) {
      return false;
    }

    setIsRecovering(true);

    try {
      // Clear any existing retry timeout
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }

      // Wait for retry delay
      await new Promise(resolve => {
        retryTimeoutRef.current = setTimeout(resolve, retryDelay);
      });

      // Attempt recovery
      await recoveryServiceRef.current.attemptRecovery(errorToRecover);

      // Recovery successful
      setError(null);
      setIsRecovering(false);
      setRetryCount(prev => prev + 1);

      if (onRecovery) {
        onRecovery(errorToRecover, retryCount + 1);
      }

      return true;
    } catch (recoveryError) {
      console.error('Recovery attempt failed:', recoveryError);
      setIsRecovering(false);
      setRetryCount(prev => prev + 1);

      // If we've exhausted retries, suggest fallback mode
      if (retryCount + 1 >= maxRetries) {
        setFallbackMode(true);
      }

      return false;
    }
  }, [error, retryDelay, retryCount, maxRetries, onRecovery]);

  /**
   * Manual retry function
   */
  const retry = useCallback(async () => {
    if (retryCount >= maxRetries) {
      console.warn('Maximum retry attempts reached');
      return false;
    }

    return await attemptRecovery();
  }, [attemptRecovery, retryCount, maxRetries]);

  /**
   * Reset error state
   */
  const resetError = useCallback(() => {
    setError(null);
    setIsRecovering(false);
    setRetryCount(0);
    setFallbackMode(false);
    
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
    }
  }, []);

  /**
   * Enable fallback mode
   */
  const enableFallbackMode = useCallback(() => {
    setFallbackMode(true);
    setError(null);
    setIsRecovering(false);
  }, []);

  /**
   * Get error statistics
   */
  const getErrorStats = useCallback(() => {
    return recoveryServiceRef.current?.getErrorStatistics() || {};
  }, []);

  /**
   * Check if error is recoverable
   */
  const isRecoverable = useCallback((errorToCheck = error) => {
    if (!errorToCheck || !recoveryServiceRef.current) {
      return false;
    }

    const errorType = recoveryServiceRef.current.classifyError(errorToCheck);
    const isTransient = ['network', 'audio', 'canvas'].includes(errorType);
    const hasRetriesLeft = retryCount < maxRetries;

    return isTransient && hasRetriesLeft;
  }, [error, retryCount, maxRetries]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, []);

  return {
    // Error state
    error,
    isRecovering,
    retryCount,
    fallbackMode,
    systemHealth,
    
    // Actions
    handleError,
    retry,
    resetError,
    enableFallbackMode,
    
    // Utilities
    getErrorStats,
    isRecoverable,
    canRetry: retryCount < maxRetries,
    maxRetries
  };
};

export default useWaveformErrorRecovery;