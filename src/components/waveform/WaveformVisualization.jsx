import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { EnhancedCanvasRenderer } from './EnhancedCanvasRenderer.js';
import { InteractionManager } from './InteractionManager.js';
import { PlayheadManager } from './PlayheadManager.js';
import WaveformPerformanceOptimizer from '../../services/WaveformPerformanceOptimizer.js';

/**
 * Core WaveformVisualization component with high-performance canvas rendering
 * Implements requirements: 1.1, 4.1, 4.4, 7.1, 7.2
 */
export default function WaveformVisualization({
  audioSource,
  waveformData,
  chops = [],
  currentTime = 0,
  isPlaying = false,
  onChopCreate,
  onChopUpdate,
  onTimeSeek,
  visualSettings = {},
  className = ''
}) {
  // Container reference for canvas renderer
  const containerRef = useRef(null);
  
  // Canvas renderer instance
  const rendererRef = useRef(null);
  
  // Interaction manager instance
  const interactionManagerRef = useRef(null);
  
  // Playhead manager instance for real-time synchronization
  const playheadManagerRef = useRef(null);
  
  // Performance optimizer instance
  const performanceOptimizerRef = useRef(null);

  // Component state
  const [isInitialized, setIsInitialized] = useState(false);
  const [selectedChopId, setSelectedChopId] = useState(null);
  const [hoveredChopId, setHoveredChopId] = useState(null);
  const [performanceMetrics, setPerformanceMetrics] = useState({});
  const [currentQualityLevel, setCurrentQualityLevel] = useState('high');

  // Animation frame reference for smooth updates (legacy - now handled by PlayheadManager)
  const animationFrameRef = useRef(null);

  /**
   * Initialize performance optimizer
   */
  const initializePerformanceOptimizer = useCallback(async () => {
    if (performanceOptimizerRef.current) return;
    
    try {
      performanceOptimizerRef.current = new WaveformPerformanceOptimizer({
        enableWebWorkers: visualSettings.enableWebWorkers !== false,
        enableCaching: visualSettings.enableCaching !== false,
        enableMemoryManagement: visualSettings.enableMemoryManagement !== false,
        enablePerformanceMonitoring: visualSettings.enablePerformanceMonitoring !== false,
        workerPoolSize: visualSettings.workerPoolSize || 2,
        targetFPS: visualSettings.targetFPS || 60,
        minFPS: visualSettings.minFPS || 30
      });
      
      await performanceOptimizerRef.current.initialize();
      
      // Set up performance callbacks
      if (performanceOptimizerRef.current.performanceMonitor) {
        performanceOptimizerRef.current.performanceMonitor.onQualityChange((event) => {
          setCurrentQualityLevel(event.newQuality);
          console.log(`Waveform quality changed to: ${event.newQuality}`);
        });
      }
      
      return true;
    } catch (error) {
      console.error('Failed to initialize performance optimizer:', error);
      return false;
    }
  }, [visualSettings]);

  /**
   * Initialize high-performance canvas renderer
   */
  const initializeRenderer = useCallback(() => {
    const container = containerRef.current;
    if (!container || rendererRef.current) return false;

    try {
      // Get adaptive settings from performance optimizer
      const adaptiveSettings = performanceOptimizerRef.current?.getAdaptiveSettings() || {};
      
      // Create enhanced renderer with visual enhancements and optimized settings
      rendererRef.current = new EnhancedCanvasRenderer(container, {
        enableViewportCulling: adaptiveSettings.enableViewportCulling !== false,
        enableBatching: adaptiveSettings.enableBatching !== false,
        renderQuality: adaptiveSettings.renderQuality || visualSettings.quality || 'high',
        enableAntialiasing: adaptiveSettings.enableAntialiasing !== false && visualSettings.antialiasing !== false,
        maxBatchSize: adaptiveSettings.maxBatchSize || 1000,
        // Visual enhancement options
        enableFrequencyColorCoding: visualSettings.enableFrequencyColorCoding !== false,
        enableAmplitudeColorCoding: visualSettings.enableAmplitudeColorCoding !== false,
        enableStructureDetection: visualSettings.enableStructureDetection !== false,
        enableAccessibilityMode: visualSettings.enableAccessibilityMode || false,
        enableHighContrastMode: visualSettings.enableHighContrastMode || false,
        colorScheme: visualSettings.colorScheme || 'default'
      });

      // Set audio duration if available
      if (waveformData?.duration) {
        const viewportManager = rendererRef.current.getViewportManager();
        viewportManager.setAudioDuration(waveformData.duration);
      }

      // Initialize interaction manager
      interactionManagerRef.current = new InteractionManager(rendererRef.current, {
        clickThreshold: 5,
        hoverDelay: 100,
        snapTolerance: 10,
        enableHover: true,
        enableClick: true,
        enableDrag: true
      });

      // Set interaction callbacks
      interactionManagerRef.current.setCallbacks({
        onChopCreate: onChopCreate,
        onChopUpdate: onChopUpdate,
        onTimeSeek: onTimeSeek,
        onHover: (element, x, y) => {
          // Update hover state for enhanced chop visualization
          if (element && element.type === 'chop-region') {
            setHoveredChopId(element.chopId);
          } else {
            setHoveredChopId(null);
          }
        }
      });

      // Initialize playhead manager for real-time synchronization
      playheadManagerRef.current = new PlayheadManager(rendererRef.current, {
        playheadColor: visualSettings.playheadColor || '#ef4444',
        playheadWidth: visualSettings.playheadWidth || 2,
        activeChopColor: visualSettings.activeChopColor || '#fbbf24',
        showTimeDisplay: visualSettings.showPlayheadTime !== false,
        animationQuality: visualSettings.animationQuality || 'high'
      });

      return true;
    } catch (error) {
      console.error('Failed to initialize canvas renderer:', error);
      return false;
    }
  }, [visualSettings, waveformData]);

  /**
   * Update viewport state for zoom and pan operations
   * Implements requirement 4.1 - zoom controls
   */
  const updateViewport = useCallback((updates) => {
    if (!rendererRef.current) return;
    
    const viewportManager = rendererRef.current.getViewportManager();
    
    if (updates.zoomLevel !== undefined) {
      viewportManager.setZoom(updates.zoomLevel, updates.centerTime);
    } else if (updates.centerTime !== undefined) {
      viewportManager.panToTime(updates.centerTime);
    }
  }, []);

  /**
   * Convert time to pixel position within current viewport
   */
  const timeToPixel = useCallback((time) => {
    if (!rendererRef.current) return 0;
    return rendererRef.current.getViewportManager().timeToPixel(time);
  }, []);

  /**
   * Convert pixel position to time within current viewport
   */
  const pixelToTime = useCallback((pixel) => {
    if (!rendererRef.current) return 0;
    return rendererRef.current.getViewportManager().pixelToTime(pixel);
  }, []);

  /**
   * Render all waveform elements using high-performance renderer
   */
  const renderWaveform = useCallback(() => {
    if (!rendererRef.current || !isInitialized) return;

    const renderer = rendererRef.current;
    
    // Record frame render start for performance monitoring
    if (performanceOptimizerRef.current?.performanceMonitor) {
      performanceOptimizerRef.current.performanceMonitor.frameRenderStart();
    }
    
    // Get adaptive settings for current performance level
    const adaptiveSettings = performanceOptimizerRef.current?.getAdaptiveSettings() || {};
    
    // Render waveform data if available
    if (waveformData) {
      renderer.renderWaveform(waveformData, {
        quality: adaptiveSettings.renderQuality || visualSettings.quality || 'high',
        topColor: visualSettings.topColor,
        centerColor: visualSettings.centerColor,
        bottomColor: visualSettings.bottomColor,
        strokeColor: visualSettings.strokeColor,
        waveformResolution: adaptiveSettings.waveformResolution || 1.0,
        enableAntialiasing: adaptiveSettings.enableAntialiasing !== false
      });
    }
    
    // Render chops with enhanced visualization
    if (chops.length > 0) {
      renderer.renderChops(chops, selectedChopId, {
        highlightSelected: true,
        hoveredChopId: hoveredChopId,
        activeChopId: null // TODO: Connect to playback state
      });
    }
    
    // Playhead rendering is now handled by PlayheadManager for smooth real-time sync
    // The PlayheadManager will automatically render when playback state changes
    
    // Render UI elements
    renderer.renderUI({
      showZoomIndicator: visualSettings.showZoomIndicator !== false,
      textColor: visualSettings.textColor,
      tickColor: visualSettings.tickColor
    });
    
    // Update performance metrics
    const rendererMetrics = renderer.getPerformanceMetrics();
    const optimizerMetrics = performanceOptimizerRef.current?.getPerformanceMetrics() || {};
    const combinedMetrics = { ...rendererMetrics, optimizer: optimizerMetrics };
    setPerformanceMetrics(combinedMetrics);
    
    // Record frame render end for performance monitoring
    if (performanceOptimizerRef.current?.performanceMonitor) {
      performanceOptimizerRef.current.performanceMonitor.frameRenderEnd();
    }
  }, [
    isInitialized, 
    waveformData, 
    chops, 
    selectedChopId, 
    hoveredChopId,
    currentTime, 
    isPlaying, 
    visualSettings,
    currentQualityLevel
  ]);

  /**
   * Handle container resize
   */
  const handleResize = useCallback(() => {
    if (!rendererRef.current) return;
    
    const container = containerRef.current;
    if (!container) return;
    
    const rect = container.getBoundingClientRect();
    rendererRef.current.resize(rect.width, rect.height);
  }, []);

  // Initialize component
  useEffect(() => {
    const initialize = async () => {
      // Initialize performance optimizer first
      await initializePerformanceOptimizer();
      
      // Then initialize renderer with optimized settings
      if (initializeRenderer()) {
        setIsInitialized(true);
      }
    };
    
    initialize();
  }, [initializePerformanceOptimizer, initializeRenderer]);

  // Handle window resize
  useEffect(() => {
    const resizeObserver = new ResizeObserver(handleResize);
    
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }
    
    return () => {
      resizeObserver.disconnect();
    };
  }, [handleResize]);

  // Render when dependencies change
  useEffect(() => {
    renderWaveform();
  }, [renderWaveform]);

  // Update interaction manager with current chops and waveform data
  useEffect(() => {
    if (interactionManagerRef.current) {
      interactionManagerRef.current.setCurrentChops(chops);
    }
    
    // Update playhead manager with chops for active highlighting
    if (playheadManagerRef.current) {
      playheadManagerRef.current.setChops(chops);
    }
  }, [chops]);

  // Update interaction manager with waveform data for zero-crossing detection
  useEffect(() => {
    if (interactionManagerRef.current && waveformData) {
      interactionManagerRef.current.setWaveformData(waveformData);
    }
  }, [waveformData]);

  // Real-time playback synchronization using PlayheadManager
  useEffect(() => {
    if (playheadManagerRef.current) {
      // Update playback state for smooth real-time synchronization
      playheadManagerRef.current.updatePlaybackState(currentTime, isPlaying);
    }
  }, [currentTime, isPlaying]);

  // Update playhead manager options when visual settings change
  useEffect(() => {
    if (playheadManagerRef.current) {
      playheadManagerRef.current.setOptions({
        playheadColor: visualSettings.playheadColor || '#ef4444',
        playheadWidth: visualSettings.playheadWidth || 2,
        activeChopColor: visualSettings.activeChopColor || '#fbbf24',
        showTimeDisplay: visualSettings.showPlayheadTime !== false,
        animationQuality: visualSettings.animationQuality || 'high'
      });
    }
  }, [visualSettings]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (playheadManagerRef.current) {
        playheadManagerRef.current.destroy();
        playheadManagerRef.current = null;
      }
      if (interactionManagerRef.current) {
        interactionManagerRef.current.destroy();
        interactionManagerRef.current = null;
      }
      if (rendererRef.current) {
        rendererRef.current.destroy();
        rendererRef.current = null;
      }
      if (performanceOptimizerRef.current) {
        performanceOptimizerRef.current.destroy();
        performanceOptimizerRef.current = null;
      }
    };
  }, []);

  // Handle chop selection
  const handleChopSelect = useCallback((chopId) => {
    setSelectedChopId(chopId);
    if (onChopUpdate) {
      onChopUpdate(chopId, { selected: true });
    }
  }, [onChopUpdate]);

  // Get viewport manager for external access
  const getViewportManager = useCallback(() => {
    return rendererRef.current?.getViewportManager();
  }, []);

  // Public API methods for external control
  const api = useMemo(() => ({
    setZoomLevel: (zoomLevel, centerTime) => {
      updateViewport({ zoomLevel, centerTime });
    },
    
    panToTime: (targetTime) => {
      updateViewport({ centerTime: targetTime });
    },
    
    zoomIn: (factor = 2, centerTime) => {
      if (rendererRef.current) {
        const viewportManager = rendererRef.current.getViewportManager();
        viewportManager.zoomIn(factor, centerTime);
      }
    },
    
    zoomOut: (factor = 2, centerTime) => {
      if (rendererRef.current) {
        const viewportManager = rendererRef.current.getViewportManager();
        viewportManager.zoomOut(factor, centerTime);
      }
    },
    
    zoomToFit: () => {
      if (rendererRef.current) {
        const viewportManager = rendererRef.current.getViewportManager();
        viewportManager.zoomToFit();
      }
    },
    
    getViewport: () => {
      if (rendererRef.current) {
        return rendererRef.current.getViewportManager().getState();
      }
      return null;
    },
    
    getViewportManager,
    
    getPerformanceMetrics: () => {
      const baseMetrics = performanceMetrics;
      const playheadMetrics = playheadManagerRef.current?.getPerformanceMetrics() || {};
      const optimizerMetrics = performanceOptimizerRef.current?.getPerformanceMetrics() || {};
      return { 
        ...baseMetrics, 
        playhead: playheadMetrics,
        optimizer: optimizerMetrics,
        currentQuality: currentQualityLevel
      };
    },
    
    getSyncStatus: () => {
      return playheadManagerRef.current?.getSyncStatus() || null;
    },
    
    jumpToTime: (time) => {
      if (playheadManagerRef.current) {
        playheadManagerRef.current.jumpToTime(time);
      }
      if (onTimeSeek) {
        onTimeSeek(time);
      }
    },
    
    setRenderQuality: (quality) => {
      if (rendererRef.current) {
        rendererRef.current.setRenderQuality(quality);
      }
      if (performanceOptimizerRef.current) {
        performanceOptimizerRef.current.setQualityLevel(quality);
      }
    },
    
    getPerformanceOptimizer: () => {
      return performanceOptimizerRef.current;
    },
    
    optimizeForLowEndDevice: () => {
      if (performanceOptimizerRef.current) {
        performanceOptimizerRef.current.optimizeForLowEndDevice();
      }
    },
    
    clearCaches: async () => {
      if (performanceOptimizerRef.current) {
        await performanceOptimizerRef.current.clearCaches();
      }
    },
    
    // Visual enhancement API methods
    getVisualEnhancementEngine: () => {
      return rendererRef.current?.getVisualEnhancementEngine();
    },
    
    updateVisualSettings: (newSettings) => {
      if (rendererRef.current && rendererRef.current.updateVisualSettings) {
        rendererRef.current.updateVisualSettings(newSettings);
        renderWaveform(); // Re-render with new settings
      }
    },
    
    getVisualSettings: () => {
      const engine = rendererRef.current?.getVisualEnhancementEngine();
      return engine ? engine.createVisualSettings() : null;
    },
    
    timeToPixel,
    pixelToTime,
    
    render: renderWaveform,
    
    selectChop: handleChopSelect
  }), [updateViewport, timeToPixel, pixelToTime, renderWaveform, handleChopSelect, performanceMetrics, getViewportManager]);

  return (
    <motion.div
      ref={containerRef}
      className={`relative w-full h-full bg-gray-900 rounded-lg overflow-hidden ${className}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {/* Canvas layers are created and managed by CanvasRenderer */}
      
      {/* Loading indicator */}
      {!isInitialized && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-white/70 text-sm">Initializing high-performance renderer...</div>
        </div>
      )}
      
      {/* Performance indicator (development only) */}
      {process.env.NODE_ENV === 'development' && performanceMetrics.averageFPS && (
        <div className="absolute top-2 right-2 text-xs text-white/50 font-mono space-y-1">
          <div>{Math.round(performanceMetrics.averageFPS)}fps</div>
          <div className={`text-xs ${
            currentQualityLevel === 'high' ? 'text-green-400' :
            currentQualityLevel === 'medium' ? 'text-yellow-400' :
            'text-red-400'
          }`}>
            {currentQualityLevel}
          </div>
          {performanceMetrics.optimizer?.cachePerformance && (
            <div>
              Cache: {Math.round(performanceMetrics.optimizer.cachePerformance.hitRate * 100)}%
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}

// Export the API for external components to control the waveform
export { WaveformVisualization };