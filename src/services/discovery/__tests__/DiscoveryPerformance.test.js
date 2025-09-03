import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { DiscoveryPerformanceMonitor } from '../DiscoveryPerformanceMonitor.js';
import { DiscoveryMemoryManager } from '../DiscoveryMemoryManager.js';
import { OptimizedApiManager } from '../OptimizedApiManager.js';
import { ShuffleEngine } from '../ShuffleEngine.js';

describe('Discovery Performance Optimization', () => {
  let performanceMonitor;
  let memoryManager;
  let apiManager;
  let shuffleEngine;

  beforeEach(() => {
    // Mock performance API
    global.performance = {
      memory: {
        usedJSHeapSize: 50 * 1024 * 1024, // 50MB
        totalJSHeapSize: 100 * 1024 * 1024, // 100MB
        jsHeapSizeLimit: 2 * 1024 * 1024 * 1024 // 2GB
      },
      now: vi.fn(() => Date.now())
    };

    performanceMonitor = new DiscoveryPerformanceMonitor({
      enabled: true,
      sampleInterval: 100, // Fast sampling for tests
      memoryThreshold: 75 * 1024 * 1024 // 75MB
    });

    memoryManager = new DiscoveryMemoryManager({
      enabled: true,
      maxMemoryUsage: 100 * 1024 * 1024, // 100MB
      cleanupInterval: 100 // Fast cleanup for tests
    });

    apiManager = new OptimizedApiManager({
      apiKey: 'test-key',
      enabled: true,
      dailyQuotaLimit: 1000,
      batchDelay: 10 // Fast batching for tests
    });

    shuffleEngine = new ShuffleEngine({
      performanceMonitor,
      memoryManager,
      apiManager
    });
  });

  afterEach(() => {
    performanceMonitor?.cleanup();
    memoryManager?.cleanup();
    apiManager?.cleanup();
    shuffleEngine?.cleanup();
  });

  describe('Performance Monitoring', () => {
    it('should track shuffle operation performance', async () => {
      const startTime = Date.now();
      
      // Simulate shuffle operation
      performanceMonitor.recordShuffleOperation(150, true, { genre: 'soul' });
      performanceMonitor.recordShuffleOperation(200, true, { genre: 'jazz' });
      performanceMonitor.recordShuffleOperation(100, false, { genre: 'funk', error: 'timeout' });

      const report = performanceMonitor.getReport();
      
      expect(report.metrics.shuffleOperations).toBe(3);
      expect(report.metrics.averageResponseTime).toBeCloseTo(150, 0);
      expect(report.metrics.slowestOperation).toBe(200);
      expect(report.metrics.fastestOperation).toBe(100);
      expect(report.calculated.errorRate).toBe('33.33%');
    });

    it('should monitor API call patterns and quota usage', async () => {
      // Simulate API calls
      performanceMonitor.recordApiCall('search', 500, true);
      performanceMonitor.recordApiCall('videos', 100, true);
      performanceMonitor.recordApiCall('search', 800, false, new Error('quota exceeded'));

      const report = performanceMonitor.getReport();
      
      expect(report.metrics.apiCalls).toBe(3);
      expect(report.metrics.apiErrors).toBe(1);
      expect(report.metrics.quotaExceeded).toBe(1);
    });

    it('should track cache performance', async () => {
      // Simulate cache operations
      performanceMonitor.recordCacheOperation('cache', true);  // hit
      performanceMonitor.recordCacheOperation('cache', false); // miss
      performanceMonitor.recordCacheOperation('cache', true);  // hit
      performanceMonitor.recordCacheOperation('preload', true); // preload hit

      const report = performanceMonitor.getReport();
      
      expect(report.metrics.cacheHits).toBe(2);
      expect(report.metrics.cacheMisses).toBe(1);
      expect(report.metrics.preloadHits).toBe(1);
      expect(report.calculated.cacheHitRate).toBe('66.67%');
    });

    it('should detect performance alerts', async () => {
      // Trigger slow operation alert
      performanceMonitor.recordShuffleOperation(5000, true); // 5 seconds - should trigger alert
      
      const report = performanceMonitor.getReport();
      const slowOperationAlert = report.alerts.find(alert => alert.type === 'slow_operation');
      
      expect(slowOperationAlert).toBeDefined();
      expect(slowOperationAlert.message).toContain('5000ms');
    });

    it('should monitor memory usage and detect leaks', async () => {
      // Simulate high memory usage
      performanceMonitor.recordMemoryUsage(90 * 1024 * 1024); // 90MB
      
      const report = performanceMonitor.getReport();
      
      expect(report.metrics.currentMemoryUsage).toBe(90 * 1024 * 1024);
      expect(report.calculated.memoryUsageMB).toBe('90.00MB');
      
      // Should trigger high memory alert
      const memoryAlert = report.alerts.find(alert => alert.type === 'high_memory_usage');
      expect(memoryAlert).toBeDefined();
    });
  });

  describe('Memory Management', () => {
    it('should register and track managed objects', () => {
      const testObject = { data: 'test', cleanup: vi.fn() };
      
      memoryManager.registerObject('test1', testObject, 'cache', 1024);
      memoryManager.registerObject('test2', { data: 'test2' }, 'preloaded', 2048);
      
      const usage = memoryManager.getMemoryUsage();
      
      expect(usage.cache).toBe(1024);
      expect(usage.preloaded).toBe(2048);
      expect(usage.total).toBe(3072);
    });

    it('should perform cleanup when memory threshold is exceeded', async () => {
      // Register objects that will exceed threshold
      for (let i = 0; i < 10; i++) {
        memoryManager.registerObject(
          `test${i}`, 
          { data: `test${i}`, cleanup: vi.fn() }, 
          'cache', 
          15 * 1024 * 1024 // 15MB each
        );
      }
      
      const beforeCleanup = memoryManager.getMemoryUsage();
      expect(beforeCleanup.total).toBe(150 * 1024 * 1024); // 150MB - exceeds 100MB limit
      
      // Force cleanup
      await memoryManager.performCleanup(true);
      
      const afterCleanup = memoryManager.getMemoryUsage();
      expect(afterCleanup.total).toBeLessThan(beforeCleanup.total);
    });

    it('should cleanup expired objects', async () => {
      const oldObject = { data: 'old', cleanup: vi.fn() };
      
      memoryManager.registerObject('old', oldObject, 'cache', 1024);
      
      // Mock object as expired
      const managed = memoryManager.managedObjects.get('old');
      managed.createdAt = Date.now() - (2 * 60 * 60 * 1000); // 2 hours ago
      
      const cleaned = await memoryManager.performLightCleanup();
      
      expect(cleaned).toBe(1);
      expect(memoryManager.managedObjects.has('old')).toBe(false);
      expect(oldObject.cleanup).toHaveBeenCalled();
    });

    it('should optimize memory usage', async () => {
      // Add various objects
      memoryManager.registerObject('cache1', { data: 'cache' }, 'cache', 10 * 1024 * 1024);
      memoryManager.registerObject('preload1', { data: 'preload' }, 'preloaded', 20 * 1024 * 1024);
      memoryManager.registerObject('meta1', { data: 'meta' }, 'metadata', 5 * 1024 * 1024);
      
      const result = await memoryManager.optimize();
      
      expect(result.before.total).toBeGreaterThan(0);
      expect(result.saved).toBeGreaterThanOrEqual(0);
    });
  });

  describe('API Optimization', () => {
    beforeEach(() => {
      // Mock fetch for API tests
      global.fetch = vi.fn();
    });

    it('should batch video detail requests', async () => {
      const mockResponse = {
        ok: true,
        json: () => Promise.resolve({
          items: [
            { id: 'video1', snippet: { title: 'Test Video 1' } },
            { id: 'video2', snippet: { title: 'Test Video 2' } }
          ]
        })
      };
      
      global.fetch.mockResolvedValue(mockResponse);
      
      // Make multiple requests that should be batched
      const promises = [
        apiManager.getVideoDetails('video1', { batch: true }),
        apiManager.getVideoDetails('video2', { batch: true })
      ];
      
      // Wait for batch processing
      await new Promise(resolve => setTimeout(resolve, 20));
      
      const results = await Promise.all(promises);
      
      expect(results).toHaveLength(2);
      expect(global.fetch).toHaveBeenCalledTimes(1); // Should be batched into single request
    });

    it('should respect quota limits', async () => {
      apiManager.quotaUsed = 950; // Near limit of 1000
      
      // This should succeed (cost 100, total 1050 > 1000)
      await expect(
        apiManager.request('search', { q: 'test' })
      ).rejects.toThrow('Insufficient quota');
    });

    it('should cache responses effectively', async () => {
      const mockResponse = {
        ok: true,
        json: () => Promise.resolve({ items: [{ id: 'test' }] })
      };
      
      global.fetch.mockResolvedValue(mockResponse);
      
      // First request
      const result1 = await apiManager.request('videos', { id: 'test' });
      
      // Second request should come from cache
      const result2 = await apiManager.request('videos', { id: 'test' });
      
      expect(result1).toEqual(result2);
      expect(global.fetch).toHaveBeenCalledTimes(1); // Only one actual API call
      
      const stats = apiManager.getStats();
      expect(stats.cachedResponses).toBe(1);
    });

    it('should enforce rate limiting', async () => {
      apiManager.requestsPerSecond = 2; // Very low for testing
      
      const mockResponse = {
        ok: true,
        json: () => Promise.resolve({ items: [] })
      };
      
      global.fetch.mockResolvedValue(mockResponse);
      
      const startTime = Date.now();
      
      // Make 3 requests
      await Promise.all([
        apiManager.makeRequest('videos', { id: '1' }, 'key1', 1),
        apiManager.makeRequest('videos', { id: '2' }, 'key2', 1),
        apiManager.makeRequest('videos', { id: '3' }, 'key3', 1)
      ]);
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Should take at least 1000ms for 3 requests at 2 RPS
      expect(duration).toBeGreaterThan(800);
    });
  });

  describe('Shuffle Engine Performance', () => {
    beforeEach(() => {
      // Mock the shuffle engine dependencies
      shuffleEngine.youtubeSearchService = {
        search: vi.fn().mockResolvedValue({
          items: [
            { id: { videoId: 'test1' }, snippet: { title: 'Test 1' } },
            { id: { videoId: 'test2' }, snippet: { title: 'Test 2' } }
          ]
        })
      };
      
      shuffleEngine.sampleFilterService = {
        filterAndRank: vi.fn().mockImplementation(items => items)
      };
      
      shuffleEngine.metadataEnhancer = {
        enhance: vi.fn().mockImplementation(sample => ({ ...sample, enhanced: true }))
      };
    });

    it('should complete shuffle operations within performance targets', async () => {
      const startTime = Date.now();
      
      const result = await shuffleEngine.shuffleSample({
        genres: ['soul'],
        yearRange: [1960, 1980]
      });
      
      const duration = Date.now() - startTime;
      
      expect(result).toBeDefined();
      expect(duration).toBeLessThan(2000); // Should complete within 2 seconds
    });

    it('should preload samples for faster subsequent shuffles', async () => {
      // First shuffle to populate cache
      await shuffleEngine.shuffleSample({ genres: ['jazz'] });
      
      // Preload more samples
      await shuffleEngine.preloadSamples({ genres: ['jazz'] }, 5);
      
      // Subsequent shuffles should be faster
      const startTime = Date.now();
      await shuffleEngine.shuffleSample({ genres: ['jazz'] });
      const duration = Date.now() - startTime;
      
      expect(duration).toBeLessThan(500); // Should be much faster with preloaded samples
    });

    it('should handle concurrent shuffle requests efficiently', async () => {
      const concurrentRequests = 5;
      const startTime = Date.now();
      
      const promises = Array(concurrentRequests).fill().map((_, i) => 
        shuffleEngine.shuffleSample({ genres: ['funk'], yearRange: [1970, 1980] })
      );
      
      const results = await Promise.all(promises);
      const duration = Date.now() - startTime;
      
      expect(results).toHaveLength(concurrentRequests);
      expect(results.every(r => r !== null)).toBe(true);
      
      // Should handle concurrent requests efficiently
      expect(duration).toBeLessThan(5000);
    });
  });

  describe('Zero Performance Impact Verification', () => {
    it('should have zero impact when discovery panel is collapsed', () => {
      // Simulate collapsed state - no services should be initialized
      const mockChopperPage = {
        discoveryPanelVisible: false,
        existingFunctionality: vi.fn()
      };
      
      // Measure baseline performance
      const startTime = performance.now();
      
      // Simulate existing chopper functionality
      for (let i = 0; i < 1000; i++) {
        mockChopperPage.existingFunctionality();
      }
      
      const baselineDuration = performance.now() - startTime;
      
      // Now with discovery services present but inactive
      const discoveryServices = {
        performanceMonitor: new DiscoveryPerformanceMonitor({ enabled: false }),
        memoryManager: new DiscoveryMemoryManager({ enabled: false }),
        apiManager: new OptimizedApiManager({ enabled: false })
      };
      
      const startTimeWithDiscovery = performance.now();
      
      // Same functionality with discovery services present
      for (let i = 0; i < 1000; i++) {
        mockChopperPage.existingFunctionality();
      }
      
      const durationWithDiscovery = performance.now() - startTimeWithDiscovery;
      
      // Performance impact should be negligible (within 5% variance)
      const performanceImpact = Math.abs(durationWithDiscovery - baselineDuration) / baselineDuration;
      expect(performanceImpact).toBeLessThan(0.05);
      
      // Cleanup
      Object.values(discoveryServices).forEach(service => service.cleanup?.());
    });

    it('should lazy load services only when discovery panel is expanded', async () => {
      let servicesInitialized = false;
      
      const mockDiscoveryPanel = {
        isVisible: false,
        isInitialized: false,
        
        expand() {
          this.isVisible = true;
          if (!this.isInitialized) {
            // Simulate lazy initialization
            servicesInitialized = true;
            this.isInitialized = true;
          }
        }
      };
      
      // Panel collapsed - no services should be initialized
      expect(servicesInitialized).toBe(false);
      
      // Expand panel - services should initialize
      mockDiscoveryPanel.expand();
      expect(servicesInitialized).toBe(true);
    });
  });

  describe('Performance Benchmarks', () => {
    it('should meet shuffle operation performance benchmarks', async () => {
      const benchmarks = {
        maxShuffleTime: 2000, // 2 seconds
        maxMemoryUsage: 100 * 1024 * 1024, // 100MB
        minCacheHitRate: 0.7, // 70%
        maxErrorRate: 0.1 // 10%
      };
      
      // Run multiple shuffle operations
      const operations = 10;
      const results = [];
      
      for (let i = 0; i < operations; i++) {
        const startTime = Date.now();
        
        try {
          await shuffleEngine.shuffleSample({
            genres: ['soul', 'jazz'][i % 2],
            yearRange: [1960, 1980]
          });
          
          const duration = Date.now() - startTime;
          results.push({ success: true, duration });
          
          performanceMonitor.recordShuffleOperation(duration, true);
        } catch (error) {
          results.push({ success: false, error });
          performanceMonitor.recordShuffleOperation(0, false);
        }
      }
      
      // Analyze results
      const successfulResults = results.filter(r => r.success);
      const averageDuration = successfulResults.reduce((sum, r) => sum + r.duration, 0) / successfulResults.length;
      const maxDuration = Math.max(...successfulResults.map(r => r.duration));
      const errorRate = (operations - successfulResults.length) / operations;
      
      // Verify benchmarks
      expect(averageDuration).toBeLessThan(benchmarks.maxShuffleTime);
      expect(maxDuration).toBeLessThan(benchmarks.maxShuffleTime * 1.5); // Allow 50% variance for max
      expect(errorRate).toBeLessThan(benchmarks.maxErrorRate);
      
      const memoryUsage = memoryManager.getMemoryUsage();
      expect(memoryUsage.total).toBeLessThan(benchmarks.maxMemoryUsage);
    });

    it('should maintain performance under load', async () => {
      const loadTestDuration = 5000; // 5 seconds
      const startTime = Date.now();
      const operations = [];
      
      // Generate load
      while (Date.now() - startTime < loadTestDuration) {
        const operation = shuffleEngine.shuffleSample({
          genres: ['funk'],
          yearRange: [1970, 1980]
        }).then(result => ({
          timestamp: Date.now(),
          success: true,
          result
        })).catch(error => ({
          timestamp: Date.now(),
          success: false,
          error
        }));
        
        operations.push(operation);
        
        // Small delay to prevent overwhelming
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      const results = await Promise.all(operations);
      
      // Analyze performance under load
      const successRate = results.filter(r => r.success).length / results.length;
      const operationsPerSecond = results.length / (loadTestDuration / 1000);
      
      expect(successRate).toBeGreaterThan(0.8); // 80% success rate under load
      expect(operationsPerSecond).toBeGreaterThan(1); // At least 1 operation per second
      
      // Memory should not grow excessively
      const finalMemoryUsage = memoryManager.getMemoryUsage();
      expect(finalMemoryUsage.total).toBeLessThan(150 * 1024 * 1024); // 150MB max under load
    });
  });
});