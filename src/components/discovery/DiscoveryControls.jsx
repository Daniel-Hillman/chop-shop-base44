import React, { useState, useCallback, useEffect } from 'react';
import { VALID_GENRES, MIN_YEAR, MAX_YEAR, MIN_TEMPO, MAX_TEMPO, MIN_DURATION, MAX_DURATION } from '../../types/discovery.js';
import FilterPresetManager from './FilterPresetManager.jsx';
import filterPersistenceService from '../../services/discovery/FilterPersistenceService.js';
import filterCombinationEngine from '../../services/discovery/FilterCombinationEngine.js';

/**
 * DiscoveryControls Component
 * 
 * Provides genre filter checkboxes, year range slider controls, and shuffle functionality
 * with proper form handling to prevent form submission issues.
 * 
 * Requirements: 2.2, 2.3, 3.1, 3.2
 * 
 * @param {Object} props
 * @param {import('../../types/discovery.js').FilterState} props.filters - Current filter state
 * @param {function} props.onFilterChange - Callback when filters change
 * @param {function} props.onShuffle - Callback when shuffle is triggered
 * @param {boolean} props.isLoading - Loading state indicator
 * @param {string|null} props.error - Current error message
 */
const DiscoveryControls = ({
  filters,
  onFilterChange,
  onShuffle,
  isLoading = false,
  error = null
}) => {
  // State for showing/hiding advanced filters
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  
  // State for preset manager
  const [showPresetManager, setShowPresetManager] = useState(false);
  
  // State for filter suggestions
  const [filterSuggestions, setFilterSuggestions] = useState([]);
  
  // Local state for year range sliders to provide real-time feedback
  const [yearRangeLocal, setYearRangeLocal] = useState({
    start: filters?.yearRange?.start || MIN_YEAR,
    end: filters?.yearRange?.end || MAX_YEAR
  });

  // Local state for tempo range sliders
  const [tempoRangeLocal, setTempoRangeLocal] = useState({
    min: filters?.tempoRange?.min || MIN_TEMPO,
    max: filters?.tempoRange?.max || MAX_TEMPO
  });

  // Local state for duration range sliders
  const [durationRangeLocal, setDurationRangeLocal] = useState({
    min: filters?.durationRange?.min || MIN_DURATION,
    max: filters?.durationRange?.max || MAX_DURATION
  });

  // Sync local ranges with props when filters change externally
  useEffect(() => {
    if (filters?.yearRange) {
      setYearRangeLocal({
        start: filters.yearRange.start,
        end: filters.yearRange.end
      });
    }
  }, [filters?.yearRange]);

  useEffect(() => {
    if (filters?.tempoRange) {
      setTempoRangeLocal({
        min: filters.tempoRange.min,
        max: filters.tempoRange.max
      });
    }
  }, [filters?.tempoRange]);

  useEffect(() => {
    if (filters?.durationRange) {
      setDurationRangeLocal({
        min: filters.durationRange.min,
        max: filters.durationRange.max
      });
    }
  }, [filters?.durationRange]);

  /**
   * Handle genre checkbox changes with proper form handling
   * @param {string} genre - Genre to toggle
   */
  const handleGenreChange = useCallback((genre) => {
    if (!filters || isLoading) return;

    const currentGenres = filters.genres || [];
    const newGenres = currentGenres.includes(genre)
      ? currentGenres.filter(g => g !== genre)
      : [...currentGenres, genre];

    onFilterChange({
      ...filters,
      genres: newGenres
    });
  }, [filters, onFilterChange, isLoading]);

  /**
   * Handle year range start change with real-time feedback
   * @param {Event} event - Input change event
   */
  const handleYearStartChange = useCallback((event) => {
    const newStart = parseInt(event.target.value, 10);
    
    // Update local state immediately for real-time feedback
    setYearRangeLocal(prev => ({
      ...prev,
      start: newStart
    }));

    // Ensure start doesn't exceed end
    const adjustedEnd = Math.max(newStart, yearRangeLocal.end);
    
    // Update parent state
    if (filters && onFilterChange) {
      onFilterChange({
        ...filters,
        yearRange: {
          start: newStart,
          end: adjustedEnd
        }
      });
    }
  }, [filters, onFilterChange, yearRangeLocal.end]);

  /**
   * Handle year range end change with real-time feedback
   * @param {Event} event - Input change event
   */
  const handleYearEndChange = useCallback((event) => {
    const newEnd = parseInt(event.target.value, 10);
    
    // Update local state immediately for real-time feedback
    setYearRangeLocal(prev => ({
      ...prev,
      end: newEnd
    }));

    // Ensure end doesn't go below start
    const adjustedStart = Math.min(yearRangeLocal.start, newEnd);
    
    // Update parent state
    if (filters && onFilterChange) {
      onFilterChange({
        ...filters,
        yearRange: {
          start: adjustedStart,
          end: newEnd
        }
      });
    }
  }, [filters, onFilterChange, yearRangeLocal.start]);

  /**
   * Handle shuffle button click with explicit type="button" to prevent form submission
   */
  const handleShuffleClick = useCallback((event) => {
    // Prevent any form submission
    event.preventDefault();
    event.stopPropagation();
    
    if (!isLoading && onShuffle) {
      onShuffle();
    }
  }, [onShuffle, isLoading]);

  /**
   * Handle tempo range min change
   */
  const handleTempoMinChange = useCallback((event) => {
    const newMin = parseInt(event.target.value, 10);
    
    setTempoRangeLocal(prev => ({
      ...prev,
      min: newMin
    }));

    const adjustedMax = Math.max(newMin, tempoRangeLocal.max);
    
    if (filters && onFilterChange) {
      onFilterChange({
        ...filters,
        tempoRange: {
          min: newMin,
          max: adjustedMax
        }
      });
    }
  }, [filters, onFilterChange, tempoRangeLocal.max]);

  /**
   * Handle tempo range max change
   */
  const handleTempoMaxChange = useCallback((event) => {
    const newMax = parseInt(event.target.value, 10);
    
    setTempoRangeLocal(prev => ({
      ...prev,
      max: newMax
    }));

    const adjustedMin = Math.min(tempoRangeLocal.min, newMax);
    
    if (filters && onFilterChange) {
      onFilterChange({
        ...filters,
        tempoRange: {
          min: adjustedMin,
          max: newMax
        }
      });
    }
  }, [filters, onFilterChange, tempoRangeLocal.min]);

  /**
   * Handle duration range min change
   */
  const handleDurationMinChange = useCallback((event) => {
    const newMin = parseInt(event.target.value, 10);
    
    setDurationRangeLocal(prev => ({
      ...prev,
      min: newMin
    }));

    const adjustedMax = Math.max(newMin, durationRangeLocal.max);
    
    if (filters && onFilterChange) {
      onFilterChange({
        ...filters,
        durationRange: {
          min: newMin,
          max: adjustedMax
        }
      });
    }
  }, [filters, onFilterChange, durationRangeLocal.max]);

  /**
   * Handle duration range max change
   */
  const handleDurationMaxChange = useCallback((event) => {
    const newMax = parseInt(event.target.value, 10);
    
    setDurationRangeLocal(prev => ({
      ...prev,
      max: newMax
    }));

    const adjustedMin = Math.min(durationRangeLocal.min, newMax);
    
    if (filters && onFilterChange) {
      onFilterChange({
        ...filters,
        durationRange: {
          min: adjustedMin,
          max: newMax
        }
      });
    }
  }, [filters, onFilterChange, durationRangeLocal.min]);

  /**
   * Toggle advanced filters visibility
   */
  const handleToggleAdvancedFilters = useCallback((event) => {
    event.preventDefault();
    event.stopPropagation();
    setShowAdvancedFilters(prev => !prev);
  }, []);

  /**
   * Clear all filters
   */
  const handleClearFilters = useCallback((event) => {
    event.preventDefault();
    event.stopPropagation();
    
    if (!isLoading && onFilterChange) {
      const clearedFilters = {
        genres: [],
        yearRange: {
          start: MIN_YEAR,
          end: MAX_YEAR
        }
      };
      
      setYearRangeLocal({
        start: MIN_YEAR,
        end: MAX_YEAR
      });
      
      setTempoRangeLocal({
        min: MIN_TEMPO,
        max: MAX_TEMPO
      });
      
      setDurationRangeLocal({
        min: MIN_DURATION,
        max: MAX_DURATION
      });
      
      onFilterChange(clearedFilters);
    }
  }, [onFilterChange, isLoading]);

  /**
   * Handle preset loading
   */
  const handleLoadPreset = useCallback((presetFilters) => {
    if (!isLoading && onFilterChange) {
      // Update local state to match preset
      if (presetFilters.yearRange) {
        setYearRangeLocal({
          start: presetFilters.yearRange.start,
          end: presetFilters.yearRange.end
        });
      }
      
      if (presetFilters.tempoRange) {
        setTempoRangeLocal({
          min: presetFilters.tempoRange.min,
          max: presetFilters.tempoRange.max
        });
      } else {
        setTempoRangeLocal({
          min: MIN_TEMPO,
          max: MAX_TEMPO
        });
      }
      
      if (presetFilters.durationRange) {
        setDurationRangeLocal({
          min: presetFilters.durationRange.min,
          max: presetFilters.durationRange.max
        });
      } else {
        setDurationRangeLocal({
          min: MIN_DURATION,
          max: MAX_DURATION
        });
      }
      
      onFilterChange(presetFilters);
      setShowPresetManager(false);
    }
  }, [onFilterChange, isLoading]);

  /**
   * Apply a filter suggestion
   */
  const handleApplySuggestion = useCallback((suggestion) => {
    if (!isLoading && onFilterChange) {
      handleLoadPreset(suggestion.filters);
    }
  }, [isLoading, onFilterChange, handleLoadPreset]);

  /**
   * Check if current filters are not empty
   */
  const hasActiveFilters = useCallback(() => {
    return !filterCombinationEngine.isEmptyFilter(filters);
  }, [filters]);

  return (
    <div className="discovery-controls bg-gray-800 rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-white">Filters</h2>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setShowPresetManager(true)}
            disabled={isLoading}
            className="text-sm text-purple-400 hover:text-purple-300 disabled:text-gray-500 disabled:cursor-not-allowed transition-colors"
            aria-label="Manage filter presets"
          >
            Presets
          </button>
          <button
            type="button"
            onClick={handleClearFilters}
            disabled={isLoading || !hasActiveFilters()}
            className="text-sm text-blue-400 hover:text-blue-300 disabled:text-gray-500 disabled:cursor-not-allowed transition-colors"
            aria-label="Clear all filters"
          >
            Clear All
          </button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-4 p-3 bg-red-600 rounded-lg">
          <p className="text-white text-sm">{error}</p>
        </div>
      )}

      {/* Genre Filters */}
      <div className="mb-6">
        <h3 className="text-sm font-medium text-gray-300 mb-3">Genres</h3>
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {VALID_GENRES.map(genre => {
            const isSelected = filters?.genres?.includes(genre) || false;
            const checkboxId = `genre-${genre.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
            
            return (
              <label 
                key={genre} 
                htmlFor={checkboxId}
                className="flex items-center cursor-pointer hover:bg-gray-700 p-2 rounded transition-colors"
              >
                <input
                  id={checkboxId}
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => handleGenreChange(genre)}
                  disabled={isLoading}
                  className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded disabled:cursor-not-allowed"
                  aria-describedby={`${checkboxId}-description`}
                />
                <span className="text-sm text-white select-none">
                  {genre}
                </span>
                <span 
                  id={`${checkboxId}-description`} 
                  className="sr-only"
                >
                  {isSelected ? 'Selected' : 'Not selected'} genre filter for {genre}
                </span>
              </label>
            );
          })}
        </div>
        
        {/* Selected genres summary */}
        {filters?.genres && filters.genres.length > 0 && (
          <div className="mt-3 p-2 bg-gray-700 rounded">
            <p className="text-xs text-gray-300">
              Selected: {filters.genres.join(', ')}
            </p>
          </div>
        )}
      </div>

      {/* Year Range Filters */}
      <div className="mb-6">
        <h3 className="text-sm font-medium text-gray-300 mb-3">Year Range</h3>
        
        {/* Year range display with real-time feedback */}
        <div className="mb-4 p-3 bg-gray-700 rounded text-center">
          <span className="text-lg font-semibold text-white">
            {yearRangeLocal.start} - {yearRangeLocal.end}
          </span>
          <p className="text-xs text-gray-400 mt-1">
            Vintage samples from this era
          </p>
        </div>

        {/* Start year slider */}
        <div className="mb-4">
          <label 
            htmlFor="year-start-slider"
            className="block text-xs text-gray-400 mb-2"
          >
            Start Year: {yearRangeLocal.start}
          </label>
          <input
            id="year-start-slider"
            type="range"
            min={MIN_YEAR}
            max={MAX_YEAR}
            value={yearRangeLocal.start}
            onChange={handleYearStartChange}
            disabled={isLoading}
            className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer slider-thumb disabled:cursor-not-allowed"
            aria-label={`Start year: ${yearRangeLocal.start}`}
            aria-describedby="year-range-description"
          />
        </div>

        {/* End year slider */}
        <div className="mb-2">
          <label 
            htmlFor="year-end-slider"
            className="block text-xs text-gray-400 mb-2"
          >
            End Year: {yearRangeLocal.end}
          </label>
          <input
            id="year-end-slider"
            type="range"
            min={MIN_YEAR}
            max={MAX_YEAR}
            value={yearRangeLocal.end}
            onChange={handleYearEndChange}
            disabled={isLoading}
            className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer slider-thumb disabled:cursor-not-allowed"
            aria-label={`End year: ${yearRangeLocal.end}`}
            aria-describedby="year-range-description"
          />
        </div>

        <p id="year-range-description" className="text-xs text-gray-500">
          Adjust the sliders to filter samples by year range ({MIN_YEAR}-{MAX_YEAR})
        </p>
      </div>

      {/* Advanced Filters Toggle */}
      <div className="mb-6">
        <button
          type="button"
          onClick={handleToggleAdvancedFilters}
          disabled={isLoading}
          className="w-full text-left text-sm font-medium text-gray-300 hover:text-white transition-colors flex items-center justify-between p-2 hover:bg-gray-700 rounded disabled:cursor-not-allowed disabled:text-gray-500"
          aria-expanded={showAdvancedFilters}
          aria-controls="advanced-filters"
        >
          <span>Advanced Filters</span>
          <span className={`transform transition-transform ${showAdvancedFilters ? 'rotate-180' : ''}`}>
            ▼
          </span>
        </button>

        {/* Advanced Filters Section */}
        {showAdvancedFilters && (
          <div id="advanced-filters" className="mt-4 space-y-6 p-4 bg-gray-700 rounded-lg">
            
            {/* Tempo Range Filters */}
            <div>
              <h4 className="text-sm font-medium text-gray-300 mb-3">Tempo (BPM)</h4>
              
              {/* Tempo range display */}
              <div className="mb-4 p-3 bg-gray-600 rounded text-center">
                <span className="text-lg font-semibold text-white">
                  {tempoRangeLocal.min} - {tempoRangeLocal.max} BPM
                </span>
                <p className="text-xs text-gray-400 mt-1">
                  Beats per minute range
                </p>
              </div>

              {/* Min tempo slider */}
              <div className="mb-4">
                <label 
                  htmlFor="tempo-min-slider"
                  className="block text-xs text-gray-400 mb-2"
                >
                  Min BPM: {tempoRangeLocal.min}
                </label>
                <input
                  id="tempo-min-slider"
                  type="range"
                  min={MIN_TEMPO}
                  max={MAX_TEMPO}
                  value={tempoRangeLocal.min}
                  onChange={handleTempoMinChange}
                  disabled={isLoading}
                  className="w-full h-2 bg-gray-500 rounded-lg appearance-none cursor-pointer slider-thumb disabled:cursor-not-allowed"
                  aria-label={`Minimum tempo: ${tempoRangeLocal.min} BPM`}
                />
              </div>

              {/* Max tempo slider */}
              <div className="mb-2">
                <label 
                  htmlFor="tempo-max-slider"
                  className="block text-xs text-gray-400 mb-2"
                >
                  Max BPM: {tempoRangeLocal.max}
                </label>
                <input
                  id="tempo-max-slider"
                  type="range"
                  min={MIN_TEMPO}
                  max={MAX_TEMPO}
                  value={tempoRangeLocal.max}
                  onChange={handleTempoMaxChange}
                  disabled={isLoading}
                  className="w-full h-2 bg-gray-500 rounded-lg appearance-none cursor-pointer slider-thumb disabled:cursor-not-allowed"
                  aria-label={`Maximum tempo: ${tempoRangeLocal.max} BPM`}
                />
              </div>

              <p className="text-xs text-gray-500">
                Filter samples by tempo range ({MIN_TEMPO}-{MAX_TEMPO} BPM)
              </p>
            </div>

            {/* Duration Range Filters */}
            <div>
              <h4 className="text-sm font-medium text-gray-300 mb-3">Duration</h4>
              
              {/* Duration range display */}
              <div className="mb-4 p-3 bg-gray-600 rounded text-center">
                <span className="text-lg font-semibold text-white">
                  {Math.floor(durationRangeLocal.min / 60)}:{(durationRangeLocal.min % 60).toString().padStart(2, '0')} - {Math.floor(durationRangeLocal.max / 60)}:{(durationRangeLocal.max % 60).toString().padStart(2, '0')}
                </span>
                <p className="text-xs text-gray-400 mt-1">
                  Sample duration range
                </p>
              </div>

              {/* Min duration slider */}
              <div className="mb-4">
                <label 
                  htmlFor="duration-min-slider"
                  className="block text-xs text-gray-400 mb-2"
                >
                  Min Duration: {Math.floor(durationRangeLocal.min / 60)}:{(durationRangeLocal.min % 60).toString().padStart(2, '0')}
                </label>
                <input
                  id="duration-min-slider"
                  type="range"
                  min={MIN_DURATION}
                  max={MAX_DURATION}
                  value={durationRangeLocal.min}
                  onChange={handleDurationMinChange}
                  disabled={isLoading}
                  className="w-full h-2 bg-gray-500 rounded-lg appearance-none cursor-pointer slider-thumb disabled:cursor-not-allowed"
                  aria-label={`Minimum duration: ${Math.floor(durationRangeLocal.min / 60)} minutes ${durationRangeLocal.min % 60} seconds`}
                />
              </div>

              {/* Max duration slider */}
              <div className="mb-2">
                <label 
                  htmlFor="duration-max-slider"
                  className="block text-xs text-gray-400 mb-2"
                >
                  Max Duration: {Math.floor(durationRangeLocal.max / 60)}:{(durationRangeLocal.max % 60).toString().padStart(2, '0')}
                </label>
                <input
                  id="duration-max-slider"
                  type="range"
                  min={MIN_DURATION}
                  max={MAX_DURATION}
                  value={durationRangeLocal.max}
                  onChange={handleDurationMaxChange}
                  disabled={isLoading}
                  className="w-full h-2 bg-gray-500 rounded-lg appearance-none cursor-pointer slider-thumb disabled:cursor-not-allowed"
                  aria-label={`Maximum duration: ${Math.floor(durationRangeLocal.max / 60)} minutes ${durationRangeLocal.max % 60} seconds`}
                />
              </div>

              <p className="text-xs text-gray-500">
                Filter samples by duration ({Math.floor(MIN_DURATION / 60)}:{(MIN_DURATION % 60).toString().padStart(2, '0')} - {Math.floor(MAX_DURATION / 60)}:{(MAX_DURATION % 60).toString().padStart(2, '0')})
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="space-y-3">
        {/* Shuffle Button - Explicit type="button" to prevent form submission */}
        <button
          type="button"
          onClick={handleShuffleClick}
          disabled={isLoading}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white py-3 px-4 rounded-lg transition-colors font-medium flex items-center justify-center"
          aria-label="Shuffle samples with current filters"
        >
          {isLoading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Shuffling...
            </>
          ) : (
            <>
              <span className="mr-2">🎲</span>
              Shuffle Samples
            </>
          )}
        </button>

        {/* Filter Summary */}
        <div className="text-xs text-gray-400 text-center space-y-1">
          {filters?.genres && filters.genres.length > 0 ? (
            <p>
              Filtering by {filters.genres.length} genre{filters.genres.length !== 1 ? 's' : ''} 
              ({yearRangeLocal.start}-{yearRangeLocal.end})
            </p>
          ) : (
            <p>
              All genres ({yearRangeLocal.start}-{yearRangeLocal.end})
            </p>
          )}
          
          {/* Advanced filter summary */}
          {(filters?.tempoRange || filters?.durationRange) && (
            <div className="pt-1 border-t border-gray-600">
              {filters?.tempoRange && (
                <p>Tempo: {filters.tempoRange.min}-{filters.tempoRange.max} BPM</p>
              )}
              {filters?.durationRange && (
                <p>
                  Duration: {Math.floor(filters.durationRange.min / 60)}:{(filters.durationRange.min % 60).toString().padStart(2, '0')} - {Math.floor(filters.durationRange.max / 60)}:{(filters.durationRange.max % 60).toString().padStart(2, '0')}
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Filter Preset Manager */}
      <FilterPresetManager
        currentFilters={filters}
        onLoadPreset={handleLoadPreset}
        isVisible={showPresetManager}
        onClose={() => setShowPresetManager(false)}
      />
    </div>
  );
};

export default DiscoveryControls;