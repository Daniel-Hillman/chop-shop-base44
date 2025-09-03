/**
 * @fileoverview Sampler Pattern Management Service
 * Manages pattern data specifically for the sampler drum sequencer
 * Handles bank organization and chop-to-track assignment
 */

import samplerPatternValidator from './SamplerPatternValidator.js';

/**
 * Manages sampler sequencer patterns and bank organization
 */
class SamplerPatternManager {
  constructor() {
    /** @type {Object} */
    this.currentPattern = null;
    
    /** @type {number} */
    this.currentBank = 0;
    
    /** @type {number} */
    this.maxBanks = 4; // A, B, C, D (initially 2)
    
    /** @type {number} */
    this.tracksPerBank = 16;
    
    /** @type {number} */
    this.stepsPerTrack = 16;
    
    /** @type {Map<string, Object>} */
    this.chopAssignments = new Map(); // chopId -> trackIndex mapping
  }

  /**
   * Create a new sampler pattern with validation
   * @param {string} name - Pattern name
   * @param {number} bpm - Initial BPM
   * @returns {Object} New pattern creation result
   */
  createPattern(name = 'New Pattern', bpm = 140) {
    try {
      const pattern = {
        id: this.generatePatternId(),
        name: name,
        bpm: bpm,
        currentBank: 0,
        banks: this.createDefaultBanks(),
        metadata: {
          created: new Date().toISOString(),
          modified: new Date().toISOString()
        }
      };

      // Validate the created pattern
      const validationResult = samplerPatternValidator.validateAndSanitize(pattern, {
        autoFix: true,
        strict: false,
        throwOnError: false
      });

      if (!validationResult.isValid) {
        console.error('Created pattern failed validation:', validationResult.errors);
        // Use sanitized version if available
        if (validationResult.sanitizedPattern) {
          this.currentPattern = validationResult.sanitizedPattern;
        } else {
          throw new Error('Failed to create valid pattern');
        }
      } else {
        this.currentPattern = validationResult.sanitizedPattern || pattern;
      }

      this.currentBank = 0;
      this.chopAssignments.clear();
      
      return {
        success: true,
        pattern: this.currentPattern,
        fixes: validationResult.fixes || [],
        warnings: validationResult.warnings || []
      };

    } catch (error) {
      console.error('Failed to create pattern:', error);
      return {
        success: false,
        error: error.message,
        pattern: null
      };
    }
  }

  /**
   * Create default bank structure
   * @private
   * @returns {Array} Array of bank objects
   */
  createDefaultBanks() {
    const banks = [];
    
    // Initially create 2 banks (A and B), expandable to 4
    for (let bankIndex = 0; bankIndex < 2; bankIndex++) {
      const bankName = String.fromCharCode(65 + bankIndex); // A, B, C, D
      
      banks.push({
        bankId: bankIndex,
        name: `Bank ${bankName}`,
        tracks: this.createDefaultTracks()
      });
    }
    
    return banks;
  }

  /**
   * Create default tracks for a bank
   * @private
   * @returns {Array} Array of track objects
   */
  createDefaultTracks() {
    const tracks = [];
    
    for (let trackIndex = 0; trackIndex < this.tracksPerBank; trackIndex++) {
      tracks.push({
        trackIndex: trackIndex,
        chopId: null, // Will be assigned when chops are available
        steps: new Array(this.stepsPerTrack).fill(false)
      });
    }
    
    return tracks;
  }

  /**
   * Toggle a step on/off
   * @param {number} trackIndex - Track index (0-15)
   * @param {number} stepIndex - Step index (0-15)
   * @returns {void}
   */
  toggleStep(trackIndex, stepIndex) {
    if (!this.currentPattern) {
      throw new Error('No pattern is currently loaded');
    }

    if (trackIndex < 0 || trackIndex >= this.tracksPerBank) {
      throw new Error(`Track index must be between 0 and ${this.tracksPerBank - 1}`);
    }

    if (stepIndex < 0 || stepIndex >= this.stepsPerTrack) {
      throw new Error(`Step index must be between 0 and ${this.stepsPerTrack - 1}`);
    }

    const currentBankData = this.getCurrentBankData();
    if (!currentBankData) {
      throw new Error('Current bank data not found');
    }

    const track = currentBankData.tracks[trackIndex];
    if (!track) {
      throw new Error(`Track ${trackIndex} not found in current bank`);
    }

    // Toggle the step
    track.steps[stepIndex] = !track.steps[stepIndex];

    // Update pattern metadata
    this.currentPattern.metadata.modified = new Date().toISOString();
  }

