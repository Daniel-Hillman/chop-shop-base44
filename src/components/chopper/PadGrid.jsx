import React, { useEffect, useCallback, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import TriggerPad from './TriggerPad';
import TimestampEditor from './TimestampEditor';

// Keyboard mapping for pad triggers
const keyboardMap = {
    'q': 0, 'w': 1, 'e': 2, 'r': 3,
    'a': 4, 's': 5, 'd': 6, 'f': 7,
    'z': 8, 'x': 9, 'c': 10, 'v': 11,
    't': 12, 'y': 13, 'u': 14, 'i': 15,
};

export default function PadGridFixed({ 
    chops, 
    activeBank, 
    selectedPadId, 
    setSelectedPadId, 
    playerState, 
    onCreateSample,
    onUpdateSample,
    onDeleteSample,
    youtubePlayer,
    audioBuffer
}) {
    const playerStateRef = useRef(playerState);
    const [editingPadId, setEditingPadId] = useState(null);

    // Keep player state ref updated
    useEffect(() => {
        playerStateRef.current = playerState;
    }, [playerState]);

    // Jump to timestamp - try multiple methods
    const jumpToTimestamp = useCallback((timestamp) => {
        console.log(`🎯 FIXED PADGRID v3: Jumping to ${timestamp}s`);
        
        // Method 1: Try to find video element in various locations
        const selectors = [
            'video',
            '#youtube-player video',
            '#youtube-player iframe',
            'iframe[src*="youtube"]',
            '[id*="player"] video'
        ];
        
        for (const selector of selectors) {
            const element = document.querySelector(selector);
            if (element) {
                console.log(`📺 Found element with selector: ${selector}`);
                
                if (element.tagName === 'VIDEO') {
                    try {
                        console.log(`📺 Setting video currentTime to ${timestamp}s`);
                        element.currentTime = timestamp;
                        if (element.paused) {
                            element.play().catch(e => console.log('Play failed:', e.message));
                        }
                        console.log('✅ Video element jump complete');
                        return;
                    } catch (e) {
                        console.log(`❌ Video control failed: ${e.message}`);
                    }
                } else if (element.tagName === 'IFRAME') {
                    console.log('📺 Found iframe, trying postMessage');
                    try {
                        element.contentWindow.postMessage(
                            JSON.stringify({
                                event: 'command',
                                func: 'seekTo',
                                args: [timestamp, true]
                            }),
                            '*'
                        );
                        console.log('✅ Iframe postMessage sent');
                        return;
                    } catch (e) {
                        console.log(`❌ Iframe postMessage failed: ${e.message}`);
                    }
                }
            }
        }
        
        // Method 2: Try YouTube API as last resort
        if (youtubePlayer && youtubePlayer.seekTo) {
            try {
                console.log(`📺 Trying YouTube API as fallback`);
                youtubePlayer.seekTo(timestamp, true);
                console.log('✅ YouTube API jump complete');
                return;
            } catch (e) {
                console.log('YouTube API seekTo failed:', e.message);
            }
        }
        
        console.log('❌ All jump methods failed');
    }, [youtubePlayer]);

    // Handle pad trigger (play existing sample)
    const triggerPad = useCallback((padId) => {
        console.log(`🎵 Triggering pad: ${padId}`);
        setSelectedPadId(padId);
        
        const chop = chops.find(c => c.padId === padId);
        if (chop) {
            jumpToTimestamp(chop.startTime);
        }
    }, [chops, setSelectedPadId, jumpToTimestamp]);

    // Handle pad selection (no sample assigned)
    const selectPad = useCallback((padId) => {
        console.log(`👆 Selecting pad: ${padId}`);
        setSelectedPadId(padId);
    }, [setSelectedPadId]);

    // Create new sample at current time - GET TIME FROM YOUTUBE PLAYER
    const createSample = useCallback((padIndex) => {
        const padId = `${activeBank}${padIndex}`;
        
        // Try multiple ways to get current time
        let currentTime = 0;
        let timeSource = 'fallback';
        
        // Method 1: Try YouTube player API if available
        if (youtubePlayer && youtubePlayer.getCurrentTime) {
            try {
                currentTime = youtubePlayer.getCurrentTime();
                timeSource = 'youtube-api';
            } catch (e) {
                console.log('YouTube API getCurrentTime failed:', e.message);
            }
        }
        
        // Method 2: Try video element
        if (currentTime === 0) {
            const video = document.querySelector('video');
            if (video && video.currentTime) {
                currentTime = video.currentTime;
                timeSource = 'video-element';
            }
        }
        
        // Method 3: Try iframe video element
        if (currentTime === 0) {
            const iframe = document.querySelector('#youtube-player iframe');
            if (iframe) {
                try {
                    const iframeVideo = iframe.contentDocument?.querySelector('video');
                    if (iframeVideo && iframeVideo.currentTime) {
                        currentTime = iframeVideo.currentTime;
                        timeSource = 'iframe-video';
                    }
                } catch (e) {
                    console.log('Iframe access failed (expected):', e.message);
                }
            }
        }
        
        // Method 4: Fallback to playerState
        if (currentTime === 0) {
            currentTime = playerStateRef.current.currentTime;
            timeSource = 'player-state';
        }
        
        const duration = playerStateRef.current.duration || 180;
        const sampleLength = 2;
        const endTime = Math.min(currentTime + sampleLength, duration);
        
        console.log(`📝 FIXED PADGRID v3: Creating sample ${padId}`);
        console.log(`⏱️ Time source: ${timeSource}`);
        console.log(`🎯 Current time: ${currentTime}s`);
        console.log(`📊 Sample range: ${currentTime}s - ${endTime}s`);
        
        onCreateSample(padId, currentTime, endTime);
        setSelectedPadId(padId);
    }, [activeBank, onCreateSample, setSelectedPadId, youtubePlayer]);

    // Keyboard event handler
    useEffect(() => {
        const handleKeyPress = (e) => {
            // Skip if typing in input fields
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
                return;
            }

            const padIndex = keyboardMap[e.key.toLowerCase()];
            if (padIndex !== undefined) {
                e.preventDefault();
                e.stopPropagation();

                const targetPadId = `${activeBank}${padIndex}`;
                const existingChop = chops.find(c => c.padId === targetPadId);

                console.log(`🎹 FIXED PADGRID v3: Key ${e.key} -> Pad ${targetPadId}`);
                console.log(`🎮 YouTube player available: ${!!(youtubePlayer && youtubePlayer.getCurrentTime)}`);
                console.log(`📊 PlayerState currentTime: ${playerStateRef.current.currentTime}`);
                console.log(`▶️ PlayerState isPlaying: ${playerStateRef.current.isPlaying}`);
                console.log(`🎵 Existing chop: ${!!existingChop}`);

                if (existingChop) {
                    // Trigger existing sample
                    console.log(`🎯 Triggering existing sample`);
                    triggerPad(targetPadId);
                } else if (playerStateRef.current.isPlaying) {
                    // Create new sample while playing
                    console.log(`📝 Creating new sample (video is playing)`);
                    createSample(padIndex);
                } else {
                    // Just select the pad
                    console.log(`👆 Just selecting pad (video not playing)`);
                    selectPad(targetPadId);
                }
            }
        };

        document.addEventListener('keydown', handleKeyPress, true);
        return () => document.removeEventListener('keydown', handleKeyPress, true);
    }, [chops, activeBank, triggerPad, createSample, selectPad]);

    // Timestamp editing handlers
    const handleEditTimestamp = useCallback((padId) => {
        setEditingPadId(padId);
        setSelectedPadId(padId);
    }, [setSelectedPadId]);

    const handleSaveTimestamp = useCallback((updatedChop) => {
        onUpdateSample?.(updatedChop);
        setEditingPadId(null);
    }, [onUpdateSample]);

    const handleCancelEdit = useCallback(() => {
        setEditingPadId(null);
    }, []);

    const handleDeleteSample = useCallback((padId) => {
        onDeleteSample?.(padId);
        if (selectedPadId === padId) {
            setSelectedPadId(null);
        }
        if (editingPadId === padId) {
            setEditingPadId(null);
        }
    }, [onDeleteSample, selectedPadId, editingPadId, setSelectedPadId]);

    // Preview for timestamp editor (simplified - just jump to timestamp)
    const handlePreviewTimestamp = useCallback((previewData) => {
        jumpToTimestamp(previewData.startTime);
    }, [jumpToTimestamp]);

    return (
        <div className="relative">
            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="grid grid-cols-4 grid-rows-4 gap-3 aspect-square bg-black/20 backdrop-blur-lg border border-white/20 rounded-2xl shadow-lg p-4"
            >
                {Array.from({ length: 16 }).map((_, i) => {
                    const padId = `${activeBank}${i}`;
                    const chop = chops.find(c => c.padId === padId);
                    const keyLabel = Object.keys(keyboardMap).find(key => keyboardMap[key] === i);
                    
                    return (
                        <TriggerPad
                            key={padId}
                            padId={padId}
                            keyLabel={keyLabel}
                            isAssigned={!!chop}
                            isSelected={selectedPadId === padId}
                            color={chop?.color}
                            chop={chop}
                            onEdit={handleEditTimestamp}
                            onDelete={handleDeleteSample}
                            onClick={() => {
                                if (chop) {
                                    triggerPad(padId);
                                } else {
                                    selectPad(padId);
                                }
                            }}
                        />
                    );
                })}
            </motion.div>

            {/* Timestamp Editor */}
            <AnimatePresence>
                {editingPadId && (
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
                        <TimestampEditor
                            chop={chops.find(c => c.padId === editingPadId)}
                            audioDuration={playerState.duration}
                            onSave={handleSaveTimestamp}
                            onCancel={handleCancelEdit}
                            onPreview={handlePreviewTimestamp}
                            isPreviewPlaying={false}
                            className="max-w-md w-full mx-4"
                        />
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}