/**
 * @fileoverview Unit tests for HistoryService
 * Tests history tracking, persistence, and management functionality
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import historyService from '../HistoryService.js';

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

describe('HistoryService', () => {
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

  const mockSample2 = {
    id: 'sample2',
    title: 'Another Sample',
    artist: 'Another Artist',
    year: 1980,
    genre: 'Soul',
    duration: 240,
    youtubeId: 'def456',
    thumbnailUrl: 'https://example.com/thumb2.jpg',
    isMock: true
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset service state
    historyService.history = [];
    historyService.listeners.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Initialization', () => {
    it('initializes with empty history when no storage data', () => {
      localStorageMock.getItem.mockReturnValue(null);
      
      historyService.loadHistory();
      
      expect(historyService.getHistory()).toEqual([]);
    });

    it('loads existing history from storage', () => {
      const storedHistory = [mockSample, mockSample2];
      localStorageMock.getItem.mockReturnValue(JSON.stringify(storedHistory));
      
      historyService.loadHistory();
      
      expect(historyService.getHistory()).toEqual(storedHistory);
    });

    it('handles corrupted storage data gracefully', () => {
      localStorageMock.getItem.mockReturnValue('invalid json');
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      historyService.loadHistory();
      
      expect(historyService.getHistory()).toEqual([]);
      expect(consoleSpy).toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });

    it('filters out invalid items from storage', () => {
      const storedHistory = [
        mockSample,
        { id: 'invalid', title: '' }, // Invalid sample
        mockSample2
      ];
      localStorageMock.getItem.mockReturnValue(JSON.stringify(storedHistory));
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      historyService.loadHistory();
      
      expect(historyService.getHistory()).toEqual([mockSample, mockSample2]);
      expect(consoleSpy).toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });
  });

  describe('Adding to History', () => {
    it('adds valid sample to history', () => {
      const result = historyService.addToHistory(mockSample);
      
      expect(result).toBe(true);
      expect(historyService.getHistory()).toHaveLength(1);
      expect(historyService.getHistory()[0]).toMatchObject(mockSample);
      expect(historyService.getHistory()[0].viewedAt).toBeTypeOf('number');
    });

    it('rejects invalid sample', () => {
      const invalidSample = { id: 'invalid', title: '' };
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      const result = historyService.addToHistory(invalidSample);
      
      expect(result).toBe(false);
      expect(historyService.getHistory()).toHaveLength(0);
      expect(consoleSpy).toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });

    it('moves existing sample to top when re-added', () => {
      historyService.addToHistory(mockSample);
      historyService.addToHistory(mockSample2);
      
      // Re-add first sample
      historyService.addToHistory(mockSample);
      
      const history = historyService.getHistory();
      expect(history).toHaveLength(2);
      expect(history[0].id).toBe('sample1');
      expect(history[1].id).toBe('sample2');
    });

    it('limits history to maximum items', () => {
      const originalMax = historyService.maxHistoryItems;
      historyService.maxHistoryItems = 2;
      
      historyService.addToHistory(mockSample);
      historyService.addToHistory(mockSample2);
      historyService.addToHistory({ ...mockSample, id: 'sample3' });
      
      expect(historyService.getHistory()).toHaveLength(2);
      expect(historyService.getHistory()[0].id).toBe('sample3');
      expect(historyService.getHistory()[1].id).toBe('sample2');
      
      historyService.maxHistoryItems = originalMax;
    });

    it('saves to localStorage after adding', () => {
      historyService.addToHistory(mockSample);
      
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'sampleDiscovery.history',
        expect.stringContaining(mockSample.id)
      );
    });

    it('notifies listeners when adding', () => {
      const listener = vi.fn();
      historyService.addListener(listener);
      
      historyService.addToHistory(mockSample);
      
      expect(listener).toHaveBeenCalledWith([expect.objectContaining(mockSample)]);
    });
  });

  describe('Clearing History', () => {
    beforeEach(() => {
      historyService.addToHistory(mockSample);
      historyService.addToHistory(mockSample2);
    });

    it('clears all history', () => {
      const result = historyService.clearHistory();
      
      expect(result).toBe(true);
      expect(historyService.getHistory()).toHaveLength(0);
    });

    it('saves empty history to localStorage', () => {
      historyService.clearHistory();
      
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'sampleDiscovery.history',
        '[]'
      );
    });

    it('notifies listeners when clearing', () => {
      const listener = vi.fn();
      historyService.addListener(listener);
      
      historyService.clearHistory();
      
      expect(listener).toHaveBeenCalledWith([]);
    });
  });

  describe('Removing from History', () => {
    beforeEach(() => {
      historyService.addToHistory(mockSample);
      historyService.addToHistory(mockSample2);
    });

    it('removes specific item from history', () => {
      const result = historyService.removeFromHistory('sample1');
      
      expect(result).toBe(true);
      expect(historyService.getHistory()).toHaveLength(1);
      expect(historyService.getHistory()[0].id).toBe('sample2');
    });

    it('returns false when item not found', () => {
      const result = historyService.removeFromHistory('nonexistent');
      
      expect(result).toBe(false);
      expect(historyService.getHistory()).toHaveLength(2);
    });

    it('notifies listeners when removing', () => {
      const listener = vi.fn();
      historyService.addListener(listener);
      
      historyService.removeFromHistory('sample1');
      
      expect(listener).toHaveBeenCalledWith([expect.objectContaining({ id: 'sample2' })]);
    });
  });

  describe('History Statistics', () => {
    beforeEach(() => {
      const now = Date.now();
      historyService.addToHistory(mockSample); // This will get current timestamp
      historyService.addToHistory(mockSample2); // This will get current timestamp
      // Manually set viewedAt for testing
      // history[0] is mockSample2 (added last, so at top)
      // history[1] is mockSample (added first, so at bottom)
      historyService.history[0].viewedAt = now - 1000 * 60 * 30; // 30 min ago (sample2)
      historyService.history[1].viewedAt = now - 1000 * 60 * 60 * 2; // 2 hours ago (sample1)
    });

    it('calculates basic statistics', () => {
      const stats = historyService.getHistoryStats();
      
      expect(stats.total).toBe(2);
      expect(stats.today).toBe(2);
      expect(stats.thisWeek).toBe(2);
      expect(stats.thisMonth).toBe(2);
    });

    it('calculates genre statistics', () => {
      const stats = historyService.getHistoryStats();
      
      expect(stats.genres).toEqual({
        'Funk': 1,
        'Soul': 1
      });
    });

    it('calculates year statistics', () => {
      const stats = historyService.getHistoryStats();
      
      expect(stats.years).toEqual({
        '1975': 1,
        '1980': 1
      });
    });

    it('identifies oldest and newest entries', () => {
      const stats = historyService.getHistoryStats();
      
      expect(stats.oldestEntry.id).toBe('sample1'); // sample1 has older timestamp (2 hours ago)
      expect(stats.newestEntry.id).toBe('sample2'); // sample2 has newer timestamp (30 min ago)
    });
  });

  describe('Search Functionality', () => {
    beforeEach(() => {
      historyService.addToHistory(mockSample);
      historyService.addToHistory(mockSample2);
    });

    it('searches by title', () => {
      const results = historyService.searchHistory('Test');
      
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('sample1');
    });

    it('searches by artist', () => {
      const results = historyService.searchHistory('Another Artist');
      
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('sample2');
    });

    it('searches by genre', () => {
      const results = historyService.searchHistory('funk');
      
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('sample1');
    });

    it('returns all items for empty query', () => {
      const results = historyService.searchHistory('');
      
      expect(results).toHaveLength(2);
    });

    it('returns empty array for no matches', () => {
      const results = historyService.searchHistory('nonexistent');
      
      expect(results).toHaveLength(0);
    });
  });

  describe('Date Range Filtering', () => {
    beforeEach(() => {
      const now = Date.now();
      historyService.addToHistory(mockSample);
      historyService.addToHistory(mockSample2);
      // Manually set viewedAt for testing
      // history[0] is mockSample2 (added last, so at top)
      // history[1] is mockSample (added first, so at bottom)
      historyService.history[0].viewedAt = now - 1000 * 60 * 60; // 1 hour ago (sample2)
      historyService.history[1].viewedAt = now - 1000 * 60 * 60 * 24; // 1 day ago (sample1)
    });

    it('filters by date range', () => {
      const now = Date.now();
      const results = historyService.getHistoryByDateRange(
        now - 1000 * 60 * 60 * 2, // 2 hours ago
        now
      );
      
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('sample2'); // sample2 has newer timestamp (1 hour ago)
    });
  });

  describe('Utility Functions', () => {
    beforeEach(() => {
      historyService.addToHistory(mockSample);
    });

    it('checks if sample is in history', () => {
      expect(historyService.isInHistory('sample1')).toBe(true);
      expect(historyService.isInHistory('nonexistent')).toBe(false);
    });

    it('gets last viewed time', () => {
      const time = historyService.getLastViewedTime('sample1');
      
      expect(time).toBeTypeOf('number');
      expect(time).toBeGreaterThan(0);
    });

    it('returns null for non-existent sample', () => {
      const time = historyService.getLastViewedTime('nonexistent');
      
      expect(time).toBeNull();
    });
  });

  describe('Listener Management', () => {
    it('adds and removes listeners', () => {
      const listener = vi.fn();
      
      historyService.addListener(listener);
      expect(historyService.listeners.has(listener)).toBe(true);
      
      historyService.removeListener(listener);
      expect(historyService.listeners.has(listener)).toBe(false);
    });

    it('ignores non-function listeners', () => {
      historyService.addListener('not a function');
      
      expect(historyService.listeners.size).toBe(0);
    });

    it('handles listener errors gracefully', () => {
      const errorListener = vi.fn().mockImplementation(() => {
        throw new Error('Listener error');
      });
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      historyService.addListener(errorListener);
      historyService.addToHistory(mockSample);
      
      expect(consoleSpy).toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });
  });

  describe('Import/Export', () => {
    beforeEach(() => {
      historyService.addToHistory(mockSample);
      historyService.addToHistory(mockSample2);
    });

    it('exports history data', () => {
      const exported = historyService.exportHistory();
      
      expect(exported).toHaveProperty('version', '1.0');
      expect(exported).toHaveProperty('exportedAt');
      expect(exported).toHaveProperty('history');
      expect(exported).toHaveProperty('stats');
      expect(exported.history).toHaveLength(2);
    });

    it('imports valid history data', () => {
      const importData = {
        version: '1.0',
        history: [{ ...mockSample, id: 'imported1' }]
      };
      
      const result = historyService.importHistory(importData);
      
      expect(result).toBe(true);
      expect(historyService.getHistory()).toHaveLength(3);
      expect(historyService.isInHistory('imported1')).toBe(true);
    });

    it('rejects invalid import data', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      const result = historyService.importHistory({ invalid: 'data' });
      
      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });
  });

  describe('Cleanup', () => {
    it('removes old entries', () => {
      const now = Date.now();
      historyService.addToHistory(mockSample);
      historyService.addToHistory(mockSample2);
      // Manually set viewedAt for testing
      // history[0] is mockSample2 (added last, so at top)
      // history[1] is mockSample (added first, so at bottom)
      historyService.history[0].viewedAt = now; // Now (sample2)
      historyService.history[1].viewedAt = now - 1000 * 60 * 60 * 24 * 31; // 31 days ago (sample1)
      
      const removed = historyService.cleanupOldEntries(1000 * 60 * 60 * 24 * 30); // 30 days
      
      expect(removed).toBe(1);
      expect(historyService.getHistory()).toHaveLength(1);
      expect(historyService.getHistory()[0].id).toBe('sample2'); // sample2 should remain (newer timestamp)
    });

    it('gets memory usage information', () => {
      const usage = historyService.getMemoryUsage();
      
      expect(usage).toHaveProperty('totalItems');
      expect(usage).toHaveProperty('maxItems');
      expect(usage).toHaveProperty('estimatedSizeBytes');
      expect(usage).toHaveProperty('averageItemSizeBytes');
      expect(usage).toHaveProperty('utilizationPercent');
    });

    it('destroys service and cleans up', () => {
      const listener = vi.fn();
      historyService.addListener(listener);
      historyService.addToHistory(mockSample);
      
      historyService.destroy();
      
      expect(historyService.listeners.size).toBe(0);
      expect(historyService.history).toHaveLength(0);
    });
  });

  describe('Error Handling', () => {
    it('handles localStorage errors gracefully', () => {
      localStorageMock.setItem.mockImplementation(() => {
        throw new Error('Storage error');
      });
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      const result = historyService.addToHistory(mockSample);
      
      expect(result).toBe(true); // Should still succeed
      expect(consoleSpy).toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });

    it('handles errors in addToHistory', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      // Force an error by corrupting the service
      const originalHistory = historyService.history;
      historyService.history = null;
      
      const result = historyService.addToHistory(mockSample);
      
      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenCalled();
      
      historyService.history = originalHistory;
      consoleSpy.mockRestore();
    });
  });
});