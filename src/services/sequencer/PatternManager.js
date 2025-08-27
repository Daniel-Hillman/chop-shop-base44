/**
 * @fileoverview Pattern management service
 * Handles pattern CRUD operations, step data management, and pattern validation
 */

import sequencerMemoryManager from './SequencerMemoryManager.js';
import { PatternStorageService } from './PatternStorageService.js';

/**
 * Manages sequencer patterns and step data
 */
class PatternManager {
  constructor() {
    /** @type {Map<string, import('../../types/sequencer.js').Pattern>} */
    this.patterns = new Map();
    
    /** @type {import('../../types/sequencer.js').Pattern|null} */
    this.currentPattern = null;
    
    /** @type {number} */
    this.stepResolution = 16; // Default to 1/16 notes
    
    /** @type {number} */
    this.maxTracks = 16;
    
    /** @type {number} */
    this.maxSteps = 64;
    
    /** @type {PatternStorageService} */
    this.storageService = new PatternStorageService();
    
    // Start memory monitoring
    sequencerMemoryManager.startMonitoring();
    
    // Set up cleanup callback
    sequencerMemoryManager.onCleanup((data) => {
      console.log('PatternManager: Memory cleanup performed', data);
    });
  }

  /**
   * Create a new pattern
   * @param {string} name - Pattern name
   * @param {number} tracks - Number of tracks
   * @param {number} steps - Number of steps
   * @returns {import('../../types/sequencer.js').Pattern}
   */
  createPattern(name, tracks = 8, steps = 16) {
    if (!name || typeof name !== 'string') {
      throw new Error('Pattern name is required and must be a string');
    }

    if (tracks < 1 || tracks > this.maxTracks) {
      throw new Error(`Number of tracks must be between 1 and ${this.maxTracks}`);
    }

    if (steps < 1 || steps > this.maxSteps) {
      throw new Error(`Number of steps must be between 1 and ${this.maxSteps}`);
    }

    const patternId = this.generatePatternId();
    const pattern = {
      id: patternId,
      name: name,
      bpm: 120,
      swing: 0,
      stepResolution: this.stepResolution,
      tracks: this.createDefaultTracks(tracks, steps),
      metadata: {
        created: new Date().toISOString(),
        modified: new Date().toISOString(),
        userId: null // Will be set when user authentication is implemented
      }
    };

    this.patterns.set(patternId, pattern);
    
    // Store in memory manager
    sequencerMemoryManager.storePattern(patternId, pattern);
    
    return pattern;
  }

  /**
   * Load an existing pattern
   * @param {string} patternId - Pattern ID to load
   * @returns {Promise<import('../../types/sequencer.js').Pattern>}
   */
  async loadPattern(patternId) {
    if (!patternId || typeof patternId !== 'string') {
      throw new Error('Pattern ID is required and must be a string');
    }

    // Try to get from memory manager first (includes cache)
    let pattern = sequencerMemoryManager.getPattern(patternId);
    
    // Fallback to local patterns map
    if (!pattern) {
      pattern = this.patterns.get(patternId);
    }
    
    // Fallback to persistent storage
    if (!pattern) {
      try {
        pattern = await this.storageService.loadPattern(patternId);
      } catch (error) {
        throw new Error(`Pattern with ID ${patternId} not found`);
      }
    }

    // Validate pattern before loading
    if (!this.validatePattern(pattern)) {
      throw new Error(`Pattern ${patternId} is invalid`);
    }

    this.currentPattern = pattern;
    this.stepResolution = pattern.stepResolution;
    
    // Store in memory for quick access
    this.patterns.set(patternId, pattern);
    sequencerMemoryManager.storePattern(patternId, pattern);
    
    return pattern;
  }

