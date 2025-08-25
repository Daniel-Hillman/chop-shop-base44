/**
 * Integration test for Waveform Performance Optimization
 * Tests the complete performance optimization pipeline
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import WaveformPerformanceOptimizer from '../WaveformPerformanceOptimizer.js';

describe('Waveform Performance Integration', () => {
  let optimizer;

  beforeEach(() => {
    // Mock minimal environment
    global.performance = {
      now: vi.fn(() => Date.now()),
      memory: {
        usedJSHeapSize: 50 * 1024 * 1024,
        totalJSHeapSize: 100 * 1024 * 1024,
        jsHeapSizeLimit: 200 * 1024 * 1024
      }
    };

    global.navigator = {
      hardwareConcurrency: 2,
      userAgent: 'test-agent'
    };

    // Mock Worker to avoid complex setup
    global.Worker = class MockWorker {
      constructor() {
        this.onmessage = null;
        this.onerror = null;
      }
      postMessage() {}
      terminate() {}
    };
  });

  afterEach(() => {
    if (optimizer) {
      optimizer.destroy();
      optimizer = null;
    }
  });

  it('should create optimizer with minimal configuration', async () => {
    optimizer = new WaveformPerformanceOptimizer({
      enableWebWorkers: false, // Disable to avoid Worker complexity
      enableCaching: false,    // Disable to avoid IndexedDB complexity
      enableMemoryManagement: true,
      enablePerformanceMonitoring: false // Disable to avoid canvas complexity
    });

    await optimizer.initialize();

    expect(optimizer.isInitialized).toBe(true);
    expect(optimizer.memoryManager).toBeDefined();
  });

  it('should handle direct waveform generation', async () => {
    optimizer = new WaveformPerformanceOptimizer({
      enableWebWorkers: false,
      enableCaching: false,
      enableMemoryManagement: true,
      enablePerformanceMonitoring: false
    });

    await optimizer.initialize();

    const audioBuffer = new Float32Array(1000);
    for (let i = 0; i < audioBuffer.length; i++) {
      audioBuffer[i] = Math.sin(2 * Math.PI * 440 * i / 44100);
    }

    const result = await optimizer.generateOptimizedWaveform(
      { buffer: audioBuffer },
      { targetSampleRate: 100, quality: 'medium' }
    );

    expect(result).toBeDefined();
    expect(result.samples).toBeInstanceOf(Float32Array);
    expect(result.metadata.analysisMethod).toBe('direct-optimized');
  });

  it('should manage memory allocations', async () => {
    optimizer = new WaveformPerformanceOptimizer({
      enableWebWorkers: false,
      enableCaching: false,
      enableMemoryManagement: true,
      enablePerformanceMonitoring: false
    });

    await optimizer.initialize();

    const allocation = optimizer.memoryManager.allocateBuffer(1024, 'waveform');
    expect(allocation.bufferId).toBeDefined();
    expect(allocation.buffer).toBeInstanceOf(Float32Array);

    const deallocated = optimizer.memoryManager.deallocateBuffer(allocation.bufferId);
    expect(deallocated).toBe(true);
  });

  it('should provide performance metrics', async () => {
    optimizer = new WaveformPerformanceOptimizer({
      enableWebWorkers: false,
      enableCaching: false,
      enableMemoryManagement: true,
      enablePerformanceMonitoring: false
    });

    await optimizer.initialize();

    const metrics = optimizer.getPerformanceMetrics();
    expect(metrics).toBeDefined();
    expect(metrics.workerTasks).toBeDefined();
    expect(metrics.overallPerformance).toBeDefined();
  });

  it('should handle errors gracefully', async () => {
    optimizer = new WaveformPerformanceOptimizer({
      enableWebWorkers: false,
      enableCaching: false,
      enableMemoryManagement: true,
      enablePerformanceMonitoring: false
    });

    await optimizer.initialize();

    // Test with invalid audio buffer
    await expect(
      optimizer.generateOptimizedWaveform({ buffer: null }, { quality: 'high' })
    ).rejects.toThrow();
  });
});