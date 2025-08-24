/**
 * SamplePlaybackEngine - Seamless audio playback for YouTube Audio Sampler
 * 
 * Manages sample playback with seamless timestamp jumping, AudioContext scheduling
 * for overlapping sample playback, volume control, and audio effects management.
 * Now includes performance monitoring and optimized memory management.
 */

import StorageManager from './StorageManager.js';
import performanceMonitor from './PerformanceMonitor.js';
import memoryManager from './MemoryManager.js';

export class SamplePlaybackEngine {
  constructor() {
    this.audioContext = null;
    this.masterGainNode = null;
    this.activeSources = new Map(); // Track active audio sources
    this.audioBuffer = null;
    this.storageManager = StorageManager;
    this.isInitialized = false;
    this.masterVolume = 1.0;
    
    // Bind methods to preserve context
    this.initializeAudioContext = this.initializeAudioContext.bind(this);
    this.cleanup = this.cleanup.bind(this);
  }

  /**
   * Initialize AudioContext and master gain node
   */
  async initializeAudioContext() {
    try {
      if (!this.audioContext || this.audioContext.state === 'closed') {
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        
        // Create master gain node for volume control
        this.masterGainNode = this.audioContext.createGain();
        this.masterGainNode.connect(this.audioContext.destination);
        this.masterGainNode.gain.value = this.masterVolume;
      }

      // Resume context if suspended
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      this.isInitialized = true;
      return true;
    } catch (error) {
      console.error('Failed to initialize AudioContext:', error);
      throw new Error(`AudioContext initialization failed: ${error.message}`);
    }
  }

  /**
   * Load audio buffer from storage or provided buffer
   * @param {string} audioId - Unique identifier for the audio
   * @param {ArrayBuffer} [audioBuffer] - Optional audio buffer to use directly
   */
  async loadAudioBuffer(audioId, audioBuffer = null) {
    try {
      await this.initializeAudioContext();

      let bufferToUse = audioBuffer;
      
      if (!bufferToUse) {
        // Try to load from storage
        const cachedData = await this.storageManager.getAudioData(audioId);
        if (!cachedData || !cachedData.audioBuffer) {
          throw new Error(`No audio buffer found for ID: ${audioId}`);
        }
        bufferToUse = cachedData.audioBuffer;
      }

      // Decode audio buffer
      this.audioBuffer = await this.audioContext.decodeAudioData(bufferToUse.slice());
      return this.audioBuffer;
    } catch (error) {
      console.error('Failed to load audio buffer:', error);
      throw new Error(`Audio buffer loading failed: ${error.message}`);
    }
  }

