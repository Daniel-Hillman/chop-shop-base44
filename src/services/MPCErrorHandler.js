/**
 * MPC Error Handler - Specialized error handling for MPC-style sequencer
 * 
 * Handles timing drift detection, audio buffer overruns, drum sample loading failures,
 * recording errors, and provides undo/redo functionality for recording mistakes.
 * 
 * Requirements: 7.4, 7.5, 7.6
 */

import errorRecoveryService from './ErrorRecoveryService.js';

class MPCErrorHandler {
    constructor() {
        this.timingDriftThreshold = 0.005; // 5ms drift tolerance
        this.bufferOverrunThreshold = 0.1; // 100ms buffer threshold
        this.maxRecoveryAttempts = 3;

        // Timing drift monitoring
        this.timingHistory = [];
        this.driftDetectionInterval = null;
        this.lastKnownGoodTime = null;
        this.driftCorrectionCallbacks = new Set();

        // Audio buffer monitoring
        this.bufferMonitorInterval = null;
        this.bufferOverrunCallbacks = new Set();
        this.lastBufferCheck = 0;

        // Recording error tracking
        this.recordingErrors = new Map();
        this.recordingErrorCallbacks = new Set();

        // Undo/Redo system
        this.undoStack = [];
        this.redoStack = [];
        this.maxUndoSteps = 50;
        this.undoCallbacks = new Set();

        // Component references
        this.bpmEngine = null;
        this.recordingEngine = null;
        this.drumKitManager = null;
        this.audioContext = null;

        // Error statistics
        this.errorStats = {
            timingDrifts: 0,
            bufferOverruns: 0,
            recordingErrors: 0,
            drumLoadFailures: 0,
            recoveryAttempts: 0,
            successfulRecoveries: 0
        };

        console.log('🛡️ MPC Error Handler initialized');
    }  /**
   
* Initialize with MPC components
   * @param {Object} components - MPC system components
   */
    initialize(components) {
        this.bpmEngine = components.bpmEngine;
        this.recordingEngine = components.recordingEngine;
        this.drumKitManager = components.drumKitManager;
        this.audioContext = components.audioContext;

        // Start monitoring systems
        this.startTimingDriftDetection();
        this.startBufferMonitoring();
        this.setupRecordingErrorHandling();

        console.log('🔧 MPC Error Handler connected to system components');
    }

    // ============================================================================
    // TIMING DRIFT DETECTION AND AUTO-CORRECTION
    // ============================================================================

    /**
     * Start timing drift detection
     */
    startTimingDriftDetection() {
        if (this.driftDetectionInterval) {
            clearInterval(this.driftDetectionInterval);
        }

        this.driftDetectionInterval = setInterval(() => {
            this.checkTimingDrift();
        }, 100); // Check every 100ms

        console.log('⏱️ Timing drift detection started');
    }

    /**
     * Stop timing drift detection
     */
    stopTimingDriftDetection() {
        if (this.driftDetectionInterval) {
            clearInterval(this.driftDetectionInterval);
            this.driftDetectionInterval = null;
        }
    }

