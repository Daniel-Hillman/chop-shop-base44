import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import ErrorRecoveryGuide from '../ErrorRecoveryGuide';

// Mock Lucide React icons
vi.mock('lucide-react', () => ({
  AlertTriangle: ({ className, size, ...props }) => (
    <div data-testid="alert-triangle-icon" className={className} data-size={size} {...props} />
  ),
  RefreshCw: ({ className, size, ...props }) => (
    <div data-testid="refresh-icon" className={className} data-size={size} {...props} />
  ),
  Wifi: ({ className, size, ...props }) => (
    <div data-testid="wifi-icon" className={className} data-size={size} {...props} />
  ),
  WifiOff: ({ className, size, ...props }) => (
    <div data-testid="wifi-off-icon" className={className} data-size={size} {...props} />
  ),
  HelpCircle: ({ className, size, ...props }) => (
    <div data-testid="help-circle-icon" className={className} data-size={size} {...props} />
  ),
  CheckCircle: ({ className, size, ...props }) => (
    <div data-testid="check-circle-icon" className={className} data-size={size} {...props} />
  ),
  XCircle: ({ className, size, ...props }) => (
    <div data-testid="x-circle-icon" className={className} data-size={size} {...props} />
  ),
  Clock: ({ className, size, ...props }) => (
    <div data-testid="clock-icon" className={className} data-size={size} {...props} />
  ),
  Settings: ({ className, size, ...props }) => (
    <div data-testid="settings-icon" className={className} data-size={size} {...props} />
  )
}));

