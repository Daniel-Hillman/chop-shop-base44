/**
 * Memory cleanup strategies for large audio files
 * Implements intelligent memory management and garbage collection
 * Requirements: 7.3, 7.4, 7.5
 */

export class WaveformMemoryManager {
  constructor(options = {}) {
    this.maxMemoryThreshold = options.maxMemoryThreshold || 150 * 1024 * 1024; // 150MB
    this.warningThreshold = options.warningThreshold || 100 * 1024 * 1024; // 100MB
    this.cleanupInterval = options.cleanupInterval || 30 * 1000; // 30 seconds
    this.aggressiveCleanupThreshold = options.aggressiveCleanupThreshold || 200 * 1024 * 1024; // 200MB
    
    // Memory tracking
    this.allocatedBuffers = new Map();
    this.bufferPool = new Map(); // Reusable buffers
    this.memoryUsage = {
      current: 0,
      peak: 0,
      allocated: 0,
      pooled: 0
    };
    
    // Cleanup strategies
    this.cleanupStrategies = new Map();
    this.initializeCleanupStrategies();
    
    // Performance monitoring
    this.performanceMetrics = {
      cleanupCount: 0,
      memoryReclaimed: 0,
      bufferReuses: 0,
      gcTriggers: 0,
      averageCleanupTime: 0
    };
    
    // Auto cleanup
    this.cleanupTimer = setInterval(() => {
      this.performAutomaticCleanup();
    }, this.cleanupInterval);
    
    // Memory pressure monitoring
    this.memoryPressureObserver = null;
    this.initializeMemoryPressureMonitoring();
  }

  /**
   * Initialize cleanup strategies
   */
  initializeCleanupStrategies() {
    this.cleanupStrategies.set('buffer-pool', {
      priority: 1,
      execute: () => this.cleanupBufferPool(),
      description: 'Clean unused buffers from pool'
    });
    
    this.cleanupStrategies.set('old-allocations', {
      priority: 2,
      execute: () => this.cleanupOldAllocations(),
      description: 'Remove old allocated buffers'
    });
    
    this.cleanupStrategies.set('large-buffers', {
      priority: 3,
      execute: () => this.cleanupLargeBuffers(),
      description: 'Clean up large unused buffers'
    });
    
    this.cleanupStrategies.set('force-gc', {
      priority: 4,
      execute: () => this.forceGarbageCollection(),
      description: 'Force garbage collection'
    });
    
    this.cleanupStrategies.set('emergency-cleanup', {
      priority: 5,
      execute: () => this.emergencyCleanup(),
      description: 'Emergency memory cleanup'
    });
  }

