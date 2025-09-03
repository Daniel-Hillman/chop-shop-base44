/**
 * @jest-environment jsdom
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import DiscoveryMemoryManager from '../DiscoveryMemoryManager.js';

describe('DiscoveryMemoryManager', () => {
  let memoryManager;
  let mockElement;
  let mockAudioContext;

  beforeEach(() => {
    // Mock console methods
    vi.spyOn(console, 'debug').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    
    memoryManager = new DiscoveryMemoryManager({
      cleanupInterval: 100,
      memoryCheckInterval: 200,
      maxMemoryUsage: 1024 * 1024 // 1MB
    });

    // Mock DOM element
    mockElement = {
      src: 'test-image.jpg',
      dataset: { src: 'test-image.jpg' },
      classList: {
        add: vi.fn(),
        remove: vi.fn()
      },
      addEventListener: vi.fn(),
      removeEventListener: vi.fn()
    };

    // Mock AudioContext
    mockAudioContext = {
      state: 'running',
      close: vi.fn().mockResolvedValue(undefined),
      constructor: { name: 'AudioContext' }
    };
  });

  afterEach(() => {
    if (memoryManager) {
      memoryManager.destroy();
    }
    vi.restoreAllMocks();
  });

  describe('Resource Registration', () => {
    it('should register image resources', () => {
      memoryManager.registerResource('image', mockElement);
      
      const stats = memoryManager.getMemoryStats();
      expect(stats.managedResources).toBe(1);
      expect(stats.imageCache).toBe(1);
    });

    it('should register audio context resources', () => {
      memoryManager.registerResource('audio', mockAudioContext);
      
      const stats = memoryManager.getMemoryStats();
      expect(stats.managedResources).toBe(1);
      expect(stats.audioContexts).toBe(1);
    });

    it('should register timer resources', () => {
      const timerId = setTimeout(() => {}, 1000);
      memoryManager.registerResource('timer', timerId);
      
      const stats = memoryManager.getMemoryStats();
      expect(stats.managedResources).toBe(1);
      expect(stats.timers).toBe(1);
      
      clearTimeout(timerId);
    });

    it('should register event listener resources', () => {
      const listenerInfo = {
        element: mockElement,
        event: 'click',
        handler: () => {},
        options: false
      };
      
      memoryManager.registerResource('eventListener', listenerInfo);
      
      const stats = memoryManager.getMemoryStats();
      expect(stats.managedResources).toBe(1);
      expect(stats.eventListeners).toBe(1);
    });

    it('should handle registration errors gracefully', () => {
      // Mock generateResourceId to throw an error
      const originalMethod = memoryManager.generateResourceId;
      memoryManager.generateResourceId = vi.fn().mockImplementation(() => {
        throw new Error('ID generation error');
      });
      
      expect(() => memoryManager.registerResource('image', mockElement)).not.toThrow();
      
      // Restore original method
      memoryManager.generateResourceId = originalMethod;
    });
  });

  describe('Resource Unregistration', () => {
    it('should unregister image resources', () => {
      memoryManager.registerResource('image', mockElement);
      
      let stats = memoryManager.getMemoryStats();
      expect(stats.managedResources).toBe(1);
      
      memoryManager.unregisterResource('image', mockElement);
      
      stats = memoryManager.getMemoryStats();
      expect(stats.managedResources).toBe(0);
    });

    it('should unregister audio context resources', () => {
      memoryManager.registerResource('audio', mockAudioContext);
      
      let stats = memoryManager.getMemoryStats();
      expect(stats.managedResources).toBe(1);
      
      memoryManager.unregisterResource('audio', mockAudioContext);
      
      stats = memoryManager.getMemoryStats();
      expect(stats.managedResources).toBe(0);
      expect(mockAudioContext.close).toHaveBeenCalled();
    });

    it('should handle unregistration errors gracefully', () => {
      memoryManager.registerResource('image', mockElement);
      
      // Mock generateResourceId to throw an error
      const originalMethod = memoryManager.generateResourceId;
      memoryManager.generateResourceId = vi.fn().mockImplementation(() => {
        throw new Error('ID generation error');
      });
      
      expect(() => memoryManager.unregisterResource('image', mockElement)).not.toThrow();
      
      // Restore original method
      memoryManager.generateResourceId = originalMethod;
    });
  });

  describe('Resource ID Generation', () => {
    it('should generate unique IDs for different resources', () => {
      const id1 = memoryManager.generateResourceId('image', mockElement);
      const id2 = memoryManager.generateResourceId('image', { src: 'different.jpg' });
      
      expect(id1).not.toBe(id2);
    });

    it('should generate consistent IDs for same image resources', () => {
      const element1 = { src: 'same-image.jpg' };
      const element2 = { src: 'same-image.jpg' };
      
      const id1 = memoryManager.generateResourceId('image', element1);
      const id2 = memoryManager.generateResourceId('image', element2);
      
      // Should be different due to timestamp, but have same base
      expect(id1.split('_')[1]).toBe(id2.split('_')[1]); // Same filename
    });

    it('should handle different resource types', () => {
      const imageId = memoryManager.generateResourceId('image', mockElement);
      const audioId = memoryManager.generateResourceId('audio', mockAudioContext);
      const timerId = memoryManager.generateResourceId('timer', 12345);
      
      expect(imageId.startsWith('image_')).toBe(true);
      expect(audioId.startsWith('audio_')).toBe(true);
      expect(timerId.startsWith('timer_')).toBe(true);
    });
  });

  describe('Memory Estimation', () => {
    it('should estimate resource sizes correctly', () => {
      const imageSize = memoryManager.estimateResourceSize('image', mockElement);
      const audioSize = memoryManager.estimateResourceSize('audio', mockAudioContext);
      const timerSize = memoryManager.estimateResourceSize('timer', 12345);
      
      expect(imageSize).toBe(50 * 1024); // 50KB
      expect(audioSize).toBe(1024 * 1024); // 1MB
      expect(timerSize).toBe(1024); // 1KB
    });

    it('should provide default size for unknown types', () => {
      const unknownSize = memoryManager.estimateResourceSize('unknown', {});
      expect(unknownSize).toBe(1024); // 1KB default
    });

    it('should estimate current memory usage', () => {
      memoryManager.registerResource('image', mockElement);
      memoryManager.registerResource('audio', mockAudioContext);
      
      const usage = memoryManager.estimateCurrentMemoryUsage();
      expect(usage).toBeGreaterThan(0);
      // Allow for some variance in memory calculation
      expect(usage).toBeGreaterThan(1024 * 1024); // At least 1MB
    });
  });

  describe('Cleanup Operations', () => {
    it('should cleanup expired images', () => {
      // Directly add to image cache with old timestamp
      const imageUrl = 'old-image.jpg';
      memoryManager.imageCache.set(imageUrl, {
        element: mockElement,
        loadTime: null,
        lastAccessed: Date.now() - 15 * 60 * 1000, // 15 minutes ago
        size: 50 * 1024
      });
      
      const cleanedCount = memoryManager.cleanupExpiredImages();
      expect(cleanedCount).toBe(1);
      expect(memoryManager.imageCache.has(imageUrl)).toBe(false);
    });

    it('should cleanup closed audio contexts', () => {
      const closedAudioContext = { ...mockAudioContext, state: 'closed' };
      memoryManager.registerAudioContext(closedAudioContext, {
        id: 'test-audio',
        type: 'audio',
        timestamp: Date.now(),
        size: 1024 * 1024
      });
      
      const cleanedCount = memoryManager.cleanupUnusedAudioContexts();
      expect(cleanedCount).toBe(1);
    });

    it('should cleanup old event listeners', () => {
      const oldListenerInfo = {
        element: mockElement,
        event: 'click',
        handler: () => {},
        options: false,
        info: {
          timestamp: Date.now() - 35 * 60 * 1000 // 35 minutes ago
        }
      };
      
      memoryManager.eventListeners.set('old-listener', oldListenerInfo);
      
      const cleanedCount = memoryManager.cleanupOldEventListeners();
      expect(cleanedCount).toBe(1);
      expect(mockElement.removeEventListener).toHaveBeenCalledWith(
        'click',
        oldListenerInfo.handler,
        oldListenerInfo.options
      );
    });

    it('should perform comprehensive cleanup', () => {
      // Register various resources
      memoryManager.registerResource('image', mockElement);
      memoryManager.registerResource('audio', mockAudioContext);
      
      // Force cleanup
      memoryManager.cleanup(true);
      
      const stats = memoryManager.getMemoryStats();
      expect(stats.cleanupCount).toBe(1);
      expect(stats.lastCleanup).toBeTruthy();
    });

    it('should determine when cleanup is needed', () => {
      // Create a fresh memory manager to avoid interference from setup
      const testMemoryManager = new DiscoveryMemoryManager({
        cleanupInterval: 30000,
        memoryCheckInterval: 60000,
        maxMemoryUsage: 1024 * 1024
      });
      
      // Initially should not need cleanup
      expect(testMemoryManager.shouldCleanup()).toBe(false);
      
      // Add many resources to trigger cleanup
      for (let i = 0; i < 150; i++) {
        testMemoryManager.registerResource('image', { src: `image${i}.jpg` });
      }
      
      expect(testMemoryManager.shouldCleanup()).toBe(true);
      
      testMemoryManager.destroy();
    });
  });

  describe('Resource-Specific Cleanup', () => {
    it('should cleanup image resources', () => {
      const imageElement = {
        src: 'test.jpg',
        onload: () => {},
        onerror: () => {}
      };
      
      memoryManager.cleanupImage(imageElement);
      
      expect(imageElement.src).toBe('');
      expect(imageElement.onload).toBeNull();
      expect(imageElement.onerror).toBeNull();
    });

    it('should cleanup image by URL', () => {
      const imageUrl = 'test-image.jpg';
      memoryManager.imageCache.set(imageUrl, { element: mockElement });
      
      memoryManager.cleanupImage(imageUrl);
      
      expect(memoryManager.imageCache.has(imageUrl)).toBe(false);
    });

    it('should cleanup audio context', async () => {
      await memoryManager.cleanupAudioContext(mockAudioContext);
      
      expect(mockAudioContext.close).toHaveBeenCalled();
    });

    it('should handle audio context cleanup errors', async () => {
      const faultyAudioContext = {
        close: vi.fn().mockRejectedValue(new Error('Close failed'))
      };
      
      // Should not throw
      try {
        await memoryManager.cleanupAudioContext(faultyAudioContext);
        // If we get here, it didn't throw
        expect(true).toBe(true);
      } catch (error) {
        // Should not reach here
        expect(false).toBe(true);
      }
    });

    it('should cleanup timers', () => {
      const timerId = 12345;
      memoryManager.timers.add(timerId);
      
      // Mock global timer functions
      global.clearTimeout = vi.fn();
      global.clearInterval = vi.fn();
      
      // Call cleanupTimer directly
      memoryManager.cleanupTimer(timerId);
      
      expect(global.clearTimeout).toHaveBeenCalledWith(timerId);
      expect(global.clearInterval).toHaveBeenCalledWith(timerId);
      expect(memoryManager.timers.has(timerId)).toBe(false);
    });

    it('should cleanup event listeners', () => {
      const listenerInfo = {
        element: mockElement,
        event: 'click',
        handler: () => {},
        options: false
      };
      
      memoryManager.cleanupEventListener(listenerInfo);
      
      expect(mockElement.removeEventListener).toHaveBeenCalledWith(
        'click',
        listenerInfo.handler,
        listenerInfo.options
      );
    });
  });

  describe('Memory Statistics', () => {
    it('should provide accurate memory statistics', () => {
      memoryManager.registerResource('image', mockElement);
      memoryManager.registerResource('audio', mockAudioContext);
      
      const stats = memoryManager.getMemoryStats();
      
      expect(stats).toHaveProperty('peakUsage');
      expect(stats).toHaveProperty('currentUsage');
      expect(stats).toHaveProperty('cleanupCount');
      expect(stats).toHaveProperty('lastCleanup');
      expect(stats).toHaveProperty('managedResources');
      expect(stats).toHaveProperty('imageCache');
      expect(stats).toHaveProperty('audioContexts');
      expect(stats).toHaveProperty('eventListeners');
      expect(stats).toHaveProperty('timers');
      
      expect(stats.managedResources).toBe(2);
      expect(stats.currentUsage).toBeGreaterThan(0);
    });

    it('should track peak memory usage', () => {
      // Create a fresh memory manager to ensure clean state
      const testMemoryManager = new DiscoveryMemoryManager({
        cleanupInterval: 30000,
        memoryCheckInterval: 60000,
        maxMemoryUsage: 1024 * 1024
      });
      
      const initialStats = testMemoryManager.getMemoryStats();
      const initialPeak = initialStats.peakUsage;
      
      // Add a large resource
      testMemoryManager.registerResource('audio', mockAudioContext);
      
      const newStats = testMemoryManager.getMemoryStats();
      expect(newStats.peakUsage).toBeGreaterThan(initialPeak);
      expect(newStats.currentUsage).toBeGreaterThan(0);
      
      testMemoryManager.destroy();
    });
  });

  describe('Memory Monitoring', () => {
    it('should start memory monitoring on initialization', () => {
      expect(memoryManager.memoryMonitorTimer).toBeTruthy();
      expect(memoryManager.cleanupTimer).toBeTruthy();
    });

    it('should stop monitoring on destroy', () => {
      const monitorTimer = memoryManager.memoryMonitorTimer;
      const cleanupTimer = memoryManager.cleanupTimer;
      
      expect(monitorTimer).toBeTruthy();
      expect(cleanupTimer).toBeTruthy();
      
      memoryManager.destroy();
      
      expect(memoryManager.memoryMonitorTimer).toBeNull();
      expect(memoryManager.cleanupTimer).toBeNull();
    });
  });

  describe('Error Handling', () => {
    it('should handle cleanup errors gracefully', () => {
      // Mock cleanup method to throw error
      const originalCleanup = memoryManager.cleanupResource;
      memoryManager.cleanupResource = vi.fn().mockImplementation(() => {
        throw new Error('Cleanup error');
      });
      
      memoryManager.registerResource('image', mockElement);
      
      // Should not throw
      expect(() => memoryManager.cleanup(true)).not.toThrow();
      
      // Restore original method
      memoryManager.cleanupResource = originalCleanup;
    });

    it('should handle memory estimation errors', () => {
      // Mock estimateCurrentMemoryUsage to throw error
      const originalEstimate = memoryManager.estimateCurrentMemoryUsage;
      memoryManager.estimateCurrentMemoryUsage = vi.fn().mockImplementation(() => {
        throw new Error('Estimation error');
      });
      
      // Should not throw and should return stats
      const stats = memoryManager.getMemoryStats();
      expect(stats).toBeTruthy();
      
      // Restore original method
      memoryManager.estimateCurrentMemoryUsage = originalEstimate;
    });
  });

  describe('Garbage Collection', () => {
    it('should attempt forced garbage collection when available', () => {
      // Mock window.gc
      global.window = { gc: vi.fn() };
      
      memoryManager.forceGarbageCollection();
      
      expect(global.window.gc).toHaveBeenCalled();
      
      delete global.window;
    });

    it('should handle missing garbage collection gracefully', () => {
      // Ensure window.gc is not available
      global.window = {};
      
      expect(() => memoryManager.forceGarbageCollection()).not.toThrow();
      
      delete global.window;
    });

    it('should handle garbage collection errors', () => {
      // Mock window.gc to throw error
      global.window = { 
        gc: vi.fn().mockImplementation(() => {
          throw new Error('GC error');
        })
      };
      
      expect(() => memoryManager.forceGarbageCollection()).not.toThrow();
      
      delete global.window;
    });
  });

  describe('Destruction', () => {
    it('should clean up all resources on destroy', () => {
      memoryManager.registerResource('image', mockElement);
      memoryManager.registerResource('audio', mockAudioContext);
      
      const initialStats = memoryManager.getMemoryStats();
      expect(initialStats.managedResources).toBeGreaterThan(0);
      
      memoryManager.destroy();
      
      expect(memoryManager.managedResources.size).toBe(0);
      expect(memoryManager.eventListeners.size).toBe(0);
      expect(memoryManager.timers.size).toBe(0);
      expect(memoryManager.imageCache.size).toBe(0);
      expect(memoryManager.audioContexts.size).toBe(0);
    });
  });
});