  /**
   * Save a pattern
   * @param {import('../../types/sequencer.js').Pattern} pattern - Pattern to save
   * @returns {Promise<string>} Pattern ID
   */
  async savePattern(pattern) {
    if (!pattern) {
      throw new Error('Pattern is required');
    }

    // Generate ID if not present (before validation)
    if (!pattern.id) {
      pattern.id = this.generatePatternId();
    }

    // Validate pattern after ensuring ID is present
    if (!this.validatePattern(pattern)) {
      throw new Error('Pattern is invalid and cannot be saved');
    }

    // Update metadata
    pattern.metadata.modified = new Date().toISOString();

    // Save to persistent storage first
    await this.storageService.savePattern(pattern);

    // Save to patterns map
    this.patterns.set(pattern.id, { ...pattern });
    
    // Store in memory manager
    sequencerMemoryManager.storePattern(pattern.id, pattern);

    return pattern.id;
  }

  /**
   * Toggle a step on/off
   * @param {string} trackId - Track ID
   * @param {number} stepIndex - Step index (0-based)
   * @returns {void}
   */
  toggleStep(trackId, stepIndex) {
    if (!this.currentPattern) {
      throw new Error('No pattern is currently loaded');
    }

    if (!trackId || typeof trackId !== 'string') {
      throw new Error('Track ID is required and must be a string');
    }

    if (typeof stepIndex !== 'number' || stepIndex < 0) {
      throw new Error('Step index must be a non-negative number');
    }

    const track = this.currentPattern.tracks.find(t => t.id === trackId);
    if (!track) {
      throw new Error(`Track with ID ${trackId} not found`);
    }

    if (stepIndex >= track.steps.length) {
      throw new Error(`Step index ${stepIndex} is out of range for track ${trackId}`);
    }

    // Toggle the step
    track.steps[stepIndex].active = !track.steps[stepIndex].active;

    // Update pattern metadata
    this.currentPattern.metadata.modified = new Date().toISOString();
  }

  /**
   * Set step velocity
   * @param {string} trackId - Track ID
   * @param {number} stepIndex - Step index (0-based)
   * @param {number} velocity - Velocity value (0.0 - 1.0)
   * @returns {void}
   */
  setStepVelocity(trackId, stepIndex, velocity) {
    if (!this.currentPattern) {
      throw new Error('No pattern is currently loaded');
    }

    if (!trackId || typeof trackId !== 'string') {
      throw new Error('Track ID is required and must be a string');
    }

    if (typeof stepIndex !== 'number' || stepIndex < 0) {
      throw new Error('Step index must be a non-negative number');
    }

    if (typeof velocity !== 'number' || velocity < 0 || velocity > 1) {
      throw new Error('Velocity must be a number between 0.0 and 1.0');
    }

    const track = this.currentPattern.tracks.find(t => t.id === trackId);
    if (!track) {
      throw new Error(`Track with ID ${trackId} not found`);
    }

    if (stepIndex >= track.steps.length) {
      throw new Error(`Step index ${stepIndex} is out of range for track ${trackId}`);
    }

    // Set the velocity
    track.steps[stepIndex].velocity = velocity;

    // Update pattern metadata
    this.currentPattern.metadata.modified = new Date().toISOString();
  }

  /**
   * Clear all steps in a pattern
   * @returns {void}
   */
  clearPattern() {
    if (!this.currentPattern) {
      throw new Error('No pattern is currently loaded');
    }

    // Clear all steps in all tracks
    this.currentPattern.tracks.forEach(track => {
      track.steps.forEach(step => {
        step.active = false;
        step.velocity = 0.8; // Reset to default velocity
      });
    });

    // Update pattern metadata
    this.currentPattern.metadata.modified = new Date().toISOString();
  }

  /**
   * Duplicate an existing pattern
   * @param {string} patternId - Pattern ID to duplicate
   * @param {string} newName - Name for the new pattern
   * @returns {import('../../types/sequencer.js').Pattern}
   */
  duplicatePattern(patternId, newName) {
    if (!patternId || typeof patternId !== 'string') {
      throw new Error('Pattern ID is required and must be a string');
    }

    if (!newName || typeof newName !== 'string') {
      throw new Error('New pattern name is required and must be a string');
    }

    const originalPattern = this.patterns.get(patternId);
    if (!originalPattern) {
      throw new Error(`Pattern with ID ${patternId} not found`);
    }

    // Deep clone the original pattern
    const duplicatedPattern = {
      id: this.generatePatternId(),
      name: newName,
      bpm: originalPattern.bpm,
      swing: originalPattern.swing,
      stepResolution: originalPattern.stepResolution,
      tracks: originalPattern.tracks.map(track => ({
        id: track.id,
        name: track.name,
        sampleId: track.sampleId,
        volume: track.volume,
        mute: track.mute,
        solo: track.solo,
        color: track.color,
        randomization: { ...track.randomization },
        steps: track.steps.map(step => ({ ...step }))
      })),
      metadata: {
        created: new Date().toISOString(),
        modified: new Date().toISOString(),
        userId: originalPattern.metadata.userId
      }
    };

    this.patterns.set(duplicatedPattern.id, duplicatedPattern);
    return duplicatedPattern;
  }

