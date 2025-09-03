/**
 * @fileoverview Integration tests for SampleGrid responsive behavior
 * Tests grid layout responsiveness, breakpoint behavior, and mobile interactions
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import SampleGrid from '../SampleGrid.jsx';

// Mock SampleCard component
vi.mock('../SampleCard.jsx', () => ({
  default: ({ sample }) => (
    <div data-testid={`sample-card-${sample.id}`} className="sample-card">
      {sample.title}
    </div>
  )
}));

// Mock CSS import
vi.mock('../SampleGrid.css', () => ({}));

describe('SampleGrid Responsive Behavior', () => {
  const mockSamples = Array.from({ length: 8 }, (_, i) => ({
    id: `sample-${i + 1}`,
    title: `Sample ${i + 1}`,
    artist: `Artist ${i + 1}`,
    year: 1970 + i,
    genre: 'Funk',
    duration: 180,
    youtubeId: `abc${i + 1}`,
    thumbnailUrl: `https://example.com/thumb${i + 1}.jpg`,
    isMock: false
  }));

  const defaultProps = {
    samples: mockSamples,
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

  // Mock window.matchMedia for responsive testing
  const mockMatchMedia = (matches) => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation(query => ({
        matches,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Grid Layout Structure', () => {
    it('renders grid container with proper structure', () => {
      render(<SampleGrid {...defaultProps} />);
      
      const grid = screen.getByRole('grid');
      expect(grid).toBeInTheDocument();
      expect(grid).toHaveClass('sample-grid__grid');
      
      const gridCells = screen.getAllByRole('gridcell');
      expect(gridCells).toHaveLength(8);
    });

    it('assigns correct grid cell positions', () => {
      render(<SampleGrid {...defaultProps} />);
      
      const gridCells = screen.getAllByRole('gridcell');
      
      // First row
      expect(gridCells[0]).toHaveAttribute('aria-rowindex', '1');
      expect(gridCells[0]).toHaveAttribute('aria-colindex', '1');
      
      expect(gridCells[1]).toHaveAttribute('aria-rowindex', '1');
      expect(gridCells[1]).toHaveAttribute('aria-colindex', '2');
      
      expect(gridCells[2]).toHaveAttribute('aria-rowindex', '1');
      expect(gridCells[2]).toHaveAttribute('aria-colindex', '3');
      
      expect(gridCells[3]).toHaveAttribute('aria-rowindex', '1');
      expect(gridCells[3]).toHaveAttribute('aria-colindex', '4');
      
      // Second row
      expect(gridCells[4]).toHaveAttribute('aria-rowindex', '2');
      expect(gridCells[4]).toHaveAttribute('aria-colindex', '1');
    });

    it('maintains grid structure with different sample counts', () => {
      const fewSamples = mockSamples.slice(0, 3);
      render(<SampleGrid {...defaultProps} samples={fewSamples} />);
      
      const grid = screen.getByRole('grid');
      expect(grid).toBeInTheDocument();
      
      const gridCells = screen.getAllByRole('gridcell');
      expect(gridCells).toHaveLength(3);
    });
  });

  describe('Mobile Responsiveness', () => {
    it('handles touch interactions properly', () => {
      const onSamplePlay = vi.fn();
      render(
        <SampleGrid 
          {...defaultProps} 
          onSamplePlay={onSamplePlay}
        />
      );
      
      const firstCard = screen.getByTestId('sample-card-sample-1');
      
      // Simulate touch events
      fireEvent.touchStart(firstCard);
      fireEvent.touchEnd(firstCard);
      
      // Should not interfere with normal interactions
      expect(firstCard).toBeInTheDocument();
    });

    it('maintains accessibility on mobile', () => {
      mockMatchMedia(true); // Simulate mobile viewport
      
      render(<SampleGrid {...defaultProps} />);
      
      const grid = screen.getByRole('grid');
      expect(grid).toHaveAttribute('aria-label', 'Grid of 8 samples');
      
      // Grid cells should still have proper ARIA attributes
      const gridCells = screen.getAllByRole('gridcell');
      expect(gridCells[0]).toHaveAttribute('aria-rowindex', '1');
      expect(gridCells[0]).toHaveAttribute('aria-colindex', '1');
    });
  });

  describe('Loading State Responsiveness', () => {
    it('renders responsive loading skeletons', () => {
      render(<SampleGrid {...defaultProps} isLoading={true} />);
      
      const loadingContainer = screen.getByRole('status', { name: /loading samples/i });
      expect(loadingContainer).toBeInTheDocument();
      
      const skeletons = screen.getAllByRole('status', { name: /loading sample/i });
      expect(skeletons.length).toBeGreaterThanOrEqual(12);
      
      // Each skeleton should be in the grid
      const grid = loadingContainer.querySelector('.sample-grid__grid');
      expect(grid).toBeInTheDocument();
    });

    it('maintains grid structure during loading', () => {
      render(<SampleGrid {...defaultProps} isLoading={true} />);
      
      const grid = screen.getByRole('status', { name: /loading samples/i })
        .querySelector('.sample-grid__grid');
      
      expect(grid).toHaveClass('sample-grid__grid');
    });
  });

  describe('Empty State Responsiveness', () => {
    it('centers empty state content properly', () => {
      render(<SampleGrid {...defaultProps} samples={[]} />);
      
      const emptyState = screen.getByRole('status');
      expect(emptyState).toHaveClass('sample-grid__empty-state');
      
      expect(screen.getByText('Ready to Discover')).toBeInTheDocument();
    });

    it('stacks action buttons responsively', () => {
      render(<SampleGrid {...defaultProps} samples={[]} hasFilters={true} />);
      
      const clearButton = screen.getByText('Clear Filters');
      const shuffleButton = screen.getByText('Shuffle with Filters');
      
      expect(clearButton).toBeInTheDocument();
      expect(shuffleButton).toBeInTheDocument();
      
      // Both buttons should be in the actions container
      const actionsContainer = clearButton.closest('.sample-grid__empty-actions');
      expect(actionsContainer).toContain(shuffleButton);
    });
  });

  describe('Error State Responsiveness', () => {
    it('displays error state with responsive layout', () => {
      render(<SampleGrid {...defaultProps} error="Network error" />);
      
      const errorState = screen.getByRole('alert');
      expect(errorState).toHaveClass('sample-grid__error-state');
      
      expect(screen.getByText('Unable to Load Samples')).toBeInTheDocument();
    });

    it('handles long error messages responsively', () => {
      const longError = 'This is a very long error message that should wrap properly on smaller screens and not break the layout or cause horizontal scrolling issues';
      
      render(<SampleGrid {...defaultProps} error={longError} />);
      
      const details = screen.getByText('Technical Details');
      fireEvent.click(details);
      
      expect(screen.getByText(longError)).toBeInTheDocument();
    });
  });

  describe('Performance with Large Datasets', () => {
    it('handles large number of samples efficiently', () => {
      const manySamples = Array.from({ length: 100 }, (_, i) => ({
        ...mockSamples[0],
        id: `sample-${i + 1}`,
        title: `Sample ${i + 1}`
      }));
      
      const startTime = performance.now();
      render(<SampleGrid {...defaultProps} samples={manySamples} />);
      const endTime = performance.now();
      
      // Should render within reasonable time (less than 500ms for 100 components)
      expect(endTime - startTime).toBeLessThan(500);
      
      expect(screen.getByText('100 Samples Found')).toBeInTheDocument();
    });

    it('maintains performance during state updates', () => {
      const { rerender } = render(<SampleGrid {...defaultProps} />);
      
      const startTime = performance.now();
      rerender(<SampleGrid {...defaultProps} samples={mockSamples} />);
      const endTime = performance.now();
      
      // Re-render should be fast
      expect(endTime - startTime).toBeLessThan(50);
    });
  });

  describe('Keyboard Navigation', () => {
    it('supports keyboard navigation through grid', () => {
      render(<SampleGrid {...defaultProps} />);
      
      const grid = screen.getByRole('grid');
      
      // Grid should be present and accessible
      expect(grid).toBeInTheDocument();
      expect(grid).toHaveAttribute('role', 'grid');
    });

    it('handles keyboard events on action buttons', () => {
      const onShuffle = vi.fn();
      render(
        <SampleGrid 
          {...defaultProps} 
          samples={[]}
          onShuffle={onShuffle}
        />
      );
      
      const shuffleButton = screen.getByText('Shuffle Samples');
      
      // Test Enter key
      fireEvent.keyDown(shuffleButton, { key: 'Enter', code: 'Enter' });
      fireEvent.keyUp(shuffleButton, { key: 'Enter', code: 'Enter' });
      
      // Test Space key
      fireEvent.keyDown(shuffleButton, { key: ' ', code: 'Space' });
      fireEvent.keyUp(shuffleButton, { key: ' ', code: 'Space' });
      
      // Should work with mouse click
      fireEvent.click(shuffleButton);
      expect(onShuffle).toHaveBeenCalled();
    });
  });

  describe('Animation and Transitions', () => {
    it('respects reduced motion preferences', () => {
      // Mock prefers-reduced-motion
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn().mockImplementation(query => ({
          matches: query === '(prefers-reduced-motion: reduce)',
          media: query,
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        })),
      });
      
      render(<SampleGrid {...defaultProps} isLoading={true} />);
      
      // Should still render loading state
      expect(screen.getByText('Discovering samples...')).toBeInTheDocument();
    });
  });

  describe('Content Overflow Handling', () => {
    it('handles long sample titles gracefully', () => {
      const longTitleSamples = [{
        ...mockSamples[0],
        title: 'This is an extremely long sample title that might cause layout issues if not handled properly',
        artist: 'Artist with a very long name that could also cause problems'
      }];
      
      render(<SampleGrid {...defaultProps} samples={longTitleSamples} />);
      
      expect(screen.getByTestId('sample-card-sample-1')).toBeInTheDocument();
    });

    it('maintains grid integrity with varying content sizes', () => {
      const varyingSamples = [
        { ...mockSamples[0], title: 'Short' },
        { ...mockSamples[1], title: 'Medium Length Title' },
        { ...mockSamples[2], title: 'Very Long Title That Goes On And On' }
      ];
      
      render(<SampleGrid {...defaultProps} samples={varyingSamples} />);
      
      const grid = screen.getByRole('grid');
      expect(grid).toBeInTheDocument();
      
      const gridCells = screen.getAllByRole('gridcell');
      expect(gridCells).toHaveLength(3);
    });
  });
});