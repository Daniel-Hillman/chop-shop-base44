/**
 * Unit tests for MetadataAnalyzer
 * Tests metadata-based waveform generation and music pattern detection
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MetadataAnalyzer } from '../MetadataAnalyzer.js';

describe('MetadataAnalyzer', () => {
  let analyzer;

  beforeEach(() => {
    analyzer = new MetadataAnalyzer({
      sampleRate: 44100,
      defaultBPM: 120
    });
  });

  afterEach(() => {
    analyzer.dispose();
  });

  describe('Initialization', () => {
    it('should initialize with default options', () => {
      const defaultAnalyzer = new MetadataAnalyzer();
      
      expect(defaultAnalyzer.sampleRate).toBe(44100);
      expect(defaultAnalyzer.defaultBPM).toBe(120);
      expect(defaultAnalyzer.musicPatterns).toBeDefined();
    });

    it('should initialize with custom options', () => {
      const customAnalyzer = new MetadataAnalyzer({
        sampleRate: 48000,
        defaultBPM: 140
      });
      
      expect(customAnalyzer.sampleRate).toBe(48000);
      expect(customAnalyzer.defaultBPM).toBe(140);
    });

    it('should initialize music patterns correctly', () => {
      expect(analyzer.musicPatterns.structures).toBeDefined();
      expect(analyzer.musicPatterns.genreKeywords).toBeDefined();
      expect(analyzer.musicPatterns.bpmRanges).toBeDefined();
      
      // Check that all required genres are present
      expect(analyzer.musicPatterns.structures.pop).toBeDefined();
      expect(analyzer.musicPatterns.structures.electronic).toBeDefined();
      expect(analyzer.musicPatterns.structures.rock).toBeDefined();
      expect(analyzer.musicPatterns.structures.generic).toBeDefined();
    });
  });

  describe('Genre Detection', () => {
    it('should detect electronic genre from keywords', () => {
      const title = 'Epic EDM Drop - House Music Mix';
      const description = 'Electronic dance music with synthesizers';
      
      const genre = analyzer.detectGenre(title, description);
      expect(genre).toBe('electronic');
    });

    it('should detect rock genre from keywords', () => {
      const title = 'Rock Band Live Performance';
      const description = 'Heavy metal guitar solos and drums';
      
      const genre = analyzer.detectGenre(title, description);
      expect(genre).toBe('rock');
    });

    it('should detect pop genre from keywords', () => {
      const title = 'Top 40 Pop Hit Radio Chart';
      const description = 'Mainstream vocal music';
      
      const genre = analyzer.detectGenre(title, description);
      expect(genre).toBe('pop');
    });

    it('should default to generic when no keywords match', () => {
      const title = 'Some Music';
      const description = 'A song';
      
      const genre = analyzer.detectGenre(title, description);
      expect(genre).toBe('generic');
    });

    it('should handle case insensitive matching', () => {
      const title = 'ELECTRONIC DANCE MUSIC';
      const description = 'HOUSE BEATS AND SYNTH';
      
      const genre = analyzer.detectGenre(title, description);
      expect(genre).toBe('electronic');
    });

    it('should choose genre with most keyword matches', () => {
      const title = 'Rock Electronic Fusion';
      const description = 'Guitar with electronic beats, synth, and house music elements';
      
      const genre = analyzer.detectGenre(title, description);
      // Should pick electronic due to more matches (electronic, beats, synth, house)
      expect(genre).toBe('electronic');
    });
  });

  describe('BPM Estimation', () => {
    it('should estimate BPM within genre range', () => {
      const electronicBPM = analyzer.estimateBPM('electronic', 180);
      const rockBPM = analyzer.estimateBPM('rock', 180);
      
      expect(electronicBPM).toBeGreaterThanOrEqual(120);
      expect(electronicBPM).toBeLessThanOrEqual(140);
      expect(rockBPM).toBeGreaterThanOrEqual(100);
      expect(rockBPM).toBeLessThanOrEqual(130);
    });

    it('should adjust BPM based on duration', () => {
      const shortSongBPM = analyzer.estimateBPM('pop', 90); // 1.5 minutes
      const longSongBPM = analyzer.estimateBPM('pop', 360); // 6 minutes
      const normalSongBPM = analyzer.estimateBPM('pop', 180); // 3 minutes
      
      expect(shortSongBPM).toBeGreaterThan(normalSongBPM);
      expect(longSongBPM).toBeLessThan(normalSongBPM);
    });

    it('should handle unknown genres', () => {
      const unknownGenreBPM = analyzer.estimateBPM('unknown', 180);
      
      expect(unknownGenreBPM).toBeGreaterThanOrEqual(100);
      expect(unknownGenreBPM).toBeLessThanOrEqual(130);
    });
  });

  describe('Structure Selection', () => {
    it('should select appropriate structure for known genres', () => {
      const popStructure = analyzer.selectStructure('pop');
      const electronicStructure = analyzer.selectStructure('electronic');
      const rockStructure = analyzer.selectStructure('rock');
      
      expect(popStructure).toBe(analyzer.musicPatterns.structures.pop);
      expect(electronicStructure).toBe(analyzer.musicPatterns.structures.electronic);
      expect(rockStructure).toBe(analyzer.musicPatterns.structures.rock);
    });

    it('should default to generic structure for unknown genres', () => {
      const unknownStructure = analyzer.selectStructure('unknown');
      
      expect(unknownStructure).toBe(analyzer.musicPatterns.structures.generic);
    });

    it('should return valid structure format', () => {
      const structure = analyzer.selectStructure('pop');
      
      expect(Array.isArray(structure)).toBe(true);
      expect(structure.length).toBeGreaterThan(0);
      
      for (const section of structure) {
        expect(section).toHaveProperty('name');
        expect(section).toHaveProperty('start');
        expect(section).toHaveProperty('end');
        expect(section).toHaveProperty('intensity');
        expect(section.start).toBeGreaterThanOrEqual(0);
        expect(section.end).toBeLessThanOrEqual(1);
        expect(section.intensity).toBeGreaterThanOrEqual(0);
        expect(section.intensity).toBeLessThanOrEqual(1);
      }
    });
  });

  describe('Energy Analysis', () => {
    it('should detect high energy from keywords', () => {
      const title = 'High Energy Power Intense Heavy Music';
      const description = 'Loud and epic massive sound';
      
      const energy = analyzer.analyzeEnergyKeywords(title, description);
      expect(energy).toBe('high');
    });

    it('should detect low energy from keywords', () => {
      const title = 'Chill Ambient Peaceful Music';
      const description = 'Calm and soft gentle sounds';
      
      const energy = analyzer.analyzeEnergyKeywords(title, description);
      expect(energy).toBe('low');
    });

    it('should default to medium energy when keywords are balanced', () => {
      const title = 'Music Song';
      const description = 'Some music';
      
      const energy = analyzer.analyzeEnergyKeywords(title, description);
      expect(energy).toBe('medium');
    });

    it('should handle mixed energy keywords', () => {
      const title = 'Intense but Chill Music';
      const description = 'Heavy and soft at the same time';
      
      const energy = analyzer.analyzeEnergyKeywords(title, description);
      // Should be medium when high and low energy words are equal
      expect(energy).toBe('medium');
    });
  });

  describe('Waveform Generation', () => {
    it('should generate waveform from metadata', async () => {
      const metadata = {
        title: 'Electronic Dance Music Track',
        description: 'High energy EDM with 128 BPM',
        duration: 180
      };
      
      const progressCallback = vi.fn();
      const result = await analyzer.analyzeMetadata(metadata, progressCallback);
      
      expect(result).toMatchObject({
        sampleRate: 44100,
        duration: 180,
        channels: 1,
        metadata: {
          analysisMethod: 'metadata',
          quality: 'low'
        }
      });
      
      expect(result.samples).toBeInstanceOf(Float32Array);
      expect(result.samples.length).toBe(Math.floor(180 * 44100));
      expect(progressCallback).toHaveBeenCalled();
    });

    it('should handle missing metadata gracefully', async () => {
      const metadata = { duration: 120 };
      
      const result = await analyzer.analyzeMetadata(metadata);
      
      expect(result.duration).toBe(120);
      expect(result.samples.length).toBe(Math.floor(120 * 44100));
      expect(result.metadata.sourceInfo.detectedGenre).toBe('generic');
    });

    it('should use default duration when not provided', async () => {
      const metadata = { title: 'Test Song' };
      
      const result = await analyzer.analyzeMetadata(metadata);
      
      expect(result.duration).toBe(180); // Default duration
    });

    it('should include detected characteristics in metadata', async () => {
      const metadata = {
        title: 'Rock Band Live Performance',
        description: 'High energy guitar music',
        duration: 240
      };
      
      const result = await analyzer.analyzeMetadata(metadata);
      
      expect(result.metadata.sourceInfo.detectedGenre).toBe('rock');
      expect(result.metadata.sourceInfo.energyLevel).toBe('high');
      expect(result.metadata.sourceInfo.estimatedBPM).toBeGreaterThan(0);
      expect(result.metadata.sourceInfo.structure).toContain('intro');
    });
  });

  describe('Beat Pattern Generation', () => {
    it('should generate different patterns for different section types', () => {
      const waveformData = new Float32Array(1000);
      
      // Test different section types
      const introSection = { name: 'intro', intensity: 0.3 };
      const dropSection = { name: 'drop1', intensity: 1.0 };
      const buildupSection = { name: 'buildup1', intensity: 0.6 };
      
      analyzer.generateBeatPattern(waveformData, 0, 100, introSection, 0.5, 0);
      const introSamples = Array.from(waveformData.slice(0, 100));
      
      waveformData.fill(0); // Reset
      analyzer.generateBeatPattern(waveformData, 0, 100, dropSection, 1.0, 0);
      const dropSamples = Array.from(waveformData.slice(0, 100));
      
      waveformData.fill(0); // Reset
      analyzer.generateBeatPattern(waveformData, 0, 100, buildupSection, 0.6, 0);
      const buildupSamples = Array.from(waveformData.slice(0, 100));
      
      // Drop should have higher amplitude than intro
      const dropMax = Math.max(...dropSamples.map(Math.abs));
      const introMax = Math.max(...introSamples.map(Math.abs));
      expect(dropMax).toBeGreaterThan(introMax);
      
      // All samples should be within valid range
      for (const sample of [...introSamples, ...dropSamples, ...buildupSamples]) {
        expect(sample).toBeGreaterThanOrEqual(-1);
        expect(sample).toBeLessThanOrEqual(1);
      }
    });

    it('should generate different patterns for different beat positions', () => {
      const waveformData = new Float32Array(400);
      const section = { name: 'chorus1', intensity: 0.8 };
      
      // Generate patterns for different beat positions
      analyzer.generateBeatPattern(waveformData, 0, 100, section, 0.8, 0);   // Beat 1 (kick)
      analyzer.generateBeatPattern(waveformData, 100, 100, section, 0.8, 1); // Beat 2
      analyzer.generateBeatPattern(waveformData, 200, 100, section, 0.8, 2); // Beat 3 (kick)
      analyzer.generateBeatPattern(waveformData, 300, 100, section, 0.8, 3); // Beat 4
      
      const beat1Samples = Array.from(waveformData.slice(0, 100));
      const beat2Samples = Array.from(waveformData.slice(100, 200));
      
      // Beat 1 and 3 should have kick patterns (stronger attack)
      const beat1Max = Math.max(...beat1Samples.map(Math.abs));
      const beat2Max = Math.max(...beat2Samples.map(Math.abs));
      
      // First beat should generally be stronger due to kick pattern
      expect(beat1Max).toBeGreaterThanOrEqual(beat2Max * 0.8);
    });
  });

  describe('Beat Pattern Type Detection', () => {
    it('should return appropriate pattern types for different sections', () => {
      expect(analyzer.getBeatPatternType('intro', 0)).toBe('kick');
      expect(analyzer.getBeatPatternType('intro', 1)).toBe('sustained');
      
      expect(analyzer.getBeatPatternType('buildup1', 0)).toBe('buildup');
      expect(analyzer.getBeatPatternType('buildup2', 2)).toBe('buildup');
      
      expect(analyzer.getBeatPatternType('breakdown', 0)).toBe('decay');
      
      expect(analyzer.getBeatPatternType('drop1', 0)).toBe('kick');
      expect(analyzer.getBeatPatternType('drop1', 2)).toBe('kick');
      expect(analyzer.getBeatPatternType('drop1', 1)).toBe('sustained');
    });

    it('should handle unknown section names', () => {
      const patternType = analyzer.getBeatPatternType('unknown', 0);
      expect(['kick', 'sustained']).toContain(patternType);
    });
  });

  describe('Section Pattern Generation', () => {
    it('should generate patterns with appropriate intensity scaling', async () => {
      const waveformData = new Float32Array(44100); // 1 second
      const section = { name: 'chorus1', intensity: 0.8 };
      const samplesPerBeat = Math.floor(44100 * 60 / 120); // 120 BPM
      
      await analyzer.generateSectionPattern(
        waveformData,
        0,
        44100,
        section,
        samplesPerBeat,
        0.7 // base energy multiplier
      );
      
      // Check that samples were generated
      const nonZeroSamples = Array.from(waveformData).filter(sample => sample !== 0);
      expect(nonZeroSamples.length).toBeGreaterThan(0);
      
      // Check amplitude scaling
      const maxAmplitude = Math.max(...waveformData.map(Math.abs));
      expect(maxAmplitude).toBeLessThanOrEqual(1.0);
      expect(maxAmplitude).toBeGreaterThan(0);
    });

    it('should handle partial beats at section end', async () => {
      const samplesPerBeat = 1000;
      const sectionLength = 2500; // 2.5 beats
      const waveformData = new Float32Array(sectionLength);
      const section = { name: 'verse1', intensity: 0.6 };
      
      await analyzer.generateSectionPattern(
        waveformData,
        0,
        sectionLength,
        section,
        samplesPerBeat,
        0.7
      );
      
      // Should handle the partial beat (500 samples) at the end
      const nonZeroSamples = Array.from(waveformData).filter(sample => sample !== 0);
      expect(nonZeroSamples.length).toBeGreaterThan(2000); // Most samples should be filled
    });
  });

  describe('Resource Management', () => {
    it('should dispose without errors', () => {
      expect(() => analyzer.dispose()).not.toThrow();
    });
  });

  describe('Progress Reporting', () => {
    it('should report progress during waveform generation', async () => {
      const metadata = {
        title: 'Test Song',
        duration: 10 // Short duration for faster test
      };
      
      const progressCallback = vi.fn();
      await analyzer.analyzeMetadata(metadata, progressCallback);
      
      expect(progressCallback).toHaveBeenCalled();
      
      // Check that progress values are reasonable
      const progressValues = progressCallback.mock.calls.map(call => call[0]);
      for (const progress of progressValues) {
        expect(progress).toBeGreaterThanOrEqual(0);
        expect(progress).toBeLessThanOrEqual(1);
      }
    });
  });
});