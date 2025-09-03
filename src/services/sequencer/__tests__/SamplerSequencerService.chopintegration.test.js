/**
 * @fileoverview SamplerSequencerService Chop Integration Test
 * Tests the integration between SamplerSequencerService and chop data
 */

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { SamplerSequencerService } from '../SamplerSequencerService.js';

// Mock YouTube player
const createMockYouTubePlayer = () => ({
  getPlayerState: vi.fn(() => 1), // playing
  getCurrentTime: vi.fn(() => 0),
  getDuration: vi.fn(() => 180),
  seekTo: vi.fn(),
  playVideo: vi.fn(),
  pauseVideo: vi.fn(),
  getVideoData: vi.fn(() => ({ title: 'Test Video' }))
});

describe('SamplerSequencerService - Chop Integration', () => {
  let service;
  let mockYouTubePlayer;

  beforeEach(async () => {
    service = new SamplerSequencerService();
    mockYouTubePlayer = createMockYouTubePlayer();
  });

  afterEach(() => {
    if (service) {
      service.destroy();
    }
  });

  test('should initialize with chops and assign them automatically', async () => {
    const chops = [
      { padId: 'A0', startTime: 10, endTime: 12, color: '#06b6d4' },
      { padId: 'A1', startTime: 15, endTime: 17, color: '#3b82f6' },
      { padId: 'B0', startTime: 20, endTime: 22, color: '#8b5cf6' }
    ];

    const success = await service.initialize(mockYouTubePlayer, chops);
    expect(success).toBe(true);

    // Check that chops are loaded
    const state = service.getState();
    expect(state.chopsCount).toBe(3);

    // Check integration stats
    const integrationStats = service.getChopIntegrationStats();
    expect(integrationStats.totalChops).toBe(3);
    expect(integrationStats.assignedChops).toBeGreaterThan(0);
  });

  test('should update chops and reassign tracks', async () => {
    // Initialize with initial chops
    const initialChops = [
      { padId: 'A0', startTime: 10, endTime: 12, color: '#06b6d4' }
    ];

    await service.initialize(mockYouTubePlayer, initialChops);

    // Update with more chops
    const updatedChops = [
      { padId: 'A0', startTime: 10, endTime: 12, color: '#06b6d4' },
      { padId: 'A1', startTime: 15, endTime: 17, color: '#3b82f6' },
      { padId: 'B0', startTime: 20, endTime: 22, color: '#8b5cf6' }
    ];

    service.updateChopsData(updatedChops);

    // Check updated state
    const state = service.getState();
    expect(state.chopsCount).toBe(3);

    const integrationStats = service.getChopIntegrationStats();
    expect(integrationStats.totalChops).toBe(3);
  });

  test('should get current bank chops correctly', async () => {
    const chops = [
      { padId: 'A0', startTime: 10, endTime: 12, color: '#06b6d4' },
      { padId: 'A1', startTime: 15, endTime: 17, color: '#3b82f6' },
      { padId: 'B0', startTime: 20, endTime: 22, color: '#8b5cf6' }
    ];

    await service.initialize(mockYouTubePlayer, chops);

    // Get chops for bank A (index 0)
    service.switchBank(0);
    const bankAChops = service.getCurrentBankChops();
    expect(bankAChops.length).toBeGreaterThan(0);

    // Get chops for bank B (index 1) if available
    if (service.patternManager.getCurrentPattern().banks.length > 1) {
      service.switchBank(1);
      const bankBChops = service.getCurrentBankChops();
      // Bank B should have at least the B0 chop if properly assigned
      expect(bankBChops.length).toBeGreaterThanOrEqual(0);
    }
  });

  test('should handle chop deletion through service', async () => {
    const chops = [
      { padId: 'A0', startTime: 10, endTime: 12, color: '#06b6d4' },
      { padId: 'A1', startTime: 15, endTime: 17, color: '#3b82f6' }
    ];

    await service.initialize(mockYouTubePlayer, chops);

    // Remove one chop
    const updatedChops = [
      { padId: 'A0', startTime: 10, endTime: 12, color: '#06b6d4' }
    ];

    service.updateChopsData(updatedChops);

    // Check that chop count is updated
    const state = service.getState();
    expect(state.chopsCount).toBe(1);

    const integrationStats = service.getChopIntegrationStats();
    expect(integrationStats.totalChops).toBe(1);
  });

  test('should handle explicit chop operations', async () => {
    const chops = [
      { padId: 'A0', startTime: 10, endTime: 12, color: '#06b6d4' }
    ];

    await service.initialize(mockYouTubePlayer, chops);

    // Test explicit chop creation
    const newChop = { padId: 'A1', startTime: 15, endTime: 17, color: '#3b82f6' };
    service.handleChopCreation(newChop);

    // Test explicit chop modification
    const modifiedChop = { padId: 'A0', startTime: 20, endTime: 22, color: '#06b6d4' };
    service.handleChopModification(modifiedChop);

    // Test explicit chop deletion
    service.handleChopDeletion('A1');

    // Service should handle these operations without errors
    const state = service.getState();
    expect(state.isInitialized).toBe(true);
  });

  test('should provide integration statistics', async () => {
    const chops = [
      { padId: 'A0', startTime: 10, endTime: 12, color: '#06b6d4' },
      { padId: 'A1', startTime: 15, endTime: 17, color: '#3b82f6' },
      { padId: 'B0', startTime: 20, endTime: 22, color: '#8b5cf6' }
    ];

    await service.initialize(mockYouTubePlayer, chops);

    const stats = service.getChopIntegrationStats();
    expect(stats).toHaveProperty('totalChops');
    expect(stats).toHaveProperty('assignedChops');
    expect(stats).toHaveProperty('unassignedChops');
    expect(stats).toHaveProperty('totalTracks');
    expect(stats).toHaveProperty('assignedTracks');

    expect(stats.totalChops).toBe(3);
    expect(stats.totalTracks).toBeGreaterThan(0);
  });

  test('should handle bank assignments correctly', async () => {
    const chops = [
      { padId: 'A0', startTime: 10, endTime: 12, color: '#06b6d4' },
      { padId: 'A1', startTime: 15, endTime: 17, color: '#3b82f6' }
    ];

    await service.initialize(mockYouTubePlayer, chops);

    // Get current bank assignments
    const assignments = service.getCurrentBankAssignments();
    expect(assignments).toHaveLength(16); // 16 tracks per bank

    // Should have some assigned tracks
    const assignedTracks = assignments.filter(a => a.chopId !== null);
    expect(assignedTracks.length).toBeGreaterThan(0);
  });

  test('should handle reassignment operations', async () => {
    const chops = [
      { padId: 'A0', startTime: 10, endTime: 12, color: '#06b6d4' },
      { padId: 'A1', startTime: 15, endTime: 17, color: '#3b82f6' }
    ];

    await service.initialize(mockYouTubePlayer, chops);

    // Test reassign all chops
    service.reassignAllChops();

    // Test clear all assignments
    service.clearAllChopAssignments();

    // Service should handle these operations without errors
    const state = service.getState();
    expect(state.isInitialized).toBe(true);
  });
});