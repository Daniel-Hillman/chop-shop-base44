import React, { useRef, useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Ruler, ZoomIn, ZoomOut, Trash2, Save, Play, Pause } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import audioProcessingService from '../../services/AudioProcessingService.js';
import storageManager from '../../services/StorageManager.js';
import smartWaveformGenerator from '../../services/SmartWaveformGenerator.js';

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
    const [panOffset, setPanOffset] = useState(0); // Pan offset in percentage (0-100)
    const [editableTimes, setEditableTimes] = useState({ startTime: '', endTime: '' });
    const [cachedWaveformData, setCachedWaveformData] = useState(null);
    const [isLoadingCachedData, setIsLoadingCachedData] = useState(false);
    const [hoveredTimestamp, setHoveredTimestamp] = useState(null);
    const [smartWaveformData, setSmartWaveformData] = useState(null);
    const [isGeneratingWaveform, setIsGeneratingWaveform] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [dragType, setDragType] = useState(null); // 'start' or 'end'
    const [dragStartX, setDragStartX] = useState(0);
    const [tempChopTimes, setTempChopTimes] = useState(null);
    const [justFinishedDragging, setJustFinishedDragging] = useState(false);
    const [isPanning, setIsPanning] = useState(false);
    const [panStartX, setPanStartX] = useState(0);
    const [panStartOffset, setPanStartOffset] = useState(0);

    // Load or generate waveform data
    useEffect(() => {
        const loadWaveformData = async () => {
            if (!youtubeUrl || waveformData) return;
            
            setIsLoadingCachedData(true);
            try {
                // Try to get cached audio data first
                const cachedAudio = audioProcessingService.getAudioBuffer(youtubeUrl);
                if (cachedAudio?.waveformData) {
                    setCachedWaveformData(cachedAudio.waveformData);
                    setIsLoadingCachedData(false);
                    return;
                }
                
                // Try StorageManager
                const storedData = await storageManager.retrieve(youtubeUrl);
                if (storedData?.waveformData) {
                    setCachedWaveformData(storedData.waveformData);
                    setIsLoadingCachedData(false);
                    return;
                }
                
                // Generate smart waveform as fallback
                console.log('🎵 No cached waveform found, generating smart waveform...');
                setIsGeneratingWaveform(true);
                
                const videoId = youtubeUrl.match(/(?:v=)([^&?]+)/)?.[1];
                if (videoId && playerState.duration > 0) {
                    const generatedWaveform = await smartWaveformGenerator.generateWaveform(
                        videoId, 
                        playerState.duration
                    );
                    setSmartWaveformData(generatedWaveform);
                    console.log('✅ Smart waveform generated successfully');
                }
                
            } catch (error) {
                console.warn('Failed to load waveform data:', error);
            } finally {
                setIsLoadingCachedData(false);
                setIsGeneratingWaveform(false);
            }
        };
        
        loadWaveformData();
    }, [youtubeUrl, waveformData, playerState.duration]);

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

    // Viewport calculations for zoom and pan
    const getViewport = useCallback(() => {
        const viewportWidth = 100 / zoom; // Percentage of total duration visible
        const maxPanOffset = Math.max(0, 100 - viewportWidth);
        const clampedPanOffset = Math.max(0, Math.min(panOffset, maxPanOffset));
        
        return {
            startPercent: clampedPanOffset,
            endPercent: clampedPanOffset + viewportWidth,
            viewportWidth,
            maxPanOffset
        };
    }, [zoom, panOffset]);

    const timeToPercent = useCallback((time) => {
        const viewport = getViewport();
        const timePercent = (time / playerState.duration) * 100;
        // Convert from global time percentage to viewport percentage
        return ((timePercent - viewport.startPercent) / viewport.viewportWidth) * 100;
    }, [playerState.duration, getViewport]);

    const percentToTime = useCallback((percent) => {
        const viewport = getViewport();
        // Convert from viewport percentage to global time percentage
        const globalPercent = viewport.startPercent + (percent / 100) * viewport.viewportWidth;
        return (globalPercent / 100) * playerState.duration;
    }, [playerState.duration, getViewport]);
    
    // Get the best available waveform data (priority order)
    const activeWaveformData = waveformData || cachedWaveformData || smartWaveformData;

    // Draw waveform on canvas with proper zoom and pan
    const drawWaveform = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas || !activeWaveformData) return;

        const ctx = canvas.getContext('2d');
        const { width, height } = canvas;
        
        ctx.clearRect(0, 0, width, height);
        
        const viewport = getViewport();
        
        // Calculate which samples to draw based on viewport
        const totalSamples = activeWaveformData.length;
        const startSample = Math.floor((viewport.startPercent / 100) * totalSamples);
        const endSample = Math.ceil((viewport.endPercent / 100) * totalSamples);
        const visibleSamples = endSample - startSample;
        
        if (visibleSamples <= 0) return;
        
        // Draw waveform (positive)
        ctx.strokeStyle = zoom > 4 ? 'rgba(6, 182, 212, 0.9)' : 'rgba(6, 182, 212, 0.8)';
        ctx.lineWidth = zoom > 8 ? 2 : 1;
        ctx.beginPath();
        
        const sliceWidth = width / visibleSamples;
        let x = 0;
        let firstPoint = true;
        
        for (let i = startSample; i < endSample && i < totalSamples; i++) {
            const amplitude = activeWaveformData[i] || 0;
            const scaledAmplitude = amplitude * height / 2 * (zoom > 2 ? 1.2 : 1); // Enhance amplitude at high zoom
            const y = height / 2 + scaledAmplitude;
            
            if (firstPoint) {
                ctx.moveTo(x, y);
                firstPoint = false;
            } else {
                ctx.lineTo(x, y);
            }
            
            x += sliceWidth;
        }
        
        ctx.stroke();
        
        // Draw mirrored waveform (negative)
        ctx.strokeStyle = zoom > 4 ? 'rgba(6, 182, 212, 0.6)' : 'rgba(6, 182, 212, 0.4)';
        ctx.beginPath();
        x = 0;
        firstPoint = true;
        
        for (let i = startSample; i < endSample && i < totalSamples; i++) {
            const amplitude = activeWaveformData[i] || 0;
            const scaledAmplitude = amplitude * height / 2 * (zoom > 2 ? 1.2 : 1);
            const y = height / 2 - scaledAmplitude;
            
            if (firstPoint) {
                ctx.moveTo(x, y);
                firstPoint = false;
            } else {
                ctx.lineTo(x, y);
            }
            
            x += sliceWidth;
        }
        
        ctx.stroke();
        
        // Draw zero line at high zoom levels
        if (zoom > 4) {
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
            ctx.lineWidth = 1;
            ctx.setLineDash([2, 2]);
            ctx.beginPath();
            ctx.moveTo(0, height / 2);
            ctx.lineTo(width, height / 2);
            ctx.stroke();
            ctx.setLineDash([]);
        }
        
        // Draw sample points at very high zoom
        if (zoom > 16 && visibleSamples < 200) {
            ctx.fillStyle = 'rgba(6, 182, 212, 0.8)';
            x = 0;
            
            for (let i = startSample; i < endSample && i < totalSamples; i++) {
                const amplitude = activeWaveformData[i] || 0;
                const scaledAmplitude = amplitude * height / 2 * 1.2;
                const y = height / 2 + scaledAmplitude;
                
                ctx.beginPath();
                ctx.arc(x, y, 1.5, 0, 2 * Math.PI);
                ctx.fill();
                
                x += sliceWidth;
            }
        }
    }, [activeWaveformData, zoom, getViewport]);

    useEffect(() => {
        drawWaveform();
    }, [drawWaveform]);

    // Draw sample timestamp markers with drag feedback
    const drawMarkers = useCallback(() => {
        const canvas = markersCanvasRef.current;
        if (!canvas || !allChops.length) return;

        const ctx = canvas.getContext('2d');
        const { width, height } = canvas;
        
        ctx.clearRect(0, 0, width, height);
        
        const viewport = getViewport();
        
        // Draw markers for all chops
        allChops.forEach((chop, index) => {
            // Use temp times if this chop is being dragged
            const displayChop = (isDragging && selectedChop?.padId === chop.padId && tempChopTimes) 
                ? tempChopTimes 
                : chop;
            
            // Convert times to viewport coordinates
            const startPercent = timeToPercent(displayChop.startTime);
            const endPercent = timeToPercent(displayChop.endTime);
            
            // Skip markers that are completely outside the viewport
            if (endPercent < 0 || startPercent > 100) return;
            
            // Clamp to viewport bounds
            const startX = Math.max(0, Math.min(width, (startPercent / 100) * width));
            const endX = Math.max(0, Math.min(width, (endPercent / 100) * width));
            const markerWidth = Math.max(1, endX - startX);
            
            // Use chop color or default colors
            const color = chop.color || `hsl(${(index * 137.5) % 360}, 70%, 50%)`;
            const isSelected = selectedChop?.padId === chop.padId;
            const isBeingDragged = isDragging && isSelected;
            
            // Only draw if marker has visible width
            if (markerWidth > 0) {
                // Draw marker background
                const bgOpacity = isBeingDragged ? '66' : (isSelected ? '44' : '33');
                ctx.fillStyle = `${color}${bgOpacity}`;
                ctx.fillRect(startX, 0, markerWidth, height);
                
                // Draw marker borders
                ctx.strokeStyle = color;
                ctx.lineWidth = isSelected ? 3 : 2;
                ctx.beginPath();
                if (startPercent >= 0) {
                    ctx.moveTo(startX, 0);
                    ctx.lineTo(startX, height);
                }
                if (endPercent <= 100) {
                    ctx.moveTo(endX, 0);
                    ctx.lineTo(endX, height);
                }
                ctx.stroke();
            }
            
            // Draw drag handles for selected chop
            if (isSelected && markerWidth > 0) {
                const handleSize = isBeingDragged ? 12 : (zoom > 4 ? 10 : 8);
                const handleY = height / 2;
                
                // Only draw handles if they're visible in viewport
                if (startPercent >= 0 && startPercent <= 100) {
                    // Start handle
                    ctx.fillStyle = color;
                    ctx.fillRect(startX - handleSize/2, handleY - handleSize/2, handleSize, handleSize);
                    
                    // Start handle border
                    ctx.strokeStyle = '#ffffff';
                    ctx.lineWidth = 2;
                    ctx.strokeRect(startX - handleSize/2, handleY - handleSize/2, handleSize, handleSize);
                    
                    // Start handle label
                    ctx.fillStyle = '#ffffff';
                    ctx.font = `bold ${zoom > 4 ? 12 : 10}px monospace`;
                    ctx.textAlign = 'center';
                    ctx.fillText('S', startX, handleY - handleSize/2 - 4);
                }
                
                if (endPercent >= 0 && endPercent <= 100) {
                    // End handle
                    ctx.fillStyle = color;
                    ctx.fillRect(endX - handleSize/2, handleY - handleSize/2, handleSize, handleSize);
                    
                    // End handle border
                    ctx.strokeStyle = '#ffffff';
                    ctx.lineWidth = 2;
                    ctx.strokeRect(endX - handleSize/2, handleY - handleSize/2, handleSize, handleSize);
                    
                    // End handle label
                    ctx.fillStyle = '#ffffff';
                    ctx.font = `bold ${zoom > 4 ? 12 : 10}px monospace`;
                    ctx.textAlign = 'center';
                    ctx.fillText('E', endX, handleY - handleSize/2 - 4);
                }
                
                // Drag feedback - show current times (enhanced for zoom)
                if (isBeingDragged && tempChopTimes) {
                    const fontSize = zoom > 4 ? 12 : 11;
                    ctx.font = `${fontSize}px monospace`;
                    ctx.fillStyle = '#ffffff';
                    ctx.strokeStyle = '#000000';
                    ctx.lineWidth = 3;
                    
                    // Start time (if visible)
                    if (startPercent >= 0 && startPercent <= 100) {
                        const precision = zoom > 8 ? 4 : 3;
                        const startText = `${tempChopTimes.startTime.toFixed(precision)}s`;
                        ctx.strokeText(startText, startX, handleY + handleSize/2 + 18);
                        ctx.fillText(startText, startX, handleY + handleSize/2 + 18);
                    }
                    
                    // End time (if visible)
                    if (endPercent >= 0 && endPercent <= 100) {
                        const precision = zoom > 8 ? 4 : 3;
                        const endText = `${tempChopTimes.endTime.toFixed(precision)}s`;
                        ctx.strokeText(endText, endX, handleY + handleSize/2 + 18);
                        ctx.fillText(endText, endX, handleY + handleSize/2 + 18);
                    }
                    
                    // Duration in center (if both handles visible or marker spans viewport)
                    if (markerWidth > 30) {
                        const duration = tempChopTimes.endTime - tempChopTimes.startTime;
                        const centerX = startX + markerWidth / 2;
                        const precision = zoom > 8 ? 4 : 3;
                        const durationText = `${duration.toFixed(precision)}s`;
                        ctx.strokeText(durationText, centerX, handleY - 12);
                        ctx.fillText(durationText, centerX, handleY - 12);
                    }
                }
            }
            
            // Draw marker label
            if (markerWidth > 30) {
                ctx.fillStyle = isSelected ? '#ffffff' : color;
                ctx.font = isSelected ? 'bold 10px monospace' : '10px monospace';
                ctx.textAlign = 'center';
                const labelX = startX + markerWidth / 2;
                const labelText = chop.padId || `S${index + 1}`;
                ctx.fillText(labelText, labelX, height / 2 + 3);
                
                // Show precise timing when dragging
                if (isBeingDragged && tempChopTimes) {
                    ctx.font = '8px monospace';
                    ctx.fillStyle = '#ffffff';
                    const duration = tempChopTimes.endTime - tempChopTimes.startTime;
                    const timeText = `${duration.toFixed(2)}s`;
                    ctx.fillText(timeText, labelX, height / 2 + 15);
                }
            }
        });
        
        // Draw cursor feedback
        if (isDragging && dragType) {
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1;
            ctx.setLineDash([2, 2]);
            ctx.beginPath();
            ctx.moveTo(0, height / 2);
            ctx.lineTo(width, height / 2);
            ctx.stroke();
            ctx.setLineDash([]);
        }
    }, [allChops, playerState.duration, selectedChop, isDragging, tempChopTimes, dragType]);

    useEffect(() => {
        drawMarkers();
    }, [drawMarkers]);

    // Precision editing functions with viewport support
    const pixelToTime = useCallback((pixelX, canvasWidth) => {
        const percent = (pixelX / canvasWidth) * 100;
        return percentToTime(percent);
    }, [percentToTime]);

    const timeToPixel = useCallback((time, canvasWidth) => {
        const percent = timeToPercent(time);
        return (percent / 100) * canvasWidth;
    }, [timeToPercent]);

    const findNearestZeroCrossing = useCallback((targetTime) => {
        if (!activeWaveformData) return targetTime;
        
        const sampleRate = activeWaveformData.length / playerState.duration;
        const targetSample = Math.round(targetTime * sampleRate);
        const searchRadius = Math.min(50, Math.floor(sampleRate * 0.01)); // 10ms search window
        
        let bestTime = targetTime;
        let minAmplitude = Math.abs(activeWaveformData[targetSample] || 0);
        
        for (let i = -searchRadius; i <= searchRadius; i++) {
            const sampleIndex = targetSample + i;
            if (sampleIndex >= 0 && sampleIndex < activeWaveformData.length) {
                const amplitude = Math.abs(activeWaveformData[sampleIndex]);
                if (amplitude < minAmplitude) {
                    minAmplitude = amplitude;
                    bestTime = sampleIndex / sampleRate;
                }
            }
        }
        
        return bestTime;
    }, [activeWaveformData, playerState.duration]);

    const handleMouseDown = useCallback((e) => {
        if (!selectedChop) return;
        
        const canvas = markersCanvasRef.current;
        if (!canvas) return;
        
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const canvasWidth = rect.width; // Use actual display width, not canvas width
        
        const startX = timeToPixel(selectedChop.startTime, canvasWidth);
        const endX = timeToPixel(selectedChop.endTime, canvasWidth);
        
        const tolerance = 12; // Increased tolerance for better UX
        
        if (Math.abs(x - startX) < tolerance) {
            setIsDragging(true);
            setDragType('start');
            setDragStartX(x);
            setTempChopTimes({ ...selectedChop });
            canvas.style.cursor = 'ew-resize';
            e.preventDefault();
            e.stopPropagation();
        } else if (Math.abs(x - endX) < tolerance) {
            setIsDragging(true);
            setDragType('end');
            setDragStartX(x);
            setTempChopTimes({ ...selectedChop });
            canvas.style.cursor = 'ew-resize';
            e.preventDefault();
            e.stopPropagation();
        }
    }, [selectedChop, timeToPixel]);

    const handleMouseMove = useCallback((e) => {
        if (!isDragging || !tempChopTimes || !dragType) return;
        
        const canvas = markersCanvasRef.current;
        if (!canvas) return;
        
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const canvasWidth = rect.width; // Use actual display width
        
        const newTime = pixelToTime(x, canvasWidth);
        const snappedTime = findNearestZeroCrossing(newTime);
        
        if (dragType === 'start') {
            const maxStart = tempChopTimes.endTime - 0.05; // Minimum 0.05s sample
            const clampedTime = Math.max(0, Math.min(snappedTime, maxStart));
            setTempChopTimes(prev => ({ ...prev, startTime: clampedTime }));
            
            // Update editable times in real-time
            setEditableTimes(prev => ({ ...prev, startTime: clampedTime.toFixed(4) }));
        } else if (dragType === 'end') {
            const minEnd = tempChopTimes.startTime + 0.05; // Minimum 0.05s sample
            const clampedTime = Math.max(minEnd, Math.min(snappedTime, playerState.duration));
            setTempChopTimes(prev => ({ ...prev, endTime: clampedTime }));
            
            // Update editable times in real-time
            setEditableTimes(prev => ({ ...prev, endTime: clampedTime.toFixed(4) }));
        }
    }, [isDragging, tempChopTimes, dragType, pixelToTime, findNearestZeroCrossing, playerState.duration]);

    const handleMouseUp = useCallback(() => {
        if (isDragging && tempChopTimes && selectedChop) {
            // Apply the changes
            if (setChopTime) {
                setChopTime('startTime', tempChopTimes.startTime);
                setChopTime('endTime', tempChopTimes.endTime);
            }
            console.log(`🎯 Sample edited via drag: ${tempChopTimes.startTime.toFixed(3)}s - ${tempChopTimes.endTime.toFixed(3)}s (${(tempChopTimes.endTime - tempChopTimes.startTime).toFixed(3)}s duration)`);
        }
        
        // Reset drag state
        setIsDragging(false);
        setDragType(null);
        setDragStartX(0);
        setTempChopTimes(null);
        
        // Prevent immediate clicks after dragging
        setJustFinishedDragging(true);
        setTimeout(() => setJustFinishedDragging(false), 100);
        
        // Reset cursor
        const canvas = markersCanvasRef.current;
        if (canvas) {
            canvas.style.cursor = 'default';
        }
    }, [isDragging, tempChopTimes, selectedChop, setChopTime]);

    // Handle cursor styling and hover feedback
    const handleMouseHover = useCallback((e) => {
        if (isDragging) return; // Don't change cursor while dragging
        
        const canvas = markersCanvasRef.current;
        if (!canvas) return;
        
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const canvasWidth = rect.width; // Use actual display width
        
        if (selectedChop) {
            const startX = timeToPixel(selectedChop.startTime, canvasWidth);
            const endX = timeToPixel(selectedChop.endTime, canvasWidth);
            
            const tolerance = 12;
            
            if (Math.abs(x - startX) < tolerance) {
                canvas.style.cursor = 'ew-resize';
                canvas.title = `Drag to adjust start time (${selectedChop.startTime.toFixed(3)}s)`;
            } else if (Math.abs(x - endX) < tolerance) {
                canvas.style.cursor = 'ew-resize';
                canvas.title = `Drag to adjust end time (${selectedChop.endTime.toFixed(3)}s)`;
            } else {
                canvas.style.cursor = 'default';
                canvas.title = 'Click to set timestamp or drag markers to adjust';
            }
        } else {
            canvas.style.cursor = 'crosshair';
            canvas.title = 'Click to create timestamp';
        }
    }, [selectedChop, isDragging, timeToPixel]);

    // Panning handlers
    const handlePanStart = useCallback((e) => {
        if (zoom <= 1 || isDragging) return;
        
        // Check if clicking on empty space (not on markers)
        const canvas = markersCanvasRef.current;
        if (!canvas) return;
        
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        
        // Don't start panning if clicking near a marker handle
        if (selectedChop) {
            const canvasWidth = rect.width;
            const startX = timeToPixel(selectedChop.startTime, canvasWidth);
            const endX = timeToPixel(selectedChop.endTime, canvasWidth);
            
            if (Math.abs(x - startX) < 12 || Math.abs(x - endX) < 12) {
                return; // Let drag handler take over
            }
        }
        
        setIsPanning(true);
        setPanStartX(e.clientX);
        setPanStartOffset(panOffset);
        e.preventDefault();
    }, [zoom, isDragging, selectedChop, timeToPixel, panOffset]);

    const handlePanMove = useCallback((e) => {
        if (!isPanning) return;
        
        const deltaX = e.clientX - panStartX;
        const canvas = waveformRef.current;
        if (!canvas) return;
        
        const rect = canvas.getBoundingClientRect();
        const deltaPercent = (deltaX / rect.width) * (100 / zoom);
        const newPanOffset = panStartOffset - deltaPercent; // Negative for natural panning
        
        const viewport = getViewport();
        setPanOffset(Math.max(0, Math.min(newPanOffset, viewport.maxPanOffset)));
    }, [isPanning, panStartX, panStartOffset, zoom, getViewport]);

    const handlePanEnd = useCallback(() => {
        setIsPanning(false);
        setPanStartX(0);
        setPanStartOffset(0);
    }, []);

    // Add mouse event listeners
    useEffect(() => {
        const canvas = markersCanvasRef.current;
        const waveform = waveformRef.current;
        if (!canvas || !waveform) return;
        
        // Marker canvas events (for dragging)
        canvas.addEventListener('mousedown', handleMouseDown);
        canvas.addEventListener('mousemove', handleMouseHover);
        
        // Waveform events (for panning)
        waveform.addEventListener('mousedown', handlePanStart);
        
        // Document events
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mousemove', handlePanMove);
        document.addEventListener('mouseup', handleMouseUp);
        document.addEventListener('mouseup', handlePanEnd);
        
        return () => {
            canvas.removeEventListener('mousedown', handleMouseDown);
            canvas.removeEventListener('mousemove', handleMouseHover);
            waveform.removeEventListener('mousedown', handlePanStart);
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mousemove', handlePanMove);
            document.removeEventListener('mouseup', handleMouseUp);
            document.removeEventListener('mouseup', handlePanEnd);
        };
    }, [handleMouseDown, handleMouseHover, handleMouseMove, handleMouseUp, handlePanStart, handlePanMove, handlePanEnd]);

    // Real-time progress indicator with viewport support
    const drawProgress = useCallback(() => {
        const canvas = progressCanvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const { width, height } = canvas;
        
        ctx.clearRect(0, 0, width, height);
        
        // Calculate playhead position in viewport
        const playheadPercent = timeToPercent(playerState.currentTime);
        
        // Only draw playhead if it's visible in viewport
        if (playheadPercent >= 0 && playheadPercent <= 100) {
            const playheadX = (playheadPercent / 100) * width;
            
            // Playhead line
            ctx.strokeStyle = '#ef4444'; // red-500
            ctx.lineWidth = zoom > 4 ? 3 : 2;
            ctx.beginPath();
            ctx.moveTo(playheadX, 0);
            ctx.lineTo(playheadX, height);
            ctx.stroke();
            
            // Playhead indicator at top
            ctx.fillStyle = '#ef4444';
            const indicatorSize = zoom > 4 ? 8 : 6;
            ctx.beginPath();
            ctx.moveTo(playheadX - indicatorSize, 0);
            ctx.lineTo(playheadX + indicatorSize, 0);
            ctx.lineTo(playheadX, indicatorSize * 2);
            ctx.closePath();
            ctx.fill();
            
            // Current time display at high zoom
            if (zoom > 4) {
                ctx.fillStyle = '#ffffff';
                ctx.font = '10px monospace';
                ctx.textAlign = 'center';
                const timeText = `${playerState.currentTime.toFixed(zoom > 8 ? 3 : 2)}s`;
                ctx.strokeStyle = '#000000';
                ctx.lineWidth = 2;
                ctx.strokeText(timeText, playheadX, height - 8);
                ctx.fillText(timeText, playheadX, height - 8);
            }
        }
        
        // Progress fill (played portion) - only visible part
        if (isPlaying) {
            const viewport = getViewport();
            const playedStartPercent = Math.max(0, timeToPercent(0));
            const playedEndPercent = Math.min(100, timeToPercent(playerState.currentTime));
            
            if (playedEndPercent > playedStartPercent) {
                const startX = (playedStartPercent / 100) * width;
                const endX = (playedEndPercent / 100) * width;
                
                const gradient = ctx.createLinearGradient(startX, 0, endX, 0);
                gradient.addColorStop(0, 'rgba(6, 182, 212, 0.1)');
                gradient.addColorStop(1, 'rgba(6, 182, 212, 0.3)');
                ctx.fillStyle = gradient;
                ctx.fillRect(startX, 0, endX - startX, height);
            }
        }
    }, [playerState.currentTime, playerState.duration, isPlaying, timeToPercent, zoom, getViewport]);

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

    // Auto-pan to keep selected chop visible
    const autoPanToChop = useCallback((chop) => {
        if (!chop || zoom <= 1) return;
        
        const viewport = getViewport();
        const chopStartPercent = (chop.startTime / playerState.duration) * 100;
        const chopEndPercent = (chop.endTime / playerState.duration) * 100;
        
        // Check if chop is outside viewport
        if (chopEndPercent < viewport.startPercent || chopStartPercent > viewport.endPercent) {
            // Center the chop in viewport
            const chopCenterPercent = (chopStartPercent + chopEndPercent) / 2;
            const newPanOffset = chopCenterPercent - viewport.viewportWidth / 2;
            setPanOffset(Math.max(0, Math.min(newPanOffset, viewport.maxPanOffset)));
        }
    }, [zoom, getViewport, playerState.duration]);

    // Auto-pan when selected chop changes
    useEffect(() => {
        if (selectedChop) {
            autoPanToChop(selectedChop);
        }
    }, [selectedChop, autoPanToChop]);

    const handleWaveformClick = (e) => {
        // Don't handle clicks if we just finished dragging or panning
        if (isDragging || justFinishedDragging || isPanning) return;
        
        if (!waveformRef.current) return;
        const rect = waveformRef.current.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const percent = (clickX / rect.width) * 100;
        const clickedTime = percentToTime(percent);
        
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
                const snappedTime = findNearestZeroCrossing(clickedTime);
                setChopTime('startTime', snappedTime);
                console.log(`🎯 Start time set via click: ${snappedTime.toFixed(3)}s`);
            } else {
                const snappedTime = findNearestZeroCrossing(clickedTime);
                setChopTime('endTime', snappedTime);
                console.log(`🎯 End time set via click: ${snappedTime.toFixed(3)}s`);
            }
        } else {
            // Create new timestamp
            const snappedTime = findNearestZeroCrossing(clickedTime);
            setChopTime('startTime', snappedTime);
            console.log(`🎯 New timestamp created via click: ${snappedTime.toFixed(3)}s`);
        }
    };



    const handleWaveformMouseMove = useCallback((e) => {
        if (isPanning) {
            handlePanMove(e);
            return;
        }
        
        if (!waveformRef.current) return;
        const rect = waveformRef.current.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const percent = (mouseX / rect.width) * 100;
        const hoveredTime = percentToTime(percent);
        setHoveredTimestamp(hoveredTime);
    }, [isPanning, handlePanMove, percentToTime]);

    const handleWaveformMouseLeave = useCallback(() => {
        setHoveredTimestamp(null);
        handlePanEnd();
    }, [handlePanEnd]);

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
                        onClick={() => {
                            setZoom(z => Math.max(1, z / 2));
                            if (zoom <= 2) setPanOffset(0); // Reset pan when zooming out to 1x
                        }} 
                        className="p-1 hover:bg-white/10 rounded-full disabled:opacity-50"
                        title="Zoom Out"
                        disabled={zoom <= 1}
                    >
                        <ZoomOut className="w-5 h-5"/>
                    </button>
                    <button
                        onClick={() => {
                            setZoom(1);
                            setPanOffset(0);
                        }}
                        className="text-xs font-mono w-12 text-center hover:bg-white/10 rounded px-1 py-0.5 transition-colors"
                        title="Reset Zoom (1:1)"
                    >
                        {zoom}x
                    </button>
                    <button 
                        onClick={() => setZoom(z => Math.min(64, z * 2))} 
                        className="p-1 hover:bg-white/10 rounded-full"
                        title="Zoom In"
                    >
                        <ZoomIn className="w-5 h-5"/>
                    </button>
                    {zoom > 1 && (
                        <div className="text-xs text-white/50 ml-2">
                            {zoom > 1 ? 'Drag to pan • ' : ''}Click markers to drag
                        </div>
                    )}
                </div>
            </div>
            <div
                ref={waveformRef}
                className={`relative h-32 w-full bg-black/30 rounded-lg transition-all ${
                    isPanning ? 'cursor-grabbing' : 
                    zoom > 1 ? 'cursor-grab' : 'cursor-crosshair'
                }`}
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
                    className="absolute inset-0 w-full h-full"
                    style={{ zIndex: 10 }}
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
                    <div
                        className={`absolute top-0 bottom-0 bg-cyan-500/30 backdrop-brightness-125 z-20 border-2 border-cyan-400 transition-all duration-200 ${
                            isDragging ? 'bg-cyan-400/40 border-cyan-300' : ''
                        }`}
                        style={{
                            left: `${timeToPercent((tempChopTimes || selectedChop).startTime)}%`,
                            width: `${timeToPercent((tempChopTimes || selectedChop).endTime - (tempChopTimes || selectedChop).startTime)}%`,
                        }}
                    >
                        {/* Duration display when dragging */}
                        {isDragging && tempChopTimes && (
                            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-black/80 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                                {(tempChopTimes.endTime - tempChopTimes.startTime).toFixed(3)}s
                            </div>
                        )}
                    </div>
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
                        <div className="text-white/70 text-sm text-center">
                            {isLoadingCachedData ? (
                                'Loading cached waveform...'
                            ) : isGeneratingWaveform ? (
                                <div>
                                    <div>Generating smart waveform...</div>
                                    <div className="text-xs text-white/50 mt-1">Creating visual representation</div>
                                </div>
                            ) : (
                                <div>
                                    <div>Preparing waveform...</div>
                                    <div className="text-xs text-white/50 mt-1">Analyzing audio structure</div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
            {selectedChop && (
                <div className="space-y-3">
                    {/* Instruction text */}
                    <div className="text-xs text-white/60 text-center">
                        💡 Drag the <span className="text-cyan-400 font-mono">S</span> and <span className="text-cyan-400 font-mono">E</span> markers on the waveform to adjust timestamps, or edit values below
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4 items-center">
                        <div className="flex items-center gap-2">
                            <label className="text-sm text-white/70">Start</label>
                            <Input 
                                type="number"
                                step="0.001"
                                value={editableTimes.startTime}
                                onChange={(e) => handleTimeChange('startTime', e.target.value)}
                                className="bg-white/10 border-white/20 w-full text-xs font-mono"
                                placeholder="0.000"
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <label className="text-sm text-white/70">End</label>
                            <Input 
                                type="number"
                                step="0.001"
                                value={editableTimes.endTime}
                                onChange={(e) => handleTimeChange('endTime', e.target.value)}
                                className="bg-white/10 border-white/20 w-full text-xs font-mono"
                                placeholder="0.000"
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
                    
                    {/* Duration display */}
                    {selectedChop && (
                        <div className="text-center text-xs text-white/50">
                            Duration: <span className="text-cyan-400 font-mono">
                                {(selectedChop.endTime - selectedChop.startTime).toFixed(3)}s
                            </span>
                        </div>
                    )}
                </div>
            )}
        </motion.div>
    );
}