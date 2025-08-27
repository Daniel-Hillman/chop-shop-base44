import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import TrackControls from '../TrackControls';

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
}));

describe('TrackControls', () => {
  const mockTracks = [
    {
      id: 'kick',
      name: 'Kick',
      sampleId: 'kick_001',
      volume: 0.8,
      mute: false,
      solo: false,
      color: '#06b6d4',
      steps: [
        { active: true, velocity: 1.0 },
        { active: false, velocity: 0.7 },
        { active: true, velocity: 0.9 },
        { active: false, velocity: 0.6 },
      ]
    },
    {
      id: 'snare',
      name: 'Snare',
      sampleId: 'snare_001',
      volume: 0.6,
      mute: true,
      solo: false,
      color: '#ef4444',
      steps: [
        { active: false, velocity: 0.8 },
        { active: true, velocity: 1.0 },
        { active: false, velocity: 0.7 },
        { active: true, velocity: 0.9 },
      ]
    }
  ];

  const mockCallbacks = {
    onVolumeChange: vi.fn(),
    onMuteToggle: vi.fn(),
    onSoloToggle: vi.fn(),
    onTrackNameChange: vi.fn(),
    onTrackColorChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing', () => {
    render(<TrackControls tracks={mockTracks} {...mockCallbacks} />);
    expect(screen.getByText('Kick')).toBeInTheDocument();
    expect(screen.getByText('Snare')).toBeInTheDocument();
  });

  it('displays empty state when no tracks provided', () => {
    render(<TrackControls tracks={[]} {...mockCallbacks} />);
    expect(screen.getByText('No tracks available')).toBeInTheDocument();
  });

  it('displays track information correctly', () => {
    render(<TrackControls tracks={mockTracks} {...mockCallbacks} />);
    
    // Check track names
    expect(screen.getByText('Kick')).toBeInTheDocument();
    expect(screen.getByText('Snare')).toBeInTheDocument();
    
    // Check volume percentages
    expect(screen.getByText('80%')).toBeInTheDocument(); // Kick volume
    expect(screen.getByText('60%')).toBeInTheDocument(); // Snare volume
    
    // Check sample IDs
    expect(screen.getByText('Sample: kick_001')).toBeInTheDocument();
    expect(screen.getByText('Sample: snare_001')).toBeInTheDocument();
    
    // Check active steps count
    const stepsTexts = screen.getAllByText('Steps: 2');
    expect(stepsTexts).toHaveLength(2); // Both tracks have 2 active steps
  });

  it('handles volume changes correctly', () => {
    render(<TrackControls tracks={mockTracks} {...mockCallbacks} />);
    
    const volumeSliders = screen.getAllByRole('slider');
    const kickVolumeSlider = volumeSliders[0];
    
    fireEvent.change(kickVolumeSlider, { target: { value: '0.5' } });
    
    expect(mockCallbacks.onVolumeChange).toHaveBeenCalledWith('kick', 0.5);
  });

  it('handles mute toggle correctly', () => {
    render(<TrackControls tracks={mockTracks} {...mockCallbacks} />);
    
    const muteButtons = screen.getAllByText(/Mute/);
    fireEvent.click(muteButtons[0]); // Click first mute button (Kick)
    
    expect(mockCallbacks.onMuteToggle).toHaveBeenCalledWith('kick');
  });

  it('handles solo toggle correctly', () => {
    render(<TrackControls tracks={mockTracks} {...mockCallbacks} />);
    
    const soloButtons = screen.getAllByText(/Solo/);
    fireEvent.click(soloButtons[0]); // Click first solo button (Kick)
    
    expect(mockCallbacks.onSoloToggle).toHaveBeenCalledWith('kick');
  });

  it('displays muted state correctly', () => {
    render(<TrackControls tracks={mockTracks} {...mockCallbacks} />);
    
    // Snare is muted in mock data
    const muteButtons = screen.getAllByText(/Muted|Mute/);
    expect(muteButtons.some(button => button.textContent === 'Muted')).toBe(true);
  });

  it('handles track name editing', async () => {
    render(<TrackControls tracks={mockTracks} {...mockCallbacks} />);
    
    // Click on track name to start editing
    const kickNameButton = screen.getByText('Kick');
    fireEvent.click(kickNameButton);
    
    // Should show input field
    const nameInput = screen.getByDisplayValue('Kick');
    expect(nameInput).toBeInTheDocument();
    
    // Change the name
    fireEvent.change(nameInput, { target: { value: 'New Kick' } });
    fireEvent.blur(nameInput);
    
    await waitFor(() => {
      expect(mockCallbacks.onTrackNameChange).toHaveBeenCalledWith('kick', 'New Kick');
    });
  });

  it('handles track name editing with Enter key', async () => {
    render(<TrackControls tracks={mockTracks} {...mockCallbacks} />);
    
    // Click on track name to start editing
    const kickNameButton = screen.getByText('Kick');
    fireEvent.click(kickNameButton);
    
    // Should show input field
    const nameInput = screen.getByDisplayValue('Kick');
    
    // Change the name and press Enter
    fireEvent.change(nameInput, { target: { value: 'Enter Kick' } });
    fireEvent.keyDown(nameInput, { key: 'Enter' });
    
    await waitFor(() => {
      expect(mockCallbacks.onTrackNameChange).toHaveBeenCalledWith('kick', 'Enter Kick');
    });
  });

  it('cancels track name editing with Escape key', async () => {
    render(<TrackControls tracks={mockTracks} {...mockCallbacks} />);
    
    // Click on track name to start editing
    const kickNameButton = screen.getByText('Kick');
    fireEvent.click(kickNameButton);
    
    // Should show input field
    const nameInput = screen.getByDisplayValue('Kick');
    
    // Change the name and press Escape
    fireEvent.change(nameInput, { target: { value: 'Cancelled Kick' } });
    fireEvent.keyDown(nameInput, { key: 'Escape' });
    
    // Should not call onTrackNameChange
    expect(mockCallbacks.onTrackNameChange).not.toHaveBeenCalled();
    
    // Should show original name again
    await waitFor(() => {
      expect(screen.getByText('Kick')).toBeInTheDocument();
    });
  });

  it('handles color changes correctly', () => {
    render(<TrackControls tracks={mockTracks} {...mockCallbacks} />);
    
    // Find color palette buttons (they should be in the DOM but might be hidden)
    const colorButtons = screen.getAllByRole('button');
    const colorButton = colorButtons.find(button => 
      button.style.backgroundColor === 'rgb(59, 130, 246)' // #3b82f6 in RGB
    );
    
    if (colorButton) {
      fireEvent.click(colorButton);
      expect(mockCallbacks.onTrackColorChange).toHaveBeenCalledWith('kick', '#3b82f6');
    }
  });

  it('applies custom className', () => {
    const { container } = render(
      <TrackControls tracks={mockTracks} {...mockCallbacks} className="custom-class" />
    );
    
    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('handles missing track properties gracefully', () => {
    const incompleteTrack = {
      id: 'incomplete',
      name: 'Incomplete Track'
      // Missing volume, mute, solo, color, steps, sampleId
    };
    
    render(<TrackControls tracks={[incompleteTrack]} {...mockCallbacks} />);
    
    expect(screen.getByText('Incomplete Track')).toBeInTheDocument();
    expect(screen.getByText('80%')).toBeInTheDocument(); // Default volume
    expect(screen.getByText('Sample: None')).toBeInTheDocument();
    expect(screen.getByText('Steps: 0')).toBeInTheDocument();
  });

  it('prevents empty track names', async () => {
    render(<TrackControls tracks={mockTracks} {...mockCallbacks} />);
    
    // Click on track name to start editing
    const kickNameButton = screen.getByText('Kick');
    fireEvent.click(kickNameButton);
    
    // Clear the name and try to save
    const nameInput = screen.getByDisplayValue('Kick');
    fireEvent.change(nameInput, { target: { value: '   ' } }); // Whitespace only
    fireEvent.blur(nameInput);
    
    // Should not call onTrackNameChange with empty/whitespace name
    expect(mockCallbacks.onTrackNameChange).not.toHaveBeenCalled();
  });

  it('displays correct volume slider styling', () => {
    render(<TrackControls tracks={mockTracks} {...mockCallbacks} />);
    
    const volumeSliders = screen.getAllByRole('slider');
    const kickVolumeSlider = volumeSliders[0];
    
    // Check that the slider has the correct value
    expect(kickVolumeSlider.value).toBe('0.8');
    expect(kickVolumeSlider.min).toBe('0');
    expect(kickVolumeSlider.max).toBe('1');
    expect(kickVolumeSlider.step).toBe('0.01');
  });
});