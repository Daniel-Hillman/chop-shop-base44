import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import DiscoveryVideoPlayerErrorBoundary from '../DiscoveryVideoPlayerErrorBoundary';

// Mock child component that can throw errors
const ThrowError = ({ shouldThrow, errorMessage }) => {
    if (shouldThrow) {
        throw new Error(errorMessage || 'Test error');
    }
    return <div data-testid="child-component">Child component</div>;
};

// Mock UI components
vi.mock('../../ui/button', () => ({
    Button: ({ children, onClick, disabled, className, ...props }) => (
        <button
            onClick={onClick}
            disabled={disabled}
            className={className}
            data-testid={props['data-testid'] || 'button'}
            {...props}
        >
            {children}
        </button>
    )
}));

vi.mock('../../ui/alert', () => ({
    Alert: ({ children, className }) => (
        <div className={className} data-testid="alert">{children}</div>
    ),
    AlertDescription: ({ children, className }) => (
        <div className={className} data-testid="alert-description">{children}</div>
    )
}));

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
    Video: () => <div data-testid="video-icon" />,
    VideoOff: () => <div data-testid="video-off-icon" />,
    AlertTriangle: () => <div data-testid="alert-triangle-icon" />,
    RefreshCw: () => <div data-testid="refresh-icon" />,
    Wifi: () => <div data-testid="wifi-icon" />,
    WifiOff: () => <div data-testid="wifi-off-icon" />,
    ExternalLink: () => <div data-testid="external-link-icon" />
}));

