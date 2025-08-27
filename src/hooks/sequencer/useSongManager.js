/**
 * @fileoverview Hook for managing song functionality
 * Provides song management, pattern chaining, and song mode controls
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { SongManager } from '../../services/sequencer/SongManager.js';

/**
 * Hook for managing song functionality
 * @param {Object} dependencies - Service dependencies
 * @returns {Object} Song management interface
 */
export const useSongManager = (dependencies = {}) => {
  const [songState, setSongState] = useState({
    currentSong: null,
    isSongMode: false,
    currentSongPosition: 0,
    currentPatternLoop: 0,
    totalSections: 0,
    currentSection: null
  });

  const [songs, setSongs] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const songManagerRef = useRef(null);

  // Initialize song manager
  useEffect(() => {
    if (!songManagerRef.current) {
      songManagerRef.current = new SongManager();
      songManagerRef.current.initialize(dependencies);

      // Set up callbacks
      songManagerRef.current.onSongChange((state) => {
        setSongState(state);
      });

      songManagerRef.current.onPatternTransition((fromSection, toSection, transitionType) => {
        console.log(`Pattern transition: ${fromSection} -> ${toSection} (${transitionType})`);
      });
    }

    return () => {
      if (songManagerRef.current) {
        songManagerRef.current.destroy();
        songManagerRef.current = null;
      }
    };
  }, [dependencies]);

  // Create a new song
  const createSong = useCallback(async (songData) => {
    if (!songManagerRef.current) return null;

    try {
      setIsLoading(true);
      setError(null);

      const { name, patternIds, defaultLoops, defaultTransition } = songData;
      
      const song = songManagerRef.current.createSong(name, patternIds, {
        defaultLoops,
        defaultTransition
      });

      // Update songs list
      setSongs(prev => [...prev, song]);

      return song;
    } catch (err) {
      setError(err.message);
      console.error('Error creating song:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load a song
  const loadSong = useCallback(async (songId) => {
    if (!songManagerRef.current) return null;

    try {
      setIsLoading(true);
      setError(null);

      const song = await songManagerRef.current.loadSong(songId);
      return song;
    } catch (err) {
      setError(err.message);
      console.error('Error loading song:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Delete a song
  const deleteSong = useCallback((songId) => {
    if (!songManagerRef.current) return false;

    try {
      const success = songManagerRef.current.deleteSong(songId);
      
      if (success) {
        setSongs(prev => prev.filter(song => song.id !== songId));
      }

      return success;
    } catch (err) {
      setError(err.message);
      console.error('Error deleting song:', err);
      return false;
    }
  }, []);

  // Toggle song mode
  const toggleSongMode = useCallback((enabled) => {
    if (!songManagerRef.current) return;

    try {
      if (enabled) {
        songManagerRef.current.enableSongMode();
      } else {
        songManagerRef.current.disableSongMode();
      }
    } catch (err) {
      setError(err.message);
      console.error('Error toggling song mode:', err);
    }
  }, []);

  // Add pattern to current song
  const addPatternToSong = useCallback((patternId, options = {}) => {
    if (!songManagerRef.current) return;

    try {
      songManagerRef.current.addPatternToSong(patternId, options);
      
      // Update songs list
      const updatedSongs = songManagerRef.current.getAllSongs();
      setSongs(updatedSongs);
    } catch (err) {
      setError(err.message);
      console.error('Error adding pattern to song:', err);
    }
  }, []);

  // Remove pattern from current song
  const removePatternFromSong = useCallback((index) => {
    if (!songManagerRef.current) return;

    try {
      songManagerRef.current.removePatternFromSong(index);
      
      // Update songs list
      const updatedSongs = songManagerRef.current.getAllSongs();
      setSongs(updatedSongs);
    } catch (err) {
      setError(err.message);
      console.error('Error removing pattern from song:', err);
    }
  }, []);

  // Move pattern within song
  const movePatternInSong = useCallback((fromIndex, toIndex) => {
    if (!songManagerRef.current) return;

    try {
      songManagerRef.current.movePatternInSong(fromIndex, toIndex);
      
      // Update songs list
      const updatedSongs = songManagerRef.current.getAllSongs();
      setSongs(updatedSongs);
    } catch (err) {
      setError(err.message);
      console.error('Error moving pattern in song:', err);
    }
  }, []);

  // Update section properties
  const updateSection = useCallback((index, updates) => {
    if (!songManagerRef.current) return;

    try {
      songManagerRef.current.updateSection(index, updates);
      
      // Update songs list
      const updatedSongs = songManagerRef.current.getAllSongs();
      setSongs(updatedSongs);
    } catch (err) {
      setError(err.message);
      console.error('Error updating section:', err);
    }
  }, []);

  // Jump to specific section
  const jumpToSection = useCallback(async (sectionIndex) => {
    if (!songManagerRef.current) return;

    try {
      await songManagerRef.current.jumpToSection(sectionIndex);
    } catch (err) {
      setError(err.message);
      console.error('Error jumping to section:', err);
    }
  }, []);

  // Get all songs
  const getAllSongs = useCallback(() => {
    if (!songManagerRef.current) return [];
    return songManagerRef.current.getAllSongs();
  }, []);

  // Refresh songs list
  const refreshSongs = useCallback(() => {
    if (!songManagerRef.current) return;
    
    const allSongs = songManagerRef.current.getAllSongs();
    setSongs(allSongs);
  }, []);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Get current song manager instance (for advanced usage)
  const getSongManager = useCallback(() => {
    return songManagerRef.current;
  }, []);

  return {
    // State
    songState,
    songs,
    isLoading,
    error,

    // Actions
    createSong,
    loadSong,
    deleteSong,
    toggleSongMode,
    addPatternToSong,
    removePatternFromSong,
    movePatternInSong,
    updateSection,
    jumpToSection,
    getAllSongs,
    refreshSongs,
    clearError,
    getSongManager
  };
};