  /**
   * Set step state
   * @param {number} trackIndex - Track index (0-15)
   * @param {number} stepIndex - Step index (0-15)
   * @param {boolean} active - Step active state
   * @returns {void}
   */
  setStep(trackIndex, stepIndex, active) {
    if (!this.currentPattern) {
      throw new Error('No pattern is currently loaded');
    }

    if (trackIndex < 0 || trackIndex >= this.tracksPerBank) {
      throw new Error(`Track index must be between 0 and ${this.tracksPerBank - 1}`);
    }

    if (stepIndex < 0 || stepIndex >= this.stepsPerTrack) {
      throw new Error(`Step index must be between 0 and ${this.stepsPerTrack - 1}`);
    }

    const currentBankData = this.getCurrentBankData();
    if (!currentBankData) {
      throw new Error('Current bank data not found');
    }

    const track = currentBankData.tracks[trackIndex];
    if (!track) {
      throw new Error(`Track ${trackIndex} not found in current bank`);
    }

    // Set the step
    track.steps[stepIndex] = active;

    // Update pattern metadata
    this.currentPattern.metadata.modified = new Date().toISOString();
  }

  /**
   * Get step state
   * @param {number} trackIndex - Track index (0-15)
   * @param {number} stepIndex - Step index (0-15)
   * @returns {boolean} Step active state
   */
  getStep(trackIndex, stepIndex) {
    if (!this.currentPattern) {
      return false;
    }

    const currentBankData = this.getCurrentBankData();
    if (!currentBankData) {
      return false;
    }

    const track = currentBankData.tracks[trackIndex];
    if (!track || stepIndex < 0 || stepIndex >= track.steps.length) {
      return false;
    }

    return track.steps[stepIndex];
  }

  /**
   * Switch to a different bank
   * @param {number} bankIndex - Bank index (0-3)
   * @returns {void}
   */
  switchBank(bankIndex) {
    if (!this.currentPattern) {
      throw new Error('No pattern is currently loaded');
    }

    if (bankIndex < 0 || bankIndex >= this.currentPattern.banks.length) {
      throw new Error(`Bank index must be between 0 and ${this.currentPattern.banks.length - 1}`);
    }

    this.currentBank = bankIndex;
    this.currentPattern.currentBank = bankIndex;
    
    // Update pattern metadata
    this.currentPattern.metadata.modified = new Date().toISOString();
  }

  /**
   * Get current bank data
   * @returns {Object|null} Current bank data
   */
  getCurrentBankData() {
    if (!this.currentPattern || !this.currentPattern.banks) {
      return null;
    }

    return this.currentPattern.banks[this.currentBank] || null;
  }

  /**
   * Assign chop to track
   * @param {string} chopId - Chop identifier (e.g., 'A0', 'B5')
   * @param {number} trackIndex - Track index (0-15)
   * @returns {void}
   */
  assignChopToTrack(chopId, trackIndex) {
    if (!this.currentPattern) {
      throw new Error('No pattern is currently loaded');
    }

    if (trackIndex < 0 || trackIndex >= this.tracksPerBank) {
      throw new Error(`Track index must be between 0 and ${this.tracksPerBank - 1}`);
    }

    const currentBankData = this.getCurrentBankData();
    if (!currentBankData) {
      throw new Error('Current bank data not found');
    }

    const track = currentBankData.tracks[trackIndex];
    if (!track) {
      throw new Error(`Track ${trackIndex} not found in current bank`);
    }

    // Remove previous assignment if exists
    if (track.chopId) {
      this.chopAssignments.delete(track.chopId);
    }

    // Assign new chop
    track.chopId = chopId;
    if (chopId) {
      this.chopAssignments.set(chopId, trackIndex);
    }

    // Update pattern metadata
    this.currentPattern.metadata.modified = new Date().toISOString();
  }

