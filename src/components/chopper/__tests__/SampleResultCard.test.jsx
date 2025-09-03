import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import SampleResultCard from '../SampleResultCard';

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, className, onHoverStart, onHoverEnd, ...props }) => (
      <div 
        className={className} 
        onMouseEnter={onHoverStart}
        onMouseLeave={onHoverEnd}
        {...props}
      >
        {children}
      </div>
    ),
  },
  AnimatePresence: ({ children }) => <div>{children}</div>,
}));

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Play: ({ className }) => <div className={className} data-testid="play-icon" />,
  Loader2: ({ className }) => <div className={className} data-testid="loader-icon" />,
  Clock: ({ className }) => <div className={className} data-testid="clock-icon" />,
  Calendar: ({ className }) => <div className={className} data-testid="calendar-icon" />,
  Music: ({ className }) => <div className={className} data-testid="music-icon" />,
  Star: ({ className }) => <div className={className} data-testid="star-icon" />,
  AlertCircle: ({ className }) => <div className={className} data-testid="alert-icon" />,
  ExternalLink: ({ className }) => <div className={className} data-testid="external-link-icon" />,
}));

// Mock UI components
vi.mock('../../ui/button', () => ({
  Button: ({ children, onClick, disabled, className, variant }) => (
    <button onClick={onClick} disabled={disabled} className={className} data-variant={variant}>
      {children}
    </button>
  ),
}));

// Mock utils
vi.mock('../../lib/utils', () => ({
  cn: (...classes) => classes.filter(Boolean).join(' '),
}));

vi.mock('@/lib/utils', () => ({
  cn: (...classes) => classes.filter(Boolean).join(' '),
}));

