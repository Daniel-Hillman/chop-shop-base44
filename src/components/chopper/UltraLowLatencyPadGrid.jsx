/**
 * Ultra-Low Latency Pad Grid
 * Optimized for instant sample triggering with minimal delay
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import TriggerPad from './TriggerPad';
import TimestampEditor from './TimestampEditor';
import LatencyDashboard from '../debug/LatencyDashboard';
import ultraLowLatencyEngine from '../../services/UltraLowLatencyPlaybackEngine.js';
import latencyMonitor from '../../services/LatencyMonitor.js';
import { useAudioErrorRecovery } from '../../hooks/useErrorRecovery.js';

export default function UltraLowLatencyPadGrid({ 
    chops = [], 
    activeBank = 'A',
    audioBuffer = null,
    onSampleCreated = null,
    onSampleUpdated = null,
    onSampleDeleted = null
}) {
    const [selectedPadId, setSelectedPadId] = useState(null);
    const [keyPressStates, setKeyPressStates] = useState({});
    const [lastPlayTime, setLastPlayTime] = useState({});
    const [performanceMetrics, setPerformanceMetrics] = useState(null);
    const [latencyStatus, setLatencyStatus] = useState('unknown');
    const [showLatencyDashboard, setShowLatencyDashboard] = useState(false);
    const [preloadedSamples, setPreloadedSamples] = useState(new Set());
    const [isPreloading, setIsPreloading] = useState(false);
    
    const audioBufferRef = useRef(null);
    const keyStateRef = useRef(new Set());
    const lastTriggerTimeRef = useRef(new Map());
    
    const { handleError, clearError } = useAudioErrorRecovery();

    // Key mapping for ultra-fast access
    const keyMap = {
        'KeyQ': `${activeBank}1`, 'KeyW': `${activeBank}2`, 'KeyE': `${activeBank}3`, 'KeyR': `${activeBank}4`,
        'KeyT': `${activeBank}5`, 'KeyY': `${activeBank}6`, 'KeyU': `${activeBank}7`, 'KeyI': `${activeBank}8`,
        'KeyO': `${activeBank}9`, 'KeyP': `${activeBank}10`,
        'KeyA': `${activeBank}11`, 'KeyS': `${activeBank}12`, 'KeyD': `${activeBank}13`, 'KeyF': `${activeBank}14`,
        'KeyG': `${activeBank}15`, 'KeyH': `${activeBank}16`, 'KeyJ': `${activeBank}17`, 'KeyK': `${activeBank}18`,
        'KeyL': `${activeBank}19`,
        'KeyZ': `${activeBank}20`, 'KeyX': `${activeBank}21`, 'KeyC': `${activeBank}22`, 'KeyV': `${activeBank}23`,
        'KeyB': `${activeBank}24`, 'KeyN': `${activeBank}25`, 'KeyM': `${activeBank}26`,
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
                console.log('⚡ Ultra-low latency engine initialized');
            } catch (error) {
                handleError(error, 'initializing ultra-low latency engine');
            }
        };

        initializeEngine();
    }, [handleError]);

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

    // Preload samples for ultra-low latency
    const preloadAllSamples = useCallback(async () => {
        if (isPreloading || !audioBufferRef.current) return;
        
        setIsPreloading(true);
        const startTime = performance.now();
        let preloadedCount = 0;
        const newPreloadedSet = new Set();
        
        try {
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
            
            setPreloadedSamples(newPreloadedSet);
            
            const preloadTime = performance.now() - startTime;
            console.log(`⚡ Preloaded ${preloadedCount} samples in ${preloadTime.toFixed(2)}ms`);
            
        } catch (error) {
            handleError(error, 'preloading samples');
        } finally {
            setIsPreloading(false);
        }
    }, [chops, isPreloading, handleError]);

    // Auto-preload when chops change
    useEffect(() => {
        if (chops.length > 0) {
            const timeoutId = setTimeout(preloadAllSamples, 100);
            return () => clearTimeout(timeoutId);
        }
    }, [chops, preloadAllSamples]);

    // Ultra-fast key handler
    const handleKeyDown = useCallback((event) => {
        const keyCode = event.code;
        const padId = keyMap[keyCode];
        
        if (keyStateRef.current.has(keyCode) || !padId) return;
        
        const chop = chops.find(c => c.padId === padId);
        if (!chop) return;
        
        const now = performance.now();
        const lastTrigger = lastTriggerTimeRef.current.get(padId) || 0;
        if (now - lastTrigger < 10) return;
        
        keyStateRef.current.add(keyCode);
        lastTriggerTimeRef.current.set(padId, now);
        
        event.preventDefault();
        event.stopPropagation();
        
        latencyMonitor.recordKeyPressLatency(now, performance.now());
        
        setKeyPressStates(prev => ({ ...prev, [keyCode]: true }));
        setTimeout(() => {
            setKeyPressStates(prev => ({ ...prev, [keyCode]: false }));
        }, 150);
        
        const triggerPromise = ultraLowLatencyEngine.triggerSample(padId, 1.0, {
            volume: chop.volume || 1.0
        });
        
        triggerPromise.then(result => {
            if (result.success) {
                setLastPlayTime(prev => ({ ...prev, [padId]: Date.now() }));
                latencyMonitor.recordTotalLatency(now, performance.now());
                console.log(`⚡ ${padId} triggered (${result.latency.toFixed(2)}ms)`);
            } else {
                console.warn(`Failed to trigger ${padId}:`, result.error);
            }
        }).catch(error => {
            console.error(`Error triggering ${padId}:`, error);
        });
        
    }, [keyMap, chops]);

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

    // Handle pad clicks
    const handlePadClick = useCallback(async (padId) => {
        const startTime = performance.now();
        
        try {
            const chop = chops.find(c => c.padId === padId);
            if (!chop) return;

            latencyMonitor.recordKeyPressLatency(startTime, performance.now());

            setKeyPressStates(prev => ({ ...prev, [padId]: true }));
            setTimeout(() => {
                setKeyPressStates(prev => ({ ...prev, [padId]: false }));
            }, 150);

            let success = false;
            let latency = 0;
            
            if (preloadedSamples.has(padId)) {
                const result = await ultraLowLatencyEngine.triggerSample(padId, 1.0);
                success = result.success;
                latency = result.latency || 0;
                
                if (success) {
                    console.log(`⚡ Ultra-low click: ${padId} (${latency.toFixed(2)}ms)`);
                }
            }
            
            if (success) {
                setLastPlayTime(prev => ({ ...prev, [padId]: Date.now() }));
                latencyMonitor.recordTotalLatency(startTime, performance.now());
            }
            
        } catch (error) {
            handleError(error, `playing sample ${padId}`);
        }
    }, [chops, preloadedSamples, handleError]);

    // Stop all samples
    const stopAllSamples = useCallback(() => {
        ultraLowLatencyEngine.stopAllSamples();
        console.log('🛑 All samples stopped');
    }, []);

    // Get performance metrics
    const getEngineMetrics = useCallback(() => {
        return ultraLowLatencyEngine.getPerformanceMetrics();
    }, []);

    // Generate pad grid
    const generatePadGrid = () => {
        const pads = [];
        const rows = 4;
        const cols = 8;
        
        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                const padIndex = row * cols + col + 1;
                const padId = `${activeBank}${padIndex}`;
                const chop = chops.find(c => c.padId === padId);
                
                const keyEntry = Object.entries(keyMap).find(([key, id]) => id === padId);
                const keyLabel = keyEntry ? keyEntry[0].replace('Key', '').replace('Digit', '') : '';
                
                pads.push(
                    <TriggerPad
                        key={padId}
                        padId={padId}
                        keyLabel={keyLabel}
                        isAssigned={!!chop}
                        isSelected={selectedPadId === padId}
                        isPressed={keyPressStates[padId] || keyPressStates[keyEntry?.[0]] || false}
                        isPreloaded={preloadedSamples.has(padId)}
                        latencyStatus={latencyStatus}
                        lastPlayTime={lastPlayTime[padId]}
                        color={chop?.color || '#06b6d4'}
                        chop={chop}
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
                    <h2 className="text-2xl font-bold text-white">Ultra-Low Latency Pads</h2>
                    <div className="text-sm text-white/60">
                        Bank {activeBank} • {chops.length} samples • {preloadedSamples.size} preloaded
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

            <div className="grid grid-cols-8 gap-3 mb-6">
                {generatePadGrid()}
            </div>

            <div className="flex items-center justify-between text-sm text-white/60">
                <div className="flex items-center gap-4">
                    <span>Active Voices: {getEngineMetrics()?.activeVoices || 0}</span>
                    <span>Buffer Size: {getEngineMetrics()?.bufferSize || 'N/A'}</span>
                    <span>Sample Rate: {getEngineMetrics()?.sampleRate || 'N/A'}Hz</span>
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
                        chop={chops.find(c => c.padId === selectedPadId)}
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
}