/**
 * MemoryManager - Efficient audio buffer management and automatic cleanup
 * 
 * Provides intelligent memory management for audio buffers, automatic garbage collection,
 * and memory optimization strategies for the YouTube Audio Sampler system.
 */

import performanceMonitor from './PerformanceMonitor.js';

class MemoryManager {
  constructor() {
    this.audioBuffers = new Map();
    this.bufferMetadata = new Map();
    this.cleanupCallbacks = new Set();
    this.isMonitoring = false;
    
    // Configuration
    this.config = {
      maxMemoryUsage: 400 * 1024 * 1024, // 400MB max for audio buffers
      cleanupThreshold: 0.8, // Cleanup when 80% of max memory is used
      maxBufferAge: 30 * 60 * 1000, // 30 minutes max age
      maxBufferCount: 20, // Maximum number of audio buffers
      gcInterval: 60000, // 1 minute GC interval
      memoryCheckInterval: 10000, // 10 seconds memory check
      priorityLevels: {
        HIGH: 3,
        MEDIUM: 2,
        LOW: 1
      }
    };

    // Bind methods
    this.registerBuffer = this.registerBuffer.bind(this);
    this.unregisterBuffer = this.unregisterBuffer.bind(this);
    this.getBuffer = this.getBuffer.bind(this);
    this.cleanup = this.cleanup.bind(this);
    this.startMonitoring = this.startMonitoring.bind(this);
    this.stopMonitoring = this.stopMonitoring.bind(this);
  }

  /**
   * Start memory monitoring
   */
  startMonitoring() {
    if (this.isMonitoring) return;

    this.isMonitoring = true;
    
    // Start periodic cleanup
    this.gcInterval = setInterval(() => {
      this.performGarbageCollection();
    }, this.config.gcInterval);
    
    // Start memory monitoring
    this.memoryCheckInterval = setInterval(() => {
      this.checkMemoryUsage();
    }, this.config.memoryCheckInterval);
    
    console.log('MemoryManager monitoring started');
  }

  /**
   * Stop memory monitoring
   */
  stopMonitoring() {
    if (!this.isMonitoring) return;

    this.isMonitoring = false;
    
    if (this.gcInterval) {
      clearInterval(this.gcInterval);
      this.gcInterval = null;
    }
    
    if (this.memoryCheckInterval) {
      clearInterval(this.memoryCheckInterval);
      this.memoryCheckInterval = null;
    }
    
    console.log('MemoryManager monitoring stopped');
  }

  /**
   * Register an audio buffer for management
   * @param {string} id - Unique identifier for the buffer
   * @param {AudioBuffer} audioBuffer - The audio buffer to manage
   * @param {Object} options - Buffer options
   * @returns {boolean} Success status
   */
  registerBuffer(id, audioBuffer, options = {}) {
    try {
      if (!audioBuffer || !id) {
        throw new Error('Invalid buffer or ID provided');
      }

      // Calculate buffer size
      const size = this.calculateBufferSize(audioBuffer);
      
      // Check if we need to free memory first
      if (this.shouldTriggerCleanup(size)) {
        this.performEmergencyCleanup(size);
      }

      // Create metadata
      const metadata = {
        id,
        size,
        createdAt: Date.now(),
        lastAccessed: Date.now(),
        accessCount: 0,
        priority: options.priority || this.config.priorityLevels.MEDIUM,
        persistent: options.persistent || false,
        tags: options.tags || [],
        source: options.source || 'unknown'
      };

      // Store buffer and metadata
      this.audioBuffers.set(id, audioBuffer);
      this.bufferMetadata.set(id, metadata);

      console.log(`Registered audio buffer: ${id} (${this.formatBytes(size)})`);
      
      return true;

    } catch (error) {
      console.error('Failed to register audio buffer:', error);
      return false;
    }
  }

