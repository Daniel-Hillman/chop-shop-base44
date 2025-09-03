/**
 * @fileoverview Sampler Pattern Persistence Service
 * Handles saving and loading of sampler patterns to/from localStorage
 * Provides pattern persistence across browser sessions
 */

/**
 * Manages persistence of sampler patterns
 */
class SamplerPatternPersistence {
  constructor() {
    /** @type {string} */
    this.storageKey = 'sampler_patterns';
    
    /** @type {string} */
    this.currentPatternKey = 'sampler_current_pattern';
    
    /** @type {number} */
    this.maxStoredPatterns = 10; // Limit stored patterns to prevent storage bloat
  }

  /**
   * Save pattern to localStorage
   * @param {Object} pattern - Pattern to save
   * @returns {Promise<boolean>} Success status
   */
  async savePattern(pattern) {
    try {
      if (!pattern || !pattern.id) {
        throw new Error('Invalid pattern: missing id');
      }

      // Get existing patterns
      const existingPatterns = await this.getAllPatterns();
      
      // Update or add pattern
      const patternIndex = existingPatterns.findIndex(p => p.id === pattern.id);
      
      if (patternIndex >= 0) {
        // Update existing pattern
        existingPatterns[patternIndex] = {
          ...pattern,
          metadata: {
            ...pattern.metadata,
            modified: new Date().toISOString()
          }
        };
      } else {
        // Add new pattern
        const newPattern = {
          ...pattern,
          metadata: {
            ...pattern.metadata,
            created: pattern.metadata?.created || new Date().toISOString(),
            modified: new Date().toISOString()
          }
        };
        
        existingPatterns.push(newPattern);
        
        // Limit number of stored patterns
        if (existingPatterns.length > this.maxStoredPatterns) {
          // Remove oldest patterns (by created date)
          existingPatterns.sort((a, b) => 
            new Date(a.metadata.created) - new Date(b.metadata.created)
          );
          existingPatterns.splice(0, existingPatterns.length - this.maxStoredPatterns);
        }
      }

      // Save to localStorage
      localStorage.setItem(this.storageKey, JSON.stringify(existingPatterns));
      
      console.log(`Pattern "${pattern.name}" saved successfully`);
      return true;
      
    } catch (error) {
      console.error('Failed to save pattern:', error);
      return false;
    }
  }

  /**
   * Load pattern from localStorage
   * @param {string} patternId - Pattern ID to load
   * @returns {Promise<Object|null>} Loaded pattern or null
   */
  async loadPattern(patternId) {
    try {
      if (!patternId) {
        throw new Error('Pattern ID is required');
      }

      const patterns = await this.getAllPatterns();
      const pattern = patterns.find(p => p.id === patternId);
      
      if (pattern) {
        console.log(`Pattern "${pattern.name}" loaded successfully`);
        return pattern;
      } else {
        console.warn(`Pattern with ID "${patternId}" not found`);
        return null;
      }
      
    } catch (error) {
      console.error('Failed to load pattern:', error);
      return null;
    }
  }

  /**
   * Get all stored patterns
   * @returns {Promise<Array>} Array of patterns
   */
  async getAllPatterns() {
    try {
      const stored = localStorage.getItem(this.storageKey);
      
      if (!stored) {
        return [];
      }

      const patterns = JSON.parse(stored);
      
      if (!Array.isArray(patterns)) {
        console.warn('Invalid patterns data in localStorage, resetting');
        localStorage.removeItem(this.storageKey);
        return [];
      }

      return patterns;
      
    } catch (error) {
      console.error('Failed to get patterns from localStorage:', error);
      localStorage.removeItem(this.storageKey); // Clear corrupted data
      return [];
    }
  }

  /**
   * Delete pattern from localStorage
   * @param {string} patternId - Pattern ID to delete
   * @returns {Promise<boolean>} Success status
   */
  async deletePattern(patternId) {
    try {
      if (!patternId) {
        throw new Error('Pattern ID is required');
      }

      const patterns = await this.getAllPatterns();
      const filteredPatterns = patterns.filter(p => p.id !== patternId);
      
      if (filteredPatterns.length === patterns.length) {
        console.warn(`Pattern with ID "${patternId}" not found for deletion`);
        return false;
      }

      localStorage.setItem(this.storageKey, JSON.stringify(filteredPatterns));
      
      // Clear current pattern if it was deleted
      const currentPatternId = await this.getCurrentPatternId();
      if (currentPatternId === patternId) {
        await this.clearCurrentPattern();
      }
      
      console.log(`Pattern with ID "${patternId}" deleted successfully`);
      return true;
      
    } catch (error) {
      console.error('Failed to delete pattern:', error);
      return false;
    }
  }

  /**
   * Save current pattern ID
   * @param {string} patternId - Pattern ID to set as current
   * @returns {Promise<boolean>} Success status
   */
  async setCurrentPattern(patternId) {
    try {
      if (!patternId) {
        localStorage.removeItem(this.currentPatternKey);
      } else {
        localStorage.setItem(this.currentPatternKey, patternId);
      }
      
      return true;
      
    } catch (error) {
      console.error('Failed to set current pattern:', error);
      return false;
    }
  }

  /**
   * Get current pattern ID
   * @returns {Promise<string|null>} Current pattern ID or null
   */
  async getCurrentPatternId() {
    try {
      return localStorage.getItem(this.currentPatternKey);
    } catch (error) {
      console.error('Failed to get current pattern ID:', error);
      return null;
    }
  }

