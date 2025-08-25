/**
 * Bundle optimization utilities for waveform components
 */

/**
 * Dynamic import with retry logic and error handling
 */
export const dynamicImportWithRetry = async (importFn, maxRetries = 3) => {
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await importFn();
    } catch (error) {
      lastError = error;
      
      if (attempt < maxRetries) {
        // Exponential backoff
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw new Error(`Failed to load module after ${maxRetries} attempts: ${lastError.message}`);
};

/**
 * Preload critical waveform modules
 */
export const preloadCriticalModules = async () => {
  const criticalModules = [
    () => import('../components/waveform/WaveformVisualization'),
    () => import('../components/waveform/CanvasRenderer'),
    () => import('../services/WebAudioAnalyzer')
  ];

  try {
    await Promise.all(
      criticalModules.map(importFn => 
        dynamicImportWithRetry(importFn, 2)
      )
    );
    console.log('Critical waveform modules preloaded');
  } catch (error) {
    console.warn('Failed to preload critical modules:', error);
  }
};

/**
 * Lazy load non-critical modules based on user interaction
 */
export const lazyLoadNonCriticalModules = () => {
  const nonCriticalModules = {
    visualEnhancements: () => import('../components/waveform/VisualEnhancementEngine'),
    zeroCrossing: () => import('../services/ZeroCrossingDetector'),
    smartSnapping: () => import('../services/SmartSnapping'),
    performanceOptimizer: () => import('../services/WaveformPerformanceOptimizer')
  };

  const loadedModules = {};

  return {
    async load(moduleName) {
      if (loadedModules[moduleName]) {
        return loadedModules[moduleName];
      }

      if (!nonCriticalModules[moduleName]) {
        throw new Error(`Unknown module: ${moduleName}`);
      }

      try {
        const module = await dynamicImportWithRetry(nonCriticalModules[moduleName]);
        loadedModules[moduleName] = module;
        return module;
      } catch (error) {
        console.error(`Failed to load ${moduleName}:`, error);
        throw error;
      }
    },

    isLoaded(moduleName) {
      return !!loadedModules[moduleName];
    },

    getLoadedModules() {
      return Object.keys(loadedModules);
    }
  };
};

/**
 * Bundle size analyzer for development
 */
export const analyzeBundleSize = () => {
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  const moduleStats = {
    waveformCore: 0,
    audioAnalysis: 0,
    canvasRendering: 0,
    interactions: 0,
    utilities: 0
  };

  // Estimate module sizes (in development, this would use webpack-bundle-analyzer)
  const estimateModuleSize = (modulePath) => {
    // This is a simplified estimation - in production, use actual bundle analysis
    const sizeEstimates = {
      'WaveformVisualization': 15000,
      'CanvasRenderer': 12000,
      'WebAudioAnalyzer': 8000,
      'InteractionManager': 6000,
      'VisualEnhancementEngine': 10000,
      'ZeroCrossingDetector': 4000,
      'SmartSnapping': 3000,
      'WaveformPerformanceOptimizer': 7000
    };

    return sizeEstimates[modulePath] || 2000;
  };

  return {
    getModuleSize: estimateModuleSize,
    getTotalSize: () => Object.values(moduleStats).reduce((sum, size) => sum + size, 0),
    getStats: () => ({ ...moduleStats })
  };
};

/**
 * Code splitting configuration for webpack
 */
export const getCodeSplittingConfig = () => {
  return {
    chunks: 'all',
    cacheGroups: {
      waveformCore: {
        name: 'waveform-core',
        test: /[\\/]src[\\/]components[\\/]waveform[\\/](WaveformVisualization|CanvasRenderer|ViewportManager)/,
        priority: 30,
        chunks: 'all'
      },
      waveformAnalysis: {
        name: 'waveform-analysis',
        test: /[\\/]src[\\/]services[\\/](WebAudioAnalyzer|VideoFrameAnalyzer|MetadataAnalyzer)/,
        priority: 25,
        chunks: 'all'
      },
      waveformInteraction: {
        name: 'waveform-interaction',
        test: /[\\/]src[\\/]components[\\/]waveform[\\/](InteractionManager|ZoomControls)/,
        priority: 20,
        chunks: 'all'
      },
      waveformAdvanced: {
        name: 'waveform-advanced',
        test: /[\\/]src[\\/](services|components)[\\/].*[\\/](VisualEnhancement|ZeroCrossing|SmartSnapping)/,
        priority: 15,
        chunks: 'async'
      },
      waveformFallback: {
        name: 'waveform-fallback',
        test: /[\\/]src[\\/]services[\\/](ProceduralGenerator|FallbackAnalysisChain)/,
        priority: 10,
        chunks: 'async'
      }
    }
  };
};

/**
 * Tree shaking optimization helpers
 */
export const optimizeTreeShaking = () => {
  // Mark side-effect-free modules
  const sideEffectFreeModules = [
    'src/services/ZeroCrossingDetector.js',
    'src/services/SmartSnapping.js',
    'src/utils/waveformMath.js',
    'src/utils/audioUtils.js'
  ];

  // Provide hints for unused code elimination
  const unusedCodeMarkers = {
    development: ['console.log', 'console.debug', 'debugger'],
    production: ['console.warn', 'console.info']
  };

  return {
    sideEffectFreeModules,
    unusedCodeMarkers,
    
    // Helper to mark functions as pure for better tree shaking
    markAsPure: (fn) => {
      if (process.env.NODE_ENV === 'production') {
        // Add /*#__PURE__*/ comment for webpack
        return fn;
      }
      return fn;
    }
  };
};

/**
 * Runtime performance optimization
 */
export const optimizeRuntime = () => {
  // Debounce expensive operations
  const debounce = (func, wait) => {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  };

  // Throttle high-frequency operations
  const throttle = (func, limit) => {
    let inThrottle;
    return function(...args) {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  };

  // Memoization for expensive calculations
  const memoize = (fn, keyGenerator = (...args) => JSON.stringify(args)) => {
    const cache = new Map();
    
    return (...args) => {
      const key = keyGenerator(...args);
      
      if (cache.has(key)) {
        return cache.get(key);
      }
      
      const result = fn(...args);
      cache.set(key, result);
      
      // Prevent memory leaks by limiting cache size
      if (cache.size > 100) {
        const firstKey = cache.keys().next().value;
        cache.delete(firstKey);
      }
      
      return result;
    };
  };

  return {
    debounce,
    throttle,
    memoize
  };
};