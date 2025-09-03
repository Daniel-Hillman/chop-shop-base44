/**
 * @jest-environment jsdom
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import LazyLoadingManager from '../LazyLoadingManager.js';

// Mock IntersectionObserver
class MockIntersectionObserver {
  constructor(callback, options) {
    this.callback = callback;
    this.options = options;
    this.elements = new Set();
  }

  observe(element) {
    this.elements.add(element);
  }

  unobserve(element) {
    this.elements.delete(element);
  }

  disconnect() {
    this.elements.clear();
  }

  // Helper method to simulate intersection
  simulateIntersection(element, isIntersecting = true) {
    this.callback([{
      target: element,
      isIntersecting
    }]);
  }
}

describe('LazyLoadingManager', () => {
  let lazyLoader;
  let mockElement;
  let mockImage;

  beforeEach(() => {
    // Mock console methods
    vi.spyOn(console, 'debug').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    
    // Mock IntersectionObserver
    global.IntersectionObserver = MockIntersectionObserver;
    
    lazyLoader = new LazyLoadingManager({
      rootMargin: '50px',
      threshold: 0.1,
      loadingClass: 'lazy-loading',
      loadedClass: 'lazy-loaded',
      errorClass: 'lazy-error'
    });

    // Mock DOM element
    mockElement = {
      dataset: {
        src: 'test-image.jpg',
        srcset: 'test-image-2x.jpg 2x'
      },
      classList: {
        add: vi.fn(),
        remove: vi.fn()
      },
      src: '',
      srcset: ''
    };

    // Mock Image constructor
    mockImage = {
      onload: null,
      onerror: null,
      src: ''
    };
    
    global.Image = vi.fn().mockImplementation(() => mockImage);
  });

  afterEach(() => {
    if (lazyLoader) {
      lazyLoader.destroy();
    }
    vi.restoreAllMocks();
  });

  describe('Initialization', () => {
    it('should initialize with default options', () => {
      const loader = new LazyLoadingManager();
      
      expect(loader.rootMargin).toBe('50px');
      expect(loader.threshold).toBe(0.1);
      expect(loader.loadingClass).toBe('lazy-loading');
      expect(loader.loadedClass).toBe('lazy-loaded');
      expect(loader.errorClass).toBe('lazy-error');
      
      loader.destroy();
    });

    it('should initialize with custom options', () => {
      const customOptions = {
        rootMargin: '100px',
        threshold: 0.5,
        loadingClass: 'custom-loading',
        loadedClass: 'custom-loaded',
        errorClass: 'custom-error'
      };
      
      const loader = new LazyLoadingManager(customOptions);
      
      expect(loader.rootMargin).toBe('100px');
      expect(loader.threshold).toBe(0.5);
      expect(loader.loadingClass).toBe('custom-loading');
      expect(loader.loadedClass).toBe('custom-loaded');
      expect(loader.errorClass).toBe('custom-error');
      
      loader.destroy();
    });

    it('should handle missing IntersectionObserver gracefully', () => {
      // Remove IntersectionObserver
      const originalObserver = global.IntersectionObserver;
      delete global.IntersectionObserver;
      
      const loader = new LazyLoadingManager();
      expect(loader.observer).toBeNull();
      
      // Restore
      global.IntersectionObserver = originalObserver;
      loader.destroy();
    });
  });

  describe('Element Observation', () => {
    it('should observe element for lazy loading', () => {
      lazyLoader.observeElement(mockElement, {
        type: 'image',
        src: 'test-image.jpg'
      });
      
      expect(mockElement.classList.add).toHaveBeenCalledWith('lazy-loading');
      expect(lazyLoader.loadingElements.has(mockElement)).toBe(true);
      expect(lazyLoader.stats.totalElements).toBe(1);
    });

    it('should handle null element gracefully', () => {
      expect(() => lazyLoader.observeElement(null)).not.toThrow();
      expect(lazyLoader.stats.totalElements).toBe(0);
    });

    it('should unobserve element', () => {
      lazyLoader.observeElement(mockElement);
      
      expect(lazyLoader.loadingElements.has(mockElement)).toBe(true);
      
      lazyLoader.unobserveElement(mockElement);
      
      expect(lazyLoader.loadingElements.has(mockElement)).toBe(false);
      expect(mockElement.classList.remove).toHaveBeenCalledWith('lazy-loading');
    });

    it('should handle unobserving null element gracefully', () => {
      expect(() => lazyLoader.unobserveElement(null)).not.toThrow();
    });
  });

  describe('Intersection Handling', () => {
    it('should load element when intersecting', () => {
      const loadElementSpy = vi.spyOn(lazyLoader, 'loadElement').mockResolvedValue();
      
      lazyLoader.observeElement(mockElement, {
        type: 'image',
        src: 'test-image.jpg'
      });
      
      // Simulate intersection
      lazyLoader.observer.simulateIntersection(mockElement, true);
      
      expect(loadElementSpy).toHaveBeenCalledWith(mockElement, expect.any(Object));
      
      loadElementSpy.mockRestore();
    });

    it('should not load element when not intersecting', () => {
      const loadElementSpy = vi.spyOn(lazyLoader, 'loadElement').mockResolvedValue();
      
      lazyLoader.observeElement(mockElement, {
        type: 'image',
        src: 'test-image.jpg'
      });
      
      // Simulate no intersection
      lazyLoader.observer.simulateIntersection(mockElement, false);
      
      expect(loadElementSpy).not.toHaveBeenCalled();
      
      loadElementSpy.mockRestore();
    });

    it('should not load already loaded elements', () => {
      const loadElementSpy = vi.spyOn(lazyLoader, 'loadElement').mockResolvedValue();
      
      lazyLoader.observeElement(mockElement);
      lazyLoader.loadedElements.add(mockElement);
      
      // Simulate intersection
      lazyLoader.observer.simulateIntersection(mockElement, true);
      
      expect(loadElementSpy).not.toHaveBeenCalled();
      
      loadElementSpy.mockRestore();
    });
  });

  describe('Image Loading', () => {
    it('should load image successfully', async () => {
      const loadingInfo = {
        src: 'test-image.jpg',
        srcset: 'test-image-2x.jpg 2x'
      };
      
      // Simulate successful image load
      setTimeout(() => {
        if (mockImage.onload) mockImage.onload();
      }, 10);
      
      await lazyLoader.loadImage(mockElement, loadingInfo);
      
      expect(mockElement.src).toBe('test-image.jpg');
      expect(mockElement.srcset).toBe('test-image-2x.jpg 2x');
      expect(mockElement.dataset.src).toBeUndefined();
      expect(mockElement.dataset.srcset).toBeUndefined();
    });

    it('should handle image loading failure', async () => {
      const loadingInfo = {
        src: 'test-image.jpg'
      };
      
      // Simulate image load error
      setTimeout(() => {
        if (mockImage.onerror) mockImage.onerror();
      }, 10);
      
      await expect(lazyLoader.loadImage(mockElement, loadingInfo)).rejects.toThrow();
    });

    it('should use fallback image on error', async () => {
      const loadingInfo = {
        src: 'test-image.jpg',
        fallback: 'fallback-image.jpg'
      };
      
      let imageCount = 0;
      global.Image = vi.fn().mockImplementation(() => {
        const img = {
          onload: null,
          onerror: null,
          src: ''
        };
        
        // First image fails, second (fallback) succeeds
        setTimeout(() => {
          if (imageCount === 0) {
            if (img.onerror) img.onerror();
          } else {
            if (img.onload) img.onload();
          }
          imageCount++;
        }, 10);
        
        return img;
      });
      
      await lazyLoader.loadImage(mockElement, loadingInfo);
      
      expect(mockElement.src).toBe('fallback-image.jpg');
    });

    it('should handle missing source gracefully', async () => {
      const loadingInfo = {};
      
      await expect(lazyLoader.loadImage(mockElement, loadingInfo)).rejects.toThrow('No source provided for image');
    });
  });

  describe('Component Loading', () => {
    it('should load component with callback', async () => {
      const mockCallback = vi.fn().mockResolvedValue();
      const loadingInfo = {
        callback: mockCallback
      };
      
      await lazyLoader.loadComponent(mockElement, loadingInfo);
      
      expect(mockCallback).toHaveBeenCalledWith(mockElement, loadingInfo);
    });

    it('should handle missing callback and source', async () => {
      const loadingInfo = {};
      
      await expect(lazyLoader.loadComponent(mockElement, loadingInfo)).rejects.toThrow();
    });
  });

  describe('Loading States', () => {
    it('should mark element as loaded', () => {
      const loadingInfo = { startTime: Date.now() - 100 };
      
      lazyLoader.markAsLoaded(mockElement, loadingInfo);
      
      expect(mockElement.classList.remove).toHaveBeenCalledWith('lazy-loading');
      expect(mockElement.classList.add).toHaveBeenCalledWith('lazy-loaded');
      expect(lazyLoader.loadedElements.has(mockElement)).toBe(true);
      expect(lazyLoader.stats.loadedElements).toBe(1);
    });

    it('should mark element as failed', () => {
      const loadingInfo = { startTime: Date.now() - 100 };
      const error = new Error('Load failed');
      
      lazyLoader.markAsFailed(mockElement, loadingInfo, error);
      
      expect(mockElement.classList.remove).toHaveBeenCalledWith('lazy-loading');
      expect(mockElement.classList.add).toHaveBeenCalledWith('lazy-error');
      expect(lazyLoader.failedElements.has(mockElement)).toBe(true);
      expect(lazyLoader.stats.failedElements).toBe(1);
    });

    it('should update average load time', () => {
      const loadingInfo1 = { startTime: Date.now() - 100 };
      const loadingInfo2 = { startTime: Date.now() - 200 };
      
      const mockElement2 = {
        classList: {
          add: vi.fn(),
          remove: vi.fn()
        }
      };
      
      lazyLoader.markAsLoaded(mockElement, loadingInfo1);
      lazyLoader.markAsLoaded(mockElement2, loadingInfo2);
      
      expect(lazyLoader.stats.averageLoadTime).toBeGreaterThan(0);
      expect(lazyLoader.stats.loadTimes.length).toBe(2);
    });

    it('should limit load times array size', () => {
      // Add many load times
      for (let i = 0; i < 150; i++) {
        const loadingInfo = { startTime: Date.now() - 100 };
        const mockEl = {
          classList: {
            add: vi.fn(),
            remove: vi.fn()
          }
        };
        lazyLoader.markAsLoaded(mockEl, loadingInfo);
      }
      
      expect(lazyLoader.stats.loadTimes.length).toBeLessThanOrEqual(50);
    });
  });

  describe('Image Preloading', () => {
    it('should preload multiple images', async () => {
      const imageSrcs = ['image1.jpg', 'image2.jpg', 'image3.jpg'];
      
      // Mock successful preloading
      global.Image = vi.fn().mockImplementation(() => {
        const img = {
          onload: null,
          onerror: null,
          src: ''
        };
        
        setTimeout(() => {
          if (img.onload) img.onload();
        }, 10);
        
        return img;
      });
      
      const results = await lazyLoader.preloadImages(imageSrcs);
      
      expect(results).toHaveLength(3);
      expect(results.every(result => result.status === 'fulfilled')).toBe(true);
    });

    it('should handle preload failures gracefully', async () => {
      const imageSrcs = ['good-image.jpg', 'bad-image.jpg'];
      
      let imageCount = 0;
      global.Image = vi.fn().mockImplementation(() => {
        const img = {
          onload: null,
          onerror: null,
          src: ''
        };
        
        setTimeout(() => {
          if (imageCount === 0) {
            if (img.onload) img.onload();
          } else {
            if (img.onerror) img.onerror();
          }
          imageCount++;
        }, 10);
        
        return img;
      });
      
      const results = await lazyLoader.preloadImages(imageSrcs);
      
      expect(results).toHaveLength(2);
      expect(results[0].status).toBe('fulfilled');
      expect(results[1].status).toBe('rejected');
    });

    it('should handle preload timeout', async () => {
      const imageSrcs = ['slow-image.jpg'];
      
      // Mock slow loading image
      global.Image = vi.fn().mockImplementation(() => ({
        onload: null,
        onerror: null,
        src: ''
        // Never call onload or onerror to simulate timeout
      }));
      
      const results = await lazyLoader.preloadImages(imageSrcs, { timeout: 50 });
      
      expect(results).toHaveLength(1);
      expect(results[0].status).toBe('rejected');
    });
  });

  describe('Statistics', () => {
    it('should provide accurate statistics', () => {
      lazyLoader.observeElement(mockElement);
      lazyLoader.markAsLoaded(mockElement, { startTime: Date.now() - 100 });
      
      const stats = lazyLoader.getStats();
      
      expect(stats).toHaveProperty('totalElements');
      expect(stats).toHaveProperty('loadedElements');
      expect(stats).toHaveProperty('failedElements');
      expect(stats).toHaveProperty('averageLoadTime');
      expect(stats).toHaveProperty('successRate');
      expect(stats).toHaveProperty('failureRate');
      expect(stats).toHaveProperty('pendingElements');
      
      expect(stats.totalElements).toBe(1);
      expect(stats.loadedElements).toBe(1);
      expect(stats.successRate).toBe(100);
      expect(stats.failureRate).toBe(0);
    });

    it('should calculate success and failure rates correctly', () => {
      // Add successful and failed elements
      lazyLoader.stats.totalElements = 10;
      lazyLoader.stats.loadedElements = 7;
      lazyLoader.stats.failedElements = 3;
      
      const stats = lazyLoader.getStats();
      
      expect(stats.successRate).toBe(70);
      expect(stats.failureRate).toBe(30);
    });

    it('should handle zero total elements', () => {
      const stats = lazyLoader.getStats();
      
      expect(stats.successRate).toBe(0);
      expect(stats.failureRate).toBe(0);
    });
  });

  describe('Reset and Cleanup', () => {
    it('should reset all loading states', () => {
      lazyLoader.observeElement(mockElement);
      lazyLoader.markAsLoaded(mockElement, { startTime: Date.now() - 100 });
      
      expect(lazyLoader.stats.totalElements).toBe(1);
      expect(lazyLoader.loadedElements.size).toBe(1);
      
      lazyLoader.reset();
      
      expect(lazyLoader.stats.totalElements).toBe(0);
      expect(lazyLoader.loadedElements.size).toBe(0);
      expect(lazyLoader.loadingElements.size).toBe(0);
      expect(lazyLoader.failedElements.size).toBe(0);
    });

    it('should destroy lazy loading manager', () => {
      const disconnectSpy = vi.spyOn(lazyLoader.observer, 'disconnect');
      
      lazyLoader.observeElement(mockElement);
      
      expect(lazyLoader.loadingElements.size).toBe(1);
      
      lazyLoader.destroy();
      
      expect(disconnectSpy).toHaveBeenCalled();
      expect(lazyLoader.observer).toBeNull();
      expect(lazyLoader.loadingElements.size).toBe(0);
    });
  });

  describe('Performance', () => {
    it('should handle many elements efficiently', () => {
      const startTime = Date.now();
      
      // Add many elements
      for (let i = 0; i < 1000; i++) {
        const element = {
          dataset: { src: `image${i}.jpg` },
          classList: { add: vi.fn(), remove: vi.fn() }
        };
        lazyLoader.observeElement(element);
      }
      
      const observeTime = Date.now() - startTime;
      expect(observeTime).toBeLessThan(1000); // Should complete in under 1 second
      
      const stats = lazyLoader.getStats();
      expect(stats.totalElements).toBe(1000);
    });

    it('should maintain performance with frequent state changes', () => {
      const elements = [];
      
      // Create many elements
      for (let i = 0; i < 100; i++) {
        const element = {
          dataset: { src: `image${i}.jpg` },
          classList: { add: vi.fn(), remove: vi.fn() }
        };
        elements.push(element);
        lazyLoader.observeElement(element);
      }
      
      const startTime = Date.now();
      
      // Mark all as loaded
      elements.forEach(element => {
        lazyLoader.markAsLoaded(element, { startTime: Date.now() - 100 });
      });
      
      const markTime = Date.now() - startTime;
      expect(markTime).toBeLessThan(500); // Should complete in under 500ms
      
      const stats = lazyLoader.getStats();
      expect(stats.loadedElements).toBe(100);
    });
  });

  describe('Error Handling', () => {
    it('should handle intersection observer errors gracefully', () => {
      // Mock observer to throw error
      lazyLoader.observer.observe = vi.fn().mockImplementation(() => {
        throw new Error('Observer error');
      });
      
      expect(() => lazyLoader.observeElement(mockElement)).not.toThrow();
    });

    it('should handle loading errors gracefully', async () => {
      const loadingInfo = {
        type: 'unknown',
        src: 'test.jpg'
      };
      
      // Should handle unknown type gracefully
      await expect(lazyLoader.loadElement(mockElement, loadingInfo)).resolves.not.toThrow();
    });

    it('should handle statistics calculation errors', () => {
      // Mock stats to have invalid values
      lazyLoader.stats.loadTimes = null;
      
      expect(() => lazyLoader.updateAverageLoadTime()).not.toThrow();
    });
  });
});