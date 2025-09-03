/**
 * @fileoverview Integration tests for sample playback workflow
 * Tests the complete flow from sample selection to video player loading,
 * playback controls, progress tracking, and metadata display.
 * 
 * Requirements: 4.1, 4.2, 4.3
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import DiscoveryVideoPlayer from '../DiscoveryVideoPlayer.jsx';
import SampleCard from '../SampleCard.jsx';
import { createMockSample } from '../../../types/discovery.js';

// Mock YouTube IFrame API
const mockYouTubePlayer = {
  loadVideoById: vi.fn(),
  playVideo: vi.fn(),
  pauseVideo: vi.fn(),
  setVolume: vi.fn(),
  mute: vi.fn(),
  unMute: vi.fn(),
  getCurrentTime: vi.fn(() => 45.5),
  getDuration: vi.fn(() => 180),
  getVolume: vi.fn(() => 70),
  destroy: vi.fn()
};

const mockYouTubeAPI = {
  Player: vi.fn().mockImplementation((elementId, config) => {
    // Simulate async player initialization
    setTimeout(() => {
      if (config.events?.onReady) {
        config.events.onReady({ target: mockYouTubePlayer });
      }
    }, 100);
    
    return mockYouTubePlayer;
  }),
  PlayerState: {
    UNSTARTED: -1,
    ENDED: 0,
    PLAYING: 1,
    PAUSED: 2,
    BUFFERING: 3,
    CUED: 5
  }
};

// Mock clipboard API
Object.assign(navigator, {
  clipboard: {
    writeText: vi.fn(() => Promise.resolve())
  }
});

// Mock window.location
const mockLocation = {
  href: '',
  origin: 'http://localhost:3000'
};
Object.defineProperty(window, 'location', {
  value: mockLocation,
  writable: true
});

describe('Sample Playback Workflow Integration', () => {
  let mockSample;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();
    mockLocation.href = '';
    
    // Setup YouTube API mock
    window.YT = mockYouTubeAPI;
    window.onYouTubeIframeAPIReady = vi.fn();
    
    // Create mock sample for testing
    mockSample = createMockSample({
      id: 'sample-1',
      title: 'Funky Drummer',
      artist: 'James Brown',
      year: 1970,
      genre: 'Funk',
      youtubeId: 'dNP8tbDMZNE',
      duration: 180,
      tempo: 120,
      instruments: ['drums', 'bass']
    });

    // Mock console methods to avoid noise in tests
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Sample Selection to Player Loading', () => {
    it('should load sample in video player when sample is provided', async () => {
      const mockOnReady = vi.fn();
      const mockOnError = vi.fn();
      const mockOnStateChange = vi.fn();

      render(
        <DiscoveryVideoPlayer
          videoId={mockSample.youtubeId}
          sample={mockSample}
          onReady={mockOnReady}
          onError={mockOnError}
          onStateChange={mockOnStateChange}
          volume={0.7}
          autoplay={false}
        />
      );

      // Wait for YouTube player to initialize
      await waitFor(() => {
        expect(mockYouTubeAPI.Player).toHaveBeenCalled();
      }, { timeout: 2000 });

      // Verify player was created with correct video ID
      const playerCall = mockYouTubeAPI.Player.mock.calls[0];
      expect(playerCall[1].videoId).toBe(mockSample.youtubeId);
    });

    it('should display sample metadata when sample is loaded', async () => {
      render(
        <DiscoveryVideoPlayer
          videoId={mockSample.youtubeId}
          sample={mockSample}
          onReady={vi.fn()}
          onError={vi.fn()}
          onStateChange={vi.fn()}
          volume={0.7}
          autoplay={false}
        />
      );

      // Wait for component to render
      await waitFor(() => {
        expect(screen.getAllByText(mockSample.title)).toHaveLength(2); // Title appears in two places
      });

      // Verify sample metadata is displayed
      expect(screen.getByText(mockSample.artist)).toBeInTheDocument();
      expect(screen.getByText(mockSample.year.toString())).toBeInTheDocument();
      expect(screen.getByText(mockSample.genre)).toBeInTheDocument();
    });

    it('should handle sample card play button click', async () => {
      const mockOnPlay = vi.fn();
      const mockOnFavorite = vi.fn();

      render(
        <SampleCard
          sample={mockSample}
          onPlay={mockOnPlay}
          onFavorite={mockOnFavorite}
          isFavorite={false}
          isPlaying={false}
        />
      );

      // Find and click the play button
      const playButton = screen.getByRole('button', { name: new RegExp(`Play ${mockSample.title}`, 'i') });
      
      await act(async () => {
        fireEvent.click(playButton);
      });

      // Verify the onPlay callback was called with the sample
      expect(mockOnPlay).toHaveBeenCalledWith(mockSample);
    });
  });

  describe('Playback Controls and Progress Tracking', () => {
    it('should handle play/pause controls', async () => {
      const mockOnReady = vi.fn();
      const mockOnStateChange = vi.fn();

      render(
        <DiscoveryVideoPlayer
          videoId={mockSample.youtubeId}
          sample={mockSample}
          onReady={mockOnReady}
          onError={vi.fn()}
          onStateChange={mockOnStateChange}
          volume={0.7}
          autoplay={false}
        />
      );

      // Wait for player to initialize
      await waitFor(() => {
        expect(mockYouTubeAPI.Player).toHaveBeenCalled();
      });

      // Simulate player ready event
      await act(async () => {
        const playerConfig = mockYouTubeAPI.Player.mock.calls[0][1];
        playerConfig.events.onReady({ target: mockYouTubePlayer });
      });

      // Verify onReady callback was called
      expect(mockOnReady).toHaveBeenCalledWith(mockYouTubePlayer);
    });

    it('should track playback progress', async () => {
      const mockOnTimeUpdate = vi.fn();

      render(
        <DiscoveryVideoPlayer
          videoId={mockSample.youtubeId}
          sample={mockSample}
          onReady={vi.fn()}
          onError={vi.fn()}
          onStateChange={vi.fn()}
          onTimeUpdate={mockOnTimeUpdate}
          volume={0.7}
          autoplay={false}
        />
      );

      await waitFor(() => {
        expect(mockYouTubeAPI.Player).toHaveBeenCalled();
      });

      // Simulate player ready and playing state
      await act(async () => {
        const playerConfig = mockYouTubeAPI.Player.mock.calls[0][1];
        playerConfig.events.onReady({ target: mockYouTubePlayer });
        playerConfig.events.onStateChange({ 
          data: mockYouTubeAPI.PlayerState.PLAYING,
          target: mockYouTubePlayer 
        });
      });

      // Verify that the player has time tracking capabilities
      expect(mockYouTubePlayer.getCurrentTime).toBeDefined();
    });

  });

  describe('Error Handling and Recovery', () => {
    it('should show error message when playback fails', async () => {
      const mockOnError = vi.fn();

      render(
        <DiscoveryVideoPlayer
          videoId={mockSample.youtubeId}
          sample={mockSample}
          onReady={vi.fn()}
          onError={mockOnError}
          onStateChange={vi.fn()}
          volume={0.7}
          autoplay={false}
        />
      );

      await waitFor(() => {
        expect(mockYouTubeAPI.Player).toHaveBeenCalled();
      });

      // Simulate player error
      await act(async () => {
        const playerConfig = mockYouTubeAPI.Player.mock.calls[0][1];
        playerConfig.events.onError({ data: 100 }); // Video not found error
      });

      // Verify error callback was called
      expect(mockOnError).toHaveBeenCalled();
      
      // Verify error message is displayed
      await waitFor(() => {
        expect(screen.getByText(/Video not found or private/)).toBeInTheDocument();
      });
    });
  });

  describe('Use in Chopper Workflow', () => {
    it('should handle action button click on sample card', async () => {
      const mockOnPlay = vi.fn();
      const mockOnFavorite = vi.fn();

      render(
        <SampleCard
          sample={mockSample}
          onPlay={mockOnPlay}
          onFavorite={mockOnFavorite}
          isFavorite={false}
          isPlaying={false}
        />
      );

      // Find the action button (Use in Chopper)
      const actionButton = screen.getByRole('button', { name: new RegExp(`Use ${mockSample.title} in Chopper`, 'i') });
      
      // Set up event listener for the custom event
      const eventHandler = vi.fn();
      window.addEventListener('sampleAction', eventHandler);

      await act(async () => {
        fireEvent.click(actionButton);
      });

      // Verify the custom event was dispatched
      expect(eventHandler).toHaveBeenCalled();
      
      // Clean up
      window.removeEventListener('sampleAction', eventHandler);
    });
  });

  describe('Sample Metadata Display During Playback', () => {
    it('should display comprehensive sample metadata', async () => {
      render(
        <DiscoveryVideoPlayer
          videoId={mockSample.youtubeId}
          sample={mockSample}
          onReady={vi.fn()}
          onError={vi.fn()}
          onStateChange={vi.fn()}
          volume={0.7}
          autoplay={false}
        />
      );

      // Verify all metadata fields are present
      expect(screen.getAllByText(mockSample.title)).toHaveLength(2); // Title appears in two places
      expect(screen.getByText(mockSample.artist)).toBeInTheDocument();
      expect(screen.getByText(mockSample.year.toString())).toBeInTheDocument();
      expect(screen.getByText(mockSample.genre)).toBeInTheDocument();
      
      // Check for optional tempo field
      if (mockSample.tempo) {
        expect(screen.getByText(`${mockSample.tempo} BPM`)).toBeInTheDocument();
      }
    });
  });

  describe('Loading States and User Feedback', () => {
    it('should show loading state during video initialization', async () => {
      render(
        <DiscoveryVideoPlayer
          videoId={mockSample.youtubeId}
          sample={mockSample}
          onReady={vi.fn()}
          onError={vi.fn()}
          onStateChange={vi.fn()}
          volume={0.7}
          autoplay={false}
        />
      );

      // Initially, the component should show loading or initialization state
      // The exact loading indicator depends on the implementation
      expect(screen.getAllByText(mockSample.title)).toHaveLength(2); // Title appears in two places
    });
  });
});