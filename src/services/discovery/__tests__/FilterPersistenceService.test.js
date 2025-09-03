/**
 * @fileoverview Unit tests for FilterPersistenceService
 * Tests filter state persistence and preset management functionality
 * 
 * Requirements: 6.4, 6.5
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import filterPersistenceService, { FilterPersistenceService } from '../FilterPersistenceService.js';
import { createDefaultFilterState } from '../../../types/discovery.js';

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

describe('FilterPersistenceService', () => {
  let service;

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset localStorage mock to not throw errors by default
    localStorageMock.setItem.mockImplementation(() => {});
    localStorageMock.getItem.mockReturnValue(null);
    service = new FilterPersistenceService();
  });

  afterEach(() => {
    localStorageMock.clear();
  });

  describe('Filter State Persistence', () => {
    it('should save filter state to localStorage', () => {
      const filters = {
        genres: ['Soul', 'Funk'],
        yearRange: { start: 1970, end: 1980 },
        tempoRange: { min: 100, max: 140 }
      };

      const result = service.saveFilterState(filters);

      expect(result).toBe(true);
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'sampleDiscovery.filters',
        expect.stringContaining('"genres":["Soul","Funk"]')
      );
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'sampleDiscovery.lastAppliedFilters',
        expect.stringContaining('"genres":["Soul","Funk"]')
      );
    });

    it('should load persisted filter state', () => {
      const storedFilters = {
        filters: {
          genres: ['Jazz'],
          yearRange: { start: 1960, end: 1970 }
        },
        timestamp: Date.now(),
        version: '1.0'
      };

      localStorageMock.getItem.mockReturnValue(JSON.stringify(storedFilters));

      const result = service.loadFilterState();

      expect(result).toEqual(storedFilters.filters);
      expect(localStorageMock.getItem).toHaveBeenCalledWith('sampleDiscovery.filters');
    });

    it('should return default filters when no persisted state exists', () => {
      localStorageMock.getItem.mockReturnValue(null);

      const result = service.loadFilterState();

      expect(result).toEqual(createDefaultFilterState());
    });

    it('should return default filters when persisted state is invalid', () => {
      localStorageMock.getItem.mockReturnValue('invalid json');

      const result = service.loadFilterState();

      expect(result).toEqual(createDefaultFilterState());
    });

    it('should handle localStorage errors gracefully', () => {
      // Create a fresh service instance for this test
      const testService = new FilterPersistenceService();
      
      localStorageMock.setItem.mockImplementation(() => {
        throw new Error('Storage quota exceeded');
      });

      const filters = createDefaultFilterState();
      const result = testService.saveFilterState(filters);

      expect(result).toBe(false);
    });

    it('should get last applied filters', () => {
      const lastFilters = {
        filters: {
          genres: ['Blues'],
          yearRange: { start: 1950, end: 1960 }
        },
        timestamp: Date.now(),
        version: '1.0'
      };

      localStorageMock.getItem.mockReturnValue(JSON.stringify(lastFilters));

      const result = service.getLastAppliedFilters();

      expect(result).toEqual(lastFilters.filters);
    });

    it('should return null when no last applied filters exist', () => {
      localStorageMock.getItem.mockReturnValue(null);

      const result = service.getLastAppliedFilters();

      expect(result).toBeNull();
    });
  });

  describe('Filter Presets', () => {
    it('should save a new preset', () => {
      localStorageMock.getItem.mockReturnValue('[]');

      const filters = {
        genres: ['Soul'],
        yearRange: { start: 1970, end: 1979 }
      };

      const result = service.savePreset('My Soul Preset', 'Classic soul samples', filters);

      expect(result).toBeTruthy();
      expect(result.name).toBe('My Soul Preset');
      expect(result.description).toBe('Classic soul samples');
      expect(result.filters).toEqual(filters);
      expect(result.isDefault).toBe(false);
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'sampleDiscovery.filterPresets',
        expect.stringContaining('"name":"My Soul Preset"')
      );
    });

    it('should not save preset with duplicate name', () => {
      const existingPresets = [{
        id: 'existing',
        name: 'Existing Preset',
        filters: createDefaultFilterState(),
        isDefault: false
      }];

      localStorageMock.getItem.mockReturnValue(JSON.stringify(existingPresets));

      const result = service.savePreset('Existing Preset', 'Duplicate', createDefaultFilterState());

      expect(result).toBeNull();
    });

    it('should load a preset by ID', () => {
      const presets = [{
        id: 'test-preset',
        name: 'Test Preset',
        filters: {
          genres: ['Jazz'],
          yearRange: { start: 1960, end: 1970 }
        },
        isDefault: false,
        createdAt: Date.now(),
        lastUsed: null
      }];

      localStorageMock.getItem.mockReturnValue(JSON.stringify(presets));

      const result = service.loadPreset('test-preset');

      expect(result).toEqual(presets[0].filters);
      
      // Should update lastUsed timestamp
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'sampleDiscovery.filterPresets',
        expect.stringContaining('"lastUsed":')
      );
    });

    it('should return null when loading non-existent preset', () => {
      localStorageMock.getItem.mockReturnValue('[]');

      const result = service.loadPreset('non-existent');

      expect(result).toBeNull();
    });

    it('should get all presets', () => {
      const presets = [{
        id: 'preset1',
        name: 'Preset 1',
        filters: createDefaultFilterState(),
        isDefault: false
      }];

      localStorageMock.getItem.mockReturnValue(JSON.stringify(presets));

      const result = service.getPresets();

      expect(result).toEqual(presets);
    });

    it('should return default presets when no stored presets exist', () => {
      localStorageMock.getItem.mockReturnValue(null);

      const result = service.getPresets();

      expect(result.length).toBeGreaterThan(0);
      expect(result.every(preset => preset.isDefault)).toBe(true);
    });

    it('should delete a preset', () => {
      const presets = [
        {
          id: 'preset1',
          name: 'Preset 1',
          filters: createDefaultFilterState(),
          isDefault: false
        },
        {
          id: 'preset2',
          name: 'Preset 2',
          filters: createDefaultFilterState(),
          isDefault: false
        }
      ];

      localStorageMock.getItem.mockReturnValue(JSON.stringify(presets));

      const result = service.deletePreset('preset1');

      expect(result).toBe(true);
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'sampleDiscovery.filterPresets',
        expect.not.stringContaining('"id":"preset1"')
      );
    });

    it('should not delete default presets', () => {
      const presets = [{
        id: 'default-preset',
        name: 'Default Preset',
        filters: createDefaultFilterState(),
        isDefault: true
      }];

      localStorageMock.getItem.mockReturnValue(JSON.stringify(presets));

      const result = service.deletePreset('default-preset');

      expect(result).toBe(false);
    });

    it('should update a preset', () => {
      const presets = [{
        id: 'preset1',
        name: 'Original Name',
        description: 'Original Description',
        filters: createDefaultFilterState(),
        isDefault: false,
        createdAt: Date.now()
      }];

      localStorageMock.getItem.mockReturnValue(JSON.stringify(presets));

      const updates = {
        name: 'Updated Name',
        description: 'Updated Description'
      };

      const result = service.updatePreset('preset1', updates);

      expect(result).toBeTruthy();
      expect(result.name).toBe('Updated Name');
      expect(result.description).toBe('Updated Description');
      expect(result.updatedAt).toBeDefined();
    });

    it('should not update default presets', () => {
      const presets = [{
        id: 'default-preset',
        name: 'Default Preset',
        filters: createDefaultFilterState(),
        isDefault: true
      }];

      localStorageMock.getItem.mockReturnValue(JSON.stringify(presets));

      const result = service.updatePreset('default-preset', { name: 'New Name' });

      expect(result).toBeNull();
    });

    it('should limit number of presets', () => {
      // Create more than MAX_PRESETS (20) presets
      const manyPresets = Array.from({ length: 25 }, (_, i) => ({
        id: `preset${i}`,
        name: `Preset ${i}`,
        filters: createDefaultFilterState(),
        isDefault: false,
        createdAt: Date.now() - (25 - i) * 1000 // Older presets have earlier timestamps
      }));

      localStorageMock.getItem.mockReturnValue(JSON.stringify(manyPresets));

      const newFilters = {
        genres: ['Soul'], // Use valid genre
        yearRange: { start: 1980, end: 1990 }
      };

      service.savePreset('New Preset', 'Description', newFilters);

      // Should have called setItem with limited presets
      const setItemCall = localStorageMock.setItem.mock.calls.find(
        call => call[0] === 'sampleDiscovery.filterPresets'
      );
      
      expect(setItemCall).toBeDefined();
      const savedPresets = JSON.parse(setItemCall[1]);
      expect(savedPresets.length).toBeLessThanOrEqual(20);
    });
  });

  describe('Data Management', () => {
    it('should clear all data', () => {
      const result = service.clearAllData();

      expect(result).toBe(true);
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('sampleDiscovery.filters');
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('sampleDiscovery.lastAppliedFilters');
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'sampleDiscovery.filterPresets',
        expect.stringContaining('"isDefault":true')
      );
    });

    it('should get usage statistics', () => {
      const presets = [
        {
          id: 'preset1',
          name: 'Preset 1',
          filters: createDefaultFilterState(),
          isDefault: false,
          lastUsed: Date.now() - 1000
        },
        {
          id: 'preset2',
          name: 'Preset 2',
          filters: createDefaultFilterState(),
          isDefault: true,
          lastUsed: Date.now() - 2000
        }
      ];

      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'sampleDiscovery.filterPresets') {
          return JSON.stringify(presets);
        }
        if (key === 'sampleDiscovery.lastAppliedFilters') {
          return JSON.stringify({ filters: createDefaultFilterState() });
        }
        return null;
      });

      const stats = service.getUsageStats();

      expect(stats.totalPresets).toBe(2);
      expect(stats.customPresets).toBe(1);
      expect(stats.defaultPresets).toBe(1);
      expect(stats.hasLastAppliedFilters).toBe(true);
      expect(stats.mostRecentlyUsed).toHaveLength(2);
    });
  });

  describe('Event Listeners', () => {
    it('should add and remove event listeners', () => {
      const listener = vi.fn();

      service.addListener(listener);
      service.notifyListeners('test', { data: 'test' });

      expect(listener).toHaveBeenCalledWith('test', { data: 'test' });

      service.removeListener(listener);
      service.notifyListeners('test2', { data: 'test2' });

      expect(listener).toHaveBeenCalledTimes(1); // Should not be called again
    });

    it('should handle listener errors gracefully', () => {
      const errorListener = vi.fn(() => {
        throw new Error('Listener error');
      });
      const goodListener = vi.fn();

      service.addListener(errorListener);
      service.addListener(goodListener);

      // Should not throw despite error in first listener
      expect(() => {
        service.notifyListeners('test', {});
      }).not.toThrow();

      expect(errorListener).toHaveBeenCalled();
      expect(goodListener).toHaveBeenCalled();
    });
  });

  describe('Validation', () => {
    it('should reject invalid filter states', () => {
      const invalidFilters = {
        genres: 'not an array', // Invalid
        yearRange: { start: 2000, end: 1990 } // Invalid range
      };

      const result = service.saveFilterState(invalidFilters);

      expect(result).toBe(false);
      expect(localStorageMock.setItem).not.toHaveBeenCalled();
    });

    it('should reject presets with empty names', () => {
      const result = service.savePreset('', 'Description', createDefaultFilterState());

      expect(result).toBeNull();
    });

    it('should reject presets with invalid filters', () => {
      const invalidFilters = {
        genres: ['InvalidGenre'],
        yearRange: { start: 'not a number', end: 1990 }
      };

      const result = service.savePreset('Test', 'Description', invalidFilters);

      expect(result).toBeNull();
    });
  });

  describe('Singleton Instance', () => {
    it('should export a singleton instance', () => {
      expect(filterPersistenceService).toBeInstanceOf(FilterPersistenceService);
    });

    it('should maintain state across imports', () => {
      const listener = vi.fn();
      filterPersistenceService.addListener(listener);

      filterPersistenceService.notifyListeners('test', {});

      expect(listener).toHaveBeenCalled();
    });
  });
});