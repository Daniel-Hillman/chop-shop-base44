import React, { memo } from 'react';

/**
 * Lightweight playhead indicator for the sequencer
 * Shows current playback position with minimal CPU overhead
 */
const SequencerPlayhead = memo(function SequencerPlayhead({
  currentStep = 0,
  totalSteps = 16,
  isPlaying = false,
  className = ''
}) {
  // Calculate position percentage
  const position = totalSteps > 0 ? (currentStep / totalSteps) * 100 : 0;

  return (
    <div className={`relative h-3 bg-black/30 rounded-full overflow-hidden ${className}`}>
      {/* Background track with subtle gradient */}
      <div className="absolute inset-0 bg-gradient-to-r from-white/5 via-white/10 to-white/5" />
      
      {/* Step markers (very subtle) */}
      <div className="absolute inset-0 flex">
        {Array.from({ length: totalSteps }, (_, i) => (
          <div
            key={i}
            className={`flex-1 border-r border-white/5 last:border-r-0 ${
              i % 4 === 0 ? 'border-white/10' : ''
            }`}
          />
        ))}
      </div>
      
      {/* Progress fill */}
      <div
        className="absolute top-0 bottom-0 bg-gradient-to-r from-cyan-500/20 to-cyan-400/30 rounded-full"
        style={{
          width: `${position}%`
        }}
      />
      
      {/* Playhead indicator */}
      <div
        className={`absolute top-0 bottom-0 w-1 bg-cyan-400 rounded-full transition-none ${
          isPlaying ? 'shadow-lg shadow-cyan-400/60' : 'shadow-md shadow-cyan-400/30'
        }`}
        style={{
          left: `${position}%`,
          transform: 'translateX(-50%)'
        }}
      />
      
      {/* Glowing dot at playhead position */}
      {isPlaying && (
        <div
          className="absolute top-1/2 w-2 h-2 bg-cyan-300 rounded-full shadow-lg shadow-cyan-300/50"
          style={{
            left: `${position}%`,
            transform: 'translate(-50%, -50%)'
          }}
        />
      )}
    </div>
  );
});

export default SequencerPlayhead;