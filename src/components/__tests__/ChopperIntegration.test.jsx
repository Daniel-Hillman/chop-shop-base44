import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ChopperPage from '../../pages/ChopperPage.jsx';
import { AudioProcessingService } from '../../services/AudioProcessingService.js';
import { SamplePlaybackEngine } from '../../services/SamplePlaybackEngine.js';

// Mock YouTube API
global.YT = {
  Player: vi.fn().mockImplementation(() => ({
    getCurrentTime: vi.fn(() => 0),
    seekTo: vi.fn(),
    getPlayerState: vi.fn(() => 1),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    destroy: vi.fn()
  })),
  PlayerState: {
    PLAYING: 1,
    PAUSED: 2
  }
};

// Mock audio context
const mockAudioContext = {
  createBufferSource: vi.fn(() => ({
    connect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
    buffer: null
  })),
  createGain: vi.fn(() => ({
    connect: vi.fn(),
    gain: { value: 1 }
  })),
  destination: {},
  currentTime: 0,
  state: 'running',
  resume: vi.fn(),
  suspend: vi.fn(),
  close: vi.fn()
};

global.AudioContext = vi.fn(() => mockAudioContext);
global.webkitAudioContext = vi.fn(() => mockAudioContext);

// Mock fetch
global.fetch = vi.fn();

