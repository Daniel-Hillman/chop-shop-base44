import React from 'react';

/**
 * Dynamic module loader for waveform services with intelligent caching
 */
class WaveformModuleLoader {
  constructor() {
    this.loadedModules = new Map();
    this.loadingPromises = new Map();
  }

  /**
   * Dynamically load waveform analysis modules based on requirements
   */
  async loadAnalysisModule(analysisType) {
    if (this.loadedModules.has(analysisType)) {
      return this.loadedModules.get(analysisType);
    }

    if (this.loadingPromises.has(analysisType)) {
      return this.loadingPromises.get(analysisType);
    }

    const loadPromise = this._loadModule(analysisType);
    this.loadingPromises.set(analysisType, loadPromise);

    try {
      const module = await loadPromise;
      this.loadedModules.set(analysisType, module);
      this.loadingPromises.delete(analysisType);
      return module;
    } catch (error) {
      this.loadingPromises.delete(analysisType);
      throw error;
    }
  }

  async _loadModule(analysisType) {
    switch (analysisType) {
      case 'webAudio':
        return (await import('./WebAudioAnalyzer')).WebAudioAnalyzer;
      
      case 'videoFrame':
        return (await import('./VideoFrameAnalyzer')).VideoFrameAnalyzer;
      
      case 'metadata':
        return (await import('./MetadataAnalyzer')).MetadataAnalyzer;
      
      case 'procedural':
        return (await import('./ProceduralGenerator')).ProceduralGenerator;
      
      case 'zeroCrossing':
        return (await import('./ZeroCrossingDetector')).ZeroCrossingDetector;
      
      case 'smartSnapping':
        return (await import('./SmartSnapping')).SmartSnapping;
      
      case 'performanceOptimizer':
        return (await import('./WaveformPerformanceOptimizer')).WaveformPerformanceOptimizer;
      
      default:
        throw new Error(`Unknown analysis type: ${analysisType}`);
    }
  }

  /**
   * Preload modules based on user preferences and system capabilities
   */
  async preloadModules(capabilities = {}) {
    const modulesToLoad = [];

    // Always load basic modules
    modulesToLoad.push('webAudio', 'metadata');

    // Load advanced modules based on capabilities
    if (capabilities.hasWebAudio) {
      modulesToLoad.push('zeroCrossing', 'smartSnapping');
    }

    if (capabilities.hasVideoAccess) {
      modulesToLoad.push('videoFrame');
    }

    if (capabilities.isHighPerformance) {
      modulesToLoad.push('performanceOptimizer');
    }

    // Load modules in parallel
    const loadPromises = modulesToLoad.map(type => 
      this.loadAnalysisModule(type).catch(error => {
        console.warn(`Failed to preload ${type} module:`, error);
        return null;
      })
    );

    await Promise.all(loadPromises);
    console.log('Preloaded waveform modules:', modulesToLoad);
  }

  /**
   * Get loaded module or return null if not loaded
   */
  getLoadedModule(analysisType) {
    return this.loadedModules.get(analysisType) || null;
  }

  /**
   * Clear module cache to free memory
   */
  clearCache() {
    this.loadedModules.clear();
    this.loadingPromises.clear();
  }

  /**
   * Get memory usage statistics
   */
  getMemoryStats() {
    return {
      loadedModules: this.loadedModules.size,
      loadingPromises: this.loadingPromises.size,
      moduleTypes: Array.from(this.loadedModules.keys())
    };
  }
}

// Singleton instance
export const waveformModuleLoader = new WaveformModuleLoader();

/**
 * Hook for using dynamic module loading in React components
 */
export const useWaveformModule = (analysisType) => {
  const [module, setModule] = React.useState(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState(null);

  React.useEffect(() => {
    let mounted = true;

    const loadModule = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const loadedModule = await waveformModuleLoader.loadAnalysisModule(analysisType);
        
        if (mounted) {
          setModule(loadedModule);
        }
      } catch (err) {
        if (mounted) {
          setError(err);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadModule();

    return () => {
      mounted = false;
    };
  }, [analysisType]);

  return { module, loading, error };
};