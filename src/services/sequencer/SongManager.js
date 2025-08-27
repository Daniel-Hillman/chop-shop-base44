/**
 * @fileoverview Song management service for pattern chaining and song mode
 * Handles song arrangement, pattern sequencing, and transitions
 */

import sequencerMemoryManager from './SequencerMemoryManager.js';

/**
 * Manages song arrangements and pattern chaining
 */
class SongManager {
  constructor() {
    /** @type {Map<string, import('../../types/sequencer.js').Song>} */
    this.songs = new Map();
    
    /** @type {import('../../types/sequencer.js').Song|null} */
    this.currentSong = null;
    
    /** @type {number} */
    this.currentSongPosition = 0;
    
    /** @type {number} */
    this.currentPatternLoop = 0;
    
    /** @type {boolean} */
    this.isSongMode = false;
    
    /** @type {Function[]} */
    this.songChangeCallbacks = [];
    
    /** @type {Function[]} */
    this.patternTransitionCallbacks = [];
    
    /** @type {PatternManager|null} */
    this.patternManager = null;
    
    /** @type {SequencerEngine|null} */
    this.sequencerEngine = null;
    
    /** @type {number|null} */
    this.transitionScheduleId = null;
  }

  /**
   * Initialize the song manager with dependencies
   * @param {Object} dependencies - Service dependencies
   * @returns {void}
   */
  initialize(dependencies = {}) {
    this.patternManager = dependencies.patternManager || null;
    this.sequencerEngine = dependencies.sequencerEngine || null;
    
    // Set up sequencer engine callbacks for pattern transitions
    if (this.sequencerEngine) {
      this.sequencerEngine.onStep((stepIndex, time) => {
        this.handleStepForSongMode(stepIndex, time);
      });
    }
  }

  /**
   * Create a new song arrangement
   * @param {string} name - Song name
   * @param {string[]} patternIds - Array of pattern IDs in sequence
   * @param {Object} options - Song options
   * @returns {import('../../types/sequencer.js').Song}
   */
  createSong(name, patternIds = [], options = {}) {
    if (!name || typeof name !== 'string') {
      throw new Error('Song name is required and must be a string');
    }

    if (!Array.isArray(patternIds)) {
      throw new Error('Pattern IDs must be an array');
    }

    const songId = this.generateSongId();
    const song = {
      id: songId,
      name: name,
      patterns: patternIds.map((patternId, index) => ({
        id: `section_${index}`,
        patternId: patternId,
        loops: options.defaultLoops || 1,
        transitionType: options.defaultTransition || 'immediate',
        transitionBars: options.defaultTransitionBars || 0
      })),
      metadata: {
        created: new Date().toISOString(),
        modified: new Date().toISOString(),
        userId: null,
        bpm: options.bpm || 120,
        totalDuration: 0 // Will be calculated
      }
    };

    this.songs.set(songId, song);
    this.calculateSongDuration(song);
    
    return song;
  }

  /**
   * Load a song and set it as current
   * @param {string} songId - Song ID to load
   * @returns {Promise<import('../../types/sequencer.js').Song>}
   */
  async loadSong(songId) {
    if (!songId || typeof songId !== 'string') {
      throw new Error('Song ID is required and must be a string');
    }

    const song = this.songs.get(songId);
    if (!song) {
      throw new Error(`Song with ID ${songId} not found`);
    }

    // Validate that all patterns exist
    for (const section of song.patterns) {
      if (!this.patternManager || !this.patternManager.patterns.has(section.patternId)) {
        throw new Error(`Pattern ${section.patternId} not found for song ${songId}`);
      }
    }

    this.currentSong = song;
    this.currentSongPosition = 0;
    this.currentPatternLoop = 0;
    
    // Load the first pattern
    if (song.patterns.length > 0) {
      const firstPattern = song.patterns[0];
      await this.patternManager.loadPattern(firstPattern.patternId);
    }

    this.notifySongChange();
    return song;
  }

  /**
   * Enable song mode (pattern chaining)
   * @returns {void}
   */
  enableSongMode() {
    if (!this.currentSong) {
      throw new Error('No song is currently loaded');
    }

    this.isSongMode = true;
    this.currentSongPosition = 0;
    this.currentPatternLoop = 0;
    
    this.notifySongChange();
  }

  /**
   * Disable song mode (single pattern mode)
   * @returns {void}
   */
  disableSongMode() {
    this.isSongMode = false;
    
    // Cancel any pending transitions
    if (this.transitionScheduleId) {
      clearTimeout(this.transitionScheduleId);
      this.transitionScheduleId = null;
    }
    
    this.notifySongChange();
  }

