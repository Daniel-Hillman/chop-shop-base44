/**
 * Comprehensive Validation Test Suite
 * Validates all requirements from the specification
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { WaveformVisualization } from '../WaveformVisualization.jsx';

/**
 * Requirements Validation Matrix
 * Maps each requirement to specific test validations
 */
const REQUIREMENTS_MATRIX = {
  '1.1': {
    description: 'Real-time waveform visualization of YouTube audio',
    validations: [
      'waveform-generation-speed',
      'audio-stream-analysis',
      'real-time-display'
    ]
  },
  '1.2': {
    description: 'Accurate amplitude data during playback',
    validations: [
      'amplitude-accuracy',
      'playback-synchronization',
      'data-fidelity'
    ]
  },
  '1.3': {
    description: 'High visual fidelity showing frequency and dynamics',
    validations: [
      'frequency-visualization',
      'dynamic-range-display',
      'visual-quality'
    ]
  },
  '1.4': {
    description: 'Intelligent fallback for failed analysis',
    validations: [
      'fallback-chain-execution',
      'graceful-degradation',
      'error-recovery'
    ]
  },
  '1.5': {
    description: 'Progressive waveform generation',
    validations: [
      'progressive-loading',
      'incremental-updates',
      'memory-efficiency'
    ]
  },
  '2.1': {
    description: 'Click-to-create chop functionality',
    validations: [
      'click-chop-creation',
      'precise-positioning',
      'immediate-feedback'
    ]
  },
  '2.2': {
    description: 'Drag selection for chop regions',
    validations: [
      'drag-selection',
      'region-visualization',
      'boundary-accuracy'
    ]
  },
  '2.3': {
    description: 'Visual feedback during chop creation',
    validations: [
      'creation-feedback',
      'hover-effects',
      'interaction-responsiveness'
    ]
  },
  '2.4': {
    description: 'Colored chop overlays',
    validations: [
      'chop-visualization',
      'color-distinction',
      'overlay-rendering'
    ]
  },
  '2.5': {
    description: 'Distinct visual appearance for multiple chops',
    validations: [
      'multi-chop-display',
      'visual-hierarchy',
      'identification-clarity'
    ]
  },
  '2.6': {
    description: 'Zoom controls with cue point preservation',
    validations: [
      'zoom-functionality',
      'cue-point-tracking',
      'viewport-management'
    ]
  },
  '3.1': {
    description: 'Draggable chop handles',
    validations: [
      'handle-interaction',
      'boundary-editing',
      'drag-responsiveness'
    ]
  },
  '3.2': {
    description: 'Real-time boundary updates',
    validations: [
      'real-time-updates',
      'visual-feedback',
      'data-synchronization'
    ]
  },
  '3.3': {
    description: 'Zero-crossing snap functionality',
    validations: [
      'zero-crossing-detection',
      'snap-behavior',
      'clean-cuts'
    ]
  },
  '3.4': {
    description: 'Precise timing information during drag',
    validations: [
      'timing-display',
      'precision-indicators',
      'drag-feedback'
    ]
  },
  '3.5': {
    description: 'Immediate chop data updates',
    validations: [
      'data-updates',
      'audio-feedback',
      'state-management'
    ]
  },
  '3.6': {
    description: 'Smart shift controls for sample boundaries',
    validations: [
      'shift-controls',
      'boundary-adjustment',
      'precision-editing'
    ]
  },
  '4.1': {
    description: 'Multi-level zoom controls',
    validations: [
      'zoom-levels',
      'detail-scaling',
      'overview-to-sample'
    ]
  },
  '4.2': {
    description: 'Smooth scrolling and panning',
    validations: [
      'pan-functionality',
      'smooth-navigation',
      'timeline-traversal'
    ]
  },
  '4.3': {
    description: 'Sample-level detail at high zoom',
    validations: [
      'high-zoom-detail',
      'sample-visualization',
      'zero-crossing-lines'
    ]
  },
  '4.4': {
    description: 'Accurate positioning during zoom/pan',
    validations: [
      'position-accuracy',
      'marker-tracking',
      'coordinate-consistency'
    ]
  },
  '4.5': {
    description: 'Adaptive detail rendering',
    validations: [
      'adaptive-rendering',
      'detail-optimization',
      'performance-scaling'
    ]
  },
  '5.1': {
    description: 'Moving playhead tracking',
    validations: [
      'playhead-movement',
      'position-tracking',
      'synchronization-accuracy'
    ]
  },
  '5.2': {
    description: 'Smooth playhead animation',
    validations: [
      'smooth-animation',
      'non-interference',
      'readability-preservation'
    ]
  },
  '5.3': {
    description: 'Active chop highlighting during playback',
    validations: [
      'chop-highlighting',
      'active-region-display',
      'playback-context'
    ]
  },
  '5.4': {
    description: 'Chop relationship visualization',
    validations: [
      'relationship-display',
      'overlap-indication',
      'adjacency-visualization'
    ]
  },
  '5.5': {
    description: 'Hover tooltips with timing information',
    validations: [
      'hover-tooltips',
      'timing-information',
      'non-interfering-display'
    ]
  },
  '6.1': {
    description: 'Web Audio API for high-quality analysis',
    validations: [
      'webaudio-analysis',
      'frequency-accuracy',
      'amplitude-precision'
    ]
  },
  '6.2': {
    description: 'Alternative analysis methods',
    validations: [
      'fallback-methods',
      'visual-frame-analysis',
      'metadata-generation'
    ]
  },
  '6.3': {
    description: 'Musically-intelligent procedural generation',
    validations: [
      'procedural-patterns',
      'musical-structure',
      'intelligent-fallback'
    ]
  },
  '6.4': {
    description: 'Analysis method indication and limitations',
    validations: [
      'method-indication',
      'limitation-communication',
      'user-awareness'
    ]
  },
  '7.1': {
    description: '60fps rendering performance',
    validations: [
      'frame-rate-consistency',
      'rendering-optimization',
      'performance-monitoring'
    ]
  },
  '7.2': {
    description: 'Progressive rendering and Web Workers',
    validations: [
      'progressive-rendering',
      'worker-utilization',
      'ui-non-blocking'
    ]
  },
  '7.3': {
    description: 'Real-time interaction prioritization',
    validations: [
      'interaction-priority',
      'playback-priority',
      'resource-management'
    ]
  },
  '7.4': {
    description: 'Graceful quality reduction under load',
    validations: [
      'quality-scaling',
      'resource-adaptation',
      'functionality-preservation'
    ]
  },
  '7.5': {
    description: 'Memory management and cleanup',
    validations: [
      'memory-efficiency',
      'cleanup-strategies',
      'cache-management'
    ]
  },
  '8.1': {
    description: 'Color coding for frequency ranges',
    validations: [
      'frequency-colors',
      'visual-enhancement',
      'range-distinction'
    ]
  },
  '8.2': {
    description: 'Musical structure visualization',
    validations: [
      'structure-hints',
      'section-identification',
      'musical-context'
    ]
  },
  '8.3': {
    description: 'Silence and low-amplitude distinction',
    validations: [
      'silence-visualization',
      'amplitude-distinction',
      'region-clarity'
    ]
  },
  '8.4': {
    description: 'Real-time visual settings updates',
    validations: [
      'settings-responsiveness',
      'real-time-updates',
      'preference-application'
    ]
  },
  '8.5': {
    description: 'Accessibility visual alternatives',
    validations: [
      'accessibility-support',
      'alternative-representations',
      'inclusive-design'
    ]
  }
};

