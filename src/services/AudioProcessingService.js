import errorRecoveryService from './ErrorRecoveryService.js';
import performanceMonitor from './PerformanceMonitor.js';
import memoryManager from './MemoryManager.js';
import optimizedWaveformGenerator from './OptimizedWaveformGenerator.js';
import audioFileProcessor from './AudioFileProcessor.js';

/**
 * AudioProcessingService - Centralized audio management for YouTube Audio Sampler
 * 
 * Handles audio download, processing, caching, and AudioContext lifecycle management
 * with retry logic and progress tracking. Integrates with ErrorRecoveryService for
 * intelligent error handling and automatic recovery. Now includes performance monitoring
 * and optimized memory management.
 */

class AudioProcessingService {
  constructor() {
    this.audioContext = null;
    this.downloadCache = new Map();
    this.progressCallbacks = new Map();
    this.abortControllers = new Map();
    
    // Configuration
    this.config = {
      maxRetries: 3,
      baseRetryDelay: 1000, // 1 second
      maxRetryDelay: 10000, // 10 seconds
      downloadTimeout: 60000, // 60 seconds
      functionUrl: 'https://us-central1-chop-stop.cloudfunctions.net/getAudioStream'
    };

    // Bind methods to preserve context
    this.downloadAndProcessAudio = this.downloadAndProcessAudio.bind(this);
    this.getAudioBuffer = this.getAudioBuffer.bind(this);
    this.clearCache = this.clearCache.bind(this);
    this.cleanup = this.cleanup.bind(this);
  }

  /**
   * Initialize or get existing AudioContext
   * @returns {AudioContext} The audio context instance
   */
  getAudioContext() {
    if (!this.audioContext || this.audioContext.state === 'closed') {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    
    // Resume context if suspended (required for user interaction)
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume().catch(error => {
        console.warn('Failed to resume AudioContext:', error);
      });
    }
    
    return this.audioContext;
  }

  /**
   * Process audio from various sources (YouTube, file upload, direct URL)
   * @param {string|File} source - YouTube URL, File object, or direct audio URL
   * @param {Function} onProgress - Progress callback function
   * @returns {Promise<{audioBuffer: AudioBuffer, waveformData: number[]}>}
   */
  async downloadAndProcessAudio(source, onProgress = null) {
    // Determine source type and route to appropriate processor
    if (source instanceof File) {
      return await this.processAudioFile(source, onProgress);
    } else if (typeof source === 'string') {
      if (this.isDirectAudioURL(source)) {
        return await this.processDirectAudioURL(source, onProgress);
      } else if (this.isYouTubeURL(source)) {
        return await this.processYouTubeURL(source, onProgress);
      } else {
        throw new Error('Unsupported URL format');
      }
    } else {
      throw new Error('Invalid source type');
    }
  }

  /**
   * Process uploaded audio file
   * @param {File} file - Audio file
   * @param {Function} onProgress - Progress callback
   * @returns {Promise<Object>} Processed audio data
   */
  async processAudioFile(file, onProgress = null) {
    const endMeasurement = performanceMonitor.startMeasurement('audio_file_upload');
    
    try {
      const result = await audioFileProcessor.processFile(file, onProgress);
      
      endMeasurement({ success: true, filename: file.name });
      return result;
      
    } catch (error) {
      endMeasurement({ error: error.message });
      throw error;
    }
  }

  /**
   * Process direct audio URL
   * @param {string} url - Direct audio file URL
   * @param {Function} onProgress - Progress callback
   * @returns {Promise<Object>} Processed audio data
   */
  async processDirectAudioURL(url, onProgress = null) {
    const endMeasurement = performanceMonitor.startMeasurement('direct_audio_url');
    
    try {
      const result = await audioFileProcessor.processURL(url, onProgress);
      
      endMeasurement({ success: true, url });
      return result;
      
    } catch (error) {
      endMeasurement({ error: error.message });
      throw error;
    }
  }

