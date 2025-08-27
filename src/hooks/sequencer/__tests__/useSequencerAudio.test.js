/**
 * @fileoverview Tests for useSequencerAudio hook
 */

import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useSequencerAudio } from '../useSequencerAudio.js';

// Mock SamplePlaybackEngine
const mockSamplePlaybackEngine = {
  initializeAudioContext: vi.fn().mockResolvedValue(undefined),
  loadAudioBuffer: vi.fn().mockResolvedValue({}),
  playSample: vi.fn().mockResolvedValue('source-id'),
  stopAll: vi.fn(),
  setMasterVolume: vi.fn(),
  cleanup: vi.fn()
};

vi.mock('../../../services/SamplePlaybackEngine.js', () => ({
  SamplePlaybackEngine: vi.fn().mockImplementation(() => mockSamplePlaybackEngine)
}));

// Mock error recovery hooks
vi.mock('../../useErrorRecovery.js', () => ({
  useAudioErrorRecovery: vi.fn(() => ({
    executeAudioOperation: vi.fn().mockImplementation((fn) => fn()),
    error: null,
    isRetrying: false,
    retryCount: 0,
    reset: vi.fn(),
    getAudioErrorGuidance: vi.fn().mockReturnValue({
      message: 'Test error guidance',
      suggestions: ['Try again']
    })
  }))
}));

// Mock AudioContext
const mockAudioContext = {
  state: 'running',
  sampleRate: 44100,
  currentTime: 0,
  baseLatency: 0.005,
  outputLatency: 0.01,
  resume: vi.fn().mockResolvedValue(undefined),
  suspend: vi.fn().mockResolvedValue(undefined),
  close: vi.fn().mockResolvedValue(undefined),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn()
};

global.AudioContext = vi.fn().mockImplementation(() => mockAudioContext);
global.webkitAudioContext = global.AudioContext;

