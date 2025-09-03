/**
 * @fileoverview MockSampleProvider - Provides realistic vintage sample data (1950s-1990s)
 * for fallback scenarios when the YouTube API is unavailable or fails.
 * Generates genre-specific samples with proper metadata and filtering capabilities.
 */

import { validateSampleData, validateFilterState, VALID_GENRES } from '../../types/discovery.js';

/**
 * MockSampleProvider class for generating realistic vintage sample data
 * Provides fallback data when API services are unavailable
 */
export class MockSampleProvider {
  constructor() {
    this.sampleDatabase = this._initializeSampleDatabase();
  }

  /**
   * Initialize the mock sample database with realistic vintage data
   * @private
   * @returns {Object} Database organized by genre
   */
  _initializeSampleDatabase() {
    return {
      Soul: [
        {
          id: 'mock-soul-001',
          title: 'Funky Drummer Break',
          artist: 'James Brown',
          year: 1970,
          genre: 'Soul',
          duration: 180,
          youtubeId: 'mock-jb-funky-drummer',
          thumbnailUrl: 'https://img.youtube.com/vi/mock-jb-funky-drummer/mqdefault.jpg',
          tempo: 103,
          instruments: ['drums', 'bass', 'guitar', 'horns'],
          tags: ['break', 'classic', 'sampled'],
          isMock: true
        },
        {
          id: 'mock-soul-002',
          title: 'Cold Sweat',
          artist: 'James Brown',
          year: 1967,
          genre: 'Soul',
          duration: 165,
          youtubeId: 'mock-jb-cold-sweat',
          thumbnailUrl: 'https://img.youtube.com/vi/mock-jb-cold-sweat/mqdefault.jpg',
          tempo: 120,
          instruments: ['drums', 'bass', 'guitar', 'vocals'],
          tags: ['groove', 'funk', 'classic'],
          isMock: true
        },
        {
          id: 'mock-soul-003',
          title: 'I Got You (I Feel Good)',
          artist: 'James Brown',
          year: 1965,
          genre: 'Soul',
          duration: 158,
          youtubeId: 'mock-jb-i-got-you',
          thumbnailUrl: 'https://img.youtube.com/vi/mock-jb-i-got-you/mqdefault.jpg',
          tempo: 132,
          instruments: ['vocals', 'horns', 'drums', 'bass'],
          tags: ['upbeat', 'classic', 'energy'],
          isMock: true
        },
        {
          id: 'mock-soul-004',
          title: 'Respect',
          artist: 'Aretha Franklin',
          year: 1967,
          genre: 'Soul',
          duration: 147,
          youtubeId: 'mock-af-respect',
          thumbnailUrl: 'https://img.youtube.com/vi/mock-af-respect/mqdefault.jpg',
          tempo: 115,
          instruments: ['vocals', 'piano', 'horns', 'drums'],
          tags: ['powerful', 'anthem', 'classic'],
          isMock: true
        }
      ],
      Jazz: [
        {
          id: 'mock-jazz-001',
          title: 'Take Five',
          artist: 'Dave Brubeck Quartet',
          year: 1959,
          genre: 'Jazz',
          duration: 324,
          youtubeId: 'mock-db-take-five',
          thumbnailUrl: 'https://img.youtube.com/vi/mock-db-take-five/mqdefault.jpg',
          tempo: 176,
          instruments: ['piano', 'saxophone', 'drums', 'bass'],
          tags: ['5/4 time', 'cool jazz', 'instrumental'],
          isMock: true
        },
        {
          id: 'mock-jazz-002',
          title: 'So What',
          artist: 'Miles Davis',
          year: 1959,
          genre: 'Jazz',
          duration: 562,
          youtubeId: 'mock-md-so-what',
          thumbnailUrl: 'https://img.youtube.com/vi/mock-md-so-what/mqdefault.jpg',
          tempo: 132,
          instruments: ['trumpet', 'piano', 'bass', 'drums', 'saxophone'],
          tags: ['modal jazz', 'kind of blue', 'classic'],
          isMock: true
        },
        {
          id: 'mock-jazz-003',
          title: 'A Love Supreme',
          artist: 'John Coltrane',
          year: 1965,
          genre: 'Jazz',
          duration: 485,
          youtubeId: 'mock-jc-love-supreme',
          thumbnailUrl: 'https://img.youtube.com/vi/mock-jc-love-supreme/mqdefault.jpg',
          tempo: 140,
          instruments: ['saxophone', 'piano', 'bass', 'drums'],
          tags: ['spiritual', 'free jazz', 'masterpiece'],
          isMock: true
        },
        {
          id: 'mock-jazz-004',
          title: 'Cantaloupe Island',
          artist: 'Herbie Hancock',
          year: 1964,
          genre: 'Jazz',
          duration: 330,
          youtubeId: 'mock-hh-cantaloupe',
          thumbnailUrl: 'https://img.youtube.com/vi/mock-hh-cantaloupe/mqdefault.jpg',
          tempo: 125,
          instruments: ['piano', 'trumpet', 'bass', 'drums'],
          tags: ['hard bop', 'groove', 'sampled'],
          isMock: true
        }
      ],
      Funk: [
        {
          id: 'mock-funk-001',
          title: 'Flash Light',
          artist: 'Parliament',
          year: 1977,
          genre: 'Funk',
          duration: 345,
          youtubeId: 'mock-parliament-flash',
          thumbnailUrl: 'https://img.youtube.com/vi/mock-parliament-flash/mqdefault.jpg',
          tempo: 108,
          instruments: ['synthesizer', 'bass', 'drums', 'vocals'],
          tags: ['p-funk', 'synthesizer', 'groove'],
          isMock: true
        },
        {
          id: 'mock-funk-002',
          title: 'Give Up the Funk',
          artist: 'Parliament',
          year: 1975,
          genre: 'Funk',
          duration: 357,
          youtubeId: 'mock-parliament-give-up',
          thumbnailUrl: 'https://img.youtube.com/vi/mock-parliament-give-up/mqdefault.jpg',
          tempo: 112,
          instruments: ['bass', 'drums', 'guitar', 'vocals', 'horns'],
          tags: ['p-funk', 'party', 'classic'],
          isMock: true
        },
        {
          id: 'mock-funk-003',
          title: 'Thank You (Falettinme Be Mice Elf Agin)',
          artist: 'Sly & The Family Stone',
          year: 1969,
          genre: 'Funk',
          duration: 295,
          youtubeId: 'mock-sly-thank-you',
          thumbnailUrl: 'https://img.youtube.com/vi/mock-sly-thank-you/mqdefault.jpg',
          tempo: 95,
          instruments: ['bass', 'drums', 'guitar', 'vocals'],
          tags: ['psychedelic funk', 'groove', 'sampled'],
          isMock: true
        },
        {
          id: 'mock-funk-004',
          title: 'Cissy Strut',
          artist: 'The Meters',
          year: 1969,
          genre: 'Funk',
          duration: 195,
          youtubeId: 'mock-meters-cissy',
          thumbnailUrl: 'https://img.youtube.com/vi/mock-meters-cissy/mqdefault.jpg',
          tempo: 98,
          instruments: ['guitar', 'bass', 'drums', 'organ'],
          tags: ['new orleans funk', 'instrumental', 'groove'],
          isMock: true
        }
      ],
      Blues: [
        {
          id: 'mock-blues-001',
          title: 'The Thrill Is Gone',
          artist: 'B.B. King',
          year: 1969,
          genre: 'Blues',
          duration: 312,
          youtubeId: 'mock-bb-thrill-gone',
          thumbnailUrl: 'https://img.youtube.com/vi/mock-bb-thrill-gone/mqdefault.jpg',
          tempo: 72,
          instruments: ['guitar', 'vocals', 'strings', 'drums'],
          tags: ['electric blues', 'classic', 'emotional'],
          isMock: true
        },
        {
          id: 'mock-blues-002',
          title: 'Hoochie Coochie Man',
          artist: 'Muddy Waters',
          year: 1954,
          genre: 'Blues',
          duration: 178,
          youtubeId: 'mock-mw-hoochie',
          thumbnailUrl: 'https://img.youtube.com/vi/mock-mw-hoochie/mqdefault.jpg',
          tempo: 85,
          instruments: ['guitar', 'vocals', 'harmonica', 'bass'],
          tags: ['chicago blues', 'classic', 'powerful'],
          isMock: true
        },
        {
          id: 'mock-blues-003',
          title: 'Stormy Monday',
          artist: 'T-Bone Walker',
          year: 1950,
          genre: 'Blues',
          duration: 189,
          youtubeId: 'mock-tb-stormy',
          thumbnailUrl: 'https://img.youtube.com/vi/mock-tb-stormy/mqdefault.jpg',
          tempo: 68,
          instruments: ['guitar', 'vocals', 'piano', 'drums'],
          tags: ['electric blues', 'slow', 'classic'],
          isMock: true
        },
        {
          id: 'mock-blues-004',
          title: 'Sweet Home Chicago',
          artist: 'Robert Johnson',
          year: 1951,
          genre: 'Blues',
          duration: 195,
          youtubeId: 'mock-rj-sweet-home',
          thumbnailUrl: 'https://img.youtube.com/vi/mock-rj-sweet-home/mqdefault.jpg',
          tempo: 120,
          instruments: ['guitar', 'vocals'],
          tags: ['delta blues', 'acoustic', 'legendary'],
          isMock: true
        }
      ],
      Afrobeat: [
        {
          id: 'mock-afrobeat-001',
          title: 'Zombie',
          artist: 'Fela Kuti',
          year: 1976,
          genre: 'Afrobeat',
          duration: 480,
          youtubeId: 'mock-fk-zombie',
          thumbnailUrl: 'https://img.youtube.com/vi/mock-fk-zombie/mqdefault.jpg',
          tempo: 125,
          instruments: ['saxophone', 'drums', 'bass', 'guitar', 'vocals', 'percussion'],
          tags: ['political', 'extended', 'groove'],
          isMock: true
        },
        {
          id: 'mock-afrobeat-002',
          title: 'Water No Get Enemy',
          artist: 'Fela Kuti',
          year: 1975,
          genre: 'Afrobeat',
          duration: 420,
          youtubeId: 'mock-fk-water',
          thumbnailUrl: 'https://img.youtube.com/vi/mock-fk-water/mqdefault.jpg',
          tempo: 118,
          instruments: ['saxophone', 'drums', 'bass', 'keyboards', 'vocals'],
          tags: ['philosophical', 'groove', 'extended'],
          isMock: true
        },
        {
          id: 'mock-afrobeat-003',
          title: 'Lady',
          artist: 'Fela Kuti',
          year: 1972,
          genre: 'Afrobeat',
          duration: 380,
          youtubeId: 'mock-fk-lady',
          thumbnailUrl: 'https://img.youtube.com/vi/mock-fk-lady/mqdefault.jpg',
          tempo: 110,
          instruments: ['saxophone', 'drums', 'bass', 'guitar', 'vocals'],
          tags: ['social commentary', 'groove', 'classic'],
          isMock: true
        },
        {
          id: 'mock-afrobeat-004',
          title: 'Expensive Shit',
          artist: 'Fela Kuti',
          year: 1975,
          genre: 'Afrobeat',
          duration: 450,
          youtubeId: 'mock-fk-expensive',
          thumbnailUrl: 'https://img.youtube.com/vi/mock-fk-expensive/mqdefault.jpg',
          tempo: 115,
          instruments: ['saxophone', 'drums', 'bass', 'keyboards', 'vocals'],
          tags: ['political', 'groove', 'extended'],
          isMock: true
        }
      ]
    };
  }

