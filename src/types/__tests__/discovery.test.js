/**
 * @fileoverview Unit tests for discovery data models and validation functions
 */

import { describe, it, expect } from 'vitest';
import {
  validateSampleData,
  validateFilterState,
  validateYearRange,
  validateTempoRange,
  validateDurationRange,
  validateDiscoveryState,
  isSampleData,
  isFilterState,
  isDiscoveryState,
  createDefaultFilterState,
  createDefaultDiscoveryState,
  VALID_GENRES,
  MIN_YEAR,
  MAX_YEAR,
  MIN_DURATION,
  MAX_DURATION,
  MIN_TEMPO,
  MAX_TEMPO
} from '../discovery.js';

describe('Discovery Data Models - SampleData Validation', () => {
  const validSampleData = {
    id: 'sample-123',
    title: 'Funky Groove',
    artist: 'James Brown',
    year: 1970,
    genre: 'Funk',
    duration: 180,
    youtubeId: 'abc123def456',
    thumbnailUrl: 'https://example.com/thumb.jpg',
    isMock: false
  };

  it('should validate a complete valid SampleData object', () => {
    const result = validateSampleData(validSampleData);
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should validate SampleData with optional fields', () => {
    const sampleWithOptionals = {
      ...validSampleData,
      tempo: 120,
      instruments: ['drums', 'bass', 'guitar'],
      tags: ['vintage', 'groove', 'classic']
    };

    const result = validateSampleData(sampleWithOptionals);
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should reject null or undefined input', () => {
    expect(validateSampleData(null).isValid).toBe(false);
    expect(validateSampleData(undefined).isValid).toBe(false);
    expect(validateSampleData('not an object').isValid).toBe(false);
  });

  it('should reject missing required fields', () => {
    const requiredFields = ['id', 'title', 'artist', 'year', 'genre', 'duration', 'youtubeId', 'thumbnailUrl', 'isMock'];
    
    requiredFields.forEach(field => {
      const invalidSample = { ...validSampleData };
      delete invalidSample[field];
      
      const result = validateSampleData(invalidSample);
      expect(result.isValid).toBe(false);
      
      // Check for field-specific error messages
      const fieldErrorMap = {
        'id': 'sample id',
        'title': 'sample title', 
        'artist': 'sample artist',
        'year': 'sample year',
        'genre': 'sample genre',
        'duration': 'sample duration',
        'youtubeId': 'youtube id',
        'thumbnailUrl': 'thumbnail url',
        'isMock': 'ismock'
      };
      
      const expectedErrorText = fieldErrorMap[field] || field.toLowerCase();
      const hasExpectedError = result.errors.some(error => 
        error.toLowerCase().includes(expectedErrorText)
      );
      
      expect(hasExpectedError).toBe(true);
    });
  });

  it('should reject invalid year values', () => {
    const testCases = [
      { year: 1949, shouldBeValid: false }, // Too early
      { year: 1950, shouldBeValid: true },  // Min valid
      { year: 1995, shouldBeValid: true },  // Max valid
      { year: 1996, shouldBeValid: false }, // Too late
      { year: 'not a number', shouldBeValid: false },
      { year: null, shouldBeValid: false }
    ];

    testCases.forEach(({ year, shouldBeValid }) => {
      const sample = { ...validSampleData, year };
      const result = validateSampleData(sample);
      expect(result.isValid).toBe(shouldBeValid);
    });
  });

  it('should reject invalid genre values', () => {
    const invalidGenres = ['InvalidGenre', '', null, undefined, 123];
    
    invalidGenres.forEach(genre => {
      const sample = { ...validSampleData, genre };
      const result = validateSampleData(sample);
      expect(result.isValid).toBe(false);
    });

    // Test valid genres
    VALID_GENRES.forEach(genre => {
      const sample = { ...validSampleData, genre };
      const result = validateSampleData(sample);
      expect(result.isValid).toBe(true);
    });
  });

  it('should reject invalid duration values', () => {
    const testCases = [
      { duration: 0, shouldBeValid: false },    // Too short
      { duration: 1, shouldBeValid: true },     // Min valid
      { duration: 600, shouldBeValid: true },   // Max valid
      { duration: 601, shouldBeValid: false },  // Too long
      { duration: 'not a number', shouldBeValid: false },
      { duration: null, shouldBeValid: false }
    ];

    testCases.forEach(({ duration, shouldBeValid }) => {
      const sample = { ...validSampleData, duration };
      const result = validateSampleData(sample);
      expect(result.isValid).toBe(shouldBeValid);
    });
  });

  it('should validate optional tempo field', () => {
    const testCases = [
      { tempo: 59, shouldBeValid: false },   // Too low
      { tempo: 60, shouldBeValid: true },    // Min valid
      { tempo: 200, shouldBeValid: true },   // Max valid
      { tempo: 201, shouldBeValid: false },  // Too high
      { tempo: 'not a number', shouldBeValid: false }
    ];

    testCases.forEach(({ tempo, shouldBeValid }) => {
      const sample = { ...validSampleData, tempo };
      const result = validateSampleData(sample);
      expect(result.isValid).toBe(shouldBeValid);
    });
  });

  it('should validate optional instruments array', () => {
    const validSample = { ...validSampleData, instruments: ['drums', 'bass'] };
    expect(validateSampleData(validSample).isValid).toBe(true);

    const invalidCases = [
      { instruments: 'not an array' },
      { instruments: [123, 'bass'] },
      { instruments: ['', 'bass'] },
      { instruments: [null, 'bass'] }
    ];

    invalidCases.forEach(testCase => {
      const sample = { ...validSampleData, ...testCase };
      const result = validateSampleData(sample);
      expect(result.isValid).toBe(false);
    });
  });

  it('should validate optional tags array', () => {
    const validSample = { ...validSampleData, tags: ['vintage', 'groove'] };
    expect(validateSampleData(validSample).isValid).toBe(true);

    const invalidCases = [
      { tags: 'not an array' },
      { tags: [123, 'groove'] },
      { tags: ['', 'groove'] },
      { tags: [null, 'groove'] }
    ];

    invalidCases.forEach(testCase => {
      const sample = { ...validSampleData, ...testCase };
      const result = validateSampleData(sample);
      expect(result.isValid).toBe(false);
    });
  });
});

