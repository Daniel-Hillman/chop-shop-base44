import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';

export default function VideoPlayer({ youtubeUrl, setPlayerState, volume, onPlayerReady }) {
    const [videoId, setVideoId] = useState('');
    const [player, setPlayer] = useState(null);
    const [isAPIReady, setIsAPIReady] = useState(false);
    const intervalRef = useRef(null);

    useEffect(() => {
        const videoIdMatch = youtubeUrl.match(/(?:v=)([^&?]+)/) || youtubeUrl.match(/(?:youtu.be\/)([^&?]+)/);
        const newVideoId = videoIdMatch ? videoIdMatch[1] : '';
        setVideoId(newVideoId);
    }, [youtubeUrl]);

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
                    onPlayerReady?.(event.target);
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

    const startTimeTracking = () => {
        if (intervalRef.current) clearInterval(intervalRef.current);
        intervalRef.current = setInterval(() => {
            if (player && player.getCurrentTime) {
                const currentTime = player.getCurrentTime();
                setPlayerState(prev => ({ ...prev, currentTime }));
            }
        }, 100);
    };

    const stopTimeTracking = () => {
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
    };

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
            className="aspect-video w-full bg-black/20 backdrop-blur-lg border border-white/20 rounded-2xl shadow-lg overflow-hidden"
        >
            {videoId ? (
                <div id="youtube-player" className="w-full h-full"></div>
            ) : (
                <div className="w-full h-full flex items-center justify-center">
                    <p className="text-white/50">Enter a YouTube URL to get started</p>
                </div>
            )}
        </motion.div>
    );
}