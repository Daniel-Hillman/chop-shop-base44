/**
 * @fileoverview Tests for YouTubeIntegration service
 * Tests YouTube API integration, error handling, rate limiting, and data transformation
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { YouTubeIntegration } from '../YouTubeIntegration.js';
import discoveryErrorService from '../DiscoveryErrorService.js';
import DiscoveryCacheManager from '../DiscoveryCacheManager.js';
import DiscoveryPerformanceMonitor from '../DiscoveryPerformanceMonitor.js';

// Mock dependencies
vi.mock('../DiscoveryErrorService.js');
vi.mock('../DiscoveryCacheManager.js');
vi.mock('../DiscoveryPerformanceMonitor.js');

// Mock environment variables
Object.defineProperty(import.meta, 'env', {
  value: {
    VITE_YOUTUBE_API_KEY: 'test_api_key_123'
  },
  writable: true
});

// Mock fetch
global.fetch = vi.fn();

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn()
};
global.localStorage = localStorageMock;

describe('YouTubeIntegration', () => {
  let youtubeIntegration;
  let mockErrorService;
  let mockCacheManager;
  let mockPerformanceMonitor;

  // Sample YouTube API responses
  const mockSearchResponse = {
    items: [
      {
        id: { videoId: 'test123' },
        snippet: {
          title: 'James Brown - Funky Drummer (1970)',
          channelTitle: 'Soul Classics',
          description: 'Classic funk break from 1970',
          thumbnails: {
            medium: { url: 'https://img.youtube.com/vi/test123/mqdefault.jpg' }
          },
          publishedAt: '2020-01-01T00:00:00Z',
          tags: ['funk', 'soul', 'classic']
        }
      }
    ]
  };

  const mockVideoResponse = {
    items: [
      {
        id: 'test123',
        snippet: {
          title: 'James Brown - Funky Drummer (1970)',
          channelTitle: 'Soul Classics',
          description: 'Classic funk break from 1970, 103 BPM',
          thumbnails: {
            medium: { url: 'https://img.youtube.com/vi/test123/mqdefault.jpg' }
          },
          publishedAt: '2020-01-01T00:00:00Z',
          tags: ['funk', 'soul', 'classic']
        },
        contentDetails: {
          duration: 'PT3M0S'
        },
        statistics: {
          viewCount: '1000000',
          likeCount: '50000'
        }
      }
    ]
  };

  beforeEach(() => {
    vi.clearAllMocks();
    fetch.mockClear();
    
    // Setup mocks
    mockErrorService = {
      handleYouTubeAPIError: vi.fn(error => error)
    };
    mockCacheManager = {
      get: vi.fn(),
      set: vi.fn()
    };
    mockPerformanceMonitor = {
      recordMetric: vi.fn()
    };

    discoveryErrorService.handleYouTubeAPIError = mockErrorService.handleYouTubeAPIError;
    DiscoveryCacheManager.mockImplementation(() => mockCacheManager);
    DiscoveryPerformanceMonitor.mockImplementation(() => mockPerformanceMonitor);

    youtubeIntegration = new YouTubeIntegration();
    // Override the API key for testing
    youtubeIntegration.apiKey = 'test_api_key_123';
    
    // Reset localStorage mock
    localStorageMock.getItem.mockReturnValue(null);
    localStorageMock.setItem.mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Constructor and Initialization', () => {
    it('should initialize with correct configuration', () => {
      expect(youtubeIntegration.apiKey).toBe('test_api_key_123');
      expect(youtubeIntegration.baseUrl).toBe('https://www.googleapis.com/youtube/v3');
      expect(youtubeIntegration.rateLimiter.requestsPerSecond).toBe(10);
      expect(youtubeIntegration.rateLimiter.requestsPerDay).toBe(10000);
    });

    it('should initialize rate limiter with correct defaults', () => {
      expect(youtubeIntegration.rateLimiter.currentRequests).toBe(0);
      expect(youtubeIntegration.rateLimiter.dailyRequests).toBe(0);
      expect(youtubeIntegration.rateLimiter.lastRequestTime).toBe(0);
    });

    it('should load daily quota from localStorage if available', () => {
      const today = new Date().toDateString();
      localStorageMock.getItem.mockReturnValue(JSON.stringify({
        date: today,
        requests: 50
      }));

      const integration = new YouTubeIntegration();
      expect(integration.rateLimiter.dailyRequests).toBe(50);
    });

    it('should not load outdated quota from localStorage', () => {
      const yesterday = new Date(Date.now() - 86400000).toDateString();
      localStorageMock.getItem.mockReturnValue(JSON.stringify({
        date: yesterday,
        requests: 50
      }));

      const integration = new YouTubeIntegration();
      expect(integration.rateLimiter.dailyRequests).toBe(0);
    });
  });

  describe('API Configuration', () => {
    it('should detect when API is properly configured', () => {
      expect(youtubeIntegration.isConfigured()).toBe(true);
    });

    it('should detect when API key is not configured', () => {
      youtubeIntegration.apiKey = 'your_youtube_api_key_here';
      expect(youtubeIntegration.isConfigured()).toBe(false);
    });

    it('should detect when API key is missing', () => {
      youtubeIntegration.apiKey = null;
      expect(youtubeIntegration.isConfigured()).toBe(false);
    });
  });

  describe('searchSamples', () => {
    beforeEach(() => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockSearchResponse)
      }).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockVideoResponse)
      });
    });

    it('should search for samples successfully', async () => {
      mockCacheManager.get.mockResolvedValue(null);
      
      const searchParams = {
        genres: ['Soul'],
        yearRange: { start: 1960, end: 1980 },
        maxResults: 12
      };

      const results = await youtubeIntegration.searchSamples(searchParams);

      expect(results).toHaveLength(1);
      expect(results[0]).toMatchObject({
        id: 'youtube-test123',
        title: 'James Brown - Funky Drummer',
        artist: 'James Brown',
        year: 1970,
        genre: 'Soul',
        duration: 180,
        youtubeId: 'test123',
        isMock: false
      });
    });

    it('should return cached results when available', async () => {
      const cachedResults = [{ id: 'cached-sample', title: 'Cached Sample' }];
      mockCacheManager.get.mockResolvedValue(cachedResults);

      const results = await youtubeIntegration.searchSamples({});

      expect(results).toBe(cachedResults);
      expect(fetch).not.toHaveBeenCalled();
      expect(mockPerformanceMonitor.recordMetric).toHaveBeenCalledWith('apiCall', {
        duration: expect.any(Number),
        cached: true,
        success: true,
        apiName: 'youtube'
      });
    });

    it('should throw error when API key is not configured', async () => {
      youtubeIntegration.apiKey = 'your_youtube_api_key_here';

      await expect(youtubeIntegration.searchSamples({}))
        .rejects.toThrow('YouTube API key not configured');
    });

    it('should handle API errors gracefully', async () => {
      // Clear any previous mock setups
      fetch.mockClear();
      
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
        json: () => Promise.resolve({
          error: { message: 'API key invalid' }
        })
      });

      mockCacheManager.get.mockResolvedValue(null);
      const apiError = new Error('YouTube API error: 403 - API key invalid');
      mockErrorService.handleYouTubeAPIError.mockReturnValue(apiError);

      await expect(youtubeIntegration.searchSamples({}))
        .rejects.toThrow('YouTube API error: 403 - API key invalid');

      expect(mockErrorService.handleYouTubeAPIError).toHaveBeenCalled();
    });

    it('should handle empty search results', async () => {
      // Clear any previous mock setups
      fetch.mockClear();
      
      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ items: [] })
      });

      mockCacheManager.get.mockResolvedValue(null);

      await expect(youtubeIntegration.searchSamples({}))
        .rejects.toThrow('No samples found for the specified criteria');
    });

    it('should cache successful results', async () => {
      mockCacheManager.get.mockResolvedValue(null);

      await youtubeIntegration.searchSamples({});

      expect(mockCacheManager.set).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Array),
        300000 // 5 minutes
      );
    });
  });

  describe('getVideoDetails', () => {
    beforeEach(() => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockVideoResponse)
      });
    });

    it('should get video details successfully', async () => {
      mockCacheManager.get.mockResolvedValue(null);

      const result = await youtubeIntegration.getVideoDetails('test123');

      expect(result).toMatchObject({
        id: 'youtube-test123',
        title: 'James Brown - Funky Drummer',
        artist: 'James Brown',
        youtubeId: 'test123',
        duration: 180
      });
    });

    it('should return cached video details when available', async () => {
      const cachedResult = { id: 'cached-video', title: 'Cached Video' };
      mockCacheManager.get.mockResolvedValue(cachedResult);

      const result = await youtubeIntegration.getVideoDetails('test123');

      expect(result).toBe(cachedResult);
      expect(fetch).not.toHaveBeenCalled();
    });

    it('should handle video not found', async () => {
      // Clear any previous mock setups
      fetch.mockClear();
      
      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ items: [] })
      });

      mockCacheManager.get.mockResolvedValue(null);

      await expect(youtubeIntegration.getVideoDetails('nonexistent'))
        .rejects.toThrow('Video not found: nonexistent');
    });
  });

  describe('Rate Limiting', () => {
    it('should track daily requests correctly', async () => {
      fetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockSearchResponse)
      }).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockVideoResponse)
      });

      mockCacheManager.get.mockResolvedValue(null);

      const initialRequests = youtubeIntegration.rateLimiter.dailyRequests;
      await youtubeIntegration.searchSamples({});
      
      // Should increment by 2 (search + video details)
      expect(youtubeIntegration.rateLimiter.dailyRequests).toBe(initialRequests + 2);
    });

    it('should throw error when daily quota is exceeded', async () => {
      youtubeIntegration.rateLimiter.dailyRequests = 10000;

      await expect(youtubeIntegration.searchSamples({}))
        .rejects.toThrow('Daily YouTube API quota exceeded');
    });

    it('should reset daily quota at midnight', () => {
      const resetTime = youtubeIntegration.rateLimiter.dailyResetTime;
      const tomorrow = new Date();
      tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
      tomorrow.setUTCHours(0, 0, 0, 0);

      expect(resetTime).toBeCloseTo(tomorrow.getTime(), -1000); // Within 1 second
    });

    it('should provide rate limit status', () => {
      youtubeIntegration.rateLimiter.dailyRequests = 100;
      
      const status = youtubeIntegration.getRateLimitStatus();
      
      expect(status).toMatchObject({
        dailyRequests: 100,
        dailyLimit: 10000,
        remainingRequests: 9900,
        resetTime: expect.any(String)
      });
    });
  });

  describe('Data Transformation', () => {
    it('should extract year from title correctly', () => {
      const video = {
        id: 'test',
        snippet: {
          title: 'James Brown - Funky Drummer (1970)',
          channelTitle: 'Test Channel',
          description: 'Classic track',
          thumbnails: { medium: { url: 'test.jpg' } }
        },
        contentDetails: { duration: 'PT3M0S' },
        statistics: {}
      };

      const result = youtubeIntegration._transformToSampleData([video]);
      expect(result[0].year).toBe(1970);
    });

    it('should extract tempo from description', () => {
      const video = {
        id: 'test',
        snippet: {
          title: 'Test Song',
          channelTitle: 'Test Channel',
          description: 'Great track at 120 BPM',
          thumbnails: { medium: { url: 'test.jpg' } }
        },
        contentDetails: { duration: 'PT3M0S' },
        statistics: {}
      };

      const result = youtubeIntegration._transformToSampleData([video]);
      expect(result[0].tempo).toBe(120);
    });

    it('should parse duration correctly', () => {
      expect(youtubeIntegration._parseDuration('PT3M30S')).toBe(210);
      expect(youtubeIntegration._parseDuration('PT1H2M3S')).toBe(3723);
      expect(youtubeIntegration._parseDuration('PT45S')).toBe(45);
      expect(youtubeIntegration._parseDuration('PT2M')).toBe(120);
    });

    it('should determine genre from search params', () => {
      const video = {
        id: 'test',
        snippet: {
          title: 'Test Jazz Song',
          channelTitle: 'Test Channel',
          description: 'Test jazz description',
          thumbnails: { medium: { url: 'test.jpg' } }
        },
        contentDetails: { duration: 'PT3M0S' },
        statistics: {}
      };

      const searchParams = { genres: ['Jazz'] };
      const result = youtubeIntegration._transformToSampleData([video], searchParams);
      expect(result[0].genre).toBe('Jazz');
    });

    it('should extract instruments from text', () => {
      const instruments = youtubeIntegration._extractInstruments(
        'Amazing drums and bass performance',
        'Features piano and saxophone'
      );
      
      expect(instruments).toContain('drums');
      expect(instruments).toContain('bass');
      expect(instruments).toContain('piano');
      expect(instruments).toContain('saxophone');
    });

    it('should clean title properly', () => {
      const title = 'James Brown - Funky Drummer [Official Video] (1970)';
      const cleaned = youtubeIntegration._cleanTitle(title);
      expect(cleaned).toBe('James Brown - Funky Drummer');
    });

    it('should extract artist from title', () => {
      const artist = youtubeIntegration._extractArtist(
        'Miles Davis - So What',
        'Jazz Channel'
      );
      expect(artist).toBe('Miles Davis');
    });

    it('should fallback to channel title for artist', () => {
      const artist = youtubeIntegration._extractArtist(
        'Amazing Jazz Performance',
        'Blue Note Records'
      );
      expect(artist).toBe('Blue Note Records');
    });
  });

  describe('Search Query Building', () => {
    it('should build query with genres', () => {
      const query = youtubeIntegration._buildSearchQuery({
        genres: ['Soul', 'Funk']
      });
      
      expect(query).toContain('(Soul OR Funk)');
      expect(query).toContain('vintage');
      expect(query).toContain('music');
    });

    it('should build query with year range', () => {
      const query = youtubeIntegration._buildSearchQuery({
        yearRange: { start: 1960, end: 1979 }
      });
      
      expect(query).toContain('(1960s OR 1970s)');
    });

    it('should exclude non-music content', () => {
      const query = youtubeIntegration._buildSearchQuery({});
      
      expect(query).toContain('-cover -remix -live -concert -interview');
    });
  });

  describe('Connection Testing', () => {
    it('should return true for successful connection test', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ items: [] })
      });

      const result = await youtubeIntegration.testConnection();
      expect(result).toBe(true);
    });

    it('should return false for failed connection test', async () => {
      fetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await youtubeIntegration.testConnection();
      expect(result).toBe(false);
    });

    it('should return false when not configured', async () => {
      youtubeIntegration.apiKey = null;

      const result = await youtubeIntegration.testConnection();
      expect(result).toBe(false);
    });
  });

  describe('Cache Key Generation', () => {
    it('should generate consistent cache keys', () => {
      const params1 = { genres: ['Soul'], year: 1970 };
      const params2 = { year: 1970, genres: ['Soul'] }; // Different order

      const key1 = youtubeIntegration._generateCacheKey('search', params1);
      const key2 = youtubeIntegration._generateCacheKey('search', params2);

      expect(key1).toBe(key2);
    });

    it('should generate different keys for different params', () => {
      const key1 = youtubeIntegration._generateCacheKey('search', { genres: ['Soul'] });
      const key2 = youtubeIntegration._generateCacheKey('search', { genres: ['Jazz'] });

      expect(key1).not.toBe(key2);
    });
  });

  describe('Cleanup', () => {
    it('should save quota and clean up resources', () => {
      youtubeIntegration.rateLimiter.dailyRequests = 50;
      youtubeIntegration.requestQueue = ['test'];
      youtubeIntegration.isProcessingQueue = true;

      youtubeIntegration.cleanup();

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'youtube_api_quota',
        expect.stringContaining('"requests":50')
      );
      expect(youtubeIntegration.requestQueue).toHaveLength(0);
      expect(youtubeIntegration.isProcessingQueue).toBe(false);
    });
  });

  describe('Error Scenarios', () => {
    it('should handle network errors', async () => {
      fetch.mockRejectedValueOnce(new Error('Network error'));
      mockCacheManager.get.mockResolvedValue(null);

      const networkError = new Error('Network error');
      mockErrorService.handleYouTubeAPIError.mockReturnValue(networkError);

      await expect(youtubeIntegration.searchSamples({}))
        .rejects.toThrow('Network error');

      expect(mockPerformanceMonitor.recordMetric).toHaveBeenCalledWith('apiCall', {
        duration: expect.any(Number),
        cached: false,
        success: false,
        apiName: 'youtube',
        error: 'Network error'
      });
    });

    it('should handle malformed API responses', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}) // Missing items
      });

      mockCacheManager.get.mockResolvedValue(null);

      await expect(youtubeIntegration.searchSamples({}))
        .rejects.toThrow('No samples found for the specified criteria');
    });

    it('should create fallback data for invalid samples', () => {
      const invalidVideo = {
        id: 'test',
        snippet: {
          title: '', // Invalid empty title
          channelTitle: '',
          description: '',
          thumbnails: {}
        },
        contentDetails: {},
        statistics: {}
      };

      const result = youtubeIntegration._transformToSampleData([invalidVideo]);
      
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: 'youtube-test',
        title: expect.any(String),
        artist: expect.any(String),
        year: expect.any(Number),
        genre: expect.any(String),
        duration: expect.any(Number),
        youtubeId: 'test',
        isMock: false
      });
    });
  });
});