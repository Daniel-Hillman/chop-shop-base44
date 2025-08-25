/**
 * PlayheadManager - Handles real-time playback synchronization and smooth animation
 * Implements requirements: 5.1, 5.2, 5.3 - moving playhead, smooth animation, chop highlighting
 */

export class PlayheadManager {
  constructor(canvasRenderer, options = {}) {
    this.renderer = canvasRenderer;
    this.options = {
      smoothingFactor: 0.15, // Lower = smoother, higher = more responsive
      maxInterpolationTime: 100, // Max time to interpolate in ms
      playheadColor: '#ef4444',
      playheadWidth: 2,
      activeChopColor: '#fbbf24',
      activeChopOpacity: 0.3,
      showTimeDisplay: true,
      animationQuality: 'high', // 'low', 'medium', 'high'
      ...options
    };

    // Playhead state
    this.currentTime = 0;
    this.targetTime = 0;
    this.isPlaying = false;
    this.lastUpdateTime = 0;
    this.interpolatedTime = 0;
    
    // Animation state
    this.animationFrameId = null;
    this.isAnimating = false;
    
    // Chop tracking
    this.activeChops = new Set();
    this.allChops = [];
    this.chopHighlights = new Map(); // chopId -> highlight state
    
    // Performance tracking
    this.frameCount = 0;
    this.lastFPSCheck = 0;
    this.currentFPS = 0;
    
    // Sync tracking
    this.syncHistory = [];
    this.maxSyncHistory = 10;
    this.syncAccuracy = 0;
    
    this.initialize();
  }

  /**
   * Initialize the playhead manager
   */
  initialize() {
    // Start animation loop if playing
    if (this.isPlaying) {
      this.startAnimation();
    }
    
    return this;
  }

  /**
   * Update playback state from external source (YouTube player)
   * @param {number} currentTime - Current playback time in seconds
   * @param {boolean} isPlaying - Whether playback is active
   */
  updatePlaybackState(currentTime, isPlaying) {
    // Validate input
    if (typeof currentTime !== 'number' || isNaN(currentTime)) {
      currentTime = 0;
    }
    
    const now = performance.now();
    const timeDelta = now - this.lastUpdateTime;
    
    // Track sync accuracy
    this.trackSyncAccuracy(currentTime, timeDelta);
    
    // Update target time
    this.targetTime = currentTime;
    this.lastUpdateTime = now;
    
    // Always update current time immediately
    this.currentTime = currentTime;
    
    // Handle play/pause state changes
    if (isPlaying !== this.isPlaying) {
      this.isPlaying = isPlaying;
      
      if (isPlaying) {
        // Initialize interpolated time when starting playback
        this.interpolatedTime = currentTime;
        try {
          this.startAnimation();
        } catch (error) {
          console.warn('Failed to start animation:', error);
        }
      } else {
        this.stopAnimation();
        // Immediately update to target time when paused
        this.interpolatedTime = currentTime;
      }
    } else if (!isPlaying) {
      // Update interpolated time even when not playing
      this.interpolatedTime = currentTime;
    }
    
    // Update active chops
    this.updateActiveChops();
    
    // Trigger render if not animating
    if (!this.isAnimating) {
      this.render();
    }
  }

  /**
   * Track synchronization accuracy for performance monitoring
   */
  trackSyncAccuracy(newTime, timeDelta) {
    if (this.syncHistory.length > 0) {
      const lastSync = this.syncHistory[this.syncHistory.length - 1];
      const expectedTime = lastSync.time + (timeDelta / 1000);
      const actualTime = newTime;
      const drift = Math.abs(actualTime - expectedTime);
      
      this.syncHistory.push({
        time: newTime,
        timestamp: performance.now(),
        drift: drift,
        timeDelta: timeDelta
      });
    } else {
      this.syncHistory.push({
        time: newTime,
        timestamp: performance.now(),
        drift: 0,
        timeDelta: 0
      });
    }
    
    // Keep history size manageable
    if (this.syncHistory.length > this.maxSyncHistory) {
      this.syncHistory.shift();
    }
    
    // Calculate average sync accuracy
    if (this.syncHistory.length > 1) {
      const totalDrift = this.syncHistory.reduce((sum, sync) => sum + sync.drift, 0);
      this.syncAccuracy = totalDrift / this.syncHistory.length;
    }
  }

