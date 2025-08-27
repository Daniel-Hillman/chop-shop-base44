import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SequencerEngine } from '../SequencerEngine.js';

// Mock AudioScheduler
vi.mock('../AudioScheduler.js', () => ({
  AudioScheduler: vi.fn().mockImplementation(() => ({
    initialize: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
    pause: vi.fn(),
    resume: vi.fn(),
    setBPM: vi.fn(),
    setSwing: vi.fn(),
    setStepResolution: vi.fn(),
    getStepDuration: vi.fn(() => 0.125),
    destroy: vi.fn(),
    onStep: null,
    onScheduleNote: null,
    scheduleNote: vi.fn()
  }))
}));

// Mock Web Audio API
const mockAudioContext = {
  currentTime: 0,
  state: 'running',
  resume: vi.fn().mockResolvedValue(undefined),
  createGain: vi.fn(() => ({
    connect: vi.fn(),
    disconnect: vi.fn(),
    gain: { value: 1 }
  }))
};

// Mock dependencies
const mockPatternManager = {
  getCurrentPattern: vi.fn(() => ({
    tracks: [
      {
        id: 'kick',
        sampleId: 'kick_001',
        volume: 0.8,
        mute: false,
        steps: [
          { active: true, velocity: 1.0 },
          { active: false, velocity: 0.7 },
          { active: true, velocity: 0.9 }
        ],
        randomization: { velocity: { enabled: false }, timing: { enabled: false } }
      }
    ]
  })),
  updateStepResolution: vi.fn()
};

const mockSampleManager = {
  getSample: vi.fn((sampleId) => ({
    id: sampleId,
    name: `Sample ${sampleId}`,
    audioBuffer: {}
  })),
  isTrackMuted: vi.fn(() => false),
  getTrackVolume: vi.fn(() => 1.0),
  playSample: vi.fn().mockResolvedValue(undefined)
};

