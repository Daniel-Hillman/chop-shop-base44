import React, { useState, useEffect } from 'react';
import ZoomControls from './ZoomControls.jsx';
import WaveformVisualization from './WaveformVisualization.jsx';
import { ViewportManager } from './ViewportManager.js';

/**
 * Demo component showcasing advanced zoom and navigation controls
 * Implements requirements: 4.1, 4.2, 4.3, 4.4
 */
export default function ZoomControlsDemo() {
  const [viewportManager, setViewportManager] = useState(null);
  const [waveformData, setWaveformData] = useState(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  // Initialize demo data
  useEffect(() => {
    // Create mock waveform data
    const sampleRate = 44100;
    const duration = 120; // 2 minutes
    const samples = new Float32Array(sampleRate * duration);
    
    // Generate realistic waveform with music-like patterns
    for (let i = 0; i < samples.length; i++) {
      const time = i / sampleRate;
      
      // Base frequency with harmonics
      let amplitude = 0;
      amplitude += Math.sin(2 * Math.PI * 440 * time) * 0.3; // A4 note
      amplitude += Math.sin(2 * Math.PI * 880 * time) * 0.2; // Octave
      amplitude += Math.sin(2 * Math.PI * 220 * time) * 0.1; // Sub-octave
      
      // Add rhythm patterns
      const beat = Math.floor(time * 2) % 4; // 120 BPM
      if (beat === 0) amplitude *= 1.5; // Kick
      if (beat === 2) amplitude *= 1.2; // Snare
      
      // Add envelope and dynamics
      const envelope = Math.sin(time * 0.1) * 0.5 + 0.5;
      amplitude *= envelope;
      
      // Add some noise for realism
      amplitude += (Math.random() - 0.5) * 0.05;
      
      samples[i] = Math.max(-1, Math.min(1, amplitude));
    }

    const mockWaveformData = {
      samples,
      sampleRate,
      duration,
      channels: 1,
      metadata: {
        analysisMethod: 'demo',
        quality: 'high',
        generatedAt: Date.now()
      }
    };

    setWaveformData(mockWaveformData);

    // Create viewport manager
    const manager = new ViewportManager({
      audioDuration: duration,
      canvasDimensions: { width: 800, height: 200 }
    });

    setViewportManager(manager);
  }, []);

  // Simulate playback
  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      setCurrentTime(prev => {
        const next = prev + 0.1;
        return next >= 120 ? 0 : next; // Loop at end
      });
    }, 100);

    return () => clearInterval(interval);
  }, [isPlaying]);

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const handleSeek = (time) => {
    setCurrentTime(time);
  };

  const handleChopCreate = (startTime, endTime) => {
    console.log('Chop created:', { startTime, endTime });
  };

  const handleChopUpdate = (chopId, updates) => {
    console.log('Chop updated:', { chopId, updates });
  };

  if (!viewportManager || !waveformData) {
    return (
      <div className="p-8 bg-gray-900 text-white">
        <div className="text-center">Loading zoom controls demo...</div>
      </div>
    );
  }

  return (
    <div className="p-8 bg-gray-900 text-white min-h-screen">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">Advanced Zoom and Navigation Controls</h1>
        <p className="text-gray-400 mb-8">
          Interactive demo showcasing mouse wheel zoom, keyboard shortcuts, and smooth navigation
        </p>

        {/* Control Panel */}
        <div className="mb-6 p-4 bg-gray-800 rounded-lg">
          <div className="flex items-center gap-4 mb-4">
            <button
              onClick={handlePlayPause}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded transition-colors"
            >
              {isPlaying ? '⏸ Pause' : '▶ Play'}
            </button>
            
            <div className="text-sm text-gray-400">
              Time: {currentTime.toFixed(1)}s / {waveformData.duration}s
            </div>
          </div>

          <div className="text-sm text-gray-400">
            <div className="mb-2"><strong>Try these interactions:</strong></div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div>• Mouse wheel: Zoom in/out</div>
                <div>• Shift + wheel: Fine zoom</div>
                <div>• Ctrl + wheel: Coarse zoom</div>
                <div>• Click: Seek to position</div>
              </div>
              <div>
                <div>• Ctrl + / -: Zoom controls</div>
                <div>• Arrow keys: Pan left/right</div>
                <div>• Ctrl + 0: Zoom to fit</div>
                <div>• Home/End: Go to start/end</div>
              </div>
            </div>
          </div>
        </div>

        {/* Waveform Visualization */}
        <div className="mb-6 bg-gray-800 rounded-lg p-4">
          <div className="h-64 relative">
            <WaveformVisualization
              waveformData={waveformData}
              currentTime={currentTime}
              isPlaying={isPlaying}
              onTimeSeek={handleSeek}
              onChopCreate={handleChopCreate}
              onChopUpdate={handleChopUpdate}
              visualSettings={{
                quality: 'high',
                topColor: 'rgba(6, 182, 212, 0.8)',
                centerColor: 'rgba(6, 182, 212, 0.4)',
                bottomColor: 'rgba(6, 182, 212, 0.8)',
                strokeColor: 'rgba(6, 182, 212, 1)',
                playheadColor: '#ef4444',
                showPlayheadTime: true
              }}
              className="w-full h-full"
            />
          </div>
        </div>

        {/* Zoom Controls */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Standard Controls */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Standard Controls</h3>
            <ZoomControls
              viewportManager={viewportManager}
              showPresets={true}
              showNavigationInfo={true}
              compact={false}
            />
          </div>

          {/* Compact Controls */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Compact Controls</h3>
            <ZoomControls
              viewportManager={viewportManager}
              showPresets={true}
              showNavigationInfo={true}
              compact={true}
            />
          </div>
        </div>

        {/* Feature Showcase */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-4 bg-gray-800 rounded-lg">
            <h4 className="font-semibold mb-2 text-cyan-400">Mouse Wheel Zoom</h4>
            <p className="text-sm text-gray-400">
              Smooth scaling transitions with modifier key support for fine and coarse zoom control.
            </p>
          </div>

          <div className="p-4 bg-gray-800 rounded-lg">
            <h4 className="font-semibold mb-2 text-green-400">Keyboard Navigation</h4>
            <p className="text-sm text-gray-400">
              Complete keyboard shortcuts for zoom presets, pan navigation, and quick access to start/end.
            </p>
          </div>

          <div className="p-4 bg-gray-800 rounded-lg">
            <h4 className="font-semibold mb-2 text-purple-400">Detail Level Management</h4>
            <p className="text-sm text-gray-400">
              Automatic rendering optimization based on zoom level with sample-level detail at high zoom.
            </p>
          </div>
        </div>

        {/* Performance Info */}
        <div className="mt-6 p-4 bg-gray-800 rounded-lg">
          <h4 className="font-semibold mb-2">Performance Features</h4>
          <div className="text-sm text-gray-400 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div>• Viewport culling for large audio files</div>
              <div>• Progressive rendering with Web Workers</div>
              <div>• Intelligent caching and cleanup</div>
            </div>
            <div>
              <div>• 60fps smooth animations</div>
              <div>• Optimized canvas drawing</div>
              <div>• Memory-efficient sample processing</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Export for Storybook or standalone usage
export const ZoomControlsStory = {
  title: 'Waveform/ZoomControls',
  component: ZoomControlsDemo,
  parameters: {
    layout: 'fullscreen',
  },
};