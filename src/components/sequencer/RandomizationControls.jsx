import React, { useCallback } from 'react';
import { motion } from 'framer-motion';
import { Shuffle, ToggleLeft, ToggleRight } from 'lucide-react';

/**
 * Randomization controls component for adding human groove and dynamics
 * Provides velocity and timing randomization controls per track
 */
export default function RandomizationControls({
  tracks = [],
  onRandomizationChange,
  className = ''
}) {
  // Handle velocity randomization toggle
  const handleVelocityToggle = useCallback((trackId) => {
    const track = tracks.find(t => t.id === trackId);
    if (!track) return;

    const newRandomization = {
      ...track.randomization,
      velocity: {
        ...track.randomization.velocity,
        enabled: !track.randomization.velocity.enabled
      }
    };
    
    onRandomizationChange?.(trackId, newRandomization);
  }, [tracks, onRandomizationChange]);

  // Handle velocity amount change
  const handleVelocityAmountChange = useCallback((trackId, amount) => {
    const track = tracks.find(t => t.id === trackId);
    if (!track) return;

    const newRandomization = {
      ...track.randomization,
      velocity: {
        ...track.randomization.velocity,
        amount: amount
      }
    };
    
    onRandomizationChange?.(trackId, newRandomization);
  }, [tracks, onRandomizationChange]);

  // Handle timing randomization toggle
  const handleTimingToggle = useCallback((trackId) => {
    const track = tracks.find(t => t.id === trackId);
    if (!track) return;

    const newRandomization = {
      ...track.randomization,
      timing: {
        ...track.randomization.timing,
        enabled: !track.randomization.timing.enabled
      }
    };
    
    onRandomizationChange?.(trackId, newRandomization);
  }, [tracks, onRandomizationChange]);

  // Handle timing amount change
  const handleTimingAmountChange = useCallback((trackId, amount) => {
    const track = tracks.find(t => t.id === trackId);
    if (!track) return;

    const newRandomization = {
      ...track.randomization,
      timing: {
        ...track.randomization.timing,
        amount: amount
      }
    };
    
    onRandomizationChange?.(trackId, newRandomization);
  }, [tracks, onRandomizationChange]);

  if (!tracks || tracks.length === 0) {
    return (
      <div className={`text-center py-8 ${className}`}>
        <div className="text-white/40 text-sm">
          No tracks available for randomization
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`space-y-4 ${className}`}
    >
      <div className="flex items-center gap-2 mb-4">
        <Shuffle className="w-4 h-4 text-cyan-400" />
        <h4 className="text-sm font-medium text-white">Humanization</h4>
      </div>

      {tracks.map((track, index) => (
        <motion.div
          key={track.id}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3, delay: index * 0.05 }}
          className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-4 space-y-4"
        >
          {/* Track Header */}
          <div className="flex items-center gap-2">
            <div 
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: track.color || '#06b6d4' }}
            />
            <span className="text-sm font-medium text-white/80">{track.name}</span>
          </div>

          {/* Velocity Randomization */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-white/60">Velocity Variation</label>
              <button
                onClick={() => handleVelocityToggle(track.id)}
                className="flex items-center gap-1 text-xs text-white/60 hover:text-white 
                  transition-colors duration-200"
              >
                {track.randomization?.velocity?.enabled ? (
                  <ToggleRight className="w-4 h-4 text-cyan-400" />
                ) : (
                  <ToggleLeft className="w-4 h-4" />
                )}
                {track.randomization?.velocity?.enabled ? 'On' : 'Off'}
              </button>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-xs text-white/40 min-w-[20px]">0%</span>
              <input
                type="range"
                min="0"
                max="100"
                step="1"
                value={track.randomization?.velocity?.amount || 0}
                onChange={(e) => handleVelocityAmountChange(track.id, parseInt(e.target.value, 10))}
                disabled={!track.randomization?.velocity?.enabled}
                className={`flex-1 h-2 bg-white/10 rounded-lg appearance-none cursor-pointer
                  transition-all duration-200 ${
                    !track.randomization?.velocity?.enabled ? 'opacity-30 cursor-not-allowed' : ''
                  }`}
                style={{
                  background: track.randomization?.velocity?.enabled 
                    ? `linear-gradient(to right, ${track.color || '#06b6d4'} 0%, 
                        ${track.color || '#06b6d4'} ${track.randomization?.velocity?.amount || 0}%, 
                        rgba(255,255,255,0.1) ${track.randomization?.velocity?.amount || 0}%, 
                        rgba(255,255,255,0.1) 100%)`
                    : 'rgba(255,255,255,0.1)'
                }}
              />
              <span className="text-xs text-white/40 min-w-[30px] text-right">100%</span>
            </div>
            
            <div className="text-xs text-white/40 text-center">
              {track.randomization?.velocity?.amount || 0}% variation
            </div>
          </div>

          {/* Timing Randomization */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-white/60">Timing Groove</label>
              <button
                onClick={() => handleTimingToggle(track.id)}
                className="flex items-center gap-1 text-xs text-white/60 hover:text-white 
                  transition-colors duration-200"
              >
                {track.randomization?.timing?.enabled ? (
                  <ToggleRight className="w-4 h-4 text-cyan-400" />
                ) : (
                  <ToggleLeft className="w-4 h-4" />
                )}
                {track.randomization?.timing?.enabled ? 'On' : 'Off'}
              </button>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-xs text-white/40 min-w-[20px]">0%</span>
              <input
                type="range"
                min="0"
                max="100"
                step="1"
                value={track.randomization?.timing?.amount || 0}
                onChange={(e) => handleTimingAmountChange(track.id, parseInt(e.target.value, 10))}
                disabled={!track.randomization?.timing?.enabled}
                className={`flex-1 h-2 bg-white/10 rounded-lg appearance-none cursor-pointer
                  transition-all duration-200 ${
                    !track.randomization?.timing?.enabled ? 'opacity-30 cursor-not-allowed' : ''
                  }`}
                style={{
                  background: track.randomization?.timing?.enabled 
                    ? `linear-gradient(to right, ${track.color || '#06b6d4'} 0%, 
                        ${track.color || '#06b6d4'} ${track.randomization?.timing?.amount || 0}%, 
                        rgba(255,255,255,0.1) ${track.randomization?.timing?.amount || 0}%, 
                        rgba(255,255,255,0.1) 100%)`
                    : 'rgba(255,255,255,0.1)'
                }}
              />
              <span className="text-xs text-white/40 min-w-[30px] text-right">100%</span>
            </div>
            
            <div className="text-xs text-white/40 text-center">
              {track.randomization?.timing?.amount || 0}% groove
            </div>
          </div>

          {/* Randomization Preview */}
          {(track.randomization?.velocity?.enabled || track.randomization?.timing?.enabled) && (
            <div className="pt-2 border-t border-white/10">
              <div className="text-xs text-white/40 text-center">
                {track.randomization?.velocity?.enabled && track.randomization?.timing?.enabled
                  ? 'Velocity & timing humanization active'
                  : track.randomization?.velocity?.enabled
                    ? 'Velocity humanization active'
                    : 'Timing humanization active'
                }
              </div>
            </div>
          )}
        </motion.div>
      ))}
    </motion.div>
  );
}