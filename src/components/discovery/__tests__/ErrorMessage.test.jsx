import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import ErrorMessage from '../ErrorMessage';

// Mock Lucide React icons
vi.mock('lucide-react', () => ({
    AlertTriangle: ({ className, size, ...props }) => (
        <div data-testid="alert-triangle-icon" className={className} data-size={size} {...props} />
    ),
    RefreshCw: ({ className, size, ...props }) => (
        <div data-testid="refresh-icon" className={className} data-size={size} {...props} />
    ),
    Wifi: ({ className, size, ...props }) => (
        <div data-testid="wifi-icon" className={className} data-size={size} {...props} />
    ),
    WifiOff: ({ className, size, ...props }) => (
        <div data-testid="wifi-off-icon" className={className} data-size={size} {...props} />
    ),
    X: ({ className, size, ...props }) => (
        <div data-testid="x-icon" className={className} data-size={size} {...props} />
    )
}));

describe('ErrorMessage', () => {
    beforeEach(() => {
        // Mock navigator.onLine
        Object.defineProperty(navigator, 'onLine', {
            writable: true,
            value: true
        });
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    describe('Basic Rendering', () => {
        it('renders error message with default props', () => {
            render(<ErrorMessage error="Test error message" />);

            expect(screen.getByRole('alert')).toBeInTheDocument();
            expect(screen.getByText('Something Went Wrong')).toBeInTheDocument();
            expect(screen.getByText('An unexpected error occurred.')).toBeInTheDocument();
        });

        it('does not render when no error is provided', () => {
            const { container } = render(<ErrorMessage />);
            expect(container.firstChild).toBeNull();
        });

        it('renders with custom className', () => {
            render(<ErrorMessage error="Test error" className="custom-class" />);

            const errorElement = screen.getByRole('alert');
            expect(errorElement).toHaveClass('custom-class');
        });

        it('renders in compact mode', () => {
            render(<ErrorMessage error="Test error" compact={true} />);

            const errorElement = screen.getByRole('alert');
            expect(errorElement).toHaveClass('error-message--compact');
        });
    });

    describe('Error Type Detection', () => {
        it('detects network errors automatically', () => {
            render(<ErrorMessage error="Network connection failed" type="auto" />);

            expect(screen.getByText('Connection Issue')).toBeInTheDocument();
            expect(screen.getByTestId('wifi-icon')).toBeInTheDocument();
        });

        it('detects API errors automatically', () => {
            render(<ErrorMessage error="YouTube API quota exceeded" type="auto" />);

            expect(screen.getByText('Service Unavailable')).toBeInTheDocument();
            expect(screen.getByText('The sample discovery service is temporarily unavailable.')).toBeInTheDocument();
        });

        it('detects storage errors automatically', () => {
            render(<ErrorMessage error="localStorage quota exceeded" type="auto" />);

            expect(screen.getByText('Storage Issue')).toBeInTheDocument();
            expect(screen.getByText('Unable to save your preferences. Your session data may not persist.')).toBeInTheDocument();
        });

        it('detects timeout errors automatically', () => {
            render(<ErrorMessage error="Request timeout exceeded" type="auto" />);

            expect(screen.getByText('Request Timeout')).toBeInTheDocument();
            expect(screen.getByText('The request is taking too long to complete.')).toBeInTheDocument();
        });

        it('detects video errors automatically', () => {
            render(<ErrorMessage error="Video player failed to load" type="auto" />);

            expect(screen.getByText('Video Error')).toBeInTheDocument();
            expect(screen.getByText('Unable to load or play the video.')).toBeInTheDocument();
        });

        it('uses explicit error type when provided', () => {
            render(<ErrorMessage error="Some error" type="network" />);

            expect(screen.getByText('Connection Issue')).toBeInTheDocument();
            expect(screen.getByTestId('wifi-icon')).toBeInTheDocument();
        });
    });

    describe('Offline Detection', () => {
        it('shows offline message when navigator.onLine is false', () => {
            Object.defineProperty(navigator, 'onLine', {
                writable: true,
                value: false
            });

            render(<ErrorMessage error="Network error" type="network" />);

            expect(screen.getByText('You\'re Offline')).toBeInTheDocument();
            expect(screen.getByText('You\'re currently offline. Some features may be limited.')).toBeInTheDocument();
            expect(screen.getByTestId('wifi-off-icon')).toBeInTheDocument();
        });

        it('shows online network error when navigator.onLine is true', () => {
            Object.defineProperty(navigator, 'onLine', {
                writable: true,
                value: true
            });

            render(<ErrorMessage error="Network error" type="network" />);

            expect(screen.getByText('Connection Issue')).toBeInTheDocument();
            expect(screen.getByText('Unable to connect to the discovery service. Please check your connection.')).toBeInTheDocument();
            expect(screen.getByTestId('wifi-icon')).toBeInTheDocument();
        });

        it('shows offline notice in actions when offline', () => {
            Object.defineProperty(navigator, 'onLine', {
                writable: true,
                value: false
            });

            render(<ErrorMessage error="Network error" type="network" />);

            expect(screen.getByText('Offline mode - limited functionality')).toBeInTheDocument();
        });
    });

    describe('Severity Levels', () => {
        it('applies error severity classes', () => {
            render(<ErrorMessage error="Test error" severity="error" />);

            const errorElement = screen.getByRole('alert');
            expect(errorElement).toHaveClass('error-message--error');
        });

        it('applies warning severity classes', () => {
            render(<ErrorMessage error="Test error" severity="warning" />);

            const errorElement = screen.getByRole('alert');
            expect(errorElement).toHaveClass('error-message--warning');
        });

        it('applies info severity classes', () => {
            render(<ErrorMessage error="Test error" severity="info" />);

            const errorElement = screen.getByRole('alert');
            expect(errorElement).toHaveClass('error-message--info');
        });

        it('uses auto severity based on error type', () => {
            render(<ErrorMessage error="Network error" type="network" severity="auto" />);

            const errorElement = screen.getByRole('alert');
            expect(errorElement).toHaveClass('error-message--warning');
        });
    });

    describe('Suggestions', () => {
        it('shows suggestions for network errors', () => {
            render(<ErrorMessage error="Network error" type="network" />);

            expect(screen.getByText('What you can try:')).toBeInTheDocument();
            expect(screen.getByText('Check your internet connection')).toBeInTheDocument();
            expect(screen.getByText('Try refreshing the page')).toBeInTheDocument();
        });

        it('shows different suggestions for API errors', () => {
            render(<ErrorMessage error="API error" type="api" />);

            expect(screen.getByText('Try again in a few minutes')).toBeInTheDocument();
            expect(screen.getByText('Demo samples are available')).toBeInTheDocument();
        });

        it('hides suggestions in compact mode', () => {
            render(<ErrorMessage error="Network error" type="network" compact={true} />);

            expect(screen.queryByText('What you can try:')).not.toBeInTheDocument();
        });
    });

    describe('Retry Functionality', () => {
        it('shows retry button when onRetry is provided', () => {
            const mockOnRetry = vi.fn();
            render(<ErrorMessage error="Test error" onRetry={mockOnRetry} />);

            expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
        });

        it('calls onRetry when retry button is clicked', () => {
            const mockOnRetry = vi.fn();
            render(<ErrorMessage error="Test error" onRetry={mockOnRetry} />);

            const retryButton = screen.getByRole('button', { name: /try again/i });
            fireEvent.click(retryButton);

            expect(mockOnRetry).toHaveBeenCalledTimes(1);
        });

        it('shows loading state during retry', async () => {
            const mockOnRetry = vi.fn(() => new Promise(resolve => setTimeout(resolve, 100)));
            render(<ErrorMessage error="Test error" onRetry={mockOnRetry} />);

            const retryButton = screen.getByRole('button', { name: /try again/i });
            fireEvent.click(retryButton);

            expect(screen.getByText('Retrying...')).toBeInTheDocument();
            expect(retryButton).toBeDisabled();

            await waitFor(() => {
                expect(screen.getByText('Try Again')).toBeInTheDocument();
            });
        });

        it('hides retry button when showRetry is false', () => {
            const mockOnRetry = vi.fn();
            render(<ErrorMessage error="Test error" onRetry={mockOnRetry} showRetry={false} />);

            expect(screen.queryByRole('button', { name: /try again/i })).not.toBeInTheDocument();
        });

        it('hides retry button for non-retryable errors', () => {
            const mockOnRetry = vi.fn();
            render(<ErrorMessage error="Storage error" type="storage" onRetry={mockOnRetry} />);

            expect(screen.queryByRole('button', { name: /try again/i })).not.toBeInTheDocument();
        });
    });

    describe('Dismiss Functionality', () => {
        it('shows dismiss button when onDismiss is provided', () => {
            const mockOnDismiss = vi.fn();
            render(<ErrorMessage error="Test error" onDismiss={mockOnDismiss} />);

            expect(screen.getByRole('button', { name: /dismiss error message/i })).toBeInTheDocument();
        });

        it('calls onDismiss when dismiss button is clicked', () => {
            const mockOnDismiss = vi.fn();
            render(<ErrorMessage error="Test error" onDismiss={mockOnDismiss} />);

            const dismissButton = screen.getByRole('button', { name: /dismiss error message/i });
            fireEvent.click(dismissButton);

            expect(mockOnDismiss).toHaveBeenCalledTimes(1);
        });

        it('hides dismiss button when showDismiss is false', () => {
            const mockOnDismiss = vi.fn();
            render(<ErrorMessage error="Test error" onDismiss={mockOnDismiss} showDismiss={false} />);

            expect(screen.queryByRole('button', { name: /dismiss error message/i })).not.toBeInTheDocument();
        });
    });

    describe('Technical Details', () => {
        const originalNodeEnv = process.env.NODE_ENV;

        afterEach(() => {
            process.env.NODE_ENV = originalNodeEnv;
        });

        it('shows technical details in development mode', () => {
            process.env.NODE_ENV = 'development';

            render(<ErrorMessage error="Development test error" />);

            expect(screen.getByText('Technical Details (Development)')).toBeInTheDocument();
        });

        it('hides technical details in production mode', () => {
            process.env.NODE_ENV = 'production';

            render(<ErrorMessage error="Production test error" />);

            expect(screen.queryByText('Technical Details (Development)')).not.toBeInTheDocument();
        });

        it('shows error details when expanded in development', () => {
            process.env.NODE_ENV = 'development';

            render(<ErrorMessage error="Development test error" />);

            const detailsElement = screen.getByText('Technical Details (Development)');
            fireEvent.click(detailsElement);

            expect(screen.getByText('Development test error')).toBeInTheDocument();
        });

        it('handles object errors in technical details', () => {
            process.env.NODE_ENV = 'development';
            const errorObject = { message: 'Object error', code: 500 };

            render(<ErrorMessage error={errorObject} />);

            const detailsElement = screen.getByText('Technical Details (Development)');
            fireEvent.click(detailsElement);

            expect(screen.getByText(JSON.stringify(errorObject, null, 2))).toBeInTheDocument();
        });
    });

    describe('Accessibility', () => {
        it('has proper ARIA attributes', () => {
            render(<ErrorMessage error="Test error" />);

            const errorElement = screen.getByRole('alert');
            expect(errorElement).toHaveAttribute('aria-live', 'polite');
        });

        it('has accessible button labels', () => {
            const mockOnRetry = vi.fn();
            const mockOnDismiss = vi.fn();

            render(
                <ErrorMessage
                    error="Test error"
                    onRetry={mockOnRetry}
                    onDismiss={mockOnDismiss}
                />
            );

            expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
            expect(screen.getByRole('button', { name: /dismiss error message/i })).toBeInTheDocument();
        });

        it('has proper icon accessibility attributes', () => {
            render(<ErrorMessage error="Test error" />);

            const icon = screen.getByTestId('alert-triangle-icon');
            expect(icon).toHaveAttribute('aria-hidden', 'true');
        });

        it('maintains focus management for interactive elements', () => {
            const mockOnRetry = vi.fn();
            render(<ErrorMessage error="Test error" onRetry={mockOnRetry} />);

            const retryButton = screen.getByRole('button', { name: /try again/i });
            retryButton.focus();

            expect(document.activeElement).toBe(retryButton);
        });
    });

    describe('Icon Sizing', () => {
        it('uses correct icon size for normal mode', () => {
            render(<ErrorMessage error="Test error" />);

            const icon = screen.getByTestId('alert-triangle-icon');
            expect(icon).toHaveAttribute('data-size', '20');
        });

        it('uses smaller icon size for compact mode', () => {
            render(<ErrorMessage error="Test error" compact={true} />);

            const icon = screen.getByTestId('alert-triangle-icon');
            expect(icon).toHaveAttribute('data-size', '16');
        });
    });

    describe('Error Handling', () => {
        it('handles retry failures gracefully', async () => {
            const mockOnRetry = vi.fn().mockRejectedValue(new Error('Retry failed'));
            const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => { });

            render(<ErrorMessage error="Test error" onRetry={mockOnRetry} />);

            const retryButton = screen.getByRole('button', { name: /try again/i });
            fireEvent.click(retryButton);

            await waitFor(() => {
                expect(consoleSpy).toHaveBeenCalledWith('Retry failed:', expect.any(Error));
            });

            consoleSpy.mockRestore();
        });

        it('prevents multiple simultaneous retry attempts', async () => {
            const mockOnRetry = vi.fn(() => new Promise(resolve => setTimeout(resolve, 100)));
            render(<ErrorMessage error="Test error" onRetry={mockOnRetry} />);

            const retryButton = screen.getByRole('button', { name: /try again/i });

            // Click multiple times rapidly
            fireEvent.click(retryButton);
            fireEvent.click(retryButton);
            fireEvent.click(retryButton);

            // Should only be called once
            expect(mockOnRetry).toHaveBeenCalledTimes(1);
        });
    });

    describe('Responsive Behavior', () => {
        it('renders properly on different screen sizes', () => {
            render(<ErrorMessage error="Test error" />);

            const errorElement = screen.getByRole('alert');
            expect(errorElement).toHaveClass('error-message');

            // Component should be responsive via CSS
            expect(errorElement).toBeInTheDocument();
        });
    });
});