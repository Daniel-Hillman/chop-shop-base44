/**
 * @fileoverview Sampler Pattern Data Validator
 * Enhanced validation and sanitization for sampler pattern data
 * Requirements: 5.5, 5.6 - Pattern data validation and error handling
 */

/**
 * Comprehensive pattern data validator with error recovery
 */
class SamplerPatternValidator {
  constructor() {
    this.validationRules = {
      pattern: {
        requiredFields: ['id', 'name', 'bpm', 'currentBank', 'banks'],
        bpmRange: { min: 60, max: 200 },
        maxBanks: 4,
        maxNameLength: 100
      },
      bank: {
        requiredFields: ['bankId', 'name', 'tracks'],
        tracksPerBank: 16,
        maxNameLength: 50
      },
      track: {
        requiredFields: ['trackIndex', 'steps'],
        stepsPerTrack: 16
      }
    };

    this.errorCounts = {
      validationErrors: 0,
      sanitizationAttempts: 0,
      recoveryAttempts: 0
    };
  }

  /**
   * Validate and sanitize pattern data
   * @param {Object} pattern - Pattern to validate
   * @param {Object} options - Validation options
   * @returns {Object} Validation result with sanitized data
   */
  validateAndSanitize(pattern, options = {}) {
    const {
      strict = false,
      autoFix = true,
      throwOnError = false
    } = options;

    const result = {
      isValid: false,
      sanitizedPattern: null,
      errors: [],
      warnings: [],
      fixes: []
    };

    try {
      // Basic structure validation
      const structureValidation = this.validateStructure(pattern);
      result.errors.push(...structureValidation.errors);
      result.warnings.push(...structureValidation.warnings);

      if (structureValidation.errors.length > 0 && strict) {
        result.isValid = false;
        if (throwOnError) {
          throw new Error(`Pattern validation failed: ${structureValidation.errors.join(', ')}`);
        }
        return result;
      }

      // Attempt sanitization if auto-fix is enabled
      let sanitizedPattern = pattern;
      if (autoFix && (structureValidation.errors.length > 0 || structureValidation.warnings.length > 0)) {
        const sanitizationResult = this.sanitizePattern(pattern);
        sanitizedPattern = sanitizationResult.pattern;
        result.fixes.push(...sanitizationResult.fixes);
        result.warnings.push(...sanitizationResult.warnings);
        this.errorCounts.sanitizationAttempts++;
      }

      // Validate sanitized pattern
      const finalValidation = this.validateStructure(sanitizedPattern);
      
      if (finalValidation.errors.length === 0) {
        result.isValid = true;
        result.sanitizedPattern = sanitizedPattern;
      } else {
        result.errors.push(...finalValidation.errors);
        
        if (throwOnError) {
          throw new Error(`Pattern validation failed after sanitization: ${finalValidation.errors.join(', ')}`);
        }
      }

      return result;

    } catch (error) {
      this.errorCounts.validationErrors++;
      result.errors.push(`Validation exception: ${error.message}`);
      
      if (throwOnError) {
        throw error;
      }
      
      return result;
    }
  }

