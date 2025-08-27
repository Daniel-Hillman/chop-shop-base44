import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PatternManager } from '../PatternManager.js';

describe('PatternManager', () => {
  let patternManager;

  beforeEach(() => {
    patternManager = new PatternManager();
  });

  describe('Constructor', () => {
    it('should initialize with default values', () => {
      expect(patternManager.patterns).toBeInstanceOf(Map);
      expect(patternManager.patterns.size).toBe(0);
      expect(patternManager.currentPattern).toBeNull();
      expect(patternManager.stepResolution).toBe(16);
      expect(patternManager.maxTracks).toBe(16);
      expect(patternManager.maxSteps).toBe(64);
    });
  });

  describe('Pattern Creation', () => {
    it('should create a new pattern with default parameters', () => {
      const pattern = patternManager.createPattern('Test Pattern');
      
      expect(pattern.name).toBe('Test Pattern');
      expect(pattern.id).toBeDefined();
      expect(pattern.bpm).toBe(120);
      expect(pattern.swing).toBe(0);
      expect(pattern.stepResolution).toBe(16);
      expect(pattern.tracks).toHaveLength(8); // Default tracks
      expect(pattern.metadata.created).toBeDefined();
      expect(pattern.metadata.modified).toBeDefined();
    });

    it('should create a pattern with custom parameters', () => {
      const pattern = patternManager.createPattern('Custom Pattern', 4, 32);
      
      expect(pattern.name).toBe('Custom Pattern');
      expect(pattern.tracks).toHaveLength(4);
      expect(pattern.tracks[0].steps).toHaveLength(32);
    });

    it('should store created pattern in patterns map', () => {
      const pattern = patternManager.createPattern('Stored Pattern');
      
      expect(patternManager.patterns.has(pattern.id)).toBe(true);
      expect(patternManager.patterns.get(pattern.id)).toBe(pattern);
    });

    it('should reject invalid pattern names', () => {
      expect(() => patternManager.createPattern('')).toThrow('Pattern name is required and must be a string');
      expect(() => patternManager.createPattern(null)).toThrow('Pattern name is required and must be a string');
      expect(() => patternManager.createPattern(123)).toThrow('Pattern name is required and must be a string');
    });

    it('should reject invalid track counts', () => {
      expect(() => patternManager.createPattern('Test', 0)).toThrow('Number of tracks must be between 1 and 16');
      expect(() => patternManager.createPattern('Test', 17)).toThrow('Number of tracks must be between 1 and 16');
    });

    it('should reject invalid step counts', () => {
      expect(() => patternManager.createPattern('Test', 8, 0)).toThrow('Number of steps must be between 1 and 64');
      expect(() => patternManager.createPattern('Test', 8, 65)).toThrow('Number of steps must be between 1 and 64');
    });

    it('should create tracks with default names and properties', () => {
      const pattern = patternManager.createPattern('Test Pattern', 3, 16);
      
      expect(pattern.tracks[0].name).toBe('Kick');
      expect(pattern.tracks[1].name).toBe('Snare');
      expect(pattern.tracks[2].name).toBe('Hi-Hat');
      
      pattern.tracks.forEach(track => {
        expect(track.id).toBeDefined();
        expect(track.volume).toBe(0.8);
        expect(track.mute).toBe(false);
        expect(track.solo).toBe(false);
        expect(track.color).toBeDefined();
        expect(track.steps).toHaveLength(16);
        
        track.steps.forEach(step => {
          expect(step.active).toBe(false);
          expect(step.velocity).toBe(0.8);
        });
      });
    });
  });

  describe('Pattern Loading', () => {
    let testPattern;

    beforeEach(() => {
      testPattern = patternManager.createPattern('Test Pattern');
    });

    it('should load an existing pattern', async () => {
      const loadedPattern = await patternManager.loadPattern(testPattern.id);
      
      expect(loadedPattern).toBe(testPattern);
      expect(patternManager.currentPattern).toBe(testPattern);
      expect(patternManager.stepResolution).toBe(testPattern.stepResolution);
    });

    it('should throw error for non-existent pattern', async () => {
      await expect(patternManager.loadPattern('non-existent')).rejects.toThrow('Pattern with ID non-existent not found');
    });

    it('should throw error for invalid pattern ID', async () => {
      await expect(patternManager.loadPattern('')).rejects.toThrow('Pattern ID is required and must be a string');
      await expect(patternManager.loadPattern(null)).rejects.toThrow('Pattern ID is required and must be a string');
    });

    it('should validate pattern before loading', async () => {
      // Create an invalid pattern manually
      const invalidPattern = { id: 'invalid', name: 'Invalid' };
      patternManager.patterns.set('invalid', invalidPattern);
      
      await expect(patternManager.loadPattern('invalid')).rejects.toThrow('Pattern invalid is invalid');
    });
  });

  describe('Pattern Saving', () => {
    it('should save a valid pattern', async () => {
      const pattern = patternManager.createPattern('Test Pattern');
      const originalModified = pattern.metadata.modified;
      
      // Wait a bit to ensure timestamp changes
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const patternId = await patternManager.savePattern(pattern);
      
      expect(patternId).toBe(pattern.id);
      expect(pattern.metadata.modified).not.toBe(originalModified);
      expect(patternManager.patterns.has(patternId)).toBe(true);
    });

    it('should generate ID for pattern without one', async () => {
      // Create a valid pattern structure without ID
      const validPattern = patternManager.createPattern('Test Pattern');
      delete validPattern.id; // Remove the ID to test generation
      
      const patternId = await patternManager.savePattern(validPattern);
      
      expect(validPattern.id).toBeDefined();
      expect(patternId).toBe(validPattern.id);
    });

    it('should reject invalid patterns', async () => {
      const invalidPattern = { name: 'Invalid' };
      
      await expect(patternManager.savePattern(invalidPattern)).rejects.toThrow('Pattern is invalid and cannot be saved');
    });

    it('should reject null pattern', async () => {
      await expect(patternManager.savePattern(null)).rejects.toThrow('Pattern is required');
    });
  });

  describe('Step Manipulation', () => {
    let testPattern;

    beforeEach(async () => {
      testPattern = patternManager.createPattern('Test Pattern', 2, 16);
      await patternManager.loadPattern(testPattern.id);
    });

    it('should toggle step on/off', () => {
      const trackId = testPattern.tracks[0].id;
      const stepIndex = 0;
      
      expect(testPattern.tracks[0].steps[0].active).toBe(false);
      
      patternManager.toggleStep(trackId, stepIndex);
      expect(testPattern.tracks[0].steps[0].active).toBe(true);
      
      patternManager.toggleStep(trackId, stepIndex);
      expect(testPattern.tracks[0].steps[0].active).toBe(false);
    });

    it('should update pattern metadata when toggling step', async () => {
      const trackId = testPattern.tracks[0].id;
      const originalModified = testPattern.metadata.modified;
      
      // Wait a bit to ensure timestamp changes
      await new Promise(resolve => setTimeout(resolve, 10));
      
      patternManager.toggleStep(trackId, 0);
      
      expect(testPattern.metadata.modified).not.toBe(originalModified);
    });

    it('should throw error when no pattern is loaded', () => {
      patternManager.currentPattern = null;
      
      expect(() => patternManager.toggleStep('track_0', 0)).toThrow('No pattern is currently loaded');
    });

    it('should throw error for invalid track ID', () => {
      expect(() => patternManager.toggleStep('non-existent', 0)).toThrow('Track with ID non-existent not found');
      expect(() => patternManager.toggleStep('', 0)).toThrow('Track ID is required and must be a string');
    });

    it('should throw error for invalid step index', () => {
      const trackId = testPattern.tracks[0].id;
      
      expect(() => patternManager.toggleStep(trackId, -1)).toThrow('Step index must be a non-negative number');
      expect(() => patternManager.toggleStep(trackId, 16)).toThrow(`Step index 16 is out of range for track ${trackId}`);
    });

    it('should set step velocity', () => {
      const trackId = testPattern.tracks[0].id;
      const stepIndex = 0;
      const velocity = 0.5;
      
      patternManager.setStepVelocity(trackId, stepIndex, velocity);
      
      expect(testPattern.tracks[0].steps[0].velocity).toBe(velocity);
    });

    it('should throw error for invalid velocity', () => {
      const trackId = testPattern.tracks[0].id;
      
      expect(() => patternManager.setStepVelocity(trackId, 0, -0.1)).toThrow('Velocity must be a number between 0.0 and 1.0');
      expect(() => patternManager.setStepVelocity(trackId, 0, 1.1)).toThrow('Velocity must be a number between 0.0 and 1.0');
    });
  });

  describe('Pattern Clearing', () => {
    let testPattern;

    beforeEach(async () => {
      testPattern = patternManager.createPattern('Test Pattern', 2, 16);
      await patternManager.loadPattern(testPattern.id);
      
      // Activate some steps
      patternManager.toggleStep(testPattern.tracks[0].id, 0);
      patternManager.toggleStep(testPattern.tracks[1].id, 4);
    });

    it('should clear all steps in pattern', () => {
      patternManager.clearPattern();
      
      testPattern.tracks.forEach(track => {
        track.steps.forEach(step => {
          expect(step.active).toBe(false);
          expect(step.velocity).toBe(0.8);
        });
      });
    });

    it('should update pattern metadata when clearing', async () => {
      const originalModified = testPattern.metadata.modified;
      
      // Wait a bit to ensure timestamp changes
      await new Promise(resolve => setTimeout(resolve, 10));
      
      patternManager.clearPattern();
      
      expect(testPattern.metadata.modified).not.toBe(originalModified);
    });

    it('should throw error when no pattern is loaded', () => {
      patternManager.currentPattern = null;
      
      expect(() => patternManager.clearPattern()).toThrow('No pattern is currently loaded');
    });
  });

  describe('Pattern Duplication', () => {
    let originalPattern;

    beforeEach(() => {
      originalPattern = patternManager.createPattern('Original Pattern', 2, 8);
      // Activate some steps to test duplication
      patternManager.setCurrentPattern(originalPattern);
      patternManager.toggleStep(originalPattern.tracks[0].id, 0);
      patternManager.toggleStep(originalPattern.tracks[1].id, 4);
    });

    it('should duplicate an existing pattern', () => {
      const duplicated = patternManager.duplicatePattern(originalPattern.id, 'Duplicated Pattern');
      
      expect(duplicated.id).not.toBe(originalPattern.id);
      expect(duplicated.name).toBe('Duplicated Pattern');
      expect(duplicated.bpm).toBe(originalPattern.bpm);
      expect(duplicated.swing).toBe(originalPattern.swing);
      expect(duplicated.stepResolution).toBe(originalPattern.stepResolution);
      expect(duplicated.tracks).toHaveLength(originalPattern.tracks.length);
      
      // Check that steps were duplicated correctly
      expect(duplicated.tracks[0].steps[0].active).toBe(true);
      expect(duplicated.tracks[1].steps[4].active).toBe(true);
    });

    it('should store duplicated pattern in patterns map', () => {
      const duplicated = patternManager.duplicatePattern(originalPattern.id, 'Duplicated Pattern');
      
      expect(patternManager.patterns.has(duplicated.id)).toBe(true);
      expect(patternManager.patterns.get(duplicated.id)).toBe(duplicated);
    });

    it('should throw error for non-existent pattern', () => {
      expect(() => patternManager.duplicatePattern('non-existent', 'New Name')).toThrow('Pattern with ID non-existent not found');
    });

    it('should throw error for invalid parameters', () => {
      expect(() => patternManager.duplicatePattern('', 'New Name')).toThrow('Pattern ID is required and must be a string');
      expect(() => patternManager.duplicatePattern(originalPattern.id, '')).toThrow('New pattern name is required and must be a string');
    });
  });

  describe('Step Resolution Changes', () => {
    let testPattern;

    beforeEach(async () => {
      testPattern = patternManager.createPattern('Test Pattern', 1, 16);
      await patternManager.loadPattern(testPattern.id);
      
      // Activate some steps
      patternManager.toggleStep(testPattern.tracks[0].id, 0);
      patternManager.toggleStep(testPattern.tracks[0].id, 4);
      patternManager.toggleStep(testPattern.tracks[0].id, 8);
    });

    it('should change step resolution', () => {
      patternManager.changeStepResolution(32);
      
      expect(patternManager.stepResolution).toBe(32);
      expect(testPattern.stepResolution).toBe(32);
      expect(testPattern.tracks[0].steps).toHaveLength(32);
    });

    it('should preserve steps when increasing resolution', () => {
      patternManager.changeStepResolution(32);
      
      // Original active steps should still be active at their original positions
      // When going from 16 to 32 steps, the mapping should preserve the original positions
      expect(testPattern.tracks[0].steps[0].active).toBe(true);
      expect(testPattern.tracks[0].steps[8].active).toBe(true); // Step 4 maps to step 8 (4 * 2)
      expect(testPattern.tracks[0].steps[16].active).toBe(true); // Step 8 maps to step 16 (8 * 2)
    });

    it('should downsample steps when decreasing resolution', () => {
      patternManager.changeStepResolution(8);
      
      expect(patternManager.stepResolution).toBe(8);
      expect(testPattern.stepResolution).toBe(8);
      expect(testPattern.tracks[0].steps).toHaveLength(8);
      
      // Check that some steps are preserved
      expect(testPattern.tracks[0].steps[0].active).toBe(true);
      expect(testPattern.tracks[0].steps[2].active).toBe(true);
      expect(testPattern.tracks[0].steps[4].active).toBe(true);
    });

    it('should throw error for invalid resolution', () => {
      expect(() => patternManager.changeStepResolution(4)).toThrow('Step resolution must be 8, 16, or 32');
      expect(() => patternManager.changeStepResolution(64)).toThrow('Step resolution must be 8, 16, or 32');
    });

    it('should update pattern metadata when changing resolution', async () => {
      const originalModified = testPattern.metadata.modified;
      
      // Wait a bit to ensure timestamp changes
      await new Promise(resolve => setTimeout(resolve, 10));
      
      patternManager.changeStepResolution(32);
      
      expect(testPattern.metadata.modified).not.toBe(originalModified);
    });
  });

  describe('Pattern Validation', () => {
    it('should validate a correct pattern', () => {
      const pattern = patternManager.createPattern('Valid Pattern');
      
      expect(patternManager.validatePattern(pattern)).toBe(true);
    });

    it('should reject patterns with missing required fields', () => {
      const invalidPatterns = [
        null,
        {},
        { name: 'Test' }, // Missing id
        { id: 'test' }, // Missing name
        { id: 'test', name: 'Test', bpm: 50 }, // Invalid BPM
        { id: 'test', name: 'Test', bpm: 120, swing: -10 }, // Invalid swing
        { id: 'test', name: 'Test', bpm: 120, swing: 0, stepResolution: 4 }, // Invalid resolution
      ];

      invalidPatterns.forEach(pattern => {
        expect(patternManager.validatePattern(pattern)).toBe(false);
      });
    });

    it('should reject patterns with invalid tracks', () => {
      const pattern = patternManager.createPattern('Test Pattern');
      
      // Make track invalid
      pattern.tracks[0].volume = 2.0; // Invalid volume
      
      expect(patternManager.validatePattern(pattern)).toBe(false);
    });

    it('should reject patterns with too many tracks', () => {
      const pattern = patternManager.createPattern('Test Pattern');
      
      // Add too many tracks
      while (pattern.tracks.length <= patternManager.maxTracks) {
        pattern.tracks.push({
          id: `track_${pattern.tracks.length}`,
          name: `Track ${pattern.tracks.length}`,
          volume: 0.8,
          mute: false,
          solo: false,
          steps: [{ active: false, velocity: 0.8 }]
        });
      }
      
      expect(patternManager.validatePattern(pattern)).toBe(false);
    });

    it('should validate complex pattern structures', () => {
      const pattern = patternManager.createPattern('Complex Pattern', 8, 32);
      
      // Set a valid step resolution
      pattern.stepResolution = 32;
      
      // Add complex track configurations
      pattern.tracks.forEach((track, index) => {
        track.volume = Math.min(1.0, 0.5 + (index * 0.1)); // Ensure volume doesn't exceed 1.0
        track.mute = index % 3 === 0;
        track.solo = index === 2;
        track.randomization = {
          velocity: { enabled: true, amount: 25 },
          timing: { enabled: false, amount: 0 }
        };
        
        // Activate random steps
        track.steps.forEach((step, stepIndex) => {
          step.active = stepIndex % (index + 2) === 0;
          step.velocity = Math.min(1.0, 0.6 + (stepIndex * 0.01)); // Ensure velocity doesn't exceed 1.0
        });
      });
      
      expect(patternManager.validatePattern(pattern)).toBe(true);
    });

    it('should validate edge case values', () => {
      const pattern = patternManager.createPattern('Edge Case Pattern');
      
      // Test minimum valid values
      pattern.bpm = 60;
      pattern.swing = 0;
      pattern.tracks[0].volume = 0.0;
      pattern.tracks[0].steps[0].velocity = 0.1;
      
      expect(patternManager.validatePattern(pattern)).toBe(true);
      
      // Test maximum valid values
      pattern.bpm = 200;
      pattern.swing = 100;
      pattern.tracks[0].volume = 1.0;
      pattern.tracks[0].steps[0].velocity = 1.0;
      
      expect(patternManager.validatePattern(pattern)).toBe(true);
    });

    it('should reject patterns with malformed step data', () => {
      const pattern = patternManager.createPattern('Test Pattern');
      
      // Invalid step structure
      pattern.tracks[0].steps[0] = { active: 'true' }; // active should be boolean
      expect(patternManager.validatePattern(pattern)).toBe(false);
      
      // Reset and test missing velocity
      pattern.tracks[0].steps[0] = { active: true }; // missing velocity
      expect(patternManager.validatePattern(pattern)).toBe(false);
      
      // Reset and test invalid velocity
      pattern.tracks[0].steps[0] = { active: true, velocity: 1.5 }; // velocity > 1.0
      expect(patternManager.validatePattern(pattern)).toBe(false);
    });

    it('should validate metadata structure', () => {
      const pattern = patternManager.createPattern('Test Pattern');
      
      // Valid metadata (stored as ISO strings)
      expect(typeof pattern.metadata.created).toBe('string');
      expect(typeof pattern.metadata.modified).toBe('string');
      expect(patternManager.validatePattern(pattern)).toBe(true);
      
      // Invalid metadata
      pattern.metadata.created = null;
      expect(patternManager.validatePattern(pattern)).toBe(false);
    });
  });

  describe('Pattern Management', () => {
    let testPattern;

    beforeEach(() => {
      testPattern = patternManager.createPattern('Test Pattern');
    });

    it('should get current pattern', () => {
      expect(patternManager.getCurrentPattern()).toBeNull();
      
      patternManager.setCurrentPattern(testPattern);
      expect(patternManager.getCurrentPattern()).toBe(testPattern);
    });

    it('should set current pattern', () => {
      patternManager.setCurrentPattern(testPattern);
      
      expect(patternManager.currentPattern).toBe(testPattern);
      expect(patternManager.stepResolution).toBe(testPattern.stepResolution);
    });

    it('should reject invalid pattern when setting current', () => {
      const invalidPattern = { id: 'invalid', name: 'Invalid' };
      
      expect(() => patternManager.setCurrentPattern(invalidPattern)).toThrow('Invalid pattern cannot be set as current');
    });

    it('should get all patterns', () => {
      // Create a fresh pattern manager to avoid interference from other tests
      const freshManager = new PatternManager();
      const pattern1 = freshManager.createPattern('Pattern 1');
      const pattern2 = freshManager.createPattern('Pattern 2');
      
      const allPatterns = freshManager.getAllPatterns();
      
      expect(allPatterns).toHaveLength(2);
      expect(allPatterns).toContain(pattern1);
      expect(allPatterns).toContain(pattern2);
    });

    it('should delete a pattern', async () => {
      const result = await patternManager.deletePattern(testPattern.id);
      
      expect(result).toBe(true);
      expect(patternManager.patterns.has(testPattern.id)).toBe(false);
    });

    it('should return false when deleting non-existent pattern', async () => {
      const result = await patternManager.deletePattern('non-existent');
      
      expect(result).toBe(false);
    });

    it('should clear current pattern when deleting it', async () => {
      patternManager.setCurrentPattern(testPattern);
      
      await patternManager.deletePattern(testPattern.id);
      
      expect(patternManager.currentPattern).toBeNull();
    });

    it('should throw error for invalid pattern ID when deleting', async () => {
      await expect(patternManager.deletePattern('')).rejects.toThrow('Pattern ID is required and must be a string');
    });
  });

  describe('Utility Methods', () => {
    it('should generate unique pattern IDs', () => {
      const id1 = patternManager.generatePatternId();
      const id2 = patternManager.generatePatternId();
      
      expect(id1).not.toBe(id2);
      expect(id1).toMatch(/^pattern_\d+_[a-z0-9]+$/);
      expect(id2).toMatch(/^pattern_\d+_[a-z0-9]+$/);
    });

    it('should create default tracks with correct structure', () => {
      const tracks = patternManager.createDefaultTracks(3, 8);
      
      expect(tracks).toHaveLength(3);
      expect(tracks[0].name).toBe('Kick');
      expect(tracks[1].name).toBe('Snare');
      expect(tracks[2].name).toBe('Hi-Hat');
      
      tracks.forEach(track => {
        expect(track.id).toBeDefined();
        expect(track.volume).toBe(0.8);
        expect(track.steps).toHaveLength(8);
      });
    });

    it('should create default steps with correct structure', () => {
      const steps = patternManager.createDefaultSteps(16);
      
      expect(steps).toHaveLength(16);
      steps.forEach(step => {
        expect(step.active).toBe(false);
        expect(step.velocity).toBe(0.8);
      });
    });

    it('should update step resolution via updateStepResolution method', () => {
      const pattern = patternManager.createPattern('Test Pattern');
      patternManager.setCurrentPattern(pattern);
      
      patternManager.updateStepResolution(32);
      
      expect(patternManager.stepResolution).toBe(32);
      expect(pattern.stepResolution).toBe(32);
    });
  });

  describe('Track Control Methods', () => {
    beforeEach(() => {
      const pattern = patternManager.createPattern('Test Pattern', 2, 8);
      patternManager.setCurrentPattern(pattern);
    });

    it('should set track volume', () => {
      patternManager.setTrackVolume('track_0', 0.5);
      
      const track = patternManager.currentPattern.tracks.find(t => t.id === 'track_0');
      expect(track.volume).toBe(0.5);
    });

    it('should throw error for invalid volume', () => {
      expect(() => patternManager.setTrackVolume('track_0', 1.5)).toThrow('Volume must be a number between 0.0 and 1.0');
      expect(() => patternManager.setTrackVolume('track_0', -0.1)).toThrow('Volume must be a number between 0.0 and 1.0');
    });

    it('should toggle track mute', () => {
      const track = patternManager.currentPattern.tracks.find(t => t.id === 'track_0');
      const initialMute = track.mute;
      
      patternManager.toggleTrackMute('track_0');
      expect(track.mute).toBe(!initialMute);
      
      patternManager.toggleTrackMute('track_0');
      expect(track.mute).toBe(initialMute);
    });

    it('should toggle track solo', () => {
      const track = patternManager.currentPattern.tracks.find(t => t.id === 'track_0');
      const initialSolo = track.solo;
      
      patternManager.toggleTrackSolo('track_0');
      expect(track.solo).toBe(!initialSolo);
      
      patternManager.toggleTrackSolo('track_0');
      expect(track.solo).toBe(initialSolo);
    });

    it('should set track name', () => {
      patternManager.setTrackName('track_0', 'New Kick');
      
      const track = patternManager.currentPattern.tracks.find(t => t.id === 'track_0');
      expect(track.name).toBe('New Kick');
    });

    it('should trim track name', () => {
      patternManager.setTrackName('track_0', '  Spaced Name  ');
      
      const track = patternManager.currentPattern.tracks.find(t => t.id === 'track_0');
      expect(track.name).toBe('Spaced Name');
    });

    it('should throw error for empty track name', () => {
      expect(() => patternManager.setTrackName('track_0', '')).toThrow('Track name is required and must be a string');
      expect(() => patternManager.setTrackName('track_0', null)).toThrow('Track name is required and must be a string');
    });

    it('should set track color', () => {
      patternManager.setTrackColor('track_0', '#FF0000');
      
      const track = patternManager.currentPattern.tracks.find(t => t.id === 'track_0');
      expect(track.color).toBe('#FF0000');
    });

    it('should validate hex color format', () => {
      expect(() => patternManager.setTrackColor('track_0', 'red')).toThrow('Track color must be a valid hex color');
      expect(() => patternManager.setTrackColor('track_0', '#GG0000')).toThrow('Track color must be a valid hex color');
      expect(() => patternManager.setTrackColor('track_0', '#FF00')).toThrow('Track color must be a valid hex color');
    });

    it('should set track randomization', () => {
      const randomization = {
        velocity: { enabled: true, amount: 25 },
        timing: { enabled: false, amount: 10 }
      };
      
      patternManager.setTrackRandomization('track_0', randomization);
      
      const track = patternManager.currentPattern.tracks.find(t => t.id === 'track_0');
      expect(track.randomization).toEqual(randomization);
    });

    it('should validate randomization settings', () => {
      const invalidRandomization = {
        velocity: { enabled: 'true', amount: 25 }, // enabled should be boolean
        timing: { enabled: false, amount: 150 } // amount should be <= 100
      };
      
      expect(() => patternManager.setTrackRandomization('track_0', invalidRandomization))
        .toThrow('Invalid velocity randomization settings');
    });

    it('should throw error for non-existent track', () => {
      expect(() => patternManager.setTrackVolume('invalid_track', 0.5))
        .toThrow('Track with ID invalid_track not found');
      expect(() => patternManager.toggleTrackMute('invalid_track'))
        .toThrow('Track with ID invalid_track not found');
      expect(() => patternManager.setTrackName('invalid_track', 'Name'))
        .toThrow('Track with ID invalid_track not found');
    });

    it('should throw error when no pattern is loaded', () => {
      patternManager.setCurrentPattern(null);
      
      expect(() => patternManager.setTrackVolume('track_0', 0.5))
        .toThrow('No pattern is currently loaded');
      expect(() => patternManager.toggleTrackMute('track_0'))
        .toThrow('No pattern is currently loaded');
      expect(() => patternManager.setTrackName('track_0', 'Name'))
        .toThrow('No pattern is currently loaded');
    });
  });
});