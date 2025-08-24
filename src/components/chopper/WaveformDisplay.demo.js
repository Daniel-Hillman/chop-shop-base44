/**
 * WaveformDisplay Demo - Showcasing Enhanced Waveform Visualization
 * 
 * This demo demonstrates the improved waveform visualization features:
 * - Cached audio data integration
 * - Real-time progress indicators
 * - Visual markers for sample timestamps
 * - Interactive waveform clicking for timestamp creation
 */

import React, { useState, useEffect } from 'react';
import WaveformDisplay from './WaveformDisplay';

// Mock data for demonstration
const mockPlayerState = {
  currentTime: 45.5,
  duration: 180,
  isPlaying: true,
};

const mockWaveformData = Array.from({ length: 400 }, (_, i) => {
  // Generate realistic waveform data with some variation
  const baseAmplitude = Math.sin(i * 0.02) * 0.3 + 0.4;
  const noise = (Math.random() - 0.5) * 0.2;
  const beat = Math.sin(i * 0.1) * 0.1;
  return Math.max(0, Math.min(1, baseAmplitude + noise + beat));
});

const mockChops = [
  {
    padId: 'A1',
    startTime: 15.2,
    endTime: 22.8,
    color: '#06b6d4', // cyan
  },
  {
    padId: 'A2',
    startTime: 35.5,
    endTime: 41.2,
    color: '#3b82f6', // blue
  },
  {
    padId: 'B1',
    startTime: 65.0,
    endTime: 72.5,
    color: '#8b5cf6', // purple
  },
  {
    padId: 'B2',
    startTime: 95.3,
    endTime: 103.7,
    color: '#059669', // emerald
  },
  {
    padId: 'C1',
    startTime: 125.8,
    endTime: 135.2,
    color: '#f97316', // orange
  },
];