  /**
   * Generate mock samples based on filters
   * @param {import('../../types/discovery.js').FilterState} filters - Filter criteria
   * @param {number} count - Number of samples to return (default: 12)
   * @returns {import('../../types/discovery.js').SampleData[]} Array of mock samples
   */
  generateMockSamples(filters = { genres: [], yearRange: { start: 1950, end: 1995 } }, count = 12) {
    // Handle negative or zero count
    if (count <= 0) {
      return [];
    }

    // Validate filters
    const filterValidation = validateFilterState(filters);
    if (!filterValidation.isValid) {
      console.warn('Invalid filters provided to generateMockSamples:', filterValidation.errors);
      // Use default filters if invalid
      filters = { genres: [], yearRange: { start: 1950, end: 1995 } };
    }

    let allSamples = [];

    // If no genres specified, include all genres
    const targetGenres = filters.genres.length > 0 ? filters.genres : Object.keys(this.sampleDatabase);

    // Collect samples from specified genres
    targetGenres.forEach(genre => {
      if (this.sampleDatabase[genre]) {
        allSamples = allSamples.concat(this.sampleDatabase[genre]);
      }
    });

    // Apply year range filter
    allSamples = allSamples.filter(sample => 
      sample.year >= filters.yearRange.start && sample.year <= filters.yearRange.end
    );

    // Apply tempo range filter if specified
    if (filters.tempoRange) {
      allSamples = allSamples.filter(sample => 
        sample.tempo && sample.tempo >= filters.tempoRange.min && sample.tempo <= filters.tempoRange.max
      );
    }

    // Apply duration range filter if specified
    if (filters.durationRange) {
      allSamples = allSamples.filter(sample => 
        sample.duration >= filters.durationRange.min && sample.duration <= filters.durationRange.max
      );
    }

    // Apply instrument filter if specified
    if (filters.instruments && filters.instruments.length > 0) {
      allSamples = allSamples.filter(sample => 
        sample.instruments && filters.instruments.some(instrument => 
          sample.instruments.includes(instrument)
        )
      );
    }

    // Shuffle the results for randomness
    const shuffled = this._shuffleArray([...allSamples]);

    // Return requested count, or all available if less than requested
    const result = shuffled.slice(0, Math.min(count, shuffled.length));

    // Validate each sample before returning
    return result.filter(sample => {
      const validation = validateSampleData(sample);
      if (!validation.isValid) {
        console.warn('Invalid sample data detected:', validation.errors);
        return false;
      }
      return true;
    });
  }