  /**
   * Load current pattern
   * @returns {Promise<Object|null>} Current pattern or null
   */
  async loadCurrentPattern() {
    try {
      const currentPatternId = await this.getCurrentPatternId();
      
      if (!currentPatternId) {
        return null;
      }

      return await this.loadPattern(currentPatternId);
      
    } catch (error) {
      console.error('Failed to load current pattern:', error);
      return null;
    }
  }

  /**
   * Clear current pattern
   * @returns {Promise<boolean>} Success status
   */
  async clearCurrentPattern() {
    try {
      localStorage.removeItem(this.currentPatternKey);
      return true;
    } catch (error) {
      console.error('Failed to clear current pattern:', error);
      return false;
    }
  }

  /**
   * Auto-save pattern (debounced)
   * @param {Object} pattern - Pattern to auto-save
   * @returns {Promise<boolean>} Success status
   */
  async autoSavePattern(pattern) {
    // Clear existing auto-save timeout
    if (this.autoSaveTimeout) {
      clearTimeout(this.autoSaveTimeout);
    }

    // Set new auto-save timeout (2 seconds delay)
    return new Promise((resolve) => {
      this.autoSaveTimeout = setTimeout(async () => {
        const success = await this.savePattern(pattern);
        resolve(success);
      }, 2000);
    });
  }

  /**
   * Export pattern as JSON
   * @param {string} patternId - Pattern ID to export
   * @returns {Promise<string|null>} JSON string or null
   */
  async exportPattern(patternId) {
    try {
      const pattern = await this.loadPattern(patternId);
      
      if (!pattern) {
        throw new Error('Pattern not found');
      }

      return JSON.stringify(pattern, null, 2);
      
    } catch (error) {
      console.error('Failed to export pattern:', error);
      return null;
    }
  }

  /**
   * Import pattern from JSON
   * @param {string} jsonString - JSON string to import
   * @returns {Promise<Object|null>} Imported pattern or null
   */
  async importPattern(jsonString) {
    try {
      const pattern = JSON.parse(jsonString);
      
      if (!pattern || !pattern.id) {
        throw new Error('Invalid pattern data');
      }

      // Generate new ID to avoid conflicts
      pattern.id = `imported_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      pattern.name = `${pattern.name} (Imported)`;
      
      const success = await this.savePattern(pattern);
      
      if (success) {
        console.log(`Pattern "${pattern.name}" imported successfully`);
        return pattern;
      } else {
        throw new Error('Failed to save imported pattern');
      }
      
    } catch (error) {
      console.error('Failed to import pattern:', error);
      return null;
    }
  }

  /**
   * Get storage usage statistics
   * @returns {Promise<Object>} Storage statistics
   */
  async getStorageStats() {
    try {
      const patterns = await this.getAllPatterns();
      const patternsData = localStorage.getItem(this.storageKey) || '';
      const currentPatternData = localStorage.getItem(this.currentPatternKey) || '';
      
      return {
        patternCount: patterns.length,
        totalSize: patternsData.length + currentPatternData.length,
        averagePatternSize: patterns.length > 0 ? Math.round(patternsData.length / patterns.length) : 0,
        maxPatterns: this.maxStoredPatterns
      };
      
    } catch (error) {
      console.error('Failed to get storage stats:', error);
      return {
        patternCount: 0,
        totalSize: 0,
        averagePatternSize: 0,
        maxPatterns: this.maxStoredPatterns
      };
    }
  }

  /**
   * Clear all stored patterns
   * @returns {Promise<boolean>} Success status
   */
  async clearAllPatterns() {
    try {
      localStorage.removeItem(this.storageKey);
      localStorage.removeItem(this.currentPatternKey);
      
      console.log('All patterns cleared from storage');
      return true;
      
    } catch (error) {
      console.error('Failed to clear all patterns:', error);
      return false;
    }
  }

  /**
   * Validate pattern data structure
   * @param {Object} pattern - Pattern to validate
   * @returns {boolean} Whether pattern is valid
   */
  validatePattern(pattern) {
    if (!pattern || typeof pattern !== 'object') {
      return false;
    }

    // Check required fields
    const requiredFields = ['id', 'name', 'bpm', 'currentBank', 'banks'];
    
    for (const field of requiredFields) {
      if (!(field in pattern)) {
        console.error(`Pattern validation failed: missing field "${field}"`);
        return false;
      }
    }

    // Validate banks structure
    if (!Array.isArray(pattern.banks)) {
      console.error('Pattern validation failed: banks must be an array');
      return false;
    }

    // Validate each bank
    for (const bank of pattern.banks) {
      if (!this.validateBank(bank)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Validate bank structure
   * @private
   * @param {Object} bank - Bank to validate
   * @returns {boolean} Whether bank is valid
   */
  validateBank(bank) {
    if (!bank || typeof bank !== 'object') {
      return false;
    }

    if (typeof bank.bankId !== 'number' || !bank.name || !Array.isArray(bank.tracks)) {
      return false;
    }

    // Validate tracks
    for (const track of bank.tracks) {
      if (!track || typeof track.trackIndex !== 'number' || !Array.isArray(track.steps)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Clean up resources
   * @returns {void}
   */
  destroy() {
    if (this.autoSaveTimeout) {
      clearTimeout(this.autoSaveTimeout);
      this.autoSaveTimeout = null;
    }
    
    console.log('SamplerPatternPersistence destroyed');
  }
}

export { SamplerPatternPersistence };