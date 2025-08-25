/**
 * Visual Enhancement Engine for Waveform Visualization
 * Implements color coding, accessibility features, and visual settings
 * Requirements: 8.1, 8.2, 8.3, 8.4, 8.5
 */

export class VisualEnhancementEngine {
  constructor(options = {}) {
    this.options = {
      enableFrequencyColorCoding: true,
      enableAmplitudeColorCoding: true,
      enableStructureDetection: true,
      enableAccessibilityMode: false,
      enableHighContrastMode: false,
      colorScheme: 'default', // 'default', 'high-contrast', 'colorblind-friendly'
      ...options
    };

    // Color schemes for different frequency ranges
    this.frequencyColorSchemes = {
      default: {
        bass: { r: 220, g: 38, b: 127 },      // Deep pink for bass (20-250 Hz)
        lowMid: { r: 239, g: 68, b: 68 },     // Red for low-mid (250-500 Hz)
        mid: { r: 245, g: 158, b: 11 },       // Orange for mid (500-2000 Hz)
        highMid: { r: 34, g: 197, b: 94 },    // Green for high-mid (2-8 kHz)
        treble: { r: 59, g: 130, b: 246 }     // Blue for treble (8+ kHz)
      },
      'high-contrast': {
        bass: { r: 255, g: 255, b: 255 },     // White
        lowMid: { r: 255, g: 255, b: 0 },     // Yellow
        mid: { r: 255, g: 0, b: 255 },        // Magenta
        highMid: { r: 0, g: 255, b: 255 },    // Cyan
        treble: { r: 0, g: 0, b: 0 }          // Black
      },
      'colorblind-friendly': {
        bass: { r: 0, g: 114, b: 178 },       // Blue
        lowMid: { r: 230, g: 159, b: 0 },     // Orange
        mid: { r: 0, g: 158, b: 115 },        // Bluish green
        highMid: { r: 204, g: 121, b: 167 },  // Reddish purple
        treble: { r: 86, g: 180, b: 233 }     // Sky blue
      }
    };

    // Amplitude-based color intensity mapping
    this.amplitudeColorMap = {
      silent: { alpha: 0.1, brightness: 0.3 },      // Very quiet sections
      quiet: { alpha: 0.3, brightness: 0.5 },       // Quiet sections
      moderate: { alpha: 0.6, brightness: 0.7 },    // Normal levels
      loud: { alpha: 0.8, brightness: 0.9 },        // Loud sections
      peak: { alpha: 1.0, brightness: 1.0 }         // Peak levels
    };

    // Song structure detection patterns
    this.structurePatterns = {
      verse: { 
        color: { r: 100, g: 149, b: 237 }, 
        pattern: 'solid',
        description: 'Verse section'
      },
      chorus: { 
        color: { r: 255, g: 215, b: 0 }, 
        pattern: 'gradient',
        description: 'Chorus section'
      },
      bridge: { 
        color: { r: 147, g: 112, b: 219 }, 
        pattern: 'dashed',
        description: 'Bridge section'
      },
      intro: { 
        color: { r: 60, g: 179, b: 113 }, 
        pattern: 'dotted',
        description: 'Intro section'
      },
      outro: { 
        color: { r: 205, g: 92, b: 92 }, 
        pattern: 'dotted',
        description: 'Outro section'
      },
      break: { 
        color: { r: 255, g: 140, b: 0 }, 
        pattern: 'sparse',
        description: 'Break/Drop section'
      }
    };

    // Accessibility patterns for non-color visual cues
    this.accessibilityPatterns = {
      bass: { pattern: 'vertical-lines', density: 'high' },
      lowMid: { pattern: 'diagonal-lines', density: 'medium' },
      mid: { pattern: 'dots', density: 'medium' },
      highMid: { pattern: 'horizontal-lines', density: 'low' },
      treble: { pattern: 'cross-hatch', density: 'sparse' }
    };

    this.cache = new Map();
  }

