/**
 * Loop Controls Component - Main control interface for MPC-style sequencer workflow
 * 
 * Features:
 * - Loop length selector (2-bar/4-bar toggle)
 * - Record/stop/play controls for the looper
 * - Clear layer functionality for individual layers
 * - Loop reset and new loop creation
 * - MPC-style workflow: BPM → quantization → record chops → switch mode → record drums
 * 
 * Requirements: 5.1, 5.2, 6.1, 6.2, 6.3, 6.4, 6.5
 */

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Play, 
  Square, 
  Circle, 
  RotateCcw, 
  Trash2, 
  Plus,
  Clock,
  Layers,
  Music,
  Drum
} from 'lucide-react';

// Simple Button component for this implementation
const Button = ({ children, onClick, variant = 'default', size = 'default', className = '', disabled = false, ...props }) => {
  const baseClasses = 'inline-flex items-center justify-center rounded-md font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none';
  const variantClasses = {
    default: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500',
    destructive: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
    outline: 'border border-gray-300 bg-transparent hover:bg-gray-50 focus:ring-gray-500',
    secondary: 'bg-gray-600 text-white hover:bg-gray-700 focus:ring-gray-500',
    ghost: 'bg-transparent hover:bg-gray-100 focus:ring-gray-500'
  };
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    default: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base'
  };
  
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

// Simple Badge component
const Badge = ({ children, variant = 'default', className = '' }) => {
  const baseClasses = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium';
  const variantClasses = {
    default: 'bg-gray-100 text-gray-800',
    outline: 'border border-gray-300 text-gray-700'
  };
  
  return (
    <span className={`${baseClasses} ${variantClasses[variant]} ${className}`}>
      {children}
    </span>
  );
};

