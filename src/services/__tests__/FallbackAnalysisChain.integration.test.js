/**
 * Integration tests for FallbackAnalysisChain
 * Tests the complete fallback workflow and analyzer coordination
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { FallbackAnalysisChain } from '../FallbackAnalysisChain.js';

// Mock the individual analyzers
vi.mock('../VideoFrameAnalyzer.js', () => ({
  VideoFrameAnalyzer: vi.fn().mockImplementation(() => ({
    initialize: vi.fn(),
    analyzeVideo: vi.fn(),
    dispose: vi.fn()
  }))
}));

vi.mock('../MetadataAnalyzer.js', () => ({
  MetadataAnalyzer: vi.fn().mockImplementation(() => ({
    analyzeMetadata: vi.fn(),
    dispose: vi.fn()
  }))
}));

vi.mock('../ProceduralGenerator.js', () => ({
  ProceduralGenerator: vi.fn().mockImplementation(() => ({
    generateWaveform: vi.fn(),
    dispose: vi.fn()
  }))
}));

describe('FallbackAnalysisChain Integration', () => {
  let analysisChain;
  let mockVideoElement;
  let mockMetadata;

  beforeEach(() => {
    analysisChain = new FallbackAnalysisChain({
      sampleRate: 44100,
      timeoutMs: 5000,
      retryAttempts: 2
    });

    mockVideoElement = {
      tagName: 'VIDEO',
      duration: 180,
      currentTime: 0,
      readyState: 4
    };

    mockMetadata = {
      title: 'Test Song - Electronic Dance Music',
      description: 'A great EDM track with 128 BPM',
      duration: 180
    };
  });

  afterEach(() => {
    analysisChain.dispose();
    vi.clearAllMocks();
  });

  describe('Method Selection', () => {
    it('should prioritize video frame analysis when video element is available', () => {
      const methods = analysisChain.determineAnalysisMethods(mockVideoElement, mockMetadata);
      
      expect(methods).toHaveLength(3);
      expect(methods[0].name).toBe('video-frame');
      expect(methods[0].priority).toBe(1);
      expect(methods[1].name).toBe('metadata');
      expect(methods[2].name).toBe('procedural');
    });

    it('should skip video analysis when no video element is provided', () => {
      const methods = analysisChain.determineAnalysisMethods(null, mockMetadata);
      
      expect(methods).toHaveLength(2);
      expect(methods[0].name).toBe('metadata');
      expect(methods[1].name).toBe('procedural');
    });

    it('should only use procedural generation when no metadata is available', () => {
      const methods = analysisChain.determineAnalysisMethods(null, {});
      
      expect(methods).toHaveLength(1);
      expect(methods[0].name).toBe('procedural');
    });
  });

  describe('Successful Analysis Chain', () => {
    it('should return result from first successful method', async () => {
      const expectedResult = {
        samples: new Float32Array(1000),
        sampleRate: 44100,
        duration: 180,
        channels: 1,
        metadata: {
          analysisMethod: 'video-frame',
          quality: 'medium',
          generatedAt: Date.now()
        }
      };

      // Mock video analyzer to succeed
      analysisChain.analyzers.video.initialize.mockResolvedValue();
      analysisChain.analyzers.video.analyzeVideo.mockResolvedValue(expectedResult);

      const result = await analysisChain.analyzeWithFallback(
        mockVideoElement,
        mockMetadata
      );

      expect(result).toEqual(expectedResult);
      expect(analysisChain.analyzers.video.initialize).toHaveBeenCalledWith(mockVideoElement);
      expect(analysisChain.analyzers.video.analyzeVideo).toHaveBeenCalled();
      
      // Should not call other analyzers
      expect(analysisChain.analyzers.metadata.analyzeMetadata).not.toHaveBeenCalled();
      expect(analysisChain.analyzers.procedural.generateWaveform).not.toHaveBeenCalled();
    });

    it('should fallback to metadata analysis when video analysis fails', async () => {
      const expectedResult = {
        samples: new Float32Array(1000),
        sampleRate: 44100,
        duration: 180,
        channels: 1,
        metadata: {
          analysisMethod: 'metadata',
          quality: 'low',
          generatedAt: Date.now()
        }
      };

      // Mock video analyzer to fail
      analysisChain.analyzers.video.initialize.mockRejectedValue(new Error('Video analysis failed'));
      
      // Mock metadata analyzer to succeed
      analysisChain.analyzers.metadata.analyzeMetadata.mockResolvedValue(expectedResult);

      const result = await analysisChain.analyzeWithFallback(
        mockVideoElement,
        mockMetadata
      );

      expect(result).toEqual(expectedResult);
      expect(analysisChain.analyzers.metadata.analyzeMetadata).toHaveBeenCalledWith(
        mockMetadata,
        undefined
      );
    });

    it('should fallback to procedural generation as last resort', async () => {
      const expectedResult = {
        samples: new Float32Array(1000),
        sampleRate: 44100,
        duration: 180,
        channels: 1,
        metadata: {
          analysisMethod: 'procedural',
          quality: 'low',
          generatedAt: Date.now()
        }
      };

      // Mock all analyzers to fail except procedural
      analysisChain.analyzers.video.initialize.mockRejectedValue(new Error('Video failed'));
      analysisChain.analyzers.metadata.analyzeMetadata.mockRejectedValue(new Error('Metadata failed'));
      analysisChain.analyzers.procedural.generateWaveform.mockResolvedValue(expectedResult);

      const result = await analysisChain.analyzeWithFallback(
        mockVideoElement,
        mockMetadata
      );

      expect(result).toEqual(expectedResult);
      expect(analysisChain.analyzers.procedural.generateWaveform).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should throw error when all methods fail', async () => {
      // Mock all analyzers to fail
      analysisChain.analyzers.video.initialize.mockRejectedValue(new Error('Video failed'));
      analysisChain.analyzers.metadata.analyzeMetadata.mockRejectedValue(new Error('Metadata failed'));
      analysisChain.analyzers.procedural.generateWaveform.mockRejectedValue(new Error('Procedural failed'));

      await expect(
        analysisChain.analyzeWithFallback(mockVideoElement, mockMetadata)
      ).rejects.toThrow('All analysis methods failed');
    });

    it('should retry failed methods according to retry settings', async () => {
      const error = new Error('Temporary failure');
      
      // Mock video analyzer to fail twice then succeed
      analysisChain.analyzers.video.initialize
        .mockRejectedValueOnce(error)
        .mockRejectedValueOnce(error)
        .mockResolvedValue();
      
      analysisChain.analyzers.video.analyzeVideo.mockResolvedValue({
        samples: new Float32Array(1000),
        sampleRate: 44100,
        duration: 180,
        channels: 1,
        metadata: { analysisMethod: 'video-frame', quality: 'medium' }
      });

      // Mock other analyzers to succeed as fallback
      analysisChain.analyzers.metadata.analyzeMetadata.mockResolvedValue({
        samples: new Float32Array(1000),
        sampleRate: 44100,
        duration: 180,
        channels: 1,
        metadata: { analysisMethod: 'metadata', quality: 'low' }
      });

      const result = await analysisChain.analyzeWithFallback(
        mockVideoElement,
        mockMetadata
      );

      expect(result).toBeDefined();
      expect(analysisChain.analyzers.video.initialize).toHaveBeenCalledTimes(2);
    });

    it('should handle timeout correctly', async () => {
      // Create chain with very short timeout
      const shortTimeoutChain = new FallbackAnalysisChain({
        timeoutMs: 100,
        retryAttempts: 1
      });

      // Mock analyzer to take longer than timeout
      shortTimeoutChain.analyzers.video.initialize.mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 200))
      );

      // Mock other analyzers to also timeout/fail
      shortTimeoutChain.analyzers.metadata.analyzeMetadata.mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 200))
      );
      
      shortTimeoutChain.analyzers.procedural.generateWaveform.mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 200))
      );

      await expect(
        shortTimeoutChain.analyzeWithFallback(mockVideoElement, mockMetadata)
      ).rejects.toThrow('timed out');

      shortTimeoutChain.dispose();
    });
  });

  describe('Progress Reporting', () => {
    it('should call progress callback during analysis', async () => {
      const progressCallback = vi.fn();
      const methodChangeCallback = vi.fn();

      analysisChain.analyzers.video.initialize.mockResolvedValue();
      analysisChain.analyzers.video.analyzeVideo.mockImplementation(
        async (duration, onProgress) => {
          if (onProgress) {
            onProgress(0.5);
            onProgress(1.0);
          }
          return {
            samples: new Float32Array(1000),
            sampleRate: 44100,
            duration: 180,
            channels: 1,
            metadata: { analysisMethod: 'video-frame', quality: 'medium' }
          };
        }
      );

      await analysisChain.analyzeWithFallback(
        mockVideoElement,
        mockMetadata,
        progressCallback,
        methodChangeCallback
      );

      expect(progressCallback).toHaveBeenCalledWith(0.5);
      expect(progressCallback).toHaveBeenCalledWith(1.0);
      expect(methodChangeCallback).toHaveBeenCalledWith('video-frame', 'medium');
    });

    it('should report method changes during fallback', async () => {
      const methodChangeCallback = vi.fn();

      // Mock video to fail, metadata to succeed
      analysisChain.analyzers.video.initialize.mockRejectedValue(new Error('Video failed'));
      analysisChain.analyzers.metadata.analyzeMetadata.mockResolvedValue({
        samples: new Float32Array(1000),
        sampleRate: 44100,
        duration: 180,
        channels: 1,
        metadata: { analysisMethod: 'metadata', quality: 'low' }
      });

      await analysisChain.analyzeWithFallback(
        mockVideoElement,
        mockMetadata,
        undefined,
        methodChangeCallback
      );

      expect(methodChangeCallback).toHaveBeenCalledWith('video-frame', 'medium');
      expect(methodChangeCallback).toHaveBeenCalledWith('metadata', 'low');
    });
  });

  describe('Analysis Statistics', () => {
    it('should track analysis attempts and success rates', async () => {
      // Perform some successful and failed analyses
      analysisChain.analyzers.video.initialize.mockResolvedValue();
      analysisChain.analyzers.video.analyzeVideo.mockResolvedValue({
        samples: new Float32Array(1000),
        sampleRate: 44100,
        duration: 180,
        channels: 1,
        metadata: { analysisMethod: 'video-frame', quality: 'medium' }
      });

      // Successful analysis
      await analysisChain.analyzeWithFallback(mockVideoElement, mockMetadata);

      // Failed analysis
      analysisChain.analyzers.video.initialize.mockRejectedValue(new Error('Failed'));
      analysisChain.analyzers.metadata.analyzeMetadata.mockRejectedValue(new Error('Failed'));
      analysisChain.analyzers.procedural.generateWaveform.mockRejectedValue(new Error('Failed'));

      try {
        await analysisChain.analyzeWithFallback(mockVideoElement, mockMetadata);
      } catch (error) {
        // Expected to fail
      }

      const stats = analysisChain.getAnalysisStats();
      
      expect(stats.totalAttempts).toBeGreaterThan(0);
      expect(stats.successfulAttempts).toBe(1);
      expect(stats.methodStats).toBeDefined();
      expect(stats.successRate).toBeGreaterThan(0);
    });

    it('should identify most reliable method', async () => {
      // Simulate multiple successful video analyses
      analysisChain.analyzers.video.initialize.mockResolvedValue();
      analysisChain.analyzers.video.analyzeVideo.mockResolvedValue({
        samples: new Float32Array(1000),
        sampleRate: 44100,
        duration: 180,
        channels: 1,
        metadata: { analysisMethod: 'video-frame', quality: 'medium' }
      });

      // Perform multiple successful analyses
      for (let i = 0; i < 5; i++) {
        await analysisChain.analyzeWithFallback(mockVideoElement, mockMetadata);
      }

      const reliableMethod = analysisChain.getMostReliableMethod();
      
      expect(reliableMethod.method).toBe('video-frame');
      expect(reliableMethod.successRate).toBe(1.0);
    });
  });

  describe('Testing All Methods', () => {
    it('should test all available methods and return results', async () => {
      // Mock all analyzers with different outcomes
      analysisChain.analyzers.video.initialize.mockResolvedValue();
      analysisChain.analyzers.video.analyzeVideo.mockResolvedValue({
        samples: new Float32Array(1000),
        sampleRate: 44100,
        duration: 180,
        channels: 1,
        metadata: { analysisMethod: 'video-frame', quality: 'medium' }
      });

      analysisChain.analyzers.metadata.analyzeMetadata.mockRejectedValue(
        new Error('Metadata failed')
      );

      analysisChain.analyzers.procedural.generateWaveform.mockResolvedValue({
        samples: new Float32Array(1000),
        sampleRate: 44100,
        duration: 180,
        channels: 1,
        metadata: { analysisMethod: 'procedural', quality: 'low' }
      });

      const results = await analysisChain.testAllMethods(mockVideoElement, mockMetadata);

      expect(results['video-frame'].success).toBe(true);
      expect(results['video-frame'].quality).toBe('medium');
      expect(results['metadata'].success).toBe(false);
      expect(results['metadata'].error).toBe('Metadata failed');
      expect(results['procedural'].success).toBe(true);
      expect(results['procedural'].quality).toBe('low');
    });
  });

  describe('Resource Management', () => {
    it('should dispose all analyzers when disposed', () => {
      analysisChain.dispose();

      expect(analysisChain.analyzers.video.dispose).toHaveBeenCalled();
      expect(analysisChain.analyzers.metadata.dispose).toHaveBeenCalled();
      expect(analysisChain.analyzers.procedural.dispose).toHaveBeenCalled();
    });
  });

  describe('Procedural Options Extraction', () => {
    it('should extract BPM from metadata', () => {
      const metadata = {
        title: 'Dance Track 128 BPM',
        description: 'High energy electronic music'
      };

      const options = analysisChain.extractProceduralOptions(metadata);
      expect(options.bpm).toBe(128);
    });

    it('should extract key and mode from metadata', () => {
      const metadata = {
        title: 'Song in C Major',
        description: 'Beautiful melody'
      };

      const options = analysisChain.extractProceduralOptions(metadata);
      expect(options.key).toBe('C');
      expect(options.mode).toBe('major');
    });

    it('should determine complexity based on metadata richness', () => {
      const richMetadata = {
        title: 'Very Long Title With Lots Of Information About The Song',
        description: 'This is a very detailed description that contains a lot of information about the song, its style, instruments, and production details.'
      };

      const simpleMetadata = {
        title: 'Song',
        description: 'Music'
      };

      const richOptions = analysisChain.extractProceduralOptions(richMetadata);
      const simpleOptions = analysisChain.extractProceduralOptions(simpleMetadata);

      expect(richOptions.complexity).toBe(0.8);
      expect(simpleOptions.complexity).toBe(0.5);
    });
  });
});