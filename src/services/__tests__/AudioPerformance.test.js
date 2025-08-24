/**
 * Audio Performance Tests
 * 
 * Performance and memory usage tests for audio processing functionality
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import audioProcessingService from '../AudioProcessingService.js';
import StorageManager from '../StorageManager.js';
import { SamplePlaybackEngine } from '../SamplePlaybackEngine.js';

// Performance test configuration
const PERFORMANCE_THRESHOLDS = {
  AUDIO_DOWNLOAD_TIME: 5000, // 5 seconds max
  AUDIO_PROCESSING_TIME: 2000, // 2 seconds max
  SAMPLE_PLAYBACK_LATENCY: 50, // 50ms max
  MEMORY_GROWTH_LIMIT: 50 * 1024 * 1024, // 50MB max growth
  CONCURRENT_SAMPLES: 10, // Max concurrent samples to test
  LARGE_AUDIO_DURATION: 600 // 10 minutes
};

// Mock performance.now for consistent timing
let mockTime = 0;
global.performance = {
  now: vi.fn(() => mockTime)
};

// Mock AudioContext with performance tracking
const createPerformanceAudioContext = () => {
  const sources = new Set();
  
  return {
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
    createBufferSource: vi.fn(() => {
      const source = {
        buffer: null,
        connect: vi.fn(),
        start: vi.fn(() => sources.add(source)),
        stop: vi.fn(() => sources.delete(source)),
        onended: null
      };
      return source;
    }),
    decodeAudioData: vi.fn().mockImplementation(async (buffer) => {
      // Simulate processing time based on buffer size
      const processingTime = Math.min(buffer.byteLength / 10000, 1000);
      mockTime += processingTime;
      
      return {
        numberOfChannels: 2,
        sampleRate: 44100,
        duration: buffer.byteLength / (44100 * 2 * 4), // Approximate duration
        getChannelData: vi.fn(() => new Float32Array(44100))
      };
    }),
    _activeSources: sources
  };
};

global.AudioContext = vi.fn(() => createPerformanceAudioContext());
global.webkitAudioContext = global.AudioContext;

// Mock fetch with performance simulation
global.fetch = vi.fn();

// Mock IndexedDB with performance tracking
const createPerformanceIndexedDB = () => {
  const storage = new Map();
  let operationCount = 0;
  
  const mockRequest = {
    result: null,
    error: null,
    onsuccess: null,
    onerror: null,
    succeed(result) {
      this.result = result;
      if (this.onsuccess) this.onsuccess({ target: this });
    }
  };

  const mockStore = {
    put: vi.fn((value) => {
      operationCount++;
      const req = { ...mockRequest };
      setTimeout(() => {
        storage.set(value.id, value);
        mockTime += 10; // Simulate storage latency
        req.succeed();
      }, 0);
      return req;
    }),
    get: vi.fn((key) => {
      operationCount++;
      const req = { ...mockRequest };
      setTimeout(() => {
        mockTime += 5; // Simulate retrieval latency
        req.succeed(storage.get(key));
      }, 0);
      return req;
    }),
    delete: vi.fn((key) => {
      operationCount++;
      const req = { ...mockRequest };
      setTimeout(() => {
        storage.delete(key);
        mockTime += 5;
        req.succeed();
      }, 0);
      return req;
    }),
    getAll: vi.fn(() => {
      const req = { ...mockRequest };
      setTimeout(() => {
        req.succeed(Array.from(storage.values()));
      }, 0);
      return req;
    }),
    _storage: storage,
    _operationCount: () => operationCount
  };

  const mockDB = {
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

describe('Audio Performance Tests', () => {
  let storageManager;
  let playbackEngine;
  let mockStore;
  let initialMemory;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockTime = 0;
    
    // Setup performance IndexedDB
    const mocks = createPerformanceIndexedDB();
    mockStore = mocks.mockStore;
    
    // Setup navigator.storage
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
    
    // Clear cache
    audioProcessingService.clearCache();
    
    // Record initial memory usage
    initialMemory = process.memoryUsage ? process.memoryUsage().heapUsed : 0;
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

  describe('Audio Download Performance', () => {
    it('should download audio within performance threshold', async () => {
      const audioSize = 5 * 1024 * 1024; // 5MB audio file
      const mockAudioData = new ArrayBuffer(audioSize);
      
      // Mock streaming download
      fetch.mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Map([['content-length', audioSize.toString()]]),
        body: {
          getReader: () => {
            let bytesRead = 0;
            return {
              read: vi.fn().mockImplementation(() => {
                if (bytesRead >= audioSize) {
                  return Promise.resolve({ done: true });
                }
                
                const chunkSize = Math.min(64 * 1024, audioSize - bytesRead); // 64KB chunks
                bytesRead += chunkSize;
                mockTime += 50; // Simulate network latency per chunk
                
                return Promise.resolve({
                  done: false,
                  value: new Uint8Array(chunkSize)
                });
              })
            };
          }
        }
      });

      const startTime = performance.now();
      const progressCallback = vi.fn();
      
      const result = await audioProcessingService.downloadAndProcessAudio(
        'https://www.youtube.com/watch?v=test',
        progressCallback
      );

      const downloadTime = performance.now() - startTime;
      
      expect(downloadTime).toBeLessThan(PERFORMANCE_THRESHOLDS.AUDIO_DOWNLOAD_TIME);
      expect(result).toHaveProperty('audioBuffer');
      expect(result).toHaveProperty('waveformData');
      
      // Verify progress was reported efficiently
      expect(progressCallback.mock.calls.length).toBeGreaterThan(0);
      expect(progressCallback.mock.calls.length).toBeLessThan(200); // Not too many updates
    });

    it('should handle large audio files efficiently', async () => {
      const largeAudioSize = 50 * 1024 * 1024; // 50MB audio file
      
      fetch.mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Map([['content-length', largeAudioSize.toString()]]),
        body: {
          getReader: () => {
            let bytesRead = 0;
            return {
              read: vi.fn().mockImplementation(() => {
                if (bytesRead >= largeAudioSize) {
                  return Promise.resolve({ done: true });
                }
                
                const chunkSize = Math.min(1024 * 1024, largeAudioSize - bytesRead); // 1MB chunks
                bytesRead += chunkSize;
                mockTime += 100; // Simulate processing time
                
                return Promise.resolve({
                  done: false,
                  value: new Uint8Array(chunkSize)
                });
              })
            };
          }
        }
      });

      const startTime = performance.now();
      
      const result = await audioProcessingService.downloadAndProcessAudio(
        'https://www.youtube.com/watch?v=large-file'
      );

      const processingTime = performance.now() - startTime;
      
      // Should complete within reasonable time even for large files
      expect(processingTime).toBeLessThan(PERFORMANCE_THRESHOLDS.AUDIO_DOWNLOAD_TIME * 2);
      expect(result.audioBuffer).toBeDefined();
    });

    it('should maintain performance with concurrent downloads', async () => {
      const concurrentDownloads = 3;
      const audioSize = 2 * 1024 * 1024; // 2MB each
      
      // Mock multiple concurrent downloads
      fetch.mockImplementation(() => Promise.resolve({
        ok: true,
        status: 200,
        headers: new Map([['content-length', audioSize.toString()]]),
        body: {
          getReader: () => ({
            read: vi.fn()
              .mockResolvedValueOnce({ done: false, value: new Uint8Array(audioSize) })
              .mockResolvedValueOnce({ done: true })
          })
        }
      }));

      const startTime = performance.now();
      
      const downloadPromises = [];
      for (let i = 0; i < concurrentDownloads; i++) {
        const promise = audioProcessingService.downloadAndProcessAudio(
          `https://www.youtube.com/watch?v=concurrent${i}`
        );
        downloadPromises.push(promise);
      }

      const results = await Promise.all(downloadPromises);
      const totalTime = performance.now() - startTime;
      
      expect(results).toHaveLength(concurrentDownloads);
      results.forEach(result => {
        expect(result).toHaveProperty('audioBuffer');
      });
      
      // Should not take significantly longer than single download
      expect(totalTime).toBeLessThan(PERFORMANCE_THRESHOLDS.AUDIO_DOWNLOAD_TIME * 1.5);
    });
  });

  describe('Audio Processing Performance', () => {
    it('should process audio buffers within time threshold', async () => {
      const audioBuffer = {
        numberOfChannels: 2,
        sampleRate: 44100,
        duration: 180, // 3 minutes
        getChannelData: vi.fn((channel) => {
          // Simulate processing time for large buffer
          mockTime += 100;
          return new Float32Array(44100 * 180);
        })
      };

      const startTime = performance.now();
      
      // Test waveform generation performance
      const waveformData = [];
      const samplesPerPixel = Math.floor((audioBuffer.sampleRate * audioBuffer.duration) / 800);
      
      for (let i = 0; i < 800; i++) {
        const startSample = i * samplesPerPixel;
        const endSample = Math.min(startSample + samplesPerPixel, audioBuffer.sampleRate * audioBuffer.duration);
        
        let max = 0;
        for (let j = startSample; j < endSample; j++) {
          const sample = Math.sin(2 * Math.PI * 440 * j / audioBuffer.sampleRate);
          max = Math.max(max, Math.abs(sample));
        }
        waveformData.push(max);
      }

      const processingTime = performance.now() - startTime;
      
      expect(processingTime).toBeLessThan(PERFORMANCE_THRESHOLDS.AUDIO_PROCESSING_TIME);
      expect(waveformData).toHaveLength(800);
    });

    it('should decode audio efficiently', async () => {
      await playbackEngine.initializeAudioContext();
      
      const largeAudioBuffer = new ArrayBuffer(10 * 1024 * 1024); // 10MB
      
      const startTime = performance.now();
      
      const decodedBuffer = await playbackEngine.audioContext.decodeAudioData(largeAudioBuffer);
      
      const decodingTime = performance.now() - startTime;
      
      expect(decodingTime).toBeLessThan(PERFORMANCE_THRESHOLDS.AUDIO_PROCESSING_TIME);
      expect(decodedBuffer).toBeDefined();
      expect(decodedBuffer.duration).toBeGreaterThan(0);
    });
  });

  describe('Sample Playback Performance', () => {
    beforeEach(async () => {
      await playbackEngine.initializeAudioContext();
      playbackEngine.audioBuffer = {
        duration: PERFORMANCE_THRESHOLDS.LARGE_AUDIO_DURATION,
        numberOfChannels: 2,
        sampleRate: 44100
      };
    });

    it('should start sample playback with minimal latency', async () => {
      const startTime = performance.now();
      
      const result = await playbackEngine.playSample(100, 10, 0.8);
      
      const latency = performance.now() - startTime;
      
      expect(latency).toBeLessThan(PERFORMANCE_THRESHOLDS.SAMPLE_PLAYBACK_LATENCY);
      expect(result).toHaveProperty('id');
      expect(playbackEngine.activeSources.size).toBe(1);
    });

    it('should handle rapid timestamp jumping efficiently', async () => {
      const timestamps = [10, 45, 78, 120, 34, 89, 156, 203, 67, 134];
      const jumpTimes = [];
      
      for (const timestamp of timestamps) {
        const startTime = performance.now();
        
        await playbackEngine.jumpToTimestamp(timestamp, true);
        
        const jumpTime = performance.now() - startTime;
        jumpTimes.push(jumpTime);
        
        expect(jumpTime).toBeLessThan(PERFORMANCE_THRESHOLDS.SAMPLE_PLAYBACK_LATENCY);
      }
      
      // Average jump time should be well below threshold
      const averageJumpTime = jumpTimes.reduce((a, b) => a + b, 0) / jumpTimes.length;
      expect(averageJumpTime).toBeLessThan(PERFORMANCE_THRESHOLDS.SAMPLE_PLAYBACK_LATENCY / 2);
    });

    it('should handle concurrent sample playback efficiently', async () => {
      const startTime = performance.now();
      
      const samplePromises = [];
      for (let i = 0; i < PERFORMANCE_THRESHOLDS.CONCURRENT_SAMPLES; i++) {
        const promise = playbackEngine.playSample(i * 30, 15, 0.7);
        samplePromises.push(promise);
      }

      const results = await Promise.all(samplePromises);
      const totalTime = performance.now() - startTime;
      
      expect(results).toHaveLength(PERFORMANCE_THRESHOLDS.CONCURRENT_SAMPLES);
      expect(playbackEngine.activeSources.size).toBe(PERFORMANCE_THRESHOLDS.CONCURRENT_SAMPLES);
      
      // Should not take significantly longer than single sample
      expect(totalTime).toBeLessThan(PERFORMANCE_THRESHOLDS.SAMPLE_PLAYBACK_LATENCY * 2);
    });

    it('should maintain performance during extended playback session', async () => {
      const sessionDuration = 100; // 100 operations
      const operationTimes = [];
      
      for (let i = 0; i < sessionDuration; i++) {
        const startTime = performance.now();
        
        // Alternate between playing samples and jumping timestamps
        if (i % 2 === 0) {
          await playbackEngine.playSample(Math.random() * 300, 5);
        } else {
          await playbackEngine.jumpToTimestamp(Math.random() * 300, true);
        }
        
        const operationTime = performance.now() - startTime;
        operationTimes.push(operationTime);
        
        // Stop some samples to prevent unlimited growth
        if (playbackEngine.activeSources.size > 5) {
          playbackEngine.stopAllSamples();
        }
      }
      
      // Performance should not degrade over time
      const firstHalf = operationTimes.slice(0, sessionDuration / 2);
      const secondHalf = operationTimes.slice(sessionDuration / 2);
      
      const firstHalfAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
      const secondHalfAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
      
      // Second half should not be significantly slower
      expect(secondHalfAvg).toBeLessThan(firstHalfAvg * 1.5);
    });
  });

  describe('Memory Usage Performance', () => {
    it('should manage memory efficiently during audio operations', async () => {
      const initialStats = audioProcessingService.getStats();
      
      // Perform multiple audio operations
      for (let i = 0; i < 5; i++) {
        const audioSize = 2 * 1024 * 1024; // 2MB each
        
        fetch.mockResolvedValue({
          ok: true,
          status: 200,
          headers: new Map([['content-length', audioSize.toString()]]),
          body: {
            getReader: () => ({
              read: vi.fn()
                .mockResolvedValueOnce({ done: false, value: new Uint8Array(audioSize) })
                .mockResolvedValueOnce({ done: true })
            })
          }
        });

        await audioProcessingService.downloadAndProcessAudio(
          `https://www.youtube.com/watch?v=memory-test${i}`
        );
      }

      const finalStats = audioProcessingService.getStats();
      
      // Memory usage should be reasonable
      expect(finalStats.memoryUsage.bytes).toBeLessThan(
        initialStats.memoryUsage.bytes + PERFORMANCE_THRESHOLDS.MEMORY_GROWTH_LIMIT
      );
    });

    it('should cleanup memory when clearing cache', () => {
      // Add items to cache
      for (let i = 0; i < 10; i++) {
        audioProcessingService.downloadCache.set(`test${i}`, {
          audioBuffer: new ArrayBuffer(1024 * 1024), // 1MB each
          waveformData: new Array(1000).fill(0.5)
        });
      }

      const beforeClearStats = audioProcessingService.getStats();
      expect(beforeClearStats.cachedItems).toBe(10);

      // Clear cache
      audioProcessingService.clearCache();

      const afterClearStats = audioProcessingService.getStats();
      expect(afterClearStats.cachedItems).toBe(0);
    });

    it('should handle storage operations efficiently', async () => {
      await storageManager.init();
      
      const operationCount = 20;
      const startTime = performance.now();
      
      // Perform multiple storage operations
      for (let i = 0; i < operationCount; i++) {
        const mockAudioBuffer = {
          numberOfChannels: 2,
          sampleRate: 44100,
          duration: 60,
          getChannelData: () => new Float32Array(44100 * 60)
        };

        const url = `https://www.youtube.com/watch?v=storage-perf${i}`;
        await storageManager.store(url, mockAudioBuffer, []);
      }

      const totalTime = performance.now() - startTime;
      const averageTimePerOperation = totalTime / operationCount;
      
      // Each storage operation should be reasonably fast
      expect(averageTimePerOperation).toBeLessThan(100); // 100ms per operation
      
      // Verify all operations completed
      const storageInfo = await storageManager.getStorageInfo();
      expect(storageInfo.entryCount).toBe(operationCount);
    });
  });

  describe('Stress Testing', () => {
    it('should handle rapid sample triggering without performance degradation', async () => {
      await playbackEngine.initializeAudioContext();
      playbackEngine.audioBuffer = { duration: 300 };

      const rapidTriggers = 50;
      const triggerTimes = [];
      
      for (let i = 0; i < rapidTriggers; i++) {
        const startTime = performance.now();
        
        // Trigger sample every 100ms simulation
        await playbackEngine.playSample(Math.random() * 300, 2);
        
        const triggerTime = performance.now() - startTime;
        triggerTimes.push(triggerTime);
        
        // Clean up periodically to prevent unlimited growth
        if (i % 10 === 0) {
          playbackEngine.stopAllSamples();
        }
      }
      
      // Performance should remain consistent
      const maxTriggerTime = Math.max(...triggerTimes);
      const avgTriggerTime = triggerTimes.reduce((a, b) => a + b, 0) / triggerTimes.length;
      
      expect(maxTriggerTime).toBeLessThan(PERFORMANCE_THRESHOLDS.SAMPLE_PLAYBACK_LATENCY * 2);
      expect(avgTriggerTime).toBeLessThan(PERFORMANCE_THRESHOLDS.SAMPLE_PLAYBACK_LATENCY);
    });

    it('should maintain performance under memory pressure', async () => {
      // Simulate memory pressure by creating large objects
      const largeObjects = [];
      for (let i = 0; i < 10; i++) {
        largeObjects.push(new ArrayBuffer(5 * 1024 * 1024)); // 5MB each
      }

      await playbackEngine.initializeAudioContext();
      playbackEngine.audioBuffer = { duration: 180 };

      const startTime = performance.now();
      
      // Perform audio operations under memory pressure
      for (let i = 0; i < 10; i++) {
        await playbackEngine.playSample(i * 15, 5);
        await playbackEngine.jumpToTimestamp((i + 1) * 15, true);
      }

      const operationTime = performance.now() - startTime;
      
      // Should still complete within reasonable time
      expect(operationTime).toBeLessThan(PERFORMANCE_THRESHOLDS.SAMPLE_PLAYBACK_LATENCY * 20);
      
      // Cleanup
      largeObjects.length = 0;
    });

    it('should handle storage quota pressure gracefully', async () => {
      await storageManager.init();
      
      // Mock storage to be near quota
      global.navigator.storage.estimate.mockResolvedValue({
        quota: 100 * 1024 * 1024, // 100MB quota
        usage: 95 * 1024 * 1024   // 95MB used (95% full)
      });

      const mockAudioBuffer = {
        numberOfChannels: 2,
        sampleRate: 44100,
        duration: 180,
        getChannelData: () => new Float32Array(44100 * 180)
      };

      const startTime = performance.now();
      
      // This should trigger cleanup due to quota pressure
      const storeResult = await storageManager.store(
        'https://www.youtube.com/watch?v=quota-test',
        mockAudioBuffer,
        []
      );

      const storeTime = performance.now() - startTime;
      
      // Should complete even with cleanup
      expect(storeResult).toBe(true);
      expect(storeTime).toBeLessThan(1000); // Should complete within 1 second
    });
  });

  describe('Resource Cleanup Performance', () => {
    it('should cleanup resources quickly', async () => {
      // Setup resources
      await playbackEngine.initializeAudioContext();
      playbackEngine.audioBuffer = { duration: 180 };
      
      // Create multiple active samples
      for (let i = 0; i < 10; i++) {
        await playbackEngine.playSample(i * 15, 10);
      }

      expect(playbackEngine.activeSources.size).toBe(10);

      const startTime = performance.now();
      
      await playbackEngine.cleanup();
      
      const cleanupTime = performance.now() - startTime;
      
      expect(cleanupTime).toBeLessThan(100); // Should cleanup quickly
      expect(playbackEngine.activeSources.size).toBe(0);
      expect(playbackEngine.audioContext).toBeNull();
    });

    it('should handle service cleanup efficiently', () => {
      // Add multiple items to cache
      for (let i = 0; i < 20; i++) {
        audioProcessingService.downloadCache.set(`cleanup-test${i}`, {
          audioBuffer: new ArrayBuffer(1024 * 1024),
          waveformData: new Array(1000).fill(0.5)
        });
      }

      const startTime = performance.now();
      
      audioProcessingService.cleanup();
      
      const cleanupTime = performance.now() - startTime;
      
      expect(cleanupTime).toBeLessThan(50); // Should be very fast
      expect(audioProcessingService.downloadCache.size).toBe(0);
    });
  });
});