    /**
     * Check for timing drift and auto-correct if needed
     */
    checkTimingDrift() {
        if (!this.bpmEngine || !this.bpmEngine.isRunning || !this.audioContext) {
            return;
        }

        try {
            const currentTime = this.audioContext.currentTime;
            const expectedBeat = this.bpmEngine.getCurrentBeat();
            const timingInfo = this.bpmEngine.getTimingInfo();

            // Calculate expected time based on BPM
            const expectedTime = timingInfo.startTime + (expectedBeat * 60 / timingInfo.bpm);
            const drift = Math.abs(currentTime - expectedTime);

            // Record timing sample
            this.timingHistory.push({
                timestamp: Date.now(),
                currentTime,
                expectedTime,
                drift,
                beat: expectedBeat
            });

            // Keep only recent history (last 10 seconds)
            const cutoffTime = Date.now() - 10000;
            this.timingHistory = this.timingHistory.filter(sample => sample.timestamp > cutoffTime);

            // Check if drift exceeds threshold
            if (drift > this.timingDriftThreshold) {
                this.handleTimingDrift(drift, currentTime, expectedTime);
            } else {
                this.lastKnownGoodTime = currentTime;
            }

        } catch (error) {
            console.error('Error in timing drift detection:', error);
        }
    }  /**
  
 * Handle detected timing drift
   * @param {number} drift - Detected drift in seconds
   * @param {number} currentTime - Current audio context time
   * @param {number} expectedTime - Expected time based on BPM
   */
    handleTimingDrift(drift, currentTime, expectedTime) {
        this.errorStats.timingDrifts++;

        console.warn(`⚠️ Timing drift detected: ${(drift * 1000).toFixed(2)}ms`);

        // Attempt auto-correction if drift is significant but not catastrophic
        if (drift < 0.05 && this.errorStats.recoveryAttempts < this.maxRecoveryAttempts) {
            this.attemptTimingCorrection(drift, currentTime, expectedTime);
        } else {
            // Drift too large or too many attempts - notify user
            this.notifyTimingDriftError(drift);
        }

        // Notify callbacks
        this.driftCorrectionCallbacks.forEach(callback => {
            try {
                callback({
                    type: 'timingDrift',
                    drift,
                    currentTime,
                    expectedTime,
                    correctionAttempted: drift < 0.05,
                    timestamp: Date.now()
                });
            } catch (error) {
                console.error('Error in drift correction callback:', error);
            }
        });
    }

    /**
     * Attempt to correct timing drift
     * @param {number} drift - Detected drift
     * @param {number} currentTime - Current time
     * @param {number} expectedTime - Expected time
     */
    attemptTimingCorrection(drift, currentTime, expectedTime) {
        this.errorStats.recoveryAttempts++;

        try {
            // Calculate correction factor
            const correctionFactor = expectedTime / currentTime;

            // Apply gradual correction to BPM engine
            if (this.bpmEngine && typeof this.bpmEngine.applyTimingCorrection === 'function') {
                this.bpmEngine.applyTimingCorrection(correctionFactor);
                this.errorStats.successfulRecoveries++;
                console.log(`✅ Applied timing correction: ${(correctionFactor * 100 - 100).toFixed(3)}%`);
            } else {
                // Fallback: restart BPM engine with corrected timing
                const currentBPM = this.bpmEngine.getBPM();
                const currentBeat = this.bpmEngine.getCurrentBeat();

                this.bpmEngine.stop();
                this.bpmEngine.setBPM(currentBPM);
                this.bpmEngine.start();

                // Try to maintain position
                if (typeof this.bpmEngine.setCurrentBeat === 'function') {
                    this.bpmEngine.setCurrentBeat(currentBeat);
                }

                this.errorStats.successfulRecoveries++;
                console.log('✅ Restarted BPM engine with timing correction');
            }

        } catch (error) {
            console.error('Failed to apply timing correction:', error);
            this.notifyTimingDriftError(drift, error);
        }
    }  // =
===========================================================================
  // AUDIO BUFFER OVERRUN HANDLING
  // ============================================================================

  /**
   * Start audio buffer monitoring
   */
  startBufferMonitoring() {
    if (this.bufferMonitorInterval) {
      clearInterval(this.bufferMonitorInterval);
    }

    this.bufferMonitorInterval = setInterval(() => {
      this.checkBufferHealth();
    }, 50); // Check every 50ms

    console.log('🔊 Audio buffer monitoring started');
  }

  /**
   * Stop audio buffer monitoring
   */
  stopBufferMonitoring() {
    if (this.bufferMonitorInterval) {
      clearInterval(this.bufferMonitorInterval);
      this.bufferMonitorInterval = null;
    }
  }

