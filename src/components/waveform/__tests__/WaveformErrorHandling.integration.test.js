import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { WaveformVisualization } from '../WaveformVisualization';
import { WaveformErrorBoundary } from '../../error/WaveformErrorBoundary';

// Mock the waveform components to simulate errors
vi.mock('../CanvasRenderer', () => ({
  CanvasRenderer: vi.fn().mockImplementation(() => ({
    initializeLayers: vi.fn(),
    renderWaveform: vi.fn(),
    renderChops: vi.fn(),
    renderPlayhead: vi.fn(),
    destroy: vi.fn()
  }))
}));

vi.mock('../../services/WebAudioAnalyzer', () => ({
  WebAudioAnalyzer: vi.fn().mockImplementation(() => ({
    analyzeAudio: vi.fn().mockRejectedValue(new Error('Audio analysis failed'))
  }))
}));

// Test component that can throw different types of errors
const ErrorThrowingWaveform = ({ errorType, shouldThrow }) => {
  if (shouldThrow) {
    switch (errorType) {
      case 'canvas':
        throw new Error('Canvas context lost');
      case 'audio':
        throw new Error('Web Audio API not supported');
      case 'memory':
        throw new Error('Memory allocation failed');
      case 'network':
        throw new Error('Network fetch failed');
      default:
        throw new Error('Unknown error');
    }
  }
  
  return (
    <div data-testid="waveform-success">
      Waveform rendered successfully
    </div>
  );
};