  /**
   * Apply frequency-based color coding to waveform data
   * Requirement 8.1: Color coding for different frequency ranges
   */
  applyFrequencyColorCoding(waveformData, frequencyData) {
    if (!this.options.enableFrequencyColorCoding || !frequencyData) {
      return this.getDefaultWaveformColors();
    }

    const cacheKey = `freq-${waveformData.duration}-${this.options.colorScheme}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    const colorScheme = this.frequencyColorSchemes[this.options.colorScheme] || 
                       this.frequencyColorSchemes.default;
    
    const coloredSegments = [];
    const segmentSize = Math.floor(frequencyData.length / 100); // 100 segments for performance

    for (let i = 0; i < 100; i++) {
      const startIdx = i * segmentSize;
      const endIdx = Math.min((i + 1) * segmentSize, frequencyData.length);
      
      // Analyze frequency content in this segment
      const frequencyProfile = this.analyzeFrequencyContent(
        frequencyData.slice(startIdx, endIdx)
      );
      
      // Generate color based on dominant frequency
      const dominantColor = this.getDominantFrequencyColor(frequencyProfile, colorScheme);
      
      coloredSegments.push({
        startTime: (i / 100) * waveformData.duration,
        endTime: ((i + 1) / 100) * waveformData.duration,
        color: dominantColor,
        frequencyProfile
      });
    }

    this.cache.set(cacheKey, coloredSegments);
    return coloredSegments;
  }

  /**
   * Apply amplitude-based color intensity
   * Requirement 8.1: Color coding for amplitude levels
   */
  applyAmplitudeColorCoding(waveformData) {
    if (!this.options.enableAmplitudeColorCoding) {
      return null;
    }

    const { samples } = waveformData;
    if (!samples) return null;

    const amplitudeSegments = [];
    const segmentSize = Math.floor(samples.length / 200); // 200 segments

    for (let i = 0; i < 200; i++) {
      const startIdx = i * segmentSize;
      const endIdx = Math.min((i + 1) * segmentSize, samples.length);
      
      // Calculate RMS amplitude for this segment
      const rms = this.calculateRMS(samples.slice(startIdx, endIdx));
      const amplitudeLevel = this.categorizeAmplitude(rms);
      
      amplitudeSegments.push({
        startTime: (startIdx / samples.length) * waveformData.duration,
        endTime: (endIdx / samples.length) * waveformData.duration,
        amplitude: rms,
        level: amplitudeLevel,
        colorModifier: this.amplitudeColorMap[amplitudeLevel]
      });
    }

    return amplitudeSegments;
  }

  /**
   * Detect song structure and add visual cues
   * Requirement 8.2: Visual cues for song structure detection
   */
  detectSongStructure(waveformData, metadata = {}) {
    if (!this.options.enableStructureDetection) {
      return [];
    }

    const cacheKey = `structure-${waveformData.duration}-${JSON.stringify(metadata)}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    const { samples, duration } = waveformData;
    if (!samples || !duration) return [];

    const structureSections = [];
    
    // Analyze energy patterns to detect sections
    const energyProfile = this.analyzeEnergyProfile(samples, duration);
    const sections = this.identifyStructuralSections(energyProfile, duration, metadata);
    
    sections.forEach(section => {
      const pattern = this.structurePatterns[section.type] || this.structurePatterns.verse;
      
      structureSections.push({
        ...section,
        visualPattern: pattern,
        accessibilityLabel: pattern.description
      });
    });

    this.cache.set(cacheKey, structureSections);
    return structureSections;
  }

  /**
   * Apply high contrast mode for accessibility
   * Requirement 8.3: High contrast mode and alternative visual representations
   */
  applyHighContrastMode(colorData) {
    if (!this.options.enableHighContrastMode) {
      return colorData;
    }

    return colorData.map(segment => ({
      ...segment,
      color: this.convertToHighContrast(segment.color),
      strokeWidth: Math.max(segment.strokeWidth || 1, 2),
      shadowBlur: 4,
      shadowColor: 'rgba(0, 0, 0, 0.8)'
    }));
  }

  /**
   * Generate accessibility patterns for non-color visual cues
   * Requirement 8.3: Alternative visual representations for accessibility
   */
  generateAccessibilityPatterns(frequencyData) {
    if (!this.options.enableAccessibilityMode) {
      return null;
    }

    const patterns = [];
    const segmentSize = Math.floor(frequencyData.length / 50);

    for (let i = 0; i < 50; i++) {
      const startIdx = i * segmentSize;
      const endIdx = Math.min((i + 1) * segmentSize, frequencyData.length);
      
      const frequencyProfile = this.analyzeFrequencyContent(
        frequencyData.slice(startIdx, endIdx)
      );
      
      const dominantFreq = this.getDominantFrequency(frequencyProfile);
      const pattern = this.accessibilityPatterns[dominantFreq];
      
      patterns.push({
        startTime: (i / 50) * (frequencyData.length / 44100), // Assume 44.1kHz
        endTime: ((i + 1) / 50) * (frequencyData.length / 44100),
        pattern: pattern.pattern,
        density: pattern.density,
        frequencyType: dominantFreq
      });
    }

    return patterns;
  }

