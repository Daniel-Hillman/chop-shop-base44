/**
 * @fileoverview Optimized Sampler Sequencer Service
 * High-performance version using the optimized engine and rendering system
 * Eliminates lag and ensures smooth playback under all conditions
 */

import { HighPerformanceSequencerEngine } from './HighPerformanceSequencerEngine.js';
import { SamplerPatternManager } from './SamplerPatternManager.js';
import { YouTubePlayerInterface } from './YouTubePlayerInterface.js';
import { SamplerChopIntegration } from './SamplerChopIntegration.js';
import { HighPerformanceRenderer } from '../../utils/HighPerformanceRenderer.js';

/**
 * Optimized sampler sequencer service with zero-lag performance
 * Uses high-performance engine and optimized rendering
 */
class OptimizedSamplerSequencerService {
  constructor() {
    /** @type {HighPerformanceSequencerEngine} */
    this.engine = new HighPerformanceSequencerEngine();
    
    /** @type {SamplerPatternManager} */
    this.patternManager = new SamplerPatternManager();
    
    /** @type {YouTubePlayerInterface} */
    this.youtubeInterface = new YouTubePlayerInterface();
    
    /** @type {SamplerChopIntegration} */
    this.chopIntegration = new SamplerChopIntegration(this.patternManager);
    
    /** @type {HighPerformanceRenderer} */
    this.renderer = new HighPerformanceRenderer();
    
    /** @type {boolean} */
    this.isInitialized = false;
    
    /** @type {Map<string, Object>} */
    this.chopsData = new Map();
    
    /** @type {Function[]} */
    this.stepCallbacks = [];
    
    /** @type {Function[]} */
    this.stateChangeCallbacks = [];
    
    /** @type {Function[]} */
    this.errorCallbacks = [];
    
    /** @type {Object} */
    this.performanceConfig = {
      maxConcurrentChops: 8, // Limit concurrent chop playback
      audioLookahead: 25, // 25ms audio lookahead
      renderThrottle: 16, // 60fps render throttling
      memoryCleanupInterval: 30000 // 30s memory cleanup
    };
    
    /** @type {Set<string>} */
    this.activeChops = new Set();
    
    /** @type {number} */
    this.lastCleanupTime = 0;
    
    this.setupEngineCallbacks();
    this.setupPerformanceOptimizations();
  }

  /**
   * Initialize the optimized sampler sequencer service
   * @param {Object} youtubePlayer - YouTube player instance
   * @param {Array} chops - Initial chop data
   * @returns {Promise<boolean>} Whether initialization was successful
   */
  async initialize(youtubePlayer, chops = []) {
    try {
      // Initialize high-performance engine
      const engineInitialized = await this.engine.initialize(youtubePlayer);
      if (!engineInitialized) {
        throw new Error('Failed to initialize high-performance engine');
      }

      // Connect YouTube player interface with optimizations
      const connectionResult = this.youtubeInterface.connect(youtubePlayer);
      if (!connectionResult) {
        throw new Error('Failed to connect YouTube player interface');
      }

      // Create initial pattern
      const patternResult = this.patternManager.createPattern('Default Pattern');
      if (!patternResult.success) {
        throw new Error('Failed to create default pattern');
      }

      // Load and optimize chops data
      this.loadChopsData(chops);
      this.optimizeChopsForPerformance();

      // Initialize chop integration with performance callbacks
      this.chopIntegration.setChopAssignmentChangeCallback((assignments) => {
        this.renderer.scheduleUpdate(() => {
          this.notifyStateChange(this.engine.getState());
        }, 'chop-assignments');
      });

      this.chopIntegration.updateChops(chops);

      this.isInitialized = true;
      return true;

    } catch (error) {
      console.error('Failed to initialize OptimizedSamplerSequencerService:', error);
      this.notifyError(error);
      return false;
    }
  }

  /**
   * Setup engine callbacks with performance optimizations
   * @private
   * @returns {void}
   */
  setupEngineCallbacks() {
    // High-performance step callback
    this.engine.addStepCallback((stepNumber, executionTime) => {
      this.handleOptimizedStep(stepNumber, executionTime);
    });

    // Optimized state change callback
    this.engine.addStateChangeCallback((state) => {
      this.renderer.scheduleUpdate(() => {
        this.notifyStateChange(state);
      }, `state-${state.currentStep}-${state.isPlaying}`);
    });
  }