  /**
   * Get samples for a specific genre
   * @param {string} genre - Genre to filter by
   * @param {number} count - Number of samples to return (default: 12)
   * @returns {import('../../types/discovery.js').SampleData[]} Array of genre-specific samples
   */
  getGenreSpecificSamples(genre, count = 12) {
    if (!VALID_GENRES.includes(genre)) {
      console.warn(`Invalid genre: ${genre}. Valid genres:`, VALID_GENRES);
      return [];
    }

    const genreSamples = this.sampleDatabase[genre] || [];
    const shuffled = this._shuffleArray([...genreSamples]);
    return shuffled.slice(0, Math.min(count, shuffled.length));
  }

  /**
   * Get samples within a specific year range
   * @param {number} startYear - Start year (inclusive)
   * @param {number} endYear - End year (inclusive)
   * @param {number} count - Number of samples to return (default: 12)
   * @returns {import('../../types/discovery.js').SampleData[]} Array of samples within year range
   */
  getYearRangeSamples(startYear, endYear, count = 12) {
    if (startYear < 1950 || endYear > 1995 || startYear > endYear) {
      console.warn(`Invalid year range: ${startYear}-${endYear}. Must be between 1950-1995.`);
      return [];
    }

    let allSamples = [];
    Object.values(this.sampleDatabase).forEach(genreSamples => {
      allSamples = allSamples.concat(genreSamples);
    });

    const filteredSamples = allSamples.filter(sample => 
      sample.year >= startYear && sample.year <= endYear
    );

    const shuffled = this._shuffleArray([...filteredSamples]);
    return shuffled.slice(0, Math.min(count, shuffled.length));
  }

