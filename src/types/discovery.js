/**
 * @fileoverview Core data models and types for the Sample Discovery feature
 * Provides TypeScript-style interfaces via JSDoc for data structures,
 * validation functions, and type checking utilities.
 */

/**
 * @typedef {Object} SampleData
 * @property {string} id - Unique identifier for the sample
 * @property {string} title - Sample title/name
 * @property {string} artist - Artist or creator name
 * @property {number} year - Year the sample was created (1950-1995)
 * @property {string} genre - Musical genre (Soul, Jazz, Funk, Blues, Afrobeat, etc.)
 * @property {number} duration - Duration in seconds
 * @property {string} youtubeId - YouTube video ID
 * @property {string} thumbnailUrl - URL to sample thumbnail image
 * @property {number} [tempo] - Tempo in BPM (optional)
 * @property {string[]} [instruments] - Array of instruments featured (optional)
 * @property {string[]} [tags] - Additional tags for categorization (optional)
 * @property {boolean} isMock - Indicates if this is fallback/mock data
 */

/**
 * @typedef {Object} FilterState
 * @property {string[]} genres - Array of selected genres to filter by
 * @property {YearRange} yearRange - Year range filter
 * @property {TempoRange} [tempoRange] - Tempo range filter (optional)
 * @property {DurationRange} [durationRange] - Duration range filter (optional)
 * @property {string[]} [instruments] - Array of selected instruments (optional)
 */

/**
 * @typedef {Object} YearRange
 * @property {number} start - Start year (minimum 1950)
 * @property {number} end - End year (maximum 1995)
 */

/**
 * @typedef {Object} TempoRange
 * @property {number} min - Minimum BPM
 * @property {number} max - Maximum BPM
 */

/**
 * @typedef {Object} DurationRange
 * @property {number} min - Minimum duration in seconds
 * @property {number} max - Maximum duration in seconds
 */

/**
 * @typedef {Object} DiscoveryState
 * @property {SampleData[]} samples - Array of discovered samples
 * @property {SampleData|null} currentSample - Currently selected/playing sample
 * @property {FilterState} filters - Current filter settings
 * @property {SampleData[]} favorites - Array of favorited samples
 * @property {SampleData[]} history - Array of recently viewed samples
 * @property {boolean} isLoading - Loading state indicator
 * @property {string|null} error - Current error message, null if no error
 * @property {boolean} isOnline - Network connectivity status
 * @property {boolean} useMockData - Whether to use mock data instead of API
 */

/**
 * @typedef {Object} SampleMetadata
 * @property {string} id - Sample ID
 * @property {string} title - Sample title
 * @property {string} description - Sample description
 * @property {number} duration - Duration in seconds
 * @property {string} thumbnailUrl - Thumbnail URL
 * @property {Object} [analytics] - Additional analytics data (optional)
 */

// Validation Constants
const VALID_GENRES = [
  'Soul', 'Jazz', 'Funk', 'Blues', 'Afrobeat', 'Gospel', 'R&B', 
  'Motown', 'Disco', 'Reggae', 'Hip-Hop', 'Rock', 'Pop'
];

const MIN_YEAR = 1950;
const MAX_YEAR = 1995;
const MIN_DURATION = 1; // 1 second
const MAX_DURATION = 600; // 10 minutes
const MIN_TEMPO = 60;
const MAX_TEMPO = 200;

/**
 * Validates a SampleData object
 * @param {any} sample - Object to validate
 * @returns {{isValid: boolean, errors: string[]}} Validation result
 */
