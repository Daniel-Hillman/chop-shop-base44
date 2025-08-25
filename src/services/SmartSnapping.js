/**
 * Smart snapping service for waveform interactions
 * Implements requirement 3.4 - smart snapping with configurable tolerance
 */

import { ZeroCrossingDetector } from './ZeroCrossingDetector.js';

export class SmartSnapping {
  constructor(options = {}) {
    this.options = {
      // Snap tolerance in pixels
      snapTolerance: 10,
      // Snap tolerance in seconds (fallback when pixel conversion not available)
      snapToleranceTime: 0.05,
      // Enable different snap types
      enableZeroCrossingSnap: true,
      enableChopBoundarySnap: true,
      enableGridSnap: false,
      enableBeatSnap: false,
      // Snap priorities (higher number = higher priority)
      snapPriorities: {
        zeroCrossing: 3,
        chopBoundary: 2,
        grid: 1,
        beat: 1
      },
      // Visual feedback options
      showSnapIndicators: true,
      snapIndicatorColor: 'rgba(255, 165, 0, 0.8)',
      snapIndicatorWidth: 2,
      // Zero-crossing detector options
      zeroCrossingOptions: {
        minDistance: 32,
        amplitudeThreshold: 0.01,
        analysisWindow: 64,
        maxSearchDistance: 0.1
      },
      ...options
    };

    // Initialize zero-crossing detector
    this.zeroCrossingDetector = new ZeroCrossingDetector(this.options.zeroCrossingOptions);
    
    // Current snap targets
    this.snapTargets = [];
    
    // Current waveform data
    this.waveformData = null;
    this.chops = [];
  }

  /**
   * Update waveform data for zero-crossing detection
   * @param {Object} waveformData - Waveform data with samples and sample rate
   */
  setWaveformData(waveformData) {
    this.waveformData = waveformData;
    
    // Pre-calculate zero-crossings if data is available
    if (waveformData?.samples && waveformData?.sampleRate) {
      this.zeroCrossingDetector.findZeroCrossings(
        waveformData.samples, 
        waveformData.sampleRate
      );
    }
  }

  /**
   * Update chop data for boundary snapping
   * @param {Array} chops - Array of chop objects
   */
  setChops(chops) {
    this.chops = chops || [];
  }

  /**
   * Find the best snap target for a given time position
   * @param {number} targetTime - Target time in seconds
   * @param {number} pixelsPerSecond - Current viewport pixels per second
   * @param {string} excludeChopId - Chop ID to exclude from boundary snapping
   * @returns {Object|null} Best snap target or null if none found
   */
  findSnapTarget(targetTime, pixelsPerSecond = null, excludeChopId = null) {
    const snapTargets = this.findAllSnapTargets(targetTime, pixelsPerSecond, excludeChopId);
    
    if (snapTargets.length === 0) {
      return null;
    }

    // Sort by priority and distance
    snapTargets.sort((a, b) => {
      // First sort by priority (higher is better)
      if (a.priority !== b.priority) {
        return b.priority - a.priority;
      }
      // Then sort by distance (closer is better)
      return a.distance - b.distance;
    });

    return snapTargets[0];
  }

  /**
   * Find all potential snap targets for a given time position
   * @param {number} targetTime - Target time in seconds
   * @param {number} pixelsPerSecond - Current viewport pixels per second
   * @param {string} excludeChopId - Chop ID to exclude from boundary snapping
   * @returns {Array} Array of snap targets
   */
  findAllSnapTargets(targetTime, pixelsPerSecond = null, excludeChopId = null) {
    const snapTargets = [];
    const tolerance = this.calculateSnapTolerance(pixelsPerSecond);

    // Find zero-crossing snap targets
    if (this.options.enableZeroCrossingSnap && this.waveformData) {
      const zeroCrossingTarget = this.findZeroCrossingSnapTarget(targetTime, tolerance);
      if (zeroCrossingTarget) {
        snapTargets.push(zeroCrossingTarget);
      }
    }

    // Find chop boundary snap targets
    if (this.options.enableChopBoundarySnap) {
      const boundaryTargets = this.findChopBoundarySnapTargets(targetTime, tolerance, excludeChopId);
      snapTargets.push(...boundaryTargets);
    }

    // Find grid snap targets (if enabled)
    if (this.options.enableGridSnap) {
      const gridTarget = this.findGridSnapTarget(targetTime, tolerance);
      if (gridTarget) {
        snapTargets.push(gridTarget);
      }
    }

    return snapTargets;
  }

