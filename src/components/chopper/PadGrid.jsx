import React, { useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import TriggerPad from './TriggerPad';

const keyboardMap = {
    '1': 0, '2': 1, '3': 2, '4': 3,
    'q': 4, 'w': 5, 'e': 6, 'r': 7,
    'a': 8, 's': 9, 'd': 10, 'f': 11,
    'z': 12, 'x': 13, 'c': 14, 'v': 15,
};

const audioContext = new (window.AudioContext || window.webkitAudioContext)();

export default function PadGrid({ 
    chops, 
    activeBank, 
    selectedPadId, 
    setSelectedPadId, 
    playerState, 
    onCreateSample,
    youtubePlayer 
}) {
    const playerStateRef = useRef(playerState);

    useEffect(() => {
        playerStateRef.current = playerState;
    }, [playerState]);

    const playAudio = (audioBuffer) => {
        if (!audioBuffer) return;
        const source = audioContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioContext.destination);
        source.start(0);
    };
    
    const handlePadTrigger = useCallback((padId) => {
        setSelectedPadId(padId);
        const chop = chops.find(c => c.padId === padId);
        if (chop) {
            if (chop.audioData) {
                playAudio(chop.audioData);
            } else if (youtubePlayer) {
                // Fallback for older chops without pre-sliced audio
                youtubePlayer.seekTo(chop.startTime, true);
                youtubePlayer.playVideo();
            }
        }
    }, [chops, setSelectedPadId, youtubePlayer]);

    const handlePadSelect = useCallback((padId) => {
        setSelectedPadId(padId);
    }, [setSelectedPadId]);

    const createSampleAtCurrentTime = useCallback((padIndex) => {
        const padId = `${activeBank}${padIndex}`;
        // Use the ref for the most up-to-date time
        const currentTime = playerStateRef.current.currentTime;
        
        const sampleLength = 2; 
        const endTime = Math.min(currentTime + sampleLength, playerStateRef.current.duration);
        
        onCreateSample(padId, currentTime, endTime);
        setSelectedPadId(padId);
    }, [activeBank, onCreateSample, setSelectedPadId]);
    
    useEffect(() => {
        const handleKeyDown = (e) => {
            const padIndex = keyboardMap[e.key.toLowerCase()];
            if (padIndex !== undefined) {
                e.preventDefault();
                
                if (playerStateRef.current.isPlaying) {
                    createSampleAtCurrentTime(padIndex);
                } else {
                    const targetPadId = `${activeBank}${padIndex}`;
                    const existingChop = chops.find(c => c.padId === targetPadId);
                    
                    if (existingChop) {
                        handlePadTrigger(targetPadId);
                    } else {
                        handlePadSelect(targetPadId);
                    }
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handlePadTrigger, handlePadSelect, createSampleAtCurrentTime, activeBank, chops]);

    return (
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
                        onClick={() => {
                            const existingChop = chops.find(c => c.padId === padId);
                            if (existingChop) {
                                handlePadTrigger(padId);
                            } else {
                                handlePadSelect(padId);
                            }
                        }}
                    />
                );
            })}
        </motion.div>
    );
}
