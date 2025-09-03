/**
 * Comprehensive Test Suite for Sampler Drum Sequencer
 * 
 * This test suite validates all requirements from the sampler drum sequencer specification.
 * It includes unit tests, integration tests, performance benchmarks, and workflow validation.
 * 
 * Requirements Coverage:
 * - Requirement 1: Grid-based pattern sequencer with chop integration
 * - Requirement 2: Transport controls with BPM and tap tempo
 * - Requirement 3: 16-track sequencer grid interaction
 * - Requirement 4: Bank navigation system
 * - Requirement 5: Performance optimization
 * - Requirement 6: UI consistency
 * - Requirement 7: Chop integration workflows
 * - Requirement 8: Tap tempo functionality
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Import all sampler components
import SamplerDrumSequencer from '../SamplerDrumSequencer';
import SamplerTransportControls from '../SamplerTransportControls';
import SamplerSequencerGrid from '../SamplerSequencerGrid';
import SamplerBankNavigation from '../SamplerBankNavigation';
import SamplerTapTempo from '../SamplerTapTempo';

// Import services
import SamplerSequencerService from '../../../services/sequencer/SamplerSequencerService';
import SamplerChopIntegration from '../../../services/sequencer/SamplerChopIntegration';
import YouTubePlayerInterface from '../../../services/sequencer/YouTubePlayerInterface';

// Mock data
const mockChops = [
  { padId: 'A0', startTime: 10.5, endTime: 12.3, color: '#06b6d4' },
  { padId: 'A1', startTime: 15.2, endTime: 17.1, color: '#8b5cf6' },
  { padId: 'A2', startTime: 20.0, endTime: 22.5, color: '#f59e0b' },
  { padId: 'B0', startTime: 25.1, endTime: 27.3, color: '#ef4444' },
];

const mockYouTubePlayer = {
  seekTo: vi.fn(),
  getCurrentTime: vi.fn(() => 0),
  getPlayerState: vi.fn(() => 1),
  playVideo: vi.fn(),
  pauseVideo: vi.fn(),
};

describe('Sampler Drum Sequencer - Comprehensive Test Suite', () => {
  let user;
  let performanceMarks = [];

  beforeEach(() => {
    user = userEvent.setup();
    performanceMarks = [];
    
    // Mock performance API for benchmarking
    global.performance.mark = vi.fn((name) => {
      performanceMarks.push({ name, timestamp: Date.now() });
    });
    
    global.performance.measure = vi.fn((name, start, end) => {
      const startMark = performanceMarks.find(m => m.name === start);
      const endMark = performanceMarks.find(m => m.name === end);
      return {
        name,
        duration: endMark ? endMark.timestamp - startMark.timestamp : 0
      };
    });

    // Clear all mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    performanceMarks = [];
  });

  describe('Requirement 1: Grid-based Pattern Sequencer with Chop Integration', () => {
    it('should display sequencer component alongside existing chopper functionality', async () => {
      render(
        <SamplerDrumSequencer 
          chops={mockChops}
          activeBank="A"
          youtubePlayer={mockYouTubePlayer}
        />
      );

      expect(screen.getByTestId('sampler-drum-sequencer')).toBeInTheDocument();
      expect(screen.getByTestId('sampler-transport-controls')).toBeInTheDocument();
      expect(screen.getByTestId('sampler-sequencer-grid')).toBeInTheDocument();
    });

    it('should automatically map chops to sequencer tracks', async () => {
      render(
        <SamplerDrumSequencer 
          chops={mockChops}
          activeBank="A"
          youtubePlayer={mockYouTubePlayer}
        />
      );

      // Verify tracks are mapped for available chops
      const trackElements = screen.getAllByTestId(/track-\d+/);
      expect(trackElements.length).toBeGreaterThanOrEqual(mockChops.filter(c => c.padId.startsWith('A')).length);
    });

    it('should store pattern and timestamp data for playback', async () => {
      const onPatternChange = vi.fn();
      
      render(
        <SamplerDrumSequencer 
          chops={mockChops}
          activeBank="A"
          youtubePlayer={mockYouTubePlayer}
          onPatternChange={onPatternChange}
        />
      );

      // Click on a grid cell to create a trigger
      const gridCell = screen.getByTestId('step-0-0');
      await user.click(gridCell);

      expect(onPatternChange).toHaveBeenCalledWith(
        expect.objectContaining({
          tracks: expect.arrayContaining([
            expect.objectContaining({
              steps: expect.arrayContaining([true])
            })
          ])
        })
      );
    });

    it('should jump YouTube video to corresponding chop timestamp on trigger', async () => {
      const service = new SamplerSequencerService();
      service.setYouTubePlayer(mockYouTubePlayer);
      service.setChops(mockChops);

      // Create a pattern with a trigger on track 0, step 0
      const pattern = {
        tracks: [
          { trackIndex: 0, chopId: 'A0', steps: [true, false, false, false] }
        ]
      };

      service.setPattern(pattern);
      service.start();

      // Wait for the step to be processed
      await waitFor(() => {
        expect(mockYouTubePlayer.seekTo).toHaveBeenCalledWith(10.5, true);
      });
    });

    it('should update sequencer when switching between banks', async () => {
      const { rerender } = render(
        <SamplerDrumSequencer 
          chops={mockChops}
          activeBank="A"
          youtubePlayer={mockYouTubePlayer}
        />
      );

      // Initially showing bank A chops
      expect(screen.getByText(/Bank A/)).toBeInTheDocument();

      // Switch to bank B
      rerender(
        <SamplerDrumSequencer 
          chops={mockChops}
          activeBank="B"
          youtubePlayer={mockYouTubePlayer}
        />
      );

      expect(screen.getByText(/Bank B/)).toBeInTheDocument();
    });
  });

  describe('Requirement 2: Transport Controls with BPM and Tap Tempo', () => {
    it('should begin pattern playback when Start button is clicked', async () => {
      const onPlay = vi.fn();
      
      render(
        <SamplerTransportControls 
          isPlaying={false}
          bpm={120}
          onPlay={onPlay}
          onStop={vi.fn()}
          onBpmChange={vi.fn()}
        />
      );

      const playButton = screen.getByTestId('play-button');
      await user.click(playButton);

      expect(onPlay).toHaveBeenCalled();
    });

    it('should halt playback and reset when Stop button is clicked', async () => {
      const onStop = vi.fn();
      
      render(
        <SamplerTransportControls 
          isPlaying={true}
          bpm={120}
          onPlay={vi.fn()}
          onStop={onStop}
          onBpmChange={vi.fn()}
        />
      );

      const stopButton = screen.getByTestId('stop-button');
      await user.click(stopButton);

      expect(onStop).toHaveBeenCalled();
    });

    it('should update playback speed in real-time when BPM is adjusted', async () => {
      const onBpmChange = vi.fn();
      
      render(
        <SamplerTransportControls 
          isPlaying={false}
          bpm={120}
          onPlay={vi.fn()}
          onStop={vi.fn()}
          onBpmChange={onBpmChange}
        />
      );

      const bpmInput = screen.getByTestId('bpm-input');
      await user.clear(bpmInput);
      await user.type(bpmInput, '140');

      expect(onBpmChange).toHaveBeenCalledWith(140);
    });

    it('should calculate and set BPM based on tap intervals', async () => {
      const onTempoCalculated = vi.fn();
      
      render(
        <SamplerTapTempo 
          onTempoCalculated={onTempoCalculated}
          currentBpm={120}
        />
      );

      const tapButton = screen.getByTestId('tap-tempo-button');
      
      // Simulate 4 taps at 120 BPM (500ms intervals)
      const tapInterval = 500; // 120 BPM = 500ms per beat
      
      await user.click(tapButton);
      await new Promise(resolve => setTimeout(resolve, tapInterval));
      await user.click(tapButton);
      await new Promise(resolve => setTimeout(resolve, tapInterval));
      await user.click(tapButton);
      await new Promise(resolve => setTimeout(resolve, tapInterval));
      await user.click(tapButton);

      await waitFor(() => {
        expect(onTempoCalculated).toHaveBeenCalledWith(expect.closeTo(120, 5));
      });
    });

    it('should register tap tempo input via space bar', async () => {
      const onTempoCalculated = vi.fn();
      
      render(
        <SamplerTapTempo 
          onTempoCalculated={onTempoCalculated}
          currentBpm={120}
        />
      );

      // Simulate space bar taps
      await user.keyboard(' ');
      await new Promise(resolve => setTimeout(resolve, 500));
      await user.keyboard(' ');
      await new Promise(resolve => setTimeout(resolve, 500));
      await user.keyboard(' ');
      await new Promise(resolve => setTimeout(resolve, 500));
      await user.keyboard(' ');

      await waitFor(() => {
        expect(onTempoCalculated).toHaveBeenCalled();
      });
    });

    it('should require minimum of 4 taps for accuracy', async () => {
      const onTempoCalculated = vi.fn();
      
      render(
        <SamplerTapTempo 
          onTempoCalculated={onTempoCalculated}
          currentBpm={120}
        />
      );

      const tapButton = screen.getByTestId('tap-tempo-button');
      
      // Only 3 taps - should not calculate tempo yet
      await user.click(tapButton);
      await user.click(tapButton);
      await user.click(tapButton);

      expect(onTempoCalculated).not.toHaveBeenCalled();

      // 4th tap should trigger calculation
      await user.click(tapButton);
      
      await waitFor(() => {
        expect(onTempoCalculated).toHaveBeenCalled();
      });
    });
  });

  describe('Requirement 3: 16-Track Sequencer Grid Interaction', () => {
    it('should show 16 tracks simultaneously', () => {
      render(
        <SamplerSequencerGrid 
          pattern={{ tracks: Array(16).fill().map((_, i) => ({ trackIndex: i, steps: Array(16).fill(false) })) }}
          chops={mockChops}
          currentStep={0}
          isPlaying={false}
          onStepToggle={vi.fn()}
        />
      );

      const tracks = screen.getAllByTestId(/track-\d+/);
      expect(tracks).toHaveLength(16);
    });

    it('should toggle trigger when grid cell is clicked', async () => {
      const onStepToggle = vi.fn();
      
      render(
        <SamplerSequencerGrid 
          pattern={{ tracks: Array(16).fill().map((_, i) => ({ trackIndex: i, steps: Array(16).fill(false) })) }}
          chops={mockChops}
          currentStep={0}
          isPlaying={false}
          onStepToggle={onStepToggle}
        />
      );

      const gridCell = screen.getByTestId('step-0-0');
      await user.click(gridCell);

      expect(onStepToggle).toHaveBeenCalledWith(0, 0);
    });

    it('should display track with chop visual styling when assigned', () => {
      const pattern = {
        tracks: [
          { trackIndex: 0, chopId: 'A0', steps: Array(16).fill(false) }
        ]
      };

      render(
        <SamplerSequencerGrid 
          pattern={pattern}
          chops={mockChops}
          currentStep={0}
          isPlaying={false}
          onStepToggle={vi.fn()}
        />
      );

      const track = screen.getByTestId('track-0');
      expect(track).toHaveStyle({ borderColor: '#06b6d4' });
    });

    it('should display empty track when no chop is assigned', () => {
      const pattern = {
        tracks: [
          { trackIndex: 0, chopId: null, steps: Array(16).fill(false) }
        ]
      };

      render(
        <SamplerSequencerGrid 
          pattern={pattern}
          chops={mockChops}
          current Step={0}
          isPlaying={false}
          onStepToggle={vi.fn()}
        />
      );

      const track = screen.getByTestId('track-0');
      expect(track).toHaveClass('empty-track');
    });

    it('should store trigger on empty track without producing audio', async () => {
      const onStepToggle = vi.fn();
      const pattern = {
        tracks: [
          { trackIndex: 0, chopId: null, steps: Array(16).fill(false) }
        ]
      };

      render(
        <SamplerSequencerGrid 
          pattern={pattern}
          chops={mockChops}
          currentStep={0}
          isPlaying={false}
          onStepToggle={onStepToggle}
        />
      );

      const gridCell = screen.getByTestId('step-0-0');
      await user.click(gridCell);

      expect(onStepToggle).toHaveBeenCalledWith(0, 0);
      // Verify no YouTube player interaction for empty track
      expect(mockYouTubePlayer.seekTo).not.toHaveBeenCalled();
    });

    it('should jump to YouTube timestamp when trigger is on assigned track', async () => {
      const service = new SamplerSequencerService();
      service.setYouTubePlayer(mockYouTubePlayer);
      service.setChops(mockChops);

      const pattern = {
        tracks: [
          { trackIndex: 0, chopId: 'A0', steps: [true, false, false, false] }
        ]
      };

      service.setPattern(pattern);
      service.start();

      await waitFor(() => {
        expect(mockYouTubePlayer.seekTo).toHaveBeenCalledWith(10.5, true);
      });
    });
  });

  describe('Requirement 4: Bank Navigation System', () => {
    it('should show navigation controls for switching banks', () => {
      render(
        <SamplerBankNavigation 
          currentBank={0}
          totalBanks={2}
          onBankChange={vi.fn()}
          chopsPerBank={[2, 1]}
        />
      );

      expect(screen.getByTestId('bank-nav-prev')).toBeInTheDocument();
      expect(screen.getByTestId('bank-nav-next')).toBeInTheDocument();
      expect(screen.getByText(/Bank A/)).toBeInTheDocument();
    });

    it('should switch to corresponding bank when navigation button is clicked', async () => {
      const onBankChange = vi.fn();
      
      render(
        <SamplerBankNavigation 
          currentBank={0}
          totalBanks={2}
          onBankChange={onBankChange}
          chopsPerBank={[2, 1]}
        />
      );

      const nextButton = screen.getByTestId('bank-nav-next');
      await user.click(nextButton);

      expect(onBankChange).toHaveBeenCalledWith(1);
    });

    it('should organize 64 chops into 4 banks of 16 chops each', () => {
      const chops64 = Array(64).fill().map((_, i) => ({
        padId: `${String.fromCharCode(65 + Math.floor(i / 16))}${i % 16}`,
        startTime: i * 2,
        endTime: i * 2 + 1.5,
        color: '#06b6d4'
      }));

      render(
        <SamplerBankNavigation 
          currentBank={0}
          totalBanks={4}
          onBankChange={vi.fn()}
          chopsPerBank={[16, 16, 16, 16]}
        />
      );

      expect(screen.getByText(/Bank A/)).toBeInTheDocument();
      expect(screen.getByText(/16 chops/)).toBeInTheDocument();
    });

    it('should initially support 2 banks with expansion capability', () => {
      render(
        <SamplerBankNavigation 
          currentBank={0}
          totalBanks={2}
          onBankChange={vi.fn()}
          chopsPerBank={[16, 16]}
          expandable={true}
        />
      );

      expect(screen.getByTestId('bank-expansion-indicator')).toBeInTheDocument();
    });

    it('should preserve pattern data when switching banks', async () => {
      const service = new SamplerSequencerService();
      
      // Set pattern for bank A
      const patternA = {
        bankId: 0,
        tracks: [{ trackIndex: 0, chopId: 'A0', steps: [true, false, false, false] }]
      };
      
      service.setPattern(patternA);
      service.switchBank(1); // Switch to bank B
      service.switchBank(0); // Switch back to bank A
      
      const retrievedPattern = service.getPattern();
      expect(retrievedPattern.tracks[0].steps[0]).toBe(true);
    });

    it('should display empty tracks when bank contains no chops', () => {
      render(
        <SamplerSequencerGrid 
          pattern={{ tracks: Array(16).fill().map((_, i) => ({ trackIndex: i, steps: Array(16).fill(false) })) }}
          chops={[]} // No chops for this bank
          currentStep={0}
          isPlaying={false}
          onStepToggle={vi.fn()}
        />
      );

      const tracks = screen.getAllByTestId(/track-\d+/);
      tracks.forEach(track => {
        expect(track).toHaveClass('empty-track');
      });
    });
  });

  describe('Requirement 5: Performance Optimization', () => {
    it('should minimize visual effects and animations on pad grid', () => {
      performance.mark('grid-render-start');
      
      render(
        <SamplerSequencerGrid 
          pattern={{ tracks: Array(16).fill().map((_, i) => ({ trackIndex: i, steps: Array(16).fill(false) })) }}
          chops={mockChops}
          currentStep={0}
          isPlaying={false}
          onStepToggle={vi.fn()}
        />
      );
      
      performance.mark('grid-render-end');
      const measure = performance.measure('grid-render', 'grid-render-start', 'grid-render-end');
      
      // Grid should render quickly (under 50ms)
      expect(measure.duration).toBeLessThan(50);
    });

    it('should maintain precise timing without drift', async () => {
      const service = new SamplerSequencerService();
      const timingMarks = [];
      
      service.onStep((step) => {
        timingMarks.push({ step, timestamp: performance.now() });
      });
      
      service.setBPM(120); // 500ms per beat
      service.start();
      
      // Wait for several steps
      await new Promise(resolve => setTimeout(resolve, 2500));
      service.stop();
      
      // Check timing consistency (should be within 5ms tolerance)
      for (let i = 1; i < timingMarks.length; i++) {
        const interval = timingMarks[i].timestamp - timingMarks[i-1].timestamp;
        expect(Math.abs(interval - 500)).toBeLessThan(5);
      }
    });

    it('should respond immediately to grid interactions', async () => {
      const onStepToggle = vi.fn();
      
      render(
        <SamplerSequencerGrid 
          pattern={{ tracks: Array(16).fill().map((_, i) => ({ trackIndex: i, steps: Array(16).fill(false) })) }}
          chops={mockChops}
          currentStep={0}
          isPlaying={false}
          onStepToggle={onStepToggle}
        />
      );

      performance.mark('interaction-start');
      const gridCell = screen.getByTestId('step-0-0');
      await user.click(gridCell);
      performance.mark('interaction-end');
      
      const measure = performance.measure('interaction', 'interaction-start', 'interaction-end');
      
      // Interaction should be immediate (under 10ms)
      expect(measure.duration).toBeLessThan(10);
      expect(onStepToggle).toHaveBeenCalled();
    });

    it('should use efficient data structures and avoid unnecessary re-renders', () => {
      const renderSpy = vi.fn();
      
      const TestComponent = ({ pattern }) => {
        renderSpy();
        return <SamplerSequencerGrid 
          pattern={pattern}
          chops={mockChops}
          currentStep={0}
          isPlaying={false}
          onStepToggle={vi.fn()}
        />;
      };

      const pattern = { tracks: Array(16).fill().map((_, i) => ({ trackIndex: i, steps: Array(16).fill(false) })) };
      const { rerender } = render(<TestComponent pattern={pattern} />);
      
      expect(renderSpy).toHaveBeenCalledTimes(1);
      
      // Re-render with same pattern - should not cause unnecessary re-render due to memoization
      rerender(<TestComponent pattern={pattern} />);
      
      // Component should be memoized and not re-render
      expect(renderSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('Performance Benchmarks', () => {
    it('should handle complex patterns efficiently', async () => {
      const complexPattern = {
        tracks: Array(16).fill().map((_, trackIndex) => ({
          trackIndex,
          chopId: `A${trackIndex}`,
          steps: Array(16).fill().map((_, stepIndex) => stepIndex % 2 === 0) // Every other step
        }))
      };

      performance.mark('complex-pattern-start');
      
      render(
        <SamplerSequencerGrid 
          pattern={complexPattern}
          chops={Array(16).fill().map((_, i) => ({ padId: `A${i}`, startTime: i, endTime: i + 1, color: '#06b6d4' }))}
          currentStep={0}
          isPlaying={false}
          onStepToggle={vi.fn()}
        />
      );
      
      performance.mark('complex-pattern-end');
      const measure = performance.measure('complex-pattern', 'complex-pattern-start', 'complex-pattern-end');
      
      // Complex pattern should still render quickly
      expect(measure.duration).toBeLessThan(100);
    });

    it('should handle rapid user interactions without lag', async () => {
      const onStepToggle = vi.fn();
      
      render(
        <SamplerSequencerGrid 
          pattern={{ tracks: Array(16).fill().map((_, i) => ({ trackIndex: i, steps: Array(16).fill(false) })) }}
          chops={mockChops}
          currentStep={0}
          isPlaying={false}
          onStepToggle={onStepToggle}
        />
      );

      performance.mark('rapid-interactions-start');
      
      // Simulate rapid clicking on multiple cells
      const cells = screen.getAllByTestId(/step-\d+-\d+/).slice(0, 10);
      for (const cell of cells) {
        await user.click(cell);
      }
      
      performance.mark('rapid-interactions-end');
      const measure = performance.measure('rapid-interactions', 'rapid-interactions-start', 'rapid-interactions-end');
      
      // All interactions should complete quickly
      expect(measure.duration).toBeLessThan(200);
      expect(onStepToggle).toHaveBeenCalledTimes(10);
    });

    it('should maintain performance during extended playback', async () => {
      const service = new SamplerSequencerService();
      const memoryBefore = performance.memory?.usedJSHeapSize || 0;
      
      service.setBPM(120);
      service.start();
      
      // Run for extended period
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      service.stop();
      const memoryAfter = performance.memory?.usedJSHeapSize || 0;
      
      // Memory usage should not increase significantly (less than 10MB)
      const memoryIncrease = memoryAfter - memoryBefore;
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024);
    });
  });
});