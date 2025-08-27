/**
 * @fileoverview Tests for sample preloading system
 * Tests the enhanced SampleManager preloading functionality and error handling
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SampleManager } from '../SampleManager.js';
import { SamplePlaybackEngine } from '../../SamplePlaybackEngine.js';

// Mock SamplePlaybackEngine
const mockSamplePlaybackEngine = {
  initializeAudioContext: vi.fn().mockResolvedValue(true),
  preloadSample: vi.fn().mockResolvedValue(true),
  playSampleAtTime: vi.fn().mockResolvedValue({
    id: 'test-sample',
    startTime: 0,
    duration: 0.5,
    volume: 1.0
  }),
  audioContext: {
    currentTime: 0,
    state: 'running'
  }
};

describe('Sample Preloading System', () => {
  let sampleManager;

  beforeEach(async () => {
    sampleManager = new SampleManager();
    sampleManager.initialize(mockSamplePlaybackEngine);
    
    // Reset mocks
    mockSamplePlaybackEngine.preloadSample.mockClear();
    mockSamplePlaybackEngine.preloadSample.mockResolvedValue(true);
  });

  afterEach(() => {
    sampleManager.destroy();
  });

  describe('Enhanced Preloading', () => {
    it('should preload samples with progress tracking', async () => {
      // Load some test samples first
      await sampleManager.loadSamplePack('test-pack');
      
      // Clear the mock calls from loadSamplePack
      mockSamplePlaybackEngine.preloadSample.mockClear();
      
      const progressCallback = vi.fn();
      const sampleIds = ['kick_001', 'snare_001', 'hihat_001'];
      
      const results = await sampleManager.preloadSamples(sampleIds, progressCallback);
      
      // Should track progress
      expect(progressCallback).toHaveBeenCalledTimes(3);
      expect(progressCallback).toHaveBeenCalledWith(1, 3);
      expect(progressCallback).toHaveBeenCalledWith(2, 3);
      expect(progressCallback).toHaveBeenCalledWith(3, 3);
      
      // Should return results
      expect(results).toEqual({
        total: 3,
        successful: 3,
        failed: 0,
        errors: []
      });
      
      // Should call preloadSample for each sample (since they weren't preloaded yet)
      expect(mockSamplePlaybackEngine.preloadSample).toHaveBeenCalledTimes(3);
    });

    it('should handle preloading failures with fallbacks', async () => {
      // Load some test samples first
      await sampleManager.loadSamplePack('test-pack');
      
      // Mock one sample to fail
      mockSamplePlaybackEngine.preloadSample
        .mockResolvedValueOnce(true)  // kick_001 succeeds
        .mockRejectedValueOnce(new Error('Network error'))  // snare_001 fails
        .mockResolvedValueOnce(true); // hihat_001 succeeds
      
      const sampleIds = ['kick_001', 'snare_001', 'hihat_001'];
      const results = await sampleManager.preloadSamples(sampleIds);
      
      expect(results).toEqual({
        total: 3,
        successful: 2,
        failed: 1,
        errors: [
          { sampleId: 'snare_001', error: 'Network error' }
        ]
      });
      
      // Should have created a fallback sample
      const fallbackSample = sampleManager.getSample('snare_001_fallback');
      expect(fallbackSample).toBeTruthy();
      expect(fallbackSample.metadata.isFallback).toBe(true);
    });

    it('should preload all samples in pack', async () => {
      // Load test samples first
      await sampleManager.loadSamplePack('test-pack');
      
      const progressCallback = vi.fn();
      const results = await sampleManager.preloadAllSamples(progressCallback);
      
      // Should preload all 8 default samples
      expect(results.total).toBe(8);
      expect(results.successful).toBe(8);
      expect(progressCallback).toHaveBeenCalledTimes(8);
    });

    it('should skip already preloaded samples', async () => {
      // Load and preload samples first
      await sampleManager.loadSamplePack('test-pack');
      await sampleManager.preloadSamples(['kick_001']);
      
      // Clear mock calls
      mockSamplePlaybackEngine.preloadSample.mockClear();
      
      // Try to preload the same sample again
      const results = await sampleManager.preloadSamples(['kick_001']);
      
      expect(results.successful).toBe(1);
      expect(mockSamplePlaybackEngine.preloadSample).not.toHaveBeenCalled();
    });
  });

  describe('Loading State Management', () => {
    it('should track loading state during preloading', async () => {
      await sampleManager.loadSamplePack('test-pack');
      
      expect(sampleManager.isLoadingSamples()).toBe(false);
      
      const preloadPromise = sampleManager.preloadAllSamples();
      expect(sampleManager.isLoadingSamples()).toBe(true);
      
      await preloadPromise;
      expect(sampleManager.isLoadingSamples()).toBe(false);
    });

    it('should provide accurate loading progress', async () => {
      await sampleManager.loadSamplePack('test-pack');
      
      let progress = sampleManager.getLoadingProgress();
      expect(progress.percentage).toBe(0);
      
      await sampleManager.preloadSamples(['kick_001', 'snare_001']);
      
      progress = sampleManager.getLoadingProgress();
      expect(progress.loaded).toBe(2);
      expect(progress.percentage).toBeGreaterThan(0);
    });

    it('should provide preloading statistics', async () => {
      await sampleManager.loadSamplePack('test-pack');
      
      // Mock one failure to create a fallback
      mockSamplePlaybackEngine.preloadSample
        .mockResolvedValueOnce(true)
        .mockRejectedValueOnce(new Error('Failed'));
      
      await sampleManager.preloadSamples(['kick_001', 'snare_001']);
      
      const stats = sampleManager.getPreloadingStats();
      expect(stats.total).toBeGreaterThan(0);
      expect(stats.preloaded).toBe(2); // kick_001 + snare_001_fallback
      expect(stats.fallbacks).toBe(1);
      expect(stats.percentage).toBeGreaterThan(0);
    });
  });

  describe('Fallback System', () => {
    it('should create fallback samples for failed loads', async () => {
      await sampleManager.loadSamplePack('test-pack');
      
      // Mock failure
      mockSamplePlaybackEngine.preloadSample.mockRejectedValue(new Error('Load failed'));
      
      await sampleManager.preloadSamples(['kick_001']);
      
      // Should have created fallback
      const fallback = sampleManager.getSample('kick_001_fallback');
      expect(fallback).toBeTruthy();
      expect(fallback.metadata.isFallback).toBe(true);
      expect(fallback.metadata.duration).toBe(0.1);
    });

    it('should create silent audio buffers for fallbacks', () => {
      const silentBuffer = sampleManager.createSilentAudioBuffer();
      
      expect(silentBuffer.sampleRate).toBe(44100);
      expect(silentBuffer.duration).toBe(0.1);
      expect(silentBuffer.numberOfChannels).toBe(1);
      
      const channelData = silentBuffer.getChannelData(0);
      expect(channelData).toBeInstanceOf(Float32Array);
      expect(channelData.length).toBe(4410);
      
      // Should be all zeros (silence)
      expect(channelData.every(sample => sample === 0)).toBe(true);
    });

    it('should handle fallback creation errors gracefully', async () => {
      await sampleManager.loadSamplePack('test-pack');
      
      // Mock both preload and fallback creation to fail
      mockSamplePlaybackEngine.preloadSample.mockRejectedValue(new Error('Load failed'));
      
      // Mock createSilentAudioBuffer to throw
      const originalMethod = sampleManager.createSilentAudioBuffer;
      sampleManager.createSilentAudioBuffer = vi.fn().mockImplementation(() => {
        throw new Error('Fallback creation failed');
      });
      
      // Should not throw, but handle gracefully
      const results = await sampleManager.preloadSamples(['kick_001']);
      
      expect(results.failed).toBe(1);
      expect(results.errors).toHaveLength(1);
      
      // Restore original method
      sampleManager.createSilentAudioBuffer = originalMethod;
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid sample lists', async () => {
      await expect(sampleManager.preloadSamples(null)).rejects.toThrow('Sample list must be an array');
      await expect(sampleManager.preloadSamples('not-array')).rejects.toThrow('Sample list must be an array');
    });

    it('should handle missing samples gracefully', async () => {
      const results = await sampleManager.preloadSamples(['nonexistent_sample']);
      
      expect(results.failed).toBe(1);
      expect(results.errors[0].sampleId).toBe('nonexistent_sample');
    });

    it('should handle SamplePlaybackEngine errors', async () => {
      await sampleManager.loadSamplePack('test-pack');
      
      mockSamplePlaybackEngine.preloadSample.mockRejectedValue(new Error('Engine error'));
      
      const results = await sampleManager.preloadSamples(['kick_001']);
      
      expect(results.failed).toBe(1);
      expect(results.errors[0].error).toBe('Engine error');
    });

    it('should reset loading state on error', async () => {
      await sampleManager.loadSamplePack('test-pack');
      
      mockSamplePlaybackEngine.preloadSample.mockRejectedValue(new Error('Critical error'));
      
      try {
        await sampleManager.preloadSamples(['kick_001']);
      } catch (error) {
        // Expected to not throw, but if it does, loading should still be false
      }
      
      expect(sampleManager.isLoadingSamples()).toBe(false);
    });
  });

  describe('Performance', () => {
    it('should handle large sample lists efficiently', async () => {
      await sampleManager.loadSamplePack('test-pack');
      
      // Create a large list of sample IDs (some valid, some invalid)
      const largeSampleList = [];
      for (let i = 0; i < 100; i++) {
        largeSampleList.push(i < 8 ? `kick_00${i % 8 + 1}` : `invalid_${i}`);
      }
      
      const startTime = performance.now();
      const results = await sampleManager.preloadSamples(largeSampleList.slice(0, 10));
      const endTime = performance.now();
      
      // Should complete reasonably quickly (less than 1 second for 10 samples)
      expect(endTime - startTime).toBeLessThan(1000);
      
      expect(results.total).toBe(10);
      expect(results.successful + results.failed).toBe(10);
    });

    it('should provide progress updates at reasonable intervals', async () => {
      await sampleManager.loadSamplePack('test-pack');
      
      const progressCallback = vi.fn();
      await sampleManager.preloadAllSamples(progressCallback);
      
      // Should call progress callback for each sample
      expect(progressCallback).toHaveBeenCalledTimes(8);
      
      // Should provide incremental progress
      const calls = progressCallback.mock.calls;
      for (let i = 0; i < calls.length; i++) {
        expect(calls[i][0]).toBe(i + 1); // loaded count
        expect(calls[i][1]).toBe(8);     // total count
      }
    });
  });
});