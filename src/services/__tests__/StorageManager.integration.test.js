/**
 * StorageManager Integration Test
 * 
 * Simple integration test to verify StorageManager functionality
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';

describe('StorageManager Integration', () => {
  let StorageManager;
  let storageManager;

  beforeEach(async () => {
    // Dynamic import to get fresh instance
    const module = await import('../StorageManager.js');
    StorageManager = module.default.constructor;
    storageManager = new StorageManager();
  });

  afterEach(async () => {
    if (storageManager) {
      await storageManager.close();
    }
  });

  describe('Basic Functionality', () => {
    it('should create StorageManager instance', () => {
      expect(storageManager).toBeDefined();
      expect(storageManager.config).toBeDefined();
      expect(storageManager.config.maxStorageSize).toBeGreaterThan(0);
      expect(storageManager.config.maxEntries).toBeGreaterThan(0);
    });

    it('should generate consistent IDs for YouTube URLs', () => {
      const urls = [
        'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        'https://youtu.be/dQw4w9WgXcQ',
        'https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=30s'
      ];

      const ids = urls.map(url => storageManager.generateId(url));
      
      // All should generate the same ID (based on video ID)
      expect(ids[0]).toBe('yt_dQw4w9WgXcQ');
      expect(ids[1]).toBe('yt_dQw4w9WgXcQ');
      expect(ids[2]).toBe('yt_dQw4w9WgXcQ');
    });

    it('should handle non-YouTube URLs', () => {
      const url = 'https://example.com/audio.mp3';
      const id = storageManager.generateId(url);
      
      expect(id).toMatch(/^url_/);
      expect(id.length).toBeGreaterThan(4);
    });

    it('should format sizes correctly', () => {
      expect(storageManager.formatSize(0)).toBe('0 B');
      expect(storageManager.formatSize(1024)).toBe('1 KB');
      expect(storageManager.formatSize(1024 * 1024)).toBe('1 MB');
      expect(storageManager.formatSize(1024 * 1024 * 1024)).toBe('1 GB');
      expect(storageManager.formatSize(1536)).toBe('1.5 KB');
    });

    it('should calculate expiration correctly', () => {
      const now = Date.now();
      const ttl = storageManager.config.entryTTL;
      
      const freshEntry = { timestamp: now };
      const expiredEntry = { timestamp: now - ttl - 1000 };
      
      expect(storageManager.isExpired(freshEntry)).toBe(false);
      expect(storageManager.isExpired(expiredEntry)).toBe(true);
    });
  });

  describe('Audio Buffer Serialization', () => {
    it('should serialize and deserialize audio buffer correctly', () => {
      // Create mock audio buffer
      const mockBuffer = {
        numberOfChannels: 2,
        sampleRate: 44100,
        duration: 10,
        getChannelData: (channel) => {
          const data = new Float32Array(44100);
          for (let i = 0; i < data.length; i++) {
            data[i] = Math.sin(2 * Math.PI * 440 * i / 44100) * 0.5;
          }
          return data;
        }
      };

      // Serialize
      const serialized = storageManager.serializeAudioBuffer(mockBuffer);
      expect(serialized).toBeDefined();
      expect(serialized.channels).toHaveLength(2);
      expect(serialized.sampleRate).toBe(44100);
      expect(serialized.numberOfChannels).toBe(2);
      expect(serialized.duration).toBe(10);

      // Deserialize
      const deserialized = storageManager.deserializeAudioBuffer(
        serialized, 
        serialized.sampleRate, 
        serialized.numberOfChannels
      );
      
      expect(deserialized).toBeDefined();
      expect(deserialized.numberOfChannels).toBe(2);
      expect(deserialized.sampleRate).toBe(44100);
      expect(deserialized.duration).toBeCloseTo(1, 1); // Approximately 1 second for 44100 samples
    });

    it('should calculate size correctly', () => {
      const audioData = {
        channels: [
          new Array(44100).fill(0.5), // 1 second of audio
          new Array(44100).fill(0.5)  // 2 channels
        ]
      };
      const waveformData = new Array(400).fill(0.3);

      const size = storageManager.calculateSize(audioData, waveformData);
      
      // Should be approximately: (44100 * 2 channels * 4 bytes) + (400 * 4 bytes) + 1024 overhead
      const expectedSize = (44100 * 2 * 4) + (400 * 4) + 1024;
      expect(size).toBeCloseTo(expectedSize, -2); // Within 100 bytes
    });
  });

  describe('Configuration', () => {
    it('should have reasonable default configuration', () => {
      const config = storageManager.config;
      
      expect(config.maxStorageSize).toBe(500 * 1024 * 1024); // 500MB
      expect(config.maxEntries).toBe(50);
      expect(config.cleanupThreshold).toBe(0.8);
      expect(config.entryTTL).toBe(24 * 60 * 60 * 1000); // 24 hours
      expect(config.retryAttempts).toBe(3);
      expect(config.retryDelay).toBe(1000);
    });

    it('should allow configuration updates', () => {
      const originalMaxEntries = storageManager.config.maxEntries;
      
      storageManager.config.maxEntries = 25;
      expect(storageManager.config.maxEntries).toBe(25);
      
      // Restore original
      storageManager.config.maxEntries = originalMaxEntries;
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid audio buffer gracefully', () => {
      const invalidBuffer = null;
      
      expect(() => {
        storageManager.serializeAudioBuffer(invalidBuffer);
      }).toThrow();
    });

    it('should handle missing channel data gracefully', () => {
      const invalidBuffer = {
        numberOfChannels: 2,
        sampleRate: 44100,
        duration: 10,
        getChannelData: () => {
          throw new Error('Channel data error');
        }
      };

      expect(() => {
        storageManager.serializeAudioBuffer(invalidBuffer);
      }).toThrow();
    });
  });

  describe('Memory Management', () => {
    it('should have memory management capabilities', () => {
      // This test verifies the StorageManager has memory management methods
      expect(typeof storageManager.calculateSize).toBe('function');
      expect(typeof storageManager.formatSize).toBe('function');
      
      // Test that calculateSize returns reasonable values
      const mockAudioData = {
        channels: [new Array(1000).fill(0.5)]
      };
      const size = storageManager.calculateSize(mockAudioData, null);
      expect(size).toBeGreaterThan(0);
      expect(typeof size).toBe('number');
    });
  });
});