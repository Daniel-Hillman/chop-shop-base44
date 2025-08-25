/**
 * Integration tests for InteractionManager drag functionality
 * Tests drag-based chop creation and editing with real-time feedback
 * Requirements: 2.2, 3.1, 3.2, 3.4
 */

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { InteractionManager } from '../InteractionManager.js';

describe('InteractionManager Drag Integration', () => {
  let mockCanvasRenderer;
  let mockViewportManager;
  let mockLayerManager;
  let mockInteractionLayer;
  let mockCanvas;
  let interactionManager;
  let onChopCreateSpy;
  let onChopUpdateSpy;

  beforeEach(() => {
    // Mock canvas element with realistic dimensions
    mockCanvas = {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      getBoundingClientRect: vi.fn(() => ({
        left: 0,
        top: 0,
        width: 1000,
        height: 200
      })),
      style: {},
      width: 1000,
      height: 200
    };

    // Mock canvas context with all required methods
    const mockCtx = {
      clearRect: vi.fn(),
      fillRect: vi.fn(),
      strokeRect: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      quadraticCurveTo: vi.fn(),
      closePath: vi.fn(),
      stroke: vi.fn(),
      fill: vi.fn(),
      setLineDash: vi.fn(),
      measureText: vi.fn(() => ({ width: 50 })),
      fillText: vi.fn(),
      strokeText: vi.fn(),
      createLinearGradient: vi.fn(() => ({
        addColorStop: vi.fn()
      })),
      set fillStyle(value) { this._fillStyle = value; },
      get fillStyle() { return this._fillStyle; },
      set strokeStyle(value) { this._strokeStyle = value; },
      get strokeStyle() { return this._strokeStyle; },
      set lineWidth(value) { this._lineWidth = value; },
      get lineWidth() { return this._lineWidth; },
      set font(value) { this._font = value; },
      get font() { return this._font; },
      set textAlign(value) { this._textAlign = value; },
      get textAlign() { return this._textAlign; },
      set globalAlpha(value) { this._globalAlpha = value; },
      get globalAlpha() { return this._globalAlpha; },
      set shadowColor(value) { this._shadowColor = value; },
      get shadowColor() { return this._shadowColor; },
      set shadowBlur(value) { this._shadowBlur = value; },
      get shadowBlur() { return this._shadowBlur; },
      set lineDashOffset(value) { this._lineDashOffset = value; },
      get lineDashOffset() { return this._lineDashOffset; }
    };

    // Mock interaction layer
    mockInteractionLayer = {
      canvas: mockCanvas,
      ctx: mockCtx
    };

    // Mock layer manager
    mockLayerManager = {
      getLayer: vi.fn((name) => {
        if (name === 'interaction') return mockInteractionLayer;
        return null;
      }),
      clearLayer: vi.fn(),
      getDimensions: vi.fn(() => ({ width: 1000, height: 200 }))
    };

    // Mock viewport manager with realistic behavior
    mockViewportManager = {
      pixelToTime: vi.fn((pixel) => {
        // 100 pixels per second at default zoom
        return pixel / 100;
      }),
      timeToPixel: vi.fn((time) => {
        // 100 pixels per second at default zoom
        return time * 100;
      }),
      isTimeVisible: vi.fn(() => true),
      getViewportBounds: vi.fn(() => ({
        start: 0,
        end: 10,
        duration: 10,
        pixelsPerSecond: 100
      })),
      zoomIn: vi.fn(),
      zoomOut: vi.fn()
    };

    // Mock canvas renderer
    mockCanvasRenderer = {
      getLayerManager: vi.fn(() => mockLayerManager),
      getViewportManager: vi.fn(() => mockViewportManager)
    };

    // Create interaction manager with drag-optimized options
    interactionManager = new InteractionManager(mockCanvasRenderer, {
      clickThreshold: 3,
      snapTolerance: 15,
      enableSmartSnapping: true,
      enableVisualFeedback: true,
      enableConflictPrevention: true
    });

    // Setup callbacks
    onChopCreateSpy = vi.fn();
    onChopUpdateSpy = vi.fn();
    
    interactionManager.setCallbacks({
      onChopCreate: onChopCreateSpy,
      onChopUpdate: onChopUpdateSpy
    });
  });

  afterEach(() => {
    if (interactionManager) {
      interactionManager.destroy();
    }
    vi.clearAllMocks();
  });

  describe('Drag Selection for Chop Creation', () => {
    test('should create chop with precise start and end points via drag', () => {
      const startEvent = createMouseEvent('mousedown', 200, 100); // 2.0s
      const moveEvent = createMouseEvent('mousemove', 500, 100);   // 5.0s
      const endEvent = createMouseEvent('mouseup', 500, 100);

      // Execute drag sequence
      interactionManager.handleMouseDown(startEvent);
      interactionManager.handleMouseMove(moveEvent);
      interactionManager.handleMouseUp(endEvent);

      expect(onChopCreateSpy).toHaveBeenCalledWith(2.0, 5.0);
    });

    test('should handle reverse drag (right to left)', () => {
      const startEvent = createMouseEvent('mousedown', 600, 100); // 6.0s
      const moveEvent = createMouseEvent('mousemove', 300, 100);   // 3.0s
      const endEvent = createMouseEvent('mouseup', 300, 100);

      interactionManager.handleMouseDown(startEvent);
      interactionManager.handleMouseMove(moveEvent);
      interactionManager.handleMouseUp(endEvent);

      // Should create chop with correct start/end order
      expect(onChopCreateSpy).toHaveBeenCalledWith(3.0, 6.0);
    });

    test('should show real-time visual feedback during drag creation', () => {
      const startEvent = createMouseEvent('mousedown', 100, 100);
      const moveEvent = createMouseEvent('mousemove', 400, 100);

      interactionManager.handleMouseDown(startEvent);
      interactionManager.handleMouseMove(moveEvent);

      // Should clear interaction layer and render preview
      expect(mockLayerManager.clearLayer).toHaveBeenCalledWith('interaction');
      expect(mockInteractionLayer.ctx.fillRect).toHaveBeenCalled();
      expect(mockInteractionLayer.ctx.stroke).toHaveBeenCalled();
    });

    test('should not create chop for very small drags', () => {
      const startEvent = createMouseEvent('mousedown', 200, 100);
      const moveEvent = createMouseEvent('mousemove', 202, 100); // 2px movement
      const endEvent = createMouseEvent('mouseup', 202, 100);

      interactionManager.handleMouseDown(startEvent);
      interactionManager.handleMouseMove(moveEvent);
      interactionManager.handleMouseUp(endEvent);

      // Should create click chop instead
      expect(onChopCreateSpy).toHaveBeenCalledWith(1.97, 2.07); // 100ms click chop
    });

    test('should handle drag creation with minimum duration constraint', () => {
      const startEvent = createMouseEvent('mousedown', 200, 100);
      const moveEvent = createMouseEvent('mousemove', 205, 100); // 0.05s duration
      const endEvent = createMouseEvent('mouseup', 205, 100);

      interactionManager.handleMouseDown(startEvent);
      interactionManager.handleMouseMove(moveEvent);
      interactionManager.handleMouseUp(endEvent);

      // Should create click chop since drag distance is small
      expect(onChopCreateSpy).toHaveBeenCalledWith(2.0, 2.05);
    });
  });

  describe('Draggable Handles for Boundary Adjustment', () => {
    beforeEach(() => {
      // Setup test chops
      const testChops = [
        {
          id: 'chop1',
          startTime: 2.0,
          endTime: 4.0,
          padId: 'A1'
        },
        {
          id: 'chop2',
          startTime: 6.0,
          endTime: 8.0,
          padId: 'B2'
        }
      ];

      interactionManager.setCurrentChops(testChops);
    });

    test('should detect and drag start boundary', () => {
      // Click near start boundary of chop1 (200px = 2.0s)
      const startEvent = createMouseEvent('mousedown', 202, 100); // Within snap tolerance
      const moveEvent = createMouseEvent('mousemove', 150, 100);   // Move to 1.5s
      const endEvent = createMouseEvent('mouseup', 150, 100);

      interactionManager.handleMouseDown(startEvent);
      interactionManager.handleMouseMove(moveEvent);
      interactionManager.handleMouseUp(endEvent);

      expect(onChopUpdateSpy).toHaveBeenCalledWith('chop1', { startTime: 1.5 });
    });

    test('should detect and drag end boundary', () => {
      // Click near end boundary of chop1 (400px = 4.0s)
      const startEvent = createMouseEvent('mousedown', 398, 100); // Within snap tolerance
      const moveEvent = createMouseEvent('mousemove', 450, 100);   // Move to 4.5s
      const endEvent = createMouseEvent('mouseup', 450, 100);

      interactionManager.handleMouseDown(startEvent);
      interactionManager.handleMouseMove(moveEvent);
      interactionManager.handleMouseUp(endEvent);

      expect(onChopUpdateSpy).toHaveBeenCalledWith('chop1', { endTime: 4.5 });
    });

    test('should prevent start boundary from going past end boundary', () => {
      // Try to drag start boundary past end boundary
      const startEvent = createMouseEvent('mousedown', 202, 100); // Start boundary
      const moveEvent = createMouseEvent('mousemove', 450, 100);   // Try to move past end (4.5s)
      const endEvent = createMouseEvent('mouseup', 450, 100);

      interactionManager.handleMouseDown(startEvent);
      interactionManager.handleMouseMove(moveEvent);
      interactionManager.handleMouseUp(endEvent);

      // Should be constrained to just before end boundary
      expect(onChopUpdateSpy).toHaveBeenCalledWith('chop1', { startTime: 3.99 });
    });

    test('should prevent end boundary from going before start boundary', () => {
      // Try to drag end boundary before start boundary
      const startEvent = createMouseEvent('mousedown', 398, 100); // End boundary
      const moveEvent = createMouseEvent('mousemove', 150, 100);   // Try to move before start (1.5s)
      const endEvent = createMouseEvent('mouseup', 150, 100);

      interactionManager.handleMouseDown(startEvent);
      interactionManager.handleMouseMove(moveEvent);
      interactionManager.handleMouseUp(endEvent);

      // Should be constrained to just after start boundary
      expect(onChopUpdateSpy).toHaveBeenCalledWith('chop1', { endTime: 2.01 });
    });

    test('should show enhanced visual feedback during boundary drag', () => {
      const startEvent = createMouseEvent('mousedown', 202, 100);
      const moveEvent = createMouseEvent('mousemove', 150, 100);

      interactionManager.handleMouseDown(startEvent);
      interactionManager.handleMouseMove(moveEvent);

      // Should render boundary move preview with enhanced visuals
      expect(mockLayerManager.clearLayer).toHaveBeenCalledWith('interaction');
      expect(mockInteractionLayer.ctx.fillRect).toHaveBeenCalled();
      expect(mockInteractionLayer.ctx.stroke).toHaveBeenCalled();
      
      // Should show timing information
      expect(mockInteractionLayer.ctx.fillText).toHaveBeenCalled();
    });
  });

  describe('Smart Snapping Functionality', () => {
    beforeEach(() => {
      // Setup chops for snapping tests
      const testChops = [
        {
          id: 'chop1',
          startTime: 2.0,
          endTime: 4.0,
          padId: 'A1'
        },
        {
          id: 'chop2',
          startTime: 6.0,
          endTime: 8.0,
          padId: 'B2'
        }
      ];

      interactionManager.setCurrentChops(testChops);
    });

    test('should snap to nearby chop boundaries during drag creation', () => {
      // Drag near existing chop boundary
      const startEvent = createMouseEvent('mousedown', 100, 100); // 1.0s
      const moveEvent = createMouseEvent('mousemove', 205, 100);   // 2.05s (near chop1 start at 2.0s)
      const endEvent = createMouseEvent('mouseup', 205, 100);

      interactionManager.handleMouseDown(startEvent);
      interactionManager.handleMouseMove(moveEvent);
      interactionManager.handleMouseUp(endEvent);

      // Should snap to exact boundary due to conflict prevention
      expect(onChopCreateSpy).toHaveBeenCalledWith(1.0, 2.0);
    });

    test('should snap boundary drag to nearby chop boundaries', () => {
      // Drag chop1 end boundary near chop2 start boundary
      const startEvent = createMouseEvent('mousedown', 398, 100); // chop1 end boundary
      const moveEvent = createMouseEvent('mousemove', 605, 100);   // Near chop2 start (6.0s)
      const endEvent = createMouseEvent('mouseup', 605, 100);

      interactionManager.handleMouseDown(startEvent);
      interactionManager.handleMouseMove(moveEvent);
      interactionManager.handleMouseUp(endEvent);

      // Should snap to chop2 start boundary
      expect(onChopUpdateSpy).toHaveBeenCalledWith('chop1', { endTime: 6.0 });
    });

    test('should show snap indicators during drag operations', () => {
      const startEvent = createMouseEvent('mousedown', 398, 100);
      const moveEvent = createMouseEvent('mousemove', 605, 100); // Near snap point

      interactionManager.handleMouseDown(startEvent);
      interactionManager.handleMouseMove(moveEvent);

      // Should render snap indicators
      expect(mockInteractionLayer.ctx.setLineDash).toHaveBeenCalledWith([3, 3]);
      expect(mockInteractionLayer.ctx.stroke).toHaveBeenCalled();
    });

    test('should disable snapping when option is disabled', () => {
      interactionManager.options.enableSmartSnapping = false;

      const startEvent = createMouseEvent('mousedown', 100, 100);
      const moveEvent = createMouseEvent('mousemove', 205, 100); // Near boundary but shouldn't snap
      const endEvent = createMouseEvent('mouseup', 205, 100);

      interactionManager.handleMouseDown(startEvent);
      interactionManager.handleMouseMove(moveEvent);
      interactionManager.handleMouseUp(endEvent);

      // Should not snap but still apply conflict prevention
      expect(onChopCreateSpy).toHaveBeenCalledWith(1.0, 2.0);
    });
  });

  describe('Conflict Prevention', () => {
    beforeEach(() => {
      const testChops = [
        {
          id: 'chop1',
          startTime: 2.0,
          endTime: 4.0,
          padId: 'A1'
        },
        {
          id: 'chop2',
          startTime: 6.0,
          endTime: 8.0,
          padId: 'B2'
        }
      ];

      interactionManager.setCurrentChops(testChops);
    });

    test('should prevent boundary drag from creating overlaps', () => {
      // Try to drag chop1 end boundary into chop2
      const startEvent = createMouseEvent('mousedown', 398, 100); // chop1 end
      const moveEvent = createMouseEvent('mousemove', 700, 100);   // Into chop2 (7.0s)
      const endEvent = createMouseEvent('mouseup', 700, 100);

      interactionManager.handleMouseDown(startEvent);
      interactionManager.handleMouseMove(moveEvent);
      interactionManager.handleMouseUp(endEvent);

      // Should be constrained to chop2 start boundary
      expect(onChopUpdateSpy).toHaveBeenCalledWith('chop1', { endTime: 6.0 });
    });

    test('should prevent chop creation in occupied space', () => {
      // Try to create chop overlapping with existing chop
      const startEvent = createMouseEvent('mousedown', 150, 100); // 1.5s
      const moveEvent = createMouseEvent('mousemove', 300, 100);   // 3.0s (overlaps chop1)
      const endEvent = createMouseEvent('mouseup', 300, 100);

      interactionManager.handleMouseDown(startEvent);
      interactionManager.handleMouseMove(moveEvent);
      interactionManager.handleMouseUp(endEvent);

      // Should create chop up to existing chop boundary
      expect(onChopCreateSpy).toHaveBeenCalledWith(1.5, 2.0);
    });
  });

  describe('Performance and Responsiveness', () => {
    test('should handle rapid drag movements without lag', () => {
      const startEvent = createMouseEvent('mousedown', 100, 100);
      
      // Simulate rapid mouse movements
      const rapidMoves = [];
      for (let i = 0; i < 50; i++) {
        rapidMoves.push(createMouseEvent('mousemove', 100 + i * 10, 100));
      }
      
      const endEvent = createMouseEvent('mouseup', 600, 100);

      // Execute rapid sequence
      interactionManager.handleMouseDown(startEvent);
      
      const startTime = performance.now();
      rapidMoves.forEach(moveEvent => {
        interactionManager.handleMouseMove(moveEvent);
      });
      const endTime = performance.now();
      
      interactionManager.handleMouseUp(endEvent);

      // Should complete within reasonable time (< 50ms for 50 moves)
      expect(endTime - startTime).toBeLessThan(50);
      
      // Should still create correct chop (last position)
      expect(onChopCreateSpy).toHaveBeenCalledWith(1.0, 5.9);
    });

    test('should maintain 60fps during drag operations', () => {
      const frameTime = 16.67; // 60fps = 16.67ms per frame
      const startEvent = createMouseEvent('mousedown', 100, 100);
      
      interactionManager.handleMouseDown(startEvent);
      
      // Simulate frame-rate drag updates
      const frameUpdates = [];
      for (let i = 0; i < 10; i++) {
        const startFrame = performance.now();
        const moveEvent = createMouseEvent('mousemove', 100 + i * 50, 100);
        interactionManager.handleMouseMove(moveEvent);
        const endFrame = performance.now();
        
        frameUpdates.push(endFrame - startFrame);
      }
      
      // Average frame time should be well under 16.67ms
      const avgFrameTime = frameUpdates.reduce((a, b) => a + b, 0) / frameUpdates.length;
      expect(avgFrameTime).toBeLessThan(frameTime / 2); // Should be < 8ms
    });

    test('should handle touch events with same accuracy as mouse', () => {
      const touchStart = createTouchEvent('touchstart', 200, 100);
      const touchMove = createTouchEvent('touchmove', 500, 100);
      const touchEnd = createTouchEvent('touchend', 500, 100);

      interactionManager.handleTouchStart(touchStart);
      interactionManager.handleTouchMove(touchMove);
      interactionManager.handleTouchEnd(touchEnd);

      expect(onChopCreateSpy).toHaveBeenCalledWith(2.0, 5.0);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    test('should handle drag outside canvas bounds', () => {
      const startEvent = createMouseEvent('mousedown', 100, 100);
      const moveEvent = createMouseEvent('mousemove', -50, 100); // Outside left edge
      const endEvent = createMouseEvent('mouseup', -50, 100);

      interactionManager.handleMouseDown(startEvent);
      interactionManager.handleMouseMove(moveEvent);
      interactionManager.handleMouseUp(endEvent);

      // Should handle gracefully and create valid chop
      expect(onChopCreateSpy).toHaveBeenCalled();
      const [startTime, endTime] = onChopCreateSpy.mock.calls[0];
      expect(startTime).toBeGreaterThanOrEqual(-1); // Allow some negative values for edge cases
      expect(endTime).toBeGreaterThan(startTime);
    });

    test('should handle missing chop data during boundary drag', () => {
      // Set empty chops array
      interactionManager.setCurrentChops([]);
      
      const startEvent = createMouseEvent('mousedown', 200, 100);
      const moveEvent = createMouseEvent('mousemove', 300, 100);
      const endEvent = createMouseEvent('mouseup', 300, 100);

      // Should not throw error
      expect(() => {
        interactionManager.handleMouseDown(startEvent);
        interactionManager.handleMouseMove(moveEvent);
        interactionManager.handleMouseUp(endEvent);
      }).not.toThrow();
    });

    test('should handle viewport changes during drag', () => {
      const startEvent = createMouseEvent('mousedown', 200, 100);
      
      interactionManager.handleMouseDown(startEvent);
      
      // Change viewport during drag
      mockViewportManager.pixelToTime.mockImplementation((pixel) => pixel / 50); // Different scale
      
      const moveEvent = createMouseEvent('mousemove', 400, 100);
      const endEvent = createMouseEvent('mouseup', 400, 100);
      
      interactionManager.handleMouseMove(moveEvent);
      interactionManager.handleMouseUp(endEvent);

      // Should adapt to new viewport
      expect(onChopCreateSpy).toHaveBeenCalled();
    });
  });

  // Helper functions
  function createMouseEvent(type, clientX, clientY) {
    const event = {
      type,
      clientX,
      clientY,
      preventDefault: vi.fn(),
      target: mockCanvas,
      bubbles: true,
      cancelable: true
    };
    return event;
  }

  function createTouchEvent(type, clientX, clientY) {
    const event = {
      type,
      touches: type === 'touchend' ? [] : [{ clientX, clientY }],
      preventDefault: vi.fn(),
      target: mockCanvas,
      bubbles: true,
      cancelable: true
    };
    return event;
  }
});

describe('InteractionManager Drag Accuracy Tests', () => {
  let interactionManager;
  let mockCanvasRenderer;
  let mockViewportManager;
  let callbacks;

  beforeEach(() => {
    // Setup high-precision mocks
    mockViewportManager = {
      pixelToTime: vi.fn((pixel) => pixel / 100), // 100 pixels per second
      timeToPixel: vi.fn((time) => time * 100),
      getViewportBounds: vi.fn(() => ({
        start: 0,
        end: 10,
        pixelsPerSecond: 100
      }))
    };

    mockCanvasRenderer = {
      getLayerManager: vi.fn(() => ({
        getLayer: vi.fn(() => ({
          canvas: {
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
            getBoundingClientRect: vi.fn(() => ({ left: 0, top: 0, width: 1000, height: 200 })),
            style: {}
          },
          ctx: {
            clearRect: vi.fn(),
            fillRect: vi.fn(),
            strokeRect: vi.fn(),
            beginPath: vi.fn(),
            moveTo: vi.fn(),
            lineTo: vi.fn(),
            quadraticCurveTo: vi.fn(),
            closePath: vi.fn(),
            stroke: vi.fn(),
            fill: vi.fn(),
            setLineDash: vi.fn(),
            measureText: vi.fn(() => ({ width: 50 })),
            fillText: vi.fn(),
            createLinearGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
            set fillStyle(v) {},
            set strokeStyle(v) {},
            set lineWidth(v) {},
            set font(v) {},
            set textAlign(v) {},
            set shadowColor(v) {},
            set shadowBlur(v) {},
            set lineDashOffset(v) {}
          }
        })),
        clearLayer: vi.fn(),
        getDimensions: vi.fn(() => ({ width: 1000, height: 200 }))
      })),
      getViewportManager: vi.fn(() => mockViewportManager)
    };

    interactionManager = new InteractionManager(mockCanvasRenderer);
    
    callbacks = {
      onChopCreate: vi.fn(),
      onChopUpdate: vi.fn()
    };
    
    interactionManager.setCallbacks(callbacks);
  });

  afterEach(() => {
    interactionManager.destroy();
  });

  test('should maintain sub-pixel accuracy in drag operations', () => {
    // Test fractional pixel positions
    const testCases = [
      { startPixel: 123.7, endPixel: 456.3, expectedStart: 1.237, expectedEnd: 4.563 },
      { startPixel: 89.1, endPixel: 234.9, expectedStart: 0.891, expectedEnd: 2.349 },
      { startPixel: 567.5, endPixel: 789.2, expectedStart: 5.675, expectedEnd: 7.892 }
    ];

    testCases.forEach(({ startPixel, endPixel, expectedStart, expectedEnd }, index) => {
      const startEvent = {
        type: 'mousedown',
        clientX: startPixel,
        clientY: 100,
        preventDefault: vi.fn(),
        target: mockCanvasRenderer.getLayerManager().getLayer().canvas
      };
      const moveEvent = {
        type: 'mousemove',
        clientX: endPixel,
        clientY: 100,
        preventDefault: vi.fn(),
        target: mockCanvasRenderer.getLayerManager().getLayer().canvas
      };
      const endEvent = {
        type: 'mouseup',
        clientX: endPixel,
        clientY: 100,
        preventDefault: vi.fn(),
        target: mockCanvasRenderer.getLayerManager().getLayer().canvas
      };

      interactionManager.handleMouseDown(startEvent);
      interactionManager.handleMouseMove(moveEvent);
      interactionManager.handleMouseUp(endEvent);

      expect(callbacks.onChopCreate).toHaveBeenNthCalledWith(
        index + 1,
        expect.closeTo(expectedStart, 3),
        expect.closeTo(expectedEnd, 3)
      );
    });
  });

  test('should handle rapid successive drag operations accurately', () => {
    const operations = [
      { start: 100, end: 200, expectedStart: 1.0, expectedEnd: 2.0 },
      { start: 300, end: 450, expectedStart: 3.0, expectedEnd: 4.5 },
      { start: 500, end: 750, expectedStart: 5.0, expectedEnd: 7.5 }
    ];

    operations.forEach(({ start, end, expectedStart, expectedEnd }, index) => {
      const startEvent = {
        type: 'mousedown',
        clientX: start,
        clientY: 100,
        preventDefault: vi.fn(),
        target: mockCanvasRenderer.getLayerManager().getLayer().canvas
      };
      const moveEvent = {
        type: 'mousemove',
        clientX: end,
        clientY: 100,
        preventDefault: vi.fn(),
        target: mockCanvasRenderer.getLayerManager().getLayer().canvas
      };
      const endEvent = {
        type: 'mouseup',
        clientX: end,
        clientY: 100,
        preventDefault: vi.fn(),
        target: mockCanvasRenderer.getLayerManager().getLayer().canvas
      };

      interactionManager.handleMouseDown(startEvent);
      interactionManager.handleMouseMove(moveEvent);
      interactionManager.handleMouseUp(endEvent);

      expect(callbacks.onChopCreate).toHaveBeenNthCalledWith(
        index + 1,
        expectedStart,
        expectedEnd
      );
    });
  });
});