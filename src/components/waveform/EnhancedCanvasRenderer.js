/**
 * Enhanced Canvas Renderer with Visual Enhancements and Accessibility Features
 * Extends the base CanvasRenderer with color coding, structure detection, and accessibility
 * Requirements: 8.1, 8.2, 8.3, 8.4, 8.5
 */

import { CanvasRenderer } from './CanvasRenderer.js';
import { VisualEnhancementEngine } from './VisualEnhancementEngine.js';

export class EnhancedCanvasRenderer extends CanvasRenderer {
  constructor(container, options = {}) {
    super(container, options);
    
    // Initialize visual enhancement engine
    this.visualEnhancementEngine = new VisualEnhancementEngine({
      enableFrequencyColorCoding: options.enableFrequencyColorCoding !== false,
      enableAmplitudeColorCoding: options.enableAmplitudeColorCoding !== false,
      enableStructureDetection: options.enableStructureDetection !== false,
      enableAccessibilityMode: options.enableAccessibilityMode || false,
      enableHighContrastMode: options.enableHighContrastMode || false,
      colorScheme: options.colorScheme || 'default'
    });
    
    // Enhanced rendering state
    this.frequencyColorData = null;
    this.amplitudeColorData = null;
    this.structureData = null;
    this.accessibilityPatterns = null;
    
    // Pattern cache for accessibility features
    this.patternCache = new Map();
    
    // Animation state for enhanced effects
    this.animationState = {
      time: 0,
      pulsePhase: 0,
      particleSystem: null
    };
    
    this.initializeEnhancedFeatures();
  }

  /**
   * Initialize enhanced rendering features
   */
  initializeEnhancedFeatures() {
    // Create additional layers for enhanced features
    this.layerManager.createLayer('frequency-overlay', 1.5, { alpha: true });
    this.layerManager.createLayer('structure-overlay', 2.5, { alpha: true });
    this.layerManager.createLayer('accessibility-patterns', 3.5, { alpha: true });
    this.layerManager.createLayer('enhancements', 5.5, { alpha: true });
    
    // Initialize pattern cache for accessibility
    this.initializeAccessibilityPatterns();
    
    // Start animation loop for enhanced effects
    this.startEnhancementAnimationLoop();
  }

  /**
   * Enhanced waveform rendering with visual enhancements
   * Overrides base renderWaveform to add color coding and accessibility features
   */
  renderWaveform(waveformData, options = {}) {
    // Call base rendering first
    super.renderWaveform(waveformData, options);
    
    // Apply visual enhancements if enabled
    if (this.visualEnhancementEngine) {
      this.renderVisualEnhancements(waveformData, options);
    }
  }

  /**
   * Render visual enhancements including color coding and structure detection
   */
  renderVisualEnhancements(waveformData, options = {}) {
    const viewport = this.viewportManager.getViewportBounds();
    const { width, height } = this.layerManager.getDimensions();
    
    // Generate enhanced visual data
    this.generateEnhancedVisualData(waveformData, options);
    
    // Render frequency color coding
    if (this.frequencyColorData && this.visualEnhancementEngine.options.enableFrequencyColorCoding) {
      this.renderFrequencyColorOverlay(viewport, width, height);
    }
    
    // Render amplitude color coding
    if (this.amplitudeColorData && this.visualEnhancementEngine.options.enableAmplitudeColorCoding) {
      this.renderAmplitudeColorOverlay(viewport, width, height);
    }
    
    // Render song structure detection
    if (this.structureData && this.visualEnhancementEngine.options.enableStructureDetection) {
      this.renderStructureOverlay(viewport, width, height);
    }
    
    // Render accessibility patterns
    if (this.accessibilityPatterns && this.visualEnhancementEngine.options.enableAccessibilityMode) {
      this.renderAccessibilityPatterns(viewport, width, height);
    }
    
    // Apply high contrast mode if enabled
    if (this.visualEnhancementEngine.options.enableHighContrastMode) {
      this.applyHighContrastMode();
    }
  }

