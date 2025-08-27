import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Play, Pause, Square, RotateCcw } from 'lucide-react';
import { Button } from '../ui/button';

/**
 * Transport controls component for the drum sequencer
 * Provides play/pause/stop buttons, BPM control, and swing control
 */
export default function TransportControls({
  isPlaying = false,
  isPaused = false,
  bpm = 120,
  swing = 0,
  isInitialized = false,
  onPlay,
  onPause,
  onStop,
  onBpmChange,
  onSwingChange,
  className = ''
}) {
  const [localBpm, setLocalBpm] = useState(bpm);
  const [localSwing, setLocalSwing] = useState(swing);
  const [bpmInputFocused, setBpmInputFocused] = useState(false);

  // Sync local state with props
  useEffect(() => {
    if (!bpmInputFocused) {
      setLocalBpm(bpm);
    }
  }, [bpm, bpmInputFocused]);

  useEffect(() => {
    setLocalSwing(swing);
  }, [swing]);

  // Handle play/pause toggle
  const handlePlayPause = useCallback(() => {
    if (!isInitialized) return;
    
    if (isPlaying) {
      onPause?.();
    } else {
      onPlay?.();
    }
  }, [isPlaying, isInitialized, onPlay, onPause]);

  // Handle stop
  const handleStop = useCallback(() => {
    if (!isInitialized) return;
    onStop?.();
  }, [isInitialized, onStop]);

  // Handle BPM input change
  const handleBpmInputChange = useCallback((e) => {
    const value = e.target.value;
    setLocalBpm(value);
  }, []);

  // Handle BPM input blur (commit changes)
  const handleBpmBlur = useCallback(() => {
    setBpmInputFocused(false);
    const newBpm = parseInt(localBpm, 10);
    
    if (isNaN(newBpm) || newBpm < 60 || newBpm > 200) {
      // Reset to current BPM if invalid
      setLocalBpm(bpm);
      return;
    }
    
    if (newBpm !== bpm) {
      onBpmChange?.(newBpm);
    }
  }, [localBpm, bpm, onBpmChange]);

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

  // Handle swing slider change
  const handleSwingChange = useCallback((e) => {
    const newSwing = parseInt(e.target.value, 10);
    setLocalSwing(newSwing);
    onSwingChange?.(newSwing);
  }, [onSwingChange]);

  // Get play button state and styling
  const getPlayButtonProps = () => {
    if (isPlaying) {
      return {
        className: 'bg-orange-500 hover:bg-orange-600 text-white font-bold',
        icon: Pause,
        text: 'Pause'
      };
    } else {
      return {
        className: 'bg-green-500 hover:bg-green-600 text-white font-bold',
        icon: Play,
        text: isPaused ? 'Resume' : 'Play'
      };
    }
  };

  const playButtonProps = getPlayButtonProps();
  const PlayIcon = playButtonProps.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`flex items-center gap-4 ${className}`}
    >
      {/* Transport Buttons */}
      <div className="flex items-center gap-2">
        <Button
          onClick={handlePlayPause}
          className={playButtonProps.className}
          disabled={!isInitialized}
          size="default"
        >
          <PlayIcon className="w-4 h-4 mr-2" />
          {playButtonProps.text}
        </Button>
        
        <Button
          onClick={handleStop}
          variant="outline"
          className="border-white/20 text-white hover:bg-white/10 hover:text-white"
          disabled={!isInitialized}
          size="default"
        >
          <Square className="w-4 h-4 mr-2" />
          Stop
        </Button>
      </div>

      {/* BPM Control */}
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium text-white/80 min-w-[32px]">
          BPM:
        </label>
        <div className="relative">
          <input
            type="number"
            min="60"
            max="200"
            value={localBpm}
            onChange={handleBpmInputChange}
            onBlur={handleBpmBlur}
            onFocus={handleBpmFocus}
            onKeyDown={handleBpmKeyDown}
            className={`w-16 px-2 py-1 bg-white/10 border rounded text-white text-sm text-center
              transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-cyan-400/50
              ${bpmInputFocused ? 'border-cyan-400/50 bg-white/15' : 'border-white/20'}
              ${!isInitialized ? 'opacity-50 cursor-not-allowed' : 'hover:bg-white/15'}
            `}
            disabled={!isInitialized}
          />
          {/* Visual feedback for BPM changes */}
          {bpmInputFocused && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="absolute -top-8 left-1/2 transform -translate-x-1/2 
                bg-black/80 text-white text-xs px-2 py-1 rounded whitespace-nowrap"
            >
              60-200 BPM
            </motion.div>
          )}
        </div>
      </div>

      {/* Swing Control */}
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium text-white/80 min-w-[40px]">
          Swing:
        </label>
        <div className="flex items-center gap-2">
          <input
            type="range"
            min="0"
            max="100"
            value={localSwing}
            onChange={handleSwingChange}
            className={`w-20 h-2 bg-white/10 rounded-lg appearance-none cursor-pointer
              transition-opacity duration-200
              ${!isInitialized ? 'opacity-50 cursor-not-allowed' : ''}
            `}
            style={{
              background: `linear-gradient(to right, #06b6d4 0%, #06b6d4 ${localSwing}%, rgba(255,255,255,0.1) ${localSwing}%, rgba(255,255,255,0.1) 100%)`
            }}
            disabled={!isInitialized}
          />
          <span className="text-xs font-mono text-white/60 min-w-[32px] text-right">
            {localSwing}%
          </span>
        </div>
      </div>

      {/* Visual State Indicator */}
      <div className="flex items-center gap-2 ml-auto">
        <div className={`w-2 h-2 rounded-full transition-all duration-300 ${
          !isInitialized 
            ? 'bg-yellow-400 animate-pulse' 
            : isPlaying 
              ? 'bg-green-400 animate-pulse' 
              : isPaused 
                ? 'bg-orange-400' 
                : 'bg-gray-400'
        }`} />
        <span className="text-xs text-white/60">
          {!isInitialized 
            ? 'Initializing...' 
            : isPlaying 
              ? 'Playing' 
              : isPaused 
                ? 'Paused' 
                : 'Stopped'
          }
        </span>
      </div>
    </motion.div>
  );
}