  /**
   * Auto-assign chops to tracks based on chop data
   * @param {Array} chops - Array of chop objects
   * @returns {void}
   */
  autoAssignChops(chops) {
    if (!this.currentPattern || !Array.isArray(chops)) {
      return;
    }

    // Clear existing assignments
    this.chopAssignments.clear();

    // Group chops by bank
    const chopsByBank = this.groupChopsByBank(chops);

    // Assign chops to each bank
    Object.entries(chopsByBank).forEach(([bankLetter, bankChops]) => {
      const bankIndex = bankLetter.charCodeAt(0) - 65; // A=0, B=1, etc.
      
      if (bankIndex >= 0 && bankIndex < this.currentPattern.banks.length) {
        const bankData = this.currentPattern.banks[bankIndex];
        
        bankChops.forEach((chop, index) => {
          if (index < this.tracksPerBank) {
            const track = bankData.tracks[index];
            track.chopId = chop.padId;
            this.chopAssignments.set(chop.padId, index);
          }
        });
      }
    });

    // Update pattern metadata
    this.currentPattern.metadata.modified = new Date().toISOString();
  }

  /**
   * Group chops by bank letter
   * @private
   * @param {Array} chops - Array of chop objects
   * @returns {Object} Chops grouped by bank letter
   */
  groupChopsByBank(chops) {
    const grouped = {};
    
    chops.forEach(chop => {
      if (chop.padId && typeof chop.padId === 'string') {
        const bankLetter = chop.padId.charAt(0).toUpperCase();
        if (!grouped[bankLetter]) {
          grouped[bankLetter] = [];
        }
        grouped[bankLetter].push(chop);
      }
    });

    // Sort chops within each bank by pad number
    Object.keys(grouped).forEach(bankLetter => {
      grouped[bankLetter].sort((a, b) => {
        const aNum = parseInt(a.padId.slice(1)) || 0;
        const bNum = parseInt(b.padId.slice(1)) || 0;
        return aNum - bNum;
      });
    });

    return grouped;
  }

  /**
   * Get chop assignment for track
   * @param {number} trackIndex - Track index
   * @returns {string|null} Chop ID or null
   */
  getChopForTrack(trackIndex) {
    const currentBankData = this.getCurrentBankData();
    if (!currentBankData) {
      return null;
    }

    const track = currentBankData.tracks[trackIndex];
    return track ? track.chopId : null;
  }

  /**
   * Get track assignment for chop
   * @param {string} chopId - Chop ID
   * @returns {number|null} Track index or null
   */
  getTrackForChop(chopId) {
    return this.chopAssignments.get(chopId) || null;
  }

  /**
   * Get active steps for current step
   * @param {number} stepIndex - Current step index
   * @returns {Array} Array of active track indices
   */
  getActiveStepsForStep(stepIndex) {
    const currentBankData = this.getCurrentBankData();
    if (!currentBankData) {
      return [];
    }

    const activeTracks = [];
    
    currentBankData.tracks.forEach((track, trackIndex) => {
      if (track.steps[stepIndex] && track.chopId) {
        activeTracks.push({
          trackIndex,
          chopId: track.chopId
        });
      }
    });

    return activeTracks;
  }

  /**
   * Clear all steps in current bank
   * @returns {void}
   */
  clearCurrentBank() {
    const currentBankData = this.getCurrentBankData();
    if (!currentBankData) {
      return;
    }

    currentBankData.tracks.forEach(track => {
      track.steps.fill(false);
    });

    // Update pattern metadata
    this.currentPattern.metadata.modified = new Date().toISOString();
  }

  /**
   * Clear all steps in all banks
   * @returns {void}
   */
  clearAllBanks() {
    if (!this.currentPattern) {
      return;
    }

    this.currentPattern.banks.forEach(bank => {
      bank.tracks.forEach(track => {
        track.steps.fill(false);
      });
    });

    // Update pattern metadata
    this.currentPattern.metadata.modified = new Date().toISOString();
  }

  /**
   * Get current pattern
   * @returns {Object|null} Current pattern
   */
  getCurrentPattern() {
    return this.currentPattern;
  }

