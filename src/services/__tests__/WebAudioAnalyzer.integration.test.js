/**
 * Integration tests for WebAudioAnalyzer
 * Tests integration with existing YouTube sampler system
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { WebAudioAnalyzer } from '../WebAudioAnalyzer.js';

// Mock Web Audio API for integration tests
const mockAudioContext = {
  state: 'running',
  sampleRate: 44100,
  currentTime: 0,
  resume: vi.fn().mockResolvedValue(undefined),
  close: vi.fn().mockResolvedValue(undefined),
  createAnalyser: vi.fn(),
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

const mockOscillator = {
  connect: vi.fn(),
  disconnect: vi.fn(),
  start: vi.fn(),
  frequency: { setValueAtTime: vi.fn() }
};

const mockGainNode = {
  connect: vi.fn(),
  disconnect: vi.fn(),
  gain: { setValueAtTime: vi.fn() }
};

// Mock globals
global.AudioContext = vi.fn(() => mockAudioContext);
global.requestAnimationFrame = vi.fn((callback) => setTimeout(callback, 16));
global.performance = { now: vi.fn(() => Date.now()) };

describe('WebAudioAnalyzer Integration Tests', () => {
  let analyzer;

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockAudioContext.createAnalyser.mockReturnValue(mockAnalyserNode);
    mockAudioContext.createOscillator.mockReturnValue(mockOscillator);
    mockAudioContext.createGain.mockReturnValue(mockGainNode);
    
    analyzer = new WebAudioAnalyzer({
      sampleRate: 44100,
      fftSize: 2048
    });
  });

  afterEach(() => {
    if (analyzer) {
      analyzer.dispose();
    }
  });

  describe('YouTube Player Integration', () => {
    it('should integrate with YouTube player workflow', async () => {
      // Mock YouTube player similar to existing system
      const mockYouTubePlayer = {
        getIframe: vi.fn(() => ({
          contentWindow: {},
          src: 'https://www.youtube.com/embed/test'
        })),
        getCurrentTime: vi.fn(() => 45.5),
        getDuration: vi.fn(() => 180),
        getPlayerState: vi.fn(() => 1) // Playing
      };

      await analyzer.initialize();
      
      // Should handle YouTube connection gracefully
      const connected = await analyzer.connectToYouTubeStream(mockYouTubePlayer);
      expect(connected).toBe(true);
      
      // Should be able to start analysis
      analyzer.startAnalysis();
      expect(analyzer.isAnalyzing).toBe(true);
      
      // Should provide real-time data
      const frequencyData = analyzer.getFrequencyData();
      const amplitudeData = analyzer.getAmplitudeData();
      
      expect(frequencyData).toBeTruthy();
      expect(amplitudeData).toBeTruthy();
      expect(frequencyData.sampleRate).toBe(44100);
    });

    it('should generate waveform data compatible with existing chop system', async () => {
      await analyzer.initialize();
      await analyzer.connectToYouTubeStream({ getIframe: () => null });

      // Mock amplitude data for consistent waveform
      mockAnalyserNode.getByteTimeDomainData.mockImplementation((array) => {
        for (let i = 0; i < array.length; i++) {
          array[i] = 128 + Math.sin(i * 0.01) * 50; // Sine wave pattern
        }
      });

      const waveformData = await analyzer.generateProgressiveWaveform(2, 1000);
      
      // Verify waveform data structure matches expected format
      expect(waveformData).toEqual({
        samples: expect.any(Float32Array),
        sampleRate: 1000,
        duration: 2,
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

      // Verify samples are normalized (-1 to 1 range)
      const samples = Array.from(waveformData.samples);
      const minSample = Math.min(...samples);
      const maxSample = Math.max(...samples);
      
      expect(minSample).toBeGreaterThanOrEqual(-1);
      expect(maxSample).toBeLessThanOrEqual(1);
    });
  });

  describe('Chop Creation Integration', () => {
    it('should provide timing data suitable for chop boundaries', async () => {
      await analyzer.initialize();
      await analyzer.connectToYouTubeStream({ getIframe: () => null });

      let analysisData = null;
      
      analyzer.onAnalysisUpdate((data) => {
        analysisData = data;
      });

      analyzer.startAnalysis();
      
      // Wait for at least one analysis update
      await new Promise(resolve => {
        const checkData = () => {
          if (analysisData) {
            resolve();
          } else {
            setTimeout(checkData, 10);
          }
        };
        checkData();
      });

      analyzer.stopAnalysis();

      // Verify analysis data provides timing information
      expect(analysisData).toBeTruthy();
      expect(analysisData.timestamp).toBeTypeOf('number');
      expect(analysisData.frequency).toBeTruthy();
      expect(analysisData.amplitude).toBeTruthy();

      // Verify frequency data can be used for zero-crossing detection
      const amplitudeData = analysisData.amplitude.data;
      expect(amplitudeData).toBeInstanceOf(Uint8Array);
      expect(amplitudeData.length).toBeGreaterThan(0);
    });

    it('should support real-time chop preview during analysis', async () => {
      await analyzer.initialize();
      await analyzer.connectToYouTubeStream({ getIframe: () => null });

      const analysisUpdates = [];
      const maxUpdates = 5;

      analyzer.onAnalysisUpdate((data) => {
        if (analysisUpdates.length < maxUpdates) {
          analysisUpdates.push({
            timestamp: data.timestamp,
            averageAmplitude: analyzer._calculateAverageAmplitude(data.amplitude.data)
          });
        }
      });

      analyzer.startAnalysis();

      // Wait for analysis updates
      await new Promise(resolve => {
        const checkUpdates = () => {
          if (analysisUpdates.length >= maxUpdates) {
            analyzer.stopAnalysis();
            resolve();
          } else {
            setTimeout(checkUpdates, 20);
          }
        };
        checkUpdates();
      });

      // Verify we got continuous updates suitable for real-time preview
      expect(analysisUpdates.length).toBe(maxUpdates);
      
      // Verify timestamps are increasing (real-time progression)
      for (let i = 1; i < analysisUpdates.length; i++) {
        expect(analysisUpdates[i].timestamp).toBeGreaterThanOrEqual(
          analysisUpdates[i - 1].timestamp
        );
      }

      // Verify amplitude data is available for visualization
      analysisUpdates.forEach(update => {
        expect(update.averageAmplitude).toBeTypeOf('number');
        expect(update.averageAmplitude).toBeGreaterThanOrEqual(0);
        expect(update.averageAmplitude).toBeLessThanOrEqual(255);
      });
    });
  });

  describe('Performance Integration', () => {
    it('should maintain performance standards during extended analysis', async () => {
      await analyzer.initialize();
      await analyzer.connectToYouTubeStream({ getIframe: () => null });

      const startTime = Date.now();
      let updateCount = 0;
      const targetUpdates = 30; // ~0.5 seconds at 60fps

      analyzer.onAnalysisUpdate(() => {
        updateCount++;
        if (updateCount >= targetUpdates) {
          analyzer.stopAnalysis();
        }
      });

      analyzer.startAnalysis();

      // Wait for analysis to complete
      await new Promise(resolve => {
        const checkComplete = () => {
          if (!analyzer.isAnalyzing) {
            resolve();
          } else {
            setTimeout(checkComplete, 10);
          }
        };
        checkComplete();
      });

      const totalTime = Date.now() - startTime;
      const metrics = analyzer.getPerformanceMetrics();

      // Verify performance meets requirements
      expect(updateCount).toBe(targetUpdates);
      expect(totalTime).toBeLessThan(2000); // Should complete within 2 seconds
      expect(metrics.averageAnalysisTime).toBeLessThan(16); // Less than one frame at 60fps
      expect(metrics.droppedFrames).toBeLessThan(5); // Minimal dropped frames
    });

    it('should handle memory efficiently during waveform generation', async () => {
      await analyzer.initialize();
      await analyzer.connectToYouTubeStream({ getIframe: () => null });

      // Generate multiple smaller waveforms to test memory handling
      const waveforms = [];
      const waveformCount = 2;
      const waveformDuration = 0.5; // 0.5 seconds each
      const sampleRate = 200; // Lower sample rate for faster testing

      for (let i = 0; i < waveformCount; i++) {
        const waveform = await analyzer.generateProgressiveWaveform(waveformDuration, sampleRate);
        waveforms.push(waveform);
        
        // Verify each waveform is generated correctly
        expect(waveform.samples.length).toBe(waveformDuration * sampleRate);
        expect(waveform.duration).toBe(waveformDuration);
      }

      // Verify all waveforms are independent
      expect(waveforms.length).toBe(waveformCount);
      
      // Check that waveforms have different data (not sharing references)
      if (waveforms.length > 1) {
        expect(waveforms[0].samples).not.toBe(waveforms[1].samples);
      }
    }, 10000); // 10 second timeout
  });

  describe('Error Recovery Integration', () => {
    it('should recover gracefully from analysis interruptions', async () => {
      await analyzer.initialize();
      await analyzer.connectToYouTubeStream({ getIframe: () => null });

      let errorCount = 0;
      let successCount = 0;
      let callCount = 0;

      // Add callback that throws errors on specific calls
      analyzer.onAnalysisUpdate(() => {
        callCount++;
        if (callCount === 2 || callCount === 4) { // Throw errors on specific calls
          errorCount++;
          throw new Error('Simulated analysis error');
        } else {
          successCount++;
        }
      });

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      analyzer.startAnalysis();

      // Let it run until we get enough calls
      await new Promise(resolve => {
        const checkCalls = () => {
          if (callCount >= 6) {
            analyzer.stopAnalysis();
            resolve();
          } else {
            setTimeout(checkCalls, 20);
          }
        };
        checkCalls();
      });

      // Verify system continued despite errors
      expect(successCount).toBeGreaterThan(0);
      expect(errorCount).toBeGreaterThan(0);
      expect(consoleSpy).toHaveBeenCalled();

      // Verify analyzer is still functional after errors
      expect(analyzer.audioContext.state).not.toBe('closed');
      
      consoleSpy.mockRestore();
    });

    it('should handle connection failures and provide fallback', async () => {
      await analyzer.initialize();

      // Mock all connection methods to fail
      mockAudioContext.createOscillator.mockImplementation(() => {
        throw new Error('All connection methods failed');
      });

      const failingPlayer = {
        getIframe: () => {
          throw new Error('Connection failed');
        }
      };

      // Should throw when all connection methods fail
      await expect(analyzer.connectToYouTubeStream(failingPlayer))
        .rejects.toThrow('YouTube audio connection failed');

      // Analyzer should still be in a valid state
      expect(analyzer.audioContext).toBeTruthy();
      expect(analyzer.analyserNode).toBeTruthy();
    });
  });

  describe('Data Format Compatibility', () => {
    it('should produce waveform data compatible with existing visualization', async () => {
      await analyzer.initialize();
      await analyzer.connectToYouTubeStream({ getIframe: () => null });

      const waveform = await analyzer.generateProgressiveWaveform(1, 100);

      // Verify data format matches expected structure for visualization components
      expect(waveform).toHaveProperty('samples');
      expect(waveform).toHaveProperty('sampleRate');
      expect(waveform).toHaveProperty('duration');
      expect(waveform).toHaveProperty('channels');
      expect(waveform).toHaveProperty('metadata');

      // Verify metadata contains required information
      expect(waveform.metadata).toHaveProperty('analysisMethod');
      expect(waveform.metadata).toHaveProperty('quality');
      expect(waveform.metadata).toHaveProperty('generatedAt');
      expect(waveform.metadata).toHaveProperty('sourceInfo');

      // Verify samples are in correct format
      expect(waveform.samples).toBeInstanceOf(Float32Array);
      expect(waveform.samples.length).toBe(waveform.sampleRate * waveform.duration);
    });

    it('should provide frequency data suitable for visualization enhancements', async () => {
      await analyzer.initialize();
      await analyzer.connectToYouTubeStream({ getIframe: () => null });

      analyzer.startAnalysis();

      const frequencyData = analyzer.getFrequencyData();
      
      // Verify frequency data structure
      expect(frequencyData).toHaveProperty('data');
      expect(frequencyData).toHaveProperty('sampleRate');
      expect(frequencyData).toHaveProperty('bufferLength');
      expect(frequencyData).toHaveProperty('nyquistFrequency');

      // Verify data types and ranges
      expect(frequencyData.data).toBeInstanceOf(Uint8Array);
      expect(frequencyData.sampleRate).toBe(44100);
      expect(frequencyData.nyquistFrequency).toBe(22050);
      expect(frequencyData.bufferLength).toBe(1024); // fftSize / 2

      analyzer.stopAnalysis();
    });
  });
});