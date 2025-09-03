/**
 * @fileoverview Unit tests for useDiscoveryState hook
 * Tests state management, persistence, hydration, and memory cleanup
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { useDiscoveryState } from '../useDiscoveryState.js';
import { createDefaultDiscoveryState } from '../../types/discovery.js';
import { favoritesService } from '../../services/discovery/FavoritesService.js';
import historyService from '../../services/discovery/HistoryService.js';

// Mock the services
vi.mock('../../services/discovery/FavoritesService.js', () => ({
  favoritesService: {
    getFavorites: vi.fn(),
    addFavorite: vi.fn(),
    removeFavorite: vi.fn(),
    clearFavorites: vi.fn()
  }
}));

vi.mock('../../services/discovery/HistoryService.js', () => ({
  default: {
    getHistory: vi.fn(),
    addToHistory: vi.fn(),
    clearHistory: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    cleanupOldEntries: vi.fn()
  }
}));

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn()
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

// Test data
const mockSample = {
  id: 'test-sample-1',
  title: 'Test Sample',
  artist: 'Test Artist',
  year: 1975,
  genre: 'Soul',
  duration: 180,
  youtubeId: 'test-youtube-id',
  thumbnailUrl: 'https://example.com/thumb.jpg',
  isMock: true
};

const mockSample2 = {
  id: 'test-sample-2',
  title: 'Test Sample 2',
  artist: 'Test Artist 2',
  year: 1980,
  genre: 'Jazz',
  duration: 240,
  youtubeId: 'test-youtube-id-2',
  thumbnailUrl: 'https://example.com/thumb2.jpg',
  isMock: true
};

const mockFilters = {
  genres: ['Soul', 'Jazz'],
  yearRange: { start: 1970, end: 1990 }
};

describe('useDiscoveryState', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
    favoritesService.getFavorites.mockResolvedValue([]);
    historyService.getHistory.mockReturnValue([]);
    historyService.addListener.mockImplementation(() => {});
    historyService.removeListener.mockImplementation(() => {});
    historyService.cleanupOldEntries.mockReturnValue(0);
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe('Initialization', () => {
    it('should initialize with default state', () => {
      const { result } = renderHook(() => useDiscoveryState());

      const defaultState = createDefaultDiscoveryState();
      expect(result.current.state.samples).toEqual(defaultState.samples);
      expect(result.current.state.currentSample).toBe(defaultState.currentSample);
      expect(result.current.state.filters).toEqual(defaultState.filters);
      expect(result.current.state.isLoading).toBe(defaultState.isLoading);
      expect(result.current.state.error).toBe(defaultState.error);
    });

    it('should handle invalid persisted state gracefully', () => {
      localStorageMock.getItem.mockReturnValue('invalid-json');

      const { result } = renderHook(() => useDiscoveryState());

      const defaultState = createDefaultDiscoveryState();
      expect(result.current.state.samples).toEqual(defaultState.samples);
    });

    it('should handle localStorage errors gracefully', () => {
      localStorageMock.getItem.mockImplementation(() => {
        throw new Error('Storage error');
      });

      const { result } = renderHook(() => useDiscoveryState());

      const defaultState = createDefaultDiscoveryState();
      expect(result.current.state.samples).toEqual(defaultState.samples);
    });
  });

  describe('Sample Management', () => {
    it('should set samples correctly', () => {
      const { result } = renderHook(() => useDiscoveryState());

      act(() => {
        result.current.setSamples([mockSample, mockSample2]);
      });

      expect(result.current.state.samples).toEqual([mockSample, mockSample2]);
    });

    it('should filter out invalid samples', () => {
      const { result } = renderHook(() => useDiscoveryState());

      const invalidSample = { id: 'invalid', title: '' }; // Missing required fields

      act(() => {
        result.current.setSamples([mockSample, invalidSample, mockSample2]);
      });

      expect(result.current.state.samples).toEqual([mockSample, mockSample2]);
    });

    it('should limit samples to prevent memory issues', () => {
      const { result } = renderHook(() => useDiscoveryState());

      // Create 250 samples (more than MAX_SAMPLES_IN_MEMORY = 200)
      const manySamples = Array.from({ length: 250 }, (_, i) => ({
        ...mockSample,
        id: `sample-${i}`,
        title: `Sample ${i}`
      }));

      act(() => {
        result.current.setSamples(manySamples);
      });

      expect(result.current.state.samples).toHaveLength(200);
    });

    it('should reject non-array samples', () => {
      const { result } = renderHook(() => useDiscoveryState());

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      act(() => {
        result.current.setSamples('not-an-array');
      });

      expect(consoleSpy).toHaveBeenCalledWith('setSamples: samples must be an array');
      expect(result.current.state.samples).toEqual([]);

      consoleSpy.mockRestore();
    });
  });

  describe('Current Sample Management', () => {
    it('should set current sample and add to history', () => {
      const { result } = renderHook(() => useDiscoveryState());

      act(() => {
        result.current.setCurrentSample(mockSample);
      });

      expect(result.current.state.currentSample).toEqual(mockSample);
      expect(historyService.addToHistory).toHaveBeenCalledWith(mockSample);
    });

    it('should clear current sample without adding to history', () => {
      const { result } = renderHook(() => useDiscoveryState());

      act(() => {
        result.current.setCurrentSample(mockSample);
      });

      act(() => {
        result.current.setCurrentSample(null);
      });

      expect(result.current.state.currentSample).toBe(null);
      expect(historyService.addToHistory).toHaveBeenCalledTimes(1); // Only called once
    });

    it('should reject invalid current sample', () => {
      const { result } = renderHook(() => useDiscoveryState());

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const invalidSample = { id: 'invalid' }; // Missing required fields

      act(() => {
        result.current.setCurrentSample(invalidSample);
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        'setCurrentSample: invalid sample data:',
        expect.any(Array)
      );
      expect(result.current.state.currentSample).toBe(null);

      consoleSpy.mockRestore();
    });
  });

  describe('Filter Management', () => {
    it('should set filters correctly', async () => {
      const { result } = renderHook(() => useDiscoveryState());

      await waitFor(() => {
        expect(result.current.isInitialized).toBe(true);
      });

      act(() => {
        result.current.setFilters(mockFilters);
      });

      expect(result.current.state.filters).toEqual(mockFilters);
    });

    it('should reject invalid filters', async () => {
      const { result } = renderHook(() => useDiscoveryState());

      await waitFor(() => {
        expect(result.current.isInitialized).toBe(true);
      });

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const invalidFilters = { genres: 'not-an-array' };

      act(() => {
        result.current.setFilters(invalidFilters);
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        'setFilters: invalid filter state:',
        expect.any(Array)
      );
      expect(result.current.state.filters).toEqual(createDefaultDiscoveryState().filters);

      consoleSpy.mockRestore();
    });
  });

  describe('UI State Management', () => {
    it('should set loading state', async () => {
      const { result } = renderHook(() => useDiscoveryState());

      await waitFor(() => {
        expect(result.current.isInitialized).toBe(true);
      });

      act(() => {
        result.current.setLoading(true);
      });

      expect(result.current.state.isLoading).toBe(true);
      expect(result.current.hasError).toBe(false);
    });

    it('should set error state', async () => {
      const { result } = renderHook(() => useDiscoveryState());

      await waitFor(() => {
        expect(result.current.isInitialized).toBe(true);
      });

      act(() => {
        result.current.setError('Test error');
      });

      expect(result.current.state.error).toBe('Test error');
      expect(result.current.hasError).toBe(true);
    });

    it('should clear error state', async () => {
      const { result } = renderHook(() => useDiscoveryState());

      await waitFor(() => {
        expect(result.current.isInitialized).toBe(true);
      });

      act(() => {
        result.current.setError('Test error');
      });

      act(() => {
        result.current.setError(null);
      });

      expect(result.current.state.error).toBe(null);
      expect(result.current.hasError).toBe(false);
    });

    it('should set online status', async () => {
      const { result } = renderHook(() => useDiscoveryState());

      await waitFor(() => {
        expect(result.current.isInitialized).toBe(true);
      });

      act(() => {
        result.current.setOnline(false);
      });

      expect(result.current.state.isOnline).toBe(false);
    });

    it('should set mock data usage', async () => {
      const { result } = renderHook(() => useDiscoveryState());

      await waitFor(() => {
        expect(result.current.isInitialized).toBe(true);
      });

      act(() => {
        result.current.setUseMockData(true);
      });

      expect(result.current.state.useMockData).toBe(true);
    });
  });

  describe('Favorites Management', () => {
    it('should add sample to favorites', async () => {
      favoritesService.addFavorite.mockResolvedValue(true);
      favoritesService.getFavorites.mockResolvedValue([mockSample]);

      const { result } = renderHook(() => useDiscoveryState());

      await waitFor(() => {
        expect(result.current.isInitialized).toBe(true);
      });

      let addResult;
      await act(async () => {
        addResult = await result.current.addToFavorites(mockSample);
      });

      expect(addResult).toBe(true);
      expect(favoritesService.addFavorite).toHaveBeenCalledWith(mockSample);
      expect(result.current.state.favorites).toEqual([mockSample]);
      expect(result.current.hasFavorites).toBe(true);
    });

    it('should handle add to favorites error', async () => {
      const error = new Error('Add failed');
      favoritesService.addFavorite.mockRejectedValue(error);

      const { result } = renderHook(() => useDiscoveryState());

      await waitFor(() => {
        expect(result.current.isInitialized).toBe(true);
      });

      let addResult;
      await act(async () => {
        addResult = await result.current.addToFavorites(mockSample);
      });

      expect(addResult).toBe(false);
      expect(result.current.state.error).toBe('Failed to add to favorites: Add failed');
    });

    it('should remove sample from favorites', async () => {
      favoritesService.removeFavorite.mockResolvedValue(true);
      favoritesService.getFavorites.mockResolvedValue([]);

      const { result } = renderHook(() => useDiscoveryState());

      await waitFor(() => {
        expect(result.current.isInitialized).toBe(true);
      });

      let removeResult;
      await act(async () => {
        removeResult = await result.current.removeFromFavorites('test-sample-1');
      });

      expect(removeResult).toBe(true);
      expect(favoritesService.removeFavorite).toHaveBeenCalledWith('test-sample-1');
      expect(result.current.state.favorites).toEqual([]);
    });

    it('should clear all favorites', async () => {
      favoritesService.clearFavorites.mockResolvedValue(true);

      const { result } = renderHook(() => useDiscoveryState());

      await waitFor(() => {
        expect(result.current.isInitialized).toBe(true);
      });

      let clearResult;
      await act(async () => {
        clearResult = await result.current.clearFavorites();
      });

      expect(clearResult).toBe(true);
      expect(favoritesService.clearFavorites).toHaveBeenCalled();
      expect(result.current.state.favorites).toEqual([]);
    });
  });

  describe('History Management', () => {
    it('should clear history', async () => {
      historyService.clearHistory.mockReturnValue(true);

      const { result } = renderHook(() => useDiscoveryState());

      await waitFor(() => {
        expect(result.current.isInitialized).toBe(true);
      });

      let clearResult;
      act(() => {
        clearResult = result.current.clearHistory();
      });

      expect(clearResult).toBe(true);
      expect(historyService.clearHistory).toHaveBeenCalled();
      expect(result.current.state.history).toEqual([]);
    });

    it('should handle history service errors', async () => {
      historyService.clearHistory.mockImplementation(() => {
        throw new Error('Clear failed');
      });

      const { result } = renderHook(() => useDiscoveryState());

      await waitFor(() => {
        expect(result.current.isInitialized).toBe(true);
      });

      let clearResult;
      act(() => {
        clearResult = result.current.clearHistory();
      });

      expect(clearResult).toBe(false);
      expect(result.current.state.error).toBe('Failed to clear history: Clear failed');
    });

    it('should listen to history changes', async () => {
      let historyListener;
      historyService.addListener.mockImplementation((listener) => {
        historyListener = listener;
      });

      const { result } = renderHook(() => useDiscoveryState());

      await waitFor(() => {
        expect(result.current.isInitialized).toBe(true);
      });

      expect(historyService.addListener).toHaveBeenCalled();

      // Simulate history change
      act(() => {
        historyListener([mockSample]);
      });

      expect(result.current.state.history).toEqual([mockSample]);
      expect(result.current.hasHistory).toBe(true);
    });
  });

  describe('State Persistence', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should persist state changes to localStorage', async () => {
      const { result } = renderHook(() => useDiscoveryState());

      await waitFor(() => {
        expect(result.current.isInitialized).toBe(true);
      }, { timeout: 10000 });

      act(() => {
        result.current.setSamples([mockSample]);
      });

      // Fast-forward past debounce delay
      act(() => {
        vi.advanceTimersByTime(600);
      });

      await waitFor(() => {
        expect(localStorageMock.setItem).toHaveBeenCalledWith(
          'sampleDiscovery.state',
          expect.stringContaining('"samples":[')
        );
      }, { timeout: 1000 });
    });

    it('should debounce persistence calls', async () => {
      const { result } = renderHook(() => useDiscoveryState());

      await waitFor(() => {
        expect(result.current.isInitialized).toBe(true);
      }, { timeout: 10000 });

      // Make multiple rapid changes
      act(() => {
        result.current.setSamples([mockSample]);
        result.current.setLoading(true);
        result.current.setError('test error');
      });

      // Should not persist yet
      expect(localStorageMock.setItem).not.toHaveBeenCalled();

      // Fast-forward past debounce delay
      act(() => {
        vi.advanceTimersByTime(600);
      });

      // Should persist only once
      await waitFor(() => {
        expect(localStorageMock.setItem).toHaveBeenCalledTimes(1);
      }, { timeout: 1000 });
    });

    it('should handle localStorage persistence errors', async () => {
      localStorageMock.setItem.mockImplementation(() => {
        throw new Error('Storage full');
      });

      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const { result } = renderHook(() => useDiscoveryState());

      await waitFor(() => {
        expect(result.current.isInitialized).toBe(true);
      }, { timeout: 10000 });

      act(() => {
        result.current.setSamples([mockSample]);
      });

      act(() => {
        vi.advanceTimersByTime(600);
      });

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith(
          'Failed to persist discovery state:',
          expect.any(Error)
        );
      }, { timeout: 1000 });

      consoleSpy.mockRestore();
    });
  });

  describe('Memory Management', () => {
    it('should cleanup memory periodically', async () => {
      vi.useFakeTimers();
      
      historyService.cleanupOldEntries.mockReturnValue(5);
      historyService.getHistory.mockReturnValue([]);

      const { result } = renderHook(() => useDiscoveryState());

      await waitFor(() => {
        expect(result.current.isInitialized).toBe(true);
      }, { timeout: 10000 });

      // Fast-forward 5 minutes to trigger cleanup
      act(() => {
        vi.advanceTimersByTime(5 * 60 * 1000);
      });

      await waitFor(() => {
        expect(historyService.cleanupOldEntries).toHaveBeenCalled();
      }, { timeout: 1000 });
      
      vi.useRealTimers();
    });

    it('should provide memory cleanup function', async () => {
      const { result } = renderHook(() => useDiscoveryState());

      await waitFor(() => {
        expect(result.current.isInitialized).toBe(true);
      }, { timeout: 10000 });

      // Create many samples
      const manySamples = Array.from({ length: 250 }, (_, i) => ({
        ...mockSample,
        id: `sample-${i}`
      }));

      act(() => {
        result.current.setSamples(manySamples);
      });

      expect(result.current.state.samples).toHaveLength(200); // Limited during setSamples

      // Manual cleanup should work
      act(() => {
        result.current.cleanupMemory();
      });

      expect(historyService.cleanupOldEntries).toHaveBeenCalled();
    });

    it('should provide state statistics', async () => {
      const { result } = renderHook(() => useDiscoveryState());

      await waitFor(() => {
        expect(result.current.isInitialized).toBe(true);
      }, { timeout: 10000 });

      act(() => {
        result.current.setSamples([mockSample]);
        result.current.setCurrentSample(mockSample);
        result.current.setLoading(true);
        result.current.setError('test error');
      });

      const stats = result.current.getStateStats();

      expect(stats).toEqual({
        samplesCount: 1,
        favoritesCount: 0,
        historyCount: 0,
        currentSample: mockSample.id,
        isLoading: true,
        hasError: true,
        isOnline: true,
        useMockData: false,
        memoryUsage: {
          samples: expect.any(Number),
          favorites: expect.any(Number),
          history: expect.any(Number)
        },
        stateHistory: expect.any(Number)
      });
    });
  });

  describe('State Reset', () => {
    it('should reset state to defaults', async () => {
      const { result } = renderHook(() => useDiscoveryState());

      await waitFor(() => {
        expect(result.current.isInitialized).toBe(true);
      });

      // Make some changes
      act(() => {
        result.current.setSamples([mockSample]);
        result.current.setCurrentSample(mockSample);
        result.current.setLoading(true);
        result.current.setError('test error');
      });

      // Reset state
      act(() => {
        result.current.resetState();
      });

      const defaultState = createDefaultDiscoveryState();
      expect(result.current.state.samples).toEqual(defaultState.samples);
      expect(result.current.state.currentSample).toBe(defaultState.currentSample);
      expect(result.current.state.isLoading).toBe(defaultState.isLoading);
      expect(result.current.state.error).toBe(defaultState.error);
    });
  });

  describe('Computed Values', () => {
    it('should provide correct computed values', async () => {
      const { result } = renderHook(() => useDiscoveryState());

      await waitFor(() => {
        expect(result.current.isInitialized).toBe(true);
      });

      // Initial state
      expect(result.current.hasError).toBe(false);
      expect(result.current.isEmpty).toBe(true);
      expect(result.current.hasFavorites).toBe(false);
      expect(result.current.hasHistory).toBe(false);

      // After changes
      act(() => {
        result.current.setSamples([mockSample]);
        result.current.setError('test error');
      });

      expect(result.current.hasError).toBe(true);
      expect(result.current.isEmpty).toBe(false);
    });
  });

  describe('Cleanup', () => {
    it('should cleanup resources on unmount', async () => {
      const { result, unmount } = renderHook(() => useDiscoveryState());

      await waitFor(() => {
        expect(result.current.isInitialized).toBe(true);
      });

      expect(historyService.addListener).toHaveBeenCalled();

      unmount();

      expect(historyService.removeListener).toHaveBeenCalled();
    });
  });
});