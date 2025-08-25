/**
 * Main performance optimization service that integrates Web Workers, caching, and memory management
 * Provides unified interface for all performance optimization features
 * Requirements: 7.2, 7.3, 7.4, 7.5
 */

import WaveformCache from './WaveformCache.js';
import WaveformMemoryManager from './WaveformMemoryManager.js';
import WaveformPerformanceMonitor from './WaveformPerformanceMonitor.js';

export class WaveformPerformanceOptimizer {
  constructor(options = {}) {
    this.options = {
      enableWebWorkers: options.enableWebWorkers !== false,
      enableCaching: options.enableCaching !== false,
      enableMemoryManagement: options.enableMemoryManagement !== false,
      enablePerformanceMonitoring: options.enablePerformanceMonitoring !== false,
      workerPoolSize: options.workerPoolSize || 2,
      ...options
    };
    
    // Initialize components
    this.cache = null;
    this.memoryManager = null;
    this.performanceMonitor = null;
    this.workerPool = [];
    this.workerQueue = [];
    
    // State tracking
    this.isInitialized = false;
    this.activeWorkerTasks = new Map();
    this.taskIdCounter = 0;
    
    // Performance metrics
    this.metrics = {
      workerTasks: {
        completed: 0,
        failed: 0,
        averageTime: 0,
        queueLength: 0
      },
      cachePerformance: {
        hits: 0,
        misses: 0,
        hitRate: 0
      },
      memoryOptimization: {
        cleanupCount: 0,
        memoryReclaimed: 0,
        currentUsage: 0
      },
      overallPerformance: {
        score: 1.0,
        qualityLevel: 'high',
        degradationLevel: 0
      }
    };
    
    this.initialize();
  }

  /**
   * Initialize all performance optimization components
   */
  async initialize() {
    if (this.isInitialized) return;
    
    try {
      // Initialize caching system
      if (this.options.enableCaching) {
        this.cache = new WaveformCache({
          maxMemorySize: this.options.cacheMaxMemory || 100 * 1024 * 1024,
          maxCacheEntries: this.options.cacheMaxEntries || 50,
          persistenceEnabled: this.options.cachePersistence !== false,
          compressionEnabled: this.options.cacheCompression !== false
        });
        
        await this.cache.initializePersistence();
      }
      
      // Initialize memory management
      if (this.options.enableMemoryManagement) {
        this.memoryManager = new WaveformMemoryManager({
          maxMemoryThreshold: this.options.memoryMaxThreshold || 150 * 1024 * 1024,
          warningThreshold: this.options.memoryWarningThreshold || 100 * 1024 * 1024,
          cleanupInterval: this.options.memoryCleanupInterval || 30 * 1000
        });
      }
      
      // Initialize performance monitoring
      if (this.options.enablePerformanceMonitoring) {
        this.performanceMonitor = new WaveformPerformanceMonitor({
          targetFPS: this.options.targetFPS || 60,
          minFPS: this.options.minFPS || 30,
          degradationThreshold: this.options.degradationThreshold || 0.7,
          recoveryThreshold: this.options.recoveryThreshold || 0.9
        });
        
        // Set up performance monitoring callbacks
        this.setupPerformanceCallbacks();
        this.performanceMonitor.startMonitoring();
      }
      
      // Initialize Web Worker pool
      if (this.options.enableWebWorkers) {
        await this.initializeWorkerPool();
      }
      
      this.isInitialized = true;
      console.log('WaveformPerformanceOptimizer initialized successfully');
      
    } catch (error) {
      console.error('Failed to initialize WaveformPerformanceOptimizer:', error);
      throw error;
    }
  }

  /**
   * Initialize Web Worker pool
   */
  async initializeWorkerPool() {
    try {
      // Handle test environment where import.meta.url might not be available
      let workerScript;
      try {
        workerScript = new URL('../workers/WaveformWorker.js', import.meta.url);
      } catch (error) {
        // Fallback for test environment
        workerScript = '../workers/WaveformWorker.js';
      }
      
      for (let i = 0; i < this.options.workerPoolSize; i++) {
        try {
          const worker = new Worker(workerScript, { type: 'module' });
          
          worker.onmessage = (event) => {
            this.handleWorkerMessage(worker, event);
          };
          
          worker.onerror = (error) => {
            this.handleWorkerError(worker, error);
          };
          
          this.workerPool.push({
            worker,
            id: i,
            busy: false,
            currentTask: null
          });
          
        } catch (error) {
          console.warn(`Failed to create worker ${i}:`, error);
        }
      }
      
      console.log(`Initialized ${this.workerPool.length} Web Workers`);
    } catch (error) {
      console.warn('Failed to initialize worker pool:', error);
      // Continue without workers
    }
  }

