import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import StepResolutionSelector from '../StepResolutionSelector';

describe('StepResolutionSelector', () => {
  const defaultProps = {
    resolution: 16,
    onResolutionChange: vi.fn(),
    isInitialized: true,
    hasPatternData: false
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders resolution options correctly', () => {
    render(<StepResolutionSelector {...defaultProps} />);
    
    expect(screen.getByText('Step Resolution')).toBeInTheDocument();
    expect(screen.getAllByText('1/8')).toHaveLength(1);
    expect(screen.getAllByText('1/16')).toHaveLength(2); // One in button, one in current info
    expect(screen.getAllByText('1/32')).toHaveLength(1);
  });

  it('highlights current resolution', () => {
    render(<StepResolutionSelector {...defaultProps} resolution={16} />);
    
    const buttons = screen.getAllByRole('button');
    const selectedButton = buttons.find(button => 
      button.textContent.includes('1/16') && button.textContent.includes('16 steps per bar')
    );
    expect(selectedButton).toHaveClass('border-cyan-400');
    expect(selectedButton).toHaveClass('bg-cyan-400/20');
  });

  it('shows current resolution info', () => {
    render(<StepResolutionSelector {...defaultProps} resolution={16} />);
    
    expect(screen.getByText('Current:')).toBeInTheDocument();
    expect(screen.getAllByText('1/16')).toHaveLength(2); // One in button, one in current info
    expect(screen.getAllByText('16 steps per bar')).toHaveLength(2); // One in button, one in current info
  });

  it('calls onResolutionChange when resolution is selected without pattern data', () => {
    render(<StepResolutionSelector {...defaultProps} hasPatternData={false} />);
    
    fireEvent.click(screen.getByText('1/32'));
    expect(defaultProps.onResolutionChange).toHaveBeenCalledWith(32);
  });

  it('shows warning modal when changing resolution with pattern data', async () => {
    render(<StepResolutionSelector {...defaultProps} hasPatternData={true} />);
    
    fireEvent.click(screen.getByText('1/32'));
    
    await waitFor(() => {
      expect(screen.getByText('Change Step Resolution?')).toBeInTheDocument();
      expect(screen.getByText(/You're about to change from/)).toBeInTheDocument();
    });
    
    // Should not call onResolutionChange immediately
    expect(defaultProps.onResolutionChange).not.toHaveBeenCalled();
  });

  it('confirms resolution change from warning modal', async () => {
    render(<StepResolutionSelector {...defaultProps} hasPatternData={true} />);
    
    // Click to change resolution
    fireEvent.click(screen.getByText('1/32'));
    
    await waitFor(() => {
      expect(screen.getByText('Change Step Resolution?')).toBeInTheDocument();
    });
    
    // Confirm the change
    fireEvent.click(screen.getByText('Change Resolution'));
    
    await waitFor(() => {
      expect(defaultProps.onResolutionChange).toHaveBeenCalledWith(32);
      expect(screen.queryByText('Change Step Resolution?')).not.toBeInTheDocument();
    });
  });

  it('cancels resolution change from warning modal', async () => {
    render(<StepResolutionSelector {...defaultProps} hasPatternData={true} />);
    
    // Click to change resolution
    fireEvent.click(screen.getByText('1/32'));
    
    await waitFor(() => {
      expect(screen.getByText('Change Step Resolution?')).toBeInTheDocument();
    });
    
    // Cancel the change
    fireEvent.click(screen.getByText('Cancel'));
    
    await waitFor(() => {
      expect(defaultProps.onResolutionChange).not.toHaveBeenCalled();
      expect(screen.queryByText('Change Step Resolution?')).not.toBeInTheDocument();
    });
  });

  it('closes warning modal when clicking backdrop', async () => {
    render(<StepResolutionSelector {...defaultProps} hasPatternData={true} />);
    
    // Click to change resolution
    fireEvent.click(screen.getByText('1/32'));
    
    await waitFor(() => {
      expect(screen.getByText('Change Step Resolution?')).toBeInTheDocument();
    });
    
    // Click backdrop (the modal overlay)
    const modalOverlay = screen.getByText('Change Step Resolution?').closest('[class*="fixed inset-0"]');
    fireEvent.click(modalOverlay);
    
    await waitFor(() => {
      expect(screen.queryByText('Change Step Resolution?')).not.toBeInTheDocument();
    });
  });

  it('disables buttons when not initialized', () => {
    render(<StepResolutionSelector {...defaultProps} isInitialized={false} />);
    
    const buttons = screen.getAllByRole('button');
    buttons.forEach(button => {
      expect(button).toBeDisabled();
    });
  });

  it('shows pattern data warning when hasPatternData is true', () => {
    render(<StepResolutionSelector {...defaultProps} hasPatternData={true} />);
    
    expect(screen.getByText('Changing resolution may affect existing pattern data')).toBeInTheDocument();
  });

  it('does not show pattern data warning when hasPatternData is false', () => {
    render(<StepResolutionSelector {...defaultProps} hasPatternData={false} />);
    
    expect(screen.queryByText('Changing resolution may affect existing pattern data')).not.toBeInTheDocument();
  });

  it('handles same resolution selection without warning', () => {
    render(<StepResolutionSelector {...defaultProps} resolution={16} hasPatternData={true} />);
    
    // Click the already selected resolution button (not the info text)
    const buttons = screen.getAllByRole('button');
    const selectedButton = buttons.find(button => 
      button.textContent.includes('1/16') && button.textContent.includes('16 steps per bar')
    );
    fireEvent.click(selectedButton);
    
    // Should not show warning and should call onResolutionChange
    expect(screen.queryByText('Change Step Resolution?')).not.toBeInTheDocument();
    expect(defaultProps.onResolutionChange).toHaveBeenCalledWith(16);
  });
});