  /**
   * Add pattern to current song
   * @param {string} patternId - Pattern ID to add
   * @param {Object} options - Section options
   * @returns {void}
   */
  addPatternToSong(patternId, options = {}) {
    if (!this.currentSong) {
      throw new Error('No song is currently loaded');
    }

    if (!patternId || typeof patternId !== 'string') {
      throw new Error('Pattern ID is required and must be a string');
    }

    const sectionId = `section_${this.currentSong.patterns.length}`;
    const section = {
      id: sectionId,
      patternId: patternId,
      loops: options.loops || 1,
      transitionType: options.transitionType || 'immediate',
      transitionBars: options.transitionBars || 0
    };

    this.currentSong.patterns.push(section);
    this.currentSong.metadata.modified = new Date().toISOString();
    
    this.calculateSongDuration(this.currentSong);
    this.notifySongChange();
  }

  /**
   * Remove pattern from current song
   * @param {number} index - Index of pattern to remove
   * @returns {void}
   */
  removePatternFromSong(index) {
    if (!this.currentSong) {
      throw new Error('No song is currently loaded');
    }

    if (typeof index !== 'number' || index < 0 || index >= this.currentSong.patterns.length) {
      throw new Error('Invalid pattern index');
    }

    this.currentSong.patterns.splice(index, 1);
    this.currentSong.metadata.modified = new Date().toISOString();
    
    // Adjust current position if necessary
    if (this.currentSongPosition >= index) {
      this.currentSongPosition = Math.max(0, this.currentSongPosition - 1);
    }
    
    this.calculateSongDuration(this.currentSong);
    this.notifySongChange();
  }

  /**
   * Move pattern within song arrangement
   * @param {number} fromIndex - Source index
   * @param {number} toIndex - Destination index
   * @returns {void}
   */
  movePatternInSong(fromIndex, toIndex) {
    if (!this.currentSong) {
      throw new Error('No song is currently loaded');
    }

    const patterns = this.currentSong.patterns;
    if (fromIndex < 0 || fromIndex >= patterns.length || 
        toIndex < 0 || toIndex >= patterns.length) {
      throw new Error('Invalid pattern indices');
    }

    // Move the pattern
    const [movedPattern] = patterns.splice(fromIndex, 1);
    patterns.splice(toIndex, 0, movedPattern);
    
    // Update current position if necessary
    if (this.currentSongPosition === fromIndex) {
      this.currentSongPosition = toIndex;
    } else if (fromIndex < this.currentSongPosition && toIndex >= this.currentSongPosition) {
      this.currentSongPosition--;
    } else if (fromIndex > this.currentSongPosition && toIndex <= this.currentSongPosition) {
      this.currentSongPosition++;
    }
    
    this.currentSong.metadata.modified = new Date().toISOString();
    this.notifySongChange();
  }

  /**
   * Update section properties
   * @param {number} index - Section index
   * @param {Object} updates - Properties to update
   * @returns {void}
   */
  updateSection(index, updates) {
    if (!this.currentSong) {
      throw new Error('No song is currently loaded');
    }

    if (typeof index !== 'number' || index < 0 || index >= this.currentSong.patterns.length) {
      throw new Error('Invalid section index');
    }

    const section = this.currentSong.patterns[index];
    
    if (updates.loops !== undefined) {
      if (typeof updates.loops !== 'number' || updates.loops < 1) {
        throw new Error('Loops must be a positive number');
      }
      section.loops = updates.loops;
    }
    
    if (updates.transitionType !== undefined) {
      if (!['immediate', 'fade', 'crossfade'].includes(updates.transitionType)) {
        throw new Error('Invalid transition type');
      }
      section.transitionType = updates.transitionType;
    }
    
    if (updates.transitionBars !== undefined) {
      if (typeof updates.transitionBars !== 'number' || updates.transitionBars < 0) {
        throw new Error('Transition bars must be a non-negative number');
      }
      section.transitionBars = updates.transitionBars;
    }
    
    this.currentSong.metadata.modified = new Date().toISOString();
    this.calculateSongDuration(this.currentSong);
    this.notifySongChange();
  }

  /**
   * Jump to specific section in song
   * @param {number} sectionIndex - Section index to jump to
   * @returns {Promise<void>}
   */
  async jumpToSection(sectionIndex) {
    if (!this.currentSong || !this.isSongMode) {
      throw new Error('Song mode is not active');
    }

    if (typeof sectionIndex !== 'number' || 
        sectionIndex < 0 || 
        sectionIndex >= this.currentSong.patterns.length) {
      throw new Error('Invalid section index');
    }

    const section = this.currentSong.patterns[sectionIndex];
    
    // Load the pattern for this section
    if (this.patternManager) {
      await this.patternManager.loadPattern(section.patternId);
    }
    
    this.currentSongPosition = sectionIndex;
    this.currentPatternLoop = 0;
    
    // Reset sequencer to beginning of pattern
    if (this.sequencerEngine) {
      this.sequencerEngine.stop();
      if (this.sequencerEngine.isPlaying) {
        await this.sequencerEngine.start();
      }
    }
    
    this.notifySongChange();
  }

