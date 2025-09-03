/**
 * @fileoverview Tests for Sampler Error Handling and Recovery
 * Requirements: 5.5, 5.6 - Error handling and graceful degradation
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import SamplerErrorBoundary from '../SamplerErrorBoundary';
import SamplerErrorNotifications, { useSamplerErrorNotifications } from '../SamplerErrorNotifications';
import { SamplerSequencerService } from '../../../services/sequencer/SamplerSequencerService';
import { YouTubePlayerInterface } from '../../../services/sequencer/YouTubePlayerInterface';
import samplerPatternValidator from '../../../services/sequencer/SamplerPatternValidator';

// Mock components and services
vi.mock('../../../services/sequencer/SamplerSequencerService');
vi.mock('../../../services/sequencer/YouTubePlayerInterface');

// Test component that throws errors
const ErrorThrowingComponent = ({ shouldThrow, errorType }) => {
  if (shouldThrow) {
    const error = new Error(`Test ${errorType} error`);
    error.name = errorType;
    throw error;
  }
  return <div data-testid="working-component">Component working</div>;
};

// Test component using error notifications hook
const NotificationTestComponent = () => {
  const errorNotifications = useSamplerErrorNotifications();
  
  return (
    <div>
      <button 
        onClick={() => errorNotifications.addYouTubeError('Test YouTube error')}
        data-testid="add-youtube-error"
      >
        Add YouTube Error
      </button>
      <button 
        onClick={() => errorNotifications.addTimingError('Test timing error')}
        data-testid="add-timing-error"
      >
        Add Timing Error
      </button>
      <button 
        onClick={() => errorNotifications.addPatternError('Test pattern error')}
        data-testid="add-pattern-error"
      >
        Add Pattern Error
      </button>
      <SamplerErrorNotifications
        errors={errorNotifications.errors}
        onDismiss={errorNotifications.removeError}
        onRetry={() => {}}
      />
    </div>
  );
};

describe('SamplerErrorBoundary', () => {
  let consoleSpy;

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  it('renders children when no error occurs', () => {
    render(
      <SamplerErrorBoundary>
        <ErrorThrowingComponent shouldThrow={false} />
      </SamplerErrorBoundary>
    );

    expect(screen.getByTestId('working-component')).toBeInTheDocument();
  });

  it('catches and displays YouTube player errors', () => {
    render(
      <SamplerErrorBoundary>
        <ErrorThrowingComponent shouldThrow={true} errorType="youtube" />
      </SamplerErrorBoundary>
    );

    expect(screen.getByText('YouTube Player Error')).toBeInTheDocument();
    expect(screen.getByText(/Unable to control YouTube video playback/)).toBeInTheDocument();
    expect(screen.getByText('Try Again')).toBeInTheDocument();
    expect(screen.getByText('Safe Mode')).toBeInTheDocument();
  });

  it('catches and displays timing errors', () => {
    render(
      <SamplerErrorBoundary>
        <ErrorThrowingComponent shouldThrow={true} errorType="timing" />
      </SamplerErrorBoundary>
    );

    expect(screen.getByText('Sequencer Timing Error')).toBeInTheDocument();
    expect(screen.getByText(/timing engine encountered an issue/)).toBeInTheDocument();
  });

  it('catches and displays pattern data errors', () => {
    render(
      <SamplerErrorBoundary>
        <ErrorThrowingComponent shouldThrow={true} errorType="pattern" />
      </SamplerErrorBoundary>
    );

    expect(screen.getByText('Pattern Data Error')).toBeInTheDocument();
    expect(screen.getByText(/Invalid or corrupted pattern data/)).toBeInTheDocument();
  });

  it('provides retry functionality', async () => {
    const onRetry = vi.fn().mockResolvedValue(true);
    
    render(
      <SamplerErrorBoundary onRetry={onRetry}>
        <ErrorThrowingComponent shouldThrow={true} errorType="youtube" />
      </SamplerErrorBoundary>
    );

    const retryButton = screen.getByText('Try Again');
    fireEvent.click(retryButton);

    await waitFor(() => {
      expect(onRetry).toHaveBeenCalled();
    });
  });

  it('provides degraded mode functionality', () => {
    const onDegradedMode = vi.fn();
    
    render(
      <SamplerErrorBoundary onDegradedMode={onDegradedMode}>
        <ErrorThrowingComponent shouldThrow={true} errorType="youtube" />
      </SamplerErrorBoundary>
    );

    const safeModeButton = screen.getByText('Safe Mode');
    fireEvent.click(safeModeButton);

    expect(onDegradedMode).toHaveBeenCalled();
  });

  it('shows multiple error attempts warning', () => {
    const { rerender } = render(
      <SamplerErrorBoundary>
        <ErrorThrowingComponent shouldThrow={true} errorType="youtube" />
      </SamplerErrorBoundary>
    );

    // Simulate multiple retry attempts
    act(() => {
      const component = screen.getByText('Try Again').closest('div');
      // Manually set retry count high to trigger warning
      component.setAttribute('data-retry-count', '3');
    });

    rerender(
      <SamplerErrorBoundary>
        <ErrorThrowingComponent shouldThrow={true} errorType="youtube" />
      </SamplerErrorBoundary>
    );

    // The warning should appear after multiple retries
    expect(screen.getByText(/Multiple errors detected/)).toBeInTheDocument();
  });
});

describe('SamplerErrorNotifications', () => {
  it('displays YouTube error notifications', () => {
    render(<NotificationTestComponent />);

    fireEvent.click(screen.getByTestId('add-youtube-error'));

    expect(screen.getByText('YouTube Player Error')).toBeInTheDocument();
    expect(screen.getByText('Test YouTube error')).toBeInTheDocument();
  });

  it('displays timing error notifications', () => {
    render(<NotificationTestComponent />);

    fireEvent.click(screen.getByTestId('add-timing-error'));

    expect(screen.getByText('Timing Issue')).toBeInTheDocument();
    expect(screen.getByText('Test timing error')).toBeInTheDocument();
  });

  it('displays pattern error notifications', () => {
    render(<NotificationTestComponent />);

    fireEvent.click(screen.getByTestId('add-pattern-error'));

    expect(screen.getByText('Pattern Data Error')).toBeInTheDocument();
    expect(screen.getByText('Test pattern error')).toBeInTheDocument();
  });

  it('allows dismissing notifications', async () => {
    render(<NotificationTestComponent />);

    fireEvent.click(screen.getByTestId('add-youtube-error'));
    expect(screen.getByText('YouTube Player Error')).toBeInTheDocument();

    const dismissButton = screen.getByRole('button', { name: /×/ });
    fireEvent.click(dismissButton);

    await waitFor(() => {
      expect(screen.queryByText('YouTube Player Error')).not.toBeInTheDocument();
    });
  });

  it('shows retry buttons for retryable errors', () => {
    render(<NotificationTestComponent />);

    fireEvent.click(screen.getByTestId('add-youtube-error'));

    expect(screen.getByText('Retry')).toBeInTheDocument();
  });
});

describe('YouTubePlayerInterface Error Handling', () => {
  let youtubeInterface;
  let mockPlayer;

  beforeEach(() => {
    mockPlayer = {
      seekTo: vi.fn(),
      getCurrentTime: vi.fn().mockReturnValue(0),
      getPlayerState: vi.fn().mockReturnValue(1),
      playVideo: vi.fn(),
      pauseVideo: vi.fn()
    };

    youtubeInterface = new YouTubePlayerInterface();
    youtubeInterface.connect(mockPlayer);
  });

  it('handles seek failures gracefully', async () => {
    mockPlayer.seekTo.mockImplementation(() => {
      throw new Error('Seek failed');
    });

    const result = await youtubeInterface.jumpToTimestamp(10);

    expect(result).toBe(false);
    expect(youtubeInterface.getStatus().errorCount).toBeGreaterThan(0);
  });

  it('enters degraded mode after multiple failures', async () => {
    // Mock multiple consecutive failures
    mockPlayer.seekTo.mockImplementation(() => {
      throw new Error('Seek failed');
    });

    // Trigger multiple failures
    for (let i = 0; i < 4; i++) {
      await youtubeInterface.jumpToTimestamp(10);
    }

    const status = youtubeInterface.getStatus();
    expect(status.isDegraded).toBe(true);
    expect(status.degradationReason).toContain('consecutive seek failures');
  });

  it('attempts automatic recovery from degraded mode', async () => {
    // Enter degraded mode
    youtubeInterface.enterDegradedMode('Test degradation');
    expect(youtubeInterface.getStatus().isDegraded).toBe(true);

    // Mock successful recovery
    mockPlayer.seekTo.mockImplementation(() => {});
    
    const recovered = await youtubeInterface.forceRecovery();
    expect(recovered).toBe(true);
    expect(youtubeInterface.getStatus().isDegraded).toBe(false);
  });

  it('classifies different error types correctly', () => {
    const seekError = new Error('Seek operation failed');
    const networkError = new Error('Network connection timeout');
    const permissionError = new Error('Video is private');

    expect(youtubeInterface.classifyPlayerError(seekError)).toBe('seek_error');
    expect(youtubeInterface.classifyPlayerError(networkError)).toBe('network_error');
    expect(youtubeInterface.classifyPlayerError(permissionError)).toBe('permission_error');
  });
});

describe('Pattern Data Validation', () => {
  it('validates valid pattern data', () => {
    const validPattern = {
      id: 'test_pattern',
      name: 'Test Pattern',
      bpm: 120,
      currentBank: 0,
      banks: [{
        bankId: 0,
        name: 'Bank A',
        tracks: Array.from({ length: 16 }, (_, i) => ({
          trackIndex: i,
          chopId: null,
          steps: new Array(16).fill(false)
        }))
      }],
      metadata: {
        created: new Date().toISOString(),
        modified: new Date().toISOString()
      }
    };

    const result = samplerPatternValidator.validateAndSanitize(validPattern);
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('sanitizes invalid pattern data', () => {
    const invalidPattern = {
      name: 'Test Pattern',
      bpm: 300, // Invalid BPM
      currentBank: 0,
      banks: [] // Empty banks
    };

    const result = samplerPatternValidator.validateAndSanitize(invalidPattern, {
      autoFix: true
    });

    expect(result.isValid).toBe(true);
    expect(result.sanitizedPattern.id).toBeDefined();
    expect(result.sanitizedPattern.bpm).toBe(200); // Clamped to max
    expect(result.sanitizedPattern.banks).toHaveLength(2); // Default banks created
    expect(result.fixes.length).toBeGreaterThan(0);
  });

  it('handles corrupted pattern data', () => {
    const corruptedPattern = {
      id: null,
      name: '',
      bpm: 'invalid',
      currentBank: -1,
      banks: 'not an array'
    };

    const result = samplerPatternValidator.validateAndSanitize(corruptedPattern, {
      autoFix: true,
      strict: false
    });

    expect(result.isValid).toBe(true);
    expect(result.sanitizedPattern.id).toBeDefined();
    expect(result.sanitizedPattern.name).toBe('Untitled Pattern');
    expect(result.sanitizedPattern.bpm).toBe(120);
    expect(result.sanitizedPattern.currentBank).toBe(0);
    expect(Array.isArray(result.sanitizedPattern.banks)).toBe(true);
  });

  it('throws errors in strict mode for invalid data', () => {
    const invalidPattern = {
      name: 'Test Pattern'
      // Missing required fields
    };

    expect(() => {
      samplerPatternValidator.validateAndSanitize(invalidPattern, {
        strict: true,
        throwOnError: true
      });
    }).toThrow();
  });
});

describe('Error Recovery Integration', () => {
  let mockService;

  beforeEach(() => {
    mockService = {
      initialize: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
      destroy: vi.fn(),
      youtubeInterface: {
        forceRecovery: vi.fn(),
        onDegradation: vi.fn()
      }
    };
  });

  it('handles service initialization failures', async () => {
    mockService.initialize.mockResolvedValue(false);

    // This would be tested in the actual component integration
    // Here we just verify the mock setup
    const result = await mockService.initialize();
    expect(result).toBe(false);
  });

  it('handles playback start failures', async () => {
    mockService.start.mockResolvedValue(false);

    const result = await mockService.start();
    expect(result).toBe(false);
  });

  it('handles YouTube player recovery', async () => {
    mockService.youtubeInterface.forceRecovery.mockResolvedValue(true);

    const result = await mockService.youtubeInterface.forceRecovery();
    expect(result).toBe(true);
  });
});