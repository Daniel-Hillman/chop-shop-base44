/**
 * @fileoverview Filter Combination Engine
 * Handles multiple filter combination logic with AND operations
 * 
 * Requirements: 6.4
 */

import { validateFilterState, validateSampleData, MIN_YEAR, MAX_YEAR, MIN_TEMPO, MAX_TEMPO, MIN_DURATION, MAX_DURATION } from '../../types/discovery.js';

/**
 * Filter Combination Engine
 * Applies multiple filters with AND logic to sample data
 */
class FilterCombinationEngine {
  constructor() {
    this.filterStats = {
      totalFiltered: 0,
      lastFilterTime: null,
      filterBreakdown: {}
    };
  }

  /**
   * Apply all filters to a sample array with AND logic
   * @param {import('../../types/discovery.js').SampleData[]} samples - Samples to filter
   * @param {import('../../types/discovery.js').FilterState} filters - Filter configuration
   * @returns {import('../../types/discovery.js').SampleData[]} Filtered samples
   */
  applyFilters(samples, filters) {
    const startTime = performance.now();
    
    try {
      // Validate inputs
      if (!Array.isArray(samples)) {
        throw new Error('Samples must be an array');
      }

      const filterValidation = validateFilterState(filters);
      if (!filterValidation.isValid) {
        throw new Error(`Invalid filter state: ${filterValidation.errors.join(', ')}`);
      }

      // If no filters are active, return all samples
      if (this.isEmptyFilter(filters)) {
        return samples;
      }

      // Apply filters with AND logic
      let filteredSamples = samples.filter(sample => {
        // Validate sample data
        const sampleValidation = validateSampleData(sample);
        if (!sampleValidation.isValid) {
          console.warn('Invalid sample filtered out:', sampleValidation.errors);
          return false;
        }

        return this.matchesAllFilters(sample, filters);
      });

      // Update statistics
      const endTime = performance.now();
      this.updateFilterStats(samples.length, filteredSamples.length, endTime - startTime, filters);

      return filteredSamples;
    } catch (error) {
      console.error('Error applying filters:', error);
      return samples; // Return unfiltered samples on error
    }
  }

  /**
   * Check if a sample matches all active filters (AND logic)
   * @param {import('../../types/discovery.js').SampleData} sample - Sample to check
   * @param {import('../../types/discovery.js').FilterState} filters - Filter configuration
   * @returns {boolean} True if sample matches all filters
   */
  matchesAllFilters(sample, filters) {
    // Genre filter (OR logic within genres, but AND with other filters)
    if (!this.matchesGenreFilter(sample, filters.genres)) {
      return false;
    }

    // Year range filter
    if (!this.matchesYearRangeFilter(sample, filters.yearRange)) {
      return false;
    }

    // Tempo range filter (optional)
    if (filters.tempoRange && !this.matchesTempoRangeFilter(sample, filters.tempoRange)) {
      return false;
    }

    // Duration range filter (optional)
    if (filters.durationRange && !this.matchesDurationRangeFilter(sample, filters.durationRange)) {
      return false;
    }

    // Instruments filter (optional)
    if (filters.instruments && !this.matchesInstrumentsFilter(sample, filters.instruments)) {
      return false;
    }

    return true;
  }

  /**
   * Check if sample matches genre filter
   * @param {import('../../types/discovery.js').SampleData} sample - Sample to check
   * @param {string[]} genres - Selected genres
   * @returns {boolean} True if matches
   */
  matchesGenreFilter(sample, genres) {
    // If no genres selected, match all
    if (!genres || genres.length === 0) {
      return true;
    }

    // Sample must match at least one selected genre
    return genres.includes(sample.genre);
  }

  /**
   * Check if sample matches year range filter
   * @param {import('../../types/discovery.js').SampleData} sample - Sample to check
   * @param {import('../../types/discovery.js').YearRange} yearRange - Year range
   * @returns {boolean} True if matches
   */
  matchesYearRangeFilter(sample, yearRange) {
    if (!yearRange) {
      return true;
    }

    return sample.year >= yearRange.start && sample.year <= yearRange.end;
  }

  /**
   * Check if sample matches tempo range filter
   * @param {import('../../types/discovery.js').SampleData} sample - Sample to check
   * @param {import('../../types/discovery.js').TempoRange} tempoRange - Tempo range
   * @returns {boolean} True if matches
   */
  matchesTempoRangeFilter(sample, tempoRange) {
    if (!tempoRange || sample.tempo === undefined) {
      return true; // If no tempo data, don't filter out
    }

    return sample.tempo >= tempoRange.min && sample.tempo <= tempoRange.max;
  }

  /**
   * Check if sample matches duration range filter
   * @param {import('../../types/discovery.js').SampleData} sample - Sample to check
   * @param {import('../../types/discovery.js').DurationRange} durationRange - Duration range
   * @returns {boolean} True if matches
   */
  matchesDurationRangeFilter(sample, durationRange) {
    if (!durationRange) {
      return true;
    }

    return sample.duration >= durationRange.min && sample.duration <= durationRange.max;
  }