  /**
   * Setup performance monitoring callbacks
   */
  setupPerformanceCallbacks() {
    if (!this.performanceMonitor) return;
    
    // Handle quality changes
    this.performanceMonitor.onQualityChange((event) => {
      this.handleQualityChange(event);
    });
    
    // Handle performance warnings
    this.performanceMonitor.onPerformanceWarning((warning) => {
      this.handlePerformanceWarning(warning);
    });
  }

  /**
   * Generate waveform with full optimization pipeline
   */
  async generateOptimizedWaveform(audioSource, options = {}) {
    const startTime = performance.now();
    
    try {
      // Record frame render start for performance monitoring
      if (this.performanceMonitor) {
        this.performanceMonitor.frameRenderStart();
      }
      
      // Check cache first
      let waveformData = null;
      if (this.cache) {
        const cacheKey = this.cache.generateCacheKey(audioSource, options);
        waveformData = await this.cache.get(cacheKey);
        
        if (waveformData) {
          this.updateCacheMetrics(true);
          console.log('Waveform loaded from cache');
          return waveformData;
        } else {
          this.updateCacheMetrics(false);
        }
      }
      
      // Get current adaptive settings for quality optimization
      const adaptiveSettings = this.getAdaptiveSettings();
      const optimizedOptions = {
        ...options,
        ...adaptiveSettings,
        quality: adaptiveSettings.renderQuality || options.quality || 'medium'
      };
      
      // Generate waveform using appropriate method
      if (this.options.enableWebWorkers && this.workerPool.length > 0) {
        waveformData = await this.generateWaveformWithWorker(audioSource, optimizedOptions);
      } else {
        waveformData = await this.generateWaveformDirect(audioSource, optimizedOptions);
      }
      
      // Cache the result
      if (this.cache && waveformData) {
        const cacheKey = this.cache.generateCacheKey(audioSource, options);
        await this.cache.set(cacheKey, waveformData, {
          generationTime: performance.now() - startTime,
          quality: optimizedOptions.quality,
          method: this.options.enableWebWorkers ? 'worker' : 'direct'
        });
      }
      
      // Record frame render end for performance monitoring
      if (this.performanceMonitor) {
        this.performanceMonitor.frameRenderEnd();
      }
      
      return waveformData;
      
    } catch (error) {
      console.error('Optimized waveform generation failed:', error);
      
      // Try fallback generation with reduced quality
      if (options.quality !== 'low') {
        console.log('Attempting fallback generation with low quality');
        return this.generateOptimizedWaveform(audioSource, {
          ...options,
          quality: 'low',
          fallback: true
        });
      }
      
      throw error;
    }
  }

  /**
   * Generate waveform using Web Worker
   */
  async generateWaveformWithWorker(audioSource, options) {
    return new Promise((resolve, reject) => {
      const taskId = this.generateTaskId();
      const task = {
        id: taskId,
        type: 'ANALYZE_WAVEFORM',
        data: {
          audioBuffer: audioSource.buffer || audioSource,
          options
        },
        resolve,
        reject,
        startTime: performance.now()
      };
      
      // Try to assign to available worker
      const availableWorker = this.getAvailableWorker();
      if (availableWorker) {
        this.assignTaskToWorker(task, availableWorker);
      } else {
        // Queue task if no workers available
        this.workerQueue.push(task);
        this.updateWorkerMetrics();
      }
    });
  }

  /**
   * Generate waveform directly (fallback)
   */
  async generateWaveformDirect(audioSource, options) {
    // Simplified direct generation for fallback
    const audioBuffer = audioSource.buffer || audioSource;
    if (!audioBuffer || !audioBuffer.length) {
      throw new Error('Invalid audio buffer');
    }
    
    const targetSampleRate = options.targetSampleRate || 1000;
    const quality = options.quality || 'medium';
    
    // Allocate buffer using memory manager
    let bufferId = null;
    let outputBuffer = null;
    
    if (this.memoryManager) {
      const allocation = this.memoryManager.allocateBuffer(
        Math.floor(audioBuffer.length * targetSampleRate / 44100),
        'waveform',
        { source: 'direct-generation', quality }
      );
      bufferId = allocation.bufferId;
      outputBuffer = allocation.buffer;
    } else {
      outputBuffer = new Float32Array(Math.floor(audioBuffer.length * targetSampleRate / 44100));
    }
    
    try {
      // Simple downsampling based on quality
      const step = audioBuffer.length / outputBuffer.length;
      
      for (let i = 0; i < outputBuffer.length; i++) {
        const sourceIndex = Math.floor(i * step);
        
        if (quality === 'high') {
          // RMS calculation for better quality
          let sum = 0;
          const windowSize = Math.max(1, Math.floor(step));
          for (let j = 0; j < windowSize && sourceIndex + j < audioBuffer.length; j++) {
            const sample = audioBuffer[sourceIndex + j] || 0;
            sum += sample * sample;
          }
          outputBuffer[i] = Math.sqrt(sum / windowSize);
        } else {
          // Simple sampling for performance
          outputBuffer[i] = Math.abs(audioBuffer[sourceIndex] || 0);
        }
      }
      
      return {
        samples: outputBuffer,
        sampleRate: targetSampleRate,
        duration: outputBuffer.length / targetSampleRate,
        channels: 1,
        metadata: {
          analysisMethod: 'direct-optimized',
          quality: quality,
          generatedAt: Date.now(),
          bufferId: bufferId
        }
      };
      
    } catch (error) {
      // Clean up allocated buffer on error
      if (bufferId && this.memoryManager) {
        this.memoryManager.deallocateBuffer(bufferId, { poolForReuse: false });
      }
      throw error;
    }
  }

