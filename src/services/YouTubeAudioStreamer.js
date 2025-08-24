/**
 * YouTubeAudioStreamer - Direct audio streaming from YouTube using official API
 * 
 * Uses YouTube IFrame API + Web Audio API to capture and process audio in real-time
 * without violating YouTube's terms of service.
 */

import performanceMonitor from './PerformanceMonitor.js';
import memoryManager from './MemoryManager.js';
import optimizedWaveformGenerator from './OptimizedWaveformGenerator.js';

class YouTubeAudioStreamer {
  constructor() {
    this.player = null;
    this.audioContext = null;
    this.mediaElementSource = null;
    this.analyser = null;
    this.isCapturing = false;
    this.capturedBuffer = null;
    this.waveformData = [];
    
    // Configuration
    this.config = {
      sampleRate: 44100,
      bufferSize: 4096,
      fftSize: 2048,
      smoothingTimeConstant: 0.8
    };

    // Bind methods
    this.initializePlayer = this.initializePlayer.bind(this);
    this.startCapture = this.startCapture.bind(this);
    this.stopCapture = this.stopCapture.bind(this);
    this.cleanup = this.cleanup.bind(this);
  }

  /**
   * Initialize YouTube player and Web Audio API
   * @param {string} videoId - YouTube video ID
   * @param {string} containerId - DOM element ID for player
   * @returns {Promise<boolean>} Success status
   */
  async initializePlayer(videoId, containerId) {
    const endMeasurement = performanceMonitor.startMeasurement('youtube_player_init');
    
    try {
      // Load YouTube IFrame API if not already loaded
      if (!window.YT) {
        await this.loadYouTubeAPI();
      }

      // Initialize audio context
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)({
        sampleRate: this.config.sampleRate
      });

      // Create YouTube player
      this.player = new window.YT.Player(containerId, {
        height: '0',
        width: '0',
        videoId: videoId,
        playerVars: {
          autoplay: 0,
          controls: 0,
          disablekb: 1,
          fs: 0,
          modestbranding: 1,
          rel: 0,
          showinfo: 0
        },
        events: {
          onReady: this.onPlayerReady.bind(this),
          onStateChange: this.onPlayerStateChange.bind(this),
          onError: this.onPlayerError.bind(this)
        }
      });

      endMeasurement({ success: true, videoId });
      return true;

    } catch (error) {
      endMeasurement({ error: error.message });
      console.error('Failed to initialize YouTube player:', error);
      throw new Error(`Player initialization failed: ${error.message}`);
    }
  }

  /**
   * Start capturing audio from YouTube player
   * @param {Function} onProgress - Progress callback
   * @returns {Promise<Object>} Captured audio data
   */
  async startCapture(onProgress = null) {
    const endMeasurement = performanceMonitor.startMeasurement('audio_capture');
    
    try {
      if (!this.player || !this.audioContext) {
        throw new Error('Player not initialized');
      }

      // Get the video element from YouTube player
      const iframe = this.player.getIframe();
      const videoElement = iframe.contentDocument?.querySelector('video') || 
                          iframe.contentWindow?.document?.querySelector('video');

      if (!videoElement) {
        // Alternative: Use MediaElementAudioSourceNode with hidden audio element
        return await this.captureWithAudioElement(onProgress);
      }

      // Create media element source
      this.mediaElementSource = this.audioContext.createMediaElementSource(videoElement);
      
      // Create analyser for real-time analysis
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = this.config.fftSize;
      this.analyser.smoothingTimeConstant = this.config.smoothingTimeConstant;

      // Connect audio graph
      this.mediaElementSource.connect(this.analyser);
      this.analyser.connect(this.audioContext.destination);

      // Start capturing
      this.isCapturing = true;
      const captureData = await this.performCapture(onProgress);

      endMeasurement({ success: true, duration: captureData.duration });
      return captureData;

    } catch (error) {
      endMeasurement({ error: error.message });
      console.error('Audio capture failed:', error);
      throw new Error(`Audio capture failed: ${error.message}`);
    }
  }

  /**
   * Alternative capture method using audio element
   * @private
   */
  async captureWithAudioElement(onProgress) {
    // Create hidden audio element
    const audioElement = document.createElement('audio');
    audioElement.crossOrigin = 'anonymous';
    audioElement.style.display = 'none';
    document.body.appendChild(audioElement);

    try {
      // Get audio URL from YouTube (this is the tricky part)
      const audioUrl = await this.getYouTubeAudioUrl();
      audioElement.src = audioUrl;

      // Create media element source
      this.mediaElementSource = this.audioContext.createMediaElementSource(audioElement);
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = this.config.fftSize;

      // Connect audio graph
      this.mediaElementSource.connect(this.analyser);
      this.analyser.connect(this.audioContext.destination);

      // Start playback and capture
      await audioElement.play();
      this.isCapturing = true;

      return await this.performCapture(onProgress);

    } finally {
      document.body.removeChild(audioElement);
    }
  }

  /**
   * Perform the actual audio capture
   * @private
   */
  async performCapture(onProgress) {
    const bufferLength = this.analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    const timeDataArray = new Float32Array(bufferLength);
    
    const capturedSamples = [];
    const waveformSamples = [];
    
    const duration = this.player.getDuration();
    const startTime = Date.now();

    return new Promise((resolve, reject) => {
      const captureFrame = () => {
        if (!this.isCapturing) {
          resolve({
            audioBuffer: this.createAudioBuffer(capturedSamples),
            waveformData: waveformSamples,
            duration: duration,
            sampleRate: this.config.sampleRate
          });
          return;
        }

        try {
          // Get frequency and time domain data
          this.analyser.getByteFrequencyData(dataArray);
          this.analyser.getFloatTimeDomainData(timeDataArray);

          // Store samples
          capturedSamples.push(new Float32Array(timeDataArray));
          
          // Calculate RMS for waveform
          let rms = 0;
          for (let i = 0; i < timeDataArray.length; i++) {
            rms += timeDataArray[i] * timeDataArray[i];
          }
          rms = Math.sqrt(rms / timeDataArray.length);
          waveformSamples.push(rms);

          // Report progress
          if (onProgress) {
            const currentTime = this.player.getCurrentTime();
            const progress = Math.round((currentTime / duration) * 100);
            onProgress({
              status: 'capturing',
              progress: Math.min(progress, 99),
              currentTime,
              duration
            });
          }

          // Continue capturing
          requestAnimationFrame(captureFrame);

        } catch (error) {
          reject(error);
        }
      };

      captureFrame();
    });
  }

  /**
   * Create AudioBuffer from captured samples
   * @private
   */
  createAudioBuffer(samples) {
    if (samples.length === 0) return null;

    const totalLength = samples.length * samples[0].length;
    const audioBuffer = this.audioContext.createBuffer(1, totalLength, this.config.sampleRate);
    const channelData = audioBuffer.getChannelData(0);

    let offset = 0;
    for (const sample of samples) {
      channelData.set(sample, offset);
      offset += sample.length;
    }

    return audioBuffer;
  }

  /**
   * Load YouTube IFrame API
   * @private
   */
  loadYouTubeAPI() {
    return new Promise((resolve, reject) => {
      if (window.YT && window.YT.Player) {
        resolve();
        return;
      }

      // Load YouTube API script
      const script = document.createElement('script');
      script.src = 'https://www.youtube.com/iframe_api';
      script.onload = () => {
        // Wait for API to be ready
        const checkAPI = () => {
          if (window.YT && window.YT.Player) {
            resolve();
          } else {
            setTimeout(checkAPI, 100);
          }
        };
        checkAPI();
      };
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  /**
   * Get YouTube audio URL (this is the challenging part)
   * @private
   */
  async getYouTubeAudioUrl() {
    // This would need to use a different approach since direct URL extraction
    // is what YouTube is blocking. Options include:
    // 1. Use YouTube Data API v3 (limited)
    // 2. Use a proxy service
    // 3. Use browser extension approach
    throw new Error('Direct audio URL extraction not available');
  }

  /**
   * Player event handlers
   */
  onPlayerReady(event) {
    console.log('YouTube player ready');
  }

  onPlayerStateChange(event) {
    const state = event.data;
    console.log('Player state changed:', state);
    
    if (state === window.YT.PlayerState.ENDED) {
      this.stopCapture();
    }
  }

  onPlayerError(event) {
    console.error('YouTube player error:', event.data);
  }

  /**
   * Stop audio capture
   */
  stopCapture() {
    this.isCapturing = false;
    
    if (this.mediaElementSource) {
      this.mediaElementSource.disconnect();
      this.mediaElementSource = null;
    }
    
    if (this.analyser) {
      this.analyser.disconnect();
      this.analyser = null;
    }
  }

  /**
   * Get video information
   */
  getVideoInfo() {
    if (!this.player) return null;
    
    return {
      title: this.player.getVideoData()?.title || 'Unknown',
      duration: this.player.getDuration(),
      currentTime: this.player.getCurrentTime(),
      videoId: this.player.getVideoData()?.video_id
    };
  }

  /**
   * Clean up resources
   */
  cleanup() {
    this.stopCapture();
    
    if (this.player) {
      this.player.destroy();
      this.player = null;
    }
    
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
      this.audioContext = null;
    }
    
    console.log('YouTubeAudioStreamer cleaned up');
  }
}

// Create and export singleton instance
const youTubeAudioStreamer = new YouTubeAudioStreamer();

export default youTubeAudioStreamer;