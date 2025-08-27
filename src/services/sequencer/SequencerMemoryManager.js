/**
 * SequencerMemoryManager - Memory management for sequencer patterns and samples
 * 
 * Handles efficient storage, retrieval, and cleanup of sequencer data including
 * patterns, samples, and audio buffers. Provides memory usage monitoring and
 * optimization for extended sequencer use.
 */

import sequencerPerformanceMonitor from './SequencerPerformanceMonitor.js';

class SequencerMemoryManager {
  constructor() {
    this.patterns = new Map();
    this.samples = new Map();
    this.audioBuffers = new Map();
    this.patternCache = new Map();
    this.sampleCache = new Map();
    
    // Memory tracking
    this.memoryUsage = {
      patterns: 0,
      samples: 0,
      audioBuffers: 0,
      cache: 0
    };
    
    // Configuration
    this.config = {
      maxPatterns: 50,
      maxSamples: 100,
      maxAudioBuffers: 50,
      maxCacheSize: 20,
      memoryCheckInterval: 5000, // 5 seconds
      autoCleanupThreshold: 0.8, // 80% of memory limit
      compressionEnabled: true
    };
    
    this.memoryCheckInterval = null;
    this.isMonitoring = false;
    this.cleanupCallbacks = [];
  }

  /**
   * Start memory monitoring
   */
  startMonitoring() {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    
    // Start periodic memory checks
    this.memoryCheckInterval = setInterval(() => {
      this.checkMemoryUsage();
      this.reportMemoryUsage();
    }, this.config.memoryCheckInterval);
    
    console.log('SequencerMemoryManager monitoring started');
  }

  /**
   * Stop memory monitoring
   */
  stopMonitoring() {
    if (!this.isMonitoring) return;
    
    this.isMonitoring = false;
    
    if (this.memoryCheckInterval) {
      clearInterval(this.memoryCheckInterval);
      this.memoryCheckInterval = null;
    }
    
    console.log('SequencerMemoryManager monitoring stopped');
  }

  /**
   * Store a pattern in memory
   * @param {string} patternId - Pattern identifier
   * @param {Object} pattern - Pattern data
   * @returns {boolean} Success status
   */
  storePattern(patternId, pattern) {
    try {
      // Check if we're at capacity
      if (this.patterns.size >= this.config.maxPatterns) {
        this.cleanupOldPatterns();
      }
      
      // Calculate pattern size
      const patternSize = this.calculatePatternSize(pattern);
      
      // Store pattern
      this.patterns.set(patternId, {
        data: pattern,
        size: patternSize,
        timestamp: Date.now(),
        accessCount: 0,
        lastAccessed: Date.now()
      });
      
      // Update memory usage
      this.memoryUsage.patterns += patternSize;
      
      // Add to cache if frequently accessed
      if (this.patternCache.size < this.config.maxCacheSize) {
        this.patternCache.set(patternId, pattern);
        this.memoryUsage.cache += patternSize;
      }
      
      console.log(`Pattern ${patternId} stored (${this.formatBytes(patternSize)})`);
      return true;
      
    } catch (error) {
      console.error('Error storing pattern:', error);
      return false;
    }
  }

  /**
   * Retrieve a pattern from memory
   * @param {string} patternId - Pattern identifier
   * @returns {Object|null} Pattern data
   */
  getPattern(patternId) {
    // Check cache first
    if (this.patternCache.has(patternId)) {
      const pattern = this.patternCache.get(patternId);
      this.updateAccessStats(patternId, 'pattern');
      return pattern;
    }
    
    // Check main storage
    if (this.patterns.has(patternId)) {
      const patternEntry = this.patterns.get(patternId);
      this.updateAccessStats(patternId, 'pattern');
      
      // Add to cache if frequently accessed
      if (patternEntry.accessCount > 3 && this.patternCache.size < this.config.maxCacheSize) {
        this.patternCache.set(patternId, patternEntry.data);
        this.memoryUsage.cache += patternEntry.size;
      }
      
      return patternEntry.data;
    }
    
    return null;
  }

