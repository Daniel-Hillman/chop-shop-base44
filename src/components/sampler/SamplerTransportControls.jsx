import React, { useState, useEffect, useCallback, memo, useMemo, useRef } from 'react';
import { Play, Square } from 'lucide-react';
import { Button } from '../ui/button';

// Debounce utility for BPM input
const useDebounce = (callback, delay) => {
  const timeoutRef = useRef(null);
  
  return useCallback((...args) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(() => {
      callback(...args);
    }, delay);
  }, [callback, delay]);
};

/**
 * Transport controls component for the sampler drum sequencer
 * Simplified version focused on Play/Stop functionality with BPM control
 * Performance optimizations: React.memo, debounced BPM input, reduced animations
 * Requirements: 2.1, 2.2, 2.3
 */
const SamplerTransportControls = memo(function SamplerTransportControls({
  isPlaying = false,
  bpm = 120,
  onPlay,
  onStop,
  onBpmChange,
  className = ''
}) {
  const [localBpm, setLocalBpm] = useState(bpm);
  const [bpmInputFocused, setBpmInputFocused] = useState(false);

  // Debounced BPM change to prevent excessive updates
  const debouncedBpmChange = useDebounce((newBpm) => {
    onBpmChange?.(newBpm);
  }, 300);

  // Sync local BPM state with props
  useEffect(() => {
    if (!bpmInputFocused) {
      setLocalBpm(bpm);
    }
  }, [bpm, bpmInputFocused]);

  // Handle play/stop toggle with keyboard shortcut support
  const handlePlayStop = useCallback(() => {
    if (isPlaying) {
      onStop?.();
    } else {
      onPlay?.();
    }
  }, [isPlaying, onPlay, onStop]);

  // Handle BPM input change
  const handleBpmInputChange = useCallback((e) => {
    const value = e.target.value;
    setLocalBpm(value);
  }, []);

  // Handle BPM input blur (commit changes with validation)
  const handleBpmBlur = useCallback(() => {
    setBpmInputFocused(false);
    const newBpm = parseInt(localBpm, 10);
    
    // Validate BPM range (60-200)
    if (isNaN(newBpm) || newBpm < 60 || newBpm > 200) {
      // Reset to current BPM if invalid
      setLocalBpm(bpm);
      return;
    }
    
    if (newBpm !== bpm) {
      // Use debounced version for final commit
      debouncedBpmChange(newBpm);
    }
  }, [localBpm, bpm, debouncedBpmChange]);

  // Handle BPM input focus
  const handleBpmFocus = useCallback(() => {
    setBpmInputFocused(true);
  }, []);

  // Handle BPM input key press (Enter to commit)
  const handleBpmKeyDown = useCallback((e) => {
    if (e.key === 'Enter') {
      e.target.blur();
    }
  }, []);

  // Keyboard shortcut handler for Space bar
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Only handle space if not focused on an input
      if (e.code === 'Space' && !bpmInputFocused && e.target.tagName !== 'INPUT') {
        e.preventDefault();
        handlePlayStop();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handlePlayStop, bpmInputFocused]);

  // Memoized button styles to prevent recalculation
  const playButtonStyle = useMemo(() => {
    return isPlaying 
      ? 'bg-red-500 hover:bg-red-600 text-white font-bold'
      : 'bg-green-500 hover:bg-green-600 text-white font-bold';
  }, [isPlaying]);

  // Memoized BPM input classes
  const bpmInputClasses = useMemo(() => {
    return `w-16 px-2 py-1 bg-white/10 border rounded text-white text-sm text-center
      transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-cyan-400/50
      ${bpmInputFocused ? 'border-cyan-400/50 bg-white/15' : 'border-white/20'}
      hover:bg-white/15`;
  }, [bpmInputFocused]);

  return (
    <div className={`flex items-center gap-4 ${className}`}>
      {/* Removed motion.div for performance */}
      {/* Transport Buttons */}
      <div className="flex items-center gap-2">
        <Button
          onClick={handlePlayStop}
          className={playButtonStyle}
          size="default"
        >
          {isPlaying ? (
            <>
              <Square className="w-4 h-4 mr-2" />
              Stop
            </>
          ) : (
            <>
              <Play className="w-4 h-4 mr-2" />
              Play
            </>
          )}
        </Button>
      </div>

      {/* BPM Control */}
      <div className="flex items-center gap-2">
        <label htmlFor="bpm-input" className="text-sm font-medium text-white/80 min-w-[32px]">
          BPM:
        </label>
        <div className="relative">
          <input
            id="bpm-input"
            type="number"
            min="60"
            max="200"
            value={localBpm}
            onChange={handleBpmInputChange}
            onBlur={handleBpmBlur}
            onFocus={handleBpmFocus}
            onKeyDown={handleBpmKeyDown}
            className={bpmInputClasses}
          />
          {/* Visual feedback for BPM validation - simplified without animation */}
          {bpmInputFocused && (
            <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 
              bg-black/80 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
              60-200 BPM
            </div>
          )}
        </div>
      </div>

      {/* Visual Playback State Indicator */}
      <div className="flex items-center gap-2 ml-auto">
        <div className={`w-2 h-2 rounded-full transition-all duration-300 ${
          isPlaying 
            ? 'bg-green-400 animate-pulse' 
            : 'bg-gray-400'
        }`} />
        <span className="text-xs text-white/60">
          {isPlaying ? 'Playing' : 'Stopped'}
        </span>
      </div>
    </div>
  );
});

export default SamplerTransportControls;