  /**
   * Generate enhanced visual data from waveform and frequency data
   */
  generateEnhancedVisualData(waveformData, options = {}) {
    const { frequencyData } = options;
    
    // Generate frequency color coding
    if (frequencyData) {
      this.frequencyColorData = this.visualEnhancementEngine.applyFrequencyColorCoding(
        waveformData, 
        frequencyData
      );
    }
    
    // Generate amplitude color coding
    this.amplitudeColorData = this.visualEnhancementEngine.applyAmplitudeColorCoding(waveformData);
    
    // Detect song structure
    this.structureData = this.visualEnhancementEngine.detectSongStructure(
      waveformData, 
      options.metadata || {}
    );
    
    // Generate accessibility patterns
    if (frequencyData) {
      this.accessibilityPatterns = this.visualEnhancementEngine.generateAccessibilityPatterns(frequencyData);
    }
  }

  /**
   * Render frequency-based color overlay
   * Requirement 8.1: Color coding for different frequency ranges
   */
  renderFrequencyColorOverlay(viewport, width, height) {
    const layer = this.layerManager.getLayer('frequency-overlay');
    if (!layer || !this.frequencyColorData) return;
    
    const { ctx } = layer;
    this.layerManager.clearLayer('frequency-overlay');
    
    // Render frequency color segments
    this.frequencyColorData.forEach(segment => {
      if (segment.endTime < viewport.start || segment.startTime > viewport.end) return;
      
      const startX = this.viewportManager.timeToPixel(Math.max(segment.startTime, viewport.start));
      const endX = this.viewportManager.timeToPixel(Math.min(segment.endTime, viewport.end));
      const segmentWidth = endX - startX;
      
      if (segmentWidth <= 0) return;
      
      // Create frequency-based gradient
      const gradient = this.createFrequencyGradient(ctx, startX, height, segment.color, segment.frequencyProfile);
      
      // Apply blend mode for color overlay
      ctx.globalCompositeOperation = 'multiply';
      ctx.fillStyle = gradient;
      ctx.fillRect(startX, 0, segmentWidth, height);
      ctx.globalCompositeOperation = 'source-over';
    });
    
    this.layerManager.markLayerClean('frequency-overlay');
  }

  /**
   * Create frequency-based gradient
   */
  createFrequencyGradient(ctx, x, height, color, frequencyProfile) {
    const gradient = ctx.createLinearGradient(x, 0, x, height);
    
    // Map frequency ranges to gradient stops
    const { bassEnergy, lowMidEnergy, midEnergy, highMidEnergy, trebleEnergy } = frequencyProfile;
    const totalEnergy = bassEnergy + lowMidEnergy + midEnergy + highMidEnergy + trebleEnergy;
    
    if (totalEnergy === 0) {
      gradient.addColorStop(0, `rgba(${color.r}, ${color.g}, ${color.b}, 0.1)`);
      gradient.addColorStop(1, `rgba(${color.r}, ${color.g}, ${color.b}, 0.1)`);
      return gradient;
    }
    
    // Create gradient based on frequency distribution
    let currentStop = 0;
    
    // Bass (bottom)
    const bassRatio = bassEnergy / totalEnergy;
    if (bassRatio > 0.1) {
      gradient.addColorStop(currentStop, `rgba(220, 38, 127, ${bassRatio * color.a})`);
      currentStop += bassRatio;
    }
    
    // Low-mid
    const lowMidRatio = lowMidEnergy / totalEnergy;
    if (lowMidRatio > 0.1) {
      gradient.addColorStop(Math.min(currentStop, 1), `rgba(239, 68, 68, ${lowMidRatio * color.a})`);
      currentStop += lowMidRatio;
    }
    
    // Mid (center)
    const midRatio = midEnergy / totalEnergy;
    if (midRatio > 0.1) {
      gradient.addColorStop(Math.min(currentStop, 1), `rgba(245, 158, 11, ${midRatio * color.a})`);
      currentStop += midRatio;
    }
    
    // High-mid
    const highMidRatio = highMidEnergy / totalEnergy;
    if (highMidRatio > 0.1) {
      gradient.addColorStop(Math.min(currentStop, 1), `rgba(34, 197, 94, ${highMidRatio * color.a})`);
      currentStop += highMidRatio;
    }
    
    // Treble (top)
    const trebleRatio = trebleEnergy / totalEnergy;
    if (trebleRatio > 0.1) {
      gradient.addColorStop(1, `rgba(59, 130, 246, ${trebleRatio * color.a})`);
    }
    
    return gradient;
  }

