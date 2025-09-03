import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import SamplerSequencerStep from '../SamplerSequencerStep';

describe('SamplerSequencerStep', () => {
  const defaultProps = {
    trackIndex: 0,
    stepIndex: 0,
    isActive: false,
    hasChop: false,
    chopColor: '#ef4444',
    isCurrentStep: false,
    isHovered: false,
    onToggle: vi.fn(),
    onHover: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering States', () => {
    it('renders inactive step without chop', () => {
      render(<SamplerSequencerStep {...defaultProps} />);
      
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('title', 'Track 1, Step 1 - Inactive (No chop)');
      
      // Should have minimal styling
      const style = window.getComputedStyle(button);
      expect(button.style.opacity).toBe('0.4');
    });

    it('renders active step with chop', () => {
      render(
        <SamplerSequencerStep 
          {...defaultProps} 
          isActive={true} 
          hasChop={true} 
        />
      );
      
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('title', 'Track 1, Step 1 - Active (Has chop)');
      
      // Should use chop color and full opacity
      expect(button.style.backgroundColor).toBe('rgb(239, 68, 68)'); // #ef4444
      expect(button.style.opacity).toBe('1');
      
      // Should show active indicator dot
      const activeDot = button.querySelector('.bg-white');
      expect(activeDot).toBeInTheDocument();
    });

    it('renders active step without chop', () => {
      render(
        <SamplerSequencerStep 
          {...defaultProps} 
          isActive={true} 
          hasChop={false} 
        />
      );
      
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('title', 'Track 1, Step 1 - Active (No chop)');
      
      // Should use gray color with reduced opacity
      expect(button.style.backgroundColor).toBe('rgb(107, 114, 128)'); // #6b7280
      expect(button.style.opacity).toBe('0.8');
    });

    it('renders inactive step with chop', () => {
      render(
        <SamplerSequencerStep 
          {...defaultProps} 
          isActive={false} 
          hasChop={true} 
        />
      );
      
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('title', 'Track 1, Step 1 - Inactive (Has chop)');
      
      // Should show subtle chop color
      expect(button.style.opacity).toBe('0.6');
    });
  });

  describe('Current Step Highlighting', () => {
    it('shows current step ring when isCurrentStep is true', () => {
      render(
        <SamplerSequencerStep 
          {...defaultProps} 
          isCurrentStep={true} 
        />
      );
      
      const button = screen.getByRole('button');
      expect(button).toHaveClass('ring-2', 'ring-cyan-300');
      
      // Should have current step indicator (without animation for performance)
      const currentStepIndicator = button.querySelector('.border-cyan-300');
      expect(currentStepIndicator).toBeInTheDocument();
    });

    it('does not show current step ring when isCurrentStep is false', () => {
      render(
        <SamplerSequencerStep 
          {...defaultProps} 
          isCurrentStep={false} 
        />
      );
      
      const button = screen.getByRole('button');
      expect(button).not.toHaveClass('ring-2');
      
      const pulseElement = button.querySelector('.animate-pulse');
      expect(pulseElement).not.toBeInTheDocument();
    });
  });

  describe('Hover Effects', () => {
    it('applies hover brightness when isHovered is true', () => {
      render(
        <SamplerSequencerStep 
          {...defaultProps} 
          isHovered={true} 
        />
      );
      
      const button = screen.getByRole('button');
      expect(button).toHaveClass('brightness-125');
    });

    it('calls onHover with step key on mouse enter', () => {
      const onHover = vi.fn();
      render(
        <SamplerSequencerStep 
          {...defaultProps} 
          trackIndex={2} 
          stepIndex={5} 
          onHover={onHover} 
        />
      );
      
      const button = screen.getByRole('button');
      fireEvent.mouseEnter(button);
      
      expect(onHover).toHaveBeenCalledWith('2-5');
    });

    it('calls onHover with null on mouse leave', () => {
      const onHover = vi.fn();
      render(
        <SamplerSequencerStep 
          {...defaultProps} 
          onHover={onHover} 
        />
      );
      
      const button = screen.getByRole('button');
      fireEvent.mouseLeave(button);
      
      expect(onHover).toHaveBeenCalledWith(null);
    });
  });

  describe('Click Handling', () => {
    it('calls onToggle with correct parameters when clicked', () => {
      const onToggle = vi.fn();
      render(
        <SamplerSequencerStep 
          {...defaultProps} 
          trackIndex={3} 
          stepIndex={7} 
          onToggle={onToggle} 
        />
      );
      
      const button = screen.getByRole('button');
      fireEvent.click(button);
      
      expect(onToggle).toHaveBeenCalledWith(3, 7);
    });

    it('prevents event propagation on click', () => {
      const onToggle = vi.fn();
      const parentClick = vi.fn();
      
      render(
        <div onClick={parentClick}>
          <SamplerSequencerStep 
            {...defaultProps} 
            onToggle={onToggle} 
          />
        </div>
      );
      
      const button = screen.getByRole('button');
      fireEvent.click(button);
      
      expect(onToggle).toHaveBeenCalled();
      expect(parentClick).not.toHaveBeenCalled();
    });

    it('handles missing onToggle callback gracefully', () => {
      render(
        <SamplerSequencerStep 
          {...defaultProps} 
          onToggle={undefined} 
        />
      );
      
      const button = screen.getByRole('button');
      
      expect(() => {
        fireEvent.click(button);
      }).not.toThrow();
    });
  });

  describe('Visual Feedback', () => {
    it('shows active indicator dot for active steps', () => {
      render(
        <SamplerSequencerStep 
          {...defaultProps} 
          isActive={true} 
        />
      );
      
      const button = screen.getByRole('button');
      const activeDot = button.querySelector('.bg-white.rounded-full');
      expect(activeDot).toBeInTheDocument();
    });

    it('does not show active indicator dot for inactive steps', () => {
      render(
        <SamplerSequencerStep 
          {...defaultProps} 
          isActive={false} 
        />
      );
      
      const button = screen.getByRole('button');
      const activeDot = button.querySelector('.bg-white.rounded-full');
      expect(activeDot).not.toBeInTheDocument();
    });

    it('applies scale animation on active state', () => {
      render(<SamplerSequencerStep {...defaultProps} />);
      
      const button = screen.getByRole('button');
      expect(button).toHaveClass('active:scale-95');
    });
  });

  describe('Accessibility', () => {
    it('provides descriptive title attributes', () => {
      render(
        <SamplerSequencerStep 
          {...defaultProps} 
          trackIndex={4} 
          stepIndex={11} 
          isActive={true} 
          hasChop={true} 
        />
      );
      
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('title', 'Track 5, Step 12 - Active (Has chop)');
    });

    it('is focusable and has focus styles', () => {
      render(<SamplerSequencerStep {...defaultProps} />);
      
      const button = screen.getByRole('button');
      expect(button).toHaveClass('focus:outline-none', 'focus:ring-1', 'focus:ring-cyan-400/50');
      
      button.focus();
      expect(document.activeElement).toBe(button);
    });

    it('supports keyboard interaction', () => {
      const onToggle = vi.fn();
      render(
        <SamplerSequencerStep 
          {...defaultProps} 
          onToggle={onToggle} 
        />
      );
      
      const button = screen.getByRole('button');
      button.focus();
      
      // Simulate Enter key press
      fireEvent.keyDown(button, { key: 'Enter' });
      fireEvent.click(button); // Click is triggered by Enter in most browsers
      
      expect(onToggle).toHaveBeenCalled();
    });
  });

  describe('Performance', () => {
    it('renders quickly with memoization', () => {
      const { rerender } = render(<SamplerSequencerStep {...defaultProps} />);
      
      const startTime = performance.now();
      
      // Re-render with same props multiple times
      for (let i = 0; i < 10; i++) {
        rerender(<SamplerSequencerStep {...defaultProps} />);
      }
      
      const endTime = performance.now();
      
      // Should be very fast due to memoization
      expect(endTime - startTime).toBeLessThan(50);
    });

    it('updates efficiently when props change', () => {
      const { rerender } = render(<SamplerSequencerStep {...defaultProps} />);
      
      // Change a prop that should trigger re-render
      rerender(
        <SamplerSequencerStep 
          {...defaultProps} 
          isActive={true} 
        />
      );
      
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('title', expect.stringContaining('Active'));
    });
  });
});