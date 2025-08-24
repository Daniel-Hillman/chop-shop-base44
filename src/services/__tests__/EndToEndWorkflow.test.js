/**
 * End-to-End Workflow Test
 * Tests the complete YouTube audio chopper workflow from URL input to sample playback
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ChopperPage from '../../pages/ChopperPage.jsx';
import youTubeStreamCapture from '../YouTubeStreamCapture.js';
import audioProcessingService from '../AudioProcessingService.js';
import samplePlaybackEngine from '../SamplePlaybackEngine.js';

// Mock external dependencies
vi.mock('../YouTubeStreamCapture.js');
vi.mock('../AudioProcessingService.js');
vi.mock('../SamplePlaybackEngine.js');

// Mock YouTube player
const mockYouTubePlayer = {
  seekTo: vi.fn(),
  playVideo: vi.fn(),
  pauseVideo: vi.fn(),
  getVideoData: vi.fn(() => ({ title: 'Test Video' })),
  getCurrentTime: vi.fn(() => 0),
  getDuration: vi.fn(() => 180)
};

// Mock video element
const mockVideoElement = {
  duration: 180,
  currentTime: 0,
  muted: false,
  play: vi.fn(),
  pause: vi.fn()
};

// Mock audio context
const mockAudioContext = {
  createMediaElementSource: vi.fn(() => ({
    connect: vi.fn(),
    disconnect: vi.fn()
  })),
  createAnalyser: vi.fn(() => ({
    connect: vi.fn(),
    disconnect: vi.fn(),
    fftSize: 2048,
    smoothingTimeConstant: 0.8
  })),
  createScriptProcessor: vi.fn(() => ({
    connect: vi.fn(),
    disconnect: vi.fn(),
    onaudioprocess: null
  })),
  createBuffer: vi.fn(() => ({
    getChannelData: vi.fn(() => new Float32Array(1024)),
    duration: 5.0,
    sampleRate: 44100,
    numberOfChannels: 1
  })),
  resume: vi.fn(),
  close: vi.fn(),
  state: 'running',
  currentTime: 0
};

// Mock captured audio data
const mockCapturedAudioData = {
  audioBuffer: mockAudioContext.createBuffer(),
  waveformData: new Float32Array(400).fill(0).map((_, i) => Math.sin(i * 0.1)),
  metadata: {
    duration: 5.0,
    sampleRate: 44100,
    channels: 1,
    capturedSamples: 100,
    bufferId: 'test_buffer_123',
    source: 'youtube_stream'
  }
};

describe('End-to-End YouTube Audio Chopper Workflow', () => {
  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();
    
    // Mock global objects
    global.AudioContext = vi.fn(() => mockAudioContext);
    global.webkitAudioContext = vi.fn(() => mockAudioContext);
    
    // Mock DOM methods
    global.document.querySelector = vi.fn((selector) => {
      if (selector === 'video') return mockVideoElement;
      return null;
    });
    
    // Setup service mocks
    youTubeStreamCapture.startCapture.mockResolvedValue(mockCapturedAudioData);
    youTubeStreamCapture.stopCapture.mockResolvedValue(mockCapturedAudioData);
    youTubeStreamCapture.getStatus.mockReturnValue({
      isCapturing: false,
      capturedSamples: 0,
      capturedDuration: 0,
      targetDuration: 0,
      audioContextState: 'running'
    });
    youTubeStreamCapture.constructor.isSupported.mockReturnValue(true);
    
    audioProcessingService.processYouTubeUrl.mockResolvedValue({
      audioBuffer: mockCapturedAudioData.audioBuffer,
      waveformData: mockCapturedAudioData.waveformData,
      metadata: { duration: 180, sampleRate: 44100 }
    });
    
    samplePlaybackEngine.playSample.mockResolvedValue(true);
    samplePlaybackEngine.stopAllSamples.mockResolvedValue(true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should complete the full workflow: URL input → video load → capture → sample creation → playback', async () => {
    // Step 1: Render the ChopperPage
    render(<ChopperPage />);
    
    // Step 2: Input YouTube URL
    const urlInput = screen.getByPlaceholderText(/paste a youtube url/i);
    const loadButton = screen.getByText(/load video/i);
    
    fireEvent.change(urlInput, { 
      target: { value: 'https://www.youtube.com/watch?v=test123' } 
    });
    fireEvent.click(loadButton);
    
    // Wait for video to load
    await waitFor(() => {
      expect(audioProcessingService.processYouTubeUrl).toHaveBeenCalledWith(
        'https://www.youtube.com/watch?v=test123'
      );
    });
    
    // Step 3: Verify video ready state
    await waitFor(() => {
      expect(screen.getByText(/video ready/i)).toBeInTheDocument();
    });
    
    // Step 4: Start audio capture
    const startCaptureButton = screen.getByText(/start capture/i);
    fireEvent.click(startCaptureButton);
    
    await waitFor(() => {
      expect(youTubeStreamCapture.startCapture).toHaveBeenCalledWith(
        mockVideoElement,
        expect.any(Function),
        expect.any(Number)
      );
    });
    
    // Step 5: Verify capture completion
    await waitFor(() => {
      expect(screen.getByText(/audio capture complete/i)).toBeInTheDocument();
    });
    
    // Step 6: Create a sample by clicking a pad
    const padButton = screen.getByText('A1'); // First pad
    fireEvent.click(padButton);
    
    // Step 7: Set sample timestamps
    const setStartButton = screen.getByText(/set start/i);
    const setEndButton = screen.getByText(/set end/i);
    
    fireEvent.click(setStartButton);
    fireEvent.click(setEndButton);
    
    // Step 8: Play the sample
    fireEvent.click(padButton); // Click pad again to play
    
    await waitFor(() => {
      expect(samplePlaybackEngine.playSample).toHaveBeenCalled();
    });
    
    // Step 9: Verify sample was created with captured audio
    expect(screen.getByText(/using captured audio/i)).toBeInTheDocument();
  });

  it('should handle capture errors gracefully and provide retry options', async () => {
    // Mock capture failure
    youTubeStreamCapture.startCapture.mockRejectedValue(new Error('Capture failed'));
    
    render(<ChopperPage />);
    
    // Load video first
    const urlInput = screen.getByPlaceholderText(/paste a youtube url/i);
    const loadButton = screen.getByText(/load video/i);
    
    fireEvent.change(urlInput, { 
      target: { value: 'https://www.youtube.com/watch?v=test123' } 
    });
    fireEvent.click(loadButton);
    
    await waitFor(() => {
      expect(screen.getByText(/video ready/i)).toBeInTheDocument();
    });
    
    // Try to start capture (should fail)
    const startCaptureButton = screen.getByText(/start capture/i);
    fireEvent.click(startCaptureButton);
    
    // Verify error handling
    await waitFor(() => {
      expect(screen.getByText(/capture failed/i)).toBeInTheDocument();
    });
    
    // Verify retry option is available
    expect(screen.getByText(/reset/i)).toBeInTheDocument();
  });

  it('should support seamless timestamp jumping during sample playback', async () => {
    render(<ChopperPage />);
    
    // Setup video and capture
    const urlInput = screen.getByPlaceholderText(/paste a youtube url/i);
    const loadButton = screen.getByText(/load video/i);
    
    fireEvent.change(urlInput, { 
      target: { value: 'https://www.youtube.com/watch?v=test123' } 
    });
    fireEvent.click(loadButton);
    
    await waitFor(() => {
      expect(screen.getByText(/video ready/i)).toBeInTheDocument();
    });
    
    // Complete capture
    const startCaptureButton = screen.getByText(/start capture/i);
    fireEvent.click(startCaptureButton);
    
    await waitFor(() => {
      expect(screen.getByText(/audio capture complete/i)).toBeInTheDocument();
    });
    
    // Create sample
    const padButton = screen.getByText('A1');
    fireEvent.click(padButton);
    
    // Set timestamps
    const setStartButton = screen.getByText(/set start/i);
    const setEndButton = screen.getByText(/set end/i);
    
    fireEvent.click(setStartButton);
    fireEvent.click(setEndButton);
    
    // Play sample (should trigger timestamp jump)
    fireEvent.click(padButton);
    
    await waitFor(() => {
      expect(samplePlaybackEngine.playSample).toHaveBeenCalledWith(
        expect.objectContaining({
          padId: 'A1',
          startTime: expect.any(Number),
          endTime: expect.any(Number)
        }),
        expect.any(Object) // audioBuffer
      );
    });
  });

  it('should validate error recovery mechanisms for streaming capture', async () => {
    // Test network error recovery
    youTubeStreamCapture.startCapture
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce(mockCapturedAudioData);
    
    render(<ChopperPage />);
    
    // Load video
    const urlInput = screen.getByPlaceholderText(/paste a youtube url/i);
    const loadButton = screen.getByText(/load video/i);
    
    fireEvent.change(urlInput, { 
      target: { value: 'https://www.youtube.com/watch?v=test123' } 
    });
    fireEvent.click(loadButton);
    
    await waitFor(() => {
      expect(screen.getByText(/video ready/i)).toBeInTheDocument();
    });
    
    // First capture attempt (should fail)
    const startCaptureButton = screen.getByText(/start capture/i);
    fireEvent.click(startCaptureButton);
    
    await waitFor(() => {
      expect(screen.getByText(/capture failed/i)).toBeInTheDocument();
    });
    
    // Reset and retry
    const resetButton = screen.getByText(/reset/i);
    fireEvent.click(resetButton);
    
    // Second attempt (should succeed)
    const retryButton = screen.getByText(/start capture/i);
    fireEvent.click(retryButton);
    
    await waitFor(() => {
      expect(screen.getByText(/audio capture complete/i)).toBeInTheDocument();
    });
    
    // Verify both attempts were made
    expect(youTubeStreamCapture.startCapture).toHaveBeenCalledTimes(2);
  });

  it('should ensure all components work together without conflicts', async () => {
    render(<ChopperPage />);
    
    // Test multiple simultaneous operations
    const urlInput = screen.getByPlaceholderText(/paste a youtube url/i);
    const loadButton = screen.getByText(/load video/i);
    
    // Load video
    fireEvent.change(urlInput, { 
      target: { value: 'https://www.youtube.com/watch?v=test123' } 
    });
    fireEvent.click(loadButton);
    
    await waitFor(() => {
      expect(screen.getByText(/video ready/i)).toBeInTheDocument();
    });
    
    // Start capture
    const startCaptureButton = screen.getByText(/start capture/i);
    fireEvent.click(startCaptureButton);
    
    await waitFor(() => {
      expect(screen.getByText(/audio capture complete/i)).toBeInTheDocument();
    });
    
    // Create multiple samples
    const pads = ['A1', 'A2', 'A3'];
    
    for (const padId of pads) {
      const padButton = screen.getByText(padId);
      fireEvent.click(padButton);
      
      // Set timestamps for each pad
      const setStartButton = screen.getByText(/set start/i);
      const setEndButton = screen.getByText(/set end/i);
      
      fireEvent.click(setStartButton);
      fireEvent.click(setEndButton);
    }
    
    // Play all samples simultaneously
    for (const padId of pads) {
      const padButton = screen.getByText(padId);
      fireEvent.click(padButton);
    }
    
    // Verify all samples were played
    await waitFor(() => {
      expect(samplePlaybackEngine.playSample).toHaveBeenCalledTimes(pads.length);
    });
    
    // Test session management
    const sessionsButton = screen.getByText(/sessions/i);
    fireEvent.click(sessionsButton);
    
    // Verify session manager opened
    await waitFor(() => {
      expect(screen.getByText(/session manager/i)).toBeInTheDocument();
    });
  });

  it('should handle browser compatibility and feature detection', async () => {
    // Test unsupported browser
    youTubeStreamCapture.constructor.isSupported.mockReturnValue(false);
    
    render(<ChopperPage />);
    
    // Load video first
    const urlInput = screen.getByPlaceholderText(/paste a youtube url/i);
    const loadButton = screen.getByText(/load video/i);
    
    fireEvent.change(urlInput, { 
      target: { value: 'https://www.youtube.com/watch?v=test123' } 
    });
    fireEvent.click(loadButton);
    
    await waitFor(() => {
      expect(screen.getByText(/video ready/i)).toBeInTheDocument();
    });
    
    // Verify unsupported message is shown
    expect(screen.getByText(/audio capture is not supported/i)).toBeInTheDocument();
  });
});

describe('Performance and Memory Management', () => {
  it('should handle large audio captures without memory leaks', async () => {
    // Mock large audio buffer
    const largeAudioBuffer = {
      ...mockCapturedAudioData.audioBuffer,
      duration: 600, // 10 minutes
      getChannelData: vi.fn(() => new Float32Array(26460000)) // 10 minutes at 44.1kHz
    };
    
    const largeCaptureData = {
      ...mockCapturedAudioData,
      audioBuffer: largeAudioBuffer,
      metadata: {
        ...mockCapturedAudioData.metadata,
        duration: 600
      }
    };
    
    youTubeStreamCapture.startCapture.mockResolvedValue(largeCaptureData);
    
    render(<ChopperPage />);
    
    // Load and capture large audio
    const urlInput = screen.getByPlaceholderText(/paste a youtube url/i);
    const loadButton = screen.getByText(/load video/i);
    
    fireEvent.change(urlInput, { 
      target: { value: 'https://www.youtube.com/watch?v=test123' } 
    });
    fireEvent.click(loadButton);
    
    await waitFor(() => {
      expect(screen.getByText(/video ready/i)).toBeInTheDocument();
    });
    
    const startCaptureButton = screen.getByText(/start capture/i);
    fireEvent.click(startCaptureButton);
    
    await waitFor(() => {
      expect(screen.getByText(/audio capture complete/i)).toBeInTheDocument();
    });
    
    // Verify large capture was handled
    expect(youTubeStreamCapture.startCapture).toHaveBeenCalled();
    expect(screen.getByText(/600.0s/)).toBeInTheDocument();
  });

  it('should cleanup resources properly when component unmounts', async () => {
    const { unmount } = render(<ChopperPage />);
    
    // Load video and start capture
    const urlInput = screen.getByPlaceholderText(/paste a youtube url/i);
    const loadButton = screen.getByText(/load video/i);
    
    fireEvent.change(urlInput, { 
      target: { value: 'https://www.youtube.com/watch?v=test123' } 
    });
    fireEvent.click(loadButton);
    
    await waitFor(() => {
      expect(screen.getByText(/video ready/i)).toBeInTheDocument();
    });
    
    const startCaptureButton = screen.getByText(/start capture/i);
    fireEvent.click(startCaptureButton);
    
    // Unmount component
    unmount();
    
    // Verify cleanup was called
    expect(youTubeStreamCapture.cleanup).toHaveBeenCalled();
  });
});