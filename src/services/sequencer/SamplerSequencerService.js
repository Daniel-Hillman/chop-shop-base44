/**
 * @fileoverview Sampler Sequencer Service
 * Main coordination service that brings together the sequencer engine, pattern manager, and YouTube interface
 * Provides a unified API for the sampler drum sequencer functionality
 */

import { SamplerSequencerEngine } from './SamplerSequencerEngine.js';
import { SamplerPatternManager } from './SamplerPatternManager.js';
import { YouTubePlayerInterface } from './YouTubePlayerInterface.js';
import { SamplerChopIntegration } from './SamplerChopIntegration.js';

/**
 * Main service that coordinates sampler sequencer functionality
 * Integrates timing engine, pattern management, and YouTube player control
 */
class SamplerSequencerService {
  constructor() {
    /** @type {SamplerSequencerEngine} */
    this.engine = new SamplerSequencerEngine();
    
    /** @type {SamplerPatternManager} */
    this.patternManager = new SamplerPatternManager();
    
    /** @type {YouTubePlayerInterface} */
    this.youtubeInterface = new YouTubePlayerInterface();
    
    /** @type {SamplerChopIntegration} */
    this.chopIntegration = new SamplerChopIntegration(this.patternManager);
    
    /** @type {boolean} */
    this.isInitialized = false;
    
    /** @type {Map<string, Object>} */
    this.chopsData = new Map(); // chopId -> chop data
    
    /** @type {Function[]} */
    this.stepCallbacks = [];
    
    /** @type {Function[]} */
    this.stateChangeCallbacks = [];
    
    /** @type {Function[]} */
    this.errorCallbacks = [];
    
    this.setupEngineCallbacks();
  }

  /**
   * Initialize the sampler sequencer service
   * @param {Object} youtubePlayer - YouTube player instance
   * @param {Array} chops - Initial chop data
   * @returns {Promise<boolean>} Whether initialization was successful
   */
  async initialize(youtubePlayer, chops = []) {
    try {
      // Connect YouTube player interface
      const connectionResult = this.youtubeInterface.connect(youtubePlayer);
      
      if (!connectionResult) {
        throw new Error('Failed to connect YouTube player interface');
      }

      // Initialize sequencer engine with YouTube interface
      this.engine.initialize(this.youtubeInterface);

      // Create initial pattern
      const patternResult = this.patternManager.createPattern('Default Pattern');
      
      if (!patternResult.success) {
        throw new Error('Failed to create default pattern');
      }
      
      // Verify pattern is loaded
      const currentPattern = this.patternManager.getCurrentPattern();
      if (!currentPattern) {
        throw new Error('Pattern creation succeeded but pattern not loaded');
      }
      
      // Load chops data
      this.loadChopsData(chops);
      
      // Initialize chop integration with callback for real-time updates
      this.chopIntegration.setChopAssignmentChangeCallback((assignments) => {
        // Notify state change callbacks about chop assignment updates
        this.notifyStateChange(this.engine.getState());
      });
      
      // Update chops in integration service (handles auto-assignment)
      this.chopIntegration.updateChops(chops);

      this.isInitialized = true;
      return true;

    } catch (error) {
      console.error('Failed to initialize SamplerSequencerService:', error);
      this.notifyError(error);
      return false;
    }
  }

  /**
   * Start sequencer playback with enhanced YouTube synchronization
   * @returns {Promise<boolean>} Whether start was successful
   */
  async start() {
    if (!this.isInitialized) {
      const error = new Error('Service not initialized');
      this.notifyError(error);
      return false;
    }

    try {
      // Force YouTube interface out of degraded mode for sequencer playback
      if (this.youtubeInterface.isDegraded) {
        console.log('🔄 Forcing YouTube interface out of degraded mode for sequencer playback...');
        this.youtubeInterface.forceExitDegradedMode();
      }

      // Test YouTube connection before starting
      const connectionOk = await this.youtubeInterface.testConnection();
      if (!connectionOk) {
        console.warn('YouTube connection test failed, attempting recovery...');
        
        const recovered = await this.youtubeInterface.attemptRecovery();
        if (!recovered) {
          console.warn('YouTube recovery failed, continuing with limited functionality');
        }
      }

      // Synchronize sequencer with YouTube player state
      const syncSuccess = await this.engine.synchronizeWithPlayer();
      if (!syncSuccess) {
        console.warn('Failed to synchronize with YouTube player, but continuing');
      }

      // Start the sequencer engine
      this.engine.start();
      return true;
    } catch (error) {
      console.error('Failed to start sequencer:', error);
      this.notifyError(error);
      return false;
    }
  }

