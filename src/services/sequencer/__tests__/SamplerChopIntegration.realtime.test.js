/**
 * @fileoverview Real-time Chop Integration Tests
 * Tests the real-time integration between chopper functionality and sampler sequencer
 */

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { SamplerChopIntegration } from '../SamplerChopIntegration.js';
import { SamplerPatternManager } from '../SamplerPatternManager.js';

describe('SamplerChopIntegration - Real-time Updates', () => {
  let chopIntegration;
  let patternManager;
  let assignmentChangeCallback;
  let assignmentChanges;

  beforeEach(() => {
    patternManager = new SamplerPatternManager();
    patternManager.createPattern('Test Pattern');
    
    chopIntegration = new SamplerChopIntegration(patternManager);
    
    // Track assignment changes
    assignmentChanges = [];
    assignmentChangeCallback = vi.fn((assignments) => {
      assignmentChanges.push([...assignments]);
    });
    chopIntegration.setChopAssignmentChangeCallback(assignmentChangeCallback);
  });

  afterEach(() => {
    chopIntegration.destroy();
    patternManager.destroy();
  });

  describe('New Chop Creation', () => {
    test('should automatically assign new chops to available tracks', () => {
      const initialChops = [
        { padId: 'A0', startTime: 10, endTime: 12, color: '#06b6d4' },
        { padId: 'A1', startTime: 15, endTime: 17, color: '#3b82f6' }
      ];

      chopIntegration.updateChops(initialChops);

      // Check assignments
      const assignments = chopIntegration.getCurrentBankAssignments();
      expect(assignments[0].chopId).toBe('A0');
      expect(assignments[1].chopId).toBe('A1');
      expect(assignmentChangeCallback).toHaveBeenCalled();
    });

    test('should handle new chop addition to existing set', () => {
      // Initial chops
      const initialChops = [
        { padId: 'A0', startTime: 10, endTime: 12, color: '#06b6d4' }
      ];
      chopIntegration.updateChops(initialChops);

      // Add new chop
      const updatedChops = [
        ...initialChops,
        { padId: 'A1', startTime: 15, endTime: 17, color: '#3b82f6' }
      ];
      chopIntegration.updateChops(updatedChops);

      // Check that both chops are assigned
      const assignments = chopIntegration.getCurrentBankAssignments();
      expect(assignments[0].chopId).toBe('A0');
      expect(assignments[1].chopId).toBe('A1');
      expect(assignmentChangeCallback).toHaveBeenCalledTimes(2);
    });

    test('should assign chops to correct banks', () => {
      const chops = [
        { padId: 'A0', startTime: 10, endTime: 12, color: '#06b6d4' },
        { padId: 'B0', startTime: 15, endTime: 17, color: '#3b82f6' }
      ];

      chopIntegration.updateChops(chops);

      // Check Bank A assignment
      patternManager.switchBank(0);
      let assignments = chopIntegration.getCurrentBankAssignments();
      expect(assignments[0].chopId).toBe('A0');

      // Check Bank B assignment (if available)
      if (patternManager.currentPattern.banks.length > 1) {
        patternManager.switchBank(1);
        assignments = chopIntegration.getCurrentBankAssignments();
        expect(assignments[0].chopId).toBe('B0');
      }
    });
  });

  describe('Chop Deletion', () => {
    test('should remove chop assignments when chops are deleted', () => {
      // Initial chops
      const initialChops = [
        { padId: 'A0', startTime: 10, endTime: 12, color: '#06b6d4' },
        { padId: 'A1', startTime: 15, endTime: 17, color: '#3b82f6' }
      ];
      chopIntegration.updateChops(initialChops);

      // Remove one chop
      const updatedChops = [
        { padId: 'A0', startTime: 10, endTime: 12, color: '#06b6d4' }
      ];
      chopIntegration.updateChops(updatedChops);

      // Check assignments
      const assignments = chopIntegration.getCurrentBankAssignments();
      expect(assignments[0].chopId).toBe('A0');
      expect(assignments[1].chopId).toBeNull();
      expect(assignmentChangeCallback).toHaveBeenCalledTimes(2);
    });

    test('should handle explicit chop deletion', () => {
      const initialChops = [
        { padId: 'A0', startTime: 10, endTime: 12, color: '#06b6d4' },
        { padId: 'A1', startTime: 15, endTime: 17, color: '#3b82f6' }
      ];
      chopIntegration.updateChops(initialChops);

      // Explicitly delete a chop
      chopIntegration.handleChopDeletion('A1');

      // Check assignments
      const assignments = chopIntegration.getCurrentBankAssignments();
      expect(assignments[0].chopId).toBe('A0');
      expect(assignments[1].chopId).toBeNull();
      expect(assignmentChangeCallback).toHaveBeenCalledTimes(2);
    });
  });

  describe('Chop Modification', () => {
    test('should handle timestamp modifications', () => {
      const initialChops = [
        { padId: 'A0', startTime: 10, endTime: 12, color: '#06b6d4' }
      ];
      chopIntegration.updateChops(initialChops);

      // Modify chop timestamps
      const modifiedChops = [
        { padId: 'A0', startTime: 20, endTime: 22, color: '#06b6d4' }
      ];
      chopIntegration.updateChops(modifiedChops);

      // Check that assignment is maintained but chop data is updated
      const assignments = chopIntegration.getCurrentBankAssignments();
      expect(assignments[0].chopId).toBe('A0');
      expect(assignments[0].chop.startTime).toBe(20);
      expect(assignments[0].chop.endTime).toBe(22);
      expect(assignmentChangeCallback).toHaveBeenCalledTimes(2);
    });

    test('should handle explicit chop modification', () => {
      const initialChop = { padId: 'A0', startTime: 10, endTime: 12, color: '#06b6d4' };
      chopIntegration.updateChops([initialChop]);

      // Explicitly modify chop
      const modifiedChop = { padId: 'A0', startTime: 25, endTime: 27, color: '#06b6d4' };
      chopIntegration.handleChopModification(modifiedChop);

      // Check that chop data is updated
      const chop = chopIntegration.getChopForTrack(0);
      expect(chop.startTime).toBe(25);
      expect(chop.endTime).toBe(27);
    });
  });

  describe('Integration Statistics', () => {
    test('should provide accurate integration statistics', () => {
      const chops = [
        { padId: 'A0', startTime: 10, endTime: 12, color: '#06b6d4' },
        { padId: 'A1', startTime: 15, endTime: 17, color: '#3b82f6' },
        { padId: 'B0', startTime: 20, endTime: 22, color: '#8b5cf6' }
      ];
      chopIntegration.updateChops(chops);

      const stats = chopIntegration.getIntegrationStats();
      expect(stats.totalChops).toBe(3);
      expect(stats.assignedChops).toBeGreaterThan(0);
      expect(stats.assignedTracks).toBeGreaterThan(0);
      expect(stats.totalTracks).toBe(32); // 2 banks × 16 tracks
    });
  });

  describe('Real-time Change Detection', () => {
    test('should detect complex chop changes in single update', () => {
      // Initial state
      const initialChops = [
        { padId: 'A0', startTime: 10, endTime: 12, color: '#06b6d4' },
        { padId: 'A1', startTime: 15, endTime: 17, color: '#3b82f6' },
        { padId: 'A2', startTime: 20, endTime: 22, color: '#8b5cf6' }
      ];
      chopIntegration.updateChops(initialChops);

      // Complex update: add, remove, modify
      const updatedChops = [
        { padId: 'A0', startTime: 11, endTime: 13, color: '#06b6d4' }, // modified
        // A1 removed
        { padId: 'A2', startTime: 20, endTime: 22, color: '#8b5cf6' }, // unchanged
        { padId: 'A3', startTime: 25, endTime: 27, color: '#d946ef' }  // added
      ];
      chopIntegration.updateChops(updatedChops);

      // Check final state
      const assignments = chopIntegration.getCurrentBankAssignments();
      expect(assignments[0].chopId).toBe('A0');
      expect(assignments[0].chop.startTime).toBe(11); // modified
      expect(assignments[1].chopId).toBeNull(); // A1 removed
      expect(assignments[2].chopId).toBe('A2'); // unchanged
      expect(assignments[3].chopId).toBe('A3'); // added

      expect(assignmentChangeCallback).toHaveBeenCalledTimes(2);
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid chop data gracefully', () => {
      const invalidChops = [
        null,
        undefined,
        { padId: null, startTime: 10, endTime: 12 },
        { startTime: 10, endTime: 12 }, // missing padId
        { padId: 'A0' } // missing timestamps
      ];

      expect(() => {
        chopIntegration.updateChops(invalidChops);
      }).not.toThrow();

      // Should not have any valid assignments
      const assignments = chopIntegration.getCurrentBankAssignments();
      const validAssignments = assignments.filter(a => a.chopId !== null);
      expect(validAssignments.length).toBe(0);
    });

    test('should handle empty chop arrays', () => {
      // Start with chops
      const initialChops = [
        { padId: 'A0', startTime: 10, endTime: 12, color: '#06b6d4' }
      ];
      chopIntegration.updateChops(initialChops);

      // Clear all chops
      chopIntegration.updateChops([]);

      // Should clear all assignments
      const assignments = chopIntegration.getCurrentBankAssignments();
      const validAssignments = assignments.filter(a => a.chopId !== null);
      expect(validAssignments.length).toBe(0);
    });
  });

  describe('Performance', () => {
    test('should handle large chop updates efficiently', () => {
      // Create many chops
      const manyChops = [];
      for (let i = 0; i < 100; i++) {
        const bankLetter = String.fromCharCode(65 + (i % 4)); // A, B, C, D
        manyChops.push({
          padId: `${bankLetter}${i % 16}`,
          startTime: i * 2,
          endTime: i * 2 + 1,
          color: '#06b6d4'
        });
      }

      const startTime = performance.now();
      chopIntegration.updateChops(manyChops);
      const endTime = performance.now();

      // Should complete in reasonable time (less than 100ms)
      expect(endTime - startTime).toBeLessThan(100);

      // Should have assignments
      const stats = chopIntegration.getIntegrationStats();
      expect(stats.assignedChops).toBeGreaterThan(0);
    });
  });
});