  /**
   * Get samples by tempo range
   * @param {number} minTempo - Minimum BPM
   * @param {number} maxTempo - Maximum BPM
   * @param {number} count - Number of samples to return (default: 12)
   * @returns {import('../../types/discovery.js').SampleData[]} Array of samples within tempo range
   */
  getTempoRangeSamples(minTempo, maxTempo, count = 12) {
    if (minTempo < 60 || maxTempo > 200 || minTempo > maxTempo) {
      console.warn(`Invalid tempo range: ${minTempo}-${maxTempo}. Must be between 60-200 BPM.`);
      return [];
    }

    let allSamples = [];
    Object.values(this.sampleDatabase).forEach(genreSamples => {
      allSamples = allSamples.concat(genreSamples);
    });

    const filteredSamples = allSamples.filter(sample => 
      sample.tempo && sample.tempo >= minTempo && sample.tempo <= maxTempo
    );

    const shuffled = this._shuffleArray([...filteredSamples]);
    return shuffled.slice(0, Math.min(count, shuffled.length));
  }

  /**
   * Get samples by instrument
   * @param {string[]} instruments - Array of instruments to filter by
   * @param {number} count - Number of samples to return (default: 12)
   * @returns {import('../../types/discovery.js').SampleData[]} Array of samples containing specified instruments
   */
  getInstrumentSamples(instruments, count = 12) {
    if (!Array.isArray(instruments) || instruments.length === 0) {
      console.warn('Invalid instruments array provided');
      return [];
    }

    let allSamples = [];
    Object.values(this.sampleDatabase).forEach(genreSamples => {
      allSamples = allSamples.concat(genreSamples);
    });

    const filteredSamples = allSamples.filter(sample => 
      sample.instruments && instruments.some(instrument => 
        sample.instruments.includes(instrument)
      )
    );

    const shuffled = this._shuffleArray([...filteredSamples]);
    return shuffled.slice(0, Math.min(count, filteredSamples.length));
  }