  /**
   * Change step resolution and update pattern grid
   * @param {number} newResolution - New step resolution (8, 16, or 32)
   * @returns {void}
   */
  changeStepResolution(newResolution) {
    if (![8, 16, 32].includes(newResolution)) {
      throw new Error('Step resolution must be 8, 16, or 32');
    }

    const oldResolution = this.stepResolution;
    this.stepResolution = newResolution;

    // Update current pattern if loaded
    if (this.currentPattern) {
      this.currentPattern.stepResolution = newResolution;
      
      // Convert existing step data to new resolution
      this.currentPattern.tracks.forEach(track => {
        const oldSteps = [...track.steps];
        const newSteps = [];

        if (newResolution > oldResolution) {
          // Increasing resolution - spread existing steps
          const ratio = newResolution / oldResolution;
          for (let i = 0; i < newResolution; i++) {
            const oldIndex = Math.floor(i / ratio);
            if (oldIndex < oldSteps.length) {
              // Only copy active steps to their new positions
              if (i % ratio === 0) {
                newSteps[i] = { ...oldSteps[oldIndex] };
              } else {
                newSteps[i] = { active: false, velocity: 0.8 };
              }
            } else {
              newSteps[i] = { active: false, velocity: 0.8 };
            }
          }
        } else {
          // Decreasing resolution - downsample steps
          const ratio = oldResolution / newResolution;
          for (let i = 0; i < newResolution; i++) {
            const oldIndex = Math.floor(i * ratio);
            if (oldIndex < oldSteps.length) {
              newSteps[i] = { ...oldSteps[oldIndex] };
            } else {
              newSteps[i] = { active: false, velocity: 0.8 };
            }
          }
        }

        track.steps = newSteps;
      });

      // Update pattern metadata
      this.currentPattern.metadata.modified = new Date().toISOString();
    }
  }

  /**
   * Validate pattern data
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

    if (pattern.tracks.length > this.maxTracks) {
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
   * Get current pattern
   * @returns {import('../../types/sequencer.js').Pattern|null}
   */
  getCurrentPattern() {
    return this.currentPattern;
  }

  /**
   * Set current pattern
   * @param {import('../../types/sequencer.js').Pattern} pattern - Pattern to set as current
   * @returns {void}
   */
  setCurrentPattern(pattern) {
    if (pattern && !this.validatePattern(pattern)) {
      throw new Error('Invalid pattern cannot be set as current');
    }

    this.currentPattern = pattern;
    
    if (pattern) {
      this.stepResolution = pattern.stepResolution;
    }
  }

  /**
   * Get all available patterns
   * @returns {import('../../types/sequencer.js').Pattern[]}
   */
  getAllPatterns() {
    return Array.from(this.patterns.values());
  }

  /**
   * Delete a pattern
   * @param {string} patternId - Pattern ID to delete
   * @returns {Promise<boolean>} Whether deletion was successful
   */
  async deletePattern(patternId) {
    if (!patternId || typeof patternId !== 'string') {
      throw new Error('Pattern ID is required and must be a string');
    }

    let existed = false;
    
    try {
      // Delete from persistent storage
      existed = await this.storageService.deletePattern(patternId);
    } catch (error) {
      console.warn('Failed to delete pattern from storage:', error);
    }
    
    // Delete from memory regardless of storage result
    const existedInMemory = this.patterns.has(patternId);
    
    if (existedInMemory) {
      this.patterns.delete(patternId);
      
      // Remove from memory manager
      sequencerMemoryManager.removePattern(patternId);
      
      // Clear current pattern if it was the deleted one
      if (this.currentPattern && this.currentPattern.id === patternId) {
        this.currentPattern = null;
      }
    }

    return existed || existedInMemory;
  }

