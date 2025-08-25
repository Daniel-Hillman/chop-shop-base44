/**
 * High-performance canvas rendering system for waveform visualization
 * Implements optimized drawing algorithms with viewport culling
 * Requirements: 1.3, 4.4, 7.1, 7.2
 */

import { CanvasLayerManager } from './CanvasLayerManager.js';
import { ViewportManager } from './ViewportManager.js';

export class CanvasRenderer {
  constructor(container, options = {}) {
    this.container = container;
    this.options = {
      enableViewportCulling: true,
      enableBatching: true,
      maxBatchSize: 1000,
      renderQuality: 'high', // 'low', 'medium', 'high'
      enableAntialiasing: true,
      ...options
    };

    // Initialize managers
    this.layerManager = new CanvasLayerManager();
    this.viewportManager = new ViewportManager();
    
    // Performance tracking
    this.performanceMetrics = {
      frameCount: 0,
      lastFrameTime: 0,
      averageFPS: 0,
      renderTime: 0,
      culledElements: 0
    };

    // Rendering state
    this.isRendering = false;
    this.renderQueue = [];
    this.animationFrameId = null;
    
    // Cached drawing operations
    this.drawingCache = new Map();
    this.pathCache = new Map();
    
    this.initialize();
  }

  /**
   * Initialize the renderer with canvas layers
   */
  initialize() {
    this.layerManager.initialize(this.container);
    
    // Create standard layers with optimized configurations
    this.createStandardLayers();
    
    // Setup viewport change listener
    this.viewportManager.addListener((viewport) => {
      this.handleViewportChange(viewport);
    });

    return this;
  }

  /**
   * Create standard canvas layers for waveform rendering
   */
  createStandardLayers() {
    const layers = [
      {
        name: 'background',
        zIndex: 1,
        options: { 
          alpha: false, // Opaque background for better performance
          desynchronized: true // Allow async rendering
        }
      },
      {
        name: 'waveform',
        zIndex: 2,
        options: { 
          alpha: true,
          desynchronized: true
        }
      },
      {
        name: 'chops',
        zIndex: 3,
        options: { 
          alpha: true,
          desynchronized: false // Sync for precise interaction
        }
      },
      {
        name: 'playhead',
        zIndex: 4,
        options: { 
          alpha: true,
          desynchronized: true
        }
      },
      {
        name: 'interaction',
        zIndex: 5,
        options: { 
          alpha: true,
          desynchronized: false
        }
      },
      {
        name: 'ui',
        zIndex: 6,
        options: { 
          alpha: true,
          desynchronized: true
        }
      }
    ];

    layers.forEach(({ name, zIndex, options }) => {
      this.layerManager.createLayer(name, zIndex, options);
    });

    // Enable interaction only on interaction layer
    this.layerManager.enableLayerInteraction('interaction');
  }

  /**
   * Handle viewport changes and trigger appropriate redraws
   */
  handleViewportChange(viewport) {
    // Mark layers that need redraw based on viewport change
    this.layerManager.markLayerDirty('waveform');
    this.layerManager.markLayerDirty('chops');
    this.layerManager.markLayerDirty('playhead');
    this.layerManager.markLayerDirty('ui');
    
    // Schedule render
    this.scheduleRender();
  }

  /**
   * Render waveform data with viewport culling and optimization
   */
  renderWaveform(waveformData, options = {}) {
    const layer = this.layerManager.getLayer('waveform');
    if (!layer || !waveformData) return;

    const startTime = performance.now();
    const viewport = this.viewportManager.getViewportBounds();
    const { ctx } = layer;
    const { width, height } = this.layerManager.getDimensions();

    // Clear layer
    this.layerManager.clearLayer('waveform');

    // Get rendering configuration based on current zoom level
    // Implements requirement 4.3 - appropriate detail rendering at different scales
    const renderingConfig = this.viewportManager.getRenderingConfig();
    
    // Merge options with rendering config
    const enhancedOptions = {
      ...options,
      ...renderingConfig,
      quality: options.quality || renderingConfig.detailLevel
    };

    // Apply viewport culling with resolution adjustment
    const visibleSamples = this.cullWaveformData(waveformData, viewport, renderingConfig.waveformResolution);
    
    if (visibleSamples.length === 0) {
      this.updatePerformanceMetrics('waveform', startTime, 0);
      return;
    }

    // Choose rendering method based on zoom level and data density
    const renderMethod = this.selectOptimalRenderMethod(visibleSamples, viewport, renderingConfig);
    
    // Configure context for waveform rendering with enhanced options
    this.configureWaveformContext(ctx, enhancedOptions);

    // Render grid if enabled for current detail level
    if (renderingConfig.showGrid) {
      this.renderGrid(ctx, viewport, width, height);
    }

    // Render using selected method with enhanced options
    switch (renderMethod) {
      case 'sample':
        this.renderWaveformSamples(ctx, visibleSamples, viewport, width, height, enhancedOptions);
        break;
      case 'peaks':
        this.renderWaveformPeaks(ctx, visibleSamples, viewport, width, height, enhancedOptions);
        break;
      case 'bars':
        this.renderWaveformBars(ctx, visibleSamples, viewport, width, height, enhancedOptions);
        break;
      case 'line':
        this.renderWaveformLine(ctx, visibleSamples, viewport, width, height, enhancedOptions);
        break;
      default:
        this.renderWaveformPeaks(ctx, visibleSamples, viewport, width, height, enhancedOptions);
    }

    // Render zero-crossings if enabled
    if (renderingConfig.showZeroCrossings) {
      this.renderZeroCrossings(ctx, visibleSamples, viewport, width, height);
    }

    // Update performance metrics
    this.updatePerformanceMetrics('waveform', startTime, visibleSamples.length);
    this.layerManager.markLayerClean('waveform');
  }

