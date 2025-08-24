/**
 * OptimizedWaveformGenerator - Efficient waveform generation for large audio files
 * 
 * Provides optimized waveform generation using Web Workers, progressive rendering,
 * and memory-efficient algorithms for handling large audio files.
 */

import performanceMonitor from './PerformanceMonitor.js';

class OptimizedWaveformGenerator {
  constructor() {
    this.workers = [];
    this.maxWorkers = Math.min(navigator.hardwareConcurrency || 4, 4);
    this.workerPool = [];
    this.activeJobs = new Map();
    this.cache = new Map();
    
    // Configuration
    this.config = {
      defaultSamples: 400,
      maxSamples: 2000,
      chunkSize: 1024 * 1024, // 1MB chunks
      useWebWorkers: true,
      enableCaching: true,
      progressiveRendering: true,
      memoryThreshold: 100 * 1024 * 1024 // 100MB
    };

    // Bind methods
    this.generateWaveform = this.generateWaveform.bind(this);
    this.generateProgressiveWaveform = this.generateProgressiveWaveform.bind(this);
    this.cleanup = this.cleanup.bind(this);
  }

  /**
   * Generate waveform data from audio buffer
   * @param {AudioBuffer} audioBuffer - The audio buffer to process
   * @param {Object} options - Generation options
   * @returns {Promise<Object>} Waveform data and metadata
   */
  async generateWaveform(audioBuffer, options = {}) {
    const endMeasurement = performanceMonitor.startMeasurement('waveform_generation');
    
    try {
      const config = {
        samples: Math.min(options.samples || this.config.defaultSamples, this.config.maxSamples),
        channel: options.channel || 0,
        normalize: options.normalize !== false,
        progressive: options.progressive || false,
        onProgress: options.onProgress || null
      };

      // Check cache first
      const cacheKey = this.generateCacheKey(audioBuffer, config);
      if (this.config.enableCaching && this.cache.has(cacheKey)) {
        const cached = this.cache.get(cacheKey);
        if (config.onProgress) {
          config.onProgress({ progress: 100, status: 'cached' });
        }
        endMeasurement({ cached: true, samples: config.samples });
        return cached;
      }

      // Determine processing strategy based on audio size
      const audioSize = this.estimateAudioSize(audioBuffer);
      const useWorkers = this.config.useWebWorkers && audioSize > this.config.memoryThreshold;
      
      let result;
      
      if (useWorkers && this.supportsWebWorkers()) {
        result = await this.generateWithWebWorkers(audioBuffer, config);
      } else if (config.progressive && audioSize > this.config.memoryThreshold) {
        result = await this.generateProgressiveWaveform(audioBuffer, config);
      } else {
        result = await this.generateSynchronous(audioBuffer, config);
      }

      // Cache result
      if (this.config.enableCaching) {
        this.cache.set(cacheKey, result);
        this.manageCacheSize();
      }

      endMeasurement({ 
        samples: config.samples, 
        audioSize, 
        useWorkers, 
        progressive: config.progressive 
      });
      
      return result;

    } catch (error) {
      endMeasurement({ error: error.message });
      throw new Error(`Waveform generation failed: ${error.message}`);
    }
  }

  /**
   * Generate waveform progressively for large files
   * @param {AudioBuffer} audioBuffer - The audio buffer to process
   * @param {Object} config - Generation configuration
   * @returns {Promise<Object>} Waveform data
   */
  async generateProgressiveWaveform(audioBuffer, config) {
    const channelData = audioBuffer.getChannelData(config.channel);
    const totalSamples = channelData.length;
    const blockSize = Math.floor(totalSamples / config.samples);
    const chunkSize = Math.min(this.config.chunkSize, Math.floor(totalSamples / 10));
    
    const waveformData = new Float32Array(config.samples);
    let processedSamples = 0;
    
    // Process in chunks to avoid blocking the main thread
    for (let chunkStart = 0; chunkStart < totalSamples; chunkStart += chunkSize) {
      const chunkEnd = Math.min(chunkStart + chunkSize, totalSamples);
      const chunkLength = chunkEnd - chunkStart;
      
      // Process this chunk
      await this.processChunk(channelData, chunkStart, chunkLength, blockSize, waveformData, config.samples);
      
      processedSamples += chunkLength;
      
      // Report progress
      if (config.onProgress) {
        const progress = Math.round((processedSamples / totalSamples) * 100);
        config.onProgress({ 
          progress, 
          status: 'processing',
          processedSamples,
          totalSamples 
        });
      }
      
      // Yield control to prevent blocking
      await this.yieldControl();
    }

    // Normalize if requested
    let normalizedData = Array.from(waveformData);
    if (config.normalize) {
      normalizedData = this.normalizeWaveform(normalizedData);
    }

    return {
      data: normalizedData,
      samples: config.samples,
      duration: audioBuffer.duration,
      sampleRate: audioBuffer.sampleRate,
      channels: audioBuffer.numberOfChannels,
      progressive: true
    };
  }

