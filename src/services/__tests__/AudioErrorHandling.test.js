/**
 * Audio Error Handling and Recovery Tests
 * 
 * Comprehensive tests for error scenarios and recovery mechanisms
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import audioProcessingService from '../AudioProcessingService.js';
import StorageManager from '../StorageManager.js';
import { SamplePlaybackEngine } from '../SamplePlaybackEngine.js';

// Mock AudioContext with error scenarios
const createErrorProneAudioContext = () => ({
  state: 'running',
  currentTime: 0,
  destination: {},
  sampleRate: 44100,
  resume: vi.fn(),
  close: vi.fn(),
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
  decodeAudioData: vi.fn()
});

global.AudioContext = vi.fn(() => createErrorProneAudioContext());
global.webkitAudioContext = global.AudioContext;

// Mock fetch for network error scenarios
global.fetch = vi.fn();

// Mock IndexedDB with error scenarios
const createErrorProneIndexedDB = () => {
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
    put: vi.fn(),
    get: vi.fn(),
    delete: vi.fn(),
    clear: vi.fn(),
    getAll: vi.fn()
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
      setTimeout(() => req.succeed(mockDB), 0);
      return req;
    })
  };

  return { mockStore, mockDB, mockRequest };
};

describe('Audio Error Handling and Recovery', () => {
  let storageManager;
  let playbackEngine;
  let mockStore;
  let mockDB;
  let mockRequest;

  beforeEach(async () => {
    vi.clearAllMocks();
    
    // Setup error-prone mocks
    const mocks = createErrorProneIndexedDB();
    mockStore = mocks.mockStore;
    mockDB = mocks.mockDB;
    mockRequest = mocks.mockRequest;
    
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

  describe('Network Error Scenarios', () => {
    it('should handle network timeout errors', async () => {
      fetch.mockRejectedValue(new Error('Network timeout'));

      const progressCallback = vi.fn();
      
      await expect(
        audioProcessingService.downloadAndProcessAudio(
          'https://www.youtube.com/watch?v=timeout-test',
          progressCallback
        )
      ).rejects.toThrow();

      // Should report error in progress
      const errorCalls = progressCallback.mock.calls.filter(
        call => call[0].status === 'error'
      );
      expect(errorCalls.length).toBeGreaterThan(0);
    });

    it('should retry on transient network errors', async () => {
      // Mock to fail twice then succeed
      fetch
        .mockRejectedValueOnce(new Error('Connection reset'))
        .mockRejectedValueOnce(new Error('Temporary failure'))
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
        'https://www.youtube.com/watch?v=retry-test',
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

    it('should handle HTTP error responses', async () => {
      fetch.mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found'
      });

      await expect(
        audioProcessingService.downloadAndProcessAudio(
          'https://www.youtube.com/watch?v=not-found'
        )
      ).rejects.toThrow('HTTP error: 404');
    });

    it('should handle malformed response data', async () => {
      fetch.mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Map([['content-length', '1000']]),
        body: {
          getReader: () => ({
            read: vi.fn().mockRejectedValue(new Error('Malformed data'))
          })
        }
      });

      await expect(
        audioProcessingService.downloadAndProcessAudio(
          'https://www.youtube.com/watch?v=malformed'
        )
      ).rejects.toThrow();
    });

    it('should handle stream interruption', async () => {
      fetch.mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Map([['content-length', '2000']]),
        body: {
          getReader: () => ({
            read: vi.fn()
              .mockResolvedValueOnce({ done: false, value: new Uint8Array(1000) })
              .mockRejectedValueOnce(new Error('Stream interrupted'))
          })
        }
      });

      await expect(
        audioProcessingService.downloadAndProcessAudio(
          'https://www.youtube.com/watch?v=interrupted'
        )
      ).rejects.toThrow();
    });
  });

  describe('AudioContext Error Scenarios', () => {
    it('should handle AudioContext creation failure', async () => {
      global.AudioContext = vi.fn(() => {
        throw new Error('AudioContext not supported');
      });

      await expect(playbackEngine.initializeAudioContext()).rejects.toThrow(
        'AudioContext initialization failed'
      );
    });

    it('should handle AudioContext suspension errors', async () => {
      const mockContext = createErrorProneAudioContext();
      mockContext.state = 'suspended';
      mockContext.resume.mockRejectedValue(new Error('Resume failed'));
      
      global.AudioContext.mockReturnValue(mockContext);
      
      await expect(playbackEngine.initializeAudioContext()).rejects.toThrow();
    });

    it('should handle audio decoding errors', async () => {
      await playbackEngine.initializeAudioContext();
      
      playbackEngine.audioContext.decodeAudioData.mockRejectedValue(
        new Error('Invalid audio format')
      );

      const invalidAudioBuffer = new ArrayBuffer(100);
      
      await expect(
        playbackEngine.loadAudioBuffer('test-id', invalidAudioBuffer)
      ).rejects.toThrow('Audio buffer loading failed');
    });

    it('should handle corrupted audio data', async () => {
      await playbackEngine.initializeAudioContext();
      
      playbackEngine.audioContext.decodeAudioData.mockRejectedValue(
        new DOMException('The buffer passed to decodeAudioData contains an unknown content type.', 'NotSupportedError')
      );

      const corruptedBuffer = new ArrayBuffer(1000);
      
      await expect(
        playbackEngine.loadAudioBuffer('test-id', corruptedBuffer)
      ).rejects.toThrow();
    });

    it('should handle AudioContext state changes during playback', async () => {
      await playbackEngine.initializeAudioContext();
      playbackEngine.audioBuffer = { duration: 180 };

      // Start playback
      await playbackEngine.playSample(10, 5);
      
      // Simulate context interruption
      playbackEngine.audioContext.state = 'interrupted';
      
      // Should handle gracefully
      const status = playbackEngine.getStatus();
      expect(status.audioContextState).toBe('interrupted');
    });
  });

  describe('Storage Error Scenarios', () => {
    beforeEach(async () => {
      await storageManager.init();
    });

    it('should handle IndexedDB initialization failure', async () => {
      global.indexedDB.open = vi.fn(() => {
        const req = { ...mockRequest };
        setTimeout(() => req.fail(new Error('IndexedDB not available')), 0);
        return req;
      });

      const newStorageManager = new (StorageManager.constructor)();
      
      await expect(newStorageManager.init()).rejects.toThrow(
        'IndexedDB initialization failed'
      );
    });

    it('should handle storage quota exceeded errors', async () => {
      mockStore.put.mockImplementation(() => {
        const req = { ...mockRequest };
        setTimeout(() => {
          const error = new Error('Quota exceeded');
          error.name = 'QuotaExceededError';
          req.fail(error);
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
        storageManager.store('https://www.youtube.com/watch?v=quota-test', mockAudioBuffer, [])
      ).rejects.toThrow('Storage failed');
    });

    it('should handle database corruption', async () => {
      mockStore.get.mockImplementation(() => {
        const req = { ...mockRequest };
        setTimeout(() => req.fail(new Error('Database corrupted')), 0);
        return req;
      });

      const result = await storageManager.retrieve('https://www.youtube.com/watch?v=corrupted');
      expect(result).toBeNull();
    });

    it('should handle transaction failures', async () => {
      mockDB.transaction.mockImplementation(() => {
        throw new Error('Transaction failed');
      });

      const mockAudioBuffer = {
        numberOfChannels: 2,
        sampleRate: 44100,
        duration: 10,
        getChannelData: () => new Float32Array(44100)
      };

      await expect(
        storageManager.store('https://www.youtube.com/watch?v=transaction-fail', mockAudioBuffer, [])
      ).rejects.toThrow();
    });

    it('should handle storage cleanup failures', async () => {
      mockStore.delete.mockImplementation(() => {
        const req = { ...mockRequest };
        setTimeout(() => req.fail(new Error('Delete failed')), 0);
        return req;
      });

      const result = await storageManager.remove('https://www.youtube.com/watch?v=delete-fail');
      expect(result).toBe(false);
    });
  });

  describe('Sample Playback Error Scenarios', () => {
    beforeEach(async () => {
      await playbackEngine.initializeAudioContext();
      playbackEngine.audioBuffer = { duration: 180 };
    });

    it('should handle invalid sample parameters', async () => {
      // Invalid start time
      await expect(playbackEngine.playSample(-10)).rejects.toThrow('Invalid start time');
      await expect(playbackEngine.playSample(200)).rejects.toThrow('Invalid start time');
      
      // Invalid timestamp for jumping
      await expect(playbackEngine.jumpToTimestamp(-5)).rejects.toThrow('Invalid timestamp');
      await expect(playbackEngine.jumpToTimestamp(300)).rejects.toThrow('Invalid timestamp');
    });

    it('should handle audio source creation failures', async () => {
      playbackEngine.audioContext.createBufferSource.mockImplementation(() => {
        throw new Error('Cannot create buffer source');
      });

      await expect(playbackEngine.playSample(10, 5)).rejects.toThrow(
        'Sample playback failed'
      );
    });

    it('should handle audio source start failures', async () => {
      const mockSource = {
        buffer: null,
        connect: vi.fn(),
        start: vi.fn(() => {
          throw new Error('Start failed');
        }),
        stop: vi.fn(),
        onended: null
      };

      playbackEngine.audioContext.createBufferSource.mockReturnValue(mockSource);

      await expect(playbackEngine.playSample(10, 5)).rejects.toThrow();
    });

    it('should handle gain node failures', async () => {
      playbackEngine.audioContext.createGain.mockImplementation(() => {
        throw new Error('Cannot create gain node');
      });

      await expect(playbackEngine.playSample(10, 5)).rejects.toThrow();
    });

    it('should handle sample stop failures gracefully', async () => {
      const result = await playbackEngine.playSample(10, 5);
      const sample = playbackEngine.activeSources.get(result.id);
      
      // Mock stop to throw error
      sample.source.stop = vi.fn(() => {
        throw new Error('Stop failed');
      });

      const stopped = playbackEngine.stopSample(result.id);
      expect(stopped).toBe(false);
    });
  });

  describe('Memory and Resource Error Scenarios', () => {
    it('should handle out of memory errors during audio processing', async () => {
      // Mock large audio buffer that would cause memory issues
      const mockLargeBuffer = {
        numberOfChannels: 2,
        sampleRate: 44100,
        duration: 3600, // 1 hour
        getChannelData: vi.fn(() => {
          throw new Error('Out of memory');
        })
      };

      await expect(() => {
        storageManager.serializeAudioBuffer(mockLargeBuffer);
      }).toThrow();
    });

    it('should handle resource cleanup failures', async () => {
      await playbackEngine.initializeAudioContext();
      
      // Mock close to fail
      playbackEngine.audioContext.close.mockRejectedValue(new Error('Close failed'));

      // Should not throw during cleanup
      await expect(playbackEngine.cleanup()).resolves.not.toThrow();
      
      // Should still reset state
      expect(playbackEngine.audioContext).toBeNull();
      expect(playbackEngine.isInitialized).toBe(false);
    });

    it('should handle browser storage limitations', async () => {
      // Mock storage estimate to fail
      global.navigator.storage.estimate.mockRejectedValue(new Error('Not supported'));

      await storageManager.init();
      const info = await storageManager.getStorageInfo();
      
      expect(info.quota).toBeNull();
      expect(info.usage).toBeNull();
      expect(info.utilizationPercent).toBeNull();
    });
  });

  describe('Concurrent Error Scenarios', () => {
    it('should handle multiple simultaneous download failures', async () => {
      const urls = [
        'https://www.youtube.com/watch?v=fail1',
        'https://www.youtube.com/watch?v=fail2',
        'https://www.youtube.com/watch?v=fail3'
      ];

      fetch.mockRejectedValue(new Error('Network error'));

      const downloadPromises = urls.map(url => 
        audioProcessingService.downloadAndProcessAudio(url).catch(error => error)
      );

      const results = await Promise.all(downloadPromises);
      
      // All should fail
      results.forEach(result => {
        expect(result).toBeInstanceOf(Error);
      });
    });

    it('should handle concurrent storage failures', async () => {
      await storageManager.init();
      
      mockStore.put.mockImplementation(() => {
        const req = { ...mockRequest };
        setTimeout(() => req.fail(new Error('Storage error')), 0);
        return req;
      });

      const mockAudioBuffer = {
        numberOfChannels: 2,
        sampleRate: 44100,
        duration: 10,
        getChannelData: () => new Float32Array(44100)
      };

      const storePromises = [];
      for (let i = 0; i < 3; i++) {
        const promise = storageManager.store(
          `https://www.youtube.com/watch?v=concurrent-fail${i}`,
          mockAudioBuffer,
          []
        ).catch(error => error);
        storePromises.push(promise);
      }

      const results = await Promise.all(storePromises);
      
      // All should fail
      results.forEach(result => {
        expect(result).toBeInstanceOf(Error);
      });
    });

    it('should handle mixed success/failure scenarios', async () => {
      // Mock some downloads to succeed, others to fail
      fetch
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
        })
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

      const urls = [
        'https://www.youtube.com/watch?v=success1',
        'https://www.youtube.com/watch?v=fail1',
        'https://www.youtube.com/watch?v=success2'
      ];

      const results = await Promise.allSettled(
        urls.map(url => audioProcessingService.downloadAndProcessAudio(url))
      );

      expect(results[0].status).toBe('fulfilled');
      expect(results[1].status).toBe('rejected');
      expect(results[2].status).toBe('fulfilled');
    });
  });

  describe('Recovery Mechanisms', () => {
    it('should recover from temporary AudioContext suspension', async () => {
      const mockContext = createErrorProneAudioContext();
      mockContext.state = 'suspended';
      mockContext.resume.mockResolvedValue();
      
      global.AudioContext.mockReturnValue(mockContext);
      
      await playbackEngine.initializeAudioContext();
      
      expect(mockContext.resume).toHaveBeenCalled();
      expect(playbackEngine.isInitialized).toBe(true);
    });

    it('should recover from storage cleanup and retry', async () => {
      await storageManager.init();
      
      // First attempt fails with quota error
      mockStore.put
        .mockImplementationOnce(() => {
          const req = { ...mockRequest };
          setTimeout(() => {
            const error = new Error('Quota exceeded');
            error.name = 'QuotaExceededError';
            req.fail(error);
          }, 0);
          return req;
        })
        .mockImplementationOnce(() => {
          const req = { ...mockRequest };
          setTimeout(() => req.succeed(), 0);
          return req;
        });

      // Mock cleanup to succeed
      const cleanupSpy = vi.spyOn(storageManager, 'cleanup').mockResolvedValue(1);

      const mockAudioBuffer = {
        numberOfChannels: 2,
        sampleRate: 44100,
        duration: 10,
        getChannelData: () => new Float32Array(44100)
      };

      // Should eventually succeed after cleanup
      const result = await storageManager.store(
        'https://www.youtube.com/watch?v=recovery-test',
        mockAudioBuffer,
        []
      );

      expect(result).toBe(true);
      expect(cleanupSpy).toHaveBeenCalled();
    });

    it('should maintain service state after partial failures', async () => {
      // Cause some downloads to fail
      fetch
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

      // First download fails
      await expect(
        audioProcessingService.downloadAndProcessAudio('https://www.youtube.com/watch?v=fail')
      ).rejects.toThrow();

      // Service should still be functional
      const stats = audioProcessingService.getStats();
      expect(stats.audioContextState).toBeDefined();

      // Second download should succeed
      const result = await audioProcessingService.downloadAndProcessAudio(
        'https://www.youtube.com/watch?v=success'
      );
      expect(result).toBeDefined();
    });

    it('should handle graceful degradation when features unavailable', async () => {
      // Mock IndexedDB as unavailable
      global.indexedDB = undefined;

      const newStorageManager = new (StorageManager.constructor)();
      
      // Should handle gracefully
      await expect(newStorageManager.init()).rejects.toThrow();
      
      // But service should still be usable for other operations
      expect(newStorageManager.generateId('https://www.youtube.com/watch?v=test')).toBeDefined();
    });
  });

  describe('Error Reporting and Logging', () => {
    it('should provide detailed error information', async () => {
      fetch.mockRejectedValue(new Error('Detailed network error'));

      const progressCallback = vi.fn();
      
      try {
        await audioProcessingService.downloadAndProcessAudio(
          'https://www.youtube.com/watch?v=error-details',
          progressCallback
        );
      } catch (error) {
        expect(error.message).toContain('Detailed network error');
      }

      // Should have error progress with details
      const errorCalls = progressCallback.mock.calls.filter(
        call => call[0].status === 'error'
      );
      expect(errorCalls.length).toBeGreaterThan(0);
      expect(errorCalls[0][0]).toHaveProperty('error');
    });

    it('should maintain error context through service layers', async () => {
      await playbackEngine.initializeAudioContext();
      
      // Mock storage to fail with specific error
      playbackEngine.storageManager = {
        getAudioData: vi.fn().mockRejectedValue(new Error('Storage layer error'))
      };

      try {
        await playbackEngine.loadAudioBuffer('test-id');
      } catch (error) {
        expect(error.message).toContain('Audio buffer loading failed');
        expect(error.message).toContain('Storage layer error');
      }
    });

    it('should provide recovery suggestions in error messages', async () => {
      // Mock quota exceeded error
      await storageManager.init();
      
      mockStore.put.mockImplementation(() => {
        const req = { ...mockRequest };
        setTimeout(() => {
          const error = new Error('Storage quota exceeded. Try clearing browser data or reducing audio quality.');
          error.name = 'QuotaExceededError';
          req.fail(error);
        }, 0);
        return req;
      });

      const mockAudioBuffer = {
        numberOfChannels: 2,
        sampleRate: 44100,
        duration: 10,
        getChannelData: () => new Float32Array(44100)
      };

      try {
        await storageManager.store('https://www.youtube.com/watch?v=quota', mockAudioBuffer, []);
      } catch (error) {
        expect(error.message).toContain('Storage failed');
      }
    });
  });
});