/**
 * @fileoverview SamplerDrumSequencer Chop Integration Test
 * Tests the integration between SamplerDrumSequencer component and chop data
 */

import React from 'react';
import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import SamplerDrumSequencer from '../SamplerDrumSequencer';

// Mock YouTube player
const createMockYouTubePlayer = () => ({
  getPlayerState: vi.fn(() => 1), // playing
  getCurrentTime: vi.fn(() => 0),
  getDuration: vi.fn(() => 180),
  seekTo: vi.fn(),
  playVideo: vi.fn(),
  pauseVideo: vi.fn(),
  getVideoData: vi.fn(() => ({ title: 'Test Video' }))
});

describe('SamplerDrumSequencer - Chop Integration', () => {
  let mockYouTubePlayer;
  let mockOnBankChange;
  let mockOnServiceRef;

  beforeEach(() => {
    mockYouTubePlayer = createMockYouTubePlayer();
    mockOnBankChange = vi.fn();
    mockOnServiceRef = vi.fn();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  test('should initialize with chops and display sequencer', async () => {
    const chops = [
      { padId: 'A0', startTime: 10, endTime: 12, color: '#06b6d4' },
      { padId: 'A1', startTime: 15, endTime: 17, color: '#3b82f6' }
    ];

    render(
      <SamplerDrumSequencer
        chops={chops}
        activeBank="A"
        youtubePlayer={mockYouTubePlayer}
        onBankChange={mockOnBankChange}
        onServiceRef={mockOnServiceRef}
      />
    );

    // Should show loading initially
    expect(screen.getByText(/Initializing Sampler Sequencer/)).toBeInTheDocument();

    // Wait for initialization
    await waitFor(() => {
      expect(screen.getByText(/Sampler Drum Sequencer/)).toBeInTheDocument();
    }, { timeout: 3000 });

    // Should display chop count
    await waitFor(() => {
      expect(screen.getByText(/2 chops loaded/)).toBeInTheDocument();
    });

    // Should call onServiceRef with service instance
    expect(mockOnServiceRef).toHaveBeenCalledWith(expect.any(Object));
  });

  test('should update when chops change', async () => {
    const initialChops = [
      { padId: 'A0', startTime: 10, endTime: 12, color: '#06b6d4' }
    ];

    const { rerender } = render(
      <SamplerDrumSequencer
        chops={initialChops}
        activeBank="A"
        youtubePlayer={mockYouTubePlayer}
        onBankChange={mockOnBankChange}
        onServiceRef={mockOnServiceRef}
      />
    );

    // Wait for initialization
    await waitFor(() => {
      expect(screen.getByText(/1 chops loaded/)).toBeInTheDocument();
    }, { timeout: 3000 });

    // Update with more chops
    const updatedChops = [
      { padId: 'A0', startTime: 10, endTime: 12, color: '#06b6d4' },
      { padId: 'A1', startTime: 15, endTime: 17, color: '#3b82f6' },
      { padId: 'B0', startTime: 20, endTime: 22, color: '#8b5cf6' }
    ];

    rerender(
      <SamplerDrumSequencer
        chops={updatedChops}
        activeBank="A"
        youtubePlayer={mockYouTubePlayer}
        onBankChange={mockOnBankChange}
        onServiceRef={mockOnServiceRef}
      />
    );

    // Should update chop count
    await waitFor(() => {
      expect(screen.getByText(/3 chops loaded/)).toBeInTheDocument();
    });
  });

  test('should handle bank changes', async () => {
    const chops = [
      { padId: 'A0', startTime: 10, endTime: 12, color: '#06b6d4' },
      { padId: 'B0', startTime: 20, endTime: 22, color: '#8b5cf6' }
    ];

    const { rerender } = render(
      <SamplerDrumSequencer
        chops={chops}
        activeBank="A"
        youtubePlayer={mockYouTubePlayer}
        onBankChange={mockOnBankChange}
        onServiceRef={mockOnServiceRef}
      />
    );

    // Wait for initialization
    await waitFor(() => {
      expect(screen.getByText(/Bank A/)).toBeInTheDocument();
    }, { timeout: 3000 });

    // Change to bank B
    rerender(
      <SamplerDrumSequencer
        chops={chops}
        activeBank="B"
        youtubePlayer={mockYouTubePlayer}
        onBankChange={mockOnBankChange}
        onServiceRef={mockOnServiceRef}
      />
    );

    // Should update to show bank B
    await waitFor(() => {
      expect(screen.getByText(/Bank B/)).toBeInTheDocument();
    });
  });

  test('should handle empty chops array', async () => {
    render(
      <SamplerDrumSequencer
        chops={[]}
        activeBank="A"
        youtubePlayer={mockYouTubePlayer}
        onBankChange={mockOnBankChange}
        onServiceRef={mockOnServiceRef}
      />
    );

    // Wait for initialization
    await waitFor(() => {
      expect(screen.getByText(/0 chops loaded/)).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  test('should handle missing YouTube player gracefully', async () => {
    const chops = [
      { padId: 'A0', startTime: 10, endTime: 12, color: '#06b6d4' }
    ];

    render(
      <SamplerDrumSequencer
        chops={chops}
        activeBank="A"
        youtubePlayer={null}
        onBankChange={mockOnBankChange}
        onServiceRef={mockOnServiceRef}
      />
    );

    // Should show loading state indefinitely without YouTube player
    expect(screen.getByText(/Initializing Sampler Sequencer/)).toBeInTheDocument();
    
    // Should not initialize without YouTube player
    await new Promise(resolve => setTimeout(resolve, 1000));
    expect(screen.getByText(/Initializing Sampler Sequencer/)).toBeInTheDocument();
  });
});