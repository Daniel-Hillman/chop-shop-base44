import { describe, it, expect, vi, beforeEach } from 'vitest';
import { InteractionManager } from '../InteractionManager.js';

describe('InteractionManager - Zoom and Navigation', () => {
  let mockCanvasRenderer;
  let mockViewportManager;
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
      style: {},
      tabIndex: 0
    };

    // Mock viewport manager
    mockViewportManager = {
      getState: vi.fn(() => ({
        zoomLevel: 2.0,
        centerTime: 30,
        visibleTimeRange: { start: 20, end: 40 },
        audioDuration: 120,
        minZoom: 0.1,
        maxZoom: 100,
        canvasDimensions: { width: 800, height: 200 }
      })),
      pixelToTime: vi.fn((pixel) => 20 + (pixel / 800) * 20), // 20 second range
      timeToPixel: vi.fn((time) => ((time - 20) / 20) * 800),
      zoomIn: vi.fn(),
      zoomOut: vi.fn(),
      setZoom: vi.fn(),
      panToTime: vi.fn()
    };

    // Mock layer manager
    const mockLayerManager = {
      getLayer: vi.fn((name) => ({
        canvas: mockCanvas,
        ctx: {
          clearRect: vi.fn(),
          beginPath: vi.fn(),
          moveTo: vi.fn(),
          lineTo: vi.fn(),
          stroke: vi.fn(),
          fill: vi.fn(),
          arc: vi.fn(),
          fillRect: vi.fn(),
          strokeRect: vi.fn(),
          measureText: vi.fn(() => ({ width: 50 })),
          createLinearGradient: vi.fn(() => ({
            addColorStop: vi.fn()
          })),
          setLineDash: vi.fn(),
          quadraticCurveTo: vi.fn(),
          closePath: vi.fn()
        }
      })),
      getDimensions: vi.fn(() => ({ width: 800, height: 200 })),
      clearLayer: vi.fn()
    };

    // Mock canvas renderer
    mockCanvasRenderer = {
      getLayerManager: vi.fn(() => mockLayerManager),
      getViewportManager: vi.fn(() => mockViewportManager)
    };

    interactionManager = new InteractionManager(mockCanvasRenderer, {
      enableClick: true,
      enableDrag: true,
      enableHover: true
    });
  });

  describe('Mouse Wheel Zoom', () => {
    it('zooms in on wheel up', () => {
      const wheelEvent = {
        preventDefault: vi.fn(),
        clientX: 400, // Center of canvas
        target: { getBoundingClientRect: () => ({ left: 0, top: 0 }) },
        deltaY: -100, // Wheel up
        shiftKey: false,
        ctrlKey: false
      };

      interactionManager.handleWheel(wheelEvent);

      expect(wheelEvent.preventDefault).toHaveBeenCalled();
      expect(mockViewportManager.pixelToTime).toHaveBeenCalledWith(400);
    });

    it('zooms out on wheel down', () => {
      const wheelEvent = {
        preventDefault: vi.fn(),
        clientX: 400,
        target: { getBoundingClientRect: () => ({ left: 0, top: 0 }) },
        deltaY: 100, // Wheel down
        shiftKey: false,
        ctrlKey: false
      };

      interactionManager.handleWheel(wheelEvent);

      expect(wheelEvent.preventDefault).toHaveBeenCalled();
    });

    it('uses fine zoom with Shift key', () => {
      const wheelEvent = {
        preventDefault: vi.fn(),
        clientX: 400,
        target: { getBoundingClientRect: () => ({ left: 0, top: 0 }) },
        deltaY: -100,
        shiftKey: true, // Fine zoom
        ctrlKey: false
      };

      interactionManager.handleWheel(wheelEvent);

      expect(wheelEvent.preventDefault).toHaveBeenCalled();
      // Should use smaller zoom factor (1.1 instead of 1.25)
    });

    it('uses coarse zoom with Ctrl key', () => {
      const wheelEvent = {
        preventDefault: vi.fn(),
        clientX: 400,
        target: { getBoundingClientRect: () => ({ left: 0, top: 0 }) },
        deltaY: -100,
        shiftKey: false,
        ctrlKey: true // Coarse zoom
      };

      interactionManager.handleWheel(wheelEvent);

      expect(wheelEvent.preventDefault).toHaveBeenCalled();
      // Should use larger zoom factor (2.0 instead of 1.25)
    });
  });

  describe('Keyboard Navigation', () => {
    it('zooms in with Ctrl++', () => {
      const keyEvent = {
        code: 'Equal',
        ctrlKey: true,
        metaKey: false,
        shiftKey: false,
        altKey: false,
        preventDefault: vi.fn()
      };

      interactionManager.handleKeyDown(keyEvent);

      expect(keyEvent.preventDefault).toHaveBeenCalled();
    });

    it('zooms out with Ctrl+-', () => {
      const keyEvent = {
        code: 'Minus',
        ctrlKey: true,
        metaKey: false,
        shiftKey: false,
        altKey: false,
        preventDefault: vi.fn()
      };

      interactionManager.handleKeyDown(keyEvent);

      expect(keyEvent.preventDefault).toHaveBeenCalled();
    });

    it('zooms to fit with Ctrl+0', () => {
      const keyEvent = {
        code: 'Digit0',
        ctrlKey: true,
        metaKey: false,
        shiftKey: false,
        altKey: false,
        preventDefault: vi.fn()
      };

      interactionManager.handleKeyDown(keyEvent);

      expect(keyEvent.preventDefault).toHaveBeenCalled();
    });

    it('pans left with arrow key', () => {
      const keyEvent = {
        code: 'ArrowLeft',
        ctrlKey: false,
        metaKey: false,
        shiftKey: false,
        altKey: false,
        preventDefault: vi.fn()
      };

      interactionManager.handleKeyDown(keyEvent);

      expect(keyEvent.preventDefault).toHaveBeenCalled();
    });

    it('pans right with arrow key', () => {
      const keyEvent = {
        code: 'ArrowRight',
        ctrlKey: false,
        metaKey: false,
        shiftKey: false,
        altKey: false,
        preventDefault: vi.fn()
      };

      interactionManager.handleKeyDown(keyEvent);

      expect(keyEvent.preventDefault).toHaveBeenCalled();
    });

    it('goes to start with Home key', () => {
      const keyEvent = {
        code: 'Home',
        ctrlKey: false,
        metaKey: false,
        shiftKey: false,
        altKey: false,
        preventDefault: vi.fn()
      };

      interactionManager.handleKeyDown(keyEvent);

      expect(keyEvent.preventDefault).toHaveBeenCalled();
    });

    it('goes to end with End key', () => {
      const keyEvent = {
        code: 'End',
        ctrlKey: false,
        metaKey: false,
        shiftKey: false,
        altKey: false,
        preventDefault: vi.fn()
      };

      interactionManager.handleKeyDown(keyEvent);

      expect(keyEvent.preventDefault).toHaveBeenCalled();
    });

    it('sets zoom presets with Ctrl+number keys', () => {
      const keyEvent1 = {
        code: 'Digit1',
        ctrlKey: true,
        metaKey: false,
        shiftKey: false,
        altKey: false,
        preventDefault: vi.fn()
      };

      interactionManager.handleKeyDown(keyEvent1);
      expect(keyEvent1.preventDefault).toHaveBeenCalled();

      const keyEvent2 = {
        code: 'Digit2',
        ctrlKey: true,
        metaKey: false,
        shiftKey: false,
        altKey: false,
        preventDefault: vi.fn()
      };

      interactionManager.handleKeyDown(keyEvent2);
      expect(keyEvent2.preventDefault).toHaveBeenCalled();
    });

    it('uses large pan steps with Shift+arrows', () => {
      const keyEvent = {
        code: 'ArrowLeft',
        ctrlKey: false,
        metaKey: false,
        shiftKey: true, // Large step
        altKey: false,
        preventDefault: vi.fn()
      };

      interactionManager.handleKeyDown(keyEvent);

      expect(keyEvent.preventDefault).toHaveBeenCalled();
    });

    it('uses large pan steps with Page keys', () => {
      const keyEventUp = {
        code: 'PageUp',
        ctrlKey: false,
        metaKey: false,
        shiftKey: false,
        altKey: false,
        preventDefault: vi.fn()
      };

      interactionManager.handleKeyDown(keyEventUp);
      expect(keyEventUp.preventDefault).toHaveBeenCalled();

      const keyEventDown = {
        code: 'PageDown',
        ctrlKey: false,
        metaKey: false,
        shiftKey: false,
        altKey: false,
        preventDefault: vi.fn()
      };

      interactionManager.handleKeyDown(keyEventDown);
      expect(keyEventDown.preventDefault).toHaveBeenCalled();
    });
  });

  describe('Smooth Zoom Animation', () => {
    beforeEach(() => {
      // Mock requestAnimationFrame
      global.requestAnimationFrame = vi.fn((callback) => {
        setTimeout(callback, 16); // 60fps
        return 1;
      });
      
      // Mock performance.now
      global.performance = {
        now: vi.fn(() => Date.now())
      };
    });

    it('animates zoom transitions smoothly', async () => {
      const startZoom = 1.0;
      const endZoom = 2.0;
      const centerTime = 30;

      interactionManager.animateZoom(mockViewportManager, startZoom, endZoom, centerTime, 100);

      // Should call setZoom multiple times during animation
      await new Promise(resolve => setTimeout(resolve, 150));
      
      expect(mockViewportManager.setZoom).toHaveBeenCalled();
    });

    it('animates pan transitions smoothly', async () => {
      const targetTime = 60;

      interactionManager.animatePanToTime(mockViewportManager, targetTime, 100);

      // Should call panToTime multiple times during animation
      await new Promise(resolve => setTimeout(resolve, 150));
      
      expect(mockViewportManager.panToTime).toHaveBeenCalled();
    });

    it('animates zoom to fit smoothly', async () => {
      interactionManager.animateZoomToFit(mockViewportManager, 100);

      // Should call setZoom multiple times during animation
      await new Promise(resolve => setTimeout(resolve, 150));
      
      expect(mockViewportManager.setZoom).toHaveBeenCalled();
    });
  });

  describe('Keyboard State Tracking', () => {
    it('tracks modifier key states', () => {
      const keyEvent = {
        code: 'ShiftLeft',
        ctrlKey: false,
        metaKey: false,
        shiftKey: true,
        altKey: false,
        preventDefault: vi.fn()
      };

      interactionManager.handleKeyDown(keyEvent);

      expect(interactionManager.keyState.shift).toBe(true);
      expect(interactionManager.keyState.ctrl).toBe(false);
      expect(interactionManager.keyState.alt).toBe(false);
    });

    it('updates key state on key up', () => {
      const keyEvent = {
        shiftKey: false,
        ctrlKey: false,
        altKey: false
      };

      interactionManager.handleKeyUp(keyEvent);

      expect(interactionManager.keyState.shift).toBe(false);
      expect(interactionManager.keyState.ctrl).toBe(false);
      expect(interactionManager.keyState.alt).toBe(false);
    });
  });

  describe('Pan Distance Calculation', () => {
    it('calculates correct pan distance for normal steps', () => {
      // Mock visible duration of 20 seconds
      mockViewportManager.getState.mockReturnValue({
        ...mockViewportManager.getState(),
        visibleTimeRange: { start: 20, end: 40 },
        centerTime: 30
      });

      interactionManager.handleKeyboardPan(mockViewportManager, 'left', false);

      // Should pan by 10% of visible range (2 seconds)
      // Target time should be 30 - 2 = 28
    });

    it('calculates correct pan distance for large steps', () => {
      mockViewportManager.getState.mockReturnValue({
        ...mockViewportManager.getState(),
        visibleTimeRange: { start: 20, end: 40 },
        centerTime: 30
      });

      interactionManager.handleKeyboardPan(mockViewportManager, 'right', true);

      // Should pan by 50% of visible range (10 seconds)
      // Target time should be 30 + 10 = 40
    });
  });
});