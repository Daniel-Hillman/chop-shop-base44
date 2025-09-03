/**
 * @fileoverview Pattern Storage Service
 * Provides storage operations for pattern management dialog
 * Wraps SamplerPatternPersistence with additional functionality
 */

import { SamplerPatternPersistence } from './SamplerPatternPersistence.js';

/**
 * Pattern Storage Service
 * Provides enhanced storage operations for pattern management
 */
export class PatternStorageService {
  constructor() {
    this.persistence = new SamplerPatternPersistence();
  }

  /**
   * Get storage statistics
   * @returns {Promise<Object>} Storage stats
   */
  async getStorageStats() {
    try {
      const patterns = await this.persistence.getAllPatterns();
      const storageData = JSON.stringify(patterns);
      const storageSize = new Blob([storageData]).size;
      
      // Estimate storage limit (localStorage is typically 5-10MB)
      const estimatedLimit = 5 * 1024 * 1024; // 5MB
      const usagePercentage = Math.round((storageSize / estimatedLimit) * 100);
      
      return {
        patternCount: patterns.length,
        storageSize,
        usagePercentage: Math.min(usagePercentage, 100)
      };
    } catch (error) {
      console.error('Failed to get storage stats:', error);
      return {
        patternCount: 0,
        storageSize: 0,
        usagePercentage: 0
      };
    }
  }

  /**
   * Export a single pattern
   * @param {string} patternId - Pattern ID to export
   * @returns {Promise<string>} JSON string of pattern data
   */
  async exportPattern(patternId) {
    try {
      const pattern = await this.persistence.loadPattern(patternId);
      if (!pattern) {
        throw new Error(`Pattern with ID "${patternId}" not found`);
      }
      
      return JSON.stringify({
        version: '1.0',
        type: 'sampler-pattern',
        exported: new Date().toISOString(),
        pattern
      }, null, 2);
    } catch (error) {
      console.error('Failed to export pattern:', error);
      throw error;
    }
  }

  /**
   * Import pattern from JSON string
   * @param {string} jsonData - JSON string containing pattern data
   * @param {Object} options - Import options
   * @param {boolean} options.generateNewIds - Generate new IDs for imported patterns
   * @param {boolean} options.overwrite - Overwrite existing patterns
   * @returns {Promise<string[]>} Array of imported pattern IDs
   */
  async importPattern(jsonData, options = {}) {
    try {
      const data = JSON.parse(jsonData);
      
      // Validate import data
      if (!data.pattern) {
        throw new Error('Invalid pattern file: missing pattern data');
      }
      
      let pattern = data.pattern;
      
      // Generate new ID if requested
      if (options.generateNewIds) {
        pattern = {
          ...pattern,
          id: `pattern_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          name: pattern.name + ' (Imported)'
        };
      }
      
      // Check if pattern already exists
      if (!options.overwrite) {
        const existingPattern = await this.persistence.loadPattern(pattern.id);
        if (existingPattern) {
          // Generate new ID to avoid conflict
          pattern.id = `pattern_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          pattern.name = pattern.name + ' (Copy)';
        }
      }
      
      // Save the pattern
      const success = await this.persistence.savePattern(pattern);
      if (!success) {
        throw new Error('Failed to save imported pattern');
      }
      
      return [pattern.id];
    } catch (error) {
      console.error('Failed to import pattern:', error);
      throw error;
    }
  }

  /**
   * Export all patterns
   * @returns {Promise<string>} JSON string of all patterns
   */
  async exportAllPatterns() {
    try {
      const patterns = await this.persistence.getAllPatterns();
      
      return JSON.stringify({
        version: '1.0',
        type: 'sampler-patterns-collection',
        exported: new Date().toISOString(),
        patternCount: patterns.length,
        patterns
      }, null, 2);
    } catch (error) {
      console.error('Failed to export all patterns:', error);
      throw error;
    }
  }
}