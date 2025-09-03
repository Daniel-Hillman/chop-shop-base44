/**
 * @fileoverview Unit tests for DiscoveryControls component
 * Tests form-safe interactions, filter functionality, and shuffle behavior
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import DiscoveryControls from '../DiscoveryControls.jsx';
import { createDefaultFilterState, VALID_GENRES, MIN_YEAR, MAX_YEAR } from '../../../types/discovery.js';

describe('DiscoveryControls', () => {
  let mockOnFilterChange;
  let mockOnShuffle;
  let defaultProps;

  beforeEach(() => {
    mockOnFilterChange = vi.fn();
    mockOnShuffle = vi.fn();
    
    defaultProps = {
      filters: createDefaultFilterState(),
      onFilterChange: mockOnFilterChange,
      onShuffle: mockOnShuffle,
      isLoading: false,
      error: null
    };
  });

  describe('Rendering', () => {
    it('renders all genre checkboxes', () => {
      render(<DiscoveryControls {...defaultProps} />);
      
      VALID_GENRES.forEach(genre => {
        expect(screen.getByLabelText(new RegExp(genre, 'i'))).toBeInTheDocument();
      });
    });

    it('renders year range sliders with correct initial values', () => {
      render(<DiscoveryControls {...defaultProps} />);
      
      const startSlider = screen.getByLabelText(/start year/i);
      const endSlider = screen.getByLabelText(/end year/i);
      
      expect(startSlider).toHaveValue(MIN_YEAR.toString());
      expect(endSlider).toHaveValue(MAX_YEAR.toString());
    });

    it('renders shuffle button with correct type', () => {
      render(<DiscoveryControls {...defaultProps} />);
      
      const shuffleButton = screen.getByRole('button', { name: /shuffle samples/i });
      expect(shuffleButton).toHaveAttribute('type', 'button');
    });

    it('renders clear all button', () => {
      render(<DiscoveryControls {...defaultProps} />);
      
      expect(screen.getByRole('button', { name: /clear all filters/i })).toBeInTheDocument();
    });
  });

  describe('Genre Filter Interactions', () => {
    it('handles genre selection correctly', async () => {
      const user = userEvent.setup();
      render(<DiscoveryControls {...defaultProps} />);
      
      const soulCheckbox = screen.getByLabelText(/soul/i);
      await user.click(soulCheckbox);
      
      expect(mockOnFilterChange).toHaveBeenCalledWith({
        ...defaultProps.filters,
        genres: ['Soul']
      });
    });

    it('handles genre deselection correctly', async () => {
      const user = userEvent.setup();
      const propsWithSelectedGenre = {
        ...defaultProps,
        filters: {
          ...defaultProps.filters,
          genres: ['Soul', 'Jazz']
        }
      };
      
      render(<DiscoveryControls {...propsWithSelectedGenre} />);
      
      const soulCheckbox = screen.getByLabelText(/soul/i);
      await user.click(soulCheckbox);
      
      expect(mockOnFilterChange).toHaveBeenCalledWith({
        ...propsWithSelectedGenre.filters,
        genres: ['Jazz']
      });
    });

    it('shows selected genres in summary', () => {
      const propsWithSelectedGenres = {
        ...defaultProps,
        filters: {
          ...defaultProps.filters,
          genres: ['Soul', 'Jazz']
        }
      };
      
      render(<DiscoveryControls {...propsWithSelectedGenres} />);
      
      expect(screen.getByText('Selected: Soul, Jazz')).toBeInTheDocument();
    });

    it('disables genre checkboxes when loading', () => {
      const loadingProps = { ...defaultProps, isLoading: true };
      render(<DiscoveryControls {...loadingProps} />);
      
      VALID_GENRES.forEach(genre => {
        const checkbox = screen.getByLabelText(new RegExp(genre, 'i'));
        expect(checkbox).toBeDisabled();
      });
    });
  });

  describe('Year Range Slider Interactions', () => {
    it('handles start year change correctly', async () => {
      render(<DiscoveryControls {...defaultProps} />);
      
      const startSlider = screen.getByLabelText(/start year/i);
      fireEvent.change(startSlider, { target: { value: '1960' } });
      
      expect(mockOnFilterChange).toHaveBeenCalledWith({
        ...defaultProps.filters,
        yearRange: {
          start: 1960,
          end: MAX_YEAR
        }
      });
    });

    it('handles end year change correctly', async () => {
      render(<DiscoveryControls {...defaultProps} />);
      
      const endSlider = screen.getByLabelText(/end year/i);
      fireEvent.change(endSlider, { target: { value: '1980' } });
      
      expect(mockOnFilterChange).toHaveBeenCalledWith({
        ...defaultProps.filters,
        yearRange: {
          start: MIN_YEAR,
          end: 1980
        }
      });
    });

    it('adjusts end year when start year exceeds it', async () => {
      const propsWithRange = {
        ...defaultProps,
        filters: {
          ...defaultProps.filters,
          yearRange: { start: 1960, end: 1970 }
        }
      };
      
      render(<DiscoveryControls {...propsWithRange} />);
      
      const startSlider = screen.getByLabelText(/start year/i);
      fireEvent.change(startSlider, { target: { value: '1975' } });
      
      expect(mockOnFilterChange).toHaveBeenCalledWith({
        ...propsWithRange.filters,
        yearRange: {
          start: 1975,
          end: 1975 // Adjusted to match start
        }
      });
    });

    it('adjusts start year when end year goes below it', async () => {
      const propsWithRange = {
        ...defaultProps,
        filters: {
          ...defaultProps.filters,
          yearRange: { start: 1970, end: 1980 }
        }
      };
      
      render(<DiscoveryControls {...propsWithRange} />);
      
      const endSlider = screen.getByLabelText(/end year/i);
      fireEvent.change(endSlider, { target: { value: '1965' } });
      
      expect(mockOnFilterChange).toHaveBeenCalledWith({
        ...propsWithRange.filters,
        yearRange: {
          start: 1965, // Adjusted to match end
          end: 1965
        }
      });
    });

    it('shows real-time feedback for year range changes', async () => {
      render(<DiscoveryControls {...defaultProps} />);
      
      const startSlider = screen.getByLabelText(/start year/i);
      fireEvent.change(startSlider, { target: { value: '1960' } });
      
      // Check that the display updates immediately
      expect(screen.getByText('1960 - 1995')).toBeInTheDocument();
    });

    it('disables year sliders when loading', () => {
      const loadingProps = { ...defaultProps, isLoading: true };
      render(<DiscoveryControls {...loadingProps} />);
      
      const startSlider = screen.getByLabelText(/start year/i);
      const endSlider = screen.getByLabelText(/end year/i);
      
      expect(startSlider).toBeDisabled();
      expect(endSlider).toBeDisabled();
    });
  });

  describe('Shuffle Button Interactions', () => {
    it('calls onShuffle when clicked', async () => {
      const user = userEvent.setup();
      render(<DiscoveryControls {...defaultProps} />);
      
      const shuffleButton = screen.getByRole('button', { name: /shuffle samples/i });
      await user.click(shuffleButton);
      
      expect(mockOnShuffle).toHaveBeenCalledTimes(1);
    });

    it('prevents form submission', async () => {
      const user = userEvent.setup();
      const mockSubmit = vi.fn();
      
      render(
        <form onSubmit={mockSubmit}>
          <DiscoveryControls {...defaultProps} />
        </form>
      );
      
      const shuffleButton = screen.getByRole('button', { name: /shuffle samples/i });
      await user.click(shuffleButton);
      
      expect(mockSubmit).not.toHaveBeenCalled();
      expect(mockOnShuffle).toHaveBeenCalledTimes(1);
    });

    it('shows loading state correctly', () => {
      const loadingProps = { ...defaultProps, isLoading: true };
      render(<DiscoveryControls {...loadingProps} />);
      
      const shuffleButton = screen.getByRole('button', { name: /shuffle samples/i });
      expect(shuffleButton).toBeDisabled();
      expect(screen.getByText('Shuffling...')).toBeInTheDocument();
    });

    it('disables shuffle button when loading', () => {
      const loadingProps = { ...defaultProps, isLoading: true };
      render(<DiscoveryControls {...loadingProps} />);
      
      const shuffleButton = screen.getByRole('button', { name: /shuffle samples/i });
      expect(shuffleButton).toBeDisabled();
    });
  });

  describe('Clear All Functionality', () => {
    it('clears all filters when clicked', async () => {
      const user = userEvent.setup();
      const propsWithFilters = {
        ...defaultProps,
        filters: {
          genres: ['Soul', 'Jazz'],
          yearRange: { start: 1960, end: 1980 }
        }
      };
      
      render(<DiscoveryControls {...propsWithFilters} />);
      
      const clearButton = screen.getByRole('button', { name: /clear all filters/i });
      await user.click(clearButton);
      
      expect(mockOnFilterChange).toHaveBeenCalledWith({
        genres: [],
        yearRange: {
          start: MIN_YEAR,
          end: MAX_YEAR
        }
      });
    });

    it('prevents form submission when clearing filters', async () => {
      const user = userEvent.setup();
      const mockSubmit = vi.fn();
      
      render(
        <form onSubmit={mockSubmit}>
          <DiscoveryControls {...defaultProps} />
        </form>
      );
      
      const clearButton = screen.getByRole('button', { name: /clear all filters/i });
      await user.click(clearButton);
      
      expect(mockSubmit).not.toHaveBeenCalled();
    });

    it('disables clear button when loading', () => {
      const loadingProps = { ...defaultProps, isLoading: true };
      render(<DiscoveryControls {...loadingProps} />);
      
      const clearButton = screen.getByRole('button', { name: /clear all filters/i });
      expect(clearButton).toBeDisabled();
    });
  });

  describe('Error Handling', () => {
    it('displays error message when provided', () => {
      const errorProps = {
        ...defaultProps,
        error: 'Test error message'
      };
      
      render(<DiscoveryControls {...errorProps} />);
      
      expect(screen.getByText('Test error message')).toBeInTheDocument();
    });

    it('does not display error section when no error', () => {
      render(<DiscoveryControls {...defaultProps} />);
      
      expect(screen.queryByText(/error/i)).not.toBeInTheDocument();
    });
  });

  describe('Filter Summary', () => {
    it('shows correct summary with no genres selected', () => {
      render(<DiscoveryControls {...defaultProps} />);
      
      expect(screen.getByText(`All genres (${MIN_YEAR}-${MAX_YEAR})`)).toBeInTheDocument();
    });

    it('shows correct summary with genres selected', () => {
      const propsWithGenres = {
        ...defaultProps,
        filters: {
          ...defaultProps.filters,
          genres: ['Soul', 'Jazz']
        }
      };
      
      render(<DiscoveryControls {...propsWithGenres} />);
      
      expect(screen.getByText((content, element) => {
        return content.includes('Filtering by 2 genres') && content.includes(`(${MIN_YEAR}-${MAX_YEAR})`);
      })).toBeInTheDocument();
    });

    it('shows correct summary with single genre selected', () => {
      const propsWithGenre = {
        ...defaultProps,
        filters: {
          ...defaultProps.filters,
          genres: ['Soul']
        }
      };
      
      render(<DiscoveryControls {...propsWithGenre} />);
      
      expect(screen.getByText((content, element) => {
        return content.includes('Filtering by 1 genre') && content.includes(`(${MIN_YEAR}-${MAX_YEAR})`);
      })).toBeInTheDocument();
    });

    it('updates summary when year range changes', () => {
      const propsWithRange = {
        ...defaultProps,
        filters: {
          ...defaultProps.filters,
          yearRange: { start: 1960, end: 1980 }
        }
      };
      
      render(<DiscoveryControls {...propsWithRange} />);
      
      expect(screen.getByText('All genres (1960-1980)')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels on sliders', () => {
      render(<DiscoveryControls {...defaultProps} />);
      
      const startSlider = screen.getByLabelText(/start year/i);
      const endSlider = screen.getByLabelText(/end year/i);
      
      expect(startSlider).toHaveAttribute('aria-label');
      expect(endSlider).toHaveAttribute('aria-label');
    });

    it('has proper ARIA descriptions', () => {
      render(<DiscoveryControls {...defaultProps} />);
      
      const startSlider = screen.getByLabelText(/start year/i);
      const endSlider = screen.getByLabelText(/end year/i);
      
      expect(startSlider).toHaveAttribute('aria-describedby');
      expect(endSlider).toHaveAttribute('aria-describedby');
    });

    it('has proper labels for checkboxes', () => {
      render(<DiscoveryControls {...defaultProps} />);
      
      VALID_GENRES.forEach(genre => {
        const checkbox = screen.getByLabelText(new RegExp(genre, 'i'));
        expect(checkbox).toHaveAttribute('id');
      });
    });

    it('has proper button labels', () => {
      render(<DiscoveryControls {...defaultProps} />);
      
      const shuffleButton = screen.getByRole('button', { name: /shuffle samples/i });
      const clearButton = screen.getByRole('button', { name: /clear all filters/i });
      
      expect(shuffleButton).toHaveAttribute('aria-label');
      expect(clearButton).toHaveAttribute('aria-label');
    });
  });

  describe('Props Validation', () => {
    it('handles missing filters prop gracefully', () => {
      const propsWithoutFilters = {
        ...defaultProps,
        filters: null
      };
      
      expect(() => {
        render(<DiscoveryControls {...propsWithoutFilters} />);
      }).not.toThrow();
    });

    it('handles missing callbacks gracefully', () => {
      const propsWithoutCallbacks = {
        ...defaultProps,
        onFilterChange: null,
        onShuffle: null
      };
      
      expect(() => {
        render(<DiscoveryControls {...propsWithoutCallbacks} />);
      }).not.toThrow();
    });

    it('syncs local year range with prop changes', async () => {
      const { rerender } = render(<DiscoveryControls {...defaultProps} />);
      
      const newProps = {
        ...defaultProps,
        filters: {
          ...defaultProps.filters,
          yearRange: { start: 1960, end: 1980 }
        }
      };
      
      rerender(<DiscoveryControls {...newProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('1960 - 1980')).toBeInTheDocument();
      });
    });
  });

  describe('Event Handling', () => {
    it('stops event propagation on shuffle click', async () => {
      const user = userEvent.setup();
      const mockParentClick = vi.fn();
      
      render(
        <div onClick={mockParentClick}>
          <DiscoveryControls {...defaultProps} />
        </div>
      );
      
      const shuffleButton = screen.getByRole('button', { name: /shuffle samples/i });
      await user.click(shuffleButton);
      
      expect(mockOnShuffle).toHaveBeenCalledTimes(1);
      expect(mockParentClick).not.toHaveBeenCalled();
    });

    it('stops event propagation on clear filters click', async () => {
      const user = userEvent.setup();
      const mockParentClick = vi.fn();
      
      render(
        <div onClick={mockParentClick}>
          <DiscoveryControls {...defaultProps} />
        </div>
      );
      
      const clearButton = screen.getByRole('button', { name: /clear all filters/i });
      await user.click(clearButton);
      
      expect(mockOnFilterChange).toHaveBeenCalled();
      expect(mockParentClick).not.toHaveBeenCalled();
    });
  });
});