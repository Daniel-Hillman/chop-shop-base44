/**
 * Basic unit tests for InteractionManager focusing on core functionality
 * Tests pixel-to-time conversion accuracy and basic interaction logic
 * Requirements: 2.1, 2.3, 5.5
 */

import { describe, test, expect, beforeEach, vi } from 'vitest';
import { InteractionManager } from '../InteractionManager.js';

describe('InteractionManager - Core Functionality', () => {
  let mockCanvasRenderer;
  let mockViewportManager;
  let mockLayerManager;
  let mockCanvas;
  let interactionManager;

  beforeEach(() => {
    // Create a real canvas element for testing
    mockCanvas = document.createElement('canvas');
    mockCanvas.width = 800;
    mockCanvas.height = 200;
    
    // Mock the getBoundingClientRect method
    mockCanvas.getBoundingClientRect = vi.fn(() => ({
      left: 0,
      top: 0,
      width: 800,
      height: 200
    }));

    // Mock layer manager
    mockLayerManager = {
      getLayer: vi.fn(() => ({
        canvas: mockCanvas,
        ctx: mockCanvas.getContext('2d')
      })),
      clearLayer: vi.fn(),
      getDimensions: vi.fn(() => ({ width: 800, height: 200 }))
    };

    // Mock viewport manager with predictable conversions
    mockViewportManager = {
      pixelToTime: vi.fn((pixel) => {
        // 80 pixels per second conversion
        return pixel / 80;
      }),
      timeToPixel: vi.fn((time) => {
        // 80 pixels per second conversion
        return time * 80;
      }),
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

    // Create interaction manager
    interactionManager = new InteractionManager(mockCanvasRenderer);
  });

  describe('Pixel-to-Time Conversion Accuracy', () => {
    test('should accurately convert pixel positions to time', () => {
      // Test various pixel positions with known conversion (80 pixels per second)
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
        expect(mockViewportManager.pixelToTime).toHaveBeenCalledWith(pixel);
      });
    });

    test('should accurately convert time to pixel positions', () => {
      // Test various time values with known conversion (80 pixels per second)
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
        expect(mockViewportManager.timeToPixel).toHaveBeenCalledWith(time);
      });
    });

    test('should maintain precision in round-trip conversions', () => {
      const originalTimes = [0, 1.234, 2.567, 5.891, 9.999];

      originalTimes.forEach(originalTime => {
        const pixel = interactionManager.timeToPixel(originalTime);
        const convertedTime = interactionManager.pixelToTime(pixel);
        
        // Should be accurate to within 1ms (limited by our mock precision)
        expect(convertedTime).toBeCloseTo(originalTime, 3);
      });
    });

    test('should handle edge cases in conversion', () => {
      // Test negative pixel
      const negativePixelTime = interactionManager.pixelToTime(-10);
      expect(negativePixelTime).toBe(-0.125); // -10/80

      // Test pixel beyond canvas width
      const beyondCanvasTime = interactionManager.pixelToTime(1000);
      expect(beyondCanvasTime).toBe(12.5); // 1000/80

      // Test negative time
      const negativeTimePixel = interactionManager.timeToPixel(-1);
      expect(negativeTimePixel).toBe(-80); // -1*80
    });
  });

  describe('Click-to-Create-Chop Logic', () => {
    test('should create chop at correct time position', () => {
      const onChopCreateSpy = vi.fn();
      interactionManager.setCallbacks({ onChopCreate: onChopCreateSpy });

      // Test creating chop at time 2.5 (pixel 200)
      interactionManager.createChopAtTime(2.5);

      // Should create 100ms chop centered on click time
      expect(onChopCreateSpy).toHaveBeenCalledWith(2.45, 2.55);
    });

    test('should handle chop creation at time boundaries', () => {
      const onChopCreateSpy = vi.fn();
      interactionManager.setCallbacks({ onChopCreate: onChopCreateSpy });

      // Test creating chop at time 0 (should clamp start time to 0)
      interactionManager.createChopAtTime(0);

      expect(onChopCreateSpy).toHaveBeenCalledWith(0, 0.1);
    });

    test('should create chop with drag selection', () => {
      const onChopCreateSpy = vi.fn();
      interactionManager.setCallbacks({ onChopCreate: onChopCreateSpy });

      // Simulate drag from time 1.0 to 3.0
      interactionManager.dragState = {
        type: 'create-chop',
        startTime: 1.0,
        endTime: 3.0,
        chopId: null,
        boundaryType: null
      };

      interactionManager.finalizeChopCreation();

      expect(onChopCreateSpy).toHaveBeenCalledWith(1.0, 3.0);
    });

    test('should not create chop for very short drags', () => {
      const onChopCreateSpy = vi.fn();
      interactionManager.setCallbacks({ onChopCreate: onChopCreateSpy });

      // Simulate very short drag (5ms)
      interactionManager.dragState = {
        type: 'create-chop',
        startTime: 1.0,
        endTime: 1.005,
        chopId: null,
        boundaryType: null
      };

      interactionManager.finalizeChopCreation();

      // Should not create chop (duration < 10ms threshold)
      expect(onChopCreateSpy).not.toHaveBeenCalled();
    });
  });

  describe('Chop Detection and Hover Logic', () => {
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
    });

    test('should detect hover over chop region', () => {
      // Hover at time 1.5 (middle of chop1)
      const element = interactionManager.getElementAtPosition(120, 100); // 120px = 1.5s

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

    test('should detect hover over end boundary', () => {
      // Hover near end boundary of chop1 (time 2.0, pixel 160)
      const element = interactionManager.getElementAtPosition(158, 100); // Within snap tolerance

      expect(element).toBeTruthy();
      expect(element.type).toBe('chop-boundary');
      expect(element.chopId).toBe('chop1');
      expect(element.boundaryType).toBe('end');
    });

    test('should return null for empty areas', () => {
      // Hover in empty area (time 2.5, pixel 200)
      const element = interactionManager.getElementAtPosition(200, 100);

      expect(element).toBeNull();
    });

    test('should prioritize boundaries over regions', () => {
      // Hover exactly on boundary (should detect boundary, not region)
      const element = interactionManager.getElementAtPosition(80, 100); // Exactly on start boundary

      expect(element).toBeTruthy();
      expect(element.type).toBe('chop-boundary');
      expect(element.boundaryType).toBe('start');
    });
  });

  describe('Drag State Management', () => {
    test('should initialize chop creation drag correctly', () => {
      interactionManager.initializeChopCreation(200, 100); // 200px = 2.5s

      expect(interactionManager.dragState.type).toBe('create-chop');
      expect(interactionManager.dragState.startTime).toBe(2.5);
      expect(interactionManager.dragState.endTime).toBe(2.5);
    });

    test('should initialize boundary drag correctly', () => {
      const boundaryElement = {
        type: 'chop-boundary',
        chopId: 'chop1',
        boundaryType: 'start',
        time: 1.0
      };

      interactionManager.initializeBoundaryDrag(boundaryElement, 80, 100);

      expect(interactionManager.dragState.type).toBe('move-boundary');
      expect(interactionManager.dragState.chopId).toBe('chop1');
      expect(interactionManager.dragState.boundaryType).toBe('start');
      expect(interactionManager.dragState.startTime).toBe(1.0);
    });

    test('should update drag state correctly', () => {
      // Initialize drag
      interactionManager.dragState = {
        type: 'create-chop',
        startTime: 1.0,
        endTime: 1.0,
        chopId: null,
        boundaryType: null
      };

      // Update drag to new position
      interactionManager.updateDrag(240, 100); // 240px = 3.0s

      expect(interactionManager.dragState.endTime).toBe(3.0);
    });

    test('should reset interaction state correctly', () => {
      // Set some state
      interactionManager.isMouseDown = true;
      interactionManager.isDragging = true;
      interactionManager.dragState.type = 'create-chop';

      // Reset
      interactionManager.resetInteractionState();

      expect(interactionManager.isMouseDown).toBe(false);
      expect(interactionManager.isDragging).toBe(false);
      expect(interactionManager.dragState.type).toBeNull();
    });
  });

  describe('Callback Management', () => {
    test('should set callbacks correctly', () => {
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

    test('should call callbacks with correct parameters', () => {
      const onChopUpdateSpy = vi.fn();
      const onTimeSeekSpy = vi.fn();
      
      interactionManager.setCallbacks({
        onChopUpdate: onChopUpdateSpy,
        onTimeSeek: onTimeSeekSpy
      });

      interactionManager.updateChop('chop1', { startTime: 2.0 });
      interactionManager.seekToTime(3.5);

      expect(onChopUpdateSpy).toHaveBeenCalledWith('chop1', { startTime: 2.0 });
      expect(onTimeSeekSpy).toHaveBeenCalledWith(3.5);
    });
  });

  describe('Interaction Options', () => {
    test('should initialize with default options', () => {
      expect(interactionManager.options.clickThreshold).toBe(5);
      expect(interactionManager.options.hoverDelay).toBe(100);
      expect(interactionManager.options.snapTolerance).toBe(10);
      expect(interactionManager.options.enableHover).toBe(true);
      expect(interactionManager.options.enableClick).toBe(true);
      expect(interactionManager.options.enableDrag).toBe(true);
    });

    test('should allow enabling/disabling interaction types', () => {
      interactionManager.setInteractionEnabled('click', false);
      expect(interactionManager.options.enableClick).toBe(false);

      interactionManager.setInteractionEnabled('drag', false);
      expect(interactionManager.options.enableDrag).toBe(false);

      interactionManager.setInteractionEnabled('hover', false);
      expect(interactionManager.options.enableHover).toBe(false);
    });

    test('should clear hover when hover is disabled', () => {
      const clearHoverSpy = vi.spyOn(interactionManager, 'clearHover');
      
      interactionManager.setInteractionEnabled('hover', false);
      
      expect(clearHoverSpy).toHaveBeenCalled();
    });
  });

  describe('Boundary Drag Constraints', () => {
    beforeEach(() => {
      const testChops = [
        {
          id: 'chop1',
          startTime: 1.0,
          endTime: 3.0,
          padId: 'A1'
        }
      ];

      interactionManager.setCurrentChops(testChops);
    });

    test('should constrain start boundary to not exceed end boundary', () => {
      // Try to move start boundary past end boundary
      interactionManager.dragState = {
        type: 'move-boundary',
        chopId: 'chop1',
        boundaryType: 'start'
      };

      interactionManager.updateBoundaryDrag(3.5); // Try to move past end time (3.0)

      // Should be constrained to just before end time
      expect(interactionManager.dragState.startTime).toBe(2.99);
    });

    test('should constrain end boundary to not precede start boundary', () => {
      // Try to move end boundary before start boundary
      interactionManager.dragState = {
        type: 'move-boundary',
        chopId: 'chop1',
        boundaryType: 'end'
      };

      interactionManager.updateBoundaryDrag(0.5); // Try to move before start time (1.0)

      // Should be constrained to just after start time
      expect(interactionManager.dragState.endTime).toBe(1.01);
    });
  });
});

describe('InteractionManager - Integration', () => {
  test('should integrate with CanvasRenderer correctly', () => {
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
    
    manager.destroy();
  });
});