/**
 * @fileoverview Tests for YouTube Player Integration
 * Tests the enhanced YouTube player control system integration
 */

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { YouTubePlayerInterface } from '../YouTubePlayerInterface.js';
import { SamplerSequencerEngine } from '../SamplerSequencerEngine.js';
import { SamplerSequencerService } from '../SamplerSequencerService.js';

// Mock YouTube Player
class MockYouTubePlayer {
  constructor() {
    this.currentTime = 0;
    this.duration = 180;
    this.playerState = 2; // Paused
    this.seekCalls = [];
    this.playCalls = 0;
    this.pauseCalls = 0;
  }

  seekTo(time, allowSeekAhead) {
    this.seekCalls.push({ time, allowSeekAhead });
    this.currentTime = time;
  }

  getCurrentTime() {
    return this.currentTime;
  }

  getDuration() {
    return this.duration;
  }

  getPlayerState() {
    return this.playerState;
  }

  playVideo() {
    this.playCalls++;
    this.playerState = 1; // Playing
  }

  pauseVideo() {
    this.pauseCalls++;
    this.playerState = 2; // Paused
  }

  getVideoData() {
    return { title: 'Test Video' };
  }
}

describe('YouTubePlayerInterface Enhanced Integration', () => {
  let youtubeInterface;
  let mockPlayer;

  beforeEach(() => {
    youtubeInterface = new YouTubePlayerInterface();
    mockPlayer = new MockYouTubePlayer();
  });

  afterEach(() => {
    youtubeInterface.destroy();
  });

  describe('Enhanced Timestamp Jumping', () => {
    beforeEach(() => {
      youtubeInterface.connect(mockPlayer);
    });

    test('should jump to timestamp with playback state maintenance', async () => {
      mockPlayer.playerState = 1; // Playing
      
      const success = await youtubeInterface.jumpToTimestamp(30, true, true);
      
      expect(success).toBe(true);
      expect(mockPlayer.seekCalls).toHaveLength(1);
      expect(mockPlayer.seekCalls[0].time).toBe(30);
      expect(mockPlayer.seekCalls[0].allowSeekAhead).toBe(true);
    });

    test('should handle seek with playback state synchronization', async () => {
      mockPlayer.playerState = 1; // Playing initially
      
      // Simulate player pausing after seek
      mockPlayer.seekTo = vi.fn((time) => {
        mockPlayer.currentTime = time;
        mockPlayer.playerState = 2; // Paused after seek
      });

      const success = await youtubeInterface.jumpToTimestamp(45, true, true);
      
      expect(success).toBe(true);
      expect(mockPlayer.playCalls).toBe(1); // Should resume playback
    });

    test('should not maintain playback when maintainPlayback is false', async () => {
      mockPlayer.playerState = 1; // Playing initially
      
      const success = await youtubeInterface.jumpToTimestamp(60, true, false);
      
      expect(success).toBe(true);
      expect(mockPlayer.playCalls).toBe(0); // Should not resume playback
    });

    test('should handle concurrent seek prevention', async () => {
      const promise1 = youtubeInterface.jumpToTimestamp(30);
      const promise2 = youtubeInterface.jumpToTimestamp(45);
      
      const [result1, result2] = await Promise.all([promise1, promise2]);
      
      expect(result1).toBe(true);
      expect(result2).toBe(false); // Second seek should be prevented
      expect(mockPlayer.seekCalls).toHaveLength(1);
    });
  });

  describe('State Synchronization', () => {
    beforeEach(() => {
      youtubeInterface.connect(mockPlayer);
    });

    test('should get detailed player state', () => {
      mockPlayer.currentTime = 75;
      mockPlayer.playerState = 1; // Playing
      
      const state = youtubeInterface.getDetailedPlayerState();
      
      expect(state).toEqual({
        state: 1,
        currentTime: 75,
        duration: 180,
        isPlaying: true,
        isPaused: false,
        isBuffering: false,
        isReady: true,
        isEnded: false
      });
    });

    test('should synchronize to target state', async () => {
      mockPlayer.currentTime = 10;
      mockPlayer.playerState = 2; // Paused
      
      const success = await youtubeInterface.synchronizeState({
        currentTime: 50,
        isPlaying: true
      });
      
      expect(success).toBe(true);
      expect(mockPlayer.seekCalls).toHaveLength(1);
      expect(mockPlayer.seekCalls[0].time).toBe(50);
      expect(mockPlayer.playCalls).toBe(1);
    });

    test('should not seek for small time differences', async () => {
      mockPlayer.currentTime = 50.2;
      mockPlayer.playerState = 1; // Playing initially
      
      const success = await youtubeInterface.synchronizeState({
        currentTime: 50.0,
        isPlaying: false
      });
      
      expect(success).toBe(true);
      expect(mockPlayer.seekCalls).toHaveLength(0); // No seek for 0.2s difference
      expect(mockPlayer.pauseCalls).toBe(1);
    });
  });

  describe('Error Handling and Recovery', () => {
    beforeEach(() => {
      youtubeInterface.connect(mockPlayer);
    });

    test('should handle player errors gracefully', async () => {
      mockPlayer.seekTo = vi.fn(() => {
        throw new Error('Seek failed');
      });
      
      const success = await youtubeInterface.jumpToTimestamp(30);
      
      expect(success).toBe(false);
      expect(youtubeInterface.getRecentErrors()).toHaveLength(1);
      expect(youtubeInterface.getRecentErrors()[0].message).toContain('Seek failed');
    });

    test('should attempt recovery on connection issues', async () => {
      const recovered = await youtubeInterface.attemptRecovery();
      
      expect(recovered).toBe(true); // Should succeed with mock player
    });

    test('should provide error recovery suggestions', () => {
      const suggestions = youtubeInterface.getErrorRecoverySuggestions('seek failed');
      
      expect(suggestions).toHaveProperty('userAction');
      expect(suggestions).toHaveProperty('technicalAction');
      expect(suggestions).toHaveProperty('canRetry');
      expect(suggestions.userAction).toContain('playing');
    });

    test('should handle network errors with appropriate suggestions', () => {
      const suggestions = youtubeInterface.getErrorRecoverySuggestions('network timeout');
      
      expect(suggestions.userAction).toContain('internet connection');
      expect(suggestions.canRetry).toBe(true);
    });
  });
});

