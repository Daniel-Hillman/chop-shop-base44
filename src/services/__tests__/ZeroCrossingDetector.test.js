/**
 * Unit tests for ZeroCrossingDetector
 * Tests requirement 3.3 - zero-crossing detection algorithm accuracy
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ZeroCrossingDetector } from '../ZeroCrossingDetector.js';

describe('ZeroCrossingDetector', () => {
  let detector;
  
  beforeEach(() => {
    detector = new ZeroCrossingDetector({
      minDistance: 4, // Smaller for testing
      amplitudeThreshold: 0.01,
      analysisWindow: 8,
      maxSearchDistance: 0.1
    });
  });

  describe('findZeroCrossings', () => {
    it('should detect zero-crossings in a simple sine wave', () => {
      // Create a simple sine wave with known zero-crossings
      const sampleRate = 1000;
      const frequency = 10; // 10 Hz
      const duration = 0.5; // 0.5 seconds
      const samples = new Float32Array(sampleRate * duration);
      
      for (let i = 0; i < samples.length; i++) {
        const time = i / sampleRate;
        samples[i] = Math.sin(2 * Math.PI * frequency * time);
      }
      
      const zeroCrossings = detector.findZeroCrossings(samples, sampleRate);
      
      // Should find approximately 2 * frequency * duration zero-crossings
      const expectedCount = 2 * frequency * duration;
      expect(zeroCrossings.length).toBeGreaterThan(expectedCount * 0.8);
      expect(zeroCrossings.length).toBeLessThan(expectedCount * 1.2);
      
      // Check that zero-crossings are properly spaced
      for (let i = 1; i < zeroCrossings.length; i++) {
        const timeDiff = zeroCrossings[i].time - zeroCrossings[i - 1].time;
        expect(timeDiff).toBeGreaterThan(0.01); // At least 10ms apart
      }
    });

    it('should not detect zero-crossings in DC signal', () => {
      const samples = new Float32Array(1000);
      samples.fill(0.5); // DC signal
      
      const zeroCrossings = detector.findZeroCrossings(samples, 1000);
      
      expect(zeroCrossings).toHaveLength(0);
    });

    it('should detect zero-crossings with correct timing', () => {
      // Create signal with known zero-crossings at specific times
      const sampleRate = 1000;
      const samples = new Float32Array(100);
      
      // Manually create zero-crossings at samples 25, 50, 75
      for (let i = 0; i < 25; i++) samples[i] = -0.1;
      for (let i = 25; i < 50; i++) samples[i] = 0.1;
      for (let i = 50; i < 75; i++) samples[i] = -0.1;
      for (let i = 75; i < 100; i++) samples[i] = 0.1;
      
      const zeroCrossings = detector.findZeroCrossings(samples, sampleRate);
      
      expect(zeroCrossings.length).toBeGreaterThan(0);
      
      // Check timing accuracy
      const expectedTimes = [25/1000, 50/1000, 75/1000];
      for (let i = 0; i < Math.min(zeroCrossings.length, expectedTimes.length); i++) {
        expect(zeroCrossings[i].time).toBeCloseTo(expectedTimes[i], 3);
      }
    });

    it('should respect minimum distance constraint', () => {
      const detector = new ZeroCrossingDetector({ minDistance: 50 });
      
      // Create signal with many rapid zero-crossings
      const samples = new Float32Array(1000);
      for (let i = 0; i < samples.length; i++) {
        samples[i] = Math.sin(i * 0.1); // High frequency
      }
      
      const zeroCrossings = detector.findZeroCrossings(samples, 1000);
      
      // Check minimum distance is respected
      for (let i = 1; i < zeroCrossings.length; i++) {
        const sampleDistance = zeroCrossings[i].sampleIndex - zeroCrossings[i - 1].sampleIndex;
        expect(sampleDistance).toBeGreaterThanOrEqual(50);
      }
    });

    it('should cache results for identical input', () => {
      const samples = new Float32Array(100);
      for (let i = 0; i < samples.length; i++) {
        samples[i] = Math.sin(i * 0.1);
      }
      
      const result1 = detector.findZeroCrossings(samples, 1000);
      const result2 = detector.findZeroCrossings(samples, 1000);
      
      expect(result1).toBe(result2); // Should be same reference (cached)
    });
  });

  describe('findNearestZeroCrossing', () => {
    let samples;
    const sampleRate = 1000;
    
    beforeEach(() => {
      // Create test signal with known zero-crossings
      samples = new Float32Array(1000);
      for (let i = 0; i < samples.length; i++) {
        samples[i] = Math.sin(2 * Math.PI * 5 * i / sampleRate); // 5 Hz sine wave
      }
    });

    it('should find nearest zero-crossing within tolerance', () => {
      const targetTime = 0.1; // 100ms
      const tolerance = 0.05; // 50ms
      
      const nearestCrossing = detector.findNearestZeroCrossing(samples, sampleRate, targetTime, tolerance);
      
      expect(nearestCrossing).toBeTruthy();
      expect(nearestCrossing.time).toBeCloseTo(targetTime, 1);
      expect(Math.abs(nearestCrossing.time - targetTime)).toBeLessThanOrEqual(tolerance);
    });

    it('should return null when no zero-crossing within tolerance', () => {
      const targetTime = 0.1;
      const tolerance = 0.001; // Very small tolerance
      
      const nearestCrossing = detector.findNearestZeroCrossing(samples, sampleRate, targetTime, tolerance);
      
      // Might be null if no crossing within 1ms
      if (nearestCrossing) {
        expect(Math.abs(nearestCrossing.time - targetTime)).toBeLessThanOrEqual(tolerance);
      }
    });

    it('should return the closest zero-crossing when multiple candidates exist', () => {
      const targetTime = 0.2;
      const tolerance = 0.1; // Large tolerance to include multiple crossings
      
      const nearestCrossing = detector.findNearestZeroCrossing(samples, sampleRate, targetTime, tolerance);
      
      expect(nearestCrossing).toBeTruthy();
      
      // Verify it's actually the nearest by checking all crossings
      const allCrossings = detector.findZeroCrossings(samples, sampleRate);
      const candidateCrossings = allCrossings.filter(c => 
        Math.abs(c.time - targetTime) <= tolerance
      );
      
      if (candidateCrossings.length > 1) {
        const distances = candidateCrossings.map(c => Math.abs(c.time - targetTime));
        const minDistance = Math.min(...distances);
        expect(Math.abs(nearestCrossing.time - targetTime)).toBeCloseTo(minDistance, 6);
      }
    });
  });

  describe('findOptimalCutPoints', () => {
    let samples;
    const sampleRate = 1000;
    
    beforeEach(() => {
      // Create test signal
      samples = new Float32Array(1000);
      for (let i = 0; i < samples.length; i++) {
        samples[i] = Math.sin(2 * Math.PI * 10 * i / sampleRate);
      }
    });

    it('should return optimized cut points when zero-crossings are available', () => {
      const startTime = 0.1;
      const endTime = 0.3;
      
      const result = detector.findOptimalCutPoints(samples, sampleRate, startTime, endTime);
      
      expect(result).toHaveProperty('originalStart', startTime);
      expect(result).toHaveProperty('originalEnd', endTime);
      expect(result).toHaveProperty('optimizedStart');
      expect(result).toHaveProperty('optimizedEnd');
      expect(result).toHaveProperty('quality');
      
      // Optimized points should be within reasonable range of originals
      expect(Math.abs(result.optimizedStart - startTime)).toBeLessThan(0.1);
      expect(Math.abs(result.optimizedEnd - endTime)).toBeLessThan(0.1);
    });

    it('should calculate improvement scores correctly', () => {
      const startTime = 0.05; // Likely not on zero-crossing
      const endTime = 0.15;
      
      const result = detector.findOptimalCutPoints(samples, sampleRate, startTime, endTime);
      
      expect(result.startImprovement).toBeGreaterThanOrEqual(0);
      expect(result.endImprovement).toBeGreaterThanOrEqual(0);
      expect(result.startImprovement).toBeLessThanOrEqual(1);
      expect(result.endImprovement).toBeLessThanOrEqual(1);
    });

    it('should assign quality ratings appropriately', () => {
      const startTime = 0.1;
      const endTime = 0.2;
      
      const result = detector.findOptimalCutPoints(samples, sampleRate, startTime, endTime);
      
      expect(['original', 'improved', 'good', 'excellent']).toContain(result.quality);
    });
  });

  describe('analyzeZeroCrossingQuality', () => {
    it('should analyze zero-crossing quality correctly', () => {
      // Create signal with a clear zero-crossing
      const samples = new Float32Array(20);
      for (let i = 0; i < 10; i++) samples[i] = -0.1;
      for (let i = 10; i < 20; i++) samples[i] = 0.1;
      
      const quality = detector.analyzeZeroCrossingQuality(samples, 10, 8, 0.01);
      
      expect(quality).toHaveProperty('isSignificant');
      expect(quality).toHaveProperty('score');
      expect(quality).toHaveProperty('rmsAmplitude');
      expect(quality).toHaveProperty('slope');
      
      expect(quality.isSignificant).toBe(true);
      expect(quality.score).toBeGreaterThan(0);
      expect(quality.score).toBeLessThanOrEqual(1);
    });

    it('should reject low-amplitude zero-crossings', () => {
      // Create signal with very low amplitude
      const samples = new Float32Array(20);
      for (let i = 0; i < 10; i++) samples[i] = -0.001;
      for (let i = 10; i < 20; i++) samples[i] = 0.001;
      
      const quality = detector.analyzeZeroCrossingQuality(samples, 10, 8, 0.01);
      
      expect(quality.isSignificant).toBe(false);
    });
  });

  describe('getZeroCrossingsInRange', () => {
    it('should return only zero-crossings within specified time range', () => {
      const samples = new Float32Array(1000);
      for (let i = 0; i < samples.length; i++) {
        samples[i] = Math.sin(2 * Math.PI * 10 * i / 1000);
      }
      
      const startTime = 0.1;
      const endTime = 0.3;
      
      const crossingsInRange = detector.getZeroCrossingsInRange(samples, 1000, startTime, endTime);
      
      for (const crossing of crossingsInRange) {
        expect(crossing.time).toBeGreaterThanOrEqual(startTime);
        expect(crossing.time).toBeLessThanOrEqual(endTime);
      }
    });
  });

  describe('cache management', () => {
    it('should clear cache when requested', () => {
      const samples = new Float32Array(100);
      for (let i = 0; i < samples.length; i++) {
        samples[i] = Math.sin(i * 0.1);
      }
      
      detector.findZeroCrossings(samples, 1000);
      expect(detector.getCacheStats().size).toBeGreaterThan(0);
      
      detector.clearCache();
      expect(detector.getCacheStats().size).toBe(0);
    });

    it('should clear cache when options are updated', () => {
      const samples = new Float32Array(100);
      for (let i = 0; i < samples.length; i++) {
        samples[i] = Math.sin(i * 0.1);
      }
      
      detector.findZeroCrossings(samples, 1000);
      expect(detector.getCacheStats().size).toBeGreaterThan(0);
      
      detector.updateOptions({ minDistance: 10 });
      expect(detector.getCacheStats().size).toBe(0);
    });
  });

  describe('edge cases', () => {
    it('should handle empty samples array', () => {
      const samples = new Float32Array(0);
      const zeroCrossings = detector.findZeroCrossings(samples, 1000);
      expect(zeroCrossings).toHaveLength(0);
    });

    it('should handle single sample', () => {
      const samples = new Float32Array([0.5]);
      const zeroCrossings = detector.findZeroCrossings(samples, 1000);
      expect(zeroCrossings).toHaveLength(0);
    });

    it('should handle samples at boundaries', () => {
      const samples = new Float32Array(1000);
      for (let i = 0; i < samples.length; i++) {
        samples[i] = Math.sin(2 * Math.PI * 5 * i / 1000);
      }
      
      // Test at start boundary
      const nearStart = detector.findNearestZeroCrossing(samples, 1000, 0, 0.1);
      expect(nearStart?.time).toBeGreaterThanOrEqual(0);
      
      // Test at end boundary
      const nearEnd = detector.findNearestZeroCrossing(samples, 1000, 0.999, 0.1);
      if (nearEnd) {
        expect(nearEnd.time).toBeLessThan(1.0);
      }
    });
  });
});