describe('SampleResultCard', () => {
  const mockSample = {
    videoId: 'test-video-id',
    title: 'Test Sample Title',
    artist: 'Test Artist',
    year: 1975,
    duration: 180, // 3 minutes
    thumbnailUrl: 'https://example.com/thumbnail.jpg',
    channelTitle: 'Test Channel',
    metadata: {
      estimatedBPM: 120,
      detectedKey: 'C Major',
      genre: 'Soul',
      era: '1970s',
      qualityScore: 0.85
    }
  };

  const defaultProps = {
    sample: null,
    onLoadSample: vi.fn(),
    isLoading: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Loading State', () => {
    it('shows loading state when isLoading is true', () => {
      render(<SampleResultCard {...defaultProps} isLoading={true} />);
      
      expect(screen.getByText('Discovering samples...')).toBeInTheDocument();
      expect(screen.getByText('Searching through vintage music archives')).toBeInTheDocument();
      expect(screen.getByTestId('loader-icon')).toBeInTheDocument();
    });
  });

  describe('No Sample State', () => {
    it('shows empty state when no sample is provided', () => {
      render(<SampleResultCard {...defaultProps} />);
      
      expect(screen.getByText('No sample discovered yet')).toBeInTheDocument();
      expect(screen.getByText('Use the shuffle button to discover vintage samples')).toBeInTheDocument();
      expect(screen.getByTestId('music-icon')).toBeInTheDocument();
    });
  });

  describe('Sample Display', () => {
    it('displays sample information correctly', () => {
      render(<SampleResultCard {...defaultProps} sample={mockSample} />);
      
      expect(screen.getByText('Test Sample Title')).toBeInTheDocument();
      expect(screen.getByText('Test Artist')).toBeInTheDocument();
      expect(screen.getByText('1975')).toBeInTheDocument();
      expect(screen.getByText('3:00')).toBeInTheDocument(); // 180 seconds = 3:00
    });

    it('displays metadata when available', () => {
      render(<SampleResultCard {...defaultProps} sample={mockSample} />);
      
      expect(screen.getByText('120')).toBeInTheDocument(); // BPM
      expect(screen.getByText('C Major')).toBeInTheDocument(); // Key
      expect(screen.getByText('Soul')).toBeInTheDocument(); // Genre
      expect(screen.getByText('1970s')).toBeInTheDocument(); // Era
    });

    it('displays quality indicator', () => {
      render(<SampleResultCard {...defaultProps} sample={mockSample} />);
      
      expect(screen.getByText('Excellent')).toBeInTheDocument(); // Quality score 0.85
      expect(screen.getByTestId('star-icon')).toBeInTheDocument();
    });

    it('falls back to channel title when artist is not available', () => {
      const sampleWithoutArtist = { ...mockSample, artist: null };
      render(<SampleResultCard {...defaultProps} sample={sampleWithoutArtist} />);
      
      expect(screen.getByText('Test Channel')).toBeInTheDocument();
    });
  });

  describe('Duration Formatting', () => {
    it('formats duration correctly for various lengths', () => {
      const testCases = [
        { duration: 65, expected: '1:05' },
        { duration: 120, expected: '2:00' },
        { duration: 195, expected: '3:15' },
        { duration: 3661, expected: '61:01' }, // Over an hour
      ];

      testCases.forEach(({ duration, expected }) => {
        const sampleWithDuration = { ...mockSample, duration };
        const { rerender } = render(<SampleResultCard {...defaultProps} sample={sampleWithDuration} />);
        
        expect(screen.getByText(expected)).toBeInTheDocument();
        
        rerender(<div />); // Clear for next test
      });
    });
  });

  describe('Quality Scoring', () => {
    it('shows correct quality labels for different scores', () => {
      const testCases = [
        { score: 0.9, label: 'Excellent' },
        { score: 0.7, label: 'Good' },
        { score: 0.5, label: 'Fair' },
      ];

      testCases.forEach(({ score, label }) => {
        const sampleWithScore = {
          ...mockSample,
          metadata: { ...mockSample.metadata, qualityScore: score }
        };
        
        const { rerender } = render(<SampleResultCard {...defaultProps} sample={sampleWithScore} />);
        
        expect(screen.getByText(label)).toBeInTheDocument();
        
        rerender(<div />); // Clear for next test
      });
    });
  });

  describe('User Interactions', () => {
    it('calls onLoadSample when load button is clicked', () => {
      const onLoadSample = vi.fn();
      render(<SampleResultCard {...defaultProps} sample={mockSample} onLoadSample={onLoadSample} />);
      
      fireEvent.click(screen.getByText('Load Sample'));
      
      expect(onLoadSample).toHaveBeenCalledWith(mockSample);
    });

    it('does not call onLoadSample when loading', () => {
      const onLoadSample = vi.fn();
      render(<SampleResultCard {...defaultProps} sample={mockSample} onLoadSample={onLoadSample} isLoading={true} />);
      
      const loadButton = screen.getByRole('button', { name: /loading/i });
      fireEvent.click(loadButton);
      
      expect(onLoadSample).not.toHaveBeenCalled();
    });

    it('opens YouTube link when external link button is clicked', () => {
      const originalOpen = window.open;
      window.open = vi.fn();
      
      render(<SampleResultCard {...defaultProps} sample={mockSample} />);
      
      const externalLinkButton = screen.getByTestId('external-link-icon').closest('button');
      fireEvent.click(externalLinkButton);
      
      expect(window.open).toHaveBeenCalledWith(
        `https://www.youtube.com/watch?v=${mockSample.videoId}`,
        '_blank'
      );
      
      window.open = originalOpen;
    });
  });

  describe('Image Handling', () => {
    it('shows fallback when image fails to load', async () => {
      render(<SampleResultCard {...defaultProps} sample={mockSample} />);
      
      const image = screen.getByRole('img');
      fireEvent.error(image);
      
      await waitFor(() => {
        expect(screen.getByTestId('music-icon')).toBeInTheDocument();
      });
    });
  });

  describe('Error State', () => {
    it('displays error message when sample has error', () => {
      const sampleWithError = {
        ...mockSample,
        error: 'Failed to load sample'
      };
      
      render(<SampleResultCard {...defaultProps} sample={sampleWithError} />);
      
      expect(screen.getByText('Sample Error')).toBeInTheDocument();
      expect(screen.getByText('Failed to load sample')).toBeInTheDocument();
      expect(screen.getByTestId('alert-icon')).toBeInTheDocument();
    });
  });

  describe('Hover Effects', () => {
    it('shows play overlay on hover', () => {
      render(<SampleResultCard {...defaultProps} sample={mockSample} />);
      
      const card = screen.getByText('Test Sample Title').closest('div').closest('div');
      fireEvent.mouseEnter(card);
      
      // The play overlay should be visible
      const playIcons = screen.getAllByTestId('play-icon');
      expect(playIcons.length).toBeGreaterThan(0);
    });
  });

  describe('Accessibility', () => {
    it('provides proper alt text for thumbnail', () => {
      render(<SampleResultCard {...defaultProps} sample={mockSample} />);
      
      const image = screen.getByRole('img');
      expect(image).toHaveAttribute('alt', 'Test Sample Title');
    });

    it('has accessible button labels', () => {
      render(<SampleResultCard {...defaultProps} sample={mockSample} />);
      
      expect(screen.getByRole('button', { name: /load sample/i })).toBeInTheDocument();
    });
  });

  describe('Conditional Rendering', () => {
    it('does not show metadata that is not available', () => {
      const minimalSample = {
        videoId: 'test-id',
        title: 'Test Title',
        duration: 120,
        thumbnailUrl: 'test.jpg',
        channelTitle: 'Test Channel',
        metadata: {}
      };
      
      render(<SampleResultCard {...defaultProps} sample={minimalSample} />);
      
      expect(screen.queryByText('BPM')).not.toBeInTheDocument();
      expect(screen.queryByText('KEY')).not.toBeInTheDocument();
      expect(screen.queryByTestId('star-icon')).not.toBeInTheDocument();
    });
  });
});