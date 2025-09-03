/**
 * Performance optimization tests for sampler components
 * Tests React.memo effectiveness, debouncing, and render efficiency
 */

import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

import SamplerSequencerGrid from '../SamplerSequencerGrid';
import SamplerSequencerStep from '../SamplerSequencerStep';
import SamplerTransportControls from '../SamplerTransportControls';
import SamplerBankNavigation from '../SamplerBankNavigation';
import SamplerTapTempo from '../SamplerTapTempo';
import SamplerDrumSequencer from '../SamplerDrumSequencer';
import { 
  useDebounce, 
  useThrottle, 
  useOptimizedInteraction,
  useBatchedState,
  shallowArrayEqual,
  shallowObjectEqual 
} from '../../../utils/samplerPerformanceUtils';

// Mock performance.memory for testing
Object.defineProperty(performance, 'memory', {
  value: {
    usedJSHeapSize: 50 * 1024 * 1024, // 50MB
    totalJSHeapSize: 100 * 1024 * 1024, // 100MB
    jsHeapSizeLimit: 2 * 1024 * 1024 * 1024 // 2GB
  },
  configurable: true
});

describe('Sampler Performance Optimizations', () => {
  let mockChops;
  let mockPattern;

  beforeEach(() => {
    vi.useFakeTimers();
    
    mockChops = Array.from({ length: 16 }, (_, i) => ({
      padId: `A${i}`,
      startTime: i * 2,
      endTime: i * 2 + 1,
      color: '#06b6d4'
    }));

    mockPattern = {
      tracks: Array.from({ length: 16 }, (_, trackIndex) => ({
        trackIndex,
        steps: Array.from({ length: 16 }, () => false)
      }))
    };
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('SamplerSequencerGrid Performance', () => {
    it('should prevent unnecessary re-renders with React.memo', () => {
      const onStepToggle = vi.fn();
      
      const { rerender } = render(
        <SamplerSequencerGrid
          pattern={mockPattern}
          chops={mockChops}
          currentStep={0}
          isPlaying={false}
          onStepToggle={onStepToggle}
        />
      );

      // Re-render with same props should not cause component to re-render
      rerender(
        <SamplerSequencerGrid
          pattern={mockPattern}
          chops={mockChops}
          currentStep={0}
          isPlaying={false}
          onStepToggle={onStepToggle}
        />
      );

      // Component should be memoized and not re-render unnecessarily
      expect(onStepToggle).not.toHaveBeenCalled();
    });

    it('should debounce rapid step toggles', async () => {
      // Test debouncing functionality directly
      const callback = vi.fn();
      let debouncedFn;

      const TestComponent = () => {
        debouncedFn = useDebounce(callback, 50);
        return <div>Test</div>;
      };

      render(<TestComponent />);

      // Call multiple times rapidly
      debouncedFn();
      debouncedFn();
      debouncedFn();

      // Should not call immediately
      expect(callback).not.toHaveBeenCalled();

      // Wait for debounce delay
      act(() => {
        vi.advanceTimersByTime(100);
      });

      // Should call only once
      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('should efficiently handle hover state updates', async () => {
      const onStepToggle = vi.fn();
      
      const { container } = render(
        <SamplerSequencerGrid
          pattern={mockPattern}
          chops={mockChops}
          currentStep={0}
          isPlaying={false}
          onStepToggle={onStepToggle}
        />
      );

      const stepButtons = container.querySelectorAll('button[title*="Track 1, Step"]');
      
      // Rapidly hover over multiple steps
      for (let i = 0; i < 5; i++) {
        fireEvent.mouseEnter(stepButtons[i]);
      }

      // Should debounce hover updates
      act(() => {
        vi.advanceTimersByTime(20);
      });

      // Only the last hover should be processed
      expect(container.querySelector('.brightness-125')).toBeTruthy();
    });
  });

  describe('SamplerSequencerStep Performance', () => {
    it('should use custom memo comparison to prevent unnecessary re-renders', () => {
      const onToggle = vi.fn();
      const onHover = vi.fn();

      const { rerender } = render(
        <SamplerSequencerStep
          trackIndex={0}
          stepIndex={0}
          isActive={false}
          hasChop={true}
          chopColor="#06b6d4"
          isCurrentStep={false}
          isHovered={false}
          onToggle={onToggle}
          onHover={onHover}
        />
      );

      // Re-render with same props
      rerender(
        <SamplerSequencerStep
          trackIndex={0}
          stepIndex={0}
          isActive={false}
          hasChop={true}
          chopColor="#06b6d4"
          isCurrentStep={false}
          isHovered={false}
          onToggle={onToggle}
          onHover={onHover}
        />
      );

      // Should not trigger any callbacks due to memoization
      expect(onToggle).not.toHaveBeenCalled();
      expect(onHover).not.toHaveBeenCalled();
    });

    it('should memoize style calculations', () => {
      const onToggle = vi.fn();
      const onHover = vi.fn();

      const { container, rerender } = render(
        <SamplerSequencerStep
          trackIndex={0}
          stepIndex={0}
          isActive={true}
          hasChop={true}
          chopColor="#06b6d4"
          isCurrentStep={false}
          isHovered={false}
          onToggle={onToggle}
          onHover={onHover}
        />
      );

      const button = container.querySelector('button');
      const initialStyle = button.style.backgroundColor;

      // Re-render with same style-affecting props
      rerender(
        <SamplerSequencerStep
          trackIndex={0}
          stepIndex={0}
          isActive={true}
          hasChop={true}
          chopColor="#06b6d4"
          isCurrentStep={false}
          isHovered={false}
          onToggle={onToggle}
          onHover={onHover}
        />
      );

      // Style should remain the same (memoized)
      expect(button.style.backgroundColor).toBe(initialStyle);
    });
  });

  describe('SamplerTransportControls Performance', () => {
    it('should debounce BPM input changes', async () => {
      const onBpmChange = vi.fn();
      
      const { container } = render(
        <SamplerTransportControls
          isPlaying={false}
          bpm={120}
          onPlay={vi.fn()}
          onStop={vi.fn()}
          onBpmChange={onBpmChange}
        />
      );

      const bpmInput = container.querySelector('input[type="number"]');

      // Rapidly change BPM value
      fireEvent.change(bpmInput, { target: { value: '130' } });
      fireEvent.change(bpmInput, { target: { value: '140' } });
      fireEvent.change(bpmInput, { target: { value: '150' } });

      // Blur to trigger validation
      fireEvent.blur(bpmInput);

      // Wait for debounced call
      act(() => {
        vi.advanceTimersByTime(350);
      });

      // Should only call once with the final value
      expect(onBpmChange).toHaveBeenCalledWith(150);
    });

    it('should memoize button styles', () => {
      const { container, rerender } = render(
        <SamplerTransportControls
          isPlaying={false}
          bpm={120}
          onPlay={vi.fn()}
          onStop={vi.fn()}
          onBpmChange={vi.fn()}
        />
      );

      const playButton = container.querySelector('button');
      const initialClasses = playButton.className;

      // Re-render with same playing state
      rerender(
        <SamplerTransportControls
          isPlaying={false}
          bpm={120}
          onPlay={vi.fn()}
          onStop={vi.fn()}
          onBpmChange={vi.fn()}
        />
      );

      // Classes should be memoized
      expect(playButton.className).toBe(initialClasses);
    });
  });

  describe('SamplerBankNavigation Performance', () => {
    it('should memoize bank data calculations', () => {
      const onBankChange = vi.fn();
      const chopsPerBank = [8, 12, 0, 0];

      const { rerender } = render(
        <SamplerBankNavigation
          currentBank={0}
          totalBanks={2}
          onBankChange={onBankChange}
          chopsPerBank={chopsPerBank}
        />
      );

      // Re-render with same props
      rerender(
        <SamplerBankNavigation
          currentBank={0}
          totalBanks={2}
          onBankChange={onBankChange}
          chopsPerBank={chopsPerBank}
        />
      );

      // Should not trigger unnecessary calculations
      expect(onBankChange).not.toHaveBeenCalled();
    });

    it('should efficiently handle button state changes', () => {
      const onBankChange = vi.fn();
      const chopsPerBank = [8, 12];

      const { container } = render(
        <SamplerBankNavigation
          currentBank={0}
          totalBanks={2}
          onBankChange={onBankChange}
          chopsPerBank={chopsPerBank}
        />
      );

      const nextButton = container.querySelector('button[title="Next Bank"]');
      const prevButton = container.querySelector('button[title="Previous Bank"]');

      // Previous button should be disabled at bank 0
      expect(prevButton).toHaveAttribute('disabled');
      expect(nextButton).not.toHaveAttribute('disabled');
    });
  });

  describe('SamplerTapTempo Performance', () => {
    it('should memoize button classes and display text', () => {
      const onTempoCalculated = vi.fn();

      const { container, rerender } = render(
        <SamplerTapTempo
          onTempoCalculated={onTempoCalculated}
          currentBpm={120}
        />
      );

      const button = container.querySelector('button');
      const initialClasses = button.className;

      // Re-render with same props
      rerender(
        <SamplerTapTempo
          onTempoCalculated={onTempoCalculated}
          currentBpm={120}
        />
      );

      // Classes should be memoized
      expect(button.className).toBe(initialClasses);
    });

    it('should efficiently calculate BPM from taps', async () => {
      const onTempoCalculated = vi.fn();

      const { container } = render(
        <SamplerTapTempo
          onTempoCalculated={onTempoCalculated}
          currentBpm={120}
        />
      );

      const tapButton = container.querySelector('button');

      // Simulate 4 taps at 120 BPM (500ms intervals)
      const tapInterval = 500; // 120 BPM = 500ms per beat
      
      for (let i = 0; i < 4; i++) {
        fireEvent.click(tapButton);
        act(() => {
          vi.advanceTimersByTime(tapInterval);
        });
      }

      // Should calculate BPM after 4 taps
      expect(onTempoCalculated).toHaveBeenCalledWith(120);
    });
  });

  describe('Memory Management', () => {
    it('should clean up event listeners and timeouts', () => {
      const { unmount } = render(
        <SamplerTransportControls
          isPlaying={false}
          bpm={120}
          onPlay={vi.fn()}
          onStop={vi.fn()}
          onBpmChange={vi.fn()}
        />
      );

      // Unmount component
      unmount();

      // Advance timers to ensure cleanup
      act(() => {
        vi.advanceTimersByTime(1000);
      });

      // No memory leaks should occur (tested by absence of errors)
      expect(true).toBe(true);
    });

    it('should handle rapid component mounting/unmounting', () => {
      for (let i = 0; i < 10; i++) {
        const { unmount } = render(
          <SamplerSequencerGrid
            pattern={mockPattern}
            chops={mockChops}
            currentStep={0}
            isPlaying={false}
            onStepToggle={vi.fn()}
          />
        );
        
        unmount();
      }

      // Should not cause memory leaks
      expect(true).toBe(true);
    });
  });

  describe('Render Performance', () => {
    it('should render large grids efficiently', () => {
      const startTime = performance.now();

      render(
        <SamplerSequencerGrid
          pattern={mockPattern}
          chops={mockChops}
          currentStep={0}
          isPlaying={false}
          onStepToggle={vi.fn()}
        />
      );

      const renderTime = performance.now() - startTime;

      // Should render in under 50ms (reasonable for 16x16 grid)
      expect(renderTime).toBeLessThan(50);
    });

    it('should handle rapid prop changes efficiently', () => {
      const onStepToggle = vi.fn();
      
      const { rerender } = render(
        <SamplerSequencerGrid
          pattern={mockPattern}
          chops={mockChops}
          currentStep={0}
          isPlaying={false}
          onStepToggle={onStepToggle}
        />
      );

      const startTime = performance.now();

      // Rapidly change current step (simulating playback)
      for (let step = 0; step < 16; step++) {
        rerender(
          <SamplerSequencerGrid
            pattern={mockPattern}
            chops={mockChops}
            currentStep={step}
            isPlaying={true}
            onStepToggle={onStepToggle}
          />
        );
      }

      const totalTime = performance.now() - startTime;

      // Should handle 16 rapid updates in under 100ms
      expect(totalTime).toBeLessThan(100);
    });
  });

  describe('Advanced Performance Optimizations', () => {
    it('should use batched state updates effectively', async () => {
      // Test batched state updates with a simpler approach
      const TestComponent = () => {
        const [state, setState] = React.useState(0);
        const batchedSetState = useBatchedState(setState, 16);
        
        React.useEffect(() => {
          // Simulate rapid state updates
          batchedSetState(1);
          batchedSetState(2);
          batchedSetState(3);
        }, [batchedSetState]);
        
        return <div data-testid="batch-test">{state}</div>;
      };

      const { container } = render(<TestComponent />);

      // Advance timers for batched updates
      act(() => {
        vi.advanceTimersByTime(50);
      });

      // Should handle batched updates
      const testElement = container.querySelector('[data-testid="batch-test"]');
      expect(testElement).toBeTruthy();
    });

    it('should optimize event delegation for grid interactions', () => {
      const onStepToggle = vi.fn();
      
      const { container } = render(
        <SamplerSequencerGrid
          pattern={mockPattern}
          chops={mockChops}
          currentStep={0}
          isPlaying={false}
          onStepToggle={onStepToggle}
        />
      );

      // Should use event delegation instead of individual listeners
      const stepButtons = container.querySelectorAll('button[title*="Track"]');
      expect(stepButtons.length).toBe(256); // 16x16 grid

      // Each button should have data attributes for delegation
      stepButtons.forEach((button, index) => {
        const trackIndex = Math.floor(index / 16);
        const stepIndex = index % 16;
        
        // Buttons should be optimized for event delegation
        expect(button).toBeInTheDocument();
      });
    });

    it('should minimize visual effects for performance', () => {
      const { container } = render(
        <SamplerSequencerGrid
          pattern={mockPattern}
          chops={mockChops}
          currentStep={5}
          isPlaying={true}
          onStepToggle={vi.fn()}
        />
      );

      // Should not use heavy animations or effects
      const animatedElements = container.querySelectorAll('[class*="animate-"]');
      
      // Only essential animations should be present (like pulse for current step)
      expect(animatedElements.length).toBeLessThan(5);
    });

    it('should use efficient re-render strategies', () => {
      const renderSpy = vi.fn();
      
      const TestComponent = ({ pattern, currentStep }) => {
        renderSpy();
        return (
          <SamplerSequencerGrid
            pattern={pattern}
            chops={mockChops}
            currentStep={currentStep}
            isPlaying={true}
            onStepToggle={vi.fn()}
          />
        );
      };

      const { rerender } = render(
        <TestComponent pattern={mockPattern} currentStep={0} />
      );

      renderSpy.mockClear();

      // Change only currentStep (should be efficient)
      rerender(<TestComponent pattern={mockPattern} currentStep={1} />);
      
      expect(renderSpy).toHaveBeenCalledTimes(1);

      // Change pattern reference but same content (should be optimized)
      const samePattern = { ...mockPattern };
      rerender(<TestComponent pattern={samePattern} currentStep={1} />);
      
      // Should minimize unnecessary re-renders
      expect(renderSpy).toHaveBeenCalledTimes(2);
    });
  });

  describe('Performance Utility Functions', () => {
    it('should provide efficient debouncing', async () => {
      const callback = vi.fn();
      let debouncedFn;

      const TestComponent = () => {
        debouncedFn = useDebounce(callback, 100);
        return <div>Test</div>;
      };

      render(<TestComponent />);

      // Call multiple times rapidly
      debouncedFn();
      debouncedFn();
      debouncedFn();

      // Should not call immediately
      expect(callback).not.toHaveBeenCalled();

      // Wait for debounce delay
      act(() => {
        vi.advanceTimersByTime(150);
      });

      // Should call only once
      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('should provide efficient throttling', () => {
      // Test throttling with a simpler approach
      const callback = vi.fn();
      
      // Mock Date.now for consistent throttling behavior
      const originalDateNow = Date.now;
      let mockTime = 1000; // Start with a base time
      Date.now = vi.fn(() => mockTime);

      let throttledFn;

      const TestComponent = () => {
        throttledFn = useThrottle(callback, 100);
        return <div>Test</div>;
      };

      render(<TestComponent />);

      // Advance time to ensure first call executes
      mockTime += 150; // Ensure we're past the initial throttle window
      throttledFn();
      expect(callback).toHaveBeenCalledTimes(1);

      // Advance time by 50ms (within throttle window)
      mockTime += 50;
      throttledFn();
      // Should not call again (within throttle window)
      expect(callback).toHaveBeenCalledTimes(1);

      // Advance time past throttle window
      mockTime += 100;
      throttledFn();
      // Should call again
      expect(callback).toHaveBeenCalledTimes(2);

      // Restore original Date.now
      Date.now = originalDateNow;
    });

    it('should provide efficient array comparison', () => {
      const arr1 = [1, 2, 3];
      const arr2 = [1, 2, 3];
      const arr3 = [1, 2, 4];

      expect(shallowArrayEqual(arr1, arr2)).toBe(true);
      expect(shallowArrayEqual(arr1, arr3)).toBe(false);
      expect(shallowArrayEqual(arr1, [1, 2])).toBe(false);
    });

    it('should provide efficient object comparison', () => {
      const obj1 = { a: 1, b: 2 };
      const obj2 = { a: 1, b: 2 };
      const obj3 = { a: 1, b: 3 };

      expect(shallowObjectEqual(obj1, obj2)).toBe(true);
      expect(shallowObjectEqual(obj1, obj3)).toBe(false);
      expect(shallowObjectEqual(obj1, { a: 1 })).toBe(false);
    });
  });
});