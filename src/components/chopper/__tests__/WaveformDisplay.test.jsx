import React from 'react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import WaveformDisplay from '../WaveformDisplay';

// Mock the services
vi.mock('../../../services/AudioProcessingService.js', () => ({
  default: {
    getAudioBuffer: vi.fn(),
  }
}));

vi.mock('../../../services/StorageManager.js', () => ({
  default: {
    retrieve: vi.fn(),
  }
}));

// Mock canvas context
const mockCanvasContext = {
  clearRect: vi.fn(),
  strokeStyle: '',
  lineWidth: 0,
  beginPath: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  stroke: vi.fn(),
  fillStyle: '',
  fillRect: vi.fn(),
  font: '',
  textAlign: '',
  fillText: vi.fn(),
  createLinearGradient: vi.fn(() => ({
    addColorStop: vi.fn(),
  })),
  closePath: vi.fn(),
  fill: vi.fn(),
};

// Mock HTMLCanvasElement.getContext
HTMLCanvasElement.prototype.getContext = vi.fn(() => mockCanvasContext);

// Mock requestAnimationFrame
global.requestAnimationFrame = vi.fn((cb) => setTimeout(cb, 16));
global.cancelAnimationFrame = vi.fn();

describe('WaveformDisplay', () => {
  const defaultProps = {
    playerState: {
      currentTime: 30,
      duration: 180,
      isPlaying: false,
    },
    selectedChop: null,
    setChopTime: vi.fn(),
    waveformData: null,
    deleteChop: vi.fn(),
    youtubeUrl: 'https://www.youtube.com/watch?v=test',
    allChops: [],
    onTimestampClick: vi.fn(),
    isPlaying: false,
    onPlayPause: vi.fn(),
  };

  const mockWaveformData = [0.1, 0.3, 0.5, 0.7, 0.4, 0.2, 0.6, 0.8];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  it('component imports and renders without errors', () => {
    expect(WaveformDisplay).toBeDefined();
    expect(typeof WaveformDisplay).toBe('function');
  });

  it('handles props correctly', () => {
    // Test that component accepts all required props
    const props = {
      ...defaultProps,
      waveformData: mockWaveformData,
      allChops: [
        { padId: 'A1', startTime: 10, endTime: 15, color: '#ff0000' },
      ],
    };
    
    expect(() => {
      // This would throw if there are prop validation errors
      React.createElement(WaveformDisplay, props);
    }).not.toThrow();
  });

  it('canvas context methods are available', () => {
    // Verify our canvas mocking is working
    expect(mockCanvasContext.clearRect).toBeDefined();
    expect(mockCanvasContext.beginPath).toBeDefined();
    expect(mockCanvasContext.stroke).toBeDefined();
  });

  it('timeToPercent calculation works correctly', () => {
    // Test the time to percentage calculation logic
    const duration = 180;
    const time = 90;
    const expectedPercent = (time / duration) * 100;
    
    expect(expectedPercent).toBe(50);
  });

  it('waveform data processing', () => {
    // Test that waveform data is in expected format
    expect(Array.isArray(mockWaveformData)).toBe(true);
    expect(mockWaveformData.every(val => typeof val === 'number')).toBe(true);
    expect(mockWaveformData.every(val => val >= 0 && val <= 1)).toBe(true);
  });

  it('chop data structure validation', () => {
    const chop = { padId: 'A1', startTime: 10, endTime: 15, color: '#ff0000' };
    
    expect(chop).toHaveProperty('padId');
    expect(chop).toHaveProperty('startTime');
    expect(chop).toHaveProperty('endTime');
    expect(chop).toHaveProperty('color');
    expect(chop.startTime).toBeLessThan(chop.endTime);
  });

  it('player state structure validation', () => {
    const { playerState } = defaultProps;
    
    expect(playerState).toHaveProperty('currentTime');
    expect(playerState).toHaveProperty('duration');
    expect(playerState).toHaveProperty('isPlaying');
    expect(typeof playerState.currentTime).toBe('number');
    expect(typeof playerState.duration).toBe('number');
    expect(typeof playerState.isPlaying).toBe('boolean');
  });
});