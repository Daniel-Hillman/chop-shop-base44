/**
 * @fileoverview Unit tests for useHistory hook
 * Tests React integration for history management
 */

import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useHistory } from '../useHistory.js';
import historyService from '../../services/discovery/HistoryService.js';

// Mock the HistoryService
vi.mock('../../services/discovery/HistoryService.js', () => ({
  default: {
    getHistory: vi.fn(),
    addToHistory: vi.fn(),
    clearHistory: vi.fn(),
    removeFromHistory: vi.fn(),
    searchHistory: vi.fn(),
    getHistoryStats: vi.fn(),
    isInHistory: vi.fn(),
    getLastViewedTime: vi.fn(),
    exportHistory: vi.fn(),
    importHistory: vi.fn(),
    cleanupOldEntries: vi.fn(),
    getMemoryUsage: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn()
  }
}));

describe('useHistory', () => {
  const mockSample = {
    id: 'sample1',
    title: 'Test Sample',
    artist: 'Test Artist',
    year: 1975,
    genre: 'Funk',
    duration: 180,
    youtubeId: 'abc123',
    thumbnailUrl: 'https://example.com/thumb.jpg',
    isMock: false
  };

  const mockHistory = [mockSample];

  beforeEach(() => {
    vi.clearAllMocks();
    historyService.getHistory.mockReturnValue(mockHistory);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Initialization', () => {
    it('initializes with history from service', () => {
      const { result } = renderHook(() => useHistory());
      
      expect(result.current.history).toEqual(mockHistory);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('sets up listener on mount', () => {
      renderHook(() => useHistory());
      
      expect(historyService.addListener).toHaveBeenCalledWith(expect.any(Function));
    });

    it('removes listener on unmount', () => {
      const { unmount } = renderHook(() => useHistory());
      
      unmount();
      
      expect(historyService.removeListener).toHaveBeenCalledWith(expect.any(Function));
    });
  });

  describe('History Updates', () => {
    it('updates history when service notifies', () => {
      let historyListener;
      historyService.addListener.mockImplementation((listener) => {
        historyListener = listener;
      });

      const { result } = renderHook(() => useHistory());
      
      const newHistory = [...mockHistory, { ...mockSample, id: 'sample2' }];
      
      act(() => {
        historyListener(newHistory);
      });
      
      expect(result.current.history).toEqual(newHistory);
    });
  });

  describe('Adding to History', () => {
    it('adds sample to history successfully', async () => {
      historyService.addToHistory.mockReturnValue(true);
      
      const { result } = renderHook(() => useHistory());
      
      await act(async () => {
        await result.current.addToHistory(mockSample);
      });
      
      expect(historyService.addToHistory).toHaveBeenCalledWith(mockSample);
      expect(result.current.error).toBeNull();
    });

    it('handles add to history failure', async () => {
      historyService.addToHistory.mockReturnValue(false);
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      const { result } = renderHook(() => useHistory());
      
      await act(async () => {
        await result.current.addToHistory(mockSample);
      });
      
      expect(result.current.error).toBe('Failed to add sample to history');
      
      consoleSpy.mockRestore();
    });

    it('handles add to history error', async () => {
      historyService.addToHistory.mockImplementation(() => {
        throw new Error('Service error');
      });
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      const { result } = renderHook(() => useHistory());
      
      await act(async () => {
        await result.current.addToHistory(mockSample);
      });
      
      expect(result.current.error).toBe('Service error');
      
      consoleSpy.mockRestore();
    });
  });

  describe('Clearing History', () => {
    it('clears history successfully', async () => {
      historyService.clearHistory.mockReturnValue(true);
      
      const { result } = renderHook(() => useHistory());
      
      await act(async () => {
        await result.current.clearHistory();
      });
      
      expect(historyService.clearHistory).toHaveBeenCalled();
      expect(result.current.error).toBeNull();
      expect(result.current.isLoading).toBe(false);
    });

    it('handles clear history failure', async () => {
      historyService.clearHistory.mockReturnValue(false);
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      const { result } = renderHook(() => useHistory());
      
      await act(async () => {
        await result.current.clearHistory();
      });
      
      expect(result.current.error).toBe('Failed to clear history');
      expect(result.current.isLoading).toBe(false);
      
      consoleSpy.mockRestore();
    });

    it('sets loading state during clear', async () => {
      let resolvePromise;
      const promise = new Promise(resolve => {
        resolvePromise = resolve;
      });
      historyService.clearHistory.mockReturnValue(promise);
      
      const { result } = renderHook(() => useHistory());
      
      // Start the clear operation
      act(() => {
        result.current.clearHistory();
      });
      
      // Check loading state is true
      expect(result.current.isLoading).toBe(true);
      
      // Resolve the promise and wait for completion
      await act(async () => {
        resolvePromise(true);
        await promise;
      });
      
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('Removing from History', () => {
    it('removes item from history successfully', async () => {
      historyService.removeFromHistory.mockReturnValue(true);
      
      const { result } = renderHook(() => useHistory());
      
      await act(async () => {
        await result.current.removeFromHistory('sample1');
      });
      
      expect(historyService.removeFromHistory).toHaveBeenCalledWith('sample1');
      expect(result.current.error).toBeNull();
    });

    it('handles remove from history failure', async () => {
      historyService.removeFromHistory.mockReturnValue(false);
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      const { result } = renderHook(() => useHistory());
      
      await act(async () => {
        await result.current.removeFromHistory('sample1');
      });
      
      expect(result.current.error).toBe('Failed to remove item from history');
      
      consoleSpy.mockRestore();
    });
  });

  describe('Search History', () => {
    it('searches history successfully', () => {
      const searchResults = [mockSample];
      historyService.searchHistory.mockReturnValue(searchResults);
      
      const { result } = renderHook(() => useHistory());
      
      const results = result.current.searchHistory('test');
      
      expect(historyService.searchHistory).toHaveBeenCalledWith('test');
      expect(results).toEqual(searchResults);
    });

    it('handles search error', () => {
      historyService.searchHistory.mockImplementation(() => {
        throw new Error('Search error');
      });
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      const { result } = renderHook(() => useHistory());
      
      let results;
      act(() => {
        results = result.current.searchHistory('test');
      });
      
      expect(results).toEqual([]);
      expect(result.current.error).toBe('Search error');
      
      consoleSpy.mockRestore();
    });
  });

  describe('History Statistics', () => {
    it('gets history stats successfully', () => {
      const mockStats = {
        total: 1,
        today: 1,
        thisWeek: 1,
        thisMonth: 1,
        genres: { 'Funk': 1 },
        years: { '1975': 1 }
      };
      historyService.getHistoryStats.mockReturnValue(mockStats);
      
      const { result } = renderHook(() => useHistory());
      
      const stats = result.current.getHistoryStats();
      
      expect(historyService.getHistoryStats).toHaveBeenCalled();
      expect(stats).toEqual(mockStats);
    });

    it('handles stats error', () => {
      historyService.getHistoryStats.mockImplementation(() => {
        throw new Error('Stats error');
      });
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      const { result } = renderHook(() => useHistory());
      
      let stats;
      act(() => {
        stats = result.current.getHistoryStats();
      });
      
      expect(stats).toEqual({
        total: 0,
        today: 0,
        thisWeek: 0,
        thisMonth: 0,
        genres: {},
        years: {}
      });
      expect(result.current.error).toBe('Stats error');
      
      consoleSpy.mockRestore();
    });
  });

  describe('Utility Functions', () => {
    it('checks if sample is in history', () => {
      historyService.isInHistory.mockReturnValue(true);
      
      const { result } = renderHook(() => useHistory());
      
      const isInHistory = result.current.isInHistory('sample1');
      
      expect(historyService.isInHistory).toHaveBeenCalledWith('sample1');
      expect(isInHistory).toBe(true);
    });

    it('gets last viewed time', () => {
      const timestamp = Date.now();
      historyService.getLastViewedTime.mockReturnValue(timestamp);
      
      const { result } = renderHook(() => useHistory());
      
      const time = result.current.getLastViewedTime('sample1');
      
      expect(historyService.getLastViewedTime).toHaveBeenCalledWith('sample1');
      expect(time).toBe(timestamp);
    });
  });

  describe('Import/Export', () => {
    it('exports history successfully', () => {
      const exportData = { version: '1.0', history: mockHistory };
      historyService.exportHistory.mockReturnValue(exportData);
      
      const { result } = renderHook(() => useHistory());
      
      const exported = result.current.exportHistory();
      
      expect(historyService.exportHistory).toHaveBeenCalled();
      expect(exported).toEqual(exportData);
    });

    it('handles export error', () => {
      historyService.exportHistory.mockImplementation(() => {
        throw new Error('Export error');
      });
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      const { result } = renderHook(() => useHistory());
      
      let exported;
      act(() => {
        exported = result.current.exportHistory();
      });
      
      expect(exported).toBeNull();
      expect(result.current.error).toBe('Export error');
      
      consoleSpy.mockRestore();
    });

    it('imports history successfully', async () => {
      historyService.importHistory.mockReturnValue(true);
      
      const { result } = renderHook(() => useHistory());
      
      const importData = { version: '1.0', history: mockHistory };
      
      await act(async () => {
        const success = await result.current.importHistory(importData);
        expect(success).toBe(true);
      });
      
      expect(historyService.importHistory).toHaveBeenCalledWith(importData);
      expect(result.current.error).toBeNull();
      expect(result.current.isLoading).toBe(false);
    });

    it('handles import failure', async () => {
      historyService.importHistory.mockReturnValue(false);
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      const { result } = renderHook(() => useHistory());
      
      const importData = { version: '1.0', history: mockHistory };
      
      await act(async () => {
        const success = await result.current.importHistory(importData);
        expect(success).toBe(false);
      });
      
      expect(result.current.error).toBe('Failed to import history data');
      expect(result.current.isLoading).toBe(false);
      
      consoleSpy.mockRestore();
    });
  });

  describe('Cleanup', () => {
    it('cleans up old entries successfully', async () => {
      historyService.cleanupOldEntries.mockReturnValue(5);
      
      const { result } = renderHook(() => useHistory());
      
      await act(async () => {
        const removed = await result.current.cleanupOldEntries(1000 * 60 * 60 * 24 * 30);
        expect(removed).toBe(5);
      });
      
      expect(historyService.cleanupOldEntries).toHaveBeenCalledWith(1000 * 60 * 60 * 24 * 30);
      expect(result.current.error).toBeNull();
    });

    it('handles cleanup error', async () => {
      historyService.cleanupOldEntries.mockImplementation(() => {
        throw new Error('Cleanup error');
      });
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      const { result } = renderHook(() => useHistory());
      
      await act(async () => {
        const removed = await result.current.cleanupOldEntries();
        expect(removed).toBe(0);
      });
      
      expect(result.current.error).toBe('Cleanup error');
      
      consoleSpy.mockRestore();
    });
  });

  describe('Memory Usage', () => {
    it('gets memory usage successfully', () => {
      const mockUsage = {
        totalItems: 10,
        maxItems: 100,
        estimatedSizeBytes: 1024,
        averageItemSizeBytes: 102,
        utilizationPercent: 10
      };
      historyService.getMemoryUsage.mockReturnValue(mockUsage);
      
      const { result } = renderHook(() => useHistory());
      
      const usage = result.current.getMemoryUsage();
      
      expect(historyService.getMemoryUsage).toHaveBeenCalled();
      expect(usage).toEqual(mockUsage);
    });

    it('handles memory usage error', () => {
      historyService.getMemoryUsage.mockImplementation(() => {
        throw new Error('Memory usage error');
      });
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      const { result } = renderHook(() => useHistory());
      
      let usage;
      act(() => {
        usage = result.current.getMemoryUsage();
      });
      
      expect(usage).toEqual({
        totalItems: 0,
        maxItems: 100,
        estimatedSizeBytes: 0,
        averageItemSizeBytes: 0,
        utilizationPercent: 0
      });
      expect(result.current.error).toBe('Memory usage error');
      
      consoleSpy.mockRestore();
    });
  });

  describe('Error Handling', () => {
    it('clears error state on successful operations', async () => {
      // First cause an error
      historyService.addToHistory.mockReturnValue(false);
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      const { result } = renderHook(() => useHistory());
      
      await act(async () => {
        await result.current.addToHistory(mockSample);
      });
      
      expect(result.current.error).toBeTruthy();
      
      // Then perform successful operation
      historyService.addToHistory.mockReturnValue(true);
      
      await act(async () => {
        await result.current.addToHistory(mockSample);
      });
      
      expect(result.current.error).toBeNull();
      
      consoleSpy.mockRestore();
    });
  });
});