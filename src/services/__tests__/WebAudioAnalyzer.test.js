/**
 * Unit tests for WebAudioAnalyzer
 * Tests audio analysis accuracy and performance
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { WebAudioAnalyzer } from '../WebAudioAnalyzer.js';

// Mock Web Audio API
const mockAudioContext = {
  state: 'running',
  sampleRate: 44100,
  currentTime: 0,
  resume: vi.fn().mockResolvedValue(undefined),
  close: vi.fn().mockResolvedValue(undefined),
  createAnalyser: vi.fn(),
  createMediaStreamSource: vi.fn(),
  createMediaElementSource: vi.fn(),
  createOscillator: vi.fn(),
  createGain: vi.fn(),
  destination: {}
};

const mockAnalyserNode = {
  fftSize: 2048,
  frequencyBinCount: 1024,
  smoothingTimeConstant: 0.8,
  minDecibels: -90,
  maxDecibels: -10,
  getByteFrequencyData: vi.fn(),
  getByteTimeDomainData: vi.fn(),
  connect: vi.fn(),
  disconnect: vi.fn()
};

const mockSourceNode = {
  connect: vi.fn(),
  disconnect: vi.fn(),
  start: vi.fn()
};

const mockOscillator = {
  ...mockSourceNode,
  frequency: {
    setValueAtTime: vi.fn()
  }
};

const mockGainNode = {
  ...mockSourceNode,
  gain: {
    setValueAtTime: vi.fn()
  }
};

// Mock global objects
global.AudioContext = vi.fn(() => mockAudioContext);
global.webkitAudioContext = vi.fn(() => mockAudioContext);
global.requestAnimationFrame = vi.fn((callback) => setTimeout(callback, 16));
global.performance = {
  now: vi.fn(() => Date.now())
};

describe('WebAudioAnalyzer', () => {
  let analyzer;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup mock returns
    mockAudioContext.createAnalyser.mockReturnValue(mockAnalyserNode);
    mockAudioContext.createMediaStreamSource.mockReturnValue(mockSourceNode);
    mockAudioContext.createMediaElementSource.mockReturnValue(mockSourceNode);
    mockAudioContext.createOscillator.mockReturnValue(mockOscillator);
    mockAudioContext.createGain.mockReturnValue(mockGainNode);
    
    analyzer = new WebAudioAnalyzer({
      sampleRate: 44100,
      fftSize: 2048,
      smoothingTimeConstant: 0.8
    });
  });

  afterEach(() => {
    if (analyzer) {
      analyzer.dispose();
    }
  });

  describe('Initialization', () => {
    it('should initialize with default options', () => {
      const defaultAnalyzer = new WebAudioAnalyzer();
      expect(defaultAnalyzer.sampleRate).toBe(44100);
      expect(defaultAnalyzer.fftSize).toBe(2048);
      expect(defaultAnalyzer.smoothingTimeConstant).toBe(0.8);
    });

    it('should initialize with custom options', () => {
      const customAnalyzer = new WebAudioAnalyzer({
        sampleRate: 48000,
        fftSize: 4096,
        smoothingTimeConstant: 0.5
      });
      
      expect(customAnalyzer.sampleRate).toBe(48000);
      expect(customAnalyzer.fftSize).toBe(4096);
      expect(customAnalyzer.smoothingTimeConstant).toBe(0.5);
    });

    it('should successfully initialize Web Audio API', async () => {
      const result = await analyzer.initialize();
      
      expect(result).toBe(true);
      expect(AudioContext).toHaveBeenCalledWith({
        sampleRate: 44100,
        latencyHint: 'interactive'
      });
      expect(mockAudioContext.createAnalyser).toHaveBeenCalled();
      expect(mockAnalyserNode.fftSize).toBe(2048);
      expect(mockAnalyserNode.smoothingTimeConstant).toBe(0.8);
    });

    it('should resume suspended audio context', async () => {
      mockAudioContext.state = 'suspended';
      
      await analyzer.initialize();
      
      expect(mockAudioContext.resume).toHaveBeenCalled();
    });

    it('should handle initialization errors', async () => {
      mockAudioContext.createAnalyser.mockImplementation(() => {
        throw new Error('AudioContext creation failed');
      });
      
      await expect(analyzer.initialize()).rejects.toThrow(
        'Web Audio API initialization failed: AudioContext creation failed'
      );
    });
  });

  describe('YouTube Stream Connection', () => {
    beforeEach(async () => {
      await analyzer.initialize();
    });

    it('should throw error if not initialized', async () => {
      const uninitializedAnalyzer = new WebAudioAnalyzer();
      const mockPlayer = { getIframe: vi.fn() };
      
      await expect(uninitializedAnalyzer.connectToYouTubeStream(mockPlayer))
        .rejects.toThrow('WebAudioAnalyzer not initialized');
    });

    it('should attempt progressive analysis fallback', async () => {
      const mockPlayer = { getIframe: vi.fn(() => null) };
      
      const result = await analyzer.connectToYouTubeStream(mockPlayer);
      
      expect(result).toBe(true);
      expect(mockAudioContext.createOscillator).toHaveBeenCalled();
      expect(mockAudioContext.createGain).toHaveBeenCalled();
    });

    it('should handle connection errors gracefully', async () => {
      const mockPlayer = { getIframe: vi.fn(() => null) };
      mockAudioContext.createOscillator.mockImplementation(() => {
        throw new Error('Oscillator creation failed');
      });
      
      await expect(analyzer.connectToYouTubeStream(mockPlayer))
        .rejects.toThrow('YouTube audio connection failed: Failed to setup progressive analysis: Oscillator creation failed');
    });
  });

  describe('Real-time Analysis', () => {
    beforeEach(async () => {
      await analyzer.initialize();
    });

    it('should start analysis successfully', () => {
      analyzer.startAnalysis();
      
      expect(analyzer.isAnalyzing).toBe(true);
      expect(analyzer.analysisFrameCount).toBe(0);
      expect(analyzer.lastAnalysisTime).toBeGreaterThan(0);
    });

    it('should not start analysis if already analyzing', () => {
      analyzer.isAnalyzing = true;
      const initialFrameCount = analyzer.analysisFrameCount;
      
      analyzer.startAnalysis();
      
      expect(analyzer.analysisFrameCount).toBe(initialFrameCount);
    });

    it('should stop analysis and cleanup', () => {
      analyzer.sourceNode = mockSourceNode;
      analyzer.isAnalyzing = true;
      
      analyzer.stopAnalysis();
      
      expect(analyzer.isAnalyzing).toBe(false);
      expect(mockSourceNode.disconnect).toHaveBeenCalled();
      expect(analyzer.sourceNode).toBeNull();
    });

    it('should get frequency data correctly', () => {
      const mockFrequencyData = new Uint8Array([100, 150, 200, 50]);
      mockAnalyserNode.getByteFrequencyData.mockImplementation((array) => {
        array.set(mockFrequencyData);
      });
      
      const result = analyzer.getFrequencyData();
      
      expect(result).toEqual({
        data: expect.any(Uint8Array),
        sampleRate: 44100,
        bufferLength: 1024,
        nyquistFrequency: 22050
      });
      expect(mockAnalyserNode.getByteFrequencyData).toHaveBeenCalled();
    });

    it('should get amplitude data correctly', () => {
      const mockAmplitudeData = new Uint8Array([128, 140, 120, 135]);
      mockAnalyserNode.getByteTimeDomainData.mockImplementation((array) => {
        array.set(mockAmplitudeData);
      });
      
      const result = analyzer.getAmplitudeData();
      
      expect(result).toEqual({
        data: expect.any(Uint8Array),
        sampleRate: 44100,
        bufferLength: 2048
      });
      expect(mockAnalyserNode.getByteTimeDomainData).toHaveBeenCalled();
    });

    it('should return null when analyzer not available', () => {
      analyzer.analyserNode = null;
      
      expect(analyzer.getFrequencyData()).toBeNull();
      expect(analyzer.getAmplitudeData()).toBeNull();
    });
  });

  describe('Progressive Waveform Generation', () => {
    beforeEach(async () => {
      await analyzer.initialize();
      
      // Mock amplitude data for waveform generation
      const mockAmplitudeData = new Uint8Array(2048).fill(128);
      mockAnalyserNode.getByteTimeDomainData.mockImplementation((array) => {
        // Simulate varying amplitude
        for (let i = 0; i < array.length; i++) {
          array[i] = 128 + Math.sin(i * 0.1) * 50;
        }
      });
    });

    it('should generate progressive waveform with correct structure', async () => {
      const duration = 1; // 1 second
      const targetSampleRate = 100; // Low sample rate for testing
      
      const result = await analyzer.generateProgressiveWaveform(duration, targetSampleRate);
      
      expect(result).toEqual({
        samples: expect.any(Float32Array),
        sampleRate: targetSampleRate,
        duration: duration,
        channels: 1,
        metadata: {
          analysisMethod: 'web-audio-progressive',
          quality: 'high',
          generatedAt: expect.any(Number),
          sourceInfo: {
            contextSampleRate: 44100,
            fftSize: 2048
          }
        }
      });
      
      expect(result.samples.length).toBe(targetSampleRate * duration);
    });

    it('should call progress callbacks during generation', async () => {
      const progressCallback = vi.fn();
      analyzer.onProgressUpdate(progressCallback);
      
      const duration = 0.1; // Short duration for testing
      const targetSampleRate = 60;
      
      await analyzer.generateProgressiveWaveform(duration, targetSampleRate);
      
      expect(progressCallback).toHaveBeenCalled();
      expect(progressCallback).toHaveBeenCalledWith(
        expect.any(Number), // progress
        expect.any(Float32Array) // partial waveform data
      );
    });

    it('should handle progress callback errors gracefully', async () => {
      const errorCallback = vi.fn(() => {
        throw new Error('Callback error');
      });
      analyzer.onProgressUpdate(errorCallback);
      
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      await analyzer.generateProgressiveWaveform(0.1, 60);
      
      expect(consoleSpy).toHaveBeenCalledWith('Progress callback error:', expect.any(Error));
      consoleSpy.mockRestore();
    });
  });

  describe('Callback Management', () => {
    it('should add and remove analysis callbacks', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();
      
      const unsubscribe1 = analyzer.onAnalysisUpdate(callback1);
      const unsubscribe2 = analyzer.onAnalysisUpdate(callback2);
      
      expect(analyzer.analysisCallbacks.size).toBe(2);
      
      unsubscribe1();
      expect(analyzer.analysisCallbacks.size).toBe(1);
      
      unsubscribe2();
      expect(analyzer.analysisCallbacks.size).toBe(0);
    });

    it('should add and remove progress callbacks', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();
      
      const unsubscribe1 = analyzer.onProgressUpdate(callback1);
      const unsubscribe2 = analyzer.onProgressUpdate(callback2);
      
      expect(analyzer.progressCallbacks.size).toBe(2);
      
      unsubscribe1();
      expect(analyzer.progressCallbacks.size).toBe(1);
      
      unsubscribe2();
      expect(analyzer.progressCallbacks.size).toBe(0);
    });
  });

  describe('Performance Monitoring', () => {
    beforeEach(async () => {
      await analyzer.initialize();
    });

    it('should track performance metrics', () => {
      const metrics = analyzer.getPerformanceMetrics();
      
      expect(metrics).toEqual({
        averageAnalysisTime: 0,
        droppedFrames: 0,
        memoryUsage: 0
      });
    });

    it('should update performance metrics during analysis', () => {
      // Mock performance.now to simulate analysis time
      let timeCounter = 0;
      global.performance.now.mockImplementation(() => timeCounter += 10);
      
      analyzer.startAnalysis();
      
      // Simulate analysis loop execution
      analyzer._analysisLoop();
      
      const metrics = analyzer.getPerformanceMetrics();
      expect(metrics.averageAnalysisTime).toBeGreaterThan(0);
    });
  });

  describe('Resource Cleanup', () => {
    beforeEach(async () => {
      await analyzer.initialize();
    });

    it('should dispose resources properly', () => {
      analyzer.sourceNode = mockSourceNode;
      analyzer.isAnalyzing = true;
      analyzer.onAnalysisUpdate(vi.fn());
      analyzer.onProgressUpdate(vi.fn());
      
      analyzer.dispose();
      
      expect(analyzer.isAnalyzing).toBe(false);
      expect(mockSourceNode.disconnect).toHaveBeenCalled();
      expect(mockAudioContext.close).toHaveBeenCalled();
      expect(analyzer.analysisCallbacks.size).toBe(0);
      expect(analyzer.progressCallbacks.size).toBe(0);
      expect(analyzer.waveformData).toBeNull();
    });

    it('should handle disposal when audio context is already closed', () => {
      mockAudioContext.state = 'closed';
      
      expect(() => analyzer.dispose()).not.toThrow();
      expect(mockAudioContext.close).not.toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    beforeEach(async () => {
      await analyzer.initialize();
    });

    it('should handle analysis callback errors', () => {
      const errorCallback = vi.fn(() => {
        throw new Error('Analysis callback error');
      });
      analyzer.onAnalysisUpdate(errorCallback);
      
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      // Mock successful data retrieval
      mockAnalyserNode.getByteFrequencyData.mockImplementation(() => {});
      mockAnalyserNode.getByteTimeDomainData.mockImplementation(() => {});
      
      analyzer.startAnalysis();
      analyzer._analysisLoop();
      
      expect(consoleSpy).toHaveBeenCalledWith('Analysis callback error:', expect.any(Error));
      consoleSpy.mockRestore();
    });

    it('should handle analysis loop errors', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      // Mock getFrequencyData to throw error
      analyzer.getFrequencyData = vi.fn(() => {
        throw new Error('Analysis error');
      });
      
      analyzer.startAnalysis();
      analyzer._analysisLoop();
      
      expect(analyzer.performanceMetrics.droppedFrames).toBeGreaterThan(0);
      expect(consoleSpy).toHaveBeenCalledWith('Analysis loop error:', expect.any(Error));
      consoleSpy.mockRestore();
    });
  });

  describe('Audio Analysis Accuracy', () => {
    beforeEach(async () => {
      await analyzer.initialize();
    });

    it('should accurately convert byte amplitude data to normalized float', () => {
      // Test the private method through public interface
      const testData = new Uint8Array([0, 64, 128, 192, 255]);
      const result = analyzer._calculateAverageAmplitude(testData);
      
      expect(result).toBe(127.8); // Average of test data
    });

    it('should handle empty amplitude data', () => {
      const testData = new Uint8Array([]);
      const result = analyzer._calculateAverageAmplitude(testData);
      
      expect(result).toBeNaN(); // Division by zero
    });

    it('should generate consistent waveform data', async () => {
      // Mock consistent amplitude data
      mockAnalyserNode.getByteTimeDomainData.mockImplementation((array) => {
        array.fill(150); // Consistent amplitude
      });
      
      const result = await analyzer.generateProgressiveWaveform(0.1, 100);
      
      // All samples should be similar since input is consistent
      const firstSample = result.samples[0];
      const lastSample = result.samples[result.samples.length - 1];
      
      expect(Math.abs(firstSample - lastSample)).toBeLessThan(0.1);
    });
  });

  describe('Performance Benchmarks', () => {
    beforeEach(async () => {
      await analyzer.initialize();
    });

    it('should complete waveform generation within reasonable time', async () => {
      const startTime = Date.now();
      
      await analyzer.generateProgressiveWaveform(1, 1000); // 1 second at 1kHz
      
      const endTime = Date.now();
      const generationTime = endTime - startTime;
      
      // Should complete within 2 seconds for 1 second of audio
      expect(generationTime).toBeLessThan(2000);
    });

    it('should maintain low memory usage during analysis', () => {
      analyzer.startAnalysis();
      
      // Simulate multiple analysis cycles
      for (let i = 0; i < 100; i++) {
        analyzer._analysisLoop();
      }
      
      // Memory usage should remain reasonable
      const metrics = analyzer.getPerformanceMetrics();
      expect(metrics.memoryUsage).toBeLessThan(100 * 1024 * 1024); // Less than 100MB
    });
  });
});