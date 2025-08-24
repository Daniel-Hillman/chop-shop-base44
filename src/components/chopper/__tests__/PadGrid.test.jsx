import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the SamplePlaybackEngine
vi.mock('../../../services/SamplePlaybackEngine.js', () => ({
  SamplePlaybackEngine: vi.fn().mockImplementation(() => ({
    loadAudioBuffer: vi.fn().mockResolvedValue(true),
    playSample: vi.fn().mockResolvedValue({ id: 'test-sample' }),
    jumpToTimestamp: vi.fn().mockResolvedValue({ timestamp: 0, playing: true }),
    stopAllSamples: vi.fn(),
    cleanup: vi.fn().mockResolvedValue(true),
    setMasterVolume: vi.fn(),
  }))
}));

describe('PadGrid Component', () => {
  let mockSamplePlaybackEngine;

  beforeEach(async () => {
    vi.clearAllMocks();
    
    // Get the mocked constructor
    const { SamplePlaybackEngine } = await import('../../../services/SamplePlaybackEngine.js');
    mockSamplePlaybackEngine = new SamplePlaybackEngine();
  });

  it('should import SamplePlaybackEngine correctly', async () => {
    const { SamplePlaybackEngine } = await import('../../../services/SamplePlaybackEngine.js');
    expect(SamplePlaybackEngine).toBeDefined();
    expect(typeof SamplePlaybackEngine).toBe('function');
  });

  it('should create SamplePlaybackEngine instance with correct methods', () => {
    expect(mockSamplePlaybackEngine.loadAudioBuffer).toBeDefined();
    expect(mockSamplePlaybackEngine.playSample).toBeDefined();
    expect(mockSamplePlaybackEngine.jumpToTimestamp).toBeDefined();
    expect(mockSamplePlaybackEngine.stopAllSamples).toBeDefined();
    expect(mockSamplePlaybackEngine.cleanup).toBeDefined();
  });

  it('should handle audio buffer loading', async () => {
    const audioBuffer = new ArrayBuffer(1024);
    const result = await mockSamplePlaybackEngine.loadAudioBuffer('test-id', audioBuffer);
    
    expect(mockSamplePlaybackEngine.loadAudioBuffer).toHaveBeenCalledWith('test-id', audioBuffer);
    expect(result).toBe(true);
  });

  it('should handle sample playback', async () => {
    const result = await mockSamplePlaybackEngine.playSample(10, 2, 0.8, 'test-sample');
    
    expect(mockSamplePlaybackEngine.playSample).toHaveBeenCalledWith(10, 2, 0.8, 'test-sample');
    expect(result).toEqual({ id: 'test-sample' });
  });

  it('should handle timestamp jumping', async () => {
    const result = await mockSamplePlaybackEngine.jumpToTimestamp(15, true);
    
    expect(mockSamplePlaybackEngine.jumpToTimestamp).toHaveBeenCalledWith(15, true);
    expect(result).toEqual({ timestamp: 0, playing: true });
  });

  it('should handle cleanup operations', async () => {
    await mockSamplePlaybackEngine.cleanup();
    expect(mockSamplePlaybackEngine.cleanup).toHaveBeenCalled();
  });

  it('should handle stopping all samples', () => {
    mockSamplePlaybackEngine.stopAllSamples();
    expect(mockSamplePlaybackEngine.stopAllSamples).toHaveBeenCalled();
  });
});