/**
 * Production configuration for waveform visualization system
 */

import React from 'react';

// Environment detection
const isProduction = process.env.NODE_ENV === 'production';
const isDevelopment = process.env.NODE_ENV === 'development';

/**
 * Performance optimization settings for production
 */
export const PRODUCTION_CONFIG = {
  // Canvas rendering optimizations
  rendering: {
    // Reduce canvas resolution on mobile devices
    mobileResolutionScale: 0.75,
    
    // Frame rate throttling for battery optimization
    maxFrameRate: isProduction ? 30 : 60,
    
    // Viewport culling settings
    viewportPadding: 0.1, // 10% padding outside visible area
    
    // Layer optimization
    staticLayerCaching: true,
    dynamicLayerThrottling: 16, // 16ms throttle for dynamic updates
    
    // Memory management
    maxCanvasSize: 4096, // Maximum canvas dimension
    texturePoolSize: 8,   // Number of reusable canvas textures
  },

  // Audio analysis optimizations
  analysis: {
    // Sample rate optimization
    defaultSampleRate: isProduction ? 22050 : 44100,
    
    // Analysis window sizes
    fftSize: isProduction ? 1024 : 2048,
    
    // Progressive loading
    chunkSize: 1024 * 64, // 64KB chunks
    maxConcurrentChunks: 2,
    
    // Fallback thresholds
    webAudioTimeout: 3000,    // 3 seconds
    videoFrameTimeout: 5000,  // 5 seconds
    
    // Quality vs performance trade-offs
    qualityPresets: {
      low: {
        sampleRate: 11025,
        fftSize: 512,
        updateInterval: 100
      },
      medium: {
        sampleRate: 22050,
        fftSize: 1024,
        updateInterval: 50
      },
      high: {
        sampleRate: 44100,
        fftSize: 2048,
        updateInterval: 16
      }
    }
  },

  // Memory management
  memory: {
    // Cache limits
    maxWaveformCacheSize: 50 * 1024 * 1024, // 50MB
    maxAnalysisDataSize: 20 * 1024 * 1024,  // 20MB
    
    // Garbage collection triggers
    gcThreshold: 0.8, // Trigger cleanup at 80% memory usage
    gcInterval: 30000, // Check every 30 seconds
    
    // Object pooling
    enableObjectPooling: isProduction,
    poolSizes: {
      canvasContexts: 4,
      audioBuffers: 8,
      typedArrays: 16
    }
  },

  // Feature flags for production
  features: {
    // Advanced features that can be disabled for performance
    visualEnhancements: true,
    zeroCrossingDetection: true,
    smartSnapping: true,
    frequencyAnalysis: !isProduction, // Disable in production by default
    
    // Debug features
    performanceMonitoring: isProduction,
    errorReporting: isProduction,
    analyticsTracking: isProduction,
    
    // Experimental features
    webWorkerAnalysis: true,
    offscreenCanvas: 'OffscreenCanvas' in window,
    audioWorklet: 'AudioWorklet' in window
  },

  // Bundle optimization
  bundling: {
    // Code splitting points
    splitPoints: [
      'waveform-core',      // Core visualization
      'waveform-analysis',  // Audio analysis
      'waveform-advanced',  // Advanced features
      'waveform-fallback'   // Fallback systems
    ],
    
    // Lazy loading thresholds
    lazyLoadThreshold: 2000, // 2 seconds delay before loading advanced features
    
    // Preloading strategy
    preloadStrategy: isProduction ? 'conservative' : 'aggressive',
    
    // Tree shaking optimization
    sideEffects: false,
    
    // Minification settings
    minification: {
      removeConsole: isProduction,
      removeDebugger: isProduction,
      dropUnusedFunctions: isProduction
    }
  },

  // Error handling and recovery
  errorHandling: {
    // Retry strategies
    maxRetries: 3,
    retryDelay: 1000,
    exponentialBackoff: true,
    
    // Fallback chains
    enableFallbackChain: true,
    fallbackTimeout: 5000,
    
    // Error reporting
    reportErrors: isProduction,
    errorSampling: 0.1, // Report 10% of errors in production
    
    // Recovery strategies
    autoRecovery: true,
    gracefulDegradation: true
  },

  // Performance monitoring
  monitoring: {
    // Metrics collection
    collectMetrics: isProduction,
    metricsInterval: 10000, // 10 seconds
    
    // Performance budgets
    budgets: {
      waveformGeneration: 2000,  // 2 seconds max
      interactionLatency: 16,    // 16ms max
      memoryUsage: 100 * 1024 * 1024, // 100MB max
      bundleSize: 500 * 1024     // 500KB max per chunk
    },
    
    // Alerting thresholds
    alerts: {
      highMemoryUsage: 0.9,      // 90% of budget
      slowGeneration: 1.5,       // 1.5x budget
      highErrorRate: 0.05        // 5% error rate
    }
  }
};

/**
 * Get optimized configuration based on device capabilities
 */
export const getOptimizedConfig = () => {
  const config = { ...PRODUCTION_CONFIG };
  
  // Device-specific optimizations
  const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  const isLowEnd = navigator.hardwareConcurrency <= 2 || navigator.deviceMemory <= 2;
  
  if (isMobile || isLowEnd) {
    // Reduce quality for mobile/low-end devices
    config.analysis.defaultSampleRate = 11025;
    config.analysis.fftSize = 512;
    config.rendering.maxFrameRate = 24;
    config.rendering.mobileResolutionScale = 0.5;
    config.features.frequencyAnalysis = false;
    config.features.visualEnhancements = false;
  }
  
  // Network-based optimizations
  const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  if (connection && connection.effectiveType) {
    const isSlowConnection = ['slow-2g', '2g'].includes(connection.effectiveType);
    
    if (isSlowConnection) {
      config.bundling.preloadStrategy = 'minimal';
      config.bundling.lazyLoadThreshold = 5000;
      config.analysis.chunkSize = 1024 * 32; // Smaller chunks
    }
  }
  
  return config;
};

/**
 * Apply production optimizations to existing components
 */
export const applyProductionOptimizations = (component) => {
  if (!isProduction) return component;
  
  // Wrap component with performance monitoring
  return React.memo(component, (prevProps, nextProps) => {
    // Custom comparison logic for waveform props
    const propsToCompare = ['audioSource', 'chops', 'currentTime', 'isPlaying'];
    
    return propsToCompare.every(prop => 
      prevProps[prop] === nextProps[prop]
    );
  });
};

/**
 * Production-ready error boundary wrapper
 */
export const withProductionErrorBoundary = (Component) => {
  return class ProductionErrorBoundary extends React.Component {
    constructor(props) {
      super(props);
      this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
      return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
      if (PRODUCTION_CONFIG.errorHandling.reportErrors) {
        // Report error to monitoring service
        console.error('Waveform production error:', error, errorInfo);
      }
    }

    render() {
      if (this.state.hasError) {
        return React.createElement('div', {
          className: 'waveform-error-fallback'
        }, 'Waveform visualization temporarily unavailable');
      }

      return React.createElement(Component, this.props);
    }
  };
};