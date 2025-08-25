/**
 * User Acceptance Tests for Interactive Waveform Editing Workflows
 * Tests real-world user scenarios and interaction patterns
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { WaveformVisualization } from '../WaveformVisualization.jsx';

// User scenario simulation utilities
class UserScenarioSimulator {
    constructor(user) {
        this.user = user;
        this.actions = [];
        this.expectations = [];
    }

    async clickWaveform(x, y, description) {
        this.actions.push({ type: 'click', x, y, description });
        const canvas = screen.getByTestId('waveform-canvas');
        await this.user.click(canvas, { clientX: x, clientY: y });
        return this;
    }

    async dragWaveform(startX, startY, endX, endY, description) {
        this.actions.push({ type: 'drag', startX, startY, endX, endY, description });
        const canvas = screen.getByTestId('waveform-canvas');

        await this.user.pointer([
            { keys: '[MouseLeft>]', target: canvas, coords: { clientX: startX, clientY: startY } },
            { coords: { clientX: endX, clientY: endY } },
            { keys: '[/MouseLeft]' }
        ]);
        return this;
    }

    async hoverWaveform(x, y, description) {
        this.actions.push({ type: 'hover', x, y, description });
        const canvas = screen.getByTestId('waveform-canvas');
        await this.user.hover(canvas, { clientX: x, clientY: y });
        return this;
    }

    async zoomIn(description) {
        this.actions.push({ type: 'zoom-in', description });
        const canvas = screen.getByTestId('waveform-canvas');
        await this.user.wheel(canvas, { deltaY: -100 });
        return this;
    }

    async zoomOut(description) {
        this.actions.push({ type: 'zoom-out', description });
        const canvas = screen.getByTestId('waveform-canvas');
        await this.user.wheel(canvas, { deltaY: 100 });
        return this;
    }

    async useKeyboard(key, modifiers = {}, description) {
        this.actions.push({ type: 'keyboard', key, modifiers, description });
        await this.user.keyboard(`${modifiers.ctrl ? '{Control>}' : ''}${key}${modifiers.ctrl ? '{/Control}' : ''}`);
        return this;
    }

    expectChopCreated(description) {
        this.expectations.push({ type: 'chop-created', description });
        return this;
    }

    expectVisualFeedback(description) {
        this.expectations.push({ type: 'visual-feedback', description });
        return this;
    }

    expectTooltip(description) {
        this.expectations.push({ type: 'tooltip', description });
        return this;
    }

    async verify() {
        for (const expectation of this.expectations) {
            switch (expectation.type) {
                case 'chop-created':
                    await waitFor(() => {
                        expect(screen.getByTestId('chop-overlay')).toBeInTheDocument();
                    });
                    break;
                case 'visual-feedback':
                    await waitFor(() => {
                        expect(screen.getByTestId('interaction-feedback')).toBeInTheDocument();
                    });
                    break;
                case 'tooltip':
                    await waitFor(() => {
                        expect(screen.getByTestId('hover-tooltip')).toBeInTheDocument();
                    });
                    break;
            }
        }
    }

    getActionSummary() {
        return this.actions.map(action => action.description).join(' → ');
    }
}

const mockYouTubePlayer = {
    getCurrentTime: vi.fn(() => 0),
    getDuration: vi.fn(() => 240), // 4 minute track
    getPlayerState: vi.fn(() => 1),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    getVideoData: vi.fn(() => ({
        title: 'User Test Track - Hip Hop Beat',
        video_id: 'user123'
    }))
};

describe('User Acceptance Tests - Interactive Waveform Editing', () => {
    let user;
    let mockChops;
    let mockOnChopCreate;
    let mockOnChopUpdate;
    let mockOnTimeSeek;

    beforeEach(() => {
        user = userEvent.setup();
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

        // Mock realistic audio context
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

describe('First-Time User Experience', () => {
    it('should guide new users through basic chop creation workflow', async () => {
        const scenario = new UserScenarioSimulator(user);

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
                    showTutorialHints: true
                }}
            />
        );

        // Wait for waveform to load
        await waitFor(() => {
            expect(screen.getByTestId('waveform-canvas')).toBeInTheDocument();
        });

        // New user should see helpful hints
        expect(screen.getByTestId('tutorial-overlay')).toBeInTheDocument();
        expect(screen.getByText(/click anywhere to create a chop/i)).toBeInTheDocument();

        // User Story: "I want to create my first chop by clicking on an interesting part"
        await scenario
            .clickWaveform(150, 50, 'Click on drum hit at 2.5 seconds')
            .expectChopCreated('First chop should be created')
            .expectVisualFeedback('Should show success feedback');

        await scenario.verify();

        expect(mockOnChopCreate).toHaveBeenCalledWith(
            expect.any(Number),
            expect.any(Number)
        );

        // Tutorial should progress to next step
        expect(screen.getByText(/great! now try dragging to create a longer sample/i)).toBeInTheDocument();
    });

    it('should provide clear visual feedback for all interactions', async () => {
        const scenario = new UserScenarioSimulator(user);

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

        // User Story: "I want to see what will happen before I commit to an action"
        await scenario
            .hoverWaveform(100, 50, 'Hover over potential chop location')
            .expectTooltip('Should show timing information')
            .expectVisualFeedback('Should show preview highlight');

        await scenario.verify();

        // Should show precise timing information
        const tooltip = screen.getByTestId('hover-tooltip');
        expect(within(tooltip).getByText(/1\.67s/)).toBeInTheDocument(); // Approximate time
        expect(within(tooltip).getByText(/click to create chop/i)).toBeInTheDocument();
    });
});

describe('Music Producer Workflow', () => {
    it('should support typical hip-hop producer chop creation workflow', async () => {
        const scenario = new UserScenarioSimulator(user);

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

        // Producer Workflow: Find and chop drum breaks
        await scenario
            .clickWaveform(80, 50, 'Chop kick drum at start of bar')
            .expectChopCreated('Kick drum chop created')
            .dragWaveform(120, 50, 180, 50, 'Drag to select snare hit region')
            .expectChopCreated('Snare chop created')
            .clickWaveform(220, 50, 'Quick chop on hi-hat')
            .expectChopCreated('Hi-hat chop created');

        await scenario.verify();

        expect(mockOnChopCreate).toHaveBeenCalledTimes(3);

        // Should show all chops with distinct colors
        const chopOverlays = screen.getAllByTestId(/chop-overlay/);
        expect(chopOverlays).toHaveLength(3);

        console.log('Producer workflow completed:', scenario.getActionSummary());
    });

    it('should enable precise sample editing with zoom and fine-tuning', async () => {
        const scenario = new UserScenarioSimulator(user);

        // Start with an existing chop
        const existingChop = {
            id: 'chop-1',
            startTime: 2.0,
            endTime: 2.5,
            padId: 'pad-0',
            color: 'hsl(0, 70%, 50%)'
        };

        render(
            <WaveformVisualization
                audioSource={mockYouTubePlayer}
                chops={[existingChop]}
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

        // Producer wants to fine-tune the chop boundaries
        await scenario
            .zoomIn('Zoom in to see more detail')
            .zoomIn('Zoom in further for sample-level precision')
            .hoverWaveform(150, 50, 'Hover over chop boundary')
            .expectTooltip('Should show precise timing');

        await scenario.verify();

        // Should show sample-level detail
        const canvas = screen.getByTestId('waveform-canvas');
        expect(canvas).toHaveAttribute('data-zoom-level', expect.stringMatching(/[2-9]/));

        // Should show zero-crossing markers for clean cuts
        expect(screen.getByTestId('zero-crossing-markers')).toBeInTheDocument();
    });

    it('should support rapid workflow for chopping entire songs', async () => {
        const scenario = new UserScenarioSimulator(user);

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
                    rapidChopMode: true
                }}
            />
        );

        await waitFor(() => {
            expect(screen.getByTestId('waveform-canvas')).toBeInTheDocument();
        });

        // Rapid chopping workflow - create 8 chops quickly
        const chopPositions = [50, 100, 150, 200, 250, 300, 350, 400];

        for (let i = 0; i < chopPositions.length; i++) {
            await scenario.clickWaveform(chopPositions[i], 50, `Quick chop ${i + 1}`);

            // Should provide immediate feedback without blocking
            await waitFor(() => {
                expect(mockOnChopCreate).toHaveBeenCalledTimes(i + 1);
            });
        }

        // All chops should be created and visible
        const chopOverlays = screen.getAllByTestId(/chop-overlay/);
        expect(chopOverlays).toHaveLength(8);

        // Should maintain performance during rapid creation
        const canvas = screen.getByTestId('waveform-canvas');
        expect(canvas).toHaveAttribute('data-performance-mode', 'optimized');

        console.log('Rapid chopping completed:', scenario.getActionSummary());
    });
});

describe('Advanced User Workflows', () => {
    it('should support complex editing with multiple chop adjustments', async () => {
        const scenario = new UserScenarioSimulator(user);

        // Start with multiple existing chops
        const existingChops = [
            { id: 'chop-1', startTime: 1.0, endTime: 1.5, padId: 'pad-0', color: 'hsl(0, 70%, 50%)' },
            { id: 'chop-2', startTime: 2.0, endTime: 2.8, padId: 'pad-1', color: 'hsl(60, 70%, 50%)' },
            { id: 'chop-3', startTime: 3.5, endTime: 4.0, padId: 'pad-2', color: 'hsl(120, 70%, 50%)' }
        ];

        render(
            <WaveformVisualization
                audioSource={mockYouTubePlayer}
                chops={existingChops}
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

        // Advanced user wants to fine-tune multiple chops
        const chopHandle1 = screen.getByTestId('chop-handle-chop-1-end');
        const chopHandle2 = screen.getByTestId('chop-handle-chop-2-start');

        // Adjust first chop end boundary
        await user.pointer([
            { keys: '[MouseLeft>]', target: chopHandle1 },
            { coords: { clientX: 200, clientY: 50 } },
            { keys: '[/MouseLeft]' }
        ]);

        await waitFor(() => {
            expect(mockOnChopUpdate).toHaveBeenCalledWith(
                'chop-1',
                expect.objectContaining({
                    endTime: expect.any(Number)
                })
            );
        });

        // Adjust second chop start boundary
        await user.pointer([
            { keys: '[MouseLeft>]', target: chopHandle2 },
            { coords: { clientX: 180, clientY: 50 } },
            { keys: '[/MouseLeft]' }
        ]);

        await waitFor(() => {
            expect(mockOnChopUpdate).toHaveBeenCalledWith(
                'chop-2',
                expect.objectContaining({
                    startTime: expect.any(Number)
                })
            );
        });

        expect(mockOnChopUpdate).toHaveBeenCalledTimes(2);
    });

    it('should provide keyboard shortcuts for power users', async () => {
        const scenario = new UserScenarioSimulator(user);

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

        // Power user keyboard shortcuts
        await scenario
            .useKeyboard('z', { ctrl: true }, 'Zoom in with Ctrl+Z')
            .useKeyboard('x', { ctrl: true }, 'Zoom out with Ctrl+X')
            .useKeyboard(' ', {}, 'Spacebar to play/pause')
            .useKeyboard('c', {}, 'C to create chop at current position');

        // Should respond to keyboard shortcuts
        const canvas = screen.getByTestId('waveform-canvas');
        expect(canvas).toHaveAttribute('data-keyboard-active', 'true');

        // Should show keyboard shortcut hints
        expect(screen.getByTestId('keyboard-shortcuts-hint')).toBeInTheDocument();
    });
});

describe('Error Recovery and Edge Cases', () => {
    it('should handle user mistakes gracefully', async () => {
        const scenario = new UserScenarioSimulator(user);

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

        // User accidentally clicks in wrong place
        await scenario.clickWaveform(50, 50, 'Accidental click');

        await waitFor(() => {
            expect(mockOnChopCreate).toHaveBeenCalled();
        });

        // Should provide undo functionality
        await scenario.useKeyboard('z', { ctrl: true }, 'Undo last action');

        // Should show undo confirmation
        expect(screen.getByTestId('undo-feedback')).toBeInTheDocument();

        // User tries to create overlapping chops
        await scenario
            .clickWaveform(100, 50, 'Create first chop')
            .clickWaveform(110, 50, 'Try to create overlapping chop');

        // Should handle overlap gracefully
        expect(screen.getByTestId('overlap-warning')).toBeInTheDocument();
        expect(screen.getByText(/chops cannot overlap/i)).toBeInTheDocument();
    });

    it('should provide helpful feedback when user actions fail', async () => {
        // Mock a scenario where chop creation fails
        const failingOnChopCreate = vi.fn(() => {
            throw new Error('Failed to create chop');
        });

        render(
            <WaveformVisualization
                audioSource={mockYouTubePlayer}
                chops={[]}
                currentTime={0}
                isPlaying={false}
                onChopCreate={failingOnChopCreate}
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

        const canvas = screen.getByTestId('waveform-canvas');
        await user.click(canvas, { clientX: 100, clientY: 50 });

        // Should show user-friendly error message
        await waitFor(() => {
            expect(screen.getByTestId('error-message')).toBeInTheDocument();
        });

        expect(screen.getByText(/unable to create chop/i)).toBeInTheDocument();
        expect(screen.getByText(/please try again/i)).toBeInTheDocument();

        // Should provide retry option
        const retryButton = screen.getByText(/try again/i);
        expect(retryButton).toBeInTheDocument();
    });
});

describe('Accessibility and Usability', () => {
    it('should be accessible to users with different abilities', async () => {
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
                    colorScheme: 'high-contrast',
                    showFrequencyData: true,
                    showZeroCrossings: true,
                    accessibilityMode: true
                }}
            />
        );

        await waitFor(() => {
            expect(screen.getByTestId('waveform-canvas')).toBeInTheDocument();
        });

        // Should have proper ARIA labels
        const canvas = screen.getByTestId('waveform-canvas');
        expect(canvas).toHaveAttribute('aria-label', expect.stringContaining('waveform'));
        expect(canvas).toHaveAttribute('role', 'application');

        // Should support keyboard navigation
        canvas.focus();
        await user.keyboard('{ArrowRight}');

        expect(canvas).toHaveAttribute('data-keyboard-position', expect.any(String));

        // Should provide audio descriptions
        expect(screen.getByTestId('audio-description')).toBeInTheDocument();

        // Should work with screen readers
        expect(canvas).toHaveAttribute('aria-describedby', 'waveform-description');
    });

    it('should provide clear visual hierarchy and information', async () => {
        const existingChops = [
            { id: 'chop-1', startTime: 1.0, endTime: 1.5, padId: 'pad-0', color: 'hsl(0, 70%, 50%)' },
            { id: 'chop-2', startTime: 2.0, endTime: 2.8, padId: 'pad-1', color: 'hsl(60, 70%, 50%)' }
        ];

        render(
            <WaveformVisualization
                audioSource={mockYouTubePlayer}
                chops={existingChops}
                currentTime={1.25}
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
            expect(screen.getByTestId('waveform-canvas')).toBeInTheDocument();
        });

        // Should clearly show current playback position
        const playhead = screen.getByTestId('playhead');
        expect(playhead).toBeInTheDocument();
        expect(playhead).toHaveStyle('left: 125px'); // Approximate position

        // Should highlight active chop during playback
        const activeChop = screen.getByTestId('chop-overlay-chop-1');
        expect(activeChop).toHaveClass('active');

        // Should show clear timing information
        const timeDisplay = screen.getByTestId('current-time-display');
        expect(within(timeDisplay).getByText('1:15')).toBeInTheDocument(); // 1.25 seconds formatted
    });
});

describe('Performance Under User Load', () => {
    it('should maintain responsiveness during intensive user interactions', async () => {
        const scenario = new UserScenarioSimulator(user);

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

        const startTime = performance.now();

        // Simulate intensive user session
        for (let i = 0; i < 20; i++) {
            await scenario
                .clickWaveform(50 + (i * 15), 50, `Rapid chop ${i}`)
                .zoomIn('Quick zoom')
                .zoomOut('Quick zoom out');
        }

        const sessionTime = performance.now() - startTime;

        // Should complete intensive session within reasonable time
        expect(sessionTime).toBeLessThan(5000); // 5 seconds for 20 interactions

        // Should maintain visual quality
        const canvas = screen.getByTestId('waveform-canvas');
        expect(canvas).toHaveAttribute('data-render-quality', 'high');

        console.log(`Intensive user session completed in ${sessionTime.toFixed(2)}ms`);
    });
});