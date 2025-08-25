/**
 * VideoFrameAnalyzer - Analyzes video frames as a proxy for audio content
 * Uses canvas to extract visual complexity data that correlates with audio activity
 */
export class VideoFrameAnalyzer {
  constructor(options = {}) {
    this.sampleRate = options.sampleRate || 44100;
    this.frameRate = options.frameRate || 30;
    this.analysisWidth = options.analysisWidth || 160;
    this.analysisHeight = options.analysisHeight || 90;
    this.canvas = null;
    this.context = null;
    this.video = null;
  }

  /**
   * Initialize the analyzer with a video element
   */
  async initialize(videoElement) {
    this.video = videoElement;
    this.canvas = document.createElement('canvas');
    this.canvas.width = this.analysisWidth;
    this.canvas.height = this.analysisHeight;
    this.context = this.canvas.getContext('2d');
    
    // Wait for video to be ready
    if (this.video.readyState < 2) {
      await new Promise((resolve) => {
        this.video.addEventListener('loadeddata', resolve, { once: true });
      });
    }
  }

  /**
   * Analyze video frames to generate waveform-like data
   */
  async analyzeVideo(duration, onProgress) {
    if (!this.video || !this.context) {
      throw new Error('VideoFrameAnalyzer not initialized');
    }

    const totalFrames = Math.floor(duration * this.frameRate);
    const samplesPerFrame = Math.floor(this.sampleRate / this.frameRate);
    const totalSamples = totalFrames * samplesPerFrame;
    const waveformData = new Float32Array(totalSamples);

    let currentFrame = 0;
    const originalTime = this.video.currentTime;

    try {
      for (let frame = 0; frame < totalFrames; frame++) {
        const timePosition = (frame / totalFrames) * duration;
        
        // Seek to frame position
        this.video.currentTime = timePosition;
        await this.waitForSeek();

        // Capture and analyze frame
        const frameComplexity = this.analyzeFrame();
        
        // Convert frame complexity to audio-like samples
        const startSample = frame * samplesPerFrame;
        this.generateSamplesFromComplexity(
          frameComplexity, 
          waveformData, 
          startSample, 
          samplesPerFrame
        );

        currentFrame++;
        
        if (onProgress && frame % 10 === 0) {
          onProgress(frame / totalFrames);
        }
      }

      // Restore original video position
      this.video.currentTime = originalTime;

      return {
        samples: waveformData,
        sampleRate: this.sampleRate,
        duration: duration,
        channels: 1,
        metadata: {
          analysisMethod: 'video-frame',
          quality: 'medium',
          generatedAt: Date.now(),
          sourceInfo: {
            frameRate: this.frameRate,
            totalFrames: totalFrames,
            analysisResolution: `${this.analysisWidth}x${this.analysisHeight}`
          }
        }
      };
    } catch (error) {
      // Restore original position on error
      this.video.currentTime = originalTime;
      throw error;
    }
  }

  /**
   * Wait for video seek operation to complete
   */
  async waitForSeek() {
    return new Promise((resolve) => {
      const checkSeek = () => {
        if (this.video.readyState >= 2) {
          resolve();
        } else {
          setTimeout(checkSeek, 10);
        }
      };
      checkSeek();
    });
  }

  /**
   * Analyze a single video frame for visual complexity
   */
  analyzeFrame() {
    try {
      // Draw current video frame to canvas
      this.context.drawImage(
        this.video, 
        0, 0, 
        this.analysisWidth, 
        this.analysisHeight
      );

      // Get image data
      const imageData = this.context.getImageData(
        0, 0, 
        this.analysisWidth, 
        this.analysisHeight
      );
      
      return this.calculateVisualComplexity(imageData);
    } catch (error) {
      // Return low complexity on error
      return { overall: 0.1, edges: 0.1, brightness: 0.5, contrast: 0.1 };
    }
  }

  /**
   * Calculate visual complexity metrics from image data
   */
  calculateVisualComplexity(imageData) {
    const data = imageData.data;
    const pixels = data.length / 4;
    
    let totalBrightness = 0;
    let edgeStrength = 0;
    let brightnessVariance = 0;
    const brightnessValues = [];

    // Analyze each pixel
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      
      // Calculate brightness (luminance)
      const brightness = (r * 0.299 + g * 0.587 + b * 0.114) / 255;
      brightnessValues.push(brightness);
      totalBrightness += brightness;
    }

    const avgBrightness = totalBrightness / pixels;

    // Calculate brightness variance (proxy for visual activity)
    for (const brightness of brightnessValues) {
      brightnessVariance += Math.pow(brightness - avgBrightness, 2);
    }
    brightnessVariance = Math.sqrt(brightnessVariance / pixels);

    // Calculate edge strength (proxy for visual complexity)
    edgeStrength = this.calculateEdgeStrength(brightnessValues);

    // Calculate contrast
    const minBrightness = Math.min(...brightnessValues);
    const maxBrightness = Math.max(...brightnessValues);
    const contrast = maxBrightness - minBrightness;

    // Combine metrics into overall complexity score
    const overall = (brightnessVariance * 0.4 + edgeStrength * 0.4 + contrast * 0.2);

    return {
      overall: Math.min(overall, 1.0),
      edges: Math.min(edgeStrength, 1.0),
      brightness: avgBrightness,
      contrast: Math.min(contrast, 1.0)
    };
  }

  /**
   * Calculate edge strength using simple gradient detection
   */
  calculateEdgeStrength(brightnessValues) {
    const width = this.analysisWidth;
    const height = this.analysisHeight;
    let totalEdgeStrength = 0;
    let edgeCount = 0;

    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const center = brightnessValues[y * width + x];
        const right = brightnessValues[y * width + (x + 1)];
        const bottom = brightnessValues[(y + 1) * width + x];
        
        const horizontalGradient = Math.abs(right - center);
        const verticalGradient = Math.abs(bottom - center);
        const edgeStrength = Math.sqrt(
          horizontalGradient * horizontalGradient + 
          verticalGradient * verticalGradient
        );
        
        totalEdgeStrength += edgeStrength;
        edgeCount++;
      }
    }

    return edgeCount > 0 ? totalEdgeStrength / edgeCount : 0;
  }

  /**
   * Generate audio-like samples from visual complexity data
   */
  generateSamplesFromComplexity(complexity, waveformData, startIndex, sampleCount) {
    const baseAmplitude = complexity.overall * 0.8;
    const noiseLevel = complexity.contrast * 0.2;
    const frequency = this.mapComplexityToFrequency(complexity);
    
    for (let i = 0; i < sampleCount; i++) {
      const sampleIndex = startIndex + i;
      if (sampleIndex >= waveformData.length) break;
      
      // Generate sine wave based on complexity
      const time = i / this.sampleRate;
      const sineWave = Math.sin(2 * Math.PI * frequency * time);
      
      // Add noise based on edge complexity
      const noise = (Math.random() - 0.5) * noiseLevel;
      
      // Combine and apply amplitude
      waveformData[sampleIndex] = (sineWave + noise) * baseAmplitude;
    }
  }

  /**
   * Map visual complexity to audio frequency
   */
  mapComplexityToFrequency(complexity) {
    // Map complexity to frequency range (100Hz - 2000Hz)
    const minFreq = 100;
    const maxFreq = 2000;
    return minFreq + (complexity.overall * (maxFreq - minFreq));
  }

  /**
   * Clean up resources
   */
  dispose() {
    if (this.canvas) {
      this.canvas = null;
      this.context = null;
    }
    this.video = null;
  }
}