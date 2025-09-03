/**
 * @fileoverview Filter Preset Manager Component
 * Provides UI for saving, loading, and managing filter presets
 * 
 * Requirements: 6.4, 6.5
 */

import React, { useState, useEffect, useCallback } from 'react';
import filterPersistenceService from '../../services/discovery/FilterPersistenceService.js';
import { validateFilterState } from '../../types/discovery.js';

/**
 * FilterPresetManager Component
 * 
 * @param {Object} props
 * @param {import('../../types/discovery.js').FilterState} props.currentFilters - Current filter state
 * @param {function} props.onLoadPreset - Callback when preset is loaded
 * @param {boolean} props.isVisible - Whether the manager is visible
 * @param {function} props.onClose - Callback to close the manager
 */
const FilterPresetManager = ({
  currentFilters,
  onLoadPreset,
  isVisible = false,
  onClose
}) => {
  const [presets, setPresets] = useState([]);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [saveForm, setSaveForm] = useState({ name: '', description: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  /**
   * Load presets from service
   */
  const loadPresets = useCallback(async () => {
    try {
      setLoading(true);
      const loadedPresets = filterPersistenceService.getPresets();
      setPresets(loadedPresets);
      setError(null);
    } catch (err) {
      console.error('Error loading presets:', err);
      setError('Failed to load presets');
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Handle preset loading
   */
  const handleLoadPreset = useCallback(async (presetId) => {
    try {
      setLoading(true);
      const filters = filterPersistenceService.loadPreset(presetId);
      
      if (filters) {
        onLoadPreset(filters);
        setError(null);
        
        // Refresh presets to update last used timestamp
        await loadPresets();
      } else {
        setError('Failed to load preset');
      }
    } catch (err) {
      console.error('Error loading preset:', err);
      setError('Failed to load preset');
    } finally {
      setLoading(false);
    }
  }, [onLoadPreset, loadPresets]);

  /**
   * Handle preset saving
   */
  const handleSavePreset = useCallback(async (e) => {
    e.preventDefault();
    
    if (!saveForm.name.trim()) {
      setError('Preset name is required');
      return;
    }

    try {
      setLoading(true);
      const preset = filterPersistenceService.savePreset(
        saveForm.name.trim(),
        saveForm.description.trim(),
        currentFilters
      );

      if (preset) {
        setSaveForm({ name: '', description: '' });
        setShowSaveDialog(false);
        setError(null);
        await loadPresets();
      } else {
        setError('Failed to save preset');
      }
    } catch (err) {
      console.error('Error saving preset:', err);
      setError('Failed to save preset');
    } finally {
      setLoading(false);
    }
  }, [saveForm, currentFilters, loadPresets]);

  /**
   * Handle preset deletion
   */
  const handleDeletePreset = useCallback(async (presetId) => {
    try {
      setLoading(true);
      const success = filterPersistenceService.deletePreset(presetId);
      
      if (success) {
        setDeleteConfirm(null);
        setError(null);
        await loadPresets();
      } else {
        setError('Failed to delete preset');
      }
    } catch (err) {
      console.error('Error deleting preset:', err);
      setError('Failed to delete preset');
    } finally {
      setLoading(false);
    }
  }, [loadPresets]);

  /**
   * Check if current filters can be saved
   */
  const canSaveCurrentFilters = useCallback(() => {
    if (!currentFilters) return false;
    
    const validation = validateFilterState(currentFilters);
    if (!validation.isValid) return false;

    // Check if filters are not empty
    const hasGenres = currentFilters.genres && currentFilters.genres.length > 0;
    const hasCustomYearRange = currentFilters.yearRange && 
      (currentFilters.yearRange.start !== 1950 || currentFilters.yearRange.end !== 1995);
    const hasTempoRange = currentFilters.tempoRange;
    const hasDurationRange = currentFilters.durationRange;
    const hasInstruments = currentFilters.instruments && currentFilters.instruments.length > 0;

    return hasGenres || hasCustomYearRange || hasTempoRange || hasDurationRange || hasInstruments;
  }, [currentFilters]);

  /**
   * Format filter summary for display
   */
  const formatFilterSummary = useCallback((filters) => {
    const parts = [];
    
    if (filters.genres && filters.genres.length > 0) {
      parts.push(`${filters.genres.length} genre${filters.genres.length !== 1 ? 's' : ''}`);
    }
    
    if (filters.yearRange && (filters.yearRange.start !== 1950 || filters.yearRange.end !== 1995)) {
      parts.push(`${filters.yearRange.start}-${filters.yearRange.end}`);
    }
    
    if (filters.tempoRange) {
      parts.push(`${filters.tempoRange.min}-${filters.tempoRange.max} BPM`);
    }
    
    if (filters.durationRange) {
      const minMin = Math.floor(filters.durationRange.min / 60);
      const minSec = filters.durationRange.min % 60;
      const maxMin = Math.floor(filters.durationRange.max / 60);
      const maxSec = filters.durationRange.max % 60;
      parts.push(`${minMin}:${minSec.toString().padStart(2, '0')}-${maxMin}:${maxSec.toString().padStart(2, '0')}`);
    }
    
    if (filters.instruments && filters.instruments.length > 0) {
      parts.push(`${filters.instruments.length} instrument${filters.instruments.length !== 1 ? 's' : ''}`);
    }

    return parts.length > 0 ? parts.join(', ') : 'No filters';
  }, []);

  /**
   * Format last used timestamp
   */
  const formatLastUsed = useCallback((timestamp) => {
    if (!timestamp) return 'Never used';
    
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  }, []);

  // Load presets on mount and when visible
  useEffect(() => {
    if (isVisible) {
      loadPresets();
    }
  }, [isVisible, loadPresets]);

  // Listen to service events
  useEffect(() => {
    const handleServiceEvent = (event, data) => {
      if (['presetSaved', 'presetDeleted', 'presetUpdated'].includes(event)) {
        loadPresets();
      }
    };

    filterPersistenceService.addListener(handleServiceEvent);
    return () => filterPersistenceService.removeListener(handleServiceEvent);
  }, [loadPresets]);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-white">Filter Presets</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
            aria-label="Close preset manager"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-4 p-3 bg-red-600 rounded-lg">
            <p className="text-white text-sm">{error}</p>
            <button
              type="button"
              onClick={() => setError(null)}
              className="text-red-200 hover:text-white text-xs mt-1"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Save Current Filters */}
        <div className="mb-6 p-4 bg-gray-700 rounded-lg">
          <h3 className="text-lg font-medium text-white mb-2">Current Filters</h3>
          <p className="text-sm text-gray-300 mb-3">
            {formatFilterSummary(currentFilters)}
          </p>
          
          {canSaveCurrentFilters() ? (
            <button
              type="button"
              onClick={() => setShowSaveDialog(true)}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white px-4 py-2 rounded-lg text-sm transition-colors"
            >
              Save as Preset
            </button>
          ) : (
            <p className="text-xs text-gray-400">
              Apply some filters to save as a preset
            </p>
          )}
        </div>

        {/* Save Dialog */}
        {showSaveDialog && (
          <div className="mb-6 p-4 bg-gray-700 rounded-lg border border-blue-500">
            <h4 className="text-md font-medium text-white mb-3">Save Filter Preset</h4>
            <form onSubmit={handleSavePreset}>
              <div className="mb-3">
                <label htmlFor="preset-name" className="block text-sm text-gray-300 mb-1">
                  Preset Name *
                </label>
                <input
                  id="preset-name"
                  type="text"
                  value={saveForm.name}
                  onChange={(e) => setSaveForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., My Favorite Soul Samples"
                  className="w-full bg-gray-600 text-white px-3 py-2 rounded border border-gray-500 focus:border-blue-500 focus:outline-none"
                  maxLength={50}
                  required
                />
              </div>
              
              <div className="mb-4">
                <label htmlFor="preset-description" className="block text-sm text-gray-300 mb-1">
                  Description (optional)
                </label>
                <textarea
                  id="preset-description"
                  value={saveForm.description}
                  onChange={(e) => setSaveForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Brief description of this filter combination"
                  className="w-full bg-gray-600 text-white px-3 py-2 rounded border border-gray-500 focus:border-blue-500 focus:outline-none resize-none"
                  rows={2}
                  maxLength={200}
                />
              </div>
              
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={loading || !saveForm.name.trim()}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white px-4 py-2 rounded text-sm transition-colors"
                >
                  {loading ? 'Saving...' : 'Save Preset'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowSaveDialog(false);
                    setSaveForm({ name: '', description: '' });
                  }}
                  className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded text-sm transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Presets List */}
        <div>
          <h3 className="text-lg font-medium text-white mb-4">
            Saved Presets ({presets.length})
          </h3>
          
          {loading && presets.length === 0 ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
              <p className="text-gray-400">Loading presets...</p>
            </div>
          ) : presets.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-400 mb-2">No presets saved yet</p>
              <p className="text-sm text-gray-500">Save your current filters to create your first preset</p>
            </div>
          ) : (
            <div className="space-y-3">
              {presets.map(preset => (
                <div
                  key={preset.id}
                  className="bg-gray-700 rounded-lg p-4 hover:bg-gray-600 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="text-white font-medium truncate">
                          {preset.name}
                        </h4>
                        {preset.isDefault && (
                          <span className="bg-blue-600 text-white text-xs px-2 py-1 rounded">
                            Default
                          </span>
                        )}
                      </div>
                      
                      {preset.description && (
                        <p className="text-sm text-gray-300 mb-2 line-clamp-2">
                          {preset.description}
                        </p>
                      )}
                      
                      <p className="text-xs text-gray-400 mb-2">
                        {formatFilterSummary(preset.filters)}
                      </p>
                      
                      <p className="text-xs text-gray-500">
                        {preset.lastUsed ? `Last used: ${formatLastUsed(preset.lastUsed)}` : 'Never used'}
                      </p>
                    </div>
                    
                    <div className="flex gap-2 ml-4">
                      <button
                        type="button"
                        onClick={() => handleLoadPreset(preset.id)}
                        disabled={loading}
                        className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white px-3 py-1 rounded text-sm transition-colors"
                      >
                        Load
                      </button>
                      
                      {!preset.isDefault && (
                        <button
                          type="button"
                          onClick={() => setDeleteConfirm(preset.id)}
                          disabled={loading}
                          className="bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white px-3 py-1 rounded text-sm transition-colors"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Delete Confirmation */}
        {deleteConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60">
            <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md">
              <h3 className="text-lg font-semibold text-white mb-4">Delete Preset</h3>
              <p className="text-gray-300 mb-6">
                Are you sure you want to delete this preset? This action cannot be undone.
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => setDeleteConfirm(null)}
                  className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleDeletePreset(deleteConfirm)}
                  disabled={loading}
                  className="bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white px-4 py-2 rounded transition-colors"
                >
                  {loading ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FilterPresetManager;