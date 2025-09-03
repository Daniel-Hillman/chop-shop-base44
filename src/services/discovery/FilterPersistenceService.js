/**
 * @fileoverview Filter Persistence Service
 * Handles filter state persistence across browser sessions and filter preset management
 * 
 * Requirements: 6.4, 6.5
 */

import { validateFilterState, createDefaultFilterState } from '../../types/discovery.js';

/**
 * Storage keys for filter persistence
 */
const FILTER_STATE_KEY = 'sampleDiscovery.filters';
const FILTER_PRESETS_KEY = 'sampleDiscovery.filterPresets';
const LAST_APPLIED_FILTERS_KEY = 'sampleDiscovery.lastAppliedFilters';

/**
 * Maximum number of filter presets to store
 */
const MAX_PRESETS = 20;

/**
 * Default filter presets
 */
const DEFAULT_PRESETS = [
  {
    id: 'soul-70s',
    name: 'Soul 70s',
    description: 'Classic soul samples from the 1970s',
    filters: {
      genres: ['Soul'],
      yearRange: { start: 1970, end: 1979 },
      tempoRange: { min: 90, max: 130 }
    },
    isDefault: true,
    createdAt: Date.now()
  },
  {
    id: 'funk-classics',
    name: 'Funk Classics',
    description: 'Funky grooves from the golden era',
    filters: {
      genres: ['Funk'],
      yearRange: { start: 1965, end: 1980 },
      tempoRange: { min: 100, max: 140 }
    },
    isDefault: true,
    createdAt: Date.now()
  },
  {
    id: 'jazz-fusion',
    name: 'Jazz Fusion',
    description: 'Jazz fusion samples with complex rhythms',
    filters: {
      genres: ['Jazz'],
      yearRange: { start: 1970, end: 1985 },
      tempoRange: { min: 120, max: 180 }
    },
    isDefault: true,
    createdAt: Date.now()
  },
  {
    id: 'short-breaks',
    name: 'Short Breaks',
    description: 'Quick drum breaks and short samples',
    filters: {
      genres: ['Funk', 'Soul', 'Hip-Hop'],
      yearRange: { start: 1960, end: 1990 },
      durationRange: { min: 1, max: 60 }
    },
    isDefault: true,
    createdAt: Date.now()
  }
];

/**
 * Filter Persistence Service
 * Manages filter state persistence and preset functionality
 */
class FilterPersistenceService {
  constructor() {
    this.listeners = new Set();
    this.initializeDefaultPresets();
  }

  /**
   * Initialize default presets if they don't exist
   */
  initializeDefaultPresets() {
    try {
      const existingPresets = this.getPresets();
      const hasDefaults = existingPresets.some(preset => preset.isDefault);
      
      if (!hasDefaults) {
        const allPresets = [...DEFAULT_PRESETS, ...existingPresets];
        localStorage.setItem(FILTER_PRESETS_KEY, JSON.stringify(allPresets));
      }
    } catch (error) {
      console.warn('Failed to initialize default filter presets:', error);
    }
  }

  /**
   * Save current filter state for persistence across sessions
   * @param {import('../../types/discovery.js').FilterState} filters - Filter state to save
   * @returns {boolean} Success status
   */
  saveFilterState(filters) {
    try {
      const validation = validateFilterState(filters);
      if (!validation.isValid) {
        console.error('Invalid filter state for persistence:', validation.errors);
        return false;
      }

      const filterData = {
        filters,
        timestamp: Date.now(),
        version: '1.0'
      };

      localStorage.setItem(FILTER_STATE_KEY, JSON.stringify(filterData));
      localStorage.setItem(LAST_APPLIED_FILTERS_KEY, JSON.stringify(filterData));
      
      this.notifyListeners('filterStateSaved', { filters });
      return true;
    } catch (error) {
      console.error('Failed to save filter state:', error);
      return false;
    }
  }

  /**
   * Load persisted filter state
   * @returns {import('../../types/discovery.js').FilterState} Loaded filter state or default
   */
  loadFilterState() {
    try {
      const stored = localStorage.getItem(FILTER_STATE_KEY);
      if (!stored) {
        return createDefaultFilterState();
      }

      const parsed = JSON.parse(stored);
      const validation = validateFilterState(parsed.filters);
      
      if (!validation.isValid) {
        console.warn('Invalid persisted filter state, using defaults:', validation.errors);
        return createDefaultFilterState();
      }

      return parsed.filters;
    } catch (error) {
      console.error('Failed to load filter state:', error);
      return createDefaultFilterState();
    }
  }