export default function LoopControls({
  loopEngine,
  recordingEngine,
  modeManager,
  className = '',
  onStateChange = null
}) {
  // Loop state
  const [loopState, setLoopState] = useState({
    bars: 4,
    isRecording: false,
    isPlaying: false,
    currentPosition: 0,
    loopDuration: 0
  });

  // Recording state
  const [recordingState, setRecordingState] = useState({
    activeLayer: null,
    hasChops: false,
    hasDrums: false,
    totalEvents: 0
  });

  // Mode state
  const [currentMode, setCurrentMode] = useState('sample');

  // UI state
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [lastAction, setLastAction] = useState(null);

  // Initialize and sync with engines
  useEffect(() => {
    if (!loopEngine || !recordingEngine || !modeManager) return;

    const updateLoopState = () => {
      const state = loopEngine.getLoopState();
      setLoopState({
        bars: state.bars,
        isRecording: state.isRecording,
        isPlaying: state.isPlaying,
        currentPosition: state.currentPosition,
        loopDuration: state.loopDuration
      });
    };

    const updateRecordingState = () => {
      const chopsCount = recordingEngine.getLayerEventCount('chops');
      const drumsCount = recordingEngine.getLayerEventCount('drums');
      const activeLayer = recordingEngine.getActiveLayer();
      
      setRecordingState({
        activeLayer,
        hasChops: chopsCount > 0,
        hasDrums: drumsCount > 0,
        totalEvents: chopsCount + drumsCount
      });
    };

    const updateModeState = () => {
      setCurrentMode(modeManager.getMode());
    };

    // Setup event listeners
    const handleLoopEvent = (event) => {
      updateLoopState();
      if (onStateChange) {
        onStateChange({ type: 'loop', ...event });
      }
    };

    const handleRecordingEvent = (event) => {
      updateRecordingState();
      if (onStateChange) {
        onStateChange({ type: 'recording', ...event });
      }
    };

    const handleModeChange = (event) => {
      updateModeState();
      if (onStateChange) {
        onStateChange({ type: 'mode', ...event });
      }
    };

    // Subscribe to engine events
    loopEngine.onPositionUpdate(handleLoopEvent);
    recordingEngine.onRecordingEvent(handleRecordingEvent);
    modeManager.onModeChange(handleModeChange);

    // Initial sync
    updateLoopState();
    updateRecordingState();
    updateModeState();

    return () => {
      // Cleanup listeners
      loopEngine.removePositionCallback(handleLoopEvent);
      recordingEngine.offRecordingEvent(handleRecordingEvent);
      modeManager.offModeChange(handleModeChange);
    };
  }, [loopEngine, recordingEngine, modeManager, onStateChange]);

  // Handle loop length change (2-bar/4-bar toggle)
  const handleLoopLengthChange = useCallback(async (bars) => {
    if (!loopEngine || isTransitioning) return;

    setIsTransitioning(true);
    setLastAction(`Set ${bars}-bar loop`);

    try {
      loopEngine.setBars(bars);
      console.log(`🔄 Loop length changed to ${bars} bars`);
    } catch (error) {
      console.error('Failed to change loop length:', error);
    } finally {
      setIsTransitioning(false);
    }
  }, [loopEngine, isTransitioning]);

  // Handle record button
  const handleRecord = useCallback(async () => {
    if (!loopEngine || !recordingEngine || isTransitioning) return;

    setIsTransitioning(true);

    try {
      if (loopState.isRecording) {
        // Stop recording and switch to playback
        loopEngine.stopRecording();
        setLastAction('Recording stopped');
      } else {
        // Start recording
        const layer = currentMode === 'sample' ? 'chops' : 'drums';
        recordingEngine.startRecording(layer);
        loopEngine.startRecording();
        setLastAction(`Recording ${layer}`);
      }
    } catch (error) {
      console.error('Failed to toggle recording:', error);
    } finally {
      setIsTransitioning(false);
    }
  }, [loopEngine, recordingEngine, currentMode, loopState.isRecording, isTransitioning]);

  // Handle play button
  const handlePlay = useCallback(async () => {
    if (!loopEngine || isTransitioning) return;

    setIsTransitioning(true);

    try {
      if (loopState.isPlaying) {
        loopEngine.stop();
        setLastAction('Playback stopped');
      } else {
        loopEngine.play();
        setLastAction('Playback started');
      }
    } catch (error) {
      console.error('Failed to toggle playback:', error);
    } finally {
      setIsTransitioning(false);
    }
  }, [loopEngine, loopState.isPlaying, isTransitioning]);

  // Handle stop button
  const handleStop = useCallback(async () => {
    if (!loopEngine || isTransitioning) return;

    setIsTransitioning(true);
    setLastAction('Stopped');

    try {
      loopEngine.stop();
      if (recordingEngine.isRecording()) {
        recordingEngine.stopRecording();
      }
    } catch (error) {
      console.error('Failed to stop:', error);
    } finally {
      setIsTransitioning(false);
    }
  }, [loopEngine, recordingEngine, isTransitioning]);

  // Handle clear layer
  const handleClearLayer = useCallback(async (layer) => {
    if (!recordingEngine || isTransitioning) return;

    setIsTransitioning(true);
    setLastAction(`Cleared ${layer} layer`);

    try {
      const success = recordingEngine.clearLayer(layer);
      if (success) {
        console.log(`🗑️ Cleared ${layer} layer`);
      }
    } catch (error) {
      console.error(`Failed to clear ${layer} layer:`, error);
    } finally {
      setIsTransitioning(false);
    }
  }, [recordingEngine, isTransitioning]);

  // Handle loop reset
  const handleReset = useCallback(async () => {
    if (!loopEngine || isTransitioning) return;

    setIsTransitioning(true);
    setLastAction('Loop reset');

    try {
      loopEngine.reset();
    } catch (error) {
      console.error('Failed to reset loop:', error);
    } finally {
      setIsTransitioning(false);
    }
  }, [loopEngine, isTransitioning]);

  // Handle new loop creation
  const handleNewLoop = useCallback(async () => {
    if (!loopEngine || !recordingEngine || isTransitioning) return;

    setIsTransitioning(true);
    setLastAction('New loop created');

    try {
      // Stop current loop
      loopEngine.stop();
      
      // Clear all recorded events
      recordingEngine.clearAllEvents();
      
      // Reset loop position
      loopEngine.reset();
      
      console.log('🆕 New loop created');
    } catch (error) {
      console.error('Failed to create new loop:', error);
    } finally {
      setIsTransitioning(false);
    }
  }, [loopEngine, recordingEngine, isTransitioning]);

  // Get current workflow step for MPC-style guidance
  const getWorkflowStep = () => {
    if (!recordingState.hasChops && !recordingState.hasDrums) {
      return { step: 1, text: 'Set BPM & quantization, then record chops', mode: 'sample' };
    } else if (recordingState.hasChops && !recordingState.hasDrums) {
      return { step: 2, text: 'Switch to Drum Mode and record drums', mode: 'drum' };
    } else {
      return { step: 3, text: 'Loop complete! Adjust layers or create new loop', mode: 'both' };
    }
  };

  const workflowStep = getWorkflowStep();

  if (!loopEngine || !recordingEngine || !modeManager) {
    return (
      <div className={`bg-black/20 backdrop-blur-lg border border-white/20 rounded-2xl shadow-lg p-4 ${className}`}>
        <div className="text-center text-white/60">
          <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p>Loop Controls Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-black/20 backdrop-blur-lg border border-white/20 rounded-2xl shadow-lg p-4 space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Layers className="w-5 h-5 text-cyan-400" />
          <h3 className="text-lg font-semibold text-white">Loop Controls</h3>
        </div>
        
        {/* Loop length selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-white/60">Loop:</span>
          <div className="flex bg-white/10 rounded-lg p-1">
            <Button
              onClick={() => handleLoopLengthChange(2)}
              variant={loopState.bars === 2 ? "default" : "ghost"}
              size="sm"
              className={`text-xs px-3 py-1 ${
                loopState.bars === 2 
                  ? 'bg-cyan-500 text-white' 
                  : 'text-white/60 hover:text-white hover:bg-white/10'
              }`}
              disabled={isTransitioning || loopState.isRecording || loopState.isPlaying}
            >
              2 Bars
            </Button>
            <Button
              onClick={() => handleLoopLengthChange(4)}
              variant={loopState.bars === 4 ? "default" : "ghost"}
              size="sm"
              className={`text-xs px-3 py-1 ${
                loopState.bars === 4 
                  ? 'bg-cyan-500 text-white' 
                  : 'text-white/60 hover:text-white hover:bg-white/10'
              }`}
              disabled={isTransitioning || loopState.isRecording || loopState.isPlaying}
            >
              4 Bars
            </Button>
          </div>
        </div>
      </div>

      {/* MPC Workflow Guide */}
      <div className="bg-white/5 rounded-lg p-3 border border-white/10">
        <div className="flex items-center gap-2 mb-2">
          <div className="flex items-center gap-1">
            <div className={`w-2 h-2 rounded-full ${
              workflowStep.step === 1 ? 'bg-cyan-400 animate-pulse' : 
              workflowStep.step === 2 ? 'bg-purple-400 animate-pulse' : 
              'bg-green-400'
            }`} />
            <span className="text-xs text-white/60">Step {workflowStep.step}/3</span>
          </div>
          <Badge variant="outline" className="text-xs border-white/20 text-white/80">
            MPC Workflow
          </Badge>
        </div>
        <p className="text-sm text-white/80">{workflowStep.text}</p>
        
        {/* Mode indicator */}
        <div className="flex items-center gap-2 mt-2">
          <span className="text-xs text-white/60">Current mode:</span>
          <div className="flex items-center gap-1">
            {currentMode === 'sample' ? (
              <>
                <Music className="w-3 h-3 text-cyan-400" />
                <span className="text-xs text-cyan-400">Sample Mode</span>
              </>
            ) : (
              <>
                <Drum className="w-3 h-3 text-purple-400" />
                <span className="text-xs text-purple-400">Drum Mode</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Transport Controls */}
      <div className="space-y-4">
        <div className="flex items-center justify-center gap-3">
          {/* Record Button */}
          <Button
            onClick={handleRecord}
            variant={loopState.isRecording ? "destructive" : "default"}
            size="lg"
            className={`flex items-center gap-2 px-6 py-3 ${
              loopState.isRecording 
                ? 'bg-red-600 hover:bg-red-700 text-white animate-pulse' 
                : 'bg-red-500 hover:bg-red-600 text-white'
            }`}
            disabled={isTransitioning}
          >
            <Circle className={`w-4 h-4 ${loopState.isRecording ? 'fill-current' : ''}`} />
            {loopState.isRecording ? 'Recording...' : 'Record'}
          </Button>

          {/* Play Button */}
          <Button
            onClick={handlePlay}
            variant={loopState.isPlaying ? "secondary" : "default"}
            size="lg"
            className={`flex items-center gap-2 px-6 py-3 ${
              loopState.isPlaying 
                ? 'bg-green-600 hover:bg-green-700 text-white' 
                : 'bg-green-500 hover:bg-green-600 text-white'
            }`}
            disabled={isTransitioning}
          >
            <Play className="w-4 h-4" />
            {loopState.isPlaying ? 'Playing' : 'Play'}
          </Button>

          {/* Stop Button */}
          <Button
            onClick={handleStop}
            variant="outline"
            size="lg"
            className="flex items-center gap-2 px-6 py-3 border-white/20 text-white/80 hover:text-white hover:bg-white/10"
            disabled={isTransitioning || (!loopState.isRecording && !loopState.isPlaying)}
          >
            <Square className="w-4 h-4" />
            Stop
          </Button>
        </div>

        {/* Secondary Controls */}
        <div className="flex items-center justify-center gap-2">
          {/* Reset Loop */}
          <Button
            onClick={handleReset}
            variant="ghost"
            size="sm"
            className="flex items-center gap-1 text-white/60 hover:text-white hover:bg-white/10"
            disabled={isTransitioning}
          >
            <RotateCcw className="w-3 h-3" />
            Reset
          </Button>

          {/* New Loop */}
          <Button
            onClick={handleNewLoop}
            variant="ghost"
            size="sm"
            className="flex items-center gap-1 text-white/60 hover:text-white hover:bg-white/10"
            disabled={isTransitioning}
          >
            <Plus className="w-3 h-3" />
            New Loop
          </Button>
        </div>
      </div>

      {/* Layer Management */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-white/80 flex items-center gap-2">
          <Layers className="w-4 h-4" />
          Layer Management
        </h4>
        
        <div className="grid grid-cols-2 gap-3">
          {/* Chops Layer */}
          <div className="bg-white/5 rounded-lg p-3 border border-white/10">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-cyan-400 rounded-sm" />
                <span className="text-sm text-white">Chops</span>
              </div>
              <Badge variant="outline" className="text-xs border-cyan-400/30 text-cyan-400">
                {recordingState.hasChops ? 'Has Data' : 'Empty'}
              </Badge>
            </div>
            <Button
              onClick={() => handleClearLayer('chops')}
              variant="ghost"
              size="sm"
              className="w-full flex items-center gap-1 text-white/60 hover:text-white hover:bg-white/10"
              disabled={isTransitioning || !recordingState.hasChops}
            >
              <Trash2 className="w-3 h-3" />
              Clear
            </Button>
          </div>

          {/* Drums Layer */}
          <div className="bg-white/5 rounded-lg p-3 border border-white/10">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-purple-400 rounded-full" />
                <span className="text-sm text-white">Drums</span>
              </div>
              <Badge variant="outline" className="text-xs border-purple-400/30 text-purple-400">
                {recordingState.hasDrums ? 'Has Data' : 'Empty'}
              </Badge>
            </div>
            <Button
              onClick={() => handleClearLayer('drums')}
              variant="ghost"
              size="sm"
              className="w-full flex items-center gap-1 text-white/60 hover:text-white hover:bg-white/10"
              disabled={isTransitioning || !recordingState.hasDrums}
            >
              <Trash2 className="w-3 h-3" />
              Clear
            </Button>
          </div>
        </div>
      </div>

      {/* Status Bar */}
      <div className="flex items-center justify-between pt-2 border-t border-white/10">
        <div className="flex items-center gap-2 text-xs text-white/60">
          <div className={`w-2 h-2 rounded-full ${
            isTransitioning ? 'bg-yellow-400 animate-pulse' : 
            loopState.isRecording ? 'bg-red-400 animate-pulse' :
            loopState.isPlaying ? 'bg-green-400' : 'bg-gray-400'
          }`} />
          <span>
            {isTransitioning ? 'Processing...' :
             loopState.isRecording ? 'Recording' :
             loopState.isPlaying ? 'Playing' : 'Stopped'}
          </span>
        </div>
        
        <div className="text-xs text-white/40">
          {recordingState.totalEvents} events | {loopState.bars} bars
          {lastAction && ` | ${lastAction}`}
        </div>
      </div>
    </div>
  );
}