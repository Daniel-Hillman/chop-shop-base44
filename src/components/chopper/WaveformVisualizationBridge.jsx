import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { WaveformProductionWrapper } from '../waveform/WaveformProductionWrapper.jsx';
import ZoomControls from '../waveform/ZoomControls.jsx';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Trash2, Save, Play, Pause } from 'lucide-react';

/**
 * Bridge component that integrates the new WaveformVisualization with existing ChopperPage workflow
 * Maintains backward compatibility while providing enhanced waveform interaction capabilities
 * Implements requirements: 2.1, 2.2, 3.1, 3.2
 */
export default function WaveformVisualizationBridge({
  playerState,
  selectedChop,
  setChopTime,
  waveformData,
  deleteChop,
  youtubeUrl,
  allChops = [],
  onTimestampClick,
  isPlaying = false,
  onPlayPause,
  capturedAudioData,
  className = ''
}) {
  // Reference to the new WaveformVisualization component
  const waveformRef = useRef(null);
  
  // State for timestamp editing (backward compatibility)
  const [editableTimes, setEditableTimes] = useState({ startTime: '', endTime: '' });
  const [isEditing, setIsEditing] = useState(false);
  
  // Visual settings for the new waveform
  const [visualSettings, setVisualSettings] = useState({
    enableFrequencyColorCoding: true,
    enableAmplitudeColorCoding: true,
    enableStructureDetection: true,
    showPlayheadTime: true,
    quality: 'high',
    playheadColor: '#ef4444',
    playheadWidth: 2,
    activeChopColor: '#fbbf24'
  });

  // Convert legacy chop format to new format
  const convertedChops = useMemo(() => {
    return allChops.map(chop => ({
      id: chop.padId,
      padId: chop.padId,
      startTime: chop.startTime,
      endTime: chop.endTime,
      color: chop.color,
      waveformRegion: {
        startSample: Math.floor(chop.startTime * (waveformData?.sampleRate || 44100)),
        endSample: Math.floor(chop.endTime * (waveformData?.sampleRate || 44100)),
        peakAmplitude: 1.0 // Default value
      },
      metadata: {
        createdAt: Date.now(),
        lastModified: Date.now(),
        snapPoints: []
      }
    }));
  }, [allChops, waveformData]);

  // Use captured audio data if available, otherwise fall back to waveformData
  const activeWaveformData = useMemo(() => {
    if (capturedAudioData?.waveformData) {
      return {
        samples: capturedAudioData.waveformData,
        sampleRate: capturedAudioData.metadata?.sampleRate || 44100,
        duration: capturedAudioData.metadata?.duration || playerState.duration,
        channels: 1,
        metadata: {
          analysisMethod: 'captured',
          quality: 'high',
          generatedAt: Date.now(),
          sourceInfo: { type: 'captured', url: youtubeUrl }
        }
      };
    } else if (waveformData) {
      return {
        samples: waveformData,
        sampleRate: 44100, // Default sample rate
        duration: playerState.duration,
        channels: 1,
        metadata: {
          analysisMethod: 'legacy',
          quality: 'medium',
          generatedAt: Date.now(),
          sourceInfo: { type: 'legacy', url: youtubeUrl }
        }
      };
    }
    return null;
  }, [capturedAudioData, waveformData, playerState.duration, youtubeUrl]);

  // Update editable times when selected chop changes
  useEffect(() => {
    if (selectedChop) {
      setEditableTimes({
        startTime: selectedChop.startTime.toFixed(4),
        endTime: selectedChop.endTime.toFixed(4)
      });
    } else {
      setEditableTimes({ startTime: '', endTime: '' });
    }
  }, [selectedChop]);

  // Handle chop creation from waveform interaction
  const handleChopCreate = useCallback((startTime, endTime) => {
    console.log(`🎵 Waveform chop creation: ${startTime.toFixed(3)}s - ${endTime.toFixed(3)}s`);
    
    // If there's a selected chop, update its boundaries
    if (selectedChop?.padId) {
      console.log(`🔄 Updating existing chop: ${selectedChop.padId}`);
      if (setChopTime) {
        setChopTime('startTime', startTime);
        setChopTime('endTime', endTime);
      }
      return;
    }
    
    // If no chop is selected, we need to find an available pad or prompt user
    console.log('⚠️ No pad selected - waveform interaction requires pad selection first');
    
    // TODO: Could implement auto-selection of next available pad
    // For now, maintain existing workflow requiring manual pad selection
  }, [selectedChop, setChopTime]);

  // Handle chop updates from waveform interaction
  const handleChopUpdate = useCallback((chopId, updates) => {
    console.log(`🔄 Waveform chop update: ${chopId}`, updates);
    
    const chop = allChops.find(c => c.padId === chopId);
    if (!chop) return;
    
    // Update chop boundaries if provided
    if (updates.startTime !== undefined && setChopTime) {
      setChopTime('startTime', updates.startTime);
    }
    if (updates.endTime !== undefined && setChopTime) {
      setChopTime('endTime', updates.endTime);
    }
  }, [allChops, setChopTime]);

  // Handle time seeking from waveform interaction
  const handleTimeSeek = useCallback((time) => {
    console.log(`⏭️ Waveform time seek: ${time.toFixed(3)}s`);
    
    // Use the existing timestamp click handler for consistency
    if (onTimestampClick) {
      onTimestampClick(time);
    }
  }, [onTimestampClick]);

  // Handle manual timestamp editing (backward compatibility)
  const handleTimestampEdit = useCallback((field, value) => {
    setEditableTimes(prev => ({ ...prev, [field]: value }));
  }, []);

  const handleTimestampSave = useCallback(() => {
    if (!selectedChop || !setChopTime) return;
    
    const startTime = parseFloat(editableTimes.startTime);
    const endTime = parseFloat(editableTimes.endTime);
    
    if (isNaN(startTime) || isNaN(endTime)) {
      console.error('Invalid timestamp values');
      return;
    }
    
    if (startTime >= endTime) {
      console.error('Start time must be less than end time');
      return;
    }
    
    setChopTime('startTime', startTime);
    setChopTime('endTime', endTime);
    setIsEditing(false);
    
    console.log(`💾 Manual timestamp edit: ${startTime.toFixed(3)}s - ${endTime.toFixed(3)}s`);
  }, [selectedChop, setChopTime, editableTimes]);

  // Handle chop deletion
  const handleDeleteChop = useCallback(() => {
    if (selectedChop && deleteChop) {
      deleteChop(selectedChop.padId);
    }
  }, [selectedChop, deleteChop]);

  // Zoom control handlers
  const handleZoomIn = useCallback(() => {
    if (waveformRef.current) {
      waveformRef.current.zoomIn(2, playerState.currentTime);
    }
  }, [playerState.currentTime]);

  const handleZoomOut = useCallback(() => {
    if (waveformRef.current) {
      waveformRef.current.zoomOut(2, playerState.currentTime);
    }
  }, [playerState.currentTime]);

  const handleZoomToFit = useCallback(() => {
    if (waveformRef.current) {
      waveformRef.current.zoomToFit();
    }
  }, []);

  // Get waveform API for external access
  const getWaveformAPI = useCallback(() => {
    return waveformRef.current;
  }, []);

  return (
    <motion.div
      className={`bg-black/20 backdrop-blur-lg border border-white/20 rounded-2xl shadow-lg p-6 space-y-4 ${className}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
    >
      {/* Header with controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold text-white">Interactive Waveform</h3>
          {capturedAudioData && (
            <span className="text-xs text-purple-300 bg-purple-500/20 px-2 py-1 rounded">
              High Quality Audio
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {/* Play/Pause button */}
          <Button
            onClick={onPlayPause}
            variant="outline"
            size="sm"
            className="border-white/20 text-white hover:bg-white/10"
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </Button>
          
          {/* Zoom controls */}
          <ZoomControls
            onZoomIn={handleZoomIn}
            onZoomOut={handleZoomOut}
            onZoomToFit={handleZoomToFit}
            className="border-white/20"
          />
        </div>
      </div>

      {/* Main waveform visualization */}
      <div className="relative h-64 bg-gray-900/50 rounded-lg overflow-hidden">
        {activeWaveformData ? (
          <WaveformProductionWrapper
            ref={waveformRef}
            audioSource={youtubeUrl}
            waveformData={activeWaveformData}
            chops={convertedChops}
            currentTime={playerState.currentTime}
            isPlaying={isPlaying}
            onChopCreate={handleChopCreate}
            onChopUpdate={handleChopUpdate}
            onTimeSeek={handleTimeSeek}
            visualSettings={visualSettings}
            className="w-full h-full"
          />
        ) : (
          <div className="flex items-center justify-center h-full text-white/50">
            <div className="text-center">
              <div className="text-sm">No waveform data available</div>
              <div className="text-xs mt-1">Load a video to generate waveform</div>
            </div>
          </div>
        )}
      </div>

      {/* Selected chop editor (backward compatibility) */}
      {selectedChop && (
        <div className="bg-white/5 rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-white">
              Edit Sample: {selectedChop.padId}
            </h4>
            <div className="flex items-center gap-2">
              <Button
                onClick={() => setIsEditing(!isEditing)}
                variant="outline"
                size="sm"
                className="border-white/20 text-white hover:bg-white/10"
              >
                {isEditing ? 'Cancel' : 'Edit'}
              </Button>
              {selectedChop && (
                <Button
                  onClick={handleDeleteChop}
                  variant="outline"
                  size="sm"
                  className="border-red-400/20 text-red-400 hover:bg-red-400/10"
                  aria-label="Delete chop"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>

          {isEditing ? (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-white/70 block mb-1">Start Time (s)</label>
                <Input
                  type="number"
                  step="0.001"
                  value={editableTimes.startTime}
                  onChange={(e) => handleTimestampEdit('startTime', e.target.value)}
                  className="bg-white/10 border-white/20 text-white text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-white/70 block mb-1">End Time (s)</label>
                <Input
                  type="number"
                  step="0.001"
                  value={editableTimes.endTime}
                  onChange={(e) => handleTimestampEdit('endTime', e.target.value)}
                  className="bg-white/10 border-white/20 text-white text-sm"
                />
              </div>
              <div className="col-span-2">
                <Button
                  onClick={handleTimestampSave}
                  className="w-full bg-cyan-500 hover:bg-cyan-600 text-black font-medium"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Save Changes
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-white/70">Start:</span>
                <div className="text-white font-mono">{selectedChop.startTime.toFixed(3)}s</div>
              </div>
              <div>
                <span className="text-white/70">End:</span>
                <div className="text-white font-mono">{selectedChop.endTime.toFixed(3)}s</div>
              </div>
              <div>
                <span className="text-white/70">Duration:</span>
                <div className="text-white font-mono">
                  {(selectedChop.endTime - selectedChop.startTime).toFixed(3)}s
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Instructions and Status */}
      <div className="text-xs text-white/50 space-y-1">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div>• Click on waveform to seek to time position</div>
            <div>• Select a pad first, then drag on waveform to create/edit samples</div>
            <div>• Use zoom controls to get precise timing</div>
            {capturedAudioData && (
              <div className="text-purple-300">• Using high-quality captured audio for enhanced precision</div>
            )}
          </div>
          
          {/* Workflow status indicator */}
          <div className="text-right">
            {selectedChop ? (
              <div className="text-cyan-300 font-medium">
                ✓ Pad {selectedChop.padId} selected
              </div>
            ) : (
              <div className="text-yellow-300">
                ⚠ Select a pad to create samples
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// Export additional utilities for external access
export { WaveformVisualizationBridge };