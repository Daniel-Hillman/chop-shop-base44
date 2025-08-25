/**
 * Unit tests for ProceduralGenerator
 * Tests procedural waveform generation with musical intelligence
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ProceduralGenerator } from '../ProceduralGenerator.js';

describe('ProceduralGenerator', () => {
  let generator;

  beforeEach(() => {
    generator = new ProceduralGenerator({
      sampleRate: 44100,
      defaultBPM: 120
    });
  });

  afterEach(() => {
    generator.dispose();
  });

  describe('Initialization', () => {
    it('should initialize with default options', () => {
      const defaultGenerator = new ProceduralGenerator();
      
      expect(defaultGenerator.sampleRate).toBe(44100);
      expect(defaultGenerator.defaultBPM).toBe(120);
      expect(defaultGenerator.harmonicSeries).toBeDefined();
      expect(defaultGenerator.noiseGenerators).toBeDefined();
    });

    it('should initialize with custom options', () => {
      const customGenerator = new ProceduralGenerator({
        sampleRate: 48000,
        defaultBPM: 140
      });
      
      expect(customGenerator.sampleRate).toBe(48000);
      expect(customGenerator.defaultBPM).toBe(140);
    });

    it('should generate harmonic series correctly', () => {
      expect(generator.harmonicSeries).toBeInstanceOf(Array);
      expect(generator.harmonicSeries.length).toBeGreaterThan(0);
      
      // Check first harmonic set
      const firstHarmonicSet = generator.harmonicSeries[0];
      expect(firstHarmonicSet).toBeInstanceOf(Array);
      expect(firstHarmonicSet.length).toBe(8); // 8 harmonics per fundamental
      
      // Check harmonic structure
      for (let i = 0; i < firstHarmonicSet.length; i++) {
        const harmonic = firstHarmonicSet[i];
        expect(harmonic).toHaveProperty('frequency');
        expect(harmonic).toHaveProperty('amplitude');
        expect(harmonic).toHaveProperty('phase');
        expect(harmonic.amplitude).toBe(1 / (i + 1)); // Natural harmonic decay
      }
    });

    it('should initialize noise generators', () => {
      expect(generator.noiseGenerators.white).toBeInstanceOf(Function);
      expect(generator.noiseGenerators.pink).toBeInstanceOf(Function);
      expect(generator.noiseGenerators.brown).toBeInstanceOf(Function);
    });
  });

  describe('Noise Generators', () => {
    it('should generate white noise in valid range', () => {
      const whiteNoise = generator.noiseGenerators.white;
      
      for (let i = 0; i < 100; i++) {
        const sample = whiteNoise();
        expect(sample).toBeGreaterThanOrEqual(-2);
        expect(sample).toBeLessThanOrEqual(2);
      }
    });

    it('should generate pink noise with different characteristics than white', () => {
      const whiteNoise = generator.noiseGenerators.white;
      const pinkNoise = generator.noiseGenerators.pink;
      
      const whiteSamples = Array.from({ length: 1000 }, () => whiteNoise());
      const pinkSamples = Array.from({ length: 1000 }, () => pinkNoise());
      
      // Pink noise should have different statistical properties
      const whiteVariance = calculateVariance(whiteSamples);
      const pinkVariance = calculateVariance(pinkSamples);
      
      expect(whiteVariance).not.toBeCloseTo(pinkVariance, 2);
    });

    it('should generate brown noise with correlation between samples', () => {
      const brownNoise = generator.noiseGenerators.brown;
      
      const samples = Array.from({ length: 100 }, () => brownNoise());
      
      // Brown noise should have some correlation between adjacent samples
      let correlationSum = 0;
      for (let i = 1; i < samples.length; i++) {
        correlationSum += Math.abs(samples[i] - samples[i - 1]);
      }
      const avgDifference = correlationSum / (samples.length - 1);
      
      // Brown noise should have smaller differences between adjacent samples
      expect(avgDifference).toBeLessThan(1.0);
    });
  });

  describe('Musical Structure Generation', () => {
    it('should generate appropriate structure for electronic genre', () => {
      const structure = generator.generateMusicalStructure(240, 128, 'electronic');
      
      expect(structure).toBeInstanceOf(Array);
      expect(structure.length).toBeGreaterThan(0);
      
      // Check for electronic-specific sections
      const sectionTypes = structure.map(s => s.type);
      expect(sectionTypes).toContain('intro');
      expect(sectionTypes).toContain('buildup');
      expect(sectionTypes).toContain('drop');
    });

    it('should generate generic structure for unknown genre', () => {
      const structure = generator.generateMusicalStructure(180, 120, 'unknown');
      
      expect(structure).toBeInstanceOf(Array);
      expect(structure.length).toBeGreaterThan(0);
      
      // Should use generic structure
      const sectionTypes = structure.map(s => s.type);
      expect(sectionTypes).toContain('intro');
      expect(sectionTypes).toContain('verse');
      expect(sectionTypes).toContain('chorus');
    });

    it('should scale structure to fit actual duration', () => {
      const shortStructure = generator.generateMusicalStructure(60, 120, 'generic');
      const longStructure = generator.generateMusicalStructure(600, 120, 'generic');
      
      const shortTotalMeasures = shortStructure.reduce((sum, s) => sum + s.measures, 0);
      const longTotalMeasures = longStructure.reduce((sum, s) => sum + s.measures, 0);
      
      expect(longTotalMeasures).toBeGreaterThan(shortTotalMeasures);
    });

    it('should ensure all sections have valid properties', () => {
      const structure = generator.generateMusicalStructure(180, 120, 'pop');
      
      for (const section of structure) {
        expect(section).toHaveProperty('type');
        expect(section).toHaveProperty('measures');
        expect(section).toHaveProperty('intensity');
        expect(section.measures).toBeGreaterThanOrEqual(1);
        expect(section.intensity).toBeGreaterThanOrEqual(0);
        expect(section.intensity).toBeLessThanOrEqual(1);
      }
    });
  });

  describe('Harmonic Content Selection', () => {
    it('should generate harmonic content for major key', () => {
      const harmonics = generator.selectHarmonicContent('C', 'major', 0.7);
      
      expect(harmonics).toBeInstanceOf(Array);
      expect(harmonics.length).toBeGreaterThan(0);
      
      for (const harmonic of harmonics) {
        expect(harmonic).toHaveProperty('frequency');
        expect(harmonic).toHaveProperty('amplitude');
        expect(harmonic).toHaveProperty('phase');
        expect(harmonic.frequency).toBeGreaterThan(0);
        expect(harmonic.amplitude).toBeGreaterThan(0);
      }
    });

    it('should generate different content for minor key', () => {
      const majorHarmonics = generator.selectHarmonicContent('C', 'major', 0.7);
      const minorHarmonics = generator.selectHarmonicContent('C', 'minor', 0.7);
      
      // Should have different frequency content
      const majorFreqs = majorHarmonics.map(h => h.frequency);
      const minorFreqs = minorHarmonics.map(h => h.frequency);
      
      expect(majorFreqs).not.toEqual(minorFreqs);
    });

    it('should scale harmonic count with complexity', () => {
      const lowComplexity = generator.selectHarmonicContent('C', 'major', 0.2);
      const highComplexity = generator.selectHarmonicContent('C', 'major', 0.9);
      
      expect(highComplexity.length).toBeGreaterThanOrEqual(lowComplexity.length);
    });

    it('should apply harmonic decay correctly', () => {
      const harmonics = generator.selectHarmonicContent('C', 'major', 0.8);
      
      // Higher harmonics should have lower amplitude
      for (let i = 1; i < harmonics.length; i++) {
        expect(harmonics[i].amplitude).toBeLessThanOrEqual(harmonics[i - 1].amplitude);
      }
    });
  });

  describe('Note Frequency Calculation', () => {
    it('should calculate correct frequencies for standard notes', () => {
      const c4 = generator.getFrequencyForNote('C', 4);
      const a4 = generator.getFrequencyForNote('A', 4);
      
      expect(c4).toBeCloseTo(261.63, 1); // C4 ≈ 261.63 Hz
      expect(a4).toBeCloseTo(440, 1);    // A4 = 440 Hz
    });

    it('should handle octave scaling correctly', () => {
      const c3 = generator.getFrequencyForNote('C', 3);
      const c4 = generator.getFrequencyForNote('C', 4);
      const c5 = generator.getFrequencyForNote('C', 5);
      
      expect(c4).toBeCloseTo(c3 * 2, 1);
      expect(c5).toBeCloseTo(c4 * 2, 1);
    });

    it('should handle sharp and flat notes', () => {
      const cSharp = generator.getFrequencyForNote('C#', 4);
      const dFlat = generator.getFrequencyForNote('Db', 4);
      
      // Both should be valid frequencies and equal (enharmonic equivalents)
      expect(cSharp).toBeGreaterThan(0);
      expect(dFlat).toBeGreaterThan(0);
      expect(cSharp).toBe(dFlat);
      
      // Test that C# is different from C
      const c = generator.getFrequencyForNote('C', 4);
      expect(cSharp).toBeGreaterThan(c);
    });

    it('should default to C for unknown notes', () => {
      const unknown = generator.getFrequencyForNote('X', 4);
      const c = generator.getFrequencyForNote('C', 4);
      
      expect(unknown).toBeCloseTo(c, 1);
    });
  });

  describe('Rhythm Pattern Generation', () => {
    it('should generate different patterns for different genres', () => {
      const electronicPattern = generator.generateRhythmPattern(128, 'electronic');
      const genericPattern = generator.generateRhythmPattern(120, 'generic');
      
      expect(electronicPattern).toHaveProperty('kick');
      expect(electronicPattern).toHaveProperty('snare');
      expect(electronicPattern).toHaveProperty('hihat');
      
      expect(genericPattern).toHaveProperty('kick');
      expect(genericPattern).toHaveProperty('snare');
      expect(genericPattern).toHaveProperty('hihat');
      
      // Patterns should be different
      expect(electronicPattern.kick).not.toEqual(genericPattern.kick);
    });

    it('should generate patterns with correct length', () => {
      const pattern = generator.generateRhythmPattern(120, 'electronic');
      
      expect(pattern.kick.length).toBe(16);
      expect(pattern.snare.length).toBe(16);
      expect(pattern.hihat.length).toBe(16);
    });

    it('should use generic pattern for unknown genres', () => {
      const unknownPattern = generator.generateRhythmPattern(120, 'unknown');
      const genericPattern = generator.generateRhythmPattern(120, 'generic');
      
      expect(unknownPattern).toEqual(genericPattern);
    });
  });

  describe('Waveform Generation', () => {
    it('should generate complete waveform with all parameters', async () => {
      const duration = 2; // 2 seconds for faster test
      const options = {
        bpm: 128,
        key: 'C',
        mode: 'major',
        complexity: 0.7,
        genre: 'electronic'
      };
      
      const progressCallback = vi.fn();
      const result = await generator.generateWaveform(duration, options, progressCallback);
      
      expect(result).toMatchObject({
        sampleRate: 44100,
        duration: 2,
        channels: 1,
        metadata: {
          analysisMethod: 'procedural',
          quality: 'low'
        }
      });
      
      expect(result.samples).toBeInstanceOf(Float32Array);
      expect(result.samples.length).toBe(Math.floor(duration * 44100));
      expect(progressCallback).toHaveBeenCalled();
    });

    it('should use default options when not provided', async () => {
      const result = await generator.generateWaveform(1);
      
      expect(result.metadata.sourceInfo.bpm).toBe(120);
      expect(result.metadata.sourceInfo.key).toBe('C');
      expect(result.metadata.sourceInfo.mode).toBe('major');
      expect(result.metadata.sourceInfo.complexity).toBe(0.7);
      expect(result.metadata.sourceInfo.genre).toBe('generic');
    });

    it('should generate samples within valid range', async () => {
      const result = await generator.generateWaveform(0.1); // 0.1 seconds for faster test
      
      for (const sample of result.samples) {
        expect(sample).toBeGreaterThanOrEqual(-1);
        expect(sample).toBeLessThanOrEqual(1);
      }
    }, 10000); // 10 second timeout

    it('should include source information in metadata', async () => {
      const options = {
        bpm: 140,
        key: 'G',
        mode: 'minor',
        complexity: 0.9,
        genre: 'rock'
      };
      
      const result = await generator.generateWaveform(1, options);
      
      expect(result.metadata.sourceInfo.bpm).toBe(140);
      expect(result.metadata.sourceInfo.key).toBe('G');
      expect(result.metadata.sourceInfo.mode).toBe('minor');
      expect(result.metadata.sourceInfo.complexity).toBe(0.9);
      expect(result.metadata.sourceInfo.genre).toBe('rock');
    });
  });

  describe('Section Content Generation', () => {
    it('should generate different content for different section types', async () => {
      const waveformData1 = new Float32Array(1000);
      const waveformData2 = new Float32Array(1000);
      
      const introSection = { type: 'intro', intensity: 0.3 };
      const dropSection = { type: 'drop', intensity: 1.0 };
      
      const harmonicContent = generator.selectHarmonicContent('C', 'major', 0.7);
      const rhythmPattern = generator.generateRhythmPattern(120, 'electronic');
      const samplesPerBeat = Math.floor(44100 * 60 / 120);
      
      await generator.generateSectionContent(
        waveformData1, 0, 1000, introSection, harmonicContent, rhythmPattern, samplesPerBeat
      );
      
      await generator.generateSectionContent(
        waveformData2, 0, 1000, dropSection, harmonicContent, rhythmPattern, samplesPerBeat
      );
      
      // Drop section should have higher amplitude
      const introMax = Math.max(...waveformData1.map(Math.abs));
      const dropMax = Math.max(...waveformData2.map(Math.abs));
      
      expect(dropMax).toBeGreaterThan(introMax);
    });

    it('should apply rhythm modulation correctly', async () => {
      const waveformData = new Float32Array(44100); // 1 second
      const section = { type: 'chorus', intensity: 0.8 };
      const harmonicContent = generator.selectHarmonicContent('C', 'major', 0.7);
      const rhythmPattern = generator.generateRhythmPattern(120, 'electronic');
      const samplesPerBeat = Math.floor(44100 * 60 / 120);
      
      await generator.generateSectionContent(
        waveformData, 0, 44100, section, harmonicContent, rhythmPattern, samplesPerBeat
      );
      
      // Should have generated non-zero samples
      const nonZeroSamples = Array.from(waveformData).filter(sample => sample !== 0);
      expect(nonZeroSamples.length).toBeGreaterThan(0);
    });
  });

  describe('Noise Type Selection', () => {
    it('should select appropriate noise types for different sections', () => {
      expect(generator.selectNoiseType('intro')).toBe('pink');
      expect(generator.selectNoiseType('buildup')).toBe('white');
      expect(generator.selectNoiseType('drop')).toBe('brown');
      expect(generator.selectNoiseType('breakdown')).toBe('pink');
      expect(generator.selectNoiseType('verse')).toBe('pink');
      expect(generator.selectNoiseType('chorus')).toBe('white');
      expect(generator.selectNoiseType('bridge')).toBe('brown');
      expect(generator.selectNoiseType('outro')).toBe('pink');
    });

    it('should default to pink noise for unknown sections', () => {
      expect(generator.selectNoiseType('unknown')).toBe('pink');
    });
  });

  describe('Rhythm Modulation', () => {
    it('should calculate modulation based on rhythm pattern', () => {
      const rhythmPattern = {
        kick: [1, 0, 0, 0],
        snare: [0, 0, 1, 0],
        hihat: [1, 1, 1, 1]
      };
      
      const kickModulation = generator.calculateRhythmModulation(rhythmPattern, 0, 0.1);
      const snareModulation = generator.calculateRhythmModulation(rhythmPattern, 2, 0.1);
      const emptyModulation = generator.calculateRhythmModulation(rhythmPattern, 1, 0.1);
      
      expect(kickModulation).toBeGreaterThan(emptyModulation);
      expect(snareModulation).toBeGreaterThan(emptyModulation);
      expect(kickModulation).toBeLessThanOrEqual(2.0);
    });

    it('should apply beat position envelope correctly', () => {
      const rhythmPattern = { kick: [1, 0, 0, 0], snare: [0, 0, 0, 0], hihat: [0, 0, 0, 0] };
      
      const startModulation = generator.calculateRhythmModulation(rhythmPattern, 0, 0.0);
      const endModulation = generator.calculateRhythmModulation(rhythmPattern, 0, 0.9);
      
      // Kick should have stronger attack at beginning
      expect(startModulation).toBeGreaterThan(endModulation);
    });
  });

  describe('Section Effects', () => {
    it('should apply different effects to different section types', () => {
      const baseSample = 0.5;
      
      const buildupSample = generator.applySectionEffects(baseSample, 'buildup', 0.8, 0.7);
      const dropSample = generator.applySectionEffects(baseSample, 'drop', 0.5, 1.0);
      const breakdownSample = generator.applySectionEffects(baseSample, 'breakdown', 0.3, 0.6);
      const outroSample = generator.applySectionEffects(baseSample, 'outro', 0.9, 0.4);
      
      // Effects should modify the sample
      expect(buildupSample).not.toBe(baseSample);
      expect(dropSample).not.toBe(baseSample);
      expect(breakdownSample).not.toBe(baseSample);
      expect(outroSample).not.toBe(baseSample);
      
      // Drop should apply compression/saturation
      expect(Math.abs(dropSample)).toBeLessThanOrEqual(1.0);
    });

    it('should handle unknown section types gracefully', () => {
      const baseSample = 0.5;
      const unknownSample = generator.applySectionEffects(baseSample, 'unknown', 0.5, 0.7);
      
      expect(unknownSample).toBe(baseSample); // Should return unchanged
    });
  });

  describe('Resource Management', () => {
    it('should dispose without errors', () => {
      expect(() => generator.dispose()).not.toThrow();
    });
  });

  // Helper method for variance calculation
  function calculateVariance(samples) {
    const mean = samples.reduce((sum, sample) => sum + sample, 0) / samples.length;
    const squaredDiffs = samples.map(sample => Math.pow(sample - mean, 2));
    return squaredDiffs.reduce((sum, diff) => sum + diff, 0) / samples.length;
  }
});