  /**
   * Play audio sample from specified timestamp
   * @param {number} startTime - Start time in seconds
   * @param {number} [duration] - Duration in seconds (optional, plays to end if not specified)
   * @param {number} [volume] - Volume level (0-1, defaults to master volume)
   * @param {string} [sampleId] - Unique ID for this sample instance
   */
  async playSample(startTime, duration = null, volume = null, sampleId = null) {
    const endMeasurement = performanceMonitor.startMeasurement('sample_playback');
    
    try {
      if (!this.audioBuffer) {
        throw new Error('No audio buffer loaded');
      }

      await this.initializeAudioContext();

      // Generate unique sample ID if not provided
      const id = sampleId || `sample_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Validate start time
      if (startTime < 0 || startTime >= this.audioBuffer.duration) {
        throw new Error(`Invalid start time: ${startTime}. Must be between 0 and ${this.audioBuffer.duration}`);
      }

      // Calculate actual duration
      const maxDuration = this.audioBuffer.duration - startTime;
      const actualDuration = duration ? Math.min(duration, maxDuration) : maxDuration;

      // Create audio source
      const source = this.audioContext.createBufferSource();
      source.buffer = this.audioBuffer;

      // Create gain node for this sample
      const gainNode = this.audioContext.createGain();
      const sampleVolume = volume !== null ? volume : this.masterVolume;
      gainNode.gain.value = sampleVolume;

      // Connect audio graph
      source.connect(gainNode);
      gainNode.connect(this.masterGainNode);

      // Store reference to active source
      this.activeSources.set(id, {
        source,
        gainNode,
        startTime,
        duration: actualDuration,
        startedAt: this.audioContext.currentTime
      });

      // Set up cleanup when sample ends
      source.onended = () => {
        this.activeSources.delete(id);
      };

      // Start playback
      const when = this.audioContext.currentTime;
      source.start(when, startTime, actualDuration);

      const result = {
        id,
        startTime,
        duration: actualDuration,
        volume: sampleVolume
      };

      endMeasurement({ 
        success: true, 
        sampleId: id, 
        startTime, 
        duration: actualDuration,
        activeSamples: this.activeSources.size 
      });

      return result;
    } catch (error) {
      endMeasurement({ error: error.message, startTime, duration });
      console.error('Failed to play sample:', error);
      throw new Error(`Sample playback failed: ${error.message}`);
    }
  }

  /**
   * Stop specific sample by ID
   * @param {string} sampleId - ID of the sample to stop
   */
  stopSample(sampleId) {
    try {
      const sample = this.activeSources.get(sampleId);
      if (sample) {
        sample.source.stop();
        this.activeSources.delete(sampleId);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to stop sample:', error);
      return false;
    }
  }

  /**
   * Stop all currently playing samples
   */
  stopAllSamples() {
    try {
      for (const [id, sample] of this.activeSources) {
        try {
          sample.source.stop();
        } catch (error) {
          console.warn(`Failed to stop sample ${id}:`, error);
        }
      }
      this.activeSources.clear();
    } catch (error) {
      console.error('Failed to stop all samples:', error);
    }
  }

  /**
   * Set master volume
   * @param {number} volume - Volume level (0-1)
   */
  setMasterVolume(volume) {
    try {
      this.masterVolume = Math.max(0, Math.min(1, volume));
      if (this.masterGainNode) {
        this.masterGainNode.gain.value = this.masterVolume;
      }
    } catch (error) {
      console.error('Failed to set master volume:', error);
    }
  }

  /**
   * Set volume for specific sample
   * @param {string} sampleId - ID of the sample
   * @param {number} volume - Volume level (0-1)
   */
  setSampleVolume(sampleId, volume) {
    try {
      const sample = this.activeSources.get(sampleId);
      if (sample) {
        const clampedVolume = Math.max(0, Math.min(1, volume));
        sample.gainNode.gain.value = clampedVolume;
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to set sample volume:', error);
      return false;
    }
  }

  /**
   * Get information about currently playing samples
   */
  getActiveSamples() {
    const samples = [];
    const currentTime = this.audioContext ? this.audioContext.currentTime : 0;
    
    for (const [id, sample] of this.activeSources) {
      const elapsed = currentTime - sample.startedAt;
      const remaining = Math.max(0, sample.duration - elapsed);
      
      samples.push({
        id,
        startTime: sample.startTime,
        duration: sample.duration,
        elapsed,
        remaining,
        volume: sample.gainNode.gain.value
      });
    }
    
    return samples;
  }

  /**
   * Seamlessly jump to a new timestamp while maintaining playback
   * @param {number} newTimestamp - New timestamp to jump to
   * @param {boolean} [maintainPlayback] - Whether to continue playing from new position
   */
  async jumpToTimestamp(newTimestamp, maintainPlayback = true) {
    const endMeasurement = performanceMonitor.startMeasurement('timestamp_jump');
    
    try {
      if (!this.audioBuffer) {
        throw new Error('No audio buffer loaded');
      }

      // Validate timestamp
      if (newTimestamp < 0 || newTimestamp >= this.audioBuffer.duration) {
        throw new Error(`Invalid timestamp: ${newTimestamp}. Must be between 0 and ${this.audioBuffer.duration}`);
      }

      // Stop all current samples
      const previousSampleCount = this.activeSources.size;
      this.stopAllSamples();

      let result;
      // If maintaining playback, start new sample from the timestamp
      if (maintainPlayback) {
        result = await this.playSample(newTimestamp);
      } else {
        result = { timestamp: newTimestamp, playing: false };
      }

      endMeasurement({ 
        success: true, 
        newTimestamp, 
        maintainPlayback,
        previousSampleCount,
        newSampleId: result.id || null 
      });

      return result;
    } catch (error) {
      endMeasurement({ error: error.message, newTimestamp, maintainPlayback });
      console.error('Failed to jump to timestamp:', error);
      throw new Error(`Timestamp jump failed: ${error.message}`);
    }
  }

  /**
   * Get current audio context state and engine status
   */
  getStatus() {
    return {
      isInitialized: this.isInitialized,
      audioContextState: this.audioContext ? this.audioContext.state : 'not-created',
      hasAudioBuffer: !!this.audioBuffer,
      audioBufferDuration: this.audioBuffer ? this.audioBuffer.duration : 0,
      activeSamplesCount: this.activeSources.size,
      masterVolume: this.masterVolume
    };
  }

  /**
   * Clean up resources
   */
  async cleanup() {
    try {
      // Stop all samples
      this.stopAllSamples();

      // Close audio context
      if (this.audioContext && this.audioContext.state !== 'closed') {
        await this.audioContext.close();
      }

      // Reset state
      this.audioContext = null;
      this.masterGainNode = null;
      this.audioBuffer = null;
      this.isInitialized = false;
      this.activeSources.clear();
    } catch (error) {
      console.error('Failed to cleanup SamplePlaybackEngine:', error);
    }
  }
}