  /**
   * Validate pattern structure
   * @private
   * @param {Object} pattern - Pattern to validate
   * @returns {Object} Validation result
   */
  validateStructure(pattern) {
    const errors = [];
    const warnings = [];

    // Null/undefined check
    if (!pattern || typeof pattern !== 'object') {
      errors.push('Pattern must be a valid object');
      return { errors, warnings };
    }

    // Required fields validation
    const missingFields = this.validationRules.pattern.requiredFields.filter(
      field => !(field in pattern)
    );
    if (missingFields.length > 0) {
      errors.push(`Missing required fields: ${missingFields.join(', ')}`);
    }

    // ID validation
    if (pattern.id && (typeof pattern.id !== 'string' || pattern.id.trim().length === 0)) {
      errors.push('Pattern ID must be a non-empty string');
    }

    // Name validation
    if (pattern.name) {
      if (typeof pattern.name !== 'string') {
        errors.push('Pattern name must be a string');
      } else if (pattern.name.length > this.validationRules.pattern.maxNameLength) {
        warnings.push(`Pattern name exceeds maximum length (${this.validationRules.pattern.maxNameLength})`);
      }
    }

    // BPM validation
    if (pattern.bpm !== undefined) {
      if (typeof pattern.bpm !== 'number' || isNaN(pattern.bpm)) {
        errors.push('BPM must be a valid number');
      } else if (pattern.bpm < this.validationRules.pattern.bpmRange.min || 
                 pattern.bpm > this.validationRules.pattern.bpmRange.max) {
        errors.push(`BPM must be between ${this.validationRules.pattern.bpmRange.min} and ${this.validationRules.pattern.bpmRange.max}`);
      }
    }

    // Current bank validation
    if (pattern.currentBank !== undefined) {
      if (typeof pattern.currentBank !== 'number' || pattern.currentBank < 0) {
        errors.push('Current bank must be a non-negative number');
      }
    }

    // Banks validation
    if (pattern.banks) {
      if (!Array.isArray(pattern.banks)) {
        errors.push('Banks must be an array');
      } else {
        if (pattern.banks.length === 0) {
          errors.push('Pattern must have at least one bank');
        } else if (pattern.banks.length > this.validationRules.pattern.maxBanks) {
          warnings.push(`Pattern has more than ${this.validationRules.pattern.maxBanks} banks`);
        }

        // Validate each bank
        pattern.banks.forEach((bank, index) => {
          const bankValidation = this.validateBank(bank, index);
          errors.push(...bankValidation.errors.map(err => `Bank ${index}: ${err}`));
          warnings.push(...bankValidation.warnings.map(warn => `Bank ${index}: ${warn}`));
        });

        // Check current bank index
        if (pattern.currentBank >= pattern.banks.length) {
          errors.push('Current bank index exceeds available banks');
        }
      }
    }

    // Metadata validation
    if (pattern.metadata) {
      if (typeof pattern.metadata !== 'object') {
        warnings.push('Metadata should be an object');
      } else {
        if (pattern.metadata.created && !this.isValidISODate(pattern.metadata.created)) {
          warnings.push('Invalid created date in metadata');
        }
        if (pattern.metadata.modified && !this.isValidISODate(pattern.metadata.modified)) {
          warnings.push('Invalid modified date in metadata');
        }
      }
    }

    return { errors, warnings };
  }

  /**
   * Validate bank structure
   * @private
   * @param {Object} bank - Bank to validate
   * @param {number} index - Bank index
   * @returns {Object} Validation result
   */
  validateBank(bank, index) {
    const errors = [];
    const warnings = [];

    if (!bank || typeof bank !== 'object') {
      errors.push('Bank must be a valid object');
      return { errors, warnings };
    }

    // Required fields
    const missingFields = this.validationRules.bank.requiredFields.filter(
      field => !(field in bank)
    );
    if (missingFields.length > 0) {
      errors.push(`Missing required fields: ${missingFields.join(', ')}`);
    }

    // Bank ID validation
    if (bank.bankId !== undefined) {
      if (typeof bank.bankId !== 'number' || bank.bankId !== index) {
        errors.push(`Bank ID should match index (expected ${index}, got ${bank.bankId})`);
      }
    }

    // Name validation
    if (bank.name) {
      if (typeof bank.name !== 'string') {
        errors.push('Bank name must be a string');
      } else if (bank.name.length > this.validationRules.bank.maxNameLength) {
        warnings.push(`Bank name exceeds maximum length (${this.validationRules.bank.maxNameLength})`);
      }
    }

    // Tracks validation
    if (bank.tracks) {
      if (!Array.isArray(bank.tracks)) {
        errors.push('Tracks must be an array');
      } else {
        if (bank.tracks.length !== this.validationRules.bank.tracksPerBank) {
          errors.push(`Bank must have exactly ${this.validationRules.bank.tracksPerBank} tracks`);
        }

        // Validate each track
        bank.tracks.forEach((track, trackIndex) => {
          const trackValidation = this.validateTrack(track, trackIndex);
          errors.push(...trackValidation.errors.map(err => `Track ${trackIndex}: ${err}`));
          warnings.push(...trackValidation.warnings.map(warn => `Track ${trackIndex}: ${warn}`));
        });
      }
    }

    return { errors, warnings };
  }

