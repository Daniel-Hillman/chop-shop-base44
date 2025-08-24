import React, { useRef, useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Ruler, ZoomIn, ZoomOut, Trash2, Save, Play, Pause } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import audioProcessingService from '../../services/AudioProcessingService.js';
import storageManager from '../../services/StorageManager.js';

export default function WaveformDisplay({ 
    playerState, 
    selectedChop, 
    setChopTime, 
    waveformData, 
    deleteChop, 
    youtubeUrl,
    allChops = [],
    onTimestampClick,
    isPlaying = false,
    onPlayPause
}) {
    const waveformRef = useRef(null);
    const canvasRef = useRef(null);
    const progressCanvasRef = useRef(null);
    const markersCanvasRef = useRef(null);
    const animationFrameRef = useRef(null);
    
    const [zoom, setZoom] = useState(1);
    const [editableTimes, setEditableTimes] = useState({ startTime: '', endTime: '' });
    const [cachedWaveformData, setCachedWaveformData] = useState(null);
    const [isLoadingCachedData, setIsLoadingCachedData] = useState(false);
    const [hoveredTimestamp, setHoveredTimestamp] = useState(null);

    // Load cached waveform data when available
    useEffect(() => {
        const loadCachedData = async () => {
            if (!youtubeUrl || waveformData) return;
            
            setIsLoadingCachedData(true);
            try {
                // Try to get cached audio data from AudioProcessingService first
                const cachedAudio = audioProcessingService.getAudioBuffer(youtubeUrl);
                if (cachedAudio?.waveformData) {
                    setCachedWaveformData(cachedAudio.waveformData);
                    setIsLoadingCachedData(false);
                    return;
                }
                
                // Fallback to StorageManager
                const storedData = await storageManager.retrieve(youtubeUrl);
                if (storedData?.waveformData) {
                    setCachedWaveformData(storedData.waveformData);
                }
            } catch (error) {
                console.warn('Failed to load cached waveform data:', error);
            } finally {
                setIsLoadingCachedData(false);
            }
        };
        
        loadCachedData();
    }, [youtubeUrl, waveformData]);

    useEffect(() => {
        if (selectedChop) {
            setEditableTimes({
                startTime: selectedChop.startTime.toFixed(4),
                endTime: selectedChop.endTime.toFixed(4)
            });
        } else {
            setEditableTimes({ startTime: '', endTime: '' });
        }
    }, [selectedChop]);

    const timeToPercent = (time) => (time / playerState.duration) * 100;
    
    // Get the best available waveform data
    const activeWaveformData = waveformData || cachedWaveformData;

    // Draw waveform on canvas
    const drawWaveform = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas || !activeWaveformData) return;

        const ctx = canvas.getContext('2d');
        const { width, height } = canvas;
        
        ctx.clearRect(0, 0, width, height);
        
        // Apply zoom transformation
        const zoomedWidth = width * zoom;
        const offsetX = (width - zoomedWidth) / 2;
        
        // Draw waveform
        ctx.strokeStyle = 'rgba(6, 182, 212, 0.8)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        
        const sliceWidth = zoomedWidth / activeWaveformData.length;
        let x = offsetX;
        
        for (let i = 0; i < activeWaveformData.length; i++) {
            const v = activeWaveformData[i] * height / 2;
            const y = height / 2 + v;
            
            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
            
            x += sliceWidth;
        }
        
        ctx.stroke();
        
        // Draw mirrored waveform
        ctx.strokeStyle = 'rgba(6, 182, 212, 0.4)';
        ctx.beginPath();
        x = offsetX;
        
        for (let i = 0; i < activeWaveformData.length; i++) {
            const v = activeWaveformData[i] * height / 2;
            const y = height / 2 - v;
            
            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
            
            x += sliceWidth;
        }
        
        ctx.stroke();
    }, [activeWaveformData, zoom]);

    useEffect(() => {
        drawWaveform();
    }, [drawWaveform]);

    // Draw sample timestamp markers
    const drawMarkers = useCallback(() => {
        const canvas = markersCanvasRef.current;
        if (!canvas || !allChops.length) return;

        const ctx = canvas.getContext('2d');
        const { width, height } = canvas;
        
        ctx.clearRect(0, 0, width, height);
        
        // Draw markers for all chops
        allChops.forEach((chop, index) => {
            const startX = (chop.startTime / playerState.duration) * width;
            const endX = (chop.endTime / playerState.duration) * width;
            const markerWidth = Math.max(2, endX - startX);
            
            // Use chop color or default colors
            const color = chop.color || `hsl(${(index * 137.5) % 360}, 70%, 50%)`;
            
            // Draw marker background
            ctx.fillStyle = `${color}33`; // 20% opacity
            ctx.fillRect(startX, 0, markerWidth, height);
            
            // Draw marker borders
            ctx.strokeStyle = color;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(startX, 0);
            ctx.lineTo(startX, height);
            ctx.moveTo(endX, 0);
            ctx.lineTo(endX, height);
            ctx.stroke();
            
            // Draw marker label
            if (markerWidth > 30) {
                ctx.fillStyle = color;
                ctx.font = '10px monospace';
                ctx.textAlign = 'center';
                const labelX = startX + markerWidth / 2;
                const labelText = chop.padId || `S${index + 1}`;
                ctx.fillText(labelText, labelX, height / 2 + 3);
            }
        });
    }, [allChops, playerState.duration]);

    useEffect(() => {
        drawMarkers();
    }, [drawMarkers]);

    // Real-time progress indicator
    const drawProgress = useCallback(() => {
        const canvas = progressCanvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const { width, height } = canvas;
        
        ctx.clearRect(0, 0, width, height);
        
        // Draw playhead
        const playheadX = (playerState.currentTime / playerState.duration) * width;
        
        // Playhead line
        ctx.strokeStyle = '#ef4444'; // red-500
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(playheadX, 0);
        ctx.lineTo(playheadX, height);
        ctx.stroke();
        
        // Playhead indicator at top
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.moveTo(playheadX - 6, 0);
        ctx.lineTo(playheadX + 6, 0);
        ctx.lineTo(playheadX, 12);
        ctx.closePath();
        ctx.fill();
        
        // Progress fill (played portion)
        if (isPlaying) {
            const gradient = ctx.createLinearGradient(0, 0, playheadX, 0);
            gradient.addColorStop(0, 'rgba(6, 182, 212, 0.1)');
            gradient.addColorStop(1, 'rgba(6, 182, 212, 0.3)');
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, playheadX, height);
        }
    }, [playerState.currentTime, playerState.duration, isPlaying]);

    // Animation loop for real-time progress
    useEffect(() => {
        const animate = () => {
            drawProgress();
            if (isPlaying) {
                animationFrameRef.current = requestAnimationFrame(animate);
            }
        };
        
        if (isPlaying) {
            animate();
        } else {
            drawProgress();
        }
        
        return () => {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
        };
    }, [drawProgress, isPlaying]);

    const handleWaveformClick = (e) => {
        if (!waveformRef.current) return;
        const rect = waveformRef.current.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const percent = (clickX / rect.width);
        const clickedTime = playerState.duration * percent;
        
        // Check if clicking on an existing marker
        const clickedChop = allChops.find(chop => {
            const startPercent = (chop.startTime / playerState.duration);
            const endPercent = (chop.endTime / playerState.duration);
            return percent >= startPercent && percent <= endPercent;
        });
        
        if (clickedChop) {
            // Jump to existing timestamp
            if (onTimestampClick) {
                onTimestampClick(clickedTime, clickedChop);
            }
        } else if (selectedChop) {
            // Modify selected chop boundaries
            const startDiff = Math.abs(clickedTime - selectedChop.startTime);
            const endDiff = Math.abs(clickedTime - selectedChop.endTime);
            if (startDiff < endDiff) {
                setChopTime('startTime', clickedTime);
            } else {
                setChopTime('endTime', clickedTime);
            }
        } else {
            // Create new timestamp
            setChopTime('startTime', clickedTime);
        }
    };

    const handleWaveformMouseMove = (e) => {
        if (!waveformRef.current) return;
        const rect = waveformRef.current.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const percent = (mouseX / rect.width);
        const hoveredTime = playerState.duration * percent;
        setHoveredTimestamp(hoveredTime);
    };

    const handleWaveformMouseLeave = () => {
        setHoveredTimestamp(null);
    };

    const handleTimeChange = (timeType, value) => {
        setEditableTimes(prev => ({ ...prev, [timeType]: value }));
    };

    const handleTimeUpdate = () => {
        const newStart = parseFloat(editableTimes.startTime);
        const newEnd = parseFloat(editableTimes.endTime);
        if (!isNaN(newStart) && !isNaN(newEnd)) {
            setChopTime('startTime', newStart);
            setChopTime('endTime', newEnd);
        }
    };

    const handleDelete = () => {
        if (selectedChop) {
            deleteChop(selectedChop.padId);
        }
    };
    
    return (
        <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-black/20 backdrop-blur-lg border border-white/20 rounded-2xl shadow-lg p-4 space-y-4"
        >
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-2 text-sm text-white/70">
                    <Ruler className="w-4 h-4 text-cyan-400"/>
                    <span>Waveform</span>
                    {!activeWaveformData && isLoadingCachedData && (
                        <span className="text-xs text-white/40">(loading cached data...)</span>
                    )}
                    {!activeWaveformData && !isLoadingCachedData && (
                        <span className="text-xs text-white/40">(analyzing audio...)</span>
                    )}
                    {activeWaveformData && (
                        <span className="text-xs text-green-400">
                            ({allChops.length} samples)
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    {onPlayPause && (
                        <button 
                            onClick={onPlayPause}
                            className="p-1 hover:bg-white/10 rounded-full"
                            title={isPlaying ? 'Pause' : 'Play'}
                        >
                            {isPlaying ? <Pause className="w-4 h-4"/> : <Play className="w-4 h-4"/>}
                        </button>
                    )}
                    <button 
                        onClick={() => setZoom(z => Math.max(1, z / 2))} 
                        className="p-1 hover:bg-white/10 rounded-full"
                        title="Zoom Out"
                    >
                        <ZoomOut className="w-5 h-5"/>
                    </button>
                    <span className="text-xs font-mono w-8 text-center">{zoom}x</span>
                    <button 
                        onClick={() => setZoom(z => Math.min(32, z * 2))} 
                        className="p-1 hover:bg-white/10 rounded-full"
                        title="Zoom In"
                    >
                        <ZoomIn className="w-5 h-5"/>
                    </button>
                </div>
            </div>
            <div
                ref={waveformRef}
                className="relative h-32 w-full bg-black/30 rounded-lg cursor-crosshair"
                onClick={handleWaveformClick}
                onMouseMove={handleWaveformMouseMove}
                onMouseLeave={handleWaveformMouseLeave}
            >
                {/* Waveform Canvas */}
                <canvas
                    ref={canvasRef}
                    width={800}
                    height={128}
                    className="absolute inset-0 w-full h-full"
                />
                
                {/* Sample Markers Canvas */}
                <canvas
                    ref={markersCanvasRef}
                    width={800}
                    height={128}
                    className="absolute inset-0 w-full h-full pointer-events-none"
                />
                
                {/* Progress and Playhead Canvas */}
                <canvas
                    ref={progressCanvasRef}
                    width={800}
                    height={128}
                    className="absolute inset-0 w-full h-full pointer-events-none"
                />

                {/* Selected Chop Region Overlay */}
                {selectedChop && (
                    <>
                    <div
                        className="absolute top-0 bottom-0 bg-cyan-500/30 backdrop-brightness-125 z-20 border-2 border-cyan-400"
                        style={{
                            left: `${timeToPercent(selectedChop.startTime)}%`,
                            width: `${timeToPercent(selectedChop.endTime - selectedChop.startTime)}%`,
                        }}
                    />
                     <div
                        className="absolute top-0 bottom-0 w-1 bg-cyan-400 cursor-ew-resize z-30"
                        style={{ left: `calc(${timeToPercent(selectedChop.startTime)}% - 2px)` }}
                        title="Drag to adjust start time"
                    />
                    <div
                        className="absolute top-0 bottom-0 w-1 bg-cyan-400 cursor-ew-resize z-30"
                        style={{ left: `calc(${timeToPercent(selectedChop.endTime)}% - 2px)` }}
                        title="Drag to adjust end time"
                    />
                    </>
                )}

                {/* Hover Timestamp Indicator */}
                {hoveredTimestamp !== null && (
                    <div
                        className="absolute top-0 bottom-0 w-0.5 bg-white/50 pointer-events-none z-25"
                        style={{ left: `${timeToPercent(hoveredTimestamp)}%` }}
                    >
                        <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 bg-black/80 text-white text-xs px-1 py-0.5 rounded whitespace-nowrap">
                            {hoveredTimestamp.toFixed(2)}s
                        </div>
                    </div>
                )}

                {/* Loading Overlay */}
                {!activeWaveformData && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg">
                        <div className="text-white/70 text-sm">
                            {isLoadingCachedData ? 'Loading cached waveform...' : 'Generating waveform...'}
                        </div>
                    </div>
                )}
            </div>
            {selectedChop && (
                <div className="grid grid-cols-3 gap-4 items-center">
                    <div className="flex items-center gap-2">
                        <label className="text-sm text-white/70">Start</label>
                        <Input 
                            type="number"
                            step="0.01"
                            value={editableTimes.startTime}
                            onChange={(e) => handleTimeChange('startTime', e.target.value)}
                            className="bg-white/10 border-white/20 w-full"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <label className="text-sm text-white/70">End</label>
                        <Input 
                            type="number"
                            step="0.01"
                            value={editableTimes.endTime}
                            onChange={(e) => handleTimeChange('endTime', e.target.value)}
                            className="bg-white/10 border-white/20 w-full"
                        />
                    </div>
                    <div className="flex gap-2">
                        <Button onClick={handleTimeUpdate} className="w-full bg-cyan-500 hover:bg-cyan-600">
                            <Save className="w-4 h-4 mr-2"/> Update
                        </Button>
                        <Button onClick={handleDelete} variant="destructive" className="w-full">
                            <Trash2 className="w-4 h-4 mr-2"/> Delete
                        </Button>
                    </div>
                </div>
            )}
        </motion.div>
    );
}