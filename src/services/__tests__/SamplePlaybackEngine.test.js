/**
 * SamplePlaybackEngine Test Suite
 * 
 * Comprehensive unit tests for seamless audio sample playback functionality
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SamplePlaybackEngine } from '../SamplePlaybackEngine.js';

// Mock AudioContext and related APIs
const createMockAudioContext = () => {
  const mockGainNode = {
    connect: vi.fn(),
    gain: { value: 1.0 }
  };

  const mockBufferSource = {
    buffer: null,
    connect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
    onended: null
  };

  return {
    state: 'running',
    currentTime: 0,
    destination: {},
    sampleRate: 44100,
    resume: vi.fn().mockResolvedValue(),
    close: vi.fn().mockResolvedValue(),
    createGain: vi.fn(() => mockGainNode),
    createBufferSource: vi.fn(() => mockBufferSource),
    decodeAudioData: vi.fn().mockResolvedValue({
      numberOfChannels: 2,
      sampleRate: 44100,
      duration: 180,
      getChannelData: vi.fn(() => new Float32Array(44100))
    })
  };
};

// Mock StorageManager
const mockStorageManager = {
  getAudioData: vi.fn()
};

// Mock global AudioContext
global.AudioContext = vi.fn(() => createMockAudioContext());
global.webkitAudioContext = global.AudioContext;

describe('SamplePlaybackEngine', () => {
  let engine;
  let mockAudioContext;

  beforeEach(() => {
    vi.clearAllMocks();
    engine = new SamplePlaybackEngine();
    
    // Mock the storage manager
    engine.storageManager = mockStorageManager;
    
    // Get reference to mock audio context
    mockAudioContext = createMockAudioContext();
    global.AudioContext.mockReturnValue(mockAudioContext);
  });

  afterEach(async () => {
    if (engine) {
      await engine.cleanup();
    }
  });

  describe('Initialization', () => {
    it('should initialize with default values', () => {
      expect(engine.audioContext).toBeNull();
      expect(engine.masterGainNode).toBeNull();
      expect(engine.audioBuffer).toBeNull();
      expect(engine.isInitialized).toBe(false);
      expect(engine.masterVolume).toBe(1.0);
      expect(engine.activeSources.size).toBe(0);
    });

    it('should initialize AudioContext successfully', async () => {
      await engine.initializeAudioContext();
      
      expect(engine.audioContext).toBeDefined();
      expect(engine.masterGainNode).toBeDefined();
      expect(engine.isInitialized).toBe(true);
      expect(global.AudioContext).toHaveBeenCalled();
    });

    it('should resume suspended AudioContext', async () => {
      mockAudioContext.state = 'suspended';
      engine.audioContext = mockAudioContext;
      
      await engine.initializeAudioContext();
      
      expect(mockAudioContext.resume).toHaveBeenCalled();
    });

    it('should handle AudioContext initialization errors', async () => {
      global.AudioContext.mockImplementation(() => {
        throw new Error('AudioContext not supported');
      });

      await expect(engine.initializeAudioContext()).rejects.toThrow(
        'AudioContext initialization failed'
      );
    });

    it('should not reinitialize if already initialized', async () => {
      await engine.initializeAudioContext();
      const firstContext = engine.audioContext;
      
      await engine.initializeAudioContext();
      
      expect(engine.audioContext).toBe(firstContext);
    });
  });

  describe('Audio Buffer Loading', () => {
    beforeEach(async () => {
      await engine.initializeAudioContext();
    });

    it('should load audio buffer from provided ArrayBuffer', async () => {
      const mockArrayBuffer = new ArrayBuffer(1000);
      
      const result = await engine.loadAudioBuffer('test-id', mockArrayBuffer);
      
      expect(mockAudioContext.decodeAudioData).toHaveBeenCalledWith(mockArrayBuffer);
      expect(engine.audioBuffer).toBeDefined();
      expect(result).toBe(engine.audioBuffer);
    });

    it('should load audio buffer from storage', async () => {
      const mockArrayBuffer = new ArrayBuffer(1000);
      mockStorageManager.getAudioData.mockResolvedValue({
        audioBuffer: mockArrayBuffer
      });
      
      const result = await engine.loadAudioBuffer('test-id');
      
      expect(mockStorageManager.getAudioData).toHaveBeenCalledWith('test-id');
      expect(mockAudioContext.decodeAudioData).toHaveBeenCalledWith(mockArrayBuffer);
      expect(result).toBe(engine.audioBuffer);
    });

    it('should throw error if no audio buffer found in storage', async () => {
      mockStorageManager.getAudioData.mockResolvedValue(null);
      
      await expect(engine.loadAudioBuffer('test-id')).rejects.toThrow(
        'No audio buffer found for ID: test-id'
      );
    });

    it('should handle decoding errors', async () => {
      const mockArrayBuffer = new ArrayBuffer(1000);
      mockAudioContext.decodeAudioData.mockRejectedValue(new Error('Invalid audio data'));
      
      await expect(engine.loadAudioBuffer('test-id', mockArrayBuffer)).rejects.toThrow(
        'Audio buffer loading failed'
      );
    });
  });

  describe('Sample Playback', () => {
    beforeEach(async () => {
      await engine.initializeAudioContext();
      engine.audioBuffer = {
        duration: 180,
        numberOfChannels: 2,
        sampleRate: 44100
      };
    });

    it('should play sample successfully', async () => {
      const result = await engine.playSample(10, 5, 0.8);
      
      expect(result).toHaveProperty('id');
      expect(result.startTime).toBe(10);
      expect(result.duration).toBe(5);
      expect(result.volume).toBe(0.8);
      expect(engine.activeSources.size).toBe(1);
    });

    it('should generate unique sample ID if not provided', async () => {
      const result1 = await engine.playSample(10);
      const result2 = await engine.playSample(20);
      
      expect(result1.id).not.toBe(result2.id);
      expect(engine.activeSources.size).toBe(2);
    });

    it('should use provided sample ID', async () => {
      const customId = 'custom-sample-id';
      const result = await engine.playSample(10, 5, 0.8, customId);
      
      expect(result.id).toBe(customId);
      expect(engine.activeSources.has(customId)).toBe(true);
    });

    it('should validate start time bounds', async () => {
      await expect(engine.playSample(-1)).rejects.toThrow('Invalid start time');
      await expect(engine.playSample(200)).rejects.toThrow('Invalid start time');
    });

    it('should limit duration to available audio', async () => {
      const result = await engine.playSample(170, 20); // Only 10 seconds left
      
      expect(result.duration).toBe(10);
    });

    it('should play to end if no duration specified', async () => {
      const result = await engine.playSample(170);
      
      expect(result.duration).toBe(10);
    });

    it('should use master volume if no volume specified', async () => {
      engine.setMasterVolume(0.5);
      const result = await engine.playSample(10);
      
      expect(result.volume).toBe(0.5);
    });

    it('should throw error if no audio buffer loaded', async () => {
      engine.audioBuffer = null;
      
      await expect(engine.playSample(10)).rejects.toThrow('No audio buffer loaded');
    });

    it('should clean up sample when ended', async () => {
      const mockSource = mockAudioContext.createBufferSource();
      const result = await engine.playSample(10, 5);
      
      // Simulate sample ending
      const sample = engine.activeSources.get(result.id);
      sample.source.onended();
      
      expect(engine.activeSources.has(result.id)).toBe(false);
    });
  });

  describe('Sample Control', () => {
    beforeEach(async () => {
      await engine.initializeAudioContext();
      engine.audioBuffer = { duration: 180 };
    });

    it('should stop specific sample by ID', async () => {
      const result = await engine.playSample(10, 5);
      const stopped = engine.stopSample(result.id);
      
      expect(stopped).toBe(true);
      expect(engine.activeSources.has(result.id)).toBe(false);
    });

    it('should return false when stopping non-existent sample', () => {
      const stopped = engine.stopSample('non-existent-id');
      expect(stopped).toBe(false);
    });

    it('should stop all samples', async () => {
      await engine.playSample(10, 5);
      await engine.playSample(20, 5);
      await engine.playSample(30, 5);
      
      expect(engine.activeSources.size).toBe(3);
      
      engine.stopAllSamples();
      
      expect(engine.activeSources.size).toBe(0);
    });

    it('should handle errors when stopping samples gracefully', async () => {
      const result = await engine.playSample(10, 5);
      const sample = engine.activeSources.get(result.id);
      
      // Mock stop to throw error
      sample.source.stop = vi.fn(() => {
        throw new Error('Stop failed');
      });
      
      const stopped = engine.stopSample(result.id);
      expect(stopped).toBe(false);
    });
  });

  describe('Volume Control', () => {
    beforeEach(async () => {
      await engine.initializeAudioContext();
    });

    it('should set master volume', () => {
      engine.setMasterVolume(0.5);
      
      expect(engine.masterVolume).toBe(0.5);
      expect(engine.masterGainNode.gain.value).toBe(0.5);
    });

    it('should clamp master volume to valid range', () => {
      engine.setMasterVolume(-0.5);
      expect(engine.masterVolume).toBe(0);
      
      engine.setMasterVolume(1.5);
      expect(engine.masterVolume).toBe(1);
    });

    it('should set sample volume', async () => {
      engine.audioBuffer = { duration: 180 };
      const result = await engine.playSample(10, 5);
      
      const volumeSet = engine.setSampleVolume(result.id, 0.3);
      
      expect(volumeSet).toBe(true);
      const sample = engine.activeSources.get(result.id);
      expect(sample.gainNode.gain.value).toBe(0.3);
    });

    it('should return false when setting volume for non-existent sample', () => {
      const volumeSet = engine.setSampleVolume('non-existent', 0.5);
      expect(volumeSet).toBe(false);
    });

    it('should clamp sample volume to valid range', async () => {
      engine.audioBuffer = { duration: 180 };
      const result = await engine.playSample(10, 5);
      
      engine.setSampleVolume(result.id, -0.5);
      const sample1 = engine.activeSources.get(result.id);
      expect(sample1.gainNode.gain.value).toBe(0);
      
      engine.setSampleVolume(result.id, 1.5);
      const sample2 = engine.activeSources.get(result.id);
      expect(sample2.gainNode.gain.value).toBe(1);
    });
  });

  describe('Timestamp Jumping', () => {
    beforeEach(async () => {
      await engine.initializeAudioContext();
      engine.audioBuffer = { duration: 180 };
    });

    it('should jump to timestamp with playback', async () => {
      // Start some samples
      await engine.playSample(10, 5);
      await engine.playSample(20, 5);
      
      const result = await engine.jumpToTimestamp(50, true);
      
      expect(result.startTime).toBe(50);
      expect(engine.activeSources.size).toBe(1); // Old samples stopped, new one started
    });

    it('should jump to timestamp without playback', async () => {
      await engine.playSample(10, 5);
      
      const result = await engine.jumpToTimestamp(50, false);
      
      expect(result.timestamp).toBe(50);
      expect(result.playing).toBe(false);
      expect(engine.activeSources.size).toBe(0);
    });

    it('should validate timestamp bounds', async () => {
      await expect(engine.jumpToTimestamp(-1)).rejects.toThrow('Invalid timestamp');
      await expect(engine.jumpToTimestamp(200)).rejects.toThrow('Invalid timestamp');
    });

    it('should throw error if no audio buffer loaded', async () => {
      engine.audioBuffer = null;
      
      await expect(engine.jumpToTimestamp(50)).rejects.toThrow('No audio buffer loaded');
    });
  });

  describe('Status and Information', () => {
    it('should provide engine status', () => {
      const status = engine.getStatus();
      
      expect(status).toHaveProperty('isInitialized');
      expect(status).toHaveProperty('audioContextState');
      expect(status).toHaveProperty('hasAudioBuffer');
      expect(status).toHaveProperty('audioBufferDuration');
      expect(status).toHaveProperty('activeSamplesCount');
      expect(status).toHaveProperty('masterVolume');
    });

    it('should provide active samples information', async () => {
      await engine.initializeAudioContext();
      engine.audioBuffer = { duration: 180 };
      
      await engine.playSample(10, 5, 0.8, 'sample1');
      await engine.playSample(20, 3, 0.6, 'sample2');
      
      const activeSamples = engine.getActiveSamples();
      
      expect(activeSamples).toHaveLength(2);
      expect(activeSamples[0]).toHaveProperty('id');
      expect(activeSamples[0]).toHaveProperty('startTime');
      expect(activeSamples[0]).toHaveProperty('duration');
      expect(activeSamples[0]).toHaveProperty('elapsed');
      expect(activeSamples[0]).toHaveProperty('remaining');
      expect(activeSamples[0]).toHaveProperty('volume');
    });

    it('should calculate elapsed and remaining time correctly', async () => {
      await engine.initializeAudioContext();
      engine.audioBuffer = { duration: 180 };
      
      // Mock current time progression
      mockAudioContext.currentTime = 0;
      await engine.playSample(10, 5);
      
      mockAudioContext.currentTime = 2; // 2 seconds later
      const activeSamples = engine.getActiveSamples();
      
      expect(activeSamples[0].elapsed).toBe(2);
      expect(activeSamples[0].remaining).toBe(3);
    });
  });

  describe('Cleanup', () => {
    it('should cleanup all resources', async () => {
      await engine.initializeAudioContext();
      engine.audioBuffer = { duration: 180 };
      
      await engine.playSample(10, 5);
      await engine.playSample(20, 5);
      
      await engine.cleanup();
      
      expect(engine.audioContext).toBeNull();
      expect(engine.masterGainNode).toBeNull();
      expect(engine.audioBuffer).toBeNull();
      expect(engine.isInitialized).toBe(false);
      expect(engine.activeSources.size).toBe(0);
    });

    it('should handle cleanup errors gracefully', async () => {
      await engine.initializeAudioContext();
      
      // Mock close to throw error
      mockAudioContext.close.mockRejectedValue(new Error('Close failed'));
      
      // Should not throw
      await expect(engine.cleanup()).resolves.not.toThrow();
    });

    it('should handle cleanup when not initialized', async () => {
      // Should not throw
      await expect(engine.cleanup()).resolves.not.toThrow();
    });
  });

  describe('Error Handling', () => {
    it('should handle volume control errors gracefully', () => {
      // Mock gain node to throw error
      const mockGainNode = {
        connect: vi.fn(),
        gain: {
          get value() { throw new Error('Gain error'); },
          set value(v) { throw new Error('Gain error'); }
        }
      };
      
      engine.masterGainNode = mockGainNode;
      
      // Should not throw
      expect(() => engine.setMasterVolume(0.5)).not.toThrow();
    });

    it('should handle sample volume errors gracefully', async () => {
      await engine.initializeAudioContext();
      engine.audioBuffer = { duration: 180 };
      
      const result = await engine.playSample(10, 5);
      const sample = engine.activeSources.get(result.id);
      
      // Mock gain to throw error
      Object.defineProperty(sample.gainNode.gain, 'value', {
        set: () => { throw new Error('Gain error'); }
      });
      
      const volumeSet = engine.setSampleVolume(result.id, 0.5);
      expect(volumeSet).toBe(false);
    });
  });

  describe('Concurrent Playback', () => {
    beforeEach(async () => {
      await engine.initializeAudioContext();
      engine.audioBuffer = { duration: 180 };
    });

    it('should handle multiple overlapping samples', async () => {
      const samples = [];
      
      // Start multiple overlapping samples
      for (let i = 0; i < 5; i++) {
        const sample = await engine.playSample(i * 10, 15);
        samples.push(sample);
      }
      
      expect(engine.activeSources.size).toBe(5);
      
      // Each sample should have unique ID
      const ids = samples.map(s => s.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(5);
    });

    it('should manage audio graph connections correctly', async () => {
      const sample1 = await engine.playSample(10, 5);
      const sample2 = await engine.playSample(20, 5);
      
      // Verify audio graph connections
      const source1 = engine.activeSources.get(sample1.id).source;
      const source2 = engine.activeSources.get(sample2.id).source;
      
      expect(source1.connect).toHaveBeenCalled();
      expect(source2.connect).toHaveBeenCalled();
    });
  });
});