/**
 * Canvas layer management system for multi-layer waveform rendering
 * Implements requirements: 7.1 - optimized canvas drawing techniques
 */

export class CanvasLayerManager {
  constructor() {
    this.layers = new Map();
    this.container = null;
    this.dimensions = { width: 0, height: 0 };
    this.dpr = window.devicePixelRatio || 1;
  }

  /**
   * Initialize layer manager with container element
   */
  initialize(container) {
    this.container = container;
    this.updateDimensions();
    return this;
  }

  /**
   * Update canvas dimensions based on container
   */
  updateDimensions() {
    if (!this.container) return false;
    
    const rect = this.container.getBoundingClientRect();
    this.dimensions = {
      width: rect.width || 800,
      height: rect.height || 200
    };
    
    // Update all existing layers
    this.layers.forEach(layer => {
      this.resizeLayer(layer);
    });
    
    return true;
  }

  /**
   * Create a new canvas layer
   */
  createLayer(name, zIndex = 0, options = {}) {
    if (this.layers.has(name)) {
      console.warn(`Layer ${name} already exists`);
      return this.layers.get(name);
    }

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', {
      alpha: options.alpha !== false,
      desynchronized: options.desynchronized || false,
      ...options.contextOptions
    });

    if (!ctx) {
      throw new Error(`Failed to create 2D context for layer ${name}`);
    }

    const layer = {
      name,
      canvas,
      ctx,
      zIndex,
      visible: true,
      dirty: true,
      options
    };

    this.setupLayer(layer);
    this.layers.set(name, layer);
    
    return layer;
  }  
/**
   * Setup canvas layer with proper styling and dimensions
   */
  setupLayer(layer) {
    const { canvas, zIndex } = layer;
    
    // Set canvas styling
    canvas.style.position = 'absolute';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.zIndex = zIndex;
    canvas.style.pointerEvents = 'none';
    
    this.resizeLayer(layer);
    this.configureContext(layer);
    
    // Add to container
    if (this.container) {
      this.container.appendChild(canvas);
    }
  }

  /**
   * Resize a canvas layer to current dimensions
   */
  resizeLayer(layer) {
    const { canvas, ctx } = layer;
    const { width, height } = this.dimensions;
    
    // Set display size
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    
    // Set actual size for high DPI
    canvas.width = width * this.dpr;
    canvas.height = height * this.dpr;
    
    // Scale context for high DPI if context exists
    if (ctx) {
      ctx.scale(this.dpr, this.dpr);
      // Reconfigure context after resize
      this.configureContext(layer);
    }
    
    layer.dirty = true;
  }

  /**
   * Configure canvas context for optimal performance
   */
  configureContext(layer) {
    const { ctx, options } = layer;
    
    // Performance optimizations
    ctx.imageSmoothingEnabled = options.smoothing !== false;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    
    // Set default styles
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }

  /**
   * Get a layer by name
   */
  getLayer(name) {
    return this.layers.get(name);
  }

  /**
   * Remove a layer
   */
  removeLayer(name) {
    const layer = this.layers.get(name);
    if (!layer) return false;
    
    if (layer.canvas.parentNode) {
      layer.canvas.parentNode.removeChild(layer.canvas);
    }
    
    this.layers.delete(name);
    return true;
  }

  /**
   * Clear a specific layer
   */
  clearLayer(name) {
    const layer = this.layers.get(name);
    if (!layer) return false;
    
    const { ctx } = layer;
    const { width, height } = this.dimensions;
    ctx.clearRect(0, 0, width, height);
    
    return true;
  }

  /**
   * Clear all layers
   */
  clearAllLayers() {
    this.layers.forEach((layer, name) => {
      this.clearLayer(name);
    });
  }

  /**
   * Set layer visibility
   */
  setLayerVisibility(name, visible) {
    const layer = this.layers.get(name);
    if (!layer) return false;
    
    layer.visible = visible;
    layer.canvas.style.display = visible ? 'block' : 'none';
    
    return true;
  }

  /**
   * Set layer z-index
   */
  setLayerZIndex(name, zIndex) {
    const layer = this.layers.get(name);
    if (!layer) return false;
    
    layer.zIndex = zIndex;
    layer.canvas.style.zIndex = zIndex;
    
    return true;
  }

  /**
   * Mark layer as dirty (needs redraw)
   */
  markLayerDirty(name) {
    const layer = this.layers.get(name);
    if (layer) {
      layer.dirty = true;
    }
  }

  /**
   * Mark all layers as dirty
   */
  markAllLayersDirty() {
    this.layers.forEach(layer => {
      layer.dirty = true;
    });
  }

  /**
   * Check if layer is dirty
   */
  isLayerDirty(name) {
    const layer = this.layers.get(name);
    return layer ? layer.dirty : false;
  }

  /**
   * Mark layer as clean (up to date)
   */
  markLayerClean(name) {
    const layer = this.layers.get(name);
    if (layer) {
      layer.dirty = false;
    }
  }

  /**
   * Get all layer names
   */
  getLayerNames() {
    return Array.from(this.layers.keys());
  }

  /**
   * Get layers sorted by z-index
   */
  getLayersSorted() {
    return Array.from(this.layers.values())
      .sort((a, b) => a.zIndex - b.zIndex);
  }

  /**
   * Enable pointer events for a layer
   */
  enableLayerInteraction(name) {
    const layer = this.layers.get(name);
    if (layer) {
      layer.canvas.style.pointerEvents = 'auto';
    }
  }

  /**
   * Disable pointer events for a layer
   */
  disableLayerInteraction(name) {
    const layer = this.layers.get(name);
    if (layer) {
      layer.canvas.style.pointerEvents = 'none';
    }
  }

  /**
   * Destroy all layers and cleanup
   */
  destroy() {
    this.layers.forEach((layer, name) => {
      this.removeLayer(name);
    });
    
    this.layers.clear();
    this.container = null;
  }

  /**
   * Get current dimensions
   */
  getDimensions() {
    return { ...this.dimensions };
  }

  /**
   * Get device pixel ratio
   */
  getDevicePixelRatio() {
    return this.dpr;
  }
}

export default CanvasLayerManager;