describe('Discovery Data Models - FilterState Validation', () => {
  const validFilterState = {
    genres: ['Soul', 'Jazz'],
    yearRange: {
      start: 1960,
      end: 1980
    }
  };

  it('should validate a complete valid FilterState object', () => {
    const result = validateFilterState(validFilterState);
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should validate FilterState with optional fields', () => {
    const filterWithOptionals = {
      ...validFilterState,
      tempoRange: { min: 80, max: 140 },
      durationRange: { min: 60, max: 300 },
      instruments: ['drums', 'bass']
    };

    const result = validateFilterState(filterWithOptionals);
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should reject null or undefined input', () => {
    expect(validateFilterState(null).isValid).toBe(false);
    expect(validateFilterState(undefined).isValid).toBe(false);
    expect(validateFilterState('not an object').isValid).toBe(false);
  });

  it('should reject invalid genres array', () => {
    const invalidCases = [
      { genres: 'not an array' },
      { genres: ['InvalidGenre'] },
      { genres: [123] },
      { genres: [null] }
    ];

    invalidCases.forEach(testCase => {
      const filter = { ...validFilterState, ...testCase };
      const result = validateFilterState(filter);
      expect(result.isValid).toBe(false);
    });
  });

  it('should validate year range', () => {
    const invalidYearRanges = [
      { yearRange: null },
      { yearRange: { start: 1949, end: 1980 } }, // Start too early
      { yearRange: { start: 1960, end: 1996 } }, // End too late
      { yearRange: { start: 1980, end: 1960 } }  // Start > End
    ];

    invalidYearRanges.forEach(testCase => {
      const filter = { ...validFilterState, ...testCase };
      const result = validateFilterState(filter);
      expect(result.isValid).toBe(false);
    });
  });
});

