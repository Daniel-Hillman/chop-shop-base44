/**
 * @fileoverview Discovery State Management Hook
 * Provides isolated state management for the Sample Discovery feature
 * with local storage persistence, hydration, and memory cleanup.
 * 
 * Requirements: 1.3, 8.4, 8.5
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  createDefaultDiscoveryState, 
  validateDiscoveryState,
  validateFilterState,
  validateSampleData 
} from '../types/discovery.js';
import { favoritesService } from '../services/discovery/FavoritesService.js';
import historyService from '../services/discovery/HistoryService.js';
import filterPersistenceService from '../services/discovery/FilterPersistenceService.js';
import DiscoveryService from '../services/discovery/DiscoveryService.js';

/**
 * Storage key for discovery state persistence
 */
const DISCOVERY_STATE_STORAGE_KEY = 'sampleDiscovery.state';

/**
 * Maximum number of samples to keep in memory
 */
const MAX_SAMPLES_IN_MEMORY = 200;

/**
 * Debounce delay for state persistence (ms)
 */
const PERSISTENCE_DEBOUNCE_DELAY = 500;

/**
 * Custom hook for managing discovery state with persistence and cleanup
 * 
 * @returns {Object} Discovery state and management functions
 */
export function useDiscoveryState() {
  // Core state
  const [state, setState] = useState(() => createDefaultDiscoveryState());
  
  // Discovery service instance
  const discoveryServiceRef = useRef(null);
  
  // Initialize discovery service
  if (!discoveryServiceRef.current) {
    discoveryServiceRef.current = new DiscoveryService();
  }
  
  // Refs for cleanup and optimization
  const persistenceTimeoutRef = useRef(null);
  const isInitializedRef = useRef(false);
  const cleanupIntervalRef = useRef(null);
  const stateHistoryRef = useRef([]);
  
  /**
   * Load persisted state from localStorage
   */
  const loadPersistedState = useCallback(async () => {
    try {
      const stored = localStorage.getItem(DISCOVERY_STATE_STORAGE_KEY);
      if (!stored) {
        return createDefaultDiscoveryState();
      }

      const parsed = JSON.parse(stored);
      const validation = validateDiscoveryState(parsed);
      
      if (!validation.isValid) {
        console.warn('Invalid persisted discovery state, using defaults:', validation.errors);
        return createDefaultDiscoveryState();
      }

      // Load favorites, history, and persisted filters from their respective services
      const [favorites, history, persistedFilters] = await Promise.all([
        favoritesService.getFavorites(),
        Promise.resolve(historyService.getHistory()),
        Promise.resolve(filterPersistenceService.loadFilterState())
      ]);

      return {
        ...parsed,
        favorites,
        history,
        filters: persistedFilters, // Use persisted filters
        isLoading: false, // Reset loading state on hydration
        error: null // Reset error state on hydration
      };
    } catch (error) {
      console.error('Error loading persisted discovery state:', error);
      return createDefaultDiscoveryState();
    }
  }, []);

  /**
   * Persist state to localStorage with debouncing
   */
  const persistState = useCallback((stateToSave) => {
    // Clear existing timeout
    if (persistenceTimeoutRef.current) {
      clearTimeout(persistenceTimeoutRef.current);
    }

    // Debounce persistence to avoid excessive writes
    persistenceTimeoutRef.current = setTimeout(() => {
      try {
        // Create a clean state object for persistence (exclude runtime-only fields)
        const stateToPersist = {
          ...stateToSave,
          favorites: [], // Managed by FavoritesService
          history: [], // Managed by HistoryService
          isLoading: false,
          error: null
        };

        localStorage.setItem(DISCOVERY_STATE_STORAGE_KEY, JSON.stringify(stateToPersist));
      } catch (error) {
        console.warn('Failed to persist discovery state:', error);
      }
    }, PERSISTENCE_DEBOUNCE_DELAY);
  }, []);

  /**
   * Update state with validation and persistence
   */
  const updateState = useCallback((updates) => {
    setState(prevState => {
      const newState = typeof updates === 'function' ? updates(prevState) : { ...prevState, ...updates };
      
      // Validate the new state
      const validation = validateDiscoveryState(newState);
      if (!validation.isValid) {
        console.error('Invalid state update attempted:', validation.errors);
        return prevState; // Return previous state if validation fails
      }

      // Add to state history for debugging
      stateHistoryRef.current.push({
        timestamp: Date.now(),
        action: 'update',
        changes: updates
      });

      // Keep only last 10 state changes
      if (stateHistoryRef.current.length > 10) {
        stateHistoryRef.current = stateHistoryRef.current.slice(-10);
      }

      // Persist the new state
      persistState(newState);

      return newState;
    });
  }, [persistState]);

  /**
   * Set samples with memory management
   */
  const setSamples = useCallback((samples) => {
    if (!Array.isArray(samples)) {
      console.error('setSamples: samples must be an array');
      return;
    }

    // Validate all samples
    const validSamples = samples.filter(sample => {
      const validation = validateSampleData(sample);
      if (!validation.isValid) {
        console.warn('Invalid sample filtered out:', validation.errors);
        return false;
      }
      return true;
    });

    // Limit samples to prevent memory issues
    const limitedSamples = validSamples.slice(0, MAX_SAMPLES_IN_MEMORY);
    
    if (limitedSamples.length !== validSamples.length) {
      console.warn(`Samples limited to ${MAX_SAMPLES_IN_MEMORY} items for memory management`);
    }

    updateState({ samples: limitedSamples });
  }, [updateState]);

  /**
   * Set current sample with history tracking
   */
  const setCurrentSample = useCallback((sample) => {
    if (sample !== null) {
      const validation = validateSampleData(sample);
      if (!validation.isValid) {
        console.error('setCurrentSample: invalid sample data:', validation.errors);
        return;
      }

      // Add to history
      historyService.addToHistory(sample);
    }

    updateState({ currentSample: sample });
  }, [updateState]);

  /**
   * Update filters with validation and persistence
   */
  const setFilters = useCallback((filters) => {
    const validation = validateFilterState(filters);
    if (!validation.isValid) {
      console.error('setFilters: invalid filter state:', validation.errors);
      return;
    }

    // Persist filters across sessions
    filterPersistenceService.saveFilterState(filters);

    updateState({ filters });
  }, [updateState]);

  /**
   * Set loading state
   */
  const setLoading = useCallback((isLoading) => {
    updateState({ isLoading: Boolean(isLoading) });
  }, [updateState]);

  /**
   * Set error state
   */
  const setError = useCallback((error) => {
    updateState({ error: error ? String(error) : null });
  }, [updateState]);

  /**
   * Set online status
   */
  const setOnline = useCallback((isOnline) => {
    updateState({ isOnline: Boolean(isOnline) });
  }, [updateState]);

  /**
   * Set mock data usage
   */
  const setUseMockData = useCallback((useMockData) => {
    updateState({ useMockData: Boolean(useMockData) });
  }, [updateState]);

  /**
   * Fetch samples using DiscoveryService with YouTube API integration
   */
  const fetchSamples = useCallback(async (filters = null) => {
    const filtersToUse = filters || state.filters;
    
    try {
      setLoading(true);
      setError(null);
      
      // Use DiscoveryService to fetch samples (YouTube API -> Cache -> Mock)
      const samples = await discoveryServiceRef.current.getSamples(filtersToUse);
      
      setSamples(samples);
      
      // Track successful fetch
      console.log(`✅ Fetched ${samples.length} samples using DiscoveryService`);
      
      return samples;
    } catch (error) {
      console.error('❌ Failed to fetch samples:', error);
      setError(error.message);
      
      // Return empty array on error
      return [];
    } finally {
      setLoading(false);
    }
  }, [state.filters, setLoading, setError, setSamples]);

  /**
   * Add sample to favorites
   */
  const addToFavorites = useCallback(async (sample) => {
    try {
      await favoritesService.addFavorite(sample);
      const updatedFavorites = await favoritesService.getFavorites();
      updateState({ favorites: updatedFavorites });
      return true;
    } catch (error) {
      console.error('Error adding to favorites:', error);
      setError(`Failed to add to favorites: ${error.message}`);
      return false;
    }
  }, [updateState, setError]);

  /**
   * Remove sample from favorites
   */
  const removeFromFavorites = useCallback(async (sampleId) => {
    try {
      await favoritesService.removeFavorite(sampleId);
      const updatedFavorites = await favoritesService.getFavorites();
      updateState({ favorites: updatedFavorites });
      return true;
    } catch (error) {
      console.error('Error removing from favorites:', error);
      setError(`Failed to remove from favorites: ${error.message}`);
      return false;
    }
  }, [updateState, setError]);

  /**
   * Clear all favorites
   */
  const clearFavorites = useCallback(async () => {
    try {
      await favoritesService.clearFavorites();
      updateState({ favorites: [] });
      return true;
    } catch (error) {
      console.error('Error clearing favorites:', error);
      setError(`Failed to clear favorites: ${error.message}`);
      return false;
    }
  }, [updateState, setError]);

  /**
   * Clear history
   */
  const clearHistory = useCallback(() => {
    try {
      historyService.clearHistory();
      updateState({ history: [] });
      return true;
    } catch (error) {
      console.error('Error clearing history:', error);
      setError(`Failed to clear history: ${error.message}`);
      return false;
    }
  }, [updateState, setError]);

  /**
   * Reset state to defaults
   */
  const resetState = useCallback(() => {
    const defaultState = createDefaultDiscoveryState();
    setState(defaultState);
    persistState(defaultState);
    
    // Clear state history
    stateHistoryRef.current = [];
  }, [persistState]);

  /**
   * Get state statistics for debugging
   */
  const getStateStats = useCallback(() => {
    return {
      samplesCount: state.samples.length,
      favoritesCount: state.favorites.length,
      historyCount: state.history.length,
      currentSample: state.currentSample ? state.currentSample.id : null,
      isLoading: state.isLoading,
      hasError: Boolean(state.error),
      isOnline: state.isOnline,
      useMockData: state.useMockData,
      memoryUsage: {
        samples: JSON.stringify(state.samples).length,
        favorites: JSON.stringify(state.favorites).length,
        history: JSON.stringify(state.history).length
      },
      stateHistory: stateHistoryRef.current.length
    };
  }, [state]);

  /**
   * Cleanup memory by removing old samples
   */
  const cleanupMemory = useCallback(() => {
    setState(prevState => {
      // Keep only recent samples if we have too many
      if (prevState.samples.length > MAX_SAMPLES_IN_MEMORY) {
        const cleanedSamples = prevState.samples.slice(0, MAX_SAMPLES_IN_MEMORY);
        console.log(`Cleaned up ${prevState.samples.length - cleanedSamples.length} old samples`);
        
        return {
          ...prevState,
          samples: cleanedSamples
        };
      }
      
      return prevState;
    });

    // Cleanup old history entries (older than 30 days)
    const removedHistoryCount = historyService.cleanupOldEntries();
    if (removedHistoryCount > 0) {
      updateState({ history: historyService.getHistory() });
    }

    // Cleanup state history
    if (stateHistoryRef.current.length > 10) {
      stateHistoryRef.current = stateHistoryRef.current.slice(-10);
    }
  }, [updateState]);

  /**
   * Initialize state from persistence
   */
  useEffect(() => {
    if (isInitializedRef.current) return;

    const initializeState = async () => {
      try {
        const persistedState = await loadPersistedState();
        setState(persistedState);
        isInitializedRef.current = true;
      } catch (error) {
        console.error('Error initializing discovery state:', error);
        setState(createDefaultDiscoveryState());
        isInitializedRef.current = true;
      }
    };

    initializeState();
  }, [loadPersistedState]);

  /**
   * Set up periodic memory cleanup
   */
  useEffect(() => {
    // Clean up memory every 5 minutes
    cleanupIntervalRef.current = setInterval(cleanupMemory, 5 * 60 * 1000);

    return () => {
      if (cleanupIntervalRef.current) {
        clearInterval(cleanupIntervalRef.current);
      }
    };
  }, [cleanupMemory]);

  /**
   * Listen to history changes
   */
  useEffect(() => {
    const handleHistoryChange = (newHistory) => {
      updateState({ history: newHistory });
    };

    historyService.addListener(handleHistoryChange);

    return () => {
      historyService.removeListener(handleHistoryChange);
    };
  }, [updateState]);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      // Clear timeouts
      if (persistenceTimeoutRef.current) {
        clearTimeout(persistenceTimeoutRef.current);
      }
      
      if (cleanupIntervalRef.current) {
        clearInterval(cleanupIntervalRef.current);
      }

      // Clear state history
      stateHistoryRef.current = [];
    };
  }, []);

  return {
    // State
    state,
    
    // Sample management
    setSamples,
    setCurrentSample,
    fetchSamples,
    
    // Filter management
    setFilters,
    
    // UI state management
    setLoading,
    setError,
    setOnline,
    setUseMockData,
    
    // Favorites management
    addToFavorites,
    removeFromFavorites,
    clearFavorites,
    
    // History management
    clearHistory,
    
    // Utility functions
    resetState,
    getStateStats,
    cleanupMemory,
    
    // Computed values
    isInitialized: isInitializedRef.current,
    hasError: Boolean(state.error),
    isEmpty: state.samples.length === 0,
    hasFavorites: state.favorites.length > 0,
    hasHistory: state.history.length > 0
  };
}

export default useDiscoveryState;