  /**
   * Initialize memory pressure monitoring
   */
  initializeMemoryPressureMonitoring() {
    // Use Performance Observer API if available
    if (typeof PerformanceObserver !== 'undefined') {
      try {
        this.memoryPressureObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          for (const entry of entries) {
            if (entry.entryType === 'measure' && entry.name.includes('memory')) {
              this.handleMemoryPressure(entry);
            }
          }
        });
        
        this.memoryPressureObserver.observe({ entryTypes: ['measure'] });
      } catch (error) {
        console.warn('Memory pressure monitoring not available:', error);
      }
    }
    
    // Fallback: monitor memory usage manually
    setInterval(() => {
      this.checkMemoryPressure();
    }, 5000); // Check every 5 seconds
  }

  /**
   * Allocate buffer with tracking
   */
  allocateBuffer(size, type = 'waveform', metadata = {}) {
    const bufferId = this.generateBufferId();
    
    // Try to reuse buffer from pool
    const pooledBuffer = this.getPooledBuffer(size, type);
    if (pooledBuffer) {
      this.allocatedBuffers.set(bufferId, {
        buffer: pooledBuffer,
        size,
        type,
        metadata: {
          ...metadata,
          allocatedAt: Date.now(),
          reused: true
        }
      });
      
      this.performanceMetrics.bufferReuses++;
      return { bufferId, buffer: pooledBuffer };
    }
    
    // Allocate new buffer
    let buffer;
    try {
      switch (type) {
        case 'waveform':
        case 'float32':
          buffer = new Float32Array(size);
          break;
        case 'uint8':
          buffer = new Uint8Array(size);
          break;
        case 'int16':
          buffer = new Int16Array(size);
          break;
        case 'arraybuffer':
          buffer = new ArrayBuffer(size);
          break;
        default:
          buffer = new Float32Array(size);
      }
      
      const actualSize = buffer.byteLength || (buffer.length * buffer.BYTES_PER_ELEMENT);
      
      this.allocatedBuffers.set(bufferId, {
        buffer,
        size: actualSize,
        type,
        metadata: {
          ...metadata,
          allocatedAt: Date.now(),
          reused: false
        }
      });
      
      this.memoryUsage.current += actualSize;
      this.memoryUsage.allocated += actualSize;
      this.memoryUsage.peak = Math.max(this.memoryUsage.peak, this.memoryUsage.current);
      
      // Check if we need cleanup
      if (this.memoryUsage.current > this.warningThreshold) {
        this.scheduleCleanup('memory-warning');
      }
      
      return { bufferId, buffer };
      
    } catch (error) {
      console.error('Buffer allocation failed:', error);
      
      // Try emergency cleanup and retry once
      if (this.memoryUsage.current > this.maxMemoryThreshold * 0.8) {
        this.emergencyCleanup();
        
        try {
          buffer = new Float32Array(size);
          const actualSize = buffer.byteLength || (buffer.length * buffer.BYTES_PER_ELEMENT);
          
          this.allocatedBuffers.set(bufferId, {
            buffer,
            size: actualSize,
            type,
            metadata: {
              ...metadata,
              allocatedAt: Date.now(),
              reused: false,
              emergencyRetry: true
            }
          });
          
          this.memoryUsage.current += actualSize;
          this.memoryUsage.allocated += actualSize;
          
          return { bufferId, buffer };
        } catch (retryError) {
          throw new Error(`Buffer allocation failed after emergency cleanup: ${retryError.message}`);
        }
      }
      
      throw error;
    }
  }

  /**
   * Deallocate buffer and optionally pool for reuse
   */
  deallocateBuffer(bufferId, options = {}) {
    const allocation = this.allocatedBuffers.get(bufferId);
    if (!allocation) {
      console.warn(`Buffer ${bufferId} not found for deallocation`);
      return false;
    }
    
    const { buffer, size, type } = allocation;
    const { poolForReuse = true, reason = 'manual' } = options;
    
    // Remove from allocated buffers
    this.allocatedBuffers.delete(bufferId);
    this.memoryUsage.current -= size;
    
    // Pool buffer for reuse if requested and suitable
    if (poolForReuse && this.shouldPoolBuffer(buffer, size, type)) {
      this.addToBufferPool(buffer, size, type);
    }
    
    return true;
  }

  /**
   * Get pooled buffer if available
   */
  getPooledBuffer(size, type) {
    const poolKey = `${type}_${size}`;
    const pool = this.bufferPool.get(poolKey);
    
    if (pool && pool.length > 0) {
      const buffer = pool.pop();
      
      // Clear buffer data
      if (buffer.fill) {
        buffer.fill(0);
      } else if (buffer instanceof ArrayBuffer) {
        new Uint8Array(buffer).fill(0);
      }
      
      // Update pool size tracking
      this.memoryUsage.pooled -= size;
      
      return buffer;
    }
    
    return null;
  }

  /**
   * Add buffer to pool for reuse
   */
  addToBufferPool(buffer, size, type) {
    const poolKey = `${type}_${size}`;
    
    if (!this.bufferPool.has(poolKey)) {
      this.bufferPool.set(poolKey, []);
    }
    
    const pool = this.bufferPool.get(poolKey);
    
    // Limit pool size to prevent excessive memory usage
    const maxPoolSize = Math.max(2, Math.floor(this.maxMemoryThreshold / size / 10));
    
    if (pool.length < maxPoolSize) {
      pool.push(buffer);
      this.memoryUsage.pooled += size;
    }
  }

  /**
   * Check if buffer should be pooled
   */
  shouldPoolBuffer(buffer, size, type) {
    // Don't pool very large buffers
    if (size > 10 * 1024 * 1024) { // 10MB
      return false;
    }
    
    // Don't pool if we're already using too much memory
    if (this.memoryUsage.current > this.warningThreshold) {
      return false;
    }
    
    // Only pool common buffer types
    const poolableTypes = ['waveform', 'float32', 'uint8', 'int16'];
    return poolableTypes.includes(type);
  }

  /**
   * Perform automatic cleanup based on memory usage
   */
  performAutomaticCleanup() {
    const currentUsage = this.getCurrentMemoryUsage();
    
    if (currentUsage > this.aggressiveCleanupThreshold) {
      this.performCleanup(['emergency-cleanup', 'force-gc', 'large-buffers']);
    } else if (currentUsage > this.maxMemoryThreshold) {
      this.performCleanup(['large-buffers', 'old-allocations', 'buffer-pool']);
    } else if (currentUsage > this.warningThreshold) {
      this.performCleanup(['buffer-pool', 'old-allocations']);
    }
  }

  /**
   * Perform cleanup using specified strategies
   */
  async performCleanup(strategyNames = []) {
    const startTime = performance.now();
    const initialMemory = this.getCurrentMemoryUsage();
    
    // Sort strategies by priority
    const strategies = strategyNames
      .map(name => ({ name, ...this.cleanupStrategies.get(name) }))
      .filter(strategy => strategy.execute)
      .sort((a, b) => a.priority - b.priority);
    
    let totalReclaimed = 0;
    
    for (const strategy of strategies) {
      try {
        const beforeMemory = this.getCurrentMemoryUsage();
        await strategy.execute();
        const afterMemory = this.getCurrentMemoryUsage();
        const reclaimed = beforeMemory - afterMemory;
        
        if (reclaimed > 0) {
          totalReclaimed += reclaimed;
          console.log(`Cleanup strategy '${strategy.name}' reclaimed ${this.formatBytes(reclaimed)}`);
        }
        
        // Stop if we've reclaimed enough memory
        if (afterMemory < this.warningThreshold) {
          break;
        }
      } catch (error) {
        console.error(`Cleanup strategy '${strategy.name}' failed:`, error);
      }
    }
    
    const cleanupTime = performance.now() - startTime;
    this.updateCleanupMetrics(cleanupTime, totalReclaimed);
    
    return {
      strategiesUsed: strategies.map(s => s.name),
      memoryReclaimed: totalReclaimed,
      cleanupTime,
      finalMemoryUsage: this.getCurrentMemoryUsage()
    };
  }

  /**
   * Schedule cleanup for later execution
   */
  scheduleCleanup(reason = 'scheduled', delay = 0) {
    setTimeout(() => {
      this.performAutomaticCleanup();
    }, delay);
  }

  /**
   * Cleanup buffer pool
   */
  cleanupBufferPool() {
    let reclaimed = 0;
    const now = Date.now();
    const maxAge = 5 * 60 * 1000; // 5 minutes
    
    for (const [poolKey, pool] of this.bufferPool) {
      const [type, sizeStr] = poolKey.split('_');
      const size = parseInt(sizeStr);
      
      // Remove old or excess buffers
      const keepCount = Math.max(1, Math.floor(pool.length / 2));
      const removed = pool.splice(keepCount);
      
      reclaimed += removed.length * size;
      this.memoryUsage.pooled -= removed.length * size;
    }
    
    return reclaimed;
  }

  /**
   * Cleanup old allocations
   */
  cleanupOldAllocations() {
    let reclaimed = 0;
    const now = Date.now();
    const maxAge = 10 * 60 * 1000; // 10 minutes
    const toRemove = [];
    
    for (const [bufferId, allocation] of this.allocatedBuffers) {
      const age = now - allocation.metadata.allocatedAt;
      
      // Remove old allocations that haven't been accessed recently
      if (age > maxAge && !allocation.metadata.pinned) {
        toRemove.push(bufferId);
        reclaimed += allocation.size;
      }
    }
    
    for (const bufferId of toRemove) {
      this.deallocateBuffer(bufferId, { poolForReuse: false, reason: 'age-cleanup' });
    }
    
    return reclaimed;
  }

  /**
   * Cleanup large buffers
   */
  cleanupLargeBuffers() {
    let reclaimed = 0;
    const largeBufferThreshold = 5 * 1024 * 1024; // 5MB
    const toRemove = [];
    
    // Sort by size (largest first)
    const sortedAllocations = Array.from(this.allocatedBuffers.entries())
      .sort(([, a], [, b]) => b.size - a.size);
    
    for (const [bufferId, allocation] of sortedAllocations) {
      if (allocation.size > largeBufferThreshold && !allocation.metadata.pinned) {
        toRemove.push(bufferId);
        reclaimed += allocation.size;
        
        // Stop after reclaiming significant memory
        if (reclaimed > this.maxMemoryThreshold * 0.2) {
          break;
        }
      }
    }
    
    for (const bufferId of toRemove) {
      this.deallocateBuffer(bufferId, { poolForReuse: false, reason: 'size-cleanup' });
    }
    
    return reclaimed;
  }

  /**
   * Force garbage collection if available
   */
  forceGarbageCollection() {
    if (typeof gc === 'function') {
      try {
        gc();
        this.performanceMetrics.gcTriggers++;
        return true;
      } catch (error) {
        console.warn('Garbage collection failed:', error);
      }
    }
    
    // Fallback: create memory pressure to trigger GC
    try {
      const tempArrays = [];
      for (let i = 0; i < 100; i++) {
        tempArrays.push(new Float32Array(1024));
      }
      // Let arrays go out of scope
    } catch (error) {
      // Ignore allocation errors
    }
    
    return false;
  }

  /**
   * Emergency cleanup - remove all non-pinned allocations
   */
  emergencyCleanup() {
    let reclaimed = 0;
    const toRemove = [];
    
    // Remove all non-pinned allocations
    for (const [bufferId, allocation] of this.allocatedBuffers) {
      if (!allocation.metadata.pinned) {
        toRemove.push(bufferId);
        reclaimed += allocation.size;
      }
    }
    
    for (const bufferId of toRemove) {
      this.deallocateBuffer(bufferId, { poolForReuse: false, reason: 'emergency' });
    }
    
    // Clear buffer pool
    this.bufferPool.clear();
    this.memoryUsage.pooled = 0;
    
    // Force GC
    this.forceGarbageCollection();
    
    console.warn(`Emergency cleanup reclaimed ${this.formatBytes(reclaimed)}`);
    return reclaimed;
  }

  /**
   * Pin buffer to prevent cleanup
   */
  pinBuffer(bufferId, reason = 'user-request') {
    const allocation = this.allocatedBuffers.get(bufferId);
    if (allocation) {
      allocation.metadata.pinned = true;
      allocation.metadata.pinnedReason = reason;
      allocation.metadata.pinnedAt = Date.now();
      return true;
    }
    return false;
  }

  /**
   * Unpin buffer to allow cleanup
   */
  unpinBuffer(bufferId) {
    const allocation = this.allocatedBuffers.get(bufferId);
    if (allocation) {
      allocation.metadata.pinned = false;
      delete allocation.metadata.pinnedReason;
      delete allocation.metadata.pinnedAt;
      return true;
    }
    return false;
  }

  /**
   * Get current memory usage
   */
  getCurrentMemoryUsage() {
    // Try to get actual memory usage if available
    if (typeof performance !== 'undefined' && performance.memory) {
      return performance.memory.usedJSHeapSize;
    }
    
    // Fallback to tracked usage
    return this.memoryUsage.current + this.memoryUsage.pooled;
  }

  /**
   * Check memory pressure and trigger cleanup if needed
   */
  checkMemoryPressure() {
    const currentUsage = this.getCurrentMemoryUsage();
    const pressureLevel = this.calculateMemoryPressure(currentUsage);
    
    if (pressureLevel > 0.8) {
      this.performAutomaticCleanup();
    }
  }

  /**
   * Calculate memory pressure level (0-1)
   */
  calculateMemoryPressure(currentUsage) {
    return Math.min(1, currentUsage / this.maxMemoryThreshold);
  }

  /**
   * Handle memory pressure events
   */
  handleMemoryPressure(entry) {
    console.warn('Memory pressure detected:', entry);
    this.performAutomaticCleanup();
  }

  /**
   * Update cleanup metrics
   */
  updateCleanupMetrics(cleanupTime, memoryReclaimed) {
    this.performanceMetrics.cleanupCount++;
    this.performanceMetrics.memoryReclaimed += memoryReclaimed;
    
    const avgTime = this.performanceMetrics.averageCleanupTime;
    const count = this.performanceMetrics.cleanupCount;
    this.performanceMetrics.averageCleanupTime = 
      (avgTime * (count - 1) + cleanupTime) / count;
  }

  /**
   * Generate unique buffer ID
   */
  generateBufferId() {
    return `buffer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Format bytes for display
   */
  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Get memory statistics
   */
  getMemoryStats() {
    const currentUsage = this.getCurrentMemoryUsage();
    const pressureLevel = this.calculateMemoryPressure(currentUsage);
    
    return {
      usage: {
        current: currentUsage,
        peak: this.memoryUsage.peak,
        allocated: this.memoryUsage.allocated,
        pooled: this.memoryUsage.pooled,
        formatted: {
          current: this.formatBytes(currentUsage),
          peak: this.formatBytes(this.memoryUsage.peak),
          allocated: this.formatBytes(this.memoryUsage.allocated),
          pooled: this.formatBytes(this.memoryUsage.pooled)
        }
      },
      thresholds: {
        warning: this.warningThreshold,
        max: this.maxMemoryThreshold,
        aggressive: this.aggressiveCleanupThreshold,
        formatted: {
          warning: this.formatBytes(this.warningThreshold),
          max: this.formatBytes(this.maxMemoryThreshold),
          aggressive: this.formatBytes(this.aggressiveCleanupThreshold)
        }
      },
      pressure: {
        level: pressureLevel,
        status: pressureLevel > 0.8 ? 'high' : pressureLevel > 0.6 ? 'medium' : 'low'
      },
      allocations: {
        count: this.allocatedBuffers.size,
        pooledBuffers: Array.from(this.bufferPool.values()).reduce((sum, pool) => sum + pool.length, 0),
        pinnedBuffers: Array.from(this.allocatedBuffers.values()).filter(a => a.metadata.pinned).length
      },
      performance: this.performanceMetrics
    };
  }

  /**
   * Destroy memory manager and cleanup resources
   */
  destroy() {
    // Clear cleanup timer
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    
    // Disconnect memory pressure observer
    if (this.memoryPressureObserver) {
      this.memoryPressureObserver.disconnect();
      this.memoryPressureObserver = null;
    }
    
    // Emergency cleanup
    this.emergencyCleanup();
    
    // Clear all data structures
    this.allocatedBuffers.clear();
    this.bufferPool.clear();
    this.cleanupStrategies.clear();
  }
}

export default WaveformMemoryManager;