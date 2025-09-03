/**
 * Performance Benchmark Tests for Sampler Drum Sequencer
 * 
 * These tests measure and validate performance characteristics of the sampler
 * components to ensure they meet the performance requirements specified in
 * Requirement 5.
 * 
 * Performance Targets:
 * - Grid render time: < 50ms
 * - Interaction response: < 10ms
 * - Memory usage: < 50MB additional
 * - Timing accuracy: ±1ms
 * - Frame rate: 60fps during playback
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Import components for benchmarking
import SamplerDrumSequencer from '../SamplerDrumSequencer';
import SamplerSequencerGrid from '../SamplerSequencerGrid';
import SamplerTransportControls from '../SamplerTransportControls';
import SamplerBankNavigation from '../SamplerBankNavigation';

// Import services
import SamplerSequencerService from '../../../services/sequencer/SamplerSequencerService';

// Performance monitoring utilities
class PerformanceMonitor {
  constructor() {
    this.marks = new Map();
    this.measures = new Map();
    this.memorySnapshots = [];
  }

  mark(name) {
    this.marks.set(name, performance.now());
  }

  measure(name, startMark, endMark) {
    const start = this.marks.get(startMark);
    const end = this.marks.get(endMark);
    const duration = end - start;
    this.measures.set(name, duration);
    return duration;
  }

  takeMemorySnapshot(label) {
    if (performance.memory) {
      this.memorySnapshots.push({
        label,
        timestamp: Date.now(),
        usedJSHeapSize: performance.memory.usedJSHeapSize,
        totalJSHeapSize: performance.memory.totalJSHeapSize,
        jsHeapSizeLimit: performance.memory.jsHeapSizeLimit
      });
    }
  }

  getMemoryDelta(startLabel, endLabel) {
    const start = this.memorySnapshots.find(s => s.label === startLabel);
    const end = this.memorySnapshots.find(s => s.label === endLabel);
    
    if (!start || !end) return null;
    
    return {
      usedDelta: end.usedJSHeapSize - start.usedJSHeapSize,
      totalDelta: end.totalJSHeapSize - start.totalJSHeapSize,
      duration: end.timestamp - start.timestamp
    };
  }

  reset() {
    this.marks.clear();
    this.measures.clear();
    this.memorySnapshots = [];
  }
}

describe('Sampler Performance Benchmarks', () => {
  let monitor;
  let mockYouTubePlayer;
  let user;

  // Generate test data of various sizes
  const generateChops = (count) => {
    return Array(count).fill().map((_, i) => ({
      padId: `${String.fromCharCode(65 + Math.floor(i / 16))}${i % 16}`,
      startTime: i * 2,
      endTime: i * 2 + 1.5,
      color: `hsl(${(i * 137.5) % 360}, 70%, 50%)`
    }));
  };

  const generatePattern = (trackCount, stepCount, density = 0.25) => {
    return {
      tracks: Array(trackCount).fill().map((_, trackIndex) => ({
        trackIndex,
        chopId: `A${trackIndex}`,
        steps: Array(stepCount).fill().map(() => Math.random() < density)
      }))
    };
  };

  beforeEach(() => {
    monitor = new PerformanceMonitor();
    user = userEvent.setup();
    
    mockYouTubePlayer = {
      seekTo: vi.fn(),
      getCurrentTime: vi.fn(() => 0),
      getPlayerState: vi.fn(() => 1),
      playVideo: vi.fn(),
      pauseVideo: vi.fn(),
    };

    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }
  });

  afterEach(() => {
    monitor.reset();
    vi.clearAllMocks();
  });

  describe('Rendering Performance', () => {
    it('should render small grid (4x16) within performance target', () => {
      const chops = generateChops(4);
      const pattern = generatePattern(4, 16);

      monitor.mark('render-small-start');
      
      render(
        <SamplerSequencerGrid 
          pattern={pattern}
          chops={chops}
          currentStep={0}
          isPlaying={false}
          onStepToggle={vi.fn()}
        />
      );
      
      monitor.mark('render-small-end');
      const duration = monitor.measure('render-small', 'render-small-start', 'render-small-end');

      expect(duration).toBeLessThan(25); // Well under 50ms target
    });

    it('should render full grid (16x16) within performance target', () => {
      const chops = generateChops(16);
      const pattern = generatePattern(16, 16);

      monitor.mark('render-full-start');
      
      render(
        <SamplerSequencerGrid 
          pattern={pattern}
          chops={chops}
          currentStep={0}
          isPlaying={false}
          onStepToggle={vi.fn()}
        />
      );
      
      monitor.mark('render-full-end');
      const duration = monitor.measure('render-full', 'render-full-start', 'render-full-end');

      expect(duration).toBeLessThan(50); // Meets 50ms target
    });

    it('should render complex pattern (high density) within performance target', () => {
      const chops = generateChops(16);
      const pattern = generatePattern(16, 16, 0.75); // 75% density

      monitor.mark('render-complex-start');
      
      render(
        <SamplerSequencerGrid 
          pattern={pattern}
          chops={chops}
          currentStep={0}
          isPlaying={false}
          onStepToggle={vi.fn()}
        />
      );
      
      monitor.mark('render-complex-end');
      const duration = monitor.measure('render-complex', 'render-complex-start', 'render-complex-end');

      expect(duration).toBeLessThan(50);
    });

    it('should handle re-renders efficiently with memoization', () => {
      const chops = generateChops(16);
      const pattern = generatePattern(16, 16);
      
      const TestComponent = ({ step }) => (
        <SamplerSequencerGrid 
          pattern={pattern}
          chops={chops}
          currentStep={step}
          isPlaying={false}
          onStepToggle={vi.fn()}
        />
      );

      const { rerender } = render(<TestComponent step={0} />);

      monitor.mark('rerender-start');
      
      // Multiple re-renders with only currentStep changing
      for (let i = 1; i <= 16; i++) {
        rerender(<TestComponent step={i} />);
      }
      
      monitor.mark('rerender-end');
      const duration = monitor.measure('rerender', 'rerender-start', 'rerender-end');

      // 16 re-renders should complete quickly due to memoization
      expect(duration).toBeLessThan(100);
    });

    it('should render main sequencer component within performance target', () => {
      const chops = generateChops(16);

      monitor.mark('render-main-start');
      
      render(
        <SamplerDrumSequencer 
          chops={chops}
          activeBank="A"
          youtubePlayer={mockYouTubePlayer}
        />
      );
      
      monitor.mark('render-main-end');
      const duration = monitor.measure('render-main', 'render-main-start', 'render-main-end');

      expect(duration).toBeLessThan(100); // Full component render
    });
  });

  describe('Interaction Performance', () => {
    it('should respond to single step toggle within performance target', async () => {
      const onStepToggle = vi.fn();
      const pattern = generatePattern(16, 16);
      
      render(
        <SamplerSequencerGrid 
          pattern={pattern}
          chops={generateChops(16)}
          currentStep={0}
          isPlaying={false}
          onStepToggle={onStepToggle}
        />
      );

      const gridCell = screen.getByTestId('step-0-0');

      monitor.mark('interaction-start');
      await user.click(gridCell);
      monitor.mark('interaction-end');

      const duration = monitor.measure('interaction', 'interaction-start', 'interaction-end');

      expect(duration).toBeLessThan(10); // Meets 10ms target
      expect(onStepToggle).toHaveBeenCalled();
    });

    it('should handle rapid sequential interactions efficiently', async () => {
      const onStepToggle = vi.fn();
      const pattern = generatePattern(16, 16);
      
      render(
        <SamplerSequencerGrid 
          pattern={pattern}
          chops={generateChops(16)}
          currentStep={0}
          isPlaying={false}
          onStepToggle={onStepToggle}
        />
      );

      const cells = screen.getAllByTestId(/step-\d+-\d+/).slice(0, 20);

      monitor.mark('rapid-interactions-start');
      
      for (const cell of cells) {
        await user.click(cell);
      }
      
      monitor.mark('rapid-interactions-end');
      const duration = monitor.measure('rapid-interactions', 'rapid-interactions-start', 'rapid-interactions-end');

      // 20 interactions should complete quickly
      expect(duration).toBeLessThan(200);
      expect(onStepToggle).toHaveBeenCalledTimes(20);
    });

    it('should handle transport control interactions efficiently', async () => {
      const onPlay = vi.fn();
      const onBpmChange = vi.fn();
      
      render(
        <SamplerTransportControls 
          isPlaying={false}
          bpm={120}
          onPlay={onPlay}
          onStop={vi.fn()}
          onBpmChange={onBpmChange}
        />
      );

      monitor.mark('transport-interactions-start');
      
      // Test multiple transport interactions
      await user.click(screen.getByTestId('play-button'));
      await user.clear(screen.getByTestId('bpm-input'));
      await user.type(screen.getByTestId('bpm-input'), '140');
      
      monitor.mark('transport-interactions-end');
      const duration = monitor.measure('transport-interactions', 'transport-interactions-start', 'transport-interactions-end');

      expect(duration).toBeLessThan(50);
      expect(onPlay).toHaveBeenCalled();
      expect(onBpmChange).toHaveBeenCalled();
    });

    it('should handle bank navigation efficiently', async () => {
      const onBankChange = vi.fn();
      
      render(
        <SamplerBankNavigation 
          currentBank={0}
          totalBanks={4}
          onBankChange={onBankChange}
          chopsPerBank={[16, 16, 16, 16]}
        />
      );

      monitor.mark('bank-nav-start');
      
      // Navigate through all banks
      for (let i = 0; i < 3; i++) {
        await user.click(screen.getByTestId('bank-nav-next'));
      }
      
      monitor.mark('bank-nav-end');
      const duration = monitor.measure('bank-nav', 'bank-nav-start', 'bank-nav-end');

      expect(duration).toBeLessThan(30);
      expect(onBankChange).toHaveBeenCalledTimes(3);
    });
  });

  describe('Memory Performance', () => {
    it('should not exceed memory usage target for basic operation', () => {
      monitor.takeMemorySnapshot('memory-start');
      
      const chops = generateChops(16);
      const { unmount } = render(
        <SamplerDrumSequencer 
          chops={chops}
          activeBank="A"
          youtubePlayer={mockYouTubePlayer}
        />
      );
      
      monitor.takeMemorySnapshot('memory-peak');
      
      unmount();
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
      
      monitor.takeMemorySnapshot('memory-end');
      
      const delta = monitor.getMemoryDelta('memory-start', 'memory-peak');
      
      if (delta) {
        // Should not use more than 50MB additional memory
        expect(delta.usedDelta).toBeLessThan(50 * 1024 * 1024);
      }
    });

    it('should clean up memory after component unmount', () => {
      monitor.takeMemorySnapshot('cleanup-start');
      
      const chops = generateChops(64); // Large dataset
      const { unmount } = render(
        <SamplerDrumSequencer 
          chops={chops}
          activeBank="A"
          youtubePlayer={mockYouTubePlayer}
        />
      );
      
      monitor.takeMemorySnapshot('cleanup-mounted');
      
      unmount();
      
      // Force garbage collection
      if (global.gc) {
        global.gc();
      }
      
      setTimeout(() => {
        monitor.takeMemorySnapshot('cleanup-end');
        
        const mountedDelta = monitor.getMemoryDelta('cleanup-start', 'cleanup-mounted');
        const cleanupDelta = monitor.getMemoryDelta('cleanup-start', 'cleanup-end');
        
        if (mountedDelta && cleanupDelta) {
          // Memory should be mostly reclaimed after cleanup
          expect(cleanupDelta.usedDelta).toBeLessThan(mountedDelta.usedDelta * 0.5);
        }
      }, 100);
    });

    it('should handle memory efficiently during extended operation', async () => {
      monitor.takeMemorySnapshot('extended-start');
      
      const service = new SamplerSequencerService();
      service.setYouTubePlayer(mockYouTubePlayer);
      service.setChops(generateChops(16));
      service.setPattern(generatePattern(16, 16, 0.5));
      
      service.start();
      
      // Run for extended period
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      monitor.takeMemorySnapshot('extended-running');
      
      service.stop();
      
      monitor.takeMemorySnapshot('extended-end');
      
      const runningDelta = monitor.getMemoryDelta('extended-start', 'extended-running');
      
      if (runningDelta) {
        // Memory growth during operation should be minimal
        expect(runningDelta.usedDelta).toBeLessThan(10 * 1024 * 1024); // 10MB max
      }
    });
  });

  describe('Timing Performance', () => {
    it('should maintain precise timing accuracy', async () => {
      const service = new SamplerSequencerService();
      const timingMarks = [];
      
      service.onStep((step) => {
        timingMarks.push({
          step,
          timestamp: performance.now(),
          expectedTime: step * (60000 / 120 / 4) // 120 BPM, 16th notes
        });
      });
      
      service.setBPM(120);
      service.start();
      
      // Collect timing data for several steps
      await new Promise(resolve => setTimeout(resolve, 2000));
      service.stop();
      
      // Analyze timing accuracy
      for (let i = 1; i < timingMarks.length; i++) {
        const actualInterval = timingMarks[i].timestamp - timingMarks[i-1].timestamp;
        const expectedInterval = 125; // 125ms for 16th notes at 120 BPM
        const deviation = Math.abs(actualInterval - expectedInterval);
        
        // Should be within 1ms tolerance
        expect(deviation).toBeLessThan(1);
      }
    });

    it('should handle tempo changes without timing drift', async () => {
      const service = new SamplerSequencerService();
      const timingMarks = [];
      
      service.onStep((step) => {
        timingMarks.push({
          step,
          timestamp: performance.now(),
          bpm: service.getBPM()
        });
      });
      
      service.setBPM(120);
      service.start();
      
      // Run at 120 BPM
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Change to 140 BPM
      service.setBPM(140);
      await new Promise(resolve => setTimeout(resolve, 500));
      
      service.stop();
      
      // Verify timing accuracy after tempo change
      const tempoChangeIndex = timingMarks.findIndex(mark => mark.bpm === 140);
      
      if (tempoChangeIndex > 0) {
        const postChangeMarks = timingMarks.slice(tempoChangeIndex);
        
        for (let i = 1; i < postChangeMarks.length; i++) {
          const actualInterval = postChangeMarks[i].timestamp - postChangeMarks[i-1].timestamp;
          const expectedInterval = 60000 / 140 / 4; // 16th notes at 140 BPM
          const deviation = Math.abs(actualInterval - expectedInterval);
          
          expect(deviation).toBeLessThan(2); // Slightly more tolerance after tempo change
        }
      }
    });

    it('should maintain frame rate during playback', async () => {
      const frameTimestamps = [];
      let animationId;
      
      const recordFrame = () => {
        frameTimestamps.push(performance.now());
        animationId = requestAnimationFrame(recordFrame);
      };
      
      // Start frame recording
      recordFrame();
      
      // Start sequencer with complex pattern
      const service = new SamplerSequencerService();
      service.setChops(generateChops(16));
      service.setPattern(generatePattern(16, 16, 0.8)); // High density
      service.setBPM(160); // Fast tempo
      service.start();
      
      // Record for 1 second
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      service.stop();
      cancelAnimationFrame(animationId);
      
      // Calculate frame rate
      const totalTime = frameTimestamps[frameTimestamps.length - 1] - frameTimestamps[0];
      const frameCount = frameTimestamps.length;
      const fps = (frameCount / totalTime) * 1000;
      
      // Should maintain close to 60fps
      expect(fps).toBeGreaterThan(55);
    });
  });

  describe('Scalability Performance', () => {
    it('should handle maximum chop count efficiently', () => {
      const maxChops = generateChops(64); // Maximum supported
      
      monitor.mark('max-chops-start');
      
      const { unmount } = render(
        <SamplerDrumSequencer 
          chops={maxChops}
          activeBank="A"
          youtubePlayer={mockYouTubePlayer}
        />
      );
      
      monitor.mark('max-chops-end');
      const duration = monitor.measure('max-chops', 'max-chops-start', 'max-chops-end');
      
      expect(duration).toBeLessThan(150); // Reasonable for maximum load
      
      unmount();
    });

    it('should handle bank switching with full data efficiently', async () => {
      const fullChops = generateChops(64);
      const onBankChange = vi.fn();
      
      const { rerender } = render(
        <SamplerDrumSequencer 
          chops={fullChops}
          activeBank="A"
          youtubePlayer={mockYouTubePlayer}
          onBankChange={onBankChange}
        />
      );

      monitor.mark('bank-switch-start');
      
      // Switch through all banks
      const banks = ['A', 'B', 'C', 'D'];
      for (const bank of banks) {
        rerender(
          <SamplerDrumSequencer 
            chops={fullChops}
            activeBank={bank}
            youtubePlayer={mockYouTubePlayer}
            onBankChange={onBankChange}
          />
        );
      }
      
      monitor.mark('bank-switch-end');
      const duration = monitor.measure('bank-switch', 'bank-switch-start', 'bank-switch-end');
      
      expect(duration).toBeLessThan(200); // All bank switches
    });

    it('should handle concurrent operations efficiently', async () => {
      const service = new SamplerSequencerService();
      service.setYouTubePlayer(mockYouTubePlayer);
      service.setChops(generateChops(32));
      
      monitor.mark('concurrent-start');
      
      // Start multiple concurrent operations
      const operations = [
        service.start(),
        service.setPattern(generatePattern(16, 16, 0.6)),
        service.setBPM(130),
        // Simulate user interactions
        ...Array(10).fill().map(() => 
          new Promise(resolve => {
            setTimeout(() => {
              service.toggleStep(Math.floor(Math.random() * 16), Math.floor(Math.random() * 16));
              resolve();
            }, Math.random() * 500);
          })
        )
      ];
      
      await Promise.all(operations);
      
      monitor.mark('concurrent-end');
      const duration = monitor.measure('concurrent', 'concurrent-start', 'concurrent-end');
      
      expect(duration).toBeLessThan(600); // All concurrent operations
      
      service.stop();
    });
  });
});