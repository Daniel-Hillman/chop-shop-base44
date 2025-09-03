/**
 * @fileoverview Tests for SamplerChopIntegration
 * Tests chop integration and automatic assignment functionality
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SamplerChopIntegration } from '../SamplerChopIntegration';
import { SamplerPatternManager } from '../SamplerPatternManager';

describe('SamplerChopIntegration', () => {
  let integration;
  let patternManager;
  let mockChops;

  beforeEach(() => {
    patternManager = new SamplerPatternManager();
    integration = new SamplerChopIntegration(patternManager);
    
    // Create a test pattern
    patternManager.createPattern('Test Pattern', 120);

    mockChops = [
      {
        padId: 'A0',
        startTime: 10.0,
        endTime: 12.0,
        color: '#06b6d4'
      },
      {
        padId: 'A1',
        startTime: 15.0,
        endTime: 17.0,
        color: '#06b6d4'
      },
      {
        padId: 'B0',
        startTime: 20.0,
        endTime: 22.0,
        color: '#f59e0b'
      }
    ];
  });

  afterEach(() => {
    integration.destroy();
    patternManager.destroy();
  });

  describe('Chop Updates', () => {
    it('should handle initial chop assignment', () => {
      integration.updateChops(mockChops);
      
      // Check that chops were assigned
      const assignments = integration.getCurrentBankAssignments();
      
      // A0 and A1 should be assigned to bank A (index 0)
      expect(assignments[0].chopId).toBe('A0');
      expect(assignments[1].chopId).toBe('A1');
      
      // B0 should be assigned to bank B (index 1) when we switch banks
      patternManager.switchBank(1);
      const bankBAssignments = integration.getCurrentBankAssignments();
      expect(bankBAssignments[0].chopId).toBe('B0');
    });

    it('should detect new chops and assign them', () => {
      // Initial assignment
      integration.updateChops(mockChops);
      
      // Add new chops
      const newChops = [
        ...mockChops,
        {
          padId: 'A2',
          startTime: 25.0,
          endTime: 27.0,
          color: '#06b6d4'
        }
      ];
      
      integration.updateChops(newChops);
      
      // Check that new chop was assigned
      const assignments = integration.getCurrentBankAssignments();
      expect(assignments[2].chopId).toBe('A2');
    });

    it('should detect removed chops and clear assignments', () => {
      // Initial assignment
      integration.updateChops(mockChops);
      
      // Remove a chop
      const reducedChops = mockChops.filter(chop => chop.padId !== 'A1');
      
      integration.updateChops(reducedChops);
      
      // Check that assignment was cleared
      const assignments = integration.getCurrentBankAssignments();
      expect(assignments[1].chopId).toBeNull();
    });

    it('should detect modified chops', () => {
      // Initial assignment
      integration.updateChops(mockChops);
      
      // Modify a chop
      const modifiedChops = mockChops.map(chop => 
        chop.padId === 'A0' 
          ? { ...chop, startTime: 11.0, endTime: 13.0 }
          : chop
      );
      
      integration.updateChops(modifiedChops);
      
      // Assignment should remain but chop data should be updated
      const assignments = integration.getCurrentBankAssignments();
      expect(assignments[0].chopId).toBe('A0');
      expect(assignments[0].chop.startTime).toBe(11.0);
    });

    it('should handle invalid chop data gracefully', () => {
      expect(() => {
        integration.updateChops(null);
      }).not.toThrow();
      
      expect(() => {
        integration.updateChops('invalid');
      }).not.toThrow();
      
      expect(() => {
        integration.updateChops([]);
      }).not.toThrow();
    });
  });

  describe('Chop Assignment', () => {
    it('should group chops by bank correctly', () => {
      integration.updateChops(mockChops);
      
      // Bank A should have A0, A1
      const bankAChops = integration.getChopsForCurrentBank();
      expect(bankAChops).toHaveLength(2);
      expect(bankAChops.map(c => c.padId)).toEqual(['A0', 'A1']);
      
      // Switch to bank B
      patternManager.switchBank(1);
      const bankBChops = integration.getChopsForCurrentBank();
      expect(bankBChops).toHaveLength(1);
      expect(bankBChops[0].padId).toBe('B0');
    });

    it('should assign chops to correct track positions', () => {
      const orderedChops = [
        { padId: 'A0', startTime: 10, endTime: 12, color: '#06b6d4' },
        { padId: 'A5', startTime: 15, endTime: 17, color: '#06b6d4' },
        { padId: 'A10', startTime: 20, endTime: 22, color: '#06b6d4' }
      ];
      
      integration.updateChops(orderedChops);
      
      const assignments = integration.getCurrentBankAssignments();
      
      // A0 should be on track 0
      expect(assignments[0].chopId).toBe('A0');
      // A5 should be on track 5
      expect(assignments[5].chopId).toBe('A5');
      // A10 should be on track 10
      expect(assignments[10].chopId).toBe('A10');
    });

    it('should find next available track when preferred track is occupied', () => {
      // First assign A0 to track 0
      integration.updateChops([mockChops[0]]);
      
      // Then try to assign another chop that would prefer track 0
      const conflictingChop = {
        padId: 'A15', // Would prefer track 15, but let's manually assign to track 0
        startTime: 30,
        endTime: 32,
        color: '#06b6d4'
      };
      
      // Manually assign to track 0 to create conflict
      patternManager.assignChopToTrack(conflictingChop.padId, 0);
      
      // Now add a new chop that should find next available track
      const newChop = {
        padId: 'A16',
        startTime: 35,
        endTime: 37,
        color: '#06b6d4'
      };
      
      integration.updateChops([mockChops[0], conflictingChop, newChop]);
      
      // Should find an available track
      const assignments = integration.getCurrentBankAssignments();
      const assignedTracks = assignments.filter(a => a.chopId).length;
      expect(assignedTracks).toBe(3);
    });
  });

  describe('Chop Retrieval', () => {
    beforeEach(() => {
      integration.updateChops(mockChops);
    });

    it('should get chop for specific track', () => {
      const chop = integration.getChopForTrack(0);
      expect(chop).not.toBeNull();
      expect(chop.padId).toBe('A0');
    });

    it('should return null for track without chop', () => {
      const chop = integration.getChopForTrack(5);
      expect(chop).toBeNull();
    });

    it('should get all chops for current bank', () => {
      const chops = integration.getChopsForCurrentBank();
      expect(chops).toHaveLength(2);
      expect(chops.map(c => c.padId)).toEqual(['A0', 'A1']);
    });

    it('should get current bank assignments', () => {
      const assignments = integration.getCurrentBankAssignments();
      
      expect(assignments).toHaveLength(16); // 16 tracks per bank
      expect(assignments[0].chopId).toBe('A0');
      expect(assignments[0].chop).not.toBeNull();
      expect(assignments[1].chopId).toBe('A1');
      expect(assignments[2].chopId).toBeNull();
    });
  });

  describe('Assignment Management', () => {
    beforeEach(() => {
      integration.updateChops(mockChops);
    });

    it('should reassign all chops', () => {
      // Clear assignments first
      integration.clearAllAssignments();
      
      let assignments = integration.getCurrentBankAssignments();
      expect(assignments.filter(a => a.chopId).length).toBe(0);
      
      // Reassign all chops
      integration.reassignAllChops();
      
      assignments = integration.getCurrentBankAssignments();
      expect(assignments.filter(a => a.chopId).length).toBe(2);
    });

    it('should clear all assignments', () => {
      integration.clearAllAssignments();
      
      const assignments = integration.getCurrentBankAssignments();
      expect(assignments.filter(a => a.chopId).length).toBe(0);
    });

    it('should handle assignment change callbacks', () => {
      const callback = vi.fn();
      integration.setChopAssignmentChangeCallback(callback);
      
      integration.updateChops([...mockChops, {
        padId: 'A3',
        startTime: 30,
        endTime: 32,
        color: '#06b6d4'
      }]);
      
      expect(callback).toHaveBeenCalled();
    });
  });

  describe('Integration Statistics', () => {
    it('should provide integration statistics', () => {
      integration.updateChops(mockChops);
      
      const stats = integration.getIntegrationStats();
      
      expect(stats).toHaveProperty('totalChops', 3);
      expect(stats).toHaveProperty('assignedChops', 3);
      expect(stats).toHaveProperty('unassignedChops', 0);
      expect(stats).toHaveProperty('totalTracks', 32); // 2 banks × 16 tracks
      expect(stats).toHaveProperty('assignedTracks', 3);
    });

    it('should handle statistics with no pattern', () => {
      // Create integration without pattern
      const noPatternIntegration = new SamplerChopIntegration(new SamplerPatternManager());
      noPatternIntegration.updateChops(mockChops);
      
      const stats = noPatternIntegration.getIntegrationStats();
      
      expect(stats.totalChops).toBe(3);
      expect(stats.assignedChops).toBe(0);
      expect(stats.totalTracks).toBe(0);
      
      noPatternIntegration.destroy();
    });
  });

  describe('Change Detection', () => {
    it('should detect chop changes correctly', () => {
      const previousChops = [
        { padId: 'A0', startTime: 10, endTime: 12, color: '#06b6d4' },
        { padId: 'A1', startTime: 15, endTime: 17, color: '#06b6d4' }
      ];
      
      const currentChops = [
        { padId: 'A0', startTime: 11, endTime: 13, color: '#06b6d4' }, // Modified
        { padId: 'A2', startTime: 20, endTime: 22, color: '#06b6d4' }  // Added (A1 removed)
      ];
      
      // Use reflection to access private method for testing
      const changes = integration.detectChopChanges(previousChops, currentChops);
      
      expect(changes.added).toHaveLength(1);
      expect(changes.added[0].padId).toBe('A2');
      
      expect(changes.removed).toHaveLength(1);
      expect(changes.removed[0].padId).toBe('A1');
      
      expect(changes.modified).toHaveLength(1);
      expect(changes.modified[0].current.padId).toBe('A0');
    });

    it('should detect timestamp changes', () => {
      const chop1 = { padId: 'A0', startTime: 10, endTime: 12, color: '#06b6d4' };
      const chop2 = { padId: 'A0', startTime: 11, endTime: 13, color: '#06b6d4' };
      
      // Use reflection to access private method for testing
      const hasChanged = integration.hasChopChanged(chop1, chop2);
      expect(hasChanged).toBe(true);
      
      const hasNotChanged = integration.hasChopChanged(chop1, chop1);
      expect(hasNotChanged).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should handle missing pattern manager gracefully', () => {
      const noPatternIntegration = new SamplerChopIntegration(null);
      
      expect(() => {
        noPatternIntegration.updateChops(mockChops);
      }).not.toThrow();
      
      noPatternIntegration.destroy();
    });

    it('should handle invalid chop data', () => {
      const invalidChops = [
        { padId: null, startTime: 10, endTime: 12 },
        { startTime: 15, endTime: 17 }, // Missing padId
        null,
        undefined
      ];
      
      expect(() => {
        integration.updateChops(invalidChops);
      }).not.toThrow();
    });

    it('should handle bank switching errors', () => {
      integration.updateChops(mockChops);
      
      // Try to switch to invalid bank
      expect(() => {
        patternManager.switchBank(10);
      }).toThrow();
      
      // Integration should still work
      const assignments = integration.getCurrentBankAssignments();
      expect(assignments).toHaveLength(16);
    });
  });
});