  /**
   * Get all available genres in the mock database
   * @returns {string[]} Array of available genres
   */
  getAvailableGenres() {
    return Object.keys(this.sampleDatabase);
  }

  /**
   * Get all available instruments across all samples
   * @returns {string[]} Array of unique instruments
   */
  getAvailableInstruments() {
    const instruments = new Set();
    
    Object.values(this.sampleDatabase).forEach(genreSamples => {
      genreSamples.forEach(sample => {
        if (sample.instruments) {
          sample.instruments.forEach(instrument => instruments.add(instrument));
        }
      });
    });

    return Array.from(instruments).sort();
  }

  /**
   * Get year range of available samples
   * @returns {{min: number, max: number}} Min and max years available
   */
  getAvailableYearRange() {
    let minYear = Infinity;
    let maxYear = -Infinity;

    Object.values(this.sampleDatabase).forEach(genreSamples => {
      genreSamples.forEach(sample => {
        minYear = Math.min(minYear, sample.year);
        maxYear = Math.max(maxYear, sample.year);
      });
    });

    return { min: minYear, max: maxYear };
  }

  /**
   * Get tempo range of available samples
   * @returns {{min: number, max: number}} Min and max tempos available
   */
  getAvailableTempoRange() {
    let minTempo = Infinity;
    let maxTempo = -Infinity;

    Object.values(this.sampleDatabase).forEach(genreSamples => {
      genreSamples.forEach(sample => {
        if (sample.tempo) {
          minTempo = Math.min(minTempo, sample.tempo);
          maxTempo = Math.max(maxTempo, sample.tempo);
        }
      });
    });

    return { min: minTempo, max: maxTempo };
  }

  /**
   * Shuffle an array using Fisher-Yates algorithm
   * @private
   * @param {Array} array - Array to shuffle
   * @returns {Array} Shuffled array
   */
  _shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  /**
   * Get total number of samples in database
   * @returns {number} Total sample count
   */
  getTotalSampleCount() {
    let total = 0;
    Object.values(this.sampleDatabase).forEach(genreSamples => {
      total += genreSamples.length;
    });
    return total;
  }

  /**
   * Get sample count by genre
   * @returns {Object} Object with genre names as keys and counts as values
   */
  getSampleCountByGenre() {
    const counts = {};
    Object.entries(this.sampleDatabase).forEach(([genre, samples]) => {
      counts[genre] = samples.length;
    });
    return counts;
  }
}

export default MockSampleProvider;