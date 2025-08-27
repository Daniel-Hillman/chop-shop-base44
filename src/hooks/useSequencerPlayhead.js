import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Hook for managing sequencer playhead synchronization
 * Provides real-time playhead position updates and smooth animations
 */
export function useSequencerPlayhead(sequencerEngine, stepResolution = 16) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [nextStepTime, setNextStepTime] = useState(0);
  const [timingAccuracy, setTimingAccuracy] = useState(0);
  
  const animationFrameRef = useRef(null);
  const lastUpdateTimeRef = useRef(0);
  const stepCallbackRef = useRef(null);
  const stateCallbackRef = useRef(null);

  // Handle step updates from sequencer engine
  const handleStepUpdate = useCallback((stepIndex, time) => {
    setCurrentStep(stepIndex);
    setNextStepTime(time);
    
    // Calculate timing accuracy
    if (sequencerEngine?.audioContext) {
      const currentTime = sequencerEngine.audioContext.currentTime;
      const accuracy = Math.abs(time - currentTime) * 1000; // Convert to milliseconds
      setTimingAccuracy(accuracy);
    }
  }, [sequencerEngine]);

  // Handle state changes from sequencer engine
  const handleStateChange = useCallback((state) => {
    setIsPlaying(state.isPlaying);
    setCurrentStep(state.currentStep);
    setNextStepTime(state.nextStepTime);
  }, []);

  // Animation loop for smooth playhead movement
  const updatePlayheadPosition = useCallback(() => {
    if (!isPlaying || !sequencerEngine?.audioContext) {
      return;
    }

    const currentTime = sequencerEngine.audioContext.currentTime;
    const now = performance.now();
    
    // Throttle updates to avoid excessive re-renders
    if (now - lastUpdateTimeRef.current < 16) { // ~60fps
      animationFrameRef.current = requestAnimationFrame(updatePlayheadPosition);
      return;
    }
    
    lastUpdateTimeRef.current = now;

    // Calculate interpolated step position for smooth animation
    if (nextStepTime > currentTime) {
      const stepDuration = sequencerEngine.scheduler?.getStepDuration() || 0;
      if (stepDuration > 0) {
        const timeUntilNextStep = nextStepTime - currentTime;
        const progress = 1 - (timeUntilNextStep / stepDuration);
        const interpolatedStep = currentStep + Math.max(0, Math.min(1, progress));
        
        // Only update if there's a meaningful change
        if (Math.abs(interpolatedStep - currentStep) > 0.01) {
          setCurrentStep(interpolatedStep);
        }
      }
    }

    animationFrameRef.current = requestAnimationFrame(updatePlayheadPosition);
  }, [isPlaying, sequencerEngine, currentStep, nextStepTime]);

  // Set up sequencer engine callbacks
  useEffect(() => {
    if (!sequencerEngine) return;

    // Create callback references
    stepCallbackRef.current = handleStepUpdate;
    stateCallbackRef.current = handleStateChange;

    // Register callbacks
    sequencerEngine.onStep(stepCallbackRef.current);
    sequencerEngine.onStateChange(stateCallbackRef.current);

    // Initialize state from engine
    const state = sequencerEngine.getState();
    setIsPlaying(state.isPlaying);
    setCurrentStep(state.currentStep);
    setNextStepTime(state.nextStepTime);

    return () => {
      // Clean up callbacks
      if (stepCallbackRef.current) {
        sequencerEngine.removeStepCallback(stepCallbackRef.current);
      }
      if (stateCallbackRef.current) {
        sequencerEngine.removeStateChangeCallback(stateCallbackRef.current);
      }
    };
  }, [sequencerEngine, handleStepUpdate, handleStateChange]);

  // Start/stop animation loop based on playback state
  useEffect(() => {
    if (isPlaying) {
      animationFrameRef.current = requestAnimationFrame(updatePlayheadPosition);
    } else {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPlaying, updatePlayheadPosition]);

  // Calculate playhead position within the current pattern
  const getPlayheadPosition = useCallback(() => {
    if (!isPlaying || currentStep < 0) {
      return -1;
    }
    
    // Return position within the step resolution (0 to stepResolution-1)
    return currentStep % stepResolution;
  }, [currentStep, stepResolution, isPlaying]);

  // Calculate playhead progress as percentage (0-1)
  const getPlayheadProgress = useCallback(() => {
    const position = getPlayheadPosition();
    if (position < 0) return 0;
    
    return position / stepResolution;
  }, [getPlayheadPosition, stepResolution]);

  // Get timing information for debugging/monitoring
  const getTimingInfo = useCallback(() => {
    if (!sequencerEngine?.audioContext) {
      return null;
    }

    const currentTime = sequencerEngine.audioContext.currentTime;
    const timeUntilNextStep = Math.max(0, nextStepTime - currentTime);
    const stepDuration = sequencerEngine.scheduler?.getStepDuration() || 0;
    
    return {
      currentTime,
      nextStepTime,
      timeUntilNextStep,
      stepDuration,
      timingAccuracy,
      currentStep: Math.floor(currentStep),
      interpolatedStep: currentStep
    };
  }, [sequencerEngine, nextStepTime, timingAccuracy, currentStep]);

  // Force playhead sync (useful for manual corrections)
  const syncPlayhead = useCallback(() => {
    if (!sequencerEngine) return;
    
    const state = sequencerEngine.getState();
    setCurrentStep(state.currentStep);
    setNextStepTime(state.nextStepTime);
    setIsPlaying(state.isPlaying);
  }, [sequencerEngine]);

  return {
    // Current state
    currentStep: Math.floor(currentStep),
    interpolatedStep: currentStep,
    isPlaying,
    nextStepTime,
    timingAccuracy,
    
    // Position calculations
    playheadPosition: getPlayheadPosition(),
    playheadProgress: getPlayheadProgress(),
    
    // Utilities
    getTimingInfo,
    syncPlayhead
  };
}

