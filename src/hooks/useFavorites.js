/**
 * @fileoverview Custom hook for managing favorite samples
 * Provides state management and error handling for favorites functionality
 */

import { useState, useEffect, useCallback } from 'react';
import { favoritesService } from '../services/discovery/FavoritesService.js';

/**
 * Custom hook for managing favorite samples
 * @returns {Object} Favorites state and management functions
 */
export function useFavorites() {
  const [favorites, setFavorites] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [storageStatus, setStorageStatus] = useState(null);

  // Load favorites on mount
  useEffect(() => {
    loadFavorites();
    setStorageStatus(favoritesService.getStorageStatus());
  }, []);

  /**
   * Load favorites from storage
   */
  const loadFavorites = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const loadedFavorites = await favoritesService.getFavorites();
      setFavorites(loadedFavorites);
    } catch (err) {
      console.error('Error loading favorites:', err);
      setError('Failed to load favorites');
      setFavorites([]); // Fallback to empty array
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Add a sample to favorites
   * @param {import('../types/discovery.js').SampleData} sample - Sample to add
   * @returns {Promise<boolean>} Success status
   */
  const addFavorite = useCallback(async (sample) => {
    try {
      setError(null);
      const success = await favoritesService.addFavorite(sample);
      
      if (success) {
        // Update local state immediately for better UX
        setFavorites(prev => {
          // Check if already exists to avoid duplicates
          if (prev.some(fav => fav.id === sample.id)) {
            return prev;
          }
          return [...prev, { ...sample, favoritedAt: new Date().toISOString() }];
        });
      }
      
      return success;
    } catch (err) {
      console.error('Error adding favorite:', err);
      setError(err.message || 'Failed to add favorite');
      return false;
    }
  }, []);

  /**
   * Remove a sample from favorites
   * @param {string} sampleId - ID of sample to remove
   * @returns {Promise<boolean>} Success status
   */
  const removeFavorite = useCallback(async (sampleId) => {
    try {
      setError(null);
      const success = await favoritesService.removeFavorite(sampleId);
      
      if (success) {
        // Update local state immediately for better UX
        setFavorites(prev => prev.filter(fav => fav.id !== sampleId));
      }
      
      return success;
    } catch (err) {
      console.error('Error removing favorite:', err);
      setError(err.message || 'Failed to remove favorite');
      return false;
    }
  }, []);

  /**
   * Toggle favorite status of a sample
   * @param {import('../types/discovery.js').SampleData} sample - Sample to toggle
   * @returns {Promise<boolean>} New favorite status
   */
  const toggleFavorite = useCallback(async (sample) => {
    try {
      const isFav = await isFavorite(sample.id);
      
      if (isFav) {
        await removeFavorite(sample.id);
        return false;
      } else {
        await addFavorite(sample);
        return true;
      }
    } catch (err) {
      console.error('Error toggling favorite:', err);
      setError(err.message || 'Failed to toggle favorite');
      return await isFavorite(sample.id); // Return current status on error
    }
  }, [addFavorite, removeFavorite]);

  /**
   * Check if a sample is favorited
   * @param {string} sampleId - ID of sample to check
   * @returns {Promise<boolean>} Favorite status
   */
  const isFavorite = useCallback(async (sampleId) => {
    try {
      // Check local state first for better performance
      const localFavorite = favorites.some(fav => fav.id === sampleId);
      if (localFavorite) {
        return true;
      }
      
      // Fallback to service check
      return await favoritesService.isFavorite(sampleId);
    } catch (err) {
      console.error('Error checking favorite status:', err);
      return false;
    }
  }, [favorites]);

  /**
   * Clear all favorites
   * @returns {Promise<boolean>} Success status
   */
  const clearFavorites = useCallback(async () => {
    try {
      setError(null);
      const success = await favoritesService.clearFavorites();
      
      if (success) {
        setFavorites([]);
      }
      
      return success;
    } catch (err) {
      console.error('Error clearing favorites:', err);
      setError(err.message || 'Failed to clear favorites');
      return false;
    }
  }, []);

  /**
   * Export favorites as JSON
   * @returns {Promise<string|null>} JSON string or null on error
   */
  const exportFavorites = useCallback(async () => {
    try {
      setError(null);
      return await favoritesService.exportFavorites();
    } catch (err) {
      console.error('Error exporting favorites:', err);
      setError(err.message || 'Failed to export favorites');
      return null;
    }
  }, []);

  /**
   * Import favorites from JSON
   * @param {string} jsonString - JSON string of favorites
   * @param {boolean} merge - Whether to merge with existing favorites
   * @returns {Promise<number>} Number of imported favorites
   */
  const importFavorites = useCallback(async (jsonString, merge = false) => {
    try {
      setError(null);
      const importedCount = await favoritesService.importFavorites(jsonString, merge);
      
      // Reload favorites to reflect changes
      await loadFavorites();
      
      return importedCount;
    } catch (err) {
      console.error('Error importing favorites:', err);
      setError(err.message || 'Failed to import favorites');
      return 0;
    }
  }, [loadFavorites]);

  /**
   * Refresh favorites from storage
   */
  const refreshFavorites = useCallback(async () => {
    await loadFavorites();
  }, [loadFavorites]);

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Computed values
  const favoritesCount = favorites.length;
  const hasFavorites = favoritesCount > 0;
  const isStorageAvailable = storageStatus && !storageStatus.isUsingInMemoryFallback;

  return {
    // State
    favorites,
    isLoading,
    error,
    storageStatus,
    
    // Computed values
    favoritesCount,
    hasFavorites,
    isStorageAvailable,
    
    // Actions
    addFavorite,
    removeFavorite,
    toggleFavorite,
    isFavorite,
    clearFavorites,
    exportFavorites,
    importFavorites,
    refreshFavorites,
    clearError
  };
}

export default useFavorites;