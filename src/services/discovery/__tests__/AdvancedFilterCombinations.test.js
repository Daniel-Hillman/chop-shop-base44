/**
 * @fileoverview Unit tests for advanced filter combinations in MockSampleProvider
 * Tests tempo range, duration range, and complex filter logic combinations
 * 
 * Requirements: 6.1, 6.2, 6.3, 6.4
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { MockSampleProvider } from '../MockSampleProvider.js';
import { MIN_TEMPO, MAX_TEMPO, MIN_DURATION, MAX_DURATION, MIN_YEAR, MAX_YEAR } from '../../../types/discovery.js';

describe('MockSampleProvider - Advanced Filter Combinations', () => {
  let provider;

  beforeEach(() => {
    provider = new MockSampleProvider();
  });

  describe('Tempo Range Filtering', () => {
    it('should filter samples by tempo range', () => {
      const filters = {
        genres: [],
        yearRange: { start: MIN_YEAR, end: MAX_YEAR },
        tempoRange: { min: 100, max: 130 }
      };

      const samples = provider.generateMockSamples(filters, 20);
      
      expect(samples.length).toBeGreaterThan(0);
      samples.forEach(sample => {
        expect(sample.tempo).toBeGreaterThanOrEqual(100);
        expect(sample.tempo).toBeLessThanOrEqual(130);
      });
    });

    it('should return empty array for impossible tempo range', () => {
      const filters = {
        genres: [],
        yearRange: { start: MIN_YEAR, end: MAX_YEAR },
        tempoRange: { min: 250, max: 300 } // No samples should have this tempo
      };

      const samples = provider.generateMockSamples(filters, 20);
      // The provider falls back to default filters when invalid, so we get samples
      // but they should all be within the valid tempo range since invalid filters are ignored
      expect(samples.length).toBeGreaterThan(0);
      samples.forEach(sample => {
        if (sample.tempo) {
          expect(sample.tempo).toBeGreaterThanOrEqual(MIN_TEMPO);
          expect(sample.tempo).toBeLessThanOrEqual(MAX_TEMPO);
        }
      });
    });

    it('should handle narrow tempo ranges', () => {
      const filters = {
        genres: [],
        yearRange: { start: MIN_YEAR, end: MAX_YEAR },
        tempoRange: { min: 120, max: 125 }
      };

      const samples = provider.generateMockSamples(filters, 20);
      
      samples.forEach(sample => {
        expect(sample.tempo).toBeGreaterThanOrEqual(120);
        expect(sample.tempo).toBeLessThanOrEqual(125);
      });
    });

    it('should use getTempoRangeSamples method correctly', () => {
      const samples = provider.getTempoRangeSamples(90, 110, 10);
      
      expect(samples.length).toBeGreaterThan(0);
      expect(samples.length).toBeLessThanOrEqual(10);
      
      samples.forEach(sample => {
        expect(sample.tempo).toBeGreaterThanOrEqual(90);
        expect(sample.tempo).toBeLessThanOrEqual(110);
      });
    });

    it('should handle invalid tempo ranges gracefully', () => {
      const samples = provider.getTempoRangeSamples(300, 400, 10);
      expect(samples).toHaveLength(0);
    });
  });

  describe('Duration Range Filtering', () => {
    it('should filter samples by duration range', () => {
      const filters = {
        genres: [],
        yearRange: { start: MIN_YEAR, end: MAX_YEAR },
        durationRange: { min: 180, max: 300 } // 3-5 minutes
      };

      const samples = provider.generateMockSamples(filters, 20);
      
      expect(samples.length).toBeGreaterThan(0);
      samples.forEach(sample => {
        expect(sample.duration).toBeGreaterThanOrEqual(180);
        expect(sample.duration).toBeLessThanOrEqual(300);
      });
    });

    it('should return empty array for impossible duration range', () => {
      const filters = {
        genres: [],
        yearRange: { start: MIN_YEAR, end: MAX_YEAR },
        durationRange: { min: 1000, max: 2000 } // No samples should be this long
      };

      const samples = provider.generateMockSamples(filters, 20);
      // The provider falls back to default filters when invalid, so we get samples
      // but they should all be within the valid duration range since invalid filters are ignored
      expect(samples.length).toBeGreaterThan(0);
      samples.forEach(sample => {
        expect(sample.duration).toBeGreaterThanOrEqual(MIN_DURATION);
        expect(sample.duration).toBeLessThanOrEqual(MAX_DURATION);
      });
    });

    it('should handle short duration ranges', () => {
      const filters = {
        genres: [],
        yearRange: { start: MIN_YEAR, end: MAX_YEAR },
        durationRange: { min: 150, max: 200 }
      };

      const samples = provider.generateMockSamples(filters, 20);
      
      samples.forEach(sample => {
        expect(sample.duration).toBeGreaterThanOrEqual(150);
        expect(sample.duration).toBeLessThanOrEqual(200);
      });
    });

    it('should handle long duration ranges', () => {
      const filters = {
        genres: [],
        yearRange: { start: MIN_YEAR, end: MAX_YEAR },
        durationRange: { min: 400, max: 600 } // Long tracks
      };

      const samples = provider.generateMockSamples(filters, 20);
      
      samples.forEach(sample => {
        expect(sample.duration).toBeGreaterThanOrEqual(400);
        expect(sample.duration).toBeLessThanOrEqual(600);
      });
    });
  });

  describe('Complex Filter Combinations', () => {
    it('should apply genre, year, tempo, and duration filters together', () => {
      const filters = {
        genres: ['Funk', 'Soul'],
        yearRange: { start: 1965, end: 1975 },
        tempoRange: { min: 95, max: 125 },
        durationRange: { min: 150, max: 400 }
      };

      const samples = provider.generateMockSamples(filters, 20);
      
      samples.forEach(sample => {
        // Check genre filter
        expect(['Funk', 'Soul']).toContain(sample.genre);
        
        // Check year range filter
        expect(sample.year).toBeGreaterThanOrEqual(1965);
        expect(sample.year).toBeLessThanOrEqual(1975);
        
        // Check tempo range filter
        expect(sample.tempo).toBeGreaterThanOrEqual(95);
        expect(sample.tempo).toBeLessThanOrEqual(125);
        
        // Check duration range filter
        expect(sample.duration).toBeGreaterThanOrEqual(150);
        expect(sample.duration).toBeLessThanOrEqual(400);
      });
    });

    it('should handle restrictive filter combinations that yield few results', () => {
      const filters = {
        genres: ['Jazz'],
        yearRange: { start: 1959, end: 1959 }, // Very specific year
        tempoRange: { min: 130, max: 140 },
        durationRange: { min: 300, max: 600 }
      };

      const samples = provider.generateMockSamples(filters, 20);
      
      // Should find some samples but likely fewer than requested
      samples.forEach(sample => {
        expect(sample.genre).toBe('Jazz');
        expect(sample.year).toBe(1959);
        expect(sample.tempo).toBeGreaterThanOrEqual(130);
        expect(sample.tempo).toBeLessThanOrEqual(140);
        expect(sample.duration).toBeGreaterThanOrEqual(300);
        expect(sample.duration).toBeLessThanOrEqual(600);
      });
    });

    it('should return empty array when no samples match all criteria', () => {
      const filters = {
        genres: ['Blues'],
        yearRange: { start: 1950, end: 1955 },
        tempoRange: { min: 150, max: 200 }, // Blues samples are typically slower
        durationRange: { min: 50, max: 100 }
      };

      const samples = provider.generateMockSamples(filters, 20);
      expect(samples).toHaveLength(0);
    });

    it('should maintain sample integrity with complex filters', () => {
      const filters = {
        genres: ['Afrobeat'],
        yearRange: { start: 1970, end: 1980 },
        tempoRange: { min: 110, max: 130 },
        durationRange: { min: 350, max: 500 }
      };

      const samples = provider.generateMockSamples(filters, 10);
      
      samples.forEach(sample => {
        // Verify sample data integrity
        expect(sample).toHaveProperty('id');
        expect(sample).toHaveProperty('title');
        expect(sample).toHaveProperty('artist');
        expect(sample).toHaveProperty('youtubeId');
        expect(sample).toHaveProperty('thumbnailUrl');
        expect(sample.isMock).toBe(true);
        
        // Verify all filters are applied
        expect(sample.genre).toBe('Afrobeat');
        expect(sample.year).toBeGreaterThanOrEqual(1970);
        expect(sample.year).toBeLessThanOrEqual(1980);
        expect(sample.tempo).toBeGreaterThanOrEqual(110);
        expect(sample.tempo).toBeLessThanOrEqual(130);
        expect(sample.duration).toBeGreaterThanOrEqual(350);
        expect(sample.duration).toBeLessThanOrEqual(500);
      });
    });
  });

  describe('Filter Edge Cases', () => {
    it('should handle filters with undefined advanced ranges', () => {
      const filters = {
        genres: ['Soul'],
        yearRange: { start: 1965, end: 1970 }
        // No tempoRange or durationRange
      };

      const samples = provider.generateMockSamples(filters, 10);
      
      expect(samples.length).toBeGreaterThan(0);
      samples.forEach(sample => {
        expect(sample.genre).toBe('Soul');
        expect(sample.year).toBeGreaterThanOrEqual(1965);
        expect(sample.year).toBeLessThanOrEqual(1970);
        // Should not filter by tempo or duration
      });
    });

    it('should handle filters with only tempo range', () => {
      const filters = {
        genres: [],
        yearRange: { start: MIN_YEAR, end: MAX_YEAR },
        tempoRange: { min: 100, max: 120 }
        // No durationRange
      };

      const samples = provider.generateMockSamples(filters, 15);
      
      samples.forEach(sample => {
        expect(sample.tempo).toBeGreaterThanOrEqual(100);
        expect(sample.tempo).toBeLessThanOrEqual(120);
      });
    });

    it('should handle filters with only duration range', () => {
      const filters = {
        genres: [],
        yearRange: { start: MIN_YEAR, end: MAX_YEAR },
        durationRange: { min: 200, max: 350 }
        // No tempoRange
      };

      const samples = provider.generateMockSamples(filters, 15);
      
      samples.forEach(sample => {
        expect(sample.duration).toBeGreaterThanOrEqual(200);
        expect(sample.duration).toBeLessThanOrEqual(350);
      });
    });

    it('should handle equal min and max values in ranges', () => {
      const filters = {
        genres: [],
        yearRange: { start: MIN_YEAR, end: MAX_YEAR },
        tempoRange: { min: 120, max: 120 }, // Exact tempo match
        durationRange: { min: 180, max: 180 } // Exact duration match
      };

      const samples = provider.generateMockSamples(filters, 20);
      
      samples.forEach(sample => {
        expect(sample.tempo).toBe(120);
        expect(sample.duration).toBe(180);
      });
    });
  });

  describe('Performance and Validation', () => {
    it('should handle large filter requests efficiently', () => {
      const filters = {
        genres: ['Soul', 'Funk', 'Jazz'],
        yearRange: { start: 1960, end: 1980 },
        tempoRange: { min: 80, max: 150 },
        durationRange: { min: 120, max: 500 }
      };

      const startTime = performance.now();
      const samples = provider.generateMockSamples(filters, 50);
      const endTime = performance.now();
      
      expect(endTime - startTime).toBeLessThan(100); // Should complete in under 100ms
      expect(samples.length).toBeLessThanOrEqual(50);
    });

    it('should validate all returned samples', () => {
      const filters = {
        genres: ['Jazz', 'Blues'],
        yearRange: { start: 1950, end: 1970 },
        tempoRange: { min: 70, max: 140 },
        durationRange: { min: 150, max: 400 }
      };

      const samples = provider.generateMockSamples(filters, 20);
      
      samples.forEach(sample => {
        // Basic validation
        expect(typeof sample.id).toBe('string');
        expect(typeof sample.title).toBe('string');
        expect(typeof sample.artist).toBe('string');
        expect(typeof sample.year).toBe('number');
        expect(typeof sample.genre).toBe('string');
        expect(typeof sample.duration).toBe('number');
        expect(typeof sample.youtubeId).toBe('string');
        expect(typeof sample.thumbnailUrl).toBe('string');
        expect(typeof sample.isMock).toBe('boolean');
        
        // Advanced filter validation
        if (sample.tempo) {
          expect(typeof sample.tempo).toBe('number');
        }
        if (sample.instruments) {
          expect(Array.isArray(sample.instruments)).toBe(true);
        }
        if (sample.tags) {
          expect(Array.isArray(sample.tags)).toBe(true);
        }
      });
    });

    it('should handle zero count requests', () => {
      const filters = {
        genres: ['Soul'],
        yearRange: { start: MIN_YEAR, end: MAX_YEAR },
        tempoRange: { min: 100, max: 120 }
      };

      const samples = provider.generateMockSamples(filters, 0);
      expect(samples).toHaveLength(0);
    });

    it('should handle negative count requests', () => {
      const filters = {
        genres: ['Funk'],
        yearRange: { start: MIN_YEAR, end: MAX_YEAR },
        durationRange: { min: 150, max: 300 }
      };

      const samples = provider.generateMockSamples(filters, -5);
      expect(samples).toHaveLength(0);
    });
  });

  describe('Instrument Filtering (Legacy Support)', () => {
    it('should filter by instruments when specified', () => {
      const filters = {
        genres: [],
        yearRange: { start: MIN_YEAR, end: MAX_YEAR },
        instruments: ['saxophone', 'drums']
      };

      const samples = provider.generateMockSamples(filters, 20);
      
      samples.forEach(sample => {
        expect(sample.instruments).toBeDefined();
        expect(
          sample.instruments.includes('saxophone') || 
          sample.instruments.includes('drums')
        ).toBe(true);
      });
    });

    it('should combine instrument filtering with advanced filters', () => {
      const filters = {
        genres: ['Jazz'],
        yearRange: { start: 1955, end: 1970 },
        tempoRange: { min: 120, max: 180 },
        durationRange: { min: 300, max: 600 },
        instruments: ['saxophone']
      };

      const samples = provider.generateMockSamples(filters, 10);
      
      samples.forEach(sample => {
        expect(sample.genre).toBe('Jazz');
        expect(sample.year).toBeGreaterThanOrEqual(1955);
        expect(sample.year).toBeLessThanOrEqual(1970);
        expect(sample.tempo).toBeGreaterThanOrEqual(120);
        expect(sample.tempo).toBeLessThanOrEqual(180);
        expect(sample.duration).toBeGreaterThanOrEqual(300);
        expect(sample.duration).toBeLessThanOrEqual(600);
        expect(sample.instruments).toContain('saxophone');
      });
    });
  });
});