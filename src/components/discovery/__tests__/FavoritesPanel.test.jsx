/**
 * @fileoverview Unit tests for FavoritesPanel component
 * Tests component functionality, error handling, and user interactions
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import FavoritesPanel from '../FavoritesPanel.jsx';

// Mock CSS import
vi.mock('../FavoritesPanel.css', () => ({}));

describe('FavoritesPanel', () => {
  const mockSample1 = {
    id: 'sample-1',
    title: 'Funky Drummer',
    artist: 'James Brown',
    year: 1970,
    genre: 'Funk',
    duration: 180,
    youtubeId: 'abc123',
    thumbnailUrl: 'https://example.com/thumb1.jpg',
    isMock: false
  };

  const mockSample2 = {
    id: 'sample-2',
    title: 'Amen Break',
    artist: 'The Winstons',
    year: 1969,
    genre: 'Soul',
    duration: 240,
    youtubeId: 'def456',
    thumbnailUrl: 'https://example.com/thumb2.jpg',
    isMock: true
  };

  const mockFavorites = [mockSample1, mockSample2];

  const defaultProps = {
    favorites: [],
    onRemoveFavorite: vi.fn(),
    onPlayFavorite: vi.fn(),
    isVisible: true,
    className: ''
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Rendering', () => {
    it('renders with empty favorites', () => {
      render(<FavoritesPanel {...defaultProps} />);
      
      expect(screen.getByText('Favorite Samples')).toBeInTheDocument();
      expect(screen.getByText('0 favorites')).toBeInTheDocument();
      expect(screen.getByText('No favorite samples yet')).toBeInTheDocument();
      expect(screen.getByText('Click the heart icon on any sample to add it to your favorites')).toBeInTheDocument();
    });

    it('renders with favorite samples', () => {
      render(<FavoritesPanel {...defaultProps} favorites={mockFavorites} />);
      
      expect(screen.getByText('Favorite Samples')).toBeInTheDocument();
      expect(screen.getByText('2 favorites')).toBeInTheDocument();
      expect(screen.getByText('Funky Drummer')).toBeInTheDocument();
      expect(screen.getByText('James Brown')).toBeInTheDocument();
      expect(screen.getByText('Amen Break')).toBeInTheDocument();
      expect(screen.getByText('The Winstons')).toBeInTheDocument();
    });

    it('renders correct singular/plural favorites count', () => {
      const { rerender } = render(<FavoritesPanel {...defaultProps} favorites={[mockSample1]} />);
      expect(screen.getByText('1 favorite')).toBeInTheDocument();
      
      rerender(<FavoritesPanel {...defaultProps} favorites={mockFavorites} />);
      expect(screen.getByText('2 favorites')).toBeInTheDocument();
    });

    it('does not render when not visible', () => {
      render(<FavoritesPanel {...defaultProps} isVisible={false} />);
      
      expect(screen.queryByText('Favorite Samples')).not.toBeInTheDocument();
    });

    it('applies custom className', () => {
      const { container } = render(<FavoritesPanel {...defaultProps} className="custom-class" />);
      
      expect(container.firstChild).toHaveClass('favorites-panel', 'custom-class');
    });
  });

  describe('Sample Display', () => {
    it('displays sample metadata correctly', () => {
      render(<FavoritesPanel {...defaultProps} favorites={[mockSample1]} />);
      
      expect(screen.getByText('Funky Drummer')).toBeInTheDocument();
      expect(screen.getByText('James Brown')).toBeInTheDocument();
      expect(screen.getByText('1970')).toBeInTheDocument();
      expect(screen.getByText('Funk')).toBeInTheDocument();
      expect(screen.getByText('3:00')).toBeInTheDocument(); // 180 seconds = 3:00
    });

    it('displays mock indicator for mock samples', () => {
      render(<FavoritesPanel {...defaultProps} favorites={[mockSample2]} />);
      
      expect(screen.getByText('Demo')).toBeInTheDocument();
    });

    it('formats duration correctly', () => {
      const sampleWithShortDuration = {
        ...mockSample1,
        duration: 65 // 1:05
      };
      
      render(<FavoritesPanel {...defaultProps} favorites={[sampleWithShortDuration]} />);
      
      expect(screen.getByText('1:05')).toBeInTheDocument();
    });

    it('handles thumbnail loading errors', () => {
      render(<FavoritesPanel {...defaultProps} favorites={[mockSample1]} />);
      
      const thumbnail = screen.getByAltText('Funky Drummer thumbnail');
      fireEvent.error(thumbnail);
      
      expect(thumbnail.src).toBe('http://localhost:3000/placeholder-thumbnail.jpg');
    });
  });

  describe('User Interactions', () => {
    it('calls onPlayFavorite when play button is clicked', async () => {
      const onPlayFavorite = vi.fn().mockResolvedValue();
      render(<FavoritesPanel {...defaultProps} favorites={[mockSample1]} onPlayFavorite={onPlayFavorite} />);
      
      const playButton = screen.getByLabelText('Play Funky Drummer by James Brown');
      fireEvent.click(playButton);
      
      await waitFor(() => {
        expect(onPlayFavorite).toHaveBeenCalledWith(mockSample1);
      });
    });

    it('calls onRemoveFavorite when remove button is clicked', async () => {
      const onRemoveFavorite = vi.fn().mockResolvedValue();
      render(<FavoritesPanel {...defaultProps} favorites={[mockSample1]} onRemoveFavorite={onRemoveFavorite} />);
      
      const removeButton = screen.getByLabelText('Remove Funky Drummer from favorites');
      fireEvent.click(removeButton);
      
      await waitFor(() => {
        expect(onRemoveFavorite).toHaveBeenCalledWith('sample-1');
      });
    });

    it('disables buttons when loading', () => {
      render(<FavoritesPanel {...defaultProps} favorites={[mockSample1]} />);
      
      const playButton = screen.getByLabelText('Play Funky Drummer by James Brown');
      const removeButton = screen.getByLabelText('Remove Funky Drummer from favorites');
      
      // Trigger loading state by clicking play button
      fireEvent.click(playButton);
      
      expect(playButton).toBeDisabled();
      expect(removeButton).toBeDisabled();
    });
  });

  describe('Error Handling', () => {
    it('displays error when onPlayFavorite fails', async () => {
      const onPlayFavorite = vi.fn().mockRejectedValue(new Error('Play failed'));
      render(<FavoritesPanel {...defaultProps} favorites={[mockSample1]} onPlayFavorite={onPlayFavorite} />);
      
      const playButton = screen.getByLabelText('Play Funky Drummer by James Brown');
      fireEvent.click(playButton);
      
      await waitFor(() => {
        expect(screen.getByText('Failed to play sample. Please try again.')).toBeInTheDocument();
      });
    });

    it('displays error when onRemoveFavorite fails', async () => {
      const onRemoveFavorite = vi.fn().mockRejectedValue(new Error('Remove failed'));
      render(<FavoritesPanel {...defaultProps} favorites={[mockSample1]} onRemoveFavorite={onRemoveFavorite} />);
      
      const removeButton = screen.getByLabelText('Remove Funky Drummer from favorites');
      fireEvent.click(removeButton);
      
      await waitFor(() => {
        expect(screen.getByText('Failed to remove favorite. Please try again.')).toBeInTheDocument();
      });
    });

    it('allows dismissing error messages', async () => {
      const onPlayFavorite = vi.fn().mockRejectedValue(new Error('Play failed'));
      render(<FavoritesPanel {...defaultProps} favorites={[mockSample1]} onPlayFavorite={onPlayFavorite} />);
      
      const playButton = screen.getByLabelText('Play Funky Drummer by James Brown');
      fireEvent.click(playButton);
      
      await waitFor(() => {
        expect(screen.getByText('Failed to play sample. Please try again.')).toBeInTheDocument();
      });
      
      const dismissButton = screen.getByLabelText('Dismiss error');
      fireEvent.click(dismissButton);
      
      expect(screen.queryByText('Failed to play sample. Please try again.')).not.toBeInTheDocument();
    });

    it('handles invalid sample data', () => {
      const invalidSample = {
        id: 'invalid',
        title: '', // Invalid: empty title
        artist: 'Test Artist',
        year: 1970,
        genre: 'Funk',
        duration: 180,
        youtubeId: 'abc123',
        thumbnailUrl: 'https://example.com/thumb.jpg',
        isMock: false
      };

      // Mock console.warn to avoid test output noise
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      render(<FavoritesPanel {...defaultProps} favorites={[invalidSample]} />);
      
      expect(screen.getByText('Some favorite samples have invalid data')).toBeInTheDocument();
      
      consoleSpy.mockRestore();
    });

    it('handles missing required props gracefully', async () => {
      const onRemoveFavorite = vi.fn().mockResolvedValue();
      render(<FavoritesPanel {...defaultProps} favorites={[mockSample1]} onRemoveFavorite={onRemoveFavorite} />);
      
      // Simulate clicking remove button with invalid sample ID
      const removeButton = screen.getByLabelText('Remove Funky Drummer from favorites');
      
      // Mock the sample to have no ID
      const sampleWithoutId = { ...mockSample1, id: '' };
      
      // This should be handled gracefully
      fireEvent.click(removeButton);
      
      await waitFor(() => {
        expect(onRemoveFavorite).toHaveBeenCalled();
      });
    });
  });

  describe('Loading States', () => {
    it('shows loading indicator when processing', async () => {
      const onPlayFavorite = vi.fn(() => new Promise(resolve => setTimeout(resolve, 100)));
      render(<FavoritesPanel {...defaultProps} favorites={[mockSample1]} onPlayFavorite={onPlayFavorite} />);
      
      const playButton = screen.getByLabelText('Play Funky Drummer by James Brown');
      fireEvent.click(playButton);
      
      expect(screen.getByText('Processing...')).toBeInTheDocument();
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
      
      await waitFor(() => {
        expect(screen.queryByText('Processing...')).not.toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels', () => {
      render(<FavoritesPanel {...defaultProps} favorites={[mockSample1]} />);
      
      expect(screen.getByLabelText('Play Funky Drummer by James Brown')).toBeInTheDocument();
      expect(screen.getByLabelText('Remove Funky Drummer from favorites')).toBeInTheDocument();
    });

    it('has proper error alert role', async () => {
      const onPlayFavorite = vi.fn().mockRejectedValue(new Error('Play failed'));
      render(<FavoritesPanel {...defaultProps} favorites={[mockSample1]} onPlayFavorite={onPlayFavorite} />);
      
      const playButton = screen.getByLabelText('Play Funky Drummer by James Brown');
      fireEvent.click(playButton);
      
      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
      });
    });

    it('supports keyboard navigation', () => {
      render(<FavoritesPanel {...defaultProps} favorites={[mockSample1]} />);
      
      const playButton = screen.getByLabelText('Play Funky Drummer by James Brown');
      const removeButton = screen.getByLabelText('Remove Funky Drummer from favorites');
      
      expect(playButton).toHaveAttribute('type', 'button');
      expect(removeButton).toHaveAttribute('type', 'button');
    });
  });

  describe('Edge Cases', () => {
    it('handles empty favorites array', () => {
      render(<FavoritesPanel {...defaultProps} favorites={[]} />);
      
      expect(screen.getByText('No favorite samples yet')).toBeInTheDocument();
    });

    it('handles undefined favorites', () => {
      render(<FavoritesPanel {...defaultProps} favorites={undefined} />);
      
      expect(screen.getByText('No favorite samples yet')).toBeInTheDocument();
    });

    it('handles null callbacks gracefully', () => {
      render(<FavoritesPanel {...defaultProps} favorites={[mockSample1]} onPlayFavorite={null} onRemoveFavorite={null} />);
      
      // Should render without crashing
      expect(screen.getByText('Funky Drummer')).toBeInTheDocument();
    });
  });
});