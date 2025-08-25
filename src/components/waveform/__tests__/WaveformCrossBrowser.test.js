/**
 * Cross-Browser Compatibility Tests for Waveform Visualization
 * Tests different audio analysis methods across browser capabilities
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { WaveformVisualization } from '../WaveformVisualization.jsx';
import { WebAudioAnalyzer } from '../../../services/WebAudioAnalyzer.js';
import { FallbackAnalysisChain } from '../../../services/FallbackAnalysisChain.js';

// Browser capability simulation utilities
class BrowserCapabilitySimulator {
  static simulateChrome() {
    global.AudioContext = class MockChromeAudioContext {
      constructor() {
        this.state = 'running';
        this.sampleRate = 44100;
        this.destination = { connect: vi.fn(), disconnect: vi.fn() };
      }

      createAnalyser() {
        return {
          fftSize: 2048,
          frequencyBinCount: 1024,
          smoothingTimeConstant: 0.8,
          minDecibels: -100,
          maxDecibels: -30,
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
      }

      createGain() {
        return {
          gain: { value: 1, setValueAtTime: vi.fn() },
          connect: vi.fn(),
          disconnect: vi.fn()
        };
      }

      createMediaElementSource(element) {
        return {
          mediaElement: element,
          connect: vi.fn(),
          disconnect: vi.fn()
        };
      }

      createScriptProcessor(bufferSize, inputChannels, outputChannels) {
        return {
          bufferSize,
          onaudioprocess: null,
          connect: vi.fn(),
          disconnect: vi.fn()
        };
      }

      resume() {
        this.state = 'running';
        return Promise.resolve();
      }

      close() {
        this.state = 'closed';
        return Promise.resolve();
      }
    };

    global.webkitAudioContext = global.AudioContext;
    
    // Chrome supports modern features
    global.OfflineAudioContext = global.AudioContext;
    global.MediaElementAudioSourceNode = class {};
    global.AnalyserNode = class {};
  }

  static simulateFirefox() {
    global.AudioContext = class MockFirefoxAudioContext {
      constructor() {
        this.state = 'running';
        this.sampleRate = 44100;
        this.destination = { connect: vi.fn(), disconnect: vi.fn() };
      }

      createAnalyser() {
        return {
          fftSize: 2048,
          frequencyBinCount: 1024,
          smoothingTimeConstant: 0.8,
          minDecibels: -100,
          maxDecibels: -30,
          getByteFrequencyData: vi.fn((array) => {
            // Firefox might have slightly different behavior
            for (let i = 0; i < array.length; i++) {
              array[i] = Math.floor(Math.random() * 200) + 25; // Different range
            }
          }),
          getByteTimeDomainData: vi.fn((array) => {
            for (let i = 0; i < array.length; i++) {
              array[i] = 128 + Math.floor(Math.cos(i * 0.08) * 40); // Different pattern
            }
          }),
          connect: vi.fn(),
          disconnect: vi.fn()
        };
      }

      createGain() {
        return {
          gain: { value: 1, setValueAtTime: vi.fn() },
          connect: vi.fn(),
          disconnect: vi.fn()
        };
      }

      createMediaElementSource(element) {
        return {
          mediaElement: element,
          connect: vi.fn(),
          disconnect: vi.fn()
        };
      }

      resume() {
        return Promise.resolve();
      }

      close() {
        return Promise.resolve();
      }
    };

    // Firefox doesn't have webkit prefix
    global.webkitAudioContext = undefined;
    global.OfflineAudioContext = global.AudioContext;
  }

  static simulateSafari() {
    global.AudioContext = class MockSafariAudioContext {
      constructor() {
        this.state = 'suspended'; // Safari starts suspended
        this.sampleRate = 44100;
        this.destination = { connect: vi.fn(), disconnect: vi.fn() };
      }

      createAnalyser() {
        return {
          fftSize: 1024, // Safari might have different default
          frequencyBinCount: 512,
          smoothingTimeConstant: 0.8,
          minDecibels: -100,
          maxDecibels: -30,
          getByteFrequencyData: vi.fn((array) => {
            // Safari might have more conservative data
            for (let i = 0; i < array.length; i++) {
              array[i] = Math.floor(Math.random() * 150) + 50;
            }
          }),
          getByteTimeDomainData: vi.fn((array) => {
            for (let i = 0; i < array.length; i++) {
              array[i] = 128 + Math.floor(Math.sin(i * 0.05) * 30);
            }
          }),
          connect: vi.fn(),
          disconnect: vi.fn()
        };
      }

      createGain() {
        return {
          gain: { value: 1, setValueAtTime: vi.fn() },
          connect: vi.fn(),
          disconnect: vi.fn()
        };
      }

      // Safari might not support createMediaElementSource
      createMediaElementSource() {
        throw new Error('createMediaElementSource not supported');
      }

      resume() {
        this.state = 'running';
        return Promise.resolve();
      }

      close() {
        return Promise.resolve();
      }
    };

    global.webkitAudioContext = global.AudioContext;
    global.OfflineAudioContext = global.AudioContext;
  }

  static simulateEdge() {
    global.AudioContext = class MockEdgeAudioContext {
      constructor() {
        this.state = 'running';
        this.sampleRate = 48000; // Edge might use different sample rate
        this.destination = { connect: vi.fn(), disconnect: vi.fn() };
      }

      createAnalyser() {
        return {
          fftSize: 2048,
          frequencyBinCount: 1024,
          smoothingTimeConstant: 0.8,
          minDecibels: -100,
          maxDecibels: -30,
          getByteFrequencyData: vi.fn((array) => {
            for (let i = 0; i < array.length; i++) {
              array[i] = Math.floor(Math.random() * 255);
            }
          }),
          getByteTimeDomainData: vi.fn((array) => {
            for (let i = 0; i < array.length; i++) {
              array[i] = 128 + Math.floor(Math.sin(i * 0.12) * 60);
            }
          }),
          connect: vi.fn(),
          disconnect: vi.fn()
        };
      }

      createGain() {
        return {
          gain: { value: 1, setValueAtTime: vi.fn() },
          connect: vi.fn(),
          disconnect: vi.fn()
        };
      }

      createMediaElementSource(element) {
        return {
          mediaElement: element,
          connect: vi.fn(),
          disconnect: vi.fn()
        };
      }

      resume() {
        return Promise.resolve();
      }

      close() {
        return Promise.resolve();
      }
    };

    global.webkitAudioContext = undefined;
    global.OfflineAudioContext = global.AudioContext;
  }

  static simulateLegacyBrowser() {
    // No Web Audio API support
    global.AudioContext = undefined;
    global.webkitAudioContext = undefined;
    global.OfflineAudioContext = undefined;
    
    // Limited canvas support
    global.HTMLCanvasElement.prototype.getContext = vi.fn((type) => {
      if (type === '2d') {
        return {
          fillRect: vi.fn(),
          strokeRect: vi.fn(),
          clearRect: vi.fn(),
          fillText: vi.fn(),
          measureText: vi.fn(() => ({ width: 100 })),
          beginPath: vi.fn(),
          moveTo: vi.fn(),
          lineTo: vi.fn(),
          stroke: vi.fn(),
          fill: vi.fn(),
          save: vi.fn(),
          restore: vi.fn(),
          translate: vi.fn(),
          scale: vi.fn(),
          createImageData: vi.fn(() => ({
            data: new Uint8ClampedArray(1000),
            width: 100,
            height: 10
          })),
          putImageData: vi.fn(),
          getImageData: vi.fn(() => ({
            data: new Uint8ClampedArray(1000),
            width: 100,
            height: 10
          }))
        };
      }
      return null;
    });
  }

  static reset() {
    delete global.AudioContext;
    delete global.webkitAudioContext;
    delete global.OfflineAudioContext;
    delete global.MediaElementAudioSourceNode;
    delete global.AnalyserNode;
  }
}

const mockYouTubePlayer = {
  getCurrentTime: vi.fn(() => 0),
  getDuration: vi.fn(() => 180),
  getPlayerState: vi.fn(() => 1),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  getVideoData: vi.fn(() => ({
    title: 'Cross-Browser Test Video',
    video_id: 'cb123'
  }))
};

describe('Cross-Browser Compatibility Tests', () => {
  let mockOnChopCreate, mockOnChopUpdate, mockOnTimeSeek;

  beforeEach(() => {
    mockOnChopCreate = vi.fn();
    mockOnChopUpdate = vi.fn();
    mockOnTimeSeek = vi.fn();
  });

  afterEach(() => {
    BrowserCapabilitySimulator.reset();
    vi.clearAllMocks();
  });

  describe('Chrome Browser Compatibility', () => {
    beforeEach(() => {
      BrowserCapabilitySimulator.simulateChrome();
    });

    it('should use Web Audio API for optimal performance', async () => {
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
        const canvas = screen.getByTestId('waveform-canvas');
        expect(canvas).toHaveAttribute('data-analysis-method', 'webaudio');
      }, { timeout: 5000 });

      // Should support all advanced features
      expect(screen.getByTestId('frequency-analysis')).toBeInTheDocument();
      expect(screen.getByTestId('zero-crossing-markers')).toBeInTheDocument();
    });

    it('should handle high-quality audio analysis', async () => {
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
            showZeroCrossings: true,
            analysisQuality: 'high'
          }}
        />
      );

      await waitFor(() => {
        const canvas = screen.getByTestId('waveform-canvas');
        expect(canvas).toHaveAttribute('data-analysis-quality', 'high');
      });

      // Chrome should handle high-quality analysis
      const canvas = screen.getByTestId('waveform-canvas');
      fireEvent.click(canvas, { clientX: 100, clientY: 50 });

      await waitFor(() => {
        expect(mockOnChopCreate).toHaveBeenCalledWith(
          expect.any(Number),
          expect.any(Number)
        );
      });
    });
  });

  describe('Firefox Browser Compatibility', () => {
    beforeEach(() => {
      BrowserCapabilitySimulator.simulateFirefox();
    });

    it('should work with Firefox Web Audio implementation', async () => {
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
        const canvas = screen.getByTestId('waveform-canvas');
        expect(canvas).toHaveAttribute('data-analysis-method', 'webaudio');
      });

      // Should adapt to Firefox's audio data patterns
      const canvas = screen.getByTestId('waveform-canvas');
      expect(canvas).toHaveAttribute('data-browser-optimized', 'firefox');
    });

    it('should handle Firefox-specific audio quirks', async () => {
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

      // Firefox should still support core functionality
      const canvas = screen.getByTestId('waveform-canvas');
      fireEvent.click(canvas, { clientX: 150, clientY: 50 });

      await waitFor(() => {
        expect(mockOnChopCreate).toHaveBeenCalled();
      });
    });
  });

  describe('Safari Browser Compatibility', () => {
    beforeEach(() => {
      BrowserCapabilitySimulator.simulateSafari();
    });

    it('should handle Safari audio context limitations', async () => {
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
        const canvas = screen.getByTestId('waveform-canvas');
        // Should fall back to alternative analysis due to Safari limitations
        expect(canvas).toHaveAttribute('data-analysis-method', 'fallback');
      });

      // Should still provide basic functionality
      expect(screen.getByTestId('waveform-canvas')).toBeInTheDocument();
    });

    it('should work around Safari suspended audio context', async () => {
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

      // Simulate user interaction to resume audio context
      const canvas = screen.getByTestId('waveform-canvas');
      fireEvent.click(canvas, { clientX: 100, clientY: 50 });

      await waitFor(() => {
        expect(mockOnChopCreate).toHaveBeenCalled();
      });

      // Should handle audio context resume
      expect(canvas).toHaveAttribute('data-audio-context-state', 'running');
    });
  });

  describe('Edge Browser Compatibility', () => {
    beforeEach(() => {
      BrowserCapabilitySimulator.simulateEdge();
    });

    it('should adapt to Edge audio characteristics', async () => {
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
        const canvas = screen.getByTestId('waveform-canvas');
        expect(canvas).toHaveAttribute('data-analysis-method', 'webaudio');
      });

      // Should adapt to Edge's 48kHz sample rate
      expect(canvas).toHaveAttribute('data-sample-rate', '48000');
    });
  });

  describe('Legacy Browser Compatibility', () => {
    beforeEach(() => {
      BrowserCapabilitySimulator.simulateLegacyBrowser();
    });

    it('should provide graceful fallback for browsers without Web Audio API', async () => {
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
            showFrequencyData: false, // Disabled for legacy
            showZeroCrossings: false
          }}
        />
      );

      await waitFor(() => {
        const canvas = screen.getByTestId('waveform-canvas');
        expect(canvas).toHaveAttribute('data-analysis-method', 'procedural');
      });

      // Should still allow basic chop creation
      const canvas = screen.getByTestId('waveform-canvas');
      fireEvent.click(canvas, { clientX: 100, clientY: 50 });

      await waitFor(() => {
        expect(mockOnChopCreate).toHaveBeenCalled();
      });

      // Should show appropriate user messaging
      expect(screen.getByText(/limited browser support/i)).toBeInTheDocument();
    });

    it('should maintain core functionality without advanced features', async () => {
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
            showFrequencyData: false,
            showZeroCrossings: false
          }}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('waveform-canvas')).toBeInTheDocument();
      });

      // Basic interactions should still work
      const canvas = screen.getByTestId('waveform-canvas');
      
      // Click to create chop
      fireEvent.click(canvas, { clientX: 100, clientY: 50 });
      await waitFor(() => {
        expect(mockOnChopCreate).toHaveBeenCalled();
      });

      // Drag to create region
      fireEvent.mouseDown(canvas, { clientX: 150, clientY: 50 });
      fireEvent.mouseMove(canvas, { clientX: 200, clientY: 50 });
      fireEvent.mouseUp(canvas, { clientX: 200, clientY: 50 });

      await waitFor(() => {
        expect(mockOnChopCreate).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('Feature Detection and Adaptation', () => {
    it('should detect and adapt to available browser features', async () => {
      const testCases = [
        {
          name: 'Full Web Audio Support',
          setup: () => BrowserCapabilitySimulator.simulateChrome(),
          expectedFeatures: ['webaudio', 'frequency-analysis', 'zero-crossings']
        },
        {
          name: 'Limited Web Audio Support',
          setup: () => BrowserCapabilitySimulator.simulateSafari(),
          expectedFeatures: ['fallback', 'basic-waveform']
        },
        {
          name: 'No Web Audio Support',
          setup: () => BrowserCapabilitySimulator.simulateLegacyBrowser(),
          expectedFeatures: ['procedural', 'basic-interaction']
        }
      ];

      for (const testCase of testCases) {
        testCase.setup();

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
          expect(screen.getByTestId('waveform-canvas')).toBeInTheDocument();
        });

        // Verify expected features are available/unavailable
        const canvas = screen.getByTestId('waveform-canvas');
        const availableFeatures = canvas.getAttribute('data-available-features')?.split(',') || [];

        testCase.expectedFeatures.forEach(feature => {
          if (feature.startsWith('no-')) {
            expect(availableFeatures).not.toContain(feature.substring(3));
          } else {
            expect(availableFeatures).toContain(feature);
          }
        });

        unmount();
        BrowserCapabilitySimulator.reset();
        vi.clearAllMocks();
      }
    });

    it('should provide appropriate user feedback for browser limitations', async () => {
      BrowserCapabilitySimulator.simulateLegacyBrowser();

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
        expect(screen.getByTestId('browser-compatibility-notice')).toBeInTheDocument();
      });

      // Should show helpful upgrade suggestions
      expect(screen.getByText(/upgrade your browser/i)).toBeInTheDocument();
      expect(screen.getByText(/limited functionality/i)).toBeInTheDocument();
    });
  });

  describe('Performance Across Browsers', () => {
    it('should maintain acceptable performance across different browsers', async () => {
      const browsers = [
        { name: 'Chrome', setup: () => BrowserCapabilitySimulator.simulateChrome() },
        { name: 'Firefox', setup: () => BrowserCapabilitySimulator.simulateFirefox() },
        { name: 'Safari', setup: () => BrowserCapabilitySimulator.simulateSafari() },
        { name: 'Edge', setup: () => BrowserCapabilitySimulator.simulateEdge() }
      ];

      const performanceResults = {};

      for (const browser of browsers) {
        browser.setup();

        const startTime = performance.now();

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
          expect(screen.getByTestId('waveform-canvas')).toBeInTheDocument();
        });

        const initTime = performance.now() - startTime;
        performanceResults[browser.name] = initTime;

        // All browsers should initialize within reasonable time
        expect(initTime).toBeLessThan(5000); // 5 seconds max

        unmount();
        BrowserCapabilitySimulator.reset();
        vi.clearAllMocks();
      }

      console.log('Cross-browser performance results:', performanceResults);

      // No browser should be significantly slower than others
      const times = Object.values(performanceResults);
      const maxTime = Math.max(...times);
      const minTime = Math.min(...times);
      const ratio = maxTime / minTime;

      expect(ratio).toBeLessThan(3); // Max 3x difference between fastest and slowest
    });
  });
});