  /**
   * Create configurable visual settings with real-time preview
   * Requirement 8.4, 8.5: Configurable visual settings with real-time preview
   */
  createVisualSettings() {
    return {
      // Color coding settings
      frequencyColorCoding: {
        enabled: this.options.enableFrequencyColorCoding,
        colorScheme: this.options.colorScheme,
        intensity: 0.8,
        blendMode: 'normal'
      },
      
      amplitudeColorCoding: {
        enabled: this.options.enableAmplitudeColorCoding,
        sensitivity: 0.7,
        dynamicRange: true
      },
      
      // Structure detection settings
      structureDetection: {
        enabled: this.options.enableStructureDetection,
        sensitivity: 0.6,
        showLabels: true,
        showPatterns: true
      },
      
      // Accessibility settings
      accessibility: {
        highContrastMode: this.options.enableHighContrastMode,
        alternativePatterns: this.options.enableAccessibilityMode,
        textSize: 'medium',
        reducedMotion: false
      },
      
      // Visual enhancement settings
      enhancements: {
        gradientFill: true,
        shadowEffects: false,
        animatedElements: true,
        particleEffects: false
      }
    };
  }

  /**
   * Update visual settings with real-time preview
   */
  updateVisualSettings(newSettings, previewCallback) {
    const oldSettings = { ...this.options };
    
    // Apply new settings
    Object.assign(this.options, {
      enableFrequencyColorCoding: newSettings.frequencyColorCoding?.enabled ?? this.options.enableFrequencyColorCoding,
      enableAmplitudeColorCoding: newSettings.amplitudeColorCoding?.enabled ?? this.options.enableAmplitudeColorCoding,
      enableStructureDetection: newSettings.structureDetection?.enabled ?? this.options.enableStructureDetection,
      enableHighContrastMode: newSettings.accessibility?.highContrastMode ?? this.options.enableHighContrastMode,
      enableAccessibilityMode: newSettings.accessibility?.alternativePatterns ?? this.options.enableAccessibilityMode,
      colorScheme: newSettings.frequencyColorCoding?.colorScheme ?? this.options.colorScheme
    });
    
    // Clear cache to force regeneration
    this.cache.clear();
    
    // Trigger preview callback if provided
    if (previewCallback && typeof previewCallback === 'function') {
      try {
        previewCallback(this.options, oldSettings);
      } catch (error) {
        console.error('Error in visual settings preview callback:', error);
        // Revert settings on error
        Object.assign(this.options, oldSettings);
      }
    }
    
    return this.options;
  }

  // Helper methods

  analyzeFrequencyContent(frequencyData) {
    const bassEnergy = this.calculateBandEnergy(frequencyData, 0, 10);      // 20-250 Hz
    const lowMidEnergy = this.calculateBandEnergy(frequencyData, 10, 20);   // 250-500 Hz
    const midEnergy = this.calculateBandEnergy(frequencyData, 20, 80);      // 500-2000 Hz
    const highMidEnergy = this.calculateBandEnergy(frequencyData, 80, 160); // 2-8 kHz
    const trebleEnergy = this.calculateBandEnergy(frequencyData, 160, 255); // 8+ kHz
    
    return { bassEnergy, lowMidEnergy, midEnergy, highMidEnergy, trebleEnergy };
  }

  calculateBandEnergy(frequencyData, startBin, endBin) {
    let energy = 0;
    for (let i = startBin; i <= Math.min(endBin, frequencyData.length - 1); i++) {
      energy += frequencyData[i] * frequencyData[i];
    }
    return Math.sqrt(energy / (endBin - startBin + 1));
  }

  getDominantFrequencyColor(frequencyProfile, colorScheme) {
    const { bassEnergy, lowMidEnergy, midEnergy, highMidEnergy, trebleEnergy } = frequencyProfile;
    
    // Find dominant frequency range
    const energies = { bassEnergy, lowMidEnergy, midEnergy, highMidEnergy, trebleEnergy };
    const dominantRange = Object.keys(energies).reduce((a, b) => 
      energies[a] > energies[b] ? a : b
    );
    
    // Map to color scheme
    const colorMap = {
      bassEnergy: colorScheme.bass,
      lowMidEnergy: colorScheme.lowMid,
      midEnergy: colorScheme.mid,
      highMidEnergy: colorScheme.highMid,
      trebleEnergy: colorScheme.treble
    };
    
    const baseColor = colorMap[dominantRange];
    const intensity = energies[dominantRange] / 255; // Normalize to 0-1
    
    return {
      r: Math.round(baseColor.r * intensity),
      g: Math.round(baseColor.g * intensity),
      b: Math.round(baseColor.b * intensity),
      a: Math.min(0.8, intensity)
    };
  }