  /**
   * Get last applied filters (for quick reapplication)
   * @returns {import('../../types/discovery.js').FilterState|null} Last applied filters
   */
  getLastAppliedFilters() {
    try {
      const stored = localStorage.getItem(LAST_APPLIED_FILTERS_KEY);
      if (!stored) {
        return null;
      }

      const parsed = JSON.parse(stored);
      const validation = validateFilterState(parsed.filters);
      
      if (!validation.isValid) {
        return null;
      }

      return parsed.filters;
    } catch (error) {
      console.error('Failed to load last applied filters:', error);
      return null;
    }
  }

  /**
   * Save a filter preset
   * @param {string} name - Preset name
   * @param {string} description - Preset description
   * @param {import('../../types/discovery.js').FilterState} filters - Filter configuration
   * @returns {Object|null} Created preset or null if failed
   */
  savePreset(name, description, filters) {
    try {
      if (!name || typeof name !== 'string' || name.trim() === '') {
        throw new Error('Preset name is required');
      }

      if (!description || typeof description !== 'string') {
        description = '';
      }

      const validation = validateFilterState(filters);
      if (!validation.isValid) {
        throw new Error(`Invalid filter state: ${validation.errors.join(', ')}`);
      }

      const presets = this.getPresets();
      
      // Check for duplicate names
      const existingPreset = presets.find(p => p.name.toLowerCase() === name.toLowerCase());
      if (existingPreset && !existingPreset.isDefault) {
        throw new Error('A preset with this name already exists');
      }

      const preset = {
        id: `preset-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name: name.trim(),
        description: description.trim(),
        filters: JSON.parse(JSON.stringify(filters)), // Deep clone
        isDefault: false,
        createdAt: Date.now(),
        lastUsed: null
      };

      const updatedPresets = [...presets, preset];
      
      // Limit number of presets
      if (updatedPresets.length > MAX_PRESETS) {
        // Remove oldest non-default presets
        const nonDefaultPresets = updatedPresets.filter(p => !p.isDefault);
        const defaultPresets = updatedPresets.filter(p => p.isDefault);
        
        nonDefaultPresets.sort((a, b) => a.createdAt - b.createdAt);
        const presetsToKeep = nonDefaultPresets.slice(-(MAX_PRESETS - defaultPresets.length));
        
        updatedPresets.splice(0, updatedPresets.length, ...defaultPresets, ...presetsToKeep);
      }

      localStorage.setItem(FILTER_PRESETS_KEY, JSON.stringify(updatedPresets));
      
      this.notifyListeners('presetSaved', { preset });
      return preset;
    } catch (error) {
      console.error('Failed to save filter preset:', error);
      return null;
    }
  }

  /**
   * Load a filter preset
   * @param {string} presetId - Preset ID to load
   * @returns {import('../../types/discovery.js').FilterState|null} Loaded filters or null
   */
  loadPreset(presetId) {
    try {
      const presets = this.getPresets();
      const preset = presets.find(p => p.id === presetId);
      
      if (!preset) {
        throw new Error('Preset not found');
      }

      // Update last used timestamp
      preset.lastUsed = Date.now();
      localStorage.setItem(FILTER_PRESETS_KEY, JSON.stringify(presets));

      this.notifyListeners('presetLoaded', { preset });
      return preset.filters;
    } catch (error) {
      console.error('Failed to load filter preset:', error);
      return null;
    }
  }

  /**
   * Get all filter presets
   * @returns {Array} Array of filter presets
   */
  getPresets() {
    try {
      const stored = localStorage.getItem(FILTER_PRESETS_KEY);
      if (!stored) {
        return [...DEFAULT_PRESETS];
      }

      const presets = JSON.parse(stored);
      if (!Array.isArray(presets)) {
        return [...DEFAULT_PRESETS];
      }

      // Validate presets
      const validPresets = presets.filter(preset => {
        if (!preset.id || !preset.name || !preset.filters) {
          return false;
        }
        
        const validation = validateFilterState(preset.filters);
        return validation.isValid;
      });

      return validPresets;
    } catch (error) {
      console.error('Failed to get filter presets:', error);
      return [...DEFAULT_PRESETS];
    }
  }

  /**
   * Delete a filter preset
   * @param {string} presetId - Preset ID to delete
   * @returns {boolean} Success status
   */
  deletePreset(presetId) {
    try {
      const presets = this.getPresets();
      const presetIndex = presets.findIndex(p => p.id === presetId);
      
      if (presetIndex === -1) {
        throw new Error('Preset not found');
      }

      const preset = presets[presetIndex];
      
      // Don't allow deletion of default presets
      if (preset.isDefault) {
        throw new Error('Cannot delete default presets');
      }

      presets.splice(presetIndex, 1);
      localStorage.setItem(FILTER_PRESETS_KEY, JSON.stringify(presets));
      
      this.notifyListeners('presetDeleted', { presetId, preset });
      return true;
    } catch (error) {
      console.error('Failed to delete filter preset:', error);
      return false;
    }
  }

  /**
   * Update a filter preset
   * @param {string} presetId - Preset ID to update
   * @param {Object} updates - Updates to apply
   * @returns {Object|null} Updated preset or null
   */
  updatePreset(presetId, updates) {
    try {
      const presets = this.getPresets();
      const presetIndex = presets.findIndex(p => p.id === presetId);
      
      if (presetIndex === -1) {
        throw new Error('Preset not found');
      }

      const preset = presets[presetIndex];
      
      // Don't allow updating default presets
      if (preset.isDefault) {
        throw new Error('Cannot update default presets');
      }

      // Validate updates
      if (updates.name !== undefined) {
        if (!updates.name || typeof updates.name !== 'string' || updates.name.trim() === '') {
          throw new Error('Invalid preset name');
        }
        
        // Check for duplicate names
        const existingPreset = presets.find((p, index) => 
          index !== presetIndex && p.name.toLowerCase() === updates.name.toLowerCase()
        );
        if (existingPreset) {
          throw new Error('A preset with this name already exists');
        }
      }

      if (updates.filters !== undefined) {
        const validation = validateFilterState(updates.filters);
        if (!validation.isValid) {
          throw new Error(`Invalid filter state: ${validation.errors.join(', ')}`);
        }
      }

      // Apply updates
      const updatedPreset = {
        ...preset,
        ...updates,
        id: preset.id, // Preserve ID
        isDefault: preset.isDefault, // Preserve default status
        createdAt: preset.createdAt, // Preserve creation time
        updatedAt: Date.now()
      };

      presets[presetIndex] = updatedPreset;
      localStorage.setItem(FILTER_PRESETS_KEY, JSON.stringify(presets));
      
      this.notifyListeners('presetUpdated', { preset: updatedPreset });
      return updatedPreset;
    } catch (error) {
      console.error('Failed to update filter preset:', error);
      return null;
    }
  }

  /**
   * Clear all filter state and presets (except defaults)
   * @returns {boolean} Success status
   */
  clearAllData() {
    try {
      localStorage.removeItem(FILTER_STATE_KEY);
      localStorage.removeItem(LAST_APPLIED_FILTERS_KEY);
      
      // Keep only default presets
      localStorage.setItem(FILTER_PRESETS_KEY, JSON.stringify(DEFAULT_PRESETS));
      
      this.notifyListeners('dataCleared', {});
      return true;
    } catch (error) {
      console.error('Failed to clear filter data:', error);
      return false;
    }
  }

  /**
   * Get filter usage statistics
   * @returns {Object} Usage statistics
   */
  getUsageStats() {
    try {
      const presets = this.getPresets();
      const lastApplied = this.getLastAppliedFilters();
      
      return {
        totalPresets: presets.length,
        customPresets: presets.filter(p => !p.isDefault).length,
        defaultPresets: presets.filter(p => p.isDefault).length,
        mostRecentlyUsed: presets
          .filter(p => p.lastUsed)
          .sort((a, b) => b.lastUsed - a.lastUsed)
          .slice(0, 5)
          .map(p => ({ id: p.id, name: p.name, lastUsed: p.lastUsed })),
        hasLastAppliedFilters: Boolean(lastApplied),
        storageSize: {
          presets: JSON.stringify(presets).length,
          filterState: localStorage.getItem(FILTER_STATE_KEY)?.length || 0,
          lastApplied: localStorage.getItem(LAST_APPLIED_FILTERS_KEY)?.length || 0
        }
      };
    } catch (error) {
      console.error('Failed to get usage stats:', error);
      return {
        totalPresets: 0,
        customPresets: 0,
        defaultPresets: 0,
        mostRecentlyUsed: [],
        hasLastAppliedFilters: false,
        storageSize: { presets: 0, filterState: 0, lastApplied: 0 }
      };
    }
  }

  /**
   * Add event listener
   * @param {Function} listener - Event listener function
   */
  addListener(listener) {
    this.listeners.add(listener);
  }

  /**
   * Remove event listener
   * @param {Function} listener - Event listener function
   */
  removeListener(listener) {
    this.listeners.delete(listener);
  }

  /**
   * Notify all listeners of an event
   * @param {string} event - Event name
   * @param {Object} data - Event data
   */
  notifyListeners(event, data) {
    this.listeners.forEach(listener => {
      try {
        listener(event, data);
      } catch (error) {
        console.error('Error in filter persistence listener:', error);
      }
    });
  }
}

// Create singleton instance
const filterPersistenceService = new FilterPersistenceService();

export default filterPersistenceService;
export { FilterPersistenceService };