  /**
   * Cull waveform data to only include visible samples
   */
  cullWaveformData(waveformData, viewport, resolution = 1) {
    if (!this.options.enableViewportCulling) {
      return waveformData.samples || [];
    }

    const { samples, sampleRate } = waveformData;
    if (!samples || !sampleRate) return [];

    // Calculate sample indices for visible time range
    const startSample = Math.floor(viewport.start * sampleRate);
    const endSample = Math.ceil(viewport.end * sampleRate);
    
    // Add small buffer to avoid edge artifacts
    const bufferSamples = Math.ceil(sampleRate * 0.1); // 100ms buffer
    const cullStart = Math.max(0, startSample - bufferSamples);
    const cullEnd = Math.min(samples.length, endSample + bufferSamples);

    let culledSamples = samples.slice(cullStart, cullEnd);
    
    // Apply resolution downsampling if needed
    if (resolution > 1 && culledSamples.length > resolution) {
      const downsampledSamples = [];
      for (let i = 0; i < culledSamples.length; i += resolution) {
        // Use RMS for better quality downsampling
        let sum = 0;
        let count = 0;
        for (let j = i; j < Math.min(i + resolution, culledSamples.length); j++) {
          sum += culledSamples[j] * culledSamples[j];
          count++;
        }
        downsampledSamples.push(Math.sqrt(sum / count) * Math.sign(culledSamples[i]));
      }
      culledSamples = downsampledSamples;
    }

    this.performanceMetrics.culledElements = samples.length - culledSamples.length;
    
    return {
      samples: culledSamples,
      startIndex: cullStart,
      endIndex: cullEnd,
      sampleRate: sampleRate / resolution
    };
  }

  /**
   * Select optimal rendering method based on data density and zoom level
   * Enhanced with detail level support for different zoom scales
   */
  selectOptimalRenderMethod(visibleSamples, viewport, renderingConfig = {}) {
    const { samples } = visibleSamples;
    if (!samples || samples.length === 0) {
      return 'peaks'; // Default fallback
    }
    
    const { width } = this.layerManager.getDimensions();
    if (width <= 0) {
      return 'peaks'; // Default fallback
    }
    
    const samplesPerPixel = samples.length / width;
    const { detailLevel } = renderingConfig;

    // Use detail level to determine rendering method
    switch (detailLevel) {
      case 'sample':
        return 'sample'; // Individual sample points
        
      case 'high':
        return samplesPerPixel < 2 ? 'line' : 'bars';
        
      case 'medium':
        return samplesPerPixel < 5 ? 'bars' : 'peaks';
        
      case 'low':
      case 'overview':
        return 'peaks';
        
      default:
        // Fallback to original logic
        if (samplesPerPixel < 1) {
          return 'sample';
        } else if (samplesPerPixel < 2) {
          return 'line';
        } else if (samplesPerPixel < 10) {
          return 'bars';
        } else {
          return 'peaks';
        }
    }
  }

  /**
   * Configure canvas context for waveform rendering
   */
  configureWaveformContext(ctx, options) {
    const quality = options.quality || this.options.renderQuality;
    
    // Set rendering quality
    switch (quality) {
      case 'low':
        ctx.imageSmoothingEnabled = false;
        ctx.lineWidth = 1;
        break;
      case 'medium':
        ctx.imageSmoothingEnabled = true;
        ctx.lineWidth = 1.5;
        break;
      case 'high':
        ctx.imageSmoothingEnabled = this.options.enableAntialiasing;
        ctx.lineWidth = 2;
        break;
    }

    // Set waveform colors
    const gradient = ctx.createLinearGradient(0, 0, 0, this.layerManager.getDimensions().height);
    gradient.addColorStop(0, options.topColor || 'rgba(6, 182, 212, 0.8)');
    gradient.addColorStop(0.5, options.centerColor || 'rgba(6, 182, 212, 0.4)');
    gradient.addColorStop(1, options.bottomColor || 'rgba(6, 182, 212, 0.8)');
    
    ctx.fillStyle = gradient;
    ctx.strokeStyle = options.strokeColor || 'rgba(6, 182, 212, 1)';
  }

