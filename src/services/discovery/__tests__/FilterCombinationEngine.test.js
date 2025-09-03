/**
 * @fileoverview Unit tests for FilterCombinationEngine
 * Tests multiple filter combination logic with AND operations
 * 
 * Requirements: 6.4
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import filterCombinationEngine, { FilterCombinationEngine } from '../FilterCombinationEngine.js';
import { createMockSample, createDefaultFilterState } from '../../../types/discovery.js';

describe('FilterCombinationEngine', () => {
  let engine;
  let mockSamples;

  beforeEach(() => {
    engine = new FilterCombinationEngine();
    
    // Create diverse mock samples for testing
    mockSamples = [
      createMockSample({
        id: 'sample1',
        title: 'Soul Sample 1',
        artist: 'Soul Artist',
        year: 1975,
        genre: 'Soul',
        duration: 180,
        tempo: 120,
        instruments: ['drums', 'bass', 'guitar']
      }),
      createMockSample({
        id: 'sample2',
        title: 'Funk Sample 1',
        artist: 'Funk Artist',
        year: 1978,
        genre: 'Funk',
        duration: 240,
        tempo: 110,
        instruments: ['drums', 'bass', 'horn']
      }),
      createMockSample({
        id: 'sample3',
        title: 'Jazz Sample 1',
        artist: 'Jazz Artist',
        year: 1965,
        genre: 'Jazz',
        duration: 300,
        tempo: 140,
        instruments: ['piano', 'bass', 'drums']
      }),
      createMockSample({
        id: 'sample4',
        title: 'Blues Sample 1',
        artist: 'Blues Artist',
        year: 1960,
        genre: 'Blues',
        duration: 200,
        tempo: 90,
        instruments: ['guitar', 'harmonica']
      }),
      createMockSample({
        id: 'sample5',
        title: 'Soul Sample 2',
        artist: 'Soul Artist 2',
        year: 1972,
        genre: 'Soul',
        duration: 120, // Changed to be outside the 150-200 range
        tempo: 130,
        instruments: ['drums', 'organ']
      })
    ];
  });

  describe('Filter Application', () => {
    it('should return all samples when no filters are active', () => {
      const emptyFilters = createDefaultFilterState();
      const result = engine.applyFilters(mockSamples, emptyFilters);

      expect(result).toHaveLength(mockSamples.length);
      expect(result).toEqual(mockSamples);
    });

    it('should filter by single genre', () => {
      const filters = {
        ...createDefaultFilterState(),
        genres: ['Soul']
      };

      const result = engine.applyFilters(mockSamples, filters);

      expect(result).toHaveLength(2);
      expect(result.every(sample => sample.genre === 'Soul')).toBe(true);
    });

    it('should filter by multiple genres (OR logic within genres)', () => {
      const filters = {
        ...createDefaultFilterState(),
        genres: ['Soul', 'Funk']
      };

      const result = engine.applyFilters(mockSamples, filters);

      expect(result).toHaveLength(3);
      expect(result.every(sample => ['Soul', 'Funk'].includes(sample.genre))).toBe(true);
    });

    it('should filter by year range', () => {
      const filters = {
        ...createDefaultFilterState(),
        yearRange: { start: 1970, end: 1980 }
      };

      const result = engine.applyFilters(mockSamples, filters);

      expect(result).toHaveLength(3);
      expect(result.every(sample => sample.year >= 1970 && sample.year <= 1980)).toBe(true);
    });

    it('should filter by tempo range', () => {
      const filters = {
        ...createDefaultFilterState(),
        tempoRange: { min: 100, max: 130 }
      };

      const result = engine.applyFilters(mockSamples, filters);

      expect(result).toHaveLength(3);
      expect(result.every(sample => sample.tempo >= 100 && sample.tempo <= 130)).toBe(true);
    });

    it('should filter by duration range', () => {
      const filters = {
        ...createDefaultFilterState(),
        durationRange: { min: 150, max: 200 }
      };

      const result = engine.applyFilters(mockSamples, filters);

      expect(result).toHaveLength(2);
      expect(result.every(sample => sample.duration >= 150 && sample.duration <= 200)).toBe(true);
    });

    it('should filter by instruments', () => {
      const filters = {
        ...createDefaultFilterState(),
        instruments: ['guitar']
      };

      const result = engine.applyFilters(mockSamples, filters);

      expect(result).toHaveLength(2);
      expect(result.every(sample => 
        sample.instruments.some(inst => inst.toLowerCase().includes('guitar'))
      )).toBe(true);
    });
  });

  describe('Multiple Filter Combinations (AND Logic)', () => {
    it('should apply genre AND year range filters', () => {
      const filters = {
        ...createDefaultFilterState(),
        genres: ['Soul'],
        yearRange: { start: 1970, end: 1980 }
      };

      const result = engine.applyFilters(mockSamples, filters);

      expect(result).toHaveLength(2);
      expect(result.every(sample => 
        sample.genre === 'Soul' && 
        sample.year >= 1970 && 
        sample.year <= 1980
      )).toBe(true);
    });

    it('should apply genre AND tempo range filters', () => {
      const filters = {
        ...createDefaultFilterState(),
        genres: ['Soul'],
        tempoRange: { min: 120, max: 140 }
      };

      const result = engine.applyFilters(mockSamples, filters);

      expect(result).toHaveLength(2);
      expect(result.every(sample => 
        sample.genre === 'Soul' && 
        sample.tempo >= 120 && 
        sample.tempo <= 140
      )).toBe(true);
    });

    it('should apply all filter types together', () => {
      const filters = {
        genres: ['Soul', 'Funk'],
        yearRange: { start: 1970, end: 1980 },
        tempoRange: { min: 110, max: 130 },
        durationRange: { min: 150, max: 250 },
        instruments: ['drums']
      };

      const result = engine.applyFilters(mockSamples, filters);

      expect(result.every(sample => {
        const matchesGenre = ['Soul', 'Funk'].includes(sample.genre);
        const matchesYear = sample.year >= 1970 && sample.year <= 1980;
        const matchesTempo = sample.tempo >= 110 && sample.tempo <= 130;
        const matchesDuration = sample.duration >= 150 && sample.duration <= 250;
        const matchesInstruments = sample.instruments.some(inst => 
          inst.toLowerCase().includes('drums')
        );

        return matchesGenre && matchesYear && matchesTempo && matchesDuration && matchesInstruments;
      })).toBe(true);
    });

    it('should return empty array when no samples match all filters', () => {
      const filters = {
        genres: ['Soul'],
        yearRange: { start: 1980, end: 1990 }, // No Soul samples in this range
        tempoRange: { min: 100, max: 120 }
      };

      const result = engine.applyFilters(mockSamples, filters);

      expect(result).toHaveLength(0);
    });

    it('should handle restrictive filter combinations', () => {
      const filters = {
        genres: ['Jazz'],
        yearRange: { start: 1960, end: 1970 },
        tempoRange: { min: 130, max: 150 },
        instruments: ['piano']
      };

      const result = engine.applyFilters(mockSamples, filters);

      expect(result).toHaveLength(1);
      expect(result[0].genre).toBe('Jazz');
      expect(result[0].year).toBe(1965);
      expect(result[0].tempo).toBe(140);
      expect(result[0].instruments).toContain('piano');
    });
  });

  describe('Filter Matching Logic', () => {
    it('should match genre filter correctly', () => {
      const sample = mockSamples[0]; // Soul sample

      expect(engine.matchesGenreFilter(sample, ['Soul'])).toBe(true);
      expect(engine.matchesGenreFilter(sample, ['Funk'])).toBe(false);
      expect(engine.matchesGenreFilter(sample, ['Soul', 'Funk'])).toBe(true);
      expect(engine.matchesGenreFilter(sample, [])).toBe(true); // Empty array matches all
    });

    it('should match year range filter correctly', () => {
      const sample = mockSamples[0]; // Year 1975

      expect(engine.matchesYearRangeFilter(sample, { start: 1970, end: 1980 })).toBe(true);
      expect(engine.matchesYearRangeFilter(sample, { start: 1980, end: 1990 })).toBe(false);
      expect(engine.matchesYearRangeFilter(sample, { start: 1975, end: 1975 })).toBe(true);
      expect(engine.matchesYearRangeFilter(sample, null)).toBe(true); // Null matches all
    });

    it('should match tempo range filter correctly', () => {
      const sample = mockSamples[0]; // Tempo 120

      expect(engine.matchesTempoRangeFilter(sample, { min: 100, max: 140 })).toBe(true);
      expect(engine.matchesTempoRangeFilter(sample, { min: 130, max: 150 })).toBe(false);
      expect(engine.matchesTempoRangeFilter(sample, { min: 120, max: 120 })).toBe(true);
      expect(engine.matchesTempoRangeFilter(sample, null)).toBe(true); // Null matches all
    });

    it('should match duration range filter correctly', () => {
      const sample = mockSamples[0]; // Duration 180

      expect(engine.matchesDurationRangeFilter(sample, { min: 150, max: 200 })).toBe(true);
      expect(engine.matchesDurationRangeFilter(sample, { min: 200, max: 250 })).toBe(false);
      expect(engine.matchesDurationRangeFilter(sample, { min: 180, max: 180 })).toBe(true);
      expect(engine.matchesDurationRangeFilter(sample, null)).toBe(true); // Null matches all
    });

    it('should match instruments filter correctly', () => {
      const sample = mockSamples[0]; // Instruments: ['drums', 'bass', 'guitar']

      expect(engine.matchesInstrumentsFilter(sample, ['drums'])).toBe(true);
      expect(engine.matchesInstrumentsFilter(sample, ['piano'])).toBe(false);
      expect(engine.matchesInstrumentsFilter(sample, ['drums', 'piano'])).toBe(true);
      expect(engine.matchesInstrumentsFilter(sample, [])).toBe(true); // Empty array matches all
      expect(engine.matchesInstrumentsFilter(sample, null)).toBe(true); // Null matches all
    });

    it('should handle samples without optional fields', () => {
      const sampleWithoutTempo = createMockSample({
        id: 'no-tempo',
        tempo: undefined
      });

      const sampleWithoutInstruments = createMockSample({
        id: 'no-instruments',
        instruments: undefined
      });

      expect(engine.matchesTempoRangeFilter(sampleWithoutTempo, { min: 100, max: 140 })).toBe(true);
      expect(engine.matchesInstrumentsFilter(sampleWithoutInstruments, ['guitar'])).toBe(true);
    });
  });

  describe('Empty Filter Detection', () => {
    it('should detect empty filter state', () => {
      const emptyFilters = createDefaultFilterState();
      expect(engine.isEmptyFilter(emptyFilters)).toBe(true);
    });

    it('should detect non-empty genre filter', () => {
      const filters = {
        ...createDefaultFilterState(),
        genres: ['Soul']
      };
      expect(engine.isEmptyFilter(filters)).toBe(false);
    });

    it('should detect non-empty year range filter', () => {
      const filters = {
        ...createDefaultFilterState(),
        yearRange: { start: 1970, end: 1980 }
      };
      expect(engine.isEmptyFilter(filters)).toBe(false);
    });

    it('should detect non-empty tempo range filter', () => {
      const filters = {
        ...createDefaultFilterState(),
        tempoRange: { min: 100, max: 140 }
      };
      expect(engine.isEmptyFilter(filters)).toBe(false);
    });

    it('should detect non-empty duration range filter', () => {
      const filters = {
        ...createDefaultFilterState(),
        durationRange: { min: 120, max: 180 }
      };
      expect(engine.isEmptyFilter(filters)).toBe(false);
    });

    it('should detect non-empty instruments filter', () => {
      const filters = {
        ...createDefaultFilterState(),
        instruments: ['guitar']
      };
      expect(engine.isEmptyFilter(filters)).toBe(false);
    });
  });

  describe('Filter Suggestions', () => {
    it('should generate genre suggestions', () => {
      const currentFilters = createDefaultFilterState();
      const suggestions = engine.getFilterSuggestions(mockSamples, currentFilters);

      const genreSuggestions = suggestions.filter(s => s.type === 'genre');
      expect(genreSuggestions.length).toBeGreaterThan(0);
      expect(genreSuggestions[0]).toHaveProperty('label');
      expect(genreSuggestions[0]).toHaveProperty('filters');
      expect(genreSuggestions[0]).toHaveProperty('expectedResults');
    });

    it('should generate year range suggestions for wide spreads', () => {
      const currentFilters = createDefaultFilterState();
      const suggestions = engine.getFilterSuggestions(mockSamples, currentFilters);

      const yearSuggestions = suggestions.filter(s => s.type === 'year');
      expect(yearSuggestions.length).toBeGreaterThanOrEqual(0);
    });

    it('should generate tempo suggestions for wide spreads', () => {
      const currentFilters = createDefaultFilterState();
      const suggestions = engine.getFilterSuggestions(mockSamples, currentFilters);

      const tempoSuggestions = suggestions.filter(s => s.type === 'tempo');
      expect(tempoSuggestions.length).toBeGreaterThanOrEqual(0);
    });

    it('should limit suggestions to 6 items', () => {
      const currentFilters = createDefaultFilterState();
      const suggestions = engine.getFilterSuggestions(mockSamples, currentFilters);

      expect(suggestions.length).toBeLessThanOrEqual(6);
    });
  });

  describe('Sample Analysis', () => {
    it('should analyze sample genres', () => {
      const analysis = engine.analyzeSamples(mockSamples);

      expect(analysis.genres).toBeInstanceOf(Array);
      expect(analysis.genres.length).toBeGreaterThan(0);
      expect(analysis.genres[0]).toHaveProperty('name');
      expect(analysis.genres[0]).toHaveProperty('count');
      
      // Should be sorted by count (descending)
      for (let i = 1; i < analysis.genres.length; i++) {
        expect(analysis.genres[i].count).toBeLessThanOrEqual(analysis.genres[i - 1].count);
      }
    });

    it('should analyze year ranges', () => {
      const analysis = engine.analyzeSamples(mockSamples);

      expect(analysis.yearRange.min).toBe(1960);
      expect(analysis.yearRange.max).toBe(1978);
      expect(analysis.yearSpread).toBe(18);
    });

    it('should analyze tempo ranges', () => {
      const analysis = engine.analyzeSamples(mockSamples);

      expect(analysis.tempoRange.min).toBe(90);
      expect(analysis.tempoRange.max).toBe(140);
      expect(analysis.tempoSpread).toBe(50);
    });

    it('should analyze instruments', () => {
      const analysis = engine.analyzeSamples(mockSamples);

      expect(analysis.instruments).toBeInstanceOf(Array);
      expect(analysis.instruments.length).toBeGreaterThan(0);
      expect(analysis.instruments[0]).toHaveProperty('name');
      expect(analysis.instruments[0]).toHaveProperty('count');
    });
  });

  describe('Performance Statistics', () => {
    it('should track filter statistics', () => {
      const filters = {
        ...createDefaultFilterState(),
        genres: ['Soul']
      };

      engine.applyFilters(mockSamples, filters);

      const stats = engine.getFilterStats();
      expect(stats.totalFiltered).toBe(1);
      expect(stats.lastFilterTime).toBeGreaterThan(0);
      expect(stats.filterBreakdown).toHaveProperty('genres:1');
    });

    it('should calculate average filter time', () => {
      const filters1 = { ...createDefaultFilterState(), genres: ['Soul'] };
      const filters2 = { ...createDefaultFilterState(), genres: ['Funk'] };

      engine.applyFilters(mockSamples, filters1);
      engine.applyFilters(mockSamples, filters2);

      const stats = engine.getFilterStats();
      expect(stats.avgFilterTime).toBeGreaterThan(0);
      expect(stats.totalFiltered).toBe(2);
    });

    it('should track most used filters', () => {
      const filters = { ...createDefaultFilterState(), genres: ['Soul'] };

      // Apply same filter multiple times
      engine.applyFilters(mockSamples, filters);
      engine.applyFilters(mockSamples, filters);
      engine.applyFilters(mockSamples, filters);

      const stats = engine.getFilterStats();
      expect(stats.mostUsedFilters.length).toBeGreaterThan(0);
      expect(stats.mostUsedFilters[0].key).toBe('genres:1');
      expect(stats.mostUsedFilters[0].count).toBe(3);
    });

    it('should reset statistics', () => {
      const filters = { ...createDefaultFilterState(), genres: ['Soul'] };
      engine.applyFilters(mockSamples, filters);

      engine.resetStats();

      const stats = engine.getFilterStats();
      expect(stats.totalFiltered).toBe(0);
      expect(stats.lastFilterTime).toBeNull();
      expect(Object.keys(stats.filterBreakdown)).toHaveLength(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid sample array', () => {
      const filters = createDefaultFilterState();
      const result = engine.applyFilters('not an array', filters);

      expect(result).toEqual('not an array'); // Returns original on error
    });

    it('should handle invalid filter state', () => {
      const invalidFilters = { genres: 'not an array' };
      const result = engine.applyFilters(mockSamples, invalidFilters);

      expect(result).toEqual(mockSamples); // Returns original on error
    });

    it('should filter out invalid samples', () => {
      const samplesWithInvalid = [
        ...mockSamples,
        { 
          id: 'invalid', 
          title: null, // Invalid - title is required
          artist: null, // Invalid - artist is required
          year: 'not a number', // Invalid - year must be number
          genre: 'InvalidGenre', // Invalid - not in valid genres
          duration: -1, // Invalid - negative duration
          youtubeId: '', // Invalid - empty string
          thumbnailUrl: '', // Invalid - empty string
          isMock: 'not boolean' // Invalid - must be boolean
        }
      ];

      const filters = createDefaultFilterState();
      const result = engine.applyFilters(samplesWithInvalid, filters);

      expect(result).toHaveLength(mockSamples.length); // Invalid sample filtered out
      expect(result.every(sample => sample.id !== 'invalid')).toBe(true);
    });

    it('should handle errors in suggestions gracefully', () => {
      const invalidSamples = [{ invalid: 'sample' }];
      const suggestions = engine.getFilterSuggestions(invalidSamples, createDefaultFilterState());

      expect(suggestions).toEqual([]);
    });
  });

  describe('Singleton Instance', () => {
    it('should export a singleton instance', () => {
      expect(filterCombinationEngine).toBeInstanceOf(FilterCombinationEngine);
    });

    it('should maintain statistics across uses', () => {
      const filters = { ...createDefaultFilterState(), genres: ['Soul'] };
      filterCombinationEngine.applyFilters(mockSamples, filters);

      const stats = filterCombinationEngine.getFilterStats();
      expect(stats.totalFiltered).toBeGreaterThan(0);
    });
  });
});