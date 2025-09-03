/**
 * @jest-environment jsdom
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import DiscoveryCacheManager from '../DiscoveryCacheManager.js';
import DiscoveryMemoryManager from '../DiscoveryMemoryManager.js';
import LazyLoadingManager from '../../../utils/LazyLoadingManager.js';

// Mock performance.measureUserAgentSpecificMemory if available
const mockMemoryAPI = {
  measureUserAgentSpecificMemory: vi.fn().mockResolvedValue({
    bytes: 1024 * 1024, // 1MB
    breakdown: []
  })
};

describe('Memory Leak Detection', () => {
  let cacheManager;
  let memoryManager;
  let lazyLoader;
  let initialMemoryUsage;

  beforeEach(() => {
    // Mock console methods
    vi.spyOn(console, 'debug').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    
    // Mock performance API
    global.performance = {
      ...global.performance,
      ...mockMemoryAPI
    };
    
    // Mock IntersectionObserver
    global.IntersectionObserver = class MockIntersectionObserver {
      constructor(callback, options) {
        this.callback = callback;
        this.options = options;
        this.elements = new Set();
      }
      observe(element) { this.elements.add(element); }
      unobserve(element) { this.elements.delete(element); }
      disconnect() { this.elements.clear(); }
    };
    
    // Initialize managers
    cacheManager = new DiscoveryCacheManager({
      ttl: 1000,
      maxSize: 10,
      cleanupInterval: 100
    });
    
    memoryManager = new DiscoveryMemoryManager({
      cleanupInterval: 100,
      memoryCheckInterval: 200,
      maxMemoryUsage: 1024 * 1024
    });
    
    lazyLoader = new LazyLoadingManager();
    
    // Record initial memory usage
    initialMemoryUsage = getMemoryUsage();
  });

  afterEach(() => {
    // Clean up all managers
    if (cacheManager) cacheManager.destroy();
    if (memoryManager) memoryManager.destroy();
    if (lazyLoader) lazyLoader.destroy();
    
    vi.restoreAllMocks();
  });

  /**
   * Get current memory usage estimate
   */
  function getMemoryUsage() {
    // Estimate memory usage based on various factors
    let usage = 0;
    
    // Cache manager memory
    if (cacheManager) {
      const stats = cacheManager.getCacheStats();
      usage += stats.totalMemoryUsage || 0;
    }
    
    // Memory manager tracked usage
    if (memoryManager) {
      const stats = memoryManager.getMemoryStats();
      usage += stats.currentUsage || 0;
    }
    
    // Lazy loader memory (estimated)
    if (lazyLoader) {
      const stats = lazyLoader.getStats();
      usage += stats.pendingElements * 1024; // 1KB per pending element
    }
    
    return usage;
  }

  /**
   * Create mock sample data
   */
  function createMockSamples(count = 10) {
    return Array.from({ length: count }, (_, i) => ({
      id: `sample_${i}`,
      title: `Sample ${i}`,
      artist: `Artist ${i}`,
      year: 1970 + (i % 30),
      genre: ['Soul', 'Jazz', 'Funk'][i % 3],
      youtubeId: `test_${i}`,
      thumbnailUrl: `https://example.com/thumb_${i}.jpg`
    }));
  }

  /**
   * Create mock DOM elements
   */
  function createMockElements(count = 10) {
    return Array.from({ length: count }, (_, i) => ({
      dataset: { src: `image_${i}.jpg` },
      classList: {
        add: vi.fn(),
        remove: vi.fn()
      },
      src: '',
      addEventListener: vi.fn(),
      removeEventListener: vi.fn()
    }));
  }

  describe('Cache Manager Memory Leaks', () => {
    it('should not leak memory with repeated cache operations', async () => {
      const iterations = 100;
      const samples = createMockSamples(50);
      
      for (let i = 0; i < iterations; i++) {
        const filters = {
          genres: [`Genre${i % 5}`],
          yearRange: { start: 1970 + (i % 10), end: 1980 + (i % 10) }
        };
        
        // Cache and retrieve data
        cacheManager.cacheResults(filters, samples);
        cacheManager.getCachedResults(filters);
        
        // Occasionally invalidate cache
        if (i % 10 === 0) {
          cacheManager.invalidateCache();
        }
      }
      
      // Force cleanup
      cacheManager.cleanup(true);
      
      const finalMemoryUsage = getMemoryUsage();
      const memoryGrowth = finalMemoryUsage - initialMemoryUsage;
      
      // Memory growth should be reasonable (less than 10MB)
      expect(memoryGrowth).toBeLessThan(10 * 1024 * 1024);
      
      // Cache should have been cleaned up
      const stats = cacheManager.getCacheStats();
      expect(stats.totalEntries).toBeLessThanOrEqual(10); // maxSize
    });

    it('should clean up expired entries automatically', async () => {
      const samples = createMockSamples(20);
      
      // Add many entries with short TTL
      for (let i = 0; i < 50; i++) {
        const filters = { genres: [`Genre${i}`], yearRange: { start: 1970, end: 1980 } };
        cacheManager.cacheResults(filters, samples, 50); // 50ms TTL
      }
      
      const initialStats = cacheManager.getCacheStats();
      expect(initialStats.totalEntries).toBeGreaterThan(0);
      
      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Trigger cleanup
      cacheManager.removeExpiredEntries();
      
      const finalStats = cacheManager.getCacheStats();
      expect(finalStats.expiredEntries).toBe(0);
      expect(finalStats.totalEntries).toBeLessThan(initialStats.totalEntries);
    });

    it('should handle memory pressure correctly', () => {
      const largeSamples = createMockSamples(1000); // Large dataset
      
      // Fill cache beyond memory threshold
      for (let i = 0; i < 20; i++) {
        const filters = { genres: [`Genre${i}`], yearRange: { start: 1970, end: 1980 } };
        cacheManager.cacheResults(filters, largeSamples);
      }
      
      // Should have triggered memory management
      const stats = cacheManager.getCacheStats();
      expect(stats.totalEntries).toBeLessThanOrEqual(10); // Should respect maxSize
      
      const memoryUsage = getMemoryUsage();
      expect(memoryUsage).toBeLessThan(50 * 1024 * 1024); // Should be under 50MB
    });
  });

  describe('Memory Manager Resource Leaks', () => {
    it('should not leak resources with repeated registrations', () => {
      const iterations = 100;
      const elements = createMockElements(10);
      
      for (let i = 0; i < iterations; i++) {
        // Register various resource types
        elements.forEach((element, index) => {
          memoryManager.registerResource('image', element);
          memoryManager.registerResource('timer', setTimeout(() => {}, 1000));
          
          if (index % 2 === 0) {
            memoryManager.unregisterResource('image', element);
          }
        });
        
        // Periodic cleanup
        if (i % 10 === 0) {
          memoryManager.cleanup(true);
        }
      }
      
      const stats = memoryManager.getMemoryStats();
      
      // Should not have excessive resources
      expect(stats.managedResources).toBeLessThan(200);
      expect(stats.currentUsage).toBeLessThan(10 * 1024 * 1024); // Under 10MB
    });

    it('should clean up audio contexts properly', async () => {
      const audioContexts = [];
      
      // Create and register multiple audio contexts
      for (let i = 0; i < 10; i++) {
        const mockAudioContext = {
          state: 'running',
          close: vi.fn().mockResolvedValue(undefined),
          constructor: { name: 'AudioContext' }
        };
        
        audioContexts.push(mockAudioContext);
        memoryManager.registerResource('audio', mockAudioContext);
      }
      
      let stats = memoryManager.getMemoryStats();
      expect(stats.audioContexts).toBe(10);
      
      // Mark some as closed
      audioContexts.slice(0, 5).forEach(ctx => {
        ctx.state = 'closed';
      });
      
      // Cleanup should remove closed contexts
      const cleanedCount = memoryManager.cleanupUnusedAudioContexts();
      expect(cleanedCount).toBe(5);
      
      stats = memoryManager.getMemoryStats();
      expect(stats.audioContexts).toBe(5);
    });

    it('should handle event listener cleanup', () => {
      const elements = createMockElements(20);
      
      // Register event listeners
      elements.forEach(element => {
        const listenerInfo = {
          element,
          event: 'click',
          handler: () => {},
          options: false
        };
        
        memoryManager.registerResource('eventListener', listenerInfo);
      });
      
      let stats = memoryManager.getMemoryStats();
      expect(stats.eventListeners).toBe(20);
      
      // Cleanup should remove old listeners
      memoryManager.cleanupOldEventListeners();
      
      // Verify removeEventListener was called
      elements.forEach(element => {
        expect(element.removeEventListener).toHaveBeenCalled();
      });
    });
  });

  describe('Lazy Loading Memory Leaks', () => {
    it('should not leak memory with many observed elements', () => {
      const elements = createMockElements(100);
      
      // Observe all elements
      elements.forEach(element => {
        lazyLoader.observeElement(element, {
          type: 'image',
          src: `image_${Math.random()}.jpg`
        });
      });
      
      let stats = lazyLoader.getStats();
      expect(stats.totalElements).toBe(100);
      expect(stats.pendingElements).toBe(100);
      
      // Mark half as loaded
      elements.slice(0, 50).forEach(element => {
        lazyLoader.markAsLoaded(element, { startTime: Date.now() - 100 });
      });
      
      // Mark some as failed
      elements.slice(50, 70).forEach(element => {
        lazyLoader.markAsFailed(element, { startTime: Date.now() - 100 }, new Error('Load failed'));
      });
      
      stats = lazyLoader.getStats();
      expect(stats.loadedElements).toBe(50);
      expect(stats.failedElements).toBe(20);
      expect(stats.pendingElements).toBe(30);
      
      // Reset should clean everything
      lazyLoader.reset();
      
      stats = lazyLoader.getStats();
      expect(stats.totalElements).toBe(0);
      expect(stats.pendingElements).toBe(0);
    });

    it('should limit load times array growth', () => {
      // Add many load times
      for (let i = 0; i < 200; i++) {
        const element = createMockElements(1)[0];
        lazyLoader.markAsLoaded(element, { startTime: Date.now() - 100 });
      }
      
      const stats = lazyLoader.getStats();
      expect(stats.loadTimes.length).toBeLessThanOrEqual(50); // Should be limited
      expect(stats.loadedElements).toBe(200); // But count should be accurate
    });

    it('should handle preloading without memory leaks', async () => {
      const imageUrls = Array.from({ length: 50 }, (_, i) => `image_${i}.jpg`);
      
      // Mock Image constructor for successful loading
      global.Image = vi.fn().mockImplementation(() => {
        const img = {
          onload: null,
          onerror: null,
          src: ''
        };
        
        setTimeout(() => {
          if (img.onload) img.onload();
        }, 10);
        
        return img;
      });
      
      const results = await lazyLoader.preloadImages(imageUrls);
      
      expect(results).toHaveLength(50);
      expect(results.every(result => result.status === 'fulfilled')).toBe(true);
      
      // Should not have excessive memory usage
      const memoryUsage = getMemoryUsage();
      expect(memoryUsage).toBeLessThan(5 * 1024 * 1024); // Under 5MB
    });
  });

  describe('Integration Memory Leaks', () => {
    it('should handle combined usage without memory leaks', async () => {
      const samples = createMockSamples(100);
      const elements = createMockElements(50);
      
      // Simulate realistic usage pattern
      for (let cycle = 0; cycle < 10; cycle++) {
        // Cache operations
        for (let i = 0; i < 10; i++) {
          const filters = {
            genres: [`Genre${i % 3}`],
            yearRange: { start: 1970 + (i % 5), end: 1980 + (i % 5) }
          };
          cacheManager.cacheResults(filters, samples);
        }
        
        // Memory management operations
        elements.forEach(element => {
          memoryManager.registerResource('image', element);
          lazyLoader.observeElement(element, {
            type: 'image',
            src: `image_${cycle}_${Math.random()}.jpg`
          });
        });
        
        // Simulate some loading completion
        elements.slice(0, 25).forEach(element => {
          lazyLoader.markAsLoaded(element, { startTime: Date.now() - 100 });
          memoryManager.unregisterResource('image', element);
        });
        
        // Periodic cleanup
        if (cycle % 3 === 0) {
          cacheManager.cleanup(true);
          memoryManager.cleanup(true);
          lazyLoader.reset();
        }
      }
      
      // Final cleanup
      cacheManager.cleanup(true);
      memoryManager.cleanup(true);
      
      // Check final memory usage
      const finalMemoryUsage = getMemoryUsage();
      const memoryGrowth = finalMemoryUsage - initialMemoryUsage;
      
      // Should not have significant memory growth
      expect(memoryGrowth).toBeLessThan(20 * 1024 * 1024); // Under 20MB
      
      // Verify cleanup effectiveness
      const cacheStats = cacheManager.getCacheStats();
      const memoryStats = memoryManager.getMemoryStats();
      const lazyStats = lazyLoader.getStats();
      
      expect(cacheStats.totalEntries).toBeLessThanOrEqual(10);
      expect(memoryStats.managedResources).toBeLessThan(100);
      expect(lazyStats.pendingElements).toBe(0);
    });

    it('should handle rapid creation and destruction cycles', () => {
      const cycles = 20;
      
      for (let i = 0; i < cycles; i++) {
        // Create temporary managers
        const tempCache = new DiscoveryCacheManager({ maxSize: 5 });
        const tempMemory = new DiscoveryMemoryManager({ cleanupInterval: 50 });
        const tempLazy = new LazyLoadingManager();
        
        // Use them briefly
        const samples = createMockSamples(10);
        const elements = createMockElements(5);
        
        tempCache.cacheResults({ genres: ['Test'] }, samples);
        elements.forEach(element => {
          tempMemory.registerResource('image', element);
          tempLazy.observeElement(element);
        });
        
        // Destroy immediately
        tempCache.destroy();
        tempMemory.destroy();
        tempLazy.destroy();
      }
      
      // Should not have accumulated significant memory
      const finalMemoryUsage = getMemoryUsage();
      const memoryGrowth = finalMemoryUsage - initialMemoryUsage;
      
      expect(memoryGrowth).toBeLessThan(5 * 1024 * 1024); // Under 5MB
    });
  });

  describe('Performance Under Memory Pressure', () => {
    it('should maintain performance with limited memory', async () => {
      // Simulate memory pressure by creating large datasets
      const largeSamples = createMockSamples(500);
      const manyElements = createMockElements(200);
      
      const startTime = Date.now();
      
      // Perform operations under memory pressure
      for (let i = 0; i < 50; i++) {
        const filters = { genres: [`Genre${i % 5}`], yearRange: { start: 1970, end: 1980 } };
        cacheManager.cacheResults(filters, largeSamples);
        
        manyElements.slice(i * 4, (i + 1) * 4).forEach(element => {
          memoryManager.registerResource('image', element);
          lazyLoader.observeElement(element);
        });
        
        // Force cleanup every 10 iterations
        if (i % 10 === 0) {
          cacheManager.cleanup(true);
          memoryManager.cleanup(true);
        }
      }
      
      const operationTime = Date.now() - startTime;
      
      // Should complete in reasonable time even under pressure
      expect(operationTime).toBeLessThan(5000); // Under 5 seconds
      
      // Memory should be managed
      const finalMemoryUsage = getMemoryUsage();
      expect(finalMemoryUsage).toBeLessThan(50 * 1024 * 1024); // Under 50MB
    });
  });
});