  /**
   * Stop sequencer playback
   * @returns {void}
   */
  stop() {
    this.engine.stop();
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
   * Set BPM
   * @param {number} bpm - New BPM value
   * @returns {void}
   */
  setBPM(bpm) {
    this.engine.setBPM(bpm);
    
    // Update pattern BPM
    const currentPattern = this.patternManager.getCurrentPattern();
    if (currentPattern) {
      currentPattern.bpm = bpm;
    }
  }

  /**
   * Toggle step in current pattern
   * @param {number} trackIndex - Track index (0-15)
   * @param {number} stepIndex - Step index (0-15)
   * @returns {void}
   */
  toggleStep(trackIndex, stepIndex) {
    this.patternManager.toggleStep(trackIndex, stepIndex);
  }

  /**
   * Set step state
   * @param {number} trackIndex - Track index (0-15)
   * @param {number} stepIndex - Step index (0-15)
   * @param {boolean} active - Step active state
   * @returns {void}
   */
  setStep(trackIndex, stepIndex, active) {
    this.patternManager.setStep(trackIndex, stepIndex, active);
  }

  /**
   * Get step state
   * @param {number} trackIndex - Track index (0-15)
   * @param {number} stepIndex - Step index (0-15)
   * @returns {boolean} Step active state
   */
  getStep(trackIndex, stepIndex) {
    return this.patternManager.getStep(trackIndex, stepIndex);
  }

  /**
   * Switch to different bank
   * @param {number} bankIndex - Bank index (0-3)
   * @returns {void}
   */
  switchBank(bankIndex) {
    this.patternManager.switchBank(bankIndex);
  }

  /**
   * Get current bank index
   * @returns {number} Current bank index
   */
  getCurrentBank() {
    return this.patternManager.currentBank;
  }

  /**
   * Load chops data
   * @param {Array} chops - Array of chop objects
   * @returns {void}
   */
  loadChopsData(chops) {
    this.chopsData.clear();
    
    if (Array.isArray(chops)) {
      chops.forEach(chop => {
        if (chop.padId) {
          this.chopsData.set(chop.padId, chop);
        }
      });
    }
    

  }

  /**
   * Update chops data and reassign tracks with real-time integration
   * @param {Array} chops - Updated chop data
   * @returns {void}
   */
  updateChopsData(chops) {
    // Update internal chops data
    this.loadChopsData(chops);
    
    // Use chop integration service for intelligent assignment handling
    this.chopIntegration.updateChops(chops);
  }

  /**
   * Get chop data by ID
   * @param {string} chopId - Chop ID
   * @returns {Object|null} Chop data or null
   */
  getChopData(chopId) {
    return this.chopsData.get(chopId) || null;
  }

  /**
   * Get all chops for current bank in grid format (indexed by track)
   * @returns {Array} Array of chop objects indexed by track (16 elements, null for empty tracks)
   */
  getCurrentBankChops() {
    const currentBankData = this.patternManager.getCurrentBankData();
    if (!currentBankData) {
      return Array(16).fill(null);
    }

    // Create array indexed by track index
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
   * Get current bank pattern in format expected by the grid component
   * @returns {Object} Pattern object with tracks array for current bank
   */
  getCurrentBankPattern() {
    if (!this.patternManager.currentPattern) {
      return { tracks: [] };
    }

    const currentBankData = this.patternManager.getCurrentBankData();
    if (!currentBankData) {
      return { tracks: [] };
    }

    // Convert bank data to grid-expected format
    const tracks = currentBankData.tracks.map((track, trackIndex) => ({
      trackIndex,
      chopId: track.chopId,
      steps: [...track.steps] // Create a copy to prevent mutations
    }));

    return {
      id: this.patternManager.currentPattern.id,
      name: this.patternManager.currentPattern.name,
      tracks,
      currentBank: this.patternManager.currentBank
    };
  }

  /**
   * Get current sequencer state
   * @returns {Object} Combined state from all components
   */
  getState() {
    const engineState = this.engine.getState();
    const patternStats = this.patternManager.getPatternStats();
    const youtubeStatus = this.youtubeInterface.getStatus();
    const integrationStats = this.chopIntegration ? this.chopIntegration.getIntegrationStats() : {};
    
    return {
      ...engineState,
      currentBank: this.patternManager.currentBank,
      patternStats,
      youtubeStatus,
      integrationStats,
      isInitialized: this.isInitialized,
      chopsCount: this.chopsData.size
    };
  }

  /**
   * Get performance statistics
   * @returns {Object} Performance statistics from all components
   */
  getPerformanceStats() {
    return {
      engine: this.engine.getPerformanceStats(),
      youtube: this.youtubeInterface.getPerformanceStats(),
      pattern: this.patternManager.getPatternStats(),
      integration: this.chopIntegration ? this.chopIntegration.getIntegrationStats() : {}
    };
  }

  /**
   * Control YouTube video playback seamlessly
   * @param {string} action - Action to perform ('play', 'pause', 'stop')
   * @returns {Promise<boolean>} Whether action was successful
   */
  async controlVideoPlayback(action) {
    if (!this.isConnected || !this.youtubeInterface.youtubePlayer) {
      console.warn('Cannot control video playback: YouTube player not available');
      return false;
    }

    try {
      const player = this.youtubeInterface.youtubePlayer;
      
      switch (action) {
        case 'play':
          player.playVideo();
          console.log('YouTube video playback started');
          break;
          
        case 'pause':
          player.pauseVideo();
          console.log('YouTube video playback paused');
          break;
          
        case 'stop':
          player.pauseVideo();
          // Optionally seek to beginning
          await this.youtubeInterface.jumpToTimestamp(0, true, false);
          console.log('YouTube video playback stopped');
          break;
          
        default:
          console.warn(`Unknown video playback action: ${action}`);
          return false;
      }
      
      return true;
    } catch (error) {
      console.error(`Failed to control video playback (${action}):`, error);
      this.notifyError(new Error(`Video playback control failed: ${error.message}`));
      return false;
    }
  }

  /**
   * Synchronize video playback with sequencer state
   * @returns {Promise<boolean>} Whether synchronization was successful
   */
  async synchronizeVideoWithSequencer() {
    if (!this.isInitialized) {
      return false;
    }

    try {
      const sequencerState = this.engine.getState();
      const playerState = this.youtubeInterface.getDetailedPlayerState();
      
      // Synchronize playback state
      if (sequencerState.isPlaying !== playerState.isPlaying) {
        const action = sequencerState.isPlaying ? 'play' : 'pause';
        await this.controlVideoPlayback(action);
      }
      
      console.log('Video synchronized with sequencer state');
      return true;
    } catch (error) {
      console.error('Failed to synchronize video with sequencer:', error);
      return false;
    }
  }

  /**
   * Handle YouTube player errors with recovery
   * @param {Error} error - YouTube player error
   * @returns {Promise<boolean>} Whether error was handled
   */
  async handleYouTubeError(error) {
    console.error('YouTube player error:', error);
    
    try {
      // Attempt recovery
      const recovered = await this.youtubeInterface.handlePlayerError(error);
      
      if (recovered) {
        console.log('YouTube player error recovered successfully');
        
        // Re-synchronize after recovery
        await this.synchronizeVideoWithSequencer();
        return true;
      } else {
        // Get recovery suggestions for user
        const suggestions = this.youtubeInterface.getErrorRecoverySuggestions(error.message);
        
        this.notifyError(new Error(`YouTube Error: ${error.message}. ${suggestions.userAction}`));
        return false;
      }
    } catch (recoveryError) {
      console.error('Failed to handle YouTube error:', recoveryError);
      this.notifyError(new Error(`YouTube Error Recovery Failed: ${recoveryError.message}`));
      return false;
    }
  }

  /**
   * Setup engine callbacks
   * @private
   * @returns {void}
   */
  setupEngineCallbacks() {
    // Handle step events from engine
    this.engine.onStep((stepIndex, time) => {
      this.handleStep(stepIndex, time);
    });

    // Handle state changes from engine
    this.engine.onStateChange((state) => {
      this.notifyStateChange(state);
    });

    // Handle YouTube interface errors
    this.youtubeInterface.onError((error) => {
      this.notifyError(new Error(`YouTube: ${error.message}`));
    });
  }

  /**
   * Handle step execution
   * @private
   * @param {number} stepIndex - Current step index
   * @param {number} time - Step time
   * @returns {void}
   */
  handleStep(stepIndex, time) {
    // Get active steps for current step
    const activeSteps = this.patternManager.getActiveStepsForStep(stepIndex);
    
    if (activeSteps.length > 0) {
      // Trigger chops for active steps (fire and forget for speed)
      activeSteps.forEach(({ trackIndex, chopId }) => {
        this.triggerChop(chopId, trackIndex);
      });
    }

    // Notify step callbacks
    this.stepCallbacks.forEach(callback => {
      try {
        callback(stepIndex, time, activeSteps);
      } catch (error) {
        // Silent error handling for performance
      }
    });
  }

  /**
   * Trigger a chop (jump to its timestamp)
   * @private
   * @param {string} chopId - Chop ID to trigger
   * @param {number} trackIndex - Track index
   * @returns {Promise<void>}
   */
  async triggerChop(chopId, trackIndex) {
    const chopData = this.getChopData(chopId);
    if (!chopData || typeof chopData.startTime !== 'number') {
      return;
    }

    // Optimized chop triggering - iframe postMessage (most reliable)
    try {
      const iframe = document.querySelector('iframe[src*="youtube.com"]');
      if (iframe && iframe.contentWindow) {
        iframe.contentWindow.postMessage(
          JSON.stringify({
            event: 'command',
            func: 'seekTo',
            args: [chopData.startTime, true]
          }),
          'https://www.youtube.com'
        );
        return;
      }
      
      // Fallback: direct YouTube player API
      const player = this.youtubeInterface?.youtubePlayer;
      if (player && typeof player.seekTo === 'function') {
        player.seekTo(chopData.startTime, true);
        return;
      }
    } catch (error) {
      // Silent error handling for performance
    }
  }

  /**
   * Add step callback
   * @param {Function} callback - Callback function (stepIndex, time, activeSteps) => void
   */
  onStep(callback) {
    if (typeof callback === 'function') {
      this.stepCallbacks.push(callback);
    }
  }

  /**
   * Add state change callback
   * @param {Function} callback - Callback function (state) => void
   */
  onStateChange(callback) {
    if (typeof callback === 'function') {
      this.stateChangeCallbacks.push(callback);
    }
  }

  /**
   * Add error callback
   * @param {Function} callback - Callback function (error) => void
   */
  onError(callback) {
    if (typeof callback === 'function') {
      this.errorCallbacks.push(callback);
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
   * Remove error callback
   * @param {Function} callback - Callback to remove
   */
  removeErrorCallback(callback) {
    const index = this.errorCallbacks.indexOf(callback);
    if (index > -1) {
      this.errorCallbacks.splice(index, 1);
    }
  }

  /**
   * Notify state change callbacks
   * @private
   * @param {Object} engineState - Engine state
   */
  notifyStateChange(engineState) {
    const fullState = this.getState();
    
    this.stateChangeCallbacks.forEach(callback => {
      try {
        callback(fullState);
      } catch (error) {
        console.error('Error in state change callback:', error);
      }
    });
  }

  /**
   * Notify error callbacks
   * @private
   * @param {Error} error - Error object
   */
  notifyError(error) {
    this.errorCallbacks.forEach(callback => {
      try {
        callback(error);
      } catch (callbackError) {
        console.error('Error in error callback:', callbackError);
      }
    });
  }

  /**
   * Get chop integration statistics
   * @returns {Object} Integration statistics
   */
  getChopIntegrationStats() {
    return this.chopIntegration ? this.chopIntegration.getIntegrationStats() : {};
  }

  /**
   * Force reassignment of all chops
   * @returns {void}
   */
  reassignAllChops() {
    if (this.chopIntegration) {
      this.chopIntegration.reassignAllChops();
    }
  }

  /**
   * Clear all chop assignments
   * @returns {void}
   */
  clearAllChopAssignments() {
    if (this.chopIntegration) {
      this.chopIntegration.clearAllAssignments();
    }
  }

  /**
   * Get chop assignments for current bank
   * @returns {Array} Array of track assignments
   */
  getCurrentBankAssignments() {
    return this.chopIntegration ? this.chopIntegration.getCurrentBankAssignments() : [];
  }

  /**
   * Handle explicit chop deletion
   * @param {string} chopId - ID of the deleted chop
   * @returns {void}
   */
  handleChopDeletion(chopId) {
    if (this.chopIntegration) {
      this.chopIntegration.handleChopDeletion(chopId);
    }
  }

  /**
   * Handle explicit chop creation
   * @param {Object} newChop - The newly created chop
   * @returns {void}
   */
  handleChopCreation(newChop) {
    if (this.chopIntegration) {
      this.chopIntegration.handleChopCreation(newChop);
    }
  }

  /**
   * Handle explicit chop modification
   * @param {Object} modifiedChop - The modified chop
   * @returns {void}
   */
  handleChopModification(modifiedChop) {
    if (this.chopIntegration) {
      this.chopIntegration.handleChopModification(modifiedChop);
    }
  }

  /**
   * Clean up resources and stop all processes
   * @returns {void}
   */
  destroy() {
    // Stop engine
    this.engine.destroy();
    
    // Clean up pattern manager
    this.patternManager.destroy();
    
    // Clean up chop integration
    if (this.chopIntegration) {
      this.chopIntegration.destroy();
    }
    
    // Disconnect YouTube interface
    this.youtubeInterface.destroy();
    
    // Clear callbacks
    this.stepCallbacks = [];
    this.stateChangeCallbacks = [];
    this.errorCallbacks = [];
    
    // Clear data
    this.chopsData.clear();
    this.isInitialized = false;
  }
}

export { SamplerSequencerService };