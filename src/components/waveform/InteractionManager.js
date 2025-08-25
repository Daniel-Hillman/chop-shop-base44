/**
 * InteractionManager for handling mouse events on waveform canvas
 * Implements click-to-create-chop functionality and hover effects
 * Requirements: 2.1, 2.3, 5.5, 3.3, 3.4
 */

import { SmartSnapping } from '../../services/SmartSnapping.js';

export class InteractionManager {
  constructor(canvasRenderer, options = {}) {
    this.canvasRenderer = canvasRenderer;
    this.options = {
      clickThreshold: 5, // pixels - max movement for click vs drag
      hoverDelay: 100, // ms - delay before showing hover info
      snapTolerance: 10, // pixels - snap distance for boundaries
      enableHover: true,
      enableClick: true,
      enableDrag: true,
      enableSmartSnapping: true, // Enable snapping to boundaries and zero-crossings
      enableVisualFeedback: true, // Enable enhanced visual feedback during drag
      enableConflictPrevention: true, // Prevent overlapping chops
      dragSensitivity: 1.0, // Multiplier for drag sensitivity
      // Smart snapping configuration
      snapToleranceTime: 0.05, // seconds
      enableZeroCrossingSnap: true,
      enableChopBoundarySnap: true,
      showSnapIndicators: true,
      ...options
    };

    // Initialize smart snapping service
    this.smartSnapping = new SmartSnapping({
      snapTolerance: this.options.snapTolerance,
      snapToleranceTime: this.options.snapToleranceTime,
      enableZeroCrossingSnap: this.options.enableZeroCrossingSnap,
      enableChopBoundarySnap: this.options.enableChopBoundarySnap,
      showSnapIndicators: this.options.showSnapIndicators
    });

    // Interaction state
    this.isMouseDown = false;
    this.isDragging = false;
    this.mouseDownPosition = { x: 0, y: 0 };
    this.currentMousePosition = { x: 0, y: 0 };
    this.hoverTimeout = null;
    this.hoveredElement = null;
    
    // Drag state
    this.dragState = {
      type: null, // 'create-chop', 'move-boundary', 'seek'
      startTime: 0,
      endTime: 0,
      chopId: null,
      boundaryType: null // 'start' or 'end'
    };

    // Event callbacks
    this.callbacks = {
      onChopCreate: null,
      onChopUpdate: null,
      onTimeSeek: null,
      onHover: null
    };

    // Current waveform data for zero-crossing detection
    this.waveformData = null;
    
    // Current snap result for visual feedback
    this.currentSnapResult = null;
    
    // Current chops for interaction
    this.currentChops = [];

    this.initialize();
  }

  /**
   * Initialize event listeners on interaction layer
   */
  initialize() {
    const layerManager = this.canvasRenderer.getLayerManager();
    const interactionLayer = layerManager.getLayer('interaction');
    
    if (!interactionLayer) {
      console.error('InteractionManager: interaction layer not found');
      return;
    }

    const canvas = interactionLayer.canvas;
    
    // Mouse event listeners
    canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
    canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
    canvas.addEventListener('mouseup', this.handleMouseUp.bind(this));
    canvas.addEventListener('mouseleave', this.handleMouseLeave.bind(this));
    canvas.addEventListener('wheel', this.handleWheel.bind(this));
    
    // Touch event listeners for mobile support
    canvas.addEventListener('touchstart', this.handleTouchStart.bind(this));
    canvas.addEventListener('touchmove', this.handleTouchMove.bind(this));
    canvas.addEventListener('touchend', this.handleTouchEnd.bind(this));
    
    // Prevent context menu on right click
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    
    // Keyboard event listeners for navigation shortcuts
    // Make canvas focusable for keyboard events
    canvas.tabIndex = 0;
    canvas.addEventListener('keydown', this.handleKeyDown.bind(this));
    canvas.addEventListener('keyup', this.handleKeyUp.bind(this));
    
    // Set cursor style
    canvas.style.cursor = 'crosshair';
    
    // Track keyboard state
    this.keyState = {
      shift: false,
      ctrl: false,
      alt: false
    };
  }

