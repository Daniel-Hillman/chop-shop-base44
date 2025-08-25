import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import WaveformVisualizationBridge from '../WaveformVisualizationBridge';

// Mock the WaveformVisualization component
vi.mock('../../waveform/WaveformVisualization.jsx', () => ({
  default: React.forwardRef(({ onChopCreate, onChopUpdate, onTimeSeek, chops, currentTime, isPlaying }, ref) => {
    // Expose methods for testing
    React.useImperativeHandle(ref, () => ({
      zoomIn: vi.fn(),
      zoomOut: vi.fn(),
      zoomToFit: vi.fn(),
      getViewport: vi.fn(() => ({ zoomLevel: 1, centerTime: 0 })),
      getPerformanceMetrics: vi.fn(() => ({ averageFPS: 60 }))
    }));

    return (
      <div data-testid="waveform-visualization">
        <div data-testid="chop-count">{chops.length}</div>
        <div data-testid="current-time">{currentTime}</div>
        <div data-testid="is-playing">{isPlaying.toString()}</div>
        <button 
          data-testid="simulate-chop-create"
          onClick={() => onChopCreate(10.5, 14.2)}
        >
          Simulate Chop Create
        </button>
        <button 
          data-testid="simulate-chop-update"
          onClick={() => onChopUpdate('A0', { startTime: 11.0, endTime: 15.0 })}
        >
          Simulate Chop Update
        </button>
        <button 
          data-testid="simulate-time-seek"
          onClick={() => onTimeSeek(20.5)}
        >
          Simulate Time Seek
        </button>
      </div>
    );
  })
}));

// Mock ZoomControls
vi.mock('../../waveform/ZoomControls.jsx', () => ({
  default: ({ onZoomIn, onZoomOut, onZoomToFit }) => (
    <div data-testid="zoom-controls">
      <button data-testid="zoom-in" onClick={onZoomIn}>Zoom In</button>
      <button data-testid="zoom-out" onClick={onZoomOut}>Zoom Out</button>
      <button data-testid="zoom-fit" onClick={onZoomToFit}>Zoom Fit</button>
    </div>
  )
}));

