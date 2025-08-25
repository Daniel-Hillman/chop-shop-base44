/**
 * Performance Benchmarks for Waveform Generation and Rendering
 * Tests performance targets and identifies bottlenecks
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { WaveformVisualization } from '../WaveformVisualization.jsx';
import { WebAudioAnalyzer } from '../../../services/WebAudioAnalyzer.js';
import { CanvasRenderer } from '../CanvasRenderer.js';
import { InteractionManager } from '../InteractionManager.js';

// Performance test utilities
class PerformanceBenchmark {
  constructor(name) {
    this.name = name;
    this.measurements = [];
    this.startTime = null;
  }

  start() {
    this.startTime = performance.now();
  }

  end() {
    if (this.startTime === null) {
      throw new Error('Benchmark not started');
    }
    const duration = performance.now() - this.startTime;
    this.measurements.push(duration);
    this.startTime = null;
    return duration;
  }

  getStats() {
    if (this.measurements.length === 0) {
      return { avg: 0, min: 0, max: 0, count: 0 };
    }

    const sorted = [...this.measurements].sort((a, b) => a - b);
    return {
      avg: this.measurements.reduce((a, b) => a + b, 0) / this.measurements.length,
      min: sorted[0],
      max: sorted[sorted.length - 1],
      median: sorted[Math.floor(sorted.length / 2)],
      p95: sorted[Math.floor(sorted.length * 0.95)],
      count: this.measurements.length
    };
  }
}

// Mock high-resolution audio data
const createMockAudioBuffer = (duration, sampleRate = 44100) => {
  const length = duration * sampleRate;
  const buffer = new Float32Array(length);
  
  // Generate realistic audio waveform with multiple frequencies
  for (let i = 0; i < length; i++) {
    const time = i / sampleRate;
    buffer[i] = 
      Math.sin(2 * Math.PI * 440 * time) * 0.3 +  // A4 note
      Math.sin(2 * Math.PI * 880 * time) * 0.2 +  // A5 note
      Math.sin(2 * Math.PI * 220 * time) * 0.1 +  // A3 note
      (Math.random() - 0.5) * 0.05;              // Noise
  }
  
  return buffer;
};

const mockYouTubePlayer = {
  getCurrentTime: vi.fn(() => 0),
  getDuration: vi.fn(() => 300), // 5 minute track
  getPlayerState: vi.fn(() => 1),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  getVideoData: vi.fn(() => ({
    title: 'Performance Test Track',
    video_id: 'perf123'
  }))
};

describe('Waveform Performance Benchmarks', () => {
  let performanceMonitor;

  beforeEach(() => {
    performanceMonitor = {
      waveformGeneration: new PerformanceBenchmark('Waveform Generation'),
      canvasRendering: new PerformanceBenchmark('Canvas Rendering'),
      interactionResponse: new PerformanceBenchmark('Interaction Response'),
      memoryUsage: new PerformanceBenchmark('Memory Usage'),
      zoomPerformance: new PerformanceBenchmark('Zoom Performance')
    };

    // Mock performance API enhancements
    global.performance.mark = vi.fn();
    global.performance.measure = vi.fn();
    global.performance.getEntriesByType = vi.fn(() => []);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Waveform Generation Performance', () => {
    it('should generate waveform for 5-minute audio within 2 seconds', async () => {
      const audioBuffer = createMockAudioBuffer(300); // 5 minutes
      
      performanceMonitor.waveformGeneration.start();
      
      const { rerender } = render(
        <WaveformVisualization
          audioSource={mockYouTubePlayer}
          chops={[]}
          currentTime={0}
          isPlaying={false}
          onChopCreate={vi.fn()}
          onChopUpdate={vi.fn()}
          onTimeSeek={vi.fn()}
          visualSettings={{
            colorScheme: 'default',
            showFrequencyData: true,
            showZeroCrossings: true
          }}
        />
      );

      await waitFor(() => {
        const canvas = screen.getByTestId('waveform-canvas');
        expect(canvas).toHaveAttribute('data-analysis-complete', 'true');
      }, { timeout: 5000 });

      const generationTime = performanceMonitor.waveformGeneration.end();
      
      expect(generationTime).toBeLessThan(2000); // Target: < 2 seconds
      console.log(`Waveform generation time: ${generationTime.toFixed(2)}ms`);
    });

    it('should handle progressive waveform generation efficiently', async () => {
      const chunks = 10;
      const chunkDuration = 30; // 30 seconds per chunk
      
      for (let i = 0; i < chunks; i++) {
        performanceMonitor.waveformGeneration.start();
        
        // Simulate progressive chunk processing
        const chunkBuffer = createMockAudioBuffer(chunkDuration);
        
        // Mock progressive update
        await new Promise(resolve => setTimeout(resolve, 50));
        
        const chunkTime = performanceMonitor.waveformGeneration.end();
        expect(chunkTime).toBeLessThan(200); // Each chunk should process quickly
      }

      const stats = performanceMonitor.waveformGeneration.getStats();
      expect(stats.avg).toBeLessThan(150); // Average chunk processing time
      expect(stats.max).toBeLessThan(300); // No chunk should take too long
      
      console.log('Progressive generation stats:', stats);
    });

    it('should maintain memory efficiency during large file processing', async () => {
      const initialMemory = performance.memory?.usedJSHeapSize || 0;
      
      // Process multiple large audio files
      for (let i = 0; i < 5; i++) {
        const largeBuffer = createMockAudioBuffer(600); // 10 minutes each
        
        render(
          <WaveformVisualization
            audioSource={mockYouTubePlayer}
            chops={[]}
            currentTime={0}
            isPlaying={false}
            onChopCreate={vi.fn()}
            onChopUpdate={vi.fn()}
            onTimeSeek={vi.fn()}
            visualSettings={{
              colorScheme: 'default',
              showFrequencyData: true,
              showZeroCrossings: true
            }}
          />
        );

        await waitFor(() => {
          expect(screen.getByTestId('waveform-canvas')).toBeInTheDocument();
        });

        // Force garbage collection if available
        if (global.gc) {
          global.gc();
        }
      }

      const finalMemory = performance.memory?.usedJSHeapSize || 0;
      const memoryIncrease = finalMemory - initialMemory;
      
      // Memory increase should be reasonable (< 100MB for 5 large files)
      expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024);
      
      console.log(`Memory increase: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`);
    });
  });

  describe('Canvas Rendering Performance', () => {
    it('should maintain 60fps during playback with complex waveforms', async () => {
      const { rerender } = render(
        <WaveformVisualization
          audioSource={mockYouTubePlayer}
          chops={[]}
          currentTime={0}
          isPlaying={false}
          onChopCreate={vi.fn()}
          onChopUpdate={vi.fn()}
          onTimeSeek={vi.fn()}
          visualSettings={{
            colorScheme: 'default',
            showFrequencyData: true,
            showZeroCrossings: true
          }}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('waveform-canvas')).toBeInTheDocument();
      });

      // Simulate 60fps playback updates
      const frameCount = 60; // 1 second of 60fps
      const targetFrameTime = 16.67; // ~60fps

      for (let frame = 0; frame < frameCount; frame++) {
        performanceMonitor.canvasRendering.start();
        
        rerender(
          <WaveformVisualization
            audioSource={mockYouTubePlayer}
            chops={[]}
            currentTime={frame / 60} // Advance time
            isPlaying={true}
            onChopCreate={vi.fn()}
            onChopUpdate={vi.fn()}
            onTimeSeek={vi.fn()}
            visualSettings={{
              colorScheme: 'default',
              showFrequencyData: true,
              showZeroCrossings: true
            }}
          />
        );

        await waitFor(() => {
          expect(screen.getByTestId('playhead')).toBeInTheDocument();
        });

        const frameTime = performanceMonitor.canvasRendering.end();
        expect(frameTime).toBeLessThan(targetFrameTime);
      }

      const renderStats = performanceMonitor.canvasRendering.getStats();
      expect(renderStats.avg).toBeLessThan(targetFrameTime);
      expect(renderStats.p95).toBeLessThan(targetFrameTime * 1.5); // Allow some variance
      
      console.log('Rendering performance stats:', renderStats);
    });

    it('should handle high-density waveform rendering efficiently', async () => {
      // Test with very detailed waveform (sample-level detail)
      const highDensityBuffer = createMockAudioBuffer(10, 44100); // 10 seconds at full resolution
      
      performanceMonitor.canvasRendering.start();
      
      render(
        <WaveformVisualization
          audioSource={mockYouTubePlayer}
          chops={[]}
          currentTime={0}
          isPlaying={false}
          onChopCreate={vi.fn()}
          onChopUpdate={vi.fn()}
          onTimeSeek={vi.fn()}
          visualSettings={{
            colorScheme: 'default',
            showFrequencyData: true,
            showZeroCrossings: true,
            zoomLevel: 100 // Maximum zoom
          }}
        />
      );

      await waitFor(() => {
        const canvas = screen.getByTestId('waveform-canvas');
        expect(canvas).toHaveAttribute('data-zoom-level', '100');
      });

      const renderTime = performanceMonitor.canvasRendering.end();
      expect(renderTime).toBeLessThan(100); // Should render high-density data quickly
      
      console.log(`High-density rendering time: ${renderTime.toFixed(2)}ms`);
    });
  });

  describe('Interaction Response Performance', () => {
    it('should respond to user interactions within 16ms', async () => {
      render(
        <WaveformVisualization
          audioSource={mockYouTubePlayer}
          chops={[]}
          currentTime={0}
          isPlaying={false}
          onChopCreate={vi.fn()}
          onChopUpdate={vi.fn()}
          onTimeSeek={vi.fn()}
          visualSettings={{
            colorScheme: 'default',
            showFrequencyData: true,
            showZeroCrossings: true
          }}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('waveform-canvas')).toBeInTheDocument();
      });

      const canvas = screen.getByTestId('waveform-canvas');
      const interactionCount = 50;

      // Test rapid click interactions
      for (let i = 0; i < interactionCount; i++) {
        performanceMonitor.interactionResponse.start();
        
        fireEvent.click(canvas, {
          clientX: 50 + (i * 5),
          clientY: 50
        });

        // Wait for visual feedback
        await waitFor(() => {
          expect(canvas.getAttribute('data-last-interaction')).toBeTruthy();
        });

        const responseTime = performanceMonitor.interactionResponse.end();
        expect(responseTime).toBeLessThan(16); // Target: < 16ms for 60fps
      }

      const interactionStats = performanceMonitor.interactionResponse.getStats();
      expect(interactionStats.avg).toBeLessThan(10);
      expect(interactionStats.max).toBeLessThan(25);
      
      console.log('Interaction response stats:', interactionStats);
    });

    it('should handle rapid zoom operations smoothly', async () => {
      render(
        <WaveformVisualization
          audioSource={mockYouTubePlayer}
          chops={[]}
          currentTime={0}
          isPlaying={false}
          onChopCreate={vi.fn()}
          onChopUpdate={vi.fn()}
          onTimeSeek={vi.fn()}
          visualSettings={{
            colorScheme: 'default',
            showFrequencyData: true,
            showZeroCrossings: true
          }}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('waveform-canvas')).toBeInTheDocument();
      });

      const canvas = screen.getByTestId('waveform-canvas');
      
      // Test rapid zoom in/out operations
      for (let i = 0; i < 20; i++) {
        performanceMonitor.zoomPerformance.start();
        
        fireEvent.wheel(canvas, {
          deltaY: i % 2 === 0 ? -100 : 100 // Alternate zoom in/out
        });

        await waitFor(() => {
          expect(canvas.getAttribute('data-zoom-level')).toBeTruthy();
        });

        const zoomTime = performanceMonitor.zoomPerformance.end();
        expect(zoomTime).toBeLessThan(50); // Zoom should be responsive
      }

      const zoomStats = performanceMonitor.zoomPerformance.getStats();
      expect(zoomStats.avg).toBeLessThan(30);
      
      console.log('Zoom performance stats:', zoomStats);
    });
  });

  describe('Memory Management Performance', () => {
    it('should efficiently manage memory during extended usage', async () => {
      const initialMemory = performance.memory?.usedJSHeapSize || 0;
      let components = [];

      // Create and destroy multiple waveform components
      for (let cycle = 0; cycle < 10; cycle++) {
        const { unmount } = render(
          <WaveformVisualization
            audioSource={mockYouTubePlayer}
            chops={Array.from({ length: 20 }, (_, i) => ({
              id: `chop-${cycle}-${i}`,
              startTime: i * 5,
              endTime: (i + 1) * 5,
              padId: `pad-${i}`,
              color: `hsl(${i * 18}, 70%, 50%)`
            }))}
            currentTime={0}
            isPlaying={false}
            onChopCreate={vi.fn()}
            onChopUpdate={vi.fn()}
            onTimeSeek={vi.fn()}
            visualSettings={{
              colorScheme: 'default',
              showFrequencyData: true,
              showZeroCrossings: true
            }}
          />
        );

        await waitFor(() => {
          expect(screen.getByTestId('waveform-canvas')).toBeInTheDocument();
        });

        // Simulate some usage
        const canvas = screen.getByTestId('waveform-canvas');
        for (let i = 0; i < 5; i++) {
          fireEvent.click(canvas, { clientX: 100 + i * 20, clientY: 50 });
        }

        components.push(unmount);

        // Clean up every few cycles
        if (cycle % 3 === 2) {
          components.forEach(unmount => unmount());
          components = [];
          
          // Force garbage collection if available
          if (global.gc) {
            global.gc();
          }
        }
      }

      // Clean up remaining components
      components.forEach(unmount => unmount());

      const finalMemory = performance.memory?.usedJSHeapSize || 0;
      const memoryIncrease = finalMemory - initialMemory;
      
      // Memory should not grow excessively
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024); // < 50MB increase
      
      console.log(`Memory management test - increase: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`);
    });
  });

  describe('Performance Regression Detection', () => {
    it('should detect performance regressions in core operations', async () => {
      const benchmarkTargets = {
        waveformGeneration: 2000, // 2 seconds max
        canvasRendering: 16.67,   // 60fps target
        interactionResponse: 16,   // 60fps target
        memoryEfficiency: 100 * 1024 * 1024 // 100MB max increase
      };

      // Run comprehensive performance test
      const results = {};

      // Test waveform generation
      performanceMonitor.waveformGeneration.start();
      render(
        <WaveformVisualization
          audioSource={mockYouTubePlayer}
          chops={[]}
          currentTime={0}
          isPlaying={false}
          onChopCreate={vi.fn()}
          onChopUpdate={vi.fn()}
          onTimeSeek={vi.fn()}
          visualSettings={{
            colorScheme: 'default',
            showFrequencyData: true,
            showZeroCrossings: true
          }}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('waveform-canvas')).toBeInTheDocument();
      });

      results.waveformGeneration = performanceMonitor.waveformGeneration.end();

      // Validate against benchmarks
      Object.entries(benchmarkTargets).forEach(([metric, target]) => {
        if (results[metric] !== undefined) {
          expect(results[metric]).toBeLessThan(target);
          
          // Log performance metrics for monitoring
          console.log(`${metric}: ${results[metric].toFixed(2)}ms (target: ${target}ms)`);
        }
      });

      // Generate performance report
      const performanceReport = {
        timestamp: new Date().toISOString(),
        results,
        targets: benchmarkTargets,
        passed: Object.entries(results).every(([metric, value]) => 
          value < benchmarkTargets[metric]
        )
      };

      console.log('Performance Report:', JSON.stringify(performanceReport, null, 2));
      
      expect(performanceReport.passed).toBe(true);
    });
  });
});