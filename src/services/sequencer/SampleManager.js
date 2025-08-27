/**
 * @fileoverview Sample management service
 * Handles sample preloading, management, and integration with existing audio infrastructure
 */

import sequencerMemoryManager from './SequencerMemoryManager.js';

/**
 * Manages drum samples and integrates with existing audio playback systems
 */
class SampleManager {
  constructor() {
    /** @type {Map<string, import('../../types/sequencer.js').Sample>} */
    this.samples = new Map();
    
    /** @type {import('../SamplePlaybackEngine.js').SamplePlaybackEngine|null} */
    this.samplePlaybackEngine = null;
    
    /** @type {Map<string, string>} Track ID to Sample ID mapping */
    this.trackSampleAssignments = new Map();
    
    /** @type {Set<string>} */
    this.preloadedSamples = new Set();
    
    /** @type {boolean} */
    this.isLoading = false;
    
    /** @type {Map<string, number>} Track ID to volume level mapping */
    this.trackVolumeSettings = new Map();
    
    /** @type {Set<string>} Muted track IDs */
    this.mutedTracks = new Set();
    
    // Set up memory management
    sequencerMemoryManager.onCleanup((data) => {
      console.log('SampleManager: Memory cleanup performed', data);
    });
  }

  /**
   * Initialize the sample manager with existing audio infrastructure
   * @param {import('../SamplePlaybackEngine.js').SamplePlaybackEngine} samplePlaybackEngine - Existing playback engine
   * @returns {void}
   */
  initialize(samplePlaybackEngine) {
    if (!samplePlaybackEngine) {
      throw new Error('SamplePlaybackEngine is required for SampleManager');
    }

    this.samplePlaybackEngine = samplePlaybackEngine;
  }

  /**
   * Load a sample pack
   * @param {string} packId - Sample pack ID
   * @returns {Promise<void>}
   */
  async loadSamplePack(packId) {
    if (!packId || typeof packId !== 'string') {
      throw new Error('Pack ID is required and must be a string');
    }

    this.isLoading = true;

    try {
      // For now, load a default drum kit
      // In future tasks, this will integrate with Firebase/Cloud Storage
      const defaultSamples = this.getDefaultDrumKit();
      
      for (const sampleData of defaultSamples) {
        await this.loadSample(sampleData.id, sampleData.url, sampleData.metadata);
        
        // Preload the sample if SamplePlaybackEngine is available
        if (this.samplePlaybackEngine) {
          await this.samplePlaybackEngine.preloadSample(sampleData.url);
        }
      }

      this.isLoading = false;
    } catch (error) {
      this.isLoading = false;
      console.error('Error loading sample pack:', error);
      throw error;
    }
  }

  /**
   * Preload samples for immediate playback
   * @param {string[]} sampleList - List of sample IDs to preload
   * @param {Function} [progressCallback] - Optional progress callback (loaded, total) => void
   * @returns {Promise<Object>} Preloading results with success/failure counts
   */
  async preloadSamples(sampleList, progressCallback = null) {
    if (!Array.isArray(sampleList)) {
      throw new Error('Sample list must be an array');
    }

    this.isLoading = true;
    const results = {
      total: sampleList.length,
      successful: 0,
      failed: 0,
      errors: []
    };

    try {
      for (let i = 0; i < sampleList.length; i++) {
        const sampleId = sampleList[i];
        
        try {
          if (!this.preloadedSamples.has(sampleId)) {
            const sample = this.samples.get(sampleId);
            if (sample && this.samplePlaybackEngine) {
              // Use existing SamplePlaybackEngine to preload
              await this.samplePlaybackEngine.preloadSample(sample.filename);
              this.preloadedSamples.add(sampleId);
              results.successful++;
            } else {
              throw new Error(`Sample ${sampleId} not found or no playback engine available`);
            }
          } else {
            results.successful++; // Already preloaded
          }
        } catch (error) {
          console.warn(`Failed to preload sample ${sampleId}:`, error);
          results.failed++;
          results.errors.push({ sampleId, error: error.message });
          
          // Try to load a fallback sample
          await this.loadFallbackSample(sampleId);
        }

        // Report progress
        if (progressCallback) {
          progressCallback(i + 1, sampleList.length);
        }
      }

      this.isLoading = false;
      return results;
    } catch (error) {
      this.isLoading = false;
      console.error('Error preloading samples:', error);
      throw error;
    }
  }

