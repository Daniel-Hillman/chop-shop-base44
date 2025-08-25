import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { EnhancedCanvasRenderer } from '../EnhancedCanvasRenderer.js';

/**
 * Integration test suite for Enhanced Canvas Renderer
 * Tests visual enhancements integration with canvas rendering
 * Requirements: 8.1, 8.2, 8.3, 8.4, 8.5
 */
describe('EnhancedCanvasRenderer Integration', () => {
  let container;
  let renderer;
  let mockWaveformData;
  let mockFrequencyData;

  beforeEach(() => {
    // Create container element
    container = document.createElement('div');
    container.style.width = '800px';
    container.style.height = '400px';
    document.body.appendChild(container);

    // Mock waveform data
    mockWaveformData = {
      samples: new Float32Array(1000).map((_, i) => Math.sin(i * 0.1) * 0.5),
      sampleRate: 44100,
      duration: 10,
      channels: 1
    };

    // Mock frequency data
    mockFrequencyData = new Uint8Array(256).map((_, i) => Math.floor(Math.random() * 255));

    // Mock canvas context methods
    const mockContext = {
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
      createLinearGradient: vi.fn().mockReturnValue({
        addColorStop: vi.fn()
      }),
      measureText: vi.fn().mockReturnValue({ width: 50 }),
      setLineDash: vi.fn(),
      save: vi.fn(),
      restore: vi.fn(),
      scale: vi.fn(),
      translate: vi.fn()
    };

    // Mock canvas element
    const mockCanvas = {
      getContext: vi.fn().mockReturnValue(mockContext),
      width: 800,
      height: 400,
      style: {}
    };

    // Mock document.createElement for canvas
    const originalCreateElement = document.createElement;
    document.createElement = vi.fn().mockImplementation((tagName) => {
      if (tagName === 'canvas') {
        return mockCanvas;
      }
      return originalCreateElement.call(document, tagName);
    });
  });

  afterEach(() => {
    if (renderer) {
      renderer.destroy();
      renderer = null;
    }
    
    if (container && container.parentNode) {
      container.parentNode.removeChild(container);
    }
    
    // Restore document.createElement
    document.createElement = document.createElement.getMockImplementation() ? 
      document.createElement.getMockRestore() : document.createElement;
  });

  describe('Initialization', () => {
    it('should initialize with visual enhancement engine', () => {
      renderer = new EnhancedCanvasRenderer(container, {
        enableFrequencyColorCoding: true,
        enableAmplitudeColorCoding: true,
        enableStructureDetection: true
      });

      expect(renderer).toBeDefined();
      expect(renderer.visualEnhancementEngine).toBeDefined();
      expect(renderer.getVisualEnhancementEngine()).toBeDefined();
    });

    it('should create additional layers for enhancements', () => {
      renderer = new EnhancedCanvasRenderer(container);

      // Check that enhanced layers are created
      expect(renderer.layerManager.getLayer('frequency-overlay')).toBeDefined();
      expect(renderer.layerManager.getLayer('structure-overlay')).toBeDefined();
      expect(renderer.layerManager.getLayer('accessibility-patterns')).toBeDefined();
      expect(renderer.layerManager.getLayer('enhancements')).toBeDefined();
    });

    it('should initialize with correct options', () => {
      const options = {
        enableFrequencyColorCoding: false,
        enableAmplitudeColorCoding: true,
        colorScheme: 'high-contrast'
      };

      renderer = new EnhancedCanvasRenderer(container, options);

      const engine = renderer.getVisualEnhancementEngine();
      expect(engine.options.enableFrequencyColorCoding).toBe(false);
      expect(engine.options.enableAmplitudeColorCoding).toBe(true);
      expect(engine.options.colorScheme).toBe('high-contrast');
    });
  });

  describe('Enhanced Waveform Rendering', () => {
    beforeEach(() => {
      renderer = new EnhancedCanvasRenderer(container, {
        enableFrequencyColorCoding: true,
        enableAmplitudeColorCoding: true,
        enableStructureDetection: true
      });
    });

    it('should render waveform with visual enhancements', () => {
      const renderSpy = vi.spyOn(renderer, 'renderVisualEnhancements');

      renderer.renderWaveform(mockWaveformData, {
        frequencyData: mockFrequencyData,
        metadata: { title: 'Test Song' }
      });

      expect(renderSpy).toHaveBeenCalledWith(mockWaveformData, expect.objectContaining({
        frequencyData: mockFrequencyData,
        metadata: { title: 'Test Song' }
      }));
    });

    it('should generate enhanced visual data', () => {
      renderer.renderWaveform(mockWaveformData, {
        frequencyData: mockFrequencyData
      });

      expect(renderer.frequencyColorData).toBeDefined();
      expect(renderer.amplitudeColorData).toBeDefined();
      expect(renderer.structureData).toBeDefined();
    });

    it('should render frequency color overlay when enabled', () => {
      const renderFrequencySpy = vi.spyOn(renderer, 'renderFrequencyColorOverlay');

      renderer.renderWaveform(mockWaveformData, {
        frequencyData: mockFrequencyData
      });

      expect(renderFrequencySpy).toHaveBeenCalled();
    });

    it('should render amplitude color overlay when enabled', () => {
      const renderAmplitudeSpy = vi.spyOn(renderer, 'renderAmplitudeColorOverlay');

      renderer.renderWaveform(mockWaveformData, {
        frequencyData: mockFrequencyData
      });

      expect(renderAmplitudeSpy).toHaveBeenCalled();
    });

    it('should render structure overlay when enabled', () => {
      const renderStructureSpy = vi.spyOn(renderer, 'renderStructureOverlay');

      renderer.renderWaveform(mockWaveformData, {
        metadata: { title: 'Test Song' }
      });

      expect(renderStructureSpy).toHaveBeenCalled();
    });
  });

  describe('Frequency Color Rendering', () => {
    beforeEach(() => {
      renderer = new EnhancedCanvasRenderer(container, {
        enableFrequencyColorCoding: true
      });
    });

    it('should render frequency color segments', () => {
      // Mock frequency color data
      renderer.frequencyColorData = [
        {
          startTime: 0,
          endTime: 5,
          color: { r: 255, g: 0, b: 0, a: 0.8 },
          frequencyProfile: {
            bassEnergy: 100,
            lowMidEnergy: 50,
            midEnergy: 30,
            highMidEnergy: 20,
            trebleEnergy: 10
          }
        }
      ];

      const viewport = { start: 0, end: 10 };
      renderer.renderFrequencyColorOverlay(viewport, 800, 400);

      // Verify that canvas operations were called
      const layer = renderer.layerManager.getLayer('frequency-overlay');
      expect(layer.ctx.fillRect).toHaveBeenCalled();
    });

    it('should create frequency-based gradients', () => {
      const mockCtx = {
        createLinearGradient: vi.fn().mockReturnValue({
          addColorStop: vi.fn()
        })
      };

      const color = { r: 255, g: 0, b: 0, a: 0.8 };
      const frequencyProfile = {
        bassEnergy: 100,
        lowMidEnergy: 50,
        midEnergy: 30,
        highMidEnergy: 20,
        trebleEnergy: 10
      };

      const gradient = renderer.createFrequencyGradient(mockCtx, 0, 400, color, frequencyProfile);

      expect(mockCtx.createLinearGradient).toHaveBeenCalledWith(0, 0, 0, 400);
      expect(gradient.addColorStop).toHaveBeenCalled();
    });
  });

  describe('Structure Detection Rendering', () => {
    beforeEach(() => {
      renderer = new EnhancedCanvasRenderer(container, {
        enableStructureDetection: true
      });
    });

    it('should render structure sections', () => {
      // Mock structure data
      renderer.structureData = [
        {
          type: 'verse',
          startTime: 0,
          endTime: 15,
          visualPattern: {
            color: { r: 100, g: 149, b: 237 },
            pattern: 'solid',
            description: 'Verse section'
          }
        },
        {
          type: 'chorus',
          startTime: 15,
          endTime: 30,
          visualPattern: {
            color: { r: 255, g: 215, b: 0 },
            pattern: 'gradient',
            description: 'Chorus section'
          }
        }
      ];

      const viewport = { start: 0, end: 30 };
      renderer.renderStructureOverlay(viewport, 800, 400);

      const layer = renderer.layerManager.getLayer('structure-overlay');
      expect(layer.ctx.fillRect).toHaveBeenCalled();
    });

    it('should render different structure patterns', () => {
      const mockCtx = {
        fillStyle: '',
        fillRect: vi.fn(),
        strokeStyle: '',
        strokeRect: vi.fn(),
        setLineDash: vi.fn(),
        beginPath: vi.fn(),
        arc: vi.fn(),
        fill: vi.fn(),
        createLinearGradient: vi.fn().mockReturnValue({
          addColorStop: vi.fn()
        })
      };

      const section = {
        visualPattern: {
          color: { r: 255, g: 0, b: 0 },
          pattern: 'dashed'
        }
      };

      renderer.renderStructureSection(mockCtx, section, 0, 100, 400);

      expect(mockCtx.setLineDash).toHaveBeenCalledWith([8, 4]);
      expect(mockCtx.strokeRect).toHaveBeenCalled();
    });
  });

  describe('Accessibility Features', () => {
    beforeEach(() => {
      renderer = new EnhancedCanvasRenderer(container, {
        enableAccessibilityMode: true
      });
    });

    it('should render accessibility patterns', () => {
      // Mock accessibility patterns
      renderer.accessibilityPatterns = [
        {
          startTime: 0,
          endTime: 5,
          pattern: 'vertical-lines',
          density: 'medium',
          frequencyType: 'bass'
        }
      ];

      const viewport = { start: 0, end: 10 };
      renderer.renderAccessibilityPatterns(viewport, 800, 400);

      const layer = renderer.layerManager.getLayer('accessibility-patterns');
      expect(layer.ctx.stroke).toHaveBeenCalled();
    });

    it('should render different accessibility patterns', () => {
      const mockCtx = {
        strokeStyle: '',
        lineWidth: 0,
        beginPath: vi.fn(),
        moveTo: vi.fn(),
        lineTo: vi.fn(),
        stroke: vi.fn(),
        fillStyle: '',
        arc: vi.fn(),
        fill: vi.fn()
      };

      const patterns = [
        { pattern: 'vertical-lines', density: 'high' },
        { pattern: 'horizontal-lines', density: 'medium' },
        { pattern: 'diagonal-lines', density: 'low' },
        { pattern: 'dots', density: 'sparse' },
        { pattern: 'cross-hatch', density: 'medium' }
      ];

      patterns.forEach(patternSegment => {
        renderer.renderAccessibilityPattern(mockCtx, patternSegment, 0, 100, 400);
        expect(mockCtx.beginPath).toHaveBeenCalled();
      });
    });

    it('should apply high contrast mode', () => {
      const applyHighContrastSpy = vi.spyOn(renderer, 'applyHighContrastMode');
      
      renderer.visualEnhancementEngine.options.enableHighContrastMode = true;
      renderer.renderWaveform(mockWaveformData);

      expect(applyHighContrastSpy).toHaveBeenCalled();
    });
  });

  describe('Settings Updates', () => {
    beforeEach(() => {
      renderer = new EnhancedCanvasRenderer(container);
    });

    it('should update visual settings', () => {
      const newSettings = {
        frequencyColorCoding: { enabled: false },
        accessibility: { highContrastMode: true }
      };

      renderer.updateVisualSettings(newSettings);

      const engine = renderer.getVisualEnhancementEngine();
      expect(engine.options.enableFrequencyColorCoding).toBe(false);
      expect(engine.options.enableHighContrastMode).toBe(true);
    });

    it('should clear cached data when settings change', () => {
      // Generate some cached data
      renderer.renderWaveform(mockWaveformData, { frequencyData: mockFrequencyData });
      
      expect(renderer.frequencyColorData).toBeDefined();
      expect(renderer.amplitudeColorData).toBeDefined();

      // Update settings
      renderer.updateVisualSettings({
        frequencyColorCoding: { enabled: false }
      });

      // Cached data should be cleared
      expect(renderer.frequencyColorData).toBeNull();
      expect(renderer.amplitudeColorData).toBeNull();
    });

    it('should mark layers dirty when settings change', () => {
      const markDirtySpy = vi.spyOn(renderer.layerManager, 'markLayerDirty');

      renderer.updateVisualSettings({
        frequencyColorCoding: { enabled: false }
      });

      expect(markDirtySpy).toHaveBeenCalledWith('frequency-overlay');
      expect(markDirtySpy).toHaveBeenCalledWith('structure-overlay');
      expect(markDirtySpy).toHaveBeenCalledWith('accessibility-patterns');
    });
  });

  describe('Performance', () => {
    beforeEach(() => {
      renderer = new EnhancedCanvasRenderer(container);
    });

    it('should handle large datasets efficiently', () => {
      const largeWaveformData = {
        samples: new Float32Array(100000).map((_, i) => Math.sin(i * 0.01)),
        sampleRate: 44100,
        duration: 100,
        channels: 1
      };

      const largeFrequencyData = new Uint8Array(2048).map(() => Math.floor(Math.random() * 255));

      const startTime = performance.now();
      renderer.renderWaveform(largeWaveformData, { frequencyData: largeFrequencyData });
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(2000); // Should complete within 2 seconds
    });

    it('should cache pattern data for performance', () => {
      expect(renderer.patternCache.size).toBeGreaterThan(0);
      
      // Verify that common patterns are cached
      expect(renderer.patternCache.has('vertical-lines-high')).toBe(true);
      expect(renderer.patternCache.has('dots-medium')).toBe(true);
    });

    it('should start animation loop for enhanced effects', () => {
      const requestAnimationFrameSpy = vi.spyOn(window, 'requestAnimationFrame');
      
      renderer.startEnhancementAnimationLoop();
      
      expect(requestAnimationFrameSpy).toHaveBeenCalled();
      
      requestAnimationFrameSpy.mockRestore();
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      renderer = new EnhancedCanvasRenderer(container);
    });

    it('should handle missing frequency data gracefully', () => {
      expect(() => {
        renderer.renderWaveform(mockWaveformData); // No frequency data
      }).not.toThrow();
    });

    it('should handle invalid waveform data gracefully', () => {
      const invalidWaveformData = {
        samples: null,
        sampleRate: 0,
        duration: 0
      };

      expect(() => {
        renderer.renderWaveform(invalidWaveformData);
      }).not.toThrow();
    });

    it('should handle rendering errors gracefully', () => {
      // Mock a rendering error
      const originalRenderWaveform = renderer.renderWaveform;
      renderer.renderWaveform = vi.fn().mockImplementation(() => {
        throw new Error('Rendering error');
      });

      expect(() => {
        renderer.renderVisualEnhancements(mockWaveformData);
      }).not.toThrow();

      renderer.renderWaveform = originalRenderWaveform;
    });
  });

  describe('Cleanup', () => {
    it('should clean up resources on destroy', () => {
      renderer = new EnhancedCanvasRenderer(container);
      
      expect(renderer.visualEnhancementEngine).toBeDefined();
      expect(renderer.patternCache.size).toBeGreaterThan(0);

      renderer.destroy();

      expect(renderer.patternCache.size).toBe(0);
    });
  });
});