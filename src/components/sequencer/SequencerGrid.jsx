import React, { useState, useEffect, useCallback, useMemo, memo } from 'react';
import SequencerStep from './SequencerStep';

/**
 * Main sequencer grid component that displays the pattern grid
 * Optimized version for better performance with memoization
 */
const SequencerGrid = memo(function SequencerGrid({
  pattern = null,
  stepResolution = 16,
  sequencerEngine = null,
  onStepToggle,
  onStepVelocityChange,
  className = ''
}) {
  const [hoveredStep, setHoveredStep] = useState(null);
  const [selectedSteps, setSelectedSteps] = useState(new Set());
  const [isMultiSelect, setIsMultiSelect] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  // Simple current step tracking without complex animations
  useEffect(() => {
    if (!sequencerEngine) return;

    const handleStateChange = (state) => {
      setCurrentStep(state.currentStep || 0);
    };

    sequencerEngine.onStateChange(handleStateChange);
    
    return () => {
      // Cleanup if needed
    };
  }, [sequencerEngine]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Enable multi-select with Ctrl/Cmd
      if (e.ctrlKey || e.metaKey) {
        setIsMultiSelect(true);
      }
      
      // Clear selection with Escape
      if (e.key === 'Escape') {
        setSelectedSteps(new Set());
      }
      
      // Space bar to toggle selected steps
      if (e.key === ' ' && selectedSteps.size > 0) {
        e.preventDefault();
        selectedSteps.forEach(stepKey => {
          const [trackId, stepIndex] = stepKey.split('-');
          handleStepToggle(trackId, parseInt(stepIndex));
        });
      }
    };

    const handleKeyUp = (e) => {
      if (!e.ctrlKey && !e.metaKey) {
        setIsMultiSelect(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keyup', handleKeyUp);
    };
  }, [selectedSteps]);

  // Handle step toggle with multi-select support
  const handleStepToggle = useCallback((trackId, stepIndex) => {
    if (onStepToggle) {
      onStepToggle(trackId, stepIndex);
    }
  }, [onStepToggle]);

  // Handle step selection
  const handleStepSelect = useCallback((trackId, stepIndex, isSelected) => {
    const stepKey = `${trackId}-${stepIndex}`;
    
    setSelectedSteps(prev => {
      const newSelection = new Set(prev);
      
      if (isMultiSelect) {
        // Multi-select mode: toggle selection
        if (isSelected) {
          newSelection.add(stepKey);
        } else {
          newSelection.delete(stepKey);
        }
      } else {
        // Single select mode: replace selection
        newSelection.clear();
        if (isSelected) {
          newSelection.add(stepKey);
        }
      }
      
      return newSelection;
    });
  }, [isMultiSelect]);

  // Handle velocity change
  const handleVelocityChange = useCallback((trackId, stepIndex, velocity) => {
    if (onStepVelocityChange) {
      onStepVelocityChange(trackId, stepIndex, velocity);
    }
  }, [onStepVelocityChange]);

  // Generate step numbers for header
  const stepNumbers = useMemo(() => {
    return Array.from({ length: stepResolution }, (_, i) => i + 1);
  }, [stepResolution]);

  // Debug timing information (development only)
  // Timing info removed for simplified version

  // Get tracks from pattern or create default empty tracks
  const tracks = useMemo(() => {
    if (pattern && pattern.tracks) {
      return pattern.tracks;
    }
    
    // Default empty tracks for display
    const defaultTrackNames = [
      'Kick', 'Snare', 'Hi-Hat', 'Open Hat', 'Crash', 'Ride', 'Tom 1', 'Tom 2'
    ];
    
    const defaultColors = [
      '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16', '#22c55e',
      '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9', '#3b82f6', '#6366f1'
    ];

    return defaultTrackNames.map((name, index) => ({
      id: `track_${index}`,
      name,
      color: defaultColors[index % defaultColors.length],
      steps: Array.from({ length: stepResolution }, () => ({ active: false, velocity: 0.8 }))
    }));
  }, [pattern, stepResolution]);

  if (!tracks || tracks.length === 0) {
    return (
      <div className={`bg-black/20 backdrop-blur-lg border border-white/20 rounded-2xl p-6 ${className}`}>
        <div className="text-center text-white/60">
          <p>No pattern loaded</p>
          <p className="text-sm mt-2">Create or load a pattern to start sequencing</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-black/20 backdrop-blur-lg border border-white/20 rounded-2xl p-6 ${className}`}>
      {/* Grid Header */}
      <div className="flex items-center gap-2 mb-4">
        <h2 className="text-lg font-semibold text-white">Pattern Grid</h2>
        <div className="flex items-center gap-2 ml-auto text-sm text-white/60">
          <span>Resolution: {stepResolution}</span>
          {selectedSteps.size > 0 && (
            <span className="text-cyan-400">
              {selectedSteps.size} step{selectedSteps.size !== 1 ? 's' : ''} selected
            </span>
          )}
        </div>
      </div>

      {/* Step Numbers Header */}
      <div className="flex items-center gap-1 mb-3">
        <div className="w-20 flex-shrink-0"></div> {/* Track name space */}
        <div className="flex gap-1 flex-1">
          {stepNumbers.map((stepNum, index) => (
            <div
              key={stepNum}
              className={`flex-1 text-center text-xs font-mono ${
                index % 4 === 0
                  ? 'text-white/60'
                  : 'text-white/40'
              }`}
            >
              {stepNum}
            </div>
          ))}
        </div>
      </div>

      {/* Track Rows */}
      <div className="space-y-2">
        {tracks.map((track, trackIndex) => (
          <div
            key={track.id}
            className="flex items-center gap-1"
          >
            {/* Track Name */}
            <div className="w-20 flex-shrink-0">
              <div
                className="text-sm font-medium text-white/90 truncate px-2 py-1 rounded border"
                style={{
                  borderColor: track.color,
                  backgroundColor: `${track.color}20`
                }}
                title={track.name}
              >
                {track.name}
              </div>
            </div>

            {/* Step Grid */}
            <div className="flex gap-1 flex-1">
              {track.steps.map((step, stepIndex) => {
                const stepKey = `${track.id}-${stepIndex}`;
                const isSelected = selectedSteps.has(stepKey);
                const isCurrentStep = stepIndex === currentStep;
                const isHovered = hoveredStep === stepKey;

                return (
                  <SequencerStep
                    key={stepIndex}
                    trackId={track.id}
                    stepIndex={stepIndex}
                    step={step}
                    trackColor={track.color}
                    isActive={step.active}
                    isSelected={isSelected}
                    isCurrentStep={isCurrentStep}
                    isHovered={isHovered}
                    velocity={step.velocity}
                    onToggle={handleStepToggle}
                    onSelect={handleStepSelect}
                    onVelocityChange={handleVelocityChange}
                    onHover={setHoveredStep}
                  />
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Grid Footer */}
      <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/10">
        <div className="text-xs text-white/60">
          Click steps to toggle • Hold Ctrl/Cmd for multi-select • Space to toggle selected
        </div>
        <div className="flex items-center gap-4 text-xs text-white/60">
          {pattern && (
            <span>Pattern: {pattern.name} • BPM: {pattern.bpm}</span>
          )}
          <span className="text-cyan-400">
            Step: {currentStep + 1}/{stepResolution}
          </span>
        </div>
      </div>
    </div>
  );
});

export default SequencerGrid;