  getDominantFrequency(frequencyProfile) {
    const { bassEnergy, lowMidEnergy, midEnergy, highMidEnergy, trebleEnergy } = frequencyProfile;
    const energies = { bass: bassEnergy, lowMid: lowMidEnergy, mid: midEnergy, highMid: highMidEnergy, treble: trebleEnergy };
    
    return Object.keys(energies).reduce((a, b) => energies[a] > energies[b] ? a : b);
  }

  calculateRMS(samples) {
    if (!samples || samples.length === 0) return 0;
    
    let sum = 0;
    for (let i = 0; i < samples.length; i++) {
      sum += samples[i] * samples[i];
    }
    return Math.sqrt(sum / samples.length);
  }

  categorizeAmplitude(rms) {
    if (rms < 0.01) return 'silent';
    if (rms < 0.1) return 'quiet';
    if (rms < 0.5) return 'moderate';
    if (rms < 0.8) return 'loud';
    return 'peak';
  }

  analyzeEnergyProfile(samples, duration) {
    const windowSize = Math.floor(samples.length / 100); // 100 windows
    const energyProfile = [];
    
    for (let i = 0; i < 100; i++) {
      const start = i * windowSize;
      const end = Math.min((i + 1) * windowSize, samples.length);
      const windowSamples = samples.slice(start, end);
      
      const rms = this.calculateRMS(windowSamples);
      const spectralCentroid = this.calculateSpectralCentroid(windowSamples);
      
      energyProfile.push({
        time: (i / 100) * duration,
        energy: rms,
        spectralCentroid,
        variance: this.calculateVariance(windowSamples)
      });
    }
    
    return energyProfile;
  }

  identifyStructuralSections(energyProfile, duration, metadata) {
    const sections = [];
    let currentSection = null;
    
    // Simple structure detection based on energy patterns
    energyProfile.forEach((window, index) => {
      const sectionType = this.classifySection(window, energyProfile, index);
      
      if (!currentSection || currentSection.type !== sectionType) {
        if (currentSection) {
          currentSection.endTime = window.time;
          sections.push(currentSection);
        }
        
        currentSection = {
          type: sectionType,
          startTime: window.time,
          endTime: duration,
          confidence: 0.7 // Basic confidence score
        };
      }
    });
    
    if (currentSection) {
      sections.push(currentSection);
    }
    
    return sections;
  }

  classifySection(window, energyProfile, index) {
    const { energy, spectralCentroid, variance } = window;
    
    // Simple heuristics for section classification
    if (index < 5) return 'intro';
    if (index > energyProfile.length - 5) return 'outro';
    
    if (energy > 0.7 && spectralCentroid > 0.6) return 'chorus';
    if (energy < 0.3 && variance < 0.2) return 'break';
    if (spectralCentroid < 0.4 && variance > 0.5) return 'bridge';
    
    return 'verse';
  }

  calculateSpectralCentroid(samples) {
    // Simplified spectral centroid calculation
    let weightedSum = 0;
    let magnitudeSum = 0;
    
    for (let i = 0; i < samples.length; i++) {
      const magnitude = Math.abs(samples[i]);
      weightedSum += i * magnitude;
      magnitudeSum += magnitude;
    }
    
    return magnitudeSum > 0 ? (weightedSum / magnitudeSum) / samples.length : 0;
  }

  calculateVariance(samples) {
    if (samples.length === 0) return 0;
    
    const mean = samples.reduce((sum, val) => sum + val, 0) / samples.length;
    const variance = samples.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / samples.length;
    
    return Math.sqrt(variance);
  }

  convertToHighContrast(color) {
    const { r, g, b, a } = color;
    const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
    
    // Convert to high contrast black or white based on luminance
    if (luminance > 128) {
      return { r: 255, g: 255, b: 255, a: a || 1 };
    } else {
      return { r: 0, g: 0, b: 0, a: a || 1 };
    }
  }

  getDefaultWaveformColors() {
    return [{
      startTime: 0,
      endTime: Infinity,
      color: { r: 6, g: 182, b: 212, a: 0.8 }
    }];
  }

  destroy() {
    this.cache.clear();
  }
}