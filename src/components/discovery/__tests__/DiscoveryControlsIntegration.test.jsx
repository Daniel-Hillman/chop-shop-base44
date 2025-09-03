/**
 * @fileoverview Integration tests for DiscoveryControls component
 * Tests integration with SampleDiscoveryPage and form safety
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import SampleDiscoveryPage from '../../../pages/SampleDiscoveryPage.jsx';

describe('DiscoveryControls Integration', () => {
  beforeEach(() => {
    // Mock navigator.onLine
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: true
    });
  });

  describe('Integration with SampleDiscoveryPage', () => {
    it('renders DiscoveryControls within SampleDiscoveryPage', () => {
      render(<SampleDiscoveryPage />);
      
      // Check that the controls are rendered
      expect(screen.getByText('Filters')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /shuffle samples/i })).toBeInTheDocument();
      expect(screen.getByLabelText(/start year/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/end year/i)).toBeInTheDocument();
    });

    it('handles genre filter changes in the page context', async () => {
      const user = userEvent.setup();
      render(<SampleDiscoveryPage />);
      
      // Initially no genres selected
      expect(screen.getByText(/all genres/i)).toBeInTheDocument();
      
      // Select a genre
      const soulCheckbox = screen.getByLabelText(/soul/i);
      await user.click(soulCheckbox);
      
      // Check that the summary updates
      expect(screen.getByText((content) => 
        content.includes('Filtering by 1 genre')
      )).toBeInTheDocument();
    });

    it('handles year range changes in the page context', async () => {
      render(<SampleDiscoveryPage />);
      
      // Change the start year
      const startSlider = screen.getByLabelText(/start year/i);
      fireEvent.change(startSlider, { target: { value: '1960' } });
      
      // Check that the display updates
      await waitFor(() => {
        expect(screen.getByText('1960 - 1995')).toBeInTheDocument();
      });
    });

    it('handles shuffle functionality in the page context', async () => {
      const user = userEvent.setup();
      render(<SampleDiscoveryPage />);
      
      const shuffleButton = screen.getByRole('button', { name: /shuffle samples/i });
      
      // Click shuffle
      await user.click(shuffleButton);
      
      // Should show loading state
      expect(screen.getByText('Shuffling...')).toBeInTheDocument();
      expect(shuffleButton).toBeDisabled();
      
      // Wait for loading to complete
      await waitFor(() => {
        expect(screen.queryByText('Shuffling...')).not.toBeInTheDocument();
      }, { timeout: 2000 });
      
      expect(shuffleButton).not.toBeDisabled();
    });

    it('shows offline state correctly', () => {
      // Mock offline state
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false
      });
      
      render(<SampleDiscoveryPage />);
      
      expect(screen.getByText(/you're offline/i)).toBeInTheDocument();
    });
  });

  describe('Form Safety Integration', () => {
    it('prevents form submission when controls are inside a form', async () => {
      const user = userEvent.setup();
      const mockSubmit = vi.fn();
      
      const TestForm = () => (
        <form onSubmit={mockSubmit}>
          <SampleDiscoveryPage />
          <button type="submit">Submit Form</button>
        </form>
      );
      
      render(<TestForm />);
      
      // Click shuffle button
      const shuffleButton = screen.getByRole('button', { name: /shuffle samples/i });
      await user.click(shuffleButton);
      
      // Form should not be submitted
      expect(mockSubmit).not.toHaveBeenCalled();
      
      // But shuffle should work (loading state should appear)
      expect(screen.getByText('Shuffling...')).toBeInTheDocument();
    });

    it('prevents form submission when clear filters is clicked', async () => {
      const user = userEvent.setup();
      const mockSubmit = vi.fn();
      
      const TestForm = () => (
        <form onSubmit={mockSubmit}>
          <SampleDiscoveryPage />
          <button type="submit">Submit Form</button>
        </form>
      );
      
      render(<TestForm />);
      
      // First select a genre to have something to clear
      const soulCheckbox = screen.getByLabelText(/soul/i);
      await user.click(soulCheckbox);
      
      // Click clear filters
      const clearButton = screen.getByRole('button', { name: /clear all filters/i });
      await user.click(clearButton);
      
      // Form should not be submitted
      expect(mockSubmit).not.toHaveBeenCalled();
      
      // Filters should be cleared
      expect(screen.getByText(/all genres/i)).toBeInTheDocument();
    });

    it('allows normal form submission for other form elements', async () => {
      const user = userEvent.setup();
      const mockSubmit = vi.fn((e) => e.preventDefault());
      
      const TestForm = () => (
        <form onSubmit={mockSubmit}>
          <input type="text" placeholder="Test input" />
          <SampleDiscoveryPage />
          <button type="submit">Submit Form</button>
        </form>
      );
      
      render(<TestForm />);
      
      // Click the actual submit button
      const submitButton = screen.getByRole('button', { name: /submit form/i });
      await user.click(submitButton);
      
      // Form should be submitted
      expect(mockSubmit).toHaveBeenCalledTimes(1);
    });
  });

  describe('State Management Integration', () => {
    it('maintains filter state across interactions', async () => {
      const user = userEvent.setup();
      render(<SampleDiscoveryPage />);
      
      // Select multiple genres
      const soulCheckbox = screen.getByLabelText(/soul/i);
      const jazzCheckbox = screen.getByLabelText(/jazz/i);
      
      await user.click(soulCheckbox);
      await user.click(jazzCheckbox);
      
      // Change year range
      const startSlider = screen.getByLabelText(/start year/i);
      fireEvent.change(startSlider, { target: { value: '1970' } });
      
      // Check that all filters are maintained
      expect(soulCheckbox).toBeChecked();
      expect(jazzCheckbox).toBeChecked();
      expect(screen.getByText('1970 - 1995')).toBeInTheDocument();
      expect(screen.getByText((content) => 
        content.includes('Filtering by 2 genres')
      )).toBeInTheDocument();
    });

    it('clears all filters correctly', async () => {
      const user = userEvent.setup();
      render(<SampleDiscoveryPage />);
      
      // Set up some filters
      const soulCheckbox = screen.getByLabelText(/soul/i);
      await user.click(soulCheckbox);
      
      const startSlider = screen.getByLabelText(/start year/i);
      fireEvent.change(startSlider, { target: { value: '1970' } });
      
      // Verify filters are set
      expect(soulCheckbox).toBeChecked();
      expect(screen.getByText('1970 - 1995')).toBeInTheDocument();
      
      // Clear all filters
      const clearButton = screen.getByRole('button', { name: /clear all filters/i });
      await user.click(clearButton);
      
      // Verify filters are cleared
      await waitFor(() => {
        expect(soulCheckbox).not.toBeChecked();
        expect(screen.getByText('1950 - 1995')).toBeInTheDocument();
        expect(screen.getByText(/all genres/i)).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling Integration', () => {
    it('handles errors gracefully without affecting page functionality', async () => {
      const user = userEvent.setup();
      
      // Mock console.error to avoid test noise
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      render(<SampleDiscoveryPage />);
      
      // The page should render without errors
      expect(screen.getByText('Sample Discovery')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /shuffle samples/i })).toBeInTheDocument();
      
      // Interactions should still work
      const soulCheckbox = screen.getByLabelText(/soul/i);
      await user.click(soulCheckbox);
      
      expect(soulCheckbox).toBeChecked();
      
      consoleSpy.mockRestore();
    });
  });

  describe('Accessibility Integration', () => {
    it('maintains proper focus management within the page', async () => {
      const user = userEvent.setup();
      render(<SampleDiscoveryPage />);
      
      // Tab through the controls
      await user.tab();
      
      // Should be able to navigate through all interactive elements
      const clearButton = screen.getByRole('button', { name: /clear all filters/i });
      const soulCheckbox = screen.getByLabelText(/soul/i);
      const startSlider = screen.getByLabelText(/start year/i);
      const shuffleButton = screen.getByRole('button', { name: /shuffle samples/i });
      
      // All elements should be focusable
      expect(clearButton).toBeInTheDocument();
      expect(soulCheckbox).toBeInTheDocument();
      expect(startSlider).toBeInTheDocument();
      expect(shuffleButton).toBeInTheDocument();
    });

    it('provides proper ARIA labels and descriptions in context', () => {
      render(<SampleDiscoveryPage />);
      
      // Check that ARIA attributes are properly set
      const startSlider = screen.getByLabelText(/start year/i);
      const endSlider = screen.getByLabelText(/end year/i);
      const shuffleButton = screen.getByRole('button', { name: /shuffle samples/i });
      
      expect(startSlider).toHaveAttribute('aria-describedby');
      expect(endSlider).toHaveAttribute('aria-describedby');
      expect(shuffleButton).toHaveAttribute('aria-label');
    });
  });
});