describe('SequencerEngine', () => {
  let engine;
  let mockScheduler;

  beforeEach(() => {
    vi.clearAllMocks();
    mockAudioContext.currentTime = 0;
    mockAudioContext.state = 'running';
    
    engine = new SequencerEngine();
    
    // Get the mock scheduler instance after initialization
    mockScheduler = null;
  });

  afterEach(() => {
    if (engine) {
      engine.destroy();
    }
  });

  describe('Constructor', () => {
    it('should initialize with default values', () => {
      expect(engine.isPlaying).toBe(false);
      expect(engine.isPaused).toBe(false);
      expect(engine.currentStep).toBe(0);
      expect(engine.bpm).toBe(120);
      expect(engine.swing).toBe(0);
      expect(engine.stepResolution).toBe(16);
      expect(engine.isInitialized).toBe(false);
    });

    it('should initialize callback arrays', () => {
      expect(engine.stepCallbacks).toEqual([]);
      expect(engine.stateChangeCallbacks).toEqual([]);
    });

    it('should initialize performance stats', () => {
      expect(engine.performanceStats).toEqual({
        totalSteps: 0,
        averageLatency: 0,
        maxLatency: 0,
        timingDrift: 0
      });
    });
  });

  describe('Initialization', () => {
    it('should initialize successfully with audioContext', async () => {
      await engine.initialize(mockAudioContext);
      
      expect(engine.isInitialized).toBe(true);
      expect(engine.audioContext).toBe(mockAudioContext);
      expect(engine.scheduler).toBeDefined();
    });

    it('should initialize with dependencies', async () => {
      const dependencies = {
        patternManager: mockPatternManager,
        sampleManager: mockSampleManager
      };
      
      await engine.initialize(mockAudioContext, dependencies);
      
      expect(engine.patternManager).toBe(mockPatternManager);
      expect(engine.sampleManager).toBe(mockSampleManager);
    });

    it('should throw error without audioContext', async () => {
      await expect(engine.initialize(null)).rejects.toThrow('AudioContext is required for SequencerEngine');
    });

    it('should sync initial state with scheduler', async () => {
      engine.bpm = 140;
      engine.swing = 25;
      engine.stepResolution = 32;
      
      await engine.initialize(mockAudioContext);
      
      expect(engine.scheduler.setBPM).toHaveBeenCalledWith(140);
      expect(engine.scheduler.setSwing).toHaveBeenCalledWith(25);
      expect(engine.scheduler.setStepResolution).toHaveBeenCalledWith(32);
    });
  });

  describe('Transport Controls', () => {
    beforeEach(async () => {
      await engine.initialize(mockAudioContext);
      mockScheduler = engine.scheduler;
    });

    describe('Start', () => {
      it('should start playback successfully', async () => {
        await engine.start();
        
        expect(engine.isPlaying).toBe(true);
        expect(engine.isPaused).toBe(false);
        expect(engine.currentStep).toBe(0);
        expect(mockScheduler.start).toHaveBeenCalled();
      });

      it('should resume audio context if suspended', async () => {
        mockAudioContext.state = 'suspended';
        
        await engine.start();
        
        expect(mockAudioContext.resume).toHaveBeenCalled();
      });

      it('should not start if already playing', async () => {
        await engine.start();
        mockScheduler.start.mockClear();
        
        await engine.start();
        
        expect(mockScheduler.start).not.toHaveBeenCalled();
      });

      it('should throw error if not initialized', async () => {
        const uninitializedEngine = new SequencerEngine();
        
        await expect(uninitializedEngine.start()).rejects.toThrow('SequencerEngine must be initialized before starting');
      });

      it('should reset position when starting from stopped state', async () => {
        engine.currentStep = 5;
        engine.isPaused = false;
        
        await engine.start();
        
        expect(engine.currentStep).toBe(0);
      });

      it('should not reset position when resuming from paused state', async () => {
        engine.currentStep = 5;
        engine.isPaused = true;
        
        await engine.start();
        
        expect(engine.currentStep).toBe(5);
      });
    });

    describe('Stop', () => {
      it('should stop playback successfully', async () => {
        await engine.start();
        engine.stop();
        
        expect(engine.isPlaying).toBe(false);
        expect(engine.isPaused).toBe(false);
        expect(engine.currentStep).toBe(0);
        expect(mockScheduler.stop).toHaveBeenCalled();
      });

      it('should not stop if already stopped', () => {
        mockScheduler.stop.mockClear();
        
        engine.stop();
        
        expect(mockScheduler.stop).not.toHaveBeenCalled();
      });
    });

    describe('Pause', () => {
      it('should pause playback successfully', async () => {
        await engine.start();
        engine.pause();
        
        expect(engine.isPlaying).toBe(false);
        expect(engine.isPaused).toBe(true);
        expect(mockScheduler.pause).toHaveBeenCalled();
      });

      it('should not pause if not playing', () => {
        mockScheduler.pause.mockClear();
        
        engine.pause();
        
        expect(mockScheduler.pause).not.toHaveBeenCalled();
      });
    });

    describe('Resume', () => {
      it('should resume playback successfully', async () => {
        await engine.start();
        engine.pause();
        
        await engine.resume();
        
        expect(engine.isPlaying).toBe(true);
        expect(engine.isPaused).toBe(false);
        expect(mockScheduler.resume).toHaveBeenCalled();
      });

      it('should resume audio context if suspended', async () => {
        await engine.start();
        engine.pause();
        mockAudioContext.state = 'suspended';
        
        await engine.resume();
        
        expect(mockAudioContext.resume).toHaveBeenCalled();
      });

      it('should not resume if not paused', async () => {
        mockScheduler.resume.mockClear();
        
        await engine.resume();
        
        expect(mockScheduler.resume).not.toHaveBeenCalled();
      });
    });
  });

  describe('Parameter Controls', () => {
    beforeEach(async () => {
      await engine.initialize(mockAudioContext);
      mockScheduler = engine.scheduler;
    });

    describe('BPM Control', () => {
      it('should set valid BPM values', () => {
        engine.setBPM(100);
        
        expect(engine.bpm).toBe(100);
        expect(mockScheduler.setBPM).toHaveBeenCalledWith(100);
      });

      it('should reject invalid BPM values', () => {
        expect(() => engine.setBPM(50)).toThrow('BPM must be a number between 60 and 200');
        expect(() => engine.setBPM(250)).toThrow('BPM must be a number between 60 and 200');
        expect(() => engine.setBPM('120')).toThrow('BPM must be a number between 60 and 200');
      });

      it('should prevent timing drift when changing BPM during playback', async () => {
        await engine.start();
        engine.nextStepTime = 2.0;
        mockAudioContext.currentTime = 1.5;
        
        engine.setBPM(60); // Half the original BPM
        
        // Next step time should be adjusted to prevent drift
        expect(engine.nextStepTime).toBeGreaterThan(1.5);
      });

      it('should maintain stable timing when BPM changes multiple times', async () => {
        await engine.start();
        const initialTime = mockAudioContext.currentTime;
        engine.nextStepTime = initialTime + 1.0;
        
        // Change BPM multiple times
        engine.setBPM(140);
        engine.setBPM(100);
        engine.setBPM(120);
        
        // Should still have a valid next step time
        expect(engine.nextStepTime).toBeGreaterThan(initialTime);
        expect(engine.bpm).toBe(120);
      });

      it('should handle extreme BPM changes during playback', async () => {
        await engine.start();
        mockAudioContext.currentTime = 1.0;
        engine.nextStepTime = 1.5;
        
        // Extreme BPM change from 120 to 60 (half speed)
        engine.setBPM(60);
        
        // Next step time should be adjusted to prevent timing gaps
        expect(engine.nextStepTime).toBeGreaterThan(1.0);
        expect(engine.bpm).toBe(60);
        
        // Change to very fast BPM
        engine.setBPM(180);
        expect(engine.bpm).toBe(180);
        expect(engine.nextStepTime).toBeGreaterThan(1.0);
      });

      it('should maintain timing accuracy across BPM transitions', async () => {
        await engine.start();
        const stepCallback = vi.fn();
        engine.onStep(stepCallback);
        
        // Start at 120 BPM
        engine.setBPM(120);
        engine.handleStep(0, 1.0);
        
        // Change to 90 BPM mid-pattern
        engine.setBPM(90);
        engine.handleStep(1, 1.125);
        
        // Change to 150 BPM
        engine.setBPM(150);
        engine.handleStep(2, 1.25);
        
        expect(stepCallback).toHaveBeenCalledTimes(3);
        expect(engine.performanceStats.totalSteps).toBe(3);
        
        // Timing drift should be minimal despite BPM changes
        expect(Math.abs(engine.performanceStats.timingDrift)).toBeLessThan(0.01);
      });
    });

    describe('Swing Control', () => {
      it('should set valid swing values', () => {
        engine.setSwing(50);
        
        expect(engine.swing).toBe(50);
        expect(mockScheduler.setSwing).toHaveBeenCalledWith(50);
      });

      it('should reject invalid swing values', () => {
        expect(() => engine.setSwing(-10)).toThrow('Swing must be a number between 0 and 100');
        expect(() => engine.setSwing(150)).toThrow('Swing must be a number between 0 and 100');
        expect(() => engine.setSwing('50')).toThrow('Swing must be a number between 0 and 100');
      });
    });

    describe('Step Resolution Control', () => {
      it('should set valid step resolutions', () => {
        engine.setStepResolution(32);
        
        expect(engine.stepResolution).toBe(32);
        expect(mockScheduler.setStepResolution).toHaveBeenCalledWith(32);
      });

      it('should set 64 step resolution', () => {
        engine.setStepResolution(64);
        
        expect(engine.stepResolution).toBe(64);
        expect(mockScheduler.setStepResolution).toHaveBeenCalledWith(64);
      });

      it('should reject invalid step resolutions', () => {
        expect(() => engine.setStepResolution(4)).toThrow('Step resolution must be 8, 16, 32, or 64');
        expect(() => engine.setStepResolution(128)).toThrow('Step resolution must be 8, 16, 32, or 64');
      });

      it('should adjust current step position when changing resolution', () => {
        engine.currentStep = 8;
        engine.stepResolution = 16;
        
        engine.setStepResolution(32); // Double resolution
        
        expect(engine.currentStep).toBe(16); // Should double the position
      });

      it('should adjust current step position when changing to 64 steps', () => {
        engine.currentStep = 8;
        engine.stepResolution = 16;
        
        engine.setStepResolution(64); // Quadruple resolution
        
        expect(engine.currentStep).toBe(32); // Should quadruple the position
      });

      it('should adjust current step position when reducing resolution', () => {
        engine.currentStep = 32;
        engine.stepResolution = 64;
        
        engine.setStepResolution(16); // Quarter resolution
        
        expect(engine.currentStep).toBe(8); // Should quarter the position
      });

      it('should notify pattern manager of resolution change', () => {
        engine.patternManager = mockPatternManager;
        
        engine.setStepResolution(32);
        
        expect(mockPatternManager.updateStepResolution).toHaveBeenCalledWith(32);
      });

      it('should notify pattern manager of 64 step resolution change', () => {
        engine.patternManager = mockPatternManager;
        
        engine.setStepResolution(64);
        
        expect(mockPatternManager.updateStepResolution).toHaveBeenCalledWith(64);
      });
    });
  });

  describe('State Management', () => {
    beforeEach(async () => {
      await engine.initialize(mockAudioContext);
    });

    it('should return current state', () => {
      const state = engine.getState();
      
      expect(state).toEqual({
        isPlaying: false,
        isPaused: false,
        currentStep: 0,
        bpm: 120,
        swing: 0,
        stepResolution: 16,
        nextStepTime: 0,
        isInitialized: true,
        performanceStats: {
          totalSteps: 0,
          averageLatency: 0,
          maxLatency: 0,
          timingDrift: 0
        }
      });
    });

    it('should notify state change callbacks', () => {
      const callback = vi.fn();
      engine.onStateChange(callback);
      
      engine.setBPM(140);
      
      expect(callback).toHaveBeenCalledWith(expect.objectContaining({
        bpm: 140
      }));
    });

    it('should track state changes through complete workflow', async () => {
      const stateChanges = [];
      engine.onStateChange((state) => stateChanges.push({ ...state }));
      
      // Initial state change from BPM modification
      engine.setBPM(140);
      expect(stateChanges).toHaveLength(1);
      expect(stateChanges[0].bpm).toBe(140);
      
      // State change from starting
      await engine.start();
      expect(stateChanges).toHaveLength(2);
      expect(stateChanges[1].isPlaying).toBe(true);
      
      // State change from swing modification
      engine.setSwing(25);
      expect(stateChanges).toHaveLength(3);
      expect(stateChanges[2].swing).toBe(25);
      
      // State change from pausing
      engine.pause();
      expect(stateChanges).toHaveLength(4);
      expect(stateChanges[3].isPlaying).toBe(false);
      expect(stateChanges[3].isPaused).toBe(true);
      
      // State change from resuming
      await engine.resume();
      expect(stateChanges).toHaveLength(5);
      expect(stateChanges[4].isPlaying).toBe(true);
      expect(stateChanges[4].isPaused).toBe(false);
      
      // State change from stopping
      engine.stop();
      expect(stateChanges).toHaveLength(6);
      expect(stateChanges[5].isPlaying).toBe(false);
      expect(stateChanges[5].isPaused).toBe(false);
      expect(stateChanges[5].currentStep).toBe(0);
    });

    it('should maintain state consistency during rapid changes', async () => {
      await engine.start();
      
      // Rapid state changes
      for (let i = 0; i < 10; i++) {
        engine.setBPM(120 + i * 5);
        engine.setSwing(i * 10);
        if (i % 2 === 0) {
          engine.pause();
          await engine.resume();
        }
      }
      
      const finalState = engine.getState();
      expect(finalState.bpm).toBe(165); // 120 + 9 * 5
      expect(finalState.swing).toBe(90); // 9 * 10
      expect(finalState.isPlaying).toBe(true);
      expect(finalState.isPaused).toBe(false);
    });

    it('should preserve state across initialization cycles', async () => {
      // Set custom state
      engine.setBPM(140);
      engine.setSwing(30);
      engine.setStepResolution(32);
      
      const stateBeforeInit = engine.getState();
      
      // Re-initialize
      await engine.initialize(mockAudioContext);
      
      const stateAfterInit = engine.getState();
      expect(stateAfterInit.bpm).toBe(stateBeforeInit.bpm);
      expect(stateAfterInit.swing).toBe(stateBeforeInit.swing);
      expect(stateAfterInit.stepResolution).toBe(stateBeforeInit.stepResolution);
    });

    it('should handle concurrent state modifications safely', async () => {
      const callback = vi.fn();
      engine.onStateChange(callback);
      
      // Simulate concurrent modifications
      const promises = [
        engine.start(),
        Promise.resolve(engine.setBPM(130)),
        Promise.resolve(engine.setSwing(40)),
        Promise.resolve(engine.setStepResolution(32))
      ];
      
      await Promise.all(promises);
      
      const finalState = engine.getState();
      expect(finalState.isPlaying).toBe(true);
      expect(finalState.bpm).toBe(130);
      expect(finalState.swing).toBe(40);
      expect(finalState.stepResolution).toBe(32);
      
      // Should have received multiple state change notifications
      expect(callback).toHaveBeenCalledTimes(4);
    });
  });

  describe('Callbacks', () => {
    beforeEach(async () => {
      await engine.initialize(mockAudioContext);
    });

    it('should add and call step callbacks', () => {
      const callback = vi.fn();
      engine.onStep(callback);
      
      engine.handleStep(5, 1.0);
      
      expect(callback).toHaveBeenCalledWith(5, 1.0);
    });

    it('should add and call state change callbacks', () => {
      const callback = vi.fn();
      engine.onStateChange(callback);
      
      engine.setBPM(140);
      
      expect(callback).toHaveBeenCalled();
    });

    it('should remove step callbacks', () => {
      const callback = vi.fn();
      engine.onStep(callback);
      engine.removeStepCallback(callback);
      
      engine.handleStep(5, 1.0);
      
      expect(callback).not.toHaveBeenCalled();
    });

    it('should remove state change callbacks', () => {
      const callback = vi.fn();
      engine.onStateChange(callback);
      engine.removeStateChangeCallback(callback);
      
      engine.setBPM(140);
      
      expect(callback).not.toHaveBeenCalled();
    });

    it('should handle callback errors gracefully', () => {
      const errorCallback = vi.fn(() => {
        throw new Error('Callback error');
      });
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      engine.onStep(errorCallback);
      
      expect(() => engine.handleStep(5, 1.0)).not.toThrow();
      expect(consoleSpy).toHaveBeenCalledWith('Error in step callback:', expect.any(Error));
      
      consoleSpy.mockRestore();
    });
  });

  describe('Step Handling', () => {
    beforeEach(async () => {
      await engine.initialize(mockAudioContext, {
        patternManager: mockPatternManager,
        sampleManager: mockSampleManager
      });
      mockScheduler = engine.scheduler;
    });

    it('should handle step events correctly', () => {
      const stepCallback = vi.fn();
      engine.onStep(stepCallback);
      
      engine.handleStep(3, 1.5);
      
      expect(engine.currentStep).toBe(3);
      expect(engine.nextStepTime).toBe(1.5);
      expect(stepCallback).toHaveBeenCalledWith(3, 1.5);
    });

    it('should schedule notes for active tracks', () => {
      engine.isPlaying = true; // Must be playing to schedule notes
      engine.currentStep = 0; // First step is active in mock pattern
      
      engine.scheduleNextStep();
      
      expect(mockScheduler.scheduleNote).toHaveBeenCalled();
    });

    it('should not schedule notes for muted tracks', () => {
      const mutedPattern = {
        tracks: [{
          id: 'kick',
          sampleId: 'kick_001',
          volume: 0.8,
          mute: true, // Muted track
          steps: [{ active: true, velocity: 1.0 }],
          randomization: {}
        }]
      };
      
      mockPatternManager.getCurrentPattern.mockReturnValue(mutedPattern);
      engine.currentStep = 0;
      
      engine.scheduleNextStep();
      
      expect(mockScheduler.scheduleNote).not.toHaveBeenCalled();
    });

    it('should not schedule notes for inactive steps', () => {
      engine.currentStep = 1; // Second step is inactive in mock pattern
      
      engine.scheduleNextStep();
      
      expect(mockScheduler.scheduleNote).not.toHaveBeenCalled();
    });
  });

  describe('Performance Statistics', () => {
    beforeEach(async () => {
      await engine.initialize(mockAudioContext);
    });

    it('should update performance stats on step handling', () => {
      const originalNow = performance.now;
      let timeCounter = 0;
      performance.now = vi.fn(() => timeCounter++);
      
      engine.handleStep(0, 1.0);
      engine.handleStep(1, 1.125);
      
      const stats = engine.getPerformanceStats();
      expect(stats.totalSteps).toBe(2);
      expect(stats.averageLatency).toBeGreaterThan(0);
      
      performance.now = originalNow;
    });

    it('should calculate timing drift', async () => {
      await engine.initialize(mockAudioContext);
      mockScheduler = engine.scheduler;
      
      engine.lastStepTime = 1.0;
      mockScheduler.getStepDuration.mockReturnValue(0.125);
      
      engine.updatePerformanceStats(5, 1.2); // 0.2 actual vs 0.125 expected
      
      expect(engine.performanceStats.timingDrift).toBeCloseTo(0.075, 3);
    });

    it('should track maximum latency', () => {
      engine.updatePerformanceStats(5, 1.0);
      engine.updatePerformanceStats(10, 1.1);
      engine.updatePerformanceStats(3, 1.2);
      
      expect(engine.performanceStats.maxLatency).toBe(10);
    });

    it('should calculate average latency correctly', () => {
      engine.updatePerformanceStats(10, 1.0);
      engine.updatePerformanceStats(20, 1.1);
      engine.updatePerformanceStats(30, 1.2);
      
      expect(engine.performanceStats.averageLatency).toBe(20);
      expect(engine.performanceStats.totalSteps).toBe(3);
    });

    it('should reset performance stats', () => {
      engine.updatePerformanceStats(10, 1.0);
      
      engine.resetPerformanceStats();
      
      expect(engine.performanceStats.totalSteps).toBe(0);
      expect(engine.performanceStats.averageLatency).toBe(0);
      expect(engine.performanceStats.maxLatency).toBe(0);
      expect(engine.performanceStats.timingDrift).toBe(0);
    });

    it('should reset performance stats when starting from stopped state', async () => {
      engine.updatePerformanceStats(10, 1.0);
      
      await engine.start();
      
      expect(engine.performanceStats.totalSteps).toBe(0);
    });
  });

  describe('Cleanup', () => {
    beforeEach(async () => {
      await engine.initialize(mockAudioContext);
      mockScheduler = engine.scheduler;
    });

    it('should cleanup resources on destroy', () => {
      const stepCallback = vi.fn();
      const stateCallback = vi.fn();
      
      engine.onStep(stepCallback);
      engine.onStateChange(stateCallback);
      
      engine.destroy();
      
      expect(mockScheduler.destroy).toHaveBeenCalled();
      expect(engine.scheduler).toBeNull();
      expect(engine.audioContext).toBeNull();
      expect(engine.stepCallbacks).toEqual([]);
      expect(engine.stateChangeCallbacks).toEqual([]);
      expect(engine.isInitialized).toBe(false);
    });
  });

  describe('Timing Stability', () => {
    beforeEach(async () => {
      await engine.initialize(mockAudioContext);
      mockScheduler = engine.scheduler;
    });

    it('should maintain stable timing across multiple steps', () => {
      const stepCallback = vi.fn();
      engine.onStep(stepCallback);
      
      // Simulate multiple steps
      engine.handleStep(0, 1.0);
      engine.handleStep(1, 1.125);
      engine.handleStep(2, 1.25);
      engine.handleStep(3, 1.375);
      
      expect(stepCallback).toHaveBeenCalledTimes(4);
      expect(engine.performanceStats.totalSteps).toBe(4);
    });

    it('should handle rapid BPM changes without losing stability', async () => {
      await engine.start();
      
      // Rapid BPM changes
      for (let bpm = 120; bpm <= 180; bpm += 10) {
        engine.setBPM(bpm);
        expect(engine.bpm).toBe(bpm);
        expect(engine.isPlaying).toBe(true);
      }
      
      // Should still be in a valid state
      expect(engine.getState().isPlaying).toBe(true);
    });

    it('should maintain step position accuracy during resolution changes', () => {
      engine.currentStep = 12;
      engine.stepResolution = 16;
      
      // Change to higher resolution
      engine.setStepResolution(32);
      expect(engine.currentStep).toBe(24); // 12 * (32/16)
      
      // Change to lower resolution
      engine.setStepResolution(8);
      expect(engine.currentStep).toBe(6); // 24 * (8/32)
    });

    it('should handle edge cases in step position calculation', () => {
      engine.currentStep = 15; // Last step in 16-step pattern
      engine.stepResolution = 16;
      
      engine.setStepResolution(8);
      expect(engine.currentStep).toBe(7); // Should be last step in 8-step pattern
      
      engine.setStepResolution(32);
      expect(engine.currentStep).toBe(28); // 7 * (32/8) = 28
    });
  });

  describe('Error Handling', () => {
    beforeEach(async () => {
      await engine.initialize(mockAudioContext);
    });

    it('should handle start errors gracefully', async () => {
      // Reset the mock to return a rejected promise
      mockAudioContext.resume.mockReset();
      mockAudioContext.resume.mockRejectedValue(new Error('Audio context error'));
      mockAudioContext.state = 'suspended';
      
      await expect(engine.start()).rejects.toThrow('Audio context error');
    });

    it('should handle resume errors gracefully', async () => {
      await engine.start();
      engine.pause();
      
      // Reset the mock to return a rejected promise
      mockAudioContext.resume.mockReset();
      mockAudioContext.resume.mockRejectedValue(new Error('Resume error'));
      mockAudioContext.state = 'suspended';
      
      await expect(engine.resume()).rejects.toThrow('Resume error');
    });
  });
});