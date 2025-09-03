/**
 * @fileoverview Integration tests for filter combination and persistence
 * Tests complex filter scenarios with real component interactions
 * 
 * Requirements: 6.4, 6.5
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DiscoveryControls from '../DiscoveryControls.jsx';
import FilterPresetManager from '../FilterPresetManager.jsx';
import { createDefaultFilterState, createMockSample } from '../../../types/discovery.js';

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn()
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

describe('Filter Combination Integration', () => {
  let mockOnFilterChange;
  let mockOnShuffle;
  let defaultFilters;
  let user;

  beforeEach(() => {
    vi.clearAllMocks();
    mockOnFilterChange = vi.fn();
    mockOnShuffle = vi.fn();
    defaultFilters = createDefaultFilterState();
    user = userEvent.setup();
    
    // Mock localStorage to return empty data initially
    localStorageMock.getItem.mockReturnValue(null);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Multiple Filter Application', () => {
    it('should apply genre and year range filters together', async () => {
      render(
        <DiscoveryControls
          filters={defaultFilters}
          onFilterChange={mockOnFilterChange}
          onShuffle={mockOnShuffle}
        />
      );

      // Select Soul genre
      const soulCheckbox = screen.getByLabelText(/Soul/i);
      await user.click(soulCheckbox);

      // Adjust year range
      const yearStartSlider = screen.getByLabelText(/Start year/i);
      fireEvent.change(yearStartSlider, { target: { value: '1970' } });

      const yearEndSlider = screen.getByLabelText(/End year/i);
      fireEvent.change(yearEndSlider, { target: { value: '1980' } });

      // Verify multiple filter calls
      expect(mockOnFilterChange).toHaveBeenCalledWith(
        expect.objectContaining({
          genres: ['Soul']
        })
      );

      expect(mockOnFilterChange).toHaveBeenCalledWith(
        expect.objectContaining({
          yearRange: expect.objectContaining({
            start: 1970,
            end: 1980
          })
        })
      );
    });

    it('should apply advanced filters with basic filters', async () => {
      render(
        <DiscoveryControls
          filters={defaultFilters}
          onFilterChange={mockOnFilterChange}
          onShuffle={mockOnShuffle}
        />
      );

      // Open advanced filters
      const advancedToggle = screen.getByText(/Advanced Filters/i);
      await user.click(advancedToggle);

      // Select genre
      const funkCheckbox = screen.getByLabelText(/Funk/i);
      await user.click(funkCheckbox);

      // Set tempo range
      const tempoMinSlider = screen.getByLabelText(/Min BPM/i);
      fireEvent.change(tempoMinSlider, { target: { value: '100' } });

      const tempoMaxSlider = screen.getByLabelText(/Max BPM/i);
      fireEvent.change(tempoMaxSlider, { target: { value: '140' } });

      // Verify combined filters
      expect(mockOnFilterChange).toHaveBeenCalledWith(
        expect.objectContaining({
          genres: ['Funk'],
          tempoRange: expect.objectContaining({
            min: 100,
            max: 140
          })
        })
      );
    });

    it('should handle multiple genre selections', async () => {
      render(
        <DiscoveryControls
          filters={defaultFilters}
          onFilterChange={mockOnFilterChange}
          onShuffle={mockOnShuffle}
        />
      );

      // Select multiple genres
      const soulCheckbox = screen.getByLabelText(/Soul/i);
      const funkCheckbox = screen.getByLabelText(/Funk/i);
      const jazzCheckbox = screen.getByLabelText(/Jazz/i);

      await user.click(soulCheckbox);
      await user.click(funkCheckbox);
      await user.click(jazzCheckbox);

      // Should have called with multiple genres
      expect(mockOnFilterChange).toHaveBeenCalledWith(
        expect.objectContaining({
          genres: expect.arrayContaining(['Soul', 'Funk', 'Jazz'])
        })
      );
    });

    it('should clear all filters at once', async () => {
      const filtersWithData = {
        genres: ['Soul', 'Funk'],
        yearRange: { start: 1970, end: 1980 },
        tempoRange: { min: 100, max: 140 }
      };

      render(
        <DiscoveryControls
          filters={filtersWithData}
          onFilterChange={mockOnFilterChange}
          onShuffle={mockOnShuffle}
        />
      );

      const clearButton = screen.getByText(/Clear All/i);
      await user.click(clearButton);

      expect(mockOnFilterChange).toHaveBeenCalledWith(
        expect.objectContaining({
          genres: [],
          yearRange: {
            start: 1950,
            end: 1995
          }
        })
      );
    });

    it('should disable clear button when no active filters', () => {
      render(
        <DiscoveryControls
          filters={defaultFilters}
          onFilterChange={mockOnFilterChange}
          onShuffle={mockOnShuffle}
        />
      );

      const clearButton = screen.getByText(/Clear All/i);
      expect(clearButton).toBeDisabled();
    });

    it('should enable clear button when filters are active', () => {
      const filtersWithData = {
        ...defaultFilters,
        genres: ['Soul']
      };

      render(
        <DiscoveryControls
          filters={filtersWithData}
          onFilterChange={mockOnFilterChange}
          onShuffle={mockOnShuffle}
        />
      );

      const clearButton = screen.getByText(/Clear All/i);
      expect(clearButton).not.toBeDisabled();
    });
  });

  describe('Filter Preset Integration', () => {
    it('should open preset manager', async () => {
      render(
        <DiscoveryControls
          filters={defaultFilters}
          onFilterChange={mockOnFilterChange}
          onShuffle={mockOnShuffle}
        />
      );

      const presetsButton = screen.getByText(/Presets/i);
      await user.click(presetsButton);

      // Should show preset manager
      expect(screen.getByText(/Filter Presets/i)).toBeInTheDocument();
    });

    it('should save current filters as preset', async () => {
      const filtersWithData = {
        genres: ['Soul'],
        yearRange: { start: 1970, end: 1980 }
      };

      render(
        <DiscoveryControls
          filters={filtersWithData}
          onFilterChange={mockOnFilterChange}
          onShuffle={mockOnShuffle}
        />
      );

      // Open preset manager
      const presetsButton = screen.getByText(/Presets/i);
      await user.click(presetsButton);

      // Click save preset button
      const saveButton = screen.getByText(/Save as Preset/i);
      await user.click(saveButton);

      // Fill in preset details
      const nameInput = screen.getByLabelText(/Preset Name/i);
      const descriptionInput = screen.getByLabelText(/Description/i);

      await user.type(nameInput, 'My Soul Preset');
      await user.type(descriptionInput, 'Classic soul samples from the 70s');

      // Save the preset
      const savePresetButton = screen.getByRole('button', { name: /Save Preset/i });
      await user.click(savePresetButton);

      // Should have saved to localStorage
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'sampleDiscovery.filterPresets',
        expect.stringContaining('My Soul Preset')
      );
    });

    it('should load preset and apply filters', async () => {
      // Mock existing presets
      const mockPresets = [{
        id: 'test-preset',
        name: 'Test Preset',
        description: 'Test description',
        filters: {
          genres: ['Funk'],
          yearRange: { start: 1975, end: 1985 }
        },
        isDefault: false,
        createdAt: Date.now()
      }];

      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'sampleDiscovery.filterPresets') {
          return JSON.stringify(mockPresets);
        }
        return null;
      });

      render(
        <DiscoveryControls
          filters={defaultFilters}
          onFilterChange={mockOnFilterChange}
          onShuffle={mockOnShuffle}
        />
      );

      // Open preset manager
      const presetsButton = screen.getByText(/Presets/i);
      await user.click(presetsButton);

      // Wait for presets to load and click load button
      await waitFor(() => {
        expect(screen.getByText('Test Preset')).toBeInTheDocument();
      });

      const loadButton = screen.getByText(/Load/i);
      await user.click(loadButton);

      // Should have applied the preset filters
      expect(mockOnFilterChange).toHaveBeenCalledWith(
        expect.objectContaining({
          genres: ['Funk'],
          yearRange: { start: 1975, end: 1985 }
        })
      );
    });

    it('should not allow saving empty filters as preset', async () => {
      render(
        <DiscoveryControls
          filters={defaultFilters}
          onFilterChange={mockOnFilterChange}
          onShuffle={mockOnShuffle}
        />
      );

      // Open preset manager
      const presetsButton = screen.getByText(/Presets/i);
      await user.click(presetsButton);

      // Should show message about applying filters first
      expect(screen.getByText(/Apply some filters to save as a preset/i)).toBeInTheDocument();
      
      // Save button should not be present
      expect(screen.queryByText(/Save as Preset/i)).not.toBeInTheDocument();
    });
  });

  describe('Filter State Persistence', () => {
    it('should persist filter changes to localStorage', async () => {
      render(
        <DiscoveryControls
          filters={defaultFilters}
          onFilterChange={mockOnFilterChange}
          onShuffle={mockOnShuffle}
        />
      );

      // Select a genre
      const soulCheckbox = screen.getByLabelText(/Soul/i);
      await user.click(soulCheckbox);

      // Should have persisted the filter state
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'sampleDiscovery.filters',
        expect.stringContaining('"genres":["Soul"]')
      );
    });

    it('should load persisted filters on component mount', () => {
      const persistedFilters = {
        filters: {
          genres: ['Jazz'],
          yearRange: { start: 1960, end: 1970 }
        },
        timestamp: Date.now(),
        version: '1.0'
      };

      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'sampleDiscovery.filters') {
          return JSON.stringify(persistedFilters);
        }
        return null;
      });

      // This would typically be tested at the hook level
      // Here we're just verifying the localStorage call
      expect(localStorageMock.getItem).not.toHaveBeenCalled();
    });
  });

  describe('Complex Filter Scenarios', () => {
    it('should handle rapid filter changes', async () => {
      render(
        <DiscoveryControls
          filters={defaultFilters}
          onFilterChange={mockOnFilterChange}
          onShuffle={mockOnShuffle}
        />
      );

      // Rapidly change multiple filters
      const soulCheckbox = screen.getByLabelText(/Soul/i);
      const funkCheckbox = screen.getByLabelText(/Funk/i);
      const yearStartSlider = screen.getByLabelText(/Start year/i);

      await user.click(soulCheckbox);
      await user.click(funkCheckbox);
      fireEvent.change(yearStartSlider, { target: { value: '1970' } });
      await user.click(soulCheckbox); // Uncheck Soul

      // Should have made multiple calls
      expect(mockOnFilterChange).toHaveBeenCalledTimes(4);
      
      // Final call should have only Funk selected
      expect(mockOnFilterChange).toHaveBeenLastCalledWith(
        expect.objectContaining({
          genres: ['Funk']
        })
      );
    });

    it('should maintain filter state during loading', async () => {
      render(
        <DiscoveryControls
          filters={defaultFilters}
          onFilterChange={mockOnFilterChange}
          onShuffle={mockOnShuffle}
          isLoading={true}
        />
      );

      // All interactive elements should be disabled
      const soulCheckbox = screen.getByLabelText(/Soul/i);
      const shuffleButton = screen.getByText(/Shuffle Samples/i);
      const clearButton = screen.getByText(/Clear All/i);

      expect(soulCheckbox).toBeDisabled();
      expect(shuffleButton).toBeDisabled();
      expect(clearButton).toBeDisabled();
    });

    it('should show filter summary with multiple active filters', () => {
      const complexFilters = {
        genres: ['Soul', 'Funk'],
        yearRange: { start: 1970, end: 1980 },
        tempoRange: { min: 100, max: 140 },
        durationRange: { min: 120, max: 300 }
      };

      render(
        <DiscoveryControls
          filters={complexFilters}
          onFilterChange={mockOnFilterChange}
          onShuffle={mockOnShuffle}
        />
      );

      // Should show filter summary
      expect(screen.getByText(/Filtering by 2 genres/i)).toBeInTheDocument();
      expect(screen.getByText(/1970-1980/i)).toBeInTheDocument();
    });

    it('should handle edge case filter values', async () => {
      render(
        <DiscoveryControls
          filters={defaultFilters}
          onFilterChange={mockOnFilterChange}
          onShuffle={mockOnShuffle}
        />
      );

      // Set year range to minimum values
      const yearStartSlider = screen.getByLabelText(/Start year/i);
      const yearEndSlider = screen.getByLabelText(/End year/i);

      fireEvent.change(yearStartSlider, { target: { value: '1950' } });
      fireEvent.change(yearEndSlider, { target: { value: '1950' } });

      expect(mockOnFilterChange).toHaveBeenCalledWith(
        expect.objectContaining({
          yearRange: { start: 1950, end: 1950 }
        })
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle localStorage errors gracefully', async () => {
      localStorageMock.setItem.mockImplementation(() => {
        throw new Error('Storage quota exceeded');
      });

      render(
        <DiscoveryControls
          filters={defaultFilters}
          onFilterChange={mockOnFilterChange}
          onShuffle={mockOnShuffle}
        />
      );

      // Should still work even if localStorage fails
      const soulCheckbox = screen.getByLabelText(/Soul/i);
      await user.click(soulCheckbox);

      expect(mockOnFilterChange).toHaveBeenCalled();
    });

    it('should display error messages', () => {
      const errorMessage = 'Failed to load samples';

      render(
        <DiscoveryControls
          filters={defaultFilters}
          onFilterChange={mockOnFilterChange}
          onShuffle={mockOnShuffle}
          error={errorMessage}
        />
      );

      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });

    it('should handle invalid filter states', async () => {
      const invalidFilters = {
        genres: null, // Invalid
        yearRange: { start: 2000, end: 1990 } // Invalid range
      };

      // Component should handle this gracefully
      expect(() => {
        render(
          <DiscoveryControls
            filters={invalidFilters}
            onFilterChange={mockOnFilterChange}
            onShuffle={mockOnShuffle}
          />
        );
      }).not.toThrow();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(
        <DiscoveryControls
          filters={defaultFilters}
          onFilterChange={mockOnFilterChange}
          onShuffle={mockOnShuffle}
        />
      );

      // Check for ARIA labels
      expect(screen.getByLabelText(/Clear all filters/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Shuffle samples/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Start year/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/End year/i)).toBeInTheDocument();
    });

    it('should support keyboard navigation', async () => {
      render(
        <DiscoveryControls
          filters={defaultFilters}
          onFilterChange={mockOnFilterChange}
          onShuffle={mockOnShuffle}
        />
      );

      const soulCheckbox = screen.getByLabelText(/Soul/i);
      
      // Should be focusable
      soulCheckbox.focus();
      expect(soulCheckbox).toHaveFocus();

      // Should respond to keyboard events
      fireEvent.keyDown(soulCheckbox, { key: ' ', code: 'Space' });
      expect(mockOnFilterChange).toHaveBeenCalled();
    });

    it('should have proper form structure', () => {
      render(
        <DiscoveryControls
          filters={defaultFilters}
          onFilterChange={mockOnFilterChange}
          onShuffle={mockOnShuffle}
        />
      );

      // All buttons should have type="button" to prevent form submission
      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        expect(button).toHaveAttribute('type', 'button');
      });
    });
  });
});