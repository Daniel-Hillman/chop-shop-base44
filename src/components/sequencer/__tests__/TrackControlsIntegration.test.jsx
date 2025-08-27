import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import TrackControls from '../TrackControls';
import RandomizationControls from '../RandomizationControls';
import { PatternManager } from '../../../services/sequencer/PatternManager';

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }) => <div {...props}>{children}</div>,
  },
}));

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Volume2: () => <div data-testid="volume2-icon" />,
  VolumeX: () => <div data-testid="volumex-icon" />,
  Headphones: () => <div data-testid="headphones-icon" />,
  Edit3: () => <div data-testid="edit3-icon" />,
  Palette: () => <div data-testid="palette-icon" />,
  Shuffle: () => <div data-testid="shuffle-icon" />,
  ToggleLeft: () => <div data-testid="toggle-left-icon" />,
  ToggleRight: () => <div data-testid="toggle-right-icon" />,
}));

describe('TrackControls Integration', () => {
  let patternManager;
  let pattern;

  beforeEach(() => {
    patternManager = new PatternManager();
    pattern = patternManager.createPattern('Test Pattern', 3, 16);
    patternManager.setCurrentPattern(pattern);
  });

  it('should integrate TrackControls with PatternManager', async () => {
    const handleVolumeChange = vi.fn((trackId, volume) => {
      patternManager.setTrackVolume(trackId, volume);
    });

    const handleMuteToggle = vi.fn((trackId) => {
      patternManager.toggleTrackMute(trackId);
    });

    const handleSoloToggle = vi.fn((trackId) => {
      patternManager.toggleTrackSolo(trackId);
    });

    const handleTrackNameChange = vi.fn((trackId, name) => {
      patternManager.setTrackName(trackId, name);
    });

    const handleTrackColorChange = vi.fn((trackId, color) => {
      patternManager.setTrackColor(trackId, color);
    });

    render(
      <TrackControls
        tracks={pattern.tracks}
        onVolumeChange={handleVolumeChange}
        onMuteToggle={handleMuteToggle}
        onSoloToggle={handleSoloToggle}
        onTrackNameChange={handleTrackNameChange}
        onTrackColorChange={handleTrackColorChange}
      />
    );

    // Test volume change integration
    const volumeSliders = screen.getAllByRole('slider');
    fireEvent.change(volumeSliders[0], { target: { value: '0.6' } });
    
    expect(handleVolumeChange).toHaveBeenCalledWith('track_0', 0.6);

    // Test mute toggle integration
    const muteButtons = screen.getAllByText(/Mute/);
    fireEvent.click(muteButtons[0]);
    
    expect(handleMuteToggle).toHaveBeenCalledWith('track_0');

    // Test solo toggle integration
    const soloButtons = screen.getAllByText(/Solo/);
    fireEvent.click(soloButtons[0]);
    
    expect(handleSoloToggle).toHaveBeenCalledWith('track_0');

    // Test track name change integration
    const trackNameButton = screen.getByText('Kick');
    fireEvent.click(trackNameButton);
    
    const nameInput = screen.getByDisplayValue('Kick');
    fireEvent.change(nameInput, { target: { value: 'Bass Drum' } });
    fireEvent.blur(nameInput);
    
    await waitFor(() => {
      expect(handleTrackNameChange).toHaveBeenCalledWith('track_0', 'Bass Drum');
    });
  });

  it('should integrate RandomizationControls with PatternManager', () => {
    const handleRandomizationChange = vi.fn((trackId, randomization) => {
      patternManager.setTrackRandomization(trackId, randomization);
    });

    render(
      <RandomizationControls
        tracks={pattern.tracks}
        onRandomizationChange={handleRandomizationChange}
      />
    );

    // Test velocity randomization toggle
    const velocityToggles = screen.getAllByText('Off');
    fireEvent.click(velocityToggles[0]); // First track, velocity toggle
    
    expect(handleRandomizationChange).toHaveBeenCalledWith('track_0', {
      velocity: { enabled: true, amount: 0 },
      timing: { enabled: false, amount: 0 }
    });

    // Test velocity amount change
    const sliders = screen.getAllByRole('slider');
    const velocitySlider = sliders[0]; // First slider should be velocity for first track
    
    fireEvent.change(velocitySlider, { target: { value: '30' } });
    
    // The toggle should have been called first, then the amount change
    expect(handleRandomizationChange).toHaveBeenLastCalledWith('track_0', {
      velocity: { enabled: true, amount: 30 },
      timing: { enabled: false, amount: 0 }
    });
  });

  it('should handle real PatternManager operations', () => {
    // Test actual PatternManager integration without mocks
    const initialVolume = pattern.tracks[0].volume;
    
    // Change volume through PatternManager
    patternManager.setTrackVolume('track_0', 0.5);
    const updatedPattern = patternManager.getCurrentPattern();
    
    expect(updatedPattern.tracks[0].volume).toBe(0.5);
    expect(updatedPattern.tracks[0].volume).not.toBe(initialVolume);

    // Test mute toggle
    const initialMute = updatedPattern.tracks[0].mute;
    patternManager.toggleTrackMute('track_0');
    const muteToggledPattern = patternManager.getCurrentPattern();
    
    expect(muteToggledPattern.tracks[0].mute).toBe(!initialMute);

    // Test randomization settings
    const randomization = {
      velocity: { enabled: true, amount: 25 },
      timing: { enabled: false, amount: 10 }
    };
    
    patternManager.setTrackRandomization('track_0', randomization);
    const randomizedPattern = patternManager.getCurrentPattern();
    
    expect(randomizedPattern.tracks[0].randomization).toEqual(randomization);
  });

  it('should handle track control state updates correctly', () => {
    let currentTracks = [...pattern.tracks];
    
    const handleVolumeChange = (trackId, volume) => {
      patternManager.setTrackVolume(trackId, volume);
      currentTracks = patternManager.getCurrentPattern().tracks;
    };

    const handleMuteToggle = (trackId) => {
      patternManager.toggleTrackMute(trackId);
      currentTracks = patternManager.getCurrentPattern().tracks;
    };

    const { rerender } = render(
      <TrackControls
        tracks={currentTracks}
        onVolumeChange={handleVolumeChange}
        onMuteToggle={handleMuteToggle}
        onSoloToggle={vi.fn()}
        onTrackNameChange={vi.fn()}
        onTrackColorChange={vi.fn()}
      />
    );

    // Initial state
    expect(screen.getAllByText('80%')).toHaveLength(3); // All tracks have default volume
    expect(screen.getAllByText('Mute')).toHaveLength(3); // All tracks not muted

    // Change volume
    const volumeSlider = screen.getAllByRole('slider')[0];
    fireEvent.change(volumeSlider, { target: { value: '0.3' } });

    // Re-render with updated tracks
    rerender(
      <TrackControls
        tracks={currentTracks}
        onVolumeChange={handleVolumeChange}
        onMuteToggle={handleMuteToggle}
        onSoloToggle={vi.fn()}
        onTrackNameChange={vi.fn()}
        onTrackColorChange={vi.fn()}
      />
    );

    // Should show updated volume
    expect(screen.getByText('30%')).toBeInTheDocument();

    // Toggle mute
    const muteButton = screen.getAllByText(/Mute/)[0];
    fireEvent.click(muteButton);

    // Re-render with updated tracks
    rerender(
      <TrackControls
        tracks={currentTracks}
        onVolumeChange={handleVolumeChange}
        onMuteToggle={handleMuteToggle}
        onSoloToggle={vi.fn()}
        onTrackNameChange={vi.fn()}
        onTrackColorChange={vi.fn()}
      />
    );

    // Should show muted state
    expect(screen.getByText('Muted')).toBeInTheDocument();
  });

  it('should handle randomization state updates correctly', () => {
    let currentTracks = [...pattern.tracks];
    
    const handleRandomizationChange = (trackId, randomization) => {
      patternManager.setTrackRandomization(trackId, randomization);
      currentTracks = patternManager.getCurrentPattern().tracks;
    };

    const { rerender } = render(
      <RandomizationControls
        tracks={currentTracks}
        onRandomizationChange={handleRandomizationChange}
      />
    );

    // Initial state - both randomizations should be off
    const offButtons = screen.getAllByText('Off');
    expect(offButtons).toHaveLength(6); // 3 tracks × 2 randomization types

    // Enable velocity randomization for first track
    fireEvent.click(offButtons[0]); // First track, velocity toggle

    // Re-render with updated tracks
    rerender(
      <RandomizationControls
        tracks={currentTracks}
        onRandomizationChange={handleRandomizationChange}
      />
    );

    // Should show one 'On' button now
    expect(screen.getAllByText('On')).toHaveLength(1);
    expect(screen.getAllByText('Off')).toHaveLength(5);

    // Should show humanization active message
    expect(screen.getByText('Velocity humanization active')).toBeInTheDocument();
  });

  it('should validate error handling in integration', () => {
    const handleVolumeChange = vi.fn((trackId, volume) => {
      try {
        patternManager.setTrackVolume(trackId, volume);
      } catch (error) {
        console.error('Volume change error:', error);
      }
    });

    render(
      <TrackControls
        tracks={pattern.tracks}
        onVolumeChange={handleVolumeChange}
        onMuteToggle={vi.fn()}
        onSoloToggle={vi.fn()}
        onTrackNameChange={vi.fn()}
        onTrackColorChange={vi.fn()}
      />
    );

    // Test invalid volume (should be handled gracefully)
    const volumeSlider = screen.getAllByRole('slider')[0];
    fireEvent.change(volumeSlider, { target: { value: '2.0' } }); // Invalid volume > 1.0

    // The slider will clamp the value to max="1", so it should be 1.0
    expect(handleVolumeChange).toHaveBeenCalledWith('track_0', 1.0);
    // The error should be caught and logged, not crash the component
  });
});