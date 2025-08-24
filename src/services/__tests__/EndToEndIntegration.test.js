import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import audioProcessingService from '../AudioProcessingService.js';
import samplePlaybackEngine from '../SamplePlaybackEngine.js';
import storageManagerService from '../StorageManager.js';
import errorRecoveryService from '../ErrorRecoveryService.js';

// Mock YouTube API
const mockYouTubePlayer = {
  getCurrentTime: vi.fn(() => 0),
  seekTo: vi.fn(),
  getPlayerState: vi.fn(() => 1), // playing
  addEventListener: vi.fn(),
  removeEventListener: vi.fn()
};

// Mock audio context
const mockAudioContext = {
  createBufferSource: vi.fn(() => ({
    connect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
    buffer: null
  })),
  createGain: vi.fn(() => ({
    connect: vi.fn(),
    gain: { value: 1 }
  })),
  destination: {},
  currentTime: 0,
  state: 'running',
  resume: vi.fn(),
  suspend: vi.fn(),
  close: vi.fn()
};

// Mock fetch for Firebase function
global.fetch = vi.fn();

describe('End-to-End Integration Tests', () => {
  let audioService;
  let playbackEngine;
  let storageManager;
  let errorRecovery;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();
    
    // Mock AudioContext
    global.AudioContext = vi.fn(() => mockAudioContext);
    global.webkitAudioContext = vi.fn(() => mockAudioContext);
    
    // Initialize services (they are singletons)
    audioService = audioProcessingService;
    playbackEngine = samplePlaybackEngine;
    storageManager = storageManagerService;
    errorRecovery = errorRecoveryService;
    
    // Mock successful audio download
    const mockAudioBuffer = new ArrayBuffer(1024);
    fetch.mockResolvedValue({
      ok: true,
      arrayBuffer: () => Promise.resolve(mockAudioBuffer),
      headers: new Map([['content-type', 'audio/mpeg']])
    });
  });

  afterEach(() => {
    // Cleanup
    playbackEngine?.cleanup();
    storageManager?.clearAll();
  });

  describe('Complete Workflow: URL Input to Sample Playback', () => {
    it('should handle complete workflow from YouTube URL to sample creation and playback', async () => {
      const testUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
      
      // Step 1: Download and process audio
      const downloadPromise = audioService.downloadAndProcessAudio(testUrl);
      
      // Verify download starts
      expect(audioService.getStatus()).toBe('downloading');
      
      // Wait for download completion
      const result = await downloadPromise;
      
      expect(result.success).toBe(true);
      expect(result.audioBuffer).toBeDefined();
      expect(audioService.getStatus()).toBe('ready');
      
      // Step 2: Initialize playback engine with audio
      await playbackEngine.initialize(result.audioBuffer, mockYouTubePlayer);
      
      // Step 3: Create sample at timestamp
      const sampleData = {
        padId: 'pad-1',
        startTime: 30.5,
        endTime: 35.0,
        volume: 0.8
      };
      
      playbackEngine.createSample(sampleData);
      
      // Step 4: Trigger sample playback
      const playbackResult = await playbackEngine.playSample('pad-1');
      
      expect(playbackResult.success).toBe(true);
      expect(mockYouTubePlayer.seekTo).toHaveBeenCalledWith(30.5, true);
      
      // Step 5: Verify audio context usage
      expect(mockAudioContext.createBufferSource).toHaveBeenCalled();
      expect(mockAudioContext.createGain).toHaveBeenCalled();
    });

    it('should handle multiple rapid sample triggers without conflicts', async () => {
      const testUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
      
      // Setup audio
      const result = await audioService.downloadAndProcessAudio(testUrl);
      await playbackEngine.initialize(result.audioBuffer, mockYouTubePlayer);
      
      // Create multiple samples
      const samples = [
        { padId: 'pad-1', startTime: 10, endTime: 15 },
        { padId: 'pad-2', startTime: 20, endTime: 25 },
        { padId: 'pad-3', startTime: 30, endTime: 35 }
      ];
      
      samples.forEach(sample => playbackEngine.createSample(sample));
      
      // Trigger rapid sample playback
      const playbackPromises = samples.map(sample => 
        playbackEngine.playSample(sample.padId)
      );
      
      const results = await Promise.all(playbackPromises);
      
      // All should succeed
      results.forEach(result => {
        expect(result.success).toBe(true);
      });
      
      // Should have created multiple audio sources
      expect(mockAudioContext.createBufferSource).toHaveBeenCalledTimes(3);
    });
  });

  describe('Seamless Timestamp Jumping and Continuous Playback', () => {
    it('should maintain continuous playback when jumping between timestamps', async () => {
      const testUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
      
      // Setup
      const result = await audioService.downloadAndProcessAudio(testUrl);
      await playbackEngine.initialize(result.audioBuffer, mockYouTubePlayer);
      
      // Create samples at different timestamps
      playbackEngine.createSample({ padId: 'pad-1', startTime: 10, endTime: 15 });
      playbackEngine.createSample({ padId: 'pad-2', startTime: 30, endTime: 35 });
      
      // Start playback at first timestamp
      await playbackEngine.playSample('pad-1');
      expect(mockYouTubePlayer.seekTo).toHaveBeenCalledWith(10, true);
      
      // Jump to second timestamp - should be seamless
      await playbackEngine.playSample('pad-2');
      expect(mockYouTubePlayer.seekTo).toHaveBeenCalledWith(30, true);
      
      // Verify no audio interruption (no stop calls between samples)
      const stopCalls = mockAudioContext.createBufferSource().stop.mock.calls;
      expect(stopCalls.length).toBeLessThanOrEqual(1); // Only final cleanup
    });

    it('should handle timestamp creation during playback without interruption', async () => {
      const testUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
      
      // Setup and start playback
      const result = await audioService.downloadAndProcessAudio(testUrl);
      await playbackEngine.initialize(result.audioBuffer, mockYouTubePlayer);
      
      // Simulate video playing
      mockYouTubePlayer.getCurrentTime.mockReturnValue(25.5);
      
      // Create new sample during playback
      const newSample = playbackEngine.createSampleAtCurrentTime('pad-new');
      
      expect(newSample.startTime).toBe(25.5);
      expect(mockYouTubePlayer.getCurrentTime).toHaveBeenCalled();
      
      // Playback should continue uninterrupted
      expect(mockAudioContext.suspend).not.toHaveBeenCalled();
    });
  });

  describe('Error Recovery and Retry Mechanisms', () => {
    it('should recover from network failures with retry logic', async () => {
      const testUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
      
      // Mock initial failure then success
      fetch
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          arrayBuffer: () => Promise.resolve(new ArrayBuffer(1024)),
          headers: new Map([['content-type', 'audio/mpeg']])
        });
      
      // Should retry and eventually succeed
      const result = await audioService.downloadAndProcessAudio(testUrl);
      
      expect(result.success).toBe(true);
      expect(fetch).toHaveBeenCalledTimes(3); // 2 failures + 1 success
    });

    it('should handle audio processing errors gracefully', async () => {
      const testUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
      
      // Mock corrupted audio data
      fetch.mockResolvedValue({
        ok: true,
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)), // Empty buffer
        headers: new Map([['content-type', 'audio/mpeg']])
      });
      
      const result = await audioService.downloadAndProcessAudio(testUrl);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid audio data');
      expect(audioService.getStatus()).toBe('error');
    });

    it('should recover from AudioContext suspension', async () => {
      const testUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
      
      // Setup
      const result = await audioService.downloadAndProcessAudio(testUrl);
      await playbackEngine.initialize(result.audioBuffer, mockYouTubePlayer);
      
      // Simulate AudioContext suspension
      mockAudioContext.state = 'suspended';
      
      // Attempt playback - should resume context
      await playbackEngine.playSample('pad-1');
      
      expect(mockAudioContext.resume).toHaveBeenCalled();
    });

    it('should handle storage quota exceeded scenarios', async () => {
      const testUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
      
      // Mock storage quota exceeded
      const quotaError = new Error('QuotaExceededError');
      quotaError.name = 'QuotaExceededError';
      
      vi.spyOn(storageManager, 'store').mockRejectedValue(quotaError);
      
      // Should handle gracefully and provide fallback
      const result = await audioService.downloadAndProcessAudio(testUrl);
      
      expect(result.success).toBe(true); // Should succeed with fallback
      expect(result.cached).toBe(false); // But not cached
    });
  });

  describe('Component Integration Without Conflicts', () => {
    it('should coordinate between all services without resource conflicts', async () => {
      const testUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
      
      // Test concurrent operations
      const operations = [
        audioService.downloadAndProcessAudio(testUrl),
        storageManager.cleanup(),
        errorRecovery.checkSystemHealth()
      ];
      
      const results = await Promise.allSettled(operations);
      
      // All operations should complete without throwing
      results.forEach((result, index) => {
        if (result.status === 'rejected') {
          console.error(`Operation ${index} failed:`, result.reason);
        }
        expect(result.status).toBe('fulfilled');
      });
    });

    it('should handle service cleanup without affecting other components', async () => {
      const testUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
      
      // Setup multiple services
      const result = await audioService.downloadAndProcessAudio(testUrl);
      await playbackEngine.initialize(result.audioBuffer, mockYouTubePlayer);
      
      // Create samples
      playbackEngine.createSample({ padId: 'pad-1', startTime: 10, endTime: 15 });
      
      // Cleanup one service
      playbackEngine.cleanup();
      
      // Other services should remain functional
      expect(audioService.getStatus()).toBe('ready');
      expect(() => storageManager.getStorageInfo()).not.toThrow();
    });

    it('should maintain data consistency across service boundaries', async () => {
      const testUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
      
      // Process audio through full pipeline
      const audioResult = await audioService.downloadAndProcessAudio(testUrl);
      
      // Store in cache
      await storageManager.store(testUrl, {
        audioBuffer: audioResult.audioBuffer,
        waveformData: audioResult.waveformData
      });
      
      // Retrieve from cache
      const cachedData = await storageManager.retrieve(testUrl);
      
      // Initialize playback with cached data
      await playbackEngine.initialize(cachedData.audioBuffer, mockYouTubePlayer);
      
      // Data should be consistent across all services
      expect(cachedData.audioBuffer).toBe(audioResult.audioBuffer);
      expect(playbackEngine.isReady()).toBe(true);
    });
  });

  describe('Performance and Memory Management', () => {
    it('should handle large audio files without memory leaks', async () => {
      const testUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
      
      // Mock large audio file (10MB)
      const largeBuffer = new ArrayBuffer(10 * 1024 * 1024);
      fetch.mockResolvedValue({
        ok: true,
        arrayBuffer: () => Promise.resolve(largeBuffer),
        headers: new Map([['content-type', 'audio/mpeg']])
      });
      
      const initialMemory = performance.memory?.usedJSHeapSize || 0;
      
      // Process large file
      const result = await audioService.downloadAndProcessAudio(testUrl);
      await playbackEngine.initialize(result.audioBuffer, mockYouTubePlayer);
      
      // Cleanup
      playbackEngine.cleanup();
      audioService.clearCache();
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
      
      const finalMemory = performance.memory?.usedJSHeapSize || 0;
      const memoryIncrease = finalMemory - initialMemory;
      
      // Memory increase should be reasonable (less than 50MB)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
    });

    it('should maintain responsive performance under load', async () => {
      const testUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
      
      // Setup
      const result = await audioService.downloadAndProcessAudio(testUrl);
      await playbackEngine.initialize(result.audioBuffer, mockYouTubePlayer);
      
      // Create many samples
      const samples = Array.from({ length: 16 }, (_, i) => ({
        padId: `pad-${i}`,
        startTime: i * 5,
        endTime: i * 5 + 2
      }));
      
      samples.forEach(sample => playbackEngine.createSample(sample));
      
      // Measure performance of rapid sample triggers
      const startTime = performance.now();
      
      const playbackPromises = samples.map(sample => 
        playbackEngine.playSample(sample.padId)
      );
      
      await Promise.all(playbackPromises);
      
      const endTime = performance.now();
      const totalTime = endTime - startTime;
      
      // Should complete within reasonable time (less than 1 second)
      expect(totalTime).toBeLessThan(1000);
    });
  });
});