  /**
   * Validate track structure
   * @private
   * @param {Object} track - Track to validate
   * @param {number} index - Track index
   * @returns {Object} Validation result
   */
  validateTrack(track, index) {
    const errors = [];
    const warnings = [];

    if (!track || typeof track !== 'object') {
      errors.push('Track must be a valid object');
      return { errors, warnings };
    }

    // Required fields
    const missingFields = this.validationRules.track.requiredFields.filter(
      field => !(field in track)
    );
    if (missingFields.length > 0) {
      errors.push(`Missing required fields: ${missingFields.join(', ')}`);
    }

    // Track index validation
    if (track.trackIndex !== undefined) {
      if (typeof track.trackIndex !== 'number' || track.trackIndex !== index) {
        errors.push(`Track index should match position (expected ${index}, got ${track.trackIndex})`);
      }
    }

    // Chop ID validation
    if (track.chopId !== undefined && track.chopId !== null) {
      if (typeof track.chopId !== 'string' || track.chopId.trim().length === 0) {
        warnings.push('Chop ID should be a non-empty string or null');
      } else if (!/^[A-D]\d{1,2}$/.test(track.chopId)) {
        warnings.push(`Chop ID format may be invalid: ${track.chopId}`);
      }
    }

    // Steps validation
    if (track.steps) {
      if (!Array.isArray(track.steps)) {
        errors.push('Steps must be an array');
      } else {
        if (track.steps.length !== this.validationRules.track.stepsPerTrack) {
          errors.push(`Track must have exactly ${this.validationRules.track.stepsPerTrack} steps`);
        }

        // Validate each step
        track.steps.forEach((step, stepIndex) => {
          if (typeof step !== 'boolean') {
            errors.push(`Step ${stepIndex} must be a boolean value`);
          }
        });
      }
    }

    return { errors, warnings };
  }

  /**
   * Sanitize pattern data by fixing common issues
   * @private
   * @param {Object} pattern - Pattern to sanitize
   * @returns {Object} Sanitization result
   */
  sanitizePattern(pattern) {
    const fixes = [];
    const warnings = [];
    const sanitized = JSON.parse(JSON.stringify(pattern)); // Deep clone

    try {
      // Fix missing or invalid ID
      if (!sanitized.id || typeof sanitized.id !== 'string') {
        sanitized.id = this.generatePatternId();
        fixes.push('Generated new pattern ID');
      }

      // Fix missing or invalid name
      if (!sanitized.name || typeof sanitized.name !== 'string') {
        sanitized.name = 'Untitled Pattern';
        fixes.push('Set default pattern name');
      } else if (sanitized.name.length > this.validationRules.pattern.maxNameLength) {
        sanitized.name = sanitized.name.substring(0, this.validationRules.pattern.maxNameLength);
        fixes.push('Truncated pattern name to maximum length');
      }

      // Fix invalid BPM
      if (typeof sanitized.bpm !== 'number' || isNaN(sanitized.bpm)) {
        sanitized.bpm = 120;
        fixes.push('Set default BPM to 120');
      } else {
        const { min, max } = this.validationRules.pattern.bpmRange;
        if (sanitized.bpm < min) {
          sanitized.bpm = min;
          fixes.push(`Adjusted BPM to minimum value (${min})`);
        } else if (sanitized.bpm > max) {
          sanitized.bpm = max;
          fixes.push(`Adjusted BPM to maximum value (${max})`);
        }
      }

      // Fix current bank
      if (typeof sanitized.currentBank !== 'number' || sanitized.currentBank < 0) {
        sanitized.currentBank = 0;
        fixes.push('Reset current bank to 0');
      }

      // Fix banks array
      if (!Array.isArray(sanitized.banks)) {
        sanitized.banks = this.createDefaultBanks();
        fixes.push('Created default banks structure');
      } else {
        // Ensure at least one bank
        if (sanitized.banks.length === 0) {
          sanitized.banks = this.createDefaultBanks();
          fixes.push('Added default banks (was empty)');
        }

        // Sanitize each bank
        sanitized.banks.forEach((bank, index) => {
          const bankResult = this.sanitizeBank(bank, index);
          sanitized.banks[index] = bankResult.bank;
          fixes.push(...bankResult.fixes.map(fix => `Bank ${index}: ${fix}`));
          warnings.push(...bankResult.warnings.map(warn => `Bank ${index}: ${warn}`));
        });

        // Fix current bank index if out of range
        if (sanitized.currentBank >= sanitized.banks.length) {
          sanitized.currentBank = 0;
          fixes.push('Reset current bank index to valid range');
        }
      }

      // Add or fix metadata
      if (!sanitized.metadata || typeof sanitized.metadata !== 'object') {
        sanitized.metadata = {};
        fixes.push('Added metadata object');
      }

      const now = new Date().toISOString();
      if (!sanitized.metadata.created || !this.isValidISODate(sanitized.metadata.created)) {
        sanitized.metadata.created = now;
        fixes.push('Set creation date');
      }
      
      sanitized.metadata.modified = now;
      fixes.push('Updated modification date');

      return { pattern: sanitized, fixes, warnings };

    } catch (error) {
      warnings.push(`Sanitization error: ${error.message}`);
      return { pattern: sanitized, fixes, warnings };
    }
  }

