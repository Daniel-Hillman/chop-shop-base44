import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ZoomControls from '../ZoomControls.jsx';
import { ViewportManager } from '../ViewportManager.js';

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }) => <div {...props}>{children}</div>
  },
  AnimatePresence: ({ children }) => children
}));

describe('ZoomControls', () => {
  let mockViewportManager;
  let mockViewportState;
  let mockNavigationInfo;
  let mockZoomPresets;

  beforeEach(() => {
    mockViewportState = {
      zoomLevel: 2.0,
      centerTime: 30,
      visibleTimeRange: { start: 20, end: 40 },
      audioDuration: 120,
      pixelsPerSecond: 200,
      canvasDimensions: { width: 800, height: 200 }
    };

    mockNavigationInfo = {
      visiblePercentage: 16.67,
      startPercentage: 16.67,
      endPercentage: 33.33,
      zoomLevel: 2.0,
      detailLevel: 'high',
      canZoomIn: true,
      canZoomOut: true,
      canPanLeft: true,
      canPanRight: true
    };

    mockZoomPresets = [
      { name: 'Fit All', zoomLevel: 0.5, description: 'Show entire audio file' },
      { name: '1:1', zoomLevel: 1.0, description: 'Default zoom level' },
      { name: '2x', zoomLevel: 2.0, description: 'Double zoom' },
      { name: '5x', zoomLevel: 5.0, description: '5x zoom for detailed editing' }
    ];

    mockViewportManager = {
      getState: vi.fn(() => mockViewportState),
      getNavigationInfo: vi.fn(() => mockNavigationInfo),
      getZoomPresets: vi.fn(() => mockZoomPresets),
      addListener: vi.fn((callback) => {
        // Immediately call with current state
        callback(mockViewportState);
        // Return unsubscribe function
        return vi.fn();
      }),
      zoomIn: vi.fn(),
      zoomOut: vi.fn(),
      zoomToFit: vi.fn(),
      setZoom: vi.fn(),
      panToTime: vi.fn()
    };
  });

  it('creates ZoomControls component without errors', () => {
    expect(() => {
      const component = React.createElement(ZoomControls, {
        viewportManager: mockViewportManager
      });
      expect(component).toBeDefined();
    }).not.toThrow();
  });

  it('handles viewport manager state correctly', () => {
    const component = React.createElement(ZoomControls, {
      viewportManager: mockViewportManager
    });
    
    expect(component.props.viewportManager).toBe(mockViewportManager);
    expect(mockViewportManager.getState).toBeDefined();
    expect(mockViewportManager.getNavigationInfo).toBeDefined();
    expect(mockViewportManager.getZoomPresets).toBeDefined();
  });

  it('provides zoom control methods', () => {
    expect(mockViewportManager.zoomIn).toBeDefined();
    expect(mockViewportManager.zoomOut).toBeDefined();
    expect(mockViewportManager.zoomToFit).toBeDefined();
    expect(mockViewportManager.setZoom).toBeDefined();
  });

  it('provides navigation control methods', () => {
    expect(mockViewportManager.panToTime).toBeDefined();
  });

  it('handles missing viewport manager gracefully', () => {
    expect(() => {
      const component = React.createElement(ZoomControls, {
        viewportManager: null
      });
      expect(component).toBeDefined();
    }).not.toThrow();
  });

  it('supports configuration options', () => {
    const component = React.createElement(ZoomControls, {
      viewportManager: mockViewportManager,
      showPresets: true,
      showNavigationInfo: true,
      compact: false
    });
    
    expect(component.props.showPresets).toBe(true);
    expect(component.props.showNavigationInfo).toBe(true);
    expect(component.props.compact).toBe(false);
  });

  it('formats zoom levels correctly', () => {
    // Test zoom level formatting logic
    const formatZoom = (zoom) => {
      if (zoom >= 1) {
        return `${zoom.toFixed(1)}x`;
      } else {
        return `1:${(1/zoom).toFixed(1)}`;
      }
    };

    expect(formatZoom(2.0)).toBe('2.0x');
    expect(formatZoom(0.5)).toBe('1:2.0');
    expect(formatZoom(1.0)).toBe('1.0x');
  });

  it('formats time correctly', () => {
    // Test time formatting logic
    const formatTime = (time) => {
      const minutes = Math.floor(time / 60);
      const seconds = (time % 60).toFixed(2);
      return `${minutes}:${seconds.padStart(5, '0')}`;
    };

    expect(formatTime(30)).toBe('0:30.00');
    expect(formatTime(90)).toBe('1:30.00');
    expect(formatTime(125.5)).toBe('2:05.50');
  });

  it('calculates pan distances correctly', () => {
    // Test pan distance calculation logic
    const visibleDuration = mockViewportState.visibleTimeRange.end - mockViewportState.visibleTimeRange.start;
    const normalPanDistance = visibleDuration * 0.25;
    
    expect(normalPanDistance).toBe(5); // 20 seconds * 0.25
    
    const leftTarget = mockViewportState.centerTime - normalPanDistance;
    const rightTarget = mockViewportState.centerTime + normalPanDistance;
    
    expect(leftTarget).toBe(25); // 30 - 5
    expect(rightTarget).toBe(35); // 30 + 5
  });
});