  /**
   * Unregister an audio buffer
   * @param {string} id - Buffer identifier
   * @returns {boolean} Success status
   */
  unregisterBuffer(id) {
    try {
      const metadata = this.bufferMetadata.get(id);
      
      if (metadata) {
        // Call cleanup callbacks
        for (const callback of this.cleanupCallbacks) {
          try {
            callback(id, metadata);
          } catch (error) {
            console.warn('Cleanup callback failed:', error);
          }
        }
        
        console.log(`Unregistered audio buffer: ${id} (${this.formatBytes(metadata.size)})`);
      }

      // Remove from storage
      this.audioBuffers.delete(id);
      this.bufferMetadata.delete(id);
      
      return true;

    } catch (error) {
      console.error('Failed to unregister audio buffer:', error);
      return false;
    }
  }

  /**
   * Get an audio buffer by ID
   * @param {string} id - Buffer identifier
   * @returns {AudioBuffer|null} The audio buffer or null if not found
   */
  getBuffer(id) {
    const buffer = this.audioBuffers.get(id);
    
    if (buffer) {
      // Update access metadata
      const metadata = this.bufferMetadata.get(id);
      if (metadata) {
        metadata.lastAccessed = Date.now();
        metadata.accessCount++;
      }
    }
    
    return buffer || null;
  }

  /**
   * Check if a buffer exists
   * @param {string} id - Buffer identifier
   * @returns {boolean} True if buffer exists
   */
  hasBuffer(id) {
    return this.audioBuffers.has(id);
  }

  /**
   * Get buffer metadata
   * @param {string} id - Buffer identifier
   * @returns {Object|null} Buffer metadata or null
   */
  getBufferMetadata(id) {
    return this.bufferMetadata.get(id) || null;
  }

  /**
   * Update buffer priority
   * @param {string} id - Buffer identifier
   * @param {number} priority - New priority level
   */
  updateBufferPriority(id, priority) {
    const metadata = this.bufferMetadata.get(id);
    if (metadata) {
      metadata.priority = priority;
    }
  }

  /**
   * Add cleanup callback
   * @param {Function} callback - Callback function to call when buffers are cleaned up
   */
  addCleanupCallback(callback) {
    this.cleanupCallbacks.add(callback);
  }

  /**
   * Remove cleanup callback
   * @param {Function} callback - Callback function to remove
   */
  removeCleanupCallback(callback) {
    this.cleanupCallbacks.delete(callback);
  }

  /**
   * Get memory usage statistics
   * @returns {Object} Memory usage information
   */
  getMemoryStats() {
    let totalSize = 0;
    let oldestBuffer = null;
    let newestBuffer = null;
    const buffersByPriority = { HIGH: 0, MEDIUM: 0, LOW: 0 };
    
    for (const [id, metadata] of this.bufferMetadata) {
      totalSize += metadata.size;
      
      if (!oldestBuffer || metadata.createdAt < oldestBuffer.createdAt) {
        oldestBuffer = metadata;
      }
      
      if (!newestBuffer || metadata.createdAt > newestBuffer.createdAt) {
        newestBuffer = metadata;
      }
      
      // Count by priority
      const priorityName = Object.keys(this.config.priorityLevels)
        .find(key => this.config.priorityLevels[key] === metadata.priority) || 'UNKNOWN';
      buffersByPriority[priorityName] = (buffersByPriority[priorityName] || 0) + 1;
    }

    const systemMemory = performanceMonitor.getCurrentMemoryUsage();
    
    return {
      audioBuffers: {
        count: this.audioBuffers.size,
        totalSize,
        totalSizeMB: Math.round(totalSize / (1024 * 1024) * 100) / 100,
        maxSize: this.config.maxMemoryUsage,
        maxSizeMB: Math.round(this.config.maxMemoryUsage / (1024 * 1024)),
        usagePercent: Math.round((totalSize / this.config.maxMemoryUsage) * 100),
        oldestBuffer: oldestBuffer ? {
          id: oldestBuffer.id,
          age: Date.now() - oldestBuffer.createdAt,
          size: this.formatBytes(oldestBuffer.size)
        } : null,
        newestBuffer: newestBuffer ? {
          id: newestBuffer.id,
          age: Date.now() - newestBuffer.createdAt,
          size: this.formatBytes(newestBuffer.size)
        } : null,
        byPriority: buffersByPriority
      },
      system: {
        jsHeapUsed: systemMemory.usedJSHeapSize,
        jsHeapTotal: systemMemory.totalJSHeapSize,
        jsHeapLimit: systemMemory.jsHeapSizeLimit,
        jsHeapUsedMB: Math.round(systemMemory.usedJSHeapSize / (1024 * 1024) * 100) / 100
      },
      recommendations: this.getMemoryRecommendations()
    };
  }