  /**
   * Preload all samples in the current sample pack
   * @param {Function} [progressCallback] - Optional progress callback
   * @returns {Promise<Object>} Preloading results
   */
  async preloadAllSamples(progressCallback = null) {
    const allSampleIds = Array.from(this.samples.keys());
    return this.preloadSamples(allSampleIds, progressCallback);
  }

  /**
   * Get a sample by ID
   * @param {string} sampleId - Sample ID
   * @returns {import('../../types/sequencer.js').Sample|null}
   */
  getSample(sampleId) {
    if (!sampleId || typeof sampleId !== 'string') {
      return null;
    }

    // Try memory manager first (includes cache)
    let sample = sequencerMemoryManager.getSample(sampleId);
    
    // Fallback to local samples map
    if (!sample) {
      sample = this.samples.get(sampleId);
    }

    return sample || null;
  }

  /**
   * Assign a sample to a track
   * @param {string} trackId - Track ID
   * @param {string} sampleId - Sample ID to assign
   * @returns {boolean} Whether assignment was successful
   */
  assignSampleToTrack(trackId, sampleId) {
    if (!this.validateSampleAssignment(trackId, sampleId)) {
      return false;
    }

    this.trackSampleAssignments.set(trackId, sampleId);
    return true;
  }

  /**
   * Get the sample assigned to a track
   * @param {string} trackId - Track ID
   * @returns {import('../../types/sequencer.js').Sample|null}
   */
  getTrackSample(trackId) {
    if (!trackId || typeof trackId !== 'string') {
      return null;
    }

    const sampleId = this.trackSampleAssignments.get(trackId);
    if (!sampleId) {
      return null;
    }

    return this.getSample(sampleId);
  }

  /**
   * Load a single sample from URL or file
   * @param {string} sampleId - Unique sample ID
   * @param {string} url - Sample URL or file path
   * @param {Object} metadata - Sample metadata
   * @returns {Promise<import('../../types/sequencer.js').Sample>}
   */
  async loadSample(sampleId, url, metadata = {}) {
    if (!sampleId || typeof sampleId !== 'string') {
      throw new Error('Sample ID is required and must be a string');
    }

    if (!url || typeof url !== 'string') {
      throw new Error('Sample URL is required and must be a string');
    }

    try {
      // Extract sound type from generated URL
      const soundType = this.extractSoundTypeFromUrl(url);
      
      // Create a mock audio buffer with generated drum sound
      const mockAudioBuffer = this.createMockAudioBuffer(soundType);

      const sample = {
        id: sampleId,
        name: metadata.name || sampleId,
        filename: url,
        audioBuffer: mockAudioBuffer,
        metadata: {
          duration: metadata.duration || 1.0,
          sampleRate: metadata.sampleRate || 44100,
          channels: metadata.channels || 1,
          size: metadata.size || 44100,
          ...metadata
        },
        tags: metadata.tags || []
      };

      this.samples.set(sampleId, sample);
      
      // Store in memory manager
      sequencerMemoryManager.storeSample(sampleId, sample);
      
      // Store audio buffer separately if present
      if (sample.audioBuffer) {
        sequencerMemoryManager.storeAudioBuffer(`${sampleId}_buffer`, sample.audioBuffer);
      }
      
      return sample;
    } catch (error) {
      console.error(`Error loading sample ${sampleId}:`, error);
      throw error;
    }
  }

  /**
   * Validate sample assignment
   * @param {string} trackId - Track ID
   * @param {string} sampleId - Sample ID
   * @returns {boolean} Whether assignment is valid
   */
  validateSampleAssignment(trackId, sampleId) {
    if (!trackId || typeof trackId !== 'string') {
      return false;
    }

    if (!sampleId || typeof sampleId !== 'string') {
      return false;
    }

    // Check if sample exists
    if (!this.samples.has(sampleId)) {
      return false;
    }

    return true;
  }

  /**
   * Get all available samples
   * @returns {import('../../types/sequencer.js').Sample[]}
   */
  getAllSamples() {
    return Array.from(this.samples.values());
  }

