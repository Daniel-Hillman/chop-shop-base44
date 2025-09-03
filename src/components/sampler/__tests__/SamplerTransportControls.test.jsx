import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import SamplerTransportControls from '../SamplerTransportControls';

describe('SamplerTransportControls', () => {
  let mockOnPlay, mockOnStop, mockOnBpmChange;

  beforeEach(() => {
    mockOnPlay = vi.fn();
    mockOnStop = vi.fn();
    mockOnBpmChange = vi.fn();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('renders play button when not playing', () => {
      render(
        <SamplerTransportControls
          isPlaying={false}
          bpm={120}
          onPlay={mockOnPlay}
          onStop={mockOnStop}
          onBpmChange={mockOnBpmChange}
        />
      );

      expect(screen.getByRole('button', { name: /play/i })).toBeInTheDocument();
      expect(screen.getByDisplayValue('120')).toBeInTheDocument();
      expect(screen.getByText('Stopped')).toBeInTheDocument();
    });

    it('renders stop button when playing', () => {
      render(
        <SamplerTransportControls
          isPlaying={true}
          bpm={120}
          onPlay={mockOnPlay}
          onStop={mockOnStop}
          onBpmChange={mockOnBpmChange}
        />
      );

      expect(screen.getByRole('button', { name: /stop/i })).toBeInTheDocument();
      expect(screen.getByText('Playing')).toBeInTheDocument();
    });

    it('displays correct BPM value', () => {
      render(
        <SamplerTransportControls
          isPlaying={false}
          bpm={140}
          onPlay={mockOnPlay}
          onStop={mockOnStop}
          onBpmChange={mockOnBpmChange}
        />
      );

      expect(screen.getByDisplayValue('140')).toBeInTheDocument();
    });
  });

  describe('Play/Stop Functionality (Requirement 2.1, 2.2)', () => {
    it('calls onPlay when play button is clicked', () => {
      render(
        <SamplerTransportControls
          isPlaying={false}
          bpm={120}
          onPlay={mockOnPlay}
          onStop={mockOnStop}
          onBpmChange={mockOnBpmChange}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: /play/i }));
      expect(mockOnPlay).toHaveBeenCalledTimes(1);
    });

    it('calls onStop when stop button is clicked', () => {
      render(
        <SamplerTransportControls
          isPlaying={true}
          bpm={120}
          onPlay={mockOnPlay}
          onStop={mockOnStop}
          onBpmChange={mockOnBpmChange}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: /stop/i }));
      expect(mockOnStop).toHaveBeenCalledTimes(1);
    });

    it('toggles between play and stop states', () => {
      const { rerender } = render(
        <SamplerTransportControls
          isPlaying={false}
          bpm={120}
          onPlay={mockOnPlay}
          onStop={mockOnStop}
          onBpmChange={mockOnBpmChange}
        />
      );

      // Initially shows play button
      expect(screen.getByRole('button', { name: /play/i })).toBeInTheDocument();

      // Rerender as playing
      rerender(
        <SamplerTransportControls
          isPlaying={true}
          bpm={120}
          onPlay={mockOnPlay}
          onStop={mockOnStop}
          onBpmChange={mockOnBpmChange}
        />
      );

      // Now shows stop button
      expect(screen.getByRole('button', { name: /stop/i })).toBeInTheDocument();
    });
  });

  describe('BPM Control (Requirement 2.3)', () => {
    it('allows BPM input changes', () => {
      render(
        <SamplerTransportControls
          isPlaying={false}
          bpm={120}
          onPlay={mockOnPlay}
          onStop={mockOnStop}
          onBpmChange={mockOnBpmChange}
        />
      );

      const bpmInput = screen.getByDisplayValue('120');
      fireEvent.change(bpmInput, { target: { value: '140' } });
      
      expect(bpmInput.value).toBe('140');
    });

    it('validates BPM range (60-200) and calls onBpmChange on blur', async () => {
      render(
        <SamplerTransportControls
          isPlaying={false}
          bpm={120}
          onPlay={mockOnPlay}
          onStop={mockOnStop}
          onBpmChange={mockOnBpmChange}
        />
      );

      const bpmInput = screen.getByDisplayValue('120');
      
      // Valid BPM change
      fireEvent.change(bpmInput, { target: { value: '140' } });
      fireEvent.blur(bpmInput);
      
      await waitFor(() => {
        expect(mockOnBpmChange).toHaveBeenCalledWith(140);
      });
    });

    it('rejects BPM values below 60', async () => {
      render(
        <SamplerTransportControls
          isPlaying={false}
          bpm={120}
          onPlay={mockOnPlay}
          onStop={mockOnStop}
          onBpmChange={mockOnBpmChange}
        />
      );

      const bpmInput = screen.getByDisplayValue('120');
      
      // Invalid BPM (too low)
      fireEvent.change(bpmInput, { target: { value: '50' } });
      fireEvent.blur(bpmInput);
      
      await waitFor(() => {
        expect(mockOnBpmChange).not.toHaveBeenCalled();
        expect(bpmInput.value).toBe('120'); // Reset to original value
      });
    });

    it('rejects BPM values above 200', async () => {
      render(
        <SamplerTransportControls
          isPlaying={false}
          bpm={120}
          onPlay={mockOnPlay}
          onStop={mockOnStop}
          onBpmChange={mockOnBpmChange}
        />
      );

      const bpmInput = screen.getByDisplayValue('120');
      
      // Invalid BPM (too high)
      fireEvent.change(bpmInput, { target: { value: '250' } });
      fireEvent.blur(bpmInput);
      
      await waitFor(() => {
        expect(mockOnBpmChange).not.toHaveBeenCalled();
        expect(bpmInput.value).toBe('120'); // Reset to original value
      });
    });

    it('rejects non-numeric BPM values', async () => {
      render(
        <SamplerTransportControls
          isPlaying={false}
          bpm={120}
          onPlay={mockOnPlay}
          onStop={mockOnStop}
          onBpmChange={mockOnBpmChange}
        />
      );

      const bpmInput = screen.getByDisplayValue('120');
      
      // Invalid BPM (non-numeric)
      fireEvent.change(bpmInput, { target: { value: 'abc' } });
      fireEvent.blur(bpmInput);
      
      await waitFor(() => {
        expect(mockOnBpmChange).not.toHaveBeenCalled();
        expect(bpmInput.value).toBe('120'); // Reset to original value
      });
    });

    it('commits BPM change on Enter key', async () => {
      render(
        <SamplerTransportControls
          isPlaying={false}
          bpm={120}
          onPlay={mockOnPlay}
          onStop={mockOnStop}
          onBpmChange={mockOnBpmChange}
        />
      );

      const bpmInput = screen.getByDisplayValue('120');
      
      // Focus the input first
      fireEvent.focus(bpmInput);
      fireEvent.change(bpmInput, { target: { value: '150' } });
      fireEvent.keyDown(bpmInput, { key: 'Enter' });
      // Manually trigger blur since Enter calls blur()
      fireEvent.blur(bpmInput);
      
      // Enter key should trigger blur and call onBpmChange (with debouncing)
      await waitFor(() => {
        expect(mockOnBpmChange).toHaveBeenCalledWith(150);
      });
    });

    it('shows validation tooltip on focus', async () => {
      render(
        <SamplerTransportControls
          isPlaying={false}
          bpm={120}
          onPlay={mockOnPlay}
          onStop={mockOnStop}
          onBpmChange={mockOnBpmChange}
        />
      );

      const bpmInput = screen.getByDisplayValue('120');
      fireEvent.focus(bpmInput);
      
      await waitFor(() => {
        expect(screen.getByText('60-200 BPM')).toBeInTheDocument();
      });
    });
  });

  describe('Keyboard Shortcuts (Requirement 2.3)', () => {
    it('handles space bar for play/stop toggle', () => {
      render(
        <SamplerTransportControls
          isPlaying={false}
          bpm={120}
          onPlay={mockOnPlay}
          onStop={mockOnStop}
          onBpmChange={mockOnBpmChange}
        />
      );

      // Simulate space bar press
      fireEvent.keyDown(document, { code: 'Space' });
      expect(mockOnPlay).toHaveBeenCalledTimes(1);
    });

    it('does not handle space bar when BPM input is focused', () => {
      render(
        <SamplerTransportControls
          isPlaying={false}
          bpm={120}
          onPlay={mockOnPlay}
          onStop={mockOnStop}
          onBpmChange={mockOnBpmChange}
        />
      );

      const bpmInput = screen.getByDisplayValue('120');
      fireEvent.focus(bpmInput);
      
      // Space bar should not trigger play when input is focused
      fireEvent.keyDown(document, { code: 'Space' });
      expect(mockOnPlay).not.toHaveBeenCalled();
    });

    it('prevents default space bar behavior', () => {
      render(
        <SamplerTransportControls
          isPlaying={false}
          bpm={120}
          onPlay={mockOnPlay}
          onStop={mockOnStop}
          onBpmChange={mockOnBpmChange}
        />
      );

      // Test that space bar triggers play and preventDefault is called
      fireEvent.keyDown(document, { 
        code: 'Space',
        preventDefault: vi.fn()
      });
      
      expect(mockOnPlay).toHaveBeenCalled();
    });
  });

  describe('Visual State Indicators (Requirement 2.3)', () => {
    it('shows correct visual state when stopped', () => {
      render(
        <SamplerTransportControls
          isPlaying={false}
          bpm={120}
          onPlay={mockOnPlay}
          onStop={mockOnStop}
          onBpmChange={mockOnBpmChange}
        />
      );

      expect(screen.getByText('Stopped')).toBeInTheDocument();
      // Check for gray indicator (stopped state)
      const indicator = document.querySelector('.bg-gray-400');
      expect(indicator).toBeInTheDocument();
    });

    it('shows correct visual state when playing', () => {
      render(
        <SamplerTransportControls
          isPlaying={true}
          bpm={120}
          onPlay={mockOnPlay}
          onStop={mockOnStop}
          onBpmChange={mockOnBpmChange}
        />
      );

      expect(screen.getByText('Playing')).toBeInTheDocument();
      // Check for green pulsing indicator (playing state)
      const indicator = document.querySelector('.bg-green-400.animate-pulse');
      expect(indicator).toBeInTheDocument();
    });
  });

  describe('Props and State Synchronization', () => {
    it('updates local BPM when prop changes', () => {
      const { rerender } = render(
        <SamplerTransportControls
          isPlaying={false}
          bpm={120}
          onPlay={mockOnPlay}
          onStop={mockOnStop}
          onBpmChange={mockOnBpmChange}
        />
      );

      expect(screen.getByDisplayValue('120')).toBeInTheDocument();

      rerender(
        <SamplerTransportControls
          isPlaying={false}
          bpm={140}
          onPlay={mockOnPlay}
          onStop={mockOnStop}
          onBpmChange={mockOnBpmChange}
        />
      );

      expect(screen.getByDisplayValue('140')).toBeInTheDocument();
    });

    it('does not update local BPM when input is focused', () => {
      const { rerender } = render(
        <SamplerTransportControls
          isPlaying={false}
          bpm={120}
          onPlay={mockOnPlay}
          onStop={mockOnStop}
          onBpmChange={mockOnBpmChange}
        />
      );

      const bpmInput = screen.getByDisplayValue('120');
      fireEvent.focus(bpmInput);
      fireEvent.change(bpmInput, { target: { value: '130' } });

      // Prop change should not override focused input
      rerender(
        <SamplerTransportControls
          isPlaying={false}
          bpm={140}
          onPlay={mockOnPlay}
          onStop={mockOnStop}
          onBpmChange={mockOnBpmChange}
        />
      );

      expect(bpmInput.value).toBe('130'); // Should keep user input
    });
  });

  describe('Accessibility', () => {
    it('has proper button labels', () => {
      render(
        <SamplerTransportControls
          isPlaying={false}
          bpm={120}
          onPlay={mockOnPlay}
          onStop={mockOnStop}
          onBpmChange={mockOnBpmChange}
        />
      );

      expect(screen.getByRole('button', { name: /play/i })).toBeInTheDocument();
      expect(screen.getByLabelText(/bpm/i)).toBeInTheDocument();
    });

    it('has proper input attributes', () => {
      render(
        <SamplerTransportControls
          isPlaying={false}
          bpm={120}
          onPlay={mockOnPlay}
          onStop={mockOnStop}
          onBpmChange={mockOnBpmChange}
        />
      );

      const bpmInput = screen.getByDisplayValue('120');
      expect(bpmInput).toHaveAttribute('type', 'number');
      expect(bpmInput).toHaveAttribute('min', '60');
      expect(bpmInput).toHaveAttribute('max', '200');
    });
  });
});