/**
 * Viewport state management for waveform visualization
 * Handles zoom and pan operations with proper bounds checking
 * Implements requirements: 4.1, 4.4 - zoom and navigation controls
 */

export class ViewportManager {
  constructor(initialState = {}) {
    this.state = {
      zoomLevel: 1.0,
      centerTime: 0,
      visibleTimeRange: { start: 0, end: 0 },
      pixelsPerSecond: 100,
      canvasDimensions: { width: 800, height: 200 },
      audioDuration: 0,
      minZoom: 0.1,
      maxZoom: 100,
      ...initialState
    };
    
    this.listeners = new Set();
    this.updateVisibleRange();
  }

  /**
   * Add a listener for viewport changes
   */
  addListener(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  /**
   * Notify all listeners of state changes
   */
  notifyListeners() {
    this.listeners.forEach(callback => callback(this.state));
  }

  /**
   * Update canvas dimensions and recalculate viewport
   */
  setCanvasDimensions(width, height) {
    this.state.canvasDimensions = { width, height };
    this.updateVisibleRange();
    this.notifyListeners();
  }

  /**
   * Set audio duration and adjust viewport if needed
   */
  setAudioDuration(duration) {
    this.state.audioDuration = duration;
    
    // Ensure center time is within bounds
    if (this.state.centerTime > duration) {
      this.state.centerTime = duration / 2;
    }
    
    this.updateVisibleRange();
    this.notifyListeners();
  }

  /**
   * Calculate visible time range based on current zoom and center
   */
  updateVisibleRange() {
    const { zoomLevel, centerTime, canvasDimensions, audioDuration } = this.state;
    
    // Calculate visible duration based on zoom level
    // Base: 100 pixels per second at zoom level 1
    const basePixelsPerSecond = 100;
    const pixelsPerSecond = basePixelsPerSecond * zoomLevel;
    const visibleDuration = canvasDimensions.width / pixelsPerSecond;
    
    // Calculate time range centered on centerTime
    const halfDuration = visibleDuration / 2;
    let startTime = centerTime - halfDuration;
    let endTime = centerTime + halfDuration;
    
    // Clamp to audio bounds
    if (audioDuration > 0) {
      if (startTime < 0) {
        startTime = 0;
        endTime = Math.min(visibleDuration, audioDuration);
      } else if (endTime > audioDuration) {
        endTime = audioDuration;
        startTime = Math.max(0, audioDuration - visibleDuration);
      }
    } else {
      startTime = Math.max(0, startTime);
    }
    
    this.state.visibleTimeRange = { start: startTime, end: endTime };
    this.state.pixelsPerSecond = pixelsPerSecond;
  }

  /**
   * Set zoom level with optional center point
   */
  setZoom(zoomLevel, centerTime = null) {
    // Clamp zoom level to valid range
    zoomLevel = Math.max(this.state.minZoom, Math.min(this.state.maxZoom, zoomLevel));
    
    this.state.zoomLevel = zoomLevel;
    
    if (centerTime !== null) {
      this.state.centerTime = centerTime;
    }
    
    this.updateVisibleRange();
    this.notifyListeners();
    
    return this.state;
  }

  /**
   * Zoom in by a factor (default 2x)
   */
  zoomIn(factor = 2, centerTime = null) {
    return this.setZoom(this.state.zoomLevel * factor, centerTime);
  }

  /**
   * Zoom out by a factor (default 2x)
   */
  zoomOut(factor = 2, centerTime = null) {
    return this.setZoom(this.state.zoomLevel / factor, centerTime);
  }

  /**
   * Zoom to fit entire audio duration
   */
  zoomToFit() {
    if (this.state.audioDuration <= 0) return this.state;
    
    const { canvasDimensions, audioDuration } = this.state;
    const basePixelsPerSecond = 100;
    const requiredPixelsPerSecond = canvasDimensions.width / audioDuration;
    const zoomLevel = Math.max(this.state.minZoom, requiredPixelsPerSecond / basePixelsPerSecond);
    
    return this.setZoom(zoomLevel, audioDuration / 2);
  }

  /**
   * Pan to a specific time
   */
  panToTime(targetTime) {
    // Clamp target time to valid range
    if (this.state.audioDuration > 0) {
      targetTime = Math.max(0, Math.min(this.state.audioDuration, targetTime));
    } else {
      targetTime = Math.max(0, targetTime);
    }
    
    this.state.centerTime = targetTime;
    this.updateVisibleRange();
    this.notifyListeners();
    
    return this.state;
  }

  /**
   * Pan by a relative amount (in seconds)
   */
  panBy(deltaTime) {
    return this.panToTime(this.state.centerTime + deltaTime);
  }

  /**
   * Pan by a relative amount (in pixels)
   */
  panByPixels(deltaPixels) {
    const { pixelsPerSecond } = this.state;
    const deltaTime = deltaPixels / pixelsPerSecond;
    return this.panBy(deltaTime);
  }

  /**
   * Convert time to pixel position within current viewport
   */
  timeToPixel(time) {
    const { visibleTimeRange, canvasDimensions } = this.state;
    const visibleDuration = visibleTimeRange.end - visibleTimeRange.start;
    
    if (visibleDuration <= 0) return 0;
    
    const relativeTime = time - visibleTimeRange.start;
    return (relativeTime / visibleDuration) * canvasDimensions.width;
  }

  /**
   * Convert pixel position to time within current viewport
   */
  pixelToTime(pixel) {
    const { visibleTimeRange, canvasDimensions } = this.state;
    const visibleDuration = visibleTimeRange.end - visibleTimeRange.start;
    
    if (canvasDimensions.width <= 0) {
      return visibleTimeRange.start;
    }
    
    const relativePixel = pixel / canvasDimensions.width;
    return visibleTimeRange.start + (relativePixel * visibleDuration);
  }

  /**
   * Check if a time is visible in current viewport
   */
  isTimeVisible(time) {
    const { visibleTimeRange } = this.state;
    return time >= visibleTimeRange.start && time <= visibleTimeRange.end;
  }

  /**
   * Check if a time range is visible in current viewport
   */
  isRangeVisible(startTime, endTime) {
    const { visibleTimeRange } = this.state;
    return !(endTime < visibleTimeRange.start || startTime > visibleTimeRange.end);
  }

  /**
   * Get viewport bounds for culling calculations
   */
  getViewportBounds() {
    return {
      ...this.state.visibleTimeRange,
      duration: this.state.visibleTimeRange.end - this.state.visibleTimeRange.start,
      pixelsPerSecond: this.state.pixelsPerSecond
    };
  }

  /**
   * Get current viewport state (read-only)
   */
  getState() {
    return { ...this.state };
  }

  /**
   * Reset viewport to default state
   */
  reset() {
    this.state.zoomLevel = 1.0;
    this.state.centerTime = this.state.audioDuration / 2;
    this.updateVisibleRange();
    this.notifyListeners();
    
    return this.state;
  }

  /**
   * Set zoom and pan limits
   */
  setLimits({ minZoom, maxZoom }) {
    if (minZoom !== undefined) {
      this.state.minZoom = Math.max(0.01, minZoom);
    }
    if (maxZoom !== undefined) {
      this.state.maxZoom = Math.min(1000, maxZoom);
    }
    
    // Ensure current zoom is within new limits
    if (this.state.zoomLevel < this.state.minZoom) {
      this.setZoom(this.state.minZoom);
    } else if (this.state.zoomLevel > this.state.maxZoom) {
      this.setZoom(this.state.maxZoom);
    }
    
    return this.state;
  }

  /**
   * Calculate optimal zoom level for a specific time range
   */
  calculateZoomForRange(startTime, endTime, padding = 0.1) {
    const duration = endTime - startTime;
    if (duration <= 0) return this.state.zoomLevel;
    
    const paddedDuration = duration * (1 + padding * 2);
    const { canvasDimensions } = this.state;
    const basePixelsPerSecond = 100;
    const requiredPixelsPerSecond = canvasDimensions.width / paddedDuration;
    
    return requiredPixelsPerSecond / basePixelsPerSecond;
  }

  /**
   * Zoom to show a specific time range
   */
  zoomToRange(startTime, endTime, padding = 0.1) {
    const centerTime = (startTime + endTime) / 2;
    const zoomLevel = this.calculateZoomForRange(startTime, endTime, padding);
    
    return this.setZoom(zoomLevel, centerTime);
  }

  /**
   * Get appropriate detail level for current zoom
   * Implements requirement 4.3 - appropriate detail rendering at different scales
   */
  getDetailLevel() {
    const { zoomLevel, pixelsPerSecond } = this.state;
    
    // Define detail levels based on pixels per second
    if (pixelsPerSecond >= 1000) {
      return 'sample'; // Individual sample points visible
    } else if (pixelsPerSecond >= 400) {
      return 'high'; // High detail waveform
    } else if (pixelsPerSecond >= 100) {
      return 'medium'; // Medium detail waveform
    } else if (pixelsPerSecond >= 25) {
      return 'low'; // Low detail waveform
    } else {
      return 'overview'; // Overview/summary view
    }
  }

  /**
   * Get rendering configuration for current detail level
   */
  getRenderingConfig() {
    const detailLevel = this.getDetailLevel();
    const { pixelsPerSecond, visibleTimeRange } = this.state;
    
    const config = {
      detailLevel,
      pixelsPerSecond,
      visibleDuration: visibleTimeRange.end - visibleTimeRange.start,
      showSamplePoints: false,
      showZeroCrossings: false,
      showGrid: false,
      waveformResolution: 1,
      antialiasing: true
    };
    
    switch (detailLevel) {
      case 'sample':
        config.showSamplePoints = true;
        config.showZeroCrossings = true;
        config.showGrid = true;
        config.waveformResolution = 1; // 1:1 sample resolution
        config.antialiasing = false; // Crisp pixels for sample view
        break;
        
      case 'high':
        config.showZeroCrossings = true;
        config.showGrid = true;
        config.waveformResolution = 2; // 2:1 sample resolution
        config.antialiasing = true;
        break;
        
      case 'medium':
        config.showGrid = pixelsPerSecond >= 150;
        config.waveformResolution = 4; // 4:1 sample resolution
        config.antialiasing = true;
        break;
        
      case 'low':
        config.waveformResolution = 8; // 8:1 sample resolution
        config.antialiasing = true;
        break;
        
      case 'overview':
        config.waveformResolution = 16; // 16:1 sample resolution
        config.antialiasing = true;
        break;
    }
    
    return config;
  }

  /**
   * Get zoom level presets for quick navigation
   */
  getZoomPresets() {
    const { audioDuration, canvasDimensions } = this.state;
    const basePixelsPerSecond = 100;
    
    const presets = [
      {
        name: 'Fit All',
        zoomLevel: this.calculateZoomForRange(0, audioDuration, 0.05),
        description: 'Show entire audio file'
      },
      {
        name: '1:1',
        zoomLevel: 1.0,
        description: 'Default zoom level'
      },
      {
        name: '2x',
        zoomLevel: 2.0,
        description: 'Double zoom'
      },
      {
        name: '5x',
        zoomLevel: 5.0,
        description: '5x zoom for detailed editing'
      },
      {
        name: '10x',
        zoomLevel: 10.0,
        description: '10x zoom for precise editing'
      },
      {
        name: 'Sample',
        zoomLevel: Math.max(10, canvasDimensions.width / (audioDuration * 44100) * basePixelsPerSecond),
        description: 'Sample-level detail'
      }
    ];
    
    return presets.filter(preset => 
      preset.zoomLevel >= this.state.minZoom && 
      preset.zoomLevel <= this.state.maxZoom
    );
  }

  /**
   * Get navigation info for current viewport
   */
  getNavigationInfo() {
    const { visibleTimeRange, audioDuration, zoomLevel } = this.state;
    const visibleDuration = visibleTimeRange.end - visibleTimeRange.start;
    
    return {
      visiblePercentage: audioDuration > 0 ? (visibleDuration / audioDuration) * 100 : 100,
      startPercentage: audioDuration > 0 ? (visibleTimeRange.start / audioDuration) * 100 : 0,
      endPercentage: audioDuration > 0 ? (visibleTimeRange.end / audioDuration) * 100 : 100,
      zoomLevel: zoomLevel,
      detailLevel: this.getDetailLevel(),
      canZoomIn: zoomLevel < this.state.maxZoom,
      canZoomOut: zoomLevel > this.state.minZoom,
      canPanLeft: visibleTimeRange.start > 0,
      canPanRight: visibleTimeRange.end < audioDuration
    };
  }

  /**
   * Smart zoom that maintains context
   */
  smartZoom(factor, mouseTime = null) {
    const centerTime = mouseTime || this.state.centerTime;
    const newZoomLevel = this.state.zoomLevel * factor;
    
    // Clamp to limits
    const clampedZoom = Math.max(this.state.minZoom, Math.min(this.state.maxZoom, newZoomLevel));
    
    // If we hit a limit, provide feedback
    const hitLimit = clampedZoom !== newZoomLevel;
    
    this.setZoom(clampedZoom, centerTime);
    
    return {
      newZoomLevel: clampedZoom,
      hitLimit,
      limitType: clampedZoom === this.state.maxZoom ? 'max' : 'min'
    };
  }

  /**
   * Get optimal zoom for time selection
   */
  getOptimalZoomForSelection(startTime, endTime, targetPercentage = 0.8) {
    const duration = endTime - startTime;
    const { canvasDimensions } = this.state;
    const targetWidth = canvasDimensions.width * targetPercentage;
    const basePixelsPerSecond = 100;
    
    const requiredPixelsPerSecond = targetWidth / duration;
    return requiredPixelsPerSecond / basePixelsPerSecond;
  }
}

export default ViewportManager;