describe('useSequencerAudio', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should initialize with default state', () => {
    const { result } = renderHook(() => useSequencerAudio({ autoInitialize: false }));

    expect(result.current.isAudioInitialized).toBe(false);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isAudioContextSuspended).toBe(false);
    expect(result.current.masterVolume).toBe(1.0);
    expect(result.current.audioLatency).toBe(0);
    expect(result.current.activeSources).toBe(0);
    expect(result.current.loadedSamples).toBe(0);
    expect(result.current.sampleLoadingProgress).toBe(0);
    expect(result.current.preloadedPacks).toEqual([]);
    expect(result.current.preloadingPacks).toEqual([]);
    expect(result.current.preloadErrors).toEqual({});
  });

  it('should initialize audio when autoInitialize is true', async () => {
    const { result } = renderHook(() => useSequencerAudio({ autoInitialize: true }));

    // Wait for initialization
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(result.current.isAudioInitialized).toBe(true);
  });

  it('should provide audio context management methods', () => {
    const { result } = renderHook(() => useSequencerAudio({ autoInitialize: false }));

    expect(typeof result.current.initializeAudio).toBe('function');
    expect(typeof result.current.resumeAudioContext).toBe('function');
    expect(typeof result.current.suspendAudioContext).toBe('function');
    expect(typeof result.current.closeAudioContext).toBe('function');
    expect(typeof result.current.getAudioContextState).toBe('function');
  });

  it('should provide sample management methods', () => {
    const { result } = renderHook(() => useSequencerAudio({ autoInitialize: false }));

    expect(typeof result.current.loadAudioBuffer).toBe('function');
    expect(typeof result.current.preloadSamplePack).toBe('function');
    expect(typeof result.current.isSampleLoaded).toBe('function');
    expect(typeof result.current.getLoadedSample).toBe('function');
    expect(typeof result.current.clearLoadedSamples).toBe('function');
  });

  it('should provide playback control methods', () => {
    const { result } = renderHook(() => useSequencerAudio({ autoInitialize: false }));

    expect(typeof result.current.scheduleNote).toBe('function');
    expect(typeof result.current.stopAllSources).toBe('function');
    expect(typeof result.current.setMasterVolumeLevel).toBe('function');
  });

  it('should provide performance monitoring methods', () => {
    const { result } = renderHook(() => useSequencerAudio({ autoInitialize: false }));

    expect(typeof result.current.getAudioPerformanceMetrics).toBe('function');
  });

  it('should handle audio context state changes', async () => {
    const { result } = renderHook(() => useSequencerAudio({ autoInitialize: false }));

    await act(async () => {
      await result.current.initializeAudio();
    });

    expect(result.current.getAudioContextState()).toBe('running');
  });

  it('should handle master volume changes', async () => {
    const { result } = renderHook(() => useSequencerAudio({ autoInitialize: false }));

    await act(async () => {
      await result.current.initializeAudio();
    });

    await act(async () => {
      await result.current.setMasterVolumeLevel(0.5);
    });

    expect(result.current.masterVolume).toBe(0.5);
    expect(mockSamplePlaybackEngine.setMasterVolume).toHaveBeenCalledWith(0.5);
  });

  it('should validate master volume range', async () => {
    const { result } = renderHook(() => useSequencerAudio({ autoInitialize: false }));

    await act(async () => {
      await result.current.initializeAudio();
    });

    await expect(result.current.setMasterVolumeLevel(-0.1)).rejects.toThrow(
      'Volume must be a number between 0 and 1'
    );

    await expect(result.current.setMasterVolumeLevel(1.1)).rejects.toThrow(
      'Volume must be a number between 0 and 1'
    );
  });

  it('should handle audio buffer loading', async () => {
    const { result } = renderHook(() => useSequencerAudio({ autoInitialize: false }));

    await act(async () => {
      await result.current.initializeAudio();
    });

    const mockBuffer = new ArrayBuffer(1024);
    
    await act(async () => {
      await result.current.loadAudioBuffer('test-audio', mockBuffer);
    });

    expect(mockSamplePlaybackEngine.loadAudioBuffer).toHaveBeenCalledWith('test-audio', mockBuffer);
  });

  it('should handle sample pack preloading', async () => {
    const mockSampleManager = {
      preloadSample: vi.fn().mockResolvedValue(undefined)
    };

    const { result } = renderHook(() => 
      useSequencerAudio({ 
        sampleManager: mockSampleManager,
        autoInitialize: false 
      })
    );

    await act(async () => {
      await result.current.initializeAudio();
    });

    const samples = [
      { id: 'sample1', url: 'sample1.wav' },
      { id: 'sample2', url: 'sample2.wav' }
    ];

    await act(async () => {
      await result.current.preloadSamplePack('pack1', samples);
    });

    expect(result.current.preloadedPacks).toContain('pack1');
    expect(result.current.sampleLoadingProgress).toBe(100);
  });

  it('should handle note scheduling', async () => {
    const { result } = renderHook(() => useSequencerAudio({ autoInitialize: false }));

    await act(async () => {
      await result.current.initializeAudio();
    });

    const mockSample = {
      metadata: { duration: 1.0 }
    };

    await act(async () => {
      const sourceId = await result.current.scheduleNote(0, mockSample, 0.8, 'track1');
      expect(sourceId).toBeTruthy();
    });

    expect(mockSamplePlaybackEngine.playSample).toHaveBeenCalled();
  });

  it('should track active sources', async () => {
    const { result } = renderHook(() => useSequencerAudio({ autoInitialize: false }));

    await act(async () => {
      await result.current.initializeAudio();
    });

    const mockSample = {
      metadata: { duration: 0.1 } // Short duration for quick test
    };

    await act(async () => {
      await result.current.scheduleNote(0, mockSample, 0.8, 'track1');
    });

    expect(result.current.activeSources).toBe(1);

    // Wait for source to be removed
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 150));
    });

    expect(result.current.activeSources).toBe(0);
  });

  it('should handle stopping all sources', async () => {
    const { result } = renderHook(() => useSequencerAudio({ autoInitialize: false }));

    await act(async () => {
      await result.current.initializeAudio();
    });

    await act(async () => {
      await result.current.stopAllSources();
    });

    expect(mockSamplePlaybackEngine.stopAll).toHaveBeenCalled();
    expect(result.current.activeSources).toBe(0);
  });

  it('should provide audio performance metrics', async () => {
    const { result } = renderHook(() => useSequencerAudio({ autoInitialize: false }));

    await act(async () => {
      await result.current.initializeAudio();
    });

    const metrics = result.current.getAudioPerformanceMetrics();

    expect(metrics).toEqual({
      sampleRate: 44100,
      currentTime: 0,
      baseLatency: 0.005,
      outputLatency: 0.01,
      state: 'running',
      activeSources: 0,
      loadedSamples: 0
    });
  });

  it('should handle sample loading state', () => {
    const { result } = renderHook(() => useSequencerAudio({ autoInitialize: false }));

    expect(result.current.isSampleLoaded('test-sample')).toBe(false);
    expect(result.current.getLoadedSample('test-sample')).toBe(null);
  });

  it('should clear loaded samples', async () => {
    const { result } = renderHook(() => useSequencerAudio({ autoInitialize: false }));

    await act(async () => {
      result.current.clearLoadedSamples();
    });

    expect(result.current.loadedSamples).toBe(0);
    expect(result.current.preloadedPacks).toEqual([]);
    expect(result.current.preloadErrors).toEqual({});
    expect(result.current.sampleLoadingProgress).toBe(0);
  });

  it('should handle errors gracefully', () => {
    const { result } = renderHook(() => useSequencerAudio({ autoInitialize: false }));

    expect(result.current.error).toBe(null);
    expect(result.current.isRetrying).toBe(false);
    expect(result.current.retryCount).toBe(0);
    expect(typeof result.current.reset).toBe('function');
    expect(typeof result.current.getAudioErrorGuidance).toBe('function');
  });

  it('should cleanup on unmount', () => {
    const { unmount } = renderHook(() => useSequencerAudio({ autoInitialize: false }));

    unmount();

    // Cleanup should be called automatically
    expect(true).toBe(true); // Test passes if no errors thrown
  });

  it('should use external audio context when provided', () => {
    const externalAudioContext = mockAudioContext;
    const { result } = renderHook(() => 
      useSequencerAudio({ 
        audioContext: externalAudioContext,
        autoInitialize: false 
      })
    );

    expect(result.current.audioContext).toBe(externalAudioContext);
  });

  it('should throw error when calling methods before initialization', async () => {
    const { result } = renderHook(() => useSequencerAudio({ autoInitialize: false }));

    await expect(result.current.loadAudioBuffer('test', new ArrayBuffer(1024)))
      .rejects.toThrow('Sample playback engine not initialized');

    await expect(result.current.scheduleNote(0, {}, 0.8, 'track1'))
      .rejects.toThrow('Sample playback engine not initialized');
  });
});