  /**
   * Find zero-crossing snap target
   * @param {number} targetTime - Target time in seconds
   * @param {number} tolerance - Snap tolerance in seconds
   * @returns {Object|null} Zero-crossing snap target or null
   */
  findZeroCrossingSnapTarget(targetTime, tolerance) {
    if (!this.waveformData?.samples || !this.waveformData?.sampleRate) {
      return null;
    }

    const nearestZeroCrossing = this.zeroCrossingDetector.findNearestZeroCrossing(
      this.waveformData.samples,
      this.waveformData.sampleRate,
      targetTime,
      tolerance
    );

    if (!nearestZeroCrossing) {
      return null;
    }

    const distance = Math.abs(nearestZeroCrossing.time - targetTime);

    return {
      type: 'zero-crossing',
      time: nearestZeroCrossing.time,
      distance,
      priority: this.options.snapPriorities.zeroCrossing,
      quality: nearestZeroCrossing.quality,
      data: nearestZeroCrossing
    };
  }

  /**
   * Find chop boundary snap targets
   * @param {number} targetTime - Target time in seconds
   * @param {number} tolerance - Snap tolerance in seconds
   * @param {string} excludeChopId - Chop ID to exclude
   * @returns {Array} Array of boundary snap targets
   */
  findChopBoundarySnapTargets(targetTime, tolerance, excludeChopId = null) {
    const targets = [];

    for (const chop of this.chops) {
      if (chop.id === excludeChopId) continue;

      // Check start boundary
      const startDistance = Math.abs(chop.startTime - targetTime);
      if (startDistance <= tolerance) {
        targets.push({
          type: 'chop-boundary',
          subType: 'start',
          time: chop.startTime,
          distance: startDistance,
          priority: this.options.snapPriorities.chopBoundary,
          chopId: chop.id,
          data: chop
        });
      }

      // Check end boundary
      const endDistance = Math.abs(chop.endTime - targetTime);
      if (endDistance <= tolerance) {
        targets.push({
          type: 'chop-boundary',
          subType: 'end',
          time: chop.endTime,
          distance: endDistance,
          priority: this.options.snapPriorities.chopBoundary,
          chopId: chop.id,
          data: chop
        });
      }
    }

    return targets;
  }

  /**
   * Find grid snap target (for regular time intervals)
   * @param {number} targetTime - Target time in seconds
   * @param {number} tolerance - Snap tolerance in seconds
   * @returns {Object|null} Grid snap target or null
   */
  findGridSnapTarget(targetTime, tolerance) {
    // Default grid interval (can be made configurable)
    const gridInterval = 1.0; // 1 second intervals
    
    const nearestGridTime = Math.round(targetTime / gridInterval) * gridInterval;
    const distance = Math.abs(nearestGridTime - targetTime);

    if (distance <= tolerance) {
      return {
        type: 'grid',
        time: nearestGridTime,
        distance,
        priority: this.options.snapPriorities.grid,
        interval: gridInterval
      };
    }

    return null;
  }

  /**
   * Apply smart snapping to a time position
   * @param {number} targetTime - Target time in seconds
   * @param {number} pixelsPerSecond - Current viewport pixels per second
   * @param {string} excludeChopId - Chop ID to exclude from boundary snapping
   * @returns {Object} Snapping result with snapped time and snap info
   */
  applySnapping(targetTime, pixelsPerSecond = null, excludeChopId = null) {
    const snapTarget = this.findSnapTarget(targetTime, pixelsPerSecond, excludeChopId);

    if (snapTarget) {
      return {
        originalTime: targetTime,
        snappedTime: snapTarget.time,
        wasSnapped: true,
        snapTarget,
        snapDistance: snapTarget.distance
      };
    }

    return {
      originalTime: targetTime,
      snappedTime: targetTime,
      wasSnapped: false,
      snapTarget: null,
      snapDistance: 0
    };
  }