  /**
   * Get list of all registered buffers
   * @returns {Array} Array of buffer information
   */
  listBuffers() {
    const buffers = [];
    
    for (const [id, metadata] of this.bufferMetadata) {
      buffers.push({
        id,
        size: this.formatBytes(metadata.size),
        age: Date.now() - metadata.createdAt,
        lastAccessed: Date.now() - metadata.lastAccessed,
        accessCount: metadata.accessCount,
        priority: metadata.priority,
        persistent: metadata.persistent,
        tags: metadata.tags,
        source: metadata.source
      });
    }
    
    return buffers.sort((a, b) => b.lastAccessed - a.lastAccessed);
  }

  /**
   * Perform garbage collection
   */
  performGarbageCollection() {
    const endMeasurement = performanceMonitor.startMeasurement('memory_gc');
    
    try {
      let cleanedCount = 0;
      let freedBytes = 0;
      const now = Date.now();
      
      // Get buffers sorted by cleanup priority
      const buffersToCheck = Array.from(this.bufferMetadata.entries())
        .map(([id, metadata]) => ({ id, ...metadata }))
        .sort(this.getCleanupPriority.bind(this));

      for (const buffer of buffersToCheck) {
        let shouldCleanup = false;
        
        // Check age
        const age = now - buffer.createdAt;
        if (!buffer.persistent && age > this.config.maxBufferAge) {
          shouldCleanup = true;
        }
        
        // Check if we're over buffer count limit
        if (this.audioBuffers.size > this.config.maxBufferCount) {
          shouldCleanup = true;
        }
        
        if (shouldCleanup) {
          freedBytes += buffer.size;
          this.unregisterBuffer(buffer.id);
          cleanedCount++;
        }
      }

      if (cleanedCount > 0) {
        console.log(`GC cleaned up ${cleanedCount} buffers, freed ${this.formatBytes(freedBytes)}`);
      }

      endMeasurement({ cleanedCount, freedBytes });

    } catch (error) {
      console.error('Garbage collection failed:', error);
      endMeasurement({ error: error.message });
    }
  }

  /**
   * Perform emergency cleanup to free memory
   * @param {number} requiredBytes - Bytes needed to be freed
   */
  performEmergencyCleanup(requiredBytes = 0) {
    console.log('Performing emergency memory cleanup...');
    
    const endMeasurement = performanceMonitor.startMeasurement('emergency_cleanup');
    
    try {
      let freedBytes = 0;
      let cleanedCount = 0;
      
      // Get buffers sorted by cleanup priority (lowest priority first)
      const buffersToCleanup = Array.from(this.bufferMetadata.entries())
        .map(([id, metadata]) => ({ id, ...metadata }))
        .sort(this.getCleanupPriority.bind(this))
        .reverse(); // Reverse to get lowest priority first

      for (const buffer of buffersToCleanup) {
        if (buffer.persistent) continue; // Skip persistent buffers
        
        freedBytes += buffer.size;
        this.unregisterBuffer(buffer.id);
        cleanedCount++;
        
        // Stop if we've freed enough memory
        if (requiredBytes > 0 && freedBytes >= requiredBytes) {
          break;
        }
        
        // Stop if we're under the cleanup threshold
        const currentUsage = this.getCurrentMemoryUsage();
        if (currentUsage < this.config.maxMemoryUsage * this.config.cleanupThreshold) {
          break;
        }
      }

      console.log(`Emergency cleanup freed ${this.formatBytes(freedBytes)} from ${cleanedCount} buffers`);
      
      endMeasurement({ cleanedCount, freedBytes, requiredBytes });

    } catch (error) {
      console.error('Emergency cleanup failed:', error);
      endMeasurement({ error: error.message });
    }
  }

  /**
   * Check current memory usage and trigger cleanup if needed
   */
  checkMemoryUsage() {
    const currentUsage = this.getCurrentMemoryUsage();
    const threshold = this.config.maxMemoryUsage * this.config.cleanupThreshold;
    
    if (currentUsage > threshold) {
      console.log(`Memory usage (${this.formatBytes(currentUsage)}) exceeds threshold, triggering cleanup...`);
      this.performGarbageCollection();
    }
  }

