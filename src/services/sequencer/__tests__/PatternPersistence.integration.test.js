/**
 * @fileoverview Integration tests for pattern persistence across browser sessions
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PatternManager } from '../PatternManager.js';
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

describe('Pattern Persistence Integration', () => {
  let patternManager1;
  let patternManager2;
  let storageService;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();
    localStorageMock.store = {};
    
    // Setup global mocks
    global.localStorage = localStorageMock;
    global.console = { ...console, log: vi.fn(), error: vi.fn(), warn: vi.fn() };

    // Create services
    storageService = new PatternStorageService();
    patternManager1 = new PatternManager();
    patternManager2 = new PatternManager();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Cross-Session Pattern Persistence', () => {
    it('should persist patterns across browser sessions', async () => {
      // Session 1: Create and save a pattern
      const pattern1 = patternManager1.createPattern('Test Pattern', 4, 16);
      
      // Modify the pattern
      patternManager1.setCurrentPattern(pattern1);
      patternManager1.toggleStep('track_0', 0);
      patternManager1.toggleStep('track_0', 4);
      patternManager1.toggleStep('track_1', 2);
      patternManager1.toggleStep('track_1', 6);
      
      // Save the pattern
      const savedId = await patternManager1.savePattern(pattern1);
      expect(savedId).toBe(pattern1.id);

      // Verify pattern is in localStorage
      const storageData = JSON.parse(localStorageMock.store['chop_stop_sequencer_patterns']);
      expect(storageData.patterns[pattern1.id]).toBeDefined();
      expect(storageData.patterns[pattern1.id].name).toBe('Test Pattern');

      // Session 2: Load the pattern (simulating new browser session)
      const loadedPattern = await patternManager2.loadPattern(pattern1.id);
      
      expect(loadedPattern.id).toBe(pattern1.id);
      expect(loadedPattern.name).toBe('Test Pattern');
      expect(loadedPattern.tracks).toHaveLength(4);
      
      // Verify the step modifications were persisted
      expect(loadedPattern.tracks[0].steps[0].active).toBe(true);
      expect(loadedPattern.tracks[0].steps[4].active).toBe(true);
      expect(loadedPattern.tracks[1].steps[2].active).toBe(true);
      expect(loadedPattern.tracks[1].steps[6].active).toBe(true);
      
      // Verify other steps are still inactive
      expect(loadedPattern.tracks[0].steps[1].active).toBe(false);
      expect(loadedPattern.tracks[1].steps[1].active).toBe(false);
    });

    it('should handle multiple patterns across sessions', async () => {
      // Session 1: Create multiple patterns
      const pattern1 = patternManager1.createPattern('Pattern 1', 2, 8);
      const pattern2 = patternManager1.createPattern('Pattern 2', 3, 16);
      
      await patternManager1.savePattern(pattern1);
      await patternManager1.savePattern(pattern2);

      // Session 2: Load all patterns
      const savedPatterns = await patternManager2.getSavedPatterns();
      
      expect(savedPatterns).toHaveLength(2);
      expect(savedPatterns.map(p => p.name)).toContain('Pattern 1');
      expect(savedPatterns.map(p => p.name)).toContain('Pattern 2');
      
      // Load specific patterns
      const loadedPattern1 = await patternManager2.loadPattern(pattern1.id);
      const loadedPattern2 = await patternManager2.loadPattern(pattern2.id);
      
      expect(loadedPattern1.tracks).toHaveLength(2);
      expect(loadedPattern1.tracks[0].steps).toHaveLength(8);
      
      expect(loadedPattern2.tracks).toHaveLength(3);
      expect(loadedPattern2.tracks[0].steps).toHaveLength(16);
    });

    it('should handle pattern export and import across sessions', async () => {
      // Session 1: Create and export pattern
      const originalPattern = patternManager1.createPattern('Export Test', 2, 8);
      originalPattern.bpm = 140;
      originalPattern.swing = 25;
      
      patternManager1.setCurrentPattern(originalPattern);
      patternManager1.toggleStep('track_0', 0);
      patternManager1.toggleStep('track_1', 3);
      
      await patternManager1.savePattern(originalPattern);
      const exportedJson = await patternManager1.exportPattern(originalPattern.id);
      
      expect(exportedJson).toBeDefined();
      expect(typeof exportedJson).toBe('string');

      // Session 2: Import the pattern (with overwrite enabled since it already exists)
      const importedIds = await patternManager2.importPattern(exportedJson, { overwrite: true });
      
      expect(importedIds).toHaveLength(1);
      expect(importedIds[0]).toBe(originalPattern.id);
      
      // Load and verify the imported pattern
      const importedPattern = await patternManager2.loadPattern(originalPattern.id);
      
      expect(importedPattern.name).toBe('Export Test');
      expect(importedPattern.bpm).toBe(140);
      expect(importedPattern.swing).toBe(25);
      expect(importedPattern.tracks[0].steps[0].active).toBe(true);
      expect(importedPattern.tracks[1].steps[3].active).toBe(true);
    });

    it('should handle pattern deletion across sessions', async () => {
      // Session 1: Create and save patterns
      const pattern1 = patternManager1.createPattern('To Keep', 2, 8);
      const pattern2 = patternManager1.createPattern('To Delete', 2, 8);
      
      await patternManager1.savePattern(pattern1);
      await patternManager1.savePattern(pattern2);

      // Delete one pattern
      const deleted = await patternManager1.deletePattern(pattern2.id);
      expect(deleted).toBe(true);

      // Session 2: Verify deletion persisted
      const savedPatterns = await patternManager2.getSavedPatterns();
      
      expect(savedPatterns).toHaveLength(1);
      expect(savedPatterns[0].name).toBe('To Keep');
      
      // Verify deleted pattern cannot be loaded
      await expect(patternManager2.loadPattern(pattern2.id)).rejects.toThrow('not found');
    });

    it('should handle storage statistics across sessions', async () => {
      // Session 1: Create patterns and check stats
      const pattern1 = patternManager1.createPattern('Stats Test 1', 2, 8);
      const pattern2 = patternManager1.createPattern('Stats Test 2', 3, 16);
      
      await patternManager1.savePattern(pattern1);
      await patternManager1.savePattern(pattern2);
      
      const stats1 = await patternManager1.getStorageStats();
      expect(stats1.patternCount).toBe(2);
      expect(stats1.storageSize).toBeGreaterThan(0);

      // Session 2: Check stats are consistent
      const stats2 = await patternManager2.getStorageStats();
      
      expect(stats2.patternCount).toBe(2);
      expect(stats2.storageSize).toBe(stats1.storageSize);
      expect(stats2.usagePercentage).toBe(stats1.usagePercentage);
    });

    it('should handle pattern modifications across sessions', async () => {
      // Session 1: Create and save pattern
      const pattern = patternManager1.createPattern('Modify Test', 2, 8);
      pattern.bpm = 120;
      
      await patternManager1.savePattern(pattern);
      const originalModified = pattern.metadata.modified;

      // Small delay to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 10));

      // Session 2: Load, modify, and save pattern
      const loadedPattern = await patternManager2.loadPattern(pattern.id);
      patternManager2.setCurrentPattern(loadedPattern);
      
      // Modify pattern properties
      loadedPattern.bpm = 130;
      patternManager2.toggleStep('track_0', 0);
      patternManager2.setTrackVolume('track_0', 0.9);
      
      await patternManager2.savePattern(loadedPattern);

      // Session 3: Load and verify modifications
      const patternManager3 = new PatternManager();
      const finalPattern = await patternManager3.loadPattern(pattern.id);
      
      expect(finalPattern.bpm).toBe(130);
      expect(finalPattern.tracks[0].volume).toBe(0.9);
      expect(finalPattern.tracks[0].steps[0].active).toBe(true);
      expect(finalPattern.metadata.modified).not.toBe(originalModified);
    });

    it('should handle storage errors gracefully', async () => {
      // Create a pattern
      const pattern = patternManager1.createPattern('Error Test', 2, 8);
      
      // Mock localStorage to throw error on setItem
      localStorageMock.setItem.mockImplementation(() => {
        throw new Error('Storage full');
      });
      
      // Saving should fail gracefully
      await expect(patternManager1.savePattern(pattern)).rejects.toThrow('Failed to save pattern');
      
      // Restore localStorage functionality
      localStorageMock.setItem.mockRestore();
      localStorageMock.setItem = vi.fn((key, value) => {
        localStorageMock.store[key] = value;
      });
      
      // Should work again after restore
      await expect(patternManager1.savePattern(pattern)).resolves.toBe(pattern.id);
    });

    it('should handle corrupted storage data', async () => {
      // Manually corrupt storage
      localStorageMock.store['chop_stop_sequencer_patterns'] = 'invalid json';
      
      // Should handle corruption gracefully
      const patterns = await patternManager1.getSavedPatterns();
      expect(patterns).toHaveLength(0);
      
      const stats = await patternManager1.getStorageStats();
      expect(stats.patternCount).toBe(0);
    });
  });

  describe('Pattern Validation Across Sessions', () => {
    it('should reject invalid patterns during cross-session loading', async () => {
      // Manually create invalid pattern in storage
      const invalidPattern = {
        id: 'invalid_pattern',
        name: 'Invalid',
        bpm: 'not_a_number', // Invalid BPM
        swing: 0,
        stepResolution: 16,
        tracks: [],
        metadata: {
          created: new Date().toISOString(),
          modified: new Date().toISOString(),
          userId: null
        }
      };
      
      const storageData = {
        version: 1,
        patterns: { [invalidPattern.id]: invalidPattern },
        metadata: {
          created: new Date().toISOString(),
          lastAccess: new Date().toISOString(),
          patternCount: 1
        }
      };
      
      localStorageMock.store['chop_stop_sequencer_patterns'] = JSON.stringify(storageData);
      
      // Should reject invalid pattern
      await expect(patternManager1.loadPattern('invalid_pattern')).rejects.toThrow('invalid');
      
      // Should filter out invalid patterns from list
      const patterns = await patternManager1.getSavedPatterns();
      expect(patterns).toHaveLength(0);
    });
  });
});