  /**
   * Generate waveform using Web Workers
   * @param {AudioBuffer} audioBuffer - The audio buffer to process
   * @param {Object} config - Generation configuration
   * @returns {Promise<Object>} Waveform data
   */
  async generateWithWebWorkers(audioBuffer, config) {
    return new Promise((resolve, reject) => {
      const worker = this.getWorker();
      const jobId = `waveform_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Store job reference
      this.activeJobs.set(jobId, { worker, resolve, reject });
      
      // Set up worker message handler
      const handleMessage = (event) => {
        const { type, jobId: responseJobId, data, error } = event.data;
        
        if (responseJobId !== jobId) return;
        
        if (type === 'progress' && config.onProgress) {
          config.onProgress(data);
        } else if (type === 'complete') {
          worker.removeEventListener('message', handleMessage);
          this.releaseWorker(worker);
          this.activeJobs.delete(jobId);
          resolve(data);
        } else if (type === 'error') {
          worker.removeEventListener('message', handleMessage);
          this.releaseWorker(worker);
          this.activeJobs.delete(jobId);
          reject(new Error(error));
        }
      };
      
      worker.addEventListener('message', handleMessage);
      
      // Send job to worker
      const channelData = audioBuffer.getChannelData(config.channel);
      worker.postMessage({
        type: 'generateWaveform',
        jobId,
        audioData: channelData.buffer.slice(),
        config: {
          samples: config.samples,
          normalize: config.normalize,
          sampleRate: audioBuffer.sampleRate,
          duration: audioBuffer.duration,
          channels: audioBuffer.numberOfChannels
        }
      });
      
      // Set timeout for worker job
      setTimeout(() => {
        if (this.activeJobs.has(jobId)) {
          worker.removeEventListener('message', handleMessage);
          this.releaseWorker(worker);
          this.activeJobs.delete(jobId);
          reject(new Error('Waveform generation timeout'));
        }
      }, 30000); // 30 second timeout
    });
  }

  /**
   * Generate waveform synchronously (fallback method)
   * @param {AudioBuffer} audioBuffer - The audio buffer to process
   * @param {Object} config - Generation configuration
   * @returns {Promise<Object>} Waveform data
   */
  async generateSynchronous(audioBuffer, config) {
    const channelData = audioBuffer.getChannelData(config.channel);
    const blockSize = Math.floor(channelData.length / config.samples);
    const waveformData = [];
    
    // Process in blocks
    for (let i = 0; i < config.samples; i++) {
      const blockStart = blockSize * i;
      const blockEnd = Math.min(blockStart + blockSize, channelData.length);
      
      let sum = 0;
      let count = 0;
      
      // Calculate RMS for this block
      for (let j = blockStart; j < blockEnd; j++) {
        const sample = channelData[j];
        sum += sample * sample;
        count++;
      }
      
      const rms = count > 0 ? Math.sqrt(sum / count) : 0;
      waveformData.push(rms);
      
      // Report progress periodically
      if (config.onProgress && i % 50 === 0) {
        const progress = Math.round((i / config.samples) * 100);
        config.onProgress({ progress, status: 'processing' });
      }
      
      // Yield control periodically
      if (i % 100 === 0) {
        await this.yieldControl();
      }
    }
    
    // Normalize if requested
    const finalData = config.normalize ? this.normalizeWaveform(waveformData) : waveformData;
    
    return {
      data: finalData,
      samples: config.samples,
      duration: audioBuffer.duration,
      sampleRate: audioBuffer.sampleRate,
      channels: audioBuffer.numberOfChannels,
      progressive: false
    };
  }

  /**
   * Process a chunk of audio data
   * @private
   */
  async processChunk(channelData, chunkStart, chunkLength, blockSize, waveformData, totalSamples) {
    const samplesPerChunk = Math.floor((chunkLength / channelData.length) * totalSamples);
    const startSample = Math.floor((chunkStart / channelData.length) * totalSamples);
    
    for (let i = 0; i < samplesPerChunk; i++) {
      const sampleIndex = startSample + i;
      if (sampleIndex >= totalSamples) break;
      
      const blockStart = Math.floor((sampleIndex / totalSamples) * channelData.length);
      const blockEnd = Math.min(blockStart + blockSize, channelData.length);
      
      let sum = 0;
      let count = 0;
      
      for (let j = blockStart; j < blockEnd; j++) {
        const sample = channelData[j];
        sum += sample * sample;
        count++;
      }
      
      const rms = count > 0 ? Math.sqrt(sum / count) : 0;
      waveformData[sampleIndex] = rms;
    }
  }

  /**
   * Normalize waveform data
   * @private
   */
  normalizeWaveform(data) {
    const maxValue = Math.max(...data);
    if (maxValue === 0) return data;
    
    const multiplier = 1 / maxValue;
    return data.map(value => value * multiplier);
  }

  /**
   * Get a worker from the pool or create a new one
   * @private
   */
  getWorker() {
    if (this.workerPool.length > 0) {
      return this.workerPool.pop();
    }
    
    if (this.workers.length < this.maxWorkers) {
      const worker = this.createWorker();
      this.workers.push(worker);
      return worker;
    }
    
    // Wait for a worker to become available
    return new Promise((resolve) => {
      const checkForWorker = () => {
        if (this.workerPool.length > 0) {
          resolve(this.workerPool.pop());
        } else {
          setTimeout(checkForWorker, 100);
        }
      };
      checkForWorker();
    });
  }

  /**
   * Release a worker back to the pool
   * @private
   */
  releaseWorker(worker) {
    this.workerPool.push(worker);
  }

  /**
   * Create a new Web Worker
   * @private
   */
  createWorker() {
    const workerCode = `
      self.addEventListener('message', function(event) {
        const { type, jobId, audioData, config } = event.data;
        
        if (type === 'generateWaveform') {
          try {
            const channelData = new Float32Array(audioData);
            const blockSize = Math.floor(channelData.length / config.samples);
            const waveformData = [];
            
            for (let i = 0; i < config.samples; i++) {
              const blockStart = blockSize * i;
              const blockEnd = Math.min(blockStart + blockSize, channelData.length);
              
              let sum = 0;
              let count = 0;
              
              for (let j = blockStart; j < blockEnd; j++) {
                const sample = channelData[j];
                sum += sample * sample;
                count++;
              }
              
              const rms = count > 0 ? Math.sqrt(sum / count) : 0;
              waveformData.push(rms);
              
              // Report progress every 10%
              if (i % Math.floor(config.samples / 10) === 0) {
                self.postMessage({
                  type: 'progress',
                  jobId,
                  data: {
                    progress: Math.round((i / config.samples) * 100),
                    status: 'processing'
                  }
                });
              }
            }
            
            // Normalize if requested
            let finalData = waveformData;
            if (config.normalize) {
              const maxValue = Math.max(...waveformData);
              if (maxValue > 0) {
                const multiplier = 1 / maxValue;
                finalData = waveformData.map(value => value * multiplier);
              }
            }
            
            self.postMessage({
              type: 'complete',
              jobId,
              data: {
                data: finalData,
                samples: config.samples,
                duration: config.duration,
                sampleRate: config.sampleRate,
                channels: config.channels,
                progressive: false
              }
            });
            
          } catch (error) {
            self.postMessage({
              type: 'error',
              jobId,
              error: error.message
            });
          }
        }
      });
    `;
    
    const blob = new Blob([workerCode], { type: 'application/javascript' });
    return new Worker(URL.createObjectURL(blob));
  }

  /**
   * Check if Web Workers are supported
   * @private
   */
  supportsWebWorkers() {
    return typeof Worker !== 'undefined';
  }

  /**
   * Estimate audio buffer size in bytes
   * @private
   */
  estimateAudioSize(audioBuffer) {
    return audioBuffer.numberOfChannels * audioBuffer.length * 4; // 4 bytes per float32
  }

  /**
   * Generate cache key for waveform data
   * @private
   */
  generateCacheKey(audioBuffer, config) {
    const audioHash = `${audioBuffer.duration}_${audioBuffer.sampleRate}_${audioBuffer.numberOfChannels}`;
    const configHash = `${config.samples}_${config.channel}_${config.normalize}`;
    return `${audioHash}_${configHash}`;
  }

  /**
   * Manage cache size to prevent memory issues
   * @private
   */
  manageCacheSize() {
    const maxCacheEntries = 10;
    
    if (this.cache.size > maxCacheEntries) {
      // Remove oldest entries (simple LRU)
      const entries = Array.from(this.cache.entries());
      const toRemove = entries.slice(0, entries.length - maxCacheEntries);
      
      for (const [key] of toRemove) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Yield control to prevent blocking the main thread
   * @private
   */
  async yieldControl() {
    return new Promise(resolve => setTimeout(resolve, 0));
  }

  /**
   * Get generator statistics
   * @returns {Object} Statistics
   */
  getStats() {
    return {
      activeWorkers: this.workers.length,
      availableWorkers: this.workerPool.length,
      activeJobs: this.activeJobs.size,
      cacheSize: this.cache.size,
      maxWorkers: this.maxWorkers,
      supportsWebWorkers: this.supportsWebWorkers()
    };
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.cache.clear();
    console.log('Waveform cache cleared');
  }

  /**
   * Clean up resources
   */
  cleanup() {
    // Terminate all workers
    for (const worker of this.workers) {
      worker.terminate();
    }
    
    // Clear arrays and maps
    this.workers = [];
    this.workerPool = [];
    this.activeJobs.clear();
    this.cache.clear();
    
    console.log('OptimizedWaveformGenerator cleaned up');
  }
}

// Create and export singleton instance
const optimizedWaveformGenerator = new OptimizedWaveformGenerator();

// Clean up on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    optimizedWaveformGenerator.cleanup();
  });
}

export default optimizedWaveformGenerator;