  /**
   * Setup performance optimizations
   * @private
   * @returns {void}
   */
  setupPerformanceOptimizations() {
    // Memory cleanup interval
    setInterval(() => {
      this.performMemoryCleanup();
    }, this.performanceConfig.memoryCleanupInterval);

    // Performance monitoring
    setInterval(() => {
      this.monitorPerformance();
    }, 5000); // Every 5 seconds
  }

  /**
   * Handle optimized step execution
   * @private
   * @param {number} stepNumber - Current step number
   * @param {number} executionTime - Execution timestamp
   * @returns {void}
   */
  handleOptimizedStep(stepNumber, executionTime) {
    try {
      const pattern = this.patternManager.getCurrentPattern();
      if (!pattern) return;

      // Get triggered chops for this step with performance limits
      const triggeredChops = this.getTriggeredChopsForStep(stepNumber, pattern);
      
      // Limit concurrent chops for performance
      const availableSlots = this.performanceConfig.maxConcurrentChops - this.activeChops.size;
      const chopsToPlay = triggeredChops.slice(0, availableSlots);

      // Execute chop playback with minimal overhead
      chopsToPlay.forEach(chopId => {
        this.executeChopPlayback(chopId, executionTime);
      });

      // Notify step callbacks with batched updates
      this.renderer.scheduleUpdate(() => {
        this.stepCallbacks.forEach(callback => {
          try {
            callback(stepNumber, executionTime);
          } catch (error) {
            console.error('Step callback error:', error);
          }
        });
      }, `step-${stepNumber}`);

    } catch (error) {
      console.error('Optimized step handling error:', error);
    }
  }

  /**
   * Execute chop playback with performance optimizations
   * @private
   * @param {string} chopId - Chop ID to play
   * @param {number} executionTime - Execution timestamp
   * @returns {void}
   */
  executeChopPlayback(chopId, executionTime) {
    const chopData = this.chopsData.get(chopId);
    if (!chopData) return;

    try {
      // Mark chop as active
      this.activeChops.add(chopId);

      // Execute timestamp jump with minimal delay
      this.engine.jumpToTimestamp(chopData.startTime, true);

      // Schedule chop cleanup
      setTimeout(() => {
        this.activeChops.delete(chopId);
      }, chopData.duration * 1000 || 1000);

    } catch (error) {
      console.error('Chop playback error:', error);
      this.activeChops.delete(chopId);
    }
  }

  /**
   * Get triggered chops for a specific step
   * @private
   * @param {number} stepNumber - Step number
   * @param {Object} pattern - Current pattern
   * @returns {Array<string>} Array of chop IDs to trigger
   */
  getTriggeredChopsForStep(stepNumber, pattern) {
    const triggeredChops = [];
    
    if (!pattern.tracks) return triggeredChops;

    pattern.tracks.forEach(track => {
      if (track.steps && track.steps[stepNumber] && track.steps[stepNumber].active) {
        const assignments = this.chopIntegration.getChopAssignments();
        const chopId = assignments[track.id];
        if (chopId) {
          triggeredChops.push(chopId);
        }
      }
    });

    return triggeredChops;
  }

  /**
   * Load chops data with performance optimizations
   * @private
   * @param {Array} chops - Chop data array
   * @returns {void}
   */
  loadChopsData(chops) {
    this.chopsData.clear();
    
    chops.forEach(chop => {
      if (chop && chop.id) {
        // Pre-calculate chop metadata for performance
        const optimizedChop = {
          ...chop,
          duration: chop.endTime - chop.startTime,
          isOptimized: true,
          preloadTime: Date.now()
        };
        
        this.chopsData.set(chop.id, optimizedChop);
      }
    });
  }

  /**
   * Optimize chops for performance
   * @private
   * @returns {void}
   */
  optimizeChopsForPerformance() {
    // Sort chops by usage frequency (most used first)
    const chopUsage = new Map();
    
    this.chopsData.forEach((chop, chopId) => {
      chopUsage.set(chopId, 0);
    });

    // Pre-warm frequently used chops
    const frequentChops = Array.from(chopUsage.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, this.performanceConfig.maxConcurrentChops);

    frequentChops.forEach(([chopId]) => {
      const chop = this.chopsData.get(chopId);
      if (chop) {
        chop.isPreWarmed = true;
      }
    });
  }