describe('SamplerSequencerEngine YouTube Integration', () => {
  let engine;
  let mockYouTubeInterface;

  beforeEach(() => {
    engine = new SamplerSequencerEngine();
    mockYouTubeInterface = {
      jumpToTimestamp: vi.fn().mockResolvedValue(true),
      getDetailedPlayerState: vi.fn().mockReturnValue({
        isReady: true,
        isPlaying: false,
        currentTime: 0
      })
    };
    
    engine.initialize(mockYouTubeInterface);
  });

  afterEach(() => {
    engine.destroy();
  });

  test('should jump to timestamp with enhanced interface', async () => {
    const success = await engine.jumpToTimestamp(45, true);
    
    expect(success).toBe(true);
    expect(mockYouTubeInterface.jumpToTimestamp).toHaveBeenCalledWith(45, true, true);
  });

  test('should synchronize with player state', async () => {
    const success = await engine.synchronizeWithPlayer();
    
    expect(success).toBe(true);
    expect(mockYouTubeInterface.getDetailedPlayerState).toHaveBeenCalled();
  });

  test('should handle fallback to direct player control', async () => {
    const directPlayer = {
      seekTo: vi.fn()
    };
    
    engine.initialize(directPlayer);
    
    const success = await engine.jumpToTimestamp(30);
    
    expect(success).toBe(true);
    expect(directPlayer.seekTo).toHaveBeenCalledWith(30, true);
  });
});

