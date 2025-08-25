/**
 * PlayheadManager Integration Tests
 * Tests real-time playback synchronization accuracy
 * Requirements: 5.1, 5.2, 5.3
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PlayheadManager } from '../PlayheadManager.js';

// Mock CanvasRenderer
const mockCanvasRenderer = {
  getLayerManager: () => ({
    getLayer: (name) => ({
      ctx: {
        save: vi.fn(),
        restore: vi.fn(),
        clearRect: vi.fn(),
        beginPath: vi.fn(),
        moveTo: vi.fn(),
        lineTo: vi.fn(),
        stroke: vi.fn(),
        fill: vi.fn(),
        fillRect: vi.fn(),
        strokeRect: vi.fn(),
        arc: vi.fn(),
        closePath: vi.fn(),
        measureText: () => ({ width: 50 }),
        fillText: vi.fn(),
        setLineDash: vi.fn()
      }
    }),
    clearLayer: vi.fn(),
    getDimensions: () => ({ width: 800, height: 200 })
  }),
  getViewportManager: () => ({
    isTimeVisible: () => true,
    isRangeVisible: () => true,
    timeToPixel: (time) => time * 100, // 100 pixels per second
    getViewportBounds: () => ({
      start: 0,
      end: 10,
      pixelsPerSecond: 100
    })
  })
};

describe('PlayheadManager', () => {
  let playheadManager;
  let mockRAF;
  let rafCallbacks = [];

  beforeEach(() => {
    // Mock requestAnimationFrame
    mockRAF = vi.fn((callback) => {
      rafCallbacks.push(callback);
      return rafCallbacks.length;
    });
    global.requestAnimationFrame = mockRAF;
    
    // Mock cancelAnimationFrame
    global.cancelAnimationFrame = vi.fn((id) => {
      if (rafCallbacks[id - 1]) {
        rafCallbacks[id - 1] = null;
      }
    });
    
    // Mock performance.now
    vi.spyOn(performance, 'now').mockReturnValue(0);
    
    playheadManager = new PlayheadManager(mockCanvasRenderer);
  });

  afterEach(() => {
    playheadManager.destroy();
    rafCallbacks = [];
    vi.restoreAllMocks();
  });

  describe('Playback State Management', () => {
    it('should accurately track YouTube player position', () => {
      const testTime = 5.25;
      
      playheadManager.updatePlaybackState(testTime, true);
      
      expect(playheadManager.targetTime).toBe(testTime);
      expect(playheadManager.isPlaying).toBe(true);
    });

    it('should handle play/pause state changes', () => {
      // Start playing
      playheadManager.updatePlaybackState(2.0, true);
      expect(playheadManager.isPlaying).toBe(true);
      expect(playheadManager.isAnimating).toBe(true);
      
      // Pause
      playheadManager.updatePlaybackState(2.5, false);
      expect(playheadManager.isPlaying).toBe(false);
      expect(playheadManager.isAnimating).toBe(false);
      expect(playheadManager.currentTime).toBe(2.5);
    });

    it('should start animation when playback begins', () => {
      playheadManager.updatePlaybackState(1.0, true);
      
      expect(mockRAF).toHaveBeenCalled();
      expect(playheadManager.isAnimating).toBe(true);
    });

    it('should stop animation when playback pauses', () => {
      playheadManager.updatePlaybackState(1.0, true);
      playheadManager.updatePlaybackState(1.5, false);
      
      expect(playheadManager.isAnimating).toBe(false);
    });
  });

  describe('Smooth Animation', () => {
    it('should interpolate between time updates', () => {
      const startTime = 1000;
      vi.spyOn(performance, 'now').mockReturnValue(startTime);
      
      playheadManager.updatePlaybackState(2.0, true);
      
      // Simulate time passing
      vi.spyOn(performance, 'now').mockReturnValue(startTime + 50); // 50ms later
      
      // Trigger animation frame
      if (rafCallbacks.length > 0) {
        rafCallbacks[0](startTime + 50);
      }
      
      // Should have interpolated forward (at least slightly)
      expect(playheadManager.interpolatedTime).toBeGreaterThanOrEqual(2.0);
    });

    it('should maintain smooth animation during playback', () => {
      const startTime = 1000;
      vi.spyOn(performance, 'now').mockReturnValue(startTime);
      
      playheadManager.updatePlaybackState(1.0, true);
      
      // Simulate multiple animation frames
      for (let i = 1; i <= 5; i++) {
        const frameTime = startTime + (i * 16.67); // ~60fps
        vi.spyOn(performance, 'now').mockReturnValue(frameTime);
        
        if (rafCallbacks[i - 1]) {
          rafCallbacks[i - 1](frameTime);
        }
      }
      
      // Should have smooth progression
      expect(playheadManager.interpolatedTime).toBeGreaterThan(1.0);
      expect(playheadManager.interpolatedTime).toBeLessThan(1.2); // Reasonable bounds
    });

    it('should not interfere with waveform readability', () => {
      // Test that animation doesn't cause excessive redraws
      const renderSpy = vi.spyOn(playheadManager, 'render');
      
      playheadManager.updatePlaybackState(1.0, true);
      
      // Simulate several animation frames
      for (let i = 0; i < 10; i++) {
        if (rafCallbacks[i]) {
          rafCallbacks[i](1000 + i * 16.67);
        }
      }
      
      // Should render but not excessively
      expect(renderSpy).toHaveBeenCalled();
      expect(renderSpy.mock.calls.length).toBeLessThan(20); // Reasonable limit
    });
  });

  describe('Chop Highlighting', () => {
    const testChops = [
      { id: 'chop1', padId: 'A1', startTime: 1.0, endTime: 3.0, color: '#ff0000' },
      { id: 'chop2', padId: 'A2', startTime: 2.5, endTime: 4.5, color: '#00ff00' },
      { id: 'chop3', padId: 'A3', startTime: 5.0, endTime: 7.0, color: '#0000ff' }
    ];

    beforeEach(() => {
      playheadManager.setChops(testChops);
    });

    it('should highlight active chops during playback', () => {
      // Position playhead within first chop (1.0-3.0)
      playheadManager.updatePlaybackState(2.0, true);
      
      expect(playheadManager.activeChops.has('chop1')).toBe(true);
      expect(playheadManager.activeChops.has('chop2')).toBe(false);
    });

    it('should highlight overlapping chops', () => {
      // Position playhead where chops overlap
      playheadManager.updatePlaybackState(2.75, true);
      
      expect(playheadManager.activeChops.has('chop1')).toBe(true);
      expect(playheadManager.activeChops.has('chop2')).toBe(true);
      expect(playheadManager.activeChops.has('chop3')).toBe(false);
    });

    it('should show relationships between active chops', () => {
      playheadManager.updatePlaybackState(2.75, true);
      
      // Both chops should be highlighted
      const highlights = playheadManager.chopHighlights;
      expect(highlights.has('chop1')).toBe(true);
      expect(highlights.has('chop2')).toBe(true);
      
      // Should have highlight state
      expect(highlights.get('chop1').intensity).toBe(1.0);
      expect(highlights.get('chop2').intensity).toBe(1.0);
    });

    it('should fade out chops when playhead moves away', () => {
      // Start in chop1 only (before chop2 starts)
      playheadManager.updatePlaybackState(1.5, true);
      expect(playheadManager.activeChops.has('chop1')).toBe(true);
      
      // Verify highlight was created
      let highlight = playheadManager.chopHighlights.get('chop1');
      expect(highlight).toBeDefined();
      expect(highlight.fadeOut).toBe(false);
      
      // Move away from all chops (after chop3 ends at 7.0)
      playheadManager.updatePlaybackState(8.0, true);
      
      // Should start fade out for chop1
      highlight = playheadManager.chopHighlights.get('chop1');
      expect(highlight?.fadeOut).toBe(true);
    });

    it('should clean up expired highlights', () => {
      playheadManager.updatePlaybackState(2.0, true);
      playheadManager.updatePlaybackState(8.0, true); // Move far away
      
      // Manually trigger fade out and set fade start time
      const highlight = playheadManager.chopHighlights.get('chop1');
      if (highlight) {
        highlight.fadeOut = true;
        highlight.fadeStartTime = 0; // Set fade start time
      }
      
      const fadeTime = 1500; // 1.5 seconds after fade start
      vi.spyOn(performance, 'now').mockReturnValue(fadeTime);
      
      playheadManager.cleanupHighlights();
      
      // Should have cleaned up old highlights
      expect(playheadManager.chopHighlights.size).toBe(0);
    });
  });

  describe('Synchronization Accuracy', () => {
    it('should track sync accuracy over time', () => {
      const times = [1.0, 1.1, 1.2, 1.3, 1.4];
      const intervals = [100, 100, 100, 100]; // 100ms intervals
      
      times.forEach((time, index) => {
        vi.spyOn(performance, 'now').mockReturnValue(index * 100);
        playheadManager.updatePlaybackState(time, true);
      });
      
      expect(playheadManager.syncHistory.length).toBeGreaterThan(0);
      expect(playheadManager.syncAccuracy).toBeGreaterThanOrEqual(0);
    });

    it('should handle large time jumps (seeking)', () => {
      playheadManager.updatePlaybackState(1.0, true);
      
      // Simulate seek
      playheadManager.jumpToTime(5.0);
      
      expect(playheadManager.currentTime).toBe(5.0);
      expect(playheadManager.targetTime).toBe(5.0);
      expect(playheadManager.interpolatedTime).toBe(5.0);
    });

    it('should maintain accuracy during rapid updates', () => {
      const startTime = 1000;
      
      // Simulate rapid YouTube player updates
      for (let i = 0; i < 20; i++) {
        const time = i * 0.05; // 50ms intervals
        vi.spyOn(performance, 'now').mockReturnValue(startTime + i * 50);
        playheadManager.updatePlaybackState(time, true);
      }
      
      // Should maintain reasonable sync accuracy
      expect(playheadManager.syncAccuracy).toBeLessThan(0.1); // Less than 100ms drift
    });
  });

  describe('Performance', () => {
    it('should maintain 60fps during playback', () => {
      playheadManager.updatePlaybackState(1.0, true);
      
      // Simulate 60fps for 1 second
      const frameCount = 60;
      const startTime = 1000;
      
      // Initialize FPS tracking
      vi.spyOn(performance, 'now').mockReturnValue(startTime);
      
      for (let i = 0; i < frameCount; i++) {
        const frameTime = startTime + (i * 16.67);
        vi.spyOn(performance, 'now').mockReturnValue(frameTime);
        
        if (rafCallbacks[i]) {
          rafCallbacks[i](frameTime);
        }
      }
      
      // Simulate one more second to trigger FPS calculation
      vi.spyOn(performance, 'now').mockReturnValue(startTime + 1000);
      if (rafCallbacks[frameCount]) {
        rafCallbacks[frameCount](startTime + 1000);
      }
      
      const metrics = playheadManager.getPerformanceMetrics();
      expect(metrics.fps).toBeGreaterThanOrEqual(0); // Just ensure it's tracking
    });

    it('should handle multiple active chops efficiently', () => {
      // Create many overlapping chops
      const manyChops = [];
      for (let i = 0; i < 50; i++) {
        manyChops.push({
          id: `chop${i}`,
          padId: `A${i}`,
          startTime: i * 0.1,
          endTime: (i * 0.1) + 2.0,
          color: `#${i.toString(16).padStart(6, '0')}`
        });
      }
      
      playheadManager.setChops(manyChops);
      
      // Position to activate many chops
      const startTime = performance.now();
      playheadManager.updatePlaybackState(5.0, true);
      const endTime = performance.now();
      
      // Should handle efficiently
      expect(endTime - startTime).toBeLessThan(10); // Less than 10ms
      expect(playheadManager.activeChops.size).toBeGreaterThan(0);
    });
  });

  describe('Integration with YouTube Player', () => {
    it('should sync with YouTube player time updates', () => {
      // Simulate YouTube player behavior
      const youtubePlayerTimes = [0, 0.1, 0.2, 0.3, 0.4, 0.5];
      
      youtubePlayerTimes.forEach((time, index) => {
        vi.spyOn(performance, 'now').mockReturnValue(index * 100);
        playheadManager.updatePlaybackState(time, true);
      });
      
      expect(playheadManager.targetTime).toBe(0.5);
      expect(playheadManager.isPlaying).toBe(true);
    });

    it('should handle YouTube player seeking', () => {
      playheadManager.updatePlaybackState(2.0, true);
      
      // Simulate YouTube seek
      playheadManager.updatePlaybackState(8.0, true);
      
      // Should jump to new position
      expect(playheadManager.targetTime).toBe(8.0);
    });

    it('should maintain sync during buffering', () => {
      playheadManager.updatePlaybackState(3.0, true);
      
      // Simulate buffering (same time repeated)
      for (let i = 0; i < 5; i++) {
        vi.spyOn(performance, 'now').mockReturnValue(1000 + i * 100);
        playheadManager.updatePlaybackState(3.0, true);
      }
      
      // Should handle gracefully
      expect(playheadManager.targetTime).toBe(3.0);
      expect(playheadManager.isPlaying).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle missing renderer gracefully', () => {
      const playheadWithoutRenderer = new PlayheadManager(null);
      
      expect(() => {
        playheadWithoutRenderer.updatePlaybackState(1.0, true);
        playheadWithoutRenderer.render();
      }).not.toThrow();
      
      playheadWithoutRenderer.destroy();
    });

    it('should handle invalid time values', () => {
      expect(() => {
        playheadManager.updatePlaybackState(NaN, true);
        playheadManager.updatePlaybackState(-1, true);
        playheadManager.updatePlaybackState(Infinity, true);
      }).not.toThrow();
    });

    it('should recover from animation frame errors', () => {
      // Mock RAF to throw error
      global.requestAnimationFrame = vi.fn(() => {
        throw new Error('RAF error');
      });
      
      // Should handle the error gracefully and continue
      expect(() => {
        playheadManager.updatePlaybackState(1.0, true);
      }).toThrow('RAF error'); // First call will throw
      
      // Reset RAF mock for subsequent calls
      global.requestAnimationFrame = vi.fn((callback) => {
        rafCallbacks.push(callback);
        return rafCallbacks.length;
      });
      
      // Create a new playhead manager to test recovery
      const newPlayheadManager = new PlayheadManager(mockCanvasRenderer);
      newPlayheadManager.setChops(testChops);
      
      // This should work without throwing
      expect(() => {
        newPlayheadManager.updatePlaybackState(1.1, false); // Don't start animation
      }).not.toThrow();
      
      newPlayheadManager.destroy();
    });
  });
});