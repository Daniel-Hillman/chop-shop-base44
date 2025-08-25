import { describe, it, expect, beforeEach, vi } from 'vitest';
import ViewportManager from '../ViewportManager';

describe('ViewportManager', () => {
  let viewportManager;
  let mockListener;

  beforeEach(() => {
    mockListener = vi.fn();
    viewportManager = new ViewportManager({
      canvasDimensions: { width: 800, height: 200 },
      audioDuration: 120 // 2 minutes
    });
  });

  describe('Initialization', () => {
    it('should initialize with default state', () => {
      const state = viewportManager.getState();
      
      expect(state.zoomLevel).toBe(1.0);
      expect(state.centerTime).toBe(0);
      expect(state.canvasDimensions).toEqual({ width: 800, height: 200 });
      expect(state.audioDuration).toBe(120);
      expect(state.minZoom).toBe(0.1);
      expect(state.maxZoom).toBe(100);
    });

    it('should calculate initial visible range correctly', () => {
      const state = viewportManager.getState();
      
      // At zoom level 1, with 800px width and 100 pixels per second base
      // Visible duration should be 8 seconds
      expect(state.visibleTimeRange.start).toBe(0);
      expect(state.visibleTimeRange.end).toBe(8);
      expect(state.pixelsPerSecond).toBe(100);
    });

    it('should accept custom initial state', () => {
      const customManager = new ViewportManager({
        zoomLevel: 2.0,
        centerTime: 60,
        minZoom: 0.5,
        maxZoom: 50
      });
      
      const state = customManager.getState();
      expect(state.zoomLevel).toBe(2.0);
      expect(state.centerTime).toBe(60);
      expect(state.minZoom).toBe(0.5);
      expect(state.maxZoom).toBe(50);
    });
  });

  describe('Listener Management', () => {
    it('should add and notify listeners', () => {
      const removeListener = viewportManager.addListener(mockListener);
      
      viewportManager.setZoom(2.0);
      
      expect(mockListener).toHaveBeenCalledWith(
        expect.objectContaining({ zoomLevel: 2.0 })
      );
      
      // Should return removal function
      expect(typeof removeListener).toBe('function');
    });

    it('should remove listeners properly', () => {
      const removeListener = viewportManager.addListener(mockListener);
      
      removeListener();
      viewportManager.setZoom(2.0);
      
      expect(mockListener).not.toHaveBeenCalled();
    });

    it('should handle multiple listeners', () => {
      const listener1 = vi.fn();
      const listener2 = vi.fn();
      
      viewportManager.addListener(listener1);
      viewportManager.addListener(listener2);
      
      viewportManager.setZoom(2.0);
      
      expect(listener1).toHaveBeenCalled();
      expect(listener2).toHaveBeenCalled();
    });
  });

  describe('Canvas Dimensions', () => {
    it('should update canvas dimensions and recalculate viewport', () => {
      viewportManager.addListener(mockListener);
      
      viewportManager.setCanvasDimensions(1000, 300);
      
      const state = viewportManager.getState();
      expect(state.canvasDimensions).toEqual({ width: 1000, height: 300 });
      expect(mockListener).toHaveBeenCalled();
      
      // Visible range should update based on new width
      expect(state.visibleTimeRange.end).toBe(10); // 1000px / 100 pixels per second
    });

    it('should handle zero dimensions gracefully', () => {
      viewportManager.setCanvasDimensions(0, 0);
      
      const state = viewportManager.getState();
      expect(state.canvasDimensions).toEqual({ width: 0, height: 0 });
      expect(state.visibleTimeRange.start).toBe(0);
      expect(state.visibleTimeRange.end).toBe(0);
    });
  });

  describe('Audio Duration', () => {
    it('should update audio duration and adjust center time if needed', () => {
      viewportManager.setZoom(1.0, 150); // Center beyond new duration
      viewportManager.setAudioDuration(100);
      
      const state = viewportManager.getState();
      expect(state.audioDuration).toBe(100);
      expect(state.centerTime).toBe(50); // Should be adjusted to duration/2
    });

    it('should keep center time if within new duration', () => {
      viewportManager.setZoom(1.0, 30);
      viewportManager.setAudioDuration(100);
      
      const state = viewportManager.getState();
      expect(state.centerTime).toBe(30); // Should remain unchanged
    });
  });

  describe('Zoom Operations', () => {
    it('should set zoom level within bounds', () => {
      viewportManager.setZoom(2.0);
      
      const state = viewportManager.getState();
      expect(state.zoomLevel).toBe(2.0);
      expect(state.pixelsPerSecond).toBe(200); // 100 * 2.0
    });

    it('should clamp zoom level to bounds', () => {
      viewportManager.setZoom(0.05); // Below minimum
      expect(viewportManager.getState().zoomLevel).toBe(0.1);
      
      viewportManager.setZoom(200); // Above maximum
      expect(viewportManager.getState().zoomLevel).toBe(100);
    });

    it('should zoom in by factor', () => {
      viewportManager.setZoom(1.0);
      viewportManager.zoomIn(2);
      
      expect(viewportManager.getState().zoomLevel).toBe(2.0);
    });

    it('should zoom out by factor', () => {
      viewportManager.setZoom(4.0);
      viewportManager.zoomOut(2);
      
      expect(viewportManager.getState().zoomLevel).toBe(2.0);
    });

    it('should zoom to fit entire duration', () => {
      viewportManager.zoomToFit();
      
      const state = viewportManager.getState();
      // 800px width, 120s duration -> 800/120 = 6.67 pixels per second
      // Zoom level = 6.67/100 = 0.0667, but clamped to minZoom (0.1)
      expect(state.zoomLevel).toBe(0.1); // Should be clamped to minimum
      expect(state.centerTime).toBe(60); // Middle of duration
    });

    it('should handle zoom to fit with zero duration', () => {
      viewportManager.setAudioDuration(0);
      const initialZoom = viewportManager.getState().zoomLevel;
      
      viewportManager.zoomToFit();
      
      expect(viewportManager.getState().zoomLevel).toBe(initialZoom);
    });
  });

  describe('Pan Operations', () => {
    it('should pan to specific time', () => {
      viewportManager.panToTime(60);
      
      const state = viewportManager.getState();
      expect(state.centerTime).toBe(60);
    });

    it('should clamp pan time to audio bounds', () => {
      viewportManager.panToTime(-10);
      expect(viewportManager.getState().centerTime).toBe(0);
      
      viewportManager.panToTime(150);
      expect(viewportManager.getState().centerTime).toBe(120);
    });

    it('should pan by relative time', () => {
      viewportManager.panToTime(30);
      viewportManager.panBy(10);
      
      expect(viewportManager.getState().centerTime).toBe(40);
    });

    it('should pan by pixels', () => {
      viewportManager.setZoom(1.0); // 100 pixels per second
      viewportManager.panToTime(30);
      viewportManager.panByPixels(100); // Should move 1 second
      
      expect(viewportManager.getState().centerTime).toBe(31);
    });
  });

  describe('Coordinate Conversion', () => {
    beforeEach(() => {
      // Set up known viewport state
      viewportManager.setZoom(1.0, 60); // Center at 60s, zoom 1x
      // This should show 56s to 64s (8 second window)
    });

    it('should convert time to pixel correctly', () => {
      const pixel = viewportManager.timeToPixel(60); // Center time
      expect(pixel).toBe(400); // Middle of 800px canvas
      
      const leftPixel = viewportManager.timeToPixel(56); // Start of visible range
      expect(leftPixel).toBe(0);
      
      const rightPixel = viewportManager.timeToPixel(64); // End of visible range
      expect(rightPixel).toBe(800);
    });

    it('should convert pixel to time correctly', () => {
      const time = viewportManager.pixelToTime(400); // Middle pixel
      expect(time).toBe(60); // Should be center time
      
      const leftTime = viewportManager.pixelToTime(0);
      expect(leftTime).toBe(56); // Start of visible range
      
      const rightTime = viewportManager.pixelToTime(800);
      expect(rightTime).toBe(64); // End of visible range
    });

    it('should handle edge cases in conversion', () => {
      // Test with zero visible duration
      viewportManager.setCanvasDimensions(0, 200);
      expect(viewportManager.timeToPixel(60)).toBe(0);
      expect(viewportManager.pixelToTime(0)).toBe(60);
    });
  });

  describe('Visibility Checks', () => {
    beforeEach(() => {
      viewportManager.setZoom(1.0, 60); // Shows 56s to 64s
    });

    it('should check if time is visible', () => {
      expect(viewportManager.isTimeVisible(60)).toBe(true);
      expect(viewportManager.isTimeVisible(56)).toBe(true);
      expect(viewportManager.isTimeVisible(64)).toBe(true);
      expect(viewportManager.isTimeVisible(50)).toBe(false);
      expect(viewportManager.isTimeVisible(70)).toBe(false);
    });

    it('should check if range is visible', () => {
      expect(viewportManager.isRangeVisible(58, 62)).toBe(true); // Fully inside
      expect(viewportManager.isRangeVisible(54, 58)).toBe(true); // Overlaps start
      expect(viewportManager.isRangeVisible(62, 66)).toBe(true); // Overlaps end
      expect(viewportManager.isRangeVisible(50, 70)).toBe(true); // Contains viewport
      expect(viewportManager.isRangeVisible(40, 50)).toBe(false); // Before viewport
      expect(viewportManager.isRangeVisible(70, 80)).toBe(false); // After viewport
    });
  });

  describe('Utility Methods', () => {
    it('should get viewport bounds', () => {
      viewportManager.setZoom(2.0, 60);
      const bounds = viewportManager.getViewportBounds();
      
      expect(bounds).toHaveProperty('start');
      expect(bounds).toHaveProperty('end');
      expect(bounds).toHaveProperty('duration');
      expect(bounds).toHaveProperty('pixelsPerSecond');
      expect(bounds.duration).toBe(bounds.end - bounds.start);
    });

    it('should reset to default state', () => {
      viewportManager.setZoom(5.0, 90);
      viewportManager.reset();
      
      const state = viewportManager.getState();
      expect(state.zoomLevel).toBe(1.0);
      expect(state.centerTime).toBe(60); // audioDuration / 2
    });

    it('should set zoom and pan limits', () => {
      viewportManager.setLimits({ minZoom: 0.5, maxZoom: 20 });
      
      const state = viewportManager.getState();
      expect(state.minZoom).toBe(0.5);
      expect(state.maxZoom).toBe(20);
      
      // Should clamp current zoom if outside new limits
      viewportManager.setZoom(0.1); // Below new minimum
      expect(viewportManager.getState().zoomLevel).toBe(0.5);
    });

    it('should calculate zoom for range', () => {
      const zoom = viewportManager.calculateZoomForRange(50, 60, 0.1);
      
      // Range is 10s, with 10% padding = 12s total
      // 800px / 12s = 66.67 pixels per second
      // Zoom = 66.67 / 100 = 0.667
      expect(zoom).toBeCloseTo(0.667, 3);
    });

    it('should zoom to range', () => {
      viewportManager.zoomToRange(50, 70, 0.1);
      
      const state = viewportManager.getState();
      expect(state.centerTime).toBe(60); // Middle of range
      
      // Should zoom to show the range with padding
      const visibleDuration = state.visibleTimeRange.end - state.visibleTimeRange.start;
      expect(visibleDuration).toBeGreaterThan(20); // Range + padding
    });
  });

  describe('Edge Cases', () => {
    it('should handle very small zoom levels', () => {
      viewportManager.setZoom(0.001);
      
      const state = viewportManager.getState();
      expect(state.zoomLevel).toBe(0.1); // Should be clamped to minimum
    });

    it('should handle very large zoom levels', () => {
      viewportManager.setZoom(1000);
      
      const state = viewportManager.getState();
      expect(state.zoomLevel).toBe(100); // Should be clamped to maximum
    });

    it('should handle zero audio duration', () => {
      viewportManager.setAudioDuration(0);
      viewportManager.panToTime(10);
      
      const state = viewportManager.getState();
      expect(state.centerTime).toBe(10); // Should not be clamped when duration is 0
    });

    it('should handle negative times gracefully', () => {
      viewportManager.panToTime(-10);
      
      const state = viewportManager.getState();
      expect(state.centerTime).toBe(0); // Should be clamped to 0
    });
  });
});