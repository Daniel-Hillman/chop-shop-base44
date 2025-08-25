import React, { Suspense, useEffect, useState } from 'react';
import { WaveformLazyLoader, preloadWaveformComponents } from './WaveformLazyLoader';
import { waveformFeatureFlags, useWaveformFeatureFlag } from '../../services/WaveformFeatureFlags';
import { waveformAnalytics, useWaveformAnalytics } from '../../services/WaveformAnalytics';
import { getOptimizedConfig, withProductionErrorBoundary } from '../../config/waveform.production';
import { WaveformFallbackUI } from '../fallback/WaveformFallbackUI';
import { WaveformErrorBoundary } from '../error/WaveformErrorBoundary';

/**
 * Production-ready waveform wrapper with all optimizations applied
 */
const WaveformProductionWrapperComponent = ({
  audioSource,
  chops,
  currentTime,
  isPlaying,
  onChopCreate,
  onChopUpdate,
  onTimeSeek,
  visualSettings = {},
  ...props
}) => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [config, setConfig] = useState(null);
  
  // Feature flags
  const waveformEnabled = useWaveformFeatureFlag('waveformVisualization');
  const webAudioEnabled = useWaveformFeatureFlag('webAudioAnalysis');
  const visualEnhancementsEnabled = useWaveformFeatureFlag('visualEnhancements');
  const performanceMonitoringEnabled = useWaveformFeatureFlag('performanceMonitoring');
  
  // Analytics
  const analytics = useWaveformAnalytics();

  // Initialize production configuration
  useEffect(() => {
    const initializeProduction = async () => {
      try {
        // Get optimized configuration
        const optimizedConfig = getOptimizedConfig();
        setConfig(optimizedConfig);

        // Preload critical components
        if (optimizedConfig.bundling.preloadStrategy !== 'minimal') {
          await preloadWaveformComponents();
        }

        // Track initialization
        if (performanceMonitoringEnabled) {
          analytics.trackEvent('waveform_initialization', {
            config: optimizedConfig,
            featureFlags: waveformFeatureFlags.getEnabledFeatures(),
            deviceCapabilities: waveformFeatureFlags.deviceCapabilities
          });
        }

        setIsInitialized(true);
      } catch (error) {
        console.error('Failed to initialize waveform production wrapper:', error);
        
        if (performanceMonitoringEnabled) {
          analytics.trackError('initialization_error', error.message, {
            component: 'WaveformProductionWrapper'
          });
        }
      }
    };

    initializeProduction();
  }, [analytics, performanceMonitoringEnabled]);

  // Track feature usage
  useEffect(() => {
    if (performanceMonitoringEnabled && isInitialized) {
      analytics.trackFeatureUsage('waveform_production_wrapper', {
        webAudioEnabled,
        visualEnhancementsEnabled,
        configPreset: config?.analysis?.qualityPresets ? 'optimized' : 'default'
      });
    }
  }, [analytics, performanceMonitoringEnabled, isInitialized, webAudioEnabled, visualEnhancementsEnabled, config]);

  // Performance monitoring
  useEffect(() => {
    if (!performanceMonitoringEnabled || !isInitialized) return;

    const startTime = performance.now();

    return () => {
      const renderTime = performance.now() - startTime;
      analytics.trackPerformance('component_render_time', renderTime, {
        component: 'WaveformProductionWrapper'
      });
    };
  }, [analytics, performanceMonitoringEnabled, isInitialized, audioSource, chops]);

  // Handle errors with analytics
  const handleError = (error, errorInfo) => {
    if (performanceMonitoringEnabled) {
      analytics.trackError('component_error', error.message, {
        component: 'WaveformProductionWrapper',
        errorInfo,
        featureFlags: waveformFeatureFlags.getEnabledFeatures()
      });
    }
  };

  // Early return if waveform is disabled
  if (!waveformEnabled) {
    return (
      <WaveformFallbackUI 
        message="Waveform visualization is currently disabled"
        showRetry={false}
      />
    );
  }

  // Loading state
  if (!isInitialized || !config) {
    return (
      <WaveformFallbackUI 
        message="Initializing waveform visualization..."
        showRetry={false}
      />
    );
  }

  // Enhanced props with production optimizations
  const enhancedProps = {
    ...props,
    audioSource,
    chops,
    currentTime,
    isPlaying,
    onChopCreate: (startTime, endTime, metadata = {}) => {
      // Track chop creation
      if (performanceMonitoringEnabled) {
        analytics.trackChopActivity('create', {
          duration: endTime - startTime,
          startTime,
          creationMethod: metadata.creationMethod || 'unknown'
        });
      }
      
      onChopCreate(startTime, endTime, metadata);
    },
    onChopUpdate: (chopId, newBounds, metadata = {}) => {
      // Track chop updates
      if (performanceMonitoringEnabled) {
        analytics.trackChopActivity('edit', {
          chopId,
          duration: newBounds.endTime - newBounds.startTime,
          startTime: newBounds.startTime,
          editMethod: metadata.editMethod || 'unknown'
        });
      }
      
      onChopUpdate(chopId, newBounds, metadata);
    },
    onTimeSeek: (time, metadata = {}) => {
      // Track navigation
      if (performanceMonitoringEnabled) {
        analytics.trackNavigation('seek', null, { start: time, end: time });
      }
      
      onTimeSeek(time, metadata);
    },
    visualSettings: {
      ...visualSettings,
      // Apply production visual optimizations
      enableVisualEnhancements: visualEnhancementsEnabled,
      performanceMode: config.rendering.maxFrameRate < 60,
      qualityPreset: config.analysis.qualityPresets ? 'optimized' : 'default'
    },
    // Production configuration
    config
  };

  return (
    <WaveformErrorBoundary onError={handleError}>
      <div className="waveform-production-container">
        <WaveformLazyLoader
          {...enhancedProps}
          enableVisualEnhancements={visualEnhancementsEnabled}
          enableAdvancedAnalysis={webAudioEnabled}
          fallbackComponent={WaveformFallbackUI}
        />
        
        {/* Development debug panel */}
        {process.env.NODE_ENV === 'development' && (
          <WaveformDebugPanel 
            config={config}
            analytics={analytics}
            featureFlags={waveformFeatureFlags}
          />
        )}
      </div>
    </WaveformErrorBoundary>
  );
};