  /**
   * Get visual snap indicators for rendering
   * @param {number} targetTime - Target time in seconds
   * @param {number} pixelsPerSecond - Current viewport pixels per second
   * @param {string} excludeChopId - Chop ID to exclude from boundary snapping
   * @returns {Array} Array of snap indicators for rendering
   */
  getSnapIndicators(targetTime, pixelsPerSecond = null, excludeChopId = null) {
    if (!this.options.showSnapIndicators) {
      return [];
    }

    const snapTargets = this.findAllSnapTargets(targetTime, pixelsPerSecond, excludeChopId);
    const tolerance = this.calculateSnapTolerance(pixelsPerSecond);

    return snapTargets
      .filter(target => target.distance <= tolerance)
      .map(target => ({
        type: target.type,
        time: target.time,
        priority: target.priority,
        color: this.getSnapIndicatorColor(target.type),
        width: this.options.snapIndicatorWidth,
        style: this.getSnapIndicatorStyle(target.type),
        label: this.getSnapIndicatorLabel(target)
      }));
  }

  /**
   * Get snap indicator color based on snap type
   * @param {string} snapType - Type of snap target
   * @returns {string} Color string
   */
  getSnapIndicatorColor(snapType) {
    const colors = {
      'zero-crossing': 'rgba(34, 197, 94, 0.8)', // Green
      'chop-boundary': 'rgba(59, 130, 246, 0.8)', // Blue
      'grid': 'rgba(156, 163, 175, 0.6)', // Gray
      'beat': 'rgba(245, 101, 101, 0.8)' // Red
    };

    return colors[snapType] || this.options.snapIndicatorColor;
  }

  /**
   * Get snap indicator style based on snap type
   * @param {string} snapType - Type of snap target
   * @returns {string} Style identifier
   */
  getSnapIndicatorStyle(snapType) {
    const styles = {
      'zero-crossing': 'solid',
      'chop-boundary': 'dashed',
      'grid': 'dotted',
      'beat': 'solid'
    };

    return styles[snapType] || 'solid';
  }

  /**
   * Get snap indicator label
   * @param {Object} snapTarget - Snap target object
   * @returns {string} Label text
   */
  getSnapIndicatorLabel(snapTarget) {
    switch (snapTarget.type) {
      case 'zero-crossing':
        return `Zero crossing (${snapTarget.time.toFixed(3)}s)`;
      case 'chop-boundary':
        return `Chop ${snapTarget.subType} (${snapTarget.time.toFixed(3)}s)`;
      case 'grid':
        return `Grid (${snapTarget.time.toFixed(1)}s)`;
      case 'beat':
        return `Beat (${snapTarget.time.toFixed(3)}s)`;
      default:
        return `Snap (${snapTarget.time.toFixed(3)}s)`;
    }
  }

  /**
   * Calculate snap tolerance in seconds based on viewport
   * @param {number} pixelsPerSecond - Current viewport pixels per second
   * @returns {number} Snap tolerance in seconds
   */
  calculateSnapTolerance(pixelsPerSecond) {
    if (pixelsPerSecond && pixelsPerSecond > 0) {
      return this.options.snapTolerance / pixelsPerSecond;
    }
    return this.options.snapToleranceTime;
  }

  /**
   * Update snapping options
   * @param {Object} newOptions - New options to merge
   */
  updateOptions(newOptions) {
    this.options = { ...this.options, ...newOptions };
    
    // Update zero-crossing detector options if provided
    if (newOptions.zeroCrossingOptions) {
      this.zeroCrossingDetector.updateOptions(newOptions.zeroCrossingOptions);
    }
  }

  /**
   * Get current snapping configuration
   * @returns {Object} Current options
   */
  getOptions() {
    return { ...this.options };
  }

  /**
   * Enable or disable specific snap types
   * @param {Object} snapTypes - Object with snap type keys and boolean values
   */
  setSnapTypes(snapTypes) {
    Object.keys(snapTypes).forEach(key => {
      const optionKey = `enable${key.charAt(0).toUpperCase() + key.slice(1)}Snap`;
      if (this.options.hasOwnProperty(optionKey)) {
        this.options[optionKey] = snapTypes[key];
      }
    });
  }

  /**
   * Get statistics about current snap targets
   * @returns {Object} Statistics object
   */
  getSnapStatistics() {
    const stats = {
      zeroCrossings: 0,
      chopBoundaries: this.chops.length * 2,
      cacheStats: this.zeroCrossingDetector.getCacheStats()
    };

    if (this.waveformData?.samples && this.waveformData?.sampleRate) {
      const zeroCrossings = this.zeroCrossingDetector.findZeroCrossings(
        this.waveformData.samples,
        this.waveformData.sampleRate
      );
      stats.zeroCrossings = zeroCrossings.length;
    }

    return stats;
  }

  /**
   * Clear all caches
   */
  clearCaches() {
    this.zeroCrossingDetector.clearCache();
  }
}

export default SmartSnapping;