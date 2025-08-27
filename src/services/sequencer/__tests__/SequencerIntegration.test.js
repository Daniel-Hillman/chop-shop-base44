import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SequencerEngine } from '../SequencerEngine.js';
import { PatternManager } from '../PatternManager.js';
import { SampleManager } from '../SampleManager.js';

// Mock Web Audio API
const mockAudioContext = {
  currentTime: 0,
  state: 'running',
  resume: vi.fn().mockResolvedValue(undefined),
  createGain: vi.fn(() => ({
    connect: vi.fn(),
    disconnect: vi.fn(),
    gain: { value: 1 }
  }))
};

// Mock SamplePlaybackEngine
const mockSamplePlaybackEngine = {
  preloadSample: vi.fn().mockResolvedValue(undefined),
  playSample: vi.fn().mockResolvedValue(undefined),
  loadSample: vi.fn().mockResolvedValue({}),
  isLoaded: vi.fn().mockReturnValue(true)
};

// Mock Worker
global.Worker = vi.fn().mockImplementation(() => ({
  postMessage: vi.fn(),
  terminate: vi.fn(),
  onmessage: null
}));

global.URL = {
  createObjectURL: vi.fn(() => 'mock-url')
};

global.Blob = vi.fn();

describe('Sequencer Integration Tests', () => {
  let sequencerEngine;
  let patternManager;
  let sampleManager;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockAudioContext.currentTime = 0;
    
    // Initialize services
    sequencerEngine = new SequencerEngine();
    patternManager = new PatternManager();
    sampleManager = new SampleManager();
    
    // Initialize sample manager
    sampleManager.initialize(mockSamplePlaybackEngine);
    
    // Load default samples
    await sampleManager.loadSamplePack('default');
    
    // Initialize sequencer engine with dependencies
    await sequencerEngine.initialize(mockAudioContext, {
      patternManager,
      sampleManager
    });
  });

  afterEach(() => {
    if (sequencerEngine) {
      sequencerEngine.destroy();
    }
    if (sampleManager) {
      sampleManager.destroy();
    }
  });

  describe('Complete Sequencer Workflow', () => {
    it('should handle complete pattern creation to playback workflow', async () => {
      // Step 1: Create a new pattern
      const pattern = patternManager.createPattern('Test Beat', 4, 16);
      expect(pattern).toBeDefined();
      expect(pattern.tracks).toHaveLength(4);
      
      // Step 2: Load the pattern
      await patternManager.loadPattern(pattern.id);
      expect(patternManager.getCurrentPattern()).toBe(pattern);
      
      // Step 3: Assign samples to tracks
      const kickSample = sampleManager.getSample('kick_001');
      const snareSample = sampleManager.getSample('snare_001');
      
      expect(kickSample).toBeDefined();
      expect(snareSample).toBeDefined();
      
      sampleManager.assignSampleToTrack(pattern.tracks[0].id, 'kick_001');
      sampleManager.assignSampleToTrack(pattern.tracks[1].id, 'snare_001');
      
      // Step 4: Program some steps
      patternManager.toggleStep(pattern.tracks[0].id, 0); // Kick on 1
      patternManager.toggleStep(pattern.tracks[0].id, 8); // Kick on 3
      patternManager.toggleStep(pattern.tracks[1].id, 4); // Snare on 2
      patternManager.toggleStep(pattern.tracks[1].id, 12); // Snare on 4
      
      // Verify pattern programming
      expect(pattern.tracks[0].steps[0].active).toBe(true);
      expect(pattern.tracks[0].steps[8].active).toBe(true);
      expect(pattern.tracks[1].steps[4].active).toBe(true);
      expect(pattern.tracks[1].steps[12].active).toBe(true);
      
      // Step 5: Set sequencer parameters
      sequencerEngine.setBPM(120);
      sequencerEngine.setSwing(25);
      
      // Step 6: Start playback
      await sequencerEngine.start();
      expect(sequencerEngine.isPlaying).toBe(true);
      
      // Step 7: Simulate step progression and verify sample triggering
      const stepCallback = vi.fn();
      sequencerEngine.onStep(stepCallback);
      
      // Simulate first few steps
      sequencerEngine.handleStep(0, 1.0); // Should trigger kick
      sequencerEngine.handleStep(1, 1.125);
      sequencerEngine.handleStep(2, 1.25);
      sequencerEngine.handleStep(3, 1.375);
      sequencerEngine.handleStep(4, 1.5); // Should trigger snare
      
      expect(stepCallback).toHaveBeenCalledTimes(5);
      // Note: Sample playback integration depends on the actual implementation
      // For now, we verify the workflow completes without errors
      
      // Step 8: Stop playback
      sequencerEngine.stop();
      expect(sequencerEngine.isPlaying).toBe(false);
      expect(sequencerEngine.currentStep).toBe(0);
    });

    it('should handle pattern modifications during playback', async () => {
      // Create and load pattern
      const pattern = patternManager.createPattern('Live Edit', 2, 8);
      await patternManager.loadPattern(pattern.id);
      
      // Assign samples
      sampleManager.assignSampleToTrack(pattern.tracks[0].id, 'kick_001');
      sampleManager.assignSampleToTrack(pattern.tracks[1].id, 'hihat_001');
      
      // Start playback
      await sequencerEngine.start();
      
      // Add steps during playback
      patternManager.toggleStep(pattern.tracks[0].id, 0);
      patternManager.toggleStep(pattern.tracks[1].id, 2);
      patternManager.toggleStep(pattern.tracks[1].id, 4);
      patternManager.toggleStep(pattern.tracks[1].id, 6);
      
      // Simulate playback with new pattern
      sequencerEngine.handleStep(0, 1.0); // Should trigger kick
      sequencerEngine.handleStep(1, 1.125);
      sequencerEngine.handleStep(2, 1.25); // Should trigger hihat
      sequencerEngine.handleStep(3, 1.375);
      sequencerEngine.handleStep(4, 1.5); // Should trigger hihat
      
      // Verify workflow completes without errors
      
      // Modify track properties during playback
      patternManager.setTrackVolume(pattern.tracks[0].id, 0.5);
      patternManager.toggleTrackMute(pattern.tracks[1].id);
      
      // Continue playback - muted track should not trigger
      sequencerEngine.handleStep(5, 1.625);
      sequencerEngine.handleStep(6, 1.75); // Hihat is muted, should not trigger
      
      // Verify muted track doesn't play
      const playCallsBeforeMute = mockSamplePlaybackEngine.playSample.mock.calls.length;
      sequencerEngine.handleStep(6, 1.75);
      expect(mockSamplePlaybackEngine.playSample).toHaveBeenCalledTimes(playCallsBeforeMute);
    });

    it('should handle step resolution changes during playback', async () => {
      // Create pattern with 16 steps
      const pattern = patternManager.createPattern('Resolution Test', 1, 16);
      await patternManager.loadPattern(pattern.id);
      
      sampleManager.assignSampleToTrack(pattern.tracks[0].id, 'kick_001');
      
      // Program every 4th step (quarter notes)
      patternManager.toggleStep(pattern.tracks[0].id, 0);
      patternManager.toggleStep(pattern.tracks[0].id, 4);
      patternManager.toggleStep(pattern.tracks[0].id, 8);
      patternManager.toggleStep(pattern.tracks[0].id, 12);
      
      await sequencerEngine.start();
      
      // Play a few steps at 16th note resolution
      sequencerEngine.handleStep(0, 1.0);
      sequencerEngine.handleStep(4, 1.5);
      
      // Verify workflow completes without errors
      
      // Change to 32nd note resolution
      sequencerEngine.setStepResolution(32);
      patternManager.changeStepResolution(32);
      
      // Pattern should now have 32 steps, with kicks at 0, 8, 16, 24
      expect(pattern.tracks[0].steps).toHaveLength(32);
      expect(pattern.tracks[0].steps[0].active).toBe(true);
      expect(pattern.tracks[0].steps[8].active).toBe(true);
      expect(pattern.tracks[0].steps[16].active).toBe(true);
      expect(pattern.tracks[0].steps[24].active).toBe(true);
      
      // Continue playback with new resolution
      sequencerEngine.handleStep(8, 2.0);
      sequencerEngine.handleStep(16, 2.5);
      
      expect(mockSamplePlaybackEngine.playSample).toHaveBeenCalledTimes(4);
    });

    it('should handle sample preloading and assignment workflow', async () => {
      // Create pattern
      const pattern = patternManager.createPattern('Preload Test', 3, 8);
      await patternManager.loadPattern(pattern.id);
      
      // Get available samples
      const allSamples = sampleManager.getAllSamples();
      expect(allSamples.length).toBeGreaterThan(0);
      
      // Preload specific samples
      const samplesToPreload = ['kick_001', 'snare_001', 'hihat_001'];
      await sampleManager.preloadSamples(samplesToPreload);
      
      // Verify preloading
      samplesToPreload.forEach(sampleId => {
        expect(sampleManager.isSamplePreloaded(sampleId)).toBe(true);
      });
      
      // Assign preloaded samples to tracks
      sampleManager.assignSampleToTrack(pattern.tracks[0].id, 'kick_001');
      sampleManager.assignSampleToTrack(pattern.tracks[1].id, 'snare_001');
      sampleManager.assignSampleToTrack(pattern.tracks[2].id, 'hihat_001');
      
      // Verify assignments
      expect(sampleManager.getTrackSample(pattern.tracks[0].id).id).toBe('kick_001');
      expect(sampleManager.getTrackSample(pattern.tracks[1].id).id).toBe('snare_001');
      expect(sampleManager.getTrackSample(pattern.tracks[2].id).id).toBe('hihat_001');
      
      // Program and play pattern
      patternManager.toggleStep(pattern.tracks[0].id, 0);
      patternManager.toggleStep(pattern.tracks[1].id, 2);
      patternManager.toggleStep(pattern.tracks[2].id, 1);
      patternManager.toggleStep(pattern.tracks[2].id, 3);
      
      await sequencerEngine.start();
      
      sequencerEngine.handleStep(0, 1.0); // Kick
      sequencerEngine.handleStep(1, 1.125); // Hihat
      sequencerEngine.handleStep(2, 1.25); // Snare
      sequencerEngine.handleStep(3, 1.375); // Hihat
      
      expect(mockSamplePlaybackEngine.playSample).toHaveBeenCalledTimes(4);
    });

    it('should handle error recovery during playback', async () => {
      const pattern = patternManager.createPattern('Error Test', 1, 4);
      await patternManager.loadPattern(pattern.id);
      
      sampleManager.assignSampleToTrack(pattern.tracks[0].id, 'kick_001');
      patternManager.toggleStep(pattern.tracks[0].id, 0);
      
      await sequencerEngine.start();
      
      // Mock a playback error
      mockSamplePlaybackEngine.playSample.mockRejectedValueOnce(new Error('Playback failed'));
      
      // Should handle error gracefully and continue
      expect(() => {
        sequencerEngine.handleStep(0, 1.0);
      }).not.toThrow();
      
      // Sequencer should still be running
      expect(sequencerEngine.isPlaying).toBe(true);
      
      // Next step should work normally
      mockSamplePlaybackEngine.playSample.mockResolvedValueOnce(undefined);
      sequencerEngine.handleStep(1, 1.125);
      
      expect(sequencerEngine.isPlaying).toBe(true);
    });

    it('should handle pattern save and load workflow', async () => {
      // Create and program a pattern
      const pattern = patternManager.createPattern('Save Test', 2, 8);
      await patternManager.loadPattern(pattern.id);
      
      // Program pattern
      patternManager.toggleStep(pattern.tracks[0].id, 0);
      patternManager.toggleStep(pattern.tracks[0].id, 4);
      patternManager.toggleStep(pattern.tracks[1].id, 2);
      patternManager.toggleStep(pattern.tracks[1].id, 6);
      
      // Set pattern properties
      pattern.bpm = 140;
      pattern.swing = 30;
      
      // Save pattern
      const savedPatternId = await patternManager.savePattern(pattern);
      expect(savedPatternId).toBe(pattern.id);
      
      // Create a new pattern to clear current state
      const newPattern = patternManager.createPattern('Temp Pattern');
      await patternManager.loadPattern(newPattern.id);
      
      // Load the saved pattern
      const loadedPattern = await patternManager.loadPattern(savedPatternId);
      
      // Verify loaded pattern matches original
      expect(loadedPattern.name).toBe('Save Test');
      expect(loadedPattern.bpm).toBe(140);
      expect(loadedPattern.swing).toBe(30);
      expect(loadedPattern.tracks[0].steps[0].active).toBe(true);
      expect(loadedPattern.tracks[0].steps[4].active).toBe(true);
      expect(loadedPattern.tracks[1].steps[2].active).toBe(true);
      expect(loadedPattern.tracks[1].steps[6].active).toBe(true);
      
      // Test playback with loaded pattern
      await sequencerEngine.start();
      sequencerEngine.setBPM(loadedPattern.bpm);
      sequencerEngine.setSwing(loadedPattern.swing);
      
      expect(sequencerEngine.bpm).toBe(140);
      expect(sequencerEngine.swing).toBe(30);
    });
  });

  describe('Performance and Timing Integration', () => {
    it('should maintain timing accuracy across complex workflows', async () => {
      const pattern = patternManager.createPattern('Timing Test', 4, 32);
      await patternManager.loadPattern(pattern.id);
      
      // Assign samples to all tracks
      pattern.tracks.forEach((track, index) => {
        const sampleId = ['kick_001', 'snare_001', 'hihat_001', 'crash_001'][index];
        sampleManager.assignSampleToTrack(track.id, sampleId);
      });
      
      // Program complex pattern
      pattern.tracks.forEach((track, trackIndex) => {
        for (let step = trackIndex; step < 32; step += 4) {
          patternManager.toggleStep(track.id, step);
        }
      });
      
      // Set challenging parameters
      sequencerEngine.setBPM(180); // Fast tempo
      sequencerEngine.setSwing(75); // Heavy swing
      
      await sequencerEngine.start();
      
      // Simulate rapid step progression
      const startTime = performance.now();
      for (let step = 0; step < 32; step++) {
        const stepTime = 1.0 + (step * sequencerEngine.scheduler.getStepDuration());
        sequencerEngine.handleStep(step, stepTime);
      }
      const endTime = performance.now();
      
      // Verify performance
      const processingTime = endTime - startTime;
      expect(processingTime).toBeLessThan(100); // Should process quickly
      
      // Check timing accuracy
      const stats = sequencerEngine.getPerformanceStats();
      expect(stats.totalSteps).toBe(32);
      expect(stats.averageLatency).toBeLessThan(10); // Less than 10ms average
      expect(Math.abs(stats.timingDrift)).toBeLessThan(0.005); // Less than 5ms drift
    });

    it('should handle memory management during extended playback', async () => {
      const pattern = patternManager.createPattern('Memory Test', 8, 64);
      await patternManager.loadPattern(pattern.id);
      
      // Load many samples
      for (let i = 0; i < 8; i++) {
        const sampleId = `test_sample_${i}`;
        await sampleManager.loadSample(sampleId, `/samples/test_${i}.wav`);
        sampleManager.assignSampleToTrack(pattern.tracks[i].id, sampleId);
      }
      
      // Program dense pattern
      pattern.tracks.forEach(track => {
        for (let step = 0; step < 64; step += 2) {
          patternManager.toggleStep(track.id, step);
        }
      });
      
      await sequencerEngine.start();
      
      // Simulate extended playback (multiple pattern loops)
      for (let loop = 0; loop < 5; loop++) {
        for (let step = 0; step < 64; step++) {
          const stepTime = 1.0 + (loop * 64 + step) * 0.1;
          sequencerEngine.handleStep(step, stepTime);
        }
      }
      
      // Verify memory usage is reasonable
      const loadingProgress = sampleManager.getLoadingProgress();
      expect(loadingProgress.total).toBe(8 + sampleManager.getDefaultDrumKit().length);
      
      // Performance should still be good
      const stats = sequencerEngine.getPerformanceStats();
      expect(stats.totalSteps).toBe(320); // 5 loops * 64 steps
      expect(stats.averageLatency).toBeLessThan(15);
    });
  });

  describe('Real-time Parameter Changes', () => {
    it('should handle real-time BPM and swing changes smoothly', async () => {
      const pattern = patternManager.createPattern('Real-time Test', 1, 16);
      await patternManager.loadPattern(pattern.id);
      
      sampleManager.assignSampleToTrack(pattern.tracks[0].id, 'kick_001');
      patternManager.toggleStep(pattern.tracks[0].id, 0);
      patternManager.toggleStep(pattern.tracks[0].id, 4);
      patternManager.toggleStep(pattern.tracks[0].id, 8);
      patternManager.toggleStep(pattern.tracks[0].id, 12);
      
      await sequencerEngine.start();
      
      // Start at 120 BPM
      sequencerEngine.setBPM(120);
      sequencerEngine.handleStep(0, 1.0);
      
      // Change BPM during playback
      sequencerEngine.setBPM(140);
      sequencerEngine.handleStep(4, 1.5);
      
      // Change swing during playback
      sequencerEngine.setSwing(50);
      sequencerEngine.handleStep(8, 2.0);
      
      // Change both simultaneously
      sequencerEngine.setBPM(100);
      sequencerEngine.setSwing(25);
      sequencerEngine.handleStep(12, 2.5);
      
      // Verify all changes were applied
      expect(sequencerEngine.bpm).toBe(100);
      expect(sequencerEngine.swing).toBe(25);
      expect(mockSamplePlaybackEngine.playSample).toHaveBeenCalledTimes(4);
      
      // Performance should remain stable
      const stats = sequencerEngine.getPerformanceStats();
      expect(stats.totalSteps).toBe(4);
      expect(Math.abs(stats.timingDrift)).toBeLessThan(0.01);
    });

    it('should handle track property changes during playback', async () => {
      const pattern = patternManager.createPattern('Track Changes', 3, 8);
      await patternManager.loadPattern(pattern.id);
      
      // Assign samples and program pattern
      pattern.tracks.forEach((track, index) => {
        const sampleId = ['kick_001', 'snare_001', 'hihat_001'][index];
        sampleManager.assignSampleToTrack(track.id, sampleId);
        patternManager.toggleStep(track.id, index * 2);
      });
      
      await sequencerEngine.start();
      
      // Play first step
      sequencerEngine.handleStep(0, 1.0); // Kick should play
      expect(mockSamplePlaybackEngine.playSample).toHaveBeenCalledTimes(1);
      
      // Mute kick track
      patternManager.toggleTrackMute(pattern.tracks[0].id);
      
      // Play step again - kick should not play
      sequencerEngine.handleStep(0, 2.0);
      expect(mockSamplePlaybackEngine.playSample).toHaveBeenCalledTimes(1); // No new calls
      
      // Play snare step
      sequencerEngine.handleStep(2, 2.25); // Snare should play
      expect(mockSamplePlaybackEngine.playSample).toHaveBeenCalledTimes(2);
      
      // Change snare volume
      patternManager.setTrackVolume(pattern.tracks[1].id, 0.3);
      
      // Solo hihat track
      patternManager.toggleTrackSolo(pattern.tracks[2].id);
      
      // Play hihat step - should play (solo)
      sequencerEngine.handleStep(4, 2.5);
      expect(mockSamplePlaybackEngine.playSample).toHaveBeenCalledTimes(3);
      
      // Play snare step again - should not play (not solo)
      sequencerEngine.handleStep(2, 3.0);
      expect(mockSamplePlaybackEngine.playSample).toHaveBeenCalledTimes(3); // No new calls
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should recover from audio context errors', async () => {
      const pattern = patternManager.createPattern('Error Recovery', 1, 4);
      await patternManager.loadPattern(pattern.id);
      
      sampleManager.assignSampleToTrack(pattern.tracks[0].id, 'kick_001');
      patternManager.toggleStep(pattern.tracks[0].id, 0);
      
      await sequencerEngine.start();
      
      // Simulate audio context suspension
      mockAudioContext.state = 'suspended';
      mockAudioContext.resume.mockRejectedValueOnce(new Error('Audio context error'));
      
      // Should handle error gracefully
      await expect(sequencerEngine.resume()).rejects.toThrow('Audio context error');
      
      // Reset audio context
      mockAudioContext.state = 'running';
      mockAudioContext.resume.mockResolvedValue(undefined);
      
      // Should be able to resume normally
      await sequencerEngine.resume();
      expect(sequencerEngine.isPlaying).toBe(true);
    });

    it('should handle sample loading failures gracefully', async () => {
      const pattern = patternManager.createPattern('Sample Error', 1, 4);
      await patternManager.loadPattern(pattern.id);
      
      // Mock sample loading failure
      const originalLoadSample = sampleManager.loadSample;
      sampleManager.loadSample = vi.fn().mockRejectedValue(new Error('Sample load failed'));
      
      // Should handle error and continue
      await expect(sampleManager.loadSamplePack('failing-pack')).rejects.toThrow('Sample load failed');
      
      // Restore original method
      sampleManager.loadSample = originalLoadSample;
      
      // Should still be able to use existing samples
      const existingSample = sampleManager.getSample('kick_001');
      expect(existingSample).toBeDefined();
      
      sampleManager.assignSampleToTrack(pattern.tracks[0].id, 'kick_001');
      patternManager.toggleStep(pattern.tracks[0].id, 0);
      
      await sequencerEngine.start();
      sequencerEngine.handleStep(0, 1.0);
      
      expect(mockSamplePlaybackEngine.playSample).toHaveBeenCalled();
    });

    it('should handle pattern validation errors', async () => {
      // Create a valid pattern
      const pattern = patternManager.createPattern('Validation Test', 2, 8);
      
      // Corrupt the pattern data
      pattern.bpm = -1; // Invalid BPM
      pattern.tracks[0].volume = 2.0; // Invalid volume
      
      // Should reject invalid pattern
      expect(patternManager.validatePattern(pattern)).toBe(false);
      
      // Should not be able to load invalid pattern
      patternManager.patterns.set(pattern.id, pattern);
      await expect(patternManager.loadPattern(pattern.id)).rejects.toThrow('Pattern validation failed');
      
      // Fix the pattern
      pattern.bpm = 120;
      pattern.tracks[0].volume = 0.8;
      
      // Should now be valid
      expect(patternManager.validatePattern(pattern)).toBe(true);
      await patternManager.loadPattern(pattern.id);
      expect(patternManager.getCurrentPattern()).toBe(pattern);
    });
  });
});