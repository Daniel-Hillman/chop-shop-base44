/**
 * @fileoverview FavoritesService for managing favorite samples
 * Provides local storage persistence with in-memory fallback for error scenarios
 */

import { validateSampleData } from '../../types/discovery.js';

/**
 * Service for managing favorite samples with local storage persistence
 */
export class FavoritesService {
  constructor() {
    this.storageKey = 'sampleDiscovery';
    this.favoritesKey = 'favorites';
    this.inMemoryFavorites = [];
    this.useInMemoryFallback = false;
    this.maxFavorites = 100; // Prevent excessive storage usage
    
    // Test storage availability on initialization
    this._testStorageAvailability();
  }

  /**
   * Test if localStorage is available and working
   * @private
   */
  _testStorageAvailability() {
    try {
      const testKey = '__storage_test__';
      localStorage.setItem(testKey, 'test');
      localStorage.removeItem(testKey);
      this.useInMemoryFallback = false;
    } catch (error) {
      console.warn('localStorage not available, using in-memory fallback:', error);
      this.useInMemoryFallback = true;
    }
  }

  /**
   * Get the storage data object
   * @private
   * @returns {Object} Storage data object
   */
  _getStorageData() {
    if (this.useInMemoryFallback) {
      return { [this.favoritesKey]: this.inMemoryFavorites };
    }

    try {
      const data = localStorage.getItem(this.storageKey);
      return data ? JSON.parse(data) : {};
    } catch (error) {
      console.error('Error reading from localStorage:', error);
      this.useInMemoryFallback = true;
      return { [this.favoritesKey]: this.inMemoryFavorites };
    }
  }

  /**
   * Save storage data
   * @private
   * @param {Object} data - Data to save
   */
  _saveStorageData(data) {
    if (this.useInMemoryFallback) {
      this.inMemoryFavorites = data[this.favoritesKey] || [];
      return;
    }

    try {
      localStorage.setItem(this.storageKey, JSON.stringify(data));
    } catch (error) {
      console.error('Error saving to localStorage:', error);
      // Fall back to in-memory storage
      this.useInMemoryFallback = true;
      this.inMemoryFavorites = data[this.favoritesKey] || [];
      throw new Error('Storage failed, using in-memory fallback');
    }
  }

  /**
   * Get all favorite samples
   * @returns {Promise<import('../../types/discovery.js').SampleData[]>} Array of favorite samples
   */
  async getFavorites() {
    try {
      const data = this._getStorageData();
      const favorites = data[this.favoritesKey] || [];
      
      // Validate and filter out invalid favorites
      const validFavorites = favorites.filter(favorite => {
        const validation = validateSampleData(favorite);
        if (!validation.isValid) {
          console.warn('Invalid favorite sample found:', favorite, validation.errors);
          return false;
        }
        return true;
      });

      // If we filtered out invalid favorites, save the cleaned list
      if (validFavorites.length !== favorites.length) {
        await this._saveFavorites(validFavorites);
      }

      return validFavorites;
    } catch (error) {
      console.error('Error getting favorites:', error);
      return [];
    }
  }

  /**
   * Add a sample to favorites
   * @param {import('../../types/discovery.js').SampleData} sample - Sample to add to favorites
   * @returns {Promise<boolean>} True if successfully added, false otherwise
   */
  async addFavorite(sample) {
    try {
      // Validate sample data
      const validation = validateSampleData(sample);
      if (!validation.isValid) {
        throw new Error(`Invalid sample data: ${validation.errors.join(', ')}`);
      }

      const favorites = await this.getFavorites();
      
      // Check if already favorited
      if (favorites.some(fav => fav.id === sample.id)) {
        return true; // Already favorited, consider it successful
      }

      // Check favorites limit
      if (favorites.length >= this.maxFavorites) {
        throw new Error(`Maximum favorites limit (${this.maxFavorites}) reached`);
      }

      // Add to favorites with timestamp
      const favoriteWithTimestamp = {
        ...sample,
        favoritedAt: new Date().toISOString()
      };

      const updatedFavorites = [...favorites, favoriteWithTimestamp];
      await this._saveFavorites(updatedFavorites);
      
      return true;
    } catch (error) {
      console.error('Error adding favorite:', error);
      throw error;
    }
  }

