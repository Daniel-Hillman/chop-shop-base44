/**
 * @fileoverview Tests for DiscoveryService - Main orchestration service
 * Tests the fallback chain, service health monitoring, and error handling
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { DiscoveryService } from '../DiscoveryService.js';
import youTubeIntegration from '../YouTubeIntegration.js';
import MockSampleProvider from '../MockSampleProvider.js';
import DiscoveryCacheManager from '../DiscoveryCacheManager.js';

// Mock dependencies
vi.mock('../YouTubeIntegration.js');
vi.mock('../MockSampleProvider.js');
vi.mock('../DiscoveryCacheManager.js');
vi.mock('../DiscoveryErrorService.js');
vi.mock('../DiscoveryPerformanceMonitor.js');

describe('DiscoveryService', () => {
  let discoveryService;
  let mockYouTubeService;
  let mockProvider;
  let mockCacheManager;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();
    
    // Create fresh instance
    discoveryService = new DiscoveryService();
    
    // Get mock instances
    mockYouTubeService = discoveryService.youtubeService;
    mockProvider = discoveryService.mockProvider;
    mockCacheManager = discoveryService.cacheManager;
  });

  afterEach(() => {
    discoveryService.cleanup();
  });

  describe('discoverSamples', () => {
    const mockFilters = {
      genres: ['Soul'],
      yearRange: { start: 1960, end: 1980 }
    };

    const mockSamples = [
      {
        id: 'test-sample-1',
        title: 'Test Sample',
        artist: 'Test Artist',
        year: 1970,
        genre: 'Soul',
        duration: 180,
        youtubeId: 'test123',
        thumbnailUrl: 'https://example.com/thumb.jpg',
        tempo: 120,
        instruments: ['drums', 'bass'],
        tags: ['classic'],
        isMock: false
      }
    ];

    it('should return cached results when available', async () => {
      // Setup mocks
      mockCacheManager.getCachedResults.mockReturnValue(mockSamples);
      
      const result = await discoveryService.discoverSamples(mockFilters);
      
      expect(result).toEqual(mockSamples);
      expect(mockCacheManager.getCachedResults).toHaveBeenCalledWith(mockFilters);
      expect(mockYouTubeService.searchSamples).not.toHaveBeenCalled();
    });

    it('should fallback to API when cache is empty', async () => {
      // Setup mocks
      mockCacheManager.getCachedResults.mockReturnValue(null);
      mockYouTubeService.searchSamples.mockResolvedValue(mockSamples);
      
      const result = await discoveryService.discoverSamples(mockFilters);
      
      expect(result).toEqual(mockSamples);
      expect(mockCacheManager.getCachedResults).toHaveBeenCalled();
      expect(mockYouTubeService.searchSamples).toHaveBeenCalled();
      expect(mockCacheManager.cacheResults).toHaveBeenCalledWith(mockFilters, mockSamples);
    });

    it('should fallback to mock data when API fails', async () => {
      // Setup mocks
      mockCacheManager.getCachedResults.mockReturnValue(null);
      mockYouTubeService.searchSamples.mockRejectedValue(new Error('API Error'));
      mockProvider.generateMockSamples.mockReturnValue(mockSamples);
      
      const result = await discoveryService.discoverSamples(mockFilters);
      
      expect(result).toEqual(mockSamples);
      expect(mockProvider.generateMockSamples).toHaveBeenCalledWith(mockFilters, 12);
    });

    it('should handle forceRefresh option', async () => {
      // Setup mocks
      mockYouTubeService.searchSamples.mockResolvedValue(mockSamples);
      
      const result = await discoveryService.discoverSamples(mockFilters, { forceRefresh: true });
      
      expect(result).toEqual(mockSamples);
      expect(mockCacheManager.getCachedResults).not.toHaveBeenCalled();
      expect(mockYouTubeService.searchSamples).toHaveBeenCalled();
    });

    it('should respect maxResults option', async () => {
      // Setup mocks
      const largeSampleSet = Array(20).fill(null).map((_, i) => ({
        ...mockSamples[0],
        id: `test-sample-${i}`
      }));
      mockCacheManager.getCachedResults.mockReturnValue(largeSampleSet);
      
      const result = await discoveryService.discoverSamples(mockFilters, { maxResults: 5 });
      
      expect(result).toHaveLength(5);
    });

    it('should handle invalid filters gracefully', async () => {
      // Setup mocks
      mockProvider.generateMockSamples.mockReturnValue(mockSamples);
      
      const invalidFilters = { genres: 'invalid' }; // Should be array
      const result = await discoveryService.discoverSamples(invalidFilters);
      
      expect(result).toEqual(mockSamples);
      // Should have called with default filters
      expect(mockProvider.generateMockSamples).toHaveBeenCalledWith(
        expect.objectContaining({
          genres: [],
          yearRange: { start: 1950, end: 1995 }
        }),
        12
      );
    });

    it('should throw error when all sources fail', async () => {
      // Setup mocks to fail
      mockCacheManager.getCachedResults.mockReturnValue(null);
      mockYouTubeService.searchSamples.mockRejectedValue(new Error('API Error'));
      mockProvider.generateMockSamples.mockImplementation(() => {
        throw new Error('Mock Error');
      });
      
      await expect(discoveryService.discoverSamples(mockFilters))
        .rejects.toThrow('All discovery sources failed');
    });
  });

  describe('getSampleDetails', () => {
    it('should get YouTube sample details', async () => {
      const mockSample = {
        id: 'youtube-test123',
        title: 'Test Sample',
        artist: 'Test Artist',
        year: 1970,
        genre: 'Soul'
      };
      
      mockYouTubeService.getVideoDetails.mockResolvedValue(mockSample);
      
      const result = await discoveryService.getSampleDetails('youtube-test123');
      
      expect(result).toEqual(mockSample);
      expect(mockYouTubeService.getVideoDetails).toHaveBeenCalledWith('test123');
    });

    it('should get mock sample details', async () => {
      const mockSample = {
        id: 'mock-soul-001',
        title: 'Mock Sample',
        artist: 'Mock Artist',
        year: 1970,
        genre: 'Soul'
      };
      
      // Mock the internal method
      discoveryService._getMockSampleDetails = vi.fn().mockReturnValue(mockSample);
      
      const result = await discoveryService.getSampleDetails('mock-soul-001');
      
      expect(result).toEqual(mockSample);
    });

    it('should throw error for invalid sample ID', async () => {
      await expect(discoveryService.getSampleDetails('invalid-id'))
        .rejects.toThrow('Unknown sample ID format');
    });

    it('should throw error for missing sample ID', async () => {
      await expect(discoveryService.getSampleDetails())
        .rejects.toThrow('Sample ID is required');
    });
  });

  describe('service health monitoring', () => {
    it('should return service health status', () => {
      const health = discoveryService.getServiceHealth();
      
      expect(health).toHaveProperty('youtube');
      expect(health).toHaveProperty('cache');
      expect(health).toHaveProperty('mock');
      expect(health).toHaveProperty('overall');
      expect(health).toHaveProperty('lastUpdated');
    });

    it('should refresh service health', async () => {
      mockYouTubeService.testConnection.mockResolvedValue(true);
      mockCacheManager.getCacheStats.mockReturnValue({ totalEntries: 5 });
      
      const health = await discoveryService.refreshServiceHealth();
      
      expect(health.youtube.available).toBe(true);
      expect(health.cache.available).toBe(true);
      expect(health.mock.available).toBe(true);
    });

    it('should update health on service failures', async () => {
      // Simulate API failure
      mockCacheManager.getCachedResults.mockReturnValue(null);
      mockYouTubeService.searchSamples.mockRejectedValue(new Error('API Error'));
      mockProvider.generateMockSamples.mockReturnValue([]);
      
      try {
        await discoveryService.discoverSamples({});
      } catch (error) {
        // Expected to fail
      }
      
      const health = discoveryService.getServiceHealth();
      expect(health.youtube.failureCount).toBeGreaterThan(0);
    });
  });

  describe('cache management', () => {
    it('should clear cache', async () => {
      await discoveryService.clearCache();
      
      expect(mockCacheManager.invalidateCache).toHaveBeenCalled();
    });

    it('should get cache stats', () => {
      const mockStats = { totalEntries: 5, validEntries: 3 };
      mockCacheManager.getCacheStats.mockReturnValue(mockStats);
      
      const stats = discoveryService.getCacheStats();
      
      expect(stats).toEqual(mockStats);
    });
  });

  describe('fallback chain building', () => {
    it('should build correct fallback chain for healthy services', () => {
      // All services healthy
      discoveryService.serviceHealth = {
        youtube: { available: true, failureCount: 0 },
        cache: { available: true, failureCount: 0 },
        mock: { available: true, failureCount: 0 }
      };
      
      const chain = discoveryService._buildFallbackChain('auto');
      
      expect(chain).toEqual(['cache', 'api', 'mock']);
    });

    it('should skip unhealthy services in fallback chain', () => {
      // YouTube service unhealthy
      discoveryService.serviceHealth = {
        youtube: { available: false, failureCount: 5 },
        cache: { available: true, failureCount: 0 },
        mock: { available: true, failureCount: 0 }
      };
      
      const chain = discoveryService._buildFallbackChain('auto');
      
      expect(chain).toEqual(['cache', 'mock']);
      expect(chain).not.toContain('api');
    });

    it('should prioritize preferred source', () => {
      const chain = discoveryService._buildFallbackChain('api');
      
      expect(chain[0]).toBe('api');
    });
  });

  describe('error handling', () => {
    it('should handle and transform errors', async () => {
      mockCacheManager.getCachedResults.mockReturnValue(null);
      mockYouTubeService.searchSamples.mockRejectedValue(new Error('Network Error'));
      mockProvider.generateMockSamples.mockImplementation(() => {
        throw new Error('Mock Provider Error');
      });
      
      await expect(discoveryService.discoverSamples({}))
        .rejects.toThrow();
    });
  });

  describe('performance monitoring', () => {
    it('should record performance metrics on success', async () => {
      mockCacheManager.getCachedResults.mockReturnValue([mockSamples[0]]);
      
      await discoveryService.discoverSamples({});
      
      expect(discoveryService.performanceMonitor.recordMetric)
        .toHaveBeenCalledWith('discoveryRequest', expect.objectContaining({
          success: true,
          source: 'cache'
        }));
    });

    it('should record performance metrics on failure', async () => {
      mockCacheManager.getCachedResults.mockReturnValue(null);
      mockYouTubeService.searchSamples.mockRejectedValue(new Error('API Error'));
      mockProvider.generateMockSamples.mockImplementation(() => {
        throw new Error('Mock Error');
      });
      
      try {
        await discoveryService.discoverSamples({});
      } catch (error) {
        // Expected
      }
      
      expect(discoveryService.performanceMonitor.recordMetric)
        .toHaveBeenCalledWith('discoveryRequest', expect.objectContaining({
          success: false
        }));
    });
  });
});