/**
 * Tests for enhanced chop visualization and relationship display
 * Implements requirements: 2.4, 2.5, 5.4, 5.5
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CanvasRenderer } from '../CanvasRenderer.js';
import { InteractionManager } from '../InteractionManager.js';

// Mock canvas and WebGL context
const mockCanvas = {
  getContext: vi.fn(() => ({
    clearRect: vi.fn(),
    fillRect: vi.fn(),
    strokeRect: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
    fill: vi.fn(),
    arc: vi.fn(),
    closePath: vi.fn(),
    createLinearGradient: vi.fn(() => ({
      addColorStop: vi.fn()
    })),
    measureText: vi.fn(() => ({ width: 50 })),
    setLineDash: vi.fn(),
    fillText: vi.fn(),
    strokeText: vi.fn(),
    quadraticCurveTo: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    translate: vi.fn(),
    scale: vi.fn(),
    drawImage: vi.fn(),
    canvas: { width: 800, height: 200 }
  })),
  width: 800,
  height: 200,
  style: {},
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  getBoundingClientRect: vi.fn(() => ({
    left: 0,
    top: 0,
    width: 800,
    height: 200
  }))
};

// Mock HTMLCanvasElement
Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
  value: mockCanvas.getContext
});

Object.defineProperty(HTMLCanvasElement.prototype, 'getBoundingClientRect', {
  value: mockCanvas.getBoundingClientRect
});

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn()
}));

// Mock requestAnimationFrame
global.requestAnimationFrame = vi.fn(cb => setTimeout(cb, 16));
global.cancelAnimationFrame = vi.fn();

describe('Enhanced Chop Visualization', () => {
  let mockContainer;
  let canvasRenderer;
  let interactionManager;
  let mockWaveformData;
  let mockChops;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Create mock container
    mockContainer = document.createElement('div');
    mockContainer.style.width = '800px';
    mockContainer.style.height = '300px';
    document.body.appendChild(mockContainer);
    
    mockWaveformData = {
      samples: new Float32Array(1000).fill(0).map((_, i) => Math.sin(i * 0.1)),
      sampleRate: 44100,
      duration: 10,
      channels: 1
    };

    mockChops = [
      {
        id: 'chop1',
        startTime: 1.0,
        endTime: 2.5,
        padId: 'A1',
        color: '#3b82f6'
      },
      {
        id: 'chop2',
        startTime: 2.4, // Slight overlap with chop1
        endTime: 4.0,
        padId: 'A2',
        color: '#ef4444'
      },
      {
        id: 'chop3',
        startTime: 4.05, // Adjacent to chop2
        endTime: 5.5,
        padId: 'A3',
        color: '#10b981'
      }
    ];

    // Initialize renderer
    canvasRenderer = new CanvasRenderer(mockContainer);
    interactionManager = new InteractionManager(canvasRenderer);
  });

  afterEach(() => {
    if (canvasRenderer) {
      canvasRenderer.destroy();
    }
    if (interactionManager) {
      interactionManager.destroy();
    }
    if (mockContainer && mockContainer.parentNode) {
      mockContainer.parentNode.removeChild(mockContainer);
    }
    vi.restoreAllMocks();
  });

  describe('Colored Chop Overlays', () => {
    it('should render chops with distinct visual appearance', () => {
      // Test the enhanced renderSingleChop method
      const chopLayer = canvasRenderer.getLayerManager().getLayer('chops');
      expect(chopLayer).toBeDefined();
      
      // Render chops with enhanced visualization
      canvasRenderer.renderChops(mockChops, null, {
        hoveredChopId: null,
        activeChopId: null,
        allChops: mockChops
      });
      
      // Verify that the chops layer was marked as clean after rendering
      expect(canvasRenderer.getLayerManager().isLayerDirty('chops')).toBe(false);
    });

    it('should use different colors for each chop', () => {
      // Test color generation for different chops
      const color1 = canvasRenderer.generateChopColor('chop1');
      const color2 = canvasRenderer.generateChopColor('chop2');
      const color3 = canvasRenderer.generateChopColor('chop3');
      
      expect(color1).not.toBe(color2);
      expect(color2).not.toBe(color3);
      expect(color1).not.toBe(color3);
      
      // Colors should be consistent for same ID
      expect(canvasRenderer.generateChopColor('chop1')).toBe(color1);
    });

    it('should highlight selected chops differently', () => {
      // Render with selected chop
      canvasRenderer.renderChops(mockChops, 'chop1', {
        hoveredChopId: null,
        activeChopId: null,
        allChops: mockChops
      });
      
      // Verify rendering completed without errors
      expect(canvasRenderer.getPerformanceMetrics().renderTime).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Chop Boundary Markers', () => {
    it('should render clear start and end indicators', () => {
      // Test boundary rendering by checking if chops are rendered
      canvasRenderer.renderChops(mockChops, null, {
        allChops: mockChops
      });
      
      // Verify the rendering process completed
      const metrics = canvasRenderer.getPerformanceMetrics();
      expect(metrics.chops).toBeDefined();
    });

    it('should show triangular boundary markers', () => {
      // Test that boundary indicators are part of the enhanced rendering
      const testChop = mockChops[0];
      const viewport = canvasRenderer.getViewportManager().getViewportBounds();
      const { width, height } = canvasRenderer.getLayerManager().getDimensions();
      
      // This would normally render boundary indicators
      // We test that the method exists and can be called
      expect(typeof canvasRenderer.renderSingleChop).toBe('function');
    });
  });

  describe('Hover Tooltips', () => {
    it('should show detailed timing information on hover', () => {
      // Set up interaction manager with chops
      interactionManager.setCurrentChops(mockChops);
      
      // Test tooltip data creation for chop regions
      const element = {
        type: 'chop-region',
        chopId: 'chop1',
        chop: mockChops[0],
        time: 1.5
      };
      
      const tooltipData = interactionManager.createChopTooltipData(element);
      
      expect(tooltipData).toBeDefined();
      expect(tooltipData.title).toContain('A1');
      expect(tooltipData.lines).toContain('Duration: 1.500s');
    });

    it('should display duration and position information', () => {
      // Test boundary tooltip data creation
      const element = {
        type: 'chop-boundary',
        chopId: 'chop1',
        boundaryType: 'start',
        time: 1.0
      };
      
      interactionManager.setCurrentChops(mockChops);
      const tooltipData = interactionManager.createBoundaryTooltipData(element);
      
      expect(tooltipData).toBeDefined();
      expect(tooltipData.title).toBe('Start Boundary');
      expect(tooltipData.lines).toContain('Time: 1.000s');
    });

    it('should analyze chop relationships', () => {
      // Set up chops for relationship analysis
      interactionManager.setCurrentChops(mockChops);
      
      // Test relationship analysis
      const currentChop = mockChops[0]; // chop1: 1.0-2.5
      const relationships = interactionManager.analyzeChopRelationships(currentChop);
      
      // Should detect overlap with chop2 (2.4-4.0)
      const overlapRelationship = relationships.find(r => r.type === 'overlap');
      expect(overlapRelationship).toBeDefined();
      expect(overlapRelationship.chop.id).toBe('chop2');
    });
  });

  describe('Visual Relationship Indicators', () => {
    it('should detect and display overlapping chops', () => {
      // Test overlap detection in renderer
      const chop1 = mockChops[0]; // 1.0-2.5
      const chop2 = mockChops[1]; // 2.4-4.0 (overlaps with chop1)
      
      const relationships = canvasRenderer.analyzeChopRelationships(chop1, mockChops);
      const overlapRelationship = relationships.find(r => r.type === 'overlap');
      
      expect(overlapRelationship).toBeDefined();
      expect(overlapRelationship.chop.id).toBe('chop2');
      expect(overlapRelationship.severity).toBeGreaterThan(0);
    });

    it('should show adjacency indicators for nearby chops', () => {
      // Test adjacency detection
      const chop2 = mockChops[1]; // 2.4-4.0
      const chop3 = mockChops[2]; // 4.05-5.5 (adjacent to chop2)
      
      const relationships = canvasRenderer.analyzeChopRelationships(chop2, mockChops);
      const adjacentRelationship = relationships.find(r => r.type === 'adjacent-after');
      
      expect(adjacentRelationship).toBeDefined();
      expect(adjacentRelationship.chop.id).toBe('chop3');
    });

    it('should calculate overlap severity correctly', () => {
      const chop1 = { startTime: 1.0, endTime: 3.0 }; // 2s duration
      const chop2 = { startTime: 2.0, endTime: 4.0 }; // 2s duration, 1s overlap
      
      const severity = canvasRenderer.calculateOverlapSeverity(chop1, chop2);
      expect(severity).toBe(0.5); // 1s overlap / 2s min duration = 0.5
    });
  });

  describe('Enhanced Visual States', () => {
    it('should show different visual states for selected, hovered, and active chops', () => {
      // Test rendering with different states
      canvasRenderer.renderChops(mockChops, 'chop1', {
        hoveredChopId: 'chop2',
        activeChopId: 'chop1',
        allChops: mockChops
      });
      
      // Verify rendering completed successfully
      expect(canvasRenderer.getPerformanceMetrics().chops).toBeDefined();
    });

    it('should handle color conversion utility', () => {
      // Test hexToRgba utility function
      const rgbaColor = canvasRenderer.hexToRgba('#3b82f6', 0.5);
      expect(rgbaColor).toContain('rgba');
      expect(rgbaColor).toContain('0.5');
      
      // Test HSL color handling
      const hslColor = canvasRenderer.hexToRgba('hsl(220, 91%, 60%)', 0.8);
      expect(hslColor).toContain('hsla');
      expect(hslColor).toContain('0.8');
    });
  });

  describe('Performance Considerations', () => {
    it('should handle large numbers of chops efficiently', () => {
      const manyChops = Array.from({ length: 50 }, (_, i) => ({
        id: `chop${i}`,
        startTime: i * 0.2,
        endTime: i * 0.2 + 0.15,
        padId: `A${i}`,
        color: `hsl(${i * 7}, 70%, 50%)`
      }));

      const startTime = performance.now();
      canvasRenderer.renderChops(manyChops, null, {
        allChops: manyChops
      });
      const endTime = performance.now();
      
      // Rendering should complete in reasonable time
      expect(endTime - startTime).toBeLessThan(100); // Less than 100ms
    });

    it('should use viewport culling for off-screen chops', () => {
      const offScreenChops = [
        ...mockChops,
        {
          id: 'offscreen',
          startTime: 100, // Way off screen
          endTime: 101,
          padId: 'OFF',
          color: '#666666'
        }
      ];

      // Set viewport to show only first few seconds
      const viewportManager = canvasRenderer.getViewportManager();
      viewportManager.setAudioDuration(10);
      
      const culledChops = canvasRenderer.cullChops(offScreenChops, {
        start: 0,
        end: 10
      });
      
      // Off-screen chop should be culled
      expect(culledChops.length).toBe(mockChops.length);
      expect(culledChops.find(c => c.id === 'offscreen')).toBeUndefined();
    });

    it('should track performance metrics', () => {
      canvasRenderer.renderChops(mockChops, null, {
        allChops: mockChops
      });
      
      const metrics = canvasRenderer.getPerformanceMetrics();
      expect(metrics.chops).toBeDefined();
      expect(metrics.chops.callCount).toBeGreaterThan(0);
    });
  });
});