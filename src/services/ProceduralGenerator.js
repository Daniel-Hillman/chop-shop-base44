/**
 * ProceduralGenerator - Creates musically-intelligent fallback waveform patterns
 * Generates realistic audio waveforms using mathematical models and music theory
 */
export class ProceduralGenerator {
  constructor(options = {}) {
    this.sampleRate = options.sampleRate || 44100;
    this.defaultBPM = options.defaultBPM || 120;
    this.harmonicSeries = this.generateHarmonicSeries();
    this.noiseGenerators = this.initializeNoiseGenerators();
  }

  /**
   * Generate harmonic series for realistic audio synthesis
   */
  generateHarmonicSeries() {
    const fundamentalFreqs = [
      65.41,   // C2
      73.42,   // D2
      82.41,   // E2
      87.31,   // F2
      98.00,   // G2
      110.00,  // A2
      123.47   // B2
    ];
    
    const harmonics = [];
    for (const fundamental of fundamentalFreqs) {
      const harmonicSet = [];
      for (let h = 1; h <= 8; h++) {
        harmonicSet.push({
          frequency: fundamental * h,
          amplitude: 1 / h, // Natural harmonic decay
          phase: Math.random() * Math.PI * 2
        });
      }
      harmonics.push(harmonicSet);
    }
    
    return harmonics;
  }

  /**
   * Initialize different noise generators
   */
  initializeNoiseGenerators() {
    return {
      white: () => (Math.random() - 0.5) * 2,
      pink: this.createPinkNoiseGenerator(),
      brown: this.createBrownNoiseGenerator()
    };
  }

  /**
   * Create pink noise generator (1/f noise)
   */
  createPinkNoiseGenerator() {
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    
    return () => {
      const white = Math.random() - 0.5;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      const pink = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
      b6 = white * 0.115926;
      return pink * 0.11;
    };
  }

  /**
   * Create brown noise generator (1/f² noise)
   */
  createBrownNoiseGenerator() {
    let lastOut = 0;
    
    return () => {
      const white = Math.random() - 0.5;
      const brown = (lastOut + (0.02 * white)) / 1.02;
      lastOut = brown;
      return brown * 3.5;
    };
  }

  /**
   * Generate procedural waveform with musical intelligence
   */
  async generateWaveform(duration, options = {}, onProgress) {
    const {
      bpm = this.defaultBPM,
      key = 'C',
      mode = 'major',
      complexity = 0.7,
      genre = 'generic'
    } = options;

    const totalSamples = Math.floor(duration * this.sampleRate);
    const waveformData = new Float32Array(totalSamples);
    
    // Generate musical structure
    const structure = this.generateMusicalStructure(duration, bpm, genre);
    
    // Generate harmonic content
    const harmonicContent = this.selectHarmonicContent(key, mode, complexity);
    
    // Generate rhythm pattern
    const rhythmPattern = this.generateRhythmPattern(bpm, genre);
    
    // Synthesize waveform
    await this.synthesizeWaveform(
      waveformData,
      duration,
      structure,
      harmonicContent,
      rhythmPattern,
      onProgress
    );

    return {
      samples: waveformData,
      sampleRate: this.sampleRate,
      duration: duration,
      channels: 1,
      metadata: {
        analysisMethod: 'procedural',
        quality: 'low',
        generatedAt: Date.now(),
        sourceInfo: {
          bpm: bpm,
          key: key,
          mode: mode,
          complexity: complexity,
          genre: genre,
          structure: structure.map(s => s.type).join('-')
        }
      }
    };
  }

