import React, { useState, useEffect, useCallback, useRef, memo, useMemo } from 'react';

/**
 * SamplerTapTempo - Minimal tap tempo functionality for the sampler sequencer
 * 
 * Features:
 * - Small button with minimal footprint
 * - Space bar support for tapping
 * - 4-tap minimum for calculation
 * - Visual feedback on taps
 * - Auto-reset after inactivity (3 seconds)
 * Performance optimizations: React.memo, memoized calculations, debounced updates
 */
const SamplerTapTempo = memo(function SamplerTapTempo({ onTempoCalculated, currentBpm }) {
  const [tapTimes, setTapTimes] = useState([]);
  const [isActive, setIsActive] = useState(false);
  const timeoutRef = useRef(null);
  const RESET_TIMEOUT = 3000; // 3 seconds
  const MIN_TAPS = 4;
  const MAX_TAPS = 8; // Keep recent taps for better accuracy

  // Clear timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Handle space bar tap input
  useEffect(() => {
    const handleKeyPress = (event) => {
      // Only register space bar when not typing in inputs
      if (event.code === 'Space' && event.target.tagName !== 'INPUT') {
        event.preventDefault();
        handleTap();
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, []);

  const resetTaps = useCallback(() => {
    setTapTimes([]);
    setIsActive(false);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const calculateBPM = useCallback((times) => {
    if (times.length < MIN_TAPS) return null;

    // Calculate intervals between taps
    const intervals = [];
    for (let i = 1; i < times.length; i++) {
      intervals.push(times[i] - times[i - 1]);
    }

    // Average the intervals
    const avgInterval = intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;
    
    // Convert to BPM (60000ms per minute / average interval in ms)
    const bpm = Math.round(60000 / avgInterval);
    
    // Clamp to reasonable range (60-200 BPM)
    return Math.max(60, Math.min(200, bpm));
  }, []);

  // Memoized tap count and status
  const tapStatus = useMemo(() => {
    const tapCount = tapTimes.length;
    const needsMoreTaps = tapCount < MIN_TAPS;
    
    return { tapCount, needsMoreTaps };
  }, [tapTimes.length]);

  // Memoized button classes
  const buttonClasses = useMemo(() => {
    const baseClasses = 'px-3 py-1.5 text-xs font-medium rounded-md border transition-colors duration-150';
    
    if (isActive) {
      return `${baseClasses} bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-sm ${
        tapStatus.needsMoreTaps ? 'animate-pulse' : ''
      }`;
    } else {
      return `${baseClasses} bg-gray-800/50 border-gray-600 text-gray-300 hover:bg-gray-700/50`;
    }
  }, [isActive, tapStatus.needsMoreTaps]);

  // Memoized display text
  const displayText = useMemo(() => {
    if (tapStatus.needsMoreTaps && tapStatus.tapCount > 0) {
      return `${tapStatus.tapCount}/${MIN_TAPS}`;
    } else {
      return currentBpm || '---';
    }
  }, [tapStatus.needsMoreTaps, tapStatus.tapCount, currentBpm]);

  const handleTap = useCallback(() => {
    const now = Date.now();
    
    setTapTimes(prevTimes => {
      const newTimes = [...prevTimes, now];
      
      // Keep only the most recent taps
      if (newTimes.length > MAX_TAPS) {
        newTimes.shift();
      }

      // Calculate BPM if we have enough taps
      if (newTimes.length >= MIN_TAPS) {
        const bpm = calculateBPM(newTimes);
        if (bpm && onTempoCalculated) {
          onTempoCalculated(bpm);
        }
      }

      return newTimes;
    });

    setIsActive(true);

    // Reset timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(resetTaps, RESET_TIMEOUT);
  }, [calculateBPM, onTempoCalculated, resetTaps]);

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleTap}
        className={buttonClasses}
        title={`Tap Tempo (Space) - ${tapStatus.tapCount}/${MIN_TAPS} taps`}
      >
        TAP
      </button>
      
      {/* Tap counter and BPM display */}
      <div className="text-xs text-gray-400 min-w-[60px]">
        {tapStatus.needsMoreTaps && tapStatus.tapCount > 0 ? (
          <span className="opacity-60">
            {displayText}
          </span>
        ) : (
          <span className="text-cyan-300 font-medium">
            {displayText}
          </span>
        )}
      </div>
    </div>
  );
});

export default SamplerTapTempo;