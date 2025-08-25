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
    audioBuffer,
    waveformAPI = null // New prop for waveform integration
}) {
    const playerStateRef = useRef(playerState);
    const padGridRef = useRef(null);
    const [editingPadId, setEditingPadId] = useState(null);
    const [isPadGridFocused, setIsPadGridFocused] = useState(false);

    // Keep player state ref updated
    useEffect(() => {
        playerStateRef.current = playerState;
    }, [playerState]);



    // Update sample boundaries when new samples are created
    const updateSampleBoundaries = useCallback((newSampleStart) => {
        // Find samples that end after our new sample starts
        const samplesToUpdate = chops.filter(chop => 
            chop.endTime > newSampleStart && chop.startTime < newSampleStart
        );
        
        samplesToUpdate.forEach(chop => {
            const updatedChop = {
                ...chop,
                endTime: newSampleStart
            };
            console.log(`🔄 Updating sample ${chop.padId}: end time ${chop.endTime}s -> ${newSampleStart}s`);
            onUpdateSample?.(updatedChop);
        });
    }, [chops, onUpdateSample]);

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
        
        // Method 2: Try YouTube API with different approaches
        if (youtubePlayer) {
            try {
                console.log(`📺 Trying YouTube API seekTo`);
                
                // Try the standard seekTo method
                if (youtubePlayer.seekTo) {
                    youtubePlayer.seekTo(timestamp, true);
                    console.log('✅ YouTube API seekTo complete');
                    return;
                }
                
                // Try alternative method if seekTo doesn't exist
                if (youtubePlayer.getCurrentTime && youtubePlayer.playVideo) {
                    console.log(`📺 Trying alternative YouTube API method`);
                    // Force a state change to trigger seeking
                    youtubePlayer.pauseVideo();
                    setTimeout(() => {
                        youtubePlayer.seekTo(timestamp, true);
                        youtubePlayer.playVideo();
                    }, 100);
                    console.log('✅ Alternative YouTube API method complete');
                    return;
                }
                
            } catch (e) {
                console.log('YouTube API methods failed:', e.message);
            }
        }
        
        // Method 3: Try direct iframe communication
        try {
            const iframe = document.querySelector('#youtube-player iframe');
            if (iframe && iframe.contentWindow) {
                console.log(`📺 Trying iframe postMessage`);
                iframe.contentWindow.postMessage(
                    JSON.stringify({
                        event: 'command',
                        func: 'seekTo',
                        args: [timestamp, true]
                    }),
                    'https://www.youtube.com'
                );
                console.log('✅ Iframe postMessage sent');
                return;
            }
        } catch (e) {
            console.log('Iframe communication failed:', e.message);
        }
        
        console.log('❌ All jump methods failed - timestamp:', timestamp);
    }, [youtubePlayer]);

    // Simple pad trigger - just jump to timestamp in YouTube video
    const triggerPad = useCallback((padId) => {
        console.log(`🎵 Triggering pad: ${padId}`);
        setSelectedPadId(padId);
        
        const chop = chops.find(c => c.padId === padId);
        if (chop) {
            console.log(`🎬 Jumping to timestamp: ${chop.startTime}s`);
            jumpToTimestamp(chop.startTime);
        }
    }, [chops, setSelectedPadId, jumpToTimestamp]);

    // Handle pad selection (no sample assigned)
    const selectPad = useCallback((padId) => {
        console.log(`👆 Selecting pad: ${padId}`);
        setSelectedPadId(padId);
    }, [setSelectedPadId]);

    // Create new sample with intelligent boundaries
    const createSample = useCallback((padIndex, customStartTime = null, customEndTime = null) => {
        const padId = `${activeBank}${padIndex}`;
        
        // Use custom times if provided (from waveform interaction)
        if (customStartTime !== null && customEndTime !== null) {
            console.log(`📝 WAVEFORM SAMPLE: Creating ${padId} from waveform interaction`);
            console.log(`🎯 Start: ${customStartTime.toFixed(3)}s`);
            console.log(`🎯 End: ${customEndTime.toFixed(3)}s`);
            console.log(`📏 Length: ${(customEndTime - customStartTime).toFixed(3)}s`);
            
            onCreateSample(padId, customStartTime, customEndTime);
            setSelectedPadId(padId);
            updateSampleBoundaries(customStartTime);
            return;
        }
        
        // Get current time from best available source
        let currentTime = 0;
        let timeSource = 'fallback';
        
        if (youtubePlayer && youtubePlayer.getCurrentTime) {
            try {
                currentTime = youtubePlayer.getCurrentTime();
                timeSource = 'youtube-api';
            } catch (e) {
                console.log('YouTube API getCurrentTime failed:', e.message);
            }
        }
        
        if (currentTime === 0) {
            const video = document.querySelector('video');
            if (video && video.currentTime) {
                currentTime = video.currentTime;
                timeSource = 'video-element';
            }
        }
        
        if (currentTime === 0) {
            currentTime = playerStateRef.current.currentTime;
            timeSource = 'player-state';
        }
        
        // Smart sample boundary calculation
        const duration = playerStateRef.current.duration || 180;
        let endTime;
        
        // Find the next sample's start time to use as our end boundary
        const existingSamples = chops
            .filter(chop => chop.startTime > currentTime)
            .sort((a, b) => a.startTime - b.startTime);
        
        if (existingSamples.length > 0) {
            // End at the next sample's start
            endTime = existingSamples[0].startTime;
            console.log(`🎯 Smart boundary: ending at next sample (${endTime}s)`);
        } else {
            // No samples ahead, use intelligent default based on context
            const defaultLength = 4; // Longer default for more musical content
            endTime = Math.min(currentTime + defaultLength, duration);
            console.log(`🎯 Smart boundary: using default length (${defaultLength}s)`);
        }
        
        // Ensure minimum sample length (0.1s to prevent clicks)
        const minLength = 0.1;
        if (endTime - currentTime < minLength) {
            endTime = Math.min(currentTime + minLength, duration);
        }
        
        console.log(`📝 SMART SAMPLE: Creating ${padId}`);
        console.log(`⏱️ Time source: ${timeSource}`);
        console.log(`🎯 Start: ${currentTime.toFixed(3)}s`);
        console.log(`🎯 End: ${endTime.toFixed(3)}s`);
        console.log(`📏 Length: ${(endTime - currentTime).toFixed(3)}s`);
        
        onCreateSample(padId, currentTime, endTime);
        setSelectedPadId(padId);
        
        // Update existing samples that might now need boundary adjustments
        updateSampleBoundaries(currentTime);
    }, [activeBank, onCreateSample, setSelectedPadId, youtubePlayer, chops, updateSampleBoundaries]);

    // Focus management for pad grid
    useEffect(() => {
        const handleFocusIn = () => setIsPadGridFocused(true);
        const handleFocusOut = (e) => {
            // Only lose focus if clicking completely outside the pad grid area
            if (padGridRef.current && !padGridRef.current.contains(e.relatedTarget)) {
                setIsPadGridFocused(false);
            }
        };
        
        const handleClickOutside = (e) => {
            if (padGridRef.current && !padGridRef.current.contains(e.target)) {
                setIsPadGridFocused(false);
            }
        };

        const padGridElement = padGridRef.current;
        if (padGridElement) {
            padGridElement.addEventListener('focusin', handleFocusIn);
            padGridElement.addEventListener('focusout', handleFocusOut);
            document.addEventListener('click', handleClickOutside);
            
            return () => {
                padGridElement.removeEventListener('focusin', handleFocusIn);
                padGridElement.removeEventListener('focusout', handleFocusOut);
                document.removeEventListener('click', handleClickOutside);
            };
        }
    }, []);

    // Ultra-fast keyboard event handler with focus awareness
    useEffect(() => {
        const handleKeyPress = (e) => {
            // Skip if typing in input fields
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
                return;
            }

            // Only respond to keyboard if pad grid is focused
            if (!isPadGridFocused) {
                return;
            }

            const padIndex = keyboardMap[e.key.toLowerCase()];
            if (padIndex !== undefined) {
                // Prevent default immediately for fastest response
                e.preventDefault();
                e.stopPropagation();

                const targetPadId = `${activeBank}${padIndex}`;
                const existingChop = chops.find(c => c.padId === targetPadId);

                console.log(`🎹 ULTRA-FAST: Key ${e.key} -> Pad ${targetPadId} (focused: ${isPadGridFocused})`);

                if (existingChop) {
                    // Simple trigger
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

        // Use capture phase with passive: false for maximum responsiveness
        const options = { capture: true, passive: false };
        document.addEventListener('keydown', handleKeyPress, options);
        return () => document.removeEventListener('keydown', handleKeyPress, options);
    }, [chops, activeBank, triggerPad, createSample, selectPad, isPadGridFocused]);

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

    // Handle waveform-driven chop creation for selected pad
    const createSampleFromWaveform = useCallback((startTime, endTime) => {
        if (!selectedPadId) {
            console.log('⚠️ No pad selected for waveform chop creation');
            return false;
        }
        
        const padIndex = parseInt(selectedPadId.slice(1), 10);
        createSample(padIndex, startTime, endTime);
        return true;
    }, [selectedPadId, createSample]);

    // Expose API for waveform integration
    const padGridAPI = {
        createSampleFromWaveform,
        getSelectedPadId: () => selectedPadId,
        selectPad,
        triggerPad,
        jumpToTimestamp
    };

    // Update waveform API with pad grid methods
    useEffect(() => {
        if (waveformAPI && typeof waveformAPI === 'object') {
            waveformAPI.padGrid = padGridAPI;
        }
    }, [waveformAPI, padGridAPI]);



    const handlePadGridClick = () => {
        setIsPadGridFocused(true);
    };

    return (
        <div className="relative">
            {/* Simple Pad Activation Status Indicator */}
            <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`mb-4 flex items-center justify-between text-sm backdrop-blur-sm rounded-xl p-4 border transition-all duration-300 ${
                    isPadGridFocused 
                        ? 'bg-cyan-500/20 border-cyan-400/50' 
                        : 'bg-black/30 border-white/10'
                }`}
            >
                <div className="flex items-center gap-3">
                    <div className={`flex items-center gap-2 transition-colors duration-300 ${
                        isPadGridFocused ? 'text-cyan-300' : 'text-white/60'
                    }`}>
                        <div className={`w-3 h-3 rounded-full transition-all duration-300 ${
                            isPadGridFocused ? 'bg-cyan-400' : 'bg-white/30'
                        }`} />
                        <span className="font-medium">
                            {isPadGridFocused ? '🎹 Pads Active' : '💤 Click Pad Area to Activate'}
                        </span>
                    </div>
                    
                    {isPadGridFocused && chops.length > 0 && (
                        <div className="flex items-center gap-1 text-cyan-200">
                            <span className="text-green-400">🎵</span>
                            <span>{chops.length} samples</span>
                        </div>
                    )}
                </div>
                
                {!isPadGridFocused && (
                    <div className="text-xs text-white/40 italic">
                        Click on the pad grid to enable keyboard shortcuts
                    </div>
                )}
                
                {isPadGridFocused && (
                    <div className="text-xs text-cyan-200/80">
                        Press Q-W-E-R, A-S-D-F, Z-X-C-V, T-Y-U-I to trigger pads
                    </div>
                )}
            </motion.div>
            
            <motion.div 
                ref={padGridRef}
                initial={{ opacity: 0, y: 20 }}
                animate={{ 
                    opacity: 1, 
                    y: 0,
                    scale: isPadGridFocused ? 1.02 : 1
                }}
                transition={{ 
                    delay: 0.2,
                    scale: { type: 'spring', stiffness: 300, damping: 20 }
                }}
                onClick={handlePadGridClick}
                tabIndex={0}
                className={`grid grid-cols-4 grid-rows-4 gap-3 aspect-square backdrop-blur-lg rounded-2xl shadow-lg p-4 transition-all duration-300 cursor-pointer focus:outline-none ${
                    isPadGridFocused 
                        ? 'bg-black/30 border-2 border-cyan-400/60 shadow-xl shadow-cyan-500/20' 
                        : 'bg-black/20 border border-white/20 hover:border-white/30'
                }`}
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
                            isPadGridFocused={isPadGridFocused}
                            onEdit={handleEditTimestamp}
                            onDelete={handleDeleteSample}
                            onClick={() => {
                                setIsPadGridFocused(true); // Ensure focus when clicking pads
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