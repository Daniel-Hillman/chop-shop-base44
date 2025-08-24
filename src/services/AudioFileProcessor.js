/**
 * AudioFileProcessor - Process uploaded audio files for sampling
 * 
 * Handles direct audio file uploads, processes them with Web Audio API,
 * and generates waveforms for the chopper interface.
 */

import performanceMonitor from './PerformanceMonitor.js';
import memoryManager from './MemoryManager.js';
import optimizedWaveformGenerator from './OptimizedWaveformGenerator.js';

class AudioFileProcessor {
  constructor() {
    this.audioContext = null;
    this.supportedFormats = [
      'audio/mpeg', 'audio/mp3',
      'audio/wav', 'audio/wave',
      'audio/ogg', 'audio/webm',
      'audio/mp4', 'audio/m4a',
      'audio/flac'
    ];

    // Bind methods
    this.processFile = this.processFile.bind(this);
    this.processURL = this.processURL.bind(this);
    this.cleanup = this.cleanup.bind(this);
  }

  /**
   * Process uploaded audio file
   * @param {File} file - Audio file from input
   * @param {Function} onProgress - Progress callback
   * @returns {Promise<Object>} Processed audio data
   */
  async processFile(file, onProgress = null) {
    const endMeasurement = performanceMonitor.startMeasurement('audio_file_processing');
    
    try {
      // Validate file
      this.validateFile(file);
      
      if (onProgress) {
        onProgress({ status: 'reading', progress: 10 });
      }

      // Read file as ArrayBuffer
      const arrayBuffer = await this.readFileAsArrayBuffer(file);
      
      if (onProgress) {
        onProgress({ status: 'decoding', progress: 30 });
      }

      // Initialize audio context
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      
      // Decode audio data
      const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
      
      if (onProgress) {
        onProgress({ status: 'generating_waveform', progress: 70 });
      }

      // Generate waveform
      const waveformResult = await optimizedWaveformGenerator.generateWaveform(audioBuffer, {
        samples: 400,
        normalize: true,
        onProgress: (waveformProgress) => {
          if (onProgress) {
            const totalProgress = 70 + (waveformProgress.progress * 0.25);
            onProgress({ 
              status: 'generating_waveform', 
              progress: Math.round(totalProgress) 
            });
          }
        }
      });

      // Register with memory manager
      const bufferId = `uploaded_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      memoryManager.registerBuffer(bufferId, audioBuffer, {
        priority: memoryManager.config.priorityLevels.HIGH,
        tags: ['uploaded', 'user_file'],
        source: 'file_upload'
      });

      const result = {
        audioBuffer,
        waveformData: waveformResult.data,
        metadata: {
          filename: file.name,
          size: file.size,
          type: file.type,
          duration: audioBuffer.duration,
          sampleRate: audioBuffer.sampleRate,
          channels: audioBuffer.numberOfChannels,
          bufferId
        }
      };

      if (onProgress) {
        onProgress({ status: 'complete', progress: 100 });
      }

      endMeasurement({ 
        success: true, 
        filename: file.name, 
        duration: audioBuffer.duration,
        size: file.size 
      });

      return result;

    } catch (error) {
      endMeasurement({ error: error.message, filename: file?.name });
      console.error('Audio file processing failed:', error);
      throw new Error(`File processing failed: ${error.message}`);
    }
  }

  /**
   * Process audio from URL (for direct audio links)
   * @param {string} url - Direct audio file URL
   * @param {Function} onProgress - Progress callback
   * @returns {Promise<Object>} Processed audio data
   */
  async processURL(url, onProgress = null) {
    const endMeasurement = performanceMonitor.startMeasurement('audio_url_processing');
    
    try {
      if (onProgress) {
        onProgress({ status: 'downloading', progress: 10 });
      }

      // Fetch audio data
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch audio: ${response.status}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      
      if (onProgress) {
        onProgress({ status: 'decoding', progress: 50 });
      }

      // Initialize audio context
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      
      // Decode audio data
      const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
      
      if (onProgress) {
        onProgress({ status: 'generating_waveform', progress: 80 });
      }

      // Generate waveform
      const waveformResult = await optimizedWaveformGenerator.generateWaveform(audioBuffer, {
        samples: 400,
        normalize: true
      });

      // Register with memory manager
      const bufferId = `url_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      memoryManager.registerBuffer(bufferId, audioBuffer, {
        priority: memoryManager.config.priorityLevels.MEDIUM,
        tags: ['url', 'remote'],
        source: 'url_download'
      });

      const result = {
        audioBuffer,
        waveformData: waveformResult.data,
        metadata: {
          url,
          duration: audioBuffer.duration,
          sampleRate: audioBuffer.sampleRate,
          channels: audioBuffer.numberOfChannels,
          bufferId
        }
      };

      if (onProgress) {
        onProgress({ status: 'complete', progress: 100 });
      }

      endMeasurement({ success: true, url, duration: audioBuffer.duration });
      return result;

    } catch (error) {
      endMeasurement({ error: error.message, url });
      console.error('Audio URL processing failed:', error);
      throw new Error(`URL processing failed: ${error.message}`);
    }
  }

  /**
   * Validate uploaded file
   * @private
   */
  validateFile(file) {
    if (!file) {
      throw new Error('No file provided');
    }

    if (!this.supportedFormats.includes(file.type)) {
      throw new Error(`Unsupported file type: ${file.type}. Supported formats: ${this.supportedFormats.join(', ')}`);
    }

    // Check file size (max 100MB)
    const maxSize = 100 * 1024 * 1024;
    if (file.size > maxSize) {
      throw new Error(`File too large: ${Math.round(file.size / 1024 / 1024)}MB. Maximum size: 100MB`);
    }
  }

  /**
   * Read file as ArrayBuffer
   * @private
   */
  readFileAsArrayBuffer(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsArrayBuffer(file);
    });
  }

  /**
   * Get supported file formats
   */
  getSupportedFormats() {
    return [...this.supportedFormats];
  }

  /**
   * Check if file type is supported
   */
  isFormatSupported(mimeType) {
    return this.supportedFormats.includes(mimeType);
  }

  /**
   * Clean up resources
   */
  cleanup() {
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
      this.audioContext = null;
    }
    
    console.log('AudioFileProcessor cleaned up');
  }
}

// Create and export singleton instance
const audioFileProcessor = new AudioFileProcessor();

export default audioFileProcessor;