import React, { useEffect, useCallback, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import TriggerPad from './TriggerPad';
import TimestampEditor from './TimestampEditor';
import { SamplePlaybackEngine } from '../../services/SamplePlaybackEngine.js';

const keyboardMap = {
    'q': 0, 'w': 1, 'e': 2, 'r': 3,
    'a': 4, 's': 5, 'd': 6, 'f': 7,
    'z': 8, 'x': 9, 'c': 10, 'v': 11,
    't': 12, 'y': 13, 'u': 14, 'i': 15,
};

export default function PadGrid({ 
    chops, 
    activeBank, 
    selectedPadId, 
    setSelectedPadId, 
    playerState, 
    onCreateSample,
    onUpdateSample,
    onDeleteSample,
    youtubePlayer,
    audioBuffer // <-- Receive the full audio buffer
}) {
    const playerStateRef = useRef(playerState);
    const sampleEngineRef = useRef(null);
    const [playbackError, setPlaybackError] = useState(null);
    const [isEngineReady, setIsEngineReady] = useState(false);
    const [editingPadId, setEditingPadId] = useState(null);
    const [previewPlaying, setPreviewPlaying] = useState(false);
    const retryCountRef = useRef(0);
    const previewTimeoutRef = useRef(null);

    useEffect(() => {
        playerStateRef.current = playerState;
    }, [playerState]);

    // Initialize SamplePlaybackEngine (only for non-YouTube videos with audio buffers)
    useEffect(() => {
        const initializeEngine = async () => {
            try {
                if (audioBuffer) {
                    // Only initialize engine if we have an audio buffer (uploaded audio files)
                    if (!sampleEngineRef.current) {
                        sampleEngineRef.current = new SamplePlaybackEngine();
                    }
                    
                    console.log('Loading audio buffer into SamplePlaybackEngine...');
                    await sampleEngineRef.current.loadAudioBuffer('current-video', audioBuffer);
                    setIsEngineReady(true);
                    setPlaybackError(null);
                    retryCountRef.current = 0;
                    console.log('SamplePlaybackEngine ready for playback');
                } else if (youtubePlayer) {
                    // For YouTube videos, we don't need the audio engine - just timestamp jumping
                    console.log('YouTube player available - ready for timestamp-based operations');
                    setIsEngineReady(true); // Consider ready for timestamp-based operations
                    setPlaybackError(null);
                } else {
                    // No audio source available yet
                    console.log('No audio source available yet');
                    setIsEngineReady(false);
                }
            } catch (error) {
                console.error('Failed to initialize audio system:', error);
                setPlaybackError(`Audio system initialization failed: ${error.message}`);
                setIsEngineReady(false);
            }
        };

        initializeEngine();

        // Cleanup on unmount or audio buffer change
        return () => {
            if (sampleEngineRef.current) {
                sampleEngineRef.current.stopAllSamples();
                sampleEngineRef.current.cleanup();
                sampleEngineRef.current = null;
            }
        };
    }, [audioBuffer, youtubePlayer]);

    // Stop all samples when component unmounts
    useEffect(() => {
        return () => {
            if (sampleEngineRef.current) {
                sampleEngineRef.current.stopAllSamples();
            }
        };
    }, []);

    const playChopDirectVideo = useCallback(async (chop) => {
        console.log(`🎯 DIRECT VIDEO CONTROL v2: Jump to ${chop.startTime}s`);
        
        if (!chop) return;

        // Find video element and control it directly - SIMPLEST POSSIBLE
        const video = document.querySelector('video');
        if (video) {
            console.log(`📺 Found video, current time: ${video.currentTime}, jumping to: ${chop.startTime}`);
            video.currentTime = chop.startTime;
            if (video.paused) {
                video.play().catch(e => console.log('Play failed:', e.message));
            }
            console.log('✅ Video jump complete v2');
        } else {
            console.log('❌ No video element found v2');
        }
    }, []);
    
    const handlePadTrigger = useCallback(async (padId) => {
        setSelectedPadId(padId);
        const chop = chops.find(c => c.padId === padId);
        if (chop) {
            await playChopDirectVideo(chop);
        }
    }, [chops, setSelectedPadId, playChopDirectVideo]);

    const handlePadSelect = useCallback((padId) => {
        setSelectedPadId(padId);
    }, [setSelectedPadId]);

    const createSampleAtCurrentTime = useCallback((padIndex) => {
        const padId = `${activeBank}${padIndex}`;
        const currentTime = playerStateRef.current.currentTime;
        const sampleLength = 2; // Default 2-second sample
        const endTime = Math.min(currentTime + sampleLength, playerStateRef.current.duration);
        
        console.log(`Creating sample for ${padId}: ${currentTime}s - ${endTime}s`);
        console.log(`Player state:`, playerStateRef.current);
        
        onCreateSample(padId, currentTime, endTime);
        setSelectedPadId(padId);
    }, [activeBank, onCreateSample, setSelectedPadId]);

    // Handle timestamp editing
    const handleEditTimestamp = useCallback((padId) => {
        setEditingPadId(padId);
        setSelectedPadId(padId);
    }, [setSelectedPadId]);

    const handleSaveTimestamp = useCallback((updatedChop) => {
        if (onUpdateSample) {
            onUpdateSample(updatedChop);
        }
        setEditingPadId(null);
    }, [onUpdateSample]);

    const handleCancelEdit = useCallback(() => {
        setEditingPadId(null);
    }, []);

    const handleDeleteSample = useCallback((padId) => {
        if (onDeleteSample) {
            onDeleteSample(padId);
        }
        if (selectedPadId === padId) {
            setSelectedPadId(null);
        }
        if (editingPadId === padId) {
            setEditingPadId(null);
        }
    }, [onDeleteSample, selectedPadId, editingPadId, setSelectedPadId]);

    // Handle timestamp preview
    const handlePreviewTimestamp = useCallback(async (previewData) => {
        try {
            if (!sampleEngineRef.current || !isEngineReady) {
                throw new Error('SamplePlaybackEngine not ready');
            }

            // Stop any existing preview
            if (previewTimeoutRef.current) {
                clearTimeout(previewTimeoutRef.current);
                previewTimeoutRef.current = null;
            }

            if (previewPlaying) {
                // Stop preview
                sampleEngineRef.current.stopAllSamples();
                setPreviewPlaying(false);
            } else {
                // Start preview
                setPreviewPlaying(true);
                await sampleEngineRef.current.playSample(
                    previewData.startTime, 
                    previewData.duration, 
                    null, 
                    'preview'
                );

                // Auto-stop preview after duration
                previewTimeoutRef.current = setTimeout(() => {
                    setPreviewPlaying(false);
                }, previewData.duration * 1000);
            }
        } catch (error) {
            console.error('Failed to preview timestamp:', error);
            setPreviewPlaying(false);
        }
    }, [isEngineReady, previewPlaying]);

    // Cleanup preview timeout
    useEffect(() => {
        return () => {
            if (previewTimeoutRef.current) {
                clearTimeout(previewTimeoutRef.current);
            }
        };
    }, []);
    
    useEffect(() => {
        const handleKeyDown = (e) => {
            console.log('Key pressed:', e.key);
            
            // Ignore key presses if the user is typing in an input field
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
                console.log('Ignoring key press - user is typing in input field');
                return;
            }

            const padIndex = keyboardMap[e.key.toLowerCase()];
            console.log('Pad index for key:', padIndex);
            
            if (padIndex !== undefined) {
                e.preventDefault();
                e.stopPropagation();

                const targetPadId = `${activeBank}${padIndex}`;
                const existingChop = chops.find(c => c.padId === targetPadId);

                console.log(`=== KEY PRESS HANDLER ===`);
                console.log(`Key: ${e.key} -> Pad: ${targetPadId}`);
                console.log(`Existing chop:`, existingChop);
                console.log(`Player state:`, playerStateRef.current);
                console.log(`YouTube player:`, !!youtubePlayer);
                console.log(`========================`);

                if (existingChop) {
                    console.log(`🎯 Triggering existing chop for ${targetPadId}`);
                    handlePadTrigger(targetPadId);
                } else if (playerStateRef.current.isPlaying) {
                    console.log(`📝 Creating new sample for pad ${padIndex}`);
                    createSampleAtCurrentTime(padIndex);
                } else {
                    console.log(`👆 Selecting pad ${targetPadId}`);
                    handlePadSelect(targetPadId);
                }
            } else {
                console.log('Key not mapped to any pad');
            }
        };

        document.addEventListener('keydown', handleKeyDown, true); // Use capture phase
        return () => document.removeEventListener('keydown', handleKeyDown, true);
    }, [chops, activeBank, handlePadTrigger, createSampleAtCurrentTime, handlePadSelect]);

    return (
        <div className="relative">
            {/* Error Display */}
            {playbackError && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="absolute -top-12 left-0 right-0 bg-red-500/90 text-white text-sm px-3 py-2 rounded-lg backdrop-blur-sm z-10"
                >
                    <div className="flex items-center justify-between">
                        <span className="flex-1">{playbackError}</span>
                        <div className="flex items-center gap-2 ml-2">
                            {audioBuffer && retryCountRef.current < 3 && (
                                <button
                                    onClick={async () => {
                                        retryCountRef.current++;
                                        setPlaybackError(null);
                                        try {
                                            if (sampleEngineRef.current) {
                                                await sampleEngineRef.current.loadAudioBuffer('current-video', audioBuffer);
                                                setIsEngineReady(true);
                                            }
                                        } catch (error) {
                                            setPlaybackError(`Retry ${retryCountRef.current} failed: ${error.message}`);
                                        }
                                    }}
                                    className="text-xs bg-white/20 px-2 py-1 rounded hover:bg-white/30"
                                >
                                    Retry
                                </button>
                            )}
                            <button
                                onClick={() => setPlaybackError(null)}
                                className="text-white/80 hover:text-white"
                            >
                                ×
                            </button>
                        </div>
                    </div>
                </motion.div>
            )}

            {/* Engine Status Indicator */}
            {!isEngineReady && audioBuffer && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="absolute -top-8 left-0 right-0 text-center text-yellow-400 text-xs"
                >
                    Initializing audio engine...
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
                        color={chop?.color}
                        chop={chop}
                        onEdit={handleEditTimestamp}
                        onDelete={handleDeleteSample}
                        onClick={async () => {
                            if (chop) {
                                await handlePadTrigger(padId);
                            } else {
                                handlePadSelect(padId);
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
                            isPreviewPlaying={previewPlaying}
                            className="max-w-md w-full mx-4"
                        />
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}