  /**
   * Update step resolution for current pattern (called by SequencerEngine)
   * @param {number} resolution - New step resolution
   * @returns {void}
   */
  updateStepResolution(resolution) {
    this.changeStepResolution(resolution);
  }

  /**
   * Set track volume
   * @param {string} trackId - Track ID
   * @param {number} volume - Volume value (0.0 - 1.0)
   * @returns {void}
   */
  setTrackVolume(trackId, volume) {
    if (!this.currentPattern) {
      throw new Error('No pattern is currently loaded');
    }

    if (!trackId || typeof trackId !== 'string') {
      throw new Error('Track ID is required and must be a string');
    }

    if (typeof volume !== 'number' || volume < 0 || volume > 1) {
      throw new Error('Volume must be a number between 0.0 and 1.0');
    }

    const track = this.currentPattern.tracks.find(t => t.id === trackId);
    if (!track) {
      throw new Error(`Track with ID ${trackId} not found`);
    }

    track.volume = volume;
    this.currentPattern.metadata.modified = new Date().toISOString();
  }

  /**
   * Toggle track mute
   * @param {string} trackId - Track ID
   * @returns {void}
   */
  toggleTrackMute(trackId) {
    if (!this.currentPattern) {
      throw new Error('No pattern is currently loaded');
    }

    if (!trackId || typeof trackId !== 'string') {
      throw new Error('Track ID is required and must be a string');
    }

    const track = this.currentPattern.tracks.find(t => t.id === trackId);
    if (!track) {
      throw new Error(`Track with ID ${trackId} not found`);
    }

    track.mute = !track.mute;
    this.currentPattern.metadata.modified = new Date().toISOString();
  }

  /**
   * Toggle track solo
   * @param {string} trackId - Track ID
   * @returns {void}
   */
  toggleTrackSolo(trackId) {
    if (!this.currentPattern) {
      throw new Error('No pattern is currently loaded');
    }

    if (!trackId || typeof trackId !== 'string') {
      throw new Error('Track ID is required and must be a string');
    }

    const track = this.currentPattern.tracks.find(t => t.id === trackId);
    if (!track) {
      throw new Error(`Track with ID ${trackId} not found`);
    }

    track.solo = !track.solo;
    this.currentPattern.metadata.modified = new Date().toISOString();
  }

  /**
   * Set track name
   * @param {string} trackId - Track ID
   * @param {string} name - New track name
   * @returns {void}
   */
  setTrackName(trackId, name) {
    if (!this.currentPattern) {
      throw new Error('No pattern is currently loaded');
    }

    if (!trackId || typeof trackId !== 'string') {
      throw new Error('Track ID is required and must be a string');
    }

    if (!name || typeof name !== 'string') {
      throw new Error('Track name is required and must be a string');
    }

    const track = this.currentPattern.tracks.find(t => t.id === trackId);
    if (!track) {
      throw new Error(`Track with ID ${trackId} not found`);
    }

    track.name = name.trim();
    this.currentPattern.metadata.modified = new Date().toISOString();
  }

  /**
   * Set track color
   * @param {string} trackId - Track ID
   * @param {string} color - New track color (hex format)
   * @returns {void}
   */
  setTrackColor(trackId, color) {
    if (!this.currentPattern) {
      throw new Error('No pattern is currently loaded');
    }

    if (!trackId || typeof trackId !== 'string') {
      throw new Error('Track ID is required and must be a string');
    }

    if (!color || typeof color !== 'string') {
      throw new Error('Track color is required and must be a string');
    }

    // Basic hex color validation
    if (!/^#[0-9A-F]{6}$/i.test(color)) {
      throw new Error('Track color must be a valid hex color (e.g., #FF0000)');
    }

    const track = this.currentPattern.tracks.find(t => t.id === trackId);
    if (!track) {
      throw new Error(`Track with ID ${trackId} not found`);
    }

    track.color = color;
    this.currentPattern.metadata.modified = new Date().toISOString();
  }