describe('ErrorRecoveryGuide', () => {
  beforeEach(() => {
    // Mock navigator.onLine
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: true
    });

    // Mock window.location.reload
    Object.defineProperty(window, 'location', {
      value: {
        reload: vi.fn()
      },
      writable: true
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('renders with default props', () => {
      render(<ErrorRecoveryGuide error="Test error" />);

      expect(screen.getByText('General Troubleshooting')).toBeInTheDocument();
      expect(screen.getByText('Follow these steps to resolve the issue')).toBeInTheDocument();
      expect(screen.getByTestId('help-circle-icon')).toBeInTheDocument();
    });

    it('renders with custom className', () => {
      const { container } = render(
        <ErrorRecoveryGuide error="Test error" className="custom-class" />
      );

      expect(container.firstChild).toHaveClass('custom-class');
    });

    it('shows dismiss button when onDismiss is provided', () => {
      const mockOnDismiss = vi.fn();
      render(<ErrorRecoveryGuide error="Test error" onDismiss={mockOnDismiss} />);

      expect(screen.getByRole('button', { name: /dismiss recovery guide/i })).toBeInTheDocument();
    });
  });

  describe('Error Type Handling', () => {
    it('shows network troubleshooting for network errors when online', () => {
      render(<ErrorRecoveryGuide error="Network error" errorType="network" />);

      expect(screen.getByText('Connection Troubleshooting')).toBeInTheDocument();
      expect(screen.getByTestId('wifi-icon')).toBeInTheDocument();
      expect(screen.getByText('1')).toBeInTheDocument(); // Step number
    });

    it('shows offline mode for network errors when offline', () => {
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false
      });

      render(<ErrorRecoveryGuide error="Network error" errorType="network" />);

      expect(screen.getByText('Offline Mode')).toBeInTheDocument();
      expect(screen.getByTestId('wifi-off-icon')).toBeInTheDocument();
    });

    it('shows API recovery steps for API errors', () => {
      render(<ErrorRecoveryGuide error="API error" errorType="api" />);

      expect(screen.getByText('Service Recovery')).toBeInTheDocument();
      expect(screen.getByTestId('alert-triangle-icon')).toBeInTheDocument();
    });

    it('shows storage recovery steps for storage errors', () => {
      render(<ErrorRecoveryGuide error="Storage error" errorType="storage" />);

      expect(screen.getByText('Storage Recovery')).toBeInTheDocument();
      expect(screen.getByTestId('settings-icon')).toBeInTheDocument();
    });

    it('shows timeout recovery steps for timeout errors', () => {
      render(<ErrorRecoveryGuide error="Timeout error" errorType="timeout" />);

      expect(screen.getByText('Timeout Recovery')).toBeInTheDocument();
      expect(screen.getByTestId('clock-icon')).toBeInTheDocument();
    });

    it('shows video recovery steps for video errors', () => {
      render(<ErrorRecoveryGuide error="Video error" errorType="video" />);

      expect(screen.getByText('Video Playback Recovery')).toBeInTheDocument();
      expect(screen.getByTestId('x-circle-icon')).toBeInTheDocument();
    });
  });

  describe('Step Interaction', () => {
    it('expands step when clicked', () => {
      render(<ErrorRecoveryGuide error="Test error" errorType="general" />);

      const firstStepButton = screen.getByRole('button', { name: /refresh the page/i });
      fireEvent.click(firstStepButton);

      expect(firstStepButton).toHaveAttribute('aria-expanded', 'true');
      expect(screen.getByText('A simple refresh often resolves temporary issues')).toBeInTheDocument();
    });

    it('collapses step when clicked again', () => {
      render(<ErrorRecoveryGuide error="Test error" errorType="general" />);

      const firstStepButton = screen.getByRole('button', { name: /refresh the page/i });
      
      // Expand
      fireEvent.click(firstStepButton);
      expect(firstStepButton).toHaveAttribute('aria-expanded', 'true');
      
      // Collapse
      fireEvent.click(firstStepButton);
      expect(firstStepButton).toHaveAttribute('aria-expanded', 'false');
    });

    it('shows step actions when expanded', () => {
      render(<ErrorRecoveryGuide error="Test error" errorType="general" />);

      const firstStepButton = screen.getByRole('button', { name: /refresh the page/i });
      fireEvent.click(firstStepButton);

      expect(screen.getByText('Press F5 or Ctrl+R')).toBeInTheDocument();
      expect(screen.getByText('Wait for the page to fully load')).toBeInTheDocument();
    });

    it('shows mark as done button for each step', () => {
      render(<ErrorRecoveryGuide error="Test error" errorType="general" />);

      const firstStepButton = screen.getByRole('button', { name: /refresh the page/i });
      fireEvent.click(firstStepButton);

      expect(screen.getByRole('button', { name: /mark as done/i })).toBeInTheDocument();
    });
  });

  describe('Automated Actions', () => {
    it('shows automated action button for steps with automation', () => {
      render(<ErrorRecoveryGuide error="Test error" errorType="general" />);

      const firstStepButton = screen.getByRole('button', { name: /refresh the page/i });
      fireEvent.click(firstStepButton);

      expect(screen.getByRole('button', { name: /do this automatically/i })).toBeInTheDocument();
    });

    it('executes automated action when clicked', async () => {
      const reloadSpy = vi.spyOn(window.location, 'reload');
      render(<ErrorRecoveryGuide error="Test error" errorType="general" />);

      const firstStepButton = screen.getByRole('button', { name: /refresh the page/i });
      fireEvent.click(firstStepButton);

      const automatedButton = screen.getByRole('button', { name: /do this automatically/i });
      fireEvent.click(automatedButton);

      expect(reloadSpy).toHaveBeenCalled();
    });

    it('shows loading state during automated action', async () => {
      // Mock a slow automated action
      const slowAction = vi.fn(() => new Promise(resolve => setTimeout(resolve, 100)));
      
      render(<ErrorRecoveryGuide error="Test error" errorType="api" />);

      const firstStepButton = screen.getByRole('button', { name: /wait and retry/i });
      fireEvent.click(firstStepButton);

      const automatedButton = screen.getByRole('button', { name: /do this automatically/i });
      fireEvent.click(automatedButton);

      expect(screen.getByText('Processing...')).toBeInTheDocument();
      expect(automatedButton).toBeDisabled();
    });

    it('marks step as completed after successful automation', async () => {
      render(<ErrorRecoveryGuide error="Test error" errorType="general" />);

      const firstStepButton = screen.getByRole('button', { name: /refresh the page/i });
      fireEvent.click(firstStepButton);

      const automatedButton = screen.getByRole('button', { name: /do this automatically/i });
      fireEvent.click(automatedButton);

      await waitFor(() => {
        expect(screen.getByTestId('check-circle-icon')).toBeInTheDocument();
      });
    });
  });

  describe('Step Completion', () => {
    it('marks step as completed when mark as done is clicked', () => {
      render(<ErrorRecoveryGuide error="Test error" errorType="general" />);

      const firstStepButton = screen.getByRole('button', { name: /refresh the page/i });
      fireEvent.click(firstStepButton);

      const markDoneButton = screen.getByRole('button', { name: /mark as done/i });
      fireEvent.click(markDoneButton);

      expect(screen.getByRole('button', { name: /completed/i })).toBeInTheDocument();
      expect(screen.getByTestId('check-circle-icon')).toBeInTheDocument();
    });

    it('shows completed state in step header', () => {
      render(<ErrorRecoveryGuide error="Test error" errorType="general" />);

      const firstStepButton = screen.getByRole('button', { name: /refresh the page/i });
      fireEvent.click(firstStepButton);

      const markDoneButton = screen.getByRole('button', { name: /mark as done/i });
      fireEvent.click(markDoneButton);

      // Check if step has completed class
      const stepElement = firstStepButton.closest('.error-recovery-guide__step');
      expect(stepElement).toHaveClass('error-recovery-guide__step--completed');
    });

    it('disables mark as done button after completion', () => {
      render(<ErrorRecoveryGuide error="Test error" errorType="general" />);

      const firstStepButton = screen.getByRole('button', { name: /refresh the page/i });
      fireEvent.click(firstStepButton);

      const markDoneButton = screen.getByRole('button', { name: /mark as done/i });
      fireEvent.click(markDoneButton);

      expect(markDoneButton).toBeDisabled();
    });
  });

  describe('Retry Functionality', () => {
    it('shows retry button when onRetry is provided', () => {
      const mockOnRetry = vi.fn();
      render(<ErrorRecoveryGuide error="Test error" onRetry={mockOnRetry} />);

      expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
    });

    it('calls onRetry when retry button is clicked', () => {
      const mockOnRetry = vi.fn();
      render(<ErrorRecoveryGuide error="Test error" onRetry={mockOnRetry} />);

      const retryButton = screen.getByRole('button', { name: /try again/i });
      fireEvent.click(retryButton);

      expect(mockOnRetry).toHaveBeenCalledTimes(1);
    });

    it('shows loading state during retry', async () => {
      const mockOnRetry = vi.fn(() => new Promise(resolve => setTimeout(resolve, 100)));
      render(<ErrorRecoveryGuide error="Test error" onRetry={mockOnRetry} />);

      const retryButton = screen.getByRole('button', { name: /try again/i });
      fireEvent.click(retryButton);

      expect(screen.getByRole('button', { name: /retrying/i })).toBeInTheDocument();
      expect(retryButton).toBeDisabled();
    });
  });

  describe('Dismiss Functionality', () => {
    it('calls onDismiss when dismiss button is clicked', () => {
      const mockOnDismiss = vi.fn();
      render(<ErrorRecoveryGuide error="Test error" onDismiss={mockOnDismiss} />);

      const dismissButton = screen.getByRole('button', { name: /dismiss recovery guide/i });
      fireEvent.click(dismissButton);

      expect(mockOnDismiss).toHaveBeenCalledTimes(1);
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA attributes for expandable steps', () => {
      render(<ErrorRecoveryGuide error="Test error" errorType="general" />);

      const firstStepButton = screen.getByRole('button', { name: /refresh the page/i });
      
      expect(firstStepButton).toHaveAttribute('aria-expanded', 'false');
      expect(firstStepButton).toHaveAttribute('aria-controls');
    });

    it('updates aria-expanded when step is toggled', () => {
      render(<ErrorRecoveryGuide error="Test error" errorType="general" />);

      const firstStepButton = screen.getByRole('button', { name: /refresh the page/i });
      
      fireEvent.click(firstStepButton);
      expect(firstStepButton).toHaveAttribute('aria-expanded', 'true');
      
      fireEvent.click(firstStepButton);
      expect(firstStepButton).toHaveAttribute('aria-expanded', 'false');
    });

    it('has accessible button labels', () => {
      const mockOnRetry = vi.fn();
      const mockOnDismiss = vi.fn();

      render(
        <ErrorRecoveryGuide
          error="Test error"
          onRetry={mockOnRetry}
          onDismiss={mockOnDismiss}
        />
      );

      expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /dismiss recovery guide/i })).toBeInTheDocument();
    });

    it('maintains focus management for interactive elements', () => {
      render(<ErrorRecoveryGuide error="Test error" errorType="general" />);

      const firstStepButton = screen.getByRole('button', { name: /refresh the page/i });
      firstStepButton.focus();

      expect(document.activeElement).toBe(firstStepButton);
    });
  });

  describe('Error Handling', () => {
    it('handles automated action failures gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      // Mock a failing automated action by overriding window.location.reload
      Object.defineProperty(window, 'location', {
        value: {
          reload: vi.fn(() => {
            throw new Error('Reload failed');
          })
        },
        writable: true
      });

      render(<ErrorRecoveryGuide error="Test error" errorType="general" />);

      const firstStepButton = screen.getByRole('button', { name: /refresh the page/i });
      fireEvent.click(firstStepButton);

      const automatedButton = screen.getByRole('button', { name: /do this automatically/i });
      fireEvent.click(automatedButton);

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Automated action failed:', expect.any(Error));
      });

      consoleSpy.mockRestore();
    });
  });

  describe('Responsive Behavior', () => {
    it('renders properly with different error types', () => {
      const errorTypes = ['network', 'api', 'storage', 'timeout', 'video', 'general'];
      
      errorTypes.forEach(type => {
        const { unmount } = render(
          <ErrorRecoveryGuide error={`${type} error`} errorType={type} />
        );
        
        expect(screen.getByText(`${type.charAt(0).toUpperCase() + type.slice(1)} Recovery` || 'General Troubleshooting')).toBeInTheDocument();
        unmount();
      });
    });
  });
});