  /**
   * Get available worker from pool
   */
  getAvailableWorker() {
    return this.workerPool.find(workerInfo => !workerInfo.busy);
  }

  /**
   * Assign task to worker
   */
  assignTaskToWorker(task, workerInfo) {
    workerInfo.busy = true;
    workerInfo.currentTask = task;
    this.activeWorkerTasks.set(task.id, { task, workerInfo });
    
    workerInfo.worker.postMessage({
      type: task.type,
      taskId: task.id,
      data: task.data
    });
  }

  /**
   * Handle worker message
   */
  handleWorkerMessage(worker, event) {
    const { type, taskId, data, error } = event.data;
    const taskInfo = this.activeWorkerTasks.get(taskId);
    
    if (!taskInfo) {
      console.warn(`Received message for unknown task: ${taskId}`);
      return;
    }
    
    const { task, workerInfo } = taskInfo;
    
    switch (type) {
      case 'RESULT':
        this.handleWorkerResult(task, data);
        this.completeWorkerTask(taskId, workerInfo);
        break;
        
      case 'ERROR':
        this.handleWorkerError(task, error);
        this.completeWorkerTask(taskId, workerInfo);
        break;
        
      case 'PROGRESS':
        this.handleWorkerProgress(task, data);
        break;
        
      case 'PERFORMANCE_METRICS':
        this.handleWorkerPerformanceMetrics(data);
        break;
    }
  }

  /**
   * Handle worker result
   */
  handleWorkerResult(task, data) {
    const processingTime = performance.now() - task.startTime;
    this.updateWorkerTaskMetrics(processingTime, true);
    
    task.resolve(data);
  }

  /**
   * Handle worker error
   */
  handleWorkerError(task, error) {
    const processingTime = performance.now() - task.startTime;
    this.updateWorkerTaskMetrics(processingTime, false);
    
    task.reject(new Error(error || 'Worker task failed'));
  }

  /**
   * Handle worker progress
   */
  handleWorkerProgress(task, progressData) {
    // Could emit progress events here if needed
    console.log(`Task ${task.id} progress:`, progressData.progress);
  }

  /**
   * Handle worker performance metrics
   */
  handleWorkerPerformanceMetrics(metrics) {
    // Update overall performance metrics
    this.metrics.workerTasks = {
      ...this.metrics.workerTasks,
      ...metrics
    };
  }

  /**
   * Complete worker task and process queue
   */
  completeWorkerTask(taskId, workerInfo) {
    // Mark worker as available
    workerInfo.busy = false;
    workerInfo.currentTask = null;
    
    // Remove from active tasks
    this.activeWorkerTasks.delete(taskId);
    
    // Process next task in queue
    if (this.workerQueue.length > 0) {
      const nextTask = this.workerQueue.shift();
      this.assignTaskToWorker(nextTask, workerInfo);
    }
    
    this.updateWorkerMetrics();
  }

  /**
   * Handle quality change from performance monitor
   */
  handleQualityChange(event) {
    console.log(`Quality changed to ${event.newQuality} (${event.changeType})`);
    
    this.metrics.overallPerformance.qualityLevel = event.newQuality;
    this.metrics.overallPerformance.degradationLevel = event.details.level || 0;
    
    // Could trigger cache cleanup or other optimizations here
    if (event.newQuality === 'low' && this.cache) {
      // Clear some cache to free memory
      this.cache.optimizeMemoryUsage();
    }
  }

  /**
   * Handle performance warning
   */
  handlePerformanceWarning(warning) {
    console.warn('Performance warning:', warning);
    
    if (warning.type === 'critical') {
      // Trigger emergency optimizations
      this.triggerEmergencyOptimizations();
    }
  }

