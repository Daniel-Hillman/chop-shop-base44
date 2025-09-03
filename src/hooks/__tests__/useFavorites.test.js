/**
 * @fileoverview Unit tests for useFavorites hook
 * Tests hook functionality, state management, and error handling
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useFavorites } from '../useFavorites.js';
import { favoritesService } from '../../services/discovery/FavoritesService.js';

// Mock the FavoritesService
vi.mock('../../services/discovery/FavoritesService.js', () => ({
  favoritesService: {
    getFavorites: vi.fn(),
    addFavorite: vi.fn(),
    removeFavorite: vi.fn(),
    isFavorite: vi.fn(),
    clearFavorites: vi.fn(),
    exportFavorites: vi.fn(),
    importFavorites: vi.fn(),
    getStorageStatus: vi.fn()
  }
}));

describe('useFavorites', () => {
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

  const mockStorageStatus = {
    isUsingInMemoryFallback: false,
    storageType: 'localStorage',
    maxFavorites: 100
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default mock implementations
    favoritesService.getFavorites.mockResolvedValue([]);
    favoritesService.getStorageStatus.mockReturnValue(mockStorageStatus);
    favoritesService.addFavorite.mockResolvedValue(true);
    favoritesService.removeFavorite.mockResolvedValue(true);
    favoritesService.isFavorite.mockResolvedValue(false);
    favoritesService.clearFavorites.mockResolvedValue(true);
    favoritesService.exportFavorites.mockResolvedValue('[]');
    favoritesService.importFavorites.mockResolvedValue(0);

    // Mock console methods to avoid test output noise
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Initialization', () => {
    it('initializes with default state', async () => {
      const { result } = renderHook(() => useFavorites());

      expect(result.current.favorites).toEqual([]);
      expect(result.current.isLoading).toBe(true); // Loading starts immediately on mount
      expect(result.current.error).toBe(null);
      expect(result.current.favoritesCount).toBe(0);
      expect(result.current.hasFavorites).toBe(false);

      await waitFor(() => {
        expect(result.current.storageStatus).toEqual(mockStorageStatus);
      });
    });

    it('loads favorites on mount', async () => {
      const mockFavorites = [mockSample1, mockSample2];
      favoritesService.getFavorites.mockResolvedValue(mockFavorites);

      const { result } = renderHook(() => useFavorites());

      await waitFor(() => {
        expect(result.current.favorites).toEqual(mockFavorites);
        expect(result.current.favoritesCount).toBe(2);
        expect(result.current.hasFavorites).toBe(true);
      });

      expect(favoritesService.getFavorites).toHaveBeenCalledTimes(1);
    });

    it('handles loading error on mount', async () => {
      favoritesService.getFavorites.mockRejectedValue(new Error('Load failed'));

      const { result } = renderHook(() => useFavorites());

      await waitFor(() => {
        expect(result.current.error).toBe('Failed to load favorites');
        expect(result.current.favorites).toEqual([]);
      });
    });
  });

  describe('addFavorite', () => {
    it('adds a favorite successfully', async () => {
      favoritesService.addFavorite.mockResolvedValue(true);

      const { result } = renderHook(() => useFavorites());

      let addResult;
      await act(async () => {
        addResult = await result.current.addFavorite(mockSample1);
      });

      expect(addResult).toBe(true);
      expect(favoritesService.addFavorite).toHaveBeenCalledWith(mockSample1);
      expect(result.current.favorites).toContainEqual(
        expect.objectContaining({ ...mockSample1, favoritedAt: expect.any(String) })
      );
      expect(result.current.error).toBe(null);
    });

    it('prevents duplicate favorites in local state', async () => {
      favoritesService.getFavorites.mockResolvedValue([mockSample1]);
      favoritesService.addFavorite.mockResolvedValue(true);

      const { result } = renderHook(() => useFavorites());

      await waitFor(() => {
        expect(result.current.favorites).toHaveLength(1);
      });

      await act(async () => {
        await result.current.addFavorite(mockSample1);
      });

      expect(result.current.favorites).toHaveLength(1);
    });

    it('handles add favorite error', async () => {
      favoritesService.addFavorite.mockRejectedValue(new Error('Add failed'));

      const { result } = renderHook(() => useFavorites());

      let addResult;
      await act(async () => {
        addResult = await result.current.addFavorite(mockSample1);
      });

      expect(addResult).toBe(false);
      expect(result.current.error).toBe('Add failed');
      expect(result.current.favorites).toEqual([]);
    });

    it('handles service error with fallback message', async () => {
      favoritesService.addFavorite.mockRejectedValue(new Error());

      const { result } = renderHook(() => useFavorites());

      let addResult;
      await act(async () => {
        addResult = await result.current.addFavorite(mockSample1);
      });

      expect(addResult).toBe(false);
      expect(result.current.error).toBe('Failed to add favorite');
    });
  });

  describe('removeFavorite', () => {
    it('removes a favorite successfully', async () => {
      favoritesService.getFavorites.mockResolvedValue([mockSample1, mockSample2]);
      favoritesService.removeFavorite.mockResolvedValue(true);

      const { result } = renderHook(() => useFavorites());

      await waitFor(() => {
        expect(result.current.favorites).toHaveLength(2);
      });

      let removeResult;
      await act(async () => {
        removeResult = await result.current.removeFavorite('sample-1');
      });

      expect(removeResult).toBe(true);
      expect(favoritesService.removeFavorite).toHaveBeenCalledWith('sample-1');
      expect(result.current.favorites).toHaveLength(1);
      expect(result.current.favorites[0].id).toBe('sample-2');
      expect(result.current.error).toBe(null);
    });

    it('handles remove favorite error', async () => {
      favoritesService.removeFavorite.mockRejectedValue(new Error('Remove failed'));

      const { result } = renderHook(() => useFavorites());

      let removeResult;
      await act(async () => {
        removeResult = await result.current.removeFavorite('sample-1');
      });

      expect(removeResult).toBe(false);
      expect(result.current.error).toBe('Remove failed');
    });
  });

  describe('toggleFavorite', () => {
    it('adds favorite when not favorited', async () => {
      favoritesService.isFavorite.mockResolvedValue(false);
      favoritesService.addFavorite.mockResolvedValue(true);

      const { result } = renderHook(() => useFavorites());

      let toggleResult;
      await act(async () => {
        toggleResult = await result.current.toggleFavorite(mockSample1);
      });

      expect(toggleResult).toBe(true);
      expect(favoritesService.addFavorite).toHaveBeenCalledWith(mockSample1);
    });

    it('removes favorite when already favorited', async () => {
      favoritesService.getFavorites.mockResolvedValue([mockSample1]);
      favoritesService.isFavorite.mockResolvedValue(true);
      favoritesService.removeFavorite.mockResolvedValue(true);

      const { result } = renderHook(() => useFavorites());

      await waitFor(() => {
        expect(result.current.favorites).toHaveLength(1);
      });

      let toggleResult;
      await act(async () => {
        toggleResult = await result.current.toggleFavorite(mockSample1);
      });

      expect(toggleResult).toBe(false);
      expect(favoritesService.removeFavorite).toHaveBeenCalledWith('sample-1');
    });

    it('handles toggle error gracefully', async () => {
      // Mock isFavorite to fail, which will cause toggleFavorite to fail
      favoritesService.isFavorite.mockRejectedValue(new Error('Toggle failed'));

      const { result } = renderHook(() => useFavorites());

      // Wait for initial load to complete
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let toggleResult;
      await act(async () => {
        toggleResult = await result.current.toggleFavorite(mockSample1);
      });

      // The function should handle the error gracefully and not crash
      expect(typeof toggleResult).toBe('boolean');
    });
  });

  describe('isFavorite', () => {
    it('checks local state first for performance', async () => {
      favoritesService.getFavorites.mockResolvedValue([mockSample1]);

      const { result } = renderHook(() => useFavorites());

      await waitFor(() => {
        expect(result.current.favorites).toHaveLength(1);
      });

      let isFavResult;
      await act(async () => {
        isFavResult = await result.current.isFavorite('sample-1');
      });

      expect(isFavResult).toBe(true);
      expect(favoritesService.isFavorite).not.toHaveBeenCalled(); // Should use local state
    });

    it('falls back to service when not in local state', async () => {
      favoritesService.isFavorite.mockResolvedValue(true);

      const { result } = renderHook(() => useFavorites());

      let isFavResult;
      await act(async () => {
        isFavResult = await result.current.isFavorite('sample-1');
      });

      expect(isFavResult).toBe(true);
      expect(favoritesService.isFavorite).toHaveBeenCalledWith('sample-1');
    });

    it('handles isFavorite error', async () => {
      favoritesService.isFavorite.mockRejectedValue(new Error('Check failed'));

      const { result } = renderHook(() => useFavorites());

      let isFavResult;
      await act(async () => {
        isFavResult = await result.current.isFavorite('sample-1');
      });

      expect(isFavResult).toBe(false);
    });
  });

  describe('clearFavorites', () => {
    it('clears all favorites successfully', async () => {
      favoritesService.getFavorites.mockResolvedValue([mockSample1, mockSample2]);
      favoritesService.clearFavorites.mockResolvedValue(true);

      const { result } = renderHook(() => useFavorites());

      await waitFor(() => {
        expect(result.current.favorites).toHaveLength(2);
      });

      let clearResult;
      await act(async () => {
        clearResult = await result.current.clearFavorites();
      });

      expect(clearResult).toBe(true);
      expect(favoritesService.clearFavorites).toHaveBeenCalled();
      expect(result.current.favorites).toEqual([]);
      expect(result.current.error).toBe(null);
    });

    it('handles clear favorites error', async () => {
      favoritesService.clearFavorites.mockRejectedValue(new Error('Clear failed'));

      const { result } = renderHook(() => useFavorites());

      let clearResult;
      await act(async () => {
        clearResult = await result.current.clearFavorites();
      });

      expect(clearResult).toBe(false);
      expect(result.current.error).toBe('Clear failed');
    });
  });

  describe('exportFavorites', () => {
    it('exports favorites successfully', async () => {
      const exportData = JSON.stringify([mockSample1, mockSample2]);
      favoritesService.exportFavorites.mockResolvedValue(exportData);

      const { result } = renderHook(() => useFavorites());

      let exportResult;
      await act(async () => {
        exportResult = await result.current.exportFavorites();
      });

      expect(exportResult).toBe(exportData);
      expect(favoritesService.exportFavorites).toHaveBeenCalled();
      expect(result.current.error).toBe(null);
    });

    it('handles export error', async () => {
      favoritesService.exportFavorites.mockRejectedValue(new Error('Export failed'));

      const { result } = renderHook(() => useFavorites());

      let exportResult;
      await act(async () => {
        exportResult = await result.current.exportFavorites();
      });

      expect(exportResult).toBe(null);
      expect(result.current.error).toBe('Export failed');
    });
  });

  describe('importFavorites', () => {
    it('imports favorites successfully', async () => {
      const importData = JSON.stringify([mockSample1, mockSample2]);
      favoritesService.importFavorites.mockResolvedValue(2);
      favoritesService.getFavorites.mockResolvedValueOnce([]) // Initial load
                                   .mockResolvedValueOnce([mockSample1, mockSample2]); // After import

      const { result } = renderHook(() => useFavorites());

      let importResult;
      await act(async () => {
        importResult = await result.current.importFavorites(importData, false);
      });

      expect(importResult).toBe(2);
      expect(favoritesService.importFavorites).toHaveBeenCalledWith(importData, false);
      expect(result.current.error).toBe(null);
    });

    it('handles import error', async () => {
      favoritesService.importFavorites.mockRejectedValue(new Error('Import failed'));

      const { result } = renderHook(() => useFavorites());

      let importResult;
      await act(async () => {
        importResult = await result.current.importFavorites('invalid', false);
      });

      expect(importResult).toBe(0);
      expect(result.current.error).toBe('Import failed');
    });
  });

  describe('refreshFavorites', () => {
    it('refreshes favorites from storage', async () => {
      favoritesService.getFavorites.mockResolvedValueOnce([]) // Initial load
                                   .mockResolvedValueOnce([mockSample1]); // Refresh

      const { result } = renderHook(() => useFavorites());

      await waitFor(() => {
        expect(result.current.favorites).toEqual([]);
      });

      await act(async () => {
        await result.current.refreshFavorites();
      });

      expect(result.current.favorites).toEqual([mockSample1]);
      expect(favoritesService.getFavorites).toHaveBeenCalledTimes(2);
    });
  });

  describe('clearError', () => {
    it('clears error state', async () => {
      favoritesService.addFavorite.mockRejectedValue(new Error('Add failed'));

      const { result } = renderHook(() => useFavorites());

      await act(async () => {
        await result.current.addFavorite(mockSample1);
      });

      expect(result.current.error).toBe('Add failed');

      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBe(null);
    });
  });

  describe('Computed Values', () => {
    it('calculates favoritesCount correctly', async () => {
      favoritesService.getFavorites.mockResolvedValue([mockSample1, mockSample2]);

      const { result } = renderHook(() => useFavorites());

      await waitFor(() => {
        expect(result.current.favoritesCount).toBe(2);
      });
    });

    it('calculates hasFavorites correctly', async () => {
      const { result } = renderHook(() => useFavorites());

      expect(result.current.hasFavorites).toBe(false);

      favoritesService.getFavorites.mockResolvedValue([mockSample1]);
      
      await act(async () => {
        await result.current.refreshFavorites();
      });

      expect(result.current.hasFavorites).toBe(true);
    });

    it('calculates isStorageAvailable correctly', async () => {
      const { result } = renderHook(() => useFavorites());

      await waitFor(() => {
        expect(result.current.isStorageAvailable).toBe(true);
      });

      // Test with in-memory fallback
      const inMemoryStatus = {
        ...mockStorageStatus,
        isUsingInMemoryFallback: true
      };
      favoritesService.getStorageStatus.mockReturnValue(inMemoryStatus);

      const { result: result2 } = renderHook(() => useFavorites());

      await waitFor(() => {
        expect(result2.current.isStorageAvailable).toBe(false);
      });
    });
  });

  describe('Error Recovery', () => {
    it('continues to work after storage errors', async () => {
      // First operation fails, second succeeds
      favoritesService.addFavorite.mockRejectedValueOnce(new Error('Storage failed'))
                                  .mockResolvedValue(true);

      const { result } = renderHook(() => useFavorites());

      // Wait for initial load to complete
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // First add fails
      let result1;
      await act(async () => {
        result1 = await result.current.addFavorite(mockSample1);
      });
      expect(result1).toBe(false);

      // Second add succeeds (after error recovery)
      let result2;
      await act(async () => {
        result2 = await result.current.addFavorite(mockSample1);
      });
      expect(result2).toBe(true);
    });
  });
});