  /**
   * Get samples by category/tag
   * @param {string} tag - Tag to filter by
   * @returns {import('../../types/sequencer.js').Sample[]}
   */
  getSamplesByTag(tag) {
    if (!tag || typeof tag !== 'string') {
      return [];
    }

    return Array.from(this.samples.values()).filter(sample => 
      sample.tags && sample.tags.includes(tag)
    );
  }

  /**
   * Check if samples are currently loading
   * @returns {boolean}
   */
  isLoadingSamples() {
    return this.isLoading;
  }

  /**
   * Get loading progress
   * @returns {Object} Loading progress information
   */
  getLoadingProgress() {
    const totalSamples = this.samples.size;
    const preloadedCount = this.preloadedSamples.size;
    
    return {
      total: totalSamples,
      loaded: preloadedCount,
      percentage: totalSamples > 0 ? (preloadedCount / totalSamples) * 100 : 0,
      isLoading: this.isLoading
    };
  }

  /**
   * Clear all loaded samples and assignments
   * @returns {void}
   */
  clearSamples() {
    this.samples.clear();
    this.trackSampleAssignments.clear();
    this.preloadedSamples.clear();
    this.trackVolumeSettings.clear();
    this.mutedTracks.clear();
    this.isLoading = false;
    
    // Clear from memory manager
    sequencerMemoryManager.cleanup({ clearSamples: true, clearAudioBuffers: true });
  }

  /**
   * Clean up resources
   * @returns {void}
   */
  destroy() {
    this.clearSamples();
    this.samplePlaybackEngine = null;
    
    // Stop memory monitoring
    sequencerMemoryManager.stopMonitoring();
  }

  /**
   * Get memory usage statistics
   * @returns {Object} Memory usage stats
   */
  getMemoryUsage() {
    return sequencerMemoryManager.getMemoryUsage();
  }

  /**
   * Perform memory cleanup
   * @param {Object} options - Cleanup options
   * @returns {number} Amount of memory freed
   */
  performMemoryCleanup(options = {}) {
    return sequencerMemoryManager.cleanup(options);
  }

  /**
   * Get default drum kit samples for testing
   * @private
   * @returns {Array} Array of sample data
   */
  getDefaultDrumKit() {
    // Return generated samples instead of file URLs for now
    return [
      {
        id: 'kick_001',
        url: 'generated://kick',
        metadata: {
          name: 'Kick 001',
          duration: 0.8,
          tags: ['kick', 'drum', 'electronic']
        }
      },
      {
        id: 'snare_001',
        url: 'generated://snare',
        metadata: {
          name: 'Snare 001',
          duration: 0.5,
          tags: ['snare', 'drum', 'electronic']
        }
      },
      {
        id: 'hihat_001',
        url: 'generated://hihat',
        metadata: {
          name: 'Hi-Hat 001',
          duration: 0.2,
          tags: ['hihat', 'drum', 'electronic']
        }
      },
      {
        id: 'openhat_001',
        url: 'generated://openhat',
        metadata: {
          name: 'Open Hat 001',
          duration: 0.6,
          tags: ['openhat', 'drum', 'electronic']
        }
      },
      {
        id: 'crash_001',
        url: '/samples/crash_001.wav',
        metadata: {
          name: 'Crash 001',
          duration: 2.0,
          tags: ['crash', 'drum', 'electronic']
        }
      },
      {
        id: 'ride_001',
        url: '/samples/ride_001.wav',
        metadata: {
          name: 'Ride 001',
          duration: 1.5,
          tags: ['ride', 'drum', 'electronic']
        }
      },
      {
        id: 'tom1_001',
        url: '/samples/tom1_001.wav',
        metadata: {
          name: 'Tom 1',
          duration: 0.7,
          tags: ['tom', 'drum', 'electronic']
        }
      },
      {
        id: 'tom2_001',
        url: '/samples/tom2_001.wav',
        metadata: {
          name: 'Tom 2',
          duration: 0.6,
          tags: ['tom', 'drum', 'electronic']
        }
      }
    ];
  }

  /**
   * Create a mock audio buffer for testing
   * @private
   * @param {string} soundType - Type of drum sound to generate
   * @returns {Object} Mock audio buffer with generated audio
   */
  createMockAudioBuffer(soundType = 'kick') {
    const sampleRate = 44100;
    const duration = this.getDurationForSoundType(soundType);
    const length = Math.floor(duration * sampleRate);
    
    // Generate audio data based on sound type
    const audioData = this.generateDrumSound(soundType, length, sampleRate);
    
    return {
      sampleRate,
      length,
      duration,
      numberOfChannels: 1,
      getChannelData: (channel) => audioData
    };
  }