  /**
   * Set current pattern with enhanced validation and error recovery
   * @param {Object} pattern - Pattern to set as current
   * @param {Object} options - Validation options
   * @returns {Object} Validation result
   */
  setCurrentPattern(pattern, options = {}) {
    const {
      autoFix = true,
      strict = false,
      throwOnError = false
    } = options;

    if (!pattern) {
      this.currentPattern = null;
      this.currentBank = 0;
      this.chopAssignments.clear();
      return { success: true, pattern: null };
    }

    try {
      // Validate and sanitize pattern using enhanced validator
      const validationResult = samplerPatternValidator.validateAndSanitize(pattern, {
        autoFix,
        strict,
        throwOnError
      });

      if (!validationResult.isValid) {
        const errorMessage = `Pattern validation failed: ${validationResult.errors.join(', ')}`;
        
        if (throwOnError) {
          throw new Error(errorMessage);
        }
        
        console.error(errorMessage);
        return {
          success: false,
          errors: validationResult.errors,
          warnings: validationResult.warnings,
          pattern: null
        };
      }

      // Use sanitized pattern
      this.currentPattern = validationResult.sanitizedPattern;
      this.currentBank = this.currentPattern.currentBank || 0;
      this.rebuildChopAssignments();

      // Log fixes and warnings if any
      if (validationResult.fixes.length > 0) {
        console.log('Pattern fixes applied:', validationResult.fixes);
      }
      if (validationResult.warnings.length > 0) {
        console.warn('Pattern validation warnings:', validationResult.warnings);
      }

      return {
        success: true,
        pattern: this.currentPattern,
        fixes: validationResult.fixes,
        warnings: validationResult.warnings
      };

    } catch (error) {
      console.error('Failed to set current pattern:', error);
      
      if (throwOnError) {
        throw error;
      }
      
      return {
        success: false,
        errors: [error.message],
        pattern: null
      };
    }
  }

  /**
   * Rebuild chop assignments from pattern data
   * @private
   * @returns {void}
   */
  rebuildChopAssignments() {
    this.chopAssignments.clear();
    
    if (!this.currentPattern) {
      return;
    }

    this.currentPattern.banks.forEach(bank => {
      bank.tracks.forEach((track, trackIndex) => {
        if (track.chopId) {
          this.chopAssignments.set(track.chopId, trackIndex);
        }
      });
    });
  }

  /**
   * Validate pattern data
   * @param {Object} pattern - Pattern to validate
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

    if (typeof pattern.currentBank !== 'number' || pattern.currentBank < 0) {
      return false;
    }

    // Validate banks
    if (!Array.isArray(pattern.banks) || pattern.banks.length === 0) {
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
   * Validate bank data
   * @private
   * @param {Object} bank - Bank to validate
   * @returns {boolean} Whether bank is valid
   */
  validateBank(bank) {
    if (!bank || typeof bank !== 'object') {
      return false;
    }

    if (typeof bank.bankId !== 'number' || bank.bankId < 0) {
      return false;
    }

    if (!bank.name || typeof bank.name !== 'string') {
      return false;
    }

    if (!Array.isArray(bank.tracks) || bank.tracks.length !== this.tracksPerBank) {
      return false;
    }

    // Validate each track
    for (const track of bank.tracks) {
      if (!this.validateTrack(track)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Validate track data
   * @private
   * @param {Object} track - Track to validate
   * @returns {boolean} Whether track is valid
   */
  validateTrack(track) {
    if (!track || typeof track !== 'object') {
      return false;
    }

    if (typeof track.trackIndex !== 'number' || track.trackIndex < 0) {
      return false;
    }

    if (!Array.isArray(track.steps) || track.steps.length !== this.stepsPerTrack) {
      return false;
    }

    // Validate each step
    for (const step of track.steps) {
      if (typeof step !== 'boolean') {
        return false;
      }
    }

    return true;
  }

  /**
   * Generate a unique pattern ID
   * @private
   * @returns {string} Unique pattern ID
   */
  generatePatternId() {
    return `sampler_pattern_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get pattern statistics
   * @returns {Object} Pattern statistics
   */
  getPatternStats() {
    if (!this.currentPattern) {
      return {
        totalSteps: 0,
        activeSteps: 0,
        assignedTracks: 0,
        totalTracks: 0
      };
    }

    let totalSteps = 0;
    let activeSteps = 0;
    let assignedTracks = 0;
    let totalTracks = 0;

    this.currentPattern.banks.forEach(bank => {
      bank.tracks.forEach(track => {
        totalTracks++;
        totalSteps += track.steps.length;
        
        if (track.chopId) {
          assignedTracks++;
        }
        
        track.steps.forEach(step => {
          if (step) {
            activeSteps++;
          }
        });
      });
    });

    return {
      totalSteps,
      activeSteps,
      assignedTracks,
      totalTracks
    };
  }

  /**
   * Clean up resources
   * @returns {void}
   */
  destroy() {
    this.currentPattern = null;
    this.chopAssignments.clear();
    this.currentBank = 0;
    
    console.log('SamplerPatternManager destroyed');
  }
}

export { SamplerPatternManager };