  /**
   * Process YouTube URL (fallback to original method)
   * @param {string} youtubeUrl - YouTube video URL
   * @param {Function} onProgress - Progress callback
   * @returns {Promise<Object>} Processed audio data
   */
  async processYouTubeURL(youtubeUrl, onProgress = null) {
    const endMeasurement = performanceMonitor.startMeasurement('audio_download');
    
    if (!youtubeUrl) {
      throw new Error('YouTube URL is required');
    }

    // Check cache first
    const cacheKey = this.getCacheKey(youtubeUrl);
    if (this.downloadCache.has(cacheKey)) {
      const cached = this.downloadCache.get(cacheKey);
      if (onProgress) onProgress({ status: 'ready', progress: 100 });
      endMeasurement({ cached: true, cacheKey });
      return cached;
    }

    // Store progress callback
    if (onProgress) {
      this.progressCallbacks.set(cacheKey, onProgress);
    }

    // Use ErrorRecoveryService for intelligent retry logic
    const operationId = `audio_download_${cacheKey}`;
    
    try {
      const result = await errorRecoveryService.executeWithRetry(
        () => this.performDownload(youtubeUrl, cacheKey, onProgress),
        operationId,
        {
          maxRetries: this.config.maxRetries,
          onProgress: (progressData) => {
            if (onProgress) {
              // Map ErrorRecoveryService progress to our format
              onProgress({
                status: progressData.status === 'starting' ? 'downloading' : 
                       progressData.status === 'retrying' ? 'retrying' :
                       progressData.status === 'waiting_retry' ? 'retrying' : 'downloading',
                progress: 0,
                attempt: progressData.attempt,
                maxAttempts: progressData.maxAttempts,
                retryDelay: progressData.delay,
                error: progressData.error,
                operationId: progressData.operationId
              });
            }
          },
          onRetry: (retryData) => {
            console.warn(`Audio download retry ${retryData.attempt}/${retryData.maxAttempts}:`, retryData.error.message);
          },
          context: { youtubeUrl, cacheKey }
        }
      );

      // Cache successful result
      this.downloadCache.set(cacheKey, result);
      
      // Register with memory manager
      memoryManager.registerBuffer(cacheKey, result.audioBuffer, {
        priority: memoryManager.config.priorityLevels.HIGH,
        source: 'audio_download',
        tags: ['youtube', 'audio']
      });
      
      if (onProgress) {
        onProgress({ status: 'ready', progress: 100 });
      }
      
      endMeasurement({ 
        success: true, 
        cacheKey, 
        audioSize: this.estimateAudioSize(result.audioBuffer),
        waveformSamples: result.waveformData?.length || 0
      });
      
      return result;

    } catch (error) {
      // Enhanced error with recovery information
      const enhancedError = new Error(error.message);
      enhancedError.originalError = error.originalError || error;
      enhancedError.classification = error.classification;
      enhancedError.attempts = error.attempts;
      enhancedError.operationId = operationId;
      enhancedError.youtubeUrl = youtubeUrl;

      if (onProgress) {
        onProgress({
          status: 'error',
          progress: 0,
          error: enhancedError.message,
          classification: enhancedError.classification
        });
      }
      
      endMeasurement({ 
        error: enhancedError.message, 
        classification: enhancedError.classification,
        attempts: enhancedError.attempts 
      });
      
      throw enhancedError;
    }
  }

