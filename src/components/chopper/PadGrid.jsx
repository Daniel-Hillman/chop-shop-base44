import React, { useEffect, useCallback, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import TriggerPad from './TriggerPad';
import TimestampEditor from './TimestampEditor';
import ultraLowLatencyEngine from '../../services/UltraLowLatencyPlaybackEngine.js';
import latencyMonitor from '../../services/LatencyMonitor.js';

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
    const [preloadedSamples, setPreloadedSamples] = useState(new Set());
    const [latencyStatus, setLatencyStatus] = useState('unknown');
    const [performanceMetrics, setPerformanceMetrics] = useState(null);

    // Keep player state ref updated
    useEffect(() => {
        playerStateRef.current = playerState;
    }, [playerState]);

    // Initialize ultra-low latency engine
    useEffect(() => {
        const initializeEngine = async () => {
            try {
                await ultraLowLatencyEngine.initialize();
                await ultraLowLatencyEngine.optimizeForUltraLowLatency();
                console.log('⚡ Ultra-low latency engine initialized for live chopping');
            } catch (error) {
                console.error('Failed to initialize ultra-low latency engine:', error);
            }
        };

        initializeEngine();
    }, []);

    // Initialize enhanced latency monitoring
    useEffect(() => {
        latencyMonitor.startMonitoring(500); // More frequent updates for real-time feedback
        
        const unsubscribe = latencyMonitor.subscribe((status) => {
            setPerformanceMetrics(status.breakdown);
            setLatencyStatus(status.overall.rating);
            
            // Get additional metrics from the engine
            const engineMetrics = ultraLowLatencyEngine.getPerformanceMetrics();
            setPerformanceMetrics(prev => ({
                ...prev,
                ...engineMetrics
            }));
        });
        
        return () => {
            latencyMonitor.stopMonitoring();
            unsubscribe();
        };
    }, []);

    // Aggressive sample preloading for maximum performance
    useEffect(() => {
        const preloadSamples = async () => {
            if (!audioBuffer || chops.length === 0) return;
            
            const startTime = performance.now();
            const newPreloadedSet = new Set();
            const preloadPromises = [];
            
            // Preload all samples in parallel for maximum speed
            for (const chop of chops) {
                if (chop.startTime !== undefined && chop.endTime !== undefined) {
                    const preloadPromise = ultraLowLatencyEngine.preloadSample(
                        chop.padId,
                        audioBuffer,
                        chop.startTime,
                        chop.endTime
                    ).then(success => {
                        if (success) {
                            newPreloadedSet.add(chop.padId);
                            return chop.padId;
                        }
                        return null;
                    }).catch(error => {
                        console.warn(`Failed to preload sample ${chop.padId}:`, error);
                        return null;
                    });
                    
                    preloadPromises.push(preloadPromise);
                }
            }
            
            // Wait for all preloads to complete
            const results = await Promise.allSettled(preloadPromises);
            const successCount = results.filter(r => r.status === 'fulfilled' && r.value).length;
            
            setPreloadedSamples(newPreloadedSet);
            
            const preloadTime = performance.now() - startTime;
            if (successCount > 0) {
                console.log(`⚡ Preloaded ${successCount} samples in ${preloadTime.toFixed(2)}ms (${(preloadTime/successCount).toFixed(2)}ms avg)`);
                
                // Optimize engine after preloading
                ultraLowLatencyEngine.optimizeForUltraLowLatency();
            }
        };

        // Debounce preloading to avoid excessive calls
        const timeoutId = setTimeout(preloadSamples, 50);
        return () => clearTimeout(timeoutId);
    }, [chops, audioBuffer]);

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

    // Handle pad trigger (play existing sample)
    const triggerPad = useCallback(async (padId) => {
        console.log(`🎵 Triggering pad: ${padId}`);
        setSelectedPadId(padId);
        
        const chop = chops.find(c => c.padId === padId);
        if (chop) {
            const startTime = performance.now();
            
            // Try ultra-low latency audio playback first
            if (preloadedSamples.has(padId)) {
                try {
                    const result = await ultraLowLatencyEngine.triggerSample(padId, 1.0, {
                        volume: chop.volume || 1.0
                    });
                    
                    if (result.success) {
                        console.log(`⚡ Ultra-low latency: ${padId} played in ${result.latency.toFixed(2)}ms`);
                        latencyMonitor.recordTotalLatency(startTime, performance.now());
                        return; // Success - don't fall back to video jumping
                    }
                } catch (error) {
                    console.warn(`Ultra-low latency failed for ${padId}, falling back to video:`, error);
                }
            }
            
            // Fallback to video jumping if ultra-low latency fails or sample not preloaded
            console.log(`🎬 Falling back to video jump for ${padId}`);
            jumpToTimestamp(chop.startTime);
        }
    }, [chops, setSelectedPadId, jumpToTimestamp, preloadedSamples]);

    // Handle pad selection (no sample assigned)
    const selectPad = useCallback((padId) => {
        console.log(`👆 Selecting pad: ${padId}`);
        setSelectedPadId(padId);
    }, [setSelectedPadId]);

    // Create new sample with intelligent boundaries
    const createSample = useCallback((padIndex) => {
        const padId = `${activeBank}${padIndex}`;
        
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
    }, [activeBank, onCreateSample, setSelectedPadId, youtubePlayer, chops]);

    // Ultra-fast keyboard event handler with optimizations
    useEffect(() => {
        const handleKeyPress = (e) => {
            // Skip if typing in input fields
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
                return;
            }

            const padIndex = keyboardMap[e.key.toLowerCase()];
            if (padIndex !== undefined) {
                // Prevent default immediately for fastest response
                e.preventDefault();
                e.stopPropagation();

                const targetPadId = `${activeBank}${padIndex}`;
                const existingChop = chops.find(c => c.padId === targetPadId);

                console.log(`🎹 ULTRA-FAST: Key ${e.key} -> Pad ${targetPadId}`);

                if (existingChop) {
                    // Priority path: Ultra-low latency sample triggering
                    if (preloadedSamples.has(targetPadId)) {
                        console.log(`⚡ Ultra-fast trigger: ${targetPadId}`);
                        // Trigger immediately without waiting for async operations
                        ultraLowLatencyEngine.triggerSample(targetPadId, 1.0, {
                            volume: existingChop.volume || 1.0
                        }).then(result => {
                            if (result.success) {
                                console.log(`🎵 Ultra-fast: ${targetPadId} in ${result.latency.toFixed(2)}ms`);
                                setSelectedPadId(targetPadId);
                            }
                        }).catch(error => {
                            console.warn(`Ultra-fast failed, falling back:`, error);
                            triggerPad(targetPadId);
                        });
                    } else {
                        // Fallback to normal trigger
                        triggerPad(targetPadId);
                    }
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
    }, [chops, activeBank, triggerPad, createSample, selectPad, preloadedSamples]);

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

    // Helper function for latency status
    const getLatencyStatusColor = (status) => {
        switch (status) {
            case 'excellent': return 'text-green-400';
            case 'good': return 'text-blue-400';
            case 'acceptable': return 'text-yellow-400';
            case 'poor': return 'text-orange-400';
            case 'unacceptable': return 'text-red-400';
            default: return 'text-gray-400';
        }
    };

    const getLatencyStatusText = (status) => {
        switch (status) {
            case 'excellent': return '⚡ Ultra-Low';
            case 'good': return '🚀 Low';
            case 'acceptable': return '✓ OK';
            case 'poor': return '⚠️ High';
            case 'unacceptable': return '🚨 Critical';
            default: return '📊 Measuring';
        }
    };

    return (
        <div className="relative">
            {/* Enhanced Performance Indicator */}
            {preloadedSamples.size > 0 && (
                <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-3 flex items-center justify-between text-sm bg-black/30 backdrop-blur-sm rounded-lg p-2 border border-white/10"
                >
                    <div className="flex items-center gap-3">
                        <div className={`flex items-center gap-1 ${getLatencyStatusColor(latencyStatus)}`}>
                            <div className="w-2 h-2 bg-current rounded-full animate-pulse" />
                            {getLatencyStatusText(latencyStatus)}
                        </div>
                        <div className="flex items-center gap-1 text-white/60">
                            <span className="text-green-400">⚡</span>
                            <span>{preloadedSamples.size}/{chops.length} ready</span>
                        </div>
                        {performanceMetrics?.audioContextLatency && (
                            <span className="text-white/40 text-xs">
                                Base: {performanceMetrics.audioContextLatency.base.toFixed(1)}ms
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                        {performanceMetrics?.averageLatency && (
                            <span className="text-white/60">
                                Avg: {performanceMetrics.averageLatency.toFixed(1)}ms
                            </span>
                        )}
                        {performanceMetrics?.minLatency !== undefined && (
                            <span className="text-green-400">
                                Min: {performanceMetrics.minLatency.toFixed(1)}ms
                            </span>
                        )}
                    </div>
                </motion.div>
            )}
            
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
                            isPreloaded={preloadedSamples.has(padId)}
                            latencyStatus={latencyStatus}
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