  /**
   * Remove a pattern from memory
   * @param {string} patternId - Pattern identifier
   * @returns {boolean} Success status
   */
  removePattern(patternId) {
    let removed = false;
    
    // Remove from main storage
    if (this.patterns.has(patternId)) {
      const patternEntry = this.patterns.get(patternId);
      this.memoryUsage.patterns -= patternEntry.size;
      this.patterns.delete(patternId);
      removed = true;
    }
    
    // Remove from cache
    if (this.patternCache.has(patternId)) {
      const pattern = this.patternCache.get(patternId);
      const size = this.calculatePatternSize(pattern);
      this.memoryUsage.cache -= size;
      this.patternCache.delete(patternId);
    }
    
    if (removed) {
      console.log(`Pattern ${patternId} removed from memory`);
    }
    
    return removed;
  }

  /**
   * Store a sample in memory
   * @param {string} sampleId - Sample identifier
   * @param {Object} sample - Sample data
   * @returns {boolean} Success status
   */
  storeSample(sampleId, sample) {
    try {
      // Check if we're at capacity
      if (this.samples.size >= this.config.maxSamples) {
        this.cleanupOldSamples();
      }
      
      // Calculate sample size
      const sampleSize = this.calculateSampleSize(sample);
      
      // Store sample
      this.samples.set(sampleId, {
        data: sample,
        size: sampleSize,
        timestamp: Date.now(),
        accessCount: 0,
        lastAccessed: Date.now()
      });
      
      // Update memory usage
      this.memoryUsage.samples += sampleSize;
      
      console.log(`Sample ${sampleId} stored (${this.formatBytes(sampleSize)})`);
      return true;
      
    } catch (error) {
      console.error('Error storing sample:', error);
      return false;
    }
  }

  /**
   * Retrieve a sample from memory
   * @param {string} sampleId - Sample identifier
   * @returns {Object|null} Sample data
   */
  getSample(sampleId) {
    if (this.samples.has(sampleId)) {
      const sampleEntry = this.samples.get(sampleId);
      this.updateAccessStats(sampleId, 'sample');
      return sampleEntry.data;
    }
    
    return null;
  }

  /**
   * Remove a sample from memory
   * @param {string} sampleId - Sample identifier
   * @returns {boolean} Success status
   */
  removeSample(sampleId) {
    if (this.samples.has(sampleId)) {
      const sampleEntry = this.samples.get(sampleId);
      this.memoryUsage.samples -= sampleEntry.size;
      this.samples.delete(sampleId);
      
      console.log(`Sample ${sampleId} removed from memory`);
      return true;
    }
    
    return false;
  }

  /**
   * Store an audio buffer in memory
   * @param {string} bufferId - Buffer identifier
   * @param {AudioBuffer} audioBuffer - Audio buffer
   * @returns {boolean} Success status
   */
  storeAudioBuffer(bufferId, audioBuffer) {
    try {
      // Check if we're at capacity
      if (this.audioBuffers.size >= this.config.maxAudioBuffers) {
        this.cleanupOldAudioBuffers();
      }
      
      // Calculate buffer size
      const bufferSize = this.calculateAudioBufferSize(audioBuffer);
      
      // Store buffer
      this.audioBuffers.set(bufferId, {
        data: audioBuffer,
        size: bufferSize,
        timestamp: Date.now(),
        accessCount: 0,
        lastAccessed: Date.now()
      });
      
      // Update memory usage
      this.memoryUsage.audioBuffers += bufferSize;
      
      console.log(`Audio buffer ${bufferId} stored (${this.formatBytes(bufferSize)})`);
      return true;
      
    } catch (error) {
      console.error('Error storing audio buffer:', error);
      return false;
    }
  }

  /**
   * Retrieve an audio buffer from memory
   * @param {string} bufferId - Buffer identifier
   * @returns {AudioBuffer|null} Audio buffer
   */
  getAudioBuffer(bufferId) {
    if (this.audioBuffers.has(bufferId)) {
      const bufferEntry = this.audioBuffers.get(bufferId);
      this.updateAccessStats(bufferId, 'audioBuffer');
      return bufferEntry.data;
    }
    
    return null;
  }