  // Private methods

  /**
   * Calculate audio buffer size in bytes
   * @private
   */
  calculateBufferSize(audioBuffer) {
    return audioBuffer.numberOfChannels * audioBuffer.length * 4; // 4 bytes per float32
  }

  /**
   * Get current memory usage from registered buffers
   * @private
   */
  getCurrentMemoryUsage() {
    let totalSize = 0;
    for (const metadata of this.bufferMetadata.values()) {
      totalSize += metadata.size;
    }
    return totalSize;
  }

  /**
   * Check if cleanup should be triggered
   * @private
   */
  shouldTriggerCleanup(additionalBytes = 0) {
    const currentUsage = this.getCurrentMemoryUsage();
    const projectedUsage = currentUsage + additionalBytes;
    const threshold = this.config.maxMemoryUsage * this.config.cleanupThreshold;
    
    return projectedUsage > threshold || this.audioBuffers.size >= this.config.maxBufferCount;
  }

  /**
   * Get cleanup priority for a buffer (higher number = keep longer)
   * @private
   */
  getCleanupPriority(a, b) {
    // Priority level (higher priority = keep longer)
    if (a.priority !== b.priority) {
      return b.priority - a.priority;
    }
    
    // Persistent buffers have higher priority
    if (a.persistent !== b.persistent) {
      return b.persistent - a.persistent;
    }
    
    // More recently accessed = higher priority
    if (a.lastAccessed !== b.lastAccessed) {
      return b.lastAccessed - a.lastAccessed;
    }
    
    // More frequently accessed = higher priority
    if (a.accessCount !== b.accessCount) {
      return b.accessCount - a.accessCount;
    }
    
    // Newer buffers = higher priority
    return b.createdAt - a.createdAt;
  }

  /**
   * Get memory optimization recommendations
   * @private
   */
  getMemoryRecommendations() {
    const recommendations = [];
    
    // Calculate usage without calling getMemoryStats to avoid circular dependency
    let totalSize = 0;
    let oldestBuffer = null;
    
    for (const [id, metadata] of this.bufferMetadata) {
      totalSize += metadata.size;
      
      if (!oldestBuffer || metadata.createdAt < oldestBuffer.createdAt) {
        oldestBuffer = metadata;
      }
    }
    
    const usagePercent = Math.round((totalSize / this.config.maxMemoryUsage) * 100);
    
    if (usagePercent > 90) {
      recommendations.push('Critical: Audio buffer memory usage above 90%. Consider clearing unused buffers.');
    } else if (usagePercent > 80) {
      recommendations.push('Warning: Audio buffer memory usage above 80%. Monitor closely.');
    }
    
    if (this.audioBuffers.size > this.config.maxBufferCount * 0.8) {
      recommendations.push('High buffer count detected. Consider implementing more aggressive cleanup.');
    }
    
    // Check for old buffers
    if (oldestBuffer) {
      const age = Date.now() - oldestBuffer.createdAt;
      if (age > this.config.maxBufferAge) {
        recommendations.push('Old audio buffers detected. Consider manual cleanup.');
      }
    }
    
    return recommendations;
  }

  /**
   * Format bytes to human readable string
   * @private
   */
  formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Clean up all resources
   */
  cleanup() {
    this.stopMonitoring();
    
    // Call cleanup callbacks for all buffers
    for (const [id, metadata] of this.bufferMetadata) {
      for (const callback of this.cleanupCallbacks) {
        try {
          callback(id, metadata);
        } catch (error) {
          console.warn('Cleanup callback failed:', error);
        }
      }
    }
    
    // Clear all data
    this.audioBuffers.clear();
    this.bufferMetadata.clear();
    this.cleanupCallbacks.clear();
    
    console.log('MemoryManager cleaned up');
  }
}

// Create and export singleton instance
const memoryManager = new MemoryManager();

// Auto-start monitoring
memoryManager.startMonitoring();

// Clean up on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    memoryManager.cleanup();
  });
}

export default memoryManager;