describe('Discovery Data Models - Range Validations', () => {
  describe('YearRange validation', () => {
    it('should validate valid year ranges', () => {
      const validRanges = [
        { start: 1950, end: 1995 },
        { start: 1960, end: 1970 },
        { start: 1980, end: 1980 } // Same year
      ];

      validRanges.forEach(range => {
        const result = validateYearRange(range);
        expect(result.isValid).toBe(true);
      });
    });

    it('should reject invalid year ranges', () => {
      const invalidRanges = [
        null,
        { start: 1949, end: 1980 },
        { start: 1960, end: 1996 },
        { start: 1980, end: 1970 },
        { start: 'not a number', end: 1980 }
      ];

      invalidRanges.forEach(range => {
        const result = validateYearRange(range);
        expect(result.isValid).toBe(false);
      });
    });
  });

  describe('TempoRange validation', () => {
    it('should validate valid tempo ranges', () => {
      const validRanges = [
        { min: 60, max: 200 },
        { min: 80, max: 120 },
        { min: 100, max: 100 } // Same tempo
      ];

      validRanges.forEach(range => {
        const result = validateTempoRange(range);
        expect(result.isValid).toBe(true);
      });
    });

    it('should reject invalid tempo ranges', () => {
      const invalidRanges = [
        null,
        { min: 59, max: 120 },
        { min: 80, max: 201 },
        { min: 120, max: 80 },
        { min: 'not a number', max: 120 }
      ];

      invalidRanges.forEach(range => {
        const result = validateTempoRange(range);
        expect(result.isValid).toBe(false);
      });
    });
  });

  describe('DurationRange validation', () => {
    it('should validate valid duration ranges', () => {
      const validRanges = [
        { min: 1, max: 600 },
        { min: 30, max: 180 },
        { min: 120, max: 120 } // Same duration
      ];

      validRanges.forEach(range => {
        const result = validateDurationRange(range);
        expect(result.isValid).toBe(true);
      });
    });

    it('should reject invalid duration ranges', () => {
      const invalidRanges = [
        null,
        { min: 0, max: 180 },
        { min: 30, max: 601 },
        { min: 180, max: 30 },
        { min: 'not a number', max: 180 }
      ];

      invalidRanges.forEach(range => {
        const result = validateDurationRange(range);
        expect(result.isValid).toBe(false);
      });
    });
  });
});

describe('Discovery Data Models - DiscoveryState Validation', () => {
  const validSample = {
    id: 'sample-123',
    title: 'Test Sample',
    artist: 'Test Artist',
    year: 1970,
    genre: 'Soul',
    duration: 180,
    youtubeId: 'abc123',
    thumbnailUrl: 'https://example.com/thumb.jpg',
    isMock: false
  };

  const validDiscoveryState = {
    samples: [validSample],
    currentSample: validSample,
    filters: {
      genres: ['Soul'],
      yearRange: { start: 1960, end: 1980 }
    },
    favorites: [validSample],
    history: [validSample],
    isLoading: false,
    error: null,
    isOnline: true,
    useMockData: false
  };

  it('should validate a complete valid DiscoveryState object', () => {
    const result = validateDiscoveryState(validDiscoveryState);
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should validate DiscoveryState with null currentSample', () => {
    const stateWithNullCurrent = {
      ...validDiscoveryState,
      currentSample: null
    };

    const result = validateDiscoveryState(stateWithNullCurrent);
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should validate DiscoveryState with error message', () => {
    const stateWithError = {
      ...validDiscoveryState,
      error: 'Network error occurred'
    };

    const result = validateDiscoveryState(stateWithError);
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should reject null or undefined input', () => {
    expect(validateDiscoveryState(null).isValid).toBe(false);
    expect(validateDiscoveryState(undefined).isValid).toBe(false);
    expect(validateDiscoveryState('not an object').isValid).toBe(false);
  });

  it('should reject invalid array fields', () => {
    const arrayFields = ['samples', 'favorites', 'history'];
    
    arrayFields.forEach(field => {
      const invalidState = { ...validDiscoveryState };
      invalidState[field] = 'not an array';
      
      const result = validateDiscoveryState(invalidState);
      expect(result.isValid).toBe(false);
    });
  });

  it('should reject invalid boolean fields', () => {
    const booleanFields = ['isLoading', 'isOnline', 'useMockData'];
    
    booleanFields.forEach(field => {
      const invalidState = { ...validDiscoveryState };
      invalidState[field] = 'not a boolean';
      
      const result = validateDiscoveryState(invalidState);
      expect(result.isValid).toBe(false);
    });
  });

  it('should reject invalid samples in arrays', () => {
    const invalidSample = { ...validSample, year: 'invalid' };
    
    const stateWithInvalidSample = {
      ...validDiscoveryState,
      samples: [invalidSample]
    };

    const result = validateDiscoveryState(stateWithInvalidSample);
    expect(result.isValid).toBe(false);
    expect(result.errors.some(error => error.includes('Sample at index 0'))).toBe(true);
  });
});

