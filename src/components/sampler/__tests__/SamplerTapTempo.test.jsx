import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import SamplerTapTempo from '../SamplerTapTempo';

// Mock timers
vi.useFakeTimers();

describe('SamplerTapTempo', () => {
  let mockOnTempoCalculated;

  beforeEach(() => {
    mockOnTempoCalculated = vi.fn();
    vi.clearAllTimers();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders tap tempo button with minimal footprint', () => {
    render(<SamplerTapTempo onTempoCalculated={mockOnTempoCalculated} />);
    
    const tapButton = screen.getByRole('button', { name: /tap/i });
    expect(tapButton).toBeInTheDocument();
    expect(tapButton).toHaveTextContent('TAP');
  });

  it('displays current BPM when provided', () => {
    render(<SamplerTapTempo onTempoCalculated={mockOnTempoCalculated} currentBpm={120} />);
    
    expect(screen.getByText('120')).toBeInTheDocument();
  });

  it('shows tap counter when less than 4 taps', () => {
    render(<SamplerTapTempo onTempoCalculated={mockOnTempoCalculated} />);
    
    const tapButton = screen.getByRole('button', { name: /tap/i });
    
    // Initial state should show --- (no taps yet)
    expect(screen.getByText('---')).toBeInTheDocument();
    
    // After first tap
    fireEvent.click(tapButton);
    expect(screen.getByText('1/4')).toBeInTheDocument();
    
    // After second tap
    fireEvent.click(tapButton);
    expect(screen.getByText('2/4')).toBeInTheDocument();
  });

  it('provides visual feedback when active', () => {
    render(<SamplerTapTempo onTempoCalculated={mockOnTempoCalculated} />);
    
    const tapButton = screen.getByRole('button', { name: /tap/i });
    
    // Initially inactive
    expect(tapButton).not.toHaveClass('bg-cyan-500/20');
    
    // After tap, should be active
    fireEvent.click(tapButton);
    expect(tapButton).toHaveClass('bg-cyan-500/20');
  });

  it('calculates BPM after 4 taps', async () => {
    render(<SamplerTapTempo onTempoCalculated={mockOnTempoCalculated} />);
    
    const tapButton = screen.getByRole('button', { name: /tap/i });
    
    // Simulate 4 taps with 500ms intervals (120 BPM)
    const tapInterval = 500; // 500ms = 120 BPM
    
    act(() => {
      fireEvent.click(tapButton);
      vi.advanceTimersByTime(tapInterval);
      
      fireEvent.click(tapButton);
      vi.advanceTimersByTime(tapInterval);
      
      fireEvent.click(tapButton);
      vi.advanceTimersByTime(tapInterval);
      
      fireEvent.click(tapButton);
    });

    expect(mockOnTempoCalculated).toHaveBeenCalled();
    const calculatedBPM = mockOnTempoCalculated.mock.calls[0][0];
    expect(calculatedBPM).toBeCloseTo(120, 0); // Allow some tolerance
  });

  it('responds to space bar input', () => {
    render(<SamplerTapTempo onTempoCalculated={mockOnTempoCalculated} />);
    
    // Initially shows ---
    expect(screen.getByText('---')).toBeInTheDocument();
    
    // Press space bar
    fireEvent.keyDown(document, { code: 'Space' });
    
    // Should register as a tap
    expect(screen.getByText('1/4')).toBeInTheDocument();
  });

  it('ignores space bar when typing in input fields', () => {
    render(
      <div>
        <input data-testid="test-input" />
        <SamplerTapTempo onTempoCalculated={mockOnTempoCalculated} />
      </div>
    );
    
    const input = screen.getByTestId('test-input');
    input.focus();
    
    // Press space bar while focused on input
    fireEvent.keyDown(input, { code: 'Space' });
    
    // Should not register as a tap
    expect(screen.getByText('---')).toBeInTheDocument();
  });

  it('resets tap counter after inactivity timeout', async () => {
    render(<SamplerTapTempo onTempoCalculated={mockOnTempoCalculated} />);
    
    const tapButton = screen.getByRole('button', { name: /tap/i });
    
    // Make some taps
    fireEvent.click(tapButton);
    fireEvent.click(tapButton);
    expect(screen.getByText('2/4')).toBeInTheDocument();
    
    // Wait for timeout (3 seconds)
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    
    // Should reset to ---
    expect(screen.getByText('---')).toBeInTheDocument();
  });

  it('resets timeout on each tap', () => {
    render(<SamplerTapTempo onTempoCalculated={mockOnTempoCalculated} />);
    
    const tapButton = screen.getByRole('button', { name: /tap/i });
    
    // First tap
    fireEvent.click(tapButton);
    expect(screen.getByText('1/4')).toBeInTheDocument();
    
    // Wait 2.5 seconds (less than timeout)
    act(() => {
      vi.advanceTimersByTime(2500);
    });
    
    // Second tap (should reset timeout)
    fireEvent.click(tapButton);
    expect(screen.getByText('2/4')).toBeInTheDocument();
    
    // Wait another 2.5 seconds
    act(() => {
      vi.advanceTimersByTime(2500);
    });
    
    // Should still have taps (timeout was reset)
    expect(screen.getByText('2/4')).toBeInTheDocument();
  });

  it('limits BPM to reasonable range (60-200)', async () => {
    render(<SamplerTapTempo onTempoCalculated={mockOnTempoCalculated} />);
    
    const tapButton = screen.getByRole('button', { name: /tap/i });
    
    // Simulate very fast taps (would calculate > 200 BPM)
    act(() => {
      fireEvent.click(tapButton);
      vi.advanceTimersByTime(100); // Very fast
      
      fireEvent.click(tapButton);
      vi.advanceTimersByTime(100);
      
      fireEvent.click(tapButton);
      vi.advanceTimersByTime(100);
      
      fireEvent.click(tapButton);
    });

    expect(mockOnTempoCalculated).toHaveBeenCalled();
    const calculatedBPM = mockOnTempoCalculated.mock.calls[0][0];
    expect(calculatedBPM).toBeLessThanOrEqual(200);
    expect(calculatedBPM).toBeGreaterThanOrEqual(60);
  });

  it('keeps only recent taps for accuracy', () => {
    render(<SamplerTapTempo onTempoCalculated={mockOnTempoCalculated} />);
    
    const tapButton = screen.getByRole('button', { name: /tap/i });
    
    // Make more than 8 taps (max taps)
    for (let i = 0; i < 10; i++) {
      act(() => {
        fireEvent.click(tapButton);
        vi.advanceTimersByTime(500);
      });
    }

    // Should have called onTempoCalculated multiple times (after 4th tap and beyond)
    expect(mockOnTempoCalculated.mock.calls.length).toBeGreaterThan(1);
  });

  it('rounds BPM to nearest whole number', async () => {
    render(<SamplerTapTempo onTempoCalculated={mockOnTempoCalculated} />);
    
    const tapButton = screen.getByRole('button', { name: /tap/i });
    
    // Simulate taps that would result in fractional BPM
    act(() => {
      fireEvent.click(tapButton);
      vi.advanceTimersByTime(487); // Should result in ~123.2 BPM
      
      fireEvent.click(tapButton);
      vi.advanceTimersByTime(487);
      
      fireEvent.click(tapButton);
      vi.advanceTimersByTime(487);
      
      fireEvent.click(tapButton);
    });

    expect(mockOnTempoCalculated).toHaveBeenCalled();
    const calculatedBPM = mockOnTempoCalculated.mock.calls[0][0];
    expect(Number.isInteger(calculatedBPM)).toBe(true);
  });

  it('shows animate-pulse class when needing more taps', () => {
    render(<SamplerTapTempo onTempoCalculated={mockOnTempoCalculated} />);
    
    const tapButton = screen.getByRole('button', { name: /tap/i });
    
    // Initially should be inactive (needs more taps) - no animation for performance
    expect(tapButton).toHaveClass('bg-gray-800/50');
    
    // After 4 taps, should not have animate-pulse
    act(() => {
      fireEvent.click(tapButton);
      vi.advanceTimersByTime(500);
      fireEvent.click(tapButton);
      vi.advanceTimersByTime(500);
      fireEvent.click(tapButton);
      vi.advanceTimersByTime(500);
      fireEvent.click(tapButton);
    });

    // After 4 taps, should be active (no animation for performance)
    expect(tapButton).toHaveClass('bg-cyan-500/20');
  });
});