  /**
   * Sanitize bank data
   * @private
   * @param {Object} bank - Bank to sanitize
   * @param {number} index - Bank index
   * @returns {Object} Sanitization result
   */
  sanitizeBank(bank, index) {
    const fixes = [];
    const warnings = [];
    const sanitized = { ...bank };

    // Fix bank ID
    if (typeof sanitized.bankId !== 'number' || sanitized.bankId !== index) {
      sanitized.bankId = index;
      fixes.push('Fixed bank ID');
    }

    // Fix bank name
    if (!sanitized.name || typeof sanitized.name !== 'string') {
      sanitized.name = `Bank ${String.fromCharCode(65 + index)}`;
      fixes.push('Set default bank name');
    } else if (sanitized.name.length > this.validationRules.bank.maxNameLength) {
      sanitized.name = sanitized.name.substring(0, this.validationRules.bank.maxNameLength);
      fixes.push('Truncated bank name');
    }

    // Fix tracks array
    if (!Array.isArray(sanitized.tracks)) {
      sanitized.tracks = this.createDefaultTracks();
      fixes.push('Created default tracks');
    } else {
      // Ensure correct number of tracks
      while (sanitized.tracks.length < this.validationRules.bank.tracksPerBank) {
        sanitized.tracks.push(this.createDefaultTrack(sanitized.tracks.length));
        fixes.push(`Added missing track ${sanitized.tracks.length - 1}`);
      }

      if (sanitized.tracks.length > this.validationRules.bank.tracksPerBank) {
        sanitized.tracks = sanitized.tracks.slice(0, this.validationRules.bank.tracksPerBank);
        fixes.push('Removed excess tracks');
      }

      // Sanitize each track
      sanitized.tracks.forEach((track, trackIndex) => {
        const trackResult = this.sanitizeTrack(track, trackIndex);
        sanitized.tracks[trackIndex] = trackResult.track;
        fixes.push(...trackResult.fixes.map(fix => `Track ${trackIndex}: ${fix}`));
        warnings.push(...trackResult.warnings.map(warn => `Track ${trackIndex}: ${warn}`));
      });
    }

    return { bank: sanitized, fixes, warnings };
  }