export default function WaveformDisplayDemo() {
  const [selectedChopId, setSelectedChopId] = useState('A1');
  const [currentTime, setCurrentTime] = useState(45.5);
  const [isPlaying, setIsPlaying] = useState(true);
  const [chops, setChops] = useState(mockChops);

  const selectedChop = chops.find(c => c.padId === selectedChopId);

  // Simulate playback progress
  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      setCurrentTime(prev => {
        const next = prev + 0.1;
        return next >= mockPlayerState.duration ? 0 : next;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [isPlaying]);

  const handleSetChopTime = (timeType, value) => {
    if (!selectedChop) return;

    setChops(prevChops => 
      prevChops.map(chop => 
        chop.padId === selectedChop.padId
          ? { ...chop, [timeType]: value }
          : chop
      )
    );
  };

  const handleDeleteChop = (padId) => {
    setChops(prevChops => prevChops.filter(c => c.padId !== padId));
    if (selectedChopId === padId) {
      setSelectedChopId(null);
    }
  };

  const handleTimestampClick = (timestamp, chop) => {
    console.log(`Timestamp clicked: ${timestamp.toFixed(2)}s`, chop);
    setCurrentTime(timestamp);
    if (chop) {
      setSelectedChopId(chop.padId);
    }
  };

  const handlePlayPause = () => {
    setIsPlaying(prev => !prev);
  };

  const playerState = {
    ...mockPlayerState,
    currentTime,
    isPlaying,
  };

  return (
    <div className="p-8 bg-gradient-to-br from-gray-900 to-black min-h-screen">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-white">
            Enhanced Waveform Display Demo
          </h1>
          <p className="text-gray-400">
            Showcasing cached audio data, real-time progress, visual markers, and interactive clicking
          </p>
        </div>

        <div className="bg-black/20 backdrop-blur-lg border border-white/20 rounded-2xl p-6 space-y-4">
          <h2 className="text-xl font-semibold text-white">Features Demonstrated</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-300">
            <div className="space-y-2">
              <h3 className="font-medium text-cyan-400">✓ Cached Audio Data</h3>
              <p>Loads waveform from AudioProcessingService or StorageManager cache</p>
              
              <h3 className="font-medium text-cyan-400">✓ Real-time Progress</h3>
              <p>Animated playhead with progress fill during playback</p>
            </div>
            <div className="space-y-2">
              <h3 className="font-medium text-cyan-400">✓ Visual Markers</h3>
              <p>Color-coded sample timestamps with labels</p>
              
              <h3 className="font-medium text-cyan-400">✓ Interactive Clicking</h3>
              <p>Click to create timestamps or jump to existing samples</p>
            </div>
          </div>
        </div>

        <WaveformDisplay
          playerState={playerState}
          selectedChop={selectedChop}
          setChopTime={handleSetChopTime}
          waveformData={mockWaveformData}
          deleteChop={handleDeleteChop}
          youtubeUrl="https://www.youtube.com/watch?v=demo"
          allChops={chops}
          onTimestampClick={handleTimestampClick}
          isPlaying={isPlaying}
          onPlayPause={handlePlayPause}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-black/20 backdrop-blur-lg border border-white/20 rounded-2xl p-4">
            <h3 className="text-lg font-semibold text-white mb-3">Sample Controls</h3>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-400">Selected Sample:</span>
                <select 
                  value={selectedChopId || ''} 
                  onChange={(e) => setSelectedChopId(e.target.value)}
                  className="bg-white/10 border border-white/20 rounded px-2 py-1 text-white text-sm"
                >
                  <option value="">None</option>
                  {chops.map(chop => (
                    <option key={chop.padId} value={chop.padId}>
                      {chop.padId} ({chop.startTime.toFixed(1)}s - {chop.endTime.toFixed(1)}s)
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-400">Playback:</span>
                <button 
                  onClick={handlePlayPause}
                  className="bg-cyan-500 hover:bg-cyan-600 text-white px-3 py-1 rounded text-sm"
                >
                  {isPlaying ? 'Pause' : 'Play'}
                </button>
              </div>
            </div>
          </div>

          <div className="bg-black/20 backdrop-blur-lg border border-white/20 rounded-2xl p-4">
            <h3 className="text-lg font-semibold text-white mb-3">Playback Info</h3>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Current Time:</span>
                <span className="text-white font-mono">{currentTime.toFixed(1)}s</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Duration:</span>
                <span className="text-white font-mono">{playerState.duration}s</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Progress:</span>
                <span className="text-white font-mono">
                  {((currentTime / playerState.duration) * 100).toFixed(1)}%
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Total Samples:</span>
                <span className="text-white font-mono">{chops.length}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-black/20 backdrop-blur-lg border border-white/20 rounded-2xl p-4">
          <h3 className="text-lg font-semibold text-white mb-3">Usage Instructions</h3>
          <div className="space-y-2 text-sm text-gray-300">
            <p><strong className="text-cyan-400">Click on waveform:</strong> Create new timestamp or jump to existing sample</p>
            <p><strong className="text-cyan-400">Hover over waveform:</strong> See timestamp tooltip</p>
            <p><strong className="text-cyan-400">Select sample:</strong> Edit start/end times with input fields</p>
            <p><strong className="text-cyan-400">Zoom controls:</strong> Use +/- buttons to zoom in/out on waveform</p>
            <p><strong className="text-cyan-400">Play/Pause:</strong> Control playback and see real-time progress</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Export demo metadata for development tools
WaveformDisplayDemo.displayName = 'WaveformDisplayDemo';
WaveformDisplayDemo.description = 'Enhanced waveform visualization with cached data, real-time progress, visual markers, and interactive clicking';
WaveformDisplayDemo.features = [
  'Cached audio data integration',
  'Real-time progress indicators',
  'Visual markers for sample timestamps', 
  'Interactive waveform clicking',
  'Zoom controls',
  'Hover tooltips',
  'Sample editing interface'
];