  /**
   * Get current song state
   * @returns {Object} Current song state
   */
  getSongState() {
    return {
      currentSong: this.currentSong,
      isSongMode: this.isSongMode,
      currentSongPosition: this.currentSongPosition,
      currentPatternLoop: this.currentPatternLoop,
      totalSections: this.currentSong ? this.currentSong.patterns.length : 0,
      currentSection: this.currentSong ? this.currentSong.patterns[this.currentSongPosition] : null
    };
  }

  /**
   * Handle step events for song mode pattern transitions
   * @private
   * @param {number} stepIndex - Current step index
   * @param {number} time - Step time
   * @returns {void}
   */
  handleStepForSongMode(stepIndex, time) {
    if (!this.isSongMode || !this.currentSong || !this.sequencerEngine) {
      return;
    }

    const currentSection = this.currentSong.patterns[this.currentSongPosition];
    if (!currentSection) {
      return;
    }

    const pattern = this.patternManager?.getCurrentPattern();
    if (!pattern) {
      return;
    }

    // Check if we've completed a pattern loop
    if (stepIndex === 0 && this.currentPatternLoop > 0) {
      this.currentPatternLoop++;
      
      // Check if we need to transition to next section
      if (this.currentPatternLoop >= currentSection.loops) {
        this.schedulePatternTransition(time);
      }
    } else if (stepIndex === 0) {
      // First loop of the pattern
      this.currentPatternLoop = 1;
    }
  }

  /**
   * Schedule transition to next pattern
   * @private
   * @param {number} currentTime - Current audio time
   * @returns {void}
   */
  schedulePatternTransition(currentTime) {
    if (!this.currentSong) {
      return;
    }

    const nextSectionIndex = this.currentSongPosition + 1;
    
    // Check if we've reached the end of the song
    if (nextSectionIndex >= this.currentSong.patterns.length) {
      // Song completed - could loop or stop
      this.handleSongCompletion();
      return;
    }

    const currentSection = this.currentSong.patterns[this.currentSongPosition];
    const nextSection = this.currentSong.patterns[nextSectionIndex];
    
    // Calculate transition timing
    const transitionDelay = this.calculateTransitionDelay(currentSection);
    
    // Schedule the transition
    this.transitionScheduleId = setTimeout(async () => {
      try {
        await this.executePatternTransition(nextSectionIndex, currentSection.transitionType);
      } catch (error) {
        console.error('Error during pattern transition:', error);
      }
    }, transitionDelay);
  }

  /**
   * Execute pattern transition
   * @private
   * @param {number} nextSectionIndex - Index of next section
   * @param {string} transitionType - Type of transition
   * @returns {Promise<void>}
   */
  async executePatternTransition(nextSectionIndex, transitionType) {
    if (!this.currentSong || !this.patternManager) {
      return;
    }

    const nextSection = this.currentSong.patterns[nextSectionIndex];
    
    // Notify transition callbacks
    this.notifyPatternTransition(this.currentSongPosition, nextSectionIndex, transitionType);
    
    // Load next pattern
    await this.patternManager.loadPattern(nextSection.patternId);
    
    // Update position
    this.currentSongPosition = nextSectionIndex;
    this.currentPatternLoop = 0;
    
    // Apply transition effect based on type
    switch (transitionType) {
      case 'immediate':
        // Pattern already loaded, sequencer will continue
        break;
      case 'fade':
        // TODO: Implement fade transition
        break;
      case 'crossfade':
        // TODO: Implement crossfade transition
        break;
    }
    
    this.notifySongChange();
  }

  /**
   * Handle song completion
   * @private
   * @returns {void}
   */
  handleSongCompletion() {
    // For now, just stop the sequencer
    // Could implement song looping or other behaviors
    if (this.sequencerEngine) {
      this.sequencerEngine.stop();
    }
    
    this.currentSongPosition = 0;
    this.currentPatternLoop = 0;
    
    this.notifySongChange();
  }

  /**
   * Calculate transition delay based on section settings
   * @private
   * @param {Object} section - Current section
   * @returns {number} Delay in milliseconds
   */
  calculateTransitionDelay(section) {
    if (section.transitionBars === 0) {
      return 0; // Immediate transition
    }
    
    // Calculate delay based on BPM and transition bars
    const bpm = this.currentSong?.metadata.bpm || 120;
    const barDuration = (60 / bpm) * 4 * 1000; // 4 beats per bar in milliseconds
    
    return section.transitionBars * barDuration;
  }

