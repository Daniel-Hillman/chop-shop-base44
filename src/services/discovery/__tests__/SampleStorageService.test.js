import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SampleStorageService } from '../SampleStorageService.js';

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
global.localStorage = localStorageMock;

describe('SampleStorageService', () => {
  let storageService;
  const mockSample = {
    videoId: 'test-video-id',
    title: 'Test Sample',
    artist: 'Test Artist',
    year: 2020,
    thumbnailUrl: 'test-thumbnail.jpg',
    channelTitle: 'Test Channel',
    duration: 180,
    metadata: {
      bpm: 120,
      key: 'C major',
      quality: 0.8
    }
  };

  beforeEach(() => {
    storageService = new SampleStorageService();
    localStorageMock.getItem.mockClear();
    localStorageMock.setItem.mockClear();
    localStorageMock.removeItem.mockClear();
    localStorageMock.clear.mockClear();
  });

  describe('Favorites Management', () => {
    it('should add sample to favorites', async () => {
      localStorageMock.getItem.mockReturnValue('[]');
      
      const result = await storageService.addToFavorites(mockSample);
      
      expect(result.success).toBe(true);
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'sample_discovery_favorites',
        expect.stringContaining(mockSample.videoId)
      );
    });

    it('should not add duplicate favorites', async () => {
      const existingFavorites = [{ ...mockSample, addedAt: new Date().toISOString() }];
      localStorageMock.getItem.mockReturnValue(JSON.stringify(existingFavorites));
      
      const result = await storageService.addToFavorites(mockSample);
      
      expect(result.success).toBe(true);
      expect(result.message).toContain('already in favorites');
    });

    it('should remove sample from favorites', async () => {
      const existingFavorites = [
        { ...mockSample, addedAt: new Date().toISOString() },
        { videoId: 'other-id', title: 'Other Sample', addedAt: new Date().toISOString() }
      ];
      localStorageMock.getItem.mockReturnValue(JSON.stringify(existingFavorites));
      
      const result = await storageService.removeFromFavorites(mockSample.videoId);
      
      expect(result.success).toBe(true);
    });

    it('should get all favorites', () => {
      const existingFavorites = [{ ...mockSample, addedAt: new Date().toISOString() }];
      localStorageMock.getItem.mockReturnValue(JSON.stringify(existingFavorites));
      
      // Reinitialize to load data
      storageService = new SampleStorageService();
      const favorites = storageService.getFavorites();
      
      expect(favorites).toHaveLength(1);
      expect(favorites[0].videoId).toBe(mockSample.videoId);
    });

    it('should check if sample is favorited', () => {
      const existingFavorites = [{ ...mockSample, addedAt: new Date().toISOString() }];
      localStorageMock.getItem.mockReturnValue(JSON.stringify(existingFavorites));
      
      // Reinitialize to load data
      storageService = new SampleStorageService();
      const isFavorited = storageService.isFavorite(mockSample.videoId);
      
      expect(isFavorited).toBe(true);
    });

    it('should return false for non-favorited sample', () => {
      localStorageMock.getItem.mockReturnValue('[]');
      
      // Reinitialize to load data
      storageService = new SampleStorageService();
      const isFavorited = storageService.isFavorite(mockSample.videoId);
      
      expect(isFavorited).toBe(false);
    });
  });

  describe('History Management', () => {
    it('should add sample to history', async () => {
      localStorageMock.getItem.mockReturnValue('[]');
      
      const result = await storageService.addToHistory(mockSample);
      
      expect(result.success).toBe(true);
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'sample_discovery_history',
        expect.stringContaining(mockSample.videoId)
      );
    });

    it('should maintain history limit', async () => {
      const existingHistory = Array.from({ length: 100 }, (_, i) => ({
        videoId: `sample-${i}`,
        title: `Sample ${i}`,
        discoveredAt: new Date(Date.now() - i * 1000).toISOString()
      }));
      localStorageMock.getItem.mockReturnValue(JSON.stringify(existingHistory));
      
      // Reinitialize to load existing data
      storageService = new SampleStorageService();
      const result = await storageService.addToHistory(mockSample);
      
      expect(result.success).toBe(true);
      const history = storageService.getHistory();
      expect(history).toHaveLength(100); // Should maintain limit
      expect(history[0].videoId).toBe(mockSample.videoId);
    });

    it('should get history with pagination', () => {
      const existingHistory = Array.from({ length: 50 }, (_, i) => ({
        videoId: `sample-${i}`,
        title: `Sample ${i}`,
        discoveredAt: new Date(Date.now() - i * 1000).toISOString()
      }));
      localStorageMock.getItem.mockReturnValue(JSON.stringify(existingHistory));
      
      // Reinitialize to load data
      storageService = new SampleStorageService();
      const history = storageService.getHistory({ limit: 10, offset: 0 });
      
      expect(history).toHaveLength(10);
      expect(history[0].videoId).toBe('sample-0');
    });

    it('should clear history', async () => {
      const result = await storageService.clearHistory();
      
      expect(result.success).toBe(true);
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'sample_discovery_history',
        '[]'
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle localStorage errors gracefully', async () => {
      localStorageMock.getItem.mockImplementation(() => {
        throw new Error('localStorage error');
      });
      
      const favorites = await storageService.getFavorites();
      
      expect(favorites).toEqual([]);
    });

    it('should handle invalid JSON in localStorage', async () => {
      localStorageMock.getItem.mockReturnValue('invalid json');
      
      const favorites = await storageService.getFavorites();
      
      expect(favorites).toEqual([]);
    });
  });

  describe('Storage Statistics', () => {
    it('should get storage statistics', () => {
      const favorites = [mockSample];
      const history = [mockSample, { ...mockSample, videoId: 'other-id' }];
      
      localStorageMock.getItem
        .mockReturnValueOnce(JSON.stringify(favorites))
        .mockReturnValueOnce(JSON.stringify(history))
        .mockReturnValueOnce('{}');
      
      // Reinitialize to load data
      storageService = new SampleStorageService();
      const stats = storageService.getStats();
      
      expect(stats.favorites.count).toBe(1);
      expect(stats.history.count).toBe(2);
      expect(stats.metadata.count).toBe(0);
    });
  });
});