  /**
   * Remove a sample from favorites
   * @param {string} sampleId - ID of sample to remove from favorites
   * @returns {Promise<boolean>} True if successfully removed, false otherwise
   */
  async removeFavorite(sampleId) {
    try {
      if (!sampleId || typeof sampleId !== 'string') {
        throw new Error('Invalid sample ID');
      }

      const favorites = await this.getFavorites();
      const updatedFavorites = favorites.filter(fav => fav.id !== sampleId);
      
      // Only save if something was actually removed
      if (updatedFavorites.length !== favorites.length) {
        await this._saveFavorites(updatedFavorites);
      }
      
      return true;
    } catch (error) {
      console.error('Error removing favorite:', error);
      throw error;
    }
  }

  /**
   * Check if a sample is favorited
   * @param {string} sampleId - ID of sample to check
   * @returns {Promise<boolean>} True if sample is favorited
   */
  async isFavorite(sampleId) {
    try {
      if (!sampleId || typeof sampleId !== 'string') {
        return false;
      }

      const favorites = await this.getFavorites();
      return favorites.some(fav => fav.id === sampleId);
    } catch (error) {
      console.error('Error checking favorite status:', error);
      return false;
    }
  }

  /**
   * Clear all favorites
   * @returns {Promise<boolean>} True if successfully cleared
   */
  async clearFavorites() {
    try {
      await this._saveFavorites([]);
      return true;
    } catch (error) {
      console.error('Error clearing favorites:', error);
      throw error;
    }
  }

  /**
   * Get favorites count
   * @returns {Promise<number>} Number of favorites
   */
  async getFavoritesCount() {
    try {
      const favorites = await this.getFavorites();
      return favorites.length;
    } catch (error) {
      console.error('Error getting favorites count:', error);
      return 0;
    }
  }

  /**
   * Export favorites as JSON
   * @returns {Promise<string>} JSON string of favorites
   */
  async exportFavorites() {
    try {
      const favorites = await this.getFavorites();
      return JSON.stringify(favorites, null, 2);
    } catch (error) {
      console.error('Error exporting favorites:', error);
      throw error;
    }
  }

  /**
   * Import favorites from JSON
   * @param {string} jsonString - JSON string of favorites to import
   * @param {boolean} [merge=false] - Whether to merge with existing favorites or replace
   * @returns {Promise<number>} Number of favorites imported
   */
  async importFavorites(jsonString, merge = false) {
    try {
      const importedFavorites = JSON.parse(jsonString);
      
      if (!Array.isArray(importedFavorites)) {
        throw new Error('Invalid favorites data: must be an array');
      }

      // Validate all imported favorites
      const validFavorites = importedFavorites.filter(favorite => {
        const validation = validateSampleData(favorite);
        if (!validation.isValid) {
          console.warn('Invalid favorite in import:', favorite, validation.errors);
          return false;
        }
        return true;
      });

      if (validFavorites.length === 0) {
        throw new Error('No valid favorites found in import data');
      }

      let finalFavorites;
      if (merge) {
        const existingFavorites = await this.getFavorites();
        const existingIds = new Set(existingFavorites.map(fav => fav.id));
        const newFavorites = validFavorites.filter(fav => !existingIds.has(fav.id));
        finalFavorites = [...existingFavorites, ...newFavorites];
      } else {
        finalFavorites = validFavorites;
      }

      // Check favorites limit
      if (finalFavorites.length > this.maxFavorites) {
        finalFavorites = finalFavorites.slice(0, this.maxFavorites);
        console.warn(`Favorites truncated to ${this.maxFavorites} items`);
      }

      await this._saveFavorites(finalFavorites);
      return validFavorites.length;
    } catch (error) {
      console.error('Error importing favorites:', error);
      throw error;
    }
  }

  /**
   * Get storage status information
   * @returns {Object} Storage status information
   */
  getStorageStatus() {
    return {
      isUsingInMemoryFallback: this.useInMemoryFallback,
      storageType: this.useInMemoryFallback ? 'memory' : 'localStorage',
      maxFavorites: this.maxFavorites
    };
  }

  /**
   * Save favorites to storage
   * @private
   * @param {import('../../types/discovery.js').SampleData[]} favorites - Favorites to save
   */
  async _saveFavorites(favorites) {
    const data = this._getStorageData();
    data[this.favoritesKey] = favorites;
    this._saveStorageData(data);
  }
}

// Create and export a singleton instance
export const favoritesService = new FavoritesService();
export default favoritesService;