  /**
   * Calculate total song duration
   * @private
   * @param {import('../../types/sequencer.js').Song} song - Song to calculate
   * @returns {void}
   */
  calculateSongDuration(song) {
    if (!song || !this.patternManager) {
      return;
    }

    let totalDuration = 0;
    const bpm = song.metadata.bpm;
    
    for (const section of song.patterns) {
      try {
        const pattern = this.patternManager.patterns.get(section.patternId);
        if (pattern) {
          const patternDuration = this.calculatePatternDuration(pattern, bpm);
          totalDuration += patternDuration * section.loops;
        }
      } catch (error) {
        console.warn(`Could not calculate duration for pattern ${section.patternId}:`, error);
      }
    }
    
    song.metadata.totalDuration = totalDuration;
  }

  /**
   * Calculate duration of a single pattern
   * @private
   * @param {import('../../types/sequencer.js').Pattern} pattern - Pattern to calculate
   * @param {number} bpm - BPM for calculation
   * @returns {number} Duration in seconds
   */
  calculatePatternDuration(pattern, bpm) {
    const beatsPerMinute = bpm;
    const stepsPerBeat = pattern.stepResolution / 4; // Assuming 4/4 time
    const totalSteps = pattern.stepResolution;
    const totalBeats = totalSteps / stepsPerBeat;
    
    return (totalBeats / beatsPerMinute) * 60; // Convert to seconds
  }

  /**
   * Generate unique song ID
   * @private
   * @returns {string} Unique song ID
   */
  generateSongId() {
    return `song_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Add callback for song changes
   * @param {Function} callback - Callback function
   * @returns {void}
   */
  onSongChange(callback) {
    if (typeof callback === 'function') {
      this.songChangeCallbacks.push(callback);
    }
  }

  /**
   * Add callback for pattern transitions
   * @param {Function} callback - Callback function
   * @returns {void}
   */
  onPatternTransition(callback) {
    if (typeof callback === 'function') {
      this.patternTransitionCallbacks.push(callback);
    }
  }

  /**
   * Remove song change callback
   * @param {Function} callback - Callback to remove
   * @returns {void}
   */
  removeSongChangeCallback(callback) {
    const index = this.songChangeCallbacks.indexOf(callback);
    if (index > -1) {
      this.songChangeCallbacks.splice(index, 1);
    }
  }

  /**
   * Remove pattern transition callback
   * @param {Function} callback - Callback to remove
   * @returns {void}
   */
  removePatternTransitionCallback(callback) {
    const index = this.patternTransitionCallbacks.indexOf(callback);
    if (index > -1) {
      this.patternTransitionCallbacks.splice(index, 1);
    }
  }

  /**
   * Notify song change callbacks
   * @private
   * @returns {void}
   */
  notifySongChange() {
    const state = this.getSongState();
    this.songChangeCallbacks.forEach(callback => {
      try {
        callback(state);
      } catch (error) {
        console.error('Error in song change callback:', error);
      }
    });
  }

  /**
   * Notify pattern transition callbacks
   * @private
   * @param {number} fromSection - Previous section index
   * @param {number} toSection - New section index
   * @param {string} transitionType - Type of transition
   * @returns {void}
   */
  notifyPatternTransition(fromSection, toSection, transitionType) {
    this.patternTransitionCallbacks.forEach(callback => {
      try {
        callback(fromSection, toSection, transitionType);
      } catch (error) {
        console.error('Error in pattern transition callback:', error);
      }
    });
  }

  /**
   * Get all songs
   * @returns {import('../../types/sequencer.js').Song[]}
   */
  getAllSongs() {
    return Array.from(this.songs.values());
  }

  /**
   * Delete a song
   * @param {string} songId - Song ID to delete
   * @returns {boolean} Whether deletion was successful
   */
  deleteSong(songId) {
    if (!songId || typeof songId !== 'string') {
      throw new Error('Song ID is required and must be a string');
    }

    const existed = this.songs.has(songId);
    
    if (existed) {
      this.songs.delete(songId);
      
      // Clear current song if it was the deleted one
      if (this.currentSong && this.currentSong.id === songId) {
        this.currentSong = null;
        this.currentSongPosition = 0;
        this.currentPatternLoop = 0;
        this.isSongMode = false;
      }
    }

    return existed;
  }

  /**
   * Clean up resources
   * @returns {void}
   */
  destroy() {
    // Cancel any pending transitions
    if (this.transitionScheduleId) {
      clearTimeout(this.transitionScheduleId);
      this.transitionScheduleId = null;
    }
    
    // Clear callbacks
    this.songChangeCallbacks = [];
    this.patternTransitionCallbacks = [];
    
    // Reset state
    this.songs.clear();
    this.currentSong = null;
    this.currentSongPosition = 0;
    this.currentPatternLoop = 0;
    this.isSongMode = false;
    this.patternManager = null;
    this.sequencerEngine = null;
  }
}

export { SongManager };