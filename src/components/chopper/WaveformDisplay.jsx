import React, { useRef, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Ruler, ZoomIn, ZoomOut } from 'lucide-react';

export default function WaveformDisplay({ playerState, selectedChop, setChopTime, waveformData }) {
    const waveformRef = useRef(null);
    const canvasRef = useRef(null);
    const [zoom, setZoom] = useState(1);

    const timeToPercent = (time) => (time / playerState.duration) * 100;

    // Draw waveform on canvas
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || !waveformData) return;

        const ctx = canvas.getContext('2d');
        const { width, height } = canvas;
        
        ctx.clearRect(0, 0, width, height);
        
        // Draw waveform
        ctx.strokeStyle = 'rgba(6, 182, 212, 0.8)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        
        const sliceWidth = width / waveformData.length;
        let x = 0;
        
        for (let i = 0; i < waveformData.length; i++) {
            const v = waveformData[i] * height / 2;
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
        x = 0;
        
        for (let i = 0; i < waveformData.length; i++) {
            const v = waveformData[i] * height / 2;
            const y = height / 2 - v;
            
            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
            
            x += sliceWidth;
        }
        
        ctx.stroke();
    }, [waveformData]);

    const handleWaveformClick = (e) => {
        if (!waveformRef.current) return;
        const rect = waveformRef.current.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const percent = (clickX / rect.width);
        const clickedTime = playerState.duration * percent;
        
        // Simple logic: if click is closer to start or end, set that one.
        if (selectedChop) {
            const startDiff = Math.abs(clickedTime - selectedChop.startTime);
            const endDiff = Math.abs(clickedTime - selectedChop.endTime);
            if (startDiff < endDiff) {
                setChopTime('startTime', clickedTime);
            } else {
                setChopTime('endTime', clickedTime);
            }
        } else {
            // If no chop is selected, default to setting start time
            setChopTime('startTime', clickedTime);
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
                    {!waveformData && <span className="text-xs text-white/40">(analyzing audio...)</span>}
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={() => setZoom(z => Math.max(1, z / 2))} className="p-1 hover:bg-white/10 rounded-full"><ZoomOut className="w-5 h-5"/></button>
                    <span className="text-xs font-mono w-8 text-center">{zoom}x</span>
                    <button onClick={() => setZoom(z => Math.min(32, z * 2))} className="p-1 hover:bg-white/10 rounded-full"><ZoomIn className="w-5 h-5"/></button>
                </div>
            </div>
            <div
                ref={waveformRef}
                className="relative h-32 w-full bg-black/30 rounded-lg cursor-crosshair"
                onClick={handleWaveformClick}
            >
                <canvas
                    ref={canvasRef}
                    width={800}
                    height={128}
                    className="absolute inset-0 w-full h-full"
                />
                
                {/* Playhead */}
                <div 
                    className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-10"
                    style={{ left: `${timeToPercent(playerState.currentTime)}%` }}
                />

                {/* Selected Chop Region */}
                {selectedChop && (
                    <>
                    <div
                        className="absolute top-0 bottom-0 bg-cyan-500/30 backdrop-brightness-125 z-5"
                        style={{
                            left: `${timeToPercent(selectedChop.startTime)}%`,
                            width: `${timeToPercent(selectedChop.endTime - selectedChop.startTime)}%`,
                            borderColor: selectedChop.color
                        }}
                    />
                     <div
                        className="absolute top-0 bottom-0 w-1 bg-cyan-400 cursor-ew-resize z-10"
                        style={{ left: `calc(${timeToPercent(selectedChop.startTime)}% - 2px)` }}
                    />
                    <div
                        className="absolute top-0 bottom-0 w-1 bg-cyan-400 cursor-ew-resize z-10"
                        style={{ left: `calc(${timeToPercent(selectedChop.endTime)}% - 2px)` }}
                    />
                    </>
                )}
            </div>
        </motion.div>
    );
}