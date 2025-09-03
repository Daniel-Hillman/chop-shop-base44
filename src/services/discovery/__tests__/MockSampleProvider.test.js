/**
 * @fileoverview Unit tests for MockSampleProvider
 * Tests mock data generation, filtering methods, and data validation
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { MockSampleProvider } from '../MockSampleProvider.js';
import { validateSampleData, VALID_GENRES } from '../../../types/discovery.js';

describe('MockSampleProvider', () => {
  let provider;

  beforeEach(() => {
    provider = new MockSampleProvider();
  });

  describe('Constructor and Initialization', () => {
    it('should initialize with sample database', () => {
      expect(provider).toBeDefined();
      expect(provider.sampleDatabase).toBeDefined();
      expect(typeof provider.sampleDatabase).toBe('object');
    });

    it('should have samples for all expected genres', () => {
      const expectedGenres = ['Soul', 'Jazz', 'Funk', 'Blues', 'Afrobeat'];
      expectedGenres.forEach(genre => {
        expect(provider.sampleDatabase[genre]).toBeDefined();
        expect(Array.isArray(provider.sampleDatabase[genre])).toBe(true);
        expect(provider.sampleDatabase[genre].length).toBeGreaterThan(0);
      });
    });

    it('should have valid sample data for all samples', () => {
      Object.values(provider.sampleDatabase).forEach(genreSamples => {
        genreSamples.forEach(sample => {
          const validation = validateSampleData(sample);
          expect(validation.isValid).toBe(true);
          if (!validation.isValid) {
            console.log('Invalid sample:', sample, 'Errors:', validation.errors);
          }
        });
      });
    });

    it('should mark all samples as mock data', () => {
      Object.values(provider.sampleDatabase).forEach(genreSamples => {
        genreSamples.forEach(sample => {
          expect(sample.isMock).toBe(true);
        });
      });
    });
  });

  describe('generateMockSamples', () => {
    it('should return samples when no filters provided', () => {
      const samples = provider.generateMockSamples();
      expect(Array.isArray(samples)).toBe(true);
      expect(samples.length).toBeGreaterThan(0);
      expect(samples.length).toBeLessThanOrEqual(12); // default count
    });

    it('should return requested number of samples', () => {
      const samples = provider.generateMockSamples({}, 5);
      expect(samples.length).toBeLessThanOrEqual(5);
    });

    it('should filter by genre correctly', () => {
      const soulSamples = provider.generateMockSamples({ 
        genres: ['Soul'], 
        yearRange: { start: 1950, end: 1995 } 
      });
      
      expect(soulSamples.length).toBeGreaterThan(0);
      soulSamples.forEach(sample => {
        expect(sample.genre).toBe('Soul');
      });
    });

    it('should filter by multiple genres', () => {
      const samples = provider.generateMockSamples({ 
        genres: ['Soul', 'Jazz'], 
        yearRange: { start: 1950, end: 1995 } 
      });
      
      expect(samples.length).toBeGreaterThan(0);
      samples.forEach(sample => {
        expect(['Soul', 'Jazz']).toContain(sample.genre);
      });
    });

    it('should filter by year range correctly', () => {
      const samples = provider.generateMockSamples({ 
        genres: [], 
        yearRange: { start: 1960, end: 1970 } 
      });
      
      samples.forEach(sample => {
        expect(sample.year).toBeGreaterThanOrEqual(1960);
        expect(sample.year).toBeLessThanOrEqual(1970);
      });
    });

    it('should filter by tempo range when provided', () => {
      const samples = provider.generateMockSamples({ 
        genres: [], 
        yearRange: { start: 1950, end: 1995 },
        tempoRange: { min: 100, max: 130 }
      });
      
      samples.forEach(sample => {
        if (sample.tempo) {
          expect(sample.tempo).toBeGreaterThanOrEqual(100);
          expect(sample.tempo).toBeLessThanOrEqual(130);
        }
      });
    });

    it('should filter by duration range when provided', () => {
      const samples = provider.generateMockSamples({ 
        genres: [], 
        yearRange: { start: 1950, end: 1995 },
        durationRange: { min: 150, max: 300 }
      });
      
      samples.forEach(sample => {
        expect(sample.duration).toBeGreaterThanOrEqual(150);
        expect(sample.duration).toBeLessThanOrEqual(300);
      });
    });

    it('should filter by instruments when provided', () => {
      const samples = provider.generateMockSamples({ 
        genres: [], 
        yearRange: { start: 1950, end: 1995 },
        instruments: ['drums']
      });
      
      samples.forEach(sample => {
        expect(sample.instruments).toBeDefined();
        expect(sample.instruments.includes('drums')).toBe(true);
      });
    });

    it('should handle invalid filters gracefully', () => {
      const samples = provider.generateMockSamples({ invalid: 'filter' });
      expect(Array.isArray(samples)).toBe(true);
      // Should fall back to default behavior
    });

    it('should filter Soul samples from 1960-1990', () => {
      const samples = provider.generateMockSamples({ 
        genres: ['Soul'], 
        yearRange: { start: 1960, end: 1990 }
      });
      
      expect(samples.length).toBeGreaterThan(0);
      samples.forEach(sample => {
        expect(sample.genre).toBe('Soul');
        expect(sample.year).toBeGreaterThanOrEqual(1960);
        expect(sample.year).toBeLessThanOrEqual(1990);
      });
    });

    it('should return different results on multiple calls (randomization)', () => {
      const samples1 = provider.generateMockSamples({}, 10);
      const samples2 = provider.generateMockSamples({}, 10);
      
      // Results should be different due to shuffling (with high probability)
      const ids1 = samples1.map(s => s.id).join(',');
      const ids2 = samples2.map(s => s.id).join(',');
      
      // Allow for small chance they could be the same
      if (samples1.length > 3 && samples2.length > 3) {
        expect(ids1).not.toBe(ids2);
      }
    });
  });

  describe('getGenreSpecificSamples', () => {
    it('should return samples for valid genre', () => {
      const soulSamples = provider.getGenreSpecificSamples('Soul');
      expect(Array.isArray(soulSamples)).toBe(true);
      expect(soulSamples.length).toBeGreaterThan(0);
      soulSamples.forEach(sample => {
        expect(sample.genre).toBe('Soul');
      });
    });

    it('should return empty array for invalid genre', () => {
      const samples = provider.getGenreSpecificSamples('InvalidGenre');
      expect(samples).toEqual([]);
    });

    it('should respect count parameter', () => {
      const samples = provider.getGenreSpecificSamples('Jazz', 2);
      expect(samples.length).toBeLessThanOrEqual(2);
    });

    it('should work for all valid genres', () => {
      const validGenres = ['Soul', 'Jazz', 'Funk', 'Blues', 'Afrobeat'];
      validGenres.forEach(genre => {
        const samples = provider.getGenreSpecificSamples(genre);
        expect(samples.length).toBeGreaterThan(0);
        samples.forEach(sample => {
          expect(sample.genre).toBe(genre);
        });
      });
    });
  });

  describe('getYearRangeSamples', () => {
    it('should return samples within valid year range', () => {
      const samples = provider.getYearRangeSamples(1960, 1970);
      expect(Array.isArray(samples)).toBe(true);
      samples.forEach(sample => {
        expect(sample.year).toBeGreaterThanOrEqual(1960);
        expect(sample.year).toBeLessThanOrEqual(1970);
      });
    });

    it('should return empty array for invalid year range', () => {
      const samples = provider.getYearRangeSamples(2000, 2010);
      expect(samples).toEqual([]);
    });

    it('should handle edge cases', () => {
      // Test with years outside valid range
      const samples1 = provider.getYearRangeSamples(1940, 1950);
      expect(samples1).toEqual([]);

      // Test with inverted range
      const samples2 = provider.getYearRangeSamples(1970, 1960);
      expect(samples2).toEqual([]);
    });

    it('should respect count parameter', () => {
      const samples = provider.getYearRangeSamples(1950, 1995, 3);
      expect(samples.length).toBeLessThanOrEqual(3);
    });
  });

  describe('getTempoRangeSamples', () => {
    it('should return samples within valid tempo range', () => {
      const samples = provider.getTempoRangeSamples(100, 150);
      expect(Array.isArray(samples)).toBe(true);
      samples.forEach(sample => {
        if (sample.tempo) {
          expect(sample.tempo).toBeGreaterThanOrEqual(100);
          expect(sample.tempo).toBeLessThanOrEqual(150);
        }
      });
    });

    it('should return empty array for invalid tempo range', () => {
      const samples = provider.getTempoRangeSamples(300, 400);
      expect(samples).toEqual([]);
    });

    it('should handle edge cases', () => {
      // Test with tempos outside valid range
      const samples1 = provider.getTempoRangeSamples(30, 50);
      expect(samples1).toEqual([]);

      // Test with inverted range
      const samples2 = provider.getTempoRangeSamples(150, 100);
      expect(samples2).toEqual([]);
    });

    it('should respect count parameter', () => {
      const samples = provider.getTempoRangeSamples(60, 200, 2);
      expect(samples.length).toBeLessThanOrEqual(2);
    });
  });

  describe('getInstrumentSamples', () => {
    it('should return samples containing specified instruments', () => {
      const samples = provider.getInstrumentSamples(['drums']);
      expect(Array.isArray(samples)).toBe(true);
      samples.forEach(sample => {
        expect(sample.instruments).toBeDefined();
        expect(sample.instruments.includes('drums')).toBe(true);
      });
    });

    it('should return samples containing any of multiple instruments', () => {
      const samples = provider.getInstrumentSamples(['drums', 'bass']);
      expect(Array.isArray(samples)).toBe(true);
      samples.forEach(sample => {
        expect(sample.instruments).toBeDefined();
        const hasAnyInstrument = sample.instruments.some(inst => 
          ['drums', 'bass'].includes(inst)
        );
        expect(hasAnyInstrument).toBe(true);
      });
    });

    it('should return empty array for invalid input', () => {
      const samples1 = provider.getInstrumentSamples([]);
      expect(samples1).toEqual([]);

      const samples2 = provider.getInstrumentSamples('not-an-array');
      expect(samples2).toEqual([]);
    });

    it('should respect count parameter', () => {
      const samples = provider.getInstrumentSamples(['guitar'], 3);
      expect(samples.length).toBeLessThanOrEqual(3);
    });
  });

  describe('Utility Methods', () => {
    it('should return available genres', () => {
      const genres = provider.getAvailableGenres();
      expect(Array.isArray(genres)).toBe(true);
      expect(genres.length).toBeGreaterThan(0);
      expect(genres).toContain('Soul');
      expect(genres).toContain('Jazz');
      expect(genres).toContain('Funk');
      expect(genres).toContain('Blues');
      expect(genres).toContain('Afrobeat');
    });

    it('should return available instruments', () => {
      const instruments = provider.getAvailableInstruments();
      expect(Array.isArray(instruments)).toBe(true);
      expect(instruments.length).toBeGreaterThan(0);
      expect(instruments).toContain('drums');
      expect(instruments).toContain('bass');
      expect(instruments).toContain('guitar');
      // Should be sorted
      const sorted = [...instruments].sort();
      expect(instruments).toEqual(sorted);
    });

    it('should return available year range', () => {
      const yearRange = provider.getAvailableYearRange();
      expect(typeof yearRange).toBe('object');
      expect(typeof yearRange.min).toBe('number');
      expect(typeof yearRange.max).toBe('number');
      expect(yearRange.min).toBeLessThanOrEqual(yearRange.max);
      expect(yearRange.min).toBeGreaterThanOrEqual(1950);
      expect(yearRange.max).toBeLessThanOrEqual(1995);
    });

    it('should return available tempo range', () => {
      const tempoRange = provider.getAvailableTempoRange();
      expect(typeof tempoRange).toBe('object');
      expect(typeof tempoRange.min).toBe('number');
      expect(typeof tempoRange.max).toBe('number');
      expect(tempoRange.min).toBeLessThanOrEqual(tempoRange.max);
      expect(tempoRange.min).toBeGreaterThanOrEqual(60);
      expect(tempoRange.max).toBeLessThanOrEqual(200);
    });

    it('should return total sample count', () => {
      const count = provider.getTotalSampleCount();
      expect(typeof count).toBe('number');
      expect(count).toBeGreaterThan(0);
    });

    it('should return sample count by genre', () => {
      const counts = provider.getSampleCountByGenre();
      expect(typeof counts).toBe('object');
      
      const genres = provider.getAvailableGenres();
      genres.forEach(genre => {
        expect(typeof counts[genre]).toBe('number');
        expect(counts[genre]).toBeGreaterThan(0);
      });
    });
  });

  describe('Data Quality and Consistency', () => {
    it('should have consistent data structure across all samples', () => {
      Object.values(provider.sampleDatabase).forEach(genreSamples => {
        genreSamples.forEach(sample => {
          // Required fields
          expect(typeof sample.id).toBe('string');
          expect(typeof sample.title).toBe('string');
          expect(typeof sample.artist).toBe('string');
          expect(typeof sample.year).toBe('number');
          expect(typeof sample.genre).toBe('string');
          expect(typeof sample.duration).toBe('number');
          expect(typeof sample.youtubeId).toBe('string');
          expect(typeof sample.thumbnailUrl).toBe('string');
          expect(typeof sample.isMock).toBe('boolean');

          // Optional fields
          if (sample.tempo !== undefined) {
            expect(typeof sample.tempo).toBe('number');
          }
          if (sample.instruments !== undefined) {
            expect(Array.isArray(sample.instruments)).toBe(true);
          }
          if (sample.tags !== undefined) {
            expect(Array.isArray(sample.tags)).toBe(true);
          }
        });
      });
    });

    it('should have unique IDs across all samples', () => {
      const allIds = new Set();
      let duplicateFound = false;

      Object.values(provider.sampleDatabase).forEach(genreSamples => {
        genreSamples.forEach(sample => {
          if (allIds.has(sample.id)) {
            duplicateFound = true;
          }
          allIds.add(sample.id);
        });
      });

      expect(duplicateFound).toBe(false);
    });

    it('should have realistic vintage years (1950-1995)', () => {
      Object.values(provider.sampleDatabase).forEach(genreSamples => {
        genreSamples.forEach(sample => {
          expect(sample.year).toBeGreaterThanOrEqual(1950);
          expect(sample.year).toBeLessThanOrEqual(1995);
        });
      });
    });

    it('should have reasonable durations', () => {
      Object.values(provider.sampleDatabase).forEach(genreSamples => {
        genreSamples.forEach(sample => {
          expect(sample.duration).toBeGreaterThan(0);
          expect(sample.duration).toBeLessThan(1200); // 20 minutes max
        });
      });
    });

    it('should have valid tempo values when present', () => {
      Object.values(provider.sampleDatabase).forEach(genreSamples => {
        genreSamples.forEach(sample => {
          if (sample.tempo) {
            expect(sample.tempo).toBeGreaterThanOrEqual(60);
            expect(sample.tempo).toBeLessThanOrEqual(200);
          }
        });
      });
    });

    it('should have proper YouTube ID format', () => {
      Object.values(provider.sampleDatabase).forEach(genreSamples => {
        genreSamples.forEach(sample => {
          expect(sample.youtubeId).toMatch(/^mock-/); // Mock IDs start with 'mock-'
          expect(sample.youtubeId.length).toBeGreaterThan(5);
        });
      });
    });

    it('should have proper thumbnail URL format', () => {
      Object.values(provider.sampleDatabase).forEach(genreSamples => {
        genreSamples.forEach(sample => {
          expect(sample.thumbnailUrl).toMatch(/^https:\/\/img\.youtube\.com\/vi\//);
          expect(sample.thumbnailUrl).toMatch(/\/mqdefault\.jpg$/);
        });
      });
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle empty filter objects', () => {
      const samples = provider.generateMockSamples({});
      expect(Array.isArray(samples)).toBe(true);
    });

    it('should handle null/undefined filters', () => {
      const samples1 = provider.generateMockSamples(null);
      expect(Array.isArray(samples1)).toBe(true);

      const samples2 = provider.generateMockSamples(undefined);
      expect(Array.isArray(samples2)).toBe(true);
    });

    it('should handle zero count requests', () => {
      const samples = provider.generateMockSamples({}, 0);
      expect(samples).toEqual([]);
    });

    it('should handle negative count requests', () => {
      const samples = provider.generateMockSamples({}, -5);
      expect(samples).toEqual([]);
    });

    it('should handle very large count requests', () => {
      const samples = provider.generateMockSamples({}, 1000);
      expect(Array.isArray(samples)).toBe(true);
      expect(samples.length).toBeLessThanOrEqual(provider.getTotalSampleCount());
    });
  });

  describe('Randomization and Shuffling', () => {
    it('should shuffle results consistently', () => {
      // Test that _shuffleArray works correctly
      const testArray = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const shuffled = provider._shuffleArray([...testArray]);
      
      expect(shuffled.length).toBe(testArray.length);
      expect(shuffled.sort()).toEqual(testArray.sort());
    });

    it('should provide different sample orders on repeated calls', () => {
      const samples1 = provider.generateMockSamples({ genres: ['Soul'] }, 4);
      const samples2 = provider.generateMockSamples({ genres: ['Soul'] }, 4);
      
      if (samples1.length >= 3 && samples2.length >= 3) {
        const order1 = samples1.map(s => s.id).join(',');
        const order2 = samples2.map(s => s.id).join(',');
        
        // With high probability, orders should be different
        // (allowing for small chance they could be the same)
        expect(order1 !== order2 || samples1.length < 3).toBe(true);
      }
    });
  });
});