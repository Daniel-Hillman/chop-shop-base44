import React, { useState } from 'react';
import SequencerPlayhead from './SequencerPlayhead';
import { ControlsAccordion, AccordionSection } from './ControlsAccordion';
import { Volume2, Shuffle, Settings, Music } from 'lucide-react';

/**
 * Demo component showcasing the new sequencer UI improvements
 */
export default function SequencerUIDemo() {
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [bpm, setBpm] = useState(120);

  // Simulate playback
  React.useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      setCurrentStep(prev => (prev + 1) % 16);
    }, (60 / bpm / 4) * 1000);

    return () => clearInterval(interval);
  }, [isPlaying, bpm]);

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-white mb-2">Sequencer UI Improvements</h2>
        <p className="text-white/60">Lightweight playhead tracker and modern accordion controls</p>
      </div>

      {/* Playhead Demo */}
      <div className="bg-black/20 backdrop-blur-lg border border-white/20 rounded-2xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Playhead Tracker</h3>
        
        <div className="space-y-4">
          {/* Step numbers */}
          <div className="flex gap-1">
            {Array.from({ length: 16 }, (_, i) => (
              <div key={i} className="flex-1 text-center text-xs text-white/40">
                {i + 1}
              </div>
            ))}
          </div>

          {/* Playhead */}
          <SequencerPlayhead
            currentStep={currentStep}
            totalSteps={16}
            isPlaying={isPlaying}
          />

          {/* Controls */}
          <div className="flex items-center gap-4 pt-4">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg
                transition-colors duration-200 flex items-center gap-2"
            >
              {isPlaying ? 'Pause' : 'Play'}
            </button>
            
            <div className="flex items-center gap-2">
              <label className="text-sm text-white/60">BPM:</label>
              <input
                type="range"
                min="60"
                max="200"
                value={bpm}
                onChange={(e) => setBpm(parseInt(e.target.value))}
                className="w-24"
              />
              <span className="text-sm text-white/80 w-8">{bpm}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Accordion Demo */}
      <div className="bg-black/20 backdrop-blur-lg border border-white/20 rounded-2xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Controls Accordion</h3>
        
        <ControlsAccordion>
          <AccordionSection title="Track Controls" icon={Volume2} defaultOpen={true}>
            <div className="space-y-3">
              <div className="bg-white/5 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <span className="text-sm text-white">Kick</span>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-white/60 w-12">Vol:</span>
                    <input type="range" className="flex-1 h-1" defaultValue="80" />
                    <span className="text-xs text-white/60 w-8">80%</span>
                  </div>
                  <div className="flex gap-2">
                    <button className="px-2 py-1 text-xs bg-gray-600 text-white rounded">M</button>
                    <button className="px-2 py-1 text-xs bg-gray-600 text-white rounded">S</button>
                  </div>
                </div>
              </div>
              
              <div className="bg-white/5 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-3 h-3 rounded-full bg-orange-500" />
                  <span className="text-sm text-white">Snare</span>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-white/60 w-12">Vol:</span>
                    <input type="range" className="flex-1 h-1" defaultValue="75" />
                    <span className="text-xs text-white/60 w-8">75%</span>
                  </div>
                  <div className="flex gap-2">
                    <button className="px-2 py-1 text-xs bg-gray-600 text-white rounded">M</button>
                    <button className="px-2 py-1 text-xs bg-gray-600 text-white rounded">S</button>
                  </div>
                </div>
              </div>
            </div>
          </AccordionSection>

          <AccordionSection title="Randomization" icon={Shuffle} defaultOpen={false}>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-white/60 mb-1">Velocity Randomization</label>
                <input type="range" className="w-full h-2" defaultValue="20" />
              </div>
              <div>
                <label className="block text-xs text-white/60 mb-1">Timing Randomization</label>
                <input type="range" className="w-full h-2" defaultValue="10" />
              </div>
            </div>
          </AccordionSection>

          <AccordionSection title="Pattern Settings" icon={Settings} defaultOpen={false}>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-white/60 mb-1">Pattern Name</label>
                <input 
                  type="text" 
                  defaultValue="Demo Pattern"
                  className="w-full px-2 py-1 bg-white/10 border border-white/20 rounded text-white text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-white/60 mb-1">Swing Amount</label>
                <input type="range" className="w-full h-2" defaultValue="0" />
              </div>
            </div>
          </AccordionSection>
        </ControlsAccordion>
      </div>
    </div>
  );
}