/**
 * @fileoverview Unit tests for advanced filtering functionality in DiscoveryControls
 * Tests tempo range filters, duration filters, and filter combination logic
 * 
 * Requirements: 6.1, 6.2, 6.3, 6.4
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import DiscoveryControls from '../DiscoveryControls.jsx';
import { MIN_TEMPO, MAX_TEMPO, MIN_DURATION, MAX_DURATION, MIN_YEAR, MAX_YEAR } from '../../../types/discovery.js';

describe('DiscoveryControls - Advanced Filtering', () => {
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

      const toggleButton = screen.getByRole('button', { name: /advanced filters/i });
      expect(toggleButton).toBeInTheDocument();
      expect(toggleButton).toHaveAttribute('aria-expanded', 'false');
    });

    it('should expand advanced filters when toggle is clicked', async () => {
      render(
        <DiscoveryControls
          filters={defaultFilters}
          onFilterChange={mockOnFilterChange}
          onShuffle={mockOnShuffle}
        />
      );

      const toggleButton = screen.getByRole('button', { name: /advanced filters/i });
      fireEvent.click(toggleButton);

      await waitFor(() => {
        expect(toggleButton).toHaveAttribute('aria-expanded', 'true');
        expect(screen.getByText('Tempo (BPM)')).toBeInTheDocument();
        expect(screen.getByText('Duration')).toBeInTheDocument();
      });
    });

    it('should collapse advanced filters when toggle is clicked again', async () => {
      render(
        <DiscoveryControls
          filters={defaultFilters}
          onFilterChange={mockOnFilterChange}
          onShuffle={mockOnShuffle}
        />
      );

      const toggleButton = screen.getByRole('button', { name: /advanced filters/i });
      
      // Expand
      fireEvent.click(toggleButton);
      await waitFor(() => {
        expect(screen.getByText('Tempo (BPM)')).toBeInTheDocument();
      });

      // Collapse
      fireEvent.click(toggleButton);
      await waitFor(() => {
        expect(toggleButton).toHaveAttribute('aria-expanded', 'false');
        expect(screen.queryByText('Tempo (BPM)')).not.toBeInTheDocument();
      });
    });
  });

  describe('Tempo Range Filtering', () => {
    beforeEach(async () => {
      render(
        <DiscoveryControls
          filters={defaultFilters}
          onFilterChange={mockOnFilterChange}
          onShuffle={mockOnShuffle}
        />
      );

      // Expand advanced filters
      const toggleButton = screen.getByRole('button', { name: /advanced filters/i });
      fireEvent.click(toggleButton);
      await waitFor(() => {
        expect(screen.getByText('Tempo (BPM)')).toBeInTheDocument();
      });
    });

    it('should display default tempo range', () => {
      const tempoDisplay = screen.getByText(`${MIN_TEMPO} - ${MAX_TEMPO} BPM`);
      expect(tempoDisplay).toBeInTheDocument();
    });

    it('should have tempo range sliders with correct attributes', () => {
      const minSlider = screen.getByLabelText(/minimum tempo/i);
      const maxSlider = screen.getByLabelText(/maximum tempo/i);

      expect(minSlider).toHaveAttribute('type', 'range');
      expect(minSlider).toHaveAttribute('min', MIN_TEMPO.toString());
      expect(minSlider).toHaveAttribute('max', MAX_TEMPO.toString());
      expect(minSlider).toHaveAttribute('value', MIN_TEMPO.toString());

      expect(maxSlider).toHaveAttribute('type', 'range');
      expect(maxSlider).toHaveAttribute('min', MIN_TEMPO.toString());
      expect(maxSlider).toHaveAttribute('max', MAX_TEMPO.toString());
      expect(maxSlider).toHaveAttribute('value', MAX_TEMPO.toString());
    });

    it('should update tempo min value and call onFilterChange', async () => {
      const minSlider = screen.getByLabelText(/minimum tempo/i);
      const newMinTempo = 80;

      fireEvent.change(minSlider, { target: { value: newMinTempo.toString() } });

      await waitFor(() => {
        expect(mockOnFilterChange).toHaveBeenCalledWith({
          ...defaultFilters,
          tempoRange: {
            min: newMinTempo,
            max: MAX_TEMPO
          }
        });
      });
    });

    it('should update tempo max value and call onFilterChange', async () => {
      const maxSlider = screen.getByLabelText(/maximum tempo/i);
      const newMaxTempo = 150;

      fireEvent.change(maxSlider, { target: { value: newMaxTempo.toString() } });

      await waitFor(() => {
        expect(mockOnFilterChange).toHaveBeenCalledWith({
          ...defaultFilters,
          tempoRange: {
            min: MIN_TEMPO,
            max: newMaxTempo
          }
        });
      });
    });

    it('should adjust max tempo when min exceeds max', async () => {
      const filtersWithTempo = {
        ...defaultFilters,
        tempoRange: { min: 100, max: 120 }
      };

      const { container } = render(
        <DiscoveryControls
          filters={filtersWithTempo}
          onFilterChange={mockOnFilterChange}
          onShuffle={mockOnShuffle}
        />
      );

      // Expand advanced filters
      const toggleButton = container.querySelector('button[aria-controls="advanced-filters"]');
      fireEvent.click(toggleButton);
      await waitFor(() => {
        expect(screen.getByText('Tempo (BPM)')).toBeInTheDocument();
      });

      const minSlider = screen.getByLabelText(/minimum tempo/i);
      fireEvent.change(minSlider, { target: { value: '130' } });

      await waitFor(() => {
        expect(mockOnFilterChange).toHaveBeenCalledWith({
          ...filtersWithTempo,
          tempoRange: {
            min: 130,
            max: 130 // Max should be adjusted to match min
          }
        });
      });
    });

    it('should adjust min tempo when max goes below min', async () => {
      const filtersWithTempo = {
        ...defaultFilters,
        tempoRange: { min: 100, max: 120 }
      };

      const { container } = render(
        <DiscoveryControls
          filters={filtersWithTempo}
          onFilterChange={mockOnFilterChange}
          onShuffle={mockOnShuffle}
        />
      );

      // Expand advanced filters
      const toggleButton = container.querySelector('button[aria-controls="advanced-filters"]');
      fireEvent.click(toggleButton);
      await waitFor(() => {
        expect(screen.getByText('Tempo (BPM)')).toBeInTheDocument();
      });

      const maxSlider = screen.getByLabelText(/maximum tempo/i);
      fireEvent.change(maxSlider, { target: { value: '90' } });

      await waitFor(() => {
        expect(mockOnFilterChange).toHaveBeenCalledWith({
          ...filtersWithTempo,
          tempoRange: {
            min: 90, // Min should be adjusted to match max
            max: 90
          }
        });
      });
    });
  });

  describe('Duration Range Filtering', () => {
    beforeEach(async () => {
      render(
        <DiscoveryControls
          filters={defaultFilters}
          onFilterChange={mockOnFilterChange}
          onShuffle={mockOnShuffle}
        />
      );

      // Expand advanced filters
      const toggleButton = screen.getByRole('button', { name: /advanced filters/i });
      fireEvent.click(toggleButton);
      await waitFor(() => {
        expect(screen.getByText('Duration')).toBeInTheDocument();
      });
    });

    it('should display default duration range in MM:SS format', () => {
      const minMinutes = Math.floor(MIN_DURATION / 60);
      const minSeconds = (MIN_DURATION % 60).toString().padStart(2, '0');
      const maxMinutes = Math.floor(MAX_DURATION / 60);
      const maxSeconds = (MAX_DURATION % 60).toString().padStart(2, '0');
      
      const durationDisplay = screen.getByText(`${minMinutes}:${minSeconds} - ${maxMinutes}:${maxSeconds}`);
      expect(durationDisplay).toBeInTheDocument();
    });

    it('should have duration range sliders with correct attributes', () => {
      const minSlider = screen.getByLabelText(/minimum duration/i);
      const maxSlider = screen.getByLabelText(/maximum duration/i);

      expect(minSlider).toHaveAttribute('type', 'range');
      expect(minSlider).toHaveAttribute('min', MIN_DURATION.toString());
      expect(minSlider).toHaveAttribute('max', MAX_DURATION.toString());
      expect(minSlider).toHaveAttribute('value', MIN_DURATION.toString());

      expect(maxSlider).toHaveAttribute('type', 'range');
      expect(maxSlider).toHaveAttribute('min', MIN_DURATION.toString());
      expect(maxSlider).toHaveAttribute('max', MAX_DURATION.toString());
      expect(maxSlider).toHaveAttribute('value', MAX_DURATION.toString());
    });

    it('should update duration min value and call onFilterChange', async () => {
      const minSlider = screen.getByLabelText(/minimum duration/i);
      const newMinDuration = 30; // 30 seconds

      fireEvent.change(minSlider, { target: { value: newMinDuration.toString() } });

      await waitFor(() => {
        expect(mockOnFilterChange).toHaveBeenCalledWith({
          ...defaultFilters,
          durationRange: {
            min: newMinDuration,
            max: MAX_DURATION
          }
        });
      });
    });

    it('should update duration max value and call onFilterChange', async () => {
      const maxSlider = screen.getByLabelText(/maximum duration/i);
      const newMaxDuration = 300; // 5 minutes

      fireEvent.change(maxSlider, { target: { value: newMaxDuration.toString() } });

      await waitFor(() => {
        expect(mockOnFilterChange).toHaveBeenCalledWith({
          ...defaultFilters,
          durationRange: {
            min: MIN_DURATION,
            max: newMaxDuration
          }
        });
      });
    });

    it('should adjust max duration when min exceeds max', async () => {
      const filtersWithDuration = {
        ...defaultFilters,
        durationRange: { min: 60, max: 180 }
      };

      const { container } = render(
        <DiscoveryControls
          filters={filtersWithDuration}
          onFilterChange={mockOnFilterChange}
          onShuffle={mockOnShuffle}
        />
      );

      // Expand advanced filters
      const toggleButton = container.querySelector('button[aria-controls="advanced-filters"]');
      fireEvent.click(toggleButton);
      await waitFor(() => {
        expect(screen.getByText('Duration')).toBeInTheDocument();
      });

      const minSlider = screen.getByLabelText(/minimum duration/i);
      fireEvent.change(minSlider, { target: { value: '200' } });

      await waitFor(() => {
        expect(mockOnFilterChange).toHaveBeenCalledWith({
          ...filtersWithDuration,
          durationRange: {
            min: 200,
            max: 200 // Max should be adjusted to match min
          }
        });
      });
    });
  });

  describe('Filter Combination Logic', () => {
    it('should handle multiple advanced filters simultaneously', async () => {
      const filtersWithAdvanced = {
        genres: ['Funk', 'Soul'],
        yearRange: { start: 1970, end: 1980 },
        tempoRange: { min: 90, max: 130 },
        durationRange: { min: 120, max: 300 }
      };

      render(
        <DiscoveryControls
          filters={filtersWithAdvanced}
          onFilterChange={mockOnFilterChange}
          onShuffle={mockOnShuffle}
        />
      );

      // Expand advanced filters
      const toggleButton = screen.getByRole('button', { name: /advanced filters/i });
      fireEvent.click(toggleButton);
      await waitFor(() => {
        expect(screen.getByText('Tempo (BPM)')).toBeInTheDocument();
      });

      // Verify all filters are displayed correctly
      expect(screen.getByText('90 - 130 BPM')).toBeInTheDocument();
      expect(screen.getByText('2:00 - 5:00')).toBeInTheDocument();
      expect(screen.getByText('Selected: Funk, Soul')).toBeInTheDocument();
      expect(screen.getByText('1970 - 1980')).toBeInTheDocument();
    });

    it('should show advanced filter summary when filters are applied', async () => {
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

      // Check filter summary
      expect(screen.getByText(/filtering by 1 genre.*1960-1970/i)).toBeInTheDocument();
      expect(screen.getByText('Tempo: 100-140 BPM')).toBeInTheDocument();
      expect(screen.getByText('Duration: 1:00 - 4:00')).toBeInTheDocument();
    });

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

      const clearButton = screen.getByRole('button', { name: /clear all/i });
      fireEvent.click(clearButton);

      await waitFor(() => {
        expect(mockOnFilterChange).toHaveBeenCalledWith({
          genres: [],
          yearRange: {
            start: MIN_YEAR,
            end: MAX_YEAR
          }
          // Note: advanced filters should be cleared (not included in the call)
        });
      });
    });
  });

  describe('Accessibility and UX', () => {
    beforeEach(async () => {
      render(
        <DiscoveryControls
          filters={defaultFilters}
          onFilterChange={mockOnFilterChange}
          onShuffle={mockOnShuffle}
        />
      );

      // Expand advanced filters
      const toggleButton = screen.getByRole('button', { name: /advanced filters/i });
      fireEvent.click(toggleButton);
      await waitFor(() => {
        expect(screen.getByText('Tempo (BPM)')).toBeInTheDocument();
      });
    });

    it('should have proper ARIA labels for tempo sliders', () => {
      const minSlider = screen.getByLabelText(/minimum tempo: \d+ bpm/i);
      const maxSlider = screen.getByLabelText(/maximum tempo: \d+ bpm/i);

      expect(minSlider).toBeInTheDocument();
      expect(maxSlider).toBeInTheDocument();
    });

    it('should have proper ARIA labels for duration sliders', () => {
      const minSlider = screen.getByLabelText(/minimum duration: \d+ minutes \d+ seconds/i);
      const maxSlider = screen.getByLabelText(/maximum duration: \d+ minutes \d+ seconds/i);

      expect(minSlider).toBeInTheDocument();
      expect(maxSlider).toBeInTheDocument();
    });

    it('should disable advanced filter controls when loading', async () => {
      const { container } = render(
        <DiscoveryControls
          filters={defaultFilters}
          onFilterChange={mockOnFilterChange}
          onShuffle={mockOnShuffle}
          isLoading={true}
        />
      );

      // Expand advanced filters
      const toggleButton = container.querySelector('button[aria-controls="advanced-filters"]');
      fireEvent.click(toggleButton);
      await waitFor(() => {
        expect(screen.getByText('Tempo (BPM)')).toBeInTheDocument();
      });

      const tempoMinSlider = screen.getByLabelText(/minimum tempo/i);
      const tempoMaxSlider = screen.getByLabelText(/maximum tempo/i);
      const durationMinSlider = screen.getByLabelText(/minimum duration/i);
      const durationMaxSlider = screen.getByLabelText(/maximum duration/i);

      expect(tempoMinSlider).toBeDisabled();
      expect(tempoMaxSlider).toBeDisabled();
      expect(durationMinSlider).toBeDisabled();
      expect(durationMaxSlider).toBeDisabled();
    });

    it('should display helpful descriptions for advanced filters', () => {
      expect(screen.getByText(/filter samples by tempo range/i)).toBeInTheDocument();
      expect(screen.getByText(/filter samples by duration/i)).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
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

    it('should prevent form submission on advanced filter interactions', async () => {
      const { container } = render(
        <DiscoveryControls
          filters={defaultFilters}
          onFilterChange={mockOnFilterChange}
          onShuffle={mockOnShuffle}
        />
      );

      const toggleButton = container.querySelector('button[aria-controls="advanced-filters"]');
      
      const mockEvent = {
        preventDefault: vi.fn(),
        stopPropagation: vi.fn(),
        target: toggleButton
      };
      
      fireEvent.click(toggleButton, mockEvent);

      // The component should handle preventDefault internally
      expect(toggleButton).toHaveAttribute('type', 'button');
    });
  });
});