describe('SamplerSequencerService YouTube Integration', () => {
  let service;
  let mockYouTubeInterface;
  let mockEngine;

  beforeEach(() => {
    service = new SamplerSequencerService();
    
    mockYouTubeInterface = {
      connect: vi.fn().mockReturnValue(true),
      testConnection: vi.fn().mockResolvedValue(true),
      attemptRecovery: vi.fn().mockResolvedValue(true),
      jumpToTimestamp: vi.fn().mockResolvedValue(true),
      getDetailedPlayerState: vi.fn().mockReturnValue({
        isPlaying: false,
        isReady: true
      }),
      handlePlayerError: vi.fn().mockResolvedValue(true),
      getErrorRecoverySuggestions: vi.fn().mockReturnValue({
        userAction: 'Test action',
        canRetry: true
      }),
      destroy: vi.fn(),
      youtubePlayer: {
        playVideo: vi.fn(),
        pauseVideo: vi.fn()
      }
    };
    
    mockEngine = {
      initialize: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
      destroy: vi.fn(),
      getState: vi.fn().mockReturnValue({ isPlaying: false }),
      synchronizeWithPlayer: vi.fn().mockResolvedValue(true),
      onStep: vi.fn(),
      onStateChange: vi.fn()
    };
    
    service.youtubeInterface = mockYouTubeInterface;
    service.engine = mockEngine;
    service.patternManager = {
      destroy: vi.fn()
    };
  });

  afterEach(() => {
    service.destroy();
  });

  test('should start with enhanced YouTube synchronization', async () => {
    service.isInitialized = true;
    
    const success = await service.start();
    
    expect(success).toBe(true);
    expect(mockYouTubeInterface.testConnection).toHaveBeenCalled();
    expect(mockEngine.synchronizeWithPlayer).toHaveBeenCalled();
    expect(mockEngine.start).toHaveBeenCalled();
  });

  test('should handle YouTube connection failure with recovery', async () => {
    service.isInitialized = true;
    mockYouTubeInterface.testConnection.mockResolvedValue(false);
    
    const success = await service.start();
    
    expect(success).toBe(true);
    expect(mockYouTubeInterface.attemptRecovery).toHaveBeenCalled();
  });

  test('should control video playback seamlessly', async () => {
    service.isConnected = true;
    
    const playSuccess = await service.controlVideoPlayback('play');
    const pauseSuccess = await service.controlVideoPlayback('pause');
    const stopSuccess = await service.controlVideoPlayback('stop');
    
    expect(playSuccess).toBe(true);
    expect(pauseSuccess).toBe(true);
    expect(stopSuccess).toBe(true);
    
    expect(mockYouTubeInterface.youtubePlayer.playVideo).toHaveBeenCalled();
    expect(mockYouTubeInterface.youtubePlayer.pauseVideo).toHaveBeenCalledTimes(2); // pause + stop
  });

  test('should synchronize video with sequencer state', async () => {
    service.isInitialized = true;
    service.isConnected = true; // Add this property
    mockEngine.getState.mockReturnValue({ isPlaying: true });
    mockYouTubeInterface.getDetailedPlayerState.mockReturnValue({ isPlaying: false });
    
    const success = await service.synchronizeVideoWithSequencer();
    
    expect(success).toBe(true);
    expect(mockYouTubeInterface.youtubePlayer.playVideo).toHaveBeenCalled();
  });

  test('should handle YouTube errors with recovery', async () => {
    const error = new Error('YouTube player error');
    
    const handled = await service.handleYouTubeError(error);
    
    expect(handled).toBe(true);
    expect(mockYouTubeInterface.handlePlayerError).toHaveBeenCalledWith(error);
  });

  test('should trigger chops with enhanced error handling', async () => {
    const chopData = { padId: 'A0', startTime: 30 };
    service.chopsData.set('A0', chopData);
    service.engine.isPlaying = true;
    
    await service.triggerChop('A0', 0);
    
    expect(mockYouTubeInterface.jumpToTimestamp).toHaveBeenCalledWith(30, true, true);
  });

  test('should retry chop trigger after recovery', async () => {
    const chopData = { padId: 'A0', startTime: 30 };
    service.chopsData.set('A0', chopData);
    
    // First call fails, second succeeds after recovery
    mockYouTubeInterface.jumpToTimestamp
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true);
    
    await service.triggerChop('A0', 0);
    
    expect(mockYouTubeInterface.jumpToTimestamp).toHaveBeenCalledTimes(2);
    expect(mockYouTubeInterface.attemptRecovery).toHaveBeenCalled();
  });
});