  /**
   * Render waveform using peak detection (for high data density)
   */
  renderWaveformPeaks(ctx, visibleSamples, viewport, width, height) {
    const { samples } = visibleSamples;
    if (!samples || samples.length === 0 || width <= 0) return;
    
    const centerY = height / 2;
    const samplesPerPixel = samples.length / width;
    
    ctx.beginPath();
    
    for (let x = 0; x < width; x++) {
      const sampleStart = Math.floor(x * samplesPerPixel);
      const sampleEnd = Math.floor((x + 1) * samplesPerPixel);
      
      // Find min and max in this pixel range
      let min = 0, max = 0;
      for (let i = sampleStart; i < Math.min(sampleEnd, samples.length); i++) {
        const sample = samples[i] || 0;
        min = Math.min(min, sample);
        max = Math.max(max, sample);
      }
      
      // Convert to pixel coordinates
      const minY = centerY - (min * centerY);
      const maxY = centerY - (max * centerY);
      
      // Draw vertical line from min to max
      ctx.moveTo(x, minY);
      ctx.lineTo(x, maxY);
    }
    
    ctx.stroke();
  }

  /**
   * Render waveform using bar visualization (for medium data density)
   */
  renderWaveformBars(ctx, visibleSamples, viewport, width, height) {
    const { samples } = visibleSamples;
    if (!samples || samples.length === 0) return;
    
    const centerY = height / 2;
    const barWidth = Math.max(1, width / samples.length);
    
    for (let i = 0; i < samples.length; i++) {
      const sample = samples[i] || 0;
      const x = i * barWidth;
      const barHeight = Math.abs(sample) * centerY;
      
      if (sample >= 0) {
        ctx.fillRect(x, centerY - barHeight, barWidth, barHeight);
      } else {
        ctx.fillRect(x, centerY, barWidth, barHeight);
      }
    }
  }

  /**
   * Render waveform using line visualization (for low data density)
   */
  renderWaveformLine(ctx, visibleSamples, viewport, width, height) {
    const { samples } = visibleSamples;
    if (!samples || samples.length === 0) return;
    
    const centerY = height / 2;
    const stepX = width / samples.length;
    
    ctx.beginPath();
    
    for (let i = 0; i < samples.length; i++) {
      const x = i * stepX;
      const y = centerY - ((samples[i] || 0) * centerY);
      
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    
    ctx.stroke();
    
    // Fill area under curve for better visibility
    ctx.lineTo(width, centerY);
    ctx.lineTo(0, centerY);
    ctx.closePath();
    ctx.globalAlpha = 0.3;
    ctx.fill();
    ctx.globalAlpha = 1.0;
  }

  /**
   * Render waveform at sample level (for maximum zoom)
   * Shows individual sample points and zero-crossings
   */
  renderWaveformSamples(ctx, visibleSamples, viewport, width, height, options = {}) {
    const { samples } = visibleSamples;
    if (!samples || samples.length === 0) return;
    
    const centerY = height / 2;
    const stepX = width / samples.length;
    
    // Draw sample points
    ctx.fillStyle = options.strokeColor || 'rgba(6, 182, 212, 1)';
    
    for (let i = 0; i < samples.length; i++) {
      const x = i * stepX;
      const y = centerY - ((samples[i] || 0) * centerY);
      
      // Draw sample point
      ctx.beginPath();
      ctx.arc(x, y, 2, 0, Math.PI * 2);
      ctx.fill();
      
      // Connect with lines if not too dense
      if (stepX > 4 && i > 0) {
        const prevY = centerY - ((samples[i - 1] || 0) * centerY);
        ctx.strokeStyle = options.strokeColor || 'rgba(6, 182, 212, 0.6)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo((i - 1) * stepX, prevY);
        ctx.lineTo(x, y);
        ctx.stroke();
      }
    }
  }

  /**
   * Render time grid for navigation reference
   */
  renderGrid(ctx, viewport, width, height) {
    const { start, end } = viewport;
    const duration = end - start;
    
    // Calculate appropriate grid interval
    let gridInterval = 1; // seconds
    if (duration > 300) gridInterval = 60; // 1 minute
    else if (duration > 60) gridInterval = 10; // 10 seconds
    else if (duration > 10) gridInterval = 1; // 1 second
    else if (duration > 1) gridInterval = 0.1; // 100ms
    else gridInterval = 0.01; // 10ms
    
    // Draw vertical grid lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    if (ctx.setLineDash) {
      ctx.setLineDash([2, 4]);
    }
    
    const startGrid = Math.ceil(start / gridInterval) * gridInterval;
    
    for (let time = startGrid; time <= end; time += gridInterval) {
      const x = ((time - start) / duration) * width;
      
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    
    // Draw center line
    if (ctx.setLineDash) {
      ctx.setLineDash([]);
    }
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, height / 2);
    ctx.lineTo(width, height / 2);
    ctx.stroke();
  }