  /**
   * Generate musical structure for the waveform
   */
  generateMusicalStructure(duration, bpm, genre) {
    const beatsPerMinute = bpm;
    const totalBeats = Math.floor((duration / 60) * beatsPerMinute);
    const beatsPerMeasure = 4;
    const totalMeasures = Math.floor(totalBeats / beatsPerMeasure);
    
    const structures = {
      'electronic': [
        { type: 'intro', measures: 8, intensity: 0.3 },
        { type: 'buildup', measures: 8, intensity: 0.6 },
        { type: 'drop', measures: 16, intensity: 1.0 },
        { type: 'breakdown', measures: 8, intensity: 0.4 },
        { type: 'buildup', measures: 8, intensity: 0.7 },
        { type: 'drop', measures: 16, intensity: 1.0 },
        { type: 'outro', measures: 8, intensity: 0.2 }
      ],
      'generic': [
        { type: 'intro', measures: 4, intensity: 0.4 },
        { type: 'verse', measures: 16, intensity: 0.6 },
        { type: 'chorus', measures: 16, intensity: 0.9 },
        { type: 'verse', measures: 16, intensity: 0.6 },
        { type: 'chorus', measures: 16, intensity: 0.9 },
        { type: 'bridge', measures: 8, intensity: 0.5 },
        { type: 'chorus', measures: 16, intensity: 1.0 },
        { type: 'outro', measures: 8, intensity: 0.3 }
      ]
    };
    
    const baseStructure = structures[genre] || structures.generic;
    
    // Scale structure to fit actual duration
    const totalStructureMeasures = baseStructure.reduce((sum, section) => sum + section.measures, 0);
    const scaleFactor = totalMeasures / totalStructureMeasures;
    
    return baseStructure.map(section => ({
      ...section,
      measures: Math.max(1, Math.round(section.measures * scaleFactor))
    }));
  }

  /**
   * Select harmonic content based on key and mode
   */
  selectHarmonicContent(key, mode, complexity) {
    // Major scale intervals (in semitones from root)
    const majorScale = [0, 2, 4, 5, 7, 9, 11];
    const minorScale = [0, 2, 3, 5, 7, 8, 10];
    
    const scale = mode === 'minor' ? minorScale : majorScale;
    const rootFreq = this.getFrequencyForNote(key, 3); // 3rd octave
    
    const harmonicContent = [];
    const numHarmonics = Math.floor(3 + complexity * 5); // 3-8 harmonics based on complexity
    
    for (let i = 0; i < numHarmonics; i++) {
      const scaleIndex = i % scale.length;
      const octaveOffset = Math.floor(i / scale.length);
      const semitoneOffset = scale[scaleIndex] + (octaveOffset * 12);
      
      const frequency = rootFreq * Math.pow(2, semitoneOffset / 12);
      const amplitude = (1 / (i + 1)) * complexity; // Harmonic decay with complexity scaling
      
      harmonicContent.push({
        frequency: frequency,
        amplitude: amplitude,
        phase: Math.random() * Math.PI * 2
      });
    }
    
    return harmonicContent;
  }

  /**
   * Get frequency for a musical note
   */
  getFrequencyForNote(note, octave) {
    const noteFrequencies = {
      'C': 16.35, 'C#': 17.32, 'DB': 17.32,
      'D': 18.35, 'D#': 19.45, 'EB': 19.45,
      'E': 20.60, 'F': 21.83, 'F#': 23.12, 'GB': 23.12,
      'G': 24.50, 'G#': 25.96, 'AB': 25.96,
      'A': 27.50, 'A#': 29.14, 'BB': 29.14,
      'B': 30.87
    };
    
    const baseFreq = noteFrequencies[note.toUpperCase()] || noteFrequencies['C'];
    return baseFreq * Math.pow(2, octave);
  }

  /**
   * Generate rhythm pattern for the genre
   */
  generateRhythmPattern(bpm, genre) {
    const patterns = {
      'electronic': {
        kick: [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0], // 4/4 kick
        snare: [0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0], // Snare on 2 and 4
        hihat: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]  // Constant hi-hat
      },
      'generic': {
        kick: [1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 0],
        snare: [0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0],
        hihat: [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0]
      }
    };
    
