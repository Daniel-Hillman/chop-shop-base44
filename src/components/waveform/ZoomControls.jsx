import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Zoom and Navigation Controls for Waveform Visualization
 * Implements requirements: 4.1, 4.2, 4.3, 4.4
 */
export default function ZoomControls({
  viewportManager,
  className = '',
  showPresets = true,
  showNavigationInfo = true,
  compact = false
}) {
  const [viewport, setViewport] = useState(null);
  const [navigationInfo, setNavigationInfo] = useState(null);
  const [zoomPresets, setZoomPresets] = useState([]);
  const [isExpanded, setIsExpanded] = useState(!compact);

  // Update viewport state when viewport changes
  useEffect(() => {
    if (!viewportManager) return;

    const updateViewport = (newViewport) => {
      setViewport(newViewport);
      setNavigationInfo(viewportManager.getNavigationInfo());
      setZoomPresets(viewportManager.getZoomPresets());
    };

    // Initial state
    updateViewport(viewportManager.getState());

    // Listen for changes
    const unsubscribe = viewportManager.addListener(updateViewport);
    return unsubscribe;
  }, [viewportManager]);

  // Zoom controls
  const handleZoomIn = useCallback(() => {
    if (viewportManager) {
      viewportManager.zoomIn(1.5);
    }
  }, [viewportManager]);

  const handleZoomOut = useCallback(() => {
    if (viewportManager) {
      viewportManager.zoomOut(1.5);
    }
  }, [viewportManager]);

  const handleZoomToFit = useCallback(() => {
    if (viewportManager) {
      viewportManager.zoomToFit();
    }
  }, [viewportManager]);

  const handleZoomPreset = useCallback((preset) => {
    if (viewportManager && viewport) {
      viewportManager.setZoom(preset.zoomLevel, viewport.centerTime);
    }
  }, [viewportManager, viewport]);

  // Navigation controls
  const handlePanLeft = useCallback(() => {
    if (viewportManager && viewport) {
      const visibleDuration = viewport.visibleTimeRange.end - viewport.visibleTimeRange.start;
      const panDistance = visibleDuration * 0.25;
      viewportManager.panToTime(viewport.centerTime - panDistance);
    }
  }, [viewportManager, viewport]);

  const handlePanRight = useCallback(() => {
    if (viewportManager && viewport) {
      const visibleDuration = viewport.visibleTimeRange.end - viewport.visibleTimeRange.start;
      const panDistance = visibleDuration * 0.25;
      viewportManager.panToTime(viewport.centerTime + panDistance);
    }
  }, [viewportManager, viewport]);

  const handleGoToStart = useCallback(() => {
    if (viewportManager) {
      viewportManager.panToTime(0);
    }
  }, [viewportManager]);

  const handleGoToEnd = useCallback(() => {
    if (viewportManager && viewport) {
      viewportManager.panToTime(viewport.audioDuration);
    }
  }, [viewportManager, viewport]);

  if (!viewport || !navigationInfo) {
    return null;
  }

  const formatTime = (time) => {
    const minutes = Math.floor(time / 60);
    const seconds = (time % 60).toFixed(2);
    return `${minutes}:${seconds.padStart(5, '0')}`;
  };

  const formatZoom = (zoom) => {
    if (zoom >= 1) {
      return `${zoom.toFixed(1)}x`;
    } else {
      return `1:${(1/zoom).toFixed(1)}`;
    }
  };

  return (
    <motion.div
      className={`bg-gray-800 border border-gray-700 rounded-lg p-3 ${className}`}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      {/* Main Controls */}
      <div className="flex items-center gap-2 mb-2">
        {/* Zoom Controls */}
        <div className="flex items-center gap-1">
          <button
            onClick={handleZoomOut}
            disabled={!navigationInfo.canZoomOut}
            className="p-1.5 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-500 
                     text-white rounded transition-colors text-sm font-mono"
            title="Zoom Out (Ctrl+-)"
          >
            −
          </button>
          
          <div className="px-2 py-1 bg-gray-900 text-white text-xs font-mono rounded min-w-[50px] text-center">
            {formatZoom(viewport.zoomLevel)}
          </div>
          
          <button
            onClick={handleZoomIn}
            disabled={!navigationInfo.canZoomIn}
            className="p-1.5 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-500 
                     text-white rounded transition-colors text-sm font-mono"
            title="Zoom In (Ctrl++)"
          >
            +
          </button>
          
          <button
            onClick={handleZoomToFit}
            className="px-2 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded transition-colors text-xs"
            title="Zoom to Fit (Ctrl+0)"
          >
            Fit
          </button>
        </div>

        {/* Navigation Controls */}
        <div className="flex items-center gap-1 ml-2">
          <button
            onClick={handleGoToStart}
            disabled={!navigationInfo.canPanLeft}
            className="p-1.5 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-500 
                     text-white rounded transition-colors text-sm"
            title="Go to Start (Home)"
          >
            ⏮
          </button>
          
          <button
            onClick={handlePanLeft}
            disabled={!navigationInfo.canPanLeft}
            className="p-1.5 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-500 
                     text-white rounded transition-colors text-sm"
            title="Pan Left (←)"
          >
            ◀
          </button>
          
          <button
            onClick={handlePanRight}
            disabled={!navigationInfo.canPanRight}
            className="p-1.5 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-500 
                     text-white rounded transition-colors text-sm"
            title="Pan Right (→)"
          >
            ▶
          </button>
          
          <button
            onClick={handleGoToEnd}
            disabled={!navigationInfo.canPanRight}
            className="p-1.5 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-500 
                     text-white rounded transition-colors text-sm"
            title="Go to End (End)"
          >
            ⏭
          </button>
        </div>

        {/* Expand/Collapse Toggle */}
        {compact && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors text-sm ml-auto"
            title={isExpanded ? "Collapse" : "Expand"}
          >
            {isExpanded ? '▼' : '▲'}
          </button>
        )}
      </div>

      {/* Expanded Controls */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            {/* Navigation Info */}
            {showNavigationInfo && (
              <div className="mb-3 p-2 bg-gray-900 rounded text-xs">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-gray-400">Visible Range:</span>
                  <span className="text-white font-mono">
                    {formatTime(viewport.visibleTimeRange.start)} - {formatTime(viewport.visibleTimeRange.end)}
                  </span>
                </div>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-gray-400">Duration:</span>
                  <span className="text-white font-mono">
                    {formatTime(viewport.visibleTimeRange.end - viewport.visibleTimeRange.start)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Detail Level:</span>
                  <span className="text-white capitalize">{navigationInfo.detailLevel}</span>
                </div>
                
                {/* Progress Bar */}
                <div className="mt-2">
                  <div className="w-full bg-gray-700 rounded-full h-1.5">
                    <div 
                      className="bg-blue-500 h-1.5 rounded-full transition-all duration-200"
                      style={{
                        width: `${navigationInfo.visiblePercentage}%`,
                        marginLeft: `${navigationInfo.startPercentage}%`
                      }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-gray-400 mt-1">
                    <span>0:00</span>
                    <span>{viewport.audioDuration ? formatTime(viewport.audioDuration) : '--:--'}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Zoom Presets */}
            {showPresets && zoomPresets.length > 0 && (
              <div>
                <div className="text-xs text-gray-400 mb-2">Quick Zoom:</div>
                <div className="flex flex-wrap gap-1">
                  {zoomPresets.map((preset, index) => (
                    <button
                      key={index}
                      onClick={() => handleZoomPreset(preset)}
                      className={`px-2 py-1 text-xs rounded transition-colors ${
                        Math.abs(preset.zoomLevel - viewport.zoomLevel) < 0.1
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                      }`}
                      title={preset.description}
                    >
                      {preset.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Keyboard Shortcuts Help */}
            <div className="mt-3 pt-2 border-t border-gray-700">
              <div className="text-xs text-gray-400 mb-1">Keyboard Shortcuts:</div>
              <div className="grid grid-cols-2 gap-1 text-xs text-gray-500">
                <div>Ctrl + / - : Zoom</div>
                <div>← / → : Pan</div>
                <div>Ctrl + 0 : Fit All</div>
                <div>Home / End : Go to Start/End</div>
                <div>Ctrl + 1/2/5 : Zoom Presets</div>
                <div>Shift + ← / → : Large Pan</div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}