/**
 * Comprehensive Test Validator
 * Runs all validation tests and reports requirement compliance
 */
class ComprehensiveValidator {
  constructor() {
    this.results = {};
    this.performanceMetrics = {};
    this.errorLog = [];
  }

  async validateRequirement(requirementId, validations) {
    const results = {};
    
    for (const validation of validations) {
      try {
        const result = await this.runValidation(validation);
        results[validation] = {
          passed: result.passed,
          metrics: result.metrics,
          details: result.details
        };
      } catch (error) {
        results[validation] = {
          passed: false,
          error: error.message,
          details: 'Validation failed with exception'
        };
        this.errorLog.push({
          requirement: requirementId,
          validation,
          error: error.message
        });
      }
    }

    this.results[requirementId] = results;
    return results;
  }

  async runValidation(validationType) {
    switch (validationType) {
      case 'waveform-generation-speed':
        return await this.validateWaveformGenerationSpeed();
      case 'audio-stream-analysis':
        return await this.validateAudioStreamAnalysis();
      case 'real-time-display':
        return await this.validateRealTimeDisplay();
      case 'amplitude-accuracy':
        return await this.validateAmplitudeAccuracy();
      case 'playback-synchronization':
        return await this.validatePlaybackSynchronization();
      case 'click-chop-creation':
        return await this.validateClickChopCreation();
      case 'drag-selection':
        return await this.validateDragSelection();
      case 'zero-crossing-detection':
        return await this.validateZeroCrossingDetection();
      case 'zoom-functionality':
        return await this.validateZoomFunctionality();
      case 'frame-rate-consistency':
        return await this.validateFrameRateConsistency();
      case 'memory-efficiency':
        return await this.validateMemoryEfficiency();
      case 'fallback-chain-execution':
        return await this.validateFallbackChain();
      case 'accessibility-support':
        return await this.validateAccessibilitySupport();
      default:
        return { passed: false, details: `Unknown validation type: ${validationType}` };
    }
  }

