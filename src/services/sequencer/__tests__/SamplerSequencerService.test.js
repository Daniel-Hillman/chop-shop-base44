/**
 * @fileoverview Tests for SamplerSequencerService
 * Tests the core sequencer service infrastructure
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SamplerSequencerService } from '../SamplerSequencerService.js';

// Mock YouTube player
const createMockYouTubePlayer = () => ({
  seekTo: vi.fn(),
  getCurrentTime: vi.fn(() => 0),
  getPlayerState: vi.fn(() => 1), // Playing state
  setVolume: vi.fn(),
  playVideo: vi.fn(),
  pauseVideo: vi.fn()
});

// Mock chop data
const createMockChops = () => [
  {
    padId: 'A0',
    startTime: 10.5,
    endTime: 12.0,
    color: '#ef4444'
  },
  {
    padId: 'A1',
    startTime: 15.2,
    endTime: 16.8,
    color: '#f97316'
  },
  {
    padId: 'B0',
    startTime: 20.1,
    endTime: 21.5,
    color: '#06b6d4'
  }
];

describe('SamplerSequencerService', () => {
  let service;
  let mockPlayer;
  let mockChops;

  beforeEach(() => {
    service = new SamplerSequencerService();
    mockPlayer = createMockYouTubePlayer();
    mockChops = createMockChops();
  });

  afterEach(() => {
    if (service) {
      service.destroy();
    }
  });

  describe('Initialization', () => {
    it('should initialize successfully with valid YouTube player', async () => {
      const result = await service.initialize(mockPlayer, mockChops);
      
      expect(result).toBe(true);
      expect(service.isInitialized).toBe(true);
      
      const state = service.getState();
      expect(state.isInitialized).toBe(true);
      expect(state.chopsCount).toBe(3);
    });

    it('should fail initialization with invalid YouTube player', async () => {
      const result = await service.initialize(null, mockChops);
      
      expect(result).toBe(false);
      expect(service.isInitialized).toBe(false);
    });

    it('should load chops data correctly', async () => {
      await service.initialize(mockPlayer, mockChops);
      
      const chopA0 = service.getChopData('A0');
      expect(chopA0).toEqual(mockChops[0]);
      
      const chopB0 = service.getChopData('B0');
      expect(chopB0).toEqual(mockChops[2]);
    });
  });

  describe('Playback Control', () => {
    beforeEach(async () => {
      await service.initialize(mockPlayer, mockChops);
    });

    it('should start playback successfully', async () => {
      const result = await service.start();
      
      expect(result).toBe(true);
      
      const state = service.getState();
      expect(state.isPlaying).toBe(true);
    });

    it('should stop playback', async () => {
      await service.start();
      service.stop();
      
      const state = service.getState();
      expect(state.isPlaying).toBe(false);
      expect(state.currentStep).toBe(0);
    });

    it('should pause and resume playback', async () => {
      await service.start();
      
      service.pause();
      let state = service.getState();
      expect(state.isPlaying).toBe(false);
      expect(state.isPaused).toBe(true);
      
      service.resume();
      state = service.getState();
      expect(state.isPlaying).toBe(true);
      expect(state.isPaused).toBe(false);
    });

    it('should set BPM correctly', async () => {
      service.setBPM(140);
      
      const state = service.getState();
      expect(state.bpm).toBe(140);
    });

    it('should validate BPM range', () => {
      expect(() => service.setBPM(50)).toThrow('BPM must be a number between 60 and 200');
      expect(() => service.setBPM(250)).toThrow('BPM must be a number between 60 and 200');
    });
  });

  describe('Pattern Management', () => {
    beforeEach(async () => {
      await service.initialize(mockPlayer, mockChops);
    });

    it('should toggle steps correctly', () => {
      // Initially step should be false
      expect(service.getStep(0, 0)).toBe(false);
      
      // Toggle step on
      service.toggleStep(0, 0);
      expect(service.getStep(0, 0)).toBe(true);
      
      // Toggle step off
      service.toggleStep(0, 0);
      expect(service.getStep(0, 0)).toBe(false);
    });

    it('should set step state directly', () => {
      service.setStep(1, 4, true);
      expect(service.getStep(1, 4)).toBe(true);
      
      service.setStep(1, 4, false);
      expect(service.getStep(1, 4)).toBe(false);
    });

    it('should switch banks correctly', () => {
      expect(service.getCurrentBank()).toBe(0);
      
      service.switchBank(1);
      expect(service.getCurrentBank()).toBe(1);
    });

    it('should validate track and step indices', () => {
      expect(() => service.toggleStep(-1, 0)).toThrow();
      expect(() => service.toggleStep(16, 0)).toThrow();
      expect(() => service.toggleStep(0, -1)).toThrow();
      expect(() => service.toggleStep(0, 16)).toThrow();
    });
  });

  describe('Chop Integration', () => {
    beforeEach(async () => {
      await service.initialize(mockPlayer, mockChops);
    });

    it('should get current bank chops', () => {
      const bankChops = service.getCurrentBankChops();
      
      // Should have chops A0 and A1 in bank A (index 0)
      expect(bankChops.length).toBe(2);
      expect(bankChops[0].padId).toBe('A0');
      expect(bankChops[1].padId).toBe('A1');
    });

    it('should update chops data', () => {
      const newChops = [
        ...mockChops,
        {
          padId: 'A2',
          startTime: 25.0,
          endTime: 26.5,
          color: '#22c55e'
        }
      ];
      
      service.updateChopsData(newChops);
      
      const state = service.getState();
      expect(state.chopsCount).toBe(4);
      
      const chopA2 = service.getChopData('A2');
      expect(chopA2.startTime).toBe(25.0);
    });
  });

  describe('Step Callbacks', () => {
    beforeEach(async () => {
      await service.initialize(mockPlayer, mockChops);
    });

    it('should register and call step callbacks', (done) => {
      let callbackCalled = false;
      
      const stepCallback = (stepIndex, time, activeSteps) => {
        callbackCalled = true;
        expect(typeof stepIndex).toBe('number');
        expect(typeof time).toBe('number');
        expect(Array.isArray(activeSteps)).toBe(true);
        done();
      };
      
      service.onStep(stepCallback);
      
      // Set up a step to trigger
      service.setStep(0, 0, true);
      
      // Start playback to trigger steps
      service.start();
      
      // Manually trigger step for testing
      setTimeout(() => {
        if (!callbackCalled) {
          done(new Error('Step callback was not called'));
        }
      }, 100);
    });

    it('should remove step callbacks', () => {
      const callback = vi.fn();
      
      service.onStep(callback);
      service.removeStepCallback(callback);
      
      // Callback should not be in the list anymore
      expect(service.stepCallbacks.includes(callback)).toBe(false);
    });
  });

  describe('YouTube Integration', () => {
    beforeEach(async () => {
      await service.initialize(mockPlayer, mockChops);
    });

    it('should trigger chop and seek YouTube player', () => {
      // Set up a step with chop A0
      service.setStep(0, 0, true);
      
      // Manually trigger the step handling
      service.handleStep(0, performance.now());
      
      // Should have called seekTo with chop A0 timestamp
      expect(mockPlayer.seekTo).toHaveBeenCalledWith(10.5, true);
    });

    it('should handle YouTube player errors gracefully', async () => {
      // Make seekTo throw an error
      mockPlayer.seekTo.mockImplementation(() => {
        throw new Error('Seek failed');
      });
      
      // Set up error callback
      let errorReceived = null;
      service.onError((error) => {
        errorReceived = error;
      });
      
      // Trigger chop
      service.setStep(0, 0, true);
      service.handleStep(0, performance.now());
      
      // Should not throw, but may log error
      expect(mockPlayer.seekTo).toHaveBeenCalled();
    });
  });

  describe('Performance Stats', () => {
    beforeEach(async () => {
      await service.initialize(mockPlayer, mockChops);
    });

    it('should provide performance statistics', () => {
      const stats = service.getPerformanceStats();
      
      expect(stats).toHaveProperty('engine');
      expect(stats).toHaveProperty('youtube');
      expect(stats).toHaveProperty('pattern');
      
      expect(stats.engine).toHaveProperty('totalSteps');
      expect(stats.youtube).toHaveProperty('totalSeeks');
      expect(stats.pattern).toHaveProperty('totalSteps');
    });

    it('should track engine performance', async () => {
      await service.start();
      
      // Let it run for a short time
      await new Promise(resolve => setTimeout(resolve, 50));
      
      service.stop();
      
      const stats = service.getPerformanceStats();
      expect(stats.engine.totalSteps).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Cleanup', () => {
    it('should clean up resources properly', async () => {
      await service.initialize(mockPlayer, mockChops);
      await service.start();
      
      service.destroy();
      
      expect(service.isInitialized).toBe(false);
      expect(service.stepCallbacks).toHaveLength(0);
      expect(service.stateChangeCallbacks).toHaveLength(0);
      expect(service.errorCallbacks).toHaveLength(0);
    });
  });
});