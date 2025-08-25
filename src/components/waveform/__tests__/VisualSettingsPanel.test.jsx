import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import VisualSettingsPanel from '../VisualSettingsPanel.jsx';
import { VisualEnhancementEngine } from '../VisualEnhancementEngine.js';

/**
 * Test suite for Visual Settings Panel
 * Tests configurable visual settings with real-time preview
 * Requirements: 8.4, 8.5
 */
describe('VisualSettingsPanel', () => {
  let mockVisualEngine;
  let mockOnSettingsChange;
  let mockOnPreviewChange;
  let mockOnClose;

  beforeEach(() => {
    mockVisualEngine = new VisualEnhancementEngine();
    mockOnSettingsChange = vi.fn();
    mockOnPreviewChange = vi.fn();
    mockOnClose = vi.fn();
  });

  const renderPanel = (props = {}) => {
    return render(
      <VisualSettingsPanel
        visualEnhancementEngine={mockVisualEngine}
        onSettingsChange={mockOnSettingsChange}
        onPreviewChange={mockOnPreviewChange}
        onClose={mockOnClose}
        isOpen={true}
        {...props}
      />
    );
  };

  describe('Panel Rendering', () => {
    it('should render when open', () => {
      renderPanel();
      
      expect(screen.getByText('Visual Settings')).toBeInTheDocument();
      expect(screen.getByText('Colors')).toBeInTheDocument();
      expect(screen.getByText('Structure')).toBeInTheDocument();
      expect(screen.getByText('Accessibility')).toBeInTheDocument();
      expect(screen.getByText('Effects')).toBeInTheDocument();
    });

    it('should not render when closed', () => {
      renderPanel({ isOpen: false });
      
      expect(screen.queryByText('Visual Settings')).not.toBeInTheDocument();
    });

    it('should render close button', () => {
      renderPanel();
      
      const closeButton = screen.getByText('✕');
      expect(closeButton).toBeInTheDocument();
      
      fireEvent.click(closeButton);
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe('Tab Navigation', () => {
    it('should switch between tabs', async () => {
      renderPanel();
      
      // Default tab should be colors
      expect(screen.getByText('Frequency Color Coding')).toBeInTheDocument();
      
      // Switch to structure tab
      fireEvent.click(screen.getByText('Structure'));
      await waitFor(() => {
        expect(screen.getByText('Song Structure Detection')).toBeInTheDocument();
      });
      
      // Switch to accessibility tab
      fireEvent.click(screen.getByText('Accessibility'));
      await waitFor(() => {
        expect(screen.getByText('Accessibility Options')).toBeInTheDocument();
      });
      
      // Switch to effects tab
      fireEvent.click(screen.getByText('Effects'));
      await waitFor(() => {
        expect(screen.getByText('Visual Enhancements')).toBeInTheDocument();
      });
    });

    it('should highlight active tab', () => {
      renderPanel();
      
      const colorsTab = screen.getByText('Colors').closest('button');
      const structureTab = screen.getByText('Structure').closest('button');
      
      // Colors tab should be active by default
      expect(colorsTab).toHaveClass('text-blue-400');
      expect(structureTab).toHaveClass('text-gray-400');
      
      // Switch to structure tab
      fireEvent.click(structureTab);
      
      expect(structureTab).toHaveClass('text-blue-400');
    });
  });

  describe('Color Settings', () => {
    it('should toggle frequency color coding', async () => {
      renderPanel();
      
      const toggle = screen.getByLabelText('Enable Frequency Colors').closest('button');
      fireEvent.click(toggle);
      
      await waitFor(() => {
        expect(mockOnSettingsChange).toHaveBeenCalledWith(
          expect.objectContaining({
            frequencyColorCoding: expect.objectContaining({
              enabled: false
            })
          })
        );
      });
    });

    it('should change color scheme', async () => {
      renderPanel();
      
      const highContrastButton = screen.getByText('High Contrast');
      fireEvent.click(highContrastButton);
      
      await waitFor(() => {
        expect(mockOnSettingsChange).toHaveBeenCalledWith(
          expect.objectContaining({
            frequencyColorCoding: expect.objectContaining({
              colorScheme: 'high-contrast'
            })
          })
        );
      });
    });

    it('should adjust color intensity', async () => {
      renderPanel();
      
      const intensitySlider = screen.getByDisplayValue('0.8');
      fireEvent.change(intensitySlider, { target: { value: '0.5' } });
      
      await waitFor(() => {
        expect(mockOnSettingsChange).toHaveBeenCalledWith(
          expect.objectContaining({
            frequencyColorCoding: expect.objectContaining({
              intensity: 0.5
            })
          })
        );
      });
    });

    it('should toggle amplitude color coding', async () => {
      renderPanel();
      
      const toggle = screen.getByLabelText('Enable Amplitude Colors').closest('button');
      fireEvent.click(toggle);
      
      await waitFor(() => {
        expect(mockOnSettingsChange).toHaveBeenCalledWith(
          expect.objectContaining({
            amplitudeColorCoding: expect.objectContaining({
              enabled: false
            })
          })
        );
      });
    });
  });

  describe('Structure Settings', () => {
    beforeEach(() => {
      renderPanel();
      fireEvent.click(screen.getByText('Structure'));
    });

    it('should toggle structure detection', async () => {
      await waitFor(() => {
        expect(screen.getByText('Song Structure Detection')).toBeInTheDocument();
      });
      
      const toggle = screen.getByLabelText('Enable Structure Detection').closest('button');
      fireEvent.click(toggle);
      
      await waitFor(() => {
        expect(mockOnSettingsChange).toHaveBeenCalledWith(
          expect.objectContaining({
            structureDetection: expect.objectContaining({
              enabled: false
            })
          })
        );
      });
    });

    it('should adjust detection sensitivity', async () => {
      await waitFor(() => {
        expect(screen.getByText('Song Structure Detection')).toBeInTheDocument();
      });
      
      const sensitivitySlider = screen.getByDisplayValue('0.6');
      fireEvent.change(sensitivitySlider, { target: { value: '0.8' } });
      
      await waitFor(() => {
        expect(mockOnSettingsChange).toHaveBeenCalledWith(
          expect.objectContaining({
            structureDetection: expect.objectContaining({
              sensitivity: 0.8
            })
          })
        );
      });
    });

    it('should toggle section labels', async () => {
      await waitFor(() => {
        expect(screen.getByText('Song Structure Detection')).toBeInTheDocument();
      });
      
      const toggle = screen.getByLabelText('Show Section Labels').closest('button');
      fireEvent.click(toggle);
      
      await waitFor(() => {
        expect(mockOnSettingsChange).toHaveBeenCalledWith(
          expect.objectContaining({
            structureDetection: expect.objectContaining({
              showLabels: false
            })
          })
        );
      });
    });
  });

  describe('Accessibility Settings', () => {
    beforeEach(() => {
      renderPanel();
      fireEvent.click(screen.getByText('Accessibility'));
    });

    it('should toggle high contrast mode', async () => {
      await waitFor(() => {
        expect(screen.getByText('Accessibility Options')).toBeInTheDocument();
      });
      
      const toggle = screen.getByLabelText('High Contrast Mode').closest('button');
      fireEvent.click(toggle);
      
      await waitFor(() => {
        expect(mockOnSettingsChange).toHaveBeenCalledWith(
          expect.objectContaining({
            accessibility: expect.objectContaining({
              highContrastMode: true
            })
          })
        );
      });
    });

    it('should toggle alternative patterns', async () => {
      await waitFor(() => {
        expect(screen.getByText('Accessibility Options')).toBeInTheDocument();
      });
      
      const toggle = screen.getByLabelText('Alternative Visual Patterns').closest('button');
      fireEvent.click(toggle);
      
      await waitFor(() => {
        expect(mockOnSettingsChange).toHaveBeenCalledWith(
          expect.objectContaining({
            accessibility: expect.objectContaining({
              alternativePatterns: true
            })
          })
        );
      });
    });

    it('should change text size', async () => {
      await waitFor(() => {
        expect(screen.getByText('Accessibility Options')).toBeInTheDocument();
      });
      
      const largeTextButton = screen.getByText('Large');
      fireEvent.click(largeTextButton);
      
      await waitFor(() => {
        expect(mockOnSettingsChange).toHaveBeenCalledWith(
          expect.objectContaining({
            accessibility: expect.objectContaining({
              textSize: 'large'
            })
          })
        );
      });
    });

    it('should toggle reduced motion', async () => {
      await waitFor(() => {
        expect(screen.getByText('Accessibility Options')).toBeInTheDocument();
      });
      
      const toggle = screen.getByLabelText('Reduced Motion').closest('button');
      fireEvent.click(toggle);
      
      await waitFor(() => {
        expect(mockOnSettingsChange).toHaveBeenCalledWith(
          expect.objectContaining({
            accessibility: expect.objectContaining({
              reducedMotion: true
            })
          })
        );
      });
    });
  });

  describe('Enhancement Settings', () => {
    beforeEach(() => {
      renderPanel();
      fireEvent.click(screen.getByText('Effects'));
    });

    it('should toggle gradient fill', async () => {
      await waitFor(() => {
        expect(screen.getByText('Visual Enhancements')).toBeInTheDocument();
      });
      
      const toggle = screen.getByLabelText('Gradient Fill').closest('button');
      fireEvent.click(toggle);
      
      await waitFor(() => {
        expect(mockOnSettingsChange).toHaveBeenCalledWith(
          expect.objectContaining({
            enhancements: expect.objectContaining({
              gradientFill: false
            })
          })
        );
      });
    });

    it('should toggle shadow effects', async () => {
      await waitFor(() => {
        expect(screen.getByText('Visual Enhancements')).toBeInTheDocument();
      });
      
      const toggle = screen.getByLabelText('Shadow Effects').closest('button');
      fireEvent.click(toggle);
      
      await waitFor(() => {
        expect(mockOnSettingsChange).toHaveBeenCalledWith(
          expect.objectContaining({
            enhancements: expect.objectContaining({
              shadowEffects: true
            })
          })
        );
      });
    });

    it('should toggle animated elements', async () => {
      await waitFor(() => {
        expect(screen.getByText('Visual Enhancements')).toBeInTheDocument();
      });
      
      const toggle = screen.getByLabelText('Animated Elements').closest('button');
      fireEvent.click(toggle);
      
      await waitFor(() => {
        expect(mockOnSettingsChange).toHaveBeenCalledWith(
          expect.objectContaining({
            enhancements: expect.objectContaining({
              animatedElements: false
            })
          })
        );
      });
    });
  });

  describe('Real-time Preview', () => {
    it('should call preview callback when settings change', async () => {
      renderPanel();
      
      const toggle = screen.getByLabelText('Enable Frequency Colors').closest('button');
      fireEvent.click(toggle);
      
      await waitFor(() => {
        expect(mockOnPreviewChange).toHaveBeenCalled();
      });
    });

    it('should toggle preview mode', () => {
      renderPanel();
      
      const previewButton = screen.getByText('Preview Mode');
      fireEvent.click(previewButton);
      
      expect(screen.getByText('Exit Preview')).toBeInTheDocument();
    });

    it('should show real-time changes indicator', () => {
      renderPanel();
      
      expect(screen.getByText('Changes apply in real-time')).toBeInTheDocument();
    });
  });

  describe('Settings Persistence', () => {
    it('should initialize with engine settings', () => {
      const mockEngine = {
        createVisualSettings: vi.fn().mockReturnValue({
          frequencyColorCoding: { enabled: false, colorScheme: 'high-contrast' },
          amplitudeColorCoding: { enabled: false },
          structureDetection: { enabled: false },
          accessibility: { highContrastMode: true },
          enhancements: { gradientFill: false }
        }),
        updateVisualSettings: vi.fn()
      };
      
      renderPanel({ visualEnhancementEngine: mockEngine });
      
      expect(mockEngine.createVisualSettings).toHaveBeenCalled();
    });

    it('should update engine when settings change', async () => {
      const mockEngine = {
        createVisualSettings: vi.fn().mockReturnValue({
          frequencyColorCoding: { enabled: true },
          amplitudeColorCoding: { enabled: true },
          structureDetection: { enabled: true },
          accessibility: { highContrastMode: false },
          enhancements: { gradientFill: true }
        }),
        updateVisualSettings: vi.fn()
      };
      
      renderPanel({ visualEnhancementEngine: mockEngine });
      
      const toggle = screen.getByLabelText('Enable Frequency Colors').closest('button');
      fireEvent.click(toggle);
      
      await waitFor(() => {
        expect(mockEngine.updateVisualSettings).toHaveBeenCalled();
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle missing visual engine gracefully', () => {
      expect(() => {
        renderPanel({ visualEnhancementEngine: null });
      }).not.toThrow();
    });

    it('should handle engine errors gracefully', async () => {
      const mockEngine = {
        createVisualSettings: vi.fn().mockReturnValue({}),
        updateVisualSettings: vi.fn().mockImplementation(() => {
          throw new Error('Engine error');
        })
      };
      
      renderPanel({ visualEnhancementEngine: mockEngine });
      
      const toggle = screen.getByLabelText('Enable Frequency Colors').closest('button');
      
      expect(() => {
        fireEvent.click(toggle);
      }).not.toThrow();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      renderPanel();
      
      expect(screen.getByLabelText('Enable Frequency Colors')).toBeInTheDocument();
      expect(screen.getByLabelText('Enable Amplitude Colors')).toBeInTheDocument();
    });

    it('should support keyboard navigation', () => {
      renderPanel();
      
      const colorsTab = screen.getByText('Colors').closest('button');
      const structureTab = screen.getByText('Structure').closest('button');
      
      colorsTab.focus();
      expect(document.activeElement).toBe(colorsTab);
      
      // Tab navigation
      fireEvent.keyDown(colorsTab, { key: 'Tab' });
      // Note: Full keyboard navigation testing would require more complex setup
    });

    it('should have proper contrast for toggle states', () => {
      renderPanel();
      
      const enabledToggle = screen.getByLabelText('Enable Frequency Colors').closest('button');
      expect(enabledToggle).toHaveClass('bg-blue-600');
      
      fireEvent.click(enabledToggle);
      expect(enabledToggle).toHaveClass('bg-gray-600');
    });
  });
});