import React, { useCallback, memo } from 'react';

/**
 * Individual sequencer step component - optimized for instant response
 * Handles step activation with immediate visual feedback and no animations
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
  // Handle step click/toggle with immediate response
  const handleClick = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    onToggle?.(trackId, stepIndex);
  }, [trackId, stepIndex, onToggle]);

  return (
    <div className={`relative flex-1 ${className}`}>
      <button
        onClick={handleClick}
        className={`
          w-full h-10 rounded border-2 
          focus:outline-none focus:ring-1 focus:ring-cyan-400/50
          hover:brightness-110 active:scale-95
          transition-none
          ${
            isActive 
              ? 'bg-cyan-500 border-cyan-400 shadow-md' 
              : 'bg-gray-700 border-gray-600 hover:bg-gray-600'
          }
          ${isCurrentStep ? 'ring-2 ring-cyan-300' : ''}
          ${isSelected ? 'ring-2 ring-yellow-400' : ''}
        `}
        title={`${trackId} - Step ${stepIndex + 1}${isActive ? ` (Velocity: ${Math.round(velocity * 100)}%)` : ''}`}
      >
        {/* No inner content for cleaner look and better performance */}
      </button>
    </div>
  );
});

export default SequencerStep;