
import React, { useState, useEffect, useCallback } from 'react';
import VideoPlayer from '../components/chopper/VideoPlayer';
import WaveformDisplay from '../components/chopper/WaveformDisplay';
import PadGrid from '../components/chopper/PadGrid';
import Controls from '../components/chopper/Controls';
import { useAudioAnalysis } from '../hooks/useAudioAnalysis'; 
import { Youtube } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';

const padColors = [
    '#06b6d4', '#3b82f6', '#8b5cf6', '#d946ef',
    '#059669', '#10b981', '#65a30d', '#ca8a04',
    '#f97316', '#ef4444', '#ec4899', '#a855f7',
    '#22c55e', '#eab308', '#f43f5e', '#6366f1'
];

export default function ChopperPage() {
    const [youtubeUrl, setYoutubeUrl] = useState('https://www.youtube.com/watch?v=Soa3gO7tL-c');
    const [submittedUrl, setSubmittedUrl] = useState('https://www.youtube.com/watch?v=Soa3gO7tL-c');
    const [chops, setChops] = useState([]);
    const [activeBank, setActiveBank] = useState('A');
    const [selectedPadId, setSelectedPadId] = useState('A0');
    const [playerState, setPlayerState] = useState({ currentTime: 0, duration: 180, isPlaying: false });
    const [masterVolume, setMasterVolume] = useState(1);
    const [youtubePlayer, setYoutubePlayer] = useState(null);
    
    const { waveformData, audioBuffer, isAnalyzing } = useAudioAnalysis(youtubePlayer);
    const selectedChop = chops.find(c => c.padId === selectedPadId);

    const handleUrlSubmit = (e) => {
        e.preventDefault();
        setSubmittedUrl(youtubeUrl);
        setChops([]); 
    };

    const handlePlayerReady = useCallback((player) => {
        setYoutubePlayer(player);
    }, []);
    
    const sliceAudioBuffer = (buffer, startTime, endTime) => {
        if (!buffer) return null;
        const start = Math.floor(startTime * buffer.sampleRate);
        const end = Math.floor(endTime * buffer.sampleRate);
        const duration = endTime - startTime;
        if (duration <= 0) return null;

        const newBuffer = new AudioContext().createBuffer(
            buffer.numberOfChannels,
            end - start,
            buffer.sampleRate
        );

        for (let i = 0; i < buffer.numberOfChannels; i++) {
            newBuffer.copyToChannel(buffer.getChannelData(i).slice(start, end), i);
        }
        return newBuffer;
    };

    const setChopTime = useCallback((timeType, time) => {
        if (!selectedPadId) return;

        setChops(prevChops => {
            const existingChopIndex = prevChops.findIndex(c => c.padId === selectedPadId);
            
            if (existingChopIndex > -1) {
                const existingChop = prevChops[existingChopIndex];
                const newStartTime = timeType === 'startTime' ? time : existingChop.startTime;
                const newEndTime = timeType === 'endTime' ? time : existingChop.endTime;
                
                const updatedChops = [...prevChops];
                updatedChops[existingChopIndex] = { 
                    ...existingChop, 
                    [timeType]: time,
                    audioData: sliceAudioBuffer(audioBuffer, newStartTime, newEndTime)
                };
                return updatedChops;
            } else {
                const padIndex = parseInt(selectedPadId.slice(1), 10);
                const startTime = timeType === 'startTime' ? time : playerState.currentTime;
                const endTime = timeType === 'endTime' ? time : Math.min(playerState.currentTime + 2, playerState.duration);
                
                return [...prevChops, {
                    padId: selectedPadId,
                    startTime,
                    endTime,
                    color: padColors[padIndex % padColors.length],
                    audioData: sliceAudioBuffer(audioBuffer, startTime, endTime)
                }];
            }
        });
    }, [selectedPadId, playerState.currentTime, playerState.duration, audioBuffer]);

    const handleCreateSample = useCallback((padId, startTime, endTime) => {
        const padIndex = parseInt(padId.slice(1), 10);
        const newChop = {
            padId,
            startTime,
            endTime,
            color: padColors[padIndex % padColors.length],
            audioData: sliceAudioBuffer(audioBuffer, startTime, endTime)
        };

        setChops(prevChops => {
            const existingIndex = prevChops.findIndex(c => c.padId === padId);
            if (existingIndex > -1) {
                const updated = [...prevChops];
                updated[existingIndex] = newChop;
                return updated;
            } else {
                return [...prevChops, newChop];
            }
        });
    }, [audioBuffer]);

    return (
        <div className="space-y-6">
            <motion.div 
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="bg-black/20 backdrop-blur-lg border border-white/20 rounded-2xl shadow-lg p-6"
            >
                <form onSubmit={handleUrlSubmit} className="flex items-center gap-4">
                    <Youtube className="w-6 h-6 text-red-500 flex-shrink-0" />
                    <Input
                        type="text"
                        placeholder="Enter YouTube URL..."
                        value={youtubeUrl}
                        onChange={(e) => setYoutubeUrl(e.target.value)}
                        className="bg-white/10 border-white/20 placeholder-gray-400"
                    />
                    <Button type="submit" className="bg-cyan-500 hover:bg-cyan-600 text-black font-bold">Load Video</Button>
                </form>
                <div className="mt-4 text-sm text-white/60">
                    <p><strong>Pro Tip:</strong> Press any key (1-4, Q-R, A-F, Z-V) while the video is playing to instantly capture a sample at that moment!</p>
                </div>
            </motion.div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    <VideoPlayer 
                        youtubeUrl={submittedUrl}
                        setPlayerState={setPlayerState}
                        volume={masterVolume}
                        onPlayerReady={handlePlayerReady}
                    />
                    <WaveformDisplay 
                        playerState={playerState} 
                        selectedChop={selectedChop}
                        setChopTime={setChopTime}
                        waveformData={waveformData}
                    />
                </div>

                <div className="space-y-6">
                    <Controls
                        activeBank={activeBank}
                        setActiveBank={setActiveBank}
                        masterVolume={masterVolume}
                        setMasterVolume={setMasterVolume}
                        chops={chops}
                        youtubeUrl={submittedUrl}
                    />
                    <PadGrid 
                        chops={chops}
                        activeBank={activeBank}
                        selectedPadId={selectedPadId}
                        setSelectedPadId={setSelectedPadId}
                        setPlayerState={setPlayerState}
                        playerState={playerState}
                        onCreateSample={handleCreateSample}
                        youtubePlayer={youtubePlayer}
                    />
                </div>
            </div>
        </div>
    );
}
