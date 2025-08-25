/**
 * Demo for WaveformVisualization component
 * Shows basic usage and features
 */

import React, { useState, useEffect } from 'react';
import WaveformVisualization from './WaveformVisualization.jsx';

export default function WaveformVisualizationDemo() {
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [chops, setChops] = useState([
    { id: '1', startTime: 10, endTime: 15, padId: 'A1', color: '#ff6b6b' },
    { id: '2', startTime: 25, endTime: 30, padId: 'A2', color: '#4ecdc4' },
    { id: '3', startTime: 45, endTime: 52, padId: 'B1', color: '#45b7d1' },
    { id: '4', startTime: 70, endTime: 75, padId: 'B2', color: '#f9ca24' }
  ]);

  // Simulate playback
  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      setCurrentTime(prev => {
        const next = prev + 0.1;
        return next > 120 ? 0 : next; // Loop after 2 minutes
      });
    }, 100);

    return () => clearInterval(interval);
  }, [isPlaying]);

  const handleChopCreate = (startTime, endTime) => {
    const newChop = {
      id: Date.now().toString(),
      startTime,
      endTime,
      padId: `C${chops.length + 1}`,
      color: `hsl(${Math.random() * 360}, 70%, 50%)`
    };
    setChops(prev => [...prev, newChop]);
    console.log('Created chop:', newChop);
  };

  const handleChopUpdate = (chopId, newBounds) => {
    setChops(prev => prev.map(chop => 
      chop.id === chopId 
        ? { ...chop, ...newBounds }
        : chop
    ));
    console.log('Updated chop:', chopId, newBounds);
  };

  const handleTimeSeek = (time) => {
    setCurrentTime(time);
    console.log('Seek to:', time);
  };

  const togglePlayback = () => {
    setIsPlaying(prev => !prev);
  };

  const resetDemo = () => {
    setCurrentTime(0);
    setIsPlaying(false);
    setChops([
      { id: '1', startTime: 10, endTime: 15, padId: 'A1', color: '#ff6b6b' },
      { id: '2', startTime: 25, endTime: 30, padId: 'A2', color: '#4ecdc4' },
      { id: '3', startTime: 45, endTime: 52, padId: 'B1', color: '#45b7d1' },
      { id: '4', startTime: 70, endTime: 75, padId: 'B2', color: '#f9ca24' }
    ]);
  };

  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-6 text-gray-800">
          Waveform Visualization Demo
        </h1>
        
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="mb-4 flex items-center gap-4">
            <button
              onClick={togglePlayback}
              className={`px-4 py-2 rounded font-medium ${
                isPlaying 
                  ? 'bg-red-500 hover:bg-red-600 text-white' 
                  : 'bg-green-500 hover:bg-green-600 text-white'
              }`}
            >
              {isPlaying ? 'Pause' : 'Play'}
            </button>
            
            <button
              onClick={resetDemo}
              className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded font-medium"
            >
              Reset
            </button>
            
            <div className="text-sm text-gray-600">
              Current Time: {currentTime.toFixed(1)}s
            </div>
            
            <div className="text-sm text-gray-600">
              Chops: {chops.length}
            </div>
          </div>
          
          <div className="h-64 border border-gray-300 rounded">
            <WaveformVisualization
              audioSource={null}
              chops={chops}
              currentTime={currentTime}
              isPlaying={isPlaying}
              onChopCreate={handleChopCreate}
              onChopUpdate={handleChopUpdate}
              onTimeSeek={handleTimeSeek}
              visualSettings={{
                theme: 'dark',
                showGrid: true,
                showTimestamps: true
              }}
              className="w-full h-full"
            />
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="text-lg font-semibold mb-3">Features Implemented</h3>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center">
                <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                Multi-layer canvas system
              </li>
              <li className="flex items-center">
                <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                Viewport state management
              </li>
              <li className="flex items-center">
                <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                Zoom and pan operations
              </li>
              <li className="flex items-center">
                <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                Real-time playhead animation
              </li>
              <li className="flex items-center">
                <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                Chop visualization
              </li>
              <li className="flex items-center">
                <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                Time scale display
              </li>
            </ul>
          </div>
          
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="text-lg font-semibold mb-3">Current Chops</h3>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {chops.map(chop => (
                <div 
                  key={chop.id}
                  className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm"
                >
                  <div className="flex items-center">
                    <div 
                      className="w-4 h-4 rounded mr-2"
                      style={{ backgroundColor: chop.color }}
                    ></div>
                    <span className="font-medium">{chop.padId}</span>
                  </div>
                  <div className="text-gray-600">
                    {chop.startTime.toFixed(1)}s - {chop.endTime.toFixed(1)}s
                    <span className="ml-2 text-xs">
                      ({(chop.endTime - chop.startTime).toFixed(1)}s)
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-blue-800 mb-2">
            Implementation Notes
          </h3>
          <div className="text-sm text-blue-700 space-y-1">
            <p>• This demo shows the core waveform visualization infrastructure</p>
            <p>• Canvas layers are properly initialized and managed</p>
            <p>• Viewport state management handles zoom and pan operations</p>
            <p>• Placeholder waveform pattern is displayed (actual audio analysis will be added in subsequent tasks)</p>
            <p>• All unit tests are passing with comprehensive coverage</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Export for use in development
if (typeof window !== 'undefined') {
  window.WaveformVisualizationDemo = WaveformVisualizationDemo;
}