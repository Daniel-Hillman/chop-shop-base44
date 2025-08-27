/**
 * @fileoverview Tests for SongManager service
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SongManager } from '../SongManager.js';

// Mock dependencies
const mockPatternManager = {
  patterns: new Map(),
  loadPattern: vi.fn(),
  getCurrentPattern: vi.fn()
};

const mockSequencerEngine = {
  onStep: vi.fn(),
  stop: vi.fn(),
  start: vi.fn()
};

describe('SongManager', () => {
  let songManager;

  beforeEach(() => {
    songManager = new SongManager();
    songManager.initialize({
      patternManager: mockPatternManager,
      sequencerEngine: mockSequencerEngine
    });
    
    // Reset mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    songManager.destroy();
  });

  describe('Song Creation', () => {
    it('should create a new song with valid parameters', () => {
      const song = songManager.createSong('Test Song', ['pattern1', 'pattern2']);
      
      expect(song).toBeDefined();
      expect(song.name).toBe('Test Song');
      expect(song.patterns).toHaveLength(2);
      expect(song.patterns[0].patternId).toBe('pattern1');
      expect(song.patterns[1].patternId).toBe('pattern2');
      expect(song.id).toMatch(/^song_/);
    });

    it('should create song with default options', () => {
      const song = songManager.createSong('Test Song', ['pattern1']);
      
      expect(song.patterns[0].loops).toBe(1);
      expect(song.patterns[0].transitionType).toBe('immediate');
      expect(song.patterns[0].transitionBars).toBe(0);
    });

    it('should create song with custom options', () => {
      const options = {
        defaultLoops: 4,
        defaultTransition: 'fade',
        defaultTransitionBars: 2,
        bpm: 140
      };
      
      const song = songManager.createSong('Test Song', ['pattern1'], options);
      
      expect(song.patterns[0].loops).toBe(4);
      expect(song.patterns[0].transitionType).toBe('fade');
      expect(song.patterns[0].transitionBars).toBe(2);
      expect(song.metadata.bpm).toBe(140);
    });

    it('should throw error for invalid song name', () => {
      expect(() => songManager.createSong('', ['pattern1'])).toThrow('Song name is required');
      expect(() => songManager.createSong(null, ['pattern1'])).toThrow('Song name is required');
    });

    it('should throw error for invalid pattern IDs', () => {
      expect(() => songManager.createSong('Test', 'not-array')).toThrow('Pattern IDs must be an array');
    });
  });

  describe('Song Loading', () => {
    it('should load an existing song', async () => {
      // Create a song first
      const song = songManager.createSong('Test Song', ['pattern1']);
      
      // Mock pattern manager to have the pattern
      mockPatternManager.patterns.set('pattern1', { id: 'pattern1', name: 'Pattern 1' });
      mockPatternManager.loadPattern.mockResolvedValue({ id: 'pattern1', name: 'Pattern 1' });
      
      const loadedSong = await songManager.loadSong(song.id);
      
      expect(loadedSong).toBeDefined();
      expect(loadedSong.id).toBe(song.id);
      expect(songManager.currentSong).toBe(song);
      expect(songManager.currentSongPosition).toBe(0);
      expect(mockPatternManager.loadPattern).toHaveBeenCalledWith('pattern1');
    });

    it('should throw error for non-existent song', async () => {
      await expect(songManager.loadSong('non-existent')).rejects.toThrow('Song with ID non-existent not found');
    });

    it('should throw error for song with missing patterns', async () => {
      const song = songManager.createSong('Test Song', ['missing-pattern']);
      
      await expect(songManager.loadSong(song.id)).rejects.toThrow('Pattern missing-pattern not found');
    });
  });

  describe('Song Mode', () => {
    it('should enable song mode', () => {
      const song = songManager.createSong('Test Song', ['pattern1']);
      songManager.currentSong = song;
      
      songManager.enableSongMode();
      
      expect(songManager.isSongMode).toBe(true);
      expect(songManager.currentSongPosition).toBe(0);
      expect(songManager.currentPatternLoop).toBe(0);
    });

    it('should disable song mode', () => {
      songManager.isSongMode = true;
      
      songManager.disableSongMode();
      
      expect(songManager.isSongMode).toBe(false);
    });

    it('should throw error when enabling song mode without loaded song', () => {
      expect(() => songManager.enableSongMode()).toThrow('No song is currently loaded');
    });
  });

  describe('Pattern Management', () => {
    let song;

    beforeEach(() => {
      song = songManager.createSong('Test Song', ['pattern1']);
      songManager.currentSong = song;
    });

    it('should add pattern to song', () => {
      songManager.addPatternToSong('pattern2', { loops: 2, transitionType: 'fade' });
      
      expect(song.patterns).toHaveLength(2);
      expect(song.patterns[1].patternId).toBe('pattern2');
      expect(song.patterns[1].loops).toBe(2);
      expect(song.patterns[1].transitionType).toBe('fade');
    });

    it('should remove pattern from song', () => {
      songManager.addPatternToSong('pattern2');
      songManager.removePatternFromSong(0);
      
      expect(song.patterns).toHaveLength(1);
      expect(song.patterns[0].patternId).toBe('pattern2');
    });

    it('should move pattern within song', () => {
      songManager.addPatternToSong('pattern2');
      songManager.addPatternToSong('pattern3');
      
      songManager.movePatternInSong(0, 2);
      
      expect(song.patterns[0].patternId).toBe('pattern2');
      expect(song.patterns[1].patternId).toBe('pattern3');
      expect(song.patterns[2].patternId).toBe('pattern1');
    });

    it('should update section properties', () => {
      songManager.updateSection(0, { loops: 4, transitionType: 'crossfade' });
      
      expect(song.patterns[0].loops).toBe(4);
      expect(song.patterns[0].transitionType).toBe('crossfade');
    });

    it('should throw error for invalid section index', () => {
      expect(() => songManager.updateSection(5, { loops: 2 })).toThrow('Invalid section index');
    });
  });

  describe('Section Navigation', () => {
    let song;

    beforeEach(() => {
      song = songManager.createSong('Test Song', ['pattern1', 'pattern2']);
      songManager.currentSong = song;
      songManager.isSongMode = true;
      
      // Mock pattern manager
      mockPatternManager.loadPattern.mockResolvedValue({ id: 'pattern2', name: 'Pattern 2' });
    });

    it('should jump to specific section', async () => {
      await songManager.jumpToSection(1);
      
      expect(songManager.currentSongPosition).toBe(1);
      expect(songManager.currentPatternLoop).toBe(0);
      expect(mockPatternManager.loadPattern).toHaveBeenCalledWith('pattern2');
      expect(mockSequencerEngine.stop).toHaveBeenCalled();
    });

    it('should throw error for invalid section index', async () => {
      await expect(songManager.jumpToSection(5)).rejects.toThrow('Invalid section index');
    });

    it('should throw error when not in song mode', async () => {
      songManager.isSongMode = false;
      
      await expect(songManager.jumpToSection(1)).rejects.toThrow('Song mode is not active');
    });
  });

  describe('Song State', () => {
    it('should return current song state', () => {
      const song = songManager.createSong('Test Song', ['pattern1', 'pattern2']);
      songManager.currentSong = song;
      songManager.isSongMode = true;
      songManager.currentSongPosition = 1;
      songManager.currentPatternLoop = 2;
      
      const state = songManager.getSongState();
      
      expect(state.currentSong).toBe(song);
      expect(state.isSongMode).toBe(true);
      expect(state.currentSongPosition).toBe(1);
      expect(state.currentPatternLoop).toBe(2);
      expect(state.totalSections).toBe(2);
      expect(state.currentSection).toBe(song.patterns[1]);
    });
  });

  describe('Song Management', () => {
    it('should get all songs', () => {
      const song1 = songManager.createSong('Song 1', ['pattern1']);
      const song2 = songManager.createSong('Song 2', ['pattern2']);
      
      const allSongs = songManager.getAllSongs();
      
      expect(allSongs).toHaveLength(2);
      expect(allSongs).toContain(song1);
      expect(allSongs).toContain(song2);
    });

    it('should delete a song', () => {
      const song = songManager.createSong('Test Song', ['pattern1']);
      
      const result = songManager.deleteSong(song.id);
      
      expect(result).toBe(true);
      expect(songManager.getAllSongs()).toHaveLength(0);
    });

    it('should clear current song when deleting current song', () => {
      const song = songManager.createSong('Test Song', ['pattern1']);
      songManager.currentSong = song;
      
      songManager.deleteSong(song.id);
      
      expect(songManager.currentSong).toBeNull();
      expect(songManager.currentSongPosition).toBe(0);
      expect(songManager.isSongMode).toBe(false);
    });
  });

  describe('Callbacks', () => {
    it('should register and call song change callbacks', () => {
      const callback = vi.fn();
      songManager.onSongChange(callback);
      
      const song = songManager.createSong('Test Song', ['pattern1']);
      songManager.currentSong = song;
      songManager.notifySongChange();
      
      expect(callback).toHaveBeenCalledWith(expect.objectContaining({
        currentSong: song,
        isSongMode: false
      }));
    });

    it('should register and call pattern transition callbacks', () => {
      const callback = vi.fn();
      songManager.onPatternTransition(callback);
      
      songManager.notifyPatternTransition(0, 1, 'fade');
      
      expect(callback).toHaveBeenCalledWith(0, 1, 'fade');
    });

    it('should remove callbacks', () => {
      const callback = vi.fn();
      songManager.onSongChange(callback);
      songManager.removeSongChangeCallback(callback);
      
      songManager.notifySongChange();
      
      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('Cleanup', () => {
    it('should clean up resources on destroy', () => {
      const song = songManager.createSong('Test Song', ['pattern1']);
      songManager.currentSong = song;
      songManager.isSongMode = true;
      
      // Set up a timeout to simulate pending transition
      songManager.transitionScheduleId = setTimeout(() => {}, 1000);
      
      songManager.destroy();
      
      expect(songManager.songs.size).toBe(0);
      expect(songManager.currentSong).toBeNull();
      expect(songManager.isSongMode).toBe(false);
      expect(songManager.songChangeCallbacks).toHaveLength(0);
      expect(songManager.patternTransitionCallbacks).toHaveLength(0);
    });
  });
});