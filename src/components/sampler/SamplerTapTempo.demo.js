import React, { useState } from 'react';
import SamplerTapTempo from './SamplerTapTempo';

/**
 * Demo component for SamplerTapTempo
 * Shows the component in action with BPM calculation
 */
const SamplerTapTempoDemo = () => {
  const [currentBpm, setCurrentBpm] = useState(120);
  const [lastCalculatedBpm, setLastCalculatedBpm] = useState(null);
  const [tapHistory, setTapHistory] = useState([]);

  const handleTempoCalculated = (bpm) => {
    console.log('Calculated BPM:', bpm);
    setCurrentBpm(bpm);
    setLastCalculatedBpm(bpm);
    setTapHistory(prev => [...prev.slice(-4), bpm]); // Keep last 5 calculations
  };

  const resetDemo = () => {
    setCurrentBpm(120);
    setLastCalculatedBpm(null);
    setTapHistory([]);
  };

  return (
    <div className="p-8 bg-gray-900 min-h-screen text-white">
      <div className="max-w-2xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">SamplerTapTempo Demo</h1>
          <p className="text-gray-400">
            Click the TAP button or press Space to calculate tempo. Requires 4 taps minimum.
          </p>
        </div>

        {/* Main Component */}
        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-600 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Tap Tempo Component</h2>
          
          <div className="flex items-center gap-4">
            <SamplerTapTempo 
              onTempoCalculated={handleTempoCalculated}
              currentBpm={currentBpm}
            />
            
            <div className="text-sm text-gray-400">
              Press Space or click TAP to set tempo
            </div>
          </div>
        </div>

        {/* Current State */}
        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-600 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Current State</h2>
          
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-400">Current BPM:</span>
              <div className="text-2xl font-mono text-cyan-300">{currentBpm}</div>
            </div>
            
            <div>
              <span className="text-gray-400">Last Calculated:</span>
              <div className="text-2xl font-mono text-green-300">
                {lastCalculatedBpm || '---'}
              </div>
            </div>
          </div>
        </div>

        {/* Tap History */}
        {tapHistory.length > 0 && (
          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-600 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Tap History</h2>
            
            <div className="flex gap-2 flex-wrap">
              {tapHistory.map((bpm, index) => (
                <div 
                  key={index}
                  className="px-3 py-1 bg-gray-700 rounded text-sm font-mono"
                >
                  {bpm} BPM
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-600 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Instructions</h2>
          
          <ul className="space-y-2 text-sm text-gray-300">
            <li>• Click the TAP button or press Space to register taps</li>
            <li>• Minimum 4 taps required for BPM calculation</li>
            <li>• Taps automatically reset after 3 seconds of inactivity</li>
            <li>• BPM is clamped to 60-200 range</li>
            <li>• Space bar is ignored when typing in input fields</li>
            <li>• Component uses minimal screen space for performance</li>
          </ul>
        </div>

        {/* Controls */}
        <div className="flex gap-4">
          <button
            onClick={resetDemo}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-md text-sm font-medium transition-colors"
          >
            Reset Demo
          </button>
          
          <button
            onClick={() => setCurrentBpm(Math.floor(Math.random() * 140) + 60)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-md text-sm font-medium transition-colors"
          >
            Random BPM
          </button>
        </div>

        {/* Test Input */}
        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-600 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Test Space Bar Filtering</h2>
          <p className="text-sm text-gray-400 mb-2">
            Space bar should not register taps when typing in this input:
          </p>
          <input
            type="text"
            placeholder="Type here and press space..."
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:border-cyan-400"
          />
        </div>
      </div>
    </div>
  );
};

export default SamplerTapTempoDemo;