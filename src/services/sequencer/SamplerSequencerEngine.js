/**
 * @fileoverview Sampler Drum Sequencer Engine
 * Lightweight sequencer engine specifically designed for YouTube chop triggering
 * Reuses core timing logic from SequencerEngine but optimized for video player control
 */

/**
 * Lightweight sequencer engine for sampler drum sequencer
 * Controls YouTube video playback instead of audio scheduling
 */
class SamplerSequencerEngine {
  constructor() {
    /** @type {boolean} */
    this.isPlaying = false;
    
    /** @type {boolean} */
    this.isPaused = false;
    
    /** @type {number} */
    this.currentStep = 0;
    
    /** @type {number} */
    this.bpm = 160; // Ultra-fast BPM for tight loops
    
    /** @type {number} */
    this.stepResolution = 16; // 16 steps per pattern
    
    /** @type {number|null} */
    this.intervalId = null;
    
    /** @type {number} */
    this.nextStepTime = 0;
    
    /** @type {number} */
    this.startTime = 0;
    
    /** @type {Function[]} */
    this.stepCallbacks = [];
    
    /** @type {Function[]} */
    this.stateChangeCallbacks = [];
    
    /** @type {Object|null} */
    this.youtubePlayer = null;
    
    /** @type {boolean} */
    this.isInitialized = false;
    
    /** @type {Object} */
    this.performanceStats = {
      totalSteps: 0,
      averageLatency: 0,
      maxLatency: 0,
      timingDrift: 0
    };
    
    /** @type {number} */
    this.lastStepTime = 0;
  }

  /**
   * Initialize the sampler sequencer engine
   * @param {Object} youtubePlayer - YouTube player instance
   * @returns {void}
   */
  initialize(youtubePlayer) {
    if (!youtubePlayer) {
      throw new Error('YouTube player is required for SamplerSequencerEngine');
    }

    this.youtubePlayer = youtubePlayer;
    this.isInitialized = true;
  }

  /**
   * Start sequencer playback
   * @returns {void}
   */
  start() {
    if (!this.isInitialized) {
      throw new Error('SamplerSequencerEngine must be initialized before starting');
    }

    if (this.isPlaying) {
      return; // Already playing
    }

    // Reset position if not paused
    if (!this.isPaused) {
      this.currentStep = 0;
      this.resetPerformanceStats();
    }

    this.startTime = performance.now();
    this.nextStepTime = this.startTime;
    this.isPlaying = true;
    this.isPaused = false;
    
    this.scheduleNextStep();
    this.notifyStateChange();
  }

  /**
   * Stop sequencer playback and reset position
   * @returns {void}
   */
  stop() {
    if (!this.isPlaying && !this.isPaused) {
      return; // Already stopped
    }

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    this.isPlaying = false;
    this.isPaused = false;
    this.currentStep = 0;
    this.nextStepTime = 0;
    
    this.notifyStateChange();
  }

  /**
   * Pause sequencer playback without resetting position
   * @returns {void}
   */
  pause() {
    if (!this.isPlaying) {
      return; // Not playing
    }

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    this.isPlaying = false;
    this.isPaused = true;
    
    this.notifyStateChange();
  }

  /**
   * Resume sequencer playback from current position
   * @returns {void}
   */
  resume() {
    if (!this.isPaused) {
      return; // Not paused
    }

    this.startTime = performance.now() - (this.currentStep * this.getStepDuration());
    this.nextStepTime = performance.now();
    this.isPlaying = true;
    this.isPaused = false;
    
    this.scheduleNextStep();
    this.notifyStateChange();
  }

  /**
   * Set the BPM (beats per minute)
   * @param {number} bpm - New BPM value (60-200)
   * @returns {void}
   */
  setBPM(bpm) {
    if (typeof bpm !== 'number' || bpm < 60 || bpm > 200) {
      throw new Error('BPM must be a number between 60 and 200');
    }

    this.bpm = bpm;

    // If playing, recalculate timing to maintain sync
    if (this.isPlaying) {
      const currentTime = performance.now();
      const stepDuration = this.getStepDuration();
      
      // Adjust start time to maintain current step position
      this.startTime = currentTime - (this.currentStep * stepDuration);
      this.nextStepTime = currentTime + stepDuration;
    }

    this.notifyStateChange();
  }

  /**
   * Get step duration in milliseconds
   * @returns {number} Step duration in milliseconds
   */
  getStepDuration() {
    // Optimized step duration calculation for faster loops
    // 16 steps = 1 bar, so each step is 1/16 of a bar
    const millisecondsPerBeat = 60000 / this.bpm;
    const millisecondsPerBar = millisecondsPerBeat * 4; // 4 beats per bar
    return millisecondsPerBar / 16; // 16 steps per bar
  }

  /**
   * Schedule the next step with high-precision timing
   * @private
   * @returns {void}
   */
  scheduleNextStep() {
    if (!this.isPlaying) {
      return;
    }

    // Use setInterval for consistent timing (zero-delay optimization)
    const stepDuration = this.getStepDuration();
    this.intervalId = setInterval(() => {
      if (!this.isPlaying) {
        clearInterval(this.intervalId);
        return;
      }
      this.handleStep();
    }, stepDuration);
  }

  /**
   * Handle step execution - Ultra fast, no logging
   * @private
   * @returns {void}
   */
  handleStep() {
    const currentTime = performance.now();
    const currentStep = this.currentStep;

    // Fast callback execution - no logging
    this.stepCallbacks.forEach(callback => {
      callback(currentStep, currentTime);
    });

    // Advance to next step
    this.currentStep = (this.currentStep + 1) % this.stepResolution;
  }

