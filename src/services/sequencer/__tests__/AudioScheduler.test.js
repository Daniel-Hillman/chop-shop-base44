import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AudioScheduler } from '../AudioScheduler.js';

// Mock Web Audio API
const mockAudioContext = {
  currentTime: 0,
  createGain: vi.fn(() => ({
    connect: vi.fn(),
    disconnect: vi.fn(),
    gain: { value: 1 }
  })),
  createOscillator: vi.fn(() => ({
    connect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
    frequency: { value: 440 }
  }))
};

// Mock Worker
global.Worker = vi.fn().mockImplementation(() => ({
  postMessage: vi.fn(),
  terminate: vi.fn(),
  onmessage: null
}));

global.URL = {
  createObjectURL: vi.fn(() => 'mock-url')
};

global.Blob = vi.fn();

describe('AudioScheduler', () => {
  let scheduler;
  let mockWorker;

  beforeEach(() => {
    vi.clearAllMocks();
    mockAudioContext.currentTime = 0;
    
    scheduler = new AudioScheduler(mockAudioContext);
    
    // Get the mock worker instance
    mockWorker = {
      postMessage: vi.fn(),
      terminate: vi.fn(),
      onmessage: null
    };
    
    // Mock Worker constructor to return our mock
    global.Worker.mockImplementation(() => mockWorker);
  });

  afterEach(() => {
    if (scheduler) {
      scheduler.destroy();
    }
  });

  describe('Constructor and Initialization', () => {
    it('should initialize with default values', () => {
      expect(scheduler.lookahead).toBe(25.0);
      expect(scheduler.scheduleAheadTime).toBe(0.1);
      expect(scheduler.bpm).toBe(120);
      expect(scheduler.swing).toBe(0);
      expect(scheduler.stepResolution).toBe(16);
      expect(scheduler.isRunning).toBe(false);
    });

    it('should throw error without audioContext', () => {
      expect(() => new AudioScheduler(null)).not.toThrow();
      
      const invalidScheduler = new AudioScheduler(null);
      expect(() => invalidScheduler.initialize()).toThrow('AudioContext is required for AudioScheduler');
    });

    it('should initialize worker correctly', () => {
      scheduler.initialize();
      
      expect(global.Worker).toHaveBeenCalled();
      expect(scheduler.timerWorker).toBeDefined();
    });
  });

  describe('BPM Control', () => {
    it('should set valid BPM values', () => {
      scheduler.setBPM(100);
      expect(scheduler.bpm).toBe(100);
      
      scheduler.setBPM(180);
      expect(scheduler.bpm).toBe(180);
    });

    it('should reject invalid BPM values', () => {
      expect(() => scheduler.setBPM(50)).toThrow('BPM must be between 60 and 200');
      expect(() => scheduler.setBPM(250)).toThrow('BPM must be between 60 and 200');
    });

    it('should calculate correct step duration for different BPMs', () => {
      scheduler.setBPM(120);
      scheduler.setStepResolution(16);
      
      // At 120 BPM, 16th notes should be 0.125 seconds apart
      const expectedDuration = (60 / 120) / 4; // 0.125 seconds
      expect(scheduler.getStepDuration()).toBeCloseTo(expectedDuration, 3);
      
      scheduler.setBPM(60);
      const expectedDurationSlow = (60 / 60) / 4; // 0.25 seconds
      expect(scheduler.getStepDuration()).toBeCloseTo(expectedDurationSlow, 3);
    });
  });

  describe('Swing Control', () => {
    it('should set valid swing values', () => {
      scheduler.setSwing(50);
      expect(scheduler.swing).toBe(50);
      
      scheduler.setSwing(0);
      expect(scheduler.swing).toBe(0);
      
      scheduler.setSwing(100);
      expect(scheduler.swing).toBe(100);
    });

    it('should reject invalid swing values', () => {
      expect(() => scheduler.setSwing(-10)).toThrow('Swing must be between 0 and 100');
      expect(() => scheduler.setSwing(150)).toThrow('Swing must be between 0 and 100');
    });

    it('should calculate swing timing correctly', () => {
      scheduler.setBPM(120);
      scheduler.setStepResolution(16);
      scheduler.setSwing(50);
      
      const baseTime = 1.0;
      const stepDuration = scheduler.getStepDuration();
      
      // Even steps (0, 2, 4...) should not be affected by swing
      const evenStepTime = scheduler.calculateSwingTiming(baseTime, 0);
      expect(evenStepTime).toBe(baseTime);
      
      // Odd steps (1, 3, 5...) should be delayed by swing
      const oddStepTime = scheduler.calculateSwingTiming(baseTime, 1);
      expect(oddStepTime).toBeGreaterThan(baseTime);
      
      // With 50% swing, delay should be 15% of step duration (50% of max 30%)
      const expectedDelay = stepDuration * 0.3 * 0.5;
      expect(oddStepTime).toBeCloseTo(baseTime + expectedDelay, 3);
    });

    it('should not apply swing when set to 0', () => {
      scheduler.setSwing(0);
      
      const baseTime = 1.0;
      const evenTime = scheduler.calculateSwingTiming(baseTime, 0);
      const oddTime = scheduler.calculateSwingTiming(baseTime, 1);
      
      expect(evenTime).toBe(baseTime);
      expect(oddTime).toBe(baseTime);
    });

    it('should calculate precise swing timing at different BPMs', () => {
      const testCases = [
        { bpm: 60, swing: 25, resolution: 16 },
        { bpm: 120, swing: 50, resolution: 16 },
        { bpm: 180, swing: 75, resolution: 32 }
      ];

      testCases.forEach(({ bpm, swing, resolution }) => {
        scheduler.setBPM(bpm);
        scheduler.setSwing(swing);
        scheduler.setStepResolution(resolution);
        
        const baseTime = 2.0;
        const stepDuration = scheduler.getStepDuration();
        const maxSwingDelay = stepDuration * 0.3; // 30% max swing
        const expectedDelay = maxSwingDelay * (swing / 100);
        
        const swungTime = scheduler.calculateSwingTiming(baseTime, 1);
        expect(swungTime).toBeCloseTo(baseTime + expectedDelay, 4);
      });
    });

    it('should maintain swing consistency across pattern loops', () => {
      scheduler.setBPM(120);
      scheduler.setSwing(60);
      scheduler.setStepResolution(16);
      
      const baseTime = 1.0;
      const stepDuration = scheduler.getStepDuration();
      
      // Test multiple loops to ensure consistency
      for (let loop = 0; loop < 3; loop++) {
        for (let step = 0; step < 16; step++) {
          const time = baseTime + (loop * 16 + step) * stepDuration;
          const swungTime = scheduler.calculateSwingTiming(time, step);
          
          if (step % 2 === 0) {
            // Even steps should not be affected
            expect(swungTime).toBe(time);
          } else {
            // Odd steps should have consistent swing delay
            expect(swungTime).toBeGreaterThan(time);
            const delay = swungTime - time;
            const expectedDelay = stepDuration * 0.3 * 0.6; // 60% swing
            expect(delay).toBeCloseTo(expectedDelay, 4);
          }
        }
      }
    });
  });

  describe('Step Resolution', () => {
    it('should set valid step resolutions', () => {
      scheduler.setStepResolution(8);
      expect(scheduler.stepResolution).toBe(8);
      
      scheduler.setStepResolution(16);
      expect(scheduler.stepResolution).toBe(16);
      
      scheduler.setStepResolution(32);
      expect(scheduler.stepResolution).toBe(32);
    });

    it('should reject invalid step resolutions', () => {
      expect(() => scheduler.setStepResolution(4)).toThrow('Step resolution must be 8, 16, 32, or 64');
      expect(() => scheduler.setStepResolution(128)).toThrow('Step resolution must be 8, 16, 32, or 64');
    });

    it('should set 64 step resolution', () => {
      scheduler.setStepResolution(64);
      expect(scheduler.stepResolution).toBe(64);
    });

    it('should calculate correct step durations for different resolutions', () => {
      scheduler.setBPM(120);
      
      // 8th notes at 120 BPM = 0.25 seconds
      scheduler.setStepResolution(8);
      expect(scheduler.getStepDuration()).toBeCloseTo(0.25, 3);
      
      // 16th notes at 120 BPM = 0.125 seconds
      scheduler.setStepResolution(16);
      expect(scheduler.getStepDuration()).toBeCloseTo(0.125, 3);
      
      // 32nd notes at 120 BPM = 0.0625 seconds
      scheduler.setStepResolution(32);
      expect(scheduler.getStepDuration()).toBeCloseTo(0.0625, 3);
      
      // 64th notes at 120 BPM = 0.03125 seconds
      scheduler.setStepResolution(64);
      expect(scheduler.getStepDuration()).toBeCloseTo(0.03125, 3);
    });
  });

  describe('Randomization', () => {
    it('should apply timing randomization correctly', () => {
      const baseTime = 1.0;
      const baseVelocity = 0.8;
      const randomizationSettings = {
        timing: { enabled: true, amount: 50 },
        velocity: { enabled: false, amount: 0 }
      };
      
      // Mock Math.random to return predictable values
      const originalRandom = Math.random;
      Math.random = vi.fn(() => 0.7); // Returns 0.7 consistently
      
      const result = scheduler.applyRandomization(baseTime, baseVelocity, randomizationSettings);
      
      // Timing should be modified
      expect(result.timing).not.toBe(baseTime);
      expect(result.timing).toBeGreaterThan(baseTime); // 0.7 > 0.5, so positive variation
      
      // Velocity should remain unchanged
      expect(result.velocity).toBe(baseVelocity);
      
      Math.random = originalRandom;
    });

    it('should apply velocity randomization correctly', () => {
      const baseTime = 1.0;
      const baseVelocity = 0.8;
      const randomizationSettings = {
        timing: { enabled: false, amount: 0 },
        velocity: { enabled: true, amount: 30 }
      };
      
      const originalRandom = Math.random;
      Math.random = vi.fn(() => 0.3); // Returns 0.3 consistently
      
      const result = scheduler.applyRandomization(baseTime, baseVelocity, randomizationSettings);
      
      // Timing should remain unchanged
      expect(result.timing).toBe(baseTime);
      
      // Velocity should be modified
      expect(result.velocity).not.toBe(baseVelocity);
      expect(result.velocity).toBeLessThan(baseVelocity); // 0.3 < 0.5, so negative variation
      
      Math.random = originalRandom;
    });

    it('should clamp velocity to valid range', () => {
      const baseTime = 1.0;
      const baseVelocity = 0.1; // Low velocity
      const randomizationSettings = {
        timing: { enabled: false, amount: 0 },
        velocity: { enabled: true, amount: 100 } // Maximum randomization
      };
      
      const originalRandom = Math.random;
      Math.random = vi.fn(() => 0.0); // Maximum negative variation
      
      const result = scheduler.applyRandomization(baseTime, baseVelocity, randomizationSettings);
      
      // Velocity should be clamped to minimum 0.1
      expect(result.velocity).toBe(0.1);
      
      Math.random = originalRandom;
    });
  });

  describe('Transport Controls', () => {
    beforeEach(() => {
      scheduler.initialize();
    });

    it('should start scheduler correctly', () => {
      scheduler.start();
      
      expect(scheduler.isRunning).toBe(true);
      expect(scheduler.currentStep).toBe(0);
      expect(mockWorker.postMessage).toHaveBeenCalledWith("start");
    });

    it('should stop scheduler correctly', () => {
      scheduler.start();
      scheduler.stop();
      
      expect(scheduler.isRunning).toBe(false);
      expect(scheduler.currentStep).toBe(0);
      expect(scheduler.nextStepTime).toBe(0);
      expect(mockWorker.postMessage).toHaveBeenCalledWith("stop");
    });

    it('should pause and resume correctly', () => {
      scheduler.start();
      expect(scheduler.isRunning).toBe(true);
      
      scheduler.pause();
      expect(scheduler.isRunning).toBe(false);
      expect(mockWorker.postMessage).toHaveBeenCalledWith("stop");
      
      scheduler.resume();
      expect(scheduler.isRunning).toBe(true);
      expect(mockWorker.postMessage).toHaveBeenCalledWith("start");
    });
  });

  describe('Step Advancement', () => {
    it('should advance steps correctly', () => {
      scheduler.setStepResolution(16);
      scheduler.setBPM(120);
      
      const initialTime = 1.0;
      scheduler.nextStepTime = initialTime;
      scheduler.currentStep = 0;
      
      scheduler.advanceStep();
      
      expect(scheduler.currentStep).toBe(1);
      expect(scheduler.nextStepTime).toBeCloseTo(initialTime + scheduler.getStepDuration(), 3);
    });

    it('should wrap around at end of pattern', () => {
      scheduler.setStepResolution(16);
      scheduler.currentStep = 15; // Last step
      
      scheduler.advanceStep();
      
      expect(scheduler.currentStep).toBe(0); // Should wrap to beginning
    });
  });

  describe('Note Scheduling', () => {
    it('should schedule notes with callbacks', () => {
      const mockOnScheduleNote = vi.fn();
      scheduler.onScheduleNote = mockOnScheduleNote;
      
      const time = 1.0;
      const sample = 'kick';
      const velocity = 0.8;
      
      scheduler.scheduleNote(time, sample, velocity);
      
      expect(mockOnScheduleNote).toHaveBeenCalledWith(time, sample, velocity, null);
    });

    it('should handle scheduling errors gracefully', () => {
      const mockOnScheduleNote = vi.fn(() => {
        throw new Error('Scheduling error');
      });
      scheduler.onScheduleNote = mockOnScheduleNote;
      
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      expect(() => {
        scheduler.scheduleNote(1.0, 'kick', 0.8);
      }).not.toThrow();
      
      expect(consoleSpy).toHaveBeenCalledWith('Error scheduling note:', expect.any(Error));
      
      consoleSpy.mockRestore();
    });
  });

  describe('Performance Statistics', () => {
    it('should track scheduling statistics', () => {
      // Mock performance.now
      const originalNow = performance.now;
      let timeCounter = 0;
      performance.now = vi.fn(() => timeCounter++);
      
      scheduler.scheduleNote(1.0, 'kick', 0.8);
      scheduler.scheduleNote(1.1, 'snare', 0.7);
      
      const stats = scheduler.getSchedulingStats();
      expect(stats.totalScheduled).toBe(2);
      expect(stats.averageLatency).toBeGreaterThan(0);
      expect(stats.maxLatency).toBeGreaterThan(0);
      
      performance.now = originalNow;
    });

    it('should reset statistics correctly', () => {
      scheduler.updateSchedulingStats(10);
      scheduler.updateSchedulingStats(20);
      
      let stats = scheduler.getSchedulingStats();
      expect(stats.totalScheduled).toBe(2);
      
      scheduler.resetSchedulingStats();
      stats = scheduler.getSchedulingStats();
      expect(stats.totalScheduled).toBe(0);
      expect(stats.averageLatency).toBe(0);
      expect(stats.maxLatency).toBe(0);
    });
  });

  describe('Timing Precision Tests', () => {
    beforeEach(() => {
      scheduler.initialize();
    });

    it('should maintain precise timing at various BPMs', () => {
      const testBPMs = [60, 90, 120, 140, 180];
      
      testBPMs.forEach(bpm => {
        scheduler.setBPM(bpm);
        scheduler.setStepResolution(16);
        
        const expectedStepDuration = (60 / bpm) / 4; // 16th notes
        const actualStepDuration = scheduler.getStepDuration();
        
        expect(actualStepDuration).toBeCloseTo(expectedStepDuration, 6);
      });
    });

    it('should calculate accurate step durations for all resolutions', () => {
      scheduler.setBPM(120);
      
      const resolutionTests = [
        { resolution: 8, expectedDuration: 0.25 },   // 8th notes
        { resolution: 16, expectedDuration: 0.125 }, // 16th notes
        { resolution: 32, expectedDuration: 0.0625 }, // 32nd notes
        { resolution: 64, expectedDuration: 0.03125 } // 64th notes
      ];

      resolutionTests.forEach(({ resolution, expectedDuration }) => {
        scheduler.setStepResolution(resolution);
        const actualDuration = scheduler.getStepDuration();
        expect(actualDuration).toBeCloseTo(expectedDuration, 6);
      });
    });

    it('should maintain timing stability during rapid parameter changes', () => {
      scheduler.setBPM(120);
      scheduler.setStepResolution(16);
      const initialDuration = scheduler.getStepDuration();
      
      // Rapid changes
      for (let i = 0; i < 10; i++) {
        scheduler.setSwing(Math.random() * 100);
        scheduler.setBPM(60 + Math.random() * 120);
        scheduler.setStepResolution([8, 16, 32, 64][Math.floor(Math.random() * 4)]);
      }
      
      // Return to original settings
      scheduler.setBPM(120);
      scheduler.setStepResolution(16);
      scheduler.setSwing(0);
      
      const finalDuration = scheduler.getStepDuration();
      expect(finalDuration).toBeCloseTo(initialDuration, 6);
    });

    it('should handle edge case timing calculations', () => {
      // Test minimum BPM with maximum resolution
      scheduler.setBPM(60);
      scheduler.setStepResolution(64);
      // 60 BPM = 1 second per beat, 64th notes = 16 steps per beat, so 1/16 = 0.0625
      expect(scheduler.getStepDuration()).toBeCloseTo(0.0625, 6);
      
      // Test maximum BPM with minimum resolution
      scheduler.setBPM(200);
      scheduler.setStepResolution(8);
      // 200 BPM = 0.3 seconds per beat, 8th notes = 2 steps per beat, so 0.3/2 = 0.15
      expect(scheduler.getStepDuration()).toBeCloseTo(0.15, 6);
    });

    it('should measure scheduling latency accurately', () => {
      const originalNow = performance.now;
      let timeCounter = 1000; // Start at 1000ms
      performance.now = vi.fn(() => timeCounter++);
      
      // Schedule multiple notes and measure latency
      for (let i = 0; i < 10; i++) {
        scheduler.scheduleNote(1.0 + i * 0.1, 'kick', 0.8);
      }
      
      const stats = scheduler.getSchedulingStats();
      expect(stats.totalScheduled).toBe(10);
      expect(stats.averageLatency).toBeGreaterThan(0);
      expect(stats.maxLatency).toBeGreaterThanOrEqual(stats.averageLatency);
      
      performance.now = originalNow;
    });

    it('should detect timing drift over extended periods', () => {
      scheduler.setBPM(120);
      scheduler.setStepResolution(16);
      const stepDuration = scheduler.getStepDuration();
      
      let currentTime = 1.0;
      const expectedTimes = [];
      const actualTimes = [];
      
      // Simulate 64 steps (4 bars)
      for (let step = 0; step < 64; step++) {
        expectedTimes.push(currentTime);
        
        // Simulate slight timing variations
        const variation = (Math.random() - 0.5) * 0.001; // ±0.5ms variation
        const actualTime = currentTime + variation;
        actualTimes.push(actualTime);
        
        scheduler.updateSchedulingStats(Math.abs(variation * 1000)); // Convert to ms
        currentTime += stepDuration;
      }
      
      const stats = scheduler.getSchedulingStats();
      expect(stats.totalScheduled).toBe(64);
      expect(stats.maxLatency).toBeLessThan(1); // Should be less than 1ms
    });
  });

  describe('Cleanup', () => {
    it('should cleanup resources on destroy', () => {
      scheduler.initialize();
      const worker = scheduler.timerWorker;
      
      scheduler.destroy();
      
      expect(scheduler.isRunning).toBe(false);
      expect(worker.terminate).toHaveBeenCalled();
      expect(scheduler.timerWorker).toBeNull();
    });
  });

  describe('Scheduler Loop', () => {
    it('should call step callback during scheduling', () => {
      const mockOnStep = vi.fn();
      scheduler.onStep = mockOnStep;
      scheduler.isRunning = true;
      scheduler.nextStepTime = 0;
      mockAudioContext.currentTime = 0.2; // Ahead of nextStepTime
      
      scheduler.scheduler();
      
      expect(mockOnStep).toHaveBeenCalled();
    });

    it('should not schedule when not running', () => {
      const mockOnStep = vi.fn();
      scheduler.onStep = mockOnStep;
      scheduler.isRunning = false;
      
      scheduler.scheduler();
      
      expect(mockOnStep).not.toHaveBeenCalled();
    });
  });
});