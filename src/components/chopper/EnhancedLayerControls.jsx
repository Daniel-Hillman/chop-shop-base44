/**
 * Enhanced Layer Controls - Advanced UI controls with visual feedback and polish
 * 
 * Enhanced features over LayerControls:
 * - Real-time audio level meters with peak detection
 * - Advanced visual feedback for recording states
 * - Smooth animations and transitions
 * - Color-coded layer types with visual distinction
 * - Recording state indicators throughout the UI
 * - Quantization alignment visual feedback
 * - Professional mixer-style layout
 * - Enhanced accessibility and keyboard controls
 * 
 * Requirements: 2.5, 8.1, 8.2, 8.3, 8.5, 8.6, 4.2, 4.5, 6.6
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function EnhancedLayerControls({
  recordingEngine,
  className = '',
  compact = false,
  showMaster = true,
  showMeters = true,
  onLayerControlChange = null
}) {
  // Layer controls state with enhanced properties
  const [layerControls, setLayerControls] = useState({
    chops: { 
      volume: 1.0, 
      muted: false, 
      solo: false, 
      pan: 0.0, 
      enabled: true, 
      color: '#06b6d4',
      accentColor: '#0891b2',
      name: 'Chops',
      recording: false,
      hasContent: false,
      level: 0,
      peak: 0,
      clipCount: 0
    },
    drums: { 
      volume: 1.0, 
      muted: false, 
      solo: false, 
      pan: 0.0, 
      enabled: true, 
      color: '#8b5cf6',
      accentColor: '#7c3aed',
      name: 'Drums',
      recording: false,
      hasContent: false,
      level: 0,
      peak: 0,
      clipCount: 0
    }
  });

  // Master controls state with enhanced properties
  const [masterControls, setMasterControls] = useState({
    volume: 1.0,
    muted: false,
    soloActive: false,
    level: 0,
    peak: 0,
    clipCount: 0
  });

  // UI state
  const [dragState, setDragState] = useState(null);
  const [hoveredControl, setHoveredControl] = useState(null);
  const [keyboardFocus, setKeyboardFocus] = useState(null);
  
  // Animation refs
  const meterUpdateRef = useRef();
  const peakHoldTimers = useRef({});

  // Initialize and sync with recording engine
  useEffect(() => {
    if (!recordingEngine) return;

    const updateControls = () => {
      const layerControls = recordingEngine.getLayerControls();
      const masterControls = recordingEngine.getMasterControls();
      
      setLayerControls(prev => ({
        ...prev,
        ...Object.fromEntries(
          Object.entries(layerControls).map(([key, controls]) => [
            key,
            { ...prev[key], ...controls }
          ])
        )
      }));
      
      setMasterControls(prev => ({ ...prev, ...masterControls }));
    };

    // Subscribe to recording engine events
    const handleRecordingEvent = (event) => {
      if (event.type.includes('layer') || event.type.includes('master')) {
        updateControls();
        
        // Notify parent component
        if (onLayerControlChange) {
          onLayerControlChange(event);
        }
      }
    };

    recordingEngine.onRecordingEvent(handleRecordingEvent);
    updateControls(); // Initial sync

    return () => {
      recordingEngine.offRecordingEvent(handleRecordingEvent);
    };
  }, [recordingEngine, onLayerControlChange]);

  // Audio level monitoring
  useEffect(() => {
    if (!recordingEngine || !showMeters) return;

    const updateMeters = () => {
      const levels = recordingEngine.getAudioLevels();
      
      setLayerControls(prev => ({
        ...prev,
        chops: { 
          ...prev.chops, 
          level: levels.chops?.level || 0,
          peak: levels.chops?.peak || 0
        },
        drums: { 
          ...prev.drums, 
          level: levels.drums?.level || 0,
          peak: levels.drums?.peak || 0
        }
      }));
      
      setMasterControls(prev => ({
        ...prev,
        level: levels.master?.level || 0,
        peak: levels.master?.peak || 0
      }));

      // Handle peak hold timers
      Object.entries(levels).forEach(([layer, data]) => {
        if (data?.peak > 0.95) { // Clipping threshold
          if (peakHoldTimers.current[layer]) {
            clearTimeout(peakHoldTimers.current[layer]);
          }
          peakHoldTimers.current[layer] = setTimeout(() => {
            // Reset peak after hold time
          }, 2000);
        }
      });

      meterUpdateRef.current = requestAnimationFrame(updateMeters);
    };

    meterUpdateRef.current = requestAnimationFrame(updateMeters);

    return () => {
      if (meterUpdateRef.current) {
        cancelAnimationFrame(meterUpdateRef.current);
      }
      Object.values(peakHoldTimers.current).forEach(timer => clearTimeout(timer));
    };
  }, [recordingEngine, showMeters]);

  // Enhanced volume slider change handler with smooth interpolation
  const handleVolumeChange = useCallback((layer, volume, smooth = true) => {
    if (!recordingEngine) return;
    
    if (layer === 'master') {
      recordingEngine.setMasterVolume(volume, smooth);
    } else {
      recordingEngine.setLayerVolume(layer, volume, smooth);
    }
  }, [recordingEngine]);

  // Enhanced mute toggle with fade transition
  const handleMuteToggle = useCallback((layer) => {
    if (!recordingEngine) return;
    
    if (layer === 'master') {
      recordingEngine.toggleMasterMute(true); // with fade
    } else {
      recordingEngine.toggleLayerMute(layer, true); // with fade
    }
  }, [recordingEngine]);

  // Solo toggle handler with visual feedback
  const handleSoloToggle = useCallback((layer) => {
    if (!recordingEngine) return;
    recordingEngine.toggleLayerSolo(layer);
  }, [recordingEngine]);

  // Enhanced pan change handler with center detent
  const handlePanChange = useCallback((layer, pan) => {
    if (!recordingEngine) return;
    
    // Add center detent (snap to center when close)
    const centerDetent = 0.05;
    if (Math.abs(pan) < centerDetent) {
      pan = 0;
    }
    
    recordingEngine.setLayerPan(layer, pan);
  }, [recordingEngine]);

  // Enable toggle handler with smooth transition
  const handleEnableToggle = useCallback((layer) => {
    if (!recordingEngine) return;
    const currentState = recordingEngine.isLayerEnabled(layer);
    recordingEngine.setLayerEnabled(layer, !currentState, true); // with transition
  }, [recordingEngine]);

  // Reset layer controls with animation
  const handleResetLayer = useCallback((layer) => {
    if (!recordingEngine) return;
    recordingEngine.resetLayerControls(layer, true); // with animation
  }, [recordingEngine]);

  // Reset all controls with staggered animation
  const handleResetAll = useCallback(() => {
    if (!recordingEngine) return;
    recordingEngine.resetLayerControls(null, true); // all layers with animation
    recordingEngine.setMasterVolume(1.0, true);
    recordingEngine.setMasterMuted(false, true);
  }, [recordingEngine]);

  // Enhanced drag handlers with momentum and precision modes
  const handleSliderMouseDown = useCallback((type, layer, initialValue, e) => {
    const precision = e.shiftKey; // Shift for precision mode
    setDragState({ 
      type, 
      layer, 
      initialValue, 
      startY: e.clientY,
      precision,
      momentum: 0
    });
    e.preventDefault();
  }, []);

  const handleSliderMouseMove = useCallback((e) => {
    if (!dragState) return;
    
    const deltaY = dragState.startY - e.clientY;
    const sensitivity = dragState.precision ? 0.002 : 0.01; // Precision mode
    const momentum = deltaY * 0.1; // For smooth movement
    
    let newValue = dragState.initialValue + (deltaY * sensitivity);
    
    // Clamp values
    if (dragState.type === 'volume') {
      newValue = Math.max(0, Math.min(1, newValue));
      handleVolumeChange(dragState.layer, newValue, false);
    } else if (dragState.type === 'pan') {
      newValue = Math.max(-1, Math.min(1, newValue));
      handlePanChange(dragState.layer, newValue);
    }
    
    // Update momentum for smooth release
    setDragState(prev => ({ ...prev, momentum }));
  }, [dragState, handleVolumeChange, handlePanChange]);

  const handleSliderMouseUp = useCallback(() => {
    setDragState(null);
  }, []);

  // Keyboard controls
  const handleKeyDown = useCallback((e, layer, control) => {
    if (!keyboardFocus) return;
    
    const step = e.shiftKey ? 0.01 : 0.05; // Precision with Shift
    
    switch (e.key) {
      case 'ArrowUp':
        if (control === 'volume') {
          const currentVolume = layerControls[layer]?.volume || masterControls.volume;
          handleVolumeChange(layer, Math.min(1, currentVolume + step));
        }
        e.preventDefault();
        break;
      case 'ArrowDown':
        if (control === 'volume') {
          const currentVolume = layerControls[layer]?.volume || masterControls.volume;
          handleVolumeChange(layer, Math.max(0, currentVolume - step));
        }
        e.preventDefault();
        break;
      case 'ArrowLeft':
        if (control === 'pan') {
          const currentPan = layerControls[layer]?.pan || 0;
          handlePanChange(layer, Math.max(-1, currentPan - step));
        }
        e.preventDefault();
        break;
      case 'ArrowRight':
        if (control === 'pan') {
          const currentPan = layerControls[layer]?.pan || 0;
          handlePanChange(layer, Math.min(1, currentPan + step));
        }
        e.preventDefault();
        break;
      case ' ':
        if (control === 'mute') {
          handleMuteToggle(layer);
        }
        e.preventDefault();
        break;
      case 'Enter':
        if (control === 'solo') {
          handleSoloToggle(layer);
        }
        e.preventDefault();
        break;
    }
  }, [keyboardFocus, layerControls, masterControls, handleVolumeChange, handlePanChange, handleMuteToggle, handleSoloToggle]);

  // Add global mouse event listeners for dragging
  useEffect(() => {
    if (!dragState) return;

    document.addEventListener('mousemove', handleSliderMouseMove);
    document.addEventListener('mouseup', handleSliderMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleSliderMouseMove);
      document.removeEventListener('mouseup', handleSliderMouseUp);
    };
  }, [dragState, handleSliderMouseMove, handleSliderMouseUp]);

  // Enhanced audio level meter component
  const renderAudioMeter = (level, peak, clipCount, vertical = true) => {
    const segments = 20;
    const segmentHeight = vertical ? 100 / segments : 100 / segments;
    
    return (
      <div className={`relative ${vertical ? 'w-3 h-20' : 'h-3 w-20'} bg-gray-800 rounded-sm overflow-hidden`}>
        {/* Meter segments */}
        {Array.from({ length: segments }).map((_, i) => {
          const segmentLevel = (i + 1) / segments;
          const isActive = level >= segmentLevel;
          const isPeak = peak >= segmentLevel && peak < segmentLevel + (1 / segments);
          
          let segmentColor = '#22c55e'; // Green
          if (segmentLevel > 0.7) segmentColor = '#eab308'; // Yellow
          if (segmentLevel > 0.9) segmentColor = '#ef4444'; // Red
          
          return (
            <motion.div
              key={i}
              className={`absolute ${vertical ? 'w-full' : 'h-full'}`}
              style={{
                [vertical ? 'bottom' : 'left']: `${i * segmentHeight}%`,
                [vertical ? 'height' : 'width']: `${segmentHeight - 1}%`,
                backgroundColor: isActive ? segmentColor : 'transparent',
                opacity: isPeak ? 1 : isActive ? 0.8 : 0.2
              }}
              animate={{
                opacity: isPeak ? [0.8, 1, 0.8] : isActive ? 0.8 : 0.2,
                scale: isPeak ? [1, 1.1, 1] : 1
              }}
              transition={{
                duration: isPeak ? 0.1 : 0.05,
                repeat: isPeak ? 2 : 0
              }}
            />
          );
        })}
        
        {/* Clip indicator */}
        {clipCount > 0 && (
          <motion.div
            className="absolute top-0 left-0 w-full h-1 bg-red-500"
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ duration: 0.5, repeat: Infinity }}
          />
        )}
      </div>
    );
  };

  // Enhanced volume slider with better visual feedback
  const renderEnhancedVolumeSlider = (layer, volume, label, controls) => (
    <div className="flex flex-col items-center gap-2">
      <label className="text-xs text-gray-300 font-medium">{label}</label>
      
      {/* Audio meter */}
      {showMeters && renderAudioMeter(controls?.level || 0, controls?.peak || 0, controls?.clipCount || 0)}
      
      <div className="relative group">
        <div 
          className={`w-6 h-24 bg-gray-700 rounded-full cursor-pointer border-2 transition-all duration-200 ${
            hoveredControl === `${layer}-volume` ? 'border-blue-400 shadow-lg shadow-blue-400/20' : 'border-gray-600'
          }`}
          onMouseDown={(e) => handleSliderMouseDown('volume', layer, volume, e)}
          onMouseEnter={() => setHoveredControl(`${layer}-volume`)}
          onMouseLeave={() => setHoveredControl(null)}
          onFocus={() => setKeyboardFocus(`${layer}-volume`)}
          onBlur={() => setKeyboardFocus(null)}
          onKeyDown={(e) => handleKeyDown(e, layer, 'volume')}
          tabIndex={0}
          role="slider"
          aria-label={`${label} volume`}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(volume * 100)}
        >
          {/* Volume fill with gradient */}
          <div 
            className="absolute bottom-0 w-full rounded-full transition-all duration-150"
            style={{ 
              height: `${volume * 100}%`,
              background: `linear-gradient(to top, ${controls?.color || '#06b6d4'}, ${controls?.accentColor || '#0891b2'})`
            }}
          />
          
          {/* Slider handle */}
          <motion.div 
            className="absolute w-8 h-4 bg-white border-2 border-gray-300 rounded-md cursor-grab active:cursor-grabbing shadow-lg"
            style={{ 
              bottom: `${volume * 100}%`,
              left: '50%',
              transform: 'translateX(-50%) translateY(50%)'
            }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            animate={{
              borderColor: hoveredControl === `${layer}-volume` ? '#60a5fa' : '#d1d5db'
            }}
          />
          
          {/* Recording indicator */}
          {controls?.recording && (
            <motion.div
              className="absolute -top-2 -right-2 w-3 h-3 bg-red-500 rounded-full"
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ duration: 0.8, repeat: Infinity }}
            />
          )}
        </div>
        
        {/* Value display */}
        <div className="text-xs text-center text-gray-300 mt-2 font-mono">
          {Math.round(volume * 100)}
        </div>
        
        {/* Tooltip on hover */}
        <AnimatePresence>
          {hoveredControl === `${layer}-volume` && (
            <motion.div
              className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded shadow-lg z-10"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 5 }}
            >
              {Math.round(volume * 100)}% • Shift+drag for precision
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );  //
 Enhanced pan knob with visual feedback
  const renderEnhancedPanKnob = (layer, pan, controls) => (
    <div className="flex flex-col items-center gap-2">
      <label className="text-xs text-gray-300 font-medium">Pan</label>
      <div className="relative group">
        <div 
          className={`w-10 h-10 bg-gray-700 rounded-full cursor-pointer border-2 transition-all duration-200 ${
            hoveredControl === `${layer}-pan` ? 'border-blue-400 shadow-lg shadow-blue-400/20' : 'border-gray-600'
          }`}
          onMouseDown={(e) => handleSliderMouseDown('pan', layer, pan, e)}
          onMouseEnter={() => setHoveredControl(`${layer}-pan`)}
          onMouseLeave={() => setHoveredControl(null)}
          onFocus={() => setKeyboardFocus(`${layer}-pan`)}
          onBlur={() => setKeyboardFocus(null)}
          onKeyDown={(e) => handleKeyDown(e, layer, 'pan')}
          tabIndex={0}
          role="slider"
          aria-label={`${layer} pan`}
          aria-valuemin={-100}
          aria-valuemax={100}
          aria-valuenow={Math.round(pan * 100)}
        >
          {/* Pan indicator line */}
          <motion.div 
            className="absolute w-1 h-4 bg-white rounded-full top-1 left-1/2 transform -translate-x-1/2 origin-bottom transition-transform duration-150 shadow-sm"
            style={{ 
              transform: `translateX(-50%) rotate(${pan * 45}deg)`,
              backgroundColor: Math.abs(pan) > 0.1 ? (controls?.color || '#06b6d4') : '#ffffff'
            }}
            animate={{
              scale: hoveredControl === `${layer}-pan` ? 1.1 : 1
            }}
          />
          
          {/* Center dot */}
          <div className="absolute w-2 h-2 bg-gray-400 rounded-full top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
          
          {/* Pan range indicators */}
          <div className="absolute inset-0 rounded-full">
            <div className="absolute w-0.5 h-2 bg-gray-500 top-0 left-1/2 transform -translate-x-1/2" />
            <div className="absolute w-0.5 h-2 bg-gray-500 top-0 left-2 transform rotate-45 origin-bottom" />
            <div className="absolute w-0.5 h-2 bg-gray-500 top-0 right-2 transform -rotate-45 origin-bottom" />
          </div>
        </div>
        
        {/* Value display */}
        <div className="text-xs text-center text-gray-300 mt-2 font-mono">
          {pan === 0 ? 'C' : pan < 0 ? `L${Math.abs(Math.round(pan * 100))}` : `R${Math.round(pan * 100)}`}
        </div>
        
        {/* Tooltip on hover */}
        <AnimatePresence>
          {hoveredControl === `${layer}-pan` && (
            <motion.div
              className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded shadow-lg z-10"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 5 }}
            >
              {pan === 0 ? 'Center' : pan < 0 ? `Left ${Math.abs(Math.round(pan * 100))}%` : `Right ${Math.round(pan * 100)}%`}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );

  // Enhanced button component with better visual feedback
  const renderEnhancedButton = (label, active, onClick, variant = 'default', disabled = false, recording = false) => {
    const variants = {
      mute: {
        active: 'bg-red-600 text-white shadow-lg shadow-red-600/30',
        inactive: 'bg-gray-600 text-gray-300 hover:bg-gray-500'
      },
      solo: {
        active: 'bg-yellow-600 text-white shadow-lg shadow-yellow-600/30',
        inactive: 'bg-gray-600 text-gray-300 hover:bg-gray-500'
      },
      enable: {
        active: 'bg-green-600 text-white shadow-lg shadow-green-600/30',
        inactive: 'bg-gray-600 text-gray-300 hover:bg-gray-500'
      },
      default: {
        active: 'bg-blue-600 text-white shadow-lg shadow-blue-600/30',
        inactive: 'bg-gray-600 text-gray-300 hover:bg-gray-500'
      }
    };

    return (
      <motion.button
        onClick={onClick}
        disabled={disabled}
        className={`relative px-3 py-1.5 text-xs font-bold rounded transition-all duration-200 ${
          active ? variants[variant].active : variants[variant].inactive
        } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        whileHover={!disabled ? { scale: 1.05 } : {}}
        whileTap={!disabled ? { scale: 0.95 } : {}}
        animate={{
          boxShadow: active ? '0 0 20px rgba(59, 130, 246, 0.3)' : '0 0 0px rgba(59, 130, 246, 0)'
        }}
      >
        {label}
        
        {/* Recording indicator */}
        {recording && (
          <motion.div
            className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full"
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ duration: 0.6, repeat: Infinity }}
          />
        )}
        
        {/* Active state glow */}
        {active && (
          <motion.div
            className="absolute inset-0 rounded bg-white opacity-20"
            animate={{ opacity: [0.2, 0.1, 0.2] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        )}
      </motion.button>
    );
  };

  // Enhanced layer control strip with better layout and animations
  const renderEnhancedLayerStrip = (layerName, controls) => (
    <motion.div
      key={layerName}
      className={`relative p-4 bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl border transition-all duration-300 ${
        controls.enabled 
          ? `border-gray-600 shadow-lg ${controls.recording ? 'shadow-red-500/20' : ''}` 
          : 'border-gray-700 opacity-60'
      }`}
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ 
        opacity: 1, 
        y: 0, 
        scale: 1,
        borderColor: controls.recording ? '#ef4444' : controls.enabled ? '#4b5563' : '#374151'
      }}
      transition={{ duration: 0.3, type: 'spring', stiffness: 100 }}
      whileHover={{ scale: 1.02 }}
    >
      {/* Recording state overlay */}
      {controls.recording && (
        <motion.div
          className="absolute inset-0 rounded-xl bg-red-500 opacity-5"
          animate={{ opacity: [0.05, 0.1, 0.05] }}
          transition={{ duration: 1, repeat: Infinity }}
        />
      )}

      {/* Layer header with enhanced visual feedback */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          {/* Layer type indicator */}
          <motion.div 
            className={`w-5 h-5 ${layerName === 'chops' ? 'rounded-sm' : 'rounded-full'} border-2 relative overflow-hidden`}
            style={{ 
              backgroundColor: controls.enabled ? controls.color : 'transparent',
              borderColor: controls.enabled ? controls.color : '#6b7280'
            }}
            animate={{
              scale: controls.recording ? [1, 1.2, 1] : 1,
              rotate: controls.recording ? [0, 5, -5, 0] : 0
            }}
            transition={{ 
              duration: controls.recording ? 0.5 : 0.2,
              repeat: controls.recording ? Infinity : 0
            }}
          >
            {/* Content indicator */}
            {controls.hasContent && (
              <motion.div
                className="absolute inset-1 bg-white rounded-full opacity-80"
                animate={{ opacity: [0.8, 0.4, 0.8] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
            )}
          </motion.div>
          
          <div>
            <h4 className="text-sm font-semibold text-white">{controls.name}</h4>
            <div className="text-xs text-gray-400">
              {controls.recording ? 'Recording...' : controls.hasContent ? 'Has content' : 'Empty'}
            </div>
          </div>
        </div>
        
        {/* Enable toggle with enhanced feedback */}
        {renderEnhancedButton(
          controls.enabled ? 'ON' : 'OFF',
          controls.enabled,
          () => handleEnableToggle(layerName),
          'enable',
          false,
          controls.recording
        )}
      </div>

      {/* Controls section */}
      {controls.enabled && (
        <motion.div 
          className={`grid ${compact ? 'grid-cols-4 gap-3' : 'grid-cols-3 gap-4'} items-start`}
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.3 }}
        >
          {/* Volume slider with meter */}
          {renderEnhancedVolumeSlider(layerName, controls.volume, 'Volume', controls)}

          {/* Pan knob */}
          {!compact && renderEnhancedPanKnob(layerName, controls.pan, controls)}

          {/* Control buttons */}
          <div className="flex flex-col gap-3">
            {renderEnhancedButton(
              'MUTE',
              controls.muted,
              () => handleMuteToggle(layerName),
              'mute',
              false,
              controls.recording
            )}
            
            {renderEnhancedButton(
              'SOLO',
              controls.solo,
              () => handleSoloToggle(layerName),
              'solo',
              false,
              controls.recording
            )}
          </div>

          {/* Additional controls */}
          <div className="flex flex-col gap-2">
            <button
              onClick={() => handleResetLayer(layerName)}
              className="px-2 py-1 text-xs text-gray-400 hover:text-white border border-gray-600 rounded hover:border-gray-400 transition-all duration-200"
            >
              Reset
            </button>
            
            {/* Layer stats */}
            <div className="text-xs text-gray-500 space-y-1">
              <div>Vol: {Math.round(controls.volume * 100)}%</div>
              {Math.abs(controls.pan) > 0.01 && (
                <div>Pan: {controls.pan < 0 ? 'L' : 'R'}{Math.abs(Math.round(controls.pan * 100))}</div>
              )}
            </div>
          </div>
        </motion.div>
      )}

      {/* Quantization alignment indicator */}
      {controls.recording && (
        <motion.div
          className="absolute bottom-2 right-2 flex items-center gap-1 text-xs text-green-400"
          animate={{ opacity: [0.7, 1, 0.7] }}
          transition={{ duration: 0.8, repeat: Infinity }}
        >
          <div className="w-2 h-2 bg-green-400 rounded-full" />
          <span>Quantized</span>
        </motion.div>
      )}
    </motion.div>
  );

  // Loading state
  if (!recordingEngine) {
    return (
      <div className={`p-6 bg-gray-800 rounded-xl border border-gray-700 ${className}`}>
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-3" />
          <div className="text-gray-400">Initializing enhanced layer controls...</div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl border border-gray-700 shadow-2xl ${className}`}>
      {/* Enhanced header with status indicators */}
      <div className="flex items-center justify-between p-4 border-b border-gray-700 bg-gray-800/50">
        <div className="flex items-center gap-3">
          <h3 className="text-white font-semibold text-lg">Enhanced Layer Controls</h3>
          
          {/* Status indicators */}
          <div className="flex items-center gap-2">
            {Object.values(layerControls).some(c => c.recording) && (
              <motion.div 
                className="flex items-center gap-1 text-red-400 text-sm"
                animate={{ opacity: [0.7, 1, 0.7] }}
                transition={{ duration: 0.8, repeat: Infinity }}
              >
                <div className="w-2 h-2 bg-red-400 rounded-full" />
                <span>Recording</span>
              </motion.div>
            )}
            
            {masterControls.soloActive && (
              <motion.div 
                className="flex items-center gap-1 text-yellow-400 text-sm"
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
              >
                <div className="w-2 h-2 bg-yellow-400 rounded-full" />
                <span>Solo Active</span>
              </motion.div>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Compact mode toggle */}
          <button
            onClick={() => {/* Toggle compact mode */}}
            className="px-3 py-1 text-xs text-gray-400 hover:text-white border border-gray-600 rounded hover:border-gray-400 transition-all duration-200"
          >
            {compact ? 'Expand' : 'Compact'}
          </button>
          
          {/* Reset all button */}
          <motion.button
            onClick={handleResetAll}
            className="px-3 py-1 text-xs text-gray-400 hover:text-white border border-gray-600 rounded hover:border-gray-400 transition-all duration-200"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Reset All
          </motion.button>
        </div>
      </div>

      {/* Layer controls with enhanced layout */}
      <div className="p-6">
        <div className={`grid ${compact ? 'grid-cols-2' : 'grid-cols-1'} gap-6`}>
          <AnimatePresence>
            {Object.entries(layerControls).map(([layerName, controls]) =>
              renderEnhancedLayerStrip(layerName, controls)
            )}
          </AnimatePresence>
        </div>

        {/* Enhanced master controls */}
        {showMaster && (
          <motion.div
            className="mt-8 p-4 bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl border border-gray-600 shadow-lg"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 bg-gradient-to-br from-blue-500 to-purple-600 rounded border-2 border-blue-400" />
                <h4 className="text-lg font-semibold text-white">Master</h4>
              </div>
              
              <div className="flex items-center gap-3">
                {renderEnhancedButton(
                  'MASTER MUTE',
                  masterControls.muted,
                  () => handleMuteToggle('master'),
                  'mute'
                )}
              </div>
            </div>
            
            <div className="flex items-center justify-center gap-6">
              {renderEnhancedVolumeSlider('master', masterControls.volume, 'Master Volume', masterControls)}
              
              {/* Master level display */}
              <div className="text-center">
                <div className="text-xs text-gray-400 mb-2">Output Level</div>
                <div className="text-2xl font-mono text-white">
                  {Math.round(masterControls.level * 100)}%
                </div>
                {masterControls.peak > 0.95 && (
                  <div className="text-xs text-red-400 mt-1">CLIP!</div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Enhanced status bar with more information */}
      <div className="px-6 py-3 border-t border-gray-700 bg-gray-800/30">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-4 text-gray-400">
            <div>
              Layers: {Object.values(layerControls).filter(c => c.enabled).length}/2 enabled
            </div>
            <div>
              Recording: {Object.values(layerControls).filter(c => c.recording).length} active
            </div>
            <div>
              Content: {Object.values(layerControls).filter(c => c.hasContent).length} layers
            </div>
          </div>
          <div className="flex items-center gap-4 text-gray-400">
            <div>
              Master: {Math.round(masterControls.volume * 100)}%
              {masterControls.muted && ' (MUTED)'}
            </div>
            {showMeters && (
              <div>
                Peak: {Math.round(masterControls.peak * 100)}%
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}