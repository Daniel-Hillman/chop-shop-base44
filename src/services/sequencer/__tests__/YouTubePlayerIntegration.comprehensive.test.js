/**
 * Comprehensive YouTube Player Integration Tests
 * 
 * Tests the integration between the sampler sequencer and YouTube player,
 * covering all aspects of video control, error handling, and synchronization.
 * 
 * Requirements Coverage:
 * - Requirement 1.4: YouTube player integration for timestamp jumping
 * - Requirement 3.6: YouTube timestamp jumping on trigger
 * - Requirement 7.3, 7.4: YouTube player state synchronization
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import YouTubePlayerInterface from '../YouTubePlayerInterface';
import SamplerSequencerService from '../SamplerSequencerService';

describe('YouTube Player Integration - Comprehensive Tests', () => {
  let mockYouTubePlayer;
  let playerInterface;
  let sequencerService;

  beforeEach(() => {
    // Create comprehensive YouTube player mock
    mockYouTubePlayer = {
      // Core playback methods
      seekTo: vi.fn(),
      playVideo: vi.fn(),
      pauseVideo: vi.fn(),
      stopVideo: vi.fn(),
      
      // State methods
      getCurrentTime: vi.fn(() => 0),
      getDuration: vi.fn(() => 300),
      getPlayerState: vi.fn(() => 1), // Playing
      getPlaybackRate: vi.fn(() => 1),
      
      // Volume methods
      getVolume: vi.fn(() => 50),
      setVolume: vi.fn(),
      mute: vi.fn(),
      unMute: vi.fn(),
      isMuted: vi.fn(() => false),
      
      // Quality methods
      getPlaybackQuality: vi.fn(() => 'hd720'),
      setPlaybackQuality: vi.fn(),
      getAvailableQualityLevels: vi.fn(() => ['hd720', 'large', 'medium']),
      
      // Event methods
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      
      // Error simulation
      getVideoLoadedFraction: vi.fn(() => 1),
      getVideoUrl: vi.fn(() => 'https://youtube.com/watch?v=test'),
      
      // Custom methods for testing
      _simulateError: vi.fn(),
      _simulateBuffering: vi.fn(),
      _simulateReady: vi.fn(),
    };

    playerInterface = new YouTubePlayerInterface(mockYouTubePlayer);
    sequencerService = new SamplerSequencerService();
    sequencerService.setYouTubePlayer(mockYouTubePlayer);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic YouTube Player Control', () => {
    it('should jump to timestamp when trigger is activated', async () => {
      const timestamp = 45.5;
      
      await playerInterface.jumpToTimestamp(timestamp);
      
      expect(mockYouTubePlayer.seekTo).toHaveBeenCalledWith(timestamp, true);
    });

    it('should handle precise timestamp jumping with allowSeekAhead', async () => {
      const timestamp = 123.456;
      
      await playerInterface.jumpToTimestamp(timestamp, { precise: true });
      
      expect(mockYouTubePlayer.seekTo).toHaveBeenCalledWith(timestamp, true);
    });

    it('should queue multiple timestamp jumps correctly', async () => {
      const timestamps = [10.5, 25.3, 40.1];
      
      // Queue multiple jumps rapidly
      const promises = timestamps.map(ts => playerInterface.jumpToTimestamp(ts));
      await Promise.all(promises);
      
      // Should have called seekTo for each timestamp
      expect(mockYouTubePlayer.seekTo).toHaveBeenCalledTimes(3);
      timestamps.forEach(ts => {
        expect(mockYouTubePlayer.seekTo).toHaveBeenCalledWith(ts, true);
      });
    });

    it('should get current playback position', async () => {
      mockYouTubePlayer.getCurrentTime.mockReturnValue(67.8);
      
      const currentTime = await playerInterface.getCurrentTime();
      
      expect(currentTime).toBe(67.8);
      expect(mockYouTubePlayer.getCurrentTime).toHaveBeenCalled();
    });

    it('should get player state correctly', async () => {
      // Test different player states
      const states = [
        { code: -1, name: 'unstarted' },
        { code: 0, name: 'ended' },
        { code: 1, name: 'playing' },
        { code: 2, name: 'paused' },
        { code: 3, name: 'buffering' },
        { code: 5, name: 'cued' }
      ];

      for (const state of states) {
        mockYouTubePlayer.getPlayerState.mockReturnValue(state.code);
        
        const playerState = await playerInterface.getPlayerState();
        
        expect(playerState).toBe(state.name);
      }
    });
  });

  describe('Sequencer Integration', () => {
    it('should integrate with sequencer service for pattern playback', async () => {
      const chops = [
        { padId: 'A0', startTime: 10.5, endTime: 12.3 },
        { padId: 'A1', startTime: 25.7, endTime: 27.9 }
      ];

      const pattern = {
        tracks: [
          { trackIndex: 0, chopId: 'A0', steps: [true, false, false, false] },
          { trackIndex: 1, chopId: 'A1', steps: [false, true, false, false] }
        ]
      };

      sequencerService.setChops(chops);
      sequencerService.setPattern(pattern);
      sequencerService.setBPM(120); // 500ms per step
      
      sequencerService.start();

      // Wait for first step (should trigger A0)
      await new Promise(resolve => setTimeout(resolve, 100));
      expect(mockYouTubePlayer.seekTo).toHaveBeenCalledWith(10.5, true);

      // Wait for second step (should trigger A1)
      await new Promise(resolve => setTimeout(resolve, 500));
      expect(mockYouTubePlayer.seekTo).toHaveBeenCalledWith(25.7, true);

      sequencerService.stop();
    });

    it('should handle simultaneous triggers on same step', async () => {
      const chops = [
        { padId: 'A0', startTime: 10.5, endTime: 12.3 },
        { padId: 'A1', startTime: 25.7, endTime: 27.9 }
      ];

      const pattern = {
        tracks: [
          { trackIndex: 0, chopId: 'A0', steps: [true, false, false, false] },
          { trackIndex: 1, chopId: 'A1', steps: [true, false, false, false] } // Same step
        ]
      };

      sequencerService.setChops(chops);
      sequencerService.setPattern(pattern);
      sequencerService.setBPM(120);
      
      sequencerService.start();

      await new Promise(resolve => setTimeout(resolve, 100));

      // Should handle the last trigger (A1) when multiple triggers occur simultaneously
      expect(mockYouTubePlayer.seekTo).toHaveBeenCalledWith(25.7, true);

      sequencerService.stop();
    });

    it('should synchronize with YouTube player state changes', async () => {
      const stateChangeCallback = vi.fn();
      playerInterface.onStateChange(stateChangeCallback);

      // Simulate player state changes
      mockYouTubePlayer.getPlayerState.mockReturnValue(2); // Paused
      await playerInterface._simulateStateChange(2);

      expect(stateChangeCallback).toHaveBeenCalledWith('paused');

      mockYouTubePlayer.getPlayerState.mockReturnValue(1); // Playing
      await playerInterface._simulateStateChange(1);

      expect(stateChangeCallback).toHaveBeenCalledWith('playing');
    });

    it('should handle video loading and buffering states', async () => {
      const bufferingCallback = vi.fn();
      playerInterface.onBuffering(bufferingCallback);

      // Simulate buffering
      mockYouTubePlayer.getPlayerState.mockReturnValue(3);
      await playerInterface._simulateStateChange(3);

      expect(bufferingCallback).toHaveBeenCalledWith(true);

      // Simulate buffering complete
      mockYouTubePlayer.getPlayerState.mockReturnValue(1);
      await playerInterface._simulateStateChange(1);

      expect(bufferingCallback).toHaveBeenCalledWith(false);
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle player not ready errors gracefully', async () => {
      // Simulate player not ready
      mockYouTubePlayer.seekTo.mockImplementation(() => {
        throw new Error('Player not ready');
      });

      const result = await playerInterface.jumpToTimestamp(45.5);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Player not ready');
    });

    it('should handle network connectivity issues', async () => {
      // Simulate network error
      mockYouTubePlayer.seekTo.mockImplementation(() => {
        throw new Error('Network error');
      });

      const result = await playerInterface.jumpToTimestamp(45.5);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Network error');
    });

    it('should implement retry mechanism for failed seeks', async () => {
      let attemptCount = 0;
      mockYouTubePlayer.seekTo.mockImplementation(() => {
        attemptCount++;
        if (attemptCount < 3) {
          throw new Error('Temporary failure');
        }
        return true; // Success on 3rd attempt
      });

      const result = await playerInterface.jumpToTimestamp(45.5, { retries: 3 });

      expect(result.success).toBe(true);
      expect(mockYouTubePlayer.seekTo).toHaveBeenCalledTimes(3);
    });

    it('should provide graceful degradation when player fails', async () => {
      // Simulate complete player failure
      mockYouTubePlayer.seekTo.mockImplementation(() => {
        throw new Error('Player destroyed');
      });

      sequencerService.enableGracefulDegradation(true);
      
      const chops = [{ padId: 'A0', startTime: 10.5, endTime: 12.3 }];
      const pattern = {
        tracks: [{ trackIndex: 0, chopId: 'A0', steps: [true, false, false, false] }]
      };

      sequencerService.setChops(chops);
      sequencerService.setPattern(pattern);
      sequencerService.start();

      // Should continue running despite player failure
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(sequencerService.isPlaying()).toBe(true);
      sequencerService.stop();
    });

    it('should handle invalid timestamp values', async () => {
      const invalidTimestamps = [-1, NaN, Infinity, null, undefined, 'invalid'];

      for (const timestamp of invalidTimestamps) {
        const result = await playerInterface.jumpToTimestamp(timestamp);
        expect(result.success).toBe(false);
        expect(result.error).toContain('Invalid timestamp');
      }
    });

    it('should handle timestamps beyond video duration', async () => {
      mockYouTubePlayer.getDuration.mockReturnValue(180); // 3 minutes
      
      const result = await playerInterface.jumpToTimestamp(300); // 5 minutes
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('beyond video duration');
    });
  });

  describe('Performance and Optimization', () => {
    it('should throttle rapid timestamp jumps', async () => {
      const timestamps = Array(10).fill().map((_, i) => i * 5);
      
      // Fire all jumps rapidly
      const promises = timestamps.map(ts => playerInterface.jumpToTimestamp(ts));
      await Promise.all(promises);

      // Should throttle to prevent overwhelming the player
      expect(mockYouTubePlayer.seekTo).toHaveBeenCalledTimes(1);
      expect(mockYouTubePlayer.seekTo).toHaveBeenCalledWith(45, true); // Last timestamp
    });

    it('should cache player state to reduce API calls', async () => {
      // First call should hit the API
      await playerInterface.getPlayerState();
      expect(mockYouTubePlayer.getPlayerState).toHaveBeenCalledTimes(1);

      // Subsequent calls within cache window should use cache
      await playerInterface.getPlayerState();
      await playerInterface.getPlayerState();
      
      expect(mockYouTubePlayer.getPlayerState).toHaveBeenCalledTimes(1);
    });

    it('should optimize for high-frequency sequencer updates', async () => {
      const startTime = performance.now();
      
      // Simulate high-frequency pattern with many triggers
      const pattern = {
        tracks: Array(16).fill().map((_, trackIndex) => ({
          trackIndex,
          chopId: `A${trackIndex}`,
          steps: Array(16).fill(true) // All steps active
        }))
      };

      const chops = Array(16).fill().map((_, i) => ({
        padId: `A${i}`,
        startTime: i * 2,
        endTime: i * 2 + 1
      }));

      sequencerService.setChops(chops);
      sequencerService.setPattern(pattern);
      sequencerService.setBPM(200); // Fast tempo
      
      sequencerService.start();
      await new Promise(resolve => setTimeout(resolve, 1000));
      sequencerService.stop();

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Should handle high-frequency updates efficiently
      expect(duration).toBeLessThan(1200); // Allow some overhead
    });

    it('should clean up resources properly', async () => {
      const cleanupSpy = vi.fn();
      playerInterface.onCleanup(cleanupSpy);

      await playerInterface.destroy();

      expect(cleanupSpy).toHaveBeenCalled();
      expect(mockYouTubePlayer.removeEventListener).toHaveBeenCalled();
    });
  });

  describe('Advanced Integration Scenarios', () => {
    it('should handle video switching during playback', async () => {
      // Start with first video
      sequencerService.start();
      await new Promise(resolve => setTimeout(resolve, 100));

      // Switch to new video
      const newMockPlayer = { ...mockYouTubePlayer };
      sequencerService.setYouTubePlayer(newMockPlayer);

      // Continue playback with new video
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(newMockPlayer.seekTo).toHaveBeenCalled();
      sequencerService.stop();
    });

    it('should synchronize with video playback rate changes', async () => {
      mockYouTubePlayer.getPlaybackRate.mockReturnValue(1.5);
      
      const chops = [{ padId: 'A0', startTime: 10.0, endTime: 12.0 }];
      const pattern = {
        tracks: [{ trackIndex: 0, chopId: 'A0', steps: [true, false, false, false] }]
      };

      sequencerService.setChops(chops);
      sequencerService.setPattern(pattern);
      sequencerService.start();

      await new Promise(resolve => setTimeout(resolve, 100));

      // Should account for playback rate in timing calculations
      expect(mockYouTubePlayer.seekTo).toHaveBeenCalledWith(10.0, true);
      sequencerService.stop();
    });

    it('should handle multiple sequencer instances with same player', async () => {
      const sequencer2 = new SamplerSequencerService();
      sequencer2.setYouTubePlayer(mockYouTubePlayer);

      const chops1 = [{ padId: 'A0', startTime: 10.0, endTime: 12.0 }];
      const chops2 = [{ padId: 'B0', startTime: 20.0, endTime: 22.0 }];

      sequencerService.setChops(chops1);
      sequencer2.setChops(chops2);

      // Both sequencers should coordinate player access
      sequencerService.start();
      sequencer2.start();

      await new Promise(resolve => setTimeout(resolve, 200));

      // Should handle concurrent access gracefully
      expect(mockYouTubePlayer.seekTo).toHaveBeenCalled();

      sequencerService.stop();
      sequencer2.stop();
    });

    it('should maintain synchronization during tempo changes', async () => {
      const chops = [{ padId: 'A0', startTime: 10.0, endTime: 12.0 }];
      const pattern = {
        tracks: [{ trackIndex: 0, chopId: 'A0', steps: [true, true, true, true] }]
      };

      sequencerService.setChops(chops);
      sequencerService.setPattern(pattern);
      sequencerService.setBPM(120);
      sequencerService.start();

      await new Promise(resolve => setTimeout(resolve, 300));

      // Change tempo during playback
      sequencerService.setBPM(140);

      await new Promise(resolve => setTimeout(resolve, 300));

      // Should maintain accurate timing with new tempo
      expect(mockYouTubePlayer.seekTo).toHaveBeenCalledTimes(2);
      sequencerService.stop();
    });
  });
});