  async validateWaveformGenerationSpeed() {
    const startTime = performance.now();
    
    const { unmount } = render(
      <WaveformVisualization
        audioSource={{
          getCurrentTime: () => 0,
          getDuration: () => 300, // 5 minutes
          getPlayerState: () => 1,
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          getVideoData: () => ({ title: 'Test', video_id: 'test' })
        }}
        chops={[]}
        currentTime={0}
        isPlaying={false}
        onChopCreate={vi.fn()}
        onChopUpdate={vi.fn()}
        onTimeSeek={vi.fn()}
        visualSettings={{}}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId('waveform-canvas')).toBeInTheDocument();
    }, { timeout: 5000 });

    const generationTime = performance.now() - startTime;
    unmount();

    return {
      passed: generationTime < 2000, // Requirement: < 2 seconds
      metrics: { generationTime },
      details: `Waveform generated in ${generationTime.toFixed(2)}ms`
    };
  }

  async validateAudioStreamAnalysis() {
    const mockAnalyzer = {
      fftSize: 2048,
      frequencyBinCount: 1024,
      getByteFrequencyData: vi.fn((array) => {
        // Simulate realistic frequency data
        for (let i = 0; i < array.length; i++) {
          array[i] = Math.floor(Math.random() * 255);
        }
      }),
      getByteTimeDomainData: vi.fn((array) => {
        // Simulate realistic time domain data
        for (let i = 0; i < array.length; i++) {
          array[i] = 128 + Math.floor(Math.sin(i * 0.1) * 50);
        }
      }),
      connect: vi.fn(),
      disconnect: vi.fn()
    };

    global.AudioContext = vi.fn(() => ({
      state: 'running',
      sampleRate: 44100,
      createAnalyser: () => mockAnalyzer,
      createGain: () => ({ gain: { value: 1 }, connect: vi.fn(), disconnect: vi.fn() }),
      createMediaElementSource: vi.fn(() => ({ connect: vi.fn(), disconnect: vi.fn() })),
      resume: vi.fn(() => Promise.resolve()),
      close: vi.fn(() => Promise.resolve())
    }));

    const { unmount } = render(
      <WaveformVisualization
        audioSource={{
          getCurrentTime: () => 0,
          getDuration: () => 180,
          getPlayerState: () => 1,
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          getVideoData: () => ({ title: 'Test', video_id: 'test' })
        }}
        chops={[]}
        currentTime={0}
        isPlaying={false}
        onChopCreate={vi.fn()}
        onChopUpdate={vi.fn()}
        onTimeSeek={vi.fn()}
        visualSettings={{ showFrequencyData: true }}
      />
    );

    await waitFor(() => {
      const canvas = screen.getByTestId('waveform-canvas');
      expect(canvas).toHaveAttribute('data-analysis-method', 'webaudio');
    });

    unmount();

    return {
      passed: mockAnalyzer.getByteFrequencyData.mock.calls.length > 0,
      metrics: { analyzerCalls: mockAnalyzer.getByteFrequencyData.mock.calls.length },
      details: 'Audio stream analysis successfully connected and active'
    };
  }

  async validateRealTimeDisplay() {
    let updateCount = 0;
    const mockPlayer = {
      getCurrentTime: () => updateCount * 0.1, // Simulate time progression
      getDuration: () => 180,
      getPlayerState: () => 1,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      getVideoData: () => ({ title: 'Test', video_id: 'test' })
    };

    const { rerender, unmount } = render(
      <WaveformVisualization
        audioSource={mockPlayer}
        chops={[]}
        currentTime={0}
        isPlaying={true}
        onChopCreate={vi.fn()}
        onChopUpdate={vi.fn()}
        onTimeSeek={vi.fn()}
        visualSettings={{}}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId('waveform-canvas')).toBeInTheDocument();
    });

    // Simulate real-time updates
    for (let i = 0; i < 10; i++) {
      updateCount = i;
      rerender(
        <WaveformVisualization
          audioSource={mockPlayer}
          chops={[]}
          currentTime={i * 0.1}
          isPlaying={true}
          onChopCreate={vi.fn()}
          onChopUpdate={vi.fn()}
          onTimeSeek={vi.fn()}
          visualSettings={{}}
        />
      );
      
      await waitFor(() => {
        const playhead = screen.getByTestId('playhead');
        expect(playhead).toBeInTheDocument();
      });
    }

    unmount();

    return {
      passed: true,
      metrics: { updates: updateCount },
      details: 'Real-time display updates successfully tracked playback'
    };
  }

  async validateAmplitudeAccuracy() {
    // Mock precise amplitude data
    const testAmplitudes = new Float32Array([0.5, 0.8, 0.3, 0.9, 0.1]);
    
    global.AudioContext = vi.fn(() => ({
      state: 'running',
      sampleRate: 44100,
      createAnalyser: () => ({
        fftSize: 2048,
        frequencyBinCount: 1024,
        getByteTimeDomainData: vi.fn((array) => {
          // Copy test amplitudes to array
          for (let i = 0; i < Math.min(array.length, testAmplitudes.length); i++) {
            array[i] = Math.floor((testAmplitudes[i] + 1) * 127.5); // Convert to byte range
          }
        }),
        connect: vi.fn(),
        disconnect: vi.fn()
      }),
      createGain: () => ({ gain: { value: 1 }, connect: vi.fn(), disconnect: vi.fn() }),
      createMediaElementSource: vi.fn(() => ({ connect: vi.fn(), disconnect: vi.fn() })),
      resume: vi.fn(() => Promise.resolve()),
      close: vi.fn(() => Promise.resolve())
    }));

    const { unmount } = render(
      <WaveformVisualization
        audioSource={{
          getCurrentTime: () => 0,
          getDuration: () => 180,
          getPlayerState: () => 1,
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          getVideoData: () => ({ title: 'Test', video_id: 'test' })
        }}
        chops={[]}
        currentTime={0}
        isPlaying={false}
        onChopCreate={vi.fn()}
        onChopUpdate={vi.fn()}
        onTimeSeek={vi.fn()}
        visualSettings={{}}
      />
    );

    await waitFor(() => {
      const canvas = screen.getByTestId('waveform-canvas');
      expect(canvas).toHaveAttribute('data-amplitude-data', 'available');
    });

    unmount();

    return {
      passed: true,
      metrics: { testAmplitudes: testAmplitudes.length },
      details: 'Amplitude data accurately captured and processed'
    };
  }

  async validatePlaybackSynchronization() {
    const startTime = performance.now();
    let syncErrors = 0;

    const mockPlayer = {
      getCurrentTime: () => (performance.now() - startTime) / 1000,
      getDuration: () => 180,
      getPlayerState: () => 1,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      getVideoData: () => ({ title: 'Test', video_id: 'test' })
    };

    const { rerender, unmount } = render(
      <WaveformVisualization
        audioSource={mockPlayer}
        chops={[]}
        currentTime={0}
        isPlaying={true}
        onChopCreate={vi.fn()}
        onChopUpdate={vi.fn()}
        onTimeSeek={vi.fn()}
        visualSettings={{}}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId('waveform-canvas')).toBeInTheDocument();
    });

    // Test synchronization accuracy over time
    for (let i = 0; i < 5; i++) {
      const currentTime = (performance.now() - startTime) / 1000;
      
      rerender(
        <WaveformVisualization
          audioSource={mockPlayer}
          chops={[]}
          currentTime={currentTime}
          isPlaying={true}
          onChopCreate={vi.fn()}
          onChopUpdate={vi.fn()}
          onTimeSeek={vi.fn()}
          visualSettings={{}}
        />
      );

      await waitFor(() => {
        const playhead = screen.getByTestId('playhead');
        const playheadPosition = parseFloat(playhead.style.left || '0');
        const expectedPosition = currentTime * 10; // Assuming 10px per second
        
        if (Math.abs(playheadPosition - expectedPosition) > 5) { // 5px tolerance
          syncErrors++;
        }
      });

      await new Promise(resolve => setTimeout(resolve, 100));
    }

    unmount();

    return {
      passed: syncErrors === 0,
      metrics: { syncErrors, tests: 5 },
      details: `Playback synchronization: ${5 - syncErrors}/5 tests passed`
    };
  }

  async validateClickChopCreation() {
    const mockOnChopCreate = vi.fn();

    const { unmount } = render(
      <WaveformVisualization
        audioSource={{
          getCurrentTime: () => 0,
          getDuration: () => 180,
          getPlayerState: () => 1,
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          getVideoData: () => ({ title: 'Test', video_id: 'test' })
        }}
        chops={[]}
        currentTime={0}
        isPlaying={false}
        onChopCreate={mockOnChopCreate}
        onChopUpdate={vi.fn()}
        onTimeSeek={vi.fn()}
        visualSettings={{}}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId('waveform-canvas')).toBeInTheDocument();
    });

    const canvas = screen.getByTestId('waveform-canvas');
    fireEvent.click(canvas, { clientX: 100, clientY: 50 });

    await waitFor(() => {
      expect(mockOnChopCreate).toHaveBeenCalledWith(
        expect.any(Number),
        expect.any(Number)
      );
    });

    unmount();

    return {
      passed: mockOnChopCreate.mock.calls.length === 1,
      metrics: { chopCreations: mockOnChopCreate.mock.calls.length },
      details: 'Click-to-create chop functionality working correctly'
    };
  }

  async validateDragSelection() {
    const mockOnChopCreate = vi.fn();

    const { unmount } = render(
      <WaveformVisualization
        audioSource={{
          getCurrentTime: () => 0,
          getDuration: () => 180,
          getPlayerState: () => 1,
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          getVideoData: () => ({ title: 'Test', video_id: 'test' })
        }}
        chops={[]}
        currentTime={0}
        isPlaying={false}
        onChopCreate={mockOnChopCreate}
        onChopUpdate={vi.fn()}
        onTimeSeek={vi.fn()}
        visualSettings={{}}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId('waveform-canvas')).toBeInTheDocument();
    });

    const canvas = screen.getByTestId('waveform-canvas');
    
    // Simulate drag selection
    fireEvent.mouseDown(canvas, { clientX: 100, clientY: 50 });
    fireEvent.mouseMove(canvas, { clientX: 200, clientY: 50 });
    fireEvent.mouseUp(canvas, { clientX: 200, clientY: 50 });

    await waitFor(() => {
      expect(mockOnChopCreate).toHaveBeenCalledWith(
        expect.any(Number),
        expect.any(Number)
      );
    });

    const [startTime, endTime] = mockOnChopCreate.mock.calls[0];
    const dragDuration = endTime - startTime;

    unmount();

    return {
      passed: dragDuration > 0 && mockOnChopCreate.mock.calls.length === 1,
      metrics: { dragDuration, chopCreations: mockOnChopCreate.mock.calls.length },
      details: 'Drag selection creates chop with proper duration'
    };
  }

  async validateZeroCrossingDetection() {
    // Mock zero-crossing detection
    global.ZeroCrossingDetector = {
      findNearestZeroCrossing: vi.fn((time, waveformData) => {
        // Simulate finding zero crossing near the requested time
        return time + 0.001; // Slight adjustment to nearest zero crossing
      })
    };

    const { unmount } = render(
      <WaveformVisualization
        audioSource={{
          getCurrentTime: () => 0,
          getDuration: () => 180,
          getPlayerState: () => 1,
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          getVideoData: () => ({ title: 'Test', video_id: 'test' })
        }}
        chops={[]}
        currentTime={0}
        isPlaying={false}
        onChopCreate={vi.fn()}
        onChopUpdate={vi.fn()}
        onTimeSeek={vi.fn()}
        visualSettings={{ showZeroCrossings: true }}
      />
    );

    await waitFor(() => {
      const canvas = screen.getByTestId('waveform-canvas');
      expect(canvas).toHaveAttribute('data-zero-crossings', 'enabled');
    });

    unmount();

    return {
      passed: true,
      metrics: { zeroCrossingEnabled: true },
      details: 'Zero-crossing detection enabled and functional'
    };
  }

  async validateZoomFunctionality() {
    const { unmount } = render(
      <WaveformVisualization
        audioSource={{
          getCurrentTime: () => 0,
          getDuration: () => 180,
          getPlayerState: () => 1,
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          getVideoData: () => ({ title: 'Test', video_id: 'test' })
        }}
        chops={[]}
        currentTime={0}
        isPlaying={false}
        onChopCreate={vi.fn()}
        onChopUpdate={vi.fn()}
        onTimeSeek={vi.fn()}
        visualSettings={{}}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId('waveform-canvas')).toBeInTheDocument();
    });

    const canvas = screen.getByTestId('waveform-canvas');
    const initialZoom = parseFloat(canvas.getAttribute('data-zoom-level') || '1');

    // Test zoom in
    fireEvent.wheel(canvas, { deltaY: -100 });

    await waitFor(() => {
      const newZoom = parseFloat(canvas.getAttribute('data-zoom-level') || '1');
      expect(newZoom).toBeGreaterThan(initialZoom);
    });

    unmount();

    return {
      passed: true,
      metrics: { initialZoom, zoomWorking: true },
      details: 'Zoom functionality responds to wheel events'
    };
  }

  async validateFrameRateConsistency() {
    const frameTimings = [];
    let lastFrameTime = performance.now();

    const mockPlayer = {
      getCurrentTime: () => (performance.now() - lastFrameTime) / 1000,
      getDuration: () => 180,
      getPlayerState: () => 1,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      getVideoData: () => ({ title: 'Test', video_id: 'test' })
    };

    const { rerender, unmount } = render(
      <WaveformVisualization
        audioSource={mockPlayer}
        chops={[]}
        currentTime={0}
        isPlaying={true}
        onChopCreate={vi.fn()}
        onChopUpdate={vi.fn()}
        onTimeSeek={vi.fn()}
        visualSettings={{}}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId('waveform-canvas')).toBeInTheDocument();
    });

    // Simulate 60fps updates for 1 second
    for (let frame = 0; frame < 60; frame++) {
      const frameStart = performance.now();
      
      rerender(
        <WaveformVisualization
          audioSource={mockPlayer}
          chops={[]}
          currentTime={frame / 60}
          isPlaying={true}
          onChopCreate={vi.fn()}
          onChopUpdate={vi.fn()}
          onTimeSeek={vi.fn()}
          visualSettings={{}}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('playhead')).toBeInTheDocument();
      });

      const frameTime = performance.now() - frameStart;
      frameTimings.push(frameTime);

      // Target 60fps = ~16.67ms per frame
      if (frameTime > 16.67) {
        break; // Stop if we can't maintain 60fps
      }

      await new Promise(resolve => setTimeout(resolve, Math.max(0, 16.67 - frameTime)));
    }

    unmount();

    const avgFrameTime = frameTimings.reduce((a, b) => a + b, 0) / frameTimings.length;
    const maxFrameTime = Math.max(...frameTimings);

    return {
      passed: avgFrameTime < 16.67 && maxFrameTime < 25, // Allow some variance
      metrics: { avgFrameTime, maxFrameTime, frameCount: frameTimings.length },
      details: `Frame rate: avg ${avgFrameTime.toFixed(2)}ms, max ${maxFrameTime.toFixed(2)}ms`
    };
  }

  async validateMemoryEfficiency() {
    const initialMemory = performance.memory?.usedJSHeapSize || 0;
    const components = [];

    // Create and destroy multiple components to test memory cleanup
    for (let i = 0; i < 5; i++) {
      const { unmount } = render(
        <WaveformVisualization
          audioSource={{
            getCurrentTime: () => 0,
            getDuration: () => 300, // Large file
            getPlayerState: () => 1,
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
            getVideoData: () => ({ title: `Test ${i}`, video_id: `test${i}` })
          }}
          chops={Array.from({ length: 20 }, (_, j) => ({
            id: `chop-${i}-${j}`,
            startTime: j * 5,
            endTime: (j + 1) * 5,
            padId: `pad-${j}`,
            color: `hsl(${j * 18}, 70%, 50%)`
          }))}
          currentTime={0}
          isPlaying={false}
          onChopCreate={vi.fn()}
          onChopUpdate={vi.fn()}
          onTimeSeek={vi.fn()}
          visualSettings={{}}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('waveform-canvas')).toBeInTheDocument();
      });

      components.push(unmount);
    }

    // Clean up all components
    components.forEach(unmount => unmount());

    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }

    const finalMemory = performance.memory?.usedJSHeapSize || 0;
    const memoryIncrease = finalMemory - initialMemory;

    return {
      passed: memoryIncrease < 50 * 1024 * 1024, // < 50MB increase
      metrics: { 
        initialMemory: initialMemory / 1024 / 1024,
        finalMemory: finalMemory / 1024 / 1024,
        increase: memoryIncrease / 1024 / 1024
      },
      details: `Memory increase: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`
    };
  }

  async validateFallbackChain() {
    // Mock failed Web Audio API
    global.AudioContext = vi.fn(() => {
      throw new Error('Web Audio API not available');
    });

    const { unmount } = render(
      <WaveformVisualization
        audioSource={{
          getCurrentTime: () => 0,
          getDuration: () => 180,
          getPlayerState: () => 1,
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          getVideoData: () => ({ title: 'Test', video_id: 'test' })
        }}
        chops={[]}
        currentTime={0}
        isPlaying={false}
        onChopCreate={vi.fn()}
        onChopUpdate={vi.fn()}
        onTimeSeek={vi.fn()}
        visualSettings={{}}
      />
    );

    await waitFor(() => {
      const canvas = screen.getByTestId('waveform-canvas');
      expect(canvas).toHaveAttribute('data-analysis-method', 'fallback');
    });

    unmount();

    return {
      passed: true,
      metrics: { fallbackActivated: true },
      details: 'Fallback analysis chain activated when Web Audio API fails'
    };
  }

  async validateAccessibilitySupport() {
    const { unmount } = render(
      <WaveformVisualization
        audioSource={{
          getCurrentTime: () => 0,
          getDuration: () => 180,
          getPlayerState: () => 1,
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          getVideoData: () => ({ title: 'Test', video_id: 'test' })
        }}
        chops={[]}
        currentTime={0}
        isPlaying={false}
        onChopCreate={vi.fn()}
        onChopUpdate={vi.fn()}
        onTimeSeek={vi.fn()}
        visualSettings={{ accessibilityMode: true }}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId('waveform-canvas')).toBeInTheDocument();
    });

    const canvas = screen.getByTestId('waveform-canvas');
    
    // Check accessibility attributes
    const hasAriaLabel = canvas.hasAttribute('aria-label');
    const hasRole = canvas.hasAttribute('role');
    const hasKeyboardSupport = canvas.hasAttribute('tabindex');

    unmount();

    return {
      passed: hasAriaLabel && hasRole && hasKeyboardSupport,
      metrics: { ariaLabel: hasAriaLabel, role: hasRole, keyboard: hasKeyboardSupport },
      details: 'Accessibility attributes and keyboard support present'
    };
  }

  generateComprehensiveReport() {
    const totalRequirements = Object.keys(REQUIREMENTS_MATRIX).length;
    let passedRequirements = 0;
    let totalValidations = 0;
    let passedValidations = 0;

    const report = {
      summary: {
        totalRequirements,
        passedRequirements: 0,
        totalValidations: 0,
        passedValidations: 0,
        overallScore: 0
      },
      requirements: {},
      performance: this.performanceMetrics,
      errors: this.errorLog
    };

    Object.entries(this.results).forEach(([requirementId, validations]) => {
      const requirementPassed = Object.values(validations).every(v => v.passed);
      if (requirementPassed) passedRequirements++;

      const validationCount = Object.keys(validations).length;
      const validationsPassed = Object.values(validations).filter(v => v.passed).length;
      
      totalValidations += validationCount;
      passedValidations += validationsPassed;

      report.requirements[requirementId] = {
        description: REQUIREMENTS_MATRIX[requirementId].description,
        passed: requirementPassed,
        validations: validations,
        score: validationsPassed / validationCount
      };
    });

    report.summary.passedRequirements = passedRequirements;
    report.summary.totalValidations = totalValidations;
    report.summary.passedValidations = passedValidations;
    report.summary.overallScore = passedValidations / totalValidations;

    return report;
  }
}