  /**
   * Start smooth animation loop
   */
  startAnimation() {
    if (this.isAnimating) return;
    
    this.isAnimating = true;
    this.interpolatedTime = this.currentTime;
    
    const animate = (timestamp) => {
      if (!this.isAnimating) return;
      
      try {
        this.updateInterpolation(timestamp);
        this.render();
        this.updatePerformanceMetrics(timestamp);
        
        this.animationFrameId = requestAnimationFrame(animate);
      } catch (error) {
        console.warn('PlayheadManager animation error:', error);
        // Continue animation despite errors
        try {
          this.animationFrameId = requestAnimationFrame(animate);
        } catch (rafError) {
          console.error('RequestAnimationFrame failed completely:', rafError);
          this.isAnimating = false;
        }
      }
    };
    
    try {
      this.animationFrameId = requestAnimationFrame(animate);
    } catch (error) {
      console.warn('Initial RequestAnimationFrame failed:', error);
      this.isAnimating = false;
      throw error; // Re-throw for test detection
    }
  }

  /**
   * Stop animation loop
   */
  stopAnimation() {
    this.isAnimating = false;
    
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  /**
   * Update interpolated time for smooth animation
   */
  updateInterpolation(timestamp) {
    if (!this.isPlaying) return;
    
    const now = performance.now();
    const timeSinceLastUpdate = now - this.lastUpdateTime;
    
    // If too much time has passed, jump to target
    if (timeSinceLastUpdate > this.options.maxInterpolationTime) {
      this.interpolatedTime = this.targetTime;
      this.currentTime = this.targetTime;
      this.lastUpdateTime = now;
      this.updateActiveChops();
      return;
    }
    
    // Calculate expected time based on playback
    const expectedTime = this.targetTime + (timeSinceLastUpdate / 1000);
    
    // Smooth interpolation towards expected time
    const smoothingFactor = this.options.smoothingFactor;
    
    if (this.interpolatedTime === 0) {
      // Initialize interpolated time
      this.interpolatedTime = this.targetTime;
    } else {
      // Smooth interpolation
      this.interpolatedTime += (expectedTime - this.interpolatedTime) * smoothingFactor;
    }
    
    this.currentTime = this.interpolatedTime;
    
    // Update active chops based on interpolated time
    this.updateActiveChops();
  }

  /**
   * Update which chops are currently active during playback
   */
  updateActiveChops() {
    const currentTime = this.interpolatedTime || this.currentTime;
    const newActiveChops = new Set();
    
    // Find chops that contain the current time
    this.allChops.forEach(chop => {
      if (currentTime >= chop.startTime && currentTime <= chop.endTime) {
        const chopId = chop.id || chop.padId;
        newActiveChops.add(chopId);
        
        // Update highlight state
        if (!this.activeChops.has(chopId)) {
          this.chopHighlights.set(chopId, {
            startTime: performance.now(),
            intensity: 1.0,
            chop: chop,
            fadeOut: false
          });
        }
      }
    });
    
    // Remove chops that are no longer active
    this.activeChops.forEach(chopId => {
      if (!newActiveChops.has(chopId)) {
        // Start fade out animation
        const highlight = this.chopHighlights.get(chopId);
        if (highlight) {
          highlight.fadeOut = true;
          highlight.fadeStartTime = performance.now();
        }
      }
    });
    
    this.activeChops = newActiveChops;
    
    // Clean up old highlights
    this.cleanupHighlights();
  }

  /**
   * Clean up expired highlight animations
   */
  cleanupHighlights() {
    const now = performance.now();
    const fadeOutDuration = 300; // ms
    
    for (const [chopId, highlight] of this.chopHighlights.entries()) {
      if (highlight.fadeOut) {
        const fadeProgress = (now - highlight.fadeStartTime) / fadeOutDuration;
        
        if (fadeProgress >= 1.0) {
          this.chopHighlights.delete(chopId);
        } else {
          highlight.intensity = 1.0 - fadeProgress;
        }
      }
    }
  }

  /**
   * Set the list of chops for active tracking
   */
  setChops(chops) {
    this.allChops = chops || [];
    this.updateActiveChops();
  }

  /**
   * Render playhead and active chop highlights
   */
  render() {
    if (!this.renderer) return;
    
    const viewport = this.renderer.getViewportManager();
    if (!viewport) return;
    
    // Check if playhead is visible
    if (!viewport.isTimeVisible(this.currentTime)) {
      // Clear playhead layer if not visible
      this.renderer.getLayerManager().clearLayer('playhead');
      return;
    }
    
    // Render active chop highlights first (behind playhead)
    this.renderActiveChopHighlights();
    
    // Render playhead
    this.renderPlayhead();
  }

  /**
   * Render highlights for active chops
   */
  renderActiveChopHighlights() {
    const layer = this.renderer.getLayerManager().getLayer('chops');
    if (!layer) return;
    
    const { ctx } = layer;
    const { width, height } = this.renderer.getLayerManager().getDimensions();
    const viewport = this.renderer.getViewportManager();
    
    // Render each active chop highlight
    this.chopHighlights.forEach((highlight, chopId) => {
      const chop = highlight.chop;
      if (!chop) return;
      
      // Check if chop is visible
      if (!viewport.isRangeVisible(chop.startTime, chop.endTime)) return;
      
      const startPixel = viewport.timeToPixel(chop.startTime);
      const endPixel = viewport.timeToPixel(chop.endTime);
      const chopWidth = endPixel - startPixel;
      
      if (chopWidth <= 0) return;
      
      // Calculate highlight intensity with animation
      let intensity = highlight.intensity;
      if (!highlight.fadeOut && this.isPlaying) {
        // Pulse effect during active playback
        const pulseSpeed = 2; // Hz
        const time = (performance.now() - highlight.startTime) / 1000;
        const pulse = 0.7 + 0.3 * Math.sin(time * pulseSpeed * Math.PI * 2);
        intensity *= pulse;
      }
      
      // Render highlight overlay
      ctx.save();
      ctx.globalAlpha = this.options.activeChopOpacity * intensity;
      ctx.fillStyle = this.options.activeChopColor;
      ctx.fillRect(
        Math.max(0, startPixel),
        0,
        Math.min(chopWidth, width - Math.max(0, startPixel)),
        height
      );
      ctx.restore();
      
      // Render active chop border
      ctx.save();
      ctx.globalAlpha = intensity;
      ctx.strokeStyle = this.options.activeChopColor;
      ctx.lineWidth = 3;
      ctx.setLineDash([5, 5]);
      ctx.strokeRect(
        Math.max(0, startPixel),
        0,
        Math.min(chopWidth, width - Math.max(0, startPixel)),
        height
      );
      ctx.restore();
    });
  }

  /**
   * Render the playhead with smooth animation
   */
  renderPlayhead() {
    const layer = this.renderer.getLayerManager().getLayer('playhead');
    if (!layer) return;
    
    const { ctx } = layer;
    const { width, height } = this.renderer.getLayerManager().getDimensions();
    const viewport = this.renderer.getViewportManager();
    
    // Clear layer
    this.renderer.getLayerManager().clearLayer('playhead');
    
    const playheadPixel = viewport.timeToPixel(this.currentTime);
    
    // Render playhead line with enhanced styling
    ctx.save();
    
    // Main playhead line
    ctx.strokeStyle = this.options.playheadColor;
    ctx.lineWidth = this.options.playheadWidth;
    ctx.lineCap = 'round';
    
    // Add glow effect for playing state
    if (this.isPlaying) {
      ctx.shadowColor = this.options.playheadColor;
      ctx.shadowBlur = 8;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
    }
    
    ctx.beginPath();
    ctx.moveTo(playheadPixel, 0);
    ctx.lineTo(playheadPixel, height);
    ctx.stroke();
    
    ctx.restore();
    
    // Render playhead indicator at top
    this.renderPlayheadIndicator(ctx, playheadPixel, width, height);
    
    // Render time display if enabled
    if (this.options.showTimeDisplay) {
      this.renderTimeDisplay(ctx, playheadPixel, width, height);
    }
  }

  /**
   * Render playhead indicator triangle
   */
  renderPlayheadIndicator(ctx, playheadPixel, width, height) {
    const indicatorSize = 8;
    
    ctx.save();
    ctx.fillStyle = this.options.playheadColor;
    
    // Add glow for playing state
    if (this.isPlaying) {
      ctx.shadowColor = this.options.playheadColor;
      ctx.shadowBlur = 6;
    }
    
    // Draw triangle indicator
    ctx.beginPath();
    ctx.moveTo(playheadPixel - indicatorSize, 0);
    ctx.lineTo(playheadPixel + indicatorSize, 0);
    ctx.lineTo(playheadPixel, indicatorSize * 1.5);
    ctx.closePath();
    ctx.fill();
    
    // Draw bottom indicator if there's space
    if (height > 40) {
      ctx.beginPath();
      ctx.moveTo(playheadPixel - indicatorSize, height);
      ctx.lineTo(playheadPixel + indicatorSize, height);
      ctx.lineTo(playheadPixel, height - indicatorSize * 1.5);
      ctx.closePath();
      ctx.fill();
    }
    
    ctx.restore();
  }

  /**
   * Render time display near playhead
   */
  renderTimeDisplay(ctx, playheadPixel, width, height) {
    const viewport = this.renderer.getViewportManager().getViewportBounds();
    
    // Only show time display at appropriate zoom levels
    if (viewport.pixelsPerSecond < 50) return;
    
    const timeText = this.formatTime(this.currentTime);
    
    ctx.save();
    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // Calculate position to avoid edges
    let textX = playheadPixel;
    const textY = height - 20;
    
    // Adjust position if near edges
    const textWidth = ctx.measureText(timeText).width;
    if (textX - textWidth / 2 < 5) {
      textX = textWidth / 2 + 5;
      ctx.textAlign = 'left';
    } else if (textX + textWidth / 2 > width - 5) {
      textX = width - 5;
      ctx.textAlign = 'right';
    }
    
    // Draw background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillRect(textX - textWidth / 2 - 4, textY - 8, textWidth + 8, 16);
    
    // Draw text
    ctx.fillStyle = '#ffffff';
    ctx.fillText(timeText, textX, textY);
    
    ctx.restore();
  }

  /**
   * Format time for display
   */
  formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    
    if (minutes > 0) {
      return `${minutes}:${secs.toFixed(2).padStart(5, '0')}`;
    } else {
      return `${secs.toFixed(2)}s`;
    }
  }

