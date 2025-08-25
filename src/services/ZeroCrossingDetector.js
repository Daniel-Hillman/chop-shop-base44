/**
 * Zero-crossing detection service for clean sample cuts
 * Implements requirement 3.3 - zero-crossing detection algorithm
 */

export class ZeroCrossingDetector {
  constructor(options = {}) {
    this.options = {
      // Minimum distance between zero-crossings (in samples)
      minDistance: 32,
      // Amplitude threshold for considering a zero-crossing significant
      amplitudeThreshold: 0.01,
      // Window size for analyzing zero-crossing quality
      analysisWindow: 64,
      // Maximum search distance from target time (in seconds)
      maxSearchDistance: 0.1,
      ...options
    };
    
    // Cache for zero-crossing data
    this.zeroCrossingCache = new Map();
  }

  /**
   * Find zero-crossings in waveform data
   * @param {Float32Array} samples - Audio sample data
   * @param {number} sampleRate - Sample rate in Hz
   * @returns {Array} Array of zero-crossing positions (in sample indices)
   */
  findZeroCrossings(samples, sampleRate) {
    const cacheKey = this.generateCacheKey(samples, sampleRate);
    
    if (this.zeroCrossingCache.has(cacheKey)) {
      return this.zeroCrossingCache.get(cacheKey);
    }

    const zeroCrossings = [];
    const { minDistance, amplitudeThreshold, analysisWindow } = this.options;
    
    let lastZeroCrossing = -minDistance;
    
    for (let i = 1; i < samples.length; i++) {
      const prevSample = samples[i - 1];
      const currentSample = samples[i];
      
      // Check for sign change (zero-crossing)
      if ((prevSample <= 0 && currentSample > 0) || (prevSample >= 0 && currentSample < 0)) {
        // Ensure minimum distance from last zero-crossing
        if (i - lastZeroCrossing >= minDistance) {
          // Analyze the quality of this zero-crossing
          const quality = this.analyzeZeroCrossingQuality(samples, i, analysisWindow, amplitudeThreshold);
          
          if (quality.isSignificant) {
            zeroCrossings.push({
              sampleIndex: i,
              time: i / sampleRate,
              quality: quality.score,
              amplitude: Math.abs(currentSample),
              slope: Math.abs(currentSample - prevSample)
            });
            
            lastZeroCrossing = i;
          }
        }
      }
    }
    
    // Cache the results
    this.zeroCrossingCache.set(cacheKey, zeroCrossings);
    
    return zeroCrossings;
  }

  /**
   * Find the nearest zero-crossing to a target time
   * @param {Float32Array} samples - Audio sample data
   * @param {number} sampleRate - Sample rate in Hz
   * @param {number} targetTime - Target time in seconds
   * @param {number} tolerance - Search tolerance in seconds
   * @returns {Object|null} Nearest zero-crossing or null if none found
   */
  findNearestZeroCrossing(samples, sampleRate, targetTime, tolerance = null) {
    const searchTolerance = tolerance || this.options.maxSearchDistance;
    const zeroCrossings = this.findZeroCrossings(samples, sampleRate);
    
    if (zeroCrossings.length === 0) {
      return null;
    }
    
    let nearestCrossing = null;
    let minDistance = Infinity;
    
    for (const crossing of zeroCrossings) {
      const distance = Math.abs(crossing.time - targetTime);
      
      if (distance <= searchTolerance && distance < minDistance) {
        minDistance = distance;
        nearestCrossing = crossing;
      }
    }
    
    return nearestCrossing;
  }

  /**
   * Find optimal cut points within a time range
   * @param {Float32Array} samples - Audio sample data
   * @param {number} sampleRate - Sample rate in Hz
   * @param {number} startTime - Start time in seconds
   * @param {number} endTime - End time in seconds
   * @returns {Object} Optimal start and end cut points
   */
  findOptimalCutPoints(samples, sampleRate, startTime, endTime) {
    const startSample = Math.floor(startTime * sampleRate);
    const endSample = Math.floor(endTime * sampleRate);
    
    // Find zero-crossings near the boundaries
    const startZeroCrossing = this.findNearestZeroCrossing(samples, sampleRate, startTime);
    const endZeroCrossing = this.findNearestZeroCrossing(samples, sampleRate, endTime);
    
    const result = {
      originalStart: startTime,
      originalEnd: endTime,
      optimizedStart: startTime,
      optimizedEnd: endTime,
      startImprovement: 0,
      endImprovement: 0,
      quality: 'original'
    };
    
    // Apply start boundary optimization
    if (startZeroCrossing) {
      const improvement = this.calculateCutQualityImprovement(
        samples, startSample, startZeroCrossing.sampleIndex
      );
      
      if (improvement > 0.1) { // Only apply if significant improvement
        result.optimizedStart = startZeroCrossing.time;
        result.startImprovement = improvement;
      }
    }
    
    // Apply end boundary optimization
    if (endZeroCrossing) {
      const improvement = this.calculateCutQualityImprovement(
        samples, endSample, endZeroCrossing.sampleIndex
      );
      
      if (improvement > 0.1) { // Only apply if significant improvement
        result.optimizedEnd = endZeroCrossing.time;
        result.endImprovement = improvement;
      }
    }
    
    // Determine overall quality
    if (result.startImprovement > 0 || result.endImprovement > 0) {
      const avgImprovement = (result.startImprovement + result.endImprovement) / 2;
      if (avgImprovement > 0.7) {
        result.quality = 'excellent';
      } else if (avgImprovement > 0.4) {
        result.quality = 'good';
      } else {
        result.quality = 'improved';
      }
    }
    
    return result;
  }

