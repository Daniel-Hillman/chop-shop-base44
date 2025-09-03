import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import SamplerBankNavigation from '../SamplerBankNavigation';

describe('SamplerBankNavigation', () => {
  const defaultProps = {
    currentBank: 0,
    totalBanks: 2,
    onBankChange: vi.fn(),
    chopsPerBank: [8, 12]
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders bank navigation with correct initial state', () => {
    render(<SamplerBankNavigation {...defaultProps} />);
    
    expect(screen.getByText('Bank A')).toBeInTheDocument();
    expect(screen.getByText('(8/16)')).toBeInTheDocument();
  });

  it('displays correct bank label and chop count', () => {
    render(
      <SamplerBankNavigation 
        {...defaultProps} 
        currentBank={1}
        chopsPerBank={[8, 12]}
      />
    );
    
    expect(screen.getByText('Bank B')).toBeInTheDocument();
    expect(screen.getByText('(12/16)')).toBeInTheDocument();
  });

  it('handles previous bank navigation', () => {
    const onBankChange = vi.fn();
    render(
      <SamplerBankNavigation 
        {...defaultProps} 
        currentBank={1}
        onBankChange={onBankChange}
      />
    );
    
    const prevButton = screen.getByTitle('Previous Bank');
    fireEvent.click(prevButton);
    
    expect(onBankChange).toHaveBeenCalledWith(0);
  });

  it('handles next bank navigation', () => {
    const onBankChange = vi.fn();
    render(
      <SamplerBankNavigation 
        {...defaultProps} 
        currentBank={0}
        onBankChange={onBankChange}
      />
    );
    
    const nextButton = screen.getByTitle('Next Bank');
    fireEvent.click(nextButton);
    
    expect(onBankChange).toHaveBeenCalledWith(1);
  });

  it('disables previous button on first bank', () => {
    render(
      <SamplerBankNavigation 
        {...defaultProps} 
        currentBank={0}
      />
    );
    
    const prevButton = screen.getByTitle('Previous Bank');
    expect(prevButton).toBeDisabled();
  });

  it('disables next button on last bank', () => {
    render(
      <SamplerBankNavigation 
        {...defaultProps} 
        currentBank={1}
        totalBanks={2}
      />
    );
    
    const nextButton = screen.getByTitle('Next Bank');
    expect(nextButton).toBeDisabled();
  });

  it('renders progress indicator dots', () => {
    render(<SamplerBankNavigation {...defaultProps} />);
    
    // Should have 2 dots for 2 banks
    const bankADot = screen.getByTitle('Bank A');
    const bankBDot = screen.getByTitle('Bank B');
    expect(bankADot).toBeInTheDocument();
    expect(bankBDot).toBeInTheDocument();
  });

  it('handles dot click navigation', () => {
    const onBankChange = vi.fn();
    render(
      <SamplerBankNavigation 
        {...defaultProps} 
        onBankChange={onBankChange}
      />
    );
    
    // Find and click the second dot (Bank B)
    const bankBDot = screen.getByTitle('Bank B');
    fireEvent.click(bankBDot);
    
    expect(onBankChange).toHaveBeenCalledWith(1);
  });

  it('supports 4-bank expansion', () => {
    render(
      <SamplerBankNavigation 
        {...defaultProps} 
        totalBanks={4}
        chopsPerBank={[8, 12, 6, 0]}
      />
    );
    
    // Should have 4 dots for 4 banks
    expect(screen.getByTitle('Bank A')).toBeInTheDocument();
    expect(screen.getByTitle('Bank B')).toBeInTheDocument();
    expect(screen.getByTitle('Bank C')).toBeInTheDocument();
    expect(screen.getByTitle('Bank D')).toBeInTheDocument();
  });

  it('handles empty chop count gracefully', () => {
    render(
      <SamplerBankNavigation 
        {...defaultProps} 
        chopsPerBank={[]}
      />
    );
    
    expect(screen.getByText('(0/16)')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(
      <SamplerBankNavigation 
        {...defaultProps} 
        className="custom-class"
      />
    );
    
    expect(container.firstChild).toHaveClass('custom-class');
  });
});