/**
 * Hook for managing playhead visual effects and animations
 */
export function usePlayheadAnimation(playheadPosition, isPlaying) {
  const [animationState, setAnimationState] = useState('idle');
  const [pulseIntensity, setPulseIntensity] = useState(0);
  
  const pulseIntervalRef = useRef(null);

  // Update animation state based on playback
  useEffect(() => {
    if (isPlaying && playheadPosition >= 0) {
      setAnimationState('playing');
    } else {
      setAnimationState('idle');
    }
  }, [isPlaying, playheadPosition]);

  // Pulse effect for active playhead
  useEffect(() => {
    if (animationState === 'playing') {
      // Create pulsing effect synchronized with steps
      pulseIntervalRef.current = setInterval(() => {
        setPulseIntensity(prev => (prev + 0.1) % 1);
      }, 100);
    } else {
      if (pulseIntervalRef.current) {
        clearInterval(pulseIntervalRef.current);
        pulseIntervalRef.current = null;
      }
      setPulseIntensity(0);
    }

    return () => {
      if (pulseIntervalRef.current) {
        clearInterval(pulseIntervalRef.current);
      }
    };
  }, [animationState]);

  // Calculate playhead styling
  const getPlayheadStyle = useCallback((trackColor = '#06b6d4') => {
    const baseOpacity = animationState === 'playing' ? 0.8 : 0.4;
    const pulseOpacity = baseOpacity + (pulseIntensity * 0.2);
    
    return {
      opacity: pulseOpacity,
      boxShadow: animationState === 'playing' 
        ? `0 0 ${8 + (pulseIntensity * 4)}px ${trackColor}` 
        : 'none',
      transform: `scaleY(${0.9 + (pulseIntensity * 0.1)})`,
      transition: 'all 0.1s ease-out'
    };
  }, [animationState, pulseIntensity]);

  return {
    animationState,
    pulseIntensity,
    getPlayheadStyle
  };
}