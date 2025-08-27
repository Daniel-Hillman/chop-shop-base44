import React, { useCallback, memo, useState } from 'react';

/**
 * Individual sequencer step component - optimized for instant response
 * Handles step activation with immediate visual feedback and velocity control
 */
const SequencerStep = memo(function SequencerStep({
  trackId,
  stepIndex,
  step,
  trackColor = '#06b6d4',
  isActive = false,
  isSelected = false,
  isCurrentStep = false,
  isHovered = false,
  velocity = 0.8,
  onToggle,
  onSelect,
  onVelocityChange,
  onHover,
  className = ''
}) {
  const [showVelocityControl, setShowVelocityControl] = useState(false);

  // Handle step click/toggle with immediate response
  const handleClick = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Call toggle immediately without any delays
    if (onToggle) {
      onToggle(trackId, stepIndex);
    }
  }, [trackId, stepIndex, onToggle]);

  // Handle right-click for velocity control
  const handleRightClick = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (isActive) {
      setShowVelocityControl(true);
    }
  }, [isActive]);

  // Handle velocity change
  const handleVelocityChange = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    
    const newVelocity = parseFloat(e.target.value);
    if (onVelocityChange) {
      onVelocityChange(trackId, stepIndex, newVelocity);
    }
  }, [trackId, stepIndex, onVelocityChange]);

  // Close velocity control when clicking outside
  const handleVelocityBlur = useCallback(() => {
    setShowVelocityControl(false);
  }, []);

  // Calculate step brightness based on velocity
  const velocityOpacity = isActive ? Math.max(0.3, velocity) : 1;
  const stepColor = isActive ? trackColor : '#374151';

  return (
    <div className={`relative flex-1 ${className}`}>
      <button
        onClick={handleClick}
        onContextMenu={handleRightClick}
        className={`
          w-full h-10 rounded border-2 relative overflow-hidden
          focus:outline-none focus:ring-1 focus:ring-cyan-400/50
          hover:brightness-110 active:scale-95
          transition-all duration-100
          ${
            isActive 
              ? 'border-white/40 shadow-md' 
              : 'bg-gray-700 border-gray-600 hover:bg-gray-600'
          }
          ${isCurrentStep ? 'ring-2 ring-cyan-300' : ''}
          ${isSelected ? 'ring-2 ring-yellow-400' : ''}
        `}
        style={{
          backgroundColor: stepColor,
          opacity: velocityOpacity
        }}
        title={`${trackId} - Step ${stepIndex + 1}${isActive ? ` (Velocity: ${Math.round(velocity * 100)}%) - Right-click to adjust` : ' - Click to activate'}`}
      >
        {/* Velocity indicator bar for active steps */}
        {isActive && (
          <div 
            className="absolute bottom-0 left-0 h-1 bg-white/60 transition-all duration-100"
            style={{ width: `${velocity * 100}%` }}
          />
        )}
        
        {/* Step number for easier identification */}
        <div className="absolute top-0 right-0 text-xs text-white/30 leading-none p-1">
          {stepIndex + 1}
        </div>
      </button>

      {/* Velocity Control Popup */}
      {showVelocityControl && isActive && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-black/90 backdrop-blur-lg 
          border border-white/20 rounded-lg p-2 z-50 shadow-lg">
          <div className="text-xs text-white/60 mb-1">Velocity</div>
          <input
            type="range"
            min="0.1"
            max="1"
            step="0.01"
            value={velocity}
            onChange={handleVelocityChange}
            onBlur={handleVelocityBlur}
            className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer"
            style={{
              background: `linear-gradient(to right, ${trackColor} 0%, 
                ${trackColor} ${velocity * 100}%, 
                rgba(255,255,255,0.1) ${velocity * 100}%, 
                rgba(255,255,255,0.1) 100%)`
            }}
            autoFocus
          />
          <div className="text-xs text-white/40 text-center mt-1">
            {Math.round(velocity * 100)}%
          </div>
        </div>
      )}
    </div>
  );
});

export default SequencerStep;