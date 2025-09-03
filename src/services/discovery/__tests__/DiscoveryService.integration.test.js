/**
 * @fileoverview Integration tests for DiscoveryService fallback chain
 * Tests real interactions between services and fallback behavior
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { DiscoveryService } from '../DiscoveryService.js';

describe('DiscoveryService Integration', () => {
  let discoveryService;

  beforeEach(() => {
    discoveryService = new DiscoveryService();
  });

  afterEach(() => {
    discoveryService.cleanup();
  });

  describe('fallback chain integration', () => {
    it('should successfully fallback from API to mock when API fails', async () => {
      // Force API to fail by using invalid configuration
      discoveryService.youtubeService.apiKey = 'invalid_key';
      
      const filters = {
        genres: ['Soul'],
        yearRange: { start: 1960, end: 1980 }
      };

      const result = await discoveryService.discoverSamples(filters);
      
      // Should get mock data
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      
      // Verify it's mock data
      expect(result[0]).toHaveProperty('isMock', true);
      expect(result[0]).toHaveProperty('id');
      expect(result[0].id).toMatch(/^mock-/);
    });

    it('should use cache when available and skip API', async () => {
      const filters = {
        genres: ['Jazz'],
        yearRange: { start: 1950, end: 1970 }
      };

      // First request - should populate cache (will use mock due to invalid API key)
      discoveryService.youtubeService.apiKey = 'invalid_key';
      const firstResult = await discoveryService.discoverSamples(filters);
      
      // Manually cache some data to test cache retrieval
      const cachedSamples = [
        {
          id: 'cached-sample-1',
          title: 'Cached Sample',
          artist: 'Cache Artist',
          year: 1965,
          genre: 'Jazz',
          duration: 200,
          youtubeId: 'cached123',
          thumbnailUrl: 'https://example.com/cached.jpg',
          tempo: 130,
          instruments: ['piano', 'bass'],
          tags: ['cached'],
          isMock: false
        }
      ];
      
      discoveryService.cacheManager.cacheResults(filters, cachedSamples);
      
      // Second request - should use cache
      const secondResult = await discoveryService.discoverSamples(filters);
      
      expect(secondResult).toEqual(cachedSamples);
    });

    it('should handle service health degradation', async () => {
      const filters = { genres: ['Funk'] };
      
      // Simulate multiple API failures to trigger health degradation
      discoveryService.youtubeService.apiKey = 'invalid_key';
      
      for (let i = 0; i < 3; i++) {
        try {
          await discoveryService.discoverSamples(filters);
        } catch (error) {
          // Some requests might fail during health degradation
        }
      }
      
      const health = discoveryService.getServiceHealth();
      
      // YouTube service should be marked as degraded or unhealthy
      expect(health.youtube.failureCount).toBeGreaterThan(0);
      expect(health.overall).toMatch(/degraded|unhealthy/);
    });

    it('should recover service health after successful requests', async () => {
      const filters = { genres: ['Soul'] };
      
      // First, degrade the service health
      discoveryService._updateServiceHealth('youtube', false);
      discoveryService._updateServiceHealth('youtube', false);
      discoveryService._updateServiceHealth('youtube', false);
      
      let health = discoveryService.getServiceHealth();
      expect(health.youtube.available).toBe(false);
      
      // Now make a successful request (will use mock)
      const result = await discoveryService.discoverSamples(filters);
      expect(result).toBeDefined();
      
      // Simulate successful API recovery
      discoveryService._updateServiceHealth('youtube', true);
      
      health = discoveryService.getServiceHealth();
      expect(health.youtube.available).toBe(true);
      expect(health.youtube.failureCount).toBe(0);
    });
  });

  describe('real data validation', () => {
    it('should validate mock sample data structure', async () => {
      const filters = { genres: ['Blues'] };
      const result = await discoveryService.discoverSamples(filters);
      
      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);
      
      // Validate sample structure
      const sample = result[0];
      expect(sample).toHaveProperty('id');
      expect(sample).toHaveProperty('title');
      expect(sample).toHaveProperty('artist');
      expect(sample).toHaveProperty('year');
      expect(sample).toHaveProperty('genre');
      expect(sample).toHaveProperty('duration');
      expect(sample).toHaveProperty('youtubeId');
      expect(sample).toHaveProperty('thumbnailUrl');
      expect(sample).toHaveProperty('tempo');
      expect(sample).toHaveProperty('instruments');
      expect(sample).toHaveProperty('tags');
      expect(sample).toHaveProperty('isMock');
      
      // Validate data types
      expect(typeof sample.id).toBe('string');
      expect(typeof sample.title).toBe('string');
      expect(typeof sample.artist).toBe('string');
      expect(typeof sample.year).toBe('number');
      expect(typeof sample.genre).toBe('string');
      expect(typeof sample.duration).toBe('number');
      expect(Array.isArray(sample.instruments)).toBe(true);
      expect(Array.isArray(sample.tags)).toBe(true);
      expect(typeof sample.isMock).toBe('boolean');
    });

    it('should filter samples correctly by genre', async () => {
      const soulFilters = { genres: ['Soul'] };
      const jazzFilters = { genres: ['Jazz'] };
      
      const soulSamples = await discoveryService.discoverSamples(soulFilters);
      const jazzSamples = await discoveryService.discoverSamples(jazzFilters);
      
      // Verify genre filtering
      soulSamples.forEach(sample => {
        expect(sample.genre).toBe('Soul');
      });
      
      jazzSamples.forEach(sample => {
        expect(sample.genre).toBe('Jazz');
      });
    });

    it('should filter samples correctly by year range', async () => {
      const filters = {
        genres: ['Soul', 'Jazz'],
        yearRange: { start: 1960, end: 1970 }
      };
      
      const result = await discoveryService.discoverSamples(filters);
      
      result.forEach(sample => {
        expect(sample.year).toBeGreaterThanOrEqual(1960);
        expect(sample.year).toBeLessThanOrEqual(1970);
      });
    });
  });

  describe('performance and caching integration', () => {
    it('should cache and retrieve results efficiently', async () => {
      const filters = { genres: ['Afrobeat'] };
      
      // First request - should be slower (mock generation)
      const start1 = performance.now();
      const result1 = await discoveryService.discoverSamples(filters);
      const duration1 = performance.now() - start1;
      
      // Cache the results manually to ensure they're cached
      discoveryService.cacheManager.cacheResults(filters, result1);
      
      // Second request - should be faster (cached)
      const start2 = performance.now();
      const result2 = await discoveryService.discoverSamples(filters);
      const duration2 = performance.now() - start2;
      
      expect(result2).toEqual(result1);
      // Cache retrieval should be significantly faster
      expect(duration2).toBeLessThan(duration1);
    });

    it('should handle cache invalidation correctly', async () => {
      const filters = { genres: ['Funk'] };
      
      // Get initial results and cache them
      const result1 = await discoveryService.discoverSamples(filters);
      discoveryService.cacheManager.cacheResults(filters, result1);
      
      // Verify cache hit
      const cachedResult = discoveryService.cacheManager.getCachedResults(filters);
      expect(cachedResult).toEqual(result1);
      
      // Clear cache
      await discoveryService.clearCache();
      
      // Verify cache is cleared
      const clearedResult = discoveryService.cacheManager.getCachedResults(filters);
      expect(clearedResult).toBeNull();
    });
  });

  describe('error handling integration', () => {
    it('should handle network-like errors gracefully', async () => {
      // Simulate network error by making YouTube service throw
      const originalSearchSamples = discoveryService.youtubeService.searchSamples;
      discoveryService.youtubeService.searchSamples = vi.fn().mockRejectedValue(
        new Error('Network timeout')
      );
      
      const filters = { genres: ['Soul'] };
      
      // Should still return results from mock provider
      const result = await discoveryService.discoverSamples(filters);
      
      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);
      expect(result[0].isMock).toBe(true);
      
      // Restore original method
      discoveryService.youtubeService.searchSamples = originalSearchSamples;
    });

    it('should handle partial service failures', async () => {
      // Simulate cache failure but keep other services working
      const originalGetCachedResults = discoveryService.cacheManager.getCachedResults;
      discoveryService.cacheManager.getCachedResults = vi.fn().mockImplementation(() => {
        throw new Error('Cache storage error');
      });
      
      const filters = { genres: ['Jazz'] };
      
      // Should still work by skipping cache and using mock
      const result = await discoveryService.discoverSamples(filters);
      
      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);
      
      // Restore original method
      discoveryService.cacheManager.getCachedResults = originalGetCachedResults;
    });
  });

  describe('sample details integration', () => {
    it('should get mock sample details correctly', async () => {
      // First get some samples
      const filters = { genres: ['Blues'] };
      const samples = await discoveryService.discoverSamples(filters);
      
      expect(samples.length).toBeGreaterThan(0);
      
      // Get details for the first sample
      const sampleId = samples[0].id;
      const details = await discoveryService.getSampleDetails(sampleId);
      
      expect(details).toBeDefined();
      expect(details.id).toBe(sampleId);
      expect(details).toHaveProperty('title');
      expect(details).toHaveProperty('artist');
      expect(details).toHaveProperty('genre');
    });
  });

  describe('service health monitoring integration', () => {
    it('should provide accurate health status', async () => {
      const health = await discoveryService.refreshServiceHealth();
      
      expect(health).toHaveProperty('youtube');
      expect(health).toHaveProperty('cache');
      expect(health).toHaveProperty('mock');
      expect(health).toHaveProperty('overall');
      
      // Mock service should always be available
      expect(health.mock.available).toBe(true);
      
      // Cache should be available (no external dependencies)
      expect(health.cache.available).toBe(true);
      
      // Overall health should be at least degraded (since mock is always available)
      expect(['healthy', 'degraded']).toContain(health.overall);
    });
  });
});