    return patterns[genre] || patterns.generic;
  }

  /**
   * Synthesize the complete waveform
   */
  async synthesizeWaveform(waveformData, duration, structure, harmonicContent, rhythmPattern, onProgress) {
    const samplesPerBeat = Math.floor(this.sampleRate * 60 / this.defaultBPM);
    const samplesPerMeasure = samplesPerBeat * 4;
    
    let currentSample = 0;
    let currentMeasure = 0;
    
    for (const section of structure) {
      const sectionStartSample = currentSample;
      const sectionSamples = section.measures * samplesPerMeasure;
      const sectionEndSample = Math.min(currentSample + sectionSamples, waveformData.length);
      
      // Generate section content
      await this.generateSectionContent(
        waveformData,
        sectionStartSample,
        sectionEndSample - sectionStartSample,
        section,
        harmonicContent,
        rhythmPattern,
        samplesPerBeat
      );
      
      currentSample = sectionEndSample;
      currentMeasure += section.measures;
      
      if (onProgress) {
        onProgress(currentSample / waveformData.length);
      }
      
      // Yield control periodically
      if (currentSample % (this.sampleRate * 2) === 0) {
        await new Promise(resolve => setTimeout(resolve, 0));
      }
      
      if (currentSample >= waveformData.length) break;
    }
  }

  /**
   * Generate content for a specific section
   */
  async generateSectionContent(waveformData, startSample, sampleCount, section, harmonicContent, rhythmPattern, samplesPerBeat) {
    const sectionIntensity = section.intensity;
    const noiseType = this.selectNoiseType(section.type);
    const noiseGenerator = this.noiseGenerators[noiseType];
    
    for (let i = 0; i < sampleCount; i++) {
      const sampleIndex = startSample + i;
      if (sampleIndex >= waveformData.length) break;
      
      const time = i / this.sampleRate;
      const beatPosition = (i % samplesPerBeat) / samplesPerBeat;
      const rhythmIndex = Math.floor((i / samplesPerBeat) % rhythmPattern.kick.length);
      
      // Generate harmonic content
      let harmonicSum = 0;
      for (const harmonic of harmonicContent) {
        const phase = harmonic.phase + (2 * Math.PI * harmonic.frequency * time);
        harmonicSum += harmonic.amplitude * Math.sin(phase);
      }
      
      // Apply rhythm modulation
      const rhythmModulation = this.calculateRhythmModulation(rhythmPattern, rhythmIndex, beatPosition);
      
      // Add noise based on section type
      const noise = noiseGenerator() * 0.1 * sectionIntensity;
      
      // Combine all elements
      let sample = (harmonicSum * rhythmModulation + noise) * sectionIntensity;
      
      // Apply section-specific effects
      sample = this.applySectionEffects(sample, section.type, beatPosition, sectionIntensity);
      
      // Clamp to valid range
      waveformData[sampleIndex] = Math.max(-1, Math.min(1, sample));
    }
  }

  /**
   * Select appropriate noise type for section
   */
  selectNoiseType(sectionType) {
    const noiseMap = {
      'intro': 'pink',
      'buildup': 'white',
      'drop': 'brown',
      'breakdown': 'pink',
      'verse': 'pink',
      'chorus': 'white',
      'bridge': 'brown',
      'outro': 'pink'
    };
    
    return noiseMap[sectionType] || 'pink';
  }

  /**
   * Calculate rhythm modulation based on pattern
   */
  calculateRhythmModulation(rhythmPattern, rhythmIndex, beatPosition) {
    const kickStrength = rhythmPattern.kick[rhythmIndex];
    const snareStrength = rhythmPattern.snare[rhythmIndex];
    const hihatStrength = rhythmPattern.hihat[rhythmIndex];
    
    // Create envelope based on rhythm elements
    let modulation = 0.5; // Base level
    
    if (kickStrength > 0) {
      // Kick drum envelope - strong attack, quick decay
      modulation += kickStrength * Math.exp(-beatPosition * 10) * 0.8;
    }
    
    if (snareStrength > 0) {
      // Snare envelope - sharp attack, medium decay
      modulation += snareStrength * Math.exp(-beatPosition * 6) * 0.6;
    }
    
    if (hihatStrength > 0) {
      // Hi-hat envelope - quick attack and decay
      modulation += hihatStrength * Math.exp(-beatPosition * 15) * 0.3;
    }
    
    return Math.min(modulation, 2.0);
  }

  /**
   * Apply section-specific audio effects
   */
  applySectionEffects(sample, sectionType, beatPosition, intensity) {
    switch (sectionType) {
      case 'buildup':
        // Add increasing distortion and filtering
        const buildupAmount = beatPosition;
        sample *= (1 + buildupAmount * 0.5);
        break;
        
      case 'drop':
        // Add compression and saturation
        sample = Math.tanh(sample * 1.5) * 0.8;
        break;
        
      case 'breakdown':
        // Add filtering effect
        sample *= (0.5 + 0.5 * Math.sin(beatPosition * Math.PI));
        break;
        
      case 'outro':
        // Add fade-out effect
        sample *= (1 - beatPosition * 0.3);
        break;
    }
    
    return sample;
  }

  /**
   * Clean up resources
   */
  dispose() {
    // No resources to clean up for procedural generator
  }
}