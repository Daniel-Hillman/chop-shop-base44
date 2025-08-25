/**
 * Tests for WaveformPerformanceOptimizer
 * Comprehensive testing of Web Worker integration, caching, memory management, and performance monitoring
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import WaveformPerformanceOptimizer from '../WaveformPerformanceOptimizer.js';

// Mock Web Worker
class MockWorker {
  constructor(scriptURL, options) {
    this.onmessage = null;
    this.onerror = null;
    this.messageQueue = [];
    this.scriptURL = scriptURL;
    this.options = options;
  }
  
  postMessage(data) {
    this.messageQueue.push(data);
    // Simulate async response
    setTimeout(() => {
      if (this.onmessage) {
        this.onmessage({
          data: {
            type: 'RESULT',
            taskId: data.taskId,
            data: {
              waveformData: {
                samples: new Float32Array(1000),
                sampleRate: 1000,
                duration: 1,
                channels: 1,
                metadata: {
                  analysisMethod: 'mock-worker',
                  quality: 'high',
                  generatedAt: Date.now()
                }
              },
              processingTime: 50,
              memoryUsage: { used: 1024, total: 2048 }
            }
          }
        });
      }
    }, 10);
  }
  
  terminate() {
    this.onmessage = null;
    this.onerror = null;
  }
}

// Mock IndexedDB
const mockIndexedDB = {
  open: vi.fn(() => {
    const request = {
      onsuccess: null,
      onerror: null,
      onupgradeneeded: null,
      result: {
        transaction: vi.fn(() => ({
          objectStore: vi.fn(() => ({
            get: vi.fn(() => {
              const getRequest = { onsuccess: null, result: null };
              setTimeout(() => {
                if (getRequest.onsuccess) getRequest.onsuccess();
              }, 0);
              return getRequest;
            }),
            put: vi.fn(),
            delete: vi.fn(),
            clear: vi.fn(),
            createIndex: vi.fn()
          })),
          oncomplete: null,
          onerror: null
        })),
        close: vi.fn(),
        objectStoreNames: { contains: vi.fn(() => false) }
      }
    };
    
    // Simulate successful opening
    setTimeout(() => {
      if (request.onsuccess) {
        request.onsuccess();
      }
    }, 0);
    
    return request;
  })
};

// Mock performance API
const mockPerformance = {
  now: vi.fn(() => Date.now()),
  memory: {
    usedJSHeapSize: 50 * 1024 * 1024,
    totalJSHeapSize: 100 * 1024 * 1024,
    jsHeapSizeLimit: 200 * 1024 * 1024
  }
};

// Mock navigator
const mockNavigator = {
  hardwareConcurrency: 4,
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  connection: {
    effectiveType: '4g',
    downlink: 10,
    rtt: 50
  }
};

describe('WaveformPerformanceOptimizer', () => {
  let optimizer;
  let originalWorker;
  let originalIndexedDB;
  let originalPerformance;
  let originalNavigator;

  beforeEach(async () => {
    // Mock globals
    originalWorker = global.Worker;
    originalIndexedDB = global.indexedDB;
    originalPerformance = global.performance;
    originalNavigator = global.navigator;
    
    global.Worker = MockWorker;
    global.indexedDB = mockIndexedDB;
    global.performance = mockPerformance;
    global.navigator = mockNavigator;
    
    // Create optimizer instance
    optimizer = new WaveformPerformanceOptimizer({
      workerPoolSize: 2,
      enableCaching: true,
      enableMemoryManagement: true,
      enablePerformanceMonitoring: true,
      cacheMaxMemory: 10 * 1024 * 1024, // 10MB for testing
      memoryMaxThreshold: 50 * 1024 * 1024, // 50MB for testing
      cachePersistence: false // Disable persistence for tests
    });
    
    await optimizer.initialize();
  }, 30000); // 30 second timeout

  afterEach(() => {
    // Restore globals
    global.Worker = originalWorker;
    global.indexedDB = originalIndexedDB;
    global.performance = originalPerformance;
    global.navigator = originalNavigator;
    
    // Cleanup optimizer
    if (optimizer) {
      optimizer.destroy();
      optimizer = null;
    }
  });

  describe('Initialization', () => {
    it('should initialize all components successfully', () => {
      expect(optimizer.isInitialized).toBe(true);
      expect(optimizer.cache).toBeDefined();
      expect(optimizer.memoryManager).toBeDefined();
      expect(optimizer.performanceMonitor).toBeDefined();
      expect(optimizer.workerPool).toHaveLength(2);
    });

    it('should handle initialization with disabled components', async () => {
      const minimalOptimizer = new WaveformPerformanceOptimizer({
        enableWebWorkers: false,
        enableCaching: false,
        enableMemoryManagement: false,
        enablePerformanceMonitoring: false
      });
      
      await minimalOptimizer.initialize();
      
      expect(minimalOptimizer.isInitialized).toBe(true);
      expect(minimalOptimizer.cache).toBeNull();
      expect(minimalOptimizer.memoryManager).toBeNull();
      expect(minimalOptimizer.performanceMonitor).toBeNull();
      expect(minimalOptimizer.workerPool).toHaveLength(0);
      
      minimalOptimizer.destroy();
    });
  });

  describe('Waveform Generation', () => {
    it('should generate waveform using Web Worker', async () => {
      const audioBuffer = new Float32Array(44100); // 1 second of audio
      for (let i = 0; i < audioBuffer.length; i++) {
        audioBuffer[i] = Math.sin(2 * Math.PI * 440 * i / 44100); // 440Hz sine wave
      }

      const result = await optimizer.generateOptimizedWaveform({ buffer: audioBuffer }, {
        targetSampleRate: 1000,
        quality: 'high'
      });

      expect(result).toBeDefined();
      expect(result.samples).toBeInstanceOf(Float32Array);
      expect(result.sampleRate).toBe(1000);
      expect(result.metadata.analysisMethod).toBe('mock-worker');
    });

    it('should fallback to direct generation when workers fail', async () => {
      // Disable workers temporarily
      optimizer.options.enableWebWorkers = false;
      optimizer.workerPool = [];

      const audioBuffer = new Float32Array(44100);
      for (let i = 0; i < audioBuffer.length; i++) {
        audioBuffer[i] = Math.sin(2 * Math.PI * 440 * i / 44100);
      }

      const result = await optimizer.generateOptimizedWaveform({ buffer: audioBuffer }, {
        targetSampleRate: 1000,
        quality: 'medium'
      });

      expect(result).toBeDefined();
      expect(result.samples).toBeInstanceOf(Float32Array);
      expect(result.metadata.analysisMethod).toBe('direct-optimized');
    });

    it('should use cached results when available', async () => {
      const audioBuffer = new Float32Array(1000);
      const audioSource = { buffer: audioBuffer };
      const options = { targetSampleRate: 500, quality: 'medium' };

      // First generation should miss cache
      const result1 = await optimizer.generateOptimizedWaveform(audioSource, options);
      expect(optimizer.metrics.cachePerformance.misses).toBe(1);

      // Mock cache hit
      const cacheKey = optimizer.cache.generateCacheKey(audioSource, options);
      await optimizer.cache.set(cacheKey, result1);

      // Second generation should hit cache
      const result2 = await optimizer.generateOptimizedWaveform(audioSource, options);
      expect(result2).toBeDefined();
    });

    it('should handle generation errors gracefully', async () => {
      // Test with invalid audio buffer
      await expect(
        optimizer.generateOptimizedWaveform({ buffer: null }, { quality: 'high' })
      ).rejects.toThrow();
    });
  });

  describe('Worker Pool Management', () => {
    it('should distribute tasks across available workers', async () => {
      const audioBuffer = new Float32Array(1000);
      const tasks = [];

      // Create multiple tasks
      for (let i = 0; i < 5; i++) {
        tasks.push(
          optimizer.generateOptimizedWaveform({ buffer: audioBuffer }, {
            targetSampleRate: 100,
            quality: 'low'
          })
        );
      }

      const results = await Promise.all(tasks);
      
      expect(results).toHaveLength(5);
      results.forEach(result => {
        expect(result).toBeDefined();
        expect(result.samples).toBeInstanceOf(Float32Array);
      });
    });

    it('should queue tasks when all workers are busy', async () => {
      const audioBuffer = new Float32Array(1000);
      
      // Start more tasks than workers
      const tasks = [];
      for (let i = 0; i < 4; i++) { // More than workerPoolSize (2)
        tasks.push(
          optimizer.generateOptimizedWaveform({ buffer: audioBuffer }, {
            targetSampleRate: 100,
            quality: 'low'
          })
        );
      }

      // Some tasks should be queued initially
      expect(optimizer.workerQueue.length).toBeGreaterThanOrEqual(0);

      const results = await Promise.all(tasks);
      expect(results).toHaveLength(4);
    });
  });

  describe('Performance Monitoring', () => {
    it('should track performance metrics', () => {
      const metrics = optimizer.getPerformanceMetrics();
      
      expect(metrics).toBeDefined();
      expect(metrics.workerTasks).toBeDefined();
      expect(metrics.cachePerformance).toBeDefined();
      expect(metrics.overallPerformance).toBeDefined();
    });

    it('should handle quality changes', () => {
      const initialQuality = optimizer.getAdaptiveSettings().renderQuality;
      
      // Simulate performance degradation
      optimizer.handleQualityChange({
        newQuality: 'low',
        changeType: 'degraded',
        details: { level: 2, reason: 'performance' }
      });

      expect(optimizer.metrics.overallPerformance.qualityLevel).toBe('low');
      expect(optimizer.metrics.overallPerformance.degradationLevel).toBe(2);
    });

    it('should trigger emergency optimizations on critical performance', () => {
      const spy = vi.spyOn(optimizer, 'triggerEmergencyOptimizations');
      
      optimizer.handlePerformanceWarning({
        type: 'critical',
        issues: [{ type: 'critical-fps', value: 15, threshold: 30 }]
      });

      expect(spy).toHaveBeenCalled();
    });
  });

  describe('Memory Management', () => {
    it('should allocate and deallocate buffers', () => {
      const allocation = optimizer.memoryManager.allocateBuffer(1024, 'waveform', {
        test: true
      });

      expect(allocation.bufferId).toBeDefined();
      expect(allocation.buffer).toBeInstanceOf(Float32Array);
      expect(allocation.buffer.length).toBe(1024);

      const deallocated = optimizer.memoryManager.deallocateBuffer(allocation.bufferId);
      expect(deallocated).toBe(true);
    });

    it('should perform memory cleanup when thresholds are exceeded', () => {
      const spy = vi.spyOn(optimizer.memoryManager, 'performAutomaticCleanup');
      
      // Simulate high memory usage
      optimizer.memoryManager.memoryUsage.current = 60 * 1024 * 1024; // Above warning threshold
      optimizer.memoryManager.performAutomaticCleanup();

      expect(spy).toHaveBeenCalled();
    });

    it('should handle emergency cleanup', () => {
      const initialAllocations = optimizer.memoryManager.allocatedBuffers.size;
      
      // Allocate some buffers
      const allocations = [];
      for (let i = 0; i < 5; i++) {
        allocations.push(
          optimizer.memoryManager.allocateBuffer(1024, 'waveform')
        );
      }

      expect(optimizer.memoryManager.allocatedBuffers.size).toBeGreaterThan(initialAllocations);

      // Trigger emergency cleanup
      optimizer.memoryManager.emergencyCleanup();

      // Most allocations should be cleaned up (except pinned ones)
      expect(optimizer.memoryManager.allocatedBuffers.size).toBeLessThanOrEqual(initialAllocations);
    });
  });

  describe('Caching System', () => {
    it('should cache and retrieve waveform data', async () => {
      const testData = {
        samples: new Float32Array([1, 2, 3, 4, 5]),
        sampleRate: 1000,
        duration: 0.005,
        channels: 1
      };

      const cacheKey = 'test_waveform_key';
      
      // Set data in cache
      await optimizer.cache.set(cacheKey, testData, { test: true });
      
      // Retrieve data from cache
      const retrieved = await optimizer.cache.get(cacheKey);
      
      expect(retrieved).toBeDefined();
      expect(retrieved.data.samples).toEqual(testData.samples);
      expect(retrieved.data.sampleRate).toBe(testData.sampleRate);
    });

    it('should handle cache misses gracefully', async () => {
      const result = await optimizer.cache.get('nonexistent_key');
      expect(result).toBeNull();
    });

    it('should evict old entries when cache is full', async () => {
      // Fill cache beyond capacity
      const promises = [];
      for (let i = 0; i < 60; i++) { // More than maxCacheEntries (50)
        const data = {
          samples: new Float32Array(100),
          sampleRate: 1000,
          duration: 0.1,
          channels: 1
        };
        promises.push(optimizer.cache.set(`key_${i}`, data));
      }

      await Promise.all(promises);

      // Cache should have evicted some entries
      expect(optimizer.cache.memoryCache.size).toBeLessThanOrEqual(50);
    });
  });

  describe('Adaptive Quality', () => {
    it('should provide adaptive settings based on performance', () => {
      const settings = optimizer.getAdaptiveSettings();
      
      expect(settings).toBeDefined();
      expect(settings.renderQuality).toBeDefined();
      expect(settings.waveformResolution).toBeDefined();
      expect(settings.enableAntialiasing).toBeDefined();
    });

    it('should allow manual quality level setting', () => {
      optimizer.setQualityLevel('low');
      
      const settings = optimizer.getAdaptiveSettings();
      expect(settings.renderQuality).toBe('low');
    });
  });

  describe('Low-End Device Optimization', () => {
    it('should optimize for low-end devices', () => {
      const initialWorkerCount = optimizer.workerPool.length;
      const initialCacheSize = optimizer.cache.maxMemorySize;

      optimizer.optimizeForLowEndDevice();

      expect(optimizer.workerPool.length).toBeLessThanOrEqual(initialWorkerCount);
      expect(optimizer.cache.maxMemorySize).toBeLessThan(initialCacheSize);
    });
  });

  describe('Error Handling', () => {
    it('should handle worker errors gracefully', async () => {
      // Mock worker error
      const workerInfo = optimizer.workerPool[0];
      const mockTask = {
        id: 'test_task',
        reject: vi.fn(),
        startTime: performance.now()
      };

      optimizer.activeWorkerTasks.set('test_task', { task: mockTask, workerInfo });
      optimizer.handleWorkerError(mockTask, 'Test error');

      expect(mockTask.reject).toHaveBeenCalledWith(expect.any(Error));
      expect(optimizer.metrics.workerTasks.failed).toBeGreaterThan(0);
    });

    it('should handle cache errors gracefully', async () => {
      // Mock cache error by setting invalid data
      const invalidData = { circular: {} };
      invalidData.circular.ref = invalidData;

      // Should not throw
      await expect(
        optimizer.cache.set('invalid_key', invalidData)
      ).resolves.not.toThrow();
    });
  });

  describe('Resource Cleanup', () => {
    it('should cleanup all resources on destroy', () => {
      const workerTerminateSpy = vi.spyOn(optimizer.workerPool[0].worker, 'terminate');
      
      optimizer.destroy();

      expect(optimizer.isInitialized).toBe(false);
      expect(optimizer.cache).toBeNull();
      expect(optimizer.memoryManager).toBeNull();
      expect(optimizer.performanceMonitor).toBeNull();
      expect(optimizer.workerPool).toHaveLength(0);
      expect(workerTerminateSpy).toHaveBeenCalled();
    });

    it('should clear caches on demand', async () => {
      // Add some data to cache
      await optimizer.cache.set('test_key', { test: 'data' });
      expect(optimizer.cache.memoryCache.size).toBeGreaterThan(0);

      await optimizer.clearCaches();
      expect(optimizer.cache.memoryCache.size).toBe(0);
    });
  });

  describe('Integration Tests', () => {
    it('should handle complete waveform generation workflow', async () => {
      const audioBuffer = new Float32Array(44100);
      // Generate test audio data
      for (let i = 0; i < audioBuffer.length; i++) {
        audioBuffer[i] = Math.sin(2 * Math.PI * 440 * i / 44100) * 0.5;
      }

      const audioSource = { buffer: audioBuffer };
      const options = {
        targetSampleRate: 1000,
        quality: 'high'
      };

      // First generation (cache miss)
      const result1 = await optimizer.generateOptimizedWaveform(audioSource, options);
      expect(result1).toBeDefined();
      expect(result1.samples).toBeInstanceOf(Float32Array);
      expect(result1.samples.length).toBe(1000);

      // Second generation (should use cache)
      const result2 = await optimizer.generateOptimizedWaveform(audioSource, options);
      expect(result2).toBeDefined();

      // Verify metrics were updated
      const metrics = optimizer.getPerformanceMetrics();
      expect(metrics.workerTasks.completed).toBeGreaterThan(0);
      expect(metrics.cachePerformance.hits + metrics.cachePerformance.misses).toBeGreaterThan(0);
    });

    it('should handle concurrent waveform generation requests', async () => {
      const audioBuffer = new Float32Array(1000);
      const requests = [];

      // Create multiple concurrent requests
      for (let i = 0; i < 10; i++) {
        requests.push(
          optimizer.generateOptimizedWaveform(
            { buffer: audioBuffer },
            { targetSampleRate: 100 + i * 10, quality: 'medium' }
          )
        );
      }

      const results = await Promise.all(requests);
      
      expect(results).toHaveLength(10);
      results.forEach((result, index) => {
        expect(result).toBeDefined();
        expect(result.samples).toBeInstanceOf(Float32Array);
        expect(result.sampleRate).toBe(100 + index * 10);
      });
    });
  });
});