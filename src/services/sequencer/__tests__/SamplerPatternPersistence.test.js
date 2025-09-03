/**
 * @fileoverview Tests for SamplerPatternPersistence
 * Tests pattern saving, loading, and persistence functionality
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SamplerPatternPersistence } from '../SamplerPatternPersistence';

// Mock localStorage
const localStorageMock = {
  store: {},
  getItem: vi.fn((key) => localStorageMock.store[key] || null),
  setItem: vi.fn((key, value) => {
    localStorageMock.store[key] = value;
  }),
  removeItem: vi.fn((key) => {
    delete localStorageMock.store[key];
  }),
  clear: vi.fn(() => {
    localStorageMock.store = {};
  })
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

describe('SamplerPatternPersistence', () => {
  let persistence;
  let mockPattern;

  beforeEach(() => {
    persistence = new SamplerPatternPersistence();
    localStorageMock.clear();
    vi.clearAllMocks();

    mockPattern = {
      id: 'test_pattern_123',
      name: 'Test Pattern',
      bpm: 120,
      currentBank: 0,
      banks: [
        {
          bankId: 0,
          name: 'Bank A',
          tracks: Array.from({ length: 16 }, (_, i) => ({
            trackIndex: i,
            chopId: null,
            steps: new Array(16).fill(false)
          }))
        },
        {
          bankId: 1,
          name: 'Bank B',
          tracks: Array.from({ length: 16 }, (_, i) => ({
            trackIndex: i,
            chopId: null,
            steps: new Array(16).fill(false)
          }))
        }
      ],
      metadata: {
        created: '2024-01-01T00:00:00.000Z',
        modified: '2024-01-01T00:00:00.000Z'
      }
    };
  });

  afterEach(() => {
    persistence.destroy();
  });

  describe('Pattern Saving', () => {
    it('should save a new pattern successfully', async () => {
      const result = await persistence.savePattern(mockPattern);
      
      expect(result).toBe(true);
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'sampler_patterns',
        expect.stringContaining(mockPattern.id)
      );
    });

    it('should update an existing pattern', async () => {
      // Save initial pattern
      await persistence.savePattern(mockPattern);
      
      // Update pattern
      const updatedPattern = {
        ...mockPattern,
        name: 'Updated Pattern',
        bpm: 140
      };
      
      const result = await persistence.savePattern(updatedPattern);
      
      expect(result).toBe(true);
      
      // Verify pattern was updated
      const patterns = await persistence.getAllPatterns();
      expect(patterns).toHaveLength(1);
      expect(patterns[0].name).toBe('Updated Pattern');
      expect(patterns[0].bpm).toBe(140);
    });

    it('should limit number of stored patterns', async () => {
      // Set low limit for testing
      persistence.maxStoredPatterns = 3;
      
      // Save 5 patterns
      for (let i = 0; i < 5; i++) {
        const pattern = {
          ...mockPattern,
          id: `pattern_${i}`,
          name: `Pattern ${i}`,
          metadata: {
            created: new Date(2024, 0, i + 1).toISOString(),
            modified: new Date(2024, 0, i + 1).toISOString()
          }
        };
        
        await persistence.savePattern(pattern);
      }
      
      // Should only keep 3 most recent patterns
      const patterns = await persistence.getAllPatterns();
      expect(patterns).toHaveLength(3);
      expect(patterns.map(p => p.name)).toEqual(['Pattern 2', 'Pattern 3', 'Pattern 4']);
    });

    it('should handle invalid pattern data', async () => {
      const result = await persistence.savePattern(null);
      expect(result).toBe(false);
      
      const result2 = await persistence.savePattern({ name: 'No ID' });
      expect(result2).toBe(false);
    });
  });

  describe('Pattern Loading', () => {
    beforeEach(async () => {
      await persistence.savePattern(mockPattern);
    });

    it('should load an existing pattern', async () => {
      const loaded = await persistence.loadPattern(mockPattern.id);
      
      expect(loaded).not.toBeNull();
      expect(loaded.id).toBe(mockPattern.id);
      expect(loaded.name).toBe(mockPattern.name);
      expect(loaded.bpm).toBe(mockPattern.bpm);
    });

    it('should return null for non-existent pattern', async () => {
      const loaded = await persistence.loadPattern('non_existent_id');
      expect(loaded).toBeNull();
    });

    it('should handle invalid pattern ID', async () => {
      const loaded = await persistence.loadPattern(null);
      expect(loaded).toBeNull();
      
      const loaded2 = await persistence.loadPattern('');
      expect(loaded2).toBeNull();
    });
  });

  describe('Pattern Management', () => {
    beforeEach(async () => {
      await persistence.savePattern(mockPattern);
    });

    it('should get all patterns', async () => {
      const patterns = await persistence.getAllPatterns();
      
      expect(patterns).toHaveLength(1);
      expect(patterns[0].id).toBe(mockPattern.id);
    });

    it('should delete a pattern', async () => {
      const result = await persistence.deletePattern(mockPattern.id);
      
      expect(result).toBe(true);
      
      const patterns = await persistence.getAllPatterns();
      expect(patterns).toHaveLength(0);
    });

    it('should handle deleting non-existent pattern', async () => {
      const result = await persistence.deletePattern('non_existent_id');
      expect(result).toBe(false);
    });

    it('should clear all patterns', async () => {
      // Add another pattern
      const pattern2 = { ...mockPattern, id: 'pattern_2', name: 'Pattern 2' };
      await persistence.savePattern(pattern2);
      
      const result = await persistence.clearAllPatterns();
      
      expect(result).toBe(true);
      
      const patterns = await persistence.getAllPatterns();
      expect(patterns).toHaveLength(0);
    });
  });

  describe('Current Pattern Management', () => {
    beforeEach(async () => {
      await persistence.savePattern(mockPattern);
    });

    it('should set and get current pattern ID', async () => {
      await persistence.setCurrentPattern(mockPattern.id);
      
      const currentId = await persistence.getCurrentPatternId();
      expect(currentId).toBe(mockPattern.id);
    });

    it('should load current pattern', async () => {
      await persistence.setCurrentPattern(mockPattern.id);
      
      const current = await persistence.loadCurrentPattern();
      expect(current).not.toBeNull();
      expect(current.id).toBe(mockPattern.id);
    });

    it('should clear current pattern', async () => {
      await persistence.setCurrentPattern(mockPattern.id);
      await persistence.clearCurrentPattern();
      
      const currentId = await persistence.getCurrentPatternId();
      expect(currentId).toBeNull();
    });

    it('should clear current pattern when deleted', async () => {
      await persistence.setCurrentPattern(mockPattern.id);
      await persistence.deletePattern(mockPattern.id);
      
      const currentId = await persistence.getCurrentPatternId();
      expect(currentId).toBeNull();
    });
  });

  describe('Import/Export', () => {
    beforeEach(async () => {
      await persistence.savePattern(mockPattern);
    });

    it('should export pattern as JSON', async () => {
      const json = await persistence.exportPattern(mockPattern.id);
      
      expect(json).not.toBeNull();
      expect(typeof json).toBe('string');
      
      const parsed = JSON.parse(json);
      expect(parsed.id).toBe(mockPattern.id);
      expect(parsed.name).toBe(mockPattern.name);
    });

    it('should import pattern from JSON', async () => {
      const json = JSON.stringify(mockPattern);
      const imported = await persistence.importPattern(json);
      
      expect(imported).not.toBeNull();
      expect(imported.id).not.toBe(mockPattern.id); // Should have new ID
      expect(imported.name).toBe(`${mockPattern.name} (Imported)`);
      
      // Should be saved to storage
      const patterns = await persistence.getAllPatterns();
      expect(patterns).toHaveLength(2); // Original + imported
    });

    it('should handle invalid JSON import', async () => {
      const imported = await persistence.importPattern('invalid json');
      expect(imported).toBeNull();
      
      const imported2 = await persistence.importPattern('{"invalid": "pattern"}');
      expect(imported2).toBeNull();
    });
  });

  describe('Storage Statistics', () => {
    it('should provide storage statistics', async () => {
      await persistence.savePattern(mockPattern);
      
      const stats = await persistence.getStorageStats();
      
      expect(stats).toHaveProperty('patternCount', 1);
      expect(stats).toHaveProperty('totalSize');
      expect(stats).toHaveProperty('averagePatternSize');
      expect(stats).toHaveProperty('maxPatterns');
      expect(stats.totalSize).toBeGreaterThan(0);
    });

    it('should handle empty storage statistics', async () => {
      const stats = await persistence.getStorageStats();
      
      expect(stats.patternCount).toBe(0);
      expect(stats.totalSize).toBe(0);
      expect(stats.averagePatternSize).toBe(0);
    });
  });

  describe('Auto-save', () => {
    it('should auto-save pattern with debouncing', async () => {
      vi.useFakeTimers();
      
      const promise = persistence.autoSavePattern(mockPattern);
      
      // Should not save immediately
      expect(localStorageMock.setItem).not.toHaveBeenCalled();
      
      // Advance timers
      vi.advanceTimersByTime(2000);
      
      const result = await promise;
      expect(result).toBe(true);
      expect(localStorageMock.setItem).toHaveBeenCalled();
      
      vi.useRealTimers();
    });
  });

  describe('Error Handling', () => {
    it('should handle localStorage errors gracefully', async () => {
      // Mock localStorage to throw error
      localStorageMock.setItem.mockImplementation(() => {
        throw new Error('Storage quota exceeded');
      });
      
      const result = await persistence.savePattern(mockPattern);
      expect(result).toBe(false);
    });

    it('should handle corrupted data in localStorage', async () => {
      // Set invalid JSON in localStorage
      localStorageMock.store['sampler_patterns'] = 'invalid json';
      
      const patterns = await persistence.getAllPatterns();
      expect(patterns).toEqual([]);
      
      // Should clear corrupted data
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('sampler_patterns');
    });
  });

  describe('Pattern Validation', () => {
    it('should validate valid pattern', () => {
      const isValid = persistence.validatePattern(mockPattern);
      expect(isValid).toBe(true);
    });

    it('should reject invalid patterns', () => {
      expect(persistence.validatePattern(null)).toBe(false);
      expect(persistence.validatePattern({})).toBe(false);
      expect(persistence.validatePattern({ id: 'test' })).toBe(false);
      expect(persistence.validatePattern({ 
        id: 'test', 
        name: 'test', 
        bpm: 'invalid' 
      })).toBe(false);
    });

    it('should validate bank structure', () => {
      const invalidBankPattern = {
        ...mockPattern,
        banks: [
          {
            bankId: 0,
            name: 'Bank A',
            tracks: 'invalid' // Should be array
          }
        ]
      };
      
      expect(persistence.validatePattern(invalidBankPattern)).toBe(false);
    });
  });
});