  /**
   * Analyze the quality of a zero-crossing
   * @param {Float32Array} samples - Audio sample data
   * @param {number} crossingIndex - Index of the zero-crossing
   * @param {number} windowSize - Analysis window size
   * @param {number} threshold - Amplitude threshold
   * @returns {Object} Quality analysis result
   */
  analyzeZeroCrossingQuality(samples, crossingIndex, windowSize, threshold) {
    const halfWindow = Math.floor(windowSize / 2);
    const startIndex = Math.max(0, crossingIndex - halfWindow);
    const endIndex = Math.min(samples.length - 1, crossingIndex + halfWindow);
    
    // Calculate RMS amplitude in the analysis window
    let rmsSum = 0;
    let sampleCount = 0;
    
    for (let i = startIndex; i <= endIndex; i++) {
      rmsSum += samples[i] * samples[i];
      sampleCount++;
    }
    
    const rmsAmplitude = Math.sqrt(rmsSum / sampleCount);
    
    // Calculate slope at zero-crossing
    const prevSample = samples[crossingIndex - 1] || 0;
    const nextSample = samples[crossingIndex + 1] || 0;
    const slope = Math.abs(nextSample - prevSample);
    
    // Calculate quality score (0-1)
    const amplitudeScore = Math.min(rmsAmplitude / threshold, 1.0);
    const slopeScore = Math.min(slope * 10, 1.0); // Normalize slope
    const qualityScore = (amplitudeScore + slopeScore) / 2;
    
    return {
      isSignificant: rmsAmplitude >= threshold && slope > 0.001,
      score: qualityScore,
      rmsAmplitude,
      slope,
      windowStart: startIndex,
      windowEnd: endIndex
    };
  }

  /**
   * Calculate improvement in cut quality when moving from original to zero-crossing
   * @param {Float32Array} samples - Audio sample data
   * @param {number} originalIndex - Original cut sample index
   * @param {number} zeroCrossingIndex - Zero-crossing sample index
   * @returns {number} Improvement score (0-1)
   */
  calculateCutQualityImprovement(samples, originalIndex, zeroCrossingIndex) {
    if (originalIndex < 0 || originalIndex >= samples.length ||
        zeroCrossingIndex < 0 || zeroCrossingIndex >= samples.length) {
      return 0;
    }
    
    // Calculate click/pop potential at original position
    const originalAmplitude = Math.abs(samples[originalIndex]);
    const originalClickPotential = originalAmplitude;
    
    // Zero-crossings have minimal click potential
    const zeroCrossingClickPotential = 0.01;
    
    // Calculate improvement (reduction in click potential)
    const improvement = Math.max(0, originalClickPotential - zeroCrossingClickPotential);
    
    // Normalize to 0-1 scale
    return Math.min(improvement * 2, 1.0);
  }

  /**
   * Get zero-crossings within a specific time range
   * @param {Float32Array} samples - Audio sample data
   * @param {number} sampleRate - Sample rate in Hz
   * @param {number} startTime - Start time in seconds
   * @param {number} endTime - End time in seconds
   * @returns {Array} Zero-crossings within the time range
   */
  getZeroCrossingsInRange(samples, sampleRate, startTime, endTime) {
    const zeroCrossings = this.findZeroCrossings(samples, sampleRate);
    
    return zeroCrossings.filter(crossing => 
      crossing.time >= startTime && crossing.time <= endTime
    );
  }

  /**
   * Generate cache key for waveform data
   * @param {Float32Array} samples - Audio sample data
   * @param {number} sampleRate - Sample rate in Hz
   * @returns {string} Cache key
   */
  generateCacheKey(samples, sampleRate) {
    // Create a simple hash based on sample data characteristics
    const sampleCount = samples.length;
    const checksum = samples.reduce((sum, sample, index) => {
      if (index % 1000 === 0) { // Sample every 1000th sample for performance
        return sum + Math.abs(sample);
      }
      return sum;
    }, 0);
    
    return `${sampleCount}_${sampleRate}_${checksum.toFixed(6)}`;
  }

  /**
   * Clear the zero-crossing cache
   */
  clearCache() {
    this.zeroCrossingCache.clear();
  }

  /**
   * Get cache statistics
   * @returns {Object} Cache statistics
   */
  getCacheStats() {
    return {
      size: this.zeroCrossingCache.size,
      keys: Array.from(this.zeroCrossingCache.keys())
    };
  }

  /**
   * Update detector options
   * @param {Object} newOptions - New options to merge
   */
  updateOptions(newOptions) {
    this.options = { ...this.options, ...newOptions };
    // Clear cache when options change as results may be different
    this.clearCache();
  }
}

export default ZeroCrossingDetector;