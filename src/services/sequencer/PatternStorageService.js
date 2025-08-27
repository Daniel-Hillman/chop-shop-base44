/**
 * @fileoverview Pattern storage service for localStorage-based persistence
 * Handles pattern saving, loading, export/import, and validation
 */

/**
 * Service for managing pattern persistence in localStorage
 */
class PatternStorageService {
  constructor() {
    /** @type {string} */
    this.storageKey = 'chop_stop_sequencer_patterns';
    
    /** @type {string} */
    this.metadataKey = 'chop_stop_sequencer_metadata';
    
    /** @type {number} */
    this.currentVersion = 1;
    
    /** @type {number} */
    this.maxStorageSize = 5 * 1024 * 1024; // 5MB limit
    
    // Initialize storage if needed
    this.initializeStorage();
  }

  /**
   * Initialize localStorage structure
   * @private
   */
  initializeStorage() {
    try {
      const existing = localStorage.getItem(this.storageKey);
      if (!existing) {
        const initialData = {
          version: this.currentVersion,
          patterns: {},
          metadata: {
            created: new Date().toISOString(),
            lastAccess: new Date().toISOString(),
            patternCount: 0
          }
        };
        localStorage.setItem(this.storageKey, JSON.stringify(initialData));
      } else {
        // Check if migration is needed
        this.migrateIfNeeded();
      }
    } catch (error) {
      console.error('Failed to initialize pattern storage:', error);
      throw new Error('Pattern storage initialization failed');
    }
  }

  /**
   * Save a pattern to localStorage
   * @param {import('../../types/sequencer.js').Pattern} pattern - Pattern to save
   * @returns {Promise<string>} Pattern ID
   */
  async savePattern(pattern) {
    if (!pattern) {
      throw new Error('Pattern is required');
    }

    // Validate pattern before saving
    if (!this.validatePattern(pattern)) {
      throw new Error('Pattern validation failed');
    }

    try {
      const storageData = this.getStorageData();
      
      // Check storage size before saving
      const patternSize = this.calculatePatternSize(pattern);
      const currentSize = this.calculateStorageSize(storageData);
      
      if (currentSize + patternSize > this.maxStorageSize) {
        throw new Error('Storage quota exceeded. Please delete some patterns.');
      }

      // Update pattern metadata
      const now = new Date().toISOString();
      const savedPattern = {
        ...pattern,
        metadata: {
          ...pattern.metadata,
          modified: now,
          version: this.currentVersion
        }
      };

      // Save pattern
      storageData.patterns[pattern.id] = savedPattern;
      storageData.metadata.lastAccess = now;
      storageData.metadata.patternCount = Object.keys(storageData.patterns).length;

      localStorage.setItem(this.storageKey, JSON.stringify(storageData));
      
      console.log(`Pattern ${pattern.id} saved successfully`);
      return pattern.id;
    } catch (error) {
      console.error('Failed to save pattern:', error);
      throw new Error(`Failed to save pattern: ${error.message}`);
    }
  }

  /**
   * Load a pattern from localStorage
   * @param {string} patternId - Pattern ID to load
   * @returns {Promise<import('../../types/sequencer.js').Pattern>}
   */
  async loadPattern(patternId) {
    if (!patternId || typeof patternId !== 'string') {
      throw new Error('Pattern ID is required and must be a string');
    }

    try {
      const storageData = this.getStorageData();
      const pattern = storageData.patterns[patternId];

      if (!pattern) {
        throw new Error(`Pattern with ID ${patternId} not found`);
      }

      // Validate loaded pattern
      if (!this.validatePattern(pattern)) {
        throw new Error(`Pattern ${patternId} is corrupted or invalid`);
      }

      // Update last access time
      storageData.metadata.lastAccess = new Date().toISOString();
      localStorage.setItem(this.storageKey, JSON.stringify(storageData));

      console.log(`Pattern ${patternId} loaded successfully`);
      return pattern;
    } catch (error) {
      console.error('Failed to load pattern:', error);
      throw new Error(`Failed to load pattern: ${error.message}`);
    }
  }

