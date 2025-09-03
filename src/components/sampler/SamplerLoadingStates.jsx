/**
 * @fileoverview Enhanced Loading States for Sampler Components
 * Provides consistent loading indicators with progress feedback
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5
 */

import React, { memo } from 'react';
import { Loader2, Music, Play, Grid3X3 } from 'lucide-react';

/**
 * Main sequencer loading state with progress indication
 */
export const SamplerSequencerLoading = memo(function SamplerSequencerLoading({
  progress = 0,
  stage = 'initializing',
  className = ''
}) {
  const stages = {
    initializing: { icon: Loader2, text: 'Initializing Sampler Sequencer...', color: 'cyan' },
    connecting: { icon: Music, text: 'Connecting to YouTube Player...', color: 'blue' },
    loading_chops: { icon: Grid3X3, text: 'Loading Chop Data...', color: 'green' },
    ready: { icon: Play, text: 'Ready to Sequence!', color: 'emerald' }
  };

  const currentStage = stages[stage] || stages.initializing;
  const IconComponent = currentStage.icon;

  return (
    <div className={`bg-black/20 backdrop-blur-lg border border-white/20 rounded-2xl p-6 ${className}`}>
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        {/* Animated Icon */}
        <div className="relative">
          <IconComponent 
            className={`w-8 h-8 text-${currentStage.color}-400 ${
              stage !== 'ready' ? 'animate-spin' : 'animate-pulse'
            }`} 
          />
          {progress > 0 && (
            <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2">
              <div className="w-16 h-1 bg-white/20 rounded-full overflow-hidden">
                <div 
                  className={`h-full bg-${currentStage.color}-400 transition-all duration-300 ease-out`}
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Loading Text */}
        <div className="text-center space-y-2">
          <span className="text-white/80 font-medium">{currentStage.text}</span>
          {progress > 0 && (
            <div className="text-xs text-white/60">
              {Math.round(progress)}% complete
            </div>
          )}
        </div>

        {/* Loading Tips */}
        <div className="text-xs text-white/50 text-center max-w-md">
          {stage === 'initializing' && 'Setting up sequencer engine and pattern management...'}
          {stage === 'connecting' && 'Establishing connection with video player for timestamp control...'}
          {stage === 'loading_chops' && 'Processing your chops and assigning them to sequencer tracks...'}
          {stage === 'ready' && 'All systems ready! Start creating patterns with your chops.'}
        </div>
      </div>
    </div>
  );
});

/**
 * Compact loading indicator for smaller components
 */
export const SamplerCompactLoading = memo(function SamplerCompactLoading({
  text = 'Loading...',
  size = 'sm',
  className = ''
}) {
  const sizes = {
    xs: 'w-3 h-3',
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Loader2 className={`${sizes[size]} text-cyan-400 animate-spin`} />
      <span className="text-white/70 text-sm">{text}</span>
    </div>
  );
});

/**
 * Grid loading skeleton for sequencer grid
 */
export const SamplerGridSkeleton = memo(function SamplerGridSkeleton({
  className = ''
}) {
  return (
    <div className={`bg-black/20 backdrop-blur-lg border border-white/20 rounded-2xl p-4 ${className}`}>
      {/* Header Skeleton */}
      <div className="flex items-center justify-between mb-4">
        <div className="h-5 bg-white/10 rounded w-32 animate-pulse" />
        <div className="h-4 bg-white/10 rounded w-24 animate-pulse" />
      </div>

      {/* Step Numbers Skeleton */}
      <div className="flex items-center gap-1 mb-2">
        <div className="w-12 h-4 bg-white/10 rounded animate-pulse" />
        <div className="flex gap-1 flex-1">
          {Array.from({ length: 16 }, (_, i) => (
            <div key={i} className="flex-1 h-4 bg-white/10 rounded animate-pulse" />
          ))}
        </div>
      </div>

      {/* Current Step Indicator Skeleton */}
      <div className="flex items-center gap-1 mb-3">
        <div className="w-12" />
        <div className="flex gap-1 flex-1">
          {Array.from({ length: 16 }, (_, i) => (
            <div key={i} className="flex-1 h-1 bg-white/10 rounded animate-pulse" />
          ))}
        </div>
      </div>

      {/* Track Rows Skeleton */}
      <div className="space-y-1">
        {Array.from({ length: 16 }, (_, trackIndex) => (
          <div key={trackIndex} className="flex items-center gap-1">
            {/* Track Indicator */}
            <div className="w-12 h-8 bg-white/10 rounded animate-pulse" />
            
            {/* Steps */}
            <div className="flex gap-1 flex-1">
              {Array.from({ length: 16 }, (_, stepIndex) => (
                <div 
                  key={stepIndex} 
                  className="flex-1 h-8 bg-white/10 rounded animate-pulse"
                  style={{
                    animationDelay: `${(trackIndex * 16 + stepIndex) * 50}ms`
                  }}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});

/**
 * Transport controls loading skeleton
 */
export const SamplerTransportSkeleton = memo(function SamplerTransportSkeleton({
  className = ''
}) {
  return (
    <div className={`flex items-center gap-4 ${className}`}>
      {/* Play/Stop Button */}
      <div className="h-10 w-20 bg-white/10 rounded animate-pulse" />
      
      {/* BPM Control */}
      <div className="flex items-center gap-2">
        <div className="h-4 w-8 bg-white/10 rounded animate-pulse" />
        <div className="h-8 w-16 bg-white/10 rounded animate-pulse" />
      </div>
      
      {/* Status Indicator */}
      <div className="flex items-center gap-2 ml-auto">
        <div className="w-2 h-2 bg-white/10 rounded-full animate-pulse" />
        <div className="h-4 w-16 bg-white/10 rounded animate-pulse" />
      </div>
    </div>
  );
});

/**
 * Bank navigation loading skeleton
 */
export const SamplerBankSkeleton = memo(function SamplerBankSkeleton({
  className = ''
}) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Previous Button */}
      <div className="h-8 w-8 bg-white/10 rounded animate-pulse" />
      
      {/* Bank Indicator */}
      <div className="h-8 w-24 bg-white/10 rounded animate-pulse" />
      
      {/* Next Button */}
      <div className="h-8 w-8 bg-white/10 rounded animate-pulse" />
      
      {/* Progress Dots */}
      <div className="flex items-center gap-1 ml-2">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="w-1.5 h-1.5 bg-white/10 rounded-full animate-pulse" />
        ))}
      </div>
    </div>
  );
});

/**
 * Error state with retry option
 */
export const SamplerErrorState = memo(function SamplerErrorState({
  title = 'Loading Failed',
  message = 'Unable to initialize the sampler sequencer',
  onRetry,
  className = ''
}) {
  return (
    <div className={`bg-black/20 backdrop-blur-lg border border-red-500/20 rounded-2xl p-6 ${className}`}>
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        {/* Error Icon */}
        <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center">
          <div className="w-6 h-6 text-red-400">⚠️</div>
        </div>

        {/* Error Text */}
        <div className="text-center space-y-2">
          <h3 className="text-white font-semibold">{title}</h3>
          <p className="text-white/70 text-sm max-w-md">{message}</p>
        </div>

        {/* Retry Button */}
        {onRetry && (
          <button
            onClick={onRetry}
            className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 
              text-red-300 rounded-lg transition-colors duration-200 text-sm font-medium"
          >
            Try Again
          </button>
        )}
      </div>
    </div>
  );
});

export default {
  SamplerSequencerLoading,
  SamplerCompactLoading,
  SamplerGridSkeleton,
  SamplerTransportSkeleton,
  SamplerBankSkeleton,
  SamplerErrorState
};