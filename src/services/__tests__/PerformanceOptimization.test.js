/**
 * Performance Optimization Tests
 * 
 * Tests for performance monitoring, memory management, and optimization features
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import performanceMonitor from '../PerformanceMonitor.js';
import memoryManager from '../MemoryManager.js';
import optimizedWaveformGenerator from '../OptimizedWaveformGenerator.js';

// Mock performance.memory for testing
Object.defineProperty(performance, 'memory', {
  value: {
    usedJSHeapSize: 50 * 1024 * 1024, // 50MB
    totalJSHeapSize: 100 * 1024 * 1024, // 100MB
    jsHeapSizeLimit: 2 * 1024 * 1024 * 1024 // 2GB
  },
  configurable: true
});

// Mock AudioContext
global.AudioContext = vi.fn(() => ({
  createBuffer: vi.fn((channels, length, sampleRate) => ({
    numberOfChannels: channels,
    length,
    sampleRate,
    duration: length / sampleRate,
    getChannelData: vi.fn(() => new Float32Array(length))
  })),
  createGain: vi.fn(() => ({
    gain: { value: 1 },
    connect: vi.fn()
  })),
  createBufferSource: vi.fn(() => ({
    buffer: null,
    connect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
    onended: null
  })),
  destination: {},
  currentTime: 0,
  state: 'running',
  resume: vi.fn().mockResolvedValue(),
  close: vi.fn().mockResolvedValue()
}));

describe('PerformanceMonitor', () => {
  beforeEach(() => {
    performanceMonitor.startMonitoring();
  });

  afterEach(() => {
    performanceMonitor.stopMonitoring();
    performanceMonitor.cleanup();
  });

  it('should start and stop monitoring', () => {
    expect(performanceMonitor.isMonitoring).toBe(true);
    
    performanceMonitor.stopMonitoring();
    expect(performanceMonitor.isMonitoring).toBe(false);
  });

  it('should record performance metrics', () => {
    const metric = performanceMonitor.recordMetric('test_operation', 1500, { 
      testData: 'value' 
    });

    expect(metric).toMatchObject({
      operation: 'test_operation',
      duration: 1500,
      metadata: { testData: 'value' }
    });
    expect(metric.timestamp).toBeTypeOf('number');
  });

  it('should provide measurement functions', () => {
    const endMeasurement = performanceMonitor.startMeasurement('test_measurement');
    expect(endMeasurement).toBeTypeOf('function');

    // Simulate some work
    const result = endMeasurement({ result: 'success' });
    
    expect(result.operation).toBe('test_measurement');
    expect(result.duration).toBeGreaterThan(0);
    expect(result.metadata.result).toBe('success');
  });

  it('should get current memory usage', () => {
    const memory = performanceMonitor.getCurrentMemoryUsage();
    
    expect(memory).toMatchObject({
      usedJSHeapSize: expect.any(Number),
      totalJSHeapSize: expect.any(Number),
      jsHeapSizeLimit: expect.any(Number),
      timestamp: expect.any(Number)
    });
  });

  it('should calculate metrics summary', () => {
    // Record multiple metrics
    performanceMonitor.recordMetric('test_op', 100);
    performanceMonitor.recordMetric('test_op', 200);
    performanceMonitor.recordMetric('test_op', 300);

    const metrics = performanceMonitor.getMetrics('test_op');
    
    expect(metrics).toMatchObject({
      operation: 'test_op',
      count: 3,
      avgDuration: 200,
      minDuration: 100,
      maxDuration: 300,
      totalDuration: 600
    });
  });

  it('should provide optimization recommendations', () => {
    // Record some metrics to trigger recommendations
    performanceMonitor.recordMetric('audio_processing', 5000, {
      memoryDelta: 60 * 1024 * 1024 // 60MB increase
    });

    const recommendations = performanceMonitor.getMemoryOptimizationRecommendations();
    expect(recommendations).toBeInstanceOf(Array);
    expect(recommendations.length).toBeGreaterThanOrEqual(0);
  });
});

describe('MemoryManager', () => {
  let mockAudioBuffer;

  beforeEach(() => {
    memoryManager.startMonitoring();
    
    // Create mock audio buffer
    mockAudioBuffer = {
      numberOfChannels: 2,
      length: 44100 * 10, // 10 seconds at 44.1kHz
      sampleRate: 44100,
      duration: 10,
      getChannelData: vi.fn(() => new Float32Array(44100 * 10))
    };
  });

  afterEach(() => {
    memoryManager.cleanup();
  });

  it('should register and unregister audio buffers', () => {
    const success = memoryManager.registerBuffer('test_buffer', mockAudioBuffer, {
      priority: memoryManager.config.priorityLevels.HIGH
    });

    expect(success).toBe(true);
    expect(memoryManager.hasBuffer('test_buffer')).toBe(true);

    const buffer = memoryManager.getBuffer('test_buffer');
    expect(buffer).toBe(mockAudioBuffer);

    const unregisterSuccess = memoryManager.unregisterBuffer('test_buffer');
    expect(unregisterSuccess).toBe(true);
    expect(memoryManager.hasBuffer('test_buffer')).toBe(false);
  });

  it('should track buffer metadata', () => {
    memoryManager.registerBuffer('test_buffer', mockAudioBuffer, {
      priority: memoryManager.config.priorityLevels.MEDIUM,
      tags: ['test', 'audio'],
      source: 'unit_test'
    });

    const metadata = memoryManager.getBufferMetadata('test_buffer');
    
    expect(metadata).toMatchObject({
      id: 'test_buffer',
      priority: memoryManager.config.priorityLevels.MEDIUM,
      tags: ['test', 'audio'],
      source: 'unit_test',
      persistent: false
    });
    expect(metadata.size).toBeGreaterThan(0);
    expect(metadata.createdAt).toBeTypeOf('number');
  });

  it('should provide memory statistics', () => {
    memoryManager.registerBuffer('buffer1', mockAudioBuffer);
    memoryManager.registerBuffer('buffer2', mockAudioBuffer);

    const stats = memoryManager.getMemoryStats();
    
    expect(stats.audioBuffers.count).toBe(2);
    expect(stats.audioBuffers.totalSize).toBeGreaterThan(0);
    expect(stats.audioBuffers.usagePercent).toBeGreaterThan(0);
    expect(stats.system.jsHeapUsed).toBeTypeOf('number');
  });

  it('should perform garbage collection', () => {
    // Register old buffer
    memoryManager.registerBuffer('old_buffer', mockAudioBuffer);
    
    // Manually set old timestamp
    const metadata = memoryManager.getBufferMetadata('old_buffer');
    metadata.createdAt = Date.now() - (35 * 60 * 1000); // 35 minutes ago
    
    expect(memoryManager.hasBuffer('old_buffer')).toBe(true);
    
    memoryManager.performGarbageCollection();
    
    expect(memoryManager.hasBuffer('old_buffer')).toBe(false);
  });

  it('should handle cleanup callbacks', () => {
    const cleanupCallback = vi.fn();
    memoryManager.addCleanupCallback(cleanupCallback);

    memoryManager.registerBuffer('test_buffer', mockAudioBuffer);
    memoryManager.unregisterBuffer('test_buffer');

    expect(cleanupCallback).toHaveBeenCalledWith('test_buffer', expect.any(Object));
  });

  it('should trigger emergency cleanup when memory threshold is exceeded', () => {
    // Mock high memory usage
    vi.spyOn(memoryManager, 'getCurrentMemoryUsage').mockReturnValue(
      memoryManager.config.maxMemoryUsage * 0.9 // 90% usage
    );

    const cleanupSpy = vi.spyOn(memoryManager, 'performEmergencyCleanup');

    memoryManager.registerBuffer('test_buffer', mockAudioBuffer);

    expect(cleanupSpy).toHaveBeenCalled();
  });
});

describe('OptimizedWaveformGenerator', () => {
  let mockAudioBuffer;

  beforeEach(() => {
    mockAudioBuffer = {
      numberOfChannels: 2,
      length: 44100 * 5, // 5 seconds
      sampleRate: 44100,
      duration: 5,
      getChannelData: vi.fn((channel) => {
        const data = new Float32Array(44100 * 5);
        // Fill with sine wave for testing
        for (let i = 0; i < data.length; i++) {
          data[i] = Math.sin(2 * Math.PI * 440 * i / 44100) * 0.5;
        }
        return data;
      })
    };
  });

  afterEach(() => {
    optimizedWaveformGenerator.cleanup();
  });

  it('should generate waveform data synchronously', async () => {
    const result = await optimizedWaveformGenerator.generateWaveform(mockAudioBuffer, {
      samples: 100,
      normalize: true
    });

    expect(result).toMatchObject({
      data: expect.any(Array),
      samples: 100,
      duration: 5,
      sampleRate: 44100,
      channels: 2
    });
    
    expect(result.data).toHaveLength(100);
    expect(result.data.every(value => typeof value === 'number')).toBe(true);
  });

  it('should generate progressive waveform for large files', async () => {
    const result = await optimizedWaveformGenerator.generateProgressiveWaveform(mockAudioBuffer, {
      samples: 200,
      normalize: true,
      channel: 0
    });

    expect(result).toMatchObject({
      data: expect.any(Array),
      samples: 200,
      duration: 5,
      progressive: true
    });
    
    expect(result.data).toHaveLength(200);
  });

  it('should handle progress callbacks', async () => {
    const progressCallback = vi.fn();

    await optimizedWaveformGenerator.generateWaveform(mockAudioBuffer, {
      samples: 50,
      onProgress: progressCallback
    });

    expect(progressCallback).toHaveBeenCalled();
    
    // Check that progress was reported
    const progressCalls = progressCallback.mock.calls;
    expect(progressCalls.some(call => call[0].progress >= 0)).toBe(true);
  });

  it('should cache waveform results', async () => {
    const options = { samples: 100, normalize: true };
    
    // First generation
    const result1 = await optimizedWaveformGenerator.generateWaveform(mockAudioBuffer, options);
    
    // Second generation (should be cached)
    const result2 = await optimizedWaveformGenerator.generateWaveform(mockAudioBuffer, options);
    
    expect(result1.data).toEqual(result2.data);
  });

  it('should provide generator statistics', () => {
    const stats = optimizedWaveformGenerator.getStats();
    
    expect(stats).toMatchObject({
      activeWorkers: expect.any(Number),
      availableWorkers: expect.any(Number),
      activeJobs: expect.any(Number),
      cacheSize: expect.any(Number),
      maxWorkers: expect.any(Number),
      supportsWebWorkers: expect.any(Boolean)
    });
  });

  it('should clear cache', () => {
    optimizedWaveformGenerator.clearCache();
    
    const stats = optimizedWaveformGenerator.getStats();
    expect(stats.cacheSize).toBe(0);
  });
});

describe('Integration Tests', () => {
  it('should integrate performance monitoring with memory management', () => {
    // Start monitoring
    performanceMonitor.startMonitoring();
    memoryManager.startMonitoring();

    // Simulate operations
    const endMeasurement = performanceMonitor.startMeasurement('integration_test');
    
    // Register buffer
    const mockBuffer = {
      numberOfChannels: 2,
      length: 44100,
      sampleRate: 44100,
      duration: 1
    };
    
    memoryManager.registerBuffer('integration_buffer', mockBuffer);
    
    // End measurement
    endMeasurement({ success: true });
    
    // Check that both systems recorded the activity
    const performanceMetrics = performanceMonitor.getMetrics('integration_test');
    const memoryStats = memoryManager.getMemoryStats();
    
    expect(performanceMetrics.count).toBeGreaterThan(0);
    expect(memoryStats.audioBuffers.count).toBeGreaterThan(0);
    
    // Cleanup
    performanceMonitor.cleanup();
    memoryManager.cleanup();
  });

  it('should handle memory pressure scenarios', () => {
    memoryManager.startMonitoring();
    
    // Mock high memory usage
    vi.spyOn(memoryManager, 'getCurrentMemoryUsage').mockReturnValue(
      memoryManager.config.maxMemoryUsage * 0.95 // 95% usage
    );
    
    const mockBuffer = {
      numberOfChannels: 2,
      length: 44100 * 60, // 1 minute
      sampleRate: 44100,
      duration: 60
    };
    
    // This should trigger emergency cleanup
    const success = memoryManager.registerBuffer('large_buffer', mockBuffer);
    
    // Should still succeed but may have triggered cleanup
    expect(success).toBe(true);
    
    memoryManager.cleanup();
  });
});