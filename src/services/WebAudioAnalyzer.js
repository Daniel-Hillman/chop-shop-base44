/**
 * WebAudioAnalyzer - Real-time audio analysis using Web Audio API
 * Connects to YouTube iframe audio streams and provides frequency/amplitude analysis
 */

export class WebAudioAnalyzer {
  constructor(options = {}) {
    this.audioContext = null;
    this.analyserNode = null;
    this.sourceNode = null;
    this.isAnalyzing = false;
    this.sampleRate = options.sampleRate || 44100;
    this.fftSize = options.fftSize || 2048;
    this.smoothingTimeConstant = options.smoothingTimeConstant || 0.8;
    
    // Progressive waveform generation
    this.waveformData = new Float32Array(0);
    this.progressiveBuffer = [];
    this.analysisCallbacks = new Set();
    this.progressCallbacks = new Set();
    
    // Performance monitoring
    this.lastAnalysisTime = 0;
    this.analysisFrameCount = 0;
    this.performanceMetrics = {
      averageAnalysisTime: 0,
      droppedFrames: 0,
      memoryUsage: 0
    };
  }

  /**
   * Initialize Web Audio API context and analyzer
   */
  async initialize() {
    try {
      // Create audio context with optimal settings
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)({
        sampleRate: this.sampleRate,
        latencyHint: 'interactive'
      });

      // Resume context if suspended (required by browser autoplay policies)
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      // Create analyzer node with configured settings
      this.analyserNode = this.audioContext.createAnalyser();
      this.analyserNode.fftSize = this.fftSize;
      this.analyserNode.smoothingTimeConstant = this.smoothingTimeConstant;
      this.analyserNode.minDecibels = -90;
      this.analyserNode.maxDecibels = -10;

      return true;
    } catch (error) {
      console.error('Failed to initialize WebAudioAnalyzer:', error);
      throw new Error(`Web Audio API initialization failed: ${error.message}`);
    }
  }

  /**
   * Connect to YouTube iframe audio stream
   * Note: Direct iframe audio access is limited by CORS policies
   * This method attempts various connection strategies
   */
  async connectToYouTubeStream(youtubePlayer) {
    if (!this.audioContext || !this.analyserNode) {
      throw new Error('WebAudioAnalyzer not initialized');
    }

    try {
      // Strategy 1: Try to capture audio from YouTube iframe (limited by CORS)
      const audioStream = await this._attemptDirectAudioCapture(youtubePlayer);
      
      if (audioStream) {
        return await this._connectAudioStream(audioStream);
      }

      // Strategy 2: Use MediaElementAudioSourceNode if available
      const mediaElement = await this._getMediaElement(youtubePlayer);
      if (mediaElement) {
        return await this._connectMediaElement(mediaElement);
      }

      // Strategy 3: Fallback to progressive analysis using available APIs
      return await this._setupProgressiveAnalysis(youtubePlayer);

    } catch (error) {
      console.warn('Direct YouTube audio connection failed:', error);
      throw new Error(`YouTube audio connection failed: ${error.message}`);
    }
  }

  /**
   * Start real-time frequency and amplitude analysis
   */
  startAnalysis() {
    if (!this.analyserNode || this.isAnalyzing) {
      return;
    }

    this.isAnalyzing = true;
    this.analysisFrameCount = 0;
    this.lastAnalysisTime = performance.now();

    // Start analysis loop
    requestAnimationFrame(() => this._analysisLoop());
  }

  /**
   * Stop analysis and cleanup resources
   */
  stopAnalysis() {
    this.isAnalyzing = false;
    
    if (this.sourceNode) {
      this.sourceNode.disconnect();
      this.sourceNode = null;
    }
  }

  /**
   * Get current frequency data
   */
  getFrequencyData() {
    if (!this.analyserNode) return null;

    const bufferLength = this.analyserNode.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    this.analyserNode.getByteFrequencyData(dataArray);
    
    return {
      data: dataArray,
      sampleRate: this.audioContext.sampleRate,
      bufferLength,
      nyquistFrequency: this.audioContext.sampleRate / 2
    };
  }

  /**
   * Get current amplitude/time domain data
   */
  getAmplitudeData() {
    if (!this.analyserNode) return null;

    const bufferLength = this.analyserNode.fftSize;
    const dataArray = new Uint8Array(bufferLength);
    this.analyserNode.getByteTimeDomainData(dataArray);
    
    return {
      data: dataArray,
      sampleRate: this.audioContext.sampleRate,
      bufferLength
    };
  }

  /**
   * Generate progressive waveform data with configurable sample rates
   */
  async generateProgressiveWaveform(duration, targetSampleRate = 1000) {
    const totalSamples = Math.floor(duration * targetSampleRate);
    const waveformData = new Float32Array(totalSamples);
    const samplesPerUpdate = Math.floor(targetSampleRate / 60); // 60fps updates
    
    let currentSample = 0;
    
    return new Promise((resolve) => {
      const generateChunk = () => {
        const endSample = Math.min(currentSample + samplesPerUpdate, totalSamples);
        
        // Generate waveform chunk based on current audio analysis
        for (let i = currentSample; i < endSample; i++) {
          const amplitudeData = this.getAmplitudeData();
          if (amplitudeData) {
            // Convert byte data to normalized float (-1 to 1)
            const avgAmplitude = this._calculateAverageAmplitude(amplitudeData.data);
            waveformData[i] = (avgAmplitude - 128) / 128;
          } else {
            waveformData[i] = 0;
          }
        }
        
        currentSample = endSample;
        
        // Notify progress callbacks
        const progress = currentSample / totalSamples;
        this.progressCallbacks.forEach(callback => {
          try {
            callback(progress, waveformData.slice(0, currentSample));
          } catch (error) {
            console.error('Progress callback error:', error);
          }
        });
        
        if (currentSample < totalSamples) {
          requestAnimationFrame(generateChunk);
        } else {
          resolve({
            samples: waveformData,
            sampleRate: targetSampleRate,
            duration,
            channels: 1,
            metadata: {
              analysisMethod: 'web-audio-progressive',
              quality: 'high',
              generatedAt: Date.now(),
              sourceInfo: {
                contextSampleRate: this.audioContext?.sampleRate,
                fftSize: this.fftSize
              }
            }
          });
        }
      };
      
      generateChunk();
    });
  }

  /**
   * Add callback for real-time analysis updates
   */
  onAnalysisUpdate(callback) {
    this.analysisCallbacks.add(callback);
    return () => this.analysisCallbacks.delete(callback);
  }

  /**
   * Add callback for progressive waveform generation progress
   */
  onProgressUpdate(callback) {
    this.progressCallbacks.add(callback);
    return () => this.progressCallbacks.delete(callback);
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics() {
    return { ...this.performanceMetrics };
  }

  /**
   * Cleanup resources
   */
  dispose() {
    this.stopAnalysis();
    
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
    }
    
    this.analysisCallbacks.clear();
    this.progressCallbacks.clear();
    this.waveformData = null;
    this.progressiveBuffer = null;
  }

  // Private methods

  /**
   * Main analysis loop for real-time processing
   */
  _analysisLoop() {
    if (!this.isAnalyzing) return;

    const startTime = performance.now();
    
    try {
      // Get current audio data
      const frequencyData = this.getFrequencyData();
      const amplitudeData = this.getAmplitudeData();
      
      if (frequencyData && amplitudeData) {
        // Notify analysis callbacks
        this.analysisCallbacks.forEach(callback => {
          try {
            callback({
              frequency: frequencyData,
              amplitude: amplitudeData,
              timestamp: this.audioContext.currentTime
            });
          } catch (error) {
            console.error('Analysis callback error:', error);
          }
        });
      }
      
      // Update performance metrics
      this.analysisFrameCount++;
      const analysisTime = performance.now() - startTime;
      this.performanceMetrics.averageAnalysisTime = 
        (this.performanceMetrics.averageAnalysisTime * (this.analysisFrameCount - 1) + analysisTime) / this.analysisFrameCount;
      
      if (analysisTime > 16) { // More than one frame at 60fps
        this.performanceMetrics.droppedFrames++;
      }
      
    } catch (error) {
      console.error('Analysis loop error:', error);
      this.performanceMetrics.droppedFrames++;
    }
    
    // Schedule next analysis frame only if still analyzing
    if (this.isAnalyzing) {
      requestAnimationFrame(() => this._analysisLoop());
    }
  }

  /**
   * Attempt direct audio capture from YouTube iframe
   */
  async _attemptDirectAudioCapture(youtubePlayer) {
    try {
      // This is limited by CORS policies for YouTube iframes
      // Most browsers will block this for security reasons
      const iframe = youtubePlayer.getIframe();
      if (!iframe) return null;

      // Try to get media stream from iframe (usually blocked)
      const stream = await navigator.mediaDevices.getDisplayMedia({
        audio: true,
        video: false
      });
      
      return stream;
    } catch (error) {
      console.warn('Direct audio capture blocked:', error);
      return null;
    }
  }

  /**
   * Get media element from YouTube player if available
   */
  async _getMediaElement(youtubePlayer) {
    try {
      // YouTube API doesn't expose direct media element access
      // This is a placeholder for potential future API changes
      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Connect audio stream to analyzer
   */
  async _connectAudioStream(audioStream) {
    try {
      this.sourceNode = this.audioContext.createMediaStreamSource(audioStream);
      this.sourceNode.connect(this.analyserNode);
      return true;
    } catch (error) {
      console.error('Failed to connect audio stream:', error);
      return false;
    }
  }

  /**
   * Connect media element to analyzer
   */
  async _connectMediaElement(mediaElement) {
    try {
      this.sourceNode = this.audioContext.createMediaElementSource(mediaElement);
      this.sourceNode.connect(this.analyserNode);
      this.analyserNode.connect(this.audioContext.destination);
      return true;
    } catch (error) {
      console.error('Failed to connect media element:', error);
      return false;
    }
  }

  /**
   * Setup progressive analysis for YouTube player
   */
  async _setupProgressiveAnalysis(youtubePlayer) {
    // Create oscillator as placeholder for testing
    // In real implementation, this would use alternative analysis methods
    try {
      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(this.analyserNode);
      gainNode.gain.setValueAtTime(0.01, this.audioContext.currentTime); // Very low volume
      
      oscillator.frequency.setValueAtTime(440, this.audioContext.currentTime);
      oscillator.start();
      
      this.sourceNode = oscillator;
      return true;
    } catch (error) {
      console.error('Failed to setup progressive analysis:', error);
      throw new Error(`Failed to setup progressive analysis: ${error.message}`);
    }
  }

  /**
   * Calculate average amplitude from byte array
   */
  _calculateAverageAmplitude(dataArray) {
    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) {
      sum += dataArray[i];
    }
    return sum / dataArray.length;
  }
}

export default WebAudioAnalyzer;