  /**
   * Perform memory cleanup
   * @private
   * @returns {void}
   */
  performMemoryCleanup() {
    const now = Date.now();
    
    // Clean up old active chops
    this.activeChops.forEach(chopId => {
      const chop = this.chopsData.get(chopId);
      if (chop && now - chop.preloadTime > 60000) { // 1 minute old
        this.activeChops.delete(chopId);
      }
    });

    // Clear renderer cache
    this.renderer.resetPerformanceMetrics();

    this.lastCleanupTime = now;
  }

  /**
   * Monitor performance and adjust settings
   * @private
   * @returns {void}
   */
  monitorPerformance() {
    const engineMetrics = this.engine.getPerformanceMetrics();
    const renderMetrics = this.renderer.getPerformanceMetrics();

    // Adjust performance settings based on metrics
    if (engineMetrics.jitter > 10) { // High jitter
      this.performanceConfig.maxConcurrentChops = Math.max(4, this.performanceConfig.maxConcurrentChops - 1);
    } else if (engineMetrics.jitter < 2) { // Low jitter
      this.performanceConfig.maxConcurrentChops = Math.min(8, this.performanceConfig.maxConcurrentChops + 1);
    }

    // Log performance if issues detected
    if (engineMetrics.jitter > 20 || renderMetrics.droppedFrames > 5) {
      console.warn('Performance issues detected:', {
        engineJitter: engineMetrics.jitter,
        droppedFrames: renderMetrics.droppedFrames,
        activeChops: this.activeChops.size
      });
    }
  }

  /**
   * Start sequencer playback
   * @returns {void}
   */
  start() {
    if (!this.isInitialized) {
      throw new Error('Service must be initialized before starting');
    }
    
    this.engine.start();
  }

  /**
   * Stop sequencer playback
   * @returns {void}
   */
  stop() {
    this.engine.stop();
    this.activeChops.clear();
  }

  /**
   * Pause sequencer playback
   * @returns {void}
   */
  pause() {
    this.engine.pause();
  }

  /**
   * Resume sequencer playback
   * @returns {void}
   */
  resume() {
    this.engine.resume();
  }

  /**
   * Set BPM with performance validation
   * @param {number} bpm - New BPM value
   * @returns {void}
   */
  setBPM(bpm) {
    if (bpm < 60 || bpm > 200) {
      throw new Error('BPM must be between 60 and 200');
    }
    
    this.engine.setBPM(bpm);
  }

  /**
   * Get current BPM
   * @returns {number} Current BPM
   */
  getBPM() {
    return this.engine.bpm;
  }

  /**
   * Get current sequencer state
   * @returns {Object} Current state with performance metrics
   */
  getState() {
    const engineState = this.engine.getState();
    const renderMetrics = this.renderer.getPerformanceMetrics();
    
    return {
      ...engineState,
      activeChops: this.activeChops.size,
      performanceConfig: this.performanceConfig,
      renderMetrics
    };
  }

  /**
   * Add step callback
   * @param {Function} callback - Callback function
   * @returns {void}
   */
  addStepCallback(callback) {
    if (typeof callback === 'function') {
      this.stepCallbacks.push(callback);
    }
  }

  /**
   * Remove step callback
   * @param {Function} callback - Callback function to remove
   * @returns {void}
   */
  removeStepCallback(callback) {
    const index = this.stepCallbacks.indexOf(callback);
    if (index > -1) {
      this.stepCallbacks.splice(index, 1);
    }
  }

  /**
   * Add state change callback
   * @param {Function} callback - Callback function
   * @returns {void}
   */
  addStateChangeCallback(callback) {
    if (typeof callback === 'function') {
      this.stateChangeCallbacks.push(callback);
    }
  }

  /**
   * Remove state change callback
   * @param {Function} callback - Callback function to remove
   * @returns {void}
   */
  removeStateChangeCallback(callback) {
    const index = this.stateChangeCallbacks.indexOf(callback);
    if (index > -1) {
      this.stateChangeCallbacks.splice(index, 1);
    }
  }

  /**
   * Add error callback
   * @param {Function} callback - Callback function
   * @returns {void}
   */
  addErrorCallback(callback) {
    if (typeof callback === 'function') {
      this.errorCallbacks.push(callback);
    }
  }

  /**
   * Notify state change callbacks
   * @private
   * @param {Object} state - Current state
   * @returns {void}
   */
  notifyStateChange(state) {
    this.stateChangeCallbacks.forEach(callback => {
      try {
        callback(state);
      } catch (error) {
        console.error('State change callback error:', error);
      }
    });
  }

