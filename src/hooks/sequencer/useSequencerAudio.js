/**
 * @fileoverview Sequencer audio hook
 * Manages audio-specific state for the sequencer
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { SamplePlaybackEngine } from '../../services/SamplePlaybackEngine.js';
import { useAudioErrorRecovery } from '../useErrorRecovery.js';

/**
 * Audio-specific state management hook for sequencer
 * @param {Object} options - Configuration options
 * @param {AudioContext} [options.audioContext] - External audio context to use
 * @param {Object} [options.sampleManager] - External sample manager instance
 * @param {boolean} [options.autoInitialize=true] - Whether to auto-initialize audio
 * @returns {Object} Audio state and control methods
 */
export const useSequencerAudio = (options = {}) => {
  const { 
    audioContext: externalAudioContext, 
    sampleManager: externalSampleManager,
    autoInitialize = true 
  } = options;
  
  // Audio services
  const audioContextRef = useRef(externalAudioContext || null);
  const samplePlaybackEngineRef = useRef(null);
  const sampleManagerRef = useRef(externalSampleManager || null);
  
  // Audio state
  const [isAudioInitialized, setIsAudioInitialized] = useState(false);
  const [isAudioContextSuspended, setIsAudioContextSuspended] = useState(false);
  const [masterVolume, setMasterVolume] = useState(1.0);
  const [isLoading, setIsLoading] = useState(false);
  const [loadedSamples, setLoadedSamples] = useState(new Map());
  const [sampleLoadingProgress, setSampleLoadingProgress] = useState(0);
  const [audioLatency, setAudioLatency] = useState(0);
  const [activeSources, setActiveSources] = useState(new Set());
  
  // Sample preloading state
  const [preloadedPacks, setPreloadedPacks] = useState(new Set());
  const [preloadingPacks, setPreloadingPacks] = useState(new Set());
  const [preloadErrors, setPreloadErrors] = useState(new Map());
  
  // Error recovery
  const audioErrorRecovery = useAudioErrorRecovery();

  // Initialize audio context and services
  const initializeAudio = useCallback(async () => {
    if (isAudioInitialized) return;

    try {
      setIsLoading(true);

      // Create or use existing audio context
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }

      // Monitor audio context state
      const handleStateChange = () => {
        setIsAudioContextSuspended(audioContextRef.current.state === 'suspended');
      };
      
      audioContextRef.current.addEventListener('statechange', handleStateChange);
      handleStateChange(); // Set initial state

      // Resume if suspended
      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }

      // Initialize sample playback engine
      samplePlaybackEngineRef.current = new SamplePlaybackEngine();
      await samplePlaybackEngineRef.current.initializeAudioContext();

      // Set up audio latency monitoring
      const measureLatency = () => {
        if (audioContextRef.current) {
          const baseLatency = audioContextRef.current.baseLatency || 0;
          const outputLatency = audioContextRef.current.outputLatency || 0;
          setAudioLatency(baseLatency + outputLatency);
        }
      };

      measureLatency();
      const latencyInterval = setInterval(measureLatency, 5000); // Update every 5 seconds

      setIsAudioInitialized(true);

      // Cleanup function
      return () => {
        clearInterval(latencyInterval);
        audioContextRef.current?.removeEventListener('statechange', handleStateChange);
      };

    } catch (error) {
      console.error('Failed to initialize audio:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [isAudioInitialized]);

  // Auto-initialize on mount
  useEffect(() => {
    if (autoInitialize && !isAudioInitialized) {
      audioErrorRecovery.executeAudioOperation(initializeAudio, {
        maxRetries: 3,
        context: { operation: 'initialize_audio' }
      }).catch(error => {
        console.error('Failed to initialize audio after retries:', error);
      });
    }
  }, [autoInitialize, isAudioInitialized, initializeAudio, audioErrorRecovery]);

  // Resume audio context
  const resumeAudioContext = useCallback(async () => {
    if (!audioContextRef.current) {
      throw new Error('Audio context not initialized');
    }

    return audioErrorRecovery.executeAudioOperation(
      async () => {
        if (audioContextRef.current.state === 'suspended') {
          await audioContextRef.current.resume();
        }
      },
      { context: { operation: 'resume_audio_context' } }
    );
  }, [audioErrorRecovery]);

  // Load audio buffer for sequencer
  const loadAudioBuffer = useCallback(async (audioId, audioBuffer) => {
    if (!samplePlaybackEngineRef.current) {
      throw new Error('Sample playback engine not initialized');
    }

    return audioErrorRecovery.executeAudioOperation(
      async () => {
        const buffer = await samplePlaybackEngineRef.current.loadAudioBuffer(audioId, audioBuffer);
        return buffer;
      },
      { context: { operation: 'load_audio_buffer', audioId } }
    );
  }, [audioErrorRecovery]);

  // Preload sample pack
  const preloadSamplePack = useCallback(async (packId, samples) => {
    if (preloadedPacks.has(packId) || preloadingPacks.has(packId)) {
      return; // Already loaded or loading
    }

    setPreloadingPacks(prev => new Set([...prev, packId]));
    setPreloadErrors(prev => {
      const newErrors = new Map(prev);
      newErrors.delete(packId);
      return newErrors;
    });

    try {
      const totalSamples = samples.length;
      let loadedCount = 0;

      const loadPromises = samples.map(async (sample) => {
        try {
          if (sampleManagerRef.current) {
            await sampleManagerRef.current.preloadSample(sample.id, sample.url);
          }
          
          setLoadedSamples(prev => new Map([...prev, [sample.id, sample]]));
          loadedCount++;
          setSampleLoadingProgress((loadedCount / totalSamples) * 100);
          
          return sample;
        } catch (error) {
          console.error(`Failed to load sample ${sample.id}:`, error);
          throw error;
        }
      });

      await Promise.all(loadPromises);
      
      setPreloadedPacks(prev => new Set([...prev, packId]));
      setSampleLoadingProgress(100);

    } catch (error) {
      setPreloadErrors(prev => new Map([...prev, [packId, error]]));
      throw error;
    } finally {
      setPreloadingPacks(prev => {
        const newSet = new Set(prev);
        newSet.delete(packId);
        return newSet;
      });
    }
  }, [preloadedPacks, preloadingPacks]);

  // Schedule note playback
  const scheduleNote = useCallback((time, sample, velocity, trackId) => {
    if (!samplePlaybackEngineRef.current) {
      throw new Error('Sample playback engine not initialized');
    }

    return audioErrorRecovery.executeAudioOperation(
      async () => {
        // Create unique source ID
        const sourceId = `${trackId}_${Date.now()}_${Math.random()}`;
        
        // Add to active sources
        setActiveSources(prev => new Set([...prev, sourceId]));

        // Schedule playback
        const duration = sample.metadata?.duration || null;
        const adjustedVolume = velocity * masterVolume;
        
        await samplePlaybackEngineRef.current.playSample(
          0, // Start from beginning of sample
          duration,
          adjustedVolume,
          sourceId
        );

        // Remove from active sources after playback
        setTimeout(() => {
          setActiveSources(prev => {
            const newSet = new Set(prev);
            newSet.delete(sourceId);
            return newSet;
          });
        }, (duration || 1) * 1000);

        return sourceId;
      },
      { context: { operation: 'schedule_note', trackId, velocity } }
    );
  }, [masterVolume, audioErrorRecovery]);

  // Stop all active sources
  const stopAllSources = useCallback(() => {
    if (!samplePlaybackEngineRef.current) {
      return;
    }

    return audioErrorRecovery.executeAudioOperation(
      () => {
        samplePlaybackEngineRef.current.stopAll();
        setActiveSources(new Set());
      },
      { context: { operation: 'stop_all_sources' } }
    );
  }, [audioErrorRecovery]);

  // Set master volume
  const setMasterVolumeLevel = useCallback((volume) => {
    if (typeof volume !== 'number' || volume < 0 || volume > 1) {
      throw new Error('Volume must be a number between 0 and 1');
    }

    return audioErrorRecovery.executeAudioOperation(
      () => {
        if (samplePlaybackEngineRef.current) {
          samplePlaybackEngineRef.current.setMasterVolume(volume);
        }
        setMasterVolume(volume);
      },
      { context: { operation: 'set_master_volume', volume } }
    );
  }, [audioErrorRecovery]);

  // Get audio context state
  const getAudioContextState = useCallback(() => {
    return audioContextRef.current?.state || 'closed';
  }, []);

  // Get audio performance metrics
  const getAudioPerformanceMetrics = useCallback(() => {
    if (!audioContextRef.current) {
      return null;
    }

    return {
      sampleRate: audioContextRef.current.sampleRate,
      currentTime: audioContextRef.current.currentTime,
      baseLatency: audioContextRef.current.baseLatency || 0,
      outputLatency: audioContextRef.current.outputLatency || 0,
      state: audioContextRef.current.state,
      activeSources: activeSources.size,
      loadedSamples: loadedSamples.size
    };
  }, [activeSources.size, loadedSamples.size]);

  // Check if sample is loaded
  const isSampleLoaded = useCallback((sampleId) => {
    return loadedSamples.has(sampleId);
  }, [loadedSamples]);

  // Get loaded sample
  const getLoadedSample = useCallback((sampleId) => {
    return loadedSamples.get(sampleId) || null;
  }, [loadedSamples]);

  // Clear loaded samples
  const clearLoadedSamples = useCallback(() => {
    setLoadedSamples(new Map());
    setPreloadedPacks(new Set());
    setPreloadErrors(new Map());
    setSampleLoadingProgress(0);
  }, []);

  // Audio context lifecycle management
  const suspendAudioContext = useCallback(async () => {
    if (!audioContextRef.current) {
      return;
    }

    return audioErrorRecovery.executeAudioOperation(
      async () => {
        if (audioContextRef.current.state === 'running') {
          await audioContextRef.current.suspend();
        }
      },
      { context: { operation: 'suspend_audio_context' } }
    );
  }, [audioErrorRecovery]);

  const closeAudioContext = useCallback(async () => {
    if (!audioContextRef.current) {
      return;
    }

    return audioErrorRecovery.executeAudioOperation(
      async () => {
        await audioContextRef.current.close();
        audioContextRef.current = null;
        setIsAudioInitialized(false);
      },
      { context: { operation: 'close_audio_context' } }
    );
  }, [audioErrorRecovery]);

  // Cleanup function
  const cleanup = useCallback(async () => {
    try {
      // Stop all active sources
      await stopAllSources();
      
      // Clear loaded samples
      clearLoadedSamples();
      
      // Clean up sample playback engine
      if (samplePlaybackEngineRef.current) {
        samplePlaybackEngineRef.current.cleanup();
        samplePlaybackEngineRef.current = null;
      }
      
      // Close audio context
      await closeAudioContext();
      
    } catch (error) {
      console.error('Error during audio cleanup:', error);
    }
  }, [stopAllSources, clearLoadedSamples, closeAudioContext]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup().catch(error => {
        console.error('Error during unmount cleanup:', error);
      });
    };
  }, [cleanup]);

  return {
    // State
    isAudioInitialized,
    isLoading,
    isAudioContextSuspended,
    masterVolume,
    audioLatency,
    activeSources: activeSources.size,
    loadedSamples: loadedSamples.size,
    sampleLoadingProgress,
    preloadedPacks: Array.from(preloadedPacks),
    preloadingPacks: Array.from(preloadingPacks),
    preloadErrors: Object.fromEntries(preloadErrors),
    
    // Audio context management
    initializeAudio,
    resumeAudioContext,
    suspendAudioContext,
    closeAudioContext,
    getAudioContextState,
    
    // Sample management
    loadAudioBuffer,
    preloadSamplePack,
    isSampleLoaded,
    getLoadedSample,
    clearLoadedSamples,
    
    // Playback control
    scheduleNote,
    stopAllSources,
    setMasterVolumeLevel,
    
    // Performance monitoring
    getAudioPerformanceMetrics,
    
    // Utilities
    cleanup,
    
    // Error handling
    error: audioErrorRecovery.error,
    isRetrying: audioErrorRecovery.isRetrying,
    retryCount: audioErrorRecovery.retryCount,
    reset: audioErrorRecovery.reset,
    getAudioErrorGuidance: audioErrorRecovery.getAudioErrorGuidance,
    
    // Service references (for advanced usage)
    audioContext: audioContextRef.current,
    samplePlaybackEngine: samplePlaybackEngineRef.current,
    sampleManager: sampleManagerRef.current
  };
};