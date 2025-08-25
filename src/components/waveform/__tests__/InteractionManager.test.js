/**
 * Unit tests for InteractionManager
 * Tests pixel-to-time conversion accuracy and interaction functionality
 * Requirements: 2.1, 2.3, 5.5
 */

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { InteractionManager } from '../InteractionManager.js';

describe('InteractionManager', () => {
  let mockCanvasRenderer;
  let mockViewportManager;
  let mockLayerManager;
  let mockInteractionLayer;
  let mockCanvas;
  let interactionManager;

  beforeEach(() => {
    // Mock canvas element
    mockCanvas = {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      getBoundingClientRect: vi.fn(() => ({
        left: 0,
        top: 0,
        width: 800,
        height: 200
      })),
      style: {}
    };

    // Mock interaction layer
    mockInteractionLayer = {
      canvas: mockCanvas,
      ctx: {
        clearRect: vi.fn(),
        fillRect: vi.fn(),
        strokeRect: vi.fn(),
        beginPath: vi.fn(),
        moveTo: vi.fn(),
        lineTo: vi.fn(),
        stroke: vi.fn(),
        fill: vi.fn(),
        closePath: vi.fn(),
        setLineDash: vi.fn(),
        measureText: vi.fn(() => ({ width: 50 })),
        fillText: vi.fn(),
        strokeText: vi.fn(),
        set fillStyle(value) {},
        set strokeStyle(value) {},
        set lineWidth(value) {},
        set font(value) {},
        set textAlign(value) {},
        set globalAlpha(value) {}
      }
    };

    // Mock layer manager
    mockLayerManager = {
      getLayer: vi.fn((name) => {
        if (name === 'interaction') return mockInteractionLayer;
        return null;
      }),
      clearLayer: vi.fn(),
      getDimensions: vi.fn(() => ({ width: 800, height: 200 }))
    };

    // Mock viewport manager
    mockViewportManager = {
      pixelToTime: vi.fn(),
      timeToPixel: vi.fn(),
      isTimeVisible: vi.fn(() => true),
      getViewportBounds: vi.fn(() => ({
        start: 0,
        end: 10,
        duration: 10,
        pixelsPerSecond: 80
      })),
      zoomIn: vi.fn(),
      zoomOut: vi.fn()
    };

    // Mock canvas renderer
    mockCanvasRenderer = {
      getLayerManager: vi.fn(() => mockLayerManager),
      getViewportManager: vi.fn(() => mockViewportManager)
    };

    // Create interaction manager instance
    interactionManager = new InteractionManager(mockCanvasRenderer);
  });

  afterEach(() => {
    if (interactionManager) {
      interactionManager.destroy();
    }
    vi.clearAllMocks();
  });

  describe('Initialization', () => {
    test('should initialize with default options', () => {
      expect(interactionManager.options.clickThreshold).toBe(5);
      expect(interactionManager.options.hoverDelay).toBe(100);
      expect(interactionManager.options.snapTolerance).toBe(10);
      expect(interactionManager.options.enableHover).toBe(true);
      expect(interactionManager.options.enableClick).toBe(true);
      expect(interactionManager.options.enableDrag).toBe(true);
    });

    test('should initialize with custom options', () => {
      const customOptions = {
        clickThreshold: 10,
        hoverDelay: 200,
        snapTolerance: 15,
        enableHover: false
      };

      const customManager = new InteractionManager(mockCanvasRenderer, customOptions);
      
      expect(customManager.options.clickThreshold).toBe(10);
      expect(customManager.options.hoverDelay).toBe(200);
      expect(customManager.options.snapTolerance).toBe(15);
      expect(customManager.options.enableHover).toBe(false);
      
      customManager.destroy();
    });

    test('should set up event listeners on canvas', () => {
      expect(mockCanvas.addEventListener).toHaveBeenCalledWith('mousedown', expect.any(Function));
      expect(mockCanvas.addEventListener).toHaveBeenCalledWith('mousemove', expect.any(Function));
      expect(mockCanvas.addEventListener).toHaveBeenCalledWith('mouseup', expect.any(Function));
      expect(mockCanvas.addEventListener).toHaveBeenCalledWith('mouseleave', expect.any(Function));
      expect(mockCanvas.addEventListener).toHaveBeenCalledWith('wheel', expect.any(Function));
      expect(mockCanvas.addEventListener).toHaveBeenCalledWith('touchstart', expect.any(Function));
      expect(mockCanvas.addEventListener).toHaveBeenCalledWith('touchmove', expect.any(Function));
      expect(mockCanvas.addEventListener).toHaveBeenCalledWith('touchend', expect.any(Function));
    });
  });

  describe('Pixel-to-Time Conversion Accuracy', () => {
    beforeEach(() => {
      // Setup viewport manager with known values for testing
      mockViewportManager.pixelToTime.mockImplementation((pixel) => {
        // Simulate 80 pixels per second at current zoom
        const pixelsPerSecond = 80;
        const visibleStart = 0;
        const canvasWidth = 800;
        const visibleDuration = canvasWidth / pixelsPerSecond; // 10 seconds
        
        return visibleStart + (pixel / canvasWidth) * visibleDuration;
      });

      mockViewportManager.timeToPixel.mockImplementation((time) => {
        // Reverse calculation
        const pixelsPerSecond = 80;
        const visibleStart = 0;
        const canvasWidth = 800;
        const visibleDuration = canvasWidth / pixelsPerSecond; // 10 seconds
        
        return ((time - visibleStart) / visibleDuration) * canvasWidth;
      });
    });

    test('should accurately convert pixel positions to time', () => {
      // Test various pixel positions
      const testCases = [
        { pixel: 0, expectedTime: 0 },
        { pixel: 80, expectedTime: 1 },
        { pixel: 160, expectedTime: 2 },
        { pixel: 400, expectedTime: 5 },
        { pixel: 800, expectedTime: 10 }
      ];

      testCases.forEach(({ pixel, expectedTime }) => {
        const actualTime = interactionManager.pixelToTime(pixel);
        expect(actualTime).toBeCloseTo(expectedTime, 3);
      });
    });

    test('should accurately convert time to pixel positions', () => {
      // Test various time values
      const testCases = [
        { time: 0, expectedPixel: 0 },
        { time: 1, expectedPixel: 80 },
        { time: 2.5, expectedPixel: 200 },
        { time: 5, expectedPixel: 400 },
        { time: 10, expectedPixel: 800 }
      ];

      testCases.forEach(({ time, expectedPixel }) => {
        const actualPixel = interactionManager.timeToPixel(time);
        expect(actualPixel).toBeCloseTo(expectedPixel, 1);
      });
    });

    test('should maintain precision in round-trip conversions', () => {
      const originalTimes = [0, 1.234, 2.567, 5.891, 9.999];

      originalTimes.forEach(originalTime => {
        const pixel = interactionManager.timeToPixel(originalTime);
        const convertedTime = interactionManager.pixelToTime(pixel);
        
        // Should be accurate to within 1ms
        expect(convertedTime).toBeCloseTo(originalTime, 3);
      });
    });

    test('should handle edge cases in conversion', () => {
      // Test negative pixel (should clamp to start)
      const negativePixelTime = interactionManager.pixelToTime(-10);
      expect(negativePixelTime).toBeLessThan(0);

      // Test pixel beyond canvas width
      const beyondCanvasTime = interactionManager.pixelToTime(1000);
      expect(beyondCanvasTime).toBeGreaterThan(10);

      // Test negative time
      const negativeTimePixel = interactionManager.timeToPixel(-1);
      expect(negativeTimePixel).toBeLessThan(0);
    });
  });

  describe('Click-to-Create-Chop Functionality', () => {
    let onChopCreateSpy;

    beforeEach(() => {
      onChopCreateSpy = vi.fn();
      interactionManager.setCallbacks({
        onChopCreate: onChopCreateSpy
      });

      // Mock pixel to time conversion for predictable results
      mockViewportManager.pixelToTime.mockReturnValue(2.5);
    });

    test('should create chop on click', () => {
      const clickEvent = {
        preventDefault: vi.fn(),
        clientX: 200,
        clientY: 100,
        target: mockCanvas
      };

      const upEvent = {
        preventDefault: vi.fn(),
        clientX: 200,
        clientY: 100,
        target: mockCanvas
      };

      // Simulate click (mousedown + mouseup without significant movement)
      interactionManager.handleMouseDown(clickEvent);
      interactionManager.handleMouseUp(upEvent);

      expect(onChopCreateSpy).toHaveBeenCalledWith(2.4, 2.6); // 100ms chop centered on click
    });

    test('should not create chop if click is disabled', () => {
      interactionManager.setInteractionEnabled('click', false);

      const clickEvent = new MouseEvent('mousedown', {
        clientX: 200,
        clientY: 100
      });

      interactionManager.handleMouseDown(clickEvent);
      interactionManager.handleMouseUp(new MouseEvent('mouseup'));

      expect(onChopCreateSpy).not.toHaveBeenCalled();
    });

    test('should create chop with precise timing', () => {
      // Test multiple click positions
      const testCases = [
        { x: 80, expectedTime: 1.0 },
        { x: 240, expectedTime: 3.0 },
        { x: 400, expectedTime: 5.0 }
      ];

      testCases.forEach(({ x, expectedTime }, index) => {
        mockViewportManager.pixelToTime.mockReturnValue(expectedTime);

        const clickEvent = new MouseEvent('mousedown', { clientX: x, clientY: 100 });
        const upEvent = new MouseEvent('mouseup', { clientX: x, clientY: 100 });

        interactionManager.handleMouseDown(clickEvent);
        interactionManager.handleMouseUp(upEvent);

        expect(onChopCreateSpy).toHaveBeenNthCalledWith(
          index + 1,
          expectedTime - 0.05, // 50ms before
          expectedTime + 0.05  // 50ms after
        );
      });
    });
  });

  describe('Hover Effects and Timing Information', () => {
    beforeEach(() => {
      // Setup test chops
      const testChops = [
        {
          id: 'chop1',
          startTime: 1.0,
          endTime: 2.0,
          padId: 'A1'
        },
        {
          id: 'chop2',
          startTime: 3.0,
          endTime: 4.5,
          padId: 'B2'
        }
      ];

      interactionManager.setCurrentChops(testChops);

      // Mock time/pixel conversions for hover tests
      mockViewportManager.timeToPixel.mockImplementation((time) => time * 80);
      mockViewportManager.pixelToTime.mockImplementation((pixel) => pixel / 80);
    });

    test('should detect hover over chop region', () => {
      // Hover over chop1 (time 1.5, pixel 120)
      const element = interactionManager.getElementAtPosition(120, 100);

      expect(element).toBeTruthy();
      expect(element.type).toBe('chop-region');
      expect(element.chopId).toBe('chop1');
      expect(element.time).toBeCloseTo(1.5, 2);
    });

    test('should detect hover over chop boundary', () => {
      // Hover near start boundary of chop1 (time 1.0, pixel 80)
      const element = interactionManager.getElementAtPosition(82, 100); // Within snap tolerance

      expect(element).toBeTruthy();
      expect(element.type).toBe('chop-boundary');
      expect(element.chopId).toBe('chop1');
      expect(element.boundaryType).toBe('start');
    });

    test('should show timing information on hover', (done) => {
      const hoverSpy = vi.fn();
      interactionManager.setCallbacks({ onHover: hoverSpy });

      // Simulate hover with delay
      const moveEvent = new MouseEvent('mousemove', {
        clientX: 120,
        clientY: 100
      });

      interactionManager.handleMouseMove(moveEvent);

      // Wait for hover delay
      setTimeout(() => {
        expect(mockLayerManager.clearLayer).toHaveBeenCalledWith('interaction');
        expect(mockInteractionLayer.ctx.fillText).toHaveBeenCalled();
        done();
      }, 150); // Slightly longer than hover delay
    });

    test('should clear hover on mouse leave', () => {
      // First trigger hover
      const moveEvent = new MouseEvent('mousemove', {
        clientX: 120,
        clientY: 100
      });
      interactionManager.handleMouseMove(moveEvent);

      // Then trigger mouse leave
      interactionManager.handleMouseLeave(new MouseEvent('mouseleave'));

      expect(mockLayerManager.clearLayer).toHaveBeenCalledWith('interaction');
      expect(mockCanvas.style.cursor).toBe('crosshair');
    });

    test('should update cursor based on hovered element', () => {
      // Hover over chop boundary
      const boundaryElement = {
        type: 'chop-boundary',
        chopId: 'chop1',
        boundaryType: 'start'
      };

      interactionManager.showElementHover(boundaryElement, 80, 100);
      expect(mockCanvas.style.cursor).toBe('ew-resize');

      // Hover over chop region
      const regionElement = {
        type: 'chop-region',
        chopId: 'chop1',
        chop: { id: 'chop1', startTime: 1.0, endTime: 2.0 }
      };

      interactionManager.showElementHover(regionElement, 120, 100);
      expect(mockCanvas.style.cursor).toBe('pointer');
    });
  });

  describe('Drag Operations', () => {
    let onChopCreateSpy, onChopUpdateSpy;

    beforeEach(() => {
      onChopCreateSpy = vi.fn();
      onChopUpdateSpy = vi.fn();
      
      interactionManager.setCallbacks({
        onChopCreate: onChopCreateSpy,
        onChopUpdate: onChopUpdateSpy
      });

      // Mock conversions for drag tests
      mockViewportManager.pixelToTime.mockImplementation((pixel) => pixel / 80);
      mockViewportManager.timeToPixel.mockImplementation((time) => time * 80);
    });

    test('should create chop by dragging', () => {
      const startEvent = new MouseEvent('mousedown', {
        clientX: 80,  // 1 second
        clientY: 100
      });

      const moveEvent = new MouseEvent('mousemove', {
        clientX: 240, // 3 seconds
        clientY: 100
      });

      const endEvent = new MouseEvent('mouseup', {
        clientX: 240,
        clientY: 100
      });

      // Start drag
      interactionManager.handleMouseDown(startEvent);
      
      // Move to trigger drag
      interactionManager.handleMouseMove(moveEvent);
      
      // End drag
      interactionManager.handleMouseUp(endEvent);

      expect(onChopCreateSpy).toHaveBeenCalledWith(1.0, 3.0);
    });

    test('should not create chop for very short drags', () => {
      const startEvent = new MouseEvent('mousedown', {
        clientX: 80,
        clientY: 100
      });

      const moveEvent = new MouseEvent('mousemove', {
        clientX: 81, // Very small movement
        clientY: 100
      });

      const endEvent = new MouseEvent('mouseup', {
        clientX: 81,
        clientY: 100
      });

      interactionManager.handleMouseDown(startEvent);
      interactionManager.handleMouseMove(moveEvent);
      interactionManager.handleMouseUp(endEvent);

      // Should create click chop instead of drag chop
      expect(onChopCreateSpy).toHaveBeenCalledWith(
        expect.any(Number),
        expect.any(Number)
      );
      
      // Verify it's a small click chop (100ms)
      const [startTime, endTime] = onChopCreateSpy.mock.calls[0];
      expect(endTime - startTime).toBeCloseTo(0.1, 2);
    });

    test('should show drag preview during drag operation', () => {
      const startEvent = new MouseEvent('mousedown', {
        clientX: 80,
        clientY: 100
      });

      const moveEvent = new MouseEvent('mousemove', {
        clientX: 160,
        clientY: 100
      });

      interactionManager.handleMouseDown(startEvent);
      interactionManager.handleMouseMove(moveEvent);

      // Should render drag preview
      expect(mockLayerManager.clearLayer).toHaveBeenCalledWith('interaction');
      expect(mockInteractionLayer.ctx.fillRect).toHaveBeenCalled();
      expect(mockInteractionLayer.ctx.stroke).toHaveBeenCalled();
    });
  });

  describe('Wheel Zoom Functionality', () => {
    test('should zoom in on wheel up', () => {
      const wheelEvent = new WheelEvent('wheel', {
        clientX: 400, // Center of canvas
        clientY: 100,
        deltaY: -100  // Negative for zoom in
      });

      // Mock getBoundingClientRect for wheel event
      mockCanvas.getBoundingClientRect.mockReturnValue({
        left: 0,
        top: 0,
        width: 800,
        height: 200
      });

      interactionManager.handleWheel(wheelEvent);

      expect(mockViewportManager.zoomIn).toHaveBeenCalledWith(1.25, 5.0); // 400px = 5s
    });

    test('should zoom out on wheel down', () => {
      const wheelEvent = new WheelEvent('wheel', {
        clientX: 200,
        clientY: 100,
        deltaY: 100   // Positive for zoom out
      });

      mockCanvas.getBoundingClientRect.mockReturnValue({
        left: 0,
        top: 0,
        width: 800,
        height: 200
      });

      interactionManager.handleWheel(wheelEvent);

      expect(mockViewportManager.zoomOut).toHaveBeenCalledWith(1.25, 2.5); // 200px = 2.5s
    });
  });

  describe('Touch Support', () => {
    test('should handle touch events', () => {
      const touchStart = new TouchEvent('touchstart', {
        touches: [{
          clientX: 100,
          clientY: 100
        }]
      });

      const touchEnd = new TouchEvent('touchend', {
        touches: []
      });

      // Mock preventDefault
      touchStart.preventDefault = vi.fn();
      touchEnd.preventDefault = vi.fn();

      interactionManager.handleTouchStart(touchStart);
      interactionManager.handleTouchEnd(touchEnd);

      expect(touchStart.preventDefault).toHaveBeenCalled();
      expect(touchEnd.preventDefault).toHaveBeenCalled();
    });
  });

  describe('Callback Management', () => {
    test('should set and update callbacks', () => {
      const callbacks = {
        onChopCreate: vi.fn(),
        onChopUpdate: vi.fn(),
        onTimeSeek: vi.fn(),
        onHover: vi.fn()
      };

      interactionManager.setCallbacks(callbacks);

      expect(interactionManager.callbacks.onChopCreate).toBe(callbacks.onChopCreate);
      expect(interactionManager.callbacks.onChopUpdate).toBe(callbacks.onChopUpdate);
      expect(interactionManager.callbacks.onTimeSeek).toBe(callbacks.onTimeSeek);
      expect(interactionManager.callbacks.onHover).toBe(callbacks.onHover);
    });

    test('should handle missing callbacks gracefully', () => {
      // Don't set any callbacks
      interactionManager.setCallbacks({});

      // These should not throw errors
      expect(() => {
        interactionManager.createChopAtTime(1.0);
        interactionManager.updateChop('chop1', { startTime: 2.0 });
        interactionManager.seekToTime(3.0);
      }).not.toThrow();
    });
  });

  describe('Interaction State Management', () => {
    test('should track interaction state correctly', () => {
      expect(interactionManager.isMouseDown).toBe(false);
      expect(interactionManager.isDragging).toBe(false);

      const mouseDownEvent = new MouseEvent('mousedown', {
        clientX: 100,
        clientY: 100
      });

      interactionManager.handleMouseDown(mouseDownEvent);
      expect(interactionManager.isMouseDown).toBe(true);

      interactionManager.resetInteractionState();
      expect(interactionManager.isMouseDown).toBe(false);
      expect(interactionManager.isDragging).toBe(false);
    });

    test('should enable/disable interaction types', () => {
      interactionManager.setInteractionEnabled('click', false);
      expect(interactionManager.options.enableClick).toBe(false);

      interactionManager.setInteractionEnabled('drag', false);
      expect(interactionManager.options.enableDrag).toBe(false);

      interactionManager.setInteractionEnabled('hover', false);
      expect(interactionManager.options.enableHover).toBe(false);
    });
  });

  describe('Cleanup and Destruction', () => {
    test('should clean up resources on destroy', () => {
      interactionManager.destroy();

      expect(mockCanvas.removeEventListener).toHaveBeenCalledWith('mousedown', expect.any(Function));
      expect(mockCanvas.removeEventListener).toHaveBeenCalledWith('mousemove', expect.any(Function));
      expect(mockCanvas.removeEventListener).toHaveBeenCalledWith('mouseup', expect.any(Function));
      expect(mockCanvas.removeEventListener).toHaveBeenCalledWith('mouseleave', expect.any(Function));
      expect(mockCanvas.removeEventListener).toHaveBeenCalledWith('wheel', expect.any(Function));
    });

    test('should handle destroy when already destroyed', () => {
      interactionManager.destroy();
      
      // Should not throw error when called again
      expect(() => {
        interactionManager.destroy();
      }).not.toThrow();
    });
  });
});

describe('InteractionManager Integration', () => {
  test('should integrate properly with CanvasRenderer', () => {
    const mockRenderer = {
      getLayerManager: vi.fn(() => ({
        getLayer: vi.fn(() => ({
          canvas: document.createElement('canvas'),
          ctx: document.createElement('canvas').getContext('2d')
        })),
        clearLayer: vi.fn(),
        getDimensions: vi.fn(() => ({ width: 800, height: 200 }))
      })),
      getViewportManager: vi.fn(() => ({
        pixelToTime: vi.fn(),
        timeToPixel: vi.fn(),
        isTimeVisible: vi.fn(() => true),
        getViewportBounds: vi.fn(() => ({ start: 0, end: 10 })),
        zoomIn: vi.fn(),
        zoomOut: vi.fn()
      }))
    };

    const manager = new InteractionManager(mockRenderer);
    
    expect(mockRenderer.getLayerManager).toHaveBeenCalled();
    expect(mockRenderer.getViewportManager).toHaveBeenCalled();
    
    manager.destroy();
  });
});