import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useWaveformErrorRecovery } from '../useWaveformErrorRecovery';

// Mock the recovery service
const mockRecoveryService = {
  reportError: vi.fn().mockReturnValue({ id: 'test-error-id' }),
  attemptRecovery: vi.fn().mockResolvedValue(true),
  isSystemHealthy: vi.fn().mockReturnValue(true),
  getErrorStatistics: vi.fn().mockReturnValue({
    totalErrors: 0,
    recentErrors: 0,
    errorsByType: {},
    lastError: null
  }),
  classifyError: vi.fn().mockReturnValue('generic')
};

vi.mock('../../services/WaveformErrorRecoveryService', () => ({
  WaveformErrorRecoveryService: vi.fn().mockImplementation(() => mockRecoveryService)
}));

describe('useWaveformErrorRecovery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('initializes with default state', () => {
    const { result } = renderHook(() => useWaveformErrorRecovery());

    expect(result.current.error).toBeNull();
    expect(result.current.isRecovering).toBe(false);
    expect(result.current.retryCount).toBe(0);
    expect(result.current.fallbackMode).toBe(false);
    expect(result.current.systemHealth).toBe(true);
    expect(result.current.canRetry).toBe(true);
    expect(result.current.maxRetries).toBe(3);
  });

  it('accepts custom options', () => {
    const options = {
      maxRetries: 5,
      retryDelay: 2000,
      enableAutoRetry: false
    };

    const { result } = renderHook(() => useWaveformErrorRecovery(options));

    expect(result.current.maxRetries).toBe(5);
  });

  it('handles error occurrence', async () => {
    const onError = vi.fn();
    const { result } = renderHook(() => useWaveformErrorRecovery({ onError }));

    const testError = new Error('Test error');

    await act(async () => {
      await result.current.handleError(testError);
    });

    expect(result.current.error).toBe(testError);
    expect(onError).toHaveBeenCalledWith(testError, { id: 'test-error-id' });
    expect(mockRecoveryService.reportError).toHaveBeenCalled();
  });

  it('attempts automatic recovery when enabled', async () => {
    mockRecoveryService.classifyError.mockReturnValue('network');
    const { result } = renderHook(() => useWaveformErrorRecovery({ enableAutoRetry: true }));

    const testError = new Error('Network timeout');

    await act(async () => {
      await result.current.handleError(testError);
    });

    expect(mockRecoveryService.attemptRecovery).toHaveBeenCalledWith(testError);
  });

  it('does not attempt automatic recovery when disabled', async () => {
    const { result } = renderHook(() => useWaveformErrorRecovery({ enableAutoRetry: false }));

    const testError = new Error('Test error');

    await act(async () => {
      await result.current.handleError(testError);
    });

    expect(mockRecoveryService.attemptRecovery).not.toHaveBeenCalled();
  });

  it('performs manual retry', async () => {
    const onRecovery = vi.fn();
    const { result } = renderHook(() => useWaveformErrorRecovery({ onRecovery }));

    // Set initial error state
    await act(async () => {
      await result.current.handleError(new Error('Test error'));
    });

    // Perform manual retry
    await act(async () => {
      const success = await result.current.retry();
      expect(success).toBe(true);
    });

    expect(result.current.error).toBeNull();
    expect(result.current.retryCount).toBe(1);
    expect(onRecovery).toHaveBeenCalled();
  });

  it('handles retry failure', async () => {
    mockRecoveryService.attemptRecovery.mockRejectedValueOnce(new Error('Recovery failed'));
    const { result } = renderHook(() => useWaveformErrorRecovery());

    // Set initial error state
    await act(async () => {
      await result.current.handleError(new Error('Test error'));
    });

    // Attempt retry that will fail
    await act(async () => {
      const success = await result.current.retry();
      expect(success).toBe(false);
    });

    expect(result.current.retryCount).toBe(1);
    expect(result.current.error).toBeTruthy(); // Error should still be present
  });

  it('enables fallback mode after max retries', async () => {
    mockRecoveryService.attemptRecovery.mockRejectedValue(new Error('Recovery failed'));
    const { result } = renderHook(() => useWaveformErrorRecovery({ maxRetries: 2 }));

    const testError = new Error('Test error');

    // Exhaust all retries
    for (let i = 0; i < 3; i++) {
      await act(async () => {
        await result.current.handleError(testError);
      });
    }

    expect(result.current.fallbackMode).toBe(true);
    expect(result.current.canRetry).toBe(false);
  });

  it('resets error state', () => {
    const { result } = renderHook(() => useWaveformErrorRecovery());

    // Set error state
    act(() => {
      result.current.handleError(new Error('Test error'));
    });

    expect(result.current.error).toBeTruthy();

    // Reset error state
    act(() => {
      result.current.resetError();
    });

    expect(result.current.error).toBeNull();
    expect(result.current.isRecovering).toBe(false);
    expect(result.current.retryCount).toBe(0);
    expect(result.current.fallbackMode).toBe(false);
  });

  it('enables fallback mode manually', () => {
    const { result } = renderHook(() => useWaveformErrorRecovery());

    act(() => {
      result.current.enableFallbackMode();
    });

    expect(result.current.fallbackMode).toBe(true);
    expect(result.current.error).toBeNull();
    expect(result.current.isRecovering).toBe(false);
  });

  it('provides error statistics', () => {
    const { result } = renderHook(() => useWaveformErrorRecovery());

    const stats = result.current.getErrorStats();

    expect(mockRecoveryService.getErrorStatistics).toHaveBeenCalled();
    expect(stats).toEqual({
      totalErrors: 0,
      recentErrors: 0,
      errorsByType: {},
      lastError: null
    });
  });

  it('checks if error is recoverable', () => {
    mockRecoveryService.classifyError.mockReturnValue('network');
    const { result } = renderHook(() => useWaveformErrorRecovery());

    const testError = new Error('Network timeout');

    act(() => {
      result.current.handleError(testError);
    });

    const isRecoverable = result.current.isRecoverable();
    expect(isRecoverable).toBe(true);
  });

  it('identifies non-recoverable errors', () => {
    mockRecoveryService.classifyError.mockReturnValue('generic');
    const { result } = renderHook(() => useWaveformErrorRecovery({ maxRetries: 1 }));

    const testError = new Error('Fatal error');

    // Exhaust retries
    act(() => {
      result.current.handleError(testError);
    });
    act(() => {
      result.current.handleError(testError);
    });

    const isRecoverable = result.current.isRecoverable();
    expect(isRecoverable).toBe(false);
  });

  it('monitors system health', async () => {
    mockRecoveryService.isSystemHealthy
      .mockReturnValueOnce(true)
      .mockReturnValueOnce(false);

    const { result } = renderHook(() => useWaveformErrorRecovery());

    expect(result.current.systemHealth).toBe(true);

    // Fast-forward time to trigger health check
    act(() => {
      vi.advanceTimersByTime(30000);
    });

    await waitFor(() => {
      expect(result.current.systemHealth).toBe(false);
    });
  });

  it('handles recovery with retry delay', async () => {
    const { result } = renderHook(() => useWaveformErrorRecovery({ retryDelay: 1000 }));

    const testError = new Error('Test error');

    await act(async () => {
      await result.current.handleError(testError);
    });

    expect(result.current.isRecovering).toBe(true);

    // Fast-forward past retry delay
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    await waitFor(() => {
      expect(result.current.isRecovering).toBe(false);
    });
  });

  it('prevents retry when max retries reached', async () => {
    const { result } = renderHook(() => useWaveformErrorRecovery({ maxRetries: 1 }));

    // Exhaust retries
    await act(async () => {
      await result.current.handleError(new Error('Test error'));
    });
    await act(async () => {
      await result.current.retry();
    });

    // Should not allow more retries
    const success = await act(async () => {
      return await result.current.retry();
    });

    expect(success).toBe(false);
    expect(result.current.canRetry).toBe(false);
  });

  it('cleans up timers on unmount', () => {
    const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');
    const { unmount } = renderHook(() => useWaveformErrorRecovery());

    unmount();

    expect(clearTimeoutSpy).toHaveBeenCalled();
  });
});