  /**
   * Check if sample matches instruments filter
   * @param {import('../../types/discovery.js').SampleData} sample - Sample to check
   * @param {string[]} instruments - Selected instruments
   * @returns {boolean} True if matches
   */
  matchesInstrumentsFilter(sample, instruments) {
    // If no instruments selected, match all
    if (!instruments || instruments.length === 0) {
      return true;
    }

    // If sample has no instrument data, don't filter out
    if (!sample.instruments || sample.instruments.length === 0) {
      return true;
    }

    // Sample must have at least one of the selected instruments
    return instruments.some(instrument => 
      sample.instruments.some(sampleInstrument => 
        sampleInstrument.toLowerCase().includes(instrument.toLowerCase())
      )
    );
  }

  /**
   * Check if filter state is empty (no active filters)
   * @param {import('../../types/discovery.js').FilterState} filters - Filter state
   * @returns {boolean} True if no active filters
   */
  isEmptyFilter(filters) {
    // Check if genres are selected
    if (filters.genres && filters.genres.length > 0) {
      return false;
    }

    // Check if year range is not default (assuming full range is default)
    if (filters.yearRange) {
      if (filters.yearRange.start !== MIN_YEAR || filters.yearRange.end !== MAX_YEAR) {
        return false;
      }
    }

    // Check if tempo range is set
    if (filters.tempoRange) {
      if (filters.tempoRange.min !== MIN_TEMPO || filters.tempoRange.max !== MAX_TEMPO) {
        return false;
      }
    }

    // Check if duration range is set
    if (filters.durationRange) {
      if (filters.durationRange.min !== MIN_DURATION || filters.durationRange.max !== MAX_DURATION) {
        return false;
      }
    }

    // Check if instruments are selected
    if (filters.instruments && filters.instruments.length > 0) {
      return false;
    }

    return true;
  }

  /**
   * Get filter combination suggestions based on current results
   * @param {import('../../types/discovery.js').SampleData[]} samples - Current samples
   * @param {import('../../types/discovery.js').FilterState} currentFilters - Current filters
   * @returns {Object[]} Array of filter suggestions
   */
  getFilterSuggestions(samples, currentFilters) {
    try {
      const suggestions = [];

      // Analyze current sample set
      const analysis = this.analyzeSamples(samples);

      // Suggest genre refinements
      if (currentFilters.genres.length === 0 && analysis.genres.length > 1) {
        analysis.genres.slice(0, 3).forEach(genre => {
          suggestions.push({
            type: 'genre',
            label: `Filter by ${genre.name}`,
            description: `${genre.count} samples available`,
            filters: {
              ...currentFilters,
              genres: [genre.name]
            },
            expectedResults: genre.count
          });
        });
      }

      // Suggest year range refinements
      if (analysis.yearSpread > 20) {
        const midYear = Math.floor((analysis.yearRange.min + analysis.yearRange.max) / 2);
        suggestions.push({
          type: 'year',
          label: `Earlier Era (${analysis.yearRange.min}-${midYear})`,
          description: 'Focus on earlier vintage samples',
          filters: {
            ...currentFilters,
            yearRange: { start: analysis.yearRange.min, end: midYear }
          }
        });

        suggestions.push({
          type: 'year',
          label: `Later Era (${midYear + 1}-${analysis.yearRange.max})`,
          description: 'Focus on later vintage samples',
          filters: {
            ...currentFilters,
            yearRange: { start: midYear + 1, end: analysis.yearRange.max }
          }
        });
      }

      // Suggest tempo refinements
      if (analysis.tempoSpread > 40 && analysis.tempoRange.min && analysis.tempoRange.max) {
        suggestions.push({
          type: 'tempo',
          label: 'Slower Tempo',
          description: `${analysis.tempoRange.min}-120 BPM`,
          filters: {
            ...currentFilters,
            tempoRange: { min: analysis.tempoRange.min, max: 120 }
          }
        });

        suggestions.push({
          type: 'tempo',
          label: 'Faster Tempo',
          description: `120-${analysis.tempoRange.max} BPM`,
          filters: {
            ...currentFilters,
            tempoRange: { min: 120, max: analysis.tempoRange.max }
          }
        });
      }

      return suggestions.slice(0, 6); // Limit to 6 suggestions
    } catch (error) {
      console.error('Error generating filter suggestions:', error);
      return [];
    }
  }

