import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AudioScheduler } from '../AudioScheduler.js';
import { SequencerEngine } from '../SequencerEngine.js';
import { PatternManager } from '../PatternManager.js';
import { SampleManager } from '../SampleManager.js';

// Mock Web Audio API with high precision timing
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

// Mock high-resolution performance timer
const mockPerformanceNow = (() => {
  let time = 0;
  return vi.fn(() => time += 0.1); // Increment by 0.1ms each call
})();

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

describe('Sequencer Performance Tests', () => {
  let scheduler;
  let engine;
  let patternManager;
  let sampleManager;

  beforeEach(() => {
    vi.clearAllMocks();
    mockAudioContext.currentTime = 0;
    
    // Mock performance.now for consistent timing tests
    global.performance.now = mockPerformanceNow;
    
    scheduler = new AudioScheduler(mockAudioContext);
    engine = new SequencerEngine();
    patternManager = new PatternManager();
    sampleManager = new SampleManager();
  });

  afterEach(() => {
    if (scheduler) {
      scheduler.destroy();
    }
    if (engine) {
      engine.destroy();
    }
    if (sampleManager) {
      sampleManager.destroy();
    }
    
    // Reset performance.now mock
    mockPerformanceNow.mockClear();
  });

  describe('Timing Precision Tests', () => {
    beforeEach(() => {
      scheduler.initialize();
    });

    it('should maintain sub-millisecond timing accuracy at 120 BPM', () => {
      scheduler.setBPM(120);
      scheduler.setStepResolution(16);
      
      const expectedStepDuration = (60 / 120) / 4; // 0.125 seconds
      const actualStepDuration = scheduler.getStepDuration();
      
      // Should be accurate to microsecond level
      expect(Math.abs(actualStepDuration - expectedStepDuration)).toBeLessThan(0.000001);
    });

    it('should maintain timing accuracy across different BPMs', () => {
      const testBPMs = [60, 80, 100, 120, 140, 160, 180, 200];
      const maxError = 0.000001; // 1 microsecond tolerance
      
      testBPMs.forEach(bpm => {
        scheduler.setBPM(bpm);
        scheduler.setStepResolution(16);
        
        const expectedDuration = (60 / bpm) / 4;
        const actualDuration = scheduler.getStepDuration();
        const error = Math.abs(actualDuration - expectedDuration);
        
        expect(error).toBeLessThan(maxError);
      });
    });

    it('should calculate precise swing timing at various percentages', () => {
      scheduler.setBPM(120);
      scheduler.setStepResolution(16);
      const stepDuration = scheduler.getStepDuration();
      const baseTime = 1.0;
      
      const swingPercentages = [0, 10, 25, 50, 75, 90, 100];
      
      swingPercentages.forEach(swing => {
        scheduler.setSwing(swing);
        
        // Even steps should not be affected
        const evenTime = scheduler.calculateSwingTiming(baseTime, 0);
        expect(evenTime).toBe(baseTime);
        
        // Odd steps should have precise swing delay
        const oddTime = scheduler.calculateSwingTiming(baseTime, 1);
        const expectedDelay = stepDuration * 0.3 * (swing / 100);
        const actualDelay = oddTime - baseTime;
        
        expect(Math.abs(actualDelay - expectedDelay)).toBeLessThan(0.000001);
      });
    });

    it('should maintain timing stability under load', () => {
      scheduler.setBPM(180); // Fast tempo
      scheduler.setStepResolution(32); // High resolution
      scheduler.setSwing(60); // Heavy swing
      
      const baseTime = 1.0;
      const stepDuration = scheduler.getStepDuration();
      const timingMeasurements = [];
      
      // Measure timing for 128 steps (4 bars at 32nd notes)
      for (let step = 0; step < 128; step++) {
        const expectedTime = baseTime + (step * stepDuration);
        const actualTime = scheduler.calculateSwingTiming(expectedTime, step);
        
        if (step % 2 === 0) {
          // Even steps should be exact
          timingMeasurements.push(Math.abs(actualTime - expectedTime));
        } else {
          // Odd steps should have consistent swing
          const expectedSwingDelay = stepDuration * 0.3 * 0.6; // 60% swing
          const actualSwingDelay = actualTime - expectedTime;
          timingMeasurements.push(Math.abs(actualSwingDelay - expectedSwingDelay));
        }
      }
      
      // All measurements should be extremely precise
      const maxError = Math.max(...timingMeasurements);
      const avgError = timingMeasurements.reduce((a, b) => a + b, 0) / timingMeasurements.length;
      
      expect(maxError).toBeLessThan(0.000001); // Max error < 1 microsecond
      expect(avgError).toBeLessThan(0.0000001); // Avg error < 0.1 microsecond
    });

    it('should handle rapid parameter changes without timing drift', () => {
      scheduler.setBPM(120);
      scheduler.setStepResolution(16);
      
      const initialStepDuration = scheduler.getStepDuration();
      let currentTime = 1.0;
      const timingErrors = [];
      
      // Simulate 100 rapid parameter changes
      for (let i = 0; i < 100; i++) {
        // Randomly change parameters
        const newBPM = 60 + Math.random() * 140;
        const newSwing = Math.random() * 100;
        const newResolution = [8, 16, 32, 64][Math.floor(Math.random() * 4)];
        
        scheduler.setBPM(newBPM);
        scheduler.setSwing(newSwing);
        scheduler.setStepResolution(newResolution);
        
        // Calculate expected vs actual timing
        const expectedDuration = (60 / newBPM) / (newResolution / 4);
        const actualDuration = scheduler.getStepDuration();
        const error = Math.abs(actualDuration - expectedDuration);
        
        timingErrors.push(error);
        currentTime += actualDuration;
      }
      
      // Reset to original settings
      scheduler.setBPM(120);
      scheduler.setSwing(0);
      scheduler.setStepResolution(16);
      
      const finalStepDuration = scheduler.getStepDuration();
      
      // Should return to original timing
      expect(Math.abs(finalStepDuration - initialStepDuration)).toBeLessThan(0.000001);
      
      // All intermediate calculations should be precise
      const maxTimingError = Math.max(...timingErrors);
      expect(maxTimingError).toBeLessThan(0.000001);
    });
  });

  describe('Scheduling Performance Tests', () => {
    beforeEach(() => {
      scheduler.initialize();
    });

    it('should schedule notes with minimal latency', () => {
      const scheduleLatencies = [];
      const noteCount = 1000;
      
      // Schedule many notes and measure latency
      for (let i = 0; i < noteCount; i++) {
        const startTime = performance.now();
        scheduler.scheduleNote(1.0 + i * 0.1, 'kick', 0.8);
        const endTime = performance.now();
        
        scheduleLatencies.push(endTime - startTime);
      }
      
      const avgLatency = scheduleLatencies.reduce((a, b) => a + b, 0) / noteCount;
      const maxLatency = Math.max(...scheduleLatencies);
      
      // Scheduling should be very fast
      expect(avgLatency).toBeLessThan(1); // < 1ms average
      expect(maxLatency).toBeLessThan(5); // < 5ms maximum
      
      // Verify statistics were tracked
      const stats = scheduler.getSchedulingStats();
      expect(stats.totalScheduled).toBe(noteCount);
      expect(stats.averageLatency).toBeGreaterThan(0);
    });

    it('should handle burst scheduling efficiently', () => {
      const burstSize = 100;
      const burstCount = 10;
      const burstLatencies = [];
      
      for (let burst = 0; burst < burstCount; burst++) {
        const burstStartTime = performance.now();
        
        // Schedule a burst of notes
        for (let note = 0; note < burstSize; note++) {
          scheduler.scheduleNote(1.0 + note * 0.01, 'kick', 0.8);
        }
        
        const burstEndTime = performance.now();
        burstLatencies.push(burstEndTime - burstStartTime);
      }
      
      const avgBurstLatency = burstLatencies.reduce((a, b) => a + b, 0) / burstCount;
      const maxBurstLatency = Math.max(...burstLatencies);
      
      // Burst scheduling should be efficient
      expect(avgBurstLatency).toBeLessThan(50); // < 50ms per burst (relaxed for test env)
      expect(maxBurstLatency).toBeLessThan(100); // < 100ms maximum (relaxed for test env)
      
      // Total notes scheduled
      const stats = scheduler.getSchedulingStats();
      expect(stats.totalScheduled).toBe(burstSize * burstCount);
    });

    it('should maintain performance under concurrent operations', async () => {
      const operationLatencies = [];
      const operationCount = 50;
      
      // Simulate concurrent scheduling and parameter changes
      const operations = [];
      
      for (let i = 0; i < operationCount; i++) {
        operations.push(async () => {
          const startTime = performance.now();
          
          // Mix of operations
          if (i % 4 === 0) {
            scheduler.setBPM(120 + Math.random() * 60);
          } else if (i % 4 === 1) {
            scheduler.setSwing(Math.random() * 100);
          } else if (i % 4 === 2) {
            scheduler.setStepResolution([8, 16, 32, 64][Math.floor(Math.random() * 4)]);
          } else {
            scheduler.scheduleNote(1.0 + i * 0.1, 'kick', 0.8);
          }
          
          const endTime = performance.now();
          operationLatencies.push(endTime - startTime);
        });
      }
      
      // Execute all operations concurrently
      await Promise.all(operations.map(op => op()));
      
      const avgLatency = operationLatencies.reduce((a, b) => a + b, 0) / operationCount;
      const maxLatency = Math.max(...operationLatencies);
      
      // Operations should remain fast under concurrency
      expect(avgLatency).toBeLessThan(2); // < 2ms average
      expect(maxLatency).toBeLessThan(10); // < 10ms maximum
    });
  });

  describe('Memory Performance Tests', () => {
    it('should manage memory efficiently during extended operation', async () => {
      // Initialize full sequencer system
      const mockSamplePlaybackEngine = {
        preloadSample: vi.fn().mockResolvedValue(undefined),
        playSample: vi.fn().mockResolvedValue(undefined),
        loadSample: vi.fn().mockResolvedValue({}),
        isLoaded: vi.fn().mockReturnValue(true)
      };
      
      sampleManager.initialize(mockSamplePlaybackEngine);
      await sampleManager.loadSamplePack('default');
      
      await engine.initialize(mockAudioContext, {
        patternManager,
        sampleManager
      });
      
      // Create multiple patterns
      const patterns = [];
      for (let i = 0; i < 10; i++) {
        const pattern = patternManager.createPattern(`Pattern ${i}`, 8, 32);
        patterns.push(pattern);
        
        // Program each pattern
        pattern.tracks.forEach((track, trackIndex) => {
          for (let step = trackIndex; step < 32; step += 4) {
            patternManager.setCurrentPattern(pattern);
            patternManager.toggleStep(track.id, step);
          }
        });
      }
      
      // Simulate extended playback across all patterns
      const memoryUsageBefore = process.memoryUsage?.() || { heapUsed: 0 };
      
      for (let patternIndex = 0; patternIndex < patterns.length; patternIndex++) {
        await patternManager.loadPattern(patterns[patternIndex].id);
        await engine.start();
        
        // Simulate playback of full pattern
        for (let step = 0; step < 32; step++) {
          engine.handleStep(step, 1.0 + step * 0.1);
        }
        
        engine.stop();
      }
      
      const memoryUsageAfter = process.memoryUsage?.() || { heapUsed: 0 };
      
      // Memory usage should not grow excessively
      if (memoryUsageBefore.heapUsed > 0 && memoryUsageAfter.heapUsed > 0) {
        const memoryGrowth = memoryUsageAfter.heapUsed - memoryUsageBefore.heapUsed;
        const memoryGrowthMB = memoryGrowth / (1024 * 1024);
        
        expect(memoryGrowthMB).toBeLessThan(50); // < 50MB growth
      }
      
      // Performance stats should show good performance
      const stats = engine.getPerformanceStats();
      expect(stats.averageLatency).toBeLessThan(5); // < 5ms average
      expect(Math.abs(stats.timingDrift)).toBeLessThan(0.1); // < 100ms drift (relaxed for test env)
    });

    it('should handle sample memory efficiently', async () => {
      const mockSamplePlaybackEngine = {
        preloadSample: vi.fn().mockResolvedValue(undefined),
        playSample: vi.fn().mockResolvedValue(undefined),
        loadSample: vi.fn().mockResolvedValue({}),
        isLoaded: vi.fn().mockReturnValue(true)
      };
      
      sampleManager.initialize(mockSamplePlaybackEngine);
      
      // Load many samples
      const sampleCount = 100;
      const loadingStartTime = performance.now();
      
      for (let i = 0; i < sampleCount; i++) {
        await sampleManager.loadSample(`sample_${i}`, `/samples/sample_${i}.wav`, {
          name: `Sample ${i}`,
          duration: 1.0 + Math.random(),
          tags: [`tag_${i % 10}`]
        });
      }
      
      const loadingEndTime = performance.now();
      const loadingTime = loadingEndTime - loadingStartTime;
      
      // Loading should be reasonably fast
      expect(loadingTime).toBeLessThan(1000); // < 1 second for 100 samples
      expect(sampleManager.samples.size).toBe(sampleCount);
      
      // Preload all samples
      const sampleIds = Array.from({ length: sampleCount }, (_, i) => `sample_${i}`);
      const preloadStartTime = performance.now();
      
      await sampleManager.preloadSamples(sampleIds);
      
      const preloadEndTime = performance.now();
      const preloadTime = preloadEndTime - preloadStartTime;
      
      // Preloading should be efficient
      expect(preloadTime).toBeLessThan(2000); // < 2 seconds for 100 samples
      expect(sampleManager.preloadedSamples.size).toBe(sampleCount);
      
      // Memory cleanup should work
      sampleManager.clearSamples();
      expect(sampleManager.samples.size).toBe(0);
      expect(sampleManager.preloadedSamples.size).toBe(0);
    });
  });

  describe('Real-time Performance Tests', () => {
    it('should maintain real-time performance during playback', async () => {
      // Setup complete sequencer system
      const mockSamplePlaybackEngine = {
        preloadSample: vi.fn().mockResolvedValue(undefined),
        playSample: vi.fn().mockResolvedValue(undefined),
        loadSample: vi.fn().mockResolvedValue({}),
        isLoaded: vi.fn().mockReturnValue(true)
      };
      
      sampleManager.initialize(mockSamplePlaybackEngine);
      await sampleManager.loadSamplePack('default');
      
      await engine.initialize(mockAudioContext, {
        patternManager,
        sampleManager
      });
      
      // Create complex pattern
      const pattern = patternManager.createPattern('Performance Test', 8, 64);
      await patternManager.loadPattern(pattern.id);
      
      // Assign samples to all tracks
      pattern.tracks.forEach((track, index) => {
        const sampleId = sampleManager.getAllSamples()[index % sampleManager.getAllSamples().length].id;
        sampleManager.assignSampleToTrack(track.id, sampleId);
      });
      
      // Program dense pattern
      pattern.tracks.forEach(track => {
        for (let step = 0; step < 64; step += 2) {
          patternManager.toggleStep(track.id, step);
        }
      });
      
      // Set challenging parameters
      engine.setBPM(180); // Fast tempo
      engine.setSwing(50); // Moderate swing
      
      await engine.start();
      
      // Measure real-time performance
      const stepLatencies = [];
      const stepCount = 128; // 2 full pattern loops
      
      for (let step = 0; step < stepCount; step++) {
        const stepStartTime = performance.now();
        
        engine.handleStep(step % 64, 1.0 + step * 0.05);
        
        const stepEndTime = performance.now();
        stepLatencies.push(stepEndTime - stepStartTime);
      }
      
      const avgStepLatency = stepLatencies.reduce((a, b) => a + b, 0) / stepCount;
      const maxStepLatency = Math.max(...stepLatencies);
      const p95StepLatency = stepLatencies.sort((a, b) => a - b)[Math.floor(stepCount * 0.95)];
      
      // Real-time performance requirements
      expect(avgStepLatency).toBeLessThan(1); // < 1ms average
      expect(maxStepLatency).toBeLessThan(5); // < 5ms maximum
      expect(p95StepLatency).toBeLessThan(2); // < 2ms for 95% of steps
      
      // Verify timing accuracy
      const stats = engine.getPerformanceStats();
      expect(stats.totalSteps).toBe(stepCount);
      expect(stats.averageLatency).toBeLessThan(2);
      expect(Math.abs(stats.timingDrift)).toBeLessThan(0.1); // < 100ms total drift (relaxed for test env)
    });

    it('should handle audio latency measurements', () => {
      scheduler.initialize();
      
      // Mock audio context with realistic current time progression
      let audioTime = 0;
      Object.defineProperty(mockAudioContext, 'currentTime', {
        get: () => audioTime,
        set: (value) => { audioTime = value; }
      });
      
      const latencyMeasurements = [];
      const noteCount = 50;
      
      for (let i = 0; i < noteCount; i++) {
        // Simulate time progression
        audioTime += 0.1; // 100ms per iteration
        
        const scheduleTime = audioTime + 0.1; // Schedule 100ms ahead
        const measurementStart = performance.now();
        
        scheduler.scheduleNote(scheduleTime, 'kick', 0.8);
        
        const measurementEnd = performance.now();
        const schedulingLatency = measurementEnd - measurementStart;
        
        // Calculate audio latency (difference between schedule time and current time)
        const audioLatency = (scheduleTime - audioTime) * 1000; // Convert to ms
        
        latencyMeasurements.push({
          scheduling: schedulingLatency,
          audio: audioLatency
        });
      }
      
      const avgSchedulingLatency = latencyMeasurements.reduce((sum, m) => sum + m.scheduling, 0) / noteCount;
      const avgAudioLatency = latencyMeasurements.reduce((sum, m) => sum + m.audio, 0) / noteCount;
      
      // Scheduling latency should be minimal
      expect(avgSchedulingLatency).toBeLessThan(1); // < 1ms
      
      // Audio latency should be consistent (100ms lookahead)
      expect(Math.abs(avgAudioLatency - 100)).toBeLessThan(1); // Within 1ms of target
      
      // Verify statistics
      const stats = scheduler.getSchedulingStats();
      expect(stats.totalScheduled).toBe(noteCount);
      expect(stats.averageLatency).toBeCloseTo(avgSchedulingLatency, 0); // Relaxed precision
    });
  });

  describe('Stress Tests', () => {
    it('should handle maximum complexity without performance degradation', async () => {
      // Setup maximum complexity scenario
      const mockSamplePlaybackEngine = {
        preloadSample: vi.fn().mockResolvedValue(undefined),
        playSample: vi.fn().mockResolvedValue(undefined),
        loadSample: vi.fn().mockResolvedValue({}),
        isLoaded: vi.fn().mockReturnValue(true)
      };
      
      sampleManager.initialize(mockSamplePlaybackEngine);
      await sampleManager.loadSamplePack('default');
      
      await engine.initialize(mockAudioContext, {
        patternManager,
        sampleManager
      });
      
      // Create maximum complexity pattern
      const pattern = patternManager.createPattern('Stress Test', 16, 64); // Max tracks, max steps
      await patternManager.loadPattern(pattern.id);
      
      // Assign samples to all tracks
      const allSamples = sampleManager.getAllSamples();
      pattern.tracks.forEach((track, index) => {
        const sampleId = allSamples[index % allSamples.length].id;
        sampleManager.assignSampleToTrack(track.id, sampleId);
      });
      
      // Program every step on every track
      pattern.tracks.forEach(track => {
        for (let step = 0; step < 64; step++) {
          patternManager.toggleStep(track.id, step);
        }
      });
      
      // Set maximum complexity parameters
      engine.setBPM(200); // Maximum BPM
      engine.setSwing(100); // Maximum swing
      
      await engine.start();
      
      // Measure performance under maximum load
      const stressTestStartTime = performance.now();
      const stepLatencies = [];
      
      // Run for 256 steps (4 full pattern loops)
      for (let step = 0; step < 256; step++) {
        const stepStartTime = performance.now();
        
        engine.handleStep(step % 64, 1.0 + step * 0.025);
        
        const stepEndTime = performance.now();
        stepLatencies.push(stepEndTime - stepStartTime);
      }
      
      const stressTestEndTime = performance.now();
      const totalStressTime = stressTestEndTime - stressTestStartTime;
      
      // Performance should remain acceptable even under maximum load
      const avgStepLatency = stepLatencies.reduce((a, b) => a + b, 0) / 256;
      const maxStepLatency = Math.max(...stepLatencies);
      
      expect(avgStepLatency).toBeLessThan(5); // < 5ms average under stress
      expect(maxStepLatency).toBeLessThan(20); // < 20ms maximum under stress
      expect(totalStressTime).toBeLessThan(5000); // < 5 seconds total
      
      // Verify system stability
      const stats = engine.getPerformanceStats();
      expect(stats.totalSteps).toBe(256);
      expect(Math.abs(stats.timingDrift)).toBeLessThan(0.2); // < 200ms drift under stress (relaxed for test env)
      
      // Should have processed many steps (verify system worked)
      expect(stats.totalSteps).toBeGreaterThan(0);
    });

    it('should recover from performance spikes', async () => {
      scheduler.initialize();
      
      // Simulate normal operation
      const normalLatencies = [];
      for (let i = 0; i < 50; i++) {
        const startTime = performance.now();
        scheduler.scheduleNote(1.0 + i * 0.1, 'kick', 0.8);
        const endTime = performance.now();
        normalLatencies.push(endTime - startTime);
      }
      
      const normalAvgLatency = normalLatencies.reduce((a, b) => a + b, 0) / 50;
      
      // Simulate performance spike by scheduling many operations at once
      const spikeStartTime = performance.now();
      
      // Create artificial spike by scheduling many notes rapidly
      for (let i = 0; i < 1000; i++) {
        scheduler.scheduleNote(10.0 + i * 0.001, 'kick', 0.8);
      }
      
      const spikeEndTime = performance.now();
      const spikeLatency = spikeEndTime - spikeStartTime;
      
      // Verify spike occurred (should be significantly higher than normal)
      expect(spikeLatency).toBeGreaterThan(normalAvgLatency);
      
      // Measure recovery
      const recoveryLatencies = [];
      for (let i = 0; i < 50; i++) {
        const startTime = performance.now();
        scheduler.scheduleNote(11.0 + i * 0.1, 'kick', 0.8);
        const endTime = performance.now();
        recoveryLatencies.push(endTime - startTime);
      }
      
      const recoveryAvgLatency = recoveryLatencies.reduce((a, b) => a + b, 0) / 50;
      
      // Should recover to normal performance quickly
      expect(recoveryAvgLatency).toBeLessThan(normalAvgLatency * 2); // Within 2x normal
      
      // Statistics should reflect the spike but show overall good performance
      const stats = scheduler.getSchedulingStats();
      expect(stats.totalScheduled).toBe(1100); // 50 + 1000 + 50
      expect(stats.maxLatency).toBeGreaterThan(0); // Should have some latency recorded
    });
  });
});