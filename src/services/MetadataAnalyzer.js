/**
 * MetadataAnalyzer - Generates waveforms based on YouTube video metadata
 * Uses video title, description, and duration to create musically-intelligent patterns
 */
export class MetadataAnalyzer {
  constructor(options = {}) {
    this.sampleRate = options.sampleRate || 44100;
    this.defaultBPM = options.defaultBPM || 120;
    this.musicPatterns = this.initializeMusicPatterns();
  }

  /**
   * Initialize common music patterns and structures
   */
  initializeMusicPatterns() {
    return {
      // Common song structures (in percentages of total duration)
      structures: {
        'pop': [
          { name: 'intro', start: 0, end: 0.08, intensity: 0.3 },
          { name: 'verse1', start: 0.08, end: 0.25, intensity: 0.6 },
          { name: 'chorus1', start: 0.25, end: 0.42, intensity: 0.9 },
          { name: 'verse2', start: 0.42, end: 0.58, intensity: 0.6 },
          { name: 'chorus2', start: 0.58, end: 0.75, intensity: 0.9 },
          { name: 'bridge', start: 0.75, end: 0.83, intensity: 0.4 },
          { name: 'chorus3', start: 0.83, end: 1.0, intensity: 1.0 }
        ],
        'electronic': [
          { name: 'intro', start: 0, end: 0.12, intensity: 0.2 },
          { name: 'buildup1', start: 0.12, end: 0.25, intensity: 0.5 },
          { name: 'drop1', start: 0.25, end: 0.45, intensity: 1.0 },
          { name: 'breakdown', start: 0.45, end: 0.55, intensity: 0.3 },
          { name: 'buildup2', start: 0.55, end: 0.65, intensity: 0.7 },
          { name: 'drop2', start: 0.65, end: 0.9, intensity: 1.0 },
          { name: 'outro', start: 0.9, end: 1.0, intensity: 0.2 }
        ],
        'rock': [
          { name: 'intro', start: 0, end: 0.1, intensity: 0.4 },
          { name: 'verse1', start: 0.1, end: 0.3, intensity: 0.6 },
          { name: 'chorus1', start: 0.3, end: 0.5, intensity: 0.9 },
          { name: 'verse2', start: 0.5, end: 0.65, intensity: 0.6 },
          { name: 'chorus2', start: 0.65, end: 0.8, intensity: 0.9 },
          { name: 'solo', start: 0.8, end: 0.9, intensity: 0.8 },
          { name: 'outro', start: 0.9, end: 1.0, intensity: 0.7 }
        ],
        'generic': [
          { name: 'intro', start: 0, end: 0.1, intensity: 0.3 },
          { name: 'section1', start: 0.1, end: 0.35, intensity: 0.7 },
          { name: 'section2', start: 0.35, end: 0.65, intensity: 0.9 },
          { name: 'section3', start: 0.65, end: 0.9, intensity: 0.8 },
          { name: 'outro', start: 0.9, end: 1.0, intensity: 0.4 }
        ]
      },
      
      // Genre keywords for pattern detection
      genreKeywords: {
        'electronic': ['edm', 'house', 'techno', 'dubstep', 'trance', 'electronic', 'synth', 'beat', 'drop'],
        'rock': ['rock', 'metal', 'punk', 'alternative', 'guitar', 'band', 'live'],
        'pop': ['pop', 'hit', 'chart', 'radio', 'mainstream', 'vocal'],
        'hip-hop': ['hip hop', 'rap', 'beats', 'freestyle', 'trap'],
        'classical': ['classical', 'orchestra', 'symphony', 'piano', 'violin'],
        'jazz': ['jazz', 'blues', 'swing', 'improvisation']
      },
      
      // BPM ranges for different genres
      bpmRanges: {
        'electronic': { min: 120, max: 140 },
        'rock': { min: 100, max: 130 },
        'pop': { min: 100, max: 130 },
        'hip-hop': { min: 70, max: 100 },
        'classical': { min: 60, max: 120 },
        'jazz': { min: 80, max: 160 }
      }
    };
  }

