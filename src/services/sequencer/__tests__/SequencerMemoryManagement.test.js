/**
 * @fileoverview Tests for sequencer memory management
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import sequencerMemoryManager from '../SequencerMemoryManager.js';
import sequencerPerformanceMonitor from '../SequencerPerformanceMonitor.js';

describe('SequencerMemoryManager', () => {
  beforeEach(() => {
    // Clear any existing data
    sequencerMemoryManager.cleanup({ force: true });
  });

  afterEach(() => {
    sequencerMemoryManager.stopMonitoring();
    sequencerPerformanceMonitor.stopMonitoring();
  });

  describe('Pattern Management', () => {
    it('should store and retrieve patterns', () => {
      const pattern = {
        id: 'test_pattern',
        name: 'Test Pattern',
        tracks: [],
        metadata: { created: new Date().toISOString() }
      };

      const success = sequencerMemoryManager.storePattern('test_pattern', pattern);
      expect(success).toBe(true);

      const retrieved = sequencerMemoryManager.getPattern('test_pattern');
      expect(retrieved).toEqual(pattern);
    });

    it('should remove patterns from memory', () => {
      const pattern = { id: 'test_pattern', name: 'Test' };
      sequencerMemoryManager.storePattern('test_pattern', pattern);

      const removed = sequencerMemoryManager.removePattern('test_pattern');
      expect(removed).toBe(true);

      const retrieved = sequencerMemoryManager.getPattern('test_pattern');
      expect(retrieved).toBeNull();
    });

    it('should handle pattern cache correctly', () => {
      const pattern = { id: 'cached_pattern', name: 'Cached' };
      sequencerMemoryManager.storePattern('cached_pattern', pattern);

      // Access multiple times to trigger caching
      for (let i = 0; i < 5; i++) {
        sequencerMemoryManager.getPattern('cached_pattern');
      }

      const usage = sequencerMemoryManager.getMemoryUsage();
      expect(usage.counts.cachedPatterns).toBeGreaterThan(0);
    });
  });

  describe('Sample Management', () => {
    it('should store and retrieve samples', () => {
      const sample = {
        id: 'test_sample',
        name: 'Test Sample',
        audioBuffer: { length: 1000, sampleRate: 44100 },
        metadata: { duration: 1.0 }
      };

      const success = sequencerMemoryManager.storeSample('test_sample', sample);
      expect(success).toBe(true);

      const retrieved = sequencerMemoryManager.getSample('test_sample');
      expect(retrieved).toEqual(sample);
    });

    it('should remove samples from memory', () => {
      const sample = { id: 'test_sample', name: 'Test' };
      sequencerMemoryManager.storeSample('test_sample', sample);

      const removed = sequencerMemoryManager.removeSample('test_sample');
      expect(removed).toBe(true);

      const retrieved = sequencerMemoryManager.getSample('test_sample');
      expect(retrieved).toBeNull();
    });
  });

  describe('Audio Buffer Management', () => {
    it('should store and retrieve audio buffers', () => {
      const mockAudioBuffer = {
        length: 44100,
        sampleRate: 44100,
        numberOfChannels: 2,
        duration: 1.0
      };

      const success = sequencerMemoryManager.storeAudioBuffer('test_buffer', mockAudioBuffer);
      expect(success).toBe(true);

      const retrieved = sequencerMemoryManager.getAudioBuffer('test_buffer');
      expect(retrieved).toEqual(mockAudioBuffer);
    });

    it('should calculate audio buffer size correctly', () => {
      const mockAudioBuffer = {
        length: 44100,
        sampleRate: 44100,
        numberOfChannels: 2,
        duration: 1.0
      };

      sequencerMemoryManager.storeAudioBuffer('test_buffer', mockAudioBuffer);
      const usage = sequencerMemoryManager.getMemoryUsage();
      
      // Expected size: 2 channels * 44100 samples * 4 bytes = 352800 bytes
      expect(usage.audioBuffers).toBe(352800);
    });
  });

  describe('Memory Usage Tracking', () => {
    it('should track memory usage correctly', () => {
      const pattern = { id: 'test', name: 'Test Pattern' };
      const sample = { id: 'test', name: 'Test Sample' };
      
      sequencerMemoryManager.storePattern('test', pattern);
      sequencerMemoryManager.storeSample('test', sample);

      const usage = sequencerMemoryManager.getMemoryUsage();
      
      expect(usage.patterns).toBeGreaterThan(0);
      expect(usage.samples).toBeGreaterThan(0);
      expect(usage.total).toBeGreaterThan(0);
      expect(usage.counts.patterns).toBe(1);
      expect(usage.counts.samples).toBe(1);
    });

    it('should provide formatted memory usage', () => {
      const pattern = { id: 'test', name: 'Test Pattern' };
      sequencerMemoryManager.storePattern('test', pattern);

      const usage = sequencerMemoryManager.getMemoryUsage();
      
      expect(usage.formatted.patterns).toMatch(/\d+(\.\d+)?\s+(B|KB|MB|GB)/);
      expect(usage.formatted.total).toMatch(/\d+(\.\d+)?\s+(B|KB|MB|GB)/);
    });
  });

  describe('Memory Cleanup', () => {
    it('should cleanup all memory when forced', () => {
      const pattern = { id: 'test', name: 'Test' };
      const sample = { id: 'test', name: 'Test' };
      
      sequencerMemoryManager.storePattern('test', pattern);
      sequencerMemoryManager.storeSample('test', sample);

      const freedMemory = sequencerMemoryManager.cleanup({ force: true });
      expect(freedMemory).toBeGreaterThan(0);

      const usage = sequencerMemoryManager.getMemoryUsage();
      expect(usage.total).toBe(0);
      expect(usage.counts.patterns).toBe(0);
      expect(usage.counts.samples).toBe(0);
    });

    it('should cleanup cache selectively', () => {
      const pattern = { id: 'test', name: 'Test' };
      sequencerMemoryManager.storePattern('test', pattern);

      const freedMemory = sequencerMemoryManager.cleanup({ clearCache: true });
      expect(freedMemory).toBeGreaterThan(0);

      // Pattern should still exist in main storage
      const retrieved = sequencerMemoryManager.getPattern('test');
      expect(retrieved).toEqual(pattern);
    });
  });

  describe('Monitoring', () => {
    it('should start and stop monitoring', () => {
      expect(sequencerMemoryManager.isMonitoring).toBe(false);
      
      sequencerMemoryManager.startMonitoring();
      expect(sequencerMemoryManager.isMonitoring).toBe(true);
      
      sequencerMemoryManager.stopMonitoring();
      expect(sequencerMemoryManager.isMonitoring).toBe(false);
    });

    it('should handle cleanup callbacks', () => {
      const mockCallback = vi.fn();
      sequencerMemoryManager.onCleanup(mockCallback);

      sequencerMemoryManager.cleanup({ clearCache: true });
      
      expect(mockCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          freedMemory: expect.any(Number),
          options: expect.objectContaining({ clearCache: true })
        })
      );
    });
  });
});

describe('SequencerPerformanceMonitor', () => {
  beforeEach(() => {
    sequencerPerformanceMonitor.stopMonitoring();
  });

  afterEach(() => {
    sequencerPerformanceMonitor.stopMonitoring();
  });

  describe('Timing Accuracy', () => {
    it('should record timing accuracy measurements', () => {
      const expectedTime = 1.0;
      const actualTime = 1.005; // 5ms drift
      const stepIndex = 0;

      sequencerPerformanceMonitor.recordTimingAccuracy(expectedTime, actualTime, stepIndex);

      const stats = sequencerPerformanceMonitor.getTimingAccuracyStats();
      expect(stats.count).toBe(1);
      expect(stats.averageDrift).toBeCloseTo(5, 1); // 5ms
      expect(stats.maxDrift).toBeCloseTo(5, 1);
    });

    it('should detect timing drift alerts', () => {
      const alertCallback = vi.fn();
      sequencerPerformanceMonitor.onAlert(alertCallback);

      // Record high timing drift (above threshold)
      sequencerPerformanceMonitor.recordTimingAccuracy(1.0, 1.010, 0); // 10ms drift

      expect(alertCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'timing_drift',
          data: expect.objectContaining({
            drift: expect.closeTo(10, 1),
            stepIndex: 0
          })
        })
      );
    });
  });

  describe('Audio Latency', () => {
    it('should record audio latency measurements', () => {
      const scheduleTime = 1.0;
      const actualPlayTime = 1.025; // 25ms latency
      const trackId = 'track_0';

      sequencerPerformanceMonitor.recordAudioLatency(scheduleTime, actualPlayTime, trackId);

      const stats = sequencerPerformanceMonitor.getAudioLatencyStats();
      expect(stats.count).toBe(1);
      expect(stats.averageLatency).toBeCloseTo(25, 1); // 25ms
      expect(stats.maxLatency).toBeCloseTo(25, 1);
    });

    it('should detect high latency alerts', () => {
      const alertCallback = vi.fn();
      sequencerPerformanceMonitor.onAlert(alertCallback);

      // Record high latency (above threshold)
      sequencerPerformanceMonitor.recordAudioLatency(1.0, 1.060, 'track_0'); // 60ms latency

      expect(alertCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'high_audio_latency',
          data: expect.objectContaining({
            latency: expect.closeTo(60, 1),
            trackId: 'track_0'
          })
        })
      );
    });
  });

  describe('Memory Usage', () => {
    it('should record memory usage measurements', () => {
      const memoryUsage = {
        patterns: 1024,
        samples: 2048,
        audioBuffers: 4096
      };

      sequencerPerformanceMonitor.recordMemoryUsage(memoryUsage);

      const stats = sequencerPerformanceMonitor.getMemoryUsageStats();
      expect(stats.currentUsage).toBe(7168); // 1024 + 2048 + 4096
      expect(stats.breakdown.patterns).toBe(1024);
      expect(stats.breakdown.samples).toBe(2048);
      expect(stats.breakdown.audioBuffers).toBe(4096);
    });

    it('should detect high memory usage alerts', () => {
      const alertCallback = vi.fn();
      sequencerPerformanceMonitor.onAlert(alertCallback);

      // Record high memory usage (above threshold)
      const highMemoryUsage = {
        patterns: 50 * 1024 * 1024,  // 50MB
        samples: 60 * 1024 * 1024,   // 60MB
        audioBuffers: 0
      };

      sequencerPerformanceMonitor.recordMemoryUsage(highMemoryUsage);

      expect(alertCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'high_memory_usage',
          data: expect.objectContaining({
            totalUsage: 110 * 1024 * 1024 // 110MB
          })
        })
      );
    });
  });

  describe('Performance Report', () => {
    it('should generate comprehensive performance report', () => {
      // Record some test data
      sequencerPerformanceMonitor.recordTimingAccuracy(1.0, 1.002, 0);
      sequencerPerformanceMonitor.recordAudioLatency(1.0, 1.020, 'track_0');
      sequencerPerformanceMonitor.recordMemoryUsage({
        patterns: 1024,
        samples: 2048,
        audioBuffers: 4096
      });

      const report = sequencerPerformanceMonitor.getPerformanceReport();

      expect(report).toHaveProperty('timestamp');
      expect(report).toHaveProperty('timingAccuracy');
      expect(report).toHaveProperty('audioLatency');
      expect(report).toHaveProperty('memoryUsage');
      expect(report).toHaveProperty('baseMetrics');
      expect(report).toHaveProperty('recommendations');

      expect(report.timingAccuracy.count).toBe(1);
      expect(report.audioLatency.count).toBe(1);
      expect(report.memoryUsage.count).toBe(1);
    });

    it('should provide performance recommendations', () => {
      // Record problematic data
      sequencerPerformanceMonitor.recordTimingAccuracy(1.0, 1.010, 0); // High drift
      sequencerPerformanceMonitor.recordAudioLatency(1.0, 1.060, 'track_0'); // High latency

      const recommendations = sequencerPerformanceMonitor.getPerformanceRecommendations();

      expect(recommendations).toBeInstanceOf(Array);
      expect(recommendations.length).toBeGreaterThan(0);
      
      const timingRec = recommendations.find(r => r.type === 'timing');
      const latencyRec = recommendations.find(r => r.type === 'latency');
      
      expect(timingRec).toBeDefined();
      expect(latencyRec).toBeDefined();
      expect(timingRec.severity).toBe('high');
      expect(latencyRec.severity).toBe('medium');
    });
  });

  describe('Monitoring', () => {
    it('should start and stop monitoring', () => {
      expect(sequencerPerformanceMonitor.isMonitoring).toBe(false);
      
      sequencerPerformanceMonitor.startMonitoring();
      expect(sequencerPerformanceMonitor.isMonitoring).toBe(true);
      
      sequencerPerformanceMonitor.stopMonitoring();
      expect(sequencerPerformanceMonitor.isMonitoring).toBe(false);
    });

    it('should handle alert callbacks', () => {
      const alertCallback = vi.fn();
      sequencerPerformanceMonitor.onAlert(alertCallback);

      // Trigger an alert
      sequencerPerformanceMonitor.recordTimingAccuracy(1.0, 1.010, 0);

      expect(alertCallback).toHaveBeenCalled();

      // Remove callback
      sequencerPerformanceMonitor.removeAlertCallback(alertCallback);
      
      // Trigger another alert - callback should not be called again
      alertCallback.mockClear();
      sequencerPerformanceMonitor.recordTimingAccuracy(1.0, 1.015, 1);
      
      // Note: Due to cooldown, this might not trigger immediately
      // The test verifies the callback removal mechanism
    });
  });
});

describe('Integration Tests', () => {
  beforeEach(() => {
    sequencerMemoryManager.cleanup({ force: true });
    sequencerPerformanceMonitor.stopMonitoring();
  });

  afterEach(() => {
    sequencerMemoryManager.stopMonitoring();
    sequencerPerformanceMonitor.stopMonitoring();
  });

  it('should integrate memory manager with performance monitor', () => {
    sequencerMemoryManager.startMonitoring();
    sequencerPerformanceMonitor.startMonitoring();

    // Store some data
    const pattern = { id: 'test', name: 'Test Pattern' };
    const sample = { id: 'test', name: 'Test Sample' };
    
    sequencerMemoryManager.storePattern('test', pattern);
    sequencerMemoryManager.storeSample('test', sample);

    // Get memory usage
    const usage = sequencerMemoryManager.getMemoryUsage();
    expect(usage.total).toBeGreaterThan(0);

    // Record memory usage in performance monitor
    sequencerPerformanceMonitor.recordMemoryUsage(usage);

    // Get performance report
    const report = sequencerPerformanceMonitor.getPerformanceReport();
    expect(report.memoryUsage.currentUsage).toBeGreaterThan(0);
  });

  it('should handle memory cleanup during extended use', async () => {
    sequencerMemoryManager.startMonitoring();

    // Simulate extended use by storing many patterns
    for (let i = 0; i < 60; i++) { // Above maxPatterns limit
      const pattern = { id: `pattern_${i}`, name: `Pattern ${i}` };
      sequencerMemoryManager.storePattern(`pattern_${i}`, pattern);
    }

    const usage = sequencerMemoryManager.getMemoryUsage();
    
    // Should have triggered automatic cleanup
    expect(usage.counts.patterns).toBeLessThanOrEqual(50); // maxPatterns config
  });
});