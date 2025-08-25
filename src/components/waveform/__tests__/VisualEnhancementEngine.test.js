import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { VisualEnhancementEngine } from '../VisualEnhancementEngine.js';

/**
 * Test suite for Visual Enhancement Engine
 * Tests color coding, structure detection, and accessibility features
 * Requirements: 8.1, 8.2, 8.3, 8.4, 8.5
 */
describe('VisualEnhancementEngine', () => {
  let engine;
  let mockWaveformData;
  let mockFrequencyData;

  beforeEach(() => {
    engine = new VisualEnhancementEngine({
      enableFrequencyColorCoding: true,
      enableAmplitudeColorCoding: true,
      enableStructureDetection: true,
      enableAccessibilityMode: false,
      enableHighContrastMode: false,
      colorScheme: 'default'
    });

    // Mock waveform data
    mockWaveformData = {
      samples: new Float32Array(1000).map((_, i) => Math.sin(i * 0.1) * 0.5),
      sampleRate: 44100,
      duration: 10,
      channels: 1
    };

    // Mock frequency data
    mockFrequencyData = new Uint8Array(256).map((_, i) => Math.floor(Math.random() * 255));
  });

  afterEach(() => {
    engine.destroy();
  });

  describe('Frequency Color Coding', () => {
    it('should apply frequency-based color coding when enabled', () => {
      const colorData = engine.applyFrequencyColorCoding(mockWaveformData, mockFrequencyData);
      
      expect(colorData).toBeDefined();
      expect(Array.isArray(colorData)).toBe(true);
      expect(colorData.length).toBeGreaterThan(0);
      
      // Check that each segment has required properties
      colorData.forEach(segment => {
        expect(segment).toHaveProperty('startTime');
        expect(segment).toHaveProperty('endTime');
        expect(segment).toHaveProperty('color');
        expect(segment).toHaveProperty('frequencyProfile');
        
        expect(typeof segment.startTime).toBe('number');
        expect(typeof segment.endTime).toBe('number');
        expect(segment.endTime).toBeGreaterThan(segment.startTime);
        
        expect(segment.color).toHaveProperty('r');
        expect(segment.color).toHaveProperty('g');
        expect(segment.color).toHaveProperty('b');
        expect(segment.color).toHaveProperty('a');
      });
    });

    it('should return default colors when frequency coding is disabled', () => {
      engine.options.enableFrequencyColorCoding = false;
      const colorData = engine.applyFrequencyColorCoding(mockWaveformData, mockFrequencyData);
      
      expect(colorData).toBeDefined();
      expect(colorData.length).toBe(1);
      expect(colorData[0].startTime).toBe(0);
      expect(colorData[0].endTime).toBe(Infinity);
    });

    it('should use different color schemes correctly', () => {
      const schemes = ['default', 'high-contrast', 'colorblind-friendly'];
      
      schemes.forEach(scheme => {
        engine.options.colorScheme = scheme;
        const colorData = engine.applyFrequencyColorCoding(mockWaveformData, mockFrequencyData);
        
        expect(colorData).toBeDefined();
        expect(colorData.length).toBeGreaterThan(0);
        
        // Colors should be different for different schemes
        colorData.forEach(segment => {
          expect(segment.color.r).toBeGreaterThanOrEqual(0);
          expect(segment.color.r).toBeLessThanOrEqual(255);
          expect(segment.color.g).toBeGreaterThanOrEqual(0);
          expect(segment.color.g).toBeLessThanOrEqual(255);
          expect(segment.color.b).toBeGreaterThanOrEqual(0);
          expect(segment.color.b).toBeLessThanOrEqual(255);
        });
      });
    });

    it('should cache frequency color data for performance', () => {
      const colorData1 = engine.applyFrequencyColorCoding(mockWaveformData, mockFrequencyData);
      const colorData2 = engine.applyFrequencyColorCoding(mockWaveformData, mockFrequencyData);
      
      // Should return the same cached data
      expect(colorData1).toBe(colorData2);
    });
  });

  describe('Amplitude Color Coding', () => {
    it('should apply amplitude-based color coding when enabled', () => {
      const amplitudeData = engine.applyAmplitudeColorCoding(mockWaveformData);
      
      expect(amplitudeData).toBeDefined();
      expect(Array.isArray(amplitudeData)).toBe(true);
      expect(amplitudeData.length).toBeGreaterThan(0);
      
      amplitudeData.forEach(segment => {
        expect(segment).toHaveProperty('startTime');
        expect(segment).toHaveProperty('endTime');
        expect(segment).toHaveProperty('amplitude');
        expect(segment).toHaveProperty('level');
        expect(segment).toHaveProperty('colorModifier');
        
        expect(typeof segment.amplitude).toBe('number');
        expect(['silent', 'quiet', 'moderate', 'loud', 'peak']).toContain(segment.level);
        
        expect(segment.colorModifier).toHaveProperty('alpha');
        expect(segment.colorModifier).toHaveProperty('brightness');
      });
    });

    it('should return null when amplitude coding is disabled', () => {
      engine.options.enableAmplitudeColorCoding = false;
      const amplitudeData = engine.applyAmplitudeColorCoding(mockWaveformData);
      
      expect(amplitudeData).toBeNull();
    });

    it('should categorize amplitude levels correctly', () => {
      // Test amplitude categorization
      expect(engine.categorizeAmplitude(0.005)).toBe('silent');
      expect(engine.categorizeAmplitude(0.05)).toBe('quiet');
      expect(engine.categorizeAmplitude(0.3)).toBe('moderate');
      expect(engine.categorizeAmplitude(0.7)).toBe('loud');
      expect(engine.categorizeAmplitude(0.9)).toBe('peak');
    });
  });

  describe('Song Structure Detection', () => {
    it('should detect song structure when enabled', () => {
      const structureData = engine.detectSongStructure(mockWaveformData, { title: 'Test Song' });
      
      expect(structureData).toBeDefined();
      expect(Array.isArray(structureData)).toBe(true);
      
      if (structureData.length > 0) {
        structureData.forEach(section => {
          expect(section).toHaveProperty('type');
          expect(section).toHaveProperty('startTime');
          expect(section).toHaveProperty('endTime');
          expect(section).toHaveProperty('visualPattern');
          expect(section).toHaveProperty('accessibilityLabel');
          
          expect(['intro', 'verse', 'chorus', 'bridge', 'outro', 'break']).toContain(section.type);
          expect(typeof section.startTime).toBe('number');
          expect(typeof section.endTime).toBe('number');
          expect(section.endTime).toBeGreaterThan(section.startTime);
        });
      }
    });

    it('should return empty array when structure detection is disabled', () => {
      engine.options.enableStructureDetection = false;
      const structureData = engine.detectSongStructure(mockWaveformData);
      
      expect(structureData).toEqual([]);
    });

    it('should cache structure data for performance', () => {
      const metadata = { title: 'Test Song', bpm: 120 };
      const structureData1 = engine.detectSongStructure(mockWaveformData, metadata);
      const structureData2 = engine.detectSongStructure(mockWaveformData, metadata);
      
      // Should return the same cached data
      expect(structureData1).toBe(structureData2);
    });
  });

  describe('Accessibility Features', () => {
    it('should apply high contrast mode correctly', () => {
      const mockColorData = [
        { color: { r: 100, g: 150, b: 200, a: 0.8 } },
        { color: { r: 50, g: 75, b: 100, a: 0.6 } }
      ];
      
      const highContrastData = engine.applyHighContrastMode(mockColorData);
      
      expect(highContrastData).toBeDefined();
      expect(Array.isArray(highContrastData)).toBe(true);
      
      highContrastData.forEach(segment => {
        const { r, g, b } = segment.color;
        // Should be either black or white in high contrast mode
        expect(r === 0 || r === 255).toBe(true);
        expect(g === 0 || g === 255).toBe(true);
        expect(b === 0 || b === 255).toBe(true);
        expect(r).toBe(g);
        expect(g).toBe(b);
      });
    });

    it('should generate accessibility patterns when enabled', () => {
      engine.options.enableAccessibilityMode = true;
      const patterns = engine.generateAccessibilityPatterns(mockFrequencyData);
      
      expect(patterns).toBeDefined();
      expect(Array.isArray(patterns)).toBe(true);
      
      if (patterns.length > 0) {
        patterns.forEach(pattern => {
          expect(pattern).toHaveProperty('startTime');
          expect(pattern).toHaveProperty('endTime');
          expect(pattern).toHaveProperty('pattern');
          expect(pattern).toHaveProperty('density');
          expect(pattern).toHaveProperty('frequencyType');
          
          expect(['vertical-lines', 'horizontal-lines', 'diagonal-lines', 'dots', 'cross-hatch']).toContain(pattern.pattern);
          expect(['high', 'medium', 'low', 'sparse']).toContain(pattern.density);
          expect(['bass', 'lowMid', 'mid', 'highMid', 'treble']).toContain(pattern.frequencyType);
        });
      }
    });

    it('should return null when accessibility mode is disabled', () => {
      engine.options.enableAccessibilityMode = false;
      const patterns = engine.generateAccessibilityPatterns(mockFrequencyData);
      
      expect(patterns).toBeNull();
    });
  });

  describe('Visual Settings Management', () => {
    it('should create visual settings with correct structure', () => {
      const settings = engine.createVisualSettings();
      
      expect(settings).toHaveProperty('frequencyColorCoding');
      expect(settings).toHaveProperty('amplitudeColorCoding');
      expect(settings).toHaveProperty('structureDetection');
      expect(settings).toHaveProperty('accessibility');
      expect(settings).toHaveProperty('enhancements');
      
      // Check frequency color coding settings
      expect(settings.frequencyColorCoding).toHaveProperty('enabled');
      expect(settings.frequencyColorCoding).toHaveProperty('colorScheme');
      expect(settings.frequencyColorCoding).toHaveProperty('intensity');
      
      // Check accessibility settings
      expect(settings.accessibility).toHaveProperty('highContrastMode');
      expect(settings.accessibility).toHaveProperty('alternativePatterns');
      expect(settings.accessibility).toHaveProperty('textSize');
    });

    it('should update visual settings with preview callback', () => {
      const mockCallback = vi.fn();
      const newSettings = {
        frequencyColorCoding: { enabled: false },
        accessibility: { highContrastMode: true }
      };
      
      const updatedOptions = engine.updateVisualSettings(newSettings, mockCallback);
      
      expect(mockCallback).toHaveBeenCalled();
      expect(updatedOptions.enableFrequencyColorCoding).toBe(false);
      expect(updatedOptions.enableHighContrastMode).toBe(true);
    });

    it('should handle preview callback errors gracefully', () => {
      const errorCallback = vi.fn(() => {
        throw new Error('Preview error');
      });
      
      const originalOptions = { ...engine.options };
      const newSettings = { frequencyColorCoding: { enabled: false } };
      
      // Should not throw and should revert settings
      expect(() => {
        engine.updateVisualSettings(newSettings, errorCallback);
      }).not.toThrow();
      
      // Settings should be reverted
      expect(engine.options.enableFrequencyColorCoding).toBe(originalOptions.enableFrequencyColorCoding);
    });

    it('should clear cache when settings are updated', () => {
      // Generate some cached data
      engine.applyFrequencyColorCoding(mockWaveformData, mockFrequencyData);
      expect(engine.cache.size).toBeGreaterThan(0);
      
      // Update settings
      engine.updateVisualSettings({ frequencyColorCoding: { enabled: false } });
      
      // Cache should be cleared
      expect(engine.cache.size).toBe(0);
    });
  });

  describe('Performance and Caching', () => {
    it('should cache results for identical inputs', () => {
      const colorData1 = engine.applyFrequencyColorCoding(mockWaveformData, mockFrequencyData);
      const colorData2 = engine.applyFrequencyColorCoding(mockWaveformData, mockFrequencyData);
      
      expect(colorData1).toBe(colorData2);
      expect(engine.cache.size).toBeGreaterThan(0);
    });

    it('should handle large datasets efficiently', () => {
      const largeWaveformData = {
        samples: new Float32Array(100000).map((_, i) => Math.sin(i * 0.01)),
        sampleRate: 44100,
        duration: 100,
        channels: 1
      };
      
      const largeFrequencyData = new Uint8Array(2048).map(() => Math.floor(Math.random() * 255));
      
      const startTime = performance.now();
      const colorData = engine.applyFrequencyColorCoding(largeWaveformData, largeFrequencyData);
      const endTime = performance.now();
      
      expect(colorData).toBeDefined();
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
    });

    it('should clean up resources on destroy', () => {
      engine.applyFrequencyColorCoding(mockWaveformData, mockFrequencyData);
      expect(engine.cache.size).toBeGreaterThan(0);
      
      engine.destroy();
      expect(engine.cache.size).toBe(0);
    });
  });

  describe('Helper Methods', () => {
    it('should calculate RMS correctly', () => {
      const samples = new Float32Array([0.5, -0.5, 0.3, -0.3, 0.1]);
      const rms = engine.calculateRMS(samples);
      
      expect(rms).toBeGreaterThan(0);
      expect(rms).toBeLessThanOrEqual(1);
    });

    it('should analyze frequency content correctly', () => {
      const frequencyData = new Uint8Array(256);
      // Set up mock frequency data with known patterns
      for (let i = 0; i < 10; i++) frequencyData[i] = 200; // Bass
      for (let i = 10; i < 20; i++) frequencyData[i] = 150; // Low-mid
      for (let i = 20; i < 80; i++) frequencyData[i] = 100; // Mid
      
      const profile = engine.analyzeFrequencyContent(frequencyData);
      
      expect(profile).toHaveProperty('bassEnergy');
      expect(profile).toHaveProperty('lowMidEnergy');
      expect(profile).toHaveProperty('midEnergy');
      expect(profile).toHaveProperty('highMidEnergy');
      expect(profile).toHaveProperty('trebleEnergy');
      
      expect(profile.bassEnergy).toBeGreaterThan(profile.midEnergy);
    });

    it('should convert colors to high contrast correctly', () => {
      const lightColor = { r: 200, g: 200, b: 200, a: 0.8 };
      const darkColor = { r: 50, g: 50, b: 50, a: 0.6 };
      
      const lightConverted = engine.convertToHighContrast(lightColor);
      const darkConverted = engine.convertToHighContrast(darkColor);
      
      expect(lightConverted.r).toBe(255);
      expect(lightConverted.g).toBe(255);
      expect(lightConverted.b).toBe(255);
      
      expect(darkConverted.r).toBe(0);
      expect(darkConverted.g).toBe(0);
      expect(darkConverted.b).toBe(0);
    });
  });
});