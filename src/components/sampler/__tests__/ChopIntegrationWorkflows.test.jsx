/**
 * Comprehensive Chop Integration Workflow Tests
 * 
 * Tests the complete workflows for integrating chops with the sampler sequencer,
 * covering all aspects of chop creation, assignment, modification, and deletion.
 * 
 * Requirements Coverage:
 * - Requirement 7.1: Automatic chop assignment to tracks
 * - Requirement 7.2: Chop deletion handling
 * - Requirement 7.3: Chop timestamp modification handling
 * - Requirement 7.4: YouTube player integration
 * - Requirement 7.5: Real-time chop updates
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Import components
import SamplerDrumSequencer from '../SamplerDrumSequencer';
import SamplerSequencerGrid from '../SamplerSequencerGrid';

// Import services
import SamplerChopIntegration from '../../../services/sequencer/SamplerChopIntegration';
import SamplerSequencerService from '../../../services/sequencer/SamplerSequencerService';

// Mock chopper context
const mockChopperContext = {
    chops: [],
    activeBank: 'A',
    addChop: vi.fn(),
    updateChop: vi.fn(),
    deleteChop: vi.fn(),
    setActiveBank: vi.fn(),
};

describe('Chop Integration Workflows - Comprehensive Tests', () => {
    let user;
    let mockYouTubePlayer;
    let chopIntegration;
    let sequencerService;

    beforeEach(() => {
        user = userEvent.setup();

        mockYouTubePlayer = {
            seekTo: vi.fn(),
            getCurrentTime: vi.fn(() => 0),
            getPlayerState: vi.fn(() => 1),
            playVideo: vi.fn(),
            pauseVideo: vi.fn(),
        };

        chopIntegration = new SamplerChopIntegration();
        sequencerService = new SamplerSequencerService();
        sequencerService.setYouTubePlayer(mockYouTubePlayer);

        // Reset mocks
        vi.clearAllMocks();
        mockChopperContext.chops = [];
        mockChopperContext.addChop.mockClear();
        mockChopperContext.updateChop.mockClear();
        mockChopperContext.deleteChop.mockClear();
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    describe('Requirement 7.1: Automatic Chop Assignment to Tracks', () => {
        it('should automatically assign new chop to next available track', async () => {
            const existingChops = [
                { padId: 'A0', startTime: 10.0, endTime: 12.0, color: '#06b6d4' },
                { padId: 'A1', startTime: 15.0, endTime: 17.0, color: '#8b5cf6' }
            ];

            const { rerender } = render(
                <SamplerDrumSequencer
                    chops={existingChops}
                    activeBank="A"
                    youtubePlayer={mockYouTubePlayer}
                />
            );

            // Add new chop
            const newChop = { padId: 'A2', startTime: 20.0, endTime: 22.0, color: '#f59e0b' };
            const updatedChops = [...existingChops, newChop];

            rerender(
                <SamplerDrumSequencer
                    chops={updatedChops}
                    activeBank="A"
                    youtubePlayer={mockYouTubePlayer}
                />
            );

            // Verify new chop is assigned to track 2
            const track2 = screen.getByTestId('track-2');
            expect(track2).toHaveStyle({ borderColor: '#f59e0b' });
        });

        it('should assign chops to tracks in order of creation', async () => {
            const chops = [
                { padId: 'A5', startTime: 50.0, endTime: 52.0, color: '#ef4444' }, // Created 5th
                { padId: 'A1', startTime: 10.0, endTime: 12.0, color: '#06b6d4' }, // Created 1st
                { padId: 'A3', startTime: 30.0, endTime: 32.0, color: '#8b5cf6' }, // Created 3rd
            ];

            render(
                <SamplerDrumSequencer
                    chops={chops}
                    activeBank="A"
                    youtubePlayer={mockYouTubePlayer}
                />
            );

            // Verify chops are assigned based on padId order (A1, A3, A5)
            expect(screen.getByTestId('track-1')).toHaveStyle({ borderColor: '#06b6d4' });
            expect(screen.getByTestId('track-3')).toHaveStyle({ borderColor: '#8b5cf6' });
            expect(screen.getByTestId('track-5')).toHaveStyle({ borderColor: '#ef4444' });
        });

        it('should handle bank-specific chop assignment', async () => {
            const chops = [
                { padId: 'A0', startTime: 10.0, endTime: 12.0, color: '#06b6d4' },
                { padId: 'A1', startTime: 15.0, endTime: 17.0, color: '#8b5cf6' },
                { padId: 'B0', startTime: 20.0, endTime: 22.0, color: '#f59e0b' },
                { padId: 'B1', startTime: 25.0, endTime: 27.0, color: '#ef4444' },
            ];

            // Test Bank A
            const { rerender } = render(
                <SamplerDrumSequencer
                    chops={chops}
                    activeBank="A"
                    youtubePlayer={mockYouTubePlayer}
                />
            );

            expect(screen.getByTestId('track-0')).toHaveStyle({ borderColor: '#06b6d4' });
            expect(screen.getByTestId('track-1')).toHaveStyle({ borderColor: '#8b5cf6' });

            // Switch to Bank B
            rerender(
                <SamplerDrumSequencer
                    chops={chops}
                    activeBank="B"
                    youtubePlayer={mockYouTubePlayer}
                />
            );

            expect(screen.getByTestId('track-0')).toHaveStyle({ borderColor: '#f59e0b' });
            expect(screen.getByTestId('track-1')).toHaveStyle({ borderColor: '#ef4444' });
        });

        it('should handle maximum track assignment gracefully', async () => {
            // Create 20 chops (more than 16 tracks)
            const chops = Array(20).fill().map((_, i) => ({
                padId: `A${i}`,
                startTime: i * 2,
                endTime: i * 2 + 1.5,
                color: `hsl(${i * 18}, 70%, 50%)`
            }));

            render(
                <SamplerDrumSequencer
                    chops={chops}
                    activeBank="A"
                    youtubePlayer={mockYouTubePlayer}
                />
            );

            // Only first 16 chops should be assigned to tracks
            for (let i = 0; i < 16; i++) {
                const track = screen.getByTestId(`track-${i}`);
                expect(track).toHaveStyle({ borderColor: `hsl(${i * 18}, 70%, 50%)` });
            }

            // Remaining chops should not be assigned (no track-16, track-17, etc.)
            expect(screen.queryByTestId('track-16')).not.toBeInTheDocument();
        });

        it('should reassign tracks when chops are reordered', async () => {
            const initialChops = [
                { padId: 'A0', startTime: 10.0, endTime: 12.0, color: '#06b6d4' },
                { padId: 'A1', startTime: 15.0, endTime: 17.0, color: '#8b5cf6' },
                { padId: 'A2', startTime: 20.0, endTime: 22.0, color: '#f59e0b' }
            ];

            const { rerender } = render(
                <SamplerDrumSequencer
                    chops={initialChops}
                    activeBank="A"
                    youtubePlayer={mockYouTubePlayer}
                />
            );

            // Verify initial assignment
            expect(screen.getByTestId('track-0')).toHaveStyle({ borderColor: '#06b6d4' });
            expect(screen.getByTestId('track-1')).toHaveStyle({ borderColor: '#8b5cf6' });
            expect(screen.getByTestId('track-2')).toHaveStyle({ borderColor: '#f59e0b' });

            // Reorder chops (reverse order)
            const reorderedChops = [...initialChops].reverse();

            rerender(
                <SamplerDrumSequencer
                    chops={reorderedChops}
                    activeBank="A"
                    youtubePlayer={mockYouTubePlayer}
                />
            );

            // Tracks should maintain their chop assignments based on padId
            expect(screen.getByTestId('track-0')).toHaveStyle({ borderColor: '#06b6d4' });
            expect(screen.getByTestId('track-1')).toHaveStyle({ borderColor: '#8b5cf6' });
            expect(screen.getByTestId('track-2')).toHaveStyle({ borderColor: '#f59e0b' });
        });
    });

    describe('Requirement 7.2: Chop Deletion Handling', () => {
        it('should remove chop assignment when chop is deleted', async () => {
            const initialChops = [
                { padId: 'A0', startTime: 10.0, endTime: 12.0, color: '#06b6d4' },
                { padId: 'A1', startTime: 15.0, endTime: 17.0, color: '#8b5cf6' },
                { padId: 'A2', startTime: 20.0, endTime: 22.0, color: '#f59e0b' }
            ];

            const { rerender } = render(
                <SamplerDrumSequencer
                    chops={initialChops}
                    activeBank="A"
                    youtubePlayer={mockYouTubePlayer}
                />
            );

            // Verify initial state
            expect(screen.getByTestId('track-1')).toHaveStyle({ borderColor: '#8b5cf6' });

            // Delete middle chop (A1)
            const chopsAfterDeletion = initialChops.filter(chop => chop.padId !== 'A1');

            rerender(
                <SamplerDrumSequencer
                    chops={chopsAfterDeletion}
                    activeBank="A"
                    youtubePlayer={mockYouTubePlayer}
                />
            );

            // Track 1 should now be empty
            expect(screen.getByTestId('track-1')).toHaveClass('empty-track');
        });

        it('should preserve pattern data for remaining chops after deletion', async () => {
            const initialChops = [
                { padId: 'A0', startTime: 10.0, endTime: 12.0, color: '#06b6d4' },
                { padId: 'A1', startTime: 15.0, endTime: 17.0, color: '#8b5cf6' },
                { padId: 'A2', startTime: 20.0, endTime: 22.0, color: '#f59e0b' }
            ];

            const onPatternChange = vi.fn();

            const { rerender } = render(
                <SamplerDrumSequencer
                    chops={initialChops}
                    activeBank="A"
                    youtubePlayer={mockYouTubePlayer}
                    onPatternChange={onPatternChange}
                />
            );

            // Create pattern with triggers on all tracks
            await user.click(screen.getByTestId('step-0-0')); // A0
            await user.click(screen.getByTestId('step-1-0')); // A1
            await user.click(screen.getByTestId('step-2-0')); // A2

            // Delete A1
            const chopsAfterDeletion = initialChops.filter(chop => chop.padId !== 'A1');

            rerender(
                <SamplerDrumSequencer
                    chops={chopsAfterDeletion}
                    activeBank="A"
                    youtubePlayer={mockYouTubePlayer}
                    onPatternChange={onPatternChange}
                />
            );

            // Pattern should preserve triggers for A0 and A2, but A1 track should be empty
            const lastPatternCall = onPatternChange.mock.calls[onPatternChange.mock.calls.length - 1];
            const pattern = lastPatternCall[0];

            expect(pattern.tracks[0].steps[0]).toBe(true); // A0 trigger preserved
            expect(pattern.tracks[1].chopId).toBeNull(); // A1 track now empty
            expect(pattern.tracks[2].steps[0]).toBe(true); // A2 trigger preserved
        });

        it('should handle deletion of chop with active triggers during playback', async () => {
            const initialChops = [
                { padId: 'A0', startTime: 10.0, endTime: 12.0, color: '#06b6d4' },
                { padId: 'A1', startTime: 15.0, endTime: 17.0, color: '#8b5cf6' }
            ];

            sequencerService.setChops(initialChops);

            // Create pattern with trigger on A1
            const pattern = {
                tracks: [
                    { trackIndex: 0, chopId: 'A0', steps: [false, false, false, false] },
                    { trackIndex: 1, chopId: 'A1', steps: [true, false, false, false] }
                ]
            };

            sequencerService.setPattern(pattern);
            sequencerService.start();

            // Delete A1 while playing
            const chopsAfterDeletion = initialChops.filter(chop => chop.padId !== 'A1');
            sequencerService.setChops(chopsAfterDeletion);

            // Wait for step processing
            await new Promise(resolve => setTimeout(resolve, 200));

            // Should not crash and should not try to seek to deleted chop
            expect(mockYouTubePlayer.seekTo).not.toHaveBeenCalledWith(15.0, true);

            sequencerService.stop();
        });

        it('should update track assignments when multiple chops are deleted', async () => {
            const initialChops = [
                { padId: 'A0', startTime: 10.0, endTime: 12.0, color: '#06b6d4' },
                { padId: 'A1', startTime: 15.0, endTime: 17.0, color: '#8b5cf6' },
                { padId: 'A2', startTime: 20.0, endTime: 22.0, color: '#f59e0b' },
                { padId: 'A3', startTime: 25.0, endTime: 27.0, color: '#ef4444' },
                { padId: 'A4', startTime: 30.0, endTime: 32.0, color: '#10b981' }
            ];

            const { rerender } = render(
                <SamplerDrumSequencer
                    chops={initialChops}
                    activeBank="A"
                    youtubePlayer={mockYouTubePlayer}
                />
            );

            // Delete A1 and A3 (non-consecutive)
            const chopsAfterDeletion = initialChops.filter(chop =>
                chop.padId !== 'A1' && chop.padId !== 'A3'
            );

            rerender(
                <SamplerDrumSequencer
                    chops={chopsAfterDeletion}
                    activeBank="A"
                    youtubePlayer={mockYouTubePlayer}
                />
            );

            // Remaining chops should maintain their track assignments
            expect(screen.getByTestId('track-0')).toHaveStyle({ borderColor: '#06b6d4' }); // A0
            expect(screen.getByTestId('track-1')).toHaveClass('empty-track'); // A1 deleted
            expect(screen.getByTestId('track-2')).toHaveStyle({ borderColor: '#f59e0b' }); // A2
            expect(screen.getByTestId('track-3')).toHaveClass('empty-track'); // A3 deleted
            expect(screen.getByTestId('track-4')).toHaveStyle({ borderColor: '#10b981' }); // A4
        });
    });

    describe('Requirement 7.3: Chop Timestamp Modification Handling', () => {
        it('should continue triggering updated timestamps after chop modification', async () => {
            const initialChops = [
                { padId: 'A0', startTime: 10.0, endTime: 12.0, color: '#06b6d4' }
            ];

            sequencerService.setChops(initialChops);

            const pattern = {
                tracks: [
                    { trackIndex: 0, chopId: 'A0', steps: [true, false, false, false] }
                ]
            };

            sequencerService.setPattern(pattern);
            sequencerService.start();

            // Wait for initial trigger
            await new Promise(resolve => setTimeout(resolve, 100));
            expect(mockYouTubePlayer.seekTo).toHaveBeenCalledWith(10.0, true);

            // Modify chop timestamp
            const modifiedChops = [
                { padId: 'A0', startTime: 25.5, endTime: 27.5, color: '#06b6d4' }
            ];

            sequencerService.setChops(modifiedChops);

            // Reset mock and wait for next trigger
            mockYouTubePlayer.seekTo.mockClear();
            await new Promise(resolve => setTimeout(resolve, 600)); // Wait for next step

            // Should trigger with new timestamp
            expect(mockYouTubePlayer.seekTo).toHaveBeenCalledWith(25.5, true);

            sequencerService.stop();
        });

        it('should handle real-time timestamp updates during playback', async () => {
            const { rerender } = render(
                <SamplerDrumSequencer
                    chops={[{ padId: 'A0', startTime: 10.0, endTime: 12.0, color: '#06b6d4' }]}
                    activeBank="A"
                    youtubePlayer={mockYouTubePlayer}
                />
            );

            // Start playback
            await user.click(screen.getByTestId('play-button'));

            // Modify timestamp while playing
            rerender(
                <SamplerDrumSequencer
                    chops={[{ padId: 'A0', startTime: 35.7, endTime: 37.7, color: '#06b6d4' }]}
                    activeBank="A"
                    youtubePlayer={mockYouTubePlayer}
                />
            );

            // Should handle the update without crashing
            expect(screen.getByTestId('sampler-drum-sequencer')).toBeInTheDocument();
        });

        it('should preserve pattern data when chop timestamps are modified', async () => {
            const onPatternChange = vi.fn();

            const { rerender } = render(
                <SamplerDrumSequencer
                    chops={[{ padId: 'A0', startTime: 10.0, endTime: 12.0, color: '#06b6d4' }]}
                    activeBank="A"
                    youtubePlayer={mockYouTubePlayer}
                    onPatternChange={onPatternChange}
                />
            );

            // Create pattern
            await user.click(screen.getByTestId('step-0-0'));
            await user.click(screen.getByTestId('step-0-4'));

            // Modify chop timestamp
            rerender(
                <SamplerDrumSequencer
                    chops={[{ padId: 'A0', startTime: 45.0, endTime: 47.0, color: '#06b6d4' }]}
                    activeBank="A"
                    youtubePlayer={mockYouTubePlayer}
                    onPatternChange={onPatternChange}
                />
            );

            // Pattern should be preserved
            const lastPattern = onPatternChange.mock.calls[onPatternChange.mock.calls.length - 1][0];
            expect(lastPattern.tracks[0].steps[0]).toBe(true);
            expect(lastPattern.tracks[0].steps[4]).toBe(true);
        });

        it('should handle batch timestamp updates efficiently', async () => {
            const initialChops = Array(8).fill().map((_, i) => ({
                padId: `A${i}`,
                startTime: i * 5,
                endTime: i * 5 + 2,
                color: `hsl(${i * 45}, 70%, 50%)`
            }));

            const { rerender } = render(
                <SamplerDrumSequencer
                    chops={initialChops}
                    activeBank="A"
                    youtubePlayer={mockYouTubePlayer}
                />
            );

            // Update all timestamps at once
            const updatedChops = initialChops.map(chop => ({
                ...chop,
                startTime: chop.startTime + 100,
                endTime: chop.endTime + 100
            }));

            const startTime = performance.now();

            rerender(
                <SamplerDrumSequencer
                    chops={updatedChops}
                    activeBank="A"
                    youtubePlayer={mockYouTubePlayer}
                />
            );

            const endTime = performance.now();
            const updateDuration = endTime - startTime;

            // Batch update should be efficient
            expect(updateDuration).toBeLessThan(50);
        });
    });

    describe('Requirement 7.4: YouTube Player Integration', () => {
        it('should use existing YouTube player integration for chop playback', async () => {
            const chops = [
                { padId: 'A0', startTime: 10.5, endTime: 12.3, color: '#06b6d4' },
                { padId: 'A1', startTime: 25.7, endTime: 27.9, color: '#8b5cf6' }
            ];

            sequencerService.setChops(chops);

            const pattern = {
                tracks: [
                    { trackIndex: 0, chopId: 'A0', steps: [true, false, false, false] },
                    { trackIndex: 1, chopId: 'A1', steps: [false, true, false, false] }
                ]
            };

            sequencerService.setPattern(pattern);
            sequencerService.setBPM(120);
            sequencerService.start();

            // Wait for first step (A0)
            await new Promise(resolve => setTimeout(resolve, 100));
            expect(mockYouTubePlayer.seekTo).toHaveBeenCalledWith(10.5, true);

            // Wait for second step (A1)
            await new Promise(resolve => setTimeout(resolve, 500));
            expect(mockYouTubePlayer.seekTo).toHaveBeenCalledWith(25.7, true);

            sequencerService.stop();
        });

        it('should handle YouTube player state changes gracefully', async () => {
            const chops = [{ padId: 'A0', startTime: 10.0, endTime: 12.0, color: '#06b6d4' }];

            sequencerService.setChops(chops);

            const pattern = {
                tracks: [{ trackIndex: 0, chopId: 'A0', steps: [true, false, false, false] }]
            };

            sequencerService.setPattern(pattern);
            sequencerService.start();

            // Simulate YouTube player becoming unavailable
            mockYouTubePlayer.seekTo.mockImplementation(() => {
                throw new Error('Player not available');
            });

            // Should continue running without crashing
            await new Promise(resolve => setTimeout(resolve, 200));
            expect(sequencerService.isPlaying()).toBe(true);

            sequencerService.stop();
        });

        it('should coordinate with existing chopper YouTube player instance', async () => {
            const mockChopperPlayer = {
                ...mockYouTubePlayer,
                getVideoUrl: vi.fn(() => 'https://youtube.com/watch?v=test123'),
                getCurrentTime: vi.fn(() => 45.5)
            };

            render(
                <SamplerDrumSequencer
                    chops={[{ padId: 'A0', startTime: 10.0, endTime: 12.0, color: '#06b6d4' }]}
                    activeBank="A"
                    youtubePlayer={mockChopperPlayer}
                />
            );

            // Should use the provided player instance
            expect(mockChopperPlayer.getCurrentTime).toHaveBeenCalled();
        });
    });

    describe('Requirement 7.5: Real-time Chop Updates', () => {
        it('should reflect chop changes immediately in sequencer UI', async () => {
            const { rerender } = render(
                <SamplerDrumSequencer
                    chops={[]}
                    activeBank="A"
                    youtubePlayer={mockYouTubePlayer}
                />
            );

            // Initially no chops
            expect(screen.getByTestId('track-0')).toHaveClass('empty-track');

            // Add chop in real-time
            rerender(
                <SamplerDrumSequencer
                    chops={[{ padId: 'A0', startTime: 10.0, endTime: 12.0, color: '#06b6d4' }]}
                    activeBank="A"
                    youtubePlayer={mockYouTubePlayer}
                />
            );

            // Should immediately show chop assignment
            expect(screen.getByTestId('track-0')).toHaveStyle({ borderColor: '#06b6d4' });
        });

        it('should update sequencer state when chops are modified in real-time', async () => {
            const onPatternChange = vi.fn();

            const { rerender } = render(
                <SamplerDrumSequencer
                    chops={[{ padId: 'A0', startTime: 10.0, endTime: 12.0, color: '#06b6d4' }]}
                    activeBank="A"
                    youtubePlayer={mockYouTubePlayer}
                    onPatternChange={onPatternChange}
                />
            );

            // Create pattern
            await user.click(screen.getByTestId('step-0-0'));

            // Modify chop color in real-time
            rerender(
                <SamplerDrumSequencer
                    chops={[{ padId: 'A0', startTime: 10.0, endTime: 12.0, color: '#ef4444' }]}
                    activeBank="A"
                    youtubePlayer={mockYouTubePlayer}
                    onPatternChange={onPatternChange}
                />
            );

            // UI should reflect new color immediately
            expect(screen.getByTestId('track-0')).toHaveStyle({ borderColor: '#ef4444' });
        });

        it('should handle rapid chop updates without performance degradation', async () => {
            const { rerender } = render(
                <SamplerDrumSequencer
                    chops={[{ padId: 'A0', startTime: 10.0, endTime: 12.0, color: '#06b6d4' }]}
                    activeBank="A"
                    youtubePlayer={mockYouTubePlayer}
                />
            );

            const startTime = performance.now();

            // Perform rapid updates
            for (let i = 0; i < 20; i++) {
                rerender(
                    <SamplerDrumSequencer
                        chops={[{
                            padId: 'A0',
                            startTime: 10.0 + i * 0.1,
                            endTime: 12.0 + i * 0.1,
                            color: `hsl(${i * 18}, 70%, 50%)`
                        }]}
                        activeBank="A"
                        youtubePlayer={mockYouTubePlayer}
                    />
                );
            }

            const endTime = performance.now();
            const updateDuration = endTime - startTime;

            // Rapid updates should complete quickly
            expect(updateDuration).toBeLessThan(200);
        });

        it('should maintain pattern consistency during real-time chop updates', async () => {
            const onPatternChange = vi.fn();

            const { rerender } = render(
                <SamplerDrumSequencer
                    chops={[
                        { padId: 'A0', startTime: 10.0, endTime: 12.0, color: '#06b6d4' },
                        { padId: 'A1', startTime: 15.0, endTime: 17.0, color: '#8b5cf6' }
                    ]}
                    activeBank="A"
                    youtubePlayer={mockYouTubePlayer}
                    onPatternChange={onPatternChange}
                />
            );

            // Create pattern with both chops
            await user.click(screen.getByTestId('step-0-0')); // A0
            await user.click(screen.getByTestId('step-1-4')); // A1

            // Update chops (modify timestamps)
            rerender(
                <SamplerDrumSequencer
                    chops={[
                        { padId: 'A0', startTime: 20.0, endTime: 22.0, color: '#06b6d4' },
                        { padId: 'A1', startTime: 25.0, endTime: 27.0, color: '#8b5cf6' }
                    ]}
                    activeBank="A"
                    youtubePlayer={mockYouTubePlayer}
                    onPatternChange={onPatternChange}
                />
            );

            // Pattern should remain consistent
            const lastPattern = onPatternChange.mock.calls[onPatternChange.mock.calls.length - 1][0];
            expect(lastPattern.tracks[0].steps[0]).toBe(true); // A0 trigger preserved
            expect(lastPattern.tracks[1].steps[4]).toBe(true); // A1 trigger preserved
        });

        it('should handle chop updates during active playback', async () => {
            const chops = [{ padId: 'A0', startTime: 10.0, endTime: 12.0, color: '#06b6d4' }];

            sequencerService.setChops(chops);

            const pattern = {
                tracks: [{ trackIndex: 0, chopId: 'A0', steps: [true, true, true, true] }]
            };

            sequencerService.setPattern(pattern);
            sequencerService.start();

            // Wait for initial trigger
            await new Promise(resolve => setTimeout(resolve, 100));
            expect(mockYouTubePlayer.seekTo).toHaveBeenCalledWith(10.0, true);

            // Update chop during playback
            const updatedChops = [{ padId: 'A0', startTime: 30.0, endTime: 32.0, color: '#ef4444' }];
            sequencerService.setChops(updatedChops);

            // Clear mock and wait for next trigger
            mockYouTubePlayer.seekTo.mockClear();
            await new Promise(resolve => setTimeout(resolve, 600));

            // Should use updated timestamp
            expect(mockYouTubePlayer.seekTo).toHaveBeenCalledWith(30.0, true);

            sequencerService.stop();
        });
    });

    describe('End-to-End Chop Integration Workflows', () => {
        it('should handle complete chop lifecycle: create -> modify -> delete', async () => {
            const onPatternChange = vi.fn();

            // Start with no chops
            const { rerender } = render(
                <SamplerDrumSequencer
                    chops={[]}
                    activeBank="A"
                    youtubePlayer={mockYouTubePlayer}
                    onPatternChange={onPatternChange}
                />
            );

            // 1. Create chop
            rerender(
                <SamplerDrumSequencer
                    chops={[{ padId: 'A0', startTime: 10.0, endTime: 12.0, color: '#06b6d4' }]}
                    activeBank="A"
                    youtubePlayer={mockYouTubePlayer}
                    onPatternChange={onPatternChange}
                />
            );

            // Verify chop is assigned
            expect(screen.getByTestId('track-0')).toHaveStyle({ borderColor: '#06b6d4' });

            // Create pattern with the chop
            await user.click(screen.getByTestId('step-0-0'));
            await user.click(screen.getByTestId('step-0-8'));

            // 2. Modify chop
            rerender(
                <SamplerDrumSequencer
                    chops={[{ padId: 'A0', startTime: 25.0, endTime: 27.0, color: '#ef4444' }]}
                    activeBank="A"
                    youtubePlayer={mockYouTubePlayer}
                    onPatternChange={onPatternChange}
                />
            );

            // Verify modification is reflected
            expect(screen.getByTestId('track-0')).toHaveStyle({ borderColor: '#ef4444' });

            // Pattern should be preserved
            let currentPattern = onPatternChange.mock.calls[onPatternChange.mock.calls.length - 1][0];
            expect(currentPattern.tracks[0].steps[0]).toBe(true);
            expect(currentPattern.tracks[0].steps[8]).toBe(true);

            // 3. Delete chop
            rerender(
                <SamplerDrumSequencer
                    chops={[]}
                    activeBank="A"
                    youtubePlayer={mockYouTubePlayer}
                    onPatternChange={onPatternChange}
                />
            );

            // Track should be empty
            expect(screen.getByTestId('track-0')).toHaveClass('empty-track');

            // Pattern triggers should be preserved but chop assignment removed
            currentPattern = onPatternChange.mock.calls[onPatternChange.mock.calls.length - 1][0];
            expect(currentPattern.tracks[0].steps[0]).toBe(true);
            expect(currentPattern.tracks[0].steps[8]).toBe(true);
            expect(currentPattern.tracks[0].chopId).toBeNull();
        });

        it('should handle complex multi-chop scenarios', async () => {
            const onPatternChange = vi.fn();

            // Start with multiple chops
            const initialChops = [
                { padId: 'A0', startTime: 10.0, endTime: 12.0, color: '#06b6d4' },
                { padId: 'A1', startTime: 15.0, endTime: 17.0, color: '#8b5cf6' },
                { padId: 'A2', startTime: 20.0, endTime: 22.0, color: '#f59e0b' },
                { padId: 'B0', startTime: 25.0, endTime: 27.0, color: '#ef4444' }
            ];

            const { rerender } = render(
                <SamplerDrumSequencer
                    chops={initialChops}
                    activeBank="A"
                    youtubePlayer={mockYouTubePlayer}
                    onPatternChange={onPatternChange}
                />
            );

            // Create patterns on Bank A
            await user.click(screen.getByTestId('step-0-0')); // A0
            await user.click(screen.getByTestId('step-1-4')); // A1
            await user.click(screen.getByTestId('step-2-8')); // A2

            // Switch to Bank B
            rerender(
                <SamplerDrumSequencer
                    chops={initialChops}
                    activeBank="B"
                    youtubePlayer={mockYouTubePlayer}
                    onPatternChange={onPatternChange}
                />
            );

            // Create pattern on Bank B
            await user.click(screen.getByTestId('step-0-2')); // B0

            // Switch back to Bank A
            rerender(
                <SamplerDrumSequencer
                    chops={initialChops}
                    activeBank="A"
                    youtubePlayer={mockYouTubePlayer}
                    onPatternChange={onPatternChange}
                />
            );

            // Bank A patterns should be preserved
            const finalPattern = onPatternChange.mock.calls[onPatternChange.mock.calls.length - 1][0];
            expect(finalPattern.tracks[0].steps[0]).toBe(true); // A0
            expect(finalPattern.tracks[1].steps[4]).toBe(true); // A1
            expect(finalPattern.tracks[2].steps[8]).toBe(true); // A2
        });
    });
});