  /**
   * Remove an audio buffer from memory
   * @param {string} bufferId - Buffer identifier
   * @returns {boolean} Success status
   */
  removeAudioBuffer(bufferId) {
    if (this.audioBuffers.has(bufferId)) {
      const bufferEntry = this.audioBuffers.get(bufferId);
      this.memoryUsage.audioBuffers -= bufferEntry.size;
      this.audioBuffers.delete(bufferId);
      
      console.log(`Audio buffer ${bufferId} removed from memory`);
      return true;
    }
    
    return false;
  }

  /**
   * Get current memory usage statistics
   * @returns {Object} Memory usage stats
   */
  getMemoryUsage() {
    const totalUsage = this.memoryUsage.patterns + 
                      this.memoryUsage.samples + 
                      this.memoryUsage.audioBuffers + 
                      this.memoryUsage.cache;
    
    return {
      patterns: this.memoryUsage.patterns,
      samples: this.memoryUsage.samples,
      audioBuffers: this.memoryUsage.audioBuffers,
      cache: this.memoryUsage.cache,
      total: totalUsage,
      counts: {
        patterns: this.patterns.size,
        samples: this.samples.size,
        audioBuffers: this.audioBuffers.size,
        cachedPatterns: this.patternCache.size
      },
      formatted: {
        patterns: this.formatBytes(this.memoryUsage.patterns),
        samples: this.formatBytes(this.memoryUsage.samples),
        audioBuffers: this.formatBytes(this.memoryUsage.audioBuffers),
        cache: this.formatBytes(this.memoryUsage.cache),
        total: this.formatBytes(totalUsage)
      }
    };
  }

  /**
   * Perform memory cleanup
   * @param {Object} options - Cleanup options
   */
  cleanup(options = {}) {
    const {
      clearPatterns = false,
      clearSamples = false,
      clearAudioBuffers = false,
      clearCache = true,
      force = false
    } = options;
    
    let freedMemory = 0;
    
    // Clear cache
    if (clearCache) {
      freedMemory += this.memoryUsage.cache;
      this.patternCache.clear();
      this.sampleCache.clear();
      this.memoryUsage.cache = 0;
    }
    
    // Clear patterns
    if (clearPatterns || force) {
      freedMemory += this.memoryUsage.patterns;
      this.patterns.clear();
      this.memoryUsage.patterns = 0;
    }
    
    // Clear samples
    if (clearSamples || force) {
      freedMemory += this.memoryUsage.samples;
      this.samples.clear();
      this.memoryUsage.samples = 0;
    }
    
    // Clear audio buffers
    if (clearAudioBuffers || force) {
      freedMemory += this.memoryUsage.audioBuffers;
      this.audioBuffers.clear();
      this.memoryUsage.audioBuffers = 0;
    }
    
    // Notify cleanup callbacks
    this.cleanupCallbacks.forEach(callback => {
      try {
        callback({ freedMemory, options });
      } catch (error) {
        console.error('Error in cleanup callback:', error);
      }
    });
    
    console.log(`Memory cleanup completed. Freed: ${this.formatBytes(freedMemory)}`);
    return freedMemory;
  }

  /**
   * Add cleanup callback
   * @param {Function} callback - Cleanup callback
   */
  onCleanup(callback) {
    if (typeof callback === 'function') {
      this.cleanupCallbacks.push(callback);
    }
  }

  /**
   * Remove cleanup callback
   * @param {Function} callback - Callback to remove
   */
  removeCleanupCallback(callback) {
    const index = this.cleanupCallbacks.indexOf(callback);
    if (index > -1) {
      this.cleanupCallbacks.splice(index, 1);
    }
  }

  // Private methods

  /**
   * Calculate pattern size in bytes
   * @private
   * @param {Object} pattern - Pattern data
   * @returns {number} Size in bytes
   */
  calculatePatternSize(pattern) {
    try {
      const jsonString = JSON.stringify(pattern);
      return new Blob([jsonString]).size;
    } catch (error) {
      console.warn('Error calculating pattern size:', error);
      return 1024; // Default estimate
    }
  }

