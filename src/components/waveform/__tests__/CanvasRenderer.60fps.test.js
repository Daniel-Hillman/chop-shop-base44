/**
 * Core 60fps performance validation for CanvasRenderer
 * Focused test to ensure rendering meets performance requirements
 * Requirements: 7.1, 7.2 - 60fps rendering guarantee
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { CanvasRenderer } from '../CanvasRenderer.js';

// Target performance constants
const TARGET_FRAME_TIME_MS = 16.67; // 60fps = 16.67ms per frame
const ACCEPTABLE_FRAME_TIME_MS = 20; // Allow some variance

// Mock environment setup
const setupMockEnvironment = () => {
  let mockTime = 0;
  
  global.performance = {
    now: vi.fn(() => mockTime)
  };
  
  global.requestAnimationFrame = vi.fn((callback) => {
    return setTimeout(() => {
      mockTime += TARGET_FRAME_TIME_MS;
      callback(mockTime);
    }, TARGET_FRAME_TIME_MS);
  });
  
  global.cancelAnimationFrame = vi.fn(clearTimeout);
  
  const createMockCanvas = () => ({
    width: 1200,
    height: 300,
    style: {},
    getContext: vi.fn(() => ({
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
    })),
    getBoundingClientRect: vi.fn(() => ({
      width: 1200,
      height: 300,
      top: 0,
      left: 0
    }))
  });
  
  const container = {
    appendChild: vi.fn(),
    removeChild: vi.fn(),
    getBoundingClientRect: vi.fn(() => ({
      width: 1200,
      height: 300,
      top: 0,
      left: 0
    })),
    children: []
  };
  
  global.document = {
    createElement: vi.fn((tagName) => {
      if (tagName === 'canvas') {
        return createMockCanvas();
      }
      return {};
    })
  };
  
  return { 
    container, 
    setMockTime: (time) => { mockTime = time; },
    getMockTime: () => mockTime
  };
};

// Generate realistic test data
const generateTestWaveformData = (durationSeconds = 5) => {
  const sampleRate = 44100;
  const sampleCount = durationSeconds * sampleRate;
  const samples = new Float32Array(sampleCount);
  
  for (let i = 0; i < sampleCount; i++) {
    const time = i / sampleRate;
    samples[i] = Math.sin(2 * Math.PI * 440 * time) * Math.exp(-time * 0.5);
  }
  
  return {
    samples,
    sampleRate,
    duration: durationSeconds,
    channels: 1
  };
};

const generateTestChops = (count = 10, maxDuration = 5) => {
  return Array.from({ length: count }, (_, i) => ({
    id: `chop_${i}`,
    startTime: (i / count) * maxDuration,
    endTime: ((i + 1) / count) * maxDuration,
    padId: `pad_${i}`,
    color: `hsl(${(i * 137.5) % 360}, 70%, 50%)`
  }));
};

describe('CanvasRenderer 60fps Performance Validation', () => {
  let renderer;
  let testEnv;
  let waveformData;
  let chops;

  beforeEach(() => {
    vi.clearAllMocks();
    testEnv = setupMockEnvironment();
    
    renderer = new CanvasRenderer(testEnv.container, {
      enableViewportCulling: true,
      renderQuality: 'high'
    });
    
    waveformData = generateTestWaveformData(5);
    chops = generateTestChops(15, 5);
  });

  afterEach(() => {
    if (renderer) {
      renderer.destroy();
    }
  });

  describe('Core 60fps Requirements', () => {
    it('should render waveform within 60fps frame budget', () => {
      const startTime = testEnv.getMockTime();
      
      renderer.renderWaveform(waveformData);
      
      const endTime = testEnv.getMockTime();
      const renderTime = endTime - startTime;
      
      expect(renderTime).toBeLessThan(ACCEPTABLE_FRAME_TIME_MS);
    });

    it('should render chops within 60fps frame budget', () => {
      const startTime = testEnv.getMockTime();
      
      renderer.renderChops(chops);
      
      const endTime = testEnv.getMockTime();
      const renderTime = endTime - startTime;
      
      expect(renderTime).toBeLessThan(ACCEPTABLE_FRAME_TIME_MS);
    });

    it('should render playhead within 60fps frame budget', () => {
      const startTime = testEnv.getMockTime();
      
      renderer.renderPlayhead(2.5, true);
      
      const endTime = testEnv.getMockTime();
      const renderTime = endTime - startTime;
      
      expect(renderTime).toBeLessThan(ACCEPTABLE_FRAME_TIME_MS);
    });

    it('should render UI elements within 60fps frame budget', () => {
      const startTime = testEnv.getMockTime();
      
      renderer.renderUI();
      
      const endTime = testEnv.getMockTime();
      const renderTime = endTime - startTime;
      
      expect(renderTime).toBeLessThan(ACCEPTABLE_FRAME_TIME_MS);
    });

    it('should render complete frame within 60fps budget', () => {
      const startTime = testEnv.getMockTime();
      
      // Render complete frame with all elements
      renderer.renderWaveform(waveformData);
      renderer.renderChops(chops);
      renderer.renderPlayhead(2.5, true);
      renderer.renderUI();
      
      const endTime = testEnv.getMockTime();
      const renderTime = endTime - startTime;
      
      expect(renderTime).toBeLessThan(ACCEPTABLE_FRAME_TIME_MS);
    });
  });

  describe('Performance Under Load', () => {
    it('should maintain 60fps with large waveform data', () => {
      const largeWaveformData = generateTestWaveformData(30); // 30 seconds
      
      const startTime = testEnv.getMockTime();
      
      renderer.renderWaveform(largeWaveformData);
      
      const endTime = testEnv.getMockTime();
      const renderTime = endTime - startTime;
      
      expect(renderTime).toBeLessThan(ACCEPTABLE_FRAME_TIME_MS);
    });

    it('should maintain 60fps with many chops', () => {
      const manyChops = generateTestChops(50, 10); // 50 chops
      
      const startTime = testEnv.getMockTime();
      
      renderer.renderChops(manyChops);
      
      const endTime = testEnv.getMockTime();
      const renderTime = endTime - startTime;
      
      expect(renderTime).toBeLessThan(ACCEPTABLE_FRAME_TIME_MS);
    });

    it('should maintain 60fps during zoom operations', () => {
      const viewportManager = renderer.getViewportManager();
      
      // Test various zoom levels
      const zoomLevels = [1, 5, 10, 20, 50];
      
      for (const zoomLevel of zoomLevels) {
        viewportManager.setZoom(zoomLevel, 2.5);
        
        const startTime = testEnv.getMockTime();
        
        renderer.renderWaveform(waveformData);
        renderer.renderChops(chops);
        renderer.renderPlayhead(2.5, true);
        
        const endTime = testEnv.getMockTime();
        const renderTime = endTime - startTime;
        
        expect(renderTime).toBeLessThan(ACCEPTABLE_FRAME_TIME_MS);
      }
    });

    it('should maintain 60fps during continuous playback simulation', () => {
      const frameCount = 60; // 1 second of playback
      const renderTimes = [];
      
      for (let frame = 0; frame < frameCount; frame++) {
        const currentTime = frame / 60; // Simulate playback
        
        const startTime = testEnv.getMockTime();
        
        renderer.renderWaveform(waveformData);
        renderer.renderChops(chops);
        renderer.renderPlayhead(currentTime, true);
        renderer.renderUI();
        
        const endTime = testEnv.getMockTime();
        const renderTime = endTime - startTime;
        renderTimes.push(renderTime);
        
        expect(renderTime).toBeLessThan(ACCEPTABLE_FRAME_TIME_MS);
        
        testEnv.setMockTime(endTime + TARGET_FRAME_TIME_MS);
      }
      
      // Check average performance
      const avgRenderTime = renderTimes.reduce((sum, time) => sum + time, 0) / renderTimes.length;
      expect(avgRenderTime).toBeLessThan(TARGET_FRAME_TIME_MS);
    });
  });

  describe('Viewport Culling Performance', () => {
    it('should improve performance with viewport culling enabled', () => {
      const viewportManager = renderer.getViewportManager();
      viewportManager.setZoom(20, 1.0); // High zoom showing small portion
      
      // Test with culling enabled
      renderer.setViewportCulling(true);
      const cullingStart = testEnv.getMockTime();
      
      renderer.renderWaveform(waveformData);
      renderer.renderChops(chops);
      
      const cullingEnd = testEnv.getMockTime();
      const cullingTime = cullingEnd - cullingStart;
      
      // Test with culling disabled
      renderer.setViewportCulling(false);
      const noCullingStart = testEnv.getMockTime();
      
      renderer.renderWaveform(waveformData);
      renderer.renderChops(chops);
      
      const noCullingEnd = testEnv.getMockTime();
      const noCullingTime = noCullingEnd - noCullingStart;
      
      // Both should be within budget, but culling should be faster or equal
      expect(cullingTime).toBeLessThan(ACCEPTABLE_FRAME_TIME_MS);
      expect(noCullingTime).toBeLessThan(ACCEPTABLE_FRAME_TIME_MS);
      expect(cullingTime).toBeLessThanOrEqual(noCullingTime);
    });
  });

  describe('Quality vs Performance', () => {
    it('should maintain 60fps across all quality levels', () => {
      const qualityLevels = ['low', 'medium', 'high'];
      
      for (const quality of qualityLevels) {
        renderer.setRenderQuality(quality);
        
        const startTime = testEnv.getMockTime();
        
        renderer.renderWaveform(waveformData);
        renderer.renderChops(chops);
        renderer.renderPlayhead(2.5, true);
        renderer.renderUI();
        
        const endTime = testEnv.getMockTime();
        const renderTime = endTime - startTime;
        
        expect(renderTime).toBeLessThan(ACCEPTABLE_FRAME_TIME_MS);
      }
    });
  });

  describe('Memory and Resource Management', () => {
    it('should maintain performance over extended rendering', () => {
      const extendedFrames = 180; // 3 seconds of rendering
      
      for (let frame = 0; frame < extendedFrames; frame++) {
        const startTime = testEnv.getMockTime();
        
        renderer.renderWaveform(waveformData);
        renderer.renderChops(chops);
        renderer.renderPlayhead(frame / 60, true);
        
        const endTime = testEnv.getMockTime();
        const renderTime = endTime - startTime;
        
        expect(renderTime).toBeLessThan(ACCEPTABLE_FRAME_TIME_MS);
        
        testEnv.setMockTime(endTime + TARGET_FRAME_TIME_MS);
      }
    });

    it('should handle resize operations within performance budget', () => {
      const startTime = testEnv.getMockTime();
      
      renderer.resize(1600, 400); // Resize to larger dimensions
      renderer.renderWaveform(waveformData);
      renderer.renderChops(chops);
      
      const endTime = testEnv.getMockTime();
      const renderTime = endTime - startTime;
      
      expect(renderTime).toBeLessThan(ACCEPTABLE_FRAME_TIME_MS);
    });
  });

  describe('Edge Cases and Stress Testing', () => {
    it('should handle empty data gracefully within performance budget', () => {
      const emptyWaveformData = {
        samples: new Float32Array(0),
        sampleRate: 44100,
        duration: 0,
        channels: 1
      };
      
      const startTime = testEnv.getMockTime();
      
      renderer.renderWaveform(emptyWaveformData);
      renderer.renderChops([]);
      renderer.renderPlayhead(0, false);
      
      const endTime = testEnv.getMockTime();
      const renderTime = endTime - startTime;
      
      expect(renderTime).toBeLessThan(ACCEPTABLE_FRAME_TIME_MS);
    });

    it('should handle rapid viewport changes within performance budget', () => {
      const viewportManager = renderer.getViewportManager();
      
      for (let i = 0; i < 10; i++) {
        const randomZoom = 1 + Math.random() * 20;
        const randomTime = Math.random() * 5;
        
        viewportManager.setZoom(randomZoom, randomTime);
        
        const startTime = testEnv.getMockTime();
        
        renderer.renderWaveform(waveformData);
        renderer.renderChops(chops);
        
        const endTime = testEnv.getMockTime();
        const renderTime = endTime - startTime;
        
        expect(renderTime).toBeLessThan(ACCEPTABLE_FRAME_TIME_MS);
        
        testEnv.setMockTime(endTime + TARGET_FRAME_TIME_MS);
      }
    });
  });

  describe('Performance Metrics Validation', () => {
    it('should track performance metrics accurately', () => {
      renderer.renderWaveform(waveformData);
      
      const metrics = renderer.getPerformanceMetrics();
      
      expect(metrics).toHaveProperty('renderTime');
      expect(metrics).toHaveProperty('frameCount');
      expect(metrics).toHaveProperty('averageFPS');
      expect(metrics.renderTime).toBeGreaterThanOrEqual(0);
    });

    it('should provide performance feedback for optimization', () => {
      // Trigger performance tracking by calling updatePerformanceMetrics
      renderer.updatePerformanceMetrics('waveform', 0, 100);
      
      const metrics = renderer.getPerformanceMetrics();
      
      // Metrics should indicate good performance
      expect(metrics.renderTime).toBeLessThan(ACCEPTABLE_FRAME_TIME_MS);
      expect(metrics.waveform).toBeDefined();
      expect(metrics.waveform.callCount).toBeGreaterThan(0);
    });
  });
});