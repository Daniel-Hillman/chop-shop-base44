import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { SamplePlaybackEngine } from '../../services/SamplePlaybackEngine.js';

export default function VideoPlayer({ 
    youtubeUrl, 
    setPlayerState, 
    volume, 
    onPlayerReady,
    audioBuffer,
    onSyncError 
}) {
    const [videoId, setVideoId] = useState('');
    const [player, setPlayer] = useState(null);
    const [isAPIReady, setIsAPIReady] = useState(false);
    const intervalRef = useRef(null);
    const sampleEngineRef = useRef(null);
    const [isEngineReady, setIsEngineReady] = useState(false);
    const [syncError, setSyncError] = useState(null);
    const lastSeekTimeRef = useRef(0);
    const isSyncingRef = useRef(false);

    useEffect(() => {
        const videoIdMatch = youtubeUrl.match(/(?:v=)([^&?]+)/) || youtubeUrl.match(/(?:youtu.be\/)([^&?]+)/);
        const newVideoId = videoIdMatch ? videoIdMatch[1] : '';
        setVideoId(newVideoId);
    }, [youtubeUrl]);

    // Initialize SamplePlaybackEngine and load audio buffer
    useEffect(() => {
        const initializeEngine = async () => {
            try {
                if (!sampleEngineRef.current) {
                    sampleEngineRef.current = new SamplePlaybackEngine();
                }

                if (audioBuffer) {
                    console.log('Loading audio buffer into VideoPlayer SamplePlaybackEngine...');
                    await sampleEngineRef.current.loadAudioBuffer('video-sync', audioBuffer);
                    setIsEngineReady(true);
                    setSyncError(null);
                    console.log('VideoPlayer SamplePlaybackEngine ready for synchronization');
                } else {
                    setIsEngineReady(false);
                }
            } catch (error) {
                console.error('Failed to initialize VideoPlayer SamplePlaybackEngine:', error);
                setSyncError(`Engine initialization failed: ${error.message}`);
                setIsEngineReady(false);
                onSyncError?.(error);
            }
        };

        initializeEngine();
    }, [audioBuffer, onSyncError]);

    // Load YouTube IFrame API
    useEffect(() => {
        if (window.YT && window.YT.Player) {
            setIsAPIReady(true);
            return;
        }

        if (!window.onYouTubeIframeAPIReady) {
            const tag = document.createElement('script');
            tag.src = 'https://www.youtube.com/iframe_api';
            const firstScriptTag = document.getElementsByTagName('script')[0];
            firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

            window.onYouTubeIframeAPIReady = () => {
                setIsAPIReady(true);
            };
        }
    }, []);

    // Initialize player when API is ready and videoId is available
    useEffect(() => {
        if (!isAPIReady || !videoId) return;

        const newPlayer = new window.YT.Player('youtube-player', {
            height: '100%',
            width: '100%',
            videoId: videoId,
            playerVars: {
                autoplay: 0,
                controls: 1,
                modestbranding: 1,
                rel: 0,
                enablejsapi: 1
            },
            events: {
                onReady: (event) => {
                    setPlayer(event.target);
                    const duration = event.target.getDuration();
                    setPlayerState(prev => ({ ...prev, duration }));
                    
                    // Expose sync methods through player ready callback
                    const playerWithSync = {
                        ...event.target,
                        syncToTimestamp: syncVideoToTimestamp,
                        handleSampleTriggered,
                        getSyncStatus,
                        sampleEngine: sampleEngineRef.current
                    };
                    
                    onPlayerReady?.(playerWithSync);
                },
                onStateChange: (event) => {
                    const isPlaying = event.data === window.YT.PlayerState.PLAYING;
                    setPlayerState(prev => ({ ...prev, isPlaying }));
                    
                    if (isPlaying) {
                        startTimeTracking();
                    } else {
                        stopTimeTracking();
                    }
                }
            }
        });

        return () => {
            if (newPlayer && newPlayer.destroy) {
                newPlayer.destroy();
            }
            stopTimeTracking();
        };
    }, [isAPIReady, videoId, setPlayerState, onPlayerReady]);

    // Cleanup SamplePlaybackEngine when component unmounts or video changes
    useEffect(() => {
        return () => {
            if (sampleEngineRef.current) {
                sampleEngineRef.current.cleanup().catch(error => {
                    console.error('Failed to cleanup VideoPlayer SamplePlaybackEngine:', error);
                });
            }
        };
    }, [videoId]);

    const startTimeTracking = () => {
        if (intervalRef.current) clearInterval(intervalRef.current);
        intervalRef.current = setInterval(() => {
            if (player && player.getCurrentTime) {
                const currentTime = player.getCurrentTime();
                setPlayerState(prev => ({ ...prev, currentTime }));

                // Check for sync drift if audio engine is ready
                if (isEngineReady && sampleEngineRef.current) {
                    try {
                        const activeSamples = sampleEngineRef.current.getActiveSamples();
                        // If there are active samples, we could check for sync drift here
                        // For now, we'll just ensure the time is being tracked properly
                    } catch (error) {
                        console.warn('Error checking audio sync:', error);
                    }
                }
            }
        }, 100);
    };

    const stopTimeTracking = () => {
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
    };

    /**
     * Synchronize video playback with audio engine timestamp
     * @param {number} timestamp - Target timestamp in seconds
     * @param {boolean} maintainPlayback - Whether to continue playing after seek
     */
    const syncVideoToTimestamp = useCallback(async (timestamp, maintainPlayback = true) => {
        try {
            if (!player || !isEngineReady || !sampleEngineRef.current) {
                throw new Error('Video player or audio engine not ready for synchronization');
            }

            // Prevent recursive syncing
            if (isSyncingRef.current) {
                return;
            }

            isSyncingRef.current = true;
            lastSeekTimeRef.current = timestamp;

            // Get current video state
            const wasPlaying = player.getPlayerState() === window.YT.PlayerState.PLAYING;

            // Seek video to timestamp
            player.seekTo(timestamp, true);

            // Sync audio engine
            if (maintainPlayback && wasPlaying) {
                await sampleEngineRef.current.jumpToTimestamp(timestamp, true);
            } else {
                await sampleEngineRef.current.jumpToTimestamp(timestamp, false);
            }

            // Update player state
            setPlayerState(prev => ({ 
                ...prev, 
                currentTime: timestamp,
                isPlaying: maintainPlayback && wasPlaying
            }));

            setSyncError(null);
            console.log(`Video-audio sync completed at timestamp: ${timestamp}`);

        } catch (error) {
            console.error('Video-audio synchronization failed:', error);
            setSyncError(`Sync failed: ${error.message}`);
            onSyncError?.(error);
        } finally {
            isSyncingRef.current = false;
        }
    }, [player, isEngineReady, setPlayerState, onSyncError]);

    /**
     * Handle seamless seeking when samples are triggered
     * @param {number} sampleTimestamp - Timestamp of the triggered sample
     */
    const handleSampleTriggered = useCallback(async (sampleTimestamp) => {
        try {
            if (!isEngineReady || !sampleEngineRef.current) {
                throw new Error('Audio engine not ready for sample playback');
            }

            // Check if we need to sync video to sample timestamp
            const currentVideoTime = player?.getCurrentTime() || 0;
            const timeDifference = Math.abs(currentVideoTime - sampleTimestamp);

            // Only sync video if there's a significant time difference (>0.5 seconds)
            if (timeDifference > 0.5) {
                await syncVideoToTimestamp(sampleTimestamp, true);
            }

            // Play the sample through the audio engine
            await sampleEngineRef.current.playSample(sampleTimestamp);

            console.log(`Sample triggered at timestamp: ${sampleTimestamp}`);

        } catch (error) {
            console.error('Failed to handle sample trigger:', error);
            setSyncError(`Sample trigger failed: ${error.message}`);
            onSyncError?.(error);
        }
    }, [player, isEngineReady, syncVideoToTimestamp, onSyncError]);

    /**
     * Get current synchronization status
     */
    const getSyncStatus = useCallback(() => {
        return {
            isEngineReady,
            hasAudioBuffer: !!audioBuffer,
            syncError,
            lastSeekTime: lastSeekTimeRef.current,
            isSyncing: isSyncingRef.current,
            engineStatus: sampleEngineRef.current?.getStatus() || null
        };
    }, [isEngineReady, audioBuffer, syncError]);

    // Volume control
    useEffect(() => {
        if (player && player.setVolume) {
            player.setVolume(volume * 100);
        }
    }, [player, volume]);

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="aspect-video w-full bg-black/20 backdrop-blur-lg border border-white/20 rounded-2xl shadow-lg overflow-hidden relative"
        >
            {videoId ? (
                <>
                    <div id="youtube-player" className="w-full h-full"></div>
                    
                    {/* Sync Status Indicator */}
                    {audioBuffer && (
                        <div className="absolute top-2 right-2 flex items-center space-x-2">
                            <div className={`w-2 h-2 rounded-full ${
                                isEngineReady ? 'bg-green-400' : 'bg-yellow-400'
                            }`} title={isEngineReady ? 'Audio sync ready' : 'Audio sync initializing'} />
                            {syncError && (
                                <div className="bg-red-500/80 text-white text-xs px-2 py-1 rounded" title={syncError}>
                                    Sync Error
                                </div>
                            )}
                        </div>
                    )}
                </>
            ) : (
                <div className="w-full h-full flex items-center justify-center">
                    <p className="text-white/50">Enter a YouTube URL to get started</p>
                </div>
            )}
        </motion.div>
    );
}