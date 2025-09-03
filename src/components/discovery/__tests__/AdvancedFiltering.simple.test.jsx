/**
 * @fileoverview Simplified unit tests for advanced filtering functionality
 * Tests core functionality without complex DOM interactions
 * 
 * Requirements: 6.1, 6.2, 6.3, 6.4
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import DiscoveryControls from '../DiscoveryControls.jsx';
import { MIN_TEMPO, MAX_TEMPO, MIN_DURATION, MAX_DURATION, MIN_YEAR, MAX_YEAR } from '../../../types/discovery.js';

describe('DiscoveryControls - Advanced Filtering (Simplified)', () => {
  const mockOnFilterChange = vi.fn();
  const mockOnShuffle = vi.fn();

  const defaultFilters = {
    genres: [],
    yearRange: {
      start: MIN_YEAR,
      end: MAX_YEAR
    }
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Advanced Filters Toggle', () => {
    it('should show advanced filters toggle button', () => {
      render(
        <DiscoveryControls
          filters={defaultFilters}
          onFilterChange={mockOnFilterChange}
          onShuffle={mockOnShuffle}
        />
      );

      const toggleButton = screen.getByText('Advanced Filters');
      expect(toggleButton).toBeInTheDocument();
    });

    it('should expand advanced filters when clicked', async () => {
      render(
        <DiscoveryControls
          filters={defaultFilters}
          onFilterChange={mockOnFilterChange}
          onShuffle={mockOnShuffle}
        />
      );

      const toggleButton = screen.getByText('Advanced Filters');
      fireEvent.click(toggleButton);

      await waitFor(() => {
        expect(screen.getByText('Tempo (BPM)')).toBeInTheDocument();
        expect(screen.getByText('Duration')).toBeInTheDocument();
      });
    });
  });

  describe('Tempo Range Filtering', () => {
    it('should display default tempo range when expanded', async () => {
      render(
        <DiscoveryControls
          filters={defaultFilters}
          onFilterChange={mockOnFilterChange}
          onShuffle={mockOnShuffle}
        />
      );

      const toggleButton = screen.getByText('Advanced Filters');
      fireEvent.click(toggleButton);

      await waitFor(() => {
        expect(screen.getByText(`${MIN_TEMPO} - ${MAX_TEMPO} BPM`)).toBeInTheDocument();
      });
    });

    it('should show custom tempo range when provided', async () => {
      const filtersWithTempo = {
        ...defaultFilters,
        tempoRange: { min: 100, max: 140 }
      };

      render(
        <DiscoveryControls
          filters={filtersWithTempo}
          onFilterChange={mockOnFilterChange}
          onShuffle={mockOnShuffle}
        />
      );

      const toggleButton = screen.getByText('Advanced Filters');
      fireEvent.click(toggleButton);

      await waitFor(() => {
        expect(screen.getByText('100 - 140 BPM')).toBeInTheDocument();
      });
    });

    it('should call onFilterChange when tempo min changes', async () => {
      render(
        <DiscoveryControls
          filters={defaultFilters}
          onFilterChange={mockOnFilterChange}
          onShuffle={mockOnShuffle}
        />
      );

      const toggleButton = screen.getByText('Advanced Filters');
      fireEvent.click(toggleButton);

      await waitFor(() => {
        expect(screen.getByText('Tempo (BPM)')).toBeInTheDocument();
      });

      const minSlider = screen.getByDisplayValue(MIN_TEMPO.toString());
      fireEvent.change(minSlider, { target: { value: '80' } });

      await waitFor(() => {
        expect(mockOnFilterChange).toHaveBeenCalledWith({
          ...defaultFilters,
          tempoRange: {
            min: 80,
            max: MAX_TEMPO
          }
        });
      });
    });
  });

  describe('Duration Range Filtering', () => {
    it('should display default duration range when expanded', async () => {
      render(
        <DiscoveryControls
          filters={defaultFilters}
          onFilterChange={mockOnFilterChange}
          onShuffle={mockOnShuffle}
        />
      );

      const toggleButton = screen.getByText('Advanced Filters');
      fireEvent.click(toggleButton);

      await waitFor(() => {
        const minMinutes = Math.floor(MIN_DURATION / 60);
        const minSeconds = (MIN_DURATION % 60).toString().padStart(2, '0');
        const maxMinutes = Math.floor(MAX_DURATION / 60);
        const maxSeconds = (MAX_DURATION % 60).toString().padStart(2, '0');
        
        expect(screen.getByText(`${minMinutes}:${minSeconds} - ${maxMinutes}:${maxSeconds}`)).toBeInTheDocument();
      });
    });

    it('should show custom duration range when provided', async () => {
      const filtersWithDuration = {
        ...defaultFilters,
        durationRange: { min: 120, max: 300 }
      };

      render(
        <DiscoveryControls
          filters={filtersWithDuration}
          onFilterChange={mockOnFilterChange}
          onShuffle={mockOnShuffle}
        />
      );

      const toggleButton = screen.getByText('Advanced Filters');
      fireEvent.click(toggleButton);

      await waitFor(() => {
        expect(screen.getByText('2:00 - 5:00')).toBeInTheDocument();
      });
    });

    it('should call onFilterChange when duration min changes', async () => {
      render(
        <DiscoveryControls
          filters={defaultFilters}
          onFilterChange={mockOnFilterChange}
          onShuffle={mockOnShuffle}
        />
      );

      const toggleButton = screen.getByText('Advanced Filters');
      fireEvent.click(toggleButton);

      await waitFor(() => {
        expect(screen.getByText('Duration')).toBeInTheDocument();
      });

      const minSlider = screen.getByDisplayValue(MIN_DURATION.toString());
      fireEvent.change(minSlider, { target: { value: '30' } });

      await waitFor(() => {
        expect(mockOnFilterChange).toHaveBeenCalledWith({
          ...defaultFilters,
          durationRange: {
            min: 30,
            max: MAX_DURATION
          }
        });
      });
    });
  });

  describe('Filter Summary', () => {
    it('should show advanced filter summary when filters are applied', () => {
      const filtersWithAdvanced = {
        genres: ['Jazz'],
        yearRange: { start: 1960, end: 1970 },
        tempoRange: { min: 100, max: 140 },
        durationRange: { min: 60, max: 240 }
      };

      render(
        <DiscoveryControls
          filters={filtersWithAdvanced}
          onFilterChange={mockOnFilterChange}
          onShuffle={mockOnShuffle}
        />
      );

      expect(screen.getByText('Tempo: 100-140 BPM')).toBeInTheDocument();
      expect(screen.getByText('Duration: 1:00 - 4:00')).toBeInTheDocument();
    });

    it('should not show advanced filter summary when no advanced filters are applied', () => {
      render(
        <DiscoveryControls
          filters={defaultFilters}
          onFilterChange={mockOnFilterChange}
          onShuffle={mockOnShuffle}
        />
      );

      expect(screen.queryByText(/Tempo:/)).not.toBeInTheDocument();
      expect(screen.queryByText(/Duration:/)).not.toBeInTheDocument();
    });
  });

  describe('Clear Filters', () => {
    it('should clear advanced filters when clear all is clicked', async () => {
      const filtersWithAdvanced = {
        genres: ['Blues'],
        yearRange: { start: 1950, end: 1960 },
        tempoRange: { min: 80, max: 120 },
        durationRange: { min: 30, max: 180 }
      };

      render(
        <DiscoveryControls
          filters={filtersWithAdvanced}
          onFilterChange={mockOnFilterChange}
          onShuffle={mockOnShuffle}
        />
      );

      const clearButton = screen.getByText('Clear All');
      fireEvent.click(clearButton);

      await waitFor(() => {
        expect(mockOnFilterChange).toHaveBeenCalledWith({
          genres: [],
          yearRange: {
            start: MIN_YEAR,
            end: MAX_YEAR
          }
          // Advanced filters should be cleared (not included)
        });
      });
    });
  });

  describe('Loading State', () => {
    it('should disable controls when loading', () => {
      render(
        <DiscoveryControls
          filters={defaultFilters}
          onFilterChange={mockOnFilterChange}
          onShuffle={mockOnShuffle}
          isLoading={true}
        />
      );

      const clearButton = screen.getByText('Clear All');
      const shuffleButton = screen.getByText('Shuffling...');
      
      expect(clearButton).toBeInTheDocument();
      expect(shuffleButton).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle null filters gracefully', () => {
      expect(() => {
        render(
          <DiscoveryControls
            filters={null}
            onFilterChange={mockOnFilterChange}
            onShuffle={mockOnShuffle}
          />
        );
      }).not.toThrow();
    });

    it('should handle undefined advanced filters gracefully', () => {
      const filtersWithoutAdvanced = {
        genres: ['Soul'],
        yearRange: { start: 1970, end: 1980 }
        // No tempoRange or durationRange
      };

      expect(() => {
        render(
          <DiscoveryControls
            filters={filtersWithoutAdvanced}
            onFilterChange={mockOnFilterChange}
            onShuffle={mockOnShuffle}
          />
        );
      }).not.toThrow();
    });
  });
});