import React, { Suspense, lazy } from 'react';
import { WaveformFallbackUI } from '../fallback/WaveformFallbackUI';

// Lazy load the main waveform visualization component
const WaveformVisualization = lazy(() => 
  import('./WaveformVisualization').then(module => ({
    default: module.WaveformVisualization
  }))
);

// Lazy load heavy analysis components
const WebAudioAnalyzer = lazy(() => 
  import('../../services/WebAudioAnalyzer').then(module => ({
    default: module.WebAudioAnalyzer
  }))
);

const VisualEnhancementEngine = lazy(() => 
  import('./VisualEnhancementEngine').then(module => ({
    default: module.VisualEnhancementEngine
  }))
);

/**
 * Lazy-loaded wrapper for waveform components with intelligent loading
 */
export const WaveformLazyLoader = ({ 
  enableVisualEnhancements = false,
  enableAdvancedAnalysis = false,
  fallbackComponent: CustomFallback,
  ...props 
}) => {
  const FallbackComponent = CustomFallback || WaveformFallbackUI;

  return (
    <div className="waveform-lazy-container">
      <Suspense fallback={<FallbackComponent message="Loading waveform visualization..." />}>
        <WaveformVisualization {...props} />
      </Suspense>
      
      {enableVisualEnhancements && (
        <Suspense fallback={null}>
          <VisualEnhancementEngine />
        </Suspense>
      )}
      
      {enableAdvancedAnalysis && (
        <Suspense fallback={null}>
          <WebAudioAnalyzer />
        </Suspense>
      )}
    </div>
  );
};

/**
 * Preload waveform components for better UX
 */
export const preloadWaveformComponents = async () => {
  try {
    // Preload core components
    await Promise.all([
      import('./WaveformVisualization'),
      import('./CanvasRenderer'),
      import('./InteractionManager')
    ]);
    
    console.log('Core waveform components preloaded');
  } catch (error) {
    console.warn('Failed to preload waveform components:', error);
  }
};

/**
 * Conditionally preload advanced features based on user behavior
 */
export const preloadAdvancedFeatures = async (features = []) => {
  const preloadPromises = [];
  
  if (features.includes('visualEnhancements')) {
    preloadPromises.push(import('./VisualEnhancementEngine'));
  }
  
  if (features.includes('advancedAnalysis')) {
    preloadPromises.push(import('../../services/WebAudioAnalyzer'));
  }
  
  if (features.includes('zeroCrossing')) {
    preloadPromises.push(import('../../services/ZeroCrossingDetector'));
  }
  
  try {
    await Promise.all(preloadPromises);
    console.log('Advanced waveform features preloaded:', features);
  } catch (error) {
    console.warn('Failed to preload advanced features:', error);
  }
};