describe('DiscoveryVideoPlayerErrorBoundary', () => {
    let consoleErrorSpy;

    beforeEach(() => {
        consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
    });

    afterEach(() => {
        consoleErrorSpy.mockRestore();
    });

    it('renders children when there is no error', () => {
        render(
            <DiscoveryVideoPlayerErrorBoundary>
                <ThrowError shouldThrow={false} />
            </DiscoveryVideoPlayerErrorBoundary>
        );

        expect(screen.getByTestId('child-component')).toBeInTheDocument();
        expect(screen.queryByTestId('alert')).not.toBeInTheDocument();
    });

    it('catches and displays error when child component throws', () => {
        render(
            <DiscoveryVideoPlayerErrorBoundary>
                <ThrowError shouldThrow={true} errorMessage="YouTube player failed" />
            </DiscoveryVideoPlayerErrorBoundary>
        );

        expect(screen.queryByTestId('child-component')).not.toBeInTheDocument();
        expect(screen.getByTestId('alert')).toBeInTheDocument();
        expect(screen.getByText('Discovery Video Player Error')).toBeInTheDocument();
    });

    it('calls onError callback when error occurs', () => {
        const onError = vi.fn();

        render(
            <DiscoveryVideoPlayerErrorBoundary onError={onError}>
                <ThrowError shouldThrow={true} errorMessage="Test error" />
            </DiscoveryVideoPlayerErrorBoundary>
        );

        expect(onError).toHaveBeenCalledWith(
            expect.any(Error),
            expect.any(Object),
            'DiscoveryVideoPlayer'
        );
    });

    it('displays sample information when provided', () => {
        const sample = {
            title: 'Test Sample',
            artist: 'Test Artist',
            year: '2023',
            genre: 'Hip Hop'
        };

        render(
            <DiscoveryVideoPlayerErrorBoundary sample={sample} videoId="test123">
                <ThrowError shouldThrow={true} />
            </DiscoveryVideoPlayerErrorBoundary>
        );

        expect(screen.getByText('Test Sample')).toBeInTheDocument();
        expect(screen.getByText('Test Artist • 2023 • Hip Hop')).toBeInTheDocument();
        expect(screen.getByText('test123')).toBeInTheDocument();
    });

    it('handles retry functionality', async () => {
        const onRetry = vi.fn().mockResolvedValue();

        render(
            <DiscoveryVideoPlayerErrorBoundary onRetry={onRetry}>
                <ThrowError shouldThrow={true} />
            </DiscoveryVideoPlayerErrorBoundary>
        );

        const retryButton = screen.getByText(/Retry Player/);
        fireEvent.click(retryButton);

        expect(onRetry).toHaveBeenCalled();
        expect(screen.getByText('Retrying...')).toBeInTheDocument();

        await waitFor(() => {
            expect(screen.queryByTestId('alert')).not.toBeInTheDocument();
        });
    });

    it('handles reset functionality', () => {
        const onReset = vi.fn();

        render(
            <DiscoveryVideoPlayerErrorBoundary onReset={onReset}>
                <ThrowError shouldThrow={true} />
            </DiscoveryVideoPlayerErrorBoundary>
        );

        const resetButton = screen.getByText('Reset Player');
        fireEvent.click(resetButton);

        expect(onReset).toHaveBeenCalled();
    });

    it('shows "Open in YouTube" button when videoId is provided', () => {
        const originalOpen = window.open;
        window.open = vi.fn();

        render(
            <DiscoveryVideoPlayerErrorBoundary videoId="test123">
                <ThrowError shouldThrow={true} />
            </DiscoveryVideoPlayerErrorBoundary>
        );

        const youtubeButton = screen.getByText('Open in YouTube');
        fireEvent.click(youtubeButton);

        expect(window.open).toHaveBeenCalledWith('https://www.youtube.com/watch?v=test123', '_blank');

        window.open = originalOpen;
    });

    it('shows "Try Different Sample" button when callback is provided', () => {
        const onSelectDifferentSample = vi.fn();

        render(
            <DiscoveryVideoPlayerErrorBoundary onSelectDifferentSample={onSelectDifferentSample}>
                <ThrowError shouldThrow={true} />
            </DiscoveryVideoPlayerErrorBoundary>
        );

        const differentSampleButton = screen.getByText('Try Different Sample');
        fireEvent.click(differentSampleButton);

        expect(onSelectDifferentSample).toHaveBeenCalled();
    });

    describe('error type detection', () => {
        it('detects YouTube errors', () => {
            render(
                <DiscoveryVideoPlayerErrorBoundary>
                    <ThrowError shouldThrow={true} errorMessage="YouTube player initialization failed" />
                </DiscoveryVideoPlayerErrorBoundary>
            );

            expect(screen.getByText('Discovery Video Player Error')).toBeInTheDocument();
            expect(screen.getByTestId('video-off-icon')).toBeInTheDocument();
        });

        it('detects network errors', () => {
            render(
                <DiscoveryVideoPlayerErrorBoundary>
                    <ThrowError shouldThrow={true} errorMessage="Network request failed" />
                </DiscoveryVideoPlayerErrorBoundary>
            );

            expect(screen.getByText('Network Connection Error')).toBeInTheDocument();
        });

        it('detects embed errors', () => {
            render(
                <DiscoveryVideoPlayerErrorBoundary>
                    <ThrowError shouldThrow={true} errorMessage="Video embed blocked" />
                </DiscoveryVideoPlayerErrorBoundary>
            );

            expect(screen.getByText('Sample Embed Error')).toBeInTheDocument();
        });

        it('detects API errors', () => {
            render(
                <DiscoveryVideoPlayerErrorBoundary>
                    <ThrowError shouldThrow={true} errorMessage="YouTube API script failed to load" />
                </DiscoveryVideoPlayerErrorBoundary>
            );

            expect(screen.getByText('YouTube API Error')).toBeInTheDocument();
        });

        it('detects unavailable video errors', () => {
            render(
                <DiscoveryVideoPlayerErrorBoundary>
                    <ThrowError shouldThrow={true} errorMessage="Video is unavailable or private" />
                </DiscoveryVideoPlayerErrorBoundary>
            );

            expect(screen.getByText('Sample Unavailable')).toBeInTheDocument();
        });

        it('detects component errors', () => {
            render(
                <DiscoveryVideoPlayerErrorBoundary>
                    <ThrowError shouldThrow={true} errorMessage="Discovery component failed to render" />
                </DiscoveryVideoPlayerErrorBoundary>
            );

            expect(screen.getByText('Discovery Player Component Error')).toBeInTheDocument();
        });

        it('handles unknown errors', () => {
            render(
                <DiscoveryVideoPlayerErrorBoundary>
                    <ThrowError shouldThrow={true} errorMessage="Some unknown error" />
                </DiscoveryVideoPlayerErrorBoundary>
            );

            expect(screen.getByText('Discovery Video Error')).toBeInTheDocument();
        });
    });

    it('increments retry count on multiple retries', async () => {
        const onRetry = vi.fn().mockResolvedValue();

        render(
            <DiscoveryVideoPlayerErrorBoundary onRetry={onRetry}>
                <ThrowError shouldThrow={true} />
            </DiscoveryVideoPlayerErrorBoundary>
        );

        // First retry
        fireEvent.click(screen.getByText(/Retry Player/));
        await waitFor(() => {
            expect(screen.queryByTestId('alert')).not.toBeInTheDocument();
        });

        // Trigger error again
        render(
            <DiscoveryVideoPlayerErrorBoundary onRetry={onRetry}>
                <ThrowError shouldThrow={true} />
            </DiscoveryVideoPlayerErrorBoundary>
        );

        // Second retry should show count
        expect(screen.getByText('Retry Player (2)')).toBeInTheDocument();
    });

    it('handles retry failure', async () => {
        const onRetry = vi.fn().mockRejectedValue(new Error('Retry failed'));

        render(
            <DiscoveryVideoPlayerErrorBoundary onRetry={onRetry}>
                <ThrowError shouldThrow={true} />
            </DiscoveryVideoPlayerErrorBoundary>
        );

        fireEvent.click(screen.getByText(/Retry Player/));

        await waitFor(() => {
            expect(screen.getByTestId('alert')).toBeInTheDocument();
        });
    });

    it('shows development details in development mode', () => {
        const originalEnv = process.env.NODE_ENV;
        process.env.NODE_ENV = 'development';

        render(
            <DiscoveryVideoPlayerErrorBoundary>
                <ThrowError shouldThrow={true} errorMessage="Test error for dev" />
            </DiscoveryVideoPlayerErrorBoundary>
        );

        expect(screen.getByText('Technical Details (Development)')).toBeInTheDocument();

        process.env.NODE_ENV = originalEnv;
    });

    it('hides development details in production mode', () => {
        const originalEnv = process.env.NODE_ENV;
        process.env.NODE_ENV = 'production';

        render(
            <DiscoveryVideoPlayerErrorBoundary>
                <ThrowError shouldThrow={true} errorMessage="Test error for prod" />
            </DiscoveryVideoPlayerErrorBoundary>
        );

        expect(screen.queryByText('Technical Details (Development)')).not.toBeInTheDocument();

        process.env.NODE_ENV = originalEnv;
    });
});