  /**
   * Analyze samples to provide insights for filter suggestions
   * @param {import('../../types/discovery.js').SampleData[]} samples - Samples to analyze
   * @returns {Object} Analysis results
   */
  analyzeSamples(samples) {
    const analysis = {
      genres: {},
      yearRange: { min: Infinity, max: -Infinity },
      tempoRange: { min: Infinity, max: -Infinity },
      durationRange: { min: Infinity, max: -Infinity },
      instruments: {},
      totalSamples: samples.length
    };

    samples.forEach(sample => {
      // Genre analysis
      if (!analysis.genres[sample.genre]) {
        analysis.genres[sample.genre] = 0;
      }
      analysis.genres[sample.genre]++;

      // Year range analysis
      analysis.yearRange.min = Math.min(analysis.yearRange.min, sample.year);
      analysis.yearRange.max = Math.max(analysis.yearRange.max, sample.year);

      // Tempo analysis
      if (sample.tempo) {
        analysis.tempoRange.min = Math.min(analysis.tempoRange.min, sample.tempo);
        analysis.tempoRange.max = Math.max(analysis.tempoRange.max, sample.tempo);
      }

      // Duration analysis
      analysis.durationRange.min = Math.min(analysis.durationRange.min, sample.duration);
      analysis.durationRange.max = Math.max(analysis.durationRange.max, sample.duration);

      // Instruments analysis
      if (sample.instruments) {
        sample.instruments.forEach(instrument => {
          if (!analysis.instruments[instrument]) {
            analysis.instruments[instrument] = 0;
          }
          analysis.instruments[instrument]++;
        });
      }
    });

    // Convert to arrays and sort
    analysis.genres = Object.entries(analysis.genres)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    analysis.instruments = Object.entries(analysis.instruments)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    // Calculate spreads
    analysis.yearSpread = analysis.yearRange.max - analysis.yearRange.min;
    analysis.tempoSpread = analysis.tempoRange.max - analysis.tempoRange.min;
    analysis.durationSpread = analysis.durationRange.max - analysis.durationRange.min;

    return analysis;
  }

  /**
   * Update filter statistics
   * @param {number} originalCount - Original sample count
   * @param {number} filteredCount - Filtered sample count
   * @param {number} filterTime - Time taken to filter (ms)
   * @param {import('../../types/discovery.js').FilterState} filters - Applied filters
   */
  updateFilterStats(originalCount, filteredCount, filterTime, filters) {
    this.filterStats.totalFiltered++;
    this.filterStats.lastFilterTime = filterTime;

    // Track filter effectiveness
    const effectiveness = originalCount > 0 ? (filteredCount / originalCount) : 0;
    const filterKey = this.getFilterKey(filters);
    
    if (!this.filterStats.filterBreakdown[filterKey]) {
      this.filterStats.filterBreakdown[filterKey] = {
        count: 0,
        totalTime: 0,
        avgEffectiveness: 0,
        totalEffectiveness: 0
      };
    }

    const breakdown = this.filterStats.filterBreakdown[filterKey];
    breakdown.count++;
    breakdown.totalTime += filterTime;
    breakdown.totalEffectiveness += effectiveness;
    breakdown.avgEffectiveness = breakdown.totalEffectiveness / breakdown.count;
  }

  /**
   * Generate a key for filter combination tracking
   * @param {import('../../types/discovery.js').FilterState} filters - Filter state
   * @returns {string} Filter key
   */
  getFilterKey(filters) {
    const parts = [];
    
    if (filters.genres && filters.genres.length > 0) {
      parts.push(`genres:${filters.genres.length}`);
    }
    
    if (filters.yearRange) {
      if (filters.yearRange.start !== MIN_YEAR || filters.yearRange.end !== MAX_YEAR) {
        parts.push('year:custom');
      }
    }
    
    if (filters.tempoRange) {
      parts.push('tempo:custom');
    }
    
    if (filters.durationRange) {
      parts.push('duration:custom');
    }
    
    if (filters.instruments && filters.instruments.length > 0) {
      parts.push(`instruments:${filters.instruments.length}`);
    }

    return parts.length > 0 ? parts.join(',') : 'no-filters';
  }

  /**
   * Get filter performance statistics
   * @returns {Object} Performance statistics
   */
  getFilterStats() {
    return {
      ...this.filterStats,
      avgFilterTime: this.filterStats.totalFiltered > 0 
        ? Object.values(this.filterStats.filterBreakdown)
            .reduce((sum, breakdown) => sum + breakdown.totalTime, 0) / this.filterStats.totalFiltered
        : 0,
      mostUsedFilters: Object.entries(this.filterStats.filterBreakdown)
        .sort(([,a], [,b]) => b.count - a.count)
        .slice(0, 5)
        .map(([key, stats]) => ({ key, ...stats }))
    };
  }

  /**
   * Reset filter statistics
   */
  resetStats() {
    this.filterStats = {
      totalFiltered: 0,
      lastFilterTime: null,
      filterBreakdown: {}
    };
  }
}

// Create singleton instance
const filterCombinationEngine = new FilterCombinationEngine();

export default filterCombinationEngine;
export { FilterCombinationEngine };