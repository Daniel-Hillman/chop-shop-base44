/**
 * @fileoverview Unit tests for SampleGrid component
 * Tests responsive grid layout, loading states, empty states, error handling,
 * and user interactions with proper accessibility.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import SampleGrid from '../SampleGrid.jsx';

// Mock SampleCard component
vi.mock('../SampleCard.jsx', () => ({
  default: ({ sample, onPlay, onFavorite, isFavorite, isPlaying }) => (
    <div data-testid={`sample-card-${sample.id}`}>
      <h3>{sample.title}</h3>
      <p>{sample.artist}</p>
      <button 
        onClick={() => onPlay(sample)}
        data-testid={`play-${sample.id}`}
      >
        {isPlaying ? 'Pause' : 'Play'}
      </button>
      <button 
        onClick={() => onFavorite(sample)}
        data-testid={`favorite-${sample.id}`}
      >
        {isFavorite ? 'Unfavorite' : 'Favorite'}
      </button>
    </div>
  )
}));

// Mock CSS import
vi.mock('../SampleGrid.css', () => ({}));

describe('SampleGrid', () => {
  const mockSamples = [
    {
      id: 'sample-1',
      title: 'Funky Drummer',
      artist: 'James Brown',
      year: 1970,
      genre: 'Funk',
      duration: 180,
      youtubeId: 'abc123',
      thumbnailUrl: 'https://example.com/thumb1.jpg',
      tempo: 120,
      instruments: ['drums', 'bass'],
      tags: ['classic', 'break'],
      isMock: false
    },
    {
      id: 'sample-2',
      title: 'Amen Break',
      artist: 'The Winstons',
      year: 1969,
      genre: 'Soul',
      duration: 240,
      youtubeId: 'def456',
      thumbnailUrl: 'https://example.com/thumb2.jpg',
      isMock: true
    }
  ];

  const defaultProps = {
    samples: [],
    isLoading: false,
    error: null,
    isOffline: false,
    hasFilters: false,
    onSamplePlay: vi.fn(),
    onSampleFavorite: vi.fn(),
    onClearFilters: vi.fn(),
    onShuffle: vi.fn(),
    onRetry: vi.fn(),
    currentPlayingSampleId: null,
    favoriteSampleIds: []
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Loading State', () => {
    it('renders loading skeleton when isLoading is true', () => {
      render(<SampleGrid {...defaultProps} isLoading={true} />);
      
      expect(screen.getByRole('status', { name: /loading samples/i })).toBeInTheDocument();
      expect(screen.getByText('Discovering samples...')).toBeInTheDocument();
      
      // Should render skeleton cards (the exact number may vary based on implementation)
      const skeletons = screen.getAllByRole('status', { name: /loading sample/i });
      expect(skeletons.length).toBeGreaterThanOrEqual(12);
      
      const allStatusElements = screen.getAllByRole('status');
      expect(allStatusElements.length).toBeGreaterThanOrEqual(13); // skeletons + 1 main loading status
    });

    it('does not render other states when loading', () => {
      render(
        <SampleGrid 
          {...defaultProps} 
          isLoading={true} 
          error="Some error"
          samples={mockSamples}
        />
      );
      
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
      expect(screen.queryByText('Funky Drummer')).not.toBeInTheDocument();
    });
  });

  describe('Error State', () => {
    it('renders error state when error is present', () => {
      const errorMessage = 'Failed to load samples';
      render(
        <SampleGrid 
          {...defaultProps} 
          error={errorMessage}
        />
      );
      
      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText('Unable to Load Samples')).toBeInTheDocument();
      expect(screen.getByText(/we encountered an issue/i)).toBeInTheDocument();
    });

    it('shows technical details when error message is provided', () => {
      const errorMessage = 'Network timeout error';
      render(
        <SampleGrid 
          {...defaultProps} 
          error={errorMessage}
        />
      );
      
      const details = screen.getByText('Technical Details');
      expect(details).toBeInTheDocument();
      
      fireEvent.click(details);
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });

    it('calls onRetry when Try Again button is clicked', () => {
      const onRetry = vi.fn();
      render(
        <SampleGrid 
          {...defaultProps} 
          error="Some error"
          onRetry={onRetry}
        />
      );
      
      fireEvent.click(screen.getByText('Try Again'));
      expect(onRetry).toHaveBeenCalledTimes(1);
    });

    it('calls onShuffle when Load Demo Samples button is clicked', () => {
      const onShuffle = vi.fn();
      render(
        <SampleGrid 
          {...defaultProps} 
          error="Some error"
          onShuffle={onShuffle}
        />
      );
      
      fireEvent.click(screen.getByText('Load Demo Samples'));
      expect(onShuffle).toHaveBeenCalledTimes(1);
    });
  });

  describe('Empty State', () => {
    it('renders empty state when no samples and no loading/error', () => {
      render(<SampleGrid {...defaultProps} />);
      
      expect(screen.getByRole('status')).toBeInTheDocument();
      expect(screen.getByText('Ready to Discover')).toBeInTheDocument();
      expect(screen.getByText(/use the filters to discover/i)).toBeInTheDocument();
    });

    it('shows different message when filters are applied', () => {
      render(<SampleGrid {...defaultProps} hasFilters={true} />);
      
      expect(screen.getByText('No Samples Found')).toBeInTheDocument();
      expect(screen.getByText(/no samples match your current filters/i)).toBeInTheDocument();
    });

    it('shows offline message when offline', () => {
      render(<SampleGrid {...defaultProps} isOffline={true} />);
      
      expect(screen.getByText('You\'re Offline')).toBeInTheDocument();
      expect(screen.getByText(/connect to the internet/i)).toBeInTheDocument();
      expect(screen.getByText(/some features may be limited/i)).toBeInTheDocument();
    });

    it('shows Clear Filters button when filters are applied', () => {
      const onClearFilters = vi.fn();
      render(
        <SampleGrid 
          {...defaultProps} 
          hasFilters={true}
          onClearFilters={onClearFilters}
        />
      );
      
      const clearButton = screen.getByText('Clear Filters');
      expect(clearButton).toBeInTheDocument();
      
      fireEvent.click(clearButton);
      expect(onClearFilters).toHaveBeenCalledTimes(1);
    });

    it('does not show Clear Filters button when offline', () => {
      render(
        <SampleGrid 
          {...defaultProps} 
          hasFilters={true}
          isOffline={true}
        />
      );
      
      expect(screen.queryByText('Clear Filters')).not.toBeInTheDocument();
    });

    it('calls onShuffle when shuffle button is clicked', () => {
      const onShuffle = vi.fn();
      render(
        <SampleGrid 
          {...defaultProps} 
          onShuffle={onShuffle}
        />
      );
      
      fireEvent.click(screen.getByText('Shuffle Samples'));
      expect(onShuffle).toHaveBeenCalledTimes(1);
    });
  });

  describe('Sample Grid with Data', () => {
    it('renders samples in grid layout', () => {
      render(
        <SampleGrid 
          {...defaultProps} 
          samples={mockSamples}
        />
      );
      
      expect(screen.getByRole('grid')).toBeInTheDocument();
      expect(screen.getByLabelText(/grid of 2 samples/i)).toBeInTheDocument();
      
      // Check sample cards are rendered
      expect(screen.getByTestId('sample-card-sample-1')).toBeInTheDocument();
      expect(screen.getByTestId('sample-card-sample-2')).toBeInTheDocument();
      
      expect(screen.getByText('Funky Drummer')).toBeInTheDocument();
      expect(screen.getByText('Amen Break')).toBeInTheDocument();
    });

    it('displays correct sample count in header', () => {
      render(
        <SampleGrid 
          {...defaultProps} 
          samples={[mockSamples[0]]}
        />
      );
      
      expect(screen.getByText('1 Sample Found')).toBeInTheDocument();
      
      render(
        <SampleGrid 
          {...defaultProps} 
          samples={mockSamples}
        />
      );
      
      expect(screen.getByText('2 Samples Found')).toBeInTheDocument();
    });

    it('shows demo mode notice when mock samples are present', () => {
      render(
        <SampleGrid 
          {...defaultProps} 
          samples={mockSamples}
        />
      );
      
      expect(screen.getByText('Demo Mode')).toBeInTheDocument();
      expect(screen.getByText('Some samples are demo content')).toBeInTheDocument();
    });

    it('does not show demo notice when no mock samples', () => {
      const realSamples = mockSamples.map(sample => ({ ...sample, isMock: false }));
      render(
        <SampleGrid 
          {...defaultProps} 
          samples={realSamples}
        />
      );
      
      expect(screen.queryByText('Demo Mode')).not.toBeInTheDocument();
    });

    it('handles sample play interactions', () => {
      const onSamplePlay = vi.fn();
      render(
        <SampleGrid 
          {...defaultProps} 
          samples={mockSamples}
          onSamplePlay={onSamplePlay}
          currentPlayingSampleId="sample-1"
        />
      );
      
      // First sample should show as playing
      expect(screen.getByTestId('play-sample-1')).toHaveTextContent('Pause');
      expect(screen.getByTestId('play-sample-2')).toHaveTextContent('Play');
      
      fireEvent.click(screen.getByTestId('play-sample-2'));
      expect(onSamplePlay).toHaveBeenCalledWith(mockSamples[1]);
    });

    it('handles sample favorite interactions', () => {
      const onSampleFavorite = vi.fn();
      render(
        <SampleGrid 
          {...defaultProps} 
          samples={mockSamples}
          onSampleFavorite={onSampleFavorite}
          favoriteSampleIds={['sample-1']}
        />
      );
      
      // First sample should show as favorited
      expect(screen.getByTestId('favorite-sample-1')).toHaveTextContent('Unfavorite');
      expect(screen.getByTestId('favorite-sample-2')).toHaveTextContent('Favorite');
      
      fireEvent.click(screen.getByTestId('favorite-sample-2'));
      expect(onSampleFavorite).toHaveBeenCalledWith(mockSamples[1]);
    });

    it('shows load more section when samples are multiple of 12', () => {
      const manySamples = Array.from({ length: 12 }, (_, i) => ({
        ...mockSamples[0],
        id: `sample-${i + 1}`,
        title: `Sample ${i + 1}`
      }));
      
      render(
        <SampleGrid 
          {...defaultProps} 
          samples={manySamples}
        />
      );
      
      expect(screen.getByText('Load More Samples')).toBeInTheDocument();
      expect(screen.getByText(/pagination will be implemented/i)).toBeInTheDocument();
    });

    it('does not show load more section for non-multiple of 12', () => {
      render(
        <SampleGrid 
          {...defaultProps} 
          samples={mockSamples}
        />
      );
      
      expect(screen.queryByText('Load More Samples')).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('provides proper ARIA labels for grid', () => {
      render(
        <SampleGrid 
          {...defaultProps} 
          samples={mockSamples}
        />
      );
      
      const grid = screen.getByRole('grid');
      expect(grid).toHaveAttribute('aria-label', 'Grid of 2 samples');
    });

    it('provides proper grid cell attributes', () => {
      render(
        <SampleGrid 
          {...defaultProps} 
          samples={mockSamples}
        />
      );
      
      const gridCells = screen.getAllByRole('gridcell');
      expect(gridCells).toHaveLength(2);
      
      expect(gridCells[0]).toHaveAttribute('aria-rowindex', '1');
      expect(gridCells[0]).toHaveAttribute('aria-colindex', '1');
      
      expect(gridCells[1]).toHaveAttribute('aria-rowindex', '1');
      expect(gridCells[1]).toHaveAttribute('aria-colindex', '2');
    });

    it('provides proper status roles for loading states', () => {
      render(<SampleGrid {...defaultProps} isLoading={true} />);
      
      expect(screen.getByRole('status', { name: /loading samples/i })).toBeInTheDocument();
      
      const skeletons = screen.getAllByRole('status', { name: /loading sample/i });
      expect(skeletons.length).toBeGreaterThanOrEqual(12);
      
      // Should have main loading status plus skeleton cards
      const allStatusElements = screen.getAllByRole('status');
      expect(allStatusElements.length).toBeGreaterThanOrEqual(13);
    });

    it('provides proper alert role for error state', () => {
      render(<SampleGrid {...defaultProps} error="Test error" />);
      
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    it('provides proper status role for empty state', () => {
      render(<SampleGrid {...defaultProps} />);
      
      expect(screen.getByRole('status')).toBeInTheDocument();
    });
  });

  describe('Responsive Behavior', () => {
    it('applies custom className when provided', () => {
      const { container } = render(
        <SampleGrid 
          {...defaultProps} 
          className="custom-class"
        />
      );
      
      expect(container.firstChild).toHaveClass('sample-grid', 'custom-class');
    });

    it('handles empty samples array gracefully', () => {
      render(<SampleGrid {...defaultProps} samples={[]} />);
      
      expect(screen.getByText('Ready to Discover')).toBeInTheDocument();
    });

    it('handles undefined samples gracefully', () => {
      render(<SampleGrid {...defaultProps} samples={undefined} />);
      
      expect(screen.getByText('Ready to Discover')).toBeInTheDocument();
    });
  });

  describe('State Combinations', () => {
    it('prioritizes loading state over error and data', () => {
      render(
        <SampleGrid 
          {...defaultProps} 
          isLoading={true}
          error="Some error"
          samples={mockSamples}
        />
      );
      
      expect(screen.getByText('Discovering samples...')).toBeInTheDocument();
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
      expect(screen.queryByText('Funky Drummer')).not.toBeInTheDocument();
    });

    it('prioritizes error state over data when not loading', () => {
      render(
        <SampleGrid 
          {...defaultProps} 
          error="Some error"
          samples={mockSamples}
        />
      );
      
      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.queryByText('Funky Drummer')).not.toBeInTheDocument();
    });

    it('shows data when no loading or error', () => {
      render(
        <SampleGrid 
          {...defaultProps} 
          samples={mockSamples}
        />
      );
      
      expect(screen.getByText('Funky Drummer')).toBeInTheDocument();
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
      expect(screen.queryByText('Discovering samples...')).not.toBeInTheDocument();
    });
  });
});