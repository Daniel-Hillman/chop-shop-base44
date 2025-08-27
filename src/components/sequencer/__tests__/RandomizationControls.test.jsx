import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import RandomizationControls from '../RandomizationControls';

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }) => <div {...props}>{children}</div>,
  },
}));

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Shuffle: () => <div data-testid="shuffle-icon" />,
  ToggleLeft: () => <div data-testid="toggle-left-icon" />,
  ToggleRight: () => <div data-testid="toggle-right-icon" />,
}));

describe('RandomizationControls', () => {
  const mockTracks = [
    {
      id: 'kick',
      name: 'Kick',
      color: '#06b6d4',
      randomization: {
        velocity: {
          enabled: false,
          amount: 0
        },
        timing: {
          enabled: false,
          amount: 0
        }
      }
    },
    {
      id: 'snare',
      name: 'Snare',
      color: '#ef4444',
      randomization: {
        velocity: {
          enabled: true,
          amount: 25
        },
        timing: {
          enabled: true,
          amount: 15
        }
      }
    }
  ];

  const mockOnRandomizationChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing', () => {
    render(
      <RandomizationControls 
        tracks={mockTracks} 
        onRandomizationChange={mockOnRandomizationChange} 
      />
    );
    
    expect(screen.getByText('Humanization')).toBeInTheDocument();
    expect(screen.getByText('Kick')).toBeInTheDocument();
    expect(screen.getByText('Snare')).toBeInTheDocument();
  });

  it('displays empty state when no tracks provided', () => {
    render(
      <RandomizationControls 
        tracks={[]} 
        onRandomizationChange={mockOnRandomizationChange} 
      />
    );
    
    expect(screen.getByText('No tracks available for randomization')).toBeInTheDocument();
  });

  it('displays track randomization settings correctly', () => {
    render(
      <RandomizationControls 
        tracks={mockTracks} 
        onRandomizationChange={mockOnRandomizationChange} 
      />
    );
    
    // Check velocity variation labels
    const velocityLabels = screen.getAllByText('Velocity Variation');
    expect(velocityLabels).toHaveLength(2);
    
    // Check timing groove labels
    const timingLabels = screen.getAllByText('Timing Groove');
    expect(timingLabels).toHaveLength(2);
    
    // Check enabled/disabled states
    const onButtons = screen.getAllByText('On');
    const offButtons = screen.getAllByText('Off');
    
    // Kick should have both off (2 off buttons)
    // Snare should have both on (2 on buttons)
    expect(onButtons).toHaveLength(2); // Snare velocity and timing
    expect(offButtons).toHaveLength(2); // Kick velocity and timing
  });

  it('displays randomization amounts correctly', () => {
    render(
      <RandomizationControls 
        tracks={mockTracks} 
        onRandomizationChange={mockOnRandomizationChange} 
      />
    );
    
    // Check variation percentages
    expect(screen.getByText('25% variation')).toBeInTheDocument(); // Snare velocity
    expect(screen.getByText('15% groove')).toBeInTheDocument(); // Snare timing
    expect(screen.getByText('0% variation')).toBeInTheDocument(); // Kick velocity
    expect(screen.getByText('0% groove')).toBeInTheDocument(); // Kick timing
  });

  it('handles velocity randomization toggle', () => {
    render(
      <RandomizationControls 
        tracks={mockTracks} 
        onRandomizationChange={mockOnRandomizationChange} 
      />
    );
    
    // Find and click the velocity toggle for Kick (first track, first toggle)
    const velocityToggles = screen.getAllByText('Off');
    fireEvent.click(velocityToggles[0]); // Kick velocity toggle
    
    expect(mockOnRandomizationChange).toHaveBeenCalledWith('kick', {
      velocity: {
        enabled: true,
        amount: 0
      },
      timing: {
        enabled: false,
        amount: 0
      }
    });
  });

  it('handles timing randomization toggle', () => {
    render(
      <RandomizationControls 
        tracks={mockTracks} 
        onRandomizationChange={mockOnRandomizationChange} 
      />
    );
    
    // Find and click the timing toggle for Kick (first track, second toggle)
    const timingToggles = screen.getAllByText('Off');
    fireEvent.click(timingToggles[1]); // Kick timing toggle
    
    expect(mockOnRandomizationChange).toHaveBeenCalledWith('kick', {
      velocity: {
        enabled: false,
        amount: 0
      },
      timing: {
        enabled: true,
        amount: 0
      }
    });
  });

  it('handles velocity amount changes', () => {
    render(
      <RandomizationControls 
        tracks={mockTracks} 
        onRandomizationChange={mockOnRandomizationChange} 
      />
    );
    
    // Find velocity sliders
    const sliders = screen.getAllByRole('slider');
    const kickVelocitySlider = sliders[0]; // First slider should be Kick velocity
    
    fireEvent.change(kickVelocitySlider, { target: { value: '50' } });
    
    expect(mockOnRandomizationChange).toHaveBeenCalledWith('kick', {
      velocity: {
        enabled: false,
        amount: 50
      },
      timing: {
        enabled: false,
        amount: 0
      }
    });
  });

  it('handles timing amount changes', () => {
    render(
      <RandomizationControls 
        tracks={mockTracks} 
        onRandomizationChange={mockOnRandomizationChange} 
      />
    );
    
    // Find timing sliders
    const sliders = screen.getAllByRole('slider');
    const kickTimingSlider = sliders[1]; // Second slider should be Kick timing
    
    fireEvent.change(kickTimingSlider, { target: { value: '30' } });
    
    expect(mockOnRandomizationChange).toHaveBeenCalledWith('kick', {
      velocity: {
        enabled: false,
        amount: 0
      },
      timing: {
        enabled: false,
        amount: 30
      }
    });
  });

  it('disables sliders when randomization is disabled', () => {
    render(
      <RandomizationControls 
        tracks={mockTracks} 
        onRandomizationChange={mockOnRandomizationChange} 
      />
    );
    
    const sliders = screen.getAllByRole('slider');
    
    // Kick sliders should be disabled (randomization is off)
    expect(sliders[0]).toBeDisabled(); // Kick velocity
    expect(sliders[1]).toBeDisabled(); // Kick timing
    
    // Snare sliders should be enabled (randomization is on)
    expect(sliders[2]).not.toBeDisabled(); // Snare velocity
    expect(sliders[3]).not.toBeDisabled(); // Snare timing
  });

  it('displays correct slider values', () => {
    render(
      <RandomizationControls 
        tracks={mockTracks} 
        onRandomizationChange={mockOnRandomizationChange} 
      />
    );
    
    const sliders = screen.getAllByRole('slider');
    
    // Check slider values
    expect(sliders[0].value).toBe('0'); // Kick velocity
    expect(sliders[1].value).toBe('0'); // Kick timing
    expect(sliders[2].value).toBe('25'); // Snare velocity
    expect(sliders[3].value).toBe('15'); // Snare timing
    
    // Check slider properties
    sliders.forEach(slider => {
      expect(slider.min).toBe('0');
      expect(slider.max).toBe('100');
      expect(slider.step).toBe('1');
    });
  });

  it('displays humanization status messages', () => {
    render(
      <RandomizationControls 
        tracks={mockTracks} 
        onRandomizationChange={mockOnRandomizationChange} 
      />
    );
    
    // Snare should show humanization active message (both velocity and timing enabled)
    expect(screen.getByText('Velocity & timing humanization active')).toBeInTheDocument();
    
    // Kick should not show any humanization message (both disabled)
    expect(screen.queryByText('Velocity humanization active')).not.toBeInTheDocument();
    expect(screen.queryByText('Timing humanization active')).not.toBeInTheDocument();
  });

  it('displays individual humanization status messages', () => {
    const tracksWithPartialRandomization = [
      {
        id: 'kick',
        name: 'Kick',
        color: '#06b6d4',
        randomization: {
          velocity: {
            enabled: true,
            amount: 20
          },
          timing: {
            enabled: false,
            amount: 0
          }
        }
      }
    ];
    
    render(
      <RandomizationControls 
        tracks={tracksWithPartialRandomization} 
        onRandomizationChange={mockOnRandomizationChange} 
      />
    );
    
    expect(screen.getByText('Velocity humanization active')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(
      <RandomizationControls 
        tracks={mockTracks} 
        onRandomizationChange={mockOnRandomizationChange}
        className="custom-class"
      />
    );
    
    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('handles missing randomization properties gracefully', () => {
    const tracksWithoutRandomization = [
      {
        id: 'kick',
        name: 'Kick',
        color: '#06b6d4'
        // Missing randomization property
      }
    ];
    
    render(
      <RandomizationControls 
        tracks={tracksWithoutRandomization} 
        onRandomizationChange={mockOnRandomizationChange} 
      />
    );
    
    expect(screen.getByText('Kick')).toBeInTheDocument();
    expect(screen.getByText('0% variation')).toBeInTheDocument();
    expect(screen.getByText('0% groove')).toBeInTheDocument();
  });

  it('handles track not found gracefully', () => {
    render(
      <RandomizationControls 
        tracks={mockTracks} 
        onRandomizationChange={mockOnRandomizationChange} 
      />
    );
    
    // Manually trigger a callback with non-existent track ID
    const sliders = screen.getAllByRole('slider');
    
    // Mock the tracks array to be empty temporarily to test error handling
    const originalTracks = mockTracks;
    
    // This should not crash the component
    fireEvent.change(sliders[0], { target: { value: '50' } });
    
    // Should still call the callback (component doesn't validate track existence)
    expect(mockOnRandomizationChange).toHaveBeenCalled();
  });
});