  /**
   * Check audio buffer health
   */
  checkBufferHealth() {
    if (!this.audioContext) return;

    try {
      const currentTime = this.audioContext.currentTime;
      const baseLatency = this.audioContext.baseLatency || 0;
      const outputLatency = this.audioContext.outputLatency || 0;

      // Calculate buffer health metrics
      const totalLatency = baseLatency + outputLatency;
      const timeSinceLastCheck = currentTime - this.lastBufferCheck;

      // Check for buffer overruns (gaps in audio processing)
      if (this.lastBufferCheck > 0 && timeSinceLastCheck > this.bufferOverrunThreshold) {
        this.handleBufferOverrun(timeSinceLastCheck, totalLatency);
      }

      this.lastBufferCheck = currentTime;

    } catch (error) {
      console.error('Error in buffer health check:', error);
    }
  }

  /**
   * Handle audio buffer overrun
   * @param {number} gap - Time gap detected
   * @param {number} latency - Current audio latency
   */
  handleBufferOverrun(gap, latency) {
    this.errorStats.bufferOverruns++;

    console.warn(`⚠️ Audio buffer overrun detected: ${(gap * 1000).toFixed(2)}ms gap`);

    // Attempt recovery
    this.attemptBufferRecovery(gap, latency);

    // Notify callbacks
    this.bufferOverrunCallbacks.forEach(callback => {
      try {
        callback({
          type: 'bufferOverrun',
          gap,
          latency,
          timestamp: Date.now()
        });
      } catch (error) {
        console.error('Error in buffer overrun callback:', error);
      }
    });
  }
// ============================================================================
  // DRUM SAMPLE LOADING FALLBACKS
  // ============================================================================

  /**
   * Handle drum sample loading failure
   * @param {string} padId - Pad identifier
   * @param {string} sampleUrl - Failed sample URL
   * @param {Error} error - Loading error
   * @returns {Promise<AudioBuffer|null>} Fallback sample or null
   */
  async handleDrumSampleFailure(padId, sampleUrl, error) {
    this.errorStats.drumLoadFailures++;

    console.warn(`⚠️ Drum sample loading failed for ${padId}:`, error.message);

    try {
      // Attempt to get fallback sample from drum kit manager
      if (this.drumKitManager && typeof this.drumKitManager.getFallbackSample === 'function') {
        const fallbackSample = this.drumKitManager.getFallbackSample(padId);

        if (fallbackSample) {
          console.log(`✅ Using fallback sample for ${padId}`);
          this.errorStats.successfulRecoveries++;
          return fallbackSample;
        }
      }

      // If no fallback available, create synthetic sample
      const syntheticSample = await this.createSyntheticDrumSample(padId);
      if (syntheticSample) {
        console.log(`✅ Created synthetic sample for ${padId}`);
        this.errorStats.successfulRecoveries++;
        return syntheticSample;
      }

      return null;

    } catch (recoveryError) {
      console.error(`Failed to recover from drum sample failure for ${padId}:`, recoveryError);
      return null;
    }
  }

  /**
   * Create synthetic drum sample as fallback
   * @param {string} padId - Pad identifier
   * @returns {Promise<AudioBuffer|null>} Synthetic sample
   */
  async createSyntheticDrumSample(padId) {
    if (!this.audioContext) return null;

    try {
      // Basic synthetic sample generation
      const sampleRate = this.audioContext.sampleRate;
      const duration = 0.2; // 200ms
      const length = Math.floor(duration * sampleRate);
      const buffer = this.audioContext.createBuffer(1, length, sampleRate);
      const data = buffer.getChannelData(0);

      // Generate basic percussive sound
      for (let i = 0; i < length; i++) {
        const t = i / sampleRate;
        const envelope = Math.exp(-t * 10);
        const frequency = 200 + (Math.random() * 800); // Random frequency
        data[i] = envelope * Math.sin(2 * Math.PI * frequency * t) * 0.5;
      }

      return buffer;

    } catch (error) {
      console.error(`Failed to create synthetic sample for ${padId}:`, error);
      return null;
    }
  }  //
 ============================================================================
  // UNDO/REDO FUNCTIONALITY
  // ============================================================================