  /**
   * Get all saved patterns
   * @returns {Promise<import('../../types/sequencer.js').Pattern[]>}
   */
  async getAllPatterns() {
    try {
      const storageData = this.getStorageData();
      const patterns = Object.values(storageData.patterns);

      // Filter out invalid patterns
      const validPatterns = patterns.filter(pattern => this.validatePattern(pattern));

      // Sort by modification date (newest first)
      validPatterns.sort((a, b) => 
        new Date(b.metadata.modified).getTime() - new Date(a.metadata.modified).getTime()
      );

      return validPatterns;
    } catch (error) {
      console.error('Failed to get all patterns:', error);
      throw new Error(`Failed to get patterns: ${error.message}`);
    }
  }

  /**
   * Delete a pattern from localStorage
   * @param {string} patternId - Pattern ID to delete
   * @returns {Promise<boolean>} Whether deletion was successful
   */
  async deletePattern(patternId) {
    if (!patternId || typeof patternId !== 'string') {
      throw new Error('Pattern ID is required and must be a string');
    }

    try {
      const storageData = this.getStorageData();
      const existed = patternId in storageData.patterns;

      if (existed) {
        delete storageData.patterns[patternId];
        storageData.metadata.lastAccess = new Date().toISOString();
        storageData.metadata.patternCount = Object.keys(storageData.patterns).length;

        localStorage.setItem(this.storageKey, JSON.stringify(storageData));
        console.log(`Pattern ${patternId} deleted successfully`);
      }

      return existed;
    } catch (error) {
      console.error('Failed to delete pattern:', error);
      throw new Error(`Failed to delete pattern: ${error.message}`);
    }
  }

  /**
   * Export pattern to JSON string
   * @param {string} patternId - Pattern ID to export
   * @returns {Promise<string>} JSON string of the pattern
   */
  async exportPattern(patternId) {
    if (!patternId || typeof patternId !== 'string') {
      throw new Error('Pattern ID is required and must be a string');
    }

    try {
      const pattern = await this.loadPattern(patternId);
      
      const exportData = {
        version: this.currentVersion,
        exportedAt: new Date().toISOString(),
        pattern: pattern
      };

      return JSON.stringify(exportData, null, 2);
    } catch (error) {
      console.error('Failed to export pattern:', error);
      throw new Error(`Failed to export pattern: ${error.message}`);
    }
  }

  /**
   * Export all patterns to JSON string
   * @returns {Promise<string>} JSON string of all patterns
   */
  async exportAllPatterns() {
    try {
      const patterns = await this.getAllPatterns();
      
      const exportData = {
        version: this.currentVersion,
        exportedAt: new Date().toISOString(),
        patterns: patterns
      };

      return JSON.stringify(exportData, null, 2);
    } catch (error) {
      console.error('Failed to export all patterns:', error);
      throw new Error(`Failed to export patterns: ${error.message}`);
    }
  }

  /**
   * Import pattern from JSON string
   * @param {string} jsonString - JSON string containing pattern data
   * @param {Object} options - Import options
   * @param {boolean} options.overwrite - Whether to overwrite existing patterns
   * @param {boolean} options.generateNewIds - Whether to generate new IDs for imported patterns
   * @returns {Promise<string[]>} Array of imported pattern IDs
   */
  async importPattern(jsonString, options = {}) {
    const { overwrite = false, generateNewIds = false } = options;

    if (!jsonString || typeof jsonString !== 'string') {
      throw new Error('JSON string is required');
    }

    try {
      const importData = JSON.parse(jsonString);
      
      // Validate import data structure
      if (!this.validateImportData(importData)) {
        throw new Error('Invalid import data format');
      }

      const importedIds = [];
      const patterns = importData.patterns || [importData.pattern];
      
      // Filter out null/undefined patterns
      const validPatterns = patterns.filter(p => p != null);

      for (const pattern of validPatterns) {

        // Generate new ID if requested
        let patternToImport = { ...pattern };
        
        if (generateNewIds) {
          patternToImport.id = this.generatePatternId();
          patternToImport.name = `${pattern.name} (Imported)`;
        }
        
        // Check if pattern exists and handle accordingly
        const exists = await this.patternExists(patternToImport.id);
        if (!overwrite && exists) {
          console.warn(`Pattern ${patternToImport.id} already exists, skipping`);
          continue;
        }

        // Validate pattern before importing
        if (!this.validatePattern(patternToImport)) {
          console.warn(`Skipping invalid pattern: ${pattern.name}`);
          continue;
        }



        // Import the pattern
        await this.savePattern(patternToImport);
        importedIds.push(patternToImport.id);
      }

      console.log(`Successfully imported ${importedIds.length} patterns`);
      return importedIds;
    } catch (error) {
      console.error('Failed to import pattern:', error);
      throw new Error(`Failed to import pattern: ${error.message}`);
    }
  }

