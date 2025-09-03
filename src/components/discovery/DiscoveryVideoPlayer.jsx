import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Play, Pause, Volume2, VolumeX, ExternalLink, AlertTriangle } from 'lucide-react';
import { Button } from '../ui/button';

/**
 * Dedicated YouTube player component for the Sample Discovery feature
 * Completely isolated from ChopperPage VideoPlayer to ensure zero impact
 * 
 * @param {Object} props
 * @param {string} props.videoId - YouTube video ID to play
 * @param {Function} props.onReady - Callback when player is ready
 * @param {Function} props.onError - Callback when player encounters an error
 * @param {Function} props.onStateChange - Callback when player state changes
 * @param {Function} props.onTimeUpdate - Callback for time updates
 * @param {Object} props.sample - Sample data object for metadata display
 * @param {number} props.volume - Volume level (0-1)
 * @param {boolean} props.autoplay - Whether to autoplay when video loads
 * @param {string} props.className - Additional CSS classes
 */
export default function DiscoveryVideoPlayer({
  videoId,
  onReady,
  onError,
  onStateChange,
  onTimeUpdate,
  sample,
  volume = 0.5,
  autoplay = false,
  className = ''
}) {
  const [player, setPlayer] = useState(null);
  const [isAPIReady, setIsAPIReady] = useState(false);
  const [playerState, setPlayerState] = useState({
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    volume: volume,
    isMuted: false,
    isBuffering: false,
    hasError: false,
    errorMessage: null
  });
  
  const intervalRef = useRef(null);
  const playerContainerRef = useRef(null);
  const retryCountRef = useRef(0);
  const maxRetries = 3;

  // Generate unique player ID for this instance to avoid conflicts
  const playerId = useRef(`discovery-youtube-player-${Math.random().toString(36).substr(2, 9)}`);

  /**
   * Load YouTube IFrame API if not already loaded
   */
  useEffect(() => {
    if (window.YT && window.YT.Player) {
      setIsAPIReady(true);
      return;
    }

    // Check if API is already being loaded
    if (window.discoveryYTAPILoading) {
      const checkAPI = setInterval(() => {
        if (window.YT && window.YT.Player) {
          setIsAPIReady(true);
          clearInterval(checkAPI);
        }
      }, 100);
      return () => clearInterval(checkAPI);
    }

    // Load the API
    window.discoveryYTAPILoading = true;
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    tag.async = true;
    tag.onerror = () => {
      console.error('Failed to load YouTube IFrame API');
      handlePlayerError(new Error('Failed to load YouTube API'));
    };

    const firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

    // Set up API ready callback
    const originalCallback = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      if (originalCallback) originalCallback();
      setIsAPIReady(true);
      window.discoveryYTAPILoading = false;
    };

    return () => {
      // Cleanup if component unmounts before API loads
      if (window.discoveryYTAPILoading) {
        window.discoveryYTAPILoading = false;
      }
    };
  }, []);

  /**
   * Initialize YouTube player when API is ready and videoId is available
   */
  useEffect(() => {
    if (!isAPIReady || !videoId || !playerContainerRef.current) return;

    try {
      // Destroy existing player if it exists
      if (player && player.destroy) {
        player.destroy();
        setPlayer(null);
      }

      // Reset error state
      setPlayerState(prev => ({
        ...prev,
        hasError: false,
        errorMessage: null,
        isBuffering: true
      }));

      // Create new player
      const newPlayer = new window.YT.Player(playerId.current, {
        height: '100%',
        width: '100%',
        videoId: videoId,
        playerVars: {
          autoplay: autoplay ? 1 : 0,
          controls: 1,
          modestbranding: 1,
          rel: 0,
          enablejsapi: 1,
          origin: window.location.origin,
          playsinline: 1
        },
        events: {
          onReady: handlePlayerReady,
          onStateChange: handlePlayerStateChange,
          onError: handlePlayerError
        }
      });

      retryCountRef.current = 0;

    } catch (error) {
      console.error('Failed to initialize DiscoveryVideoPlayer:', error);
      handlePlayerError(error);
    }

    return () => {
      stopTimeTracking();
      if (player && player.destroy) {
        try {
          player.destroy();
        } catch (error) {
          console.warn('Error destroying DiscoveryVideoPlayer:', error);
        }
      }
    };
  }, [isAPIReady, videoId, autoplay]);

  /**
   * Handle player ready event
   */
  const handlePlayerReady = useCallback((event) => {
    const playerInstance = event.target;
    setPlayer(playerInstance);

    try {
      const duration = playerInstance.getDuration();
      const currentVolume = playerInstance.getVolume() / 100;

      setPlayerState(prev => ({
        ...prev,
        duration,
        volume: currentVolume,
        isBuffering: false,
        hasError: false,
        errorMessage: null
      }));

      // Set initial volume
      playerInstance.setVolume(volume * 100);

      // Notify parent component
      if (onReady) {
        onReady(playerInstance);
      }

      console.log('DiscoveryVideoPlayer ready for video:', videoId);

    } catch (error) {
      console.error('Error in DiscoveryVideoPlayer ready handler:', error);
      handlePlayerError(error);
    }
  }, [videoId, volume, onReady]);

  /**
   * Handle player state changes
   */
  const handlePlayerStateChange = useCallback((event) => {
    try {
      const state = event.data;
      const isPlaying = state === window.YT.PlayerState.PLAYING;
      const isBuffering = state === window.YT.PlayerState.BUFFERING;

      setPlayerState(prev => ({
        ...prev,
        isPlaying,
        isBuffering,
        hasError: false,
        errorMessage: null
      }));

      if (isPlaying) {
        startTimeTracking();
      } else {
        stopTimeTracking();
      }

      // Notify parent component
      if (onStateChange) {
        onStateChange({
          state,
          isPlaying,
          isBuffering,
          player: event.target
        });
      }

    } catch (error) {
      console.error('Error in DiscoveryVideoPlayer state change handler:', error);
      handlePlayerError(error);
    }
  }, [onStateChange]);

  /**
   * Handle player errors
   */
  const handlePlayerError = useCallback((error) => {
    console.error('DiscoveryVideoPlayer error:', error);

    let errorMessage = 'An error occurred with the video player';
    
    if (error && typeof error === 'object') {
      if (error.data !== undefined) {
        // YouTube player error codes
        switch (error.data) {
          case 2:
            errorMessage = 'Invalid video ID';
            break;
          case 5:
            errorMessage = 'HTML5 player error';
            break;
          case 100:
            errorMessage = 'Video not found or private';
            break;
          case 101:
          case 150:
            errorMessage = 'Video cannot be embedded';
            break;
          default:
            errorMessage = `YouTube player error (${error.data})`;
        }
      } else if (error.message) {
        errorMessage = error.message;
      }
    }

    setPlayerState(prev => ({
      ...prev,
      hasError: true,
      errorMessage,
      isPlaying: false,
      isBuffering: false
    }));

    stopTimeTracking();

    // Notify parent component
    if (onError) {
      onError(error, errorMessage);
    }
  }, [onError]);

  /**
   * Start tracking current time
   */
  const startTimeTracking = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    
    intervalRef.current = setInterval(() => {
      if (player && player.getCurrentTime) {
        try {
          const currentTime = player.getCurrentTime();
          setPlayerState(prev => ({ ...prev, currentTime }));
          
          if (onTimeUpdate) {
            onTimeUpdate(currentTime);
          }
        } catch (error) {
          console.warn('Error getting current time from DiscoveryVideoPlayer:', error);
        }
      }
    }, 100);
  }, [player, onTimeUpdate]);

  /**
   * Stop tracking current time
   */
  const stopTimeTracking = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  /**
   * Play/pause toggle
   */
  const togglePlayPause = useCallback(() => {
    if (!player) return;

    try {
      if (playerState.isPlaying) {
        player.pauseVideo();
      } else {
        player.playVideo();
      }
    } catch (error) {
      console.error('Error toggling play/pause in DiscoveryVideoPlayer:', error);
      handlePlayerError(error);
    }
  }, [player, playerState.isPlaying, handlePlayerError]);

  /**
   * Toggle mute
   */
  const toggleMute = useCallback(() => {
    if (!player) return;

    try {
      if (playerState.isMuted) {
        player.unMute();
        setPlayerState(prev => ({ ...prev, isMuted: false }));
      } else {
        player.mute();
        setPlayerState(prev => ({ ...prev, isMuted: true }));
      }
    } catch (error) {
      console.error('Error toggling mute in DiscoveryVideoPlayer:', error);
      handlePlayerError(error);
    }
  }, [player, playerState.isMuted]);

  /**
   * Retry loading the video
   */
  const retryVideo = useCallback(() => {
    if (retryCountRef.current >= maxRetries) {
      console.warn('Max retries reached for DiscoveryVideoPlayer');
      return;
    }

    retryCountRef.current += 1;
    console.log(`Retrying DiscoveryVideoPlayer (attempt ${retryCountRef.current}/${maxRetries})`);

    setPlayerState(prev => ({
      ...prev,
      hasError: false,
      errorMessage: null,
      isBuffering: true
    }));

    // Force re-initialization by clearing and setting videoId
    if (player && player.loadVideoById) {
      try {
        player.loadVideoById(videoId);
      } catch (error) {
        console.error('Error retrying video load:', error);
        handlePlayerError(error);
      }
    }
  }, [player, videoId, handlePlayerError]);

  /**
   * Format time for display
   */
  const formatTime = useCallback((seconds) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, []);

  // Update volume when prop changes
  useEffect(() => {
    if (player && player.setVolume && !playerState.isMuted) {
      try {
        player.setVolume(volume * 100);
        setPlayerState(prev => ({ ...prev, volume }));
      } catch (error) {
        console.warn('Error setting volume in DiscoveryVideoPlayer:', error);
      }
    }
  }, [player, volume, playerState.isMuted]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className={`relative bg-black/20 backdrop-blur-lg border border-white/20 rounded-2xl shadow-lg overflow-hidden ${className}`}
      ref={playerContainerRef}
    >
      {/* Video Player Container */}
      <div className="aspect-video w-full relative">
        {videoId ? (
          <>
            <div id={playerId.current} className="w-full h-full" />
            
            {/* Loading Overlay */}
            {playerState.isBuffering && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                <div className="flex items-center space-x-2 text-white">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span className="text-sm">Loading video...</span>
                </div>
              </div>
            )}

            {/* Error Overlay */}
            {playerState.hasError && (
              <div className="absolute inset-0 bg-black/80 flex items-center justify-center p-4">
                <div className="text-center text-white space-y-3">
                  <AlertTriangle className="w-8 h-8 text-red-400 mx-auto" />
                  <div>
                    <h4 className="font-semibold">Video Player Error</h4>
                    <p className="text-sm text-white/80 mt-1">{playerState.errorMessage}</p>
                  </div>
                  <div className="flex gap-2 justify-center">
                    {retryCountRef.current < maxRetries && (
                      <Button
                        onClick={retryVideo}
                        size="sm"
                        className="bg-cyan-500 hover:bg-cyan-600 text-black"
                      >
                        Retry ({retryCountRef.current}/{maxRetries})
                      </Button>
                    )}
                    <Button
                      onClick={() => window.open(`https://www.youtube.com/watch?v=${videoId}`, '_blank')}
                      variant="outline"
                      size="sm"
                      className="border-white/20 text-white/80 hover:bg-white/10"
                    >
                      <ExternalLink className="w-3 h-3 mr-1" />
                      Open in YouTube
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Custom Controls Overlay */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Button
                    onClick={togglePlayPause}
                    size="sm"
                    variant="ghost"
                    className="text-white hover:bg-white/20"
                    disabled={playerState.hasError}
                  >
                    {playerState.isPlaying ? (
                      <Pause className="w-4 h-4" />
                    ) : (
                      <Play className="w-4 h-4" />
                    )}
                  </Button>
                  
                  <Button
                    onClick={toggleMute}
                    size="sm"
                    variant="ghost"
                    className="text-white hover:bg-white/20"
                    disabled={playerState.hasError}
                  >
                    {playerState.isMuted ? (
                      <VolumeX className="w-4 h-4" />
                    ) : (
                      <Volume2 className="w-4 h-4" />
                    )}
                  </Button>

                  <div className="text-white text-sm">
                    {formatTime(playerState.currentTime)} / {formatTime(playerState.duration)}
                  </div>
                </div>

                {sample && (
                  <div className="text-right text-white/80 text-sm max-w-xs truncate">
                    <div className="font-medium">{sample.title}</div>
                    <div className="text-xs">{sample.artist} • {sample.year}</div>
                  </div>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-black/10">
            <p className="text-white/50 text-center">
              Select a sample to start playing
            </p>
          </div>
        )}
      </div>

      {/* Sample Metadata Display */}
      {sample && !playerState.hasError && (
        <div className="p-4 border-t border-white/10">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <h3 className="text-white font-medium truncate">{sample.title}</h3>
              <p className="text-white/70 text-sm truncate">{sample.artist}</p>
              <div className="flex items-center space-x-4 mt-2 text-xs text-white/50">
                <span>{sample.year}</span>
                <span>{sample.genre}</span>
                <span>{formatTime(sample.duration)}</span>
                {sample.tempo && <span>{sample.tempo} BPM</span>}
              </div>
            </div>
            
            <Button
              onClick={() => window.open(`https://www.youtube.com/watch?v=${videoId}`, '_blank')}
              variant="ghost"
              size="sm"
              className="text-white/60 hover:text-white hover:bg-white/10 ml-2"
            >
              <ExternalLink className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </motion.div>
  );
}