/**
 * @fileoverview Simplified unit tests for useDiscoveryState hook
 * Tests core state management functionality
 */

import { renderHook, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { useDiscoveryState } from '../useDiscoveryState.js';
import { createDefaultDiscoveryState } from '../../types/discovery.js';

// Mock the services
vi.mock('../../services/discovery/FavoritesService.js', () => ({
  favoritesService: {
    getFavorites: vi.fn().mockResolvedValue([]),
    addFavorite: vi.fn().mockResolvedValue(true),
    removeFavorite: vi.fn().mockResolvedValue(true),
    clearFavorites: vi.fn().mockResolvedValue(true)
  }
}));

vi.mock('../../services/discovery/HistoryService.js', () => ({
  default: {
    getHistory: vi.fn().mockReturnValue([]),
    addToHistory: vi.fn().mockReturnValue(true),
    clearHistory: vi.fn().mockReturnValue(true),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    cleanupOldEntries: vi.fn().mockReturnValue(0)
  }
}));

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn().mockReturnValue(null),
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

const mockFilters = {
  genres: ['Soul', 'Jazz'],
  yearRange: { start: 1970, end: 1990 }
};

describe('useDiscoveryState - Core Functionality', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic State Management', () => {
    it('should initialize with default state', () => {
      const { result } = renderHook(() => useDiscoveryState());

      const defaultState = createDefaultDiscoveryState();
      expect(result.current.state.samples).toEqual(defaultState.samples);
      expect(result.current.state.currentSample).toBe(defaultState.currentSample);
      expect(result.current.state.filters).toEqual(defaultState.filters);
      expect(result.current.state.isLoading).toBe(defaultState.isLoading);
      expect(result.current.state.error).toBe(defaultState.error);
    });

    it('should provide all required functions', () => {
      const { result } = renderHook(() => useDiscoveryState());

      // State management functions
      expect(typeof result.current.setSamples).toBe('function');
      expect(typeof result.current.setCurrentSample).toBe('function');
      expect(typeof result.current.setFilters).toBe('function');
      expect(typeof result.current.setLoading).toBe('function');
      expect(typeof result.current.setError).toBe('function');
      expect(typeof result.current.setOnline).toBe('function');
      expect(typeof result.current.setUseMockData).toBe('function');

      // Favorites management
      expect(typeof result.current.addToFavorites).toBe('function');
      expect(typeof result.current.removeFromFavorites).toBe('function');
      expect(typeof result.current.clearFavorites).toBe('function');

      // History management
      expect(typeof result.current.clearHistory).toBe('function');

      // Utility functions
      expect(typeof result.current.resetState).toBe('function');
      expect(typeof result.current.getStateStats).toBe('function');
      expect(typeof result.current.cleanupMemory).toBe('function');
    });

    it('should provide computed values', () => {
      const { result } = renderHook(() => useDiscoveryState());

      expect(typeof result.current.hasError).toBe('boolean');
      expect(typeof result.current.isEmpty).toBe('boolean');
      expect(typeof result.current.hasFavorites).toBe('boolean');
      expect(typeof result.current.hasHistory).toBe('boolean');
    });
  });

  describe('Sample Management', () => {
    it('should set samples correctly', () => {
      const { result } = renderHook(() => useDiscoveryState());

      act(() => {
        result.current.setSamples([mockSample]);
      });

      expect(result.current.state.samples).toEqual([mockSample]);
      expect(result.current.isEmpty).toBe(false);
    });

    it('should filter out invalid samples', () => {
      const { result } = renderHook(() => useDiscoveryState());

      const invalidSample = { id: 'invalid', title: '' }; // Missing required fields

      act(() => {
        result.current.setSamples([mockSample, invalidSample]);
      });

      expect(result.current.state.samples).toEqual([mockSample]);
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
    it('should set current sample', () => {
      const { result } = renderHook(() => useDiscoveryState());

      act(() => {
        result.current.setCurrentSample(mockSample);
      });

      expect(result.current.state.currentSample).toEqual(mockSample);
    });

    it('should clear current sample', () => {
      const { result } = renderHook(() => useDiscoveryState());

      act(() => {
        result.current.setCurrentSample(mockSample);
      });

      act(() => {
        result.current.setCurrentSample(null);
      });

      expect(result.current.state.currentSample).toBe(null);
    });

    it('should reject invalid current sample', () => {
      const { result } = renderHook(() => useDiscoveryState());

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const invalidSample = { id: 'invalid' }; // Missing required fields

      act(() => {
        result.current.setCurrentSample(invalidSample);
      });

      expect(consoleSpy).toHaveBeenCalled();
      expect(result.current.state.currentSample).toBe(null);

      consoleSpy.mockRestore();
    });
  });

  describe('Filter Management', () => {
    it('should set filters correctly', () => {
      const { result } = renderHook(() => useDiscoveryState());

      act(() => {
        result.current.setFilters(mockFilters);
      });

      expect(result.current.state.filters).toEqual(mockFilters);
    });

    it('should reject invalid filters', () => {
      const { result } = renderHook(() => useDiscoveryState());

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const invalidFilters = { genres: 'not-an-array' };

      act(() => {
        result.current.setFilters(invalidFilters);
      });

      expect(consoleSpy).toHaveBeenCalled();
      expect(result.current.state.filters).toEqual(createDefaultDiscoveryState().filters);

      consoleSpy.mockRestore();
    });
  });

  describe('UI State Management', () => {
    it('should set loading state', () => {
      const { result } = renderHook(() => useDiscoveryState());

      act(() => {
        result.current.setLoading(true);
      });

      expect(result.current.state.isLoading).toBe(true);
    });

    it('should set error state', () => {
      const { result } = renderHook(() => useDiscoveryState());

      act(() => {
        result.current.setError('Test error');
      });

      expect(result.current.state.error).toBe('Test error');
      expect(result.current.hasError).toBe(true);
    });

    it('should clear error state', () => {
      const { result } = renderHook(() => useDiscoveryState());

      act(() => {
        result.current.setError('Test error');
      });

      act(() => {
        result.current.setError(null);
      });

      expect(result.current.state.error).toBe(null);
      expect(result.current.hasError).toBe(false);
    });

    it('should set online status', () => {
      const { result } = renderHook(() => useDiscoveryState());

      act(() => {
        result.current.setOnline(false);
      });

      expect(result.current.state.isOnline).toBe(false);
    });

    it('should set mock data usage', () => {
      const { result } = renderHook(() => useDiscoveryState());

      act(() => {
        result.current.setUseMockData(true);
      });

      expect(result.current.state.useMockData).toBe(true);
    });
  });

  describe('State Statistics', () => {
    it('should provide state statistics', () => {
      const { result } = renderHook(() => useDiscoveryState());

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
    it('should reset state to defaults', () => {
      const { result } = renderHook(() => useDiscoveryState());

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

  describe('Memory Management', () => {
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

    it('should provide cleanup function', () => {
      const { result } = renderHook(() => useDiscoveryState());

      expect(() => {
        act(() => {
          result.current.cleanupMemory();
        });
      }).not.toThrow();
    });
  });

  describe('Computed Values', () => {
    it('should provide correct computed values', () => {
      const { result } = renderHook(() => useDiscoveryState());

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
});