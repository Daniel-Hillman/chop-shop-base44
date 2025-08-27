/**
 * @fileoverview Main sequencer engine service
 * Handles core sequencer functionality including timing, playback control, and coordination
 */

import { AudioScheduler } from './AudioScheduler.js';
import sequencerPerformanceMonitor from './SequencerPerformanceMonitor.js';

/**
 * Main sequencer engine that coordinates all sequencer functionality
 */
class SequencerEngine {
  constructor() {
    /** @type {AudioContext|null} */
    this.audioContext = null;
    
    /** @type {AudioScheduler|null} */
    this.scheduler = null;
    
    /** @type {import('./PatternManager.js').PatternManager|null} */
    this.patternManager = null;
    
    /** @type {import('./SampleManager.js').SampleManager|null} */
    this.sampleManager = null;
    
    /** @type {boolean} */
    this.isPlaying = false;
    
    /** @type {boolean} */
    this.isPaused = false;
    
    /** @type {number} */
    this.currentStep = 0;
    
    /** @type {number} */
    this.nextStepTime = 0;
    
    /** @type {number} */
    this.bpm = 120;
    
    /** @type {number} */
    this.swing = 0;
    
    /** @type {number} */
    this.stepResolution = 16;
    
    /** @type {number|null} */
    this.schedulerIntervalId = null;
    
    /** @type {Function[]} */
    this.stepCallbacks = [];
    
    /** @type {Function[]} */
    this.stateChangeCallbacks = [];
    
    /** @type {Object} */
    this.performanceStats = {
      totalSteps: 0,
      averageLatency: 0,
      maxLatency: 0,
      timingDrift: 0
    };
    
    /** @type {number} */
    this.lastStepTime = 0;
    
    /** @type {boolean} */
    this.isInitialized = false;
  }

  /**
   * Initialize the sequencer engine with required dependencies
   * @param {AudioContext} audioContext - Web Audio API context
   * @param {Object} dependencies - Service dependencies
   * @returns {Promise<void>}
   */
  async initialize(audioContext, dependencies = {}) {
    if (!audioContext) {
      throw new Error('AudioContext is required for SequencerEngine');
    }

    const initStart = sequencerPerformanceMonitor.baseMonitor.startMeasurement('sequencer_engine_init');

    this.audioContext = audioContext;
    
    // Initialize AudioScheduler
    this.scheduler = new AudioScheduler(audioContext);
    this.scheduler.initialize();
    
    // Set up scheduler callbacks
    this.scheduler.onStep = (stepIndex, time) => {
      this.handleStep(stepIndex, time);
    };
    
    this.scheduler.onScheduleNote = (time, sample, velocity, trackId) => {
      this.handleNoteScheduling(time, sample, velocity, trackId);
    };
    
    // Store dependencies
    this.patternManager = dependencies.patternManager || null;
    this.sampleManager = dependencies.sampleManager || null;
    
    // Sync initial state with scheduler
    this.scheduler.setBPM(this.bpm);
    this.scheduler.setSwing(this.swing);
    this.scheduler.setStepResolution(this.stepResolution);
    
    // Start performance monitoring
    sequencerPerformanceMonitor.startMonitoring();
    
    this.isInitialized = true;
    
    initStart({ 
      audioContextState: audioContext.state,
      hasDependencies: !!(dependencies.patternManager && dependencies.sampleManager)
    });
  }

  /**
   * Start sequencer playback
   * @returns {Promise<void>}
   */
  async start() {
    if (!this.isInitialized) {
      throw new Error('SequencerEngine must be initialized before starting');
    }

    if (this.isPlaying) {
      return; // Already playing
    }

    try {
      // Resume audio context if suspended
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      // Reset position if not paused
      if (!this.isPaused) {
        this.currentStep = 0;
        this.resetPerformanceStats();
        
        // Ensure scheduler has clean timing state
        if (this.scheduler) {
          this.scheduler.currentStep = 0;
        }
      }

      // Start the scheduler
      this.scheduler.start();
      
      this.isPlaying = true;
      this.isPaused = false;
      this.lastStepTime = this.audioContext.currentTime;
      
      this.notifyStateChange();
      
    } catch (error) {
      console.error('Error starting sequencer:', error);
      throw error;
    }
  }

