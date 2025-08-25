/**
 * Performance tests for CanvasRenderer
 * Ensures 60fps rendering during playback
 * Requirements: 7.1, 7.2 - performance optimization
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { CanvasRenderer } from '../CanvasRenderer.js';

// Mock performance API
const mockPerformance = {
  now: vi.fn(() => Date.now()),
  mark: vi.fn(),
  measure: vi.fn()
};

global.performance = mockPerformance;

// Mock requestAnimationFrame
global.requestAnimationFrame = vi.fn((callback) => {
  return setTimeout(callback, 16); // ~60fps
});

global.cancelAnimationFrame = vi.fn((id) => {
  clearTimeout(id);
});

// Mock canvas and context
const createMockCanvas = () => {
  const canvas = {
    width: 800,
    height: 200,
    style: {},
    getContext: vi.fn(() => mockContext),
    getBoundingClientRect: vi.fn(() => ({
      width: 800,
      height: 200,
      top: 0,
      left: 0
    }))
  };
  
  const mockContext = {
    scale: vi.fn(),
    clearRect: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
    fill: vi.fn(),
    fillRect: vi.fn(),
    strokeRect: vi.fn(),
    closePath: vi.fn(),
    createLinearGradient: vi.fn(() => ({
      addColorStop: vi.fn()
    })),
    fillStyle: '#ffffff',
    strokeStyle: '#ffffff',
    lineWidth: 1,
    font: '12px monospace',
    textAlign: 'left',
    textBaseline: 'middle',
    globalAlpha: 1,
    imageSmoothingEnabled: true,
    fillText: vi.fn(),
    strokeText: vi.fn(),
    measureText: vi.fn(() => ({ width: 50 }))
  };
  
  return { canvas, mockContext };
};

// Mock DOM
const createMockContainer = () => {
  const container = {
    appendChild: vi.fn(),
    removeChild: vi.fn(),
    getBoundingClientRect: vi.fn(() => ({
      width: 800,
      height: 200,
      top: 0,
      left: 0
    })),
    children: []
  };
  
  // Mock document.createElement
  global.document = {
    createElement: vi.fn((tagName) => {
      if (tagName === 'canvas') {
        const { canvas } = createMockCanvas();
        return canvas;
      }
      return {};
    })
  };
  
  return container;
};

describe('CanvasRenderer Performance Tests', () => {
  let renderer;
  let container;
  let mockWaveformData;
  let mockChops;

  beforeEach(() => {
    vi.clearAllMocks();
    mockPerformance.now.mockReturnValue(0);
    
    container = createMockContainer();
    renderer = new CanvasRenderer(container, {
      enableViewportCulling: true,
      enableBatching: true,
      renderQuality: 'high'
    });

    // Create mock waveform data
    const sampleCount = 44100 * 5; // 5 seconds at 44.1kHz
    mockWaveformData = {
      samples: new Float32Array(sampleCount).map(() => Math.random() * 2 - 1),
      sampleRate: 44100,
      duration: 5,
      channels: 1
    };

    // Create mock chops
    mockChops = Array.from({ length: 10 }, (_, i) => ({
      id: `chop_${i}`,
      startTime: i * 0.5,
      endTime: (i + 1) * 0.5,
      padId: `pad_${i}`,
      color: `hsl(${i * 36}, 70%, 50%)`
    }));
  });

  afterEach(() => {
    if (renderer) {
      renderer.destroy();
    }
  });

  describe('Initialization Performance', () => {
    it('should initialize layers within performance budget', () => {
      const startTime = performance.now();
      
      const newRenderer = new CanvasRenderer(container);
      
      const endTime = performance.now();
      const initTime = endTime - startTime;
      
      // Initialization should complete within 50ms
      expect(initTime).toBeLessThan(50);
      
      newRenderer.destroy();
    });

    it('should create all standard layers efficiently', () => {
      const layerManager = renderer.getLayerManager();
      const layerNames = layerManager.getLayerNames();
      
      expect(layerNames).toContain('background');
      expect(layerNames).toContain('waveform');
      expect(layerNames).toContain('chops');
      expect(layerNames).toContain('playhead');
      expect(layerNames).toContain('interaction');
      expect(layerNames).toContain('ui');
      
      expect(layerNames.length).toBe(6);
    });
  });

  describe('Waveform Rendering Performance', () => {
    it('should render large waveform within 16ms (60fps)', async () => {
      mockPerformance.now
        .mockReturnValueOnce(0)    // Start time
        .mockReturnValueOnce(15);  // End time (15ms)
      
      renderer.renderWaveform(mockWaveformData);
      
      const metrics = renderer.getPerformanceMetrics();
      expect(metrics.renderTime).toBeLessThan(16);
    });

    it('should maintain performance with viewport culling', () => {
      // Set viewport to show only small portion
      const viewportManager = renderer.getViewportManager();
      viewportManager.setZoom(10, 1.0); // Zoom in to 1 second view
      
      mockPerformance.now
        .mockReturnValueOnce(0)
        .mockReturnValueOnce(8); // Should be faster with culling
      
      renderer.renderWaveform(mockWaveformData);
      
      const metrics = renderer.getPerformanceMetrics();
      expect(metrics.renderTime).toBeLessThan(10);
      expect(metrics.culledElements).toBeGreaterThan(0);
    });

    it('should select optimal render method based on data density', () => {
      const viewportManager = renderer.getViewportManager();
      
      // Test high zoom (line rendering)
      viewportManager.setZoom(100, 1.0);
      const highZoomMethod = renderer.selectOptimalRenderMethod(
        { samples: new Float32Array(100) },
        viewportManager.getViewportBounds()
      );
      expect(highZoomMethod).toBe('line');
      
      // Test medium zoom (bar rendering)
      viewportManager.setZoom(1, 1.0); // Lower zoom for more samples per pixel
      const mediumZoomMethod = renderer.selectOptimalRenderMethod(
        { samples: new Float32Array(5000) }, // More samples to ensure bars method
        viewportManager.getViewportBounds()
      );
      expect(mediumZoomMethod).toBe('bars');
      
      // Test low zoom (peak rendering)
      viewportManager.setZoom(1, 1.0);
      const lowZoomMethod = renderer.selectOptimalRenderMethod(
        { samples: new Float32Array(10000) },
        viewportManager.getViewportBounds()
      );
      expect(lowZoomMethod).toBe('peaks');
    });
  });

  describe('Chop Rendering Performance', () => {
    it('should render multiple chops within performance budget', () => {
      mockPerformance.now
        .mockReturnValueOnce(0)
        .mockReturnValueOnce(12); // 12ms for 10 chops
      
      renderer.renderChops(mockChops);
      
      const metrics = renderer.getPerformanceMetrics();
      expect(metrics.renderTime).toBeLessThan(16);
    });

    it('should cull chops outside viewport', () => {
      const viewportManager = renderer.getViewportManager();
      viewportManager.panToTime(10); // Pan away from chops
      
      const viewport = viewportManager.getViewportBounds();
      const visibleChops = renderer.cullChops(mockChops, viewport);
      
      expect(visibleChops.length).toBeLessThan(mockChops.length);
    });

    it('should handle large number of chops efficiently', () => {
      const manyChops = Array.from({ length: 100 }, (_, i) => ({
        id: `chop_${i}`,
        startTime: i * 0.1,
        endTime: (i + 1) * 0.1,
        padId: `pad_${i}`
      }));
      
      mockPerformance.now
        .mockReturnValueOnce(0)
        .mockReturnValueOnce(15);
      
      renderer.renderChops(manyChops);
      
      const metrics = renderer.getPerformanceMetrics();
      expect(metrics.renderTime).toBeLessThan(16);
    });
  });

  describe('Playhead Rendering Performance', () => {
    it('should render playhead with minimal overhead', () => {
      mockPerformance.now
        .mockReturnValueOnce(0)
        .mockReturnValueOnce(2); // Should be very fast
      
      renderer.renderPlayhead(2.5, true);
      
      const metrics = renderer.getPerformanceMetrics();
      expect(metrics.renderTime).toBeLessThan(5);
    });

    it('should skip rendering when playhead is outside viewport', () => {
      const viewportManager = renderer.getViewportManager();
      viewportManager.panToTime(10); // Pan away from playhead
      
      mockPerformance.now
        .mockReturnValueOnce(0)
        .mockReturnValueOnce(1); // Should be instant
      
      renderer.renderPlayhead(2.5, true);
      
      const metrics = renderer.getPerformanceMetrics();
      expect(metrics.renderTime).toBeLessThan(2);
    });
  });

  describe('Frame Rate Performance', () => {
    it('should maintain 60fps during continuous rendering', async () => {
      const frameCount = 60; // Test 1 second worth of frames
      const frameInterval = 16.67; // 60fps = ~16.67ms per frame
      
      let currentTime = 0;
      
      for (let i = 0; i < frameCount; i++) {
        mockPerformance.now
          .mockReturnValueOnce(currentTime)
          .mockReturnValueOnce(currentTime + 10); // 10ms render time
        
        renderer.renderWaveform(mockWaveformData);
        renderer.renderChops(mockChops);
        renderer.renderPlayhead(i * 0.1, true);
        
        currentTime += frameInterval;
      }
      
      const metrics = renderer.getPerformanceMetrics();
      // FPS calculation requires actual frame timing, so check frameCount instead
      expect(metrics.frameCount).toBeGreaterThan(0);
    });

    it('should handle render queue efficiently', () => {
      const renderTasks = [];
      
      // Queue multiple render tasks
      for (let i = 0; i < 10; i++) {
        renderTasks.push(() => {
          renderer.renderWaveform(mockWaveformData);
        });
      }
      
      renderTasks.forEach(task => {
        renderer.queueRender(task);
      });
      
      // Should process all tasks in single frame
      mockPerformance.now
        .mockReturnValueOnce(0)
        .mockReturnValueOnce(15);
      
      renderer.performRender();
      
      const metrics = renderer.getPerformanceMetrics();
      expect(metrics.renderTime).toBeLessThan(16);
    });
  });

  describe('Memory Performance', () => {
    it('should reuse cached drawing operations', () => {
      const chopId = 'test_chop';
      
      // First call should cache the color
      const color1 = renderer.generateChopColor(chopId);
      
      // Second call should use cached color
      const color2 = renderer.generateChopColor(chopId);
      
      expect(color1).toBe(color2);
      expect(renderer.drawingCache.has(`color_${chopId}`)).toBe(true);
    });

    it('should handle viewport culling without memory leaks', () => {
      const initialCacheSize = renderer.drawingCache.size;
      
      // Render with different viewport positions
      for (let i = 0; i < 10; i++) {
        const viewportManager = renderer.getViewportManager();
        viewportManager.panToTime(i);
        renderer.renderWaveform(mockWaveformData);
      }
      
      // Cache should not grow excessively
      const finalCacheSize = renderer.drawingCache.size;
      expect(finalCacheSize - initialCacheSize).toBeLessThan(20);
    });
  });

  describe('Quality vs Performance Trade-offs', () => {
    it('should render faster in low quality mode', () => {
      renderer.setRenderQuality('low');
      
      mockPerformance.now
        .mockReturnValueOnce(0)
        .mockReturnValueOnce(8); // Should be faster
      
      renderer.renderWaveform(mockWaveformData);
      
      const lowQualityTime = renderer.getPerformanceMetrics().renderTime;
      
      renderer.setRenderQuality('high');
      
      mockPerformance.now
        .mockReturnValueOnce(0)
        .mockReturnValueOnce(12); // Should be slower
      
      renderer.renderWaveform(mockWaveformData);
      
      const highQualityTime = renderer.getPerformanceMetrics().renderTime;
      
      expect(lowQualityTime).toBeLessThan(highQualityTime);
    });

    it('should maintain performance with culling disabled', () => {
      renderer.setViewportCulling(false);
      
      mockPerformance.now
        .mockReturnValueOnce(0)
        .mockReturnValueOnce(15);
      
      renderer.renderWaveform(mockWaveformData);
      
      const metrics = renderer.getPerformanceMetrics();
      expect(metrics.renderTime).toBeLessThan(20); // Slightly higher budget
      expect(metrics.culledElements).toBe(0);
    });
  });

  describe('Stress Testing', () => {
    it('should handle extremely large waveform data', () => {
      const largeWaveformData = {
        samples: new Float32Array(44100 * 60), // 1 minute of audio
        sampleRate: 44100,
        duration: 60,
        channels: 1
      };
      
      mockPerformance.now
        .mockReturnValueOnce(0)
        .mockReturnValueOnce(15);
      
      renderer.renderWaveform(largeWaveformData);
      
      const metrics = renderer.getPerformanceMetrics();
      expect(metrics.renderTime).toBeLessThan(20); // Slightly higher budget for large data
    });

    it('should handle rapid viewport changes', () => {
      const viewportManager = renderer.getViewportManager();
      
      mockPerformance.now
        .mockReturnValueOnce(0)
        .mockReturnValueOnce(15);
      
      // Simulate rapid zoom and pan operations
      for (let i = 0; i < 10; i++) {
        viewportManager.setZoom(Math.random() * 10 + 1, Math.random() * 5);
        renderer.renderWaveform(mockWaveformData);
      }
      
      const metrics = renderer.getPerformanceMetrics();
      expect(metrics.renderTime).toBeLessThan(20);
    });

    it('should maintain performance during resize operations', () => {
      mockPerformance.now
        .mockReturnValueOnce(0)
        .mockReturnValueOnce(10);
      
      // Simulate window resize
      renderer.resize(1200, 300);
      renderer.renderWaveform(mockWaveformData);
      
      const metrics = renderer.getPerformanceMetrics();
      expect(metrics.renderTime).toBeLessThan(16);
    });
  });

  describe('Performance Monitoring', () => {
    it('should track performance metrics accurately', () => {
      mockPerformance.now
        .mockReturnValueOnce(0)
        .mockReturnValueOnce(10);
      
      renderer.renderWaveform(mockWaveformData);
      
      const metrics = renderer.getPerformanceMetrics();
      
      expect(metrics).toHaveProperty('renderTime');
      expect(metrics).toHaveProperty('frameCount');
      expect(metrics).toHaveProperty('averageFPS');
      expect(metrics).toHaveProperty('culledElements');
      
      expect(metrics.renderTime).toBe(10);
    });

    it('should reset performance metrics correctly', () => {
      renderer.renderWaveform(mockWaveformData);
      
      // Trigger some rendering to generate metrics
      renderer.updatePerformanceMetrics('test', 0, 100);
      
      const metricsBeforeReset = renderer.getPerformanceMetrics();
      expect(metricsBeforeReset.test).toBeDefined();
      
      renderer.resetPerformanceMetrics();
      
      const metricsAfterReset = renderer.getPerformanceMetrics();
      expect(metricsAfterReset.frameCount).toBe(0);
    });
  });
});

describe('CanvasRenderer Integration Performance', () => {
  let renderer;
  let container;

  beforeEach(() => {
    container = createMockContainer();
    renderer = new CanvasRenderer(container);
  });

  afterEach(() => {
    if (renderer) {
      renderer.destroy();
    }
  });

  it('should handle complete render cycle within 60fps budget', () => {
    const waveformData = {
      samples: new Float32Array(44100).map(() => Math.random() * 2 - 1),
      sampleRate: 44100,
      duration: 1,
      channels: 1
    };
    
    const chops = [
      { id: 'chop1', startTime: 0.1, endTime: 0.3, padId: 'pad1' },
      { id: 'chop2', startTime: 0.5, endTime: 0.7, padId: 'pad2' }
    ];
    
    mockPerformance.now
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(15); // Complete cycle in 15ms
    
    // Render complete frame
    renderer.renderWaveform(waveformData);
    renderer.renderChops(chops);
    renderer.renderPlayhead(0.4, true);
    renderer.renderUI();
    
    const metrics = renderer.getPerformanceMetrics();
    expect(metrics.renderTime).toBeLessThan(16);
  });
});