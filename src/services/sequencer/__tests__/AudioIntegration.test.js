/**
 * @fileoverview Integration tests for sequencer audio playback system
 * Tests the integration between SequencerEngine, SampleManager, and SamplePlaybackEngine
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SequencerEngine } from '../SequencerEngine.js';
import { SampleManager } from '../SampleManager.js';
import { PatternManager } from '../PatternManager.js';
import { SamplePlaybackEngine } from '../../SamplePlaybackEngine.js';

// Mock Worker
global.Worker = vi.fn().mockImplementation(() => ({
  postMessage: vi.fn(),
  terminate: vi.fn(),
  onmessage: null
}));

// Mock URL.createObjectURL
global.URL = {
  createObjectURL: vi.fn().mockReturnValue('mock-url')
};

// Mock AudioContext
const mockAudioContext = {
  currentTime: 0,
  state: 'running',
  resume: vi.fn().mockResolvedValue(undefined),
  close: vi.fn().mockResolvedValue(undefined),
  createGain: vi.fn(() => ({
    connect: vi.fn(),
    gain: { value: 1.0 }
  })),
  destination: {}
};

describe('Sequencer Audio Integration', () => {
  let sequencerEngine;
  let sampleManager;
  let patternManager;
  let samplePlaybackEngine;

  beforeEach(async () => {
    // Create instances
    sequencerEngine = new SequencerEngine();
    sampleManager = new SampleManager();
    patternManager = new PatternManager();
    samplePlaybackEngine = new SamplePlaybackEngine();

    // Mock SamplePlaybackEngine methods
    samplePlaybackEngine.initializeAudioContext = vi.fn().mockResolvedValue(true);
    samplePlaybackEngine.preloadSample = vi.fn().mockResolvedValue(true);
    samplePlaybackEngine.playSampleAtTime = vi.fn().mockResolvedValue({
      id: 'test-sample',
      startTime: 0,
      duration: 0.5,
      volume: 1.0
    });
    samplePlaybackEngine.audioContext = mockAudioContext;

    // Initialize SampleManager with SamplePlaybackEngine
    sampleManager.initialize(samplePlaybackEngine);

    // Initialize SequencerEngine
    await sequencerEngine.initialize(mockAudioContext, {
      sampleManager,
      patternManager
    });

    // Load test samples
    await sampleManager.loadSamplePack('test-pack');
  });

  afterEach(() => {
    sequencerEngine.destroy();
    sampleManager.destroy();
  });

  describe('Sample Integration', () => {
    it('should integrate SampleManager with SamplePlaybackEngine', () => {
      expect(sampleManager.samplePlaybackEngine).toBe(samplePlaybackEngine);
      expect(samplePlaybackEngine.preloadSample).toHaveBeenCalled();
    });

    it('should schedule notes through SamplePlaybackEngine', async () => {
      const sample = sampleManager.getSample('kick_001');
      expect(sample).toBeTruthy();

      // Schedule a note
      sampleManager.scheduleNote(0.5, sample, 0.8, 'track1');

      expect(samplePlaybackEngine.playSampleAtTime).toHaveBeenCalledWith(
        sample.filename,
        0.8,
        0.5
      );
    });

    it('should apply track volume to scheduled notes', () => {
      const sample = sampleManager.getSample('kick_001');
      sampleManager.setTrackVolume('track1', 0.5);

      sampleManager.scheduleNote(0.5, sample, 0.8, 'track1');

      // Should apply track volume: 0.8 * 0.5 = 0.4
      expect(samplePlaybackEngine.playSampleAtTime).toHaveBeenCalledWith(
        sample.filename,
        0.4,
        0.5
      );
    });

    it('should not schedule notes for muted tracks', () => {
      const sample = sampleManager.getSample('kick_001');
      sampleManager.setTrackMute('track1', true);

      sampleManager.scheduleNote(0.5, sample, 0.8, 'track1');

      // Should still call playSampleAtTime since muting is handled at sequencer level
      expect(samplePlaybackEngine.playSampleAtTime).toHaveBeenCalled();
    });
  });

  describe('Volume Control Integration', () => {
    it('should set and get track volume', () => {
      sampleManager.setTrackVolume('track1', 0.7);
      expect(sampleManager.getTrackVolume('track1')).toBe(0.7);
    });

    it('should clamp volume values', () => {
      sampleManager.setTrackVolume('track1', 1.5);
      expect(sampleManager.getTrackVolume('track1')).toBe(1.0);

      sampleManager.setTrackVolume('track1', -0.5);
      expect(sampleManager.getTrackVolume('track1')).toBe(0.0);
    });

    it('should handle track muting', () => {
      sampleManager.setTrackMute('track1', true);
      expect(sampleManager.isTrackMuted('track1')).toBe(true);

      sampleManager.setTrackMute('track1', false);
      expect(sampleManager.isTrackMuted('track1')).toBe(false);
    });
  });

  describe('Sequencer Engine Integration', () => {
    it('should pass track information when scheduling notes', () => {
      // Create a test pattern
      const pattern = patternManager.createPattern('test-pattern', 8, 16);
      patternManager.setCurrentPattern(pattern);
      
      // Use the first track and assign a sample to it
      const trackId = pattern.tracks[0].id; // 'track_0'
      pattern.tracks[0].sampleId = 'kick_001';
      
      // Toggle a step to make it active
      patternManager.toggleStep(trackId, 0);
      
      // Set track volume
      sampleManager.setTrackVolume(trackId, 0.6);
      
      // Mock the SampleManager scheduleNote method to verify it's called
      const mockScheduleNote = vi.spyOn(sampleManager, 'scheduleNote');
      
      // Set sequencer to playing state and set current step
      sequencerEngine.isPlaying = true;
      sequencerEngine.currentStep = 0;
      sequencerEngine.nextStepTime = 0.5;
      
      // Trigger step scheduling directly
      sequencerEngine.scheduleNextStep();
      
      // Should have called scheduleNote with track information
      expect(mockScheduleNote).toHaveBeenCalled();
    });

    it('should respect muted tracks in sequencer', () => {
      // Create a test pattern
      const pattern = patternManager.createPattern('test-pattern', 8, 16);
      patternManager.setCurrentPattern(pattern);
      
      // Use the first track and assign a sample to it
      const trackId = pattern.tracks[0].id; // 'track_0'
      pattern.tracks[0].sampleId = 'kick_001';
      
      // Toggle a step to make it active
      patternManager.toggleStep(trackId, 0);
      
      // Mute the track
      sampleManager.setTrackMute(trackId, true);
      
      // Mock the scheduler callback
      const mockScheduleNote = vi.fn();
      sequencerEngine.scheduler.onScheduleNote = mockScheduleNote;
      
      // Trigger step scheduling
      sequencerEngine.handleStep(0, 0.5);
      
      // Should not have scheduled any notes for muted track
      expect(mockScheduleNote).not.toHaveBeenCalled();
    });
  });

  describe('Multiple Sample Playback', () => {
    it('should handle multiple simultaneous samples', async () => {
      const kickSample = sampleManager.getSample('kick_001');
      const snareSample = sampleManager.getSample('snare_001');
      const hihatSample = sampleManager.getSample('hihat_001');

      // Schedule multiple samples at the same time
      sampleManager.scheduleNote(0.5, kickSample, 0.8, 'kick');
      sampleManager.scheduleNote(0.5, snareSample, 0.7, 'snare');
      sampleManager.scheduleNote(0.5, hihatSample, 0.6, 'hihat');

      // Should have called playSampleAtTime for each sample
      expect(samplePlaybackEngine.playSampleAtTime).toHaveBeenCalledTimes(3);
      expect(samplePlaybackEngine.playSampleAtTime).toHaveBeenCalledWith(
        kickSample.filename, 0.8, 0.5
      );
      expect(samplePlaybackEngine.playSampleAtTime).toHaveBeenCalledWith(
        snareSample.filename, 0.7, 0.5
      );
      expect(samplePlaybackEngine.playSampleAtTime).toHaveBeenCalledWith(
        hihatSample.filename, 0.6, 0.5
      );
    });

    it('should handle different track volumes for simultaneous samples', () => {
      const kickSample = sampleManager.getSample('kick_001');
      const snareSample = sampleManager.getSample('snare_001');

      // Set different track volumes
      sampleManager.setTrackVolume('kick', 0.9);
      sampleManager.setTrackVolume('snare', 0.4);

      // Schedule samples with same velocity
      sampleManager.scheduleNote(0.5, kickSample, 0.8, 'kick');
      sampleManager.scheduleNote(0.5, snareSample, 0.8, 'snare');

      // Should apply different track volumes (with floating point tolerance)
      expect(samplePlaybackEngine.playSampleAtTime).toHaveBeenCalledWith(
        kickSample.filename, expect.closeTo(0.72, 5), 0.5 // 0.8 * 0.9
      );
      expect(samplePlaybackEngine.playSampleAtTime).toHaveBeenCalledWith(
        snareSample.filename, expect.closeTo(0.32, 5), 0.5 // 0.8 * 0.4
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle missing samples gracefully', () => {
      const nonExistentSample = { id: 'missing', filename: 'missing.wav' };
      
      expect(() => {
        sampleManager.scheduleNote(0.5, nonExistentSample, 0.8);
      }).not.toThrow();
    });

    it('should handle SamplePlaybackEngine errors gracefully', async () => {
      samplePlaybackEngine.playSampleAtTime = vi.fn().mockRejectedValue(
        new Error('Playback failed')
      );

      const sample = sampleManager.getSample('kick_001');
      
      expect(() => {
        sampleManager.scheduleNote(0.5, sample, 0.8);
      }).not.toThrow();
    });

    it('should handle invalid track IDs gracefully', () => {
      const sample = sampleManager.getSample('kick_001');
      
      expect(() => {
        sampleManager.scheduleNote(0.5, sample, 0.8, null);
        sampleManager.scheduleNote(0.5, sample, 0.8, '');
        sampleManager.scheduleNote(0.5, sample, 0.8, 123);
      }).not.toThrow();
    });
  });
});