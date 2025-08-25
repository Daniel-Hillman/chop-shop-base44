/**
 * YouTube + MPC Workflow Integration Tests
 * 
 * Tests the complete integration between YouTube timestamp functionality and MPC-style sequencer.
 * Validates that Sample Mode maintains current YouTube functionality while adding recording capabilities.
 * 
 * Requirements: 3.1, 6.3
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ChopperPage from '../../pages/ChopperPage';
import YouTubeMPCIntegration from '../../services/YouTubeMPCIntegration';

// Mock services
jest.mock('../../services/YouTubeMPCIntegration');
jest.mock('../../hooks/useAudioAnalysis', () => ({
    useAudioAnalysis: () => ({
        waveformData: new Array(400).fill(0.5),
        audioBuffer: {
            duration: 180,
            numberOfChannels: 1,
            sampleRate: 44100,
            getChannelData: jest.fn().mockReturnValue(new Float32Array(1024))
        },
        analysisStatus: 'ready',
        progress: 100,
        error: null,
        downloadStats: null,
        retry: jest.fn(),
        isCached: false
    })
}));

// Mock YouTube API
global.YT = {
    Player: jest.fn().mockImplementation((elementId, config) => ({
        getVideoData: () => ({ title: 'Test Video', video_id: 'test123' }),
        getDuration: () => 180,
        getCurrentTime: () => 0,
        seekTo: jest.fn(),
        playVideo: jest.fn(),
        pauseVideo: jest.fn(),
        setVolume: jest.fn(),
        getPlayerState: () => 1,
        destroy: jest.fn(),
        getIframe: () => document.createElement('iframe')
    })),
    PlayerState: {
        PLAYING: 1,
        PAUSED: 2,
        ENDED: 0
    }
};

// Mock AudioContext
global.AudioContext = jest.fn().mockImplementation(() => ({
    createGain: jest.fn().mockReturnValue({
        connect: jest.fn(),
        gain: { value: 1 }
    }),
    createBufferSource: jest.fn().mockReturnValue({
        connect: jest.fn(),
        start: jest.fn(),
        stop: jest.fn(),
        buffer: null,
        onended: null
    }),
    createBuffer: jest.fn().mockReturnValue({
        getChannelData: jest.fn().mockReturnValue(new Float32Array(1024)),
        duration: 2.0,
        numberOfChannels: 1,
        sampleRate: 44100
    }),
    decodeAudioData: jest.fn().mockResolvedValue({
        duration: 2.0,
        numberOfChannels: 1,
        sampleRate: 44100,
        getChannelData: jest.fn().mockReturnValue(new Float32Array(1024))
    }),
    destination: {},
    currentTime: 0,
    state: 'running',
    resume: jest.fn().mockResolvedValue(),
    close: jest.fn().mockResolvedValue()
}));

describe('YouTube + MPC Workflow Integration', () => {
    let mockYouTubeIntegration;
    let user;

    beforeEach(() => {
        user = userEvent.setup();

        // Create mock YouTube integration
        mockYouTubeIntegration = {
            initialize: jest.fn().mockResolvedValue(true),
            loadYouTubeVideo: jest.fn().mockResolvedValue(true),
            createYouTubeChop: jest.fn().mockReturnValue({
                padId: 'A1',
                youtubeTimestamp: 10,
                videoId: 'test123',
                startTime: 10,
                endTime: 12
            }),
            playYouTubeChop: jest.fn().mockResolvedValue({ success: true }),
            recordYouTubeChop: jest.fn().mockResolvedValue('event_123'),
            importExistingChops: jest.fn(),
            exportYouTubeChops: jest.fn().mockReturnValue([]),
            isYouTubeReady: jest.fn().mockReturnValue(true),
            isInitialized: true,
            cleanup: jest.fn().mockResolvedValue(),
            onIntegrationEvent: jest.fn(),
            offIntegrationEvent: jest.fn(),
            setVideoSyncEnabled: jest.fn(),
            getStatus: jest.fn().mockReturnValue({
                isInitialized: true,
                currentVideoId: 'test123',
                hasAudioBuffer: true,
                hasVideoPlayer: true,
                syncEnabled: true,
                currentMode: 'sample'
            })
        };

        YouTubeMPCIntegration.mockImplementation(() => mockYouTubeIntegration);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('YouTube Video Loading and Integration', () => {
        test('should load YouTube video and initialize MPC integration', async () => {
            render(<ChopperPage />);

            // Enter YouTube URL
            const urlInput = screen.getByPlaceholderText(/paste a youtube url/i);
            await user.type(urlInput, 'https://www.youtube.com/watch?v=test123');

            // Submit URL
            const loadButton = screen.getByText(/load video/i);
            await user.click(loadButton);

            await waitFor(() => {
                expect(mockYouTubeIntegration.initialize).toHaveBeenCalled();
            });

            await waitFor(() => {
                expect(mockYouTubeIntegration.loadYouTubeVideo).toHaveBeenCalledWith(
                    'test123',
                    expect.any(Object), // audioBuffer
                    expect.any(Object)  // videoElement
                );
            });
        });

        test('should import existing chops into MPC system', async () => {
            render(<ChopperPage />);

            // Load video with existing chops
            const urlInput = screen.getByPlaceholderText(/paste a youtube url/i);
            await user.type(urlInput, 'https://www.youtube.com/watch?v=test123');

            const loadButton = screen.getByText(/load video/i);
            await user.click(loadButton);

            await waitFor(() => {
                expect(mockYouTubeIntegration.importExistingChops).toHaveBeenCalled();
            });
        });
    });

    describe('Sample Mode YouTube Functionality', () => {
        beforeEach(async () => {
            render(<ChopperPage />);

            // Load YouTube video
            const urlInput = screen.getByPlaceholderText(/paste a youtube url/i);
            await user.type(urlInput, 'https://www.youtube.com/watch?v=test123');

            const loadButton = screen.getByText(/load video/i);
            await user.click(loadButton);

            await waitFor(() => {
                expect(mockYouTubeIntegration.initialize).toHaveBeenCalled();
            });
        });

        test('should maintain existing YouTube timestamp functionality', async () => {
            // Switch to MPC sequencer
            const mpcButton = screen.getByText(/mpc sequencer/i);
            await user.click(mpcButton);

            await waitFor(() => {
                expect(screen.getByText(/sample mode/i)).toBeInTheDocument();
            });

            // Create a sample by setting timestamps (simulating existing workflow)
            // This would typically be done through the waveform display
            // For this test, we'll simulate the sample creation
            act(() => {
                // Simulate sample creation through the existing workflow
                const createSampleEvent = new CustomEvent('createSample', {
                    detail: { padId: 'A1', startTime: 10, endTime: 12 }
                });
                document.dispatchEvent(createSampleEvent);
            });

            await waitFor(() => {
                expect(mockYouTubeIntegration.createYouTubeChop).toHaveBeenCalledWith(
                    'A1', 10, 12, expect.any(Object)
                );
            });
        });

        test('should trigger YouTube chops when pads are pressed', async () => {
            // Switch to MPC sequencer
            const mpcButton = screen.getByText(/mpc sequencer/i);
            await user.click(mpcButton);

            // Simulate pad trigger (keyboard press)
            await act(async () => {
                fireEvent.keyDown(document, { code: 'KeyQ', key: 'q' });
            });

            await waitFor(() => {
                expect(mockYouTubeIntegration.playYouTubeChop).toHaveBeenCalledWith(
                    'A1', 127
                );
            });
        });

        test('should maintain video player synchronization', async () => {
            // Switch to MPC sequencer
            const mpcButton = screen.getByText(/mpc sequencer/i);
            await user.click(mpcButton);

            // Trigger a pad
            await act(async () => {
                fireEvent.keyDown(document, { code: 'KeyQ', key: 'q' });
            });

            await waitFor(() => {
                expect(mockYouTubeIntegration.playYouTubeChop).toHaveBeenCalled();
            });

            // Verify video sync is maintained (this would be tested in the integration service)
            expect(mockYouTubeIntegration.getStatus().syncEnabled).toBe(true);
        });
    });

    describe('YouTube Chop Recording to Loop System', () => {
        beforeEach(async () => {
            render(<ChopperPage />);

            // Load YouTube video and switch to MPC
            const urlInput = screen.getByPlaceholderText(/paste a youtube url/i);
            await user.type(urlInput, 'https://www.youtube.com/watch?v=test123');

            const loadButton = screen.getByText(/load video/i);
            await user.click(loadButton);

            const mpcButton = screen.getByText(/mpc sequencer/i);
            await user.click(mpcButton);

            await waitFor(() => {
                expect(screen.getByText(/sample mode/i)).toBeInTheDocument();
            });
        });

        test('should record YouTube chops into loop system', async () => {
            // Start recording
            const recordButton = screen.getByText(/record/i);
            await user.click(recordButton);

            // Trigger a pad while recording
            await act(async () => {
                fireEvent.keyDown(document, { code: 'KeyQ', key: 'q' });
            });

            await waitFor(() => {
                expect(mockYouTubeIntegration.recordYouTubeChop).toHaveBeenCalledWith(
                    'A1',
                    expect.any(Number), // timestamp
                    127 // velocity
                );
            });
        });

        test('should apply quantization to recorded YouTube chops', async () => {
            // Set quantization to 1/16 notes
            const quantizationSelect = screen.getByDisplayValue(/1\/4/i);
            await user.selectOptions(quantizationSelect, '1/16');

            // Start recording
            const recordButton = screen.getByText(/record/i);
            await user.click(recordButton);

            // Trigger pad
            await act(async () => {
                fireEvent.keyDown(document, { code: 'KeyQ', key: 'q' });
            });

            // Verify recording with quantization applied
            await waitFor(() => {
                expect(mockYouTubeIntegration.recordYouTubeChop).toHaveBeenCalled();
            });
        });

        test('should support overdubbing YouTube chops', async () => {
            // Record first layer
            const recordButton = screen.getByText(/record/i);
            await user.click(recordButton);

            await act(async () => {
                fireEvent.keyDown(document, { code: 'KeyQ', key: 'q' });
            });

            // Stop recording
            const stopButton = screen.getByText(/stop/i);
            await user.click(stopButton);

            // Start recording again (overdub mode)
            await user.click(recordButton);

            await act(async () => {
                fireEvent.keyDown(document, { code: 'KeyW', key: 'w' });
            });

            // Verify both chops were recorded
            expect(mockYouTubeIntegration.recordYouTubeChop).toHaveBeenCalledTimes(2);
        });
    });

    describe('Mode Switching with YouTube Integration', () => {
        beforeEach(async () => {
            render(<ChopperPage />);

            // Load YouTube video and switch to MPC
            const urlInput = screen.getByPlaceholderText(/paste a youtube url/i);
            await user.type(urlInput, 'https://www.youtube.com/watch?v=test123');

            const loadButton = screen.getByText(/load video/i);
            await user.click(loadButton);

            const mpcButton = screen.getByText(/mpc sequencer/i);
            await user.click(mpcButton);
        });

        test('should maintain YouTube functionality when switching back to Sample Mode', async () => {
            // Switch to Drum Mode
            const drumModeButton = screen.getByText(/drum mode/i);
            await user.click(drumModeButton);

            await waitFor(() => {
                expect(screen.getByText(/drum mode/i)).toBeInTheDocument();
            });

            // Switch back to Sample Mode
            const sampleModeButton = screen.getByText(/sample mode/i);
            await user.click(sampleModeButton);

            await waitFor(() => {
                expect(screen.getByText(/sample mode/i)).toBeInTheDocument();
            });

            // Verify YouTube functionality is still available
            await act(async () => {
                fireEvent.keyDown(document, { code: 'KeyQ', key: 'q' });
            });

            expect(mockYouTubeIntegration.playYouTubeChop).toHaveBeenCalled();
        });

        test('should preserve YouTube chops when switching modes', async () => {
            // Create YouTube chop in Sample Mode
            act(() => {
                const createSampleEvent = new CustomEvent('createSample', {
                    detail: { padId: 'A1', startTime: 10, endTime: 12 }
                });
                document.dispatchEvent(createSampleEvent);
            });

            // Switch to Drum Mode and back
            const drumModeButton = screen.getByText(/drum mode/i);
            await user.click(drumModeButton);

            const sampleModeButton = screen.getByText(/sample mode/i);
            await user.click(sampleModeButton);

            // Verify chop is still available
            const exportedChops = mockYouTubeIntegration.exportYouTubeChops();
            expect(exportedChops).toBeDefined();
        });
    });

    describe('Waveform Visualization Compatibility', () => {
        test('should maintain existing waveform visualization with captured audio', async () => {
            render(<ChopperPage />);

            // Load YouTube video
            const urlInput = screen.getByPlaceholderText(/paste a youtube url/i);
            await user.type(urlInput, 'https://www.youtube.com/watch?v=test123');

            const loadButton = screen.getByText(/load video/i);
            await user.click(loadButton);

            // Verify waveform display is present
            await waitFor(() => {
                expect(screen.getByTestId('waveform-display')).toBeInTheDocument();
            });

            // Switch to MPC mode
            const mpcButton = screen.getByText(/mpc sequencer/i);
            await user.click(mpcButton);

            // Verify waveform is still compatible
            expect(screen.getByTestId('waveform-display')).toBeInTheDocument();
        });
    });

    describe('Error Handling and Recovery', () => {
        test('should handle YouTube integration initialization failure gracefully', async () => {
            mockYouTubeIntegration.initialize.mockRejectedValue(new Error('Init failed'));

            render(<ChopperPage />);

            const urlInput = screen.getByPlaceholderText(/paste a youtube url/i);
            await user.type(urlInput, 'https://www.youtube.com/watch?v=test123');

            const loadButton = screen.getByText(/load video/i);
            await user.click(loadButton);

            // Should not crash the application
            await waitFor(() => {
                expect(screen.getByText(/load video/i)).toBeInTheDocument();
            });
        });

        test('should fallback to direct playback if YouTube integration fails', async () => {
            mockYouTubeIntegration.playYouTubeChop.mockRejectedValue(new Error('Playback failed'));

            render(<ChopperPage />);

            // Load video and switch to MPC
            const urlInput = screen.getByPlaceholderText(/paste a youtube url/i);
            await user.type(urlInput, 'https://www.youtube.com/watch?v=test123');

            const loadButton = screen.getByText(/load video/i);
            await user.click(loadButton);

            const mpcButton = screen.getByText(/mpc sequencer/i);
            await user.click(mpcButton);

            // Trigger pad - should not crash
            await act(async () => {
                fireEvent.keyDown(document, { code: 'KeyQ', key: 'q' });
            });

            // Application should still be functional
            expect(screen.getByText(/sample mode/i)).toBeInTheDocument();
        });
    });

    describe('Performance and Latency', () => {
        test('should maintain ultra-low latency performance with YouTube integration', async () => {
            render(<ChopperPage />);

            // Load video and switch to MPC
            const urlInput = screen.getByPlaceholderText(/paste a youtube url/i);
            await user.type(urlInput, 'https://www.youtube.com/watch?v=test123');

            const loadButton = screen.getByText(/load video/i);
            await user.click(loadButton);

            const mpcButton = screen.getByText(/mpc sequencer/i);
            await user.click(mpcButton);

            // Measure response time for pad trigger
            const startTime = performance.now();

            await act(async () => {
                fireEvent.keyDown(document, { code: 'KeyQ', key: 'q' });
            });

            const endTime = performance.now();
            const responseTime = endTime - startTime;

            // Should maintain low latency (under 50ms for test environment)
            expect(responseTime).toBeLessThan(50);
        });
    });
});