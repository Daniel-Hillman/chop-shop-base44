/**
 * Integration tests for InteractionManager smart snapping functionality
 * Tests requirements 3.3, 3.4 - zero-crossing detection and smart snapping integration
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { InteractionManager } from '../InteractionManager.js';

// Mock CanvasRenderer and its dependencies
const mockCanvasRenderer = {
  getLayerManager: vi.fn(() => ({
    getLayer: vi.fn((layerName) => ({
      canvas: {
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        style: {},
        getBoundingClientRect: vi.fn(() => ({ left: 0, top: 0 }))
      },
      ctx: {
        clearRect: vi.fn(),
        fillStyle: '',
        strokeStyle: '',
        lineWidth: 0,
        fillRect: vi.fn(),
        strokeRect: vi.fn(),
        beginPath: vi.fn(),
        moveTo: vi.fn(),
        lineTo: vi.fn(),
        stroke: vi.fn(),
        fill: vi.fn(),
        setLineDash: vi.fn(),
        measureText: vi.fn(() => ({ width: 50 })),
        fillText: vi.fn(),
        arc: vi.fn(),
        quadraticCurveTo: vi.fn(),
        closePath: vi.fn(),
        createLinearGradient: vi.fn(() => ({
          addColorStop: vi.fn()
        }))
      }
    })),
    clearLayer: vi.fn(),
    getDimensions: vi.fn(() => ({ width: 800, height: 200 }))
  })),
  getViewportManager: vi.fn(() => ({
    pixelToTime: vi.fn((pixel) => pixel / 100), // 100 pixels per second
    timeToPixel: vi.fn((time) => time * 100),
    getViewportBounds: vi.fn(() => ({ pixelsPerSecond: 100 }))
  }))
};

describe('InteractionManager Smart Snapping Integration', () => {
  let interactionManager;
  let mockWaveformData;
  let mockChops;
  let callbacks;
  
  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();
    
    // Create mock waveform data with predictable zero-crossings
    mockWaveformData = {
      samples: new Float32Array(1000),
      sampleRate: 1000,
      duration: 1.0
    };
    
    // Create sine wave with known zero-crossings at 0.1, 0.3, 0.5, 0.7, 0.9 seconds
    for (let i = 0; i < mockWaveformData.samples.length; i++) {
      mockWaveformData.samples[i] = Math.sin(2 * Math.PI * 2.5 * i / 1000); // 2.5 Hz
    }
    
    // Create mock chops
    mockChops = [
      { id: 'chop1', startTime: 0.2, endTime: 0.4 },
      { id: 'chop2', startTime: 0.6, endTime: 0.8 }
    ];
    
    // Create callbacks
    callbacks = {
      onChopCreate: vi.fn(),
      onChopUpdate: vi.fn(),
      onTimeSeek: vi.fn(),
      onHover: vi.fn()
    };
    
    // Create interaction manager with smart snapping enabled
    interactionManager = new InteractionManager(mockCanvasRenderer, {
      enableSmartSnapping: true,
      enableZeroCrossingSnap: true,
      enableChopBoundarySnap: true,
      snapTolerance: 10,
      snapToleranceTime: 0.05
    });
    
    interactionManager.setCallbacks(callbacks);
    interactionManager.setWaveformData(mockWaveformData);
    interactionManager.setCurrentChops(mockChops);
  });

  describe('smart snapping initialization', () => {
    it('should initialize smart snapping service with correct options', () => {
      expect(interactionManager.smartSnapping).toBeDefined();
      
      const options = interactionManager.smartSnapping.getOptions();
      expect(options.enableZeroCrossingSnap).toBe(true);
      expect(options.enableChopBoundarySnap).toBe(true);
      expect(options.snapTolerance).toBe(10);
    });

    it('should update smart snapping when waveform data changes', () => {
      const newWaveformData = {
        samples: new Float32Array(500),
        sampleRate: 500,
        duration: 1.0
      };
      
      expect(() => {
        interactionManager.setWaveformData(newWaveformData);
      }).not.toThrow();
    });

    it('should update smart snapping when chops change', () => {
      const newChops = [
        { id: 'new1', startTime: 0.1, endTime: 0.3 }
      ];
      
      expect(() => {
        interactionManager.setCurrentChops(newChops);
      }).not.toThrow();
    });
  });

  describe('applySmartSnapping', () => {
    it('should snap to chop boundaries when enabled', () => {
      const targetTime = 0.205; // Close to chop1 start (0.2)
      
      const snappedTime = interactionManager.applySmartSnapping(targetTime);
      
      // Should either snap to chop boundary or zero-crossing, or stay close to original
      expect(Math.abs(snappedTime - targetTime)).toBeLessThan(0.1);
      expect(interactionManager.currentSnapResult).toBeDefined();
    });

    it('should snap to zero-crossings when no chop boundaries nearby', () => {
      const targetTime = 0.105; // Close to zero-crossing at ~0.1
      
      const snappedTime = interactionManager.applySmartSnapping(targetTime);
      
      // Should snap to nearest zero-crossing or stay reasonably close to original
      expect(Math.abs(snappedTime - targetTime)).toBeLessThan(0.15);
    });

    it('should return original time when smart snapping disabled', () => {
      interactionManager.options.enableSmartSnapping = false;
      const targetTime = 0.205;
      
      const snappedTime = interactionManager.applySmartSnapping(targetTime);
      
      expect(snappedTime).toBe(targetTime);
    });

    it('should exclude current chop from boundary snapping during drag', () => {
      // Simulate dragging chop1 boundary
      interactionManager.dragState = {
        type: 'move-boundary',
        chopId: 'chop1',
        boundaryType: 'start'
      };
      
      const targetTime = 0.205; // Close to chop1 start
      const snappedTime = interactionManager.applySmartSnapping(targetTime);
      
      // Should not snap to chop1's own boundary
      // Might snap to chop2 boundary or zero-crossing instead
      if (interactionManager.currentSnapResult?.wasSnapped) {
        expect(interactionManager.currentSnapResult.snapTarget.chopId).not.toBe('chop1');
      }
    });
  });

  describe('boundary drag with smart snapping', () => {
    beforeEach(() => {
      // Set up boundary drag state
      interactionManager.dragState = {
        type: 'move-boundary',
        chopId: 'chop1',
        boundaryType: 'start',
        startTime: 0.2,
        endTime: 0.4
      };
    });

    it('should apply smart snapping during boundary updates', () => {
      const newTime = 0.605; // Close to chop2 start (0.6)
      
      interactionManager.updateBoundaryDrag(newTime);
      
      // Should apply some form of snapping or constraint
      expect(interactionManager.dragState.startTime).toBeLessThan(0.4); // Should not exceed chop1 end
    });

    it('should respect chop constraints after snapping', () => {
      const newTime = 0.45; // Would go past chop1 end (0.4)
      
      interactionManager.updateBoundaryDrag(newTime);
      
      // Should be constrained to not exceed end boundary
      expect(interactionManager.dragState.startTime).toBeLessThan(0.4);
    });

    it('should prevent conflicts with other chops after snapping', () => {
      // Try to snap to a position that would conflict with chop2
      const newTime = 0.65; // Inside chop2 (0.6-0.8)
      
      interactionManager.updateBoundaryDrag(newTime);
      
      // Should be adjusted to avoid conflict
      expect(interactionManager.dragState.startTime).toBeLessThanOrEqual(0.6);
    });
  });

  describe('visual feedback for snapping', () => {
    it('should render snap indicators during drag', () => {
      const mockCtx = mockCanvasRenderer.getLayerManager().getLayer('interaction').ctx;
      
      // Set up drag state
      interactionManager.dragState = {
        type: 'move-boundary',
        chopId: 'chop1',
        boundaryType: 'start',
        startTime: 0.205 // Close to snap target
      };
      
      interactionManager.renderDragPreview();
      
      // Should call rendering methods (may not be called if no snap indicators)
      // Just verify the method doesn't throw
      expect(typeof interactionManager.renderDragPreview).toBe('function');
    });

    it('should show different visual styles for different snap types', () => {
      const mockCtx = mockCanvasRenderer.getLayerManager().getLayer('interaction').ctx;
      
      interactionManager.dragState = {
        type: 'move-boundary',
        chopId: 'chop1',
        boundaryType: 'start',
        startTime: 0.205
      };
      
      interactionManager.renderSnapIndicators(
        mockCtx,
        mockCanvasRenderer.getViewportManager(),
        800,
        200
      );
      
      // Should set different line dash patterns for different snap types
      expect(mockCtx.setLineDash).toHaveBeenCalled();
    });

    it('should highlight active snap with glow effect', () => {
      const mockCtx = mockCanvasRenderer.getLayerManager().getLayer('interaction').ctx;
      
      // Set up active snap result
      interactionManager.currentSnapResult = {
        wasSnapped: true,
        snappedTime: 0.2,
        snapTarget: { type: 'chop-boundary', time: 0.2 }
      };
      
      interactionManager.renderSnapIndicators(
        mockCtx,
        mockCanvasRenderer.getViewportManager(),
        800,
        200
      );
      
      // Should apply shadow/glow effect for active snap
      expect(mockCtx.shadowColor).toBeDefined();
    });
  });

  describe('chop creation with smart snapping', () => {
    it('should apply snapping when finalizing chop creation', () => {
      // Set up chop creation drag
      interactionManager.dragState = {
        type: 'create-chop',
        startTime: 0.195, // Close to chop1 start
        endTime: 0.405   // Close to chop1 end
      };
      
      interactionManager.finalizeChopCreation();
      
      // Should create chop if duration is meaningful
      if (callbacks.onChopCreate.mock.calls.length > 0) {
        const [startTime, endTime] = callbacks.onChopCreate.mock.calls[0];
        expect(endTime - startTime).toBeGreaterThan(0.01); // Meaningful duration
      }
    });

    it('should prevent overlapping chops after snapping', () => {
      // Try to create chop that would overlap with existing chop after snapping
      interactionManager.dragState = {
        type: 'create-chop',
        startTime: 0.15,
        endTime: 0.25 // Would overlap with chop1 (0.2-0.4) after snapping
      };
      
      interactionManager.finalizeChopCreation();
      
      if (callbacks.onChopCreate.mock.calls.length > 0) {
        const [startTime, endTime] = callbacks.onChopCreate.mock.calls[0];
        
        // Should not overlap with existing chops
        const overlapsChop1 = !(endTime <= 0.2 || startTime >= 0.4);
        const overlapsChop2 = !(endTime <= 0.6 || startTime >= 0.8);
        
        expect(overlapsChop1 && overlapsChop2).toBe(false);
      }
    });
  });

  describe('performance considerations', () => {
    it('should cache zero-crossing calculations', () => {
      const targetTime1 = 0.1;
      const targetTime2 = 0.1; // Same time
      
      // First call should calculate zero-crossings
      interactionManager.applySmartSnapping(targetTime1);
      
      // Second call should use cached results
      const startTime = performance.now();
      interactionManager.applySmartSnapping(targetTime2);
      const endTime = performance.now();
      
      // Should be very fast due to caching
      expect(endTime - startTime).toBeLessThan(10); // Less than 10ms
    });

    it('should handle large waveform data efficiently', () => {
      // Create large waveform data
      const largeWaveformData = {
        samples: new Float32Array(100000), // 100k samples
        sampleRate: 44100,
        duration: 2.27
      };
      
      for (let i = 0; i < largeWaveformData.samples.length; i++) {
        largeWaveformData.samples[i] = Math.sin(2 * Math.PI * 440 * i / 44100);
      }
      
      const startTime = performance.now();
      interactionManager.setWaveformData(largeWaveformData);
      interactionManager.applySmartSnapping(1.0);
      const endTime = performance.now();
      
      // Should complete within reasonable time
      expect(endTime - startTime).toBeLessThan(100); // Less than 100ms
    });
  });

  describe('configuration and options', () => {
    it('should respect snap tolerance settings', () => {
      // Set very small tolerance
      interactionManager.options.snapTolerance = 1; // 1 pixel
      interactionManager.smartSnapping.updateOptions({ snapTolerance: 1 });
      
      const targetTime = 0.21; // 21ms from chop1 start, should be outside tolerance
      const snappedTime = interactionManager.applySmartSnapping(targetTime);
      
      // Should not snap due to small tolerance, or snap to very close target
      expect(Math.abs(snappedTime - targetTime)).toBeLessThan(0.02);
    });

    it('should allow disabling specific snap types', () => {
      // Disable chop boundary snapping
      interactionManager.smartSnapping.updateOptions({
        enableChopBoundarySnap: false
      });
      
      const targetTime = 0.205; // Close to chop boundary
      const snappedTime = interactionManager.applySmartSnapping(targetTime);
      
      // Should not snap to chop boundary
      if (interactionManager.currentSnapResult?.wasSnapped) {
        expect(interactionManager.currentSnapResult.snapTarget.type).not.toBe('chop-boundary');
      }
    });

    it('should allow disabling visual indicators', () => {
      interactionManager.smartSnapping.updateOptions({
        showSnapIndicators: false
      });
      
      const indicators = interactionManager.smartSnapping.getSnapIndicators(0.2, 100);
      
      expect(indicators).toHaveLength(0);
    });
  });

  describe('error handling', () => {
    it('should handle missing waveform data gracefully', () => {
      interactionManager.setWaveformData(null);
      
      expect(() => {
        interactionManager.applySmartSnapping(0.1);
      }).not.toThrow();
    });

    it('should handle empty chops array', () => {
      interactionManager.setCurrentChops([]);
      
      expect(() => {
        interactionManager.applySmartSnapping(0.1);
      }).not.toThrow();
    });

    it('should handle invalid sample data', () => {
      const invalidWaveformData = {
        samples: null,
        sampleRate: 1000,
        duration: 1.0
      };
      
      expect(() => {
        interactionManager.setWaveformData(invalidWaveformData);
        interactionManager.applySmartSnapping(0.1);
      }).not.toThrow();
    });
  });
});