  /**
   * Trigger emergency optimizations
   */
  triggerEmergencyOptimizations() {
    console.log('Triggering emergency optimizations');
    
    // Force memory cleanup
    if (this.memoryManager) {
      this.memoryManager.emergencyCleanup();
    }
    
    // Clear cache
    if (this.cache) {
      this.cache.clear();
    }
    
    // Reduce worker pool size temporarily
    if (this.workerPool.length > 1) {
      const excessWorkers = this.workerPool.splice(1);
      excessWorkers.forEach(workerInfo => {
        workerInfo.worker.terminate();
      });
    }
  }

  /**
   * Get current adaptive settings
   */
  getAdaptiveSettings() {
    if (this.performanceMonitor) {
      return this.performanceMonitor.getAdaptiveSettings();
    }
    
    return {
      renderQuality: 'medium',
      waveformResolution: 1.0,
      enableAntialiasing: true,
      maxBatchSize: 1000
    };
  }

  /**
   * Update cache metrics
   */
  updateCacheMetrics(hit) {
    if (hit) {
      this.metrics.cachePerformance.hits++;
    } else {
      this.metrics.cachePerformance.misses++;
    }
    
    const total = this.metrics.cachePerformance.hits + this.metrics.cachePerformance.misses;
    this.metrics.cachePerformance.hitRate = this.metrics.cachePerformance.hits / total;
  }

  /**
   * Update worker task metrics
   */
  updateWorkerTaskMetrics(processingTime, success) {
    if (success) {
      this.metrics.workerTasks.completed++;
      
      const avgTime = this.metrics.workerTasks.averageTime;
      const count = this.metrics.workerTasks.completed;
      this.metrics.workerTasks.averageTime = (avgTime * (count - 1) + processingTime) / count;
    } else {
      this.metrics.workerTasks.failed++;
    }
  }

  /**
   * Update worker metrics
   */
  updateWorkerMetrics() {
    this.metrics.workerTasks.queueLength = this.workerQueue.length;
  }

  /**
   * Generate unique task ID
   */
  generateTaskId() {
    return `task_${++this.taskIdCounter}_${Date.now()}`;
  }

  /**
   * Get comprehensive performance metrics
   */
  getPerformanceMetrics() {
    const baseMetrics = { ...this.metrics };
    
    // Add component-specific metrics
    if (this.cache) {
      baseMetrics.cache = this.cache.getStats();
    }
    
    if (this.memoryManager) {
      baseMetrics.memory = this.memoryManager.getMemoryStats();
    }
    
    if (this.performanceMonitor) {
      baseMetrics.performance = this.performanceMonitor.getMetrics();
      baseMetrics.overallPerformance.score = baseMetrics.performance.performanceScore;
    }
    
    return baseMetrics;
  }

  /**
   * Force quality level
   */
  setQualityLevel(level) {
    if (this.performanceMonitor) {
      this.performanceMonitor.forceQualityLevel(level);
    }
  }

  /**
   * Clear all caches and reset state
   */
  async clearCaches() {
    if (this.cache) {
      await this.cache.clear();
    }
    
    if (this.memoryManager) {
      this.memoryManager.emergencyCleanup();
    }
  }

  /**
   * Optimize for low-end devices
   */
  optimizeForLowEndDevice() {
    console.log('Optimizing for low-end device');
    
    // Force low quality
    this.setQualityLevel('low');
    
    // Reduce worker pool size
    if (this.workerPool.length > 1) {
      const excessWorkers = this.workerPool.splice(1);
      excessWorkers.forEach(workerInfo => {
        workerInfo.worker.terminate();
      });
    }
    
    // Reduce cache size
    if (this.cache) {
      this.cache.maxMemorySize = 50 * 1024 * 1024; // 50MB
      this.cache.maxCacheEntries = 25;
    }
    
    // More aggressive memory management
    if (this.memoryManager) {
      this.memoryManager.maxMemoryThreshold = 100 * 1024 * 1024; // 100MB
      this.memoryManager.warningThreshold = 75 * 1024 * 1024; // 75MB
    }
  }

  /**
   * Destroy optimizer and cleanup resources
   */
  destroy() {
    console.log('Destroying WaveformPerformanceOptimizer');
    
    // Stop performance monitoring
    if (this.performanceMonitor) {
      this.performanceMonitor.destroy();
      this.performanceMonitor = null;
    }
    
    // Destroy memory manager
    if (this.memoryManager) {
      this.memoryManager.destroy();
      this.memoryManager = null;
    }
    
    // Destroy cache
    if (this.cache) {
      this.cache.destroy();
      this.cache = null;
    }
    
    // Terminate all workers
    this.workerPool.forEach(workerInfo => {
      workerInfo.worker.terminate();
    });
    this.workerPool = [];
    
    // Clear active tasks
    this.activeWorkerTasks.clear();
    this.workerQueue = [];
    
    this.isInitialized = false;
  }
}

export default WaveformPerformanceOptimizer;