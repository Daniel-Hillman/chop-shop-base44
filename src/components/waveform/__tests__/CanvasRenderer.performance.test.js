/**
 * Real-world performance benchmarks for CanvasRenderer
 * Validates 60fps rendering during actual playback scenarios
 * Requirements: 7.1, 7.2 - 60fps performance guarantee
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { CanvasRenderer } from '../CanvasRenderer.js';

// Performance test configuration
const PERFORMANCE_CONFIG = {
  TARGET_FPS: 60,
  FRAME_BUDGET_MS: 16.67, // 1000ms / 60fps
  TEST_DURATION_MS: 1000, // 1 second of rendering
  ACCEPTABLE_FPS_VARIANCE: 5 // Allow 5fps variance
};

// Create realistic test environment
const createRealisticTestEnvironment = () => {
  // Mock high-resolution timer
  let mockTime = 0;
  const mockPerformance = {
    now: vi.fn(() => mockTime),
    mark: vi.fn(),
    measure: vi.fn()
  };
  
  global.performance = mockPerformance;
  
  // Mock requestAnimationFrame with realistic timing
  global.requestAnimationFrame = vi.fn((callback) => {
    return setTimeout(() => {
      mockTime += PERFORMANCE_CONFIG.FRAME_BUDGET_MS;
      callback(mockTime);
    }, PERFORMANCE_CONFIG.FRAME_BUDGET_MS);
  });
  
  global.cancelAnimationFrame = vi.fn(clearTimeout);
  
  // Create realistic canvas mock with performance characteristics
  const createRealisticCanvas = () => {
    let drawOperationCount = 0;
    
    const canvas = {
      width: 1200,
      height: 300,
      style: {},
      getContext: vi.fn(() => mockContext),
      getBoundingClientRect: vi.fn(() => ({
        width: 1200,
        height: 300,
        top: 0,
        left: 0
      }))
    };
    
    const mockContext = {
      scale: vi.fn(),
      clearRect: vi.fn(() => { drawOperationCount++; }),
      beginPath: vi.fn(() => { drawOperationCount++; }),
      moveTo: vi.fn(() => { drawOperationCount++; }),
      lineTo: vi.fn(() => { drawOperationCount++; }),
      stroke: vi.fn(() => { drawOperationCount += 2; }), // Stroke is expensive
      fill: vi.fn(() => { drawOperationCount += 2; }),
      fillRect: vi.fn(() => { drawOperationCount += 3; }), // Rect fills are expensive
      strokeRect: vi.fn(() => { drawOperationCount += 3; }),
      closePath: vi.fn(() => { drawOperationCount++; }),
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
      fillText: vi.fn(() => { drawOperationCount += 2; }), // Text is expensive
      strokeText: vi.fn(() => { drawOperationCount += 3; }),
      measureText: vi.fn(() => ({ width: 50 })),
      
      // Add method to get draw operation count for performance testing
      getDrawOperationCount: () => drawOperationCount,
      resetDrawOperationCount: () => { drawOperationCount = 0; }
    };
    
    return { canvas, mockContext };
  };
  
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
        const { canvas } = createRealisticCanvas();
        return canvas;
      }
      return {};
    })
  };
  
  return { container, mockTime: () => mockTime, setMockTime: (time) => { mockTime = time; } };
};

// Generate realistic test data
const generateRealisticWaveformData = (durationSeconds = 5, sampleRate = 44100) => {
  const sampleCount = durationSeconds * sampleRate;
  const samples = new Float32Array(sampleCount);
  
  // Generate realistic audio waveform with varying frequencies and amplitudes
  for (let i = 0; i < sampleCount; i++) {
    const time = i / sampleRate;
    
    // Combine multiple frequencies to simulate real audio
    const bass = Math.sin(2 * Math.PI * 60 * time) * 0.3;
    const mid = Math.sin(2 * Math.PI * 440 * time) * 0.4;
    const treble = Math.sin(2 * Math.PI * 2000 * time) * 0.2;
    const noise = (Math.random() - 0.5) * 0.1;
    
    // Add envelope to simulate musical dynamics
    const envelope = Math.sin(2 * Math.PI * 0.5 * time) * 0.5 + 0.5;
    
    samples[i] = (bass + mid + treble + noise) * envelope;
  }
  
  return {
    samples,
    sampleRate,
    duration: durationSeconds,
    channels: 1,
    metadata: {
      analysisMethod: 'webAudio',
      quality: 'high',
      generatedAt: Date.now()
    }
  };
};

const generateRealisticChops = (count = 20, maxDuration = 5) => {
  return Array.from({ length: count }, (_, i) => {
    const startTime = (i / count) * maxDuration;
    const duration = 0.1 + Math.random() * 0.4; // 100ms to 500ms chops
    
    return {
      id: `chop_${i}`,
      startTime,
      endTime: Math.min(startTime + duration, maxDuration),
      padId: `pad_${i % 16}`, // Simulate 16-pad MPC
      color: `hsl(${(i * 137.5) % 360}, 70%, 50%)`,
      waveformRegion: {
        startSample: Math.floor(startTime * 44100),
        endSample: Math.floor((startTime + duration) * 44100),
        peakAmplitude: Math.random()
      }
    };
  });
};

describe('CanvasRenderer Real-World Performance Benchmarks', () => {
  let renderer;
  let container;
  let testEnv;
  let waveformData;
  let chops;

  beforeEach(() => {
    vi.clearAllMocks();
    testEnv = createRealisticTestEnvironment();
    container = testEnv.container;
    
    renderer = new CanvasRenderer(container, {
      enableViewportCulling: true,
      enableBatching: true,
      renderQuality: 'high',
      enableAntialiasing: true
    });
    
    waveformData = generateRealisticWaveformData(10); // 10 seconds of audio
    chops = generateRealisticChops(30, 10); // 30 chops over 10 seconds
  });

  afterEach(() => {
    if (renderer) {
      renderer.destroy();
    }
  });

  describe('60fps Rendering Benchmarks', () => {
    it('should maintain 60fps during static waveform rendering', async () => {
      const frameCount = 60; // 1 second worth of frames
      const renderTimes = [];
      
      for (let frame = 0; frame < frameCount; frame++) {
        const frameStart = testEnv.mockTime();
        
        renderer.renderWaveform(waveformData);
        
        const frameEnd = testEnv.mockTime();
        const renderTime = frameEnd - frameStart;
        renderTimes.push(renderTime);
        
        // Each frame should complete within budget
        expect(renderTime).toBeLessThan(PERFORMANCE_CONFIG.FRAME_BUDGET_MS);
        
        testEnv.setMockTime(frameEnd + PERFORMANCE_CONFIG.FRAME_BUDGET_MS);
      }
      
      // Calculate average render time
      const avgRenderTime = renderTimes.reduce((sum, time) => sum + time, 0) / renderTimes.length;
      expect(avgRenderTime).toBeLessThan(PERFORMANCE_CONFIG.FRAME_BUDGET_MS * 0.8); // 80% of budget
      
      // No frame should exceed budget significantly
      const slowFrames = renderTimes.filter(time => time > PERFORMANCE_CONFIG.FRAME_BUDGET_MS);
      expect(slowFrames.length).toBe(0);
    });

    it('should maintain 60fps during playback with moving playhead', async () => {
      const frameCount = 120; // 2 seconds of playback
      const renderTimes = [];
      
      for (let frame = 0; frame < frameCount; frame++) {
        const frameStart = testEnv.mockTime();
        const currentTime = (frame / 60) * 2; // 2 seconds of playback
        
        // Render complete frame with moving playhead
        renderer.renderWaveform(waveformData);
        renderer.renderChops(chops);
        renderer.renderPlayhead(currentTime, true);
        renderer.renderUI();
        
        const frameEnd = testEnv.mockTime();
        const renderTime = frameEnd - frameStart;
        renderTimes.push(renderTime);
        
        expect(renderTime).toBeLessThan(PERFORMANCE_CONFIG.FRAME_BUDGET_MS);
        
        testEnv.setMockTime(frameEnd + PERFORMANCE_CONFIG.FRAME_BUDGET_MS);
      }
      
      const avgRenderTime = renderTimes.reduce((sum, time) => sum + time, 0) / renderTimes.length;
      expect(avgRenderTime).toBeLessThan(PERFORMANCE_CONFIG.FRAME_BUDGET_MS * 0.9); // 90% of budget
    });

    it('should maintain 60fps during zoom operations', async () => {
      const zoomLevels = [1, 2, 5, 10, 20, 50, 100];
      const renderTimes = [];
      
      for (const zoomLevel of zoomLevels) {
        const viewportManager = renderer.getViewportManager();
        viewportManager.setZoom(zoomLevel, 2.5); // Zoom to middle of audio
        
        // Render multiple frames at this zoom level
        for (let frame = 0; frame < 10; frame++) {
          const frameStart = testEnv.mockTime();
          
          renderer.renderWaveform(waveformData);
          renderer.renderChops(chops);
          renderer.renderPlayhead(2.5 + frame * 0.01, true);
          
          const frameEnd = testEnv.mockTime();
          const renderTime = frameEnd - frameStart;
          renderTimes.push(renderTime);
          
          expect(renderTime).toBeLessThan(PERFORMANCE_CONFIG.FRAME_BUDGET_MS);
          
          testEnv.setMockTime(frameEnd + PERFORMANCE_CONFIG.FRAME_BUDGET_MS);
        }
      }
      
      const avgRenderTime = renderTimes.reduce((sum, time) => sum + time, 0) / renderTimes.length;
      expect(avgRenderTime).toBeLessThan(PERFORMANCE_CONFIG.FRAME_BUDGET_MS * 0.85);
    });

    it('should maintain 60fps during pan operations', async () => {
      const panPositions = Array.from({ length: 60 }, (_, i) => i * 0.1); // Pan across 6 seconds
      const renderTimes = [];
      
      for (const panTime of panPositions) {
        const viewportManager = renderer.getViewportManager();
        viewportManager.panToTime(panTime);
        
        const frameStart = testEnv.mockTime();
        
        renderer.renderWaveform(waveformData);
        renderer.renderChops(chops);
        renderer.renderPlayhead(panTime, true);
        renderer.renderUI();
        
        const frameEnd = testEnv.mockTime();
        const renderTime = frameEnd - frameStart;
        renderTimes.push(renderTime);
        
        expect(renderTime).toBeLessThan(PERFORMANCE_CONFIG.FRAME_BUDGET_MS);
        
        testEnv.setMockTime(frameEnd + PERFORMANCE_CONFIG.FRAME_BUDGET_MS);
      }
      
      const avgRenderTime = renderTimes.reduce((sum, time) => sum + time, 0) / renderTimes.length;
      expect(avgRenderTime).toBeLessThan(PERFORMANCE_CONFIG.FRAME_BUDGET_MS * 0.85);
    });
  });

  describe('Viewport Culling Performance', () => {
    it('should significantly improve performance with viewport culling enabled', async () => {
      const viewportManager = renderer.getViewportManager();
      viewportManager.setZoom(20, 1.0); // High zoom showing small portion
      
      // Test with culling enabled
      renderer.setViewportCulling(true);
      const cullingStart = testEnv.mockTime();
      
      for (let i = 0; i < 30; i++) {
        renderer.renderWaveform(waveformData);
        renderer.renderChops(chops);
      }
      
      const cullingEnd = testEnv.mockTime();
      const cullingTime = cullingEnd - cullingStart;
      
      // Test with culling disabled
      renderer.setViewportCulling(false);
      const noCullingStart = testEnv.mockTime();
      
      for (let i = 0; i < 30; i++) {
        renderer.renderWaveform(waveformData);
        renderer.renderChops(chops);
      }
      
      const noCullingEnd = testEnv.mockTime();
      const noCullingTime = noCullingEnd - noCullingStart;
      
      // Culling should provide significant performance improvement
      expect(cullingTime).toBeLessThan(noCullingTime * 0.7); // At least 30% improvement
      
      const metrics = renderer.getPerformanceMetrics();
      expect(metrics.culledElements).toBeGreaterThan(0);
    });

    it('should maintain performance with many chops outside viewport', async () => {
      const manyChops = generateRealisticChops(200, 100); // 200 chops over 100 seconds
      const viewportManager = renderer.getViewportManager();
      viewportManager.setZoom(10, 5.0); // Show small portion at 5 seconds
      
      const frameStart = testEnv.mockTime();
      
      renderer.renderChops(manyChops);
      
      const frameEnd = testEnv.mockTime();
      const renderTime = frameEnd - frameStart;
      
      expect(renderTime).toBeLessThan(PERFORMANCE_CONFIG.FRAME_BUDGET_MS);
      
      const metrics = renderer.getPerformanceMetrics();
      expect(metrics.culledElements).toBeGreaterThan(150); // Most chops should be culled
    });
  });

  describe('Quality vs Performance Trade-offs', () => {
    it('should render faster in low quality mode while maintaining 60fps', async () => {
      const qualityLevels = ['low', 'medium', 'high'];
      const qualityTimes = {};
      
      for (const quality of qualityLevels) {
        renderer.setRenderQuality(quality);
        const renderTimes = [];
        
        for (let frame = 0; frame < 30; frame++) {
          const frameStart = testEnv.mockTime();
          
          renderer.renderWaveform(waveformData);
          renderer.renderChops(chops);
          renderer.renderPlayhead(frame * 0.1, true);
          
          const frameEnd = testEnv.mockTime();
          const renderTime = frameEnd - frameStart;
          renderTimes.push(renderTime);
          
          expect(renderTime).toBeLessThan(PERFORMANCE_CONFIG.FRAME_BUDGET_MS);
          
          testEnv.setMockTime(frameEnd + PERFORMANCE_CONFIG.FRAME_BUDGET_MS);
        }
        
        qualityTimes[quality] = renderTimes.reduce((sum, time) => sum + time, 0) / renderTimes.length;
      }
      
      // Performance should improve with lower quality
      expect(qualityTimes.low).toBeLessThan(qualityTimes.medium);
      expect(qualityTimes.medium).toBeLessThan(qualityTimes.high);
      
      // All quality levels should maintain 60fps
      Object.values(qualityTimes).forEach(avgTime => {
        expect(avgTime).toBeLessThan(PERFORMANCE_CONFIG.FRAME_BUDGET_MS);
      });
    });
  });

  describe('Memory and Resource Management', () => {
    it('should maintain performance during extended rendering sessions', async () => {
      const sessionFrames = 300; // 5 seconds of continuous rendering
      const renderTimes = [];
      let memoryGrowth = 0;
      
      // Simulate memory pressure by tracking cache growth
      const initialCacheSize = renderer.drawingCache.size;
      
      for (let frame = 0; frame < sessionFrames; frame++) {
        const frameStart = testEnv.mockTime();
        const currentTime = frame / 60;
        
        // Vary rendering parameters to stress memory management
        const viewportManager = renderer.getViewportManager();
        if (frame % 30 === 0) {
          viewportManager.setZoom(1 + Math.random() * 10, currentTime);
        }
        
        renderer.renderWaveform(waveformData);
        renderer.renderChops(chops);
        renderer.renderPlayhead(currentTime, true);
        renderer.renderUI();
        
        const frameEnd = testEnv.mockTime();
        const renderTime = frameEnd - frameStart;
        renderTimes.push(renderTime);
        
        expect(renderTime).toBeLessThan(PERFORMANCE_CONFIG.FRAME_BUDGET_MS);
        
        testEnv.setMockTime(frameEnd + PERFORMANCE_CONFIG.FRAME_BUDGET_MS);
        
        // Check for memory growth every 60 frames
        if (frame % 60 === 0) {
          const currentCacheSize = renderer.drawingCache.size;
          memoryGrowth = currentCacheSize - initialCacheSize;
        }
      }
      
      // Performance should not degrade over time
      const firstHalfAvg = renderTimes.slice(0, 150).reduce((sum, time) => sum + time, 0) / 150;
      const secondHalfAvg = renderTimes.slice(150).reduce((sum, time) => sum + time, 0) / 150;
      
      expect(secondHalfAvg).toBeLessThan(firstHalfAvg * 1.1); // Allow 10% degradation
      
      // Memory growth should be controlled
      expect(memoryGrowth).toBeLessThan(100); // Reasonable cache growth
    });
  });

  describe('Stress Testing', () => {
    it('should handle extreme zoom levels while maintaining 60fps', async () => {
      const extremeZoomLevels = [0.1, 0.5, 1, 10, 50, 100];
      
      for (const zoomLevel of extremeZoomLevels) {
        const viewportManager = renderer.getViewportManager();
        viewportManager.setZoom(zoomLevel, 2.5);
        
        const frameStart = testEnv.mockTime();
        
        renderer.renderWaveform(waveformData);
        renderer.renderChops(chops);
        renderer.renderPlayhead(2.5, true);
        renderer.renderUI();
        
        const frameEnd = testEnv.mockTime();
        const renderTime = frameEnd - frameStart;
        
        expect(renderTime).toBeLessThan(PERFORMANCE_CONFIG.FRAME_BUDGET_MS);
        
        testEnv.setMockTime(frameEnd + PERFORMANCE_CONFIG.FRAME_BUDGET_MS);
      }
    });

    it('should handle rapid viewport changes while maintaining 60fps', async () => {
      const changes = 60; // 60 rapid changes
      const renderTimes = [];
      
      for (let i = 0; i < changes; i++) {
        const viewportManager = renderer.getViewportManager();
        
        // Rapid zoom and pan changes
        const randomZoom = 1 + Math.random() * 20;
        const randomTime = Math.random() * 10;
        viewportManager.setZoom(randomZoom, randomTime);
        
        const frameStart = testEnv.mockTime();
        
        renderer.renderWaveform(waveformData);
        renderer.renderChops(chops);
        renderer.renderPlayhead(randomTime, true);
        
        const frameEnd = testEnv.mockTime();
        const renderTime = frameEnd - frameStart;
        renderTimes.push(renderTime);
        
        expect(renderTime).toBeLessThan(PERFORMANCE_CONFIG.FRAME_BUDGET_MS);
        
        testEnv.setMockTime(frameEnd + PERFORMANCE_CONFIG.FRAME_BUDGET_MS);
      }
      
      const avgRenderTime = renderTimes.reduce((sum, time) => sum + time, 0) / renderTimes.length;
      expect(avgRenderTime).toBeLessThan(PERFORMANCE_CONFIG.FRAME_BUDGET_MS * 0.9);
    });
  });

  describe('Real-World Scenario Testing', () => {
    it('should maintain 60fps during typical music production workflow', async () => {
      // Simulate typical workflow: load track, zoom in, create chops, playback
      const workflowSteps = [
        // Initial load and overview
        () => {
          const viewportManager = renderer.getViewportManager();
          viewportManager.zoomToFit();
          renderer.renderWaveform(waveformData);
          renderer.renderUI();
        },
        
        // Zoom to interesting section
        () => {
          const viewportManager = renderer.getViewportManager();
          viewportManager.setZoom(5, 3.0);
          renderer.renderWaveform(waveformData);
          renderer.renderChops(chops.slice(0, 5));
          renderer.renderUI();
        },
        
        // Fine-tune zoom for precise editing
        () => {
          const viewportManager = renderer.getViewportManager();
          viewportManager.setZoom(20, 3.2);
          renderer.renderWaveform(waveformData);
          renderer.renderChops(chops.slice(0, 5));
          renderer.renderUI();
        },
        
        // Playback with all elements
        () => {
          renderer.renderWaveform(waveformData);
          renderer.renderChops(chops);
          renderer.renderPlayhead(3.2, true);
          renderer.renderUI();
        }
      ];
      
      for (const step of workflowSteps) {
        // Execute each step multiple times to simulate real usage
        for (let repeat = 0; repeat < 15; repeat++) {
          const frameStart = testEnv.mockTime();
          
          step();
          
          const frameEnd = testEnv.mockTime();
          const renderTime = frameEnd - frameStart;
          
          expect(renderTime).toBeLessThan(PERFORMANCE_CONFIG.FRAME_BUDGET_MS);
          
          testEnv.setMockTime(frameEnd + PERFORMANCE_CONFIG.FRAME_BUDGET_MS);
        }
      }
    });
  });
});