export function validateSampleData(sample) {
  const errors = [];

  if (!sample || typeof sample !== 'object') {
    return { isValid: false, errors: ['Sample must be an object'] };
  }

  // Required fields validation
  if (!sample.id || typeof sample.id !== 'string' || sample.id.trim() === '') {
    errors.push('Sample ID is required and must be a non-empty string');
  }

  if (!sample.title || typeof sample.title !== 'string' || sample.title.trim() === '') {
    errors.push('Sample title is required and must be a non-empty string');
  }

  if (!sample.artist || typeof sample.artist !== 'string' || sample.artist.trim() === '') {
    errors.push('Sample artist is required and must be a non-empty string');
  }

  if (typeof sample.year !== 'number' || sample.year < MIN_YEAR || sample.year > MAX_YEAR) {
    errors.push(`Sample year must be a number between ${MIN_YEAR} and ${MAX_YEAR}`);
  }

  if (!sample.genre || typeof sample.genre !== 'string' || !VALID_GENRES.includes(sample.genre)) {
    errors.push(`Sample genre must be one of: ${VALID_GENRES.join(', ')}`);
  }

  if (typeof sample.duration !== 'number' || sample.duration < MIN_DURATION || sample.duration > MAX_DURATION) {
    errors.push(`Sample duration must be a number between ${MIN_DURATION} and ${MAX_DURATION} seconds`);
  }

  if (!sample.youtubeId || typeof sample.youtubeId !== 'string' || sample.youtubeId.trim() === '') {
    errors.push('YouTube ID is required and must be a non-empty string');
  }

  if (!sample.thumbnailUrl || typeof sample.thumbnailUrl !== 'string' || sample.thumbnailUrl.trim() === '') {
    errors.push('Thumbnail URL is required and must be a non-empty string');
  }

  if (typeof sample.isMock !== 'boolean') {
    errors.push('isMock field is required and must be a boolean');
  }

  // Optional fields validation
  if (sample.tempo !== undefined) {
    if (typeof sample.tempo !== 'number' || sample.tempo < MIN_TEMPO || sample.tempo > MAX_TEMPO) {
      errors.push(`Tempo must be a number between ${MIN_TEMPO} and ${MAX_TEMPO} BPM`);
    }
  }

  if (sample.instruments !== undefined) {
    if (!Array.isArray(sample.instruments)) {
      errors.push('Instruments must be an array');
    } else if (!sample.instruments.every(inst => typeof inst === 'string' && inst.trim() !== '')) {
      errors.push('All instruments must be non-empty strings');
    }
  }

  if (sample.tags !== undefined) {
    if (!Array.isArray(sample.tags)) {
      errors.push('Tags must be an array');
    } else if (!sample.tags.every(tag => typeof tag === 'string' && tag.trim() !== '')) {
      errors.push('All tags must be non-empty strings');
    }
  }

  return { isValid: errors.length === 0, errors };
}

/**
 * Validates a FilterState object
 * @param {any} filters - Object to validate
 * @returns {{isValid: boolean, errors: string[]}} Validation result
 */
export function validateFilterState(filters) {
  const errors = [];

  if (!filters || typeof filters !== 'object') {
    return { isValid: false, errors: ['Filters must be an object'] };
  }

  // Genres validation
  if (!Array.isArray(filters.genres)) {
    errors.push('Genres must be an array');
  } else {
    const invalidGenres = filters.genres.filter(genre => !VALID_GENRES.includes(genre));
    if (invalidGenres.length > 0) {
      errors.push(`Invalid genres: ${invalidGenres.join(', ')}. Valid genres: ${VALID_GENRES.join(', ')}`);
    }
  }

  // Year range validation
  const yearRangeValidation = validateYearRange(filters.yearRange);
  if (!yearRangeValidation.isValid) {
    errors.push(...yearRangeValidation.errors);
  }

  // Optional tempo range validation
  if (filters.tempoRange !== undefined) {
    const tempoRangeValidation = validateTempoRange(filters.tempoRange);
    if (!tempoRangeValidation.isValid) {
      errors.push(...tempoRangeValidation.errors);
    }
  }

  // Optional duration range validation
  if (filters.durationRange !== undefined) {
    const durationRangeValidation = validateDurationRange(filters.durationRange);
    if (!durationRangeValidation.isValid) {
      errors.push(...durationRangeValidation.errors);
    }
  }

  // Optional instruments validation
  if (filters.instruments !== undefined) {
    if (!Array.isArray(filters.instruments)) {
      errors.push('Instruments must be an array');
    } else if (!filters.instruments.every(inst => typeof inst === 'string' && inst.trim() !== '')) {
      errors.push('All instruments must be non-empty strings');
    }
  }

  return { isValid: errors.length === 0, errors };
}