  /**
   * Set event callbacks
   */
  setCallbacks(callbacks) {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  /**
   * Set waveform data for zero-crossing detection
   * @param {Object} waveformData - Waveform data with samples and sample rate
   */
  setWaveformData(waveformData) {
    this.waveformData = waveformData;
    this.smartSnapping.setWaveformData(waveformData);
  }

  /**
   * Set current chops for boundary snapping
   * @param {Array} chops - Array of chop objects
   */
  setCurrentChops(chops) {
    this.currentChops = chops || [];
    this.smartSnapping.setChops(chops);
  }

  /**
   * Get current chops
   * @returns {Array} Current chops array
   */
  getCurrentChops() {
    return this.currentChops || [];
  }

  /**
   * Handle mouse down events
   */
  handleMouseDown(event) {
    if (!this.options.enableClick && !this.options.enableDrag) return;
    
    event.preventDefault();
    
    const rect = event.target.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    this.isMouseDown = true;
    this.mouseDownPosition = { x, y };
    this.currentMousePosition = { x, y };
    
    // Clear any existing hover state
    this.clearHover();
    
    // Check what was clicked
    const clickedElement = this.getElementAtPosition(x, y);
    
    if (clickedElement) {
      this.handleElementClick(clickedElement, x, y, event);
    } else {
      // Clicked on empty waveform area
      this.initializeChopCreation(x, y);
    }
  }

  /**
   * Handle mouse move events
   */
  handleMouseMove(event) {
    const rect = event.target.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    this.currentMousePosition = { x, y };
    
    if (this.isMouseDown) {
      this.handleDragMove(x, y);
    } else if (this.options.enableHover) {
      this.handleHoverMove(x, y);
    }
  }

  /**
   * Handle mouse up events
   */
  handleMouseUp(event) {
    if (!this.isMouseDown) return;
    
    event.preventDefault();
    
    const rect = event.target.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    if (this.isDragging) {
      this.finalizeDrag(x, y);
    } else {
      this.handleClick(x, y);
    }
    
    this.resetInteractionState();
  }

  /**
   * Handle mouse leave events
   */
  handleMouseLeave(event) {
    this.clearHover();
    this.resetInteractionState();
  }

  /**
   * Handle wheel events for zoom with smooth scaling transitions
   * Implements requirement 4.1 - mouse wheel zoom functionality
   */
  handleWheel(event) {
    event.preventDefault();
    
    const rect = event.target.getBoundingClientRect();
    const x = event.clientX - rect.left;
    
    // Convert mouse position to time for zoom center
    const viewportManager = this.canvasRenderer.getViewportManager();
    const centerTime = viewportManager.pixelToTime(x);
    
    // Calculate zoom factor based on wheel delta and modifiers
    let zoomFactor = 1.25;
    
    // Fine zoom with Shift key
    if (event.shiftKey) {
      zoomFactor = 1.1;
    }
    
    // Coarse zoom with Ctrl key
    if (event.ctrlKey) {
      zoomFactor = 2.0;
    }
    
    // Apply zoom with smooth transition
    if (event.deltaY > 0) {
      this.smoothZoom(viewportManager, 1 / zoomFactor, centerTime);
    } else {
      this.smoothZoom(viewportManager, zoomFactor, centerTime);
    }
  }

  /**
   * Apply smooth zoom transition
   * Implements requirement 4.1 - smooth scaling transitions
   */
  smoothZoom(viewportManager, zoomFactor, centerTime) {
    const currentZoom = viewportManager.getState().zoomLevel;
    const targetZoom = currentZoom * zoomFactor;
    
    // Clamp to zoom limits
    const { minZoom, maxZoom } = viewportManager.getState();
    const clampedZoom = Math.max(minZoom, Math.min(maxZoom, targetZoom));
    
    if (clampedZoom === currentZoom) return; // No change needed
    
    // Animate zoom transition
    this.animateZoom(viewportManager, currentZoom, clampedZoom, centerTime, 150);
  }

  /**
   * Animate zoom transition over time
   */
  animateZoom(viewportManager, startZoom, endZoom, centerTime, duration) {
    const startTime = performance.now();
    
    const animate = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Use easeOutCubic for smooth deceleration
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      
      const currentZoom = startZoom + (endZoom - startZoom) * easeProgress;
      viewportManager.setZoom(currentZoom, centerTime);
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    
    requestAnimationFrame(animate);
  }

  /**
   * Get element at specific position (chop boundary, chop region, etc.)
   */
  getElementAtPosition(x, y) {
    const viewportManager = this.canvasRenderer.getViewportManager();
    const time = viewportManager.pixelToTime(x);
    
    // Check for chop boundaries first (higher priority)
    const chops = this.getCurrentChops();
    
    for (const chop of chops) {
      const startPixel = viewportManager.timeToPixel(chop.startTime);
      const endPixel = viewportManager.timeToPixel(chop.endTime);
      
      // Check start boundary
      if (Math.abs(x - startPixel) <= this.options.snapTolerance) {
        return {
          type: 'chop-boundary',
          chopId: chop.id,
          boundaryType: 'start',
          time: chop.startTime,
          pixel: startPixel
        };
      }
      
      // Check end boundary
      if (Math.abs(x - endPixel) <= this.options.snapTolerance) {
        return {
          type: 'chop-boundary',
          chopId: chop.id,
          boundaryType: 'end',
          time: chop.endTime,
          pixel: endPixel
        };
      }
      
      // Check chop region
      if (time >= chop.startTime && time <= chop.endTime) {
        return {
          type: 'chop-region',
          chopId: chop.id,
          chop: chop,
          time: time,
          pixel: x
        };
      }
    }
    
    return null;
  }

  /**
   * Handle click on specific elements
   */
  handleElementClick(element, x, y, event) {
    switch (element.type) {
      case 'chop-boundary':
        this.initializeBoundaryDrag(element, x, y);
        break;
      case 'chop-region':
        if (event.shiftKey) {
          // Shift+click to select chop
          this.selectChop(element.chopId);
        } else {
          // Regular click to seek to position
          this.seekToTime(element.time);
        }
        break;
    }
  }

  /**
   * Initialize chop creation drag
   */
  initializeChopCreation(x, y) {
    const viewportManager = this.canvasRenderer.getViewportManager();
    const time = viewportManager.pixelToTime(x);
    
    this.dragState = {
      type: 'create-chop',
      startTime: time,
      endTime: time,
      chopId: null,
      boundaryType: null
    };
  }

  /**
   * Initialize boundary drag operation
   */
  initializeBoundaryDrag(element, x, y) {
    this.dragState = {
      type: 'move-boundary',
      startTime: element.time,
      endTime: element.time,
      chopId: element.chopId,
      boundaryType: element.boundaryType
    };
  }

  /**
   * Handle drag movement
   */
  handleDragMove(x, y) {
    const distance = Math.sqrt(
      Math.pow(x - this.mouseDownPosition.x, 2) + 
      Math.pow(y - this.mouseDownPosition.y, 2)
    );
    
    if (!this.isDragging && distance > this.options.clickThreshold) {
      this.isDragging = true;
      this.startDrag();
    }
    
    if (this.isDragging) {
      this.updateDrag(x, y);
    }
  }

  /**
   * Start drag operation
   */
  startDrag() {
    const canvas = this.canvasRenderer.getLayerManager().getLayer('interaction').canvas;
    
    switch (this.dragState.type) {
      case 'create-chop':
        canvas.style.cursor = 'col-resize';
        break;
      case 'move-boundary':
        canvas.style.cursor = 'ew-resize';
        break;
      default:
        canvas.style.cursor = 'grabbing';
    }
  }

  /**
   * Update drag operation
   */
  updateDrag(x, y) {
    const viewportManager = this.canvasRenderer.getViewportManager();
    const currentTime = viewportManager.pixelToTime(x);
    
    switch (this.dragState.type) {
      case 'create-chop':
        this.dragState.endTime = currentTime;
        this.renderDragPreview();
        break;
      case 'move-boundary':
        this.updateBoundaryDrag(currentTime);
        break;
    }
  }

  /**
   * Update boundary drag with constraints and smart snapping
   */
  updateBoundaryDrag(newTime) {
    const chops = this.getCurrentChops();
    const chop = chops.find(c => c.id === this.dragState.chopId);
    
    if (!chop) return;
    
    // Apply smart snapping if enabled
    const snappedTime = this.applySmartSnapping(newTime);
    
    // Apply constraints based on boundary type
    if (this.dragState.boundaryType === 'start') {
      // Start boundary cannot go past end boundary
      this.dragState.startTime = Math.min(snappedTime, chop.endTime - 0.01);
      
      // Check for conflicts with other chops
      const conflictingChop = this.findConflictingChop(this.dragState.startTime, chop.endTime, chop.id);
      if (conflictingChop) {
        this.dragState.startTime = Math.max(this.dragState.startTime, conflictingChop.endTime);
      }
    } else {
      // End boundary cannot go before start boundary
      this.dragState.endTime = Math.max(snappedTime, chop.startTime + 0.01);
      
      // Check for conflicts with other chops
      const conflictingChop = this.findConflictingChop(chop.startTime, this.dragState.endTime, chop.id);
      if (conflictingChop) {
        this.dragState.endTime = Math.min(this.dragState.endTime, conflictingChop.startTime);
      }
    }
    
    this.renderDragPreview();
  }

  /**
   * Apply smart snapping to zero-crossings and other chop boundaries
   */
  applySmartSnapping(time) {
    if (!this.options.enableSmartSnapping) {
      return time;
    }

    const viewportManager = this.canvasRenderer.getViewportManager();
    const pixelsPerSecond = viewportManager.getViewportBounds()?.pixelsPerSecond || 80;
    
    // Use smart snapping service
    const snapResult = this.smartSnapping.applySnapping(
      time, 
      pixelsPerSecond, 
      this.dragState.chopId
    );
    
    // Store snap information for visual feedback
    this.currentSnapResult = snapResult;
    
    return snapResult.snappedTime;
  }

  /**
   * Find chop that would conflict with the given time range
   */
  findConflictingChop(startTime, endTime, excludeChopId) {
    const chops = this.getCurrentChops();
    
    for (const chop of chops) {
      if (chop.id === excludeChopId) continue;
      
      // Check for overlap
      if (!(endTime <= chop.startTime || startTime >= chop.endTime)) {
        return chop;
      }
    }
    
    return null;
  }

  /**
   * Render drag preview on interaction layer
   */
  renderDragPreview() {
    const layerManager = this.canvasRenderer.getLayerManager();
    const interactionLayer = layerManager.getLayer('interaction');
    
    if (!interactionLayer) return;
    
    const { ctx } = interactionLayer;
    const { width, height } = layerManager.getDimensions();
    const viewportManager = this.canvasRenderer.getViewportManager();
    
    // Clear interaction layer
    layerManager.clearLayer('interaction');
    
    switch (this.dragState.type) {
      case 'create-chop':
        this.renderChopCreationPreview(ctx, viewportManager, width, height);
        break;
      case 'move-boundary':
        this.renderBoundaryMovePreview(ctx, viewportManager, width, height);
        break;
    }
  }

  /**
   * Render chop creation preview with enhanced visual feedback
   */
  renderChopCreationPreview(ctx, viewportManager, width, height) {
    const startPixel = viewportManager.timeToPixel(this.dragState.startTime);
    const endPixel = viewportManager.timeToPixel(this.dragState.endTime);
    
    const leftPixel = Math.min(startPixel, endPixel);
    const rightPixel = Math.max(startPixel, endPixel);
    const regionWidth = rightPixel - leftPixel;
    
    if (regionWidth > 1) {
      // Draw preview region with gradient
      const gradient = ctx.createLinearGradient(leftPixel, 0, rightPixel, 0);
      gradient.addColorStop(0, 'rgba(59, 130, 246, 0.4)');
      gradient.addColorStop(0.5, 'rgba(59, 130, 246, 0.2)');
      gradient.addColorStop(1, 'rgba(59, 130, 246, 0.4)');
      
      ctx.fillStyle = gradient;
      ctx.fillRect(leftPixel, 0, regionWidth, height);
      
      // Draw animated boundaries
      const animationOffset = (Date.now() % 1000) / 1000 * 10; // 10px animation cycle
      ctx.strokeStyle = 'rgba(59, 130, 246, 0.9)';
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 4]);
      ctx.lineDashOffset = animationOffset;
      
      ctx.beginPath();
      ctx.moveTo(leftPixel, 0);
      ctx.lineTo(leftPixel, height);
      ctx.moveTo(rightPixel, 0);
      ctx.lineTo(rightPixel, height);
      ctx.stroke();
      
      ctx.setLineDash([]);
      ctx.lineDashOffset = 0;
      
      // Draw drag handles
      this.renderDragHandles(ctx, leftPixel, rightPixel, height);
    }
    
