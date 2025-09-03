import React, { useCallback, memo } from 'react';

/**
 * Ultra-lightweight sampler sequencer step - Performance First
 * Minimal visuals, maximum timing accuracy
 */
const SamplerSequencerStep = memo(function SamplerSequencerStep({
  trackIndex,
  stepIndex,
  isActive = false,
  hasChop = false,
  chopColor = '#06b6d4',
  isCurrentStep = false,
  onToggle
}) {
  // Ultra-fast click handler - no double-click detection for speed
  const handleClick = useCallback(() => {
    onToggle?.(trackIndex, stepIndex, !isActive);
  }, [trackIndex, stepIndex, isActive, onToggle]);

  // Minimal styling - no complex calculations
  let bgColor = 'bg-gray-700';
  let borderColor = 'border-white/20';
  
  if (isActive && hasChop) {
    bgColor = 'bg-cyan-500';
    borderColor = 'border-cyan-300';
  } else if (isActive) {
    bgColor = 'bg-gray-400';
    borderColor = 'border-gray-300';
  } else if (hasChop) {
    bgColor = 'bg-cyan-900';
    borderColor = 'border-cyan-600';
  }

  return (
    <button
      onClick={handleClick}
      className={`
        w-6 h-6 rounded border ${bgColor} ${borderColor}
        ${isCurrentStep ? 'ring-1 ring-cyan-400' : ''}
        hover:brightness-110
      `}
    />
  );
});

export default SamplerSequencerStep;