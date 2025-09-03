import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import ErrorStateManager from '../ErrorStateManager';
import discoveryErrorService from '../../../services/discovery/DiscoveryErrorService';

// Mock the error service
vi.mock('../../../services/discovery/DiscoveryErrorService', () => ({
  default: {
    logError: vi.fn()
  }
}));

// Mock child components
vi.mock('../ErrorMessage', () => ({
  default: ({ error, type, onRetry, onDismiss, ...props }) => (
    <div data-testid="error-message" data-error-type={type} {...props}>
      <span>{error}</span>
      {onRetry && (
        <button onClick={onRetry} data-testid="error-message-retry">
          Retry
        </button>
      )}
      {onDismiss && (
        <button onClick={onDismiss} data-testid="error-message-dismiss">
          Dismiss
        </button>
      )}
    </div>
  )
}));

vi.mock('../ErrorRecoveryGuide', () => ({
  default: ({ error, errorType, onRetry, onDismiss, ...props }) => (
    <div data-testid="error-recovery-guide" data-error-type={errorType} {...props}>
      <span>Recovery guide for {errorType}</span>
      {onRetry && (
        <button onClick={onRetry} data-testid="recovery-guide-retry">
          Guide Retry
        </button>
      )}
      {onDismiss && (
        <button onClick={onDismiss} data-testid="recovery-guide-dismiss">
          Guide Dismiss
        </button>
      )}
    </div>
  )
}));

vi.mock('../OfflineDetector', () => ({
  default: ({ onStatusChange, children, ...props }) => {
    // Simulate status change on mount
    React.useEffect(() => {
      if (onStatusChange) {
        onStatusChange(navigator.onLine);
      }
    }, [onStatusChange]);

    return (
      <div data-testid="offline-detector" {...props}>
        {typeof children === 'function' ? children({ isOnline: navigator.onLine }) : children}
      </div>
    );
  }
}));

// Helper to simulate online/offline events
const simulateOnline = () => {
  Object.defineProperty(navigator, 'onLine', {
    writable: true,
    value: true
  });
  window.dispatchEvent(new Event('online'));
};

const simulateOffline = () => {
  Object.defineProperty(navigator, 'onLine', {
    writable: true,
    value: false
  });
  window.dispatchEvent(new Event('offline'));
};

