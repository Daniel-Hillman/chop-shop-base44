import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import SamplerSequencerGrid from '../SamplerSequencerGrid';

describe('SamplerSequencerGrid', () => {
  const mockChops = [
    { padId: 'A0', color: '#ef4444', startTime: 10, endTime: 12 },
    { padId: 'A1', color: '#f97316', startTime: 15, endTime: 17 },
    { padId: 'A2', color: '#f59e0b', startTime: 20, endTime: 22 }
  ];

  const mockPattern = {
    tracks: Array.from({ length: 16 }, (_, trackIndex) => ({
      steps: Array.from({ length: 16 }, (_, stepIndex) => 
        trackIndex < 3 && stepIndex % 4 === 0 // Some test pattern
      )
    }))
  };

  const defaultProps = {
    pattern: mockPattern,
    chops: mockChops,
    currentStep: 0,
    isPlaying: false,
    onStepToggle: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders 16x16 grid layout', () => {
      render(<SamplerSequencerGrid {...defaultProps} />);
      
      // Check header
      expect(screen.getByText('Sequencer Grid')).toBeInTheDocument();
      expect(screen.getByText('16 Tracks × 16 Steps')).toBeInTheDocument();
      
      // Check step numbers (1-16) in header
      const stepHeaders = screen.getAllByText(/^(1|2|3|4|5|6|7|8|9|10|11|12|13|14|15|16)$/);
      expect(stepHeaders.length).toBeGreaterThanOrEqual(16); // At least 16 numbers (step headers + track numbers)
      
      // Check that all 16 track indicators exist
      const trackIndicators = screen.getAllByTitle(/Track \d+:/);
      expect(trackIndicators).toHaveLength(16);
    });

    it('displays track assignment visual indicators', () => {
      render(<SamplerSequencerGrid {...defaultProps} />);
      
      // First 3 tracks should have chops assigned (cyan styling)
      const track1 = screen.getByTitle(/Track 1.*A0/);
      const track2 = screen.getByTitle(/Track 2.*A1/);
      const track3 = screen.getByTitle(/Track 3.*A2/);
      
      expect(track1).toHaveClass('border-cyan-400/60');
      expect(track2).toHaveClass('border-cyan-400/60');
      expect(track3).toHaveClass('border-cyan-400/60');
      
      // Track 4 should be empty
      const track4 = screen.getByTitle(/Track 4.*Empty/);
      expect(track4).toHaveClass('border-white/20');
    });

    it('shows current step highlighting during playback', () => {
      render(
        <SamplerSequencerGrid 
          {...defaultProps} 
          isPlaying={true} 
          currentStep={4} 
        />
      );
      
      expect(screen.getByText('Playing • Step 5')).toBeInTheDocument();
      
      // Check current step indicator
      const stepIndicators = document.querySelectorAll('.bg-cyan-400');
      expect(stepIndicators.length).toBeGreaterThan(0);
    });

    it('displays chop count in footer', () => {
      render(<SamplerSequencerGrid {...defaultProps} />);
      
      expect(screen.getByText('3 of 16 tracks assigned')).toBeInTheDocument();
    });
  });

  describe('Step Toggle Functionality', () => {
    it('calls onStepToggle when step is clicked', async () => {
      const onStepToggle = vi.fn();
      render(
        <SamplerSequencerGrid 
          {...defaultProps} 
          onStepToggle={onStepToggle} 
        />
      );
      
      // Find and click a step button
      const stepButton = screen.getByTitle('Track 1, Step 1 - Active (Has chop)');
      fireEvent.click(stepButton);
      
      expect(onStepToggle).toHaveBeenCalledWith(0, 0);
    });

    it('handles step toggle for tracks without chops', async () => {
      const onStepToggle = vi.fn();
      render(
        <SamplerSequencerGrid 
          {...defaultProps} 
          onStepToggle={onStepToggle} 
        />
      );
      
      // Click on an empty track step
      const emptyTrackStep = screen.getByTitle('Track 5, Step 1 - Inactive (No chop)');
      fireEvent.click(emptyTrackStep);
      
      expect(onStepToggle).toHaveBeenCalledWith(4, 0);
    });

    it('provides immediate visual feedback on step interaction', async () => {
      render(<SamplerSequencerGrid {...defaultProps} />);
      
      const stepButton = screen.getByTitle('Track 1, Step 1 - Active (Has chop)');
      
      // Test hover effect
      fireEvent.mouseEnter(stepButton);
      await waitFor(() => {
        expect(stepButton).toHaveClass('brightness-125');
      });
      
      fireEvent.mouseLeave(stepButton);
      await waitFor(() => {
        expect(stepButton).not.toHaveClass('brightness-125');
      });
    });
  });

  describe('Performance Optimizations', () => {
    it('renders efficiently with memoization', () => {
      const { rerender } = render(<SamplerSequencerGrid {...defaultProps} />);
      
      // Re-render with same props should not cause unnecessary updates
      rerender(<SamplerSequencerGrid {...defaultProps} />);
      
      // Component should still be rendered correctly
      expect(screen.getByText('Sequencer Grid')).toBeInTheDocument();
    });

    it('handles large pattern data efficiently', () => {
      const largePattern = {
        tracks: Array.from({ length: 16 }, () => ({
          steps: Array.from({ length: 16 }, () => Math.random() > 0.5)
        }))
      };
      
      const startTime = performance.now();
      render(
        <SamplerSequencerGrid 
          {...defaultProps} 
          pattern={largePattern} 
        />
      );
      const endTime = performance.now();
      
      // Should render quickly (under 500ms for this test environment)
      expect(endTime - startTime).toBeLessThan(500);
    });
  });

  describe('Current Step Highlighting', () => {
    it('highlights current step during playback', () => {
      render(
        <SamplerSequencerGrid 
          {...defaultProps} 
          isPlaying={true} 
          currentStep={8} 
        />
      );
      
      // Check that step 9 (index 8) is highlighted
      const stepIndicators = document.querySelectorAll('.bg-cyan-400');
      expect(stepIndicators.length).toBeGreaterThan(0);
    });

    it('does not highlight when not playing', () => {
      render(
        <SamplerSequencerGrid 
          {...defaultProps} 
          isPlaying={false} 
          currentStep={8} 
        />
      );
      
      expect(screen.queryByText(/Playing/)).not.toBeInTheDocument();
    });

    it('updates current step highlighting dynamically', () => {
      const { rerender } = render(
        <SamplerSequencerGrid 
          {...defaultProps} 
          isPlaying={true} 
          currentStep={0} 
        />
      );
      
      expect(screen.getByText('Playing • Step 1')).toBeInTheDocument();
      
      rerender(
        <SamplerSequencerGrid 
          {...defaultProps} 
          isPlaying={true} 
          currentStep={5} 
        />
      );
      
      expect(screen.getByText('Playing • Step 6')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('handles empty chops array', () => {
      render(
        <SamplerSequencerGrid 
          {...defaultProps} 
          chops={[]} 
        />
      );
      
      expect(screen.getByText('0 of 16 tracks assigned')).toBeInTheDocument();
      
      // All tracks should show as empty
      for (let i = 1; i <= 16; i++) {
        expect(screen.getByTitle(`Track ${i}: Empty`)).toBeInTheDocument();
      }
    });

    it('handles null pattern gracefully', () => {
      render(
        <SamplerSequencerGrid 
          {...defaultProps} 
          pattern={null} 
        />
      );
      
      // Should still render the grid structure
      expect(screen.getByText('Sequencer Grid')).toBeInTheDocument();
    });

    it('handles missing onStepToggle callback', () => {
      render(
        <SamplerSequencerGrid 
          {...defaultProps} 
          onStepToggle={undefined} 
        />
      );
      
      const stepButton = screen.getByTitle('Track 1, Step 1 - Active (Has chop)');
      
      // Should not throw error when clicked
      expect(() => {
        fireEvent.click(stepButton);
      }).not.toThrow();
    });
  });

  describe('Accessibility', () => {
    it('provides proper titles for step buttons', () => {
      render(<SamplerSequencerGrid {...defaultProps} />);
      
      // Check that step buttons have descriptive titles
      expect(screen.getByTitle('Track 1, Step 1 - Active (Has chop)')).toBeInTheDocument();
      expect(screen.getByTitle('Track 5, Step 1 - Inactive (No chop)')).toBeInTheDocument();
    });

    it('supports keyboard navigation', () => {
      render(<SamplerSequencerGrid {...defaultProps} />);
      
      const stepButton = screen.getByTitle('Track 1, Step 1 - Active (Has chop)');
      
      // Should be focusable
      stepButton.focus();
      expect(document.activeElement).toBe(stepButton);
    });
  });
});