  /**
   * Set track randomization settings
   * @param {string} trackId - Track ID
   * @param {import('../../types/sequencer.js').TrackRandomization} randomization - Randomization settings
   * @returns {void}
   */
  setTrackRandomization(trackId, randomization) {
    if (!this.currentPattern) {
      throw new Error('No pattern is currently loaded');
    }

    if (!trackId || typeof trackId !== 'string') {
      throw new Error('Track ID is required and must be a string');
    }

    if (!randomization || typeof randomization !== 'object') {
      throw new Error('Randomization settings are required and must be an object');
    }

    const track = this.currentPattern.tracks.find(t => t.id === trackId);
    if (!track) {
      throw new Error(`Track with ID ${trackId} not found`);
    }

    // Validate randomization settings
    if (randomization.velocity) {
      const vel = randomization.velocity;
      if (typeof vel.enabled !== 'boolean' || 
          typeof vel.amount !== 'number' || 
          vel.amount < 0 || vel.amount > 100) {
        throw new Error('Invalid velocity randomization settings');
      }
    }

    if (randomization.timing) {
      const timing = randomization.timing;
      if (typeof timing.enabled !== 'boolean' || 
          typeof timing.amount !== 'number' || 
          timing.amount < 0 || timing.amount > 100) {
        throw new Error('Invalid timing randomization settings');
      }
    }

    track.randomization = { ...randomization };
    this.currentPattern.metadata.modified = new Date().toISOString();
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
   * Create default tracks for a new pattern
   * @private
   * @param {number} trackCount - Number of tracks to create
   * @param {number} stepCount - Number of steps per track
   * @returns {Array} Array of track objects
   */
  createDefaultTracks(trackCount, stepCount) {
    const defaultTrackNames = [
      'Kick', 'Snare', 'Hi-Hat', 'Open Hat', 'Crash', 'Ride', 'Tom 1', 'Tom 2',
      'Clap', 'Perc 1', 'Perc 2', 'Perc 3', 'Perc 4', 'Perc 5', 'Perc 6', 'Perc 7'
    ];

    const defaultColors = [
      '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16', '#22c55e',
      '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9', '#3b82f6', '#6366f1',
      '#8b5cf6', '#a855f7', '#d946ef', '#ec4899'
    ];

    const tracks = [];
    
    for (let i = 0; i < trackCount; i++) {
      const trackId = `track_${i}`;
      const track = {
        id: trackId,
        name: defaultTrackNames[i] || `Track ${i + 1}`,
        sampleId: null, // Will be assigned later
        volume: 0.8,
        mute: false,
        solo: false,
        color: defaultColors[i % defaultColors.length],
        randomization: {
          velocity: {
            enabled: false,
            amount: 0
          },
          timing: {
            enabled: false,
            amount: 0
          }
        },
        steps: this.createDefaultSteps(stepCount)
      };
      
      tracks.push(track);
    }

    return tracks;
  }

  /**
   * Create default steps for a track
   * @private
   * @param {number} stepCount - Number of steps to create
   * @returns {Array} Array of step objects
   */
  createDefaultSteps(stepCount) {
    const steps = [];
    
    for (let i = 0; i < stepCount; i++) {
      steps.push({
        active: false,
        velocity: 0.8
      });
    }

    return steps;
  }

  /**
   * Validate a track object
   * @private
   * @param {Object} track - Track to validate
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

    if (track.steps.length > this.maxSteps) {
      return false;
    }

    // Validate each step
    for (const step of track.steps) {
      if (!this.validateStep(step)) {
        return false;
      }
    }

    // Validate randomization settings
    if (track.randomization) {
      if (track.randomization.velocity) {
        const vel = track.randomization.velocity;
        if (typeof vel.enabled !== 'boolean' || 
            typeof vel.amount !== 'number' || 
            vel.amount < 0 || vel.amount > 100) {
          return false;
        }
      }

      if (track.randomization.timing) {
        const timing = track.randomization.timing;
        if (typeof timing.enabled !== 'boolean' || 
            typeof timing.amount !== 'number' || 
            timing.amount < 0 || timing.amount > 100) {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * Validate a step object
   * @private
   * @param {Object} step - Step to validate
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
   * Clean up memory and resources
   * @param {Object} options - Cleanup options
   * @returns {void}
   */
  cleanup(options = {}) {
    const { clearCurrent = false, clearAll = false } = options;
    
    if (clearAll) {
      // Clear all patterns from local storage
      this.patterns.clear();
      this.currentPattern = null;
      
      // Trigger memory manager cleanup
      sequencerMemoryManager.cleanup({ clearPatterns: true });
    } else if (clearCurrent) {
      // Clear only current pattern
      if (this.currentPattern) {
        this.deletePattern(this.currentPattern.id);
        this.currentPattern = null;
      }
    }
    
    console.log('PatternManager cleanup completed');
  }

  /**
   * Get memory usage statistics
   * @returns {Object} Memory usage stats
   */
  getMemoryUsage() {
    return sequencerMemoryManager.getMemoryUsage();
  }

  /**
   * Get all saved patterns from persistent storage
   * @returns {Promise<import('../../types/sequencer.js').Pattern[]>}
   */
  async getSavedPatterns() {
    try {
      return await this.storageService.getAllPatterns();
    } catch (error) {
      console.error('Failed to get saved patterns:', error);
      return [];
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
      return await this.storageService.exportPattern(patternId);
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
      return await this.storageService.exportAllPatterns();
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
    if (!jsonString || typeof jsonString !== 'string') {
      throw new Error('JSON string is required');
    }

    try {
      const importedIds = await this.storageService.importPattern(jsonString, options);
      
      // Load imported patterns into memory for quick access
      for (const patternId of importedIds) {
        try {
          const pattern = await this.storageService.loadPattern(patternId);
          this.patterns.set(patternId, pattern);
          sequencerMemoryManager.storePattern(patternId, pattern);
        } catch (error) {
          console.warn(`Failed to load imported pattern ${patternId} into memory:`, error);
        }
      }
      
      return importedIds;
    } catch (error) {
      console.error('Failed to import pattern:', error);
      throw new Error(`Failed to import pattern: ${error.message}`);
    }
  }

  /**
   * Get storage statistics
   * @returns {Promise<Object>} Storage statistics
   */
  async getStorageStats() {
    try {
      return await this.storageService.getStorageStats();
    } catch (error) {
      console.error('Failed to get storage stats:', error);
      return {
        patternCount: 0,
        storageSize: 0,
        maxStorageSize: 0,
        usagePercentage: 0,
        lastAccess: null,
        version: 1
      };
    }
  }

  /**
   * Clear all patterns from persistent storage
   * @returns {Promise<void>}
   */
  async clearAllSavedPatterns() {
    try {
      await this.storageService.clearAllPatterns();
      
      // Also clear from memory
      this.patterns.clear();
      this.currentPattern = null;
      sequencerMemoryManager.cleanup({ clearPatterns: true });
      
      console.log('All saved patterns cleared');
    } catch (error) {
      console.error('Failed to clear saved patterns:', error);
      throw new Error(`Failed to clear patterns: ${error.message}`);
    }
  }

  /**
   * Check if a pattern exists in persistent storage
   * @param {string} patternId - Pattern ID to check
   * @returns {Promise<boolean>} Whether pattern exists
   */
  async patternExistsInStorage(patternId) {
    if (!patternId || typeof patternId !== 'string') {
      return false;
    }

    try {
      return await this.storageService.patternExists(patternId);
    } catch (error) {
      console.error('Failed to check pattern existence:', error);
      return false;
    }
  }

  /**
   * Save current pattern to persistent storage
   * @returns {Promise<string|null>} Pattern ID if saved, null if no current pattern
   */
  async saveCurrentPattern() {
    if (!this.currentPattern) {
      return null;
    }

    try {
      return await this.savePattern(this.currentPattern);
    } catch (error) {
      console.error('Failed to save current pattern:', error);
      throw new Error(`Failed to save current pattern: ${error.message}`);
    }
  }
}

export { PatternManager };