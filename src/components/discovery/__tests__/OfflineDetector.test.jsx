import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import OfflineDetector, { useOfflineDetection, withOfflineDetection } from '../OfflineDetector';

// Mock Lucide React icons
vi.mock('lucide-react', () => ({
  WifiOff: ({ className, size, ...props }) => (
    <div data-testid="wifi-off-icon" className={className} data-size={size} {...props} />
  ),
  Wifi: ({ className, size, ...props }) => (
    <div data-testid="wifi-icon" className={className} data-size={size} {...props} />
  )
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

describe('OfflineDetector', () => {
  beforeEach(() => {
    // Mock navigator.onLine as online by default
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: true
    });

    // Mock setTimeout for notification auto-dismiss
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  describe('Basic Rendering', () => {
    it('renders without crashing', () => {
      render(<OfflineDetector />);
      expect(screen.getByRole('generic')).toBeInTheDocument();
    });

    it('renders with custom className', () => {
      render(<OfflineDetector className="custom-class" />);
      
      const detector = screen.getByRole('generic');
      expect(detector).toHaveClass('offline-detector', 'custom-class');
    });

    it('renders children when provided', () => {
      render(
        <OfflineDetector>
          <div data-testid="child-content">Child content</div>
        </OfflineDetector>
      );
      
      expect(screen.getByTestId('child-content')).toBeInTheDocument();
    });

    it('renders function children with online status', () => {
      render(
        <OfflineDetector>
          {({ isOnline }) => (
            <div data-testid="status">
              Status: {isOnline ? 'online' : 'offline'}
            </div>
          )}
        </OfflineDetector>
      );
      
      expect(screen.getByTestId('status')).toHaveTextContent('Status: online');
    });
  });

  describe('Offline Detection', () => {
    it('shows offline notification when going offline', async () => {
      render(<OfflineDetector showNotification={true} />);
      
      act(() => {
        simulateOffline();
      });
      
      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
        expect(screen.getByText('You\'re offline')).toBeInTheDocument();
        expect(screen.getByTestId('wifi-off-icon')).toBeInTheDocument();
      });
    });

    it('shows online notification when coming back online', async () => {
      // Start offline
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false
      });
      
      render(<OfflineDetector showNotification={true} />);
      
      act(() => {
        simulateOnline();
      });
      
      await waitFor(() => {
        expect(screen.getByRole('status')).toBeInTheDocument();
        expect(screen.getByText('You\'re back online')).toBeInTheDocument();
        expect(screen.getByTestId('wifi-icon')).toBeInTheDocument();
      });
    });

    it('calls onStatusChange callback when status changes', async () => {
      const mockOnStatusChange = vi.fn();
      render(<OfflineDetector onStatusChange={mockOnStatusChange} />);
      
      act(() => {
        simulateOffline();
      });
      
      await waitFor(() => {
        expect(mockOnStatusChange).toHaveBeenCalledWith(false);
      });
      
      act(() => {
        simulateOnline();
      });
      
      await waitFor(() => {
        expect(mockOnStatusChange).toHaveBeenCalledWith(true);
      });
    });

    it('updates function children with offline status', async () => {
      render(
        <OfflineDetector>
          {({ isOnline }) => (
            <div data-testid="status">
              Status: {isOnline ? 'online' : 'offline'}
            </div>
          )}
        </OfflineDetector>
      );
      
      act(() => {
        simulateOffline();
      });
      
      await waitFor(() => {
        expect(screen.getByTestId('status')).toHaveTextContent('Status: offline');
      });
    });
  });

  describe('Notification Management', () => {
    it('hides notifications when showNotification is false', async () => {
      render(<OfflineDetector showNotification={false} />);
      
      act(() => {
        simulateOffline();
      });
      
      await waitFor(() => {
        expect(screen.queryByRole('alert')).not.toBeInTheDocument();
      });
    });

    it('allows dismissing offline notification', async () => {
      render(<OfflineDetector showNotification={true} />);
      
      act(() => {
        simulateOffline();
      });
      
      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
      });
      
      const dismissButton = screen.getByRole('button', { name: /dismiss offline notification/i });
      fireEvent.click(dismissButton);
      
      await waitFor(() => {
        expect(screen.queryByRole('alert')).not.toBeInTheDocument();
      });
    });

    it('auto-dismisses online notification after 3 seconds', async () => {
      // Start offline
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false
      });
      
      render(<OfflineDetector showNotification={true} />);
      
      act(() => {
        simulateOnline();
      });
      
      await waitFor(() => {
        expect(screen.getByRole('status')).toBeInTheDocument();
      });
      
      // Fast-forward 3 seconds
      act(() => {
        vi.advanceTimersByTime(3000);
      });
      
      await waitFor(() => {
        expect(screen.queryByRole('status')).not.toBeInTheDocument();
      });
    });

    it('does not auto-dismiss offline notification', async () => {
      render(<OfflineDetector showNotification={true} />);
      
      act(() => {
        simulateOffline();
      });
      
      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
      });
      
      // Fast-forward time
      act(() => {
        vi.advanceTimersByTime(5000);
      });
      
      // Should still be visible
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
  });

  describe('Content Styling', () => {
    it('applies offline styling to content when offline', async () => {
      render(
        <OfflineDetector>
          <div data-testid="content">Content</div>
        </OfflineDetector>
      );
      
      act(() => {
        simulateOffline();
      });
      
      await waitFor(() => {
        const content = screen.getByTestId('content').parentElement;
        expect(content).toHaveClass('offline-detector__content--offline');
      });
    });

    it('removes offline styling when back online', async () => {
      // Start offline
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false
      });
      
      render(
        <OfflineDetector>
          <div data-testid="content">Content</div>
        </OfflineDetector>
      );
      
      act(() => {
        simulateOnline();
      });
      
      await waitFor(() => {
        const content = screen.getByTestId('content').parentElement;
        expect(content).not.toHaveClass('offline-detector__content--offline');
      });
    });
  });

  describe('Initial State Detection', () => {
    it('detects initial offline state', async () => {
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false
      });
      
      const mockOnStatusChange = vi.fn();
      render(<OfflineDetector onStatusChange={mockOnStatusChange} showNotification={true} />);
      
      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
        expect(mockOnStatusChange).toHaveBeenCalledWith(false);
      });
    });

    it('detects initial online state correctly', () => {
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: true
      });
      
      render(
        <OfflineDetector>
          {({ isOnline }) => (
            <div data-testid="status">
              Status: {isOnline ? 'online' : 'offline'}
            </div>
          )}
        </OfflineDetector>
      );
      
      expect(screen.getByTestId('status')).toHaveTextContent('Status: online');
    });
  });

  describe('Accessibility', () => {
    it('uses proper ARIA attributes for offline notification', async () => {
      render(<OfflineDetector showNotification={true} />);
      
      act(() => {
        simulateOffline();
      });
      
      await waitFor(() => {
        const alert = screen.getByRole('alert');
        expect(alert).toHaveAttribute('aria-live', 'assertive');
      });
    });

    it('uses proper ARIA attributes for online notification', async () => {
      // Start offline
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false
      });
      
      render(<OfflineDetector showNotification={true} />);
      
      act(() => {
        simulateOnline();
      });
      
      await waitFor(() => {
        const status = screen.getByRole('status');
        expect(status).toHaveAttribute('aria-live', 'polite');
      });
    });

    it('has accessible dismiss button', async () => {
      render(<OfflineDetector showNotification={true} />);
      
      act(() => {
        simulateOffline();
      });
      
      await waitFor(() => {
        const dismissButton = screen.getByRole('button', { name: /dismiss offline notification/i });
        expect(dismissButton).toBeInTheDocument();
      });
    });
  });
});