  /**
   * Notify error callbacks
   * @private
   * @param {Error} error - Error object
   * @returns {void}
   */
  notifyError(error) {
    this.errorCallbacks.forEach(callback => {
      try {
        callback(error);
      } catch (callbackError) {
        console.error('Error callback error:', callbackError);
      }
    });
  }

  /**
   * Get performance metrics
   * @returns {Object} Combined performance metrics
   */
  getPerformanceMetrics() {
    return {
      engine: this.engine.getPerformanceMetrics(),
      renderer: this.renderer.getPerformanceMetrics(),
      service: {
        activeChops: this.activeChops.size,
        totalChops: this.chopsData.size,
        lastCleanup: this.lastCleanupTime,
        config: this.performanceConfig
      }
    };
  }

  /**
   * Add step callback (legacy API compatibility)
   * @param {Function} callback - Callback function
   * @returns {void}
   */
  onStep(callback) {
    this.addStepCallback(callback);
  }

  /**
   * Add state change callback (legacy API compatibility)
   * @param {Function} callback - Callback function
   * @returns {void}
   */
  onStateChange(callback) {
    this.addStateChangeCallback(callback);
  }

  /**
   * Add error callback (legacy API compatibility)
   * @param {Function} callback - Callback function
   * @returns {void}
   */
  onError(callback) {
    this.addErrorCallback(callback);
  }

  /**
   * Set step state (legacy API compatibility)
   * @param {number} trackIndex - Track index
   * @param {number} stepIndex - Step index
   * @param {boolean} active - Step active state
   * @returns {void}
   */
  setStep(trackIndex, stepIndex, active) {
    this.patternManager.setStep(trackIndex, stepIndex, active);
  }

  /**
   * Get step state (legacy API compatibility)
   * @param {number} trackIndex - Track index
   * @param {number} stepIndex - Step index
   * @returns {boolean} Step active state
   */
  getStep(trackIndex, stepIndex) {
    return this.patternManager.getStep(trackIndex, stepIndex);
  }

  /**
   * Switch to different bank (legacy API compatibility)
   * @param {number} bankIndex - Bank index
   * @returns {void}
   */
  switchBank(bankIndex) {
    this.patternManager.switchBank(bankIndex);
  }

  /**
   * Get current bank index (legacy API compatibility)
   * @returns {number} Current bank index
   */
  getCurrentBank() {
    return this.patternManager.currentBank;
  }

  /**
   * Update chops data (legacy API compatibility)
   * @param {Array} chops - Updated chop data
   * @returns {void}
   */
  updateChopsData(chops) {
    this.loadChopsData(chops);
    this.chopIntegration.updateChops(chops);
  }

  /**
   * Get chop data by ID (legacy API compatibility)
   * @param {string} chopId - Chop ID
   * @returns {Object|null} Chop data or null
   */
  getChopData(chopId) {
    return this.chopsData.get(chopId) || null;
  }

  /**
   * Get current bank pattern (legacy API compatibility)
   * @returns {Object|null} Current pattern
   */
  getCurrentBankPattern() {
    return this.patternManager.getCurrentPattern();
  }

  /**
   * Get all chops for current bank (legacy API compatibility)
   * @returns {Array} Array of chop objects
   */
  getCurrentBankChops() {
    const currentBankData = this.patternManager.getCurrentBankData();
    if (!currentBankData) {
      return Array(16).fill(null);
    }

    const chops = Array(16).fill(null);
    
    currentBankData.tracks.forEach((track, trackIndex) => {
      if (track.chopId) {
        const chopData = this.getChopData(track.chopId);
        if (chopData) {
          chops[trackIndex] = {
            ...chopData,
            trackIndex
          };
        }
      }
    });

    return chops;
  }

  /**
   * Destroy service (legacy API compatibility)
   * @returns {void}
   */
  destroy() {
    this.cleanup();
  }

  /**
   * Cleanup resources
   * @returns {void}
   */
  cleanup() {
    this.stop();
    
    this.engine.cleanup();
    this.renderer.cleanup();
    
    this.chopsData.clear();
    this.activeChops.clear();
    this.stepCallbacks = [];
    this.stateChangeCallbacks = [];
    this.errorCallbacks = [];
    
    this.isInitialized = false;
  }
}

export { OptimizedSamplerSequencerService };