  /**
   * Save state for undo functionality
   * @param {string} actionType - Type of action being performed
   * @param {Object} stateData - State data to save
   */
  saveUndoState(actionType, stateData) {
    const undoState = {
      id: `undo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      actionType,
      timestamp: Date.now(),
      stateData: JSON.parse(JSON.stringify(stateData)) // Deep copy
    };

    this.undoStack.push(undoState);

    // Limit undo stack size
    if (this.undoStack.length > this.maxUndoSteps) {
      this.undoStack.shift();
    }

    // Clear redo stack when new action is performed
    this.redoStack = [];

    console.log(`💾 Saved undo state: ${actionType}`);

    // Notify callbacks
    this.notifyUndoRedoChange();
  }

  /**
   * Perform undo operation
   * @returns {boolean} Success status
   */
  undo() {
    if (this.undoStack.length === 0) {
      console.warn('No actions to undo');
      return false;
    }

    try {
      const undoState = this.undoStack.pop();

      // Save current state for redo
      const currentState = this.captureCurrentState();
      this.redoStack.push({
        ...undoState,
        redoStateData: currentState
      });

      // Apply undo state
      const success = this.applyUndoState(undoState);

      if (success) {
        console.log(`↶ Undid action: ${undoState.actionType}`);
        this.notifyUndoRedoChange();
        return true;
      } else {
        // Restore undo state if application failed
        this.undoStack.push(undoState);
        this.redoStack.pop();
        return false;
      }

    } catch (error) {
      console.error('Failed to perform undo:', error);
      return false;
    }
  }

  /**
   * Perform redo operation
   * @returns {boolean} Success status
   */
  redo() {
    if (this.redoStack.length === 0) {
      console.warn('No actions to redo');
      return false;
    }

    try {
      const redoState = this.redoStack.pop();

      // Save current state for undo
      const currentState = this.captureCurrentState();
      this.undoStack.push({
        ...redoState,
        stateData: currentState
      });

      // Apply redo state
      const success = this.applyRedoState(redoState);

      if (success) {
        console.log(`↷ Redid action: ${redoState.actionType}`);
        this.notifyUndoRedoChange();
        return true;
      } else {
        // Restore redo state if application failed
        this.redoStack.push(redoState);
        this.undoStack.pop();
        return false;
      }

    } catch (error) {
      console.error('Failed to perform redo:', error);
      return false;
    }
  }
// ============================================================================
  // UTILITY METHODS
  // ============================================================================

  /**
   * Capture current system state
   * @returns {Object} Current state
   */
  captureCurrentState() {
    const state = {
      timestamp: Date.now()
    };

    // Capture recording engine state
    if (this.recordingEngine) {
      state.recordingEngine = {
        recordedEvents: this.recordingEngine.getAllRecordedEvents(),
        layerControls: this.recordingEngine.getLayerControls(),
        recordingState: this.recordingEngine.getRecordingState()
      };
    }

    // Capture BPM engine state
    if (this.bpmEngine) {
      state.bpmEngine = {
        bpm: this.bpmEngine.getBPM(),
        isRunning: this.bpmEngine.isRunning,
        currentBeat: this.bpmEngine.getCurrentBeat()
      };
    }

    return state;
  }

  /**
   * Apply undo state to system
   * @param {Object} undoState - Undo state to apply
   * @returns {boolean} Success status
   */
  applyUndoState(undoState) {
    try {
      const stateData = undoState.stateData;

      // Restore recording engine state
      if (stateData.recordingEngine && this.recordingEngine) {
        // Clear current events
        this.recordingEngine.clearAllLayers();

        // Restore events
        if (stateData.recordingEngine.recordedEvents) {
          this.recordingEngine.importLoop({
            layers: stateData.recordingEngine.recordedEvents
          });
        }

        // Restore layer controls
        if (stateData.recordingEngine.layerControls) {
          Object.entries(stateData.recordingEngine.layerControls).forEach(([layer, controls]) => {
            this.recordingEngine.setLayerVolume(layer, controls.volume);
            this.recordingEngine.setLayerMuted(layer, controls.muted);
            this.recordingEngine.setLayerSolo(layer, controls.solo);
            this.recordingEngine.setLayerPan(layer, controls.pan);
          });
        }
      }

      // Restore BPM engine state
      if (stateData.bpmEngine && this.bpmEngine) {
        this.bpmEngine.setBPM(stateData.bpmEngine.bpm);

        if (stateData.bpmEngine.isRunning && !this.bpmEngine.isRunning) {
          this.bpmEngine.start();
        } else if (!stateData.bpmEngine.isRunning && this.bpmEngine.isRunning) {
          this.bpmEngine.stop();
        }
      }

      return true;

    } catch (error) {
      console.error('Failed to apply undo state:', error);
      return false;
    }
  }

  /**
   * Apply redo state to system
   * @param {Object} redoState - Redo state to apply
   * @returns {boolean} Success status
   */
  applyRedoState(redoState) {
    if (redoState.redoStateData) {
      return this.applyUndoState({ stateData: redoState.redoStateData });
    }
    return false;
  }  //
============================================================================
  // CALLBACK MANAGEMENT
  // ============================================================================

  /**
   * Register callback for timing drift events
   * @param {Function} callback - Callback function
   */
  onTimingDrift(callback) {
    this.driftCorrectionCallbacks.add(callback);
  }

  /**
   * Register callback for buffer overrun events
   * @param {Function} callback - Callback function
   */
  onBufferOverrun(callback) {
    this.bufferOverrunCallbacks.add(callback);
  }

  /**
   * Register callback for recording error events
   * @param {Function} callback - Callback function
   */
  onRecordingError(callback) {
    this.recordingErrorCallbacks.add(callback);
  }

  /**
   * Register callback for undo/redo changes
   * @param {Function} callback - Callback function
   */
  onUndoRedoChange(callback) {
    this.undoCallbacks.add(callback);
  }

  /**
   * Notify undo/redo change
   */
  notifyUndoRedoChange() {
    this.undoCallbacks.forEach(callback => {
      try {
        callback(this.getUndoRedoStatus());
      } catch (error) {
        console.error('Error in undo/redo callback:', error);
      }
    });
  }

  /**
   * Get undo/redo status
   * @returns {Object} Undo/redo status
   */
  getUndoRedoStatus() {
    return {
      canUndo: this.undoStack.length > 0,
      canRedo: this.redoStack.length > 0,
      undoCount: this.undoStack.length,
      redoCount: this.redoStack.length,
      lastAction: this.undoStack.length > 0 ?
        this.undoStack[this.undoStack.length - 1].actionType : null
    };
  }

  /**
   * Get error statistics
   * @returns {Object} Error statistics
   */
  getErrorStatistics() {
    return {
      ...this.errorStats,
      timingHistoryLength: this.timingHistory.length,
      recordingErrorsCount: this.recordingErrors.size,
      undoStackSize: this.undoStack.length,
      redoStackSize: this.redoStack.length
    };
  }

  /**
   * Setup recording error handling
   */
  setupRecordingErrorHandling() {
    if (!this.recordingEngine) return;

    // Listen for recording events
    this.recordingEngine.onRecordingEvent((event) => {
      this.handleRecordingEvent(event);
    });

    console.log('🎙️ Recording error handling setup complete');
  }

  /**
   * Handle recording events and detect errors
   * @param {Object} event - Recording event
   */
  handleRecordingEvent(event) {
    try {
      switch (event.type) {
        case 'recordingStarted':
          this.clearRecordingErrors(event.layer);
          break;

        case 'eventRecorded':
          this.validateRecordedEvent(event);
          break;

        case 'recordingError':
          this.handleRecordingError(event);
          break;
      }
    } catch (error) {
      console.error('Error handling recording event:', error);
    }
  }  /**

* Validate recorded event for potential issues
   * @param {Object} event - Recording event
   */
  validateRecordedEvent(event) {
    const recordedEvent = event.event;
    const issues = [];

    // Check timing accuracy
    const timingDrift = Math.abs(recordedEvent.loopPosition - recordedEvent.quantizedPosition);
    if (timingDrift > 0.1) { // 100ms drift
      issues.push({
        type: 'timing_drift',
        severity: 'warning',
        message: `Event timing drifted by ${(timingDrift * 1000).toFixed(0)}ms`
      });
    }

    // Check velocity range
    if (recordedEvent.velocity < 0 || recordedEvent.velocity > 127) {
      issues.push({
        type: 'invalid_velocity',
        severity: 'error',
        message: `Invalid velocity: ${recordedEvent.velocity}`
      });
    }

    // Report issues if found
    if (issues.length > 0) {
      this.reportRecordingIssues(recordedEvent, issues);
    }
  }

  /**
   * Handle recording error
   * @param {Object} event - Error event
   */
  handleRecordingError(event) {
    this.errorStats.recordingErrors++;

    const errorKey = `${event.layer}_${Date.now()}`;
    this.recordingErrors.set(errorKey, {
      ...event,
      timestamp: Date.now()
    });

    console.error(`🎙️ Recording error in ${event.layer}:`, event.error);

    // Notify callbacks
    this.recordingErrorCallbacks.forEach(callback => {
      try {
        callback(event);
      } catch (error) {
        console.error('Error in recording error callback:', error);
      }
    });
  }

  /**
   * Report recording issues to user
   * @param {Object} recordedEvent - The recorded event
   * @param {Array} issues - List of issues found
   */
  reportRecordingIssues(recordedEvent, issues) {
    console.warn(`⚠️ Recording issues detected for pad ${recordedEvent.padId}:`, issues);
  }

  /**
   * Clear recording errors for a layer
   * @param {string} layer - Layer to clear errors for
   */
  clearRecordingErrors(layer) {
    const keysToDelete = [];

    for (const [key, error] of this.recordingErrors.entries()) {
      if (error.layer === layer) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => this.recordingErrors.delete(key));
  }

  /**
   * Notify timing drift error
   * @param {number} drift - Drift amount
   * @param {Error} error - Optional error object
   */
  notifyTimingDriftError(drift, error = null) {
    console.error(`🚨 Timing drift error: ${(drift * 1000).toFixed(1)}ms`, error);
  }

  /**
   * Attempt buffer recovery
   * @param {number} gap - Time gap
   * @param {number} latency - Current latency
   */
  attemptBufferRecovery(gap, latency) {
    this.errorStats.recoveryAttempts++;

    try {
      // If we have access to audio context state
      if (this.audioContext.state === 'suspended') {
        this.audioContext.resume().then(() => {
          console.log('✅ Resumed suspended audio context');
          this.errorStats.successfulRecoveries++;
        }).catch(error => {
          console.error('Failed to resume audio context:', error);
        });
      }

    } catch (error) {
      console.error('Failed to recover from buffer overrun:', error);
    }
  }

  /**
   * Cleanup resources
   */
  cleanup() {
    // Stop monitoring
    this.stopTimingDriftDetection();
    this.stopBufferMonitoring();

    // Clear callbacks
    this.driftCorrectionCallbacks.clear();
    this.bufferOverrunCallbacks.clear();
    this.recordingErrorCallbacks.clear();
    this.undoCallbacks.clear();

    // Clear data
    this.timingHistory = [];
    this.recordingErrors.clear();
    this.undoStack = [];
    this.redoStack = [];

    // Reset references
    this.bpmEngine = null;
    this.recordingEngine = null;
    this.drumKitManager = null;
    this.audioContext = null;

    console.log('🧹 MPC Error Handler cleaned up');
  }
}

export default MPCErrorHandler;