/**
 * @fileoverview Tests for PatternStorageService
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PatternStorageService } from '../PatternStorageService.js';

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

// Mock console methods
const consoleMock = {
  log: vi.fn(),
  error: vi.fn(),
  warn: vi.fn()
};

describe('PatternStorageService', () => {
  let storageService;
  let mockPattern;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();
    localStorageMock.store = {};
    
    // Setup global mocks
    global.localStorage = localStorageMock;
    global.console = { ...console, ...consoleMock };

    // Create service instance
    storageService = new PatternStorageService();

    // Create mock pattern
    mockPattern = {
      id: 'test_pattern_1',
      name: 'Test Pattern',
      bpm: 120,
      swing: 0,
      stepResolution: 16,
      tracks: [
        {
          id: 'track_0',
          name: 'Kick',
          sampleId: 'kick_001',
          volume: 0.8,
          mute: false,
          solo: false,
          color: '#ef4444',
          randomization: {
            velocity: { enabled: false, amount: 0 },
            timing: { enabled: false, amount: 0 }
          },
          steps: [
            { active: true, velocity: 0.8 },
            { active: false, velocity: 0.8 },
            { active: true, velocity: 0.8 },
            { active: false, velocity: 0.8 }
          ]
        }
      ],
      metadata: {
        created: '2025-01-27T10:00:00Z',
        modified: '2025-01-27T10:00:00Z',
        userId: 'test_user'
      }
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Initialization', () => {
    it('should initialize localStorage structure on first run', () => {
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'chop_stop_sequencer_patterns',
        expect.stringContaining('"version":1')
      );
    });

    it('should not reinitialize if storage already exists', () => {
      // Clear previous calls
      vi.clearAllMocks();
      
      // Create another instance
      new PatternStorageService();
      
      // Should not call setItem again since storage exists
      expect(localStorageMock.setItem).not.toHaveBeenCalled();
    });
  });

  describe('Pattern Saving', () => {
    it('should save a valid pattern successfully', async () => {
      const patternId = await storageService.savePattern(mockPattern);
      
      expect(patternId).toBe(mockPattern.id);
      expect(localStorageMock.setItem).toHaveBeenCalled();
      expect(consoleMock.log).toHaveBeenCalledWith(
        expect.stringContaining('Pattern test_pattern_1 saved successfully')
      );
    });

    it('should throw error for null pattern', async () => {
      await expect(storageService.savePattern(null)).rejects.toThrow('Pattern is required');
    });

    it('should throw error for invalid pattern', async () => {
      const invalidPattern = { ...mockPattern, bpm: 'invalid' };
      
      await expect(storageService.savePattern(invalidPattern)).rejects.toThrow('Pattern validation failed');
    });

    it('should update pattern metadata on save', async () => {
      const originalModified = mockPattern.metadata.modified;
      
      await storageService.savePattern(mockPattern);
      
      // Get the saved data to check metadata was updated
      const storageData = JSON.parse(localStorageMock.store['chop_stop_sequencer_patterns']);
      const savedPattern = storageData.patterns[mockPattern.id];
      
      expect(savedPattern.metadata.modified).not.toBe(originalModified);
      expect(savedPattern.metadata.version).toBe(1);
    });

    it('should throw error when storage quota is exceeded', async () => {
      // Mock a very small storage limit
      storageService.maxStorageSize = 100; // 100 bytes
      
      await expect(storageService.savePattern(mockPattern)).rejects.toThrow('Storage quota exceeded');
    });
  });

  describe('Pattern Loading', () => {
    beforeEach(async () => {
      // Save a pattern first
      await storageService.savePattern(mockPattern);
    });

    it('should load a saved pattern successfully', async () => {
      const loadedPattern = await storageService.loadPattern(mockPattern.id);
      
      expect(loadedPattern.id).toBe(mockPattern.id);
      expect(loadedPattern.name).toBe(mockPattern.name);
      expect(loadedPattern.tracks).toHaveLength(1);
      expect(consoleMock.log).toHaveBeenCalledWith(
        expect.stringContaining('Pattern test_pattern_1 loaded successfully')
      );
    });

    it('should throw error for invalid pattern ID', async () => {
      await expect(storageService.loadPattern('')).rejects.toThrow('Pattern ID is required');
      await expect(storageService.loadPattern(null)).rejects.toThrow('Pattern ID is required');
    });

    it('should throw error for non-existent pattern', async () => {
      await expect(storageService.loadPattern('non_existent')).rejects.toThrow('Pattern with ID non_existent not found');
    });

    it('should update last access time on load', async () => {
      const beforeLoad = Date.now();
      
      await storageService.loadPattern(mockPattern.id);
      
      const storageData = JSON.parse(localStorageMock.store['chop_stop_sequencer_patterns']);
      const lastAccess = new Date(storageData.metadata.lastAccess).getTime();
      
      expect(lastAccess).toBeGreaterThanOrEqual(beforeLoad);
    });
  });

  describe('Pattern Listing', () => {
    beforeEach(async () => {
      // Save multiple patterns
      await storageService.savePattern(mockPattern);
      
      const pattern2 = { ...mockPattern, id: 'test_pattern_2', name: 'Test Pattern 2' };
      await storageService.savePattern(pattern2);
    });

    it('should return all saved patterns', async () => {
      const patterns = await storageService.getAllPatterns();
      
      expect(patterns).toHaveLength(2);
      expect(patterns.map(p => p.id)).toContain('test_pattern_1');
      expect(patterns.map(p => p.id)).toContain('test_pattern_2');
    });

    it('should return patterns sorted by modification date', async () => {
      const patterns = await storageService.getAllPatterns();
      
      // Should be sorted newest first
      expect(new Date(patterns[0].metadata.modified).getTime())
        .toBeGreaterThanOrEqual(new Date(patterns[1].metadata.modified).getTime());
    });

    it('should filter out invalid patterns', async () => {
      // Manually corrupt a pattern in storage
      const storageData = JSON.parse(localStorageMock.store['chop_stop_sequencer_patterns']);
      storageData.patterns['corrupted'] = { id: 'corrupted', name: 'Corrupted', bpm: 'invalid' };
      localStorageMock.store['chop_stop_sequencer_patterns'] = JSON.stringify(storageData);
      
      const patterns = await storageService.getAllPatterns();
      
      // Should only return valid patterns
      expect(patterns).toHaveLength(2);
      expect(patterns.map(p => p.id)).not.toContain('corrupted');
    });
  });

  describe('Pattern Deletion', () => {
    beforeEach(async () => {
      await storageService.savePattern(mockPattern);
    });

    it('should delete an existing pattern', async () => {
      const result = await storageService.deletePattern(mockPattern.id);
      
      expect(result).toBe(true);
      expect(consoleMock.log).toHaveBeenCalledWith(
        expect.stringContaining('Pattern test_pattern_1 deleted successfully')
      );
      
      // Verify pattern is gone
      await expect(storageService.loadPattern(mockPattern.id)).rejects.toThrow('not found');
    });

    it('should return false for non-existent pattern', async () => {
      const result = await storageService.deletePattern('non_existent');
      
      expect(result).toBe(false);
    });

    it('should throw error for invalid pattern ID', async () => {
      await expect(storageService.deletePattern('')).rejects.toThrow('Pattern ID is required');
      await expect(storageService.deletePattern(null)).rejects.toThrow('Pattern ID is required');
    });

    it('should update pattern count after deletion', async () => {
      await storageService.deletePattern(mockPattern.id);
      
      const storageData = JSON.parse(localStorageMock.store['chop_stop_sequencer_patterns']);
      expect(storageData.metadata.patternCount).toBe(0);
    });
  });

  describe('Pattern Export', () => {
    beforeEach(async () => {
      await storageService.savePattern(mockPattern);
    });

    it('should export a single pattern to JSON', async () => {
      const exportedJson = await storageService.exportPattern(mockPattern.id);
      const exportedData = JSON.parse(exportedJson);
      
      expect(exportedData.version).toBe(1);
      expect(exportedData.pattern.id).toBe(mockPattern.id);
      expect(exportedData.pattern.name).toBe(mockPattern.name);
      expect(exportedData.exportedAt).toBeDefined();
    });

    it('should export all patterns to JSON', async () => {
      const pattern2 = { ...mockPattern, id: 'test_pattern_2', name: 'Test Pattern 2' };
      await storageService.savePattern(pattern2);
      
      const exportedJson = await storageService.exportAllPatterns();
      const exportedData = JSON.parse(exportedJson);
      
      expect(exportedData.version).toBe(1);
      expect(exportedData.patterns).toHaveLength(2);
      expect(exportedData.exportedAt).toBeDefined();
    });

    it('should throw error for invalid pattern ID', async () => {
      await expect(storageService.exportPattern('')).rejects.toThrow('Pattern ID is required');
    });

    it('should throw error for non-existent pattern', async () => {
      await expect(storageService.exportPattern('non_existent')).rejects.toThrow('not found');
    });
  });

  describe('Pattern Import', () => {
    it('should import a single pattern from JSON', async () => {
      const exportData = {
        version: 1,
        exportedAt: new Date().toISOString(),
        pattern: mockPattern
      };
      const jsonString = JSON.stringify(exportData);
      
      const importedIds = await storageService.importPattern(jsonString);
      
      expect(importedIds).toHaveLength(1);
      expect(importedIds[0]).toBe(mockPattern.id);
      
      // Verify pattern was imported
      const loadedPattern = await storageService.loadPattern(mockPattern.id);
      expect(loadedPattern.name).toBe(mockPattern.name);
    });

    it('should import multiple patterns from JSON', async () => {
      const pattern2 = { ...mockPattern, id: 'test_pattern_2', name: 'Test Pattern 2' };
      const exportData = {
        version: 1,
        exportedAt: new Date().toISOString(),
        patterns: [mockPattern, pattern2]
      };
      const jsonString = JSON.stringify(exportData);
      
      const importedIds = await storageService.importPattern(jsonString);
      
      expect(importedIds).toHaveLength(2);
      expect(importedIds).toContain(mockPattern.id);
      expect(importedIds).toContain(pattern2.id);
    });

    it('should generate new IDs when requested', async () => {
      const exportData = {
        version: 1,
        exportedAt: new Date().toISOString(),
        pattern: mockPattern
      };
      const jsonString = JSON.stringify(exportData);
      
      const importedIds = await storageService.importPattern(jsonString, { generateNewIds: true });
      
      expect(importedIds).toHaveLength(1);
      expect(importedIds[0]).not.toBe(mockPattern.id);
      
      // Verify pattern was imported with new ID
      const loadedPattern = await storageService.loadPattern(importedIds[0]);
      expect(loadedPattern.name).toBe('Test Pattern (Imported)');
    });

    it('should skip existing patterns when overwrite is false', async () => {
      // Save original pattern first
      await storageService.savePattern(mockPattern);
      
      const exportData = {
        version: 1,
        exportedAt: new Date().toISOString(),
        pattern: mockPattern
      };
      const jsonString = JSON.stringify(exportData);
      
      const importedIds = await storageService.importPattern(jsonString, { overwrite: false });
      
      expect(importedIds).toHaveLength(0);
      expect(consoleMock.warn).toHaveBeenCalledWith(
        expect.stringContaining('already exists, skipping')
      );
    });

    it('should throw error for invalid JSON', async () => {
      await expect(storageService.importPattern('invalid json')).rejects.toThrow('Failed to import pattern');
    });

    it('should throw error for invalid import data', async () => {
      const invalidData = { version: 1, invalidField: 'test' };
      const jsonString = JSON.stringify(invalidData);
      
      await expect(storageService.importPattern(jsonString)).rejects.toThrow('Invalid import data format');
    });

    it('should skip invalid patterns during import', async () => {
      // Clear storage first to avoid "already exists" scenario
      await storageService.clearAllPatterns();
      
      const invalidPattern = { ...mockPattern, bpm: 'invalid', id: 'invalid_pattern' };
      const exportData = {
        version: 1,
        exportedAt: new Date().toISOString(),
        patterns: [mockPattern, invalidPattern]
      };
      const jsonString = JSON.stringify(exportData);
      
      const importedIds = await storageService.importPattern(jsonString);
      
      expect(importedIds).toHaveLength(1);
      expect(importedIds[0]).toBe(mockPattern.id);
      expect(consoleMock.warn).toHaveBeenCalledWith(
        expect.stringContaining('Skipping invalid pattern')
      );
    });
  });

  describe('Storage Statistics', () => {
    beforeEach(async () => {
      await storageService.savePattern(mockPattern);
    });

    it('should return accurate storage statistics', async () => {
      const stats = await storageService.getStorageStats();
      
      expect(stats.patternCount).toBe(1);
      expect(stats.storageSize).toBeGreaterThan(0);
      expect(stats.maxStorageSize).toBe(storageService.maxStorageSize);
      // Usage percentage should be greater than 0 if storage size > 0
      if (stats.storageSize > 0) {
        expect(stats.usagePercentage).toBeGreaterThan(0);
      } else {
        expect(stats.usagePercentage).toBe(0);
      }
      expect(stats.lastAccess).toBeDefined();
      expect(stats.version).toBe(1);
    });

    it('should return default stats on error', async () => {
      // Corrupt localStorage to cause parsing error
      localStorageMock.getItem.mockImplementation(() => {
        throw new Error('Storage error');
      });
      
      const stats = await storageService.getStorageStats();
      
      expect(stats.patternCount).toBe(0);
      expect(stats.storageSize).toBe(0);
      expect(stats.usagePercentage).toBe(0);
    });
  });

  describe('Pattern Existence Check', () => {
    beforeEach(async () => {
      await storageService.savePattern(mockPattern);
    });

    it('should return true for existing pattern', async () => {
      const exists = await storageService.patternExists(mockPattern.id);
      expect(exists).toBe(true);
    });

    it('should return false for non-existent pattern', async () => {
      const exists = await storageService.patternExists('non_existent');
      expect(exists).toBe(false);
    });

    it('should return false for invalid pattern ID', async () => {
      const exists1 = await storageService.patternExists('');
      const exists2 = await storageService.patternExists(null);
      
      expect(exists1).toBe(false);
      expect(exists2).toBe(false);
    });
  });

  describe('Clear All Patterns', () => {
    beforeEach(async () => {
      await storageService.savePattern(mockPattern);
      const pattern2 = { ...mockPattern, id: 'test_pattern_2', name: 'Test Pattern 2' };
      await storageService.savePattern(pattern2);
    });

    it('should clear all patterns from storage', async () => {
      await storageService.clearAllPatterns();
      
      const patterns = await storageService.getAllPatterns();
      expect(patterns).toHaveLength(0);
      
      const stats = await storageService.getStorageStats();
      expect(stats.patternCount).toBe(0);
      
      expect(consoleMock.log).toHaveBeenCalledWith('All patterns cleared from storage');
    });
  });

  describe('Validation', () => {
    it('should validate correct pattern structure', () => {
      const isValid = storageService.validatePattern(mockPattern);
      expect(isValid).toBe(true);
    });

    it('should reject pattern with missing required fields', () => {
      const invalidPatterns = [
        { ...mockPattern, id: undefined },
        { ...mockPattern, name: '' },
        { ...mockPattern, bpm: 'invalid' },
        { ...mockPattern, bpm: 300 }, // Out of range
        { ...mockPattern, swing: -10 }, // Out of range
        { ...mockPattern, stepResolution: 24 }, // Invalid resolution
        { ...mockPattern, tracks: [] }, // Empty tracks
        { ...mockPattern, metadata: null }
      ];

      invalidPatterns.forEach(pattern => {
        expect(storageService.validatePattern(pattern)).toBe(false);
      });
    });

    it('should validate track structure', () => {
      const validTrack = mockPattern.tracks[0];
      expect(storageService.validateTrack(validTrack)).toBe(true);
      
      const invalidTracks = [
        { ...validTrack, id: '' },
        { ...validTrack, name: null },
        { ...validTrack, volume: 2 }, // Out of range
        { ...validTrack, mute: 'yes' }, // Wrong type
        { ...validTrack, steps: [] } // Empty steps
      ];

      invalidTracks.forEach(track => {
        expect(storageService.validateTrack(track)).toBe(false);
      });
    });

    it('should validate step structure', () => {
      const validStep = mockPattern.tracks[0].steps[0];
      expect(storageService.validateStep(validStep)).toBe(true);
      
      const invalidSteps = [
        { ...validStep, active: 'yes' }, // Wrong type
        { ...validStep, velocity: 2 }, // Out of range
        { ...validStep, velocity: -0.1 } // Out of range
      ];

      invalidSteps.forEach(step => {
        expect(storageService.validateStep(step)).toBe(false);
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle localStorage errors gracefully', async () => {
      // Mock localStorage to throw error
      localStorageMock.setItem.mockImplementation(() => {
        throw new Error('Storage full');
      });
      
      await expect(storageService.savePattern(mockPattern)).rejects.toThrow('Failed to save pattern');
      expect(consoleMock.error).toHaveBeenCalled();
    });

    it('should handle JSON parsing errors', async () => {
      // Mock localStorage to return invalid JSON
      localStorageMock.getItem.mockImplementation(() => 'invalid json');
      
      const patterns = await storageService.getAllPatterns();
      expect(patterns).toHaveLength(0);
    });
  });

  describe('Migration', () => {
    it('should migrate old storage format', () => {
      // Setup old format data
      const oldData = {
        patterns: { [mockPattern.id]: mockPattern },
        metadata: { patternCount: 1 }
        // Missing version field
      };
      
      localStorageMock.store['chop_stop_sequencer_patterns'] = JSON.stringify(oldData);
      
      // Create new service instance to trigger migration
      new PatternStorageService();
      
      const migratedData = JSON.parse(localStorageMock.store['chop_stop_sequencer_patterns']);
      expect(migratedData.version).toBe(1);
      expect(migratedData.patterns[mockPattern.id].metadata.version).toBe(1);
    });
  });
});