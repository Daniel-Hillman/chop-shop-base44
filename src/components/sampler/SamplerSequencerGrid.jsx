import React, { useState, useCallback, useMemo, memo, useRef } from 'react';
import SamplerSequencerStep from './SamplerSequencerStep';

// Removed debouncing for ultra-fast response

// Ultra-lightweight TrackRow - Performance First
const TrackRow = memo(function TrackRow({
  track,
  currentStep,
  isPlaying,
  onStepToggle
}) {
  return (
    <div className="flex items-center gap-1">
      {/* Track Indicator - Minimal */}
      <div className="w-12 flex-shrink-0">
        <div className={`text-xs text-center py-1 px-1 rounded border ${
          track.hasChop ? 'border-cyan-600 bg-cyan-900 text-cyan-300' : 'border-white/20 bg-gray-800 text-white/60'
        }`}>
          {track.trackIndex + 1}
        </div>
      </div>

      {/* Step Grid - Ultra Fast */}
      <div className="flex gap-1 flex-1">
        {track.steps.map((isActive, stepIndex) => (
          <SamplerSequencerStep
            key={stepIndex}
            trackIndex={track.trackIndex}
            stepIndex={stepIndex}
            isActive={isActive}
            hasChop={track.hasChop}
            chopColor={track.chopColor}
            isCurrentStep={stepIndex === currentStep && isPlaying}
            onToggle={onStepToggle}
          />
        ))}
      </div>
    </div>
  );
});

/**
 * Sampler sequencer grid component optimized for YouTube chop triggering
 * 16x16 grid layout with performance optimizations and track assignment indicators
 * Performance optimizations: React.memo, debounced interactions, efficient re-renders
 */
const SamplerSequencerGrid = memo(function SamplerSequencerGrid({
  pattern = null,
  chops = [],
  currentStep = 0,
  isPlaying = false,
  onStepToggle,
  className = ''
}) {

  // Ultra-fast step toggle
  const handleStepToggle = useCallback((trackIndex, stepIndex, newState) => {
    onStepToggle?.(trackIndex, stepIndex, newState);
  }, [onStepToggle]);

  // Removed hover effects for performance

  // Generate 16 tracks with chop assignments - memoized for performance
  const tracks = useMemo(() => {
    const trackCount = 16;
    const stepCount = 16;
    
    return Array.from({ length: trackCount }, (_, trackIndex) => {
      const chop = chops[trackIndex] || null;
      const trackSteps = pattern?.tracks?.[trackIndex]?.steps || 
        Array.from({ length: stepCount }, () => false);
      
      return {
        id: `track_${trackIndex}`,
        trackIndex,
        chop,
        steps: trackSteps,
        hasChop: !!chop,
        // Add stable reference for chop color to prevent unnecessary re-renders
        chopColor: chop?.color || '#06b6d4'
      };
    });
  }, [chops, pattern]);

  // Memoize chop count to prevent recalculation on every render
  const chopCount = useMemo(() => {
    return chops.filter(chop => chop != null).length;
  }, [chops]);

  // Generate step numbers for header (1-16)
  const stepNumbers = useMemo(() => {
    return Array.from({ length: 16 }, (_, i) => i + 1);
  }, []);

  return (
    <div className={`bg-black/20 backdrop-blur-lg border border-white/20 rounded-2xl p-4 ${className}`}>
      {/* Grid Header */}
      <div className="flex items-center gap-2 mb-3">
        <h3 className="text-md font-semibold text-white">Sequencer Grid</h3>
        <div className="flex items-center gap-2 ml-auto text-xs text-white/60">
          <span>16 Tracks × 16 Steps</span>
          {isPlaying && (
            <span className="text-cyan-400">
              Playing • Step {currentStep + 1}
            </span>
          )}
        </div>
      </div>

      {/* Step Numbers Header - Minimal */}
      <div className="flex items-center gap-1 mb-2">
        <div className="w-12 flex-shrink-0 text-xs text-white/60">Track</div>
        <div className="flex gap-1 flex-1">
          {stepNumbers.map((stepNum, index) => (
            <div
              key={stepNum}
              className={`flex-1 text-center text-xs ${
                index % 4 === 0 ? 'text-white/60' : 'text-white/40'
              }`}
            >
              {stepNum}
            </div>
          ))}
        </div>
      </div>

      {/* Minimal Playhead - Performance First */}
      <div className="flex items-center gap-1 mb-2">
        <div className="w-12 flex-shrink-0 text-xs text-white/60">
          {isPlaying ? 'PLAY' : 'STOP'}
        </div>
        <div className="flex gap-1 flex-1">
          {Array.from({ length: 16 }, (_, i) => (
            <div
              key={i}
              className={`flex-1 h-1 ${
                i === currentStep && isPlaying ? 'bg-cyan-400' : 'bg-white/20'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Track Rows - Ultra Minimal */}
      <div className="space-y-1">
        {tracks.map((track) => (
          <TrackRow
            key={track.id}
            track={track}
            currentStep={currentStep}
            isPlaying={isPlaying}
            onStepToggle={handleStepToggle}
          />
        ))}
      </div>

      {/* Grid Footer */}
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/10">
        <div className="text-xs text-white/60">
          Click steps to toggle • Cyan tracks have chops assigned
        </div>
        <div className="flex items-center gap-2">
          <div className="text-xs text-white/60">
            {chopCount} of 16 tracks assigned
          </div>
          {chopCount === 0 && chops.length > 0 && (
            <button
              onClick={() => {
                console.log('🔄 Manual chop assignment requested');
                // This will be handled by the parent component
                onStepToggle?.('ASSIGN_CHOPS', 0, true);
              }}
              className="px-2 py-1 bg-cyan-600 text-white text-xs rounded hover:bg-cyan-500"
            >
              Assign Chops
            </button>
          )}
          {chops.length === 0 && (
            <button
              onClick={() => {
                console.log('🧪 Creating test chops in sampler');
                // Create test chops and trigger assignment
                onStepToggle?.('CREATE_TEST_CHOPS', 0, true);
              }}
              className="px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-500"
            >
              Create Test Chops
            </button>
          )}
        </div>
      </div>
    </div>
  );
});

export default SamplerSequencerGrid;