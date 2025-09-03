/**
 * @fileoverview Custom hook for managing discovery history
 * Provides React integration for the HistoryService with
 * automatic state management and cleanup.
 */

import { useState, useEffect, useCallback } from 'react';
import historyService from '../services/discovery/HistoryService.js';

/**
 * Custom hook for managing discovery history
 * 
 * Provides automatic history tracking, state management,
 * and cleanup for React components.
 * 
 * Requirements: 5.2, 5.4, 5.5
 */
export function useHistory() {
  const [history, setHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Update history state when service changes
  const handleHistoryChange = useCallback((newHistory) => {
    setHistory(newHistory);
  }, []);

  // Initialize history and set up listener
  useEffect(() => {
    // Load initial history
    const initialHistory = historyService.getHistory();
    setHistory(initialHistory);

    // Add listener for changes
    historyService.addListener(handleHistoryChange);

    // Cleanup listener on unmount
    return () => {
      historyService.removeListener(handleHistoryChange);
    };
  }, [handleHistoryChange]);

  /**
   * Add a sample to history (automatic tracking)
   * @param {Object} sample - Sample to add to history
   */
  const addToHistory = useCallback(async (sample) => {
    try {
      setError(null);
      const success = historyService.addToHistory(sample);
      if (!success) {
        throw new Error('Failed to add sample to history');
      }
    } catch (err) {
      console.error('Error adding to history:', err);
      setError(err.message);
    }
  }, []);

  /**
   * Clear all history with confirmation
   */
  const clearHistory = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const success = await historyService.clearHistory();
      if (!success) {
        throw new Error('Failed to clear history');
      }
    } catch (err) {
      console.error('Error clearing history:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Remove a specific item from history
   * @param {string} sampleId - ID of sample to remove
   */
  const removeFromHistory = useCallback(async (sampleId) => {
    try {
      setError(null);
      const success = historyService.removeFromHistory(sampleId);
      if (!success) {
        throw new Error('Failed to remove item from history');
      }
    } catch (err) {
      console.error('Error removing from history:', err);
      setError(err.message);
    }
  }, []);

  /**
   * Search history by query
   * @param {string} query - Search query
   * @returns {Array} Filtered history items
   */
  const searchHistory = useCallback((query) => {
    try {
      setError(null);
      return historyService.searchHistory(query);
    } catch (err) {
      console.error('Error searching history:', err);
      setError(err.message);
      return [];
    }
  }, []);

  /**
   * Get history statistics
   * @returns {Object} History statistics
   */
  const getHistoryStats = useCallback(() => {
    try {
      setError(null);
      return historyService.getHistoryStats();
    } catch (err) {
      console.error('Error getting history stats:', err);
      setError(err.message);
      return {
        total: 0,
        today: 0,
        thisWeek: 0,
        thisMonth: 0,
        genres: {},
        years: {}
      };
    }
  }, []);

  /**
   * Check if a sample is in history
   * @param {string} sampleId - Sample ID to check
   * @returns {boolean} True if sample is in history
   */
  const isInHistory = useCallback((sampleId) => {
    return historyService.isInHistory(sampleId);
  }, []);

  /**
   * Get last viewed timestamp for a sample
   * @param {string} sampleId - Sample ID
   * @returns {number|null} Timestamp or null if not found
   */
  const getLastViewedTime = useCallback((sampleId) => {
    return historyService.getLastViewedTime(sampleId);
  }, []);

  /**
   * Export history data
   * @returns {Object} Exportable history data
   */
  const exportHistory = useCallback(() => {
    try {
      setError(null);
      return historyService.exportHistory();
    } catch (err) {
      console.error('Error exporting history:', err);
      setError(err.message);
      return null;
    }
  }, []);

  /**
   * Import history data
   * @param {Object} data - History data to import
   * @returns {boolean} True if successfully imported
   */
  const importHistory = useCallback(async (data) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const success = historyService.importHistory(data);
      if (!success) {
        throw new Error('Failed to import history data');
      }
      
      return true;
    } catch (err) {
      console.error('Error importing history:', err);
      setError(err.message);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Cleanup old history entries
   * @param {number} maxAge - Maximum age in milliseconds
   * @returns {number} Number of items removed
   */
  const cleanupOldEntries = useCallback(async (maxAge) => {
    try {
      setError(null);
      return historyService.cleanupOldEntries(maxAge);
    } catch (err) {
      console.error('Error cleaning up history:', err);
      setError(err.message);
      return 0;
    }
  }, []);

  /**
   * Get memory usage information
   * @returns {Object} Memory usage stats
   */
  const getMemoryUsage = useCallback(() => {
    try {
      setError(null);
      return historyService.getMemoryUsage();
    } catch (err) {
      console.error('Error getting memory usage:', err);
      setError(err.message);
      return {
        totalItems: 0,
        maxItems: 100,
        estimatedSizeBytes: 0,
        averageItemSizeBytes: 0,
        utilizationPercent: 0
      };
    }
  }, []);

  return {
    // State
    history,
    isLoading,
    error,
    
    // Actions
    addToHistory,
    clearHistory,
    removeFromHistory,
    searchHistory,
    
    // Utilities
    getHistoryStats,
    isInHistory,
    getLastViewedTime,
    exportHistory,
    importHistory,
    cleanupOldEntries,
    getMemoryUsage
  };
}