import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import SequencerStep from '../SequencerStep';

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    button: ({ children, ...props }) => <button {...props}>{children}</button>,
    div: ({ children, ...props }) => <div {...props}>{children}</div>
  },
  AnimatePresence: ({ children }) => <>{children}</>
}));

describe('SequencerStep', () => {
  const defaultProps = {
    trackId: 'kick',
    stepIndex: 0,
    step: { active: false, velocity: 0.8 },
    trackColor: '#ef4444',
    isActive: false,
    isSelected: false,
    isCurrentStep: false,
    isHovered: false,
    velocity: 0.8,
    onToggle: vi.fn(),
    onSelect: vi.fn(),
    onVelocityChange: vi.fn(),
    onHover: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  it('renders without crashing', () => {
    render(<SequencerStep {...defaultProps} />);
    
    const stepButton = screen.getByRole('button');
    expect(stepButton).toBeInTheDocument();
  });

  it('displays correct title with step information', () => {
    render(<SequencerStep {...defaultProps} />);
    
    const stepButton = screen.getByRole('button');
    expect(stepButton).toHaveAttribute('title', 'kick - Step 1');
  });

  it('shows velocity in title when step is active', () => {
    const activeProps = {
      ...defaultProps,
      isActive: true,
      step: { active: true, velocity: 0.8 }
    };

    render(<SequencerStep {...activeProps} />);
    
    const stepButton = screen.getByRole('button');
    expect(stepButton).toHaveAttribute('title', 'kick - Step 1 (Velocity: 80%)');
  });

  it('calls onToggle when clicked', () => {
    const mockOnToggle = vi.fn();
    
    render(<SequencerStep {...defaultProps} onToggle={mockOnToggle} />);
    
    const stepButton = screen.getByRole('button');
    fireEvent.click(stepButton);
    
    expect(mockOnToggle).toHaveBeenCalledWith('kick', 0);
  });

  it('calls onSelect when shift+clicked', () => {
    const mockOnSelect = vi.fn();
    
    render(<SequencerStep {...defaultProps} onSelect={mockOnSelect} />);
    
    const stepButton = screen.getByRole('button');
    fireEvent.click(stepButton, { shiftKey: true });
    
    expect(mockOnSelect).toHaveBeenCalledWith('kick', 0, true);
  });

  it('calls onHover when mouse enters and leaves', () => {
    const mockOnHover = vi.fn();
    
    render(<SequencerStep {...defaultProps} onHover={mockOnHover} />);
    
    const stepButton = screen.getByRole('button');
    
    fireEvent.mouseEnter(stepButton);
    expect(mockOnHover).toHaveBeenCalledWith('kick-0');
    
    fireEvent.mouseLeave(stepButton);
    expect(mockOnHover).toHaveBeenCalledWith(null);
  });

  it('opens velocity editor on right-click for active steps', async () => {
    const activeProps = {
      ...defaultProps,
      isActive: true,
      step: { active: true, velocity: 0.8 }
    };

    render(<SequencerStep {...activeProps} />);
    
    const stepButton = screen.getByRole('button');
    fireEvent.contextMenu(stepButton);
    
    await waitFor(() => {
      expect(screen.getByText('Velocity: 80%')).toBeInTheDocument();
      expect(screen.getByRole('slider')).toBeInTheDocument();
    });
  });

  it('opens velocity editor on double-click for active steps', async () => {
    const activeProps = {
      ...defaultProps,
      isActive: true,
      step: { active: true, velocity: 0.8 }
    };

    render(<SequencerStep {...activeProps} />);
    
    const stepButton = screen.getByRole('button');
    fireEvent.doubleClick(stepButton);
    
    await waitFor(() => {
      expect(screen.getByText('Velocity: 80%')).toBeInTheDocument();
      expect(screen.getByRole('slider')).toBeInTheDocument();
    });
  });

  it('does not open velocity editor for inactive steps', () => {
    render(<SequencerStep {...defaultProps} />);
    
    const stepButton = screen.getByRole('button');
    fireEvent.contextMenu(stepButton);
    
    expect(screen.queryByText('Velocity:')).not.toBeInTheDocument();
  });

  it('changes velocity when slider is moved', async () => {
    vi.useFakeTimers();
    const mockOnVelocityChange = vi.fn();
    
    const activeProps = {
      ...defaultProps,
      isActive: true,
      step: { active: true, velocity: 0.8 },
      onVelocityChange: mockOnVelocityChange
    };

    render(<SequencerStep {...activeProps} />);
    
    const stepButton = screen.getByRole('button');
    fireEvent.contextMenu(stepButton);
    
    await waitFor(() => {
      const slider = screen.getByRole('slider');
      fireEvent.change(slider, { target: { value: '0.6' } });
      
      // Fast-forward past debounce delay
      vi.advanceTimersByTime(150);
      
      expect(mockOnVelocityChange).toHaveBeenCalledWith('kick', 0, 0.6);
    });
    
    vi.useRealTimers();
  });

  it('closes velocity editor when close button is clicked', async () => {
    const activeProps = {
      ...defaultProps,
      isActive: true,
      step: { active: true, velocity: 0.8 }
    };

    render(<SequencerStep {...activeProps} />);
    
    const stepButton = screen.getByRole('button');
    fireEvent.contextMenu(stepButton);
    
    await waitFor(() => {
      const closeButton = screen.getByText('×');
      fireEvent.click(closeButton);
      
      expect(screen.queryByText('Velocity: 80%')).not.toBeInTheDocument();
    });
  });

  it('closes velocity editor when clicking outside', async () => {
    const activeProps = {
      ...defaultProps,
      isActive: true,
      step: { active: true, velocity: 0.8 }
    };

    render(<SequencerStep {...activeProps} />);
    
    const stepButton = screen.getByRole('button');
    fireEvent.contextMenu(stepButton);
    
    await waitFor(() => {
      expect(screen.getByText('Velocity: 80%')).toBeInTheDocument();
      
      // Click outside (on the overlay)
      const overlay = document.querySelector('.fixed.inset-0');
      if (overlay) {
        fireEvent.click(overlay);
      }
      
      expect(screen.queryByText('Velocity: 80%')).not.toBeInTheDocument();
    });
  });

  it('handles keyboard shortcuts in velocity editor', async () => {
    const activeProps = {
      ...defaultProps,
      isActive: true,
      step: { active: true, velocity: 0.8 }
    };

    render(<SequencerStep {...activeProps} />);
    
    const stepButton = screen.getByRole('button');
    fireEvent.contextMenu(stepButton);
    
    await waitFor(() => {
      expect(screen.getByText('Velocity: 80%')).toBeInTheDocument();
      
      // Test Escape key
      fireEvent.keyDown(document, { key: 'Escape' });
      expect(screen.queryByText('Velocity: 80%')).not.toBeInTheDocument();
    });
  });

  it('applies correct styling for different states', () => {
    // Test active step
    const activeProps = {
      ...defaultProps,
      isActive: true,
      step: { active: true, velocity: 0.8 }
    };

    const { rerender } = render(<SequencerStep {...activeProps} />);
    let stepButton = screen.getByRole('button');
    
    // Should have track color styling for active steps
    expect(stepButton.style.backgroundColor).toBeTruthy();
    expect(stepButton.style.borderColor).toBe('#ef4444');

    // Test selected step
    rerender(<SequencerStep {...defaultProps} isSelected={true} />);
    stepButton = screen.getByRole('button');
    expect(stepButton).toHaveClass('ring-2', 'ring-cyan-400/50');

    // Test current step
    rerender(<SequencerStep {...defaultProps} isCurrentStep={true} />);
    stepButton = screen.getByRole('button');
    expect(stepButton.style.borderColor).toBe('#06b6d4');
  });

  it('shows velocity indicator for active steps', () => {
    const activeProps = {
      ...defaultProps,
      isActive: true,
      step: { active: true, velocity: 0.8 }
    };

    render(<SequencerStep {...activeProps} />);
    
    // Should show velocity indicator dot
    const velocityIndicator = document.querySelector('.w-2.h-2.rounded-full.bg-white\\/80');
    expect(velocityIndicator).toBeInTheDocument();
  });

  it('shows selection indicator when selected', () => {
    render(<SequencerStep {...defaultProps} isSelected={true} />);
    
    // Should show selection indicator
    const selectionIndicator = document.querySelector('.w-3.h-3.bg-cyan-400.rounded-full');
    expect(selectionIndicator).toBeInTheDocument();
  });
});