/**
 * @fileoverview Main sequencer hook
 * Provides sequencer state management and control methods
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { SequencerEngine } from '../../services/sequencer/SequencerEngine.js';
import { PatternManager } from '../../services/sequencer/PatternManager.js';
import { SampleManager } from '../../services/sequencer/SampleManager.js';
import { useErrorRecovery } from '../useErrorRecovery.js';

/**
 * Main sequencer state management hook
 * @param {Object} options - Configuration options
 * @param {AudioContext} [options.audioContext] - External audio context to use
 * @param {boolean} [options.autoInitialize=true] - Whether to auto-initialize services
 * @returns {Object} Sequencer state and control methods
 */
export const useSequencer = (options = {}) => {
  const { audioContext: externalAudioContext, autoInitialize = true } = options;
  
  // Core services
  const sequencerEngineRef = useRef(null);
  const patternManagerRef = useRef(null);
  const sampleManagerRef = useRef(null);
  const audioContextRef = useRef(externalAudioContext || null);
  
  // State management
  const [isInitialized, setIsInitialized] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [bpm, setBpmState] = useState(120);
  const [swing, setSwingState] = useState(0);
  const [stepResolution, setStepResolutionState] = useState(16);
  const [currentPattern, setCurrentPattern] = useState(null);
  const [patterns, setPatterns] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [performanceStats, setPerformanceStats] = useState({
    totalSteps: 0,
    averageLatency: 0,
    maxLatency: 0,
    timingDrift: 0
  });

  // Error recovery
  const errorRecovery = useErrorRecovery('sequencer_main');

  // Initialize services
  const initializeServices = useCallback(async () => {
    if (isInitialized) return;

    try {
      setIsLoading(true);

      // Create audio context if not provided
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }

      // Resume audio context if suspended
      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }

      // Initialize services
      patternManagerRef.current = new PatternManager();
      sampleManagerRef.current = new SampleManager();
      sequencerEngineRef.current = new SequencerEngine();

      // Initialize sequencer engine with dependencies
      await sequencerEngineRef.current.initialize(audioContextRef.current, {
        patternManager: patternManagerRef.current,
        sampleManager: sampleManagerRef.current
      });

      // Set up event listeners
      sequencerEngineRef.current.onStateChange((state) => {
        setIsPlaying(state.isPlaying);
        setIsPaused(state.isPaused);
        setCurrentStep(state.currentStep);
        setBpmState(state.bpm);
        setSwingState(state.swing);
        setStepResolutionState(state.stepResolution);
        setPerformanceStats(state.performanceStats);
      });

      sequencerEngineRef.current.onStep((stepIndex) => {
        setCurrentStep(stepIndex);
      });

      setIsInitialized(true);
    } catch (error) {
      console.error('Failed to initialize sequencer services:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [isInitialized]);

  // Auto-initialize on mount
  useEffect(() => {
    if (autoInitialize && !isInitialized) {
      errorRecovery.executeWithRetry(initializeServices, {
        maxRetries: 3,
        context: { operation: 'initialize_sequencer' }
      }).catch(error => {
        console.error('Failed to initialize sequencer after retries:', error);
      });
    }
  }, [autoInitialize, isInitialized, initializeServices, errorRecovery]);

  // Transport controls
  const play = useCallback(async () => {
    if (!sequencerEngineRef.current) {
      throw new Error('Sequencer not initialized');
    }

    return errorRecovery.executeWithRetry(
      () => sequencerEngineRef.current.start(),
      { context: { operation: 'play' } }
    );
  }, [errorRecovery]);

  const pause = useCallback(() => {
    if (!sequencerEngineRef.current) {
      throw new Error('Sequencer not initialized');
    }

    return errorRecovery.executeWithRetry(
      () => sequencerEngineRef.current.pause(),
      { context: { operation: 'pause' } }
    );
  }, [errorRecovery]);

  const stop = useCallback(() => {
    if (!sequencerEngineRef.current) {
      throw new Error('Sequencer not initialized');
    }

    return errorRecovery.executeWithRetry(
      () => sequencerEngineRef.current.stop(),
      { context: { operation: 'stop' } }
    );
  }, [errorRecovery]);

  const resume = useCallback(async () => {
    if (!sequencerEngineRef.current) {
      throw new Error('Sequencer not initialized');
    }

    return errorRecovery.executeWithRetry(
      () => sequencerEngineRef.current.resume(),
      { context: { operation: 'resume' } }
    );
  }, [errorRecovery]);

  // BPM control
  const setBPM = useCallback((newBpm) => {
    if (!sequencerEngineRef.current) {
      throw new Error('Sequencer not initialized');
    }

    return errorRecovery.executeWithRetry(
      () => sequencerEngineRef.current.setBPM(newBpm),
      { context: { operation: 'set_bpm', bpm: newBpm } }
    );
  }, [errorRecovery]);

  // Swing control
  const setSwing = useCallback((newSwing) => {
    if (!sequencerEngineRef.current) {
      throw new Error('Sequencer not initialized');
    }

    return errorRecovery.executeWithRetry(
      () => sequencerEngineRef.current.setSwing(newSwing),
      { context: { operation: 'set_swing', swing: newSwing } }
    );
  }, [errorRecovery]);

  // Step resolution control
  const setStepResolution = useCallback((newResolution) => {
    if (!sequencerEngineRef.current) {
      throw new Error('Sequencer not initialized');
    }

    return errorRecovery.executeWithRetry(
      () => sequencerEngineRef.current.setStepResolution(newResolution),
      { context: { operation: 'set_step_resolution', resolution: newResolution } }
    );
  }, [errorRecovery]);

  // Pattern management
  const createPattern = useCallback((name, tracks = 8, steps = 16) => {
    if (!patternManagerRef.current) {
      throw new Error('Pattern manager not initialized');
    }

    return errorRecovery.executeWithRetry(
      () => {
        const pattern = patternManagerRef.current.createPattern(name, tracks, steps);
        setPatterns(prev => [...prev, pattern]);
        return pattern;
      },
      { context: { operation: 'create_pattern', name, tracks, steps } }
    );
  }, [errorRecovery]);

  const loadPattern = useCallback(async (patternId) => {
    if (!patternManagerRef.current) {
      throw new Error('Pattern manager not initialized');
    }

    return errorRecovery.executeWithRetry(
      async () => {
        const pattern = await patternManagerRef.current.loadPattern(patternId);
        setCurrentPattern(pattern);
        return pattern;
      },
      { context: { operation: 'load_pattern', patternId } }
    );
  }, [errorRecovery]);

  const savePattern = useCallback(async (pattern) => {
    if (!patternManagerRef.current) {
      throw new Error('Pattern manager not initialized');
    }

    return errorRecovery.executeWithRetry(
      async () => {
        const patternId = await patternManagerRef.current.savePattern(pattern);
        
        // Update patterns list
        setPatterns(prev => {
          const existing = prev.find(p => p.id === patternId);
          if (existing) {
            return prev.map(p => p.id === patternId ? pattern : p);
          } else {
            return [...prev, pattern];
          }
        });
        
        return patternId;
      },
      { context: { operation: 'save_pattern', patternId: pattern?.id } }
    );
  }, [errorRecovery]);

  const duplicatePattern = useCallback((patternId, newName) => {
    if (!patternManagerRef.current) {
      throw new Error('Pattern manager not initialized');
    }

    return errorRecovery.executeWithRetry(
      () => {
        const duplicated = patternManagerRef.current.duplicatePattern(patternId, newName);
        setPatterns(prev => [...prev, duplicated]);
        return duplicated;
      },
      { context: { operation: 'duplicate_pattern', patternId, newName } }
    );
  }, [errorRecovery]);

  const deletePattern = useCallback((patternId) => {
    if (!patternManagerRef.current) {
      throw new Error('Pattern manager not initialized');
    }

    return errorRecovery.executeWithRetry(
      () => {
        const success = patternManagerRef.current.deletePattern(patternId);
        if (success) {
          setPatterns(prev => prev.filter(p => p.id !== patternId));
          if (currentPattern?.id === patternId) {
            setCurrentPattern(null);
          }
        }
        return success;
      },
      { context: { operation: 'delete_pattern', patternId } }
    );
  }, [errorRecovery, currentPattern]);

  // Step manipulation
  const toggleStep = useCallback((trackId, stepIndex) => {
    if (!patternManagerRef.current) {
      throw new Error('Pattern manager not initialized');
    }

    return errorRecovery.executeWithRetry(
      () => {
        patternManagerRef.current.toggleStep(trackId, stepIndex);
        // Update current pattern state
        if (currentPattern) {
          setCurrentPattern({ ...patternManagerRef.current.getCurrentPattern() });
        }
      },
      { context: { operation: 'toggle_step', trackId, stepIndex } }
    );
  }, [errorRecovery, currentPattern]);

  const setStepVelocity = useCallback((trackId, stepIndex, velocity) => {
    if (!patternManagerRef.current) {
      throw new Error('Pattern manager not initialized');
    }

    return errorRecovery.executeWithRetry(
      () => {
        patternManagerRef.current.setStepVelocity(trackId, stepIndex, velocity);
        // Update current pattern state
        if (currentPattern) {
          setCurrentPattern({ ...patternManagerRef.current.getCurrentPattern() });
        }
      },
      { context: { operation: 'set_step_velocity', trackId, stepIndex, velocity } }
    );
  }, [errorRecovery, currentPattern]);

  const clearPattern = useCallback(() => {
    if (!patternManagerRef.current) {
      throw new Error('Pattern manager not initialized');
    }

    return errorRecovery.executeWithRetry(
      () => {
        patternManagerRef.current.clearPattern();
        // Update current pattern state
        if (currentPattern) {
          setCurrentPattern({ ...patternManagerRef.current.getCurrentPattern() });
        }
      },
      { context: { operation: 'clear_pattern' } }
    );
  }, [errorRecovery, currentPattern]);

  // Track controls
  const setTrackVolume = useCallback((trackId, volume) => {
    if (!patternManagerRef.current) {
      throw new Error('Pattern manager not initialized');
    }

    return errorRecovery.executeWithRetry(
      () => {
        patternManagerRef.current.setTrackVolume(trackId, volume);
        // Update current pattern state
        if (currentPattern) {
          setCurrentPattern({ ...patternManagerRef.current.getCurrentPattern() });
        }
      },
      { context: { operation: 'set_track_volume', trackId, volume } }
    );
  }, [errorRecovery, currentPattern]);

  const toggleTrackMute = useCallback((trackId) => {
    if (!patternManagerRef.current) {
      throw new Error('Pattern manager not initialized');
    }

    return errorRecovery.executeWithRetry(
      () => {
        patternManagerRef.current.toggleTrackMute(trackId);
        // Update current pattern state
        if (currentPattern) {
          setCurrentPattern({ ...patternManagerRef.current.getCurrentPattern() });
        }
      },
      { context: { operation: 'toggle_track_mute', trackId } }
    );
  }, [errorRecovery, currentPattern]);

  const toggleTrackSolo = useCallback((trackId) => {
    if (!patternManagerRef.current) {
      throw new Error('Pattern manager not initialized');
    }

    return errorRecovery.executeWithRetry(
      () => {
        patternManagerRef.current.toggleTrackSolo(trackId);
        // Update current pattern state
        if (currentPattern) {
          setCurrentPattern({ ...patternManagerRef.current.getCurrentPattern() });
        }
      },
      { context: { operation: 'toggle_track_solo', trackId } }
    );
  }, [errorRecovery, currentPattern]);

  const setTrackRandomization = useCallback((trackId, randomization) => {
    if (!patternManagerRef.current) {
      throw new Error('Pattern manager not initialized');
    }

    return errorRecovery.executeWithRetry(
      () => {
        patternManagerRef.current.setTrackRandomization(trackId, randomization);
        // Update current pattern state
        if (currentPattern) {
          setCurrentPattern({ ...patternManagerRef.current.getCurrentPattern() });
        }
      },
      { context: { operation: 'set_track_randomization', trackId } }
    );
  }, [errorRecovery, currentPattern]);

  // Utility functions
  const getSequencerState = useCallback(() => {
    if (!sequencerEngineRef.current) {
      return null;
    }
    return sequencerEngineRef.current.getState();
  }, []);

  const getPerformanceStats = useCallback(() => {
    if (!sequencerEngineRef.current) {
      return null;
    }
    return sequencerEngineRef.current.getPerformanceStats();
  }, []);

  // Cleanup
  const cleanup = useCallback(() => {
    if (sequencerEngineRef.current && typeof sequencerEngineRef.current.destroy === 'function') {
      sequencerEngineRef.current.destroy();
      sequencerEngineRef.current = null;
    }
    
    if (patternManagerRef.current && typeof patternManagerRef.current.cleanup === 'function') {
      patternManagerRef.current.cleanup();
      patternManagerRef.current = null;
    }
    
    if (sampleManagerRef.current && typeof sampleManagerRef.current.cleanup === 'function') {
      sampleManagerRef.current.cleanup();
      sampleManagerRef.current = null;
    }

    setIsInitialized(false);
    setCurrentPattern(null);
    setPatterns([]);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  return {
    // State
    isInitialized,
    isLoading,
    isPlaying,
    isPaused,
    currentStep,
    bpm,
    swing,
    stepResolution,
    currentPattern,
    patterns,
    performanceStats,
    
    // Transport controls
    play,
    pause,
    stop,
    resume,
    
    // Parameter controls
    setBPM,
    setSwing,
    setStepResolution,
    
    // Pattern management
    createPattern,
    loadPattern,
    savePattern,
    duplicatePattern,
    deletePattern,
    
    // Step manipulation
    toggleStep,
    setStepVelocity,
    clearPattern,
    
    // Track controls
    setTrackVolume,
    toggleTrackMute,
    toggleTrackSolo,
    setTrackRandomization,
    
    // Utilities
    getSequencerState,
    getPerformanceStats,
    initializeServices,
    cleanup,
    
    // Error handling
    error: errorRecovery.error,
    isRetrying: errorRecovery.isRetrying,
    retryCount: errorRecovery.retryCount,
    reset: errorRecovery.reset,
    
    // Service references (for advanced usage)
    sequencerEngine: sequencerEngineRef.current,
    patternManager: patternManagerRef.current,
    sampleManager: sampleManagerRef.current,
    audioContext: audioContextRef.current
  };
};