  /**
   * Get duration for different sound types
   * @private
   * @param {string} soundType - Type of sound
   * @returns {number} Duration in seconds
   */
  getDurationForSoundType(soundType) {
    const durations = {
      kick: 0.8,
      snare: 0.5,
      hihat: 0.2,
      openhat: 0.6,
      crash: 1.2,
      ride: 0.8,
      tom: 0.6,
      clap: 0.3
    };
    return durations[soundType] || 0.5;
  }

  /**
   * Generate drum sound audio data
   * @private
   * @param {string} soundType - Type of drum sound
   * @param {number} length - Length in samples
   * @param {number} sampleRate - Sample rate
   * @returns {Float32Array} Generated audio data
   */
  generateDrumSound(soundType, length, sampleRate) {
    const audioData = new Float32Array(length);
    
    switch (soundType) {
      case 'kick':
        this.generateKickDrum(audioData, length, sampleRate);
        break;
      case 'snare':
        this.generateSnareDrum(audioData, length, sampleRate);
        break;
      case 'hihat':
        this.generateHiHat(audioData, length, sampleRate);
        break;
      case 'openhat':
        this.generateOpenHat(audioData, length, sampleRate);
        break;
      case 'crash':
        this.generateCrash(audioData, length, sampleRate);
        break;
      default:
        this.generateKickDrum(audioData, length, sampleRate);
    }
    
    return audioData;
  }

  /**
   * Play a sample through the existing playback engine
   * @param {string} sampleId - Sample ID to play
   * @param {number} velocity - Playback velocity (0.0 - 1.0)
   * @param {number} time - When to play (AudioContext time)
   * @returns {Promise<void>}
   */
  async playSample(sampleId, velocity = 1.0, time = 0) {
    const sample = this.getSample(sampleId);
    if (!sample || !this.samplePlaybackEngine) {
      return;
    }

    try {
      // Play the generated audio buffer directly
      await this.playGeneratedSample(sample, velocity, time);
    } catch (error) {
      console.error(`Error playing sample ${sampleId}:`, error);
    }
  }

  /**
   * Play a generated audio sample
   * @private
   * @param {Object} sample - Sample object with audio buffer
   * @param {number} velocity - Playback velocity (0.0 - 1.0)
   * @param {number} time - When to play (AudioContext time)
   * @returns {Promise<void>}
   */
  async playGeneratedSample(sample, velocity = 1.0, time = 0) {
    if (!this.samplePlaybackEngine || !this.samplePlaybackEngine.audioContext) {
      return;
    }

    const audioContext = this.samplePlaybackEngine.audioContext;
    const when = time || audioContext.currentTime;

    try {
      // Create audio buffer source
      const source = audioContext.createBufferSource();
      const gainNode = audioContext.createGain();

      // Convert our mock buffer to a real AudioBuffer
      const audioBuffer = this.createRealAudioBuffer(sample.audioBuffer, audioContext);
      
      source.buffer = audioBuffer;
      gainNode.gain.value = velocity;

      // Connect nodes
      source.connect(gainNode);
      gainNode.connect(audioContext.destination);

      // Start playback
      source.start(when);

      // Clean up when finished
      source.onended = () => {
        source.disconnect();
        gainNode.disconnect();
      };

    } catch (error) {
      console.error('Error playing generated sample:', error);
    }
  }

  /**
   * Convert mock audio buffer to real AudioBuffer
   * @private
   * @param {Object} mockBuffer - Mock audio buffer
   * @param {AudioContext} audioContext - Audio context
   * @returns {AudioBuffer} Real audio buffer
   */
  createRealAudioBuffer(mockBuffer, audioContext) {
    const audioBuffer = audioContext.createBuffer(
      mockBuffer.numberOfChannels,
      mockBuffer.length,
      mockBuffer.sampleRate
    );

    // Copy audio data
    for (let channel = 0; channel < mockBuffer.numberOfChannels; channel++) {
      const channelData = audioBuffer.getChannelData(channel);
      const sourceData = mockBuffer.getChannelData(channel);
      channelData.set(sourceData);
    }

    return audioBuffer;
  }

