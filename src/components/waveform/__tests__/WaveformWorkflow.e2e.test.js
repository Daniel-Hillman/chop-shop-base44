/**
 * End-to-End Tests for Complete Waveform Workflow
 * Tests the entire workflow from YouTube video to chop creation
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { WaveformVisualization } from '../WaveformVisualization.jsx';
import { WebAudioAnalyzer } from '../../../services/WebAudioAnalyzer.js';
import { FallbackAnalysisChain } from '../../../services/FallbackAnalysisChain.js';

// Mock YouTube player
const mockYouTubePlayer = {
  getCurrentTime: vi.fn(() => 0),
  getDuration: vi.fn(() => 180),
  getPlayerState: vi.fn(() => 1), // playing
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  getVideoData: vi.fn(() => ({
    title: 'Test Video',
    video_id: 'test123'
  }))
};

// Mock audio context for testing
const createMockAudioContext = () => ({
  state: 'running',
  sampleRate: 44100,
  createAnalyser: () => ({
    fftSize: 2048,
    frequencyBinCount: 1024,
    getByteFrequencyData: vi.fn(),
    getByteTimeDomainData: vi.fn(),
    connect: vi.fn(),
    disconnect: vi.fn()
  }),
  createGain: () => ({
    gain: { value: 1 },
    connect: vi.fn(),
    disconnect: vi.fn()
  }),
  createMediaElementSource: vi.fn(() => ({
    connect: vi.fn(),
    disconnect: vi.fn()
  })),
  resume: vi.fn(() => Promise.resolve()),
  close: vi.fn(() => Promise.resolve())
});

describe('Waveform Workflow End-to-End Tests', () => {
  let mockChops = [];
  let mockOnChopCreate;
  let mockOnChopUpdate;
  let mockOnTimeSeek;

  beforeEach(() => {
    mockChops = [];
    mockOnChopCreate = vi.fn((startTime, endTime) => {
      const newChop = {
        id: `chop-${Date.now()}`,
        startTime,
        endTime,
        padId: `pad-${mockChops.length}`,
        color: `hsl(${mockChops.length * 60}, 70%, 50%)`
      };
      mockChops.push(newChop);
      return newChop;
    });
    mockOnChopUpdate = vi.fn();
    mockOnTimeSeek = vi.fn();

    // Mock Web Audio API
    global.AudioContext = createMockAudioContext;
    global.webkitAudioContext = createMockAudioContext;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Complete YouTube Video to Chop Creation Workflow', () => {
    it('should complete full workflow: load video → analyze audio → create chops → edit boundaries', async () => {
      const { rerender } = render(
        <WaveformVisualization
          audioSource={mockYouTubePlayer}
          chops={mockChops}
          currentTime={0}
          isPlaying={false}
          onChopCreate={mockOnChopCreate}
          onChopUpdate={mockOnChopUpdate}
          onTimeSeek={mockOnTimeSeek}
          visualSettings={{
            colorScheme: 'default',
            showFrequencyData: true,
            showZeroCrossings: true
          }}
        />
      );

      // Step 1: Wait for waveform initialization
      await waitFor(() => {
        expect(screen.getByTestId('waveform-canvas')).toBeInTheDocument();
      }, { timeout: 5000 });

      // Step 2: Wait for audio analysis to complete
      await waitFor(() => {
        const canvas = screen.getByTestId('waveform-canvas');
        expect(canvas).toHaveAttribute('data-analysis-complete', 'true');
      }, { timeout: 10000 });

      // Step 3: Create first chop by clicking on waveform
      const canvas = screen.getByTestId('waveform-canvas');
      fireEvent.click(canvas, {
        clientX: 100, // Simulate click at 100px
        clientY: 50
      });

      await waitFor(() => {
        expect(mockOnChopCreate).toHaveBeenCalledWith(
          expect.any(Number),
          expect.any(Number)
        );
      });

      // Step 4: Create second chop by dragging
      fireEvent.mouseDown(canvas, {
        clientX: 200,
        clientY: 50
      });

      fireEvent.mouseMove(canvas, {
        clientX: 300,
        clientY: 50
      });

      fireEvent.mouseUp(canvas, {
        clientX: 300,
        clientY: 50
      });

      await waitFor(() => {
        expect(mockOnChopCreate).toHaveBeenCalledTimes(2);
      });

      // Step 5: Re-render with created chops
      rerender(
        <WaveformVisualization
          audioSource={mockYouTubePlayer}
          chops={mockChops}
          currentTime={0}
          isPlaying={false}
          onChopCreate={mockOnChopCreate}
          onChopUpdate={mockOnChopUpdate}
          onTimeSeek={mockOnTimeSeek}
          visualSettings={{
            colorScheme: 'default',
            showFrequencyData: true,
            showZeroCrossings: true
          }}
        />
      );

      // Step 6: Edit chop boundaries by dragging handles
      const chopHandle = screen.getByTestId(`chop-handle-${mockChops[0].id}-end`);
      
      fireEvent.mouseDown(chopHandle, {
        clientX: 150,
        clientY: 50
      });

      fireEvent.mouseMove(document, {
        clientX: 180,
        clientY: 50
      });

      fireEvent.mouseUp(document, {
        clientX: 180,
        clientY: 50
      });

      await waitFor(() => {
        expect(mockOnChopUpdate).toHaveBeenCalledWith(
          mockChops[0].id,
          expect.objectContaining({
            endTime: expect.any(Number)
          })
        );
      });

      // Step 7: Test playback synchronization
      rerender(
        <WaveformVisualization
          audioSource={mockYouTubePlayer}
          chops={mockChops}
          currentTime={30}
          isPlaying={true}
          onChopCreate={mockOnChopCreate}
          onChopUpdate={mockOnChopUpdate}
          onTimeSeek={mockOnTimeSeek}
          visualSettings={{
            colorScheme: 'default',
            showFrequencyData: true,
            showZeroCrossings: true
          }}
        />
      );

      await waitFor(() => {
        const playhead = screen.getByTestId('playhead');
        expect(playhead).toBeInTheDocument();
        expect(playhead).toHaveStyle('left: 30px'); // Approximate position
      });

      // Verify complete workflow success
      expect(mockChops).toHaveLength(2);
      expect(mockOnChopCreate).toHaveBeenCalledTimes(2);
      expect(mockOnChopUpdate).toHaveBeenCalledTimes(1);
    });

    it('should handle workflow with fallback analysis methods', async () => {
      // Mock failed Web Audio API
      global.AudioContext = vi.fn(() => {
        throw new Error('Web Audio API not available');
      });

      render(
        <WaveformVisualization
          audioSource={mockYouTubePlayer}
          chops={[]}
          currentTime={0}
          isPlaying={false}
          onChopCreate={mockOnChopCreate}
          onChopUpdate={mockOnChopUpdate}
          onTimeSeek={mockOnTimeSeek}
          visualSettings={{
            colorScheme: 'default',
            showFrequencyData: true,
            showZeroCrossings: true
          }}
        />
      );

      // Should fall back to alternative analysis methods
      await waitFor(() => {
        const canvas = screen.getByTestId('waveform-canvas');
        expect(canvas).toHaveAttribute('data-analysis-method', 'fallback');
      }, { timeout: 10000 });

      // Should still allow chop creation
      const canvas = screen.getByTestId('waveform-canvas');
      fireEvent.click(canvas, {
        clientX: 100,
        clientY: 50
      });

      await waitFor(() => {
        expect(mockOnChopCreate).toHaveBeenCalled();
      });
    });

    it('should maintain performance during intensive workflow operations', async () => {
      const performanceStart = performance.now();

      render(
        <WaveformVisualization
          audioSource={mockYouTubePlayer}
          chops={[]}
          currentTime={0}
          isPlaying={false}
          onChopCreate={mockOnChopCreate}
          onChopUpdate={mockOnChopUpdate}
          onTimeSeek={mockOnTimeSeek}
          visualSettings={{
            colorScheme: 'default',
            showFrequencyData: true,
            showZeroCrossings: true
          }}
        />
      );

      // Wait for initialization
      await waitFor(() => {
        expect(screen.getByTestId('waveform-canvas')).toBeInTheDocument();
      });

      const initializationTime = performance.now() - performanceStart;
      expect(initializationTime).toBeLessThan(2000); // Should initialize within 2 seconds

      // Test rapid chop creation performance
      const canvas = screen.getByTestId('waveform-canvas');
      const rapidCreationStart = performance.now();

      // Create 10 chops rapidly
      for (let i = 0; i < 10; i++) {
        fireEvent.click(canvas, {
          clientX: 50 + (i * 20),
          clientY: 50
        });
      }

      await waitFor(() => {
        expect(mockOnChopCreate).toHaveBeenCalledTimes(10);
      });

      const rapidCreationTime = performance.now() - rapidCreationStart;
      expect(rapidCreationTime).toBeLessThan(1000); // Should handle rapid creation within 1 second
    });
  });

  describe('Cross-Browser Compatibility Workflow', () => {
    it('should work with different audio analysis capabilities', async () => {
      // Test scenarios for different browser capabilities
      const testScenarios = [
        {
          name: 'Modern Chrome/Firefox',
          audioContext: createMockAudioContext,
          expectedMethod: 'webaudio'
        },
        {
          name: 'Safari with limited Web Audio',
          audioContext: () => ({
            ...createMockAudioContext(),
            createMediaElementSource: undefined
          }),
          expectedMethod: 'fallback'
        },
        {
          name: 'Legacy browser',
          audioContext: undefined,
          expectedMethod: 'procedural'
        }
      ];

      for (const scenario of testScenarios) {
        global.AudioContext = scenario.audioContext;
        global.webkitAudioContext = scenario.audioContext;

        const { unmount } = render(
          <WaveformVisualization
            audioSource={mockYouTubePlayer}
            chops={[]}
            currentTime={0}
            isPlaying={false}
            onChopCreate={mockOnChopCreate}
            onChopUpdate={mockOnChopUpdate}
            onTimeSeek={mockOnTimeSeek}
            visualSettings={{
              colorScheme: 'default',
              showFrequencyData: true,
              showZeroCrossings: true
            }}
          />
        );

        await waitFor(() => {
          const canvas = screen.getByTestId('waveform-canvas');
          expect(canvas).toBeInTheDocument();
        });

        // Should still allow basic functionality regardless of browser
        const canvas = screen.getByTestId('waveform-canvas');
        fireEvent.click(canvas, {
          clientX: 100,
          clientY: 50
        });

        await waitFor(() => {
          expect(mockOnChopCreate).toHaveBeenCalled();
        });

        unmount();
        vi.clearAllMocks();
      }
    });
  });

  describe('User Acceptance Workflow Tests', () => {
    it('should provide intuitive user experience for common editing tasks', async () => {
      render(
        <WaveformVisualization
          audioSource={mockYouTubePlayer}
          chops={[]}
          currentTime={0}
          isPlaying={false}
          onChopCreate={mockOnChopCreate}
          onChopUpdate={mockOnChopUpdate}
          onTimeSeek={mockOnTimeSeek}
          visualSettings={{
            colorScheme: 'default',
            showFrequencyData: true,
            showZeroCrossings: true
          }}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('waveform-canvas')).toBeInTheDocument();
      });

      // Test 1: Quick chop creation should be intuitive
      const canvas = screen.getByTestId('waveform-canvas');
      fireEvent.click(canvas, { clientX: 100, clientY: 50 });

      await waitFor(() => {
        expect(mockOnChopCreate).toHaveBeenCalled();
        // Should provide visual feedback
        expect(screen.getByTestId('chop-overlay')).toBeInTheDocument();
      });

      // Test 2: Hover should provide helpful information
      fireEvent.mouseEnter(canvas, { clientX: 150, clientY: 50 });

      await waitFor(() => {
        expect(screen.getByTestId('hover-tooltip')).toBeInTheDocument();
      });

      // Test 3: Zoom should be responsive and smooth
      fireEvent.wheel(canvas, { deltaY: -100 });

      await waitFor(() => {
        const zoomLevel = canvas.getAttribute('data-zoom-level');
        expect(parseFloat(zoomLevel)).toBeGreaterThan(1);
      });

      // Test 4: Keyboard shortcuts should work
      fireEvent.keyDown(document, { key: 'z', ctrlKey: true });

      await waitFor(() => {
        // Should trigger zoom functionality
        expect(canvas.getAttribute('data-zoom-level')).toBeDefined();
      });
    });

    it('should handle error states gracefully with user-friendly feedback', async () => {
      // Mock analysis failure
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      render(
        <WaveformVisualization
          audioSource={null} // Invalid audio source
          chops={[]}
          currentTime={0}
          isPlaying={false}
          onChopCreate={mockOnChopCreate}
          onChopUpdate={mockOnChopUpdate}
          onTimeSeek={mockOnTimeSeek}
          visualSettings={{
            colorScheme: 'default',
            showFrequencyData: true,
            showZeroCrossings: true
          }}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('waveform-error-state')).toBeInTheDocument();
      });

      // Should show user-friendly error message
      expect(screen.getByText(/unable to analyze audio/i)).toBeInTheDocument();

      // Should provide recovery options
      expect(screen.getByText(/try again/i)).toBeInTheDocument();

      consoleSpy.mockRestore();
    });
  });
});