import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

// Mock the production wrapper and its dependencies
vi.mock('../../../services/WaveformFeatureFlags.js', () => ({
  waveformFeatureFlags: {
    isEnabled: vi.fn().mockReturnValue(true),
    getEnabledFeatures: vi.fn().mockReturnValue(['waveformVisualization']),
    deviceCapabilities: { webAudioSupport: true }
  },
  useWaveformFeatureFlag: vi.fn().mockReturnValue(true)
}));

vi.mock('../../../services/WaveformAnalytics.js', () => ({
  waveformAnalytics: {
    trackEvent: vi.fn(),
    trackFeatureUsage: vi.fn(),
    trackPerformance: vi.fn(),
    trackChopActivity: vi.fn(),
    trackNavigation: vi.fn(),
    trackError: vi.fn(),
    getSummary: vi.fn().mockReturnValue({ sessionId: 'test', totalEvents: 0 })
  },
  useWaveformAnalytics: vi.fn().mockReturnValue({
    trackEvent: vi.fn(),
    trackFeatureUsage: vi.fn(),
    trackPerformance: vi.fn(),
    trackChopActivity: vi.fn(),
    trackNavigation: vi.fn(),
    trackError: vi.fn(),
    getSummary: vi.fn()
  })
}));

vi.mock('../../../config/waveform.production.js', () => ({
  getOptimizedConfig: vi.fn().mockReturnValue({
    rendering: { maxFrameRate: 60 },
    analysis: { qualityPresets: true },
    bundling: { preloadStrategy: 'conservative' }
  }),
  withProductionErrorBoundary: vi.fn((Component) => Component)
}));

vi.mock('../WaveformLazyLoader.jsx', () => ({
  WaveformLazyLoader: ({ children, ...props }) => (
    <div data-testid="waveform-lazy-loader" {...props}>
      {children}
    </div>
  ),
  preloadWaveformComponents: vi.fn().mockResolvedValue(undefined)
}));

vi.mock('../error/WaveformErrorBoundary.jsx', () => ({
  WaveformErrorBoundary: ({ children }) => <div data-testid="error-boundary">{children}</div>
}));

vi.mock('../fallback/WaveformFallbackUI.jsx', () => ({
  WaveformFallbackUI: ({ message }) => <div data-testid="fallback-ui">{message}</div>
}));

// Import after mocks
const { WaveformProductionWrapper } = await import('../WaveformProductionWrapper.jsx');

describe('WaveformProduction', () => {
  const mockProps = {
    audioSource: 'test-audio-source',
    chops: [],
    currentTime: 0,
    isPlaying: false,
    onChopCreate: vi.fn(),
    onChopUpdate: vi.fn(),
    onTimeSeek: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('should render production wrapper successfully', async () => {
      render(<WaveformProductionWrapper {...mockProps} />);

      await waitFor(() => {
        expect(screen.getByTestId('error-boundary')).toBeInTheDocument();
      });
    });

    it('should show loading state initially', () => {
      render(<WaveformProductionWrapper {...mockProps} />);

      expect(screen.getByTestId('fallback-ui')).toBeInTheDocument();
      expect(screen.getByText(/initializing waveform visualization/i)).toBeInTheDocument();
    });
  });

  describe('Feature Flag Integration', () => {
    it('should handle disabled waveform visualization', async () => {
      const { waveformFeatureFlags } = await import('../../../services/WaveformFeatureFlags.js');
      waveformFeatureFlags.isEnabled.mockImplementation((flag) => 
        flag !== 'waveformVisualization'
      );

      render(<WaveformProductionWrapper {...mockProps} />);

      expect(screen.getByText(/waveform visualization is currently disabled/i)).toBeInTheDocument();
    });
  });

  describe('Production Optimizations', () => {
    it('should apply production configuration', async () => {
      const { getOptimizedConfig } = await import('../../../config/waveform.production.js');
      
      render(<WaveformProductionWrapper {...mockProps} />);

      await waitFor(() => {
        expect(getOptimizedConfig).toHaveBeenCalled();
      });
    });

    it('should preload components based on strategy', async () => {
      const { preloadWaveformComponents } = await import('../WaveformLazyLoader.jsx');
      
      render(<WaveformProductionWrapper {...mockProps} />);

      await waitFor(() => {
        expect(preloadWaveformComponents).toHaveBeenCalled();
      });
    });
  });

  describe('Analytics Integration', () => {
    it('should track initialization when performance monitoring is enabled', async () => {
      const { waveformAnalytics } = await import('../../../services/WaveformAnalytics.js');
      
      render(<WaveformProductionWrapper {...mockProps} />);

      await waitFor(() => {
        expect(waveformAnalytics.trackEvent).toHaveBeenCalledWith(
          'waveform_initialization',
          expect.any(Object)
        );
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle component errors gracefully', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      render(<WaveformProductionWrapper {...mockProps} />);

      // Component should render without throwing
      expect(screen.getByTestId('error-boundary')).toBeInTheDocument();
      
      consoleSpy.mockRestore();
    });
  });
});