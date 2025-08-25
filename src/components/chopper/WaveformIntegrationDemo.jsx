import React, { useState } from 'react';
import WaveformVisualizationBridge from './WaveformVisualizationBridge';

/**
 * Demo component to showcase the waveform integration
 * This demonstrates the complete workflow from YouTube URL to interactive waveform editing
 */
export default function WaveformIntegrationDemo() {
  const [playerState] = useState({
    currentTime: 15.5,
    duration: 180,
    isPlaying: true
  });

  const [selectedChop, setSelectedChop] = useState({
    padId: 'A0',
    startTime: 10.0,
    endTime: 14.0,
    color: '#06b6d4'
  });

  const [allChops, setAllChops] = useState([
    {
      padId: 'A0',
      startTime: 10.0,
      endTime: 14.0,
      color: '#06b6d4'
    },
    {
      padId: 'A1',
      startTime: 20.0,
      endTime: 24.0,
      color: '#3b82f6'
    },
    {
      padId: 'B0',
      startTime: 30.0,
      endTime: 34.0,
      color: '#8b5cf6'
    }
  ]);

  // Mock waveform data
  const waveformData = new Float32Array(Array.from({ length: 1000 }, (_, i) => 
    Math.sin(i * 0.1) * 0.5 + Math.random() * 0.3 - 0.15
  ));

  // Mock captured audio data (high quality)
  const capturedAudioData = {
    waveformData: new Float32Array(Array.from({ length: 2000 }, (_, i) => 
      Math.sin(i * 0.05) * 0.8 + Math.cos(i * 0.02) * 0.3 + Math.random() * 0.1 - 0.05
    )),
    metadata: {
      sampleRate: 44100,
      duration: 180,
      quality: 'high'
    }
  };

  const handleSetChopTime = (timeType, time) => {
    if (!selectedChop) return;
    
    const updatedChop = {
      ...selectedChop,
      [timeType]: time
    };
    
    setSelectedChop(updatedChop);
    
    // Update in allChops array
    setAllChops(prevChops => 
      prevChops.map(chop => 
        chop.padId === selectedChop.padId ? updatedChop : chop
      )
    );
    
    console.log(`🎵 Demo: Updated ${selectedChop.padId} ${timeType} to ${time.toFixed(3)}s`);
  };

  const handleDeleteChop = (padId) => {
    setAllChops(prevChops => prevChops.filter(chop => chop.padId !== padId));
    if (selectedChop?.padId === padId) {
      setSelectedChop(null);
    }
    console.log(`🗑️ Demo: Deleted chop ${padId}`);
  };

  const handleTimestampClick = (time) => {
    console.log(`⏭️ Demo: Seeking to ${time.toFixed(3)}s`);
  };

  const handlePlayPause = () => {
    console.log('▶️⏸️ Demo: Play/Pause toggled');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold text-white">
            Interactive Waveform Integration Demo
          </h1>
          <p className="text-lg text-white/70 max-w-2xl mx-auto">
            This demo showcases the new interactive waveform visualization integrated with 
            the existing YouTube sampler workflow. The waveform provides precise visual 
            feedback and direct manipulation capabilities.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main waveform area */}
          <div className="lg:col-span-2">
            <WaveformVisualizationBridge
              playerState={playerState}
              selectedChop={selectedChop}
              setChopTime={handleSetChopTime}
              waveformData={waveformData}
              deleteChop={handleDeleteChop}
              youtubeUrl="https://www.youtube.com/watch?v=demo"
              allChops={allChops}
              onTimestampClick={handleTimestampClick}
              isPlaying={playerState.isPlaying}
              onPlayPause={handlePlayPause}
              capturedAudioData={capturedAudioData}
            />
          </div>

          {/* Control panel */}
          <div className="space-y-6">
            <div className="bg-black/20 backdrop-blur-lg border border-white/20 rounded-2xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Demo Controls</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-white/70 block mb-2">Select Chop</label>
                  <div className="grid grid-cols-2 gap-2">
                    {allChops.map(chop => (
                      <button
                        key={chop.padId}
                        onClick={() => setSelectedChop(chop)}
                        className={`px-3 py-2 rounded text-sm font-medium transition-colors ${
                          selectedChop?.padId === chop.padId
                            ? 'bg-cyan-500 text-black'
                            : 'bg-white/10 text-white hover:bg-white/20'
                        }`}
                      >
                        {chop.padId}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-sm text-white/70 block mb-2">Current Selection</label>
                  {selectedChop ? (
                    <div className="bg-white/5 rounded p-3 text-sm">
                      <div className="text-white font-medium">{selectedChop.padId}</div>
                      <div className="text-white/70">
                        {selectedChop.startTime.toFixed(3)}s - {selectedChop.endTime.toFixed(3)}s
                      </div>
                      <div className="text-white/70">
                        Duration: {(selectedChop.endTime - selectedChop.startTime).toFixed(3)}s
                      </div>
                    </div>
                  ) : (
                    <div className="text-white/50 text-sm">No chop selected</div>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-black/20 backdrop-blur-lg border border-white/20 rounded-2xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Features Demonstrated</h3>
              
              <div className="space-y-3 text-sm text-white/70">
                <div className="flex items-start gap-2">
                  <span className="text-green-400">✓</span>
                  <span>Interactive waveform visualization with real-time playback</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-green-400">✓</span>
                  <span>Direct chop manipulation through waveform interaction</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-green-400">✓</span>
                  <span>Zoom controls for precise timing adjustments</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-green-400">✓</span>
                  <span>High-quality captured audio integration</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-green-400">✓</span>
                  <span>Backward compatibility with existing workflow</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-green-400">✓</span>
                  <span>Error boundaries and graceful fallback handling</span>
                </div>
              </div>
            </div>

            <div className="bg-black/20 backdrop-blur-lg border border-white/20 rounded-2xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Usage Instructions</h3>
              
              <div className="space-y-2 text-sm text-white/70">
                <div>1. Select a chop from the controls above</div>
                <div>2. Click on the waveform to seek to that position</div>
                <div>3. Drag on the waveform to create/edit sample boundaries</div>
                <div>4. Use zoom controls for precise editing</div>
                <div>5. Edit timestamps manually if needed</div>
              </div>
            </div>
          </div>
        </div>

        <div className="text-center text-white/50 text-sm">
          This demo shows the integration between the new high-performance waveform visualization 
          and the existing YouTube sampler system, maintaining full backward compatibility while 
          adding powerful new interactive capabilities.
        </div>
      </div>
    </div>
  );
}