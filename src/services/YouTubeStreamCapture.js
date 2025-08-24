/**
 * YouTubeStreamCapture - Capture audio from YouTube video player in real-time
 * 
 * Uses Web Audio API to capture audio from the playing YouTube video
 * and process it for the chopper interface without downloading.
 */

import performanceMonitor from './PerformanceMonitor.js';
import memoryManager from './MemoryManager.js';
import optimizedWaveformGenerator from './OptimizedWaveformGenerator.js';

class YouTubeStreamCapture {
  constructor() {
    this.audioContext = null;
    this.mediaElementSource = null;
    this.analyser = null;
    this.scriptProcessor = null;
    this.isCapturing = false;
    this.capturedSamples = [];
    this.videoElement = null;
    this.captureStartTime = 0;
    this.targetDuration = 0;
    
    // Configuration
    this.config = {
      sampleRate: 44100,
      bufferSize: 4096,
      fftSize: 2048,
      maxCaptureTime: 600, // 10 minutes max
      waveformSamples: 400
    };

    // Bind methods
    this.startCapture = this.startCapture.bind(this);
    this.stopCapture = this.stopCapture.bind(this);
    this.cleanup = this.cleanup.bind(this);
  }

  /**
   * Start capturing audio from YouTube video element
   * @param {HTMLVideoElement} videoElement - The YouTube video element
   * @param {Function} onProgress - Progress callback
   * @param {number} maxDuration - Maximum capture duration in seconds
   * @returns {Promise<Object>} Captured audio data
   */
  async startCapture(videoElement, onProgress = null, maxDuration = null) {
    const endMeasurement = performanceMonitor.startMeasurement('youtube_stream_capture');
    
    try {
      if (!videoElement) {
        throw new Error('Video element not provided');
      }

      this.videoElement = videoElement;
      this.targetDuration = maxDuration || videoElement.duration || this.config.maxCaptureTime;
      
      // Initialize Web Audio API
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)({
        sampleRate: this.config.sampleRate
      });

      // Resume audio context if suspended
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      // Create media element source from video
      this.mediaElementSource = this.audioContext.createMediaElementSource(videoElement);
      
      // Create analyser for real-time analysis
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = this.config.fftSize;
      this.analyser.smoothingTimeConstant = 0.8;

      // Create script processor for audio capture
      this.scriptProcessor = this.audioContext.createScriptProcessor(
        this.config.bufferSize, 1, 1
      );

      // Connect audio graph
      this.mediaElementSource.connect(this.analyser);
      this.analyser.connect(this.scriptProcessor);
      this.scriptProcessor.connect(this.audioContext.destination);

      // Set up audio processing
      this.setupAudioProcessing(onProgress);

      // Start capturing
      this.isCapturing = true;
      this.captureStartTime = this.audioContext.currentTime;
      this.capturedSamples = [];

      console.log('Started YouTube audio capture');

      // Return a promise that resolves when capture is complete
      return new Promise((resolve, reject) => {
        this.captureResolve = resolve;
        this.captureReject = reject;

        // Set up automatic stop after target duration
        setTimeout(() => {
          if (this.isCapturing) {
            this.stopCapture().then(resolve).catch(reject);
          }
        }, this.targetDuration * 1000);
      });

    } catch (error) {
      endMeasurement({ error: error.message });
      console.error('Failed to start YouTube capture:', error);
      throw new Error(`Capture initialization failed: ${error.message}`);
    }
  }

  /**
   * Set up audio processing for capture
   * @private
   */
  setupAudioProcessing(onProgress) {
    let sampleCount = 0;
    const progressInterval = Math.floor(this.config.sampleRate / 10); // Update 10 times per second

    this.scriptProcessor.onaudioprocess = (event) => {
      if (!this.isCapturing) return;

      const inputBuffer = event.inputBuffer;
      const inputData = inputBuffer.getChannelData(0);
      
      // Store audio samples
      const samples = new Float32Array(inputData.length);
      samples.set(inputData);
      this.capturedSamples.push(samples);

      // Update progress
      sampleCount += inputData.length;
      if (sampleCount % progressInterval === 0 && onProgress) {
        const capturedTime = sampleCount / this.config.sampleRate;
        const progress = Math.min((capturedTime / this.targetDuration) * 100, 99);
        
        onProgress({
          status: 'capturing',
          progress: Math.round(progress),
          capturedTime,
          targetDuration: this.targetDuration
        });
      }

      // Auto-stop if we've captured enough
      const capturedDuration = sampleCount / this.config.sampleRate;
      if (capturedDuration >= this.targetDuration) {
        this.stopCapture();
      }
    };
  }

  /**
   * Stop capturing and process the captured audio
   * @returns {Promise<Object>} Processed audio data
   */
  async stopCapture() {
    if (!this.isCapturing) return null;

    const endMeasurement = performanceMonitor.startMeasurement('youtube_capture_processing');
    
    try {
      this.isCapturing = false;
      console.log('Stopping YouTube audio capture');

      // Disconnect audio nodes
      if (this.scriptProcessor) {
        this.scriptProcessor.disconnect();
        this.scriptProcessor.onaudioprocess = null;
      }

      if (this.analyser) {
        this.analyser.disconnect();
      }

      if (this.mediaElementSource) {
        this.mediaElementSource.disconnect();
      }

      // Process captured samples into AudioBuffer
      const audioBuffer = await this.createAudioBufferFromSamples();
      
      if (!audioBuffer) {
        throw new Error('No audio data captured');
      }

      // Generate waveform
      const waveformResult = await optimizedWaveformGenerator.generateWaveform(audioBuffer, {
        samples: this.config.waveformSamples,
        normalize: true
      });

      // Register with memory manager
      const bufferId = `youtube_capture_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      memoryManager.registerBuffer(bufferId, audioBuffer, {
        priority: memoryManager.config.priorityLevels.HIGH,
        tags: ['youtube', 'captured', 'streaming'],
        source: 'youtube_stream'
      });

      const result = {
        audioBuffer,
        waveformData: waveformResult.data,
        metadata: {
          duration: audioBuffer.duration,
          sampleRate: audioBuffer.sampleRate,
          channels: audioBuffer.numberOfChannels,
          capturedSamples: this.capturedSamples.length,
          bufferId,
          source: 'youtube_stream'
        }
      };

      endMeasurement({ 
        success: true, 
        duration: audioBuffer.duration,
        samples: this.capturedSamples.length 
      });

      // Resolve the capture promise
      if (this.captureResolve) {
        this.captureResolve(result);
      }

      return result;

    } catch (error) {
      endMeasurement({ error: error.message });
      console.error('Failed to process captured audio:', error);
      
      if (this.captureReject) {
        this.captureReject(error);
      }
      
      throw error;
    }
  }

  /**
   * Create AudioBuffer from captured samples
   * @private
   */
  async createAudioBufferFromSamples() {
    if (this.capturedSamples.length === 0) {
      return null;
    }

    // Calculate total length
    const totalLength = this.capturedSamples.reduce((sum, samples) => sum + samples.length, 0);
    
    if (totalLength === 0) {
      return null;
    }

    // Create AudioBuffer
    const audioBuffer = this.audioContext.createBuffer(
      1, // mono for now
      totalLength,
      this.config.sampleRate
    );

    // Copy samples to AudioBuffer
    const channelData = audioBuffer.getChannelData(0);
    let offset = 0;

    for (const samples of this.capturedSamples) {
      channelData.set(samples, offset);
      offset += samples.length;
    }

    return audioBuffer;
  }

  /**
   * Get capture status
   */
  getStatus() {
    return {
      isCapturing: this.isCapturing,
      capturedSamples: this.capturedSamples.length,
      capturedDuration: this.capturedSamples.length > 0 ? 
        (this.capturedSamples.length * this.config.bufferSize) / this.config.sampleRate : 0,
      targetDuration: this.targetDuration,
      audioContextState: this.audioContext?.state || 'not-initialized'
    };
  }

  /**
   * Check if capture is supported
   */
  static isSupported() {
    return !!(window.AudioContext || window.webkitAudioContext);
  }

  /**
   * Clean up resources
   */
  cleanup() {
    this.stopCapture();
    
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
      this.audioContext = null;
    }
    
    this.capturedSamples = [];
    this.videoElement = null;
    
    console.log('YouTubeStreamCapture cleaned up');
  }
}

// Create and export singleton instance
const youTubeStreamCapture = new YouTubeStreamCapture();

export default youTubeStreamCapture;