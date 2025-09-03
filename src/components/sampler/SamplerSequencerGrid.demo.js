import React, { useState, useEffect } from 'react';
import SamplerSequencerGrid from './SamplerSequencerGrid';

/**
 * Demo component for SamplerSequencerGrid
 * Shows various states and interactions
 */
export default function SamplerSequencerGridDemo() {
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [pattern, setPattern] = useState(null);

  // Mock chops data
  const mockChops = [
    { padId: 'A0', color: '#ef4444', startTime: 10.5, endTime: 12.3 },
    { padId: 'A1', color: '#f97316', startTime: 15.2, endTime: 17.1 },
    { padId: 'A2', color: '#f59e0b', startTime: 20.8, endTime: 22.5 },
    { padId: 'A3', color: '#eab308', startTime: 25.1, endTime: 27.0 },
    { padId: 'A4', color: '#84cc16', startTime: 30.3, endTime: 32.2 },
    { padId: 'A5', color: '#22c55e', startTime: 35.7, endTime: 37.4 }
  ];

  // Initialize pattern with some demo data
  useEffect(() => {
    const demoPattern = {
      id: 'demo_pattern',
      name: 'Demo Pattern',
      bpm: 120,
      tracks: Array.from({ length: 16 }, (_, trackIndex) => ({
        steps: Array.from({ length: 16 }, (_, stepIndex) => {
          // Create some interesting patterns
          if (trackIndex === 0) return stepIndex % 4 === 0; // Kick on 1, 5, 9, 13
          if (trackIndex === 1) return stepIndex % 8 === 4; // Snare on 5, 13
          if (trackIndex === 2) return stepIndex % 2 === 1; // Hi-hat on off-beats
          if (trackIndex === 3) return stepIndex === 7 || stepIndex === 15; // Crash on 8, 16
          return Math.random() > 0.8; // Random sparse pattern for others
        })
      }))
    };
    setPattern(demoPattern);
  }, []);

  // Simulate playback
  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      setCurrentStep(prev => (prev + 1) % 16);
    }, 125); // 120 BPM = 500ms per beat, 16th notes = 125ms

    return () => clearInterval(interval);
  }, [isPlaying]);

  // Handle step toggle
  const handleStepToggle = (trackIndex, stepIndex) => {
    setPattern(prev => {
      if (!prev) return prev;
      
      const newPattern = { ...prev };
      newPattern.tracks = [...prev.tracks];
      newPattern.tracks[trackIndex] = { ...prev.tracks[trackIndex] };
      newPattern.tracks[trackIndex].steps = [...prev.tracks[trackIndex].steps];
      newPattern.tracks[trackIndex].steps[stepIndex] = !prev.tracks[trackIndex].steps[stepIndex];
      
      return newPattern;
    });
  };

  // Control functions
  const togglePlayback = () => {
    setIsPlaying(!isPlaying);
    if (!isPlaying) {
      setCurrentStep(0);
    }
  };

  const clearPattern = () => {
    setPattern(prev => ({
      ...prev,
      tracks: Array.from({ length: 16 }, () => ({
        steps: Array.from({ length: 16 }, () => false)
      }))
    }));
  };

  const randomizePattern = () => {
    setPattern(prev => ({
      ...prev,
      tracks: Array.from({ length: 16 }, (_, trackIndex) => ({
        steps: Array.from({ length: 16 }, () => {
          // Higher probability for tracks with chops
          const hasChop = trackIndex < mockChops.length;
          return Math.random() > (hasChop ? 0.7 : 0.9);
        })
      }))
    }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-white">SamplerSequencerGrid Demo</h1>
          <p className="text-white/60">
            Interactive demo showing 16x16 grid with chop assignments and playback
          </p>
        </div>

        {/* Controls */}
        <div className="bg-black/20 backdrop-blur-lg border border-white/20 rounded-2xl p-6">
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <button
              onClick={togglePlayback}
              className={`px-6 py-2 rounded-lg font-medium transition-all duration-200 ${
                isPlaying
                  ? 'bg-red-500 hover:bg-red-600 text-white'
                  : 'bg-green-500 hover:bg-green-600 text-white'
              }`}
            >
              {isPlaying ? 'Stop' : 'Play'}
            </button>
            
            <button
              onClick={clearPattern}
              className="px-6 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-all duration-200"
            >
              Clear All
            </button>
            
            <button
              onClick={randomizePattern}
              className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-all duration-200"
            >
              Randomize
            </button>

            <div className="text-white/60 text-sm">
              Current Step: {currentStep + 1}/16
            </div>
          </div>
        </div>

        {/* Main Grid */}
        <SamplerSequencerGrid
          pattern={pattern}
          chops={mockChops}
          currentStep={currentStep}
          isPlaying={isPlaying}
          onStepToggle={handleStepToggle}
        />

        {/* Info Panel */}
        <div className="bg-black/20 backdrop-blur-lg border border-white/20 rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Demo Features</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-white/80">
            <div>
              <h4 className="font-medium text-white mb-2">Grid Features:</h4>
              <ul className="space-y-1">
                <li>• 16 tracks × 16 steps layout</li>
                <li>• Track assignment visual indicators</li>
                <li>• Current step highlighting during playback</li>
                <li>• Click steps to toggle on/off</li>
                <li>• Performance optimized rendering</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-white mb-2">Chop Integration:</h4>
              <ul className="space-y-1">
                <li>• First 6 tracks have chops assigned (cyan styling)</li>
                <li>• Tracks 7-16 are empty but can still be programmed</li>
                <li>• Active steps show chop colors</li>
                <li>• Hover effects for better interaction feedback</li>
                <li>• Tracks without chops use gray styling</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Pattern Info */}
        {pattern && (
          <div className="bg-black/20 backdrop-blur-lg border border-white/20 rounded-2xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Pattern Statistics</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              {pattern.tracks.slice(0, 8).map((track, index) => {
                const activeSteps = track.steps.filter(Boolean).length;
                const hasChop = index < mockChops.length;
                
                return (
                  <div
                    key={index}
                    className={`p-3 rounded-lg border ${
                      hasChop
                        ? 'border-cyan-400/40 bg-cyan-400/10'
                        : 'border-white/20 bg-white/5'
                    }`}
                  >
                    <div className={`font-medium ${hasChop ? 'text-cyan-300' : 'text-white/60'}`}>
                      Track {index + 1}
                    </div>
                    <div className="text-white/80">
                      {activeSteps}/16 steps
                    </div>
                    {hasChop && (
                      <div className="text-xs text-cyan-400 mt-1">
                        {mockChops[index].padId}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}