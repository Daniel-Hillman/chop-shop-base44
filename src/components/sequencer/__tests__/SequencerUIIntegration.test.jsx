import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SequencerPage } from '../../../pages/SequencerPage.jsx';

// Mock the sequencer services
vi.mock('../../../services/sequencer/SequencerEngine.js', () => ({
  SequencerEngine: vi.fn().mockImplementation(() => ({
    initialize: vi.fn().mockResolvedValue(undefined),
    start: vi.fn().mockResolvedValue(undefined),
    stop: vi.fn(),
    pause: vi.fn(),
    resume: vi.fn().mockResolvedValue(undefined),
    setBPM: vi.fn(),
    setSwing: vi.fn(),
    setStepResolution: vi.fn(),
    getState: vi.fn(() => ({
      isPlaying: false,
      isPaused: false,
      currentStep: 0,
      bpm: 120,
      swing: 0,
      stepResolution: 16,
      nextStepTime: 0,
      isInitialized: true,
      performanceStats: {
        totalSteps: 0,
        averageLatency: 0,
        maxLatency: 0,
        timingDrift: 0
      }
    })),
    onStep: vi.fn(),
    onStateChange: vi.fn(),
    removeStepCallback: vi.fn(),
    removeStateChangeCallback: vi.fn(),
    destroy: vi.fn(),
    isPlaying: false,
    isPaused: false,
    currentStep: 0,
    bpm: 120,
    swing: 0,
    stepResolution: 16
  }))
}));

vi.mock('../../../services/sequencer/PatternManager.js', () => ({
  PatternManager: vi.fn().mockImplementation(() => ({
    createPattern: vi.fn((name, tracks = 8, steps = 16) => ({
      id: `pattern_${Date.now()}`,
      name,
      bpm: 120,
      swing: 0,
      stepResolution: 16,
      tracks: Array.from({ length: tracks }, (_, i) => ({
        id: `track_${i}`,
        name: ['Kick', 'Snare', 'Hi-Hat', 'Open Hat', 'Crash', 'Ride', 'Clap', 'Perc'][i] || `Track ${i + 1}`,
        sampleId: null,
        volume: 0.8,
        mute: false,
        solo: false,
        color: '#06b6d4',
        steps: Array.from({ length: steps }, () => ({ active: false, velocity: 0.8 })),
        randomization: {
          velocity: { enabled: false, amount: 0 },
          timing: { enabled: false, amount: 0 }
        }
      })),
      metadata: {
        created: new Date(),
        modified: new Date()
      }
    })),
    loadPattern: vi.fn().mockResolvedValue(undefined),
    savePattern: vi.fn().mockResolvedValue('pattern_id'),
    getCurrentPattern: vi.fn(() => null),
    getAllPatterns: vi.fn(() => []),
    toggleStep: vi.fn(),
    setStepVelocity: vi.fn(),
    setTrackVolume: vi.fn(),
    toggleTrackMute: vi.fn(),
    toggleTrackSolo: vi.fn(),
    setTrackName: vi.fn(),
    setTrackColor: vi.fn(),
    setTrackRandomization: vi.fn(),
    changeStepResolution: vi.fn(),
    clearPattern: vi.fn(),
    duplicatePattern: vi.fn(),
    deletePattern: vi.fn().mockResolvedValue(true),
    validatePattern: vi.fn(() => true)
  }))
}));

vi.mock('../../../services/sequencer/SampleManager.js', () => ({
  SampleManager: vi.fn().mockImplementation(() => ({
    initialize: vi.fn(),
    loadSamplePack: vi.fn().mockResolvedValue(undefined),
    preloadSamples: vi.fn().mockResolvedValue(undefined),
    getSample: vi.fn((id) => ({
      id,
      name: `Sample ${id}`,
      filename: `/samples/${id}.wav`,
      audioBuffer: {},
      metadata: { duration: 1.0, sampleRate: 44100 },
      tags: []
    })),
    getAllSamples: vi.fn(() => [
      { id: 'kick_001', name: 'Kick 001', tags: ['kick'] },
      { id: 'snare_001', name: 'Snare 001', tags: ['snare'] },
      { id: 'hihat_001', name: 'Hi-Hat 001', tags: ['hihat'] }
    ]),
    assignSampleToTrack: vi.fn(() => true),
    getTrackSample: vi.fn(() => null),
    getTrackAssignments: vi.fn(() => new Map()),
    removeTrackAssignment: vi.fn(() => true),
    playSample: vi.fn().mockResolvedValue(undefined),
    getLoadingProgress: vi.fn(() => ({
      total: 3,
      loaded: 3,
      percentage: 100,
      isLoading: false
    })),
    isSamplePreloaded: vi.fn(() => true),
    isLoadingSamples: vi.fn(() => false),
    clearSamples: vi.fn(),
    destroy: vi.fn()
  }))
}));

