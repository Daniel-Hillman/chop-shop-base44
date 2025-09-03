/**
 * @fileoverview Unit tests for FavoritesService
 * Tests local storage persistence, error handling, and fallback scenarios
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { FavoritesService } from '../FavoritesService.js';

describe('FavoritesService', () => {
  let service;
  let mockLocalStorage;

  const mockSample1 = {
    id: 'sample-1',
    title: 'Funky Drummer',
    artist: 'James Brown',
    year: 1970,
    genre: 'Funk',
    duration: 180,
    youtubeId: 'abc123',
    thumbnailUrl: 'https://example.com/thumb1.jpg',
    isMock: false
  };

  const mockSample2 = {
    id: 'sample-2',
    title: 'Amen Break',
    artist: 'The Winstons',
    year: 1969,
    genre: 'Soul',
    duration: 240,
    youtubeId: 'def456',
    thumbnailUrl: 'https://example.com/thumb2.jpg',
    isMock: true
  };

  beforeEach(() => {
    // Mock localStorage
    mockLocalStorage = {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn()
    };

    Object.defineProperty(window, 'localStorage', {
      value: mockLocalStorage,
      writable: true
    });

    // Mock console methods to avoid test output noise
    vi.spyOn(console, 'warn').mockImplementation(() => { });
    vi.spyOn(console, 'error').mockImplementation(() => { });

    // Clear mocks before creating service
    vi.clearAllMocks();

    service = new FavoritesService();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Initialization', () => {
    it('initializes with localStorage available', () => {
      expect(service.useInMemoryFallback).toBe(false);
      expect(service.storageKey).toBe('sampleDiscovery');
      expect(service.favoritesKey).toBe('favorites');
      expect(service.maxFavorites).toBe(100);
    });

    it('falls back to in-memory storage when localStorage is unavailable', () => {
      // Mock localStorage to throw error
      mockLocalStorage.setItem.mockImplementation(() => {
        throw new Error('localStorage not available');
      });

      const serviceWithoutStorage = new FavoritesService();
      expect(serviceWithoutStorage.useInMemoryFallback).toBe(true);
    });
  });

  describe('getFavorites', () => {
    it('returns empty array when no favorites exist', async () => {
      mockLocalStorage.getItem.mockReturnValue(null);

      const favorites = await service.getFavorites();
      expect(favorites).toEqual([]);
    });

    it('returns stored favorites', async () => {
      const storedData = {
        favorites: [mockSample1, mockSample2]
      };
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(storedData));

      const favorites = await service.getFavorites();
      expect(favorites).toEqual([mockSample1, mockSample2]);
    });

    it('filters out invalid favorites', async () => {
      const invalidSample = { ...mockSample1, title: '' }; // Invalid: empty title
      const storedData = {
        favorites: [mockSample1, invalidSample, mockSample2]
      };
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(storedData));

      const favorites = await service.getFavorites();
      expect(favorites).toEqual([mockSample1, mockSample2]);
      expect(console.warn).toHaveBeenCalled();
    });

    it('handles localStorage read errors', async () => {
      mockLocalStorage.getItem.mockImplementation(() => {
        throw new Error('Read error');
      });

      const favorites = await service.getFavorites();
      expect(favorites).toEqual([]);
      expect(console.error).toHaveBeenCalled();
    });

    it('handles invalid JSON in localStorage', async () => {
      mockLocalStorage.getItem.mockReturnValue('invalid json');

      const favorites = await service.getFavorites();
      expect(favorites).toEqual([]);
    });
  });

  describe('addFavorite', () => {
    it('adds a valid sample to favorites', async () => {
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify({ favorites: [] }));

      const result = await service.addFavorite(mockSample1);
      expect(result).toBe(true);
      expect(mockLocalStorage.setItem).toHaveBeenCalled();
    });

    it('rejects invalid sample data', async () => {
      const invalidSample = { ...mockSample1, title: '' };

      await expect(service.addFavorite(invalidSample)).rejects.toThrow('Invalid sample data');
    });

    it('handles duplicate favorites gracefully', async () => {
      const storedData = { favorites: [mockSample1] };
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(storedData));

      const result = await service.addFavorite(mockSample1);
      expect(result).toBe(true); // Should return true even for duplicates
    });

    it('enforces maximum favorites limit', async () => {
      // Create exactly 100 favorites to reach the limit
      const manyFavorites = Array.from({ length: 100 }, (_, i) => ({
        ...mockSample1,
        id: `sample-${i}`
      }));
      const storedData = { favorites: manyFavorites };
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(storedData));

      // Ensure mockSample2 has a unique ID not in the existing favorites
      const uniqueSample = { ...mockSample2, id: 'unique-sample-id' };

      // Trying to add the 101st favorite should fail
      await expect(service.addFavorite(uniqueSample)).rejects.toThrow('Maximum favorites limit (100) reached');
    });

    it('adds timestamp to favorited sample', async () => {
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify({ favorites: [] }));

      await service.addFavorite(mockSample1);

      // Find the setItem call that's not the test storage call
      const setItemCalls = mockLocalStorage.setItem.mock.calls;
      const dataCall = setItemCalls.find(call => call[0] === 'sampleDiscovery');
      expect(dataCall).toBeDefined();

      const savedData = JSON.parse(dataCall[1]);
      expect(savedData.favorites[0]).toHaveProperty('favoritedAt');
      expect(new Date(savedData.favorites[0].favoritedAt)).toBeInstanceOf(Date);
    });

    it('handles storage write errors', async () => {
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify({ favorites: [] }));
      mockLocalStorage.setItem.mockImplementation(() => {
        throw new Error('Storage full');
      });

      await expect(service.addFavorite(mockSample1)).rejects.toThrow('Storage failed');
      expect(service.useInMemoryFallback).toBe(true);
    });
  });

  describe('removeFavorite', () => {
    it('removes a favorite by ID', async () => {
      const storedData = { favorites: [mockSample1, mockSample2] };
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(storedData));

      const result = await service.removeFavorite('sample-1');
      expect(result).toBe(true);

      // Find the setItem call that's not the test storage call
      const setItemCalls = mockLocalStorage.setItem.mock.calls;
      const dataCall = setItemCalls.find(call => call[0] === 'sampleDiscovery');
      expect(dataCall).toBeDefined();

      const savedData = JSON.parse(dataCall[1]);
      expect(savedData.favorites).toEqual([mockSample2]);
    });

    it('handles non-existent favorite ID gracefully', async () => {
      const storedData = { favorites: [mockSample1] };
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(storedData));

      const result = await service.removeFavorite('non-existent');
      expect(result).toBe(true);
    });

    it('rejects invalid sample ID', async () => {
      await expect(service.removeFavorite('')).rejects.toThrow('Invalid sample ID');
      await expect(service.removeFavorite(null)).rejects.toThrow('Invalid sample ID');
      await expect(service.removeFavorite(123)).rejects.toThrow('Invalid sample ID');
    });
  });

  describe('isFavorite', () => {
    it('returns true for favorited sample', async () => {
      const storedData = { favorites: [mockSample1, mockSample2] };
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(storedData));

      const result = await service.isFavorite('sample-1');
      expect(result).toBe(true);
    });

    it('returns false for non-favorited sample', async () => {
      const storedData = { favorites: [mockSample1] };
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(storedData));

      const result = await service.isFavorite('sample-2');
      expect(result).toBe(false);
    });

    it('handles invalid sample ID', async () => {
      const result1 = await service.isFavorite('');
      const result2 = await service.isFavorite(null);
      const result3 = await service.isFavorite(123);

      expect(result1).toBe(false);
      expect(result2).toBe(false);
      expect(result3).toBe(false);
    });
  });

  describe('clearFavorites', () => {
    it('clears all favorites', async () => {
      const result = await service.clearFavorites();
      expect(result).toBe(true);

      // Find the setItem call that's not the test storage call
      const setItemCalls = mockLocalStorage.setItem.mock.calls;
      const dataCall = setItemCalls.find(call => call[0] === 'sampleDiscovery');
      expect(dataCall).toBeDefined();

      const savedData = JSON.parse(dataCall[1]);
      expect(savedData.favorites).toEqual([]);
    });
  });

  describe('getFavoritesCount', () => {
    it('returns correct count', async () => {
      const storedData = { favorites: [mockSample1, mockSample2] };
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(storedData));

      const count = await service.getFavoritesCount();
      expect(count).toBe(2);
    });

    it('returns 0 on error', async () => {
      mockLocalStorage.getItem.mockImplementation(() => {
        throw new Error('Read error');
      });

      const count = await service.getFavoritesCount();
      expect(count).toBe(0);
    });
  });

  describe('exportFavorites', () => {
    it('exports favorites as JSON string', async () => {
      const storedData = { favorites: [mockSample1, mockSample2] };
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(storedData));

      const exported = await service.exportFavorites();
      const parsed = JSON.parse(exported);
      expect(parsed).toEqual([mockSample1, mockSample2]);
    });
  });

  describe('importFavorites', () => {
    it('imports valid favorites', async () => {
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify({ favorites: [] }));
      const importData = JSON.stringify([mockSample1, mockSample2]);

      const count = await service.importFavorites(importData);
      expect(count).toBe(2);

      // Find the setItem call that's not the test storage call
      const setItemCalls = mockLocalStorage.setItem.mock.calls;
      const dataCall = setItemCalls.find(call => call[0] === 'sampleDiscovery');
      expect(dataCall).toBeDefined();

      const savedData = JSON.parse(dataCall[1]);
      expect(savedData.favorites).toEqual([mockSample1, mockSample2]);
    });

    it('merges with existing favorites when merge=true', async () => {
      const existingData = { favorites: [mockSample1] };
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(existingData));
      const importData = JSON.stringify([mockSample2]);

      const count = await service.importFavorites(importData, true);
      expect(count).toBe(1);

      // Find the setItem call that's not the test storage call
      const setItemCalls = mockLocalStorage.setItem.mock.calls;
      const dataCall = setItemCalls.find(call => call[0] === 'sampleDiscovery');
      expect(dataCall).toBeDefined();

      const savedData = JSON.parse(dataCall[1]);
      expect(savedData.favorites).toEqual([mockSample1, mockSample2]);
    });

    it('filters out invalid favorites during import', async () => {
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify({ favorites: [] }));
      const invalidSample = { ...mockSample1, title: '' };
      const importData = JSON.stringify([mockSample1, invalidSample, mockSample2]);

      const count = await service.importFavorites(importData);
      expect(count).toBe(2);
      expect(console.warn).toHaveBeenCalled();
    });

    it('rejects invalid JSON', async () => {
      await expect(service.importFavorites('invalid json')).rejects.toThrow();
    });

    it('rejects non-array data', async () => {
      await expect(service.importFavorites('{"not": "array"}')).rejects.toThrow('must be an array');
    });

    it('truncates favorites when exceeding limit', async () => {
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify({ favorites: [] }));
      const manyFavorites = Array.from({ length: 150 }, (_, i) => ({
        ...mockSample1,
        id: `sample-${i}`
      }));
      const importData = JSON.stringify(manyFavorites);

      await service.importFavorites(importData);

      // Find the setItem call that's not the test storage call
      const setItemCalls = mockLocalStorage.setItem.mock.calls;
      const dataCall = setItemCalls.find(call => call[0] === 'sampleDiscovery');
      expect(dataCall).toBeDefined();

      const savedData = JSON.parse(dataCall[1]);
      expect(savedData.favorites).toHaveLength(100);
      expect(console.warn).toHaveBeenCalledWith('Favorites truncated to 100 items');
    });
  });

  describe('getStorageStatus', () => {
    it('returns correct storage status', () => {
      const status = service.getStorageStatus();
      expect(status).toEqual({
        isUsingInMemoryFallback: false,
        storageType: 'localStorage',
        maxFavorites: 100
      });
    });

    it('returns in-memory status when using fallback', () => {
      service.useInMemoryFallback = true;
      const status = service.getStorageStatus();
      expect(status).toEqual({
        isUsingInMemoryFallback: true,
        storageType: 'memory',
        maxFavorites: 100
      });
    });
  });

  describe('In-Memory Fallback', () => {
    beforeEach(() => {
      // Force in-memory fallback
      service.useInMemoryFallback = true;
      service.inMemoryFavorites = [];
    });

    it('uses in-memory storage when localStorage fails', async () => {
      // Clear any calls from initialization
      mockLocalStorage.setItem.mockClear();

      await service.addFavorite(mockSample1);
      const favorites = await service.getFavorites();

      expect(favorites).toEqual([expect.objectContaining(mockSample1)]);
      expect(mockLocalStorage.setItem).not.toHaveBeenCalled();
    });

    it('persists data in memory across operations', async () => {
      await service.addFavorite(mockSample1);
      await service.addFavorite(mockSample2);

      const favorites = await service.getFavorites();
      expect(favorites).toHaveLength(2);

      await service.removeFavorite('sample-1');
      const updatedFavorites = await service.getFavorites();
      expect(updatedFavorites).toHaveLength(1);
      expect(updatedFavorites[0].id).toBe('sample-2');
    });
  });

  describe('Error Scenarios', () => {
    it('handles corrupted localStorage data', async () => {
      mockLocalStorage.getItem.mockReturnValue('{"favorites": "not an array"}');

      const favorites = await service.getFavorites();
      expect(favorites).toEqual([]);
    });

    it('recovers from storage errors during operations', async () => {
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify({ favorites: [] }));
      mockLocalStorage.setItem.mockImplementation(() => {
        throw new Error('Storage error');
      });

      // Should fall back to in-memory storage
      await expect(service.addFavorite(mockSample1)).rejects.toThrow('Storage failed');
      expect(service.useInMemoryFallback).toBe(true);

      // Subsequent operations should work with in-memory storage
      const result = await service.addFavorite(mockSample2);
      expect(result).toBe(true);
    });
  });
});