describe('ErrorStateManager', () => {
  beforeEach(() => {
    // Mock navigator.onLine as online by default
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: true
    });

    // Mock Date.now for consistent timing tests
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-01T00:00:00Z'));
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  describe('Basic Rendering', () => {
    it('renders children when no error', () => {
      render(
        <ErrorStateManager>
          <div data-testid="child-content">Child content</div>
        </ErrorStateManager>
      );

      expect(screen.getByTestId('child-content')).toBeInTheDocument();
      expect(screen.queryByTestId('error-message')).not.toBeInTheDocument();
    });

    it('renders error message when error is provided', () => {
      render(
        <ErrorStateManager error="Test error">
          <div data-testid="child-content">Child content</div>
        </ErrorStateManager>
      );

      expect(screen.getByTestId('error-message')).toBeInTheDocument();
      expect(screen.getByText('Something went wrong. Please try again.')).toBeInTheDocument();
    });

    it('renders with custom className', () => {
      const { container } = render(
        <ErrorStateManager className="custom-class" error="Test error" />
      );

      expect(container.querySelector('.custom-class')).toBeInTheDocument();
    });

    it('renders function children with error context', () => {
      render(
        <ErrorStateManager error="Test error">
          {({ hasError, errorType, isOnline, retryCount, canRetry }) => (
            <div data-testid="function-child">
              <span data-testid="has-error">{hasError.toString()}</span>
              <span data-testid="error-type">{errorType}</span>
              <span data-testid="is-online">{isOnline.toString()}</span>
              <span data-testid="retry-count">{retryCount}</span>
              <span data-testid="can-retry">{canRetry.toString()}</span>
            </div>
          )}
        </ErrorStateManager>
      );

      expect(screen.getByTestId('has-error')).toHaveTextContent('true');
      expect(screen.getByTestId('error-type')).toHaveTextContent('general');
      expect(screen.getByTestId('is-online')).toHaveTextContent('true');
      expect(screen.getByTestId('retry-count')).toHaveTextContent('0');
      expect(screen.getByTestId('can-retry')).toHaveTextContent('false'); // No onRetry provided
    });
  });

  describe('Error Analysis', () => {
    it('detects network errors', () => {
      render(<ErrorStateManager error="Network connection failed" />);

      const errorMessage = screen.getByTestId('error-message');
      expect(errorMessage).toHaveAttribute('data-error-type', 'network');
      expect(screen.getByText('Unable to connect to the discovery service. Please check your connection.')).toBeInTheDocument();
    });

    it('detects API errors', () => {
      render(<ErrorStateManager error="YouTube API quota exceeded" />);

      const errorMessage = screen.getByTestId('error-message');
      expect(errorMessage).toHaveAttribute('data-error-type', 'api');
      expect(screen.getByText('The sample discovery service is temporarily unavailable. Demo samples are available.')).toBeInTheDocument();
    });

    it('detects storage errors', () => {
      render(<ErrorStateManager error="localStorage quota exceeded" />);

      const errorMessage = screen.getByTestId('error-message');
      expect(errorMessage).toHaveAttribute('data-error-type', 'storage');
      expect(screen.getByText('Unable to save your preferences. Your session data may not persist.')).toBeInTheDocument();
    });

    it('detects timeout errors', () => {
      render(<ErrorStateManager error="Request timeout" />);

      const errorMessage = screen.getByTestId('error-message');
      expect(errorMessage).toHaveAttribute('data-error-type', 'timeout');
      expect(screen.getByText('The request is taking too long. Please try again.')).toBeInTheDocument();
    });

    it('detects video errors', () => {
      render(<ErrorStateManager error="Video player failed" />);

      const errorMessage = screen.getByTestId('error-message');
      expect(errorMessage).toHaveAttribute('data-error-type', 'video');
      expect(screen.getByText('Unable to load this video. Please try a different sample.')).toBeInTheDocument();
    });

    it('handles object errors', () => {
      const errorObject = { message: 'API error', code: 403 };
      render(<ErrorStateManager error={errorObject} />);

      const errorMessage = screen.getByTestId('error-message');
      expect(errorMessage).toHaveAttribute('data-error-type', 'api');
    });
  });

  describe('Offline Handling', () => {
    it('shows offline message for network errors when offline', () => {
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false
      });

      render(<ErrorStateManager error="Network error" />);

      expect(screen.getByText('You\'re currently offline. Some features may be limited.')).toBeInTheDocument();
    });

    it('auto-retries when coming back online', async () => {
      const mockOnRetry = vi.fn().mockResolvedValue();
      
      // Start offline with network error
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false
      });

      render(<ErrorStateManager error="Network error" onRetry={mockOnRetry} />);

      // Come back online
      act(() => {
        simulateOnline();
      });

      // Wait for auto-retry
      await act(async () => {
        vi.advanceTimersByTime(1000);
      });

      expect(mockOnRetry).toHaveBeenCalled();
    });
  });

  describe('Retry Functionality', () => {
    it('shows retry button when onRetry is provided', () => {
      const mockOnRetry = vi.fn();
      render(<ErrorStateManager error="Test error" onRetry={mockOnRetry} />);

      expect(screen.getByTestId('error-message-retry')).toBeInTheDocument();
    });

    it('calls onRetry when retry button is clicked', async () => {
      const mockOnRetry = vi.fn().mockResolvedValue();
      render(<ErrorStateManager error="Test error" onRetry={mockOnRetry} />);

      const retryButton = screen.getByTestId('error-message-retry');
      fireEvent.click(retryButton);

      expect(mockOnRetry).toHaveBeenCalledTimes(1);
    });

    it('clears error on successful retry', async () => {
      const mockOnRetry = vi.fn().mockResolvedValue();
      render(
        <ErrorStateManager error="Test error" onRetry={mockOnRetry}>
          <div data-testid="child-content">Child content</div>
        </ErrorStateManager>
      );

      const retryButton = screen.getByTestId('error-message-retry');
      fireEvent.click(retryButton);

      await waitFor(() => {
        expect(screen.queryByTestId('error-message')).not.toBeInTheDocument();
        expect(screen.getByTestId('child-content')).toBeInTheDocument();
      });
    });

    it('updates error on failed retry', async () => {
      const retryError = new Error('Retry failed');
      const mockOnRetry = vi.fn().mockRejectedValue(retryError);
      
      render(<ErrorStateManager error="Original error" onRetry={mockOnRetry} />);

      const retryButton = screen.getByTestId('error-message-retry');
      fireEvent.click(retryButton);

      await waitFor(() => {
        expect(screen.getByText('Something went wrong. Please try again.')).toBeInTheDocument();
      });
    });

    it('prevents rapid retries', async () => {
      const mockOnRetry = vi.fn().mockResolvedValue();
      render(<ErrorStateManager error="Test error" onRetry={mockOnRetry} />);

      const retryButton = screen.getByTestId('error-message-retry');
      
      // Click multiple times rapidly
      fireEvent.click(retryButton);
      fireEvent.click(retryButton);
      fireEvent.click(retryButton);

      // Should only be called once
      expect(mockOnRetry).toHaveBeenCalledTimes(1);
    });

    it('limits retry attempts', () => {
      const mockOnRetry = vi.fn().mockRejectedValue(new Error('Always fails'));
      
      const { rerender } = render(<ErrorStateManager error="Test error" onRetry={mockOnRetry} />);

      // Simulate 5 failed retries by re-rendering with increasing retry count
      for (let i = 0; i < 6; i++) {
        rerender(<ErrorStateManager error="Test error" onRetry={mockOnRetry} />);
        const retryButton = screen.queryByTestId('error-message-retry');
        if (retryButton) {
          fireEvent.click(retryButton);
        }
      }

      // After 5 retries, should not show retry button
      expect(screen.queryByTestId('error-message-retry')).not.toBeInTheDocument();
    });
  });

  describe('Recovery Guide', () => {
    it('shows recovery guide toggle when error exists', () => {
      render(<ErrorStateManager error="Test error" />);

      expect(screen.getByRole('button', { name: /show recovery guide/i })).toBeInTheDocument();
    });

    it('toggles recovery guide visibility', () => {
      render(<ErrorStateManager error="Test error" />);

      const toggleButton = screen.getByRole('button', { name: /show recovery guide/i });
      fireEvent.click(toggleButton);

      expect(screen.getByTestId('error-recovery-guide')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /hide recovery guide/i })).toBeInTheDocument();
    });

    it('shows recovery guide initially when showRecoveryGuide is true', () => {
      render(<ErrorStateManager error="Test error" showRecoveryGuide={true} />);

      expect(screen.getByTestId('error-recovery-guide')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /hide recovery guide/i })).toBeInTheDocument();
    });

    it('passes correct error type to recovery guide', () => {
      render(<ErrorStateManager error="Network error" showRecoveryGuide={true} />);

      const recoveryGuide = screen.getByTestId('error-recovery-guide');
      expect(recoveryGuide).toHaveAttribute('data-error-type', 'network');
    });
  });

  describe('Persistent Error Handling', () => {
    it('shows persistent error message after multiple retries', async () => {
      const mockOnRetry = vi.fn().mockRejectedValue(new Error('Always fails'));
      
      render(<ErrorStateManager error="Test error" onRetry={mockOnRetry} />);

      // Simulate multiple failed retries
      for (let i = 0; i < 3; i++) {
        const retryButton = screen.getByTestId('error-message-retry');
        fireEvent.click(retryButton);
        
        await waitFor(() => {
          expect(mockOnRetry).toHaveBeenCalledTimes(i + 1);
        });
        
        // Advance time to allow next retry
        act(() => {
          vi.advanceTimersByTime(2000);
        });
      }

      expect(screen.getByText(/this error has occurred 3 times/i)).toBeInTheDocument();
      expect(screen.getByText('Try refreshing the entire page')).toBeInTheDocument();
    });
  });

  describe('Error Dismissal', () => {
    it('dismisses error when dismiss button is clicked', () => {
      render(
        <ErrorStateManager error="Test error">
          <div data-testid="child-content">Child content</div>
        </ErrorStateManager>
      );

      const dismissButton = screen.getByTestId('error-message-dismiss');
      fireEvent.click(dismissButton);

      expect(screen.queryByTestId('error-message')).not.toBeInTheDocument();
      expect(screen.getByTestId('child-content')).toBeInTheDocument();
    });

    it('calls onErrorDismiss when error is dismissed', () => {
      const mockOnErrorDismiss = vi.fn();
      render(<ErrorStateManager error="Test error" onErrorDismiss={mockOnErrorDismiss} />);

      const dismissButton = screen.getByTestId('error-message-dismiss');
      fireEvent.click(dismissButton);

      expect(mockOnErrorDismiss).toHaveBeenCalledTimes(1);
    });

    it('resets retry count when error is dismissed', () => {
      render(
        <ErrorStateManager error="Test error">
          {({ retryCount }) => (
            <div data-testid="retry-count">{retryCount}</div>
          )}
        </ErrorStateManager>
      );

      // Dismiss error
      const dismissButton = screen.getByTestId('error-message-dismiss');
      fireEvent.click(dismissButton);

      // Should reset retry count
      expect(screen.getByTestId('retry-count')).toHaveTextContent('0');
    });
  });

  describe('Error Logging', () => {
    it('logs errors when they occur', () => {
      render(<ErrorStateManager error="Test error" />);

      expect(discoveryErrorService.logError).toHaveBeenCalledWith(
        'error-state-manager',
        'Test error',
        expect.objectContaining({
          errorType: 'general',
          severity: 'error',
          isOnline: true,
          retryCount: 0
        })
      );
    });

    it('logs successful recovery', async () => {
      const mockOnRetry = vi.fn().mockResolvedValue();
      render(<ErrorStateManager error="Test error" onRetry={mockOnRetry} />);

      const retryButton = screen.getByTestId('error-message-retry');
      fireEvent.click(retryButton);

      await waitFor(() => {
        expect(discoveryErrorService.logError).toHaveBeenCalledWith(
          'retry-success',
          null,
          expect.objectContaining({
            errorType: 'general',
            retryCount: 1
          })
        );
      });
    });

    it('logs retry failures', async () => {
      const retryError = new Error('Retry failed');
      const mockOnRetry = vi.fn().mockRejectedValue(retryError);
      
      render(<ErrorStateManager error="Original error" onRetry={mockOnRetry} />);

      const retryButton = screen.getByTestId('error-message-retry');
      fireEvent.click(retryButton);

      await waitFor(() => {
        expect(discoveryErrorService.logError).toHaveBeenCalledWith(
          'retry-failed',
          retryError,
          expect.objectContaining({
            originalErrorType: 'general',
            retryCount: 1
          })
        );
      });
    });
  });

  describe('Accessibility', () => {
    it('maintains proper focus management', () => {
      render(<ErrorStateManager error="Test error" />);

      const toggleButton = screen.getByRole('button', { name: /show recovery guide/i });
      toggleButton.focus();

      expect(document.activeElement).toBe(toggleButton);
    });

    it('provides accessible button labels', () => {
      const mockOnRetry = vi.fn();
      render(<ErrorStateManager error="Test error" onRetry={mockOnRetry} />);

      expect(screen.getByRole('button', { name: /show recovery guide/i })).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('handles null error gracefully', () => {
      render(
        <ErrorStateManager error={null}>
          <div data-testid="child-content">Child content</div>
        </ErrorStateManager>
      );

      expect(screen.getByTestId('child-content')).toBeInTheDocument();
      expect(screen.queryByTestId('error-message')).not.toBeInTheDocument();
    });

    it('handles undefined error gracefully', () => {
      render(
        <ErrorStateManager error={undefined}>
          <div data-testid="child-content">Child content</div>
        </ErrorStateManager>
      );

      expect(screen.getByTestId('child-content')).toBeInTheDocument();
      expect(screen.queryByTestId('error-message')).not.toBeInTheDocument();
    });

    it('handles error prop changes', () => {
      const { rerender } = render(<ErrorStateManager error="First error" />);

      expect(screen.getByText('Something went wrong. Please try again.')).toBeInTheDocument();

      rerender(<ErrorStateManager error="Second error" />);

      expect(screen.getByText('Something went wrong. Please try again.')).toBeInTheDocument();
    });
  });
});