/**
 * Validates a YearRange object
 * @param {any} yearRange - Object to validate
 * @returns {{isValid: boolean, errors: string[]}} Validation result
 */
export function validateYearRange(yearRange) {
  const errors = [];

  if (!yearRange || typeof yearRange !== 'object') {
    return { isValid: false, errors: ['Year range must be an object'] };
  }

  if (typeof yearRange.start !== 'number' || yearRange.start < MIN_YEAR || yearRange.start > MAX_YEAR) {
    errors.push(`Year range start must be a number between ${MIN_YEAR} and ${MAX_YEAR}`);
  }

  if (typeof yearRange.end !== 'number' || yearRange.end < MIN_YEAR || yearRange.end > MAX_YEAR) {
    errors.push(`Year range end must be a number between ${MIN_YEAR} and ${MAX_YEAR}`);
  }

  if (typeof yearRange.start === 'number' && typeof yearRange.end === 'number' && yearRange.start > yearRange.end) {
    errors.push('Year range start must be less than or equal to end');
  }

  return { isValid: errors.length === 0, errors };
}

/**
 * Validates a TempoRange object
 * @param {any} tempoRange - Object to validate
 * @returns {{isValid: boolean, errors: string[]}} Validation result
 */
export function validateTempoRange(tempoRange) {
  const errors = [];

  if (!tempoRange || typeof tempoRange !== 'object') {
    return { isValid: false, errors: ['Tempo range must be an object'] };
  }

  if (typeof tempoRange.min !== 'number' || tempoRange.min < MIN_TEMPO || tempoRange.min > MAX_TEMPO) {
    errors.push(`Tempo range min must be a number between ${MIN_TEMPO} and ${MAX_TEMPO}`);
  }

  if (typeof tempoRange.max !== 'number' || tempoRange.max < MIN_TEMPO || tempoRange.max > MAX_TEMPO) {
    errors.push(`Tempo range max must be a number between ${MIN_TEMPO} and ${MAX_TEMPO}`);
  }

  if (typeof tempoRange.min === 'number' && typeof tempoRange.max === 'number' && tempoRange.min > tempoRange.max) {
    errors.push('Tempo range min must be less than or equal to max');
  }

  return { isValid: errors.length === 0, errors };
}

/**
 * Validates a DurationRange object
 * @param {any} durationRange - Object to validate
 * @returns {{isValid: boolean, errors: string[]}} Validation result
 */
export function validateDurationRange(durationRange) {
  const errors = [];

  if (!durationRange || typeof durationRange !== 'object') {
    return { isValid: false, errors: ['Duration range must be an object'] };
  }

  if (typeof durationRange.min !== 'number' || durationRange.min < MIN_DURATION || durationRange.min > MAX_DURATION) {
    errors.push(`Duration range min must be a number between ${MIN_DURATION} and ${MAX_DURATION} seconds`);
  }

  if (typeof durationRange.max !== 'number' || durationRange.max < MIN_DURATION || durationRange.max > MAX_DURATION) {
    errors.push(`Duration range max must be a number between ${MIN_DURATION} and ${MAX_DURATION} seconds`);
  }

  if (typeof durationRange.min === 'number' && typeof durationRange.max === 'number' && durationRange.min > durationRange.max) {
    errors.push('Duration range min must be less than or equal to max');
  }

  return { isValid: errors.length === 0, errors };
}

/**
 * Validates a DiscoveryState object
 * @param {any} state - Object to validate
 * @returns {{isValid: boolean, errors: string[]}} Validation result
 */
