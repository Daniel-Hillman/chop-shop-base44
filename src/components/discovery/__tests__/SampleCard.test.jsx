/**
 * @fileoverview Unit tests for SampleCard component
 * Tests component rendering, button interactions, loading states, and error handling
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import SampleCard from '../SampleCard';

// Mock sample data for testing
const mockSample = {
  id: 'test-sample-1',
  title: 'Funky Groove',
  artist: 'James Brown',
  year: 1970,
  genre: 'Funk',
  duration: 180, // 3 minutes
  youtubeId: 'test-youtube-id',
  thumbnailUrl: 'https://example.com/thumbnail.jpg',
  tempo: 120,
  instruments: ['Drums', 'Bass', 'Guitar'],
  tags: ['classic', 'groove'],
  isMock: false
};

const mockSampleWithMockData = {
  ...mockSample,
  id: 'mock-sample-1',
  title: 'Demo Sample',
  isMock: true
};

const mockSampleMinimal = {
  id: 'minimal-sample',
  title: 'Simple Track',
  artist: 'Unknown Artist',
  year: 1965,
  genre: 'Jazz',
  duration: 120,
  youtubeId: 'minimal-youtube-id',
  thumbnailUrl: 'https://example.com/minimal.jpg',
  isMock: false
};

describe('SampleCard', () => {
  let mockOnPlay;
  let mockOnFavorite;

  beforeEach(() => {
    mockOnPlay = vi.fn();
    mockOnFavorite = vi.fn();
  });

  describe('Basic Rendering', () => {
    it('renders sample metadata correctly', () => {
      render(
        <SampleCard
          sample={mockSample}
          onPlay={mockOnPlay}
          onFavorite={mockOnFavorite}
        />
      );

      expect(screen.getByText('Funky Groove')).toBeInTheDocument();
      expect(screen.getByText('James Brown')).toBeInTheDocument();
      expect(screen.getByText('1970')).toBeInTheDocument();
      expect(screen.getByText('Funk')).toBeInTheDocument();
      expect(screen.getByText('3:00')).toBeInTheDocument();
    });

    it('renders thumbnail with correct alt text', () => {
      render(
        <SampleCard
          sample={mockSample}
          onPlay={mockOnPlay}
          onFavorite={mockOnFavorite}
        />
      );

      const thumbnail = screen.getByAltText('Funky Groove by James Brown');
      expect(thumbnail).toBeInTheDocument();
      expect(thumbnail).toHaveAttribute('src', mockSample.thumbnailUrl);
    });

    it('renders optional tempo when provided', () => {
      render(
        <SampleCard
          sample={mockSample}
          onPlay={mockOnPlay}
          onFavorite={mockOnFavorite}
        />
      );

      expect(screen.getByText('BPM:')).toBeInTheDocument();
      expect(screen.getByText('120')).toBeInTheDocument();
    });

    it('renders instruments when provided', () => {
      render(
        <SampleCard
          sample={mockSample}
          onPlay={mockOnPlay}
          onFavorite={mockOnFavorite}
        />
      );

      expect(screen.getByText('Drums')).toBeInTheDocument();
      expect(screen.getByText('Bass')).toBeInTheDocument();
      expect(screen.getByText('Guitar')).toBeInTheDocument();
    });

    it('does not render optional fields when not provided', () => {
      render(
        <SampleCard
          sample={mockSampleMinimal}
          onPlay={mockOnPlay}
          onFavorite={mockOnFavorite}
        />
      );

      expect(screen.queryByText('BPM:')).not.toBeInTheDocument();
      expect(screen.queryByText('Drums')).not.toBeInTheDocument();
    });

    it('shows mock data indicator for mock samples', () => {
      render(
        <SampleCard
          sample={mockSampleWithMockData}
          onPlay={mockOnPlay}
          onFavorite={mockOnFavorite}
        />
      );

      expect(screen.getByText('Demo')).toBeInTheDocument();
    });

    it('does not show mock indicator for real samples', () => {
      render(
        <SampleCard
          sample={mockSample}
          onPlay={mockOnPlay}
          onFavorite={mockOnFavorite}
        />
      );

      expect(screen.queryByText('Demo')).not.toBeInTheDocument();
    });
  });

  describe('Button Types and Interactions', () => {
    it('renders all buttons with type="button"', () => {
      render(
        <SampleCard
          sample={mockSample}
          onPlay={mockOnPlay}
          onFavorite={mockOnFavorite}
        />
      );

      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        expect(button).toHaveAttribute('type', 'button');
      });
    });

    it('calls onPlay when play button is clicked', () => {
      render(
        <SampleCard
          sample={mockSample}
          onPlay={mockOnPlay}
          onFavorite={mockOnFavorite}
        />
      );

      const playButton = screen.getByLabelText('Play Funky Groove');
      fireEvent.click(playButton);

      expect(mockOnPlay).toHaveBeenCalledTimes(1);
      expect(mockOnPlay).toHaveBeenCalledWith(mockSample);
    });

    it('calls onFavorite when favorite button is clicked', () => {
      render(
        <SampleCard
          sample={mockSample}
          onPlay={mockOnPlay}
          onFavorite={mockOnFavorite}
        />
      );

      const favoriteButton = screen.getByLabelText('Add Funky Groove to favorites');
      fireEvent.click(favoriteButton);

      expect(mockOnFavorite).toHaveBeenCalledTimes(1);
      expect(mockOnFavorite).toHaveBeenCalledWith(mockSample);
    });

    it('shows correct play button state when playing', () => {
      render(
        <SampleCard
          sample={mockSample}
          onPlay={mockOnPlay}
          onFavorite={mockOnFavorite}
          isPlaying={true}
        />
      );

      const playButton = screen.getByLabelText('Pause Funky Groove');
      expect(playButton).toHaveClass('sample-card__play-button--playing');
      expect(screen.getByText('⏸️')).toBeInTheDocument();
    });

    it('shows correct favorite button state when favorited', () => {
      render(
        <SampleCard
          sample={mockSample}
          onPlay={mockOnPlay}
          onFavorite={mockOnFavorite}
          isFavorite={true}
        />
      );

      const favoriteButton = screen.getByLabelText('Remove Funky Groove from favorites');
      expect(favoriteButton).toHaveClass('sample-card__favorite-button--active');
      expect(screen.getByText('❤️')).toBeInTheDocument();
    });

    it('does not call callbacks when buttons are disabled due to loading', () => {
      render(
        <SampleCard
          sample={mockSample}
          onPlay={mockOnPlay}
          onFavorite={mockOnFavorite}
          isLoading={true}
        />
      );

      const playButton = screen.getByLabelText('Play Funky Groove');
      const favoriteButton = screen.getByLabelText('Add Funky Groove to favorites');

      fireEvent.click(playButton);
      fireEvent.click(favoriteButton);

      expect(mockOnPlay).not.toHaveBeenCalled();
      expect(mockOnFavorite).not.toHaveBeenCalled();
    });
  });

  describe('Loading States', () => {
    it('shows loading overlay when isLoading is true', () => {
      const { container } = render(
        <SampleCard
          sample={mockSample}
          onPlay={mockOnPlay}
          onFavorite={mockOnFavorite}
          isLoading={true}
        />
      );

      expect(screen.getByText('Loading sample...')).toBeInTheDocument();
      const loadingOverlay = container.querySelector('.sample-card__loading-overlay');
      expect(loadingOverlay).toBeInTheDocument();
    });

    it('applies loading class to card when loading', () => {
      const { container } = render(
        <SampleCard
          sample={mockSample}
          onPlay={mockOnPlay}
          onFavorite={mockOnFavorite}
          isLoading={true}
        />
      );

      const card = container.querySelector('.sample-card');
      expect(card).toHaveClass('sample-card--loading');
    });

    it('disables buttons when loading', () => {
      render(
        <SampleCard
          sample={mockSample}
          onPlay={mockOnPlay}
          onFavorite={mockOnFavorite}
          isLoading={true}
        />
      );

      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        expect(button).toBeDisabled();
      });
    });

    it('shows spinner in play button when loading', () => {
      render(
        <SampleCard
          sample={mockSample}
          onPlay={mockOnPlay}
          onFavorite={mockOnFavorite}
          isLoading={true}
        />
      );

      const playButton = screen.getByLabelText('Play Funky Groove');
      const spinner = playButton.querySelector('.sample-card__button-spinner');
      expect(spinner).toBeInTheDocument();
    });
  });

  describe('Thumbnail Error Handling', () => {
    it('shows loading state initially', () => {
      render(
        <SampleCard
          sample={mockSample}
          onPlay={mockOnPlay}
          onFavorite={mockOnFavorite}
        />
      );

      expect(screen.getByText('Loading thumbnail...')).toBeInTheDocument();
    });

    it('shows error state when thumbnail fails to load', async () => {
      render(
        <SampleCard
          sample={mockSample}
          onPlay={mockOnPlay}
          onFavorite={mockOnFavorite}
        />
      );

      // Wait for the image to be rendered
      await waitFor(() => {
        const thumbnail = screen.getByAltText('Funky Groove by James Brown');
        expect(thumbnail).toBeInTheDocument();
      });

      const thumbnail = screen.getByAltText('Funky Groove by James Brown');
      fireEvent.error(thumbnail);

      await waitFor(() => {
        expect(screen.getByText('Image unavailable')).toBeInTheDocument();
        expect(screen.getByText('🎵')).toBeInTheDocument();
      });
    });

    it('hides loading state when thumbnail loads successfully', async () => {
      render(
        <SampleCard
          sample={mockSample}
          onPlay={mockOnPlay}
          onFavorite={mockOnFavorite}
        />
      );

      // Wait for the image to be rendered
      await waitFor(() => {
        const thumbnail = screen.getByAltText('Funky Groove by James Brown');
        expect(thumbnail).toBeInTheDocument();
      });

      const thumbnail = screen.getByAltText('Funky Groove by James Brown');
      fireEvent.load(thumbnail);

      await waitFor(() => {
        expect(screen.queryByText('Loading thumbnail...')).not.toBeInTheDocument();
      });
    });
  });

  describe('Duration Formatting', () => {
    it('formats duration correctly for minutes and seconds', () => {
      const sampleWithDuration = {
        ...mockSample,
        duration: 125 // 2:05
      };

      render(
        <SampleCard
          sample={sampleWithDuration}
          onPlay={mockOnPlay}
          onFavorite={mockOnFavorite}
        />
      );

      expect(screen.getByText('2:05')).toBeInTheDocument();
    });

    it('formats duration with zero-padded seconds', () => {
      const sampleWithDuration = {
        ...mockSample,
        duration: 63 // 1:03
      };

      render(
        <SampleCard
          sample={sampleWithDuration}
          onPlay={mockOnPlay}
          onFavorite={mockOnFavorite}
        />
      );

      expect(screen.getByText('1:03')).toBeInTheDocument();
    });

    it('handles zero duration', () => {
      const sampleWithDuration = {
        ...mockSample,
        duration: 0
      };

      render(
        <SampleCard
          sample={sampleWithDuration}
          onPlay={mockOnPlay}
          onFavorite={mockOnFavorite}
        />
      );

      expect(screen.getByText('0:00')).toBeInTheDocument();
    });
  });

  describe('Instruments Display', () => {
    it('shows first 3 instruments', () => {
      const sampleWithManyInstruments = {
        ...mockSample,
        instruments: ['Drums', 'Bass', 'Guitar', 'Piano', 'Saxophone']
      };

      render(
        <SampleCard
          sample={sampleWithManyInstruments}
          onPlay={mockOnPlay}
          onFavorite={mockOnFavorite}
        />
      );

      expect(screen.getByText('Drums')).toBeInTheDocument();
      expect(screen.getByText('Bass')).toBeInTheDocument();
      expect(screen.getByText('Guitar')).toBeInTheDocument();
      expect(screen.getByText('+2 more')).toBeInTheDocument();
      expect(screen.queryByText('Piano')).not.toBeInTheDocument();
    });

    it('shows all instruments when 3 or fewer', () => {
      render(
        <SampleCard
          sample={mockSample}
          onPlay={mockOnPlay}
          onFavorite={mockOnFavorite}
        />
      );

      expect(screen.getByText('Drums')).toBeInTheDocument();
      expect(screen.getByText('Bass')).toBeInTheDocument();
      expect(screen.getByText('Guitar')).toBeInTheDocument();
      expect(screen.queryByText('+0 more')).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('provides proper ARIA labels for buttons', () => {
      render(
        <SampleCard
          sample={mockSample}
          onPlay={mockOnPlay}
          onFavorite={mockOnFavorite}
        />
      );

      expect(screen.getByLabelText('Play Funky Groove')).toBeInTheDocument();
      expect(screen.getByLabelText('Add Funky Groove to favorites')).toBeInTheDocument();
      expect(screen.getByLabelText('More actions for Funky Groove')).toBeInTheDocument();
    });

    it('updates ARIA labels based on state', () => {
      render(
        <SampleCard
          sample={mockSample}
          onPlay={mockOnPlay}
          onFavorite={mockOnFavorite}
          isPlaying={true}
          isFavorite={true}
        />
      );

      expect(screen.getByLabelText('Pause Funky Groove')).toBeInTheDocument();
      expect(screen.getByLabelText('Remove Funky Groove from favorites')).toBeInTheDocument();
    });

    it('provides screen reader text for loading states', () => {
      render(
        <SampleCard
          sample={mockSample}
          onPlay={mockOnPlay}
          onFavorite={mockOnFavorite}
          isLoading={true}
        />
      );

      expect(screen.getByText('Loading sample...')).toBeInTheDocument();
      expect(screen.getByText('Loading thumbnail...')).toBeInTheDocument();
    });
  });

  describe('Custom Props', () => {
    it('applies custom className', () => {
      const { container } = render(
        <SampleCard
          sample={mockSample}
          onPlay={mockOnPlay}
          onFavorite={mockOnFavorite}
          className="custom-class"
        />
      );

      const card = container.querySelector('.sample-card');
      expect(card).toHaveClass('custom-class');
    });

    it('handles missing optional callbacks gracefully', () => {
      render(
        <SampleCard
          sample={mockSample}
          onPlay={mockOnPlay}
          onFavorite={mockOnFavorite}
        />
      );

      const actionButton = screen.getByLabelText('More actions for Funky Groove');
      
      // Should not throw error when clicked
      expect(() => {
        fireEvent.click(actionButton);
      }).not.toThrow();
    });
  });

  describe('Edge Cases', () => {
    it('handles very long titles and artist names', () => {
      const sampleWithLongNames = {
        ...mockSample,
        title: 'This is a very long sample title that should be truncated properly',
        artist: 'This is a very long artist name that should also be truncated'
      };

      render(
        <SampleCard
          sample={sampleWithLongNames}
          onPlay={mockOnPlay}
          onFavorite={mockOnFavorite}
        />
      );

      const title = screen.getByText(sampleWithLongNames.title);
      const artist = screen.getByText(sampleWithLongNames.artist);
      
      expect(title).toHaveAttribute('title', sampleWithLongNames.title);
      expect(artist).toHaveAttribute('title', sampleWithLongNames.artist);
    });

    it('handles empty instruments array', () => {
      const sampleWithEmptyInstruments = {
        ...mockSample,
        instruments: []
      };

      render(
        <SampleCard
          sample={sampleWithEmptyInstruments}
          onPlay={mockOnPlay}
          onFavorite={mockOnFavorite}
        />
      );

      // Should not render instruments section
      expect(screen.queryByText('Drums')).not.toBeInTheDocument();
    });
  });
});