  /**
   * Jump YouTube player to timestamp with enhanced error handling
   * @param {number} timestamp - Timestamp in seconds
   * @param {boolean} maintainPlayback - Whether to maintain current playback state
   * @returns {Promise<boolean>} Whether jump was successful
   */
  async jumpToTimestamp(timestamp, maintainPlayback = true) {
    if (!this.youtubePlayer) {
      console.warn('YouTube player not available for timestamp jump');
      return false;
    }

    try {
      // If using YouTubePlayerInterface, use its enhanced method
      if (this.youtubePlayer.jumpToTimestamp) {
        return await this.youtubePlayer.jumpToTimestamp(timestamp, true, maintainPlayback);
      }
      
      // Fallback to direct player control
      if (this.youtubePlayer.seekTo) {
        this.youtubePlayer.seekTo(timestamp, true);
        console.log(`Jumped to timestamp: ${timestamp}s`);
        return true;
      }
      
      console.warn('YouTube player does not support seeking');
      return false;
    } catch (error) {
      console.error('Failed to jump to timestamp:', error);
      return false;
    }
  }

  /**
   * Synchronize sequencer state with YouTube player
   * @returns {Promise<boolean>} Whether synchronization was successful
   */
  async synchronizeWithPlayer() {
    if (!this.youtubePlayer) {
      return false;
    }

    try {
      // If using YouTubePlayerInterface, get detailed state
      if (this.youtubePlayer.getDetailedPlayerState) {
        const playerState = this.youtubePlayer.getDetailedPlayerState();
        
        return playerState.isReady;
      }
      
      // Fallback to basic state check
      if (this.youtubePlayer.getPlayerState) {
        const state = this.youtubePlayer.getPlayerState();
        return state !== -1; // Not unstarted
      }
      
      return true; // Assume ready if no state methods available
    } catch (error) {
      console.error('Failed to synchronize with player:', error);
      return false;
    }
  }

  /**
   * Get current sequencer state
   * @returns {Object} Current state
   */
  getState() {
    return {
      isPlaying: this.isPlaying,
      isPaused: this.isPaused,
      currentStep: this.currentStep,
      bpm: this.bpm,
      stepResolution: this.stepResolution,
      isInitialized: this.isInitialized,
      performanceStats: { ...this.performanceStats }
    };
  }

  /**
   * Add callback for step events
   * @param {Function} callback - Callback function (stepIndex, time) => void
   */
  onStep(callback) {
    if (typeof callback === 'function') {
      this.stepCallbacks.push(callback);
    }
  }

  /**
   * Add callback for state changes
   * @param {Function} callback - Callback function (state) => void
   */
  onStateChange(callback) {
    if (typeof callback === 'function') {
      this.stateChangeCallbacks.push(callback);
    }
  }

  /**
   * Remove step callback
   * @param {Function} callback - Callback to remove
   */
  removeStepCallback(callback) {
    const index = this.stepCallbacks.indexOf(callback);
    if (index > -1) {
      this.stepCallbacks.splice(index, 1);
    }
  }

  /**
   * Remove state change callback
   * @param {Function} callback - Callback to remove
   */
  removeStateChangeCallback(callback) {
    const index = this.stateChangeCallbacks.indexOf(callback);
    if (index > -1) {
      this.stateChangeCallbacks.splice(index, 1);
    }
  }

  /**
   * Clean up resources and stop all processes
   * @returns {void}
   */
  destroy() {
    this.stop();
    
    // Clear callbacks
    this.stepCallbacks = [];
    this.stateChangeCallbacks = [];
    
    // Reset state
    this.youtubePlayer = null;
    this.isInitialized = false;
  }

  /**
   * Notify state change callbacks
   * @private
   */
  notifyStateChange() {
    const state = this.getState();
    this.stateChangeCallbacks.forEach(callback => {
      try {
        callback(state);
      } catch (error) {
        console.error('Error in state change callback:', error);
      }
    });
  }

  /**
   * Update performance statistics
   * @private
   * @param {number} latency - Processing latency
   * @param {number} time - Current time
   */
  updatePerformanceStats(latency, time) {
    this.performanceStats.totalSteps++;
    
    // Update average latency
    const total = this.performanceStats.averageLatency * (this.performanceStats.totalSteps - 1);
    this.performanceStats.averageLatency = (total + latency) / this.performanceStats.totalSteps;
    
    // Update max latency
    if (latency > this.performanceStats.maxLatency) {
      this.performanceStats.maxLatency = latency;
    }
    
    // Calculate timing drift
    if (this.lastStepTime > 0) {
      const expectedInterval = this.getStepDuration();
      const actualInterval = time - this.lastStepTime;
      const drift = Math.abs(actualInterval - expectedInterval);
      this.performanceStats.timingDrift = Math.max(this.performanceStats.timingDrift, drift);
    }
    
    this.lastStepTime = time;
  }

  /**
   * Reset performance statistics
   * @private
   */
  resetPerformanceStats() {
    this.performanceStats = {
      totalSteps: 0,
      averageLatency: 0,
      maxLatency: 0,
      timingDrift: 0
    };
    this.lastStepTime = 0;
  }

  /**
   * Get performance statistics
   * @returns {Object} Performance stats
   */
  getPerformanceStats() {
    return { ...this.performanceStats };
  }
}

export { SamplerSequencerEngine };