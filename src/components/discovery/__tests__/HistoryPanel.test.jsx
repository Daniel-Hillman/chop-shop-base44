/**
 * @fileoverview Unit tests for HistoryPanel component
 * Tests history display, interactions, and error handling
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import HistoryPanel from '../HistoryPanel.jsx';

// Mock CSS import
vi.mock('../HistoryPanel.css', () => ({}));

describe('HistoryPanel', () => {
  const mockSamples = [
    {
      id: 'sample1',
      title: 'Funky Drummer',
      artist: 'James Brown',
      year: 1970,
      genre: 'Funk',
      duration: 180,
      youtubeId: 'abc123',
      thumbnailUrl: 'https://example.com/thumb1.jpg',
      isMock: false,
      viewedAt: Date.now() - 1000 * 60 * 5 // 5 minutes ago
    },
    {
      id: 'sample2',
      title: 'Amen Break',
      artist: 'The Winstons',
      year: 1969,
      genre: 'Soul',
      duration: 120,
      youtubeId: 'def456',
      thumbnailUrl: 'https://example.com/thumb2.jpg',
      isMock: true,
      viewedAt: Date.now() - 1000 * 60 * 60 // 1 hour ago
    }
  ];

  const defaultProps = {
    history: mockSamples,
    onClearHistory: vi.fn(),
    onPlayFromHistory: vi.fn(),
    currentPlayingSampleId: null,
    isLoading: false
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Rendering', () => {
    it('renders history panel with title', () => {
      render(<HistoryPanel {...defaultProps} />);
      
      expect(screen.getByText('Discovery History')).toBeInTheDocument();
      expect(screen.getByText('(2)')).toBeInTheDocument();
    });

    it('renders history items correctly', () => {
      render(<HistoryPanel {...defaultProps} />);
      
      expect(screen.getByText('Funky Drummer')).toBeInTheDocument();
      expect(screen.getByText('James Brown')).toBeInTheDocument();
      expect(screen.getByText('1970')).toBeInTheDocument();
      expect(screen.getByText('Funk')).toBeInTheDocument();
      expect(screen.getByText('3:00')).toBeInTheDocument();
      
      expect(screen.getByText('Amen Break')).toBeInTheDocument();
      expect(screen.getByText('The Winstons')).toBeInTheDocument();
      expect(screen.getByText('1969')).toBeInTheDocument();
      expect(screen.getByText('Soul')).toBeInTheDocument();
      expect(screen.getByText('2:00')).toBeInTheDocument();
    });

    it('shows mock indicator for demo samples', () => {
      render(<HistoryPanel {...defaultProps} />);
      
      expect(screen.getByText('Demo')).toBeInTheDocument();
    });

    it('renders empty state when no history', () => {
      render(<HistoryPanel {...defaultProps} history={[]} />);
      
      expect(screen.getByText('No History Yet')).toBeInTheDocument();
      expect(screen.getByText('Samples you view will appear here for easy access.')).toBeInTheDocument();
      expect(screen.queryByText('Clear All')).not.toBeInTheDocument();
    });

    it('renders loading state', () => {
      render(<HistoryPanel {...defaultProps} isLoading={true} />);
      
      expect(screen.getByText('Loading history...')).toBeInTheDocument();
    });

    it('shows timestamps correctly', () => {
      render(<HistoryPanel {...defaultProps} />);
      
      expect(screen.getByText('5m ago')).toBeInTheDocument();
      expect(screen.getByText('1h ago')).toBeInTheDocument();
    });
  });

  describe('Interactions', () => {
    it('calls onPlayFromHistory when play button is clicked', () => {
      render(<HistoryPanel {...defaultProps} />);
      
      const playButtons = screen.getAllByTitle('Play');
      fireEvent.click(playButtons[0]);
      
      expect(defaultProps.onPlayFromHistory).toHaveBeenCalledWith(mockSamples[0]);
    });

    it('shows stop button for currently playing sample', () => {
      render(<HistoryPanel {...defaultProps} currentPlayingSampleId="sample1" />);
      
      expect(screen.getByTitle('Stop')).toBeInTheDocument();
      expect(screen.getByText('⏸️')).toBeInTheDocument();
    });

    it('shows clear history button when history exists', () => {
      render(<HistoryPanel {...defaultProps} />);
      
      expect(screen.getByText('Clear All')).toBeInTheDocument();
    });

    it('shows confirmation dialog when clear is clicked', () => {
      render(<HistoryPanel {...defaultProps} />);
      
      fireEvent.click(screen.getByText('Clear All'));
      
      expect(screen.getByText('Clear all history?')).toBeInTheDocument();
      expect(screen.getByText('Yes')).toBeInTheDocument();
      expect(screen.getByText('Cancel')).toBeInTheDocument();
    });

    it('calls onClearHistory when confirmed', () => {
      render(<HistoryPanel {...defaultProps} />);
      
      fireEvent.click(screen.getByText('Clear All'));
      fireEvent.click(screen.getByText('Yes'));
      
      expect(defaultProps.onClearHistory).toHaveBeenCalled();
    });

    it('cancels clear confirmation', () => {
      render(<HistoryPanel {...defaultProps} />);
      
      fireEvent.click(screen.getByText('Clear All'));
      fireEvent.click(screen.getByText('Cancel'));
      
      expect(screen.queryByText('Clear all history?')).not.toBeInTheDocument();
      expect(screen.getByText('Clear All')).toBeInTheDocument();
      expect(defaultProps.onClearHistory).not.toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('filters out invalid samples', () => {
      const invalidHistory = [
        ...mockSamples,
        { id: 'invalid', title: '' }, // Invalid sample
        null, // Null sample
        undefined // Undefined sample
      ];

      // Mock console.warn to avoid test output noise
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      render(<HistoryPanel {...defaultProps} history={invalidHistory} />);
      
      // Should only show valid samples
      expect(screen.getByText('(2)')).toBeInTheDocument();
      expect(screen.getByText('Funky Drummer')).toBeInTheDocument();
      expect(screen.getByText('Amen Break')).toBeInTheDocument();
      
      consoleSpy.mockRestore();
    });

    it('handles missing onPlayFromHistory gracefully', () => {
      render(<HistoryPanel {...defaultProps} onPlayFromHistory={undefined} />);
      
      const playButtons = screen.getAllByTitle('Play');
      
      // Should not throw error
      expect(() => fireEvent.click(playButtons[0])).not.toThrow();
    });

    it('handles image load errors', () => {
      render(<HistoryPanel {...defaultProps} />);
      
      const images = screen.getAllByRole('img');
      fireEvent.error(images[0]);
      
      expect(images[0].src).toBe('http://localhost:3000/placeholder-thumbnail.jpg');
    });
  });

  describe('Accessibility', () => {
    it('has proper button types', () => {
      render(<HistoryPanel {...defaultProps} />);
      
      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        expect(button.type).toBe('button');
      });
    });

    it('has proper alt text for images', () => {
      render(<HistoryPanel {...defaultProps} />);
      
      expect(screen.getByAltText('Funky Drummer thumbnail')).toBeInTheDocument();
      expect(screen.getByAltText('Amen Break thumbnail')).toBeInTheDocument();
    });

    it('has proper titles for buttons', () => {
      render(<HistoryPanel {...defaultProps} />);
      
      expect(screen.getAllByTitle('Play')).toHaveLength(2);
      expect(screen.getByTitle('Clear history')).toBeInTheDocument();
    });

    it('disables buttons when loading', () => {
      render(<HistoryPanel {...defaultProps} isLoading={true} />);
      
      // Should have disabled buttons when loading
      const clearButton = screen.queryByText('Clear All');
      if (clearButton) {
        expect(clearButton).toBeDisabled();
      }
    });
  });

  describe('Duration Formatting', () => {
    it('formats durations correctly', () => {
      const samplesWithVariousDurations = [
        { ...mockSamples[0], duration: 65 }, // 1:05
        { ...mockSamples[1], duration: 600 } // 10:00 (within valid range)
      ];

      render(<HistoryPanel {...defaultProps} history={samplesWithVariousDurations} />);
      
      expect(screen.getByText('1:05')).toBeInTheDocument();
      expect(screen.getByText('10:00')).toBeInTheDocument();
    });
  });

  describe('Timestamp Formatting', () => {
    it('formats recent timestamps correctly', () => {
      const now = Date.now();
      const recentSamples = [
        { ...mockSamples[0], viewedAt: now - 30000 }, // 30 seconds ago
        { ...mockSamples[1], viewedAt: now - 1000 * 60 * 30 }, // 30 minutes ago
        { ...mockSamples[0], id: 'sample3', viewedAt: now - 1000 * 60 * 60 * 2 }, // 2 hours ago
        { ...mockSamples[1], id: 'sample4', viewedAt: now - 1000 * 60 * 60 * 24 * 2 }, // 2 days ago
        { ...mockSamples[0], id: 'sample5', viewedAt: now - 1000 * 60 * 60 * 24 * 8 } // 8 days ago
      ];

      render(<HistoryPanel {...defaultProps} history={recentSamples} />);
      
      expect(screen.getByText('Just now')).toBeInTheDocument();
      expect(screen.getByText('30m ago')).toBeInTheDocument();
      expect(screen.getByText('2h ago')).toBeInTheDocument();
      expect(screen.getByText('2d ago')).toBeInTheDocument();
      
      // Should show actual date for items older than a week
      const oldDate = new Date(now - 1000 * 60 * 60 * 24 * 8);
      expect(screen.getByText(oldDate.toLocaleDateString())).toBeInTheDocument();
    });
  });

  describe('Responsive Behavior', () => {
    it('renders correctly with many items', () => {
      const manyItems = Array.from({ length: 20 }, (_, i) => ({
        ...mockSamples[0],
        id: `sample${i}`,
        title: `Sample ${i}`,
        viewedAt: Date.now() - i * 1000 * 60
      }));

      render(<HistoryPanel {...defaultProps} history={manyItems} />);
      
      expect(screen.getByText('(20)')).toBeInTheDocument();
      expect(screen.getByText('Sample 0')).toBeInTheDocument();
      expect(screen.getByText('Sample 19')).toBeInTheDocument();
    });
  });
});