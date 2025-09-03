/**
 * @fileoverview History Service for Sample Discovery
 * Manages automatic history tracking, persistence, and retrieval
 * with error handling and memory management.
 */

import { validateSampleData } from '../../types/discovery.js';

/**
 * HistoryService - Manages discovery history tracking and persistence
 * 
 * Provides automatic history tracking when samples are viewed,
 * local storage persistence, and history management functionality.
 * 
 * Requirements: 5.2, 5.4, 5.5
 */
class HistoryService {
  constructor() {
    this.storageKey = 'sampleDiscovery.history';
    this.maxHistoryItems = 100; // Limit history to prevent memory issues
    this.history = [];
    this.listeners = new Set();
    
    // Load existing history from storage
    this.loadHistory();
  }

  /**
   * Load history from local storage
   * @private
   */
  loadHistory() {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          // Validate each history item
          this.history = parsed
            .filter(item => {
              const validation = validateSampleData(item);
              if (!validation.isValid) {
                console.warn('Invalid history item removed:', validation.errors);
                return false;
              }
              return true;
            })
            .slice(0, this.maxHistoryItems); // Ensure we don't exceed max items
        }
      }
    } catch (error) {
      console.warn('Failed to load history from storage:', error);
      this.history = [];
    }
  }

  /**
   * Save history to local storage
   * @private
   */
  saveHistory() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.history));
    } catch (error) {
      console.warn('Failed to save history to storage:', error);
      // Continue with in-memory history even if storage fails
    }
  }

  /**
   * Add a sample to history when viewed
   * @param {Object} sample - Sample data to add to history
   * @returns {boolean} True if successfully added, false otherwise
   */
  addToHistory(sample) {
    try {
      // Validate sample data
      const validation = validateSampleData(sample);
      if (!validation.isValid) {
        console.warn('Cannot add invalid sample to history:', validation.errors);
        return false;
      }

      // Create history entry with timestamp
      const historyEntry = {
        ...sample,
        viewedAt: Date.now()
      };

      // Remove existing entry if present (to move to top)
      this.history = this.history.filter(item => item.id !== sample.id);

      // Add to beginning of history
      this.history.unshift(historyEntry);

      // Limit history size
      if (this.history.length > this.maxHistoryItems) {
        this.history = this.history.slice(0, this.maxHistoryItems);
      }

      // Save to storage
      this.saveHistory();

      // Notify listeners
      this.notifyListeners();

      return true;
    } catch (error) {
      console.error('Error adding sample to history:', error);
      return false;
    }
  }

  /**
   * Get current history
   * @returns {Array} Array of history items in chronological order (newest first)
   */
  getHistory() {
    return [...this.history];
  }

  /**
   * Clear all history
   * @returns {boolean} True if successfully cleared, false otherwise
   */
  clearHistory() {
    try {
      this.history = [];
      this.saveHistory();
      this.notifyListeners();
      return true;
    } catch (error) {
      console.error('Error clearing history:', error);
      return false;
    }
  }

  /**
   * Remove a specific item from history
   * @param {string} sampleId - ID of sample to remove
   * @returns {boolean} True if successfully removed, false otherwise
   */
  removeFromHistory(sampleId) {
    try {
      const initialLength = this.history.length;
      this.history = this.history.filter(item => item.id !== sampleId);
      
      if (this.history.length !== initialLength) {
        this.saveHistory();
        this.notifyListeners();
        return true;
      }
      
      return false; // Item not found
    } catch (error) {
      console.error('Error removing item from history:', error);
      return false;
    }
  }

  /**
   * Get history statistics
   * @returns {Object} Statistics about history usage
   */
  getHistoryStats() {
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;
    const oneWeek = 7 * oneDay;
    const oneMonth = 30 * oneDay;

    const stats = {
      total: this.history.length,
      today: 0,
      thisWeek: 0,
      thisMonth: 0,
      genres: {},
      years: {},
      oldestEntry: null,
      newestEntry: null
    };

    this.history.forEach(item => {
      const age = now - (item.viewedAt || 0);
      
      if (age <= oneDay) stats.today++;
      if (age <= oneWeek) stats.thisWeek++;
      if (age <= oneMonth) stats.thisMonth++;

      // Genre statistics
      stats.genres[item.genre] = (stats.genres[item.genre] || 0) + 1;

      // Year statistics
      stats.years[item.year] = (stats.years[item.year] || 0) + 1;

      // Oldest/newest entries
      if (!stats.oldestEntry || (item.viewedAt && item.viewedAt < stats.oldestEntry.viewedAt)) {
        stats.oldestEntry = item;
      }
      if (!stats.newestEntry || (item.viewedAt && item.viewedAt > stats.newestEntry.viewedAt)) {
        stats.newestEntry = item;
      }
    });

    return stats;
  }

  /**
   * Search history by title, artist, or genre
   * @param {string} query - Search query
   * @returns {Array} Filtered history items
   */
  searchHistory(query) {
    if (!query || typeof query !== 'string') {
      return this.getHistory();
    }

    const searchTerm = query.toLowerCase().trim();
    
    return this.history.filter(item => {
      return (
        item.title.toLowerCase().includes(searchTerm) ||
        item.artist.toLowerCase().includes(searchTerm) ||
        item.genre.toLowerCase().includes(searchTerm) ||
        (item.tags && item.tags.some(tag => tag.toLowerCase().includes(searchTerm)))
      );
    });
  }

  /**
   * Get history filtered by date range
   * @param {number} startDate - Start timestamp
   * @param {number} endDate - End timestamp
   * @returns {Array} Filtered history items
   */
  getHistoryByDateRange(startDate, endDate) {
    return this.history.filter(item => {
      const viewedAt = item.viewedAt || 0;
      return viewedAt >= startDate && viewedAt <= endDate;
    });
  }

  /**
   * Check if a sample is in history
   * @param {string} sampleId - Sample ID to check
   * @returns {boolean} True if sample is in history
   */
  isInHistory(sampleId) {
    return this.history.some(item => item.id === sampleId);
  }

  /**
   * Get the last viewed timestamp for a sample
   * @param {string} sampleId - Sample ID
   * @returns {number|null} Timestamp or null if not found
   */
  getLastViewedTime(sampleId) {
    const item = this.history.find(item => item.id === sampleId);
    return item ? item.viewedAt : null;
  }

  /**
   * Add listener for history changes
   * @param {Function} listener - Callback function
   */
  addListener(listener) {
    if (typeof listener === 'function') {
      this.listeners.add(listener);
    }
  }

  /**
   * Remove listener for history changes
   * @param {Function} listener - Callback function to remove
   */
  removeListener(listener) {
    this.listeners.delete(listener);
  }

  /**
   * Notify all listeners of history changes
   * @private
   */
  notifyListeners() {
    const history = this.getHistory();
    this.listeners.forEach(listener => {
      try {
        listener(history);
      } catch (error) {
        console.error('Error in history listener:', error);
      }
    });
  }

  /**
   * Export history data
   * @returns {Object} Exportable history data
   */
  exportHistory() {
    return {
      version: '1.0',
      exportedAt: Date.now(),
      history: this.getHistory(),
      stats: this.getHistoryStats()
    };
  }

  /**
   * Import history data
   * @param {Object} data - History data to import
   * @returns {boolean} True if successfully imported
   */
  importHistory(data) {
    try {
      if (!data || !Array.isArray(data.history)) {
        throw new Error('Invalid history data format');
      }

      // Validate all items before importing
      const validItems = data.history.filter(item => {
        const validation = validateSampleData(item);
        return validation.isValid;
      });

      // Merge with existing history, removing duplicates
      const existingIds = new Set(this.history.map(item => item.id));
      const newItems = validItems.filter(item => !existingIds.has(item.id));

      this.history = [...newItems, ...this.history].slice(0, this.maxHistoryItems);
      
      this.saveHistory();
      this.notifyListeners();

      return true;
    } catch (error) {
      console.error('Error importing history:', error);
      return false;
    }
  }

  /**
   * Cleanup old history entries
   * @param {number} maxAge - Maximum age in milliseconds
   * @returns {number} Number of items removed
   */
  cleanupOldEntries(maxAge = 30 * 24 * 60 * 60 * 1000) { // 30 days default
    const now = Date.now();
    const initialLength = this.history.length;
    
    this.history = this.history.filter(item => {
      const age = now - (item.viewedAt || 0);
      return age <= maxAge;
    });

    const removedCount = initialLength - this.history.length;
    
    if (removedCount > 0) {
      this.saveHistory();
      this.notifyListeners();
    }

    return removedCount;
  }

  /**
   * Get memory usage information
   * @returns {Object} Memory usage stats
   */
  getMemoryUsage() {
    const historySize = JSON.stringify(this.history).length;
    const averageItemSize = this.history.length > 0 ? historySize / this.history.length : 0;
    
    return {
      totalItems: this.history.length,
      maxItems: this.maxHistoryItems,
      estimatedSizeBytes: historySize,
      averageItemSizeBytes: Math.round(averageItemSize),
      utilizationPercent: Math.round((this.history.length / this.maxHistoryItems) * 100)
    };
  }

  /**
   * Destroy the service and cleanup resources
   */
  destroy() {
    this.listeners.clear();
    this.history = [];
  }
}

// Create singleton instance
const historyService = new HistoryService();

export default historyService;