describe('Chopper Page Integration Tests', () => {
  let user;

  beforeEach(() => {
    user = userEvent.setup();
    vi.clearAllMocks();
    
    // Mock successful audio download
    const mockAudioBuffer = new ArrayBuffer(1024);
    fetch.mockResolvedValue({
      ok: true,
      arrayBuffer: () => Promise.resolve(mockAudioBuffer),
      headers: new Map([['content-type', 'audio/mpeg']])
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Complete User Workflow', () => {
    it('should handle complete workflow from URL input to sample playback', async () => {
      render(<ChopperPage />);
      
      // Step 1: Enter YouTube URL
      const urlInput = screen.getByPlaceholderText(/enter youtube url/i);
      await user.type(urlInput, 'https://www.youtube.com/watch?v=dQw4w9WgXcQ');
      
      // Step 2: Load video
      const loadButton = screen.getByText(/load video/i);
      await user.click(loadButton);
      
      // Step 3: Wait for audio processing
      await waitFor(() => {
        expect(screen.getByText(/processing audio/i)).toBeInTheDocument();
      }, { timeout: 1000 });
      
      // Step 4: Wait for ready state
      await waitFor(() => {
        expect(screen.getByText(/ready/i)).toBeInTheDocument();
      }, { timeout: 5000 });
      
      // Step 5: Create sample by pressing pad
      const padButton = screen.getByTestId('pad-1');
      await user.click(padButton);
      
      // Should create sample at current time
      expect(screen.getByText(/sample created/i)).toBeInTheDocument();
      
      // Step 6: Trigger sample playback
      await user.click(padButton);
      
      // Should show playback feedback
      expect(screen.getByText(/playing sample/i)).toBeInTheDocument();
    });

    it('should handle keyboard shortcuts for pad triggers', async () => {
      render(<ChopperPage />);
      
      // Setup audio first
      const urlInput = screen.getByPlaceholderText(/enter youtube url/i);
      await user.type(urlInput, 'https://www.youtube.com/watch?v=dQw4w9WgXcQ');
      
      const loadButton = screen.getByText(/load video/i);
      await user.click(loadButton);
      
      await waitFor(() => {
        expect(screen.getByText(/ready/i)).toBeInTheDocument();
      }, { timeout: 5000 });
      
      // Test keyboard shortcuts
      await user.keyboard('q'); // Should trigger pad 1
      expect(screen.getByTestId('pad-1')).toHaveClass('active');
      
      await user.keyboard('w'); // Should trigger pad 2
      expect(screen.getByTestId('pad-2')).toHaveClass('active');
    });

    it('should display error messages for invalid URLs', async () => {
      render(<ChopperPage />);
      
      const urlInput = screen.getByPlaceholderText(/enter youtube url/i);
      await user.type(urlInput, 'invalid-url');
      
      const loadButton = screen.getByText(/load video/i);
      await user.click(loadButton);
      
      await waitFor(() => {
        expect(screen.getByText(/invalid youtube url/i)).toBeInTheDocument();
      });
    });
  });

  describe('Sample Management', () => {
    beforeEach(async () => {
      render(<ChopperPage />);
      
      // Setup audio
      const urlInput = screen.getByPlaceholderText(/enter youtube url/i);
      await user.type(urlInput, 'https://www.youtube.com/watch?v=dQw4w9WgXcQ');
      
      const loadButton = screen.getByText(/load video/i);
      await user.click(loadButton);
      
      await waitFor(() => {
        expect(screen.getByText(/ready/i)).toBeInTheDocument();
      }, { timeout: 5000 });
    });

    it('should create and manage multiple samples', async () => {
      // Create samples on different pads
      const pad1 = screen.getByTestId('pad-1');
      const pad2 = screen.getByTestId('pad-2');
      
      await user.click(pad1);
      expect(screen.getByText(/sample created at pad 1/i)).toBeInTheDocument();
      
      await user.click(pad2);
      expect(screen.getByText(/sample created at pad 2/i)).toBeInTheDocument();
      
      // Both pads should show as having samples
      expect(pad1).toHaveClass('has-sample');
      expect(pad2).toHaveClass('has-sample');
    });

    it('should allow timestamp editing', async () => {
      // Create a sample
      const pad1 = screen.getByTestId('pad-1');
      await user.click(pad1);
      
      // Open timestamp editor
      const editButton = screen.getByTestId('edit-timestamp-1');
      await user.click(editButton);
      
      // Edit timestamp
      const timestampInput = screen.getByDisplayValue(/0:00/);
      await user.clear(timestampInput);
      await user.type(timestampInput, '1:30');
      
      // Save changes
      const saveButton = screen.getByText(/save/i);
      await user.click(saveButton);
      
      // Should update the display
      expect(screen.getByText(/1:30/)).toBeInTheDocument();
    });

    it('should handle sample deletion', async () => {
      // Create a sample
      const pad1 = screen.getByTestId('pad-1');
      await user.click(pad1);
      
      expect(pad1).toHaveClass('has-sample');
      
      // Delete sample
      const deleteButton = screen.getByTestId('delete-sample-1');
      await user.click(deleteButton);
      
      // Confirm deletion
      const confirmButton = screen.getByText(/confirm/i);
      await user.click(confirmButton);
      
      // Sample should be removed
      expect(pad1).not.toHaveClass('has-sample');
    });
  });

  describe('Waveform Interaction', () => {
    beforeEach(async () => {
      render(<ChopperPage />);
      
      // Setup audio
      const urlInput = screen.getByPlaceholderText(/enter youtube url/i);
      await user.type(urlInput, 'https://www.youtube.com/watch?v=dQw4w9WgXcQ');
      
      const loadButton = screen.getByText(/load video/i);
      await user.click(loadButton);
      
      await waitFor(() => {
        expect(screen.getByText(/ready/i)).toBeInTheDocument();
      }, { timeout: 5000 });
    });

    it('should display waveform after audio loads', async () => {
      const waveform = screen.getByTestId('waveform-display');
      expect(waveform).toBeInTheDocument();
      
      // Should show waveform canvas
      const canvas = screen.getByTestId('waveform-canvas');
      expect(canvas).toBeInTheDocument();
    });

    it('should create samples by clicking on waveform', async () => {
      const waveform = screen.getByTestId('waveform-canvas');
      
      // Click on waveform to create sample
      await user.click(waveform);
      
      // Should show sample creation dialog
      expect(screen.getByText(/create sample/i)).toBeInTheDocument();
      
      // Select pad and confirm
      const pad3 = screen.getByText(/pad 3/i);
      await user.click(pad3);
      
      const createButton = screen.getByText(/create/i);
      await user.click(createButton);
      
      // Sample should be created
      expect(screen.getByTestId('pad-3')).toHaveClass('has-sample');
    });

    it('should show progress indicator during playback', async () => {
      // Start playback
      const playButton = screen.getByTestId('play-button');
      await user.click(playButton);
      
      // Should show progress indicator on waveform
      const progressIndicator = screen.getByTestId('waveform-progress');
      expect(progressIndicator).toBeInTheDocument();
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should display retry option on network failure', async () => {
      // Mock network failure
      fetch.mockRejectedValueOnce(new Error('Network error'));
      
      render(<ChopperPage />);
      
      const urlInput = screen.getByPlaceholderText(/enter youtube url/i);
      await user.type(urlInput, 'https://www.youtube.com/watch?v=dQw4w9WgXcQ');
      
      const loadButton = screen.getByText(/load video/i);
      await user.click(loadButton);
      
      // Should show error and retry option
      await waitFor(() => {
        expect(screen.getByText(/network error/i)).toBeInTheDocument();
        expect(screen.getByText(/retry/i)).toBeInTheDocument();
      });
      
      // Mock successful retry
      fetch.mockResolvedValueOnce({
        ok: true,
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(1024)),
        headers: new Map([['content-type', 'audio/mpeg']])
      });
      
      // Click retry
      const retryButton = screen.getByText(/retry/i);
      await user.click(retryButton);
      
      // Should eventually succeed
      await waitFor(() => {
        expect(screen.getByText(/ready/i)).toBeInTheDocument();
      }, { timeout: 5000 });
    });

    it('should handle audio context suspension gracefully', async () => {
      render(<ChopperPage />);
      
      // Setup audio
      const urlInput = screen.getByPlaceholderText(/enter youtube url/i);
      await user.type(urlInput, 'https://www.youtube.com/watch?v=dQw4w9WgXcQ');
      
      const loadButton = screen.getByText(/load video/i);
      await user.click(loadButton);
      
      await waitFor(() => {
        expect(screen.getByText(/ready/i)).toBeInTheDocument();
      }, { timeout: 5000 });
      
      // Simulate audio context suspension
      mockAudioContext.state = 'suspended';
      
      // Try to play sample
      const pad1 = screen.getByTestId('pad-1');
      await user.click(pad1); // Create sample
      await user.click(pad1); // Play sample
      
      // Should show audio context resume message
      expect(screen.getByText(/resuming audio/i)).toBeInTheDocument();
    });

    it('should provide fallback UI when audio fails completely', async () => {
      // Mock complete audio failure
      fetch.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      });
      
      render(<ChopperPage />);
      
      const urlInput = screen.getByPlaceholderText(/enter youtube url/i);
      await user.type(urlInput, 'https://www.youtube.com/watch?v=dQw4w9WgXcQ');
      
      const loadButton = screen.getByText(/load video/i);
      await user.click(loadButton);
      
      // Should show fallback UI
      await waitFor(() => {
        expect(screen.getByText(/audio unavailable/i)).toBeInTheDocument();
        expect(screen.getByText(/video only mode/i)).toBeInTheDocument();
      });
    });
  });

  describe('Performance and Responsiveness', () => {
    it('should remain responsive during audio processing', async () => {
      render(<ChopperPage />);
      
      const urlInput = screen.getByPlaceholderText(/enter youtube url/i);
      await user.type(urlInput, 'https://www.youtube.com/watch?v=dQw4w9WgXcQ');
      
      const loadButton = screen.getByText(/load video/i);
      await user.click(loadButton);
      
      // UI should remain interactive during processing
      expect(screen.getByText(/processing audio/i)).toBeInTheDocument();
      
      // Should be able to interact with other elements
      const settingsButton = screen.getByTestId('settings-button');
      await user.click(settingsButton);
      
      expect(screen.getByText(/settings/i)).toBeInTheDocument();
    });

    it('should handle rapid pad interactions without lag', async () => {
      render(<ChopperPage />);
      
      // Setup audio
      const urlInput = screen.getByPlaceholderText(/enter youtube url/i);
      await user.type(urlInput, 'https://www.youtube.com/watch?v=dQw4w9WgXcQ');
      
      const loadButton = screen.getByText(/load video/i);
      await user.click(loadButton);
      
      await waitFor(() => {
        expect(screen.getByText(/ready/i)).toBeInTheDocument();
      }, { timeout: 5000 });
      
      // Rapid pad interactions
      const pads = [
        screen.getByTestId('pad-1'),
        screen.getByTestId('pad-2'),
        screen.getByTestId('pad-3'),
        screen.getByTestId('pad-4')
      ];
      
      const startTime = performance.now();
      
      // Create samples rapidly
      for (const pad of pads) {
        await user.click(pad);
      }
      
      // Play samples rapidly
      for (const pad of pads) {
        await user.click(pad);
      }
      
      const endTime = performance.now();
      const totalTime = endTime - startTime;
      
      // Should complete within reasonable time
      expect(totalTime).toBeLessThan(2000); // 2 seconds
    });
  });
});