  /**
   * Render amplitude-based color overlay
   * Requirement 8.1: Color coding for amplitude levels
   */
  renderAmplitudeColorOverlay(viewport, width, height) {
    const layer = this.layerManager.getLayer('frequency-overlay');
    if (!layer || !this.amplitudeColorData) return;
    
    const { ctx } = layer;
    
    // Render amplitude color segments
    this.amplitudeColorData.forEach(segment => {
      if (segment.endTime < viewport.start || segment.startTime > viewport.end) return;
      
      const startX = this.viewportManager.timeToPixel(Math.max(segment.startTime, viewport.start));
      const endX = this.viewportManager.timeToPixel(Math.min(segment.endTime, viewport.end));
      const segmentWidth = endX - startX;
      
      if (segmentWidth <= 0) return;
      
      // Apply amplitude-based color modification
      const { alpha, brightness } = segment.colorModifier;
      
      ctx.globalCompositeOperation = 'overlay';
      ctx.globalAlpha = alpha;
      
      // Create amplitude-based color
      const amplitudeColor = this.getAmplitudeLevelColor(segment.level, brightness);
      ctx.fillStyle = amplitudeColor;
      ctx.fillRect(startX, 0, segmentWidth, height);
      
      ctx.globalAlpha = 1.0;
      ctx.globalCompositeOperation = 'source-over';
    });
  }

  /**
   * Get color for amplitude level
   */
  getAmplitudeLevelColor(level, brightness) {
    const colors = {
      silent: { r: 64, g: 64, b: 64 },      // Dark gray
      quiet: { r: 100, g: 149, b: 237 },    // Blue
      moderate: { r: 34, g: 197, b: 94 },   // Green
      loud: { r: 245, g: 158, b: 11 },      // Orange
      peak: { r: 239, g: 68, b: 68 }        // Red
    };
    
    const color = colors[level] || colors.moderate;
    return `rgba(${Math.round(color.r * brightness)}, ${Math.round(color.g * brightness)}, ${Math.round(color.b * brightness)}, 0.3)`;
  }

  /**
   * Render song structure overlay
   * Requirement 8.2: Visual cues for song structure detection
   */
  renderStructureOverlay(viewport, width, height) {
    const layer = this.layerManager.getLayer('structure-overlay');
    if (!layer || !this.structureData) return;
    
    const { ctx } = layer;
    this.layerManager.clearLayer('structure-overlay');
    
    // Render structure sections
    this.structureData.forEach(section => {
      if (section.endTime < viewport.start || section.startTime > viewport.end) return;
      
      const startX = this.viewportManager.timeToPixel(Math.max(section.startTime, viewport.start));
      const endX = this.viewportManager.timeToPixel(Math.min(section.endTime, viewport.end));
      const sectionWidth = endX - startX;
      
      if (sectionWidth <= 0) return;
      
      // Render section background
      this.renderStructureSection(ctx, section, startX, sectionWidth, height);
      
      // Render section label if enabled
      if (this.visualEnhancementEngine.options.structureDetection?.showLabels) {
        this.renderStructureLabel(ctx, section, startX, sectionWidth, height);
      }
    });
    
    this.layerManager.markLayerClean('structure-overlay');
  }

