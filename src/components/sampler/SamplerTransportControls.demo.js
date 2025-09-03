import React, { useState } from 'react';
import SamplerTransportControls from './SamplerTransportControls';

/**
 * Demo component for SamplerTransportControls
 * Shows the component in action with state management
 */
export default function SamplerTransportControlsDemo() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [bpm, setBpm] = useState(120);

  const handlePlay = () => {
    console.log('Play triggered');
    setIsPlaying(true);
  };

  const handleStop = () => {
    console.log('Stop triggered');
    setIsPlaying(false);
  };

  const handleBpmChange = (newBpm) => {
    console.log('BPM changed to:', newBpm);
    setBpm(newBpm);
  };

  return (
    <div className="p-8 bg-gray-900 min-h-screen">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-white mb-8">
          SamplerTransportControls Demo
        </h1>
        
        <div className="bg-black/20 backdrop-blur-sm border border-white/10 rounded-lg p-6 mb-8">
          <h2 className="text-lg font-semibold text-white mb-4">Transport Controls</h2>
          <SamplerTransportControls
            isPlaying={isPlaying}
            bpm={bpm}
            onPlay={handlePlay}
            onStop={handleStop}
            onBpmChange={handleBpmChange}
          />
        </div>

        <div className="bg-black/20 backdrop-blur-sm border border-white/10 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Current State</h2>
          <div className="space-y-2 text-white/80">
            <p><strong>Playing:</strong> {isPlaying ? 'Yes' : 'No'}</p>
            <p><strong>BPM:</strong> {bpm}</p>
          </div>
          
          <div className="mt-4 text-sm text-white/60">
            <h3 className="font-semibold mb-2">Features:</h3>
            <ul className="space-y-1">
              <li>• Click Play/Stop button to toggle playback</li>
              <li>• Press Space bar to toggle playback (keyboard shortcut)</li>
              <li>• Adjust BPM (60-200 range with validation)</li>
              <li>• Press Enter in BPM field to commit changes</li>
              <li>• Visual state indicators show current playback status</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}