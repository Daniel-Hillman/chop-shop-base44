import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import TransportControls from '../TransportControls';
import StepResolutionSelector from '../StepResolutionSelector';

describe('Transport Controls Integration', () => {
  it('integrates transport controls and step resolution selector', async () => {
    const mockHandlers = {
      onPlay: vi.fn(),
      onPause: vi.fn(),
      onStop: vi.fn(),
      onBpmChange: vi.fn(),
      onSwingChange: vi.fn(),
      onResolutionChange: vi.fn()
    };

    const TestComponent = () => {
      const [isPlaying, setIsPlaying] = React.useState(false);
      const [bpm, setBpm] = React.useState(120);
      const [swing, setSwing] = React.useState(0);
      const [resolution, setResolution] = React.useState(16);

      const handlePlay = () => {
        setIsPlaying(true);
        mockHandlers.onPlay();
      };

      const handlePause = () => {
        setIsPlaying(false);
        mockHandlers.onPause();
      };

      const handleStop = () => {
        setIsPlaying(false);
        mockHandlers.onStop();
      };

      const handleBpmChange = (newBpm) => {
        setBpm(newBpm);
        mockHandlers.onBpmChange(newBpm);
      };

      const handleSwingChange = (newSwing) => {
        setSwing(newSwing);
        mockHandlers.onSwingChange(newSwing);
      };

      const handleResolutionChange = (newResolution) => {
        setResolution(newResolution);
        mockHandlers.onResolutionChange(newResolution);
      };

      return (
        <div className="space-y-4">
          <TransportControls
            isPlaying={isPlaying}
            isPaused={false}
            bpm={bpm}
            swing={swing}
            isInitialized={true}
            onPlay={handlePlay}
            onPause={handlePause}
            onStop={handleStop}
            onBpmChange={handleBpmChange}
            onSwingChange={handleSwingChange}
          />
          <StepResolutionSelector
            resolution={resolution}
            onResolutionChange={handleResolutionChange}
            isInitialized={true}
            hasPatternData={false}
          />
        </div>
      );
    };

    render(<TestComponent />);

    // Test transport controls
    expect(screen.getByText('Play')).toBeInTheDocument();
    expect(screen.getByDisplayValue('120')).toBeInTheDocument();

    // Test step resolution selector
    expect(screen.getByText('Step Resolution')).toBeInTheDocument();
    expect(screen.getAllByText('1/16')).toHaveLength(2); // Button and current info

    // Test play functionality
    fireEvent.click(screen.getByText('Play'));
    expect(mockHandlers.onPlay).toHaveBeenCalled();
    expect(screen.getByText('Pause')).toBeInTheDocument();

    // Test BPM change
    const bpmInput = screen.getByDisplayValue('120');
    fireEvent.change(bpmInput, { target: { value: '140' } });
    fireEvent.blur(bpmInput);
    
    await waitFor(() => {
      expect(mockHandlers.onBpmChange).toHaveBeenCalledWith(140);
    });

    // Test resolution change
    fireEvent.click(screen.getByText('1/32'));
    expect(mockHandlers.onResolutionChange).toHaveBeenCalledWith(32);
  });

  it('shows proper state synchronization', () => {
    const props = {
      isPlaying: true,
      isPaused: false,
      bpm: 140,
      swing: 25,
      isInitialized: true,
      onPlay: vi.fn(),
      onPause: vi.fn(),
      onStop: vi.fn(),
      onBpmChange: vi.fn(),
      onSwingChange: vi.fn()
    };

    render(<TransportControls {...props} />);

    // Should show pause button when playing
    expect(screen.getByText('Pause')).toBeInTheDocument();
    expect(screen.queryByText('Play')).not.toBeInTheDocument();

    // Should show correct BPM
    expect(screen.getByDisplayValue('140')).toBeInTheDocument();

    // Should show playing status
    expect(screen.getByText('Playing')).toBeInTheDocument();
  });
});