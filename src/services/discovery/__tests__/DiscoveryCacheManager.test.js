/**
 * @jest-environment jsdom
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import DiscoveryCacheManager from '../DiscoveryCacheManager.js';

describe('DiscoveryCacheManager', () => {
  let cacheManager;
  let mockSamples;
  let mockFilters;

  beforeEach(() => {
    // Mock console methods
    vi.spyOn(console, 'debug').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    
    cacheManager = new DiscoveryCacheManager({
      ttl: 1000, // 1 second for testing
      maxSize: 5,
      cleanupInterval: 100,
      memoryThreshold: 1024 * 1024 // 1MB
    });

    mockSamples = [
      {
        id: '1',
        title: 'Test Sample 1',
        artist: 'Test Artist',
        year: 1970,
        genre: 'Soul',
        youtubeId: 'test1'
      },
      {
        id: '2',
        title: 'Test Sample 2',
        artist: 'Test Artist 2',
        year: 1975,
        genre: 'Jazz',
        youtubeId: 'test2'
      }
    ];

    mockFilters = {
      genres: ['Soul', 'Jazz'],
      yearRange: { start: 1970, end: 1980 }
    };
  });

  afterEach(() => {
    if (cacheManager) {
      cacheManager.destroy();
    }
    vi.restoreAllMocks();
  });

  describe('Cache Key Generation', () => {
    it('should generate consistent cache keys for same filters', () => {
      const key1 = cacheManager.generateCacheKey(mockFilters);
      const key2 = cacheManager.generateCacheKey(mockFilters);
      
      expect(key1).toBe(key2);
    });

    it('should generate different keys for different filters', () => {
      const filters1 = { genres: ['Soul'], yearRange: { start: 1970, end: 1980 } };
      const filters2 = { genres: ['Jazz'], yearRange: { start: 1970, end: 1980 } };
      
      const key1 = cacheManager.generateCacheKey(filters1);
      const key2 = cacheManager.generateCacheKey(filters2);
      
      expect(key1).not.toBe(key2);
    });

    it('should normalize filter order', () => {
      const filters1 = { genres: ['Soul', 'Jazz'], yearRange: { start: 1970, end: 1980 } };
      const filters2 = { genres: ['Jazz', 'Soul'], yearRange: { start: 1970, end: 1980 } };
      
      const key1 = cacheManager.generateCacheKey(filters1);
      const key2 = cacheManager.generateCacheKey(filters2);
      
      expect(key1).toBe(key2);
    });
  });

  describe('Cache Operations', () => {
    it('should cache and retrieve results', () => {
      cacheManager.cacheResults(mockFilters, mockSamples);
      const cached = cacheManager.getCachedResults(mockFilters);
      
      expect(cached).toEqual(mockSamples);
    });

    it('should return null for non-existent cache entries', () => {
      const nonExistentFilters = { genres: ['Blues'], yearRange: { start: 1960, end: 1970 } };
      const cached = cacheManager.getCachedResults(nonExistentFilters);
      
      expect(cached).toBeNull();
    });

    it('should respect TTL and expire entries', async () => {
      cacheManager.cacheResults(mockFilters, mockSamples, 50); // 50ms TTL
      
      // Should be cached immediately
      let cached = cacheManager.getCachedResults(mockFilters);
      expect(cached).toEqual(mockSamples);
      
      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Should be expired
      cached = cacheManager.getCachedResults(mockFilters);
      expect(cached).toBeNull();
    });

    it('should invalidate specific cache entries', () => {
      cacheManager.cacheResults(mockFilters, mockSamples);
      
      // Verify cached
      let cached = cacheManager.getCachedResults(mockFilters);
      expect(cached).toEqual(mockSamples);
      
      // Invalidate
      cacheManager.invalidateCache(mockFilters);
      
      // Should be gone
      cached = cacheManager.getCachedResults(mockFilters);
      expect(cached).toBeNull();
    });

    it('should clear entire cache', () => {
      const filters1 = { genres: ['Soul'], yearRange: { start: 1970, end: 1980 } };
      const filters2 = { genres: ['Jazz'], yearRange: { start: 1970, end: 1980 } };
      
      cacheManager.cacheResults(filters1, mockSamples);
      cacheManager.cacheResults(filters2, mockSamples);
      
      // Both should be cached
      expect(cacheManager.getCachedResults(filters1)).toEqual(mockSamples);
      expect(cacheManager.getCachedResults(filters2)).toEqual(mockSamples);
      
      // Clear all
      cacheManager.invalidateCache();
      
      // Both should be gone
      expect(cacheManager.getCachedResults(filters1)).toBeNull();
      expect(cacheManager.getCachedResults(filters2)).toBeNull();
    });
  });

  describe('Memory Management', () => {
    it('should enforce maximum cache size', () => {
      // Add more entries than max size
      for (let i = 0; i < 10; i++) {
        const filters = { genres: [`Genre${i}`], yearRange: { start: 1970, end: 1980 } };
        cacheManager.cacheResults(filters, mockSamples);
      }
      
      const stats = cacheManager.getCacheStats();
      expect(stats.totalEntries).toBeLessThanOrEqual(5); // maxSize is 5
    });

    it('should remove oldest entries when enforcing size limits', () => {
      const oldFilters = { genres: ['Old'], yearRange: { start: 1970, end: 1980 } };
      cacheManager.cacheResults(oldFilters, mockSamples);
      
      // Add delay to ensure timestamp difference
      setTimeout(() => {
        // Fill cache to max
        for (let i = 0; i < 5; i++) {
          const filters = { genres: [`New${i}`], yearRange: { start: 1970, end: 1980 } };
          cacheManager.cacheResults(filters, mockSamples);
        }
        
        // Old entry should be removed
        const cached = cacheManager.getCachedResults(oldFilters);
        expect(cached).toBeNull();
      }, 10);
    });

    it('should estimate data size correctly', () => {
      const size = cacheManager.estimateDataSize(mockSamples);
      expect(size).toBeGreaterThan(0);
      expect(typeof size).toBe('number');
    });

    it('should provide accurate cache statistics', () => {
      cacheManager.cacheResults(mockFilters, mockSamples);
      
      const stats = cacheManager.getCacheStats();
      expect(stats).toHaveProperty('totalEntries');
      expect(stats).toHaveProperty('validEntries');
      expect(stats).toHaveProperty('expiredEntries');
      expect(stats).toHaveProperty('totalMemoryUsage');
      expect(stats).toHaveProperty('averageEntrySize');
      
      expect(stats.totalEntries).toBe(1);
      expect(stats.validEntries).toBe(1);
      expect(stats.expiredEntries).toBe(0);
    });
  });

  describe('Cleanup Operations', () => {
    it('should remove expired entries during cleanup', async () => {
      // Create a cache manager with larger size limit to avoid interference
      const testCacheManager = new DiscoveryCacheManager({
        ttl: 1000,
        maxSize: 20,
        cleanupInterval: 1000, // Disable automatic cleanup
        memoryThreshold: 10 * 1024 * 1024
      });
      
      // Add multiple entries with short TTL
      for (let i = 0; i < 5; i++) {
        const filters = { genres: [`Genre${i}`], yearRange: { start: 1970, end: 1980 } };
        testCacheManager.cacheResults(filters, mockSamples, 50); // 50ms TTL
      }
      
      let stats = testCacheManager.getCacheStats();
      expect(stats.totalEntries).toBe(5);
      
      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Trigger cleanup
      testCacheManager.removeExpiredEntries();
      
      stats = testCacheManager.getCacheStats();
      expect(stats.totalEntries).toBe(0);
      
      testCacheManager.destroy();
    });

    it('should handle cleanup errors gracefully', () => {
      // Mock a method to throw an error
      const originalMethod = cacheManager.removeExpiredEntries;
      cacheManager.removeExpiredEntries = vi.fn().mockImplementation(() => {
        throw new Error('Cleanup error');
      });
      
      // Should not throw
      expect(() => cacheManager.cleanup()).not.toThrow();
      
      // Restore original method
      cacheManager.removeExpiredEntries = originalMethod;
    });
  });

  describe('Preloading', () => {
    it('should preload common filter combinations', async () => {
      const commonFilters = [
        { genres: ['Soul'], yearRange: { start: 1970, end: 1980 } },
        { genres: ['Jazz'], yearRange: { start: 1970, end: 1980 } }
      ];
      
      const mockDataProvider = vi.fn().mockResolvedValue(mockSamples);
      
      await cacheManager.preloadCommonFilters(commonFilters, mockDataProvider);
      
      // Should have called data provider for each filter
      expect(mockDataProvider).toHaveBeenCalledTimes(2);
      
      // Results should be cached
      for (const filters of commonFilters) {
        const cached = cacheManager.getCachedResults(filters);
        expect(cached).toEqual(mockSamples);
      }
    });

    it('should handle preloading errors gracefully', async () => {
      const commonFilters = [
        { genres: ['Soul'], yearRange: { start: 1970, end: 1980 } }
      ];
      
      const mockDataProvider = vi.fn().mockRejectedValue(new Error('API Error'));
      
      // Should not throw
      await expect(
        cacheManager.preloadCommonFilters(commonFilters, mockDataProvider)
      ).resolves.not.toThrow();
    });
  });

  describe('Error Handling', () => {
    it('should handle cache operation errors gracefully', () => {
      // Mock JSON.stringify to throw an error
      const originalStringify = JSON.stringify;
      JSON.stringify = vi.fn().mockImplementation(() => {
        throw new Error('Stringify error');
      });
      
      // Should not throw
      expect(() => cacheManager.cacheResults(mockFilters, mockSamples)).not.toThrow();
      expect(() => cacheManager.getCachedResults(mockFilters)).not.toThrow();
      
      // Restore original method
      JSON.stringify = originalStringify;
    });

    it('should handle invalid filter objects', () => {
      const invalidFilters = null;
      
      expect(() => cacheManager.generateCacheKey(invalidFilters)).not.toThrow();
      expect(() => cacheManager.cacheResults(invalidFilters, mockSamples)).not.toThrow();
      expect(() => cacheManager.getCachedResults(invalidFilters)).not.toThrow();
    });
  });

  describe('Performance', () => {
    it('should handle large datasets efficiently', () => {
      const largeSampleSet = Array.from({ length: 1000 }, (_, i) => ({
        id: `sample_${i}`,
        title: `Sample ${i}`,
        artist: `Artist ${i}`,
        year: 1970 + (i % 30),
        genre: ['Soul', 'Jazz', 'Funk'][i % 3],
        youtubeId: `test_${i}`
      }));
      
      const startTime = Date.now();
      cacheManager.cacheResults(mockFilters, largeSampleSet);
      const cacheTime = Date.now() - startTime;
      
      const retrieveStartTime = Date.now();
      const cached = cacheManager.getCachedResults(mockFilters);
      const retrieveTime = Date.now() - retrieveStartTime;
      
      expect(cached).toEqual(largeSampleSet);
      expect(cacheTime).toBeLessThan(100); // Should cache in under 100ms
      expect(retrieveTime).toBeLessThan(50); // Should retrieve in under 50ms
    });

    it('should maintain performance with many cache entries', () => {
      // Add many cache entries
      for (let i = 0; i < 50; i++) {
        const filters = { 
          genres: [`Genre${i}`], 
          yearRange: { start: 1970 + i, end: 1980 + i } 
        };
        cacheManager.cacheResults(filters, mockSamples);
      }
      
      // Operations should still be fast
      const startTime = Date.now();
      const cached = cacheManager.getCachedResults(mockFilters);
      const retrieveTime = Date.now() - startTime;
      
      expect(retrieveTime).toBeLessThan(50);
    });
  });

  describe('Destruction', () => {
    it('should clean up resources on destroy', () => {
      cacheManager.cacheResults(mockFilters, mockSamples);
      
      expect(cacheManager.cache.size).toBeGreaterThan(0);
      
      cacheManager.destroy();
      
      expect(cacheManager.cache.size).toBe(0);
      expect(cacheManager.cleanupTimer).toBeNull();
    });
  });
});