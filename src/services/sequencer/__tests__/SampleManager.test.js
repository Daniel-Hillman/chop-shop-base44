import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SampleManager } from '../SampleManager.js';

// Mock SamplePlaybackEngine
const mockSamplePlaybackEngine = {
  preloadSample: vi.fn().mockResolvedValue(undefined),
  playSample: vi.fn().mockResolvedValue(undefined),
  loadSample: vi.fn().mockResolvedValue({}),
  isLoaded: vi.fn().mockReturnValue(true)
};

describe('SampleManager', () => {
  let sampleManager;

  beforeEach(() => {
    vi.clearAllMocks();
    sampleManager = new SampleManager();
  });

  afterEach(() => {
    if (sampleManager) {
      sampleManager.destroy();
    }
  });

  describe('Constructor', () => {
    it('should initialize with default values', () => {
      expect(sampleManager.samples).toBeInstanceOf(Map);
      expect(sampleManager.samples.size).toBe(0);
      expect(sampleManager.samplePlaybackEngine).toBeNull();
      expect(sampleManager.trackSampleAssignments).toBeInstanceOf(Map);
      expect(sampleManager.preloadedSamples).toBeInstanceOf(Set);
      expect(sampleManager.isLoading).toBe(false);
    });
  });

  describe('Initialization', () => {
    it('should initialize with SamplePlaybackEngine', () => {
      sampleManager.initialize(mockSamplePlaybackEngine);
      
      expect(sampleManager.samplePlaybackEngine).toBe(mockSamplePlaybackEngine);
    });

    it('should throw error without SamplePlaybackEngine', () => {
      expect(() => sampleManager.initialize(null)).toThrow('SamplePlaybackEngine is required for SampleManager');
    });
  });

  describe('Sample Loading', () => {
    beforeEach(() => {
      sampleManager.initialize(mockSamplePlaybackEngine);
    });

    it('should load a single sample', async () => {
      const sampleId = 'test_sample';
      const url = '/samples/test.wav';
      const metadata = {
        name: 'Test Sample',
        duration: 1.0,
        tags: ['test']
      };

      const sample = await sampleManager.loadSample(sampleId, url, metadata);

      expect(sample.id).toBe(sampleId);
      expect(sample.name).toBe('Test Sample');
      expect(sample.filename).toBe(url);
      expect(sample.metadata.duration).toBe(1.0);
      expect(sample.tags).toEqual(['test']);
      expect(sampleManager.samples.has(sampleId)).toBe(true);
    });

    it('should load sample with default metadata', async () => {
      const sampleId = 'test_sample';
      const url = '/samples/test.wav';

      const sample = await sampleManager.loadSample(sampleId, url);

      expect(sample.name).toBe(sampleId);
      expect(sample.metadata.duration).toBe(1.0);
      expect(sample.metadata.sampleRate).toBe(44100);
      expect(sample.tags).toEqual([]);
    });

    it('should throw error for invalid sample ID', async () => {
      await expect(sampleManager.loadSample('', '/test.wav')).rejects.toThrow('Sample ID is required and must be a string');
      await expect(sampleManager.loadSample(null, '/test.wav')).rejects.toThrow('Sample ID is required and must be a string');
    });

    it('should throw error for invalid URL', async () => {
      await expect(sampleManager.loadSample('test', '')).rejects.toThrow('Sample URL is required and must be a string');
      await expect(sampleManager.loadSample('test', null)).rejects.toThrow('Sample URL is required and must be a string');
    });

    it('should load sample pack', async () => {
      await sampleManager.loadSamplePack('default');

      expect(sampleManager.samples.size).toBeGreaterThan(0);
      expect(sampleManager.isLoading).toBe(false);
    });

    it('should throw error for invalid pack ID', async () => {
      await expect(sampleManager.loadSamplePack('')).rejects.toThrow('Pack ID is required and must be a string');
      await expect(sampleManager.loadSamplePack(null)).rejects.toThrow('Pack ID is required and must be a string');
    });

    it('should handle sample pack loading errors', async () => {
      // Mock an error in the loading process
      const originalLoadSample = sampleManager.loadSample;
      sampleManager.loadSample = vi.fn().mockRejectedValue(new Error('Load error'));

      await expect(sampleManager.loadSamplePack('test')).rejects.toThrow('Load error');
      expect(sampleManager.isLoading).toBe(false);

      // Restore original method
      sampleManager.loadSample = originalLoadSample;
    });

    it('should handle concurrent sample loading', async () => {
      const loadPromises = [
        sampleManager.loadSample('sample1', '/sample1.wav'),
        sampleManager.loadSample('sample2', '/sample2.wav'),
        sampleManager.loadSample('sample3', '/sample3.wav')
      ];

      const samples = await Promise.all(loadPromises);

      expect(samples).toHaveLength(3);
      expect(sampleManager.samples.size).toBe(3);
      samples.forEach((sample, index) => {
        expect(sample.id).toBe(`sample${index + 1}`);
      });
    });

    it('should handle duplicate sample loading', async () => {
      const sampleId = 'duplicate_test';
      const url = '/duplicate.wav';

      // Load sample first time
      const sample1 = await sampleManager.loadSample(sampleId, url);
      
      // Load same sample again - should overwrite the first one
      const sample2 = await sampleManager.loadSample(sampleId, url);

      expect(sample1.id).toBe(sample2.id);
      expect(sampleManager.samples.size).toBe(1);
      expect(sampleManager.getSample(sampleId)).toBe(sample2);
    });

    it('should handle invalid sample metadata during loading', async () => {
      const invalidMetadata = {
        name: '', // Empty name should be replaced with ID
        duration: -1, // Invalid duration is preserved as-is
        sampleRate: 'invalid', // Invalid sample rate is preserved as-is
        tags: 'not-array' // Invalid tags are preserved as-is
      };

      const sample = await sampleManager.loadSample('test', '/test.wav', invalidMetadata);

      expect(sample.name).toBe('test'); // Should use ID as fallback for empty name
      expect(sample.metadata.duration).toBe(-1); // Invalid values are preserved
      expect(sample.metadata.sampleRate).toBe('invalid'); // Invalid values are preserved
      expect(sample.tags).toBe('not-array'); // Invalid values are preserved
    });

    it('should handle large sample pack loading with progress tracking', async () => {
      // Mock a large sample pack
      const largePack = Array.from({ length: 20 }, (_, i) => ({
        id: `sample_${i}`,
        url: `/samples/sample_${i}.wav`,
        metadata: { name: `Sample ${i}` }
      }));

      // Mock the default drum kit to return our large pack
      const originalGetDefaultDrumKit = sampleManager.getDefaultDrumKit;
      sampleManager.getDefaultDrumKit = vi.fn(() => largePack);

      await sampleManager.loadSamplePack('large');

      expect(sampleManager.samples.size).toBe(20);
      expect(sampleManager.isLoading).toBe(false);

      const progress = sampleManager.getLoadingProgress();
      expect(progress.total).toBe(20);
      expect(progress.percentage).toBe(0); // No samples preloaded yet

      // Restore original method
      sampleManager.getDefaultDrumKit = originalGetDefaultDrumKit;
    });
  });

  describe('Sample Preloading', () => {
    beforeEach(async () => {
      sampleManager.initialize(mockSamplePlaybackEngine);
      await sampleManager.loadSample('test1', '/test1.wav');
      await sampleManager.loadSample('test2', '/test2.wav');
    });

    it('should preload samples', async () => {
      const sampleList = ['test1', 'test2'];

      await sampleManager.preloadSamples(sampleList);

      expect(mockSamplePlaybackEngine.preloadSample).toHaveBeenCalledTimes(2);
      expect(sampleManager.preloadedSamples.has('test1')).toBe(true);
      expect(sampleManager.preloadedSamples.has('test2')).toBe(true);
      expect(sampleManager.isLoading).toBe(false);
    });

    it('should skip already preloaded samples', async () => {
      sampleManager.preloadedSamples.add('test1');

      await sampleManager.preloadSamples(['test1', 'test2']);

      expect(mockSamplePlaybackEngine.preloadSample).toHaveBeenCalledTimes(1);
      expect(mockSamplePlaybackEngine.preloadSample).toHaveBeenCalledWith('/test2.wav');
    });

    it('should handle preloading errors gracefully', async () => {
      mockSamplePlaybackEngine.preloadSample.mockRejectedValueOnce(new Error('Preload error'));

      await expect(sampleManager.preloadSamples(['test1'])).resolves.not.toThrow();
      expect(sampleManager.isLoading).toBe(false);
    });

    it('should throw error for invalid sample list', async () => {
      await expect(sampleManager.preloadSamples('not-array')).rejects.toThrow('Sample list must be an array');
    });

    it('should skip non-existent samples during preloading', async () => {
      await sampleManager.preloadSamples(['test1', 'non-existent']);

      expect(mockSamplePlaybackEngine.preloadSample).toHaveBeenCalledTimes(1);
      expect(mockSamplePlaybackEngine.preloadSample).toHaveBeenCalledWith('/test1.wav');
    });
  });

  describe('Sample Retrieval', () => {
    beforeEach(async () => {
      sampleManager.initialize(mockSamplePlaybackEngine);
      await sampleManager.loadSample('test1', '/test1.wav', { tags: ['kick'] });
      await sampleManager.loadSample('test2', '/test2.wav', { tags: ['snare'] });
      await sampleManager.loadSample('test3', '/test3.wav', { tags: ['kick', 'electronic'] });
    });

    it('should get sample by ID', () => {
      const sample = sampleManager.getSample('test1');

      expect(sample).toBeDefined();
      expect(sample.id).toBe('test1');
    });

    it('should return null for non-existent sample', () => {
      const sample = sampleManager.getSample('non-existent');

      expect(sample).toBeNull();
    });

    it('should return null for invalid sample ID', () => {
      expect(sampleManager.getSample('')).toBeNull();
      expect(sampleManager.getSample(null)).toBeNull();
    });

    it('should get all samples', () => {
      const allSamples = sampleManager.getAllSamples();

      expect(allSamples).toHaveLength(3);
      expect(allSamples.map(s => s.id)).toEqual(['test1', 'test2', 'test3']);
    });

    it('should get samples by tag', () => {
      const kickSamples = sampleManager.getSamplesByTag('kick');

      expect(kickSamples).toHaveLength(2);
      expect(kickSamples.map(s => s.id)).toEqual(['test1', 'test3']);
    });

    it('should return empty array for non-existent tag', () => {
      const samples = sampleManager.getSamplesByTag('non-existent');

      expect(samples).toEqual([]);
    });

    it('should return empty array for invalid tag', () => {
      expect(sampleManager.getSamplesByTag('')).toEqual([]);
      expect(sampleManager.getSamplesByTag(null)).toEqual([]);
    });
  });

  describe('Track Sample Assignment', () => {
    beforeEach(async () => {
      sampleManager.initialize(mockSamplePlaybackEngine);
      await sampleManager.loadSample('kick', '/kick.wav');
      await sampleManager.loadSample('snare', '/snare.wav');
    });

    it('should assign sample to track', () => {
      const result = sampleManager.assignSampleToTrack('track1', 'kick');

      expect(result).toBe(true);
      expect(sampleManager.trackSampleAssignments.get('track1')).toBe('kick');
    });

    it('should validate sample assignment', () => {
      expect(sampleManager.validateSampleAssignment('track1', 'kick')).toBe(true);
      expect(sampleManager.validateSampleAssignment('track1', 'non-existent')).toBe(false);
      expect(sampleManager.validateSampleAssignment('', 'kick')).toBe(false);
      expect(sampleManager.validateSampleAssignment('track1', '')).toBe(false);
    });

    it('should reject invalid sample assignment', () => {
      const result = sampleManager.assignSampleToTrack('track1', 'non-existent');

      expect(result).toBe(false);
      expect(sampleManager.trackSampleAssignments.has('track1')).toBe(false);
    });

    it('should get track sample', () => {
      sampleManager.assignSampleToTrack('track1', 'kick');

      const sample = sampleManager.getTrackSample('track1');

      expect(sample).toBeDefined();
      expect(sample.id).toBe('kick');
    });

    it('should return null for unassigned track', () => {
      const sample = sampleManager.getTrackSample('unassigned');

      expect(sample).toBeNull();
    });

    it('should return null for invalid track ID', () => {
      expect(sampleManager.getTrackSample('')).toBeNull();
      expect(sampleManager.getTrackSample(null)).toBeNull();
    });

    it('should get track assignments', () => {
      sampleManager.assignSampleToTrack('track1', 'kick');
      sampleManager.assignSampleToTrack('track2', 'snare');

      const assignments = sampleManager.getTrackAssignments();

      expect(assignments.size).toBe(2);
      expect(assignments.get('track1')).toBe('kick');
      expect(assignments.get('track2')).toBe('snare');
    });

    it('should remove track assignment', () => {
      sampleManager.assignSampleToTrack('track1', 'kick');

      const result = sampleManager.removeTrackAssignment('track1');

      expect(result).toBe(true);
      expect(sampleManager.trackSampleAssignments.has('track1')).toBe(false);
    });

    it('should return false when removing non-existent assignment', () => {
      const result = sampleManager.removeTrackAssignment('non-existent');

      expect(result).toBe(false);
    });

    it('should return false for invalid track ID when removing', () => {
      expect(sampleManager.removeTrackAssignment('')).toBe(false);
      expect(sampleManager.removeTrackAssignment(null)).toBe(false);
    });
  });

  describe('Sample Playback', () => {
    beforeEach(async () => {
      sampleManager.initialize(mockSamplePlaybackEngine);
      await sampleManager.loadSample('kick', '/kick.wav');
    });

    it('should play sample', async () => {
      await sampleManager.playSample('kick', 0.8, 1.0);

      expect(mockSamplePlaybackEngine.playSample).toHaveBeenCalledWith('/kick.wav', 0.8, 1.0);
    });

    it('should handle playback of non-existent sample', async () => {
      await expect(sampleManager.playSample('non-existent')).resolves.not.toThrow();
      expect(mockSamplePlaybackEngine.playSample).not.toHaveBeenCalled();
    });

    it('should handle playback errors gracefully', async () => {
      mockSamplePlaybackEngine.playSample.mockRejectedValueOnce(new Error('Playback error'));

      await expect(sampleManager.playSample('kick')).resolves.not.toThrow();
    });

    it('should use default parameters for playback', async () => {
      await sampleManager.playSample('kick');

      expect(mockSamplePlaybackEngine.playSample).toHaveBeenCalledWith('/kick.wav', 1.0, 0);
    });
  });

  describe('Loading Progress', () => {
    beforeEach(async () => {
      sampleManager.initialize(mockSamplePlaybackEngine);
      await sampleManager.loadSample('test1', '/test1.wav');
      await sampleManager.loadSample('test2', '/test2.wav');
    });

    it('should get loading progress', () => {
      sampleManager.preloadedSamples.add('test1');

      const progress = sampleManager.getLoadingProgress();

      expect(progress.total).toBe(2);
      expect(progress.loaded).toBe(1);
      expect(progress.percentage).toBe(50);
      expect(progress.isLoading).toBe(false);
    });

    it('should handle empty samples', () => {
      const emptySampleManager = new SampleManager();
      const progress = emptySampleManager.getLoadingProgress();

      expect(progress.total).toBe(0);
      expect(progress.loaded).toBe(0);
      expect(progress.percentage).toBe(0);
    });

    it('should check if sample is preloaded', () => {
      sampleManager.preloadedSamples.add('test1');

      expect(sampleManager.isSamplePreloaded('test1')).toBe(true);
      expect(sampleManager.isSamplePreloaded('test2')).toBe(false);
    });

    it('should check loading status', () => {
      expect(sampleManager.isLoadingSamples()).toBe(false);

      sampleManager.isLoading = true;
      expect(sampleManager.isLoadingSamples()).toBe(true);
    });
  });

  describe('Sample Management', () => {
    beforeEach(async () => {
      sampleManager.initialize(mockSamplePlaybackEngine);
      await sampleManager.loadSample('test1', '/test1.wav');
      await sampleManager.loadSample('test2', '/test2.wav');
      sampleManager.assignSampleToTrack('track1', 'test1');
      sampleManager.preloadedSamples.add('test1');
    });

    it('should clear all samples', () => {
      sampleManager.clearSamples();

      expect(sampleManager.samples.size).toBe(0);
      expect(sampleManager.trackSampleAssignments.size).toBe(0);
      expect(sampleManager.preloadedSamples.size).toBe(0);
      expect(sampleManager.isLoading).toBe(false);
    });

    it('should destroy and cleanup resources', () => {
      sampleManager.destroy();

      expect(sampleManager.samples.size).toBe(0);
      expect(sampleManager.trackSampleAssignments.size).toBe(0);
      expect(sampleManager.preloadedSamples.size).toBe(0);
      expect(sampleManager.samplePlaybackEngine).toBeNull();
    });
  });

  describe('Default Drum Kit', () => {
    it('should provide default drum kit samples', () => {
      const drumKit = sampleManager.getDefaultDrumKit();

      expect(drumKit).toBeInstanceOf(Array);
      expect(drumKit.length).toBeGreaterThan(0);
      
      const kickSample = drumKit.find(s => s.id === 'kick_001');
      expect(kickSample).toBeDefined();
      expect(kickSample.metadata.name).toBe('Kick 001');
      expect(kickSample.metadata.tags).toContain('kick');
    });
  });

  describe('Mock Audio Buffer', () => {
    it('should create mock audio buffer', () => {
      const buffer = sampleManager.createMockAudioBuffer();

      expect(buffer.sampleRate).toBe(44100);
      expect(buffer.length).toBe(44100);
      expect(buffer.duration).toBe(1.0);
      expect(buffer.numberOfChannels).toBe(1);
      expect(typeof buffer.getChannelData).toBe('function');
    });

    it('should return valid channel data', () => {
      const buffer = sampleManager.createMockAudioBuffer();
      const channelData = buffer.getChannelData(0);

      expect(channelData).toBeInstanceOf(Float32Array);
      expect(channelData.length).toBe(44100);
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      sampleManager.initialize(mockSamplePlaybackEngine);
    });

    it('should handle sample loading errors', async () => {
      // Mock console.error to avoid test output noise
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // Force an error in createMockAudioBuffer
      const originalCreateMock = sampleManager.createMockAudioBuffer;
      sampleManager.createMockAudioBuffer = vi.fn(() => {
        throw new Error('Mock buffer error');
      });

      await expect(sampleManager.loadSample('test', '/test.wav')).rejects.toThrow('Mock buffer error');

      // Restore original method and console
      sampleManager.createMockAudioBuffer = originalCreateMock;
      consoleSpy.mockRestore();
    });

    it('should handle playback engine errors during preloading', async () => {
      await sampleManager.loadSample('test', '/test.wav');
      mockSamplePlaybackEngine.preloadSample.mockRejectedValue(new Error('Engine error'));

      // Should not throw, but handle gracefully
      await expect(sampleManager.preloadSamples(['test'])).resolves.not.toThrow();
    });
  });
});