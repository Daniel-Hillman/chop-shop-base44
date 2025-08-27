/**
 * @fileoverview Hook for managing sample preloading in the sequencer
 * Provides loading states, progress tracking, and error handling for sample preloading
 */

import { useState, useEffect, useCallback } from 'react';

/**
 * Hook for managing sequencer sample preloading
 * @param {import('../services/sequencer/SampleManager.js').SampleManager} sampleManager - Sample manager instance
 * @returns {Object} Preloading state and controls
 */
export function useSequencerSamplePreloader(sampleManager) {
  const [loadingState, setLoadingState] = useState({
    isLoading: false,
    progress: 0,
    total: 0,
    loaded: 0,
    failed: 0,
    errors: [],
    isComplete: false
  });

  const [preloadingStats, setPreloadingStats] = useState({
    total: 0,
    preloaded: 0,
    fallbacks: 0,
    percentage: 0
  });

  /**
   * Update preloading statistics
   */
  const updateStats = useCallback(() => {
    if (sampleManager) {
      const stats = sampleManager.getPreloadingStats();
      setPreloadingStats(stats);
    }
  }, [sampleManager]);

  /**
   * Progress callback for preloading
   */
  const handleProgress = useCallback((loaded, total) => {
    setLoadingState(prev => ({
      ...prev,
      loaded,
      total,
      progress: total > 0 ? (loaded / total) * 100 : 0
    }));
  }, []);

  /**
   * Preload a specific sample pack
   * @param {string} packId - Sample pack ID to preload
   * @returns {Promise<Object>} Preloading results
   */
  const preloadSamplePack = useCallback(async (packId) => {
    if (!sampleManager) {
      throw new Error('SampleManager not available');
    }

    setLoadingState(prev => ({
      ...prev,
      isLoading: true,
      progress: 0,
      loaded: 0,
      failed: 0,
      errors: [],
      isComplete: false
    }));

    try {
      // First load the sample pack
      await sampleManager.loadSamplePack(packId);
      
      // Then preload all samples with progress tracking
      const results = await sampleManager.preloadAllSamples(handleProgress);
      
      setLoadingState(prev => ({
        ...prev,
        isLoading: false,
        failed: results.failed,
        errors: results.errors,
        isComplete: true
      }));

      updateStats();
      return results;
    } catch (error) {
      setLoadingState(prev => ({
        ...prev,
        isLoading: false,
        errors: [...prev.errors, { error: error.message }],
        isComplete: true
      }));
      throw error;
    }
  }, [sampleManager, handleProgress, updateStats]);

  /**
   * Preload specific samples
   * @param {string[]} sampleIds - Array of sample IDs to preload
   * @returns {Promise<Object>} Preloading results
   */
  const preloadSamples = useCallback(async (sampleIds) => {
    if (!sampleManager) {
      throw new Error('SampleManager not available');
    }

    setLoadingState(prev => ({
      ...prev,
      isLoading: true,
      progress: 0,
      loaded: 0,
      failed: 0,
      errors: [],
      isComplete: false
    }));

    try {
      const results = await sampleManager.preloadSamples(sampleIds, handleProgress);
      
      setLoadingState(prev => ({
        ...prev,
        isLoading: false,
        failed: results.failed,
        errors: results.errors,
        isComplete: true
      }));

      updateStats();
      return results;
    } catch (error) {
      setLoadingState(prev => ({
        ...prev,
        isLoading: false,
        errors: [...prev.errors, { error: error.message }],
        isComplete: true
      }));
      throw error;
    }
  }, [sampleManager, handleProgress, updateStats]);

  /**
   * Reset loading state
   */
  const resetLoadingState = useCallback(() => {
    setLoadingState({
      isLoading: false,
      progress: 0,
      total: 0,
      loaded: 0,
      failed: 0,
      errors: [],
      isComplete: false
    });
  }, []);

  /**
   * Check if a sample is preloaded
   * @param {string} sampleId - Sample ID to check
   * @returns {boolean} Whether the sample is preloaded
   */
  const isSamplePreloaded = useCallback((sampleId) => {
    return sampleManager ? sampleManager.isSamplePreloaded(sampleId) : false;
  }, [sampleManager]);

  /**
   * Get all available samples
   * @returns {Array} Array of available samples
   */
  const getAvailableSamples = useCallback(() => {
    return sampleManager ? sampleManager.getAllSamples() : [];
  }, [sampleManager]);

  // Update stats when component mounts or sampleManager changes
  useEffect(() => {
    updateStats();
  }, [updateStats]);

  // Update stats periodically while loading - reduced frequency for better performance
  useEffect(() => {
    let interval;
    if (loadingState.isLoading) {
      interval = setInterval(updateStats, 2000); // Reduced from 500ms to 2000ms
    }
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [loadingState.isLoading, updateStats]);

  return {
    // Loading state
    loadingState,
    preloadingStats,
    
    // Actions
    preloadSamplePack,
    preloadSamples,
    resetLoadingState,
    
    // Utilities
    isSamplePreloaded,
    getAvailableSamples,
    
    // Computed values
    isLoading: loadingState.isLoading,
    progress: loadingState.progress,
    hasErrors: loadingState.errors.length > 0,
    isComplete: loadingState.isComplete
  };
}

export default useSequencerSamplePreloader;