  /**
   * Calculate sample size in bytes
   * @private
   * @param {Object} sample - Sample data
   * @returns {number} Size in bytes
   */
  calculateSampleSize(sample) {
    try {
      let size = 0;
      
      // Add metadata size
      if (sample.metadata) {
        size += new Blob([JSON.stringify(sample.metadata)]).size;
      }
      
      // Add audio buffer size if present
      if (sample.audioBuffer) {
        size += this.calculateAudioBufferSize(sample.audioBuffer);
      }
      
      // Add other properties
      const otherData = { ...sample };
      delete otherData.audioBuffer;
      delete otherData.metadata;
      size += new Blob([JSON.stringify(otherData)]).size;
      
      return size;
    } catch (error) {
      console.warn('Error calculating sample size:', error);
      return 10240; // Default estimate (10KB)
    }
  }

  /**
   * Calculate audio buffer size in bytes
   * @private
   * @param {AudioBuffer} audioBuffer - Audio buffer
   * @returns {number} Size in bytes
   */
  calculateAudioBufferSize(audioBuffer) {
    if (!audioBuffer) return 0;
    
    try {
      // Calculate size: channels * length * 4 bytes per float32 sample
      return audioBuffer.numberOfChannels * audioBuffer.length * 4;
    } catch (error) {
      console.warn('Error calculating audio buffer size:', error);
      return 0;
    }
  }

  /**
   * Update access statistics
   * @private
   * @param {string} id - Item identifier
   * @param {string} type - Item type
   */
  updateAccessStats(id, type) {
    let storage;
    
    switch (type) {
      case 'pattern':
        storage = this.patterns;
        break;
      case 'sample':
        storage = this.samples;
        break;
      case 'audioBuffer':
        storage = this.audioBuffers;
        break;
      default:
        return;
    }
    
    if (storage.has(id)) {
      const entry = storage.get(id);
      entry.accessCount++;
      entry.lastAccessed = Date.now();
    }
  }

  /**
   * Clean up old patterns based on LRU
   * @private
   */
  cleanupOldPatterns() {
    const patterns = Array.from(this.patterns.entries());
    patterns.sort((a, b) => a[1].lastAccessed - b[1].lastAccessed);
    
    // Remove oldest 20%
    const toRemove = Math.ceil(patterns.length * 0.2);
    for (let i = 0; i < toRemove; i++) {
      this.removePattern(patterns[i][0]);
    }
  }

  /**
   * Clean up old samples based on LRU
   * @private
   */
  cleanupOldSamples() {
    const samples = Array.from(this.samples.entries());
    samples.sort((a, b) => a[1].lastAccessed - b[1].lastAccessed);
    
    // Remove oldest 20%
    const toRemove = Math.ceil(samples.length * 0.2);
    for (let i = 0; i < toRemove; i++) {
      this.removeSample(samples[i][0]);
    }
  }

  /**
   * Clean up old audio buffers based on LRU
   * @private
   */
  cleanupOldAudioBuffers() {
    const buffers = Array.from(this.audioBuffers.entries());
    buffers.sort((a, b) => a[1].lastAccessed - b[1].lastAccessed);
    
    // Remove oldest 20%
    const toRemove = Math.ceil(buffers.length * 0.2);
    for (let i = 0; i < toRemove; i++) {
      this.removeAudioBuffer(buffers[i][0]);
    }
  }

  /**
   * Check memory usage and trigger cleanup if needed
   * @private
   */
  checkMemoryUsage() {
    const usage = this.getMemoryUsage();
    const systemMemory = sequencerPerformanceMonitor.baseMonitor.getCurrentMemoryUsage();
    
    if (!systemMemory.unavailable) {
      const memoryRatio = systemMemory.usedJSHeapSize / systemMemory.jsHeapSizeLimit;
      
      if (memoryRatio > this.config.autoCleanupThreshold) {
        console.warn('High memory usage detected, triggering automatic cleanup');
        this.cleanup({ clearCache: true });
      }
    }
  }

  /**
   * Report memory usage to performance monitor
   * @private
   */
  reportMemoryUsage() {
    const usage = this.getMemoryUsage();
    sequencerPerformanceMonitor.recordMemoryUsage(usage);
  }

  /**
   * Format bytes to human readable string
   * @private
   * @param {number} bytes - Bytes to format
   * @returns {string} Formatted string
   */
  formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

// Create and export singleton instance
const sequencerMemoryManager = new SequencerMemoryManager();

export default sequencerMemoryManager;
export { SequencerMemoryManager };