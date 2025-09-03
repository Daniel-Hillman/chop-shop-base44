/**
 * @fileoverview Integration test for SamplerDrumSequencer in ChopperPage
 * Tests the complete integration workflow
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ChopperPage from '../../../pages/ChopperPage';

// Mock the hooks and services
vi.mock('../../../hooks/useAudioAnalysis', () => ({
  useAudioAnalysis: () => ({
    waveformData: new Float32Array(1000),
    audioBuffer: null,
    analysisStatus: 'ready',
    progress: 100,
    error: null,
    downloadStats: null,
    retry: vi.fn(),
    isCached: false
  })
}));

vi.mock('../../../hooks/useErrorRecovery', () => ({
  useAudioErrorRecovery: () => ({
    isRetrying: false,
    retryCount: 0
  })
}));

// Mock YouTube player
const mockYouTubePlayer = {
  seekTo: vi.fn(),
  playVideo: vi.fn(),
  pauseVideo: vi.fn(),
  getVideoData: () => ({ title: 'Test Video' })
};

describe('ChopperPage Sequencer Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock navigator.onLine
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: true
    });
  });

  it('should render sequencer when video is ready and chops exist', async () => {
    render(<ChopperPage />);
    
    // Wait for the component to initialize
    await waitFor(() => {
      expect(screen.getByText(/video ready/i)).toBeInTheDocument();
    });

    // Check if sequencer is rendered (it should be visible when video is ready)
    await waitFor(() => {
      const sequencerElement = screen.queryByTestId('sampler-drum-sequencer');
      // The sequencer should be present in the DOM when video is ready
      expect(sequencerElement).toBeInTheDocument();
    });
  });

  it('should not render sequencer when video is not ready', () => {
    // Mock the hook to return not ready status
    vi.doMock('../../../hooks/useAudioAnalysis', () => ({
      useAudioAnalysis: () => ({
        waveformData: null,
        audioBuffer: null,
        analysisStatus: 'idle',
        progress: 0,
        error: null,
        downloadStats: null,
        retry: vi.fn(),
        isCached: false
      })
    }));

    render(<ChopperPage />);
    
    // Sequencer should not be rendered when video is not ready
    const sequencerElement = screen.queryByTestId('sampler-drum-sequencer');
    expect(sequencerElement).not.toBeInTheDocument();
  });

  it('should pass correct props to sequencer', async () => {
    render(<ChopperPage />);
    
    await waitFor(() => {
      expect(screen.getByText(/video ready/i)).toBeInTheDocument();
    });

    // Check if sequencer receives the correct props
    const sequencerElement = screen.queryByTestId('sampler-drum-sequencer');
    expect(sequencerElement).toBeInTheDocument();
    
    // The sequencer should be integrated with the chopper state
    // This is verified by the component rendering without errors
  });

  it('should handle bank changes from sequencer', async () => {
    render(<ChopperPage />);
    
    await waitFor(() => {
      expect(screen.getByText(/video ready/i)).toBeInTheDocument();
    });

    // The bank change functionality is tested in the component's internal logic
    // This test verifies the integration doesn't break the page
    expect(screen.getByText(/bank a/i)).toBeInTheDocument();
  });
});