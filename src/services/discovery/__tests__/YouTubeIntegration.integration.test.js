/**
 * @fileoverview Integration tests for YouTubeIntegration service
 * Tests real-world scenarios, error recovery, and API integration patterns
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { YouTubeIntegration } from '../YouTubeIntegration.js';

// Mock environment for integration tests
vi.mock('import.meta.env', () => ({
  VITE_YOUTUBE_API_KEY: 'test_integration_key'
}));

// Mock fetch for controlled integration testing
global.fetch = vi.fn();

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn()
};
global.localStorage = localStorageMock;

describe('YouTubeIntegration Integration Tests', () => {
  let youtubeIntegration;

  beforeEach(() => {
    vi.clearAllMocks();
    youtubeIntegration = new YouTubeIntegration();
    localStorageMock.getItem.mockReturnValue(null);
  });

  afterEach(() => {
    youtubeIntegration.cleanup();
  });

  describe('End-to-End Search Workflow', () => {
    it('should complete full search workflow with realistic data', async () => {
      // Mock search response
      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          items: [
            {
              id: { videoId: 'dQw4w9WgXcQ' },
              snippet: {
                title: 'James Brown - Get Up (I Feel Like Being a) Sex Machine (1970)',
                channelTitle: 'James Brown Official',
                description: 'Classic funk track from 1970, featuring the famous JB groove at 108 BPM. Recorded at King Records studio with the JBs.',
                thumbnails: {
                  medium: { url: 'https://img.youtube.com/vi/dQw4w9WgXcQ/mqdefault.jpg' }
                },
                publishedAt: '2019-05-15T10:30:00Z',
                tags: ['funk', 'soul', 'james brown', '1970s', 'classic']
              }
            },
            {
              id: { videoId: 'abc123def456' },
              snippet: {
                title: 'Fela Kuti - Water No Get Enemy (1975) [Afrobeat Classic]',
                channelTitle: 'Afrobeat Archive',
                description: 'Extended Afrobeat masterpiece from 1975, featuring complex polyrhythms and saxophone solos. Tempo around 118 BPM.',
                thumbnails: {
                  medium: { url: 'https://img.youtube.com/vi/abc123def456/mqdefault.jpg' }
                },
                publishedAt: '2020-03-20T14:45:00Z',
                tags: ['afrobeat', 'fela kuti', '1970s', 'nigeria', 'saxophone']
              }
            }
          ]
        })
      });

      // Mock video details response
      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          items: [
            {
              id: 'dQw4w9WgXcQ',
              snippet: {
                title: 'James Brown - Get Up (I Feel Like Being a) Sex Machine (1970)',
                channelTitle: 'James Brown Official',
                description: 'Classic funk track from 1970, featuring the famous JB groove at 108 BPM. Recorded at King Records studio with the JBs.',
                thumbnails: {
                  medium: { url: 'https://img.youtube.com/vi/dQw4w9WgXcQ/mqdefault.jpg' }
                },
                publishedAt: '2019-05-15T10:30:00Z',
                tags: ['funk', 'soul', 'james brown', '1970s', 'classic']
              },
              contentDetails: {
                duration: 'PT5M20S'
              },
              statistics: {
                viewCount: '15000000',
                likeCount: '250000',
                commentCount: '12000'
              }
            },
            {
              id: 'abc123def456',
              snippet: {
                title: 'Fela Kuti - Water No Get Enemy (1975) [Afrobeat Classic]',
                channelTitle: 'Afrobeat Archive',
                description: 'Extended Afrobeat masterpiece from 1975, featuring complex polyrhythms and saxophone solos. Tempo around 118 BPM.',
                thumbnails: {
                  medium: { url: 'https://img.youtube.com/vi/abc123def456/mqdefault.jpg' }
                },
                publishedAt: '2020-03-20T14:45:00Z',
                tags: ['afrobeat', 'fela kuti', '1970s', 'nigeria', 'saxophone']
              },
              contentDetails: {
                duration: 'PT7M15S'
              },
              statistics: {
                viewCount: '8500000',
                likeCount: '180000',
                commentCount: '8500'
              }
            }
          ]
        })
      });

      const searchParams = {
        genres: ['Funk', 'Afrobeat'],
        yearRange: { start: 1970, end: 1980 },
        maxResults: 12,
        order: 'relevance'
      };

      const results = await youtubeIntegration.searchSamples(searchParams);

      // Verify results structure
      expect(results).toHaveLength(2);
      
      // Verify first result (James Brown)
      expect(results[0]).toMatchObject({
        id: 'youtube-dQw4w9WgXcQ',
        title: expect.stringContaining('James Brown'),
        artist: 'James Brown',
        year: 1970,
        genre: 'Funk',
        duration: 320, // 5m20s
        youtubeId: 'dQw4w9WgXcQ',
        thumbnailUrl: 'https://img.youtube.com/vi/dQw4w9WgXcQ/mqdefault.jpg',
        tempo: 108,
        isMock: false
      });

      // Verify second result (Fela Kuti)
      expect(results[1]).toMatchObject({
        id: 'youtube-abc123def456',
        title: expect.stringContaining('Fela Kuti'),
        artist: 'Fela Kuti',
        year: 1975,
        genre: 'Afrobeat',
        duration: 435, // 7m15s
        youtubeId: 'abc123def456',
        tempo: 118,
        isMock: false
      });

      // Verify instruments extraction
      expect(results[1].instruments).toContain('saxophone');
      
      // Verify tags
      expect(results[0].tags).toContain('funk');
      expect(results[1].tags).toContain('afrobeat');

      // Verify API calls were made correctly
      expect(fetch).toHaveBeenCalledTimes(2);
      
      // Verify search API call
      const searchCall = fetch.mock.calls[0];
      expect(searchCall[0]).toContain('/search');
      expect(searchCall[0]).toContain('key=test_integration_key');
      expect(searchCall[0]).toContain('type=video');
      expect(searchCall[0]).toContain('maxResults=12');

      // Verify video details API call
      const videoCall = fetch.mock.calls[1];
      expect(videoCall[0]).toContain('/videos');
      expect(videoCall[0]).toContain('id=dQw4w9WgXcQ%2Cabc123def456');
    });

    it('should handle mixed valid and invalid video data', async () => {
      // Mock search response with mixed data quality
      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          items: [
            {
              id: { videoId: 'valid123' },
              snippet: {
                title: 'Miles Davis - So What (1959)',
                channelTitle: 'Jazz Classics',
                description: 'Modal jazz masterpiece',
                thumbnails: { medium: { url: 'https://img.youtube.com/vi/valid123/mqdefault.jpg' } },
                publishedAt: '2020-01-01T00:00:00Z'
              }
            },
            {
              id: { videoId: 'invalid456' },
              snippet: {
                title: '', // Invalid empty title
                channelTitle: '',
                description: '',
                thumbnails: {},
                publishedAt: '2020-01-01T00:00:00Z'
              }
            }
          ]
        })
      });

      // Mock video details response
      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          items: [
            {
              id: 'valid123',
              snippet: {
                title: 'Miles Davis - So What (1959)',
                channelTitle: 'Jazz Classics',
                description: 'Modal jazz masterpiece',
                thumbnails: { medium: { url: 'https://img.youtube.com/vi/valid123/mqdefault.jpg' } }
              },
              contentDetails: { duration: 'PT9M22S' },
              statistics: { viewCount: '5000000' }
            },
            {
              id: 'invalid456',
              snippet: {
                title: '',
                channelTitle: '',
                description: '',
                thumbnails: {}
              },
              contentDetails: { duration: 'PT0S' },
              statistics: {}
            }
          ]
        })
      });

      const results = await youtubeIntegration.searchSamples({});

      // Should return valid results and handle invalid ones gracefully
      expect(results.length).toBeGreaterThan(0);
      
      // Valid result should be properly formatted
      const validResult = results.find(r => r.youtubeId === 'valid123');
      expect(validResult).toBeDefined();
      expect(validResult.title).toBe('Miles Davis - So What');
      expect(validResult.artist).toBe('Miles Davis');
      expect(validResult.year).toBe(1959);
    });
  });

  describe('Error Recovery Scenarios', () => {
    it('should handle quota exceeded error gracefully', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
        json: () => Promise.resolve({
          error: {
            code: 403,
            message: 'The request cannot be completed because you have exceeded your quota.',
            errors: [
              {
                domain: 'youtube.quota',
                reason: 'quotaExceeded'
              }
            ]
          }
        })
      });

      await expect(youtubeIntegration.searchSamples({}))
        .rejects.toThrow('YouTube API error: 403');
    });

    it('should handle invalid API key error', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: () => Promise.resolve({
          error: {
            code: 400,
            message: 'API key not valid. Please pass a valid API key.',
            errors: [
              {
                domain: 'global',
                reason: 'badRequest'
              }
            ]
          }
        })
      });

      await expect(youtubeIntegration.searchSamples({}))
        .rejects.toThrow('YouTube API error: 400');
    });

    it('should handle network timeout gracefully', async () => {
      fetch.mockRejectedValueOnce(new Error('Network timeout'));

      await expect(youtubeIntegration.searchSamples({}))
        .rejects.toThrow('Network timeout');
    });

    it('should handle malformed JSON response', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.reject(new Error('Invalid JSON'))
      });

      await expect(youtubeIntegration.searchSamples({}))
        .rejects.toThrow('Invalid JSON');
    });
  });

  describe('Rate Limiting Integration', () => {
    it('should enforce per-second rate limiting', async () => {
      // Mock successful responses
      fetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          items: [{
            id: { videoId: 'test' },
            snippet: {
              title: 'Test',
              channelTitle: 'Test',
              description: 'Test',
              thumbnails: { medium: { url: 'test.jpg' } }
            }
          }]
        })
      });

      const startTime = Date.now();
      
      // Make multiple rapid requests
      const promises = Array(3).fill().map(() => 
        youtubeIntegration.searchSamples({ maxResults: 1 })
      );

      await Promise.all(promises);
      
      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should take at least 200ms due to rate limiting (10 requests/second = 100ms interval)
      // With 3 requests, we need at least 2 intervals = 200ms
      expect(duration).toBeGreaterThan(150); // Allow some tolerance
    });

    it('should track daily quota correctly across multiple requests', async () => {
      fetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          items: [{
            id: { videoId: 'test' },
            snippet: {
              title: 'Test',
              channelTitle: 'Test',
              description: 'Test',
              thumbnails: { medium: { url: 'test.jpg' } }
            }
          }]
        })
      });

      const initialQuota = youtubeIntegration.rateLimiter.dailyRequests;
      
      // Make multiple requests
      await youtubeIntegration.searchSamples({ maxResults: 1 });
      await youtubeIntegration.getVideoDetails('test123');

      const finalQuota = youtubeIntegration.rateLimiter.dailyRequests;
      
      // Should have incremented by 3 (search + video details + single video)
      expect(finalQuota).toBe(initialQuota + 3);
    });

    it('should persist quota to localStorage', async () => {
      fetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          items: [{
            id: { videoId: 'test' },
            snippet: {
              title: 'Test',
              channelTitle: 'Test',
              description: 'Test',
              thumbnails: { medium: { url: 'test.jpg' } }
            }
          }]
        })
      });

      await youtubeIntegration.searchSamples({ maxResults: 1 });
      youtubeIntegration.cleanup();

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'youtube_api_quota',
        expect.stringContaining(new Date().toDateString())
      );
    });
  });

  describe('Cache Integration', () => {
    it('should cache and retrieve search results correctly', async () => {
      // First request - should hit API
      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          items: [{
            id: { videoId: 'cached123' },
            snippet: {
              title: 'Cached Song',
              channelTitle: 'Cached Artist',
              description: 'Test',
              thumbnails: { medium: { url: 'test.jpg' } }
            }
          }]
        })
      }).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          items: [{
            id: 'cached123',
            snippet: {
              title: 'Cached Song',
              channelTitle: 'Cached Artist',
              description: 'Test',
              thumbnails: { medium: { url: 'test.jpg' } }
            },
            contentDetails: { duration: 'PT3M0S' },
            statistics: {}
          }]
        })
      });

      const searchParams = { genres: ['Soul'], maxResults: 1 };
      
      // First call
      const results1 = await youtubeIntegration.searchSamples(searchParams);
      expect(results1).toHaveLength(1);
      expect(fetch).toHaveBeenCalledTimes(2);

      // Second call with same params - should use cache
      const results2 = await youtubeIntegration.searchSamples(searchParams);
      expect(results2).toHaveLength(1);
      expect(fetch).toHaveBeenCalledTimes(2); // No additional calls

      // Results should be identical
      expect(results1[0].id).toBe(results2[0].id);
    });
  });

  describe('Data Transformation Edge Cases', () => {
    it('should handle videos with complex titles and metadata', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          items: [{
            id: { videoId: 'complex123' },
            snippet: {
              title: 'The Meters - Cissy Strut [Official Audio] (1969) [Remastered] - New Orleans Funk Classic',
              channelTitle: 'Josie Records Official',
              description: 'Remastered version of the classic New Orleans funk instrumental from 1969. Features Art Neville on organ, Leo Nocentelli on guitar, George Porter Jr. on bass, and Ziggy Modeliste on drums. Recorded at Cosimo Studios. Tempo: 98 BPM. Duration: 3:15.',
              thumbnails: { medium: { url: 'https://img.youtube.com/vi/complex123/mqdefault.jpg' } },
              tags: ['funk', 'new orleans', 'instrumental', '1960s', 'meters', 'remastered']
            }
          }]
        })
      });

      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          items: [{
            id: 'complex123',
            snippet: {
              title: 'The Meters - Cissy Strut [Official Audio] (1969) [Remastered] - New Orleans Funk Classic',
              channelTitle: 'Josie Records Official',
              description: 'Remastered version of the classic New Orleans funk instrumental from 1969. Features Art Neville on organ, Leo Nocentelli on guitar, George Porter Jr. on bass, and Ziggy Modeliste on drums. Recorded at Cosimo Studios. Tempo: 98 BPM. Duration: 3:15.',
              thumbnails: { medium: { url: 'https://img.youtube.com/vi/complex123/mqdefault.jpg' } },
              tags: ['funk', 'new orleans', 'instrumental', '1960s', 'meters', 'remastered']
            },
            contentDetails: { duration: 'PT3M15S' },
            statistics: { viewCount: '2500000', likeCount: '45000' }
          }]
        })
      });

      const results = await youtubeIntegration.searchSamples({});
      const result = results[0];

      expect(result).toMatchObject({
        title: 'The Meters - Cissy Strut - New Orleans Funk Classic',
        artist: 'The Meters',
        year: 1969,
        genre: 'Soul', // Default genre
        duration: 195, // 3m15s
        tempo: 98,
        youtubeId: 'complex123'
      });

      expect(result.instruments).toContain('organ');
      expect(result.instruments).toContain('guitar');
      expect(result.instruments).toContain('bass');
      expect(result.instruments).toContain('drums');

      expect(result.tags).toContain('funk');
      expect(result.tags).toContain('instrumental');
      expect(result.tags).toContain('remastered');
    });

    it('should handle videos with minimal metadata', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          items: [{
            id: { videoId: 'minimal123' },
            snippet: {
              title: 'Track 1',
              channelTitle: 'Unknown',
              description: '',
              thumbnails: {},
              tags: []
            }
          }]
        })
      });

      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          items: [{
            id: 'minimal123',
            snippet: {
              title: 'Track 1',
              channelTitle: 'Unknown',
              description: '',
              thumbnails: {},
              tags: []
            },
            contentDetails: {},
            statistics: {}
          }]
        })
      });

      const results = await youtubeIntegration.searchSamples({});
      const result = results[0];

      // Should create valid sample with defaults
      expect(result).toMatchObject({
        id: 'youtube-minimal123',
        title: 'Track 1',
        artist: 'Unknown',
        year: 1970, // Default
        genre: 'Soul', // Default
        duration: 180, // Default
        youtubeId: 'minimal123',
        isMock: false
      });
    });
  });

  describe('Performance Monitoring Integration', () => {
    it('should record performance metrics for successful requests', async () => {
      fetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          items: [{
            id: { videoId: 'perf123' },
            snippet: {
              title: 'Performance Test',
              channelTitle: 'Test',
              description: 'Test',
              thumbnails: { medium: { url: 'test.jpg' } }
            }
          }]
        })
      });

      const startTime = performance.now();
      await youtubeIntegration.searchSamples({});
      const endTime = performance.now();

      // Verify performance monitoring was called
      expect(youtubeIntegration.performanceMonitor.recordMetric).toHaveBeenCalledWith(
        'apiCall',
        expect.objectContaining({
          duration: expect.any(Number),
          cached: false,
          success: true,
          apiName: 'youtube',
          resultCount: expect.any(Number)
        })
      );
    });

    it('should record performance metrics for failed requests', async () => {
      fetch.mockRejectedValueOnce(new Error('Test error'));

      await expect(youtubeIntegration.searchSamples({}))
        .rejects.toThrow();

      expect(youtubeIntegration.performanceMonitor.recordMetric).toHaveBeenCalledWith(
        'apiCall',
        expect.objectContaining({
          duration: expect.any(Number),
          cached: false,
          success: false,
          apiName: 'youtube',
          error: 'Test error'
        })
      );
    });
  });
});