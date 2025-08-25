import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import CanvasLayerManager from '../CanvasLayerManager';

// Mock canvas and context
const mockContext = {
  scale: vi.fn(),
  clearRect: vi.fn(),
  set imageSmoothingEnabled(value) { this._imageSmoothingEnabled = value; },
  get imageSmoothingEnabled() { return this._imageSmoothingEnabled; },
  set textBaseline(value) { this._textBaseline = value; },
  get textBaseline() { return this._textBaseline; },
  set textAlign(value) { this._textAlign = value; },
  get textAlign() { return this._textAlign; },
  set fillStyle(value) { this._fillStyle = value; },
  get fillStyle() { return this._fillStyle; },
  set strokeStyle(value) { this._strokeStyle = value; },
  get strokeStyle() { return this._strokeStyle; },
  set lineWidth(value) { this._lineWidth = value; },
  get lineWidth() { return this._lineWidth; },
  set lineCap(value) { this._lineCap = value; },
  get lineCap() { return this._lineCap; },
  set lineJoin(value) { this._lineJoin = value; },
  get lineJoin() { return this._lineJoin; }
};

const mockCanvas = {
  getContext: vi.fn(() => mockContext),
  style: {},
  width: 0,
  height: 0,
  parentNode: null
};

const mockContainer = {
  appendChild: vi.fn(),
  removeChild: vi.fn(),
  getBoundingClientRect: vi.fn(() => ({
    width: 800,
    height: 200,
    top: 0,
    left: 0
  }))
};