describe('Discovery Data Models - Type Checking Utilities', () => {
  const validSample = {
    id: 'sample-123',
    title: 'Test Sample',
    artist: 'Test Artist',
    year: 1970,
    genre: 'Soul',
    duration: 180,
    youtubeId: 'abc123',
    thumbnailUrl: 'https://example.com/thumb.jpg',
    isMock: false
  };

  const validFilter = {
    genres: ['Soul'],
    yearRange: { start: 1960, end: 1980 }
  };

  const validState = {
    samples: [],
    currentSample: null,
    filters: validFilter,
    favorites: [],
    history: [],
    isLoading: false,
    error: null,
    isOnline: true,
    useMockData: false
  };

  it('should correctly identify valid SampleData', () => {
    expect(isSampleData(validSample)).toBe(true);
    expect(isSampleData(null)).toBe(false);
    expect(isSampleData({ invalid: 'data' })).toBe(false);
  });

  it('should correctly identify valid FilterState', () => {
    expect(isFilterState(validFilter)).toBe(true);
    expect(isFilterState(null)).toBe(false);
    expect(isFilterState({ invalid: 'data' })).toBe(false);
  });

  it('should correctly identify valid DiscoveryState', () => {
    expect(isDiscoveryState(validState)).toBe(true);
    expect(isDiscoveryState(null)).toBe(false);
    expect(isDiscoveryState({ invalid: 'data' })).toBe(false);
  });
});

describe('Discovery Data Models - Default State Creators', () => {
  it('should create valid default FilterState', () => {
    const defaultFilter = createDefaultFilterState();
    
    expect(isFilterState(defaultFilter)).toBe(true);
    expect(defaultFilter.genres).toEqual([]);
    expect(defaultFilter.yearRange.start).toBe(MIN_YEAR);
    expect(defaultFilter.yearRange.end).toBe(MAX_YEAR);
  });

  it('should create valid default DiscoveryState', () => {
    const defaultState = createDefaultDiscoveryState();
    
    expect(isDiscoveryState(defaultState)).toBe(true);
    expect(defaultState.samples).toEqual([]);
    expect(defaultState.currentSample).toBe(null);
    expect(defaultState.favorites).toEqual([]);
    expect(defaultState.history).toEqual([]);
    expect(defaultState.isLoading).toBe(false);
    expect(defaultState.error).toBe(null);
    expect(defaultState.isOnline).toBe(true);
    expect(defaultState.useMockData).toBe(false);
  });
});

describe('Discovery Data Models - Constants', () => {
  it('should export valid constants', () => {
    expect(Array.isArray(VALID_GENRES)).toBe(true);
    expect(VALID_GENRES.length).toBeGreaterThan(0);
    expect(VALID_GENRES).toContain('Soul');
    expect(VALID_GENRES).toContain('Jazz');
    expect(VALID_GENRES).toContain('Funk');
    
    expect(typeof MIN_YEAR).toBe('number');
    expect(typeof MAX_YEAR).toBe('number');
    expect(MIN_YEAR).toBe(1950);
    expect(MAX_YEAR).toBe(1995);
    
    expect(typeof MIN_DURATION).toBe('number');
    expect(typeof MAX_DURATION).toBe('number');
    expect(MIN_DURATION).toBeGreaterThan(0);
    expect(MAX_DURATION).toBeGreaterThan(MIN_DURATION);
    
    expect(typeof MIN_TEMPO).toBe('number');
    expect(typeof MAX_TEMPO).toBe('number');
    expect(MIN_TEMPO).toBeGreaterThan(0);
    expect(MAX_TEMPO).toBeGreaterThan(MIN_TEMPO);
  });
});