/**
 * Unit tests for VideoFrameAnalyzer
 * Tests video frame analysis and visual complexity calculation
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { VideoFrameAnalyzer } from '../VideoFrameAnalyzer.js';

// Mock DOM APIs
const mockCanvas = {
  width: 0,
  height: 0,
  getContext: vi.fn()
};

const mockContext = {
  drawImage: vi.fn(),
  getImageData: vi.fn()
};

const mockVideo = {
  tagName: 'VIDEO',
  duration: 180,
  currentTime: 0,
  readyState: 4,
  addEventListener: vi.fn()
};

// Mock document.createElement
global.document = {
  createElement: vi.fn(() => mockCanvas)
};

describe('VideoFrameAnalyzer', () => {
  let analyzer;

  beforeEach(() => {
    vi.clearAllMocks();
    mockCanvas.getContext.mockReturnValue(mockContext);
    
    analyzer = new VideoFrameAnalyzer({
      sampleRate: 44100,
      frameRate: 30,
      analysisWidth: 160,
      analysisHeight: 90
    });
  });

  afterEach(() => {
    analyzer.dispose();
  });

  describe('Initialization', () => {
    it('should initialize with default options', () => {
      const defaultAnalyzer = new VideoFrameAnalyzer();
      
      expect(defaultAnalyzer.sampleRate).toBe(44100);
      expect(defaultAnalyzer.frameRate).toBe(30);
      expect(defaultAnalyzer.analysisWidth).toBe(160);
      expect(defaultAnalyzer.analysisHeight).toBe(90);
    });

    it('should initialize with custom options', () => {
      const customAnalyzer = new VideoFrameAnalyzer({
        sampleRate: 48000,
        frameRate: 60,
        analysisWidth: 320,
        analysisHeight: 180
      });
      
      expect(customAnalyzer.sampleRate).toBe(48000);
      expect(customAnalyzer.frameRate).toBe(60);
      expect(customAnalyzer.analysisWidth).toBe(320);
      expect(customAnalyzer.analysisHeight).toBe(180);
    });

    it('should initialize canvas and context when video is ready', async () => {
      await analyzer.initialize(mockVideo);
      
      expect(document.createElement).toHaveBeenCalledWith('canvas');
      expect(mockCanvas.width).toBe(160);
      expect(mockCanvas.height).toBe(90);
      expect(mockCanvas.getContext).toHaveBeenCalledWith('2d');
      expect(analyzer.video).toBe(mockVideo);
      expect(analyzer.canvas).toBe(mockCanvas);
      expect(analyzer.context).toBe(mockContext);
    });

    it('should wait for video to be ready if not loaded', async () => {
      const notReadyVideo = { ...mockVideo, readyState: 1 };
      
      // Mock addEventListener to immediately call the callback
      notReadyVideo.addEventListener.mockImplementation((event, callback) => {
        if (event === 'loadeddata') {
          setTimeout(callback, 0);
        }
      });

      await analyzer.initialize(notReadyVideo);
      
      expect(notReadyVideo.addEventListener).toHaveBeenCalledWith(
        'loadeddata',
        expect.any(Function),
        { once: true }
      );
    });
  });

  describe('Frame Analysis', () => {
    beforeEach(async () => {
      await analyzer.initialize(mockVideo);
    });

    it('should analyze video frames and generate waveform data', async () => {
      const duration = 2; // 2 seconds
      const progressCallback = vi.fn();
      
      // Mock successful frame analysis
      mockContext.getImageData.mockReturnValue({
        data: new Uint8ClampedArray(160 * 90 * 4).fill(128) // Gray image
      });

      const result = await analyzer.analyzeVideo(duration, progressCallback);
      
      expect(result).toMatchObject({
        sampleRate: 44100,
        duration: 2,
        channels: 1,
        metadata: {
          analysisMethod: 'video-frame',
          quality: 'medium'
        }
      });
      
      expect(result.samples).toBeInstanceOf(Float32Array);
      expect(result.samples.length).toBe(Math.floor(duration * 44100));
      expect(progressCallback).toHaveBeenCalled();
    });

    it('should handle video seeking during analysis', async () => {
      const duration = 1;
      const originalTime = 10;
      mockVideo.currentTime = originalTime;
      
      mockContext.getImageData.mockReturnValue({
        data: new Uint8ClampedArray(160 * 90 * 4).fill(128)
      });

      await analyzer.analyzeVideo(duration);
      
      // Should restore original time
      expect(mockVideo.currentTime).toBe(originalTime);
    });

    it('should restore video position on error', async () => {
      const originalTime = 15;
      mockVideo.currentTime = originalTime;
      
      // Mock context to throw error during getImageData
      mockContext.getImageData.mockImplementation(() => {
        throw new Error('Canvas error');
      });

      // The analyzer should catch the error and continue, but eventually fail
      // Let's make it fail by making waitForSeek also fail
      const originalWaitForSeek = analyzer.waitForSeek;
      analyzer.waitForSeek = vi.fn().mockRejectedValue(new Error('Seek failed'));

      await expect(analyzer.analyzeVideo(1)).rejects.toThrow();
      
      // Should still restore original time
      expect(mockVideo.currentTime).toBe(originalTime);
      
      // Restore original method
      analyzer.waitForSeek = originalWaitForSeek;
    });
  });

  describe('Visual Complexity Calculation', () => {
    beforeEach(async () => {
      await analyzer.initialize(mockVideo);
    });

    it('should calculate complexity for uniform image', () => {
      const uniformImageData = {
        data: new Uint8ClampedArray(160 * 90 * 4).fill(128) // All gray
      };
      
      const complexity = analyzer.calculateVisualComplexity(uniformImageData);
      
      expect(complexity.overall).toBeGreaterThanOrEqual(0);
      expect(complexity.overall).toBeLessThanOrEqual(1);
      expect(complexity.brightness).toBeCloseTo(0.5, 1); // Gray = 0.5 brightness
      expect(complexity.edges).toBe(0); // No edges in uniform image
      expect(complexity.contrast).toBe(0); // No contrast in uniform image
    });

    it('should calculate higher complexity for varied image', () => {
      // Create checkerboard pattern
      const checkerboardData = new Uint8ClampedArray(160 * 90 * 4);
      for (let i = 0; i < checkerboardData.length; i += 4) {
        const pixelIndex = Math.floor(i / 4);
        const x = pixelIndex % 160;
        const y = Math.floor(pixelIndex / 160);
        const isBlack = (Math.floor(x / 10) + Math.floor(y / 10)) % 2 === 0;
        
        checkerboardData[i] = isBlack ? 0 : 255;     // R
        checkerboardData[i + 1] = isBlack ? 0 : 255; // G
        checkerboardData[i + 2] = isBlack ? 0 : 255; // B
        checkerboardData[i + 3] = 255;               // A
      }
      
      const uniformData = new Uint8ClampedArray(160 * 90 * 4).fill(128);
      
      const checkerboardComplexity = analyzer.calculateVisualComplexity({
        data: checkerboardData
      });
      
      const uniformComplexity = analyzer.calculateVisualComplexity({
        data: uniformData
      });
      
      expect(checkerboardComplexity.overall).toBeGreaterThan(uniformComplexity.overall);
      expect(checkerboardComplexity.edges).toBeGreaterThan(uniformComplexity.edges);
      expect(checkerboardComplexity.contrast).toBeGreaterThan(uniformComplexity.contrast);
    });

    it('should handle edge detection correctly', () => {
      // Create image with strong horizontal edge
      const edgeData = new Uint8ClampedArray(160 * 90 * 4);
      for (let i = 0; i < edgeData.length; i += 4) {
        const pixelIndex = Math.floor(i / 4);
        const y = Math.floor(pixelIndex / 160);
        const isTopHalf = y < 45;
        
        edgeData[i] = isTopHalf ? 0 : 255;     // R
        edgeData[i + 1] = isTopHalf ? 0 : 255; // G
        edgeData[i + 2] = isTopHalf ? 0 : 255; // B
        edgeData[i + 3] = 255;                 // A
      }
      
      const edgeStrength = analyzer.calculateEdgeStrength(
        Array.from({ length: 160 * 90 }, (_, i) => {
          const y = Math.floor(i / 160);
          return y < 45 ? 0 : 1;
        })
      );
      
      expect(edgeStrength).toBeGreaterThan(0);
    });
  });

  describe('Sample Generation', () => {
    beforeEach(async () => {
      await analyzer.initialize(mockVideo);
    });

    it('should generate samples from complexity data', () => {
      const waveformData = new Float32Array(1000);
      const complexity = {
        overall: 0.8,
        edges: 0.6,
        brightness: 0.5,
        contrast: 0.7
      };
      
      analyzer.generateSamplesFromComplexity(complexity, waveformData, 0, 1000);
      
      // Check that samples were generated
      const nonZeroSamples = Array.from(waveformData).filter(sample => sample !== 0);
      expect(nonZeroSamples.length).toBeGreaterThan(0);
      
      // Check that samples are within valid range
      for (const sample of waveformData) {
        expect(sample).toBeGreaterThanOrEqual(-1);
        expect(sample).toBeLessThanOrEqual(1);
      }
    });

    it('should map complexity to appropriate frequency range', () => {
      const lowComplexity = { overall: 0.1 };
      const highComplexity = { overall: 0.9 };
      
      const lowFreq = analyzer.mapComplexityToFrequency(lowComplexity);
      const highFreq = analyzer.mapComplexityToFrequency(highComplexity);
      
      expect(lowFreq).toBeGreaterThanOrEqual(100);
      expect(highFreq).toBeLessThanOrEqual(2000);
      expect(highFreq).toBeGreaterThan(lowFreq);
    });
  });

  describe('Error Handling', () => {
    it('should throw error when not initialized', async () => {
      const uninitializedAnalyzer = new VideoFrameAnalyzer();
      
      await expect(uninitializedAnalyzer.analyzeVideo(1))
        .rejects.toThrow('VideoFrameAnalyzer not initialized');
    });

    it('should handle canvas drawing errors gracefully', async () => {
      await analyzer.initialize(mockVideo);
      
      // Mock drawImage to throw error
      mockContext.drawImage.mockImplementation(() => {
        throw new Error('Canvas drawing failed');
      });
      
      const complexity = analyzer.analyzeFrame();
      
      // Should return low complexity on error
      expect(complexity.overall).toBe(0.1);
      expect(complexity.edges).toBe(0.1);
      expect(complexity.brightness).toBe(0.5);
      expect(complexity.contrast).toBe(0.1);
    });

    it('should handle getImageData errors gracefully', async () => {
      await analyzer.initialize(mockVideo);
      
      // Mock getImageData to throw error
      mockContext.getImageData.mockImplementation(() => {
        throw new Error('Image data access failed');
      });
      
      const complexity = analyzer.analyzeFrame();
      
      // Should return low complexity on error
      expect(complexity.overall).toBe(0.1);
    });
  });

  describe('Resource Management', () => {
    it('should clean up resources on dispose', () => {
      analyzer.canvas = mockCanvas;
      analyzer.context = mockContext;
      analyzer.video = mockVideo;
      
      analyzer.dispose();
      
      expect(analyzer.canvas).toBeNull();
      expect(analyzer.context).toBeNull();
      expect(analyzer.video).toBeNull();
    });
  });

  describe('Wait for Seek', () => {
    beforeEach(async () => {
      await analyzer.initialize(mockVideo);
    });

    it('should resolve immediately when video is ready', async () => {
      mockVideo.readyState = 4;
      
      const startTime = performance.now();
      await analyzer.waitForSeek();
      const endTime = performance.now();
      
      // Should resolve quickly
      expect(endTime - startTime).toBeLessThan(50);
    });

    it('should wait when video is not ready', async () => {
      mockVideo.readyState = 1;
      
      // Simulate video becoming ready after delay
      setTimeout(() => {
        mockVideo.readyState = 4;
      }, 50);
      
      const startTime = performance.now();
      await analyzer.waitForSeek();
      const endTime = performance.now();
      
      // Should have waited
      expect(endTime - startTime).toBeGreaterThanOrEqual(40);
    });
  });
});