    // Show enhanced timing information
    this.renderEnhancedTimingInfo(ctx, leftPixel, rightPixel, height);
  }

  /**
   * Render boundary move preview with snap indicators
   */
  renderBoundaryMovePreview(ctx, viewportManager, width, height) {
    const chops = this.getCurrentChops();
    const chop = chops.find(c => c.id === this.dragState.chopId);
    
    if (!chop) return;
    
    // Calculate new boundary position
    let startTime = chop.startTime;
    let endTime = chop.endTime;
    
    if (this.dragState.boundaryType === 'start') {
      startTime = this.dragState.startTime;
    } else {
      endTime = this.dragState.endTime;
    }
    
    const startPixel = viewportManager.timeToPixel(startTime);
    const endPixel = viewportManager.timeToPixel(endTime);
    
    // Draw updated chop region with subtle animation
    const pulseAlpha = 0.2 + 0.1 * Math.sin(Date.now() / 200);
    ctx.fillStyle = `rgba(34, 197, 94, ${pulseAlpha})`;
    ctx.fillRect(startPixel, 0, endPixel - startPixel, height);
    
    // Draw static boundary (not being moved)
    const staticBoundaryPixel = this.dragState.boundaryType === 'start' ? endPixel : startPixel;
    ctx.strokeStyle = 'rgba(34, 197, 94, 0.6)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(staticBoundaryPixel, 0);
    ctx.lineTo(staticBoundaryPixel, height);
    ctx.stroke();
    
    // Highlight the boundary being moved with enhanced visuals
    const boundaryPixel = this.dragState.boundaryType === 'start' ? startPixel : endPixel;
    
    // Draw glow effect
    ctx.shadowColor = 'rgba(34, 197, 94, 0.8)';
    ctx.shadowBlur = 8;
    ctx.strokeStyle = 'rgba(34, 197, 94, 1)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(boundaryPixel, 0);
    ctx.lineTo(boundaryPixel, height);
    ctx.stroke();
    
    // Reset shadow
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    
    // Draw drag handle
    this.renderDragHandle(ctx, boundaryPixel, height / 2, 'active');
    
    // Show snap indicators
    this.renderSnapIndicators(ctx, viewportManager, width, height);
    
    // Show enhanced timing information
    this.renderEnhancedTimingInfo(ctx, startPixel, endPixel, height);
  }

  /**
   * Render drag handles for boundaries
   */
  renderDragHandles(ctx, leftPixel, rightPixel, height) {
    this.renderDragHandle(ctx, leftPixel, height / 2, 'start');
    this.renderDragHandle(ctx, rightPixel, height / 2, 'end');
  }

  /**
   * Render individual drag handle
   */
  renderDragHandle(ctx, x, y, type) {
    const handleSize = 8;
    const handleColor = type === 'active' ? 'rgba(34, 197, 94, 1)' : 'rgba(59, 130, 246, 1)';
    
    // Draw handle background
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.fillRect(x - handleSize / 2, y - handleSize / 2, handleSize, handleSize);
    
    // Draw handle border
    ctx.strokeStyle = handleColor;
    ctx.lineWidth = 2;
    ctx.strokeRect(x - handleSize / 2, y - handleSize / 2, handleSize, handleSize);
    
    // Draw handle grip lines
    ctx.strokeStyle = handleColor;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x - 2, y - 3);
    ctx.lineTo(x - 2, y + 3);
    ctx.moveTo(x, y - 3);
    ctx.lineTo(x, y + 3);
    ctx.moveTo(x + 2, y - 3);
    ctx.lineTo(x + 2, y + 3);
    ctx.stroke();
  }

  /**
   * Render snap indicators for nearby boundaries and zero-crossings
   */
  renderSnapIndicators(ctx, viewportManager, width, height) {
    if (!this.options.enableSmartSnapping || !this.options.showSnapIndicators) return;
    
    const currentTime = this.dragState.boundaryType === 'start' ? 
      this.dragState.startTime : this.dragState.endTime;
    const pixelsPerSecond = viewportManager.getViewportBounds()?.pixelsPerSecond || 80;
    
    // Get snap indicators from smart snapping service
    const snapIndicators = this.smartSnapping.getSnapIndicators(
      currentTime, 
      pixelsPerSecond, 
      this.dragState.chopId
    );
    
    // Render each snap indicator
    snapIndicators.forEach(indicator => {
      const pixel = viewportManager.timeToPixel(indicator.time);
      
      // Set line style based on indicator type
      ctx.strokeStyle = indicator.color;
      ctx.lineWidth = indicator.width;
      
      switch (indicator.style) {
        case 'dashed':
          ctx.setLineDash([6, 4]);
          break;
        case 'dotted':
          ctx.setLineDash([2, 2]);
          break;
        default:
          ctx.setLineDash([]);
      }
      
      // Draw indicator line
      ctx.beginPath();
      ctx.moveTo(pixel, 0);
      ctx.lineTo(pixel, height);
      ctx.stroke();
      
      // Draw indicator icon based on type
      this.renderSnapIcon(ctx, pixel, height, indicator);
      
      // Reset line dash
      ctx.setLineDash([]);
    });
    
    // Highlight active snap if available
    if (this.currentSnapResult?.wasSnapped) {
      const snapPixel = viewportManager.timeToPixel(this.currentSnapResult.snappedTime);
      
      // Draw glow effect for active snap
      ctx.shadowColor = 'rgba(255, 165, 0, 0.6)';
      ctx.shadowBlur = 8;
      ctx.strokeStyle = 'rgba(255, 165, 0, 1)';
      ctx.lineWidth = 3;
      
      ctx.beginPath();
      ctx.moveTo(snapPixel, 0);
      ctx.lineTo(snapPixel, height);
      ctx.stroke();
      
      // Reset shadow
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
    }
  }

  /**
   * Render snap icon based on indicator type
   */
  renderSnapIcon(ctx, x, height, indicator) {
    const iconSize = 8;
    const iconY = height - 20;
    
    ctx.fillStyle = indicator.color;
    
    switch (indicator.type) {
      case 'zero-crossing':
        // Draw sine wave icon
        ctx.beginPath();
        ctx.arc(x, iconY, iconSize / 2, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw small wave inside
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x - 3, iconY);
        ctx.quadraticCurveTo(x - 1, iconY - 2, x + 1, iconY);
        ctx.quadraticCurveTo(x + 3, iconY + 2, x + 3, iconY);
        ctx.stroke();
        break;
        
      case 'chop-boundary':
        // Draw boundary marker
        ctx.fillRect(x - iconSize / 2, iconY - iconSize / 2, iconSize, iconSize);
        
        // Draw direction indicator
        ctx.fillStyle = 'white';
        if (indicator.subType === 'start') {
          // Left arrow
          ctx.beginPath();
          ctx.moveTo(x - 2, iconY);
          ctx.lineTo(x + 1, iconY - 2);
          ctx.lineTo(x + 1, iconY + 2);
          ctx.fill();
        } else {
          // Right arrow
          ctx.beginPath();
          ctx.moveTo(x + 2, iconY);
          ctx.lineTo(x - 1, iconY - 2);
          ctx.lineTo(x - 1, iconY + 2);
          ctx.fill();
        }
        break;
        
      case 'grid':
        // Draw grid icon
        ctx.fillRect(x - 1, iconY - iconSize / 2, 2, iconSize);
        ctx.fillRect(x - iconSize / 2, iconY - 1, iconSize, 2);
        break;
        
      default:
        // Default snap icon
        ctx.fillRect(x - iconSize / 2, iconY - iconSize / 2, iconSize, iconSize);
    }
  }

  /**
   * Render enhanced timing information during drag
   */
  renderEnhancedTimingInfo(ctx, startPixel, endPixel, height) {
    const startTime = Math.min(this.dragState.startTime, this.dragState.endTime);
    const endTime = Math.max(this.dragState.startTime, this.dragState.endTime);
    const duration = endTime - startTime;
    const centerPixel = (startPixel + endPixel) / 2;
    
    // Prepare timing text
    const durationText = `${duration.toFixed(3)}s`;
    const startText = `${startTime.toFixed(3)}s`;
    const endText = `${endTime.toFixed(3)}s`;
    
    // Calculate text dimensions
    ctx.font = '11px monospace';
    const durationWidth = ctx.measureText(durationText).width;
    const startWidth = ctx.measureText(startText).width;
    const endWidth = ctx.measureText(endText).width;
    
    const padding = 6;
    const lineHeight = 14;
    const totalHeight = lineHeight * 3 + padding * 2;
    const maxWidth = Math.max(durationWidth, startWidth, endWidth) + padding * 2;
    
    // Position tooltip
    let tooltipX = centerPixel - maxWidth / 2;
    let tooltipY = height - totalHeight - 10;
    
    // Adjust position if near edges
    const { width } = this.canvasRenderer.getLayerManager().getDimensions();
    if (tooltipX < 5) tooltipX = 5;
    if (tooltipX + maxWidth > width - 5) tooltipX = width - maxWidth - 5;
    if (tooltipY < 5) tooltipY = Math.min(startPixel, endPixel) + 20;
    
    // Draw tooltip background with rounded corners
    this.drawRoundedRect(ctx, tooltipX, tooltipY, maxWidth, totalHeight, 4);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
    ctx.fill();
    
    // Draw tooltip border
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 1;
    ctx.stroke();
    
    // Draw timing text
    ctx.fillStyle = 'white';
    ctx.textAlign = 'center';
    const textX = tooltipX + maxWidth / 2;
    
    ctx.fillText(durationText, textX, tooltipY + padding + lineHeight);
    
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.font = '10px monospace';
    ctx.fillText(`Start: ${startText}`, textX, tooltipY + padding + lineHeight * 2);
    ctx.fillText(`End: ${endText}`, textX, tooltipY + padding + lineHeight * 3);
  }

  /**
   * Draw rounded rectangle helper
   */
  drawRoundedRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }

  /**
   * Handle click events (non-drag)
   */
  handleClick(x, y) {
    if (!this.options.enableClick) return;
    
    const viewportManager = this.canvasRenderer.getViewportManager();
    const time = viewportManager.pixelToTime(x);
    
    // Create chop at click position
    this.createChopAtTime(time);
  }

  /**
   * Finalize drag operation
   */
  finalizeDrag(x, y) {
    switch (this.dragState.type) {
      case 'create-chop':
        this.finalizeChopCreation();
        break;
      case 'move-boundary':
        this.finalizeBoundaryMove();
        break;
    }
    
    // Clear interaction layer
    const layerManager = this.canvasRenderer.getLayerManager();
    layerManager.clearLayer('interaction');
  }

  /**
   * Finalize chop creation with conflict prevention
   */
  finalizeChopCreation() {
    let startTime = Math.min(this.dragState.startTime, this.dragState.endTime);
    let endTime = Math.max(this.dragState.startTime, this.dragState.endTime);
    const duration = endTime - startTime;
    
    // Only create chop if duration is meaningful (> 10ms)
    if (duration > 0.01) {
      // Apply conflict prevention if enabled
      if (this.options.enableConflictPrevention) {
        const conflictingChop = this.findConflictingChop(startTime, endTime, null);
        if (conflictingChop) {
          // Adjust boundaries to avoid conflict
          if (startTime < conflictingChop.startTime) {
            endTime = Math.min(endTime, conflictingChop.startTime);
          } else {
            startTime = Math.max(startTime, conflictingChop.endTime);
          }
        }
      }
      
      // Ensure minimum duration after conflict resolution
      if (endTime - startTime > 0.01) {
        this.createChop(startTime, endTime);
      }
    }
  }

  /**
   * Finalize boundary move
   */
  finalizeBoundaryMove() {
    const chops = this.getCurrentChops();
    const chop = chops.find(c => c.id === this.dragState.chopId);
    
    if (!chop) return;
    
    const updates = {};
    
    if (this.dragState.boundaryType === 'start') {
      updates.startTime = this.dragState.startTime;
    } else {
      updates.endTime = this.dragState.endTime;
    }
    
    this.updateChop(this.dragState.chopId, updates);
  }

  /**
   * Handle hover movement
   */
  handleHoverMove(x, y) {
    // Clear existing hover timeout
    if (this.hoverTimeout) {
      clearTimeout(this.hoverTimeout);
    }
    
    // Set new hover timeout
    this.hoverTimeout = setTimeout(() => {
      this.showHoverInfo(x, y);
    }, this.options.hoverDelay);
  }

  /**
   * Show hover information
   */
  showHoverInfo(x, y) {
    const element = this.getElementAtPosition(x, y);
    const viewportManager = this.canvasRenderer.getViewportManager();
    const time = viewportManager.pixelToTime(x);
    
    if (element) {
      this.showElementHover(element, x, y);
    } else {
      this.showTimeHover(time, x, y);
    }
  }

  /**
   * Show enhanced hover info for specific elements with detailed timing information
   * Implements requirement 5.5 - detailed timing and duration information
   */
  showElementHover(element, x, y) {
    const layerManager = this.canvasRenderer.getLayerManager();
    const interactionLayer = layerManager.getLayer('interaction');
    
    if (!interactionLayer) return;
    
    const { ctx } = interactionLayer;
    const { height } = layerManager.getDimensions();
    
    // Clear previous hover
    layerManager.clearLayer('interaction');
    
    let tooltipData = null;
    
    switch (element.type) {
      case 'chop-boundary':
        tooltipData = this.createBoundaryTooltipData(element);
        break;
      case 'chop-region':
        tooltipData = this.createChopTooltipData(element);
        break;
    }
    
    if (tooltipData) {
      this.renderEnhancedTooltip(ctx, tooltipData, x, y);
      this.hoveredElement = element;
      
      // Notify parent component about hover state for visual feedback
      if (this.callbacks.onHover) {
        this.callbacks.onHover(element, x, y);
      }
    }
    
    // Update cursor
    const canvas = interactionLayer.canvas;
    switch (element.type) {
      case 'chop-boundary':
        canvas.style.cursor = 'ew-resize';
        break;
      case 'chop-region':
        canvas.style.cursor = 'pointer';
        break;
      default:
        canvas.style.cursor = 'crosshair';
    }
  }

  /**
   * Create detailed tooltip data for chop boundaries
   */
  createBoundaryTooltipData(element) {
    const chop = this.getCurrentChops().find(c => c.id === element.chopId);
    if (!chop) return null;
    
    const duration = chop.endTime - chop.startTime;
    const boundaryType = element.boundaryType === 'start' ? 'Start' : 'End';
    
    return {
      title: `${boundaryType} Boundary`,
      color: 'rgba(34, 197, 94, 0.9)',
      lines: [
        `Time: ${element.time.toFixed(3)}s`,
        `Chop: ${chop.padId || chop.name || chop.id.slice(0, 8)}`,
        `Duration: ${duration.toFixed(3)}s`,
        `Range: ${chop.startTime.toFixed(3)}s - ${chop.endTime.toFixed(3)}s`
      ],
      actions: [
        'Drag to adjust boundary',
        'Shift+Click to select chop'
      ]
    };
  }

  /**
   * Create detailed tooltip data for chop regions
   */
  createChopTooltipData(element) {
    const chop = element.chop;
    const duration = chop.endTime - chop.startTime;
    const currentTime = element.time;
    const relativeTime = currentTime - chop.startTime;
    const progress = (relativeTime / duration) * 100;
    
    // Analyze relationships with other chops
    const relationships = this.analyzeChopRelationships(chop);
    
    const tooltipData = {
      title: `Chop ${chop.padId || chop.name || chop.id.slice(0, 8)}`,
      color: chop.color || 'rgba(59, 130, 246, 0.9)',
      lines: [
        `Duration: ${duration.toFixed(3)}s`,
        `Start: ${chop.startTime.toFixed(3)}s`,
        `End: ${chop.endTime.toFixed(3)}s`,
        `Position: ${relativeTime.toFixed(3)}s (${progress.toFixed(1)}%)`
      ],
      actions: [
        'Click to seek to position',
        'Shift+Click to select',
        'Drag boundaries to adjust'
      ]
    };
    
    // Add relationship information
    if (relationships.length > 0) {
      tooltipData.lines.push(''); // Separator
      tooltipData.lines.push('Relationships:');
      relationships.forEach(rel => {
        switch (rel.type) {
          case 'overlap':
            const severity = rel.severity > 0.5 ? 'Major' : 'Minor';
            tooltipData.lines.push(`⚠ ${severity} overlap with ${rel.chop.padId || rel.chop.id.slice(0, 3)}`);
            break;
          case 'adjacent-after':
            tooltipData.lines.push(`→ Adjacent to ${rel.chop.padId || rel.chop.id.slice(0, 3)}`);
            break;
          case 'adjacent-before':
            tooltipData.lines.push(`← Adjacent from ${rel.chop.padId || rel.chop.id.slice(0, 3)}`);
            break;
        }
      });
    }
    
    return tooltipData;
  }

  /**
   * Analyze relationships between current chop and others
   */
  analyzeChopRelationships(currentChop) {
    const allChops = this.getCurrentChops();
    const relationships = [];
    const tolerance = 0.05; // 50ms tolerance for adjacency
    
    allChops.forEach(otherChop => {
      if (otherChop.id === currentChop.id) return;
      
      // Check for overlap
      if (!(currentChop.endTime <= otherChop.startTime || currentChop.startTime >= otherChop.endTime)) {
        const overlapStart = Math.max(currentChop.startTime, otherChop.startTime);
        const overlapEnd = Math.min(currentChop.endTime, otherChop.endTime);
        const overlapDuration = overlapEnd - overlapStart;
        
        const currentDuration = currentChop.endTime - currentChop.startTime;
        const otherDuration = otherChop.endTime - otherChop.startTime;
        const minDuration = Math.min(currentDuration, otherDuration);
        
        relationships.push({
          type: 'overlap',
          chop: otherChop,
          severity: overlapDuration / minDuration
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
   * Show hover info for time position
   */
  showTimeHover(time, x, y) {
    const layerManager = this.canvasRenderer.getLayerManager();
    const interactionLayer = layerManager.getLayer('interaction');
    
    if (!interactionLayer) return;
    
    const { ctx } = interactionLayer;
    
    // Clear previous hover
    layerManager.clearLayer('interaction');
    
    const timeText = `${time.toFixed(3)}s`;
    this.renderHoverTooltip(ctx, timeText, x, y, 'rgba(255, 255, 255, 0.9)');
    
    // Reset cursor
    interactionLayer.canvas.style.cursor = 'crosshair';
  }

  /**
   * Render enhanced tooltip with detailed information that doesn't interfere with UI
   * Implements requirement: hover tooltips that do not interfere with the rest of the ui
   */
  renderEnhancedTooltip(ctx, tooltipData, x, y) {
    const padding = 10;
    const lineHeight = 14;
    const titleHeight = 16;
    const fontSize = 11;
    const titleFontSize = 12;
    
    // Calculate tooltip dimensions
    ctx.font = `${fontSize}px monospace`;
    let maxWidth = 0;
    
    // Measure title
    ctx.font = `bold ${titleFontSize}px monospace`;
    const titleWidth = ctx.measureText(tooltipData.title).width;
    maxWidth = Math.max(maxWidth, titleWidth);
    
    // Measure content lines
    ctx.font = `${fontSize}px monospace`;
    tooltipData.lines.forEach(line => {
      if (line.trim()) {
        const lineWidth = ctx.measureText(line).width;
        maxWidth = Math.max(maxWidth, lineWidth);
      }
    });
    
    // Measure action lines (smaller font)
    ctx.font = `${fontSize - 1}px monospace`;
    if (tooltipData.actions) {
      tooltipData.actions.forEach(action => {
        const actionWidth = ctx.measureText(action).width;
        maxWidth = Math.max(maxWidth, actionWidth);
      });
    }
    
    const tooltipWidth = maxWidth + padding * 2;
    const contentLines = tooltipData.lines.filter(line => line.trim()).length;
    const actionLines = tooltipData.actions ? tooltipData.actions.length : 0;
    const separatorHeight = (tooltipData.actions && actionLines > 0) ? 6 : 0;
    const tooltipHeight = titleHeight + (contentLines * lineHeight) + separatorHeight + (actionLines * (lineHeight - 2)) + padding * 2;
    
    // Smart positioning to avoid UI interference
    const { width, height } = this.canvasRenderer.getLayerManager().getDimensions();
    let tooltipX = x + 15; // Offset from cursor
    let tooltipY = y - tooltipHeight - 10;
    
    // Adjust horizontal position
    if (tooltipX + tooltipWidth > width - 10) {
      tooltipX = x - tooltipWidth - 15; // Show on left side
    }
    if (tooltipX < 10) {
      tooltipX = 10; // Minimum margin
    }
    
    // Adjust vertical position
    if (tooltipY < 10) {
      tooltipY = y + 20; // Show below cursor
    }
    if (tooltipY + tooltipHeight > height - 10) {
      tooltipY = height - tooltipHeight - 10; // Keep within bounds
    }
    
    // Draw tooltip with rounded corners and shadow
    this.drawTooltipBackground(ctx, tooltipX, tooltipY, tooltipWidth, tooltipHeight, tooltipData.color);
    
    // Draw content
    let currentY = tooltipY + padding + titleHeight - 2;
    
    // Draw title
    ctx.font = `bold ${titleFontSize}px monospace`;
    ctx.fillStyle = tooltipData.color;
    ctx.textAlign = 'left';
    ctx.fillText(tooltipData.title, tooltipX + padding, currentY);
    
    currentY += 4; // Small gap after title
    
    // Draw content lines
    ctx.font = `${fontSize}px monospace`;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    
    tooltipData.lines.forEach(line => {
      if (line.trim()) {
        currentY += lineHeight;
        
        // Color-code special lines
        if (line.includes('⚠')) {
          ctx.fillStyle = 'rgba(245, 158, 11, 0.9)'; // Warning color
        } else if (line.includes('→') || line.includes('←')) {
          ctx.fillStyle = 'rgba(34, 197, 94, 0.9)'; // Success color
        } else if (line.includes('Relationships:')) {
          ctx.fillStyle = 'rgba(156, 163, 175, 0.9)'; // Gray color
        } else {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        }
        
        ctx.fillText(line, tooltipX + padding, currentY);
      }
    });
    
    // Draw separator line if actions exist
    if (tooltipData.actions && actionLines > 0) {
      currentY += separatorHeight;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(tooltipX + padding, currentY - 2);
      ctx.lineTo(tooltipX + tooltipWidth - padding, currentY - 2);
      ctx.stroke();
    }
    
    // Draw action lines
    if (tooltipData.actions) {
      ctx.font = `${fontSize - 1}px monospace`;
      ctx.fillStyle = 'rgba(156, 163, 175, 0.8)';
      
      tooltipData.actions.forEach(action => {
        currentY += lineHeight - 2;
        ctx.fillText(`• ${action}`, tooltipX + padding, currentY);
      });
    }
  }

  /**
   * Draw tooltip background with rounded corners and shadow
   */
  drawTooltipBackground(ctx, x, y, width, height, accentColor) {
    const radius = 6;
    
    // Draw shadow
    ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;
    
    // Draw background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.92)';
    this.drawRoundedRect(ctx, x, y, width, height, radius);
    ctx.fill();
    
    // Reset shadow
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    
    // Draw border with accent color
    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 2;
    this.drawRoundedRect(ctx, x, y, width, height, radius);
    ctx.stroke();
    
    // Draw subtle inner glow
    ctx.strokeStyle = `${accentColor}40`;
    ctx.lineWidth = 1;
    this.drawRoundedRect(ctx, x + 1, y + 1, width - 2, height - 2, radius - 1);
    ctx.stroke();
  }

  /**
   * Render simple hover tooltip (fallback)
   */
  renderHoverTooltip(ctx, text, x, y, color) {
    const tooltipData = {
      title: text,
      color: color,
      lines: [],
      actions: null
    };
    
    this.renderEnhancedTooltip(ctx, tooltipData, x, y);
  }

  /**
   * Clear hover state
   */
  clearHover() {
    if (this.hoverTimeout) {
      clearTimeout(this.hoverTimeout);
      this.hoverTimeout = null;
    }
    
    if (this.hoveredElement) {
      const layerManager = this.canvasRenderer.getLayerManager();
      layerManager.clearLayer('interaction');
      
      // Reset cursor
      const interactionLayer = layerManager.getLayer('interaction');
      if (interactionLayer) {
        interactionLayer.canvas.style.cursor = 'crosshair';
      }
      
      this.hoveredElement = null;
    }
  }

  /**
   * Reset interaction state
   */
  resetInteractionState() {
    this.isMouseDown = false;
    this.isDragging = false;
    this.dragState = {
      type: null,
      startTime: 0,
      endTime: 0,
      chopId: null,
      boundaryType: null
    };
    
    // Reset cursor
    const layerManager = this.canvasRenderer.getLayerManager();
    const interactionLayer = layerManager.getLayer('interaction');
    if (interactionLayer) {
      interactionLayer.canvas.style.cursor = 'crosshair';
    }
  }

  /**
   * Touch event handlers for mobile support
   */
  handleTouchStart(event) {
    event.preventDefault();
    const touch = event.touches[0];
    const mouseEvent = {
      type: 'mousedown',
      clientX: touch.clientX,
      clientY: touch.clientY,
      preventDefault: () => {},
      target: event.target
    };
    this.handleMouseDown(mouseEvent);
  }

  handleTouchMove(event) {
    event.preventDefault();
    const touch = event.touches[0];
    const mouseEvent = {
      type: 'mousemove',
      clientX: touch.clientX,
      clientY: touch.clientY,
      preventDefault: () => {},
      target: event.target
    };
    this.handleMouseMove(mouseEvent);
  }

  handleTouchEnd(event) {
    event.preventDefault();
    const mouseEvent = {
      type: 'mouseup',
      clientX: this.currentMousePosition.x,
      clientY: this.currentMousePosition.y,
      preventDefault: () => {},
      target: event.target
    };
    this.handleMouseUp(mouseEvent);
  }

  /**
   * Handle keyboard down events for navigation shortcuts
   * Implements requirement 4.4 - keyboard shortcuts for zoom and navigation
   */
  handleKeyDown(event) {
    // Update key state
    this.keyState.shift = event.shiftKey;
    this.keyState.ctrl = event.ctrlKey;
    this.keyState.alt = event.altKey;
    
    const viewportManager = this.canvasRenderer.getViewportManager();
    const viewport = viewportManager.getState();
    
    switch (event.code) {
      // Zoom controls
      case 'Equal': // Plus key
      case 'NumpadAdd':
        if (event.ctrlKey || event.metaKey) {
          event.preventDefault();
          this.smoothZoom(viewportManager, 1.5, viewport.centerTime);
        }
        break;
        
      case 'Minus':
      case 'NumpadSubtract':
        if (event.ctrlKey || event.metaKey) {
          event.preventDefault();
          this.smoothZoom(viewportManager, 1 / 1.5, viewport.centerTime);
        }
        break;
        
      case 'Digit0':
      case 'Numpad0':
        if (event.ctrlKey || event.metaKey) {
          event.preventDefault();
          this.animateZoomToFit(viewportManager);
        }
        break;
        
      // Navigation controls
      case 'ArrowLeft':
        event.preventDefault();
        this.handleKeyboardPan(viewportManager, 'left', event.shiftKey);
        break;
        
      case 'ArrowRight':
        event.preventDefault();
        this.handleKeyboardPan(viewportManager, 'right', event.shiftKey);
        break;
        
      case 'Home':
        event.preventDefault();
        this.animatePanToTime(viewportManager, 0);
        break;
        
      case 'End':
        event.preventDefault();
        this.animatePanToTime(viewportManager, viewport.audioDuration);
        break;
        
      // Zoom presets
      case 'Digit1':
        if (event.ctrlKey || event.metaKey) {
          event.preventDefault();
          this.animateZoomToLevel(viewportManager, 1.0, viewport.centerTime);
        }
        break;
        
      case 'Digit2':
        if (event.ctrlKey || event.metaKey) {
          event.preventDefault();
          this.animateZoomToLevel(viewportManager, 2.0, viewport.centerTime);
        }
        break;
        
      case 'Digit5':
        if (event.ctrlKey || event.metaKey) {
          event.preventDefault();
          this.animateZoomToLevel(viewportManager, 5.0, viewport.centerTime);
        }
        break;
        
      // Fine navigation with Page keys
      case 'PageUp':
        event.preventDefault();
        this.handleKeyboardPan(viewportManager, 'left', true);
        break;
        
      case 'PageDown':
        event.preventDefault();
        this.handleKeyboardPan(viewportManager, 'right', true);
        break;
    }
  }

  /**
   * Handle keyboard up events
   */
  handleKeyUp(event) {
    // Update key state
    this.keyState.shift = event.shiftKey;
    this.keyState.ctrl = event.ctrlKey;
    this.keyState.alt = event.altKey;
  }

  /**
   * Handle keyboard-based panning
   * Implements requirement 4.2 - pan/scroll navigation
   */
  handleKeyboardPan(viewportManager, direction, isLarge = false) {
    const viewport = viewportManager.getState();
    const visibleDuration = viewport.visibleTimeRange.end - viewport.visibleTimeRange.start;
    
    // Calculate pan distance based on current zoom level
    let panDistance = visibleDuration * 0.1; // 10% of visible range
    
    if (isLarge) {
      panDistance = visibleDuration * 0.5; // 50% for large steps
    }
    
    const targetTime = direction === 'left' ? 
      viewport.centerTime - panDistance : 
      viewport.centerTime + panDistance;
    
    this.animatePanToTime(viewportManager, targetTime);
  }

  /**
   * Animate pan to specific time with smooth transition
   */
  animatePanToTime(viewportManager, targetTime, duration = 200) {
    const startTime = performance.now();
    const currentCenterTime = viewportManager.getState().centerTime;
    
    const animate = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Use easeOutCubic for smooth deceleration
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      
      const newTime = currentCenterTime + (targetTime - currentCenterTime) * easeProgress;
      viewportManager.panToTime(newTime);
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    
    requestAnimationFrame(animate);
  }

  /**
   * Animate zoom to specific level
   */
  animateZoomToLevel(viewportManager, targetZoom, centerTime, duration = 200) {
    const startTime = performance.now();
    const currentZoom = viewportManager.getState().zoomLevel;
    
    const animate = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Use easeOutCubic for smooth deceleration
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      
      const zoom = currentZoom + (targetZoom - currentZoom) * easeProgress;
      viewportManager.setZoom(zoom, centerTime);
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    
    requestAnimationFrame(animate);
  }

  /**
   * Animate zoom to fit with smooth transition
   */
  animateZoomToFit(viewportManager, duration = 300) {
    const viewport = viewportManager.getState();
    const targetCenterTime = viewport.audioDuration / 2;
    
    // Calculate zoom to fit
    const { canvasDimensions, audioDuration } = viewport;
    const basePixelsPerSecond = 100;
    const requiredPixelsPerSecond = canvasDimensions.width / audioDuration;
    const targetZoom = Math.max(viewport.minZoom, requiredPixelsPerSecond / basePixelsPerSecond);
    
    // Animate both zoom and pan simultaneously
    const startTime = performance.now();
    const currentZoom = viewport.zoomLevel;
    const currentCenterTime = viewport.centerTime;
    
    const animate = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Use easeOutCubic for smooth deceleration
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      
      const zoom = currentZoom + (targetZoom - currentZoom) * easeProgress;
      const centerTime = currentCenterTime + (targetCenterTime - currentCenterTime) * easeProgress;
      
      viewportManager.setZoom(zoom, centerTime);
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    
    requestAnimationFrame(animate);
  }

  /**
   * Utility methods for external integration
   */

  /**
   * Create chop at specific time (click functionality)
   */
  createChopAtTime(time) {
    if (this.callbacks.onChopCreate) {
      // Create a small chop (100ms) centered on click time
      const duration = 0.1;
      const startTime = Math.max(0, time - duration / 2);
      const endTime = startTime + duration;
      
      this.callbacks.onChopCreate(startTime, endTime);
    }
  }

  /**
   * Create chop with specific start and end times
   */
  createChop(startTime, endTime) {
    if (this.callbacks.onChopCreate) {
      this.callbacks.onChopCreate(startTime, endTime);
    }
  }

  /**
   * Update existing chop
   */
  updateChop(chopId, updates) {
    if (this.callbacks.onChopUpdate) {
      this.callbacks.onChopUpdate(chopId, updates);
    }
  }

  /**
   * Seek to specific time
   */
  seekToTime(time) {
    if (this.callbacks.onTimeSeek) {
      this.callbacks.onTimeSeek(time);
    }
  }

  /**
   * Select chop
   */
  selectChop(chopId) {
    if (this.callbacks.onChopUpdate) {
      this.callbacks.onChopUpdate(chopId, { selected: true });
    }
  }

  /**
   * Get current chops from parent component
   * This should be set by the parent component
   */
  getCurrentChops() {
    return this.currentChops || [];
  }

  /**
   * Set current chops for interaction detection
   */
  setCurrentChops(chops) {
    this.currentChops = chops;
  }

  /**
   * Convert pixel position to time with precision
   */
  pixelToTime(pixel) {
    const viewportManager = this.canvasRenderer.getViewportManager();
    return viewportManager.pixelToTime(pixel);
  }

  /**
   * Convert time to pixel position with precision
   */
  timeToPixel(time) {
    const viewportManager = this.canvasRenderer.getViewportManager();
    return viewportManager.timeToPixel(time);
  }

  /**
   * Enable or disable specific interaction types
   */
  setInteractionEnabled(type, enabled) {
    switch (type) {
      case 'click':
        this.options.enableClick = enabled;
        break;
      case 'drag':
        this.options.enableDrag = enabled;
        break;
      case 'hover':
        this.options.enableHover = enabled;
        if (!enabled) {
          this.clearHover();
        }
        break;
    }
  }

  /**
   * Destroy interaction manager and cleanup
   */
  destroy() {
    this.clearHover();
    this.resetInteractionState();
    
    const layerManager = this.canvasRenderer.getLayerManager();
    const interactionLayer = layerManager.getLayer('interaction');
    
    if (interactionLayer) {
      const canvas = interactionLayer.canvas;
      
      // Remove event listeners
      canvas.removeEventListener('mousedown', this.handleMouseDown);
      canvas.removeEventListener('mousemove', this.handleMouseMove);
      canvas.removeEventListener('mouseup', this.handleMouseUp);
      canvas.removeEventListener('mouseleave', this.handleMouseLeave);
      canvas.removeEventListener('wheel', this.handleWheel);
      canvas.removeEventListener('touchstart', this.handleTouchStart);
      canvas.removeEventListener('touchmove', this.handleTouchMove);
      canvas.removeEventListener('touchend', this.handleTouchEnd);
    }
  }
}

export default InteractionManager;