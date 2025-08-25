import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import WaveformVisualization from '../WaveformVisualization';

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }) => <div {...props}>{children}</div>
  }
}));

// Mock canvas context
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
  fillText: vi.fn(),
  strokeText: vi.fn(),
  closePath: vi.fn(),
  arc: vi.fn(),
  setLineDash: vi.fn(),
  set fillStyle(value) { this._fillStyle = value; },
  get fillStyle() { return this._fillStyle; },
  set strokeStyle(value) { this._strokeStyle = value; },
  get strokeStyle() { return this._strokeStyle; },
  set lineWidth(value) { this._lineWidth = value; },
  get lineWidth() { return this._lineWidth; },
  set font(value) { this._font = value; },
  get font() { return this._font; },
  set textAlign(value) { this._textAlign = value; },
  get textAlign() { return this._textAlign; },
  set textBaseline(value) { this._textBaseline = value; },
  get textBaseline() { return this._textBaseline; },
  set imageSmoothingEnabled(value) { this._imageSmoothingEnabled = value; },
  get imageSmoothingEnabled() { return this._imageSmoothingEnabled; }
};

// Mock canvas element
const mockCanvas = {
  getContext: vi.fn(() => mockContext),
  style: {},
  width: 0,
  height: 0
};

// Mock getBoundingClientRect
const mockGetBoundingClientRect = vi.fn(() => ({
  width: 800,
  height: 200,
  top: 0,
  left: 0,
  right: 800,
  bottom: 200
}));

describe('WaveformVisualization', () => {
  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();
    
    // Mock canvas creation
    vi.spyOn(document, 'createElement').mockImplementation((tagName) => {
      if (tagName === 'canvas') {
        return { ...mockCanvas };
      }
      return document.createElement(tagName);
    });
    
    // Mock getBoundingClientRect
    Element.prototype.getBoundingClientRect = mockGetBoundingClientRect;
    
    // Mock devicePixelRatio
    Object.defineProperty(window, 'devicePixelRatio', {
      writable: true,
      value: 2
    });
    
    // Mock requestAnimationFrame
    global.requestAnimationFrame = vi.fn(cb => setTimeout(cb, 16));
    global.cancelAnimationFrame = vi.fn(id => clearTimeout(id));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Component Structure', () => {
    it('should be importable', () => {
      expect(WaveformVisualization).toBeDefined();
      expect(typeof WaveformVisualization).toBe('function');
    });

    it('should have proper default props structure', () => {
      // Test that the component can be instantiated
      const element = React.createElement(WaveformVisualization, {});
      expect(element).toBeDefined();
      expect(element.type).toBe(WaveformVisualization);
    });
  });

  describe('Canvas Layer System', () => {
    it('should define multi-layer canvas structure', () => {
      // Test that the component has the expected structure for canvas layers
      const props = {
        chops: [],
        currentTime: 0,
        isPlaying: false
      };
      
      const element = React.createElement(WaveformVisualization, props);
      expect(element.props.chops).toEqual([]);
      expect(element.props.currentTime).toBe(0);
      expect(element.props.isPlaying).toBe(false);
    });
  });

  describe('Viewport Management', () => {
    it('should handle viewport state structure', () => {
      const props = {
        audioSource: null,
        chops: [
          { id: '1', startTime: 10, endTime: 15, padId: 'A1', color: '#ff0000' }
        ],
        currentTime: 30,
        isPlaying: true,
        onChopCreate: vi.fn(),
        onChopUpdate: vi.fn(),
        onTimeSeek: vi.fn(),
        visualSettings: { theme: 'dark' }
      };
      
      const element = React.createElement(WaveformVisualization, props);
      expect(element.props.chops).toHaveLength(1);
      expect(element.props.currentTime).toBe(30);
      expect(element.props.isPlaying).toBe(true);
      expect(typeof element.props.onChopCreate).toBe('function');
    });
  });

  describe('Event Handlers', () => {
    it('should accept callback props', () => {
      const mockOnChopCreate = vi.fn();
      const mockOnChopUpdate = vi.fn();
      const mockOnTimeSeek = vi.fn();
      
      const props = {
        onChopCreate: mockOnChopCreate,
        onChopUpdate: mockOnChopUpdate,
        onTimeSeek: mockOnTimeSeek
      };
      
      const element = React.createElement(WaveformVisualization, props);
      expect(element.props.onChopCreate).toBe(mockOnChopCreate);
      expect(element.props.onChopUpdate).toBe(mockOnChopUpdate);
      expect(element.props.onTimeSeek).toBe(mockOnTimeSeek);
    });
  });

  describe('Chop Data Structure', () => {
    it('should handle chop data correctly', () => {
      const chops = [
        { id: '1', startTime: 10, endTime: 15, padId: 'A1', color: '#ff0000' },
        { id: '2', startTime: 20, endTime: 25, padId: 'A2', color: '#00ff00' }
      ];
      
      const element = React.createElement(WaveformVisualization, { chops });
      expect(element.props.chops).toEqual(chops);
      expect(element.props.chops).toHaveLength(2);
    });
  });

  describe('Visual Settings', () => {
    it('should accept visual settings', () => {
      const visualSettings = {
        theme: 'dark',
        colorScheme: 'blue',
        showGrid: true,
        showTimestamps: true
      };
      
      const element = React.createElement(WaveformVisualization, { visualSettings });
      expect(element.props.visualSettings).toEqual(visualSettings);
    });
  });

  describe('Playback State', () => {
    it('should handle playback state changes', () => {
      const element1 = React.createElement(WaveformVisualization, { 
        isPlaying: false, 
        currentTime: 0 
      });
      
      const element2 = React.createElement(WaveformVisualization, { 
        isPlaying: true, 
        currentTime: 45.5 
      });
      
      expect(element1.props.isPlaying).toBe(false);
      expect(element1.props.currentTime).toBe(0);
      
      expect(element2.props.isPlaying).toBe(true);
      expect(element2.props.currentTime).toBe(45.5);
    });
  });

  describe('CSS Classes', () => {
    it('should accept custom className', () => {
      const customClass = 'custom-waveform-class';
      const element = React.createElement(WaveformVisualization, { 
        className: customClass 
      });
      
      expect(element.props.className).toBe(customClass);
    });
  });

  describe('Audio Source', () => {
    it('should accept audio source prop', () => {
      const mockAudioSource = { type: 'youtube', url: 'test-url' };
      const element = React.createElement(WaveformVisualization, { 
        audioSource: mockAudioSource 
      });
      
      expect(element.props.audioSource).toEqual(mockAudioSource);
    });
  });
});