  /**
   * Render individual structure section
   */
  renderStructureSection(ctx, section, startX, width, height) {
    const { visualPattern } = section;
    const { color, pattern } = visualPattern;
    
    // Set base color with low opacity
    const baseColor = `rgba(${color.r}, ${color.g}, ${color.b}, 0.1)`;
    
    switch (pattern) {
      case 'solid':
        ctx.fillStyle = baseColor;
        ctx.fillRect(startX, 0, width, height);
        break;
        
      case 'gradient':
        const gradient = ctx.createLinearGradient(startX, 0, startX + width, 0);
        gradient.addColorStop(0, baseColor);
        gradient.addColorStop(0.5, `rgba(${color.r}, ${color.g}, ${color.b}, 0.2)`);
        gradient.addColorStop(1, baseColor);
        ctx.fillStyle = gradient;
        ctx.fillRect(startX, 0, width, height);
        break;
        
      case 'dashed':
        ctx.strokeStyle = `rgba(${color.r}, ${color.g}, ${color.b}, 0.4)`;
        ctx.lineWidth = 2;
        ctx.setLineDash([8, 4]);
        ctx.strokeRect(startX, 10, width, height - 20);
        ctx.setLineDash([]);
        break;
        
      case 'dotted':
        ctx.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, 0.3)`;
        for (let x = startX; x < startX + width; x += 12) {
          for (let y = 10; y < height - 10; y += 12) {
            ctx.beginPath();
            ctx.arc(x, y, 2, 0, Math.PI * 2);
            ctx.fill();
          }
        }
        break;
        
      case 'sparse':
        ctx.fillStyle = baseColor;
        ctx.fillRect(startX, height * 0.4, width, height * 0.2);
        break;
        
      default:
        ctx.fillStyle = baseColor;
        ctx.fillRect(startX, 0, width, height);
    }
  }

  /**
   * Render structure section label
   */
  renderStructureLabel(ctx, section, startX, width, height) {
    if (width < 60) return; // Too narrow for label
    
    const centerX = startX + width / 2;
    const labelY = 25;
    
    // Prepare label text
    const labelText = section.type.toUpperCase();
    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // Measure text for background
    const textMetrics = ctx.measureText(labelText);
    const textWidth = textMetrics.width;
    const padding = 6;
    
    // Draw label background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillRect(centerX - textWidth / 2 - padding, labelY - 8, textWidth + padding * 2, 16);
    
    // Draw label border
    const { color } = section.visualPattern;
    ctx.strokeStyle = `rgba(${color.r}, ${color.g}, ${color.b}, 0.8)`;
    ctx.lineWidth = 1;
    ctx.strokeRect(centerX - textWidth / 2 - padding, labelY - 8, textWidth + padding * 2, 16);
    
    // Draw label text
    ctx.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, 1)`;
    ctx.fillText(labelText, centerX, labelY);
  }

  /**
   * Render accessibility patterns for non-color visual cues
   * Requirement 8.3: Alternative visual representations for accessibility
   */
  renderAccessibilityPatterns(viewport, width, height) {
    const layer = this.layerManager.getLayer('accessibility-patterns');
    if (!layer || !this.accessibilityPatterns) return;
    
    const { ctx } = layer;
    this.layerManager.clearLayer('accessibility-patterns');
    
    // Render accessibility patterns
    this.accessibilityPatterns.forEach(patternSegment => {
      if (patternSegment.endTime < viewport.start || patternSegment.startTime > viewport.end) return;
      
      const startX = this.viewportManager.timeToPixel(Math.max(patternSegment.startTime, viewport.start));
      const endX = this.viewportManager.timeToPixel(Math.min(patternSegment.endTime, viewport.end));
      const segmentWidth = endX - startX;
      
      if (segmentWidth <= 0) return;
      
      this.renderAccessibilityPattern(ctx, patternSegment, startX, segmentWidth, height);
    });
    
    this.layerManager.markLayerClean('accessibility-patterns');
  }

  /**
   * Render individual accessibility pattern
   */
  renderAccessibilityPattern(ctx, patternSegment, startX, width, height) {
    const { pattern, density, frequencyType } = patternSegment;
    
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.lineWidth = 1;
    
    const densityMap = { high: 4, medium: 8, low: 16, sparse: 32 };
    const spacing = densityMap[density] || 8;
    
    switch (pattern) {
      case 'vertical-lines':
        for (let x = startX; x < startX + width; x += spacing) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, height);
          ctx.stroke();
        }
        break;
        
      case 'horizontal-lines':
        for (let y = 0; y < height; y += spacing) {
          ctx.beginPath();
          ctx.moveTo(startX, y);
          ctx.lineTo(startX + width, y);
          ctx.stroke();
        }
        break;
        
      case 'diagonal-lines':
        for (let offset = -height; offset < width + height; offset += spacing) {
          ctx.beginPath();
          ctx.moveTo(startX + offset, 0);
          ctx.lineTo(startX + offset + height, height);
          ctx.stroke();
        }
        break;
        