  /**
   * Stop sequencer playback and reset position
   * @returns {void}
   */
  stop() {
    if (!this.isPlaying && !this.isPaused) {
      return; // Already stopped
    }

    // Stop the scheduler
    if (this.scheduler) {
      this.scheduler.stop();
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

    // Pause the scheduler
    if (this.scheduler) {
      this.scheduler.pause();
    }

    this.isPlaying = false;
    this.isPaused = true;
    
    this.notifyStateChange();
  }

  /**
   * Resume sequencer playback from current position
   * @returns {Promise<void>}
   */
  async resume() {
    if (!this.isPaused) {
      return; // Not paused
    }

    try {
      // Resume audio context if suspended
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      // Resume the scheduler
      if (this.scheduler) {
        this.scheduler.resume();
      }

      this.isPlaying = true;
      this.isPaused = false;
      this.lastStepTime = this.audioContext.currentTime;
      
      this.notifyStateChange();
      
    } catch (error) {
      console.error('Error resuming sequencer:', error);
      throw error;
    }
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

    // Update scheduler if initialized
    if (this.scheduler) {
      this.scheduler.setBPM(bpm);
      
      // If playing, recalculate the next step time to maintain sync
      if (this.isPlaying) {
        const currentTime = this.audioContext.currentTime;
        const stepDuration = this.scheduler.getStepDuration();
        
        // Align next step time to the new BPM grid
        // This ensures seamless tempo changes without timing drift
        this.scheduler.nextStepTime = currentTime + stepDuration;
      }
    }

    this.notifyStateChange();
  }

  /**
   * Set the swing amount
   * @param {number} swing - Swing percentage (0-100)
   * @returns {void}
   */
  setSwing(swing) {
    if (typeof swing !== 'number' || swing < 0 || swing > 100) {
      throw new Error('Swing must be a number between 0 and 100');
    }

    this.swing = swing;

    // Update scheduler if initialized
    if (this.scheduler) {
      this.scheduler.setSwing(swing);
      // Swing changes don't affect the base timing grid, so no recalculation needed
    }

    this.notifyStateChange();
  }

  /**
   * Set the step resolution
   * @param {number} resolution - Steps per beat (8, 16, 32, or 64)
   * @returns {void}
   */
  setStepResolution(resolution) {
    if (![8, 16, 32, 64].includes(resolution)) {
      throw new Error('Step resolution must be 8, 16, 32, or 64');
    }

    const oldResolution = this.stepResolution;
    this.stepResolution = resolution;

    // Update scheduler if initialized
    if (this.scheduler) {
      this.scheduler.setStepResolution(resolution);
    }

    // Adjust current step position to maintain relative position
    if (this.currentStep > 0) {
      const ratio = resolution / oldResolution;
      this.currentStep = Math.floor(this.currentStep * ratio) % resolution;
    }

    // Notify pattern manager of resolution change
    if (this.patternManager) {
      this.patternManager.updateStepResolution(resolution);
    }

    this.notifyStateChange();
  }

  /**
   * Schedule the next step in the sequence
   * @private
   * @returns {void}
   */
  scheduleNextStep() {
    if (!this.isPlaying || !this.patternManager) {
      return;
    }

    const currentPattern = this.patternManager.getCurrentPattern();
    if (!currentPattern) {
      return;
    }

    // Check if any tracks are soloed
    const soloTracks = currentPattern.tracks.filter(track => track.solo);
    const hasSoloTracks = soloTracks.length > 0;

    // Get active tracks for current step
    const activeTracks = currentPattern.tracks.filter(track => {
      const step = track.steps[this.currentStep];
      if (!step || !step.active) return false;
      
      // If track is explicitly muted, don't play
      if (track.mute) return false;
      
      // If there are solo tracks and this track is not solo, don't play
      if (hasSoloTracks && !track.solo) return false;
      
      // Check sample manager mute state
      if (this.sampleManager?.isTrackMuted(track.id)) return false;
      
      return true;
    });

    // Schedule notes for active tracks
    activeTracks.forEach(track => {
      if (this.sampleManager) {
        const sample = this.sampleManager.getSample(track.sampleId);
        if (sample) {
          const step = track.steps[this.currentStep];
          const baseVelocity = step.velocity * track.volume;
          const trackVolume = this.sampleManager.getTrackVolume(track.id);
          const velocity = baseVelocity * trackVolume;
          
          // Apply randomization if enabled
          this.scheduler.scheduleNote(
            this.nextStepTime,
            sample,
            velocity,
            track.randomization,
            track.id
          );
        }
      }
    });
  }

  /**
   * Get current sequencer state
   * @returns {import('../../types/sequencer.js').SequencerState}
   */
  getState() {
    return {
      isPlaying: this.isPlaying,
      isPaused: this.isPaused,
      currentStep: this.currentStep,
      bpm: this.bpm,
      swing: this.swing,
      stepResolution: this.stepResolution,
      nextStepTime: this.nextStepTime,
      isInitialized: this.isInitialized,
      performanceStats: { ...this.performanceStats }
    };
  }

  /**
   * Clean up resources and stop all processes
   * @returns {void}
   */
  destroy() {
    // Stop playback
    this.stop();

    // Clean up scheduler
    if (this.scheduler) {
      this.scheduler.destroy();
      this.scheduler = null;
    }

    // Clear callbacks
    this.stepCallbacks = [];
    this.stateChangeCallbacks = [];

    // Reset state
    this.audioContext = null;
    this.patternManager = null;
    this.sampleManager = null;
    this.isInitialized = false;
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
   * Handle step events from scheduler
   * @private
   * @param {number} stepIndex - Current step index
   * @param {number} time - Step time
   */
  handleStep(stepIndex, time) {
    const startTime = performance.now();
    const expectedTime = this.calculateExpectedStepTime(stepIndex);
    
    this.currentStep = stepIndex;
    this.nextStepTime = time;
    
    // Record timing accuracy
    sequencerPerformanceMonitor.recordTimingAccuracy(expectedTime, time, stepIndex);
    
    // Schedule notes for this step
    this.scheduleNextStep();
    
    // Update performance stats
    const latency = performance.now() - startTime;
    this.updatePerformanceStats(latency, time);
    
    // Notify step callbacks
    this.stepCallbacks.forEach(callback => {
      try {
        callback(stepIndex, time);
      } catch (error) {
        console.error('Error in step callback:', error);
      }
    });
  }

  /**
   * Handle note scheduling from scheduler
   * @private
   * @param {number} time - Schedule time
   * @param {Object} sample - Sample to play
   * @param {number} velocity - Note velocity
   * @param {string} [trackId] - Track ID for volume control
   */
  handleNoteScheduling(time, sample, velocity, trackId = null) {
    const scheduleStart = performance.now();
    
    // Delegate to SampleManager for actual playback
    if (this.sampleManager && sample) {
      this.sampleManager.scheduleNote(time, sample, velocity, trackId);
      
      // Record audio latency (approximate - actual play time would need to be measured in audio callback)
      const approximatePlayTime = time;
      sequencerPerformanceMonitor.recordAudioLatency(time, approximatePlayTime, trackId);
    }
    
    // Record scheduling performance
    const schedulingLatency = performance.now() - scheduleStart;
    sequencerPerformanceMonitor.baseMonitor.recordMetric('sequencer_note_scheduling', schedulingLatency, {
      trackId,
      velocity,
      hasScheduler: !!this.sampleManager
    });
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
      const expectedInterval = this.scheduler ? this.scheduler.getStepDuration() : 0;
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

  /**
   * Calculate expected step time based on BPM and step resolution
   * @private
   * @param {number} stepIndex - Step index
   * @returns {number} Expected time
   */
  calculateExpectedStepTime(stepIndex) {
    if (!this.scheduler) return 0;
    
    const stepDuration = this.scheduler.getStepDuration();
    const startTime = this.audioContext.currentTime - (this.currentStep * stepDuration);
    return startTime + (stepIndex * stepDuration);
  }
}

export { SequencerEngine };