  /**
   * Perform the actual download and processing
   * @private
   */
  async performDownload(youtubeUrl, cacheKey, onProgress) {
    // Create abort controller for this download
    const abortController = new AbortController();
    this.abortControllers.set(cacheKey, abortController);

    try {
      // Set up timeout
      const timeoutId = setTimeout(() => {
        abortController.abort();
      }, this.config.downloadTimeout);

      const functionUrl = `${this.config.functionUrl}?url=${encodeURIComponent(youtubeUrl)}`;
      
      const response = await fetch(functionUrl, {
        method: 'GET',
        signal: abortController.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        let errorMessage = `Server responded with ${response.status}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
        } catch {
          errorMessage = await response.text() || errorMessage;
        }
        throw new Error(errorMessage);
      }

      // Track download progress if supported
      const contentLength = response.headers.get('content-length');
      const reader = response.body.getReader();
      const chunks = [];
      let receivedLength = 0;

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;
        
        chunks.push(value);
        receivedLength += value.length;
        
        if (contentLength && onProgress) {
          const progress = Math.round((receivedLength / parseInt(contentLength)) * 70); // 70% for download
          onProgress({
            status: 'downloading',
            progress: Math.min(progress, 70),
            bytesReceived: receivedLength,
            totalBytes: parseInt(contentLength)
          });
        }
      }

      // Combine chunks into ArrayBuffer
      const arrayBuffer = new ArrayBuffer(receivedLength);
      const uint8Array = new Uint8Array(arrayBuffer);
      let position = 0;
      
      for (const chunk of chunks) {
        uint8Array.set(chunk, position);
        position += chunk.length;
      }

      if (onProgress) {
        onProgress({ status: 'processing', progress: 75 });
      }

      // Decode audio data
      const audioContext = this.getAudioContext();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

      if (onProgress) {
        onProgress({ status: 'generating_waveform', progress: 90 });
      }

      // Generate waveform data
      const waveformData = this.generateWaveformData(audioBuffer);

      return { audioBuffer, waveformData };

    } finally {
      // Clean up abort controller
      this.abortControllers.delete(cacheKey);
    }
  }

  /**
   * Generate waveform data from audio buffer using optimized generator
   * @private
   */
  async generateWaveformData(audioBuffer, samples = 400) {
    const endMeasurement = performanceMonitor.startMeasurement('waveform_generation');
    
    try {
      const result = await optimizedWaveformGenerator.generateWaveform(audioBuffer, {
        samples,
        normalize: true,
        progressive: this.estimateAudioSize(audioBuffer) > 50 * 1024 * 1024 // Use progressive for files > 50MB
      });
      
      endMeasurement({ 
        samples, 
        audioSize: this.estimateAudioSize(audioBuffer),
        progressive: result.progressive 
      });
      
      return result.data;
      
    } catch (error) {
      endMeasurement({ error: error.message });
      
      // Fallback to simple generation
      console.warn('Optimized waveform generation failed, using fallback:', error);
      return this.generateSimpleWaveform(audioBuffer, samples);
    }
  }

  /**
   * Simple waveform generation fallback
   * @private
   */
  generateSimpleWaveform(audioBuffer, samples = 400) {
    const channelData = audioBuffer.getChannelData(0);
    const blockSize = Math.floor(channelData.length / samples);
    const filteredData = [];
    
    for (let i = 0; i < samples; i++) {
      const blockStart = blockSize * i;
      let sum = 0;
      
      for (let j = 0; j < blockSize; j++) {
        sum += Math.abs(channelData[blockStart + j]);
      }
      
      filteredData.push(sum / blockSize);
    }
    
    // Normalize the data
    const maxValue = Math.max(...filteredData);
    const multiplier = maxValue > 0 ? Math.pow(maxValue, -1) : 1;
    
    return filteredData.map(n => n * multiplier);
  }

  /**
   * Get cached audio buffer if available
   * @param {string} youtubeUrl - The YouTube video URL
   * @returns {Object|null} Cached audio data or null
   */
  getAudioBuffer(youtubeUrl) {
    const cacheKey = this.getCacheKey(youtubeUrl);
    return this.downloadCache.get(cacheKey) || null;
  }

  /**
   * Check if audio is cached for given URL
   * @param {string} youtubeUrl - The YouTube video URL
   * @returns {boolean} True if cached
   */
  isCached(youtubeUrl) {
    const cacheKey = this.getCacheKey(youtubeUrl);
    return this.downloadCache.has(cacheKey);
  }

  /**
   * Get download progress for a URL
   * @param {string} youtubeUrl - The YouTube video URL
   * @returns {Object|null} Progress information or null
   */
  getDownloadProgress(youtubeUrl) {
    const cacheKey = this.getCacheKey(youtubeUrl);
    const callback = this.progressCallbacks.get(cacheKey);
    return callback ? { hasProgress: true } : null;
  }

  /**
   * Cancel ongoing download for a URL
   * @param {string} youtubeUrl - The YouTube video URL
   */
  cancelDownload(youtubeUrl) {
    const cacheKey = this.getCacheKey(youtubeUrl);
    const abortController = this.abortControllers.get(cacheKey);
    
    if (abortController) {
      abortController.abort();
      this.abortControllers.delete(cacheKey);
    }
    
    this.progressCallbacks.delete(cacheKey);
  }

  /**
   * Clear all cached audio data
   */
  clearCache() {
    // Cancel any ongoing downloads
    for (const [cacheKey, abortController] of this.abortControllers) {
      abortController.abort();
    }
    
    // Unregister buffers from memory manager
    for (const cacheKey of this.downloadCache.keys()) {
      memoryManager.unregisterBuffer(cacheKey);
    }
    
    this.downloadCache.clear();
    this.progressCallbacks.clear();
    this.abortControllers.clear();
    
    console.log('AudioProcessingService cache cleared');
  }

  /**
   * Clean up resources and close AudioContext
   */
  cleanup() {
    this.clearCache();
    
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close().catch(error => {
        console.warn('Error closing AudioContext:', error);
      });
      this.audioContext = null;
    }
    
    console.log('AudioProcessingService cleaned up');
  }

  /**
   * Calculate retry delay with exponential backoff
   * @private
   */
  calculateRetryDelay(attempt) {
    const delay = Math.min(
      this.config.baseRetryDelay * Math.pow(2, attempt),
      this.config.maxRetryDelay
    );
    
    // Add jitter to prevent thundering herd
    const jitter = Math.random() * 0.1 * delay;
    return Math.floor(delay + jitter);
  }

  /**
   * Check if URL is a direct audio file
   * @private
   */
  isDirectAudioURL(url) {
    const audioExtensions = ['.mp3', '.wav', '.ogg', '.m4a', '.flac', '.webm'];
    const urlLower = url.toLowerCase();
    return audioExtensions.some(ext => urlLower.includes(ext)) || 
           url.includes('audio/') || 
           url.includes('soundcloud.com') ||
           url.includes('bandcamp.com');
  }



  /**
   * Check if URL is a YouTube URL
   * @private
   */
  isYouTubeURL(url) {
    return url.includes('youtube.com') || url.includes('youtu.be');
  }

  /**
   * Generate cache key from URL or file
   * @private
   */
  getCacheKey(source) {
    if (typeof source === 'string') {
      // Extract video ID for YouTube URLs
      const videoIdMatch = source.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/);
      return videoIdMatch ? videoIdMatch[1] : source;
    } else if (source instanceof File) {
      return `file_${source.name}_${source.size}_${source.lastModified}`;
    }
    return source.toString();
  }

  /**
   * Sleep utility for retry delays
   * @private
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get service statistics
   * @returns {Object} Service statistics
   */
  getStats() {
    return {
      cachedItems: this.downloadCache.size,
      activeDownloads: this.abortControllers.size,
      audioContextState: this.audioContext?.state || 'not_initialized',
      memoryUsage: this.estimateMemoryUsage()
    };
  }

  /**
   * Estimate memory usage of cached audio data
   * @private
   */
  estimateMemoryUsage() {
    let totalBytes = 0;
    
    for (const [, data] of this.downloadCache) {
      if (data.audioBuffer) {
        totalBytes += this.estimateAudioSize(data.audioBuffer);
      }
    }
    
    return {
      bytes: totalBytes,
      mb: Math.round(totalBytes / (1024 * 1024) * 100) / 100
    };
  }

  /**
   * Estimate audio buffer size in bytes
   * @private
   */
  estimateAudioSize(audioBuffer) {
    return audioBuffer.numberOfChannels * audioBuffer.length * 4; // 4 bytes per float32
  }
}

// Create and export singleton instance
const audioProcessingService = new AudioProcessingService();

// Clean up on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    audioProcessingService.cleanup();
  });
}

export default audioProcessingService;