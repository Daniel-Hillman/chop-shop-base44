import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import TransportControls from '../TransportControls';

describe('TransportControls', () => {
  const defaultProps = {
    isPlaying: false,
    isPaused: false,
    bpm: 120,
    swing: 0,
    isInitialized: true,
    onPlay: vi.fn(),
    onPause: vi.fn(),
    onStop: vi.fn(),
    onBpmChange: vi.fn(),
    onSwingChange: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders transport controls correctly', () => {
    render(<TransportControls {...defaultProps} />);
    
    expect(screen.getByText('Play')).toBeInTheDocument();
    expect(screen.getByText('Stop')).toBeInTheDocument();
    expect(screen.getByDisplayValue('120')).toBeInTheDocument();
    expect(screen.getByText('BPM:')).toBeInTheDocument();
    expect(screen.getByText('Swing:')).toBeInTheDocument();
  });

  it('shows pause button when playing', () => {
    render(<TransportControls {...defaultProps} isPlaying={true} />);
    
    expect(screen.getByText('Pause')).toBeInTheDocument();
    expect(screen.queryByText('Play')).not.toBeInTheDocument();
  });

  it('shows resume button when paused', () => {
    render(<TransportControls {...defaultProps} isPaused={true} />);
    
    expect(screen.getByText('Resume')).toBeInTheDocument();
  });

  it('calls onPlay when play button is clicked', () => {
    render(<TransportControls {...defaultProps} />);
    
    fireEvent.click(screen.getByText('Play'));
    expect(defaultProps.onPlay).toHaveBeenCalledTimes(1);
  });

  it('calls onPause when pause button is clicked', () => {
    render(<TransportControls {...defaultProps} isPlaying={true} />);
    
    fireEvent.click(screen.getByText('Pause'));
    expect(defaultProps.onPause).toHaveBeenCalledTimes(1);
  });

  it('calls onStop when stop button is clicked', () => {
    render(<TransportControls {...defaultProps} />);
    
    fireEvent.click(screen.getByText('Stop'));
    expect(defaultProps.onStop).toHaveBeenCalledTimes(1);
  });

  it('handles BPM input changes', async () => {
    render(<TransportControls {...defaultProps} />);
    
    const bpmInput = screen.getByDisplayValue('120');
    fireEvent.change(bpmInput, { target: { value: '140' } });
    fireEvent.blur(bpmInput);
    
    await waitFor(() => {
      expect(defaultProps.onBpmChange).toHaveBeenCalledWith(140);
    });
  });

  it('validates BPM input range', async () => {
    render(<TransportControls {...defaultProps} />);
    
    const bpmInput = screen.getByDisplayValue('120');
    
    // Test invalid low value
    fireEvent.change(bpmInput, { target: { value: '50' } });
    fireEvent.blur(bpmInput);
    
    await waitFor(() => {
      expect(defaultProps.onBpmChange).not.toHaveBeenCalled();
      expect(bpmInput.value).toBe('120'); // Should reset to original
    });
    
    // Test invalid high value
    fireEvent.change(bpmInput, { target: { value: '250' } });
    fireEvent.blur(bpmInput);
    
    await waitFor(() => {
      expect(defaultProps.onBpmChange).not.toHaveBeenCalled();
      expect(bpmInput.value).toBe('120'); // Should reset to original
    });
  });

  it('handles swing slider changes', () => {
    render(<TransportControls {...defaultProps} />);
    
    const swingSlider = screen.getByRole('slider');
    fireEvent.change(swingSlider, { target: { value: '25' } });
    
    expect(defaultProps.onSwingChange).toHaveBeenCalledWith(25);
  });

  it('disables controls when not initialized', () => {
    render(<TransportControls {...defaultProps} isInitialized={false} />);
    
    expect(screen.getByText('Play')).toBeDisabled();
    expect(screen.getByText('Stop')).toBeDisabled();
    expect(screen.getByDisplayValue('120')).toBeDisabled();
    expect(screen.getByRole('slider')).toBeDisabled();
  });

  it('shows correct status indicator', () => {
    // Test initializing state
    render(<TransportControls {...defaultProps} isInitialized={false} />);
    expect(screen.getByText('Initializing...')).toBeInTheDocument();
    
    // Test stopped state
    render(<TransportControls {...defaultProps} />);
    expect(screen.getByText('Stopped')).toBeInTheDocument();
    
    // Test playing state
    render(<TransportControls {...defaultProps} isPlaying={true} />);
    expect(screen.getByText('Playing')).toBeInTheDocument();
    
    // Test paused state
    render(<TransportControls {...defaultProps} isPaused={true} />);
    expect(screen.getByText('Paused')).toBeInTheDocument();
  });

  it('commits BPM changes on Enter key', async () => {
    render(<TransportControls {...defaultProps} />);
    
    const bpmInput = screen.getByDisplayValue('120');
    fireEvent.change(bpmInput, { target: { value: '130' } });
    
    // Simulate Enter key triggering blur
    fireEvent.keyDown(bpmInput, { key: 'Enter', code: 'Enter' });
    fireEvent.blur(bpmInput);
    
    await waitFor(() => {
      expect(defaultProps.onBpmChange).toHaveBeenCalledWith(130);
    });
  });
});