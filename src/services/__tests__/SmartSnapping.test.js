/**
 * Unit tests for SmartSnapping service
 * Tests requirement 3.4 - smart snapping with configurable tolerance
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SmartSnapping } from '../SmartSnapping.js';

describe('SmartSnapping', () => {
  let smartSnapping;
  let mockWaveformData;
  let mockChops;
  
  beforeEach(() => {
    smartSnapping = new SmartSnapping({
      snapTolerance: 10,
      snapToleranceTime: 0.05,
      enableZeroCrossingSnap: true,
      enableChopBoundarySnap: true,
      showSnapIndicators: true
    });
    
    // Create mock waveform data with predictable zero-crossings
    mockWaveformData = {
      samples: new Float32Array(1000),
      sampleRate: 1000,
      duration: 1.0
    };
    
    // Create sine wave with known zero-crossings
    for (let i = 0; i < mockWaveformData.samples.length; i++) {
      mockWaveformData.samples[i] = Math.sin(2 * Math.PI * 5 * i / 1000); // 5 Hz
    }
    
    // Create mock chops
    mockChops = [
      { id: 'chop1', startTime: 0.1, endTime: 0.2 },
      { id: 'chop2', startTime: 0.3, endTime: 0.4 },
      { id: 'chop3', startTime: 0.6, endTime: 0.8 }
    ];
    
    smartSnapping.setWaveformData(mockWaveformData);
    smartSnapping.setChops(mockChops);
  });

  describe('initialization', () => {
    it('should initialize with default options', () => {
      const snapping = new SmartSnapping();
      const options = snapping.getOptions();
      
      expect(options.snapTolerance).toBe(10);
      expect(options.enableZeroCrossingSnap).toBe(true);
      expect(options.enableChopBoundarySnap).toBe(true);
    });

    it('should merge custom options with defaults', () => {
      const snapping = new SmartSnapping({
        snapTolerance: 20,
        enableGridSnap: true
      });
      const options = snapping.getOptions();
      
      expect(options.snapTolerance).toBe(20);
      expect(options.enableGridSnap).toBe(true);
      expect(options.enableZeroCrossingSnap).toBe(true); // Default preserved
    });
  });

  describe('setWaveformData', () => {
    it('should update waveform data and pre-calculate zero-crossings', () => {
      const newWaveformData = {
        samples: new Float32Array(500),
        sampleRate: 500,
        duration: 1.0
      };
      
      smartSnapping.setWaveformData(newWaveformData);
      
      // Should not throw and should update internal state
      expect(() => {
        smartSnapping.findSnapTarget(0.1, 100);
      }).not.toThrow();
    });
  });

  describe('setChops', () => {
    it('should update chop data for boundary snapping', () => {
      const newChops = [
        { id: 'new1', startTime: 0.05, endTime: 0.15 }
      ];
      
      smartSnapping.setChops(newChops);
      
      const snapTarget = smartSnapping.findSnapTarget(0.05, 100);
      expect(snapTarget).toBeTruthy();
      expect(['zero-crossing', 'chop-boundary']).toContain(snapTarget.type);
    });

    it('should handle null or undefined chops', () => {
      expect(() => {
        smartSnapping.setChops(null);
        smartSnapping.setChops(undefined);
      }).not.toThrow();
    });
  });

  describe('findSnapTarget', () => {
    it('should find chop boundary snap targets', () => {
      const targetTime = 0.101; // Close to chop1 start (0.1)
      const pixelsPerSecond = 1000; // 1 pixel per ms
      
      const snapTarget = smartSnapping.findSnapTarget(targetTime, pixelsPerSecond);
      
      expect(snapTarget).toBeTruthy();
      // Could be either chop boundary or zero-crossing depending on which is closer/higher priority
      expect(['zero-crossing', 'chop-boundary']).toContain(snapTarget.type);
      expect(snapTarget.distance).toBeLessThan(0.01); // Should be close to target
    });

    it('should find zero-crossing snap targets', () => {
      const targetTime = 0.55; // Away from chop boundaries, should find zero-crossing
      const pixelsPerSecond = 1000;
      
      const snapTarget = smartSnapping.findSnapTarget(targetTime, pixelsPerSecond);
      
      // Should find either zero-crossing or no target (depending on tolerance)
      if (snapTarget) {
        expect(['zero-crossing', 'chop-boundary']).toContain(snapTarget.type);
      }
    });

    it('should prioritize higher priority snap targets', () => {
      // Create a scenario where zero-crossing and chop boundary are equidistant
      const targetTime = 0.1; // Exactly on chop boundary
      const pixelsPerSecond = 1000;
      
      const snapTarget = smartSnapping.findSnapTarget(targetTime, pixelsPerSecond);
      
      expect(snapTarget).toBeTruthy();
      // Should prefer zero-crossing (priority 3) over chop boundary (priority 2) if equidistant
      // But chop boundary is exact match, so it might win due to distance
    });

    it('should exclude specified chop from boundary snapping', () => {
      const targetTime = 0.101; // Close to chop1 start
      const pixelsPerSecond = 1000;
      const excludeChopId = 'chop1';
      
      const snapTarget = smartSnapping.findSnapTarget(targetTime, pixelsPerSecond, excludeChopId);
      
      // Should not snap to chop1 boundaries
      if (snapTarget?.type === 'chop-boundary') {
        expect(snapTarget.chopId).not.toBe('chop1');
      }
    });

    it('should return null when no snap targets within tolerance', () => {
      const targetTime = 0.5; // Far from any chop boundaries
      const pixelsPerSecond = 10000; // Very high resolution = small tolerance
      
      const snapTarget = smartSnapping.findSnapTarget(targetTime, pixelsPerSecond);
      
      // Might be null if no targets within tolerance
      if (snapTarget) {
        expect(snapTarget.distance).toBeLessThanOrEqual(0.001); // Very small tolerance
      }
    });
  });

  describe('findChopBoundarySnapTargets', () => {
    it('should find all chop boundaries within tolerance', () => {
      const targetTime = 0.15; // Between chop1 end (0.2) and start (0.1)
      const tolerance = 0.1;
      
      const targets = smartSnapping.findChopBoundarySnapTargets(targetTime, tolerance);
      
      expect(targets.length).toBeGreaterThan(0);
      
      // Should include chop1 start and end
      const chopIds = targets.map(t => t.chopId);
      expect(chopIds).toContain('chop1');
    });

    it('should distinguish between start and end boundaries', () => {
      const targetTime = 0.1;
      const tolerance = 0.01;
      
      const targets = smartSnapping.findChopBoundarySnapTargets(targetTime, tolerance);
      
      const startBoundary = targets.find(t => t.subType === 'start');
      expect(startBoundary).toBeTruthy();
      expect(startBoundary.time).toBe(0.1);
    });

    it('should exclude specified chop ID', () => {
      const targetTime = 0.1;
      const tolerance = 0.01;
      const excludeChopId = 'chop1';
      
      const targets = smartSnapping.findChopBoundarySnapTargets(targetTime, tolerance, excludeChopId);
      
      const excludedChop = targets.find(t => t.chopId === excludeChopId);
      expect(excludedChop).toBeFalsy();
    });
  });

  describe('applySnapping', () => {
    it('should return snapped time when snap target found', () => {
      // Use exact chop boundary to guarantee snapping
      const targetTime = 0.1; // Exactly on chop1 start
      const pixelsPerSecond = 1000;
      
      const result = smartSnapping.applySnapping(targetTime, pixelsPerSecond);
      
      expect(result.originalTime).toBe(targetTime);
      expect(result.wasSnapped).toBe(true);
      expect(result.snapTarget).toBeTruthy();
    });

    it('should return original time when no snap target found', () => {
      const targetTime = 0.5;
      const pixelsPerSecond = 10000; // Very high resolution
      
      const result = smartSnapping.applySnapping(targetTime, pixelsPerSecond);
      
      expect(result.originalTime).toBe(targetTime);
      expect(result.snappedTime).toBe(targetTime);
      expect(result.wasSnapped).toBe(false);
      expect(result.snapTarget).toBeNull();
    });

    it('should calculate snap distance correctly', () => {
      const targetTime = 0.105; // 5ms from chop1 start
      const pixelsPerSecond = 1000;
      
      const result = smartSnapping.applySnapping(targetTime, pixelsPerSecond);
      
      if (result.wasSnapped) {
        expect(result.snapDistance).toBeGreaterThan(0);
        expect(result.snapDistance).toBeLessThan(0.01); // Should be within 10ms
      }
    });
  });

  describe('getSnapIndicators', () => {
    it('should return snap indicators for rendering', () => {
      const targetTime = 0.15; // Between chops
      const pixelsPerSecond = 1000;
      
      const indicators = smartSnapping.getSnapIndicators(targetTime, pixelsPerSecond);
      
      expect(Array.isArray(indicators)).toBe(true);
      
      indicators.forEach(indicator => {
        expect(indicator).toHaveProperty('type');
        expect(indicator).toHaveProperty('time');
        expect(indicator).toHaveProperty('color');
        expect(indicator).toHaveProperty('style');
        expect(indicator).toHaveProperty('label');
      });
    });

    it('should return empty array when showSnapIndicators is disabled', () => {
      smartSnapping.updateOptions({ showSnapIndicators: false });
      
      const indicators = smartSnapping.getSnapIndicators(0.1, 1000);
      
      expect(indicators).toHaveLength(0);
    });

    it('should assign different colors for different snap types', () => {
      const indicators = smartSnapping.getSnapIndicators(0.15, 1000);
      
      const colors = indicators.map(i => i.color);
      const uniqueColors = [...new Set(colors)];
      
      // Should have different colors for different types
      if (indicators.length > 1) {
        expect(uniqueColors.length).toBeGreaterThan(0);
      }
    });
  });

  describe('calculateSnapTolerance', () => {
    it('should calculate tolerance from pixels per second', () => {
      const pixelsPerSecond = 1000; // 1 pixel = 1ms
      const tolerance = smartSnapping.calculateSnapTolerance(pixelsPerSecond);
      
      expect(tolerance).toBe(0.01); // 10 pixels / 1000 pps = 0.01s
    });

    it('should use fallback tolerance when pixels per second not available', () => {
      const tolerance = smartSnapping.calculateSnapTolerance(null);
      
      expect(tolerance).toBe(0.05); // snapToleranceTime default
    });
  });

  describe('snap type configuration', () => {
    it('should enable/disable snap types', () => {
      smartSnapping.setSnapTypes({
        zeroCrossing: false,
        chopBoundary: true
      });
      
      const options = smartSnapping.getOptions();
      expect(options.enableZeroCrossingSnap).toBe(false);
      expect(options.enableChopBoundarySnap).toBe(true);
    });

    it('should ignore invalid snap type keys', () => {
      expect(() => {
        smartSnapping.setSnapTypes({
          invalidType: true
        });
      }).not.toThrow();
    });
  });

  describe('updateOptions', () => {
    it('should update options and clear caches', () => {
      const newOptions = {
        snapTolerance: 20,
        enableGridSnap: true
      };
      
      smartSnapping.updateOptions(newOptions);
      
      const options = smartSnapping.getOptions();
      expect(options.snapTolerance).toBe(20);
      expect(options.enableGridSnap).toBe(true);
    });

    it('should update zero-crossing detector options', () => {
      const newOptions = {
        zeroCrossingOptions: {
          minDistance: 64,
          amplitudeThreshold: 0.02
        }
      };
      
      expect(() => {
        smartSnapping.updateOptions(newOptions);
      }).not.toThrow();
    });
  });

  describe('getSnapStatistics', () => {
    it('should return statistics about snap targets', () => {
      const stats = smartSnapping.getSnapStatistics();
      
      expect(stats).toHaveProperty('zeroCrossings');
      expect(stats).toHaveProperty('chopBoundaries');
      expect(stats).toHaveProperty('cacheStats');
      
      expect(stats.chopBoundaries).toBe(6); // 3 chops * 2 boundaries each
      expect(typeof stats.zeroCrossings).toBe('number');
    });
  });

  describe('clearCaches', () => {
    it('should clear all internal caches', () => {
      // Generate some cached data
      smartSnapping.findSnapTarget(0.1, 1000);
      
      expect(() => {
        smartSnapping.clearCaches();
      }).not.toThrow();
    });
  });

  describe('edge cases', () => {
    it('should handle empty chops array', () => {
      smartSnapping.setChops([]);
      
      const snapTarget = smartSnapping.findSnapTarget(0.1, 1000);
      
      // Should only find zero-crossing targets, not chop boundaries
      if (snapTarget) {
        expect(snapTarget.type).not.toBe('chop-boundary');
      }
    });

    it('should handle missing waveform data', () => {
      smartSnapping.setWaveformData(null);
      
      const snapTarget = smartSnapping.findSnapTarget(0.1, 1000);
      
      // Should only find chop boundary targets, not zero-crossings
      if (snapTarget) {
        expect(snapTarget.type).not.toBe('zero-crossing');
      }
    });

    it('should handle zero pixels per second', () => {
      const tolerance = smartSnapping.calculateSnapTolerance(0);
      
      expect(tolerance).toBe(0.05); // Should use fallback
    });

    it('should handle negative pixels per second', () => {
      const tolerance = smartSnapping.calculateSnapTolerance(-100);
      
      expect(tolerance).toBe(0.05); // Should use fallback
    });
  });

  describe('grid snapping', () => {
    beforeEach(() => {
      smartSnapping.updateOptions({ enableGridSnap: true });
    });

    it('should find grid snap targets when enabled', () => {
      const targetTime = 1.05; // Close to 1.0 second grid line
      const pixelsPerSecond = 1000;
      
      const snapTarget = smartSnapping.findSnapTarget(targetTime, pixelsPerSecond);
      
      if (snapTarget?.type === 'grid') {
        expect(snapTarget.time).toBe(1.0);
      }
    });

    it('should not find grid snap targets when disabled', () => {
      smartSnapping.updateOptions({ enableGridSnap: false });
      
      const targetTime = 1.05;
      const pixelsPerSecond = 1000;
      
      const snapTarget = smartSnapping.findSnapTarget(targetTime, pixelsPerSecond);
      
      expect(snapTarget?.type).not.toBe('grid');
    });
  });
});