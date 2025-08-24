/**
 * Tests for AudioProcessingService
 */

import audioProcessingService from '../AudioProcessingService.js';

// Mock AudioContext for testing
global.AudioContext = jest.fn().mockImplementation(() => ({
  state: 'running',
  resume: jest.fn().mockResolvedValue(),
  close: jest.fn().mockResolvedValue(),
  decodeAudioData: jest.fn().mockResolvedValue({
    numberOfChannels: 2,
    sampleRate: 44100,
    duration: 180,
    getChannelData: jest.fn().mockReturnValue(new Float32Array(1000))
  })
}));

// Mock fetch
global.fetch = jest.fn();

describe('AudioProcessingService', () => {
  beforeEach(() => {
    // Clear cache before each test
    audioProcessingService.clearCache();
    jest.clearAllMocks();
  });

  afterAll(() => {
    audioProcessingService.cleanup();
  });

  describe('getAudioContext', () => {
    it('should create and return AudioContext', () => {
      const context = audioProcessingService.getAudioContext();
      expect(context).toBeDefined();
      expect(AudioContext).toHaveBeenCalled();
    });

    it('should reuse existing AudioContext', () => {
      const context1 = audioProcessingService.getAudioContext();
      const context2 = audioProcessingService.getAudioContext();
      expect(context1).toBe(context2);
    });
  });

  describe('downloadAndProcessAudio', () => {
    const mockYouTubeUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
    
    beforeEach(() => {
      // Mock successful fetch response
      const mockArrayBuffer = new ArrayBuffer(1000);
      
      fetch.mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Map([['content-length', '1000']]),
        body: {
          getReader: () => ({
            read: jest.fn()
              .mockResolvedValueOnce({ done: false, value: new Uint8Array(500) })
              .mockResolvedValueOnce({ done: false, value: new Uint8Array(500) })
              .mockResolvedValueOnce({ done: true })
          })
        }
      });
    });

    it('should download and process audio successfully', async () => {
      const progressCallback = jest.fn();
      
      const result = await audioProcessingService.downloadAndProcessAudio(
        mockYouTubeUrl, 
        progressCallback
      );

      expect(result).toHaveProperty('audioBuffer');
      expect(result).toHaveProperty('waveformData');
      expect(Array.isArray(result.waveformData)).toBe(true);
      expect(progressCallback).toHaveBeenCalled();
    });

    it('should throw error for invalid URL', async () => {
      await expect(
        audioProcessingService.downloadAndProcessAudio('')
      ).rejects.toThrow('YouTube URL is required');
    });

    it('should cache successful downloads', async () => {
      await audioProcessingService.downloadAndProcessAudio(mockYouTubeUrl);
      
      expect(audioProcessingService.isCached(mockYouTubeUrl)).toBe(true);
      
      // Second call should return cached result
      const cachedResult = audioProcessingService.getAudioBuffer(mockYouTubeUrl);
      expect(cachedResult).toBeDefined();
    });

    it('should retry on failure', async () => {
      // Mock fetch to fail twice then succeed
      fetch
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          headers: new Map([['content-length', '1000']]),
          body: {
            getReader: () => ({
              read: jest.fn()
                .mockResolvedValueOnce({ done: false, value: new Uint8Array(1000) })
                .mockResolvedValueOnce({ done: true })
            })
          }
        });

      const progressCallback = jest.fn();
      
      const result = await audioProcessingService.downloadAndProcessAudio(
        mockYouTubeUrl,
        progressCallback
      );

      expect(result).toBeDefined();
      expect(fetch).toHaveBeenCalledTimes(3);
      
      // Should have called progress callback with retry status
      const retryCalls = progressCallback.mock.calls.filter(
        call => call[0].status === 'retrying'
      );
      expect(retryCalls.length).toBeGreaterThan(0);
    });
  });

  describe('cache management', () => {
    it('should clear cache', () => {
      const mockUrl = 'https://www.youtube.com/watch?v=test';
      
      // Add something to cache
      audioProcessingService.downloadCache.set('test', { audioBuffer: {}, waveformData: [] });
      
      expect(audioProcessingService.downloadCache.size).toBe(1);
      
      audioProcessingService.clearCache();
      
      expect(audioProcessingService.downloadCache.size).toBe(0);
    });

    it('should check if URL is cached', () => {
      const mockUrl = 'https://www.youtube.com/watch?v=test';
      
      expect(audioProcessingService.isCached(mockUrl)).toBe(false);
      
      audioProcessingService.downloadCache.set('test', { audioBuffer: {}, waveformData: [] });
      
      expect(audioProcessingService.isCached(mockUrl)).toBe(true);
    });
  });

  describe('statistics', () => {
    it('should return service statistics', () => {
      const stats = audioProcessingService.getStats();
      
      expect(stats).toHaveProperty('cachedItems');
      expect(stats).toHaveProperty('activeDownloads');
      expect(stats).toHaveProperty('audioContextState');
      expect(stats).toHaveProperty('memoryUsage');
    });
  });

  describe('cleanup', () => {
    it('should cleanup resources', () => {
      const mockContext = {
        state: 'running',
        close: jest.fn().mockResolvedValue()
      };
      
      audioProcessingService.audioContext = mockContext;
      audioProcessingService.cleanup();
      
      expect(mockContext.close).toHaveBeenCalled();
    });
  });
});