  /**
   * Check if a pattern exists
   * @param {string} patternId - Pattern ID to check
   * @returns {Promise<boolean>} Whether pattern exists
   */
  async patternExists(patternId) {
    if (!patternId || typeof patternId !== 'string') {
      return false;
    }

    try {
      const storageData = this.getStorageData();
      return patternId in storageData.patterns;
    } catch (error) {
      console.error('Failed to check pattern existence:', error);
      return false;
    }
  }

  /**
   * Get storage statistics
   * @returns {Promise<Object>} Storage statistics
   */
  async getStorageStats() {
    try {
      // Check if localStorage is throwing errors
      localStorage.getItem(this.storageKey);
      
      const storageData = this.getStorageData();
      const currentSize = this.calculateStorageSize(storageData);
      const usagePercentage = currentSize > 0 ? Math.max(1, Math.round((currentSize / this.maxStorageSize) * 100)) : 0;
      
      return {
        patternCount: storageData.metadata.patternCount || 0,
        storageSize: currentSize,
        maxStorageSize: this.maxStorageSize,
        usagePercentage: usagePercentage,
        lastAccess: storageData.metadata.lastAccess,
        version: storageData.version || this.currentVersion
      };
    } catch (error) {
      console.error('Failed to get storage stats:', error);
      return {
        patternCount: 0,
        storageSize: 0,
        maxStorageSize: this.maxStorageSize,
        usagePercentage: 0,
        lastAccess: null,
        version: this.currentVersion
      };
    }
  }

  /**
   * Clear all patterns from storage
   * @returns {Promise<void>}
   */
  async clearAllPatterns() {
    try {
      const initialData = {
        version: this.currentVersion,
        patterns: {},
        metadata: {
          created: new Date().toISOString(),
          lastAccess: new Date().toISOString(),
          patternCount: 0
        }
      };
      
      localStorage.setItem(this.storageKey, JSON.stringify(initialData));
      console.log('All patterns cleared from storage');
    } catch (error) {
      console.error('Failed to clear patterns:', error);
      throw new Error(`Failed to clear patterns: ${error.message}`);
    }
  }

  /**
   * Get storage data from localStorage
   * @private
   * @returns {Object} Storage data object
   */
  getStorageData() {
    try {
      const data = localStorage.getItem(this.storageKey);
      if (!data) {
        throw new Error('No storage data found');
      }
      
      const parsed = JSON.parse(data);
      
      // Ensure required structure exists
      if (!parsed.patterns) {
        parsed.patterns = {};
      }
      if (!parsed.metadata) {
        parsed.metadata = {
          created: new Date().toISOString(),
          lastAccess: new Date().toISOString(),
          patternCount: Object.keys(parsed.patterns).length
        };
      } else {
        // Ensure pattern count is accurate
        parsed.metadata.patternCount = Object.keys(parsed.patterns).length;
      }
      
      return parsed;
    } catch (error) {
      console.error('Failed to get storage data:', error);
      // Return empty structure if parsing fails
      return {
        version: this.currentVersion,
        patterns: {},
        metadata: {
          created: new Date().toISOString(),
          lastAccess: new Date().toISOString(),
          patternCount: 0
        }
      };
    }
  }