describe('useOfflineDetection hook', () => {
  const TestComponent = () => {
    const isOnline = useOfflineDetection();
    return <div data-testid="status">{isOnline ? 'online' : 'offline'}</div>;
  };

  beforeEach(() => {
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: true
    });
  });

  it('returns current online status', () => {
    render(<TestComponent />);
    expect(screen.getByTestId('status')).toHaveTextContent('online');
  });

  it('updates when going offline', async () => {
    render(<TestComponent />);
    
    act(() => {
      simulateOffline();
    });
    
    await waitFor(() => {
      expect(screen.getByTestId('status')).toHaveTextContent('offline');
    });
  });

  it('updates when coming back online', async () => {
    // Start offline
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: false
    });
    
    render(<TestComponent />);
    expect(screen.getByTestId('status')).toHaveTextContent('offline');
    
    act(() => {
      simulateOnline();
    });
    
    await waitFor(() => {
      expect(screen.getByTestId('status')).toHaveTextContent('online');
    });
  });
});

describe('withOfflineDetection HOC', () => {
  const TestComponent = ({ isOnline, testProp }) => (
    <div>
      <div data-testid="status">{isOnline ? 'online' : 'offline'}</div>
      <div data-testid="prop">{testProp}</div>
    </div>
  );

  const WrappedComponent = withOfflineDetection(TestComponent);

  beforeEach(() => {
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: true
    });
  });

  it('passes isOnline prop to wrapped component', () => {
    render(<WrappedComponent testProp="test-value" />);
    
    expect(screen.getByTestId('status')).toHaveTextContent('online');
    expect(screen.getByTestId('prop')).toHaveTextContent('test-value');
  });

  it('updates isOnline prop when status changes', async () => {
    render(<WrappedComponent testProp="test-value" />);
    
    act(() => {
      simulateOffline();
    });
    
    await waitFor(() => {
      expect(screen.getByTestId('status')).toHaveTextContent('offline');
    });
  });

  it('preserves original component props', () => {
    render(<WrappedComponent testProp="preserved-value" />);
    
    expect(screen.getByTestId('prop')).toHaveTextContent('preserved-value');
  });

  it('sets correct display name', () => {
    expect(WrappedComponent.displayName).toBe('withOfflineDetection(TestComponent)');
  });
});