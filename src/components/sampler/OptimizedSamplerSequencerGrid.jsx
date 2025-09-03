/**
 * @fileoverview Optimized Sampler Sequencer Grid Component
 * High-performance grid using virtual scrolling and optimized rendering
 * Prevents UI updates from affecting audio timing
 */

import React, { useState, useEffect, useCallback, useRef, useMemo, memo } from 'react';
import { HighPerformanceRenderer } from '../../utils/HighPerformanceRenderer';

/**
 * Optimized sequencer grid with zero-lag performance
 * Uses virtual scrolling and batched updates
 */
const OptimizedSamplerSequencerGrid = memo(function OptimizedSamplerSequencerGrid({
  pattern = null,
  currentStep = 0,
  isPlaying = false,
  onStepToggle,
  onStepVelocityChange,
  className = ''
}) {
  // Performance renderer instance
  const rendererRef = useRef(null);
  const gridContainerRef = useRef(null);
  const stepElementsRef = useRef(new Map());
  
  // Grid state
  const [visibleTracks, setVisibleTracks] = useState(new Set());
  const [visibleSteps, setVisibleSteps] = useState({ start: 0, end: 15 });
  
  // Performance tracking
  const [renderMetrics, setRenderMetrics] = useState({
    frameTime: 0,
    droppedFrames: 0
  });

  // Initialize performance renderer
  useEffect(() => {
    if (!rendererRef.current) {
      rendererRef.current = new HighPerformanceRenderer();
    }
    
    return () => {
      if (rendererRef.current) {
        rendererRef.current.cleanup();
      }
    };
  }, []);

  // Memoized track data for performance
  const trackData = useMemo(() => {
    if (!pattern || !pattern.tracks) return [];
    
    return pattern.tracks.map(track => ({
      id: track.id,
      name: track.name || `Track ${track.id}`,
      steps: track.steps || Array(16).fill({ active: false, velocity: 100 }),
      color: track.color || '#3b82f6'
    }));
  }, [pattern]);

  // Optimized step toggle handler
  const handleStepToggle = useCallback((trackId, stepIndex) => {
    if (!rendererRef.current) return;
    
    // Immediate visual feedback
    const stepKey = `${trackId}-${stepIndex}`;
    const stepElement = stepElementsRef.current.get(stepKey);
    
    if (stepElement) {
      rendererRef.current.scheduleUpdate(() => {
        const isActive = !stepElement.dataset.active;
        stepElement.dataset.active = isActive;
        updateStepVisual(stepElement, isActive, false);
      }, `toggle-${stepKey}`);
    }
    
    // Notify parent component
    onStepToggle?.(trackId, stepIndex);
  }, [onStepToggle]);

  // Optimized velocity change handler
  const handleVelocityChange = useCallback((trackId, stepIndex, velocity) => {
    if (!rendererRef.current) return;
    
    const stepKey = `${trackId}-${stepIndex}`;
    const stepElement = stepElementsRef.current.get(stepKey);
    
    if (stepElement) {
      rendererRef.current.scheduleUpdate(() => {
        stepElement.style.opacity = velocity / 127;
      }, `velocity-${stepKey}`);
    }
    
    onStepVelocityChange?.(trackId, stepIndex, velocity);
  }, [onStepVelocityChange]);

  // Update step visual appearance
  const updateStepVisual = useCallback((element, isActive, isCurrentStep) => {
    if (!element) return;
    
    let backgroundColor, transform, boxShadow;
    
    if (isCurrentStep && isPlaying) {
      backgroundColor = '#f59e0b'; // Amber for current step
      transform = 'translateZ(0) scale(1.1)';
      boxShadow = '0 0 10px rgba(245, 158, 11, 0.5)';
    } else if (isActive) {
      backgroundColor = '#10b981'; // Green for active
      transform = 'translateZ(0) scale(1)';
      boxShadow = '0 2px 4px rgba(16, 185, 129, 0.3)';
    } else {
      backgroundColor = '#374151'; // Gray for inactive
      transform = 'translateZ(0) scale(1)';
      boxShadow = 'none';
    }
    
    element.style.backgroundColor = backgroundColor;
    element.style.transform = transform;
    element.style.boxShadow = boxShadow;
  }, [isPlaying]);

  // Create optimized step element
  const createStepElement = useCallback((trackId, stepIndex, stepData) => {
    if (!rendererRef.current) return null;
    
    const element = rendererRef.current.createOptimizedStepIndicator(
      stepIndex,
      stepIndex === currentStep && isPlaying,
      stepData.active
    );
    
    const stepKey = `${trackId}-${stepIndex}`;
    element.dataset.trackId = trackId;
    element.dataset.stepIndex = stepIndex;
    element.dataset.active = stepData.active;
    element.dataset.stepKey = stepKey;
    
    // Add click handler
    element.addEventListener('click', () => {
      handleStepToggle(trackId, stepIndex);
    });
    
    // Add right-click for velocity
    element.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      const newVelocity = stepData.velocity === 127 ? 64 : 127;
      handleVelocityChange(trackId, stepIndex, newVelocity);
    });
    
    // Optimize element for hardware acceleration
    rendererRef.current.optimizeElement(element);
    
    // Store reference
    stepElementsRef.current.set(stepKey, element);
    
    return element;
  }, [currentStep, isPlaying, handleStepToggle, handleVelocityChange]);

  // Create track row element
  const createTrackRow = useCallback((track, trackIndex) => {
    const row = document.createElement('div');
    row.className = 'sequencer-track-row';
    row.style.cssText = `
      display: flex;
      align-items: center;
      padding: 8px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      min-height: 60px;
    `;
    
    // Track label
    const label = document.createElement('div');
    label.className = 'track-label';
    label.textContent = track.name;
    label.style.cssText = `
      width: 120px;
      color: white;
      font-size: 14px;
      font-weight: 500;
      padding-right: 16px;
      flex-shrink: 0;
    `;
    row.appendChild(label);
    
    // Steps container
    const stepsContainer = document.createElement('div');
    stepsContainer.className = 'steps-container';
    stepsContainer.style.cssText = `
      display: flex;
      gap: 4px;
      flex: 1;
    `;
    
    // Create step elements
    track.steps.forEach((stepData, stepIndex) => {
      if (stepIndex >= visibleSteps.start && stepIndex <= visibleSteps.end) {
        const stepElement = createStepElement(track.id, stepIndex, stepData);
        if (stepElement) {
          stepsContainer.appendChild(stepElement);
        }
      }
    });
    
    row.appendChild(stepsContainer);
    return row;
  }, [visibleSteps, createStepElement]);

  // Update current step highlighting
  useEffect(() => {
    if (!rendererRef.current) return;
    
    rendererRef.current.scheduleUpdate(() => {
      stepElementsRef.current.forEach((element, stepKey) => {
        const stepIndex = parseInt(element.dataset.stepIndex);
        const isActive = element.dataset.active === 'true';
        const isCurrentStep = stepIndex === currentStep;
        
        updateStepVisual(element, isActive, isCurrentStep);
      });
    }, `current-step-${currentStep}`);
  }, [currentStep, updateStepVisual]);

  // Render grid using virtual scrolling
  const renderGrid = useCallback(() => {
    if (!gridContainerRef.current || !rendererRef.current) return;
    
    const container = gridContainerRef.current;
    
    // Clear existing content
    container.innerHTML = '';
    
    // Create virtual scrolling container
    const virtualContainer = rendererRef.current.createVirtualScrollContainer(
      trackData,
      (track, index) => createTrackRow(track, index),
      60 // Track row height
    );
    
    container.appendChild(virtualContainer);
  }, [trackData, createTrackRow]);

  // Initial render and updates
  useEffect(() => {
    renderGrid();
  }, [renderGrid]);

  // Performance monitoring
  useEffect(() => {
    if (!rendererRef.current) return;
    
    const interval = setInterval(() => {
      const metrics = rendererRef.current.getPerformanceMetrics();
      setRenderMetrics(metrics);
      
      // Log performance warnings
      if (metrics.droppedFrames > 5) {
        console.warn('Sequencer grid performance warning:', metrics);
      }
    }, 2000);
    
    return () => clearInterval(interval);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stepElementsRef.current.clear();
    };
  }, []);

  return (
    <div className={`optimized-sequencer-grid ${className}`}>
      {/* Performance indicator */}
      {renderMetrics.droppedFrames > 0 && (
        <div className="performance-warning" style={{
          position: 'absolute',
          top: '8px',
          right: '8px',
          background: 'rgba(239, 68, 68, 0.9)',
          color: 'white',
          padding: '4px 8px',
          borderRadius: '4px',
          fontSize: '12px',
          zIndex: 10
        }}>
          Performance: {renderMetrics.droppedFrames} dropped frames
        </div>
      )}
      
      {/* Grid container */}
      <div
        ref={gridContainerRef}
        className="grid-container"
        style={{
          width: '100%',
          height: '400px',
          overflow: 'auto',
          background: 'rgba(0, 0, 0, 0.3)',
          borderRadius: '8px',
          border: '1px solid rgba(255, 255, 255, 0.1)'
        }}
      />
      
      {/* Step indicators */}
      <div className="step-indicators" style={{
        display: 'flex',
        justifyContent: 'center',
        gap: '4px',
        marginTop: '8px',
        padding: '0 136px' // Offset for track labels
      }}>
        {Array.from({ length: 16 }, (_, i) => (
          <div
            key={i}
            className={`step-indicator ${i === currentStep ? 'active' : ''}`}
            style={{
              width: '20px',
              height: '4px',
              backgroundColor: i === currentStep && isPlaying ? '#f59e0b' : '#374151',
              borderRadius: '2px',
              transition: 'background-color 0.1s ease'
            }}
          />
        ))}
      </div>
    </div>
  );
});

export default OptimizedSamplerSequencerGrid;