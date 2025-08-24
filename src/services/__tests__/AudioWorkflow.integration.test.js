/**
 * Audio Workflow Integration Tests
 * 
 * End-to-end integration tests for the complete audio download and playback workflow
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import audioProcessingService from '../AudioProcessingService.js';
import StorageManager from '../StorageManager.js';
import { SamplePlaybackEngine } from '../SamplePlaybackEngine.js';

// Mock fetch for Firebase function calls
global.fetch = vi.fn();

// Mock AudioContext
const createMockAudioContext = () => ({
  state: 'running',
  currentTime: 0,
  destination: {},
  sampleRate: 44100,
  resume: vi.fn().mockResolvedValue(),
  close: vi.fn().mockResolvedValue(),
  createGain: vi.fn(() => ({
    connect: vi.fn(),
    gain: { value: 1.0 }
  })),
  createBufferSource: vi.fn(() => ({
    buffer: null,
    connect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
    onended: null
  })),
  decodeAudioData: vi.fn().mockResolvedValue({
    numberOfChannels: 2,
    sampleRate: 44100,
    duration: 180,
    getChannelData: vi.fn(() => new Float32Array(44100))
  })
});

global.AudioContext = vi.fn(() => createMockAudioContext());
global.webkitAudioContext = global.AudioContext;

// Mock IndexedDB
const mockIndexedDB = () => {
  const mockRequest = {
    result: null,
    error: null,
    onsuccess: null,
    onerror: null,
    succeed(result) {
      this.result = result;
      if (this.onsuccess) this.onsuccess({ target: this });
    },
    fail(error) {
      this.error = error;
      if (this.onerror) this.onerror({ target: this });
    }
  };

  const mockStore = {
    data: new Map(),
    put: vi.fn(() => {
      const req = { ...mockRequest };
      setTimeout(() => req.succeed(), 0);
      return req;
    }),
    get: vi.fn((key) => {
      const req = { ...mockRequest };
      setTimeout(() => req.succeed(mockStore.data.get(key)), 0);
      return req;
    }),
    delete: vi.fn(() => {
      const req = { ...mockRequest };
      setTimeout(() => req.succeed(), 0);
      return req;
    })
  };

  const mockDB = {
    stores: new Map([['audioCache', mockStore]]),
    transaction: vi.fn(() => ({
      objectStore: vi.fn(() => mockStore)
    })),
    close: vi.fn()
  };

  global.indexedDB = {
    open: vi.fn(() => {
      const req = { ...mockRequest };
      setTimeout(() => {
        if (req.onupgradeneeded) {
          req.onupgradeneeded({ target: { result: mockDB } });
        }
        req.succeed(mockDB);
      }, 0);
      return req;
    })
  };

  return { mockStore, mockDB };
};

describe('Audio Workflow Integration', () => {
  let storageManager;
  let playbackEngine;
  let mockStore;
  let mockDB;

  const mockYouTubeUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
  const mockAudioData = new ArrayBuffer(1000);

  beforeEach(async () => {
    vi.clearAllMocks();
    
    // Setup IndexedDB mocks
    const mocks = mockIndexedDB();
    mockStore = mocks.mockStore;
    mockDB = mocks.mockDB;
    
    // Setup navigator.storage mock
    global.navigator = {
      storage: {
        estimate: vi.fn().mockResolvedValue({
          quota: 1024 * 1024 * 1024,
          usage: 100 * 1024 * 1024
        })
      }
    };

    // Create fresh instances
    const StorageManagerClass = StorageManager.constructor;
    storageManager = new StorageManagerClass();
    playbackEngine = new SamplePlaybackEngine();
    
    // Clear any existing cache
    audioProcessingService.clearCache();
  });

  afterEach(async () => {
    if (storageManager) {
      await storageManager.close();
    }
    if (playbackEngine) {
      await playbackEngine.cleanup();
    }
    audioProcessingService.cleanup();
  });

  describe('Complete Audio Pipeline', () => {
    it('should complete full workflow: download -> store -> load -> play', async () => {
      // Mock successful audio download
      fetch.mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Map([['content-length', '1000']]),
        body: {
          getReader: () => ({
            read: vi.fn()
              .mockResolvedValueOnce({ done: false, value: new Uint8Array(500) })
              .mockResolvedValueOnce({ done: false, value: new Uint8Array(500) })
              .mockResolvedValueOnce({ done: true })
          })
        }
      });

      // Step 1: Download and process audio
      const progressCallback = vi.fn();
      const downloadResult = await audioProcessingService.downloadAndProcessAudio(
        mockYouTubeUrl,
        progressCallback
      );

      expect(downloadResult).toHaveProperty('audioBuffer');
      expect(downloadResult).toHaveProperty('waveformData');
      expect(progressCallback).toHaveBeenCalled();

      // Step 2: Store in temporary storage
      await storageManager.init();
      const storeResult = await storageManager.store(
        mockYouTubeUrl,
        downloadResult.audioBuffer,
        downloadResult.waveformData
      );

      expect(storeResult).toBe(true);

      // Step 3: Load into playback engine
      const audioId = storageManager.generateId(mockYouTubeUrl);
      
      // Mock storage retrieval
      mockStore.data.set(audioId, {
        audioBuffer: mockAudioData,
        waveformData: downloadResult.waveformData,
        metadata: {
          duration: 180,
          sampleRate: 44100,
          numberOfChannels: 2
        }
      });

      await playbackEngine.loadAudioBuffer(audioId);
      expect(playbackEngine.audioBuffer).toBeDefined();

      // Step 4: Play sample
      const sampleResult = await playbackEngine.playSample(10, 5, 0.8);
      
      expect(sampleResult).toHaveProperty('id');
      expect(sampleResult.startTime).toBe(10);
      expect(sampleResult.duration).toBe(5);
      expect(sampleResult.volume).toBe(0.8);
    });

    it('should handle cached audio efficiently', async () => {
      // First download
      fetch.mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Map([['content-length', '1000']]),
        body: {
          getReader: () => ({
            read: vi.fn()
              .mockResolvedValueOnce({ done: false, value: new Uint8Array(1000) })
              .mockResolvedValueOnce({ done: true })
          })
        }
      });

      await audioProcessingService.downloadAndProcessAudio(mockYouTubeUrl);
      
      // Second request should use cache
      const cachedResult = audioProcessingService.getAudioBuffer(mockYouTubeUrl);
      expect(cachedResult).toBeDefined();
      expect(audioProcessingService.isCached(mockYouTubeUrl)).toBe(true);
      
      // Fetch should only be called once
      expect(fetch).toHaveBeenCalledTimes(1);
    });

    it('should handle multiple concurrent samples', async () => {
      // Setup audio buffer
      await playbackEngine.initializeAudioContext();
      playbackEngine.audioBuffer = {
        duration: 180,
        numberOfChannels: 2,
        sampleRate: 44100
      };

      // Play multiple overlapping samples
      const samples = [];
      for (let i = 0; i < 3; i++) {
        const sample = await playbackEngine.playSample(i * 30, 10, 0.7);
        samples.push(sample);
      }

      expect(samples).toHaveLength(3);
      expect(playbackEngine.activeSources.size).toBe(3);

      // Each sample should have unique properties
      samples.forEach((sample, index) => {
        expect(sample.startTime).toBe(index * 30);
        expect(sample.duration).toBe(10);
        expect(sample.volume).toBe(0.7);
      });
    });

    it('should handle seamless timestamp jumping', async () => {
      await playbackEngine.initializeAudioContext();
      playbackEngine.audioBuffer = { duration: 180 };

      // Start playback at timestamp 10
      await playbackEngine.playSample(10, 20);
      expect(playbackEngine.activeSources.size).toBe(1);

      // Jump to timestamp 50 with continued playback
      const jumpResult = await playbackEngine.jumpToTimestamp(50, true);
      
      expect(jumpResult.startTime).toBe(50);
      expect(playbackEngine.activeSources.size).toBe(1); // Old stopped, new started
    });
  });

  describe('Error Recovery Scenarios', () => {
    it('should retry failed downloads', async () => {
      // Mock fetch to fail twice then succeed
      fetch
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          headers: new Map([['content-length', '1000']]),
          body: {
            getReader: () => ({
              read: vi.fn()
                .mockResolvedValueOnce({ done: false, value: new Uint8Array(1000) })
                .mockResolvedValueOnce({ done: true })
            })
          }
        });

      const progressCallback = vi.fn();
      const result = await audioProcessingService.downloadAndProcessAudio(
        mockYouTubeUrl,
        progressCallback
      );

      expect(result).toBeDefined();
      expect(fetch).toHaveBeenCalledTimes(3);
      
      // Should have retry progress updates
      const retryCalls = progressCallback.mock.calls.filter(
        call => call[0].status === 'retrying'
      );
      expect(retryCalls.length).toBeGreaterThan(0);
    });

    it('should handle storage failures gracefully', async () => {
      await storageManager.init();
      
      // Mock storage to fail
      mockStore.put.mockImplementation(() => {
        const req = { onsuccess: null, onerror: null };
        setTimeout(() => {
          if (req.onerror) req.onerror({ target: { error: new Error('Storage failed') } });
        }, 0);
        return req;
      });

      const mockAudioBuffer = {
        numberOfChannels: 2,
        sampleRate: 44100,
        duration: 10,
        getChannelData: () => new Float32Array(44100)
      };

      await expect(
        storageManager.store(mockYouTubeUrl, mockAudioBuffer, [])
      ).rejects.toThrow();
    });

    it('should handle playback engine errors', async () => {
      await playbackEngine.initializeAudioContext();
      
      // Try to play without audio buffer
      await expect(playbackEngine.playSample(10)).rejects.toThrow('No audio buffer loaded');
      
      // Load buffer and try invalid timestamp
      playbackEngine.audioBuffer = { duration: 180 };
      await expect(playbackEngine.playSample(-10)).rejects.toThrow('Invalid start time');
      await expect(playbackEngine.playSample(200)).rejects.toThrow('Invalid start time');
    });

    it('should recover from AudioContext suspension', async () => {
      const mockContext = createMockAudioContext();
      mockContext.state = 'suspended';
      global.AudioContext.mockReturnValue(mockContext);

      await playbackEngine.initializeAudioContext();
      
      expect(mockContext.resume).toHaveBeenCalled();
      expect(playbackEngine.isInitialized).toBe(true);
    });
  });

  describe('Performance and Memory Management', () => {
    it('should manage memory efficiently during multiple operations', async () => {
      const initialStats = audioProcessingService.getStats();
      
      // Perform multiple downloads
      for (let i = 0; i < 3; i++) {
        const url = `https://www.youtube.com/watch?v=test${i}`;
        
        fetch.mockResolvedValue({
          ok: true,
          status: 200,
          headers: new Map([['content-length', '1000']]),
          body: {
            getReader: () => ({
              read: vi.fn()
                .mockResolvedValueOnce({ done: false, value: new Uint8Array(1000) })
                .mockResolvedValueOnce({ done: true })
            })
          }
        });

        await audioProcessingService.downloadAndProcessAudio(url);
      }

      const finalStats = audioProcessingService.getStats();
      expect(finalStats.cachedItems).toBeGreaterThan(initialStats.cachedItems);
    });

    it('should cleanup resources properly', async () => {
      // Setup resources
      await playbackEngine.initializeAudioContext();
      playbackEngine.audioBuffer = { duration: 180 };
      
      await playbackEngine.playSample(10, 5);
      await playbackEngine.playSample(20, 5);
      
      expect(playbackEngine.activeSources.size).toBe(2);
      
      // Cleanup
      await playbackEngine.cleanup();
      
      expect(playbackEngine.activeSources.size).toBe(0);
      expect(playbackEngine.audioContext).toBeNull();
      expect(playbackEngine.isInitialized).toBe(false);
    });

    it('should handle storage quota management', async () => {
      await storageManager.init();
      
      // Mock storage info to indicate near quota
      const originalGetStorageInfo = storageManager.getStorageInfo;
      storageManager.getStorageInfo = vi.fn().mockResolvedValue({
        totalSize: storageManager.config.maxStorageSize * 0.9,
        entryCount: 10
      });

      const cleanupSpy = vi.spyOn(storageManager, 'cleanup');

      const mockAudioBuffer = {
        numberOfChannels: 2,
        sampleRate: 44100,
        duration: 10,
        getChannelData: () => new Float32Array(44100)
      };

      await storageManager.store(mockYouTubeUrl, mockAudioBuffer, []);
      
      expect(cleanupSpy).toHaveBeenCalled();
      
      // Restore original method
      storageManager.getStorageInfo = originalGetStorageInfo;
    });
  });

  describe('Real-world Scenarios', () => {
    it('should handle rapid timestamp changes (MPC-style workflow)', async () => {
      await playbackEngine.initializeAudioContext();
      playbackEngine.audioBuffer = { duration: 180 };

      const timestamps = [10, 45, 78, 120, 34, 89];
      
      // Simulate rapid pad presses
      for (const timestamp of timestamps) {
        await playbackEngine.jumpToTimestamp(timestamp, true);
        
        // Should always have exactly one active sample
        expect(playbackEngine.activeSources.size).toBe(1);
        
        const activeSamples = playbackEngine.getActiveSamples();
        expect(activeSamples[0].startTime).toBe(timestamp);
      }
    });

    it('should handle network interruptions during download', async () => {
      // Mock network interruption
      fetch.mockRejectedValue(new Error('Network interrupted'));

      const progressCallback = vi.fn();
      
      await expect(
        audioProcessingService.downloadAndProcessAudio(mockYouTubeUrl, progressCallback)
      ).rejects.toThrow();

      // Should have error progress updates
      const errorCalls = progressCallback.mock.calls.filter(
        call => call[0].status === 'error'
      );
      expect(errorCalls.length).toBeGreaterThan(0);
    });

    it('should maintain audio quality through the pipeline', async () => {
      // Mock high-quality audio data
      const highQualityBuffer = {
        numberOfChannels: 2,
        sampleRate: 48000, // High sample rate
        duration: 180,
        getChannelData: (channel) => {
          const data = new Float32Array(48000 * 180); // 3 minutes at 48kHz
          // Generate test signal
          for (let i = 0; i < data.length; i++) {
            data[i] = Math.sin(2 * Math.PI * 440 * i / 48000) * 0.5;
          }
          return data;
        }
      };

      await storageManager.init();
      
      // Store high-quality audio
      const storeResult = await storageManager.store(
        mockYouTubeUrl,
        highQualityBuffer,
        []
      );
      
      expect(storeResult).toBe(true);

      // Verify metadata preservation
      const audioId = storageManager.generateId(mockYouTubeUrl);
      const stored = mockStore.data.get(audioId);
      
      expect(stored.metadata.sampleRate).toBe(48000);
      expect(stored.metadata.numberOfChannels).toBe(2);
      expect(stored.metadata.duration).toBe(180);
    });

    it('should handle browser tab switching and AudioContext suspension', async () => {
      const mockContext = createMockAudioContext();
      global.AudioContext.mockReturnValue(mockContext);
      
      await playbackEngine.initializeAudioContext();
      
      // Simulate tab switch (AudioContext suspension)
      mockContext.state = 'suspended';
      
      // Next operation should resume context
      await playbackEngine.initializeAudioContext();
      
      expect(mockContext.resume).toHaveBeenCalled();
    });
  });

  describe('Service Integration', () => {
    it('should integrate AudioProcessingService with StorageManager', async () => {
      // Download audio
      fetch.mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Map([['content-length', '1000']]),
        body: {
          getReader: () => ({
            read: vi.fn()
              .mockResolvedValueOnce({ done: false, value: new Uint8Array(1000) })
              .mockResolvedValueOnce({ done: true })
          })
        }
      });

      const downloadResult = await audioProcessingService.downloadAndProcessAudio(mockYouTubeUrl);
      
      // Store using StorageManager
      await storageManager.init();
      const storeResult = await storageManager.store(
        mockYouTubeUrl,
        downloadResult.audioBuffer,
        downloadResult.waveformData
      );

      expect(storeResult).toBe(true);
      
      // Verify integration
      const hasStored = await storageManager.has(mockYouTubeUrl);
      expect(hasStored).toBe(true);
    });

    it('should integrate StorageManager with SamplePlaybackEngine', async () => {
      await storageManager.init();
      await playbackEngine.initializeAudioContext();

      const audioId = storageManager.generateId(mockYouTubeUrl);
      
      // Mock stored audio data
      mockStore.data.set(audioId, {
        audioBuffer: mockAudioData,
        waveformData: [0.1, 0.2, 0.3],
        metadata: {
          duration: 180,
          sampleRate: 44100,
          numberOfChannels: 2
        }
      });

      // Load from storage into playback engine
      await playbackEngine.loadAudioBuffer(audioId);
      
      expect(playbackEngine.audioBuffer).toBeDefined();
      
      // Play sample
      const sampleResult = await playbackEngine.playSample(30, 10);
      expect(sampleResult.startTime).toBe(30);
    });
  });
});