  /**
   * Analyze video metadata and generate waveform
   */
  async analyzeMetadata(metadata, onProgress) {
    const { title = '', description = '', duration = 180 } = metadata;
    
    // Detect genre and characteristics
    const genre = this.detectGenre(title, description);
    const bpm = this.estimateBPM(genre, duration);
    const structure = this.selectStructure(genre);
    const energy = this.analyzeEnergyKeywords(title, description);
    
    // Generate waveform data
    const totalSamples = Math.floor(duration * this.sampleRate);
    const waveformData = new Float32Array(totalSamples);
    
    // Generate samples based on detected characteristics
    await this.generateStructuredWaveform(
      waveformData, 
      duration, 
      structure, 
      bpm, 
      energy,
      onProgress
    );

    return {
      samples: waveformData,
      sampleRate: this.sampleRate,
      duration: duration,
      channels: 1,
      metadata: {
        analysisMethod: 'metadata',
        quality: 'low',
        generatedAt: Date.now(),
        sourceInfo: {
          detectedGenre: genre,
          estimatedBPM: bpm,
          structure: structure.map(s => s.name).join('-'),
          energyLevel: energy
        }
      }
    };
  }

  /**
   * Detect genre from title and description
   */
  detectGenre(title, description) {
    const text = (title + ' ' + description).toLowerCase();
    let maxMatches = 0;
    let detectedGenre = 'generic';
    
    for (const [genre, keywords] of Object.entries(this.musicPatterns.genreKeywords)) {
      const matches = keywords.filter(keyword => text.includes(keyword)).length;
      if (matches > maxMatches) {
        maxMatches = matches;
        detectedGenre = genre;
      }
    }
    
    return detectedGenre;
  }

  /**
   * Estimate BPM based on genre and duration
   */
  estimateBPM(genre, duration) {
    const bpmRange = this.musicPatterns.bpmRanges[genre] || { min: 100, max: 130 };
    
    // Adjust BPM based on duration (longer songs tend to be slower)
    let bpmModifier = 1.0;
    if (duration > 300) bpmModifier = 0.9; // Slower for long songs
    if (duration < 120) bpmModifier = 1.1; // Faster for short songs
    
    const avgBPM = (bpmRange.min + bpmRange.max) / 2;
    return Math.round(avgBPM * bpmModifier);
  }

  /**
   * Select appropriate structure pattern
   */
  selectStructure(genre) {
    return this.musicPatterns.structures[genre] || this.musicPatterns.structures.generic;
  }

  /**
   * Analyze energy-related keywords
   */
  analyzeEnergyKeywords(title, description) {
    const text = (title + ' ' + description).toLowerCase();
    const highEnergyWords = ['energy', 'power', 'intense', 'hard', 'heavy', 'loud', 'epic', 'massive'];
    const lowEnergyWords = ['chill', 'calm', 'soft', 'ambient', 'peaceful', 'quiet', 'gentle'];
    
    const highEnergyCount = highEnergyWords.filter(word => text.includes(word)).length;
    const lowEnergyCount = lowEnergyWords.filter(word => text.includes(word)).length;
    
    if (highEnergyCount > lowEnergyCount) return 'high';
    if (lowEnergyCount > highEnergyCount) return 'low';
    return 'medium';
  }

  /**
   * Generate structured waveform based on detected characteristics
   */
  async generateStructuredWaveform(waveformData, duration, structure, bpm, energy, onProgress) {
    const samplesPerBeat = Math.floor(this.sampleRate * 60 / bpm);
    const totalSamples = waveformData.length;
    
    // Energy level multipliers
    const energyMultipliers = {
      'low': 0.4,
      'medium': 0.7,
      'high': 1.0
    };
    const baseEnergyMultiplier = energyMultipliers[energy] || 0.7;
    
    let processedSamples = 0;
    
    for (const section of structure) {
      const startSample = Math.floor(section.start * totalSamples);
      const endSample = Math.floor(section.end * totalSamples);
      const sectionLength = endSample - startSample;
      
      // Generate section-specific pattern
      await this.generateSectionPattern(
        waveformData,
        startSample,
        sectionLength,
        section,
        samplesPerBeat,
        baseEnergyMultiplier
      );
      
      processedSamples += sectionLength;
      
      if (onProgress) {
        onProgress(processedSamples / totalSamples);
      }
      
      // Yield control periodically
      if (processedSamples % (this.sampleRate * 2) === 0) {
        await new Promise(resolve => setTimeout(resolve, 0));
      }
    }
  }