describe('Waveform Error Handling Integration', () => {
  let consoleError;
  let consoleWarn;

  beforeEach(() => {
    consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    
    // Reset global state
    global.window = {
      ...global.window,
      waveformCanvasContexts: [],
      waveformAudioContexts: [],
      waveformCache: { clear: vi.fn() },
      waveformBuffers: [],
      AudioContext: vi.fn(),
      webkitAudioContext: vi.fn()
    };
  });

  afterEach(() => {
    consoleError.mockRestore();
    consoleWarn.mockRestore();
    vi.clearAllMocks();
  });

  it('handles canvas errors with appropriate fallback', async () => {
    render(
      <WaveformErrorBoundary>
        <ErrorThrowingWaveform errorType="canvas" shouldThrow={true} />
      </WaveformErrorBoundary>
    );

    expect(screen.getByText('Waveform Display Unavailable')).toBeInTheDocument();
    expect(screen.getByText(/Unable to initialize waveform display/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /use simple mode/i })).toBeInTheDocument();
  });

  it('handles audio errors with appropriate fallback', async () => {
    render(
      <WaveformErrorBoundary>
        <ErrorThrowingWaveform errorType="audio" shouldThrow={true} />
      </WaveformErrorBoundary>
    );

    expect(screen.getByText(/Cannot access audio for waveform analysis/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
  });

  it('handles memory errors with appropriate fallback', async () => {
    render(
      <WaveformErrorBoundary>
        <ErrorThrowingWaveform errorType="memory" shouldThrow={true} />
      </WaveformErrorBoundary>
    );

    expect(screen.getByText(/Insufficient memory to generate waveform/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /use simple mode/i })).toBeInTheDocument();
  });

  it('handles network errors with retry option', async () => {
    render(
      <WaveformErrorBoundary>
        <ErrorThrowingWaveform errorType="network" shouldThrow={true} />
      </WaveformErrorBoundary>
    );

    expect(screen.getByText(/Network error while loading audio data/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
  });

  it('performs successful recovery after retry', async () => {
    const { rerender } = render(
      <WaveformErrorBoundary>
        <ErrorThrowingWaveform errorType="network" shouldThrow={true} />
      </WaveformErrorBoundary>
    );

    // Error state should be displayed
    expect(screen.getByText('Waveform Display Unavailable')).toBeInTheDocument();

    // Click retry button
    const retryButton = screen.getByRole('button', { name: /retry/i });
    fireEvent.click(retryButton);

    // Simulate successful recovery by not throwing error
    rerender(
      <WaveformErrorBoundary>
        <ErrorThrowingWaveform errorType="network" shouldThrow={false} />
      </WaveformErrorBoundary>
    );

    await waitFor(() => {
      expect(screen.getByTestId('waveform-success')).toBeInTheDocument();
    });
  });

  it('switches to fallback mode when requested', async () => {
    const onFallbackMode = vi.fn();
    
    render(
      <WaveformErrorBoundary onFallbackMode={onFallbackMode}>
        <ErrorThrowingWaveform errorType="canvas" shouldThrow={true} />
      </WaveformErrorBoundary>
    );

    const fallbackButton = screen.getByRole('button', { name: /use simple mode/i });
    fireEvent.click(fallbackButton);

    expect(onFallbackMode).toHaveBeenCalled();
  });

  it('shows technical details when requested', async () => {
    render(
      <WaveformErrorBoundary>
        <ErrorThrowingWaveform errorType="canvas" shouldThrow={true} />
      </WaveformErrorBoundary>
    );

    const detailsButton = screen.getByRole('button', { name: /show technical details/i });
    fireEvent.click(detailsButton);

    expect(screen.getByText('Canvas context lost')).toBeInTheDocument();
    expect(screen.getByText(/Error:/)).toBeInTheDocument();
    expect(screen.getByText(/Stack Trace:/)).toBeInTheDocument();
  });

  it('limits retry attempts and suggests fallback', async () => {
    const { rerender } = render(
      <WaveformErrorBoundary>
        <ErrorThrowingWaveform errorType="network" shouldThrow={true} />
      </WaveformErrorBoundary>
    );

    // Perform multiple failed retries
    for (let i = 0; i < 4; i++) {
      const retryButton = screen.queryByRole('button', { name: /retry/i });
      if (retryButton) {
        fireEvent.click(retryButton);
        
        // Simulate continued failure
        rerender(
          <WaveformErrorBoundary>
            <ErrorThrowingWaveform errorType="network" shouldThrow={true} />
          </WaveformErrorBoundary>
        );
      }
    }

    // After max retries, retry button should not be available
    expect(screen.queryByRole('button', { name: /retry/i })).not.toBeInTheDocument();
    
    // But fallback mode should still be available
    expect(screen.getByRole('button', { name: /use simple mode/i })).toBeInTheDocument();
  });

  it('provides helpful browser update suggestion for canvas errors', async () => {
    render(
      <WaveformErrorBoundary>
        <ErrorThrowingWaveform errorType="canvas" shouldThrow={true} />
      </WaveformErrorBoundary>
    );

    expect(screen.getByRole('button', { name: /update browser/i })).toBeInTheDocument();
  });

  it('shows recovery status during automatic recovery', async () => {
    render(
      <WaveformErrorBoundary>
        <ErrorThrowingWaveform errorType="network" shouldThrow={true} />
      </WaveformErrorBoundary>
    );

    // Should briefly show recovery status
    await waitFor(() => {
      expect(screen.getByText(/attempting to recover/i)).toBeInTheDocument();
    }, { timeout: 100 });
  });

  it('handles multiple error types in sequence', async () => {
    const { rerender } = render(
      <WaveformErrorBoundary>
        <ErrorThrowingWaveform errorType="canvas" shouldThrow={true} />
      </WaveformErrorBoundary>
    );

    // First error: canvas
    expect(screen.getByText(/Unable to initialize waveform display/)).toBeInTheDocument();

    // Reset and trigger different error
    const retryButton = screen.getByRole('button', { name: /use simple mode/i });
    fireEvent.click(retryButton);

    rerender(
      <WaveformErrorBoundary>
        <ErrorThrowingWaveform errorType="audio" shouldThrow={true} />
      </WaveformErrorBoundary>
    );

    // Second error: audio
    expect(screen.getByText(/Cannot access audio for waveform analysis/)).toBeInTheDocument();
  });

  it('maintains error history across multiple failures', async () => {
    const { rerender } = render(
      <WaveformErrorBoundary>
        <ErrorThrowingWaveform errorType="network" shouldThrow={true} />
      </WaveformErrorBoundary>
    );

    // First failure
    expect(screen.getByText('Waveform Display Unavailable')).toBeInTheDocument();

    // Retry and fail again
    const retryButton = screen.getByRole('button', { name: /retry/i });
    fireEvent.click(retryButton);

    rerender(
      <WaveformErrorBoundary>
        <ErrorThrowingWaveform errorType="network" shouldThrow={true} />
      </WaveformErrorBoundary>
    );

    // Should show retry count
    expect(screen.getByText(/retry attempt/i)).toBeInTheDocument();
  });

  it('provides contextual help text', async () => {
    render(
      <WaveformErrorBoundary>
        <ErrorThrowingWaveform errorType="canvas" shouldThrow={true} />
      </WaveformErrorBoundary>
    );

    expect(screen.getByText(/you can still use the sampler without it/i)).toBeInTheDocument();
    expect(screen.getByText(/clicking on the pads to set timestamps/i)).toBeInTheDocument();
  });
});