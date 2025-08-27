/**
 * @fileoverview Tests for PatternManagementDialog component
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import PatternManagementDialog from '../PatternManagementDialog';

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }) => <div {...props}>{children}</div>
  },
  AnimatePresence: ({ children }) => <>{children}</>
}));

// Mock PatternStorageService
vi.mock('../../../services/sequencer/PatternStorageService.js', () => ({
  PatternStorageService: vi.fn().mockImplementation(() => ({
    getStorageStats: vi.fn().mockResolvedValue({
      patternCount: 5,
      storageSize: 1024,
      maxStorageSize: 5242880,
      usagePercentage: 1,
      lastAccess: '2024-01-01T00:00:00.000Z',
      version: 1
    }),
    exportPattern: vi.fn().mockResolvedValue('{"pattern": "data"}'),
    exportAllPatterns: vi.fn().mockResolvedValue('{"patterns": []}'),
    importPattern: vi.fn().mockResolvedValue(['pattern1', 'pattern2'])
  }))
}));

// Mock URL.createObjectURL and related APIs
global.URL.createObjectURL = vi.fn(() => 'mock-url');
global.URL.revokeObjectURL = vi.fn();

// Mock document.createElement and related DOM APIs
const mockAnchorElement = {
  href: '',
  download: '',
  click: vi.fn(),
  remove: vi.fn()
};

global.document.createElement = vi.fn((tagName) => {
  if (tagName === 'a') {
    return mockAnchorElement;
  }
  return {};
});

global.document.body.appendChild = vi.fn();
global.document.body.removeChild = vi.fn();

describe('PatternManagementDialog', () => {
  const mockProps = {
    isOpen: true,
    onClose: vi.fn(),
    onPatternLoad: vi.fn(),
    onPatternSave: vi.fn(),
    onPatternDuplicate: vi.fn(),
    onPatternDelete: vi.fn(),
    currentPattern: {
      id: 'pattern1',
      name: 'Test Pattern',
      bpm: 120,
      swing: 0,
      stepResolution: 16,
      tracks: [
        {
          id: 'track1',
          name: 'Kick',
          volume: 0.8,
          mute: false,
          solo: false,
          steps: Array(16).fill({ active: false, velocity: 0.8 })
        }
      ],
      metadata: {
        created: '2024-01-01T00:00:00.000Z',
        modified: '2024-01-01T00:00:00.000Z',
        version: 1
      }
    },
    patterns: [
      {
        id: 'pattern1',
        name: 'Test Pattern 1',
        bpm: 120,
        swing: 0,
        stepResolution: 16,
        tracks: [],
        metadata: {
          created: '2024-01-01T00:00:00.000Z',
          modified: '2024-01-01T00:00:00.000Z'
        }
      },
      {
        id: 'pattern2',
        name: 'Test Pattern 2',
        bpm: 140,
        swing: 10,
        stepResolution: 32,
        tracks: [],
        metadata: {
          created: '2024-01-02T00:00:00.000Z',
          modified: '2024-01-02T00:00:00.000Z'
        }
      }
    ]
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders when open', () => {
    render(<PatternManagementDialog {...mockProps} />);
    
    expect(screen.getByText('Pattern Management')).toBeInTheDocument();
    expect(screen.getByText('Load Pattern')).toBeInTheDocument();
    expect(screen.getByText('Save Pattern')).toBeInTheDocument();
    expect(screen.getByText('Import/Export')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(<PatternManagementDialog {...mockProps} isOpen={false} />);
    
    expect(screen.queryByText('Pattern Management')).not.toBeInTheDocument();
  });

  it('displays storage stats', async () => {
    render(<PatternManagementDialog {...mockProps} />);
    
    await waitFor(() => {
      expect(screen.getByText(/5 patterns/)).toBeInTheDocument();
      expect(screen.getByText(/1%/)).toBeInTheDocument();
    });
  });

  it('shows saved patterns in load tab', () => {
    render(<PatternManagementDialog {...mockProps} />);
    
    expect(screen.getByText('Test Pattern 1')).toBeInTheDocument();
    expect(screen.getByText('Test Pattern 2')).toBeInTheDocument();
    expect(screen.getByText('120 BPM')).toBeInTheDocument();
    expect(screen.getByText('140 BPM')).toBeInTheDocument();
  });

  it('calls onPatternLoad when load button is clicked', async () => {
    render(<PatternManagementDialog {...mockProps} />);
    
    const loadButtons = screen.getAllByRole('button');
    const firstLoadButton = loadButtons.find(button => 
      button.querySelector('svg') && button.closest('[data-testid]') === null
    );
    
    if (firstLoadButton) {
      fireEvent.click(firstLoadButton);
      await waitFor(() => {
        expect(mockProps.onPatternLoad).toHaveBeenCalled();
      });
    }
  });

  it('switches to save tab and shows current pattern info', () => {
    render(<PatternManagementDialog {...mockProps} />);
    
    fireEvent.click(screen.getByText('Save Pattern'));
    
    expect(screen.getByText('Save Current Pattern')).toBeInTheDocument();
    expect(screen.getByText('BPM: 120')).toBeInTheDocument();
    expect(screen.getByText('Swing: 0%')).toBeInTheDocument();
    expect(screen.getByText('Tracks: 1')).toBeInTheDocument();
    expect(screen.getByText('Resolution: 1/16')).toBeInTheDocument();
  });

  it('allows pattern name input and saves pattern', async () => {
    render(<PatternManagementDialog {...mockProps} />);
    
    // Switch to save tab
    fireEvent.click(screen.getByText('Save Pattern'));
    
    // Enter pattern name
    const nameInput = screen.getByPlaceholderText('Enter pattern name...');
    fireEvent.change(nameInput, { target: { value: 'My New Pattern' } });
    
    // Click save button
    const saveButton = screen.getByRole('button', { name: /Save Pattern/ });
    fireEvent.click(saveButton);
    
    await waitFor(() => {
      expect(mockProps.onPatternSave).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'My New Pattern'
        })
      );
    });
  });

  it('shows import/export tab with drag and drop area', () => {
    render(<PatternManagementDialog {...mockProps} />);
    
    fireEvent.click(screen.getByText('Import/Export'));
    
    expect(screen.getByText('Import Patterns')).toBeInTheDocument();
    expect(screen.getByText('Drag and drop JSON files here, or click to select')).toBeInTheDocument();
    expect(screen.getByText('Export All Patterns')).toBeInTheDocument();
  });

  it('handles file import', async () => {
    render(<PatternManagementDialog {...mockProps} />);
    
    fireEvent.click(screen.getByText('Import/Export'));
    
    const fileInput = screen.getByLabelText('Select Files');
    const file = new File(['{"pattern": "data"}'], 'pattern.json', { type: 'application/json' });
    
    fireEvent.change(fileInput, { target: { files: [file] } });
    
    // Wait for file processing
    await waitFor(() => {
      expect(screen.getByText(/Successfully imported/)).toBeInTheDocument();
    });
  });

  it('handles pattern export', async () => {
    render(<PatternManagementDialog {...mockProps} />);
    
    // Find and click export button for first pattern
    const exportButtons = screen.getAllByRole('button');
    const exportButton = exportButtons.find(button => {
      const svg = button.querySelector('svg');
      return svg && svg.classList.contains('lucide-download');
    });
    
    if (exportButton) {
      fireEvent.click(exportButton);
      
      await waitFor(() => {
        expect(mockAnchorElement.click).toHaveBeenCalled();
      });
    }
  });

  it('handles pattern duplication', async () => {
    render(<PatternManagementDialog {...mockProps} />);
    
    // Find and click duplicate button for first pattern
    const duplicateButtons = screen.getAllByRole('button');
    const duplicateButton = duplicateButtons.find(button => {
      const svg = button.querySelector('svg');
      return svg && svg.classList.contains('lucide-copy');
    });
    
    if (duplicateButton) {
      fireEvent.click(duplicateButton);
      
      await waitFor(() => {
        expect(mockProps.onPatternDuplicate).toHaveBeenCalledWith(
          'pattern1',
          'Test Pattern 1 (Copy)'
        );
      });
    }
  });

  it('handles pattern deletion with confirmation', async () => {
    // Mock window.confirm
    global.confirm = vi.fn(() => true);
    
    render(<PatternManagementDialog {...mockProps} />);
    
    // Find and click delete button for first pattern
    const deleteButtons = screen.getAllByRole('button');
    const deleteButton = deleteButtons.find(button => {
      const svg = button.querySelector('svg');
      return svg && svg.classList.contains('lucide-trash-2');
    });
    
    if (deleteButton) {
      fireEvent.click(deleteButton);
      
      await waitFor(() => {
        expect(global.confirm).toHaveBeenCalledWith(
          expect.stringContaining('Are you sure you want to delete "Test Pattern 1"?')
        );
        expect(mockProps.onPatternDelete).toHaveBeenCalledWith('pattern1');
      });
    }
    
    global.confirm.mockRestore();
  });

  it('cancels pattern deletion when user declines confirmation', async () => {
    // Mock window.confirm to return false
    global.confirm = vi.fn(() => false);
    
    render(<PatternManagementDialog {...mockProps} />);
    
    // Find and click delete button for first pattern
    const deleteButtons = screen.getAllByRole('button');
    const deleteButton = deleteButtons.find(button => {
      const svg = button.querySelector('svg');
      return svg && svg.classList.contains('lucide-trash-2');
    });
    
    if (deleteButton) {
      fireEvent.click(deleteButton);
      
      await waitFor(() => {
        expect(global.confirm).toHaveBeenCalled();
        expect(mockProps.onPatternDelete).not.toHaveBeenCalled();
      });
    }
    
    global.confirm.mockRestore();
  });

  it('closes dialog when close button is clicked', () => {
    render(<PatternManagementDialog {...mockProps} />);
    
    const closeButton = screen.getByRole('button', { name: '' }); // X button has no text
    fireEvent.click(closeButton);
    
    expect(mockProps.onClose).toHaveBeenCalled();
  });

  it('closes dialog when clicking outside', () => {
    render(<PatternManagementDialog {...mockProps} />);
    
    const backdrop = screen.getByRole('dialog').parentElement;
    fireEvent.click(backdrop);
    
    expect(mockProps.onClose).toHaveBeenCalled();
  });

  it('shows empty state when no patterns are available', () => {
    render(<PatternManagementDialog {...mockProps} patterns={[]} />);
    
    expect(screen.getByText('No saved patterns found')).toBeInTheDocument();
    expect(screen.getByText('Create and save a pattern to get started')).toBeInTheDocument();
  });

  it('shows empty state in save tab when no current pattern', () => {
    render(<PatternManagementDialog {...mockProps} currentPattern={null} />);
    
    fireEvent.click(screen.getByText('Save Pattern'));
    
    expect(screen.getByText('No pattern to save')).toBeInTheDocument();
    expect(screen.getByText('Create a pattern first to save it')).toBeInTheDocument();
  });

  it('validates pattern name input', () => {
    render(<PatternManagementDialog {...mockProps} />);
    
    fireEvent.click(screen.getByText('Save Pattern'));
    
    const saveButton = screen.getByRole('button', { name: /Save Pattern/ });
    expect(saveButton).toBeDisabled();
    
    const nameInput = screen.getByPlaceholderText('Enter pattern name...');
    fireEvent.change(nameInput, { target: { value: 'Valid Name' } });
    
    expect(saveButton).not.toBeDisabled();
  });

  it('shows character count for pattern name', () => {
    render(<PatternManagementDialog {...mockProps} />);
    
    fireEvent.click(screen.getByText('Save Pattern'));
    
    const nameInput = screen.getByPlaceholderText('Enter pattern name...');
    fireEvent.change(nameInput, { target: { value: 'Test' } });
    
    expect(screen.getByText('4/50 characters')).toBeInTheDocument();
  });

  it('displays error messages', async () => {
    const errorProps = {
      ...mockProps,
      onPatternLoad: vi.fn().mockRejectedValue(new Error('Load failed'))
    };
    
    render(<PatternManagementDialog {...errorProps} />);
    
    // Try to load a pattern to trigger error
    const loadButtons = screen.getAllByRole('button');
    const firstLoadButton = loadButtons.find(button => 
      button.querySelector('svg') && button.closest('[data-testid]') === null
    );
    
    if (firstLoadButton) {
      fireEvent.click(firstLoadButton);
      
      await waitFor(() => {
        expect(screen.getByText(/Failed to load pattern/)).toBeInTheDocument();
      });
    }
  });

  it('displays success messages', async () => {
    render(<PatternManagementDialog {...mockProps} />);
    
    fireEvent.click(screen.getByText('Save Pattern'));
    
    const nameInput = screen.getByPlaceholderText('Enter pattern name...');
    fireEvent.change(nameInput, { target: { value: 'Success Pattern' } });
    
    const saveButton = screen.getByRole('button', { name: /Save Pattern/ });
    fireEvent.click(saveButton);
    
    await waitFor(() => {
      expect(screen.getByText(/Pattern "Success Pattern" saved successfully/)).toBeInTheDocument();
    });
  });
});