/**
 * Debug panel for development
 */
const WaveformDebugPanel = ({ config, analytics, featureFlags }) => {
  const [showDebug, setShowDebug] = useState(false);

  if (!showDebug) {
    return (
      <button 
        onClick={() => setShowDebug(true)}
        className="waveform-debug-toggle"
        style={{
          position: 'fixed',
          top: '10px',
          right: '10px',
          zIndex: 9999,
          padding: '5px 10px',
          background: '#333',
          color: 'white',
          border: 'none',
          borderRadius: '3px',
          fontSize: '12px'
        }}
      >
        Debug
      </button>
    );
  }

  return (
    <div 
      className="waveform-debug-panel"
      style={{
        position: 'fixed',
        top: '10px',
        right: '10px',
        width: '300px',
        maxHeight: '400px',
        overflow: 'auto',
        background: 'rgba(0,0,0,0.9)',
        color: 'white',
        padding: '10px',
        borderRadius: '5px',
        fontSize: '12px',
        zIndex: 9999
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
        <h3 style={{ margin: 0 }}>Waveform Debug</h3>
        <button 
          onClick={() => setShowDebug(false)}
          style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}
        >
          ×
        </button>
      </div>
      
      <div>
        <h4>Feature Flags</h4>
        <ul style={{ margin: 0, paddingLeft: '15px' }}>
          {featureFlags.getEnabledFeatures().map(feature => (
            <li key={feature}>{feature}</li>
          ))}
        </ul>
      </div>
      
      <div>
        <h4>Configuration</h4>
        <pre style={{ fontSize: '10px', overflow: 'auto' }}>
          {JSON.stringify(config, null, 2)}
        </pre>
      </div>
      
      <div>
        <h4>Analytics Summary</h4>
        <pre style={{ fontSize: '10px', overflow: 'auto' }}>
          {JSON.stringify(analytics.getSummary(), null, 2)}
        </pre>
      </div>
    </div>
  );
};

// Apply production error boundary
export const WaveformProductionWrapper = withProductionErrorBoundary(
  React.memo(WaveformProductionWrapperComponent, (prevProps, nextProps) => {
    // Optimized comparison for production
    const propsToCompare = ['audioSource', 'chops', 'currentTime', 'isPlaying'];
    
    return propsToCompare.every(prop => {
      if (prop === 'chops') {
        // Deep comparison for chops array
        return JSON.stringify(prevProps[prop]) === JSON.stringify(nextProps[prop]);
      }
      return prevProps[prop] === nextProps[prop];
    });
  })
);