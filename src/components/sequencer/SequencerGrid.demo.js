/**
 * Demo script for SequencerGrid component
 * This demonstrates the sequencer grid functionality
 */

import React from 'react';
import { createRoot } from 'react-dom/client';
import SequencerGrid from './SequencerGrid';
import { SequencerEngine } from '../../services/sequencer/SequencerEngine';
import { PatternManager } from '../../services/sequencer/PatternManager';
import { SampleManager } from '../../services/sequencer/SampleManager';

// Demo component
function SequencerGridDemo() {
  const [sequencerEngine, setSequencerEngine] = React.useState(null);
  const [patternManager, setPatternManager] = React.useState(null);
  const [currentPattern, setCurrentPattern] = React.useState(null);
  const [isInitialized, setIsInitialized] = React.useState(false);

  React.useEffect(() => {
    const initDemo = async () => {
      try {
        // Create audio context
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        
        // Initialize services
        const pm = new PatternManager();
        const sm = new SampleManager();
        const se = new SequencerEngine();
        
        // Initialize sequencer engine
        await se.initialize(audioContext, {
          patternManager: pm,
          sampleManager: sm
        });
        
        // Create demo pattern
        const pattern = pm.createPattern('Demo Pattern', 8, 16);
        
        // Add some demo steps
        pm.setCurrentPattern(pattern);
        pm.toggleStep('track_0', 0); // Kick on 1
        pm.toggleStep('track_0', 4); // Kick on 5
        pm.toggleStep('track_0', 8); // Kick on 9
        pm.toggleStep('track_0', 12); // Kick on 13
        
        pm.toggleStep('track_1', 4); // Snare on 5
        pm.toggleStep('track_1', 12); // Snare on 13
        
        pm.toggleStep('track_2', 2); // Hi-hat on 3
        pm.toggleStep('track_2', 6); // Hi-hat on 7
        pm.toggleStep('track_2', 10); // Hi-hat on 11
        pm.toggleStep('track_2', 14); // Hi-hat on 15
        
        const updatedPattern = pm.getCurrentPattern();
        
        setSequencerEngine(se);
        setPatternManager(pm);
        setCurrentPattern(updatedPattern);
        setIsInitialized(true);
        
        console.log('SequencerGrid demo initialized successfully');
        console.log('Pattern:', updatedPattern);
        
      } catch (error) {
        console.error('Failed to initialize demo:', error);
      }
    };

    initDemo();
  }, []);

  const handleStepToggle = (trackId, stepIndex) => {
    if (!patternManager) return;
    
    try {
      patternManager.toggleStep(trackId, stepIndex);
      const updatedPattern = patternManager.getCurrentPattern();
      setCurrentPattern(updatedPattern);
      console.log(`Toggled step ${stepIndex} on track ${trackId}`);
    } catch (error) {
      console.error('Error toggling step:', error);
    }
  };

  const handleStepVelocityChange = (trackId, stepIndex, velocity) => {
    if (!patternManager) return;
    
    try {
      patternManager.setStepVelocity(trackId, stepIndex, velocity);
      const updatedPattern = patternManager.getCurrentPattern();
      setCurrentPattern(updatedPattern);
      console.log(`Changed velocity for step ${stepIndex} on track ${trackId} to ${velocity}`);
    } catch (error) {
      console.error('Error setting step velocity:', error);
    }
  };

  const handlePlay = async () => {
    if (!sequencerEngine) return;
    
    try {
      await sequencerEngine.start();
      console.log('Sequencer started');
    } catch (error) {
      console.error('Error starting sequencer:', error);
    }
  };

  const handleStop = () => {
    if (!sequencerEngine) return;
    
    try {
      sequencerEngine.stop();
      console.log('Sequencer stopped');
    } catch (error) {
      console.error('Error stopping sequencer:', error);
    }
  };

  if (!isInitialized) {
    return (
      <div style={{ padding: '20px', color: 'white', backgroundColor: '#1a1a1a', minHeight: '100vh' }}>
        <h1>SequencerGrid Demo</h1>
        <p>Initializing...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', color: 'white', backgroundColor: '#1a1a1a', minHeight: '100vh' }}>
      <h1>SequencerGrid Demo</h1>
      
      <div style={{ marginBottom: '20px' }}>
        <button 
          onClick={handlePlay}
          style={{ 
            padding: '10px 20px', 
            marginRight: '10px', 
            backgroundColor: '#22c55e', 
            color: 'white', 
            border: 'none', 
            borderRadius: '5px',
            cursor: 'pointer'
          }}
        >
          Play
        </button>
        <button 
          onClick={handleStop}
          style={{ 
            padding: '10px 20px', 
            backgroundColor: '#ef4444', 
            color: 'white', 
            border: 'none', 
            borderRadius: '5px',
            cursor: 'pointer'
          }}
        >
          Stop
        </button>
      </div>

      <div style={{ maxWidth: '1200px' }}>
        <SequencerGrid
          pattern={currentPattern}
          stepResolution={16}
          sequencerEngine={sequencerEngine}
          onStepToggle={handleStepToggle}
          onStepVelocityChange={handleStepVelocityChange}
        />
      </div>

      <div style={{ marginTop: '20px', fontSize: '14px', color: '#888' }}>
        <h3>Instructions:</h3>
        <ul>
          <li>Click on steps to toggle them on/off</li>
          <li>Right-click or double-click active steps to edit velocity</li>
          <li>Hold Ctrl/Cmd and click to select multiple steps</li>
          <li>Press Space to toggle all selected steps</li>
          <li>Press Escape to clear selection</li>
          <li>Click Play to start the sequencer and see the playhead animation</li>
        </ul>
      </div>
    </div>
  );
}

// Export for use in other demos or tests
export default SequencerGridDemo;

// Auto-run demo if this file is loaded directly
if (typeof window !== 'undefined' && window.location.pathname.includes('demo')) {
  const container = document.getElementById('root') || document.body;
  const root = createRoot(container);
  root.render(<SequencerGridDemo />);
}