  /**
   * Generate pattern for a specific song section
   */
  async generateSectionPattern(waveformData, startIndex, length, section, samplesPerBeat, baseEnergyMultiplier) {
    const sectionIntensity = section.intensity * baseEnergyMultiplier;
    const beatsInSection = Math.floor(length / samplesPerBeat);
    
    for (let beat = 0; beat < beatsInSection; beat++) {
      const beatStartIndex = startIndex + (beat * samplesPerBeat);
      const beatEndIndex = Math.min(beatStartIndex + samplesPerBeat, startIndex + length);
      
      // Generate beat pattern based on section type
      this.generateBeatPattern(
        waveformData,
        beatStartIndex,
        beatEndIndex - beatStartIndex,
        section,
        sectionIntensity,
        beat
      );
    }
    
    // Fill remaining samples if any
    const remainingSamples = length % samplesPerBeat;
    if (remainingSamples > 0) {
      const remainingStartIndex = startIndex + (beatsInSection * samplesPerBeat);
      this.generateBeatPattern(
        waveformData,
        remainingStartIndex,
        remainingSamples,
        section,
        sectionIntensity,
        0
      );
    }
  }

  /**
   * Generate pattern for a single beat
   */
  generateBeatPattern(waveformData, startIndex, length, section, intensity, beatNumber) {
    const patternType = this.getBeatPatternType(section.name, beatNumber);
    
    for (let i = 0; i < length; i++) {
      const sampleIndex = startIndex + i;
      if (sampleIndex >= waveformData.length) break;
      
      const normalizedPosition = i / length; // 0 to 1 within the beat
      let amplitude = 0;
      
      switch (patternType) {
        case 'kick':
          // Strong attack at beginning, quick decay
          amplitude = intensity * Math.exp(-normalizedPosition * 8) * (1 + Math.sin(normalizedPosition * Math.PI * 4) * 0.3);
          break;
          
        case 'sustained':
          // Sustained energy with slight variation
          amplitude = intensity * (0.7 + 0.3 * Math.sin(normalizedPosition * Math.PI * 2));
          break;
          
        case 'buildup':
          // Gradual increase in energy
          amplitude = intensity * normalizedPosition * (0.8 + 0.2 * Math.sin(normalizedPosition * Math.PI * 6));
          break;
          
        case 'decay':
          // Gradual decrease in energy
          amplitude = intensity * (1 - normalizedPosition * 0.7) * (0.8 + 0.2 * Math.sin(normalizedPosition * Math.PI * 4));
          break;
          
        default:
          // Generic pattern with some variation
          amplitude = intensity * (0.6 + 0.4 * Math.sin(normalizedPosition * Math.PI * 2));
      }
      
      // Add some randomness for realism
      amplitude *= (0.9 + Math.random() * 0.2);
      
      waveformData[sampleIndex] = Math.max(-1, Math.min(1, amplitude));
    }
  }

  /**
   * Determine beat pattern type based on section and beat position
   */
  getBeatPatternType(sectionName, beatNumber) {
    const beatInMeasure = beatNumber % 4;
    
    switch (sectionName) {
      case 'intro':
      case 'outro':
        return beatInMeasure === 0 ? 'kick' : 'sustained';
        
      case 'buildup1':
      case 'buildup2':
        return 'buildup';
        
      case 'breakdown':
        return 'decay';
        
      case 'drop1':
      case 'drop2':
      case 'chorus1':
      case 'chorus2':
      case 'chorus3':
        return beatInMeasure === 0 || beatInMeasure === 2 ? 'kick' : 'sustained';
        
      default:
        return beatInMeasure === 0 ? 'kick' : 'sustained';
    }
  }

  /**
   * Clean up resources
   */
  dispose() {
    // No resources to clean up for metadata analyzer
  }
}