  /**
   * Sanitize track data
   * @private
   * @param {Object} track - Track to sanitize
   * @param {number} index - Track index
   * @returns {Object} Sanitization result
   */
  sanitizeTrack(track, index) {
    const fixes = [];
    const warnings = [];
    const sanitized = { ...track };

    // Fix track index
    if (typeof sanitized.trackIndex !== 'number' || sanitized.trackIndex !== index) {
      sanitized.trackIndex = index;
      fixes.push('Fixed track index');
    }

    // Validate chop ID format
    if (sanitized.chopId !== undefined && sanitized.chopId !== null) {
      if (typeof sanitized.chopId !== 'string' || sanitized.chopId.trim().length === 0) {
        sanitized.chopId = null;
        fixes.push('Cleared invalid chop ID');
      } else if (!/^[A-D]\d{1,2}$/.test(sanitized.chopId)) {
        warnings.push(`Chop ID format may be invalid: ${sanitized.chopId}`);
      }
    }

    // Fix steps array
    if (!Array.isArray(sanitized.steps)) {
      sanitized.steps = new Array(this.validationRules.track.stepsPerTrack).fill(false);
      fixes.push('Created default steps array');
    } else {
      // Ensure correct number of steps
      while (sanitized.steps.length < this.validationRules.track.stepsPerTrack) {
        sanitized.steps.push(false);
        fixes.push(`Added missing step ${sanitized.steps.length - 1}`);
      }

      if (sanitized.steps.length > this.validationRules.track.stepsPerTrack) {
        sanitized.steps = sanitized.steps.slice(0, this.validationRules.track.stepsPerTrack);
        fixes.push('Removed excess steps');
      }

      // Fix non-boolean steps
      sanitized.steps.forEach((step, stepIndex) => {
        if (typeof step !== 'boolean') {
          sanitized.steps[stepIndex] = Boolean(step);
          fixes.push(`Fixed step ${stepIndex} to boolean`);
        }
      });
    }

    return { track: sanitized, fixes, warnings };
  }

  /**
   * Create default banks structure
   * @private
   * @returns {Array} Default banks
   */
  createDefaultBanks() {
    const banks = [];
    for (let i = 0; i < 2; i++) { // Initially 2 banks
      banks.push({
        bankId: i,
        name: `Bank ${String.fromCharCode(65 + i)}`,
        tracks: this.createDefaultTracks()
      });
    }
    return banks;
  }

  /**
   * Create default tracks structure
   * @private
   * @returns {Array} Default tracks
   */
  createDefaultTracks() {
    const tracks = [];
    for (let i = 0; i < this.validationRules.bank.tracksPerBank; i++) {
      tracks.push(this.createDefaultTrack(i));
    }
    return tracks;
  }

  /**
   * Create default track structure
   * @private
   * @param {number} index - Track index
   * @returns {Object} Default track
   */
  createDefaultTrack(index) {
    return {
      trackIndex: index,
      chopId: null,
      steps: new Array(this.validationRules.track.stepsPerTrack).fill(false)
    };
  }

  /**
   * Generate a unique pattern ID
   * @private
   * @returns {string} Unique pattern ID
   */
  generatePatternId() {
    return `sampler_pattern_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Check if a string is a valid ISO date
   * @private
   * @param {string} dateString - Date string to validate
   * @returns {boolean} Whether the date is valid
   */
  isValidISODate(dateString) {
    if (typeof dateString !== 'string') return false;
    const date = new Date(dateString);
    return date instanceof Date && !isNaN(date.getTime()) && date.toISOString() === dateString;
  }

  /**
   * Get validation statistics
   * @returns {Object} Validation statistics
   */
  getStats() {
    return { ...this.errorCounts };
  }

  /**
   * Reset validation statistics
   */
  resetStats() {
    this.errorCounts = {
      validationErrors: 0,
      sanitizationAttempts: 0,
      recoveryAttempts: 0
    };
  }
}

// Create and export singleton instance
const samplerPatternValidator = new SamplerPatternValidator();

export default samplerPatternValidator;
export { SamplerPatternValidator };