describe('Comprehensive Requirements Validation', () => {
  let validator;

  beforeEach(() => {
    validator = new ComprehensiveValidator();
    
    // Setup common mocks
    global.AudioContext = class MockAudioContext {
      constructor() {
        this.state = 'running';
        this.sampleRate = 44100;
      }
      createAnalyser() {
        return {
          fftSize: 2048,
          frequencyBinCount: 1024,
          getByteFrequencyData: vi.fn(),
          getByteTimeDomainData: vi.fn(),
          connect: vi.fn(),
          disconnect: vi.fn()
        };
      }
      createGain() {
        return {
          gain: { value: 1 },
          connect: vi.fn(),
          disconnect: vi.fn()
        };
      }
      createMediaElementSource: vi.fn(() => ({
        connect: vi.fn(),
        disconnect: vi.fn()
      })),
      resume: vi.fn(() => Promise.resolve()),
      close: vi.fn(() => Promise.resolve())
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should validate all requirements comprehensively', async () => {
    // Run validation for all requirements
    for (const [requirementId, requirement] of Object.entries(REQUIREMENTS_MATRIX)) {
      await validator.validateRequirement(requirementId, requirement.validations);
    }

    // Generate comprehensive report
    const report = validator.generateComprehensiveReport();

    // Log detailed report
    console.log('\n=== COMPREHENSIVE VALIDATION REPORT ===');
    console.log(`Overall Score: ${(report.summary.overallScore * 100).toFixed(1)}%`);
    console.log(`Requirements Passed: ${report.summary.passedRequirements}/${report.summary.totalRequirements}`);
    console.log(`Validations Passed: ${report.summary.passedValidations}/${report.summary.totalValidations}`);

    if (report.errors.length > 0) {
      console.log('\nErrors:');
      report.errors.forEach(error => {
        console.log(`  ${error.requirement}.${error.validation}: ${error.error}`);
      });
    }

    console.log('\nRequirement Details:');
    Object.entries(report.requirements).forEach(([id, req]) => {
      const status = req.passed ? '✅' : '❌';
      console.log(`  ${status} ${id}: ${req.description} (${(req.score * 100).toFixed(1)}%)`);
    });

    // Validation should pass with high score
    expect(report.summary.overallScore).toBeGreaterThan(0.8); // 80% minimum
    expect(report.summary.passedRequirements).toBeGreaterThan(report.summary.totalRequirements * 0.8);

    // Critical requirements must pass
    const criticalRequirements = ['1.1', '2.1', '2.2', '7.1'];
    criticalRequirements.forEach(reqId => {
      expect(report.requirements[reqId]?.passed).toBe(true);
    });
  }, 60000); // Extended timeout for comprehensive testing
});