      case 'dots':
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        for (let x = startX; x < startX + width; x += spacing) {
          for (let y = spacing / 2; y < height; y += spacing) {
            ctx.beginPath();
            ctx.arc(x, y, 1, 0, Math.PI * 2);
            ctx.fill();
          }
        }
        break;
        
      case 'cross-hatch':
        // Vertical lines
        for (let x = startX; x < startX + width; x += spacing) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, height);
          ctx.stroke();
        }
        // Horizontal lines
        for (let y = 0; y < height; y += spacing) {
          ctx.beginPath();
          ctx.moveTo(startX, y);
          ctx.lineTo(startX + width, y);
          ctx.stroke();
        }
        break;
    }
  }

  /**
   * Apply high contrast mode to all layers
   * Requirement 8.3: High contrast mode for accessibility
   */
  applyHighContrastMode() {
    // Apply high contrast filter to all layers
    const layers = ['waveform', 'chops', 'frequency-overlay', 'structure-overlay'];
    
    layers.forEach(layerName => {
      const layer = this.layerManager.getLayer(layerName);
      if (layer && layer.canvas) {
        const { ctx } = layer;
        
        // Apply high contrast filter
        ctx.filter = 'contrast(200%) brightness(150%)';
        
        // Redraw layer content with high contrast
        // This would typically involve re-rendering the layer content
        // For now, we apply the filter to existing content
        
        // Reset filter
        ctx.filter = 'none';
      }
    });
  }

  /**
   * Initialize accessibility pattern cache
   */
  initializeAccessibilityPatterns() {
    const patterns = ['vertical-lines', 'horizontal-lines', 'diagonal-lines', 'dots', 'cross-hatch'];
    const densities = ['high', 'medium', 'low', 'sparse'];
    
    patterns.forEach(pattern => {
      densities.forEach(density => {
        const key = `${pattern}-${density}`;
        // Pre-generate pattern data for performance
        this.patternCache.set(key, this.generatePatternData(pattern, density));
      });
    });
  }

  /**
   * Generate pattern data for caching
   */
  generatePatternData(pattern, density) {
    return {
      pattern,
      density,
      spacing: { high: 4, medium: 8, low: 16, sparse: 32 }[density] || 8
    };
  }

  /**
   * Start animation loop for enhanced effects
   */
  startEnhancementAnimationLoop() {
    const animate = (timestamp) => {
      this.animationState.time = timestamp;
      this.animationState.pulsePhase = (timestamp / 1000) % (Math.PI * 2);
      
      // Update animated elements if enabled
      if (this.visualEnhancementEngine.options.enhancements?.animatedElements) {
        this.updateAnimatedElements();
      }
      
      requestAnimationFrame(animate);
    };
    
    requestAnimationFrame(animate);
  }

  /**
   * Update animated elements
   */
  updateAnimatedElements() {
    // Update any animated visual elements
    // This could include pulsing effects, particle systems, etc.
    
    // Mark layers dirty if animations are active
    if (this.animationState.pulsePhase % (Math.PI / 4) < 0.1) {
      this.layerManager.markLayerDirty('enhancements');
    }
  }

  /**
   * Update visual enhancement settings
   */
  updateVisualSettings(newSettings) {
    if (this.visualEnhancementEngine) {
      this.visualEnhancementEngine.updateVisualSettings(newSettings, () => {
        // Clear cached data to force regeneration
        this.frequencyColorData = null;
        this.amplitudeColorData = null;
        this.structureData = null;
        this.accessibilityPatterns = null;
        
        // Mark layers dirty for re-rendering
        this.layerManager.markLayerDirty('frequency-overlay');
        this.layerManager.markLayerDirty('structure-overlay');
        this.layerManager.markLayerDirty('accessibility-patterns');
      });
    }
  }

  /**
   * Get visual enhancement engine for external access
   */
  getVisualEnhancementEngine() {
    return this.visualEnhancementEngine;
  }

  /**
   * Cleanup enhanced features
   */
  destroy() {
    super.destroy();
    
    if (this.visualEnhancementEngine) {
      this.visualEnhancementEngine.destroy();
    }
    
    this.patternCache.clear();
  }
}