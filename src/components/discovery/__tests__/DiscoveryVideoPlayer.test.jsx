import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import DiscoveryVideoPlayer from '../DiscoveryVideoPlayer';

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }) => <div {...props}>{children}</div>
  }
}));

// Mock UI components
vi.mock('../../ui/button', () => ({
  Button: ({ children, onClick, disabled, className, ...props }) => (
    <button 
      onClick={onClick} 
      disabled={disabled} 
      className={className}
      data-testid={props['data-testid']}
      {...props}
    >
      {children}
    </button>
  )
}));

// Mock Lucide icons
vi.mock('lucide-react', () => ({
  Play: () => <span data-testid="play-icon">Play</span>,
  Pause: () => <span data-testid="pause-icon">Pause</span>,
  Volume2: () => <span data-testid="volume-icon">Volume</span>,
  VolumeX: () => <span data-testid="mute-icon">Mute</span>,
  ExternalLink: () => <span data-testid="external-link-icon">External</span>,
  AlertTriangle: () => <span data-testid="alert-icon">Alert</span>
}));

describe('DiscoveryVideoPlayer', () => {
  let mockPlayer;
  let mockYT;

  beforeEach(() => {
    // Reset DOM
    document.body.innerHTML = '';
    
    // Mock YouTube player
    mockPlayer = {
      destroy: vi.fn(),
      playVideo: vi.fn(),
      pauseVideo: vi.fn(),
      mute: vi.fn(),
      unMute: vi.fn(),
      setVolume: vi.fn(),
      getCurrentTime: vi.fn(() => 30),
      getDuration: vi.fn(() => 180),
      getVolume: vi.fn(() => 50),
      getPlayerState: vi.fn(() => 1), // PLAYING
      loadVideoById: vi.fn(),
      seekTo: vi.fn()
    };

    mockYT = {
      Player: vi.fn().mockImplementation((elementId, config) => {
        // Simulate async player initialization
        setTimeout(() => {
          if (config.events?.onReady) {
            config.events.onReady({ target: mockPlayer });
          }
        }, 0);
        return mockPlayer;
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

    // Mock global YouTube API
    global.window.YT = mockYT;
    global.window.onYouTubeIframeAPIReady = null;
    global.window.discoveryYTAPILoading = false;

    // Mock console methods
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.clearAllTimers();
    delete global.window.YT;
    delete global.window.onYouTubeIframeAPIReady;
    delete global.window.discoveryYTAPILoading;
  });

  const mockSample = {
    id: 'test-sample-1',
    title: 'Test Sample',
    artist: 'Test Artist',
    year: 1975,
    genre: 'Soul',
    duration: 180,
    youtubeId: 'test-video-id',
    thumbnailUrl: 'https://example.com/thumb.jpg',
    tempo: 120,
    isMock: true
  };

  describe('Component Initialization', () => {
    it('renders without crashing', () => {
      render(<DiscoveryVideoPlayer videoId="test-video-id" />);
      expect(screen.getByText('Loading video...')).toBeInTheDocument();
    });

    it('displays placeholder when no videoId provided', () => {
      render(<DiscoveryVideoPlayer />);
      expect(screen.getByText('Select a sample to start playing')).toBeInTheDocument();
    });

    it('generates unique player ID for each instance', () => {
      const { container: container1 } = render(<DiscoveryVideoPlayer videoId="test1" />);
      const { container: container2 } = render(<DiscoveryVideoPlayer videoId="test2" />);
      
      const player1 = container1.querySelector('[id^="discovery-youtube-player-"]');
      const player2 = container2.querySelector('[id^="discovery-youtube-player-"]');
      
      expect(player1?.id).toBeDefined();
      expect(player2?.id).toBeDefined();
      expect(player1?.id).not.toBe(player2?.id);
    });

    it('initializes with correct default state', () => {
      render(<DiscoveryVideoPlayer videoId="test-video-id" />);
      
      // Should show loading state initially
      expect(screen.getByText('Loading video...')).toBeInTheDocument();
    });
  });

  describe('YouTube API Integration', () => {
    it('loads YouTube API when not available', async () => {
      delete global.window.YT;
      
      render(<DiscoveryVideoPlayer videoId="test-video-id" />);
      
      // Should attempt to load the API
      await waitFor(() => {
        const scripts = document.querySelectorAll('script[src*="youtube.com/iframe_api"]');
        expect(scripts.length).toBeGreaterThan(0);
      });
    });

    it('uses existing YouTube API when available', async () => {
      const onReady = vi.fn();
      
      render(
        <DiscoveryVideoPlayer 
          videoId="test-video-id" 
          onReady={onReady}
        />
      );

      await waitFor(() => {
        expect(mockYT.Player).toHaveBeenCalledWith(
          expect.stringMatching(/discovery-youtube-player-/),
          expect.objectContaining({
            videoId: 'test-video-id',
            playerVars: expect.objectContaining({
              autoplay: 0,
              controls: 1,
              modestbranding: 1,
              rel: 0,
              enablejsapi: 1
            })
          })
        );
      });

      await waitFor(() => {
        expect(onReady).toHaveBeenCalledWith(mockPlayer);
      });
    });

    it('handles API loading errors gracefully', async () => {
      delete global.window.YT;
      const onError = vi.fn();
      
      render(
        <DiscoveryVideoPlayer 
          videoId="test-video-id" 
          onError={onError}
        />
      );

      // Simulate script loading error
      const script = document.querySelector('script[src*="youtube.com/iframe_api"]');
      if (script) {
        fireEvent.error(script);
      }

      await waitFor(() => {
        expect(onError).toHaveBeenCalled();
      });
    });
  });

  describe('Player State Management', () => {
    it('updates state when player is ready', async () => {
      const onReady = vi.fn();
      
      render(
        <DiscoveryVideoPlayer 
          videoId="test-video-id" 
          onReady={onReady}
          sample={mockSample}
        />
      );

      await waitFor(() => {
        expect(onReady).toHaveBeenCalledWith(mockPlayer);
      });

      // Should display sample metadata
      expect(screen.getByText('Test Sample')).toBeInTheDocument();
      expect(screen.getByText('Test Artist')).toBeInTheDocument();
    });

    it('handles player state changes', async () => {
      const onStateChange = vi.fn();
      
      render(
        <DiscoveryVideoPlayer 
          videoId="test-video-id" 
          onStateChange={onStateChange}
        />
      );

      await waitFor(() => {
        expect(mockYT.Player).toHaveBeenCalled();
      });

      // Simulate state change to playing
      const playerConfig = mockYT.Player.mock.calls[0][1];
      act(() => {
        playerConfig.events.onStateChange({ data: mockYT.PlayerState.PLAYING, target: mockPlayer });
      });

      await waitFor(() => {
        expect(onStateChange).toHaveBeenCalledWith({
          state: mockYT.PlayerState.PLAYING,
          isPlaying: true,
          isBuffering: false,
          player: mockPlayer
        });
      });
    });

    it('tracks current time when playing', async () => {
      const onTimeUpdate = vi.fn();
      
      render(
        <DiscoveryVideoPlayer 
          videoId="test-video-id" 
          onTimeUpdate={onTimeUpdate}
        />
      );

      await waitFor(() => {
        expect(mockYT.Player).toHaveBeenCalled();
      });

      // Simulate state change to playing
      const playerConfig = mockYT.Player.mock.calls[0][1];
      act(() => {
        playerConfig.events.onStateChange({ data: mockYT.PlayerState.PLAYING, target: mockPlayer });
      });

      // Wait for time tracking to start
      await waitFor(() => {
        expect(onTimeUpdate).toHaveBeenCalledWith(30);
      }, { timeout: 200 });
    });
  });

  describe('Player Controls', () => {
    beforeEach(async () => {
      render(
        <DiscoveryVideoPlayer 
          videoId="test-video-id" 
          sample={mockSample}
        />
      );

      await waitFor(() => {
        expect(mockYT.Player).toHaveBeenCalled();
      });

      // Simulate player ready
      const playerConfig = mockYT.Player.mock.calls[0][1];
      act(() => {
        playerConfig.events.onReady({ target: mockPlayer });
      });
    });

    it('toggles play/pause when button clicked', async () => {
      const playButton = screen.getByTestId('play-icon').closest('button');
      
      fireEvent.click(playButton);
      expect(mockPlayer.playVideo).toHaveBeenCalled();

      // Simulate playing state
      mockPlayer.getPlayerState.mockReturnValue(mockYT.PlayerState.PLAYING);
      
      fireEvent.click(playButton);
      expect(mockPlayer.pauseVideo).toHaveBeenCalled();
    });

    it('toggles mute when mute button clicked', async () => {
      const muteButton = screen.getByTestId('volume-icon').closest('button');
      
      fireEvent.click(muteButton);
      expect(mockPlayer.mute).toHaveBeenCalled();

      fireEvent.click(muteButton);
      expect(mockPlayer.unMute).toHaveBeenCalled();
    });

    it('opens YouTube when external link clicked', async () => {
      const originalOpen = window.open;
      window.open = vi.fn();

      const externalButton = screen.getByTestId('external-link-icon').closest('button');
      fireEvent.click(externalButton);

      expect(window.open).toHaveBeenCalledWith('https://www.youtube.com/watch?v=test-video-id', '_blank');

      window.open = originalOpen;
    });
  });

  describe('Volume Control', () => {
    it('sets initial volume when player is ready', async () => {
      render(
        <DiscoveryVideoPlayer 
          videoId="test-video-id" 
          volume={0.8}
        />
      );

      await waitFor(() => {
        expect(mockYT.Player).toHaveBeenCalled();
      });

      // Simulate player ready
      const playerConfig = mockYT.Player.mock.calls[0][1];
      act(() => {
        playerConfig.events.onReady({ target: mockPlayer });
      });

      await waitFor(() => {
        expect(mockPlayer.setVolume).toHaveBeenCalledWith(80);
      });
    });

    it('updates volume when prop changes', async () => {
      const { rerender } = render(
        <DiscoveryVideoPlayer 
          videoId="test-video-id" 
          volume={0.5}
        />
      );

      await waitFor(() => {
        expect(mockYT.Player).toHaveBeenCalled();
      });

      // Simulate player ready
      const playerConfig = mockYT.Player.mock.calls[0][1];
      act(() => {
        playerConfig.events.onReady({ target: mockPlayer });
      });

      // Change volume prop
      rerender(
        <DiscoveryVideoPlayer 
          videoId="test-video-id" 
          volume={0.8}
        />
      );

      await waitFor(() => {
        expect(mockPlayer.setVolume).toHaveBeenCalledWith(80);
      });
    });
  });

  describe('Error Handling', () => {
    it('handles player initialization errors', async () => {
      const onError = vi.fn();
      mockYT.Player.mockImplementation(() => {
        throw new Error('Player initialization failed');
      });

      render(
        <DiscoveryVideoPlayer 
          videoId="test-video-id" 
          onError={onError}
        />
      );

      await waitFor(() => {
        expect(onError).toHaveBeenCalledWith(
          expect.any(Error),
          'Player initialization failed'
        );
      });

      expect(screen.getByText('Video Player Error')).toBeInTheDocument();
    });

    it('handles YouTube player errors', async () => {
      const onError = vi.fn();
      
      render(
        <DiscoveryVideoPlayer 
          videoId="test-video-id" 
          onError={onError}
        />
      );

      await waitFor(() => {
        expect(mockYT.Player).toHaveBeenCalled();
      });

      // Simulate YouTube player error
      const playerConfig = mockYT.Player.mock.calls[0][1];
      act(() => {
        playerConfig.events.onError({ data: 100 }); // Video not found
      });

      await waitFor(() => {
        expect(onError).toHaveBeenCalled();
      });

      expect(screen.getByText('Video not found or private')).toBeInTheDocument();
    });

    it('provides retry functionality', async () => {
      const onError = vi.fn();
      
      render(
        <DiscoveryVideoPlayer 
          videoId="test-video-id" 
          onError={onError}
        />
      );

      await waitFor(() => {
        expect(mockYT.Player).toHaveBeenCalled();
      });

      // Simulate error
      const playerConfig = mockYT.Player.mock.calls[0][1];
      act(() => {
        playerConfig.events.onError({ data: 5 }); // HTML5 player error
      });

      await waitFor(() => {
        expect(screen.getByText(/Retry/)).toBeInTheDocument();
      });

      // Click retry button
      const retryButton = screen.getByText(/Retry/).closest('button');
      fireEvent.click(retryButton);

      expect(mockPlayer.loadVideoById).toHaveBeenCalledWith('test-video-id');
    });

    it('limits retry attempts', async () => {
      render(
        <DiscoveryVideoPlayer 
          videoId="test-video-id" 
        />
      );

      await waitFor(() => {
        expect(mockYT.Player).toHaveBeenCalled();
      });

      const playerConfig = mockYT.Player.mock.calls[0][1];

      // Simulate multiple errors and retries
      for (let i = 0; i < 4; i++) {
        act(() => {
          playerConfig.events.onError({ data: 5 });
        });

        await waitFor(() => {
          const retryButton = screen.queryByText(/Retry/);
          if (retryButton) {
            fireEvent.click(retryButton);
          }
        });
      }

      // After max retries, retry button should not be available
      await waitFor(() => {
        expect(screen.queryByText(/Retry/)).not.toBeInTheDocument();
      });
    });
  });

  describe('Sample Metadata Display', () => {
    it('displays sample information when provided', async () => {
      render(
        <DiscoveryVideoPlayer 
          videoId="test-video-id" 
          sample={mockSample}
        />
      );

      expect(screen.getByText('Test Sample')).toBeInTheDocument();
      expect(screen.getByText('Test Artist')).toBeInTheDocument();
      expect(screen.getByText('1975')).toBeInTheDocument();
      expect(screen.getByText('Soul')).toBeInTheDocument();
      expect(screen.getByText('120 BPM')).toBeInTheDocument();
    });

    it('handles missing optional sample fields', async () => {
      const sampleWithoutTempo = {
        ...mockSample,
        tempo: undefined
      };

      render(
        <DiscoveryVideoPlayer 
          videoId="test-video-id" 
          sample={sampleWithoutTempo}
        />
      );

      expect(screen.getByText('Test Sample')).toBeInTheDocument();
      expect(screen.queryByText('BPM')).not.toBeInTheDocument();
    });
  });

  describe('Autoplay Functionality', () => {
    it('sets autoplay parameter when enabled', async () => {
      render(
        <DiscoveryVideoPlayer 
          videoId="test-video-id" 
          autoplay={true}
        />
      );

      await waitFor(() => {
        expect(mockYT.Player).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            playerVars: expect.objectContaining({
              autoplay: 1
            })
          })
        );
      });
    });

    it('disables autoplay by default', async () => {
      render(
        <DiscoveryVideoPlayer 
          videoId="test-video-id" 
        />
      );

      await waitFor(() => {
        expect(mockYT.Player).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            playerVars: expect.objectContaining({
              autoplay: 0
            })
          })
        );
      });
    });
  });

  describe('Cleanup and Memory Management', () => {
    it('cleans up player on unmount', async () => {
      const { unmount } = render(
        <DiscoveryVideoPlayer videoId="test-video-id" />
      );

      await waitFor(() => {
        expect(mockYT.Player).toHaveBeenCalled();
      });

      unmount();

      expect(mockPlayer.destroy).toHaveBeenCalled();
    });

    it('cleans up intervals on unmount', async () => {
      const { unmount } = render(
        <DiscoveryVideoPlayer videoId="test-video-id" />
      );

      await waitFor(() => {
        expect(mockYT.Player).toHaveBeenCalled();
      });

      // Start playing to initiate time tracking
      const playerConfig = mockYT.Player.mock.calls[0][1];
      act(() => {
        playerConfig.events.onStateChange({ data: mockYT.PlayerState.PLAYING, target: mockPlayer });
      });

      const clearIntervalSpy = vi.spyOn(global, 'clearInterval');
      
      unmount();

      expect(clearIntervalSpy).toHaveBeenCalled();
    });

    it('handles cleanup errors gracefully', async () => {
      mockPlayer.destroy.mockImplementation(() => {
        throw new Error('Cleanup error');
      });

      const { unmount } = render(
        <DiscoveryVideoPlayer videoId="test-video-id" />
      );

      await waitFor(() => {
        expect(mockYT.Player).toHaveBeenCalled();
      });

      // Should not throw error on unmount
      expect(() => unmount()).not.toThrow();
    });
  });

  describe('Time Formatting', () => {
    it('formats time correctly', async () => {
      mockPlayer.getCurrentTime.mockReturnValue(125); // 2:05
      mockPlayer.getDuration.mockReturnValue(245); // 4:05

      render(
        <DiscoveryVideoPlayer 
          videoId="test-video-id" 
          sample={mockSample}
        />
      );

      await waitFor(() => {
        expect(mockYT.Player).toHaveBeenCalled();
      });

      // Simulate player ready and playing
      const playerConfig = mockYT.Player.mock.calls[0][1];
      act(() => {
        playerConfig.events.onReady({ target: mockPlayer });
        playerConfig.events.onStateChange({ data: mockYT.PlayerState.PLAYING, target: mockPlayer });
      });

      await waitFor(() => {
        expect(screen.getByText('2:05 / 4:05')).toBeInTheDocument();
      });
    });

    it('handles zero and invalid time values', async () => {
      mockPlayer.getCurrentTime.mockReturnValue(0);
      mockPlayer.getDuration.mockReturnValue(NaN);

      render(
        <DiscoveryVideoPlayer 
          videoId="test-video-id" 
          sample={mockSample}
        />
      );

      await waitFor(() => {
        expect(mockYT.Player).toHaveBeenCalled();
      });

      const playerConfig = mockYT.Player.mock.calls[0][1];
      act(() => {
        playerConfig.events.onReady({ target: mockPlayer });
      });

      await waitFor(() => {
        expect(screen.getByText('0:00 / 0:00')).toBeInTheDocument();
      });
    });
  });
});