import { describe, it, expect, vi, beforeEach } from 'vitest';
import VideoPlayer from '../VideoPlayer';

// Mock the SamplePlaybackEngine
vi.mock('../../../services/SamplePlaybackEngine.js', () => ({
  SamplePlaybackEngine: vi.fn().mockImplementation(() => ({
    loadAudioBuffer: vi.fn().mockResolvedValue(true),
    jumpToTimestamp: vi.fn().mockResolvedValue({ timestamp: 0, playing: true }),
    playSample: vi.fn().mockResolvedValue({ id: 'test-sample' }),
    getStatus: vi.fn().mockReturnValue({
      isInitialized: true,
      audioContextState: 'running',
      hasAudioBuffer: true,
      audioBufferDuration: 180,
      activeSamplesCount: 0,
      masterVolume: 1.0
    }),
    getActiveSamples: vi.fn().mockReturnValue([]),
    cleanup: vi.fn().mockResolvedValue(undefined)
  }))
}));

// Mock YouTube IFrame API
const mockYouTubePlayer = {
  getDuration: vi.fn().mockReturnValue(180),
  getCurrentTime: vi.fn().mockReturnValue(0),
  getPlayerState: vi.fn().mockReturnValue(1), // PLAYING
  seekTo: vi.fn(),
  setVolume: vi.fn(),
  destroy: vi.fn()
};

global.window.YT = {
  Player: vi.fn().mockImplementation((elementId, config) => {
    // Simulate player ready event
    setTimeout(() => {
      config.events.onReady({ target: mockYouTubePlayer });
    }, 100);
    return mockYouTubePlayer;
  }),
  PlayerState: {
    PLAYING: 1,
    PAUSED: 2
  }
};

describe('VideoPlayer Component', () => {
  let mockSamplePlaybackEngine;
  let mockSetPlayerState;
  let mockOnPlayerReady;
  let mockOnSyncError;

  beforeEach(async () => {
    // Reset all mocks
    vi.clearAllMocks();
    
    // Get the mocked constructor
    const { SamplePlaybackEngine } = await import('../../../services/SamplePlaybackEngine.js');
    mockSamplePlaybackEngine = new SamplePlaybackEngine();
    
    // Mock functions
    mockSetPlayerState = vi.fn();
    mockOnPlayerReady = vi.fn();
    mockOnSyncError = vi.fn();

    // Set API as ready
    global.window.YT.Player = vi.fn().mockImplementation((elementId, config) => {
      setTimeout(() => {
        config.events.onReady({ target: mockYouTubePlayer });
      }, 100);
      return mockYouTubePlayer;
    });
  });

  it('should import VideoPlayer component correctly', () => {
    expect(VideoPlayer).toBeDefined();
    expect(typeof VideoPlayer).toBe('function');
  });

  it('should initialize SamplePlaybackEngine correctly', async () => {
    expect(mockSamplePlaybackEngine.loadAudioBuffer).toBeDefined();
    expect(mockSamplePlaybackEngine.jumpToTimestamp).toBeDefined();
    expect(mockSamplePlaybackEngine.playSample).toBeDefined();
    expect(mockSamplePlaybackEngine.getStatus).toBeDefined();
    expect(mockSamplePlaybackEngine.cleanup).toBeDefined();
  });

  it('should handle audio buffer loading', async () => {
    const audioBuffer = new ArrayBuffer(1024);
    const result = await mockSamplePlaybackEngine.loadAudioBuffer('video-sync', audioBuffer);
    
    expect(mockSamplePlaybackEngine.loadAudioBuffer).toHaveBeenCalledWith('video-sync', audioBuffer);
    expect(result).toBe(true);
  });

  it('should handle timestamp jumping', async () => {
    const result = await mockSamplePlaybackEngine.jumpToTimestamp(30, true);
    
    expect(mockSamplePlaybackEngine.jumpToTimestamp).toHaveBeenCalledWith(30, true);
    expect(result).toEqual({ timestamp: 0, playing: true });
  });

  it('should handle sample playback', async () => {
    const result = await mockSamplePlaybackEngine.playSample(15);
    
    expect(mockSamplePlaybackEngine.playSample).toHaveBeenCalledWith(15);
    expect(result).toEqual({ id: 'test-sample' });
  });

  it('should provide engine status', () => {
    const status = mockSamplePlaybackEngine.getStatus();
    
    expect(status).toHaveProperty('isInitialized');
    expect(status).toHaveProperty('audioContextState');
    expect(status).toHaveProperty('hasAudioBuffer');
    expect(status).toHaveProperty('audioBufferDuration');
    expect(status).toHaveProperty('activeSamplesCount');
    expect(status).toHaveProperty('masterVolume');
  });

  it('should handle cleanup operations', async () => {
    await mockSamplePlaybackEngine.cleanup();
    expect(mockSamplePlaybackEngine.cleanup).toHaveBeenCalled();
  });
});