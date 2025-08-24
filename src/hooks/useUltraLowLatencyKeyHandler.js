/**
 * Ultra Low-Latency Key Handler
 * Optimized for instant sample triggering with minimal input delay
 */

import { useEffect, useCallback, useRef } from 'react';
import ultraLowLatencyEngine from '../services/UltraLowLatencyPlaybackEngine.js';

export function useUltraLowLatencyKeyHandler({
    chops = [],
    activeBank = 'A',
    isEnabled = true,
    onSampleTriggered = null
}) {
    const keyStateRef = useRef(new Set()); // Track pressed keys to prevent repeat
    const lastTriggerTimeRef = useRef(new Map()); // Debounce rapid triggers
    const preloadedSamplesRef = useRef(new Set());
    
    // Key mapping for instant access
    const keyMap = {
        // Row 1: Q W E R T Y U I O P
        'KeyQ': `${activeBank}1`, 'KeyW': `${activeBank}2`, 'KeyE': `${activeBank}3`, 'KeyR': `${activeBank}4`,
        'KeyT': `${activeBank}5`, 'KeyY': `${activeBank}6`, 'KeyU': `${activeBank}7`, 'KeyI': `${activeBank}8`,
        'KeyO': `${activeBank}9`, 'KeyP': `${activeBank}10`,
        
        // Row 2: A S D F G H J K L
        'KeyA': `${activeBank}11`, 'KeyS': `${activeBank}12`, 'KeyD': `${activeBank}13`, 'KeyF': `${activeBank}14`,
        'KeyG': `${activeBank}15`, 'KeyH': `${activeBank}16`, 'KeyJ': `${activeBank}17`, 'KeyK': `${activeBank}18`,
        'KeyL': `${activeBank}19`,
        
        // Row 3: Z X C V B N M
        'KeyZ': `${activeBank}20`, 'KeyX': `${activeBank}21`, 'KeyC': `${activeBank}22`, 'KeyV': `${activeBank}23`,
        'KeyB': `${activeBank}24`, 'KeyN': `${activeBank}25`, 'KeyM': `${activeBank}26`,
        
        // Numbers: 1 2 3 4 5 6 7 8 9 0
        'Digit1': `${activeBank}1`, 'Digit2': `${activeBank}2`, 'Digit3': `${activeBank}3`, 'Digit4': `${activeBank}4`,
        'Digit5': `${activeBank}5`, 'Digit6': `${activeBank}6`, 'Digit7': `${activeBank}7`, 'Digit8': `${activeBank}8`,
        'Digit9': `${activeBank}9`, 'Digit0': `${activeBank}10`
    };

    // Preload samples for instant triggering
    const preloadSamples = useCallback(async () => {
        const startTime = performance.now();
        let preloadedCount = 0;
        
        for (const chop of chops) {
            if (chop.audioBuffer && chop.startTime !== undefined && chop.endTime !== undefined) {
                const sampleId = chop.padId;
                
                // Only preload if not already preloaded
                if (!preloadedSamplesRef.current.has(sampleId)) {
                    const success = await ultraLowLatencyEngine.preloadSample(
                        sampleId,
                        chop.audioBuffer,
                        chop.startTime,
                        chop.endTime
                    );
                    
                    if (success) {
                        preloadedSamplesRef.current.add(sampleId);
                        preloadedCount++;
                    }
                }
            }
        }
        
        const preloadTime = performance.now() - startTime;
        if (preloadedCount > 0) {
            console.log(`⚡ Preloaded ${preloadedCount} samples in ${preloadTime.toFixed(2)}ms`);
        }
    }, [chops]);

    // Ultra-fast key down handler
    const handleKeyDown = useCallback((event) => {
        if (!isEnabled) return;
        
        const keyCode = event.code;
        const padId = keyMap[keyCode];
        
        // Ignore if key already pressed (prevent repeat)
        if (keyStateRef.current.has(keyCode)) return;
        
        // Ignore if no pad mapped to this key
        if (!padId) return;
        
        // Find the chop for this pad
        const chop = chops.find(c => c.padId === padId);
        if (!chop) return;
        
        // Debounce rapid triggers (minimum 10ms between triggers)
        const now = performance.now();
        const lastTrigger = lastTriggerTimeRef.current.get(padId) || 0;
        if (now - lastTrigger < 10) return;
        
        // Mark key as pressed
        keyStateRef.current.add(keyCode);
        lastTriggerTimeRef.current.set(padId, now);
        
        // Prevent default browser behavior
        event.preventDefault();
        event.stopPropagation();
        
        // Calculate velocity from key press timing (if available)
        const velocity = event.repeat ? 0.7 : 1.0;
        
        // Trigger sample with ultra-low latency
        const triggerPromise = ultraLowLatencyEngine.triggerSample(padId, velocity, {
            volume: chop.volume || 1.0
        });
        
        // Handle result asynchronously to not block key handler
        triggerPromise.then(result => {
            if (result.success) {
                console.log(`🎹 ${padId} triggered (${result.latency.toFixed(2)}ms latency)`);
                
                // Notify parent component
                if (onSampleTriggered) {
                    onSampleTriggered({
                        padId,
                        chop,
                        keyCode,
                        velocity,
                        latency: result.latency,
                        voiceId: result.voiceId,
                        keyPressTime: now
                    });
                }
            } else {
                console.warn(`Failed to trigger ${padId}:`, result.error);
            }
        }).catch(error => {
            console.error(`Error triggering ${padId}:`, error);
        });
        
    }, [isEnabled, keyMap, chops, onSampleTriggered]);

    // Key up handler for proper key state management
    const handleKeyUp = useCallback((event) => {
        const keyCode = event.code;
        keyStateRef.current.delete(keyCode);
    }, []);

    // Focus handler to ensure key events are captured
    const handleFocus = useCallback(() => {
        console.log('🎹 Key handler focused - ready for input');
    }, []);

    const handleBlur = useCallback(() => {
        // Clear all pressed keys when losing focus
        keyStateRef.current.clear();
        console.log('🎹 Key handler blurred - clearing key states');
    }, []);

    // Setup event listeners with optimal settings
    useEffect(() => {
        if (!isEnabled) return;
        
        // Use capture phase for fastest possible response
        const options = {
            capture: true,
            passive: false // Allow preventDefault
        };
        
        // Add listeners to document for global capture
        document.addEventListener('keydown', handleKeyDown, options);
        document.addEventListener('keyup', handleKeyUp, options);
        document.addEventListener('focus', handleFocus, true);
        document.addEventListener('blur', handleBlur, true);
        
        // Ensure audio context is ready
        const ensureAudioReady = async () => {
            try {
                await ultraLowLatencyEngine.initialize();
                await ultraLowLatencyEngine.optimizeForUltraLowLatency();
            } catch (error) {
                console.error('Failed to initialize ultra-low latency engine:', error);
            }
        };
        
        ensureAudioReady();
        
        return () => {
            document.removeEventListener('keydown', handleKeyDown, options);
            document.removeEventListener('keyup', handleKeyUp, options);
            document.removeEventListener('focus', handleFocus, true);
            document.removeEventListener('blur', handleBlur, true);
        };
    }, [isEnabled, handleKeyDown, handleKeyUp, handleFocus, handleBlur]);

    // Preload samples when chops change
    useEffect(() => {
        if (chops.length > 0) {
            // Debounce preloading
            const timeoutId = setTimeout(preloadSamples, 100);
            return () => clearTimeout(timeoutId);
        }
    }, [chops, preloadSamples]);

    // Cleanup preloaded samples when bank changes
    useEffect(() => {
        preloadedSamplesRef.current.clear();
    }, [activeBank]);

    // Return utility functions
    return {
        // Force preload all samples
        preloadAllSamples: preloadSamples,
        
        // Get current performance metrics
        getPerformanceMetrics: () => ultraLowLatencyEngine.getPerformanceMetrics(),
        
        // Manual sample trigger (for pad clicks)
        triggerSample: async (padId, velocity = 1.0) => {
            const chop = chops.find(c => c.padId === padId);
            if (!chop) return { success: false, error: 'Chop not found' };
            
            return await ultraLowLatencyEngine.triggerSample(padId, velocity, {
                volume: chop.volume || 1.0
            });
        },
        
        // Stop all samples
        stopAllSamples: () => ultraLowLatencyEngine.stopAllSamples(),
        
        // Get key mapping for display
        getKeyMap: () => keyMap,
        
        // Check if sample is preloaded
        isSamplePreloaded: (padId) => preloadedSamplesRef.current.has(padId)
    };
}