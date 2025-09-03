/**
 * @fileoverview Unit tests for ChopperIntegrationGuide component
 * Tests user guidance, step-by-step instructions, and transfer functionality
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ChopperIntegrationGuide from '../ChopperIntegrationGuide.jsx';

// Mock framer-motion to avoid animation issues in tests
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }) => <div {...props}>{children}</div>
  },
  AnimatePresence: ({ children }) => <>{children}</>
}));

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  CheckCircle: () => <div data-testid="check-circle-icon">✓</div>,
  Circle: () => <div data-testid="circle-icon">○</div>,
  ExternalLink: () => <div data-testid="external-link-icon">↗</div>,
  Copy: () => <div data-testid="copy-icon">📋</div>,
  ArrowRight: () => <div data-testid="arrow-right-icon">→</div>,
  AlertCircle: () => <div data-testid="alert-circle-icon">⚠</div>
}));

// Mock UI button component
vi.mock('../../ui/button', () => ({
  Button: ({ children, onClick, disabled, className, ...props }) => (
    <button 
      onClick={onClick} 
      disabled={disabled} 
      className={className}
      data-testid={props['data-testid'] || 'button'}
      {...props}
    >
      {children}
    </button>
  )
}));

// Mock navigation helpers
vi.mock('../../../utils/navigationHelpers.js', () => ({
  UserGuidanceHelpers: {
    createChopperIntegrationGuidance: vi.fn()
  }
}));

import { UserGuidanceHelpers } from '../../../utils/navigationHelpers.js';

describe('ChopperIntegrationGuide', () => {
  let mockSample;
  let mockOnClose;
  let mockOnTransfer;
  let defaultProps;

  beforeEach(() => {
    vi.clearAllMocks();

    mockSample = {
      id: 'test-sample',
      title: 'Test Song',
      artist: 'Test Artist',
      year: 2023,
      genre: 'Funk',
      youtubeId: 'test123',
      thumbnailUrl: 'https://img.youtube.com/vi/test123/mqdefault.jpg',
      duration: 180,
      isMock: false
    };

    mockOnClose = vi.fn();
    mockOnTransfer = vi.fn();

    defaultProps = {
      sample: mockSample,
      isVisible: true,
      onClose: mockOnClose,
      onTransfer: mockOnTransfer,
      transferStatus: {
        inProgress: false,
        success: false,
        message: null,
        error: null
      }
    };

    // Mock the guidance creation
    UserGuidanceHelpers.createChopperIntegrationGuidance.mockReturnValue({
      title: 'Using Sample in Chopper',
      steps: [
        {
          step: 1,
          title: 'Copy YouTube URL',
          description: 'The YouTube URL for "Test Song" will be copied to your clipboard.',
          status: 'pending'
        },
        {
          step: 2,
          title: 'Navigate to Chopper',
          description: 'You will be automatically redirected to the Chopper page.',
          status: 'pending'
        },
        {
          step: 3,
          title: 'Load Sample',
          description: 'The sample will be automatically loaded in the Chopper interface.',
          status: 'pending'
        },
        {
          step: 4,
          title: 'Create Audio Samples',
          description: 'Use the Chopper tools to create audio samples from the track.',
          status: 'pending'
        }
      ],
      tips: [
        'Make sure you have a stable internet connection for the best experience.',
        'The YouTube URL will be available in your clipboard for manual use if needed.',
        'You can return to Sample Discovery anytime to find more samples.'
      ]
    });

    // Mock clipboard API
    Object.defineProperty(global.navigator, 'clipboard', {
      value: {
        writeText: vi.fn().mockResolvedValue(undefined)
      },
      writable: true
    });

    // Mock window.open
    global.window.open = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('rendering', () => {
    it('should not render when not visible', () => {
      render(
        <ChopperIntegrationGuide
          {...defaultProps}
          isVisible={false}
        />
      );

      expect(screen.queryByText('Using Sample in Chopper')).not.toBeInTheDocument();
    });

    it('should not render when no sample provided', () => {
      render(
        <ChopperIntegrationGuide
          {...defaultProps}
          sample={null}
        />
      );

      expect(screen.queryByText('Using Sample in Chopper')).not.toBeInTheDocument();
    });

    it('should render guide when visible with sample', () => {
      render(<ChopperIntegrationGuide {...defaultProps} />);

      expect(screen.getByText('Using Sample in Chopper')).toBeInTheDocument();
      expect(screen.getByText('Test Song')).toBeInTheDocument();
      expect(screen.getByText('by Test Artist (2023) • Funk')).toBeInTheDocument();
    });

    it('should render all guidance steps', () => {
      render(<ChopperIntegrationGuide {...defaultProps} />);

      expect(screen.getByText('Copy YouTube URL')).toBeInTheDocument();
      expect(screen.getByText('Navigate to Chopper')).toBeInTheDocument();
      expect(screen.getByText('Load Sample')).toBeInTheDocument();
      expect(screen.getByText('Create Audio Samples')).toBeInTheDocument();
    });

    it('should render all action buttons', () => {
      render(<ChopperIntegrationGuide {...defaultProps} />);

      expect(screen.getByText('Use in Chopper')).toBeInTheDocument();
      expect(screen.getByText('Copy URL')).toBeInTheDocument();
      expect(screen.getByText('Open YouTube')).toBeInTheDocument();
    });

    it('should render tips section', () => {
      render(<ChopperIntegrationGuide {...defaultProps} />);

      expect(screen.getByText('Tips:')).toBeInTheDocument();
      expect(screen.getByText(/stable internet connection/)).toBeInTheDocument();
      expect(screen.getByText(/YouTube URL will be available/)).toBeInTheDocument();
      expect(screen.getByText(/return to Sample Discovery/)).toBeInTheDocument();
    });
  });

  describe('step indicators', () => {
    it('should show pending state for all steps initially', () => {
      render(<ChopperIntegrationGuide {...defaultProps} />);

      const circleIcons = screen.getAllByTestId('circle-icon');
      expect(circleIcons).toHaveLength(4);
    });

    it('should show current step during transfer', () => {
      render(
        <ChopperIntegrationGuide
          {...defaultProps}
          transferStatus={{
            inProgress: true,
            success: false,
            message: 'Transferring...',
            error: null
          }}
        />
      );

      // Should show progress on step 1 (index 1)
      expect(screen.getByTestId('circle-icon')).toBeInTheDocument();
    });

    it('should show completed state when transfer successful', () => {
      render(
        <ChopperIntegrationGuide
          {...defaultProps}
          transferStatus={{
            inProgress: false,
            success: true,
            message: 'Transfer completed',
            error: null
          }}
        />
      );

      // Should show completion (step 4, index 4)
      expect(screen.getByTestId('check-circle-icon')).toBeInTheDocument();
    });

    it('should show error state when transfer fails', () => {
      render(
        <ChopperIntegrationGuide
          {...defaultProps}
          transferStatus={{
            inProgress: false,
            success: false,
            message: null,
            error: 'Transfer failed'
          }}
        />
      );

      expect(screen.getByTestId('alert-circle-icon')).toBeInTheDocument();
      expect(screen.getByText('Transfer failed')).toBeInTheDocument();
    });
  });

  describe('user interactions', () => {
    it('should call onClose when close button is clicked', async () => {
      const user = userEvent.setup();
      render(<ChopperIntegrationGuide {...defaultProps} />);

      const closeButtons = screen.getAllByText('✕');
      await user.click(closeButtons[0]);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should call onClose when clicking outside modal', async () => {
      const user = userEvent.setup();
      render(<ChopperIntegrationGuide {...defaultProps} />);

      // Click on the backdrop (the outer div)
      const backdrop = screen.getByText('Using Sample in Chopper').closest('[class*="fixed"]');
      await user.click(backdrop);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should call onTransfer when "Use in Chopper" button is clicked', async () => {
      const user = userEvent.setup();
      render(<ChopperIntegrationGuide {...defaultProps} />);

      const transferButton = screen.getByText('Use in Chopper');
      await user.click(transferButton);

      expect(mockOnTransfer).toHaveBeenCalledWith(mockSample);
    });

    it('should disable transfer button during transfer', () => {
      render(
        <ChopperIntegrationGuide
          {...defaultProps}
          transferStatus={{
            inProgress: true,
            success: false,
            message: 'Transferring...',
            error: null
          }}
        />
      );

      const transferButton = screen.getByText('Transferring...');
      expect(transferButton).toBeDisabled();
    });

    it('should copy URL when "Copy URL" button is clicked', async () => {
      const user = userEvent.setup();
      render(<ChopperIntegrationGuide {...defaultProps} />);

      const copyButton = screen.getByText('Copy URL');
      await user.click(copyButton);

      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
        'https://www.youtube.com/watch?v=test123'
      );
    });

    it('should open YouTube when "Open YouTube" button is clicked', async () => {
      const user = userEvent.setup();
      render(<ChopperIntegrationGuide {...defaultProps} />);

      const openButton = screen.getByText('Open YouTube');
      await user.click(openButton);

      expect(window.open).toHaveBeenCalledWith(
        'https://www.youtube.com/watch?v=test123',
        '_blank',
        'noopener,noreferrer'
      );
    });
  });

  describe('transfer status display', () => {
    it('should display success message', () => {
      render(
        <ChopperIntegrationGuide
          {...defaultProps}
          transferStatus={{
            inProgress: false,
            success: true,
            message: 'URL copied and navigating to Chopper',
            error: null
          }}
        />
      );

      expect(screen.getByText('URL copied and navigating to Chopper')).toBeInTheDocument();
    });

    it('should display error message', () => {
      render(
        <ChopperIntegrationGuide
          {...defaultProps}
          transferStatus={{
            inProgress: false,
            success: false,
            message: null,
            error: 'Network error occurred'
          }}
        />
      );

      expect(screen.getByText('Network error occurred')).toBeInTheDocument();
    });

    it('should display progress message', () => {
      render(
        <ChopperIntegrationGuide
          {...defaultProps}
          transferStatus={{
            inProgress: true,
            success: false,
            message: 'Preparing transfer...',
            error: null
          }}
        />
      );

      expect(screen.getByText('Preparing transfer...')).toBeInTheDocument();
    });
  });

  describe('guidance creation', () => {
    it('should create guidance when sample changes', () => {
      const { rerender } = render(<ChopperIntegrationGuide {...defaultProps} />);

      expect(UserGuidanceHelpers.createChopperIntegrationGuidance).toHaveBeenCalledWith(mockSample);

      const newSample = { ...mockSample, id: 'new-sample', title: 'New Song' };
      rerender(
        <ChopperIntegrationGuide
          {...defaultProps}
          sample={newSample}
        />
      );

      expect(UserGuidanceHelpers.createChopperIntegrationGuidance).toHaveBeenCalledWith(newSample);
    });
  });

  describe('accessibility', () => {
    it('should have proper ARIA labels and roles', () => {
      render(<ChopperIntegrationGuide {...defaultProps} />);

      // Check for modal structure
      expect(screen.getByRole('button', { name: /use in chopper/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /copy url/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /open youtube/i })).toBeInTheDocument();
    });

    it('should support keyboard navigation', async () => {
      const user = userEvent.setup();
      render(<ChopperIntegrationGuide {...defaultProps} />);

      // Tab through interactive elements
      await user.tab();
      expect(screen.getByText('✕')).toHaveFocus();

      await user.tab();
      expect(screen.getByText('Use in Chopper')).toHaveFocus();

      await user.tab();
      expect(screen.getByText('Copy URL')).toHaveFocus();

      await user.tab();
      expect(screen.getByText('Open YouTube')).toHaveFocus();
    });
  });

  describe('error handling', () => {
    it('should handle clipboard copy failure gracefully', async () => {
      navigator.clipboard.writeText.mockRejectedValue(new Error('Permission denied'));
      
      const user = userEvent.setup();
      render(<ChopperIntegrationGuide {...defaultProps} />);

      const copyButton = screen.getByText('Copy URL');
      await user.click(copyButton);

      // Should not throw error, should handle gracefully
      expect(navigator.clipboard.writeText).toHaveBeenCalled();
    });

    it('should handle missing YouTube ID', async () => {
      const sampleWithoutYouTubeId = { ...mockSample, youtubeId: null };
      
      const user = userEvent.setup();
      render(
        <ChopperIntegrationGuide
          {...defaultProps}
          sample={sampleWithoutYouTubeId}
        />
      );

      const copyButton = screen.getByText('Copy URL');
      await user.click(copyButton);

      // Should not call clipboard API
      expect(navigator.clipboard.writeText).not.toHaveBeenCalled();
    });
  });

  describe('integration workflow', () => {
    it('should handle complete workflow from display to transfer', async () => {
      const user = userEvent.setup();
      const { rerender } = render(<ChopperIntegrationGuide {...defaultProps} />);

      // Initial state
      expect(screen.getByText('Using Sample in Chopper')).toBeInTheDocument();
      expect(screen.getByText('Test Song')).toBeInTheDocument();

      // Click transfer button
      const transferButton = screen.getByText('Use in Chopper');
      await user.click(transferButton);

      expect(mockOnTransfer).toHaveBeenCalledWith(mockSample);

      // Simulate transfer in progress
      rerender(
        <ChopperIntegrationGuide
          {...defaultProps}
          transferStatus={{
            inProgress: true,
            success: false,
            message: 'Transferring...',
            error: null
          }}
        />
      );

      expect(screen.getByText('Transferring...')).toBeInTheDocument();
      expect(screen.getByText('Transferring...')).toBeDisabled();

      // Simulate transfer success
      rerender(
        <ChopperIntegrationGuide
          {...defaultProps}
          transferStatus={{
            inProgress: false,
            success: true,
            message: 'Transfer completed successfully',
            error: null
          }}
        />
      );

      expect(screen.getByText('Transfer completed successfully')).toBeInTheDocument();
      expect(screen.getByTestId('check-circle-icon')).toBeInTheDocument();

      // Close guide
      const closeButton = screen.getAllByText('✕')[0];
      await user.click(closeButton);

      expect(mockOnClose).toHaveBeenCalled();
    });
  });
});