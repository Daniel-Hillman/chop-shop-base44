/**
 * MPC-Style Pad Grid - Enhanced UltraLowLatencyPadGrid with dual-mode support
 * Integrates with ModeManager, RecordingEngine, and maintains ultra-low latency performance
 */

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import TriggerPad from './TriggerPad';
import TimestampEditor from './TimestampEditor';
import LatencyDashboard from '../debug/LatencyDashboard';
import ultraLowLatencyEngine from '../../services/UltraLowLatencyPlaybackEngine.js';
import latencyMonitor from '../../services/LatencyMonitor.js';
// import { useAudioErrorRecovery } from '../../hooks/useErrorRecovery.js';
import {
    RecordingStateIndicator,
    QuantizationAlignmentIndicator,
    ModeSwitchAnimation,
    AudioLevelMeter,
    LayerColorIndicator,
    QuantizationGridOverlay
} from './VisualFeedback';

export default function MPCPadGrid({
    chops = [],
    activeBank = 'A',
    audioBuffer = null,
    onSampleCreated = null,
    onSampleUpdated = null,
    onSampleDeleted = null,
    // MPC-specific props
    modeManager = null,
    recordingEngine = null,
    drumKitManager = null,
    quantizationEngine = null,
    bpmEngine = null,
    youtubeIntegration = null,
    showQuantizationGrid = true,
    onPadTrigger = null
}) {
    // Existing state from UltraLowLatencyPadGrid
    const [selectedPadId, setSelectedPadId] = useState(null);
    const [keyPressStates, setKeyPressStates] = useState({});
    const [lastPlayTime, setLastPlayTime] = useState({});
    const [performanceMetrics, setPerformanceMetrics] = useState(null);
    const [latencyStatus, setLatencyStatus] = useState('unknown');
    const [showLatencyDashboard, setShowLatencyDashboard] = useState(false);
    const [preloadedSamples, setPreloadedSamples] = useState(new Set());
    const [isPreloading, setIsPreloading] = useState(false);

    // MPC-specific state
    const [currentMode, setCurrentMode] = useState('sample');
    const [isRecording, setIsRecording] = useState(false);
    const [recordingLayer, setRecordingLayer] = useState(null);
    const [padMappings, setPadMappings] = useState(new Map());
    const [quantizationGrid, setQuantizationGrid] = useState([]);
    const [currentBeat, setCurrentBeat] = useState(0);
    const [recordedEvents, setRecordedEvents] = useState({ chops: [], drums: [] });

    // Enhanced visual feedback state
    const [audioLevels, setAudioLevels] = useState({ chops: 0, drums: 0, master: 0 });
    const [peakLevels, setPeakLevels] = useState({ chops: 0, drums: 0, master: 0 });
    const [modeTransitioning, setModeTransitioning] = useState(false);
    const [padTriggerFeedback, setPadTriggerFeedback] = useState(new Map());
    const [quantizationAlignment, setQuantizationAlignment] = useState({ isOnGrid: false, distance: 0 });

    const audioBufferRef = useRef(null);
    const keyStateRef = useRef(new Set());
    const lastTriggerTimeRef = useRef(new Map());

    // const { handleError, clearError } = useAudioErrorRecovery();
    const handleError = (error, context) => console.error('Error:', error, context);
    const clearError = () => { };

    // Key mapping for 16-pad (4x4) MPC layout - ultra-fast access
    const keyMap = {
        // Top row (pads 1-4)
        'KeyQ': `${activeBank}1`, 'KeyW': `${activeBank}2`, 'KeyE': `${activeBank}3`, 'KeyR': `${activeBank}4`,
        // Second row (pads 5-8)
        'KeyA': `${activeBank}5`, 'KeyS': `${activeBank}6`, 'KeyD': `${activeBank}7`, 'KeyF': `${activeBank}8`,
        // Third row (pads 9-12)
        'KeyZ': `${activeBank}9`, 'KeyX': `${activeBank}10`, 'KeyC': `${activeBank}11`, 'KeyV': `${activeBank}12`,
        // Bottom row (pads 13-16)
        'KeyT': `${activeBank}13`, 'KeyY': `${activeBank}14`, 'KeyU': `${activeBank}15`, 'KeyI': `${activeBank}16`,
        // Number keys for alternative access
        'Digit1': `${activeBank}1`, 'Digit2': `${activeBank}2`, 'Digit3': `${activeBank}3`, 'Digit4': `${activeBank}4`,
        'Digit5': `${activeBank}5`, 'Digit6': `${activeBank}6`, 'Digit7': `${activeBank}7`, 'Digit8': `${activeBank}8`,
        'Digit9': `${activeBank}9`, 'Digit0': `${activeBank}10`
    };

    // Update audio buffer reference
    useEffect(() => {
        audioBufferRef.current = audioBuffer;
    }, [audioBuffer]);

    // Initialize ultra-low latency engine
    useEffect(() => {
        const initializeEngine = async () => {
            try {
                await ultraLowLatencyEngine.initialize();
                await ultraLowLatencyEngine.optimizeForUltraLowLatency();
                console.log('⚡ Ultra-low latency engine initialized for MPC');
            } catch (error) {
                handleError(error, 'initializing ultra-low latency engine');
            }
        };

        initializeEngine();
    }, [handleError]);    // In
itialize MPC services integration
    useEffect(() => {
        if (!modeManager || !recordingEngine) return;

        // Subscribe to mode changes
        const handleModeChange = (event) => {
            if (event.type === 'modeChange') {
                setModeTransitioning(true);

                // Smooth mode transition
                setTimeout(() => {
                    setCurrentMode(event.mode);
                    console.log(`🔄 Pad grid mode changed to: ${event.mode}`);

                    // Update pad mappings
                    updatePadMappings();

                    // Preload samples for new mode
                    setTimeout(preloadAllSamples, 100);

                    // End transition
                    setTimeout(() => setModeTransitioning(false), 300);
                }, 150);
            }
        };

        // Subscribe to recording events
        const handleRecordingEvent = (event) => {
            switch (event.type) {
                case 'recordingStarted':
                    setIsRecording(true);
                    setRecordingLayer(event.layer);
                    console.log(`🔴 Recording started: ${event.layer}`);
                    break;

                case 'recordingStopped':
                    setIsRecording(false);
                    setRecordingLayer(null);
                    console.log(`⏹️ Recording stopped`);
                    break;

                case 'eventRecorded':
                    // Update recorded events display
                    updateRecordedEvents();
                    break;

                case 'layerCleared':
                    updateRecordedEvents();
                    break;
            }
        };

        modeManager.onModeChange(handleModeChange);
        recordingEngine.onRecordingEvent(handleRecordingEvent);

        // Initialize current state
        setCurrentMode(modeManager.getMode());
        updatePadMappings();
        updateRecordedEvents();

        return () => {
            modeManager.offModeChange(handleModeChange);
            recordingEngine.offRecordingEvent(handleRecordingEvent);
        };
    }, [modeManager, recordingEngine]);

    // Audio level monitoring for visual feedback
    useEffect(() => {
        if (!recordingEngine) return;

        const updateAudioLevels = () => {
            try {
                const levels = recordingEngine.getAudioLevels();
                const peaks = recordingEngine.getPeakLevels();

                setAudioLevels(levels);
                setPeakLevels(peaks);
            } catch (error) {
                // Fallback to zero levels if not implemented
                setAudioLevels({ chops: 0, drums: 0, master: 0 });
                setPeakLevels({ chops: 0, drums: 0, master: 0 });
            }
        };

        // Update levels at 30fps for smooth visual feedback
        const levelInterval = setInterval(updateAudioLevels, 33);

        return () => clearInterval(levelInterval);
    }, [recordingEngine]);

    // Pad trigger visual feedback
    const addPadTriggerFeedback = useCallback((padId, intensity = 1.0) => {
        setPadTriggerFeedback(prev => {
            const newMap = new Map(prev);
            newMap.set(padId, { intensity, timestamp: Date.now() });
            return newMap;
        });

        // Remove feedback after animation duration
        setTimeout(() => {
            setPadTriggerFeedback(prev => {
                const newMap = new Map(prev);
                newMap.delete(padId);
                return newMap;
            });
        }, 300);
    }, []);

    // Initialize BPM and quantization tracking
    useEffect(() => {
        if (!bpmEngine || !quantizationEngine) return;

        // Subscribe to beat updates for grid visualization
        const handleBeatUpdate = (beat) => {
            setCurrentBeat(beat);

            // Update quantization alignment feedback
            try {
                const alignment = quantizationEngine.getGridAlignment(beat);
                setQuantizationAlignment(alignment);
            } catch (error) {
                // Fallback alignment
                setQuantizationAlignment({ isOnGrid: false, distance: 0 });
            }

            // Update quantization grid if visible
            if (showQuantizationGrid) {
                updateQuantizationGrid();
            }
        };

        bpmEngine.onBeatCallback(handleBeatUpdate);

        // Initial grid setup
        updateQuantizationGrid();

        return () => {
            // Cleanup beat callback
            if (bpmEngine.offBeatCallback) {
                bpmEngine.offBeatCallback(handleBeatUpdate);
            }
        };
    }, [bpmEngine, quantizationEngine, showQuantizationGrid]);

    // Initialize latency monitoring
    useEffect(() => {
        latencyMonitor.startMonitoring(500);

        const unsubscribe = latencyMonitor.subscribe((status) => {
            setPerformanceMetrics(status.breakdown);
            setLatencyStatus(status.overall.rating);

            if (status.overall.rating === 'poor' || status.overall.rating === 'unacceptable') {
                console.warn('🚨 Poor latency detected, attempting optimization...');
                preloadAllSamples();
            }
        });

        return () => {
            latencyMonitor.stopMonitoring();
            unsubscribe();
        };
    }, []);

    // Update pad mappings from mode manager
    const updatePadMappings = useCallback(() => {
        if (!modeManager) return;

        const mappings = modeManager.getAllPadMappings();
        setPadMappings(mappings);
        console.log(`📝 Updated pad mappings for ${currentMode} mode: ${mappings.size} pads`);
    }, [modeManager, currentMode]);

    // Update recorded events display
    const updateRecordedEvents = useCallback(() => {
        if (!recordingEngine) return;

        const events = recordingEngine.getAllRecordedEvents();
        setRecordedEvents(events);
    }, [recordingEngine]);

    // Update quantization grid visualization
    const updateQuantizationGrid = useCallback(() => {
        if (!quantizationEngine || !bpmEngine) return;

        try {
            const settings = quantizationEngine.getSettings();
            const bpm = bpmEngine.getBPM();

            // Calculate grid lines for current view (4 beats)
            const beatsToShow = 4;
            const subdivisions = {
                '1/4': 1,
                '1/8': 2,
                '1/16': 4,
                '1/32': 8,
                '1/64': 16
            };

            const linesPerBeat = subdivisions[settings.subdivision] || 4;
            const totalLines = beatsToShow * linesPerBeat;

            const gridLines = [];
            for (let i = 0; i <= totalLines; i++) {
                const position = i / linesPerBeat;
                const isMainBeat = i % linesPerBeat === 0;
                const isSwingPosition = settings.mode === 'swing' && (i % 2 === 1);

                gridLines.push({
                    position,
                    isMainBeat,
                    isSwingPosition,
                    opacity: isMainBeat ? 1.0 : 0.5
                });
            }

            setQuantizationGrid(gridLines);
        } catch (error) {
            console.warn('Failed to update quantization grid:', error);
        }
    }, [quantizationEngine, bpmEngine]);    //
 Preload samples for ultra - low latency
    const preloadAllSamples = useCallback(async () => {
        if (isPreloading) return;

        setIsPreloading(true);
        const startTime = performance.now();
        let preloadedCount = 0;
        const newPreloadedSet = new Set();

        try {
            if (currentMode === 'sample') {
                // Preload chop samples
                for (const chop of chops) {
                    if (chop.audioBuffer && chop.startTime !== undefined && chop.endTime !== undefined) {
                        const success = await ultraLowLatencyEngine.preloadSample(
                            chop.padId,
                            chop.audioBuffer,
                            chop.startTime,
                            chop.endTime
                        );

                        if (success) {
                            newPreloadedSet.add(chop.padId);
                            preloadedCount++;
                        }
                    }
                }
            } else if (currentMode === 'drum' && drumKitManager) {
                // Preload drum samples
                const currentKit = drumKitManager.getCurrentKit();
                if (currentKit) {
                    for (const [padId, sample] of Object.entries(currentKit.samples)) {
                        if (sample.audioBuffer) {
                            const success = await ultraLowLatencyEngine.preloadSample(
                                `drum_${padId}`,
                                sample.audioBuffer,
                                0,
                                sample.audioBuffer.duration
                            );

                            if (success) {
                                newPreloadedSet.add(padId);
                                preloadedCount++;
                            }
                        }
                    }
                }
            }

            setPreloadedSamples(newPreloadedSet);

            const preloadTime = performance.now() - startTime;
            console.log(`⚡ Preloaded ${preloadedCount} ${currentMode} samples in ${preloadTime.toFixed(2)}ms`);

        } catch (error) {
            handleError(error, 'preloading samples');
        } finally {
            setIsPreloading(false);
        }
    }, [chops, currentMode, drumKitManager, isPreloading, handleError]);

    // Auto-preload when mode or samples change
    useEffect(() => {
        if ((currentMode === 'sample' && chops.length > 0) ||
            (currentMode === 'drum' && drumKitManager?.getCurrentKit())) {
            const timeoutId = setTimeout(preloadAllSamples, 100);
            return () => clearTimeout(timeoutId);
        }
    }, [chops, currentMode, drumKitManager, preloadAllSamples]);

    // Internal pad trigger handler
    const handlePadTriggerInternal = useCallback(async (padId, timestamp, velocity = 127) => {
        try {
            // Record event if recording is active
            if (isRecording && recordingEngine) {
                recordingEngine.recordEvent(padId, timestamp, velocity);
            }

            // Trigger sample based on current mode
            let triggerResult = { success: false, latency: 0 };

            if (currentMode === 'sample') {
                // Sample mode: use YouTube integration if available
                if (youtubeIntegration && youtubeIntegration.isYouTubeReady()) {
                    try {
                        const playbackResult = await youtubeIntegration.playYouTubeChop(padId, velocity);
                        triggerResult = { success: true, latency: 0, ...playbackResult };

                        // Record into loop if recording is active
                        if (isRecording) {
                            await youtubeIntegration.recordYouTubeChop(padId, timestamp, velocity);
                        }
                    } catch (error) {
                        console.warn(`YouTube integration failed for ${padId}, falling back to direct playback:`, error);

                        // Fallback to direct chop playback
                        const chop = chops.find(c => c.padId === padId);
                        if (chop && preloadedSamples.has(padId)) {
                            triggerResult = await ultraLowLatencyEngine.triggerSample(padId, velocity / 127, {
                                volume: chop.volume || 1.0
                            });
                        }
                    }
                } else {
                    // Direct chop playback
                    const chop = chops.find(c => c.padId === padId);
                    if (chop && preloadedSamples.has(padId)) {
                        triggerResult = await ultraLowLatencyEngine.triggerSample(padId, velocity / 127, {
                            volume: chop.volume || 1.0
                        });
                    }
                }
            } else if (currentMode === 'drum' && drumKitManager) {
                // Drum mode: trigger drum sample
                if (preloadedSamples.has(padId)) {
                    triggerResult = await ultraLowLatencyEngine.triggerSample(`drum_${padId}`, velocity / 127);
                } else {
                    // Fallback to direct drum playback
                    triggerResult = await drumKitManager.playDrumSample(padId, velocity / 127);
                }
            }

            if (triggerResult.success) {
                setLastPlayTime(prev => ({ ...prev, [padId]: Date.now() }));
                latencyMonitor.recordTotalLatency(timestamp, performance.now());

                // Add visual feedback for pad trigger
                addPadTriggerFeedback(padId, velocity / 127);

                console.log(`⚡ ${currentMode} ${padId} triggered (${triggerResult.latency?.toFixed(2) || 0}ms)`);
            }

            // Notify parent component
            if (onPadTrigger) {
                onPadTrigger({
                    padId,
                    mode: currentMode,
                    timestamp,
                    velocity,
                    success: triggerResult.success,
                    latency: triggerResult.latency
                });
            }

        } catch (error) {
            console.error(`Error triggering pad ${padId}:`, error);
            handleError(error, `triggering pad ${padId}`);
        }
    }, [currentMode, chops, isRecording, recordingEngine, drumKitManager, preloadedSamples, youtubeIntegration, onPadTrigger, handleError, addPadTriggerFeedback]);    //
    Ultra - fast key handler with MPC integration
    const handleKeyDown = useCallback((event) => {
        const keyCode = event.code;
        const padId = keyMap[keyCode];

        if (keyStateRef.current.has(keyCode) || !padId) return;

        const now = performance.now();
        const lastTrigger = lastTriggerTimeRef.current.get(padId) || 0;
        if (now - lastTrigger < 10) return;

        keyStateRef.current.add(keyCode);
        lastTriggerTimeRef.current.set(padId, now);

        event.preventDefault();
        event.stopPropagation();

        // Record latency
        latencyMonitor.recordKeyPressLatency(now, performance.now());

        // Visual feedback
        setKeyPressStates(prev => ({ ...prev, [keyCode]: true }));
        setTimeout(() => {
            setKeyPressStates(prev => ({ ...prev, [keyCode]: false }));
        }, 150);

        // Handle pad trigger based on current mode
        handlePadTriggerInternal(padId, now, 127);

    }, [keyMap, handlePadTriggerInternal]);

    const handleKeyUp = useCallback((event) => {
        keyStateRef.current.delete(event.code);
    }, []);

    // Setup ultra-fast key listeners
    useEffect(() => {
        const options = { capture: true, passive: false };

        document.addEventListener('keydown', handleKeyDown, options);
        document.addEventListener('keyup', handleKeyUp, options);

        return () => {
            document.removeEventListener('keydown', handleKeyDown, options);
            document.removeEventListener('keyup', handleKeyUp, options);
        };
    }, [handleKeyDown, handleKeyUp]);

    // Handle pad clicks
    const handlePadClick = useCallback(async (padId) => {
        const startTime = performance.now();

        // Visual feedback
        setKeyPressStates(prev => ({ ...prev, [padId]: true }));
        setTimeout(() => {
            setKeyPressStates(prev => ({ ...prev, [padId]: false }));
        }, 150);

        // Trigger pad
        await handlePadTriggerInternal(padId, startTime, 127);
    }, [handlePadTriggerInternal]);

    // Get pad information based on current mode
    const getPadInfo = useCallback((padId) => {
        if (currentMode === 'sample') {
            // Check YouTube integration first, then fallback to chops
            let padData = null;
            let isAssigned = false;

            if (modeManager) {
                const youtubeData = modeManager.getYouTubeTimestamp(padId);
                if (youtubeData) {
                    padData = youtubeData;
                    isAssigned = true;
                }
            }

            // Fallback to chops array
            if (!padData) {
                const chop = chops.find(c => c.padId === padId);
                if (chop) {
                    padData = chop;
                    isAssigned = true;
                }
            }

            return {
                isAssigned,
                color: padData?.color || '#06b6d4',
                label: padData?.name || 'Sample',
                data: padData
            };
        } else {
            const mapping = padMappings.get(padId);
            return {
                isAssigned: !!mapping?.sampleUrl,
                color: mapping?.color || '#8b5cf6',
                label: mapping?.drumName || 'Drum',
                data: mapping
            };
        }
    }, [currentMode, chops, padMappings, modeManager]);

    // Helper functions for styling
    const getLatencyStatusClass = useCallback((status) => {
        const baseClass = 'flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium ';
        switch (status) {
            case 'excellent': return baseClass + 'bg-green-500/20 text-green-300';
            case 'good': return baseClass + 'bg-blue-500/20 text-blue-300';
            case 'acceptable': return baseClass + 'bg-yellow-500/20 text-yellow-300';
            case 'poor': return baseClass + 'bg-orange-500/20 text-orange-300';
            case 'unacceptable': return baseClass + 'bg-red-500/20 text-red-300';
            default: return baseClass + 'bg-gray-500/20 text-gray-300';
        }
    }, []);

    const getLatencyIndicatorClass = useCallback((status) => {
        const baseClass = 'w-2 h-2 rounded-full ';
        switch (status) {
            case 'excellent': return baseClass + 'bg-green-400';
            case 'good': return baseClass + 'bg-blue-400';
            case 'acceptable': return baseClass + 'bg-yellow-400';
            case 'poor': return baseClass + 'bg-orange-400';
            case 'unacceptable': return baseClass + 'bg-red-400 animate-pulse';
            default: return baseClass + 'bg-gray-400';
        }
    }, []);

    const getLatencyStatusText = useCallback((status) => {
        switch (status) {
            case 'excellent': return '⚡ Ultra-Low';
            case 'good': return '🚀 Low Latency';
            case 'acceptable': return '✓ OK';
            case 'poor': return '⚠️ High';
            case 'unacceptable': return '🚨 Critical';
            default: return '📊 Measuring...';
        }
    }, []);

    // Stop all samples
    const stopAllSamples = useCallback(() => {
        ultraLowLatencyEngine.stopAllSamples();
        console.log('🛑 All samples stopped');
    }, []);

    // Get performance metrics
    const getEngineMetrics = useCallback(() => {
        return ultraLowLatencyEngine.getPerformanceMetrics();
    }, []);

    // Mode indicator
    const getModeIndicator = () => {
        const modeConfig = {
            sample: { icon: '🎵', label: 'Sample Mode', color: 'text-cyan-400' },
            drum: { icon: '🥁', label: 'Drum Mode', color: 'text-purple-400' }
        };

        const config = modeConfig[currentMode] || modeConfig.sample;

        return (
            <div className={`flex items-center gap-2 px-3 py-1 rounded-full bg-gray-800/50 ${config.color}`}>
                <span className="text-lg">{config.icon}</span>
                <span className="font-medium">{config.label}</span>
                {isRecording && (
                    <div className="flex items-center gap-1">
                        <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                        <span className="text-xs text-red-400">REC</span>
                    </div>
                )}
            </div>
        );
    };    /
        / Generate pad grid with MPC enhancements
    const generatePadGrid = () => {
        const pads = [];
        const rows = 4;
        const cols = 4; // Changed from 8 to 4 for 16-pad MPC layout

        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                const padIndex = row * cols + col + 1;
                const padId = `${activeBank}${padIndex}`;
                const padInfo = getPadInfo(padId);

                const keyEntry = Object.entries(keyMap).find(([key, id]) => id === padId);
                const keyLabel = keyEntry ? keyEntry[0].replace('Key', '').replace('Digit', '') : '';

                // Check if this pad has recorded events
                const hasRecordedEvents = recordedEvents.chops.some(e => e.padId === padId) ||
                    recordedEvents.drums.some(e => e.padId === padId);

                pads.push(
                    <EnhancedTriggerPad
                        key={padId}
                        padId={padId}
                        keyLabel={keyLabel}
                        isAssigned={padInfo.isAssigned}
                        isSelected={selectedPadId === padId}
                        isPressed={keyPressStates[padId] || keyPressStates[keyEntry?.[0]] || false}
                        isPreloaded={preloadedSamples.has(padId)}
                        isRecording={isRecording && recordingLayer === (currentMode === 'sample' ? 'chops' : 'drums')}
                        hasRecordedEvents={hasRecordedEvents}
                        latencyStatus={latencyStatus}
                        lastPlayTime={lastPlayTime[padId]}
                        color={padInfo.color}
                        label={padInfo.label}
                        mode={currentMode}
                        data={padInfo.data}
                        quantizationGrid={showQuantizationGrid ? quantizationGrid : []}
                        currentBeat={currentBeat}
                        triggerFeedback={padTriggerFeedback.get(padId)}
                        quantizationAlignment={quantizationAlignment}
                        onClick={() => handlePadClick(padId)}
                        onEdit={() => setSelectedPadId(padId)}
                        onDelete={() => {
                            if (onSampleDeleted) onSampleDeleted(padId);
                        }}
                    />
                );
            }
        }

        return pads;
    };

    return (
        <div className="w-full h-full bg-gradient-to-br from-gray-900 via-black to-gray-900 p-6">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                    <h2 className="text-2xl font-bold text-white">MPC Pad Grid</h2>

                    {/* Enhanced mode indicator with animation */}
                    <ModeSwitchAnimation
                        currentMode={currentMode}
                        isTransitioning={modeTransitioning}
                        onModeChange={(newMode) => {
                            if (modeManager) {
                                modeManager.setMode(newMode);
                            }
                        }}
                    />

                    {/* Recording state indicator */}
                    <RecordingStateIndicator
                        isRecording={isRecording}
                        recordingLayer={recordingLayer}
                    />

                    {/* Quantization alignment feedback */}
                    <QuantizationAlignmentIndicator
                        quantizationEngine={quantizationEngine}
                        currentPosition={currentBeat}
                        showGrid={showQuantizationGrid}
                    />

                    <div className="text-sm text-white/60">
                        Bank {activeBank} • {currentMode === 'sample' ? chops.length : padMappings.size} assigned • {preloadedSamples.size} preloaded
                    </div>

                    <div className={getLatencyStatusClass(latencyStatus)}>
                        <div className={getLatencyIndicatorClass(latencyStatus)} />
                        {getLatencyStatusText(latencyStatus)}
                        {performanceMetrics?.totalLatency?.average && (
                            <span className="ml-1">
                                ({performanceMetrics.totalLatency.average.toFixed(1)}ms)
                            </span>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    {/* Audio level meters */}
                    <div className="flex items-center gap-3">
                        <div className="flex flex-col items-center gap-1">
                            <LayerColorIndicator
                                layer="chops"
                                isActive={currentMode === 'sample'}
                                isRecording={isRecording && recordingLayer === 'chops'}
                                size="small"
                                showLabel={false}
                            />
                            <AudioLevelMeter
                                audioLevel={audioLevels.chops}
                                peakLevel={peakLevels.chops}
                                layer="chops"
                                orientation="vertical"
                                size="small"
                            />
                        </div>

                        <div className="flex flex-col items-center gap-1">
                            <LayerColorIndicator
                                layer="drums"
                                isActive={currentMode === 'drum'}
                                isRecording={isRecording && recordingLayer === 'drums'}
                                size="small"
                                showLabel={false}
                            />
                            <AudioLevelMeter
                                audioLevel={audioLevels.drums}
                                peakLevel={peakLevels.drums}
                                layer="drums"
                                orientation="vertical"
                                size="small"
                            />
                        </div>

                        <div className="flex flex-col items-center gap-1">
                            <div className="w-3 h-3 bg-green-500 rounded-sm" />
                            <AudioLevelMeter
                                audioLevel={audioLevels.master}
                                peakLevel={peakLevels.master}
                                layer="master"
                                orientation="vertical"
                                size="small"
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={stopAllSamples}
                            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                        >
                            Stop All
                        </button>

                        <button
                            onClick={preloadAllSamples}
                            disabled={isPreloading}
                            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white rounded-lg transition-colors flex items-center gap-2"
                            title="Preload all samples for ultra-low latency"
                        >
                            {isPreloading ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Preloading...
                                </>
                            ) : (
                                <>
                                    ⚡ Preload
                                </>
                            )}
                        </button>

                        <button
                            onClick={() => setShowLatencyDashboard(true)}
                            className="px-3 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors text-sm"
                            title="Show performance dashboard"
                        >
                            📊 Dashboard
                        </button>
                    </div>
                </div>
            </div>

            <div className="relative mb-6">
                {/* Quantization grid overlay */}
                {showQuantizationGrid && (
                    <QuantizationGridOverlay
                        quantizationEngine={quantizationEngine}
                        bpmEngine={bpmEngine}
                        width={400}
                        height={320}
                        className="absolute inset-0 pointer-events-none z-10"
                    />
                )}

                <div className="grid grid-cols-4 gap-3 relative z-20">
                    {generatePadGrid()}
                </div>
            </div>

            <div className="flex items-center justify-between text-sm text-white/60">
                <div className="flex items-center gap-4">
                    <span>Active Voices: {getEngineMetrics()?.activeVoices || 0}</span>
                    <span>Buffer Size: {getEngineMetrics()?.bufferSize || 'N/A'}</span>
                    <span>Sample Rate: {getEngineMetrics()?.sampleRate || 'N/A'}Hz</span>
                    <span>Mode: {currentMode}</span>
                    {recordedEvents.chops.length > 0 && (
                        <span>Chops: {recordedEvents.chops.length}</span>
                    )}
                    {recordedEvents.drums.length > 0 && (
                        <span>Drums: {recordedEvents.drums.length}</span>
                    )}
                </div>
                <div className="flex items-center gap-4">
                    <span>Avg Latency: {getEngineMetrics()?.averageLatency?.toFixed(2) || '--'}ms</span>
                    <span>Min: {getEngineMetrics()?.minLatency?.toFixed(2) || '--'}ms</span>
                    <span>Max: {getEngineMetrics()?.maxLatency?.toFixed(2) || '--'}ms</span>
                </div>
            </div>

            <AnimatePresence>
                {selectedPadId && (
                    <TimestampEditor
                        padId={selectedPadId}
                        chop={currentMode === 'sample' ? chops.find(c => c.padId === selectedPadId) : null}
                        audioBuffer={audioBufferRef.current}
                        onSave={(updatedChop) => {
                            if (onSampleUpdated) onSampleUpdated(updatedChop);
                            setSelectedPadId(null);
                            setTimeout(preloadAllSamples, 100);
                        }}
                        onCancel={() => setSelectedPadId(null)}
                        onDelete={() => {
                            if (onSampleDeleted) onSampleDeleted(selectedPadId);
                            setSelectedPadId(null);
                        }}
                    />
                )}
            </AnimatePresence>

            <LatencyDashboard
                isVisible={showLatencyDashboard}
                onClose={() => setShowLatencyDashboard(false)}
            />
        </div>
    );
}/**
 * E
nhanced Trigger Pad with MPC-specific features
 */