  /**
   * Validate pattern data
   * @private
   * @param {import('../../types/sequencer.js').Pattern} pattern - Pattern to validate
   * @returns {boolean} Whether pattern is valid
   */
  validatePattern(pattern) {
    if (!pattern || typeof pattern !== 'object') {
      return false;
    }

    // Check required fields
    if (!pattern.id || typeof pattern.id !== 'string') {
      return false;
    }

    if (!pattern.name || typeof pattern.name !== 'string') {
      return false;
    }

    if (typeof pattern.bpm !== 'number' || pattern.bpm < 60 || pattern.bpm > 200) {
      return false;
    }

    if (typeof pattern.swing !== 'number' || pattern.swing < 0 || pattern.swing > 100) {
      return false;
    }

    if (![8, 16, 32].includes(pattern.stepResolution)) {
      return false;
    }

    // Validate tracks
    if (!Array.isArray(pattern.tracks) || pattern.tracks.length === 0) {
      return false;
    }

    // Validate each track
    for (const track of pattern.tracks) {
      if (!this.validateTrack(track)) {
        return false;
      }
    }

    // Validate metadata
    if (!pattern.metadata || typeof pattern.metadata !== 'object') {
      return false;
    }

    if (!pattern.metadata.created || !pattern.metadata.modified) {
      return false;
    }

    return true;
  }

  /**
   * Validate track data
   * @private
   * @param {import('../../types/sequencer.js').Track} track - Track to validate
   * @returns {boolean} Whether track is valid
   */
  validateTrack(track) {
    if (!track || typeof track !== 'object') {
      return false;
    }

    // Check required fields
    if (!track.id || typeof track.id !== 'string') {
      return false;
    }

    if (!track.name || typeof track.name !== 'string') {
      return false;
    }

    if (typeof track.volume !== 'number' || track.volume < 0 || track.volume > 1) {
      return false;
    }

    if (typeof track.mute !== 'boolean' || typeof track.solo !== 'boolean') {
      return false;
    }

    // Validate steps
    if (!Array.isArray(track.steps) || track.steps.length === 0) {
      return false;
    }

    // Validate each step
    for (const step of track.steps) {
      if (!this.validateStep(step)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Validate step data
   * @private
   * @param {import('../../types/sequencer.js').SequencerStep} step - Step to validate
   * @returns {boolean} Whether step is valid
   */
  validateStep(step) {
    if (!step || typeof step !== 'object') {
      return false;
    }

    if (typeof step.active !== 'boolean') {
      return false;
    }

    if (typeof step.velocity !== 'number' || step.velocity < 0 || step.velocity > 1) {
      return false;
    }

    return true;
  }

  /**
   * Validate import data structure
   * @private
   * @param {Object} importData - Import data to validate
   * @returns {boolean} Whether import data is valid
   */
  validateImportData(importData) {
    if (!importData || typeof importData !== 'object') {
      return false;
    }

    // Check for single pattern or multiple patterns
    if (importData.pattern) {
      return this.validatePattern(importData.pattern);
    }

    if (importData.patterns && Array.isArray(importData.patterns)) {
      // Allow arrays with some invalid patterns - they'll be filtered out later
      return importData.patterns.length > 0 && 
             importData.patterns.some(pattern => pattern && this.validatePattern(pattern));
    }

    return false;
  }

  /**
   * Calculate pattern size in bytes (approximate)
   * @private
   * @param {import('../../types/sequencer.js').Pattern} pattern - Pattern to measure
   * @returns {number} Approximate size in bytes
   */
  calculatePatternSize(pattern) {
    return JSON.stringify(pattern).length * 2; // Rough estimate (UTF-16)
  }

  /**
   * Calculate total storage size
   * @private
   * @param {Object} storageData - Storage data to measure
   * @returns {number} Total size in bytes
   */
  calculateStorageSize(storageData) {
    return JSON.stringify(storageData).length * 2; // Rough estimate (UTF-16)
  }

  /**
   * Generate a unique pattern ID
   * @private
   * @returns {string} Unique pattern ID
   */
  generatePatternId() {
    return `pattern_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Migrate storage data if needed
   * @private
   */
  migrateIfNeeded() {
    try {
      const storageData = this.getStorageData();
      
      if (!storageData.version || storageData.version < this.currentVersion) {
        console.log('Migrating pattern storage to version', this.currentVersion);
        
        // Perform migration logic here
        storageData.version = this.currentVersion;
        
        // Ensure all patterns have required metadata
        Object.values(storageData.patterns).forEach(pattern => {
          if (!pattern.metadata.version) {
            pattern.metadata.version = this.currentVersion;
          }
        });
        
        localStorage.setItem(this.storageKey, JSON.stringify(storageData));
        console.log('Pattern storage migration completed');
      }
    } catch (error) {
      console.error('Failed to migrate storage:', error);
    }
  }
}

export { PatternStorageService };