// Mock Web Audio API
global.AudioContext = vi.fn().mockImplementation(() => ({
  state: 'running',
  sampleRate: 44100,
  currentTime: 0,
  resume: vi.fn().mockResolvedValue(undefined),
  close: vi.fn().mockResolvedValue(undefined),
  createGain: vi.fn(() => ({
    connect: vi.fn(),
    disconnect: vi.fn(),
    gain: { value: 1 }
  }))
}));

// Mock SamplePlaybackEngine
vi.mock('../../../services/SamplePlaybackEngine.js', () => ({
  SamplePlaybackEngine: vi.fn().mockImplementation(() => ({
    initialize: vi.fn().mockResolvedValue(undefined),
    preloadSample: vi.fn().mockResolvedValue(undefined),
    playSample: vi.fn().mockResolvedValue(undefined),
    loadSample: vi.fn().mockResolvedValue({}),
    isLoaded: vi.fn(() => true),
    destroy: vi.fn()
  }))
}));

describe('Sequencer UI Integration Tests', () => {
  let user;

  beforeEach(() => {
    user = userEvent.setup();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Complete Sequencer Workflow', () => {
    it('should render sequencer page with all components', async () => {
      render(<SequencerPage />);
      
      // Wait for initialization
      await waitFor(() => {
        expect(screen.getByTestId('sequencer-page')).toBeInTheDocument();
      });
      
      // Check for main components
      expect(screen.getByTestId('transport-controls')).toBeInTheDocument();
      expect(screen.getByTestId('step-resolution-selector')).toBeInTheDocument();
      expect(screen.getByTestId('sequencer-grid')).toBeInTheDocument();
      expect(screen.getByTestId('track-controls')).toBeInTheDocument();
    });

    it('should handle complete pattern creation and playback workflow', async () => {
      render(<SequencerPage />);
      
      await waitFor(() => {
        expect(screen.getByTestId('sequencer-page')).toBeInTheDocument();
      });
      
      // Step 1: Create new pattern
      const newPatternButton = screen.getByRole('button', { name: /new pattern/i });
      await user.click(newPatternButton);
      
      // Fill in pattern name
      const patternNameInput = screen.getByLabelText(/pattern name/i);
      await user.clear(patternNameInput);
      await user.type(patternNameInput, 'Test Beat');
      
      const createButton = screen.getByRole('button', { name: /create/i });
      await user.click(createButton);
      
      // Step 2: Program some steps
      const kickSteps = screen.getAllByTestId(/sequencer-step-track_0-/);
      await user.click(kickSteps[0]); // Step 1
      await user.click(kickSteps[8]); // Step 9
      
      const snareSteps = screen.getAllByTestId(/sequencer-step-track_1-/);
      await user.click(snareSteps[4]); // Step 5
      await user.click(snareSteps[12]); // Step 13
      
      // Step 3: Adjust BPM
      const bpmInput = screen.getByLabelText(/bpm/i);
      await user.clear(bpmInput);
      await user.type(bpmInput, '140');
      
      // Step 4: Add some swing
      const swingSlider = screen.getByLabelText(/swing/i);
      fireEvent.change(swingSlider, { target: { value: '25' } });
      
      // Step 5: Start playback
      const playButton = screen.getByRole('button', { name: /play/i });
      await user.click(playButton);
      
      // Verify playback started
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /pause/i })).toBeInTheDocument();
      });
      
      // Step 6: Stop playback
      const stopButton = screen.getByRole('button', { name: /stop/i });
      await user.click(stopButton);
      
      // Verify playback stopped
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /play/i })).toBeInTheDocument();
      });
    });

    it('should handle real-time pattern editing during playback', async () => {
      render(<SequencerPage />);
      
      await waitFor(() => {
        expect(screen.getByTestId('sequencer-page')).toBeInTheDocument();
      });
      
      // Start with a basic pattern
      const kickSteps = screen.getAllByTestId(/sequencer-step-track_0-/);
      await user.click(kickSteps[0]);
      await user.click(kickSteps[8]);
      
      // Start playback
      const playButton = screen.getByRole('button', { name: /play/i });
      await user.click(playButton);
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /pause/i })).toBeInTheDocument();
      });
      
      // Add steps during playback
      const hihatSteps = screen.getAllByTestId(/sequencer-step-track_2-/);
      await user.click(hihatSteps[2]);
      await user.click(hihatSteps[6]);
      await user.click(hihatSteps[10]);
      await user.click(hihatSteps[14]);
      
      // Adjust track volume during playback
      const volumeSliders = screen.getAllByLabelText(/volume/i);
      fireEvent.change(volumeSliders[0], { target: { value: '0.6' } });
      
      // Mute a track during playback
      const muteButtons = screen.getAllByRole('button', { name: /mute/i });
      await user.click(muteButtons[2]);
      
      // Change BPM during playback
      const bpmInput = screen.getByLabelText(/bpm/i);
      await user.clear(bpmInput);
      await user.type(bpmInput, '160');
      
      // Verify playback continues
      expect(screen.getByRole('button', { name: /pause/i })).toBeInTheDocument();
    });

    it('should handle step resolution changes with pattern preservation', async () => {
      render(<SequencerPage />);
      
      await waitFor(() => {
        expect(screen.getByTestId('sequencer-page')).toBeInTheDocument();
      });
      
      // Program pattern at 16th note resolution
      const kickSteps = screen.getAllByTestId(/sequencer-step-track_0-/);
      await user.click(kickSteps[0]); // Beat 1
      await user.click(kickSteps[4]); // Beat 2
      await user.click(kickSteps[8]); // Beat 3
      await user.click(kickSteps[12]); // Beat 4
      
      // Change to 32nd note resolution
      const resolution32Button = screen.getByRole('radio', { name: /32nd/i });
      await user.click(resolution32Button);
      
      // Grid should now show 32 steps
      await waitFor(() => {
        const newKickSteps = screen.getAllByTestId(/sequencer-step-track_0-/);
        expect(newKickSteps).toHaveLength(32);
      });
      
      // Original pattern should be preserved (steps 0, 8, 16, 24)
      const newKickSteps = screen.getAllByTestId(/sequencer-step-track_0-/);
      expect(newKickSteps[0]).toHaveClass('active');
      expect(newKickSteps[8]).toHaveClass('active');
      expect(newKickSteps[16]).toHaveClass('active');
      expect(newKickSteps[24]).toHaveClass('active');
      
      // Change to 8th note resolution
      const resolution8Button = screen.getByRole('radio', { name: /8th/i });
      await user.click(resolution8Button);
      
      // Grid should now show 8 steps
      await waitFor(() => {
        const finalKickSteps = screen.getAllByTestId(/sequencer-step-track_0-/);
        expect(finalKickSteps).toHaveLength(8);
      });
      
      // Pattern should be downsampled appropriately
      const finalKickSteps = screen.getAllByTestId(/sequencer-step-track_0-/);
      expect(finalKickSteps[0]).toHaveClass('active');
      expect(finalKickSteps[2]).toHaveClass('active');
      expect(finalKickSteps[4]).toHaveClass('active');
      expect(finalKickSteps[6]).toHaveClass('active');
    });

    it('should handle track control interactions', async () => {
      render(<SequencerPage />);
      
      await waitFor(() => {
        expect(screen.getByTestId('sequencer-page')).toBeInTheDocument();
      });
      
      // Test volume control
      const volumeSliders = screen.getAllByLabelText(/volume/i);
      fireEvent.change(volumeSliders[0], { target: { value: '0.5' } });
      
      // Test mute button
      const muteButtons = screen.getAllByRole('button', { name: /mute/i });
      await user.click(muteButtons[0]);
      expect(muteButtons[0]).toHaveClass('active');
      
      // Test solo button
      const soloButtons = screen.getAllByRole('button', { name: /solo/i });
      await user.click(soloButtons[1]);
      expect(soloButtons[1]).toHaveClass('active');
      
      // Test track name editing
      const trackNames = screen.getAllByDisplayValue(/kick|snare|hi-hat/i);
      await user.clear(trackNames[0]);
      await user.type(trackNames[0], 'Custom Kick');
      fireEvent.blur(trackNames[0]);
      
      // Test randomization controls
      const randomizationButtons = screen.getAllByRole('button', { name: /randomization/i });
      await user.click(randomizationButtons[0]);
      
      // Randomization panel should open
      await waitFor(() => {
        expect(screen.getByText(/velocity randomization/i)).toBeInTheDocument();
      });
      
      // Adjust velocity randomization
      const velocityRandomSlider = screen.getByLabelText(/velocity amount/i);
      fireEvent.change(velocityRandomSlider, { target: { value: '25' } });
      
      // Enable timing randomization
      const timingRandomCheckbox = screen.getByLabelText(/timing randomization/i);
      await user.click(timingRandomCheckbox);
      
      const timingRandomSlider = screen.getByLabelText(/timing amount/i);
      fireEvent.change(timingRandomSlider, { target: { value: '15' } });
    });

    it('should handle pattern management workflow', async () => {
      render(<SequencerPage />);
      
      await waitFor(() => {
        expect(screen.getByTestId('sequencer-page')).toBeInTheDocument();
      });
      
      // Create and program a pattern
      const newPatternButton = screen.getByRole('button', { name: /new pattern/i });
      await user.click(newPatternButton);
      
      const patternNameInput = screen.getByLabelText(/pattern name/i);
      await user.type(patternNameInput, 'My Beat');
      
      const createButton = screen.getByRole('button', { name: /create/i });
      await user.click(createButton);
      
      // Program some steps
      const kickSteps = screen.getAllByTestId(/sequencer-step-track_0-/);
      await user.click(kickSteps[0]);
      await user.click(kickSteps[8]);
      
      // Save pattern
      const saveButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveButton);
      
      // Verify save confirmation
      await waitFor(() => {
        expect(screen.getByText(/pattern saved/i)).toBeInTheDocument();
      });
      
      // Load patterns dialog
      const loadButton = screen.getByRole('button', { name: /load/i });
      await user.click(loadButton);
      
      // Pattern list should be visible
      await waitFor(() => {
        expect(screen.getByText(/select pattern/i)).toBeInTheDocument();
      });
      
      // Duplicate pattern
      const duplicateButton = screen.getByRole('button', { name: /duplicate/i });
      await user.click(duplicateButton);
      
      const duplicateNameInput = screen.getByLabelText(/new pattern name/i);
      await user.type(duplicateNameInput, 'My Beat Copy');
      
      const confirmDuplicateButton = screen.getByRole('button', { name: /duplicate/i });
      await user.click(confirmDuplicateButton);
      
      // Clear pattern
      const clearButton = screen.getByRole('button', { name: /clear/i });
      await user.click(clearButton);
      
      // Confirm clear
      const confirmClearButton = screen.getByRole('button', { name: /confirm/i });
      await user.click(confirmClearButton);
      
      // All steps should be inactive
      const allSteps = screen.getAllByTestId(/sequencer-step-/);
      allSteps.forEach(step => {
        expect(step).not.toHaveClass('active');
      });
    });
  });

  describe('Visual Feedback and Interactions', () => {
    it('should show visual playhead during playback', async () => {
      render(<SequencerPage />);
      
      await waitFor(() => {
        expect(screen.getByTestId('sequencer-page')).toBeInTheDocument();
      });
      
      // Start playback
      const playButton = screen.getByRole('button', { name: /play/i });
      await user.click(playButton);
      
      // Playhead should be visible
      await waitFor(() => {
        expect(screen.getByTestId('sequencer-playhead')).toBeInTheDocument();
      });
      
      // Simulate step progression
      act(() => {
        // Mock step callback to simulate playhead movement
        const stepCallbacks = [];
        const mockEngine = vi.mocked(require('../../../services/sequencer/SequencerEngine.js').SequencerEngine);
        const engineInstance = mockEngine.mock.results[0].value;
        
        // Simulate step progression
        for (let step = 0; step < 4; step++) {
          engineInstance.currentStep = step;
          stepCallbacks.forEach(callback => callback(step, 1.0 + step * 0.125));
        }
      });
      
      // Playhead should move
      const playhead = screen.getByTestId('sequencer-playhead');
      expect(playhead).toHaveStyle({ transform: expect.stringContaining('translateX') });
    });

    it('should provide visual feedback for step interactions', async () => {
      render(<SequencerPage />);
      
      await waitFor(() => {
        expect(screen.getByTestId('sequencer-page')).toBeInTheDocument();
      });
      
      const kickSteps = screen.getAllByTestId(/sequencer-step-track_0-/);
      const firstStep = kickSteps[0];
      
      // Step should not be active initially
      expect(firstStep).not.toHaveClass('active');
      
      // Hover should show hover state
      await user.hover(firstStep);
      expect(firstStep).toHaveClass('hover');
      
      // Click should activate step
      await user.click(firstStep);
      expect(firstStep).toHaveClass('active');
      
      // Click again should deactivate
      await user.click(firstStep);
      expect(firstStep).not.toHaveClass('active');
      
      // Right-click should open velocity editor
      fireEvent.contextMenu(firstStep);
      
      await waitFor(() => {
        expect(screen.getByText(/step velocity/i)).toBeInTheDocument();
      });
      
      // Adjust velocity
      const velocitySlider = screen.getByLabelText(/velocity/i);
      fireEvent.change(velocitySlider, { target: { value: '0.6' } });
      
      // Close velocity editor
      const closeButton = screen.getByRole('button', { name: /close/i });
      await user.click(closeButton);
    });

    it('should show loading states and progress', async () => {
      // Mock loading state
      const mockSampleManager = vi.mocked(require('../../../services/sequencer/SampleManager.js').SampleManager);
      const sampleManagerInstance = mockSampleManager.mock.results[0].value;
      
      sampleManagerInstance.getLoadingProgress.mockReturnValue({
        total: 10,
        loaded: 3,
        percentage: 30,
        isLoading: true
      });
      
      render(<SequencerPage />);
      
      // Loading indicator should be visible
      await waitFor(() => {
        expect(screen.getByText(/loading samples/i)).toBeInTheDocument();
      });
      
      // Progress should be shown
      expect(screen.getByText(/30%/)).toBeInTheDocument();
      
      // Mock loading completion
      act(() => {
        sampleManagerInstance.getLoadingProgress.mockReturnValue({
          total: 10,
          loaded: 10,
          percentage: 100,
          isLoading: false
        });
      });
      
      // Loading indicator should disappear
      await waitFor(() => {
        expect(screen.queryByText(/loading samples/i)).not.toBeInTheDocument();
      });
    });

    it('should handle keyboard shortcuts', async () => {
      render(<SequencerPage />);
      
      await waitFor(() => {
        expect(screen.getByTestId('sequencer-page')).toBeInTheDocument();
      });
      
      // Space bar should toggle playback
      fireEvent.keyDown(document, { key: ' ', code: 'Space' });
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /pause/i })).toBeInTheDocument();
      });
      
      // Space bar again should pause
      fireEvent.keyDown(document, { key: ' ', code: 'Space' });
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /play/i })).toBeInTheDocument();
      });
      
      // Escape should stop
      fireEvent.keyDown(document, { key: 'Escape', code: 'Escape' });
      
      // Number keys should select step resolution
      fireEvent.keyDown(document, { key: '1', code: 'Digit1' });
      expect(screen.getByRole('radio', { name: /8th/i })).toBeChecked();
      
      fireEvent.keyDown(document, { key: '2', code: 'Digit2' });
      expect(screen.getByRole('radio', { name: /16th/i })).toBeChecked();
      
      fireEvent.keyDown(document, { key: '3', code: 'Digit3' });
      expect(screen.getByRole('radio', { name: /32nd/i })).toBeChecked();
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle initialization errors gracefully', async () => {
      // Mock initialization error
      const mockEngine = vi.mocked(require('../../../services/sequencer/SequencerEngine.js').SequencerEngine);
      const engineInstance = mockEngine.mock.results[0].value;
      engineInstance.initialize.mockRejectedValue(new Error('Audio context failed'));
      
      render(<SequencerPage />);
      
      // Error message should be displayed
      await waitFor(() => {
        expect(screen.getByText(/failed to initialize/i)).toBeInTheDocument();
      });
      
      // Retry button should be available
      const retryButton = screen.getByRole('button', { name: /retry/i });
      expect(retryButton).toBeInTheDocument();
      
      // Mock successful retry
      engineInstance.initialize.mockResolvedValue(undefined);
      await user.click(retryButton);
      
      // Should recover and show normal interface
      await waitFor(() => {
        expect(screen.getByTestId('sequencer-grid')).toBeInTheDocument();
      });
    });

    it('should handle sample loading errors', async () => {
      // Mock sample loading error
      const mockSampleManager = vi.mocked(require('../../../services/sequencer/SampleManager.js').SampleManager);
      const sampleManagerInstance = mockSampleManager.mock.results[0].value;
      sampleManagerInstance.loadSamplePack.mockRejectedValue(new Error('Sample pack not found'));
      
      render(<SequencerPage />);
      
      // Error notification should appear
      await waitFor(() => {
        expect(screen.getByText(/failed to load samples/i)).toBeInTheDocument();
      });
      
      // Should still allow basic functionality
      expect(screen.getByTestId('sequencer-grid')).toBeInTheDocument();
      expect(screen.getByTestId('transport-controls')).toBeInTheDocument();
    });

    it('should handle playback errors gracefully', async () => {
      render(<SequencerPage />);
      
      await waitFor(() => {
        expect(screen.getByTestId('sequencer-page')).toBeInTheDocument();
      });
      
      // Mock playback error
      const mockEngine = vi.mocked(require('../../../services/sequencer/SequencerEngine.js').SequencerEngine);
      const engineInstance = mockEngine.mock.results[0].value;
      engineInstance.start.mockRejectedValue(new Error('Audio context suspended'));
      
      // Try to start playback
      const playButton = screen.getByRole('button', { name: /play/i });
      await user.click(playButton);
      
      // Error message should appear
      await waitFor(() => {
        expect(screen.getByText(/playback failed/i)).toBeInTheDocument();
      });
      
      // Play button should remain available
      expect(screen.getByRole('button', { name: /play/i })).toBeInTheDocument();
    });

    it('should handle invalid user input', async () => {
      render(<SequencerPage />);
      
      await waitFor(() => {
        expect(screen.getByTestId('sequencer-page')).toBeInTheDocument();
      });
      
      // Test invalid BPM input
      const bpmInput = screen.getByLabelText(/bpm/i);
      await user.clear(bpmInput);
      await user.type(bpmInput, '999');
      fireEvent.blur(bpmInput);
      
      // Should clamp to valid range
      expect(bpmInput).toHaveValue(200); // Max BPM
      
      // Test invalid BPM (too low)
      await user.clear(bpmInput);
      await user.type(bpmInput, '30');
      fireEvent.blur(bpmInput);
      
      expect(bpmInput).toHaveValue(60); // Min BPM
      
      // Test invalid swing input
      const swingSlider = screen.getByLabelText(/swing/i);
      fireEvent.change(swingSlider, { target: { value: '150' } });
      
      // Should clamp to valid range
      expect(swingSlider).toHaveValue('100'); // Max swing
    });

    it('should handle browser compatibility issues', async () => {
      // Mock missing Web Audio API
      const originalAudioContext = global.AudioContext;
      global.AudioContext = undefined;
      
      render(<SequencerPage />);
      
      // Compatibility warning should appear
      await waitFor(() => {
        expect(screen.getByText(/browser not supported/i)).toBeInTheDocument();
      });
      
      // Restore AudioContext
      global.AudioContext = originalAudioContext;
    });
  });

  describe('Performance and Responsiveness', () => {
    it('should remain responsive during intensive operations', async () => {
      render(<SequencerPage />);
      
      await waitFor(() => {
        expect(screen.getByTestId('sequencer-page')).toBeInTheDocument();
      });
      
      // Rapidly toggle many steps
      const allSteps = screen.getAllByTestId(/sequencer-step-/);
      const startTime = performance.now();
      
      // Click first 32 steps rapidly
      for (let i = 0; i < 32 && i < allSteps.length; i++) {
        await user.click(allSteps[i]);
      }
      
      const endTime = performance.now();
      const totalTime = endTime - startTime;
      
      // Should complete within reasonable time
      expect(totalTime).toBeLessThan(5000); // 5 seconds
      
      // UI should still be responsive
      const playButton = screen.getByRole('button', { name: /play/i });
      await user.click(playButton);
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /pause/i })).toBeInTheDocument();
      });
    });

    it('should handle rapid parameter changes smoothly', async () => {
      render(<SequencerPage />);
      
      await waitFor(() => {
        expect(screen.getByTestId('sequencer-page')).toBeInTheDocument();
      });
      
      const bpmInput = screen.getByLabelText(/bpm/i);
      const swingSlider = screen.getByLabelText(/swing/i);
      
      // Rapidly change parameters
      for (let i = 0; i < 10; i++) {
        const bpm = 60 + (i * 14);
        const swing = i * 10;
        
        await user.clear(bpmInput);
        await user.type(bpmInput, bpm.toString());
        fireEvent.change(swingSlider, { target: { value: swing.toString() } });
      }
      
      // Final values should be applied
      expect(bpmInput).toHaveValue(186);
      expect(swingSlider).toHaveValue('90');
      
      // UI should remain responsive
      const playButton = screen.getByRole('button', { name: /play/i });
      expect(playButton).toBeEnabled();
    });
  });
});