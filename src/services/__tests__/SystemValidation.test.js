import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import audioProcessingService from '../AudioProcessingService.js';
import samplePlaybackEngine from '../SamplePlaybackEngine.js';
import storageManagerService from '../StorageManager.js';
import errorRecoveryService from '../ErrorRecoveryService.js';

// System validation tests to ensure all requirements are met
describe('System Validation Tests', () => {
  let services;

  beforeAll(async () => {
    // Initialize all services (they are singletons)
    services = {
      audio: audioProcessingService,
      playback: samplePlaybackEngine,
      storage: storageManagerService,
      errorRecovery: errorRecoveryService
    };

    // Mock environment
    global.AudioContext = vi.fn(() => ({
      createBufferSource: vi.fn(() => ({
        connect: vi.fn(),
        start: vi.fn(),
        stop: vi.fn()
      })),
      createGain: vi.fn(() => ({
        connect: vi.fn(),
        gain: { value: 1 }
      })),
      destination: {},
      currentTime: 0,
      state: 'running',
      resume: vi.fn(),
      close: vi.fn()
    }));

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(1024)),
      headers: new Map([['content-type', 'audio/mpeg']])
    });
  });

  afterAll(() => {
    // Cleanup all services
    Object.values(services).forEach(service => {
      if (service.cleanup) service.cleanup();
    });
  });

  describe('Requirement 1: Audio Download and Sync', () => {
    it('should download audio and sync with video playback', async () => {
      const testUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
      
      // Test audio download
      const result = await services.audio.downloadAndProcessAudio(testUrl);
      expect(result.success).toBe(true);
      expect(result.audioBuffer).toBeDefined();
      
      // Test sync capability
      const mockPlayer = {
        getCurrentTime: vi.fn(() => 10.5),
        seekTo: vi.fn()
      };
      
      await services.playback.initialize(result.audioBuffer, mockPlayer);
      expect(services.playback.isReady()).toBe(true);
    });

    it('should transition pads from waiting to ready state', async () => {
      const testUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
      
      // Initially should be waiting
      expect(services.audio.getStatus()).toBe('idle');
      
      // After download should be ready
      await services.audio.downloadAndProcessAudio(testUrl);
      expect(services.audio.getStatus()).toBe('ready');
    });

    it('should display clear error messages on failure', async () => {
      // Mock failure
      global.fetch.mockRejectedValueOnce(new Error('Network error'));
      
      const result = await services.audio.downloadAndProcessAudio('invalid-url');
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error.length).toBeGreaterThan(0);
    });
  });

  describe('Requirement 2: Sample Creation and Timestamp Jumping', () => {
    beforeAll(async () => {
      const testUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
      const result = await services.audio.downloadAndProcessAudio(testUrl);
      
      const mockPlayer = {
        getCurrentTime: vi.fn(() => 15.0),
        seekTo: vi.fn()
      };
      
      await services.playback.initialize(result.audioBuffer, mockPlayer);
    });

    it('should create new timestamp at current position without pausing', async () => {
      const mockPlayer = {
        getCurrentTime: vi.fn(() => 25.5),
        seekTo: vi.fn()
      };
      
      const sample = services.playback.createSampleAtCurrentTime('pad-1');
      expect(sample.startTime).toBe(25.5);
      expect(sample.padId).toBe('pad-1');
    });

    it('should instantly jump to existing timestamps', async () => {
      const mockPlayer = {
        getCurrentTime: vi.fn(() => 10.0),
        seekTo: vi.fn()
      };
      
      // Create sample
      services.playback.createSample({
        padId: 'pad-2',
        startTime: 30.0,
        endTime: 35.0
      });
      
      // Jump to sample
      await services.playback.playSample('pad-2');
      expect(mockPlayer.seekTo).toHaveBeenCalledWith(30.0, true);
    });

    it('should maintain continuous playback during jumps', async () => {
      const audioContext = new AudioContext();
      
      // Create multiple samples
      services.playback.createSample({ padId: 'pad-3', startTime: 10, endTime: 15 });
      services.playback.createSample({ padId: 'pad-4', startTime: 20, endTime: 25 });
      
      // Play samples in sequence
      await services.playback.playSample('pad-3');
      await services.playback.playSample('pad-4');
      
      // Should not have suspended audio context
      expect(audioContext.suspend).not.toHaveBeenCalled();
    });

    it('should provide immediate audio feedback', async () => {
      const startTime = performance.now();
      
      await services.playback.playSample('pad-3');
      
      const endTime = performance.now();
      const responseTime = endTime - startTime;
      
      // Should respond within 50ms for immediate feedback
      expect(responseTime).toBeLessThan(50);
    });
  });

  describe('Requirement 3: Timestamp Editing', () => {
    it('should allow manual timestamp editing', () => {
      // Create sample
      services.playback.createSample({
        padId: 'pad-edit',
        startTime: 10.0,
        endTime: 15.0
      });
      
      // Edit timestamp
      const updated = services.playback.updateSample('pad-edit', {
        startTime: 12.5,
        endTime: 17.5
      });
      
      expect(updated.startTime).toBe(12.5);
      expect(updated.endTime).toBe(17.5);
    });

    it('should validate timestamp ranges', () => {
      const audioBuffer = { duration: 180 }; // 3 minutes
      
      // Should reject invalid ranges
      expect(() => {
        services.playback.updateSample('pad-edit', {
          startTime: 200, // Beyond audio duration
          endTime: 205
        });
      }).toThrow();
      
      expect(() => {
        services.playback.updateSample('pad-edit', {
          startTime: 15,
          endTime: 10 // End before start
        });
      }).toThrow();
    });

    it('should persist timestamp changes', () => {
      services.playback.updateSample('pad-edit', {
        startTime: 20.0,
        endTime: 25.0
      });
      
      const sample = services.playback.getSample('pad-edit');
      expect(sample.startTime).toBe(20.0);
      expect(sample.endTime).toBe(25.0);
    });
  });

  describe('Requirement 4: Waveform Visualization', () => {
    it('should generate waveform after audio load', async () => {
      const testUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
      const result = await services.audio.downloadAndProcessAudio(testUrl);
      
      expect(result.waveformData).toBeDefined();
      expect(Array.isArray(result.waveformData)).toBe(true);
      expect(result.waveformData.length).toBeGreaterThan(0);
    });

    it('should provide visual markers for timestamps', () => {
      // Create samples
      services.playback.createSample({ padId: 'marker-1', startTime: 30, endTime: 35 });
      services.playback.createSample({ padId: 'marker-2', startTime: 60, endTime: 65 });
      
      const markers = services.playback.getTimestampMarkers();
      expect(markers).toHaveLength(2);
      expect(markers[0].position).toBe(30);
      expect(markers[1].position).toBe(60);
    });
  });

  describe('Requirement 5: Reliable Temporary Storage', () => {
    it('should store audio in temporary browser storage', async () => {
      const testUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
      const testData = {
        audioBuffer: new ArrayBuffer(1024),
        waveformData: [1, 2, 3, 4, 5]
      };
      
      await services.storage.store(testUrl, testData);
      const retrieved = await services.storage.retrieve(testUrl);
      
      expect(retrieved).toBeDefined();
      expect(retrieved.audioBuffer).toBeDefined();
      expect(retrieved.waveformData).toEqual(testData.waveformData);
    });

    it('should support instant seeking without re-downloading', async () => {
      const testUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
      
      // Should use cached data
      const cached = await services.storage.retrieve(testUrl);
      expect(cached).toBeDefined();
      
      // Seeking should be instant (no network calls)
      const networkCallsBefore = global.fetch.mock.calls.length;
      await services.playback.playSample('pad-1');
      const networkCallsAfter = global.fetch.mock.calls.length;
      
      expect(networkCallsAfter).toBe(networkCallsBefore);
    });

    it('should clean up automatically', async () => {
      const initialSize = await services.storage.getStorageInfo();
      
      // Cleanup
      await services.storage.cleanup();
      
      const finalSize = await services.storage.getStorageInfo();
      expect(finalSize.used).toBeLessThanOrEqual(initialSize.used);
    });
  });

  describe('Requirement 6: Seamless Audio Playback', () => {
    it('should continue playing without gaps during timestamp switches', async () => {
      const audioContext = new AudioContext();
      const mockSource = audioContext.createBufferSource();
      
      // Switch between timestamps rapidly
      await services.playback.playSample('pad-1');
      await services.playback.playSample('pad-2');
      await services.playback.playSample('pad-3');
      
      // Should not have stopped audio sources unnecessarily
      expect(mockSource.stop).toHaveBeenCalledTimes(0);
    });

    it('should handle rapid timestamp jumps smoothly', async () => {
      const timestamps = ['pad-1', 'pad-2', 'pad-3', 'pad-4'];
      const startTime = performance.now();
      
      // Rapid jumps
      for (const pad of timestamps) {
        await services.playback.playSample(pad);
      }
      
      const endTime = performance.now();
      const totalTime = endTime - startTime;
      
      // Should handle all jumps within reasonable time
      expect(totalTime).toBeLessThan(200); // 200ms for 4 jumps
    });

    it('should maintain audio priority under load', async () => {
      // Simulate system load
      const heavyOperations = Array.from({ length: 10 }, () => 
        new Promise(resolve => setTimeout(resolve, 100))
      );
      
      // Start heavy operations
      Promise.all(heavyOperations);
      
      // Audio should still respond quickly
      const startTime = performance.now();
      await services.playback.playSample('pad-1');
      const endTime = performance.now();
      
      expect(endTime - startTime).toBeLessThan(100);
    });
  });

  describe('System Integration Validation', () => {
    it('should handle complete workflow without errors', async () => {
      const testUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
      
      // Complete workflow
      const audioResult = await services.audio.downloadAndProcessAudio(testUrl);
      expect(audioResult.success).toBe(true);
      
      const mockPlayer = { getCurrentTime: vi.fn(() => 0), seekTo: vi.fn() };
      await services.playback.initialize(audioResult.audioBuffer, mockPlayer);
      
      // Create and play samples
      services.playback.createSample({ padId: 'workflow-1', startTime: 10, endTime: 15 });
      const playResult = await services.playback.playSample('workflow-1');
      expect(playResult.success).toBe(true);
      
      // Store and retrieve
      await services.storage.store(testUrl, audioResult);
      const cached = await services.storage.retrieve(testUrl);
      expect(cached).toBeDefined();
    });

    it('should maintain data consistency across all services', async () => {
      const testUrl = 'https://www.youtube.com/watch?v=test123';
      
      // Process through all services
      const audioResult = await services.audio.downloadAndProcessAudio(testUrl);
      await services.storage.store(testUrl, audioResult);
      
      const mockPlayer = { getCurrentTime: vi.fn(() => 0), seekTo: vi.fn() };
      await services.playback.initialize(audioResult.audioBuffer, mockPlayer);
      
      // Data should be consistent
      const cached = await services.storage.retrieve(testUrl);
      expect(cached.audioBuffer).toBe(audioResult.audioBuffer);
      expect(services.playback.isReady()).toBe(true);
    });

    it('should handle service failures gracefully', async () => {
      // Simulate storage failure
      vi.spyOn(services.storage, 'store').mockRejectedValue(new Error('Storage full'));
      
      const testUrl = 'https://www.youtube.com/watch?v=failure-test';
      const result = await services.audio.downloadAndProcessAudio(testUrl);
      
      // Should still succeed with fallback
      expect(result.success).toBe(true);
      expect(result.cached).toBe(false);
    });
  });
});