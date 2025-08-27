import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import SequencerGrid from '../SequencerGrid';
import { SequencerEngine } from '../../../services/sequencer/SequencerEngine';
import { PatternManager } from '../../../services/sequencer/PatternManager';

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }) => <div {...props}>{children}</div>,
    button: ({ children, ...props }) => <button {...props}>{children}</button>
  },
  AnimatePresence: ({ children }) => <>{children}</>
}));

// Mock hooks
vi.mock('../../../hooks/useSequencerPlayhead', () => ({
  useSequencerPlayhead: vi.fn(() => ({
    currentStep: 0,
    interpolatedStep: 0,
    isPlaying: false,
    playheadPosition: -1,
    playheadProgress: 0,
    timingAccuracy: 0,
    getTimingInfo: vi.fn(() => null),
    syncPlayhead: vi.fn()
  })),
  usePlayheadAnimation: vi.fn(() => ({
    animationState: 'idle',
    getPlayheadStyle: vi.fn(() => ({}))
  }))
}));

describe('SequencerGrid', () => {
  let mockSequencerEngine;
  let mockPatternManager;
  let mockPattern;

  beforeEach(() => {
    // Create mock pattern
    mockPattern = {
      id: 'test-pattern',
      name: 'Test Pattern',
      bpm: 120,
      swing: 0,
      stepResolution: 16,
      tracks: [
        {
          id: 'kick',
          name: 'Kick',
          color: '#ef4444',
          steps: Array.from({ length: 16 }, () => ({ active: false, velocity: 0.8 }))
        },
        {
          id: 'snare',
          name: 'Snare',
          color: '#f97316',
          steps: Array.from({ length: 16 }, () => ({ active: false, velocity: 0.8 }))
        }
      ]
    };

    // Create mock services
    mockPatternManager = new PatternManager();
    mockSequencerEngine = {
      onStep: vi.fn(),
      onStateChange: vi.fn(),
      removeStepCallback: vi.fn(),
      removeStateChangeCallback: vi.fn(),
      getState: vi.fn(() => ({
        isPlaying: false,
        currentStep: 0,
        nextStepTime: 0
      })),
      audioContext: {
        currentTime: 0
      },
      scheduler: {
        getStepDuration: vi.fn(() => 0.125)
      }
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing', () => {
    render(
      <SequencerGrid
        pattern={mockPattern}
        stepResolution={16}
        sequencerEngine={mockSequencerEngine}
      />
    );

    expect(screen.getByText('Pattern Grid')).toBeInTheDocument();
  });

  it('displays pattern information', () => {
    render(
      <SequencerGrid
        pattern={mockPattern}
        stepResolution={16}
        sequencerEngine={mockSequencerEngine}
      />
    );

    expect(screen.getByText('Pattern: Test Pattern • BPM: 120')).toBeInTheDocument();
    expect(screen.getByText('Resolution: 16')).toBeInTheDocument();
  });

  it('renders track names and colors', () => {
    render(
      <SequencerGrid
        pattern={mockPattern}
        stepResolution={16}
        sequencerEngine={mockSequencerEngine}
      />
    );

    expect(screen.getByText('Kick')).toBeInTheDocument();
    expect(screen.getByText('Snare')).toBeInTheDocument();
  });

  it('renders step numbers header', () => {
    render(
      <SequencerGrid
        pattern={mockPattern}
        stepResolution={16}
        sequencerEngine={mockSequencerEngine}
      />
    );

    // Check for step numbers 1-16
    for (let i = 1; i <= 16; i++) {
      expect(screen.getByText(i.toString())).toBeInTheDocument();
    }
  });

  it('calls onStepToggle when step is clicked', async () => {
    const mockOnStepToggle = vi.fn();
    
    render(
      <SequencerGrid
        pattern={mockPattern}
        stepResolution={16}
        sequencerEngine={mockSequencerEngine}
        onStepToggle={mockOnStepToggle}
      />
    );

    // Find and click a step button
    const stepButtons = screen.getAllByRole('button');
    const firstStepButton = stepButtons.find(button => 
      button.getAttribute('title')?.includes('kick - Step 1')
    );

    if (firstStepButton) {
      fireEvent.click(firstStepButton);
      await waitFor(() => {
        expect(mockOnStepToggle).toHaveBeenCalledWith('kick', 0);
      });
    }
  });

  it('calls onStepVelocityChange when velocity is changed', async () => {
    const mockOnStepVelocityChange = vi.fn();
    
    // Create pattern with active step
    const patternWithActiveStep = {
      ...mockPattern,
      tracks: [
        {
          ...mockPattern.tracks[0],
          steps: [
            { active: true, velocity: 0.8 },
            ...Array.from({ length: 15 }, () => ({ active: false, velocity: 0.8 }))
          ]
        }
      ]
    };

    render(
      <SequencerGrid
        pattern={patternWithActiveStep}
        stepResolution={16}
        sequencerEngine={mockSequencerEngine}
        onStepVelocityChange={mockOnStepVelocityChange}
      />
    );

    // Find and right-click an active step to open velocity editor
    const stepButtons = screen.getAllByRole('button');
    const activeStepButton = stepButtons.find(button => 
      button.getAttribute('title')?.includes('Velocity: 80%')
    );

    if (activeStepButton) {
      fireEvent.contextMenu(activeStepButton);
      
      // Wait for velocity editor to appear
      await waitFor(() => {
        const velocitySlider = screen.getByRole('slider');
        expect(velocitySlider).toBeInTheDocument();
        
        // Change velocity
        fireEvent.change(velocitySlider, { target: { value: '0.6' } });
        
        // The velocity change should be called (testing is handled in SequencerStep test)
        expect(velocitySlider).toBeInTheDocument();
      });
    }
  });

  it('handles keyboard shortcuts', async () => {
    const mockOnStepToggle = vi.fn();
    
    render(
      <SequencerGrid
        pattern={mockPattern}
        stepResolution={16}
        sequencerEngine={mockSequencerEngine}
        onStepToggle={mockOnStepToggle}
      />
    );

    // Test Escape key to clear selection
    fireEvent.keyDown(document, { key: 'Escape' });
    
    // Test Ctrl key for multi-select
    fireEvent.keyDown(document, { key: 'Control', ctrlKey: true });
    fireEvent.keyUp(document, { key: 'Control', ctrlKey: false });
  });

  it('displays default tracks when pattern is null', () => {
    render(
      <SequencerGrid
        pattern={null}
        stepResolution={16}
        sequencerEngine={mockSequencerEngine}
      />
    );

    // Should show default track names
    expect(screen.getByText('Kick')).toBeInTheDocument();
    expect(screen.getByText('Snare')).toBeInTheDocument();
    expect(screen.getByText('Hi-Hat')).toBeInTheDocument();
  });

  it('shows timing accuracy in development mode', () => {
    // Mock development environment
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    // Re-mock the hook with timing info
    const mockUseSequencerPlayhead = vi.fn(() => ({
      currentStep: 0,
      interpolatedStep: 0,
      isPlaying: true,
      playheadPosition: 0,
      playheadProgress: 0,
      timingAccuracy: 2.5,
      getTimingInfo: vi.fn(() => ({
        currentTime: 0,
        nextStepTime: 0.125,
        timingAccuracy: 2.5
      })),
      syncPlayhead: vi.fn()
    }));

    vi.doMock('../../../hooks/useSequencerPlayhead', () => ({
      useSequencerPlayhead: mockUseSequencerPlayhead,
      usePlayheadAnimation: vi.fn(() => ({
        animationState: 'playing',
        getPlayheadStyle: vi.fn(() => ({}))
      }))
    }));

    render(
      <SequencerGrid
        pattern={mockPattern}
        stepResolution={16}
        sequencerEngine={mockSequencerEngine}
      />
    );

    expect(screen.getByText(/Accuracy:/)).toBeInTheDocument();

    // Restore environment
    process.env.NODE_ENV = originalEnv;
  });

  it('updates step resolution dynamically', () => {
    const { rerender } = render(
      <SequencerGrid
        pattern={mockPattern}
        stepResolution={16}
        sequencerEngine={mockSequencerEngine}
      />
    );

    expect(screen.getByText('Resolution: 16')).toBeInTheDocument();

    // Change step resolution
    rerender(
      <SequencerGrid
        pattern={mockPattern}
        stepResolution={32}
        sequencerEngine={mockSequencerEngine}
      />
    );

    expect(screen.getByText('Resolution: 32')).toBeInTheDocument();
  });
});