  /**
   * Render zero-crossing indicators
   */
  renderZeroCrossings(ctx, visibleSamples, viewport, width, height) {
    const { samples } = visibleSamples;
    if (!samples || samples.length === 0) return;
    
    const centerY = height / 2;
    const stepX = width / samples.length;
    
    // Find zero crossings
    ctx.strokeStyle = 'rgba(255, 165, 0, 0.8)';
    ctx.lineWidth = 1;
    
    for (let i = 1; i < samples.length; i++) {
      const prev = samples[i - 1] || 0;
      const curr = samples[i] || 0;
      
      // Check for zero crossing
      if ((prev >= 0 && curr < 0) || (prev < 0 && curr >= 0)) {
        const x = i * stepX;
        
        ctx.beginPath();
        ctx.moveTo(x, centerY - 10);
        ctx.lineTo(x, centerY + 10);
        ctx.stroke();
        
        // Draw small circle at crossing point
        ctx.fillStyle = 'rgba(255, 165, 0, 1)';
        ctx.beginPath();
        ctx.arc(x, centerY, 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  /**
   * Render chops with enhanced visualization and relationship display
   * Implements requirements: 2.4, 2.5, 5.4, 5.5
   */
  renderChops(chops, selectedChopId = null, options = {}) {
    const layer = this.layerManager.getLayer('chops');
    if (!layer || !chops.length) return;

    const startTime = performance.now();
    const viewport = this.viewportManager.getViewportBounds();
    const { ctx } = layer;
    const { width, height } = this.layerManager.getDimensions();

    // Clear layer
    this.layerManager.clearLayer('chops');

    // Cull chops outside viewport
    const visibleChops = this.cullChops(chops, viewport);
    
    if (visibleChops.length === 0) {
      this.updatePerformanceMetrics('chops', startTime, 0);
      return;
    }

    // Enhanced rendering with relationship analysis
    visibleChops.forEach((chop, index) => {
      this.renderSingleChop(ctx, chop, viewport, width, height, {
        isSelected: chop.id === selectedChopId,
        isHovered: chop.id === options.hoveredChopId,
        isActive: chop.id === options.activeChopId,
        allChops: chops, // Pass all chops for relationship analysis
        ...options
      });
    });

    this.updatePerformanceMetrics('chops', startTime, visibleChops.length);
    this.layerManager.markLayerClean('chops');
  }

  /**
   * Cull chops to only include those visible in viewport
   */
  cullChops(chops, viewport) {
    if (!this.options.enableViewportCulling) {
      return chops;
    }

    return chops.filter(chop => {
      // Check if chop overlaps with viewport
      return !(chop.endTime < viewport.start || chop.startTime > viewport.end);
    });
  }

  /**
   * Render a single chop with enhanced visualization and relationship display
   * Implements requirements: 2.4, 2.5, 5.4, 5.5
   */
  renderSingleChop(ctx, chop, viewport, width, height, options = {}) {
    const startPixel = this.viewportManager.timeToPixel(chop.startTime);
    const endPixel = this.viewportManager.timeToPixel(chop.endTime);
    
    // Clamp to viewport bounds
    const clampedStart = Math.max(0, startPixel);
    const clampedEnd = Math.min(width, endPixel);
    const chopWidth = clampedEnd - clampedStart;
    
    if (chopWidth <= 0) return;
    
    // Use cached color or generate one with enhanced color scheme
    const color = chop.color || this.generateChopColor(chop.id);
    const isSelected = options.isSelected;
    const isHovered = options.isHovered;
    const isActive = options.isActive; // Currently playing
    
    // Enhanced visual states
    const baseAlpha = isSelected ? 0.6 : isHovered ? 0.4 : 0.25;
    const borderAlpha = isSelected ? 1.0 : isHovered ? 0.8 : 0.6;
    
    // Draw chop background with gradient for depth
    const gradient = ctx.createLinearGradient(clampedStart, 0, clampedStart, height);
    if (isActive) {
      // Active chop gets animated gradient
      const pulseOffset = Math.sin(Date.now() / 300) * 0.1;
      gradient.addColorStop(0, this.hexToRgba(color, baseAlpha + pulseOffset));
      gradient.addColorStop(0.5, this.hexToRgba(color, baseAlpha * 0.7 + pulseOffset));
      gradient.addColorStop(1, this.hexToRgba(color, baseAlpha + pulseOffset));
    } else {
      gradient.addColorStop(0, this.hexToRgba(color, baseAlpha));
      gradient.addColorStop(0.5, this.hexToRgba(color, baseAlpha * 0.7));
      gradient.addColorStop(1, this.hexToRgba(color, baseAlpha));
    }
    
    ctx.fillStyle = gradient;
    ctx.fillRect(clampedStart, 0, chopWidth, height);
    
    // Draw enhanced chop boundaries with clear start/end indicators
    this.renderChopBoundaries(ctx, chop, startPixel, endPixel, width, height, {
      color,
      isSelected,
      isHovered,
      isActive,
      borderAlpha
    });
    
    // Draw relationship indicators for overlapping or adjacent chops
    this.renderChopRelationships(ctx, chop, startPixel, endPixel, width, height, options);
    
    // Draw enhanced chop label with better visibility
    this.renderChopLabel(ctx, chop, clampedStart, chopWidth, height, {
      color,
      isSelected,
      isHovered,
      isActive
    });
    
    // Draw duration indicator for longer chops
    if (chopWidth > 80) {
      this.renderDurationIndicator(ctx, chop, clampedStart, chopWidth, height, color);
    }
  }

  /**
   * Render enhanced chop boundaries with clear start/end indicators
   */
  renderChopBoundaries(ctx, chop, startPixel, endPixel, width, height, options) {
    const { color, isSelected, isHovered, isActive, borderAlpha } = options;
    
    // Enhanced boundary styling
    const lineWidth = isSelected ? 4 : isHovered ? 3 : 2;
    const shadowBlur = isSelected ? 6 : isHovered ? 4 : 0;
    
    // Set shadow for glow effect
    if (shadowBlur > 0) {
      ctx.shadowColor = this.hexToRgba(color, 0.6);
      ctx.shadowBlur = shadowBlur;
    }
    
    ctx.strokeStyle = this.hexToRgba(color, borderAlpha);
    ctx.lineWidth = lineWidth;
    ctx.beginPath();
    
    // Start boundary with indicator
    if (startPixel >= 0 && startPixel <= width) {
      ctx.moveTo(startPixel, 0);
      ctx.lineTo(startPixel, height);
      
      // Start indicator triangle
      this.renderBoundaryIndicator(ctx, startPixel, 15, 'start', color, isSelected);
    }
    
    // End boundary with indicator
    if (endPixel >= 0 && endPixel <= width) {
      ctx.moveTo(endPixel, 0);
      ctx.lineTo(endPixel, height);
      
      // End indicator triangle
      this.renderBoundaryIndicator(ctx, endPixel, 15, 'end', color, isSelected);
    }
    
    ctx.stroke();
    
    // Reset shadow
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    
    // Add active chop animation
    if (isActive) {
      this.renderActiveChopAnimation(ctx, startPixel, endPixel, width, height, color);
    }
  }

  /**
   * Render boundary indicators (triangular markers)
   */
  renderBoundaryIndicator(ctx, x, y, type, color, isSelected) {
    const size = isSelected ? 8 : 6;
    const direction = type === 'start' ? 1 : -1;
    
    ctx.fillStyle = this.hexToRgba(color, 0.9);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + (direction * size), y - size);
    ctx.lineTo(x + (direction * size), y + size);
    ctx.closePath();
    ctx.fill();
    
    // Add white outline for better visibility
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  /**
   * Render active chop animation (pulsing border)
   */
  renderActiveChopAnimation(ctx, startPixel, endPixel, width, height, color) {
    const pulseAlpha = 0.3 + 0.2 * Math.sin(Date.now() / 200);
    
    ctx.strokeStyle = this.hexToRgba(color, pulseAlpha);
    ctx.lineWidth = 6;
    ctx.setLineDash([8, 4]);
    ctx.lineDashOffset = (Date.now() / 50) % 12;
    
    ctx.beginPath();
    if (startPixel >= 0 && startPixel <= width) {
      ctx.moveTo(startPixel, 0);
      ctx.lineTo(startPixel, height);
    }
    if (endPixel >= 0 && endPixel <= width) {
      ctx.moveTo(endPixel, 0);
      ctx.lineTo(endPixel, height);
    }
    ctx.stroke();
    
    // Reset line dash
    ctx.setLineDash([]);
    ctx.lineDashOffset = 0;
  }

  /**
   * Render visual relationship indicators for overlapping or adjacent chops
   */
  renderChopRelationships(ctx, chop, startPixel, endPixel, width, height, options) {
    const allChops = options.allChops || [];
    const relationships = this.analyzeChopRelationships(chop, allChops);
    
    relationships.forEach(relationship => {
      this.renderRelationshipIndicator(ctx, relationship, startPixel, endPixel, width, height);
    });
  }

  /**
   * Analyze relationships between chops
   */
  analyzeChopRelationships(currentChop, allChops) {
    const relationships = [];
    const tolerance = 0.05; // 50ms tolerance for adjacency
    
    allChops.forEach(otherChop => {
      if (otherChop.id === currentChop.id) return;
      
      // Check for overlap
      if (!(currentChop.endTime <= otherChop.startTime || currentChop.startTime >= otherChop.endTime)) {
        relationships.push({
          type: 'overlap',
          chop: otherChop,
          severity: this.calculateOverlapSeverity(currentChop, otherChop)
        });
      }
      // Check for adjacency
      else if (Math.abs(currentChop.endTime - otherChop.startTime) <= tolerance) {
        relationships.push({
          type: 'adjacent-after',
          chop: otherChop,
          gap: otherChop.startTime - currentChop.endTime
        });
      }
      else if (Math.abs(otherChop.endTime - currentChop.startTime) <= tolerance) {
        relationships.push({
          type: 'adjacent-before',
          chop: otherChop,
          gap: currentChop.startTime - otherChop.endTime
        });
      }
    });
    
    return relationships;
  }

  /**
   * Calculate overlap severity (0-1)
   */
  calculateOverlapSeverity(chop1, chop2) {
    const overlapStart = Math.max(chop1.startTime, chop2.startTime);
    const overlapEnd = Math.min(chop1.endTime, chop2.endTime);
    const overlapDuration = overlapEnd - overlapStart;
    
    const chop1Duration = chop1.endTime - chop1.startTime;
    const chop2Duration = chop2.endTime - chop2.startTime;
    const minDuration = Math.min(chop1Duration, chop2Duration);
    
    return overlapDuration / minDuration;
  }

  /**
   * Render relationship indicator
   */
  renderRelationshipIndicator(ctx, relationship, startPixel, endPixel, width, height) {
    const otherStartPixel = this.viewportManager.timeToPixel(relationship.chop.startTime);
    const otherEndPixel = this.viewportManager.timeToPixel(relationship.chop.endTime);
    
    switch (relationship.type) {
      case 'overlap':
        this.renderOverlapIndicator(ctx, startPixel, endPixel, otherStartPixel, otherEndPixel, height, relationship.severity);
        break;
      case 'adjacent-after':
      case 'adjacent-before':
        this.renderAdjacencyIndicator(ctx, startPixel, endPixel, otherStartPixel, otherEndPixel, height, relationship.type);
        break;
    }
  }

  /**
   * Render overlap indicator
   */
  renderOverlapIndicator(ctx, start1, end1, start2, end2, height, severity) {
    const overlapStart = Math.max(start1, start2);
    const overlapEnd = Math.min(end1, end2);
    
    if (overlapEnd <= overlapStart) return;
    
    // Draw overlap warning pattern
    const warningColor = severity > 0.5 ? 'rgba(239, 68, 68, 0.6)' : 'rgba(245, 158, 11, 0.6)';
    
    ctx.fillStyle = warningColor;
    ctx.fillRect(overlapStart, height - 8, overlapEnd - overlapStart, 8);
    
    // Draw warning stripes
    ctx.strokeStyle = severity > 0.5 ? 'rgba(239, 68, 68, 0.8)' : 'rgba(245, 158, 11, 0.8)';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    
    for (let x = overlapStart; x < overlapEnd; x += 6) {
      ctx.beginPath();
      ctx.moveTo(x, height - 8);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    
    ctx.setLineDash([]);
  }

  /**
   * Render adjacency indicator
   */
  renderAdjacencyIndicator(ctx, start1, end1, start2, end2, height, type) {
    const connectionPoint = type === 'adjacent-after' ? end1 : start1;
    const otherPoint = type === 'adjacent-after' ? start2 : end2;
    
    // Draw connection line
    ctx.strokeStyle = 'rgba(34, 197, 94, 0.6)';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 2]);
    
    ctx.beginPath();
    ctx.moveTo(connectionPoint, height - 20);
    ctx.lineTo(otherPoint, height - 20);
    ctx.stroke();
    
    // Draw connection dots
    ctx.fillStyle = 'rgba(34, 197, 94, 0.8)';
    ctx.beginPath();
    ctx.arc(connectionPoint, height - 20, 3, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.beginPath();
    ctx.arc(otherPoint, height - 20, 3, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.setLineDash([]);
  }

  /**
   * Render enhanced chop label with better visibility
   */
  renderChopLabel(ctx, chop, startX, width, height, options) {
    const { color, isSelected, isHovered, isActive } = options;
    
    if (width < 30) return; // Too narrow for label
    
    const centerX = startX + width / 2;
    const centerY = height / 2;
    
    // Prepare label text
    const labelText = chop.padId || chop.name || chop.id.slice(0, 3);
    const fontSize = isSelected ? 14 : 12;
    const fontWeight = isSelected ? 'bold' : 'normal';
    
    ctx.font = `${fontWeight} ${fontSize}px monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // Measure text for background
    const textMetrics = ctx.measureText(labelText);
    const textWidth = textMetrics.width;
    const textHeight = fontSize;
    
    const padding = 4;
    const bgWidth = textWidth + padding * 2;
    const bgHeight = textHeight + padding * 2;
    
    // Draw label background for better readability
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(centerX - bgWidth / 2, centerY - bgHeight / 2, bgWidth, bgHeight);
    
    // Draw label border
    ctx.strokeStyle = this.hexToRgba(color, 0.8);
    ctx.lineWidth = 1;
    ctx.strokeRect(centerX - bgWidth / 2, centerY - bgHeight / 2, bgWidth, bgHeight);
    
    // Draw label text
    ctx.fillStyle = isActive ? '#ffffff' : this.hexToRgba(color, 1.0);
    ctx.fillText(labelText, centerX, centerY);
    
    // Add active indicator
    if (isActive) {
      ctx.fillStyle = 'rgba(34, 197, 94, 0.8)';
      ctx.beginPath();
      ctx.arc(centerX + textWidth / 2 + 8, centerY, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  /**
   * Render duration indicator for longer chops
   */
  renderDurationIndicator(ctx, chop, startX, width, height, color) {
    const duration = chop.endTime - chop.startTime;
    const durationText = duration < 1 ? `${(duration * 1000).toFixed(0)}ms` : `${duration.toFixed(2)}s`;
    
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = this.hexToRgba(color, 0.8);
    
    const centerX = startX + width / 2;
    ctx.fillText(durationText, centerX, height - 10);
  }

  /**
   * Convert hex color to rgba with alpha
   */
  hexToRgba(hex, alpha) {
    // Handle HSL colors
    if (hex.startsWith('hsl')) {
      return hex.replace('hsl', 'hsla').replace(')', `, ${alpha})`);
    }
    
    // Handle hex colors
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (result) {
      const r = parseInt(result[1], 16);
      const g = parseInt(result[2], 16);
      const b = parseInt(result[3], 16);
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }
    
    // Fallback for other formats
    return hex;
  }

  /**
   * Generate consistent color for chop based on ID
   */
  generateChopColor(chopId) {
    // Use cached color if available
    if (this.drawingCache.has(`color_${chopId}`)) {
      return this.drawingCache.get(`color_${chopId}`);
    }
    
    // Generate color based on hash of ID
    let hash = 0;
    for (let i = 0; i < chopId.length; i++) {
      hash = ((hash << 5) - hash + chopId.charCodeAt(i)) & 0xffffffff;
    }
    
    const hue = Math.abs(hash) % 360;
    const color = `hsl(${hue}, 70%, 50%)`;
    
    // Cache the color
    this.drawingCache.set(`color_${chopId}`, color);
    
    return color;
  }

  /**
   * Render playhead with smooth animation
   */
  renderPlayhead(currentTime, isPlaying = false, options = {}) {
    const layer = this.layerManager.getLayer('playhead');
    if (!layer) return;

    const viewport = this.viewportManager.getViewportBounds();
    const { ctx } = layer;
    const { width, height } = this.layerManager.getDimensions();

    // Clear layer
    this.layerManager.clearLayer('playhead');

    // Check if playhead is visible
    if (!this.viewportManager.isTimeVisible(currentTime)) {
      this.layerManager.markLayerClean('playhead');
      return;
    }

    const playheadPixel = this.viewportManager.timeToPixel(currentTime);
    
    // Playhead line
    ctx.strokeStyle = options.color || '#ef4444';
    ctx.lineWidth = options.width || 2;
    ctx.beginPath();
    ctx.moveTo(playheadPixel, 0);
    ctx.lineTo(playheadPixel, height);
    ctx.stroke();
    
    // Playhead indicator at top
    ctx.fillStyle = options.color || '#ef4444';
    const indicatorSize = options.indicatorSize || 6;
    ctx.beginPath();
    ctx.moveTo(playheadPixel - indicatorSize, 0);
    ctx.lineTo(playheadPixel + indicatorSize, 0);
    ctx.lineTo(playheadPixel, indicatorSize * 2);
    ctx.closePath();
    ctx.fill();
    
    // Time display for high zoom levels
    if (viewport.pixelsPerSecond > 200 && options.showTime !== false) {
      ctx.fillStyle = '#ffffff';
      ctx.font = '10px monospace';
      ctx.textAlign = 'center';
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 3;
      const timeText = `${currentTime.toFixed(2)}s`;
      ctx.strokeText(timeText, playheadPixel, height - 10);
      ctx.fillText(timeText, playheadPixel, height - 10);
    }

    this.layerManager.markLayerClean('playhead');
  }

  /**
   * Render UI elements (time scale, labels, etc.)
   */
  renderUI(options = {}) {
    const layer = this.layerManager.getLayer('ui');
    if (!layer) return;

    const viewport = this.viewportManager.getViewportBounds();
    const { ctx } = layer;
    const { width, height } = this.layerManager.getDimensions();

    // Clear layer
    this.layerManager.clearLayer('ui');

    // Render time scale
    this.renderTimeScale(ctx, viewport, width, height, options);
    
    // Render zoom indicator
    if (options.showZoomIndicator !== false) {
      this.renderZoomIndicator(ctx, width, height, options);
    }

    this.layerManager.markLayerClean('ui');
  }

  /**
   * Render time scale at bottom of waveform
   */
  renderTimeScale(ctx, viewport, width, height, options) {
    ctx.fillStyle = options.textColor || 'rgba(255, 255, 255, 0.7)';
    ctx.font = options.font || '10px monospace';
    ctx.textAlign = 'center';
    
    // Calculate appropriate time step
    const visibleDuration = viewport.end - viewport.start;
    let timeStep;
    
    if (visibleDuration > 300) timeStep = 60;      // 1 minute
    else if (visibleDuration > 60) timeStep = 10;  // 10 seconds
    else if (visibleDuration > 10) timeStep = 1;   // 1 second
    else if (visibleDuration > 1) timeStep = 0.1;  // 100ms
    else timeStep = 0.01;                          // 10ms
    
    // Draw time markers
    for (let time = Math.ceil(viewport.start / timeStep) * timeStep; 
         time <= viewport.end; 
         time += timeStep) {
      const pixel = this.viewportManager.timeToPixel(time);
      
      if (pixel >= 0 && pixel <= width) {
        // Draw tick mark
        ctx.strokeStyle = options.tickColor || 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(pixel, height - 10);
        ctx.lineTo(pixel, height);
        ctx.stroke();
        
        // Draw time label
        const timeText = timeStep >= 1 ? `${time.toFixed(0)}s` : `${time.toFixed(2)}s`;
        ctx.fillText(timeText, pixel, height - 15);
      }
    }
  }

  /**
   * Render zoom level indicator
   */
  renderZoomIndicator(ctx, width, height, options) {
    const zoomLevel = this.viewportManager.getState().zoomLevel;
    
    ctx.fillStyle = options.zoomIndicatorColor || 'rgba(255, 255, 255, 0.8)';
    ctx.font = options.zoomIndicatorFont || 'bold 12px monospace';
    ctx.textAlign = 'right';
    
    const zoomText = `${zoomLevel.toFixed(1)}x`;
    ctx.fillText(zoomText, width - 10, 20);
  }

  /**
   * Schedule a render using requestAnimationFrame
   */
  scheduleRender() {
    if (this.animationFrameId) return;
    
    this.animationFrameId = requestAnimationFrame(() => {
      this.performRender();
      this.animationFrameId = null;
    });
  }

  /**
   * Perform the actual rendering
   */
  performRender() {
    if (this.isRendering) return;
    
    this.isRendering = true;
    const startTime = performance.now();
    
    try {
      // Process render queue
      while (this.renderQueue.length > 0) {
        const renderTask = this.renderQueue.shift();
        renderTask();
      }
      
      // Update FPS metrics
      this.updateFPSMetrics(startTime);
      
    } finally {
      this.isRendering = false;
    }
  }

  /**
   * Add a render task to the queue
   */
  queueRender(renderTask) {
    this.renderQueue.push(renderTask);
    this.scheduleRender();
  }

  /**
   * Update performance metrics
   */
  updatePerformanceMetrics(operation, startTime, elementCount) {
    const endTime = performance.now();
    this.performanceMetrics.renderTime = endTime - startTime;
    
    // Track specific operation metrics
    if (!this.performanceMetrics[operation]) {
      this.performanceMetrics[operation] = {
        totalTime: 0,
        callCount: 0,
        averageTime: 0
      };
    }
    
    const opMetrics = this.performanceMetrics[operation];
    opMetrics.totalTime += this.performanceMetrics.renderTime;
    opMetrics.callCount++;
    opMetrics.averageTime = opMetrics.totalTime / opMetrics.callCount;
  }

  /**
   * Update FPS metrics
   */
  updateFPSMetrics(startTime) {
    const now = performance.now();
    const frameTime = now - this.performanceMetrics.lastFrameTime;
    
    if (frameTime > 0 && this.performanceMetrics.lastFrameTime > 0) {
      const fps = 1000 / frameTime;
      this.performanceMetrics.frameCount++;
      
      // Calculate rolling average FPS
      const alpha = 0.1; // Smoothing factor
      if (this.performanceMetrics.averageFPS === 0) {
        this.performanceMetrics.averageFPS = fps;
      } else {
        this.performanceMetrics.averageFPS = 
          this.performanceMetrics.averageFPS * (1 - alpha) + fps * alpha;
      }
    }
    
    this.performanceMetrics.lastFrameTime = now;
  }

  /**
   * Get current performance metrics
   */
  getPerformanceMetrics() {
    return { ...this.performanceMetrics };
  }

  /**
   * Reset performance metrics
   */
  resetPerformanceMetrics() {
    this.performanceMetrics = {
      frameCount: 0,
      lastFrameTime: performance.now(),
      averageFPS: 0,
      renderTime: 0,
      culledElements: 0
    };
  }

  /**
   * Set rendering quality
   */
  setRenderQuality(quality) {
    this.options.renderQuality = quality;
    this.layerManager.markAllLayersDirty();
    this.scheduleRender();
  }

  /**
   * Enable or disable viewport culling
   */
  setViewportCulling(enabled) {
    this.options.enableViewportCulling = enabled;
    this.layerManager.markAllLayersDirty();
    this.scheduleRender();
  }

  /**
   * Resize renderer
   */
  resize(width, height) {
    this.layerManager.updateDimensions();
    this.viewportManager.setCanvasDimensions(width, height);
    this.scheduleRender();
  }

  /**
   * Get layer manager instance
   */
  getLayerManager() {
    return this.layerManager;
  }

  /**
   * Get viewport manager instance
   */
  getViewportManager() {
    return this.viewportManager;
  }

  /**
   * Destroy renderer and cleanup resources
   */
  destroy() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    
    this.renderQueue = [];
    this.drawingCache.clear();
    this.pathCache.clear();
    
    this.layerManager.destroy();
    this.isRendering = false;
  }
}

export default CanvasRenderer;