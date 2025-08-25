import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { WaveformErrorBoundary } from '../WaveformErrorBoundary';

// Mock the recovery service
vi.mock('../../../services/WaveformErrorRecoveryService', () => ({
  WaveformErrorRecoveryService: vi.fn().mockImplementation(() => ({
    reportError: vi.fn(),
    attemptRecovery: vi.fn().mockResolvedValue(true)
  }))
}));

// Test component that throws errors
const ThrowError = ({ shouldThrow, errorMessage }) => {
  if (shouldThrow) {
    throw new Error(errorMessage || 'Test error');
  }
  return <div data-testid="success">Component rendered successfully</div>;
};

describe('WaveformErrorBoundary', () => {
  let consoleError;

  beforeEach(() => {
    consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleError.mockRestore();
    vi.clearAllMocks();
  });

  it('renders children when no error occurs', () => {
    render(
      <WaveformErrorBoundary enableAutoRecovery={false}>
        <ThrowError shouldThrow={false} />
      </WaveformErrorBoundary>
    );

    expect(screen.getByTestId('success')).toBeInTheDocument();
  });

  it('catches errors and displays fallback UI', () => {
    render(
      <WaveformErrorBoundary enableAutoRecovery={false}>
        <ThrowError shouldThrow={true} errorMessage="Canvas context error" />
      </WaveformErrorBoundary>
    );

    expect(screen.getByText('Waveform Display Unavailable')).toBeInTheDocument();
    expect(screen.getByText(/Unable to initialize waveform display/)).toBeInTheDocument();
  });

  it('provides user-friendly error messages for canvas errors', () => {
    render(
      <WaveformErrorBoundary enableAutoRecovery={false}>
        <ThrowError shouldThrow={true} errorMessage="Canvas context lost" />
      </WaveformErrorBoundary>
    );

    expect(screen.getByText(/Unable to initialize waveform display/)).toBeInTheDocument();
  });

  it('provides user-friendly error messages for audio errors', () => {
    render(
      <WaveformErrorBoundary enableAutoRecovery={false}>
        <ThrowError shouldThrow={true} errorMessage="Web Audio API not supported" />
      </WaveformErrorBoundary>
    );

    expect(screen.getByText(/Cannot access audio for waveform analysis/)).toBeInTheDocument();
  });

  it('provides user-friendly error messages for memory errors', () => {
    render(
      <WaveformErrorBoundary enableAutoRecovery={false}>
        <ThrowError shouldThrow={true} errorMessage="Memory allocation failed" />
      </WaveformErrorBoundary>
    );

    expect(screen.getByText(/Insufficient memory to generate waveform/)).toBeInTheDocument();
  });

  it('provides user-friendly error messages for network errors', () => {
    render(
      <WaveformErrorBoundary enableAutoRecovery={false}>
        <ThrowError shouldThrow={true} errorMessage="Network fetch failed" />
      </WaveformErrorBoundary>
    );

    expect(screen.getByText(/Network error while loading audio data/)).toBeInTheDocument();
  });

  it('shows retry button for transient errors', () => {
    render(
      <WaveformErrorBoundary enableAutoRecovery={false}>
        <ThrowError shouldThrow={true} errorMessage="Network timeout" />
      </WaveformErrorBoundary>
    );

    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
  });

  it('shows fallback mode button', () => {
    render(
      <WaveformErrorBoundary enableAutoRecovery={false}>
        <ThrowError shouldThrow={true} errorMessage="Test error" />
      </WaveformErrorBoundary>
    );

    expect(screen.getByRole('button', { name: /use simple mode/i })).toBeInTheDocument();
  });

  it('handles manual retry', async () => {
    let shouldThrow = true;
    const TestComponent = () => <ThrowError shouldThrow={shouldThrow} errorMessage="Network error" />;
    
    const { rerender } = render(
      <WaveformErrorBoundary enableAutoRecovery={false}>
        <TestComponent />
      </WaveformErrorBoundary>
    );

    const retryButton = screen.getByRole('button', { name: /retry/i });
    fireEvent.click(retryButton);

    // Simulate successful retry by not throwing error
    shouldThrow = false;
    rerender(
      <WaveformErrorBoundary enableAutoRecovery={false} key="retry">
        <ThrowError shouldThrow={false} />
      </WaveformErrorBoundary>
    );

    await waitFor(() => {
      expect(screen.getByTestId('success')).toBeInTheDocument();
    });
  });

  it('calls onFallbackMode when fallback button is clicked', () => {
    const onFallbackMode = vi.fn();
    
    render(
      <WaveformErrorBoundary onFallbackMode={onFallbackMode}>
        <ThrowError shouldThrow={true} errorMessage="Test error" />
      </WaveformErrorBoundary>
    );

    const fallbackButton = screen.getByRole('button', { name: /use simple mode/i });
    fireEvent.click(fallbackButton);

    expect(onFallbackMode).toHaveBeenCalled();
  });

  it('shows technical details when requested', () => {
    render(
      <WaveformErrorBoundary enableAutoRecovery={false}>
        <ThrowError shouldThrow={true} errorMessage="Detailed error message" />
      </WaveformErrorBoundary>
    );

    const detailsButton = screen.getByRole('button', { name: /show technical details/i });
    fireEvent.click(detailsButton);

    expect(screen.getByText('Detailed error message')).toBeInTheDocument();
    expect(screen.getAllByText(/Error:/)[0]).toBeInTheDocument();
  });

  it('limits retry attempts', () => {
    const { rerender } = render(
      <WaveformErrorBoundary>
        <ThrowError shouldThrow={true} errorMessage="Network error" />
      </WaveformErrorBoundary>
    );

    // Simulate multiple failed retries
    for (let i = 0; i < 4; i++) {
      const retryButton = screen.queryByRole('button', { name: /retry/i });
      if (retryButton) {
        fireEvent.click(retryButton);
        rerender(
          <WaveformErrorBoundary>
            <ThrowError shouldThrow={true} errorMessage="Network error" />
          </WaveformErrorBoundary>
        );
      }
    }

    // After max retries, retry button should not be available
    expect(screen.queryByRole('button', { name: /retry/i })).not.toBeInTheDocument();
  });

  it('attempts automatic recovery for transient errors', async () => {
    const mockRecoveryService = {
      reportError: vi.fn(),
      attemptRecovery: vi.fn().mockResolvedValue(true)
    };

    // Mock the service constructor to return our mock
    const { WaveformErrorRecoveryService } = await import('../../../services/WaveformErrorRecoveryService');
    WaveformErrorRecoveryService.mockImplementation(() => mockRecoveryService);

    render(
      <WaveformErrorBoundary enableAutoRecovery={true}>
        <ThrowError shouldThrow={true} errorMessage="Network timeout" />
      </WaveformErrorBoundary>
    );

    await waitFor(() => {
      expect(mockRecoveryService.attemptRecovery).toHaveBeenCalled();
    }, { timeout: 2000 });
  });

  it('shows recovery status during automatic recovery', async () => {
    render(
      <WaveformErrorBoundary>
        <ThrowError shouldThrow={true} errorMessage="Canvas context error" />
      </WaveformErrorBoundary>
    );

    // Should show recovery status briefly
    await waitFor(() => {
      expect(screen.getByText(/attempting to recover/i)).toBeInTheDocument();
    }, { timeout: 100 });
  });

  it('classifies errors correctly for recovery', () => {
    const boundary = new WaveformErrorBoundary({});
    
    expect(boundary.isTransientError(new Error('Network timeout'))).toBe(true);
    expect(boundary.isTransientError(new Error('Canvas context lost'))).toBe(true);
    expect(boundary.isTransientError(new Error('Audio context suspended'))).toBe(true);
    expect(boundary.isTransientError(new Error('Syntax error'))).toBe(false);
  });
});