  /**
   * Schedule a note to be played at a specific time (used by sequencer)
   * @param {number} time - When to play (AudioContext time)
   * @param {import('../../types/sequencer.js').Sample} sample - Sample object to play
   * @param {number} velocity - Playback velocity (0.0 - 1.0)
   * @param {string} [trackId] - Track ID for volume control
   * @returns {void}
   */
  scheduleNote(time, sample, velocity = 1.0, trackId = null) {
    if (!sample || !this.samplePlaybackEngine) {
      return;
    }

    try {
      // Apply track-specific volume if trackId is provided
      let finalVelocity = velocity;
      if (trackId && this.trackVolumeSettings.has(trackId)) {
        const trackVolume = this.trackVolumeSettings.get(trackId);
        finalVelocity = velocity * trackVolume;
      }

      // Check if track is muted
      if (trackId && this.mutedTracks.has(trackId)) {
        return; // Don't play muted tracks
      }

      // Play the generated sample directly
      this.playGeneratedSample(sample, finalVelocity, time)
        .catch(error => {
          console.error('Error in scheduled sample playback:', error);
        });

    } catch (error) {
      console.error('Error scheduling note:', error);
    }
  }

  /**
   * Set volume level for a specific track
   * @param {string} trackId - Track ID
   * @param {number} volume - Volume level (0.0 - 1.0)
   * @returns {void}
   */
  setTrackVolume(trackId, volume) {
    if (!trackId || typeof trackId !== 'string') {
      return;
    }

    const clampedVolume = Math.max(0, Math.min(1, volume));
    this.trackVolumeSettings.set(trackId, clampedVolume);
  }

  /**
   * Get volume level for a specific track
   * @param {string} trackId - Track ID
   * @returns {number} Volume level (0.0 - 1.0)
   */
  getTrackVolume(trackId) {
    if (!trackId || typeof trackId !== 'string') {
      return 1.0;
    }

    const volume = this.trackVolumeSettings.get(trackId);
    return volume !== undefined ? volume : 1.0;
  }

  /**
   * Mute or unmute a track
   * @param {string} trackId - Track ID
   * @param {boolean} muted - Whether to mute the track
   * @returns {void}
   */
  setTrackMute(trackId, muted) {
    if (!trackId || typeof trackId !== 'string') {
      return;
    }

    if (muted) {
      this.mutedTracks.add(trackId);
    } else {
      this.mutedTracks.delete(trackId);
    }
  }

  /**
   * Check if a track is muted
   * @param {string} trackId - Track ID
   * @returns {boolean} Whether the track is muted
   */
  isTrackMuted(trackId) {
    return this.mutedTracks.has(trackId);
  }

  /**
   * Get track assignments
   * @returns {Map<string, string>} Map of track ID to sample ID
   */
  getTrackAssignments() {
    return new Map(this.trackSampleAssignments);
  }

  /**
   * Remove sample assignment from track
   * @param {string} trackId - Track ID
   * @returns {boolean} Whether removal was successful
   */
  removeTrackAssignment(trackId) {
    if (!trackId || typeof trackId !== 'string') {
      return false;
    }

    return this.trackSampleAssignments.delete(trackId);
  }

  /**
   * Check if a sample is preloaded
   * @param {string} sampleId - Sample ID
   * @returns {boolean} Whether sample is preloaded
   */
  isSamplePreloaded(sampleId) {
    return this.preloadedSamples.has(sampleId);
  }

  /**
   * Load a fallback sample when the original fails
   * @param {string} originalSampleId - Original sample ID that failed
   * @returns {Promise<void>}
   */
  async loadFallbackSample(originalSampleId) {
    try {
      // Create a simple fallback sample (silence or basic tone)
      const fallbackSample = {
        id: `${originalSampleId}_fallback`,
        name: `${originalSampleId} (Fallback)`,
        filename: 'fallback.wav',
        audioBuffer: this.createSilentAudioBuffer(),
        metadata: {
          duration: 0.1,
          sampleRate: 44100,
          channels: 1,
          size: 4410,
          isFallback: true
        },
        tags: ['fallback']
      };

      // Store the fallback sample
      this.samples.set(`${originalSampleId}_fallback`, fallbackSample);
      
      // Mark as preloaded
      this.preloadedSamples.add(`${originalSampleId}_fallback`);
      
      console.info(`Loaded fallback sample for ${originalSampleId}`);
    } catch (error) {
      console.error(`Failed to load fallback sample for ${originalSampleId}:`, error);
    }
  }