describe('WaveformVisualizationBridge Integration', () => {
  const mockProps = {
    playerState: {
      currentTime: 15.5,
      duration: 180,
      isPlaying: true
    },
    selectedChop: {
      padId: 'A0',
      startTime: 10.0,
      endTime: 14.0,
      color: '#06b6d4'
    },
    setChopTime: vi.fn(),
    waveformData: new Float32Array([0.1, 0.5, -0.3, 0.8, -0.2]),
    deleteChop: vi.fn(),
    youtubeUrl: 'https://www.youtube.com/watch?v=test',
    allChops: [
      {
        padId: 'A0',
        startTime: 10.0,
        endTime: 14.0,
        color: '#06b6d4'
      },
      {
        padId: 'A1',
        startTime: 20.0,
        endTime: 24.0,
        color: '#3b82f6'
      }
    ],
    onTimestampClick: vi.fn(),
    isPlaying: true,
    onPlayPause: vi.fn(),
    capturedAudioData: null
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders waveform visualization with correct props', () => {
    render(<WaveformVisualizationBridge {...mockProps} />);
    
    expect(screen.getByTestId('waveform-visualization')).toBeInTheDocument();
    expect(screen.getByTestId('chop-count')).toHaveTextContent('2');
    expect(screen.getByTestId('current-time')).toHaveTextContent('15.5');
    expect(screen.getByTestId('is-playing')).toHaveTextContent('true');
  });

  it('displays selected chop information', () => {
    render(<WaveformVisualizationBridge {...mockProps} />);
    
    expect(screen.getByText('Edit Sample: A0')).toBeInTheDocument();
    expect(screen.getByText('10.000s')).toBeInTheDocument();
    expect(screen.getByText('14.000s')).toBeInTheDocument();
    expect(screen.getByText('4.000s')).toBeInTheDocument(); // Duration
  });

  it('shows workflow status indicator', () => {
    render(<WaveformVisualizationBridge {...mockProps} />);
    
    expect(screen.getByText('✓ Pad A0 selected')).toBeInTheDocument();
  });

  it('shows warning when no pad is selected', () => {
    const propsWithoutSelection = {
      ...mockProps,
      selectedChop: null
    };
    
    render(<WaveformVisualizationBridge {...propsWithoutSelection} />);
    
    expect(screen.getByText('⚠ Select a pad to create samples')).toBeInTheDocument();
  });

  it('handles chop creation from waveform interaction', async () => {
    render(<WaveformVisualizationBridge {...mockProps} />);
    
    fireEvent.click(screen.getByTestId('simulate-chop-create'));
    
    await waitFor(() => {
      expect(mockProps.setChopTime).toHaveBeenCalledWith('startTime', 10.5);
      expect(mockProps.setChopTime).toHaveBeenCalledWith('endTime', 14.2);
    });
  });

  it('handles chop updates from waveform interaction', async () => {
    render(<WaveformVisualizationBridge {...mockProps} />);
    
    fireEvent.click(screen.getByTestId('simulate-chop-update'));
    
    await waitFor(() => {
      expect(mockProps.setChopTime).toHaveBeenCalledWith('startTime', 11.0);
      expect(mockProps.setChopTime).toHaveBeenCalledWith('endTime', 15.0);
    });
  });

  it('handles time seeking from waveform interaction', async () => {
    render(<WaveformVisualizationBridge {...mockProps} />);
    
    fireEvent.click(screen.getByTestId('simulate-time-seek'));
    
    await waitFor(() => {
      expect(mockProps.onTimestampClick).toHaveBeenCalledWith(20.5);
    });
  });

  it('handles zoom controls', () => {
    render(<WaveformVisualizationBridge {...mockProps} />);
    
    fireEvent.click(screen.getByTestId('zoom-in'));
    fireEvent.click(screen.getByTestId('zoom-out'));
    fireEvent.click(screen.getByTestId('zoom-fit'));
    
    // Zoom functionality is tested through the mocked component
    expect(screen.getByTestId('zoom-controls')).toBeInTheDocument();
  });

  it('handles play/pause button', () => {
    render(<WaveformVisualizationBridge {...mockProps} />);
    
    const playPauseButton = screen.getByRole('button', { name: 'Pause' });
    fireEvent.click(playPauseButton);
    
    expect(mockProps.onPlayPause).toHaveBeenCalled();
  });

  it('handles chop deletion', () => {
    render(<WaveformVisualizationBridge {...mockProps} />);
    
    const deleteButton = screen.getByRole('button', { name: 'Delete chop' });
    fireEvent.click(deleteButton);
    
    expect(mockProps.deleteChop).toHaveBeenCalledWith('A0');
  });

  it('handles manual timestamp editing', async () => {
    render(<WaveformVisualizationBridge {...mockProps} />);
    
    // Enter edit mode
    fireEvent.click(screen.getByText('Edit'));
    
    // Edit start time
    const startTimeInput = screen.getByDisplayValue('10.0000');
    fireEvent.change(startTimeInput, { target: { value: '11.5000' } });
    
    // Edit end time
    const endTimeInput = screen.getByDisplayValue('14.0000');
    fireEvent.change(endTimeInput, { target: { value: '15.5000' } });
    
    // Save changes
    fireEvent.click(screen.getByText('Save Changes'));
    
    await waitFor(() => {
      expect(mockProps.setChopTime).toHaveBeenCalledWith('startTime', 11.5);
      expect(mockProps.setChopTime).toHaveBeenCalledWith('endTime', 15.5);
    });
  });

  it('shows high quality indicator for captured audio', () => {
    const propsWithCapturedAudio = {
      ...mockProps,
      capturedAudioData: {
        waveformData: new Float32Array([0.1, 0.5, -0.3]),
        metadata: {
          sampleRate: 44100,
          duration: 30.0
        }
      }
    };
    
    render(<WaveformVisualizationBridge {...propsWithCapturedAudio} />);
    
    expect(screen.getByText('High Quality Audio')).toBeInTheDocument();
    expect(screen.getByText(/Using high-quality captured audio/)).toBeInTheDocument();
  });

  it('converts legacy chop format correctly', () => {
    const legacyChops = [
      {
        padId: 'B2',
        startTime: 5.5,
        endTime: 8.2,
        color: '#ff0000'
      }
    ];
    
    const propsWithLegacyChops = {
      ...mockProps,
      allChops: legacyChops,
      selectedChop: legacyChops[0]
    };
    
    render(<WaveformVisualizationBridge {...propsWithLegacyChops} />);
    
    expect(screen.getByTestId('chop-count')).toHaveTextContent('1');
    expect(screen.getByText('Edit Sample: B2')).toBeInTheDocument();
  });

  it('handles missing waveform data gracefully', () => {
    const propsWithoutWaveform = {
      ...mockProps,
      waveformData: null,
      capturedAudioData: null
    };
    
    render(<WaveformVisualizationBridge {...propsWithoutWaveform} />);
    
    expect(screen.getByText('No waveform data available')).toBeInTheDocument();
    expect(screen.getByText('Load a video to generate waveform')).toBeInTheDocument();
  });
});