export function validateDiscoveryState(state) {
  const errors = [];

  if (!state || typeof state !== 'object') {
    return { isValid: false, errors: ['Discovery state must be an object'] };
  }

  // Samples array validation
  if (!Array.isArray(state.samples)) {
    errors.push('Samples must be an array');
  } else {
    state.samples.forEach((sample, index) => {
      const sampleValidation = validateSampleData(sample);
      if (!sampleValidation.isValid) {
        errors.push(`Sample at index ${index}: ${sampleValidation.errors.join(', ')}`);
      }
    });
  }

  // Current sample validation (can be null)
  if (state.currentSample !== null) {
    const currentSampleValidation = validateSampleData(state.currentSample);
    if (!currentSampleValidation.isValid) {
      errors.push(`Current sample: ${currentSampleValidation.errors.join(', ')}`);
    }
  }

  // Filters validation
  const filtersValidation = validateFilterState(state.filters);
  if (!filtersValidation.isValid) {
    errors.push(`Filters: ${filtersValidation.errors.join(', ')}`);
  }

  // Favorites array validation
  if (!Array.isArray(state.favorites)) {
    errors.push('Favorites must be an array');
  } else {
    state.favorites.forEach((favorite, index) => {
      const favoriteValidation = validateSampleData(favorite);
      if (!favoriteValidation.isValid) {
        errors.push(`Favorite at index ${index}: ${favoriteValidation.errors.join(', ')}`);
      }
    });
  }

  // History array validation
  if (!Array.isArray(state.history)) {
    errors.push('History must be an array');
  } else {
    state.history.forEach((historyItem, index) => {
      const historyValidation = validateSampleData(historyItem);
      if (!historyValidation.isValid) {
        errors.push(`History item at index ${index}: ${historyValidation.errors.join(', ')}`);
      }
    });
  }

  // Boolean fields validation
  if (typeof state.isLoading !== 'boolean') {
    errors.push('isLoading must be a boolean');
  }

  if (typeof state.isOnline !== 'boolean') {
    errors.push('isOnline must be a boolean');
  }

  if (typeof state.useMockData !== 'boolean') {
    errors.push('useMockData must be a boolean');
  }

  // Error field validation (can be null or string)
  if (state.error !== null && typeof state.error !== 'string') {
    errors.push('Error must be null or a string');
  }

  return { isValid: errors.length === 0, errors };
}

/**
 * Type checking utility functions
 */

/**
 * Checks if an object is a valid SampleData
 * @param {any} obj - Object to check
 * @returns {boolean} True if valid SampleData
 */
export function isSampleData(obj) {
  return validateSampleData(obj).isValid;
}

/**
 * Checks if an object is a valid FilterState
 * @param {any} obj - Object to check
 * @returns {boolean} True if valid FilterState
 */
export function isFilterState(obj) {
  return validateFilterState(obj).isValid;
}

/**
 * Checks if an object is a valid DiscoveryState
 * @param {any} obj - Object to check
 * @returns {boolean} True if valid DiscoveryState
 */
export function isDiscoveryState(obj) {
  return validateDiscoveryState(obj).isValid;
}

/**
 * Creates a default FilterState object
 * @returns {FilterState} Default filter state
 */
export function createDefaultFilterState() {
  return {
    genres: [],
    yearRange: {
      start: MIN_YEAR,
      end: MAX_YEAR
    }
  };
}

/**
 * Creates a default DiscoveryState object
 * @returns {DiscoveryState} Default discovery state
 */
export function createDefaultDiscoveryState() {
  return {
    samples: [],
    currentSample: null,
    filters: createDefaultFilterState(),
    favorites: [],
    history: [],
    isLoading: false,
    error: null,
    isOnline: true,
    useMockData: false
  };
}

/**
 * Creates a mock sample for testing purposes
 * @param {Partial<SampleData>} overrides - Properties to override in the mock sample
 * @returns {SampleData} Mock sample data
 */
export function createMockSample(overrides = {}) {
  const defaultSample = {
    id: `mock-sample-${Math.random().toString(36).substr(2, 9)}`,
    title: 'Mock Sample',
    artist: 'Mock Artist',
    year: 1975,
    genre: 'Funk',
    duration: 180,
    youtubeId: 'mock123',
    thumbnailUrl: 'https://img.youtube.com/vi/mock123/mqdefault.jpg',
    tempo: 120,
    instruments: ['drums', 'bass'],
    tags: ['vintage', 'sample'],
    isMock: true
  };

  return { ...defaultSample, ...overrides };
}

// Export constants for use in other modules
export {
  VALID_GENRES,
  MIN_YEAR,
  MAX_YEAR,
  MIN_DURATION,
  MAX_DURATION,
  MIN_TEMPO,
  MAX_TEMPO
};