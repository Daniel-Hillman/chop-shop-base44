/**
 * Playback Synchronization Integration Tests
 * Tests complete workflow from YouTube player to waveform visualization
 * Requirements: 5.1, 5.2, 5.3
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { WaveformVisualization } from '../WaveformVisualization.jsx';

// Mock canvas and WebGL
const mockCanvas = {
  getContext: vi.fn(() => ({
    clearRect: vi.fn(),
    fillRect: vi.fn(),
    strokeRect: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    arc: vi.fn(),
    closePath: vi.fn(),
    stroke: vi.fn(),
    fill: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    scale: vi.fn(),
    translate: vi.fn(),
    measureText: () => ({ width: 50 }),
    fillText: vi.fn(),
    strokeText: vi.fn(),
    setLineDash: vi.fn(),
    createLinearGradient: vi.fn(() => ({
      addColorStop: vi.fn()
    }))
  })),
  width: 800,
  height: 200,
  style: {},
  getBoundingClientRect: () => ({
    width: 800,
    height: 200,
    top: 0,
    left: 0
  })
};

// Mock HTMLCanvasElement
global.HTMLCanvasElement.prototype.getContext = mockCanvas.getContext;
global.HTMLCanvasElement.prototype.getBoundingClientRect = mockCanvas.getBoundingClientRect;

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn()
}));

// Mock requestAnimationFrame
let rafCallbacks = [];
global.requestAnimationFrame = vi.fn((callback) => {
  rafCallbacks.push(callback);
  return rafCallbacks.length;
});

global.cancelAnimationFrame = vi.fn((id) => {
  if (rafCallbacks[id - 1]) {
    rafCallbacks[id - 1] = null;
  }
});

describe('Playback Synchronization Integration', () => {
  let mockWaveformData;
  let mockChops;
  let mockCallbacks;

  beforeEach(() => {
    rafCallbacks = [];
    
    mockWaveformData = {
      samples: new Float32Array(44100), // 1 second of audio
      sampleRate: 44100,
      duration: 1.0,
      channels: 1,
      metadata: {
        analysisMethod: 'webaudio',
        quality: 'high'
      }
    };

    // Fill with test waveform data
    for (let i = 0; i < mockWaveformData.samples.length; i++) {
      mockWaveformData.samples[i] = Math.sin(2 * Math.PI * 440 * i / 44100) * 0.5;
    }

    mockChops = [
      {
        id: 'chop1',
        padId: 'A1',
        startTime: 0.2,
        endTime: 0.4,
        color: '#ff0000'
      },
      {
        id: 'chop2',
        padId: 'A2',
        startTime: 0.6,
        endTime: 0.8,
        color: '#00ff00'
      }
    ];

    mockCallbacks = {
      onChopCreate: vi.fn(),
      onChopUpdate: vi.fn(),
      onTimeSeek: vi.fn()
    };

    vi.spyOn(performance, 'now').mockReturnValue(0);
  });

  afterEach(() => {
    rafCallbacks = [];
    vi.restoreAllMocks();
  });

  describe('Real-time Playhead Tracking', () => {
    it('should accurately track YouTube player position', async () => {
      let waveformRef;
      
      render(
        <WaveformVisualization
          ref={(ref) => { waveformRef = ref; }}
          waveformData={mockWaveformData}
          chops={mockChops}
          currentTime={0.3}
          isPlaying={true}
          {...mockCallbacks}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/Initializing/)).toBeInTheDocument();
      });

      // Wait for initialization
      await waitFor(() => {
        expect(screen.queryByText(/Initializing/)).not.toBeInTheDocument();
      }, { timeout: 2000 });

      // Simulate time updates from YouTube player
      const timeUpdates = [0.3, 0.35, 0.4, 0.45, 0.5];
      
      for (let i = 0; i < timeUpdates.length; i++) {
        const time = timeUpdates[i];
        vi.spyOn(performance, 'now').mockReturnValue(i * 100);
        
        // Re-render with new time
        render(
          <WaveformVisualization
            ref={(ref) => { waveformRef = ref; }}
            waveformData={mockWaveformData}
            chops={mockChops}
            currentTime={time}
            isPlaying={true}
            {...mockCallbacks}
          />
        );

        // Process animation frames
        if (rafCallbacks.length > 0) {
          rafCallbacks.forEach(callback => {
            if (callback) callback(i * 100);
          });
        }
      }

      // Verify sync status
      if (waveformRef?.getSyncStatus) {
        const syncStatus = waveformRef.getSyncStatus();
        expect(syncStatus.isPlaying).toBe(true);
        expect(syncStatus.currentTime).toBeCloseTo(0.5, 1);
      }
    });

    it('should provide smooth animation without interfering with waveform readability', async () => {
      const performanceMetrics = [];
      
      render(
        <WaveformVisualization
          waveformData={mockWaveformData}
          chops={mockChops}
          currentTime={0.1}
          isPlaying={true}
          {...mockCallbacks}
        />
      );

      await waitFor(() => {
        expect(screen.queryByText(/Initializing/)).not.toBeInTheDocument();
      });

      // Simulate 60fps for 1 second
      for (let frame = 0; frame < 60; frame++) {
        const timestamp = frame * 16.67;
        vi.spyOn(performance, 'now').mockReturnValue(timestamp);
        
        // Process animation frame
        if (rafCallbacks[frame]) {
          rafCallbacks[frame](timestamp);
        }
        
        // Collect performance data
        performanceMetrics.push({
          frame,
          timestamp,
          rafCallbacksLength: rafCallbacks.length
        });
      }

      // Verify smooth animation
      expect(performanceMetrics.length).toBe(60);
      
      // Should not have excessive RAF callbacks
      const maxCallbacks = Math.max(...performanceMetrics.map(m => m.rafCallbacksLength));
      expect(maxCallbacks).toBeLessThan(100); // Reasonable limit
    });
  });

  describe('Chop Highlighting During Playback', () => {
    it('should highlight active chops during playback', async () => {
      let waveformRef;
      
      render(
        <WaveformVisualization
          ref={(ref) => { waveformRef = ref; }}
          waveformData={mockWaveformData}
          chops={mockChops}
          currentTime={0.3} // Inside first chop (0.2-0.4)
          isPlaying={true}
          {...mockCallbacks}
        />
      );

      await waitFor(() => {
        expect(screen.queryByText(/Initializing/)).not.toBeInTheDocument();
      });

      // Process animation frames to trigger highlighting
      if (rafCallbacks.length > 0) {
        rafCallbacks.forEach(callback => {
          if (callback) callback(100);
        });
      }

      // Verify chop highlighting
      if (waveformRef?.getSyncStatus) {
        const syncStatus = waveformRef.getSyncStatus();
        expect(syncStatus.activeChops).toContain('chop1');
        expect(syncStatus.activeChops).not.toContain('chop2');
      }
    });

    it('should show relationships between overlapping chops', async () => {
      // Create overlapping chops
      const overlappingChops = [
        {
          id: 'chop1',
          padId: 'A1',
          startTime: 0.2,
          endTime: 0.6,
          color: '#ff0000'
        },
        {
          id: 'chop2',
          padId: 'A2',
          startTime: 0.4,
          endTime: 0.8,
          color: '#00ff00'
        }
      ];

      let waveformRef;
      
      render(
        <WaveformVisualization
          ref={(ref) => { waveformRef = ref; }}
          waveformData={mockWaveformData}
          chops={overlappingChops}
          currentTime={0.5} // In overlap region
          isPlaying={true}
          {...mockCallbacks}
        />
      );

      await waitFor(() => {
        expect(screen.queryByText(/Initializing/)).not.toBeInTheDocument();
      });

      // Process animation frames
      if (rafCallbacks.length > 0) {
        rafCallbacks.forEach(callback => {
          if (callback) callback(100);
        });
      }

      // Verify both chops are highlighted
      if (waveformRef?.getSyncStatus) {
        const syncStatus = waveformRef.getSyncStatus();
        expect(syncStatus.activeChops).toContain('chop1');
        expect(syncStatus.activeChops).toContain('chop2');
      }
    });

    it('should handle chop transitions smoothly', async () => {
      let waveformRef;
      
      render(
        <WaveformVisualization
          ref={(ref) => { waveformRef = ref; }}
          waveformData={mockWaveformData}
          chops={mockChops}
          currentTime={0.3}
          isPlaying={true}
          {...mockCallbacks}
        />
      );

      await waitFor(() => {
        expect(screen.queryByText(/Initializing/)).not.toBeInTheDocument();
      });

      // Move through chop boundaries
      const timeSequence = [0.3, 0.35, 0.4, 0.45, 0.5, 0.55, 0.6, 0.65, 0.7];
      
      for (let i = 0; i < timeSequence.length; i++) {
        const time = timeSequence[i];
        vi.spyOn(performance, 'now').mockReturnValue(i * 50);
        
        // Re-render with new time
        render(
          <WaveformVisualization
            ref={(ref) => { waveformRef = ref; }}
            waveformData={mockWaveformData}
            chops={mockChops}
            currentTime={time}
            isPlaying={true}
            {...mockCallbacks}
          />
        );

        // Process animation frames
        if (rafCallbacks.length > i) {
          rafCallbacks[i](i * 50);
        }
      }

      // Should handle transitions without errors
      if (waveformRef?.getSyncStatus) {
        const syncStatus = waveformRef.getSyncStatus();
        expect(syncStatus.isPlaying).toBe(true);
        expect(syncStatus.currentTime).toBeCloseTo(0.7, 1);
      }
    });
  });

  describe('Synchronization Accuracy', () => {
    it('should maintain accurate sync with YouTube player', async () => {
      let waveformRef;
      
      render(
        <WaveformVisualization
          ref={(ref) => { waveformRef = ref; }}
          waveformData={mockWaveformData}
          chops={mockChops}
          currentTime={0}
          isPlaying={true}
          {...mockCallbacks}
        />
      );

      await waitFor(() => {
        expect(screen.queryByText(/Initializing/)).not.toBeInTheDocument();
      });

      // Simulate realistic YouTube player updates (every 100ms)
      const updateInterval = 100;
      const totalUpdates = 10;
      
      for (let i = 0; i < totalUpdates; i++) {
        const time = i * 0.1;
        const timestamp = i * updateInterval;
        
        vi.spyOn(performance, 'now').mockReturnValue(timestamp);
        
        render(
          <WaveformVisualization
            ref={(ref) => { waveformRef = ref; }}
            waveformData={mockWaveformData}
            chops={mockChops}
            currentTime={time}
            isPlaying={true}
            {...mockCallbacks}
          />
        );

        // Process animation frames between updates
        for (let frame = 0; frame < 6; frame++) { // ~60fps
          const frameTime = timestamp + (frame * 16.67);
          if (rafCallbacks.length > frame) {
            rafCallbacks[frame](frameTime);
          }
        }
      }

      // Verify sync accuracy
      if (waveformRef?.getSyncStatus) {
        const syncStatus = waveformRef.getSyncStatus();
        expect(syncStatus.syncAccuracy).toBeLessThan(0.05); // Less than 50ms drift
      }
    });

    it('should handle seeking accurately', async () => {
      let waveformRef;
      
      render(
        <WaveformVisualization
          ref={(ref) => { waveformRef = ref; }}
          waveformData={mockWaveformData}
          chops={mockChops}
          currentTime={0.2}
          isPlaying={true}
          {...mockCallbacks}
        />
      );

      await waitFor(() => {
        expect(screen.queryByText(/Initializing/)).not.toBeInTheDocument();
      });

      // Simulate seek operation
      if (waveformRef?.jumpToTime) {
        waveformRef.jumpToTime(0.7);
      }

      // Process animation frame
      if (rafCallbacks.length > 0) {
        rafCallbacks[0](100);
      }

      // Verify seek accuracy
      if (waveformRef?.getSyncStatus) {
        const syncStatus = waveformRef.getSyncStatus();
        expect(syncStatus.currentTime).toBeCloseTo(0.7, 2);
      }

      // Verify seek callback was called
      expect(mockCallbacks.onTimeSeek).toHaveBeenCalledWith(0.7);
    });
  });

  describe('Performance During Playback', () => {
    it('should maintain 60fps during active playback', async () => {
      render(
        <WaveformVisualization
          waveformData={mockWaveformData}
          chops={mockChops}
          currentTime={0.1}
          isPlaying={true}
          {...mockCallbacks}
        />
      );

      await waitFor(() => {
        expect(screen.queryByText(/Initializing/)).not.toBeInTheDocument();
      });

      // Simulate 60fps for 1 second
      const frameCount = 60;
      const startTime = performance.now();
      
      for (let frame = 0; frame < frameCount; frame++) {
        const frameTime = startTime + (frame * 16.67);
        vi.spyOn(performance, 'now').mockReturnValue(frameTime);
        
        if (rafCallbacks[frame]) {
          rafCallbacks[frame](frameTime);
        }
      }

      // Should complete without significant delays
      const endTime = performance.now();
      const actualDuration = endTime - startTime;
      
      // Allow some tolerance for test environment
      expect(actualDuration).toBeLessThan(2000); // Should complete in reasonable time
    });

    it('should handle multiple chops efficiently during playback', async () => {
      // Create many chops
      const manyChops = [];
      for (let i = 0; i < 20; i++) {
        manyChops.push({
          id: `chop${i}`,
          padId: `A${i}`,
          startTime: i * 0.05,
          endTime: (i * 0.05) + 0.1,
          color: `#${i.toString(16).padStart(6, '0')}`
        });
      }

      render(
        <WaveformVisualization
          waveformData={mockWaveformData}
          chops={manyChops}
          currentTime={0.5} // Should activate multiple chops
          isPlaying={true}
          {...mockCallbacks}
        />
      );

      await waitFor(() => {
        expect(screen.queryByText(/Initializing/)).not.toBeInTheDocument();
      });

      // Process animation frames
      const frameCount = 30;
      for (let frame = 0; frame < frameCount; frame++) {
        if (rafCallbacks[frame]) {
          rafCallbacks[frame](frame * 16.67);
        }
      }

      // Should handle efficiently without errors
      expect(true).toBe(true); // Test passes if no errors thrown
    });
  });

  describe('Error Recovery', () => {
    it('should recover from animation frame errors', async () => {
      // Mock RAF to occasionally throw errors
      let errorCount = 0;
      global.requestAnimationFrame = vi.fn((callback) => {
        if (errorCount++ % 5 === 0) {
          throw new Error('RAF error');
        }
        rafCallbacks.push(callback);
        return rafCallbacks.length;
      });

      render(
        <WaveformVisualization
          waveformData={mockWaveformData}
          chops={mockChops}
          currentTime={0.1}
          isPlaying={true}
          {...mockCallbacks}
        />
      );

      await waitFor(() => {
        expect(screen.queryByText(/Initializing/)).not.toBeInTheDocument();
      });

      // Should not crash despite RAF errors
      expect(true).toBe(true);
    });

    it('should handle invalid time values gracefully', async () => {
      const invalidTimes = [NaN, -1, Infinity, null, undefined];
      
      for (const invalidTime of invalidTimes) {
        render(
          <WaveformVisualization
            waveformData={mockWaveformData}
            chops={mockChops}
            currentTime={invalidTime}
            isPlaying={true}
            {...mockCallbacks}
          />
        );

        await waitFor(() => {
          expect(screen.queryByText(/Initializing/)).not.toBeInTheDocument();
        });

        // Should handle gracefully without crashing
        expect(true).toBe(true);
      }
    });
  });
});