describe('CanvasLayerManager', () => {
  let layerManager;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock document.createElement
    vi.spyOn(document, 'createElement').mockImplementation((tagName) => {
      if (tagName === 'canvas') {
        return { ...mockCanvas, style: {} };
      }
      return document.createElement(tagName);
    });
    
    // Mock devicePixelRatio
    Object.defineProperty(window, 'devicePixelRatio', {
      writable: true,
      value: 2
    });
    
    layerManager = new CanvasLayerManager();
    layerManager.initialize(mockContainer);
  });

  afterEach(() => {
    layerManager.destroy();
    vi.restoreAllMocks();
  });

  describe('Initialization', () => {
    it('should initialize with container', () => {
      expect(layerManager.container).toBe(mockContainer);
      expect(layerManager.dimensions).toEqual({ width: 800, height: 200 });
      expect(layerManager.dpr).toBe(2);
    });

    it('should update dimensions from container', () => {
      mockContainer.getBoundingClientRect.mockReturnValue({
        width: 1000,
        height: 300,
        top: 0,
        left: 0
      });
      
      const result = layerManager.updateDimensions();
      
      expect(result).toBe(true);
      expect(layerManager.dimensions).toEqual({ width: 1000, height: 300 });
    });

    it('should handle missing container gracefully', () => {
      const newManager = new CanvasLayerManager();
      const result = newManager.updateDimensions();
      
      expect(result).toBe(false);
    });
  });

  describe('Layer Creation', () => {
    it('should create a new layer', () => {
      const layer = layerManager.createLayer('test', 5);
      
      expect(layer).toBeDefined();
      expect(layer.name).toBe('test');
      expect(layer.zIndex).toBe(5);
      expect(layer.visible).toBe(true);
      expect(layer.dirty).toBe(true);
      expect(layer.canvas).toBeDefined();
      expect(layer.ctx).toBeDefined();
    });

    it('should not create duplicate layers', () => {
      const layer1 = layerManager.createLayer('test', 1);
      const layer2 = layerManager.createLayer('test', 2);
      
      expect(layer1).toBe(layer2);
      expect(layer1.zIndex).toBe(1); // Should keep original z-index
    });

    it('should add canvas to container', () => {
      layerManager.createLayer('test', 1);
      
      expect(mockContainer.appendChild).toHaveBeenCalled();
    });

    it('should configure canvas context', () => {
      layerManager.createLayer('test', 1);
      
      expect(mockContext.scale).toHaveBeenCalledWith(2, 2);
      expect(mockContext.imageSmoothingEnabled).toBe(true);
      expect(mockContext.textBaseline).toBe('middle');
      expect(mockContext.textAlign).toBe('left');
    });

    it('should set canvas dimensions and styling', () => {
      const layer = layerManager.createLayer('test', 1);
      
      expect(layer.canvas.style.width).toBe('800px');
      expect(layer.canvas.style.height).toBe('200px');
      expect(layer.canvas.style.position).toBe('absolute');
      expect(layer.canvas.style.top).toBe('0');
      expect(layer.canvas.style.left).toBe('0');
      expect(layer.canvas.style.zIndex).toBe(1);
      expect(layer.canvas.style.pointerEvents).toBe('none');
      
      expect(layer.canvas.width).toBe(1600); // 800 * 2 (DPR)
      expect(layer.canvas.height).toBe(400); // 200 * 2 (DPR)
    });

    it('should handle custom context options', () => {
      const layer = layerManager.createLayer('test', 1, {
        alpha: false,
        desynchronized: true,
        smoothing: false
      });
      
      expect(mockCanvas.getContext).toHaveBeenCalledWith('2d', {
        alpha: false,
        desynchronized: true
      });
      
      expect(mockContext.imageSmoothingEnabled).toBe(false);
    });
  });

  describe('Layer Management', () => {
    beforeEach(() => {
      layerManager.createLayer('layer1', 1);
      layerManager.createLayer('layer2', 2);
      layerManager.createLayer('layer3', 3);
    });

    it('should get layer by name', () => {
      const layer = layerManager.getLayer('layer2');
      
      expect(layer).toBeDefined();
      expect(layer.name).toBe('layer2');
      expect(layer.zIndex).toBe(2);
    });

    it('should return undefined for non-existent layer', () => {
      const layer = layerManager.getLayer('nonexistent');
      
      expect(layer).toBeUndefined();
    });

    it('should remove layer', () => {
      const layer = layerManager.getLayer('layer2');
      layer.canvas.parentNode = mockContainer;
      
      const result = layerManager.removeLayer('layer2');
      
      expect(result).toBe(true);
      expect(mockContainer.removeChild).toHaveBeenCalledWith(layer.canvas);
      expect(layerManager.getLayer('layer2')).toBeUndefined();
    });

    it('should return false when removing non-existent layer', () => {
      const result = layerManager.removeLayer('nonexistent');
      
      expect(result).toBe(false);
    });

    it('should get all layer names', () => {
      const names = layerManager.getLayerNames();
      
      expect(names).toEqual(['layer1', 'layer2', 'layer3']);
    });

    it('should get layers sorted by z-index', () => {
      // Create layers in different order
      layerManager.createLayer('layer0', 0);
      layerManager.createLayer('layer5', 5);
      
      const sortedLayers = layerManager.getLayersSorted();
      const zIndexes = sortedLayers.map(layer => layer.zIndex);
      
      expect(zIndexes).toEqual([0, 1, 2, 3, 5]);
    });
  });

  describe('Layer Properties', () => {
    let layer;

    beforeEach(() => {
      layer = layerManager.createLayer('test', 1);
    });

    it('should set layer visibility', () => {
      const result = layerManager.setLayerVisibility('test', false);
      
      expect(result).toBe(true);
      expect(layer.visible).toBe(false);
      expect(layer.canvas.style.display).toBe('none');
      
      layerManager.setLayerVisibility('test', true);
      expect(layer.visible).toBe(true);
      expect(layer.canvas.style.display).toBe('block');
    });

    it('should return false for non-existent layer visibility', () => {
      const result = layerManager.setLayerVisibility('nonexistent', false);
      
      expect(result).toBe(false);
    });

    it('should set layer z-index', () => {
      const result = layerManager.setLayerZIndex('test', 10);
      
      expect(result).toBe(true);
      expect(layer.zIndex).toBe(10);
      expect(layer.canvas.style.zIndex).toBe(10);
    });

    it('should return false for non-existent layer z-index', () => {
      const result = layerManager.setLayerZIndex('nonexistent', 10);
      
      expect(result).toBe(false);
    });

    it('should enable layer interaction', () => {
      layerManager.enableLayerInteraction('test');
      
      expect(layer.canvas.style.pointerEvents).toBe('auto');
    });

    it('should disable layer interaction', () => {
      layerManager.disableLayerInteraction('test');
      
      expect(layer.canvas.style.pointerEvents).toBe('none');
    });
  });

  describe('Layer Clearing', () => {
    beforeEach(() => {
      layerManager.createLayer('layer1', 1);
      layerManager.createLayer('layer2', 2);
    });

    it('should clear specific layer', () => {
      const result = layerManager.clearLayer('layer1');
      
      expect(result).toBe(true);
      expect(mockContext.clearRect).toHaveBeenCalledWith(0, 0, 800, 200);
    });

    it('should return false for non-existent layer clear', () => {
      const result = layerManager.clearLayer('nonexistent');
      
      expect(result).toBe(false);
    });

    it('should clear all layers', () => {
      layerManager.clearAllLayers();
      
      // Should be called once for each layer
      expect(mockContext.clearRect).toHaveBeenCalledTimes(2);
    });
  });

  describe('Dirty State Management', () => {
    beforeEach(() => {
      layerManager.createLayer('layer1', 1);
      layerManager.createLayer('layer2', 2);
    });

    it('should mark layer as dirty', () => {
      layerManager.markLayerDirty('layer1');
      
      expect(layerManager.isLayerDirty('layer1')).toBe(true);
    });

    it('should mark layer as clean', () => {
      layerManager.markLayerClean('layer1');
      
      expect(layerManager.isLayerDirty('layer1')).toBe(false);
    });

    it('should mark all layers as dirty', () => {
      layerManager.markAllLayersDirty();
      
      expect(layerManager.isLayerDirty('layer1')).toBe(true);
      expect(layerManager.isLayerDirty('layer2')).toBe(true);
    });

    it('should return false for non-existent layer dirty check', () => {
      expect(layerManager.isLayerDirty('nonexistent')).toBe(false);
    });
  });

  describe('Dimension Updates', () => {
    beforeEach(() => {
      layerManager.createLayer('test', 1);
    });

    it('should update all layers when dimensions change', () => {
      mockContainer.getBoundingClientRect.mockReturnValue({
        width: 1000,
        height: 300,
        top: 0,
        left: 0
      });
      
      layerManager.updateDimensions();
      
      const layer = layerManager.getLayer('test');
      expect(layer.canvas.style.width).toBe('1000px');
      expect(layer.canvas.style.height).toBe('300px');
      expect(layer.canvas.width).toBe(2000); // 1000 * 2 (DPR)
      expect(layer.canvas.height).toBe(600); // 300 * 2 (DPR)
      expect(layer.dirty).toBe(true);
    });

    it('should reconfigure context after resize', () => {
      mockContainer.getBoundingClientRect.mockReturnValue({
        width: 1000,
        height: 300,
        top: 0,
        left: 0
      });
      
      layerManager.updateDimensions();
      
      // Scale should be called again after resize
      expect(mockContext.scale).toHaveBeenCalledWith(2, 2);
    });
  });

  describe('Utility Methods', () => {
    it('should get current dimensions', () => {
      const dimensions = layerManager.getDimensions();
      
      expect(dimensions).toEqual({ width: 800, height: 200 });
      expect(dimensions).not.toBe(layerManager.dimensions); // Should be a copy
    });

    it('should get device pixel ratio', () => {
      const dpr = layerManager.getDevicePixelRatio();
      
      expect(dpr).toBe(2);
    });
  });

  describe('Cleanup', () => {
    beforeEach(() => {
      layerManager.createLayer('layer1', 1);
      layerManager.createLayer('layer2', 2);
    });

    it('should destroy all layers', () => {
      const layer1 = layerManager.getLayer('layer1');
      const layer2 = layerManager.getLayer('layer2');
      
      layer1.canvas.parentNode = mockContainer;
      layer2.canvas.parentNode = mockContainer;
      
      layerManager.destroy();
      
      expect(mockContainer.removeChild).toHaveBeenCalledTimes(2);
      expect(layerManager.getLayerNames()).toEqual([]);
      expect(layerManager.container).toBeNull();
    });

    it('should handle destroy with no layers', () => {
      const emptyManager = new CanvasLayerManager();
      
      expect(() => emptyManager.destroy()).not.toThrow();
    });
  });

  describe('Error Handling', () => {
    it('should handle canvas creation failure gracefully', () => {
      document.createElement.mockImplementation(() => {
        throw new Error('Canvas creation failed');
      });
      
      expect(() => layerManager.createLayer('test', 1)).toThrow();
    });

    it('should handle context creation failure', () => {
      const failingCanvas = {
        ...mockCanvas,
        getContext: vi.fn(() => null)
      };
      
      document.createElement.mockReturnValue(failingCanvas);
      
      expect(() => layerManager.createLayer('test', 1)).toThrow();
    });

    it('should handle missing parent node during removal', () => {
      const layer = layerManager.createLayer('test', 1);
      layer.canvas.parentNode = null;
      
      expect(() => layerManager.removeLayer('test')).not.toThrow();
    });
  });
});