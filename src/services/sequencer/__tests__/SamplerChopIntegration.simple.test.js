/**
 * @fileoverview Simple Chop Integration Test
 * Basic test to verify chop integration functionality
 */

import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { SamplerChopIntegration } from '../SamplerChopIntegration.js';
import { SamplerPatternManager } from '../SamplerPatternManager.js';

describe('SamplerChopIntegration - Simple Test', () => {
  let chopIntegration;
  let patternManager;

  beforeEach(() => {
    patternManager = new SamplerPatternManager();
    patternManager.createPattern('Test Pattern');
    chopIntegration = new SamplerChopIntegration(patternManager);
  });

  afterEach(() => {
    chopIntegration.destroy();
    patternManager.destroy();
  });

  test('should handle basic chop assignment', () => {
    const chops = [
      { padId: 'A0', startTime: 10, endTime: 12, color: '#06b6d4' },
      { padId: 'A1', startTime: 15, endTime: 17, color: '#3b82f6' }
    ];

    // Update chops
    chopIntegration.updateChops(chops);

    // Check that chops are assigned
    const stats = chopIntegration.getIntegrationStats();
    expect(stats.totalChops).toBe(2);
    expect(stats.assignedChops).toBeGreaterThan(0);

    // Check assignments
    const assignments = chopIntegration.getCurrentBankAssignments();
    expect(assignments).toHaveLength(16); // 16 tracks per bank
    
    // At least some tracks should have chops assigned
    const assignedTracks = assignments.filter(a => a.chopId !== null);
    expect(assignedTracks.length).toBeGreaterThan(0);
  });

  test('should handle chop deletion', () => {
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

    // Check that stats reflect the change
    const stats = chopIntegration.getIntegrationStats();
    expect(stats.totalChops).toBe(1);
  });

  test('should handle chop modification', () => {
    const initialChops = [
      { padId: 'A0', startTime: 10, endTime: 12, color: '#06b6d4' }
    ];

    chopIntegration.updateChops(initialChops);
    
    // Modify chop
    const modifiedChops = [
      { padId: 'A0', startTime: 20, endTime: 22, color: '#06b6d4' }
    ];
    
    chopIntegration.updateChops(modifiedChops);

    // Check that chop data is updated
    const assignments = chopIntegration.getCurrentBankAssignments();
    const assignedTrack = assignments.find(a => a.chopId === 'A0');
    
    if (assignedTrack && assignedTrack.chop) {
      expect(assignedTrack.chop.startTime).toBe(20);
      expect(assignedTrack.chop.endTime).toBe(22);
    }
  });

  test('should handle empty chop arrays', () => {
    // Start with chops
    const initialChops = [
      { padId: 'A0', startTime: 10, endTime: 12, color: '#06b6d4' }
    ];
    chopIntegration.updateChops(initialChops);

    // Clear all chops
    chopIntegration.updateChops([]);

    // Should have no chops
    const stats = chopIntegration.getIntegrationStats();
    expect(stats.totalChops).toBe(0);
  });
});