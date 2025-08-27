import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { RotateCcw, AlertCircle, FolderOpen, Save, Music, Volume2, Shuffle, Settings } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Alert, AlertDescription } from '../components/ui/alert';
import TransportControls from '../components/sequencer/TransportControls';
import StepResolutionSelector from '../components/sequencer/StepResolutionSelector';
import SequencerGrid from '../components/sequencer/SequencerGrid';
import TrackControls from '../components/sequencer/TrackControls';
import RandomizationControls from '../components/sequencer/RandomizationControls';
import { ControlsAccordion, AccordionSection } from '../components/sequencer/ControlsAccordion';

import PatternManagementDialog from '../components/sequencer/PatternManagementDialog';
import SongModeControls from '../components/sequencer/SongModeControls';
import SongArrangementView from '../components/sequencer/SongArrangementView';
import MidiExportDialog from '../components/sequencer/MidiExportDialog';
import { SequencerEngine } from '../services/sequencer/SequencerEngine';
import { PatternManager } from '../services/sequencer/PatternManager';
import { SampleManager } from '../services/sequencer/SampleManager';
import { SamplePlaybackEngine } from '../services/SamplePlaybackEngine';
import { PatternStorageService } from '../services/sequencer/PatternStorageService';
import { useSongManager } from '../hooks/sequencer/useSongManager';

import useSequencerMemoryManagement from '../hooks/useSequencerMemoryManagement';