  /**
   * Update performance metrics
   */
  updatePerformanceMetrics(timestamp) {
    this.frameCount++;
    
    // Initialize lastFPSCheck if not set
    if (this.lastFPSCheck === 0) {
      this.lastFPSCheck = timestamp;
    }
    
    if (timestamp - this.lastFPSCheck >= 1000) {
      this.currentFPS = this.frameCount;
      this.frameCount = 0;
      this.lastFPSCheck = timestamp;
    }
  }

  /**
   * Get current performance metrics
   */
  getPerformanceMetrics() {
    return {
      fps: this.currentFPS,
      syncAccuracy: this.syncAccuracy,
      activeChops: this.activeChops.size,
      isAnimating: this.isAnimating,
      interpolatedTime: this.interpolatedTime,
      targetTime: this.targetTime
    };
  }

  /**
   * Get synchronization status
   */
  getSyncStatus() {
    return {
      isPlaying: this.isPlaying,
      currentTime: this.currentTime,
      targetTime: this.targetTime,
      syncAccuracy: this.syncAccuracy,
      activeChops: Array.from(this.activeChops),
      isAnimating: this.isAnimating
    };
  }

  /**
   * Set playhead options
   */
  setOptions(newOptions) {
    this.options = { ...this.options, ...newOptions };
  }

  /**
   * Jump to specific time (for seeking)
   */
  jumpToTime(time) {
    this.currentTime = time;
    this.targetTime = time;
    this.interpolatedTime = time;
    this.lastUpdateTime = performance.now();
    
    this.updateActiveChops();
    this.render();
  }

  /**
   * Destroy the playhead manager
   */
  destroy() {
    this.stopAnimation();
    this.activeChops.clear();
    this.chopHighlights.clear();
    this.allChops = [];
    this.syncHistory = [];
  }
}

export default PlayheadManager;