  /**
   * Create a silent audio buffer for fallback samples
   * @private
   * @returns {Object} Mock silent audio buffer
   */
  createSilentAudioBuffer() {
    // Mock silent AudioBuffer for testing
    return {
      sampleRate: 44100,
      length: 4410, // 0.1 seconds
      duration: 0.1,
      numberOfChannels: 1,
      getChannelData: (channel) => new Float32Array(4410) // All zeros = silence
    };
  }

  /**
   * Get preloading statistics
   * @returns {Object} Preloading statistics
   */
  getPreloadingStats() {
    const totalSamples = this.samples.size;
    const preloadedCount = this.preloadedSamples.size;
    const fallbackCount = Array.from(this.samples.values())
      .filter(sample => sample.metadata?.isFallback).length;
    
    return {
      total: totalSamples,
      preloaded: preloadedCount,
      fallbacks: fallbackCount,
      percentage: totalSamples > 0 ? (preloadedCount / totalSamples) * 100 : 0,
      isLoading: this.isLoading
    };
  }
  /**
   * Generate kick drum sound
   * @private
   */
  generateKickDrum(audioData, length, sampleRate) {
    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      const envelope = Math.exp(-t * 8); // Fast decay
      const frequency = 60 * Math.exp(-t * 10); // Pitch sweep down
      const sample = Math.sin(2 * Math.PI * frequency * t) * envelope * 0.8;
      audioData[i] = sample;
    }
  }

  /**
   * Generate snare drum sound
   * @private
   */
  generateSnareDrum(audioData, length, sampleRate) {
    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      const envelope = Math.exp(-t * 12); // Medium decay
      const tone = Math.sin(2 * Math.PI * 200 * t) * 0.3;
      const noise = (Math.random() * 2 - 1) * 0.7;
      const sample = (tone + noise) * envelope * 0.6;
      audioData[i] = sample;
    }
  }

  /**
   * Generate hi-hat sound
   * @private
   */
  generateHiHat(audioData, length, sampleRate) {
    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      const envelope = Math.exp(-t * 25); // Very fast decay
      const noise = (Math.random() * 2 - 1);
      // High-pass filter simulation
      const highFreq = noise * Math.sin(2 * Math.PI * 8000 * t);
      const sample = highFreq * envelope * 0.4;
      audioData[i] = sample;
    }
  }

  /**
   * Generate open hi-hat sound
   * @private
   */
  generateOpenHat(audioData, length, sampleRate) {
    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      const envelope = Math.exp(-t * 5); // Slower decay than closed hat
      const noise = (Math.random() * 2 - 1);
      const highFreq = noise * Math.sin(2 * Math.PI * 6000 * t);
      const sample = highFreq * envelope * 0.5;
      audioData[i] = sample;
    }
  }

  /**
   * Generate crash cymbal sound
   * @private
   */
  generateCrash(audioData, length, sampleRate) {
    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      const envelope = Math.exp(-t * 2); // Long decay
      const noise = (Math.random() * 2 - 1);
      const shimmer = Math.sin(2 * Math.PI * 4000 * t) * 0.3;
      const sample = (noise + shimmer) * envelope * 0.7;
      audioData[i] = sample;
    }
  }

  /**
   * Extract sound type from URL
   * @private
   * @param {string} url - Sample URL
   * @returns {string} Sound type
   */
  extractSoundTypeFromUrl(url) {
    if (url.includes('generated://')) {
      return url.replace('generated://', '');
    }
    
    // For file URLs, try to extract from filename
    const filename = url.split('/').pop().toLowerCase();
    
    if (filename.includes('kick')) return 'kick';
    if (filename.includes('snare')) return 'snare';
    if (filename.includes('hihat') || filename.includes('hat')) return 'hihat';
    if (filename.includes('open')) return 'openhat';
    if (filename.includes('crash')) return 'crash';
    if (filename.includes('ride')) return 'ride';
    if (filename.includes('tom')) return 'tom';
    if (filename.includes('clap')) return 'clap';
    
    return 'kick'; // Default
  }
}

export { SampleManager };