// Sequencer Error Boundary Component
class SequencerErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Sequencer Error Boundary caught an error:', error, errorInfo);
    this.setState({
      error: error,
      errorInfo: errorInfo
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="bg-black/20 backdrop-blur-lg border border-red-400/20 rounded-2xl p-8 max-w-md mx-auto">
            <div className="flex items-center gap-3 mb-4">
              <AlertCircle className="w-6 h-6 text-red-400" />
              <h2 className="text-xl font-bold text-red-200">Sequencer Error</h2>
            </div>
            <p className="text-white/70 mb-4">
              Something went wrong with the sequencer. This error has been logged for debugging.
            </p>
            <Button
              onClick={() => this.setState({ hasError: false, error: null, errorInfo: null })}
              className="bg-red-500 hover:bg-red-600 text-white"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Reset Sequencer
            </Button>
            {process.env.NODE_ENV === 'development' && (
              <details className="mt-4 text-xs text-white/40">
                <summary className="cursor-pointer hover:text-white/60">
                  Error Details (Development)
                </summary>
                <pre className="mt-2 p-2 bg-black/30 rounded overflow-auto">
                  {this.state.error && this.state.error.toString()}
                  {this.state.errorInfo && this.state.errorInfo.componentStack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default function SequencerPage() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [bpm, setBpm] = useState(120);
  const [swing, setSwing] = useState(0);
  const [stepResolution, setStepResolution] = useState(16);
  const [currentStep, setCurrentStep] = useState(0);
  const [hasPatternData, setHasPatternData] = useState(false);
  const [currentPattern, setCurrentPattern] = useState(null);
  const [savedPatterns, setSavedPatterns] = useState([]);

  // Pattern management dialog state
  const [isPatternDialogOpen, setIsPatternDialogOpen] = useState(false);

  // Song mode state
  const [showSongArrangement, setShowSongArrangement] = useState(false);

  // MIDI export state
  const [isMidiExportOpen, setIsMidiExportOpen] = useState(false);

  // Sequencer services
  const [isInitialized, setIsInitialized] = useState(false);
  const sequencerEngineRef = useRef(null);
  const patternManagerRef = useRef(null);
  const sampleManagerRef = useRef(null);
  const samplePlaybackEngineRef = useRef(null);
  const audioContextRef = useRef(null);
  const patternStorageServiceRef = useRef(null);

  // Sample loading state
  const [sampleLoadingState, setSampleLoadingState] = useState({
    isLoading: false,
    isComplete: false,
    hasErrors: false
  });

  // Memory management - disabled by default for better performance
  const memoryManagement = useSequencerMemoryManagement({
    autoCleanupOnUnmount: true,
    monitoringEnabled: false, // Disabled for better performance
    alertsEnabled: false,     // Disabled for better performance
    cleanupThreshold: 0.8
  });

  // Song management
  const songManager = useSongManager({
    patternManager: patternManagerRef.current,
    sequencerEngine: sequencerEngineRef.current
  });

  // Initialize sequencer services with better performance
  useEffect(() => {
    let isMounted = true;
    
    const initializeSequencer = async () => {
      try {
        // Use setTimeout to avoid blocking the main thread
        await new Promise(resolve => setTimeout(resolve, 0));
        
        if (!isMounted) return;
        
        // Create audio context
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
        
        // Initialize services
        patternManagerRef.current = new PatternManager();
        samplePlaybackEngineRef.current = new SamplePlaybackEngine();
        sampleManagerRef.current = new SampleManager();
        sequencerEngineRef.current = new SequencerEngine();
        patternStorageServiceRef.current = new PatternStorageService();
        
        if (!isMounted) return;
        
        // Initialize SamplePlaybackEngine
        await samplePlaybackEngineRef.current.initializeAudioContext();
        
        if (!isMounted) return;
        
        // Initialize SampleManager with SamplePlaybackEngine
        sampleManagerRef.current.initialize(samplePlaybackEngineRef.current);
        
        // Initialize sequencer engine
        await sequencerEngineRef.current.initialize(audioContextRef.current, {
          patternManager: patternManagerRef.current,
          sampleManager: sampleManagerRef.current
        });
        
        if (!isMounted) return;
        
        // Set up state change callback
        sequencerEngineRef.current.onStateChange((state) => {
          if (!isMounted) return;
          setIsPlaying(state.isPlaying);
          setIsPaused(state.isPaused);
          setCurrentStep(state.currentStep);
          setBpm(state.bpm);
          setSwing(state.swing);
          setStepResolution(state.stepResolution);
        });
        
        // Create a default pattern for testing
        const defaultPattern = patternManagerRef.current.createPattern('Default Pattern', 8, stepResolution);
        patternManagerRef.current.setCurrentPattern(defaultPattern);
        setCurrentPattern(defaultPattern);
        setHasPatternData(true);
        
        // Load saved patterns (non-blocking)
        patternStorageServiceRef.current.getAllPatterns()
          .then(patterns => {
            if (isMounted) {
              setSavedPatterns(patterns);
            }
          })
          .catch(error => {
            console.warn('Failed to load saved patterns:', error);
          });
        
        setIsInitialized(true);
        
        // Start sample preloading in the background (non-blocking)
        setTimeout(async () => {
          if (!isMounted) return;
          
          try {
            setSampleLoadingState({ isLoading: true, isComplete: false, hasErrors: false });
            
            // Load the default drum kit directly
            await sampleManagerRef.current.loadSamplePack('default-drum-kit');
            
            if (!isMounted) return;
            
            // Assign samples to tracks
            if (defaultPattern && sampleManagerRef.current) {
              const sampleIds = ['kick_001', 'snare_001', 'hihat_001', 'openhat_001'];
              defaultPattern.tracks.forEach((track, index) => {
                if (index < sampleIds.length) {
                  // Assign sample to track in SampleManager
                  sampleManagerRef.current.assignSampleToTrack(track.id, sampleIds[index]);
                  // Also update the track's sampleId property
                  track.sampleId = sampleIds[index];
                }
              });
              
              // Add some default active steps for testing
              // Kick on beats 1, 5, 9, 13 (every 4 steps)
              if (defaultPattern.tracks[0]) {
                defaultPattern.tracks[0].steps[0].active = true;
                defaultPattern.tracks[0].steps[4].active = true;
                defaultPattern.tracks[0].steps[8].active = true;
                defaultPattern.tracks[0].steps[12].active = true;
              }
              
              // Snare on beats 5, 13 (backbeat)
              if (defaultPattern.tracks[1]) {
                defaultPattern.tracks[1].steps[4].active = true;
                defaultPattern.tracks[1].steps[12].active = true;
              }
              
              // Hi-hat on every other step
              if (defaultPattern.tracks[2]) {
                for (let i = 0; i < defaultPattern.tracks[2].steps.length; i += 2) {
                  defaultPattern.tracks[2].steps[i].active = true;
                }
              }
              
              // Update the pattern to reflect the changes
              if (isMounted) {
                patternManagerRef.current.setCurrentPattern(defaultPattern);
                setCurrentPattern(defaultPattern);
              }
            }
            
            setSampleLoadingState({ isLoading: false, isComplete: true, hasErrors: false });
          } catch (error) {
            console.warn('Sample preloading failed, but sequencer will continue:', error);
            setSampleLoadingState({ isLoading: false, isComplete: true, hasErrors: true });
          }
        }, 100); // Small delay to let UI render first
        
      } catch (error) {
        console.error('Failed to initialize sequencer:', error);
      }
    };

    initializeSequencer();

    // Cleanup on unmount
    return () => {
      isMounted = false;
      
      if (sequencerEngineRef.current) {
        sequencerEngineRef.current.destroy();
      }
      if (samplePlaybackEngineRef.current) {
        samplePlaybackEngineRef.current.cleanup();
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }
    };
  }, [stepResolution]);

  const handlePlay = async () => {
    if (!sequencerEngineRef.current) return;
    
    try {
      if (isPaused) {
        await sequencerEngineRef.current.resume();
      } else {
        await sequencerEngineRef.current.start();
      }
    } catch (error) {
      console.error('Error starting sequencer:', error);
    }
  };

  const handlePause = () => {
    if (!sequencerEngineRef.current) return;
    
    try {
      sequencerEngineRef.current.pause();
    } catch (error) {
      console.error('Error pausing sequencer:', error);
    }
  };

  const handleStop = () => {
    if (!sequencerEngineRef.current) return;
    
    try {
      sequencerEngineRef.current.stop();
    } catch (error) {
      console.error('Error stopping sequencer:', error);
    }
  };

  const handleBpmChange = (newBpm) => {
    if (!sequencerEngineRef.current) return;
    
    try {
      sequencerEngineRef.current.setBPM(newBpm);
    } catch (error) {
      console.error('Error setting BPM:', error);
    }
  };

  const handleSwingChange = (newSwing) => {
    if (!sequencerEngineRef.current) return;
    
    try {
      sequencerEngineRef.current.setSwing(newSwing);
    } catch (error) {
      console.error('Error setting swing:', error);
    }
  };

  const handleResolutionChange = (newResolution) => {
    if (!sequencerEngineRef.current) return;
    
    try {
      sequencerEngineRef.current.setStepResolution(newResolution);
    } catch (error) {
      console.error('Error setting step resolution:', error);
    }
  };

  const handleStepToggle = useCallback((trackId, stepIndex) => {
    if (!patternManagerRef.current) return;
    
    try {
      patternManagerRef.current.toggleStep(trackId, stepIndex);
      
      // Optimized state update - only update the specific step instead of entire pattern
      setCurrentPattern(prevPattern => {
        if (!prevPattern) return prevPattern;
        
        const newPattern = { ...prevPattern };
        newPattern.tracks = prevPattern.tracks.map(track => {
          if (track.id === trackId) {
            const newTrack = { ...track };
            newTrack.steps = [...track.steps];
            if (newTrack.steps[stepIndex]) {
              newTrack.steps[stepIndex] = {
                ...newTrack.steps[stepIndex],
                active: !newTrack.steps[stepIndex].active
              };
            }
            return newTrack;
          }
          return track;
        });
        
        return newPattern;
      });
    } catch (error) {
      console.error('Error toggling step:', error);
    }
  }, []);

  const handleStepVelocityChange = (trackId, stepIndex, velocity) => {
    if (!patternManagerRef.current) return;
    
    try {
      patternManagerRef.current.setStepVelocity(trackId, stepIndex, velocity);
      // Update current pattern state
      const updatedPattern = patternManagerRef.current.getCurrentPattern();
      setCurrentPattern(updatedPattern);
    } catch (error) {
      console.error('Error setting step velocity:', error);
    }
  };

  // Track control handlers
  const handleVolumeChange = useCallback((trackId, volume) => {
    if (!patternManagerRef.current) return;
    
    try {
      patternManagerRef.current.setTrackVolume(trackId, volume);
      
      // Optimized state update - only update the specific track
      setCurrentPattern(prevPattern => {
        if (!prevPattern) return prevPattern;
        
        const newPattern = { ...prevPattern };
        newPattern.tracks = prevPattern.tracks.map(track => {
          if (track.id === trackId) {
            return { ...track, volume };
          }
          return track;
        });
        
        return newPattern;
      });
    } catch (error) {
      console.error('Error setting track volume:', error);
    }
  }, []);

  const handleMuteToggle = useCallback((trackId) => {
    if (!patternManagerRef.current) return;
    
    try {
      patternManagerRef.current.toggleTrackMute(trackId);
      
      // Optimized state update - only update the specific track
      setCurrentPattern(prevPattern => {
        if (!prevPattern) return prevPattern;
        
        const newPattern = { ...prevPattern };
        newPattern.tracks = prevPattern.tracks.map(track => {
          if (track.id === trackId) {
            return { ...track, mute: !track.mute };
          }
          return track;
        });
        
        return newPattern;
      });
    } catch (error) {
      console.error('Error toggling track mute:', error);
    }
  }, []);

  const handleSoloToggle = useCallback((trackId) => {
    if (!patternManagerRef.current) return;
    
    try {
      patternManagerRef.current.toggleTrackSolo(trackId);
      
      // Optimized state update - update the specific track
      setCurrentPattern(prevPattern => {
        if (!prevPattern) return prevPattern;
        
        const newPattern = { ...prevPattern };
        newPattern.tracks = prevPattern.tracks.map(track => {
          if (track.id === trackId) {
            return { ...track, solo: !track.solo };
          }
          return track;
        });
        
        return newPattern;
      });
    } catch (error) {
      console.error('Error toggling track solo:', error);
    }
  }, []);

  const handleTrackNameChange = (trackId, newName) => {
    if (!patternManagerRef.current) return;
    
    try {
      patternManagerRef.current.setTrackName(trackId, newName);
      const updatedPattern = patternManagerRef.current.getCurrentPattern();
      setCurrentPattern(updatedPattern);
    } catch (error) {
      console.error('Error setting track name:', error);
    }
  };

  const handleTrackColorChange = (trackId, newColor) => {
    if (!patternManagerRef.current) return;
    
    try {
      patternManagerRef.current.setTrackColor(trackId, newColor);
      const updatedPattern = patternManagerRef.current.getCurrentPattern();
      setCurrentPattern(updatedPattern);
    } catch (error) {
      console.error('Error setting track color:', error);
    }
  };

  const handleRandomizationChange = (trackId, randomization) => {
    if (!patternManagerRef.current) return;
    
    try {
      patternManagerRef.current.setTrackRandomization(trackId, randomization);
      const updatedPattern = patternManagerRef.current.getCurrentPattern();
      setCurrentPattern(updatedPattern);
    } catch (error) {
      console.error('Error setting track randomization:', error);
    }
  };

  // Pattern management handlers
  const handlePatternLoad = async (patternId) => {
    if (!patternStorageServiceRef.current || !patternManagerRef.current) return;
    
    try {
      const pattern = await patternStorageServiceRef.current.loadPattern(patternId);
      patternManagerRef.current.setCurrentPattern(pattern);
      setCurrentPattern(pattern);
      setHasPatternData(true);
      
      // Update sequencer engine with new pattern settings
      if (sequencerEngineRef.current) {
        sequencerEngineRef.current.setBPM(pattern.bpm);
        sequencerEngineRef.current.setSwing(pattern.swing);
        sequencerEngineRef.current.setStepResolution(pattern.stepResolution);
      }
    } catch (error) {
      console.error('Error loading pattern:', error);
      throw error;
    }
  };

  const handlePatternSave = async (pattern) => {
    if (!patternStorageServiceRef.current) return;
    
    try {
      const patternId = await patternStorageServiceRef.current.savePattern(pattern);
      
      // Update saved patterns list
      const patterns = await patternStorageServiceRef.current.getAllPatterns();
      setSavedPatterns(patterns);
      
      return patternId;
    } catch (error) {
      console.error('Error saving pattern:', error);
      throw error;
    }
  };

  const handlePatternDuplicate = async (patternId, newName) => {
    if (!patternStorageServiceRef.current || !patternManagerRef.current) return;
    
    try {
      const originalPattern = await patternStorageServiceRef.current.loadPattern(patternId);
      const duplicatedPattern = {
        ...originalPattern,
        id: `pattern_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: newName,
        metadata: {
          ...originalPattern.metadata,
          created: new Date().toISOString(),
          modified: new Date().toISOString()
        }
      };
      
      await patternStorageServiceRef.current.savePattern(duplicatedPattern);
      
      // Update saved patterns list
      const patterns = await patternStorageServiceRef.current.getAllPatterns();
      setSavedPatterns(patterns);
      
      return duplicatedPattern;
    } catch (error) {
      console.error('Error duplicating pattern:', error);
      throw error;
    }
  };

  const handlePatternDelete = async (patternId) => {
    if (!patternStorageServiceRef.current) return;
    
    try {
      await patternStorageServiceRef.current.deletePattern(patternId);
      
      // Update saved patterns list
      const patterns = await patternStorageServiceRef.current.getAllPatterns();
      setSavedPatterns(patterns);
      
      // If the deleted pattern was the current one, clear it
      if (currentPattern?.id === patternId) {
        const defaultPattern = patternManagerRef.current.createPattern('Default Pattern', 8, stepResolution);
        patternManagerRef.current.setCurrentPattern(defaultPattern);
        setCurrentPattern(defaultPattern);
      }
      
      return true;
    } catch (error) {
      console.error('Error deleting pattern:', error);
      throw error;
    }
  };

  // Song management handlers
  const handleSongModeToggle = (enabled) => {
    songManager.toggleSongMode(enabled);
  };

  const handleSongLoad = async (songId) => {
    try {
      await songManager.loadSong(songId);
    } catch (error) {
      console.error('Error loading song:', error);
    }
  };

  const handleSongCreate = async (songData) => {
    try {
      const song = await songManager.createSong(songData);
      if (song) {
        await songManager.loadSong(song.id);
      }
    } catch (error) {
      console.error('Error creating song:', error);
    }
  };

  const handleSongDelete = (songId) => {
    try {
      songManager.deleteSong(songId);
    } catch (error) {
      console.error('Error deleting song:', error);
    }
  };

  const handleJumpToSection = async (sectionIndex) => {
    try {
      await songManager.jumpToSection(sectionIndex);
    } catch (error) {
      console.error('Error jumping to section:', error);
    }
  };

  const handleSectionUpdate = (index, updates) => {
    try {
      songManager.updateSection(index, updates);
    } catch (error) {
      console.error('Error updating section:', error);
    }
  };

  const handleSectionMove = (fromIndex, toIndex) => {
    try {
      songManager.movePatternInSong(fromIndex, toIndex);
    } catch (error) {
      console.error('Error moving section:', error);
    }
  };

  const handleSectionAdd = (patternId, options) => {
    try {
      songManager.addPatternToSong(patternId, options);
    } catch (error) {
      console.error('Error adding section:', error);
    }
  };

  const handleSectionRemove = (index) => {
    try {
      songManager.removePatternFromSong(index);
    } catch (error) {
      console.error('Error removing section:', error);
    }
  };

  return (
    <SequencerErrorBoundary>
      <div className="space-y-6">
        {/* Header Section */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="bg-black/20 backdrop-blur-lg border border-white/20 rounded-2xl shadow-lg p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-white">Drum Sequencer</h1>
            <div className="flex items-center gap-4">
              {/* Sample Loading Indicator */}
              <div className="text-sm text-white/60">
                {sampleLoadingState.isLoading ? 'Loading samples...' : 
                 sampleLoadingState.hasErrors ? 'Samples loaded (with fallbacks)' : 
                 sampleLoadingState.isComplete ? 'Samples ready' : 'Initializing...'}
              </div>
              
              {/* Status Indicator */}
              <div className="flex items-center gap-2 text-sm text-white/60">
                <div className={`w-2 h-2 rounded-full ${
                  isInitialized && sampleLoadingState.isComplete ? 'bg-green-400' : 
                  sampleLoadingState.isLoading ? 'bg-blue-400' : 'bg-yellow-400'
                }`}></div>
                <span>
                  {!isInitialized ? 'Initializing...' :
                   sampleLoadingState.isLoading ? 'Loading Samples...' :
                   sampleLoadingState.hasErrors ? 'Ready (with fallbacks)' : 'Ready'}
                </span>
              </div>
            </div>
          </div>

          {/* Transport Controls */}
          <TransportControls
            isPlaying={isPlaying}
            isPaused={isPaused}
            bpm={bpm}
            swing={swing}
            isInitialized={isInitialized}
            onPlay={handlePlay}
            onPause={handlePause}
            onStop={handleStop}
            onBpmChange={handleBpmChange}
            onSwingChange={handleSwingChange}
          />

          {/* Current Step Indicator */}
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-sm text-white/60">Step:</span>
            <span className="text-sm font-mono text-cyan-400">{currentStep + 1}/{stepResolution}</span>
          </div>
        </motion.div>

        {/* Song Mode Controls */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="bg-black/20 backdrop-blur-lg border border-white/20 rounded-2xl shadow-lg p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <Music className="w-5 h-5" />
              Song Mode
            </h2>
            <Button
              onClick={() => setShowSongArrangement(!showSongArrangement)}
              className="bg-white/10 hover:bg-white/20 text-white text-sm"
            >
              {showSongArrangement ? 'Hide' : 'Show'} Arrangement
            </Button>
          </div>

          <SongModeControls
            songState={songManager.songState}
            songs={songManager.songs}
            patterns={savedPatterns}
            onSongModeToggle={handleSongModeToggle}
            onSongLoad={handleSongLoad}
            onSongCreate={handleSongCreate}
            onSongDelete={handleSongDelete}
            onJumpToSection={handleJumpToSection}
          />

          {/* Song Arrangement View */}
          {showSongArrangement && songManager.songState.currentSong && (
            <div className="mt-6 border-t border-white/10 pt-6">
              <SongArrangementView
                song={songManager.songState.currentSong}
                patterns={savedPatterns}
                currentSectionIndex={songManager.songState.currentSongPosition}
                onSectionSelect={handleJumpToSection}
                onSectionUpdate={handleSectionUpdate}
                onSectionMove={handleSectionMove}
                onSectionAdd={handleSectionAdd}
                onSectionRemove={handleSectionRemove}
              />
            </div>
          )}
        </motion.div>

        {/* Main Sequencer Grid Layout */}
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          {/* Sequencer Grid - Takes up most space */}
          <div className="xl:col-span-3">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="bg-black/20 backdrop-blur-lg border border-white/20 rounded-2xl shadow-lg p-6"
            >
              <SequencerGrid
                pattern={currentPattern}
                stepResolution={stepResolution}
                sequencerEngine={sequencerEngineRef.current}
                onStepToggle={handleStepToggle}
                onStepVelocityChange={handleStepVelocityChange}
              />
            </motion.div>
          </div>

          {/* Controls Sidebar */}
          <div>
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <ControlsAccordion>
                {/* Track Controls */}
                <AccordionSection
                  title="Track Controls"
                  icon={Volume2}
                  defaultOpen={true}
                >
                  <TrackControls
                    tracks={currentPattern?.tracks || []}
                    onVolumeChange={handleVolumeChange}
                    onMuteToggle={handleMuteToggle}
                    onSoloToggle={handleSoloToggle}
                    onTrackNameChange={handleTrackNameChange}
                    onTrackColorChange={handleTrackColorChange}
                  />
                </AccordionSection>

                {/* Randomization Controls */}
                <AccordionSection
                  title="Randomization"
                  icon={Shuffle}
                  defaultOpen={false}
                >
                  <RandomizationControls
                    tracks={currentPattern?.tracks || []}
                    onRandomizationChange={handleRandomizationChange}
                  />
                </AccordionSection>

                {/* Pattern Settings */}
                <AccordionSection
                  title="Pattern Settings"
                  icon={Settings}
                  defaultOpen={false}
                >
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-medium text-white/60 mb-2">
                        Pattern Name
                      </label>
                      <input
                        type="text"
                        value={currentPattern?.name || 'Untitled Pattern'}
                        onChange={(e) => {
                          if (currentPattern) {
                            currentPattern.name = e.target.value;
                            setCurrentPattern({...currentPattern});
                          }
                        }}
                        className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded
                          text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400/50"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-xs font-medium text-white/60 mb-2">
                        BPM: {bpm}
                      </label>
                      <input
                        type="range"
                        min="60"
                        max="200"
                        value={bpm}
                        onChange={(e) => handleBpmChange(parseInt(e.target.value))}
                        className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer"
                      />
                    </div>
                  </div>
                </AccordionSection>
              </ControlsAccordion>
            </motion.div>
          </div>

            {/* Pattern Controls */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="bg-black/20 backdrop-blur-lg border border-white/20 rounded-2xl shadow-lg p-6"
            >
              <h3 className="text-lg font-semibold text-white mb-4">Pattern</h3>
              <div className="space-y-4">
                {/* Current Pattern Info */}
                {currentPattern && (
                  <div className="bg-white/5 border border-white/10 rounded-lg p-3">
                    <div className="text-sm font-medium text-white truncate mb-1">
                      {currentPattern.name}
                    </div>
                    <div className="text-xs text-white/70">
                      {currentPattern.bpm} BPM • {currentPattern.swing}% swing
                    </div>
                  </div>
                )}

                {/* Pattern Management Buttons */}
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    onClick={() => setIsPatternDialogOpen(true)}
                    disabled={!isInitialized}
                    className="bg-blue-600 hover:bg-blue-700 text-white text-sm"
                  >
                    <FolderOpen className="w-4 h-4 mr-1" />
                    Load
                  </Button>
                  <Button
                    onClick={() => setIsPatternDialogOpen(true)}
                    disabled={!isInitialized || !currentPattern}
                    className="bg-green-600 hover:bg-green-700 text-white text-sm"
                  >
                    <Save className="w-4 h-4 mr-1" />
                    Save
                  </Button>
                </div>

                {/* MIDI Export Button */}
                <Button
                  onClick={() => setIsMidiExportOpen(true)}
                  disabled={!isInitialized || (!currentPattern && !songManager.songState.currentSong)}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white text-sm"
                >
                  <Music className="w-4 h-4 mr-1" />
                  Export MIDI
                </Button>

                {/* Step Resolution Selector */}
                <StepResolutionSelector
                  resolution={stepResolution}
                  onResolutionChange={handleResolutionChange}
                  isInitialized={isInitialized}
                  hasPatternData={hasPatternData}
                />
              </div>
            </motion.div>
          </div>
        </div>

        {/* Development Notice */}
        {!isInitialized && (
          <Alert className="border-yellow-400/20 bg-yellow-400/10">
            <AlertCircle className="h-4 w-4 text-yellow-400" />
            <AlertDescription className="text-yellow-200">
              Sequencer is initializing. This is a placeholder interface for development and testing.
            </AlertDescription>
          </Alert>
        )}

        {/* Pattern Management Dialog */}
        <PatternManagementDialog
          isOpen={isPatternDialogOpen}
          onClose={() => setIsPatternDialogOpen(false)}
          onPatternLoad={handlePatternLoad}
          onPatternSave={handlePatternSave}
          onPatternDuplicate={handlePatternDuplicate}
          onPatternDelete={handlePatternDelete}
          currentPattern={currentPattern}
          patterns={savedPatterns}
        />

        {/* MIDI Export Dialog */}
        <MidiExportDialog
          isOpen={isMidiExportOpen}
          onClose={() => setIsMidiExportOpen(false)}
          pattern={currentPattern}
          song={songManager.songState.currentSong}
          patterns={savedPatterns}
        />
      </div>
    </SequencerErrorBoundary>
  );
}