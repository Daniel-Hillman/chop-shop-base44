import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import DiscoveryErrorBoundary from '../DiscoveryErrorBoundary';

// Mock child component that can throw errors
const ThrowError = ({ shouldThrow, errorType, errorMessage }) => {
    if (shouldThrow) {
        const error = new Error(errorMessage || 'Test error');
        if (errorType) {
            error.name = errorType;
        }
        throw error;
    }
    return <div data-testid="child-component">Child component rendered successfully</div>;
};

// Mock console methods to avoid noise in tests
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;
const originalConsoleLog = console.log;

describe('DiscoveryErrorBoundary', () => {
    let mockOnError;
    let mockOnRetry;
    let mockOnReset;

    beforeEach(() => {
        // Mock console methods
        console.error = vi.fn();
        console.warn = vi.fn();
        console.log = vi.fn();

        // Mock callback functions
        mockOnError = vi.fn();
        mockOnRetry = vi.fn().mockResolvedValue();
        mockOnReset = vi.fn();

        // Mock navigator.onLine
        Object.defineProperty(navigator, 'onLine', {
            writable: true,
            value: true
        });

        // Mock localStorage
        const localStorageMock = {
            getItem: vi.fn(() => '[]'),
            setItem: vi.fn(),
            removeItem: vi.fn()
        };
        Object.defineProperty(window, 'localStorage', {
            value: localStorageMock
        });

        // Mock window.location
        Object.defineProperty(window, 'location', {
            value: {
                href: 'http://localhost:3000/sample-discovery',
                assign: vi.fn(),
                reload: vi.fn()
            },
            writable: true
        });

        // Clear any existing error reporter
        delete window.discoveryErrorReporter;
    });

    afterEach(() => {
        // Restore console methods
        console.error = originalConsoleError;
        console.warn = originalConsoleWarn;
        console.log = originalConsoleLog;

        // Clear mocks
        vi.clearAllMocks();
    });

    describe('Normal Operation', () => {
        it('renders children when no error occurs', () => {
            render(
                <DiscoveryErrorBoundary>
                    <ThrowError shouldThrow={false} />
                </DiscoveryErrorBoundary>
            );

            expect(screen.getByTestId('child-component')).toBeInTheDocument();
            expect(screen.getByText('Child component rendered successfully')).toBeInTheDocument();
        });

        it('does not call error callbacks when no error occurs', () => {
            render(
                <DiscoveryErrorBoundary onError={mockOnError} onRetry={mockOnRetry} onReset={mockOnReset}>
                    <ThrowError shouldThrow={false} />
                </DiscoveryErrorBoundary>
            );

            expect(mockOnError).not.toHaveBeenCalled();
            expect(mockOnRetry).not.toHaveBeenCalled();
            expect(mockOnReset).not.toHaveBeenCalled();
        });
    });

    describe('Error Handling', () => {
        it('catches and displays error when child component throws', () => {
            render(
                <DiscoveryErrorBoundary>
                    <ThrowError shouldThrow={true} errorMessage="Test component error" />
                </DiscoveryErrorBoundary>
            );

            expect(screen.getByText('Discovery Feature Error')).toBeInTheDocument();
            expect(screen.getByText(/An unexpected error occurred in the sample discovery feature/)).toBeInTheDocument();
            expect(screen.queryByTestId('child-component')).not.toBeInTheDocument();
        });

        it('calls onError callback when error occurs', () => {
            render(
                <DiscoveryErrorBoundary onError={mockOnError}>
                    <ThrowError shouldThrow={true} errorMessage="Test error" />
                </DiscoveryErrorBoundary>
            );

            expect(mockOnError).toHaveBeenCalledWith(
                expect.any(Error),
                expect.objectContaining({
                    componentStack: expect.any(String)
                }),
                'SampleDiscovery'
            );
        });

        it('logs error to localStorage', () => {
            render(
                <DiscoveryErrorBoundary>
                    <ThrowError shouldThrow={true} errorMessage="Storage test error" />
                </DiscoveryErrorBoundary>
            );

            expect(localStorage.setItem).toHaveBeenCalledWith(
                'discoveryErrorLogs',
                expect.stringContaining('Storage test error')
            );
        });

        it('generates unique error ID and timestamp', () => {
            render(
                <DiscoveryErrorBoundary>
                    <ThrowError shouldThrow={true} errorMessage="ID test error" />
                </DiscoveryErrorBoundary>
            );

            expect(screen.getByText('Error ID for support:')).toBeInTheDocument();
            expect(screen.getByText(/discovery-error-\d+-[a-z0-9]+/)).toBeInTheDocument();
            expect(screen.getByText(/Time: \d+\/\d+\/\d+/)).toBeInTheDocument();
        });
    });

    describe('Error Type Detection', () => {
        it('detects network errors correctly', () => {
            render(
                <DiscoveryErrorBoundary>
                    <ThrowError shouldThrow={true} errorMessage="Network connection failed" />
                </DiscoveryErrorBoundary>
            );

            expect(screen.getByText('Network Connection Error')).toBeInTheDocument();
            expect(screen.getByText(/Unable to connect to the sample discovery service/)).toBeInTheDocument();
        });

        it('detects API errors correctly', () => {
            render(
                <DiscoveryErrorBoundary>
                    <ThrowError shouldThrow={true} errorMessage="YouTube API quota exceeded" />
                </DiscoveryErrorBoundary>
            );

            expect(screen.getByText('Discovery Service Error')).toBeInTheDocument();
            expect(screen.getByText(/The sample discovery service is currently unavailable/)).toBeInTheDocument();
        });

        it('detects storage errors correctly', () => {
            render(
                <DiscoveryErrorBoundary>
                    <ThrowError shouldThrow={true} errorMessage="localStorage quota exceeded" />
                </DiscoveryErrorBoundary>
            );

            expect(screen.getByText('Storage Error')).toBeInTheDocument();
            expect(screen.getByText(/Unable to save or retrieve your discovery preferences/)).toBeInTheDocument();
        });

        it('detects component errors correctly', () => {
            render(
                <DiscoveryErrorBoundary>
                    <ThrowError shouldThrow={true} errorMessage="React component render error" />
                </DiscoveryErrorBoundary>
            );

            expect(screen.getByText('Discovery Component Error')).toBeInTheDocument();
            expect(screen.getByText(/A component in the sample discovery feature encountered an error/)).toBeInTheDocument();
        });

        it('detects timeout errors correctly', () => {
            render(
                <DiscoveryErrorBoundary>
                    <ThrowError shouldThrow={true} errorMessage="Request timeout after 30 seconds" />
                </DiscoveryErrorBoundary>
            );

            expect(screen.getByText('Discovery Timeout')).toBeInTheDocument();
            expect(screen.getByText(/The sample discovery is taking too long to respond/)).toBeInTheDocument();
        });

        it('handles unknown errors with generic message', () => {
            render(
                <DiscoveryErrorBoundary>
                    <ThrowError shouldThrow={true} errorMessage="Some unknown error type" />
                </DiscoveryErrorBoundary>
            );

            expect(screen.getByText('Discovery Feature Error')).toBeInTheDocument();
            expect(screen.getByText('Some unknown error type')).toBeInTheDocument();
        });
    });

    describe('Online/Offline Detection', () => {
        it('shows offline message when navigator.onLine is false', () => {
            Object.defineProperty(navigator, 'onLine', {
                writable: true,
                value: false
            });

            render(
                <DiscoveryErrorBoundary>
                    <ThrowError shouldThrow={true} errorMessage="Network error" />
                </DiscoveryErrorBoundary>
            );

            expect(screen.getByText(/You appear to be offline/)).toBeInTheDocument();
            expect(screen.getByText(/Connect to the internet/)).toBeInTheDocument();
        });

        it('shows online network error message when navigator.onLine is true', () => {
            Object.defineProperty(navigator, 'onLine', {
                writable: true,
                value: true
            });

            render(
                <DiscoveryErrorBoundary>
                    <ThrowError shouldThrow={true} errorMessage="Network error" />
                </DiscoveryErrorBoundary>
            );

            expect(screen.getByText(/Unable to connect to the sample discovery service/)).toBeInTheDocument();
            expect(screen.getByText(/Check your internet connection/)).toBeInTheDocument();
        });
    });

    describe('Retry Functionality', () => {
        it('shows retry button for retryable errors', () => {
            render(
                <DiscoveryErrorBoundary onRetry={mockOnRetry}>
                    <ThrowError shouldThrow={true} errorMessage="Network error" />
                </DiscoveryErrorBoundary>
            );

            const retryButton = screen.getByRole('button', { name: /Try Again/ });
            expect(retryButton).toBeInTheDocument();
            expect(retryButton).not.toBeDisabled();
        });

        it('calls onRetry when retry button is clicked', async () => {
            render(
                <DiscoveryErrorBoundary onRetry={mockOnRetry}>
                    <ThrowError shouldThrow={true} errorMessage="Network error" />
                </DiscoveryErrorBoundary>
            );

            const retryButton = screen.getByRole('button', { name: /Try Again/ });
            fireEvent.click(retryButton);

            expect(mockOnRetry).toHaveBeenCalledTimes(1);
        });

        it('shows loading state during retry', async () => {
            const slowRetry = vi.fn(() => new Promise(resolve => setTimeout(resolve, 100)));

            render(
                <DiscoveryErrorBoundary onRetry={slowRetry}>
                    <ThrowError shouldThrow={true} errorMessage="Network error" />
                </DiscoveryErrorBoundary>
            );

            const retryButton = screen.getByRole('button', { name: /Try Again/ });
            fireEvent.click(retryButton);

            expect(screen.getByText('Retrying...')).toBeInTheDocument();
            expect(retryButton).toBeDisabled();

            await waitFor(() => {
                expect(slowRetry).toHaveBeenCalled();
            });
        });

        it('shows retry count after multiple attempts', async () => {
            render(
                <DiscoveryErrorBoundary onRetry={mockOnRetry}>
                    <ThrowError shouldThrow={true} errorMessage="Network error" />
                </DiscoveryErrorBoundary>
            );

            const retryButton = screen.getByRole('button', { name: /Try Again/ });

            // First retry
            fireEvent.click(retryButton);
            await waitFor(() => {
                expect(screen.getByRole('button', { name: /Try Again \(2\)/ })).toBeInTheDocument();
            });

            // Second retry
            fireEvent.click(screen.getByRole('button', { name: /Try Again \(2\)/ }));
            await waitFor(() => {
                expect(screen.getByRole('button', { name: /Try Again \(3\)/ })).toBeInTheDocument();
            });
        });

        it('resets error state on successful retry', async () => {
            let shouldThrow = true;
            const TestComponent = () => <ThrowError shouldThrow={shouldThrow} />;

            const successfulRetry = vi.fn(() => {
                shouldThrow = false;
                return Promise.resolve();
            });

            const { rerender } = render(
                <DiscoveryErrorBoundary onRetry={successfulRetry}>
                    <TestComponent />
                </DiscoveryErrorBoundary>
            );

            // Error should be displayed
            expect(screen.getByText('Discovery Feature Error')).toBeInTheDocument();

            // Click retry
            const retryButton = screen.getByRole('button', { name: /Try Again/ });
            fireEvent.click(retryButton);

            await waitFor(() => {
                expect(successfulRetry).toHaveBeenCalled();
            });

            // Rerender with successful state
            rerender(
                <DiscoveryErrorBoundary onRetry={successfulRetry}>
                    <TestComponent />
                </DiscoveryErrorBoundary>
            );

            // Wait for error state to clear
            await waitFor(() => {
                expect(screen.queryByText('Discovery Feature Error')).not.toBeInTheDocument();
            });
        });

        it('handles retry failure gracefully', async () => {
            const failingRetry = vi.fn().mockRejectedValue(new Error('Retry failed'));

            render(
                <DiscoveryErrorBoundary onRetry={failingRetry}>
                    <ThrowError shouldThrow={true} errorMessage="Network error" />
                </DiscoveryErrorBoundary>
            );

            const retryButton = screen.getByRole('button', { name: /Try Again/ });
            fireEvent.click(retryButton);

            await waitFor(() => {
                expect(failingRetry).toHaveBeenCalled();
            });

            // Should still show error state
            expect(screen.getByText('Network Connection Error')).toBeInTheDocument();
            expect(retryButton).not.toBeDisabled();
        });
    });

    describe('Reset Functionality', () => {
        it('shows reset button', () => {
            render(
                <DiscoveryErrorBoundary onReset={mockOnReset}>
                    <ThrowError shouldThrow={true} errorMessage="Test error" />
                </DiscoveryErrorBoundary>
            );

            expect(screen.getByRole('button', { name: /Reset Discovery/ })).toBeInTheDocument();
        });

        it('calls onReset when reset button is clicked', () => {
            render(
                <DiscoveryErrorBoundary onReset={mockOnReset}>
                    <ThrowError shouldThrow={true} errorMessage="Test error" />
                </DiscoveryErrorBoundary>
            );

            const resetButton = screen.getByRole('button', { name: /Reset Discovery/ });
            fireEvent.click(resetButton);

            expect(mockOnReset).toHaveBeenCalledTimes(1);
        });

        it('resets error state when reset button is clicked', () => {
            const { rerender } = render(
                <DiscoveryErrorBoundary onReset={mockOnReset}>
                    <ThrowError shouldThrow={true} errorMessage="Test error" />
                </DiscoveryErrorBoundary>
            );

            expect(screen.getByText('Discovery Feature Error')).toBeInTheDocument();

            const resetButton = screen.getByRole('button', { name: /Reset Discovery/ });
            fireEvent.click(resetButton);

            // Rerender with no error
            rerender(
                <DiscoveryErrorBoundary onReset={mockOnReset}>
                    <ThrowError shouldThrow={false} />
                </DiscoveryErrorBoundary>
            );

            expect(screen.queryByText('Discovery Feature Error')).not.toBeInTheDocument();
            expect(screen.getByTestId('child-component')).toBeInTheDocument();
        });
    });

    describe('Navigation Buttons', () => {
        it('shows navigation buttons', () => {
            render(
                <DiscoveryErrorBoundary>
                    <ThrowError shouldThrow={true} errorMessage="Test error" />
                </DiscoveryErrorBoundary>
            );

            expect(screen.getByRole('button', { name: /Go to Chopper/ })).toBeInTheDocument();
            expect(screen.getByRole('button', { name: /Go Home/ })).toBeInTheDocument();
        });

        it('navigates to chopper when chopper button is clicked', () => {
            render(
                <DiscoveryErrorBoundary>
                    <ThrowError shouldThrow={true} errorMessage="Test error" />
                </DiscoveryErrorBoundary>
            );

            const chopperButton = screen.getByRole('button', { name: /Go to Chopper/ });
            fireEvent.click(chopperButton);

            expect(window.location.href).toBe('/chopper');
        });

        it('navigates to home when home button is clicked', () => {
            render(
                <DiscoveryErrorBoundary>
                    <ThrowError shouldThrow={true} errorMessage="Test error" />
                </DiscoveryErrorBoundary>
            );

            const homeButton = screen.getByRole('button', { name: /Go Home/ });
            fireEvent.click(homeButton);

            expect(window.location.href).toBe('/');
        });
    });

    describe('Fallback Messages', () => {
        it('shows fallback message for API errors', () => {
            render(
                <DiscoveryErrorBoundary>
                    <ThrowError shouldThrow={true} errorMessage="YouTube API error" />
                </DiscoveryErrorBoundary>
            );

            expect(screen.getByText(/Good news:/)).toBeInTheDocument();
            expect(screen.getByText(/The app will automatically fall back to demo samples/)).toBeInTheDocument();
        });

        it('shows fallback message for network errors', () => {
            render(
                <DiscoveryErrorBoundary>
                    <ThrowError shouldThrow={true} errorMessage="Network connection failed" />
                </DiscoveryErrorBoundary>
            );

            expect(screen.getByText(/Good news:/)).toBeInTheDocument();
            expect(screen.getByText(/The app will automatically fall back to demo samples/)).toBeInTheDocument();
        });

        it('does not show fallback message for component errors', () => {
            render(
                <DiscoveryErrorBoundary>
                    <ThrowError shouldThrow={true} errorMessage="React component error" />
                </DiscoveryErrorBoundary>
            );

            expect(screen.queryByText(/Good news:/)).not.toBeInTheDocument();
            expect(screen.queryByText(/The app will automatically fall back to demo samples/)).not.toBeInTheDocument();
        });

        it('always shows isolation message', () => {
            render(
                <DiscoveryErrorBoundary>
                    <ThrowError shouldThrow={true} errorMessage="Test error" />
                </DiscoveryErrorBoundary>
            );

            expect(screen.getByText(/Don't worry:/)).toBeInTheDocument();
            expect(screen.getByText(/This error is isolated to the discovery feature/)).toBeInTheDocument();
            expect(screen.getByText(/Your main chopper functionality and all other features are working normally/)).toBeInTheDocument();
        });
    });

    describe('Error Suggestions', () => {
        it('shows appropriate suggestions for network errors', () => {
            render(
                <DiscoveryErrorBoundary>
                    <ThrowError shouldThrow={true} errorMessage="Network error" />
                </DiscoveryErrorBoundary>
            );

            expect(screen.getByText('What you can do:')).toBeInTheDocument();
            expect(screen.getByText(/Check your internet connection/)).toBeInTheDocument();
            expect(screen.getByText(/Try refreshing the page/)).toBeInTheDocument();
        });

        it('shows appropriate suggestions for API errors', () => {
            render(
                <DiscoveryErrorBoundary>
                    <ThrowError shouldThrow={true} errorMessage="YouTube API error" />
                </DiscoveryErrorBoundary>
            );

            expect(screen.getByText('What you can do:')).toBeInTheDocument();
            expect(screen.getByText(/Try again in a few minutes/)).toBeInTheDocument();
            expect(screen.getByText(/Check if YouTube is accessible/)).toBeInTheDocument();
        });

        it('shows appropriate suggestions for storage errors', () => {
            render(
                <DiscoveryErrorBoundary>
                    <ThrowError shouldThrow={true} errorMessage="localStorage quota exceeded" />
                </DiscoveryErrorBoundary>
            );

            expect(screen.getByText('What you can do:')).toBeInTheDocument();
            expect(screen.getByText(/Check if you have enough storage space/)).toBeInTheDocument();
            expect(screen.getByText(/Clear browser cache if needed/)).toBeInTheDocument();
        });
    });

    describe('Development Mode Features', () => {
        const originalNodeEnv = process.env.NODE_ENV;

        afterEach(() => {
            process.env.NODE_ENV = originalNodeEnv;
        });

        it('shows technical details in development mode', () => {
            process.env.NODE_ENV = 'development';

            render(
                <DiscoveryErrorBoundary>
                    <ThrowError shouldThrow={true} errorMessage="Development test error" />
                </DiscoveryErrorBoundary>
            );

            expect(screen.getByText('Technical Details (Development Mode)')).toBeInTheDocument();
        });

        it('hides technical details in production mode', () => {
            process.env.NODE_ENV = 'production';

            render(
                <DiscoveryErrorBoundary>
                    <ThrowError shouldThrow={true} errorMessage="Production test error" />
                </DiscoveryErrorBoundary>
            );

            expect(screen.queryByText('Technical Details (Development Mode)')).not.toBeInTheDocument();
        });

        it('shows error details when technical details are expanded', () => {
            process.env.NODE_ENV = 'development';

            render(
                <DiscoveryErrorBoundary>
                    <ThrowError shouldThrow={true} errorMessage="Development test error" />
                </DiscoveryErrorBoundary>
            );

            const detailsElement = screen.getByText('Technical Details (Development Mode)');
            fireEvent.click(detailsElement);

            expect(screen.getByText(/Error:/)).toBeInTheDocument();
            expect(screen.getByText(/Type:/)).toBeInTheDocument();
            expect(screen.getByText(/Stack:/)).toBeInTheDocument();
            expect(screen.getByText(/Component Stack:/)).toBeInTheDocument();
            expect(screen.getByText(/Retry Count:/)).toBeInTheDocument();
            expect(screen.getByText(/Online:/)).toBeInTheDocument();
        });
    });

    describe('External Error Reporting', () => {
        it('calls external error reporter when available', () => {
            const mockErrorReporter = vi.fn();
            window.discoveryErrorReporter = mockErrorReporter;

            render(
                <DiscoveryErrorBoundary>
                    <ThrowError shouldThrow={true} errorMessage="External reporting test" />
                </DiscoveryErrorBoundary>
            );

            expect(mockErrorReporter).toHaveBeenCalledWith(
                expect.objectContaining({
                    error: expect.any(Error),
                    errorInfo: expect.any(Object),
                    errorId: expect.stringMatching(/discovery-error-\d+-[a-z0-9]+/),
                    timestamp: expect.any(String),
                    component: 'DiscoveryErrorBoundary'
                })
            );
        });

        it('handles external error reporter failures gracefully', () => {
            const mockErrorReporter = vi.fn(() => {
                throw new Error('Reporter failed');
            });
            window.discoveryErrorReporter = mockErrorReporter;

            expect(() => {
                render(
                    <DiscoveryErrorBoundary>
                        <ThrowError shouldThrow={true} errorMessage="Reporter failure test" />
                    </DiscoveryErrorBoundary>
                );
            }).not.toThrow();

            expect(mockErrorReporter).toHaveBeenCalled();
        });
    });

    describe('Accessibility', () => {
        it('has proper ARIA labels and roles', () => {
            render(
                <DiscoveryErrorBoundary>
                    <ThrowError shouldThrow={true} errorMessage="Accessibility test" />
                </DiscoveryErrorBoundary>
            );

            const buttons = screen.getAllByRole('button');
            expect(buttons.length).toBeGreaterThan(0);

            buttons.forEach(button => {
                expect(button).toHaveAccessibleName();
            });
        });

        it('maintains focus management', () => {
            render(
                <DiscoveryErrorBoundary>
                    <ThrowError shouldThrow={true} errorMessage="Focus test" />
                </DiscoveryErrorBoundary>
            );

            const retryButton = screen.getByRole('button', { name: /Try Again/ });
            retryButton.focus();
            expect(document.activeElement).toBe(retryButton);
        });
    });

    describe('Error Boundary Isolation', () => {
        it('prevents errors from bubbling up to parent components', () => {
            const ParentComponent = ({ children }) => {
                return <div data-testid="parent-component">{children}</div>;
            };

            render(
                <ParentComponent>
                    <DiscoveryErrorBoundary>
                        <ThrowError shouldThrow={true} errorMessage="Isolation test" />
                    </DiscoveryErrorBoundary>
                </ParentComponent>
            );

            // Parent component should still render
            expect(screen.getByTestId('parent-component')).toBeInTheDocument();

            // Error boundary should catch the error
            expect(screen.getByText('Discovery Feature Error')).toBeInTheDocument();
        });

        it('maintains component tree structure around error boundary', () => {
            const SiblingComponent = () => <div data-testid="sibling-component">Sibling</div>;

            render(
                <div>
                    <SiblingComponent />
                    <DiscoveryErrorBoundary>
                        <ThrowError shouldThrow={true} errorMessage="Sibling isolation test" />
                    </DiscoveryErrorBoundary>
                </div>
            );

            // Sibling component should still render normally
            expect(screen.getByTestId('sibling-component')).toBeInTheDocument();
            expect(screen.getByText('Sibling')).toBeInTheDocument();

            // Error boundary should handle the error
            expect(screen.getByText('Discovery Feature Error')).toBeInTheDocument();
        });
    });
});