function EnhancedTriggerPad({
    padId,
    keyLabel,
    isAssigned,
    isSelected,
    isPressed,
    isPreloaded,
    isRecording,
    hasRecordedEvents,
    latencyStatus,
    lastPlayTime,
    color,
    label,
    mode,
    data,
    quantizationGrid = [],
    currentBeat,
    triggerFeedback,
    quantizationAlignment,
    onClick,
    onEdit,
    onDelete
}) {
    const getPadStateClass = () => {
        let baseClass = 'relative w-full h-20 rounded-lg border-2 transition-all duration-150 cursor-pointer select-none overflow-hidden ';

        // Trigger feedback animation
        if (triggerFeedback) {
            baseClass += 'animate-pulse ';
        }

        if (isPressed) {
            baseClass += 'scale-95 shadow-lg ';
        }

        if (isSelected) {
            baseClass += 'ring-2 ring-white/50 ';
        }

        // Recording state visual feedback
        if (isRecording) {
            baseClass += 'ring-2 ring-red-500/50 animate-pulse ';
        }

        // Quantization alignment feedback
        if (quantizationAlignment?.isOnGrid) {
            baseClass += 'ring-1 ring-green-400/30 ';
        }

        if (isAssigned) {
            baseClass += 'border-white/30 shadow-md ';
        } else {
            baseClass += 'border-gray-600 ';
        }

        return baseClass;
    };

    // Get background style based on mode and state
    const getBackgroundStyle = () => {
        if (!isAssigned) {
            return { backgroundColor: '#374151' }; // Gray for unassigned
        }

        const baseColor = color || (mode === 'sample' ? '#06b6d4' : '#8b5cf6');
        const opacity = isPressed ? 1.0 : (isPreloaded ? 0.8 : 0.6);

        return {
            backgroundColor: baseColor,
            opacity
        };
    };

    // Render quantization grid overlay
    const renderQuantizationGrid = () => {
        if (!quantizationGrid.length || !isAssigned) return null;

        return (
            <div className="absolute inset-0 pointer-events-none">
                {quantizationGrid.slice(0, 8).map((gridLine, index) => (
                    <div
                        key={index}
                        className={`absolute top-0 w-px h-full ${gridLine.isMainBeat ? 'bg-white' : 'bg-white/30'
                            }`}
                        style={{
                            left: `${(index / 8) * 100}%`,
                            opacity: gridLine.opacity * 0.5
                        }}
                    />
                ))}

                {/* Current beat indicator */}
                <div
                    className="absolute top-0 w-0.5 h-full bg-yellow-400 animate-pulse"
                    style={{
                        left: `${((currentBeat % 4) / 4) * 100}%`,
                        opacity: 0.8
                    }}
                />
            </div>
        );
    };

    // Render recording indicator
    const renderRecordingIndicator = () => {
        if (!isRecording) return null;

        return (
            <div className="absolute top-1 right-1">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            </div>
        );
    };

    // Render recorded events indicator
    const renderRecordedEventsIndicator = () => {
        if (!hasRecordedEvents) return null;

        return (
            <div className="absolute top-1 left-1">
                <div className="w-2 h-2 bg-green-400 rounded-full" />
            </div>
        );
    };

    // Render preload indicator
    const renderPreloadIndicator = () => {
        if (!isPreloaded || !isAssigned) return null;

        return (
            <div className="absolute bottom-1 right-1">
                <div className="text-xs text-white/80">⚡</div>
            </div>
        );
    };

    return (
        <motion.div
            className={getPadStateClass()}
            style={getBackgroundStyle()}
            onClick={onClick}
            onDoubleClick={onEdit}
            whileTap={{ scale: 0.95 }}
            layout
        >
            {renderQuantizationGrid()}
            {renderRecordingIndicator()}
            {renderRecordedEventsIndicator()}
            {renderPreloadIndicator()}

            <div className="absolute inset-0 flex flex-col items-center justify-center p-2">
                <div className="text-xs font-mono text-white/60 mb-1">
                    {keyLabel}
                </div>

                <div className="text-sm font-medium text-white text-center leading-tight">
                    {isAssigned ? label : padId}
                </div>

                {mode === 'drum' && data?.drumType && (
                    <div className="text-xs text-white/60 mt-1">
                        {data.drumType}
                    </div>
                )}
            </div>

            {/* Latency status indicator */}
            {latencyStatus && isAssigned && (
                <div className={`absolute bottom-1 left-1 w-1 h-1 rounded-full ${latencyStatus === 'excellent' ? 'bg-green-400' :
                    latencyStatus === 'good' ? 'bg-blue-400' :
                        latencyStatus === 'acceptable' ? 'bg-yellow-400' :
                            latencyStatus === 'poor' ? 'bg-orange-400' :
                                'bg-red-400'
                    }`} />
            )}
        </motion.div>
    );
}